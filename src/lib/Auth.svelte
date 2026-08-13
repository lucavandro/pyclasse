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
  <section class="auth-hero">
    <p class="eyebrow">PYTHON · CLASSROOM · TOGETHER</p>
    <h1>
      {locale === "en"
        ? branding?.login_title_en || "The Python lab for your classroom."
        : branding?.login_title_it || "Il laboratorio Python della tua classe."}
    </h1>
    <p>
      {locale === "en"
        ? branding?.login_subtitle_en ||
          "Create exercises, follow progress and support every student on their path."
        : branding?.login_subtitle_it ||
          "Crea esercizi, segui i progressi e accompagna ogni studente nel suo percorso."}
    </p>
  </section>
  <section class="auth-card">
    <div class="brand">
      <img src="/favicon.svg" alt="" width="48" height="48" /><strong
        >PyClasse</strong
      >
    </div>
    <label class="language"
      ><span class="sr-only">Language</span><select
        aria-label="Language"
        bind:value={locale}
        ><option value="it">Italiano</option><option value="en">English</option
        ></select
      ></label
    >
    <h2>{copy.title}</h2>
    <p>{copy.subtitle}</p>
    {#if otpEnabled}<div class="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={method === "password"}
          onclick={() => (method = "password")}>Password</button
        ><button
          role="tab"
          aria-selected={method === "otp"}
          onclick={() => (method = "otp")}>Codice via email</button
        >
      </div>{/if}
    {#if googleEnabled}<button
        class="google"
        onclick={() => void signInWithGoogle()}>Continua con Google</button
      >
      <div class="divider">oppure</div>{/if}
    <form
      onsubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      class="form-grid"
    >
      {#if mode === "register" && method === "password"}<label
          >{copy.name}<input
            aria-label={copy.name}
            autocomplete="name"
            bind:value={name}
            required
          /></label
        >{/if}
      <label
        >Email<input
          type="email"
          aria-label="Email"
          autocomplete="email"
          bind:value={email}
          required
        /></label
      >
      {#if method === "password"}<label
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
        >{/if}
      {#if otpSent}<label
          >Codice<input
            aria-label="Codice ricevuto"
            inputmode="numeric"
            autocomplete="one-time-code"
            bind:value={otp}
            required
          /></label
        >{/if}
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
    {#if method === "password"}<button
        class="quiet switch"
        onclick={() => (mode = mode === "login" ? "register" : "login")}
        >{mode === "login" ? copy.create : copy.login}</button
      >{/if}
    <p class="privacy">
      Accesso protetto. Nessun tracciamento o servizio esterno viene attivato
      automaticamente.
    </p>
  </section>
</main>

<style>
  .auth-shell {
    min-height: 100vh;
    display: grid;
    grid-template-columns: minmax(280px, 520px) minmax(320px, 440px);
    gap: clamp(2rem, 7vw, 7rem);
    place-items: center;
    padding: 1.5rem;
    background:
      radial-gradient(circle at 20% 10%, #bd93f925, transparent 30%),
      var(--color-background);
  }
  .auth-hero h1 {
    font-size: clamp(2rem, 5vw, 4rem);
    line-height: 1.06;
  }
  .auth-hero p:last-child {
    color: var(--color-muted);
    font-size: 1.12rem;
    max-width: 48ch;
  }
  .auth-card {
    position: relative;
    width: min(100%, 440px);
    background: var(--color-surface);
    border: var(--border);
    border-radius: 1.2rem;
    padding: 2rem;
    box-shadow: 0 25px 70px #0008;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    font-size: 1.25rem;
    margin-bottom: 2rem;
  }
  .language {
    position: absolute;
    right: 1.2rem;
    top: 1.2rem;
  }
  .language select {
    width: auto;
  }
  .google {
    width: 100%;
    background: var(--color-foreground);
    color: #222;
  }
  .divider {
    text-align: center;
    color: var(--color-muted);
    margin: 1rem;
  }
  .switch {
    width: 100%;
    margin-top: 1rem;
  }
  .privacy {
    font-size: 0.8rem;
    color: var(--color-muted);
    margin: 1.5rem 0 0;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }
  @media (max-width: 850px) {
    .auth-shell {
      grid-template-columns: 1fr;
    }
    .auth-hero {
      display: none;
    }
  }
</style>
