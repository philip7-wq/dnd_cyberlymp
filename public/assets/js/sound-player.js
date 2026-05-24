// ============================================================
// Sound Player — runs on player.html, listens to DM broadcasts.
// No UI except a small indicator element (#sound-indicator).
// Auto-initializes on import.
// ============================================================

import { createSoundChannel } from './supabase.js';

const pool = {};     // soundId → { el: HTMLAudioElement, category: string }
let masterVol = 1;

const indicator = document.getElementById('sound-indicator');

// ── Channel subscription ─────────────────────────────────────

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
  audio.loop = !!loop;
  audio.volume = clamp(volume * masterVol);
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
  if (pool[soundId]) pool[soundId].el.volume = clamp(volume * masterVol);
}

function stopAll() {
  Object.values(pool).forEach(({ el }) => el.pause());
  Object.keys(pool).forEach(k => delete pool[k]);
  updateIndicator();
}

// ── Indicator ─────────────────────────────────────────────────

function updateIndicator() {
  if (!indicator) return;
  const active = Object.keys(pool).length > 0;
  indicator.classList.toggle('active', active);
}

function clamp(v) { return Math.min(1, Math.max(0, v)); }
