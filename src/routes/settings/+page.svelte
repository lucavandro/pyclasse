<script lang="ts">
  import { supabase, supabaseStudioUrl } from "$lib/supabase";
  import { getSettings } from "$lib/data";
  import { loadProfile, session } from "$lib/session.svelte";
  let schoolName = $state(""),
    titleIt = $state(""),
    subtitleIt = $state(""),
    titleEn = $state(""),
    subtitleEn = $state(""),
    consent = $state(false),
    consentedAt = $state<string | null>(null),
    status = $state(""),
    loading = $state(true),
    locale = $state("it");
  $effect(() => {
    const profile = session.profile;
    if (!profile) return;
    void (async () => {
      const s = await getSettings();
      schoolName = s?.school_name || "";
      titleIt = s?.login_title_it || "";
      subtitleIt = s?.login_subtitle_it || "";
      titleEn = s?.login_title_en || "";
      subtitleEn = s?.login_subtitle_en || "";
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
    if (profile.role === "teacher") {
      const r = await supabase
        .from("app_settings")
        .update({
          school_name: schoolName.trim(),
          login_title_it: titleIt.trim(),
          login_subtitle_it: subtitleIt.trim(),
          login_title_en: titleEn.trim(),
          login_subtitle_en: subtitleEn.trim(),
        })
        .eq("singleton", true);
      if (r.error) {
        status = r.error.message;
        return;
      }
    }
    const r = await supabase
      .from("profiles")
      .update({
        external_ai_enabled: consent,
        external_ai_consented_at: consent
          ? consentedAt || new Date().toISOString()
          : null,
      })
      .eq("id", profile.id);
    status = r.error ? r.error.message : "Impostazioni salvate";
    if (!r.error && session.user) await loadProfile(session.user);
  }
</script>

<header class="page-head">
  <div>
    <p class="eyebrow">PREFERENZE</p>
    <h1>Impostazioni</h1>
  </div>
</header>
{#if loading}<div class="spinner"></div>{:else}<form
    class="form-grid"
    onsubmit={(e) => {
      e.preventDefault();
      void save();
    }}
  >
    {#if session.profile?.role === "teacher"}<section class="panel form-grid">
        <h2>Personalizzazione</h2>
        <label>Nome scuola<input bind:value={schoolName} /></label>
        <fieldset aria-label="Testi della pagina di accesso" class="form-grid">
          <legend>Testi della pagina di accesso</legend><label
            >Titolo (italiano)<input
              aria-label="Titolo (italiano)"
              bind:value={titleIt}
            /></label
          ><label
            >Sottotitolo (italiano)<textarea
              aria-label="Sottotitolo (italiano)"
              maxlength="240"
              bind:value={subtitleIt}
            ></textarea></label
          ><label
            >Titolo (inglese)<input
              aria-label="Titolo (inglese)"
              bind:value={titleEn}
            /></label
          ><label
            >Sottotitolo (inglese)<textarea
              aria-label="Sottotitolo (inglese)"
              maxlength="240"
              bind:value={subtitleEn}
            ></textarea></label
          >
        </fieldset>
      </section>
      <section class="panel administration-settings">
        <h2>Amministrazione tecnica</h2>
        <p>
          La configurazione del database resta separata dall’interfaccia
          didattica.
        </p>
        {#if supabaseStudioUrl}<a
            class="button secondary"
            href={supabaseStudioUrl}
            target="_blank"
            rel="noopener noreferrer">Apri amministrazione Supabase</a
          >{/if}
      </section>{/if}
    <section class="panel form-grid">
      <h2>Lingua e privacy</h2>
      <label
        >Language<select aria-label="Language" bind:value={locale}
          ><option value="it">Italiano</option><option value="en"
            >English</option
          ></select
        ></label
      ><label class="consent"
        ><input
          type="checkbox"
          aria-label="Consenti l’invio di dati a Puter"
          bind:checked={consent}
        /> Consenti l’invio di dati a Puter</label
      >
      <p class="muted">
        Il consenso è facoltativo, specifico e revocabile. Senza consenso i dati
        non vengono trasferiti al servizio esterno.
      </p>
    </section>
    {#if status}<p role="status">{status}</p>{/if}<button class="primary save"
      >Salva impostazioni</button
    >
  </form>{/if}

<style>
  fieldset {
    border: var(--border);
    border-radius: var(--radius-md);
    padding: 1rem;
  }
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
