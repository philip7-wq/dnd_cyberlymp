# REDESIGN_LOG.md — Lauf-Protokoll (Entscheidungen, Dateien, Gotchas)
> Ergänzt `REDESIGN_MASTER.md` (Ziel/Tokens/Komponenten) und `REDESIGN_PHASES.md` (Phasenstruktur).
> **Claude Code liest diese drei Dateien zu Beginn jeder Session.** Dieses Log ist der laufende
> Verlauf: was real umgesetzt wurde, welche Entscheidungen getroffen wurden und warum, und welche
> Stolperfallen in Folgephasen mitzunehmen sind.
> Nach jeder (Sub-)Phase um einen Eintrag ergänzen.

---

## Status-Übersicht

| Phase | Status | Kurz |
|---|---|---|
| 0 Fundament | ✅ fertig | Tokens, Fonts, FX, Aliase, Clip-Border-Fix |
| 1 Komponenten | ✅ fertig | 21 Web Components (Light DOM), echte cyber-components.css |
| 2 App-Shell | ✅ fertig | Sidebar + Status-Topbar; + boot()-Fix, Sidebar-Clip-Fix, Fonts/session_log/me-Cleanup |
| 3 Dashboard | ✅ fertig | index.html in-place → HUD-Dashboard, live, read-only |
| 4a player Header/Stats/Skills | ✅ fertig | + Cash im Bogen; in-place restyle; Würfel-Box-Fix |
| 4b player Weapons/Armor/Cyberware | ✅ fertig | In-Place-CSS; .roll/.gear-action/.remove gescopt; #dmgApplyBox-Scoping; Autofire→Combat-Rot |
| 4c player Gear/Lifepath/Injuries/Notes/Raum/Rolle | ✅ fertig | In-Place-Reskin; #tab-gear/#tab-raum/#critModalBox/#tab-injuries gescopt; Rollen-Body via #tab-role-Override (roles.css unangetastet) |
| 4d player Layout-Pass | 🟡 läuft | 4d-1 ✅ (Basis/Button-System/Header/Tab-Bar); 4d-2 ✅ (Stats/Skills/Karten/Distanz-Bar); 4d-3 offen (Lifepath/Notes/Injuries/Raum/Rolle) |
| 5 dm.html | ⬜ offen | Opus xhigh |
| 6 shop.html | ⬜ offen | |
| 7 map.html | ⬜ offen | Opus xhigh; Canvas unantastbar; Nav-Sidebar hier |
| 8 create/upload/npc-sheet/radio | ⬜ offen | |
| 9 Rulebook (neu) | ⬜ offen | |
| 10 Cyberware-Index (neu) | ⬜ offen | |
| 11 Responsive/A11y/Cleanup/QA | ⬜ offen | Aliase + Temp-Fonts entfernen, --radius, favicon |

**Modell-Kadenz:** additive/isolierte Phasen → Sonnet 4.6; player/dm/map (4/5/7) + Final-QA → Opus xhigh.

---

## Querschnitt-Gotchas (gelten für ALLE Folgephasen)

1. **Card-className-Falle:** Card-Komponenten setzen intern `this.className='card'` → äußere Styling-
   Klassen werden überschrieben. Karten per Element-/Kontext-Selektor stylen
   (z.B. `.char-grid character-card`), nie über eine eigene Klasse am Element.
2. **Clip-Border-Muster:** Border via `::before/::after`-Pseudo-Layer (nicht `border`-Property),
   Glow via `filter: drop-shadow` (nicht `box-shadow`, wird vom clip geschnitten),
   `isolation:isolate` bei Nesting. Inputs/Select ohne clip behalten echte border.
3. **Geteilte Klassen scopen:** `.roll-btn` und `.gear-action-btn` werden über mehrere Tabs geteilt.
   Immer kontext-gescopt stylen (`.skill-row .roll-btn`, `.weapon-card .roll-btn`), nie global.
4. **Live-berechnete Widgets in-place lassen:** Werte, die JS live berechnet/aktualisiert
   (HP/HUM/Luck, Armor-SP, Magazin, Cyberware-Humanity), werden NICHT auf Anzeige-Components
   umgestellt — nur per CSS in-place restyled. Components nur für reine, statische Anzeige.
5. **JS-Render-Architektur:** Tab-Panels (`#tab-*`) sind im Markup leer und werden per JS gefüllt.
   Reskin heißt: die Render-Funktionen / deren CSS-Klassen umbauen, nicht statisches HTML.
6. **base.css-Token-Override:** `--radius` (base.css 4px) überschreibt neues Token (2px), weil
   base.css nach cyberpunk-ui.css lädt. Bewusst bis Phase 11 belassen.
7. **`prefers-reduced-motion`** überall respektieren (FX, LED-Puls, Transitions).
8. **Keine** neue Library / kein Build / kein Framework / kein Shadow DOM. Supabase nur über
   `assets/js/supabase.js`. Game-Terms Englisch, UI-Strings dürfen Deutsch.

---

## Phase 0 — Fundament ✅
**Neu:**
- `public/assets/css/cyberpunk-ui.css` — Token-Set (MASTER §2) + 11 Migrations-Aliase + `@font-face`
  + Reset + Basis-Klassen + Keyframes/FX + Scanlines + reduced-motion.
- `public/assets/js/cyber-fx.js` — `bootFlicker`, `glowPulse`, `glitch`, `mountScanlines` (ES-Module,
  reduced-motion-Guard, alle Helfer No-Op bei reduceMotion).
- `public/_dev/phase0-check.html` — Dev-Harness.
- `public/assets/fonts/` — 10 woff2 (Rajdhani 400/500/600/700, Orbitron 400/700, IBM Plex Mono
  400/500/600, Share Tech Mono 400) + `FONTS_LICENSE.txt`.

**Entscheidung:** Migrations-Aliase „alle global mappen" (11 Stück, je „TEMPORÄR — Phase 11 entfernen"):
`--red→--neon-red`, `--cyan→--neon-cyan`, `--bg→--bg-main`, `--bg-card→--bg-panel`,
`--bg-input→--bg-panel-soft`, `--border→--border-dark`, `--red-dim→--red-soft`,
`--cyan-dim→--cyan-soft`, `--text→--text-main`, `--text-head→--text-main`.
`--text-muted` ist im neuen Set (gleicher Name).

**Fix:** clip-path schnitt Border + Glow weg → Pseudo-Layer-Muster (Gotcha #2) eingeführt.
Inputs ohne clip-path nicht betroffen.

---

## Phase 1 — Komponenten-Bibliothek ✅
**Neu:** `components/cyber-element.js` (`CyberElement` Basisklasse + `escapeHTML` + `CardElement`),
`cyber-components.js` (Aggregator, registriert alle), `public/assets/css/cyber-components.css`,
`_dev/phase1-components.html`.

**21 Custom Elements:** cyber-panel, cyber-button, status-chip, stat-block, hud-divider,
segmented-bar, health-bar, armor-bar, humanity-bar, warning-banner, loading-strip, glitch-text,
cyber-select, item-card, character-card, cyberware-card, enemy-card, location-card,
combat-participant-card, dice-roller, damage-calculator.

**Entscheidung:** **Light DOM**, kein Shadow DOM (Komponenten nutzen direkt cyberpunk-ui.css).

**Logik-Bindungen (nur lesend/aufrufend, keine eigene Spielregel):**
- `<dice-roller>` → `roll(expression, opts)` aus `dice.js:26`, Rückgabe
  `{ total, individualRolls, isCritSuccess, isCritFailure }`; ohne characterId → kein DB-Log.
- `<damage-calculator>` → `computeDamageThrough(damage, sp, opts)` aus `combat-modifiers.js:229`,
  `opts = { weaponClass, aimedShot, crackedSkull }`, Rückgabe `{ through, spEff, ablate, spAfter }`.

**Cleanup:** COMPONENT_CSS aus JS-Injektion in echte `cyber-components.css` ausgelagert; `styles.js`
gelöscht; `<damage-calculator>` interne native `<select>` → `<cyber-select>`.
**MASTER §3 Lade-Reihenfolge:** cyberpunk-ui.css → cyber-components.css → page-css → cyber-components.js (module).

**Gotcha entdeckt:** Card-className-Falle (Gotcha #1).

---

## Phase 2 — App-Shell ✅
**Neu:** `public/assets/css/sidebar.css`, `public/assets/js/ui/sidebar.js`
(`initSidebar()`: Collapse-Toggle + localStorage, Burger, Overlay, Mobile-Close, Active-Link).
**Geändert:** `player.html`, `dm.html` (`<nav id="topNav">` → `<aside class="cyber-sidebar" id="topNav">`,
alle IDs/Handler/hrefs erhalten inkl. Radio-Injektion; Fundament-Includes; Body-End-Module),
`map.html` (nur Fundament + Scanlines, KEINE Nav-Sidebar), `topbar.css` + `session-bar.css` (Reskin).

**Entscheidungen:**
- **In-place je Seite** — Nav-Items liegen pro Seite im Markup mit IDs/Handlern
  (`bmShowPopup`, `dmItemsBtn`, `newCombatBtn`, `cashLogBtn`, Radio-Injektion). Alle 1:1 erhalten.
- **map = nur Fundament**, Nav-Sidebar kommt in Phase 7 (Kollision mit Token-Sidebars vermeiden).
- **Cash bleibt in der Sidebar** (IDs `navCash`/`cashLogBtn` von player.js per ID aktualisiert).
- Linke klappbare Sidebar (Desktop voll↔Icon-Rail, Mobile Off-Canvas/Burger), Logo im Sidebar-Kopf,
  Topbar → schlanke Status-Leiste. Status-Bars rechts neben Sidebar (`left: var(--sb-w)`).

**Nav-Struktur (1:1):**
- Player: Logo · navName · Shop · Karte · Schwarzmarkt (bedingt, `bmShowPopup()`) · navCash + cashLogBtn · Übersicht.
- DM: Logo · „DM DASHBOARD" · Items · Timer · Karte (_blank) · Schwarzmarkt · Neuer Kampf · Übersicht.

**Bewusst aufgeschobene Kipp-Effekte:** Migrations-Aliase vs. base.css (Farb-/Reset-Verschiebung auf
nicht-reskinnten Seiten); `position:fixed`-Elemente ignorierten Sidebar-Offset (→ in Phase 4 gefixt).

**Fixes in Phase 2:**
- **boot()-TDZ (player.html):** Root Cause war **vorbestehend** — Top-Level-`await` im Modul-Body
  suspendierte alles danach, `_nameEditingWired` (~Z.880) war bei `renderHeader` noch nicht initialisiert.
  Fix: Boot-Block in `async function boot()` gekapselt (`player.html:509` Funktionskopf, `:662` `}`+`boot();`)
  — genau wie dm.html (das nutzte das Muster bereits, unverändert). State bleibt auf Modul-Ebene.
- **Sidebar collapsed clippte Logo + Toggle:** Ursache Overflow + Wordmark-Breite (logo.png 1.87:1),
  nicht clip. Fix in `sidebar.css` `@media(min-width:769px)` collapsed-Block: Kopf `flex-direction:column`,
  Logo `max-height:26px; width:auto`, Toggle 44px, cashlog collapsed ausgeblendet, cash zentriert.

**Cleanup (eigene Tasks):**
- **session_log defensiv** in `supabase.js` (Helper `_isMissingTableError`: PGRST205/204/42P01):
  `getActiveSession`→null, `getRecentSessions`→[], `recordSessionResponse`→noop, `subscribeSessionLog`
  →try/catch + No-op-Stub. Konsument `session-bar.js`. Verhalten bei vorhandener Tabelle identisch.
- **Google-Fonts self-hosted:** Audiowide/Inter/Caveat waren NICHT self-hosted, 129× in 13 CSS-Dateien.
  Heruntergeladen (`audiowide-400.woff2`, `inter-latin.woff2` Variable 400–600, `caveat-400.woff2`),
  `@font-face` in **base.css** (nicht cyberpunk-ui.css — base.css lädt auf allen Seiten). Google-`<link>`×3
  aus 8 Seiten entfernt (index/player/dm/map/shop/create/npc-sheet/radio; upload hatte keine).
  **Temporär** — entfallen, wenn die 13 Page-CSS in Reskin-Phasen auf Rajdhani/IBM Plex Mono migrieren.
- **me-null Agent-Bug** (out of scope, aber gefixt): `me=getActiveIdentity()` (`agent-core.js:306`) ist
  beim DM bis zur NPC-Wahl `null`, `initDmAgent` (`agent-dm.js:141`) feuert `agent:ready` vorher.
  Defensive Guards in `agent-apps.js` (refreshContacts 33, renderThreadList 224, refreshCallHistory 515,
  refreshTransfers 805, refreshBalance 795 [+ `me.type!=='player'`], openAddContactModal 185, send 315,
  refreshChatStream 335, agent:message 372, startGroupCall 486, openCallWith 603, transfer 916/929)
  + `agent-core.js` getOrCreateThread 416. Verhalten bei vorhandenem `me` identisch. Kein Daten-Setup.

**DB-Änderung (Supabase, vom Nutzer ausgeführt):** Tabelle `session_log` angelegt —
`id uuid pk default gen_random_uuid()`, `session_name text`, `created_by text`,
`participants jsonb not null default '[]'`, `started_at timestamptz not null default now()`,
`ended_at timestamptz`. + Indizes + `alter publication supabase_realtime add table session_log`.
RLS: `characters` hat RLS=true → `session_log` RLS enabled + offene Policy (`using(true)`) + grants. → 200.
**favicon.ico 404** = harmlos, bewusst nicht gefixt.

---

## Phase 3 — Dashboard-Landing ✅
**Geändert:** `index.html` (in-place Picker → HUD-Dashboard), `index.css` (neues Grid, ersetzt `.hub-*`).

**Erhaltenes Routing:** Charakter-Klick → `player.html?id=<id>` + `localStorage['lzrv_last_char']`;
`dm.html`, `upload.html`, `create.html`, `radio.html`.

**APIs (nur lesend):** `game-time.js` (initGameTime, getCachedGameState, onGameStateChange,
getCurrentIngameTime, formatIngameTime, getEffectiveHp), `supabase.js` (getCharacters, getActiveSession,
getRoomItems, getItems), `mountTopbar({isDm:false})`, `mountScanlines`.

**Entscheidungen:** „Karte = direkt Spieler" (Char-Card → player.html?id=, keine Rollen-Wahl pro Karte;
DM-Einstieg separat); Night-Market-Teaser „Raum zuerst, sonst Shop".
**Eine geteilte Subscription** via `onGameStateChange` (kein zweiter Realtime-Kanal). Read-only. Empty States.

**Nachträgliche Layout-Anpassungen (auf Nutzerwunsch):**
- DM-Einstieg als eigener prominenter `.dm-hero`-Block (raus aus Quick-Links).
- `<dice-roller>` von index entfernt (Komponente in Bibliothek bleibt).
- Radio als eigener hervorgehobener `.radio-block` (pulsierende LED).
- Quick-Links-Block umbenannt „Charakter Erstellen", nur noch Hochladen + Erstellen
  (Karte + Schwarzmarkt entfernt — weiter erreichbar via Combat-Kachel→map, ehem. Teaser→shop).
- **Night-Market-Teaser komplett entfernt** (Nutzerwunsch).
- Layout „Hero in Seitenspalte": Status-Reihe + Active-Characters unverändert; Seitenspalte
  oben→unten: DM-Hero → Radio → Quick-Links.

---

## Phase 4a — player.html: Header + Cash + Stats + Skills ✅
**Geändert:** `player.css` (~336 Z.: Header/Tabbar/Stats/Skills + IP/Cash-Chips + Skill-Check-Modal),
`player.html` (~59 Z.: Cash-Chip-Markup, updateNavCash/setupCashLog-Ergänzung, cashLogModal-Restyle,
Inline-Token in renderStats/renderSkills).

**Entscheidung:** **In-place restyle** (nicht Components) für interaktive Widgets — die Phase-1-Bars
sind reine Anzeige ohne die Bedienelemente (±, contenteditable HUM, Luck-Dots, Stat-Würfeln/Edit,
Skill-Up/Fav). → Gotcha #4.

**Cash im Bogen:** `updateNavCash()` (`player.html:466`) schreibt zusätzlich `#charCashValue`
(`.is-negative`-Klasse, rot bei negativ). `setupCashLog()` → lokale `openCashLog()`, gebunden an
`#cashLogBtn` (Sidebar) **und** neues `#cashLogBtnHeader` (📜 im Header). cash_log-Render unverändert,
kein neues Schema, eine Quelle.

**Stats:** Klassen `.stat-card/.stat-key/.stat-val/.res-card/.sec-head/.stat-dice-btn/.stat-roll-btn/
.stats-edit-btn/.roll-all-btn` → HUD. In `renderStats()`/`updateEffectiveEMP` nur Inline-Farben gemappt.
**Skills:** `.skill-*`-Klassen → HUD. Würfler **gescopt** als `.skill-row .roll-btn` (Gotcha #3),
`.skill-row`-Grid erhalten.

**Tab-Struktur (real, #tabBar Z.204):** stats, skills, role (⚙ `#roleSettingsBtnTab`), weapons, armor,
cyberware, gear, lifepath, injuries (`#injuryBadge`), notes, raum (📦 `#raumBadge`). Panels `#tab-*` leer (JS-gefüllt).
**Bewusst NICHT angefasst:** Buff/Effect-Bar, Death-Save, Long-Rest (an andere Systeme gekoppelt),
`.injury-badge` (mit Injuries-Tab geteilt).

**Fix:** fixierte Würfel-Box + Würfel-Button clippten unter die Sidebar → neben die Sidebar positioniert
über Sidebar-Offset-Var, wandern beim Collapse mit (Behebung des aufgeschobenen Phase-2-Kipp-Effekts).
Sidebar-Buttons zusätzlich mit sichtbarem Rahmen versehen (player + dm).

---

## Phase 4b — player.html: Weapons + Armor + Cyberware ✅
**Render-Funktionen:** `renderWeapons()` `player.html:1487`, `renderArmor()` `:1837`,
`renderCyberware()` `:1955`; Damage-Apply-Modal `:263`.

**Geteilte-Klassen-Risiko (Gotcha #3):** `.roll-btn` (scopen: `.weapon-card .roll-btn` /
`.cyber-card .roll-btn`), `.gear-action-btn` (geteilt mit **Gear-Tab = 4c** → nur im Weapons/Armor/
Cyberware-Kontext stylen, sonst blutet es in den noch-alten Gear-Tab).

**Zu erhaltende Interaktionen:** Damage-/Autofire-/Brawling-Würfe, `reloadWeapon`, `changeLoadedAmmo`,
Equip/Abrüsten, Cyberware-Install/Humanity + `updateResDisplay`, Armor-SP/Ablation, Damage-Apply.

**Entscheidung:** Anzeige-Balken (Armor-SP, Magazin, Humanity) + Chips → **Option 2 In-Place-CSS**
(nicht auf Components umstellen) — identisches Aussehen, niedrigstes Risiko, konsistent mit 4a (Gotcha #4).
Optionaler Komponenten-Purismus erst Phase 11.

**Abschluss (✅):** Weapons/Armor/Cyberware + **Damage-Apply-Modal** fertig, reines **In-Place-CSS**.
- `.roll-btn` / `.gear-action-btn` / `.remove-btn` **gescopt** (Gotcha #3) — kein Bluten in den
  noch-alten Gear-Tab (4c).
- `#dmgApplyBox`-**Scoping** nötig, weil `.crit-modal-*` mit dem **Crit-Injury-Modal (4c)** geteilt wird —
  ohne Scoping würde der Reskin in das noch unangefasste Crit-Injury-Modal bluten.
- **Autofire** auf **Combat-Rot** gesetzt (Farblogik: Combat = rot, MASTER §2.Farblogik).
- Live-Check ok; Gear-Tab `.gear-action-btn` bleibt durch das Scoping unverändert bis 4c.

---

## Scope-Korrektur — Layout/Relayout ist IN SCOPE
**Wann:** nach Abschluss 4b. **Warum:** die alte Leitplanke „Struktur 1:1 erhalten" war zu eng —
Relayout (Anordnung, Grids, Hierarchie, Größen, Abstände) war via **3C** immer gewollt.

- **Layout/Relayout ist in scope.** Verfeinerte Leitplanke: Markup/Struktur **darf** umgebaut werden,
  solange **Daten, Events, JS-Hook-IDs, Berechnungen und beobachtbares Verhalten identisch** bleiben.
- **Neue MASTER-Sektion** „Layout & Proportionen (verbindlich)" — HUD-/Cockpit-Dichte, --sp-Skala,
  Grid-Caps, feste Button-Größen, Tabellen-Spalten, keine Native-Reste. Ab sofort verbindlich.
- **player.html:** 4a/4b/4c = **Reskin**; danach **Phase 4d** = holistischer **Layout-Pass** über die
  ganze Seite (alle Tabs neu proportionieren, Verhalten identisch).
- **Folgephasen 5–10:** Mandat erweitert auf **Reskin + Relayout** (nach MASTER-Layout-Normen);
  **map (7)** nur Chrome/Sidebar — Canvas weiterhin unangetastet.
- **Phase 11:** prüft **Relayout-Konsistenz** als Teil der Final-QA mit.

---

## Phase 4c — player.html: Gear/Lifepath/Injuries/Notes/Raum/Rolle ✅
**Geändert:** `player.css` (Gear/Lifepath/Injuries/Notes-Klassen + neue scoped Blöcke
`#tab-gear`/`#tab-raum`/`#critModalBox`/`#tab-injuries` + Rollen-Body-Override `#tab-role`),
`player.html` (Inline-/JS-Render-Tokens in 4c-Zonen). **Reiner Reskin**, kein Relayout (→ 4d).

**Render-Fundorte (für Folgephasen):**
- Gear `renderGear()` :2068 (+ equip/sell/drop :2056–2250); Raum `renderRaumTab()` :2270 + statisches Panel :246.
- Lifepath `renderLifepath()` :2311.
- **Injuries** = **`renderCritInjuries()` :3183** (KEIN „renderInjuries" — daher per Standardname nicht auffindbar);
  Crit-Flow `showCritInjuryFlow` :3043 / `rollInjury` :3080 / `showInjuryResult` :3089 / `applyInjury` :3123 / `removeInjury` :3263.
- **Notes** = **kein Render-Fn**; statisches Markup :253 + Wiring `setupNotes()` :3676.
- Crit-Injury-Modal `#crit-modal`/`#critModalBox` :277; Rollen-Einstellungen-Modal :66; Cyberpsychosis-Modal :98; Armor-Slot-Modal :42 (nur Gear-Equip-Flow).

**Scoping-Entscheidungen (kritisch):**
- **Crit-Modal:** neutrale `.crit-modal-*`-Basis **unangetastet** → `#dmgApplyBox` (4b) bleibt dran;
  Crit-Injury nur via **`#critModalBox`** + `#critModalBox .btn-primary/.btn-ghost`. Target-Select/No-Target-Warn-Inline-Tokens mit-migriert.
- **Gear:** globale `.gear-action-btn`-Basis **unangetastet** (combatGrappleBtn!) → Gear-Buttons nur via **`#tab-gear`**
  (action=cyan, equip=cyan, sell=grün, del/remove=rot — analog 4b weapons/cyberware).
- **`.remove-btn`:** globale Basis unangetastet (Cyberware-Legacy-Fallback :1997) → Injuries-✕ via **`#tab-injuries .remove-btn`**.
- **`.ctrl-btn`** war auf player.html **komplett ungestylt** (nur in dm/map.css, die player nicht lädt) → Raum-„Aufheben" via **`#tab-raum .ctrl-btn`** ins HUD geholt. (Weapons-„Aus Map"-`.ctrl-btn` bleibt 4b/4d.)
- **`.injury-badge`** (Injuries + Raum, beide 4c) bewusst gestylt.

**Rollen-Body (Nutzer-Entscheidung: „scoped in player.css"):** Der von `mountRoleInterface` gerenderte
Body wird von der **geteilten `roles.css`** (auch `npc-sheet.html`/Phase 8) gestylt. Statt roles.css zu
editieren → **Override unter `#tab-role` in player.css**: nicht-Akzent-`--role-*`-Tokens auf HUD-Palette
remapped, **Pro-Rollen-Akzentfarben (`--role-accent*`) erhalten**. Verifiziert: `npc-sheet.html` nutzt
KEINE Rollen-/4c-Klassen (kein Bleed, obwohl es player.css lädt). Gotchas dabei:
  - `roles.css` lädt **NACH** player.css → Schrift-Overrides (Audiowide→Rajdhani, JetBrains→Mono) brauchen
    **höhere Spezifität** (`#tab-role …` / `.role-modal …`).
  - `.role-modal` wird von `roles-core.js:252` an **`<body>`** portaliert (außerhalb `#tab-role`) →
    Variablen + Modal-Schriften zusätzlich über `.role-modal` gescopt.
  - Radien/Layout der role-Widgets bewusst NICHT angefasst (Relayout = 4d). `#FFD700`-Crit-Gold belassen.

**Verifiziert:** 4a/4b intakt (15× 4b-Scoping vorhanden), base `.crit-modal-*` + globale `.gear-action-btn`
unverändert, player.css Braces 679/679, roles.css/npc-sheet.html unangetastet, keine Alt-Tokens mehr in
den 4c-Zonen, Rank-Up-Template-Literal intakt. Nur Token-/Schrift-/Border-Swaps + additive scoped Regeln —
keine JS-Logik/IDs/Events/Struktur geändert (Equip/Sell/Drop, Raum-Claim/Move, Lifepath, Injury Add/Heal/
Assign, Rolle/Rank/Specialties + async Load, Notes-Autosave, Realtime unverändert).
**Offen:** Audiowide→Rajdhani in role-Widgets kann in 4d/Phase 8 noch feinjustiert werden (Metrik-Shift);
body-portalierte role-Modals nutzen Default-Cyan-Akzent (kein Pro-Rollen-Akzent — bestehendes Verhalten).

---

## Phase 4d-1 — Relayout: Basis + Button-System + Header + Tab-Bar ✅
**Geändert:** `player.css` (globale Basis, Button-System, 3-Zonen-Header, Tab-Bar-Wrap; ~707 Braces, +~250 Z.),
`player.html` (Header-Markup-Restruktur + Tab-Bar-`__inner`-Wrapper + Inline-Style→Klasse). **Nur CSS + Markup,
keine JS-Logik/IDs/Events/Handler/Berechnungen.** Nur 2 Dateien (+ concept.md Doku-Sync).

**Session-Entscheidungen (Nutzer, 2026-06-05):** Content-Cap **1280px** (Session-Prompt schlägt Konzept-1100 —
concept.md §0/§8 nachgezogen); Cap-Umfang **Header+Tab-Bar+Panels** (bg full-bleed, Inhalt zentriert);
**HP-Leitwert vereint in Zone M** (kein dupliziertes Live-Element → JS unangetastet; statt der Mock-Variante
„große HP-Zahl in Zone R"). Schrift NICHT angefasst (Audiowide bleibt, Font-Migration = Phase 11).

**Globale Basis:** `.tab-panel` Content-Cap 1280 zentriert (`var(--sp-5) var(--sp-5) var(--sp-8)`);
Section-Header vereinheitlicht — `.weapons-section-head`/`.skill-cat-label`/`.ammo-inventory-section .section-header`
auf den `.sec-head`-Look (fs-xs, border-bottom, Margin `sp-5 0 sp-3`).

**Button-System (Variante A, reines CSS am Dateiende):** custom-property-getriebene Basis
(`--btn-border/-fill/-fill-hover/-color/-glow/-h/-px/-fs`) im `.cyber-button`-Muster (clip-sm, Rajdhani 600
uppercase, Border `::before` / Füllung `::after`, Glow `filter:drop-shadow`), angewandt über die **bestehenden
(gescopten)** Selektoren. Quellordnung am Ende → gewinnt bei gleicher Spezifität; `#tab-*`-Scope schützt die
geteilten Basisklassen. Größenskala lg44/md38/sm32/icon-md36/icon-sm30 (→44 @pointer:coarse).
- **Umgesetzte Mappings:** `.res-btn` (icon-md, HP=combat/HUM=primary), `.stat-dice-btn` (primary icon-md),
  `.stat-roll-btn` (combat icon-md), `.roll-all-btn` (combat md), `.stats-edit-btn` (ghost→toggle-success),
  `.char-name-edit`/`.char-cash-log` (ghost-icon icon-sm), `#tab-weapons .weapon-card .roll-btn`/`.dmg-btn`/`.af-roll-btn`
  (combat md), `#tab-weapons .gear-action-btn` (primary), `.reload-btn`/`.gear-sell-btn` (success),
  `.autofire-toggle`(+`.active` toggle-combat), `.unequip-btn` (ghost), `#tab-weapons/.gear/.cyberware .gear-del-btn`
  + `#tab-armor/.injuries .remove-btn` (danger), `#tab-gear`/`#tab-cyberware .gear-action-btn` (primary/danger),
  `#tab-raum .ctrl-btn` (primary), `.death-save-btn` (combat-lg, **ohne Clip** — death-pulse braucht box-shadow,
  Gotcha #2), `#critModalBox`/`#dmgApplyBox .btn-primary` (combat-lg) /`.btn-ghost` (ghost-md), `#skillRollBtn`
  (primary-lg). Die neutralen `#critModalBox`/`#dmgApplyBox .btn-primary/.btn-ghost`-Farbregeln (4b/4c) entfernt
  (Look kommt jetzt aus dem System); die `!important`-Overrides von `.reload-btn`/`.autofire-toggle`/`.unequip-btn`
  **entfernt** und scoped (`#tab-weapons …`) re-expressed → kein `!important` mehr nötig.
- **Bewusst NICHT in 4d-1 (Begründung im CSS-Header dokumentiert):** Skills-Tab-Buttons
  (`.skill-row .roll-btn`/`.skill-up-btn`/`.skill-fav-btn`) — die festen engen Grid-Spalten (★18px / 26-28px)
  fassen die icon-sm/sm-Skala erst nach dem Skill-Grid-Relayout (§4 = **4d-2**); behalten bis dahin 4a-Farben.
  `#weaponDistMapBtn` (Distanz-Bar-Native-Rest → 4d-2). Rolle-Tab-Buttons: `.role-roll-btn`/`.role-save-btn`
  sind **dead CSS** (werden nirgends gerendert; live = `.role-dice-btn` aus geteilter roles.css) → späterer Pass.

**Header → 3-Zonen-HUD-Banner (Markup-Restruktur):** `.char-header` bleibt full-bleed (bg/Border/Box-Shadow/
`body.combat-active`-Puls); neuer `.char-header__inner` (1280 zentriert, `z-index:1` über dem Combat-Overlay)
mit Zone L `.hdr-identity`(=`.char-info`, Portrait **88×88**, Name/Sub), Zone M `.hdr-vitals` (Ressourcen-Strip,
HP dominant: 10px-Track + HP-Leitwert `fs-xl`, HUM 8px), Zone R `.char-meta.hdr-meta` (IP+Cash+📜). Sekundäre
`.hdr-status`-Zeile unter den Zonen (Buffs/Effects/Conditions/Death-Save/Long-Rest). HP/HUM-Rows via
`.res-row--hp`/`--hum` differenziert. `#longRestBtn` Inline-Style → Klasse (ghost-md). `#psychosisLabel` Inline
bewusst belassen (Audiowide; JS setzt color/animation per ID — unverändert). Alle IDs/Handler/contenteditable/
data-* erhalten; `.char-info{flex:1→0 1 auto}` (player-only, npc-sheet nutzt die Klasse nicht).

**Tab-Bar → Wrap in 2 Reihen:** `.tabs` full-bleed bg/Border/Sticky, `overflow-x:auto` entfernt;
`.tabs__inner` (1280 zentriert, `flex-wrap:wrap`, gap `sp-1`) um die `.tab-btn`s (Delegation auf `#tabBar`
+ `closest('.tab-btn')` unberührt). `.tab-btn` Höhe **40px**, aktiv = roter Unterstrich + Glow (Status quo).
`⚙ #roleSettingsBtnTab` Inline-Style → `.tab-settings-btn`. `#injuryBadge`/`#raumBadge` bleiben inline.

**FAB52:** **Kein neuer FAB.** `#diceFab` (player.html) existiert bereits, löst die bestehende Würfel-Box aus
und ist ein eigenes Subsystem („bleibt") — die FAB52-Größe dokumentiert nur diesen Auslöser; ein neues FAB
hätte keine existierende Aktion zum Auslösen (Regel: FAB nur als zusätzlicher Trigger einer existierenden Aktion).

**Verifiziert:** player.css Braces 707/707; nur `player.css` + `player.html` geändert (kein JS); Header-Div-Balance
36/36, Tab 2/2; Delegation/IDs intakt; `combatGrappleBtn`/globale `.gear-action-btn`/`.remove-btn`/`.roll-btn` +
neutrale `.crit-modal-*`-Basis + base.css-`.btn*` unangetastet; `roles.css`/`npc-sheet.html` unverändert.
**Offen/zu beachten:** Skills-/DistMap-/Rolle-Buttons (s.o.) in 4d-2/4d-3; Armor-✕ (icon-sm 30) sitzt neben dem
inline-getunten 📦-Unequip (Größen-Mismatch bis Armor-Relayout 4d-2); manueller Durchklick-Test (jeder Tab
rendert, Würfeln/Skill-Check/Damage/Autofire/Reload/Equip/Sell/Drop/Injury/Raum/Name-Edit/Stat-Edit/Notes/
Realtime identisch) steht noch aus (kein Browser in dieser Session).

---

## Phase 4d-2 — Relayout: Stats-Grid + Skills-Tabelle + Item-Karten + Distanz-Bar ✅
**Geändert:** `player.css` (Stats/Res/Skills/Weapons/Armor/Cyberware/Gear/Distanz-Bar-Zonen +
Button-System-Erweiterung; Braces **720/720**, vorher 707), `player.html` (Render-Funktionen
`renderSkills`/`renderWeapons`/`renderArmor` + `distBarHtml`). **Nur CSS + Markup-Relayout,
keine JS-Logik/IDs/Events/Handler/Berechnungen.** Nur 2 Dateien.

**Stats-Tab (`renderStats`):** `.stat-grid` `repeat(5,1fr)` → `repeat(auto-fit,minmax(132px,1fr))`
gap `--sp-3` (420px-`@media` entfernt — auto-fit regelt Mobile); `.stat-card`-Padding `--sp-4`;
`.stat-val` `1.7rem` → `var(--fs-2xl)`; `.res-grid` `repeat(2,1fr)` → `repeat(auto-fit,minmax(150px,1fr))`,
`.res-card`-Padding `--sp-3`. Kein Markup-Eingriff (Dice/Roll-Buttons bereits 4d-1-System,
Inline-Notiz-Divs empNote/buffNote/penNote = Daten, unverändert).

**Skills-Tab (`renderSkills`/`skillRowHtml`/Header-Zeile):** Echte Daten **1:1 erhalten**
(Nutzer-Entscheidung) — Markup-Umbau nur: Roll + UP in `<div class="skill-actions">`-**Cluster**
gruppiert (damit Buttons die sm/icon-Skala fassen); Inline-gestylte Header-Zeile → `.skill-head-row`
(Label-Texte „Stat/Base/LVL" **wortgleich**, inkl. der bestehenden Label↔Var-Inversion:
„Base" über `sk.lvl`, „LVL" über `ipLvl`). **Grid (`.skill-row` + `.skill-head-row`):**
`28px minmax(0,1fr) 40px 40px 44px auto` (★ | Name | Stat | Base | LVL | Cluster), `min-height:40px`,
dezenter Hover-BG. Zahlenspalten **rechtsbündig** `tabular-nums` mono (Stat dim, LVL cyan — Farben behalten).
Penalty/Rollen-Badges bleiben in `.skill-base`; `contenteditable`-`lvlSpan` (Edit) unverändert;
Favoriten-Sektion nutzt `skillRowHtml` → übernimmt Struktur automatisch.

**Karten (§5):** **Weapons** `renderWeapons`: `weapons.map` + Nahkampf-Karten je in
`<div class="weapon-grid">` (`repeat(auto-fit,minmax(320px,1fr))`, gap `--sp-3`); `.weapon-card`
`margin-bottom:0` (Gap regelt), Padding `--sp-4`, `.weapon-name` `var(--fs-md)`. **Armor**
`renderArmor`: `.armor-grid` → `repeat(auto-fit,minmax(150px,1fr))`, `.armor-sp` `var(--fs-xl)`.
**Cyberware:** `.cyber-slot`-Padding `--sp-3` (HUM-Bar bleibt 8px; SVG-Klick/JS-Live-Barfarbe
unangetastet, Gotcha #4). **Gear:** `.gear-list` flex → `repeat(auto-fit,minmax(280px,1fr))`-Grid;
`.gear-item` auf **HUD-Karte** gehoben (Pseudo-Border clip-md `::before`/`::after` wie `.weapon-card`,
Padding `--sp-4`, Hover-Glow), `.gear-item-name` `var(--fs-md)` Rajdhani.

**Distanz-Bar (§9):** `distBarHtml`-Inline-Hex/Styles → Klassen + Tokens (`.dist-bar-label/-row/
-input/-unit/-mapbtn/-info/-dv/-wname/-tname`). IDs alle erhalten (`weaponDistInput`/`weaponDistMapBtn`/
`weaponDistInfo`/`wdBracket`/`wdDv`/`wdWeaponName`/`wdTargetName`); `#weaponDistInfo` behält
initiales `style="display:none"` (JS toggelt `style.display`). `#FFD700` (wdDv) → `var(--warning-yellow)`,
**`font-family:Audiowide` auf wdDv bewusst belassen** (Font-Migration = Phase 11). `#weaponDistMapBtn`
ins Button-System (**primary md**), `flex:1` via `.dist-bar-mapbtn`.

**Button-System-Erweiterung (4d-2):** zu den bestehenden 4d-1-Selektorlisten (Basis-Look +
`::before`/`::after` + hover/hover::after/active/focus-visible + Größen + Varianten + coarse)
hinzugefügt: `.skill-row .roll-btn` + `.skill-up-btn` (**primary, neue sm-32-Größe**),
`.skill-fav-btn` (**ghost-icon icon-sm 30**, `.active` = warning-yellow), `#weaponDistMapBtn`
(**primary md**), `#tab-armor .unequip-btn` (**ghost-icon icon-sm 30** — löst den
4d-1-Größen-Mismatch zwischen 📦-Unequip und ✕-Remove auf). `.skill-up-btn.unaffordable` bleibt
klickbarer gedämpfter Zustand (kein `:disabled` — Handler bleibt); `.skill-maxed` (Span) unverändert.
Alte enge Regeln (`.skill-row .roll-btn` 287-289, 7-Spalten-Redef, `.skill-fav-btn`/`.skill-up-btn`-Basis)
ersetzt/getrimmt. Armor-📦-Inline-Style + `float:right`-Span → `.armor-slot-actions`-Klasse.

**Verifiziert:** `player.css` Braces 720/720; Haupt-Modul-Script `node --check` OK (Template-
Literal-/Div-Balance der neuen Wrapper sauber); nur `player.html` + `player.css` geändert (kein JS);
geteilte Basisklassen (`combatGrappleBtn`/globale `.gear-action-btn`/`.remove-btn`/`.roll-btn`,
neutrale `.crit-modal-*`) + `#tab-*`-Scopes intakt; `roles.css`/`npc-sheet.html` unverändert.
**Offen/zu beachten:** manueller Durchklick-Test (jeder Tab rendert, Würfeln/Skill-Check/▲UP/★Fav/
Damage/Autofire/Reload/Ammo/Equip/Unequip/Sell/Drop/Armor-Ablation/Cyberware-SVG/Distanz-Bar+Map-Sync/
Realtime identisch) steht aus (kein Browser in dieser Session). Weapon-Karten mit offenem Autofire-
Rechner werden im Grid zu höheren Zeilen (auto-rows, akzeptabel). **4d-3** offen: Lifepath/Notes/
Injuries/Raum/Rolle (+ Rolle-Tab-Buttons `.role-dice-btn` via geteilter roles.css).

---

## Offene Punkte / To-do bis Ende
- **Phase 5–10** wie Status-Tabelle.
- **Phase 11 Cleanup:** Migrations-Aliase entfernen; `--radius`-Kollision auflösen; Temp-Fonts
  (Audiowide/Inter/Caveat) entfernen, sobald alle 13 Page-CSS migriert sind; optional In-Place-
  Anzeige-Bars auf Components nachziehen; `favicon.ico`; tote Alt-Styles.
- **agent-apps.js / agent-dm.js** (iCHOOM, me-null) — nur defensiv geguardet; tiefere Bereinigung
  optional als eigener Task NACH dem Redesign (out of scope).
