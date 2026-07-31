self.importScripts("https://cdn.jsdelivr.net/pyodide/v0.28.2/full/pyodide.js");
let runtime;
self.onmessage = async ({ data }) => {
  try {
    runtime ||= await self.loadPyodide();
    let output = "";
    runtime.setStdout({ batched: (text) => { output += text + "\n"; } });
    runtime.setStderr({ batched: (text) => { output += text + "\n"; } });
    if (data.mode === "run_interactive") {
      const encodedInputs = JSON.stringify(JSON.stringify(data.inputs || []));
      const interactiveCode = `
import builtins, json
__pyclasse_inputs = json.loads(${encodedInputs})
__pyclasse_input_index = 0
def __pyclasse_input(prompt=""):
    global __pyclasse_input_index
    if __pyclasse_input_index >= len(__pyclasse_inputs):
        raise RuntimeError("__PYCLASSE_INPUT__" + str(prompt))
    value = __pyclasse_inputs[__pyclasse_input_index]
    __pyclasse_input_index += 1
    print(str(prompt) + value)
    return value
builtins.input = __pyclasse_input
` + data.code;
      try {
        await runtime.runPythonAsync(interactiveCode);
        self.postMessage({ ok: true, output: output.trim(), inputRequired: false });
      } catch (error) {
        const message = String(error);
        const marker = "__PYCLASSE_INPUT__";
        const markerIndex = message.lastIndexOf(marker);
        if (markerIndex >= 0) {
          const prompt = message.slice(markerIndex + marker.length).split("\n")[0].trim();
          self.postMessage({ ok: true, output: output.trim(), inputRequired: true, prompt });
        } else {
          throw error;
        }
      }
      return;
    }
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
