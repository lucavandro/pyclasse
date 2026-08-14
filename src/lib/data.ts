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

const classColumns =
  "id,teacher_id,name,subject,join_code,archived_at,created_at";
const exerciseColumns =
  "id,teacher_id,title,description,description_format,resource_url,resource_label,constraints,starter_code,verification_mode,max_points,is_prerequisite,tags,updated_at,created_at";
const assignmentColumns =
  "id,exercise_id,class_id,deadline,published_at,grading_scale,position,created_at";
const submissionSummaryColumns =
  "id,class_assignment_id,student_id,status,score,submitted_at,updated_at,updated_by";

async function rows<T>(table: string, select: string): Promise<T[]> {
  if (!supabase) return [];
  const result = await supabase.from(table).select(select);
  if (result.error) throw result.error;
  return result.data as T[];
}

export const getClasses = () =>
  Promise.all([
    rows<Classroom>("classes", classColumns),
    rows<Membership>("class_members", "class_id,student_id,joined_at"),
    rows<Profile>(
      "profiles",
      "id,email,full_name,role,last_seen_at,external_ai_enabled",
    ),
  ]);

export const getExercises = () =>
  Promise.all([
    rows<Exercise>("exercises", exerciseColumns),
    rows<Assignment>("class_assignments", assignmentColumns),
    rows<Classroom>("classes", classColumns),
    rows<Submission>("submissions", submissionSummaryColumns),
  ]);

export const getExerciseTransferData = () =>
  Promise.all([
    rows<Exercise>("exercises", exerciseColumns),
    rows<ExerciseTest>(
      "tests",
      "id,exercise_id,position,input_data,expected_output,is_hidden,points",
    ),
  ]);

export const getExercise = async (id: string) => {
  if (!supabase) throw new Error("Supabase non configurato");
  const [exercise, tests, assignments] = await Promise.all([
    supabase.from("exercises").select(exerciseColumns).eq("id", id).single(),
    supabase
      .from("tests")
      .select(
        "id,exercise_id,position,input_data,expected_output,is_hidden,points",
      )
      .eq("exercise_id", id)
      .order("position"),
    supabase
      .from("class_assignments")
      .select(assignmentColumns)
      .eq("exercise_id", id),
  ]);
  if (exercise.error || tests.error || assignments.error)
    throw exercise.error || tests.error || assignments.error;

  const assignmentIds = assignments.data.map((item) => item.id);
  const classIds = assignments.data.map((item) => item.class_id);
  const [submissions, classes] = await Promise.all([
    assignmentIds.length
      ? supabase
          .from("submissions")
          .select(
            "id,class_assignment_id,student_id,code,status,score,submitted_at,updated_at,updated_by",
          )
          .in("class_assignment_id", assignmentIds)
      : Promise.resolve({ data: [], error: null }),
    classIds.length
      ? supabase.from("classes").select(classColumns).in("id", classIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (submissions.error || classes.error)
    throw submissions.error || classes.error;
  return {
    exercise: exercise.data as Exercise,
    tests: tests.data as ExerciseTest[],
    assignments: assignments.data as Assignment[],
    submissions: submissions.data as Submission[],
    classes: classes.data as Classroom[],
  };
};

export async function getDashboard() {
  return Promise.all([
    rows<Classroom>("classes", "id"),
    rows<Assignment>("class_assignments", "id"),
    rows<Submission>("submissions", "id,status"),
  ]);
}

export async function getClassDetail(id: string) {
  if (!supabase) throw new Error("Supabase non configurato");
  const [classroom, members, assignments] = await Promise.all([
    supabase.from("classes").select(classColumns).eq("id", id).maybeSingle(),
    supabase
      .from("class_members")
      .select("class_id,student_id,joined_at")
      .eq("class_id", id),
    supabase
      .from("class_assignments")
      .select(assignmentColumns)
      .eq("class_id", id),
  ]);
  if (classroom.error || members.error || assignments.error)
    throw classroom.error || members.error || assignments.error;
  const studentIds = members.data.map((item) => item.student_id);
  const exerciseIds = assignments.data.map((item) => item.exercise_id);
  const [profiles, exercises] = await Promise.all([
    studentIds.length
      ? supabase
          .from("profiles")
          .select("id,email,full_name,role,last_seen_at,external_ai_enabled")
          .in("id", studentIds)
      : Promise.resolve({ data: [], error: null }),
    exerciseIds.length
      ? supabase.from("exercises").select(exerciseColumns).in("id", exerciseIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profiles.error || exercises.error)
    throw profiles.error || exercises.error;
  return {
    classroom: classroom.data as Classroom | null,
    members: members.data as Membership[],
    profiles: profiles.data as Profile[],
    assignments: assignments.data as Assignment[],
    exercises: exercises.data as Exercise[],
  };
}

export const getReportContext = () =>
  Promise.all([
    rows<Profile>(
      "profiles",
      "id,email,full_name,role,last_seen_at,external_ai_enabled",
    ),
    rows<Classroom>("classes", classColumns),
    rows<Membership>("class_members", "class_id,student_id,joined_at"),
    rows<Exercise>("exercises", "id,title"),
    rows<Assignment>("class_assignments", assignmentColumns),
    rows<AssignmentView>(
      "assignment_views",
      "class_assignment_id,student_id,first_opened_at",
    ),
  ]);

export async function getReports() {
  const [context, submissions] = await Promise.all([
    getReportContext(),
    rows<Submission>("submissions", submissionSummaryColumns),
  ]);
  const [profiles, classes, memberships, exercises, assignments, views] =
    context;
  return [
    profiles,
    classes,
    memberships,
    exercises,
    assignments,
    submissions,
    views,
  ] as const;
}

export async function getStudentSubmissions(studentId: string) {
  if (!supabase) return [];
  const result = await supabase
    .from("submissions")
    .select(
      "id,class_assignment_id,student_id,code,status,score,submitted_at,updated_at,updated_by",
    )
    .eq("student_id", studentId);
  if (result.error) throw result.error;
  return result.data as Submission[];
}

export const getMonitor = () =>
  Promise.all([
    rows<Profile>(
      "profiles",
      "id,email,full_name,role,last_seen_at,external_ai_enabled",
    ),
    rows<Classroom>("classes", "id,name"),
    rows<Exercise>("exercises", "id,title"),
    rows<Assignment>("class_assignments", "id,exercise_id,class_id"),
    rows<Submission>(
      "submissions",
      "id,class_assignment_id,student_id,code,status,score,submitted_at,updated_at,updated_by",
    ),
    rows<EditorSession>(
      "editor_sessions",
      "user_id,context,class_assignment_id,active_until,updated_at",
    ),
  ]);

export const getSnippets = () =>
  rows<CodeSnippet>(
    "code_snippets",
    "id,owner_id,name,code,created_at,updated_at",
  );

type LoginSettings = Pick<
  Settings,
  | "login_title_it"
  | "login_subtitle_it"
  | "login_title_en"
  | "login_subtitle_en"
>;

export async function getSettings(): Promise<LoginSettings | null> {
  if (!supabase) return null;
  const result = await supabase
    .from("app_settings")
    .select("login_title_it,login_subtitle_it,login_title_en,login_subtitle_en")
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data as LoginSettings | null;
}
