<script lang="ts">
  import { page } from "$app/state";
  import { getClasses, getExercises } from "$lib/data";
  import { session } from "$lib/session.svelte";
  import type {
    Classroom,
    Membership,
    Profile,
    Assignment,
    Exercise,
  } from "$lib/types";
  let classroom = $state<Classroom | null>(null),
    members = $state<Membership[]>([]),
    profiles = $state<Profile[]>([]),
    assignments = $state<Assignment[]>([]),
    exercises = $state<Exercise[]>([]),
    loading = $state(true),
    error = $state("");
  $effect(() => {
    if (!session.profile) return;
    void (async () => {
      try {
        const [c, m, p] = await getClasses();
        const [e, a] = await getExercises();
        classroom = c.find((x) => x.id === page.params.id) || null;
        members = m.filter((x) => x.class_id === page.params.id);
        profiles = p;
        assignments = a.filter((x) => x.class_id === page.params.id);
        exercises = e;
      } catch (x) {
        error = x instanceof Error ? x.message : String(x);
      } finally {
        loading = false;
      }
    })();
  });
</script>

{#if loading}<div class="spinner"></div>{:else if error || !classroom}<p
    class="error"
  >
    {error || "Classe non trovata"}
  </p>{:else}<header class="page-head">
    <div>
      <p class="eyebrow">CLASSE</p>
      <h1>{classroom.name} · {classroom.subject}</h1>
      <p>Codice di iscrizione: <strong>{classroom.join_code}</strong></p>
    </div>
    {#if session.profile?.role === "teacher"}<a
        class="button secondary"
        href={`/classes/${classroom.id}/edit`}>Modifica</a
      >{/if}
  </header>
  <div class="columns">
    <section class="panel">
      <h2>Attività assegnate</h2>
      {#each assignments as a}<article class="row">
          <strong>{exercises.find((e) => e.id === a.exercise_id)?.title}</strong
          ><span>{a.published_at ? "Pubblicata" : "Bozza"}</span>
        </article>{:else}<p class="empty-state">Nessuna attività.</p>{/each}
    </section>
    {#if session.profile?.role === "teacher"}<section class="panel">
        <h2>Studenti</h2>
        {#each members as m}<article class="row">
            <strong
              >{profiles.find((p) => p.id === m.student_id)?.full_name ||
                profiles.find((p) => p.id === m.student_id)?.email}</strong
            >
          </article>{:else}<p class="empty-state">
            Nessuno studente iscritto.
          </p>{/each}
      </section>{/if}
  </div>{/if}

<style>
  .columns {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1rem;
  }
  .row {
    display: flex;
    justify-content: space-between;
    padding: 0.8rem 0;
    border-bottom: var(--border);
  }
  @media (max-width: 800px) {
    .columns {
      grid-template-columns: 1fr;
    }
  }
</style>
