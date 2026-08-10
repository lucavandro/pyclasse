# Privacy, GDPR e protezione dati

Questo documento descrive misure tecniche e limiti del software; non costituisce una certificazione o un parere legale. La conformità GDPR riguarda il trattamento concreto dell'istituto.

## Dati trattati

PyClasse può conservare identità, email, appartenenza alle classi, codice sorgente, bozze, consegne, esiti, voti, scadenze e timestamp. Nel contesto scolastico questi dati possono riguardare minori. Le sessioni temporanee dell'editor registrano utente, contesto, codice corrente e scadenza esclusivamente per indicare l'attività corrente e per la condivisione volontaria in Code now.

## Misure tecniche presenti

- Row Level Security su tutte le tabelle applicative;
- separazione dei ruoli e blocco della promozione autonoma;
- Pyodide e icone serviti dalla stessa origine;
- esecuzione Python nel browser con timeout;
- chiavi privilegiate escluse dal frontend e dal repository;
- HTTPS obbligatorio per le risorse esterne;
- video e siti esterni caricati solo dopo un clic esplicito;
- CSP, anti-framing, MIME protection, referrer e permissions policy;
- test automatici per schema, RLS, flussi applicativi e assenza di segreti;
- monitoraggio limitato al codice corrente e all'ultimo aggiornamento, senza registrare singole battute o dati del dispositivo.

## Monitoraggio in tempo reale

Lo studente salva una bozza nel database e il docente proprietario della classe può visualizzarla e modificarla. RLS limita la lettura allo studente interessato e al docente autorizzato; il database attribuisce ogni modifica all'utente autenticato. I lavori consegnati non compaiono nel monitoraggio. Una sessione editor scade dopo 25 secondi senza heartbeat, viene marcata immediatamente come scaduta alla chiusura ordinaria e le sessioni scadute vengono rimosse al successivo accesso all'applicazione. In Code now un utente con ruolo studente può richiedere il codice dell'unico docente dell'installazione soltanto mentre la relativa sessione è attiva. L'istituto deve documentare finalità, base giuridica, retention e modalità di intervento dei docenti.

## Servizi esterni

- Supabase gestisce autenticazione, PostgreSQL e Realtime.
- Un provider OAuth può essere configurato dall'istituto.
- I link esterni, incluso YouTube, non sono incorporati automaticamente.
- Le funzioni IA sono opzionali e devono restare disattivate senza una decisione documentata dell'istituto.

## Requisiti prima dell'uso reale

- identificare titolare, contatto privacy/DPO, finalità e basi giuridiche;
- predisporre un'informativa adatta anche ai minori;
- stipulare e verificare DPA, sub-responsabili, localizzazione e trasferimenti;
- definire retention e cancellazione automatica di profili, codice, consegne, log e backup;
- implementare procedure verificate per accesso, rettifica, esportazione, limitazione e cancellazione;
- definire data breach, backup/ripristino, audit e controllo accessi;
- svolgere DPIA quando richiesta dal rischio concreto;
- spostare test realmente segreti e grading autorevole in un judge isolato lato server;
- effettuare penetration test e verifica RLS nell'ambiente distribuito.

## Regole per modifiche future

Ogni modifica che introduce dati personali deve documentare necessità, interessati, base giuridica, accessi, destinatari, trasferimenti, retention, diritti e misure di sicurezza. Dati reali non devono comparire in seed, test, screenshot, issue, log o prompt IA.
