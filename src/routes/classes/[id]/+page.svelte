<script lang="ts">
  import { page } from "$app/state";
  import { getClassDetail } from "$lib/data";
  import { session } from "$lib/session.svelte";
  import { supabase } from "$lib/supabase";
  import { m } from "$lib/paraglide/messages.js";
  import type {
    Classroom,
    Membership,
    Profile,
    Assignment,
    Exercise,
  } from "$lib/types";

  let classroom = $state<Classroom | null>(null),
    members = $state<Membership[]>([]),
    profiles = $state<Profile[]>([]),
    assignments = $state<Assignment[]>([]),
    exercises = $state<Exercise[]>([]),
    studentEmail = $state(""),
    adding = $state(false),
    addStatus = $state(""),
    loading = $state(true),
    error = $state("");

  async function load() {
    const data = await getClassDetail(page.params.id || "");
    ({ classroom, members, profiles, assignments, exercises } = data);
  }

  $effect(() => {
    if (!session.profile) return;
    void load()
      .catch((cause) => {
        error = cause instanceof Error ? cause.message : String(cause);
      })
      .finally(() => (loading = false));
  });

  async function addStudent() {
    if (!supabase || !studentEmail.trim()) return;
    adding = true;
    addStatus = "";
    const result = await supabase.rpc("add_student_to_class", {
      target_class: page.params.id || "",
      student_email: studentEmail.trim(),
    });
    if (result.error) {
      addStatus = result.error.message.includes("Nessuno studente")
        ? m.classes_student_not_found()
        : m.classes_student_add_failed();
    } else {
      studentEmail = "";
      addStatus = m.classes_student_added();
      await load();
    }
    adding = false;
  }
</script>

{#if loading}<div class="spinner"></div>{:else if error || !classroom}<p
    class="error"
  >
    {error || m.classes_not_found()}
  </p>{:else}<header class="page-head">
    <div>
      <p class="eyebrow">{m.classes_class_eyebrow()}</p>
      <h1>{classroom.name} · {classroom.subject}</h1>
      <p>{m.classes_enrollment_code_value({ code: classroom.join_code })}</p>
    </div>
    {#if session.profile?.role === "teacher"}<a
        class="button secondary"
        href={`/classes/${classroom.id}/edit`}>{m.common_edit()}</a
      >{/if}
  </header>
  <div class="columns">
    <section class="panel">
      <h2>{m.classes_assigned_activities()}</h2>
      {#each assignments as assignment}<article class="row">
          <strong
            >{exercises.find((item) => item.id === assignment.exercise_id)
              ?.title}</strong
          ><span
            >{assignment.published_at
              ? m.common_published()
              : m.common_draft()}</span
          >
        </article>{:else}<p class="empty-state">
          {m.classes_no_activities()}
        </p>{/each}
    </section>
    {#if session.profile?.role === "teacher"}<section class="panel students">
        <div>
          <h2>{m.common_students()}</h2>
          <p class="muted">{m.classes_add_registered_student()}</p>
        </div>
        <form
          class="add-student"
          onsubmit={(event) => {
            event.preventDefault();
            void addStudent();
          }}
        >
          <label
            >{m.classes_student_email()}<input
              type="email"
              autocomplete="off"
              bind:value={studentEmail}
              required
            /></label
          ><button class="secondary" disabled={adding}
            >{m.classes_add_student()}</button
          >
        </form>
        {#if addStatus}<p role="status">{addStatus}</p>{/if}
        <div class="student-list">
          {#each members as member}{@const profile = profiles.find(
              (item) => item.id === member.student_id,
            )}
            <article class="row">
              <a href={`/reports/classi/studenti/${member.student_id}`}
                ><strong>{profile?.full_name || profile?.email}</strong></a
              >
            </article>{:else}<p class="empty-state">
              {m.classes_no_students()}
            </p>{/each}
        </div>
      </section>{/if}
  </div>{/if}

<style>
  .columns {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--space-4);
  }
  .students,
  .student-list {
    display: grid;
    gap: var(--space-4);
  }
  .add-student {
    display: grid;
    gap: var(--space-3);
  }
  .add-student button {
    justify-self: end;
  }
  .row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    padding: 0.9rem;
    border-bottom: var(--border);
    border-radius: var(--radius-sm);
  }
  .row:hover {
    background: rgb(46 158 255 / 5%);
  }
  @media (max-width: 800px) {
    .columns {
      grid-template-columns: 1fr;
    }
    .add-student button {
      width: 100%;
    }
  }
</style>
