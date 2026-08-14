<script lang="ts">
  import { supabase, signInWithGoogle } from "$lib/supabase";
  let mode = $state<"login" | "register">("login");
  let method = $state<"password" | "otp">("password");
  let name = $state(""),
    email = $state(""),
    password = $state(""),
    otp = $state(""),
    otpSent = $state(false),
    busy = $state(false),
    error = $state("");
  let locale = $state(
    typeof navigator !== "undefined" && navigator.language.startsWith("en")
      ? "en"
      : "it",
  );
  let branding = $state<any>(null);
  const otpEnabled = import.meta.env.NEXT_PUBLIC_AUTH_EMAIL_OTP === "true";
  const googleEnabled = import.meta.env.NEXT_PUBLIC_AUTH_GOOGLE === "true";
  $effect(() => {
    if (supabase)
      void supabase
        .rpc("get_public_branding")
        .then(({ data }) => (branding = data?.[0] ?? data));
  });
  const copy = $derived(
    locale === "en"
      ? {
          title: "Welcome back",
          subtitle: "Sign in to continue learning.",
          login: "Sign in",
          create: "Create account",
          register: "Register",
          name: "Full name",
          password: "Password",
          send: "Send code",
        }
      : {
          title: "Bentornato",
          subtitle: "Accedi per continuare a imparare.",
          login: "Accedi",
          create: "Crea account",
          register: "Registrati",
          name: "Nome completo",
          password: "Password",
          send: "Invia codice",
        },
  );
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
      error = cause instanceof Error ? cause.message : String(cause);
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
      <p class="eyebrow">PYTHON · CLASSROOM · TOGETHER</p>
      <h1 id="auth-hero-title">
        {locale === "en"
          ? branding?.login_title_en || "The Python lab for your classroom."
          : branding?.login_title_it ||
            "Il laboratorio Python della tua classe."}
      </h1>
      <p>
        {locale === "en"
          ? branding?.login_subtitle_en ||
            "Create exercises, follow progress and support every student on their path."
          : branding?.login_subtitle_it ||
            "Crea esercizi, segui i progressi e accompagna ogni studente nel suo percorso."}
      </p>
      <ul
        class="trust-row"
        aria-label={locale === "en" ? "Benefits" : "Vantaggi"}
      >
        <li>{locale === "en" ? "Protected space" : "Ambiente protetto"}</li>
        <li>
          {locale === "en" ? "Python in the browser" : "Python nel browser"}
        </li>
        <li>Privacy by default</li>
      </ul>
    </div>
    <div class="code-preview" aria-hidden="true">
      <div class="code-toolbar"><span></span><span></span><span></span></div>
      <pre><code
          ><span class="code-keyword">def</span> <span class="code-function"
            >impara</span
          >(insieme):
    curiosità = <span class="code-string">"infinita"</span>
    <span class="code-keyword">return</span> insieme + curiosità</code
        ></pre>
    </div>
  </section>

  <section class="auth-form-panel" aria-labelledby="auth-form-title">
    <div class="auth-card">
      <div class="auth-heading">
        <p class="eyebrow">
          {locale === "en" ? "YOUR SPACE" : "IL TUO SPAZIO"}
        </p>
        <h2 id="auth-form-title">{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </div>

      {#if otpEnabled}
        <div class="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={method === "password"}
            onclick={() => (method = "password")}>Password</button
          ><button
            role="tab"
            aria-selected={method === "otp"}
            onclick={() => (method = "otp")}>Codice via email</button
          >
        </div>
      {/if}

      {#if googleEnabled}
        <button class="google" onclick={() => void signInWithGoogle()}
          >Continua con Google</button
        >
        <div class="divider">oppure</div>
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
            >{copy.name}<input
              aria-label={copy.name}
              autocomplete="name"
              bind:value={name}
              required
            /></label
          >
        {/if}
        <label
          >Email<input
            type="email"
            aria-label="Email"
            autocomplete="email"
            bind:value={email}
            required
          /></label
        >
        {#if method === "password"}
          <label
            >{copy.password}<input
              type="password"
              aria-label={copy.password}
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
            >Codice<input
              aria-label="Codice ricevuto"
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
              ? "Verifica codice"
              : copy.send
            : mode === "login"
              ? copy.login
              : copy.register}</button
        >
      </form>
      {#if method === "password"}
        <button
          class="quiet switch"
          onclick={() => (mode = mode === "login" ? "register" : "login")}
          >{mode === "login" ? copy.create : copy.login}</button
        >
      {/if}
      <p class="privacy">
        Accesso protetto. Nessun tracciamento o servizio esterno viene attivato
        automaticamente.
      </p>
      <div class="language-row">
        <label class="language"
          ><span
            >{locale === "en"
              ? "Interface language"
              : "Lingua dell’interfaccia"}</span
          ><select aria-label="Language" bind:value={locale}
            ><option value="it">Italiano</option><option value="en"
              >English</option
            ></select
          ></label
        >
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
  .hero-copy,
  .code-preview {
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
  .code-preview {
    border: 1px solid rgb(104 196 255 / 18%);
    border-radius: var(--radius-lg);
    overflow: hidden;
    background: rgb(7 17 31 / 68%);
    box-shadow: var(--shadow-lg);
  }
  .code-toolbar {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-4);
    border-bottom: 1px solid rgb(104 196 255 / 12%);
    background: rgb(255 255 255 / 3%);
  }
  .code-toolbar span {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
    background: var(--color-border-strong);
  }
  .code-toolbar span:nth-child(2) {
    background: var(--color-primary-strong);
  }
  .code-toolbar span:nth-child(3) {
    background: var(--color-primary-soft);
  }
  .code-preview pre {
    margin: 0;
    padding: clamp(1.25rem, 3vw, 2rem);
    overflow-x: auto;
    color: #dce7f4;
    font-family: var(--font-code);
    font-size: clamp(0.8rem, 1.15vw, 0.95rem);
    line-height: 1.8;
  }
  .code-keyword {
    color: var(--color-primary-soft);
  }
  .code-function {
    color: var(--color-green);
  }
  .code-string {
    color: var(--color-yellow);
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
      radial-gradient(
        circle at 100% 0%,
        rgb(46 158 255 / 8%),
        transparent 24rem
      ),
      var(--color-background);
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
  .auth-card {
    width: min(100%, 460px);
    border: var(--border-strong);
    border-radius: 1.4rem;
    padding: clamp(1.5rem, 4vw, 2.25rem);
    background: linear-gradient(
      145deg,
      rgb(21 36 58 / 76%),
      rgb(15 28 46 / 82%)
    );
    box-shadow: var(--shadow-lg);
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
  .language-row {
    margin: var(--space-5) -0.25rem -0.5rem;
    border-top: var(--border);
    padding: var(--space-4) 0.25rem 0;
  }
  .language {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    color: var(--color-muted);
    font-size: var(--font-size-xs);
  }
  .language select {
    width: auto;
    min-width: 7.5rem;
    min-height: 2.35rem;
    padding-block: 0.4rem;
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
    .auth-card {
      border-color: rgb(54 81 111 / 60%);
      padding: var(--space-6);
      box-shadow: var(--shadow-md);
    }
    .auth-brand {
      top: var(--space-6);
      left: var(--space-6);
    }
  }
</style>
