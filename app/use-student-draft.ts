"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import { supabase } from "../lib/supabase";

type Draft = { id: string; status: string; code: string } | undefined;
type Assignment = { id: string } | undefined;

export function useStudentDraft({
  assignment,
  existing,
  studentId,
  enabled,
  code,
  setCode,
  notify,
}: {
  assignment: Assignment;
  existing: Draft;
  studentId: string;
  enabled: boolean;
  code: string;
  setCode: Dispatch<SetStateAction<string>>;
  notify: (message: string) => void;
}) {
  useEffect(() => {
    if (!supabase || !assignment || !enabled) return;
    const channel = supabase
      .channel(`draft:${assignment.id}:${studentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "submissions",
          filter: `class_assignment_id=eq.${assignment.id}`,
        },
        (payload) => {
          const remote = payload.new as {
            student_id?: string;
            updated_by?: string;
            code?: string;
          };
          if (
            remote.student_id === studentId &&
            remote.updated_by !== studentId &&
            typeof remote.code === "string"
          )
            setCode(remote.code);
        },
      )
      .subscribe();
    const fallback = setInterval(async () => {
      const result = await supabase!
        .from("submissions")
        .select("code,updated_by")
        .eq("class_assignment_id", assignment.id)
        .eq("student_id", studentId)
        .maybeSingle();
      if (
        result.data?.updated_by !== studentId &&
        typeof result.data?.code === "string"
      )
        setCode((current) =>
          current === result.data!.code ? current : result.data!.code,
        );
    }, 1500);
    return () => {
      clearInterval(fallback);
      void supabase?.removeChannel(channel);
    };
  }, [assignment, enabled, setCode, studentId]);

  useEffect(() => {
    if (
      !supabase ||
      !assignment ||
      !enabled ||
      (existing && existing.status !== "draft")
    )
      return;
    const timer = setTimeout(async () => {
      const result = await supabase!.from("submissions").upsert(
        {
          class_assignment_id: assignment.id,
          student_id: studentId,
          code,
          status: "draft",
          score: null,
          test_results: [],
          submitted_at: null,
          updated_by: studentId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "class_assignment_id,student_id" },
      );
      if (result.error)
        notify(`Salvataggio automatico non riuscito: ${result.error.message}`);
    }, 700);
    return () => clearTimeout(timer);
  }, [assignment, code, enabled, existing, notify, studentId]);
}
