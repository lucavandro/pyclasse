<script lang="ts">
  import { page } from "$app/state";
  import { getReportContext, getStudentSubmissions } from "$lib/data";
  import ReportNav from "$lib/ReportNav.svelte";
  import { session } from "$lib/session.svelte";
  import { supabase } from "$lib/supabase";
  import type {
    Assignment,
    AssignmentView,
    Classroom,
    Exercise,
    Membership,
    Profile,
    Submission,
  } from "$lib/types";

  let profiles = $state<Profile[]>([]),
    classes = $state<Classroom[]>([]),
    memberships = $state<Membership[]>([]),
    exercises = $state<Exercise[]>([]),
    assignments = $state<Assignment[]>([]),
    submissions = $state<Submission[]>([]),
    views = $state<AssignmentView[]>([]),
    savingId = $state(""),
    gradeStatus = $state(""),
    loading = $state(true),
    error = $state("");

  $effect(() => {
    if (!session.profile) return;
    if (session.profile.role !== "teacher") {
      loading = false;
      return;
    }
    void Promise.all([
      getReportContext(),
      getStudentSubmissions(page.params.id || ""),
    ])
      .then(([data, studentSubmissions]) => {
        [profiles, classes, memberships, exercises, assignments, views] = data;
        submissions = studentSubmissions;
      })
      .catch((cause) => {
        error = cause instanceof Error ? cause.message : String(cause);
      })
      .finally(() => (loading = false));
  });

  const student = $derived(profiles.find((item) => item.id === page.params.id));
  const studentMemberships = $derived(
    memberships.filter((item) => item.student_id === page.params.id),
  );
  const work = $derived(
    assignments
      .filter((assignment) =>
        studentMemberships.some(
          (membership) => membership.class_id === assignment.class_id,
        ),
      )
      .map((assignment) => ({
        assignment,
        exercise: exercises.find(
          (exercise) => exercise.id === assignment.exercise_id,
        ),
        classroom: classes.find(
          (classroom) => classroom.id === assignment.class_id,
        ),
        submission: submissions.find(
          (submission) =>
            submission.class_assignment_id === assignment.id &&
            submission.student_id === page.params.id,
        ),
        view: views.find(
          (view) =>
            view.class_assignment_id === assignment.id &&
            view.student_id === page.params.id,
        ),
      }))
      .sort((left, right) =>
        (left.classroom?.name || "").localeCompare(
          right.classroom?.name || "",
          "it",
        ),
      ),
  );
  const submittedCount = $derived(
    work.filter((item) => item.submission && item.submission.status !== "draft")
      .length,
  );
  const passedCount = $derived(
    work.filter((item) => item.submission?.status === "passed").length,
  );
  const openedCount = $derived(work.filter((item) => item.view).length);
  const backSection = $derived(
    ["valutazioni", "avanzamento", "classi", "alert"].includes(
      page.params.section || "",
    )
      ? page.params.section
      : "valutazioni",
  );
  const formatDate = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleString("it-IT") : "—";
  const statusLabel = (status: string | undefined) =>
    ({
      draft: "In corso",
      submitted: "Consegnato",
      passed: "Superato",
      partial: "Parziale",
      failed: "Non superato",
    })[status || ""] || "Non iniziato";

  async function saveGrade(
    submission: Submission,
    status: "passed" | "partial" | "failed",
    score: number,
  ) {
    if (!supabase) return;
    savingId = submission.id;
    gradeStatus = "";
    const result = await supabase
      .from("submissions")
      .update({ status, score })
      .eq("id", submission.id)
      .select(
        "id,class_assignment_id,student_id,code,status,score,submitted_at,updated_at,updated_by",
      )
      .single();
    if (result.error) gradeStatus = "Valutazione non salvata.";
    else {
      submissions = submissions.map((item) =>
        item.id === submission.id ? (result.data as Submission) : item,
      );
      gradeStatus = "Valutazione salvata.";
    }
    savingId = "";
  }
</script>

<a class="button quiet back-link" href={`/reports/${backSection}`}
  >← Torna al report</a
>
<header class="page-head">
  <div>
    <p class="eyebrow">DETTAGLIO STUDENTE</p>
    <h1>{student?.full_name || student?.email || "Lavoro dello studente"}</h1>
    {#if student}<p>
        {studentMemberships
          .map(
            (membership) =>
              classes.find((item) => item.id === membership.class_id)?.name,
          )
          .filter(Boolean)
          .join(", ") || "Nessuna classe attiva"}
      </p>{/if}
  </div>
</header>
<ReportNav />

{#if session.profile?.role !== "teacher"}<p class="error">
    Questa pagina è riservata al docente.
  </p>{:else if loading}<div class="spinner"></div>{:else if error}<p
    class="error"
  >
    {error}
  </p>{:else if !student}<p class="empty-state">
    Studente non disponibile o non appartenente alle tue classi.
  </p>{:else}<section class="summary-grid" aria-label="Riepilogo del lavoro">
    <article><strong>{work.length}</strong><span>Assegnati</span></article>
    <article><strong>{openedCount}</strong><span>Aperti</span></article>
    <article><strong>{submittedCount}</strong><span>Consegnati</span></article>
    <article><strong>{passedCount}</strong><span>Superati</span></article>
  </section>

  <section class="student-work" aria-labelledby="student-work-title">
    <h2 id="student-work-title">Attività assegnate</h2>
    {#each work as item}<article class="work-item">
        <div class="work-heading">
          <div>
            <h3>{item.exercise?.title || "Esercizio non disponibile"}</h3>
            <p>{item.classroom?.name}</p>
          </div>
          <span class={`submission-status ${item.submission?.status || "new"}`}
            >{statusLabel(item.submission?.status)}</span
          >
        </div>
        <dl>
          <div>
            <dt>Scadenza</dt>
            <dd>{formatDate(item.assignment.deadline)}</dd>
          </div>
          <div>
            <dt>Prima apertura</dt>
            <dd>{formatDate(item.view?.first_opened_at)}</dd>
          </div>
          <div>
            <dt>Ultimo aggiornamento</dt>
            <dd>{formatDate(item.submission?.updated_at)}</dd>
          </div>
          <div>
            <dt>Consegna</dt>
            <dd>{formatDate(item.submission?.submitted_at)}</dd>
          </div>
          <div>
            <dt>Punteggio</dt>
            <dd>{item.submission?.score ?? "—"}</dd>
          </div>
        </dl>
        {#if item.submission}<details>
            <summary>Mostra il codice dello studente</summary>
            <pre><code>{item.submission.code || "# Nessun codice salvato"}</code
              ></pre>
          </details>
          {#if item.assignment.grading_scale}<form
              class="grade-form"
              aria-label={`Valuta ${item.exercise?.title || "esercizio"}`}
              onsubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void saveGrade(
                  item.submission!,
                  form.get("status") as "passed" | "partial" | "failed",
                  Number(form.get("score")),
                );
              }}
            >
              <label
                >Esito<select
                  name="status"
                  aria-label={`Esito ${item.exercise?.title}`}
                  value={item.submission.status === "submitted"
                    ? "partial"
                    : item.submission.status}
                >
                  <option value="passed">Superato</option>
                  <option value="partial">Parziale</option>
                  <option value="failed">Non superato</option>
                </select></label
              >
              <label
                >Punteggio<input
                  name="score"
                  aria-label={`Punteggio ${item.exercise?.title}`}
                  type="number"
                  min="0"
                  max={item.assignment.grading_scale}
                  value={item.submission.score ?? ""}
                  required
                /></label
              ><button
                class="secondary"
                disabled={savingId === item.submission.id}
                >Salva valutazione</button
              >
            </form>{/if}{/if}
      </article>{:else}<p class="empty-state">
        Nessuna attività assegnata a questo studente.
      </p>{/each}
    {#if gradeStatus}<p role="status">{gradeStatus}</p>{/if}
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
  .student-work {
    display: grid;
    gap: var(--space-4);
  }
  .work-item {
    border: var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
    background: linear-gradient(
      145deg,
      var(--color-surface-raised),
      var(--color-surface)
    );
  }
  .work-heading {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    align-items: flex-start;
  }
  .work-heading h3,
  .work-heading p {
    margin-bottom: var(--space-1);
  }
  .submission-status {
    flex: 0 0 auto;
    border-radius: 999px;
    padding: 0.3rem 0.65rem;
    color: var(--color-muted);
    background: var(--color-surface-subtle);
    font-size: var(--font-size-xs);
    font-weight: 700;
  }
  .submission-status.passed {
    color: #7ee6b7;
    background: rgb(66 211 146 / 10%);
  }
  dl {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: var(--space-4);
    margin: var(--space-5) 0 0;
  }
  dl div {
    min-width: 0;
  }
  dt {
    color: var(--color-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
    text-transform: uppercase;
  }
  dd {
    margin: var(--space-1) 0 0;
    overflow-wrap: anywhere;
  }
  details {
    margin-top: var(--space-5);
    border-top: var(--border);
    padding-top: var(--space-4);
  }
  .grade-form {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: var(--space-3);
    align-items: end;
    margin-top: var(--space-5);
    border-top: var(--border);
    padding-top: var(--space-4);
  }
  summary {
    width: fit-content;
    color: var(--color-primary-soft);
    cursor: pointer;
    font-weight: 650;
  }
  pre {
    max-height: 24rem;
    margin: var(--space-4) 0 0;
    border-radius: var(--radius-md);
    padding: var(--space-4);
    overflow: auto;
    background: var(--color-surface-subtle);
    font-family: var(--font-code);
    white-space: pre-wrap;
  }
  @media (max-width: 900px) {
    dl {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 650px) {
    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .work-heading {
      display: grid;
    }
    dl {
      grid-template-columns: 1fr;
    }
    .grade-form {
      grid-template-columns: 1fr;
    }
  }
</style>
