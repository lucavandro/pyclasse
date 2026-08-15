<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import LocaleSelector from "$lib/LocaleSelector.svelte";
  import { m } from "$lib/paraglide/messages.js";
  import { supabase } from "$lib/supabase";

  let ready = $state(false),
    hasSession = $state(false),
    password = $state(""),
    confirmation = $state(""),
    busy = $state(false),
    error = $state(""),
    complete = $state(false);

  onMount(() => {
    if (!supabase) {
      ready = true;
      return;
    }
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, authSession) => {
        hasSession = Boolean(authSession);
        ready = true;
      },
    );
    void supabase.auth.getSession().then(({ data }) => {
      hasSession = Boolean(data.session);
      ready = true;
    });
    return () => listener.subscription.unsubscribe();
  });

  async function updatePassword() {
    if (!supabase) return;
    error = "";
    if (password !== confirmation) {
      error = m.auth_passwords_mismatch();
      return;
    }
    busy = true;
    const result = await supabase.auth.updateUser({ password });
    if (result.error) {
      error = m.auth_password_update_failed();
      busy = false;
      return;
    }
    await supabase.auth.signOut({ scope: "global" });
    complete = true;
    busy = false;
  }
</script>

<svelte:head><title>{m.auth_reset_title()} · PyClasse</title></svelte:head>

<main class="reset-shell">
  <a class="auth-brand" href="/" aria-label="PyClasse">
    <span class="brand-mark"
      ><img src="/favicon.svg" alt="" width="34" height="34" /></span
    ><strong>PyClasse</strong>
  </a>
  <section class="reset-panel" aria-labelledby="reset-title">
    {#if !ready}
      <div class="spinner" aria-hidden="true"></div>
      <p>{m.common_loading()}</p>
    {:else if complete}
      <p class="eyebrow">{m.auth_password_updated_eyebrow()}</p>
      <h1 id="reset-title">{m.auth_password_updated()}</h1>
      <p>{m.auth_password_updated_help()}</p>
      <button class="primary" onclick={() => void goto("/")}
        >{m.auth_back_to_sign_in()}</button
      >
    {:else if !hasSession}
      <p class="eyebrow">{m.auth_reset_eyebrow()}</p>
      <h1 id="reset-title">{m.auth_invalid_recovery_link()}</h1>
      <p>{m.auth_invalid_recovery_help()}</p>
      <button class="primary" onclick={() => void goto("/")}
        >{m.auth_request_new_link()}</button
      >
    {:else}
      <p class="eyebrow">{m.auth_reset_eyebrow()}</p>
      <h1 id="reset-title">{m.auth_reset_title()}</h1>
      <p>{m.auth_reset_subtitle()}</p>
      <form
        class="form-grid"
        onsubmit={(event) => {
          event.preventDefault();
          void updatePassword();
        }}
      >
        <label
          >{m.auth_new_password()}<input
            type="password"
            autocomplete="new-password"
            minlength="8"
            bind:value={password}
            required
          /></label
        >
        <label
          >{m.auth_confirm_password()}<input
            type="password"
            autocomplete="new-password"
            minlength="8"
            bind:value={confirmation}
            required
          /></label
        >
        {#if error}<p class="error" role="alert">{error}</p>{/if}
        <button class="primary" disabled={busy}
          >{m.auth_update_password()}</button
        >
      </form>
    {/if}
    <div class="language-row"><LocaleSelector /></div>
  </section>
</main>

<style>
  .reset-shell {
    min-height: 100svh;
    display: grid;
    place-items: center;
    padding: clamp(6rem, 12vh, 8rem) var(--space-6) var(--space-8);
    background:
      radial-gradient(
        circle at 18% 10%,
        rgb(104 196 255 / 18%),
        transparent 24rem
      ),
      radial-gradient(
        circle at 85% 90%,
        rgb(46 158 255 / 12%),
        transparent 28rem
      ),
      var(--color-background);
  }
  .auth-brand {
    position: absolute;
    top: clamp(1.5rem, 4vw, 3rem);
    left: clamp(1.5rem, 4vw, 4rem);
    display: flex;
    align-items: center;
    gap: var(--space-3);
    color: var(--color-foreground);
    font-size: var(--font-size-lg);
    text-decoration: none;
  }
  .brand-mark {
    display: grid;
    width: 46px;
    height: 46px;
    place-items: center;
    border: 1px solid rgb(104 196 255 / 20%);
    border-radius: var(--radius-lg);
    background: rgb(46 158 255 / 12%);
  }
  .reset-panel {
    width: min(100%, 460px);
    border: var(--border);
    border-radius: var(--radius-xl);
    padding: clamp(var(--space-6), 6vw, var(--space-10));
    background: var(--color-surface);
    box-shadow: var(--shadow-lg);
  }
  .reset-panel > p:not(.eyebrow) {
    margin-bottom: var(--space-6);
  }
  .reset-panel > button {
    width: 100%;
  }
  .language-row {
    margin-top: var(--space-6);
    border-top: var(--border);
    padding-top: var(--space-4);
  }
  @media (max-width: 520px) {
    .reset-shell {
      align-items: start;
      padding: 6.25rem var(--space-4) var(--space-6);
    }
    .reset-panel {
      border: 0;
      padding-inline: var(--space-2);
      background: transparent;
      box-shadow: none;
    }
  }
</style>
