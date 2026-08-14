<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import { supabase } from "$lib/supabase";
  import { getSnippets } from "$lib/data";
  import { session } from "$lib/session.svelte";
  import PythonEditor from "$lib/PythonEditor.svelte";
  import Icon from "$lib/Icon.svelte";
  import type { CodeSnippet } from "$lib/types";
  let code = $state("# Scrivi qui il tuo codice Python\n"),
    output = $state("Pronto."),
    running = $state(false),
    shared = $state(false),
    inputs = $state<string[]>([]),
    inputPrompt = $state<string | null>(null),
    inputValue = $state(""),
    snippets = $state<CodeSnippet[]>([]),
    snippetName = $state(""),
    activeId = $state<string | null>(null),
    editorVersion = $state(0),
    worker: Worker | null = null,
    timer: any;
  $effect(() => {
    const profile = session.profile;
    if (profile) {
      void getSnippets().then((x) => (snippets = x));
      const beat = () =>
        supabase?.from("editor_sessions").upsert({
          user_id: profile.id,
          context: "code_now",
          class_assignment_id: null,
          code: untrack(() => code),
          active_until: new Date(Date.now() + 60_000).toISOString(),
          updated_at: new Date().toISOString(),
        });
      void beat();
      timer = setInterval(() => void beat(), 10000);
      return () => clearInterval(timer);
    }
  });
  $effect(() => {
    if (session.profile?.role === "teacher" && supabase) {
      const current = code;
      const handle = setTimeout(
        () =>
          void supabase!
            .rpc("publish_code_now", { current_code: current })
            .then(({ error }) => {
              if (!error) shared = true;
            }),
        150,
      );
      return () => clearTimeout(handle);
    }
  });
  function run(provided: string[] = []) {
    worker?.terminate();
    worker = new Worker("/pyodide-worker.js", { type: "module" });
    running = true;
    inputPrompt = null;
    inputs = provided;
    output = "Esecuzione…";
    const watchdog = setTimeout(() => {
      worker?.terminate();
      running = false;
      output = "Esecuzione interrotta dopo 8 secondi.";
    }, 8000);
    worker.onmessage = (e) => {
      clearTimeout(watchdog);
      running = false;
      if (e.data.ok && e.data.inputRequired) {
        output = e.data.output || "In attesa di un valore…";
        inputPrompt = e.data.prompt || "Inserisci un valore";
      } else
        output = e.data.ok
          ? e.data.output || "(nessun output)"
          : `Errore:\n${e.data.error}`;
      worker?.terminate();
    };
    worker.postMessage({
      code,
      mode: "run_interactive",
      inputs: provided,
      tests: [],
    });
  }
  async function copyTeacher() {
    if (!supabase) return;
    const r = await supabase.rpc("get_active_teacher_code");
    if (typeof r.data === "string") {
      code = r.data;
      editorVersion += 1;
    } else output = "Il docente non ha Code now aperto in questo momento";
  }
  async function publish(value: string) {
    if (!supabase || session.profile?.role !== "teacher") return;
    const result = await supabase.rpc("publish_code_now", {
      current_code: value,
    });
    if (!result.error) shared = true;
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([code], { type: "text/x-python" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "code-now.py";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function save() {
    if (!supabase || !session.profile || !snippetName.trim()) return;
    const payload = {
      owner_id: session.profile.id,
      name: snippetName.trim(),
      code,
      updated_at: new Date().toISOString(),
    };
    const r = activeId
      ? await supabase
          .from("code_snippets")
          .update(payload)
          .eq("id", activeId)
          .select()
          .single()
      : await supabase.from("code_snippets").insert(payload).select().single();
    if (!r.error) {
      activeId = r.data.id;
      snippets = [r.data, ...snippets.filter((x) => x.id !== r.data.id)];
    }
  }
  async function remove(id: string) {
    if (!supabase || !confirm("Eliminare questo codice?")) return;
    await supabase.from("code_snippets").delete().eq("id", id);
    snippets = snippets.filter((x) => x.id !== id);
  }
  onDestroy(() => {
    worker?.terminate();
    clearInterval(timer);
    void supabase?.rpc("close_editor_session");
  });
</script>

<header class="page-head">
  <div>
    <p class="eyebrow">LABORATORIO LIBERO</p>
    <h1>Code now</h1>
    <p>Scrivi ed esegui liberamente codice Python nel browser.</p>
    {#if session.profile?.role === "teacher" && shared}<span class="success"
        >Codice docente disponibile agli studenti</span
      >{/if}
  </div>
  <div class="actions">
    {#if session.profile?.role === "student"}<button
        class="secondary"
        onclick={() => void copyTeacher()}>Copia codice prof</button
      >{/if}
  </div>
</header>
<section class="panel code-panel">
  <div class="savebar">
    <label
      >Nome del codice<input
        bind:value={snippetName}
        placeholder="es. Cicli e liste"
      /></label
    ><button class="secondary" onclick={() => void save()}
      >{activeId ? "Aggiorna" : "Salva codice"}</button
    >
  </div>
  {#key editorVersion}<PythonEditor
      bind:value={code}
      ariaLabel="Editor Code now"
      allowClipboard={true}
      onChange={(value) => void publish(value)}
    />{/key}
  <div class="code-now-console console">
    <header>
      <div class="console-heading">
        <strong>Output</strong><small
          >{running ? "Esecuzione in corso…" : "Pronto"}</small
        >
      </div>
      <div class="editor-actions" aria-label="Azioni del codice">
        <button
          class="secondary icon-button"
          aria-label="Scarica .py"
          title="Scarica il codice in formato .py"
          onclick={download}><Icon name="download" size={18} /></button
        ><button
          class="primary icon-button"
          aria-label="Run"
          title="Esegui il codice"
          disabled={running}
          onclick={() => run([])}><Icon name="play" size={18} /></button
        >
      </div>
    </header>
    <pre>{output}</pre>
    {#if inputPrompt !== null}<form
        class="input-form"
        onsubmit={(e) => {
          e.preventDefault();
          const nextInputs = [...inputs, inputValue];
          inputValue = "";
          run(nextInputs);
        }}
      >
        <label
          >{inputPrompt}<input
            aria-label="Valore per input Python"
            bind:value={inputValue}
          /></label
        ><button class="primary">Invia</button>
      </form>{/if}
  </div>
</section>
<section class="panel saved">
  <h2>Codici salvati</h2>
  {#each snippets as s}<article>
      <button
        class="quiet open"
        onclick={() => {
          activeId = s.id;
          snippetName = s.name;
          code = s.code;
        }}
        ><strong>{s.name}</strong><small
          >{new Date(s.updated_at).toLocaleDateString("it-IT")}</small
        ></button
      ><button
        aria-label={`Elimina ${s.name}`}
        class="quiet danger"
        onclick={() => void remove(s.id)}>Elimina</button
      >
    </article>{:else}<p class="empty-state">
      Non hai ancora salvato alcun codice.
    </p>{/each}
</section>

<style>
  .actions,
  .savebar {
    display: flex;
    align-items: end;
    gap: 0.6rem;
  }
  .code-panel {
    padding: 0;
    overflow: hidden;
  }
  .savebar {
    padding: 1rem;
  }
  .savebar label {
    flex: 1;
  }
  .console {
    border-top: var(--border);
    background: var(--color-surface-subtle);
  }
  .console header {
    display: flex;
    justify-content: space-between;
    padding: 0.8rem 1rem;
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
  .console pre {
    min-height: 100px;
    margin: 0;
    padding: 1rem;
    font-family: var(--font-code);
    white-space: pre-wrap;
  }
  .input-form {
    display: flex;
    align-items: end;
    gap: 0.7rem;
    padding: 1rem;
  }
  .input-form label {
    flex: 1;
  }
  .saved {
    margin-top: 1rem;
  }
  .saved article {
    display: flex;
    border-bottom: var(--border);
  }
  .open {
    flex: 1;
    display: grid;
    text-align: left;
    justify-content: start;
  }
  @media (max-width: 700px) {
    .actions,
    .page-head {
      align-items: stretch;
    }
    .actions {
      flex-wrap: wrap;
    }
    .savebar {
      align-items: stretch;
      flex-direction: column;
    }
  }
</style>
