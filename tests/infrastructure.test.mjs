import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Docker usa Node 22 e un utente non privilegiato", async () => {
  const dockerfile = await read("Dockerfile");
  assert.match(dockerfile, /^FROM node:22-/m);
  assert.match(
    dockerfile,
    /RUN npm ci[\s\S]*chown -R node:node \/app\/node_modules \/app\/public\/vendor \/app\/\.wrangler/,
  );
  assert.match(dockerfile, /^USER node$/m);
  assert.match(dockerfile, /--hostname", "0\.0\.0\.0"/);
});

test("Compose espone soltanto l'app e isola node_modules", async () => {
  const compose = await read("compose.yaml");
  assert.match(compose, /"3000:3000"/);
  assert.match(compose, /node_modules:\/app\/node_modules/);
  assert.match(compose, /required: false/);
  assert.doesNotMatch(compose, /privileged:\s*true/i);
});

test("Compose configura automaticamente il client Supabase locale", async () => {
  const compose = await read("compose.yaml");
  assert.match(
    compose,
    /NEXT_PUBLIC_SUPABASE_URL:.*http:\/\/127\.0\.0\.1:54321/,
  );
  assert.match(compose, /NEXT_PUBLIC_SUPABASE_ANON_KEY:.*eyJhbGci/);
  assert.doesNotMatch(compose, /NEXT_PUBLIC_AUTH_EMAIL_OTP:/);
  assert.doesNotMatch(compose, /NEXT_PUBLIC_AUTH_GOOGLE:/);

  const client = await read("lib/supabase.ts");
  assert.match(client, /useLocalSupabase = import\.meta\.env\.DEV/);
  assert.match(client, /useLocalSupabase \? "http:\/\/127\.0\.0\.1:54321"/);
});

test("il deploy incompleto mostra istruzioni di installazione sicure", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /Completa la configurazione di Supabase/);
  assert.match(page, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(page, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.match(page, /npx supabase db push/);
  assert.match(page, /service_role/);
});

test("Vite ascolta su tutte le interfacce per funzionare nel container", async () => {
  const config = await read("vite.config.ts");
  assert.match(config, /server:\s*\{[\s\S]*host: "0\.0\.0\.0"/);
  assert.match(
    config,
    /define:\s*\{[\s\S]*process\.env\.NEXT_PUBLIC_SUPABASE_URL/,
  );
  assert.match(config, /process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY/);
});

test("le risposte applicano intestazioni di sicurezza", async () => {
  const config = await read("next.config.ts");
  assert.match(config, /env:\s*\{[\s\S]*NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(config, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  for (const header of [
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
  ])
    assert.match(config, new RegExp(header));
  assert.match(config, /frame-ancestors 'none'/);
  assert.match(config, /object-src 'none'/);
});

test("le variabili pubbliche di esempio non contengono segreti", async () => {
  const env = await read(".env.example");
  assert.match(env, /NEXT_PUBLIC_SUPABASE_URL=/);
  assert.match(env, /NEXT_PUBLIC_SUPABASE_ANON_KEY=/);
  assert.match(env, /NEXT_PUBLIC_SUPABASE_STUDIO_URL=/);
  assert.match(env, /NEXT_PUBLIC_AUTH_EMAIL_OTP=false/);
  assert.match(env, /NEXT_PUBLIC_AUTH_GOOGLE=false/);
  assert.doesNotMatch(env, /service_role|client_secret|private_key/i);
});

test("il link Supabase Studio è opzionale e non espone credenziali", async () => {
  const [client, page, docs] = await Promise.all([
    read("lib/supabase.ts"),
    read("app/page.tsx"),
    read("docs/INSTALLATION_AND_DEPLOYMENT.md"),
  ]);
  assert.match(client, /NEXT_PUBLIC_SUPABASE_STUDIO_URL/);
  assert.match(client, /parsed\.username/);
  assert.match(client, /parsed\.password/);
  assert.match(client, /parsed\.protocol !== "https:"/);
  assert.match(page, /data\.profile\.role === "teacher"/);
  assert.match(page, /rel="noopener noreferrer"/);
  assert.match(docs, /non contiene token, password o chiavi/i);
});

test("la configurazione Supabase limita righe e redirect locali", async () => {
  const config = await read("supabase/config.toml");
  assert.match(config, /^project_id = "PyClassroom"$/m);
  assert.match(config, /max_rows = 1000/);
  assert.match(config, /minimum_password_length = 8/);
  assert.match(
    config,
    /additional_redirect_urls = \[[^\]]*"http:\/\/localhost:3000"[^\]]*"http:\/\/localhost:3000\/auth\/callback"[^\]]*\]/,
  );
  assert.match(config, /\[db\.migrations\][\s\S]*enabled = true/);
});

test("lo sviluppo locale include un dataset completo e credenziali documentate", async () => {
  const [seed, documentation] = await Promise.all([
    read("supabase/seed.sql"),
    read("docs/LOCAL_DEVELOPMENT_DATA.md"),
  ]);
  assert.match(seed, /teacher@pyclasse\.test/);
  for (let index = 1; index <= 5; index += 1) {
    assert.match(seed, new RegExp(`student${index}@pyclasse\\.test`));
  }
  for (const table of [
    "auth.users",
    "auth.identities",
    "public.classes",
    "public.class_members",
    "public.exercises",
    "public.tests",
    "public.class_assignments",
    "public.submissions",
  ]) {
    assert.match(
      seed,
      new RegExp(`insert into ${table.replace(".", "\\.")}`, "i"),
    );
  }
  assert.match(documentation, /Teacher2026!/);
  assert.match(documentation, /Student2026!/);
  assert.match(documentation, /solo per Supabase locale/i);
});

test("Supabase include test pgTAP per schema, RLS e permessi", async () => {
  const sql = await read("supabase/tests/database.test.sql");
  assert.match(sql, /select plan\(45\)/i);
  assert.match(sql, /relrowsecurity/i);
  assert.match(sql, /not has_function_privilege\('anon'/i);
});

test("gli asset Pyodide self-hosted sono generati dal postinstall", async () => {
  for (const asset of [
    "pyodide.js",
    "pyodide.asm.js",
    "pyodide.asm.wasm",
    "pyodide-lock.json",
    "python_stdlib.zip",
  ]) {
    await access(new URL(`../public/vendor/pyodide/${asset}`, import.meta.url));
  }
});

test("CI esegue installazione riproducibile e suite completa", async () => {
  const workflow = await read(".github/workflows/ci.yml");
  assert.match(workflow, /node-version: 22\.13\.0/);
  assert.match(workflow, /run: npm ci/);
  assert.match(workflow, /run: npm run check/);
  assert.match(workflow, /playwright install --with-deps chromium/);
  assert.match(workflow, /run: npm run test:e2e/);
  assert.match(workflow, /permissions:[\s\S]*contents: read/);
});

test("la suite E2E copre dati reali, ruoli e consenso privacy", async () => {
  const [config, suite, runner] = await Promise.all([
    read("playwright.config.ts"),
    read("e2e/application.spec.ts"),
    read("scripts/run-e2e.mjs"),
  ]);
  assert.match(config, /projects:[\s\S]*chromium/);
  assert.match(suite, /senza dati dimostrativi/i);
  assert.match(suite, /docente crea classe ed esercizio persistenti/i);
  assert.match(suite, /studente si iscrive, esegue i test e consegna/i);
  assert.match(suite, /consenso IA viene persistito nel database/i);
  assert.match(runner, /supabase[\s\S]*db[\s\S]*reset/);
});

test("documentazione pubblica include sicurezza, privacy e licenza", async () => {
  const readme = await read("README.md");
  for (const path of [
    "SECURITY.md",
    "LICENSE",
    "docs/PRIVACY_AND_DATA_PROTECTION.md",
    "docs/INSTALLATION_AND_DEPLOYMENT.md",
    "docs/STYLE_GUIDE.md",
  ]) {
    assert.match(
      readme,
      new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
  const style = await read("docs/STYLE_GUIDE.md");
  for (const color of [
    "#282a36",
    "#44475a",
    "#f8f8f2",
    "#8be9fd",
    "#50fa7b",
    "#ff79c6",
    "#bd93f9",
    "#ff5555",
  ])
    assert.match(style, new RegExp(color));
});
