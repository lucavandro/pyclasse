<script lang="ts">
  import { goto } from "$app/navigation";
  import Markdown from "$lib/Markdown.svelte";
  import PythonEditor from "$lib/PythonEditor.svelte";
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
    tags = $state<string[]>([]),
    tagInput = $state(""),
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
        tags = [...d.exercise.tags];
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
  const normalizeTag = (value: string) => value.trim().toLowerCase();
  function addTag() {
    const tag = normalizeTag(tagInput);
    if (tag && !tags.includes(tag)) tags = [...tags, tag];
    tagInput = "";
  }
  function removeTag(tag: string) {
    tags = tags.filter((item) => item !== tag);
  }
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
      tags: [...new Set([...tags, normalizeTag(tagInput)].filter(Boolean))],
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
    >
    <div class="prompt-editor">
      <label
        >{m.exercise_markdown_prompt()}<textarea
          aria-label={m.exercise_markdown_prompt()}
          bind:value={description}
          required
        ></textarea></label
      >
      <section
        class="markdown-preview"
        aria-labelledby="exercise-markdown-preview-title"
      >
        <h3 id="exercise-markdown-preview-title">
          {m.exercise_markdown_preview()}
        </h3>
        <div class="markdown-preview-content">
          {#if description.trim()}
            <Markdown source={description} />
          {:else}
            <p>{m.exercise_markdown_preview_empty()}</p>
          {/if}
        </div>
      </section>
    </div>
    <label
      >{m.exercise_constraints()}<textarea bind:value={constraints}
      ></textarea></label
    >
    <div class="starter-code-field">
      <span id="exercise-starter-code-label" class="field-label">
        {m.exercise_starter_code()}
      </span>
      <PythonEditor
        bind:value={starterCode}
        ariaLabelledby="exercise-starter-code-label"
        allowClipboard={true}
      />
    </div>
    
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
    <fieldset class="tag-field tag-row">
      <legend>{m.exercise_tags()}</legend>
      <label for="exercise-tag-input">{m.exercise_tag_input()}</label>
      <div class="tag-entry">
        <input
          id="exercise-tag-input"
          aria-describedby="exercise-tags-help"
          placeholder={m.exercise_tags_placeholder()}
          bind:value={tagInput}
          onkeydown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag();
            }
          }}
        />
        <button
          type="button"
          class="secondary"
          disabled={!tagInput.trim()}
          onclick={addTag}>{m.exercise_tag_add()}</button
        >
      </div>
      <small id="exercise-tags-help">{m.exercise_tags_help()}</small>
      {#if tags.length}
        <div class="tag-list" aria-live="polite">
          {#each tags as tag}
            <span class="tag tag-chip">
              #{tag}
              <button
                type="button"
                class="tag-remove"
                aria-label={m.exercise_tag_remove({ tag })}
                title={m.exercise_tag_remove({ tag })}
                onclick={() => removeTag(tag)}>×</button
              >
            </span>
          {/each}
        </div>
      {/if}
    </fieldset>
    <label class="points-row"
      >{m.exercise_max_points()}<input
        type="number"
        min="1"
        bind:value={maxPoints}
      /></label
    >
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
  .prompt-editor {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-5);
    align-items: stretch;
  }
  .prompt-editor textarea {
    min-height: 18rem;
    height: 100%;
  }
  .markdown-preview {
    min-width: 0;
    border: var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    background: var(--color-surface-subtle);
  }
  .markdown-preview h3 {
    margin-bottom: var(--space-4);
    color: var(--color-muted);
    font-size: var(--font-size-sm);
    letter-spacing: 0;
  }
  .markdown-preview-content {
    min-height: 14rem;
    overflow-wrap: anywhere;
  }
  .markdown-preview-content > p {
    color: var(--color-subtle);
  }
  .starter-code-field,
  .tag-field {
    display: grid;
    gap: var(--space-2);
  }
  .starter-code-field {
    min-width: 0;
  }
  .starter-code-field :global(.editor) {
    border-radius: var(--radius-md);
  }
  .field-label,
  .tag-field legend,
  .tag-field label {
    color: var(--color-foreground);
    font-size: var(--font-size-sm);
    font-weight: 620;
  }
  .tag-field label {
    color: var(--color-muted);
    font-weight: 500;
  }
  .tag-entry {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-2);
  }
  .tag-list {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
    margin-top: var(--space-1);
  }
  .tag-chip {
    min-height: var(--control-min-height);
    padding: 0 0 0 var(--space-3);
    font-size: var(--font-size-sm);
  }
  .tag-remove {
    width: var(--control-min-height);
    min-width: var(--control-min-height);
    min-height: var(--control-min-height);
    border: 0;
    border-radius: inherit;
    padding: 0;
    background: transparent;
    color: inherit;
    box-shadow: none;
    font-size: var(--font-size-lg);
  }
  .tag-remove:hover:not(:disabled) {
    border: 0;
    background: var(--color-surface-hover);
    transform: none;
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
    .prompt-editor,
    .verification-grid,
    .test-row,
    .assignment {
      grid-template-columns: 1fr;
    }
    .tag-entry {
      grid-template-columns: 1fr;
    }
  }
</style>
