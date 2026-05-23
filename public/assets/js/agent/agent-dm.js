// ============================================================
// iCHOOM Agent — DM Mode
// Tabs per NPC, NPC code management, broader realtime
// ============================================================

import { supabase } from '../supabase.js';
import {
  agentState, SOUNDS, bootAgent, shutdownAgent, showApp,
  setBadge, notify, getActiveIdentity, setActiveIdentity, playSound
} from './agent-core.js';

// Reuse same PHONE_HTML structure but in a wider container with tabs
const DM_HTML = `
<div class="agent-dm-bar" id="agent-dm-bar">
  <div class="agent-bar-logo agent-dm-bar-logo">iCHOOM <span style="color:var(--agent-accent-warm)">/ DM</span></div>
  <div class="agent-dm-bar-sub">NPC-Konsole</div>
  <span class="agent-bar-notif" id="agent-bar-notif">0</span>
</div>

<div class="agent-dm-phone" id="agent-dm-phone">
  <div class="agent-dm-tabs" id="agent-dm-tabs">
    <button class="agent-dm-tab-add" id="agent-dm-add-npc">＋</button>
  </div>
  <div class="agent-phone-frame" style="border-radius: 0 0 0 0; border-top: 1px solid var(--agent-accent-warm);">
    <div class="agent-status-bar">
      <span class="agent-time" id="agent-time">--:--</span>
      <span style="color:var(--agent-accent-warm); margin-left: 14px; font-family:'Audiowide';" id="agent-active-identity">— wählen —</span>
      <span class="agent-date" id="agent-date" style="margin-left:auto;">--.--.----</span>
    </div>

    <div class="agent-boot-overlay" id="agent-boot">
      <div class="agent-boot-logo">iCHOOM</div>
      <div class="agent-boot-line">DM CONSOLE</div>
      <div class="agent-boot-bar"><div></div></div>
    </div>
    <div class="agent-shutdown-overlay" id="agent-shutdown"></div>

    <div class="agent-app-container" id="agent-app-container">
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

      <div class="agent-app-view" id="app-chrome-chat" data-view="chrome-chat" hidden></div>
      <div class="agent-app-view" id="app-calljack"    data-view="calljack" hidden></div>
      <div class="agent-app-view" id="app-contacts"    data-view="contacts" hidden></div>
      <div class="agent-app-view" id="app-eddiewire"   data-view="eddiewire" hidden></div>
    </div>

    <div class="agent-home-btn" id="agent-home-btn" title="Home"></div>
  </div>
</div>

<!-- Incoming-call overlay shared -->
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

// DM state extension
const dmState = {
  activeNpcId: null,    // npc currently selected as active identity
  npcTabs: [],          // [{ npcId, name, badgeCount }]
  npcUnread: {},        // npcId → count
};

export async function initDmAgent() {
  agentState.mode = 'dm';

  const wrap = document.createElement('div');
  wrap.id = 'agent-root';
  wrap.innerHTML = DM_HTML;
  document.body.appendChild(wrap);

  // Preload sounds
  Object.keys(SOUNDS.files).forEach(k => {
    const a = new Audio(SOUNDS.base + SOUNDS.files[k]);
    a.preload = 'auto';
  });

  // Bar click → boot
  document.getElementById('agent-dm-bar').addEventListener('click', async () => {
    if (!dmState.activeNpcId) {
      // Force pick NPC first
      await bootDmPhone();
      openNpcPicker();
      return;
    }
    playSound('tap', { volume: 0.3 });
    await bootDmPhone();
  });

  // App icons
  document.querySelectorAll('.app-icon').forEach(icon => {
    icon.addEventListener('click', () => {
      if (!dmState.activeNpcId) { openNpcPicker(); return; }
      playSound('tap', { volume: 0.3 });
      const app = icon.dataset.app;
      showApp(app);
      window.dispatchEvent(new CustomEvent('agent:app-opened', { detail: { app } }));
    });
  });

  // Home button
  document.getElementById('agent-home-btn').addEventListener('click', async () => {
    if (agentState.currentApp === 'home' || !agentState.currentApp) {
      await shutdownDmPhone();
    } else {
      playSound('tap', { volume: 0.3 });
      showApp('home');
    }
  });

  // Add NPC tab
  document.getElementById('agent-dm-add-npc').addEventListener('click', openNpcPicker);

  // Clock
  tickClock(); setInterval(tickClock, 1000 * 30);

  // Realtime: DM sees everything involving NPCs
  await setupDmRealtime();

  showApp('home');
  window.dispatchEvent(new CustomEvent('agent:ready'));
}

async function bootDmPhone() {
  const phone = document.getElementById('agent-dm-phone');
  const boot  = document.getElementById('agent-boot');
  if (!phone) return;
  boot.classList.remove('gone');
  phone.classList.add('open');
  playSound('boot');
  await new Promise(r => setTimeout(r, 1500));
  boot.classList.add('gone');
}

async function shutdownDmPhone() {
  const phone = document.getElementById('agent-dm-phone');
  const shut  = document.getElementById('agent-shutdown');
  if (!phone) return;
  shut.classList.add('active');
  playSound('shutdown');
  await new Promise(r => setTimeout(r, 380));
  phone.classList.remove('open');
  shut.classList.remove('active');
  setTimeout(() => showApp('home'), 400);
}

function tickClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  const dd = String(now.getDate()).padStart(2,'0');
  const mo = String(now.getMonth()+1).padStart(2,'0');
  const yr = now.getFullYear() + 20;
  const t = document.getElementById('agent-time');
  const d = document.getElementById('agent-date');
  if (t) t.textContent = `${hh}:${mm}`;
  if (d) d.textContent = `${dd}.${mo}.${yr}`;
}

// ---------- NPC PICKER ----------
async function openNpcPicker() {
  const { data: npcs } = await supabase.from('npcs').select('id, name, image_url, role').order('name');
  const { data: codes } = await supabase.from('agent_npc_codes').select('npc_id, code, display_name');
  const codeMap = Object.fromEntries((codes||[]).map(c => [c.npc_id, c]));

  const modal = document.createElement('div');
  modal.className = 'agent-modal';
  modal.innerHTML = `
    <div class="agent-modal-body" style="max-height: 80vh; overflow-y:auto;">
      <h3>NPC wählen</h3>
      <div id="npc-pick-list" class="agent-list"></div>
      <div class="agent-modal-actions">
        <button data-act="cancel">Schließen</button>
      </div>
    </div>`;
  document.getElementById('agent-app-container').appendChild(modal);

  const list = modal.querySelector('#npc-pick-list');
  list.innerHTML = (npcs || []).map(n => {
    const code = codeMap[n.id];
    return `
      <div class="agent-list-item" data-npc="${n.id}" data-name="${(n.name||'').replace(/"/g,'&quot;')}" data-avatar="${n.image_url||''}">
        <div class="agent-avatar" ${n.image_url ? `style="background-image:url(${n.image_url})"` : ''}>${n.image_url ? '' : (n.name||'?').slice(0,1).toUpperCase()}</div>
        <div class="agent-list-body">
          <div class="agent-list-name">${n.name}</div>
          <div class="agent-list-sub">${n.role || ''} ${code ? '· Code: <b>' + code.code + '</b>' : ''}</div>
        </div>
        <div style="display:flex; gap:6px;">
          ${!code
            ? `<button class="agent-dm-tab" data-act="gen-code" data-npc="${n.id}" data-name="${(n.name||'').replace(/"/g,'&quot;')}" data-avatar="${n.image_url||''}" style="color:var(--agent-accent-warm); border-color:var(--agent-accent-warm); border-bottom:1px solid;">Code</button>`
            : `<button class="agent-dm-tab" data-act="copy-code" data-code="${code.code}" style="color:var(--agent-hologram); border-color:var(--agent-hologram); border-bottom:1px solid;">📋</button>`
          }
        </div>
      </div>
    `;
  }).join('') || '<div class="agent-empty">Keine NPCs. Lege im DM-Dashboard NPCs an.</div>';

  modal.addEventListener('click', async (e) => {
    if (e.target.dataset?.act === 'cancel') return modal.remove();

    if (e.target.dataset?.act === 'gen-code') {
      const npcId = e.target.dataset.npc;
      const name  = e.target.dataset.name;
      const av    = e.target.dataset.avatar;
      const code  = generateCode(name);
      const { error } = await supabase.from('agent_npc_codes').insert({
        npc_id: npcId, code, display_name: name, avatar_url: av || null
      });
      if (error) { alert('Code-Erstellung fehlgeschlagen: ' + error.message); return; }
      // refresh modal
      modal.remove(); openNpcPicker();
      return;
    }
    if (e.target.dataset?.act === 'copy-code') {
      navigator.clipboard?.writeText(e.target.dataset.code);
      e.target.textContent = '✓';
      setTimeout(() => { e.target.textContent = '📋'; }, 1200);
      return;
    }

    const item = e.target.closest('.agent-list-item[data-npc]');
    if (item) {
      const npcId = item.dataset.npc;
      const name  = item.dataset.name;
      const av    = item.dataset.avatar;
      modal.remove();
      addNpcTab(npcId, name, av);
    }
  });
}

function generateCode(name) {
  // Format: NX-XXXX or by name prefix
  const prefix = (name || 'NX').replace(/[^A-Za-z]/g,'').slice(0,2).toUpperCase() || 'NX';
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
}

// ---------- TABS ----------
function addNpcTab(npcId, name, avatar) {
  if (!dmState.npcTabs.find(t => t.npcId === npcId)) {
    dmState.npcTabs.push({ npcId, name, avatar });
  }
  renderTabs();
  selectNpcTab(npcId);
}

function renderTabs() {
  const tabs = document.getElementById('agent-dm-tabs');
  if (!tabs) return;
  // Keep "+ NPC" at end
  const existing = tabs.querySelectorAll('.agent-dm-tab');
  existing.forEach(t => t.remove());

  const addBtn = tabs.querySelector('#agent-dm-add-npc');

  dmState.npcTabs.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'agent-dm-tab' + (t.npcId === dmState.activeNpcId ? ' active' : '');
    btn.dataset.npc = t.npcId;
    const badge = dmState.npcUnread[t.npcId] || 0;
    btn.innerHTML = `
      <span>${t.name}</span>
      <span class="notif ${badge > 0 ? 'show' : ''}" data-notif="${t.npcId}">${badge}</span>
      <span class="close" data-close="${t.npcId}">×</span>
    `;
    btn.addEventListener('click', (e) => {
      if (e.target.dataset?.close) {
        e.stopPropagation();
        removeNpcTab(t.npcId);
      } else {
        selectNpcTab(t.npcId);
      }
    });
    tabs.insertBefore(btn, addBtn);
  });
}

function removeNpcTab(npcId) {
  dmState.npcTabs = dmState.npcTabs.filter(t => t.npcId !== npcId);
  if (dmState.activeNpcId === npcId) {
    dmState.activeNpcId = dmState.npcTabs[0]?.npcId || null;
    if (dmState.activeNpcId) selectNpcTab(dmState.activeNpcId);
    else {
      setActiveIdentity(null);
      document.getElementById('agent-active-identity').textContent = '— wählen —';
    }
  }
  renderTabs();
}

function selectNpcTab(npcId) {
  dmState.activeNpcId = npcId;
  const tab = dmState.npcTabs.find(t => t.npcId === npcId);
  if (!tab) return;
  setActiveIdentity({ type: 'npc', id: npcId, name: tab.name, avatarUrl: tab.avatar });
  document.getElementById('agent-active-identity').textContent = tab.name;
  // clear unread for this NPC
  dmState.npcUnread[npcId] = 0;
  renderTabs();
  refreshDmBarBadge();
  // refresh whatever app is open
  showApp('home');
}

// ---------- REALTIME (DM mode) ----------
async function setupDmRealtime() {
  // Subscribe to everything; filter by NPC participation
  const mChan = supabase.channel('agent-dm-msg')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_messages' },
        async (payload) => {
          const m = payload.new;
          // Notify if any NPC is recipient
          const { data: thread } = await supabase.from('agent_threads').select('*').eq('id', m.thread_id).maybeSingle();
          if (!thread) return;
          // Find the NPC in this thread
          const npcId = thread.a_type === 'npc' ? thread.a_id : (thread.b_type === 'npc' ? thread.b_id : null);
          if (!npcId) return;
          // Only notify if the message wasn't sent by the DM (npc sender = DM)
          if (m.sender_type === 'npc' && m.sender_id === npcId) {
            // it's our own send — just refresh stream
            window.dispatchEvent(new CustomEvent('agent:message', { detail: { msg: m, thread } }));
            return;
          }
          // Add tab if not present
          const tab = dmState.npcTabs.find(t => t.npcId === npcId);
          if (!tab) {
            const { data: n } = await supabase.from('npcs').select('id, name, image_url').eq('id', npcId).maybeSingle();
            if (n) {
              dmState.npcTabs.push({ npcId: n.id, name: n.name, avatar: n.image_url });
            }
          }
          dmState.npcUnread[npcId] = (dmState.npcUnread[npcId] || 0) + 1;
          renderTabs();
          refreshDmBarBadge();
          playSound('notification', { volume: 0.5 });

          // If this NPC is currently active, also refresh in-app
          if (dmState.activeNpcId === npcId) {
            window.dispatchEvent(new CustomEvent('agent:message', { detail: { msg: m, thread } }));
          }
        })
    .subscribe();

  // Calls (incoming to NPCs)
  const cChan = supabase.channel('agent-dm-call')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_calls' },
        async (payload) => {
          const { eventType, new: row, old } = payload;
          // is callee or caller an NPC?
          const npcId = row.callee_type === 'npc' ? row.callee_id : (row.caller_type === 'npc' ? row.caller_id : null);
          if (!npcId) return;

          // Add tab if not present
          if (!dmState.npcTabs.find(t => t.npcId === npcId)) {
            const { data: n } = await supabase.from('npcs').select('id, name, image_url').eq('id', npcId).maybeSingle();
            if (n) dmState.npcTabs.push({ npcId: n.id, name: n.name, avatar: n.image_url });
            renderTabs();
          }

          // Forward as incoming call if active identity is this NPC
          if (eventType === 'INSERT' && row.status === 'ringing' && row.callee_type === 'npc' && row.callee_id === npcId) {
            // auto-switch to that NPC
            if (dmState.activeNpcId !== npcId) selectNpcTab(npcId);
            window.dispatchEvent(new CustomEvent('agent:incoming-call', { detail: row }));
          }
          window.dispatchEvent(new CustomEvent('agent:call-change', { detail: { eventType, row, old } }));
        })
    .subscribe();

  // Transfers
  const tChan = supabase.channel('agent-dm-trf')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_transfers' },
        (payload) => {
          const row = payload.new;
          const npcId = row.recipient_type === 'npc' ? row.recipient_id : (row.sender_type === 'npc' ? row.sender_id : null);
          if (!npcId) return;
          if (dmState.activeNpcId === npcId) {
            window.dispatchEvent(new CustomEvent('agent:transfer-change', { detail: payload }));
          }
        })
    .subscribe();

  agentState.channels.push(mChan, cChan, tChan);
}

function refreshDmBarBadge() {
  const total = Object.values(dmState.npcUnread).reduce((a,b) => a+b, 0);
  const bar = document.getElementById('agent-bar-notif');
  if (!bar) return;
  bar.textContent = total;
  bar.classList.toggle('show', total > 0);
}
