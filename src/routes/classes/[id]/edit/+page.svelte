<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { supabase } from "$lib/supabase";
  import { getClasses } from "$lib/data";
  import { session } from "$lib/session.svelte";
  import { m } from "$lib/paraglide/messages.js";
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

<header class="page-head"><h1>{m.classes_edit()}</h1></header>
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
      required
    /></label
  ><label
    >{m.classes_subject()}<input
      aria-label={m.classes_subject()}
      bind:value={subject}
      required
    /></label
  ><label
    >{m.classes_enrollment_code()}<input
      aria-label={m.classes_enrollment_code()}
      bind:value={joinCode}
      required
    /></label
  >{#if error}<p class="error">{error}</p>{/if}<button
    class="primary"
    disabled={busy}>{m.classes_save()}</button
  >
</form>
