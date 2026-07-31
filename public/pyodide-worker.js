self.importScripts("https://cdn.jsdelivr.net/pyodide/v0.28.2/full/pyodide.js");
let runtime;
self.onmessage = async ({ data }) => {
  try {
    runtime ||= await self.loadPyodide();
    let output = "";
    runtime.setStdout({ batched: (text) => { output += text + "\n"; } });
    runtime.setStderr({ batched: (text) => { output += text + "\n"; } });
    if (data.mode === "repl_exec") {
      runtime.globals.set("__pyclasse_command", data.command);
      await runtime.runPythonAsync(`
import ast
_tree = ast.parse(__pyclasse_command, mode="exec")
if _tree.body and isinstance(_tree.body[-1], ast.Expr):
    _last = _tree.body.pop()
    if _tree.body:
        exec(compile(_tree, "<pyclasse-shell>", "exec"), globals())
    _value = eval(compile(ast.Expression(_last.value), "<pyclasse-shell>", "eval"), globals())
    if _value is not None:
        print(repr(_value))
else:
    exec(compile(_tree, "<pyclasse-shell>", "exec"), globals())
`);
      self.postMessage({ ok: true, output: output.trim() });
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
