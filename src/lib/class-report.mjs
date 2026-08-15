/**
 * Builds the class-level report from data already restricted by Supabase RLS.
 * Only published assignments contribute to learning-progress metrics.
 */
export function buildClassReport(
  /** @type {import("./types").Membership[]} */ memberships,
  /** @type {import("./types").Profile[]} */ profiles,
  /** @type {import("./types").Assignment[]} */ assignments,
  /** @type {import("./types").Submission[]} */ submissions,
  /** @type {import("./types").AssignmentView[]} */ views,
) {
  const publishedAssignments = assignments.filter(
    (assignment) => assignment.published_at,
  );
  const assignmentIds = new Set(
    publishedAssignments.map((assignment) => assignment.id),
  );

  const students = memberships.map((membership) => {
    const studentSubmissions = submissions.filter(
      (submission) =>
        submission.student_id === membership.student_id &&
        assignmentIds.has(submission.class_assignment_id),
    );
    const submitted = studentSubmissions.filter(
      (submission) => submission.status !== "draft",
    ).length;

    return {
      id: membership.student_id,
      profile: profiles.find((profile) => profile.id === membership.student_id),
      opened: views.filter(
        (view) =>
          view.student_id === membership.student_id &&
          assignmentIds.has(view.class_assignment_id),
      ).length,
      submitted,
      passed: studentSubmissions.filter(
        (submission) => submission.status === "passed",
      ).length,
      evaluated: studentSubmissions.filter(
        (submission) => submission.score !== null,
      ).length,
      progress: publishedAssignments.length
        ? Math.round((submitted / publishedAssignments.length) * 100)
        : 0,
    };
  });
  const possibleSubmissions = students.length * publishedAssignments.length;
  const submitted = students.reduce(
    (total, student) => total + student.submitted,
    0,
  );

  return {
    students,
    assignmentCount: publishedAssignments.length,
    submittedCount: submitted,
    completionRate: possibleSubmissions
      ? Math.round((submitted / possibleSubmissions) * 100)
      : 0,
  };
}
