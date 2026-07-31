# PyClasse — specifiche di prodotto e conformità

Versione: 1.1  
Ultimo aggiornamento: 31 luglio 2026  
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

- Il docente può creare un esercizio con titolo, descrizione, codice iniziale, punteggio massimo e scadenza.
- Un esercizio può essere assegnato a una o più classi.
- La pubblicazione deve essere esplicita; gli studenti vedono soltanto esercizi pubblicati e assegnati alle loro classi.
- La UI deve mostrare stato, punteggio, progresso e scadenza.
- Il sistema deve distinguere consegne entro e oltre la scadenza.

## 5. Editor Python

- L’editor online usa CodeMirror con sintassi Python e numeri di riga.
- Il codice Python viene eseguito nel browser con Pyodide in un Web Worker.
- Un’esecuzione deve essere interrotta dopo 8 secondi.
- Copia, taglia e incolla devono essere bloccati nell’editor CodeMirror.
- La limitazione è un deterrente didattico e non una misura di sicurezza assoluta contro gli strumenti di sviluppo del browser.

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

### 9.1 Barra laterale

- Su desktop la barra laterale può essere espansa o collassata tramite pulsante hamburger.
- Da collassata mostra le icone e mantiene etichette accessibili e tooltip.
- La preferenza è memorizzata localmente sul dispositivo.
- Su mobile rimane la navigazione inferiore compatta.

## 10. Persistenza, sicurezza e RLS

- Backend: Supabase Auth e PostgreSQL.
- Tabelle richieste: `profiles`, `app_settings`, `classes`, `class_members`, `assignments`, `assignment_classes`, `tests`, `submissions`.
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
- [x] Il progetto produce una build valida per la distribuzione configurata.

## 13. Matrice di conformità al 31 luglio 2026

| Area | Stato | Evidenza / scostamento |
|---|---|---|
| Tema Dracula e accessibilità visiva | Conforme | Palette e focus definiti in `app/dark.css`; Geist e Geist Mono in `app/layout.tsx`. |
| Sidebar desktop collassabile | Conforme | Stato, controllo hamburger e persistenza locale in `app/page.tsx`. |
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
