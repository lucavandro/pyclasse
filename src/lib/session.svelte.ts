import type { User } from "@supabase/supabase-js";
import type { Profile } from "$lib/types";
import { supabase } from "$lib/supabase";

export const session = $state({
  ready: false,
  user: null as User | null,
  profile: null as Profile | null,
  error: "",
});

export async function loadProfile(user: User) {
  if (!supabase) return;
  const result = await supabase
    .from("profiles")
    .select(
      "id,email,full_name,role,last_seen_at,external_ai_enabled,external_ai_consented_at",
    )
    .eq("id", user.id)
    .single();
  if (result.error) throw result.error;
  session.profile = result.data as Profile;
  void supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", user.id);
}

export async function initializeSession() {
  if (!supabase) {
    session.ready = true;
    return;
  }
  try {
    const { data } = await supabase.auth.getUser();
    session.user = data.user;
    if (data.user) await loadProfile(data.user);
  } catch (cause) {
    session.error = cause instanceof Error ? cause.message : String(cause);
  } finally {
    session.ready = true;
  }
  return supabase.auth.onAuthStateChange(async (_event, auth) => {
    session.user = auth?.user ?? null;
    session.profile = null;
    if (auth?.user) await loadProfile(auth.user);
  });
}
