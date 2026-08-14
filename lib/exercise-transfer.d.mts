import type { Exercise, ExerciseTest } from "./types";

export type ImportedExerciseTest = Pick<
  ExerciseTest,
  | "position"
  | "input_data"
  | "expected_output"
  | "is_hidden"
  | "points"
>;

export type ImportedExercise = Pick<
  Exercise,
  | "title"
  | "description"
  | "description_format"
  | "resource_url"
  | "resource_label"
  | "constraints"
  | "starter_code"
  | "verification_mode"
  | "max_points"
  | "is_prerequisite"
  | "tags"
> & { tests: ImportedExerciseTest[] };

export type ExerciseTransfer = {
  format: "pyclasse-exercises";
  version: 1;
  exported_at?: string;
  exercises: ImportedExercise[];
};

export function parseExerciseTransfer(text: string): Pick<
  ExerciseTransfer,
  "exercises"
>;

export function buildExerciseTransfer(
  exercises: Exercise[],
  tests: ExerciseTest[],
): ExerciseTransfer;
