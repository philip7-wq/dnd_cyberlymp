// ============================================================
// cyber-components.js — Komponenten-Bibliothek (Phase 1)
// Importiert + registriert ALLE Custom Elements. EIN <script type="module">
// pro Seite genügt: <script type="module" src="assets/js/cyber-components.js">.
// Komponenten-Styles liegen in assets/css/cyber-components.css (NACH
// cyberpunk-ui.css laden — siehe REDESIGN_MASTER.md §3).
//
// Light DOM, kein Shadow DOM, keine Libraries, kein Build.
// Daten-Widgets rufen bestehende Logik (dice.js / combat-modifiers.js).
// ============================================================

// Batch A — Primitives
import './components/cyber-panel.js';
import './components/cyber-button.js';
import './components/status-chip.js';
import './components/stat-block.js';
import './components/hud-divider.js';

// Batch B — Bars
import './components/segmented-bar.js';
import './components/health-bar.js';
import './components/armor-bar.js';
import './components/humanity-bar.js';

// Batch C — Feedback
import './components/warning-banner.js';
import './components/loading-strip.js';
import './components/glitch-text.js';

// Batch D — Select
import './components/cyber-select.js';

// Batch E — Cards
import './components/item-card.js';
import './components/character-card.js';
import './components/cyberware-card.js';
import './components/enemy-card.js';
import './components/location-card.js';
import './components/combat-participant-card.js';

// Batch F — Tools
import './components/dice-roller.js';
import './components/damage-calculator.js';
