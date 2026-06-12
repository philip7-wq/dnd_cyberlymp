// ============================================================
// SOLO — Combat Awareness (Cyberpunk RED, pg. 146)
// Punkte werden vor Kampfbeginn / mit Action verteilt.
// Verteilung persistiert bis Solo sie neu zuteilt.
// ============================================================

import {
  buildHeader, buildActionCard, buildSubtabs, buildLog, openModal,
  performCheck, renderRollResult, logAction, el
} from './roles-core.js';
import { supabase } from '../supabase.js';

// Exakte Punktkosten aus Playbook
const CA_ABILITIES = [
  { key: 'deflection', name: 'Damage Deflection', desc: 'Erste erlittene Schaden in Round reduzieren.',
    steps: [
      { cost: 2, label: 'Stufe 1 — −1 dmg' },
      { cost: 4, label: 'Stufe 2 — −2 dmg' },
      { cost: 6, label: 'Stufe 3 — −3 dmg' },
      { cost: 8, label: 'Stufe 4 — −4 dmg' },
      { cost: 10,label: 'Stufe 5 — −5 dmg' },
    ] },
  { key: 'fumble', name: 'Fumble Recovery', desc: 'Ignoriere Critical Failures (1en) bei Angriffen. Roll gilt trotzdem als 1.',
    steps: [{ cost: 4, label: '4 Pts — aktiv' }] },
  { key: 'initiative', name: 'Initiative Reaction', desc: '+1 auf Initiative pro Punkt.',
    perPoint: true },
  { key: 'precision', name: 'Precision Attack', desc: '+X auf Attack Rolls.',
    steps: [
      { cost: 3, label: '3 Pts — +1 ATK' },
      { cost: 6, label: '6 Pts — +2 ATK' },
      { cost: 9, label: '9 Pts — +3 ATK' },
    ] },
  { key: 'spotweak', name: 'Spot Weakness', desc: '+1 Damage (vor Armor) auf den ersten erfolgreichen Attack pro Round, pro Punkt.',
    perPoint: true },
  { key: 'threat', name: 'Threat Detection', desc: '+1 auf Perception Checks pro Punkt.',
    perPoint: true },
];

function getCAState(character) {
  const key = `solo-ca-${character.id}`;
  try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; }
}
function saveCAState(character, state) {
  localStorage.setItem(`solo-ca-${character.id}`, JSON.stringify(state));
  supabase.from('characters')
    .update({ role_ability_data: { combatAwareness: state } })
    .eq('id', character.id)
    .then(() => {}).catch(console.warn);
}

export async function mount(panel, character) {
  panel.innerHTML = '';
  panel.appendChild(el(buildHeader('solo', character)));

  const main = el(`<div></div>`);
  panel.appendChild(main);
  panel.appendChild(await buildLog(character.id));

  const subtabs = buildSubtabs([
    { key: 'distrib', label: '⚔️ Combat Awareness' },
    { key: 'rolls',   label: '🎲 Combat Rolls' },
  ], (k) => render(k));
  main.appendChild(subtabs);

  const view = el(`<div></div>`);
  main.appendChild(view);

  async function render(key) {
    view.innerHTML = '';
    if (key === 'distrib') return renderDistribution(view, character);
    if (key === 'rolls')   return renderRolls(view, character);
  }
  render('distrib');
}

function renderDistribution(view, character) {
  view.innerHTML = '';
  const rank = character.role_rank || 4;
  let state = getCAState(character);

  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Combat Awareness Verteilung — Rank ${rank}</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      Verteile deine Punkte auf Combat Abilities. Punktkosten sind <b>aus dem Playbook</b>.
      Aktiv: <b id="ca-used">0</b> / ${rank} Pts.
    </div>
    <div id="ca-list"></div>
    <button class="role-dice-btn secondary" id="ca-reset" style="margin-top:10px;">Reset</button>
  </div>`));

  const list = view.querySelector('#ca-list');
  CA_ABILITIES.forEach(ab => {
    const cur = state[ab.key] || 0;
    const section = el(`<div style="padding:10px 0; border-bottom:1px solid var(--role-line);">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-family:'Rajdhani'; font-size:13px;">${ab.name}</div>
          <div style="font-size:11px; color:var(--role-muted);">${ab.desc}</div>
        </div>
      </div>
      <div class="role-row" style="gap:6px; margin-top:8px; flex-wrap:wrap;" data-controls></div>
    </div>`);
    const ctrls = section.querySelector('[data-controls]');

    if (ab.perPoint) {
      // ±1 buttons
      const wrap = el(`<div class="role-row" style="gap:4px; align-items:center;">
        <button class="role-dice-btn secondary" data-d="-1">−</button>
        <span class="role-pill" style="min-width:30px; text-align:center;" data-val>${cur}</span>
        <span style="font-size:10px; color:var(--role-muted);">Pts (= +${cur} Bonus)</span>
        <button class="role-dice-btn secondary" data-d="+1">＋</button>
      </div>`);
      wrap.querySelectorAll('button[data-d]').forEach(b => {
        b.addEventListener('click', () => {
          const delta = +b.dataset.d;
          const used = Object.values(state).reduce((a, b) => a + b, 0);
          const curVal = state[ab.key] || 0;
          if (delta > 0 && used >= rank) return;
          if (delta < 0 && curVal <= 0) return;
          state[ab.key] = curVal + delta;
          saveCAState(character, state);
          wrap.querySelector('[data-val]').textContent = state[ab.key];
          updateTotal();
        });
      });
      ctrls.appendChild(wrap);
    } else {
      // Step buttons
      ab.steps.forEach(s => {
        const active = (state[ab.key] || 0) >= s.cost;
        const btn = el(`<button class="role-dice-btn ${active ? '' : 'secondary'}" data-cost="${s.cost}">${s.label}</button>`);
        btn.addEventListener('click', () => {
          const used = Object.values(state).reduce((a, b) => a + b, 0);
          const curVal = state[ab.key] || 0;
          if (curVal === s.cost) {
            // Toggle off
            state[ab.key] = 0;
          } else {
            const delta = s.cost - curVal;
            if (used + delta > rank) return;
            state[ab.key] = s.cost;
          }
          saveCAState(character, state);
          renderDistribution(view, character);
        });
        ctrls.appendChild(btn);
      });
    }
    list.appendChild(section);
  });

  view.querySelector('#ca-reset').addEventListener('click', () => {
    saveCAState(character, {});
    renderDistribution(view, character);
  });

  function updateTotal() {
    const total = Object.values(state).reduce((a, b) => a + b, 0);
    const el2 = view.querySelector('#ca-used');
    if (el2) el2.textContent = total;
  }
  updateTotal();
}

function renderRolls(view, character) {
  view.innerHTML = '';
  const state = getCAState(character);

  // Berechne aktuelle Bonis
  const precisionBonus = state.precision === 9 ? 3 : state.precision === 6 ? 2 : state.precision === 3 ? 1 : 0;
  const spotWeakness = state.spotweak || 0;
  const initBonus = state.initiative || 0;
  const threatBonus = state.threat || 0;
  const deflection = state.deflection === 10 ? 5 : state.deflection === 8 ? 4 : state.deflection === 6 ? 3 : state.deflection === 4 ? 2 : state.deflection === 2 ? 1 : 0;
  const fumbleRecovery = (state.fumble || 0) >= 4;

  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Aktive Boni</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      ⚔️ Precision Attack <b>+${precisionBonus}</b> · 💥 Spot Weakness <b>+${spotWeakness}</b> dmg · 
      ⚡ Initiative <b>+${initBonus}</b> · 👁️ Threat Detection <b>+${threatBonus}</b> Perception ·
      🛡️ Damage Deflection <b>−${deflection}</b> first hit · ${fumbleRecovery ? '🎯 Fumble Recovery aktiv' : ''}
    </div>
  </div>`));

  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Combat Quick Rolls</div>
    <div class="role-card-desc" style="margin-bottom:10px;">Boni werden automatisch eingerechnet.</div>
    <div class="role-cards" id="solo-actions"></div>
  </div>`));

  const cards = view.querySelector('#solo-actions');
  const actions = [
    { key: 'attack',     name: 'Ranged Attack',  bonus: precisionBonus,   desc: `DEX/REF + Weapon Skill + 1d10${precisionBonus ? ' +' + precisionBonus : ''}` },
    { key: 'melee',      name: 'Melee Attack',   bonus: precisionBonus,   desc: `DEX + Brawling/Melee + 1d10${precisionBonus ? ' +' + precisionBonus : ''}` },
    { key: 'damage',     name: 'Damage Roll',    bonus: spotWeakness,     desc: `Weapon dmg${spotWeakness ? ' +' + spotWeakness : ''} (vor Armor)`, kind: 'damage' },
    { key: 'initiative', name: 'Initiative',     bonus: initBonus,        desc: `REF + 1d10${initBonus ? ' +' + initBonus : ''}` },
    { key: 'perception', name: 'Perception',     bonus: threatBonus,      desc: `INT + Perception + 1d10${threatBonus ? ' +' + threatBonus : ''}` },
    { key: 'dodge',      name: 'Evasion',        bonus: 0,                desc: `DEX + Evasion + 1d10` },
  ];
  actions.forEach(a => {
    cards.appendChild(buildActionCard({
      name: a.name,
      meta: a.bonus ? `Bonus +${a.bonus}` : '',
      desc: a.desc,
      onClick: () => openSoloRoll(character, a, fumbleRecovery)
    }));
  });
}

function openSoloRoll(character, action, fumbleRecovery) {
  const isDamage = action.kind === 'damage';
  const stats = character.stats || {};
  const defaultStat = action.key === 'initiative' ? (stats.REF ?? 6)
    : action.key === 'perception' ? (stats.INT ?? 6)
    : action.key === 'melee' ? (stats.DEX ?? 6)
    : (stats.REF ?? 6);
  const html = `
    <h3>${action.name}</h3>
    <div class="role-card-desc">${action.desc}</div>
    ${!isDamage ? `
      <label>Stat</label><input type="number" id="r-stat" value="${defaultStat}">
      <label>Skill</label><input type="number" id="r-skill" value="6">
    ` : `
      <label>Weapon Damage Roll (manuell, z.B. 3d6=12)</label>
      <input type="number" id="r-dmg" value="0">
    `}
    <label>Modifier (CA-Bonus +${action.bonus} bereits eingerechnet, hier nur extra)</label>
    <input type="number" id="r-mod" value="${action.bonus}">
    <label>DV (optional)</label><input type="number" id="r-dv" value="">
    <div class="role-modal-actions">
      <button data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="roll">Roll</button>
    </div>
    <div id="r-out" style="margin-top:12px;"></div>`;
  openModal(html, (modal, close) => {
    modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
    modal.querySelector('[data-act="roll"]').addEventListener('click', async () => {
      if (isDamage) {
        const dmg = (+modal.querySelector('#r-dmg').value || 0) + (+modal.querySelector('#r-mod').value || 0);
        modal.querySelector('#r-out').innerHTML = `
          <div class="role-dice-result"><span class="dice-total">${dmg}</span> Damage</div>`;
        await logAction(character.id, 'solo', 'Damage', { summary: `${dmg} dmg` });
        return;
      }
      const dvRaw = modal.querySelector('#r-dv').value;
      let roll = performCheck({
        stat: +modal.querySelector('#r-stat').value || 0,
        skill: +modal.querySelector('#r-skill').value || 0,
        mod: +modal.querySelector('#r-mod').value || 0,
        dv: dvRaw === '' ? null : +dvRaw,
        entity: character,
      });
      // Fumble Recovery: re-treat the natural 1 as just 1 (kein subtract)
      let note = '';
      if (fumbleRecovery && roll.base === 1) {
        roll.total = roll.total + roll.fumble; // negate the subtract
        roll.fumble = 0;
        if (roll.dv !== null) roll.success = roll.total >= roll.dv;
        note = '🎯 Fumble Recovery aktiv — 1 zählt nur als 1, kein Subtract.';
      }
      modal.querySelector('#r-out').innerHTML = renderRollResult(roll, { note });
      await logAction(character.id, 'solo', action.name, { roll, summary: action.desc });
      setTimeout(close, 1600);
    });
  });
}
