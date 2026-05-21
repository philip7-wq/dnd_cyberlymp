# LZRV D&D Hub — Cyberpunk RED Character Hub

## Project purpose
Web app where Philip (DM) and 6 friends manage their **Cyberpunk RED** characters during sessions: upload the fillable character-sheet PDF, view stats in a polished tabbed UI, roll dice (with proper crit detection), shop for items, and let the DM see everyone's HP/status live.

Inspired by `dndbeyond.com`, but Cyberpunk RED specific.

## Tech stack
- **Frontend:** Static HTML/CSS/JS — vanilla, no framework. Hosted on Netlify.
- **Backend:** Supabase (Postgres + Realtime + Storage).
- **PDF parsing:** `pdf-lib` (browser-side AcroForm reader).
- **Dice:** `@3d-dice/dice-box` for 3D animations + a pure-JS roll engine for the math/crit logic.
- **Auth:** Shared client-side PIN gate (6 friends, no real account system).

## Folder structure
```
lzrv-dnd-hub/
├── CLAUDE.md                 ← this file
├── README.md
├── package.json
├── netlify.toml
├── .env.example
├── .gitignore
├── db/
│   ├── schema.sql            ← run once in Supabase SQL Editor
│   ├── seed_items.js         ← `npm run seed` — fills items table
│   └── items.json            ← 581 Cyberpunk RED items (reference)
├── public/                   ← Netlify publish root
│   ├── index.html            ← landing / character picker dropdown
│   ├── upload.html           ← PDF upload + parser
│   ├── player.html           ← tabbed player view (?id=…)
│   ├── shop.html             ← item shop / inventory add
│   ├── dm.html               ← DM live dashboard
│   ├── robots.txt            ← Disallow: /
│   ├── character-sheet-template.pdf  ← blank PDF for reference
│   └── assets/
│       ├── css/
│       ├── js/
│       │   ├── supabase.js   ← client init + helpers
│       │   ├── pdf-parser.js ← AcroForm reader (see "PDF parsing" below)
│       │   ├── dice.js       ← roll engine + crit detection
│       │   └── ui/
│       └── fonts/            ← self-hosted, DSGVO-compliant
└── src/                      ← source modules if using a build step (TBD)
```

## Supabase schema (see `db/schema.sql`)

| Table | Purpose |
|---|---|
| `characters` | One row per PC. Big jsonb columns: `stats`, `skills`, `weapons`, `armor`, `gear`, `cyberware`, `lifepath`. Denormalized HP/Humanity/Luck for fast DM-dashboard reads. |
| `items` | 581 shop items (weapons, armor, cyberware, programs, gear, fashion). `extra` jsonb holds category-specific fields. |
| `rolls` | Live roll log. DM dashboard subscribes via Realtime. |

Realtime is enabled on `characters` and `rolls` (see schema).
Storage bucket `character-images` is public-read for portrait JPGs.

## Cyberpunk RED — core mechanics

### Stats (1–10 scale)
INT, REF, DEX, TECH, COOL, WILL, MOVE, BODY, EMP, LUCK

### Skill check
```
1d10 + STAT + Skill Level   vs.   DV (set by GM)
```

### Critical roll (the big one)
- **Natural 10 on the d10 → Critical Success.** Roll an additional +1d10 (not exploding further).
- **Natural 1 on the d10 → Critical Failure.** Roll −1d10 (subtract).
- Crit detection lives in `dice.js` and only applies to **skill checks**, never to damage.

### Damage
- Weapon damage is `XdY` (e.g. Medium Pistol = `2d6`, Heavy Pistol = `3d6`).
- Reduced by armor SP (Stopping Power).
- **Aimed shot** doubles damage past armor (handled later).

### Death save
- At 0 HP, roll `1d10`. If ≤ BODY (modified by Mortal Wound count), still alive but Mortally Wounded.

### Skill categories (mirror the character sheet)
Awareness, Body, Control, Education, Fighting, Performance, Ranged Weapon, Social, Technique.

## PDF parsing — field mapping

The fillable PDF (`public/character-sheet-template.pdf`) has **413 AcroForm fields**, named predictably:

| Bereich | Pattern | Beispiele |
|---|---|---|
| Stats | direct | `INT`, `REF`, `DEX`, `TECH`, `COOL`, `WILL`, `MOVE`, `BODY`, `EMP`, `EMP MAX` |
| HP/Status | direct | `Current HP`, `Max HP`, `Current Humanity`, `LUCK CURRENT`, `LUCK MAX`, `Death Save`, `Seriously Wounded Threshhold` (note typo in PDF) |
| Skill level | `LVL{Name} {STAT}` | `LVLHandgun REF`, `LVLAthletics DEX` |
| Skill total | `{Name} Total` | `Handgun Total`, `Athletics Total` |
| Weapons | `WEAPONRow1-6`, `DMGRow1-6`, `AMMORow1-6`, `ROFRow1-6`, `NOTESRow1-6` | 6 slots |
| Armor | `Head Armor`, `Body Armor`, `Shield`, `SPHead`, `SPBody`, `SPShield`, `PENALTYHead`, `PENALTYBody`, `PENALTYShield` | |
| Gear | `Gear 1-18`, `Gear Notes 1-18` | 18 slots |
| Cyberware | `{Slot} Box` (checkbox), `{Slot} 1-N` (option), `{Slot}Data 1-N` | Slots: R/L Eye, R/L Arm, R/L Leg, Audio, Link, IC (Internal), EC (External), FW (Fashion), Borg |
| Lifepath | direct | `Cultural Origins`, `Personality`, `Family Crisis`, `Life Goals`, `Friend 1-3`, `Love Affair 1-3`, `Who 1-3`, `What Caused It`, `Throw At You`, `Happen` |
| Identity | direct | `Handle`, `Role`, `Aliases`, `Role Ability`, `Role Ability Rank` |
| Resources | direct | `Cash`, `Ammo`, `Reputation`, `Total IP`, `Current IP`, `Housing`, `Rent`, `Lifestyle` |
| Character image | `Character Image` | **Pushbutton with bitmap appearance.** Extract via `field.acroField.lookup(PDFName.of('AP'))` → `/N` stream → embedded XObject (JPG/PNG). |

### Skill name → JSON key
Strip the `LVL` prefix and the trailing ` {STAT}` to get the canonical skill name:
`LVLHandgun REF` → `Handgun`. Skills with `(x2)` cost (Autofire, Martial Arts, Heavy Weapons, etc.) keep that flag in metadata.

## Dice engine (`dice.js`) requirements
- `roll(expression: string, opts?: { context?: string, isSkillCheck?: boolean, characterId?: string })` → returns `{ total, individualRolls, isCritSuccess, isCritFailure }` and logs to `rolls` table.
- Parse `XdY+Z`, `XdY-Z`, multi-term (`1d10+1d6+3`).
- **Skill checks only:** auto-detect crit on the *first* d10 in the expression.
- 3D animation via `@3d-dice/dice-box` — fall back to instant result if library fails to load.

## UI conventions
- **Style:** A24/cinematic dark + neon Cyberpunk accents. Red `#FF2D2D` as primary accent (matches PDF), cyan `#00E5FF` for stat highlights, near-black background.
- **Typography:** Self-hosted webfonts (DSGVO). Display: a chiseled / chrome font (e.g. `Russo One` or `Audiowide`). Body: `Inter` or `IBM Plex Sans`.
- **Tabs:** Stats · Skills · Weapons · Armor · Cyberware · Gear · Lifepath · Notes.
- **Dice button:** floating bottom-left, opens a popup with d6/d10 quick-roll + custom `XdY+Z` input + recent rolls.
- **Inline damage rolls:** every damage value (e.g. `3d6` on a weapon) is a clickable button.
- **Realtime:** DM page subscribes to `characters` + `rolls` channels.

## Coding conventions
- Vanilla JS only — no React, no build step (unless absolutely needed).
- Modules: ES modules (`<script type="module">`).
- Imports via local `node_modules` copies in `assets/vendor/` OR ESM CDN (`https://esm.sh/...`). Decide per-library.
- All Supabase queries go through helpers in `assets/js/supabase.js`. No raw queries in page files.
- German UI strings allowed (Philip is German), but **game terms stay English** (Handgun, Cyberware, Brawling — matches the rulebook).
- File naming: kebab-case (`pdf-parser.js`, not `pdfParser.js`).

## Environment variables
See `.env.example`. The `SUPABASE_ANON_KEY` is publishable and lands in client JS via build-time replacement or hardcoded in `supabase.js`. The `SUPABASE_SERVICE_ROLE_KEY` is **only** for the local `seed` script — never commit, never ship.

## Build phases (current status: setup)
- [x] Phase 1 — Setup: schema, seed, repo skeleton
- [ ] Phase 2 — `upload.html` + pdf-parser.js
- [ ] Phase 3 — `player.html` + tabs + dice
- [ ] Phase 4 — `shop.html` + inventory ops
- [ ] Phase 5 — `dm.html` + realtime dashboard
- [ ] Phase 6 — Netlify deploy + polish
