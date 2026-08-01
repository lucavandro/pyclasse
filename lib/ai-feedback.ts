type FeedbackKind = "runtime" | "tests" | "timeout";

function localFeedback(kind: FeedbackKind, details: string) {
  const text = details.toLowerCase();
  if (kind === "timeout") return "Il programma ha continuato a lavorare oltre il limite previsto. Questo comportamento è spesso associato a un ciclo la cui condizione non diventa mai falsa, oppure a un’elaborazione che cresce più del previsto. Osserva quali valori cambiano a ogni iterazione e in quale situazione il ciclo dovrebbe terminare.";
  if (text.includes("syntaxerror")) return "Python non è riuscito a interpretare la struttura del programma. L’errore riguarda la forma sintattica delle istruzioni vicino alla riga indicata, prima ancora della loro esecuzione.";
  if (text.includes("nameerror")) return "Il programma ha fatto riferimento a un nome che in quel punto non risulta definito. È utile osservare l’ordine di esecuzione e l’ambito in cui variabili e funzioni vengono create.";
  if (text.includes("typeerror")) return "Un’operazione ha ricevuto un tipo di dato non compatibile con ciò che si aspettava. Confronta i tipi dei valori coinvolti e il significato dell’operazione che li combina.";
  if (text.includes("indexerror")) return "Il programma ha provato ad accedere a una posizione che non esiste nella sequenza. Osserva la relazione tra gli indici prodotti dal codice e la lunghezza effettiva della struttura dati.";
  if (kind === "tests") return "Alcuni casi verificati producono un comportamento diverso da quello richiesto. La soluzione funziona in parte: osserva soprattutto i casi limite, i valori negativi o vuoti e le condizioni in cui un ramo del programma viene eseguito oppure saltato.";
  return "L’esecuzione si è interrotta perché Python ha incontrato una condizione non valida. Il tipo di eccezione descrive la natura del problema, mentre la riga indicata identifica il punto in cui il programma non ha potuto proseguire.";
}

function loadPuter() {
  return new Promise<any>((resolve, reject) => {
    if ((window as any).puter?.ai) return resolve((window as any).puter);
    const existing = document.querySelector<HTMLScriptElement>('script[data-pyclasse-puter]');
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).puter), { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.puter.com/v2/";
    script.async = true;
    script.dataset.pyclassePuter = "true";
    script.onload = () => resolve((window as any).puter);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function extractText(response: any) {
  if (typeof response === "string") return response;
  return response?.message?.content || response?.text || "";
}

function containsDirectSolution(text: string) {
  return /```|\bsostituisci\b|\bdevi (?:scrivere|usare|cambiare|aggiungere|rimuovere)\b|\bcorreggi (?:con|così)\b/i.test(text);
}

export async function getPedagogicalFeedback(kind: FeedbackKind, details: string, code: string) {
  const fallback = localFeedback(kind, details);
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

export async function verifySolutionWithAi(problem: string, code: string) {
  try {
    const puter = await loadPuter();
    const prompt = `Valuta una soluzione Python rispetto alla consegna. Rispondi ESCLUSIVAMENTE con JSON valido nel formato {"passed":boolean,"feedback":"testo"}. passed è true soltanto se il codice soddisfa interamente la consegna e i vincoli. Il feedback è in italiano, massimo 70 parole: descrive soltanto la natura di eventuali discrepanze e i concetti da osservare. Non fornire codice, modifiche puntuali, soluzione, output attesi o casi di test segreti.\n\nConsegna:\n${problem.slice(0, 2500)}\n\nCodice:\n${code.slice(0, 5000)}`;
    const response = await puter.ai.chat(prompt);
    const raw = extractText(response).trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(raw);
    const feedback = String(parsed.feedback || "").trim();
    if (containsDirectSolution(feedback)) return { passed: false, feedback: localFeedback("tests", "Verifica IA non conclusiva") };
    return { passed: parsed.passed === true, feedback: feedback || localFeedback("tests", "Verifica IA non conclusiva") };
  } catch {
    return { passed: false, feedback: "La verifica IA non è disponibile in questo momento. La soluzione non viene considerata superata finché non sarà possibile completare una nuova verifica." };
  }
}
