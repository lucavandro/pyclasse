import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "node_modules/pyodide");
const target = resolve(root, "public/vendor/pyodide");
const assets = [
  "pyodide.js",
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "pyodide-lock.json",
  "python_stdlib.zip",
];

// The directory is generated. Removing it prevents files from an older
// Pyodide distribution from surviving an upgrade and being served by mistake.
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await Promise.all(
  assets.map((asset) => cp(resolve(source, asset), resolve(target, asset))),
);
