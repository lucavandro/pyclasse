<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { supabase } from "$lib/supabase";
  import { getClasses } from "$lib/data";
  import { session } from "$lib/session.svelte";
  let name = $state(""),
    subject = $state(""),
    joinCode = $state(""),
    error = $state(""),
    busy = $state(false),
    loaded = $state(false);
  $effect(() => {
    if (!session.profile || loaded) return;
    void getClasses().then(([c]) => {
      const x = c.find((v) => v.id === page.params.id);
      if (x) {
        name = x.name;
        subject = x.subject;
        joinCode = x.join_code;
      }
      loaded = true;
    });
  });
  async function save() {
    if (!supabase) return;
    busy = true;
    const r = await supabase
      .from("classes")
      .update({ name, subject, join_code: joinCode.trim().toUpperCase() })
      .eq("id", page.params.id);
    busy = false;
    if (r.error) error = r.error.message;
    else await goto(`/classes/${page.params.id}`);
  }
</script>

<header class="page-head"><h1>Modifica classe</h1></header>
<form
  class="panel form-grid"
  onsubmit={(e) => {
    e.preventDefault();
    void save();
  }}
>
  <label>Nome<input aria-label="Nome" bind:value={name} required /></label
  ><label
    >Materia<input aria-label="Materia" bind:value={subject} required /></label
  ><label
    >Codice di iscrizione<input
      aria-label="Codice di iscrizione"
      bind:value={joinCode}
      required
    /></label
  >{#if error}<p class="error">{error}</p>{/if}<button
    class="primary"
    disabled={busy}>Salva classe</button
  >
</form>
