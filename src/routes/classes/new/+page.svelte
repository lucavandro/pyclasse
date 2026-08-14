<script lang="ts">
  import { goto } from "$app/navigation";
  import { supabase } from "$lib/supabase";
  import { session } from "$lib/session.svelte";
  import { m } from "$lib/paraglide/messages.js";
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
    <p class="eyebrow">{m.classes_new_eyebrow()}</p>
    <h1>{m.classes_create()}</h1>
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
    >{m.common_name()}<input
      aria-label={m.common_name()}
      bind:value={name}
      maxlength="120"
      required
    /></label
  ><label
    >{m.classes_subject()}<input
      aria-label={m.classes_subject()}
      bind:value={subject}
      maxlength="120"
      required
    /></label
  ><label
    >{m.classes_enrollment_code()}<input
      aria-label={m.classes_enrollment_code()}
      bind:value={joinCode}
      maxlength="20"
      required
    /></label
  >{#if error}<p class="error">{error}</p>{/if}
  <div class="actions">
    <a class="button secondary" href="/classes">{m.common_cancel()}</a><button
      class="primary"
      disabled={busy}>{m.classes_save()}</button
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
