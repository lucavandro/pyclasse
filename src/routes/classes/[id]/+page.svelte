<script lang="ts">
  import { page } from "$app/state";
  import { getClassDetail } from "$lib/data";
  import { session } from "$lib/session.svelte";
  import { supabase } from "$lib/supabase";
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
    studentEmail = $state(""),
    adding = $state(false),
    addStatus = $state(""),
    loading = $state(true),
    error = $state("");

  async function load() {
    const data = await getClassDetail(page.params.id || "");
    ({ classroom, members, profiles, assignments, exercises } = data);
  }

  $effect(() => {
    if (!session.profile) return;
    void load()
      .catch((cause) => {
        error = cause instanceof Error ? cause.message : String(cause);
      })
      .finally(() => (loading = false));
  });

  async function addStudent() {
    if (!supabase || !studentEmail.trim()) return;
    adding = true;
    addStatus = "";
    const result = await supabase.rpc("add_student_to_class", {
      target_class: page.params.id || "",
      student_email: studentEmail.trim(),
    });
    if (result.error) {
      addStatus = result.error.message.includes("Nessuno studente")
        ? "Nessuno studente registrato con questa email."
        : "Non è stato possibile aggiungere lo studente.";
    } else {
      studentEmail = "";
      addStatus = "Studente aggiunto alla classe.";
      await load();
    }
    adding = false;
  }
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
      {#each assignments as assignment}<article class="row">
          <strong
            >{exercises.find((item) => item.id === assignment.exercise_id)
              ?.title}</strong
          ><span>{assignment.published_at ? "Pubblicata" : "Bozza"}</span>
        </article>{:else}<p class="empty-state">Nessuna attività.</p>{/each}
    </section>
    {#if session.profile?.role === "teacher"}<section class="panel students">
        <div>
          <h2>Studenti</h2>
          <p class="muted">Aggiungi un account studente già registrato.</p>
        </div>
        <form
          class="add-student"
          onsubmit={(event) => {
            event.preventDefault();
            void addStudent();
          }}
        >
          <label
            >Email dello studente<input
              type="email"
              autocomplete="off"
              bind:value={studentEmail}
              required
            /></label
          ><button class="secondary" disabled={adding}
            >{adding ? "Aggiunta…" : "Aggiungi"}</button
          >
        </form>
        {#if addStatus}<p role="status">{addStatus}</p>{/if}
        <div class="student-list">
          {#each members as member}{@const profile = profiles.find(
              (item) => item.id === member.student_id,
            )}
            <article class="row">
              <a href={`/reports/classi/studenti/${member.student_id}`}
                ><strong>{profile?.full_name || profile?.email}</strong></a
              >
            </article>{:else}<p class="empty-state">
              Nessuno studente iscritto.
            </p>{/each}
        </div>
      </section>{/if}
  </div>{/if}

<style>
  .columns {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--space-4);
  }
  .students,
  .student-list {
    display: grid;
    gap: var(--space-4);
  }
  .add-student {
    display: grid;
    gap: var(--space-3);
  }
  .add-student button {
    justify-self: end;
  }
  .row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    padding: 0.9rem;
    border-bottom: var(--border);
    border-radius: var(--radius-sm);
  }
  .row:hover {
    background: rgb(46 158 255 / 5%);
  }
  @media (max-width: 800px) {
    .columns {
      grid-template-columns: 1fr;
    }
    .add-student button {
      width: 100%;
    }
  }
</style>
