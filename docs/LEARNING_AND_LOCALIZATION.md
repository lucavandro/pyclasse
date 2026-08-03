# Localizzazione, valutazione e percorsi didattici

## Lingua

Al primo caricamento PyClasse legge la lingua preferita del browser. L'italiano usa il catalogo `it`; tutte le altre lingue usano il catalogo inglese di fallback. Il selettore “Language” permette di cambiare lingua durante la sessione e l'attributo `lang` del documento viene aggiornato per le tecnologie assistive.

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

Ogni esercizio è propedeutico per impostazione predefinita. Una consegna precedente deve essere marcata `passed` dal docente prima che lo studente possa aprire e consegnare l'esercizio successivo della classe. Disabilitando “Propedeutico”, quell'esercizio non blocca i successivi. L'ordine è persistito in `class_assignments.position`; il controllo è duplicato nell'interfaccia per chiarezza e in PostgreSQL/RLS per impedire aggiramenti via API.

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
