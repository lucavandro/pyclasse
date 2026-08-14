# Sistema visivo PyClasse

PyClasse usa un sistema visivo scuro, professionale e orientato alla leggibilità. La palette deriva dai tre azzurri del logo e ogni schermata deve usare i token centralizzati in `src/app.css`. Non sono previste richieste a CDN per font, icone o componenti.

## Principi

1. Una sola azione primaria evidente per area.
2. Gerarchia ottenuta con tipografia, spazio e contrasto, non con decorazioni superflue.
3. Drawer, tab, form, card e tabelle mantengono lo stesso linguaggio in tutte le rotte.
4. Lo stato non viene comunicato soltanto dal colore: testo, forma e semantica restano espliciti.
5. Tutti i layout funzionano da 320 px senza scorrimento orizzontale della pagina.

## Palette del marchio

| Ruolo              | Token                    | Valore    | Uso                         |
| ------------------ | ------------------------ | --------- | --------------------------- |
| Sfondo             | `--color-background`     | `#07111f` | Canvas principale           |
| Superficie         | `--color-surface`        | `#0f1c2e` | Pannelli e drawer           |
| Superficie elevata | `--color-surface-raised` | `#15243a` | Card e controlli            |
| Testo              | `--color-foreground`     | `#f4f8fc` | Testo principale            |
| Testo secondario   | `--color-muted`          | `#9aabc0` | Descrizioni e metadati      |
| Blu logo           | `--color-primary`        | `#2e9eff` | Azioni primarie e selezioni |
| Blu intenso        | `--color-primary-strong` | `#0c79d8` | Gradienti e hover           |
| Azzurro logo       | `--color-primary-soft`   | `#68c4ff` | Focus, link e informazioni  |

Verde, giallo e rosso sono riservati rispettivamente a successo, attenzione ed errore. Gli alias `--color-purple`, `--color-cyan` e `--color-pink` esistono soltanto per compatibilità con componenti precedenti e puntano alla palette del logo.

## Tipografia e spazio

- Geist è il font dell’interfaccia; Geist Mono è riservato a codice e output.
- Titoli con peso 680–720, tracking leggermente negativo e scala fluida.
- Testo base 16 px; note e badge non scendono sotto 12 px.
- La scala `--space-*` è basata su multipli di 4 px.
- I controlli hanno altezza minima di 44 px e focus visibile.

## Componenti condivisi

### Accesso

La schermata di accesso usa su desktop due metà verticali della stessa larghezza: il pannello editoriale occupa la metà sinistra e il form resta centrato nella metà destra. Sotto i 900 px il pannello editoriale viene rimosso e l’accesso usa tutta la larghezza disponibile. Il marchio PyClasse compare una sola volta nell'angolo superiore sinistro della pagina e resta visibile anche su mobile; il pannello editoriale e la card di autenticazione non devono duplicare logo o nome. Il selettore della lingua appartiene al footer della card, dopo le informazioni su privacy e sicurezza: deve avere un’etichetta visibile e non può essere sovrapposto o posizionato in modo assoluto sopra i contenuti.

### Drawer

Il drawer desktop misura 272 px e può ridursi a 82 px. Ogni voce comprende icona, etichetta accessibile e stato attivo con accento blu. Il profilo è separato dalla navigazione. Sotto 800 px il drawer diventa un pannello fuori canvas con sfondo oscurato e controllo di chiusura esplicito.

### Tab

I tab sono contenuti in una barra segmentata, hanno ruolo `tab`, `aria-selected` e stato attivo ad alto contrasto. Su schermi stretti scorrono orizzontalmente senza spezzare le etichette. Non vanno usati per azioni che non cambiano sezione o vista.

### Card e pannelli

I pannelli raggruppano contenuti correlati; le card rappresentano oggetti navigabili o riepiloghi. Entrambi usano bordi sottili e ombre contenute. L’elevazione al passaggio del puntatore è decorativa e viene disattivata quando l’utente richiede movimento ridotto.

### Form e tabelle

Le etichette restano sempre visibili. Campi, select e textarea usano la stessa superficie e uno stato focus blu. Checkbox e radio usano il token `--control-check-size`, senza ereditare l'altezza minima dei campi testuali. Le tabelle hanno intestazione distinta e righe leggibili. Valutazioni e Avanzamento non aggiungono un pannello esterno alla tabella; su mobile le righe diventano blocchi verticali e ogni valore mostra la propria etichetta.

### Editor

Editor Python, console e blocchi Markdown usano `--color-surface-subtle` e Geist Mono. Devono restare visivamente parte dell’applicazione senza imitare un tema esterno.

Il cursore di inserimento è bianco. Esecuzione, test e, soltanto in Code now,
download `.py` sono controlli compatti nell'intestazione dell'output; ogni
pulsante con sola icona richiede `aria-label` e tooltip.

Ogni editor Python deve attivare il parser `@codemirror/lang-python` e uno `HighlightStyle` esplicito. Keyword, funzioni, stringhe, numeri, commenti, operatori, tipi ed errori devono essere distinguibili con colori coerenti con la palette, mantenendo contrasto AA sullo sfondo dell’editor. Il syntax highlighting è presentazione locale: non deve inviare codice a servizi esterni.

## Accessibilità

- Contrasto minimo WCAG 2.1 AA.
- Navigazione completa da tastiera e `:focus-visible` su ogni controllo.
- Etichette accessibili per icone e controlli compressi.
- `prefers-reduced-motion` riduce animazioni e transizioni.
- Nessuna informazione docente o aggregata deve apparire nell’interfaccia studente.

## Checklist

1. Riutilizzare token e pattern condivisi prima di aggiungere CSS locale.
2. Verificare desktop e mobile, drawer aperto/chiuso e tab overflow.
3. Controllare focus, contrasto, stati vuoti, errore, successo e disabilitato.
4. Non aggiungere font, tracking o risorse esterne per impostazione predefinita.
5. Eseguire `npm run check`, test database ed E2E per modifiche visibili o comportamentali.
