import { createClient } from "@supabase/supabase-js";

const local = import.meta.env.DEV;
const url =
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  (local ? "http://127.0.0.1:54321" : undefined);
const key =
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (local
    ? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYXNlLWRlbW8iLCJyb2xlIjoiYW5vbiIsImV4cCI6MTk4MzgxMjk5Nn0.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
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
      (!localHttp && parsed.protocol !== "https:") ||
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
    (local ? "http://127.0.0.1:54323/project/default" : undefined),
);

export async function signInWithGoogle() {
  if (!supabase)
    throw new Error("Configura Supabase prima di attivare il login.");
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${location.origin}/auth/callback` },
  });
}
