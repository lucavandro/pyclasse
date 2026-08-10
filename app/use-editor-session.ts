"use client";

import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

export function useEditorSession({
  enabled,
  userId,
  context,
  assignmentId = null,
  code,
}: {
  enabled: boolean;
  userId: string;
  context: "exercise" | "code_now";
  assignmentId?: string | null;
  code: string;
}) {
  const currentCode = useRef(code);
  useEffect(() => {
    currentCode.current = code;
  }, [code]);

  useEffect(() => {
    if (!supabase || !enabled) return;
    let stopped = false;
    const heartbeat = async () => {
      if (stopped) return;
      const now = new Date();
      await supabase!.from("editor_sessions").upsert({
        user_id: userId,
        context,
        class_assignment_id: assignmentId,
        code: currentCode.current,
        updated_at: now.toISOString(),
        active_until: new Date(now.getTime() + 25_000).toISOString(),
      });
    };
    void heartbeat();
    const timer = setInterval(() => void heartbeat(), 10_000);
    return () => {
      stopped = true;
      clearInterval(timer);
      void supabase?.rpc("close_editor_session");
    };
  }, [assignmentId, context, enabled, userId]);

  useEffect(() => {
    if (!supabase || !enabled) return;
    const timer = setTimeout(() => {
      const now = new Date();
      void supabase!.from("editor_sessions").upsert({
        user_id: userId,
        context,
        class_assignment_id: assignmentId,
        code,
        updated_at: now.toISOString(),
        active_until: new Date(now.getTime() + 25_000).toISOString(),
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [assignmentId, code, context, enabled, userId]);
}
