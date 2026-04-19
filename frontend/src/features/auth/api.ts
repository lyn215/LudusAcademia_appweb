import { supabase } from "../../lib/supabaseClient";
import type { SessionResponse, LoginInput, RegisterResponse } from "../../types/contracts";

export async function getSession(): Promise<SessionResponse> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { authenticated: false, user: null };
  return {
    authenticated: true,
    user: {
      id:    data.session.user.id,
      email: data.session.user.email ?? null,
    },
  };
}

export async function login(data: LoginInput): Promise<SessionResponse> {
  const { data: result, error } = await supabase.auth.signInWithPassword({
    email:    data.email,
    password: data.password,
  });
  if (error) throw new Error(error.message);
  return {
    authenticated: true,
    user: {
      id:    result.user.id,
      email: result.user.email ?? null,
    },
  };
}

export async function register(data: LoginInput): Promise<RegisterResponse> {
  const { data: result, error } = await supabase.auth.signUp({
    email:    data.email,
    password: data.password,
  });
  if (error) throw new Error(error.message);

  const needsConfirmation = !result.session;
  return {
    authenticated:               !needsConfirmation,
    email_confirmation_required: needsConfirmation,
    user: {
      id:    result.user?.id    ?? null,
      email: result.user?.email ?? null,
    },
  };
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}
