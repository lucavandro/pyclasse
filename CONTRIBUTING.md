# Contribuire a PyClasse

## Preparazione

Richiede Node.js 22.13 o successivo. Installa le dipendenze con `npm ci`, copia
`.env.example` in `.env.local` e usa `npm run dev`.

Prima di proporre una modifica esegui:

```bash
npm run check
npm run test:db
```

Non includere segreti, dati personali o esportazioni di ambienti scolastici.
Mantieni le modifiche piccole, aggiungi test per il comportamento modificato e
descrivi nella pull request motivazione, verifica svolta ed eventuali limiti.

Inviando un contributo dichiari di avere il diritto di farlo e accetti che sia
distribuito secondo la licenza contenuta in `LICENSE`, inclusa l'attribuzione
dell'opera originale a Luca Vandro.

Le modifiche allo schema vanno aggiunte come nuove migrazioni timestampate in
`supabase/migrations/`; non riscrivere migrazioni già distribuite.

Ogni pull request deve completare la checklist GDPR inclusa nel template e
rispettare le regole di privacy by design definite in
`docs/PRIVACY_AND_DATA_PROTECTION.md`. Una modifica che tratta nuovi dati personali senza
finalità, minimizzazione, retention, diritti e valutazione dei fornitori non è
pronta per essere approvata.
