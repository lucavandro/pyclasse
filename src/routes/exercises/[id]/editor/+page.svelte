<script lang="ts">
  import { page } from "$app/state";
  import { beforeNavigate } from "$app/navigation";
  import { onDestroy } from "svelte";
  import { getExercise } from "$lib/data";
  import { supabase } from "$lib/supabase";
  import { session } from "$lib/session.svelte";
  import PythonEditor from "$lib/PythonEditor.svelte";
  import Icon from "$lib/Icon.svelte";
  import { m } from "$lib/paraglide/messages.js";
  import { formatDate } from "$lib/format";
  let data = $state<any>(null),
    code = $state(""),
    output = $state<string>(m.editor_ready_output()),
    running = $state(false),
    passed = $state(0),
    status = $state(""),
    worker: Worker | null = null,
    saveTimer: any,
    heartbeat: any,
    channel: any;
  let editorVersion = $state(0);
  const assignment = $derived(data?.assignments?.[0]);
  $effect(() => {
    if (!session.profile || !page.params.id) return;
    void getExercise(page.params.id).then((x) => {
      data = x;
      code =
        x.submissions.find(
          (s: any) =>
            s.class_assignment_id === x.assignments[0]?.id &&
            s.student_id === session.profile?.id,
        )?.code || x.exercise.starter_code;
    });
  });
  $effect(() => {
    if (!data || session.profile?.role !== "student" || !assignment) return;
    const currentCode = code;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void saveDraft(currentCode), 700);
  });
  async function saveDraft(currentCode = code) {
    if (!supabase || !assignment || !session.profile) return;
    await supabase.from("submissions").upsert(
      {
        class_assignment_id: assignment.id,
        student_id: session.profile.id,
        code: currentCode,
        status: "draft",
        score: null,
        submitted_at: null,
        updated_by: session.profile.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "class_assignment_id,student_id" },
    );
    await supabase.from("assignment_views").upsert(
      { class_assignment_id: assignment.id, student_id: session.profile.id },
      {
        onConflict: "class_assignment_id,student_id",
        ignoreDuplicates: true,
      },
    );
    await supabase.rpc("touch_editor_session", {
      target_assignment: assignment.id,
      current_code: currentCode,
    });
    if (!heartbeat)
      heartbeat = setInterval(
        () =>
          void supabase!.rpc("touch_editor_session", {
            target_assignment: assignment.id,
            current_code: code,
          }),
        10_000,
      );
    if (channel) return;
    channel = supabase
      .channel(`draft-${session.profile.id}-${assignment.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "submissions",
          filter: `student_id=eq.${session.profile.id}`,
        },
        (payload: any) => {
          const remote = payload.new;
          if (
            remote.class_assignment_id === assignment.id &&
            remote.updated_by !== session.profile?.id
          )
            code = remote.code;
          editorVersion += 1;
        },
      )
      .subscribe();
  }
  function run(mode: "run_interactive" | "test") {
    worker?.terminate();
    worker = new Worker("/pyodide-worker.js", { type: "module" });
    running = true;
    output = mode === "test" ? m.editor_running_tests() : m.editor_running();
    const timer = setTimeout(() => {
      worker?.terminate();
      running = false;
      output = m.editor_timeout();
    }, 8000);
    worker.onmessage = (e) => {
      clearTimeout(timer);
      running = false;
      if (!e.data.ok) output = m.editor_error({ error: e.data.error });
      else if (mode === "test") {
        passed = e.data.tests.passed;
        output = m.editor_test_result({
          passed: e.data.tests.passed,
          total: e.data.tests.total,
        });
      } else output = e.data.output || m.editor_no_output();
      worker?.terminate();
    };
    worker.postMessage({
      code,
      mode,
      inputs: [],
      tests: data.tests.map((t: any) => ({
        input: t.input_data,
        expected: t.expected_output,
      })),
    });
  }
  async function submit() {
    if (!supabase || !assignment || !session.profile) return;
    if (
      data.exercise.verification_mode === "tests" &&
      (!data.tests.length || passed !== data.tests.length)
    ) {
      status = m.editor_all_tests_required();
      return;
    }
    if (data.exercise.verification_mode === "ai") {
      running = true;
      status = m.editor_ai_in_progress();
      const { verifySolutionWithAi } = await import(
        "../../../../../lib/ai-feedback"
      );
      const verification = await verifySolutionWithAi(
        `${data.exercise.description}\n${data.exercise.constraints}`,
        code,
        session.profile.external_ai_enabled,
      );
      running = false;
      output = verification.feedback;
      if (!verification.passed) {
        status = m.editor_ai_failed();
        return;
      }
    }
    await saveDraft();
    const r = await supabase
      .from("submissions")
      .update({
        code,
        status: "submitted",
        score: null,
        submitted_at: new Date().toISOString(),
        updated_by: session.profile.id,
        updated_at: new Date().toISOString(),
      })
      .eq("class_assignment_id", assignment.id)
      .eq("student_id", session.profile.id);
    status = r.error ? r.error.message : m.editor_submitted();
  }
  onDestroy(() => {
    worker?.terminate();
    clearInterval(heartbeat);
    clearTimeout(saveTimer);
    if (channel) supabase?.removeChannel(channel);
  });
  beforeNavigate(() => {
    if (session.profile?.role === "student")
      void supabase?.rpc("close_editor_session");
  });
</script>

{#if !data}<div class="spinner"></div>{:else}<a
    class="button quiet"
    href="/exercises">{m.exercise_back_assignments()}</a
  >
  <header class="page-head">
    <div>
      <p class="eyebrow">{m.exercise_python_eyebrow()}</p>
      <h1>{data.exercise.title}</h1>
      <p>
        {assignment?.deadline
          ? m.editor_deadline({
              date: formatDate(assignment.deadline, {
                dateStyle: "medium",
                timeStyle: "short",
              }),
            })
          : m.common_no_deadline()} · {m.editor_test_count({
          count: data.tests.length,
        })}
      </p>
    </div>
  </header>
  <div class="tabs" role="tablist">
    <a role="tab" aria-selected="false" href={`/exercises/${data.exercise.id}`}
      >{m.exercise_prompt_tab()}</a
    ><a
      role="tab"
      aria-selected="true"
      class="active"
      href={`/exercises/${data.exercise.id}/editor`}
      >{m.exercise_editor_tab()}</a
    >
  </div>
  <section class="panel workspace">
    <div class="toolbar">
      <strong>main.py</strong><small>{m.editor_autosave()}</small>
    </div>
    {#key editorVersion}<PythonEditor
        bind:value={code}
        ariaLabel={m.editor_python_aria()}
      />{/key}
    <div class="console">
      <header>
        <div class="console-heading">
          <strong>{m.common_output()}</strong><small
            >{running ? m.editor_running() : m.common_ready()}</small
          >
        </div>
        <div class="editor-actions" aria-label={m.editor_execution_actions()}>
          <button
            class="secondary icon-button"
            aria-label={m.common_run()}
            title={m.editor_run_title()}
            disabled={running}
            onclick={() => run("run_interactive")}
            ><Icon name="play" size={18} /></button
          >{#if data.exercise.verification_mode === "tests"}<button
              class="secondary icon-button"
              aria-label={m.common_test()}
              title={m.editor_test_title()}
              disabled={running}
              onclick={() => run("test")}><Icon name="test" size={18} /></button
            >{/if}
        </div>
      </header>
      <pre aria-live="polite">{output}</pre>
    </div>
    <div class="runbar">
      <button
        class="primary"
        disabled={running || session.profile?.role !== "student" || !assignment}
        onclick={() => void submit()}>{m.editor_submit()}</button
      >
    </div>
    {#if status}<p
        role="status"
        class:success={status === m.editor_submitted()}
      >
        {status}
      </p>{/if}
  </section>{/if}

<style>
  .workspace {
    padding: 0;
    overflow: hidden;
  }
  .toolbar,
  .console header,
  .runbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 0.8rem 1rem;
  }
  .console {
    border-top: var(--border);
    background: var(--color-surface-subtle);
  }
  .console pre {
    min-height: 100px;
    padding: 1rem;
    margin: 0;
    white-space: pre-wrap;
    font-family: var(--font-code);
  }
  .runbar {
    border-top: var(--border);
    justify-content: flex-end;
  }
  .console-heading {
    display: grid;
    gap: var(--space-1);
  }
  .editor-actions {
    display: flex;
    gap: var(--space-2);
  }
  .icon-button {
    width: var(--control-min-height);
    padding: 0;
  }
  [role="status"] {
    padding: 0 1rem 1rem;
  }
  @media (max-width: 600px) {
    .runbar {
      align-items: stretch;
      flex-direction: column;
    }
    .runbar button {
      flex: 1;
    }
  }
</style>
