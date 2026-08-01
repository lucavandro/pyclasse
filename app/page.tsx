"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { EditorView } from "@codemirror/view";
import { getPedagogicalFeedback } from "../lib/ai-feedback";

type View = "home" | "classes" | "tasks" | "report" | "editor";

const students = [
  { name: "Giulia Bianchi", initials: "GB", done: 8, score: 96, status: "Completato", tone: "green" },
  { name: "Marco Rossi", initials: "MR", done: 7, score: 88, status: "In corso", tone: "blue" },
  { name: "Sara Esposito", initials: "SE", done: 6, score: 79, status: "In corso", tone: "amber" },
  { name: "Davide Romano", initials: "DR", done: 4, score: 58, status: "Da seguire", tone: "red" },
];

const assignments = [
  { title: "Liste e cicli", detail: "8 test automatici · 100 punti", due: "Oggi, 23:59", progress: 78, color: "coral" },
  { title: "Funzioni e parametri", detail: "6 test automatici · 100 punti", due: "4 agosto", progress: 56, color: "blue" },
  { title: "Dizionari", detail: "5 test automatici · 80 punti", due: "9 agosto", progress: 24, color: "violet" },
];

const starter = `def somma_pari(numeri):\n    """Restituisce la somma dei numeri pari."""\n    totale = 0\n    for numero in numeri:\n        if numero % 2 == 0:\n            totale += numero\n    return totale\n\nprint(somma_pari([1, 2, 3, 4, 5, 6]))`;

const blockClipboard = EditorView.domEventHandlers({
  copy(event) { event.preventDefault(); return true; },
  cut(event) { event.preventDefault(); return true; },
  paste(event) { event.preventDefault(); return true; },
});

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [code, setCode] = useState(starter);
  const [output, setOutput] = useState("Pronto per l’esecuzione.");
  const [running, setRunning] = useState(false);
  const [inputRequested, setInputRequested] = useState(false);
  const [inputPrompt, setInputPrompt] = useState("");
  const [programInput, setProgramInput] = useState("");
  const [collectedInputs, setCollectedInputs] = useState<string[]>([]);
  const [testResult, setTestResult] = useState({ passed: 0, total: 5, testedCode: "" });
  const [aiFeedback, setAiFeedback] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const programWorker = useRef<Worker | null>(null);
  const [toast, setToast] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const title = useMemo(() => ({ home: "Buongiorno, Luca", classes: "Le tue classi", tasks: "Esercizi", report: "Report della classe", editor: "Somma dei numeri pari" }[view]), [view]);

  useEffect(() => {
    setSidebarCollapsed(localStorage.getItem("pyclasse-sidebar") === "collapsed");
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed(current => {
      const next = !current;
      localStorage.setItem("pyclasse-sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  }

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function updateCode(value: string) {
    setCode(value);
    programWorker.current?.terminate();
    programWorker.current = null;
    setInputRequested(false);
    setAiFeedback("");
    setTestResult(current => ({ ...current, passed: 0, testedCode: "" }));
  }

  async function requestFeedback(kind: "runtime" | "tests" | "timeout", details: string) {
    setFeedbackLoading(true);
    setAiFeedback("");
    const feedback = await getPedagogicalFeedback(kind, details, code);
    setAiFeedback(feedback);
    setFeedbackLoading(false);
  }

  function executeProgram(inputs: string[], restartWorker = false) {
    if (restartWorker) {
      programWorker.current?.terminate();
      programWorker.current = new Worker("/pyodide-worker.js");
    }
    const worker = programWorker.current || new Worker("/pyodide-worker.js");
    programWorker.current = worker;
    setRunning(true);
    setInputRequested(false);
    setOutput("Esecuzione del programma…");
    const timer = window.setTimeout(() => {
      worker.terminate();
      programWorker.current = null;
      setRunning(false);
      setInputRequested(false);
      setOutput("Esecuzione interrotta: limite di 8 secondi superato.");
      void requestFeedback("timeout", "Il programma ha superato il limite di 8 secondi ed è stato terminato.");
    }, 8000);
    worker.onmessage = (event) => {
      window.clearTimeout(timer);
      setRunning(false);
      if (!event.data.ok) {
        setOutput(`Errore:\n${event.data.error}`);
        void requestFeedback("runtime", event.data.error);
        return;
      }
      setOutput(event.data.output || "(nessun output)");
      if (event.data.inputRequired) {
        setInputPrompt(event.data.prompt || "Input richiesto");
        setInputRequested(true);
      }
    };
    worker.postMessage({ code, inputs, mode: "run_interactive" });
  }

  function startProgram() {
    setCollectedInputs([]);
    setProgramInput("");
    setAiFeedback("");
    executeProgram([], true);
  }

  function submitProgramInput() {
    if (!inputRequested || running) return;
    const nextInputs = [...collectedInputs, programInput];
    setCollectedInputs(nextInputs);
    setProgramInput("");
    executeProgram(nextInputs);
  }

  async function runTests() {
    setRunning(true);
    setOutput("Esecuzione dei test automatici…");
    try {
      const worker = new Worker("/pyodide-worker.js");
      const timer = window.setTimeout(() => { worker.terminate(); setOutput("Test interrotti: possibile ciclo infinito o elaborazione eccessiva."); setRunning(false); void requestFeedback("timeout", "I test hanno superato il limite di 8 secondi e sono stati terminati."); }, 8000);
      worker.onmessage = (event) => {
        window.clearTimeout(timer);
        if (event.data.ok) {
          const passed = event.data.tests?.passed ?? 0;
          const total = event.data.tests?.total ?? 5;
          setTestResult({ passed, total, testedCode: code });
          setOutput(`Test completati\n\n${passed} test su ${total} superati${passed === total ? "\n\n✓ Soluzione pronta per la consegna" : "\n\nCorreggi il codice e riprova."}`);
          if (passed < total) void requestFeedback("tests", `${passed} test superati su ${total}.`);
          else setAiFeedback("");
        } else {
          setOutput(`Errore:\n${event.data.error}`);
          void requestFeedback("runtime", event.data.error);
        }
        setRunning(false);
        worker.terminate();
      };
      worker.postMessage({ code, mode: "test" });
    } catch {
      setOutput("L’ambiente Python non è disponibile in questa anteprima. Il codice è stato salvato.");
      setRunning(false);
    }
  }

  return (
    <main className={sidebarCollapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
      <aside className="sidebar">
        <div className="sidebar-head">
          <button className="hamburger" onClick={toggleSidebar} aria-expanded={!sidebarCollapsed} aria-controls="primary-navigation" aria-label={sidebarCollapsed ? "Espandi menu" : "Riduci menu"}><span /><span /><span /></button>
          <button className="brand" onClick={() => setView("home")} aria-label="Vai alla dashboard"><span className="brand-mark">&gt;_</span><span>PyClasse</span></button>
        </div>
        <nav id="primary-navigation" aria-label="Navigazione principale">
          {([
            ["home", "⌂", "Panoramica"], ["classes", "▦", "Classi"], ["tasks", "◇", "Esercizi"], ["report", "▥", "Report"],
          ] as [View, string, string][]).map(([key, icon, label]) => (
            <button key={key} className={view === key ? "nav-item active" : "nav-item"} onClick={() => setView(key)} title={sidebarCollapsed ? label : undefined}><span>{icon}</span><b>{label}</b></button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile"><span className="avatar dark">LB</span><div><strong>Luca Bianchi</strong><small>Docente</small></div><button aria-label="Impostazioni">•••</button></div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><p className="eyebrow">Liceo Galilei · Informatica</p><h1>{title}</h1></div>
          <div className="top-actions"><button className="icon-button" aria-label="Notifiche">♢<span className="notification" /></button><button className="primary" onClick={() => notify("Nuovo esercizio: modello pronto")}>＋ Nuovo esercizio</button></div>
        </header>

        {view === "home" && <Dashboard setView={setView} />}
        {view === "classes" && <Classes joinCode={joinCode} setJoinCode={setJoinCode} notify={notify} />}
        {view === "tasks" && <Tasks openEditor={() => setView("editor")} />}
        {view === "report" && <Report />}
        {view === "editor" && <Editor code={code} setCode={updateCode} output={output} running={running} startProgram={startProgram} inputRequested={inputRequested} inputPrompt={inputPrompt} programInput={programInput} setProgramInput={setProgramInput} submitProgramInput={submitProgramInput} runTests={runTests} testResult={testResult} aiFeedback={aiFeedback} feedbackLoading={feedbackLoading} notify={notify} />}
      </section>
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </main>
  );
}

function Dashboard({ setView }: { setView: (v: View) => void }) {
  return <div className="dashboard">
    <section className="hero-card">
      <div><span className="pill">ANNO SCOLASTICO 2026/27</span><h2>La classe sta facendo progressi.</h2><p>Il 72% degli esercizi assegnati questa settimana è stato completato.</p><button className="text-link" onClick={() => setView("report")}>Vedi il report completo →</button></div>
      <div className="hero-stat"><div className="ring"><strong>72%</strong><span>completati</span></div></div>
    </section>
    <div className="stats-grid">
      <Stat label="Studenti attivi" value="24" delta="+2 questo mese" icon="♙" />
      <Stat label="Esercizi pubblicati" value="12" delta="3 in scadenza" icon="◇" />
      <Stat label="Media della classe" value="84%" delta="+6% dall’ultimo" icon="↗" />
    </div>
    <div className="split-grid">
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">PROSSIME SCADENZE</p><h3>Esercizi assegnati</h3></div><button className="quiet" onClick={() => setView("tasks")}>Vedi tutti</button></div>{assignments.map(a => <Assignment key={a.title} {...a} onClick={() => setView("editor")} />)}</section>
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">LA TUA CLASSE</p><h3>Ultimi progressi</h3></div><button className="quiet" onClick={() => setView("report")}>Report</button></div>{students.slice(0, 3).map(s => <Student key={s.name} {...s} />)}</section>
    </div>
  </div>;
}

function Stat({ label, value, delta, icon }: { label: string; value: string; delta: string; icon: string }) { return <article className="stat-card"><span className="stat-icon">{icon}</span><div><p>{label}</p><strong>{value}</strong><small>{delta}</small></div></article>; }
function Assignment({ title, detail, due, progress, color, onClick }: { title: string; detail: string; due: string; progress: number; color: string; onClick: () => void }) { return <button className="assignment" onClick={onClick}><span className={`assignment-icon ${color}`}>λ</span><span className="assignment-main"><strong>{title}</strong><small>{detail}</small><span className="progress"><i style={{ width: `${progress}%` }} /></span></span><span className="due"><small>SCADENZA</small><strong>{due}</strong></span><span>›</span></button>; }
function Student({ name, initials, done, score, status, tone }: typeof students[number]) { return <div className="student"><span className={`avatar ${tone}`}>{initials}</span><span className="student-name"><strong>{name}</strong><small>{done}/8 esercizi</small></span><span className={`status ${tone}`}>{status}</span><strong className="score">{score}%</strong></div>; }

function Classes({ joinCode, setJoinCode, notify }: { joinCode: string; setJoinCode: (v: string) => void; notify: (v: string) => void }) { return <div className="page-grid"><section className="class-card featured"><p className="eyebrow">CLASSE ATTIVA</p><h2>4ESA · Informatica</h2><p>24 studenti · 12 esercizi</p><div className="class-code"><span>CODICE CLASSE</span><strong>4ESA-X7P9</strong><button onClick={() => { navigator.clipboard?.writeText("4ESA-X7P9"); notify("Codice copiato"); }}>Copia</button></div></section><section className="panel join-panel"><p className="eyebrow">ISCRIZIONE</p><h3>Unisciti con un codice</h3><p>Inserisci il codice condiviso dal docente.</p><div className="join-form"><input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="4ESA-X7P9" /><button className="primary" onClick={() => notify("Codice verificato")}>Verifica</button></div></section></div>; }
function Tasks({ openEditor }: { openEditor: () => void }) { return <section className="panel full-panel"><div className="panel-head"><div><p className="eyebrow">12 ESERCIZI</p><h3>Programma del corso</h3></div><div className="filters"><button className="selected">Tutti</button><button>Da completare</button><button>Completati</button></div></div>{assignments.concat([{ title: "Input e output", detail: "4 test automatici · 60 punti", due: "Completato", progress: 100, color: "green" }]).map(a => <Assignment key={a.title} {...a} onClick={openEditor} />)}</section>; }
function Report() { return <section className="panel full-panel"><div className="panel-head"><div><p className="eyebrow">4ESA · INFORMATICA</p><h3>Completamento esercizi</h3></div><button className="secondary" onClick={() => alert("Il report CSV sarà generato dal backend Supabase.")}>↓ Esporta CSV</button></div><div className="report-summary"><Stat label="Completamento" value="72%" delta="138 consegne" icon="✓" /><Stat label="Media punteggio" value="84%" delta="su 24 studenti" icon="↗" /><Stat label="Da recuperare" value="3" delta="studenti sotto il 60%" icon="!" /></div><div className="table"><div className="table-row table-head"><span>Studente</span><span>Completati</span><span>Ultimo invio</span><span>Stato</span><span>Punteggio</span></div>{students.map(s => <div className="table-row" key={s.name}><span className="student-inline"><span className={`avatar ${s.tone}`}>{s.initials}</span><strong>{s.name}</strong></span><span>{s.done}/8</span><span>31 lug, 15:{20 + s.done}</span><span><i className={`status ${s.tone}`}>{s.status}</i></span><strong>{s.score}%</strong></div>)}</div></section>; }

function Editor({ code, setCode, output, running, startProgram, inputRequested, inputPrompt, programInput, setProgramInput, submitProgramInput, runTests, testResult, aiFeedback, feedbackLoading, notify }: { code: string; setCode: (v: string) => void; output: string; running: boolean; startProgram: () => void; inputRequested: boolean; inputPrompt: string; programInput: string; setProgramInput: (v: string) => void; submitProgramInput: () => void; runTests: () => void; testResult: { passed: number; total: number; testedCode: string }; aiFeedback: string; feedbackLoading: boolean; notify: (v: string) => void }) {
  const canSubmit = testResult.passed === testResult.total && testResult.testedCode === code;
  return <div className="editor-layout"><section className="brief"><button className="back" onClick={() => history.back()}>← Esercizi</button><span className="pill coral-pill">IN SCADENZA OGGI</span><h2>Somma dei numeri pari</h2><p>Scrivi una funzione <code>somma_pari(numeri)</code> che restituisca la somma di tutti i numeri pari presenti nella lista.</p><h4>Esempio</h4><pre>somma_pari([1, 2, 3, 4]) → 6</pre><h4>Vincoli</h4><ul><li>La lista contiene da 1 a 100 numeri.</li><li>Ogni numero è compreso tra −1000 e 1000.</li></ul><div className="test-count"><strong>5</strong><span>test automatici<br />100 punti totali</span></div></section><section className="workspace"><div className="editor-toolbar"><span>main.py</span><span>Copia e incolla disabilitati · Python 3.12</span></div><CodeMirror value={code} height="350px" extensions={[python(), blockClipboard]} onChange={setCode} theme="dark" basicSetup={{ lineNumbers: true, foldGutter: false }} /><div className="repl-shell"><div className="console-head"><strong>Programma Python</strong><button onClick={() => setCode(starter)}>Ripristina codice</button></div><pre aria-live="polite">{output}</pre>{inputRequested && <div className="repl-prompt"><label htmlFor="program-input">{inputPrompt || "Input"}</label><input id="program-input" autoFocus value={programInput} onChange={e => setProgramInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submitProgramInput(); } }} placeholder="Inserisci un valore…" disabled={running} /><button onClick={submitProgramInput} disabled={running}>Invia</button></div>}</div>{(feedbackLoading || aiFeedback) && <aside className="ai-feedback" aria-live="polite"><div><strong>✦ Feedback IA</strong><small>Analisi tramite Puter.js · nessuna API key richiesta</small></div><p>{feedbackLoading ? "Analisi pedagogica in corso…" : aiFeedback}</p></aside>}<div className="runbar"><span className={canSubmit ? "test-ready" : "test-waiting"}>{canSubmit ? `✓ ${testResult.total}/${testResult.total} test superati` : "Supera tutti i test per consegnare"}</span><button className="secondary" onClick={startProgram} disabled={running}>{running ? "In esecuzione…" : "▷ Esegui"}</button><button className="secondary test-button" onClick={runTests} disabled={running}>Test</button><button className="primary" disabled={!canSubmit || running} onClick={() => notify("Soluzione inviata al docente: 100/100")}>Consegna soluzione</button></div></section></div>;
}
