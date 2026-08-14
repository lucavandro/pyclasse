import assert from "node:assert/strict";
import test from "node:test";
import {
  buildExerciseTransfer,
  parseExerciseTransfer,
} from "../lib/exercise-transfer.mjs";

const validExercise = {
  title: "Somma",
  description: "Somma due numeri.",
  description_format: "markdown",
  resource_url: null,
  resource_label: null,
  constraints: "Usa input.",
  starter_code: "a = int(input())",
  verification_mode: "tests",
  max_points: 10,
  is_prerequisite: false,
  tags: ["input"],
  tests: [
    {
      position: 0,
      input_data: "2\n3",
      expected_output: "5",
      is_hidden: false,
      points: 10,
    },
  ],
};

test("parses and sanitizes a versioned exercise file", () => {
  const result = parseExerciseTransfer(
    JSON.stringify({
      format: "pyclasse-exercises",
      version: 1,
      exercises: [{ ...validExercise, tags: [" input ", "input"] }],
    }),
  );
  assert.equal(result.exercises[0].title, "Somma");
  assert.deepEqual(result.exercises[0].tags, ["input"]);
  assert.equal(result.exercises[0].tests[0].position, 0);
});

test("rejects malformed, unsupported and insecure imports", () => {
  assert.throws(() => parseExerciseTransfer("not json"), /sintassi JSON/);
  assert.throws(
    () =>
      parseExerciseTransfer(
        JSON.stringify({
          format: "pyclasse-exercises",
          version: 2,
          exercises: [],
        }),
      ),
    /versione non supportati/,
  );
  assert.throws(
    () =>
      parseExerciseTransfer(
        JSON.stringify({
          format: "pyclasse-exercises",
          version: 1,
          exercises: [
            { ...validExercise, resource_url: "http://example.test" },
          ],
        }),
      ),
    /deve usare HTTPS/,
  );
  assert.throws(
    () =>
      parseExerciseTransfer(
        JSON.stringify({
          format: "pyclasse-exercises",
          version: 1,
          exercises: [{ ...validExercise, title: "" }],
        }),
      ),
    /titolo.*obbligatorio/,
  );
});

test("export contains reusable teaching data but no ownership or assignment data", () => {
  const document = buildExerciseTransfer(
    [
      {
        ...validExercise,
        id: "exercise-id",
        teacher_id: "teacher-id",
        created_at: "2026-01-01",
        updated_at: "2026-01-02",
      },
    ],
    [{ ...validExercise.tests[0], id: "test-id", exercise_id: "exercise-id" }],
  );
  const serialized = JSON.stringify(document);
  assert.equal(document.format, "pyclasse-exercises");
  assert.equal(document.exercises[0].tests.length, 1);
  assert.doesNotMatch(serialized, /teacher-id|test-id|exercise-id/);
});
