# Dati per lo sviluppo locale

Il comando `npm run supabase:reset` carica automaticamente un ambiente fittizio
completo tramite `supabase/seed.sql`. Il dataset usa esclusivamente il dominio
riservato `pyclasse.test` e non contiene dati personali reali.

## Credenziali

| Ruolo    | Email                    | Password       | Profilo        |
| -------- | ------------------------ | -------------- | -------------- |
| Docente  | `teacher@pyclasse.test`  | `Teacher2026!` | Ada Docente    |
| Studente | `student1@pyclasse.test` | `Student2026!` | Giulia Bianchi |
| Studente | `student2@pyclasse.test` | `Student2026!` | Marco Verdi    |
| Studente | `student3@pyclasse.test` | `Student2026!` | Sara Conti     |
| Studente | `student4@pyclasse.test` | `Student2026!` | Luca Romano    |
| Studente | `student5@pyclasse.test` | `Student2026!` | Elena Esposito |

Queste password sono pubbliche, intenzionalmente semplici da condividere nel
team e valide **solo per Supabase locale**. Non riutilizzarle in staging,
produzione o per account personali.

## Contenuto del dataset

Il docente gestisce due classi:

- `3A Informatica`, codice di iscrizione `PY3A26`;
- `4B Informatica`, codice di iscrizione `PY4B26`.

Sono presenti cinque studenti distribuiti fra le classi, sei esercizi Markdown,
tag, risorse esterne, test visibili e nascosti, compiti senza voto, in decimi e
in centesimi. Le consegne coprono stati diversi: bozza, consegnata, superata e
fallita. Questo permette di verificare dashboard, percorsi propedeutici,
filtraggio, editor, valutazione, report e monitoraggio in tempo reale.

Le scadenze sono calcolate rispetto al momento del reset, perciò rimangono utili
anche in futuro.

La raccolta **Codici salvati** di Code now contiene due esempi personali per il
docente e un esempio per ciascuno dei cinque studenti. Ogni account vede
esclusivamente le proprie fixture grazie alle policy RLS. La condivisione del
codice docente parte abilitata e può essere disattivata dal relativo controllo
per verificare l'aggiornamento Realtime in una seconda sessione studente.

## Ripristino

Con Supabase locale già avviato:

```bash
npm run supabase:reset
```

Il reset elimina e ricrea **soltanto il database Supabase locale**, applica tutte
le migrazioni e ricarica il dataset. Non eseguire il comando contro un ambiente
contenente dati da conservare.

Il seed non deve essere applicato in produzione. Per un deploy usare
`npx supabase db push`, che applica le migrazioni ma non carica `seed.sql`.
