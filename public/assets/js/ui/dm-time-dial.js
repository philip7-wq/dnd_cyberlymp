// ============================================================
// DM Time Dial — Modal for DM to control game time.
// Pause/Resume, Jump (-1d ... +1d), Combat start/end/round,
// Long-Rest force/cancel.
// ============================================================

import {
  initGameTime, getCachedGameState, getCurrentIngameTime, formatIngameTime,
  pauseTime, resumeTime, dmJumpTime,
  startCombat, endCombat, advanceCombatRound,
  startLongRest, cancelLongRest,
  onGameStateChange,
} from '../game-time.js';
import { getCharacters } from '../supabase.js';

const HOUR = 60*60*1000, MIN = 60*1000, DAY = 24*HOUR;
const JUMPS = [
  { label:'-1d',  delta: -DAY },
  { label:'-1h',  delta: -HOUR },
  { label:'-15m', delta: -15*MIN },
  { label:'-5m',  delta: -5*MIN },
  { label:'-1m',  delta: -MIN },
  { label:'+1m',  delta:  MIN },
  { label:'+5m',  delta:  5*MIN },
  { label:'+15m', delta:  15*MIN },
  { label:'+1h',  delta:  HOUR },
  { label:'+1d',  delta:  DAY },
];

let _overlay = null;
let _chars = [];

export async function mountDmTimeDial() {
  if (_overlay) return _api();
  await initGameTime();

  _overlay = document.createElement('div');
  _overlay.id = 'gtTimeDial';
  _overlay.className = 'gt-dial-overlay';
  _overlay.hidden = true;
  _overlay.innerHTML = `
    <div class="gt-dial-box" role="dialog">
      <div class="gt-dial-head">
        <span>⏲ TIME CONTROL</span>
        <button type="button" class="gt-dial-close" id="gtDialClose">✕</button>
      </div>

      <div class="gt-dial-section">
        <div class="gt-dial-time" id="gtDialTime">—</div>
        <div class="gt-dial-mode-line" id="gtDialModeLine">—</div>
        <div class="gt-btn-row">
          <button type="button" class="gt-btn" id="gtDialPauseBtn">⏸ Pause</button>
          <button type="button" class="gt-btn gt-success" id="gtDialResumeBtn">▶ Resume</button>
        </div>
        <div class="gt-jump-grid" id="gtJumpGrid"></div>
      </div>

      <div class="gt-dial-section">
        <h4>Combat</h4>
        <div class="gt-btn-row">
          <button type="button" class="gt-btn gt-danger" id="gtDialStartCombat">⚔ Start</button>
          <button type="button" class="gt-btn" id="gtDialNextRound">⏭ +5s (Round)</button>
          <button type="button" class="gt-btn" id="gtDialEndCombat">⏹ End</button>
        </div>
        <div class="gt-dial-mode-line" id="gtDialRoundInfo" style="margin-top:.4rem;"></div>
      </div>

      <div class="gt-dial-section">
        <h4>Long Rest</h4>
        <select class="gt-dial-select" id="gtDialRestChar"></select>
        <div class="gt-btn-row">
          <button type="button" class="gt-btn gt-success" id="gtDialForceRest">🌙 Force Long Rest</button>
          <button type="button" class="gt-btn gt-danger" id="gtDialCancelRest" hidden>✕ Cancel</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(_overlay);

  _buildJumpButtons();
  _bindHandlers();
  onGameStateChange(_renderState);

  try { _chars = await getCharacters(); _renderChars(); } catch (e) { console.warn(e); }
  _renderState(getCachedGameState());
  setInterval(() => {
    const gs = getCachedGameState();
    const t = getCurrentIngameTime(gs);
    const el = document.getElementById('gtDialTime');
    if (el && _overlay && !_overlay.hidden) el.textContent = formatIngameTime(t);
  }, 250);

  return _api();
}

function _api() {
  return {
    open()  { if (_overlay) { _overlay.hidden = false; _renderState(getCachedGameState()); } },
    close() { if (_overlay) _overlay.hidden = true; },
    toggle(){ if (!_overlay) return; _overlay.hidden ? _overlay.hidden = false : _overlay.hidden = true; if (!_overlay.hidden) _renderState(getCachedGameState()); },
  };
}

function _buildJumpButtons() {
  const grid = document.getElementById('gtJumpGrid');
  for (const j of JUMPS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'gt-btn';
    b.textContent = j.label;
    b.addEventListener('click', async () => {
      b.disabled = true;
      try { await dmJumpTime(j.delta); } finally { b.disabled = false; }
    });
    grid.appendChild(b);
  }
}

function _bindHandlers() {
  document.getElementById('gtDialClose').addEventListener('click', () => _api().close());
  _overlay.addEventListener('click', e => { if (e.target === _overlay) _api().close(); });

  document.getElementById('gtDialPauseBtn').addEventListener('click',  () => pauseTime().catch(console.warn));
  document.getElementById('gtDialResumeBtn').addEventListener('click', () => resumeTime().catch(console.warn));

  document.getElementById('gtDialStartCombat').addEventListener('click', () => startCombat().catch(console.warn));
  document.getElementById('gtDialEndCombat').addEventListener('click',   () => endCombat().catch(console.warn));
  document.getElementById('gtDialNextRound').addEventListener('click',   () => advanceCombatRound().catch(console.warn));

  document.getElementById('gtDialForceRest').addEventListener('click', () => {
    const sel = document.getElementById('gtDialRestChar');
    if (sel?.value) startLongRest(sel.value).catch(console.warn);
  });
  document.getElementById('gtDialCancelRest').addEventListener('click', () => cancelLongRest().catch(console.warn));
}

function _renderChars() {
  const sel = document.getElementById('gtDialRestChar');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Char wählen —</option>' +
    _chars.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function _renderState(gs) {
  if (!gs || !_overlay) return;
  const t = getCurrentIngameTime(gs);
  const timeEl = document.getElementById('gtDialTime');
  const modeEl = document.getElementById('gtDialModeLine');
  const roundEl = document.getElementById('gtDialRoundInfo');
  const cancelBtn = document.getElementById('gtDialCancelRest');
  const startBtn = document.getElementById('gtDialStartCombat');
  const nextBtn  = document.getElementById('gtDialNextRound');
  const endBtn   = document.getElementById('gtDialEndCombat');
  const pauseBtn = document.getElementById('gtDialPauseBtn');
  const resumeBtn= document.getElementById('gtDialResumeBtn');
  const forceBtn = document.getElementById('gtDialForceRest');

  if (timeEl) timeEl.textContent = formatIngameTime(t);
  if (modeEl) modeEl.textContent = `Mode: ${gs.mode.toUpperCase()}`;
  if (roundEl) roundEl.textContent = gs.mode === 'combat' ? `Round ${gs.combat_round}` : '';

  if (cancelBtn) cancelBtn.hidden = gs.mode !== 'long_rest';
  if (startBtn)  startBtn.disabled = gs.mode === 'combat' || gs.mode === 'long_rest';
  if (nextBtn)   nextBtn.disabled  = gs.mode !== 'combat';
  if (endBtn)    endBtn.disabled   = gs.mode !== 'combat';
  if (pauseBtn)  pauseBtn.disabled  = gs.mode !== 'running';
  if (resumeBtn) resumeBtn.disabled = gs.mode === 'running' || gs.mode === 'long_rest';
  if (forceBtn)  forceBtn.disabled  = gs.mode === 'long_rest';
}
