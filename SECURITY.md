# Sicurezza

## Segnalazione responsabile

Non aprire issue pubbliche per vulnerabilità non corrette. Usa **Security → Report a vulnerability** su GitHub; se non disponibile, contatta privatamente il proprietario. Includi versione, impatto, prerequisiti e riproduzione minima senza dati personali, token o credenziali.

## Confini di sicurezza

- Il browser usa solo URL Supabase e chiave anon; non inserire mai `service_role`, segreti OAuth o dati personali nei file versionati.
- Le variabili `NEXT_PUBLIC_*` sono pubbliche per definizione.
- RLS è il confine autorizzativo principale e non deve essere disabilitata.
- Pyodide gira in un Web Worker con timeout, ma non è un sandbox per codice ostile.
- Test eseguiti nel browser non sono segreti e non costituiscono grading autorevole.
- Il monitoraggio Realtime espone il codice soltanto allo studente e al docente autorizzato; il database attribuisce le modifiche.
- Markdown ignora HTML grezzo e le risorse esterne devono usare HTTPS.

Il progetto applica CSP e altre intestazioni difensive, ma consente `unsafe-eval` perché necessario al runtime Python. Questo compromesso deve essere rivalutato se cambia la tecnologia di esecuzione.

## Prima dell'uso reale

Sono richiesti penetration test dell'ambiente distribuito, verifica RLS con account distinti, backup/ripristino, retention, monitoraggio degli accessi e un judge isolato lato server per test realmente segreti. Per privacy e GDPR consulta [Privacy e protezione dati](docs/PRIVACY_AND_DATA_PROTECTION.md).
