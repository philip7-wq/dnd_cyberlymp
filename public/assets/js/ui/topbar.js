// ============================================================
// Game-Time Top-Bar — fixed bar at the very top of <body>
// Shows: ingame date+time, mode dot, sleep indicator, ⚙ DM
// Tick: 250ms, only updates the time <span> (no DOM thrash).
// ============================================================

import {
  initGameTime, getCachedGameState, getCurrentIngameTime,
  formatIngameTime, getSleepDeprivationModifier, onGameStateChange,
  cleanupExpiredEffects,
} from '../game-time.js';

const MODE_LABEL = {
  running:   'Running',
  paused:    'Paused',
  combat:    'Combat',
  long_rest: 'Long Rest',
};

let _attachedChar = null;
let _tickTimer = null;
let _settingsCb = null;
let _root = null;

export async function mountTopbar({ isDm = false, onSettingsClick = null } = {}) {
  if (document.getElementById('gameTimeTopbar')) return _publicApi();
  await initGameTime();

  _settingsCb = onSettingsClick;
  _root = document.createElement('div');
  _root.id = 'gameTimeTopbar';
  _root.className = 'gt-topbar';
  _root.innerHTML = `
    <span class="gt-mode-dot" id="gtModeDot" data-mode="running" title="Running"></span>
    <span class="gt-mode-label" id="gtModeLabel">Running</span>
    <span class="gt-time" id="gtTime">2045-09-15  08:00:00</span>
    <span class="gt-round" id="gtRound" hidden></span>
    <span class="gt-sleep" id="gtSleep" hidden></span>
    <span class="gt-spacer"></span>
    ${isDm ? `<button class="gt-settings-btn" id="gtSettingsBtn" type="button" title="Time Control">⚙</button>` : ''}
  `;
  document.body.insertBefore(_root, document.body.firstChild);
  document.body.classList.add('gt-has-topbar');

  if (isDm) {
    document.getElementById('gtSettingsBtn').addEventListener('click', () => {
      if (typeof _settingsCb === 'function') _settingsCb();
    });
  }

  onGameStateChange(_render);
  _render(getCachedGameState());
  _startTick();
  return _publicApi();
}

function _publicApi() {
  return {
    attachCharacter(char) {
      _attachedChar = char;
      _renderSleep();
    },
    updateCharacter(char) {
      _attachedChar = char;
      _renderSleep();
    },
  };
}

let _lastEffectCleanup = 0;
function _startTick() {
  if (_tickTimer) clearInterval(_tickTimer);
  _tickTimer = setInterval(() => {
    const gs = getCachedGameState();
    if (!gs) return;
    const t = getCurrentIngameTime(gs);
    const timeEl = document.getElementById('gtTime');
    if (timeEl) timeEl.textContent = formatIngameTime(t);
    _renderSleep();
    // Effekt-Auto-Cleanup: einmal pro Minute reicht; DELETE ist idempotent,
    // race-condition mit anderen Clients ist unkritisch.
    const nowMs = Date.now();
    if (nowMs - _lastEffectCleanup > 60_000) {
      _lastEffectCleanup = nowMs;
      cleanupExpiredEffects(t).catch(() => {});
    }
  }, 250);
}

function _render(gs) {
  if (!gs || !_root) return;
  const dot   = document.getElementById('gtModeDot');
  const label = document.getElementById('gtModeLabel');
  const round = document.getElementById('gtRound');
  const time  = document.getElementById('gtTime');
  if (dot)   { dot.dataset.mode = gs.mode; dot.title = MODE_LABEL[gs.mode] || gs.mode; }
  if (label) label.textContent = MODE_LABEL[gs.mode] || gs.mode;
  if (round) {
    if (gs.mode === 'combat' && gs.combat_round > 0) {
      round.textContent = `R${gs.combat_round}`;
      round.hidden = false;
    } else round.hidden = true;
  }
  if (time)  time.textContent = formatIngameTime(getCurrentIngameTime(gs));
  _renderSleep();
}

function _renderSleep() {
  const el = document.getElementById('gtSleep');
  if (!el || !_attachedChar) return;
  const sleep = getSleepDeprivationModifier(_attachedChar, getCurrentIngameTime());
  if (sleep.value === 0) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.dataset.severity = sleep.value <= -4 ? 'critical' : sleep.value <= -2 ? 'high' : 'low';
  el.textContent = `😴 ${sleep.value}`;
  el.title = `${sleep.label} — ${Math.floor(sleep.hoursAwake)} IG-Stunden wach`;
}
