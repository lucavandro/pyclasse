<script lang="ts">
  import { getClasses } from "$lib/data";
  import { supabase } from "$lib/supabase";
  import { session } from "$lib/session.svelte";
  import type { Classroom, Membership } from "$lib/types";
  let classes = $state<Classroom[]>([]),
    memberships = $state<Membership[]>([]),
    code = $state(""),
    loading = $state(true),
    error = $state("");
  async function load() {
    loading = true;
    try {
      [classes, memberships] = await getClasses();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }
  $effect(() => {
    if (session.profile) void load();
  });
  async function join() {
    if (!supabase || !code.trim()) return;
    const r = await supabase.rpc("join_class", {
      code: code.trim().toUpperCase(),
    });
    if (r.error) error = r.error.message;
    else {
      code = "";
      await load();
      if (typeof r.data === "string") location.href = `/classes/${r.data}`;
    }
  }
  const visible = $derived(
    session.profile?.role === "teacher"
      ? classes
      : classes.filter((c) =>
          memberships.some(
            (m) => m.class_id === c.id && m.student_id === session.profile?.id,
          ),
        ),
  );
</script>

<header class="page-head">
  <div>
    <p class="eyebrow">CLASSI</p>
    <h1>Le tue classi</h1>
    <p>Ambienti separati per studenti, attività e progressi.</p>
  </div>
  {#if session.profile?.role === "teacher"}<a
      class="button primary"
      role="button"
      href="/classes/new">Nuova classe</a
    >{/if}
</header>
{#if session.profile?.role === "student"}<form
    class="join panel"
    onsubmit={(e) => {
      e.preventDefault();
      void join();
    }}
  >
    <label
      >Codice classe<input
        aria-label="Codice classe"
        maxlength="20"
        bind:value={code}
      /></label
    ><button class="primary">Unisciti</button>
  </form>{/if}
{#if error}<p class="error">{error}</p>{/if}{#if loading}<div
    class="spinner"
  ></div>{:else}<section class="cards">
    {#each visible as classroom}<article class="card">
        <p class="eyebrow">{classroom.subject}</p>
        <h2>{classroom.name}</h2>
        <p>
          {memberships.filter((m) => m.class_id === classroom.id).length} studenti
        </p>
        <a class="button secondary" href={`/classes/${classroom.id}`}
          >Apri classe</a
        >
      </article>{:else}<p class="empty-state">
        Nessuna classe disponibile.
      </p>{/each}
  </section>{/if}

<style>
  .join {
    display: flex;
    align-items: end;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .join label {
    flex: 1;
  }
  @media (max-width: 600px) {
    .join {
      align-items: stretch;
      flex-direction: column;
    }
  }
</style>
