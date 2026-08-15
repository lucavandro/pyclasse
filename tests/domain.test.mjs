import assert from "node:assert/strict";
import test from "node:test";
import {
  canSubmitSolution,
  deadlineForClass,
  resolveRoute,
  updateCanonicalExercise,
} from "../lib/domain.mjs";

test("risolve tutte le rotte stateful", () => {
  assert.deepEqual(resolveRoute("/classes/2/edit"), {
    view: "class-form",
    id: 2,
    edit: true,
  });
  assert.deepEqual(resolveRoute("/classes/2"), { view: "class-detail", id: 2 });
  assert.deepEqual(resolveRoute("/exercises/7/edit"), {
    view: "exercise-form",
    id: 7,
    edit: true,
  });
  assert.deepEqual(resolveRoute("/exercises/7"), {
    view: "editor",
    id: 7,
    exerciseSection: "brief",
  });
  assert.deepEqual(resolveRoute("/exercises/7/editor"), {
    view: "editor",
    id: 7,
    exerciseSection: "code",
  });
  assert.deepEqual(resolveRoute("/reports/avanzamento/studenti/abc-def"), {
    view: "report-progress",
    studentId: "abc-def",
  });
  assert.deepEqual(resolveRoute("/reports/classi/abc-def"), {
    view: "report-class-detail",
    classId: "abc-def",
  });
  assert.deepEqual(resolveRoute("/classes/2/studenti/abc-def"), {
    view: "class-detail",
    id: 2,
    studentId: "abc-def",
  });
  assert.equal(resolveRoute("/settings/").view, "settings");
  assert.equal(resolveRoute("/sconosciuta").notFound, true);
});

test("risolve tutte le rotte statiche anche con slash finale", () => {
  const expected = new Map([
    ["/", "home"],
    ["/classes", "classes"],
    ["/classes/new", "class-form"],
    ["/exercises", "tasks"],
    ["/exercises/new", "exercise-form"],
    ["/reports", "report"],
    ["/reports/valutazioni", "report-evaluations"],
    ["/reports/avanzamento", "report-progress"],
    ["/reports/classi", "report-classes"],
    ["/reports/alert", "report-alerts"],
    ["/monitoring", "monitor"],
    ["/code-now", "code-now"],
    ["/settings", "settings"],
  ]);
  for (const [path, view] of expected) {
    assert.equal(resolveRoute(path).view, view);
    if (path !== "/") assert.equal(resolveRoute(`${path}/`).view, view);
  }
});

test("rifiuta identificativi e percorsi non previsti", () => {
  for (const path of [
    "/classes/x",
    "/classes/-1",
    "/classes/2/altro",
    "/exercises/x/edit",
    "/settings/admin",
    "//classes",
  ]) {
    assert.deepEqual(resolveRoute(path), { view: "home", notFound: true });
  }
});

test("la consegna richiede tutti i test sul codice corrente", () => {
  assert.equal(
    canSubmitSolution(
      { passed: 5, total: 5, testedCode: "print(1)" },
      "print(1)",
    ),
    true,
  );
  assert.equal(
    canSubmitSolution(
      { passed: 4, total: 5, testedCode: "print(1)" },
      "print(1)",
    ),
    false,
  );
  assert.equal(
    canSubmitSolution(
      { passed: 5, total: 5, testedCode: "print(1)" },
      "print(2)",
    ),
    false,
  );
  assert.equal(
    canSubmitSolution({ passed: 0, total: 0, testedCode: "" }, ""),
    false,
  );
});

test("la consegna rifiuta risultati incompleti o incoerenti", () => {
  assert.equal(
    canSubmitSolution({ passed: 6, total: 5, testedCode: "x" }, "x"),
    false,
  );
  assert.equal(
    canSubmitSolution({ passed: -1, total: 5, testedCode: "x" }, "x"),
    false,
  );
  assert.equal(
    canSubmitSolution({ passed: Number.NaN, total: 5, testedCode: "x" }, "x"),
    false,
  );
  assert.equal(
    canSubmitSolution({ passed: 1, total: 1, testedCode: "x\n" }, "x"),
    false,
  );
});

test("le scadenze restano specifiche per classe", () => {
  const links = [
    { className: "4ESA", deadline: "2026-08-02" },
    { className: "3BSA", deadline: "2026-08-09" },
  ];
  assert.equal(deadlineForClass(links, "4ESA"), "2026-08-02");
  assert.equal(deadlineForClass(links, "3BSA"), "2026-08-09");
  assert.equal(deadlineForClass(links, "5A"), null);
});

test("le scadenze gestiscono liste vuote e duplicati in modo deterministico", () => {
  assert.equal(deadlineForClass([], "4ESA"), null);
  assert.equal(
    deadlineForClass(
      [
        { className: "4ESA", deadline: "prima" },
        { className: "4ESA", deadline: "seconda" },
      ],
      "4ESA",
    ),
    "prima",
  );
  assert.equal(
    deadlineForClass([{ className: "4ESA", deadline: "" }], "4ESA"),
    "",
  );
});

test("la modifica canonica non duplica l'esercizio", () => {
  const source = [
    { id: 1, title: "Prima", assignments: ["4ESA", "3BSA"] },
    { id: 2, title: "Altro" },
  ];
  const updated = updateCanonicalExercise(source, 1, { title: "Aggiornato" });
  assert.equal(updated.length, 2);
  assert.equal(updated[0].title, "Aggiornato");
  assert.deepEqual(updated[0].assignments, ["4ESA", "3BSA"]);
  assert.equal(source[0].title, "Prima");
});

test("la modifica canonica preserva ordine e oggetti non interessati", () => {
  const untouched = { id: 2, title: "Altro" };
  const source = [
    { id: 1, title: "Prima" },
    untouched,
    { id: 3, title: "Terzo" },
  ];
  const updated = updateCanonicalExercise(source, 1, {
    title: "Nuovo",
    maxPoints: 80,
  });
  assert.deepEqual(
    updated.map((item) => item.id),
    [1, 2, 3],
  );
  assert.strictEqual(updated[1], untouched);
  assert.notStrictEqual(updated[0], source[0]);
  assert.equal(updated[0].maxPoints, 80);
});

test("una modifica con id inesistente non altera gli elementi", () => {
  const source = [{ id: 1, title: "Prima" }];
  const updated = updateCanonicalExercise(source, 99, { title: "Ignorato" });
  assert.notStrictEqual(updated, source);
  assert.strictEqual(updated[0], source[0]);
});
