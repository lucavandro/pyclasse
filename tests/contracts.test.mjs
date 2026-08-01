import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("schema Supabase separa esercizi e assegnazioni e abilita RLS", async () => {
  const sql = await read("supabase/schema.sql");
  for (const table of ["profiles", "app_settings", "classes", "class_members", "exercises", "class_assignments", "tests", "submissions"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(sql, /class_assignment_id uuid not null references public\.class_assignments/i);
  assert.match(sql, /deadline timestamptz/i);
  assert.match(sql, /unique \(exercise_id, class_id\)/i);
  assert.match(sql, /profiles_single_teacher_idx/i);
});

test("editor applica watchdog e blocco clipboard", async () => {
  const [page, worker] = await Promise.all([read("app/page.tsx"), read("public/pyodide-worker.js")]);
  assert.match(page, /copy\(event\).*preventDefault/s);
  assert.match(page, /cut\(event\).*preventDefault/s);
  assert.match(page, /paste\(event\).*preventDefault/s);
  assert.match(page, /8000/g);
  assert.match(page, /worker\.terminate\(\)/);
  assert.match(worker, /output\.length < 50000/i);
  assert.match(worker, /output limitato/i);
});

test("feedback IA vieta soluzioni dirette e dispone di fallback", async () => {
  const ai = await read("lib/ai-feedback.ts");
  assert.match(ai, /non fornire codice/i);
  assert.match(ai, /containsDirectSolution/);
  assert.match(ai, /catch \{/);
  assert.match(ai, /generateExerciseWithAi/);
});

test("le pagine interne hanno un handler server", async () => {
  const catchAll = await read("app/[...route]/page.tsx");
  assert.match(catchAll, /export \{ default \} from "\.\.\/page"/);
});
