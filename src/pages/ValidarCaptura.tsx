import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  getVisitorId,
  detectDevice,
  getUTMParams,
  resolveLocation,
  requestGPS,
  identifyZone,
  getFailedQueue,
  flushQueue,
  getScrollDepth,
  getSessionDuration,
  classifyOrigin,
  getCachedGeo,
  ZONE_MAP,
  type GeoData,
} from "@/lib/tracking";

type Status = "pending" | "ok" | "error";

interface Check {
  label: string;
  status: Status;
  detail: string;
}

const ValidarCaptura = () => {
  const [searchParams] = useSearchParams();
  const [checks, setChecks] = useState<Check[]>([]);
  const [scrollDepth, setScrollDepth] = useState(0);
  const [zoneBairro, setZoneBairro] = useState("");
  const [zoneResult, setZoneResult] = useState("");
  const [coordLat, setCoordLat] = useState("");
  const [coordLng, setCoordLng] = useState("");
  const [coordZoneResult, setCoordZoneResult] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsData, setGpsData] = useState<Partial<GeoData> | null>(null);
  const [clickResults, setClickResults] = useState<Record<string, string>>({});
  const [formResult, setFormResult] = useState("");
  const [queueItems, setQueueItems] = useState<unknown[]>([]);

  // Guard: only accessible with ?chama=validar
  const isAuthorized = searchParams.get("chama") === "validar";

  const updateCheck = useCallback((label: string, status: Status, detail: string) => {
    setChecks((prev) => {
      const existing = prev.findIndex((c) => c.label === label);
      const newCheck = { label, status, detail };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newCheck;
        return updated;
      }
      return [...prev, newCheck];
    });
  }, []);

  // Run all checks
  useEffect(() => {
    if (!isAuthorized) return;

    // 1. Supabase connection
    (async () => {
      updateCheck("Conexão Supabase", "pending", "Testando...");
      try {
        const { error } = await supabase.from("configuracoes").select("id").limit(1);
        if (error) throw error;
        updateCheck("Conexão Supabase", "ok", "Conectado com sucesso");
      } catch (e) {
        updateCheck("Conexão Supabase", "error", `Falha: ${(e as Error).message}`);
      }
    })();

    // 2. Visitor cookie
    const visitorId = getVisitorId();
    updateCheck("Cookie do Visitante", visitorId ? "ok" : "error",
      visitorId ? `ID: ${visitorId}` : "Não foi possível gerar cookie"
    );

    // 3. Device detection
    const device = detectDevice();
    const deviceFields = Object.entries(device);
    const hasUndefined = deviceFields.some(([, v]) => !v || v === "undefined");
    updateCheck("Detecção de Dispositivo", hasUndefined ? "error" : "ok",
      deviceFields.map(([k, v]) => `${k}: ${v}`).join(" | ")
    );

    // 4. UTM capture
    const utms = getUTMParams();
    const hasUtm = Object.values(utms).some(Boolean);
    updateCheck("Captura de UTMs",
      hasUtm ? "ok" : "ok",
      hasUtm
        ? Object.entries(utms).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join(", ")
        : "Nenhum UTM na URL (normal se não vieram de campanha)"
    );

    // 5. Traffic origin
    const origin = classifyOrigin(utms, document.referrer || "");
    updateCheck("Origem do Tráfego", "ok", `Classificado como: ${origin}`);

    // 6. Location resolution
    (async () => {
      updateCheck("Resolução de Localização", "pending", "Resolvendo camadas...");
      try {
        const geo = await resolveLocation();
        const fields = [
          `Camada: ${geo.geo_layer || "desconhecida"}`,
          geo.cidade && `Cidade: ${geo.cidade}`,
          geo.estado && `Estado: ${geo.estado}`,
          geo.bairro && `Bairro: ${geo.bairro}`,
          geo.cep && `CEP: ${geo.cep}`,
          geo.latitude && `Lat: ${geo.latitude}`,
          geo.longitude && `Lng: ${geo.longitude}`,
          geo.endereco_ip && `IP: ${geo.endereco_ip}`,
          `Zona: ${geo.zona_eleitoral || "Não identificada"}`,
        ].filter(Boolean).join(" | ");

        updateCheck("Resolução de Localização",
          geo.cidade ? "ok" : "error",
          fields || "Nenhum dado de localização obtido"
        );
      } catch (e) {
        updateCheck("Resolução de Localização", "error", `Erro: ${(e as Error).message}`);
      }
    })();

    // 7. Session
    updateCheck("Sessão", "ok",
      `Duração: ${getSessionDuration()}s | Scroll: ${getScrollDepth()}%`
    );

    // Queue
    setQueueItems(getFailedQueue());

  }, [isAuthorized, updateCheck]);

  // Live scroll update
  useEffect(() => {
    if (!isAuthorized) return;
    const interval = setInterval(() => {
      setScrollDepth(getScrollDepth());
    }, 1000);
    return () => clearInterval(interval);
  }, [isAuthorized]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Acesso não autorizado.</p>
      </div>
    );
  }

  const handleGPSTest = async () => {
    setGpsLoading(true);
    try {
      const pos = await requestGPS();
      if (pos) {
        const geo = await resolveLocation();
        setGpsData(geo);
      } else {
        setGpsData({ geo_layer: "denied" });
      }
    } catch {
      setGpsData({ geo_layer: "error" });
    }
    setGpsLoading(false);
  };

  const handleZoneBairroTest = () => {
    if (!zoneBairro) return;
    setZoneResult(identifyZone(zoneBairro, "Goiânia"));
  };

  const handleZoneCoordTest = () => {
    const lat = parseFloat(coordLat);
    const lng = parseFloat(coordLng);
    if (isNaN(lat) || isNaN(lng)) {
      setCoordZoneResult("Coordenadas inválidas");
      return;
    }
    setCoordZoneResult(identifyZone("", "Goiânia", lat, lng));
  };

  const handleClickTest = async (platform: string) => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/track-capture`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          action: "click",
          tipo_clique: platform,
          pagina_origem: "/validar-captura",
          cookie_visitante: getVisitorId(),
          texto_botao: `Teste ${platform}`,
          secao_pagina: "validacao",
          url_destino: `https://${platform}.com/test`,
        }),
      });
      const data = await res.json();
      setClickResults((prev) => ({ ...prev, [platform]: data.success ? "✅ Registrado" : `❌ ${data.error}` }));
    } catch (e) {
      setClickResults((prev) => ({ ...prev, [platform]: `❌ ${(e as Error).message}` }));
    }
  };

  const handleFormTest = async () => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/track-capture`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          action: "form",
          nome: "Teste Validação",
          telefone: "(00) 00000-0000",
          mensagem: "Registro de teste automático",
          cookie_visitante: getVisitorId(),
        }),
      });
      const data = await res.json();
      setFormResult(data.success ? `✅ Registrado (ID: ${data.id})` : `❌ ${data.error}`);
    } catch (e) {
      setFormResult(`❌ ${(e as Error).message}`);
    }
  };

  const handleFlushQueue = async () => {
    await flushQueue();
    setQueueItems(getFailedQueue());
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">🔍 Validação de Captura</h1>
          <p className="text-sm text-muted-foreground mt-1">Diagnóstico completo do sistema de rastreamento</p>
        </div>

        {/* Auto checks */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="font-bold text-lg">Verificações Automáticas</h2>
          {checks.map((check) => (
            <div key={check.label} className="flex items-start gap-3 py-2 border-b last:border-0">
              <span className="text-xl mt-0.5">
                {check.status === "ok" ? "✅" : check.status === "error" ? "❌" : "⏳"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{check.label}</p>
                <p className="text-xs text-muted-foreground break-all">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Scroll tracking */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-bold text-lg mb-2">📜 Scroll Tracking (Tempo Real)</h2>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${scrollDepth}%` }}
              />
            </div>
            <span className="text-sm font-mono font-bold">{scrollDepth}%</span>
          </div>
        </div>

        {/* GPS test */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-bold text-lg mb-3">📍 Teste de GPS</h2>
          <button
            onClick={handleGPSTest}
            disabled={gpsLoading}
            className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
          >
            {gpsLoading ? "Solicitando..." : "Solicitar GPS"}
          </button>
          {gpsData && (
            <div className="mt-3 text-xs space-y-1 bg-muted rounded-lg p-3">
              {gpsData.geo_layer === "denied" ? (
                <p className="text-destructive">GPS negado ou indisponível</p>
              ) : gpsData.geo_layer === "error" ? (
                <p className="text-destructive">Erro ao obter GPS</p>
              ) : (
                <>
                  <p><strong>Lat:</strong> {gpsData.latitude} | <strong>Lng:</strong> {gpsData.longitude}</p>
                  {gpsData.endereco_completo && <p><strong>Endereço:</strong> {gpsData.endereco_completo}</p>}
                  {gpsData.bairro && <p><strong>Bairro:</strong> {gpsData.bairro}</p>}
                  {gpsData.zona_eleitoral && <p><strong>Zona:</strong> {gpsData.zona_eleitoral}</p>}
                </>
              )}
            </div>
          )}
        </div>

        {/* Zone tests */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-bold text-lg">🗺️ Teste de Zona Eleitoral</h2>

          <div>
            <label className="text-sm font-medium">Por Bairro:</label>
            <div className="flex gap-2 mt-1">
              <input
                value={zoneBairro}
                onChange={(e) => setZoneBairro(e.target.value)}
                placeholder="Ex: Setor Bueno"
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
              />
              <button onClick={handleZoneBairroTest} className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm">
                Testar
              </button>
            </div>
            {zoneResult && <p className="mt-1 text-sm">Resultado: <strong>{zoneResult}</strong></p>}
          </div>

          <div>
            <label className="text-sm font-medium">Por Coordenadas:</label>
            <div className="flex gap-2 mt-1">
              <input
                value={coordLat}
                onChange={(e) => setCoordLat(e.target.value)}
                placeholder="Latitude"
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
              />
              <input
                value={coordLng}
                onChange={(e) => setCoordLng(e.target.value)}
                placeholder="Longitude"
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
              />
              <button onClick={handleZoneCoordTest} className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm">
                Testar
              </button>
            </div>
            {coordZoneResult && <p className="mt-1 text-sm">Resultado: <strong>{coordZoneResult}</strong></p>}
          </div>
        </div>

        {/* Click tests */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-bold text-lg mb-3">🖱️ Teste de Cliques</h2>
          <div className="flex gap-2 flex-wrap">
            {["whatsapp", "instagram", "facebook"].map((p) => (
              <div key={p} className="flex items-center gap-2">
                <button
                  onClick={() => handleClickTest(p)}
                  className="rounded-full border border-primary/30 px-4 py-2 text-sm font-medium text-primary hover:bg-accent"
                >
                  Testar {p}
                </button>
                {clickResults[p] && <span className="text-xs">{clickResults[p]}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Form test */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-bold text-lg mb-3">📝 Teste de Formulário</h2>
          <button
            onClick={handleFormTest}
            className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
          >
            Submeter Formulário Teste
          </button>
          {formResult && <p className="mt-2 text-sm">{formResult}</p>}
        </div>

        {/* Failed queue */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-bold text-lg mb-3">📦 Fila de Falhas (localStorage)</h2>
          {queueItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">✅ Nenhum registro na fila</p>
          ) : (
            <>
              <p className="text-sm text-destructive mb-2">⚠️ {queueItems.length} registro(s) aguardando reenvio</p>
              <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto max-h-40">
                {JSON.stringify(queueItems, null, 2)}
              </pre>
              <button
                onClick={handleFlushQueue}
                className="mt-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-medium text-primary hover:bg-accent"
              >
                Tentar Reenviar Agora
              </button>
            </>
          )}
        </div>

        {/* Zone reference */}
        <details className="rounded-xl border bg-card p-5">
          <summary className="font-bold text-lg cursor-pointer">📋 Referência de Zonas e Bairros</summary>
          <div className="mt-3 space-y-3 text-xs">
            {Object.entries(ZONE_MAP).map(([zone, neighborhoods]) => (
              <div key={zone}>
                <p className="font-bold text-primary">{zone}</p>
                <p className="text-muted-foreground">{neighborhoods.join(", ")}</p>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
};

export default ValidarCaptura;
