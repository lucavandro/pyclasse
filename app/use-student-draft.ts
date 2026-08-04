"use client";

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { supabase } from "../lib/supabase";

type Assignment = { id: string } | undefined;

export function useStudentDraft({
  assignment,
  studentId,
  enabled,
  code,
  setCode,
  notify,
}: {
  assignment: Assignment;
  studentId: string;
  enabled: boolean;
  code: string;
  setCode: Dispatch<SetStateAction<string>>;
  notify: (message: string) => void;
}) {
  const synchronizedCode = useRef(code);
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
          ) {
            synchronizedCode.current = remote.code;
            setCode(remote.code);
          }
        },
      )
      .subscribe();
    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [assignment, enabled, setCode, studentId]);

  useEffect(() => {
    if (!supabase || !assignment || !enabled) return;
    // Initial database content and teacher-authored Realtime updates are already
    // synchronized; only a genuine student edit should create a new draft.
    if (code === synchronizedCode.current) return;
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
      else synchronizedCode.current = code;
    }, 700);
    return () => clearTimeout(timer);
  }, [assignment, code, enabled, notify, studentId]);
}
