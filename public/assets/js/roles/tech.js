// ============================================================
// TECH — Maker (Cyberpunk RED, pg. 147-149)
// Maker-Rank up: 2 Punkte in 2 verschiedene Specialties
//   Field Expertise: jury-rig + addiert auf alle Non-Maker Tech Checks
//   Upgrade Expertise: bestehendes Item verbessern
//   Fabrication Expertise: neues Item bauen (Material 1 Tier billiger)
//   Invention Expertise: ganz Neues entwerfen
// ============================================================

import {
  buildHeader, buildActionCard, buildInventoryItem, buildSubtabs,
  buildLog, openModal, performCheck, renderRollResult,
  getInventory, addInventoryItem, deleteInventoryItem,
  updateInventoryItem, logAction, el
} from './roles-core.js';

// DV/Time Tabelle (Playbook pg. 149)
const PRICE_CATEGORIES = [
  { key: 'cheap',     name: 'Cheap / Everyday', dv: 9,  time: '1 hour' },
  { key: 'costly',    name: 'Costly',           dv: 13, time: '6 hours' },
  { key: 'premium',   name: 'Premium',          dv: 17, time: '1 day' },
  { key: 'expensive', name: 'Expensive',        dv: 21, time: '1 week' },
  { key: 'vexp',      name: 'Very Expensive',   dv: 24, time: '2 weeks' },
  { key: 'luxury',    name: 'Luxury',           dv: 29, time: '1 month' },
  { key: 'super',     name: 'Super Luxury',     dv: 29, time: '1 month per 10,000eb' },
];

const SPECIALTIES = [
  { id: 'field', name: 'Field Expertise',
    desc: 'Auf alle nicht-Maker Tech-Checks addieren (Basic Tech, Cybertech, etc.). Jury-Rig: temporäre Vollreparatur, hält 10 Min × Rank.' },
  { id: 'upgrade', name: 'Upgrade Expertise',
    desc: 'Existierendes Item verbessern. Materialien = gleiche Price-Category. Pro Item nur 1 Upgrade.' },
  { id: 'fabrication', name: 'Fabrication Expertise',
    desc: 'Item komplett bauen. Materialien = 1 Tier unterhalb des Items. Super Luxury = halber Preis.' },
  { id: 'invention', name: 'Invention Expertise',
    desc: 'Item/Upgrade NEU erfinden. GM definiert Werte + Price-Category. Erst Prototype = noch keine Imitation möglich.' },
];

const UPGRADE_OPTIONS = [
  'Humanity Loss von Non-Borgware Cyberware um 1d6 senken (wenn typ. ≥ 2d6)',
  'Slots eines Items (Attachments, Programme, Hardware) um 1 erhöhen',
  'Item vereinfachen → Reparaturzeit halbieren',
  'Non-conceable 1-Hand Weapon concealable machen',
  'Average Quality Weapon → Excellent Quality',
  'Exotic Weapon: 1 Attachment Slot hinzufügen',
  'Exotic Weapon: 1 Non-Basic Ammo Typ ermöglichen',
  'Item SP +1 (nur wenn schon SP > 0)',
  'Vehicle Upgrade Moto-Rank 1 (nur über Nomad Specialist)',
  'Custom Invention Upgrade installieren',
];

export async function mount(panel, character) {
  panel.innerHTML = '';
  panel.appendChild(el(buildHeader('tech', character)));

  const main = el(`<div></div>`);
  panel.appendChild(main);
  panel.appendChild(await buildLog(character.id));

  const subtabs = buildSubtabs([
    { key: 'work',  label: '🔧 Workshop' },
    { key: 'proj',  label: '📋 Projekte' },
    { key: 'spec',  label: '⚙️ Specialties' },
    { key: 'upref', label: '📖 Upgrade-Liste' },
  ], (k) => render(k));
  main.appendChild(subtabs);

  const view = el(`<div></div>`);
  main.appendChild(view);

  async function render(key) {
    view.innerHTML = '';
    if (key === 'work')  return renderWorkshop(view, character);
    if (key === 'proj')  return renderProjects(view, character);
    if (key === 'spec')  return renderSpecialties(view, character);
    if (key === 'upref') return renderUpgradeRef(view);
  }
  render('work');
}

// ============================================================
// SPECIALTIES
// ============================================================
async function renderSpecialties(view, character) {
  view.innerHTML = '';
  const items = await getInventory(character.id, 'specialty');
  let spec = items.find(i => i.meta?.kind === 'maker');
  if (!spec) {
    spec = await addInventoryItem(character.id, {
      category: 'specialty', name: 'Maker Specialty Allocation',
      description: 'Tracking', charges: 1, max_charges: 1,
      meta: { kind: 'maker', field: 0, upgrade: 0, fabrication: 0, invention: 0 }
    });
  }
  const totalPts = (character.role_rank || 4) * 2;
  const used = (spec.meta.field || 0) + (spec.meta.upgrade || 0) + (spec.meta.fabrication || 0) + (spec.meta.invention || 0);

  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Maker Specialties</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      Pro Maker-Rank-Up: <b>2 Punkte auf 2 verschiedene Specialties</b>.
      Rank ${character.role_rank || 4} → ${totalPts} Punkte total. Aktiv: <b>${used}/${totalPts}</b>
    </div>
    <div id="spec-list"></div>
  </div>`));

  const list = view.querySelector('#spec-list');
  SPECIALTIES.forEach(s => {
    const val = spec.meta[s.id] || 0;
    const row = el(`
      <div class="role-row" style="align-items:center; padding:10px 0; border-bottom:1px solid var(--role-line);">
        <div class="role-grow">
          <div style="font-family:'Audiowide';font-size:13px;">${s.name}</div>
          <div style="font-size:11px; color:var(--role-muted);">${s.desc}</div>
        </div>
        <div class="role-row" style="gap:4px; align-items:center;">
          <button class="role-dice-btn secondary" data-d="-1">−</button>
          <span class="role-pill" style="min-width:30px; text-align:center;" data-val>${val}</span>
          <button class="role-dice-btn secondary" data-d="+1">＋</button>
        </div>
      </div>
    `);
    row.querySelectorAll('button[data-d]').forEach(b => {
      b.addEventListener('click', async () => {
        const delta = +b.dataset.d;
        const cur = spec.meta[s.id] || 0;
        const usedNow = (spec.meta.field||0) + (spec.meta.upgrade||0) + (spec.meta.fabrication||0) + (spec.meta.invention||0);
        if (delta > 0 && usedNow >= totalPts) return;
        if (delta < 0 && cur <= 0) return;
        spec.meta[s.id] = cur + delta;
        await updateInventoryItem(spec.id, { meta: spec.meta });
        row.querySelector('[data-val]').textContent = spec.meta[s.id];
        renderSpecialties(view, character);
      });
    });
    list.appendChild(row);
  });
}

// ============================================================
// WORKSHOP — Specialty Roll + Price-Category
// ============================================================
async function renderWorkshop(view, character) {
  view.innerHTML = '';
  const items = await getInventory(character.id, 'specialty');
  const spec = items.find(i => i.meta?.kind === 'maker') || { meta: {} };

  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Workshop</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      Roll: <b>TECH + Tech-Skill (Weaponstech/Cybertech/etc.) + Specialty Rank + 1d10 vs DV</b>.
      DV/Zeit ist Price-Category-abhängig. Bei Failure: Materialien intakt, aber Arbeit verloren.
    </div>
    <div class="role-cards" id="spec-cards"></div>
  </div>`));

  const cards = view.querySelector('#spec-cards');
  SPECIALTIES.forEach(s => {
    const rank = spec.meta[s.id] || 0;
    cards.appendChild(buildActionCard({
      name: s.name,
      meta: `Dein Rank: ${rank}`,
      desc: s.desc,
      onClick: () => openSpecModal(character, s, rank, view)
    }));
  });

  // Reference Table
  view.appendChild(el(`<div class="role-section" style="margin-top:14px;">
    <div class="role-section-title">DV / Zeit nach Price-Category</div>
    <table style="width:100%; font-size:11px; border-collapse:collapse;">
      <thead><tr style="color:var(--role-muted); text-align:left;"><th>Category</th><th>DV</th><th>Zeit</th></tr></thead>
      <tbody>
        ${PRICE_CATEGORIES.map(p => `<tr><td>${p.name}</td><td><b style="color:var(--role-accent)">${p.dv}</b></td><td>${p.time}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>`));
}

function openSpecModal(character, spec, defaultSpecRank, view) {
  const stats = character.stats || {};
  const html = `
    <h3>${spec.name}</h3>
    <div class="role-card-desc">${spec.desc}</div>
    <label>Item / Projekt Name</label>
    <input id="t-name" placeholder="z.B. Custom Slugthrower">
    <label>Price-Category</label>
    <select id="t-cat">
      ${PRICE_CATEGORIES.map(p => `<option value="${p.dv}|${p.name}|${p.time}">${p.name} (DV ${p.dv}, ${p.time})</option>`).join('')}
    </select>
    <label>TECH</label><input type="number" id="t-stat" value="${stats.TECH ?? 6}">
    <label>Tech-Skill (Weaponstech, Cybertech, etc.)</label>
    <input type="number" id="t-skill" value="6">
    <label>${spec.name} Rank</label>
    <input type="number" id="t-spec" value="${defaultSpecRank}">
    <label>Modifier</label><input type="number" id="t-mod" value="0">
    <label>Beschreibung / Material / Notizen</label>
    <textarea id="t-desc"></textarea>
    <div class="role-modal-actions">
      <button data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="roll">Build</button>
    </div>
    <div id="t-out" style="margin-top:12px;"></div>`;
  openModal(html, (modal, close) => {
    modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
    modal.querySelector('[data-act="roll"]').addEventListener('click', async () => {
      const name = modal.querySelector('#t-name').value.trim() || `${spec.name} Project`;
      const desc = modal.querySelector('#t-desc').value.trim();
      const [dvStr, catName, timeStr] = modal.querySelector('#t-cat').value.split('|');
      const dv = +dvStr;
      const roll = performCheck({
        stat:  +modal.querySelector('#t-stat').value || 0,
        skill: (+modal.querySelector('#t-skill').value || 0) + (+modal.querySelector('#t-spec').value || 0),
        mod:   +modal.querySelector('#t-mod').value || 0,
        dv
      });
      modal.querySelector('#t-out').innerHTML = renderRollResult(roll, {
        note: roll.success
          ? `✓ ${catName} Projekt erstellt — Bauzeit: ${timeStr}`
          : `✕ Material bleibt intakt, aber Arbeit verloren — Neuanfang nötig.`
      });

      if (roll.success) {
        await addInventoryItem(character.id, {
          category: 'project', name, description: `${spec.name} · ${catName} (DV ${dv}) · ${timeStr}\n${desc}`,
          charges: 1, max_charges: 1,
          meta: { specialty: spec.id, dv, category: catName, time: timeStr }
        });
      }
      await logAction(character.id, 'tech', `${spec.name}: ${name}`, {
        roll, summary: roll.success ? `✓ Project erstellt (${catName})` : '✕ Failure'
      });
      setTimeout(close, 2000);
    });
  });
}

async function renderProjects(view, character) {
  view.innerHTML = '';
  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Aktive & abgeschlossene Projekte</div>
    <div id="proj-list" class="role-inv"></div>
  </div>`));
  const list = view.querySelector('#proj-list');
  const items = await getInventory(character.id, 'project');
  if (!items.length) {
    list.innerHTML = `<div class="role-empty">Keine Projekte. Starte eins im Workshop.</div>`;
    return;
  }
  items.forEach(item => {
    list.appendChild(buildInventoryItem({
      item,
      onDelete: async () => { await deleteInventoryItem(item.id); renderProjects(view, character); }
    }));
  });
}

function renderUpgradeRef(view) {
  view.innerHTML = '';
  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Upgrade Expertise — Optionen</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      Diese Upgrades sind direkt mit Upgrade Expertise verfügbar (1 Upgrade pro Item).
    </div>
    <ul style="font-size:12px; line-height:1.7; color:var(--role-text); padding-left:20px;">
      ${UPGRADE_OPTIONS.map(o => `<li>${o}</li>`).join('')}
    </ul>
  </div>`));
}
