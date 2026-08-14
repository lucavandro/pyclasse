# Localizzazione, valutazione e percorsi didattici

## Lingua

Al primo caricamento PyClasse legge la lingua preferita del browser. L'italiano
usa i testi italiani della schermata di accesso; le altre lingue usano l'inglese
di fallback. Il selettore “Language” nella schermata di accesso cambia questi
testi prima dell'autenticazione. L'area autenticata è attualmente in italiano:
finché non sarà disponibile una localizzazione completa non presenta una
preferenza lingua che darebbe un risultato soltanto apparente.

Il docente può personalizzare dalle Impostazioni il titolo e il sottotitolo
della pagina di accesso, separatamente per italiano e inglese. Prima del login
l'applicazione legge esclusivamente questi quattro testi attraverso la funzione
Supabase `get_public_branding`; email del docente e altre impostazioni private
non vengono esposte agli utenti anonimi.

## Voto opzionale

Quando assegna un esercizio a una classe, il docente sceglie fra **senza voto**
(valore predefinito), **voto in decimi** e **voto in centesimi**. Il voto è un
intero compreso rispettivamente fra 0–10 o 0–100; il database verifica il limite
della scala scelta. Per le assegnazioni senza voto conserva `NULL`, così queste
consegne non alterano le medie. Le medie che includono scale diverse vengono
normalizzate in percentuale. L'esito didattico (`passed` o `failed`) resta
distinto dal voto.

## Esercizi propedeutici

Ogni esercizio è propedeutico per impostazione predefinita. Un esercizio
precedente blocca il successivo soltanto finché non è stato consegnato: la
valutazione del docente può avvenire in seguito e non influenza lo sblocco.
Disabilitando “Propedeutico”, quell'esercizio non blocca i successivi. L'ordine
è persistito in `class_assignments.position`; il controllo è duplicato
nell'interfaccia per chiarezza e in PostgreSQL/RLS per impedire aggiramenti via
API.

## Area di lavoro dello studente

La panoramica dello studente mostra il rapporto fra esercizi completati e
compiti assegnati, senza esporre statistiche sul numero degli altri studenti.
La sezione “Compiti assegnati” separa le attività “Da consegnare” da quelle
“Consegnate”; ogni scheda rende evidenti classe, scadenza, valutazione, stato
della bozza ed eventuale blocco propedeutico.

Il dettaglio di un esercizio usa due tab accessibili:

- **Traccia** contiene il Markdown interpretato, i vincoli e le risorse esterne;
- **Editor e codice** contiene CodeMirror, output, esecuzione, test e consegna.

Il codice viene salvato con debounce nel database. Gli aggiornamenti dello
studente non vengono riletti e reinseriti nell'editor; soltanto un intervento
Realtime attribuito al docente può sostituire il contenuto locale. Modificare
una soluzione già consegnata la riporta a bozza, evitando che il polling di una
versione precedente cancelli il lavoro in corso.

## Tag e filtro

Il docente inserisce tag separati da virgola. Prima del salvataggio vengono rimossi spazi, duplicati e differenze fra maiuscole/minuscole. PostgreSQL usa un array `text[]` indicizzato GIN e il repository consente il filtro per tag.

## Tracce Markdown e risorse esterne

La traccia dell'esercizio è salvata come Markdown e resa agli studenti con supporto GitHub Flavored Markdown: titoli, enfasi, elenchi, tabelle, citazioni, link e blocchi di codice. L'HTML incorporato viene ignorato, evitando l'esecuzione di markup o script inseriti nella traccia.

Ogni esercizio può avere una risorsa esterna opzionale, per esempio una pagina web o un video YouTube. Sono ammessi esclusivamente URL HTTPS. Il collegamento si apre in una nuova scheda con `noopener noreferrer`; i contenuti YouTube non vengono caricati automaticamente, evitando richieste a terze parti prima dell'azione esplicita dello studente.

## Copertura automatica

I test unitari verificano rilevamento lingua, normalizzazione tag, limiti delle
scale di voto e tutte le diramazioni del blocco propedeutico. I test del database
verificano schema, default, vincoli e policy; gli E2E coprono i flussi reali con
Supabase locale, inclusa la selezione del voto in decimi.

## Monitoraggio in tempo reale

Il codice dello studente viene salvato come bozza dopo una breve attesa dalla digitazione. Nella sezione Report il docente vede bozze e consegne aggiornarsi tramite Supabase Realtime, può correggere il codice e inviare la modifica allo studente. L'editor dello studente applica gli aggiornamenti provenienti dal docente senza ricaricare la pagina. `updated_by` distingue gli aggiornamenti remoti dagli autosalvataggi dello stesso studente e limita i rimbalzi fra client.
