"use client";

import { useEffect, useState } from "react";
import { signInWithGoogle, supabase } from "../lib/supabase";
import { useLocale } from "../lib/i18n";

type AuthMethod = "password" | "otp";

const otpEnabled = import.meta.env.NEXT_PUBLIC_AUTH_EMAIL_OTP === "true";
const googleEnabled = import.meta.env.NEXT_PUBLIC_AUTH_GOOGLE === "true";

const copy = {
  it: {
    welcome: "Bentornato",
    subtitle: "Accedi al tuo spazio didattico in modo semplice e sicuro.",
    password: "Password",
    otp: "Codice via email",
    google: "Continua con Google",
    divider: "oppure",
    sendCode: "Invia codice",
    verifyCode: "Verifica e accedi",
    code: "Codice a 6 cifre",
    codeHint: "Ti invieremo un codice monouso. Non serve una password.",
    sent: "Codice inviato. Controlla la posta e inseriscilo qui.",
    resend: "Usa un’altra email",
    secure: "Accesso protetto da Supabase Auth",
    authError: "Non è stato possibile completare l’accesso. Riprova.",
  },
  en: {
    welcome: "Welcome back",
    subtitle: "Sign in to your learning space simply and securely.",
    password: "Password",
    otp: "Email code",
    google: "Continue with Google",
    divider: "or",
    sendCode: "Send code",
    verifyCode: "Verify and sign in",
    code: "6-digit code",
    codeHint: "We will email you a one-time code. No password needed.",
    sent: "Code sent. Check your inbox and enter it here.",
    resend: "Use another email",
    secure: "Authentication protected by Supabase Auth",
    authError: "We could not complete sign-in. Please try again.",
  },
} as const;

const defaultBranding = {
  login_title_it: "Il laboratorio Python della tua classe.",
  login_subtitle_it:
    "Crea esercizi, segui i progressi e accompagna ogni studente nel suo percorso.",
  login_title_en: "The Python lab for your classroom.",
  login_subtitle_en:
    "Create exercises, follow progress and support every student on their path.",
};

function isBranding(value: unknown): value is typeof defaultBranding {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return Object.keys(defaultBranding).every(
    (key) => typeof candidate[key] === "string",
  );
}

export function AuthScreenV2() {
  const { locale, setLocale, t } = useLocale();
  const text = copy[locale];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [method, setMethod] = useState<AuthMethod>("password");
  const [otpSent, setOtpSent] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [branding, setBranding] = useState(defaultBranding);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase
      .rpc("get_public_branding")
      .single()
      .then(({ data, error }) => {
        if (active && !error && isBranding(data)) setBranding(data);
      });
    return () => {
      active = false;
    };
  }, []);

  function resetFeedback() {
    setMessage("");
    setSuccess(false);
  }

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    resetFeedback();
    const result = registering
      ? await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name.trim() || null } },
        })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (registering && !result.data.session) {
      setSuccess(true);
      setMessage(
        locale === "it"
          ? "Controlla la tua email per confermare l’account."
          : "Check your email to confirm your account.",
      );
    }
  }

  async function submitOtp(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    resetFeedback();
    const result = otpSent
      ? await supabase.auth.verifyOtp({ email, token: otp, type: "email" })
      : await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false },
        });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (!otpSent) {
      setOtpSent(true);
      setSuccess(true);
      setMessage(text.sent);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    resetFeedback();
    try {
      const { error } = await signInWithGoogle();
      if (error) setMessage(error.message);
    } catch {
      setMessage(text.authError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-showcase" aria-label="PyClasse">
        <div className="auth-brand">
          <span className="brand-mark">&gt;_</span>
          <strong>PyClasse</strong>
        </div>
        <div className="auth-showcase-copy">
          <p className="eyebrow">PYTHON · CLASSROOM · TOGETHER</p>
          <h1>
            {locale === "it"
              ? branding.login_title_it
              : branding.login_title_en}
          </h1>
          <p>
            {locale === "it"
              ? branding.login_subtitle_it
              : branding.login_subtitle_en}
          </p>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-top">
          <div className="auth-brand auth-brand-mobile">
            <span className="brand-mark">&gt;_</span>
            <strong>PyClasse</strong>
          </div>
          <label className="language-picker">
            <span className="sr-only">Language</span>
            <span className="material-symbols-rounded" aria-hidden="true">
              language
            </span>
            <select
              aria-label="Language"
              value={locale}
              onChange={(event) => setLocale(event.target.value as "it" | "en")}
            >
              <option value="it">Italiano</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>

        <div className="auth-form-wrap">
          <header className="auth-heading">
            <p className="eyebrow">
              {registering ? t("createAccount") : t("signIn")}
            </p>
            <h2>{registering ? t("createAccount") : text.welcome}</h2>
            <p>{text.subtitle}</p>
          </header>

          {!registering && googleEnabled && (
            <>
              <button
                className="google-button"
                type="button"
                onClick={() => void handleGoogle()}
                disabled={busy}
              >
                <GoogleIcon /> {text.google}
              </button>
              <div className="auth-divider">
                <span>{text.divider}</span>
              </div>
            </>
          )}

          {!registering && otpEnabled && (
            <div
              className="auth-methods"
              role="tablist"
              aria-label={
                locale === "it" ? "Metodo di accesso" : "Sign-in method"
              }
            >
              <button
                type="button"
                role="tab"
                aria-selected={method === "password"}
                onClick={() => {
                  setMethod("password");
                  resetFeedback();
                }}
              >
                {text.password}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={method === "otp"}
                onClick={() => {
                  setMethod("otp");
                  resetFeedback();
                }}
              >
                {text.otp}
              </button>
            </div>
          )}

          {method === "otp" && !registering && otpEnabled ? (
            <form className="auth-form" onSubmit={submitOtp}>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  disabled={otpSent}
                  required
                />
              </label>
              {otpSent ? (
                <label>
                  {text.code}
                  <input
                    className="otp-input"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={otp}
                    onChange={(event) =>
                      setOtp(event.target.value.replace(/\D/g, ""))
                    }
                    required
                    autoFocus
                  />
                </label>
              ) : (
                <p className="field-hint">{text.codeHint}</p>
              )}
              {message && (
                <p
                  className={
                    success ? "auth-message success" : "auth-message error"
                  }
                  role={success ? "status" : "alert"}
                >
                  {message}
                </p>
              )}
              <button className="auth-submit" disabled={busy}>
                {busy ? t("wait") : otpSent ? text.verifyCode : text.sendCode}
              </button>
              {otpSent && (
                <button
                  className="auth-link"
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp("");
                    resetFeedback();
                  }}
                >
                  {text.resend}
                </button>
              )}
            </form>
          ) : (
            <form className="auth-form" onSubmit={submitPassword}>
              {registering && (
                <label>
                  {t("fullName")}
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    required
                  />
                </label>
              )}
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                {text.password}
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={
                    registering ? "new-password" : "current-password"
                  }
                  minLength={8}
                  required
                />
              </label>
              {message && (
                <p
                  className={
                    success ? "auth-message success" : "auth-message error"
                  }
                  role={success ? "status" : "alert"}
                >
                  {message}
                </p>
              )}
              <button className="auth-submit" disabled={busy}>
                {busy ? t("wait") : registering ? t("register") : t("signIn")}
              </button>
            </form>
          )}

          <p className="auth-switch">
            {registering
              ? locale === "it"
                ? "Hai già un account?"
                : "Already have an account?"
              : locale === "it"
                ? "Non hai ancora un account?"
                : "New to PyClasse?"}
            <button
              type="button"
              onClick={() => {
                setRegistering((value) => !value);
                setMethod("password");
                setOtpSent(false);
                resetFeedback();
              }}
            >
              {registering ? t("signIn") : t("createAccount")}
            </button>
          </p>
          <p className="auth-security">
            <span className="material-symbols-rounded">lock</span>
            {text.secure}
          </p>
        </div>
      </section>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg className="google-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.3h5.4a4.6 4.6 0 0 1-2 3v2.8h3.3c1.9-1.8 2.9-4.4 2.9-7.9Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.8c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.9A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.5 13.7a6 6 0 0 1 0-3.4v-3H3.1a10 10 0 0 0 0 9.3l3.4-2.9Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.2c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.4 2.8A5.9 5.9 0 0 1 12 6.2Z"
      />
    </svg>
  );
}
