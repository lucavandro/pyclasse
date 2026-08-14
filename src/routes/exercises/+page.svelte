<script lang="ts">
  import { getExerciseTransferData, getExercises } from "$lib/data";
  import Icon from "$lib/Icon.svelte";
  import { supabase } from "$lib/supabase";
  import { session } from "$lib/session.svelte";
  import type { Exercise, Assignment, Classroom, Submission } from "$lib/types";
  import {
    buildExerciseTransfer,
    parseExerciseTransfer,
  } from "../../../lib/exercise-transfer.mjs";
  let exercises = $state<Exercise[]>([]),
    assignments = $state<Assignment[]>([]),
    classes = $state<Classroom[]>([]),
    submissions = $state<Submission[]>([]),
    loading = $state(true),
    error = $state(""),
    transferStatus = $state(""),
    search = $state(""),
    tag = $state(""),
    tab = $state<"assigned" | "submitted">("assigned"),
    importError = $state(""),
    importing = $state(false),
    dragging = $state(false),
    importDocument = $state<ReturnType<typeof parseExerciseTransfer> | null>(
      null,
    ),
    importFileName = $state("");
  let importDialog = $state<HTMLDialogElement>();
  let fileInput = $state<HTMLInputElement>();

  async function loadArchive() {
    loading = true;
    error = "";
    try {
      [exercises, assignments, classes, submissions] = await getExercises();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      loading = false;
    }
  }
  $effect(() => {
    if (!session.profile) return;
    void loadArchive();
  });

  async function exportExercises() {
    if (session.profile?.role !== "teacher") return;
    transferStatus = "";
    try {
      const [library, tests] = await getExerciseTransferData();
      const transferDocument = buildExerciseTransfer(library, tests);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(transferDocument, null, 2)], {
          type: "application/json",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `pyclasse-exercises-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      transferStatus = `${library.length} esercizi esportati in JSON.`;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
  }

  function openImport() {
    importError = "";
    importDocument = null;
    importFileName = "";
    if (fileInput) fileInput.value = "";
    importDialog?.showModal();
  }

  async function validateFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    importFileName = file.name;
    importError = "";
    importDocument = null;
    try {
      if (!file.name.toLowerCase().endsWith(".json"))
        throw new Error("Seleziona un file con estensione .json");
      importDocument = parseExerciseTransfer(await file.text());
    } catch (cause) {
      importError = cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function importExercises() {
    if (!supabase || session.profile?.role !== "teacher" || !importDocument)
      return;
    importing = true;
    importError = "";
    const createdIds: string[] = [];
    try {
      for (const exercise of importDocument.exercises) {
        const { tests, ...exercisePayload } = exercise;
        const created = await supabase
          .from("exercises")
          .insert({ ...exercisePayload, teacher_id: session.profile.id })
          .select("id")
          .single();
        if (created.error) throw created.error;
        createdIds.push(created.data.id);
        if (tests.length) {
          const insertedTests = await supabase.from("tests").insert(
            tests.map((test) => ({
              ...test,
              exercise_id: created.data.id,
            })),
          );
          if (insertedTests.error) throw insertedTests.error;
        }
      }
      transferStatus = `${createdIds.length} esercizi importati. Le assegnazioni alle classi non sono state modificate.`;
      importDialog?.close();
      await loadArchive();
    } catch (cause) {
      if (createdIds.length)
        await supabase.from("exercises").delete().in("id", createdIds);
      importError = cause instanceof Error ? cause.message : String(cause);
    } finally {
      importing = false;
    }
  }
  const tags = $derived([...new Set(exercises.flatMap((x) => x.tags))]);
  const summary = (value: string) =>
    value
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[#>*_`[\]()!-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 145);
  const filtered = $derived(
    exercises.filter(
      (e) =>
        (!search || e.title.toLowerCase().includes(search.toLowerCase())) &&
        (!tag || e.tags.includes(tag)),
    ),
  );
  const studentRows = $derived(
    assignments
      .map((a) => ({
        assignment: a,
        exercise: exercises.find((e) => e.id === a.exercise_id),
        submission: submissions.find(
          (s) =>
            s.class_assignment_id === a.id &&
            s.student_id === session.profile?.id,
        ),
      }))
      .filter(
        (x) =>
          x.exercise &&
          (tab === "submitted"
            ? x.submission?.status !== "draft"
            : !x.submission || x.submission.status === "draft"),
      ),
  );
</script>

<header class="page-head">
  <div>
    <p class="eyebrow">ESERCIZI</p>
    <h1>
      {session.profile?.role === "teacher"
        ? "Archivio esercizi"
        : "I tuoi esercizi"}
    </h1>
  </div>
  {#if session.profile?.role === "teacher"}<div class="archive-actions">
      <button
        class="secondary"
        title="Esporta tutti gli esercizi in JSON"
        disabled={loading || exercises.length === 0}
        onclick={() => void exportExercises()}
        ><Icon name="download" size={18} />Esporta JSON</button
      ><button class="secondary" onclick={openImport}
        ><Icon name="upload" size={18} />Importa JSON</button
      ><a class="button primary" role="button" href="/exercises/new"
        >Nuovo esercizio</a
      >
    </div>{/if}
</header>
{#if transferStatus}<p class="success" role="status">{transferStatus}</p>{/if}
{#if session.profile?.role === "teacher"}<div class="filters">
    <label
      >Cerca esercizio per nome<input
        aria-label="Cerca esercizio per nome"
        bind:value={search}
      /></label
    ><label
      >Filtra per tag<select aria-label="Filtra per tag" bind:value={tag}
        ><option value="">Tutti i tag</option>{#each tags as t}<option
            >{t}</option
          >{/each}</select
      ></label
    >
  </div>{:else}<div class="tabs" role="tablist">
    <button
      role="tab"
      aria-selected={tab === "assigned"}
      onclick={() => (tab = "assigned")}
      >Da svolgere {studentRows.filter(
        (x) => !x.submission || x.submission.status === "draft",
      ).length}</button
    ><button
      role="tab"
      aria-selected={tab === "submitted"}
      onclick={() => (tab = "submitted")}
      >Consegnati {submissions.filter(
        (s) => s.student_id === session.profile?.id && s.status !== "draft",
      ).length}</button
    >
  </div>{/if}
{#if error}<p class="error">{error}</p>{:else if loading}<div
    class="spinner"
  ></div>{:else}<section class="cards">
    {#if session.profile?.role === "teacher"}{#each filtered as ex}<article
          class="card"
        >
          <div class="tags">
            {#each ex.tags as t}<span class="tag">#{t}</span>{/each}
          </div>
          <h2>{ex.title}</h2>
          <p>{summary(ex.description)}</p>
          {#each assignments.filter((a) => a.exercise_id === ex.id) as ass}<p>
              {classes.find((c) => c.id === ass.class_id)?.name}
            </p>{/each}
          <div class="card-actions">
            <a class="button primary" role="button" href={`/exercises/${ex.id}`}
              >Inizia</a
            ><a class="button secondary" href={`/exercises/${ex.id}/edit`}
              >Modifica</a
            >
          </div>
        </article>{:else}<p class="empty-state">
          Nessun esercizio disponibile.
        </p>{/each}
    {:else}{#each studentRows as item}{#if item.exercise}<article class="card">
            <div class="tags">
              {#each item.exercise.tags as t}<span class="tag">#{t}</span
                >{/each}
            </div>
            <h2>{item.exercise.title}</h2>
            <p>{summary(item.exercise.description)}</p>
            <p class="student-task-deadline">
              {item.assignment.deadline
                ? `Scadenza ${new Date(item.assignment.deadline).toLocaleDateString("it-IT")}`
                : "Nessuna scadenza"}
            </p>
            {#if item.assignment.grading_scale}<p class="student-task-grading">
                Voto in {item.assignment.grading_scale === 10
                  ? "decimi"
                  : "centesimi"}
              </p>{/if}
            <p>
              {classes.find((c) => c.id === item.assignment.class_id)?.name}
            </p>
            <div class="card-actions">
              <a
                class="button primary"
                role="button"
                href={`/exercises/${item.exercise.id}`}
                >{item.submission && item.submission.status !== "draft"
                  ? "Rivedi consegna"
                  : "Inizia"}</a
              >
            </div>
          </article>{/if}{:else}<p class="empty-state">
          Nessun esercizio disponibile.
        </p>{/each}{/if}
  </section>{/if}

{#if session.profile?.role === "teacher"}<dialog
    class="import-dialog"
    aria-labelledby="import-title"
    bind:this={importDialog}
  >
    <div class="dialog-head">
      <div>
        <p class="eyebrow">IMPORTAZIONE JSON</p>
        <h2 id="import-title">Importa esercizi</h2>
      </div>
      <button
        class="quiet close-button"
        aria-label="Chiudi importazione"
        title="Chiudi"
        onclick={() => importDialog?.close()}>×</button
      >
    </div>
    <p>
      Il file viene validato nel browser. Classi, studenti, assegnazioni e
      valutazioni non vengono importati.
    </p>
    <button
      type="button"
      class:dragging
      class="drop-zone"
      ondragenter={(event) => {
        event.preventDefault();
        dragging = true;
      }}
      ondragover={(event) => event.preventDefault()}
      ondragleave={() => (dragging = false)}
      ondrop={(event) => {
        event.preventDefault();
        dragging = false;
        void validateFile(event.dataTransfer?.files || null);
      }}
      onclick={() => fileInput?.click()}
    >
      <Icon name="upload" size={28} />
      <strong>Trascina qui il file JSON</strong>
      <span>oppure selezionalo da Esplora risorse</span>
    </button>
    <input
      class="file-input"
      bind:this={fileInput}
      aria-label="File JSON da importare"
      type="file"
      accept=".json,application/json"
      onchange={(event) =>
        void validateFile((event.currentTarget as HTMLInputElement).files)}
    />
    {#if importFileName}<p class="selected-file">
        File selezionato: <strong>{importFileName}</strong>
      </p>{/if}
    {#if importError}<p class="error" role="alert">{importError}</p>{/if}
    {#if importDocument}<div class="import-preview" role="status">
        <strong>File valido</strong>
        <p>
          {importDocument.exercises.length} esercizi pronti per l’importazione.
        </p>
        <ul>
          {#each importDocument.exercises.slice(0, 5) as exercise}<li>
              {exercise.title}
            </li>{/each}
        </ul>
      </div>{/if}
    <div class="dialog-actions">
      <button class="quiet" onclick={() => importDialog?.close()}
        >Annulla</button
      >
      <button
        class="primary"
        disabled={!importDocument || importing}
        onclick={() => void importExercises()}
        >{importing ? "Importazione…" : "Importa esercizi"}</button
      >
    </div>
  </dialog>{/if}

<style>
  .archive-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--space-2);
  }
  .success {
    margin-bottom: var(--space-5);
  }
  .filters {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .card h2 {
    margin-top: 1rem;
  }
  .import-dialog {
    width: min(92vw, 42rem);
    max-height: 90vh;
    border: var(--border-strong);
    border-radius: var(--radius-xl);
    padding: clamp(1.25rem, 4vw, 2rem);
    overflow: auto;
    color: var(--color-foreground);
    background: var(--color-surface);
    box-shadow: var(--shadow-lg);
  }
  .import-dialog::backdrop {
    background: rgb(0 0 0 / 72%);
    backdrop-filter: blur(3px);
  }
  .dialog-head,
  .dialog-actions {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    align-items: flex-start;
  }
  .dialog-head h2 {
    margin-bottom: var(--space-4);
  }
  .close-button {
    width: var(--control-min-height);
    padding: 0;
    font-size: 1.6rem;
  }
  .drop-zone {
    display: grid;
    width: 100%;
    min-height: 12rem;
    place-items: center;
    gap: var(--space-2);
    margin: var(--space-5) 0;
    border: 2px dashed var(--color-border-strong);
    padding: var(--space-6);
    background: var(--color-surface-subtle);
    text-align: center;
  }
  .drop-zone.dragging,
  .drop-zone:hover {
    border-color: var(--color-primary-soft);
    background: var(--color-primary-surface);
  }
  .drop-zone span {
    color: var(--color-muted);
    font-weight: 500;
  }
  .file-input {
    position: absolute;
    width: 1px;
    height: 1px;
    min-height: 0;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }
  .selected-file {
    overflow-wrap: anywhere;
  }
  .import-preview {
    margin: var(--space-4) 0;
    border-radius: var(--radius-md);
    padding: var(--space-4);
    color: #7ee6b7;
    background: rgb(66 211 146 / 10%);
  }
  .import-preview p {
    margin: var(--space-1) 0;
  }
  .import-preview ul {
    margin-bottom: 0;
  }
  .dialog-actions {
    justify-content: flex-end;
    margin-top: var(--space-6);
  }
  @media (max-width: 650px) {
    .filters {
      grid-template-columns: 1fr;
    }
    .archive-actions {
      width: 100%;
      justify-content: stretch;
    }
    .archive-actions > * {
      flex: 1 1 100%;
    }
    .dialog-actions {
      align-items: stretch;
      flex-direction: column-reverse;
    }
  }
</style>
