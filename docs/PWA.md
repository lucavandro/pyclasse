# Progressive Web App

PyClasse è configurata come Progressive Web App installabile. Il manifest
definisce nome, colori Dracula, icone normali e maskable, modalità standalone e
collegamenti rapidi a classi ed esercizi.

## Installazione

In produzione l'applicazione registra `/sw.js` dopo il caricamento della pagina.
Un browser compatibile può quindi proporre **Installa app** dal proprio menu. La
registrazione richiede HTTPS; `localhost` è considerato un'origine sicura dai
browser per lo sviluppo.

Il service worker non viene registrato durante `npm run dev`, così hot reload e
modifiche locali non possono essere mascherati da una cache precedente. Per una
verifica completa usare una build di produzione:

```bash
npm run build
npm run start
```

Quando si cambia il disegno dell'icona in `public/pwa-icon.svg`, rigenerare i PNG
versionati con `npm run assets:pwa`.

## Strategia offline e privacy

- Le navigazioni usano sempre la rete; quando il server non è raggiungibile
  viene mostrata una pagina offline dedicata.
- Vengono precacheati soltanto manifest, pagina offline e asset grafici PWA.
- Immagini, font, fogli di stile, script e worker della stessa origine adottano
  una cache con aggiornamento in rete.
- Richieste Supabase, autenticazione, consegne, profili e altre risposte dati non
  sono memorizzate dal service worker.
- L'origine viene controllata esplicitamente: nessuna risposta di servizi terzi
  entra nella cache PWA.

PyClasse dipende da Supabase per i dati autorevoli. La modalità offline non
consente di autenticarsi, consegnare o modificare dati; evita invece una pagina
di errore generica e mantiene disponibili gli asset già installati.

## File e verifiche

- `public/manifest.webmanifest`: metadati di installazione;
- `public/sw.js`: cache e fallback offline;
- `public/offline.html`: schermata mostrata senza rete;
- `src/routes/+layout.svelte`: registrazione in produzione;
- `scripts/generate-pwa-icons.mjs`: generazione riproducibile delle icone.

Lo smoke test Docker controlla che manifest, service worker, fallback e icone
siano serviti dalla stessa origine. I test di infrastruttura verificano inoltre
dimensioni richieste, icona maskable e confini della cache.
