# Architettura

Lo schema applicativo completo è definito dalla singola migrazione iniziale `supabase/migrations/20260801000000_initial_schema.sql`. Il progetto non è ancora pubblicato: le precedenti migrazioni incrementali sono state consolidate per mantenere equivalenti installazioni pulite e ambienti locali.

## Componenti

- **Web app:** Svelte 5 e SvelteKit, con adapter Cloudflare, routing file-based e chunk JavaScript/CSS distinti per rotta.
- **Dati e identità:** Supabase Auth, PostgreSQL, RLS e Realtime.
- **Editor Python:** CodeMirror caricato su richiesta; Pyodide eseguito in un Web Worker con watchdog di 8 secondi.
- **Contenuti:** Markdown/GFM senza HTML grezzo; risorse esterne solo HTTPS.
- **Hosting:** output Cloudflare Worker compatibile con asset Pyodide e icone self-hosted.

## Modello dati

`profiles` separa docente e studenti; `classes` e `class_members` gestiscono l'appartenenza; `exercises` contiene la traccia canonica; `class_assignments` aggiunge classe, ordine, scadenza e scala di voto opzionale (`10`, `100` o `NULL`); `tests` contiene i casi visibili; `submissions` contiene bozze, consegne, esiti e attribuzione dell'ultimo aggiornamento; `editor_sessions` conserva soltanto la presenza editor temporanea e il codice condivisibile durante Code now.

Le migrazioni incrementali sono l'unica fonte autorevole dello schema. Un'installazione pulita le applica tutte in ordine e non carica identità o dati didattici fittizi.

## Flussi

1. Il primo account di un database pulito diventa docente.
2. Il docente crea classe, esercizio, test e assegnazione.
3. Lo studente entra tramite `join_class`, una funzione atomica che non espone le altre classi.
4. L'editor salva la bozza e sincronizza gli interventi tramite Realtime; la presenza usa lease temporanee di un minuto, rinnovate mentre l'editor è aperto e chiuse esplicitamente in uscita.
5. Il browser esegue Python localmente; la consegna è accettata solo dopo i test visibili.
6. Il docente valuta la consegna, con voto opzionale separato dall'esito.
7. I report aggregano esclusivamente righe consentite da RLS; la pagina per
   singolo studente viene caricata soltanto per il ruolo docente e riusa profili,
   appartenenze, assegnazioni, aperture e consegne già esistenti.
8. L'archivio esporta contenuti didattici in un JSON locale versionato. In
   importazione il browser valida l'intero file prima delle scritture e rimuove
   gli esercizi creati nella stessa operazione se un inserimento fallisce.

## Prestazioni

Editor Python e parser Markdown sono suddivisi in chunk caricati soltanto nelle rispettive rotte. Ogni schermata legge da Supabase solo i domini necessari e applica le restrizioni RLS del ruolo autenticato. Gli indici coprono relazioni, tag, ordine propedeutico e monitoraggio Realtime; gli autosalvataggi sono ritardati per evitare una scrittura per battuta. Gli stili delle funzionalità sono definiti nei componenti Svelte e vengono estratti in CSS associato ai singoli chunk; `src/app.css` contiene soltanto token, reset e primitive condivise.

## Confini di sicurezza

Il browser usa esclusivamente la chiave anon e tutte le autorizzazioni dipendono da RLS. Test eseguiti nel browser non sono segreti: un grading autorevole richiede un judge isolato lato server. Le intestazioni di sicurezza riducono framing, MIME sniffing e accesso a capacità del dispositivo; la CSP permette `unsafe-eval` perché richiesto dal runtime Python e va rivalutata se Pyodide cambia modalità di esecuzione.

Le letture usano proiezioni esplicite e funzioni dati dedicate alla schermata.
Dashboard e report aggregati omettono il codice delle consegne; il dato viene
letto soltanto nel dettaglio studente, nell’editor e nel monitor. Le funzioni di
proprietà docente includono sempre anche la verifica del ruolo nel database.
