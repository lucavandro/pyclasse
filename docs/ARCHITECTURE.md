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
2. Nello script, sostituire `docente@scuola.it` con l'email Google dell'unico docente. La tabella `app_settings` non è leggibile dal browser e un indice garantisce che esista al massimo un profilo docente.
3. Abilitare Google in Authentication → Providers e configurare client ID/secret.
4. Copiare `.env.example` in `.env.local` e inserire URL e anon key.
5. Aggiungere fra i redirect autorizzati l’URL locale e quello di produzione.

### Cambiare successivamente l'email del docente

Eseguire nel SQL Editor di Supabase, sostituendo l'indirizzo:

```sql
begin;
update public.profiles set role = 'student' where role = 'teacher';
update public.app_settings set teacher_email = lower('nuovo-docente@scuola.it') where singleton = true;
update public.profiles set role = 'teacher' where lower(email) = lower('nuovo-docente@scuola.it');
commit;
```

Gli utenti normali non possono modificare `role`: il controllo è applicato nel database, non nell'interfaccia.
