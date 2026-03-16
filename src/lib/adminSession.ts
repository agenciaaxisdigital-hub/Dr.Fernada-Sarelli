const ADMIN_SESSION_KEY = "chama_admin_session";

export interface AdminSessionUser {
  id: string;
  username: string;
  cargo: string;
}

interface AdminFunctionOptions {
  formData?: FormData;
}

function getFunctionsBaseUrl() {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
}

function getBaseHeaders(): HeadersInit {
  return {
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  };
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export function getAdminSessionToken() {
  return localStorage.getItem(ADMIN_SESSION_KEY);
}

export function setAdminSessionToken(token: string) {
  localStorage.setItem(ADMIN_SESSION_KEY, token);
}

export function clearAdminSessionToken() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

export async function callAdminFunction<T = any>(
  functionName: string,
  body?: Record<string, unknown>,
  options?: AdminFunctionOptions,
): Promise<T> {
  const headers = new Headers(getBaseHeaders());
  const token = getAdminSessionToken();

  if (token) {
    headers.set("x-admin-session", token);
  }

  let response: Response;

  if (options?.formData) {
    response = await fetch(`${getFunctionsBaseUrl()}/${functionName}`, {
      method: "POST",
      headers,
      body: options.formData,
    });
  } else {
    headers.set("Content-Type", "application/json");
    response = await fetch(`${getFunctionsBaseUrl()}/${functionName}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
    });
  }

  const data = await parseResponse(response);

  if (!response.ok || (data && typeof data === "object" && "error" in data && data.error)) {
    const error = new Error(
      data && typeof data === "object" && "error" in data ? String(data.error) : `Erro ${response.status}`,
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return data as T;
}

export async function adminStatus() {
  return callAdminFunction<{ hasUsers: boolean }>("admin-auth", { action: "status" });
}

export async function adminLogin(username: string, password: string) {
  const data = await callAdminFunction<{ sessionToken: string; user: AdminSessionUser }>("admin-auth", {
    action: "login",
    username,
    password,
  });
  setAdminSessionToken(data.sessionToken);
  return data.user;
}

export async function adminBootstrap(username: string, password: string) {
  const data = await callAdminFunction<{ sessionToken: string; user: AdminSessionUser }>("admin-auth", {
    action: "bootstrap",
    username,
    password,
  });
  setAdminSessionToken(data.sessionToken);
  return data.user;
}

export async function adminVerify() {
  const data = await callAdminFunction<{ authenticated: boolean; user?: AdminSessionUser }>("admin-auth", {
    action: "verify",
  });

  if (!data?.authenticated || !data.user) {
    throw new Error("Sessão inválida");
  }

  return data.user;
}

export async function adminLogout() {
  try {
    await callAdminFunction("admin-auth", { action: "logout" });
  } finally {
    clearAdminSessionToken();
  }
}
