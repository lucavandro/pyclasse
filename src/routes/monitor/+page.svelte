<script lang="ts">
  import { onDestroy } from "svelte";
  import { getMonitor } from "$lib/data";
  import { supabase } from "$lib/supabase";
  import { session } from "$lib/session.svelte";
  import PythonEditor from "$lib/PythonEditor.svelte";
  import type {
    Profile,
    Classroom,
    Exercise,
    Assignment,
    Submission,
    EditorSession,
  } from "$lib/types";
  let profiles = $state<Profile[]>([]),
    classes = $state<Classroom[]>([]),
    exercises = $state<Exercise[]>([]),
    assignments = $state<Assignment[]>([]),
    submissions = $state<Submission[]>([]),
    sessions = $state<EditorSession[]>([]),
    classFilter = $state(""),
    activityFilter = $state(""),
    loading = $state(true),
    poll: any;
  async function load() {
    [profiles, classes, exercises, assignments, submissions, sessions] =
      await getMonitor();
    loading = false;
  }
  $effect(() => {
    if (session.profile?.role === "teacher" && !poll) {
      void load();
      poll = setInterval(() => void load(), 5000);
    }
  });
  onDestroy(() => clearInterval(poll));
  const drafts = $derived(
    submissions
      .filter((s) => s.status === "draft")
      .map((s) => {
        const a = assignments.find((x) => x.id === s.class_assignment_id);
        const active = sessions.some((x) => {
          if (
            x.user_id !== s.student_id ||
            x.class_assignment_id !== s.class_assignment_id
          )
            return false;
          const lease = new Date(x.active_until).getTime();
          const updated = new Date(x.updated_at).getTime();
          const now = Date.now();
          // A short grace period absorbs background-tab timer throttling. An
          // explicit close sets active_until to updated_at and bypasses it.
          return (
            lease > now || (lease > updated + 30_000 && updated > now - 120_000)
          );
        });
        return {
          submission: s,
          assignment: a,
          exercise: exercises.find((x) => x.id === a?.exercise_id),
          student: profiles.find((x) => x.id === s.student_id),
          active,
        };
      })
      .filter(
        (r) =>
          (!classFilter || r.assignment?.class_id === classFilter) &&
          (!activityFilter ||
            (activityFilter === "active" ? r.active : !r.active)),
      ),
  );
  async function save(submission: Submission, code: string) {
    if (!supabase || !session.profile) return;
    await supabase
      .from("submissions")
      .update({
        code,
        updated_by: session.profile.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", submission.id);
  }
</script>

<header class="page-head">
  <div>
    <p class="eyebrow">TEMPO REALE</p>
    <h1>Monitoraggio lavori in corso</h1>
    <p>
      Visualizza esclusivamente le bozze che le policy consentono al docente.
    </p>
  </div>
</header>
<div class="filters">
  <label
    >Classe<select
      aria-label="Filtra monitoraggio per classe"
      bind:value={classFilter}
      ><option value="">Tutte</option>{#each classes as c}<option value={c.id}
          >{c.name}</option
        >{/each}</select
    ></label
  ><label
    >Attività<select
      aria-label="Filtra monitoraggio per attività"
      bind:value={activityFilter}
      ><option value="">Tutte</option><option value="active">Attive ora</option
      ><option value="inactive">Non attive</option></select
    ></label
  >
</div>
{#if loading}<div class="spinner"></div>{:else}<section class="drafts">
    {#each drafts as row}<article class="live-draft panel">
        <header>
          <div>
            <strong>{row.student?.full_name || row.student?.email}</strong
            ><small>{row.exercise?.title} · in lavorazione</small>
          </div>
          <span class:active={row.active} class="activity-status"
            ><strong
              >{row.active
                ? "Editor aperto ora"
                : "Lavoro aperto, non attivo"}</strong
            ></span
          >
        </header>
        <PythonEditor
          value={row.submission.code}
          ariaLabel={`Codice di ${row.student?.full_name || row.student?.email || "Studente"}`}
          allowClipboard={true}
        /><button
          class="primary"
          onclick={(e) => {
            const article = e.currentTarget.closest("article")!;
            const code =
              article.querySelector(".cm-content")?.textContent ||
              row.submission.code;
            void save(row.submission, code);
          }}>Invia modifica allo studente</button
        >
      </article>{:else}<p class="empty-state panel">
        Nessuna bozza corrisponde ai filtri.
      </p>{/each}
  </section>{/if}

<style>
  .filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .filters label {
    flex: 1;
  }
  .drafts {
    display: grid;
    gap: 1rem;
  }
  .live-draft header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1rem;
  }
  .live-draft header > div {
    display: grid;
  }
  .live-draft button {
    margin-top: 1rem;
  }
  .activity-status {
    width: fit-content;
    border-radius: 999px;
    padding: 0.3rem 0.65rem;
    color: var(--color-muted);
    background: rgb(154 171 192 / 8%);
    font-size: var(--font-size-xs);
  }
  .activity-status.active {
    color: #7ee6b7;
    background: rgb(66 211 146 / 10%);
  }
  @media (max-width: 600px) {
    .filters,
    .live-draft header {
      flex-direction: column;
    }
  }
</style>
