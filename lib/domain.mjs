const staticRoutes = new Map([
  ["/", { view: "home" }],
  ["/classes", { view: "classes" }],
  ["/classes/new", { view: "class-form" }],
  ["/exercises", { view: "tasks" }],
  ["/exercises/new", { view: "exercise-form" }],
  ["/reports", { view: "report" }],
  ["/settings", { view: "settings" }],
]);

export function resolveRoute(pathname) {
  const path = pathname.replace(/\/$/, "") || "/";
  if (staticRoutes.has(path)) return staticRoutes.get(path);
  let match = path.match(/^\/classes\/(\d+)\/edit$/);
  if (match) return { view: "class-form", id: Number(match[1]), edit: true };
  match = path.match(/^\/classes\/(\d+)$/);
  if (match) return { view: "class-detail", id: Number(match[1]) };
  match = path.match(/^\/exercises\/(\d+)\/edit$/);
  if (match) return { view: "exercise-form", id: Number(match[1]), edit: true };
  match = path.match(/^\/exercises\/(\d+)$/);
  if (match) return { view: "editor", id: Number(match[1]) };
  return { view: "home", notFound: true };
}

export function canSubmitSolution(result, currentCode) {
  return result.total > 0 && result.passed === result.total && result.testedCode === currentCode;
}

export function deadlineForClass(assignments, className) {
  return assignments.find(item => item.className === className)?.deadline ?? null;
}

export function updateCanonicalExercise(exercises, id, patch) {
  return exercises.map(exercise => exercise.id === id ? { ...exercise, ...patch } : exercise);
}
