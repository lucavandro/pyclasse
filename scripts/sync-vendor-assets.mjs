import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "node_modules/pyodide");
const target = resolve(root, "public/vendor/pyodide");
const assets = [
  "pyodide.js",
  "pyodide.asm.js",
  "pyodide.asm.wasm",
  "pyodide-lock.json",
  "python_stdlib.zip",
];

await mkdir(target, { recursive: true });
await Promise.all(
  assets.map((asset) => cp(resolve(source, asset), resolve(target, asset))),
);
