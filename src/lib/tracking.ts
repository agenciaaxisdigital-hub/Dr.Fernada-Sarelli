import { supabase } from "@/integrations/supabase/client";

function getCookie(): string {
  const key = "visitor_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function getVisitCount(): number {
  const key = "visit_count";
  const count = parseInt(localStorage.getItem(key) || "0", 10) + 1;
  localStorage.setItem(key, count.toString());
  return count;
}

function isFirstVisit(): boolean {
  const key = "has_visited";
  const visited = localStorage.getItem(key);
  if (!visited) {
    localStorage.setItem(key, "true");
    return true;
  }
  return false;
}

function parseUA() {
  const ua = navigator.userAgent;
  let navegador = "Outro";
  let sistema_operacional = "Outro";

  if (ua.includes("Firefox")) navegador = "Firefox";
  else if (ua.includes("Edg")) navegador = "Edge";
  else if (ua.includes("Chrome")) navegador = "Chrome";
  else if (ua.includes("Safari")) navegador = "Safari";

  if (ua.includes("Windows")) sistema_operacional = "Windows";
  else if (ua.includes("Mac")) sistema_operacional = "macOS";
  else if (ua.includes("Android")) sistema_operacional = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) sistema_operacional = "iOS";
  else if (ua.includes("Linux")) sistema_operacional = "Linux";

  const dispositivo = /Mobi|Android/i.test(ua) ? "mobile" : "desktop";

  return { navegador, sistema_operacional, dispositivo };
}

function getUTMParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || null,
    utm_medium: params.get("utm_medium") || null,
    utm_campaign: params.get("utm_campaign") || null,
    utm_term: params.get("utm_term") || null,
    utm_content: params.get("utm_content") || null,
  };
}

async function getGeoData() {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return {};
    const data = await res.json();
    return {
      endereco_ip: data.ip || null,
      pais: data.country_name || null,
      estado: data.region || null,
      cidade: data.city || null,
    };
  } catch {
    return {};
  }
}

export async function trackPageView(pagina: string) {
  const cookie_visitante = getCookie();
  const visitCount = getVisitCount();
  const primeira_visita = isFirstVisit();
  const { navegador, sistema_operacional, dispositivo } = parseUA();
  const utm = getUTMParams();
  const geo = await getGeoData();

  await supabase.from("acessos_site").insert({
    pagina,
    user_agent: navigator.userAgent,
    largura_tela: window.innerWidth,
    altura_tela: window.innerHeight,
    referrer: document.referrer || null,
    dispositivo,
    ...geo,
    sistema_operacional,
    navegador,
    ...utm,
    cookie_visitante,
    primeira_visita,
    contador_visitas: visitCount,
  } as any);
}

export async function trackClick(tipo_clique: "whatsapp" | "instagram", pagina_origem: string, telefone_destino?: string) {
  const cookie_visitante = getCookie();
  const { dispositivo } = parseUA();
  const geo = await getGeoData();

  await supabase.from("cliques_whatsapp").insert({
    tipo_clique,
    pagina_origem,
    telefone_destino: telefone_destino || null,
    user_agent: navigator.userAgent,
    cookie_visitante,
    ...geo,
  } as any);
}
