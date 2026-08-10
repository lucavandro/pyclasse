# Architettura

## Componenti

- **Web app:** React/Next tramite vinext, interfaccia responsive e routing client.
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
4. L'editor salva la bozza e sincronizza gli interventi tramite Realtime, con polling breve di recupero dopo una disconnessione.
5. Il browser esegue Python localmente; la consegna è accettata solo dopo i test visibili.
6. Il docente valuta la consegna, con voto opzionale separato dall'esito.

## Prestazioni

Editor Python e parser Markdown sono suddivisi in chunk caricati solo nella schermata dell'esercizio. Le query iniziali sono parallele, gli indici coprono relazioni, tag, ordine propedeutico e monitoraggio Realtime. Gli autosalvataggi sono ritardati per evitare una scrittura per battuta.

## Confini di sicurezza

Il browser usa esclusivamente la chiave anon e tutte le autorizzazioni dipendono da RLS. Test eseguiti nel browser non sono segreti: un grading autorevole richiede un judge isolato lato server. Le intestazioni di sicurezza riducono framing, MIME sniffing e accesso a capacità del dispositivo; la CSP permette `unsafe-eval` perché richiesto dal runtime Python e va rivalutata se Pyodide cambia modalità di esecuzione.
