# PyClasse — architettura MVP

## Componenti

- **Interfaccia:** app responsive con dashboard docente/studente, CodeMirror e worker Pyodide.
- **Autenticazione:** Supabase Auth con provider Google; il trigger SQL crea il profilo.
- **Dati:** Postgres Supabase con RLS per separare docenti, studenti e classi.
- **Grading:** il worker esegue Python nel browser, limita il tempo e restituisce stdout/errori. Nell’MVP l’esito viene poi salvato in `submissions`.
- **Hosting:** frontend statico/edge compatibile con hosting gratuito. Pyodide viene caricato da CDN.

## Flussi principali

1. Il docente entra con Google, crea una classe e condivide `join_code`.
2. Lo studente entra con Google e invoca `join_class(code)`.
3. Il docente crea un esercizio, aggiunge test e lo collega a una classe.
4. Lo studente modifica la bozza, esegue in Pyodide e consegna.
5. Il docente legge le consegne e aggrega completamento, punteggio e ritardi.

## Nota di sicurezza

I test eseguiti nel browser non sono realmente segreti. La RLS impedisce comunque agli studenti di leggere le righe `tests.is_hidden = true`; per un grading blindato futuro, l’esecuzione e i test nascosti devono passare a un judge isolato lato server.

## Attivazione Supabase

1. Creare un progetto Supabase e incollare `supabase/schema.sql` nel SQL Editor.
2. Abilitare Google in Authentication → Providers e configurare client ID/secret.
3. Copiare `.env.example` in `.env.local` e inserire URL e anon key.
4. Aggiungere fra i redirect autorizzati l’URL locale e quello di produzione.
