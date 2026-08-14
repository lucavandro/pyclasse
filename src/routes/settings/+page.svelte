<script lang="ts">
  import { supabase, supabaseStudioUrl } from "$lib/supabase";
  import { getSettings } from "$lib/data";
  import { loadProfile, session } from "$lib/session.svelte";
  let titleIt = $state(""),
    subtitleIt = $state(""),
    titleEn = $state(""),
    subtitleEn = $state(""),
    consent = $state(false),
    consentedAt = $state<string | null>(null),
    status = $state(""),
    loading = $state(true);
  $effect(() => {
    const profile = session.profile;
    if (!profile) return;
    void (async () => {
      const s = await getSettings();
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
        <p class="muted">
          Questi quattro testi compaiono nel pannello sinistro della schermata
          di accesso. L’anteprima si aggiorna mentre scrivi.
        </p>
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
        <div class="login-preview" aria-label="Anteprima pagina di accesso">
          <div>
            <span>Italiano</span>
            <strong
              >{titleIt || "Il laboratorio Python della tua classe."}</strong
            >
            <p>
              {subtitleIt ||
                "Crea esercizi, segui i progressi e accompagna ogni studente nel suo percorso."}
            </p>
          </div>
          <div>
            <span>English</span>
            <strong>{titleEn || "The Python lab for your classroom."}</strong>
            <p>
              {subtitleEn ||
                "Create exercises, follow progress and support every student on their path."}
            </p>
          </div>
        </div>
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
      <h2>Privacy</h2>
      <label class="consent"
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
  .login-preview {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-4);
  }
  .login-preview > div {
    display: grid;
    gap: var(--space-2);
    border: var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
    background: linear-gradient(
      145deg,
      var(--color-primary-surface),
      var(--color-surface)
    );
  }
  .login-preview span {
    color: var(--color-primary-soft);
    font-size: var(--font-size-xs);
    font-weight: 750;
    text-transform: uppercase;
  }
  .login-preview p {
    margin: 0;
    color: var(--color-muted);
    font-size: var(--font-size-sm);
  }
  .save {
    justify-self: end;
  }
  @media (max-width: 700px) {
    .login-preview {
      grid-template-columns: 1fr;
    }
  }
</style>
