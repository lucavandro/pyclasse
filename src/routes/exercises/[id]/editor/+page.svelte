<script lang="ts">
  import { page } from "$app/state";
  import { beforeNavigate } from "$app/navigation";
  import { onDestroy } from "svelte";
  import { getExercise } from "$lib/data";
  import { supabase } from "$lib/supabase";
  import { session } from "$lib/session.svelte";
  import PythonEditor from "$lib/PythonEditor.svelte";
  let data = $state<any>(null),
    code = $state(""),
    output = $state("Pronto."),
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
    output = mode === "test" ? "Esecuzione test…" : "Esecuzione…";
    const timer = setTimeout(() => {
      worker?.terminate();
      running = false;
      output = "Esecuzione interrotta dopo 8 secondi.";
    }, 8000);
    worker.onmessage = (e) => {
      clearTimeout(timer);
      running = false;
      if (!e.data.ok) output = `Errore:\n${e.data.error}`;
      else if (mode === "test") {
        passed = e.data.tests.passed;
        output = `${e.data.tests.passed} test su ${e.data.tests.total} superati.`;
      } else output = e.data.output || "(nessun output)";
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
      status = "Supera tutti i test prima della consegna";
      return;
    }
    if (data.exercise.verification_mode === "ai") {
      running = true;
      status = "Verifica IA in corso…";
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
        status = "La soluzione non ha superato la verifica";
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
    status = r.error ? r.error.message : "Soluzione consegnata";
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
    href="/exercises">← Torna ai compiti</a
  >
  <header class="page-head">
    <div>
      <p class="eyebrow">ESERCIZIO PYTHON</p>
      <h1>{data.exercise.title}</h1>
      <p>
        {assignment?.deadline
          ? `Scadenza ${new Date(assignment.deadline).toLocaleString("it-IT")}`
          : "Nessuna scadenza"} · {data.tests.length} test
      </p>
    </div>
  </header>
  <div class="tabs" role="tablist">
    <a role="tab" aria-selected="false" href={`/exercises/${data.exercise.id}`}
      >Traccia</a
    ><a
      role="tab"
      aria-selected="true"
      class="active"
      href={`/exercises/${data.exercise.id}/editor`}>Editor e codice</a
    >
  </div>
  <section class="panel workspace">
    <div class="toolbar">
      <strong>main.py</strong><small
        >Python nel browser · salvataggio automatico</small
      >
    </div>
    {#key editorVersion}<PythonEditor
        bind:value={code}
        ariaLabel="Editor Python"
      />{/key}
    <div class="console">
      <header>
        <strong>Output</strong><small
          >{running ? "Esecuzione in corso…" : "Pronto"}</small
        >
      </header>
      <pre aria-live="polite">{output}</pre>
    </div>
    <div class="runbar">
      <div>
        <button
          class="secondary"
          disabled={running}
          onclick={() => run("run_interactive")}>Esegui</button
        >{#if data.exercise.verification_mode === "tests"}<button
            class="secondary"
            disabled={running}
            onclick={() => run("test")}>Test</button
          >{/if}
      </div>
      <button
        class="primary"
        disabled={running || session.profile?.role !== "student" || !assignment}
        onclick={() => void submit()}>Consegna soluzione</button
      >
    </div>
    {#if status}<p
        role="status"
        class:success={status === "Soluzione consegnata"}
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
    background: #11121a;
  }
  .console pre {
    min-height: 100px;
    padding: 1rem;
    margin: 0;
    white-space: pre-wrap;
    font-family: var(--font-code);
  }
  .runbar > div {
    display: flex;
    gap: 0.5rem;
  }
  .runbar {
    border-top: var(--border);
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
