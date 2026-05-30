// ============================================================
// In-Game Time & Effect Engine
// ------------------------------------------------------------
// Verhältnis: 1 RL-Sek = 4 IG-Sek. Vier Modi: running / paused /
// combat / long_rest. game_state ist Singleton (id=1) und wird
// per Realtime gespiegelt. Reader sind synchron und greifen auf
// den lokalen Cache _gs zu.
// ============================================================

import {
  getGameState as _fetchGameState,
  patchGameState,
  subscribeGameState as _subscribeGameStateRaw,
  patchCharacter,
  getCharacters,
  removeCharacterEffectsBy,
  supabase,
} from './supabase.js';

const REAL_TO_IG = 4;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS  = 24 * HOUR_MS;
const LONG_REST_REAL_MS = 5000;
const LONG_REST_INGAME_MS = 8 * HOUR_MS;
const NATURAL_HEAL_PER_HOUR = 1;

let _gs = null;                       // synchroner Cache des game_state
let _subscribers = new Set();         // Listener für Mode-/Anker-Changes
let _longRestTimer = null;            // 5-Sek-Real-Timer für completeLongRest

// ── Lebenszyklus ─────────────────────────────────────────────

/** Initial laden + Realtime-Subscription. Idempotent. */
export async function initGameTime() {
  if (_gs) return _gs;
  _gs = await _fetchGameState();
  _subscribeGameStateRaw(payload => {
    if (payload.new) {
      _gs = payload.new;
      _notify();
    }
  });
  return _gs;
}

/** Synchroner Zugriff auf den letzten bekannten Stand. */
export function getCachedGameState() { return _gs; }

/** Listener auf game_state-Updates. Returnt unsubscribe. */
export function onGameStateChange(fn) {
  _subscribers.add(fn);
  return () => _subscribers.delete(fn);
}
function _notify() { _subscribers.forEach(fn => { try { fn(_gs); } catch (e) { console.warn(e); } }); }

// ── Reader ───────────────────────────────────────────────────

export function getCurrentIngameTime(gs = _gs) {
  if (!gs) return new Date();
  const base = new Date(gs.current_ingame_time);
  if (gs.mode !== 'running' || !gs.last_resume_real) return base;
  const elapsed = Date.now() - new Date(gs.last_resume_real).getTime();
  return new Date(base.getTime() + elapsed * REAL_TO_IG);
}

/** "YYYY-MM-DD  HH:MM:SS" — zwei NBSPs zwischen Datum und Zeit (Spec §8.3). */
export function formatIngameTime(date) {
  const d = (date instanceof Date) ? date : new Date(date);
  const Y = d.getUTCFullYear();
  const M = String(d.getUTCMonth() + 1).padStart(2, '0');
  const D = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return `${Y}-${M}-${D}  ${h}:${m}:${s}`;
}

export function formatIngameDateShort(date) {
  const d = (date instanceof Date) ? date : new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')} ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
}

/** Lazy-Eval Heilung: +1 HP/h passiv im Mode 'running'. */
export function getEffectiveHp(character, now = getCurrentIngameTime(), mode = _gs?.mode) {
  if (!character) return 0;
  const curHp = character.current_hp ?? 0;
  const maxHp = character.max_hp ?? 0;
  if (curHp < 1) return curHp;                   // Mortally Wounded — keine passive Heilung
  if (mode !== 'running') return curHp;
  if (curHp >= maxHp) return curHp;
  const lastTick = new Date(character.last_hp_tick_at_ingame || '2045-09-15T08:00:00Z');
  const nowDate  = (now instanceof Date) ? now : new Date(now);
  const hours    = Math.floor((nowDate.getTime() - lastTick.getTime()) / HOUR_MS);
  if (hours <= 0) return curHp;
  return Math.min(maxHp, curHp + hours * NATURAL_HEAL_PER_HOUR);
}

/** Schlafentzug-Modifier (virtual, nicht persistiert). */
export function getSleepDeprivationModifier(character, now = getCurrentIngameTime()) {
  if (!character) return { value: 0, label: null, hoursAwake: 0 };
  const lastRest = new Date(character.last_long_rest_at_ingame || '2045-09-15T08:00:00Z');
  const nowDate  = (now instanceof Date) ? now : new Date(now);
  const hoursAwake = (nowDate.getTime() - lastRest.getTime()) / HOUR_MS;
  if (hoursAwake >= 48) return { value: -4, label: 'Erschöpft (48h+ wach)', hoursAwake };
  if (hoursAwake >= 36) return { value: -2, label: 'Sehr müde (36h+ wach)', hoursAwake };
  if (hoursAwake >= 24) return { value: -1, label: 'Müde (24h+ wach)', hoursAwake };
  return { value: 0, label: null, hoursAwake };
}

/** Liefert pro Injury-Name ob sie aktuell durch einen Quickfix-Effekt maskiert ist. */
export function getQuickfixedInjuryNames(effects = []) {
  const out = new Set();
  for (const e of effects) {
    if (e?.effect_type === 'quickfix') {
      const n = e?.meta?.covered_injury_name;
      if (n) out.add(n);
    }
  }
  return out;
}

// ── Mode-Mutationen (single-writer empfohlen für game_state) ─

export async function pauseTime() {
  const now = getCurrentIngameTime();
  await patchGameState({
    current_ingame_time: now.toISOString(),
    mode: 'paused',
    last_resume_real: null,
  });
}

export async function resumeTime() {
  await patchGameState({ mode: 'running', last_resume_real: new Date().toISOString() });
}

/** Springt um deltaMs IG-Zeit. Heilt passiv alle Chars, räumt abgelaufene Effekte auf. */
export async function dmJumpTime(deltaMs) {
  if (!_gs) return;
  const oldTime = getCurrentIngameTime();
  const newTime = new Date(oldTime.getTime() + deltaMs);
  await tickAllCharactersPassiveHeal(newTime);
  await cleanupExpiredEffects(newTime);
  await patchGameState({
    current_ingame_time: newTime.toISOString(),
    last_resume_real: _gs.mode === 'running' ? new Date().toISOString() : _gs.last_resume_real,
  });
}

// ── Combat ───────────────────────────────────────────────────

export async function startCombat() {
  const now = getCurrentIngameTime();
  await patchGameState({
    current_ingame_time: now.toISOString(),
    mode: 'combat',
    last_resume_real: null,
    combat_started_at_ingame: now.toISOString(),
    combat_round: 1,
  });
}

export async function endCombat() {
  await patchGameState({
    mode: 'running',
    last_resume_real: new Date().toISOString(),
    combat_started_at_ingame: null,
    combat_round: 0,
  });
}

export async function advanceCombatRound() {
  if (!_gs || _gs.mode !== 'combat') return;
  const now = getCurrentIngameTime();
  const newTime = new Date(now.getTime() + 5000); // +5 IG-Sek
  await patchGameState({
    current_ingame_time: newTime.toISOString(),
    combat_round: (_gs.combat_round || 0) + 1,
  });
}

// ── Long Rest ────────────────────────────────────────────────

export async function startLongRest(characterId) {
  const realNow = Date.now();
  await patchGameState({
    mode: 'long_rest',
    long_rest_initiator_character_id: characterId,
    long_rest_started_real: new Date(realNow).toISOString(),
    long_rest_ends_real: new Date(realNow + LONG_REST_REAL_MS).toISOString(),
  });
  clearTimeout(_longRestTimer);
  _longRestTimer = setTimeout(async () => {
    const fresh = await _fetchGameState();
    if (fresh?.mode !== 'long_rest') return;       // gecancelt
    if (fresh.long_rest_initiator_character_id !== characterId) return;
    await completeLongRest(characterId);
  }, LONG_REST_REAL_MS + 200);
}

export async function cancelLongRest() {
  clearTimeout(_longRestTimer);
  _longRestTimer = null;
  await patchGameState({
    mode: 'running',
    last_resume_real: new Date().toISOString(),
    long_rest_initiator_character_id: null,
    long_rest_started_real: null,
    long_rest_ends_real: null,
  });
}

export async function completeLongRest(initiatorId) {
  if (!_gs) await initGameTime();
  const oldTime = new Date(_gs.current_ingame_time);
  const newTime = new Date(oldTime.getTime() + LONG_REST_INGAME_MS);

  // 1. Initiator: nur Sleep-Counter + HP-Anker resetten (passive Heilung läuft über tickAll unten)
  await patchCharacter(initiatorId, {
    last_long_rest_at_ingame: newTime.toISOString(),
    // last_hp_tick_at_ingame wird in tickAllCharactersPassiveHeal gesetzt
  });

  // 2. Quickfix/ends-on-long-rest-Effekte des Initiators löschen
  await removeCharacterEffectsBy({ characterId: initiatorId, endsOnLongRest: true });

  // 3. Passive Heilung für ALLE Chars (+8 IG-h * 1 HP) + Cleanup abgelaufener Effekte
  await tickAllCharactersPassiveHeal(newTime);
  await cleanupExpiredEffects(newTime);

  // 4. Mode zurück auf running + Time vorspulen
  await patchGameState({
    current_ingame_time: newTime.toISOString(),
    mode: 'running',
    last_resume_real: new Date().toISOString(),
    long_rest_initiator_character_id: null,
    long_rest_started_real: null,
    long_rest_ends_real: null,
  });
}

// ── Heilung-Batch ────────────────────────────────────────────

/** Persistiert getEffectiveHp für alle Charaktere; lebende Chars bekommen ihre passive Heilung. */
export async function tickAllCharactersPassiveHeal(newTime, { exceptId = null } = {}) {
  const chars = await getCharacters();
  for (const c of chars) {
    if (exceptId && c.id === exceptId) continue;
    const eff = getEffectiveHp(c, newTime, 'running');
    if (eff === (c.current_hp ?? 0)) continue;
    try {
      await patchCharacter(c.id, {
        current_hp: eff,
        last_hp_tick_at_ingame: newTime.toISOString(),
      });
    } catch (e) { console.warn('tick heal failed for', c.id, e); }
  }
}

export async function applyDamage(character, damage, now = getCurrentIngameTime()) {
  const evalHp = getEffectiveHp(character, now, _gs?.mode || 'running');
  const newHp = Math.max(0, evalHp - (damage || 0));
  await patchCharacter(character.id, {
    current_hp: newHp,
    last_hp_tick_at_ingame: now.toISOString(),
  });
  return newHp;
}

export async function applyHeal(character, amount, now = getCurrentIngameTime()) {
  const evalHp = getEffectiveHp(character, now, _gs?.mode || 'running');
  const newHp = Math.min(character.max_hp ?? evalHp + amount, evalHp + (amount || 0));
  await patchCharacter(character.id, {
    current_hp: newHp,
    last_hp_tick_at_ingame: now.toISOString(),
  });
  return newHp;
}

// ── Effekt-Cleanup ───────────────────────────────────────────

export async function cleanupExpiredEffects(currentTime = getCurrentIngameTime()) {
  try {
    await removeCharacterEffectsBy({ expiresBefore: currentTime.toISOString() });
  } catch (e) { console.warn('cleanupExpiredEffects:', e); }
}

// ── Build-Time-Parser ────────────────────────────────────────

/** "1h" | "6h" | "1 day" | "1 week" | "2 weeks" | "1 month" → IG-Stunden in ms. */
export function parseBuildTimeToIngameMs(str) {
  if (!str) return 0;
  const s = String(str).trim().toLowerCase();
  const m = s.match(/(\d+)\s*(h|hour|hours|d|day|days|w|week|weeks|mo|month|months)/);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  const u = m[2];
  if (u === 'h' || u.startsWith('hour')) return n * HOUR_MS;
  if (u === 'd' || u.startsWith('day'))  return n * DAY_MS;
  if (u === 'w' || u.startsWith('week')) return n * 7 * DAY_MS;
  if (u === 'mo' || u.startsWith('month')) return n * 30 * DAY_MS;
  return 0;
}

/** "4h 12m" — kompakte Anzeige für Countdowns. Negative Werte → "ready". */
export function formatDuration(ms) {
  if (ms <= 0) return 'ready';
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / (24*60));
  const hours = Math.floor((totalMin % (24*60)) / 60);
  const mins = totalMin % 60;
  if (days)  return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
