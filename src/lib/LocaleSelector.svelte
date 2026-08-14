<script lang="ts">
  import { m } from "$lib/paraglide/messages.js";
  import {
    getLocale,
    locales,
    setLocale,
    type Locale,
  } from "$lib/paraglide/runtime.js";

  const languageName = (locale: Locale) =>
    new Intl.DisplayNames([locale], { type: "language" }).of(locale) ?? locale;
</script>

<label class="language">
  <span>{m.language_label()}</span>
  <select
    aria-label={m.language_select_aria()}
    value={getLocale()}
    onchange={(event) =>
      void setLocale(
        (event.currentTarget as HTMLSelectElement).value as Locale,
      )}
  >
    {#each locales as locale}
      <option value={locale}>{languageName(locale)}</option>
    {/each}
  </select>
</label>

<style>
  .language {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    color: var(--color-muted);
    font-size: var(--font-size-xs);
  }
  select {
    width: auto;
    min-width: 7.5rem;
    min-height: 2.35rem;
    padding-block: 0.4rem;
  }
</style>
