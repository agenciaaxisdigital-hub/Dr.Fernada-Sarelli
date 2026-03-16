import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-session",
};

const encoder = new TextEncoder();
const PASSWORD_ITERATIONS = 210000;
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14;

export function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceKey);
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function parseJsonBody(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export function normalizeUsername(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

export function validateUsername(username: string) {
  if (username.length < 3 || username.length > 30) {
    return "Usuário deve ter entre 3 e 30 caracteres.";
  }

  if (!/^[a-z0-9._-]+$/.test(username)) {
    return "Use apenas letras minúsculas, números, ponto, traço ou underline.";
  }

  return null;
}

export function validatePassword(password: string) {
  if (password.length < 6 || password.length > 128) {
    return "Senha deve ter entre 6 e 128 caracteres.";
  }

  return null;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string) {
  const pairs = hex.match(/.{1,2}/g) ?? [];
  return new Uint8Array(pairs.map((pair) => Number.parseInt(pair, 16)));
}

async function pbkdf2(password: string, saltHex: string, iterations: number) {
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: hexToBytes(saltHex),
      iterations,
    },
    baseKey,
    256,
  );

  return bytesToHex(new Uint8Array(derived));
}

function timingSafeEqual(a: string, b: string) {
  const maxLength = Math.max(a.length, b.length);
  let mismatch = a.length === b.length ? 0 : 1;

  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }

  return mismatch === 0;
}

export async function hashPassword(password: string) {
  const saltHex = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  const digest = await pbkdf2(password, saltHex, PASSWORD_ITERATIONS);
  return `pbkdf2_sha256$${PASSWORD_ITERATIONS}$${saltHex}$${digest}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, iterationsText, saltHex, expectedDigest] = storedHash.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterationsText || !saltHex || !expectedDigest) {
    return false;
  }

  const iterations = Number.parseInt(iterationsText, 10);
  if (!Number.isFinite(iterations) || iterations < 100000) {
    return false;
  }

  const actualDigest = await pbkdf2(password, saltHex, iterations);
  return timingSafeEqual(actualDigest, expectedDigest);
}

export function generateSessionToken() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashSessionToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return bytesToHex(new Uint8Array(digest));
}

export async function createAdminSession(supabase: ReturnType<typeof createServiceClient>, adminUserId: string) {
  const rawToken = generateSessionToken();
  const tokenHash = await hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  const { error } = await supabase.from("admin_sessions").insert({
    admin_user_id: adminUserId,
    session_token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (error) {
    throw error;
  }

  return rawToken;
}

export async function requireAdminSession(req: Request, supabase: ReturnType<typeof createServiceClient>) {
  const headerToken = req.headers.get("x-admin-session") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!headerToken) {
    throw new Error("Sessão administrativa obrigatória.");
  }

  const tokenHash = await hashSessionToken(headerToken);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("admin_sessions")
    .select("id, admin_user_id, expires_at, admin_users(id, username, cargo, is_active)")
    .eq("session_token_hash", tokenHash)
    .gt("expires_at", now)
    .maybeSingle();

  if (error || !data || !data.admin_users || (Array.isArray(data.admin_users) ? data.admin_users.length === 0 : !data.admin_users.is_active)) {
    throw new Error("Sessão inválida ou expirada.");
  }

  const adminUser = Array.isArray(data.admin_users) ? data.admin_users[0] : data.admin_users;

  await supabase
    .from("admin_sessions")
    .update({ last_seen_at: now })
    .eq("id", data.id);

  return {
    sessionId: data.id,
    tokenHash,
    user: {
      id: adminUser.id,
      username: adminUser.username,
      cargo: adminUser.cargo,
      is_active: adminUser.is_active,
    },
  };
}

export function assertSuperAdmin(user: { cargo: string }) {
  if (user.cargo !== "super_admin") {
    throw new Error("Apenas super admin pode executar esta ação.");
  }
}
