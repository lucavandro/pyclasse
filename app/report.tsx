"use client";
import { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Submission, SubmissionStatus, Workspace } from "../lib/types";
import { scoreAsPercentage, validScore } from "../lib/learning-path.mjs";
import { useLocale } from "../lib/i18n";
import { PythonCodeBlock } from "./python-code-block";

const statusLabels = {
  it: {
    draft: "In lavorazione",
    submitted: "Da valutare",
    passed: "Superato",
    partial: "Parzialmente superato",
    failed: "Da rivedere",
  },
  en: {
    draft: "In progress",
    submitted: "Awaiting review",
    passed: "Passed",
    partial: "Partially passed",
    failed: "Needs revision",
  },
} as const;

type ReportStatus = "all" | Exclude<SubmissionStatus, "draft">;

export function ReportV2({
  data,
  reload,
  notify,
}: {
  data: Workspace;
  reload: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const { locale } = useLocale();
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<ReportStatus>("all");
  const [query, setQuery] = useState("");
  const submissions = data.submissions.filter(
    (item) => item.status !== "draft",
  );
  const normalizedScores = submissions.flatMap((item) => {
    const assignment = data.assignments.find(
      (candidate) => candidate.id === item.class_assignment_id,
    );
    const percentage = scoreAsPercentage(item.score, assignment?.grading_scale);
    return percentage === null ? [] : [percentage];
  });
  const average = normalizedScores.length
    ? Math.round(
        normalizedScores.reduce((sum, item) => sum + item, 0) /
          normalizedScores.length,
      )
    : null;
  const waiting = submissions.filter(
    (item) => item.status === "submitted",
  ).length;
  const reviewed = submissions.length - waiting;
  const visibleSubmissions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return submissions.filter((submission) => {
      const assignment = data.assignments.find(
        (item) => item.id === submission.class_assignment_id,
      );
      const exercise = data.exercises.find(
        (item) => item.id === assignment?.exercise_id,
      );
      const student = data.profiles.find(
        (item) => item.id === submission.student_id,
      );
      return (
        (classFilter === "all" || assignment?.class_id === classFilter) &&
        (statusFilter === "all" || submission.status === statusFilter) &&
        (!normalizedQuery ||
          `${student?.full_name || ""} ${student?.email || ""} ${exercise?.title || ""}`
            .toLocaleLowerCase()
            .includes(normalizedQuery))
      );
    });
  }, [classFilter, data, query, statusFilter, submissions]);

  return (
    <section className="report-page">
      <div className="report-overview panel">
        <div className="report-title-row">
          <div>
            <p className="eyebrow">DATI DELLE CONSEGNE</p>
            <h2>Report</h2>
            <p>
              {data.profile.role === "teacher"
                ? "Valuta le consegne e individua rapidamente ciò che richiede attenzione."
                : "Consulta lo stato e la valutazione dei compiti consegnati."}
            </p>
          </div>
          <span className="report-total">
            <strong>{submissions.length}</strong>
            <small>consegne</small>
          </span>
        </div>
        <div className="report-summary">
          {data.profile.role === "teacher" && (
            <>
              <article className="report-metric attention">
                <span className="material-symbols-rounded" aria-hidden="true">
                  pending_actions
                </span>
                <div>
                  <strong>{waiting}</strong>
                  <small>Da valutare</small>
                </div>
              </article>
              <article className="report-metric">
                <span className="material-symbols-rounded" aria-hidden="true">
                  task_alt
                </span>
                <div>
                  <strong>{reviewed}</strong>
                  <small>Valutate</small>
                </div>
              </article>
            </>
          )}
          <article className="report-metric">
            <span className="material-symbols-rounded" aria-hidden="true">
              monitoring
            </span>
            <div>
              <strong>{average === null ? "—" : `${average}%`}</strong>
              <small>Media dei compiti con voto</small>
            </div>
          </article>
        </div>
      </div>

      <section
        className="report-results panel"
        aria-labelledby="report-results-title"
      >
        <div className="panel-head">
          <div>
            <p className="eyebrow">CONSEGNE</p>
            <h3 id="report-results-title">
              {data.profile.role === "teacher"
                ? "Valutazioni"
                : "I tuoi risultati"}
            </h3>
          </div>
          {data.profile.role === "teacher" && (
            <span className="result-count">
              {visibleSubmissions.length} risultati
            </span>
          )}
        </div>

        {data.profile.role === "teacher" && (
          <div className="report-toolbar" aria-label="Filtri report">
            <label className="report-search">
              <span className="material-symbols-rounded" aria-hidden="true">
                search
              </span>
              <input
                aria-label="Cerca studente o esercizio"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cerca studente o esercizio"
              />
            </label>
            <label>
              <span>Classe</span>
              <select
                aria-label="Filtra report per classe"
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value)}
              >
                <option value="all">Tutte le classi</option>
                {data.classes.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Stato</span>
              <select
                aria-label="Filtra report per stato"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as ReportStatus)
                }
              >
                <option value="all">Tutti gli stati</option>
                <option value="submitted">Da valutare</option>
                <option value="passed">Superato</option>
                <option value="partial">Parziale</option>
                <option value="failed">Da rivedere</option>
              </select>
            </label>
          </div>
        )}

        <div
          className={`table${data.profile.role === "student" ? " student-report-table" : " teacher-report-table"}`}
        >
          <div className="table-row table-head">
            {data.profile.role === "teacher" && <span>Studente</span>}
            <span>Esercizio</span>
            {data.profile.role === "teacher" && <span>Classe</span>}
            <span>Stato</span>
            <span>Valutazione</span>
            {data.profile.role === "teacher" && <span>Azioni</span>}
          </div>
          {visibleSubmissions.map((submission) => (
            <ReviewRow
              key={submission.id}
              submission={submission}
              locale={locale}
              data={data}
              reload={reload}
              notify={notify}
            />
          ))}
        </div>
        {!visibleSubmissions.length && (
          <p className="empty-state">
            {submissions.length
              ? "Nessuna consegna corrisponde ai filtri selezionati."
              : "Nessuna consegna disponibile."}
          </p>
        )}
      </section>
    </section>
  );
}

function ReviewRow({
  submission,
  locale,
  data,
  reload,
  notify,
}: {
  submission: Submission;
  locale: "it" | "en";
  data: Workspace;
  reload: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const assignment = data.assignments.find(
    (item) => item.id === submission.class_assignment_id,
  );
  const exercise = data.exercises.find(
    (item) => item.id === assignment?.exercise_id,
  );
  const classroom = data.classes.find(
    (item) => item.id === assignment?.class_id,
  );
  const student = data.profiles.find(
    (item) => item.id === submission.student_id,
  );
  const [score, setScore] = useState(String(submission.score ?? ""));
  const [codeVisible, setCodeVisible] = useState(false);
  const grading = assignment?.grading_scale
    ? submission.score === null
      ? "Non ancora assegnato"
      : `${submission.score}/${assignment.grading_scale}`
    : "Senza voto";
  async function evaluate(status: "passed" | "failed") {
    if (!supabase) return;
    const numeric = Number(score);
    if (
      assignment?.grading_scale &&
      (score === "" || !validScore(numeric, assignment.grading_scale))
    )
      return notify(
        `Inserisci un voto intero da 0 a ${assignment.grading_scale}`,
      );
    const result = await supabase
      .from("submissions")
      .update({
        status,
        score: assignment?.grading_scale ? numeric : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", submission.id);
    if (result.error) notify(result.error.message);
    else {
      await reload();
      notify(
        status === "passed" ? "Consegna superata" : "Consegna da rivedere",
      );
    }
  }
  if (data.profile.role === "student") {
    return (
      <div className="table-row">
        <span className="student-report-exercise">{exercise?.title}</span>
        <span className={`submission-status status-${submission.status}`}>
          {statusLabels[locale][submission.status]}
        </span>
        <span className="student-report-grade">{grading}</span>
      </div>
    );
  }
  return (
    <div className="table-row">
      <span className="report-student">
        <strong>{student?.full_name || student?.email}</strong>
        <small>{student?.email}</small>
      </span>
      <span className="report-exercise">{exercise?.title}</span>
      <span>{classroom?.name || "—"}</span>
      <span className={`submission-status status-${submission.status}`}>
        {statusLabels[locale][submission.status]}
      </span>
      <span>
        {assignment?.grading_scale ? (
          <label className="report-score">
            <span>/{assignment.grading_scale}</span>
            <input
              aria-label={`Voto per ${exercise?.title}`}
              type="number"
              min="0"
              max={assignment.grading_scale}
              step="1"
              value={score}
              onChange={(event) => setScore(event.target.value)}
              placeholder="—"
            />
          </label>
        ) : (
          <span className="ungraded-label">Senza voto</span>
        )}
      </span>
      <span className="report-actions">
        <button
          className="icon-action view-code"
          aria-label={`${codeVisible ? "Nascondi" : "Visualizza"} codice di ${student?.full_name || student?.email}`}
          title={codeVisible ? "Nascondi codice" : "Visualizza codice"}
          aria-expanded={codeVisible}
          onClick={() => setCodeVisible((visible) => !visible)}
        >
          <span className="material-symbols-rounded" aria-hidden="true">
            {codeVisible ? "code_off" : "code"}
          </span>
        </button>
        <button
          className="icon-action approve"
          aria-label={`Segna ${exercise?.title} come superato`}
          title="Superato"
          onClick={() => void evaluate("passed")}
        >
          <span className="material-symbols-rounded" aria-hidden="true">
            check
          </span>
        </button>
        <button
          className="icon-action revise"
          aria-label={`Segna ${exercise?.title} da rivedere`}
          title="Da rivedere"
          onClick={() => void evaluate("failed")}
        >
          <span className="material-symbols-rounded" aria-hidden="true">
            replay
          </span>
        </button>
      </span>
      {codeVisible && (
        <section
          className="report-code-detail"
          aria-label={`Codice consegnato da ${student?.full_name || student?.email}`}
        >
          <header>
            <div>
              <strong>Codice della consegna</strong>
              <small>{exercise?.title}</small>
            </div>
            <button
              className="secondary"
              type="button"
              onClick={() => setCodeVisible(false)}
            >
              Chiudi
            </button>
          </header>
          <PythonCodeBlock
            code={submission.code}
            ariaLabel={`Codice consegnato da ${student?.full_name || student?.email}`}
          />
        </section>
      )}
    </div>
  );
}
