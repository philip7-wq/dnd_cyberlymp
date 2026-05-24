// ============================================================
// Combat-Modifiers Engine — Cyberpunk RED (Single Source of Truth)
// Lädt combat-modifiers.json + critical-injuries.json (cached) und
// liefert regelkonforme Kampf-Primitive. Arbeitet mit den BESTEHENDEN
// Datenshapes: jsonb-armor {head,body,shield}.{sp,penalty}, text
// critical_injuries (JSON-String via parseInjuries) ODER map-Tokens
// (headSP/bodySP, critInjuries[]). Stats sind UPPERCASE (REF, BODY…).
// ============================================================

import { roll } from './dice.js';

let DATA      = null;   // combat-modifiers.json
let CI_TABLE  = null;   // critical-injuries.json  { body:[…], head:[…] }
let CI_BY_NAME = null;  // "Broken Leg" → modifier entry (value, applies_to, side_effects)
let _loading  = null;

const DATA_URL = './assets/data/combat-modifiers.json';
const CI_URL   = './assets/data/critical-injuries.json';

export async function loadCombatData() {
  if (DATA) return DATA;
  if (_loading) return _loading;
  _loading = (async () => {
    const [mods, ci] = await Promise.all([
      fetch(DATA_URL).then(r => r.json()),
      fetch(CI_URL).then(r => r.json()).catch(() => null),
    ]);
    DATA = mods;
    CI_TABLE = ci;
    CI_BY_NAME = {};
    for (const m of (mods.modifiers || [])) {
      if (m.category === 'critical_injury') {
        CI_BY_NAME[m.name.split(' (')[0]] = m;   // "Broken Leg (Body Crit 8)" → "Broken Leg"
      }
    }
    return DATA;
  })();
  return _loading;
}

export function getData() { return DATA; }
export function getCriticalInjuryTable() { return CI_TABLE; }
export function isLoaded() { return !!DATA; }

// ── Normalisierung: char (player/dm) ODER token (map) ────────────
function injuriesOf(entity) {
  if (!entity) return [];
  if (Array.isArray(entity.critInjuries))      return entity.critInjuries;       // map token
  if (Array.isArray(entity.critical_injuries)) return entity.critical_injuries;  // already array
  if (typeof entity.critical_injuries === 'string') {
    try { return JSON.parse(entity.critical_injuries || '[]'); } catch { return []; }
  }
  return [];
}

export function getInjuryNames(entity) {
  return injuriesOf(entity).map(i => (typeof i === 'string' ? i : i?.name)).filter(Boolean);
}

function ctxOf(entity) {
  const hp    = entity?.current_hp ?? entity?.hp ?? 0;
  const maxHp = entity?.max_hp ?? entity?.maxHp ?? 0;
  const body  = entity?.stats?.BODY ?? entity?.body ?? 0;
  const ref   = entity?.stats?.REF ?? 0;
  const armorPenalty = (entity?.armorPenalty != null)
    ? entity.armorPenalty
    : getHighestArmorPenalty(entity);
  const conds = entity?.conditions || [];
  const grappling = !!(entity?.grapplePartner || entity?.is_grappling ||
    (Array.isArray(conds) && (conds.includes('Grappled') || conds.includes('Grappling'))));
  return { hp, maxHp, body, ref, armorPenalty, grappling };
}

// ── Rüstungs-Penalty: HÖCHSTE, einmal (FIX — vorher summiert) ────
export function getHighestArmorPenalty(entity) {
  // Map token: bereits berechneter MOVE/Action-Penalty
  if (entity?.armorPenalty != null && entity.armor == null) return entity.armorPenalty;
  const a = entity?.armor || {};
  return Math.max(a.head?.penalty ?? 0, a.body?.penalty ?? 0, a.shield?.penalty ?? 0);
}

// ── Modifier-Sammlung (Wound / Grapple / Armor) ──────────────────
// HINWEIS: critical_injury-Modifier werden hier NICHT mitgezählt —
// die laufen über getInjuryModifierSum/getInjuryPenaltyStruct
// (Lookup per Name), um Doppelzählung zu vermeiden.
const STAT_CHECK_FOR = { ranged_attack: 'ref_checks', melee_attack: 'dex_checks', martial_arts: 'dex_checks' };

function appliesToAction(mod, actionType) {
  const a = mod.applies_to || [];
  if (a.includes('all_actions') || a.includes(actionType)) return true;
  const sc = STAT_CHECK_FOR[actionType];
  return !!(sc && a.includes(sc));
}

export function getActiveModifiers(entity, actionType) {
  if (!DATA) return [];
  const ctx = ctxOf(entity);
  return DATA.modifiers.filter(m =>
    m.category !== 'critical_injury' &&
    m.trigger === 'automatic' &&
    appliesToAction(m, actionType) &&
    evaluateCondition(m.condition, ctx)
  );
}

export function sumModifiers(mods) {
  return (mods || []).reduce((s, m) => s + (m.value || 0), 0);
}

export function evaluateCondition(condition, ctx) {
  if (!condition) return false;
  switch (condition) {
    case 'hp < ceil(max_hp / 2)': return ctx.maxHp > 0 && ctx.hp < Math.ceil(ctx.maxHp / 2) && ctx.hp >= 1;
    case 'hp < 1':                return ctx.hp < 1;
    case 'is_grappling':          return ctx.grappling;
    case 'highest_worn_armor_penalty == 2': return ctx.armorPenalty === 2;
    case 'highest_worn_armor_penalty == 4': return ctx.armorPenalty === 4;
    default: return false;
  }
}

// ── Critical-Injury Penalties (Lookup per Name) ──────────────────
const _CATEGORY_FOR = {
  all_actions: 'allActions',
  move_checks: 'move',
  ranged_attack: 'ranged',
  melee_attack: 'melee',
  martial_arts: 'melee',
  perception_check: 'perception',
  perception_check_vision: 'perception',
  perception_check_hearing: 'perception',
  speech_actions: 'social',
};

// {move, allActions, ranged, melee, perception, social} — Drop-in für
// player.html getInjuryPenalties().
export function getInjuryPenaltyStruct(entity) {
  const out = { move: 0, allActions: 0, ranged: 0, melee: 0, perception: 0, social: 0 };
  if (!CI_BY_NAME) return out;
  for (const name of getInjuryNames(entity)) {
    const mod = CI_BY_NAME[name];
    if (!mod || !mod.value) continue;
    const seen = new Set();
    for (const at of (mod.applies_to || [])) {
      const key = _CATEGORY_FOR[at];
      if (key && !seen.has(key)) { out[key] += mod.value; seen.add(key); }
    }
  }
  return out;
}

// Summe der Injury-Modifier für einen konkreten Action-Typ (für Attack-Rolls).
export function getInjuryModifierSum(entity, actionType) {
  if (!CI_BY_NAME) return 0;
  let sum = 0;
  for (const name of getInjuryNames(entity)) {
    const mod = CI_BY_NAME[name];
    if (!mod || !mod.value) continue;
    if (appliesToAction(mod, actionType)) sum += mod.value;
  }
  return sum;
}

// ── Base Death Save Penalty (abgeleitet aus Injuries) ────────────
export function getBaseDeathSavePenalty(entity) {
  if (!CI_BY_NAME) {
    // Fallback: Effekttext-Match (bisheriges Muster)
    return injuriesOf(entity).filter(i =>
      (i?.effect || '').includes('Base Death Save Penalty is increased')).length;
  }
  let sum = 0;
  for (const name of getInjuryNames(entity)) {
    sum += CI_BY_NAME[name]?.side_effects?.base_dsp_increase || 0;
  }
  return sum;
}

// ── Waffenklasse (weapon-utils kennt nur ranged dvTypes) ─────────
export function getWeaponClass(weapon) {
  if (!weapon) return 'ranged';
  if (weapon.weaponClass) return weapon.weaponClass;
  const s = [weapon.name, weapon.skill, weapon.type, weapon.dvType, weapon.notes]
    .filter(Boolean).join(' ').toLowerCase();
  if (/martial art/.test(s)) return 'martial_arts';
  if (/\bbrawl|\bfist|knuckle|unarmed/.test(s)) return 'brawling';
  if (/melee|knife|blade|sword|katana|machete|\baxe|\bclub|\bbat\b|pipe|crowbar|hammer|nunchaku|tomahawk|baton|spear|naginata|kendachi/.test(s))
    return 'melee_weapon';
  return 'ranged';
}

// ── Damage-Pipeline: SP-Abzug + Aimed-Shot-Multiplier ────────────
export function computeDamageThrough(damage, sp, opts = {}) {
  const { weaponClass = 'ranged', aimedShot = null, crackedSkull = false } = opts;
  const spRaw = Math.max(0, sp || 0);
  let spEff = spRaw;
  if (weaponClass === 'melee_weapon' || weaponClass === 'martial_arts') spEff = Math.floor(spRaw / 2);
  else if (weaponClass === 'choke_throw') spEff = 0;

  let through = Math.max(0, (damage || 0) - spEff);
  if (aimedShot === 'head' && through > 0) through *= (crackedSkull ? 3 : 2);

  const ablate = through > 0 && weaponClass !== 'choke_throw';
  return { through, spEff, ablate, spAfter: Math.max(0, spRaw - (ablate ? 1 : 0)) };
}

// ── Critical Injury würfeln (2d6 auf Body/Head-Tabelle) ──────────
export function rollCriticalInjury(location, existingNames = [], ciTable = null) {
  const table = location === 'head' ? 'head' : 'body';
  const list = (ciTable || CI_TABLE)?.[table] || [];
  if (!list.length) return null;
  const taken = new Set(existingNames);
  for (let attempt = 0; attempt < 40; attempt++) {
    const r = (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1);
    const found = list.find(e => e.roll === r);
    if (found && !taken.has(found.name)) {
      return { injury: { ...found, table }, table, bonusDamage: 5 };
    }
  }
  // Alle Injuries dieser Tabelle bereits vorhanden
  return null;
}

// ── Death Save (regelkonform; persistierbar) ─────────────────────
// survive  ⟺  d10 !== 10 && (d10 + DSP) < BODY
export function resolveDeathSave(entity) {
  const body       = entity?.death_save ?? entity?.stats?.BODY ?? entity?.body ?? 0;
  const curPenalty = entity?.death_save_penalty ?? 0;
  const d10        = Math.floor(Math.random() * 10) + 1;
  const survived   = d10 !== 10 && (d10 + curPenalty) < body;
  return { d10, body, penalty: curPenalty, newPenalty: curPenalty + 1, survived, autoFail: d10 === 10 };
}

// ── Universeller Roll-Wrapper (Abschnitt V) ──────────────────────
export async function rollWithModifiers(entity, opts = {}) {
  const {
    statVal = 0, skillVal = 0, actionType = 'all_actions',
    manualMods = [], isSkillCheck = true,
    context = null, characterId = null, characterName = null,
  } = opts;

  const autoMods   = getActiveModifiers(entity, actionType);
  const injurySum  = getInjuryModifierSum(entity, actionType);
  const autoSum    = sumModifiers(autoMods) + injurySum;
  const manualSum  = (manualMods || []).reduce((s, m) => s + (typeof m === 'number' ? m : (m.value || 0)), 0);
  const base       = (statVal || 0) + (skillVal || 0) + autoSum + manualSum;
  const expr       = base >= 0 ? `1d10+${base}` : `1d10${base}`;

  const result = await roll(expr, { context, isSkillCheck, characterId, characterName });

  const parts = [`1d10`];
  if (statVal)   parts.push(`STAT ${statVal}`);
  if (skillVal)  parts.push(`Skill ${skillVal}`);
  for (const m of autoMods) parts.push(`${m.value >= 0 ? '+' : ''}${m.value} ${m.name}`);
  if (injurySum) parts.push(`${injurySum} Injury`);
  if (manualSum) parts.push(`${manualSum >= 0 ? '+' : ''}${manualSum} Mod`);

  return { result, autoMods, autoSum, injurySum, manualSum, base, expr, breakdown: parts.join('  ') };
}
