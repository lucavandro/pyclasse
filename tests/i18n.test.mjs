import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? sourceFiles(target) : [target];
    }),
  );
  return nested.flat();
}

test("cataloghi Paraglide completi e coerenti con le lingue configurate", async () => {
  const settings = JSON.parse(await read("project.inlang/settings.json"));
  const messageFiles = (await readdir(path.join(root, "messages")))
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.replace(/\.json$/, ""))
    .sort();
  assert.equal(settings.baseLocale, "it");
  assert.deepEqual([...settings.locales].sort(), messageFiles);

  const catalogs = await Promise.all(
    settings.locales.map(async (locale) => {
      const catalog = JSON.parse(await read(`messages/${locale}.json`));
      delete catalog.$schema;
      return [locale, Object.keys(catalog).sort()];
    }),
  );
  for (const [locale, keys] of catalogs.slice(1))
    assert.deepEqual(
      keys,
      catalogs[0][1],
      `chiavi mancanti nel catalogo ${locale}`,
    );
});

test("SvelteKit usa middleware, documento e selettore Paraglide", async () => {
  const [vite, hooks, app, selector] = await Promise.all([
    read("vite.config.ts"),
    read("src/hooks.server.ts"),
    read("src/app.html"),
    read("src/lib/LocaleSelector.svelte"),
  ]);
  assert.match(vite, /paraglideVitePlugin/);
  assert.match(vite, /"cookie", "preferredLanguage", "baseLocale"/);
  assert.match(hooks, /paraglideMiddleware/);
  assert.match(app, /lang="%lang%" dir="%dir%"/);
  assert.match(selector, /setLocale/);
  assert.match(selector, /Intl\.DisplayNames/);
});

test("il frontend non conserva rilevamento o formattazione locale hard-coded", async () => {
  const files = (await sourceFiles(path.join(root, "src"))).filter(
    (file) =>
      /\.(svelte|ts)$/.test(file) &&
      !file.includes(`${path.sep}paraglide${path.sep}`),
  );
  const source = (
    await Promise.all(files.map((file) => readFile(file, "utf8")))
  ).join("\n");
  assert.doesNotMatch(source, /locale\s*===\s*["'](?:it|en)["']/);
  assert.doesNotMatch(source, /toLocale(?:DateString|String)\(["']it-IT["']/);
  assert.doesNotMatch(source, /login_(?:title|subtitle)_(?:it|en)/);
});
