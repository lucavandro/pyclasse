"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Exercise, Profile, Submission, Workspace } from "../lib/types";

export function LiveMonitor({
  data,
  notify,
}: {
  data: Workspace;
  notify: (message: string) => void;
}) {
  const [rows, setRows] = useState<Submission[]>(data.submissions);
  const assignments = useMemo(
    () => new Map(data.assignments.map((item) => [item.id, item])),
    [data.assignments],
  );
  const exercises = useMemo(
    () => new Map(data.exercises.map((item) => [item.id, item])),
    [data.exercises],
  );
  const profiles = useMemo(
    () => new Map(data.profiles.map((item) => [item.id, item])),
    [data.profiles],
  );
  useEffect(() => {
    if (!supabase || data.profile.role !== "teacher") return;
    const channel = supabase
      .channel("teacher-live-monitor")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        (payload) => {
          const changed = (payload.new || payload.old) as Submission;
          setRows((current) =>
            payload.eventType === "DELETE"
              ? current.filter((item) => item.id !== changed.id)
              : [changed, ...current.filter((item) => item.id !== changed.id)],
          );
        },
      )
      .subscribe();
    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [data.profile.role]);
  if (data.profile.role !== "teacher") return null;
  return (
    <section className="live-monitor">
      <div className="panel-head">
        <div>
          <p className="eyebrow">REALTIME</p>
          <h3>Monitoraggio lavori in corso</h3>
        </div>
        <span className="live-indicator">● In tempo reale</span>
      </div>
      {rows.length ? (
        rows.map((submission) => {
          const assignment = assignments.get(submission.class_assignment_id);
          const exercise = assignment
            ? exercises.get(assignment.exercise_id)
            : undefined;
          const student = profiles.get(submission.student_id);
          return (
            <LiveDraft
              key={`${submission.id}:${submission.updated_at}`}
              submission={submission}
              exercise={exercise}
              student={student}
              teacherId={data.profile.id}
              notify={notify}
            />
          );
        })
      ) : (
        <p className="empty-state">
          Nessuno studente ha ancora iniziato un esercizio.
        </p>
      )}
    </section>
  );
}

function LiveDraft({
  submission,
  exercise,
  student,
  teacherId,
  notify,
}: {
  submission: Submission;
  exercise?: Exercise;
  student?: Profile;
  teacherId: string;
  notify: (message: string) => void;
}) {
  const [code, setCode] = useState(submission.code);
  async function save() {
    if (!supabase) return;
    const result = await supabase
      .from("submissions")
      .update({
        code,
        updated_by: teacherId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", submission.id);
    notify(
      result.error
        ? result.error.message
        : "Modifica inviata allo studente in tempo reale",
    );
  }
  return (
    <article className="live-draft">
      <header>
        <div>
          <strong>{student?.full_name || student?.email}</strong>
          <small>
            {exercise?.title} ·{" "}
            {submission.status === "draft"
              ? "in lavorazione"
              : submission.status}
          </small>
        </div>
        <time>{new Date(submission.updated_at).toLocaleTimeString()}</time>
      </header>
      <label>
        Codice dello studente
        <textarea
          aria-label={`Codice di ${student?.full_name || student?.email}`}
          className="code-field"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </label>
      <button className="primary" onClick={() => void save()}>
        Invia modifica allo studente
      </button>
    </article>
  );
}
