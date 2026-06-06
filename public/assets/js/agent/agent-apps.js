// ============================================================
// iCHOOM Agent — Apps
// Contacts · Chrome Chat · CallJack · EddieWire
// ============================================================

import { supabase } from '../supabase.js';
import {
  agentState, showApp, notify, setBadge,
  renderAvatar, formatRelativeTime, formatTime, formatDuration,
  getOrCreateThread, getActiveIdentity, playSound, stopSound
} from './agent-core.js';

// ============================================================
// CONTACTS APP
// ============================================================
function renderContactsApp() {
  const v = document.getElementById('app-contacts');
  v.innerHTML = `
    <div class="agent-app-header">
      <span class="agent-back" data-back>‹</span>
      <span class="agent-app-title">Kontakte</span>
      <span class="agent-app-action" id="contacts-add">+ Code</span>
    </div>
    <div class="agent-list" id="contacts-list"></div>
  `;
  v.querySelector('[data-back]').addEventListener('click', () => showApp('home'));
  v.querySelector('#contacts-add').addEventListener('click', openAddContactModal);
  refreshContacts();
}

async function refreshContacts() {
  const me = getActiveIdentity();
  if (!me) return;  // keine aktive Identität (z.B. DM ohne gewählte NPC-Identität) → Leerzustand

  // DM mode (NPC identity): show all players as contacts
  if (me.type === 'npc') {
    const { data: chars } = await supabase
      .from('characters')
      .select('id, handle, name, image_url')
      .order('name');
    agentState.contacts = (chars || []).map(c => ({
      id: c.id,
      contact_type: 'player',
      contact_player_id: c.id,
      contact_npc_id: null,
      display_name: c.handle || c.name || '?',
      avatar_url: c.image_url,
    }));
    const list = document.getElementById('contacts-list');
    if (list) {
      if (!agentState.contacts.length) {
        list.innerHTML = `<div class="agent-empty"><div class="agent-empty-glyph">⌬</div>Keine Spieler gefunden.</div>`;
      } else {
        list.innerHTML = agentState.contacts.map(c => `
          <div class="agent-list-item" data-type="${c.contact_type}" data-ref="${c.contact_player_id}">
            <div class="agent-avatar" ${c.avatar_url ? `style="background-image:url(${c.avatar_url})"` : ''}>${c.avatar_url ? '' : (c.display_name||'?').slice(0,1).toUpperCase()}</div>
            <div class="agent-list-body">
              <div class="agent-list-name">${c.display_name}</div>
              <div class="agent-list-tag">PLAYER</div>
            </div>
          </div>`).join('');
        list.querySelectorAll('.agent-list-item').forEach(el => {
          el.addEventListener('click', () => openContactDetail(el.dataset.type, el.dataset.ref));
        });
      }
    }
    return;
  }

  if (me.type !== 'player') return;

  // Always fetch all other players directly from characters table
  const { data: chars } = await supabase
    .from('characters')
    .select('id, handle, name, image_url')
    .neq('id', me.id)
    .order('name');

  // Fetch only NPC contacts (added via code)
  const { data: npcContacts } = await supabase
    .from('agent_contacts')
    .select('*')
    .eq('owner_character_id', me.id)
    .eq('contact_type', 'npc')
    .order('display_name');

  // Build unified contact list for agentState (used by calljack/eddiewire pickers)
  const playerContacts = (chars || []).map(c => ({
    id: c.id,
    contact_type: 'player',
    contact_player_id: c.id,
    contact_npc_id: null,
    display_name: c.handle || c.name || '?',
    avatar_url: c.image_url,
  }));
  agentState.contacts = [...playerContacts, ...(npcContacts || [])];

  const list = document.getElementById('contacts-list');
  if (!list) return;

  if (!agentState.contacts.length) {
    list.innerHTML = `<div class="agent-empty"><div class="agent-empty-glyph">⌬</div>Keine Kontakte.</div>`;
    return;
  }

  const renderItem = (c) => `
    <div class="agent-list-item" data-type="${c.contact_type}" data-ref="${c.contact_player_id || c.contact_npc_id}">
      <div class="agent-avatar" ${c.avatar_url ? `style="background-image:url(${c.avatar_url})"` : ''}>
        ${c.avatar_url ? '' : (c.display_name || '?').slice(0,1).toUpperCase()}
      </div>
      <div class="agent-list-body">
        <div class="agent-list-name">${c.display_name}</div>
        <div class="agent-list-tag ${c.contact_type === 'npc' ? 'npc' : ''}">${c.contact_type === 'npc' ? 'NPC' : 'PLAYER'}</div>
      </div>
    </div>`;

  list.innerHTML = agentState.contacts.map(renderItem).join('');

  list.querySelectorAll('.agent-list-item').forEach(el => {
    el.addEventListener('click', () => openContactDetail(el.dataset.type, el.dataset.ref));
  });
}

function openContactDetail(type, id) {
  const c = agentState.contacts.find(x => (x.contact_player_id === id) || (x.contact_npc_id === id));
  if (!c) return;

  // Modal: chat / call / pay
  const modal = document.createElement('div');
  modal.className = 'agent-modal';
  modal.innerHTML = `
    <div class="agent-modal-body" style="text-align:center;">
      <div class="agent-avatar" style="margin: 0 auto 12px; width:70px; height:70px; font-size:22px; ${c.avatar_url ? `background-image:url(${c.avatar_url})` : ''}">
        ${c.avatar_url ? '' : (c.display_name || '?').slice(0,1).toUpperCase()}
      </div>
      <h3 style="text-align:center;">${c.display_name}</h3>
      <div class="agent-modal-actions" style="flex-direction: column; gap: 8px;">
        <button class="primary" data-act="chat"><svg class="ic" aria-hidden="true"><use href="/assets/icons/cyber-icons.svg#ic-chat"/></svg> Nachricht</button>
        <button data-act="call">☏ Anrufen</button>
        <button data-act="pay">€$ Geld senden</button>
        <button data-act="close" style="margin-top:6px;">Schließen</button>
      </div>
    </div>`;
  document.getElementById('agent-app-container').appendChild(modal);

  modal.addEventListener('click', (e) => {
    const act = e.target.dataset?.act;
    if (!act) return;
    modal.remove();
    if (act === 'chat')      openChatWith(type, id);
    else if (act === 'call') openCallWith(type, id);
    else if (act === 'pay')  openTransferForm(type, id);
  });
}

function openAddContactModal() {
  const modal = document.createElement('div');
  modal.className = 'agent-modal';
  modal.innerHTML = `
    <div class="agent-modal-body">
      <h3>Kontakt hinzufügen</h3>
      <label>NPC-Code</label>
      <input id="add-code" placeholder="z.B. NX-7421" autocomplete="off">
      <div id="add-error" style="color:var(--agent-danger); font-size:11px; margin-top:6px;"></div>
      <div class="agent-modal-actions">
        <button data-act="cancel">Abbrechen</button>
        <button class="primary" data-act="add">Hinzufügen</button>
      </div>
    </div>`;
  document.getElementById('agent-app-container').appendChild(modal);

  modal.addEventListener('click', async (e) => {
    if (e.target.dataset?.act === 'cancel') return modal.remove();
    if (e.target.dataset?.act !== 'add') return;

    const code = modal.querySelector('#add-code').value.trim();
    const errEl = modal.querySelector('#add-error');
    if (!code) { errEl.textContent = 'Bitte Code eingeben.'; return; }

    const { data: codeRow, error } = await supabase
      .from('agent_npc_codes').select('*').eq('code', code).maybeSingle();
    if (error || !codeRow) { errEl.textContent = 'Ungültiger Code.'; return; }

    const me = getActiveIdentity();
    if (!me) { errEl.textContent = 'Keine aktive Identität.'; return; }
    const { error: insErr } = await supabase.from('agent_contacts').insert({
      owner_character_id: me.id,
      contact_type: 'npc',
      contact_npc_id: codeRow.npc_id,
      display_name: codeRow.display_name,
      avatar_url: codeRow.avatar_url
    });
    if (insErr && !insErr.message.includes('duplicate')) { errEl.textContent = insErr.message; return; }

    modal.remove();
    refreshContacts();
  });
}

// ============================================================
// CHROME CHAT APP
// ============================================================
function renderChromeChatApp() {
  const v = document.getElementById('app-chrome-chat');
  v.innerHTML = `<div id="cc-main"></div>`;
  renderThreadList();
}

async function renderThreadList() {
  agentState.currentThreadId = null;
  const main = document.getElementById('cc-main');
  if (!main) return;

  main.innerHTML = `
    <div class="agent-app-header">
      <span class="agent-back" id="cc-back-home">‹</span>
      <span class="agent-app-title">Chrome Chat</span>
    </div>
    <div id="cc-list-wrap" style="flex:1;min-height:0;overflow-y:auto;"></div>`;
  main.querySelector('#cc-back-home').addEventListener('click', () => showApp('home'));
  const listWrap = main.querySelector('#cc-list-wrap');

  const me = getActiveIdentity();
  if (!me) return;  // keine aktive Identität → leere Thread-Liste
  const [{ data: asA }, { data: asB }] = await Promise.all([
    supabase.from('agent_threads').select('*').eq('a_type', me.type).eq('a_id', me.id),
    supabase.from('agent_threads').select('*').eq('b_type', me.type).eq('b_id', me.id),
  ]);
  const threads = [...(asA || []), ...(asB || [])]
    .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

  if (!threads.length) {
    listWrap.innerHTML = `<div class="agent-empty"><div class="agent-empty-glyph">CC</div>Keine Chats.<br>Wähle einen Kontakt.</div>`;
    return;
  }

  // For each thread, get other participant info + last message
  const items = await Promise.all(threads.map(async t => {
    const otherType = (t.a_type === me.type && t.a_id === me.id) ? t.b_type : t.a_type;
    const otherId   = (t.a_type === me.type && t.a_id === me.id) ? t.b_id   : t.a_id;
    let name = '?', avatar = null;
    if (otherType === 'player') {
      const { data: p } = await supabase.from('characters').select('handle, name, image_url').eq('id', otherId).maybeSingle();
      name = p?.handle || p?.name || '?';
      avatar = p?.image_url;
    } else {
      const { data: n } = await supabase.from('npcs').select('name, image_url').eq('id', otherId).maybeSingle();
      name = n?.name || '?';
      avatar = n?.image_url;
    }
    const { data: last } = await supabase.from('agent_messages')
      .select('content, created_at, sender_type, sender_id')
      .eq('thread_id', t.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    return { thread: t, otherType, otherId, name, avatar, last };
  }));

  listWrap.innerHTML = `<div class="agent-list">${items.map(it => `
    <div class="agent-list-item" data-thread="${it.thread.id}" data-other-type="${it.otherType}" data-other-id="${it.otherId}" data-name="${it.name.replace(/"/g,'&quot;')}" data-avatar="${it.avatar || ''}">
      <div class="agent-avatar" ${it.avatar ? `style="background-image:url(${it.avatar})"` : ''}>${it.avatar ? '' : it.name.slice(0,1).toUpperCase()}</div>
      <div class="agent-list-body">
        <div class="agent-list-name">${it.name}</div>
        <div class="agent-list-sub">${it.last?.content?.slice(0, 40) || '—'}</div>
      </div>
      <div class="agent-list-meta">${it.last ? formatRelativeTime(it.last.created_at) : ''}</div>
    </div>
  `).join('')}</div>`;

  listWrap.querySelectorAll('.agent-list-item').forEach(el => {
    el.addEventListener('click', () => openChatThread(
      el.dataset.thread, el.dataset.otherType, el.dataset.otherId,
      el.dataset.name, el.dataset.avatar
    ));
  });
}

async function openChatWith(otherType, otherId) {
  showApp('chrome-chat');
  const threadId = await getOrCreateThread(otherType, otherId);
  let name = '?', avatar = null;
  if (otherType === 'player') {
    const { data: p } = await supabase.from('characters').select('handle, name, image_url').eq('id', otherId).maybeSingle();
    name = p?.handle || p?.name || '?'; avatar = p?.image_url;
  } else {
    const { data: n } = await supabase.from('npcs').select('name, image_url').eq('id', otherId).maybeSingle();
    name = n?.name || '?'; avatar = n?.image_url;
  }
  openChatThread(threadId, otherType, otherId, name, avatar);
}

async function openChatThread(threadId, otherType, otherId, name, avatar) {
  agentState.currentThreadId = threadId;
  const main = document.getElementById('cc-main');
  main.innerHTML = `
    <div class="agent-app-header">
      <span class="agent-back" id="cc-back">‹</span>
      <div class="agent-avatar" style="width:32px;height:32px;font-size:12px;${avatar ? `background-image:url(${avatar})` : ''}">${avatar ? '' : name.slice(0,1).toUpperCase()}</div>
      <span class="agent-app-title" style="font-size:13px;">${name}</span>
    </div>
    <div class="agent-chat-stream" id="cc-stream" style="flex:1;min-height:0;"></div>
    <div class="agent-chat-composer">
      <input id="cc-input" placeholder="Nachricht…" autocomplete="off">
      <button id="cc-send">↑</button>
    </div>
  `;
  main.querySelector('#cc-back').addEventListener('click', () => renderThreadList());

  await refreshChatStream(threadId);

  const inp = main.querySelector('#cc-input');
  const send = async () => {
    const txt = inp.value.trim();
    if (!txt) return;
    inp.value = '';
    const me = getActiveIdentity();
    if (!me) return;
    await supabase.from('agent_messages').insert({
      thread_id: threadId,
      sender_type: me.type,
      sender_id: me.id,
      content: txt
    });
    playSound('send', { volume: 0.4 });
  };
  main.querySelector('#cc-send').addEventListener('click', send);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
  inp.focus();
}

async function refreshChatStream(threadId) {
  const stream = document.getElementById('cc-stream');
  if (!stream) return;
  const { data: msgs } = await supabase.from('agent_messages')
    .select('*').eq('thread_id', threadId).order('created_at');
  const me = getActiveIdentity();
  if (!me) return;
  stream.innerHTML = (msgs || []).map(m => {
    const out = (m.sender_type === me.type && m.sender_id === me.id);
    return `
      <div class="agent-chat-bubble ${out ? 'out' : 'in'}">${escapeHtml(m.content || '')}</div>
      <div class="agent-chat-time ${out ? 'out' : 'in'}">${formatTime(m.created_at)}</div>
    `;
  }).join('');
  stream.scrollTop = stream.scrollHeight;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

// In-app toast notification
function showAgentToast(senderName, snippet) {
  const existing = document.getElementById('agent-toast');
  if (existing) existing.remove();
  const frame = document.querySelector('.agent-phone-frame') || document.querySelector('.agent-dm-phone');
  if (!frame) return;
  const toast = document.createElement('div');
  toast.id = 'agent-toast';
  toast.className = 'agent-toast';
  toast.innerHTML = `<span class="agent-toast-name">${escapeHtml(senderName)}</span><span class="agent-toast-msg">${escapeHtml(snippet.slice(0, 60))}</span>`;
  frame.appendChild(toast);
  requestAnimationFrame(() => { requestAnimationFrame(() => toast.classList.add('show')); });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// React to realtime
window.addEventListener('agent:message', async (e) => {
  const { msg, thread } = e.detail;
  const me = getActiveIdentity();
  if (!me) return;
  const isOwn = msg.sender_type === me.type && msg.sender_id === me.id;

  if (agentState.currentThreadId === thread.id) {
    // Open thread — just refresh stream
    refreshChatStream(thread.id);
    if (!isOwn) supabase.from('agent_messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id);
  } else {
    // Different thread or different app — show toast if phone is open
    if (!isOwn) {
      const phoneOpen = document.getElementById('agent-phone')?.classList.contains('open')
                     || document.getElementById('agent-dm-phone')?.classList.contains('open');
      if (phoneOpen) {
        // Resolve sender name for toast
        let senderName = msg.sender_type === 'npc' ? 'NPC' : 'Spieler';
        if (msg.sender_type === 'player') {
          const { data: p } = await supabase.from('characters').select('handle,name').eq('id', msg.sender_id).maybeSingle();
          senderName = p?.handle || p?.name || senderName;
        } else {
          const { data: n } = await supabase.from('npcs').select('name').eq('id', msg.sender_id).maybeSingle();
          senderName = n?.name || senderName;
        }
        showAgentToast(senderName, msg.content || '—');
      }
    }
    if (agentState.currentApp === 'chrome-chat') renderThreadList();
  }
});

// ============================================================
// CALLJACK APP
// ============================================================
function renderCallJackApp() {
  const v = document.getElementById('app-calljack');
  const isDmMode = agentState.mode === 'dm';
  v.innerHTML = `
    <div class="agent-app-header">
      <span class="agent-back" data-back>‹</span>
      <span class="agent-app-title">CallJack</span>
      <span class="agent-app-action" id="cj-new">+ Anruf</span>
      ${isDmMode ? '<span class="agent-app-action" id="cj-group" style="margin-left:.5rem;">👥 Gruppe</span>' : ''}
    </div>
    <div class="agent-list" id="cj-list"></div>
    <div class="agent-call-active hidden" id="cj-active">
      <div class="agent-avatar" id="cj-active-avatar"></div>
      <div class="name" id="cj-active-name">—</div>
      <div class="state" id="cj-active-state">Verbinde…</div>
      <div class="timer" id="cj-active-timer" style="display:none;">00:00</div>
      <div class="agent-call-controls">
        <button class="agent-call-btn hangup" id="cj-hangup">✕</button>
      </div>
    </div>
  `;
  v.querySelector('[data-back]').addEventListener('click', () => showApp('home'));
  v.querySelector('#cj-new').addEventListener('click', openCallContactPicker);
  v.querySelector('#cj-hangup').addEventListener('click', hangupCall);
  if (isDmMode) v.querySelector('#cj-group').addEventListener('click', openGroupCallPicker);
  refreshCallHistory();
}

// ── Group Call (DM only) ────────────────────────────────────
function openGroupCallPicker() {
  const modal = document.createElement('div');
  modal.className = 'agent-modal';
  modal.innerHTML = `
    <div class="agent-modal-body" style="max-height:80%; overflow-y:auto;">
      <h3>Gruppen-Anruf starten</h3>
      <p style="font-size:.8rem; color:var(--agent-muted, #888); margin: 0 0 .8rem 0;">
        Teilnehmer auswählen — alle bekommen gleichzeitig einen Anruf.
      </p>
      <div id="cj-group-list"></div>
      <div class="agent-modal-actions" style="margin-top:.8rem;">
        <button data-act="cancel">Abbrechen</button>
        <button class="primary" data-act="start" id="cj-group-start" disabled>Anruf starten</button>
      </div>
    </div>`;
  document.getElementById('agent-app-container').appendChild(modal);

  const list = modal.querySelector('#cj-group-list');
  list.innerHTML = agentState.contacts.map(c => {
    const id = c.contact_player_id || c.contact_npc_id;
    return `
      <label class="agent-list-item" style="cursor:pointer;">
        <input type="checkbox" class="cj-group-check" data-type="${c.contact_type}" data-ref="${id}" data-name="${(c.display_name || '').replace(/"/g,'&quot;')}" data-avatar="${c.avatar_url || ''}" style="width:18px; height:18px; margin-right:.6rem;">
        <div class="agent-avatar" ${c.avatar_url ? `style="background-image:url(${c.avatar_url})"` : ''}>${c.avatar_url ? '' : (c.display_name || '?').slice(0,1).toUpperCase()}</div>
        <div class="agent-list-body"><div class="agent-list-name">${c.display_name}</div></div>
      </label>
    `;
  }).join('') || '<div class="agent-empty">Keine Kontakte.</div>';

  const startBtn = modal.querySelector('#cj-group-start');
  const checks = modal.querySelectorAll('.cj-group-check');
  const updateBtn = () => {
    const n = Array.from(checks).filter(c => c.checked).length;
    startBtn.disabled = n < 2;
    startBtn.textContent = n >= 2 ? `Anruf starten (${n})` : 'Anruf starten';
  };
  checks.forEach(c => c.addEventListener('change', updateBtn));

  modal.addEventListener('click', e => {
    if (e.target.dataset?.act === 'cancel') modal.remove();
  });
  startBtn.addEventListener('click', async () => {
    const targets = Array.from(checks).filter(c => c.checked).map(c => ({
      type: c.dataset.type, id: c.dataset.ref, name: c.dataset.name, avatar: c.dataset.avatar,
    }));
    modal.remove();
    await startGroupCall(targets);
  });
}

async function startGroupCall(targets) {
  if (!targets.length) return;
  const me = getActiveIdentity();
  if (!me) return;
  const groupId = (crypto.randomUUID && crypto.randomUUID()) ||
    Date.now().toString(36) + Math.random().toString(36).slice(2);
  let nowIngame = null;
  try {
    const gt = await import('../game-time.js');
    nowIngame = gt.getCurrentIngameTime?.()?.toISOString?.() || null;
  } catch {}

  const rows = targets.map(t => ({
    caller_type: me.type, caller_id: me.id,
    callee_type: t.type, callee_id: t.id,
    status: 'ringing',
    group_id: groupId,
    started_at_ingame: nowIngame,
  }));
  const { error } = await supabase.from('agent_calls').insert(rows);
  if (error) {
    alert('Gruppen-Anruf fehlgeschlagen: ' + (error.message || error));
    return;
  }
  // DM sieht keinen Ringing-Screen (er wartet auf Annahme) — Hint per Toast
  refreshCallHistory();
}

async function refreshCallHistory() {
  const list = document.getElementById('cj-list');
  if (!list) return;
  const me = getActiveIdentity();
  if (!me) return;  // keine aktive Identität → leere Anrufliste
  const [{ data: asCaller }, { data: asCallee }] = await Promise.all([
    supabase.from('agent_calls').select('*').eq('caller_id', me.id).order('started_at', { ascending: false }).limit(25),
    supabase.from('agent_calls').select('*').eq('callee_id', me.id).order('started_at', { ascending: false }).limit(25),
  ]);
  const calls = [...(asCaller || []), ...(asCallee || [])]
    .sort((a, b) => new Date(b.started_at) - new Date(a.started_at)).slice(0, 50);

  if (!calls || !calls.length) {
    list.innerHTML = `<div class="agent-empty"><div class="agent-empty-glyph">☏</div>Keine Anrufe.</div>`;
    return;
  }

  // Resolve names
  const items = await Promise.all(calls.map(async c => {
    const iAmCaller = (c.caller_type === me.type && c.caller_id === me.id);
    const otherType = iAmCaller ? c.callee_type : c.caller_type;
    const otherId   = iAmCaller ? c.callee_id   : c.caller_id;
    let name = '?', avatar = null;
    if (otherType === 'player') {
      const { data: p } = await supabase.from('characters').select('handle, name, image_url').eq('id', otherId).maybeSingle();
      name = p?.handle || p?.name || '?'; avatar = p?.image_url;
    } else {
      const { data: n } = await supabase.from('npcs').select('name, image_url').eq('id', otherId).maybeSingle();
      name = n?.name || '?'; avatar = n?.image_url;
    }
    return { c, iAmCaller, otherType, otherId, name, avatar };
  }));

  list.innerHTML = items.map(it => {
    const statusLabel = it.c.status === 'missed' ? 'missed'
                      : (it.iAmCaller ? 'out' : 'in');
    const dirGlyph = it.c.status === 'missed' ? '✕' : (it.iAmCaller ? '↗' : '↙');
    const dur = it.c.duration_sec > 0 ? formatDuration(it.c.duration_sec) : '';
    return `
      <div class="agent-list-item" data-other-type="${it.otherType}" data-other-id="${it.otherId}">
        <div class="agent-avatar" ${it.avatar ? `style="background-image:url(${it.avatar})"` : ''}>${it.avatar ? '' : it.name.slice(0,1).toUpperCase()}</div>
        <div class="agent-list-body">
          <div class="agent-list-name">${it.name}</div>
          <div class="agent-call-status-row">
            <span class="agent-call-status ${statusLabel}">${dirGlyph} ${it.c.status}</span>
            ${dur ? `<span class="agent-list-meta">${dur}</span>` : ''}
          </div>
        </div>
        <div class="agent-list-meta">${formatRelativeTime(it.c.started_at)}</div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.agent-list-item').forEach(el => {
    el.addEventListener('click', () => openCallWith(el.dataset.otherType, el.dataset.otherId));
  });
}

function openCallContactPicker() {
  // Reuse contacts list as picker
  const modal = document.createElement('div');
  modal.className = 'agent-modal';
  modal.innerHTML = `
    <div class="agent-modal-body" style="max-height:80%; overflow-y:auto;">
      <h3>Wen anrufen?</h3>
      <div id="cj-picker-list"></div>
      <div class="agent-modal-actions">
        <button data-act="cancel">Abbrechen</button>
      </div>
    </div>`;
  document.getElementById('agent-app-container').appendChild(modal);
  modal.addEventListener('click', e => { if (e.target.dataset?.act === 'cancel') modal.remove(); });

  const pickList = modal.querySelector('#cj-picker-list');
  pickList.innerHTML = agentState.contacts.map(c => `
    <div class="agent-list-item" data-type="${c.contact_type}" data-ref="${c.contact_player_id || c.contact_npc_id}">
      <div class="agent-avatar" ${c.avatar_url ? `style="background-image:url(${c.avatar_url})"` : ''}>${c.avatar_url ? '' : c.display_name.slice(0,1).toUpperCase()}</div>
      <div class="agent-list-body"><div class="agent-list-name">${c.display_name}</div></div>
    </div>
  `).join('') || '<div class="agent-empty">Keine Kontakte.</div>';

  pickList.querySelectorAll('.agent-list-item').forEach(el => {
    el.addEventListener('click', () => {
      modal.remove();
      openCallWith(el.dataset.type, el.dataset.ref);
    });
  });
}

async function openCallWith(otherType, otherId) {
  // Initiate outgoing call
  const me = getActiveIdentity();
  if (!me) return;
  let name = '?', avatar = null;
  if (otherType === 'player') {
    const { data: p } = await supabase.from('characters').select('handle, name, image_url').eq('id', otherId).maybeSingle();
    name = p?.handle || p?.name || '?'; avatar = p?.image_url;
  } else {
    const { data: n } = await supabase.from('npcs').select('name, image_url').eq('id', otherId).maybeSingle();
    name = n?.name || '?'; avatar = n?.image_url;
  }

  const { data: call } = await supabase.from('agent_calls').insert({
    caller_type: me.type, caller_id: me.id,
    callee_type: otherType, callee_id: otherId,
    status: 'ringing'
  }).select().single();

  agentState.inCall = { ...call, otherName: name, otherAvatar: avatar, mode: 'outgoing' };
  showCallScreen(name, avatar, 'Klingelt…');
  playSound('ringtone', { loop: true, volume: 0.4 });
  showApp('calljack');
}

function showCallScreen(name, avatar, state) {
  const active = document.getElementById('cj-active');
  active.classList.remove('hidden');
  active.classList.remove('connected');
  document.getElementById('cj-list').style.display = 'none';
  document.getElementById('cj-active-name').textContent = name;
  document.getElementById('cj-active-state').textContent = state;
  document.getElementById('cj-active-timer').style.display = 'none';
  const av = document.getElementById('cj-active-avatar');
  if (avatar) { av.style.backgroundImage = `url(${avatar})`; av.textContent = ''; }
  else { av.style.backgroundImage = ''; av.textContent = (name || '?').slice(0,1).toUpperCase(); }
}

function hideCallScreen() {
  const active = document.getElementById('cj-active');
  if (active) {
    active.classList.add('hidden');
  }
  const list = document.getElementById('cj-list');
  if (list) list.style.display = '';
  refreshCallHistory();
}

async function hangupCall() {
  stopSound('ringtone');
  if (agentState.callTimer) { clearInterval(agentState.callTimer); agentState.callTimer = null; }
  if (!agentState.inCall) { hideCallScreen(); return; }

  const call = agentState.inCall;
  const startedAt = new Date(call.answered_at || call.started_at).getTime();
  const duration = call.answered_at ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  const status = call.status === 'ringing' ? 'declined' : 'ended';

  await supabase.from('agent_calls').update({
    status, ended_at: new Date().toISOString(),
    duration_sec: duration
  }).eq('id', call.id);

  agentState.inCall = null;
  hideCallScreen();
}

// Incoming call handling
window.addEventListener('agent:incoming-call', async (e) => {
  const call = e.detail;
  // Resolve caller name
  let name = '?', avatar = null;
  if (call.caller_type === 'player') {
    const { data: p } = await supabase.from('characters').select('handle, name, image_url').eq('id', call.caller_id).maybeSingle();
    name = p?.handle || p?.name || '?'; avatar = p?.image_url;
  } else {
    const { data: n } = await supabase.from('npcs').select('name, image_url').eq('id', call.caller_id).maybeSingle();
    name = n?.name || '?'; avatar = n?.image_url;
  }

  const ov = document.getElementById('agent-incoming-call');
  if (!ov) return;
  ov.classList.add('show');
  const isGroup = !!call.group_id;
  const nameEl = document.getElementById('incoming-name');
  nameEl.textContent = isGroup ? `${name} · GRUPPEN-ANRUF` : name;
  const labelEl = ov.querySelector('.label');
  if (labelEl) labelEl.textContent = isGroup ? 'Eingehender Gruppen-Anruf' : 'Eingehender Anruf';
  const av = document.getElementById('incoming-avatar');
  if (avatar) { av.style.backgroundImage = `url(${avatar})`; av.textContent = ''; }
  else { av.style.backgroundImage = ''; av.textContent = name.slice(0,1).toUpperCase(); }

  agentState.inCall = { ...call, otherName: name, otherAvatar: avatar, mode: 'incoming', isGroup };
  playSound('ringtone', { loop: true, volume: 0.6 });

  // Auto-miss after 25s
  agentState._missTimeout = setTimeout(async () => {
    if (agentState.inCall && agentState.inCall.id === call.id && agentState.inCall.status === 'ringing') {
      stopSound('ringtone');
      await supabase.from('agent_calls').update({ status: 'missed', ended_at: new Date().toISOString() }).eq('id', call.id);
      ov.classList.remove('show');
      notify('calljack', false);
      agentState.inCall = null;
    }
  }, 25000);

  // Wire buttons
  document.getElementById('incoming-accept').onclick = async () => {
    clearTimeout(agentState._missTimeout);
    stopSound('ringtone');
    ov.classList.remove('show');
    await supabase.from('agent_calls').update({
      status: 'answered', answered_at: new Date().toISOString()
    }).eq('id', call.id);
    // open the call screen
    showApp('calljack');
    showCallScreen(name, avatar, 'Verbunden');
    startCallTimer();
    document.getElementById('cj-active').classList.add('connected');
  };
  document.getElementById('incoming-decline').onclick = async () => {
    clearTimeout(agentState._missTimeout);
    stopSound('ringtone');
    ov.classList.remove('show');
    await supabase.from('agent_calls').update({
      status: 'declined', ended_at: new Date().toISOString()
    }).eq('id', call.id);
    agentState.inCall = null;
  };
});

function startCallTimer() {
  const timerEl = document.getElementById('cj-active-timer');
  if (!timerEl) return;
  timerEl.style.display = '';
  document.getElementById('cj-active-state').textContent = '';
  let sec = 0;
  agentState.callTimer = setInterval(() => {
    sec++;
    timerEl.textContent = formatDuration(sec);
  }, 1000);
}

// Caller side: when callee answers
window.addEventListener('agent:call-change', (e) => {
  const { eventType, row } = e.detail;
  if (eventType !== 'UPDATE') return;
  if (!agentState.inCall || agentState.inCall.id !== row.id) return;

  if (row.status === 'answered' && agentState.inCall.mode === 'outgoing' && !agentState.callTimer) {
    stopSound('ringtone');
    document.getElementById('cj-active').classList.add('connected');
    document.getElementById('cj-active-state').textContent = '';
    agentState.inCall.answered_at = row.answered_at;
    startCallTimer();
  }
  if (['ended','declined','missed'].includes(row.status)) {
    stopSound('ringtone');
    if (agentState.callTimer) { clearInterval(agentState.callTimer); agentState.callTimer = null; }
    agentState.inCall = null;
    hideCallScreen();
    if (row.status === 'missed') notify('calljack', false);
  }
});

// ============================================================
// EDDIEWIRE APP
// ============================================================
function renderEddieWireApp() {
  const v = document.getElementById('app-eddiewire');
  v.innerHTML = `
    <div class="agent-app-header">
      <span class="agent-back" data-back>‹</span>
      <span class="agent-app-title">EddieWire</span>
    </div>
    <div class="agent-balance">
      <div class="label">Guthaben</div>
      <div class="value" id="ew-balance">—</div>
    </div>
    <div class="agent-transfer-actions">
      <button data-act="send">↗ Senden</button>
      <button data-act="request">↙ Anfordern</button>
    </div>
    <div class="agent-list" id="ew-history" style="overflow-y:auto;"></div>
  `;
  v.querySelector('[data-back]').addEventListener('click', () => showApp('home'));
  v.querySelectorAll('.agent-transfer-actions button').forEach(b => {
    b.addEventListener('click', () => openTransferForm(null, null, b.dataset.act));
  });
  refreshBalance();
  refreshTransfers();
}

async function refreshBalance() {
  const me = getActiveIdentity();
  if (!me || me.type !== 'player') return;
  const { data } = await supabase.from('characters').select('cash').eq('id', me.id).maybeSingle();
  const el = document.getElementById('ew-balance');
  if (el) el.textContent = data?.cash ?? 0;
}

async function refreshTransfers() {
  const list = document.getElementById('ew-history');
  if (!list) return;
  const me = getActiveIdentity();
  if (!me) return;  // keine aktive Identität → leere Transfer-Liste
  const [{ data: asSender }, { data: asRecipient }] = await Promise.all([
    supabase.from('agent_transfers').select('*').eq('sender_id', me.id).order('created_at', { ascending: false }).limit(25),
    supabase.from('agent_transfers').select('*').eq('recipient_id', me.id).order('created_at', { ascending: false }).limit(25),
  ]);
  const trs = [...(asSender || []), ...(asRecipient || [])]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);

  if (!trs || !trs.length) {
    list.innerHTML = `<div class="agent-empty"><div class="agent-empty-glyph">€$</div>Keine Transfers.</div>`;
    return;
  }
  agentState.pendingTransfers = trs.filter(t => t.status === 'pending' && t.recipient_id === me.id).length;

  const html = await Promise.all(trs.map(async t => {
    const meIsSender = (t.sender_type === me.type && t.sender_id === me.id);
    // money flow direction for me:
    // - direction='send', I'm sender → out
    // - direction='send', I'm recipient → in
    // - direction='request', I'm sender → if accepted: in (waiting=neutral)
    // - direction='request', I'm recipient → if accepted: out
    let dir = 'in', sign = '+';
    if (t.direction === 'send' && meIsSender) { dir = 'out'; sign = '-'; }
    else if (t.direction === 'request' && !meIsSender) { dir = 'out'; sign = '-'; }
    if (t.status === 'pending' || t.status === 'declined') { sign = '·'; }

    // other party
    const otherType = meIsSender ? t.recipient_type : t.sender_type;
    const otherId   = meIsSender ? t.recipient_id   : t.sender_id;
    let otherName = '?';
    if (otherType === 'player') {
      const { data: p } = await supabase.from('characters').select('handle, name').eq('id', otherId).maybeSingle();
      otherName = p?.handle || p?.name || '?';
    } else {
      const { data: n } = await supabase.from('npcs').select('name').eq('id', otherId).maybeSingle();
      otherName = n?.name || '?';
    }

    const isPendingForMe = t.status === 'pending' && t.direction === 'request' && !meIsSender;
    const statusBadge = t.status === 'pending' ? `<span class="agent-transfer-status pending">Pending</span>`
                     : t.status === 'declined' ? `<span class="agent-transfer-status pending">Declined</span>` : '';

    return `
      <div class="agent-transfer-row">
        <div class="agent-transfer-direction ${dir}">${dir === 'in' ? '↙' : '↗'}</div>
        <div class="agent-transfer-body">
          <div class="agent-transfer-name">${otherName} ${statusBadge}</div>
          <div class="agent-transfer-note">${t.note ? escapeHtml(t.note) + ' · ' : ''}${formatRelativeTime(t.created_at)}${t.direction === 'request' ? ' · Anforderung' : ''}</div>
          ${isPendingForMe ? `
            <div class="agent-transfer-pending-actions">
              <button class="accept" data-act="accept" data-id="${t.id}">Annehmen</button>
              <button class="decline" data-act="decline" data-id="${t.id}">Ablehnen</button>
            </div>` : ''}
        </div>
        <div class="agent-transfer-amount ${dir}">${sign}${t.amount}</div>
      </div>
    `;
  }));

  list.innerHTML = html.join('');
  list.querySelectorAll('button[data-act]').forEach(b => {
    b.addEventListener('click', async () => {
      const id = b.dataset.id;
      if (b.dataset.act === 'accept') {
        await supabase.from('agent_transfers').update({ status: 'accepted' }).eq('id', id);
      } else {
        await supabase.from('agent_transfers').update({ status: 'declined', resolved_at: new Date().toISOString() }).eq('id', id);
      }
      refreshBalance(); refreshTransfers();
    });
  });
}

function openTransferForm(presetType, presetId, mode = 'send') {
  const modal = document.createElement('div');
  modal.className = 'agent-modal';
  const contactOpts = agentState.contacts.map(c => {
    const sel = (presetType && (c.contact_player_id === presetId || c.contact_npc_id === presetId)) ? 'selected' : '';
    const val = JSON.stringify({ type: c.contact_type, id: c.contact_player_id || c.contact_npc_id }).replace(/"/g,'&quot;');
    return `<option value="${val}" ${sel}>${c.display_name}</option>`;
  }).join('');

  modal.innerHTML = `
    <div class="agent-modal-body">
      <h3>${mode === 'send' ? 'Geld senden' : 'Geld anfordern'}</h3>
      <label>Empfänger</label>
      <select id="tf-to">${contactOpts}</select>
      <label>Betrag (€$)</label>
      <input id="tf-amount" type="number" min="1" placeholder="z.B. 500">
      <label>Notiz (optional)</label>
      <input id="tf-note" placeholder="Wofür?">
      <div id="tf-error" style="color:var(--agent-danger); font-size:11px; margin-top:6px;"></div>
      <div class="agent-modal-actions">
        <button data-act="cancel">Abbrechen</button>
        <button class="primary" data-act="confirm">${mode === 'send' ? 'Senden' : 'Anfordern'}</button>
      </div>
    </div>`;
  document.getElementById('agent-app-container').appendChild(modal);

  let negativeWarned = false;
  modal.addEventListener('click', async (e) => {
    if (e.target.dataset?.act === 'cancel') return modal.remove();
    if (e.target.dataset?.act !== 'confirm') return;
    const to = JSON.parse(modal.querySelector('#tf-to').value);
    const amount = parseInt(modal.querySelector('#tf-amount').value, 10);
    const note = modal.querySelector('#tf-note').value.trim();
    const err = modal.querySelector('#tf-error');
    if (!amount || amount <= 0) { err.textContent = 'Betrag eingeben.'; return; }

    if (mode === 'send' && !negativeWarned) {
      const me = getActiveIdentity();
      if (me && me.type === 'player') {
        const { data: bal } = await supabase.from('characters').select('cash').eq('id', me.id).maybeSingle();
        const current = bal?.cash ?? 0;
        if (amount > current) {
          negativeWarned = true;
          err.style.color = 'var(--agent-accent-warm)';
          err.textContent = `⚠ Guthaben: ${current} €$ — du gehst ${amount - current} €$ ins Minus. Nochmal klicken zum Bestätigen.`;
          return;
        }
      }
    }

    const me = getActiveIdentity();
    if (!me) { err.textContent = 'Keine aktive Identität.'; return; }
    const row = {
      sender_type: me.type,
      sender_id: me.id,
      recipient_type: to.type, recipient_id: to.id,
      amount, note,
      direction: mode,
      status: mode === 'send' ? 'auto' : 'pending'
    };
    const { error } = await supabase.from('agent_transfers').insert(row);
    if (error) { err.style.color = 'var(--agent-danger)'; err.textContent = error.message; return; }
    modal.remove();
    refreshBalance(); refreshTransfers();
  });
}

window.addEventListener('agent:transfer-change', () => {
  if (agentState.currentApp === 'eddiewire') {
    refreshBalance(); refreshTransfers();
  }
});

// ============================================================
// WIRE UP — render all apps on first home open
// ============================================================
window.addEventListener('agent:ready', () => {
  renderContactsApp();
  renderChromeChatApp();
  renderCallJackApp();
  renderEddieWireApp();
});

window.addEventListener('agent:app-opened', (e) => {
  // Refresh app content on open
  switch (e.detail.app) {
    case 'contacts':    refreshContacts(); break;
    case 'chrome-chat': renderThreadList(); break;
    case 'calljack':    refreshCallHistory(); break;
    case 'eddiewire':   refreshBalance(); refreshTransfers(); break;
  }
});

window.addEventListener('agent:contacts-changed', () => refreshContacts());

// When DM switches NPC identity, re-render
window.addEventListener('agent:identity-changed', () => {
  if (!document.getElementById('app-contacts')) return;
  refreshContacts();
  renderThreadList();
  refreshCallHistory();
  refreshBalance();
  refreshTransfers();
});
