# Installazione e deployment di PyClasse

Ultima verifica: 1 agosto 2026.

## 1. Prerequisiti

- Git.
- Node.js 22.13 o successivo e npm.
- Un progetto Supabase.
- Un progetto Google Cloud per OAuth.
- Facoltativi: Docker e Supabase CLI per eseguire lo stack backend localmente.

Verifica l'ambiente:

```bash
node --version
npm --version
git --version
```

## 2. Installazione locale

```bash
git clone <URL_DEL_REPOSITORY>
cd <CARTELLA_DEL_PROGETTO>
npm install
```

Copia le variabili di esempio:

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

macOS/Linux:

```bash
cp .env.example .env.local
```

Avvia l'applicazione:

```bash
npm run dev
```

Apri l'indirizzo indicato dal terminale, normalmente `http://localhost:3000`.

## 3. Creazione del progetto Supabase

1. Crea un progetto dal pannello Supabase.
2. In **Project Settings → API** copia Project URL e chiave anon/publishable.
3. Inseriscile in `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://ID_PROGETTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=CHIAVE_PUBBLICA
```

La chiave pubblica può essere esposta al browser perché l'autorizzazione è affidata alle policy RLS. Non inserire mai la `service_role` in una variabile `NEXT_PUBLIC_*`.

### Applicazione dello schema

Per una prima installazione semplice:

1. apri **SQL Editor** in Supabase;
2. apri `supabase/schema.sql` nel progetto locale;
3. sostituisci `docente@scuola.it` con l'email Google dell'unico docente;
4. esegui l'intero script una sola volta;
5. controlla che tabelle, trigger, funzioni e policy siano stati creati.

In un progetto già popolato non rieseguire lo schema iniziale: crea migrazioni incrementali e prova prima su staging.

### Workflow consigliato con Supabase CLI

Richiede Docker in esecuzione:

```bash
npx supabase init
npx supabase start
npx supabase link --project-ref ID_PROGETTO
npx supabase db push --dry-run
npx supabase db push
```

Conserva le migrazioni in `supabase/migrations/`. `db reset` elimina e ricrea il database locale; `db reset --linked` è distruttivo sul progetto remoto e non deve essere usato in produzione.

## 4. Configurazione Google OAuth

1. Apri Google Cloud Console e crea o seleziona un progetto.
2. Configura la schermata di consenso OAuth.
3. Crea credenziali **OAuth client ID → Web application**.
4. In Google aggiungi come redirect autorizzato il callback mostrato nella pagina del provider Google di Supabase, normalmente:

```text
https://ID_PROGETTO.supabase.co/auth/v1/callback
```

5. In Supabase apri **Authentication → Providers → Google**, abilita il provider e inserisci Client ID e Client Secret.
6. In **Authentication → URL Configuration** configura:

```text
Site URL: https://TUO-DOMINIO
Redirect URLs:
http://localhost:3000/**
https://TUO-DOMINIO/**
```

Usa URL precisi in produzione. I wildcard sono comodi per anteprime, ma vanno limitati.

## 5. Configurazione dell'unico docente

Il ruolo non viene scelto dall'interfaccia. Il trigger confronta l'email Google con `public.app_settings.teacher_email`.

Configurazione iniziale nello schema:

```sql
insert into public.app_settings (singleton, teacher_email)
values (true, 'docente@scuola.it');
```

Modifica successiva dal SQL Editor:

```sql
update public.app_settings
set teacher_email = 'nome.cognome@scuola.it'
where singleton = true;
```

Usa l'indirizzo esatto restituito da Google. Se il docente aveva già effettuato l'accesso come studente, aggiorna il profilo soltanto dopo aver verificato che non esista un altro docente:

```sql
update public.profiles
set role = 'teacher'
where lower(email) = lower('nome.cognome@scuola.it');
```

## 6. IA e Pyodide

- Pyodide viene caricato dal browser e non richiede un server Python.
- Puter.js fornisce generazione e feedback IA senza una API key applicativa.
- Il primo utilizzo può richiedere allo studente di autorizzare Puter.
- Il codice inviato al servizio IA deve essere considerato dato trattato da un fornitore esterno: informare scuola, studenti e famiglie secondo le regole applicabili.
- Se Puter non è disponibile, il feedback pedagogico usa un fallback locale; una verifica IA non conclusa non abilita la consegna.

## 7. Test e verifica prima del deployment

Esegui:

```bash
npm test
```

Il comando crea la build e verifica routing, schema/RLS, gate della consegna, scadenze per classe, aggiornamenti centralizzati, watchdog, clipboard e feedback IA. Ogni test deve risultare `pass`.

Esegui anche una prova manuale:

1. login con email docente e con una seconda email studente;
2. creazione classe e iscrizione tramite codice;
3. creazione di un esercizio e assegnazione a due classi con scadenze differenti;
4. modifica centralizzata dell'esercizio;
5. esecuzione interattiva con uno o più `input()`;
6. prova di un ciclo infinito e verifica dell'interruzione;
7. test, consegna e controllo del report docente;
8. logout e apertura diretta delle rotte interne.

## 8. Deployment gratuito

### Opzione A — Cloudflare Workers

Il progetto usa vinext e produce un Worker compatibile Cloudflare.

1. Accedi a Cloudflare:

```bash
npx wrangler login
```

2. Registra in Cloudflare le stesse variabili pubbliche definite in `.env.local`, usando le impostazioni del progetto o il metodo previsto dalla pipeline.
3. Crea la build:

```bash
npm test
```

4. Pubblica con il flusso Cloudflare/vinext configurato per il repository. Se usi Git integration, imposta `npm run build` come build command e configura le variabili nel dashboard.
5. Aggiungi il dominio definitivo alle Redirect URLs di Supabase.

### Opzione B — Vercel

1. Importa il repository in Vercel.
2. Mantieni il framework rilevato e usa `npm run build`.
3. Aggiungi `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` nelle Environment Variables per Production e Preview.
4. Esegui il deployment.
5. Aggiungi il dominio Vercel definitivo alle Redirect URLs di Supabase e verifica Google OAuth.

Prima di scegliere Vercel verifica la compatibilità corrente di vinext; Cloudflare è la destinazione nativa della configurazione inclusa nel repository.

## 9. Controlli post-deployment

- Apri direttamente `/classes`, `/classes/1`, `/exercises` e `/settings` e ricarica la pagina.
- Verifica login e logout con il dominio di produzione.
- Controlla che un account studente non possa leggere test nascosti o dati di altre classi.
- Controlla che una modifica a un esercizio sia visibile in ogni classe assegnata senza duplicazioni.
- Controlla scadenza e stato di una consegna per la specifica classe.
- Consulta i log di hosting e Supabase senza registrare codice degli studenti o token.

## 10. Problemi comuni

### `redirect_uri_mismatch`

Il callback Supabase non coincide con quello registrato in Google. Copialo esattamente dalla configurazione del provider Google in Supabase.

### Il login torna alla pagina sbagliata

Controlla Site URL e Redirect URLs in Supabase, quindi verifica il dominio passato come `redirectTo`.

### L'utente docente appare come studente

Confronta l'email in `app_settings` con quella presente in `profiles`. Il ruolo viene assegnato alla creazione del profilo; per un profilo preesistente serve l'aggiornamento amministrativo descritto sopra.

### Accesso negato dal database

Non disabilitare RLS. Verifica appartenenza alla classe, proprietario docente e policy coinvolta usando un ambiente di staging.

### Pyodide o Puter non si caricano

Verifica rete, Content Security Policy e blocchi del browser. Pyodide e Puter sono dipendenze esterne caricate dal client.

### Una rotta interna restituisce 404

Verifica che il deployment includa la route catch-all `app/[...route]/page.tsx` e che sia stato creato con l'ultima build.
