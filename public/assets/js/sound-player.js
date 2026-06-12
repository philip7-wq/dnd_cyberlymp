// ============================================================
// Sound Player — listens to DM broadcasts and plays audio.
// Also renders a small volume-settings panel for the player.
// Auto-initializes on import.
// ============================================================

import { createSoundChannel } from './supabase.js';

const pool = {};  // soundId → { el: HTMLAudioElement, category: string }

// Per-category volume multipliers (player-local, persisted in localStorage)
const LS_KEY = 'snd-player-vols';
const catVols = Object.assign({ oneshot: 1, ambiente: 1, music: 1 }, loadVols());

function loadVols() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
}
function saveVols() {
  localStorage.setItem(LS_KEY, JSON.stringify(catVols));
}
function catMul(category) {
  return category === 'one-shot' ? catVols.oneshot : category === 'ambiente' ? catVols.ambiente : catVols.music;
}

const indicator = document.getElementById('sound-indicator');

// ── Inject settings button ────────────────────────────────────

const settingsBtn = document.createElement('button');
settingsBtn.id    = 'sound-settings-btn';
settingsBtn.title = 'Lautstärke';
settingsBtn.innerHTML = '<svg class="ic" aria-hidden="true"><use href="/assets/icons/cyber-icons.svg#ic-volume"/></svg>';
settingsBtn.style.cssText = `
  position:fixed; top:12px; right:14px; z-index:1100;
  width:36px; height:36px; border-radius:8px;
  background:#0a0a0f; border:1px solid #2a2a3a;
  color:#555; font-size:15px; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:color .2s, border-color .2s, box-shadow .2s;
  padding:0; line-height:1;
`;
settingsBtn.addEventListener('mouseenter', () => { settingsBtn.style.borderColor='#00E5FF55'; settingsBtn.style.color='#00E5FF'; settingsBtn.style.boxShadow='0 0 8px #00E5FF33'; });
settingsBtn.addEventListener('mouseleave', () => { settingsBtn.style.borderColor='#2a2a3a'; settingsBtn.style.color='#555'; settingsBtn.style.boxShadow='none'; });
document.body.appendChild(settingsBtn);

// ── Volume Panel ──────────────────────────────────────────────

const panel = document.createElement('div');
panel.id = 'sound-vol-panel';
panel.style.cssText = `
  display:none; position:fixed; top:56px; right:8px; z-index:1100;
  background:#0f0f18; border:1px solid #2a2a3a; border-radius:10px;
  padding:16px; width:220px;
  font-family:'Rajdhani',sans-serif;
`;
panel.innerHTML = `
  <div style="font-size:10px;letter-spacing:.1em;color:#aaa;margin-bottom:12px;border-bottom:1px solid #1e1e2a;padding-bottom:6px;">
    <svg class="ic" aria-hidden="true"><use href="/assets/icons/cyber-icons.svg#ic-volume"/></svg> LAUTSTÄRKE
  </div>
  ${[
    { key: 'oneshot',  label: 'One-Shot', color: '#FF2D2D' },
    { key: 'ambiente', label: 'Ambiente', color: '#00E5FF' },
    { key: 'music',    label: 'Music',    color: '#B14EFF' },
  ].map(g => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
      <span style="font-size:9px;color:#555;min-width:52px;letter-spacing:.06em;">${g.label}</span>
      <input type="range" min="0" max="100" value="${Math.round(catVols[g.key] * 100)}"
        data-cat="${g.key}"
        style="flex:1; -webkit-appearance:none; appearance:none; height:2px; background:linear-gradient(to right,${g.color} ${Math.round(catVols[g.key]*100)}%,#333 ${Math.round(catVols[g.key]*100)}%); border:none; outline:none; cursor:pointer;">
      <span style="font-size:10px;color:#555;min-width:28px;text-align:right;" data-pct="${g.key}">${Math.round(catVols[g.key]*100)}%</span>
    </div>
  `).join('')}
`;
document.body.appendChild(panel);

// Style range thumbs via a style tag (can't do it inline)
const thumbStyle = document.createElement('style');
thumbStyle.textContent = `
  #sound-vol-panel input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance:none; width:10px; height:18px; border-radius:2px; cursor:pointer;
    background:#ccc; box-shadow:0 0 4px #ccc8;
  }
  #sound-vol-panel input[data-cat="oneshot"]::-webkit-slider-thumb { background:#FF2D2D; box-shadow:0 0 4px #FF2D2D; }
  #sound-vol-panel input[data-cat="ambiente"]::-webkit-slider-thumb { background:#00E5FF; box-shadow:0 0 4px #00E5FF; }
  #sound-vol-panel input[data-cat="music"]::-webkit-slider-thumb { background:#B14EFF; box-shadow:0 0 4px #B14EFF; }
`;
document.head.appendChild(thumbStyle);

panel.querySelectorAll('input[type="range"]').forEach(slider => {
  slider.addEventListener('input', () => {
    const cat = slider.dataset.cat;
    const v   = slider.value / 100;
    catVols[cat] = v;
    saveVols();
    // Update gradient fill
    slider.style.background = `linear-gradient(to right,${slider.style.background.match(/#[0-9A-Fa-f]{3,6}/)[0]} ${slider.value}%,#333 ${slider.value}%)`;
    const pctEl = panel.querySelector(`[data-pct="${cat}"]`);
    if (pctEl) pctEl.textContent = slider.value + '%';
    // Re-apply to any currently playing sounds of this category
    Object.entries(pool).forEach(([, { el, category }]) => {
      if (category === cat) el.volume = clamp(v);
    });
  });
});

let panelOpen = false;
settingsBtn.addEventListener('click', e => {
  e.stopPropagation();
  panelOpen = !panelOpen;
  panel.style.display = panelOpen ? 'block' : 'none';
});
document.addEventListener('click', e => {
  if (panelOpen && !panel.contains(e.target) && e.target !== settingsBtn) {
    panelOpen = false;
    panel.style.display = 'none';
  }
});

// ── Channel subscription ──────────────────────────────────────

const ch = createSoundChannel();

ch.on('broadcast', { event: 'sound' }, ({ payload }) => {
  switch (payload.type) {
    case 'play':     handlePlay(payload);   break;
    case 'stop':     handleStop(payload);   break;
    case 'volume':   handleVolume(payload); break;
    case 'stop-all': stopAll();             break;
  }
}).subscribe();

// ── Handlers ─────────────────────────────────────────────────

function handlePlay({ soundId, url, category, volume, loop }) {
  if (pool[soundId]) { pool[soundId].el.pause(); }

  if (category === 'music') {
    Object.entries(pool)
      .filter(([, v]) => v.category === 'music')
      .forEach(([id, { el }]) => { el.pause(); delete pool[id]; });
  }

  const audio = new Audio(url);
  audio.loop  = !!loop;
  audio.volume = clamp(volume * catMul(category));
  audio.play().catch(() => {});
  pool[soundId] = { el: audio, category };

  audio.addEventListener('ended', () => {
    if (!loop) { delete pool[soundId]; updateIndicator(); }
  });

  updateIndicator();
}

function handleStop({ soundId }) {
  if (pool[soundId]) { pool[soundId].el.pause(); delete pool[soundId]; }
  updateIndicator();
}

function handleVolume({ soundId, volume }) {
  if (pool[soundId]) {
    pool[soundId].el.volume = clamp(volume * catMul(pool[soundId].category));
  }
}

function stopAll() {
  Object.values(pool).forEach(({ el }) => el.pause());
  Object.keys(pool).forEach(k => delete pool[k]);
  updateIndicator();
}

// ── Indicator ─────────────────────────────────────────────────

function updateIndicator() {
  if (!indicator) return;
  indicator.classList.toggle('active', Object.keys(pool).length > 0);
}

function clamp(v) { return Math.min(1, Math.max(0, v)); }
