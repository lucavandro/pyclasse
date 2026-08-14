import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { paraglideMiddleware } from "$lib/paraglide/server";
import { getTextDirection } from "$lib/paraglide/runtime";

const local = ["http://127.0.0.1:54321", "ws://127.0.0.1:54321"];

const paraglideHandle: Handle = ({ event, resolve }) =>
  paraglideMiddleware(
    event.request,
    ({ request: localizedRequest, locale }) => {
      event.request = localizedRequest;
      return resolve(event, {
        transformPageChunk: ({ html }) =>
          html
            .replace("%lang%", locale)
            .replace("%dir%", getTextDirection(locale)),
      });
    },
  );

const securityHandle: Handle = async ({ event, resolve }) => {
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
    : "";
  const socket = origin.replace(/^http/, "ws");
  const connect = [
    "'self'",
    origin,
    socket,
    ...(process.env.NODE_ENV === "development" ? local : []),
  ]
    .filter(Boolean)
    .join(" ");
  const response = await resolve(event);
  response.headers.set(
    "Content-Security-Policy",
    `default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.puter.com; worker-src 'self' blob:; connect-src ${connect} https://api.puter.com wss://api.puter.com; object-src 'none'`,
  );
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  return response;
};

export const handle = sequence(paraglideHandle, securityHandle);
