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

// ─── Platform detection ───
type Platform = "whatsapp" | "instagram" | "facebook";

function classifyPlatform(href: string): Platform | null {
  if (!href) return null;
  const h = href.toLowerCase();
  if (h.includes("wa.me") || h.includes("whatsapp.com") || h.includes("api.whatsapp") || h.includes("w.app")) return "whatsapp";
  if (h.includes("instagram.com")) return "instagram";
  if (h.includes("facebook.com") || h.includes("fb.com") || h.includes("fb.me")) return "facebook";
  return null;
}

function findSection(el: HTMLElement): string {
  let current: HTMLElement | null = el;
  while (current) {
    if (current.tagName === "SECTION" && current.id) return current.id;
    if (current.dataset?.section) return current.dataset.section;
    if (current.id && current.tagName !== "BODY" && current.tagName !== "HTML") return current.id;
    current = current.parentElement;
  }
  // fallback: closest section tag
  const sec = el.closest("section");
  if (sec) {
    const heading = sec.querySelector("h1, h2, h3");
    if (heading?.textContent) return heading.textContent.trim().slice(0, 60);
  }
  return "geral";
}

function getButtonText(el: HTMLElement): string {
  return (el.textContent || el.getAttribute("aria-label") || el.getAttribute("title") || "").trim().slice(0, 100);
}

function getHref(el: HTMLElement): string {
  if (el instanceof HTMLAnchorElement) return el.href;
  return el.getAttribute("href") || el.getAttribute("data-href") || "";
}

// ─── Fire-and-forget click tracking ───
export function trackClick(
  tipo_clique: Platform,
  pagina_origem: string,
  telefone_destino?: string,
  extra?: { texto_botao?: string; secao_pagina?: string; url_destino?: string }
) {
  const cookie_visitante = getCookie();

  // Fire-and-forget — no await, never blocks navigation
  getGeoData().then((geo) => {
    supabase.from("cliques_whatsapp").insert({
      tipo_clique,
      pagina_origem,
      telefone_destino: telefone_destino || null,
      user_agent: navigator.userAgent,
      cookie_visitante,
      texto_botao: extra?.texto_botao || null,
      secao_pagina: extra?.secao_pagina || null,
      url_destino: extra?.url_destino || null,
      ...geo,
    } as any);
  });
}

// ─── Universal click tracker ───
const TRACKED_ATTR = "data-click-tracked";

function handleGlobalClick(e: MouseEvent) {
  let target = e.target as HTMLElement | null;
  // Walk up to 5 levels to find an anchor or button
  for (let i = 0; i < 6 && target; i++) {
    if (target instanceof HTMLAnchorElement || target.tagName === "BUTTON") break;
    target = target.parentElement;
  }
  if (!target) return;

  const href = getHref(target);
  const platform = classifyPlatform(href);
  if (!platform) return;

  const texto_botao = getButtonText(target);
  const secao_pagina = findSection(target);
  const pagina_origem = window.location.pathname;

  trackClick(platform, pagina_origem, undefined, {
    texto_botao,
    secao_pagina,
    url_destino: href,
  });
}

export function initUniversalClickTracker() {
  // Event delegation on document — catches all current and future elements
  document.addEventListener("click", handleGlobalClick, { capture: true });
}
