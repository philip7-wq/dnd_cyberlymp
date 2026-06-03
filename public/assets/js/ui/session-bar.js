// ============================================================
// DM Session Bar — fixed bar above the Game-Time Top-Bar
// DM: Start/Stop, editable name, real-time timer, log overlay
// Player: read-only display + Start-Popup with 10min auto-timeout
// ============================================================

import {
  getActiveSession, getRecentSessions, createSession, patchSession,
  endSession, recordSessionResponse, subscribeSessionLog,
} from '../supabase.js';

const POPUP_TIMEOUT_MS = 10 * 60 * 1000;  // 10 Minuten
const POPUP_DISMISS_FLAG = 'lzrv_session_popup_dismissed_';

let _isDm = false;
let _characterId = null;
let _characterName = null;
let _activeSession = null;
let _tickTimer = null;
let _popupEl = null;
let _popupTimeout = null;

export async function mountSessionBar({ isDm = false, characterId = null, characterName = null } = {}) {
  _isDm = !!isDm;
  _characterId = characterId;
  _characterName = characterName;

  document.body.classList.add('has-session-bar');

  const bar = document.createElement('div');
  bar.className = 'session-bar' + (_isDm ? ' is-dm' : '');
  bar.id = 'sessionBar';
  bar.innerHTML = `
    <div class="session-bar-inner">
      <span class="session-dot" id="sessionDot"></span>
      <span class="session-name" id="sessionName" ${_isDm ? 'contenteditable="false"' : ''}>—</span>
      <span class="session-timer" id="sessionTimer">--:--:--</span>
      ${_isDm ? `
        <button class="session-btn session-btn-start" id="sessionStartBtn" type="button">▶ Start Session</button>
        <button class="session-btn session-btn-stop" id="sessionStopBtn" type="button" hidden>■ Stop Session</button>
        <button class="session-btn session-btn-log" id="sessionLogBtn" type="button" title="Vergangene Sessions">📋</button>
      ` : ''}
    </div>
  `;
  document.body.insertBefore(bar, document.body.firstChild);

  if (_isDm) {
    document.getElementById('sessionStartBtn').addEventListener('click', _onStartClick);
    document.getElementById('sessionStopBtn').addEventListener('click', _onStopClick);
    document.getElementById('sessionLogBtn').addEventListener('click', _openLogModal);
    _setupNameEdit();
  }

  _activeSession = await getActiveSession().catch(() => null);
  _render();
  _startTick();

  subscribeSessionLog(payload => {
    const row = payload.new || payload.old;
    if (!row) return;
    if (payload.eventType === 'INSERT' && row.ended_at == null) {
      _activeSession = row;
      _render();
      _maybeShowPlayerPopup();
    } else if (payload.eventType === 'UPDATE') {
      if (_activeSession && row.id === _activeSession.id) {
        _activeSession = row;
        _render();
        if (row.ended_at) _onSessionEnded(row);
      }
    }
  });
}

function _render() {
  const bar = document.getElementById('sessionBar');
  if (!bar) return;
  const active = !!(_activeSession && !_activeSession.ended_at);
  bar.classList.toggle('is-active', active);
  const nameEl = document.getElementById('sessionName');
  if (nameEl) {
    nameEl.textContent = active
      ? (_activeSession.session_name || _defaultName(_activeSession.started_at))
      : (_isDm ? 'Keine Session aktiv' : '—');
  }
  if (_isDm) {
    document.getElementById('sessionStartBtn').hidden = active;
    document.getElementById('sessionStopBtn').hidden = !active;
  }
}

function _startTick() {
  if (_tickTimer) clearInterval(_tickTimer);
  _tickTimer = setInterval(() => {
    const el = document.getElementById('sessionTimer');
    if (!el) return;
    if (_activeSession && !_activeSession.ended_at) {
      const start = new Date(_activeSession.started_at).getTime();
      el.textContent = _formatDuration(Date.now() - start);
    } else {
      el.textContent = '--:--:--';
    }
  }, 1000);
}

function _formatDuration(ms) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function _defaultName(startedAt) {
  const d = new Date(startedAt);
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `Session ${Y}-${M}-${D} ${h}:${m}`;
}

// ── DM Actions ───────────────────────────────────────────────

async function _onStartClick() {
  if (_activeSession && !_activeSession.ended_at) return;
  const name = prompt('Session-Name (optional):', _defaultName(new Date().toISOString()));
  if (name === null) return;
  try {
    _activeSession = await createSession({
      session_name: name?.trim() || _defaultName(new Date().toISOString()),
      created_by: null,  // DM hat keinen character_id
    });
    _render();
  } catch (e) {
    console.error('createSession', e);
    alert('Fehler beim Starten der Session: ' + (e.message || e));
  }
}

async function _onStopClick() {
  if (!_activeSession || _activeSession.ended_at) return;
  if (!confirm(`Session „${_activeSession.session_name || ''}" wirklich beenden?`)) return;
  try {
    _activeSession = await endSession(_activeSession.id);
    _render();
  } catch (e) {
    console.error('endSession', e);
  }
}

function _setupNameEdit() {
  const el = document.getElementById('sessionName');
  if (!el) return;
  el.addEventListener('dblclick', () => {
    if (!_activeSession || _activeSession.ended_at) return;
    el.contentEditable = 'true';
    el.classList.add('editing');
    el.focus();
    document.execCommand?.('selectAll', false, null);
  });
  el.addEventListener('blur', async () => {
    if (el.contentEditable !== 'true') return;
    el.contentEditable = 'false';
    el.classList.remove('editing');
    const name = el.textContent.trim();
    if (!_activeSession || _activeSession.ended_at) return;
    if (!name || name === _activeSession.session_name) {
      el.textContent = _activeSession.session_name || _defaultName(_activeSession.started_at);
      return;
    }
    try {
      _activeSession = await patchSession(_activeSession.id, { session_name: name });
      _render();
    } catch (e) { console.warn('patchSession', e); }
  });
  el.addEventListener('keydown', e => {
    if (el.contentEditable !== 'true') return;
    if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
    if (e.key === 'Escape') {
      el.textContent = _activeSession?.session_name || '';
      el.blur();
    }
  });
}

// ── Player Popup ─────────────────────────────────────────────

function _maybeShowPlayerPopup() {
  if (_isDm || !_activeSession || _activeSession.ended_at) return;
  if (!_characterId) return;
  // Already answered?
  const already = (_activeSession.participants || []).some(p => p.character_id === _characterId);
  if (already) return;
  // Dismissed by user this session-id?
  if (sessionStorage.getItem(POPUP_DISMISS_FLAG + _activeSession.id)) return;
  _showPlayerPopup();
}

function _showPlayerPopup() {
  if (_popupEl) return;
  const overlay = document.createElement('div');
  overlay.className = 'session-popup-overlay';
  overlay.innerHTML = `
    <div class="session-popup-box">
      <div class="session-popup-title">SESSION GESTARTET</div>
      <div class="session-popup-name">${_escape(_activeSession.session_name || _defaultName(_activeSession.started_at))}</div>
      <div class="session-popup-desc">Der DM hat eine Session gestartet. Spielst du mit?</div>
      <div class="session-popup-btns">
        <button class="session-popup-btn join" id="sessionPopupJoin">Ja, ich bin dabei</button>
        <button class="session-popup-btn decline" id="sessionPopupDecline">Nicht diesmal</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  _popupEl = overlay;
  document.getElementById('sessionPopupJoin').addEventListener('click', () => _answerPopup('joined'));
  document.getElementById('sessionPopupDecline').addEventListener('click', () => _answerPopup('declined'));
  if (_popupTimeout) clearTimeout(_popupTimeout);
  _popupTimeout = setTimeout(() => _answerPopup('timeout'), POPUP_TIMEOUT_MS);
}

async function _answerPopup(response) {
  if (_popupTimeout) { clearTimeout(_popupTimeout); _popupTimeout = null; }
  if (_popupEl) { _popupEl.remove(); _popupEl = null; }
  if (!_activeSession) return;
  sessionStorage.setItem(POPUP_DISMISS_FLAG + _activeSession.id, '1');
  try {
    await recordSessionResponse(_activeSession.id, {
      character_id: _characterId,
      name: _characterName || 'Unbekannt',
      response,
    });
  } catch (e) { console.warn('recordSessionResponse', e); }
}

function _onSessionEnded(row) {
  if (_popupEl) { _popupEl.remove(); _popupEl = null; }
  if (_popupTimeout) { clearTimeout(_popupTimeout); _popupTimeout = null; }
  if (!_isDm) _showToast('Session beendet');
  // Bar auf inaktiv zurücksetzen
  setTimeout(() => { _activeSession = null; _render(); }, 1500);
}

function _showToast(msg) {
  const t = document.createElement('div');
  t.className = 'session-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 400);
  }, 4000);
}

// ── DM Log Modal ─────────────────────────────────────────────

async function _openLogModal() {
  const sessions = await getRecentSessions(50).catch(() => []);
  const overlay = document.createElement('div');
  overlay.className = 'session-log-overlay';
  overlay.innerHTML = `
    <div class="session-log-box">
      <div class="session-log-head">
        <div class="session-log-title">Vergangene Sessions</div>
        <button class="session-log-close" type="button">×</button>
      </div>
      <div class="session-log-list">
        ${sessions.length ? sessions.map(_rowHtml).join('') : '<div class="session-log-empty">Noch keine Sessions.</div>'}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('.session-log-close').addEventListener('click', () => overlay.remove());
}

function _rowHtml(s) {
  const start = new Date(s.started_at);
  const end = s.ended_at ? new Date(s.ended_at) : null;
  const dur = end ? _formatDuration(end.getTime() - start.getTime()) : '— läuft —';
  const parts = (s.participants || []);
  const partsHtml = parts.length
    ? parts.map(p => `<span class="sl-part sl-part-${p.response}">${_escape(p.name)}: ${p.response}</span>`).join(' ')
    : '<span class="sl-empty">keine Antworten</span>';
  return `
    <div class="session-log-row">
      <div class="sl-row-head">
        <span class="sl-name">${_escape(s.session_name || '(unbenannt)')}</span>
        <span class="sl-date">${start.toLocaleString()}</span>
        <span class="sl-dur">${dur}</span>
      </div>
      <div class="sl-parts">${partsHtml}</div>
    </div>
  `;
}

function _escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
