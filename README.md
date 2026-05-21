# LZRV D&D Hub — Cyberpunk RED

Private character hub for Philip's Cyberpunk RED group. Hosted on Netlify, data on Supabase.

See **[CLAUDE.md](./CLAUDE.md)** for full project context (game rules, schema, conventions).

## First-time setup

```bash
# 1. Copy env template and fill in keys
cp .env.example .env
# → edit .env, add your SUPABASE_SERVICE_ROLE_KEY (Settings → API → service_role)

# 2. Install
npm install

# 3. Create database tables
# Open Supabase Dashboard → SQL Editor → paste db/schema.sql → Run

# 4. Seed the 581 items
npm run seed
```

## Develop

```bash
# Any static server works:
npx serve public
# → http://localhost:3000
```

## Deploy

Connected to Netlify via GitHub. Push to `main` → auto-deploy. Default subdomain: TBD.

## Stack

- Static HTML/CSS/JS on Netlify
- Supabase (Postgres + Realtime + Storage)
- `pdf-lib` for AcroForm parsing
- `@3d-dice/dice-box` for dice animation
