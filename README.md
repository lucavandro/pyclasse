# PyClasse

PyClasse è una piattaforma didattica **gratuita e accessibile** per assegnare esercizi Python, eseguirli nel browser e seguire il lavoro degli studenti in tempo reale. Il progetto è pensato per fornire uno strumento didattico senza costi per docenti e studenti. I dati applicativi provengono da Supabase: il frontend non contiene dataset mock e non usa `localStorage` come fonte autorevole.

## Funzioni principali

- classi con codice di iscrizione e ruoli docente/studente;
- esercizi con tracce Markdown, test, tag, risorse HTTPS e ordine propedeutico;
- scadenze per classe e archivio esercizi importabile/esportabile in JSON;
- esecuzione Python locale tramite Pyodide in un Web Worker con timeout;
- consegne senza voto o con voto in decimi/centesimi;
- autosalvataggio e monitoraggio docente tramite Supabase Realtime;
- report docente con dettaglio del lavoro per singolo studente;
- interfaccia italiano/inglese con rilevamento della lingua;
- autenticazione email/password, con OTP email e Google attivabili separatamente;
- Row Level Security su tutte le tabelle applicative;
- ambiente Docker e Supabase locale riproducibile.
- installazione come PWA, icone dedicate e fallback offline rispettoso della privacy.

## Avvio locale

Requisiti: Node.js 22.13+, npm e Docker Desktop.

```bash
npm ci
npm run supabase:start
npm run supabase:status
```

Copia `.env.example` in `.env.local` e inserisci l'API URL e la chiave anon locale mostrate da Supabase, quindi:

```bash
npm run supabase:reset
npm run dev
```

L'app è normalmente disponibile su `http://localhost:3000`; Supabase Studio su `http://127.0.0.1:54323`.

In alternativa, per avviare l'applicazione in Docker senza creare
`.env.local` (usa automaticamente le credenziali pubbliche standard del
Supabase locale):

```bash
docker compose up --build
```

Supabase locale deve essere già attivo (`npm run supabase:start`). I valori
predefiniti del Compose sono esclusivamente per lo sviluppo locale; un deploy
deve impostare le proprie variabili Supabase.

## Qualità e test

```bash
npm run check       # formato, lint, TypeScript, build e test applicativi
npm run test:db     # schema, RLS, indici, trigger e privilegi
npm run test:e2e    # flussi reali docente/studente con Playwright
```

`test:e2e` e `supabase:reset` ricreano il database locale: non eseguirli contro ambienti contenenti dati da conservare.

Il reset locale carica anche utenti, classi, esercizi, test e consegne fittizie.
Le credenziali e gli scenari disponibili sono descritti in
[Dati per lo sviluppo locale](docs/LOCAL_DEVELOPMENT_DATA.md).

## Documentazione

- [Requisiti di prodotto e criteri di accettazione](docs/PRODUCT_REQUIREMENTS.md)
- [Architettura](docs/ARCHITECTURE.md)
- [Installazione e deployment](docs/INSTALLATION_AND_DEPLOYMENT.md)
- [Funzioni didattiche](docs/LEARNING_AND_LOCALIZATION.md)
- [Linee guida stilistiche](docs/STYLE_GUIDE.md)
- [Progressive Web App](docs/PWA.md)
- [Dati e credenziali per lo sviluppo locale](docs/LOCAL_DEVELOPMENT_DATA.md)
- [Privacy, GDPR e limiti operativi](docs/PRIVACY_AND_DATA_PROTECTION.md)
- [Sicurezza e segnalazione vulnerabilità](SECURITY.md)
- [Contribuire](CONTRIBUTING.md)

## Stato e responsabilità

Il software include misure tecniche di privacy e sicurezza, ma la conformità GDPR dipende dal trattamento concreto e dalle misure organizzative dell'istituto. Prima di usare dati scolastici reali occorrono valutazione del titolare/DPO, informative, accordi con i fornitori, retention, procedure per i diritti e test dell'ambiente distribuito.

## Licenza

Copyleft © 2026 Luca Vandro.

PyClasse è distribuito con la [PyClasse Source-Available Noncommercial Copyleft License 1.0](LICENSE). Modifiche e ridistribuzioni devono restare gratuite, pubblicare il sorgente, mantenere la stessa licenza e attribuire l'autore originale. La restrizione commerciale rende questa licenza non approvata OSI.
