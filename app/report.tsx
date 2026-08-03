"use client";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { Submission, Workspace } from "../lib/types";
import { scoreAsPercentage, validScore } from "../lib/learning-path.mjs";
import { LiveMonitor } from "./live-monitor";

export function ReportV2({
  data,
  reload,
  notify,
}: {
  data: Workspace;
  reload: () => Promise<void>;
  notify: (message: string) => void;
}) {
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
      <div className="table">
        <div className="table-row table-head">
          <span>Studente</span>
          <span>Esercizio</span>
          <span>Stato</span>
          <span>Valutazione</span>
          <span>Azioni</span>
        </div>
        {submissions.map((submission) => (
          <ReviewRow
            key={submission.id}
            submission={submission}
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
  data,
  reload,
  notify,
}: {
  submission: Submission;
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
  return (
    <div className="table-row">
      <span>
        <strong>{student?.full_name || student?.email}</strong>
      </span>
      <span>{exercise?.title}</span>
      <span>{submission.status}</span>
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
        {data.profile.role === "teacher" ? (
          <>
            <button className="primary" onClick={() => void evaluate("passed")}>
              Superato
            </button>
            <button
              className="secondary"
              onClick={() => void evaluate("failed")}
            >
              Da rivedere
            </button>
          </>
        ) : submission.score === null ? (
          "Senza voto"
        ) : (
          `${submission.score}/${assignment?.grading_scale ?? 100}`
        )}
      </span>
    </div>
  );
}
