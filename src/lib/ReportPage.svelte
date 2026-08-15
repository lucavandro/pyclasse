<script lang="ts">
  import { getReportClasses, getReports } from "$lib/data";
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
  import { m } from "$lib/paraglide/messages.js";
  let {
    section,
  }: { section: "evaluations" | "progress" | "classes" | "alerts" } = $props();
  type ReportClassroom = Pick<Classroom, "id" | "name" | "subject">;
  let profiles = $state<Profile[]>([]),
    classes = $state<ReportClassroom[]>([]),
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
    if (section === "classes") {
      void getReportClasses().then(([classRows, membershipRows]) => {
        classes = classRows;
        memberships = membershipRows;
        loading = false;
      });
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
      submitted: m.reports_submitted(),
      passed: m.reports_passed(),
      partial: m.reports_partial(),
      failed: m.reports_failed(),
    })[status] || status;
</script>

<header class="page-head">
  <div>
    <p class="eyebrow">{m.reports_eyebrow()}</p>
    <h1>
      {section === "evaluations"
        ? m.reports_title_evaluations()
        : section === "progress"
          ? m.reports_title_progress()
          : section === "classes"
            ? m.reports_title_classes()
            : m.reports_alert_title()}
    </h1>
  </div>
</header>
<ReportNav />
{#if session.profile?.role !== "teacher" && section !== "evaluations"}<p
    class="error"
  >
    {m.reports_teacher_only()}
  </p>{:else if loading}<div
    class="spinner"
  ></div>{:else if section === "evaluations"}<section class="report-area">
    <div class="filters">
      <label
        >{m.reports_search()}<input
          aria-label={m.reports_search()}
          bind:value={search}
        /></label
      ><label
        >{m.common_class()}<select
          aria-label={m.reports_filter_report_class()}
          bind:value={classFilter}
          ><option value="">{m.common_all()}</option>{#each classes as c}<option
              value={c.id}>{c.name}</option
            >{/each}</select
        ></label
      ><label
        >{m.common_status()}<select
          aria-label={m.reports_filter_report_status()}
          bind:value={statusFilter}
          ><option value="">{m.common_all()}</option><option value="submitted"
            >{m.reports_submitted()}</option
          ><option value="passed">{m.reports_passed()}</option><option
            value="partial">{m.reports_partial()}</option
          ><option value="failed">{m.reports_failed()}</option></select
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
            ? m.reports_student()
            : m.reports_exercise()}</span
        ><span>{m.common_class()}</span><span>{m.common_status()}</span><span
          >{m.common_grade()}</span
        >
      </div>
      {#each rows as r}<div class="table-row" style="--columns:4">
          <span
            data-label={session.profile?.role === "teacher"
              ? m.reports_student()
              : m.reports_exercise()}
            >{#if session.profile?.role === "teacher" && r.student}<a
                class="student-link"
                href={`/reports/valutazioni/studenti/${r.student.id}`}
                >{r.student.full_name || r.student.email}</a
              >{:else}{r.exercise?.title}{/if}</span
          ><span data-label={m.common_class()}>{r.classroom?.name}</span><span
            data-label={m.common_status()}
            class={`submission-status ${r.submission.status}`}
            >{statusLabel(r.submission.status)}</span
          ><span data-label={m.common_grade()}
            >{r.submission.score ?? m.reports_not_assigned()}</span
          >
        </div>{:else}<p class="empty-state">
          {m.reports_no_evaluations()}
        </p>{/each}
    </div>
  </section>
{:else if section === "progress"}<section class="report-area">
    <div class="delivery-summary-table table report-table">
      <div class="table-head table-row" style="--columns:4">
        <span>{m.common_student()}</span><span class="student-class-name"
          >{m.common_class()}</span
        ><span>{m.dashboard_submitted()}</span><span
          >{m.reports_to_complete()}</span
        >
      </div>
      {#each profiles.filter((p) => p.role === "student") as student}{@const studentClasses =
          memberships
            .filter((m) => m.student_id === student.id)
            .map((m) => classes.find((c) => c.id === m.class_id)?.name)
            .filter(Boolean)}
        <div class="table-row" style="--columns:4">
          <span data-label={m.common_student()}
            ><a
              class="student-link"
              href={`/reports/avanzamento/studenti/${student.id}`}
              >{student.full_name || student.email}</a
            ></span
          ><span data-label={m.common_class()} class="student-class-name"
            >{studentClasses.join(", ")}</span
          ><span data-label={m.dashboard_submitted()}
            >{submissions.filter(
              (s) => s.student_id === student.id && s.status !== "draft",
            ).length}</span
          ><span data-label={m.reports_to_complete()}
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
    {#each classes as c}<a
        class="card class-report-card"
        href={`/reports/classi/${c.id}`}
        aria-label={m.reports_open_class_report({ name: c.name })}
      >
        <h2>{c.name}</h2>
        <p>{c.subject}</p>
        <strong
          >{m.classes_student_count({
            count: memberships.filter(
              (membership) => membership.class_id === c.id,
            ).length,
          })}</strong
        >
        <span class="class-report-action">{m.reports_open_class()}</span>
      </a>{:else}<p class="empty-state">{m.reports_no_classes()}</p>{/each}
  </section>
{:else}<section class="panel">
    <h2>{m.reports_title_alerts()}</h2>
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
          ><span
            >{m.reports_unopened_activities({ count: unopened.length })}</span
          >
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
  .class-report-card {
    color: inherit;
    text-decoration: none;
  }
  .class-report-action {
    margin-top: auto;
    padding-top: var(--space-5);
    color: var(--color-primary-soft);
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
