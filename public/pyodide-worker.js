import "/vendor/pyodide/pyodide.js";
let runtime;
self.onmessage = async ({ data }) => {
  try {
    runtime ||= await self.loadPyodide({ indexURL: "/vendor/pyodide/" });
    let output = "";
    const appendOutput = (text) => {
      if (output.length < 50000) output += text + "\n";
      if (output.length >= 50000 && !output.endsWith("[output limitato]\n")) output = output.slice(0, 50000) + "\n[output limitato]\n";
    };
    runtime.setStdout({ batched: appendOutput });
    runtime.setStderr({ batched: appendOutput });
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
      const cases = Array.isArray(data.tests) ? data.tests : [];
      let passed = 0;
      for (const test of cases) {
        const result = await runtime.runPythonAsync(String(test.input));
        const normalized = String(result).trim();
        if (normalized === String(test.expected).trim()) passed += 1;
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
