import assert from "node:assert/strict";
import test from "node:test";
import { canSubmitSolution, deadlineForClass, resolveRoute, updateCanonicalExercise } from "../lib/domain.mjs";

test("risolve tutte le rotte stateful", () => {
  assert.deepEqual(resolveRoute("/classes/2/edit"), { view: "class-form", id: 2, edit: true });
  assert.deepEqual(resolveRoute("/classes/2"), { view: "class-detail", id: 2 });
  assert.deepEqual(resolveRoute("/exercises/7/edit"), { view: "exercise-form", id: 7, edit: true });
  assert.deepEqual(resolveRoute("/exercises/7"), { view: "editor", id: 7 });
  assert.equal(resolveRoute("/settings/").view, "settings");
  assert.equal(resolveRoute("/sconosciuta").notFound, true);
});

test("la consegna richiede tutti i test sul codice corrente", () => {
  assert.equal(canSubmitSolution({ passed: 5, total: 5, testedCode: "print(1)" }, "print(1)"), true);
  assert.equal(canSubmitSolution({ passed: 4, total: 5, testedCode: "print(1)" }, "print(1)"), false);
  assert.equal(canSubmitSolution({ passed: 5, total: 5, testedCode: "print(1)" }, "print(2)"), false);
  assert.equal(canSubmitSolution({ passed: 0, total: 0, testedCode: "" }, ""), false);
});

test("le scadenze restano specifiche per classe", () => {
  const links = [{ className: "4ESA", deadline: "2026-08-02" }, { className: "3BSA", deadline: "2026-08-09" }];
  assert.equal(deadlineForClass(links, "4ESA"), "2026-08-02");
  assert.equal(deadlineForClass(links, "3BSA"), "2026-08-09");
  assert.equal(deadlineForClass(links, "5A"), null);
});

test("la modifica canonica non duplica l'esercizio", () => {
  const source = [{ id: 1, title: "Prima", assignments: ["4ESA", "3BSA"] }, { id: 2, title: "Altro" }];
  const updated = updateCanonicalExercise(source, 1, { title: "Aggiornato" });
  assert.equal(updated.length, 2);
  assert.equal(updated[0].title, "Aggiornato");
  assert.deepEqual(updated[0].assignments, ["4ESA", "3BSA"]);
  assert.equal(source[0].title, "Prima");
});
