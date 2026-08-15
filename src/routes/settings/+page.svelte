<script lang="ts">
  import { supabase, supabaseStudioUrl } from "$lib/supabase";
  import { loadProfile, session } from "$lib/session.svelte";
  import { m } from "$lib/paraglide/messages.js";

  let consent = $state(false),
    consentedAt = $state<string | null>(null),
    status = $state(""),
    loading = $state(true);
  $effect(() => {
    const profile = session.profile;
    if (!profile) return;
    void (async () => {
      if (supabase) {
        const r = await supabase
          .from("profiles")
          .select("external_ai_enabled,external_ai_consented_at")
          .eq("id", profile.id)
          .single();
        consent = Boolean(r.data?.external_ai_enabled);
        consentedAt = r.data?.external_ai_consented_at || null;
      }
      loading = false;
    })();
  });
  async function save() {
    const profile = session.profile;
    if (!supabase || !profile) return;
    status = "";
    const r = await supabase
      .from("profiles")
      .update({
        external_ai_enabled: consent,
        external_ai_consented_at: consent
          ? consentedAt || new Date().toISOString()
          : null,
      })
      .eq("id", profile.id);
    status = r.error ? r.error.message : m.settings_saved();
    if (!r.error && session.user) await loadProfile(session.user);
  }
</script>

<header class="page-head">
  <div>
    <p class="eyebrow">{m.settings_eyebrow()}</p>
    <h1>{m.settings_title()}</h1>
  </div>
</header>
{#if loading}<div class="spinner"></div>{:else}<form
    class="form-grid"
    onsubmit={(e) => {
      e.preventDefault();
      void save();
    }}
  >
    {#if session.profile?.role === "teacher"}<section
        class="panel administration-settings"
      >
        <h2>{m.settings_technical_admin()}</h2>
        <p>{m.settings_admin_help()}</p>
        {#if supabaseStudioUrl}<a
            class="button secondary"
            href={supabaseStudioUrl}
            target="_blank"
            rel="noopener noreferrer">{m.settings_open_supabase()}</a
          >{/if}
      </section>{/if}
    <section class="panel form-grid">
      <h2>{m.settings_privacy()}</h2>
      <label class="consent"
        ><input
          type="checkbox"
          aria-label={m.settings_puter_consent()}
          bind:checked={consent}
        />
        {m.settings_puter_consent()}</label
      >
      <p class="muted">
        {m.settings_consent_help()}
      </p>
    </section>
    {#if status}<p role="status">{status}</p>{/if}<button class="primary save"
      >{m.settings_save()}</button
    >
  </form>{/if}

<style>
  .consent {
    display: flex;
    align-items: center;
  }
  .consent input {
    width: auto;
  }
  .save {
    justify-self: end;
  }
</style>
