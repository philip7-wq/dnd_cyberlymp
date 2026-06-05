# Phase 4d — Holistischer Layout-Pass `player.html` · LAYOUT-KONZEPT (Etappe 1)

> **Status:** Konzept freigegeben (Nutzer, 2026-06-05). **Kein Code in dieser Etappe.**
> Die Umsetzung (CSS/Markup-Relayout) folgt als eigene Etappe 2.
> Gilt zusammen mit `REDESIGN_MASTER.md` §„Layout & Proportionen" + §2 Tokens + §4 Komponenten,
> `REDESIGN_PHASES.md` Phase 4d und den Querschnitt-Gotchas in `REDESIGN_LOG.md`.

## Kontext & Zielrichtung

`player.html` (4201 Z.) ist nach 4a/4b/4c **farblich** im HUD-Look, aber noch nicht
holistisch proportioniert: Buttons in ~25 Ad-hoc-Größen, hoher/flach gewichteter Header,
seitlich verschwindende Tab-Bar, mehrere native Reste (Distanz-Bar, `<select>`s, Inline-Hex).

**Zielrichtung „Klar & fokussiert":** weniger gleichzeitig, größere/lesbarere Elemente, klare
Hierarchie, kontrollierte Abstände, große Trefferflächen — Cyberpunk-HUD, kein dichtes Gewimmel.

**Button-System Variante A:** gemeinsame CSS-Klassen/Tokens, die `<cyber-button>` visuell
matchen, angewendet auf die **bestehenden** Buttons. **Kein** Element-Austausch — alle
`data-*`/`onclick`/IDs/Handler bleiben, alle interaktiven Elemente bleiben interaktiv.

Token-Referenz (`cyberpunk-ui.css`):
`--sp-1..8 = 4/8/12/16/24/32/48/64px` · `--clip-sm/md/lg = 8/14/18px` ·
`fs-xs/sm/md/lg/xl/2xl = 12/13.6/16/20/25.6/35px` · `--tracking = .12em` ·
Heading=Rajdhani, Mono=Share Tech Mono. `<cyber-button>` = **min-height 44px**, padding
`sp-3 sp-5` (12/24), clip-sm, Rajdhani 600 uppercase fs-sm, Border via `::before` (cyan-soft),
Füllung via `::after` (bg-panel-soft → bg-panel-cyan @hover), Glow via `filter: drop-shadow`.

---

## 0. Globale Normen (alle Tabs)

- **Content-Cap:** Header bleibt full-bleed. **Tab-Panels** zentrierte Spalte:
  `.tab-panel { max-width: 1280px; margin-inline: auto; padding: var(--sp-5) var(--sp-5) var(--sp-8); }`
  (ersetzt heutiges `1.25rem … 7rem`). Cyberware-Skelett darf die 1280px-Spalte voll nutzen.
  (Content-Cap **1280px** — Session-Entscheidung 4d-1, ersetzt das ältere 1100; Header+Tab-Bar+Panels.)
- **Spacing:** Section-Gap `--sp-5` (Gruppen) / `--sp-6` (Tab-Blöcke); Intra `--sp-2`/`--sp-3`.
  Karten-Padding **einheitlich `--sp-4`**. Grid-Gap `--sp-3`.
- **Grids:** überall `repeat(auto-fit, minmax(MIN, 1fr))` mit MIN je Inhaltstyp + MAX-Cap über
  Container-`max-width` — Karten auf breiten Screens **nicht** aufblasen.
- **Hierarchie:** Wert groß (mono, Glow), Label klein Versalien+tracking. Nicht nur Abstand.
- **Bars:** einheitliche Höhe via Token — **8px** Standard (Header-HP 10px, Mikro Mag/SP 6px).
- **Section-Header:** alle Gruppen-Überschriften auf einen `.sec-head`-Look vereinheitlichen
  (Rajdhani 600, fs-xs, tracking, cyan, Border-Bottom `--border-dark`, Margin `var(--sp-5) 0 var(--sp-3)`).
  Ersetzt `.sec-head`/`.weapons-section-head`/`.skill-cat-label`/`.ammo-inventory .section-header`.
- **Responsive:** Karten-Grids → 1 Spalte; Skill-Tabelle → gestapelte Karten; Touch ≥ 44px
  (`@media (pointer: coarse)`).

---

## 1. Dossier-Header — 3-Zonen-HUD-Banner, **HP dominant** (Q2)

IST: `[Portrait 76][Name·Sub·HP·HUM·Luck·Buffs·Effects·Conditions·DeathSave·LongRest][IP·Cash]`
— hohe, flach gewichtete Spalte; HP/HUM gleich groß wie alles andere.

ZIEL:
```
┌───────────────────────────────────────────────────────────────────────┐
│ ┌────┐  VINCENT "GHOST" VANCE  ✎          ┌──── VITALS ────┐            │
│ │PORT│  SOLO · REF 8                       │  HP   18 / 40  │  IP   12   │
│ │ 88 │  ┌─ HP  ████████░░░░  18/40 [−][n][+]   ▓▓▓▓▓▓░░  │  Cash 1.2k │
│ └────┘  └─ HUM ██████████░░  52/60 [−][+]   ┌─ LUCK ●●●○○ 3/5│  📜      │
│         [buffs][effects][conditions]  [☠ DEATH SAVE] [🌙 Long Rest]     │
└───────────────────────────────────────────────────────────────────────┘
```
- **Zone L:** Portrait **88×88** (von 76), clip-Border. Name `fs-xl` Rajdhani 700 rot + Glow
  (`#charName` + `✎` **bleibt editierbar**). Sub `fs-xs` cyan.
- **Zone M (Ressourcen-Strip):** HP-Track **10px** (dominant), HUM-Track **8px**, volle
  Zonenbreite; Label-Spalte fix `34px`. `.res-btn ±`, `.res-cur`, `.res-amount` rechts
  gruppiert — **bleiben interaktiv**. LUCK-Dots eigene Zeile.
- **Zone R (Vitals-Chips):** **HP-Großwert** `fs-xl` mono (Leitwert) + IP-Chip + Cash-Chip
  (`#charIpValue`/`#charCashValue`/`📜 #cashLogBtnHeader` **bleiben**). Clip-Look behalten.
- **Statuszeile** unter den Zonen (volle Breite, `--sp-2`-Gap, sekundär gewichtet):
  Buff/Effect/Condition-Bars + `☠ Death-Save` (Pulse bleibt) + `🌙 Long-Rest`.
- < 720px: Zone R unter Zone M; Portrait 64px. `body.combat-active`-Header-Puls bleibt.

---

## 2. Tab-Bar — **Wrap in 2 Reihen** (Q1)

IST: 11 Tabs + 2 Icon-Buttons (`⚙` Rolle, `📦` Raum), `overflow-x:auto` → hintere Tabs auf
schmalen Screens unsichtbar.

ZIEL: `.tabs { display:flex; flex-wrap:wrap; gap:var(--sp-1); }` — alle Tabs immer sichtbar,
Sticky-Top bleibt. Tab-Button: Höhe **40px**, padding `0 var(--sp-4)`, fs-xs Rajdhani 600
uppercase tracking; **aktiv** = roter Unterstrich 2px + roter Text + Glow (Status-quo-Optik).
`⚙ #roleSettingsBtnTab` + Badges (`#injuryBadge`/`#raumBadge`) bleiben inline am Tab
(Element + Handler bleiben); Inline-Style des `⚙` → Klasse.

---

## 3. Stats-Tab — **größere Tiles** (Q3)

IST: `.stat-grid repeat(5,1fr)` (mobil 3 @420px); `.stat-val` 1.7rem; Dice/Roll 32×22;
`.res-grid repeat(2,1fr)`; Toolbar rechtsbündig.

ZIEL:
- **Stat-Grid:** `repeat(auto-fit, minmax(132px,1fr))`, Gap `--sp-3` → Desktop 5–6, Tablet 4,
  Mobile 3→2. Karten-Padding `--sp-4`.
- **Wert:** `.stat-val` → **`fs-2xl` (35px)** mono cyan + Glow; Key `fs-xs` Versalien tracking.
- **Dice:** `.stat-dice-btn`/`.stat-roll-btn` → **icon-md 36×36**, zentriert unter dem Wert,
  auf Touch immer sichtbar (heute `opacity:.7`). **Bleiben interaktiv.**
- **Ressourcen:** `.res-grid` → `repeat(auto-fit, minmax(150px,1fr))`, gleiche Gaps/Padding.
- **Toolbar:** `.roll-all-btn` (combat-md) + `.stats-edit-btn` (ghost/toggle-md) rechts,
  `--sp-2`-Gap. `stat-val` bleibt `contenteditable` im Edit-Mode.

---

## 4. Skills-Tab — Tabelle + rechter Aktions-Cluster

IST: `.skill-row` Grid `18px 1fr 32px 26px 32px 28px 26px`, fs `.85rem`.

ZIEL:
```
★  Handgun                    REF   2   +9   [⚄ Roll][▲UP]
★  Athletics                  DEX   4   +8   [⚄ Roll][▲UP]
```
- **Grid:** `28px minmax(0,1fr) 40px 40px 44px [Cluster 92px]`
  = ★ | Name | STAT(center,mono,dim) | LVL(right,cyan,mono) | TOTAL(right,mono) | Cluster.
- Aktions-Cluster (`⚄ Roll` sm + `▲ UP` sm) **fix rechts**, nicht über volle Breite gespreizt.
- Zahlen rechtsbündig, `tabular-nums`, mono. Zeilenhöhe min **40px**, dezenter Hover-Background,
  Border-Bottom `--border-dark`. Gruppen-Header `.sec-head`-Look, Margin `--sp-5`.
- Banner (IP/Penalty/Favoriten) als HUD-Streifen oben, `--sp-3`-Gap.
- **Bleibt interaktiv:** `.skill-row .roll-btn`, `.skill-up-btn`, `.skill-fav-btn`.
- Mobile < 560px → Zeile bricht in **gestapelte Karte** (Name / Zahlen-Zeile / Cluster voll).

---

## 5. Weapons / Armor / Cyberware / Gear — einheitliche Karten

Gemeinsame Norm: clip-md (14px) Pseudo-Border, Padding `--sp-4`, Gap `--sp-3`, Titel `fs-md`
Rajdhani 600, Hover-Glow. Button-Cluster eine Reihe, Gap `--sp-2`, Aktions-Buttons **md** (§7).

- **Weapons** (`renderWeapons` :1519): `repeat(auto-fit, minmax(320px,1fr))`. Action-Row:
  Dmg (combat-md, prominentester), Reload (success), Autofire-Toggle (combat-active), Abrüsten
  (ghost), Sell (success), Löschen (danger). Mag-/HP-Bar 6px. Special-Ammo-Block rechts bleibt.
  **Distanz-Bar → §9.**
- **Armor** (`renderArmor` :1837): `.armor-grid` → `repeat(auto-fit, minmax(150px,1fr))`.
  SP-Wert `fs-xl` cyan, `.sp-bar-wrap` 6px. Total-Row combat-rot bleibt. `✕` → danger-icon.
- **Cyberware** (`renderCyberware` :1955): `.cyber-layout 1fr 260px 1fr` (SVG-Skelett mittig)
  bleibt. `.cyber-slot`-Padding → `--sp-3`, HUM-Bar 8px. Buttons → primary/danger-md.
  **SVG-Zonen-Klick bleibt interaktiv.**
- **Gear** (`renderGear` :2068): `.gear-list`, `repeat(auto-fit, minmax(280px,1fr))` o. Liste.
  `#tab-gear .gear-*` → primary/success/danger-md (§7).

---

## 6. Lifepath / Notes / Injuries / Raum / Rolle

- **Lifepath** (`renderLifepath` :2311): `.lp-grid` 2-Spalten Desktop / 1 Mobile; `.lp-key`
  Label-Look vereinheitlicht, `.lp-val` Padding `--sp-3`.
- **Notes** (statisch :253 + `setupNotes` :3676): Textarea volle Breite, min-height 320px,
  Header `.sec-head`. Autosave bleibt.
- **Injuries** (`renderCritInjuries` :3183): gestapelte rote Karten volle Breite, Padding
  `--sp-4`, `✕` (`#tab-injuries .remove-btn`) → danger-icon. Add/Heal bleibt.
- **Raum** (statisch :246 + `renderRaumTab` :2270): Item-Karten-Liste, „Aufheben"
  (`#tab-raum .ctrl-btn`) → primary-md. Claim/Move-Handler bleiben.
- **Rolle** (`#tab-role`, `roles.css` + `mountRoleInterface`): Layout/Radien **nicht** umbauen
  (geteilte roles.css/npc-sheet) — nur Button-Skala über `#tab-role`-Scope an §7 angleichen
  (`.role-roll-btn` combat-md, `.role-save-btn` primary-sm). `--role-accent*` bleibt.

---

## 7. Button-System (Variante A — gemeinsame Klassen, kein Element-Austausch)

**Prinzip:** Eine Basis-Look-Klasse, die `<cyber-button>` visuell matcht (clip-sm, Rajdhani 600
uppercase tracking, Border `::before` / Füllung `::after`, Glow `filter`), wird über die
**bestehenden** Selektoren auf eine feste Größen-/Varianten-Skala abgebildet. Handler bleiben.

### Größenskala (px) — Q4: 38px Desktop / 44px Touch
| Größe | Höhe | Padding (H) | Font | Min-Touch | Einsatz |
|---|---|---|---|---|---|
| **lg** (Primär) | 44 | `sp-5` (24) | fs-sm | 44 | Modal-Primary, Death-Save, Skill-Roll-Modal |
| **md** (Aktion) | 38 | `sp-4` (16) | fs-sm | →44 coarse | Gear/Weapon/Armor/Cyberware-Aktionen, roll-all, ctrl |
| **sm** (Kompakt) | 32 | `sp-3` (12) | fs-xs | →44 coarse | Skill-Roll, Skill-UP, AF-Roll, role-save |
| **icon-md** | 36×36 | — | — | →44 coarse | ⚄ stat-dice/roll, ± res-btn |
| **icon-sm** | 30×30 | — | — | →44 coarse | ✕ remove, ✎ name-edit, ★ fav, 📜 cash, ⓘ info |
| **FAB** | 52 rund | — | — | 52 | dice-fab, chat-toggle (eigenes System, bleibt) |

### Varianten (Farbe via Token)
- **primary/cyan** — Daten/System (cyan-soft Border, neon-cyan Text, Füllung → bg-panel-cyan).
- **combat/red** — Damage/Weapon/Danger (red-soft, neon-red, → bg-panel-red, glow-red).
- **success/green** — Sell/Reload (success-green).
- **ghost** — neutral/Cancel (border-dark, text-muted, Hover→cyan).
- **danger** — Löschen/✕ (red-soft, neon-red, Hover-Füllung bg-panel-red).
- **toggle/active** — gefüllter Akzent (bg=Akzent, Text=bg-main) + Glow (autofire AN, edit AN).

### Mapping-Tabelle (alte Klasse → Variante + Größe)
| Alte Klasse (Scope) | Variante | Größe | Hinweis |
|---|---|---|---|
| `.stat-dice-btn` | primary | icon-md | ⚄, bleibt interaktiv |
| `.stat-roll-btn` | combat | icon-md | per-Stat Roll |
| `.roll-all-btn` | combat | md | Stats-Toolbar |
| `.stats-edit-btn` | ghost → toggle(success) | md | aktiv = grün |
| `.skill-row .roll-btn` | primary | sm | gescopt (Skills) |
| `.skill-up-btn` | primary (subtil) | sm | ▲ UP |
| `.skill-fav-btn` | ghost-icon | icon-sm | ★ aktiv = warn-yellow |
| `.weapon-card .roll-btn` (`.dmg-btn`) | combat | md | Damage prominent |
| `#tab-weapons .gear-action-btn` | primary | md | Aktion |
| `.reload-btn` | success | md | behält `!important`-Override-Logik |
| `.autofire-toggle` / `.active` | combat / toggle | md | AN = gefüllt |
| `.unequip-btn` | ghost | md | Abrüsten |
| `#tab-weapons .gear-sell-btn` | success | md | 💰 |
| `.gear-del-btn`/`.remove-btn` (tab-scoped) | danger | md / icon-sm | ✕ Löschen |
| `#tab-gear .gear-*` | primary/success/danger | md | analog |
| `#tab-cyberware .gear-*` | primary/danger | md | Ausoperieren/Löschen |
| `#tab-armor .remove-btn` | danger | icon-sm | ✕ |
| `#tab-injuries .remove-btn` | danger | icon-sm | ✕ Heal/Remove |
| `#tab-raum .ctrl-btn` (Aufheben) | primary | md |  |
| `#weaponDistMapBtn .ctrl-btn` (Aus Map) | primary | md | + Native-Rest §9 |
| `.res-btn` (± HP/HUM) | icon primary/combat | icon-md | 30→36 |
| `.res-amount` (Input) | cyber-input-mini | 36 h | bleibt `<input>` |
| `.death-save-btn` | combat | lg full-width | Pulse bleibt |
| `#longRestBtn` (`.btn.btn-ghost` inline) | ghost/info | md | Inline-Style → Klasse |
| `#critModalBox/#dmgApplyBox .btn-primary` | combat | lg | bleiben gescopt |
| `…Box .btn-ghost` | ghost | md | Cancel |
| `#skillRollBtn .btn-primary` | primary | lg | Modal |
| `.af-roll-btn` | combat | sm |  |
| `#tab-role .role-roll-btn` | combat | md | über `#tab-role`-Scope |
| `#tab-role .role-save-btn` | primary | sm |  |

**Eigene Subsysteme (NICHT in die Skala zwingen, nur Token-konform):** Dice-Popup
(`.die-btn`/`.dice-custom button`/`.dice-popup-close`), Chat-FABs (`.chat-toggle-btn`/
`.chat-send-btn`), **Black-Market-Popup** (`.bm-btn` — eigene Pergament-Ästhetik, unangetastet),
Timer-Bar.

**Scoping-Pflicht (Gotcha #3):** `.roll-btn`, `.gear-action-btn`, `.remove-btn`, `.ctrl-btn`
sind tab-übergreifend geteilt → weiter über `#tab-*`/Kontext scopen. Globale `.gear-action-btn`-
Basis (combatGrappleBtn), globale `.crit-modal-*`-Basis (`#dmgApplyBox`), `roles.css`,
`npc-sheet.html` **nicht** brechen.

---

## 8. Globale Norm-Tabelle

| Element | Wert |
|---|---|
| Content-max-width (Header/Tab-Bar/Panels) | 1280px, zentriert |
| Tab-Panel-Padding | `var(--sp-5) var(--sp-5) var(--sp-8)` |
| Section-Gap | `--sp-5` (Gruppen) / `--sp-6` (Tab-Blöcke) |
| Intra-Gap | `--sp-2` / `--sp-3` |
| Karten-Padding | `--sp-4` (Inventar) / `--sp-3` (Slots) |
| Grid-Gap | `--sp-3` |
| Stat-Grid min | `minmax(132px,1fr)` |
| Weapons-Grid min | `minmax(320px,1fr)` |
| Gear-Grid min | `minmax(280px,1fr)` |
| Armor/Res-Grid min | `minmax(150px,1fr)` |
| Bar-Höhe | 8px (Header-HP 10px, Mikro 6px) |
| Button-Skala | lg44 / md38 / sm32 / icon-md36 / icon-sm30 |

---

## 9. Ungestylte Native-Reste → ins HUD

1. **Distanz-Bar** (`renderWeapons` :1524-1539): hardcodierte Hex (`#0f0f18`, `#2a2a3a`,
   `#FFD700`, `#FF2D2D`, `#555`) → Tokens; `#weaponDistInput` → `.cyber-input`-Look;
   „📡 Aus Map" (`.ctrl-btn`) → primary-md. Handler bleiben.
2. **`.ctrl-btn` allgemein** (Raum „Aufheben", Weapons „Aus Map") → einheitlich HUD.
3. **Native `<select>`** mit Inline-Hex: `#dmgApplyTarget` (:287), `#critTargetSelect` (:3061),
   `#roleSettingsRole` (:71) → HUD-Select-Look (Tokens; analog dem bereits HUD-konformen
   `.ammo-type-select`). Elemente bleiben `<select>`.
4. **`.res-amount`** (42×20) → cyber-input-mini, 36px Höhe.
5. **Inline-Reste:** `#psychosisLabel` (Audiowide), `#longRestBtn` (Inline Border/Color),
   `⚙ #roleSettingsBtnTab` (Inline-Style), `weaponDistInfo` (#FFD700) → Klassen + Tokens.
6. **Audiowide-Font** (Timer-Bar/psychosisLabel) → Rajdhani (Temp-Font-Cleanup).

---

## Entschiedene Designfragen (Nutzer, 2026-06-05)

- **Q1 Tab-Bar → „Wrap in 2 Reihen".** (§2)
- **Q2 Header → „HP dominant".** (§1)
- **Q3 Stats-Grid → „Größere Tiles".** (§3)
- **Q4 Button-Skala → „38px Desktop / 44px Touch".** (§7)

---

## Leitplanke für die Umsetzungs-Etappe (Etappe 2)

Reines Layout/CSS + erlaubter Markup-Umbau. **Keine** JS-Logik/IDs/Events/Berechnungen ändern;
alle interaktiven Elemente (±, contenteditable, Dice, Selects, alle Buttons mit Handlern)
bleiben als Element erhalten. Geteilte Klassen weiter scopen. Kein neues Farbsystem.
Nach Umsetzung manuell durchklicken (jeder Tab rendert; Würfeln/Skill-Check/Damage/Autofire/
Reload/Equip/Sell/Drop/Injury/Raum/Name-Edit/Stat-Edit/Notes/Realtime identisch);
`npc-sheet.html` + `roles.css` unverändert; `player.css` Braces-Parität; Konsole sauber;
`prefers-reduced-motion` respektiert.
