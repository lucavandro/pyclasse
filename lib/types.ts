export type Role = "teacher" | "student";
export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "passed"
  | "partial"
  | "failed";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  last_seen_at: string | null;
  external_ai_enabled: boolean;
};
export type Classroom = {
  id: string;
  teacher_id: string;
  name: string;
  subject: string;
  join_code: string;
  archived_at: string | null;
  created_at: string;
};
export type Membership = {
  class_id: string;
  student_id: string;
  joined_at: string;
};
export type Exercise = {
  id: string;
  teacher_id: string;
  title: string;
  description: string;
  description_format: "markdown";
  resource_url: string | null;
  resource_label: string | null;
  constraints: string;
  starter_code: string;
  verification_mode: "tests" | "ai";
  max_points: number;
  is_prerequisite: boolean;
  tags: string[];
  updated_at: string;
  created_at: string;
};
export type Assignment = {
  id: string;
  exercise_id: string;
  class_id: string;
  deadline: string | null;
  published_at: string | null;
  grading_scale: 10 | 100 | null;
  position: number;
  created_at: string;
};
export type ExerciseTest = {
  id: string;
  exercise_id: string;
  position: number;
  input_data: string;
  expected_output: string;
  is_hidden: boolean;
  points: number;
};
export type Submission = {
  id: string;
  class_assignment_id: string;
  student_id: string;
  code: string;
  status: SubmissionStatus;
  score: number | null;
  submitted_at: string | null;
  updated_at: string;
  updated_by: string | null;
};
export type Settings = {
  singleton: boolean;
  teacher_email: string | null;
  school_name: string;
  login_title_it: string;
  login_subtitle_it: string;
  login_title_en: string;
  login_subtitle_en: string;
};
export type Workspace = {
  profile: Profile;
  settings: Settings | null;
  profiles: Profile[];
  classes: Classroom[];
  memberships: Membership[];
  exercises: Exercise[];
  assignments: Assignment[];
  tests: ExerciseTest[];
  submissions: Submission[];
};
