<script lang="ts">
  import { page } from "$app/state";
  import { getExercise } from "$lib/data";
  import { session } from "$lib/session.svelte";
  import Markdown from "$lib/Markdown.svelte";
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
  ></div>{:else}<a class="button quiet" href="/exercises">← Torna ai compiti</a>
  <header class="page-head">
    <div>
      <p class="eyebrow">ESERCIZIO PYTHON</p>
      <h1>{data.exercise.title}</h1>
    </div>
    {#if session.profile?.role === "teacher"}<a
        class="button secondary"
        href={`/exercises/${data.exercise.id}/edit`}>Modifica esercizio</a
      >{/if}
  </header>
  <div class="tabs" role="tablist" aria-label="Contenuto esercizio">
    <a
      role="tab"
      aria-selected="true"
      class="active"
      href={`/exercises/${data.exercise.id}`}>Traccia</a
    ><a
      role="tab"
      aria-selected="false"
      href={`/exercises/${data.exercise.id}/editor`}>Editor e codice</a
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
        >{data.exercise.resource_label || "Risorsa esterna"} ↗</a
      >{/if}{#if data.exercise.constraints}<h3>Vincoli</h3>
      <p>{data.exercise.constraints}</p>{/if}
    <div class="meta">
      <strong
        >{data.exercise.verification_mode === "ai"
          ? "IA"
          : data.tests.length}</strong
      ><span
        >{data.exercise.verification_mode === "ai"
          ? "verifica semantica"
          : "test automatici"} · {data.exercise.max_points} punti</span
      >
    </div>
    <a class="button primary" href={`/exercises/${data.exercise.id}/editor`}
      >Apri l’editor →</a
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
