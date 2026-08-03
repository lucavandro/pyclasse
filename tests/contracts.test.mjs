import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("schema Supabase separa esercizi e assegnazioni e abilita RLS", async () => {
  const sql = await read(
    "supabase/migrations/20260801000000_initial_schema.sql",
  );
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
  assert.match(
    sql,
    /class_assignment_id uuid not null references public\.class_assignments/i,
  );
  assert.match(sql, /deadline timestamptz/i);
  assert.match(sql, /unique \(exercise_id, class_id\)/i);
  assert.match(sql, /profiles_single_teacher_idx/i);
  assert.match(
    sql,
    /students create own drafts[\s\S]*status = 'draft'[\s\S]*score = 0/i,
  );
  assert.match(
    sql,
    /students read class assignments[\s\S]*published_at is not null/i,
  );
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
    read("supabase/migrations/20260802006000_live_teacher_monitoring.sql"),
  ]);
  assert.match(monitor, /postgres_changes/);
  assert.match(monitor, /updated_by: teacherId/);
  assert.match(draft, /setTimeout[\s\S]*700/);
  assert.match(draft, /setInterval[\s\S]*1500/);
  assert.match(draft, /remote\.updated_by !== studentId/);
  assert.match(
    migration,
    /alter publication supabase_realtime add table public\.submissions/i,
  );
  assert.match(migration, /replica identity full/i);
});
