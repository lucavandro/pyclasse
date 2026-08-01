# PyClasse

Piattaforma didattica per classi, esercizi Python, editor online, grading nel browser, feedback IA e report docente.

## Avvio rapido

```bash
npm install
copy .env.example .env.local
npm run dev
```

Aprire `http://localhost:3000`. Prima dell'uso reale configurare Supabase, Google OAuth e l'email dell'unico docente seguendo la [guida completa](docs/INSTALLATION_AND_DEPLOYMENT.md).

## Comandi

- `npm run dev`: sviluppo locale.
- `npm test`: build e suite automatizzata.
- `npm run build`: build di produzione.
- `npm run start`: avvio della build locale.

Le specifiche funzionali sono in [spec.md](spec.md). Lo schema iniziale con RLS è in [supabase/schema.sql](supabase/schema.sql).
