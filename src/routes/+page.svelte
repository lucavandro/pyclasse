<script lang="ts">
  import { getDashboard } from "$lib/data";
  import { session } from "$lib/session.svelte";
  import { m } from "$lib/paraglide/messages.js";
  let loading = $state(true),
    error = $state(""),
    metrics = $state({ classes: 0, assignments: 0, submitted: 0, pending: 0 });
  $effect(() => {
    if (!session.profile) return;
    void (async () => {
      try {
        const [classes, assignments, submissions] = await getDashboard();
        metrics = {
          classes: classes.length,
          assignments: assignments.length,
          submitted: submissions.filter((x) => x.status !== "draft").length,
          pending: submissions.filter((x) => x.status === "draft").length,
        };
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      } finally {
        loading = false;
      }
    })();
  });
</script>

<header class="page-head">
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
{#if error}<p class="error">{error}</p>{:else if loading}<div
    class="spinner"
  ></div>{:else if session.profile?.role === "teacher"}<section class="panel">
    <div class="panel-head">
      <div>
        <p class="eyebrow">{m.dashboard_submission_data()}</p>
        <h2>{m.dashboard_submission_status()}</h2>
      </div>
    </div>
    <div class="metrics">
      <article>
        <strong>{metrics.classes}</strong><span
          >{m.dashboard_active_classes()}</span
        >
      </article>
      <article>
        <strong>{metrics.assignments}</strong><span
          >{m.dashboard_activities()}</span
        >
      </article>
      <article>
        <strong>{metrics.submitted}</strong><span
          >{m.dashboard_submitted()}</span
        >
      </article>
      <article>
        <strong>{metrics.pending}</strong><span
          >{m.dashboard_in_progress()}</span
        >
      </article>
    </div>
  </section>
{:else}<section class="panel">
    <h2>{m.dashboard_student_space()}</h2>
    <p>{m.dashboard_student_space_intro()}</p>
    <a class="button primary" href="/exercises">{m.dashboard_go_exercises()}</a>
  </section>{/if}

<style>
  .metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }
  .metrics article {
    position: relative;
    display: grid;
    gap: 0.35rem;
    border: 1px solid rgb(104 196 255 / 8%);
    border-radius: var(--radius-lg);
    padding: 1.2rem;
    overflow: hidden;
    background: linear-gradient(
      145deg,
      rgb(46 158 255 / 7%),
      rgb(7 17 31 / 20%)
    );
  }
  .metrics article::after {
    position: absolute;
    right: -1rem;
    bottom: -2.4rem;
    width: 6rem;
    height: 6rem;
    border-radius: 50%;
    background: rgb(46 158 255 / 6%);
    content: "";
  }
  .metrics strong {
    color: var(--color-primary-soft);
    font-size: 2.15rem;
    line-height: 1;
  }
  .metrics span {
    color: #dce7f4;
    font-size: var(--font-size-sm);
  }
</style>
