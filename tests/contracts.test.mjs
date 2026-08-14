import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const schema = async () =>
  (
    await read("supabase/migrations/20260801000000_initial_schema.sql")
  ).replaceAll('"', "");

test("SvelteKit separa le funzionalità in rotte autonome", async () => {
  const expected = [
    "src/routes/+page.svelte",
    "src/routes/classes/+page.svelte",
    "src/routes/exercises/+page.svelte",
    "src/routes/exercises/[id]/editor/+page.svelte",
    "src/routes/reports/valutazioni/+page.svelte",
    "src/routes/monitor/+page.svelte",
    "src/routes/code-now/+page.svelte",
    "src/routes/settings/+page.svelte",
  ];
  for (const path of expected)
    await access(new URL(`../${path}`, import.meta.url));
  const pkg = JSON.parse(await read("package.json"));
  assert.ok(pkg.devDependencies.svelte);
  assert.ok(pkg.devDependencies["@sveltejs/kit"]);
  assert.equal(pkg.dependencies.react, undefined);
  assert.equal(pkg.dependencies.next, undefined);
  assert.equal(pkg.dependencies["material-symbols"], undefined);
});

test("schema Supabase abilita RLS e protegge bozze e prerequisiti", async () => {
  const sql = await schema();
  for (const table of [
    "profiles",
    "app_settings",
    "classes",
    "class_members",
    "exercises",
    "class_assignments",
    "tests",
    "submissions",
    "editor_sessions",
  ])
    assert.match(
      sql,
      new RegExp(
        `alter table public\\.${table} enable row level security`,
        "i",
      ),
    );
  assert.match(sql, /students create own drafts[\s\S]*status = 'draft'/i);
  assert.match(sql, /student_can_submit_to_assignment/i);
  assert.match(
    sql,
    /alter publication supabase_realtime add table (?:only )?public\.submissions/i,
  );
});

test("editor applica blocco clipboard, watchdog e Pyodide self-hosted", async () => {
  const [editor, workbench, codeNow, worker] = await Promise.all([
    read("src/lib/PythonEditor.svelte"),
    read("src/routes/exercises/[id]/editor/+page.svelte"),
    read("src/routes/code-now/+page.svelte"),
    read("public/pyodide-worker.js"),
  ]);
  assert.match(editor, /copy[\s\S]*preventDefault/);
  assert.match(editor, /cut[\s\S]*preventDefault/);
  assert.match(editor, /paste[\s\S]*preventDefault/);
  assert.match(editor, /python\(\)/);
  assert.match(editor, /HighlightStyle\.define/);
  assert.match(editor, /syntaxHighlighting\(pythonHighlightStyle\)/);
  assert.match(editor, /tags\.keyword/);
  assert.match(editor, /tags\.function/);
  assert.match(editor, /tags\.string/);
  assert.match(editor, /tags\.comment/);
  assert.match(workbench, /8000/);
  assert.match(codeNow, /8000/);
  assert.match(worker, /\/vendor\/pyodide\//);
  assert.doesNotMatch(worker, /cdn\.jsdelivr\.net/);
});

test("Markdown rifiuta HTML grezzo e isola link esterni", async () => {
  const markdown = await read("src/lib/Markdown.svelte");
  assert.match(markdown, /renderer\.html/);
  assert.match(markdown, /escape\(text\)/);
  assert.match(markdown, /noopener noreferrer/);
  assert.match(markdown, /protocol\s*===\s*["']https:/);
});

test("dati sono letti da Supabase per dominio e mai incorporati nella UI", async () => {
  const data = await read("src/lib/data.ts");
  for (const table of [
    "profiles",
    "classes",
    "class_members",
    "exercises",
    "class_assignments",
    "tests",
    "submissions",
    "editor_sessions",
  ])
    assert.match(data, new RegExp(`\\("${table}"`));
  const routes = await Promise.all([
    read("src/routes/+page.svelte"),
    read("src/routes/classes/+page.svelte"),
    read("src/routes/exercises/+page.svelte"),
  ]);
  assert.doesNotMatch(
    routes.join("\n"),
    /Giulia Bianchi|Marco Rossi|Liceo Galilei/i,
  );
});

test("autenticazione supporta password, OTP e Google", async () => {
  const [auth, client] = await Promise.all([
    read("src/lib/Auth.svelte"),
    read("src/lib/supabase.ts"),
  ]);
  assert.match(auth, /signInWithPassword/);
  assert.match(auth, /signInWithOtp/);
  assert.match(auth, /verifyOtp/);
  assert.match(auth, /get_public_branding/);
  assert.equal(
    auth.match(/src="\/favicon\.svg"/g)?.length,
    1,
    "il login mostra il logo una sola volta",
  );
  assert.match(auth, /class="language-row"/);
  assert.doesNotMatch(auth, /\.language\s*\{[\s\S]*position:\s*absolute/);
  assert.match(auth, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(auth, /class="auth-form-panel"/);
  assert.match(client, /provider: "google"/);
});

test("privacy, monitoraggio e presenza restano espliciti", async () => {
  const [settings, monitor, editor, presenceMigration] = await Promise.all([
    read("src/routes/settings/+page.svelte"),
    read("src/routes/monitor/+page.svelte"),
    read("src/routes/exercises/[id]/editor/+page.svelte"),
    read("supabase/migrations/20260813000000_touch_editor_session.sql"),
  ]);
  assert.match(settings, /external_ai_consented_at/);
  assert.match(settings, /consenso è facoltativo/);
  assert.match(monitor, /status\s*===\s*["']draft/);
  assert.match(editor, /touch_editor_session/);
  assert.match(presenceMigration, /active_until/);
  assert.match(presenceMigration, /interval '25 seconds'/);
  assert.doesNotMatch(settings, /localStorage/);
});

test("sistema visivo usa palette del logo e CSS locale alle rotte", async () => {
  const [css, shell, reportNav, icon] = await Promise.all([
    read("src/app.css"),
    read("src/lib/Shell.svelte"),
    read("src/lib/ReportNav.svelte"),
    read("src/lib/Icon.svelte"),
  ]);
  for (const token of [
    "--color-background:",
    "--color-surface:",
    "--color-foreground:",
    "--color-primary:",
    "--color-primary-strong:",
    "--color-primary-soft:",
    "--focus-ring:",
    "--shadow-md:",
    "--font-ui:",
    "--space-4:",
    "--radius-md:",
  ])
    assert.match(css, new RegExp(token));
  assert.match(css, /#2e9eff/i);
  assert.match(css, /#0c79d8/i);
  assert.match(css, /#68c4ff/i);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(shell, /aria-label="Menu applicazione"/);
  assert.match(shell, /nav-icon/);
  assert.match(icon, /aria-hidden="true"/);
  assert.match(reportNav, /role="tablist"/);
  assert.match(reportNav, /aria-selected/);
  const route = await read("src/routes/code-now/+page.svelte");
  assert.match(route, /<style>/);
});
