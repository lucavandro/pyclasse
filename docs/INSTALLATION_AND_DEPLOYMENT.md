# Installazione e deployment

## Sviluppo locale

Requisiti: Node.js 22.13+, npm e Docker Desktop.

```bash
npm ci
npm run supabase:start
npm run supabase:status
```

Copia `.env.example` in `.env.local` e usa API URL e anon key restituite da Supabase. Non inserire mai una chiave `service_role` in variabili `NEXT_PUBLIC_*`.

```bash
npm run supabase:reset
npm run dev
```

Il primo account registrato in un database pulito diventa docente; i successivi diventano studenti. Le migrazioni si trovano in `supabase/migrations/` e vengono applicate in ordine durante il reset.

## Applicazione in Docker

Avvia prima lo stack Supabase locale, quindi l'app:

```bash
npm run supabase:start
docker compose up --build
```

Non occorre creare `.env.local`: Compose usa l'URL e la chiave anon pubblica
standard generati da Supabase CLI. È possibile sovrascriverli tramite
`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Questi valori
predefiniti sono locali e non devono essere riutilizzati in produzione.

Il container usa un utente non privilegiato e monta il sorgente per lo sviluppo. Dopo una modifica a `package-lock.json`, ricrea il volume delle dipendenze:

```bash
docker compose down --volumes
docker compose up --build
```

## Supabase remoto

Collega il progetto, controlla il piano e applica le migrazioni solo dopo una prova su staging:

```bash
npx supabase link --project-ref ID_PROGETTO
npx supabase db push --dry-run
npx supabase db push
```

Configura nel provider di hosting `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`, quindi aggiungi il dominio definitivo alle Redirect URLs di Supabase Auth. Non usare `db reset --linked` su un database da conservare.

### Collegamento al pannello Supabase

La schermata Impostazioni mostra al solo docente un collegamento a Supabase
Studio. In sviluppo punta automaticamente allo Studio locale. In un deployment
è opt-in e si abilita con, per esempio:

```env
NEXT_PUBLIC_SUPABASE_STUDIO_URL=https://supabase.com/dashboard/project/ID-PROGETTO
```

Il collegamento è sicuro perché non contiene token, password o chiavi e il
pannello remoto richiede comunque l'autenticazione Supabase dell'amministratore.
PyClasse accetta soltanto HTTPS; HTTP è consentito esclusivamente per
`localhost` e `127.0.0.1`. URL con credenziali incorporate vengono ignorati. Non
usare link condivisi che effettuino accesso automatico o contengano segreti.

### Metodi di accesso

Il login email/password è sempre disponibile. Gli altri metodi sono opt-in e
restano nascosti finché non vengono abilitati esplicitamente:

```env
NEXT_PUBLIC_AUTH_EMAIL_OTP=true
NEXT_PUBLIC_AUTH_GOOGLE=true
```

È possibile attivarne uno solo o entrambi. Dopo la modifica ricrea/riavvia il
container o ridistribuisci l'applicazione. In Docker i valori predefiniti sono
`false`; possono essere inseriti in `.env.local` oppure passati nell'ambiente.

Email/password ed email OTP usano Supabase Auth e non richiedono provider
OAuth esterni. Per consentire l'accesso OTP verifica che il template email mostri
`{{ .Token }}` (oltre all'eventuale magic link) e configura un SMTP affidabile
in produzione.

Per Google, crea credenziali OAuth 2.0 in Google Cloud, abilita il provider in
Supabase **Authentication → Providers → Google** e configura come callback
quella mostrata da Supabase (normalmente
`https://ID-PROGETTO.supabase.co/auth/v1/callback`). Inserisci Client ID e
Client Secret soltanto nei secret del servizio, mai nel repository. In locale
la sezione `[auth.external.google]` è presente ma disabilitata; per abilitarla
imposta `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` e
`SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, modifica `enabled = true` e riavvia
Supabase.

Aggiungi inoltre `https://DOMINIO/auth/callback` alle Redirect URLs consentite
del progetto Supabase: è la destinazione usata da PyClasse dopo l'accesso.

Se le variabili mancano, PyClasse mostra una pagina di installazione con i nomi
esatti da configurare, il percorso per reperirli in Supabase e i passaggi per
migrazioni, redirect di autenticazione e riavvio. La pagina non richiede e non
accetta mai chiavi privilegiate.

## Deployment

La build è compatibile con Cloudflare/vinext. Prima di pubblicare:

```bash
npm ci
npm run check
npm run test:db
npm run test:e2e
```

Configura le variabili nel provider, pubblica la build e verifica login, rotte interne, RLS e Realtime sul dominio definitivo. I test E2E devono usare esclusivamente un progetto di test perché azzerano il database configurato.

## Controlli post-deployment

- ricarica direttamente `/classes`, `/exercises`, `/reports/valutazioni`, `/reports/avanzamento`, `/reports/classi`, `/reports/alert` e `/settings`;
- verifica che uno studente non legga classi, test nascosti o consegne altrui;
- prova autosalvataggio e intervento docente con due sessioni;
- verifica che `/manifest.webmanifest`, `/sw.js` e `/offline.html` rispondano
  dalla stessa origine e che il browser proponga l'installazione PWA su HTTPS;
- controlla CSP e intestazioni di sicurezza;
- verifica backup, ripristino, retention e log senza codice o token.
