import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const schema = async () => {
  const migrations = (
    await readdir(new URL("../supabase/migrations", import.meta.url))
  )
    .filter((name) => name.endsWith(".sql"))
    .sort();
  return (
    await Promise.all(
      migrations.map((name) => read(`supabase/migrations/${name}`)),
    )
  )
    .join("\n")
    .replaceAll('"', "");
};

test("SvelteKit separa le funzionalità in rotte autonome", async () => {
  const expected = [
    "src/routes/+page.svelte",
    "src/routes/classes/+page.svelte",
    "src/routes/exercises/+page.svelte",
    "src/routes/exercises/[id]/editor/+page.svelte",
    "src/routes/reports/valutazioni/+page.svelte",
    "src/routes/reports/classi/[id]/+page.svelte",
    "src/routes/reports/[section]/studenti/[id]/+page.svelte",
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
    "code_now_settings",
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
  assert.match(
    sql,
    /alter publication supabase_realtime add table (?:only )?public\.code_now_settings/i,
  );
});

test("editor applica blocco clipboard, guida Run, watchdog e Pyodide self-hosted", async () => {
  const [editor, workbench, codeNow, worker, italian, english] =
    await Promise.all([
      read("src/lib/PythonEditor.svelte"),
      read("src/routes/exercises/[id]/editor/+page.svelte"),
      read("src/routes/code-now/+page.svelte"),
      read("public/pyodide-worker.js"),
      read("messages/it.json"),
      read("messages/en.json"),
    ]);
  assert.match(editor, /copy[\s\S]*preventDefault/);
  assert.match(editor, /cut[\s\S]*preventDefault/);
  assert.match(editor, /paste[\s\S]*preventDefault/);
  assert.match(editor, /view\s*=\s*\$state\.raw/);
  assert.match(
    workbench,
    /allowClipboard=\{session\.profile\?\.role !== "student"\}/,
  );
  assert.equal(
    JSON.parse(italian).editor_ready_output,
    "Premi Run per eseguire il codice.",
  );
  assert.equal(
    JSON.parse(english).editor_ready_output,
    "Press Run to execute the code.",
  );
  assert.match(
    workbench,
    /output = \$state<string>\(m\.editor_ready_output\(\)\)/,
  );
  assert.match(
    codeNow,
    /output = \$state<string>\(m\.editor_ready_output\(\)\)/,
  );
  assert.match(editor, /python\(\)/);
  assert.match(editor, /HighlightStyle\.define/);
  assert.match(editor, /syntaxHighlighting\(pythonHighlightStyle\)/);
  assert.match(editor, /tags\.keyword/);
  assert.match(editor, /tags\.function/);
  assert.match(editor, /tags\.string/);
  assert.match(editor, /tags\.comment/);
  assert.match(editor, /caret-color:\s*#fff/);
  assert.match(editor, /\.cm-cursor/);
  assert.match(workbench, /8000/);
  assert.match(codeNow, /8000/);
  assert.match(
    codeNow,
    /class="code-now-console console"[\s\S]*m\.common_run\(\)/,
  );
  assert.match(codeNow, /m\.code_now_download_aria\(\)/);
  assert.match(codeNow, /m\.code_now_save_aria\(\)/);
  assert.match(codeNow, /<dialog[\s\S]*m\.code_now_create_copy\(\)/);
  assert.match(codeNow, /class="project-context"/);
  assert.match(codeNow, /m\.code_now_untitled_project\(\)/);
  assert.match(codeNow, /m\.code_now_open_new_project\(\)/);
  assert.match(codeNow, /m\.code_now_save_and_continue\(\)/);
  assert.match(codeNow, /requestProjectChange/);
  assert.match(codeNow, /code !== savedCode/);
  assert.match(codeNow, /table: "code_now_settings"/);
  assert.match(codeNow, /sharing_enabled/);
  assert.match(worker, /\/vendor\/pyodide\//);
  assert.doesNotMatch(worker, /cdn\.jsdelivr\.net/);
});

test("il seed include codici salvati personali per docente e studenti", async () => {
  const seed = await read("supabase/seed.sql");
  assert.match(seed, /insert into public\.code_snippets/i);
  const snippetSeed = seed
    .slice(seed.indexOf("insert into public.code_snippets"))
    .split("on conflict")[0];
  assert.equal(
    [...snippetSeed.matchAll(/10000000-0000-0000-0000-000000000001/g)].length,
    2,
  );
  for (let index = 1; index <= 5; index += 1)
    assert.match(
      snippetSeed,
      new RegExp(`20000000-0000-0000-0000-00000000000${index}`),
    );
});

test("scadenze, report studente e trasferimento JSON sono esposti dalla UI", async () => {
  const [form, reports, classReport, studentDetail, archive, requirements] =
    await Promise.all([
      read("src/lib/ExerciseForm.svelte"),
      read("src/lib/ReportPage.svelte"),
      read("src/routes/reports/classi/[id]/+page.svelte"),
      read("src/routes/reports/[section]/studenti/[id]/+page.svelte"),
      read("src/routes/exercises/+page.svelte"),
      read("docs/PRODUCT_REQUIREMENTS.md"),
    ]);
  assert.match(form, /type="datetime-local"/);
  assert.match(form, /deadline:\s*deadlines\[c\.id\]/);
  assert.match(reports, /class="report-area"/);
  assert.match(reports, /href={`\/reports\/valutazioni\/studenti\//);
  assert.match(reports, /m\.reports_to_complete\(\)/);
  assert.match(reports, /href={`\/reports\/classi\/\$\{c\.id\}`}/);
  assert.match(classReport, /getClassReport\(page\.params\.id/);
  assert.match(classReport, /href={`\/reports\/classi\/studenti\//);
  assert.match(classReport, /class="table class-student-table"/);
  assert.match(
    classReport,
    /data-label=\{m\.reports_progress_percentage\(\)\}/,
  );
  assert.match(studentDetail, /session\.profile\.role !== "teacher"/);
  assert.match(studentDetail, /m\.reports_show_code\(\)/);
  assert.match(archive, /class="drop-zone"/);
  assert.match(archive, /accept="\.json,application\/json"/);
  assert.match(archive, /parseExerciseTransfer/);
  assert.match(archive, /buildExerciseTransfer/);
  assert.match(requirements, /LOGIN-001/);
  assert.match(requirements, /TRANSFER-001/);
});

test("Markdown rifiuta HTML grezzo e isola link esterni", async () => {
  const markdown = await read("src/lib/Markdown.svelte");
  assert.match(markdown, /renderer\.html/);
  assert.match(markdown, /escape\(text\)/);
  assert.match(markdown, /noopener noreferrer/);
  assert.match(markdown, /protocol\s*===\s*["']https:/);
});

test("il modulo esercizio offre anteprima Markdown e tag interattivi", async () => {
  const [form, newPage, editPage] = await Promise.all([
    read("src/lib/ExerciseForm.svelte"),
    read("src/routes/exercises/new/+page.svelte"),
    read("src/routes/exercises/[id]/edit/+page.svelte"),
  ]);
  assert.match(form, /import Markdown from ["']\$lib\/Markdown\.svelte["']/);
  assert.match(
    form,
    /import PythonEditor from ["']\$lib\/PythonEditor\.svelte["']/,
  );
  assert.match(form, /<Markdown source=\{description\}/);
  assert.match(form, /<PythonEditor[\s\S]*bind:value=\{starterCode\}/);
  assert.match(form, /ariaLabelledby="exercise-starter-code-label"/);
  assert.match(form, /allowClipboard=\{true\}/);
  assert.match(form, /m\.exercise_markdown_preview\(\)/);
  assert.match(form, /event\.key === ["']Enter["']/);
  assert.match(form, /onclick=\{addTag\}/);
  assert.match(form, /m\.exercise_tag_remove\(\{ tag \}\)/);
  assert.match(form, /class="tag-field tag-row"/);
  assert.match(form, /class="points-row"/);
  assert.match(newPage, /<ExerciseForm\s*\/>/);
  assert.match(editPage, /<ExerciseForm id=\{page\.params\.id\}\s*\/>/);
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
    assert.match(data, new RegExp(`["']${table}["']`));
  const routes = await Promise.all([
    read("src/routes/+page.svelte"),
    read("src/routes/classes/+page.svelte"),
    read("src/routes/exercises/+page.svelte"),
  ]);
  assert.doesNotMatch(
    routes.join("\n"),
    /Giulia Bianchi|Marco Rossi|Liceo Galilei/i,
  );
  assert.doesNotMatch(data, /select\(["']\*["']\)/);
  assert.match(data, /getDashboard/);
  assert.match(data, /getStudentSubmissions[\s\S]*\.eq\("student_id"/);
  assert.doesNotMatch(
    data.match(/submissionSummaryColumns\s*=([\s\S]*?);/)?.[1] || "",
    /code/,
  );
  assert.match(data, /getClassReport[\s\S]*\.eq\("class_id", id\)/);
  assert.match(
    data,
    /getClassReport[\s\S]*\.in\("class_assignment_id", assignmentIds\)/,
  );
});

test("funzioni di classe e valutazione sono raggiungibili dall'interfaccia", async () => {
  const [classDetail, studentDetail] = await Promise.all([
    read("src/routes/classes/[id]/+page.svelte"),
    read("src/routes/reports/[section]/studenti/[id]/+page.svelte"),
  ]);
  assert.match(classDetail, /add_student_to_class/);
  assert.match(classDetail, /m\.classes_student_email\(\)/);
  assert.match(studentDetail, /m\.reports_save_evaluation\(\)/);
  assert.match(studentDetail, /grading_scale/);
});

test("le operazioni docente verificano ruolo e proprietÃ  nel database", async () => {
  const sql = await schema();
  assert.match(sql, /create or replace function public\.is_teacher\(\)/i);
  assert.match(
    sql,
    /teachers create exercises[\s\S]*is_teacher\(\)[\s\S]*teacher_id/i,
  );
  assert.match(
    sql,
    /teachers create own classes[\s\S]*is_teacher\(\)[\s\S]*teacher_id/i,
  );
  assert.match(sql, /publish_code_now[\s\S]*not public\.is_teacher\(\)/i);
});

test("autenticazione supporta password, recupero, OTP e Google", async () => {
  const [auth, resetPassword, layout, client, config, brandingRemoval] =
    await Promise.all([
      read("src/lib/Auth.svelte"),
      read("src/routes/auth/reset-password/+page.svelte"),
      read("src/routes/+layout.svelte"),
      read("src/lib/supabase.ts"),
      read("supabase/config.toml"),
      read("supabase/migrations/20260815000000_remove_login_branding.sql"),
    ]);
  assert.match(auth, /signInWithPassword/);
  assert.match(auth, /resetPasswordForEmail/);
  assert.match(auth, /\/auth\/reset-password/);
  assert.match(auth, /m\.auth_recovery_sent\(\)/);
  assert.match(auth, /signInWithOtp/);
  assert.match(auth, /verifyOtp/);
  assert.match(auth, /m\.auth_hero_title\(\)/);
  assert.match(auth, /m\.auth_hero_subtitle\(\)/);
  assert.doesNotMatch(auth, /get_public_branding|app_branding_translations/);
  assert.match(
    brandingRemoval,
    /drop function if exists public\.get_public_branding\(text\)/i,
  );
  assert.match(
    brandingRemoval,
    /drop table if exists public\.app_branding_translations/i,
  );
  assert.equal(
    auth.match(/src="\/favicon\.svg"/g)?.length,
    1,
    "il login mostra il logo una sola volta",
  );
  assert.match(auth, /class="language-row"/);
  assert.doesNotMatch(auth, /\.language\s*\{[\s\S]*position:\s*absolute/);
  assert.match(auth, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(auth, /class="auth-form-panel"/);
  assert.match(auth, /class="auth-content"/);
  assert.doesNotMatch(auth, /class="auth-card"/);
  assert.match(auth, /friendlyAuthError/);
  assert.match(auth, /m\.auth_privacy_notice\(\)/);
  assert.match(resetPassword, /updateUser\(\{ password \}\)/);
  assert.match(resetPassword, /signOut\(\{ scope: "global" \}\)/);
  assert.match(resetPassword, /password !== confirmation/);
  assert.match(layout, /pathname\.startsWith\("\/auth\/"\)/);
  assert.match(config, /127\.0\.0\.1:\*\/auth\/reset-password/);
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
  assert.match(settings, /m\.settings_consent_help\(\)/);
  assert.match(monitor, /status\s*===\s*["']draft/);
  assert.match(editor, /touch_editor_session/);
  assert.match(presenceMigration, /active_until/);
  assert.match(presenceMigration, /interval '25 seconds'/);
  assert.doesNotMatch(settings, /localStorage/);
  assert.doesNotMatch(settings, /bind:value=\{schoolName\}/);
  assert.doesNotMatch(
    settings,
    /branding|settings_login_preview|app_branding_translations/i,
  );
});

test("la home docente espone avvio lezione e segnali operativi", async () => {
  const [dashboard, data] = await Promise.all([
    read("src/routes/+page.svelte"),
    read("src/lib/data.ts"),
  ]);
  assert.match(dashboard, /href="\/code-now"/);
  assert.match(dashboard, /href="\/exercises\/new"/);
  assert.match(dashboard, /href="\/monitor"/);
  assert.match(dashboard, /m\.dashboard_upcoming_deadlines\(\)/);
  assert.match(dashboard, /submission\.status === "submitted"/);
  assert.match(
    data,
    /getDashboard[\s\S]*class_members[\s\S]*exercises[\s\S]*class_assignments[\s\S]*submissions/,
  );
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
  assert.match(shell, /m\.nav_app_menu\(\)/);
  assert.match(shell, /nav-icon/);
  assert.match(icon, /aria-hidden="true"/);
  assert.match(reportNav, /role="tablist"/);
  assert.match(reportNav, /aria-selected/);
  const route = await read("src/routes/code-now/+page.svelte");
  assert.match(route, /<style>/);
});
