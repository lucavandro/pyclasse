<script lang="ts">
  import { goto } from "$app/navigation";
  import { supabase } from "$lib/supabase";
  import { getClasses, getExercise } from "$lib/data";
  import { session } from "$lib/session.svelte";
  import type { Classroom } from "$lib/types";
  import { m } from "$lib/paraglide/messages.js";
  let { id }: { id?: string } = $props();
  let title = $state(""),
    description = $state(""),
    resourceUrl = $state(""),
    resourceLabel = $state(""),
    constraints = $state(""),
    starterCode = $state<string>(m.exercise_starter_code_default()),
    tags = $state(""),
    maxPoints = $state(100),
    isPrerequisite = $state(true),
    verificationMode = $state<"tests" | "ai">("tests"),
    tests = $state<{ input: string; expected: string; points: number }[]>([]),
    classes = $state<Classroom[]>([]),
    selected = $state<Record<string, boolean>>({}),
    scales = $state<Record<string, string>>({}),
    deadlines = $state<Record<string, string>>({}),
    error = $state(""),
    busy = $state(false),
    aiPrompt = $state(""),
    loaded = false;
  const toLocalDateTime = (value: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };
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
          deadlines[a.class_id] = toLocalDateTime(a.deadline);
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
        deadline: deadlines[c.id]
          ? new Date(deadlines[c.id]).toISOString()
          : null,
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
    <p class="eyebrow">
      {id ? m.exercise_edit_eyebrow() : m.exercise_new_eyebrow()}
    </p>
    <h1>{id ? m.exercise_edit() : m.exercise_create()}</h1>
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
    <h2>{m.exercise_draft_assistant()}</h2>
    <label
      >{m.exercise_draft_prompt()}<textarea
        aria-label={m.exercise_draft_prompt_aria()}
        bind:value={aiPrompt}
      ></textarea></label
    >
    <button
      type="button"
      class="secondary"
      disabled={busy}
      onclick={() => void generateDraft()}>{m.exercise_generate_ai()}</button
    >
    <small>{m.exercise_ai_privacy()}</small>
  </section>
  <section class="panel form-grid">
    <label
      >{m.common_title()}<input
        aria-label={m.common_title()}
        bind:value={title}
        maxlength="160"
        required
      /></label
    ><label
      >{m.exercise_markdown_prompt()}<textarea
        aria-label={m.exercise_markdown_prompt()}
        bind:value={description}
        required
      ></textarea></label
    >
    <div class="form-row">
      <label
        >{m.exercise_external_url()}<input
          aria-label={m.exercise_external_url()}
          type="url"
          bind:value={resourceUrl}
        /></label
      ><label
        >{m.exercise_resource_title()}<input
          aria-label={m.exercise_resource_title()}
          bind:value={resourceLabel}
        /></label
      >
    </div>
    <label
      >{m.exercise_constraints()}<textarea bind:value={constraints}
      ></textarea></label
    ><label
      >{m.exercise_starter_code()}<textarea
        aria-label={m.exercise_starter_code()}
        class="code"
        bind:value={starterCode}
      ></textarea></label
    >
    <div class="form-row">
      <label
        >{m.exercise_tags()}<input
          aria-label={m.exercise_tags()}
          placeholder={m.exercise_tags_placeholder()}
          bind:value={tags}
        /></label
      ><label
        >{m.exercise_max_points()}<input
          type="number"
          min="1"
          bind:value={maxPoints}
        /></label
      >
    </div>
    <label class="prerequisite-control"
      ><input
        type="checkbox"
        aria-label={m.exercise_prerequisite()}
        bind:checked={isPrerequisite}
      />
      {m.exercise_prerequisite()}
      <small>{m.exercise_prerequisite_help()}</small></label
    >
  </section>
  <section class="panel">
    <h2>{m.exercise_verification()}</h2>
    <div class="verification-grid">
      <label class="verification-card"
        ><input type="radio" bind:group={verificationMode} value="tests" />
        {m.exercise_automatic_tests()}</label
      ><label class="verification-card"
        ><input type="radio" bind:group={verificationMode} value="ai" />
        {m.exercise_ai_verification()}</label
      >
    </div>
    {#if verificationMode === "tests"}{#each tests as test, i}<div
          class="test-row"
        >
          <label
            >{m.exercise_test_input({ number: i + 1 })}<input
              aria-label={m.exercise_test_input({ number: i + 1 })}
              bind:value={test.input}
            /></label
          ><label
            >{m.exercise_test_output({ number: i + 1 })}<input
              aria-label={m.exercise_test_output({ number: i + 1 })}
              bind:value={test.expected}
            /></label
          >
        </div>{/each}<button
        type="button"
        class="secondary"
        onclick={() => tests.push({ input: "", expected: "", points: 100 })}
        >{m.common_add()}</button
      >{/if}
  </section>
  <section class="panel">
    <h2>{m.exercise_assign_classes()}</h2>
    {#each classes as c}<div class="assignment">
        <label class="assignment-toggle"
          ><input
            type="checkbox"
            aria-label={c.name}
            bind:checked={selected[c.id]}
          />
          {c.name}</label
        ><label
          >{m.exercise_grade_scale_for({ name: c.name })}<select
            aria-label={m.exercise_grade_scale_for({ name: c.name })}
            bind:value={scales[c.id]}
            ><option value="">{m.exercise_no_grade()}</option><option value="10"
              >10</option
            ><option value="100">100</option></select
          ></label
        ><label
          >{m.exercise_deadline_for({ name: c.name })}<input
            type="datetime-local"
            aria-label={m.exercise_deadline_for({ name: c.name })}
            bind:value={deadlines[c.id]}
            disabled={!selected[c.id]}
          /></label
        >
      </div>{:else}<p class="empty-state">
        {m.exercise_create_class_first()}
      </p>{/each}
  </section>
  {#if error}<p class="error">{error}</p>{/if}<button
    class="primary save"
    disabled={busy}>{m.exercise_save()}</button
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
  .verification-card input {
    width: auto;
  }
  .assignment-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-3);
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
    grid-template-columns: minmax(10rem, 0.75fr) repeat(2, minmax(0, 1fr));
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
