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

      // Only allow known tables and their columns
      const tableColumns: Record<string, string[]> = {
        acessos_site: ["endereco_ip", "pais", "estado", "cidade"],
        cliques_whatsapp: ["endereco_ip", "pais", "estado", "cidade", "latitude", "longitude"],
        mensagens_contato: ["endereco_ip", "pais", "estado", "cidade", "latitude", "longitude"],
      };

      const allowedFields = tableColumns[table];
      if (!allowedFields) {
        return json({ error: "Invalid table" }, 400);
      }

      // Build update data from provided fields — only known columns
      const updateFields: Record<string, unknown> = {};
      for (const field of allowedFields) {
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
      // Extract real IP server-side
      const ip = extractIP(req);

      // Server-side geo if missing
      let geoFields: Record<string, unknown> = {};
      if (!body.cidade) {
        geoFields = await serverGeoLookup(ip);
      }

      // Only insert known columns
      const clickRow: Record<string, unknown> = {
        tipo_clique: body.tipo_clique || "whatsapp",
        pagina_origem: body.pagina_origem || null,
        cookie_visitante: body.cookie_visitante || null,
        texto_botao: body.texto_botao || null,
        secao_pagina: body.secao_pagina || null,
        url_destino: body.url_destino || null,
        telefone_destino: body.telefone_destino || null,
        user_agent: body.user_agent || null,
        endereco_ip: ip,
        cidade: body.cidade || geoFields.cidade || null,
        estado: body.estado || geoFields.estado || null,
        pais: body.pais || geoFields.pais || null,
        latitude: body.latitude || geoFields.latitude || null,
        longitude: body.longitude || geoFields.longitude || null,
      };

      const { error } = await supabase.from("cliques_whatsapp").insert(clickRow);
      if (error) {
        console.error("Click insert error:", error.message);
      }

      return json({ success: !error });
    }

    // ─── RETROACTIVE ENRICHMENT (FIX 7) ───
    if (action === "retroactive-enrich") {
      const cookie = body.cookie_visitante as string;
      if (!cookie) return json({ error: "Missing cookie" }, 400);

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const updateData: Record<string, unknown> = {};
      for (const f of ["endereco_ip", "pais", "estado", "cidade"]) {
        if (body[f]) updateData[f] = body[f];
      }

      if (Object.keys(updateData).length > 0) {
        // Update acessos_site records missing cidade
        await supabase.from("acessos_site").update(updateData)
          .eq("cookie_visitante", cookie).gte("criado_em", sevenDaysAgo).is("cidade", null);

        // Update cliques with lat/lng too
        const clickUpdate = { ...updateData };
        if (body.latitude) clickUpdate.latitude = body.latitude;
        if (body.longitude) clickUpdate.longitude = body.longitude;

        await supabase.from("cliques_whatsapp").update(clickUpdate)
          .eq("cookie_visitante", cookie).gte("criado_em", sevenDaysAgo).is("cidade", null);

        await supabase.from("mensagens_contato").update(clickUpdate)
          .eq("cookie_visitante", cookie).gte("criado_em", sevenDaysAgo).is("cidade", null);
      }

      console.log(`Retroactive enrich for ${cookie}: updated with ${JSON.stringify(updateData)}`);
      return json({ success: true });
    }

    // ─── EXIT TRACKING ───
    if (action === "exit") {
      const cookie = body.cookie_visitante as string;
      if (cookie) {
        console.log(`Exit: ${cookie}, page: ${body.pagina}, time: ${body.tempo_na_pagina}s, scroll: ${body.profundidade_scroll}%`);
      }
      return json({ success: true });
    }

    // ─── FORM CAPTURE (enriched) ───
    if (action === "form") {
      const ip = extractIP(req);

      // Server-side geo if missing
      let geoFields: Record<string, unknown> = {};
      if (!body.cidade) {
        geoFields = await serverGeoLookup(ip);
      }

      const formRow: Record<string, unknown> = {
        nome: body.nome,
        telefone: body.telefone,
        email: body.email || null,
        mensagem: body.mensagem,
        endereco_ip: ip,
        user_agent: body.user_agent || null,
        cidade: body.cidade || geoFields.cidade || null,
        estado: body.estado || geoFields.estado || null,
        pais: body.pais || geoFields.pais || null,
        latitude: body.latitude || geoFields.latitude || null,
        longitude: body.longitude || geoFields.longitude || null,
      };

      const { data: result, error } = await supabase
        .from("mensagens_contato")
        .insert(formRow)
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
