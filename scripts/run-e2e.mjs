import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const supabaseCli = fileURLToPath(
  new URL("../node_modules/supabase/dist/supabase.js", import.meta.url),
);
const vinextCli = fileURLToPath(
  new URL("../node_modules/vinext/dist/cli.js", import.meta.url),
);
const playwrightCli = fileURLToPath(
  new URL("../node_modules/@playwright/test/cli.js", import.meta.url),
);
const runNode = (script, args, options = {}) =>
  execFileSync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    ...options,
  });

function parseStatus(raw) {
  const values = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(?:"([^"]*)"|(.*))$/);
    if (match) values[match[1]] = match[2] ?? match[3];
  }
  return values;
}

async function waitFor(url, child) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null)
      throw new Error(
        `Il server E2E è terminato con codice ${child.exitCode}.`,
      );
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* non ancora pronto */
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Il server E2E non risponde su ${url}.`);
}

async function waitForSupabase(url, anonKey) {
  let lastResult = "nessuna risposta";
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${url}/auth/v1/settings`, {
        headers: { apikey: anonKey },
      });
      lastResult = `HTTP ${response.status}`;
      if (response.status < 500) return;
    } catch (error) {
      lastResult = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(
    `Supabase Auth non è diventato pronto entro 60 secondi (${lastResult}).`,
  );
}

runNode(supabaseCli, ["db", "reset", "--local", "--agent", "no"], {
  stdio: "inherit",
});
const status = parseStatus(
  runNode(supabaseCli, ["status", "--output", "env", "--agent", "no"]),
);
if (!status.API_URL || !status.ANON_KEY)
  throw new Error("Supabase locale non ha restituito API_URL e ANON_KEY.");
await waitForSupabase(status.API_URL, status.ANON_KEY);

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3100";
const server = spawn(
  process.execPath,
  [vinextCli, "dev", "--hostname", "127.0.0.1", "--port", "3100"],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
      NEXT_PUBLIC_AUTH_EMAIL_OTP: "true",
      NEXT_PUBLIC_AUTH_GOOGLE: "true",
    },
    stdio: "inherit",
  },
);
let exitCode = 1;
try {
  await waitFor(baseURL, server);
  const tests = spawn(process.execPath, [playwrightCli, "test"], {
    cwd: process.cwd(),
    env: { ...process.env, E2E_BASE_URL: baseURL },
    stdio: "inherit",
  });
  exitCode = await new Promise((resolve) =>
    tests.on("exit", (code) => resolve(code ?? 1)),
  );
} finally {
  if (process.platform === "win32")
    spawn("taskkill", ["/pid", String(server.pid), "/t", "/f"], {
      stdio: "ignore",
    });
  else server.kill("SIGTERM");
}
process.exitCode = exitCode;
