<script lang="ts">
  import { getExercises } from "$lib/data";
  import { session } from "$lib/session.svelte";
  import type { Exercise, Assignment, Classroom, Submission } from "$lib/types";
  let exercises = $state<Exercise[]>([]),
    assignments = $state<Assignment[]>([]),
    classes = $state<Classroom[]>([]),
    submissions = $state<Submission[]>([]),
    loading = $state(true),
    error = $state(""),
    search = $state(""),
    tag = $state(""),
    tab = $state<"assigned" | "submitted">("assigned");
  $effect(() => {
    if (!session.profile) return;
    void (async () => {
      try {
        [exercises, assignments, classes, submissions] = await getExercises();
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      } finally {
        loading = false;
      }
    })();
  });
  const tags = $derived([...new Set(exercises.flatMap((x) => x.tags))]);
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
  {#if session.profile?.role === "teacher"}<a
      class="button primary"
      role="button"
      href="/exercises/new">Nuovo esercizio</a
    >{/if}
</header>
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
          <p>{ex.description.slice(0, 140)}</p>
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
            <p>{item.exercise.description.slice(0, 140)}</p>
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

<style>
  .filters {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .card h2 {
    margin-top: 1rem;
  }
  @media (max-width: 650px) {
    .filters {
      grid-template-columns: 1fr;
    }
  }
</style>
