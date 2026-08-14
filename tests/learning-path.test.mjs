import test from "node:test";
import assert from "node:assert/strict";
import {
  isAssignmentLocked,
  isSafeExternalResource,
  normalizeTags,
  scoreAsPercentage,
  validScore,
} from "../lib/learning-path.mjs";

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
