<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import type { RealtimeChannel } from "@supabase/supabase-js";
  import { supabase } from "$lib/supabase";
  import { getCodeNowSettings, getSnippets } from "$lib/data";
  import { session } from "$lib/session.svelte";
  import PythonEditor from "$lib/PythonEditor.svelte";
  import Icon from "$lib/Icon.svelte";
  import type { CodeSnippet } from "$lib/types";
  import { m } from "$lib/paraglide/messages.js";
  import { formatDate } from "$lib/format";

  let code = $state<string>(m.code_now_starter()),
    output = $state<string>(m.editor_ready_output()),
    running = $state(false),
    inputs = $state<string[]>([]),
    inputPrompt = $state<string | null>(null),
    inputValue = $state(""),
    snippets = $state<CodeSnippet[]>([]),
    snippetName = $state(""),
    activeId = $state<string | null>(null),
    editorVersion = $state(0),
    sharingEnabled = $state(false),
    sharingReady = $state(false),
    sharingSaving = $state(false),
    saving = $state(false),
    saveName = $state(""),
    saveError = $state(""),
    saveFeedback = $state(""),
    saveDialog: HTMLDialogElement,
    worker: Worker | null = null,
    sharingChannel: RealtimeChannel | null = null,
    timer: ReturnType<typeof setInterval> | undefined;

  $effect(() => {
    const profile = session.profile;
    const client = supabase;
    if (!profile || !client) return;

    void getSnippets()
      .then((items) => (snippets = items))
      .catch(() => (output = m.code_now_load_error()));
    void getCodeNowSettings()
      .then((settings) => {
        sharingEnabled = settings?.sharing_enabled ?? false;
        sharingReady = true;
      })
      .catch(() => {
        sharingReady = true;
        output = m.code_now_sharing_error();
      });

    if (!sharingChannel) {
      sharingChannel = client
        .channel(`code-now-sharing-${profile.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "code_now_settings",
          },
          (payload) => {
            sharingEnabled = Boolean(payload.new.sharing_enabled);
            sharingReady = true;
          },
        )
        .subscribe();
    }

    if (profile.role !== "teacher") return;
    const beat = () =>
      client.rpc("publish_code_now", {
        current_code: untrack(() => code),
      });
    void beat();
    timer = setInterval(() => void beat(), 10_000);
    return () => clearInterval(timer);
  });

  function run(provided: string[] = []) {
    worker?.terminate();
    worker = new Worker("/pyodide-worker.js", { type: "module" });
    running = true;
    inputPrompt = null;
    inputs = provided;
    output = m.editor_running();
    const watchdog = setTimeout(() => {
      worker?.terminate();
      running = false;
      output = m.editor_timeout();
    }, 8000);
    worker.onmessage = (event) => {
      clearTimeout(watchdog);
      running = false;
      if (event.data.ok && event.data.inputRequired) {
        output = event.data.output || m.code_now_waiting_value();
        inputPrompt = event.data.prompt || m.code_now_enter_value();
      } else {
        output = event.data.ok
          ? event.data.output || m.editor_no_output()
          : m.editor_error({ error: event.data.error });
      }
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
    if (!supabase || !sharingEnabled) return;
    const result = await supabase.rpc("get_active_teacher_code");
    if (typeof result.data === "string") {
      code = result.data;
      activeId = null;
      snippetName = "";
      editorVersion += 1;
    } else output = m.code_now_teacher_unavailable();
  }

  async function publish(value: string) {
    if (!supabase || session.profile?.role !== "teacher") return;
    const result = await supabase.rpc("publish_code_now", {
      current_code: value,
    });
    if (result.error) output = m.code_now_sharing_error();
  }

  async function toggleSharing(value: boolean) {
    if (!supabase || session.profile?.role !== "teacher" || sharingSaving)
      return;
    sharingSaving = true;
    const result = await supabase
      .from("code_now_settings")
      .update({
        sharing_enabled: value,
        updated_at: new Date().toISOString(),
      })
      .eq("singleton", true);
    sharingSaving = false;
    if (result.error) {
      output = m.code_now_sharing_error();
      return;
    }
    sharingEnabled = value;
  }

  function download() {
    const url = URL.createObjectURL(
      new Blob([code], { type: "text/x-python" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "code-now.py";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function openSaveDialog() {
    saveName = snippetName;
    saveError = "";
    saveFeedback = "";
    saveDialog.showModal();
  }

  async function save(mode: "update" | "copy") {
    if (!supabase || !session.profile || saving) return;
    const name = saveName.trim();
    if (!name) {
      saveError = m.code_now_name_required();
      return;
    }

    saving = true;
    saveError = "";
    const payload = {
      owner_id: session.profile.id,
      name,
      code,
      updated_at: new Date().toISOString(),
    };
    const result =
      mode === "update" && activeId
        ? await supabase
            .from("code_snippets")
            .update(payload)
            .eq("id", activeId)
            .select()
            .single()
        : await supabase
            .from("code_snippets")
            .insert(payload)
            .select()
            .single();
    saving = false;
    if (result.error) {
      saveError = m.code_now_save_error();
      return;
    }

    const saved = result.data as CodeSnippet;
    activeId = saved.id;
    snippetName = saved.name;
    snippets = [saved, ...snippets.filter((item) => item.id !== saved.id)];
    saveFeedback =
      mode === "copy"
        ? m.code_now_copy_created({ name: saved.name })
        : m.code_now_saved_as({ name: saved.name });
    saveDialog.close();
  }

  async function remove(id: string) {
    if (!supabase || !confirm(m.code_now_delete_confirm())) return;
    const result = await supabase.from("code_snippets").delete().eq("id", id);
    if (result.error) return;
    snippets = snippets.filter((item) => item.id !== id);
    if (activeId === id) {
      activeId = null;
      snippetName = "";
    }
  }

  onDestroy(() => {
    worker?.terminate();
    clearInterval(timer);
    if (sharingChannel && supabase) void supabase.removeChannel(sharingChannel);
    void supabase?.rpc("close_editor_session");
  });
</script>

<header class="page-head">
  <div>
    <p class="eyebrow">{m.code_now_lab_eyebrow()}</p>
    <h1>{m.code_now_title()}</h1>
    <p>{m.code_now_browser_intro()}</p>
  </div>
  <div class="actions">
    {#if session.profile?.role === "teacher"}<label class="share-control">
        <input
          type="checkbox"
          checked={sharingEnabled}
          disabled={!sharingReady || sharingSaving}
          oninput={(event) => void toggleSharing(event.currentTarget.checked)}
        />
        <span>{m.code_now_share_with_students()}</span>
      </label>{:else if session.profile?.role === "student"}<div
        class="student-share"
        aria-live="polite"
      >
        <button
          class="secondary"
          disabled={!sharingReady || !sharingEnabled}
          onclick={() => void copyTeacher()}>{m.code_now_copy_teacher()}</button
        >
        <small
          >{sharingEnabled
            ? m.code_now_teacher_available()
            : m.code_now_teacher_disabled()}</small
        >
      </div>{/if}
  </div>
</header>

<section class="panel code-panel">
  {#key editorVersion}<PythonEditor
      bind:value={code}
      ariaLabel={m.code_now_editor_aria()}
      allowClipboard={true}
      onChange={(value) => void publish(value)}
    />{/key}
  <div class="code-now-console console">
    <header>
      <div class="console-heading">
        <strong>{m.common_output()}</strong><small
          >{running ? m.editor_running() : m.common_ready()}</small
        >
      </div>
      <div class="editor-actions" aria-label={m.code_now_actions()}>
        <button
          class="secondary icon-button"
          aria-label={m.code_now_download_aria()}
          title={m.code_now_download_title()}
          onclick={download}><Icon name="download" size={18} /></button
        ><button
          class="secondary icon-button"
          aria-label={m.code_now_save_aria()}
          title={m.code_now_save_title()}
          onclick={openSaveDialog}><Icon name="save" size={18} /></button
        ><button
          class="primary icon-button"
          aria-label={m.common_run()}
          title={m.editor_run_title()}
          disabled={running}
          onclick={() => run([])}><Icon name="play" size={18} /></button
        >
      </div>
    </header>
    <pre>{output}</pre>
    {#if inputPrompt !== null}<form
        class="input-form"
        onsubmit={(event) => {
          event.preventDefault();
          const nextInputs = [...inputs, inputValue];
          inputValue = "";
          run(nextInputs);
        }}
      >
        <label
          >{inputPrompt}<input
            aria-label={m.code_now_python_input()}
            bind:value={inputValue}
          /></label
        ><button class="primary">{m.code_now_send()}</button>
      </form>{/if}
  </div>
</section>

<section class="panel saved">
  <h2>{m.code_now_saved_codes()}</h2>
  {#each snippets as snippet}<article class:active={activeId === snippet.id}>
      <button
        class="quiet open"
        aria-current={activeId === snippet.id ? "true" : undefined}
        onclick={() => {
          activeId = snippet.id;
          snippetName = snippet.name;
          code = snippet.code;
          editorVersion += 1;
        }}
        ><strong>{snippet.name}</strong><small
          >{formatDate(snippet.updated_at)}</small
        ></button
      ><button
        aria-label={m.code_now_delete_named({ name: snippet.name })}
        class="quiet danger"
        onclick={() => void remove(snippet.id)}>{m.common_delete()}</button
      >
    </article>{:else}<p class="empty-state">
      {m.code_now_none_saved()}
    </p>{/each}
</section>

<dialog
  class="save-dialog"
  aria-labelledby="save-dialog-title"
  bind:this={saveDialog}
  onclose={() => (saveError = "")}
>
  <div class="dialog-head">
    <div>
      <p class="eyebrow">{m.code_now_save_dialog_eyebrow()}</p>
      <h2 id="save-dialog-title">
        {activeId
          ? m.code_now_save_dialog_existing()
          : m.code_now_save_dialog_new()}
      </h2>
    </div>
    <button
      class="quiet close-button"
      aria-label={m.code_now_close_save_dialog()}
      title={m.code_now_close_save_dialog()}
      onclick={() => saveDialog.close()}><Icon name="close" size={20} /></button
    >
  </div>
  <p>
    {activeId ? m.code_now_save_existing_intro() : m.code_now_save_new_intro()}
  </p>
  <form
    onsubmit={(event) => {
      event.preventDefault();
      void save("update");
    }}
  >
    <label
      >{m.code_now_snippet_name()}<input
        bind:value={saveName}
        maxlength="120"
        autocomplete="off"
        placeholder={m.code_now_name_placeholder()}
      /></label
    >
    {#if saveError}<p class="error" role="alert">{saveError}</p>{/if}
    <div class="dialog-actions">
      <button type="button" class="quiet" onclick={() => saveDialog.close()}
        >{m.common_cancel()}</button
      >
      {#if activeId}<button
          type="button"
          class="secondary"
          disabled={saving}
          onclick={() => void save("copy")}
          ><Icon name="copy" size={18} />{m.code_now_create_copy()}</button
        >{/if}
      <button class="primary" disabled={saving}
        >{saving
          ? m.code_now_saving()
          : activeId
            ? m.code_now_save_changes()
            : m.code_now_save()}</button
      >
    </div>
  </form>
</dialog>

{#if saveFeedback}<p class="toast" role="status">{saveFeedback}</p>{/if}

<style>
  .actions {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
  }
  .share-control {
    display: flex;
    align-items: center;
    min-height: var(--control-min-height);
    grid-template-columns: auto 1fr;
    gap: var(--space-3);
    border: var(--border-strong);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
    background: var(--color-surface-subtle);
  }
  .student-share {
    display: grid;
    justify-items: end;
    gap: var(--space-2);
  }
  .code-panel {
    padding: 0;
    overflow: hidden;
  }
  .console {
    border-top: var(--border);
    background: var(--color-surface-subtle);
  }
  .console header {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-4);
  }
  .console-heading {
    display: grid;
    gap: var(--space-1);
  }
  .editor-actions {
    display: flex;
    gap: var(--space-2);
  }
  .icon-button,
  .close-button {
    width: var(--control-min-height);
    padding: 0;
  }
  .console pre {
    min-height: 100px;
    margin: 0;
    padding: var(--space-4);
    font-family: var(--font-code);
    white-space: pre-wrap;
  }
  .input-form {
    display: flex;
    align-items: end;
    gap: var(--space-3);
    padding: var(--space-4);
  }
  .input-form label {
    flex: 1;
  }
  .saved {
    margin-top: var(--space-4);
  }
  .saved article {
    display: flex;
    border-bottom: var(--border);
  }
  .saved article.active {
    background: var(--color-primary-surface);
  }
  .open {
    flex: 1;
    display: grid;
    min-width: 0;
    text-align: left;
    justify-content: start;
  }
  .open strong {
    overflow-wrap: anywhere;
  }
  .save-dialog {
    width: min(92vw, 32rem);
    border: var(--border-strong);
    border-radius: var(--radius-xl);
    padding: clamp(var(--space-5), 4vw, var(--space-8));
    color: var(--color-foreground);
    background: var(--color-surface);
    box-shadow: var(--shadow-lg);
  }
  .save-dialog::backdrop {
    background: rgb(0 0 0 / 72%);
    backdrop-filter: blur(3px);
  }
  .dialog-head,
  .dialog-actions {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-4);
  }
  .dialog-head h2 {
    margin-bottom: var(--space-4);
  }
  .dialog-actions {
    justify-content: flex-end;
    margin-top: var(--space-5);
  }
  @media (max-width: 700px) {
    .actions,
    .page-head {
      align-items: stretch;
    }
    .share-control,
    .student-share,
    .student-share button {
      width: 100%;
    }
    .student-share {
      justify-items: stretch;
    }
    .dialog-actions {
      flex-direction: column-reverse;
      align-items: stretch;
    }
    .dialog-actions button {
      width: 100%;
    }
  }
</style>
