// ============================================================
// EXEC — Teamwork (Cyberpunk RED, pg. 153-157)
// Rank 1: Businesswear Suit (frei)
// Rank 2: Corporate Conapt (kostenlose Wohnung)
// Rank 7: Beaverville House
// Team Members: 5 Klassen, Loyalty 1-10, 1d6 Loyalty Save
// ============================================================

import {
  buildHeader, buildActionCard, buildInventoryItem, buildSubtabs,
  buildLog, openModal, performCheck, renderRollResult, rollD6,
  getInventory, addInventoryItem, deleteInventoryItem,
  updateInventoryItem, logAction, el
} from './roles-core.js';

const TEAM_MEMBER_CLASSES = [
  { id: 'bodyguard',  name: 'Company Bodyguard',
    coverJobs: 'Escort, Personal Trainer', trueJob: 'Schützt den Exec in gefährlichen Situationen.',
    gear: 'Light Armorjack (SP11), Very Heavy Pistol, Subdermal Armor (SP11), Cyberaudio Suite' },
  { id: 'covertop',   name: 'Company Covert Operative',
    coverJobs: 'Personal Assistant, Stylist', trueJob: 'Hält den Exec aus dem Dreck.',
    gear: 'Light Armorjack, Cyberarm mit Popup VHP, Cybereyes (Low Light/IR/UV)' },
  { id: 'driver',     name: 'Company Driver',
    coverJobs: 'Valet, Personal Driver', trueJob: 'Fährt/pilotiert/wartet alle Vehicles.',
    gear: 'Light Armorjack, Compact Groundcar (Seating Upgrade), Radar/Sonar Implant' },
  { id: 'netrunner',  name: 'Company Netrunner',
    coverJobs: 'I.T. Engineer, Research Specialist', trueJob: 'Hackt + sammelt Info.',
    gear: 'Cyberdeck (7 Slots: Sword, Sword, Killer, Worm, Worm, Armor), Neural Link, Interface Plugs' },
  { id: 'technician', name: 'Company Technician',
    coverJobs: 'I.T. Engineer, Intern', trueJob: 'Repariert Team-Gear + Waffen.',
    gear: 'Tool Hand, Cyberaudio Suite, Bug Detector, Audio Recorder' },
];

// Loyalty Changes (Playbook pg. 154)
const LOYALTY_GAINS = [
  { delta: +1, action: 'Complimente Team-Member (max 1×/Woche).' },
  { delta: +4, action: 'Bonus oder Perk im Wert von ≥200eb geben.' },
  { delta: +4, action: 'Gegen Management verteidigen.' },
  { delta: +6, action: '20% Cut von Job-Beute geben.' },
  { delta: +6, action: 'Paid Time Off (volle Session).' },
  { delta: +8, action: 'Eigene physische Gesundheit riskieren für Team-Member.' },
];
const LOYALTY_LOSSES = [
  { delta: -1, action: 'Keine Loyalty-Aktion in ganzer Session.' },
  { delta: -2, action: 'Anschnauzen / kritisieren ohne Grund.' },
  { delta: -4, action: 'Contribution ignorieren.' },
  { delta: -4, action: 'Geburtstag vergessen.' },
  { delta: -6, action: 'Versprochenen Bonus nicht ausgezahlt.' },
  { delta: -6, action: 'Team-Member dem Management opfern.' },
  { delta: -8, action: 'Team-Member unter Beschuss verlassen.' },
];

export async function mount(panel, character) {
  panel.innerHTML = '';
  panel.appendChild(el(buildHeader('exec', character)));

  const main = el(`<div></div>`);
  panel.appendChild(main);
  panel.appendChild(await buildLog(character.id));

  const subtabs = buildSubtabs([
    { key: 'team',    label: '👔 Team' },
    { key: 'perks',   label: '🏢 Corporate Perks' },
    { key: 'loyalty', label: '💼 Loyalty' },
  ], (k) => render(k));
  main.appendChild(subtabs);

  const view = el(`<div></div>`);
  main.appendChild(view);

  async function render(key) {
    view.innerHTML = '';
    if (key === 'team')    return renderTeam(view, character);
    if (key === 'perks')   return renderPerks(view, character);
    if (key === 'loyalty') return renderLoyalty(view, character);
  }
  render('team');
}

// ============================================================
// TEAM MEMBERS
// ============================================================
async function renderTeam(view, character) {
  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Dein Team</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      Team Members werden über HR rekrutiert. Beim Verlust: 200eb "Hiring Fee" + Replacement startet mit Loyalty 1.
      Max Armor: Light Armorjack (Company Policy).
    </div>
    <div id="team-list" class="role-inv"></div>
    <button class="role-dice-btn" id="add-tm" style="margin-top:10px;">＋ Team Member rekrutieren</button>
  </div>`));

  const list = view.querySelector('#team-list');
  const items = await getInventory(character.id, 'team_member');
  if (!items.length) {
    list.innerHTML = `<div class="role-empty">Kein Team Member.</div>`;
  } else {
    items.forEach(item => {
      const loy = item.meta?.loyalty || 0;
      list.appendChild(el(`
        <div class="role-inv-item">
          <div class="role-inv-name">${item.name}</div>
          <div class="role-inv-meta">${item.meta?.class_name || 'Custom'} · Loyalty <b style="color:var(--role-accent)">${loy}/10</b></div>
          <div class="role-card-desc">${item.description || ''}</div>
          <div class="role-inv-actions">
            <button data-act="loyalty">±Loyalty</button>
            <button data-act="save">Loyalty Save</button>
            <button class="danger" data-act="del">×</button>
          </div>
        </div>
      `));
      const node = list.lastElementChild;
      node.querySelector('[data-act="loyalty"]').addEventListener('click', () => openLoyaltyModal(item, view, character));
      node.querySelector('[data-act="save"]').addEventListener('click', () => openLoyaltySave(item, character));
      node.querySelector('[data-act="del"]').addEventListener('click', async () => {
        if (!confirm('Team Member entlassen?')) return;
        await deleteInventoryItem(item.id);
        renderTeam(view, character);
      });
    });
  }

  view.querySelector('#add-tm').addEventListener('click', () => openRecruitFlow(character, view));
}

function openRecruitFlow(character, view) {
  const html = `
    <h3>Team Member rekrutieren</h3>
    <label>Klasse</label>
    <select id="tm-class">
      ${TEAM_MEMBER_CLASSES.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
    </select>
    <label>Name</label><input id="tm-name" value="Reyes">
    <label>Cover Job</label><input id="tm-cover" placeholder="z.B. Personal Assistant">
    <div class="role-card-desc" id="tm-info" style="margin-top:8px;"></div>
    <div class="role-card-desc">Roll 1d6+1 = Starting Loyalty</div>
    <div class="role-modal-actions">
      <button data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="hire">Rekrutieren</button>
    </div>`;
  openModal(html, (modal, close) => {
    const updateInfo = () => {
      const c = TEAM_MEMBER_CLASSES.find(x => x.id === modal.querySelector('#tm-class').value);
      modal.querySelector('#tm-info').innerHTML = `
        <b>${c.trueJob}</b><br>
        Cover: ${c.coverJobs}<br>
        Standard Gear: ${c.gear}
      `;
    };
    updateInfo();
    modal.querySelector('#tm-class').addEventListener('change', updateInfo);
    modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
    modal.querySelector('[data-act="hire"]').addEventListener('click', async () => {
      const c = TEAM_MEMBER_CLASSES.find(x => x.id === modal.querySelector('#tm-class').value);
      const name = modal.querySelector('#tm-name').value.trim() || c.name;
      const cover = modal.querySelector('#tm-cover').value.trim() || c.coverJobs.split(',')[0].trim();
      const loyalty = rollD6() + 1;
      await addInventoryItem(character.id, {
        category: 'team_member', name,
        description: `${c.trueJob}\nCover: ${cover}\nGear: ${c.gear}`,
        charges: 1, max_charges: 1,
        meta: { class_id: c.id, class_name: c.name, cover_job: cover, loyalty, hired_at: new Date().toISOString() }
      });
      await logAction(character.id, 'exec', `Hired: ${name} (${c.name})`, {
        summary: `Starting Loyalty: ${loyalty}/10`
      });
      close();
      renderTeam(view, character);
    });
  });
}

function openLoyaltyModal(item, view, character) {
  const html = `
    <h3>Loyalty: ${item.name}</h3>
    <div class="role-card-desc">Aktuell: <b style="color:var(--role-accent)">${item.meta?.loyalty || 0}/10</b></div>
    <label>Loyalty-Änderung wählen</label>
    <select id="ly-pick">
      <optgroup label="Gain">
        ${LOYALTY_GAINS.map((g, i) => `<option value="g${i}">+${g.delta} — ${g.action}</option>`).join('')}
      </optgroup>
      <optgroup label="Loss">
        ${LOYALTY_LOSSES.map((g, i) => `<option value="l${i}">${g.delta} — ${g.action}</option>`).join('')}
      </optgroup>
      <option value="custom">Custom (±X)</option>
    </select>
    <label>Custom Wert (nur wenn "Custom")</label>
    <input type="number" id="ly-custom" value="0">
    <div class="role-modal-actions">
      <button data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="apply">Apply</button>
    </div>`;
  openModal(html, (modal, close) => {
    modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
    modal.querySelector('[data-act="apply"]').addEventListener('click', async () => {
      const pick = modal.querySelector('#ly-pick').value;
      let delta = 0;
      let action = '';
      if (pick.startsWith('g')) {
        const g = LOYALTY_GAINS[+pick.slice(1)]; delta = g.delta; action = g.action;
      } else if (pick.startsWith('l')) {
        const g = LOYALTY_LOSSES[+pick.slice(1)]; delta = g.delta; action = g.action;
      } else {
        delta = +modal.querySelector('#ly-custom').value || 0;
        action = 'Custom Loyalty Change';
      }
      const cur = item.meta?.loyalty || 0;
      const next = Math.min(10, cur + delta);
      item.meta.loyalty = next;
      await updateInventoryItem(item.id, { meta: item.meta });
      await logAction(character.id, 'exec', `Loyalty ${item.name}: ${cur} → ${next}`, {
        summary: `${delta > 0 ? '+' : ''}${delta} — ${action}`
      });
      close();
      renderTeam(view, character);
    });
  });
}

async function openLoyaltySave(item, character) {
  // 1d6 vs current Loyalty — under = success
  const cur = item.meta?.loyalty || 0;
  const d6 = rollD6();
  const success = d6 < cur;
  await logAction(character.id, 'exec', `Loyalty Save: ${item.name}`, {
    roll: { d10: d6, total: d6, dv: cur, success },
    summary: success
      ? `✓ 1d6[${d6}] < Loyalty ${cur} — Member führt aus`
      : `✕ 1d6[${d6}] ≥ Loyalty ${cur} — verweigert, botcht oder verrät`
  });
  openModal(`
    <h3>Loyalty Save: ${item.name}</h3>
    <div class="role-dice-result ${success ? 'success' : 'fail'}">
      <span class="role-die ${success ? '' : 'fumble'}">${d6}</span>
      <span class="dice-total">vs ${cur}</span>
      <span class="dice-verdict ${success ? 'success' : 'fail'}">${success ? 'Folgt' : 'Verweigert'}</span>
      <div class="dice-formula">Roll 1d6[${d6}] under Loyalty ${cur} = ${success ? 'success' : 'fail'}</div>
    </div>
    <div class="role-modal-actions">
      <button class="primary" data-act="close">OK</button>
    </div>
  `, (modal, close) => {
    modal.querySelector('[data-act="close"]').addEventListener('click', close);
  });
}

// ============================================================
// PERKS — Rank-basierte Corporate Vorteile
// ============================================================
function renderPerks(view, character) {
  const rank = character.role_rank || 4;
  const perks = [
    { rank: 1, name: 'Businesswear Suit',   unlocked: rank >= 1,
      desc: 'Jacket, Top, Bottom, Footwear — Identifikation als Business-Elite. Nicht reselbar.' },
    { rank: 2, name: 'Corporate Conapt',    unlocked: rank >= 2,
      desc: 'Kostenlose Wohnung in einem Conapt. Bei Corp-Wechsel: neue Firma bezahlt Umzug.' },
    { rank: 7, name: 'Beaverville House',   unlocked: rank >= 7,
      desc: 'Upgrade auf Executive Zone Beaverville House.' },
  ];

  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Corporate Perks — Rank ${rank}</div>
    <div class="role-cards" id="pk-cards"></div>
  </div>`));
  const cards = view.querySelector('#pk-cards');
  perks.forEach(p => {
    cards.appendChild(buildActionCard({
      name: p.name,
      meta: `Rank ${p.rank}+ ${p.unlocked ? '· ✓ aktiv' : '· 🔒 locked'}`,
      desc: p.desc,
      disabled: !p.unlocked
    }));
  });

  // Influence rolls
  view.appendChild(el(`<div class="role-section" style="margin-top:14px;">
    <div class="role-section-title">Corporate Influence Rolls</div>
    <div class="role-cards" id="inf-cards"></div>
  </div>`));
  const inf = view.querySelector('#inf-cards');
  const acts = [
    { name: 'Persuasion (Corp)',      dv: 15, desc: 'COOL + Persuasion. Andere Exec zur Kooperation bringen.' },
    { name: 'Bureaucracy Manip',      dv: 17, desc: 'INT + Bureaucracy. Papiere verschwinden lassen.' },
    { name: 'Trading',                dv: 13, desc: 'COOL + Trading. Mehrheiten organisieren im Boardroom.' },
    { name: 'Resist Torture/Drugs',   dv: 15, desc: 'WILL + Resist Torture/Drugs. Wenn Konkurrent dich grabbt.' },
  ];
  acts.forEach(a => {
    inf.appendChild(buildActionCard({
      name: a.name, meta: `DV ${a.dv}`, desc: a.desc,
      onClick: () => quickRoll(character, 'exec', a)
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

// ============================================================
// LOYALTY REFERENCE
// ============================================================
function renderLoyalty(view, character) {
  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Loyalty System</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      Loyalty Save: GM rollt <b>1d6 unter Loyalty-Wert</b>. Fail = Team-Member verweigert/botcht/verrät.
      Cap zwischen Sessions: 10. Während einer Session: kein Cap. Bei ≤ 0: Team-Member verrät dich aktiv.
    </div>
  </div>`));

  view.appendChild(el(`<div class="role-section" style="margin-top:14px;">
    <div class="role-section-title">Loyalty Gains</div>
    <table style="width:100%; font-size:12px;">
      ${LOYALTY_GAINS.map(g => `<tr><td style="color:var(--role-success); width:40px;"><b>+${g.delta}</b></td><td>${g.action}</td></tr>`).join('')}
    </table>
  </div>`));

  view.appendChild(el(`<div class="role-section" style="margin-top:14px;">
    <div class="role-section-title">Loyalty Losses</div>
    <table style="width:100%; font-size:12px;">
      ${LOYALTY_LOSSES.map(g => `<tr><td style="color:var(--role-danger); width:40px;"><b>${g.delta}</b></td><td>${g.action}</td></tr>`).join('')}
    </table>
  </div>`));
}
