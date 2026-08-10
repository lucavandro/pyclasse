import assert from "node:assert/strict";
import test from "node:test";
import { loadPyodide } from "pyodide";

test("Pyodide avvia Python ed esegue codice con gli asset installati", async () => {
  const pyodide = await loadPyodide();
  assert.equal(
    pyodide.runPython("sum(value * value for value in range(5))"),
    30,
  );
});
