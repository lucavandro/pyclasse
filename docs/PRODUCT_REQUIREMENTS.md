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

## Editor Python

### EDITOR-001 — Cursore visibile

Il cursore di inserimento di CodeMirror è bianco e mantiene contrasto
sufficiente sullo sfondo scuro.

### EDITOR-002 — Azioni vicine all'output

I controlli per eseguire codice e test si trovano nell'intestazione dell'output.
Sono pulsanti compatti con icona, nome accessibile e tooltip nativo. In Code now
anche il download `.py` si trova nello stesso gruppo; il download non compare
negli editor degli esercizi.

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

## Copertura richiesta

- test di contratto per presenza, confini di ruolo e configurazioni UI;
- test unitari per validazione e minimizzazione del documento JSON;
- E2E docente/studente per scadenza, import/export, navigazione al dettaglio e
  layout mobile;
- verifica visuale desktop e mobile di accesso, editor, report, form e modal.
