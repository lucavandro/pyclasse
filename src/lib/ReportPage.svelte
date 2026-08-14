<script lang="ts">
  import { getReports } from "$lib/data";
  import { session } from "$lib/session.svelte";
  import ReportNav from "$lib/ReportNav.svelte";
  import type {
    Profile,
    Classroom,
    Membership,
    Exercise,
    Assignment,
    Submission,
    AssignmentView,
  } from "$lib/types";
  let {
    section,
  }: { section: "evaluations" | "progress" | "classes" | "alerts" } = $props();
  let profiles = $state<Profile[]>([]),
    classes = $state<Classroom[]>([]),
    memberships = $state<Membership[]>([]),
    exercises = $state<Exercise[]>([]),
    assignments = $state<Assignment[]>([]),
    submissions = $state<Submission[]>([]),
    views = $state<AssignmentView[]>([]),
    loading = $state(true),
    search = $state(""),
    classFilter = $state(""),
    statusFilter = $state("");
  $effect(() => {
    if (!session.profile) return;
    if (session.profile.role !== "teacher" && section !== "evaluations") {
      loading = false;
      return;
    }
    void getReports().then((x) => {
      [
        profiles,
        classes,
        memberships,
        exercises,
        assignments,
        submissions,
        views,
      ] = x;
      loading = false;
    });
  });
  const rows = $derived(
    submissions
      .filter((s) => s.status !== "draft")
      .filter((s) => session.profile?.role !== "teacher" || s.score !== null)
      .filter(
        (s) =>
          session.profile?.role === "teacher" ||
          s.student_id === session.profile?.id,
      )
      .map((s) => {
        const a = assignments.find((x) => x.id === s.class_assignment_id);
        return {
          submission: s,
          assignment: a,
          exercise: exercises.find((x) => x.id === a?.exercise_id),
          classroom: classes.find((x) => x.id === a?.class_id),
          student: profiles.find((x) => x.id === s.student_id),
        };
      })
      .filter(
        (r) =>
          (!search ||
            `${r.student?.full_name} ${r.exercise?.title}`
              .toLowerCase()
              .includes(search.toLowerCase())) &&
          (!classFilter || r.classroom?.id === classFilter) &&
          (!statusFilter || r.submission.status === statusFilter),
      ),
  );
  const statusLabel = (status: string) =>
    ({
      submitted: "Consegnato",
      passed: "Superato",
      partial: "Parziale",
      failed: "Non superato",
    })[status] || status;
</script>

<header class="page-head">
  <div>
    <p class="eyebrow">REPORT</p>
    <h1>
      {section === "evaluations"
        ? "Valutazioni"
        : section === "progress"
          ? "Avanzamento"
          : section === "classes"
            ? "Riepilogo classi"
            : "Alert didattici"}
    </h1>
  </div>
</header>
<ReportNav />
{#if session.profile?.role !== "teacher" && section !== "evaluations"}<p
    class="error"
  >
    Questa sezione è riservata al docente.
  </p>{:else if loading}<div
    class="spinner"
  ></div>{:else if section === "evaluations"}<section class="report-area">
    <div class="filters">
      <label
        >Cerca studente o esercizio<input
          aria-label="Cerca studente o esercizio"
          bind:value={search}
        /></label
      ><label
        >Classe<select
          aria-label="Filtra report per classe"
          bind:value={classFilter}
          ><option value="">Tutte</option>{#each classes as c}<option
              value={c.id}>{c.name}</option
            >{/each}</select
        ></label
      ><label
        >Stato<select
          aria-label="Filtra report per stato"
          bind:value={statusFilter}
          ><option value="">Tutti</option><option value="submitted"
            >Consegnato</option
          ><option value="passed">Superato</option><option value="partial"
            >Parziale</option
          ><option value="failed">Non superato</option></select
        ></label
      >
    </div>
    <div
      class:teacher-report-table={session.profile?.role === "teacher"}
      class:student-report-table={session.profile?.role === "student"}
      class="table report-table"
    >
      <div class="table-head table-row" style="--columns:4">
        <span
          >{session.profile?.role === "teacher"
            ? "Studente"
            : "Esercizio"}</span
        ><span>Classe</span><span>Stato</span><span>Voto</span>
      </div>
      {#each rows as r}<div class="table-row" style="--columns:4">
          <span
            data-label={session.profile?.role === "teacher"
              ? "Studente"
              : "Esercizio"}
            >{#if session.profile?.role === "teacher" && r.student}<a
                class="student-link"
                href={`/reports/valutazioni/studenti/${r.student.id}`}
                >{r.student.full_name || r.student.email}</a
              >{:else}{r.exercise?.title}{/if}</span
          ><span data-label="Classe">{r.classroom?.name}</span><span
            data-label="Stato"
            class={`submission-status ${r.submission.status}`}
            >{statusLabel(r.submission.status)}</span
          ><span data-label="Voto"
            >{r.submission.score ?? "Non ancora assegnato"}</span
          >
        </div>{:else}<p class="empty-state">
          Nessuna valutazione disponibile.
        </p>{/each}
    </div>
  </section>
{:else if section === "progress"}<section class="report-area">
    <div class="delivery-summary-table table report-table">
      <div class="table-head table-row" style="--columns:4">
        <span>Studente</span><span class="student-class-name">Classe</span><span
          >Consegnati</span
        ><span>Da completare</span>
      </div>
      {#each profiles.filter((p) => p.role === "student") as student}{@const studentClasses =
          memberships
            .filter((m) => m.student_id === student.id)
            .map((m) => classes.find((c) => c.id === m.class_id)?.name)
            .filter(Boolean)}
        <div class="table-row" style="--columns:4">
          <span data-label="Studente"
            ><a
              class="student-link"
              href={`/reports/avanzamento/studenti/${student.id}`}
              >{student.full_name || student.email}</a
            ></span
          ><span data-label="Classe" class="student-class-name"
            >{studentClasses.join(", ")}</span
          ><span data-label="Consegnati"
            >{submissions.filter(
              (s) => s.student_id === student.id && s.status !== "draft",
            ).length}</span
          ><span data-label="Da completare"
            >{assignments.filter((a) =>
              memberships.some(
                (m) => m.student_id === student.id && m.class_id === a.class_id,
              ),
            ).length -
              submissions.filter(
                (s) => s.student_id === student.id && s.status !== "draft",
              ).length}</span
          >
        </div>{/each}
    </div>
  </section>
{:else if section === "classes"}<section class="cards">
    {#each classes as c}<article class="card">
        <h2>{c.name}</h2>
        <p>{c.subject}</p>
        <strong
          >{memberships.filter((m) => m.class_id === c.id).length} studenti</strong
        >
      </article>{/each}
  </section>
{:else}<section class="panel">
    <h2>Attività da osservare</h2>
    {#each profiles.filter((p) => p.role === "student") as student}{@const unopened =
        assignments.filter(
          (a) =>
            memberships.some(
              (m) => m.student_id === student.id && m.class_id === a.class_id,
            ) &&
            !views.some(
              (v) =>
                v.student_id === student.id && v.class_assignment_id === a.id,
            ),
        )}{#if unopened.length}<article class="alert-row">
          <strong
            ><a
              class="student-link"
              href={`/reports/alert/studenti/${student.id}`}
              >{student.full_name || student.email}</a
            ></strong
          ><span>{unopened.length} attività non ancora aperte</span>
        </article>{/if}{/each}
  </section>{/if}

<style>
  .filters {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .report-area {
    min-width: 0;
  }
  .student-link {
    font-weight: 700;
  }
  .alert-row {
    display: flex;
    justify-content: space-between;
    padding: 1rem 0;
    border-bottom: var(--border);
  }
  .submission-status {
    width: fit-content;
    border-radius: 999px;
    padding: 0.24rem 0.6rem;
    color: var(--color-muted);
    background: var(--color-surface-raised);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }
  .submission-status.passed {
    color: #7ee6b7;
    background: rgb(66 211 146 / 10%);
  }
  .submission-status.failed {
    color: #ff9aa5;
    background: rgb(255 107 122 / 10%);
  }
  .submission-status.partial {
    color: #ffe19a;
    background: rgb(248 200 90 / 10%);
  }
  @media (max-width: 700px) {
    .filters {
      grid-template-columns: 1fr;
    }
    .report-table {
      gap: var(--space-3);
      border: 0;
      overflow: visible;
      background: transparent;
    }
    .report-table .table-row:not(.table-head) {
      gap: var(--space-3);
      border: var(--border);
      border-radius: var(--radius-lg);
      padding: var(--space-4);
      background: var(--color-surface-subtle);
    }
    .report-table .table-row:not(.table-head) > span {
      display: grid;
      grid-template-columns: minmax(6.5rem, 0.45fr) minmax(0, 1fr);
      gap: var(--space-3);
      align-items: center;
    }
    .report-table .table-row:not(.table-head) > span::before {
      color: var(--color-muted);
      content: attr(data-label);
      font-size: var(--font-size-xs);
      font-weight: 720;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .report-table .submission-status {
      width: 100%;
    }
  }
</style>
