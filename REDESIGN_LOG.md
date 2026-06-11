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
| 5 dm.html | ✅ fertig | Opus xhigh; 5a (Basis/Button-System/Haupt-Dashboard) + 5b (Kontroll-Modal) + 5c (Combat-Tracker/Timer/Items/Raum) + 5d (Schwarzmarkt) → **dm.html KOMPLETT** |
| 6 shop.html | ✅ fertig | Fundament-Includes + Token-Migration + Button-System + In-Place-Reskin (Karten/Ammo/Detail/4 Modals); Preis-Tier-Farben; 🔒→ic-lock |
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

---

## Phase 5b — DM-Kontroll-Modal (Konzept ✅, Umsetzung 3er-Split)
**Konzept freigegeben** (Nutzer 2026-06-09, `_dev/phase5b-concept.md`). 3 Entscheidungen:
2-Zonen behalten + „Mehr"→Karten-Grid; geteilte `.ctrl-row`/`.ctrl-label` **konservativ global**
mit-redesignen (Flex bleibt — Combat-Setup `dm.html:66` hat 3 label-lose Controls); 3er-Split
(5b-1 Foundation/Header/Left · 5b-2 Body-Tabs · 5b-3 Rollen-UIs+NPC-Quick).

### Phase 5b-1 — Foundation + Header + Left-Panel ✅
**Geändert (nur 2 Dateien):** `public/assets/css/dm.css` (Modal-/Left-/geteilte Primitive-Regeln
+ neue Modifier; Braces **511/511**, Kommentare **87/87**; Cache-Bust `?v=6`→`?v=7`), `public/dm.html`
(`renderModalHeader` + `buildLeftPanelHtml`-Markup + Farb-Literale in `setupLeftPanel`/`renderLeftCashLog`).
**Nur CSS + Markup/Inline-Token-Swaps — keine JS-Logik/IDs/`data-*`/Events/Handler/Berechnungen.**

**A) Foundation:** Box `min(960px)`→`min(1100px,96vw)`; Left-Rail `200px`→`260px` (padding `--sp-4`).
Geteilte Primitive konservativ global: `.ctrl-row` **bleibt FLEX** (nur `--sp-2` gap/margin),
`.ctrl-label` `80px`→`96px` + HUD-Look (uppercase/tracking/fs-xs/muted). Neue **additive Modifier**:
`.ctrl-input--num` (`6ch`, mono, rechtsbündig — ersetzt `max-width:55/60/65/70/80px`),
`.ctrl-input--reason` (eigene Zeile, voll); im Button-System `.ctrl-btn--icon` (icon-sm 30, →44),
`.ctrl-btn--sm` (32), `.ctrl-btn--ghost` (neutral, Hover cyan). Single-source, keine Duplikate.

**B) Header (`renderModalHeader`):** Portrait 52→56px (Token + border), Emoji-Fallback Inline→
`.dm-modal-portrait--empty`; Name `fs-lg`/Sub `fs-xs` muted tracking; `.dm-modal-cash` mono-Readout
+ **`.dm-modal-cash--neg`** (rot bei <0, konditionale Klasse im Template); Player-Link = Ghost-Button;
Close = Icon-Button; Header-Unterkante border + dezenter cyan-Glow (drop-shadow). IDs/Handler
(`dmModalClose`, Overlay-Click) unverändert.

**C) Left-Panel (`buildLeftPanelHtml`):** Alle Inline-Styles raus → Klassen, `--sp`-Rhythmus
(Sektion `--sp-5`). HP-Bar 5→6px Token (Live-Update-Klassen `.dm-left-hp-fill/-label` erhalten);
**Rüstung SP** (größter Inline-Sünder) auf Zeilen-Pattern `.ctrl-sp-slot`/`.ctrl-input--num`/
`.ctrl-sp-max`/↵(`.ctrl-btn--icon`)/↺(`.ctrl-btn--icon.ctrl-btn--ghost`, Label „↺ Reset"→„↺"+title);
IP-/Cash-Kopfwerte → `.ctrl-head-val`; Cash-Grund eigene Zeile (`.ctrl-input--reason`), Log
`.dm-left-cashlog`, `−eb`→`.dm-left-ip-btn--sub`. `.dm-left-ip-btn` (IP+Cash geteilt) auf Chip-
Rezeptur (cyan-Ghost). `.cond-toggle-btn` (aktiv=`neon-red`, →44 @coarse) + `.ctrl-buff-*` token.
**Token-Migration** wie 5a (HUD-Set; `--font-display` bleibt). JS-Literale→Token (verhaltensgleich):
`#FFD600`→`--warning-yellow` (HP-Mid, build + save-Handler), `#2ecc71`→`--success-green`,
`#555`→`--text-dim`, `var(--cyan/red)`→`var(--neon-cyan/red)`.

**Gescopt/unangetastet (5b-2/5b-3):** `.dm-modal-tabs`/`.dm-tab-btn`/`.dm-modal-body`-Inhalt,
`.ctrl-section(-head)` (geteilt mit Mehr/Rollen), `.ctrl-inj-*`, `.buff-preset*`/`.buff-add-form`,
`.dm-stats/res/skill/inv-*`, `buildStats/Skills/Inventory/ControlsHtml`, `buildRoleAbilityDataSection`,
NPC-Quick-Feinschliff. Tab-Leiste/Body bleiben im Alt-Look (funktional).

**Verifiziert:** dm.css Braces 511/511 + Kommentare 87/87 (keine `*/`-Glob-Falle); beide Inline-
Module `node --check` sauber; `git status` = nur `dm.html`+`dm.css`; **alle 31 JS-Hooks**
(IDs/`data-*`/Live-Klassen) im neuen Markup vorhanden + **alle 11 neuen CSS-Klassen** definiert;
keine Alt-Hardcodes/Inline-Magic mehr in der 5b-1-Zone. **Offen:** manueller Browser-Durchklick
(kein Browser/Supabase-Char in der Session) — HP/SP/IP/Cash/Conditions/Buffs-Interaktion, Close,
und Gegenprüfung Combat-Setup/NPC-Quick/Timer/Items (geteilte `.ctrl-row`/`.ctrl-label`).

### Phase 5b-2 — Kontroll-Modal: Body-Tabs (Stats/Skills/Inventar + „Mehr"-Karten-Grid) ✅
**Geändert (nur 2 Dateien):** `public/assets/css/dm.css` (Tab-Leiste/Stats/Skills/Inv/`.ctrl-section`-
Cards/`.ctrl-inj-*`/Buff-Preset+Add-Form/Responsive + 7 neue Klassen; Braces **522/522**, Kommentare
**96/96**; keine `*/`-Glob-Falle), `public/dm.html` (`buildControlsHtml`-Return komplett neu:
Karten-Grid-Wrapper + gründliche Inline-Bereinigung; Cache-Bust `?v=7`→`?v=8`; Inline-Literal-Swaps
in `buildStatsHtml`/`buildSkills/InventoryHtml` + Injury-Live-Re-render). **Nur CSS + Markup/Inline-
Token-Swaps — keine JS-Logik/IDs/`data-*`/Events/Handler/Berechnungen.**

**A) Tab-Leiste:** `.dm-modal-tabs`/`.dm-tab-btn` HUD-Tokens (uppercase+tracking, `--fs-sm`,
aktiv = `--neon-cyan` Underline+Text + Underline-Glow via `drop-shadow`, Hover-Glow); Font-family
`--font-body` bleibt. `.dm-modal-body`-Padding → `var(--sp-5)` (alle 4 Tabs). Tab-Switch-Logik unverändert.
**B) Stats:** `.dm-stats-grid` 5 Spalten bleibt; Zellen Token-Swap (`--bg-panel-soft`/`--border-dark`);
`.dm-stat-val` `--font-display`→**`--font-mono`** + `--fs-lg`/`--neon-cyan`; `.dm-res-*` analog
(`--text-main`, mono). Death-Save-Inline `var(--red)`→`var(--neon-red)` (`#FF8C42` DSP-Orange bleibt).
**C) Skills/Inventar:** `.dm-skill-head`/`.dm-inv-head` = 5a-HUD-Head (cyan uppercase tracking,
`--border-dark`); Rows `--fs-sm`/`--text-main`, Werte `--font-mono`/`--neon-cyan`; Empty-States →
neue Klasse `.dm-tab-empty`.
**D) „Mehr"-Karten-Grid:** Body-Inhalt in **`.ctrl-card-grid`** (`repeat(auto-fit,minmax(300px,1fr))`,
gap `--sp-5`; @≤800px → 1 Spalte). Jede `.ctrl-section` = **Control-Card** (echte Border `--border-dark`,
`--radius`, padding `--sp-4`, **kein clip** — Gotcha #2/#4; `margin-bottom` raus = Grid-gap).
`.ctrl-section-head` → HUD-Head (cyan, geteilt → upgradet Left-Panel-Heads mit). **Volle Breite
(`.ctrl-section--full` = `grid-column:1/-1`):** Buffs/Pharma + Rollen-Specialty. Rollen-Section nur
**als Karte platziert** (Wrapper `<div class="ctrl-section--full">${buildRoleAbilityDataSection}</div>`),
**Innenleben unverändert** (= 5b-3, Alt-Look erlaubt). `.ctrl-inj-*` Token+`--bg-panel`-Nest;
`.buff-preset-btn` → Chip-Rezeptur wie `.dm-left-ip-btn` (cyan-Ghost, hover Glow); `.buff-add-form`
Token. **Gründliche Inline-Bereinigung** in buildControlsHtml: Cash-Head-Span → `.ctrl-head-val`
+ neue `.ctrl-head-val--neg` (Rot-bei-<0 erhalten), `#ctrlCashAmt`→`.ctrl-input--num` (10ch),
`#ctrlCashReason`→`.ctrl-input--reason`, `#ctrlCashLog`→`.dm-left-cashlog`, Injury-Empty→`.dm-left-empty`,
Buff-Form: `--num`-Inputs, neue `.ctrl-hint` (Hint-Spans), `.ctrl-textarea`, `.ctrl-select--sm`;
`style="display:none"`-State-Hooks bleiben.

**Neue CSS-Klassen (7):** `.ctrl-card-grid`, `.ctrl-section--full`, `.ctrl-head-val--neg`,
`.ctrl-select--sm`, `.ctrl-hint`, `.ctrl-textarea`, `.dm-tab-empty`.
**Verifiziert:** dm.css Braces 522/522 + Kommentare 96/96 (kein `*/`-Glob); alle 4 Inline-Script-Blöcke
`node --check` sauber; `git status` = nur `dm.html`+`dm.css`; **alle 34 Mehr-Tab-Control-IDs**
(Cash/Rank/Rep/Hum/Inj/Buff/NPC/Item) exakt 1× im neuen Markup; div-Balance Return 45/45;
keine Alt-Token/Inline-Magic mehr in Stats/Skills/Inv + buildControlsHtml-Eigensektionen (Rollen-
Section bewusst noch Alt-Inline → 5b-3). **Offen:** manueller Browser-Durchklick (kein Browser/Supabase-
Char in der Session) — Tab-Wechsel, 2-Spalten-Grid @≥1100px, Role+Buffs volle Breite, alle Mehr-
Controls + Cash-Dublette funktional; Rollen-Specialty-Innenleben + NPC-Quick-Feinschliff = **5b-3**.

### Phase 5b-3 — Rollen-Specialty-UIs + NPC-Quick + Modal-Final-Verify ✅ — Modal komplett
**Geändert (nur 2 Dateien):** `public/assets/css/dm.css` (8 neue additive, modal-scopte Klassen
+ NPC-Quick-Box/-Head + `.npc-dmg-preview` Token-Migration; Braces **533/533**; keine `*/`-Glob-Falle),
`public/dm.html` (`buildRoleAbilityDataSection` 5 Rollen-Templates + NPC-Quick-Markup; Cache-Bust
`?v=8`→`?v=9`). **Nur CSS + Markup/Inline-Token-Swaps — `setupRoleAbilityDataControls` + NPC-Quick-
Handler (IDs/`data-*`/Events/Berechnungen: Allokations-Cap, Loyalty, Lawman-Query, HP-Patch)
unverändert.**

**Gemeinsame Specialty-Card-Sprache (Konzept §5)** — alle 5 Rollen lesen jetzt als eine Familie,
gleiches Skelett, Body je Archetyp; Cap/Count-Badge **rechts im Head** (folgt §5-Mockups, statt
§5-Prosa „Footer"):
- **Allokation (Medtech/Tech):** Head `.ctrl-spec-head` + `.ctrl-spec-badge` `Σ {used} / {cap}`;
  `used` = Summe der **gespeicherten** Punkte am Render-Zeitpunkt (User-Entscheid: **statisch**,
  kein Live-Listener → strikt „null Funktionsänderung", wie der Exec-Zähler). Cap Medtech `rank`,
  Tech `rank*2`. Inline `max-width:65px` → `.ctrl-input--num` (3 bzw. 4 Inputs); Speichern → `.ctrl-btn--sm`
  im rechtsbündigen `.ctrl-spec-foot`. `max="5"`/`max="${rank}"` bleiben.
- **Sammlung (Nomad/Exec):** Nomad-Pool als `.ctrl-chip-list`/`.ctrl-chip` (Inline-Pool-Zeile raus),
  leerer Pool → `.ctrl-hint`; Badge `pool/available`. Exec-Member als `.ctrl-spec-list`/`.ctrl-spec-row`
  (`[Name] · [Loyalty]`), Count-Badge `{n} / {maxM}` im Head; Loyalty-Input → `.ctrl-input--num`;
  alle Hinweistexte → `.ctrl-hint`; Add-Buttons → `.ctrl-btn--sm`.
- **Query (Lawman):** Button → `.ctrl-btn--sm`; Result-Container → `.ctrl-result` (+ `:empty{display:none}`,
  damit kein leerer Rahmen vor dem Klick); Handler füllt dasselbe `innerHTML`.

**NPC-Quick-Modal angeglichen (§6/§7):** Inline-Styles raus → `#dmNpcQuickTotal` `.ctrl-readout`
(Farbe `--text-head`→`--text-main`, Schrift `--font-display` bleibt), `#dmNpcQuickSp` `.ctrl-input--num`,
Action-Row → `.ctrl-spec-foot`, Cancel → `.ctrl-btn--sm`, Apply Inline `color:var(--red)` →
`.ctrl-btn-red .ctrl-btn--sm` (System-Rot-Variante). Box/Head Token-Migration (`--bg-card`→`--bg-panel`,
`--border`→`--border-dark`, Head jetzt cyan/uppercase/`--tracking`/`--fs-xs`, Spacing `--sp-*`).

**Neue CSS-Klassen (8):** `.ctrl-spec-head`, `.ctrl-spec-badge`, `.ctrl-spec-list`, `.ctrl-spec-row`,
`.ctrl-chip-list`, `.ctrl-chip`, `.ctrl-spec-foot`, `.ctrl-result` (+ `.ctrl-readout`). Globales
`.ctrl-section(-head)`/`.ctrl-row`/`.ctrl-label`/`.ctrl-input`/`.ctrl-select`/`.ctrl-btn` **unangetastet**.

**Modal-Final-Verify:** Heads aller Kontroll-Modal-Sektionen = `.ctrl-section-head` (cyan HUD);
Modal-Buttons sm; Karten echte Border/kein clip; msg/result einheitlich. Verbliebene Inline-Overrides
gehören durchweg zu **out-of-scope-Subsystemen** (Combat-Setup/Timer/Room/Combat-Session/Items = 5c,
Injury-Picker) — bewusst **nicht** angefasst.
**Verifiziert:** dm.css Braces 533/533, kein `*/`-Glob; alle 4 Inline-Script-Blöcke `node --check`
sauber (großer 132K-Block OK); alle Rollen-IDs (`ctrlMed*`/`ctrlTechSpec_*`/`ctrlNomad*`/`ctrlExec*`/
`ctrlLawman*`) + NPC-Quick-IDs erhalten; `git status` = nur `dm.html`+`dm.css`. **Offen:** manueller
Browser-Durchklick je Rollentyp (kein Browser/Supabase-Char in der Session). **→ Kontroll-Modal damit
KOMPLETT (5b fertig).**

---

## Phase 5c — dm.html: Combat-Tracker + Timer + Items + Raum ✅
**Geändert (nur 2 Dateien + LOG):** `public/assets/css/dm.css` (4 Subsystem-Zonen Tokens→HUD +
neue/dedizierte Klassen; Braces **576/576**, Kommentare **115/115**; keine `*/`-Glob-Falle),
`public/dm.html` (Markup-/Render-Inline-Bereinigung in den 4 Subsystemen + 1 Timer-Pause-Label-Zeile;
Cache-Bust `?v=9`→`?v=10`). **Nur CSS + Markup/Inline-Token-Swaps — keine JS-Logik/IDs/`data-*`/Events/
Handler/Berechnungen** (Ausnahme: Pause-Button-Label `textContent`→`innerHTML` für den Icon-Swap,
Zustandslogik identisch — dokumentiertes Emoji→SVG-Muster).

**User-Entscheidungen (2026-06-09):** (1) Raum-Vollansicht-Overlay (#dmRoomOverlay) **mitgenommen**
(dedizierte `.dm-room-overlay-*`); (2) Timer-Buttons **auf SVG-Icons** (ic-play/ic-pause/ic-stop).

**A) Combat-Setup-Panel + Initiative:** `.combat-setup-*`/`.combat-init-*` Tokens→HUD (Spalten-Heads
jetzt cyan); neue Klassen `.combat-name-row`, `.combat-setup-head--temp`, `.combat-setup-group`
(group_color als Daten inline erhalten), `.combat-init-name`. `#combatStartBtn`→`.combat-start-btn`
(Button-System lg44 primary, `margin-left:auto`); `#npcCombatHp`/Init-Input→`.ctrl-input--num`;
`+`/Roll-Init→`.ctrl-btn--icon`. **`.ctrl-row` Zeile 66 bleibt FLEX** (label-los). Inline raus
(54/55/65/66/68/80 + Render 3054/3055/1182/1193).

**B) Combat-Bars:** `.combat-bar`-Block + `.combat-npc-hp-*` Tokens→HUD; Combat-Bar bekommt
**echte Border + box-shadow (kein clip, Gotcha #2)** mit rotem Combat-Akzent. `cbt-Buttons`:
Next→`.ctrl-btn--sm`, ⚙→`.ctrl-btn--icon`, ✕Ende→`ctrl-btn-red .ctrl-btn--sm`; **Inline-font-size
entfernt** (2955/2956 + 2947). `combat-char-hp` Live-Farbe (hpColor) **in-place** (Gotcha #4).

**C) Session-Timer:** Bar+Modal Tokens→HUD (Audiowide bleibt — Phase 11). **`.timer-progress-wrap`/
`.timer-progress-fill` neu definiert** (waren undefiniert = unsichtbarer Balken; `style.width` bleibt
JS-getrieben, Gotcha #4). Modal-Inline→Klassen (`.dm-modal-box--narrow`, `.timer-modal-body`,
`.timer-num`, repurposed `.timer-ctrl-row`, `.dm-bar-btn`). `.timer-quick-btn` auf Preset-Chip-Rezeptur
(cyan-Ghost, wie `.buff-preset-btn`). **SVG-Icons:** Start→ic-play, Stop+Bar-Stop→ic-stop, Pause→
ic-pause/ic-play (Label-Zeile `updateDmTimer` `textContent`→`innerHTML`); 🔄 „Neu starten" + ⚙ Bar
behalten Glyph (kein Media-Icon-Äquivalent). **Dead Legacy entfernt:** `.dm-timer-section`/
`.dm-timer-config` (nirgends referenziert). Timer-Logik (Start/Pause/Stop/Restart/tick/saveTimer)
unverändert.

**D) Items-Modal:** komplett inline-gestyltes Overlay → dedizierte `.dm-items-*`-Klassen + Tokens
(Overlay z-3000/top-aligned exakt erhalten, `[hidden]`-Pattern). Such-/Filter-Selects auf `.ctrl-input`/
`.ctrl-select`+Modifier, Close→`.dm-modal-close`, Ammo-Strip→`.dm-items-ammo*`, `btn btn-primary`
Geben→`.ctrl-btn .ctrl-btn--sm`, Grid→`.dm-items-grid`. `renderDmItemsGrid`-Karten→`.dm-item-*`;
**Grant-JS-Feedback (textContent/style.background) unverändert**. `.item-search-*` (Kontroll-Modal-
Item-Suche) + `.npc-result`/`.npc-roll-*`/`.npc-crit-hint` (NPC-Angriffswurf, aus 5b-3 verschoben)
Tokens→HUD.

**E) Raum/Umgebung:** Leiste Rest-Inline raus (⛶→`.ctrl-btn--icon .dm-room-expand-btn`, ↵→
`.ctrl-btn--icon`, +Legen→`.ctrl-btn--sm`, Raum-leeren→`.dm-room-clear`). Raum-Overlay → dedizierte
`.dm-room-overlay-*` (Tokens, echte Border, `[hidden]`-Pattern); `renderRoomOverlay`-Reihen-Inline
entfernt (stützt sich auf gestyltes `.dm-room-item-row`). Injury-Picker (`showInjuryPicker`/
`showInjuryResult` in `#ctrlInjMsg`) → `.ctrl-inj-pick*`/`.ctrl-inj-result*` (Tokens, Buttons aufs
System). Empty-States → `.dm-tab-empty`. Alle Pickup-/Clear-/Expand-/Injury-Handler + IDs unverändert.

**Verifiziert:** dm.css Braces 576/576 + Kommentare 115/115 (kein `*/`-Glob); alle 4 Inline-Script-
Blöcke `node --check` sauber; `git status` = nur `dm.html`+`dm.css`+LOG; **43 neue CSS-Klassen alle
definiert + im Markup genutzt**; alle 5c-JS-Hook-IDs (combat/cbt/dmTimer/dmBar/timer/dmItems/dmAmmo/
dmRoom/inj) exakt 1× erhalten; `data-*` (cbt-checks/grant/del-room/quick-sec) intakt; ic-play/ic-pause/
ic-stop resolven im Sprite; keine Alt-Tokens/Inline-Magic mehr in den 5c-Zonen (Reste nur in
out-of-scope pin/dice/3D-overlay/notes-box/dead-npc-card/@800-sidebar/`.bm-*` = 5d). **Offen:**
manueller Browser-Durchklick (kein Browser/Supabase-Char in der Session): Combat Setup→Start→Next→⚙→
Ende + Bars/Order/Remove/NPC-HP±; Timer Start/Pause/Fortsetzen/Stop/Neu starten + Bar + Progress;
Items Suche/Filter/Char/Geben/Ammo; Raum Legen/Leeren/⛶-Overlay/Live-Sync; Injury Head/Body/Reroll/
Apply/Back/Cancel. **→ Nur noch 5d Schwarzmarkt offen für dm.html.**

---

## Phase 5d — dm.html: Schwarzmarkt (Reskin + Relayout) ✅ — dm.html KOMPLETT
**Geändert (nur 2 Dateien + LOG):** `public/assets/css/dm.css` (`.bm-*`-Block ~1087–1272 komplett
auf HUD-Tokens; Braces **576/576**, Kommentare **118/118** — +3 Kommentar-Paare, keine `*/`-Glob-Falle),
`public/dm.html` (5 reine Markup-Zeilen im Schwarzmarkt-Panel + Cache-Bust `?v=10`→`?v=11`).
**Null `<script>`-Edit** — Daten/Events/IDs/Inline-onclick/`blackmarket_state`-Realtime/Supabase
byte-identisch. Schwarzmarkt bleibt **rot/illegal** (MASTER-Farblogik); Inputs neutral-cyan
(dm-Präzedenz wie Combat-Setup). Schrift Audiowide bleibt (Phase 11).

**User-Entscheidung (2026-06-10):** Header 🚪→`ic-blackmarket` (matcht Nav-Trigger), Close-All
🔒→`ic-lock`. Öffnen-Button behält 🚪 (sein `textContent` wird von `bmActivate` neu geschrieben →
SVG würde zerstört), 📤 ohne Icon-Äquivalent, Hebel-Status 🔓/🔒 JS-generiert → bleiben Emoji.

**A) Panel-Chrome:** `.bm-dm-panel` → `--bg-panel`, Border `--red-soft`, `--radius`, **echte Border
+ `box-shadow:var(--glow-red-m)` (kein clip, Gotcha #2** — wie `.combat-bar`); Padding `--sp-5`.
`.bm-dm-header` → `--neon-red`, Unterkante `--border-dark` + roter Drop-Shadow (gespiegelt von
`.dm-modal-header`), `--sp`-Rhythmus, `.ic`-Sizing für das neue Header-SVG; Close = `.dm-modal-close`
unangetastet. `.bm-step(-title/-sub)` Token-Migration (Divider `--border-dark`, `--fs-xs`, `--tracking`).

**B) Step 1 (Spieler/Tür):** `.bm-player-check` = Chip (`--border-dark`/`--radius`/`--sp`); Hover/
`.selected` → `--neon-red` + `--bg-panel-red` + `--text-main`. **Native Checkbox visuell entfernt**
(`position:absolute;opacity:0` — MASTER: native Inputs = Bugs); `<input>` bleibt im DOM (label-
gewrappt) → `bmTogglePlayer(this)`/`cb.checked`/`cb.closest('.bm-player-check')` unberührt, roter
Chip = selected. `.bm-door-card` → **echte Border (kein clip)**, `.selected` `--neon-red` +
`var(--glow-red-s)`; **Tür-`<img>` + Pfade (`door{1,2,3}_close.jpg`) UNANGETASTET**; Label Token.

**C) Step 2/3 (Steuern/Angebot):** `.bm-lever`/`-wrap` Token (`--bg-panel-soft`/`--border-dark`,
Thumb `--text-dim`; `.open` → `--neon-red`/roter Track; translateX-Mechanik unverändert). `.bm-input`
spiegelt `.ctrl-input` (`--bg-panel-soft`/`--border-dark`/`--radius`/`--sp`, Focus `--neon-cyan` +
`--glow-cyan-s`), bleibt aber Full-Width-stacked (eigene Klasse). Aktions-Buttons **aufs Button-
System gefaltet** via Markup `class="ctrl-btn ctrl-btn-red bm-action-btn"` (Öffnen/📤) — CSS hält nur
noch `width:100%`+`margin`.

**D) Step 4/Schließen:** `.bm-status-row`/`.bm-status-badge` Token (waiting `--text-dim`, accepted
`--success-green`, declined `--neon-red`, neg `--warning-yellow`) — re-rendert in-place via
`bmRefreshStatus`-innerHTML (Gotcha #4), Klassen only. `.bm-neg-accept/-decline-btn` bleiben kompakte
Inline-Pills (liegen in JS-Template-Strings → **JS nicht angefasst**), nur Token-Migration in CSS
(grün/rot). `.bm-close-all-btn` = `ctrl-btn ctrl-btn-red` (rot/combat) + `ic-lock`, Full-Width via CSS.

**Verifiziert:** dm.css Braces 576/576 + Kommentare 118/118 (kein `*/`-Glob); BM-`<script>`-Block
(3458–3698) `node --check` sauber; alle 12 `bm*`-Funktionen + alle 6 statischen Inline-onclick
(`bmSelectDoor(1/2/3)`/`bmActivate`/`bmSendOffer`/`bmCloseAll`) + alle 15 `bm*`-IDs + 3 Tür-Bildpfade
erhalten; keine Alt-Literale (`#0d0d0d`/`#222`/`#555`/`#1a0000`/`rgba(255,45,45…)`/`8px`/`6px`/`4px`/
`var(--red/border/bg-input)`) mehr im `.bm-*`-Block; `git status` = nur `dm.html`+`dm.css`+LOG.
**Offen:** manueller Browser-Durchklick (kein Browser/Supabase-Char in der Session): Schwarzmarkt
öffnen → Spieler(roter Chip)+Tür(roter Glow, Bild intakt) wählen → Öffnen → Hebel auf/zu → Item+Preis
→ Angebot senden → Status-Badges (+ neg Ann./Abl.) → schließen; **Realtime** (Player accept/decline/
negotiate → DM-Status-Row in-place). **→ dm.html (Phase 5) damit KOMPLETT.**

---

## Phase 6 — shop.html: Night Market (Reskin + Relayout) ✅
**Geändert (nur 2 Dateien + LOG):** `public/assets/css/shop.css` (Voll-Reskin+Relayout, Token-
Migration, Button-System am Dateiende; Braces **141/141**, Kommentare **41/41**, keine `*/`-Glob-
Falle), `public/shop.html` (Head-Ladeordnung, Nav-Markup, 4 Modal-Markups, Render-Funktions-Inline-
Token/Emoji-Swaps; Cache-Bust `shop.css?v=1`). **Keine JS-Logik/IDs/`data-*`/Events/Handler/
Berechnungen geändert.** shop.css ist **shop-only** → kein Cross-Page-Bleed (`.role-badge` lebt auch
in player.css, aber die Dateien co-laden nie).

**User-Entscheidungen (2026-06-10):** (1) Karten **in-place reskinnen** statt `<item-card>`/
`<cyberware-card>` (Komponenten sind reine Statik, `this.className='card'`-Falle, kein Gating/
Badge/Klick→Detail; Gotcha #4 + dm-Shop-Grid-Präzedenz); (2) Kategorie-Filter **linke Leiste als
HUD-Chips** (Master-Detail-Layout bleibt). Plan-Entscheidungen: Nav = thin top bar in-place (kein
Sidebar-Umbau — Phase-2-Scope); **kein globaler Content-Cap** (Full-Height-Master-Detail-Konsole
wie dm.html, Dichte via Grid-`auto-fill minmax`-Cap).

**Ausgangslage (Bestandsaufnahme):** shop.html lud als einzige große Seite **nur** base.css+shop.css
(faktisch pre-redesign). → Fundament `cyberpunk-ui.css → cyber-components.css → base.css` vorangestellt
(MASTER §3). **HUD-Tokens DIREKT** verwendet (base.css lädt nach cyberpunk-ui.css → Legacy-Aliase
`--red/--cyan/--bg-card/…` behalten ALTE Werte; Memory-Gotcha + LOG #6). Kein `cyber-components.js` —
Chips via `.cat-btn`-Eigenklasse, keine Custom-Elements → kein neues Verhalten. Scanlines werden NICHT
auto-gemountet (verifiziert) → nichts erscheint ungewollt.

**Render-Funktionen (Fundorte):** `renderNav`/`updateNavDisplay` :405 (Cash-Readout + JS-getriebenes
`#psychosisStatus`-Label = in-place, Gotcha #4), `renderCatButtons` :420 (Chips), `renderGrid` :556
(Subkategorie-Gruppen + `.shop-card` mit Gating), `renderAmmoGrid`/`buildAmmoCard`/`buildAmmoInventoryBar`
:449, `openDetail`/`closeDetail` :630 (`.shop-detail.visible`-Toggle), Kauf-Flow `buyItem`/`buyAmmo`
:863 + 4 Modals (`showBuyConfirmModal`/`showSlotPickerModal`/`showHumanityConfirmModal`/Psychosis).

**Button-System (Variante A, gespiegelt von player/dm, am Dateiende, global shop-lokal):** custom-
property-getrieben (`--btn-*`, `::before`-Border/`::after`-Füllung, clip-sm, `drop-shadow`-Glow,
Komma-Kommentarlisten gegen die `*/`-Falle). **Mapping:** `.buy-btn`=combat **lg44** full-width
(locked `.no-cash/.no-rank/.no-humanity` = rotes Ghost, opacity .75, lesbar — kein :disabled-.4-Dim),
`.override-btn`/`.nav-back-btn`/`.shop-modal-cancel`/`#buyConfirmCancel`/`#humanityModalCancel`=ghost
**sm**, `.ammo-buy-btn`/`#buyConfirmOk`/`#humanityModalConfirm`/`#psychosisModalClose`=combat,
`.slot-btn`/`.slot-pick-btn`=neutral-Toggle (aktiv=cyan) **sm**, `.ammo-qty-btn`=**icon 40×40** (→44
@coarse). Markup: `.ammo-buy-btn` + `#backLink` von base `.btn/.btn-primary/.btn-ghost` befreit
(Handler hängt nur an `.ammo-buy-btn`/`#backLink`).

**Kategorie-Chips (`.cat-btn`):** HUD-Chip-Rezeptur (Rajdhani 600 uppercase tracking, neutral→aktiv=
cyan Fill + linker Akzentstrich + `--glow-cyan-s`); `#catButtons` flex-column. Mobile: horizontale
Chip-Reihe (Border-Bottom-Akzent). Delegierter Klick-Handler unberührt.

**Item-Grid (`renderGrid`):** `.shop-grid` `auto-fill minmax(200px→220px,1fr)` gap `--sp-3` (auto-fill
= keine aufgeblasenen Karten). `.shop-card` echte Border, `--sp-3/4`-Padding, Hover/Active cyan-Glow.
**Alle Gating-Klassen/Markup 1:1 erhalten** (`card-no-cash`/`card-locked`/`slot-full`/`role-highlight`/
`active`/`data-id`/`.lock-icon`/`.role-badge`/Install-+Slot-Badges) — nur Farb-Retoken. **Preis-/
Seltenheits-Farben** (Phase-Ziel): neue `priceTierClass(item)` leitet das CP-RED-Tier rein aus dem
vorhandenen `item.raw_cost` (`"100eb (Premium)"`→`/\(([^)]+)\)/`) ab → `.price-tier-*`-Klassen
(success-green→cyan→warning-yellow→neon-red-Rampe) auf `.shop-card-price`/`.detail-price`. **Keine
Query-/Schema-Änderung**, additive Anzeige. `slotBadge`-Inline → `.slot-badge`. **🔒→`ic-lock`** via
`LOCK_IC`-Konstante (Lock-Icon-Div + alle Buy-Button-Lock-Labels, beide innerHTML).

**Ammo-Grid (`buildAmmoCard`/`buildAmmoInventoryBar`):** `.ammo-*`-Klassen Token-Migration; Inline-
Styles → Klassen (`.ammo-effect`/`.ammo-special-badge`-Margins), dynamische Lager/Affordable-Farben
auf `var(--neon-red/--neon-cyan)` getauscht (Live-Werte inline, Gotcha #4). Qty-±=icon-System,
Buy=combat-System.

**Detail-Panel (`openDetail`):** `.detail-*`/`.df-*`/`.install-badge`/`.humanity-cost-preview`/
`.slot-info` Token-Migration + `--sp`. `.shop-detail.visible`-Toggle unangetastet. Inline raus:
Slot-Label→`.detail-field-label`, Debt-Warn→`.detail-debt-warn` (warning-yellow), Buy-Zone-Wrapper→
`.detail-buy-zone`. Armor-Slot-Picker (`.slot-btn`)/`#buyBtn`/`#overrideBtn` aufs System;
`#buyBtn`/`#overrideBtn`-Listener unberührt.

**4 Modals:** Inline-gestyltete Overlays/Boxen → dedizierte Klassen (HUD-Panel = **echte Border +
box-shadow/Glow, KEIN clip**, Gotcha #2). **Edge-Case gelöst:** die Overlay-Klasse `.shop-modal-overlay`
setzt **KEIN `display`** — Show/Hide bleibt `hidden`-Attr + JS `style.display='flex'`/`''`
(sonst überschriebe ein Klassen-`display:flex` die UA-`[hidden]`-Regel; gleiche Falle wie
`.cyber-nav-item[hidden]`). Psychosis-Overlay `--top` (z-index +1, ersetzt das alte 10000).
`slotModalBtns`-Buttons (JS-Template) → `.slot-pick-btn`; `data-slot`+`btnsEl.onclick`-Delegation
bleibt. `.psychosis-title`-Animation unverändert. Buy-Confirm-/Humanity-Inhalte → Klassen bzw.
dynamische Token-Inline.

**Emoji:** **🔒→ic-lock** (einziger eindeutiger Sprite-Treffer). Bewusst belassen (kein Sprite-
Äquivalent): ⚠ (Warn/Hospital/EMP), ⭐ (Role-Badge), 💀/🔴/🟠/⚠ (`getCyberpsychosisStatus`-Status-
Labels, JS-getrieben), ✓ („gekauft"), − / + (Ammo-Qty).

**Verifiziert:** shop.css Braces 141/141 + Kommentare 41/41 (kein `*/`-Glob); shop.html-Inline-Modul
`node --check` sauber; `git status` = nur `shop.html`+`shop.css`(+LOG); **alle 23 JS-Hook-IDs** +
`data-cat/id/slot/ammo-id` + Gating-Klassen + `.visible`-Toggle + alle **8 Modal-`style.display`-
Toggles** erhalten; keine Legacy-`var(--…)`/Hardcode-Hex mehr (außer den 5 JS-getriebenen
`getCyberpsychosisStatus`-Status-Hex, Gotcha #4); `ic-lock` resolved im Sprite. **Kauf-Flow +
Preise + Cash-Abzug (`patchCash`/`cash_log`) + Inventar-Übertrag (weapons/armor/cyberware/gear) +
Gating + Cyberpsychose-Modal + Ammo + Realtime funktional IDENTISCH** (nur CSS/Markup/Token/Emoji).
**Offen:** manueller Browser-Durchklick (kein Browser/Supabase-Char in der Session): Kategorie-Chips→
Grid/Detail, normaler Kauf→Confirm→Cash/Log→gekauft, Cyberware→Slot-Picker→Humanity-Modal→0→Psychose,
Foundational/Injury-Block + DM-Override, Armor-Slot-Routing, Ammo ±/Kauf, Realtime-Cash/Injury.

---

## Phase 7 — Map / Locations (`map.html`) ✅
**Geändert:** `public/assets/css/map.css`, `public/assets/css/map-weapons.css`, `public/map.html`
(NICHT `topbar.css` — die geteilte `gt-topbar` via `topbar.js mountTopbar` injiziert, Phase 2 schon
migriert, out of scope). **Canvas/Token-Rendering TABU** — diff berührt keine `ctx.`/`resizeCanvas`/
`requestAnimationFrame`/`S.ox/oy/scale`/`markDirty`/Hit-Test-Zeile; Canvas-Wrap-Geometrie +
Sidebar-Breiten (280/260) + FAB-Position (`left:296px`) unverändert.

**Wichtiger Befund:** map.html lud cyberpunk-ui.css **bereits** (Phase 2, nicht wie Prompt-Text
„lädt aktuell NICHT") → Tokens schon verfügbar; nur Werte-Migration nötig. base.css überschreibt
Legacy-Aliase auf ALTE Werte (LOG #6) → durchgehend **neue Tokens direkt** verwendet.

**Stufe 2 (map.css Token-Migration):** alle Legacy-`var(--bg/--bg-card/--bg-input/--border/--cyan/
--red/--text/--text-head/--transition)` → neue Tokens (`--transition`→`var(--t-fast) var(--ease)`);
Brand-/Struktur-Hex in `.combat-card`, `.dv-live`, `.range-info-box`, `.measure-live`, `.map-canvas-wrap`-
Background, `npcBackGlow` → Tokens. **Bewusst belassen** (semantische Effektfarben, decken sich mit
JS-Paletten AOE_EFFECTS/COND_C): Fire-Oranges (`fire-flicker`), `#FF8C00` (Injury), `#FFA000` (Cover-Badge).

**Stufe 3 (Button-System gespiegelt):** map lädt **kein** player/dm.css → das globale 5a-`.ctrl-btn`
ist hier inaktiv → eigene Kopie des cyber-button-Systems in map.css (custom-property-getrieben
`--btn-border/-fill/-fill-hover/-color/-glow/-h/-px/-fs`, Border via `::before`, Füllung `::after`,
Glow `filter:drop-shadow`, `clip-sm`, `isolation:isolate`, Gotcha #2). Default md36, Modifier
`--sm`/`--icon` (→44 `@pointer:coarse`), **Variante `.ctrl-btn.red`** (map nutzt diese Schreibweise,
nicht `.ctrl-btn-red`). Effekt-Varianten `.ctrl-btn--ghost/--orange/--ember/--flame/--purple`
ersetzen die Inline-`border-color/color`-Buttons (Fire/Grapple/Explosion/Dodge) — Border kommt aus
`::before`, daher MUSS Farbe via `--btn-*` statt `border-color` (sonst cyan-Border + Fremdfarb-Text).
`.ts-btn`/`.add-token-btn`/`.map-topbar-btn`/`.map-die-btn`/`.atk-btn` bleiben leichte Kompakt-Buttons
(Token-migriert, kein clip). **FAB52:** `.map-dice-fab` 50→52px + `--neon-red`/neue Glow-rgba,
Position `left:296px` bleibt.

**Stufe 4 (voll-inline Modals → HUD-Klassen):** neue Klassen `.map-overlay`(`--col`)/`.map-modal-box`
(`--red/--cyan/--wide`)/`.map-modal-title`/`-text`/`-label`/`-actions`/`.map-field`/`.map-popup`
(`--fire`)/`.map-death-banner`/`.atk-dice-label`/`.map-rr-*`. Umgestellt: `#mapConfirmModal`,
`#mapInputModal`, `#dmRollModal`, `#rollRequestModal`, `#atkDiceOverlay`, `#aoeHoverPopup`,
`#fogHoverPopup`, `#deathBanner`. **Display-Falle (wie Shop):** `.map-overlay` setzt **KEIN
`display`** → Show/Hide bleibt JS `style.display='flex'/'block'/'none'` (Inline `display:none`
Initial-State + abweichende `z-index`/Dim-Backgrounds inline erhalten). Echte Border + box-shadow
(kein clip) wo Glow/Puls (Gotcha #2).

**Stufe 5 (token-modal-Buttons + JS-Chrome + Emoji):** Fire-/Grapple-/Ram-/AoE-Apply-/Dodge-Buttons
auf Varianten-Klassen (`fire-tier-btn`/`grapple-action-btn` + `data-tier`/`data-action`-Hooks
**erhalten**); alle Inline-Legacy-`var(--cyan/--red/--border)` + alt-Brand-rgba in map.html → neue
Tokens/rgba. **Emoji konservativ:** 📌→`ic-pin` (measure), 👁→`ic-eye` / ✏→`ic-edit` (Fog-Hover-
Buttons); vorhandene ic-dice/ic-reload/ic-autofire bleiben. **Bewusst belassen:** DM-Tool-Listen-
Emoji-Set (🖱📏⭕🧱🔫✏️▭○🌑🗑🧹, kohärent), Context-Menü-Labels, 🎮/✕ (Token-Liste), 🔥/⛓/💥/☠ etc.
**Canvas-Paint-Hex (`ctx.fillStyle` Zonen/Conditions/Token-Farben) + Player-Panel-Live-Farben
(HP/Armor, decken sich mit Canvas) NICHT angefasst** (TABU + Gotcha #4).

**Stufe 6 (Feinschliff):** Rest-Struktur-Hex in statischem Markup (`#combatBar`, `cvImage`-File-Input)
→ Tokens; neue Klassen nutzen `--sp`-Skala; Button-Höhen über System einheitlich; native Selects/
Range haben Token-Border + cyan Accent (volle Select-Pfeil-Stilisierung = Phase 11).

**Verifiziert:** map.css Braces **217/217** + Kommentare **40/40**, map-weapons.css **97/97** + **7/7**
(kein `*/`-Glob); map.html-Inline-Modul `node --check` sauber; `git diff` = nur die 3 Dateien;
**jede entfernte `id=`/`data-*` wieder vorhanden** (comm-Abgleich leer); alle Modal-`style.display`-
Toggles + JS-Hooks (fire-tier/grapple-action/data-tier/data-action) intakt; keine Legacy-`var(--…)`
mehr in map.html/map.css; `.ic` (base.css+cyberpunk-ui.css) + Sprite-IDs `ic-pin/eye/edit` resolved.
Inline-Styles 245→209. **Map-Mechanik (Token setzen/bewegen/Snap, Messen, AoE, Cover, Fog, Würfeln,
Fire/Grapple, Attack-Flow, Realtime) im Code unberührt — nur Chrome-CSS/Markup/Token/Emoji.**
**Offen:** manueller Browser-Durchklick (kein Headless-Browser/Supabase-Auth in der Session) als DM
(`sessionStorage.dm_auth='1'`) + Player (`?id=…`): Konsole sauber, Canvas-Render + Resize, alle
Tools/Modals/FAB/Combat-Bar/Token-Picker/DM-Roll/Player-Attack-Flow/Saved-Maps.

---

## Offene Punkte / To-do bis Ende
- **Phase 8–10** wie Status-Tabelle.
- **Phase 11 Cleanup:** Migrations-Aliase entfernen; `--radius`-Kollision auflösen; Temp-Fonts
  (Audiowide/Inter/Caveat) entfernen, sobald alle 13 Page-CSS migriert sind; optional In-Place-
  Anzeige-Bars auf Components nachziehen; `favicon.ico`; tote Alt-Styles.
- **agent-apps.js / agent-dm.js** (iCHOOM, me-null) — nur defensiv geguardet; tiefere Bereinigung
  optional als eigener Task NACH dem Redesign (out of scope).
