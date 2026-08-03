"use client";

import { useEffect, useState } from "react";
import { detectLocale } from "./i18n-core.mjs";

export type Locale = "it" | "en";

const messages = {
  it: {
    overview: "Panoramica",
    classes: "Classi",
    exercises: "Esercizi",
    report: "Report",
    settings: "Impostazioni",
    teacher: "Docente",
    student: "Studente",
    signIn: "Accedi",
    createAccount: "Crea account",
    fullName: "Nome completo",
    wait: "Attendi…",
    register: "Registrati",
    haveAccount: "Ho già un account",
    retry: "Riprova",
    newClass: "Nuova classe",
    newExercise: "Nuovo esercizio",
  },
  en: {
    overview: "Overview",
    classes: "Classes",
    exercises: "Exercises",
    report: "Reports",
    settings: "Settings",
    teacher: "Teacher",
    student: "Student",
    signIn: "Sign in",
    createAccount: "Create account",
    fullName: "Full name",
    wait: "Please wait…",
    register: "Register",
    haveAccount: "I already have an account",
    retry: "Retry",
    newClass: "New class",
    newExercise: "New exercise",
  },
} as const;

export type MessageKey = keyof typeof messages.it;
export const translate = (locale: Locale, key: MessageKey) =>
  messages[locale][key];

export function useLocale() {
  const [locale, setLocale] = useState<Locale>("it");
  useEffect(() => {
    const detected = detectLocale(
      navigator.languages?.[0] ?? navigator.language,
    );
    // Locale detection happens only after hydration because navigator is browser-only.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocale(detected);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return { locale, setLocale, t: (key: MessageKey) => translate(locale, key) };
}
