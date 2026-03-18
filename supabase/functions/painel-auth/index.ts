import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as encodeHex } from "https://deno.land/std@0.208.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple password hashing using SHA-256 + salt
async function hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const s = salt || crypto.randomUUID();
  const data = new TextEncoder().encode(s + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
  return { hash: hashHex, salt: s };
}

async function verifyPassword(password: string, storedHash: string, salt: string): Promise<boolean> {
  const { hash } = await hashPassword(password, salt);
  return hash === storedHash;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json();
    const { action, nome, senha, user_id } = body;

    // ── LOGIN ──
    if (action === "login") {
      if (!nome || !senha) return json({ error: "Nome e senha são obrigatórios" }, 400);

      const { data: user, error } = await supabase
        .from("usuarios_painel")
        .select("*")
        .eq("nome", nome.trim())
        .single();

      if (error || !user) return json({ error: "Usuário ou senha inválidos" }, 401);

      // senha_hash format: "salt:hash"
      const [salt, storedHash] = user.senha_hash.split(":");
      const valid = await verifyPassword(senha, storedHash, salt);
      if (!valid) return json({ error: "Usuário ou senha inválidos" }, 401);

      // Generate a simple session token
      const tokenData = new TextEncoder().encode(user.id + Date.now().toString() + crypto.randomUUID());
      const tokenHash = await crypto.subtle.digest("SHA-256", tokenData);
      const token = Array.from(new Uint8Array(tokenHash)).map(b => b.toString(16).padStart(2, "0")).join("");

      return json({
        success: true,
        token,
        user: { id: user.id, nome: user.nome, cargo: user.cargo },
      });
    }

    // ── LIST ──
    if (action === "list") {
      const { data: users, error } = await supabase
        .from("usuarios_painel")
        .select("id, nome, cargo, criado_em")
        .order("criado_em", { ascending: true });

      if (error) return json({ error: error.message }, 500);
      return json({ users: users || [] });
    }

    // ── CREATE ──
    if (action === "create") {
      if (!nome || !senha) return json({ error: "Nome e senha são obrigatórios" }, 400);
      if (nome.trim().length < 3) return json({ error: "Nome deve ter pelo menos 3 caracteres" }, 400);
      if (senha.length < 6) return json({ error: "Senha deve ter pelo menos 6 caracteres" }, 400);

      const { hash, salt } = await hashPassword(senha);
      const senhaHash = `${salt}:${hash}`;

      const { data: newUser, error } = await supabase
        .from("usuarios_painel")
        .insert({ nome: nome.trim(), senha_hash: senhaHash, cargo: body.cargo || "admin" })
        .select("id, nome, cargo")
        .single();

      if (error) {
        if (error.message.includes("unique") || error.message.includes("duplicate")) {
          return json({ error: "Usuário já existe" }, 409);
        }
        return json({ error: error.message }, 400);
      }

      return json({ success: true, user: newUser });
    }

    // ── DELETE ──
    if (action === "delete") {
      if (!user_id) return json({ error: "user_id é obrigatório" }, 400);

      const { error } = await supabase
        .from("usuarios_painel")
        .delete()
        .eq("id", user_id);

      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    // ── UPDATE NAME ──
    if (action === "update-name") {
      if (!user_id || !nome) return json({ error: "user_id e nome são obrigatórios" }, 400);
      if (nome.trim().length < 3) return json({ error: "Nome deve ter pelo menos 3 caracteres" }, 400);

      const { error } = await supabase
        .from("usuarios_painel")
        .update({ nome: nome.trim() })
        .eq("id", user_id);

      if (error) {
        if (error.message.includes("unique") || error.message.includes("duplicate")) {
          return json({ error: "Nome já está em uso" }, 409);
        }
        return json({ error: error.message }, 400);
      }

      return json({ success: true });
    }

    // ── RESET PASSWORD ──
    if (action === "reset-password") {
      if (!user_id || !senha) return json({ error: "user_id e senha são obrigatórios" }, 400);
      if (senha.length < 6) return json({ error: "Senha deve ter pelo menos 6 caracteres" }, 400);

      const { hash, salt } = await hashPassword(senha);
      const senhaHash = `${salt}:${hash}`;

      const { error } = await supabase
        .from("usuarios_painel")
        .update({ senha_hash: senhaHash })
        .eq("id", user_id);

      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    return json({ error: "Ação inválida. Use: login, list, create, delete, update-name, reset-password" }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
