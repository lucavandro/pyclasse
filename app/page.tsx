"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { EditorView } from "@codemirror/view";
import { generateExerciseWithAi, getPedagogicalFeedback, verifySolutionWithAi, type GeneratedExercise } from "../lib/ai-feedback";
import { signOut } from "../lib/supabase";

type View = "home" | "classes" | "class-detail" | "class-form" | "tasks" | "report" | "settings" | "editor" | "exercise-form";
type VerificationMode = "tests" | "ai";
type Exercise = GeneratedExercise & { id: number; verificationMode: VerificationMode; assignments: { className: string; deadline: string }[]; updatedAt: string };
type Participant = { id: number; name: string; email: string; initials: string; lastAccess: string; completed: number; total: number; average: number; tone: string };
type Classroom = { id: number; name: string; code: string; subject: string; exercises: number; lastActivity: string; participants: Participant[] };

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-rounded ${className}`} aria-hidden="true">{name}</span>;
}

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

const initialExercises: Exercise[] = [
  { id: 1, title: "Somma dei numeri pari", description: "Scrivi una funzione somma_pari(numeri) che restituisca la somma dei numeri pari.", starterCode: "def somma_pari(numeri):\n    pass", constraints: "Da 1 a 100 numeri.", maxPoints: 100, verificationMode: "tests", tests: [{ input: "somma_pari([1,2,3,4])", expected: "6" }, { input: "somma_pari([-2,3,8])", expected: "6" }], assignments: [{ className: "4ESA · Informatica", deadline: "2026-08-02T23:59" }, { className: "3BSA · Informatica", deadline: "2026-08-09T23:59" }], updatedAt: "Oggi, 09:42" },
  { id: 2, title: "Funzioni e parametri", description: "Progetta una funzione che calcoli il prezzo finale applicando uno sconto.", starterCode: "def prezzo_finale(prezzo, sconto):\n    pass", constraints: "Prezzo non negativo; sconto tra 0 e 100.", maxPoints: 100, verificationMode: "tests", tests: [{ input: "prezzo_finale(100, 20)", expected: "80" }], assignments: [{ className: "4ESA · Informatica", deadline: "2026-08-04T23:59" }], updatedAt: "Ieri, 17:10" },
  { id: 3, title: "Analisi di un dizionario", description: "Analizza un dizionario di voti e restituisci la media.", starterCode: "def media_voti(voti):\n    pass", constraints: "Il dizionario può essere vuoto.", maxPoints: 80, verificationMode: "ai", tests: [], assignments: [], updatedAt: "30 lug, 12:05" },
];

const initialClasses: Classroom[] = [
  { id: 1, name: "4ESA", code: "4ESA-X7P9", subject: "Informatica", exercises: 12, lastActivity: "Oggi, 10:18", participants: [
    { id: 1, name: "Giulia Bianchi", email: "giulia.bianchi@scuola.it", initials: "GB", lastAccess: "Oggi, 09:42", completed: 8, total: 8, average: 96, tone: "green" },
    { id: 2, name: "Marco Rossi", email: "marco.rossi@scuola.it", initials: "MR", lastAccess: "Ieri, 18:15", completed: 7, total: 8, average: 88, tone: "blue" },
    { id: 3, name: "Sara Esposito", email: "sara.esposito@scuola.it", initials: "SE", lastAccess: "31 lug, 16:20", completed: 6, total: 8, average: 79, tone: "amber" },
    { id: 4, name: "Davide Romano", email: "davide.romano@scuola.it", initials: "DR", lastAccess: "28 lug, 11:08", completed: 4, total: 8, average: 58, tone: "red" },
  ] },
  { id: 2, name: "3BSA", code: "3BSA-K4M8", subject: "Informatica", exercises: 7, lastActivity: "Ieri, 15:36", participants: [
    { id: 5, name: "Elena Costa", email: "elena.costa@scuola.it", initials: "EC", lastAccess: "Oggi, 08:55", completed: 5, total: 7, average: 83, tone: "blue" },
    { id: 6, name: "Andrea Greco", email: "andrea.greco@scuola.it", initials: "AG", lastAccess: "30 lug, 14:12", completed: 3, total: 7, average: 71, tone: "amber" },
  ] },
];

const starter = `def somma_pari(numeri):\n    """Restituisce la somma dei numeri pari."""\n    totale = 0\n    for numero in numeri:\n        if numero % 2 == 0:\n            totale += numero\n    return totale\n\nprint(somma_pari([1, 2, 3, 4, 5, 6]))`;

const blockClipboard = EditorView.domEventHandlers({
  copy(event) { event.preventDefault(); return true; },
  cut(event) { event.preventDefault(); return true; },
  paste(event) { event.preventDefault(); return true; },
});

export default function Home() {
  const [view, setViewState] = useState<View>("home");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [code, setCode] = useState(starter);
  const [draftStatus, setDraftStatus] = useState("Bozza caricata");
  const [schoolName, setSchoolName] = useState("Liceo Galilei");
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises);
  const [classrooms, setClassrooms] = useState<Classroom[]>(initialClasses);
  const [selectedClass, setSelectedClass] = useState<Classroom | null>(null);
  const [verificationMode, setVerificationMode] = useState<VerificationMode>("tests");
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
  const [signedOut, setSignedOut] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const title = useMemo(() => ({ home: "Buongiorno, Luca", classes: "Le tue classi", "class-detail": selectedClass ? `${selectedClass.name} · ${selectedClass.subject}` : "Dettaglio classe", "class-form": selectedClass ? "Modifica classe" : "Nuova classe", tasks: "Repository esercizi", report: "Report della classe", settings: "Impostazioni", editor: "Somma dei numeri pari", "exercise-form": editingExercise ? "Modifica esercizio" : "Nuovo esercizio" }[view]), [view, editingExercise, selectedClass]);

  function routeFor(target: View) {
    return ({ home: "/", classes: "/classes", "class-detail": "/classes/1", "class-form": "/classes/new", tasks: "/exercises", report: "/reports", settings: "/settings", editor: "/exercises/1", "exercise-form": "/exercises/new" } as Record<View, string>)[target];
  }

  function setView(target: View) {
    window.history.pushState({}, "", routeFor(target));
    setViewState(target);
  }

  function openExerciseForm(exercise: Exercise | null) {
    setEditingExercise(exercise);
    setVerificationMode(exercise?.verificationMode || "tests");
    window.history.pushState({}, "", exercise ? `/exercises/${exercise.id}/edit` : "/exercises/new");
    setViewState("exercise-form");
  }

  function openClass(classroom: Classroom, edit = false) {
    setSelectedClass(classroom);
    window.history.pushState({}, "", `/classes/${classroom.id}${edit ? "/edit" : ""}`);
    setViewState(edit ? "class-form" : "class-detail");
  }

  function newClass() {
    setSelectedClass(null);
    window.history.pushState({}, "", "/classes/new");
    setViewState("class-form");
  }

  useEffect(() => {
    setSidebarCollapsed(localStorage.getItem("pyclasse-sidebar") === "collapsed");
    setSchoolName(localStorage.getItem("pyclasse-school-name") || "Liceo Galilei");
    const savedDraft = localStorage.getItem("pyclasse-draft-somma-pari");
    if (savedDraft) {
      try { setCode(JSON.parse(savedDraft).code || starter); } catch { /* bozza non valida */ }
    }
    const syncRoute = () => {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      const editMatch = path.match(/^\/exercises\/(\d+)\/edit$/);
      const classEditMatch = path.match(/^\/classes\/(\d+)\/edit$/);
      const classMatch = path.match(/^\/classes\/(\d+)$/);
      if (classEditMatch || classMatch) {
        const selected = initialClasses.find(item => item.id === Number((classEditMatch || classMatch)![1])) || null;
        setSelectedClass(selected);
        setViewState(classEditMatch ? "class-form" : "class-detail");
      } else if (path === "/classes/new") { setSelectedClass(null); setViewState("class-form"); }
      else if (editMatch) {
        const selected = initialExercises.find(item => item.id === Number(editMatch[1])) || null;
        setEditingExercise(selected);
        setVerificationMode(selected?.verificationMode || "tests");
        setViewState("exercise-form");
      } else if (path === "/exercises/new") setViewState("exercise-form");
      else if (path === "/classes") setViewState("classes");
      else if (path === "/exercises") setViewState("tasks");
      else if (path === "/reports") setViewState("report");
      else if (path === "/settings") setViewState("settings");
      else if (/^\/exercises\/\d+$/.test(path)) setViewState("editor");
      else setViewState("home");
    };
    syncRoute();
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  useEffect(() => {
    setDraftStatus("Salvataggio…");
    const timer = window.setTimeout(() => {
      const savedAt = new Date();
      localStorage.setItem("pyclasse-draft-somma-pari", JSON.stringify({ code, savedAt: savedAt.toISOString() }));
      setDraftStatus(`Salvato alle ${savedAt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [code]);

  function saveSchoolName(value: string) {
    const clean = value.trim() || "Liceo Galilei";
    setSchoolName(clean);
    localStorage.setItem("pyclasse-school-name", clean);
    notify("Nome della scuola aggiornato");
  }

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

  async function handleLogout() {
    await signOut();
    setSignedOut(true);
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
    if (verificationMode === "ai") {
      setRunning(true);
      setFeedbackLoading(true);
      setOutput("Verifica della soluzione con IA…");
      const result = await verifySolutionWithAi("Scrivi una funzione somma_pari(numeri) che restituisca la somma di tutti i numeri pari presenti nella lista.", code);
      setTestResult({ passed: result.passed ? 1 : 0, total: 1, testedCode: code });
      setAiFeedback(result.feedback);
      setFeedbackLoading(false);
      setOutput(result.passed ? "Verifica IA completata\n\n✓ La soluzione soddisfa la consegna." : "Verifica IA completata\n\nLa soluzione non soddisfa ancora interamente la consegna.");
      setRunning(false);
      return;
    }
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

  if (signedOut) return <main className="logout-screen"><section><span className="brand-mark">&gt;_</span><p className="eyebrow">PYCLASSE</p><h1>Sessione terminata</h1><p>Hai effettuato il logout in sicurezza.</p><button className="primary" onClick={() => setSignedOut(false)}><Icon name="login" /> Torna all’accesso</button></section></main>;

  return (
    <main className={sidebarCollapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
      <aside className="sidebar">
        <div className="sidebar-head">
          <button className="hamburger" onClick={toggleSidebar} aria-expanded={!sidebarCollapsed} aria-controls="primary-navigation" aria-label={sidebarCollapsed ? "Espandi menu" : "Riduci menu"}><Icon name="menu" /></button>
          <button className="brand" onClick={() => setView("home")} aria-label="Vai alla dashboard"><span className="brand-mark">&gt;_</span><span>PyClasse</span></button>
        </div>
        <nav id="primary-navigation" aria-label="Navigazione principale">
          {([
            ["home", "dashboard", "Panoramica"], ["classes", "groups", "Classi"], ["tasks", "code_blocks", "Esercizi"], ["report", "analytics", "Report"], ["settings", "settings", "Impostazioni"],
          ] as [View, string, string][]).map(([key, icon, label]) => (
            <button key={key} className={view === key || (key === "tasks" && (view === "exercise-form" || view === "editor")) || (key === "classes" && (view === "class-detail" || view === "class-form")) ? "nav-item active" : "nav-item"} onClick={() => setView(key)} title={sidebarCollapsed ? label : undefined}><Icon name={icon} /><b>{label}</b></button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile"><span className="avatar dark">LB</span><div><strong>Luca Bianchi</strong><small>Docente</small></div><button className="logout-button" onClick={handleLogout} aria-label="Esci dall’account" title="Esci"><Icon name="logout" /><span>Esci</span></button></div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><p className="eyebrow">{schoolName} · Informatica</p><h1>{title}</h1></div>
          <div className="top-actions"><button className="icon-button" aria-label="Notifiche"><Icon name="notifications" /><span className="notification" /></button>{view === "classes" ? <button className="primary" onClick={newClass}><Icon name="group_add" /> Nuova classe</button> : !["exercise-form", "class-form", "class-detail"].includes(view) && <button className="primary" onClick={() => openExerciseForm(null)}><Icon name="add" /> Nuovo esercizio</button>}</div>
        </header>

        {view === "home" && <Dashboard setView={setView} />}
        {view === "classes" && <Classes classrooms={classrooms} openClass={openClass} newClass={newClass} notify={notify} />}
        {view === "class-detail" && selectedClass && <ClassDetail classroom={selectedClass} onBack={() => setView("classes")} onEdit={() => openClass(selectedClass, true)} onRemove={participantId => { const updated = { ...selectedClass, participants: selectedClass.participants.filter(person => person.id !== participantId) }; setSelectedClass(updated); setClassrooms(current => current.map(item => item.id === updated.id ? updated : item)); notify("Partecipante rimosso dalla classe"); }} />}
        {view === "class-form" && <ClassForm classroom={selectedClass} onBack={() => window.history.state ? window.history.back() : setView("classes")} onSave={saved => { setClassrooms(current => selectedClass ? current.map(item => item.id === selectedClass.id ? { ...saved, id: item.id } : item) : [{ ...saved, id: Date.now() }, ...current]); setSelectedClass(null); window.history.pushState({}, "", "/classes"); setViewState("classes"); notify(selectedClass ? "Classe aggiornata" : "Classe creata"); }} />}
        {view === "tasks" && <Tasks exercises={exercises} openEditor={() => setView("editor")} editExercise={openExerciseForm} />}
        {view === "report" && <Report />}
        {view === "settings" && <Settings schoolName={schoolName} onSave={saveSchoolName} />}
        {view === "editor" && <Editor code={code} setCode={updateCode} output={output} running={running} startProgram={startProgram} inputRequested={inputRequested} inputPrompt={inputPrompt} programInput={programInput} setProgramInput={setProgramInput} submitProgramInput={submitProgramInput} runTests={runTests} testResult={testResult} aiFeedback={aiFeedback} feedbackLoading={feedbackLoading} draftStatus={draftStatus} verificationMode={verificationMode} notify={notify} />}
        {view === "exercise-form" && <ExerciseForm mode={verificationMode} setMode={setVerificationMode} exercise={editingExercise} onClose={() => { if (window.history.state) window.history.back(); else setView("tasks"); }} onSave={draft => { setExercises(current => editingExercise ? current.map(item => item.id === editingExercise.id ? { ...draft, id: item.id, updatedAt: "Adesso" } : item) : [{ ...draft, id: Date.now(), updatedAt: "Adesso" }, ...current]); setEditingExercise(null); window.history.pushState({}, "", "/exercises"); setViewState("tasks"); notify(editingExercise ? "Esercizio aggiornato in tutte le classi" : "Esercizio aggiunto alla libreria"); }} />}
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
      <Stat label="Studenti attivi" value="24" delta="+2 questo mese" icon="person_check" />
      <Stat label="Esercizi pubblicati" value="12" delta="3 in scadenza" icon="code_blocks" />
      <Stat label="Media della classe" value="84%" delta="+6% dall’ultimo" icon="trending_up" />
    </div>
    <div className="split-grid">
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">PROSSIME SCADENZE</p><h3>Esercizi assegnati</h3></div><button className="quiet" onClick={() => setView("tasks")}>Vedi tutti</button></div>{assignments.map(a => <Assignment key={a.title} {...a} onClick={() => setView("editor")} />)}</section>
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">LA TUA CLASSE</p><h3>Ultimi progressi</h3></div><button className="quiet" onClick={() => setView("report")}>Report</button></div>{students.slice(0, 3).map(s => <Student key={s.name} {...s} />)}</section>
    </div>
  </div>;
}

function Stat({ label, value, delta, icon }: { label: string; value: string; delta: string; icon: string }) { return <article className="stat-card"><span className="stat-icon"><Icon name={icon} /></span><div><p>{label}</p><strong>{value}</strong><small>{delta}</small></div></article>; }
function Assignment({ title, detail, due, progress, color, onClick }: { title: string; detail: string; due: string; progress: number; color: string; onClick: () => void }) { return <button className="assignment" onClick={onClick}><span className={`assignment-icon ${color}`}><Icon name="code" /></span><span className="assignment-main"><strong>{title}</strong><small>{detail}</small><span className="progress"><i style={{ width: `${progress}%` }} /></span></span><span className="due"><small>SCADENZA</small><strong>{due}</strong></span><Icon name="chevron_right" /></button>; }
function Student({ name, initials, done, score, status, tone }: typeof students[number]) { return <div className="student"><span className={`avatar ${tone}`}>{initials}</span><span className="student-name"><strong>{name}</strong><small>{done}/8 esercizi</small></span><span className={`status ${tone}`}>{status}</span><strong className="score">{score}%</strong></div>; }

function Classes({ classrooms, openClass, newClass, notify }: { classrooms: Classroom[]; openClass: (classroom: Classroom, edit?: boolean) => void; newClass: () => void; notify: (value: string) => void }) {
  return <section className="classes-page"><div className="classes-summary"><Stat label="Classi attive" value={String(classrooms.length)} delta="Anno 2026/27" icon="groups" /><Stat label="Partecipanti" value={String(classrooms.reduce((sum, item) => sum + item.participants.length, 0))} delta="Studenti iscritti" icon="person_check" /><Stat label="Esercizi assegnati" value={String(classrooms.reduce((sum, item) => sum + item.exercises, 0))} delta="In tutte le classi" icon="assignment" /></div><div className="class-grid">{classrooms.map(classroom => <article className="managed-class" key={classroom.id}><div className="class-card-head"><span><Icon name="school" /></span><div><p className="eyebrow">CLASSE ATTIVA</p><h2>{classroom.name} · {classroom.subject}</h2></div></div><div className="class-metrics"><span><strong>{classroom.participants.length}</strong><small>partecipanti</small></span><span><strong>{classroom.exercises}</strong><small>esercizi</small></span><span><strong>{classroom.lastActivity}</strong><small>ultima attività</small></span></div><div className="class-code-row"><span>Codice <strong>{classroom.code}</strong></span><button onClick={() => { navigator.clipboard?.writeText(classroom.code); notify("Codice classe copiato"); }} aria-label={`Copia codice ${classroom.code}`}><Icon name="content_copy" /></button></div><div className="class-card-actions"><button className="secondary" onClick={() => openClass(classroom, true)}><Icon name="edit" /> Modifica</button><button className="primary" onClick={() => openClass(classroom)}><Icon name="visibility" /> Apri classe</button></div></article>)}<button className="new-class-card" onClick={newClass}><Icon name="add_circle" /><strong>Crea una nuova classe</strong><span>Genera un codice e aggiungi partecipanti</span></button></div></section>;
}

function ClassDetail({ classroom, onBack, onEdit, onRemove }: { classroom: Classroom; onBack: () => void; onEdit: () => void; onRemove: (id: number) => void }) {
  return <section className="class-detail-page"><button className="back page-back" onClick={onBack}><Icon name="arrow_back" /> Tutte le classi</button><div className="class-detail-hero"><div><p className="eyebrow">CODICE {classroom.code}</p><h2>{classroom.name} · {classroom.subject}</h2><p>{classroom.participants.length} partecipanti · {classroom.exercises} esercizi assegnati</p></div><button className="secondary" onClick={onEdit}><Icon name="edit" /> Modifica classe</button></div><div className="report-summary"><Stat label="Completamento medio" value="76%" delta="su tutti gli esercizi" icon="task_alt" /><Stat label="Media classe" value={`${Math.round(classroom.participants.reduce((sum, p) => sum + p.average, 0) / Math.max(1, classroom.participants.length))}%`} delta="punteggio complessivo" icon="trending_up" /><Stat label="Ultima attività" value="Oggi" delta={classroom.lastActivity} icon="schedule" /></div><section className="panel class-members"><div className="panel-head"><div><p className="eyebrow">PARTECIPANTI</p><h3>Studenti della classe</h3></div><span className="repo-count"><Icon name="group" /> {classroom.participants.length} studenti</span></div><div className="member-table"><div className="member-row member-head"><span>Studente</span><span>Ultimo accesso</span><span>Esercizi</span><span>Avanzamento</span><span>Media</span><span>Azioni</span></div>{classroom.participants.map(person => <div className="member-row" key={person.id}><span className="student-inline"><span className={`avatar ${person.tone}`}>{person.initials}</span><span><strong>{person.name}</strong><small>{person.email}</small></span></span><span>{person.lastAccess}</span><strong>{person.completed}/{person.total}</strong><span className="member-progress"><i style={{ width: `${Math.round(person.completed / person.total * 100)}%` }} /></span><strong>{person.average}%</strong><button className="remove-member" onClick={() => onRemove(person.id)} aria-label={`Rimuovi ${person.name}`}><Icon name="person_remove" /> Rimuovi</button></div>)}</div></section></section>;
}

function ClassForm({ classroom, onBack, onSave }: { classroom: Classroom | null; onBack: () => void; onSave: (classroom: Omit<Classroom, "id">) => void }) {
  const [name, setName] = useState(classroom?.name || "");
  const [subject, setSubject] = useState(classroom?.subject || "Informatica");
  const [code, setCode] = useState(classroom?.code || `CLASSE-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);
  const [participants, setParticipants] = useState<Participant[]>(classroom?.participants || []);
  const [email, setEmail] = useState("");
  function addParticipant() { const clean = email.trim().toLowerCase(); if (!clean || participants.some(person => person.email === clean)) return; const guessed = clean.split("@")[0].split(/[._-]/).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); setParticipants(current => [...current, { id: Date.now(), name: guessed, email: clean, initials: guessed.split(" ").map(part => part[0]).join("").slice(0, 2), lastAccess: "Mai", completed: 0, total: classroom?.exercises || 0, average: 0, tone: "blue" }]); setEmail(""); }
  return <section className="class-form-page"><button className="back page-back" onClick={onBack}><Icon name="arrow_back" /> Torna alle classi</button><div className="panel class-editor"><div><p className="eyebrow">{classroom ? "MODIFICA CLASSE" : "NUOVA CLASSE"}</p><h2>{classroom ? `Gestisci ${classroom.name}` : "Crea una classe"}</h2><p>Configura i dati identificativi e gestisci i partecipanti.</p></div><div className="class-fields"><label>Nome della classe<input value={name} onChange={event => setName(event.target.value)} placeholder="Es. 4ESA" /></label><label>Materia<input value={subject} onChange={event => setSubject(event.target.value)} /></label><label>Codice di iscrizione<input value={code} onChange={event => setCode(event.target.value.toUpperCase())} /></label></div><div className="participant-editor"><div><strong>Partecipanti</strong><small>Aggiungi uno studente tramite email o rimuovilo dall'elenco.</small></div><div className="add-participant"><input type="email" value={email} onChange={event => setEmail(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addParticipant(); } }} placeholder="studente@scuola.it" /><button className="secondary" onClick={addParticipant}><Icon name="person_add" /> Aggiungi</button></div>{participants.map(person => <div className="participant-edit-row" key={person.id}><span className={`avatar ${person.tone}`}>{person.initials}</span><span><strong>{person.name}</strong><small>{person.email}</small></span><button onClick={() => setParticipants(current => current.filter(item => item.id !== person.id))} aria-label={`Rimuovi ${person.name}`}><Icon name="delete" /></button></div>)}</div><div className="modal-actions"><button className="secondary" onClick={onBack}>Annulla</button><button className="primary" disabled={!name.trim() || !code.trim()} onClick={() => onSave({ name: name.trim(), subject: subject.trim(), code: code.trim(), exercises: classroom?.exercises || 0, lastActivity: classroom?.lastActivity || "Nessuna attività", participants })}><Icon name="save" /> {classroom ? "Salva modifiche" : "Crea classe"}</button></div></div></section>;
}
function Tasks({ exercises, openEditor, editExercise }: { exercises: Exercise[]; openEditor: () => void; editExercise: (exercise: Exercise) => void }) {
  return <section className="panel full-panel repository"><div className="panel-head"><div><p className="eyebrow">LIBRERIA CENTRALIZZATA</p><h3>Repository esercizi</h3><p className="panel-copy">Modifica una sola volta il contenuto: tutte le classi assegnate vedranno la versione aggiornata.</p></div><span className="repo-count"><Icon name="inventory_2" /> {exercises.length} esercizi</span></div><div className="repository-head"><span>Esercizio</span><span>Verifica</span><span>Classi e scadenze</span><span>Aggiornato</span><span>Azioni</span></div>{exercises.map(exercise => <article className="repository-row" key={exercise.id}><button className="repo-title" onClick={openEditor}><span className="assignment-icon violet"><Icon name="code_blocks" /></span><span><strong>{exercise.title}</strong><small>{exercise.tests.length} test · {exercise.maxPoints} punti</small></span></button><span className="verification-chip"><Icon name={exercise.verificationMode === "ai" ? "smart_toy" : "science"} /> {exercise.verificationMode === "ai" ? "IA" : "Test"}</span><div className="deadline-list">{exercise.assignments.length ? exercise.assignments.map(link => <span key={link.className}><strong>{link.className}</strong><small>{new Date(link.deadline).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}</small></span>) : <em>Non assegnato</em>}</div><small>{exercise.updatedAt}</small><div className="repo-actions"><button className="secondary" onClick={() => editExercise(exercise)}><Icon name="edit" /> Modifica</button></div></article>)}</section>;
}
function Report() { return <section className="panel full-panel"><div className="panel-head"><div><p className="eyebrow">4ESA · INFORMATICA</p><h3>Completamento esercizi</h3></div><button className="secondary" onClick={() => alert("Il report CSV sarà generato dal backend Supabase.")}><Icon name="download" /> Esporta CSV</button></div><div className="report-summary"><Stat label="Completamento" value="72%" delta="138 consegne" icon="task_alt" /><Stat label="Media punteggio" value="84%" delta="su 24 studenti" icon="trending_up" /><Stat label="Da recuperare" value="3" delta="studenti sotto il 60%" icon="warning" /></div><div className="table"><div className="table-row table-head"><span>Studente</span><span>Completati</span><span>Ultimo invio</span><span>Stato</span><span>Punteggio</span></div>{students.map(s => <div className="table-row" key={s.name}><span className="student-inline"><span className={`avatar ${s.tone}`}>{s.initials}</span><strong>{s.name}</strong></span><span>{s.done}/8</span><span>31 lug, 15:{20 + s.done}</span><span><i className={`status ${s.tone}`}>{s.status}</i></span><strong>{s.score}%</strong></div>)}</div></section>; }

function Settings({ schoolName, onSave }: { schoolName: string; onSave: (value: string) => void }) {
  const [value, setValue] = useState(schoolName);
  useEffect(() => setValue(schoolName), [schoolName]);
  return <section className="panel settings-panel"><div className="settings-icon"><Icon name="domain" /></div><div><p className="eyebrow">IDENTITÀ DELLA PIATTAFORMA</p><h3>Nome della scuola</h3><p>Questo nome compare nell'intestazione del pannello docente e nelle pagine della piattaforma.</p><form onSubmit={event => { event.preventDefault(); onSave(value); }}><label htmlFor="school-name">Istituto scolastico</label><input id="school-name" value={value} onChange={event => setValue(event.target.value)} maxLength={100} required /><button className="primary" type="submit"><Icon name="save" /> Salva impostazione</button></form></div></section>;
}

function ExerciseForm({ mode, setMode, exercise, onClose, onSave }: { mode: VerificationMode; setMode: (mode: VerificationMode) => void; exercise: Exercise | null; onClose: () => void; onSave: (exercise: Omit<Exercise, "id" | "updatedAt">) => void }) {
  const empty: GeneratedExercise = { title: "", description: "", starterCode: "", constraints: "", maxPoints: 100, tests: [] };
  const [draft, setDraft] = useState<GeneratedExercise>(exercise || empty);
  const [links, setLinks] = useState(exercise?.assignments || []);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const setField = <K extends keyof GeneratedExercise>(key: K, value: GeneratedExercise[K]) => setDraft(current => ({ ...current, [key]: value }));
  async function generate() { if (!prompt.trim()) return; setGenerating(true); const result = await generateExerciseWithAi(prompt); setDraft(result); setMode("tests"); setGenerating(false); }
  function toggleClass(className: string) { setLinks(current => current.some(link => link.className === className) ? current.filter(link => link.className !== className) : [...current, { className, deadline: "2026-08-10T23:59" }]); }
  return <section className="exercise-page" aria-labelledby="exercise-title"><button className="back page-back" onClick={onClose}><Icon name="arrow_back" /> Torna alla libreria</button><div className="exercise-modal exercise-editor"><div className="modal-head"><div><p className="eyebrow">{exercise ? "MODIFICA CENTRALIZZATA" : "LIBRERIA ESERCIZI"}</p><h2 id="exercise-title">{exercise ? "Modifica esercizio" : "Crea un esercizio"}</h2><p>Le modifiche al contenuto si applicano a tutte le classi collegate.</p></div></div>{!exercise && <div className="ai-generator"><div><Icon name="auto_awesome" /><span><strong>Genera da prompt IA</strong><small>L'IA prepara consegna, codice iniziale e test. Potrai modificare tutto prima del salvataggio.</small></span></div><textarea value={prompt} onChange={event => setPrompt(event.target.value)} placeholder="Es. Crea un esercizio sulle liste per una classe terza, difficoltà media…" /><button className="secondary" onClick={generate} disabled={generating || !prompt.trim()}><Icon name="wand_stars" /> {generating ? "Generazione…" : "Genera esercizio e test"}</button></div>}<div className="exercise-fields"><label>Titolo<input value={draft.title} onChange={event => setField("title", event.target.value)} /></label><label>Punti<input type="number" value={draft.maxPoints} onChange={event => setField("maxPoints", Number(event.target.value))} /></label><label className="wide">Consegna<textarea value={draft.description} onChange={event => setField("description", event.target.value)} /></label><label className="wide">Vincoli<textarea value={draft.constraints} onChange={event => setField("constraints", event.target.value)} /></label><label className="wide">Codice iniziale<textarea className="code-field" value={draft.starterCode} onChange={event => setField("starterCode", event.target.value)} /></label></div><fieldset><legend>Modalità di verifica</legend><button type="button" className={mode === "tests" ? "verification-card selected" : "verification-card"} onClick={() => setMode("tests")}><Icon name="science" /><span><strong>Test automatici</strong><small>{draft.tests.length} casi di prova configurati.</small></span></button><button type="button" className={mode === "ai" ? "verification-card selected" : "verification-card"} onClick={() => setMode("ai")}><Icon name="smart_toy" /><span><strong>Verifica con IA</strong><small>Valuta semanticamente rispetto alla consegna.</small></span></button></fieldset>{mode === "tests" && <div className="generated-tests"><div><strong>Test dell'esercizio</strong><button onClick={() => setField("tests", [...draft.tests, { input: "", expected: "" }])}><Icon name="add" /> Aggiungi</button></div>{draft.tests.map((test, index) => <div className="test-edit" key={index}><span>{index + 1}</span><input aria-label={`Input test ${index + 1}`} value={test.input} onChange={event => setField("tests", draft.tests.map((item, i) => i === index ? { ...item, input: event.target.value } : item))} placeholder="Input o chiamata" /><input aria-label={`Output test ${index + 1}`} value={test.expected} onChange={event => setField("tests", draft.tests.map((item, i) => i === index ? { ...item, expected: event.target.value } : item))} placeholder="Output atteso" /></div>)}</div>}<div className="class-assignments"><strong>Assegna alle classi</strong>{["4ESA · Informatica", "3BSA · Informatica"].map(className => { const link = links.find(item => item.className === className); return <div key={className}><label><input type="checkbox" checked={!!link} onChange={() => toggleClass(className)} /> {className}</label><input type="datetime-local" disabled={!link} value={link?.deadline || ""} onChange={event => setLinks(current => current.map(item => item.className === className ? { ...item, deadline: event.target.value } : item))} aria-label={`Scadenza ${className}`} /></div>; })}<small>Ogni classe mantiene una scadenza indipendente.</small></div><div className="modal-actions"><button className="secondary" onClick={onClose}><Icon name="arrow_back" /> Annulla</button><button className="primary" disabled={!draft.title.trim() || !draft.description.trim()} onClick={() => onSave({ ...draft, verificationMode: mode, assignments: links })}><Icon name="save" /> {exercise ? "Salva per tutte le classi" : "Salva nella libreria"}</button></div></div></section>;
}

function Editor({ code, setCode, output, running, startProgram, inputRequested, inputPrompt, programInput, setProgramInput, submitProgramInput, runTests, testResult, aiFeedback, feedbackLoading, draftStatus, verificationMode, notify }: { code: string; setCode: (v: string) => void; output: string; running: boolean; startProgram: () => void; inputRequested: boolean; inputPrompt: string; programInput: string; setProgramInput: (v: string) => void; submitProgramInput: () => void; runTests: () => void; testResult: { passed: number; total: number; testedCode: string }; aiFeedback: string; feedbackLoading: boolean; draftStatus: string; verificationMode: VerificationMode; notify: (v: string) => void }) {
  const canSubmit = testResult.passed === testResult.total && testResult.testedCode === code;
  const verificationLabel = verificationMode === "ai" ? "verifica IA" : "test";
  return <div className="editor-layout"><section className="brief"><button className="back" onClick={() => history.back()}><Icon name="arrow_back" /> Esercizi</button><span className="pill coral-pill">IN SCADENZA OGGI</span><h2>Somma dei numeri pari</h2><p>Scrivi una funzione <code>somma_pari(numeri)</code> che restituisca la somma di tutti i numeri pari presenti nella lista.</p><h4>Esempio</h4><pre>somma_pari([1, 2, 3, 4]) → 6</pre><h4>Vincoli</h4><ul><li>La lista contiene da 1 a 100 numeri.</li><li>Ogni numero è compreso tra −1000 e 1000.</li></ul><div className="test-count"><strong>{verificationMode === "ai" ? "IA" : "5"}</strong><span>{verificationMode === "ai" ? "verifica semantica" : "test automatici"}<br />100 punti totali</span></div></section><section className="workspace"><div className="editor-toolbar"><span>main.py</span><span>Copia e incolla disabilitati · Python 3.12</span><span className="draft-status"><Icon name="cloud_done" /> {draftStatus}</span></div><CodeMirror value={code} height="350px" extensions={[python(), blockClipboard]} onChange={setCode} theme="dark" basicSetup={{ lineNumbers: true, foldGutter: false }} /><div className="repl-shell"><div className="console-head"><strong>Programma Python</strong><button onClick={() => setCode(starter)}><Icon name="restart_alt" /> Ripristina codice</button></div><pre aria-live="polite">{output}</pre>{inputRequested && <div className="repl-prompt"><label htmlFor="program-input">{inputPrompt || "Input"}</label><input id="program-input" autoFocus value={programInput} onChange={e => setProgramInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submitProgramInput(); } }} placeholder="Inserisci un valore…" disabled={running} /><button onClick={submitProgramInput} disabled={running}><Icon name="keyboard_return" /> Invia</button></div>}</div>{(feedbackLoading || aiFeedback) && <aside className="ai-feedback" aria-live="polite"><div><strong><Icon name="auto_awesome" /> Feedback IA</strong><small>Analisi tramite Puter.js · nessuna API key richiesta</small></div><p>{feedbackLoading ? "Analisi pedagogica in corso…" : aiFeedback}</p></aside>}<div className="runbar"><span className={canSubmit ? "test-ready" : "test-waiting"}>{canSubmit ? <><Icon name="check_circle" /> Soluzione verificata</> : `Completa la ${verificationLabel} per consegnare`}</span><button className="secondary" onClick={startProgram} disabled={running}><Icon name="play_arrow" /> {running ? "In esecuzione…" : "Esegui"}</button><button className="secondary test-button" onClick={runTests} disabled={running}><Icon name={verificationMode === "ai" ? "smart_toy" : "science"} /> {verificationMode === "ai" ? "Verifica con IA" : "Test"}</button><button className="primary" disabled={!canSubmit || running} onClick={() => notify("Soluzione inviata al docente: 100/100")}><Icon name="send" /> Consegna soluzione</button></div></section></div>;
}
