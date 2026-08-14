# Requisiti di prodotto e criteri di accettazione

Questo documento conserva le richieste di prodotto approvate e i relativi
criteri di accettazione. Deve essere aggiornato insieme a interfaccia,
documentazione e test quando un requisito cambia. I requisiti non autorizzano
l'esposizione di dati oltre i ruoli e le policy RLS esistenti.

## Accesso

### LOGIN-001 — Posizione del marchio

Su desktop il logo PyClasse compare nell'angolo superiore sinistro della
pagina, sopra il pannello editoriale. Su mobile resta visibile nello stesso
angolo della schermata di accesso. Il marchio non viene duplicato.

### LOGIN-002 — Qualità dell'area di accesso

La parte destra mostra direttamente il contenuto di accesso, senza card,
cornice, sfondo o ombra attorno al form. Mantiene una gerarchia visiva distinta,
uno stato di accesso protetto e indicazioni sintetiche sulle garanzie di privacy
e separazione dei ruoli. Gli errori di autenticazione sono comprensibili e non
espongono messaggi tecnici del servizio di identità.

### I18N-001 — Interfaccia localizzabile

L'intera interfaccia usa cataloghi Paraglide tipizzati. Il selettore lingua è
disponibile prima e dopo l'accesso, persiste una preferenza first-party e
aggiorna lingua e direzione del documento. Aggiungere un locale non richiede
nuove condizioni nei componenti né nuove colonne nello schema Supabase. I testi
didattici inseriti dagli utenti restano invariati.

## Editor Python

### EDITOR-001 — Cursore visibile

Il cursore di inserimento di CodeMirror è bianco e mantiene contrasto
sufficiente sullo sfondo scuro.

### EDITOR-002 — Azioni vicine all'output

I controlli per eseguire codice e test si trovano nell'intestazione dell'output.
Sono pulsanti compatti con icona, nome accessibile e tooltip nativo. In Code now
anche il download `.py` e il salvataggio si trovano nello stesso gruppo; il
download non compare negli editor degli esercizi.

### CODE-NOW-001 — Raccolta personale

Docente e studenti possono salvare codice tramite un modal accessibile. Per un
nuovo codice il nome è obbligatorio; per un codice selezionato si possono
aggiornare contenuto e nome oppure creare una copia indipendente. RLS limita
lettura e scrittura al proprietario.

### CODE-NOW-002 — Disponibilità controllata dal docente

Il docente può abilitare o disabilitare la possibilità per gli studenti di
copiare il codice della sua sessione attiva. Lo stato viene applicato anche
nell'RPC del database e propagato agli studenti con Supabase Realtime, senza
ricaricare la pagina e senza includere il contenuto dell'editor nell'evento.

### CODE-NOW-003 — Stato e cambio progetto

Code now mostra sempre il progetto corrente: il nome del codice salvato oppure
`Senza nome`, insieme allo stato salvato o modificato. Prima di sostituire un
contenuto con un altro codice salvato, con il codice docente o con un nuovo
progetto, le modifiche locali richiedono una scelta esplicita fra salvataggio,
scarto e annullamento. Salvare un progetto senza nome richiede prima un nome.
Quando è aperto un codice salvato è disponibile l'azione **Nuovo progetto**.

## Esercizi

### EXERCISE-001 — Controlli di selezione

Checkbox e radio usano una dimensione compatta centralizzata, restano
azionabili tramite l'etichetta e mostrano un focus visibile.

### EXERCISE-002 — Scadenza per assegnazione

Il docente può impostare, modificare o rimuovere una data e ora di scadenza per
ciascuna classe selezionata. La scadenza viene salvata in
`class_assignments.deadline` e mostrata allo studente.

### TRANSFER-001 — Esportazione JSON

L'archivio docente esporta tutti gli esercizi e i relativi test in un documento
versionato `pyclasse-exercises` senza identificativi, classi, studenti,
assegnazioni, bozze, consegne o valutazioni.

### TRANSFER-002 — Importazione JSON

L'importazione si svolge in un modal accessibile. Il docente può trascinare un
file `.json` o selezionarlo da Esplora risorse. Prima dell'importazione il
sistema valida sintassi, versione, quantità, campi, limiti e URL HTTPS, quindi
mostra un'anteprima. In caso di errore non devono restare esercizi importati
parzialmente. Gli esercizi importati non vengono assegnati automaticamente.

## Report docente

### REPORT-001 — Studenti navigabili

I nomi degli studenti in Valutazioni, Avanzamento e Alert sono link. Il link
apre una pagina riservata al docente con classi, conteggi di avanzamento e, per
ogni attività assegnata, scadenza, prima apertura, ultimo aggiornamento,
consegna, stato, punteggio e codice salvato.

### REPORT-002 — Separazione dei ruoli

La pagina di dettaglio studente e i report aggregati non caricano né mostrano
dati quando il profilo autenticato non è docente. Lo studente vede soltanto la
propria sezione Valutazioni.

### REPORT-003 — Tabelle responsive senza pannello esterno

Valutazioni e Avanzamento non usano un pannello decorativo attorno alle tabelle.
Su desktop sfruttano l'intera larghezza del contenuto. Sotto 700 px ogni riga
diventa un blocco verticale con l'etichetta esplicita di ciascun valore, senza
scorrimento orizzontale della pagina.

### REPORT-004 — Valutazione delle consegne

Nel dettaglio studente il docente può assegnare esito e punteggio alle consegne
per cui è configurata una scala di valutazione. Il limite è applicato sia dal
controllo grafico sia dal database; la funzione non è disponibile allo
studente.

## Classi

### CLASS-001 — Aggiunta manuale di uno studente

Il docente può aggiungere alla propria classe un account studente già
registrato, cercandolo tramite email dalla pagina della classe. La chiamata usa
la funzione protetta già disponibile nel database e non rende consultabile un
elenco globale di account.

## Impostazioni docente

### SETTINGS-001 — Testi effettivamente presenti

La personalizzazione mostra soltanto testi effettivamente visibili nella
schermata di accesso e ne offre un’anteprima italiana e inglese. Campi senza un
riscontro nell’interfaccia e preferenze non applicate non devono comparire come
modificabili.

## Prestazioni e sicurezza

### PERFORMANCE-001 — Minimizzazione delle letture

Le query dichiarano le colonne necessarie e usano letture dedicate alla pagina.
Dashboard e report riepilogativi non scaricano il codice degli studenti; il
codice viene richiesto solo nel dettaglio studente, nell’editor e nel monitor.
Le letture di dettaglio sono filtrate per classe, esercizio o studente.

### SECURITY-001 — Ruolo docente verificato nel database

Creazione, modifica e cancellazione di classi ed esercizi, proprietà indiretta
di test e assegnazioni e pubblicazione Code now richiedono il ruolo docente nel
database, oltre alla corrispondenza dell’identificativo proprietario. La sola
grafica non costituisce un controllo di autorizzazione.

### AUDIT-001 — Funzioni implementate e visibilità

Ogni funzione applicativa presente nelle RPC o nelle policy deve avere un
percorso grafico coerente con il ruolo oppure essere esplicitamente classificata
come funzione interna. L’audit corrente espone aggiunta studenti e valutazione;
heartbeat, pulizia sessioni e RPC di autorizzazione restano interne.

## Copertura richiesta

- test di contratto per presenza, confini di ruolo e configurazioni UI;
- test unitari per validazione e minimizzazione del documento JSON;
- E2E docente/studente per scadenza, import/export, navigazione al dettaglio e
  layout mobile, errori di accesso, aggiunta studenti e valutazione;
- test database sulle guardie di ruolo e test di contratto sulla minimizzazione
  delle query;
- verifica visuale desktop e mobile di accesso, editor, report, form e modal.
