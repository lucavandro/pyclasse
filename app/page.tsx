"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, supabaseStudioUrl } from "../lib/supabase";
import { resolveRoute } from "../lib/domain.mjs";
import { ExerciseFormV2 } from "./exercise-form";
import { AuthScreenV2 } from "./auth-screen";
import { ReportV2 } from "./report";
import { useStudentDraft } from "./use-student-draft";
import { useLocale } from "../lib/i18n";
import {
  isAssignmentLocked,
  scoreAsPercentage,
} from "../lib/learning-path.mjs";

// Markdown and its parser are loaded only when an exercise editor is opened.
const MarkdownContent = lazy(() =>
  import("./markdown-content").then((module) => ({
    default: module.MarkdownContent,
  })),
);
const PythonEditor = lazy(() =>
  import("./python-editor").then((module) => ({
    default: module.PythonEditor,
  })),
);

type View =
  | "home"
  | "classes"
  | "class-detail"
  | "class-form"
  | "tasks"
  | "report"
  | "settings"
  | "editor"
  | "exercise-form";
type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "teacher" | "student";
  last_seen_at: string | null;
  external_ai_enabled: boolean;
};
type Classroom = {
  id: string;
  teacher_id: string;
  name: string;
  subject: string;
  join_code: string;
  archived_at: string | null;
  created_at: string;
};
type Membership = { class_id: string; student_id: string; joined_at: string };
type Exercise = {
  id: string;
  teacher_id: string;
  title: string;
  description: string;
  description_format: "markdown";
  resource_url: string | null;
  resource_label: string | null;
  constraints: string;
  starter_code: string;
  verification_mode: "tests" | "ai";
  max_points: number;
  is_prerequisite: boolean;
  tags: string[];
  updated_at: string;
  created_at: string;
};
type Assignment = {
  id: string;
  exercise_id: string;
  class_id: string;
  deadline: string | null;
  published_at: string | null;
  grading_scale: 10 | 100 | null;
  position: number;
  created_at: string;
};
type ExerciseTest = {
  id: string;
  exercise_id: string;
  position: number;
  input_data: string;
  expected_output: string;
  is_hidden: boolean;
  points: number;
};
type Submission = {
  id: string;
  class_assignment_id: string;
  student_id: string;
  code: string;
  status: "draft" | "submitted" | "passed" | "partial" | "failed";
  score: number | null;
  submitted_at: string | null;
  updated_at: string;
  updated_by: string | null;
};
type Settings = {
  singleton: boolean;
  teacher_email: string | null;
  school_name: string;
  login_title_it: string;
  login_subtitle_it: string;
  login_title_en: string;
  login_subtitle_en: string;
};
type Workspace = {
  profile: Profile;
  settings: Settings | null;
  profiles: Profile[];
  classes: Classroom[];
  memberships: Membership[];
  exercises: Exercise[];
  assignments: Assignment[];
  tests: ExerciseTest[];
  submissions: Submission[];
};

const initials = (profile?: Profile | null) =>
  (profile?.full_name || profile?.email || "?")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
const displayName = (profile?: Profile | null) =>
  profile?.full_name || profile?.email || "Utente";
const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "medium",
  timeStyle: "short",
});
const formatDate = (value?: string | null) =>
  value ? dateFormatter.format(new Date(value)) : "—";
const percent = (value: number, total: number) =>
  total ? Math.round((value / total) * 100) : 0;

function Icon({ name }: { name: string }) {
  return (
    <span className="material-symbols-rounded" aria-hidden="true">
      {name}
    </span>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="empty-state">{children}</p>;
}

async function fetchWorkspace(user: User): Promise<Workspace> {
  if (!supabase) throw new Error("Supabase non è configurato.");
  const profileResult = await supabase
    .from("profiles")
    .select("id,email,full_name,role,last_seen_at,external_ai_enabled")
    .eq("id", user.id)
    .single();
  if (profileResult.error) throw profileResult.error;
  const profile = profileResult.data as Profile;
  await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", user.id);
  const [
    settings,
    profiles,
    classes,
    memberships,
    exercises,
    assignments,
    tests,
    submissions,
  ] = await Promise.all([
    supabase
      .from("app_settings")
      .select(
        "singleton,teacher_email,school_name,login_title_it,login_subtitle_it,login_title_en,login_subtitle_en",
      )
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id,email,full_name,role,last_seen_at,external_ai_enabled"),
    supabase
      .from("classes")
      .select("id,teacher_id,name,subject,join_code,archived_at,created_at")
      .is("archived_at", null)
      .order("created_at"),
    supabase.from("class_members").select("class_id,student_id,joined_at"),
    supabase
      .from("exercises")
      .select(
        "id,teacher_id,title,description,description_format,resource_url,resource_label,constraints,starter_code,verification_mode,max_points,is_prerequisite,tags,updated_at,created_at",
      )
      .order("updated_at", { ascending: false }),
    supabase
      .from("class_assignments")
      .select(
        "id,exercise_id,class_id,deadline,published_at,grading_scale,position,created_at",
      )
      .order("position"),
    supabase
      .from("tests")
      .select(
        "id,exercise_id,position,input_data,expected_output,is_hidden,points",
      )
      .order("position"),
    supabase
      .from("submissions")
      .select(
        "id,class_assignment_id,student_id,code,status,score,submitted_at,updated_at,updated_by",
      )
      .order("updated_at", { ascending: false }),
  ]);
  const failure = [
    settings,
    profiles,
    classes,
    memberships,
    exercises,
    assignments,
    tests,
    submissions,
  ].find((result) => result.error);
  if (failure?.error) throw failure.error;
  return {
    profile,
    settings: settings.data as Settings | null,
    profiles: profiles.data as Profile[],
    classes: classes.data as Classroom[],
    memberships: memberships.data as Membership[],
    exercises: exercises.data as Exercise[],
    assignments: assignments.data as Assignment[],
    tests: tests.data as ExerciseTest[],
    submissions: submissions.data as Submission[],
  };
}

export default function Home() {
  const { locale, setLocale, t } = useLocale();
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setViewState] = useState<View>("home");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );
  const [toast, setToast] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const userRef = useRef<User | null>(null);

  const reload = useCallback(async (currentUser?: User | null) => {
    const targetUser = currentUser ?? userRef.current;
    if (!targetUser) return;
    setLoading(true);
    setError("");
    try {
      setWorkspace(await fetchWorkspace(targetUser));
    } catch (cause) {
      const message =
        cause && typeof cause === "object" && "message" in cause
          ? String(cause.message)
          : "Errore durante la lettura dei dati.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Authentication is an external Supabase subscription.
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      userRef.current = data.user;
      setUser(data.user);
      if (data.user) void reload(data.user);
      else setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const nextUser = session?.user ?? null;
        userRef.current = nextUser;
        setUser(nextUser);
        if (nextUser) void reload(nextUser);
        else {
          setWorkspace(null);
          setLoading(false);
        }
      },
    );
    return () => listener.subscription.unsubscribe();
  }, [reload]);

  const syncRoute = useCallback(() => {
    const path = location.pathname.replace(/\/$/, "") || "/";
    const classMatch = path.match(/^\/classes\/([0-9a-f-]+)(\/edit)?$/i);
    const exerciseMatch = path.match(/^\/exercises\/([0-9a-f-]+)(\/edit)?$/i);
    if (classMatch) {
      setSelectedClassId(classMatch[1]);
      setViewState(classMatch[2] ? "class-form" : "class-detail");
      return;
    }
    if (exerciseMatch) {
      setSelectedExerciseId(exerciseMatch[1]);
      setViewState(exerciseMatch[2] ? "exercise-form" : "editor");
      return;
    }
    setSelectedClassId(null);
    setSelectedExerciseId(null);
    setViewState((resolveRoute(path)?.view as View | undefined) ?? "home");
  }, []);
  useEffect(() => {
    // Synchronize the client view with browser history on first render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    syncRoute();
    addEventListener("popstate", syncRoute);
    return () => removeEventListener("popstate", syncRoute);
  }, [syncRoute]);

  function navigate(target: View, id?: string) {
    const path =
      target === "home"
        ? "/"
        : target === "classes"
          ? "/classes"
          : target === "class-form"
            ? id
              ? `/classes/${id}/edit`
              : "/classes/new"
            : target === "class-detail"
              ? `/classes/${id}`
              : target === "tasks"
                ? "/exercises"
                : target === "exercise-form"
                  ? id
                    ? `/exercises/${id}/edit`
                    : "/exercises/new"
                  : target === "editor"
                    ? `/exercises/${id}`
                    : target === "report"
                      ? "/reports"
                      : "/settings";
    history.pushState({}, "", path);
    syncRoute();
  }
  function notify(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 2600);
  }
  async function handleSignOut() {
    await supabase?.auth.signOut();
  }

  if (!supabase) return <ConfigurationScreen error={error} />;
  if (loading && !workspace)
    return (
      <StatusScreen
        title="Caricamento"
        message="Lettura dei dati dal database…"
      />
    );
  if (!user) return <AuthScreenV2 />;
  if (error || !workspace)
    return (
      <StatusScreen
        title="Dati non disponibili"
        message={error}
        action={() => void reload(user)}
      />
    );

  const selectedClass =
    workspace.classes.find((item) => item.id === selectedClassId) ?? null;
  const selectedExercise =
    workspace.exercises.find((item) => item.id === selectedExerciseId) ?? null;
  const schoolName = workspace.settings?.school_name || "PyClasse";
  const title =
    view === "home"
      ? `${locale === "it" ? "Ciao" : "Hello"}, ${displayName(workspace.profile)}`
      : view === "classes"
        ? t("classes")
        : view === "class-detail"
          ? selectedClass?.name || t("classes")
          : view === "class-form"
            ? selectedClass
              ? locale === "it"
                ? "Modifica classe"
                : "Edit class"
              : t("newClass")
            : view === "tasks"
              ? t("exercises")
              : view === "exercise-form"
                ? selectedExercise
                  ? locale === "it"
                    ? "Modifica esercizio"
                    : "Edit exercise"
                  : t("newExercise")
                : view === "editor"
                  ? selectedExercise?.title || t("exercises")
                  : view === "report"
                    ? t("report")
                    : t("settings");

  return (
    <main
      className={`app-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}
    >
      <aside className="sidebar">
        <div className="sidebar-head">
          <button
            className="hamburger"
            aria-label={sidebarCollapsed ? "Espandi menu" : "Comprimi menu"}
            aria-expanded={!sidebarCollapsed}
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          >
            <Icon name={sidebarCollapsed ? "menu_open" : "menu"} />
          </button>
          <button className="brand" onClick={() => navigate("home")}>
            <span className="brand-mark">&gt;_</span>
            <span>PyClasse</span>
          </button>
        </div>
        <nav aria-label="Navigazione principale">
          {(
            [
              ["home", "dashboard", t("overview")],
              ["classes", "groups", t("classes")],
              ["tasks", "code_blocks", t("exercises")],
              ["report", "analytics", t("report")],
              ["settings", "settings", t("settings")],
            ] as [View, string, string][]
          ).map(([target, icon, label]) => (
            <button
              key={target}
              className={view === target ? "nav-item active" : "nav-item"}
              onClick={() => navigate(target)}
            >
              <Icon name={icon} />
              <b>{label}</b>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile">
            <span className="avatar dark">{initials(workspace.profile)}</span>
            <div>
              <strong>{displayName(workspace.profile)}</strong>
              <small>
                {workspace.profile.role === "teacher"
                  ? t("teacher")
                  : t("student")}
              </small>
            </div>
            <button
              className="logout-button"
              aria-label="Esci dall'account"
              onClick={() => void handleSignOut()}
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </aside>
      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">{schoolName}</p>
            <h1>{title}</h1>
          </div>
          {workspace.profile.role === "teacher" && (
            <div className="top-actions">
              {view === "classes" ? (
                <button
                  className="primary"
                  onClick={() => navigate("class-form")}
                >
                  <Icon name="group_add" /> Nuova classe
                </button>
              ) : view === "tasks" ? (
                <button
                  className="primary"
                  onClick={() => navigate("exercise-form")}
                >
                  <Icon name="add" /> Nuovo esercizio
                </button>
              ) : null}
            </div>
          )}
        </header>
        {view === "home" && <Dashboard data={workspace} navigate={navigate} />}
        {view === "classes" && (
          <Classes
            data={workspace}
            navigate={navigate}
            reload={reload}
            notify={notify}
          />
        )}
        {view === "class-detail" && selectedClass && (
          <ClassDetail
            classroom={selectedClass}
            data={workspace}
            navigate={navigate}
            reload={reload}
            notify={notify}
          />
        )}
        {view === "class-form" && (
          <ClassForm
            classroom={selectedClass}
            profile={workspace.profile}
            navigate={navigate}
            reload={reload}
            notify={notify}
          />
        )}
        {view === "tasks" && <Exercises data={workspace} navigate={navigate} />}
        {view === "exercise-form" && (
          <ExerciseFormV2
            exercise={selectedExercise}
            data={workspace}
            navigate={navigate}
            reload={reload}
            notify={notify}
          />
        )}
        {view === "editor" &&
          selectedExercise &&
          (() => {
            const assignment = workspace.assignments.find(
              (item) => item.exercise_id === selectedExercise.id,
            );
            return assignment && assignmentIsLocked(workspace, assignment) ? (
              <Empty>
                Consegna gli esercizi propedeutici precedenti per sbloccare
                questa attività.
              </Empty>
            ) : (
              <Editor
                exercise={selectedExercise}
                data={workspace}
                reload={reload}
                notify={notify}
              />
            );
          })()}
        {view === "report" && (
          <ReportV2 data={workspace} reload={reload} notify={notify} />
        )}
        {view === "settings" && (
          <SettingsPanel
            data={workspace}
            locale={locale}
            setLocale={setLocale}
            reload={reload}
            notify={notify}
          />
        )}
        {((view === "class-detail" && !selectedClass) ||
          (view === "editor" && !selectedExercise)) && (
          <Empty>Elemento non trovato o non accessibile.</Empty>
        )}
      </section>
      {toast && (
        <div className="toast" role="status">
          ✓ {toast}
        </div>
      )}
    </main>
  );
}

function StatusScreen({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: () => void;
}) {
  return (
    <main className="logout-screen">
      <section>
        <span className="brand-mark">&gt;_</span>
        <p className="eyebrow">PYCLASSE</p>
        <h1>{title}</h1>
        <p>{message}</p>
        {action && (
          <button className="primary" onClick={action}>
            Riprova
          </button>
        )}
      </section>
    </main>
  );
}

function ConfigurationScreen({ error }: { error?: string }) {
  return (
    <main className="logout-screen">
      <section>
        <span className="brand-mark">&gt;_</span>
        <p className="eyebrow">PYCLASSE · INSTALLAZIONE</p>
        <h1>Completa la configurazione di Supabase</h1>
        <p>
          L’applicazione è installata, ma non può collegarsi al database. Nel
          pannello del provider di hosting aggiungi queste variabili d’ambiente:
        </p>
        <ol>
          <li>
            <code>NEXT_PUBLIC_SUPABASE_URL</code>: URL API del progetto
            Supabase.
          </li>
          <li>
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>: chiave pubblica anon del
            progetto (mai la chiave <code>service_role</code>).
          </li>
          <li>
            Applica le migrazioni con <code>npx supabase db push</code> e
            aggiungi il dominio dell’app alle Redirect URLs di Supabase Auth.
          </li>
          <li>Riavvia o ridistribuisci l’applicazione.</li>
        </ol>
        <p>
          I valori si trovano in Supabase in{" "}
          <strong>Project Settings → API</strong>. Consulta anche{" "}
          <code>docs/INSTALLATION_AND_DEPLOYMENT.md</code>.
        </p>
        {error && <p role="alert">Dettaglio: {error}</p>}
      </section>
    </main>
  );
}

function Dashboard({
  data,
  navigate,
}: {
  data: Workspace;
  navigate: (v: View, id?: string) => void;
}) {
  const published = data.assignments.filter((item) => item.published_at);
  const submitted = data.submissions.filter((item) => item.status !== "draft");
  const studentCompletedIds = new Set(
    submitted
      .filter((item) => item.student_id === data.profile.id)
      .map((item) => item.class_assignment_id),
  );
  const completedExercises = published.filter((item) =>
    studentCompletedIds.has(item.id),
  ).length;
  const normalizedScores = submitted.flatMap((item) => {
    const assignment = data.assignments.find(
      (candidate) => candidate.id === item.class_assignment_id,
    );
    const value = scoreAsPercentage(item.score, assignment?.grading_scale);
    return value === null ? [] : [value];
  });
  const completion =
    data.profile.role === "student"
      ? percent(completedExercises, published.length)
      : percent(
          submitted.length,
          published.length * Math.max(1, data.memberships.length),
        );
  const avg = normalizedScores.length
    ? Math.round(
        normalizedScores.reduce((sum, item) => sum + item, 0) /
          normalizedScores.length,
      )
    : 0;
  const upcoming = published
    .filter(
      (item) =>
        data.profile.role !== "student" || !studentCompletedIds.has(item.id),
    )
    .filter((item) => item.deadline && new Date(item.deadline) >= new Date())
    .slice(0, 3);
  return (
    <div className="dashboard">
      <section className="hero-card">
        <div>
          <span className="pill">DATI AGGIORNATI DAL DATABASE</span>
          <h2>
            {published.length
              ? "Andamento delle attività"
              : "Inizia creando o unendoti a una classe"}
          </h2>
          <p>{completion}% delle consegne previste risulta completato.</p>
          <button className="text-link" onClick={() => navigate("report")}>
            Vedi il report completo →
          </button>
        </div>
        <div className="hero-stat">
          <div className="ring">
            <strong>{completion}%</strong>
            <span>completati</span>
          </div>
        </div>
      </section>
      <div
        className={`stats-grid${data.profile.role === "student" ? " student-stats" : ""}`}
      >
        {data.profile.role === "teacher" && (
          <Stat
            label="Studenti iscritti"
            value={String(data.memberships.length)}
            delta="iscrizioni correnti"
            icon="person_check"
          />
        )}
        <Stat
          label="Esercizi"
          value={
            data.profile.role === "student"
              ? `${completedExercises}/${published.length}`
              : String(data.exercises.length)
          }
          delta={
            data.profile.role === "student"
              ? "completati / assegnati"
              : `${published.length} compiti pubblicati`
          }
          icon="code_blocks"
        />
        <Stat
          label="Media consegne"
          value={`${avg}%`}
          delta={`${submitted.length} consegne`}
          icon="trending_up"
        />
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">PROSSIME SCADENZE</p>
            <h3>Esercizi assegnati</h3>
          </div>
        </div>
        {upcoming.length ? (
          upcoming.map((item) => {
            const exercise = data.exercises.find(
              (e) => e.id === item.exercise_id,
            );
            const classroom = data.classes.find((c) => c.id === item.class_id);
            return (
              <button
                className="assignment"
                key={item.id}
                onClick={() => exercise && navigate("editor", exercise.id)}
              >
                <span className="assignment-icon violet">
                  <Icon name="code" />
                </span>
                <span className="assignment-main">
                  <strong>{exercise?.title}</strong>
                  <small>{classroom?.name}</small>
                </span>
                <span className="due">
                  <small>SCADENZA</small>
                  <strong>{formatDate(item.deadline)}</strong>
                </span>
              </button>
            );
          })
        ) : (
          <Empty>Nessuna scadenza disponibile.</Empty>
        )}
      </section>
    </div>
  );
}
function Stat({
  label,
  value,
  delta,
  icon,
}: {
  label: string;
  value: string;
  delta: string;
  icon: string;
}) {
  return (
    <article className="stat-card">
      <span className="stat-icon">
        <Icon name={icon} />
      </span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{delta}</small>
      </div>
    </article>
  );
}

function Classes({
  data,
  navigate,
  reload,
  notify,
}: {
  data: Workspace;
  navigate: (v: View, id?: string) => void;
  reload: () => Promise<void>;
  notify: (v: string) => void;
}) {
  const [code, setCode] = useState("");
  async function join() {
    if (!supabase || !code.trim()) return;
    const { error } = await supabase.rpc("join_class", { code: code.trim() });
    if (error) notify(error.message);
    else {
      setCode("");
      await reload();
      notify("Iscrizione completata");
    }
  }
  return (
    <section className="classes-page">
      {data.profile.role === "teacher" && (
        <div className="classes-summary">
          <Stat
            label="Classi"
            value={String(data.classes.length)}
            delta="accessibili"
            icon="groups"
          />
          <Stat
            label="Partecipanti"
            value={String(data.memberships.length)}
            delta="iscrizioni"
            icon="person_check"
          />
          <Stat
            label="Compiti assegnati"
            value={String(data.assignments.length)}
            delta="totali"
            icon="assignment"
          />
        </div>
      )}
      {data.profile.role === "student" && (
        <div className="join-strip">
          <div>
            <h3>Unisciti a una classe</h3>
            <p>Inserisci il codice fornito dal docente.</p>
          </div>
          <div className="join-form">
            <input
              aria-label="Codice classe"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <button className="primary" onClick={() => void join()}>
              Unisciti
            </button>
          </div>
        </div>
      )}
      <div
        className={`class-grid${data.profile.role === "student" ? " student-class-grid" : ""}`}
      >
        {data.classes.map((item) => (
          <article className="managed-class" key={item.id}>
            <div className="class-card-head">
              <span>
                <Icon name="school" />
              </span>
              <div>
                <p className="eyebrow">CLASSE</p>
                <h2>
                  {item.name} · {item.subject}
                </h2>
              </div>
            </div>
            <div className="class-metrics">
              {data.profile.role === "teacher" && (
                <span>
                  <strong>
                    {
                      data.memberships.filter((m) => m.class_id === item.id)
                        .length
                    }
                  </strong>
                  <small>partecipanti</small>
                </span>
              )}
              <span>
                <strong>
                  {
                    data.assignments.filter((a) => a.class_id === item.id)
                      .length
                  }
                </strong>
                <small>compiti assegnati</small>
              </span>
            </div>
            {data.profile.role === "teacher" && (
              <div className="class-code-row">
                <span>
                  Codice <strong>{item.join_code}</strong>
                </span>
              </div>
            )}
            <div className="class-card-actions">
              {data.profile.role === "teacher" && (
                <button
                  className="secondary"
                  onClick={() => navigate("class-form", item.id)}
                >
                  <Icon name="edit" /> Modifica
                </button>
              )}
              <button
                className="primary"
                onClick={() => navigate("class-detail", item.id)}
              >
                <Icon name="visibility" /> Apri classe
              </button>
            </div>
          </article>
        ))}
        {!data.classes.length && <Empty>Nessuna classe nel database.</Empty>}
      </div>
    </section>
  );
}
function ClassDetail({
  classroom,
  data,
  navigate,
  reload,
  notify,
}: {
  classroom: Classroom;
  data: Workspace;
  navigate: (v: View, id?: string) => void;
  reload: () => Promise<void>;
  notify: (v: string) => void;
}) {
  const members = data.memberships
    .filter((m) => m.class_id === classroom.id)
    .map((m) => ({
      membership: m,
      profile: data.profiles.find((p) => p.id === m.student_id),
    }))
    .filter((item) => item.profile);
  const classAssignments = data.assignments.filter(
    (a) => a.class_id === classroom.id,
  );
  async function remove(studentId: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from("class_members")
      .delete()
      .eq("class_id", classroom.id)
      .eq("student_id", studentId);
    if (error) notify(error.message);
    else {
      await reload();
      notify("Partecipante rimosso");
    }
  }
  return (
    <section className="class-detail-page">
      <button className="back page-back" onClick={() => navigate("classes")}>
        <Icon name="arrow_back" /> Tutte le classi
      </button>
      <div className="class-detail-hero">
        <div>
          <p className="eyebrow">
            {data.profile.role === "teacher"
              ? `CODICE ${classroom.join_code}`
              : "CLASSE"}
          </p>
          <h2>
            {classroom.name} · {classroom.subject}
          </h2>
          <p>
            {members.length} partecipanti · {classAssignments.length} compiti
            assegnati
          </p>
        </div>
        {data.profile.role === "teacher" && (
          <button
            className="secondary"
            onClick={() => navigate("class-form", classroom.id)}
          >
            <Icon name="edit" /> Modifica classe
          </button>
        )}
      </div>
      <section className="panel class-members">
        <div className="panel-head">
          <div>
            <p className="eyebrow">PARTECIPANTI</p>
            <h3>Studenti della classe</h3>
          </div>
        </div>
        {members.length ? (
          members.map(({ membership, profile }) => (
            <div className="student" key={membership.student_id}>
              <span className="avatar blue">{initials(profile)}</span>
              <span className="student-name">
                <strong>{displayName(profile)}</strong>
                <small>Iscritto: {formatDate(membership.joined_at)}</small>
              </span>
              <span>{formatDate(profile?.last_seen_at)}</span>
              {data.profile.role === "teacher" && (
                <button
                  className="remove-member"
                  onClick={() => void remove(membership.student_id)}
                >
                  Rimuovi
                </button>
              )}
            </div>
          ))
        ) : (
          <Empty>Nessuno studente iscritto.</Empty>
        )}
      </section>
    </section>
  );
}
function ClassForm({
  classroom,
  profile,
  navigate,
  reload,
  notify,
}: {
  classroom: Classroom | null;
  profile: Profile;
  navigate: (v: View, id?: string) => void;
  reload: () => Promise<void>;
  notify: (v: string) => void;
}) {
  const [name, setName] = useState(classroom?.name || "");
  const [subject, setSubject] = useState(classroom?.subject || "");
  const [joinCode, setJoinCode] = useState(
    classroom?.join_code ||
      crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase(),
  );
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    const values = {
      name: name.trim(),
      subject: subject.trim(),
      join_code: joinCode.trim().toUpperCase(),
      teacher_id: profile.id,
    };
    const result = classroom
      ? await supabase.from("classes").update(values).eq("id", classroom.id)
      : await supabase.from("classes").insert(values);
    if (result.error) notify(result.error.message);
    else {
      await reload();
      navigate("classes");
      notify(classroom ? "Classe aggiornata" : "Classe creata");
    }
  }
  if (profile.role !== "teacher")
    return <Empty>Questa funzione è riservata ai docenti.</Empty>;
  return (
    <section className="panel class-editor">
      <button className="back" onClick={() => navigate("classes")}>
        <Icon name="arrow_back" /> Annulla
      </button>
      <h2>{classroom ? "Modifica classe" : "Nuova classe"}</h2>
      <form className="class-fields" onSubmit={(e) => void save(e)}>
        <label>
          Nome
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label>
          Materia
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </label>
        <label>
          Codice di iscrizione
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            minLength={6}
            maxLength={12}
            required
          />
        </label>
        <button className="primary">Salva classe</button>
      </form>
    </section>
  );
}
function assignmentIsLocked(data: Workspace, assignment: Assignment) {
  if (data.profile.role !== "student") return false;
  return isAssignmentLocked(
    data.assignments,
    data.exercises,
    data.submissions,
    assignment,
    data.profile.id,
  );
}

function Exercises({
  data,
  navigate,
}: {
  data: Workspace;
  navigate: (v: View, id?: string) => void;
}) {
  return data.profile.role === "student" ? (
    <StudentExercises data={data} navigate={navigate} />
  ) : (
    <TeacherExercises data={data} navigate={navigate} />
  );
}

function StudentExercises({
  data,
  navigate,
}: {
  data: Workspace;
  navigate: (v: View, id?: string) => void;
}) {
  const [filter, setFilter] = useState<"todo" | "submitted">("todo");
  const items = data.assignments
    .filter((assignment) => assignment.published_at)
    .map((assignment) => {
      const exercise = data.exercises.find(
        (candidate) => candidate.id === assignment.exercise_id,
      );
      const classroom = data.classes.find(
        (candidate) => candidate.id === assignment.class_id,
      );
      const submission = data.submissions.find(
        (candidate) =>
          candidate.class_assignment_id === assignment.id &&
          candidate.student_id === data.profile.id,
      );
      return { assignment, exercise, classroom, submission };
    })
    .filter((item) => item.exercise);
  const delivered = items.filter(
    (item) => item.submission && item.submission.status !== "draft",
  );
  const todo = items.filter(
    (item) => !item.submission || item.submission.status === "draft",
  );
  const visible = (filter === "todo" ? todo : delivered).sort((a, b) => {
    const left = a.assignment.deadline
      ? new Date(a.assignment.deadline).getTime()
      : Number.MAX_SAFE_INTEGER;
    const right = b.assignment.deadline
      ? new Date(b.assignment.deadline).getTime()
      : Number.MAX_SAFE_INTEGER;
    return left - right;
  });

  return (
    <section className="student-tasks-page">
      <header className="student-tasks-hero">
        <div>
          <p className="eyebrow">IL TUO LAVORO</p>
          <h2>Compiti assegnati</h2>
          <p>
            Individua subito le attività da completare e consulta separatamente
            quelle già consegnate.
          </p>
        </div>
        <div className="student-task-progress" aria-label="Riepilogo compiti">
          <strong>{delivered.length}</strong>
          <span>di {items.length} consegnati</span>
        </div>
      </header>
      <div
        className="task-status-filter"
        role="tablist"
        aria-label="Stato compiti"
      >
        <button
          role="tab"
          aria-selected={filter === "todo"}
          className={filter === "todo" ? "active" : ""}
          onClick={() => setFilter("todo")}
        >
          <Icon name="pending_actions" /> Da consegnare
          <span>{todo.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={filter === "submitted"}
          className={filter === "submitted" ? "active" : ""}
          onClick={() => setFilter("submitted")}
        >
          <Icon name="task_alt" /> Consegnati
          <span>{delivered.length}</span>
        </button>
      </div>
      <div className="student-task-list" role="tabpanel">
        {visible.length ? (
          visible.map(({ assignment, exercise, classroom, submission }) => {
            if (!exercise) return null;
            const locked = assignmentIsLocked(data, assignment);
            const overdue = Boolean(
              assignment.deadline &&
                new Date(assignment.deadline) < new Date() &&
                (!submission || submission.status === "draft"),
            );
            const deliveredItem = Boolean(
              submission && submission.status !== "draft",
            );
            return (
              <article
                className={`student-task-card${locked ? " is-locked" : ""}${overdue ? " is-overdue" : ""}`}
                key={assignment.id}
              >
                <div className="student-task-state">
                  <span>
                    <Icon
                      name={
                        locked
                          ? "lock"
                          : deliveredItem
                            ? "task_alt"
                            : "edit_note"
                      }
                    />
                    {locked
                      ? "Bloccato"
                      : deliveredItem
                        ? "Consegnato"
                        : submission
                          ? "Bozza salvata"
                          : "Da iniziare"}
                  </span>
                  <small>{classroom?.name}</small>
                </div>
                <div className="student-task-main">
                  <h3>{exercise.title}</h3>
                  <p>
                    {
                      data.tests.filter(
                        (test) => test.exercise_id === exercise.id,
                      ).length
                    }{" "}
                    test automatici · {exercise.max_points} punti
                  </p>
                  {exercise.tags.length > 0 && (
                    <div className="student-task-tags">
                      {exercise.tags.map((tag) => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="student-task-metadata">
                  <div className="student-task-deadline">
                    <span>{overdue ? "SCADUTO" : "SCADENZA"}</span>
                    <strong>
                      {assignment.deadline
                        ? formatDate(assignment.deadline)
                        : "Nessuna scadenza"}
                    </strong>
                  </div>
                  <div className="student-task-grading">
                    <span>VALUTAZIONE</span>
                    <strong>
                      {assignment.grading_scale
                        ? `Voto in ${assignment.grading_scale === 10 ? "decimi" : "centesimi"}`
                        : "Senza voto"}
                    </strong>
                  </div>
                </div>
                <button
                  className={deliveredItem ? "secondary" : "primary"}
                  disabled={locked}
                  onClick={() => navigate("editor", exercise.id)}
                >
                  {locked
                    ? "Completa i precedenti"
                    : deliveredItem
                      ? "Rivedi consegna"
                      : submission
                        ? "Continua"
                        : "Inizia"}
                  {!locked && <Icon name="arrow_forward" />}
                </button>
              </article>
            );
          })
        ) : (
          <Empty>
            {filter === "todo"
              ? "Non hai compiti da consegnare."
              : "Non hai ancora consegnato alcun compito."}
          </Empty>
        )}
      </div>
    </section>
  );
}

function TeacherExercises({
  data,
  navigate,
}: {
  data: Workspace;
  navigate: (v: View, id?: string) => void;
}) {
  const allTags = [
    ...new Set(data.exercises.flatMap((item) => item.tags)),
  ].sort();
  const [tag, setTag] = useState("");
  const visible = tag
    ? data.exercises.filter((item) => item.tags.includes(tag))
    : data.exercises;
  return (
    <section className="panel full-panel repository">
      <div className="panel-head exercise-library-head">
        <div>
          <p className="eyebrow">
            {data.profile.role === "student"
              ? "IL TUO PERCORSO"
              : "LIBRERIA DIDATTICA"}
          </p>
          <h3>
            {data.profile.role === "student"
              ? "Compiti assegnati"
              : "Repository esercizi"}
          </h3>
          <p className="exercise-library-intro">
            {data.profile.role === "student"
              ? "Svolgi le attività nell’ordine previsto e controlla scadenze e modalità di valutazione."
              : "Organizza, filtra e assegna le attività Python alle tue classi."}
          </p>
        </div>
        <div className="exercise-library-tools">
          <label className="exercise-filter">
            <Icon name="filter_alt" />
            <span>Filtra per tag</span>
            <select
              aria-label="Filtra per tag"
              value={tag}
              onChange={(event) => setTag(event.target.value)}
            >
              <option value="">Tutti</option>
              {allTags.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <span className="repo-count">
            {visible.length} {visible.length === 1 ? "esercizio" : "esercizi"}
          </span>
        </div>
      </div>
      {visible.length ? (
        visible.map((item) => {
          const assignment = data.assignments.find(
            (a) => a.exercise_id === item.id,
          );
          const locked = assignment
            ? assignmentIsLocked(data, assignment)
            : false;
          return (
            <article
              className={`repository-row exercise-card${locked ? " is-locked" : ""}`}
              key={item.id}
            >
              <button
                className="repo-title"
                disabled={locked}
                onClick={() => navigate("editor", item.id)}
              >
                <span className="assignment-icon violet">
                  <Icon name={locked ? "lock" : "code_blocks"} />
                </span>
                <span className="exercise-card-copy">
                  <strong>{item.title}</strong>
                  <small>
                    {data.tests.filter((t) => t.exercise_id === item.id).length}{" "}
                    test · {item.max_points} punti ·{" "}
                    {item.is_prerequisite ? "Propedeutico" : "Non propedeutico"}
                  </small>
                  {item.tags.length > 0 && (
                    <span className="exercise-tags" aria-label="Tag esercizio">
                      {item.tags.map((value) => `#${value}`).join(" ")}
                    </span>
                  )}
                </span>
              </button>
              <span className={`verification-chip${locked ? " locked" : ""}`}>
                <Icon name={locked ? "lock" : "verified"} />
                {locked
                  ? "Bloccato"
                  : item.verification_mode === "ai"
                    ? "IA"
                    : "Test"}
              </span>
              <div className="deadline-list">
                {data.assignments
                  .filter((a) => a.exercise_id === item.id)
                  .map((a) => (
                    <span key={a.id}>
                      <strong>
                        {data.classes.find((c) => c.id === a.class_id)?.name}
                      </strong>
                      <small>
                        {formatDate(a.deadline)} ·{" "}
                        {a.grading_scale
                          ? `Voto /${a.grading_scale}`
                          : "Senza voto"}
                      </small>
                    </span>
                  ))}
              </div>
              <small>{formatDate(item.updated_at)}</small>
              {data.profile.role === "teacher" && (
                <button
                  className="secondary"
                  onClick={() => navigate("exercise-form", item.id)}
                >
                  Modifica
                </button>
              )}
            </article>
          );
        })
      ) : (
        <Empty>Nessun esercizio nel database.</Empty>
      )}
    </section>
  );
}

function SettingsPanel({
  data,
  locale,
  setLocale,
  reload,
  notify,
}: {
  data: Workspace;
  locale: "it" | "en";
  setLocale: (locale: "it" | "en") => void;
  reload: () => Promise<void>;
  notify: (v: string) => void;
}) {
  const [school, setSchool] = useState(data.settings?.school_name || "");
  const [loginTitleIt, setLoginTitleIt] = useState(
    data.settings?.login_title_it || "",
  );
  const [loginSubtitleIt, setLoginSubtitleIt] = useState(
    data.settings?.login_subtitle_it || "",
  );
  const [loginTitleEn, setLoginTitleEn] = useState(
    data.settings?.login_title_en || "",
  );
  const [loginSubtitleEn, setLoginSubtitleEn] = useState(
    data.settings?.login_subtitle_en || "",
  );
  const [ai, setAi] = useState(data.profile.external_ai_enabled);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (data.profile.role === "teacher") {
      const result = await supabase
        .from("app_settings")
        .update({
          school_name: school.trim(),
          login_title_it: loginTitleIt.trim(),
          login_subtitle_it: loginSubtitleIt.trim(),
          login_title_en: loginTitleEn.trim(),
          login_subtitle_en: loginSubtitleEn.trim(),
        })
        .eq("singleton", true);
      if (result.error) return notify(result.error.message);
    }
    const result = await supabase
      .from("profiles")
      .update({
        external_ai_enabled: ai,
        external_ai_consented_at: ai ? new Date().toISOString() : null,
      })
      .eq("id", data.profile.id);
    if (result.error) return notify(result.error.message);
    await reload();
    notify("Impostazioni salvate");
  }
  return (
    <section className="panel settings-panel">
      <div className="settings-icon">
        <Icon name="privacy_tip" />
      </div>
      <div>
        <p className="eyebrow">CONFIGURAZIONE DAL DATABASE</p>
        <h3>Impostazioni</h3>
        <form onSubmit={(e) => void save(e)}>
          <fieldset className="settings-section language-settings">
            <legend>Lingua dell’interfaccia</legend>
            <label htmlFor="settings-language">
              <span>
                <Icon name="language" /> Lingua
              </span>
              <select
                id="settings-language"
                aria-label="Language"
                value={locale}
                onChange={(event) =>
                  setLocale(event.target.value as "it" | "en")
                }
              >
                <option value="it">Italiano</option>
                <option value="en">English</option>
              </select>
            </label>
            <small>La modifica viene applicata immediatamente.</small>
          </fieldset>
          {data.profile.role === "teacher" && (
            <>
              <label>
                Nome della scuola
                <input
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  required
                />
              </label>
              <fieldset className="settings-branding-fields">
                <legend>Testi della pagina di accesso</legend>
                <label>
                  Titolo (italiano)
                  <input
                    value={loginTitleIt}
                    onChange={(event) => setLoginTitleIt(event.target.value)}
                    minLength={5}
                    maxLength={120}
                    required
                  />
                </label>
                <label>
                  <span className="field-label-row">
                    Sottotitolo (italiano)
                    <small aria-hidden="true">
                      {loginSubtitleIt.length}/240
                    </small>
                  </span>
                  <textarea
                    value={loginSubtitleIt}
                    onChange={(event) => setLoginSubtitleIt(event.target.value)}
                    minLength={5}
                    maxLength={240}
                    required
                    rows={4}
                    placeholder="Descrivi in modo breve lo spazio didattico."
                  />
                </label>
                <label>
                  Titolo (inglese)
                  <input
                    value={loginTitleEn}
                    onChange={(event) => setLoginTitleEn(event.target.value)}
                    minLength={5}
                    maxLength={120}
                    required
                  />
                </label>
                <label>
                  <span className="field-label-row">
                    Sottotitolo (inglese)
                    <small aria-hidden="true">
                      {loginSubtitleEn.length}/240
                    </small>
                  </span>
                  <textarea
                    value={loginSubtitleEn}
                    onChange={(event) => setLoginSubtitleEn(event.target.value)}
                    minLength={5}
                    maxLength={240}
                    required
                    rows={4}
                    placeholder="Briefly describe the learning environment."
                  />
                </label>
              </fieldset>
              {supabaseStudioUrl && (
                <section
                  className="settings-section administration-settings"
                  aria-labelledby="administration-title"
                >
                  <div>
                    <span className="settings-section-icon">
                      <Icon name="database" />
                    </span>
                    <div>
                      <strong id="administration-title">
                        Amministrazione tecnica
                      </strong>
                      <small>
                        Accesso separato agli strumenti locali di Supabase,
                        disponibile esclusivamente al docente.
                      </small>
                    </div>
                  </div>
                  <a
                    className="settings-admin-link"
                    href={supabaseStudioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Apri amministrazione Supabase
                    <Icon name="open_in_new" />
                  </a>
                </section>
              )}
            </>
          )}
          <fieldset className="settings-section puter-consent">
            <legend>Funzioni IA esterne</legend>
            <label className="consent-switch">
              <input
                type="checkbox"
                checked={ai}
                onChange={(e) => setAi(e.target.checked)}
              />
              <span className="switch-track" aria-hidden="true">
                <span />
              </span>
              <span className="consent-copy">
                <strong>Consenti l’invio di dati a Puter</strong>
                <small>
                  Prompt, errori e codice vengono inviati esclusivamente quando
                  utilizzi volontariamente le funzioni IA.
                </small>
              </span>
            </label>
            <p className="consent-privacy-note">
              <Icon name="shield" /> Il consenso è facoltativo, registrato nel
              database e revocabile in ogni momento.
            </p>
          </fieldset>
          <button className="primary">Salva impostazioni</button>
        </form>
      </div>
    </section>
  );
}

function Editor({
  exercise,
  data,
  reload,
  notify,
}: {
  exercise: Exercise;
  data: Workspace;
  reload: () => Promise<void>;
  notify: (v: string) => void;
}) {
  const assignment = data.assignments.find(
    (a) => a.exercise_id === exercise.id,
  );
  const existing = assignment
    ? data.submissions.find(
        (s) =>
          s.class_assignment_id === assignment.id &&
          s.student_id === data.profile.id,
      )
    : undefined;
  const tests = data.tests.filter((t) => t.exercise_id === exercise.id);
  const [code, setCode] = useState(existing?.code || exercise.starter_code);
  const [output, setOutput] = useState("Pronto.");
  const [running, setRunning] = useState(false);
  const [passed, setPassed] = useState(0);
  const [activeTab, setActiveTab] = useState<"brief" | "code">("brief");
  const workerRef = useRef<Worker | null>(null);
  useEffect(() => () => workerRef.current?.terminate(), []);
  useStudentDraft({
    assignment,
    studentId: data.profile.id,
    enabled: data.profile.role === "student",
    code,
    setCode,
    notify,
  });
  function run(mode: "run_interactive" | "test") {
    workerRef.current?.terminate();
    const worker = new Worker("/pyodide-worker.js");
    workerRef.current = worker;
    setRunning(true);
    setOutput(mode === "test" ? "Esecuzione test…" : "Esecuzione…");
    const timer = setTimeout(() => {
      worker.terminate();
      setRunning(false);
      setOutput("Esecuzione interrotta dopo 8 secondi.");
    }, 8000);
    worker.onmessage = (e) => {
      clearTimeout(timer);
      setRunning(false);
      if (!e.data.ok) setOutput(`Errore:\n${e.data.error}`);
      else if (mode === "test") {
        setPassed(e.data.tests.passed);
        setOutput(
          `${e.data.tests.passed} test su ${e.data.tests.total} superati.`,
        );
      } else setOutput(e.data.output || "(nessun output)");
      worker.terminate();
    };
    worker.postMessage({
      code,
      mode,
      inputs: [],
      tests: tests.map((t) => ({
        input: t.input_data,
        expected: t.expected_output,
      })),
    });
  }
  async function submit() {
    if (!supabase || !assignment || data.profile.role !== "student") return;
    if (
      exercise.verification_mode === "tests" &&
      (!tests.length || passed !== tests.length)
    )
      return notify("Supera tutti i test prima della consegna");
    const now = new Date().toISOString();
    const draft = await supabase
      .from("submissions")
      .upsert(
        {
          class_assignment_id: assignment.id,
          student_id: data.profile.id,
          code,
          status: "draft",
          score: null,
          test_results: [],
          submitted_at: null,
          updated_by: data.profile.id,
          updated_at: now,
        },
        { onConflict: "class_assignment_id,student_id" },
      )
      .select("id")
      .single();
    if (draft.error) return notify(draft.error.message);
    const result = await supabase
      .from("submissions")
      .update({
        code,
        status: "submitted",
        score: null,
        submitted_at: now,
        updated_by: data.profile.id,
        updated_at: now,
      })
      .eq("id", draft.data.id);
    if (result.error) return notify(result.error.message);
    await reload();
    notify("Soluzione consegnata");
  }
  return (
    <div className="editor-layout exercise-workbench">
      <button className="back workbench-back" onClick={() => history.back()}>
        <Icon name="arrow_back" /> Torna ai compiti
      </button>
      <header className="workbench-header">
        <div>
          <p className="eyebrow">ESERCIZIO PYTHON</p>
          <h2>{exercise.title}</h2>
          <div className="workbench-meta">
            <span>
              <Icon name="event" />
              {assignment?.deadline
                ? `Scadenza ${formatDate(assignment.deadline)}`
                : "Nessuna scadenza"}
            </span>
            <span>
              <Icon name="science" /> {tests.length} test automatici
            </span>
            <span>
              <Icon name="workspace_premium" /> {exercise.max_points} punti
            </span>
          </div>
        </div>
        <span className="workbench-save-state">
          <Icon name="cloud_done" /> Salvataggio automatico attivo
        </span>
      </header>
      <div
        className="workbench-tabs"
        role="tablist"
        aria-label="Contenuto esercizio"
      >
        <button
          role="tab"
          aria-selected={activeTab === "brief"}
          aria-controls="exercise-brief-panel"
          className={activeTab === "brief" ? "active" : ""}
          onClick={() => setActiveTab("brief")}
        >
          <Icon name="description" /> Traccia
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "code"}
          aria-controls="exercise-code-panel"
          className={activeTab === "code" ? "active" : ""}
          onClick={() => setActiveTab("code")}
        >
          <Icon name="code" /> Editor e codice
        </button>
      </div>
      <section
        className="brief workbench-panel"
        id="exercise-brief-panel"
        role="tabpanel"
        hidden={activeTab !== "brief"}
      >
        <Suspense fallback={<p>{exercise.description}</p>}>
          <MarkdownContent>{exercise.description}</MarkdownContent>
        </Suspense>
        {exercise.resource_url && (
          <a
            className="exercise-resource"
            href={exercise.resource_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon
              name={
                exercise.resource_url.includes("youtu") ? "play_circle" : "link"
              }
            />
            {exercise.resource_label || "Risorsa esterna"}
          </a>
        )}
        {exercise.constraints && (
          <>
            <h4>Vincoli</h4>
            <p>{exercise.constraints}</p>
          </>
        )}
        <div className="test-count">
          <strong>
            {exercise.verification_mode === "ai" ? "IA" : tests.length}
          </strong>
          <span>
            {exercise.verification_mode === "ai"
              ? "verifica semantica"
              : "test automatici"}
            <br />
            {exercise.max_points} punti
          </span>
        </div>
        <button
          className="primary brief-next"
          onClick={() => setActiveTab("code")}
        >
          Apri l’editor <Icon name="arrow_forward" />
        </button>
      </section>
      <section
        className="workspace workbench-panel"
        id="exercise-code-panel"
        role="tabpanel"
        hidden={activeTab !== "code"}
      >
        <div className="editor-toolbar professional-toolbar">
          <span>
            <Icon name="code" /> main.py
          </span>
          <span>Python nel browser · modifiche salvate automaticamente</span>
        </div>
        <Suspense
          fallback={<div className="editor-loading">Caricamento editor…</div>}
        >
          <PythonEditor value={code} onChange={setCode} />
        </Suspense>
        <div className="console professional-console">
          <header>
            <span>
              <Icon name="terminal" /> Output
            </span>
            <small>{running ? "Esecuzione in corso…" : "Pronto"}</small>
          </header>
          <pre aria-live="polite">{output}</pre>
        </div>
        <div className="runbar professional-runbar">
          <div>
            <button
              className="secondary"
              onClick={() => run("run_interactive")}
              disabled={running}
            >
              <Icon name="play_arrow" /> Esegui
            </button>
            {exercise.verification_mode === "tests" && (
              <button
                className="secondary"
                onClick={() => run("test")}
                disabled={running}
              >
                <Icon name="science" /> Test
              </button>
            )}
          </div>
          <button
            className="primary"
            onClick={() => void submit()}
            disabled={running || data.profile.role !== "student" || !assignment}
          >
            <Icon name="send" /> Consegna soluzione
          </button>
        </div>
      </section>
    </div>
  );
}
