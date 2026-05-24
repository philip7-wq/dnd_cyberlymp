// ============================================================
// Sound DM Interface — mixing-board for DM to control audio.
// Called lazily from dm.html when the Sound tab is first opened.
// ============================================================

import {
  getSoundLibrary, uploadSound, deleteSound,
  getSoundButtons, saveSoundButton, deleteSoundButton,
  createSoundChannel,
} from './supabase.js';

// ── Module state ─────────────────────────────────────────────

let sounds  = [];
let buttons = [];
let channel = null;
let _container = null; // reference to outer soundPanel — never touch its .id

const pool = {}; // soundId → { el: HTMLAudioElement, category: string }
const vols = { master: 0.7, oneshot: 1.0, ambiente: 0.7, music: 0.7 };
let currentMusicId = null;

let mounted = false;

// Library preview state
let previewAudio = null;
let previewingId = null;

// ── Mount ─────────────────────────────────────────────────────

export async function mountSound(container) {
  if (mounted) return;
  mounted = true;
  _container = container;

  container.innerHTML = '<div id="sound-tab"><div style="color:#555;font-size:12px;padding:20px;font-family:Audiowide,sans-serif;">Lade…</div></div>';

  [sounds, buttons] = await Promise.all([getSoundLibrary(), getSoundButtons()]);

  channel = createSoundChannel();
  channel.on('broadcast', { event: 'sound' }, ({ payload }) => handleBroadcast(payload)).subscribe();

  render();
}

function render() {
  const inner = _container.querySelector('#sound-tab');
  inner.innerHTML = '';

  inner.appendChild(buildMasterBar());
  inner.appendChild(buildOneShotSection());
  inner.appendChild(buildAmbienceSection());
  inner.appendChild(buildMusicSection());
  inner.appendChild(buildLibrarySection());
}

// ── Master Volume Bar ─────────────────────────────────────────

function buildMasterBar() {
  const bar = el(`<div class="snd-master-bar"></div>`);

  const groups = [
    { key: 'master',  label: 'Master',   cls: 'master' },
    { key: 'oneshot', label: 'One-Shot', cls: 'red' },
    { key: 'ambiente',label: 'Ambiente', cls: 'cyan' },
    { key: 'music',   label: 'Music',    cls: 'purple' },
  ];

  groups.forEach(g => {
    const pct = Math.round(vols[g.key] * 100);
    const grp = el(`<div class="snd-vol-group">
      <span class="snd-vol-label">${g.label}</span>
      <input type="range" class="snd-fader ${g.cls}" min="0" max="100" value="${pct}" style="--val:${pct}%">
      <span class="snd-vol-pct">${pct}%</span>
    </div>`);
    const slider = grp.querySelector('input');
    const pctEl  = grp.querySelector('.snd-vol-pct');
    slider.addEventListener('input', () => {
      slider.style.setProperty('--val', slider.value + '%');
      pctEl.textContent = slider.value + '%';
      vols[g.key] = slider.value / 100;
      applyVolumeAll();
    });
    bar.appendChild(grp);
  });

  const stopAll = el(`<button class="snd-stop-all-btn" type="button">⏹ STOP ALL</button>`);
  stopAll.addEventListener('click', () => broadcast({ type: 'stop-all' }));
  bar.appendChild(stopAll);

  return bar;
}

// ── One-Shot Section ──────────────────────────────────────────

function buildOneShotSection() {
  const sec = el(`<div class="snd-section">
    <div class="snd-label red">🔴 ONE-SHOTS</div>
    <div class="snd-launchpad" id="snd-oneshot-grid"></div>
  </div>`);

  const grid = sec.querySelector('#snd-oneshot-grid');
  const btns = buttons.filter(b => b.category === 'one-shot');
  btns.forEach(b => grid.appendChild(buildPadButton(b)));

  const addBtn = el(`<button class="snd-pad-add" type="button" title="Neuer One-Shot Button">+</button>`);
  addBtn.addEventListener('click', () => openButtonEditor({ category: 'one-shot' }, reloadButtons));
  grid.appendChild(addBtn);

  setupHotkeys(btns);
  return sec;
}

function buildPadButton(btn) {
  const color = btn.color || 'var(--snd-red)';
  const pad = el(`<button class="snd-pad-btn" type="button" style="color:${color}; border-color:${color}33;">
    <div class="snd-led red" data-led="${btn.id}"></div>
    <span>${btn.name}</span>
    ${btn.hotkey ? `<span class="pad-hotkey">[${btn.hotkey}]</span>` : ''}
  </button>`);

  pad.addEventListener('click', () => {
    if (!btn.sound_id || !btn.sound) return;
    const vol = clampVol(vols.master * vols.oneshot);
    broadcast({ type: 'play', soundId: btn.sound_id, url: btn.sound.file_url, category: 'one-shot', volume: vol, loop: false });
    pad.classList.add('firing');
    setTimeout(() => pad.classList.remove('firing'), 400);
  });

  pad.addEventListener('contextmenu', e => {
    e.preventDefault();
    openButtonEditor(btn, reloadButtons);
  });

  return pad;
}

// ── Ambiente Section ──────────────────────────────────────────

function buildAmbienceSection() {
  const sec = el(`<div class="snd-section">
    <div class="snd-label cyan">🔵 AMBIENTE</div>
    <div id="snd-ambiente-list"></div>
  </div>`);

  const list = sec.querySelector('#snd-ambiente-list');
  buttons.filter(b => b.category === 'ambiente').forEach(b => list.appendChild(buildAmbienceStrip(b)));

  const addBtn = el(`<button class="snd-strip-add" type="button">+ Ambiente hinzufügen</button>`);
  addBtn.addEventListener('click', () => openButtonEditor({ category: 'ambiente' }, reloadButtons));
  list.appendChild(addBtn);

  return sec;
}

function buildAmbienceStrip(btn) {
  const isOn = isActive(btn.sound_id);
  const curFaderVal = isOn && pool[btn.sound_id]
    ? Math.round((pool[btn.sound_id].el.volume / Math.max(vols.master, 0.01)) * 100)
    : Math.round(vols.ambiente * 100);

  const strip = el(`<div class="snd-strip ${isOn ? 'active-cyan' : ''}" data-strip="${btn.id}">
    <div class="snd-led cyan ${isOn ? 'active' : ''}" data-led="${btn.id}"></div>
    <button class="snd-strip-toggle ${isOn ? 'on cyan' : ''}" type="button" data-toggle>${isOn ? '⏸' : '▶'}</button>
    <span class="snd-strip-name">${btn.name}</span>
    <input type="range" class="snd-fader cyan" min="0" max="100" value="${curFaderVal}" style="--val:${curFaderVal}%">
    <button class="snd-strip-stop" type="button" title="Stop">⏹</button>
    <button class="snd-strip-edit" type="button" title="Bearbeiten">✏️</button>
  </div>`);

  const fader   = strip.querySelector('.snd-fader');
  const toggle  = strip.querySelector('[data-toggle]');
  strip.querySelector('.snd-strip-stop').addEventListener('click', () => {
    if (btn.sound_id) broadcast({ type: 'stop', soundId: btn.sound_id });
  });
  strip.querySelector('.snd-strip-edit').addEventListener('click', () => openButtonEditor(btn, reloadButtons));

  toggle.addEventListener('click', () => {
    if (!btn.sound_id || !btn.sound) return;
    if (isActive(btn.sound_id)) {
      broadcast({ type: 'stop', soundId: btn.sound_id });
    } else {
      broadcast({ type: 'play', soundId: btn.sound_id, url: btn.sound.file_url, category: 'ambiente', volume: clampVol(vols.master * (fader.value / 100)), loop: true });
    }
  });

  fader.addEventListener('input', () => {
    fader.style.setProperty('--val', fader.value + '%');
    if (btn.sound_id && pool[btn.sound_id]) {
      broadcast({ type: 'volume', soundId: btn.sound_id, volume: clampVol(vols.master * (fader.value / 100)) });
    }
  });

  return strip;
}

// ── Music Section ─────────────────────────────────────────────

function buildMusicSection() {
  const sec = el(`<div class="snd-section">
    <div class="snd-label purple">🟣 MUSIC</div>
    <div id="snd-music-list"></div>
  </div>`);

  const list = sec.querySelector('#snd-music-list');
  buttons.filter(b => b.category === 'music').forEach(b => list.appendChild(buildMusicStrip(b)));

  const addBtn = el(`<button class="snd-strip-add" type="button">+ Track hinzufügen</button>`);
  addBtn.addEventListener('click', () => openButtonEditor({ category: 'music' }, reloadButtons));
  list.appendChild(addBtn);

  return sec;
}

function buildMusicStrip(btn) {
  const isOn = isActive(btn.sound_id);
  const faderVal = Math.round(vols.music * 100);

  const strip = el(`<div class="snd-strip ${isOn ? 'active-purple' : ''}" data-strip="${btn.id}">
    <div class="snd-led purple ${isOn ? 'active' : ''}" data-led="${btn.id}"></div>
    <button class="snd-strip-toggle ${isOn ? 'on purple' : ''}" type="button" data-toggle>${isOn ? '⏸' : '▶'}</button>
    <span class="snd-strip-name">${btn.name}</span>
    <div class="snd-strip-progress" data-progress="${btn.sound_id || ''}">
      <div class="snd-strip-progress-bar" style="width:0%"></div>
    </div>
    <input type="range" class="snd-fader purple" min="0" max="100" value="${faderVal}" style="--val:${faderVal}%">
    <button class="snd-strip-stop" type="button" title="Stop">⏹</button>
    <button class="snd-strip-edit" type="button" title="Bearbeiten">✏️</button>
  </div>`);

  const fader  = strip.querySelector('.snd-fader');
  const toggle = strip.querySelector('[data-toggle]');
  strip.querySelector('.snd-strip-stop').addEventListener('click', () => {
    if (btn.sound_id) broadcast({ type: 'stop', soundId: btn.sound_id });
  });
  strip.querySelector('.snd-strip-edit').addEventListener('click', () => openButtonEditor(btn, reloadButtons));

  toggle.addEventListener('click', () => {
    if (!btn.sound_id || !btn.sound) return;
    if (isActive(btn.sound_id)) {
      broadcast({ type: 'stop', soundId: btn.sound_id });
    } else {
      broadcast({ type: 'play', soundId: btn.sound_id, url: btn.sound.file_url, category: 'music', volume: clampVol(vols.master * (fader.value / 100)), loop: true });
    }
  });

  fader.addEventListener('input', () => {
    fader.style.setProperty('--val', fader.value + '%');
    if (btn.sound_id && pool[btn.sound_id]) {
      broadcast({ type: 'volume', soundId: btn.sound_id, volume: clampVol(vols.master * (fader.value / 100)) });
    }
  });

  if (isOn && btn.sound_id && pool[btn.sound_id]) startProgressPoll(btn.sound_id, strip);

  return strip;
}

// ── Library Section ───────────────────────────────────────────

function buildLibrarySection() {
  const sec = el(`<div class="snd-section">
    <div class="snd-label white">📁 SOUND LIBRARY</div>
    <div id="snd-upload-area"></div>
    <input type="text" class="snd-search" placeholder="Suchen…" id="snd-lib-search" style="margin-top:8px;">
    <table class="snd-lib-table">
      <thead><tr>
        <th>Name</th><th>Kategorie</th><th>Größe</th><th></th>
      </tr></thead>
      <tbody id="snd-lib-body"></tbody>
    </table>
  </div>`);

  sec.querySelector('#snd-upload-area').appendChild(buildUploadZone());
  renderLibraryRows(sec.querySelector('#snd-lib-body'), '');

  sec.querySelector('#snd-lib-search').addEventListener('input', e => {
    renderLibraryRows(sec.querySelector('#snd-lib-body'), e.target.value.toLowerCase());
  });

  return sec;
}

function buildUploadZone() {
  const zone = el(`<div class="snd-upload-zone" id="snd-drop-zone">
    <div class="upload-icon">🎵</div>
    <div class="upload-text">MP3 / OGG / WAV hier ablegen oder klicken</div>
    <div class="upload-sub">Max. 20 MB</div>
  </div>`);

  const fileInput = document.createElement('input');
  fileInput.type = 'file'; fileInput.accept = 'audio/*'; fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  zone.addEventListener('click', () => fileInput.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragover'); handleFileSelected(e.dataTransfer.files[0]); });
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFileSelected(fileInput.files[0]); fileInput.value = ''; });

  return zone;
}

async function handleFileSelected(file) {
  if (!file) return;
  const name = await promptUploadName(file.name.replace(/\.[^.]+$/, ''));
  if (!name) return;
  const category = await promptUploadCategory();
  if (!category) return;
  try {
    const row = await uploadSound(file, name, category);
    sounds.unshift(row);
    render();
  } catch (e) {
    alert('Upload fehlgeschlagen: ' + e.message);
  }
}

function renderLibraryRows(tbody, query) {
  tbody.innerHTML = '';
  const filtered = sounds.filter(s => !query || s.name.toLowerCase().includes(query));
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:#444;font-size:12px;padding:12px 8px;">Keine Sounds.</td></tr>`;
    return;
  }
  filtered.forEach(s => {
    const sizeKB = s.size_bytes ? (s.size_bytes / 1024).toFixed(0) + ' KB' : '—';
    const isPreviewing = previewingId === s.id;
    const tr = el(`<tr data-lib-row="${s.id}">
      <td>${s.name}</td>
      <td><span class="snd-cat-pill ${s.category}">${catLabel(s.category)}</span></td>
      <td style="color:#555;font-size:11px;">${sizeKB}</td>
      <td style="text-align:right;">
        <button class="snd-lib-btn" data-preview title="${isPreviewing ? 'Stop' : 'Preview'}">${isPreviewing ? '⏹' : '▶'}</button>
        <button class="snd-lib-btn del" data-del title="Löschen">🗑</button>
      </td>
    </tr>`);

    const previewBtn = tr.querySelector('[data-preview]');
    previewBtn.addEventListener('click', () => togglePreview(s, tbody, query));

    tr.querySelector('[data-del]').addEventListener('click', async () => {
      if (!confirm(`"${s.name}" löschen?`)) return;
      if (previewingId === s.id) stopPreview();
      await deleteSound(s.id, s.file_path);
      sounds = sounds.filter(x => x.id !== s.id);
      renderLibraryRows(tbody, query);
    });

    tbody.appendChild(tr);
  });
}

function togglePreview(sound, tbody, query) {
  if (previewingId === sound.id) {
    stopPreview();
    refreshPreviewBtn(tbody, query, sound.id, false);
    return;
  }
  stopPreview();
  previewAudio = new Audio(sound.file_url);
  previewAudio.volume = 0.6;
  previewAudio.play().catch(() => {});
  previewingId = sound.id;
  refreshPreviewBtn(tbody, query, sound.id, true);
  previewAudio.addEventListener('ended', () => {
    previewingId = null;
    refreshPreviewBtn(tbody, query, sound.id, false);
  });
}

function stopPreview() {
  if (previewAudio) { previewAudio.pause(); previewAudio = null; }
  previewingId = null;
}

function refreshPreviewBtn(tbody, query, soundId, playing) {
  // Try to update in-place without full re-render
  const row = tbody.querySelector(`[data-lib-row="${soundId}"]`);
  if (!row) return renderLibraryRows(tbody, query);
  const btn = row.querySelector('[data-preview]');
  if (btn) { btn.textContent = playing ? '⏹' : '▶'; btn.title = playing ? 'Stop' : 'Preview'; }
}

// ── Button Editor Modal ───────────────────────────────────────

function openButtonEditor(btn, onSave) {
  const isNew = !btn.id;
  const overlay = el(`<div class="snd-modal-overlay"></div>`);
  const modal = el(`<div class="snd-modal">
    <h3>${isNew ? 'Neuer Button' : 'Button bearbeiten'}</h3>
    <div><label>Name</label><input id="bm-name" type="text" value="${btn.name || ''}" placeholder="z.B. Gunshot"></div>
    <div><label>Sound</label>
      <select id="bm-sound">
        <option value="">— Kein Sound —</option>
        ${sounds.map(s => `<option value="${s.id}" ${btn.sound_id === s.id ? 'selected' : ''}>[${catLabel(s.category)}] ${s.name}</option>`).join('')}
      </select>
    </div>
    <div><label>Kategorie</label>
      <select id="bm-cat">
        <option value="one-shot" ${btn.category === 'one-shot' ? 'selected' : ''}>One-Shot</option>
        <option value="ambiente" ${btn.category === 'ambiente' ? 'selected' : ''}>Ambiente</option>
        <option value="music"    ${btn.category === 'music'    ? 'selected' : ''}>Music</option>
      </select>
    </div>
    <div><label>Farbe (optional, Hex)</label><input id="bm-color" type="text" value="${btn.color || ''}" placeholder="#FF2D2D"></div>
    <div><label>Hotkey (optional)</label><input id="bm-hotkey" type="text" value="${btn.hotkey || ''}" placeholder="q" maxlength="3"></div>
    <div class="snd-modal-actions">
      ${!isNew ? '<button class="danger" data-del type="button">Löschen</button>' : ''}
      <button class="cancel" data-cancel type="button">Abbrechen</button>
      <button class="save" data-save type="button">Speichern</button>
    </div>
  </div>`);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  modal.querySelector('[data-cancel]').addEventListener('click', close);

  if (!isNew) {
    modal.querySelector('[data-del]').addEventListener('click', async () => {
      if (!confirm(`"${btn.name}" löschen?`)) return;
      await deleteSoundButton(btn.id);
      close(); onSave();
    });
  }

  modal.querySelector('[data-save]').addEventListener('click', async () => {
    const name = modal.querySelector('#bm-name').value.trim();
    if (!name) { modal.querySelector('#bm-name').focus(); return; }
    await saveSoundButton({
      id: btn.id,
      name,
      sound_id: modal.querySelector('#bm-sound').value || null,
      category: modal.querySelector('#bm-cat').value,
      color: modal.querySelector('#bm-color').value.trim() || null,
      hotkey: modal.querySelector('#bm-hotkey').value.trim().toLowerCase() || null,
      position: btn.position ?? 0,
    });
    close(); onSave();
  });
}

// ── Broadcast + Audio Engine ──────────────────────────────────

function broadcast(payload) {
  channel.send({ type: 'broadcast', event: 'sound', payload });
}

function handleBroadcast(payload) {
  switch (payload.type) {
    case 'play':     handlePlay(payload);   break;
    case 'stop':     handleStop(payload);   break;
    case 'volume':   handleVolume(payload); break;
    case 'stop-all': handleStopAll();       break;
  }
  updateDMUI();
}

function handlePlay({ soundId, url, category, volume, loop }) {
  if (pool[soundId]) { pool[soundId].el.pause(); delete pool[soundId]; }
  if (category === 'music') {
    if (currentMusicId && pool[currentMusicId]) { pool[currentMusicId].el.pause(); delete pool[currentMusicId]; }
    currentMusicId = soundId;
  }
  const audio = new Audio(url);
  audio.loop = loop;
  audio.volume = clampVol(volume);
  audio.play().catch(() => {});
  pool[soundId] = { el: audio, category };
  audio.addEventListener('ended', () => { if (!loop) { delete pool[soundId]; updateDMUI(); } });
}

function handleStop({ soundId }) {
  if (pool[soundId]) { pool[soundId].el.pause(); delete pool[soundId]; }
  if (currentMusicId === soundId) currentMusicId = null;
}

function handleVolume({ soundId, volume }) {
  if (pool[soundId]) pool[soundId].el.volume = clampVol(volume);
}

function handleStopAll() {
  Object.values(pool).forEach(({ el }) => el.pause());
  Object.keys(pool).forEach(k => delete pool[k]);
  currentMusicId = null;
}

function applyVolumeAll() {
  Object.entries(pool).forEach(([id, { el, category }]) => {
    const catVol = category === 'one-shot' ? vols.oneshot : category === 'ambiente' ? vols.ambiente : vols.music;
    const vol = clampVol(vols.master * catVol);
    el.volume = vol;
    broadcast({ type: 'volume', soundId: id, volume: vol });
  });
}

// ── DM UI Updates ─────────────────────────────────────────────

function updateDMUI() {
  document.querySelectorAll('[data-led]').forEach(led => {
    const btn = buttons.find(b => b.id === led.dataset.led);
    const active = btn?.sound_id && !!pool[btn.sound_id];
    const cat = btn?.category === 'one-shot' ? 'red' : btn?.category === 'ambiente' ? 'cyan' : 'purple';
    led.className = `snd-led ${cat} ${active ? 'active' : ''}`;
  });

  document.querySelectorAll('[data-strip]').forEach(strip => {
    const btn = buttons.find(b => b.id === strip.dataset.strip);
    if (!btn) return;
    const active = !!(btn.sound_id && pool[btn.sound_id]);
    const catCls = btn.category === 'ambiente' ? 'active-cyan' : 'active-purple';
    strip.classList.toggle(catCls, active);
    const toggle = strip.querySelector('[data-toggle]');
    if (toggle) {
      const colorCls = btn.category === 'ambiente' ? 'cyan' : 'purple';
      toggle.className = `snd-strip-toggle ${active ? 'on ' + colorCls : ''}`;
      toggle.textContent = active ? '⏸' : '▶';
    }
    if (active && btn.sound_id && pool[btn.sound_id]) startProgressPoll(btn.sound_id, strip);
  });
}

function startProgressPoll(soundId, strip) {
  const bar = strip.querySelector('.snd-strip-progress-bar');
  if (!bar) return;
  const tick = () => {
    if (!pool[soundId]) { bar.style.width = '0%'; return; }
    const { el } = pool[soundId];
    if (el.duration) bar.style.width = ((el.currentTime / el.duration) * 100).toFixed(1) + '%';
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ── Helpers ───────────────────────────────────────────────────

async function reloadButtons() {
  buttons = await getSoundButtons();
  render();
}

function isActive(soundId) { return soundId && !!pool[soundId]; }
function clampVol(v) { return Math.min(1, Math.max(0, v)); }
function catLabel(cat) {
  return cat === 'one-shot' ? 'One-Shot' : cat === 'ambiente' ? 'Ambiente' : 'Music';
}

function setupHotkeys(btns) {
  const map = {};
  btns.forEach(b => { if (b.hotkey) map[b.hotkey.toLowerCase()] = b; });
  if (!Object.keys(map).length) return;
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (!document.getElementById('sound-tab')) return;
    const b = map[e.key.toLowerCase()];
    if (!b?.sound) return;
    broadcast({ type: 'play', soundId: b.sound_id, url: b.sound.file_url, category: 'one-shot', volume: clampVol(vols.master * vols.oneshot), loop: false });
  });
}

function promptUploadName(defaultName) {
  return new Promise(resolve => {
    const overlay = el(`<div class="snd-modal-overlay"></div>`);
    const modal = el(`<div class="snd-modal">
      <h3>Sound benennen</h3>
      <div><label>Name</label><input id="up-name" type="text" value="${defaultName}"></div>
      <div class="snd-modal-actions">
        <button class="cancel" type="button" data-cancel>Abbrechen</button>
        <button class="save" type="button" data-ok>Weiter</button>
      </div>
    </div>`);
    overlay.appendChild(modal); document.body.appendChild(overlay);
    const inp = modal.querySelector('#up-name');
    inp.select();
    modal.querySelector('[data-cancel]').addEventListener('click', () => { overlay.remove(); resolve(null); });
    modal.querySelector('[data-ok]').addEventListener('click', () => { overlay.remove(); resolve(inp.value.trim() || defaultName); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { overlay.remove(); resolve(inp.value.trim() || defaultName); } });
  });
}

function promptUploadCategory() {
  return new Promise(resolve => {
    const overlay = el(`<div class="snd-modal-overlay"></div>`);
    const modal = el(`<div class="snd-modal">
      <h3>Kategorie wählen</h3>
      <div><label>Kategorie</label>
        <select id="up-cat">
          <option value="one-shot">One-Shot</option>
          <option value="ambiente">Ambiente</option>
          <option value="music">Music</option>
        </select>
      </div>
      <div class="snd-modal-actions">
        <button class="cancel" type="button" data-cancel>Abbrechen</button>
        <button class="save" type="button" data-ok>Hochladen</button>
      </div>
    </div>`);
    overlay.appendChild(modal); document.body.appendChild(overlay);
    const sel = modal.querySelector('#up-cat');
    modal.querySelector('[data-cancel]').addEventListener('click', () => { overlay.remove(); resolve(null); });
    modal.querySelector('[data-ok]').addEventListener('click', () => { overlay.remove(); resolve(sel.value); });
  });
}

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
