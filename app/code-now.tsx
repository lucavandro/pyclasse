"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { CodeSnippet, Workspace } from "../lib/types";
import { supabase } from "../lib/supabase";
import { useEditorSession } from "./use-editor-session";

const PythonEditor = lazy(() =>
  import("./python-editor").then((module) => ({
    default: module.PythonEditor,
  })),
);

export function CodeNow({
  data,
  notify,
}: {
  data: Workspace;
  notify: (message: string) => void;
}) {
  const [code, setCode] = useState("# Scrivi qui il tuo codice Python\n");
  const [output, setOutput] = useState("Pronto.");
  const [running, setRunning] = useState(false);
  const [shared, setShared] = useState(false);
  const [inputs, setInputs] = useState<string[]>([]);
  const [inputPrompt, setInputPrompt] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [snippets, setSnippets] = useState<CodeSnippet[]>(data.codeSnippets);
  const [snippetName, setSnippetName] = useState("");
  const [activeSnippetId, setActiveSnippetId] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  useEffect(() => () => workerRef.current?.terminate(), []);
  useEditorSession({
    enabled: true,
    userId: data.profile.id,
    context: "code_now",
    code,
  });

  async function updateCode(value: string) {
    setCode(value);
    if (!supabase) return;
    const { error } = await supabase.rpc("publish_code_now", {
      current_code: value,
    });
    if (error) notify(error.message);
    else setShared(true);
  }

  function run(providedInputs: string[] = []) {
    workerRef.current?.terminate();
    const worker = new Worker("/pyodide-worker.js", { type: "module" });
    workerRef.current = worker;
    setRunning(true);
    setInputPrompt(null);
    setInputs(providedInputs);
    setOutput("Esecuzione…");
    const timer = setTimeout(() => {
      worker.terminate();
      setRunning(false);
      setOutput("Esecuzione interrotta dopo 8 secondi.");
    }, 8_000);
    worker.onmessage = (event) => {
      clearTimeout(timer);
      setRunning(false);
      if (event.data.ok && event.data.inputRequired) {
        setOutput(event.data.output || "In attesa di un valore…");
        setInputPrompt(event.data.prompt || "Inserisci un valore");
      } else {
        setOutput(
          event.data.ok
            ? event.data.output || "(nessun output)"
            : `Errore:\n${event.data.error}`,
        );
      }
      worker.terminate();
    };
    worker.postMessage({
      code,
      mode: "run_interactive",
      inputs: providedInputs,
      tests: [],
    });
  }

  function provideInput(event: React.FormEvent) {
    event.preventDefault();
    const nextInputs = [...inputs, inputValue];
    setInputValue("");
    run(nextInputs);
  }

  async function copyTeacherCode() {
    if (!supabase) return;
    const { data: teacherCode, error } = await supabase.rpc(
      "get_active_teacher_code",
    );
    if (error) return notify(error.message);
    if (typeof teacherCode !== "string")
      return notify("Il docente non ha Code now aperto in questo momento");
    void updateCode(teacherCode);
    notify("Codice del docente copiato");
  }

  function download() {
    const url = URL.createObjectURL(
      new Blob([code], { type: "text/x-python" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "code-now.py";
    link.click();
    URL.revokeObjectURL(url);
  }
  async function saveSnippet() {
    if (!supabase || !snippetName.trim())
      return notify("Assegna un nome al codice");
    const now = new Date().toISOString();
    if (activeSnippetId) {
      const result = await supabase
        .from("code_snippets")
        .update({ name: snippetName.trim(), code, updated_at: now })
        .eq("id", activeSnippetId)
        .select()
        .single();
      if (result.error) return notify(result.error.message);
      setSnippets((items) => [
        result.data as CodeSnippet,
        ...items.filter((item) => item.id !== activeSnippetId),
      ]);
      notify("Codice aggiornato");
    } else {
      const result = await supabase
        .from("code_snippets")
        .insert({ owner_id: data.profile.id, name: snippetName.trim(), code })
        .select()
        .single();
      if (result.error) return notify(result.error.message);
      setSnippets((items) => [result.data as CodeSnippet, ...items]);
      setActiveSnippetId((result.data as CodeSnippet).id);
      notify("Codice salvato");
    }
  }
  function openSnippet(snippet: CodeSnippet) {
    setActiveSnippetId(snippet.id);
    setSnippetName(snippet.name);
    void updateCode(snippet.code);
  }
  async function deleteSnippet(snippet: CodeSnippet) {
    if (!supabase || !window.confirm(`Eliminare “${snippet.name}”?`)) return;
    const result = await supabase
      .from("code_snippets")
      .delete()
      .eq("id", snippet.id);
    if (result.error) return notify(result.error.message);
    setSnippets((items) => items.filter((item) => item.id !== snippet.id));
    if (activeSnippetId === snippet.id) {
      setActiveSnippetId(null);
      setSnippetName("");
    }
    notify("Codice eliminato");
  }

  return (
    <section className="code-now-page panel">
      <header className="code-now-header">
        <div>
          <p className="eyebrow">LABORATORIO LIBERO</p>
          <h2>Code now</h2>
          <p>Scrivi ed esegui liberamente codice Python nel browser.</p>
          {data.profile.role === "teacher" && shared && (
            <span className="code-sharing-state">
              Codice docente disponibile agli studenti
            </span>
          )}
        </div>
        <div className="code-now-actions">
          {data.profile.role === "student" && (
            <button
              className="secondary"
              onClick={() => void copyTeacherCode()}
            >
              Copia codice prof
            </button>
          )}
          <button className="secondary" onClick={download}>
            Scarica .py
          </button>
          <button
            className="primary"
            disabled={running}
            onClick={() => run([])}
          >
            Run
          </button>
        </div>
      </header>
      <div className="code-save-bar">
        <label>
          <span>Nome del codice</span>
          <input
            value={snippetName}
            maxLength={120}
            placeholder="es. Cicli e liste"
            onChange={(event) => setSnippetName(event.target.value)}
          />
        </label>
        <button className="secondary" onClick={() => void saveSnippet()}>
          {activeSnippetId ? "Aggiorna" : "Salva codice"}
        </button>
        {activeSnippetId && (
          <button
            className="quiet"
            onClick={() => {
              setActiveSnippetId(null);
              setSnippetName("");
            }}
          >
            Nuovo
          </button>
        )}
      </div>
      <Suspense
        fallback={<div className="editor-loading">Caricamento editor…</div>}
      >
        <PythonEditor
          value={code}
          onChange={updateCode}
          ariaLabel="Editor Code now"
          allowClipboard
        />
      </Suspense>
      <div className="console professional-console code-now-console">
        <header>
          <span>Output</span>
          <small>{running ? "Esecuzione in corso…" : "Pronto"}</small>
        </header>
        <pre>{output}</pre>
        {inputPrompt !== null && (
          <form className="code-now-input" onSubmit={provideInput}>
            <label htmlFor="code-now-input-value">
              {inputPrompt || "Inserisci un valore"}
            </label>
            <div>
              <input
                id="code-now-input-value"
                aria-label="Valore per input Python"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                autoFocus
              />
              <button className="primary">Invia</button>
            </div>
          </form>
        )}
      </div>
      <section
        className="saved-code-section"
        aria-labelledby="saved-code-title"
      >
        <div className="panel-head">
          <div>
            <p className="eyebrow">ARCHIVIO PERSONALE</p>
            <h3 id="saved-code-title">Codici salvati</h3>
          </div>
          <span className="repo-count">{snippets.length}</span>
        </div>
        <div className="saved-code-list">
          {snippets.map((snippet) => (
            <article
              key={snippet.id}
              className={
                activeSnippetId === snippet.id
                  ? "saved-code-row active"
                  : "saved-code-row"
              }
            >
              <button
                className="saved-code-open"
                onClick={() => openSnippet(snippet)}
              >
                <strong>{snippet.name}</strong>
                <small>
                  Aggiornato{" "}
                  {new Date(snippet.updated_at).toLocaleDateString("it-IT")}
                </small>
              </button>
              <button
                className="icon-action"
                title="Modifica"
                aria-label={`Modifica ${snippet.name}`}
                onClick={() => openSnippet(snippet)}
              >
                <span className="material-symbols-rounded">edit</span>
              </button>
              <button
                className="icon-action revise"
                title="Elimina"
                aria-label={`Elimina ${snippet.name}`}
                onClick={() => void deleteSnippet(snippet)}
              >
                <span className="material-symbols-rounded">delete</span>
              </button>
            </article>
          ))}
          {!snippets.length && (
            <p className="empty-state">Non hai ancora salvato alcun codice.</p>
          )}
        </div>
      </section>
    </section>
  );
}
