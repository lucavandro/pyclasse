import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.TEST_BASE_URL;
const requestTimeout = Number(process.env.SMOKE_REQUEST_TIMEOUT_MS || 60_000);
const live = {
  skip: baseUrl ? false : "impostare TEST_BASE_URL per lo smoke test HTTP",
};

async function request(path) {
  return fetch(new URL(path, baseUrl), {
    // The Docker smoke job starts Vite from a clean checkout. Its first request
    // to each dynamic route includes compilation and can exceed 15 seconds on a
    // shared CI runner without indicating an unhealthy application.
    signal: AbortSignal.timeout(requestTimeout),
  });
}

test("tutte le rotte pubbliche rispondono dal container", live, async () => {
  for (const path of [
    "/",
    "/classes",
    "/classes/1",
    "/classes/new",
    "/exercises",
    "/exercises/1",
    "/exercises/new",
    "/reports",
    "/settings",
  ]) {
    const response = await request(path);
    assert.equal(
      response.status,
      200,
      `${path} ha restituito ${response.status}`,
    );
    assert.match(await response.text(), /PyClasse/i);
  }
});

test(
  "worker e runtime Python sono serviti dalla stessa origine",
  live,
  async () => {
    for (const path of [
      "/pyodide-worker.js",
      "/vendor/pyodide/pyodide.js",
      "/vendor/pyodide/pyodide.asm.mjs",
      "/vendor/pyodide/pyodide.asm.wasm",
      "/vendor/pyodide/python_stdlib.zip",
      "/manifest.webmanifest",
      "/sw.js",
      "/offline.html",
      "/pwa-icon-192.png",
      "/pwa-icon-512.png",
    ]) {
      const response = await request(path);
      assert.equal(
        response.status,
        200,
        `${path} ha restituito ${response.status}`,
      );
      assert.ok(Number(response.headers.get("content-length") || 1) > 0);
    }
  },
);

test(
  "la pagina non carica CDN o IA esterna per impostazione predefinita",
  live,
  async () => {
    const html = await (await request("/")).text();
    assert.doesNotMatch(
      html,
      /fonts\.googleapis\.com|cdn\.jsdelivr\.net|js\.puter\.com/i,
    );
  },
);

test("le intestazioni di sicurezza sono presenti", live, async () => {
  const response = await request("/");
  assert.match(
    response.headers.get("content-security-policy") || "",
    /frame-ancestors 'none'/,
  );
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(
    response.headers.get("referrer-policy"),
    "strict-origin-when-cross-origin",
  );
});
