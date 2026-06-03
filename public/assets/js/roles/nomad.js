// ============================================================
// NOMAD — Moto (Cyberpunk RED, pg. 161-164)
// Moto Rank addiert sich auf alle Drive/Pilot/Vehicle Tech rolls.
// Pro Rank-Up: 1 neues Family Vehicle ODER Upgrade auf bestehendes.
// Rank 10: alle Family Vehicles gleichzeitig draußen.
// Destroyed Family Vehicle: 1 Woche Repair + 500eb Fee.
// ============================================================

import {
  buildHeader, buildActionCard, buildInventoryItem, buildSubtabs,
  buildLog, openModal, performCheck, renderRollResult,
  getInventory, addInventoryItem, deleteInventoryItem,
  logAction, el
} from './roles-core.js';

// Family Motorpool (Playbook pg. 162)
const MOTORPOOL = [
  { rankMin: 1, rankMax: 4, vehicles: ['Compact Groundcar', 'Gyrocopter', 'Jetski', 'Roadbike'] },
  { rankMin: 5, rankMax: 6, vehicles: ['Helicopter', 'High Performance Groundcar', 'Speedboat'] },
  { rankMin: 7, rankMax: 8, vehicles: ['AV-4', 'Cabin Cruiser', 'Superbike'] },
  { rankMin: 9, rankMax: 10, vehicles: ['Aerozep', 'AV-9', 'Super Groundcar', 'Yacht'] },
];

// Vehicle Upgrades (Playbook pg. 163-164) — kondensiert
const VEHICLE_UPGRADES = [
  { rank: 5, name: 'Armored Chassis',          desc: 'SP13 für Vehicle (nicht Glas).', restrict: 'Alle' },
  { rank: 1, name: 'Bulletproof Glass',        desc: 'Glas = Cover (Thin BPG 15HP, Thick BPG 30HP bei 2× Upgrade).', restrict: 'Alle' },
  { rank: 1, name: 'Communications Center',    desc: '6× Radio Comms + Scrambler + Music Player + Homing Tracer + Audio Recorder.', restrict: 'Alle' },
  { rank: 1, name: 'NOS',                      desc: 'Extra Move Action per Day. Multiple Upgrades = mehr Tanks.', restrict: 'Alle' },
  { rank: 1, name: 'Onboard Flamethrower',     desc: 'Front/Side/Back-facing. Driver fires. Kein Reload during Drive.', restrict: 'Alle' },
  { rank: 1, name: 'Onboard Machine Gun',      desc: 'AR mit 30 Rounds, nur Autofire. Front-facing. Multi-Upgrade.', restrict: 'Alle' },
  { rank: 1, name: 'Seating Upgrade',          desc: '+2 Seats (optional Sidecar). Ejector Seats möglich. Nicht für Bikes/Jetskis/Gyrocopter.', restrict: 'Alle außer Bikes/Jetskis/Gyrocopter' },
  { rank: 5, name: 'Security Upgrade',         desc: 'DNA-Locks + Cloaking Feature (DV17 Perception to spot). Stuns wer falsch unlock-versucht.', restrict: 'Alle' },
  { rank: 1, name: 'Smuggling Upgrade',        desc: '2× Hidden Holsters + 1× Big Smuggling Space (DV17 zum Finden). Nicht für Bikes/Jetskis/Gyrocopter.', restrict: 'Alle außer Bikes/Jetskis/Gyrocopter' },
  { rank: 1, name: 'Heavy Chassis',            desc: '+20 SDP. Tow bis 10 Tonnen. Prerequisite für Rocket Pod + Heavy Weapon Mount.', restrict: 'Alle außer Bikes/Jetskis/Gyrocopter' },
  { rank: 5, name: 'Onboard Rocket Pod',       desc: 'Rocket Launcher mit 3 Rockets. Requires Heavy Chassis.', restrict: 'Alle außer Bikes/Jetskis/Gyrocopter' },
  { rank: 5, name: 'Vehicle Heavy Weapon Mount', desc: 'Swiveling Mount für jede 2-Hand Ranged Weapon. Passenger fires + reloads. Requires Heavy Chassis. Erstes Mount: Familie schenkt dir Helix / Railgun / Grenade Launcher.', restrict: 'Alle außer Bikes/Jetskis/Gyrocopter' },
  { rank: 1, name: 'Onboard Melee Weapon',     desc: 'Very Heavy Melee Weapon front/side/back-mounted.', restrict: 'Land + Sea Vehicles' },
];

function getMotorpoolForRank(rank) {
  // Alle Tiers bis einschließlich aktuellem Rank verfügbar
  return MOTORPOOL.filter(t => rank >= t.rankMin);
}

export async function mount(panel, character) {
  panel.innerHTML = '';
  panel.appendChild(el(buildHeader('nomad', character)));

  const main = el(`<div></div>`);
  panel.appendChild(main);
  panel.appendChild(await buildLog(character.id));

  const rank = character.role_rank || 4;
  panel.appendChild(el(`<div class="role-section" style="grid-column:1/-1; padding: 8px 14px;">
    <div style="font-size:11px; color:var(--role-muted); letter-spacing:0.15em; text-transform:uppercase;">
      Vehicle Familiarity: <b style="color:var(--role-accent)">+${rank}</b> auf alle Drive Land Vehicle / Pilot Air Vehicle / Pilot Sea Vehicle / Air/Land/Sea Vehicle Tech Skill Checks
    </div>
  </div>`));

  const subtabs = buildSubtabs([
    { key: 'garage',  label: '🏍️ Garage' },
    { key: 'pool',    label: '📋 Family Motorpool' },
    { key: 'upgrade', label: '🔧 Upgrades' },
    { key: 'drive',   label: '🎲 Drive Actions' },
  ], (k) => render(k));
  main.appendChild(subtabs);

  const view = el(`<div></div>`);
  main.appendChild(view);

  function render(key) {
    view.innerHTML = '';
    if (key === 'garage')  return renderGarage(view, character);
    if (key === 'pool')    return renderPool(view, character);
    if (key === 'upgrade') return renderUpgrades(view, character);
    if (key === 'drive')   return renderDrive(view, character);
  }
  render('garage');
}

// ============================================================
// GARAGE — eigene Family Vehicles
// ============================================================
async function renderGarage(view, character) {
  view.innerHTML = '';
  const rank = character.role_rank || 4;
  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Family Garage</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      Pro Moto-Rank-Up: 1 neues Vehicle ODER 1 Upgrade. 
      Du kannst nur <b>1 Vehicle gleichzeitig</b> draußen haben (Rank 10: alle).
      Destroyed: 1 Woche Repair + 500eb Fee (Family fixt es).
    </div>
    <div id="ve-list" class="role-inv"></div>
    <button class="role-dice-btn" id="add-ve" style="margin-top:10px;">＋ Family Vehicle</button>
  </div>`));

  const list = view.querySelector('#ve-list');
  const items = await getInventory(character.id, 'vehicle');
  if (!items.length) {
    list.innerHTML = `<div class="role-empty">Garage leer. Wähle aus Family Motorpool.</div>`;
  } else {
    items.forEach(item => {
      list.appendChild(buildInventoryItem({
        item,
        onDelete: async () => { await deleteInventoryItem(item.id); renderGarage(view, character); }
      }));
    });
  }

  view.querySelector('#add-ve').addEventListener('click', () => openVehicleForm(character, view, rank));
}

function openVehicleForm(character, view, rank) {
  const available = getMotorpoolForRank(rank).flatMap(t => t.vehicles);
  const html = `
    <h3>Family Vehicle hinzufügen</h3>
    <label>Vehicle aus Motorpool (Rank ${rank})</label>
    <select id="ve-pick">
      ${available.map(v => `<option>${v}</option>`).join('')}
      <option value="">Custom...</option>
    </select>
    <label>Custom Name (wenn "Custom" gewählt)</label>
    <input id="ve-custom" placeholder="z.B. Yaiba Kusanagi CT-3X">
    <label>SDP (Structural Damage Points / HP)</label>
    <input type="number" id="ve-sdp" value="20" min="1">
    <label>Armor SP</label>
    <input type="number" id="ve-sp" value="0" min="0">
    <label>MOVE (Geschwindigkeit)</label>
    <input type="number" id="ve-move" value="6" min="1">
    <label>Bild-URL (optional)</label>
    <input id="ve-img" placeholder="https://…">
    <label>Notizen (Mods, Upgrades…)</label>
    <textarea id="ve-stats" placeholder="z.B. Bulletproof Glass, NOS, Machine Gun"></textarea>
    <div class="role-modal-actions">
      <button data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="save">Speichern</button>
    </div>`;
  openModal(html, (modal, close) => {
    modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
    modal.querySelector('[data-act="save"]').addEventListener('click', async () => {
      const picked = modal.querySelector('#ve-pick').value;
      const custom = modal.querySelector('#ve-custom').value.trim();
      const name = custom || picked;
      if (!name) return;
      const sdp  = parseInt(modal.querySelector('#ve-sdp').value, 10)  || 20;
      const sp   = parseInt(modal.querySelector('#ve-sp').value, 10)   || 0;
      const move = parseInt(modal.querySelector('#ve-move').value, 10) || 6;
      const imageUrl = modal.querySelector('#ve-img').value.trim() || null;
      const notes    = modal.querySelector('#ve-stats').value.trim();
      await addInventoryItem(character.id, {
        category: 'vehicle', name,
        description: notes || 'Stock Family Vehicle',
        charges: 1, max_charges: 1,
        meta: { from_motorpool: !!(picked && !custom), acquired_at_rank: character.role_rank,
                sdp, max_sdp: sdp, armor_sp: sp, move, image_url: imageUrl }
      });
      close();
      renderGarage(view, character);
    });
  });
}

// ============================================================
// MOTORPOOL — Reference per Rank
// ============================================================
function renderPool(view, character) {
  view.innerHTML = '';
  const rank = character.role_rank || 4;
  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Family Motorpool</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      Vehicles aus Tiers ≤ deinem Rank ${rank} kannst du in Garage aufnehmen.
    </div>
  </div>`));

  MOTORPOOL.forEach(t => {
    const unlocked = rank >= t.rankMin;
    view.appendChild(el(`
      <div class="role-section" style="margin-top:10px; ${unlocked ? 'border-color: var(--role-accent);' : 'opacity: 0.5;'}">
        <div class="role-section-title">
          Rank ${t.rankMin}-${t.rankMax}
          ${unlocked ? '<span class="role-pill" style="margin-left:8px;">UNLOCKED</span>' : '<span class="role-pill" style="margin-left:8px; opacity:0.5;">LOCKED</span>'}
        </div>
        <div style="font-size:12px;">
          ${t.vehicles.map(v => `<span class="role-pill" style="margin-right:6px; margin-bottom:4px; display:inline-block;">${v}</span>`).join('')}
        </div>
      </div>
    `));
  });

  if (rank >= 10) {
    view.appendChild(el(`<div class="role-section" style="margin-top:10px; border-color: gold;">
      <div class="role-section-title" style="color: gold;">🎯 RANK 10 — Leadership</div>
      <div style="font-size:12px;">
        Promoted to Leadership Position. <b>Alle Family Vehicles gleichzeitig draußen</b>.
        Zukünftige Family Vehicles: Marktpreis. Zukünftige Upgrades: 1.000eb pro Stück.
      </div>
    </div>`));
  }
}

// ============================================================
// UPGRADES Reference
// ============================================================
function renderUpgrades(view, character) {
  view.innerHTML = '';
  const rank = character.role_rank || 4;
  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Vehicle Upgrades Katalog</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      Upgrade-Rang ≤ deinem Moto-Rank ${rank} kannst du nutzen. 
      Pro Rank-Up: 1 Upgrade auf existierendes Vehicle. 
      Auf offenem Markt: Rank-1-Upgrades = Very Expensive · höhere = Luxury.
    </div>
  </div>`));

  const grouped = { 1: [], 5: [] };
  VEHICLE_UPGRADES.forEach(u => { (grouped[u.rank] ||= []).push(u); });

  Object.entries(grouped).forEach(([reqRank, ups]) => {
    const unlocked = rank >= +reqRank;
    view.appendChild(el(`<div class="role-section" style="margin-top:10px;">
      <div class="role-section-title">
        Requires Moto Rank ${reqRank}+
        ${unlocked ? '<span class="role-pill" style="margin-left:8px;">UNLOCKED</span>' : '<span class="role-pill" style="margin-left:8px; opacity:0.5;">LOCKED</span>'}
      </div>
      <div class="role-cards">
        ${ups.map(u => `
          <div class="role-card" style="cursor:default; ${unlocked ? '' : 'opacity:0.4;'}">
            <div class="role-card-name">${u.name}</div>
            <div class="role-card-meta">${u.restrict}</div>
            <div class="role-card-desc">${u.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>`));
  });
}

// ============================================================
// DRIVE ACTIONS
// ============================================================
function renderDrive(view, character) {
  view.innerHTML = '';
  const rank = character.role_rank || 4;
  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Drive / Pilot Actions</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      Moto Rank <b>+${rank}</b> wird automatisch auf alle Vehicle-Skills addiert (= Vehicle Familiarity).
    </div>
    <div class="role-cards" id="dr-cards"></div>
  </div>`));

  const acts = [
    { name: 'Drive Land Vehicle', stat: 'REF', skill: 'Drive Land Vehicle', dv: 13, desc: 'Standard-Fahrt, Verfolgung.' },
    { name: 'Pilot Air Vehicle',  stat: 'REF', skill: 'Pilot Air Vehicle',  dv: 15, desc: 'AV, Helicopter, Aerozep.' },
    { name: 'Pilot Sea Vehicle',  stat: 'REF', skill: 'Pilot Sea Vehicle',  dv: 13, desc: 'Speedboat, Yacht, Jetski.' },
    { name: 'Ramming',            stat: 'REF', skill: 'Drive Land Vehicle', dv: 15, desc: 'Anderes Vehicle rammen.' },
    { name: 'Stunt Driving',      stat: 'REF', skill: 'Drive Land Vehicle', dv: 17, desc: 'Crazy Maneuvers, Sprung über Lücke.' },
    { name: 'Vehicle Tech Repair', stat: 'TECH', skill: 'Land/Sea/Air Vehicle Tech', dv: 13, desc: 'Vehicle reparieren (DV/Time abhängig vom Damage).' },
  ];
  const cards = view.querySelector('#dr-cards');
  acts.forEach(a => {
    cards.appendChild(buildActionCard({
      name: a.name, meta: `${a.stat} + ${a.skill} + Moto`, desc: a.desc,
      onClick: () => openDriveRoll(character, a, rank)
    }));
  });
}

function openDriveRoll(character, action, motoRank) {
  const stats = character.stats || {};
  const defaultStat = stats[action.stat] ?? 6;
  const html = `
    <h3>${action.name}</h3>
    <div class="role-card-desc">${action.desc}</div>
    <label>${action.stat}</label><input type="number" id="dr-stat" value="${defaultStat}">
    <label>${action.skill}</label><input type="number" id="dr-skill" value="5">
    <label>Moto Rank (auto)</label><input type="number" id="dr-moto" value="${motoRank}">
    <label>Modifier</label><input type="number" id="dr-mod" value="0">
    <label>DV</label><input type="number" id="dr-dv" value="${action.dv}">
    <div class="role-modal-actions">
      <button data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="roll">Roll</button>
    </div>
    <div id="dr-out" style="margin-top:12px;"></div>`;
  openModal(html, (modal, close) => {
    modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
    modal.querySelector('[data-act="roll"]').addEventListener('click', async () => {
      const roll = performCheck({
        stat: +modal.querySelector('#dr-stat').value || 0,
        skill: (+modal.querySelector('#dr-skill').value || 0) + (+modal.querySelector('#dr-moto').value || 0),
        mod: +modal.querySelector('#dr-mod').value || 0,
        dv: +modal.querySelector('#dr-dv').value,
        entity: character,
      });
      modal.querySelector('#dr-out').innerHTML = renderRollResult(roll);
      await logAction(character.id, 'nomad', action.name, { roll, summary: action.desc });
      setTimeout(close, 1600);
    });
  });
}
