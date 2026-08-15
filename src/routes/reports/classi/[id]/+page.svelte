<script lang="ts">
  import { page } from "$app/state";
  import { buildClassReport } from "$lib/class-report.mjs";
  import { getClassReport } from "$lib/data";
  import ReportNav from "$lib/ReportNav.svelte";
  import { session } from "$lib/session.svelte";
  import type {
    Assignment,
    AssignmentView,
    Membership,
    Profile,
    Submission,
  } from "$lib/types";
  import { m } from "$lib/paraglide/messages.js";

  type ReportClassroom = {
    id: string;
    name: string;
    subject: string;
    archived_at: string | null;
  };

  let classroom = $state<ReportClassroom | null>(null),
    memberships = $state<Membership[]>([]),
    profiles = $state<Profile[]>([]),
    assignments = $state<Assignment[]>([]),
    submissions = $state<Submission[]>([]),
    views = $state<AssignmentView[]>([]),
    loading = $state(true),
    error = $state("");

  $effect(() => {
    if (!session.profile) return;
    if (session.profile.role !== "teacher") {
      loading = false;
      return;
    }
    void getClassReport(page.params.id || "")
      .then((data) => {
        ({ classroom, memberships, profiles, assignments, submissions, views } =
          data);
      })
      .catch((cause) => {
        error = cause instanceof Error ? cause.message : String(cause);
      })
      .finally(() => (loading = false));
  });

  const report = $derived(
    buildClassReport(memberships, profiles, assignments, submissions, views),
  );
</script>

<a class="button quiet back-link" href="/reports/classi">{m.reports_back()}</a>
<header class="page-head">
  <div>
    <p class="eyebrow">{m.reports_class_detail()}</p>
    <h1>{classroom?.name || m.reports_title_classes()}</h1>
    {#if classroom}<p>{classroom.subject}</p>{/if}
  </div>
</header>
<ReportNav />

{#if session.profile?.role !== "teacher"}<p class="error">
    {m.reports_page_teacher_only()}
  </p>{:else if loading}<div class="spinner"></div>{:else if error}<p
    class="error"
  >
    {error}
  </p>{:else if !classroom}<p class="empty-state">
    {m.reports_class_unavailable()}
  </p>{:else}<section
    class="summary-grid"
    aria-label={m.reports_class_summary()}
  >
    <article>
      <strong>{report.students.length}</strong><span>{m.common_students()}</span
      >
    </article>
    <article>
      <strong>{report.assignmentCount}</strong><span
        >{m.reports_published_activities()}</span
      >
    </article>
    <article>
      <strong>{report.submittedCount}</strong><span
        >{m.reports_total_submissions()}</span
      >
    </article>
    <article>
      <strong>{report.completionRate}%</strong><span
        >{m.reports_completion()}</span
      >
    </article>
  </section>

  <section class="student-reports" aria-labelledby="class-students-title">
    <h2 id="class-students-title">{m.reports_class_student_reports()}</h2>
    <div class="table class-student-table">
      <div class="table-head table-row" style="--columns:6">
        <span>{m.common_student()}</span><span>{m.reports_opened()}</span><span
          >{m.dashboard_submitted()}</span
        ><span>{m.reports_passed()}</span><span>{m.reports_evaluated()}</span
        ><span>{m.reports_progress_percentage()}</span>
      </div>
      {#each report.students as student}<div
          class="table-row"
          style="--columns:6"
        >
          <span data-label={m.common_student()}
            >{#if student.profile}<a
                class="student-link"
                href={`/reports/classi/studenti/${student.id}`}
                >{student.profile.full_name || student.profile.email}</a
              >{:else}{m.reports_student_unavailable()}{/if}</span
          ><span data-label={m.reports_opened()}>{student.opened}</span><span
            data-label={m.dashboard_submitted()}>{student.submitted}</span
          ><span data-label={m.reports_passed()}>{student.passed}</span><span
            data-label={m.reports_evaluated()}>{student.evaluated}</span
          ><span data-label={m.reports_progress_percentage()}
            ><span class="progress-value">{student.progress}%</span></span
          >
        </div>{:else}<p class="empty-state">
          {m.reports_no_class_students()}
        </p>{/each}
    </div>
  </section>{/if}

<style>
  .back-link {
    margin-bottom: var(--space-5);
  }
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-4);
    margin-bottom: var(--space-8);
  }
  .summary-grid article {
    display: grid;
    gap: var(--space-1);
    border: var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
    background: var(--color-surface-subtle);
  }
  .summary-grid strong {
    color: var(--color-primary-soft);
    font-size: var(--font-size-2xl);
  }
  .summary-grid span {
    color: var(--color-muted);
    font-size: var(--font-size-sm);
  }
  .student-reports {
    min-width: 0;
  }
  .student-reports h2 {
    margin-bottom: var(--space-4);
  }
  .student-link {
    font-weight: 700;
  }
  .class-student-table .table-row {
    grid-template-columns: minmax(9.5rem, 1.35fr) repeat(5, minmax(5rem, 1fr));
    min-width: 0;
  }
  .progress-value {
    display: inline-flex;
    width: fit-content;
    min-width: 3.25rem;
    justify-content: center;
    border-radius: 999px;
    padding: 0.24rem 0.6rem;
    color: var(--color-primary-soft);
    background: rgb(46 158 255 / 10%);
    font-weight: 700;
  }
  @media (max-width: 700px) {
    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-3);
    }
    .class-student-table {
      gap: var(--space-3);
      border: 0;
      overflow: visible;
      background: transparent;
    }
    .class-student-table .table-row:not(.table-head) {
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-3);
      border: var(--border);
      border-radius: var(--radius-lg);
      padding: var(--space-4);
      background: var(--color-surface-subtle);
    }
    .class-student-table .table-row:not(.table-head) > span {
      display: grid;
      grid-template-columns: minmax(6.5rem, 0.45fr) minmax(0, 1fr);
      gap: var(--space-3);
      align-items: center;
    }
    .class-student-table .table-row:not(.table-head) > span::before {
      color: var(--color-muted);
      content: attr(data-label);
      font-size: var(--font-size-xs);
      font-weight: 720;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
  }
</style>
