import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const readSchema = async () =>
  (
    await read("supabase/migrations/20260801000000_initial_schema.sql")
  ).replaceAll('"', "");

test("schema Supabase separa esercizi e assegnazioni e abilita RLS", async () => {
  const sql = await readSchema();
  for (const table of [
    "profiles",
    "app_settings",
    "classes",
    "class_members",
    "exercises",
    "class_assignments",
    "tests",
    "submissions",
  ]) {
    assert.match(
      sql,
      new RegExp(
        `alter table public\\.${table} enable row level security`,
        "i",
      ),
    );
  }
  assert.match(sql, /class_assignment_id uuid not null/i);
  assert.match(sql, /deadline timestamp with time zone/i);
  assert.match(
    sql,
    /class_assignments_exercise_id_class_id_key[\s\S]*unique \(exercise_id, class_id\)/i,
  );
  assert.match(sql, /profiles_single_teacher_idx/i);
  assert.match(
    sql,
    /students create own drafts[\s\S]*status = 'draft'[\s\S]*score is null/i,
  );
  assert.match(sql, /published_at is not null/i);
  assert.doesNotMatch(sql, /students manage own submissions/i);
});

test("editor applica watchdog e blocco clipboard", async () => {
  const [page, editor, worker] = await Promise.all([
    read("app/page.tsx"),
    read("app/python-editor.tsx"),
    read("public/pyodide-worker.js"),
  ]);
  assert.match(editor, /copy\([^)]*\).*preventDefault/s);
  assert.match(editor, /cut\([^)]*\).*preventDefault/s);
  assert.match(editor, /paste\([^)]*\).*preventDefault/s);
  assert.match(page, /8000/g);
  assert.match(page, /worker\.terminate\(\)/);
  assert.match(worker, /output\.length < 50000/i);
  assert.match(worker, /output limitato/i);
  assert.doesNotMatch(worker, /cdn\.jsdelivr\.net/i);
  assert.match(worker, /\/vendor\/pyodide\//i);
  assert.match(page, /type: "module"/);
});

test("feedback IA vieta soluzioni dirette e dispone di fallback", async () => {
  const ai = await read("lib/ai-feedback.ts");
  assert.match(ai, /non fornire codice/i);
  assert.match(ai, /containsDirectSolution/);
  assert.match(ai, /catch \{/);
  assert.match(ai, /generateExerciseWithAi/);
  assert.match(ai, /if \(!allowExternalAi\) return fallback/);
});

test("privacy by default evita terze parti automatiche e persiste il consenso", async () => {
  const [layout, page] = await Promise.all([
    read("app/layout.tsx"),
    read("app/page.tsx"),
  ]);
  assert.doesNotMatch(layout, /fonts\.googleapis\.com/i);
  assert.match(layout, /material-symbols\/rounded\.css/);
  assert.match(page, /external_ai_enabled/);
  assert.match(page, /external_ai_consented_at/);
  assert.match(page, /Il consenso è facoltativo/);
  assert.doesNotMatch(page, /localStorage/);
});

test("le schermate leggono Supabase e non incorporano dati dimostrativi", async () => {
  const page = await read("app/page.tsx");
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
  ]) {
    assert.match(page, new RegExp(`from\\(\"${table}\"\\)`));
  }
  for (const fake of [
    "Giulia Bianchi",
    "Marco Rossi",
    "Sara Esposito",
    "Liceo Galilei",
    "Somma dei numeri pari",
  ]) {
    assert.doesNotMatch(page, new RegExp(fake, "i"));
  }
});

test("autenticazione supporta password, OTP email e Google", async () => {
  const [screen, client, config, template] = await Promise.all([
    read("app/auth-screen.tsx"),
    read("lib/supabase.ts"),
    read("supabase/config.toml"),
    read("supabase/templates/magic_link.html"),
  ]);
  assert.match(screen, /signInWithPassword/);
  assert.match(screen, /signInWithOtp/);
  assert.match(screen, /verifyOtp/);
  assert.match(screen, /one-time-code/);
  assert.match(screen, /signInWithGoogle/);
  assert.match(screen, /NEXT_PUBLIC_AUTH_EMAIL_OTP === "true"/);
  assert.match(screen, /NEXT_PUBLIC_AUTH_GOOGLE === "true"/);
  assert.match(screen, /googleEnabled &&/);
  assert.match(screen, /otpEnabled &&/);
  assert.match(client, /provider: "google"/);
  assert.match(config, /\[auth\.external\.google\]/);
  assert.match(config, /SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET/);
  assert.match(config, /\[auth\.email\.template\.magic_link\]/);
  assert.match(template, /\{\{ \.Token \}\}/);
  assert.doesNotMatch(
    config,
    /SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET\s*=\s*[^\n]+/,
  );
});

test("il branding pubblico del login è personalizzabile senza esporre dati privati", async () => {
  const [screen, page, migration] = await Promise.all([
    read("app/auth-screen.tsx"),
    read("app/page.tsx"),
    readSchema(),
  ]);
  assert.match(screen, /rpc\("get_public_branding"\)/);
  assert.doesNotMatch(
    screen,
    /Controllo in tempo reale|learn_together|verified_user/,
  );
  assert.match(page, /login_title_it/);
  assert.match(page, /login_subtitle_en/);
  assert.match(
    migration,
    /grant all on function public\.get_public_branding\(\) to anon/i,
  );
  assert.match(
    migration,
    /grant all on function public\.get_public_branding\(\) to authenticated/i,
  );
  assert.doesNotMatch(
    migration.match(/returns table \([\s\S]*?\)/i)?.[0] ?? "",
    /teacher_email/i,
  );
});

test("il tema Dracula attivo usa token CSS centralizzati", async () => {
  const css = await read("app/dark.css");
  const paletteMarker = "/* Dracula-inspired palette */";
  const paletteStart = css.indexOf(paletteMarker);
  const consumerStart = css.indexOf("body {", paletteStart);
  const tokens = css.slice(paletteStart, consumerStart);
  const consumers = css.slice(consumerStart);

  assert.ok(paletteStart >= 0 && consumerStart > paletteStart);
  for (const token of [
    "--color-background:",
    "--color-surface:",
    "--color-foreground:",
    "--color-purple:",
    "--color-cyan:",
    "--focus-ring:",
    "--font-ui:",
    "--font-code:",
    "--font-size-base:",
    "--space-4:",
    "--radius-md:",
    "--duration-normal:",
  ]) {
    assert.ok(tokens.includes(token), `Token CSS mancante: ${token}`);
  }
  assert.doesNotMatch(consumers, /#[0-9a-f]{3,8}\b|rgba?\(/i);
  assert.doesNotMatch(consumers, /font-family:(?!\s*var\()/i);
  assert.doesNotMatch(consumers, /font-size:(?!\s*var\()/i);
});

test("le pagine interne hanno un handler server", async () => {
  const catchAll = await read("app/[...route]/page.tsx");
  assert.match(catchAll, /export \{ default \} from "\.\.\/page"/);
});

test("il Markdown non esegue HTML e i link esterni sono isolati", async () => {
  const markdown = await read("app/markdown-content.tsx");
  assert.match(markdown, /skipHtml/);
  assert.match(markdown, /noopener noreferrer/);
  assert.match(markdown, /remarkGfm/);
  assert.doesNotMatch(markdown, /dangerouslySetInnerHTML/);
});

test("il monitoraggio usa bozze, Realtime e attribuzione dell'editor", async () => {
  const [monitor, draft, migration] = await Promise.all([
    read("app/live-monitor.tsx"),
    read("app/use-student-draft.ts"),
    readSchema(),
  ]);
  assert.match(monitor, /postgres_changes/);
  assert.match(monitor, /updated_by: teacherId/);
  assert.match(draft, /setTimeout[\s\S]*700/);
  assert.match(draft, /remote\.updated_by !== studentId/);
  assert.match(
    migration,
    /alter publication supabase_realtime add table (?:only )?public\.submissions/i,
  );
  assert.match(migration, /replica identity full/i);
});

test("monitoraggio e Code now usano presenza temporanea protetta", async () => {
  const [monitor, codeNow, presence, migration] = await Promise.all([
    read("app/live-monitor.tsx"),
    read("app/code-now.tsx"),
    read("app/use-editor-session.ts"),
    readSchema(),
  ]);
  assert.match(monitor, /submission\.status === "draft"/);
  assert.match(monitor, /Editor aperto ora/);
  assert.match(monitor, /PythonEditor/);
  assert.match(codeNow, /Copia codice prof/);
  assert.match(codeNow, /code-now\.py/);
  assert.match(codeNow, /mode: "run_interactive"/);
  assert.match(codeNow, /inputRequired/);
  assert.match(codeNow, /Valore per input Python/);
  assert.match(codeNow, /nextInputs/);
  assert.match(presence, /active_until/);
  assert.match(presence, /25_000/);
  assert.match(presence, /150/);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /get_active_teacher_code/i);
  assert.match(migration, /publish_code_now/i);
  assert.match(migration, /close_editor_session/i);
  assert.match(migration, /prune_editor_sessions/i);
});

test("l'autosalvataggio non ripristina periodicamente codice obsoleto", async () => {
  const draftHook = await read("app/use-student-draft.ts");
  const revisionPolicy = await readSchema();
  assert.doesNotMatch(draftHook, /setInterval/);
  assert.doesNotMatch(draftHook, /existing\.status\s*!==\s*["']draft["']/);
  assert.match(draftHook, /remote\.updated_by\s*!==\s*studentId/);
  assert.match(draftHook, /code\s*===\s*synchronizedCode\.current/);
  assert.match(revisionPolicy, /student_id\s*=\s*\(select auth\.uid\(\)\)/i);
  assert.match(revisionPolicy, /student_can_submit_to_assignment/i);
});

test("una consegna soddisfa il vincolo propedeutico prima della valutazione", async () => {
  const migration = await readSchema();
  assert.match(migration, /delivered\.status\s*<>\s*'draft'/i);
  assert.doesNotMatch(migration, /delivered\.status\s*=\s*'passed'/i);
  assert.match(migration, /previous\.published_at is not null/i);
  assert.match(migration, /prerequisite\.is_prerequisite/i);
});
