"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Submission, SubmissionStatus, Workspace } from "../lib/types";
import { scoreAsPercentage, validScore } from "../lib/learning-path.mjs";
import { useLocale } from "../lib/i18n";
import { PythonCodeBlock } from "./python-code-block";
import { getStudentOverviewWithAi } from "../lib/ai-feedback";

const statusLabels = {
  it: {
    draft: "In lavorazione",
    submitted: "Da valutare",
    passed: "Superato",
    partial: "Parzialmente superato",
    failed: "Da rivedere",
  },
  en: {
    draft: "In progress",
    submitted: "Awaiting review",
    passed: "Passed",
    partial: "Partially passed",
    failed: "Needs revision",
  },
} as const;

type ReportStatus = "all" | "unopened" | Exclude<SubmissionStatus, "draft">;
type DeliverySort = "student" | "assigned" | "opened" | "completed";
type ReportSection =
  | "evaluations"
  | "progress"
  | "classes"
  | "alerts"
  | "student";
const PAGE_SIZE = 25;

export function ReportV2({
  data,
  reload,
  notify,
  section: routeSection,
  selectedStudentId,
  onStudentChange,
  onSectionChange,
}: {
  data: Workspace;
  reload: () => Promise<void>;
  notify: (message: string) => void;
  section: Exclude<ReportSection, "student">;
  selectedStudentId: string | null;
  onStudentChange: (studentId: string | null) => void;
  onSectionChange: (
    section:
      | "report-evaluations"
      | "report-progress"
      | "report-classes"
      | "report-alerts",
  ) => void;
}) {
  const { locale } = useLocale();
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<ReportStatus>("all");
  const [query, setQuery] = useState("");
  const [deliverySort, setDeliverySort] = useState<DeliverySort>("student");
  const [deliveryDirection, setDeliveryDirection] = useState<"asc" | "desc">(
    "asc",
  );
  const section: ReportSection = selectedStudentId ? "student" : routeSection;
  const [summaryPage, setSummaryPage] = useState(1);
  const [evaluationPage, setEvaluationPage] = useState(1);
  const submissions = data.submissions.filter(
    (item) => item.status !== "draft",
  );
  const normalizedScores = submissions.flatMap((item) => {
    const assignment = data.assignments.find(
      (candidate) => candidate.id === item.class_assignment_id,
    );
    const percentage = scoreAsPercentage(item.score, assignment?.grading_scale);
    return percentage === null ? [] : [percentage];
  });
  const average = normalizedScores.length
    ? Math.round(
        normalizedScores.reduce((sum, item) => sum + item, 0) /
          normalizedScores.length,
      )
    : null;
  const waiting = submissions.filter(
    (item) => item.status === "submitted",
  ).length;
  const reviewed = submissions.length - waiting;
  const visibleSubmissions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return submissions.filter((submission) => {
      const assignment = data.assignments.find(
        (item) => item.id === submission.class_assignment_id,
      );
      const exercise = data.exercises.find(
        (item) => item.id === assignment?.exercise_id,
      );
      const student = data.profiles.find(
        (item) => item.id === submission.student_id,
      );
      return (
        (classFilter === "all" || assignment?.class_id === classFilter) &&
        (statusFilter === "all" || submission.status === statusFilter) &&
        (!normalizedQuery ||
          `${student?.full_name || ""} ${student?.email || ""} ${exercise?.title || ""}`
            .toLocaleLowerCase()
            .includes(normalizedQuery))
      );
    });
  }, [classFilter, data, query, statusFilter, submissions]);
  const assignmentPairs = useMemo(
    () =>
      data.assignments.flatMap((assignment) =>
        data.memberships
          .filter((membership) => membership.class_id === assignment.class_id)
          .map((membership) => ({
            assignment,
            studentId: membership.student_id,
          })),
      ),
    [data.assignments, data.memberships],
  );
  const unopenedPairs = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (statusFilter !== "all" && statusFilter !== "unopened") return [];
    return assignmentPairs.filter(({ assignment, studentId }) => {
      const viewed = data.assignmentViews.some(
        (view) =>
          view.class_assignment_id === assignment.id &&
          view.student_id === studentId,
      );
      const submission = data.submissions.some(
        (item) =>
          item.class_assignment_id === assignment.id &&
          item.student_id === studentId,
      );
      const student = data.profiles.find((item) => item.id === studentId);
      const exercise = data.exercises.find(
        (item) => item.id === assignment.exercise_id,
      );
      return (
        !viewed &&
        !submission &&
        (classFilter === "all" || assignment.class_id === classFilter) &&
        (!normalizedQuery ||
          `${student?.full_name || ""} ${student?.email || ""} ${exercise?.title || ""}`
            .toLocaleLowerCase()
            .includes(normalizedQuery))
      );
    });
  }, [assignmentPairs, classFilter, data, query, statusFilter]);
  const deliveryRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const students = new Map<
      string,
      { studentId: string; assigned: number; opened: number; completed: number }
    >();
    assignmentPairs
      .filter(
        ({ assignment }) =>
          classFilter === "all" || assignment.class_id === classFilter,
      )
      .forEach(({ assignment, studentId }) => {
        const row = students.get(studentId) || {
          studentId,
          assigned: 0,
          opened: 0,
          completed: 0,
        };
        row.assigned += 1;
        if (
          data.assignmentViews.some(
            (view) =>
              view.class_assignment_id === assignment.id &&
              view.student_id === studentId,
          ) ||
          data.submissions.some(
            (submission) =>
              submission.class_assignment_id === assignment.id &&
              submission.student_id === studentId,
          )
        )
          row.opened += 1;
        if (
          data.submissions.some(
            (submission) =>
              submission.class_assignment_id === assignment.id &&
              submission.student_id === studentId &&
              submission.status !== "draft",
          )
        )
          row.completed += 1;
        students.set(studentId, row);
      });
    const name = (studentId: string) => {
      const profile = data.profiles.find((item) => item.id === studentId);
      return profile?.full_name || profile?.email || "Studente";
    };
    return [...students.values()]
      .filter((row) =>
        name(row.studentId).toLocaleLowerCase().includes(normalizedQuery),
      )
      .sort((left, right) => {
        const factor = deliveryDirection === "asc" ? 1 : -1;
        const result =
          deliverySort === "student"
            ? name(left.studentId).localeCompare(name(right.studentId), "it")
            : left[deliverySort] - right[deliverySort];
        return result * factor;
      });
  }, [
    assignmentPairs,
    classFilter,
    data,
    deliveryDirection,
    deliverySort,
    query,
  ]);
  function sortDeliveries(sort: DeliverySort) {
    if (deliverySort === sort)
      setDeliveryDirection((direction) =>
        direction === "asc" ? "desc" : "asc",
      );
    else {
      setDeliverySort(sort);
      setDeliveryDirection(sort === "student" ? "asc" : "desc");
    }
  }
  const evaluationItems = [
    ...visibleSubmissions.map((submission) => ({
      kind: "submission" as const,
      submission,
    })),
    ...unopenedPairs.map((pair) => ({ kind: "unopened" as const, ...pair })),
  ];
  const safeSummaryPage = Math.min(
    summaryPage,
    Math.max(1, Math.ceil(deliveryRows.length / PAGE_SIZE)),
  );
  const safeEvaluationPage = Math.min(
    evaluationPage,
    Math.max(1, Math.ceil(evaluationItems.length / PAGE_SIZE)),
  );
  const pagedDeliveries = deliveryRows.slice(
    (safeSummaryPage - 1) * PAGE_SIZE,
    safeSummaryPage * PAGE_SIZE,
  );
  const pagedEvaluations = evaluationItems.slice(
    (safeEvaluationPage - 1) * PAGE_SIZE,
    safeEvaluationPage * PAGE_SIZE,
  );
  function openStudent(studentId: string) {
    onStudentChange(studentId);
  }

  return (
    <section className="report-page">
      {data.profile.role === "teacher" && (
        <nav className="report-section-nav" aria-label="Sezioni report">
          {(
            [
              [
                "report-evaluations",
                "fact_check",
                "Valutazioni",
                "Consegne e voti",
              ],
              [
                "report-progress",
                "trending_up",
                "Avanzamento",
                "Aperture e completamento",
              ],
              ["report-classes", "school", "Per classe", "Metriche aggregate"],
              [
                "report-alerts",
                "notification_important",
                "Alert",
                "Studenti da attenzionare",
              ],
            ] as const
          ).map(([target, icon, label, description]) => {
            const active =
              routeSection ===
              (
                {
                  "report-evaluations": "evaluations",
                  "report-progress": "progress",
                  "report-classes": "classes",
                  "report-alerts": "alerts",
                } as const
              )[target];
            return (
              <button
                key={target}
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
                onClick={() => onSectionChange(target)}
              >
                <span className="material-symbols-rounded" aria-hidden="true">
                  {icon}
                </span>
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
              </button>
            );
          })}
        </nav>
      )}
      <div className="report-overview panel">
        <div className="report-title-row">
          <div>
            <p className="eyebrow">DATI DELLE CONSEGNE</p>
            <h2>Report</h2>
            <p>
              {data.profile.role === "teacher"
                ? "Valuta le consegne e individua rapidamente ciò che richiede attenzione."
                : "Consulta lo stato e la valutazione dei compiti consegnati."}
            </p>
          </div>
          <span className="report-total">
            <strong>{submissions.length}</strong>
            <small>consegne</small>
          </span>
        </div>
        <div className="report-summary">
          {data.profile.role === "teacher" && (
            <>
              <article className="report-metric attention">
                <span className="material-symbols-rounded" aria-hidden="true">
                  pending_actions
                </span>
                <div>
                  <strong>{waiting}</strong>
                  <small>Da valutare</small>
                </div>
              </article>
              <article className="report-metric">
                <span className="material-symbols-rounded" aria-hidden="true">
                  task_alt
                </span>
                <div>
                  <strong>{reviewed}</strong>
                  <small>Valutate</small>
                </div>
              </article>
            </>
          )}
          <article className="report-metric">
            <span className="material-symbols-rounded" aria-hidden="true">
              monitoring
            </span>
            <div>
              <strong>{average === null ? "—" : `${average}%`}</strong>
              <small>Media dei compiti con voto</small>
            </div>
          </article>
        </div>
      </div>

      {data.profile.role === "teacher" && section === "progress" && (
        <section
          className="report-results panel"
          aria-labelledby="delivery-summary-title"
        >
          <div className="panel-head">
            <div>
              <p className="eyebrow">CONSEGNE</p>
              <h3 id="delivery-summary-title">Avanzamento per studente</h3>
            </div>
            <span className="result-count">{deliveryRows.length} studenti</span>
          </div>
          <div
            className="report-toolbar progress-toolbar"
            aria-label="Filtri avanzamento"
          >
            <label className="report-search">
              <span className="material-symbols-rounded" aria-hidden="true">
                search
              </span>
              <input
                aria-label="Cerca studente nell'avanzamento"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cerca studente"
              />
            </label>
            <label>
              <span>Classe</span>
              <select
                aria-label="Filtra avanzamento per classe"
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value)}
              >
                <option value="all">Tutte le classi</option>
                {data.classes.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="delivery-summary-table table">
            <div className="table-row table-head">
              {(
                ["student", "assigned", "opened", "completed"] as DeliverySort[]
              ).map((column) => (
                <button
                  type="button"
                  key={column}
                  onClick={() => sortDeliveries(column)}
                  aria-label={`Ordina per ${{ student: "studente", assigned: "assegnati", opened: "aperti", completed: "svolti" }[column]}`}
                >
                  {
                    {
                      student: "Studente",
                      assigned: "Assegnati",
                      opened: "Aperti",
                      completed: "Svolti",
                    }[column]
                  }
                  <span className="material-symbols-rounded" aria-hidden="true">
                    swap_vert
                  </span>
                </button>
              ))}
            </div>
            {pagedDeliveries.map((row) => {
              const student = data.profiles.find(
                (item) => item.id === row.studentId,
              );
              return (
                <div className="table-row" key={row.studentId}>
                  <button
                    className="report-student student-detail-link"
                    onClick={() => openStudent(row.studentId)}
                  >
                    <strong>{student?.full_name || student?.email}</strong>
                    <small>{student?.email}</small>
                  </button>
                  <span>{row.assigned}</span>
                  <span>
                    <strong>
                      {row.assigned
                        ? Math.round((row.opened / row.assigned) * 100)
                        : 0}
                      %
                    </strong>
                    <small>
                      {row.opened} di {row.assigned}
                    </small>
                  </span>
                  <span>
                    <strong>
                      {row.assigned
                        ? Math.round((row.completed / row.assigned) * 100)
                        : 0}
                      %
                    </strong>
                    <small>
                      {row.completed} di {row.assigned}
                    </small>
                  </span>
                </div>
              );
            })}
          </div>
          <Pagination
            page={safeSummaryPage}
            total={deliveryRows.length}
            onChange={setSummaryPage}
          />
        </section>
      )}

      {(data.profile.role === "student" || section === "evaluations") && (
        <section
          className="report-results panel"
          aria-labelledby="report-results-title"
        >
          <div className="panel-head">
            <div>
              <p className="eyebrow">CONSEGNE</p>
              <h3 id="report-results-title">
                {data.profile.role === "teacher"
                  ? "Valutazioni"
                  : "I tuoi risultati"}
              </h3>
            </div>
            {data.profile.role === "teacher" && (
              <span className="result-count">
                {visibleSubmissions.length + unopenedPairs.length} risultati
              </span>
            )}
          </div>

          {data.profile.role === "teacher" && (
            <div className="report-toolbar" aria-label="Filtri report">
              <label className="report-search">
                <span className="material-symbols-rounded" aria-hidden="true">
                  search
                </span>
                <input
                  aria-label="Cerca studente o esercizio"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cerca studente o esercizio"
                />
              </label>
              <label>
                <span>Classe</span>
                <select
                  aria-label="Filtra report per classe"
                  value={classFilter}
                  onChange={(event) => setClassFilter(event.target.value)}
                >
                  <option value="all">Tutte le classi</option>
                  {data.classes.map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Stato</span>
                <select
                  aria-label="Filtra report per stato"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as ReportStatus)
                  }
                >
                  <option value="all">Tutti gli stati</option>
                  <option value="unopened">Non aperto</option>
                  <option value="submitted">Da valutare</option>
                  <option value="passed">Superato</option>
                  <option value="partial">Parziale</option>
                  <option value="failed">Da rivedere</option>
                </select>
              </label>
            </div>
          )}

          <div
            className={`table${data.profile.role === "student" ? " student-report-table" : " teacher-report-table"}`}
          >
            <div className="table-row table-head">
              {data.profile.role === "teacher" && <span>Studente</span>}
              <span>Esercizio</span>
              {data.profile.role === "teacher" && <span>Classe</span>}
              <span>Stato</span>
              <span>Valutazione</span>
              {data.profile.role === "teacher" && <span>Azioni</span>}
            </div>
            {pagedEvaluations.map((item) =>
              item.kind === "submission" ? (
                <ReviewRow
                  key={item.submission.id}
                  submission={item.submission}
                  locale={locale}
                  data={data}
                  reload={reload}
                  notify={notify}
                  openStudent={openStudent}
                />
              ) : (
                (() => {
                  const { assignment, studentId } = item;
                  const student = data.profiles.find(
                    (item) => item.id === studentId,
                  );
                  const exercise = data.exercises.find(
                    (item) => item.id === assignment.exercise_id,
                  );
                  const classroom = data.classes.find(
                    (item) => item.id === assignment.class_id,
                  );
                  return (
                    <div
                      className="table-row"
                      key={`unopened:${assignment.id}:${studentId}`}
                    >
                      <button
                        className="report-student student-detail-link"
                        onClick={() => openStudent(studentId)}
                      >
                        <strong>{student?.full_name || student?.email}</strong>
                        <small>{student?.email}</small>
                      </button>
                      <span className="report-exercise">{exercise?.title}</span>
                      <span>{classroom?.name || "—"}</span>
                      <span className="submission-status status-unopened">
                        Non aperto
                      </span>
                      <span className="ungraded-label">—</span>
                      <span />
                    </div>
                  );
                })()
              ),
            )}
          </div>
          <Pagination
            page={safeEvaluationPage}
            total={evaluationItems.length}
            onChange={setEvaluationPage}
          />
          {!visibleSubmissions.length && !unopenedPairs.length && (
            <p className="empty-state">
              {submissions.length
                ? "Nessuna consegna corrisponde ai filtri selezionati."
                : "Nessuna consegna disponibile."}
            </p>
          )}
        </section>
      )}
      {data.profile.role === "teacher" && section === "classes" && (
        <ClassReports data={data} />
      )}
      {data.profile.role === "teacher" && section === "alerts" && (
        <ReportAlerts data={data} openStudent={openStudent} />
      )}
      {data.profile.role === "teacher" &&
        section === "student" &&
        selectedStudentId && (
          <StudentReportDetail
            data={data}
            studentId={selectedStudentId}
            onBack={() => onStudentChange(null)}
          />
        )}
    </section>
  );
}

function Pagination({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  return (
    <nav className="table-pagination" aria-label="Paginazione tabella">
      <button
        className="pagination-button"
        aria-label="Pagina precedente"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <span className="material-symbols-rounded" aria-hidden="true">
          chevron_left
        </span>
      </button>
      <span>
        Pagina {page} di {pages}
      </span>
      <button
        className="pagination-button"
        aria-label="Pagina successiva"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        <span className="material-symbols-rounded" aria-hidden="true">
          chevron_right
        </span>
      </button>
    </nav>
  );
}

function ClassReports({ data }: { data: Workspace }) {
  return (
    <section className="report-results panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">REPORT PER CLASSE</p>
          <h3>Metriche delle classi</h3>
        </div>
      </div>
      <div className="class-report-grid">
        {data.classes.map((classroom) => {
          const members = data.memberships.filter(
            (item) => item.class_id === classroom.id,
          );
          const assignments = data.assignments.filter(
            (item) => item.class_id === classroom.id,
          );
          const pairs = members.length * assignments.length;
          const submitted = data.submissions.filter(
            (submission) =>
              assignments.some(
                (assignment) =>
                  assignment.id === submission.class_assignment_id,
              ) && submission.status !== "draft",
          );
          const opened = data.assignmentViews.filter((view) =>
            assignments.some(
              (assignment) => assignment.id === view.class_assignment_id,
            ),
          );
          const scores = submitted.flatMap((submission) => {
            const assignment = assignments.find(
              (item) => item.id === submission.class_assignment_id,
            );
            const value = scoreAsPercentage(
              submission.score,
              assignment?.grading_scale,
            );
            return value === null ? [] : [value];
          });
          return (
            <article className="class-report-card" key={classroom.id}>
              <header>
                <div>
                  <strong>{classroom.name}</strong>
                  <small>{classroom.subject}</small>
                </div>
                <span>{members.length} studenti</span>
              </header>
              <div>
                <span>
                  <strong>{assignments.length}</strong>
                  <small>Esercizi</small>
                </span>
                <span>
                  <strong>
                    {pairs ? Math.round((opened.length / pairs) * 100) : 0}%
                  </strong>
                  <small>Apertura</small>
                </span>
                <span>
                  <strong>
                    {pairs ? Math.round((submitted.length / pairs) * 100) : 0}%
                  </strong>
                  <small>Consegna</small>
                </span>
                <span>
                  <strong>
                    {scores.length
                      ? Math.round(
                          scores.reduce((sum, value) => sum + value, 0) /
                            scores.length,
                        )
                      : "—"}
                    {scores.length ? "%" : ""}
                  </strong>
                  <small>Media</small>
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ReportAlerts({
  data,
  openStudent,
}: {
  data: Workspace;
  openStudent: (id: string) => void;
}) {
  const [now] = useState(() => Date.now());
  const rows = data.profiles
    .filter((profile) => profile.role === "student")
    .map((student) => {
      const classIds = data.memberships
        .filter((item) => item.student_id === student.id)
        .map((item) => item.class_id);
      const assignments = data.assignments.filter((item) =>
        classIds.includes(item.class_id),
      );
      const overdue = assignments.filter(
        (assignment) =>
          assignment.deadline &&
          new Date(assignment.deadline).getTime() < now &&
          !data.submissions.some(
            (submission) =>
              submission.student_id === student.id &&
              submission.class_assignment_id === assignment.id &&
              submission.status !== "draft",
          ),
      ).length;
      const inactiveDays = student.last_seen_at
        ? Math.floor(
            (now - new Date(student.last_seen_at).getTime()) / 86_400_000,
          )
        : null;
      const unopened = assignments.filter(
        (assignment) =>
          !data.assignmentViews.some(
            (view) =>
              view.student_id === student.id &&
              view.class_assignment_id === assignment.id,
          ) &&
          !data.submissions.some(
            (submission) =>
              submission.student_id === student.id &&
              submission.class_assignment_id === assignment.id,
          ),
      ).length;
      return { student, overdue, inactiveDays, unopened };
    })
    .filter(
      (row) =>
        row.overdue >= 2 ||
        row.unopened >= 3 ||
        row.inactiveDays === null ||
        row.inactiveDays >= 14,
    )
    .sort((a, b) => b.overdue - a.overdue || b.unopened - a.unopened);
  return (
    <section className="report-results panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">ALERT</p>
          <h3>Studenti da attenzionare</h3>
          <p className="quiet">
            Indicatori orientativi basati su scadenze, aperture e ultimo
            accesso.
          </p>
        </div>
        <span className="result-count">{rows.length} alert</span>
      </div>
      <div className="alert-list">
        {rows.map((row) => (
          <article className="student-alert" key={row.student.id}>
            <button onClick={() => openStudent(row.student.id)}>
              <strong>{row.student.full_name || row.student.email}</strong>
              <small>{row.student.email}</small>
            </button>
            <div>
              {row.overdue >= 2 && (
                <span className="alert-chip danger">
                  {row.overdue} compiti scaduti
                </span>
              )}
              {row.unopened >= 3 && (
                <span className="alert-chip">{row.unopened} non aperti</span>
              )}
              {(row.inactiveDays === null || row.inactiveDays >= 14) && (
                <span className="alert-chip">
                  {row.inactiveDays === null
                    ? "Mai connesso"
                    : `${row.inactiveDays} giorni dall’accesso`}
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
      {!rows.length && (
        <p className="empty-state">
          Nessuno studente supera le soglie di attenzione.
        </p>
      )}
    </section>
  );
}

function StudentReportDetail({
  data,
  studentId,
  onBack,
}: {
  data: Workspace;
  studentId: string;
  onBack: () => void;
}) {
  const student = data.profiles.find((item) => item.id === studentId);
  const classIds = data.memberships
    .filter((item) => item.student_id === studentId)
    .map((item) => item.class_id);
  const assignments = data.assignments.filter((item) =>
    classIds.includes(item.class_id),
  );
  const submissions = data.submissions.filter(
    (item) => item.student_id === studentId,
  );
  const completed = submissions.filter((item) => item.status !== "draft");
  const opened = assignments.filter(
    (assignment) =>
      data.assignmentViews.some(
        (view) =>
          view.student_id === studentId &&
          view.class_assignment_id === assignment.id,
      ) ||
      submissions.some(
        (submission) => submission.class_assignment_id === assignment.id,
      ),
  ).length;
  const scores = completed.flatMap((submission) => {
    const assignment = assignments.find(
      (item) => item.id === submission.class_assignment_id,
    );
    const score = scoreAsPercentage(
      submission.score,
      assignment?.grading_scale,
    );
    return score === null ? [] : [score];
  });
  const scoreAverage = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;
  const [overview, setOverview] = useState(
    data.profile.external_ai_enabled ? "Generazione overview…" : "",
  );
  useEffect(() => {
    if (!data.profile.external_ai_enabled) return;
    void getStudentOverviewWithAi(
      `Esercizi assegnati: ${assignments.length}; aperti: ${opened}; consegnati: ${completed.length}; media percentuale: ${scoreAverage ?? "non disponibile"}; ultimo accesso: ${student?.last_seen_at || "mai"}.`,
      true,
    ).then(setOverview);
  }, [
    assignments.length,
    completed.length,
    data.profile.external_ai_enabled,
    opened,
    scoreAverage,
    student?.last_seen_at,
  ]);
  return (
    <section className="student-report-detail panel">
      <button className="back" onClick={onBack}>
        ← Torna ai report
      </button>
      <header>
        <div>
          <p className="eyebrow">DETTAGLIO STUDENTE</p>
          <h2>{student?.full_name || student?.email}</h2>
          <p>{student?.email}</p>
        </div>
        <span className="last-access">
          Ultimo accesso
          <strong>
            {student?.last_seen_at
              ? new Date(student.last_seen_at).toLocaleString("it-IT")
              : "Mai"}
          </strong>
        </span>
      </header>
      <div className="student-detail-metrics">
        <article>
          <strong>{assignments.length}</strong>
          <small>Assegnati</small>
        </article>
        <article>
          <strong>{opened}</strong>
          <small>Aperti</small>
        </article>
        <article>
          <strong>{completed.length}</strong>
          <small>Consegnati</small>
        </article>
        <article>
          <strong>
            {scores.length
              ? `${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}%`
              : "—"}
          </strong>
          <small>Media</small>
        </article>
      </div>
      {data.profile.external_ai_enabled && (
        <aside className="ai-student-overview">
          <span className="material-symbols-rounded">auto_awesome</span>
          <div>
            <strong>Overview IA</strong>
            <p>{overview}</p>
          </div>
        </aside>
      )}
      <div className="student-detail-classes">
        <h3>Classi</h3>
        <p>
          {data.classes
            .filter((item) => classIds.includes(item.id))
            .map((item) => item.name)
            .join(", ") || "Nessuna classe"}
        </p>
      </div>
      <div className="table teacher-report-table">
        <div className="table-row table-head">
          <span>Esercizio</span>
          <span>Classe</span>
          <span>Stato</span>
          <span>Valutazione</span>
          <span />
          <span />
        </div>
        {assignments.map((assignment) => {
          const exercise = data.exercises.find(
            (item) => item.id === assignment.exercise_id,
          );
          const classroom = data.classes.find(
            (item) => item.id === assignment.class_id,
          );
          const submission = submissions.find(
            (item) => item.class_assignment_id === assignment.id,
          );
          const viewed =
            data.assignmentViews.some(
              (view) =>
                view.student_id === studentId &&
                view.class_assignment_id === assignment.id,
            ) || Boolean(submission);
          return (
            <div className="table-row" key={assignment.id}>
              <span>{exercise?.title}</span>
              <span>{classroom?.name}</span>
              <span
                className={`submission-status ${!viewed ? "status-unopened" : ""}`}
              >
                {!viewed
                  ? "Non aperto"
                  : submission
                    ? statusLabels.it[submission.status]
                    : "Aperto"}
              </span>
              <span>{submission?.score ?? "—"}</span>
              <span />
              <span />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReviewRow({
  submission,
  locale,
  data,
  reload,
  notify,
  openStudent,
}: {
  submission: Submission;
  locale: "it" | "en";
  data: Workspace;
  reload: () => Promise<void>;
  notify: (message: string) => void;
  openStudent: (studentId: string) => void;
}) {
  const assignment = data.assignments.find(
    (item) => item.id === submission.class_assignment_id,
  );
  const exercise = data.exercises.find(
    (item) => item.id === assignment?.exercise_id,
  );
  const classroom = data.classes.find(
    (item) => item.id === assignment?.class_id,
  );
  const student = data.profiles.find(
    (item) => item.id === submission.student_id,
  );
  const [score, setScore] = useState(String(submission.score ?? ""));
  const [codeVisible, setCodeVisible] = useState(false);
  const grading = assignment?.grading_scale
    ? submission.score === null
      ? "Non ancora assegnato"
      : `${submission.score}/${assignment.grading_scale}`
    : "Senza voto";
  async function evaluate(status: "passed" | "failed") {
    if (!supabase) return;
    const numeric = Number(score);
    if (
      assignment?.grading_scale &&
      (score === "" || !validScore(numeric, assignment.grading_scale))
    )
      return notify(
        `Inserisci un voto intero da 0 a ${assignment.grading_scale}`,
      );
    const result = await supabase
      .from("submissions")
      .update({
        status,
        score: assignment?.grading_scale ? numeric : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", submission.id);
    if (result.error) notify(result.error.message);
    else {
      await reload();
      notify(
        status === "passed" ? "Consegna superata" : "Consegna da rivedere",
      );
    }
  }
  if (data.profile.role === "student") {
    return (
      <div className="table-row">
        <span className="student-report-exercise">{exercise?.title}</span>
        <span className={`submission-status status-${submission.status}`}>
          {statusLabels[locale][submission.status]}
        </span>
        <span className="student-report-grade">{grading}</span>
      </div>
    );
  }
  return (
    <div className="table-row">
      <button
        className="report-student student-detail-link"
        onClick={() => openStudent(submission.student_id)}
      >
        <strong>{student?.full_name || student?.email}</strong>
        <small>{student?.email}</small>
      </button>
      <span className="report-exercise">{exercise?.title}</span>
      <span>{classroom?.name || "—"}</span>
      <span className={`submission-status status-${submission.status}`}>
        {statusLabels[locale][submission.status]}
      </span>
      <span>
        {assignment?.grading_scale ? (
          <label className="report-score">
            <span>/{assignment.grading_scale}</span>
            <input
              aria-label={`Voto per ${exercise?.title}`}
              type="number"
              min="0"
              max={assignment.grading_scale}
              step="1"
              value={score}
              onChange={(event) => setScore(event.target.value)}
              placeholder="—"
            />
          </label>
        ) : (
          <span className="ungraded-label">Senza voto</span>
        )}
      </span>
      <span className="report-actions">
        <button
          className="icon-action view-code"
          aria-label={`${codeVisible ? "Nascondi" : "Visualizza"} codice di ${student?.full_name || student?.email}`}
          title={codeVisible ? "Nascondi codice" : "Visualizza codice"}
          aria-expanded={codeVisible}
          onClick={() => setCodeVisible((visible) => !visible)}
        >
          <span className="material-symbols-rounded" aria-hidden="true">
            {codeVisible ? "code_off" : "code"}
          </span>
        </button>
        <button
          className="icon-action approve"
          aria-label={`Segna ${exercise?.title} come superato`}
          title="Superato"
          onClick={() => void evaluate("passed")}
        >
          <span className="material-symbols-rounded" aria-hidden="true">
            check
          </span>
        </button>
        <button
          className="icon-action revise"
          aria-label={`Segna ${exercise?.title} da rivedere`}
          title="Da rivedere"
          onClick={() => void evaluate("failed")}
        >
          <span className="material-symbols-rounded" aria-hidden="true">
            replay
          </span>
        </button>
      </span>
      {codeVisible && (
        <section
          className="report-code-detail"
          aria-label={`Codice consegnato da ${student?.full_name || student?.email}`}
        >
          <header>
            <div>
              <strong>Codice della consegna</strong>
              <small>{exercise?.title}</small>
            </div>
            <button
              className="secondary"
              type="button"
              onClick={() => setCodeVisible(false)}
            >
              Chiudi
            </button>
          </header>
          <PythonCodeBlock
            code={submission.code}
            ariaLabel={`Codice consegnato da ${student?.full_name || student?.email}`}
          />
        </section>
      )}
    </div>
  );
}
