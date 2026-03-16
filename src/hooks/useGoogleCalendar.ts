import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CalendarEvent {
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

interface UseGoogleCalendarOptions {
  filter?: "proximos" | "passados" | "all";
  limit?: number;
}

export function useGoogleCalendar(options: UseGoogleCalendarOptions = {}) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (options.filter) params.set("filter", options.filter);
        if (options.limit) params.set("limit", String(options.limit));

        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const cacheBust = `t=${Date.now()}`;
        const query = params.toString();
        const url = `https://${projectId}.supabase.co/functions/v1/google-calendar?${query ? `${query}&` : ''}${cacheBust}`;
        
        const res = await fetch(url, {
          headers: {
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        });

        const data = await res.json();

        if (data.success) {
          setEvents(data.events);
        } else {
          setError(data.error || "Erro ao carregar eventos");
        }
      } catch (err) {
        console.error("Erro ao buscar eventos:", err);
        setError("Não foi possível carregar os eventos");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [options.filter, options.limit]);

  return { events, loading, error };
}
