import { supabase } from "$lib/supabase";
import type {
  Assignment,
  AssignmentView,
  Classroom,
  CodeSnippet,
  EditorSession,
  Exercise,
  ExerciseTest,
  Membership,
  Profile,
  Settings,
  Submission,
} from "$lib/types";

async function rows<T>(table: string, select = "*"): Promise<T[]> {
  if (!supabase) return [];
  const result = await supabase.from(table).select(select);
  if (result.error) throw result.error;
  return result.data as T[];
}

export const getClasses = () =>
  Promise.all([
    rows<Classroom>(
      "classes",
      "id,teacher_id,name,subject,join_code,archived_at,created_at",
    ),
    rows<Membership>("class_members", "class_id,student_id,joined_at"),
    rows<Profile>(
      "profiles",
      "id,email,full_name,role,last_seen_at,external_ai_enabled",
    ),
  ]);
export const getExercises = () =>
  Promise.all([
    rows<Exercise>("exercises"),
    rows<Assignment>("class_assignments"),
    rows<Classroom>(
      "classes",
      "id,teacher_id,name,subject,join_code,archived_at,created_at",
    ),
    rows<Submission>(
      "submissions",
      "id,class_assignment_id,student_id,code,status,score,submitted_at,updated_at,updated_by",
    ),
  ]);
export const getExerciseTransferData = () =>
  Promise.all([rows<Exercise>("exercises"), rows<ExerciseTest>("tests")]);
export const getExercise = async (id: string) => {
  if (!supabase) throw new Error("Supabase non configurato");
  const [exercise, tests, assignments, submissions, classes] =
    await Promise.all([
      supabase.from("exercises").select("*").eq("id", id).single(),
      supabase
        .from("tests")
        .select("*")
        .eq("exercise_id", id)
        .order("position"),
      supabase.from("class_assignments").select("*").eq("exercise_id", id),
      rows<Submission>("submissions"),
      rows<Classroom>("classes"),
    ]);
  if (exercise.error || tests.error || assignments.error)
    throw exercise.error || tests.error || assignments.error;
  return {
    exercise: exercise.data as Exercise,
    tests: tests.data as ExerciseTest[],
    assignments: assignments.data as Assignment[],
    submissions,
    classes,
  };
};
export const getReports = () =>
  Promise.all([
    rows<Profile>("profiles"),
    rows<Classroom>("classes"),
    rows<Membership>("class_members"),
    rows<Exercise>("exercises"),
    rows<Assignment>("class_assignments"),
    rows<Submission>("submissions"),
    rows<AssignmentView>("assignment_views"),
  ]);
export const getMonitor = () =>
  Promise.all([
    rows<Profile>("profiles"),
    rows<Classroom>("classes"),
    rows<Exercise>("exercises"),
    rows<Assignment>("class_assignments"),
    rows<Submission>("submissions"),
    rows<EditorSession>("editor_sessions"),
  ]);
export const getSnippets = () => rows<CodeSnippet>("code_snippets");
export async function getSettings(): Promise<Settings | null> {
  if (!supabase) return null;
  const r = await supabase.from("app_settings").select("*").maybeSingle();
  if (r.error) throw r.error;
  return r.data as Settings | null;
}
