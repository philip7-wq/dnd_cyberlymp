# REDESIGN_MASTER.md — Cyberpunk RED Hub · Visuelles Redesign
> Single Source of Truth für den kompletten UI-Redesign. **Claude Code liest diese Datei zu Beginn JEDER Session.**
> Stand: 2026-06-02

---

## 0. TL;DR — was hier passiert

Komplettes visuelles Redesign der bestehenden App zu einem dunklen Night-City-HUD.
**Neues Design-System von Grund auf**, native **Web Components**, Animations-Layer über CSS/WAAPI/Canvas.

> **HARTE LEITPLANKE: Es wird KEINE Funktionalität geändert.**
> Nur Layout, Aussehen, Animationen, Interaktions-Feedback. Jede DB-Query, jedes Realtime-Subscribe,
> jede Berechnung (Dice, Combat, Heilung, PDF-Parser, Map-Canvas, Radio-Audio) bleibt verhaltensgleich.
> Wenn ein Refactor nötig ist, um ein UI-Element einzubauen: erlaubt — aber das beobachtbare Verhalten
> muss identisch bleiben.

---

## 1. Tech-Entscheidungen (fix)

| Entscheidung | Wahl | Begründung |
|---|---|---|
| Framework | **Keins** | Vanilla bleibt. Ein Framework würde ~13k Zeilen + Realtime/PDF/Canvas/Audio neu verdrahten = Rewrite, nicht Redesign. |
| Build-Step | **Keiner** | Projekt-Identität. Netlify served `public/` statisch. |
| Libraries | **Keine neuen** | Web-Plattform reicht für alles hier. |
| Komponenten-Modell | **Native Web Components** (Custom Elements v1) | Echte Kapselung + Wiederverwendung, ohne Build. |
| Animationen | **CSS-Keyframes + Web Animations API + Canvas** | Daher kommt das Cyberpunk-Feel — nicht aus einem Framework. |
| Design-System | **Komplett neu** (Token-basiert) | Alte verstreute Styles werden ersetzt. |
| Fonts | **Self-hosted** (woff2 in `assets/fonts/`) | DSGVO + konsistent mit CLAUDE.md. |
| Tokens-CSS | `assets/css/cyberpunk-ui.css` | Single Source of Truth, auf jeder Seite ZUERST geladen. |

**Web Components vs. CSS-Klassen — Faustregel:**
- **Custom Element**, wenn das Ding daten-getrieben + wiederholt ist: `<health-bar>`, `<status-chip>`, `<stat-block>`, `<item-card>`, `<dice-roller>`, `<damage-calculator>`.
- **CSS-Klasse**, wenn es reines Layout/Struktur ist: `.cyber-panel`, `.cyber-grid`, `.cyber-input`, Section-Headings, Divider.
- Nicht zwanghaft alles zu Elements machen. Pragmatischer Hybrid.

---

## 2. Design-Tokens (verbindlich)

Komplettes Token-Set. Geht nach `cyberpunk-ui.css` in `:root`. **Keine Hardcode-Farben in Page-CSS.**

```css
:root {
  /* — Backgrounds — */
  --bg-main:        #080A0F;
  --bg-panel:       #101318;
  --bg-panel-soft:  #151920;
  --bg-panel-red:   #261116;
  --bg-panel-cyan:  #062329;

  /* — Text — */
  --text-main:      #E8F8FF;
  --text-muted:     #8A9AA3;
  --text-dim:       #53616A;

  /* — Cyan (System / Daten / Charakter) — */
  --neon-cyan:      #22F7FF;
  --cyan-soft:      #0DB7D9;
  --cyan-dark:      #064D5E;

  /* — Red/Pink (Combat / Gefahr / Night Market) — */
  --neon-red:       #FF3158;
  --red-soft:       #B8253D;
  --red-dark:       #44151C;

  /* — Status — */
  --warning-yellow: #FFD166;
  --success-green:  #36FF9F;
  --danger-red:     #FF2B2B;

  /* — Lines / Grid — */
  --border-dark:    #25313A;
  --grid-line:      rgba(34,247,255,0.08);

  /* — Glow-Presets (box-shadow) — */
  --glow-cyan-s:    0 0 8px rgba(34,247,255,0.45);
  --glow-cyan-m:    0 0 18px rgba(34,247,255,0.30);
  --glow-cyan-l:    0 0 28px rgba(34,247,255,0.45);
  --glow-red-s:     0 0 8px rgba(255,49,88,0.45);
  --glow-red-m:     0 0 18px rgba(255,49,88,0.30);
  --inset-cyan:     inset 0 0 24px rgba(34,247,255,0.04);

  /* — Geometrie — */
  --clip-sm: 8px;     /* Clip-Path-Eckmaß klein  */
  --clip-md: 14px;    /* mittel (Buttons/Cards)   */
  --clip-lg: 18px;    /* groß (Panels)            */
  --border-w: 1px;
  --radius: 2px;      /* fast eckig — niemals SaaS-Rundung */

  /* — Spacing-Skala — */
  --sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px; --sp-4: 16px;
  --sp-5: 24px; --sp-6: 32px; --sp-7: 48px; --sp-8: 64px;

  /* — Typografie — */
  --font-heading: "Rajdhani", "Orbitron", sans-serif;
  --font-body:    "IBM Plex Mono", "Share Tech Mono", monospace;
  --font-mono:    "Share Tech Mono", monospace;     /* Zahlen/Stats */
  --fs-xs: 0.75rem; --fs-sm: 0.85rem; --fs-md: 1rem;
  --fs-lg: 1.25rem; --fs-xl: 1.6rem;  --fs-2xl: 2.2rem;
  --tracking: 0.12em;

  /* — Motion — */
  --t-fast: 120ms; --t-med: 200ms; --t-slow: 360ms;
  --ease: cubic-bezier(0.2, 0.8, 0.2, 1);

  /* — Z-Index-Skala — */
  --z-base: 1; --z-panel: 10; --z-nav: 100;
  --z-modal: 1000; --z-toast: 2000; --z-scanlines: 9999;

  /* — Semantische Aliases (im Code DIESE benutzen) — */
  --color-data:    var(--neon-cyan);
  --color-combat:  var(--neon-red);
  --color-illegal: var(--neon-red);
  --color-ok:      var(--success-green);
  --color-warn:    var(--warning-yellow);
}
```

### Migrations-Aliase (temporär)
Damit halb-migrierte Seiten zwischen Phasen nicht brechen, mappen wir die ALTEN Variablennamen auf die neuen.
**Diese Aliase werden in der letzten Phase wieder entfernt.**

```css
:root {
  --red:  var(--neon-red);    /* alt: #FF2D2D */
  --cyan: var(--neon-cyan);   /* alt: #00E5FF */
  --bg:   var(--bg-main);     /* alt: #0a0a0f */
}
```

### Farblogik (nicht verhandelbar)
- **Cyan** = Charakterdaten, System, Map, Datenbank, Inventar, Cyberware, neutrale Infos.
- **Rot/Pink** = Combat, Damage, kritische Zustände, Locked/Warning, Night Market, illegale Items, Gegner.

---

## 3. Datei-Architektur des Redesigns

Neu anzulegen:

```
public/assets/
├── css/
│   └── cyberpunk-ui.css        ← Tokens + Reset + Basis-Utility/Komponenten-Klassen (ZUERST laden)
├── js/
│   ├── cyber-components.js      ← registriert alle Custom Elements (oder Ordner, s.u.)
│   ├── components/              ← optional: 1 Datei pro Custom Element
│   │   ├── cyber-panel.js
│   │   ├── cyber-button.js
│   │   ├── health-bar.js
│   │   └── ...
│   └── cyber-fx.js              ← Animations-Helfer (boot-flicker, glow-pulse, glitch, scan)
└── fonts/                       ← woff2: Rajdhani, Orbitron, IBM Plex Mono, Share Tech Mono
```

**Lade-Reihenfolge auf jeder Seite:** `cyberpunk-ui.css` zuerst → dann Page-CSS → dann (am Ende von body) `cyber-components.js` als `type="module"`.

Bestehende CSS-Dateien (werden Phase für Phase neu aufgebaut, nicht spurlos gelöscht bevor klar ist was sie tun):
`base.css, player.css, dm.css, map.css, map-weapons.css, agent.css, roles.css, shop.css, topbar.css, session-bar.css, radio.css, radio-standalone.css, sound.css, index.css, upload.css`

---

## 4. Komponenten-Inventar (Web Components)

Custom-Element-Namen müssen einen Bindestrich enthalten. Konvention: `cyber-*` bzw. sprechender Name.

| Element | Attribute (Beispiel) | Zweck |
|---|---|---|
| `<cyber-panel>` | `variant="cyan\|red\|ghost\|neutral"` `title` | Basiscontainer, abgeschrägt, HUD-Deko |
| `<cyber-button>` | `variant` `disabled` `active` | Ersetzt alle Buttons |
| `<status-chip>` | `variant` | Label/Tag (RANGED, ILLEGAL, ACTIVE …) |
| `<stat-block>` | `label` `value` | INT/REF/… Anzeige mit Glow |
| `<segmented-bar>` | `value` `max` `variant` `show-numbers` | Basis-Balken |
| `<health-bar>` | `value` `max` | cyan→rot bei niedrig |
| `<armor-bar>` | `value` `max` | gelb/rot bei Ablation |
| `<humanity-bar>` | `value` `max` | cyan/grün, rot sehr niedrig |
| `<hud-divider>` | — | leuchtende Segment-Trennlinie |
| `<warning-banner>` | `level` | LOCKED / COMBAT ACTIVE / CRITICAL INJURY |
| `<loading-strip>` | `progress` | Scan-/Loading-Balken |
| `<glitch-text>` | — | nur seltene kritische Zustände |
| `<item-card>` | data-getrieben | Shop / Night Market |
| `<character-card>` | data-getrieben | Character Database |
| `<cyberware-card>` | data-getrieben | Cyberware-Index |
| `<npc-file-card>` / `<enemy-card>` | data-getrieben | NPC / Gegner |
| `<location-card>` | data-getrieben | Map / Locations |
| `<combat-participant-card>` | data-getrieben | Combat Tracker |
| `<dice-roller>` | — | Quick + Custom + Result-Styling |
| `<damage-calculator>` | — | CP-RED Armor/Ablation-Logik (nur UI; Rechen-Logik aus combat-modifiers.js) |

**Wichtig:** Daten-Widgets dürfen keine eigene Geschäftslogik erfinden. `<dice-roller>` ruft die bestehende `roll()` aus `dice.js`; `<damage-calculator>` nutzt `computeDamageThrough()` aus `combat-modifiers.js`. UI ruft Logik, nie umgekehrt.

---

## 5. Animations-Prinzipien (`cyber-fx.js` + Keyframes)

Subtil, nie die ganze Seite flackern lassen.

- **Panel-Boot:** kurzer Flicker + Glow-Hochfahren beim Erscheinen (≤360ms).
- **Glow-Pulse:** langsamer Atem auf aktiven/Live-Elementen.
- **Glitch:** nur bei Warnungen/kritischen Zuständen (`<glitch-text>`, `<warning-banner>`).
- **Scanlines:** globales `::after`-Overlay, `z-index: var(--z-scanlines)`, `pointer-events:none`.
- **Hover:** Glow + 1px Lift auf Buttons/Cards.
- **Tab/Panel-Wechsel:** kurze WAAPI-Transition statt harter Schnitt.
- **Pflicht:** alles respektiert `@media (prefers-reduced-motion: reduce)` → Animationen aus.

---

## 6. Session-Protokoll für Claude Code (gilt für JEDE Phase)

Jeder Phasen-Prompt verlangt explizit:

1. **Lesen zuerst:** `REDESIGN_MASTER.md` (diese Datei) + `REDESIGN_PHASES.md` + die für die Phase genannten Specs.
2. **Codebase lesen:** die in der Phase betroffenen Dateien tatsächlich öffnen, bevor editiert wird.
3. **In testbaren Stufen umsetzen**, nicht alles auf einmal.
4. **Keine Funktionsänderung** — Verhalten muss identisch bleiben (siehe Leitplanke §0).
5. **Keine neuen Libraries, kein Build-Step.**
6. **Supabase-Import-Pfad konsistent** halten (alle DB-Calls über `assets/js/supabase.js`, kein roher Query in Page-Files).
7. **Game-Terms bleiben Englisch** (Handgun, Cyberware, Brawling …), UI-Strings dürfen Deutsch sein.
8. **Bei unklaren Edge Cases: fragen statt raten.**
9. **Design unverändert lassen außerhalb der Phasen-Scope** — nicht „nebenbei" andere Seiten anfassen.
10. **Abschluss-Report** je Phase: geänderte Dateien, neue Komponenten, offene Punkte, ob alles lädt/keine Konsolen-Fehler.

---

## 7. Definition of Done (Gesamtprojekt)

- [ ] Einheitliches Token-System, keine Hardcode-Farben in Page-CSS.
- [ ] Alle Seiten im Cyberpunk-HUD-Look, keine SaaS-Cards / Standard-Buttons mehr.
- [ ] Komponenten-Bibliothek vorhanden und überall genutzt.
- [ ] Neu: Dashboard-Landing, Rulebook, Cyberware-Index.
- [ ] Responsive (Desktop/Tablet/Mobile), Buttons ≥44px.
- [ ] `prefers-reduced-motion` respektiert, Kontrast ok.
- [ ] **Keine Funktionalität verloren**, keine Konsolen-Fehler.
- [ ] Migrations-Aliase entfernt, tote Alt-Styles bereinigt.
