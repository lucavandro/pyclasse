"use client";

import { useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";

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

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [role, setRole] = useState<"teacher" | "student">("teacher");
  const [code, setCode] = useState(starter);
  const [output, setOutput] = useState("Pronto per l’esecuzione.");
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const title = useMemo(() => ({ home: "Buongiorno, Luca", classes: "Le tue classi", tasks: "Esercizi", report: "Report della classe", editor: "Somma dei numeri pari" }[view]), [view]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  async function runCode() {
    setRunning(true);
    setOutput("Caricamento dell’ambiente Python…");
    try {
      const worker = new Worker("/pyodide-worker.js");
      const timer = window.setTimeout(() => { worker.terminate(); setOutput("Esecuzione interrotta: limite di 8 secondi superato."); setRunning(false); }, 8000);
      worker.onmessage = (event) => {
        window.clearTimeout(timer);
        setOutput(event.data.ok ? `${event.data.output || "(nessun output)"}\n\n✓ 5 test su 5 superati` : `Errore:\n${event.data.error}`);
        setRunning(false);
        worker.terminate();
      };
      worker.postMessage({ code });
    } catch {
      setOutput("L’ambiente Python non è disponibile in questa anteprima. Il codice è stato salvato.");
      setRunning(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("home")} aria-label="Vai alla dashboard">
          <span className="brand-mark">&gt;_</span><span>PyClasse</span>
        </button>
        <nav aria-label="Navigazione principale">
          {([
            ["home", "⌂", "Panoramica"], ["classes", "▦", "Classi"], ["tasks", "◇", "Esercizi"], ["report", "▥", "Report"],
          ] as [View, string, string][]).map(([key, icon, label]) => (
            <button key={key} className={view === key ? "nav-item active" : "nav-item"} onClick={() => setView(key)}><span>{icon}</span>{label}</button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="role-toggle" aria-label="Modalità demo">
            <button className={role === "teacher" ? "selected" : ""} onClick={() => setRole("teacher")}>Docente</button>
            <button className={role === "student" ? "selected" : ""} onClick={() => setRole("student")}>Studente</button>
          </div>
          <div className="profile"><span className="avatar dark">LB</span><div><strong>Luca Bianchi</strong><small>{role === "teacher" ? "Docente" : "Studente"}</small></div><button aria-label="Impostazioni">•••</button></div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><p className="eyebrow">Liceo Galilei · Informatica</p><h1>{title}</h1></div>
          <div className="top-actions"><button className="icon-button" aria-label="Notifiche">♢<span className="notification" /></button><button className="primary" onClick={() => notify(role === "teacher" ? "Nuovo esercizio: modello pronto" : "Inserisci il codice classe qui sotto")}>＋ {role === "teacher" ? "Nuovo esercizio" : "Unisciti a una classe"}</button></div>
        </header>

        {view === "home" && <Dashboard role={role} setView={setView} joinCode={joinCode} setJoinCode={setJoinCode} notify={notify} />}
        {view === "classes" && <Classes joinCode={joinCode} setJoinCode={setJoinCode} notify={notify} />}
        {view === "tasks" && <Tasks openEditor={() => setView("editor")} />}
        {view === "report" && <Report />}
        {view === "editor" && <Editor code={code} setCode={setCode} output={output} running={running} runCode={runCode} notify={notify} />}
      </section>
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </main>
  );
}

function Dashboard({ role, setView, joinCode, setJoinCode, notify }: { role: string; setView: (v: View) => void; joinCode: string; setJoinCode: (v: string) => void; notify: (v: string) => void }) {
  return <div className="dashboard">
    <section className="hero-card">
      <div><span className="pill">ANNO SCOLASTICO 2026/27</span><h2>{role === "teacher" ? "La classe sta facendo progressi." : "Continua da dove avevi lasciato."}</h2><p>{role === "teacher" ? "Il 72% degli esercizi assegnati questa settimana è stato completato." : "Hai 2 esercizi da completare entro questa settimana."}</p><button className="text-link" onClick={() => setView(role === "teacher" ? "report" : "tasks")}>{role === "teacher" ? "Vedi il report completo" : "Vai agli esercizi"} →</button></div>
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
    {role === "student" && <section className="join-strip"><div><p className="eyebrow">NUOVA CLASSE</p><h3>Hai ricevuto un codice?</h3></div><div className="join-form"><input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="es. 4ESA-X7P9" maxLength={10} /><button className="primary" onClick={() => notify(joinCode.length > 5 ? "Richiesta di iscrizione inviata" : "Inserisci un codice valido")}>Unisciti</button></div></section>}
  </div>;
}

function Stat({ label, value, delta, icon }: { label: string; value: string; delta: string; icon: string }) { return <article className="stat-card"><span className="stat-icon">{icon}</span><div><p>{label}</p><strong>{value}</strong><small>{delta}</small></div></article>; }
function Assignment({ title, detail, due, progress, color, onClick }: { title: string; detail: string; due: string; progress: number; color: string; onClick: () => void }) { return <button className="assignment" onClick={onClick}><span className={`assignment-icon ${color}`}>λ</span><span className="assignment-main"><strong>{title}</strong><small>{detail}</small><span className="progress"><i style={{ width: `${progress}%` }} /></span></span><span className="due"><small>SCADENZA</small><strong>{due}</strong></span><span>›</span></button>; }
function Student({ name, initials, done, score, status, tone }: typeof students[number]) { return <div className="student"><span className={`avatar ${tone}`}>{initials}</span><span className="student-name"><strong>{name}</strong><small>{done}/8 esercizi</small></span><span className={`status ${tone}`}>{status}</span><strong className="score">{score}%</strong></div>; }

function Classes({ joinCode, setJoinCode, notify }: { joinCode: string; setJoinCode: (v: string) => void; notify: (v: string) => void }) { return <div className="page-grid"><section className="class-card featured"><p className="eyebrow">CLASSE ATTIVA</p><h2>4ESA · Informatica</h2><p>24 studenti · 12 esercizi</p><div className="class-code"><span>CODICE CLASSE</span><strong>4ESA-X7P9</strong><button onClick={() => { navigator.clipboard?.writeText("4ESA-X7P9"); notify("Codice copiato"); }}>Copia</button></div></section><section className="panel join-panel"><p className="eyebrow">ISCRIZIONE</p><h3>Unisciti con un codice</h3><p>Inserisci il codice condiviso dal docente.</p><div className="join-form"><input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="4ESA-X7P9" /><button className="primary" onClick={() => notify("Codice verificato")}>Verifica</button></div></section></div>; }
function Tasks({ openEditor }: { openEditor: () => void }) { return <section className="panel full-panel"><div className="panel-head"><div><p className="eyebrow">12 ESERCIZI</p><h3>Programma del corso</h3></div><div className="filters"><button className="selected">Tutti</button><button>Da completare</button><button>Completati</button></div></div>{assignments.concat([{ title: "Input e output", detail: "4 test automatici · 60 punti", due: "Completato", progress: 100, color: "green" }]).map(a => <Assignment key={a.title} {...a} onClick={openEditor} />)}</section>; }
function Report() { return <section className="panel full-panel"><div className="panel-head"><div><p className="eyebrow">4ESA · INFORMATICA</p><h3>Completamento esercizi</h3></div><button className="secondary" onClick={() => alert("Il report CSV sarà generato dal backend Supabase.")}>↓ Esporta CSV</button></div><div className="report-summary"><Stat label="Completamento" value="72%" delta="138 consegne" icon="✓" /><Stat label="Media punteggio" value="84%" delta="su 24 studenti" icon="↗" /><Stat label="Da recuperare" value="3" delta="studenti sotto il 60%" icon="!" /></div><div className="table"><div className="table-row table-head"><span>Studente</span><span>Completati</span><span>Ultimo invio</span><span>Stato</span><span>Punteggio</span></div>{students.map(s => <div className="table-row" key={s.name}><span className="student-inline"><span className={`avatar ${s.tone}`}>{s.initials}</span><strong>{s.name}</strong></span><span>{s.done}/8</span><span>31 lug, 15:{20 + s.done}</span><span><i className={`status ${s.tone}`}>{s.status}</i></span><strong>{s.score}%</strong></div>)}</div></section>; }

function Editor({ code, setCode, output, running, runCode, notify }: { code: string; setCode: (v: string) => void; output: string; running: boolean; runCode: () => void; notify: (v: string) => void }) { return <div className="editor-layout"><section className="brief"><button className="back" onClick={() => history.back()}>← Esercizi</button><span className="pill coral-pill">IN SCADENZA OGGI</span><h2>Somma dei numeri pari</h2><p>Scrivi una funzione <code>somma_pari(numeri)</code> che restituisca la somma di tutti i numeri pari presenti nella lista.</p><h4>Esempio</h4><pre>somma_pari([1, 2, 3, 4]) → 6</pre><h4>Vincoli</h4><ul><li>La lista contiene da 1 a 100 numeri.</li><li>Ogni numero è compreso tra −1000 e 1000.</li></ul><div className="test-count"><strong>5</strong><span>test automatici<br />100 punti totali</span></div></section><section className="workspace"><div className="editor-toolbar"><span>main.py</span><span>Python 3.12 · Pyodide</span></div><CodeMirror value={code} height="390px" extensions={[python()]} onChange={setCode} theme="dark" basicSetup={{ lineNumbers: true, foldGutter: false }} /><div className="console"><div className="console-head"><strong>Console</strong><button onClick={() => setCode(starter)}>Ripristina</button></div><pre>{output}</pre></div><div className="runbar"><button className="secondary" onClick={runCode} disabled={running}>{running ? "Avvio…" : "▷ Esegui"}</button><button className="primary" onClick={() => notify("Soluzione consegnata: 100/100")}>Consegna soluzione</button></div></section></div>; }
