// ============================================================
// LAWMAN — Backup (Cyberpunk RED, pg. 158-159)
// Backup Call Mechanik:
//   1. Action: roll 1d10 — ≤ Backup Rank = jemand antwortet
//   2. Roll 1d6 für Rounds bis Ankunft
//   3. Bei 6 auf d6 = Backup ist ein Tier HÖHER (außer Rank 10 = 2 Squads)
//   4. Bei fail: nächster Turn wieder probieren
//   5. Bei Missbrauch: Boss feuert/bestraft dich
// ============================================================

import {
  buildHeader, buildActionCard, buildSubtabs,
  buildLog, openModal, performCheck, renderRollResult,
  rollBackupCall, logAction, el
} from './roles-core.js';

// Backup-Tiers aus Playbook (pg. 158-159) — exakte Stats
const BACKUP_TIERS = [
  { rankMin: 1, rankMax: 2, name: 'Corporate Security',
    cn: 8, sp: 7, hp: 20, move: 4, body: 4,
    count: 4,
    arrival: 'zu Fuß',
    gear: 'Heavy Pistols, Kevlar®',
    desc: '4 lokale Rent-A-Cops auf der Szene.' },
  { rankMin: 3, rankMax: 4, name: 'Local Beat Cops',
    cn: 10, sp: 7, hp: 25, move: 5, body: 5,
    count: 4,
    arrival: '2 Compact Groundcars',
    gear: 'Heavy Pistols, Kevlar®',
    desc: '4 lokale Streifenpolizisten.' },
  { rankMin: 5, rankMax: 7, name: 'Sheriff\'s Department',
    cn: 14, sp: 13, hp: 35, move: 4, body: 4,
    count: 2,
    arrival: 'High Performance Groundcar',
    gear: 'Heavy Pistols, Assault Rifles, Heavy Armorjack',
    desc: '2 County Mounties, patrouillieren Exurbs/Highways.' },
  { rankMin: 8, rankMax: 8, name: 'Recovery Zone Marshal',
    cn: 16, sp: 15, hp: 50, move: 6, body: 6,
    count: 1,
    arrival: 'Superbike',
    gear: 'Very Heavy Pistol, Assault Rifle, Grenade Launcher, Flak Armor',
    desc: 'Solo Lawman im Recovery Zone Wild-West-Stil.' },
  { rankMin: 9, rankMax: 9, name: 'C-SWAT (Psycho Squad)',
    cn: 15, sp: 18, hp: 35, move: 4, body: 4,
    count: 2,
    arrival: 'AV-4 aus der Luft',
    gear: 'Assault Rifles, Rocket Launchers, Metalgear®',
    desc: '2 Heavy Hitters aus dem Psycho Squad.' },
  { rankMin: 10, rankMax: 10, name: 'National Law Enforcement / Interpol / FBI / Netwatch',
    cn: 14, sp: 11, hp: 35, move: 6, body: 6,
    count: 2,
    arrival: 'AV-4',
    gear: 'Very Heavy Pistols, Assault Rifles, Light Armorjack',
    desc: '2 ernsthafte Hitter. Bleiben nach dem Konflikt und ermitteln. Können CN auch für Accounting/Acting/Criminology/Cryptography/Deduction/Interrogation/Stealth/Tracking nutzen.' },
];

function getTierForRank(rank) {
  return BACKUP_TIERS.find(t => rank >= t.rankMin && rank <= t.rankMax);
}
function getNextTier(currentTier) {
  const idx = BACKUP_TIERS.indexOf(currentTier);
  return BACKUP_TIERS[idx + 1] || currentTier;
}

export async function mount(panel, character) {
  panel.innerHTML = '';
  panel.appendChild(el(buildHeader('lawman', character)));

  const main = el(`<div></div>`);
  panel.appendChild(main);
  panel.appendChild(await buildLog(character.id));

  const subtabs = buildSubtabs([
    { key: 'backup', label: '📡 Call Backup' },
    { key: 'tiers',  label: '📊 Backup Tiers' },
    { key: 'auth',   label: '🛡️ Authority' },
  ], (k) => render(k));
  main.appendChild(subtabs);

  const view = el(`<div></div>`);
  main.appendChild(view);

  function render(key) {
    view.innerHTML = '';
    if (key === 'backup') return renderBackup(view, character);
    if (key === 'tiers')  return renderTiers(view, character);
    if (key === 'auth')   return renderAuthority(view, character);
  }
  render('backup');
}

// ============================================================
// CALL BACKUP — 1d10 ≤ Rank
// ============================================================
function renderBackup(view, character) {
  view.innerHTML = '';
  const rank = character.role_rank || 4;
  const currentTier = getTierForRank(rank);

  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">NCPD Comms — Backup Rank ${rank}</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      <b>Mechanik:</b> Action → 1d10. <b>≤ ${rank}</b> = jemand antwortet. Dann 1d6 für Rounds bis Ankunft.
      Bei <b>6 auf d6</b> = nächster Tier antwortet stattdessen. Missbrauch = Boss feuert dich.
    </div>
    <div class="role-card" style="cursor:default; border-color: var(--role-accent);">
      <div class="role-card-name">Aktueller Tier: ${currentTier.name}</div>
      <div class="role-card-meta">CN ${currentTier.cn} · SP ${currentTier.sp} · HP ${currentTier.hp} · ${currentTier.count}× Personen</div>
      <div class="role-card-desc">${currentTier.desc}<br><b>Arrival:</b> ${currentTier.arrival} · <b>Gear:</b> ${currentTier.gear}</div>
    </div>
    <button class="role-dice-btn" id="call-backup" style="margin-top:14px; width:100%;">📞 BACKUP RUFEN</button>
  </div>`));

  view.querySelector('#call-backup').addEventListener('click', () => openBackupCall(character, rank));
}

function openBackupCall(character, rank) {
  const html = `
    <h3>Backup Call — Rank ${rank}</h3>
    <div class="role-card-desc">Roll 1d10 — ≤ ${rank} = success. Wenn ja: 1d6 für ETA-Rounds.</div>
    <label>Situation / Code</label>
    <input id="bk-code" placeholder="z.B. Code 1 — Officer Down">
    <div class="role-modal-actions">
      <button data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="call">Dispatch</button>
    </div>
    <div id="bk-out" style="margin-top:12px;"></div>`;
  openModal(html, (modal, close) => {
    modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
    modal.querySelector('[data-act="call"]').addEventListener('click', async () => {
      const result = rollBackupCall(rank);
      const code = modal.querySelector('#bk-code').value.trim() || '—';

      if (!result.success) {
        modal.querySelector('#bk-out').innerHTML = `
          <div class="role-dice-result fail">
            <span class="role-die fumble">${result.d10}</span>
            <span class="dice-total">vs ${rank}</span>
            <span class="dice-verdict fail">No response</span>
            <div class="dice-formula">d10[${result.d10}] > Backup Rank ${rank} — niemand antwortet. Nächster Turn nochmal probieren.</div>
          </div>`;
        await logAction(character.id, 'lawman', 'Backup Call — no response', {
          roll: { d10: result.d10, total: result.d10, dv: rank, success: false },
          summary: `Code: ${code}. Niemand antwortet.`
        });
        return;
      }

      const baseTier = getTierForRank(rank);
      const arrivedTier = result.tierBump ? getNextTier(baseTier) : baseTier;
      const tierUp = result.tierBump && arrivedTier !== baseTier;

      modal.querySelector('#bk-out').innerHTML = `
        <div class="role-dice-result success">
          <span class="role-die">${result.d10}</span>
          <span class="dice-total">≤ ${rank}</span>
          <span class="dice-verdict success">Response!</span>
          <div class="dice-formula">
            d10[${result.d10}] ≤ Rank ${rank} = success<br>
            d6[${result.rounds}] = <b>${result.rounds} Rounds ETA</b>${tierUp ? ' · 🎯 <b style="color: gold;">TIER UP! 6 auf d6</b>' : ''}
          </div>
        </div>
        <div class="role-card" style="cursor:default; margin-top:10px; border-color:${tierUp ? 'gold' : 'var(--role-accent)'};">
          <div class="role-card-name">Arrival: ${arrivedTier.name} (${arrivedTier.count}×)</div>
          <div class="role-card-meta">CN ${arrivedTier.cn} · SP ${arrivedTier.sp} · HP ${arrivedTier.hp} · MOVE ${arrivedTier.move} · BODY ${arrivedTier.body}</div>
          <div class="role-card-desc"><b>Transport:</b> ${arrivedTier.arrival}<br><b>Gear:</b> ${arrivedTier.gear}</div>
        </div>
      `;

      await logAction(character.id, 'lawman', `Backup gerufen — ${arrivedTier.name}${tierUp ? ' (Tier Up!)' : ''}`, {
        roll: { d10: result.d10, total: result.d10, dv: rank, success: true },
        summary: `${result.rounds} Rounds ETA. Code: ${code}. ${arrivedTier.count}× ${arrivedTier.name} (CN ${arrivedTier.cn}, ${arrivedTier.gear}).`
      });
    });
  });
}

// ============================================================
// BACKUP TIERS REFERENCE
// ============================================================
function renderTiers(view, character) {
  view.innerHTML = '';
  const rank = character.role_rank || 4;
  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Alle Backup Tiers (Playbook-Stats)</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      Dein Rank: <b>${rank}</b>. Du rufst standardmäßig den passenden Tier — bei 6 auf d6 erscheint nächst-höherer.
    </div>
  </div>`));

  BACKUP_TIERS.forEach(t => {
    const isYours = rank >= t.rankMin && rank <= t.rankMax;
    view.appendChild(el(`
      <div class="role-section" style="margin-top:10px; ${isYours ? 'border-color: var(--role-accent);' : ''}">
        <div class="role-section-title">
          Rank ${t.rankMin}${t.rankMax !== t.rankMin ? '-' + t.rankMax : ''} — ${t.name}
          ${isYours ? '<span class="role-pill" style="margin-left:8px;">DEIN TIER</span>' : ''}
        </div>
        <div style="font-size:12px; line-height:1.7;">
          <b>Combat Number:</b> ${t.cn} · <b>SP:</b> ${t.sp} · <b>HP:</b> ${t.hp} · <b>MOVE:</b> ${t.move} · <b>BODY:</b> ${t.body}<br>
          <b>Count:</b> ${t.count}× · <b>Arrival:</b> ${t.arrival}<br>
          <b>Gear:</b> ${t.gear}<br>
          <span style="color:var(--role-muted);">${t.desc}</span>
        </div>
      </div>
    `));
  });
}

// ============================================================
// AUTHORITY ROLLS
// ============================================================
function renderAuthority(view, character) {
  view.innerHTML = '';
  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Authority & Investigation Checks</div>
    <div class="role-cards" id="au-cards"></div>
  </div>`));
  const acts = [
    { name: 'Authority',          dv: 13, desc: 'COOL + Authority. Compliance erzwingen, Suspects stoppen.' },
    { name: 'Interrogation',      dv: 13, desc: 'EMP + Interrogation. Aussage extrahieren (legal oder nicht).' },
    { name: 'Human Perception',   dv: 13, desc: 'EMP + Human Perception. Lügen erkennen.' },
    { name: 'Criminology',        dv: 13, desc: 'INT + Criminology. Tatort lesen.' },
    { name: 'Tracking',           dv: 15, desc: 'INT + Tracking. Spuren verfolgen.' },
    { name: 'Resist Torture/Drugs', dv: 15, desc: 'WILL + Resist Torture/Drugs. Wenn du in der Mangel bist.' },
  ];
  const cards = view.querySelector('#au-cards');
  acts.forEach(a => {
    cards.appendChild(buildActionCard({
      name: a.name, meta: `DV ${a.dv}`, desc: a.desc,
      onClick: () => quickRoll(character, 'lawman', a)
    }));
  });
}

function quickRoll(character, role, action) {
  const html = `
    <h3>${action.name}</h3>
    <div class="role-card-desc">${action.desc}</div>
    <label>Stat</label><input type="number" id="q-stat" value="6">
    <label>Skill</label><input type="number" id="q-skill" value="5">
    <label>Modifier</label><input type="number" id="q-mod" value="0">
    <label>DV</label><input type="number" id="q-dv" value="${action.dv}">
    <div class="role-modal-actions">
      <button data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="roll">Roll</button>
    </div>
    <div id="q-out" style="margin-top:12px;"></div>`;
  openModal(html, (modal, close) => {
    modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
    modal.querySelector('[data-act="roll"]').addEventListener('click', async () => {
      const roll = performCheck({
        stat: +modal.querySelector('#q-stat').value || 0,
        skill: +modal.querySelector('#q-skill').value || 0,
        mod: +modal.querySelector('#q-mod').value || 0,
        dv: +modal.querySelector('#q-dv').value
      });
      modal.querySelector('#q-out').innerHTML = renderRollResult(roll);
      await logAction(character.id, role, action.name, { roll, summary: action.desc });
      setTimeout(close, 1600);
    });
  });
}
