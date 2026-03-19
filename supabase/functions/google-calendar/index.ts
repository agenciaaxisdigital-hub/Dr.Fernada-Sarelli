// Google Calendar iCal feed → JSON API v2
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CALENDAR_ICAL_URL = 'https://calendar.google.com/calendar/ical/1d0115116c881751957170d2e0a224901814fa8de5e1e53be0d0f14066da18ac%40group.calendar.google.com/public/basic.ics';

const MESES: Record<number, string> = {
  0: 'JAN', 1: 'FEV', 2: 'MAR', 3: 'ABR', 4: 'MAI', 5: 'JUN',
  6: 'JUL', 7: 'AGO', 8: 'SET', 9: 'OUT', 10: 'NOV', 11: 'DEZ',
};

const DIAS_SEMANA: Record<number, string> = {
  0: 'domingo', 1: 'segunda', 2: 'terça', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sábado',
};

interface CalendarEvent {
  id: string;
  titulo: string;
  desc: string;
  local: string;
  dia: string;
  mes: string;
  diaSemana: string;
  hora: string;
  horaFim: string;
  dataISO: string;
  dataFimISO: string;
  passado: boolean;
  gcal: string;
  mapsUrl: string;
}

function parseICalDate(val: string): Date {
  // Formats: 20260314T180000Z or 20260314T150000 or 20260314
  if (val.length === 8) {
    return new Date(
      parseInt(val.slice(0, 4)),
      parseInt(val.slice(4, 6)) - 1,
      parseInt(val.slice(6, 8))
    );
  }
  const year = parseInt(val.slice(0, 4));
  const month = parseInt(val.slice(4, 6)) - 1;
  const day = parseInt(val.slice(6, 8));
  const hour = parseInt(val.slice(9, 11));
  const minute = parseInt(val.slice(11, 13));
  const second = parseInt(val.slice(13, 15));

  if (val.endsWith('Z')) {
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }
  // Assume local time (America/Sao_Paulo GMT-3)
  return new Date(Date.UTC(year, month, day, hour + 3, minute, second));
}

function buildGCalLink(event: { titulo: string; desc: string; local: string; start: string; end: string }): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.titulo,
    dates: `${event.start}/${event.end}`,
    details: event.desc,
    location: event.local,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildMapsUrl(location: string): string {
  if (!location) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function parseICalFeed(icsText: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const vevents = icsText.split('BEGIN:VEVENT');

  for (let i = 1; i < vevents.length; i++) {
    const block = vevents[i].split('END:VEVENT')[0];
    const lines = block.split(/\r?\n/);

    const props: Record<string, string> = {};
    let currentKey = '';

    for (const line of lines) {
      if (line.startsWith(' ') || line.startsWith('\t')) {
        // Continuation line
        if (currentKey) {
          props[currentKey] += line.slice(1);
        }
        continue;
      }
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      let key = line.slice(0, colonIdx);
      const value = line.slice(colonIdx + 1);
      // Strip params like DTSTART;TZID=...
      const semiIdx = key.indexOf(';');
      if (semiIdx !== -1) key = key.slice(0, semiIdx);
      key = key.trim().toUpperCase();
      props[key] = value.trim();
      currentKey = key;
    }

    const dtstart = props['DTSTART'] || '';
    const dtend = props['DTEND'] || dtstart;
    const summary = (props['SUMMARY'] || 'Sem título').replace(/\\,/g, ',').replace(/\\n/g, '\n');
    const description = (props['DESCRIPTION'] || '').replace(/\\,/g, ',').replace(/\\n/g, '\n').replace(/\\;/g, ';');
    const location = (props['LOCATION'] || '').replace(/\\,/g, ',').replace(/\\n/g, ' ');
    const uid = props['UID'] || `event-${i}`;

    const normalizedSummary = summary.toLowerCase().trim();
    const isBusyBlock =
      normalizedSummary === 'busy' ||
      normalizedSummary === 'ocupado' ||
      normalizedSummary === 'free' ||
      normalizedSummary === 'livre' ||
      normalizedSummary === 'sem título' ||
      normalizedSummary.startsWith('busy ') ||
      normalizedSummary.includes('out of office') ||
      normalizedSummary.includes('working location') ||
      (!description.trim() && !location.trim() && normalizedSummary.length <= 10);

    if (!dtstart || isBusyBlock) continue;


    const startDate = parseICalDate(dtstart);
    const endDate = parseICalDate(dtend);
    const now = new Date();

    const dia = startDate.getDate().toString().padStart(2, '0');
    const mes = MESES[startDate.getMonth()];
    const diaSemana = DIAS_SEMANA[startDate.getDay()];
    const hora = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
    const horaFim = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

    events.push({
      id: uid,
      titulo: summary,
      desc: description,
      local: location,
      dia,
      mes,
      diaSemana,
      hora,
      horaFim,
      dataISO: startDate.toISOString(),
      dataFimISO: endDate.toISOString(),
      passado: endDate < now,
      gcal: buildGCalLink({
        titulo: summary,
        desc: description,
        local: location,
        start: dtstart.replace(/[-:]/g, ''),
        end: dtend.replace(/[-:]/g, ''),
      }),
      mapsUrl: buildMapsUrl(location),
    });
  }

  // Sort by date ascending
  events.sort((a, b) => new Date(a.dataISO).getTime() - new Date(b.dataISO).getTime());
  return events;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    const filterParam = url.searchParams.get('filter'); // 'proximos' | 'passados' | 'all'

    console.log('Fetching iCal feed...');
    const response = await fetch(CALENDAR_ICAL_URL, {
      headers: { 'Accept': 'text/calendar' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch calendar: ${response.status}`);
    }

    const icsText = await response.text();
    let events = parseICalFeed(icsText);

    // Apply filter
    const filter = filterParam || 'all';
    if (filter === 'proximos') {
      events = events.filter(e => !e.passado);
    } else if (filter === 'passados') {
      events = events.filter(e => e.passado);
    }

    // Apply limit
    if (limitParam) {
      const limit = parseInt(limitParam);
      if (!isNaN(limit) && limit > 0) {
        // For proximos, get the nearest ones; for passados, get the most recent
        if (filter === 'passados') {
          events = events.slice(-limit);
        } else {
          events = events.slice(0, limit);
        }
      }
    }

    console.log(`Returning ${events.length} events (filter: ${filter})`);

    return new Response(
      JSON.stringify({ success: true, events, generatedAt: Date.now() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('Error fetching calendar:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage, events: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
