<script lang="ts">
  import { page } from "$app/state";
  import { getExercise } from "$lib/data";
  import { session } from "$lib/session.svelte";
  import Markdown from "$lib/Markdown.svelte";
  import { m } from "$lib/paraglide/messages.js";
  let data = $state<any>(null),
    error = $state("");
  $effect(() => {
    if (session.profile && page.params.id)
      void getExercise(page.params.id)
        .then((x) => (data = x))
        .catch((e) => (error = e.message));
  });
</script>

{#if error}<p class="error">{error}</p>{:else if !data}<div
    class="spinner"
  ></div>{:else}<a class="button quiet" href="/exercises"
    >{m.exercise_back_assignments()}</a
  >
  <header class="page-head">
    <div>
      <p class="eyebrow">{m.exercise_python_eyebrow()}</p>
      <h1>{data.exercise.title}</h1>
    </div>
    {#if session.profile?.role === "teacher"}<a
        class="button secondary"
        href={`/exercises/${data.exercise.id}/edit`}>{m.exercise_edit()}</a
      >{/if}
  </header>
  <div class="tabs" role="tablist" aria-label={m.exercise_content()}>
    <a
      role="tab"
      aria-selected="true"
      class="active"
      href={`/exercises/${data.exercise.id}`}>{m.exercise_prompt_tab()}</a
    ><a
      role="tab"
      aria-selected="false"
      href={`/exercises/${data.exercise.id}/editor`}
      >{m.exercise_editor_tab()}</a
    >
  </div>
  <section class="panel brief">
    <Markdown
      source={data.exercise.description}
    />{#if data.exercise.resource_url}<a
        class="resource"
        href={data.exercise.resource_url}
        target="_blank"
        rel="noopener noreferrer"
        >{data.exercise.resource_label || m.exercise_external_resource()} ↗</a
      >{/if}{#if data.exercise.constraints}<h3>{m.exercise_constraints()}</h3>
      <p>{data.exercise.constraints}</p>{/if}
    <div class="meta">
      <strong
        >{data.exercise.verification_mode === "ai"
          ? "IA"
          : data.tests.length}</strong
      ><span
        >{data.exercise.verification_mode === "ai"
          ? m.exercise_semantic_verification()
          : m.exercise_automatic_tests()} · {m.exercise_points({
          count: data.exercise.max_points,
        })}</span
      >
    </div>
    <a class="button primary" href={`/exercises/${data.exercise.id}/editor`}
      >{m.exercise_open_editor_arrow()}</a
    >
  </section>{/if}

<style>
  .brief {
    max-width: 900px;
  }
  .resource {
    display: inline-block;
    margin: 1rem 0;
  }
  .meta {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    margin: 1.5rem 0;
  }
  .meta strong {
    font-size: 2rem;
    color: var(--color-cyan);
  }
</style>
