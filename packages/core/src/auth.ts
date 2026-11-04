// Auth types and helpers
import { User, AuthState, SignUpRequest, SignInRequest, UpdateProfileRequest } from "@skillhiive/contracts";

export type { User, AuthState, SignUpRequest, SignInRequest, UpdateProfileRequest };

export interface AuthProvider {
  signUp: (data: SignUpRequest) => Promise<{ user: User | null; error: Error | null }>;
  signIn: (data: SignInRequest) => Promise<{ user: User | null; error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  getSession: () => Promise<AuthState["session"]>;
  getUser: () => Promise<User | null>;
  onAuthStateChange: (callback: (state: AuthState) => void) => () => void;
  updateProfile: (data: UpdateProfileRequest) => Promise<{ user: User | null; error: Error | null }>;
}

// Re-export from client for convenience
export { initSupabase, getSupabaseClient, getCurrentUser, getCurrentSession, onAuthStateChange } from "@skillhiive/client";