<script lang="ts">
  import { goto } from "$app/navigation";
  import { supabase } from "$lib/supabase";
  import { getClasses, getExercise } from "$lib/data";
  import { session } from "$lib/session.svelte";
  import type { Classroom } from "$lib/types";
  let { id }: { id?: string } = $props();
  let title = $state(""),
    description = $state(""),
    resourceUrl = $state(""),
    resourceLabel = $state(""),
    constraints = $state(""),
    starterCode = $state("# Scrivi qui il codice iniziale\n"),
    tags = $state(""),
    maxPoints = $state(100),
    isPrerequisite = $state(true),
    verificationMode = $state<"tests" | "ai">("tests"),
    tests = $state<{ input: string; expected: string; points: number }[]>([]),
    classes = $state<Classroom[]>([]),
    selected = $state<Record<string, boolean>>({}),
    scales = $state<Record<string, string>>({}),
    error = $state(""),
    busy = $state(false),
    aiPrompt = $state(""),
    loaded = false;
  $effect(() => {
    if (!session.profile || loaded) return;
    loaded = true;
    void (async () => {
      const [c] = await getClasses();
      classes = c;
      if (id) {
        const d = await getExercise(id);
        title = d.exercise.title;
        description = d.exercise.description;
        resourceUrl = d.exercise.resource_url || "";
        resourceLabel = d.exercise.resource_label || "";
        constraints = d.exercise.constraints;
        starterCode = d.exercise.starter_code;
        tags = d.exercise.tags.join(", ");
        maxPoints = d.exercise.max_points;
        isPrerequisite = d.exercise.is_prerequisite;
        verificationMode = d.exercise.verification_mode;
        tests = d.tests.map((t) => ({
          input: t.input_data,
          expected: t.expected_output,
          points: t.points,
        }));
        for (const a of d.assignments) {
          selected[a.class_id] = true;
          scales[a.class_id] = a.grading_scale ? String(a.grading_scale) : "";
        }
      }
    })();
  });
  async function save() {
    if (!supabase || !session.profile) return;
    busy = true;
    error = "";
    const payload = {
      teacher_id: session.profile.id,
      title,
      description,
      description_format: "markdown",
      resource_url: resourceUrl || null,
      resource_label: resourceLabel || null,
      constraints,
      starter_code: starterCode,
      verification_mode: verificationMode,
      max_points: maxPoints,
      is_prerequisite: isPrerequisite,
      tags: [
        ...new Set(
          tags
            .split(",")
            .map((x) => x.trim().toLowerCase())
            .filter(Boolean),
        ),
      ],
    };
    const r = id
      ? await supabase
          .from("exercises")
          .update(payload)
          .eq("id", id)
          .select("id")
          .single()
      : await supabase.from("exercises").insert(payload).select("id").single();
    if (r.error) {
      error = r.error.message;
      busy = false;
      return;
    }
    const exerciseId = r.data.id;
    await supabase.from("tests").delete().eq("exercise_id", exerciseId);
    if (verificationMode === "tests" && tests.length) {
      const tr = await supabase.from("tests").insert(
        tests.map((t, i) => ({
          exercise_id: exerciseId,
          position: i + 1,
          input_data: t.input,
          expected_output: t.expected,
          is_hidden: false,
          points: t.points,
        })),
      );
      if (tr.error) error = tr.error.message;
    }
    await supabase
      .from("class_assignments")
      .delete()
      .eq("exercise_id", exerciseId);
    const assignments = classes
      .filter((c) => selected[c.id])
      .map((c, i) => ({
        exercise_id: exerciseId,
        class_id: c.id,
        position: i + 1,
        published_at: new Date().toISOString(),
        grading_scale: scales[c.id] ? Number(scales[c.id]) : null,
      }));
    if (assignments.length) {
      const ar = await supabase.from("class_assignments").insert(assignments);
      if (ar.error) error = ar.error.message;
    }
    busy = false;
    if (!error) await goto("/exercises");
  }
  async function generateDraft() {
    if (!aiPrompt.trim() || !session.profile) return;
    busy = true;
    const { generateExerciseWithAi } = await import("../../lib/ai-feedback");
    const generated = await generateExerciseWithAi(
      aiPrompt,
      session.profile.external_ai_enabled,
    );
    title = generated.title;
    description = generated.description;
    starterCode = generated.starterCode;
    constraints = generated.constraints;
    maxPoints = generated.maxPoints;
    tests = generated.tests.map((test) => ({
      input: test.input,
      expected: test.expected,
      points: Math.round(generated.maxPoints / generated.tests.length),
    }));
    verificationMode = "tests";
    busy = false;
  }
</script>

<header class="page-head">
  <div>
    <p class="eyebrow">{id ? "MODIFICA" : "NUOVO"} ESERCIZIO</p>
    <h1>{id ? "Modifica esercizio" : "Crea un esercizio"}</h1>
  </div>
</header>
<form
  class="form-grid"
  onsubmit={(e) => {
    e.preventDefault();
    void save();
  }}
>
  <section class="panel ai-generator form-grid">
    <h2>Assistente per la bozza</h2>
    <label
      >Descrivi l’esercizio da preparare<textarea
        aria-label="Richiesta per generare esercizio"
        bind:value={aiPrompt}
      ></textarea></label
    >
    <button
      type="button"
      class="secondary"
      disabled={busy}
      onclick={() => void generateDraft()}>Genera bozza con IA</button
    >
    <small
      >Senza consenso viene creata una bozza locale. Il trasferimento a Puter
      avviene soltanto se abilitato nelle impostazioni privacy.</small
    >
  </section>
  <section class="panel form-grid">
    <label
      >Titolo<input
        aria-label="Titolo"
        bind:value={title}
        maxlength="160"
        required
      /></label
    ><label
      >Traccia Markdown<textarea
        aria-label="Traccia Markdown"
        bind:value={description}
        required
      ></textarea></label
    >
    <div class="form-row">
      <label
        >Link risorsa esterna<input
          aria-label="Link risorsa esterna"
          type="url"
          bind:value={resourceUrl}
        /></label
      ><label
        >Titolo risorsa<input
          aria-label="Titolo risorsa"
          bind:value={resourceLabel}
        /></label
      >
    </div>
    <label>Vincoli<textarea bind:value={constraints}></textarea></label><label
      >Codice iniziale<textarea
        aria-label="Codice iniziale"
        class="code"
        bind:value={starterCode}
      ></textarea></label
    >
    <div class="form-row">
      <label
        >Tag<input
          aria-label="Tag"
          placeholder="liste, cicli"
          bind:value={tags}
        /></label
      ><label
        >Punti massimi<input
          type="number"
          min="1"
          bind:value={maxPoints}
        /></label
      >
    </div>
    <label class="prerequisite-control"
      ><input
        type="checkbox"
        aria-label="Esercizio propedeutico"
        bind:checked={isPrerequisite}
      />
      Esercizio propedeutico
      <small
        >Blocca le attività successive finché lo studente non consegna.</small
      ></label
    >
  </section>
  <section class="panel">
    <h2>Verifica</h2>
    <div class="verification-grid">
      <label class="verification-card"
        ><input type="radio" bind:group={verificationMode} value="tests" /> Test
        automatici</label
      ><label class="verification-card"
        ><input type="radio" bind:group={verificationMode} value="ai" /> Verifica
        IA</label
      >
    </div>
    {#if verificationMode === "tests"}{#each tests as test, i}<div
          class="test-row"
        >
          <label
            >Input test {i + 1}<input
              aria-label={`Input test ${i + 1}`}
              bind:value={test.input}
            /></label
          ><label
            >Output test {i + 1}<input
              aria-label={`Output test ${i + 1}`}
              bind:value={test.expected}
            /></label
          >
        </div>{/each}<button
        type="button"
        class="secondary"
        onclick={() => tests.push({ input: "", expected: "", points: 100 })}
        >Aggiungi</button
      >{/if}
  </section>
  <section class="panel">
    <h2>Assegna alle classi</h2>
    {#each classes as c}<div class="assignment">
        <label
          ><input
            type="checkbox"
            aria-label={c.name}
            bind:checked={selected[c.id]}
          />
          {c.name}</label
        ><label
          >Scala voto per {c.name}<select
            aria-label={`Scala voto per ${c.name}`}
            bind:value={scales[c.id]}
            ><option value="">Nessun voto</option><option value="10">10</option
            ><option value="100">100</option></select
          ></label
        >
      </div>{:else}<p class="empty-state">Crea prima una classe.</p>{/each}
  </section>
  {#if error}<p class="error">{error}</p>{/if}<button
    class="primary save"
    disabled={busy}>Salva esercizio</button
  >
</form>

<style>
  .code {
    font-family: var(--font-code);
  }
  .prerequisite-control {
    grid-template-columns: auto 1fr;
    align-items: center;
  }
  .prerequisite-control input,
  .verification-card input,
  .assignment input {
    width: auto;
  }
  .prerequisite-control small {
    grid-column: 2;
  }
  .verification-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .verification-card {
    display: flex;
    align-items: center;
    padding: 1rem;
    border: var(--border);
    border-radius: var(--radius-md);
    background: var(--color-surface-subtle);
    cursor: pointer;
  }
  .verification-card:has(input:checked) {
    border-color: var(--color-primary);
    background: var(--color-primary-surface);
    box-shadow: var(--focus-ring);
  }
  .test-row,
  .assignment {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    align-items: center;
    margin: 1rem 0;
  }
  .save {
    justify-self: end;
  }
  @media (max-width: 650px) {
    .verification-grid,
    .test-row,
    .assignment {
      grid-template-columns: 1fr;
    }
  }
</style>
