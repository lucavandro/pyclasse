import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
const root = new URL("../", import.meta.url);
const read = (p) => readFile(new URL(p, root), "utf8");

test("Docker usa Node 22, utente non privilegiato e porta minima", async () => {
  const [docker, compose] = await Promise.all([
    read("Dockerfile"),
    read("compose.yaml"),
  ]);
  assert.match(docker, /^FROM node:22-/m);
  assert.match(docker, /^USER node$/m);
  assert.match(compose, /"3000:3000"/);
  assert.doesNotMatch(compose, /privileged:\s*true/i);
});
test("Vite e SvelteKit espongono Cloudflare e variabili pubbliche", async () => {
  const [vite, svelte] = await Promise.all([
    read("vite.config.ts"),
    read("svelte.config.js"),
  ]);
  assert.match(vite, /sveltekit\(\)/);
  assert.match(vite, /NEXT_PUBLIC_/);
  assert.match(vite, /host: "0\.0\.0\.0"/);
  assert.match(svelte, /adapter-cloudflare/);
});
test("hook server applica intestazioni di sicurezza", async () => {
  const hook = await read("src/hooks.server.ts");
  for (const h of [
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
  ])
    assert.match(hook, new RegExp(h));
  assert.match(hook, /frame-ancestors 'none'/);
  assert.match(hook, /object-src 'none'/);
});
test("client Supabase usa solo chiave anon pubblica e URL Studio sicuro", async () => {
  const client = await read("src/lib/supabase.ts");
  assert.match(client, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.match(client, /parsed\.username/);
  assert.match(client, /parsed\.password/);
  assert.doesNotMatch(client, /service_role/i);
});
test("asset Pyodide e font sono self-hosted", async () => {
  for (const p of [
    "public/vendor/pyodide/pyodide.js",
    "public/vendor/pyodide/pyodide.asm.wasm",
    "public/vendor/pyodide/python_stdlib.zip",
    "public/fonts/geist-latin.woff2",
    "public/fonts/geist-mono-latin.woff2",
  ])
    await access(new URL(`../${p}`, import.meta.url));
  const css = await read("src/app.css");
  assert.doesNotMatch(css, /https?:\/\//);
});
test("PWA registra worker solo in produzione", async () => {
  const [layout, sw, manifest] = await Promise.all([
    read("src/routes/+layout.svelte"),
    read("public/sw.js"),
    read("public/manifest.webmanifest"),
  ]);
  assert.match(layout, /serviceWorker\.register\(["']\/sw\.js["']\)/);
  assert.match(layout, /import\.meta\.env\.PROD/);
  assert.match(sw, /request\.mode === "navigate"/);
  assert.equal(JSON.parse(manifest).display, "standalone");
});
test("CI esegue suite completa", async () => {
  const ci = await read(".github/workflows/ci.yml");
  assert.match(ci, /node-version: 22\.13\.0/);
  assert.match(ci, /npm ci/);
  assert.match(ci, /npm run check/);
  assert.match(ci, /npm run test:e2e/);
});
