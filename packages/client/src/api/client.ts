// API client
import { getSupabaseClient } from "../supabase/client";

export interface APIConfig {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
}

let apiConfig: APIConfig | null = null;

export function initAPI(config: APIConfig): void {
  apiConfig = config;
}

export function getAPIConfig(): APIConfig {
  if (!apiConfig) {
    throw new Error("API not initialized. Call initAPI() first.");
  }
  return apiConfig;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const config = getAPIConfig();
  const token = await config.getAccessToken();
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
}

interface APIErrorResponse {
  error?: string;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config = getAPIConfig();
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${config.baseUrl}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" })) as APIErrorResponse;
    throw new Error(error.error ?? `HTTP ${response.status}`);
  }
  
  if (response.status === 204) {
    return undefined as T;
  }
  
  return response.json() as Promise<T>;
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: "GET" });
}

export async function apiPost<T>(endpoint: string, body: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiPut<T>(endpoint: string, body: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function apiPatch<T>(endpoint: string, body: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: "DELETE" });
}

// Supabase-aware API request (uses Supabase session)
export async function supabaseApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const client = getSupabaseClient();
  const { data: { session } } = await client.auth.getSession();
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers as Record<string, string>,
  };
  
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  
  const config = getAPIConfig();
  const response = await fetch(`${config.baseUrl}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" })) as APIErrorResponse;
    throw new Error(error.error ?? `HTTP ${response.status}`);
  }
  
  if (response.status === 204) {
    return undefined as T;
  }
  
  return response.json() as Promise<T>;
}