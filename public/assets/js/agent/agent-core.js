// ============================================================
// iCHOOM Agent — Core
// UI shell, boot/shutdown, sound, state, app routing
// ============================================================

import { supabase } from '../supabase.js';

// ---------- SOUND ----------
// Pfade anpassen, sobald die Dateinamen feststehen
export const SOUNDS = {
  base: '/assets/sounds/agent/',
  files: {
    boot:         'boot.mp3',
    shutdown:     'shutdown.mp3',
    ringtone:     'ringtone.mp3',
    notification: 'notification.mp3',
    tap:          'tap.mp3',         // optional UI click
    send:         'send.mp3',        // optional message sent
  }
};

// Per-key active instance (for stop/loop control)
const audioActive = {};

export function playSound(key, { loop = false, volume = 0.6 } = {}) {
  const file = SOUNDS.files[key];
  if (!file) return null;
  // Stop any existing instance for this key
  if (audioActive[key]) {
    try { audioActive[key].pause(); audioActive[key].currentTime = 0; } catch {}
  }
  try {
    const a = new Audio(SOUNDS.base + file);
    a.loop   = loop;
    a.volume = volume;
    audioActive[key] = a;
    a.play().catch(e => console.warn('[agent sound]', key, e.message));
    return a;
  } catch(e) {
    console.warn('[agent sound]', key, e);
    return null;
  }
}

export function stopSound(key) {
  const a = audioActive[key];
  if (!a) return;
  try { a.pause(); a.currentTime = 0; } catch {}
  delete audioActive[key];
}

// ---------- STATE ----------
export const agentState = {
  mode: 'player',        // 'player' | 'dm'
  characterId: null,     // current player's id (player mode)
  characterName: null,
  activeIdentity: null,  // { type: 'player'|'npc', id, name, avatarUrl }
  currentApp: null,
  currentThreadId: null,
  contacts: [],
  threads: [],
  unread: { 'chrome-chat': 0, 'calljack': 0, 'eddiewire': 0 },
  inCall: null,          // active call object
  callTimer: null,
  pendingTransfers: 0,
  channels: [],
};

// ---------- HTML TEMPLATE ----------
const PHONE_HTML = `
<div class="agent-bar" id="agent-bar">
  <div class="agent-bar-logo">iCHOOM</div>
  <div class="agent-bar-meta">
    <span class="agent-bar-time" id="agent-bar-time">--:--</span>
    <span class="agent-bar-date" id="agent-bar-date">--.--.----</span>
  </div>
  <span class="agent-bar-notif" id="agent-bar-notif">0</span>
</div>

<div class="agent-phone" id="agent-phone">
  <div class="agent-phone-frame">
    <div class="agent-status-bar">
      <span class="agent-time" id="agent-time">--:--</span>
      <span class="agent-date" id="agent-date">--.--.----</span>
      <span class="agent-signal">●●●●</span>
    </div>

    <div class="agent-boot-overlay" id="agent-boot">
      <div class="agent-boot-logo">iCHOOM</div>
      <div class="agent-boot-line">SYSTEM INITIALIZING…</div>
      <div class="agent-boot-bar"><div></div></div>
    </div>

    <div class="agent-shutdown-overlay" id="agent-shutdown"></div>

    <div class="agent-app-container" id="agent-app-container">

      <!-- HOME -->
      <div class="agent-app-view agent-home" id="agent-home" data-view="home">
        <div class="app-icon" data-app="chrome-chat">
          <div class="app-icon-glyph">CC</div>
          <div class="app-icon-name">Chrome Chat</div>
          <span class="app-badge" id="badge-chrome-chat">0</span>
        </div>
        <div class="app-icon" data-app="calljack">
          <div class="app-icon-glyph">☏</div>
          <div class="app-icon-name">CallJack</div>
          <span class="app-badge" id="badge-calljack">0</span>
        </div>
        <div class="app-icon" data-app="contacts">
          <div class="app-icon-glyph">⌬</div>
          <div class="app-icon-name">Kontakte</div>
        </div>
        <div class="app-icon" data-app="eddiewire">
          <div class="app-icon-glyph">€$</div>
          <div class="app-icon-name">EddieWire</div>
          <span class="app-badge" id="badge-eddiewire">0</span>
        </div>
      </div>

      <!-- App views injected by agent-apps.js -->
      <div class="agent-app-view" id="app-chrome-chat" data-view="chrome-chat" hidden></div>
      <div class="agent-app-view" id="app-calljack"    data-view="calljack" hidden></div>
      <div class="agent-app-view" id="app-contacts"    data-view="contacts" hidden></div>
      <div class="agent-app-view" id="app-eddiewire"   data-view="eddiewire" hidden></div>

    </div>

    <div class="agent-home-btn" id="agent-home-btn" title="Home"></div>
  </div>
</div>

<!-- Incoming-call overlay (separate, on top of phone) -->
<div class="agent-incoming-call" id="agent-incoming-call">
  <div class="label">Eingehender Anruf</div>
  <div class="agent-avatar" id="incoming-avatar"></div>
  <div class="caller-name" id="incoming-name">—</div>
  <div class="agent-call-controls">
    <button class="agent-call-btn hangup" id="incoming-decline" title="Ablehnen">✕</button>
    <button class="agent-call-btn accept" id="incoming-accept" title="Annehmen">☏</button>
  </div>
</div>
`;

// ---------- UI: BOOT / SHUTDOWN ----------
export async function bootAgent() {
  const phone = document.getElementById('agent-phone');
  const boot  = document.getElementById('agent-boot');
  if (!phone) return;
  boot.classList.remove('gone');
  phone.classList.add('open');
  playSound('boot');
  await new Promise(r => setTimeout(r, 1500));
  boot.classList.add('gone');
}

export async function shutdownAgent() {
  const phone = document.getElementById('agent-phone');
  const shut  = document.getElementById('agent-shutdown');
  if (!phone) return;
  shut.classList.add('active');
  playSound('shutdown');
  await new Promise(r => setTimeout(r, 380));
  phone.classList.remove('open');
  shut.classList.remove('active');
  // reset to home
  setTimeout(() => showApp('home'), 400);
}

// ---------- UI: APP ROUTING ----------
export function showApp(name) {
  agentState.currentApp = name;
  const views = document.querySelectorAll('.agent-app-view');
  views.forEach(v => v.hidden = (v.dataset.view !== name));
  // Reset thread when leaving chat
  if (name !== 'chrome-chat') agentState.currentThreadId = null;
}

// ---------- UI: CLOCK ----------
function tickClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  const dd = String(now.getDate()).padStart(2,'0');
  const mo = String(now.getMonth()+1).padStart(2,'0');
  const yr = now.getFullYear() + 20; // 2045 vibes
  const time = `${hh}:${mm}`;
  const date = `${dd}.${mo}.${yr}`;
  const t1 = document.getElementById('agent-time');
  const d1 = document.getElementById('agent-date');
  const t2 = document.getElementById('agent-bar-time');
  const d2 = document.getElementById('agent-bar-date');
  if (t1) t1.textContent = time;
  if (d1) d1.textContent = date;
  if (t2) t2.textContent = time;
  if (d2) d2.textContent = date;
}

// ---------- UI: NOTIFICATIONS / BADGES ----------
export function setBadge(app, count) {
  agentState.unread[app] = count;
  const el = document.getElementById('badge-' + app);
  if (el) {
    el.textContent = count;
    el.classList.toggle('show', count > 0);
  }
  refreshBarBadge();
}
function refreshBarBadge() {
  const total = Object.values(agentState.unread).reduce((a,b) => a+b, 0);
  const bar = document.getElementById('agent-bar-notif');
  if (!bar) return;
  bar.textContent = total;
  bar.classList.toggle('show', total > 0);
}

export function notify(app, sound = true) {
  setBadge(app, (agentState.unread[app] || 0) + 1);
  if (sound) playSound('notification', { volume: 0.5 });
}

// ---------- AVATAR HELPER ----------
export function renderAvatar(el, contact) {
  if (!el) return;
  if (contact?.avatar_url || contact?.image_url) {
    el.style.backgroundImage = `url(${contact.avatar_url || contact.image_url})`;
    el.textContent = '';
  } else {
    el.style.backgroundImage = '';
    el.textContent = (contact?.display_name || contact?.name || '?').slice(0,1).toUpperCase();
  }
}

export function initialsAvatar(name) {
  return (name || '?').slice(0,1).toUpperCase();
}

// ---------- INIT (PLAYER MODE) ----------
export async function initAgent({ characterId, characterName }) {
  agentState.mode = 'player';
  agentState.characterId = characterId;
  agentState.characterName = characterName;
  agentState.activeIdentity = { type: 'player', id: characterId, name: characterName };

  // Inject HTML
  const wrap = document.createElement('div');
  wrap.id = 'agent-root';
  wrap.innerHTML = PHONE_HTML;
  document.body.appendChild(wrap);

  // Clock
  tickClock();
  setInterval(tickClock, 1000 * 30);

  // Bar click → boot
  document.getElementById('agent-bar').addEventListener('click', async () => {
    playSound('tap', { volume: 0.3 });
    await bootAgent();
  });

  // Home button click → shutdown (when on home) or back to home
  document.getElementById('agent-home-btn').addEventListener('click', async () => {
    if (agentState.currentApp === 'home' || agentState.currentApp === null) {
      await shutdownAgent();
    } else {
      playSound('tap', { volume: 0.3 });
      showApp('home');
    }
  });

  // App icon clicks
  document.querySelectorAll('.app-icon').forEach(icon => {
    icon.addEventListener('click', () => {
      playSound('tap', { volume: 0.3 });
      const app = icon.dataset.app;
      showApp(app);
      setBadge(app, 0); // clear badge on open
      // Lazy refresh from app modules
      window.dispatchEvent(new CustomEvent('agent:app-opened', { detail: { app } }));
    });
  });

  // Incoming call buttons (wired in agent-apps.js calls module)
  showApp('home');

  // Realtime subscriptions
  await setupPlayerRealtime();

  // Initial data
  window.dispatchEvent(new CustomEvent('agent:ready'));
}

// ---------- INIT (DM MODE) ----------
// DM panel rendered by agent-dm.js (uses different structure with tabs)
export function getActiveIdentity() { return agentState.activeIdentity; }
export function setActiveIdentity(identity) {
  agentState.activeIdentity = identity;
  window.dispatchEvent(new CustomEvent('agent:identity-changed', { detail: identity }));
}

// ---------- REALTIME (player mode) ----------
async function setupPlayerRealtime() {
  const cid = agentState.characterId;
  if (!cid) return;

  // We subscribe to everything in agent_* tables and filter client-side
  // (small player count makes this fine).

  // Messages
  const mChan = supabase.channel('agent-msg-' + cid)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_messages' },
        (payload) => onIncomingMessage(payload.new))
    .subscribe();

  // Calls
  const cChan = supabase.channel('agent-call-' + cid)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_calls' },
        (payload) => onCallChange(payload))
    .subscribe();

  // Transfers
  const tChan = supabase.channel('agent-trf-' + cid)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_transfers' },
        (payload) => onTransferChange(payload))
    .subscribe();

  // Contacts
  const ctChan = supabase.channel('agent-ct-' + cid)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_contacts' },
        () => window.dispatchEvent(new CustomEvent('agent:contacts-changed')))
    .subscribe();

  agentState.channels.push(mChan, cChan, tChan, ctChan);
}

function isParticipant(row, type, id) {
  return (row.a_type === type && row.a_id === id) || (row.b_type === type && row.b_id === id)
      || (row.sender_type === type && row.sender_id === id)
      || (row.recipient_type === type && row.recipient_id === id)
      || (row.caller_type === type && row.caller_id === id)
      || (row.callee_type === type && row.callee_id === id);
}

async function onIncomingMessage(msg) {
  // Is this message for the current player?
  const meId = agentState.characterId;
  const { data: thread } = await supabase.from('agent_threads').select('*').eq('id', msg.thread_id).single();
  if (!thread) return;

  const involvesMe = (thread.a_type === 'player' && thread.a_id === meId)
                  || (thread.b_type === 'player' && thread.b_id === meId);
  if (!involvesMe) return;

  // Don't notify own messages
  if (msg.sender_type === 'player' && msg.sender_id === meId) {
    window.dispatchEvent(new CustomEvent('agent:message', { detail: { msg, thread } }));
    return;
  }

  // Notify
  notify('chrome-chat');
  window.dispatchEvent(new CustomEvent('agent:message', { detail: { msg, thread } }));
}

async function onCallChange({ eventType, new: row, old }) {
  const meId = agentState.characterId;
  const me = { type: 'player', id: meId };
  const involvesMe = (row.caller_type === me.type && row.caller_id === me.id)
                  || (row.callee_type === me.type && row.callee_id === me.id);
  if (!involvesMe) return;

  window.dispatchEvent(new CustomEvent('agent:call-change', { detail: { eventType, row, old } }));

  // Incoming ring (I'm the callee, status=ringing)
  if (eventType === 'INSERT' && row.status === 'ringing'
      && row.callee_type === 'player' && row.callee_id === meId) {
    window.dispatchEvent(new CustomEvent('agent:incoming-call', { detail: row }));
  }
}

async function onTransferChange({ eventType, new: row }) {
  const meId = agentState.characterId;
  const involvesMe = (row.sender_type === 'player' && row.sender_id === meId)
                  || (row.recipient_type === 'player' && row.recipient_id === meId);
  if (!involvesMe) return;

  // Notify recipient on new incoming send (auto) or pending request
  const meIsRecipient = row.recipient_type === 'player' && row.recipient_id === meId;
  const meIsSender    = row.sender_type === 'player' && row.sender_id === meId;

  if (eventType === 'INSERT') {
    if (row.direction === 'send' && meIsRecipient) {
      notify('eddiewire');
    } else if (row.direction === 'request' && meIsRecipient && row.status === 'pending') {
      notify('eddiewire');
    }
  }

  window.dispatchEvent(new CustomEvent('agent:transfer-change', { detail: { eventType, row } }));
}

// ---------- HELPERS ----------
export async function getOrCreateThread(otherType, otherId) {
  const me = agentState.activeIdentity;
  const { data, error } = await supabase.rpc('agent_get_or_create_thread', {
    p1_type: me.type, p1_id: me.id,
    p2_type: otherType, p2_id: otherId
  });
  if (error) { console.error(error); return null; }
  return data;
}

export function formatRelativeTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'jetzt';
  if (diff < 3600) return Math.floor(diff/60) + ' Min';
  if (diff < 86400) return Math.floor(diff/3600) + ' Std';
  const dd = String(d.getDate()).padStart(2,'0');
  const mo = String(d.getMonth()+1).padStart(2,'0');
  return `${dd}.${mo}.`;
}

export function formatTime(ts) {
  const d = new Date(ts);
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

export function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
