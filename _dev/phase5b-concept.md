# Phase 5b — DM-Kontroll-Modal `dm.html` · LAYOUT-KONZEPT (Etappe 1)

> **Status:** Konzept freigegeben (Nutzer, 2026-06-09). **Kein Code in dieser Etappe.**
> Die Umsetzung folgt als 3er-Split (5b-1/5b-2/5b-3, siehe unten).
> Gilt zusammen mit `REDESIGN_MASTER.md` §„Layout & Proportionen" + §2 Tokens + §4 Komponenten,
> `REDESIGN_PHASES.md` Phase 5 und den Querschnitt-Gotchas + 5a-Entscheidungen in `REDESIGN_LOG.md`.

## Kontext

Das große Charakter-Kontroll-Modal in `dm.html` (Grid-Klick auf eine Charakterkarte) ist
funktional vollständig, aber visuell noch im **Alt-Look** (5a hat nur Dashboard/Buttons/Inputs
migriert; das Modal-Innere wurde bewusst für 5b zurückgestellt). Es ist das dichteste
Arbeits-Tool der DM-Seite: HP/SP/Conditions/Buffs links, Stats/Skills/Inventar + ein
überladener „Mehr"-Tab mit 8 Kontroll-Sektionen + 5 rollenspezifische Specialty-UIs rechts.

Aktuelle Schwächen (gemessen am MASTER „Layout & Proportionen"):
- **Inline-Styles mit Magic-Numbers überall** (`max-width:55px`, `font-size:.65rem`,
  `padding:.15rem .35rem`, `min-width:42px` …) → uneinheitlich, gequetschte Felder.
- **Spacing ad-hoc in rem** (.4rem/.35rem/.9rem/1.25rem) statt `--sp`-Skala.
- **Alt-Tokens** im ganzen 5b-Bereich (`--bg-card`, `--border`, `--bg-input`, `--text-head`,
  `--text`, `--cyan`, `--red`, `--radius`, `--transition`) — nicht auf HUD-Tokens migriert.
- **„Mehr"-Tab = langer Single-Column-Scroll** aus 8+ Sektionen, keine Gruppierung.
- **5 Rollen-UIs visuell uneinheitlich** (jede Rolle eigenes Ad-hoc-Markup).

Leitplanke: Daten/Events/IDs/Handler/Berechnungen bleiben in der späteren Umsetzung identisch;
Markup darf umgebaut werden; **kein interaktives Element entfernen**; Schrift NICHT migrieren
(Phase 11); kein neues Farbsystem.

---

## 0. Bestandsaufnahme (verifiziert im Code)

**Modal-DOM** (`dm.html:268`): `#dmModal.dm-modal-overlay > #dmModalBox.dm-modal-box`
→ `.dm-modal-header#dmModalHeader` + `.dm-modal-content` { `.dm-modal-left#dmModalLeft` |
`.dm-modal-right` { `.dm-modal-tabs#dmModalTabs` + `.dm-modal-body#dmModalBody` } }.
Box = `min(960px,96vw)`, `max-height:90vh`. Left = **200px fix**. (`dm.css:142–214`)

**Render-Pipeline:** `openCharModal`→`renderModal()` ruft `renderModalHeader/Left/Tabs/Body`
(`dm.html:1636`). Tabs: `stats|skills|inventory|mehr` (`activeModalTab`, `dm.html:1663`).
Body-Switch (`dm.html:1682`): `buildStatsHtml`/`buildSkillsHtml`/`buildInventoryHtml`/
`buildControlsHtml`+`setupControls`. Left: `buildLeftPanelHtml`+`setupLeftPanel` (`dm.html:1698`).

**Left-Panel-Sektionen** (`buildLeftPanelHtml`, `dm.html:1703`): HP (Live-Bar + Input + ↵) ·
Rüstung SP (head/body/shield, je inline-Span + Input + ↵ + ↺ Reset) · IP (Wert + +5/+10/+25/+50)
· Cash (Betrag + Grund + „+ eb"/„− eb") · Conditions (Toggle-Grid) · Aktive Buffs (Liste).

**„Mehr"-Tab** (`buildControlsHtml`, `dm.html:2031`): Cash (Dublette zum Left-Panel) ·
Role Ability Rank · Reputation · Humanity · Critical Injuries · Buffs/Pharma (Preset-Grid +
Add-Form + aktive Liste) · NPC greift an · Custom Item vergeben · + `buildRoleAbilityDataSection`.

**5 Rollen-Specialty-UIs** (`buildRoleAbilityDataSection`, `dm.html:2175`):
Medtech (3 Punkt-Inputs + Speichern), Tech (4 Punkt-Inputs + Speichern),
Nomad (Select + „+ Hinzufügen"), Exec (Member-Liste + Add-Form), Lawman (Button + Result).
→ Zwei Archetypen: **Punkte-Allokation** (Medtech/Tech) und **Sammlung/Query** (Nomad/Exec/Lawman).

**Geteilte Klassen — exakte Scope-Karte (grep-verifiziert):**
| Klasse | Außerhalb Char-Modal genutzt? | 5b-Strategie |
|---|---|---|
| `.ctrl-input` `.ctrl-select` `.ctrl-msg` | **Ja** — Timer-/Items-/NPC-Modal, Sidebar-Raum, Combat-Setup, NPC-Quick. **Bereits 5a-global gestylt.** | Global lassen, nur fein nachziehen |
| `.ctrl-btn` `.ctrl-btn-red` | **Ja** — überall. **Bereits 5a-Button-System (global).** | Global; nur Inline-Overrides entfernen |
| `.ctrl-row` | **Ja** — Combat-Setup (`dm.html:66`, **3 Controls, KEIN Label**) + NPC-Quick (`324–337`) | Konservativ global (Flex bleibt, nur `--sp`/Margin) |
| `.ctrl-label` | **Ja** — NPC-Quick (`325/329/333`) | Konservativ global (feste Breite + HUD-Look) |
| `.ctrl-section(-head)` `.cond-toggle-btn` `.condition-toggle-grid` `.ctrl-buff-*` `.buff-preset*` `.buff-add-form` `.ctrl-inj-*` `.dm-stats-grid` `.dm-res-*` `.dm-skill-*` `.dm-inv-*` `.dm-left-*` | **Nein — nur Char-Modal** | Frei redesignen |

> **Kritisch:** `.ctrl-row` trägt NICHT immer `[Label][Feld]` — die Combat-Setup-Zeile
> (`dm.html:66`) hat 3 Controls ohne Label. Ein erzwungenes 2-Spalten-`grid` global würde sie
> zerschießen. → `.ctrl-row` bleibt **Flex**; Ausrichtung kommt über festes `.ctrl-label` +
> Feld-Modifier, nicht über globales Grid.

---

## 1. MODAL-GRUNDSTRUKTUR (✅ entschieden: 2-Zonen behalten + „Mehr" entzerren)

Begründung: Die Links/Rechts-Trennung ist informationsarchitektonisch goldrichtig — links die
**Live-Controls, die im Kampf jede Runde angefasst werden** (HP/SP/Conditions/Buffs) und über
alle Tabs sichtbar bleiben; rechts **Referenz + tiefere Edits** in Tabs. Das Problem ist die
*Ausführung* (eng, inline, 960px schmal, „Mehr"-Wust), nicht das Konzept. Ein Auflösen des
Left-Rails würde die Live-Vitals beim Tab-Wechsel verstecken — schlechter fürs Spiel.

Konkrete Änderungen:
- Box-Breite **960 → `min(1100px, 96vw)`** (DM ist bewusst breit, 5a: kein 1280-Cap; mehr Raum
  killt das Gequetsche), `max-height:90vh` bleibt.
- Left-Rail **200 → ~260px** (SP-/Cash-Zeilen hören auf umzubrechen).
- Rechte `.dm-modal-body` für den „Mehr"-Tab als **responsives Karten-Grid**
  (`repeat(auto-fit,minmax(300px,1fr))`) → bei 1100px = **2 Spalten**, kein endloser Scroll.
- Header/Tabs/Body-Aufteilung bleibt; nur Token-/Spacing-/Hierarchie-Refresh.
  Tab-Set bleibt **Stats·Skills·Inventar·Mehr**.

```
┌─ #dmModalBox  min(1100px,96vw) · max-h 90vh ───────────────────────────────┐
│ HEADER  [▣52] NAME (display)        2.450 eb │ [↗ Player] [✕]               │
│         role · handle · player      (cyan/rot)                              │
├────────────┬───────────────────────────────────────────────────────────────┤
│ LEFT 260px │ TABS:  Stats | Skills | Inventar | Mehr                        │
│ (LIVE)     ├───────────────────────────────────────────────────────────────┤
│ ┌HP──────┐ │  BODY (scroll, padding --sp-5)                                 │
│ │▓▓▓▓░ 24/40│  ── „Mehr" = Karten-Grid auto-fit minmax(300,1fr) ──          │
│ │[__24_][↵]│  ┌ Cash ───────────┐ ┌ Role Rank ──────┐                       │
│ └────────┘ │  │ …               │ │ …               │                       │
│ ┌SP──────┐ │  └─────────────────┘ └─────────────────┘                       │
│ │HEAD …  │ │  ┌ Reputation ─────┐ ┌ Humanity ───────┐                       │
│ │BODY …  │ │  └─────────────────┘ └─────────────────┘                       │
│ └────────┘ │  ┌ Critical Injuries ┐ ┌ Buffs / Pharma ┐                      │
│ ┌IP──────┐ │  └───────────────────┘ └────────────────┘                      │
│ ┌Cash────┐ │  ┌ NPC greift an ────┐ ┌ Custom Item ───┐                      │
│ ┌Conds───┐ │  ┌ ROLE SPECIALTY (volle Breite) ───────┐                      │
│ ┌Buffs───┐ │  └───────────────────────────────────────┘                    │
└────────────┴───────────────────────────────────────────────────────────────┘
```

---

## 2. HEADER

Flex-Row beibehalten, HUD-Refresh:
`[Portrait 56px] [Name(display, fs-lg) + Sub(fs-xs muted, tracking)]  ——flex——  [Cash-Readout mono, cyan / rot-bei-negativ] [↗ Player View Ghost-Button] [✕ Icon-Button]`
- Untere Kante: 1px `--border-dark` + dezenter cyan-Glow (wie 5a-Section-Heads).
- Cash als Chip-artiger Readout (mono), nicht als loser Text. Player-Link = kompakter
  Ghost-Button (Token-migriert), Close = Icon-Button (icon-sm, →44 @coarse).

---

## 3. LEFT-PANEL (Proportionen & Gruppierung)

Jede Sektion: `.ctrl-section-head` als HUD-Micro-Header (fs-xs, uppercase, tracking, cyan,
border-bottom — identisch zum 5a-Dashboard-Head). Sektions-Abstand `--sp-5`, intra `--sp-2`.

- **HP:** Live-Bar (in-place, **NICHT** auf `<health-bar>` umstellen — Gotcha #4), Höhe `6px`
  Token-Farbe; großer Mono-Wert `24 / 40`; darunter Edit-Row `[Input 1fr][↵ icon-sm]`.
- **Rüstung SP** (größter Inline-Sünder): 3 Zeilen head/body/shield über **einheitliches
  Zeilen-Pattern** — Slot-Label (statt inline-`min-width:42px`-Span) · `[Num-Input 6ch]` ·
  `/ max` (dim) · `[↵ icon]` · `[↺ ghost-sm]`. Alle Inline-Maße raus.
- **IP:** Wert rechts im Head; 4 Quick-Chips (+5/+10/+25/+50) als 2×2- oder 1×4-Chip-Grid.
- **Cash:** Wert rechts im Head (rot bei <0); `[Betrag-Num]`-Zeile, `[Grund-Text]` eigene Zeile
  (statt `min-width`-Quetsch), `[+ eb][− eb]` als Chip-Paar; Cash-Log darunter (mono, dim, scroll).
- **Conditions:** Chip-Grid (`.cond-toggle-btn`, wrap).
- **Aktive Buffs:** Listenzeilen `[Name 1fr][Zeit mono][✕]`.

```
┌ HP ─────────────────┐   ┌ RÜSTUNG SP ───────────────────────────┐
│ ▓▓▓▓▓▓▓░░░  24 / 40  │   │ HEAD  [ 11 ] / 11   [↵] [↺]            │
│ [ __24__ ]      [↵]  │   │ BODY  [  7 ] / 11   [↵] [↺]            │
└─────────────────────┘   │ SHLD  [  0 ] /  0   [↵] [↺]            │
                          └────────────────────────────────────────┘
```

---

## 4. BODY-TABS

- **Tab-Leiste** (`.dm-tab-btn`): bereits als Underline-Tabs; auf HUD-Tokens migrieren
  (aktiv = cyan Underline + cyan Text; Hover-Glow). Set bleibt **Stats·Skills·Inventar·Mehr**.
- **Stats** (`buildStatsHtml`): `.dm-stats-grid` (5 Spalten) → Wert groß mono, Label klein
  uppercase; darunter `.dm-res-grid` (Ressourcen-Zellen). Nur Token + Rhythmus.
- **Skills/Inventar:** read-only Kategorie-Sektionen — Zeilen `[Name][Wert mono]`, HUD-Heads,
  Token + Rhythmus.
- **„Mehr"** (`buildControlsHtml`): **Karten-Grid** `repeat(auto-fit,minmax(300px,1fr))`,
  jede `.ctrl-section` wird eine **Control-Card** (echte Border `--border-dark`, **kein clip** —
  Gotcha #2/#4; Padding `--sp-4`; `.ctrl-section-head` als HUD-Head). Role-Specialty-Card und
  ggf. Buffs/Injuries dürfen `grid-column: 1 / -1` (volle Breite) bekommen.

```
┌ ROLE ABILITY RANK ───────────┐   ┌ HUMANITY ────────────────────┐
│ Rank   [ 4 ▾ ]      [Setzen]  │   │ Current [ 38 ]      [Setzen]  │
│ msg…                          │   │ msg…                          │
└───────────────────────────────┘   └───────────────────────────────┘
```

---

## 5. ROLLEN-SPECIALTY-UIs — gemeinsame Layout-Sprache

Eine **Specialty-Card** mit identischem Skelett für alle 5 Rollen; nur der Body-Typ variiert:
```
[ROLE — TITEL  ····  Cap-Hint (z.B. „Total ≤ Rank 4")]   ← .ctrl-section-head + Badge
[ Body je Archetyp ]
[ Aktion (Speichern/Hinzufügen/Anzeigen) ]   [ msg ]
```
- **Punkte-Allokation (Medtech/Tech):** Liste `[Label][Num-Input 6ch]`-Zeilen + Footer mit
  **Σ-Badge** (genutzt/Cap) + `[Speichern]` (sm primary). Cap-Hint im Head.
- **Sammlung (Nomad/Exec):** vorhandene Einträge als Chip-/Zeilen-Liste + Add-Row
  `[Select|Input][+ Hinzufügen]`. Exec-Member als Zeile `[Name][Loyalty][…]`.
- **Query (Lawman):** `[Anzeigen]`-Button + Result-Block (gleicher msg/result-Stil).

Gemeinsam = Card-Chrome, Head, Zeilen-Pattern, Num-Input-Breite, Save/Add-Button, Cap-/Badge-/
msg-Stil → alle 5 lesen als eine Familie, obwohl der Inhalt differiert.

```
MEDTECH (Allokation)                  EXEC (Sammlung)
┌ MEDTECH — SPECIALTIES  Σ 3/4 ┐      ┌ EXEC — TEAM  2 / 3 ───────────┐
│ Surgery        [ 2 ]         │      │ • Jin     · Loyalty 7         │
│ Pharma (≤5)    [ 1 ]         │      │ • Vex     · Loyalty 5         │
│ Cryosystem(≤5) [ 0 ]         │      │ [Name____] [Loy 5] [+ Hinzu.] │
│                  [Speichern] │      │                         msg…  │
└──────────────────────────────┘      └───────────────────────────────┘
```

---

## 6. FELD-/FORM-PATTERN (✅ entschieden: konservativ global mit-redesignen)

`.ctrl-row` bleibt **Flex** (robust für Multi-Control-Zeilen wie Combat-Setup), nur Token-Refresh:
```
.ctrl-row     { display:flex; align-items:center; gap:var(--sp-2); margin-bottom:var(--sp-2); flex-wrap:wrap; }
.ctrl-label   { width:96px; flex:0 0 96px; font-size:var(--fs-xs); text-transform:uppercase;
                letter-spacing:var(--tracking); color:var(--text-muted); }
```
- **Ausrichtung** über festes `.ctrl-label` (96px) statt globalem Grid → Felder fluchten,
  label-lose Zeilen (Combat-Setup) bleiben heil. Combat-Setup & NPC-Quick werden konsistent
  mit-aufgewertet (folgt 5a-Linie: geteilte Control-Primitive global).
- **Feld-Breiten standardisieren** über **neue Modifier** statt Inline:
  `.ctrl-input--num` ≈ `width:6ch; text-align:right; font-family:var(--font-mono)` (ersetzt alle
  `max-width:55/60/65/70px`), `.ctrl-input--reason` (eigene Zeile, volle Breite).
- Feld-Mindesthöhe **34px** (kompakt, zwischen sm32 und 36), konsistent mit Button-sm.
- Optional, falls strenge Ausrichtung im Left-Panel gewünscht: **gescopter** Grid-Override
  `.dm-modal-left .ctrl-row{ … }` — NICHT global.

---

## 7. BUTTON-/TOGGLE-PATTERN

- `.ctrl-btn`/`.ctrl-btn-red`: 5a-Button-System (global). 5b entfernt die verbliebenen
  **Inline-Overrides** (`font-size`/`padding`/`color` an einzelnen Buttons, 5a-Mini-Inkonsistenz)
  → alle Modal-Buttons nutzen System-Größe **sm (32px)**; Icon-Buttons (↵ ↺ ✕ +) **icon-sm
  (~30–36, →44 @coarse)**, quadratisch.
- `.cond-toggle-btn` (Status-Toggle): Token-migrieren. inaktiv = `bg-panel-soft`+`border-dark`+
  `text-muted`; **aktiv = rot** (`neon-red` Border/Text + rot-Tint-bg) — semantisch korrekt
  (Conditions = Status/Gefahr). min-height ~30px, →44 @coarse.
- `.dm-left-ip-btn` + `.buff-preset-btn` (5a NICHT im System): auf eine gemeinsame **Chip-Button-
  Rezeptur** (cyan-Ghost) token-migrieren, damit Quick-Buttons & Preset-Chips matchen. Klassen
  bleiben (JS-Gruppen-Handler), nur Look vereinheitlicht.

---

## 8. KONKRETE WERTE (Zusammenfassung)

| Element | Wert |
|---|---|
| Modal-Box | `width:min(1100px,96vw)`, `max-height:90vh`, overflow hidden, Flex-Column |
| Left-Rail | `flex:0 0 260px`, `overflow-y:auto`, `padding:var(--sp-4)` |
| Right-Body | `flex:1`, `overflow-y:auto`, `padding:var(--sp-5)` |
| „Mehr"-Grid | `display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:var(--sp-5)` |
| Section-Gap | `--sp-5` · Intra-Row `--sp-2` · Section-Head-mb `--sp-3` |
| `.ctrl-label` | `96px` · `.ctrl-input--num` `width:6ch` mono rechtsbündig |
| Feld-Höhe | `34px` · Buttons sm `32px` / icon-sm `~30–36` (→44 @coarse) |
| Tokens | HUD-Set: `--bg-panel/-soft`, `--border-dark`, `--text-main/-muted/-dim`, `--neon-cyan/-red`, `--glow-*`, `--sp-*`, `--t-fast`/`--ease`, `--radius`. Schrift (`--font-display`) **bleibt** (Phase 11). |
| Mobile ≤640 | `.dm-modal-content`→column (Left oben, bereits in dm.css), „Mehr"-Grid→1 Spalte, `.ctrl-row`→Label über Feld |

**Struktur-Beobachtungen (Default = Leitplanke „kein Element entfernen"):**
- **Cash-Dublette** (Left-Panel + „Mehr") bleibt; beide identisch stylen. (Konsolidierung wäre
  Markup-Umbau/Element-Entfernung → nur auf ausdrücklichen Wunsch.)
- **Buffs doppelt** (Left „Aktive Buffs" via `renderLeftActiveBuffs` + „Mehr" Buffs/Pharma via
  `renderCtrlActiveBuffs`) — beide bleiben, gleiche Listen-Optik.

---

## Umsetzungs-Etappen (3er-Split, ✅ entschieden)

- **5b-1 — Foundation + Header + Left-Panel:** Token-/Spacing-Refresh von `.ctrl-row`/`.ctrl-label`
  (global, Flex) + neue Feld-Modifier (`.ctrl-input--num`/`--reason`); `.ctrl-btn`-Inline-Overrides
  raus; Box→1100/Left→260px; Header-HUD; Left-Sektionen (HP/SP/IP/Cash/Conditions/Buffs) auf
  einheitliches Zeilen-Pattern.
- **5b-2 — Body-Tabs:** Stats/Skills/Inventar Token+Rhythmus; „Mehr" → Karten-Grid; alle
  `.ctrl-section` als Control-Cards; `.cond-*`/`.ctrl-buff-*`/`.ctrl-inj-*`/`.buff-*` migrieren.
- **5b-3 — Rollen-UIs + NPC-Quick + Verify:** 5 Specialty-Cards in gemeinsamer Layout-Sprache;
  NPC-Quick-Modal-Konsistenz-Check; Headless-Render + Durchklick aller Flows.

## Verifikation (spätere Umsetzung)
Nach jeder Sub-Session: Headless-Render + `node --check` der Inline-Module, dm.css Brace-/
Kommentar-Balance (Glob-`*/`-Falle vermeiden!), `git status` = nur `dm.html`+`dm.css`, Durchklick:
Modal öffnen, HP/SP/IP/Cash/Conditions/Buffs/Rank/Rep/Humanity/Injuries/NPC-Angriff/Custom-Item/
alle 5 Rollen + NPC-Quick-Modal unverändert funktional.
