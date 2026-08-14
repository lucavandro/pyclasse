<script lang="ts">
  import { supabase, signInWithGoogle } from "$lib/supabase";
  import LocaleSelector from "$lib/LocaleSelector.svelte";
  import { m } from "$lib/paraglide/messages.js";
  import { getLocale } from "$lib/paraglide/runtime.js";
  type Branding = {
    locale: string;
    title: string;
    subtitle: string;
  };
  let mode = $state<"login" | "register">("login");
  let method = $state<"password" | "otp">("password");
  let name = $state(""),
    email = $state(""),
    password = $state(""),
    otp = $state(""),
    otpSent = $state(false),
    busy = $state(false),
    error = $state("");
  let branding = $state<Branding | null>(null);
  const otpEnabled = import.meta.env.NEXT_PUBLIC_AUTH_EMAIL_OTP === "true";
  const googleEnabled = import.meta.env.NEXT_PUBLIC_AUTH_GOOGLE === "true";
  $effect(() => {
    if (supabase)
      void supabase
        .rpc("get_public_branding", { target_locale: getLocale() })
        .then(({ data }) => (branding = (data?.[0] ?? data) as Branding));
  });
  function friendlyAuthError(cause: unknown) {
    const message =
      cause && typeof cause === "object" && "message" in cause
        ? String(cause.message).toLowerCase()
        : "";
    if (message.includes("invalid login credentials"))
      return m.auth_invalid_credentials();
    if (message.includes("already registered"))
      return m.auth_already_registered();
    if (message.includes("rate") || message.includes("too many"))
      return m.auth_too_many_attempts();
    return m.auth_unavailable();
  }
  async function submit() {
    if (!supabase) return;
    busy = true;
    error = "";
    try {
      if (method === "otp") {
        if (!otpSent) {
          const r = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false },
          });
          if (r.error) throw r.error;
          otpSent = true;
        } else {
          const r = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: "email",
          });
          if (r.error) throw r.error;
        }
      } else if (mode === "register") {
        const r = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (r.error) throw r.error;
      } else {
        const r = await supabase.auth.signInWithPassword({ email, password });
        if (r.error) throw r.error;
      }
    } catch (cause) {
      error = friendlyAuthError(cause);
    } finally {
      busy = false;
    }
  }
</script>

<main class="auth-shell">
  <div class="auth-brand">
    <span class="brand-mark"
      ><img src="/favicon.svg" alt="" width="34" height="34" /></span
    ><strong>PyClasse</strong>
  </div>
  <section class="auth-hero" aria-labelledby="auth-hero-title">
    <div class="hero-copy">
      <p class="eyebrow">{m.auth_hero_eyebrow()}</p>
      <h1 id="auth-hero-title">
        {branding?.title || m.auth_default_title()}
      </h1>
      <p>
        {branding?.subtitle || m.auth_default_subtitle()}
      </p>
      <ul class="trust-row" aria-label={m.auth_benefits()}>
        <li>{m.auth_protected_space()}</li>
        <li>{m.auth_python_browser()}</li>
        <li>{m.auth_privacy_default()}</li>
      </ul>
    </div>
  </section>

  <section class="auth-form-panel" aria-labelledby="auth-form-title">
    <div class="panel-orbit orbit-one" aria-hidden="true"></div>
    <div class="panel-orbit orbit-two" aria-hidden="true"></div>
    <div class="auth-content">
      <div class="auth-heading">
        <p class="eyebrow">{m.auth_your_space()}</p>
        <h2 id="auth-form-title">{m.auth_welcome()}</h2>
        <p>{m.auth_subtitle()}</p>
      </div>

      {#if otpEnabled}
        <div class="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={method === "password"}
            onclick={() => (method = "password")}>{m.auth_password()}</button
          ><button
            role="tab"
            aria-selected={method === "otp"}
            onclick={() => (method = "otp")}>{m.auth_email_code()}</button
          >
        </div>
      {/if}

      {#if googleEnabled}
        <button class="google" onclick={() => void signInWithGoogle()}
          >{m.auth_continue_google()}</button
        >
        <div class="divider">{m.auth_or()}</div>
      {/if}

      <form
        onsubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        class="form-grid"
      >
        {#if mode === "register" && method === "password"}
          <label
            >{m.auth_full_name()}<input
              aria-label={m.auth_full_name()}
              autocomplete="name"
              bind:value={name}
              required
            /></label
          >
        {/if}
        <label
          >{m.common_email()}<input
            type="email"
            aria-label={m.common_email()}
            autocomplete="email"
            bind:value={email}
            required
          /></label
        >
        {#if method === "password"}
          <label
            >{m.auth_password()}<input
              type="password"
              aria-label={m.auth_password()}
              autocomplete={mode === "login"
                ? "current-password"
                : "new-password"}
              minlength="8"
              bind:value={password}
              required
            /></label
          >
        {/if}
        {#if otpSent}
          <label
            >{m.auth_code()}<input
              aria-label={m.auth_received_code()}
              inputmode="numeric"
              autocomplete="one-time-code"
              bind:value={otp}
              required
            /></label
          >
        {/if}
        {#if error}<p class="error" role="alert">{error}</p>{/if}
        <button class="primary" disabled={busy}
          >{method === "otp"
            ? otpSent
              ? m.auth_verify_code()
              : m.auth_send_code()
            : mode === "login"
              ? m.auth_sign_in()
              : m.auth_register()}</button
        >
      </form>
      {#if method === "password"}
        <button
          class="quiet switch"
          onclick={() => (mode = mode === "login" ? "register" : "login")}
          >{mode === "login"
            ? m.auth_create_account()
            : m.auth_sign_in()}</button
        >
      {/if}
      <p class="privacy">
        {m.auth_privacy_notice()}
      </p>
      <div class="assurance" aria-label={m.auth_access_safeguards()}>
        <span>{m.auth_no_tracking()}</span>
        <span>{m.auth_role_spaces()}</span>
      </div>
      <div class="language-row">
        <LocaleSelector />
      </div>
    </div>
  </section>
</main>

<style>
  .auth-shell {
    position: relative;
    min-height: 100svh;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    background: var(--color-background);
  }
  .auth-hero {
    position: relative;
    display: grid;
    min-width: 0;
    min-height: 100svh;
    align-content: center;
    justify-content: center;
    gap: clamp(2.5rem, 6vh, 4.5rem);
    padding: clamp(3rem, 7vw, 7rem);
    overflow: hidden;
    background:
      radial-gradient(
        circle at 15% 12%,
        rgb(104 196 255 / 28%),
        transparent 24rem
      ),
      radial-gradient(
        circle at 90% 80%,
        rgb(46 158 255 / 18%),
        transparent 28rem
      ),
      linear-gradient(145deg, var(--color-primary-surface), #09192b 72%);
  }
  .auth-hero::after {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgb(104 196 255 / 4%) 1px, transparent 1px),
      linear-gradient(90deg, rgb(104 196 255 / 4%) 1px, transparent 1px);
    background-size: 3rem 3rem;
    content: "";
    mask-image: linear-gradient(to bottom, transparent, #000 30%, #000);
    pointer-events: none;
  }
  .hero-copy {
    position: relative;
    z-index: 1;
    width: min(100%, 38rem);
  }
  .auth-hero h1 {
    max-width: 12ch;
    margin-bottom: var(--space-5);
    font-size: clamp(2.6rem, 4.4vw, 4.75rem);
    line-height: 0.98;
    letter-spacing: -0.055em;
  }
  .hero-copy > p:last-of-type {
    max-width: 43ch;
    margin-bottom: 0;
    color: #c3d6e8;
    font-size: 1.12rem;
  }
  .trust-row {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    margin: var(--space-8) 0 0;
    padding: 0;
    list-style: none;
  }
  .trust-row li {
    border: 1px solid rgb(104 196 255 / 15%);
    border-radius: 999px;
    padding: 0.38rem 0.7rem;
    color: #b9d7ee;
    background: rgb(7 17 31 / 35%);
    font-size: 0.75rem;
  }
  .auth-form-panel {
    position: relative;
    display: grid;
    min-width: 0;
    min-height: 100svh;
    place-items: center;
    padding: clamp(6.5rem, 10vh, 8rem) clamp(1.5rem, 7vw, 6rem)
      clamp(2rem, 5vh, 4rem);
    background:
      linear-gradient(rgb(104 196 255 / 3%) 1px, transparent 1px),
      linear-gradient(90deg, rgb(104 196 255 / 3%) 1px, transparent 1px),
      radial-gradient(
        circle at 78% 18%,
        rgb(46 158 255 / 16%),
        transparent 22rem
      ),
      var(--color-background);
    background-size:
      3.5rem 3.5rem,
      3.5rem 3.5rem,
      auto,
      auto;
    overflow: hidden;
  }
  .panel-orbit {
    position: absolute;
    border: 1px solid rgb(104 196 255 / 10%);
    border-radius: 50%;
    pointer-events: none;
  }
  .orbit-one {
    top: -12rem;
    right: -10rem;
    width: 32rem;
    height: 32rem;
  }
  .orbit-two {
    right: 12%;
    bottom: -15rem;
    width: 24rem;
    height: 24rem;
  }
  .auth-brand {
    position: absolute;
    z-index: 2;
    top: clamp(1.5rem, 4vw, 3rem);
    left: clamp(1.5rem, 4vw, 4rem);
    display: flex;
    align-items: center;
    gap: 0.7rem;
    color: var(--color-foreground);
    font-size: 1.15rem;
  }
  .brand-mark {
    display: grid;
    width: 46px;
    height: 46px;
    place-items: center;
    border: 1px solid rgb(104 196 255 / 20%);
    border-radius: 0.9rem;
    background: rgb(46 158 255 / 12%);
  }
  .auth-content {
    position: relative;
    z-index: 1;
    width: min(100%, 460px);
  }
  .auth-heading {
    margin-bottom: var(--space-6);
  }
  .auth-heading h2 {
    margin-bottom: var(--space-2);
    font-size: clamp(1.75rem, 3vw, 2.25rem);
  }
  .auth-heading p:last-child {
    margin-bottom: 0;
  }
  .google {
    width: 100%;
    border-color: #dbe7f3;
    background: #f4f8fc;
    color: #102038;
  }
  .divider {
    margin: var(--space-4);
    color: var(--color-muted);
    text-align: center;
  }
  .switch {
    width: 100%;
    margin-top: var(--space-4);
  }
  .privacy {
    margin: var(--space-6) 0 0;
    color: var(--color-muted);
    font-size: 0.8rem;
  }
  .assurance {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-4);
    margin-top: var(--space-3);
    color: #b7c9da;
    font-size: var(--font-size-xs);
  }
  .assurance span::before {
    margin-right: var(--space-2);
    color: var(--color-primary-soft);
    content: "✓";
  }
  .language-row {
    margin: var(--space-5) -0.25rem -0.5rem;
    border-top: var(--border);
    padding: var(--space-4) 0.25rem 0;
  }
  @media (max-width: 900px) {
    .auth-shell {
      grid-template-columns: 1fr;
    }
    .auth-hero {
      display: none;
    }
    .auth-form-panel {
      padding-inline: clamp(1rem, 6vw, 3rem);
    }
  }
  @media (max-width: 520px) {
    .auth-form-panel {
      place-items: start center;
      padding-top: 6.25rem;
    }
    .auth-brand {
      top: var(--space-6);
      left: var(--space-6);
    }
  }
</style>
