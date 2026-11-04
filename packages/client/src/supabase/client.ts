// Supabase client
import { createClient, type SupabaseClient, type User, type Session } from "@supabase/supabase-js";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  storage?: StorageAdapter;
}

export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

const defaultStorage: StorageAdapter = {
  getItem: async (key: string) => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  },
};

let supabaseInstance: SupabaseClient | null = null;

export function createSupabaseClient(config: SupabaseConfig): SupabaseClient {
  const storage = config.storage ?? defaultStorage;
  
  return createClient(config.url, config.anonKey, {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    throw new Error("Supabase client not initialized. Call initSupabase() first.");
  }
  return supabaseInstance;
}

export function initSupabase(config: SupabaseConfig): SupabaseClient {
  supabaseInstance = createSupabaseClient(config);
  return supabaseInstance;
}

export function resetSupabase(): void {
  supabaseInstance = null;
}

// Auth helpers
export async function getCurrentUser(): Promise<User | null> {
  const client = getSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  return user;
}

export async function getCurrentSession(): Promise<Session | null> {
  const client = getSupabaseClient();
  const { data: { session } } = await client.auth.getSession();
  return session;
}

export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  const client = getSupabaseClient();
  return client.auth.onAuthStateChange(callback);
}