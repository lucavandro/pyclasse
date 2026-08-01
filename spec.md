# PyClasse — specifiche di prodotto e conformità

Versione: 1.6
Ultimo aggiornamento: 1 agosto 2026  
Stato del documento: fonte unica di verità del progetto

## Regola di manutenzione

Questo file è il riferimento normativo di PyClasse.

Per ogni nuova richiesta sul progetto:

1. interpretare il prompt come proposta di modifica delle specifiche;
2. aggiornare prima le sezioni interessate di `spec.md`;
3. implementare la modifica nel progetto;
4. verificare il risultato rispetto ai criteri di accettazione;
5. aggiornare la matrice di conformità e la data del documento;
6. non dichiarare completa una funzione che usa soltanto dati dimostrativi o che non persiste ancora in Supabase.

In caso di conflitto prevale, nell’ordine: richiesta più recente dell’utente, questo documento aggiornato, documentazione tecnica precedente.

## 1. Obiettivo

PyClasse è una piattaforma web didattica per assegnare, svolgere e correggere automaticamente esercizi di programmazione, principalmente in Python. Deve offrire un’esperienza simile a Replit for Education, rimanendo hostabile gratuitamente per un normale utilizzo scolastico.

## 2. Utenti e ruoli

### 2.1 Autenticazione

- Gli utenti accedono con account Google tramite Supabase Auth.
- Al primo accesso viene creato automaticamente un profilo applicativo.
- Le sessioni e l’identità non devono essere simulate nella versione operativa.

### 2.2 Docente

- È previsto un solo docente.
- Il docente viene identificato tramite l’email configurata nella tabella privata `public.app_settings`.
- Il valore iniziale da sostituire nello schema è `docente@scuola.it`.
- Il database deve garantire al massimo un profilo con ruolo `teacher`.
- Un utente autenticato non può modificare autonomamente il proprio ruolo.
- Il docente può creare classi, esercizi, test e assegnazioni; consultare consegne e report; esportare i dati.

### 2.3 Studente

- Ogni utente che non corrisponde all’email del docente riceve il ruolo `student`.
- Lo studente può iscriversi a una classe tramite codice, vedere gli esercizi assegnati e consegnare le soluzioni.
- Non deve esistere alcun selettore client-side che permetta di passare liberamente tra docente e studente.
- Le viste e le azioni disponibili devono dipendere dal ruolo letto dal database.

## 3. Classi

- Il docente può creare, rinominare e archiviare una classe.
- Ogni classe ha un codice univoco di 6–12 caratteri maiuscoli, numeri o trattini.
- Uno studente entra tramite il codice usando la funzione protetta `join_class(code)`.
- Il codice non deve consentire di enumerare o leggere classi non accessibili.
- Il docente può vedere e rimuovere gli iscritti; lo studente può lasciare la classe.

## 4. Esercizi e assegnazioni

- Gli esercizi sono raccolti in una libreria centralizzata indipendente dalle classi.
- Il docente può creare e modificare nella libreria titolo, descrizione, codice iniziale, punteggio massimo, metodo di verifica e test.
- Ogni classe riceve un riferimento allo stesso esercizio centrale: una modifica al contenuto si riflette in tutte le classi cui è assegnato, senza duplicare l'esercizio.
- L'assegnazione è un'entità distinta e collega esercizio e classe; contiene scadenza e stato di pubblicazione specifici per quella classe.
- Lo stesso esercizio può quindi avere scadenze diverse in classi diverse.
- Dalla libreria il docente può vedere quante classi usano un esercizio, modificarlo e gestirne le assegnazioni.
- Il docente può generare una bozza di esercizio a partire da un prompt tramite IA.
- La generazione IA produce almeno titolo, consegna, codice iniziale, vincoli, punteggio e una batteria di test coerenti.
- Il risultato generato deve essere mostrato in un'anteprima interamente modificabile e non viene salvato automaticamente senza conferma del docente.
- La pubblicazione deve essere esplicita; gli studenti vedono soltanto esercizi pubblicati e assegnati alle loro classi.
- La UI deve mostrare stato, punteggio, progresso e scadenza.
- Il sistema deve distinguere consegne entro e oltre la scadenza.
- In fase di creazione il docente sceglie il metodo di verifica: test automatici oppure “Verifica con IA”.
- Con “Verifica con IA” la soluzione viene valutata rispetto a testo, vincoli e comportamento richiesto; la risposta deve essere strutturata come esito e feedback pedagogico.
- L’IA non deve rivelare una soluzione corretta né proporre modifiche puntuali al codice dello studente.

## 5. Editor Python

- L’editor online usa CodeMirror con sintassi Python e numeri di riga.
- Il codice Python viene eseguito nel browser con Pyodide in un Web Worker.
- Un’esecuzione deve essere interrotta dopo 8 secondi.
- Esecuzione e test devono avvenire in Web Worker separati e un watchdog deve terminarli fisicamente dopo 8 secondi, così anche un loop infinito non può bloccare l’interfaccia.
- Il watchdog deve distinguere il timeout dagli altri errori e presentarlo come possibile ciclo infinito o elaborazione eccessiva.
- L’output accumulato nel worker deve essere limitato per evitare consumo incontrollato di memoria durante cicli con `print()`.
- Copia, taglia e incolla devono essere bloccati nell’editor CodeMirror.
- La limitazione è un deterrente didattico e non una misura di sicurezza assoluta contro gli strumenti di sviluppo del browser.
- Il codice dell’editor deve essere salvato automaticamente dopo una breve pausa dalla digitazione.
- Nell’MVP la bozza è ripristinabile sullo stesso dispositivo; con Supabase autenticato deve essere sincronizzata nella riga `submissions` con stato `draft` per consentire la ripresa da altri dispositivi.
- L’interfaccia mostra chiaramente lo stato “Salvataggio…” oppure l’orario dell’ultimo salvataggio.

## 6. Flusso di esecuzione dell’esercizio

La schermata studente presenta esattamente tre azioni principali.

### 6.1 Esegui

- Esegue dall’inizio alla fine il codice presente nell’editor, come un normale programma Python.
- La shell mostra in ordine l’output standard, gli eventuali prompt di `input()` e i valori immessi dallo studente.
- Quando il programma raggiunge `input()`, l’esecuzione si sospende e la shell presenta un campo per fornire il valore richiesto.
- Invio o il pulsante “Invia” forniscono il valore e fanno proseguire il programma.
- Devono essere supportate più chiamate consecutive a `input()` nello stesso programma.
- Una nuova pressione di “Esegui” riavvia il programma da zero e scarta gli input della sessione precedente.
- Errori e timeout devono apparire nella shell senza bloccare l’interfaccia.

### 6.2 Test

- Esegue i test automatici dell’esercizio in un ambiente separato dall’esecuzione interattiva.
- Mostra allo studente quanti test sono stati superati sul totale.
- Gli errori di esecuzione devono essere mostrati senza bloccare l’interfaccia.
- Nell’MVP i test sono eseguiti lato browser; quindi non possono essere considerati realmente segreti.

### 6.3 Consegna soluzione

- Il pulsante è disabilitato finché tutti i test non sono superati.
- Il superamento è valido soltanto per l’esatto contenuto di codice testato.
- Qualsiasi modifica successiva al codice invalida il risultato e disabilita nuovamente la consegna.
- La consegna operativa deve salvare in Supabase codice, studente, esercizio, stato, punteggio, risultati dei test e orario.
- Il docente deve poter leggere la soluzione consegnata.

## 7. Grading

- L’MVP usa grading client-side con Pyodide.
- I test possono essere input/output o chiamate a funzioni.
- Ogni test ha posizione, output atteso, visibilità e punti.
- I test marcati `is_hidden` non devono essere leggibili direttamente dagli studenti tramite Supabase.
- Un’evoluzione futura può spostare grading e test segreti in un judge isolato lato server.

## 8. Report docente

- Il report mostra studente, esercizi completati, stato, punteggio, ultimo invio e rispetto della scadenza.
- Sono previsti filtri per classe ed esercizio, ordinamento e individuazione degli studenti da seguire.
- L’esportazione CSV deve produrre un file reale con i dati autorizzati, non un messaggio dimostrativo.

## 9. Interfaccia e accessibilità

- Tema esclusivamente scuro, ispirato a Dracula.
- Palette principale: sfondo `#191a21`, pannelli `#282a36`, riga attiva `#44475a`, testo `#f8f8f2`, viola `#bd93f9`, rosa `#ff79c6`, ciano `#8be9fd`, verde `#50fa7b`, arancio `#ffb86c`.
- Font principale Geist; font monospaziato Geist Mono per codice e terminale.
- Testo normale minimo consigliato: 16 px; testo tecnico minimo: 13 px.
- Contrasto, focus da tastiera, etichette accessibili e stati disabilitati devono essere chiaramente percepibili.
- Layout responsive per desktop, tablet e smartphone.
- Tutte le icone funzionali devono provenire in modo coerente dalla collezione Google Material Symbols Rounded; simboli Unicode decorativi non devono essere usati come icone di controllo.

### 9.0 Routing e navigazione

- Ogni sezione principale dispone di un URL persistente e condivisibile: dashboard, classi, libreria esercizi, report, impostazioni ed editor.
- Creazione e modifica di un esercizio usano pagine dedicate (`/exercises/new` e `/exercises/:id/edit`) e non finestre modali.
- I comandi avanti e indietro del browser ripristinano la vista corretta senza ricaricare l'applicazione.
- L'apertura diretta o il ricaricamento di un URL interno deve mostrare la stessa vista, senza ricadere sempre nella dashboard.
- Le pagine di modifica offrono un comando “Indietro” che rispetta la cronologia; dopo il salvataggio si torna alla libreria esercizi.

### 9.1 Barra laterale

- Su desktop la barra laterale può essere espansa o collassata tramite pulsante hamburger.
- Quando la barra è aperta, il pulsante hamburger si trova all’estrema sinistra, prima del logo e del titolo.
- Il pulsante hamburger non ha bordo e ha sfondo trasparente.
- Da collassata mostra le icone e mantiene etichette accessibili e tooltip.
- La preferenza è memorizzata localmente sul dispositivo.
- Su mobile rimane la navigazione inferiore compatta.
- Il riepilogo account non deve contenere controlli privi di funzione.
- In fondo alla barra è presente un pulsante “Esci” con icona Material, etichetta accessibile e tooltip quando la barra è collassata.
- Il logout termina la sessione Supabase; nell'anteprima senza backend attivo deve comunque mostrare lo stato disconnesso senza simulare un cambio di ruolo.

### 9.2 Feedback pedagogico basato su IA

- In presenza di un errore di esecuzione, timeout o test non completamente superati, lo studente riceve un feedback in italiano.
- Il feedback descrive la categoria dell’errore, il significato e gli aspetti del comportamento del programma da osservare.
- Non deve indicare la modifica da effettuare, fornire codice corretto, rivelare output attesi o suggerire direttamente la soluzione.
- Il canale principale usa Puter.js, che non richiede API key applicative; il primo utilizzo può richiedere autorizzazione o account Puter allo studente.
- Deve essere visibile che il codice viene elaborato dal servizio IA esterno.
- Se Puter non è disponibile, viene mostrato un feedback locale basato sulla categoria dell’errore.
- Un feedback contenente istruzioni correttive esplicite o blocchi di codice viene scartato e sostituito con il feedback locale.

### 9.3 Impostazioni docente

- Il pannello docente contiene una sezione “Impostazioni”.
- Il docente può modificare il nome della scuola senza modificare il codice sorgente.
- Nell’MVP il valore viene conservato sul dispositivo; con Supabase operativo deve essere persistito in `app_settings` tramite una funzione amministrativa protetta.
- Il nome configurato sostituisce “Liceo Galilei” nell’intestazione dell’applicazione.

## 10. Persistenza, sicurezza e RLS

- Backend: Supabase Auth e PostgreSQL.
- Tabelle richieste: `profiles`, `app_settings`, `classes`, `class_members`, `exercises`, `class_assignments`, `tests`, `submissions`.
- `exercises` contiene il contenuto canonico; `class_assignments` contiene `exercise_id`, `class_id`, scadenza e pubblicazione per classe.
- Ogni bozza o consegna fa riferimento a `class_assignment_id`, così stato e rispetto della scadenza restano univoci anche se lo stesso studente incontra l'esercizio in classi diverse.
- Tutte le tabelle applicative devono avere RLS attiva.
- Il docente gestisce soltanto le proprie classi e assegnazioni.
- Gli studenti leggono soltanto classi, assegnazioni e consegne autorizzate.
- Uno studente gestisce soltanto le proprie consegne.
- Il ruolo non deve essere autorizzato sulla base di dati inviati dal client.

## 11. Stack e distribuzione

- Interfaccia attuale: React/Next compatibile Vinext e Cloudflare Workers.
- Editor: CodeMirror.
- Runtime Python: Pyodide in Web Worker.
- Dati e login Google: Supabase.
- Hosting: Sites/Cloudflare; l’architettura deve restare compatibile con piani gratuiti.
- Le credenziali Supabase sono fornite tramite `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Segreti e chiavi amministrative non devono essere inclusi nel client o nel repository.

## 12. Criteri di accettazione principali

- [ ] Un nuovo utente può accedere realmente con Google.
- [ ] L’email configurata diventa l’unico docente; tutte le altre diventano studenti.
- [ ] Docente e studente vedono navigazioni e azioni differenti senza switch manuale.
- [ ] Il docente può creare una classe e ottenere un codice.
- [ ] Lo studente può entrare con il codice e vedere gli esercizi pubblicati.
- [ ] Il docente può creare e assegnare un esercizio con scadenza e test.
- [x] L’editor Python blocca copia, taglia e incolla.
- [x] “Esegui” avvia il programma dell’editor e gestisce interattivamente le chiamate a `input()`.
- [x] “Test” mostra il numero di test superati.
- [x] “Consegna soluzione” è abilitato soltanto dopo il superamento di tutti i test sul codice corrente.
- [ ] La consegna viene realmente salvata e appare al docente.
- [ ] Il report usa dati reali e può esportare un CSV reale.
- [x] Il tema è Dracula, leggibile e responsive.
- [x] La barra desktop è collassabile e la preferenza viene ricordata.
- [x] Loop infiniti e test bloccati vengono terminati dal watchdog senza bloccare la pagina.
- [x] Errori, timeout e test falliti attivano un feedback pedagogico IA con fallback locale.
- [x] La bozza dello studente viene salvata automaticamente e ripristinata sullo stesso dispositivo.
- [x] Le icone funzionali usano Google Material Symbols Rounded.
- [x] Il docente può modificare dal pannello il nome della scuola.
- [x] La creazione esercizio permette di scegliere tra test e verifica IA.
- [x] Il progetto produce una build valida per la distribuzione configurata.

## 13. Matrice di conformità al 31 luglio 2026

| Area | Stato | Evidenza / scostamento |
|---|---|---|
| Tema Dracula e accessibilità visiva | Conforme | Palette e focus definiti in `app/dark.css`; Geist e Geist Mono in `app/layout.tsx`. |
| Sidebar desktop collassabile | Conforme | Stato, controllo hamburger e persistenza locale in `app/page.tsx`. |
| Prevenzione loop infiniti | Conforme | Watchdog a 8 secondi, terminazione dei worker e limite dell’output. |
| Feedback pedagogico IA | Conforme per MVP | Puter.js senza API key applicativa, filtro anti-soluzione e fallback locale. |
| Salvataggio automatico bozze | Conforme per MVP locale | Ripristino sullo stesso dispositivo; sincronizzazione Supabase in attesa dell’autenticazione reale. |
| Icone Material | Conforme | Material Symbols Rounded usato per navigazione, azioni e indicatori. |
| Nome scuola modificabile | Conforme per MVP locale | Pannello impostazioni e persistenza sul dispositivo; persistenza Supabase ancora da collegare. |
| Verifica esercizio con IA | Conforme per MVP | Opzione in creazione esercizio e valutazione Puter.js con esito strutturato. |
| Libreria centralizzata esercizi | Conforme per MVP locale | Vista repository con modifica canonica e conteggio delle classi; persistenza Supabase predisposta. |
| Scadenze per classe | Conforme per MVP locale | Le assegnazioni separano classe ed esercizio e memorizzano una scadenza specifica. |
| Generazione esercizi e test con IA | Conforme per MVP | Puter.js genera una bozza JSON modificabile prima del salvataggio; fallback dimostrativo in caso di indisponibilità. |
| CodeMirror e blocco clipboard | Conforme | Handler `copy`, `cut` e `paste` in `app/page.tsx`. |
| Esecuzione interattiva del programma | Conforme per MVP | Il worker esegue il codice completo e richiede dalla shell ogni valore necessario a `input()`. |
| Test automatici lato browser | Conforme per MVP | Cinque test dimostrativi eseguiti dal worker; i test non sono ancora caricati dal database. |
| Gate della consegna | Conforme nell’interfaccia | Il pulsante dipende da test superati e hash logico del codice corrente; il salvataggio è ancora simulato. |
| Schema dati e RLS | Predisposto | Schema completo in `supabase/schema.sql`, non verificabile come applicato a un progetto Supabase reale. |
| Unico docente tramite email | Predisposto | `app_settings`, indice univoco e trigger presenti nello schema; la UI mostra ancora un profilo docente dimostrativo. |
| Login Google | Non integrato end-to-end | Helper presente in `lib/supabase.ts`; mancano schermata login, callback e sessione collegata alla UI. |
| Classi e iscrizione tramite codice | Parziale | Schema e funzione RPC presenti; schermata dimostrativa non collegata a Supabase. |
| CRUD esercizi e scadenze | Parziale | Schema e UI dimostrativa presenti; mancano form e persistenza reale. |
| Consegne al docente | Non conforme | Il pulsante mostra una conferma locale ma non scrive ancora in `submissions`. |
| Report docente | Parziale | Tabella responsive presente, ma usa dati dimostrativi. |
| Esportazione CSV | Non conforme | Il pulsante è un segnaposto e non genera ancora un file. |
| Hosting gratuito | Conforme | La versione corrente è distribuibile sull’hosting configurato. |

## 14. Priorità per raggiungere la conformità completa

1. Collegare Supabase reale, login Google, callback e sessione.
2. Derivare il ruolo dal profilo autenticato e separare le viste docente/studente.
3. Collegare classi, iscrizioni, esercizi, scadenze e test alle tabelle Supabase.
4. Salvare bozze e consegne reali, includendo risultati e timestamp.
5. Alimentare il report con query autorizzate e implementare l’esportazione CSV.
6. Caricare dinamicamente dal database i test dell’esercizio, mantenendo esplicito il limite di segretezza del grading client-side.
