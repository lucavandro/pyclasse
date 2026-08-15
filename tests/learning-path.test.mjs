import test from "node:test";
import assert from "node:assert/strict";
import {
  isAssignmentLocked,
  isSafeExternalResource,
  normalizeTags,
  scoreAsPercentage,
  validScore,
} from "../lib/learning-path.mjs";
import { buildClassReport } from "../src/lib/class-report.mjs";

test("normalizza e deduplica i tag", () => {
  assert.deepEqual(normalizeTags(" Cicli, liste, cicli,  "), [
    "cicli",
    "liste",
  ]);
});

test("valida voti in decimi e centesimi e normalizza le medie", () => {
  assert.equal(validScore(10, 10), true);
  assert.equal(validScore(11, 10), false);
  assert.equal(validScore(100, 100), true);
  assert.equal(validScore(101, 100), false);
  assert.equal(validScore(9.5, 10), false);
  assert.equal(scoreAsPercentage(8, 10), 80);
  assert.equal(scoreAsPercentage(80, 100), 80);
  assert.equal(scoreAsPercentage(null, 10), null);
});

test("accetta risorse HTTPS e rifiuta protocolli pericolosi", () => {
  assert.equal(isSafeExternalResource(""), true);
  assert.equal(
    isSafeExternalResource("https://www.youtube.com/watch?v=abc"),
    true,
  );
  assert.equal(isSafeExternalResource("http://example.com"), false);
  assert.equal(isSafeExternalResource("javascript:alert(1)"), false);
});

test("applica correttamente il percorso propedeutico", () => {
  const assignments = [
    {
      id: "a",
      class_id: "c",
      exercise_id: "e1",
      position: 1,
      published_at: "now",
    },
    {
      id: "b",
      class_id: "c",
      exercise_id: "e2",
      position: 2,
      published_at: "now",
    },
  ];
  const exercises = [
    { id: "e1", is_prerequisite: true },
    { id: "e2", is_prerequisite: true },
  ];
  assert.equal(
    isAssignmentLocked(assignments, exercises, [], assignments[1], "s"),
    true,
  );
  assert.equal(
    isAssignmentLocked(
      assignments,
      exercises,
      [{ class_assignment_id: "a", student_id: "s", status: "submitted" }],
      assignments[1],
      "s",
    ),
    false,
  );
  assert.equal(
    isAssignmentLocked(
      assignments,
      exercises,
      [{ class_assignment_id: "a", student_id: "other", status: "submitted" }],
      assignments[1],
      "s",
    ),
    true,
  );
  exercises[0].is_prerequisite = false;
  assert.equal(
    isAssignmentLocked(assignments, exercises, [], assignments[1], "s"),
    false,
  );
});

test("calcola il report di classe sulle sole attività pubblicate", () => {
  const report = buildClassReport(
    [
      { class_id: "c", student_id: "s1", joined_at: "now" },
      { class_id: "c", student_id: "s2", joined_at: "now" },
    ],
    [
      { id: "s1", full_name: "Studente Uno" },
      { id: "s2", full_name: "Studente Due" },
    ],
    [
      { id: "a1", published_at: "now" },
      { id: "a2", published_at: "now" },
      { id: "draft", published_at: null },
    ],
    [
      {
        class_assignment_id: "a1",
        student_id: "s1",
        status: "passed",
        score: 9,
      },
      {
        class_assignment_id: "a2",
        student_id: "s1",
        status: "draft",
        score: null,
      },
      {
        class_assignment_id: "draft",
        student_id: "s2",
        status: "passed",
        score: 10,
      },
    ],
    [
      { class_assignment_id: "a1", student_id: "s1" },
      { class_assignment_id: "draft", student_id: "s2" },
    ],
  );

  assert.equal(report.assignmentCount, 2);
  assert.equal(report.submittedCount, 1);
  assert.equal(report.completionRate, 25);
  assert.deepEqual(
    report.students.map(
      ({ id, opened, submitted, passed, evaluated, progress }) => ({
        id,
        opened,
        submitted,
        passed,
        evaluated,
        progress,
      }),
    ),
    [
      {
        id: "s1",
        opened: 1,
        submitted: 1,
        passed: 1,
        evaluated: 1,
        progress: 50,
      },
      {
        id: "s2",
        opened: 0,
        submitted: 0,
        passed: 0,
        evaluated: 0,
        progress: 0,
      },
    ],
  );
});
