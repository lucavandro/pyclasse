# Linee guida stilistiche

PyClasse adotta **Dracula Theme** come linguaggio cromatico unico. Ogni nuova
schermata deve riutilizzare i token CSS esistenti e mantenere coerenza con
`app/dark.css`; colori arbitrari vanno evitati.

## Palette

| Ruolo        | Colore    | Uso principale                   |
| ------------ | --------- | -------------------------------- |
| Background   | `#282a36` | pannelli e superfici principali  |
| Current line | `#44475a` | bordi, separatori e stati neutri |
| Foreground   | `#f8f8f2` | testo principale                 |
| Comment      | `#6272a4` | testo secondario decorativo      |
| Cyan         | `#8be9fd` | link, navigazione e informazioni |
| Green        | `#50fa7b` | successo e avanzamento           |
| Orange       | `#ffb86c` | scadenze e avvisi non bloccanti  |
| Pink         | `#ff79c6` | identità del brand e accenti     |
| Purple       | `#bd93f9` | azioni primarie e selezioni      |
| Red          | `#ff5555` | errori e azioni distruttive      |
| Yellow       | `#f1fa8c` | evidenziazioni                   |

Sono ammesse tonalità derivate solo per hover, trasparenze, ombre e contrasto.
Il logo Google conserva i colori ufficiali del provider.

## Personalizzare la palette

Tutti gli stili Dracula attivi leggono i colori dal blocco `:root` collocato
sotto il commento `Dracula-inspired palette` in `app/dark.css`. Per creare una
variante grafica Ã¨ quindi sufficiente modificare le variabili in quel blocco:
non bisogna cambiare i singoli selettori o componenti.

I token sono organizzati in tre livelli:

1. `--color-background`, `--color-surface`, `--color-current-line` e
   `--color-foreground` definiscono sfondi, pannelli, bordi e testo.
2. `--color-cyan`, `--color-green`, `--color-orange`, `--color-pink`,
   `--color-purple`, `--color-red` e `--color-yellow` rappresentano la palette
   Dracula originale.
3. Le variabili `--color-surface-*`, `--color-text-*`, `--focus-ring`,
   `--*-shadow` e `--*-surface` sono varianti semantiche per controlli, stati,
   trasparenze e ombre.

Esempio di personalizzazione minima:

```css
:root {
  --color-background: #10131a;
  --color-surface: #202532;
  --color-purple: #a78bfa;
  --color-cyan: #67e8f9;
}
```

I vecchi nomi `--ink`, `--muted`, `--cream`, `--panel`, `--line`, `--coral`,
`--teal` e `--blue` sono alias mantenuti per compatibilitÃ : nei nuovi stili si
devono usare i token `--color-*`. Quando si aggiunge una tonalitÃ , dichiararla
nel medesimo blocco e assegnarle un nome basato sul suo ruolo, non sul singolo
componente. Dopo ogni modifica verificare il contrasto WCAG 2.1 AA, inclusi
hover, focus, messaggi di errore e opzioni native dei menu a tendina.

## Altri design token

Lo stesso blocco `:root` centralizza anche le caratteristiche grafiche non
cromatiche:

- `--font-ui`, `--font-code` e `--font-editorial` definiscono le famiglie;
- `--font-size-*`, `--line-height-*` e `--font-weight-*` definiscono la scala
  tipografica;
- `--space-*` definisce la scala di spaziatura condivisa;
- `--radius-*` controlla la forma di campi, pulsanti, badge e pannelli;
- `--control-min-height`, `--border-width` e `--focus-width` definiscono le
  dimensioni accessibili dei controlli;
- `--duration-*` e `--easing-standard` regolano le animazioni;
- `--layer-*` definisce i livelli di sovrapposizione.

Per cambiare font non bisogna intervenire sui componenti. È sufficiente
modificare gli alias semantici, lasciando invariati i token usati dai selettori:

```css
:root {
  --font-ui: system-ui, sans-serif;
  --font-code: "Cascadia Code", monospace;
  --font-editorial: Georgia, serif;
  --radius-md: 6px;
  --duration-normal: 0.18s;
}
```

Geist e Geist Mono sono distribuiti localmente da `public/fonts` e dichiarati
con `@font-face` in `app/globals.css`, senza richieste a CDN o servizi Google.
Sono assegnati rispettivamente a `--font-geist` e `--font-mono`. Per sostituirli
alla fonte, aggiornare gli asset locali e mantenere `--font-ui` e `--font-code`
come livello di astrazione. Nei nuovi componenti evitare valori ripetuti scritti
direttamente: usare il token esistente oppure aggiungerne uno semantico a questa
scala. I file Geist sono redistribuiti secondo la SIL Open Font License 1.1
inclusa in `public/fonts/OFL.txt`.

## Gerarchia visiva

- Sfondo pagina `#191a21`, pannelli `#282a36`, superfici interattive
  `#343746` e bordi `#44475a`.
- Viola per l'azione primaria; ciano per link, focus informativi e azioni
  secondarie; rosa per il marchio e piccoli richiami.
- Verde e rosso devono comunicare esclusivamente esito positivo ed errore.
- Limitare gli accenti simultanei: una sezione deve avere una sola azione
  primaria evidente.

## Tipografia e spaziatura

- Geist è il carattere dell'interfaccia, Geist Mono è riservato a codice,
  output e valori tecnici; Georgia è usato nei titoli editoriali.
- Testo base minimo 16 px; etichette e note non devono scendere sotto 11 px.
- Usare una scala di spaziatura coerente (multipli di 4 px) e mantenere almeno
  44 px per l'altezza dei controlli principali.
- Titoli brevi, etichette esplicite e testo operativo; evitare gergo tecnico
  nelle schermate rivolte a studenti e docenti.

## Componenti e interazioni

- Raggio consigliato: 8–12 px per controlli, 14–18 px per pannelli.
- I campi devono avere etichette visibili, stato focus evidente e messaggi
  associati tramite ruoli accessibili.
- Pulsanti disabilitati riconoscibili ma leggibili; non affidarsi solo al
  colore per comunicare lo stato.
- Le opzioni non abilitate, come provider di login opt-in, non devono comparire
  come controlli inattivi.
- Le opzioni native dei menu a tendina devono dichiarare esplicitamente colore
  di testo e sfondo Dracula, perché il rendering predefinito varia fra sistemi
  operativi.
- Le icone Material Symbols accompagnano un'etichetta nelle azioni importanti;
  icone decorative devono essere nascoste alle tecnologie assistive.

## Accessibilità e responsive design

- Obiettivo minimo WCAG 2.1 AA per contrasto e navigazione da tastiera.
- Tutti gli elementi interattivi devono mostrare `:focus-visible`.
- Il layout deve funzionare da 320 px in su senza scorrimento orizzontale.
- Su schermi piccoli si riduce la complessità visiva, senza rimuovere funzioni
  o informazioni necessarie.
- Animazioni e decorazioni non devono bloccare l'uso né veicolare da sole
  informazioni essenziali.

## Controlli e report docente

Textarea, select, checkbox e radio usano superficie, bordo, focus ring e token
del tema. Checkbox e radio personalizzati mantengono l'input nativo nel DOM,
un'etichetta cliccabile e uno stato `focus-visible`; non vanno sostituiti con
elementi privi di semantica.

Il report docente separa riepilogo, filtri, valutazioni e monitoraggio Realtime.
Le azioni ripetute usano pulsanti compatti con nome accessibile, mentre ricerca
e filtri restano visibili sopra la tabella. Su viewport stretti la tabella
docente può scorrere orizzontalmente senza comprimere voto e azioni fino a
renderli illeggibili.

## Checklist per nuove schermate

1. Riutilizzare token, componenti e pattern già presenti.
2. Verificare desktop e mobile, focus da tastiera e messaggi d'errore.
3. Non caricare font, icone o immagini da terze parti senza necessità e consenso.
4. Eseguire formattazione, lint, controllo TypeScript e test pertinenti.
5. Aggiornare questa guida quando viene introdotto un nuovo pattern condiviso.
