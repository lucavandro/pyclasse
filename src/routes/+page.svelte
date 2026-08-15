<script lang="ts">
  import Icon from "$lib/Icon.svelte";
  import { getDashboard } from "$lib/data";
  import { formatDate } from "$lib/format";
  import { session } from "$lib/session.svelte";
  import type {
    Assignment,
    Classroom,
    Exercise,
    Membership,
    Submission,
  } from "$lib/types";
  import { m } from "$lib/paraglide/messages.js";

  let loading = $state(true),
    error = $state("");
  let classes = $state<Classroom[]>([]),
    memberships = $state<Membership[]>([]);
  let exercises = $state<Pick<Exercise, "id" | "title">[]>([]);
  let assignments = $state<Assignment[]>([]),
    submissions = $state<Submission[]>([]);

  $effect(() => {
    if (!session.profile) return;
    void (async () => {
      try {
        [classes, memberships, exercises, assignments, submissions] =
          await getDashboard();
      } catch (cause) {
        error = cause instanceof Error ? cause.message : String(cause);
      } finally {
        loading = false;
      }
    })();
  });

  const activeClasses = $derived(
    classes.filter((classroom) => !classroom.archived_at),
  );
  const activeClassIds = $derived(new Set(activeClasses.map(({ id }) => id)));
  const publishedAssignments = $derived(
    assignments.filter(
      (assignment) =>
        assignment.published_at && activeClassIds.has(assignment.class_id),
    ),
  );
  const students = $derived(
    new Set(
      memberships
        .filter((membership) => activeClassIds.has(membership.class_id))
        .map((membership) => membership.student_id),
    ).size,
  );
  const toReview = $derived(
    submissions.filter((submission) => submission.status === "submitted")
      .length,
  );
  const upcoming = $derived(
    publishedAssignments
      .filter(
        (assignment) =>
          assignment.deadline && new Date(assignment.deadline) >= new Date(),
      )
      .sort(
        (left, right) =>
          new Date(left.deadline ?? 0).getTime() -
          new Date(right.deadline ?? 0).getTime(),
      )
      .slice(0, 4),
  );
  const featuredClasses = $derived(activeClasses.slice(0, 3));

  const exerciseFor = (assignment: Assignment) =>
    exercises.find((exercise) => exercise.id === assignment.exercise_id);
  const classFor = (assignment: Assignment) =>
    classes.find((classroom) => classroom.id === assignment.class_id);
  const classStudentCount = (classId: string) =>
    memberships.filter((membership) => membership.class_id === classId).length;
  const classActivityCount = (classId: string) =>
    publishedAssignments.filter((assignment) => assignment.class_id === classId)
      .length;
  const classReviewCount = (classId: string) => {
    const ids = new Set(
      assignments
        .filter((assignment) => assignment.class_id === classId)
        .map((assignment) => assignment.id),
    );
    return submissions.filter(
      (submission) =>
        ids.has(submission.class_assignment_id) &&
        submission.status === "submitted",
    ).length;
  };
</script>

<header class="page-head dashboard-head">
  <div>
    <p class="eyebrow">{m.dashboard_overview()}</p>
    <h1>
      {m.dashboard_greeting({
        name: session.profile?.full_name || session.profile?.email || "",
      })}
    </h1>
    <p>
      {session.profile?.role === "teacher"
        ? m.dashboard_teacher_intro()
        : m.dashboard_student_intro()}
    </p>
  </div>
</header>

{#if error}
  <p class="error">{error}</p>
{:else if loading}
  <div class="spinner"></div>
{:else if session.profile?.role === "teacher"}
  <section class="lesson-launch" aria-labelledby="lesson-launch-title">
    <div class="launch-copy">
      <p class="eyebrow">{m.dashboard_start_now()}</p>
      <h2 id="lesson-launch-title">{m.dashboard_lesson_ready()}</h2>
      <p>{m.dashboard_lesson_ready_help()}</p>
    </div>
    <div class="launch-actions" aria-label={m.dashboard_quick_actions()}>
      <a class="button primary" href="/code-now"
        ><Icon name="code" size={19} />{m.dashboard_open_code_now()}</a
      >
      <a class="button secondary" href="/exercises/new"
        ><Icon name="plus" size={19} />{m.dashboard_create_assign()}</a
      >
      <a class="button quiet-action" href="/monitor"
        ><Icon name="monitor" size={19} />{m.dashboard_open_monitor()}</a
      >
    </div>
  </section>

  <section class="metrics" aria-label={m.dashboard_today_snapshot()}>
    <article>
      <span class="metric-icon"><Icon name="classes" size={20} /></span><strong
        >{activeClasses.length}</strong
      ><span>{m.dashboard_active_classes()}</span>
    </article>
    <article>
      <span class="metric-icon"><Icon name="classes" size={20} /></span><strong
        >{students}</strong
      ><span>{m.dashboard_active_students()}</span>
    </article>
    <article>
      <span class="metric-icon"><Icon name="exercises" size={20} /></span
      ><strong>{publishedAssignments.length}</strong><span
        >{m.dashboard_published_activities()}</span
      >
    </article>
    <article class:attention={toReview > 0}>
      <span class="metric-icon"><Icon name="reports" size={20} /></span><strong
        >{toReview}</strong
      ><span>{m.dashboard_to_review()}</span>
    </article>
  </section>

  <div class="dashboard-grid">
    <section class="panel deadlines" aria-labelledby="deadlines-title">
      <div class="section-head">
        <div>
          <p class="eyebrow">{m.dashboard_calendar()}</p>
          <h2 id="deadlines-title">{m.dashboard_upcoming_deadlines()}</h2>
        </div>
        <a href="/exercises">{m.dashboard_manage_activities()}</a>
      </div>
      <div class="activity-list">
        {#each upcoming as assignment}
          <a class="activity-row" href={`/exercises/${assignment.exercise_id}`}>
            <span class="date-tile"
              ><small>{m.common_deadline()}</small><strong
                >{formatDate(assignment.deadline!)}</strong
              ></span
            >
            <span class="activity-copy"
              ><strong
                >{exerciseFor(assignment)?.title ?? m.common_exercise()}</strong
              ><span
                >{classFor(assignment)?.name ?? m.common_class()} · {classFor(
                  assignment,
                )?.subject ?? ""}</span
              ></span
            >
            <span class="row-arrow" aria-hidden="true">→</span>
          </a>
        {:else}
          <div class="empty-block">
            <Icon name="exercises" size={24} />
            <div>
              <strong>{m.dashboard_no_deadlines()}</strong>
              <p>{m.dashboard_no_deadlines_help()}</p>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <section class="panel class-pulse" aria-labelledby="class-pulse-title">
      <div class="section-head">
        <div>
          <p class="eyebrow">{m.dashboard_classes_eyebrow()}</p>
          <h2 id="class-pulse-title">{m.dashboard_class_pulse()}</h2>
        </div>
        <a href="/classes">{m.dashboard_all_classes()}</a>
      </div>
      <div class="class-list">
        {#each featuredClasses as classroom}
          <a class="class-row" href={`/classes/${classroom.id}`}>
            <span class="class-mark" aria-hidden="true"
              >{classroom.name.slice(0, 1)}</span
            >
            <span class="class-copy"
              ><strong>{classroom.name}</strong><span>{classroom.subject}</span
              ><small
                >{m.dashboard_class_summary({
                  students: classStudentCount(classroom.id),
                  activities: classActivityCount(classroom.id),
                })}</small
              ></span
            >
            {#if classReviewCount(classroom.id) > 0}<span class="review-badge"
                >{m.dashboard_class_to_review({
                  count: classReviewCount(classroom.id),
                })}</span
              >{/if}
          </a>
        {:else}
          <div class="empty-block">
            <Icon name="classes" size={24} />
            <div>
              <strong>{m.dashboard_no_classes()}</strong>
              <p>{m.dashboard_no_classes_help()}</p>
            </div>
          </div>
        {/each}
      </div>
    </section>
  </div>
{:else}
  <section class="panel">
    <h2>{m.dashboard_student_space()}</h2>
    <p>{m.dashboard_student_space_intro()}</p>
    <a class="button primary" href="/exercises">{m.dashboard_go_exercises()}</a>
  </section>
{/if}

<style>
  .dashboard-head {
    margin-bottom: var(--space-5);
  }
  .lesson-launch {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-6);
    align-items: center;
    margin-bottom: var(--space-5);
    border: 1px solid rgb(104 196 255 / 18%);
    border-radius: var(--radius-xl);
    padding: clamp(var(--space-5), 4vw, var(--space-8));
    overflow: hidden;
    background:
      radial-gradient(
        circle at 90% 10%,
        rgb(80 250 123 / 11%),
        transparent 32%
      ),
      linear-gradient(
        135deg,
        var(--color-primary-surface),
        var(--color-surface)
      );
    box-shadow: var(--shadow-md);
  }
  .lesson-launch::after {
    position: absolute;
    right: -5rem;
    bottom: -7rem;
    width: 18rem;
    height: 18rem;
    border: 1px solid rgb(104 196 255 / 10%);
    border-radius: 50%;
    content: "";
    pointer-events: none;
  }
  .launch-copy {
    position: relative;
    z-index: 1;
    max-width: 42rem;
  }
  .launch-copy h2 {
    margin: var(--space-1) 0 var(--space-2);
    font-size: clamp(1.5rem, 3vw, 2.15rem);
  }
  .launch-copy p:last-child {
    margin: 0;
    color: var(--color-muted);
  }
  .launch-actions {
    position: relative;
    z-index: 1;
    display: grid;
    min-width: 15rem;
    gap: var(--space-2);
  }
  .launch-actions .button {
    justify-content: flex-start;
  }
  .quiet-action {
    border: 1px solid transparent;
    color: var(--color-muted);
    background: transparent;
  }
  .quiet-action:hover {
    border-color: rgb(104 196 255 / 18%);
    color: var(--color-foreground);
    background: rgb(255 255 255 / 3%);
  }
  .metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-3);
    margin-bottom: var(--space-5);
  }
  .metrics article {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-1) var(--space-3);
    align-items: center;
    border: var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    background: var(--color-surface);
  }
  .metrics article.attention {
    border-color: rgb(255 184 108 / 35%);
  }
  .metric-icon {
    display: grid;
    grid-row: 1 / span 2;
    place-items: center;
    width: 2.65rem;
    height: 2.65rem;
    border-radius: var(--radius-md);
    color: var(--color-primary-soft);
    background: var(--color-primary-surface);
  }
  .metrics strong {
    font-size: 1.65rem;
    line-height: 1;
  }
  .metrics > article > span:last-child {
    color: var(--color-muted);
    font-size: var(--font-size-sm);
  }
  .dashboard-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(18rem, 0.85fr);
    gap: var(--space-5);
  }
  .panel {
    min-width: 0;
  }
  .section-head {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    align-items: start;
    margin-bottom: var(--space-4);
  }
  .section-head h2 {
    margin: var(--space-1) 0 0;
  }
  .section-head > a {
    flex: 0 0 auto;
    color: var(--color-primary-soft);
    font-size: var(--font-size-sm);
    font-weight: 700;
  }
  .activity-list,
  .class-list {
    display: grid;
  }
  .activity-row,
  .class-row {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    border-top: var(--border);
    padding: var(--space-3) 0;
    color: inherit;
    text-decoration: none;
  }
  .activity-row:first-child,
  .class-row:first-child {
    border-top: 0;
  }
  .activity-row:hover .activity-copy > strong,
  .class-row:hover .class-copy > strong {
    color: var(--color-primary-soft);
  }
  .date-tile {
    display: grid;
    flex: 0 0 7.5rem;
    gap: 0.15rem;
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
    background: var(--color-primary-surface);
  }
  .date-tile small {
    color: var(--color-primary-soft);
    font-size: 0.68rem;
    font-weight: 750;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .date-tile strong {
    font-size: var(--font-size-sm);
  }
  .activity-copy,
  .class-copy {
    display: grid;
    min-width: 0;
    gap: 0.15rem;
  }
  .activity-copy > strong,
  .class-copy > strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color var(--duration-fast) var(--easing-standard);
  }
  .activity-copy span,
  .class-copy span,
  .class-copy small {
    overflow: hidden;
    color: var(--color-muted);
    font-size: var(--font-size-sm);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .row-arrow {
    margin-left: auto;
    color: var(--color-primary-soft);
  }
  .class-mark {
    display: grid;
    flex: 0 0 2.6rem;
    place-items: center;
    width: 2.6rem;
    height: 2.6rem;
    border: 1px solid rgb(104 196 255 / 18%);
    border-radius: var(--radius-md);
    color: var(--color-primary-soft);
    font-weight: 800;
    background: var(--color-primary-surface);
  }
  .review-badge {
    margin-left: auto;
    border-radius: 999px;
    padding: 0.25rem 0.55rem;
    color: var(--color-yellow);
    font-size: var(--font-size-xs);
    font-weight: 750;
    white-space: nowrap;
    background: rgb(248 200 90 / 10%);
  }
  .empty-block {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    min-height: 7rem;
    border: 1px dashed rgb(104 196 255 / 16%);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    color: var(--color-muted);
  }
  .empty-block strong {
    color: var(--color-foreground);
  }
  .empty-block p {
    margin: var(--space-1) 0 0;
    font-size: var(--font-size-sm);
  }
  @media (max-width: 1050px) {
    .metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .dashboard-grid {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 720px) {
    .lesson-launch {
      grid-template-columns: 1fr;
    }
    .launch-actions {
      min-width: 0;
    }
    .metrics {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 480px) {
    .metrics {
      grid-template-columns: 1fr;
    }
    .section-head {
      align-items: start;
      flex-direction: column;
    }
    .date-tile {
      flex-basis: 6.6rem;
    }
    .review-badge {
      display: none;
    }
  }
</style>
