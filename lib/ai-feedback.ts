type FeedbackKind = "runtime" | "tests" | "timeout";

type PuterResponse = string | { message?: { content?: string }; text?: string };
type PuterClient = { ai: { chat(prompt: string): Promise<PuterResponse> } };

declare global {
  interface Window {
    puter?: PuterClient;
  }
}

function localFeedback(kind: FeedbackKind, details: string) {
  const text = details.toLowerCase();
  if (kind === "timeout")
    return "Il programma ha continuato a lavorare oltre il limite previsto. Questo comportamento è spesso associato a un ciclo la cui condizione non diventa mai falsa, oppure a un’elaborazione che cresce più del previsto. Osserva quali valori cambiano a ogni iterazione e in quale situazione il ciclo dovrebbe terminare.";
  if (text.includes("syntaxerror"))
    return "Python non è riuscito a interpretare la struttura del programma. L’errore riguarda la forma sintattica delle istruzioni vicino alla riga indicata, prima ancora della loro esecuzione.";
  if (text.includes("nameerror"))
    return "Il programma ha fatto riferimento a un nome che in quel punto non risulta definito. È utile osservare l’ordine di esecuzione e l’ambito in cui variabili e funzioni vengono create.";
  if (text.includes("typeerror"))
    return "Un’operazione ha ricevuto un tipo di dato non compatibile con ciò che si aspettava. Confronta i tipi dei valori coinvolti e il significato dell’operazione che li combina.";
  if (text.includes("indexerror"))
    return "Il programma ha provato ad accedere a una posizione che non esiste nella sequenza. Osserva la relazione tra gli indici prodotti dal codice e la lunghezza effettiva della struttura dati.";
  if (kind === "tests")
    return "Alcuni casi verificati producono un comportamento diverso da quello richiesto. La soluzione funziona in parte: osserva soprattutto i casi limite, i valori negativi o vuoti e le condizioni in cui un ramo del programma viene eseguito oppure saltato.";
  return "L’esecuzione si è interrotta perché Python ha incontrato una condizione non valida. Il tipo di eccezione descrive la natura del problema, mentre la riga indicata identifica il punto in cui il programma non ha potuto proseguire.";
}

function loadPuter(): Promise<PuterClient> {
  return new Promise<PuterClient>((resolve, reject) => {
    if (window.puter?.ai) return resolve(window.puter);
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-pyclasse-puter]",
    );
    if (existing) {
      existing.addEventListener(
        "load",
        () =>
          window.puter
            ? resolve(window.puter)
            : reject(new Error("Puter non disponibile")),
        { once: true },
      );
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.puter.com/v2/";
    script.async = true;
    script.dataset.pyclassePuter = "true";
    script.onload = () =>
      window.puter
        ? resolve(window.puter)
        : reject(new Error("Puter non disponibile"));
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function extractText(response: PuterResponse) {
  if (typeof response === "string") return response;
  return response?.message?.content || response?.text || "";
}

function containsDirectSolution(text: string) {
  return /```|\bsostituisci\b|\bdevi (?:scrivere|usare|cambiare|aggiungere|rimuovere)\b|\bcorreggi (?:con|così)\b/i.test(
    text,
  );
}

export async function getPedagogicalFeedback(
  kind: FeedbackKind,
  details: string,
  code: string,
  allowExternalAi = false,
) {
  const fallback = localFeedback(kind, details);
  if (!allowExternalAi) return fallback;
  try {
    const puter = await loadPuter();
    const prompt = `Sei un tutor di programmazione Python per studenti. Rispondi in italiano in massimo 90 parole. Spiega soltanto la natura dell'errore o del comportamento osservato e quali concetti lo studente dovrebbe analizzare autonomamente. Non indicare modifiche da fare, non fornire codice, non rivelare output attesi, non dare la soluzione e non usare elenchi di istruzioni.\n\nTipo evento: ${kind}\nDettagli: ${details.slice(0, 1800)}\nCodice dello studente:\n${code.slice(0, 5000)}`;
    const response = await puter.ai.chat(prompt);
    const feedback = extractText(response).trim();
    if (!feedback || containsDirectSolution(feedback)) return fallback;
    return feedback;
  } catch {
    return fallback;
  }
}

export async function verifySolutionWithAi(
  problem: string,
  code: string,
  allowExternalAi = false,
) {
  if (!allowExternalAi) {
    return {
      passed: false,
      feedback:
        "La verifica IA esterna è disattivata. Puoi abilitarla dalle impostazioni privacy dopo aver letto quali dati vengono inviati a Puter.",
    };
  }
  try {
    const puter = await loadPuter();
    const prompt = `Valuta una soluzione Python rispetto alla consegna. Rispondi ESCLUSIVAMENTE con JSON valido nel formato {"passed":boolean,"feedback":"testo"}. passed è true soltanto se il codice soddisfa interamente la consegna e i vincoli. Il feedback è in italiano, massimo 70 parole: descrive soltanto la natura di eventuali discrepanze e i concetti da osservare. Non fornire codice, modifiche puntuali, soluzione, output attesi o casi di test segreti.\n\nConsegna:\n${problem.slice(0, 2500)}\n\nCodice:\n${code.slice(0, 5000)}`;
    const response = await puter.ai.chat(prompt);
    const raw = extractText(response)
      .trim()
      .replace(/^```json\s*|\s*```$/g, "");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object")
      throw new Error("Risposta IA non valida");
    const result = parsed as Record<string, unknown>;
    const feedback = String(result.feedback || "").trim();
    if (containsDirectSolution(feedback))
      return {
        passed: false,
        feedback: localFeedback("tests", "Verifica IA non conclusiva"),
      };
    return {
      passed: result.passed === true,
      feedback:
        feedback || localFeedback("tests", "Verifica IA non conclusiva"),
    };
  } catch {
    return {
      passed: false,
      feedback:
        "La verifica IA non è disponibile in questo momento. La soluzione non viene considerata superata finché non sarà possibile completare una nuova verifica.",
    };
  }
}

export type GeneratedExercise = {
  title: string;
  description: string;
  starterCode: string;
  constraints: string;
  maxPoints: number;
  tests: { input: string; expected: string }[];
};

export async function generateExerciseWithAi(
  userPrompt: string,
  allowExternalAi = false,
): Promise<GeneratedExercise> {
  const fallback: GeneratedExercise = {
    title: "Conta le parole lunghe",
    description:
      "Scrivi una funzione conta_lunghe(parole, n) che restituisca quante parole hanno una lunghezza maggiore di n.",
    starterCode:
      "def conta_lunghe(parole, n):\n    # Scrivi qui la tua soluzione\n    pass",
    constraints:
      "La lista contiene da 0 a 100 parole; n è un intero non negativo.",
    maxPoints: 100,
    tests: [
      {
        input: "conta_lunghe(['casa', 'programmazione', 'sole'], 4)",
        expected: "1",
      },
      { input: "conta_lunghe([], 3)", expected: "0" },
      { input: "conta_lunghe(['uno', 'due'], 3)", expected: "0" },
    ],
  };
  if (!allowExternalAi) return fallback;
  try {
    const puter = await loadPuter();
    const prompt = `Genera un esercizio didattico Python a partire dalla richiesta del docente. Rispondi ESCLUSIVAMENTE con JSON valido nel formato {"title":"","description":"","starterCode":"","constraints":"","maxPoints":100,"tests":[{"input":"chiamata o input","expected":"output"}]}. Crea tra 3 e 6 test, includendo casi normali e limite. Non inserire la soluzione nel codice iniziale. Lingua italiana.\n\nRichiesta: ${userPrompt.slice(0, 1800)}`;
    const response = await puter.ai.chat(prompt);
    const raw = extractText(response)
      .trim()
      .replace(/^```json\s*|\s*```$/g, "");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    const result = parsed as Record<string, unknown>;
    if (
      !result.title ||
      !result.description ||
      !Array.isArray(result.tests) ||
      result.tests.length < 1
    )
      return fallback;
    return {
      title: String(result.title).slice(0, 120),
      description: String(result.description).slice(0, 2500),
      starterCode: String(result.starterCode || "").slice(0, 5000),
      constraints: String(result.constraints || "").slice(0, 1200),
      maxPoints: Math.max(1, Math.min(1000, Number(result.maxPoints) || 100)),
      tests: result.tests.slice(0, 8).map((test: unknown) => {
        const item =
          test && typeof test === "object"
            ? (test as Record<string, unknown>)
            : {};
        return {
          input: String(item.input || ""),
          expected: String(item.expected || ""),
        };
      }),
    };
  } catch {
    return fallback;
  }
}

export async function getStudentOverviewWithAi(
  summary: string,
  allowExternalAi = false,
) {
  if (!allowExternalAi)
    return "L’overview IA è disponibile solo quando il docente abilita esplicitamente i servizi IA nelle impostazioni.";
  try {
    const puter = await loadPuter();
    const response = await puter.ai.chat(
      `Sei un supporto didattico per un docente. Analizza esclusivamente le metriche aggregate e anonime fornite. Scrivi in italiano un overview professionale di massimo 120 parole con andamento generale e 2 consigli pedagogici prudenti. Non formulare diagnosi, non inventare cause e non usare dati esterni.\n\nMetriche:\n${summary.slice(0, 3000)}`,
    );
    return extractText(response).trim() || "Overview non disponibile.";
  } catch {
    return "Il servizio IA non è disponibile in questo momento.";
  }
}
