"use client";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { Submission, Workspace } from "../lib/types";
import { scoreAsPercentage, validScore } from "../lib/learning-path.mjs";
import { LiveMonitor } from "./live-monitor";
import { useLocale } from "../lib/i18n";

const statusLabels = {
  it: {
    draft: "In lavorazione",
    submitted: "Consegnato",
    passed: "Superato",
    partial: "Parzialmente superato",
    failed: "Da rivedere",
  },
  en: {
    draft: "In progress",
    submitted: "Submitted",
    passed: "Passed",
    partial: "Partially passed",
    failed: "Needs revision",
  },
} as const;

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
  return (
    <section className="panel full-panel">
      <LiveMonitor data={data} notify={notify} />
      <div className="panel-head">
        <div>
          <p className="eyebrow">DATI DELLE CONSEGNE</p>
          <h3>Report</h3>
        </div>
      </div>
      <div className="report-summary">
        <article className="stat-card">
          <strong>{submissions.length}</strong>
          <small>Consegne</small>
        </article>
        <article className="stat-card">
          <strong>{average === null ? "—" : `${average}%`}</strong>
          <small>Media dei compiti con voto</small>
        </article>
      </div>
      <div
        className={`table${data.profile.role === "student" ? " student-report-table" : ""}`}
      >
        <div className="table-row table-head">
          {data.profile.role === "teacher" && <span>Studente</span>}
          <span>Esercizio</span>
          <span>Stato</span>
          <span>Valutazione</span>
          {data.profile.role === "teacher" && <span>Azioni</span>}
        </div>
        {submissions.map((submission) => (
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
      {!submissions.length && (
        <p className="empty-state">Nessuna consegna disponibile.</p>
      )}
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
  const student = data.profiles.find(
    (item) => item.id === submission.student_id,
  );
  const [score, setScore] = useState(String(submission.score ?? ""));
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
      <span>
        <strong>{student?.full_name || student?.email}</strong>
      </span>
      <span>{exercise?.title}</span>
      <span className={`submission-status status-${submission.status}`}>
        {statusLabels[locale][submission.status]}
      </span>
      <span>
        {assignment?.grading_scale ? (
          <label>
            Voto /{assignment.grading_scale}
            <input
              aria-label={`Voto per ${exercise?.title}`}
              type="number"
              min="0"
              max={assignment.grading_scale}
              step="1"
              value={score}
              onChange={(event) => setScore(event.target.value)}
            />
          </label>
        ) : (
          "Senza voto"
        )}
      </span>
      <span>
        <button className="primary" onClick={() => void evaluate("passed")}>
          Superato
        </button>
        <button className="secondary" onClick={() => void evaluate("failed")}>
          Da rivedere
        </button>
      </span>
    </div>
  );
}
