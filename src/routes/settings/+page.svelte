<script lang="ts">
  import { supabase, supabaseStudioUrl } from "$lib/supabase";
  import { getBrandingTranslations } from "$lib/data";
  import { loadProfile, session } from "$lib/session.svelte";
  import { m } from "$lib/paraglide/messages.js";
  import { getLocale, locales, type Locale } from "$lib/paraglide/runtime.js";

  type BrandingCopy = Record<Locale, { title: string; subtitle: string }>;
  const defaultTitle = (locale: Locale) => m.auth_default_title({}, { locale });
  const defaultSubtitle = (locale: Locale) =>
    m.auth_default_subtitle({}, { locale });
  const emptyBranding = () =>
    Object.fromEntries(
      locales.map((locale) => [
        locale,
        {
          title: String(defaultTitle(locale)),
          subtitle: String(defaultSubtitle(locale)),
        },
      ]),
    ) as BrandingCopy;
  const languageName = (locale: Locale) =>
    new Intl.DisplayNames([getLocale()], { type: "language" }).of(locale) ??
    locale;

  let branding = $state<BrandingCopy>(emptyBranding()),
    consent = $state(false),
    consentedAt = $state<string | null>(null),
    status = $state(""),
    loading = $state(true);
  $effect(() => {
    const profile = session.profile;
    if (!profile) return;
    void (async () => {
      const translations = await getBrandingTranslations();
      for (const translation of translations) {
        if (locales.includes(translation.locale as Locale))
          branding[translation.locale as Locale] = {
            title: translation.title,
            subtitle: translation.subtitle,
          };
      }
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
      const r = await supabase.from("app_branding_translations").upsert(
        locales.map((locale) => ({
          locale,
          title: branding[locale].title.trim(),
          subtitle: branding[locale].subtitle.trim(),
        })),
        { onConflict: "locale" },
      );
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
    {#if session.profile?.role === "teacher"}<section class="panel form-grid">
        <h2>{m.settings_customization()}</h2>
        <p class="muted">{m.settings_branding_help()}</p>
        <fieldset aria-label={m.settings_login_copy()} class="form-grid">
          <legend>{m.settings_login_copy()}</legend>
          {#each locales as locale}
            <label
              >{m.settings_branding_title({
                language: languageName(locale),
              })}<input
                aria-label={m.settings_branding_title({
                  language: languageName(locale),
                })}
                minlength="5"
                maxlength="120"
                bind:value={branding[locale].title}
                required
              /></label
            ><label
              >{m.settings_branding_subtitle({
                language: languageName(locale),
              })}<textarea
                aria-label={m.settings_branding_subtitle({
                  language: languageName(locale),
                })}
                minlength="5"
                maxlength="240"
                bind:value={branding[locale].subtitle}
                required
              ></textarea></label
            >
          {/each}
        </fieldset>
        <div class="login-preview" aria-label={m.settings_login_preview()}>
          {#each locales as locale}
            <div>
              <span>{languageName(locale)}</span>
              <strong>{branding[locale].title || defaultTitle(locale)}</strong>
              <p>{branding[locale].subtitle || defaultSubtitle(locale)}</p>
            </div>
          {/each}
        </div>
      </section>
      <section class="panel administration-settings">
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
