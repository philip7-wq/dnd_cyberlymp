// ============================================================
// Dice engine — Cyberpunk RED
// roll(expr, opts) → { total, individualRolls, isCritSuccess, isCritFailure }
// Crit logic only on skill checks (isSkillCheck: true).
// @3d-dice/dice-box is attempted; CSS animation is the fallback.
// ============================================================

import { logRoll } from './supabase.js';

// ── @3d-dice/dice-box (optional) ─────────────────────────────
let diceBox = null;

export async function initDiceBox(_containerSelector) {
  // 3D dice-box disabled — asset loading from CDN fails on localhost (Babylon.js URL error).
  // CSS fallback is used instead; roll math and crit detection are unaffected.
  diceBox = null;
}

// ── Core roll engine ─────────────────────────────────────────

/**
 * @param {string} expression  e.g. "1d10+5", "3d6", "1d10+1d6+3"
 * @param {{ context?, isSkillCheck?, characterId?, characterName? }} opts
 * @returns {{ total, individualRolls, isCritSuccess, isCritFailure }}
 */
export async function roll(expression, opts = {}) {
  const { context = null, isSkillCheck = false, characterId = null, characterName = null } = opts;

  const terms     = parseExpression(expression.replace(/\s/g, ''));
  const rolls     = [];
  let modifier    = 0;
  let total       = 0;
  let isCritSuccess = false;
  let isCritFailure = false;
  let firstD10    = null;

  for (const t of terms) {
    if (t.type === 'dice') {
      const sign = t.count < 0 ? -1 : 1;
      for (let i = 0; i < Math.abs(t.count); i++) {
        const raw = Math.floor(Math.random() * t.sides) + 1;
        rolls.push({ die: t.sides, value: sign * raw });
        total += sign * raw;
        if (t.sides === 10 && firstD10 === null) firstD10 = raw;
      }
    } else {
      modifier += t.value;
      total    += t.value;
    }
  }

  // Crit detection — skill checks only, first d10 in expression
  if (isSkillCheck && firstD10 !== null) {
    if (firstD10 === 10) {
      isCritSuccess = true;
      const bonus = Math.floor(Math.random() * 10) + 1;
      rolls.push({ die: 10, value: bonus, isCritBonus: true });
      total += bonus;
    } else if (firstD10 === 1) {
      isCritFailure = true;
      const penalty = Math.floor(Math.random() * 10) + 1;
      rolls.push({ die: 10, value: -penalty, isCritPenalty: true });
      total -= penalty;
    }
  }

  // Log to DB (fire-and-forget)
  if (characterId) {
    logRoll({ characterId, characterName, expression, individualRolls: rolls,
              modifier, total, context, isCritSuccess, isCritFailure })
      .catch(e => console.warn('[dice] logRoll failed:', e));
  }

  return { total, individualRolls: rolls, isCritSuccess, isCritFailure };
}

// ── Expression parser ────────────────────────────────────────

function parseExpression(expr) {
  const terms = [];
  const re    = /([+-]?\d+)d(\d+)|([+-]?\d+)/gi;
  let m;
  while ((m = re.exec(expr)) !== null) {
    if (m[1] !== undefined) {
      terms.push({ type: 'dice', count: parseInt(m[1], 10) || 1, sides: parseInt(m[2], 10) });
    } else if (m[3] !== undefined) {
      terms.push({ type: 'mod', value: parseInt(m[3], 10) });
    }
  }
  return terms;
}

// ── Dice-box helper (used by popup) ─────────────────────────
export function hasDiceBox() { return diceBox !== null; }
export function getDiceBox() { return diceBox; }
