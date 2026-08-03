import { createClient } from "@supabase/supabase-js";

const useLocalSupabase = import.meta.env.DEV;

// Supabase CLI uses a fixed public URL and anon key for local development.
// The fallback is deliberately restricted to development builds: deployed
// production instances must provide their own values and never receive a
// privileged key. The shared SSR/client condition prevents hydration drift.
const url =
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  (useLocalSupabase ? "http://127.0.0.1:54321" : undefined);
const key =
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (useLocalSupabase
    ? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
    : undefined);

export const supabase = url && key ? createClient(url, key) : null;

function safeStudioUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    const localHttp =
      parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(parsed.hostname);
    if (
      (parsed.protocol !== "https:" && !localHttp) ||
      parsed.username ||
      parsed.password
    )
      return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export const supabaseStudioUrl = safeStudioUrl(
  import.meta.env.NEXT_PUBLIC_SUPABASE_STUDIO_URL ||
    (useLocalSupabase ? "http://127.0.0.1:54323/project/default" : undefined),
);

export async function signInWithGoogle() {
  if (!supabase)
    throw new Error(
      "Configura le variabili Supabase prima di attivare il login.",
    );
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${location.origin}/auth/callback` },
  });
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
