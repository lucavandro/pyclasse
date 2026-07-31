self.importScripts("https://cdn.jsdelivr.net/pyodide/v0.28.2/full/pyodide.js");
let runtime;
self.onmessage = async ({ data }) => {
  try {
    runtime ||= await self.loadPyodide();
    let output = "";
    runtime.setStdout({ batched: (text) => { output += text + "\n"; } });
    runtime.setStderr({ batched: (text) => { output += text + "\n"; } });
    await runtime.runPythonAsync(data.code);
    self.postMessage({ ok: true, output: output.trim() });
  } catch (error) {
    self.postMessage({ ok: false, error: String(error) });
  }
};
