"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type {
  EditorSession,
  Exercise,
  Profile,
  Submission,
  Workspace,
} from "../lib/types";
import { PythonEditor } from "./python-editor";

const isMonitorable = (submission: Submission) => submission.status === "draft";

export function LiveMonitor({
  data,
  notify,
  classId = "all",
  activity = "all",
}: {
  data: Workspace;
  notify: (message: string) => void;
  classId?: string;
  activity?: "all" | "active" | "inactive";
}) {
  const [rows, setRows] = useState<Submission[]>(
    data.submissions.filter(isMonitorable),
  );
  const [sessions, setSessions] = useState<EditorSession[]>(
    data.editorSessions,
  );
  const [now, setNow] = useState(() => Date.now());
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
            payload.eventType === "DELETE" || !isMonitorable(changed)
              ? current.filter((item) => item.id !== changed.id)
              : [changed, ...current.filter((item) => item.id !== changed.id)],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "editor_sessions" },
        (payload) => {
          const changed = (payload.new || payload.old) as EditorSession;
          setSessions((current) =>
            payload.eventType === "DELETE"
              ? current.filter((item) => item.user_id !== changed.user_id)
              : [
                  changed,
                  ...current.filter((item) => item.user_id !== changed.user_id),
                ],
          );
        },
      )
      .subscribe();
    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [data.profile.role]);

  useEffect(() => {
    const refresh = async () => {
      setNow(Date.now());
      if (!supabase || data.profile.role !== "teacher") return;
      const result = await supabase
        .from("editor_sessions")
        .select(
          "user_id,context,class_assignment_id,code,active_until,updated_at",
        );
      if (!result.error) setSessions(result.data as EditorSession[]);
    };
    const timer = setInterval(() => void refresh(), 3_000);
    return () => clearInterval(timer);
  }, [data.profile.role]);

  const isActive = (submission: Submission) =>
    sessions.some(
      (session) =>
        session.context === "exercise" &&
        session.user_id === submission.student_id &&
        session.class_assignment_id === submission.class_assignment_id &&
        new Date(session.active_until).getTime() > now,
    );
  const visibleRows = rows.filter((submission) => {
    const assignment = assignments.get(submission.class_assignment_id);
    const active = isActive(submission);
    return (
      (classId === "all" || assignment?.class_id === classId) &&
      (activity === "all" || (activity === "active" ? active : !active))
    );
  });

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
      {visibleRows.length ? (
        visibleRows.map((submission) => {
          const assignment = assignments.get(submission.class_assignment_id);
          const exercise = assignment
            ? exercises.get(assignment.exercise_id)
            : undefined;
          return (
            <LiveDraft
              key={`${submission.id}:${submission.updated_at}`}
              submission={submission}
              exercise={exercise}
              student={profiles.get(submission.student_id)}
              teacherId={data.profile.id}
              notify={notify}
              active={isActive(submission)}
            />
          );
        })
      ) : (
        <p className="empty-state">
          Nessun lavoro non consegnato corrisponde ai filtri selezionati.
        </p>
      )}
    </section>
  );
}

export function MonitoringPage({
  data,
  notify,
}: {
  data: Workspace;
  notify: (message: string) => void;
}) {
  const [classId, setClassId] = useState("all");
  const [activity, setActivity] = useState<"all" | "active" | "inactive">(
    "all",
  );
  if (data.profile.role !== "teacher") return null;
  return (
    <section className="monitoring-page panel">
      <div className="monitor-filters">
        <label className="monitor-class-filter">
          <span>Classe</span>
          <select
            aria-label="Filtra monitoraggio per classe"
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
          >
            <option value="all">Tutte le classi</option>
            {data.classes.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name}
              </option>
            ))}
          </select>
        </label>
        <label className="monitor-class-filter">
          <span>Attività</span>
          <select
            aria-label="Filtra monitoraggio per attività"
            value={activity}
            onChange={(event) =>
              setActivity(event.target.value as typeof activity)
            }
          >
            <option value="all">Tutti i lavori aperti</option>
            <option value="active">Editor aperto ora</option>
            <option value="inactive">Lavoro aperto, non attivo</option>
          </select>
        </label>
      </div>
      <LiveMonitor
        data={data}
        notify={notify}
        classId={classId}
        activity={activity}
      />
    </section>
  );
}

function LiveDraft({
  submission,
  exercise,
  student,
  teacherId,
  notify,
  active,
}: {
  submission: Submission;
  exercise?: Exercise;
  student?: Profile;
  teacherId: string;
  notify: (message: string) => void;
  active: boolean;
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
  const studentName = student?.full_name || student?.email || "Studente";
  return (
    <article className="live-draft">
      <header>
        <div>
          <strong>{studentName}</strong>
          <small>{exercise?.title} · in lavorazione</small>
        </div>
        <span className={active ? "activity-badge active" : "activity-badge"}>
          {active ? "Editor aperto ora" : "Lavoro aperto, non attivo"}
        </span>
      </header>
      <PythonEditor
        ariaLabel={`Codice di ${studentName}`}
        value={code}
        onChange={setCode}
        allowClipboard
      />
      <button className="primary" onClick={() => void save()}>
        Invia modifica allo studente
      </button>
    </article>
  );
}
