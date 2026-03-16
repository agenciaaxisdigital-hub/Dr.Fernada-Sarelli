import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    let body: Record<string, unknown>;

    // Support both JSON and sendBeacon (plain text)
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        return json({ error: "Invalid body" }, 400);
      }
    }

    const action = body.action as string;

    // ─── UPDATE LOCATION ───
    if (action === "update-location") {
      const cookie = body.cookie_visitante as string;
      const table = body.table as string;

      if (!cookie || !table) {
        return json({ error: "Missing cookie_visitante or table" }, 400);
      }

      // Only allow known tables
      const allowedTables = ["acessos_site", "cliques_whatsapp", "mensagens_contato"];
      if (!allowedTables.includes(table)) {
        return json({ error: "Invalid table" }, 400);
      }

      // Build update data from provided fields
      const updateFields: Record<string, unknown> = {};
      const locationFields = [
        "endereco_ip", "pais", "estado", "cidade", "bairro", "cep",
        "endereco_completo", "latitude", "longitude", "zona_eleitoral",
      ];

      for (const field of locationFields) {
        if (body[field] !== undefined && body[field] !== null) {
          updateFields[field] = body[field];
        }
      }

      if (Object.keys(updateFields).length === 0) {
        return json({ message: "No fields to update" }, 200);
      }

      // Update records from last 30 minutes for this visitor
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from(table)
        .update(updateFields)
        .eq("cookie_visitante", cookie)
        .gte("criado_em", thirtyMinAgo);

      if (error) {
        console.error("Update location error:", error.message);
        return json({ error: error.message }, 500);
      }

      return json({ success: true });
    }

    // ─── CLICK CAPTURE (via sendBeacon) ───
    if (action === "click") {
      const { action: _, ...clickData } = body;

      // Extract real IP server-side
      const ip = extractIP(req);
      clickData.endereco_ip = ip;

      // If no geo data, try server-side IP geo
      if (!clickData.cidade) {
        const geo = await serverGeoLookup(ip);
        Object.assign(clickData, geo);
      }

      const { error } = await supabase.from("cliques_whatsapp").insert(clickData);
      if (error) {
        console.error("Click insert error:", error.message);
      }

      return json({ success: !error });
    }

    // ─── EXIT TRACKING ───
    if (action === "exit") {
      // Exit data is informational — store as page view update
      const cookie = body.cookie_visitante as string;
      if (cookie) {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        // Just log — no update needed for current schema
        console.log(`Exit: ${cookie}, page: ${body.pagina}, time: ${body.tempo_na_pagina}s, scroll: ${body.profundidade_scroll}%`);
      }
      return json({ success: true });
    }

    // ─── FORM CAPTURE (enriched) ───
    if (action === "form") {
      const { action: _, ...formData } = body;
      const ip = extractIP(req);

      // Server-side geo if missing
      if (!formData.cidade) {
        const geo = await serverGeoLookup(ip);
        Object.assign(formData, geo);
      }

      formData.endereco_ip = ip;

      const { data: result, error } = await supabase
        .from("mensagens_contato")
        .insert(formData)
        .select("id")
        .single();

      if (error) {
        console.error("Form insert error:", error.message);
        return json({ error: error.message }, 500);
      }

      return json({ success: true, id: result?.id });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("track-capture error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

// ─── HELPERS ───

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractIP(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("true-client-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}

async function serverGeoLookup(ip: string): Promise<Record<string, unknown>> {
  if (!ip || ip === "0.0.0.0" || ip.startsWith("127.") || ip.startsWith("192.168.")) {
    return {};
  }

  // Layer 2: ipapi.co
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const d = await res.json();
      if (d.city) {
        return {
          cidade: d.city,
          estado: d.region,
          pais: d.country_name,
          cep: d.postal,
          latitude: d.latitude,
          longitude: d.longitude,
        };
      }
    }
  } catch { /* fallback */ }

  // Layer 3: ip-api.com
  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,zip,lat,lon`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const d = await res.json();
      if (d.status === "success") {
        return {
          cidade: d.city,
          estado: d.regionName,
          pais: d.country,
          cep: d.zip,
          latitude: d.lat,
          longitude: d.lon,
        };
      }
    }
  } catch { /* ignore */ }

  return {};
}
