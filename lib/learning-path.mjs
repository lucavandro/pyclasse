export function normalizeTags(value) {
  return [
    ...new Set(
      String(value)
        .split(",")
        .map((tag) => tag.trim().toLocaleLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function validScore(value, scale = 100) {
  return (
    (scale === 10 || scale === 100) &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= scale
  );
}

export function scoreAsPercentage(value, scale) {
  if (!validScore(value, scale)) return null;
  return Math.round((value / scale) * 100);
}

export function isSafeExternalResource(value) {
  if (!value) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function isAssignmentLocked(
  assignments,
  exercises,
  submissions,
  assignment,
  studentId,
) {
  return assignments.some(
    (previous) =>
      previous.class_id === assignment.class_id &&
      previous.position < assignment.position &&
      previous.published_at &&
      exercises.find((exercise) => exercise.id === previous.exercise_id)
        ?.is_prerequisite &&
      !submissions.some(
        (submission) =>
          submission.class_assignment_id === previous.id &&
          submission.student_id === studentId &&
          submission.status !== "draft",
      ),
  );
}
