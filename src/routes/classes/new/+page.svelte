<script lang="ts">
  import { goto } from "$app/navigation";
  import { supabase } from "$lib/supabase";
  import { session } from "$lib/session.svelte";
  let name = $state(""),
    subject = $state(""),
    joinCode = $state(""),
    error = $state(""),
    busy = $state(false);
  async function save() {
    if (!supabase || !session.profile) return;
    busy = true;
    const r = await supabase
      .from("classes")
      .insert({
        teacher_id: session.profile.id,
        name,
        subject,
        join_code: joinCode.trim().toUpperCase(),
      })
      .select("id")
      .single();
    busy = false;
    if (r.error) error = r.error.message;
    else await goto(`/classes/${r.data.id}`);
  }
</script>

<header class="page-head">
  <div>
    <p class="eyebrow">NUOVA CLASSE</p>
    <h1>Crea una classe</h1>
  </div>
</header>
<form
  class="panel form-grid"
  onsubmit={(e) => {
    e.preventDefault();
    void save();
  }}
>
  <label
    >Nome<input
      aria-label="Nome"
      bind:value={name}
      maxlength="120"
      required
    /></label
  ><label
    >Materia<input
      aria-label="Materia"
      bind:value={subject}
      maxlength="120"
      required
    /></label
  ><label
    >Codice di iscrizione<input
      aria-label="Codice di iscrizione"
      bind:value={joinCode}
      maxlength="20"
      required
    /></label
  >{#if error}<p class="error">{error}</p>{/if}
  <div class="actions">
    <a class="button secondary" href="/classes">Annulla</a><button
      class="primary"
      disabled={busy}>Salva classe</button
    >
  </div>
</form>

<style>
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.7rem;
  }
</style>
