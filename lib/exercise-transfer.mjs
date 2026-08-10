const FORMAT = "pyclasse-exercises";
const VERSION = 1;
const MAX_FILE_LENGTH = 1_000_000;
const MAX_EXERCISES = 100;
const MAX_TESTS = 100;

function fail(message) {
  throw new Error(`File JSON non valido: ${message}`);
}

function requiredString(value, label, maxLength = 20_000) {
  if (typeof value !== "string" || !value.trim())
    fail(`${label} è obbligatorio`);
  if (value.length > maxLength) fail(`${label} è troppo lungo`);
  return value.trim();
}

function optionalString(value, label, maxLength = 20_000) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.length > maxLength)
    fail(`${label} non è valido`);
  return value.trim() || null;
}

function positiveInteger(value, label, maximum = 10_000) {
  if (!Number.isInteger(value) || value < 1 || value > maximum)
    fail(`${label} deve essere un intero positivo`);
  return value;
}

function nonNegativeInteger(value, label, maximum = 10_000) {
  if (!Number.isInteger(value) || value < 0 || value > maximum)
    fail(`${label} deve essere un intero non negativo`);
  return value;
}

function parseTest(value, exerciseIndex, testIndex) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(
      `test ${testIndex + 1} dell'esercizio ${exerciseIndex + 1} non valido`,
    );
  return {
    position: nonNegativeInteger(value.position, "posizione del test"),
    input_data:
      typeof value.input_data === "string"
        ? value.input_data
        : fail("input del test non valido"),
    expected_output:
      typeof value.expected_output === "string"
        ? value.expected_output
        : fail("output atteso del test non valido"),
    is_hidden:
      typeof value.is_hidden === "boolean"
        ? value.is_hidden
        : fail("visibilità del test non valida"),
    points: positiveInteger(value.points, "punti del test"),
  };
}

function parseExercise(value, index) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(`esercizio ${index + 1} non valido`);
  if (value.description_format !== "markdown")
    fail("formato descrizione non supportato");
  if (value.verification_mode !== "tests" && value.verification_mode !== "ai")
    fail("modalità di verifica non supportata");
  if (
    !Array.isArray(value.tags) ||
    value.tags.some((tag) => typeof tag !== "string")
  )
    fail("i tag devono essere un elenco di testi");
  if (!Array.isArray(value.tests) || value.tests.length > MAX_TESTS)
    fail(`ogni esercizio può contenere al massimo ${MAX_TESTS} test`);
  const resourceUrl = optionalString(value.resource_url, "URL risorsa", 2_000);
  if (resourceUrl && !resourceUrl.startsWith("https://"))
    fail("l'URL della risorsa deve usare HTTPS");
  return {
    title: requiredString(value.title, "titolo", 200),
    description: requiredString(value.description, "descrizione"),
    description_format: "markdown",
    resource_url: resourceUrl,
    resource_label: optionalString(
      value.resource_label,
      "etichetta risorsa",
      200,
    ),
    constraints: requiredString(value.constraints, "vincoli"),
    starter_code:
      typeof value.starter_code === "string"
        ? value.starter_code
        : fail("codice iniziale non valido"),
    verification_mode: value.verification_mode,
    max_points: positiveInteger(value.max_points, "punteggio massimo"),
    is_prerequisite:
      typeof value.is_prerequisite === "boolean"
        ? value.is_prerequisite
        : fail("valore propedeutico non valido"),
    tags: [
      ...new Set(value.tags.map((tag) => tag.trim()).filter(Boolean)),
    ].slice(0, 20),
    tests: value.tests.map((test, testIndex) =>
      parseTest(test, index, testIndex),
    ),
  };
}

export function parseExerciseTransfer(text) {
  if (typeof text !== "string" || text.length > MAX_FILE_LENGTH)
    fail("file troppo grande");
  let document;
  try {
    document = JSON.parse(text);
  } catch {
    fail("sintassi JSON errata");
  }
  if (!document || document.format !== FORMAT || document.version !== VERSION)
    fail(
      `formato o versione non supportati (attesi ${FORMAT}, versione ${VERSION})`,
    );
  if (
    !Array.isArray(document.exercises) ||
    document.exercises.length < 1 ||
    document.exercises.length > MAX_EXERCISES
  )
    fail(`sono richiesti da 1 a ${MAX_EXERCISES} esercizi`);
  return { exercises: document.exercises.map(parseExercise) };
}

export function buildExerciseTransfer(exercises, tests) {
  return {
    format: FORMAT,
    version: VERSION,
    exported_at: new Date().toISOString(),
    exercises: exercises.map((exercise) => ({
      title: exercise.title,
      description: exercise.description,
      description_format: exercise.description_format,
      resource_url: exercise.resource_url,
      resource_label: exercise.resource_label,
      constraints: exercise.constraints,
      starter_code: exercise.starter_code,
      verification_mode: exercise.verification_mode,
      max_points: exercise.max_points,
      is_prerequisite: exercise.is_prerequisite,
      tags: exercise.tags,
      tests: tests
        .filter((test) => test.exercise_id === exercise.id)
        .map((test) => ({
          position: test.position,
          input_data: test.input_data,
          expected_output: test.expected_output,
          is_hidden: test.is_hidden,
          points: test.points,
        })),
    })),
  };
}
