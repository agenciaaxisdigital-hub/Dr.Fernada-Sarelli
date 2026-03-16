/**
 * CHAMA ROSA — Mission-Critical Data Capture Engine
 * 
 * Features:
 * - 3-attempt retry with exponential backoff + localStorage queue
 * - 4-layer location resolution (GPS → ipapi.co → ip-api.com → timezone)
 * - Fire-and-forget pattern — never blocks UI
 * - Zone identification for Goiânia electoral zones
 * - Scroll depth tracking, exit tracking with sendBeacon
 * - Comprehensive device detection
 * - UTM persistence across pages
 */

import { supabase } from "@/integrations/supabase/client";

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════
const QUEUE_KEY = "chama_failed_queue";
const VISITOR_KEY = "chama_visitor_id";
const LAT_KEY = "chama_lat";
const LNG_KEY = "chama_lng";
const GEO_DENIED_KEY = "chama_geo_denied";
const GEO_FULL_KEY = "chama_geo_full";
const UTM_KEY = "chama_utms";
const SESSION_START_KEY = "chama_session_start";
const SCROLL_MILESTONES_KEY = "chama_scroll_milestones";

// ═══════════════════════════════════════════════════════════
// RETRY ENGINE — RULE 1: NEVER LOSE A RECORD
// ═══════════════════════════════════════════════════════════

interface QueueItem {
  table: string;
  data: Record<string, unknown>;
  timestamp: number;
}

async function retryInsert(table: string, data: Record<string, unknown>): Promise<string | null> {
  const delays = [0, 2000, 5000];
  for (let attempt = 0; attempt < delays.length; attempt++) {
    try {
      if (delays[attempt] > 0) await sleep(delays[attempt]);
      const { data: result, error } = await (supabase.from as any)(table).insert(data).select("id").single();
      if (error) throw error;
      return result?.id || null;
    } catch (err) {
      if (attempt === delays.length - 1) {
        // All retries failed — queue to localStorage
        enqueue({ table, data, timestamp: Date.now() });
        console.warn(`[Chama] Queued failed insert to ${table}`);
        return null;
      }
    }
  }
  return null;
}

function enqueue(item: QueueItem) {
  try {
    const queue = getQueue();
    queue.push(item);
    // Keep max 200 items to avoid localStorage overflow
    if (queue.length > 200) queue.splice(0, queue.length - 200);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch { /* localStorage full — silently drop */ }
}

function getQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function flushQueue() {
  const queue = getQueue();
  if (queue.length === 0) return;

  const remaining: QueueItem[] = [];
  const results = await Promise.allSettled(
    queue.map(async (item) => {
      const { error } = await (supabase.from as any)(item.table).insert(item.data);
      if (error) throw error;
      return item;
    })
  );

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      remaining.push(queue[i]);
    }
  });

  try {
    if (remaining.length > 0) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(QUEUE_KEY);
    }
  } catch { /* ignore */ }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ═══════════════════════════════════════════════════════════
// VISITOR COOKIE — GUARANTEED
// ═══════════════════════════════════════════════════════════

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = generateUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    // Also set as cookie for redundancy
    try {
      const secure = location.protocol === "https:" ? ";Secure" : "";
      document.cookie = `${VISITOR_KEY}=${id};path=/;max-age=31536000;SameSite=Lax${secure}`;
    } catch { /* cookies blocked */ }
    return id;
  } catch {
    // localStorage blocked — try cookie
    const match = document.cookie.match(new RegExp(`${VISITOR_KEY}=([^;]+)`));
    if (match) return match[1];
    return generateUUID();
  }
}

function generateUUID(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Fallback for older browsers
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}

// ═══════════════════════════════════════════════════════════
// VISIT COUNT
// ═══════════════════════════════════════════════════════════

function getVisitCount(): number {
  try {
    const key = "chama_visit_count";
    const count = parseInt(localStorage.getItem(key) || "0", 10) + 1;
    localStorage.setItem(key, count.toString());
    return count;
  } catch {
    return 1;
  }
}

function isFirstVisit(): boolean {
  try {
    const key = "chama_has_visited";
    const visited = localStorage.getItem(key);
    if (!visited) {
      localStorage.setItem(key, "true");
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

// ═══════════════════════════════════════════════════════════
// DEVICE DETECTION — COMPREHENSIVE
// ═══════════════════════════════════════════════════════════

interface DeviceInfo {
  dispositivo: string;
  navegador: string;
  versao_navegador: string;
  sistema_operacional: string;
  versao_so: string;
  marca_dispositivo: string;
  modelo_dispositivo: string;
}

export function detectDevice(): DeviceInfo {
  const ua = navigator.userAgent || "";
  const fallback = "Não identificado";

  // Browser detection
  let navegador = fallback;
  let versao_navegador = "";

  const browserTests: [string, RegExp][] = [
    ["Samsung Internet", /SamsungBrowser\/(\d+[\d.]*)/],
    ["Edge", /Edg\/(\d+[\d.]*)/],
    ["Opera", /OPR\/(\d+[\d.]*)/],
    ["Firefox", /Firefox\/(\d+[\d.]*)/],
    ["Chrome", /Chrome\/(\d+[\d.]*)/],
    ["Safari", /Version\/(\d+[\d.]*).*Safari/],
  ];

  for (const [name, regex] of browserTests) {
    const match = ua.match(regex);
    if (match) {
      navegador = name;
      versao_navegador = match[1] || "";
      break;
    }
  }

  // OS detection
  let sistema_operacional = fallback;
  let versao_so = "";

  if (/Windows NT (\d+[\d.]*)/.test(ua)) {
    sistema_operacional = "Windows";
    versao_so = ua.match(/Windows NT (\d+[\d.]*)/)?.[1] || "";
    const ntMap: Record<string, string> = { "10.0": "10/11", "6.3": "8.1", "6.2": "8", "6.1": "7" };
    versao_so = ntMap[versao_so] || versao_so;
  } else if (/Mac OS X (\d+[._\d]*)/.test(ua)) {
    sistema_operacional = "macOS";
    versao_so = (ua.match(/Mac OS X (\d+[._\d]*)/)?.[1] || "").replace(/_/g, ".");
  } else if (/Android (\d+[\d.]*)/.test(ua)) {
    sistema_operacional = "Android";
    versao_so = ua.match(/Android (\d+[\d.]*)/)?.[1] || "";
  } else if (/iPhone OS (\d+[._\d]*)/.test(ua) || /iPad.*OS (\d+[._\d]*)/.test(ua)) {
    sistema_operacional = "iOS";
    versao_so = (ua.match(/OS (\d+[._\d]*)/)?.[1] || "").replace(/_/g, ".");
  } else if (/Linux/.test(ua)) {
    sistema_operacional = "Linux";
  } else if (/CrOS/.test(ua)) {
    sistema_operacional = "ChromeOS";
  }

  // Device type
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);
  const isMobile = /Mobi|Android.*Mobile|iPhone|iPod/i.test(ua);
  const dispositivo = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  // Brand/model extraction
  let marca_dispositivo = fallback;
  let modelo_dispositivo = fallback;

  if (/iPhone/.test(ua)) { marca_dispositivo = "Apple"; modelo_dispositivo = "iPhone"; }
  else if (/iPad/.test(ua)) { marca_dispositivo = "Apple"; modelo_dispositivo = "iPad"; }
  else if (/Samsung/i.test(ua)) { marca_dispositivo = "Samsung"; modelo_dispositivo = ua.match(/SM-\w+/)?.[0] || fallback; }
  else if (/Xiaomi|Redmi|POCO/i.test(ua)) { marca_dispositivo = "Xiaomi"; }
  else if (/Motorola|moto/i.test(ua)) { marca_dispositivo = "Motorola"; }
  else if (/LG/i.test(ua)) { marca_dispositivo = "LG"; }
  else if (/Huawei/i.test(ua)) { marca_dispositivo = "Huawei"; }

  return {
    dispositivo,
    navegador,
    versao_navegador,
    sistema_operacional,
    versao_so,
    marca_dispositivo,
    modelo_dispositivo,
  };
}

// ═══════════════════════════════════════════════════════════
// UTM PARAMETERS — SESSION PERSISTENCE
// ═══════════════════════════════════════════════════════════

export interface UTMParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}

export function getUTMParams(): UTMParams {
  const params = new URLSearchParams(window.location.search);
  const utms: UTMParams = {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_term: params.get("utm_term"),
    utm_content: params.get("utm_content"),
  };

  // If UTMs present in URL, save to session
  const hasUtm = Object.values(utms).some(Boolean);
  if (hasUtm) {
    try { sessionStorage.setItem(UTM_KEY, JSON.stringify(utms)); } catch { /* ignore */ }
    return utms;
  }

  // Fallback: read from session
  try {
    const stored = sessionStorage.getItem(UTM_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }

  return utms;
}

// ═══════════════════════════════════════════════════════════
// TRAFFIC ORIGIN CLASSIFICATION
// ═══════════════════════════════════════════════════════════

export function classifyOrigin(utms: UTMParams, referrer: string): string {
  const medium = (utms.utm_medium || "").toLowerCase();
  const source = (utms.utm_source || "").toLowerCase();
  const ref = referrer.toLowerCase();

  if (medium === "cpc" || medium === "ppc") return "google_pago";
  if (ref.includes("google.com") && !medium) return "google_organico";
  if (ref.includes("whatsapp") || source.includes("whatsapp")) return "whatsapp";
  if (ref.includes("instagram") || source.includes("instagram")) return "instagram";
  if (ref.includes("facebook.com") || ref.includes("fb.com") || ref.includes("fb.me")) return "facebook";
  if (ref.includes("tiktok")) return "tiktok";
  if (ref.includes("youtube")) return "youtube";
  if (!ref && !medium && !source) return "direto";
  return "outro";
}

// ═══════════════════════════════════════════════════════════
// 4-LAYER LOCATION RESOLUTION
// ═══════════════════════════════════════════════════════════

export interface GeoData {
  latitude?: number | null;
  longitude?: number | null;
  cidade?: string | null;
  estado?: string | null;
  pais?: string | null;
  bairro?: string | null;
  cep?: string | null;
  endereco_completo?: string | null;
  rua?: string | null;
  numero?: string | null;
  endereco_ip?: string | null;
  provedor_internet?: string | null;
  fuso_horario?: string | null;
  geo_layer?: string; // 'gps' | 'ipapi' | 'ipapi_fallback' | 'timezone'
  zona_eleitoral?: string;
}

let cachedGeoData: GeoData | null = null;

// Layer 1: GPS
export function requestGPS(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (sessionStorage.getItem(GEO_DENIED_KEY) === "true") {
      resolve(null);
      return;
    }
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          sessionStorage.setItem(LAT_KEY, String(pos.coords.latitude));
          sessionStorage.setItem(LNG_KEY, String(pos.coords.longitude));
        } catch { /* ignore */ }
        resolve(pos);
      },
      () => {
        try { sessionStorage.setItem(GEO_DENIED_KEY, "true"); } catch { /* ignore */ }
        resolve(null);
      },
      { timeout: 15000, maximumAge: 60000, enableHighAccuracy: true }
    );
  });
}

// Reverse geocoding via Nominatim
async function reverseGeocode(lat: number, lng: number): Promise<Partial<GeoData>> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18&accept-language=pt-BR`,
      {
        headers: { "User-Agent": "ChamaRosaDigital/1.0" },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) return {};
    const data = await res.json();
    const addr = data.address || {};
    const rua = addr.road || "";
    const numero = addr.house_number || "";
    const bairro = addr.suburb || addr.neighbourhood || "";
    const distrito = addr.city_district || "";
    const cidade = addr.city || addr.town || addr.village || "";
    const estado = addr.state || "";
    const cep = addr.postcode || "";
    const parts = [rua, numero, bairro, cidade, estado, cep].filter(Boolean);
    const endereco_completo = parts.join(", ");

    const result: Partial<GeoData> = {
      rua, numero, bairro, cidade, estado, cep, endereco_completo,
      latitude: lat, longitude: lng, geo_layer: "gps",
    };

    // Store full geo in session
    try {
      sessionStorage.setItem(GEO_FULL_KEY, JSON.stringify(result));
    } catch { /* ignore */ }

    return result;
  } catch {
    return { latitude: lat, longitude: lng, geo_layer: "gps" };
  }
}

// Layer 2: ipapi.co
async function geoFromIpApi(): Promise<Partial<GeoData>> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error("ipapi failed");
    const d = await res.json();
    return {
      endereco_ip: d.ip || null,
      cidade: d.city || null,
      estado: d.region || null,
      pais: d.country_name || null,
      cep: d.postal || null,
      latitude: d.latitude || null,
      longitude: d.longitude || null,
      provedor_internet: d.org || null,
      fuso_horario: d.timezone || null,
      geo_layer: "ipapi",
    };
  } catch {
    return {};
  }
}

// Layer 3: ip-api.com
async function geoFromIpApiFallback(): Promise<Partial<GeoData>> {
  try {
    const res = await fetch(
      "http://ip-api.com/json/?fields=status,country,regionName,city,zip,lat,lon,isp,query",
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) throw new Error("ip-api failed");
    const d = await res.json();
    if (d.status !== "success") return {};
    return {
      endereco_ip: d.query || null,
      cidade: d.city || null,
      estado: d.regionName || null,
      pais: d.country || null,
      cep: d.zip || null,
      latitude: d.lat || null,
      longitude: d.lon || null,
      provedor_internet: d.isp || null,
      geo_layer: "ipapi_fallback",
    };
  } catch {
    return {};
  }
}

// Layer 4: Timezone/Language fallback
function geoFromTimezone(): Partial<GeoData> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const lang = navigator.language || "";
  
  let pais = "Não identificado";
  let estado = "Não identificado";
  
  // Brazil timezones
  if (tz.includes("Sao_Paulo") || tz.includes("Brasilia")) {
    pais = "Brasil";
    estado = "Não identificado (fuso SP/DF)";
  } else if (tz.includes("America/")) {
    pais = "Brasil";
  }

  if (lang.startsWith("pt")) pais = "Brasil";

  return { pais, estado, fuso_horario: tz, geo_layer: "timezone" };
}

/**
 * Resolve location using 4-layer strategy.
 * GPS runs in parallel with IP geo. Best result wins.
 */
export async function resolveLocation(): Promise<GeoData> {
  if (cachedGeoData) return cachedGeoData;

  // Check session for cached GPS data
  try {
    const stored = sessionStorage.getItem(GEO_FULL_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.latitude && parsed.longitude) {
        cachedGeoData = parsed;
        return parsed;
      }
    }
  } catch { /* ignore */ }

  // Run GPS and IP geo in parallel
  const [gpsResult, ipResult] = await Promise.allSettled([
    (async () => {
      const pos = await requestGPS();
      if (!pos) return null;
      return reverseGeocode(pos.coords.latitude, pos.coords.longitude);
    })(),
    (async () => {
      const primary = await geoFromIpApi();
      if (primary.endereco_ip) return primary;
      return geoFromIpApiFallback();
    })(),
  ]);

  const gps = gpsResult.status === "fulfilled" ? gpsResult.value : null;
  const ip = ipResult.status === "fulfilled" ? ipResult.value : {};
  const tz = geoFromTimezone();

  // Merge: GPS wins, then IP, then timezone
  const geo: GeoData = {
    ...tz,
    ...ip,
    ...(gps || {}),
  };

  // Ensure zona_eleitoral
  geo.zona_eleitoral = identifyZone(geo.bairro || "", geo.cidade || "", geo.latitude, geo.longitude);

  cachedGeoData = geo;
  return geo;
}

// Get cached coordinates from session (for click tracking)
export function getCachedCoords(): { lat: number; lng: number } | null {
  try {
    const lat = sessionStorage.getItem(LAT_KEY);
    const lng = sessionStorage.getItem(LNG_KEY);
    if (lat && lng) return { lat: parseFloat(lat), lng: parseFloat(lng) };
  } catch { /* ignore */ }
  return null;
}

export function getCachedGeo(): GeoData | null {
  if (cachedGeoData) return cachedGeoData;
  try {
    const stored = sessionStorage.getItem(GEO_FULL_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return null;
}

// ═══════════════════════════════════════════════════════════
// ZONE IDENTIFICATION
// ═══════════════════════════════════════════════════════════

function normalize(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

const ZONE_MAP: Record<string, string[]> = {
  "1ª Zona": [
    "Jardim Goiás", "Setor Bueno", "St. Bueno", "St Bueno", "Setor Marista",
    "Setor Sul", "Setor Sudoeste", "Setor Pedro Ludovico", "Setor Bela Vista",
    "Jardim América", "Setor Nova Suíça", "Setor Aeroporto",
    "Setor Leste Universitário", "Setor Coimbra", "Parque Amazônia",
  ],
  "2ª Zona": [
    "Setor Central", "Setor Norte Ferroviário", "Setor Campinas", "Vila Nova",
    "Jardim Novo Mundo", "Setor Santos Dumont", "Setor dos Funcionários",
    "Vila União", "Setor Crimeia Leste", "Setor Crimeia Oeste",
  ],
  "127ª Zona": [
    "Jardim das Esmeraldas", "Jardim Presidente", "Parque Amazônia Sul",
    "Residencial Eldorado", "Setor Jardim da Luz", "Jardim das Oliveiras",
    "Vila Redenção", "Conjunto Vera Cruz", "Parque das Laranjeiras",
  ],
  "133ª Zona": [
    "Setor Faiçalville", "Jardim Atlântico", "Residencial Montreal",
    "Vila Brasília", "Jardim Fonte Nova", "Jardim das Acácias",
    "Setor Universitário", "Jardim Guanabara", "Residencial Buena Vista",
  ],
  "134ª Zona": [
    "Conjunto Vera Cruz", "Jardim Cerrado", "Residencial Araguaia",
    "Setor Recanto do Bosque", "Vila Mutirão", "Jardim Curitiba",
    "Residencial Flamboyant", "Conjunto Caiçara", "Residencial Coimbra",
    "Jardim Dom Fernando",
  ],
  "135ª Zona": [
    "Setor Jardim Europa", "Residencial Vale dos Sonhos",
    "Jardim Balneário Meia Ponte", "Vila Santa Helena",
    "Setor dos Afonsos", "Parque Tremendão", "Residencial Granville",
  ],
  "136ª Zona": [
    "Setor Perim", "Bairro Feliz", "Vila Redenção Sul", "Jardim Bela Vista",
    "Boa Esperança", "Setor Goiânia 2", "Jardim Novo Horizonte",
    "Vila Bela Aliança",
  ],
  "146ª Zona": [
    "Setor Santa Genoveva", "Conjunto Riviera", "Jardim Planalto",
    "Parque Atheneu", "Sítio de Recreio Ipê", "São Domingos",
    "Residencial Granville Norte", "São Patrício", "Setor Fama",
    "Chácara do Governador",
  ],
  "147ª Zona": [
    "Conjunto Caiçara Norte", "Jardim Dom Fernando Norte",
    "Setor Morada do Sol", "Chácara Coimbra", "Jardim Reny",
    "Chácara dos Bandeirantes", "Residencial Fonte das Águas",
  ],
};

// Pre-normalize the zone map
const ZONE_MAP_NORMALIZED: Record<string, string[]> = {};
for (const [zone, neighborhoods] of Object.entries(ZONE_MAP)) {
  ZONE_MAP_NORMALIZED[zone] = neighborhoods.map(normalize);
}

const ZONE_CENTROIDS: Record<string, [number, number]> = {
  "1ª Zona": [-16.6864, -49.2553],
  "2ª Zona": [-16.6720, -49.2501],
  "127ª Zona": [-16.7198, -49.2695],
  "133ª Zona": [-16.6953, -49.2254],
  "134ª Zona": [-16.7201, -49.2948],
  "135ª Zona": [-16.6598, -49.2198],
  "136ª Zona": [-16.7482, -49.2683],
  "146ª Zona": [-16.6451, -49.2601],
  "147ª Zona": [-16.7003, -49.2849],
};

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function identifyZone(
  bairro: string,
  cidade: string,
  lat?: number | null,
  lng?: number | null
): string {
  // Step 1: Match bairro
  if (bairro) {
    const normalizedBairro = normalize(bairro);
    for (const [zone, neighborhoods] of Object.entries(ZONE_MAP_NORMALIZED)) {
      if (neighborhoods.some((n) => normalizedBairro.includes(n) || n.includes(normalizedBairro))) {
        return zone;
      }
    }
  }

  // Step 2: Nearest centroid if Goiânia
  const normalizedCidade = normalize(cidade);
  if (normalizedCidade.includes("goiania") && lat && lng) {
    let nearest = "";
    let minDist = Infinity;
    for (const [zone, [clat, clng]] of Object.entries(ZONE_CENTROIDS)) {
      const dist = haversineDistance(lat, lng, clat, clng);
      if (dist < minDist) {
        minDist = dist;
        nearest = zone;
      }
    }
    if (nearest) return nearest;
  }

  // Step 3: Aparecida de Goiânia
  if (normalizedCidade.includes("aparecida")) return "Aparecida de Goiânia";

  // Step 4: fallback
  return "Não identificada";
}

// ═══════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════

export function initSession() {
  try {
    if (!sessionStorage.getItem(SESSION_START_KEY)) {
      sessionStorage.setItem(SESSION_START_KEY, String(Date.now()));
    }
  } catch { /* ignore */ }
}

export function getSessionDuration(): number {
  try {
    const start = parseInt(sessionStorage.getItem(SESSION_START_KEY) || String(Date.now()), 10);
    return Math.round((Date.now() - start) / 1000);
  } catch {
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════
// SCROLL DEPTH TRACKING
// ═══════════════════════════════════════════════════════════

const SCROLL_THRESHOLDS = [25, 50, 75, 100];

export function initScrollTracking(pagina: string) {
  const reached = new Set<number>();
  
  // Restore milestones for this page
  try {
    const stored = sessionStorage.getItem(SCROLL_MILESTONES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.pagina === pagina) {
        parsed.milestones.forEach((m: number) => reached.add(m));
      }
    }
  } catch { /* ignore */ }

  let ticking = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const scrollHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      const scrollTop = window.scrollY;
      const depth = Math.min(100, Math.round(((scrollTop + viewportHeight) / scrollHeight) * 100));

      for (const threshold of SCROLL_THRESHOLDS) {
        if (depth >= threshold && !reached.has(threshold)) {
          reached.add(threshold);
          // Fire and forget — save scroll milestone
          try {
            sessionStorage.setItem(SCROLL_MILESTONES_KEY, JSON.stringify({
              pagina,
              milestones: Array.from(reached),
              depth,
            }));
          } catch { /* ignore */ }
        }
      }
      ticking = false;
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });

  return () => {
    window.removeEventListener("scroll", onScroll);
    return Math.max(0, ...Array.from(reached));
  };
}

// ═══════════════════════════════════════════════════════════
// EXIT TRACKING — sendBeacon for reliability
// ═══════════════════════════════════════════════════════════

export function getScrollDepth(): number {
  try {
    const stored = sessionStorage.getItem(SCROLL_MILESTONES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Math.max(0, ...(parsed.milestones || [0]));
    }
  } catch { /* ignore */ }
  return 0;
}

// ═══════════════════════════════════════════════════════════
// PLATFORM CLICK DETECTION
// ═══════════════════════════════════════════════════════════

export type Platform = "whatsapp" | "instagram" | "facebook";

export function classifyPlatform(href: string): Platform | null {
  if (!href) return null;
  const h = href.toLowerCase();
  if (h.includes("wa.me") || h.includes("whatsapp.com") || h.includes("api.whatsapp") || h.includes("w.app") || h.includes("whatsapp://")) return "whatsapp";
  if (h.includes("instagram.com")) return "instagram";
  if (h.includes("facebook.com") || h.includes("fb.com") || h.includes("fb.me")) return "facebook";
  return null;
}

export function findSection(el: HTMLElement): string {
  let current: HTMLElement | null = el;
  while (current) {
    if (current.dataset?.section) return current.dataset.section;
    if (current.tagName === "SECTION" && current.id) return current.id;
    if (current.id && current.tagName !== "BODY" && current.tagName !== "HTML") return current.id;
    current = current.parentElement;
  }
  const sec = el.closest("section");
  if (sec) {
    const heading = sec.querySelector("h1, h2, h3");
    if (heading?.textContent) return heading.textContent.trim().slice(0, 60);
  }
  return "geral";
}

export function getButtonText(el: HTMLElement): string {
  return (el.textContent || el.getAttribute("aria-label") || el.getAttribute("title") || "").trim().slice(0, 100);
}

export function getHref(el: HTMLElement): string {
  if (el instanceof HTMLAnchorElement) return el.href;
  return el.getAttribute("href") || el.getAttribute("data-href") || "";
}

// ═══════════════════════════════════════════════════════════
// PAGE VIEW TRACKING
// ═══════════════════════════════════════════════════════════

export async function trackPageView(pagina: string) {
  try {
    const cookie_visitante = getVisitorId();
    const visitCount = getVisitCount();
    const primeira_visita = isFirstVisit();
    const device = detectDevice();
    const utms = getUTMParams();
    const origem_trafego = classifyOrigin(utms, document.referrer || "");

    // Resolve location in background — don't block
    const geoPromise = resolveLocation();

    // Insert with whatever we have immediately, then update with geo
    const baseData: Record<string, unknown> = {
      pagina,
      user_agent: navigator.userAgent,
      largura_tela: window.innerWidth,
      altura_tela: window.innerHeight,
      referrer: document.referrer || null,
      dispositivo: device.dispositivo,
      sistema_operacional: device.sistema_operacional,
      navegador: device.navegador,
      cookie_visitante,
      primeira_visita,
      contador_visitas: visitCount,
      ...utms,
    };

    // Try to get cached geo immediately
    const cachedGeo = getCachedGeo();
    if (cachedGeo) {
      baseData.endereco_ip = cachedGeo.endereco_ip || null;
      baseData.pais = cachedGeo.pais || null;
      baseData.estado = cachedGeo.estado || null;
      baseData.cidade = cachedGeo.cidade || null;
    }

    // Fire insert
    retryInsert("acessos_site", baseData);

    // When geo resolves, update the record
    geoPromise.then((geo) => {
      if (geo.endereco_ip || geo.latitude) {
        // Update via edge function for richer data
        updateLocationViaEdge(cookie_visitante, "acessos_site", geo).catch(() => {});
      }
    }).catch(() => {});
  } catch {
    // RULE 2: Never show error to user
  }
}

// ═══════════════════════════════════════════════════════════
// CLICK TRACKING
// ═══════════════════════════════════════════════════════════

export function trackClick(
  tipo_clique: Platform,
  pagina_origem: string,
  extra?: { texto_botao?: string; secao_pagina?: string; url_destino?: string }
) {
  try {
    const cookie_visitante = getVisitorId();
    const geo = getCachedGeo();
    const sessionDuration = getSessionDuration();

    const data: Record<string, unknown> = {
      tipo_clique,
      pagina_origem,
      user_agent: navigator.userAgent,
      cookie_visitante,
      texto_botao: extra?.texto_botao || null,
      secao_pagina: extra?.secao_pagina || null,
      url_destino: extra?.url_destino || null,
    };

    if (geo) {
      data.endereco_ip = geo.endereco_ip || null;
      data.pais = geo.pais || null;
      data.estado = geo.estado || null;
      data.cidade = geo.cidade || null;
      if (geo.latitude) data.latitude = geo.latitude;
      if (geo.longitude) data.longitude = geo.longitude;
    }

    // Fire and forget with retry
    retryInsert("cliques_whatsapp", data);

    // Also try sendBeacon for reliability (navigation may close page)
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const beaconUrl = `https://${projectId}.supabase.co/functions/v1/track-capture`;
      const beaconData = JSON.stringify({ action: "click", ...data });
      navigator.sendBeacon(beaconUrl, beaconData);
    } catch { /* ignore */ }

    // Attempt fresh GPS in background with short timeout
    if (!getCachedCoords()) {
      requestGPS().catch(() => {});
    }
  } catch {
    // RULE 2: Never show error
  }
}

// ═══════════════════════════════════════════════════════════
// UNIVERSAL CLICK TRACKER
// ═══════════════════════════════════════════════════════════

function handleGlobalClick(e: MouseEvent) {
  try {
    let target = e.target as HTMLElement | null;
    for (let i = 0; i < 6 && target; i++) {
      if (target instanceof HTMLAnchorElement || target.tagName === "BUTTON") break;
      target = target.parentElement;
    }
    if (!target) return;

    const href = getHref(target);
    const platform = classifyPlatform(href);
    if (!platform) return;

    trackClick(platform, window.location.pathname, {
      texto_botao: getButtonText(target),
      secao_pagina: findSection(target),
      url_destino: href,
    });
  } catch { /* RULE 2 */ }
}

export function initUniversalClickTracker() {
  document.addEventListener("click", handleGlobalClick, { capture: true });
}

// ═══════════════════════════════════════════════════════════
// FORM TRACKING — GPS on focus, enriched submission
// ═══════════════════════════════════════════════════════════

let formStartTime: number | null = null;
let formGpsRequested = false;

export function onFormFocus() {
  if (!formStartTime) {
    formStartTime = Date.now();
  }
  if (!formGpsRequested) {
    formGpsRequested = true;
    // Request GPS in background — gives 30-60s before submission
    requestGPS().catch(() => {});
  }
}

export function getFormFillTime(): number {
  if (!formStartTime) return 0;
  return Math.round((Date.now() - formStartTime) / 1000);
}

export function resetFormTracking() {
  formStartTime = null;
  formGpsRequested = false;
}

// ═══════════════════════════════════════════════════════════
// LOCATION UPDATE VIA EDGE FUNCTION
// ═══════════════════════════════════════════════════════════

async function updateLocationViaEdge(
  cookie_visitante: string,
  table: string,
  geo: Partial<GeoData>
) {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/track-capture`;
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        action: "update-location",
        cookie_visitante,
        table,
        ...geo,
      }),
    });
  } catch { /* fire and forget */ }
}

// ═══════════════════════════════════════════════════════════
// EXIT TRACKING
// ═══════════════════════════════════════════════════════════

export function initExitTracking(pagina: string) {
  const sendExit = () => {
    try {
      const duration = getSessionDuration();
      const scrollDepth = getScrollDepth();
      const cookie_visitante = getVisitorId();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/track-capture`;

      const data = JSON.stringify({
        action: "exit",
        cookie_visitante,
        pagina,
        tempo_na_pagina: duration,
        profundidade_scroll: scrollDepth,
      });

      // sendBeacon guarantees delivery on page unload
      navigator.sendBeacon(url, data);
    } catch { /* ignore */ }
  };

  const onVisChange = () => {
    if (document.hidden) sendExit();
  };

  window.addEventListener("beforeunload", sendExit);
  document.addEventListener("visibilitychange", onVisChange);

  return () => {
    window.removeEventListener("beforeunload", sendExit);
    document.removeEventListener("visibilitychange", onVisChange);
  };
}

// ═══════════════════════════════════════════════════════════
// EXPORTS FOR VALIDATION PAGE
// ═══════════════════════════════════════════════════════════

export { ZONE_MAP, ZONE_CENTROIDS, getQueue as getFailedQueue };
