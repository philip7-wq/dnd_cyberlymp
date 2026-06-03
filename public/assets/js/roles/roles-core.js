// ============================================================
// ROLES — Core utilities (Playbook-aligned)
// Dice, UI helpers, Supabase wrappers, log widget
// ============================================================

import { supabase } from '../supabase.js';
import { getSleepDeprivationModifier } from '../game-time.js';

export const ROLE_META = {
  solo:      { name: 'Solo',      ability: 'Combat Awareness',   glyph: 'SLO', accent: '#FF2D2D',
               flavor: 'Söldner. Krieger. Tödlich. Combat Awareness wird vor Kampfbeginn auf Combat Abilities verteilt — Punkte sind die Currency.' },
  netrunner: { name: 'Netrunner', ability: 'Interface',          glyph: 'NET', accent: '#B14EFF',
               flavor: 'Cyberspace-Pirat. Interface bestimmt NET Actions pro Turn (Rank 1-3=2, 4-6=3, 7-9=4, 10=5) und löst alle NET-Würfe.' },
  tech:      { name: 'Tech',      ability: 'Maker',              glyph: 'TCH', accent: '#FF8C42',
               flavor: 'Fabrikator. Reparateur. Erfinder. Jeder Maker-Rank up gibt 2 Punkte in 2 verschiedenen Specialties: Field, Upgrade, Fabrication, Invention.' },
  medtech:   { name: 'Medtech',   ability: 'Medicine',           glyph: 'MED', accent: '#00FF88',
               flavor: 'Ripperdoc. Combat Medic. Pro Medicine-Rank wählst du 1 Specialty: Surgery, Pharmaceuticals oder Cryosystem Operation.' },
  media:     { name: 'Media',     ability: 'Credibility',        glyph: 'MDA', accent: '#FFD700',
               flavor: 'Reporter. Credibility steigert Believability deiner Stories und gibt dir Zugang zu höheren Sources. Passive Rumors 2× pro Woche.' },
  exec:      { name: 'Exec',      ability: 'Teamwork',           glyph: 'EXC', accent: '#C9B037',
               flavor: 'Corporate Climber. Teamwork lässt dich Team Members aus 5 Klassen rekrutieren. Loyalty 1-10 entscheidet ob sie folgen.' },
  lawman:    { name: 'Lawman',    ability: 'Backup',             glyph: 'LAW', accent: '#4FC3F7',
               flavor: 'Cop, Sheriff, Marshal. Backup-Call: 1d10 ≤ Rank = jemand antwortet. 1d6 Rounds bis Ankunft. 6 = nächst-höherer Tier.' },
  fixer:     { name: 'Fixer',     ability: 'Operator',           glyph: 'FIX', accent: '#FFB840',
               flavor: 'Mittelsmann der Straße. Operator gibt dir Reach (Price-Categories), Haggle-Bonus und Grease (Sprachen/Kulturen).' },
  nomad:     { name: 'Nomad',     ability: 'Moto',               glyph: 'NOM', accent: '#E07A2C',
               flavor: 'Familie über alles. Moto addiert sich auf alle Vehicle/Drive-Würfe und gibt dir Family Vehicle Pool aus dem Motorpool.' },
  rockerboy: { name: 'Rockerboy', ability: 'Charismatic Impact', glyph: 'RKR', accent: '#FF1493',
               flavor: 'Rebell mit Mikro. Charismatic Impact + 1d10 vs DV8 (Single) / DV10 (≤6) / DV12 (Huge Group). Bei Fail: 1 Woche Lock-out.' },
};

// ============================================================
// DICE — Cyberpunk RED 1d10 mit Crit (nat 10) + Fumble (nat 1)
// Per Playbook: nat 10 = reroll und +addieren, nat 1 = reroll und -subtrahieren
// ============================================================
export function rollD10() {
  const base = 1 + Math.floor(Math.random() * 10);
  let final = base;
  let crit = 0, fumble = 0;
  if (base === 10) {
    crit = 1 + Math.floor(Math.random() * 10);
    final = base + crit;
  } else if (base === 1) {
    fumble = 1 + Math.floor(Math.random() * 10);
    final = base - fumble;
  }
  return { base, final, crit, fumble };
}

// Standard Check: STAT + Skill + 1d10 vs DV
// entity (optional): Charakter-Objekt — wenn gegeben, wird der Schlafentzug-Malus
// automatisch addiert (Müde -1 / Sehr müde -2 / Erschöpft -4, basierend auf
// last_long_rest_at_ingame). Gilt für ALLE Skill- und Combat-Checks.
export function performCheck({ stat = 0, skill = 0, mod = 0, dv = null, entity = null }) {
  const d = rollD10();
  const sleep = entity ? getSleepDeprivationModifier(entity) : { value: 0, label: null };
  const sleepMod = sleep.value || 0;
  const total = d.final + stat + skill + mod + sleepMod;
  const success = dv === null ? null : total >= dv;
  return {
    d10: d.base, base: d.base, crit: d.crit, fumble: d.fumble,
    stat, skill, mod, sleepMod, sleepLabel: sleep.label, total, dv, success
  };
}

// Role Ability Check: nur Role Ability Rank + 1d10 vs DV
// (z.B. Charismatic Impact, NET Actions wie Backdoor)
export function performAbilityCheck({ rank = 0, mod = 0, dv = null, label = 'Ability', entity = null }) {
  const d = rollD10();
  const sleep = entity ? getSleepDeprivationModifier(entity) : { value: 0, label: null };
  const sleepMod = sleep.value || 0;
  const total = d.final + rank + mod + sleepMod;
  const success = dv === null ? null : total >= dv;
  return {
    d10: d.base, base: d.base, crit: d.crit, fumble: d.fumble,
    rank, mod, sleepMod, sleepLabel: sleep.label, total, dv, success, _label: label
  };
}

// Backup Call (Lawman): 1d10, success if ≤ Rank
// Plus 1d6 für Rounds bis Backup ankommt (6 = ein Tier höher)
export function rollBackupCall(rank) {
  const d10 = 1 + Math.floor(Math.random() * 10);
  const success = d10 <= rank;
  const rounds = 1 + Math.floor(Math.random() * 6);
  return { d10, success, rounds, tierBump: rounds === 6 };
}

// Render a roll result HTML (handles both STAT+Skill and Ability-only)
export function renderRollResult(roll, opts = {}) {
  const dieClass = roll.crit ? 'crit' : (roll.fumble ? 'fumble' : '');
  const verdict = roll.success === null ? ''
    : (roll.success ? '<span class="dice-verdict success">Success</span>'
                    : '<span class="dice-verdict fail">Fail</span>');
  const dvPart = roll.dv !== null && roll.dv !== undefined ? ` <span class="dice-formula">vs DV ${roll.dv}</span>` : '';
  const extras = [
    roll.crit   ? `<span class="dice-crit">crit +${roll.crit}</span>` : '',
    roll.fumble ? `<span class="dice-fumble">fumble -${roll.fumble}</span>` : '',
    roll.sleepMod ? `<span class="dice-fumble">${roll.sleepLabel || 'Schlafentzug'} ${roll.sleepMod}</span>` : '',
  ].filter(Boolean).join(' · ');

  // Ability-only formula
  const sleepPart = roll.sleepMod ? ` ${roll.sleepMod} Sleep` : '';
  let formula;
  if (roll.rank !== undefined) {
    formula = `1d10[${roll.base}] + ${roll._label || 'Rank'}[${roll.rank}]${roll.mod ? (roll.mod > 0 ? ' + ' : ' ') + 'MOD[' + roll.mod + ']' : ''}${sleepPart} = ${roll.total}`;
  } else {
    formula = `1d10[${roll.base}]${roll.stat ? ' + STAT[' + roll.stat + ']' : ''}${roll.skill ? ' + SKILL[' + roll.skill + ']' : ''}${roll.mod ? (roll.mod > 0 ? ' + ' : ' ') + 'MOD[' + roll.mod + ']' : ''}${sleepPart} = ${roll.total}`;
  }

  return `
    <div class="role-dice-result ${roll.success ? 'success' : (roll.success === false ? 'fail' : '')}">
      <span class="role-die ${dieClass}">${roll.base}</span>
      <span class="dice-total">${roll.total}</span>${verdict}${dvPart}
      <div class="dice-formula">${formula}${extras ? ' · ' + extras : ''}</div>
      ${opts.note ? `<div class="dice-formula" style="margin-top:4px;">${opts.note}</div>` : ''}
    </div>
  `;
}

// ============================================================
// UI BUILDERS
// ============================================================
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

export function buildHeader(roleKey, character) {
  const m = ROLE_META[roleKey];
  const rank = character?.role_rank ?? '?';
  return `
    <div class="role-header">
      <div class="role-header-top">
        <div class="role-glyph">${m.glyph}</div>
        <div class="role-title-block">
          <h2 class="role-name">${m.name}</h2>
          <div class="role-class-ability">${m.ability} · Rank ${rank}</div>
        </div>
        <div class="role-rank-block">
          <div>
            <div class="role-rank-label">Rang</div>
            <div class="role-rank-value">${rank}</div>
          </div>
        </div>
      </div>
      <div class="role-flavor">${m.flavor}</div>
    </div>
  `;
}

// STAT+Skill Dice Box (standard checks)
export function buildDiceBox({ label = 'Check', stat = 0, skill = 0, mod = 0, dv = '', entity = null, onRoll }) {
  const html = `
    <div class="role-dice">
      <div class="role-section-title">${label}</div>
      <div class="role-dice-row">
        <div class="role-dice-input"><label>Stat</label><input type="number" value="${stat}" data-k="stat"></div>
        <div class="role-dice-input"><label>Skill</label><input type="number" value="${skill}" data-k="skill"></div>
        <div class="role-dice-input"><label>Mod</label><input type="number" value="${mod}" data-k="mod"></div>
        <div class="role-dice-input"><label>DV</label><input type="number" value="${dv}" data-k="dv" placeholder="—"></div>
        <button class="role-dice-btn" data-roll>Roll</button>
      </div>
      <div data-result></div>
    </div>
  `;
  const node = el(html);
  node.querySelector('[data-roll]').addEventListener('click', () => {
    const get = (k) => parseInt(node.querySelector(`[data-k="${k}"]`).value, 10) || 0;
    const dvRaw = node.querySelector('[data-k="dv"]').value.trim();
    const roll = performCheck({
      stat: get('stat'), skill: get('skill'), mod: get('mod'),
      dv: dvRaw === '' ? null : parseInt(dvRaw, 10),
      entity
    });
    node.querySelector('[data-result]').innerHTML = renderRollResult(roll);
    onRoll?.(roll);
  });
  return node;
}

// Ability-only Dice Box (Charismatic Impact, NET Actions, Operator)
export function buildAbilityDiceBox({ label = 'Ability Check', rankLabel = 'Rank', rank = 0, mod = 0, dv = '', entity = null, onRoll }) {
  const html = `
    <div class="role-dice">
      <div class="role-section-title">${label}</div>
      <div class="role-dice-row">
        <div class="role-dice-input"><label>${rankLabel}</label><input type="number" value="${rank}" data-k="rank"></div>
        <div class="role-dice-input"><label>Mod</label><input type="number" value="${mod}" data-k="mod"></div>
        <div class="role-dice-input"><label>DV</label><input type="number" value="${dv}" data-k="dv" placeholder="—"></div>
        <button class="role-dice-btn" data-roll>Roll</button>
      </div>
      <div data-result></div>
    </div>
  `;
  const node = el(html);
  node.querySelector('[data-roll]').addEventListener('click', () => {
    const get = (k) => parseInt(node.querySelector(`[data-k="${k}"]`).value, 10) || 0;
    const dvRaw = node.querySelector('[data-k="dv"]').value.trim();
    const roll = performAbilityCheck({
      rank: get('rank'), mod: get('mod'),
      dv: dvRaw === '' ? null : parseInt(dvRaw, 10),
      label: rankLabel,
      entity
    });
    node.querySelector('[data-result]').innerHTML = renderRollResult(roll);
    onRoll?.(roll);
  });
  return node;
}

// Action card (clickable ability/program/drug/etc.)
export function buildActionCard({ name, meta, desc, badge, disabled, onClick }) {
  const html = `
    <div class="role-card ${disabled ? 'disabled' : ''}">
      ${badge ? `<div class="role-card-badge">${badge}</div>` : ''}
      <div class="role-card-name">${name}</div>
      ${meta ? `<div class="role-card-meta">${meta}</div>` : ''}
      ${desc ? `<div class="role-card-desc">${desc}</div>` : ''}
    </div>
  `;
  const node = el(html);
  if (!disabled && onClick) node.addEventListener('click', onClick);
  return node;
}

export function buildInventoryItem({ item, onUse, onDelete }) {
  const chargesHtml = item.max_charges > 1
    ? `<div class="role-card-charges">${Array.from({ length: item.max_charges }, (_, i) => `<span class="${i < item.charges ? 'filled' : ''}"></span>`).join('')}</div>`
    : '';
  const html = `
    <div class="role-inv-item">
      <div class="role-inv-name">${item.name}</div>
      <div class="role-inv-meta">${item.category} · ${item.charges}/${item.max_charges} Uses</div>
      ${item.description ? `<div class="role-card-desc">${item.description}</div>` : ''}
      ${chargesHtml}
      <div class="role-inv-actions">
        ${onUse ? `<button data-act="use">Use</button>` : ''}
        ${onDelete ? `<button class="danger" data-act="del">×</button>` : ''}
      </div>
    </div>
  `;
  const node = el(html);
  node.querySelector('[data-act="use"]')?.addEventListener('click', () => onUse(item));
  node.querySelector('[data-act="del"]')?.addEventListener('click', () => onDelete(item));
  return node;
}

export function openModal(innerHtml, onMount) {
  const wrap = el(`<div class="role-modal"><div class="role-modal-body">${innerHtml}</div></div>`);
  document.body.appendChild(wrap);
  wrap.addEventListener('click', (e) => { if (e.target === wrap) wrap.remove(); });
  onMount?.(wrap.querySelector('.role-modal-body'), () => wrap.remove());
  return wrap;
}

export async function pickTarget({ includeSelf = true, allowNpc = true } = {}) {
  return new Promise(async (resolve) => {
    const { data: players } = await supabase.from('characters').select('id, handle, name, image_url').order('handle');
    const npcs = allowNpc
      ? (await supabase.from('npcs').select('id, name, image_url').order('name')).data || []
      : [];

    const body = `
      <h3>Ziel wählen</h3>
      <label>Spieler</label>
      <select id="tg-player">
        <option value="">—</option>
        ${(players || []).map(p => `<option value="player:${p.id}:${(p.handle || p.name || '').replace(/"/g,'')}">${p.handle || p.name}</option>`).join('')}
      </select>
      ${allowNpc ? `
        <label>NPC</label>
        <select id="tg-npc">
          <option value="">—</option>
          ${npcs.map(n => `<option value="npc:${n.id}:${(n.name || '').replace(/"/g,'')}">${n.name}</option>`).join('')}
        </select>
      ` : ''}
      ${includeSelf ? `<label><input type="checkbox" id="tg-self" style="width:auto;margin-right:6px;">Auf mich selbst</label>` : ''}
      <div class="role-modal-actions">
        <button data-act="cancel">Abbrechen</button>
        <button class="primary" data-act="ok">Wählen</button>
      </div>
    `;
    openModal(body, (modal, close) => {
      modal.querySelector('[data-act="cancel"]').addEventListener('click', () => { close(); resolve(null); });
      modal.querySelector('[data-act="ok"]').addEventListener('click', () => {
        if (modal.querySelector('#tg-self')?.checked) { close(); resolve({ type: 'self' }); return; }
        const p = modal.querySelector('#tg-player')?.value;
        const n = modal.querySelector('#tg-npc')?.value;
        const v = p || n;
        if (!v) { close(); resolve(null); return; }
        const [type, id, name] = v.split(':');
        close();
        resolve({ type, id, name });
      });
    });
  });
}

// ============================================================
// SUPABASE WRAPPERS
// ============================================================
export async function logAction(characterId, roleName, action, opts = {}) {
  const row = {
    character_id: characterId, role_name: roleName, action,
    target_type: opts.target?.type || null,
    target_id: opts.target?.id || null,
    target_name: opts.target?.name || null,
    roll: opts.roll || {},
    result_summary: opts.summary || null,
    meta: opts.meta || {}
  };
  const { error } = await supabase.from('role_actions').insert(row);
  if (error) console.error('logAction', error);
}

export async function getInventory(characterId, category = null) {
  let q = supabase.from('role_inventory').select('*').eq('character_id', characterId).order('created_at', { ascending: false });
  if (category) q = q.eq('category', category);
  const { data, error } = await q;
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function addInventoryItem(characterId, item) {
  const row = {
    character_id: characterId,
    category: item.category,
    name: item.name,
    description: item.description || null,
    charges: item.charges ?? 1,
    max_charges: item.max_charges ?? item.charges ?? 1,
    meta: item.meta || {}
  };
  const { data, error } = await supabase.from('role_inventory').insert(row).select().single();
  if (error) { console.error(error); return null; }
  return data;
}

export async function useInventoryItem(itemId, charges = 1) {
  const { data: item } = await supabase.from('role_inventory').select('*').eq('id', itemId).single();
  if (!item) return null;
  const newCharges = Math.max(0, item.charges - charges);
  if (newCharges === 0) {
    await supabase.from('role_inventory').delete().eq('id', itemId);
    return { used: true, deleted: true };
  }
  await supabase.from('role_inventory').update({ charges: newCharges }).eq('id', itemId);
  return { used: true, charges: newCharges };
}

export async function deleteInventoryItem(itemId) {
  await supabase.from('role_inventory').delete().eq('id', itemId);
}

export async function updateInventoryItem(itemId, patch) {
  await supabase.from('role_inventory').update(patch).eq('id', itemId);
}

export async function fetchTarget(target, selfCharId) {
  const id = target.type === 'self' ? selfCharId : target.id;
  if (target.type === 'npc') {
    const { data } = await supabase.from('npcs')
      .select('id, hp_current, hp_max, stats, critical_injuries, buffs, conditions').eq('id', id).single();
    return data ? { ...data, current_hp: data.hp_current, max_hp: data.hp_max } : null;
  }
  const { data } = await supabase.from('characters')
    .select('id, current_hp, max_hp, stats, critical_injuries, buffs, conditions').eq('id', id).single();
  return data;
}

export async function patchTarget(target, patch, selfCharId) {
  const id = target.type === 'self' ? selfCharId : target.id;
  if (target.type === 'npc') {
    const npcPatch = {};
    if (patch.current_hp          !== undefined) npcPatch.hp_current          = patch.current_hp;
    if (patch.buffs               !== undefined) npcPatch.buffs               = patch.buffs;
    if (patch.conditions          !== undefined) npcPatch.conditions          = patch.conditions;
    if (patch.critical_injuries   !== undefined) npcPatch.critical_injuries   = patch.critical_injuries;
    await supabase.from('npcs').update(npcPatch).eq('id', id);
  } else {
    await supabase.from('characters').update(patch).eq('id', id);
  }
}

export async function getRecentActions(characterId, limit = 25) {
  const { data } = await supabase.from('role_actions').select('*').eq('character_id', characterId).order('created_at', { ascending: false }).limit(limit);
  return data || [];
}

// ============================================================
// LOG WIDGET (mit Realtime)
// ============================================================
export async function buildLog(characterId) {
  const wrap = el(`
    <div class="role-log">
      <div class="role-section-title">Action Log</div>
      <div data-log-body><div class="role-empty">Keine Aktionen.</div></div>
    </div>
  `);
  const body = wrap.querySelector('[data-log-body]');

  async function refresh() {
    const actions = await getRecentActions(characterId, 25);
    if (!actions.length) {
      body.innerHTML = `<div class="role-empty"><div class="role-empty-glyph">⌬</div>Keine Aktionen.</div>`;
      return;
    }
    body.innerHTML = actions.map(a => {
      const t = new Date(a.created_at);
      const time = String(t.getHours()).padStart(2,'0') + ':' + String(t.getMinutes()).padStart(2,'0');
      const verdict = a.roll?.success === true ? '✓' : a.roll?.success === false ? '✕' : '·';
      return `
        <div class="role-log-item">
          <span class="role-log-time">${time}</span>
          <span class="role-log-action">${a.action}</span>
          ${a.target_name ? `→ <span class="role-log-target">${a.target_name}</span>` : ''}
          ${a.roll?.total !== undefined ? `<span class="role-pill">${verdict} ${a.roll.total}${a.roll.dv ? '/' + a.roll.dv : ''}</span>` : ''}
          ${a.result_summary ? `<div class="role-log-result">${a.result_summary}</div>` : ''}
        </div>`;
    }).join('');
  }
  refresh();

  const ch = supabase.channel('role-log-' + characterId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'role_actions', filter: `character_id=eq.${characterId}` },
        () => refresh())
    .subscribe();
  wrap._channel = ch;

  return wrap;
}

export function buildSubtabs(tabs, onChange) {
  const wrap = el(`<div class="role-subtabs"></div>`);
  tabs.forEach((t, i) => {
    const btn = el(`<button class="role-subtab ${i === 0 ? 'active' : ''}">${t.label}</button>`);
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.role-subtab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(t.key);
    });
    wrap.appendChild(btn);
  });
  return wrap;
}

// Quick d6 (für Backup-Rounds, Loyalty Saves, etc.)
export function rollD6() { return 1 + Math.floor(Math.random() * 6); }
