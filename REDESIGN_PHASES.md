# REDESIGN_PHASES.md — Phasenplan
> Geschnitten in sinnvolle, in sich abgeschlossene Einheiten. **Eine Phase = eine Claude-Code-Session = ein Prompt.**
> Reihenfolge ist Abhängigkeits-sortiert. Jede Phase folgt dem Session-Protokoll aus `REDESIGN_MASTER.md §6`.

---

## Übersicht

| # | Phase | Hängt ab von | Risiko | Funktions-Risiko |
|---|---|---|---|---|
| 0 | Fundament: Tokens, Fonts, FX-Layer, Aliase | — | niedrig | keins (nur additiv) |
| 1 | Komponenten-Bibliothek (Web Components) + Demo-Harness | 0 | niedrig | keins (isoliert) |
| 2 | App-Shell: Topbar, Session-Bar, Sidebar, Hintergrund, Scanlines | 0,1 | mittel | niedrig |
| 3 | **Dashboard-Landing** (neu, ersetzt index-Picker) | 1,2 | mittel | niedrig |
| 4 | Character Detail — `player.html` (Dossier) | 1,2 | **hoch** (4158 Z.) | mittel |
| 5 | DM-Dashboard — `dm.html` (+ Combat Tracker UI) | 1,2 | **hoch** (3802 Z.) | mittel |
| 6 | Night Market — `shop.html` (+ ItemCard/CyberwareCard) | 1,2 | mittel | niedrig |
| 7 | Map / Locations — `map.html` (Chrome + Sidebar, Canvas unangetastet) | 1,2 | **hoch** (4983 Z.) | hoch |
| 8 | Rest-Seiten: `create.html`, `upload.html`, `npc-sheet.html`, `radio.html` | 1,2 | mittel | niedrig |
| 9 | **Rulebook** (neue Inhalts-Seite) | 1,2 | mittel | keins (neu) |
| 10 | **Cyberware-Index** (neue Inhalts-Seite) | 1,2,6 | mittel | keins (neu) |
| 11 | Responsive + A11y + reduced-motion + Cleanup + Final-QA | alle | mittel | mittel |

> Phasen 4/5/7 sind die großen Brocken. Falls eine davon eine Session sprengt, wird sie tab-/sektionsweise
> in Unter-Sessions geteilt (z.B. 4a Stats/Skills, 4b Weapons/Armor/Cyberware, 4c Lifepath/Notes/Rollen).

---

## Phase 0 — Fundament
**Ziel:** Bedrock legen, ohne sichtbare Seiten zu verändern.
**Erstellen:**
- `assets/css/cyberpunk-ui.css` mit komplettem Token-Set (Master §2) + Reset + Basis-Klassen (`.cyber-panel`, `.cyber-button`, `.cyber-input`, `.cyber-search`, `.cyber-select`, `.status-chip`, `.hud-divider`, `.cyber-table`) + Scanline-Overlay-Klasse.
- `assets/fonts/` + `@font-face`: Rajdhani, Orbitron, IBM Plex Mono, Share Tech Mono als **woff2 herunterladen** (OFL-lizenziert) und lokal einbinden.
- `assets/js/cyber-fx.js` Skeleton (Keyframes + Helfer: bootFlicker, glowPulse, glitch, mountScanlines) inkl. `prefers-reduced-motion`-Guard.
- Migrations-Aliase (`--red/--cyan/--bg` → neue Tokens).
**Nicht:** noch keine Seite umstellen.
**Done:** Datei lädt fehlerfrei, Fonts rendern, Demo-Element zeigt Tokens korrekt.

## Phase 1 — Komponenten-Bibliothek
**Ziel:** Alle Web Components aus Master §4 bauen + isoliert testen.
**Erstellen:** `cyber-components.js` (oder `components/`-Ordner), eine **`components-demo.html`** als Test-Harness, die jede Komponente in allen Varianten zeigt.
**Regel:** Daten-Widgets rufen bestehende Logik (`dice.js`, `combat-modifiers.js`) — keine neue Geschäftslogik.
**Done:** Demo-Seite zeigt alle Komponenten, keine Konsolen-Fehler, Komponenten sind ohne Seitenkontext nutzbar.

## Phase 2 — App-Shell
**Ziel:** Globaler Rahmen im HUD-Look auf allen Seiten.
**Betrifft:** `topbar.js`/`topbar.css`, `session-bar.js`/`session-bar.css`, gemeinsamer Body-Hintergrund, Scanline-Overlay, neue Sidebar/Nav-Struktur (Desktop + Mobile-Burger).
**Leitplanke:** Zeit-Tick, Sleep-Indicator, Session-Start/Stop-Logik unverändert — nur Optik.
**Done:** Shell sieht auf allen Seiten einheitlich aus; Topbar-/Session-Logik funktioniert wie vorher.

## Phase 3 — Dashboard-Landing (NEU)
**Ziel:** `index.html` wird vom simplen Char-Picker zu einem Dashboard (Current Session, Active Characters, Quick Roll, Combat Status, Map-Shortcuts, Night-Market-Teaser).
**Leitplanke:** Bestehende Einstiegspfade (Player/DM/Upload/Create/Radio) bleiben funktional erhalten.
**Done:** Landing ist Dashboard; alle alten Links funktionieren.

## Phase 4 — Character Detail (`player.html`)
**Ziel:** Digitales Dossier. Tabs Stats·Skills·Weapons·Armor·Cyberware·Gear·Lifepath·Notes·Rollen im HUD-Look; Cyberware-Skeleton als cyan-Med-HUD; HealthBar/HumanityBar/StatBlock einsetzen.
**Leitplanke:** Würfeln, Skill-Check-Modal (Sleep/Solo/Injury-Mods), Damage-Rolls, Name/Stats-Edit, alle Subscriptions verhaltensgleich.
**Done:** Optik neu, jeder bestehende Flow identisch testbar.

## Phase 5 — DM-Dashboard (`dm.html`)
**Ziel:** HUD-Look für alle Tabs (Charaktere·NPCs·Combat·Chat·Sound·Settings) + Combat Tracker als `combat-participant-card`-Liste.
**Leitplanke:** HP-Edit, Initiative, Damage/Roll-Requests, Chat, Sound-Board, Realtime unverändert.
**Done:** wie Phase 4, für DM-Seite.

## Phase 6 — Night Market (`shop.html`)
**Ziel:** Dunkelrot/illegal-Look. `item-card`/`cyberware-card`, Kategorie-Filter als Chips, Preis-/Seltenheitsfarben (Cheap→Super-Luxury), Slot-Picker im HUD-Stil.
**Leitplanke:** Kauf, `patchCash`, cash_log, Cyberpsychosis-Modal, room_items unverändert.
**Done:** Shop neu gestyled, Kauf-Flow identisch.

## Phase 7 — Map / Locations (`map.html`)
**Ziel:** Nur **Chrome + Sidebar** im NightCity.io-Stil (Zones/Places/Vendors/People-Filter), Panels, Combat-Bar, Buttons.
**Leitplanke — kritisch:** Das **Canvas-Rendering, Hit-Test, Drag/Snap, Z-Order, Weapon-Range-Rings, Attack-Flow, Measure-Tool bleiben funktional unangetastet.** Nur DOM-Chrome um das Canvas herum wird gestyled.
**Done:** Sidebar/Panels neu; Map-Mechanik unverändert.

## Phase 8 — Rest-Seiten
**Ziel:** `create.html` (Step-Wizard), `upload.html` (PDF-Upload/Preview), `npc-sheet.html`, `radio.html` auf das System umstellen.
**Leitplanke:** PDF-Parser, Wizard-Steps, Radio-Audio-Engine unverändert.
**Done:** alle Rest-Seiten im einheitlichen Look.

## Phase 9 — Rulebook (NEU)
**Ziel:** Statische Regel-Datenbank als Accordion-Panels (Basic Checks, Combat, Armor, Damage, Critical Injuries, Movement, Cover, Healing, Cyberware, Economy).
**Inhalt:** aus Cyberpunk RED Core Rulebook **+ deine House Rules** (Heilung 1 HP/IG-Std, Schlafentzug-Penalties, Long-Rest +4 HP) klar als House Rule markiert.
**Done:** navigierbare Regel-Seite; House Rules sichtbar gekennzeichnet.

## Phase 10 — Cyberware-Index (NEU)
**Ziel:** Browsebare Cyberware-DB (Cyberoptics, Neuralware, Cyberarms, Cyberlegs, Internal, Fashionware) mit `cyberware-card`, gespeist aus `items`-Tabelle (Kategorie Cyberware).
**Leitplanke:** liest nur vorhandene Daten; keine Schema-Änderung.
**Done:** Index zeigt Cyberware mit Humanity-Loss, Slots, Install-Req.

## Phase 11 — Responsive, A11y, Cleanup, Final-QA
**Ziel:** Mobile-Cards statt Tabellen, Filter-Chips horizontal scrollbar, Sidebar einklappbar, Buttons ≥44px, Fokus-States sichtbar, `prefers-reduced-motion` global, Kontrast-Check.
**Cleanup:** Migrations-Aliase entfernen, tote Alt-Styles löschen.
**Final-QA:** jede Seite einmal durchklicken, Konsole sauber, keine Funktion verloren.
**Done:** Definition of Done aus Master §7 erfüllt.

---

## Nächster Schritt
Nach Freigabe dieses Plans erzeuge ich pro Phase einen fertigen **Claude-Code-Prompt** (einer nach dem anderen, beginnend mit Phase 0), jeweils inkl. Lese-Liste, Scope, testbarer Stufen, Leitplanken und Abschluss-Report — direkt einschickbar in VS Code.
