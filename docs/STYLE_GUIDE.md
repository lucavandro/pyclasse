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

## Checklist per nuove schermate

1. Riutilizzare token, componenti e pattern già presenti.
2. Verificare desktop e mobile, focus da tastiera e messaggi d'errore.
3. Non caricare font, icone o immagini da terze parti senza necessità e consenso.
4. Eseguire formattazione, lint, controllo TypeScript e test pertinenti.
5. Aggiornare questa guida quando viene introdotto un nuovo pattern condiviso.
