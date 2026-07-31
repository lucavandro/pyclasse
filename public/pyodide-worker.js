self.importScripts("https://cdn.jsdelivr.net/pyodide/v0.28.2/full/pyodide.js");
let runtime;
self.onmessage = async ({ data }) => {
  try {
    runtime ||= await self.loadPyodide();
    let output = "";
    runtime.setStdout({ batched: (text) => { output += text + "\n"; } });
    runtime.setStderr({ batched: (text) => { output += text + "\n"; } });
    const inputLines = String(data.stdin || "").split(/\r?\n/);
    runtime.setStdin({ stdin: () => inputLines.length ? inputLines.shift() : null });
    await runtime.runPythonAsync(data.code);
    if (data.mode === "test") {
      const cases = [
        { input: [], expected: 0 },
        { input: [1, 2, 3, 4], expected: 6 },
        { input: [2, 2, 2], expected: 6 },
        { input: [-4, -3, 5, 8], expected: 4 },
        { input: [1, 3, 5, 7], expected: 0 },
      ];
      let passed = 0;
      for (const test of cases) {
        const expression = `somma_pari(${JSON.stringify(test.input)})`;
        const result = await runtime.runPythonAsync(expression);
        if (result === test.expected) passed += 1;
        if (result && typeof result.destroy === "function") result.destroy();
      }
      self.postMessage({ ok: true, tests: { passed, total: cases.length } });
    } else {
      self.postMessage({ ok: true, output: output.trim() });
    }
  } catch (error) {
    self.postMessage({ ok: false, error: String(error) });
  }
};
