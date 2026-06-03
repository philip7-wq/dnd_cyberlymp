# PROJECT_OVERVIEW.md — LZRV D&D Hub (Cyberpunk RED)
> Stand: 2026-06-02. Alle Abschnitte aus dem Live-Code abgeleitet.

---

## 1. Projekt-Übersicht

**Was:** Private Web-App für Philip (DM) und 6 Freunde zum Verwalten ihrer Cyberpunk RED-Charaktere während Sessions. Inspiriert von DnDBeyond, aber Cyberpunk RED-spezifisch.

**Tech-Stack:**
- **Frontend:** Vanilla HTML/CSS/JS (ES-Module), kein Build-Step, kein Framework
- **Hosting:** Netlify (auto-deploy bei `git push main`), Publish-Root: `public/`
- **Backend:** Supabase (Postgres + Realtime-Subscriptions + Storage)
- **PDF-Parser:** `pdf-lib` (browser-seitig, AcroForm-Reader)
- **Dice:** `@3d-dice/dice-box` (deaktiviert wegen CDN-Problemen), Fallback: eigener JS-Roll-Engine in `dice.js`
- **Fonts:** Google Fonts CDN (Audiowide + Inter)
- **Auth:** Kein echtes Auth-System — Client-seitig gesteuerter PIN-Gate (6 Freunde, RLS ist permissiv `FOR ALL USING (true)`)

**Design:** A24/cinematic dark + neon Cyberpunk. `--red: #FF2D2D`, `--cyan: #00E5FF`, Background `#0a0a0f`.

---

## 2. Ordnerstruktur

```
lzrv-dnd-hub/
├── CLAUDE.md                        ← Vollständige Projekt-Specs für KI-Kontext (WICHTIG)
├── PROJECT_OVERVIEW.md              ← diese Datei
├── README.md                        ← Setup-Anleitung (kurz)
├── package.json                     ← name: lzrv-dnd-hub, nur seed-Script + @supabase/supabase-js
├── netlify.toml                     ← publish=public, Cache-Headers, X-Robots-Tag noindex
├── .env / .env.example              ← SUPABASE_SERVICE_ROLE_KEY (nur für seed, nie deployen)
├── db/
│   ├── schema.sql                   ← Haupt-Schema (characters, items, rolls, combat_sessions,
│   │                                   game_state, character_effects, session_log)
│   ├── roles-schema.sql             ← role_inventory, role_actions + Realtime
│   ├── agent-schema.sql             ← iCHOOM-System (contacts, threads, messages, calls,
│   │                                   transfers) + Trigger + group_id/started_at_ingame
│   ├── sound-schema.sql             ← sound_library, sound_buttons
│   ├── seed_items.js                ← `npm run seed` — befüllt items-Tabelle (581 Items)
│   ├── items.json                   ← Quelle für seed (Waffen, Armor, Cyberware, etc.)
│   ├── ammunition.json              ← Munitions-Typen mit Sondereffekten
│   ├── combat-modifiers.json        ← Auto-Modifiers (Wound-Penalty, Armor-Penalty, Grapple)
│   ├── critical-injuries.json       ← Body/Head-Tabellen (2d6 → Injury-Name + Effekte)
│   ├── role-abilities.json          ← Referenz-Daten für Rollen-Fähigkeiten
│   ├── agent-setup-instructions.md  ← Anleitung: agent-schema.sql ausführen
│   ├── roles-setup-instructions.md  ← Anleitung: roles-schema.sql ausführen
│   ├── sound-setup-instructions.md  ← Anleitung: sound-schema.sql + Storage-Bucket
│   └── map-update-setup-instructions.md ← Anleitung: death_state, roll_requests, saved_maps
├── img/
│   └── door1-3 open/close JPGs      ← Tür-Bilder für Map-Tokens
├── public/                          ← Netlify publish root
│   ├── index.html                   ← Landing / Charakter-Picker
│   ├── upload.html                  ← PDF-Upload + Parser
│   ├── player.html                  ← Spieler-Sheet (4158 Zeilen)
│   ├── dm.html                      ← DM-Dashboard (3802 Zeilen)
│   ├── map.html                     ← Taktische Karte (4983 Zeilen)
│   ├── shop.html                    ← Item-Shop
│   ├── create.html                  ← Charakter manuell erstellen
│   ├── npc-sheet.html               ← NPC-Sheet (Combat / Stats / Effects / Notes)
│   ├── radio.html                   ← Standalone Radio-Seite
│   ├── robots.txt                   ← Disallow: /
│   ├── character-sheet-template.pdf ← Leeres Cyberpunk RED PDF (Referenz)
│   ├── db/
│   │   ├── map-update3-setup-instructions.md ← groups_json Migration
│   │   └── map-weapons-setup-instructions.md ← Weapon Range System (nur Client)
│   └── assets/
│       ├── css/
│       │   ├── base.css             ← CSS-Variablen, Reset, Typografie (shared)
│       │   ├── player.css           ← Player-Sheet Styles
│       │   ├── dm.css               ← DM-Dashboard Styles
│       │   ├── map.css              ← Map-Seite Styles
│       │   ├── map-weapons.css      ← Weapon Panel, Attack Flow
│       │   ├── agent.css            ← iCHOOM Phone Styles
│       │   ├── roles.css            ← Rollen-Interface Styles
│       │   ├── shop.css             ← Shop Styles
│       │   ├── topbar.css           ← Game-Time Topbar Styles
│       │   ├── session-bar.css      ← Session-Bar (32px, über Topbar)
│       │   ├── radio.css            ← Radio-Widget (eingebettet in player/dm)
│       │   ├── radio-standalone.css ← Radio-Standalone-Seite
│       │   ├── sound.css            ← Sound-Panel Styles
│       │   ├── index.css            ← Landing-Page Styles
│       │   └── upload.css           ← Upload-Page Styles
│       ├── js/
│       │   ├── supabase.js          ← Alle DB-Helpers (671 Zeilen) — SINGLE SOURCE OF TRUTH
│       │   ├── dice.js              ← Roll-Engine + Crit-Detection + Animation
│       │   ├── game-time.js         ← In-Game-Time-System + Effect-Engine (339 Zeilen)
│       │   ├── combat-modifiers.js  ← Combat-Pipeline (Wound/Armor/Injury/Sleep)
│       │   ├── pdf-parser.js        ← AcroForm-Reader für 413-Felder-PDF
│       │   ├── weapon-utils.js      ← DV-Tabellen, Range-Brackets, guessWeaponDvType
│       │   ├── sound-player.js      ← Player-seitiger Sound-Empfänger
│       │   ├── sound-dm.js          ← DM-Mixing-Board (Upload, Buttons, Broadcast)
│       │   ├── roles/
│       │   │   ├── roles-core.js    ← Shared Dice-/UI-/DB-Primitiven für alle Rollen (450 Z.)
│       │   │   ├── roles-router.js  ← Lazy-Import per Rollen-Key
│       │   │   ├── solo.js          ← Combat Awareness
│       │   │   ├── netrunner.js     ← Interface / NET Actions
│       │   │   ├── tech.js          ← Maker / Crafting
│       │   │   ├── medtech.js       ← Medicine / Pharma / Surgery (636 Zeilen)
│       │   │   ├── media.js         ← Credibility / Rumours
│       │   │   ├── exec.js          ← Teamwork / Team Members
│       │   │   ├── lawman.js        ← Backup Call
│       │   │   ├── fixer.js         ← Operator / Haggle
│       │   │   ├── nomad.js         ← Moto / Motorpool
│       │   │   └── rockerboy.js     ← Charismatic Impact
│       │   ├── agent/
│       │   │   ├── agent-core.js    ← iCHOOM Shell (Boot/Shutdown/Routing/Sound/State)
│       │   │   ├── agent-apps.js    ← Apps (Chrome Chat, CallJack, Contacts, EddieWire) (970 Z.)
│       │   │   └── agent-dm.js      ← DM-Konsole (NPC-Tabs, Code-Generator) (417 Z.)
│       │   ├── radio/
│       │   │   ├── radio-config.js  ← 5 Stationen + Phantom-Frequenzen + Band-Grenzen
│       │   │   ├── radio-engine.js  ← Web Audio API (AudioContext/GainNodes/Analyser) (218 Z.)
│       │   │   ├── radio-ui.js      ← Knobs, LED, Tuner-Anzeige
│       │   │   ├── radio-visualizer.js ← Canvas Waveform/FFT-Visualizer
│       │   │   ├── radio-mount.js   ← Einbetten in player/dm
│       │   │   └── radio-standalone-mount.js ← Für radio.html
│       │   └── ui/
│       │       ├── topbar.js        ← Game-Time-Topbar (250ms-Tick, Sleep-Indicator)
│       │       ├── session-bar.js   ← DM-Session-Leiste (Start/Stop/Timer/Log) (304 Z.)
│       │       └── dm-time-dial.js  ← DM-Modal für Time-Control (Pause/Jump/Combat/Rest)
│       ├── data/
│       │   ├── items.json           ← 581 Shop-Items (Kopie von db/items.json)
│       │   ├── ammunition.json      ← Munitions-Typen
│       │   ├── combat-modifiers.json ← (Kopie)
│       │   ├── critical-injuries.json ← (Kopie)
│       │   └── role-abilities.json  ← (Kopie)
│       ├── images/blackmarket/      ← Tür-JPGs für Map
│       ├── img/                     ← logo.png, cyberware-skeleton.png
│       └── sounds/
│           ├── agent/               ← boot.mp3, ringtone.mp3, notification.mp3, send.mp3, shutdown.mp3, tap.mp3
│           └── radio/               ← 5 Sender-MP3s + static_noise.mp3 + radio_on/off.wav
```

---

## 3. Pages / Seiten

### `index.html` — Landing / Charakter-Picker
- Dropdown mit allen Chars aus Supabase
- "Als Spieler einsteigen" → `player.html?id=<uuid>`
- "Als DM einsteigen" → `dm.html`
- Links zu `upload.html` und `create.html`
- Radio-Link oben rechts → `radio.html`
- Letzte Auswahl wird in `localStorage` gespeichert

### `upload.html` — PDF-Upload
- Drag & Drop oder File-Input für Cyberpunk RED Charakter-Sheet PDF
- `pdf-parser.js` liest alle 413 AcroForm-Felder aus
- Zeigt geparste Daten zur Vorschau (Stats, Skills, Waffen, Armor, Cyberware, Lifepath)
- **Specialty-Karten** für Medtech/Tech/Solo: interaktiver Punkt-Vergabe-Wizard
- "Charakter speichern" → Insert in `characters`-Tabelle + Bild-Upload in Storage
- Cache-Buster-Parameter auf CSS/JS-Imports

### `player.html` — Spieler-Sheet (~4158 Zeilen)
- Lädt Charakter per `?id=<uuid>` aus Supabase
- **Tabs:** Stats · Skills · Weapons · Armor · Cyberware · Gear · Lifepath · Notes · Rollen
- **Game-Time-Topbar** (oben, 36px hoch) + **Session-Bar** (darüber, 32px)
- **iCHOOM Agent Phone** (unten mittig, klappbar)
- **Radio** (embedded via `radio-mount.js`)
- **Sound-Lautstärke-Button** (oben rechts, `sound-player.js`)
- **Skill-Check-Modal** mit Sleep-Modifier, Solo-Combat-Awareness-Bonus, Injury-Penalties
- **Würfel-Popup** (floating, d6/d10/custom-Expression)
- **Damage-Roll-Buttons** auf Waffen-Tab (klickbar)
- **Name editierbar** via Stift-Button (contenteditable + blur-Save + patchCharacter)
- **Stats editierbar** via Edit-Button (inline `contenteditable`)
- **Combat-Bar** (wenn aktiv) — zeigt Reihenfolge, hebt aktiven Char hervor
- **Death-Banner** wenn `death_state=true`
- **Roll-Request-Modal** wenn DM einen Damage-Roll an diesen Char sendet
- **Session-Start-Popup** mit 10-Min-Auto-Timeout
- Realtime: `subscribeCharacters`, `subscribeCombat`, `subscribeRollRequests`, `subscribeCharacterEffects`, `subscribeGameState`, `subscribeSessionLog`

### `dm.html` — DM-Dashboard (~3802 Zeilen)
- Kein `?id=` — DM-Modus
- **Tabs:** Charaktere · NPCs · Combat · Karte-Link · Chat · Sound · Settings
- **Charaktere-Tab:** HP-Karten aller PCs mit HP-Edit, Conditions, Wounds, Buffs, Cash, Effects
- **NPC-Tab:** NPC erstellen/bearbeiten, HP-Edit, Gruppenfarben
- **Combat-Tab:** Initiative-Liste, Reihenfolge ziehen/neu anordnen, Schaden anwenden, Death Save
- **Chat-Tab:** Shared Chat mit Bild-Upload
- **Sound-Tab:** Mixing-Board (sound-dm.js) — Upload, Buttons, Broadcast an Player
- **Session-Bar** (DM-Modus: Start/Stop/Name/Log)
- **Game-Time-Topbar** + ⚙-Button → DM-Time-Dial Modal
- **iCHOOM DM-Konsole** (goldene Bar unten, NPC-Tabs, Chrome Chat / CallJack / EddieWire)
- **Radio** (embedded)
- Realtime: alle Tabellen subscribed

### `map.html` — Taktische Karte (~4983 Zeilen)
Komplex, Canvas-basiertes Rendering. Enthält:
- **DM-Sidebar:** Token platzieren (Char/NPC/Vehicle/Custom), Hintergrund hochladen, Karte speichern/laden, Tokens bearbeiten
- **Token-System:** Drag & Drop, Snap-to-Grid, Größen für Vehicles (in Grid-Einheiten)
- **Z-Order:** `char` (3) > `npc` (2) > `vehicle/object/custom` (1), ausgewählt (4) — per Array-Sort vor Render
- **Move-Distance-Zone:** Gelber Kreis am Drag-Origin (MOVE × 1 = harte Grenze), live-geclamped in mousemove, verschwindet beim Loslassen, nur für eigenen Char
- **Weapon Range Rings:** Konzentrische Zonen pro Waffen-Typ, DV-Labels, Off-Screen-Canvas-Cache
- **Measure-Tool:** Distanz-Messung mit Snap-to-Token-Center, Zone-farbige Linie + Pill-Label
- **Attack-Flow:** Step 1 (Attack Roll) → Step 2 (Damage) → Step 3 (SP-Abzug + Apply)
- **Autofire / Shotgun-Cone:** Sonder-Angriffsmodi
- **Combat-Bar:** Horizontal oben, synchron über `combat_sessions`
- **Death-State:** Token-Overlay (grau + roter X), Spectator-Mode für Spieler
- **Türen:** Klickbar open/close via door-Bilder
- **Token-Gruppen + Farben:** NPC-Gruppen mit Gruppen-Farbe, DM-Farbpicker
- **Map-Save/Load:** `saved_maps`-Tabelle, Ctrl+S, Dropdown
- Realtime: `maps`, `characters`, `npcs`, `combat_sessions`, `roll_requests`, `game_state`

### `shop.html` — Item-Shop
- Lädt alle 581 Items aus `items`-Tabelle
- Sidebar mit Kategorien (Weapons, Armor, Cyberware, Gear, Programs, Fashion, Pharmaceuticals, Ammunition)
- Item-Detail-Panel mit Preis, Beschreibung, Stats
- "Kaufen" → Slot-Picker-Modal für Cyberware → `patchCharacter` mit Inventory-Update
- Cash-Abzug via `patchCash`
- Cyberpsychosis-Modal wenn Humanity 0

### `create.html` — Charakter manuell erstellen
- Step-Wizard (5 Steps) mit Fortschrittsanzeige
- Schritt 1: Name/Role/Handle/Player-Name
- Schritt 2: Stats (10 Felder à 1–10)
- Schritt 3: HP/Humanity/Luck + Resources (Cash, IP, Rep)
- Schritt 4: Skills (alle Kategorien)
- Schritt 5: Cyberware / Finish + optionaler Portrait-Upload
- Insert via `saveCharacter`

### `npc-sheet.html` — NPC-Sheet
- `?id=<npc-uuid>`
- Tabs: Combat · Stats · Effects · Notes
- Combat: HP-Edit, Conditions, Death Save, Critical Injuries
- Effects: character_effects-artig (effects auf NPCs via npc-lokale Tabelle)
- Notes: `<textarea>` mit Auto-Save

### `radio.html` — Standalone Radio
- Retro-Relic-Radio-Optik mit Knobs und LED
- 5 Sender: ChromeWave 89.9, Emergency 91.5, Afterlife 94.1, Wasteland 102.7, NightCity Air 107.7
- 3 Phantom-Frequenzen (92.7, 98.3, 104.5) → LED flackert gelb
- AudioContext mit GainNode-Fade (Station ↔ Static)
- Canvas Waveform-Visualizer + FFT-Hintergrund-Visualizer
- Sender spielen live (Pseudo-Live: UTC-basierter Offset seit Epoch 2026-01-01)

---

## 4. Features / Funktionen

### Map / Token-System
- **Token-Typen:** `char` (Spieler), `npc`, `vehicle`, `object`, `custom`
- **Rendering:** Canvas 2D, Array-Sort nach Layer-Rank für Z-Order
- **Drag & Drop:** Snap-to-Grid, live MOVE-Clamp für eigenen Spieler-Token
- **DM:** Token platzieren, löschen, umbenennen, Größe ändern (Vehicles), Farbe/Gruppe setzen
- **Saved Maps:** Supabase `saved_maps`-Tabelle, Ctrl+S, Dropdown-Auswahl
- **Move-Zone:** Gelber Kreis am Drag-Startpunkt (MOVE-Stat × GridSize Pixel)
- Dateien: `map.html` (monolithisch)

### Player Sheets
- **Stats:** INLINE edit via contenteditable (edit-Button → Bleistift)
- **Skills:** Alle Skill-Kategorien (Awareness, Body, Control, Education, Fighting, Performance, Ranged, Social, Technique), Skill-Check-Modal mit sleep-Modifier
- **Inventar:** Gear, Cyberware (Slots), Weapons (6 Slots), Armor
- **Würfeln:** Custom-Expression, d10/d6 Quick-Buttons, Crit-Detection, Log in Supabase
- **Damage Rolls:** Klickbare `XdY`-Expressions auf Waffen-Tab
- **Name editierbar:** Stift-Button neben Char-Name, blur-to-save
- Dateien: `player.html`, `player.css`

### DM-Panel
- **HP live editieren** für alle Chars per Click-to-edit-Karte
- **Combat starten** → Initiative-Liste
- **NPC erstellen/verwalten** mit Portrait-Upload
- **Schaden anwenden** via Roll-Requests (player würfelt selbst)
- **Chat** zwischen allen Clients (Bild + Text)
- **Session-Log** (letzte 50 Sessions)
- Dateien: `dm.html`, `dm.css`

### Rollen-Interfaces (10 Rollen)
Jede Rolle hat ein dediziertes Modul in `roles/`. Alle nutzen `performCheck` aus `roles-core.js`, das den **Sleep-Deprivation-Modifier** automatisch einbindet.

| Rolle | Ability | Features |
|---|---|---|
| **Solo** | Combat Awareness | Punkte-Verteilung (Deflection/Fumble/Init/Precision/SpotWeak/Threat), Subtabs, localStorage + Supabase |
| **Netrunner** | Interface | NET Actions (Backdoor, Cloak, Control, Eyeball, Pathfinder, Scanner, Slide, Virus, Zap), NET Architecture Designer |
| **Tech** | Maker | 4 Specialties (Field/Upgrade/Fabrication/Invention), Crafting-Würfe, Invention-Projekt-Tracker |
| **Medtech** | Medicine | 3 Specialties, 5 Pharmazeutika (Antibiotic/Rapidetox/Speedheal/Stim/Surge), Surgery-Liste, Brautab, Timed Effects via `character_effects` |
| **Media** | Credibility | Believability-Würfe, Source-Liste (Street/Community/City/National/World), Rumour-Tracker |
| **Exec** | Teamwork | 5 Team-Member-Klassen (Assassin/Fixer/Bodyguard/Hacker/Exec), Loyalty 1–10, Missions |
| **Lawman** | Backup | Backup-Call (1d10 ≤ Rank), 1d6 Rounds, Tier-Bump bei 6, SWAT/K9/MAXTAC-Tiers |
| **Fixer** | Operator | 3 Reach-Tiers (Street/City/Corp), Haggle-Bonus, Grease, Contact-List |
| **Nomad** | Moto | +Moto auf Drive-Würfe, Motorpool-Würfe, Family Vehicle Pool |
| **Rockerboy** | Charismatic Impact | Rank+1d10 vs DV 8/10/12 (Single/≤6/Huge), 1-Woche Lock-out bei Fail, Fans-Tracker |

Gemeinsam: Action-Log (Realtime), Inventory-Items (role_inventory), Target-Picker-Modal (Player + NPC)

### iCHOOM Agent Phone
- **Chrome Chat:** 1:1 Threads (Player↔Player, Player↔NPC), Realtime, Bild-Sharing geplant
- **CallJack:** Anrufe (ringing → answered/missed/declined/ended), Eingehend-Overlay mit Sound, **Gruppen-Anrufe** (N parallele `agent_calls`-Rows mit gleichem `group_id`)
- **Contacts:** Auto-erstellt bei neuem Char (Trigger), NPC via Code-Eingabe (Format NX-XXXX)
- **EddieWire:** Geldtransfers (Send sofort, Request pending→accepted), DB-Trigger auf `characters.cash`
- **DM-Modus:** NPC-Tab-System, NPC-Code-Generator, Chrome Chat als beliebiger NPC, Gruppen-Anruf-Starter
- Sounds: `boot.mp3`, `ringtone.mp3`, `notification.mp3`, `send.mp3`, `shutdown.mp3`, `tap.mp3`
- Dateien: `agent-core.js`, `agent-apps.js`, `agent-dm.js`, `agent.css`, `agent-schema.sql`

### Combat / Damage / Roll-System
- **Würfel:** `dice.js` — `roll(expr, opts)` → `{ total, individualRolls, isCritSuccess, isCritFailure }`; Crit nur bei `isSkillCheck: true` auf ersten d10
- **Modifiers:** `combat-modifiers.js` — `getActiveModifiers(entity, actionType)`: Wound-Penalty, Armor-Penalty, Grapple, **Sleep-Deprivation** (virtual, via `last_long_rest_at_ingame`)
- **Injury-System:** `rollCriticalInjury(location, existing)` → 2d6 auf Body/Head-Tabelle, `getInjuryPenaltyStruct` für UI
- **Death Save:** `resolveDeathSave(entity)` — 1d10, kein Sleep-Modifier (absichtlich)
- **rollWithModifiers:** Universeller Roll-Wrapper (Stat + Skill + AutoMods + Injuries + ManualMods)
- **performCheck:** Sync-Version in `roles-core.js` — für Rollen-Checks (+ Sleep-Modifier direkt addiert)
- **Crit-Injuries:** automatisches SP-Ablate (−1 bei Treffer), Aimed-Shot (×2 Damage nach Armor)
- Roll-Log: `rolls`-Tabelle mit Realtime-Sub im DM-Panel

### Radio-System
- 5 Sender mit MP3-Dateien in `assets/sounds/radio/`
- Frequenz-Tuner (87.5–108.0 MHz), Phantom-Frequenzen (Gelb/Flicker LED)
- `getLivePosition(duration)` → UTC-basierter Offset für Pseudo-Sync aller Clients
- Web Audio API: `AudioContext`, `GainNode`-Crossfade (Station ↔ Static), `AnalyserNode` für Visualizer
- Standalone unter `radio.html`, eingebettet in `player.html` + `dm.html` via `radio-mount.js`
- Dateien: `radio-config.js`, `radio-engine.js`, `radio-ui.js`, `radio-visualizer.js`, `radio-mount.js`, `radio-standalone-mount.js`

### Game-Time-System
- **Verhältnis:** 1 RL-Sekunde = 4 IG-Sekunden (`REAL_TO_IG = 4`)
- **Modi:** `running` / `paused` / `combat` / `long_rest`
- **Basis-Zeit:** `2045-09-15 08:00:00` UTC (Night City 2045)
- **Singleton:** `game_state`-Tabelle, id=1, Realtime-sync an alle Clients
- **Sleep-Deprivation:** `getSleepDeprivationModifier(char)` → basiert auf `last_long_rest_at_ingame`:
  - ≥24h → -1 (Müde), ≥36h → -2 (Sehr müde), ≥48h → -4 (Erschöpft)
- **Lazy-Heal:** `getEffectiveHp(char, now)` → +1 HP/IG-Stunde passiv (ohne DB-Write bis nächstem Tick)
- **Long Rest:** 5s Realzeit = 8h IG-Zeit, heilt alle Chars, löscht `ends_on_long_rest`-Effekte
- **Combat Rounds:** +5 IG-Sekunden pro Runde
- **DM Jump:** `dmJumpTime(deltaMs)` — heilt alle passiv, räumt abgelaufene Effekte auf
- **applyTimedEffect:** Helper zum Anlegen von `character_effects` mit IG-Ablaufzeit
- **cleanupExpiredEffects:** Löscht abgelaufene Effekte (läuft alle 60s in Topbar-Tick + bei Long-Rest + dmJumpTime)
- Dateien: `game-time.js`, `supabase.js` (getGameState/patchGameState/subscribeGameState)

### Sound-System
- **DM:** Upload Audio (mp3/wav/ogg) → `sound_library`, Button erstellen → `sound_buttons`
- **Kategorien:** `one-shot` (einmalig), `ambiente` (loop), `music` (einzelner Track)
- **Broadcast:** DM-klickt-Button → Supabase Realtime Broadcast Event → alle Player-Clients spielen ab
- **Player:** `sound-player.js` auto-initialisiert, empfängt Broadcast-Events, per-Kategorie-Lautstärke in localStorage
- Dateien: `sound-dm.js`, `sound-player.js`, `sound.css`, `sound-schema.sql`

### Session-Bar (DM)
- Feste 32px-Leiste ganz oben (über Topbar), z-index 1200
- **DM:** Start/Stop, editierbarer Name (dblclick), Realzeit-Timer, Log-Modal (50 vergangene Sessions)
- **Player:** Read-only Anzeige + Start-Popup mit 10-Minuten-Auto-Timeout (joined/declined/timeout in `participants` jsonb)
- Realtime via `subscribeSessionLog`
- Dateien: `session-bar.js`, `session-bar.css`, `supabase.js` (getActiveSession/createSession/endSession/recordSessionResponse)

### Shop-System
- 581 Items aus `items`-Tabelle: Weapons, Armor, Cyberware, Gear, Programs, Fashion, Pharma, Ammo
- Kategorie-Sidebar, Item-Grid, Detail-Panel
- Cyberware: Slot-Picker-Modal, Humanity-Loss-Berechnung
- Cash-Abzug + `cash_log`-Append (letzte 20 Transaktionen)
- Cyberpsychosis-Modal bei Humanity 0
- Room-Inventory: DM kann Items in `room_items`-Tabelle legen, Player können sie ansehen/nehmen

---

## 5. JS-Module

### `supabase.js` (671 Zeilen)
Alle DB/Storage-Helpers. Kein roher Supabase-Call in Page-Files.
**Wichtige Exports:** `saveCharacter`, `getCharacter`, `getCharacters`, `patchCharacter`, `patchCash`, `getItems`, `logRoll`, `getRolls`, `subscribeCharacters`, `subscribeRolls`, `saveNpc`, `patchNpc`, `getActiveCombat`, `saveCombat`, `endCombat`, `saveMap`, `subscribeMaps`, `getGameState`, `patchGameState`, `subscribeGameState`, `getCharacterEffects`, `addCharacterEffect`, `removeCharacterEffect`, `removeCharacterEffectsBy`, `subscribeCharacterEffects`, `getRoomItems`, `addRoomItem`, `getSoundLibrary`, `uploadSound`, `getSoundButtons`, `saveSoundButton`, `createSoundChannel`, `createRollRequest`, `resolveRollRequest`, `subscribeRollRequests`, `getSavedMaps`, `upsertSavedMap`, `loadSavedMapData`, `deleteSavedMap`, `getActiveSession`, `getRecentSessions`, `createSession`, `patchSession`, `endSession`, `recordSessionResponse`, `subscribeSessionLog`

### `dice.js`
`roll(expression, opts)` → async, parsed `XdY±Z`, multi-term, Crit nur wenn `isSkillCheck:true`. Loggt in `rolls`. `animateRollNumber(el, val)` für CSS-Animation.

### `game-time.js` (339 Zeilen)
`initGameTime()`, `getCurrentIngameTime(gs)`, `getSleepDeprivationModifier(char)`, `getEffectiveHp(char, now)`, `pauseTime/resumeTime/dmJumpTime`, `startCombat/endCombat/advanceCombatRound`, `startLongRest/cancelLongRest/completeLongRest`, `tickAllCharactersPassiveHeal`, `applyDamage/applyHeal`, `cleanupExpiredEffects`, **`applyTimedEffect({characterId, effectType, source, displayName, durationStr, endsOnLongRest, meta})`**, `parseBuildTimeToIngameMs(str)`, `formatIngameTime`, `formatDuration`

### `combat-modifiers.js`
`loadCombatData()`, `getActiveModifiers(entity, actionType, {now})` — injiziert Sleep-Modifier, `getInjuryPenaltyStruct`, `getInjuryModifierSum`, `computeDamageThrough(damage, sp, opts)`, `rollCriticalInjury(location, existing)`, `resolveDeathSave(entity)`, `rollWithModifiers(entity, opts)`

### `pdf-parser.js`
Liest AcroForm-Felder aus der Cyberpunk RED PDF. Mapping für 413 Felder (Stats, Skills, Weapons×6, Armor, Gear×18, Cyberware-Slots, Lifepath, Identity). Extrahiert eingebettetes Portrait-JPG aus `AP/N`-XObject.

### `weapon-utils.js`
`DV_TABLE` (8 Waffentypen × 8 Brackets), `RANGE_BRACKETS = [6,12,25,50,100,200,400,800]`, `getDV(wtype, distM)`, `guessWeaponDvType(ammo, name)`, `getRangeBracketIndex`

### `roles/roles-core.js` (450 Zeilen)
`performCheck({stat, skill, mod, dv, entity})` — sync, + Sleep-Modifier wenn `entity` gegeben. `performAbilityCheck({rank, mod, dv, entity})`. `rollBackupCall(rank)`. `renderRollResult(roll, opts)`. `buildDiceBox`, `buildAbilityDiceBox`, `buildActionCard`, `buildInventoryItem`, `openModal`, `pickTarget`, `buildLog`, `buildSubtabs`. `logAction`, `getInventory`, `addInventoryItem`, `useInventoryItem`, `deleteInventoryItem`, `fetchTarget`, `patchTarget`, `getRecentActions`.

### `ui/topbar.js`
`mountTopbar({isDm, onSettingsClick})`. 250ms-Tick: aktualisiert IG-Zeit + Sleep-Indicator. Auto-cleanup `cleanupExpiredEffects` alle 60s. `attachCharacter(char)` / `updateCharacter(char)`.

### `ui/session-bar.js` (304 Zeilen)
`mountSessionBar({isDm, characterId, characterName})`. DM: Start/Stop/Name-Edit/Log. Player: Popup + 10-Min-Timeout. `subscribeSessionLog`-basiert.

### `ui/dm-time-dial.js`
`mountDmTimeDial()`. Modal mit Pause/Resume, Jump-Buttons (±1m/5m/15m/1h/1d), Combat Start/End/Advance, Long-Rest-Steuerung, Chars-Liste. Wird bei ⚙-Button geöffnet.

### `agent/agent-core.js` (446 Zeilen)
iCHOOM Shell. `initAgent({characterId, characterName})`, `bootAgent/shutdownAgent`, `showApp(name)`, `playSound/stopSound`, `setBadge/notify`, `getOrCreateThread`. `agentState` Singleton.

### `agent/agent-apps.js` (970 Zeilen)
Apps: Chrome Chat (Threads, Nachrichten, Avatar), CallJack (Anrufe, Gruppen-Anrufe, `group_id`), Contacts (Player auto, NPC via Code), EddieWire (Transfers). `openGroupCallPicker`, `startGroupCall`.

### `agent/agent-dm.js` (417 Zeilen)
`initDmAgent()`. NPC-Tab-Verwaltung, Code-Generator (`NX-XXXX`), DM als NPC antworten, breiteren Container.

### `radio/radio-engine.js` (218 Zeilen)
`powerOn/powerOff`, `setFrequency(freq)`, `setVolume(vol)`. AudioContext, zwei GainNodes (Station + Noise), Crossfade. `getAnalyser()` für Visualizer.

---

## 6. Datenbank (Supabase)

### Alle Tabellen

#### `characters`
| Spalte | Typ | Notizen |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | Handle / Charakter-Name |
| `handle` | text | Aliasname |
| `role` | text | solo/netrunner/tech/medtech/media/exec/lawman/fixer/nomad/rockerboy |
| `player_name` | text | |
| `image_url` | text | Supabase Storage URL |
| `stats` | jsonb | {INT,REF,DEX,TECH,COOL,WILL,MOVE,BODY,EMP,LUCK} |
| `current_hp` / `max_hp` | int | |
| `current_humanity` / `max_humanity` | int | |
| `current_luck` / `max_luck` | int | |
| `seriously_wounded_threshold` | int | |
| `death_save` | int | Basis-BODY für Death Save |
| `cash` | int | Aktuelles Geld |
| `cash_log` | jsonb | Letzte 20 Transaktionen [{delta,reason,ts,balance}] |
| `improvement_points` | int | |
| `role_ability_rank` | int | |
| `role_ability_data` | jsonb | Rollen-spezifische Daten (z.B. Solo Combat Awareness) |
| `reputation` | int | |
| `skills` | jsonb | {"Handgun": {lvl:4, stat:"REF"}, ...} |
| `weapons` | jsonb | [{name, dmg, ammo, rof, notes}] × 6 |
| `armor` | jsonb | {head:{sp,penalty}, body:{sp,penalty}, shield:{sp,penalty}} |
| `gear` | jsonb | [{name, notes, item_id?}] × 18 |
| `cyberware` | jsonb | {neuralLink:{has,slots:[]}, rightEye:{...}, ...} |
| `lifepath` | jsonb | {culturalOrigins, personality, friends:[], enemies:[], ...} |
| `critical_injuries` | text | JSON-String: [{name, effect}] |
| `mortally_wounded` | boolean | |
| `conditions` | jsonb | [] string-Array |
| `death_save_penalty` | int | Kumuliert durch Mortal Wounds |
| `death_state` | boolean | Token-Overlay + Spectator-Mode |
| `addictions` | text | |
| `notes` / `session_notes` | text | |
| `buffs` | jsonb | [{id,name,effect,expires_at,duration_label}] — Legacy für NPCs |
| `ammo_inventory` | jsonb | Munitions-Typen per Slot |
| `last_long_rest_at_ingame` | timestamptz | Für Sleep-Deprivation-Berechnung |
| `last_hp_tick_at_ingame` | timestamptz | Für Lazy-Eval-Heilung |
| `created_at` / `updated_at` | timestamptz | trigger-gesetzt |

#### `items`
581 Shop-Items. `id text PK`, `name`, `category`, `subcategory`, `price int`, `price_options jsonb`, `damage`, `rof`, `hands`, `ammo`, `notes`, `source jsonb`, `extra jsonb` (SP, Magazine, Humanity-Loss, Install-DV, etc.)

#### `rolls`
Roll-Log. `character_id FK`, `character_name`, `expression`, `individual_rolls jsonb`, `modifier`, `total`, `context`, `is_crit_success`, `is_crit_failure`, `created_at`

#### `combat_sessions`
`is_active boolean`, `round int`, `current_turn_index int`, `combatants jsonb`, `timer jsonb`

#### `game_state`
Singleton (id=1). `current_ingame_time timestamptz`, `mode text` (running/paused/combat/long_rest), `last_resume_real timestamptz`, `combat_started_at_ingame`, `combat_round int`, `long_rest_initiator_character_id uuid`, `long_rest_started_real`, `long_rest_ends_real`

#### `character_effects`
Timed Buffs/Debuffs. `character_id FK`, `effect_type text` (quickfix/drug/buff/debuff/crafting/custom), `source`, `display_name`, `description`, `started_at_ingame timestamptz`, `expires_at_ingame timestamptz`, `ends_on_long_rest boolean`, `meta jsonb`

#### `session_log`
`session_name`, `started_at timestamptz`, `ended_at timestamptz`, `participants jsonb` [{character_id, name, joined_at, response: 'joined'|'declined'|'timeout'}], `created_by uuid FK→characters`, `notes`

#### `role_inventory`
`character_id FK`, `category text` (drug/program/project/invention/contact/vehicle/team_member/fan/story/intel/architecture/specialty), `name`, `description`, `charges`, `max_charges`, `meta jsonb`

#### `role_actions`
Roll-/Action-Log der Rollen. `character_id FK`, `role_name`, `action`, `target_type/id/name`, `roll jsonb`, `result_summary`, `meta jsonb`

#### `npcs`
`id uuid PK`, `name`, `role`, `hp_current`, `hp_max`, `stats jsonb`, `critical_injuries`, `buffs jsonb`, `conditions jsonb`, `image_url`, `group_name`, `group_color`, `updated_at`

#### `maps`
`name`, `map_data jsonb` (tokens, background_url, grid_size), `groups_json jsonb` (group→color mapping), `thumbnail_url`, `updated_at`

#### `saved_maps`
`name`, `map_data jsonb`, `created_at`, `updated_at`

#### `room_items`
`item_id FK→items`, `item_name`, `item_data jsonb`, `placed_by`, `room_description`

#### `agent_contacts`
`owner_character_id`, `contact_type` (player/npc), `contact_player_id`, `contact_npc_id`, `display_name`, `avatar_url`

#### `agent_npc_codes`
`npc_id FK unique`, `code text unique` (Format NX-XXXX), `display_name`, `avatar_url`

#### `agent_threads`
Kanonisch sortiert (a < b). `a_type/a_id`, `b_type/b_id`, `last_message_at`

#### `agent_messages`
`thread_id FK`, `sender_type/sender_id`, `content`, `image_url`, `read_at`

#### `agent_calls`
`caller_type/caller_id`, `callee_type/callee_id`, `status` (ringing/answered/missed/declined/ended), `started_at`, `answered_at`, `ended_at`, `duration_sec`, **`group_id uuid`** (für Gruppen-Anrufe), **`started_at_ingame timestamptz`**

#### `agent_transfers`
`sender_type/id`, `recipient_type/id`, `amount`, `direction` (send/request), `status` (pending/accepted/declined/auto), `note`, `resolved_at`

#### `sound_library`
`name`, `file_path`, `file_url`, `category` (one-shot/ambiente/music), `duration_seconds`, `size_bytes`

#### `sound_buttons`
`name`, `sound_id FK→sound_library`, `category`, `color`, `hotkey`, `position`

#### `roll_requests`
`character_id FK`, `damage_formula`, `damage_source`, `effect_description`, `roll_result int`, `resolved boolean`

### Realtime-Tabellen (Supabase Publication `supabase_realtime`)
`characters`, `rolls`, `combat_sessions`, `game_state`, `character_effects`, `session_log`, `role_inventory`, `role_actions`, `agent_contacts`, `agent_npc_codes`, `agent_threads`, `agent_messages`, `agent_calls`, `agent_transfers`, `room_items`, `maps` (via maps-live channel)

### DB-Trigger
- `characters_updated_at` — setzt `updated_at` bei UPDATE
- `combat_sessions_updated_at` — setzt `updated_at` bei UPDATE
- `trg_agent_add_player_contacts` — AFTER INSERT on characters — erstellt gegenseitige Kontakte
- `trg_agent_bump_thread` — AFTER INSERT on agent_messages — aktualisiert `last_message_at`
- `trg_agent_apply_transfer` — BEFORE INSERT/UPDATE on agent_transfers — bucht `characters.cash`

### DB-Funktion
- `agent_get_or_create_thread(type1, id1, type2, id2) → uuid` — kanonisches Thread-Lookup

### Storage-Buckets
- `character-images` (public) — Portraits
- `npc-images` (public) — NPC-Portraits + Vehicle-Bilder
- `map-backgrounds` (public) — Map-Hintergrundbilder
- `sounds` (public) — DM-Sounds
- `chat-images` (public) — Chat-Bilder

---

## 7. Vorhandene .md / Spec-Dateien

| Datei | Inhalt |
|---|---|
| [CLAUDE.md](CLAUDE.md) | **Vollständige Projekt-Specs für KI** — Regeln, Schema-Übersicht, PDF-Mapping, Coding-Conventions. WICHTIGSTE Datei für neuen Chat. |
| [README.md](README.md) | Setup-Anleitung (kurz: npm install, schema.sql, seed) |
| [db/agent-setup-instructions.md](db/agent-setup-instructions.md) | iCHOOM-Schema ausführen, Trigger-Erklärung, Testen |
| [db/roles-setup-instructions.md](db/roles-setup-instructions.md) | Rollen-Schema ausführen |
| [db/sound-setup-instructions.md](db/sound-setup-instructions.md) | Sound-Schema + Storage-Bucket |
| [db/map-update-setup-instructions.md](db/map-update-setup-instructions.md) | death_state, roll_requests, saved_maps Migrations |
| [public/db/map-update3-setup-instructions.md](public/db/map-update3-setup-instructions.md) | groups_json Migration, Vehicle-Bilder, Weapon-Pills, Token-Farben |
| [public/db/map-weapons-setup-instructions.md](public/db/map-weapons-setup-instructions.md) | Weapon Range System (kein SQL nötig), localStorage-Schema |

### Empfohlene Files für neuen Chat anhängen:
1. `CLAUDE.md` — Konventionen, Regeln, Schema (schon dabei, wird automatisch geladen)
2. `PROJECT_OVERVIEW.md` — diese Datei (vollständiger Überblick)
3. Je nach Kontext spezifische Setup-Instructions

---

## 8. Bekannte Baustellen / offene TODOs

Aus Code-Analyse (Stand 2026-06-02):

1. **`dice.js:13`** — `initDiceBox` ist ein No-Op. 3D dice-box wurde wegen CDN-Babylon.js-Fehler deaktiviert. Fallback ist CSS-Animation. Wenn 3D-Würfel gewünscht: lokale Assets nötig.

2. **`agent-core.js:256`** — Clock-Vibes: `yr = now.getFullYear() + 20` → zeigt 2046 (2026+20). Passt sich dynamisch an.

3. **`characters` cash_log vs. EddieWire** — Laut `agent-setup-instructions.md`: "EddieWire-Transfers tauchen nicht im Cash-Log auf" (Trigger schreibt direkt auf cash, nicht cash_log).

4. **Solo Combat Awareness persistiert noch in localStorage** (`solo-ca-${char.id}`) — zusätzlich wird in `role_ability_data` gespiegelt. Falls localStorage leer und Supabase hat Daten: kein Lade-Fallback aus Supabase implementiert.

5. **NPC-Sheet (`npc-sheet.html`)** — Effects-Tab vorhanden, aber NPC-Tabelle hat kein `character_effects`-Schema. Effekte auf NPCs nutzen noch `buffs`-jsonb in `npcs`.

6. **`create.html`** — Specialty-Punkte-Vergabe (Medtech/Tech/Solo) noch nicht persistiert (upload.html hat es schon).

7. **Map Hit-Test** — In `hitToken` wird in reverse-ranked order iteriert. Falls zwei Tokens identische Position haben und gleiches Rank haben: undefiniertes Verhalten.

8. **Cyberware-Slot-System** — `shop.html` zeigt Slot-Picker, aber die eingesetzten Cyberware-Items haben kein einheitliches Humanity-Loss-Tracking (manuell notiert in `extra.humanity_loss`).

9. **`messages`-Tabelle** — Im Code referenziert (`sendMessage`, `getMessages`, `subscribeMessages`) aber nicht in `schema.sql` definiert. Muss separat angelegt werden oder ist in DM-Chat als informeller Table vorhanden.

---

## 9. Geplantes großes Design-Update

Kein dediziertes Design-Update-Dokument gefunden. Das Design ist vollständig implementiert (A24/Cyberpunk-Ästhetik, CSS-Variablen, Audiowide-Font).

Die letzten großen implementierten Features (aus Plan `cyberware-shop-logik-aus-playbook-floofy-snowglobe.md` im `.claude/plans/`):

1. ✅ **Sleep-Deprivation auf alle Skill-Checks** (`performCheck` in `roles-core.js` + alle Rollen-Files)
2. ✅ **Effekt-Timing via `character_effects`** (`applyTimedEffect` in `game-time.js`, Medtech umgebaut)
3. ✅ **DM Session-Leiste** (`session-bar.js`, `session-bar.css`, `session_log`-Tabelle)
4. ✅ **iCHOOM Gruppen-Anruf** (`group_id` in `agent_calls`, `openGroupCallPicker` in `agent-apps.js`)
5. ✅ **Map Z-Order** (`_tokenLayerRank` in `drawTokens` + `hitToken`)
6. ✅ **Move-Distance-Zone** (live-clamp in mousemove, Zone am Drag-Ursprung)
7. ✅ **Char-Name editierbar** (`setupNameEditing` in `player.html`, Name-Sync in `applyCharToToken`)

---

## DIESE FILES IM NEUEN CHAT ANHÄNGEN

Für maximalen Kontext in einem neuen Chat diese Dateien anhängen:

```
CLAUDE.md                           ← WICHTIGSTE — immer dabei
PROJECT_OVERVIEW.md                 ← diese Datei (kompletter Überblick)

db/schema.sql                       ← Haupt-Schema
db/agent-schema.sql                 ← iCHOOM-Schema
db/roles-schema.sql                 ← Rollen-Schema
db/sound-schema.sql                 ← Sound-Schema

public/assets/js/supabase.js        ← Alle DB-Helpers
public/assets/js/game-time.js       ← Time-System + Effects
public/assets/js/combat-modifiers.js ← Roll-Modifiers
public/assets/js/dice.js            ← Roll-Engine
public/assets/js/roles/roles-core.js ← Rollen-Primitiven
```

**Je nach Task zusätzlich:**
- Map-Feature: `public/map.html` (4983 Zeilen!)
- Player-Feature: `public/player.html` (4158 Zeilen!)
- DM-Feature: `public/dm.html` (3802 Zeilen!)
- Spezifisches Rollen-File aus `public/assets/js/roles/`
- `public/assets/js/agent/agent-apps.js` für iCHOOM-Features
