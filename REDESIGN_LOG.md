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
| 4d player Layout-Pass | ✅ fertig | 4d-1 ✅ (Basis/Button-System/Header/Tab-Bar); 4d-2 ✅ (Stats/Skills/Karten/Distanz-Bar); 4d-3 ✅ (Lifepath/Notes/Injuries/Raum/Rolle) → **player.html KOMPLETT** |
| 5 dm.html | 🟡 5a ✅ | Opus xhigh; 5a (Basis/Button-System/Haupt-Dashboard) fertig; 5b Kontroll-Modal / 5c Combat+Items / 5d Schwarzmarkt offen |
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

## Phase 4d-3 — Relayout: Lifepath/Notes/Injuries/Raum/Rolle ✅ → **player.html KOMPLETT**
**Geändert (nur 2 Dateien):** `player.css` (4d-3-Zonen + selbständiger Rolle-Button-Block; Braces
**783/783**, vorher 720), `player.html` (Render-Funktionen + statisches Markup der 5 Rest-Tabs;
+74 Z. netto). **Nur CSS + Markup-Relayout, keine JS-Logik/IDs/Events/Handler/Berechnungen.**
`roles.css` / `npc-sheet.html` **unangetastet** (git verifiziert).

**User-Entscheidungen (2026-06-08):** Rolle = **leicht proportionieren** (gescopt `#tab-role`,
roles.css-Geometrie bleibt); Rolle-Buttons = **gefüllter Pro-Rollen-Akzent** + HUD-Geometrie.

**Relayout-Werte pro Tab:**
- **Lifepath** (`renderLifepath`): `.sec-head` "Lifepath" + `.lp-grid` flex-column →
  `repeat(auto-fit,minmax(280px,1fr))` gap `--sp-3`; `.lp-item` flex-column, `.lp-val` `flex:1`
  (gleich hohe Karten je Reihe), Abstände auf `--sp`.
- **Notes** (statisch + `setupNotes` UNVERÄNDERT): `.notes-header` auf `.sec-head`-Look angeglichen
  (border-bottom/cyan/tracking), `.notes-wrap`/`.player-notes-area` auf `--sp`; Textarea behält
  **echte border** (Input-Ausnahme, Gotcha #2). Reines CSS — kein Markup-/JS-Eingriff.
- **Injuries** (`renderCritInjuries`): `.sec-head` "Critical Injuries" + Karten in
  `.injury-grid` (`repeat(auto-fit,minmax(300px,1fr))` gap `--sp-3`, analog Gear/Weapons);
  `.injury-card margin-bottom:0`, Padding `--sp-4`, Header/Meta `--sp`. `.remove-btn` (✕ = Heal)
  bleibt im Button-System (danger/icon-sm).
- **Crit-Injury-Modal** (`showCritInjuryFlow`/`applyInjury`): inline-Styles → **nur via
  `#critModalBox`** gescopt — `#critTargetSelect` inline-`style` → `.crit-target-select` (HUD-Select,
  full-width, Focus-Glow) + `.crit-target-row`; „Ziel"-Label → `.crit-field-key`; `.crit-no-target`-
  Warn-`style.cssText`-Zeile entfernt → CSS-Regel; `.crit-field-row`/`.crit-modal-btns`-Abstände auf
  `--sp`. **Neutrale `.crit-modal-*`-Basis unberührt → `#dmgApplyBox`/4b unverändert.**
- **Raum** (`renderRaumTab` + statisches Panel): statisch `#raumBeschreibung` inline → `.sec-head`
  "Raum" + `.raum-desc` (ID behalten, `:empty{display:none}`); inline-Flat-Rows → **`.raum-grid`
  Karten am Gear-Grid** (`repeat(auto-fit,minmax(280px,1fr))`, Pseudo-Border-Clip wie `.gear-item`),
  `.ctrl-btn` inline-Style raus (Button-System `#tab-raum .ctrl-btn` primary). **`data-pickup`/
  `data-name` + Pickup-Handler (removeRoomItem→patchCharacter→renderGear→logRoll) IDENTISCH.**
- **Rolle** (`renderRoleTab` async + Settings-Modal): `#tab-role .role-panel` Eigenpadding raus
  (Cap+Padding kommt vom `.tab-panel`), gap `--sp-4`. Rank-Up `#roleRankUpBtn` inline-Style →
  `.role-rankup`-Wrapper-Klassen + Button-System; `disabled`-Attribut bleibt (CSS-`:disabled`-Look).
  **Kostenrechnung/IP-Check/Click-Handler (patchCharacter→renderRoleTab→renderSkills) + async
  mountRoleInterface IDENTISCH.** Settings-Modal: innere Box + Kinder inline → `#roleSettingsModal`-
  gescopte Klassen (`.role-set-box/-title/-label/-input/-divider/-help/-msg/-actions`); Overlay-
  Element behält seinen inline-`style` (display per JS getoggelt). Alle IDs + Handler unverändert.

**Button-Größen-Mapping (4d-3):** Selbständiger Rolle-Button-Block am `player.css`-Ende (damit die
geteilten 4d-1/4d-2-Listen unberührt bleiben). `#tab-role .role-dice-btn` = **gefüllter Akzent**
(`--btn-*` = `--role-accent*`, `--btn-color: var(--role-bg)`, md40), `.secondary` = Ghost-Akzent;
`#roleRankUpBtn` = **gefülltes Cyan** (md40, `width:100%`, `:disabled` opacity .4 — sitzt außerhalb
des Theme-Containers → `--role-accent` = Default-Cyan); `#roleSettingsModal button` = md40 `flex:1`
(`#roleSettingsReset` full-width), Save = combat, Cancel/Reset = ghost. coarse → 44px. Der 4d-1-
„NICHT hier"-Kommentar entsprechend aktualisiert.

**Scoping bestätigt:** neutrale `.crit-modal-*`-Basis + globale `.remove-btn`-Basis + `#dmgApplyBox`
(20 Refs) unberührt; alle 4d-3-Stile gescopt (`#critModalBox`/`#tab-raum`/`.injury-grid`/`#tab-role`/
`#roleSettingsModal`); `.role-dice-btn` NUR unter `#tab-role` (body-portaliertes `.role-modal` bleibt
roles.css-Default = bestehendes 4c-Verhalten); **Pro-Rollen-Akzent erhalten** (`#tab-role`-Overrides
fassen `--role-accent*` nicht an).

**Verifiziert:** `player.css` Braces 783/783; Haupt-Inline-Modul + Sub-Modul `node --check` sauber;
`git diff` = nur `player.html` + `player.css`; `roles.css`/`npc-sheet.html` unverändert; keine
Reste der entfernten inline-Styles. **Interaktionen IDENTISCH** (Lifepath-Anzeige, Notes-Autosave,
Injury Add/Heal/Assign + No-Target-Warn, Raum-Aufheben, Rolle-Load/Rank-Up/role-dice/Settings-Modal),
**4a–4d-2 unberührt**. **Offen:** manueller Browser-Durchklick (kein Browser in dieser Session).

---

## Emoji-Glyphen → SVG-Icon-Set (cyber-icons.svg) ✅
**Ziel:** Emoji in Buttons/Labels durch das HUD-Icon-Sprite ersetzen (einheitlich, Farbe via
`currentColor`). **Reiner Glyph-Tausch, keine Logikänderung** außer bewusstem textContent→innerHTML.

**Setup:** Sprite `public/cyber-icons.svg` → **`public/assets/icons/cyber-icons.svg`** verschoben
(`git mv`; Task-/Sprite-Kommentar-Pfad). `.ic`-Regel (`width/height:1em; inline-block;
vertical-align:-.125em; flex:none`) in **`base.css` + `cyberpunk-ui.css`** (Union deckt alle 9
Seiten — base fehlt nur auf index, cyberpunk-ui nur auf den nicht-migrierten Seiten).
Snippet: `<svg class="ic" aria-hidden="true"><use href="/assets/icons/cyber-icons.svg#ic-NAME"/></svg>`.

**Entscheidungen (Nutzer):** Sprite nach assets/icons verschieben; icon-tragende textContent-Sinks
auf `innerHTML` umbauen; **konservatives Mapping** (nur eindeutige Funktions-Treffer; Grenzfälle
nur melden).

**Ersetzt (21 Icons, alle `use`-Refs == Sprite-Symbol-IDs verifiziert):**
- **player.html:** ic-dice (🎲/⚄ stat/skill/melee/fab), ic-money (💰 Cash-Chip + Sell), ic-history
  (📜 cashLog ×2), ic-longrest (🌙 ×4), ic-mapdist (📡), ic-shop (🛒), ic-map (🗺), ic-autofire (🔫),
  ic-reload (🔄 reload-btn), ic-unequip (📦 Waffe+Armor), ic-surgery (🩺), ic-roomadd (📦 Gear→Raum),
  ic-blackmarket (🚪 nav), ic-chat (💬 nav), ic-timer (⏱ ZEIT ABGELAUFEN), ic-volume (🔊 indicator).
- **dm.html:** ic-timer (⏱ nav+TIMER), ic-map, ic-blackmarket (nav), ic-combat (⚔ Neuer Kampf),
  ic-volume (🔊 SOUND), ic-roomempty (🗑 Raum leeren ×2), ic-delete (🗑 Charakter löschen),
  ic-dice (🎲 ×3 / ⚄ fab).
- **map.html:** ic-dice (🎲 ×6), ic-reload (🔄 mwcReload), ic-autofire (🔫 mapAutofire static +
  textContent→innerHTML). **shop.html:** ic-money (navCash, textContent→innerHTML).
  **npc-sheet.html:** ic-dice (🎲 Roll).
- **assets/js:** `ui/topbar.js` ic-nosleep (😴, textContent→innerHTML), `sound-player.js` ic-volume
  (🔊 settingsBtn textContent→innerHTML + Panel-Header), `radio/radio-mount.js` ic-radio (📻),
  `agent/agent-apps.js` ic-chat (💬 Nachricht), `ui/dm-time-dial.js` ic-combat (⚔ Start) +
  ic-longrest (🌙 Force Long Rest).

**Bewusst NICHT ersetzt (konservativ → für Nutzer-Entscheidung):** Toast-/Log-Strings
(player 1859/2135/2162/2887/2914/2929; map 3247) — `showToast` setzt textContent, Umbau wäre
breiter Logik-/Escaping-Eingriff; 📦 Raum-Tab-Nav (player 247) + Sektionstitel „RAUM/UMGEBUNG"
(dm 194/244) + „Aus Shop hinzufügen" (dm 413); 🗑 generisch „Löschen"/Clear-Roll-Log
(dm 188/431, sound-dm 335) + Map-Editor-Tools (map 397/443); ⚔ „Ausrüsten" (player 2077),
npc-sheet „⚔️ Combat"-Tab (FE0F-Variante), `warning-banner.js` ICON-Konstante; 🔫 „Supp. Fire"
(map 389); 🔄 Timer-„Neu starten" (dm 125 — Restart ≠ Waffen-Reload); ⏱ „Session"/Quick-Fix/
Buff-Time (dm 171, player 3234/3753); 🛍 DM-„Items" (dm 38/349); 💸 „Schulden" (player 491, dm
825/1768/1856); DM-Schwarzmarkt-Panel 🚪/💬 (dm 3397/3421/3550/3617 — evtl. Pergament-Ästhetik);
Rollen-Widget-Label-Emojis (`roles/solo|fixer|nomad|lawman|medtech.js` — Ability-Labels, kein
Funktions-Match); create/upload Specialty-Card-Daten-Icons (🩺/🎲); radio-mount-Kommentar.

**Verifiziert:** Sprite `xmllint` ok; **alle 21 genutzten `#ic-*` == definierte Symbole** (kein
Tippfehler, kein fehlendes Icon); `node --check` sauber für alle 5 editierten Standalone-JS +
inline-Module (dm/map/shop/player); Emoji-Reste-Re-Grep = nur die o.g. bewussten Ausschlüsse.
**Offen:** voller Emoji-Restbestand (~130 Symbole, viele strukturell wie ─/→/✕/⚠) im
Abschluss-Report gelistet — Nutzer entscheidet über weitere Icons.

---

## Icon-Set Batch 2 — Merge + ic-items/ic-pin ✅
**Sprite:** 18 neue `<symbol>` (Batch 2) in `public/assets/icons/cyber-icons.svg` vor `</svg>`
gemergt → **39 Symbole** gesamt, `xmllint`-well-formed, IDs eindeutig (keine Kollision mit
Batch 1). Neue IDs: `ic-items, ic-pin, ic-target, ic-eye, ic-user, ic-lock, ic-shield, ic-edit,
ic-skull, ic-wrench, ic-blood, ic-burst, ic-fire, ic-clipboard, ic-play, ic-pause, ic-stop,
ic-next`. **`cyber-icons-batch2.svg` existierte nicht auf der Platte** (nur im Task-Anhang) →
Symbole direkt aus dem Anhang gemergt; keine Batch2-Datei zu löschen.

**Verdrahtet (nur `dm.html`):**
- **🛍 → ic-items:** `dm.html:38` (Nav-Chip `dmItemsBtn`) + `dm.html:349` (Overlay-Titel „Items").
- **📌 → ic-pin:** `dm.html:906` DM-Chat-Highlight (`hlBtn`/`dm-msg-highlight-btn`, „Für Spieler
  hervorheben", in `appendDmChatMessage`) — `textContent`→`innerHTML`; `.active`-State (via
  `className`/`is_highlighted`), Title, Click-Handler, `_highlightedMsgId` unverändert.

**Bereitgestellt, nicht platziert:** die übrigen 16 Batch2-Icons (target/eye/user/lock/shield/
edit/skull/wrench/blood/burst/fire/clipboard/play/pause/stop/next) für spätere Reskin-Phasen
(z.B. play/pause/stop/next → Radio/Sound Phase 8; shield/blood/skull/eye/lock → Combat/Status).
**Offen:** `map.html:2667` (📌 „Messung pinnen" = Karten-Distanzmessung) bewusst belassen →
Map-Reskin (Phase 7).

**Verifiziert:** Sprite 39 Symbole / well-formed / keine Dupe-IDs; `ic-items`+`ic-pin` definiert;
alle genutzten `#ic-*` resolven weiterhin; `dm.html` Inline-Modul `node --check` sauber; kein
🛍/📌 mehr in `dm.html`. Nur `cyber-icons.svg` + `dm.html` geändert.

---

## Radio-Nav-Item in Player- + DM-Sidebar ✅
**Problem:** Radio fehlte in beiden redesignten Sidebars — die Mounts waren **defekt**:
`mountRadio` (player) machte `topNav.insertBefore(_radioBtn, #navCash)`, aber `#navCash` ist
kein direktes Kind von `#topNav` (liegt im `.cyber-sidebar-foot`) → `NotFoundError`;
`mountRadioDM` zielte auf `nav.nav`, das im neuen DM-Sidebar nicht existiert → null → Crash.

**Lösung (Nutzer: eingebettete Schublade, nicht radio.html):** statisches `cyber-nav-item`
„Radio" (ic-radio) als Trigger/Anker der bestehenden `mountRadio`-Schublade.
- **`radio-mount.js` (additiv, rückwärtskompatibel):** `mountRadio(topNav, char, patch, opts)`
  nutzt `opts.triggerEl` als `_radioBtn` (kein `createElement`/`insertBefore`; Schublade ankert
  an dessen Rect), schaltet es bei erfolgreichem (gear-gated) Mount sichtbar (`hidden=false`).
  Ohne `triggerEl` = altes Verhalten. `mountRadioDM(topNav, triggerEl)` reicht durch.
  `updateRadioOwnership` toggelt beim externen Trigger nur `hidden` (statt `.remove()`) →
  Gating konsistent, Re-Acquire funktioniert. Schublade/Engine/UI unverändert.
- **player.html:** `#radioNavBtn` (`hidden` per Default → nur bei Radio-Gear sichtbar) in
  `.cyber-sidebar-nav`; Mount-Call um `{ triggerEl }` erweitert.
- **dm.html:** `#radioNavBtn` (immer sichtbar, DM hat Radio stets); Mount-Call auf gültigen
  Container `.cyber-sidebar-nav` + `triggerEl` gefixt (behebt den `nav.nav`-Crash).
- **sidebar.css:** `.cyber-nav-item[hidden] { display:none }` — nötig, weil
  `.cyber-nav-item { display:flex }` sonst die UA-`[hidden]`-Regel überschreibt (gated Item).

**Verifiziert:** `node --check` radio-mount.js + player/dm Inline-Module sauber; `#radioNavBtn`
in beiden Sidebars, Struktur identisch zu Geschwister-Items; ic-radio resolved; alte defekte
Targets entfernt; sidebar.css Braces 56/56. Nur `radio-mount.js` + `player.html` + `dm.html` +
`sidebar.css` geändert; andere Nav-Items/Cash/Handler unberührt.

---

## Phase 4d — Sidebar Hover-Expand / Toggle entfernt / Radio-Popup ✅
**Ziel:** Desktop-Sidebar als schmale Icon-Rail, die bei :hover **als Overlay** aufklappt (kein
Toggle, kein Reflow). Fixierte Elemente an die **konstante Rail-Breite** koppeln. Radio-Popup
**neben** die Sidebar setzen + auf HUD-Look redesignen. Keine Funktions-/Logik-Änderung (Nav,
Radio-Audio, Routing identisch). Mobile (Burger/Off-Canvas) unberührt; `radio.html` (Phase 8) tabu.

**Lösung Overlay-Modell (Rail- vs Expand-Breite):** Der **Content-/Status-Bar-Offset bleibt
konstant = `--sb-rail`** (60px) — die Sidebar (`position:fixed; z-index:1250`) wächst bei `:hover`
nur in der **Breite** Rail→`--sb-w` und legt sich so über den Content, ohne ihn zu verschieben.
- **`sidebar.css`:** Desktop-Content/Bars-Offset auf konstant `--sb-rail` (beide `.sidebar-collapsed`-
  Varianten weg). Neuer Desktop-Block `.cyber-sidebar { width:var(--sb-rail) }` +
  `.cyber-sidebar:hover { width:var(--sb-w); box-shadow:… }` (vorhandene `width`-Transition → smooth,
  reduced-motion-Guard greift). Icon-Rail-Regeln von `body.sidebar-collapsed .cyber-sidebar` auf
  **`.cyber-sidebar:not(:hover)`** invertiert (Labels/Name/Cash-Text aus, Items/Cash/Logo zentriert).
  Bewusst **hover-only** (kein `:focus-within`) → Sidebar verdeckt nach Klick auf `#radioNavBtn` nicht
  das daneben geöffnete Popup. Toggle-CSS + toter Mobile-`sidebar-collapsed`-Rest entfernt.
- **`sidebar.js`:** `COLLAPSE_KEY`/localStorage-Read, `sidebar-collapsed`-Toggle-Handler **und**
  `_syncToggleIcon()` entfernt. Burger/Off-Canvas/`_markActive`/`has-cyber-sidebar` unverändert.
- **`dm.html` + `player.html`:** `.cyber-sidebar-toggle`-Markup entfernt; Cache-Bust
  `radio.css?v=2→3`, `sidebar.css→?v=2`. Alle Nav-IDs/hrefs/`#radioNavBtn`/Cash/Mount-Calls unberührt.
- **Fixierte Elemente an Rail-Offset gekoppelt (konstant, springen beim Hover nicht):**
  `player.css` Dice-FAB/Popup + Timer-Bar → `calc(var(--sb-rail) + 1.5rem)` bzw. `var(--sb-rail)`
  (collapsed-Varianten weg); **`dm.css` neu**: gleicher Dice-Offset (behebt nebenbei, dass
  `#dmDiceFab` bei `left:1.5rem` unter der Sidebar saß).
- **Radio-Popup-Position (`radio-mount.js` `_openDrawer`):** Desktop → `left = railBreite + 8`
  (`--sb-rail` via `getComputedStyle`, Fallback 60), `top` am Trigger ausgerichtet + gegen
  Viewport-Unterkante geklammert → steht **neben der Rail**, clippt nicht. Mobile-Pfad unverändert.
  Audio/Engine/Open-Close/IDs/Handler unangetastet.
- **Radio-Popup HUD-Restyle (`radio.css`, nur eingebettetes Popup — `radio.html` lädt es nicht):**
  `#radioDrawer` mit Clip-Border-Pseudo-Layer (`::before` Cyan-Rand / `::after` `--bg-panel`-Füllung)
  + `drop-shadow(--glow-cyan-m)`; Header/Screen/Strip/Knöpfe/LEDs auf Tokens umgefärbt, Mono-Typo.
  Controls = Button-System (Clip-Path + Pseudo-Border + Hover-Glow), **icon-only** (gewählte Variante):
  Seek = `ic-next` bzw. gespiegeltes `ic-next` (`.ic-flip`), Power = `ic-play`/`ic-stop`-Swap **rein
  per CSS** über die bestehende `.powered`-Klasse (rot→grün). `radio-ui.js`: nur Controls-Markup auf
  Icons + `aria-label` umgestellt (IDs/Handler/Knob-/Strip-Logik gleich).

**Verifiziert:** `node --check` sidebar.js + radio-mount.js + radio-ui.js sauber; Brace-Balance
sidebar.css 51/51, radio.css 69/69; keine Restreferenz auf `cyber-sidebar-toggle`/`sidebar-collapsed`/
`lzrv_sidebar_collapsed`/`_syncToggleIcon`/`COLLAPSE_KEY` mehr; `radio.html` lädt weiterhin nur
`radio-standalone.css` (Restyle isoliert); alle genutzten `#ic-*` (next/play/stop/radio/money/…)
resolven. Geändert: `sidebar.css`, `sidebar.js`, `dm.html`, `player.html`, `player.css`, `dm.css`,
`radio-mount.js`, `radio.css`, `radio-ui.js`. Nav-Handler/Radio-Audio/Routing unverändert.

---

## Phase 4d — Radio-Controls: dedizierte Icons (ic-power / ic-seek) ✅

**Ziel:** Behelfs-Icons der Radio-Controls auf dedizierte Symbole umstellen — Power = `ic-power`,
Seek = `ic-seek` (vor) bzw. gespiegeltes `ic-seek` (zurück).

**Umsetzung:**
- `cyber-icons.svg`: zwei neue `<symbol>` `ic-power` + `ic-seek` vor `</svg>` gemergt
  (well-formed via `xmllint --noout` bestätigt, IDs eindeutig). Das nur als Doc gelieferte
  `cyber-icons-radio.svg` existierte nicht auf der Platte → nichts zu löschen.
- `radio-ui.js` (`buildUI`-Template): Power-Button von Doppel-Icon (`ic-play`/`ic-stop` mit
  `ic-pwr-on`/`ic-pwr-off`) auf **ein** `ic-power` reduziert; Seek-Buttons `ic-next` → `ic-seek`,
  `ic-flip` am Prev beibehalten. IDs (`radioPowerBtn`/`radioSeekNext`/`radioSeekPrev`),
  `aria-label`s, Event-Verdrahtung und alle Handler **unverändert**.
- `radio.css`: obsoleten `ic-pwr-on/off`-Display-Toggle (3 Zeilen) entfernt;
  `.ic-flip{transform:scaleX(-1)}` + `.powered`-Optik (grün/Glow) bleiben.

**Kernpunkte gelöst:** Power-Zustand rein per CSS über bestehende `.powered`-Klasse
(`updateDisplay`, keine JS-Logik angefasst). Seek-Spiegelung via ein Symbol + `.ic-flip`.

**Geteiltes Markup (bewusst):** `buildUI()` speist auch die Standalone-`radio.html`; per
User-Entscheidung Icon-Tausch für beide übernommen. `radio.html` + `radio-standalone.css` selbst
unberührt. Radio-Wiedergabe/Power/Seek/Web-Audio unverändert. Geändert: `cyber-icons.svg`,
`radio-ui.js`, `radio.css`.

---

## Phase 5a — dm.html: Basis + Button-System + Haupt-Dashboard ✅
**Geändert (nur 2 Dateien):** `public/assets/css/dm.css` (Reskin+Relayout der 5a-Zonen + Button-
System am Dateiende; Braces **498/498**, vorher 483; Cache-Bust `?v=6`), `public/dm.html`
(Inline-Style→Token-Swaps in den 5a-Render-Funktionen + Farb-Literale in den Helfern; 24 Z.).
**Nur CSS + Inline-Token/Markup, keine JS-Logik/IDs/Events/Handler/data-*/Berechnungen.**
dm.css ist die DM-CSS-Datei (lädt nur auf dm.html).

**Scope-Entscheidungen (Nutzer 2026-06-08):** **Button-System global auf `.ctrl-btn`/`.ctrl-btn-red`**
(fließt bewusst in 5b–5d, die die Klasse teilen — erlaubt); **NPC-Edit-Modal in 5a** (NPC-Subsystem
komplett). **Content-Cap:** **KEIN** globaler 1280-Cap — DM ist bewusst eine breite Ops-Konsole
(MASTER „Grid darf breiter sein, kontrolliert"); Dichte via Grid-`minmax`-Cap + `--sp`. Volle-
Höhe-Shell (body 100vh, `.dm-layout` 1fr/400px, Chat 38vh) **unverändert** (null Funktionsänderung).

**Token-Migration (Gotcha base.css-Override):** alle 5a-Zonen auf neue HUD-Tokens
(`--neon-cyan/-red`, `--bg-panel/-soft/-cyan/-red`, `--border-dark`, `--text-main/-dim/-muted`,
`--clip-*`, `--glow-*`, `--sp-*`, `--t-fast/--ease`, `--radius`). Schrift NICHT migriert
(`--font-display`/Audiowide bleibt) — **Ausnahme Button-System** (`--font-heading`, Teil des
Komponenten-Looks, konsistent mit player).

**DM-Basis (Scope A):** Page-Shell/Layout/Tab-Bar (`.dm-content-tab` aktiv=rot), `.dm-sidebar`,
`.dm-chat-bottom` (rote Oberkante + subtiler Glow), Spacing auf `--sp`. **Einheitlicher HUD-
Section-Header** (fs-xs, tracking, uppercase, cyan, border-bottom) auf `.roll-log-head`/
`.dm-chat-head`/`.dm-room-header`/`.sst-header`; `.npc-section-title` rot (Combat/Rolle).
Geteilte HUD-Inputs **global**: `.ctrl-input`/`.ctrl-select` (+ `.dm-chat-input`/`.player-notes-area`/
`.npc-field` etc.) → Token-Look, echte border (Gotcha #2). Sidebar-Basis (Session-Timer/Raum/
Own-Notes) token-migriert.

**Button-System (Scope B, Variante A gespiegelt von player.css):** custom-property-getriebener
Block am Dateiende (`--btn-*`, `::before`-Border/`::after`-Füllung, clip-sm, drop-shadow-Glow,
md38/sm32/icon-sm30, →44 @coarse). **Mapping:** `.ctrl-btn`=primary/cyan md38 (**global**),
`.ctrl-btn-red`=combat (global), `.npc-add-btn`/`.npc-section-actions .ctrl-btn`=combat/primary **sm**
(Inline-Größe der Gruppen-Buttons in `renderNpcGrid` entfernt), `.dm-chat-send-btn`=combat,
`.npc-save-btn`=combat, `.npc-delete-btn`=ghost(Hover danger), `.npc-add-weapon-btn`=primary sm,
`.npc-weapon-remove`=danger icon-sm. **Alte Look-Regeln** von `.ctrl-btn`/`.ctrl-btn-red`/
`.npc-add-btn`/`.npc-save-btn`/`.npc-delete-btn`/`.npc-add-weapon-btn`/`.npc-weapon-remove`
**entfernt** → System ist Single Source (keine Duplikate, kein `!important`).
- **Subtile Icon-Affordances NICHT ins borderige System** (bewusste Abweichung vom Plan-Mapping,
  besser für Dichte/Hover-Reveal): `.dm-card-delete`/`.dm-notes-icon`/`.roll-log-clear`/
  `.dm-room-item-del`/`.dm-chat-collapse-btn`/`.dm-msg-highlight-btn`/`.sst-header button`/
  NPC-Zeilen-Actions (`.npc-row-actions button` inkl. edit/visibility/dice/play) — nur token-
  migriert als leichte Ghost-Icons (📌-Highlight amber→`--warning-yellow`).

**Haupt-Dashboard (Scope C):**
- **Char-Grid** (`renderGrid`): `.dm-grid-wrap` `auto-fill minmax(240px,320px)` + `justify-content:start`
  (Karten blasen auf breiten Screens nicht auf), Gap/Pad `--sp`. `.dm-card` **echte border (KEIN clip)** —
  `.dm-card--dying`-box-shadow-Puls + JS-Live-Zustand bleiben intakt (Gotcha #2+#4); dying/psycho-
  Farben auf Tokens (psycho-Lila `#7B2FBE` bewusst belassen, kein Palette-Token). Bars/Badges/Ammo
  token. `renderGrid`-Inline-Farben + `hpColor` → Tokens (Hum.-Gradient-Orange `#FF8C00` belassen).
- **NPC-Grid** (`renderNpcGrid`/`buildCompactNpcCard`): `.npc-section-header`-Chrome HUD,
  **Rollen-Akzent (inline `border-left-color` + `.npc-section-name` color) ERHALTEN** (verifiziert
  dm.html:1079–1080); `.npc-group-rows`/`.npc-row*` dichte HUD-Liste; Bar-Farbe `npcHpColor`→Tokens.
- **Roll-Log**: Head + Entry token, `.roll-total` mono, crit cyan/rot.
- **DM-Chat**: `.chat-msg`/`-header`/`.chat-sender(-dm)`/`.chat-time`/`.chat-text` **neu in dm.css
  definiert** (lagen nur in player.css, das dm.html NICHT lädt → waren ungestylt), gescopt unter
  `.dm-chat-messages`; Akzentränder + Highlight token.
- **NPC-Modal** (Q2): Felder/Inputs/Item-Suche token (Focus-Glow rot), Buttons → System.

**Gescopt/unangetastet für 5b–5d (verifiziert, 84 Treffer im Diff unverändert):** 5b `.dm-modal-*`/
`.dm-tab-btn`/`.ctrl-section(-head)`/`.ctrl-row`/`.ctrl-label`/`.dm-stats-grid`/`.ctrl-inj-*`/
`.buff-*`/`.ctrl-buff-*`/`.cond-toggle-btn`/`.dm-left-ip-btn`/`.dm-modal-cash`; 5c `.combat-*`/
`.cbt-*`/`.dm-timer-*`/`.timer-*`/`.dm-npc-quick-*`/`#dmItemsModal`/`.dm-ammo-*`(Modal)/`.item-search-*`/
`.npc-result`/`.npc-roll-*`; 5d `.bm-*`; „bleibt" Dice-FAB/Popup/3D-Overlay (`.dice-*`/`.die-btn`),
PIN-Overlay, Player-Notes-Overlay, Raum-Expand-Overlay. **Dead CSS** (`.npc-card*` vertikal =
`buildNpcCard` nie aufgerufen; `.npc-card-med`/`-grid`) bewusst nicht angefasst.

**Verifiziert:** dm.css Braces 498/498; `git status` = nur `dm.css` + `dm.html`; beide Inline-Module
`node --check` sauber (Template-Literale intakt); keine Alt-Token-Reste in den 5a-Zonen (Reste nur
in 5b/5c/5d/dead/dice/pin); System-Button-Klassen single-source (keine Duplikate); Rollen-Akzent
erhalten; `buildNpcCard` weiter ohne Aufrufer. **Offen:** manueller Browser-Durchklick (kein Browser
in dieser Session) — Grid-Klick→Kontroll-Modal (5b-Look noch alt, funktional), Chat senden/Bild/
Highlight, Roll-Log-Realtime, NPC Gruppen-Toggle/+NPC/Edit/Visibility/Dice/Play, NPC-Modal Save/
Delete/Waffen, Raum/Session-Timer, Content-Tabs, Combat-Setup (Buttons neuer Look, Funktion intakt).
**Bekannte Mini-Inkonsistenzen (5c-Feinschliff):** `.ctrl-btn` mit Inline-`color`/`font-size`/`padding`
(z.B. „▶ Kampf starten") behalten ihren Inline-Wert über dem System (akzeptabel, da 5c relayoutet);
aktive NPC-Visibility-Zeile = grüner Rand + cyan Text (vorbestehend, nicht reskin-bedingt).

### Phase 5a — Bugfix: kompletter Hintergrund rot ✅
**Symptom:** Nach 5a war auf dm.html der gesamte Seitenhintergrund rot.
**Ursache:** Im neuen BUTTON-SYSTEM-Banner-Kommentar stand die Klassenliste
`(.dm-tab-btn/.cbt-*/.bm-*/.combat-*/.die-btn/.timer-*/ …)` — die Sequenz **`*/`** (Glob-Stern
direkt gefolgt von Slash, z.B. `.cbt-*/`) **schloss den CSS-Kommentar vorzeitig**. Der Resttext
wurde als Live-CSS geparst und verschluckte die **Basis-Button-Regel** (`.ctrl-btn, …{ position:
relative; isolation:isolate; clip-path; … }`) komplett. Dadurch waren die System-Buttons
`position:static` → ihr `::before` (`position:absolute; inset:0; z-index:-1`,
`background:var(--btn-border)`) dimensionierte sich gegen das **Viewport** statt den Button und
malte ganzflächig rot HINTER die Seite (bestätigt per Headless-Chrome-Screenshot + Computed-Style-
Probe: `.dm-chat-send-btn` host `position:static`, `::before` 900×288).
**Fix:** Banner-Kommentar-Klassenliste auf Kommas umgestellt (`.cbt-, .bm-, .combat-, .timer-, …`)
→ kein `*/` mehr im Kommentar. **1 Zeile in dm.css**, keine Regel-/Selektor-/Funktionsänderung.
**Verifiziert:** Kommentar-Balance dm.css 80/80 `/* `=`*/`; Braces 498/498; Headless-Render zeigt
dunklen HUD-Hintergrund, Buttons korrekt geclippt (Pseudo-Layer button-lokal). **Lehre:** in
CSS-Kommentaren nie Glob-Klassenlisten mit `*/`-Sequenz (Stern+Slash) — Kommas/Spaces verwenden.

### Phase 5a — Bugfix: Charakter-Grid wechselt Layout beim Tab-Switch ✅
**Symptom:** Charakter-Karten initial korrekt als Karten-Grid; nach NPCS → zurück zu CHARAKTERE
plötzlich Vollbreite-Zeilen.
**Ursache:** `setupMainTabs()` (dm.html) setzte beim Tab-Wechsel `#dmGrid.style.display =
panel==='chars' ? 'block' : 'none'`. `#dmGrid` ist `.dm-grid-wrap { display:grid }` — beim
Initial-Load greift die CSS-Grid-Regel (kein Inline-Style), nach dem Tab-Switch überschreibt der
**Inline-`display:block`** das `display:grid` → Karten stapeln vollbreit. `renderGrid` erzeugt in
beiden Fällen identisches Markup; nur der Inline-Display-Wert war falsch.
**Fix:** `'block'` → `'grid'` (1 Zeichen-Wert in dm.html). Keine Render-Logik/Daten/IDs/Events/
Tab-Switch-Funktion geändert.
**Verifiziert:** Einzige `#dmGrid`-Display-Zuweisung; `node --check` sauber; Headless-Render nach
simuliertem Tab-Return = Karten-Grid nebeneinander, `computed display=grid` (identisch zum Initial).

## Offene Punkte / To-do bis Ende
- **Phase 5–10** wie Status-Tabelle.
- **Phase 11 Cleanup:** Migrations-Aliase entfernen; `--radius`-Kollision auflösen; Temp-Fonts
  (Audiowide/Inter/Caveat) entfernen, sobald alle 13 Page-CSS migriert sind; optional In-Place-
  Anzeige-Bars auf Components nachziehen; `favicon.ico`; tote Alt-Styles.
- **agent-apps.js / agent-dm.js** (iCHOOM, me-null) — nur defensiv geguardet; tiefere Bereinigung
  optional als eigener Task NACH dem Redesign (out of scope).
