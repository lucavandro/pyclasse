"use client";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import type { Exercise, Workspace } from "../lib/types";
import {
  isSafeExternalResource,
  normalizeTags,
} from "../lib/learning-path.mjs";

type Props = {
  exercise: Exercise | null;
  data: Workspace;
  navigate: (view: "tasks", id?: string) => void;
  reload: () => Promise<void>;
  notify: (message: string) => void;
};

type EditableTest = {
  input: string;
  expected: string;
  hidden: boolean;
  points: number;
};
type AssignmentLink = {
  classId: string;
  deadline: string;
  published: boolean;
  gradingScale: 10 | 100 | null;
  position: number;
};

export function ExerciseFormV2({
  exercise,
  data,
  navigate,
  reload,
  notify,
}: Props) {
  const [title, setTitle] = useState(exercise?.title ?? "");
  const [description, setDescription] = useState(exercise?.description ?? "");
  const [resourceUrl, setResourceUrl] = useState(exercise?.resource_url ?? "");
  const [resourceLabel, setResourceLabel] = useState(
    exercise?.resource_label ?? "",
  );
  const [constraints, setConstraints] = useState(exercise?.constraints ?? "");
  const [starter, setStarter] = useState(exercise?.starter_code ?? "");
  const [mode, setMode] = useState<"tests" | "ai">(
    exercise?.verification_mode ?? "tests",
  );
  const [points, setPoints] = useState(exercise?.max_points ?? 100);
  const [isPrerequisite, setIsPrerequisite] = useState(
    exercise?.is_prerequisite ?? true,
  );
  const [tagsText, setTagsText] = useState(exercise?.tags.join(", ") ?? "");
  const [tests, setTests] = useState<EditableTest[]>(() =>
    exercise
      ? data.tests
          .filter((item) => item.exercise_id === exercise.id)
          .map((item) => ({
            input: item.input_data,
            expected: item.expected_output,
            hidden: item.is_hidden,
            points: item.points,
          }))
      : [],
  );
  const [links, setLinks] = useState<AssignmentLink[]>(() =>
    exercise
      ? data.assignments
          .filter((item) => item.exercise_id === exercise.id)
          .map((item) => ({
            classId: item.class_id,
            deadline: item.deadline ?? "",
            published: Boolean(item.published_at),
            gradingScale: item.grading_scale,
            position: item.position,
          }))
      : [],
  );

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || data.profile.role !== "teacher") return;
    if (!isSafeExternalResource(resourceUrl.trim()))
      return notify("La risorsa deve usare un URL HTTPS valido");
    const tags = normalizeTags(tagsText);
    const values = {
      teacher_id: data.profile.id,
      title: title.trim(),
      description: description.trim(),
      description_format: "markdown",
      resource_url: resourceUrl.trim() || null,
      resource_label: resourceUrl.trim()
        ? resourceLabel.trim() || "Risorsa esterna"
        : null,
      constraints: constraints.trim(),
      starter_code: starter,
      verification_mode: mode,
      max_points: points,
      is_prerequisite: isPrerequisite,
      tags,
      updated_at: new Date().toISOString(),
    };
    let id = exercise?.id;
    if (exercise) {
      const result = await supabase
        .from("exercises")
        .update(values)
        .eq("id", id);
      if (result.error) return notify(result.error.message);
    } else {
      const result = await supabase
        .from("exercises")
        .insert(values)
        .select("id")
        .single();
      if (result.error) return notify(result.error.message);
      id = result.data.id;
    }
    await supabase.from("tests").delete().eq("exercise_id", id);
    await supabase.from("class_assignments").delete().eq("exercise_id", id);
    if (tests.length) {
      const result = await supabase.from("tests").insert(
        tests.map((test, position) => ({
          exercise_id: id,
          position,
          input_data: test.input,
          expected_output: test.expected,
          is_hidden: test.hidden,
          points: test.points,
        })),
      );
      if (result.error) return notify(result.error.message);
    }
    if (links.length) {
      const result = await supabase.from("class_assignments").insert(
        links.map((link) => ({
          exercise_id: id,
          class_id: link.classId,
          deadline: link.deadline || null,
          published_at: link.published ? new Date().toISOString() : null,
          grading_scale: link.gradingScale,
          position: link.position,
        })),
      );
      if (result.error) return notify(result.error.message);
    }
    await reload();
    navigate("tasks");
    notify(exercise ? "Esercizio aggiornato" : "Esercizio creato");
  }

  if (data.profile.role !== "teacher")
    return (
      <p className="empty-state">Questa funzione è riservata ai docenti.</p>
    );
  return (
    <section className="exercise-page">
      <button className="back" onClick={() => navigate("tasks")}>
        ← Annulla
      </button>
      <form className="exercise-modal exercise-editor" onSubmit={save}>
        <h2>{exercise ? "Modifica esercizio" : "Nuovo esercizio"}</h2>
        <div className="exercise-fields">
          <label>
            Titolo
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>
          <label>
            Punti
            <input
              type="number"
              min="1"
              max="100"
              value={points}
              onChange={(event) => setPoints(Number(event.target.value))}
            />
          </label>
          <label className="wide">
            Tag (separati da virgola)
            <input
              aria-label="Tag"
              value={tagsText}
              onChange={(event) => setTagsText(event.target.value)}
              placeholder="cicli, liste"
            />
          </label>
          <label className="wide prerequisite-control">
            <input
              aria-label="Esercizio propedeutico"
              type="checkbox"
              checked={isPrerequisite}
              onChange={(event) => setIsPrerequisite(event.target.checked)}
            />
            <span className="custom-check" aria-hidden="true">
              <span className="material-symbols-rounded">check</span>
            </span>
            <span>
              <strong>Propedeutico</strong>
              <small>
                Blocca gli esercizi successivi finché lo studente non consegna
                questo esercizio.
              </small>
            </span>
          </label>
          <label className="wide">
            Traccia (Markdown)
            <textarea
              aria-label="Traccia Markdown"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              placeholder="# Titolo\nDescrizione con **enfasi** e liste."
            />
          </label>
          <label className="wide">
            Link risorsa esterna
            <input
              aria-label="Link risorsa esterna"
              type="url"
              pattern="https://.*"
              value={resourceUrl}
              onChange={(event) => setResourceUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </label>
          <label className="wide">
            Titolo risorsa
            <input
              aria-label="Titolo risorsa"
              maxLength={120}
              disabled={!resourceUrl}
              value={resourceLabel}
              onChange={(event) => setResourceLabel(event.target.value)}
              placeholder="Video introduttivo"
            />
          </label>
          <label className="wide">
            Vincoli
            <textarea
              value={constraints}
              onChange={(event) => setConstraints(event.target.value)}
            />
          </label>
          <label className="wide">
            Codice iniziale
            <textarea
              className="code-field"
              value={starter}
              onChange={(event) => setStarter(event.target.value)}
            />
          </label>
        </div>
        <fieldset>
          <legend>Verifica</legend>
          <label
            className={`verification-card${mode === "tests" ? " selected" : ""}`}
          >
            <input
              name="verification-mode"
              type="radio"
              checked={mode === "tests"}
              onChange={() => setMode("tests")}
            />
            <span className="custom-radio" aria-hidden="true" />
            <span>
              <strong>Test automatici</strong>
              <small>Eseguiti localmente nel browser dello studente.</small>
            </span>
          </label>
          <label
            className={`verification-card${mode === "ai" ? " selected" : ""}`}
          >
            <input
              name="verification-mode"
              type="radio"
              checked={mode === "ai"}
              onChange={() => setMode("ai")}
            />
            <span className="custom-radio" aria-hidden="true" />
            <span>
              <strong>IA esterna opzionale</strong>
              <small>
                Disponibile soltanto con il consenso dello studente.
              </small>
            </span>
          </label>
        </fieldset>
        {mode === "tests" && (
          <div className="generated-tests">
            <div>
              <strong>Test pubblici</strong>
              <button
                type="button"
                onClick={() =>
                  setTests((rows) => [
                    ...rows,
                    { input: "", expected: "", hidden: false, points: 1 },
                  ])
                }
              >
                Aggiungi
              </button>
            </div>
            {tests.map((row, index) => (
              <div className="test-edit" key={index}>
                <span>{index + 1}</span>
                <input
                  aria-label={`Input test ${index + 1}`}
                  value={row.input}
                  onChange={(event) =>
                    setTests((rows) =>
                      rows.map((item, i) =>
                        i === index
                          ? { ...item, input: event.target.value }
                          : item,
                      ),
                    )
                  }
                  required
                />
                <input
                  aria-label={`Output test ${index + 1}`}
                  value={row.expected}
                  onChange={(event) =>
                    setTests((rows) =>
                      rows.map((item, i) =>
                        i === index
                          ? { ...item, expected: event.target.value }
                          : item,
                      ),
                    )
                  }
                  required
                />
              </div>
            ))}
          </div>
        )}
        <div className="class-assignments">
          <strong>Compiti assegnati</strong>
          {data.classes.map((classroom) => {
            const link = links.find((item) => item.classId === classroom.id);
            const nextPosition =
              Math.max(
                0,
                ...data.assignments
                  .filter((item) => item.class_id === classroom.id)
                  .map((item) => item.position),
              ) + 1;
            return (
              <div key={classroom.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(link)}
                    onChange={() =>
                      setLinks((current) =>
                        link
                          ? current.filter(
                              (item) => item.classId !== classroom.id,
                            )
                          : [
                              ...current,
                              {
                                classId: classroom.id,
                                deadline: "",
                                published: true,
                                gradingScale: null,
                                position: nextPosition,
                              },
                            ],
                      )
                    }
                  />
                  {classroom.name}
                </label>
                <input
                  type="datetime-local"
                  disabled={!link}
                  value={link?.deadline ?? ""}
                  onChange={(event) =>
                    setLinks((current) =>
                      current.map((item) =>
                        item.classId === classroom.id
                          ? { ...item, deadline: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <label>
                  Valutazione
                  <select
                    aria-label={`Scala voto per ${classroom.name}`}
                    disabled={!link}
                    value={link?.gradingScale ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      const gradingScale = value
                        ? (Number(value) as 10 | 100)
                        : null;
                      setLinks((current) =>
                        current.map((item) =>
                          item.classId === classroom.id
                            ? { ...item, gradingScale }
                            : item,
                        ),
                      );
                    }}
                  >
                    <option value="">Senza voto</option>
                    <option value="10">Voto in decimi</option>
                    <option value="100">Voto in centesimi</option>
                  </select>
                </label>
              </div>
            );
          })}
        </div>
        <button className="primary">Salva esercizio</button>
      </form>
    </section>
  );
}
