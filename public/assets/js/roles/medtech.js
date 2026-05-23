// ============================================================
// MEDTECH — Medicine (Cyberpunk RED, pg. 149)
// Medicine-Rank up: 1 Specialty point (Surgery / Pharmaceuticals / Cryo)
//   Surgery: 2 Surgery Skill pts per allocation (max 10)
//   Pharmaceuticals: 1 Medical Tech pt + unlocks a drug per allocation (max 10)
//   Cryosystem Operation: 1 Medical Tech pt + Cryopump/Cryotank (max 5)
// ============================================================

import {
  buildHeader, buildActionCard, buildInventoryItem, buildSubtabs,
  buildLog, openModal, pickTarget, performCheck, renderRollResult,
  getInventory, addInventoryItem, useInventoryItem, deleteInventoryItem,
  updateInventoryItem, logAction, el
} from './roles-core.js';

// 5 offizielle Medtech Pharmaceuticals (Playbook pg. 150)
// Brewing: DV13 Medical Tech (TECH+MedTech+1d10), 200eb pro Batch,
// # Doses = aktueller Medical Tech Skill Level, 1h pro Batch
const PHARMACEUTICALS = [
  {
    id: 'antibiotic',
    name: 'Antibiotic',
    unlockAt: 1,
    effect: 'Injiziertes Ziel heilt +2 HP/Tag für eine Woche (zusätzlich zur natürlichen Heilung). Eine Person kann nur 1× Antibiotic gleichzeitig nutzen.'
  },
  {
    id: 'rapidetox',
    name: 'Rapidetox',
    unlockAt: 2,
    effect: 'Reinigt das Ziel sofort von Drogen, Gift oder Intoxikanten.'
  },
  {
    id: 'speedheal',
    name: 'Speedheal',
    unlockAt: 3,
    effect: 'Heilt sofort BODY + WILL HP. Nicht bei Mortally Wounded. 1× pro Tag pro Person.'
  },
  {
    id: 'stim',
    name: 'Stim',
    unlockAt: 4,
    effect: 'Ignoriert alle Seriously-Wounded Penalties für 1h. 1× pro Tag pro Person.'
  },
  {
    id: 'surge',
    name: 'Surge',
    unlockAt: 5,
    effect: '24h ohne Schlaf, voll funktionsfähig. 1× pro Woche pro Person.'
  },
];

// Surgery-Anwendungen — nur via Medicine Specialty Surgery
const SURGERY_PROCEDURES = [
  { name: 'Critical Injury treat (Severe)', dv: 17, time: '1h', desc: 'Behandelt schwerste Critical Injuries die mit Paramedic nicht behandelbar sind.' },
  { name: 'Cyberware installieren',          dv: 17, time: 'siehe Cyberware Liste', desc: 'Implantation. Humanity Loss separat würfeln (Cyberware-spezifisch).' },
  { name: 'Cyberware harvesten',             dv: 15, time: '1h', desc: 'Cyberware aus Leiche entfernen, intakt.' },
  { name: 'Bodysculpting',                   dv: 17, time: 'mehrere Tage', desc: 'Plastische Chirurgie / Aussehen ändern.' },
];

// Standard-Treatments (jeder Char mit den Skills, aber Medtech ist besser)
const TREATMENTS = [
  { id: 'firstaid',  name: 'First Aid',  dv: 13, skill: 'First Aid',
    effect: 'Stabilisiert. Bei Erfolg: 5 HP Heilung. Funktioniert nur, solange der Patient nicht Mortally Wounded ist.' },
  { id: 'paramedic', name: 'Paramedic',  dv: 13, skill: 'Paramedic',
    effect: 'Behandelt alle Critical Injuries außer den schwersten. Bei Erfolg: 1d6+1 HP Heilung.' },
];

export async function mount(panel, character) {
  panel.innerHTML = '';
  panel.appendChild(el(buildHeader('medtech', character)));

  const main = el(`<div></div>`);
  panel.appendChild(main);
  panel.appendChild(await buildLog(character.id));

  const subtabs = buildSubtabs([
    { key: 'pharma',  label: '💊 Pharma Lab' },
    { key: 'patient', label: '🩺 Patient' },
    { key: 'surgery', label: '🔬 Surgery' },
    { key: 'spec',    label: '⚙️ Specialties' },
    { key: 'inv',     label: '🧰 Inventar' },
  ], (k) => render(k));
  main.appendChild(subtabs);

  const view = el(`<div></div>`);
  main.appendChild(view);

  async function render(key) {
    view.innerHTML = '';
    if (key === 'pharma')  return renderPharma(view, character);
    if (key === 'patient') return renderPatient(view, character);
    if (key === 'surgery') return renderSurgery(view, character);
    if (key === 'spec')    return renderSpecialties(view, character);
    if (key === 'inv')     return renderInventory(view, character);
  }
  render('pharma');
}

// ============================================================
// SPECIALTIES — manuelles Tracking (1 Punkt pro Medicine-Rank)
// ============================================================
async function renderSpecialties(view, character) {
  const items = await getInventory(character.id, 'specialty');
  let spec = items.find(i => i.meta?.kind === 'medicine');
  if (!spec) {
    // Initial: 0/0/0 — der Spieler füllt selbst aus
    spec = await addInventoryItem(character.id, {
      category: 'specialty', name: 'Medicine Specialty Allocation',
      description: 'Tracking der verteilten Specialty-Punkte', charges: 1, max_charges: 1,
      meta: { kind: 'medicine', surgery: 0, pharma: 0, cryo: 0 }
    });
  }
  const total = (character.role_rank || 4);
  const used = (spec.meta.surgery || 0) + (spec.meta.pharma || 0) + (spec.meta.cryo || 0);

  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Medicine Specialties</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      Pro Medicine-Rank-Up wählst du <b>eine Specialty</b> und allozierst 1 Punkt.
      Total Allocations sollten = Medicine Rank sein. Aktuell: <b>${used}/${total}</b>
    </div>
    <div id="spec-list"></div>
  </div>`));

  const list = view.querySelector('#spec-list');
  const specs = [
    { key: 'surgery', name: 'Surgery', max: 10,
      perPoint: '+2 Surgery Skill. Schwerste Critical Injuries behandeln + Cyberware installieren.' },
    { key: 'pharma', name: 'Pharmaceuticals', max: 10,
      perPoint: '+1 Medical Tech Skill. Schaltet eine neue Drug-Rezeptur frei (1=Antibiotic, 2=Rapidetox, 3=Speedheal, 4=Stim, 5=Surge, 6+=DM-Wahl).' },
    { key: 'cryo', name: 'Cryosystem Operation', max: 5,
      perPoint: '+1 Medical Tech Skill. Lvl 1=Cryopump, Lvl 2=Tank-Access, Lvl 3=eigener Cryotank, Lvl 4-5=mehr Tanks/Pump-Charges.' },
  ];

  specs.forEach(s => {
    const val = spec.meta[s.key] || 0;
    const row = el(`
      <div class="role-row" style="align-items:center; padding:10px 0; border-bottom:1px solid var(--role-line);">
        <div class="role-grow">
          <div style="font-family:'Audiowide';font-size:13px;">${s.name}</div>
          <div style="font-size:11px; color:var(--role-muted);">${s.perPoint}</div>
        </div>
        <div class="role-row" style="gap:4px; align-items:center;">
          <button class="role-dice-btn secondary" data-d="-1">−</button>
          <span class="role-pill" style="min-width:30px; text-align:center;" data-val>${val}</span><span style="color:var(--role-muted); font-size:10px;">/${s.max}</span>
          <button class="role-dice-btn secondary" data-d="+1">＋</button>
        </div>
      </div>
    `);
    row.querySelectorAll('button[data-d]').forEach(b => {
      b.addEventListener('click', async () => {
        const delta = parseInt(b.dataset.d, 10);
        const cur = spec.meta[s.key] || 0;
        if (delta > 0 && cur >= s.max) return;
        if (delta < 0 && cur <= 0) return;
        spec.meta[s.key] = cur + delta;
        await updateInventoryItem(spec.id, { meta: spec.meta });
        row.querySelector('[data-val]').textContent = spec.meta[s.key];
        renderSpecialties(view, character); // re-render for total
      });
    });
    list.appendChild(row);
  });
}

// ============================================================
// PHARMA LAB — Brewing
// DV13 Medical Tech Check, 200eb pro Batch
// # Doses = Medical Tech Skill Level
// ============================================================
async function renderPharma(view, character) {
  const specItems = await getInventory(character.id, 'specialty');
  const spec = specItems.find(i => i.meta?.kind === 'medicine');
  const pharmaPoints = spec?.meta?.pharma || 0;

  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Pharma Lab — Drug Brewing</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      <b>Brewing-Roll:</b> TECH + Medical Tech + 1d10 vs <b>DV13</b>. Pro Batch: <b>200eb Materialien</b>, <b>1h Zeit</b>.
      Anzahl Doses pro Batch = <b>aktueller Medical Tech Skill</b>. Bei Failure: Materialien verloren.
      Dein Pharma-Specialty: <b>${pharmaPoints}</b> → unlocked bis Drug ${pharmaPoints}.
    </div>
    <div class="role-cards" id="pharma-cards"></div>
  </div>`));

  const cards = view.querySelector('#pharma-cards');
  PHARMACEUTICALS.forEach(p => {
    const locked = p.unlockAt > pharmaPoints;
    cards.appendChild(buildActionCard({
      name: p.name,
      meta: `DV 13 · 200eb/Batch · Unlock @ Pharma ${p.unlockAt}`,
      desc: p.effect,
      disabled: locked,
      badge: locked ? '🔒' : null,
      onClick: () => openBrewModal(character, p)
    }));
  });
}

function openBrewModal(character, recipe) {
  const html = `
    <h3>Brew: ${recipe.name}</h3>
    <div class="role-card-desc">${recipe.effect}</div>
    <label>TECH</label><input type="number" id="cr-stat" value="6">
    <label>Medical Tech Skill</label><input type="number" id="cr-skill" value="6">
    <label>Modifier</label><input type="number" id="cr-mod" value="0">
    <label>Anzahl Doses (= Medical Tech Skill)</label>
    <input type="number" id="cr-doses" value="6">
    <div class="role-modal-actions">
      <button data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="brew">Brew Batch (200eb)</button>
    </div>
    <div id="cr-out" style="margin-top:12px;"></div>
  `;
  openModal(html, (modal, close) => {
    modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
    modal.querySelector('[data-act="brew"]').addEventListener('click', async () => {
      const roll = performCheck({
        stat: +modal.querySelector('#cr-stat').value || 0,
        skill: +modal.querySelector('#cr-skill').value || 0,
        mod: +modal.querySelector('#cr-mod').value || 0,
        dv: 13
      });
      modal.querySelector('#cr-out').innerHTML = renderRollResult(roll);

      if (roll.success) {
        const doses = Math.max(1, +modal.querySelector('#cr-doses').value || 1);
        await addInventoryItem(character.id, {
          category: 'drug', name: recipe.name, description: recipe.effect,
          charges: doses, max_charges: doses,
          meta: { recipe: recipe.id, dv: 13, batch_cost: 200 }
        });
        await logAction(character.id, 'medtech', `Brewed: ${recipe.name} ×${doses}`, {
          roll, summary: `${doses} Doses im Inventar · 200eb verbraucht`
        });
      } else {
        await logAction(character.id, 'medtech', `Brew fail: ${recipe.name}`, {
          roll, summary: '200eb Materialien verloren'
        });
      }
      setTimeout(close, 1800);
    });
  });
}

// ============================================================
// PATIENT — Apply Drugs & Treatments
// ============================================================
async function renderPatient(view, character) {
  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Treatments</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      Standard-Behandlungen (jeder kann First Aid / Paramedic). System fragt Ziel, dann Roll.
    </div>
    <div class="role-cards" id="treat-cards"></div>
  </div>`));
  const cards = view.querySelector('#treat-cards');
  TREATMENTS.forEach(t => {
    cards.appendChild(buildActionCard({
      name: t.name, meta: `DV ${t.dv} · TECH + ${t.skill}`,
      desc: t.effect, onClick: () => openTreatmentFlow(character, t)
    }));
  });

  // Drug-Anwendung
  view.appendChild(el(`<div class="role-section" style="margin-top:14px;">
    <div class="role-section-title">Drug am Patienten anwenden</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      Application: 1 Action. Unwilliges Ziel? Airhypo als Melee Attack (deal Dose statt Damage).
      <b>Nicht-Medtechs können Pharmaceuticals NICHT korrekt verabreichen</b> (Playbook pg. 150).
    </div>
    <div id="apply-inv" class="role-inv"></div>
  </div>`));

  const inv = view.querySelector('#apply-inv');
  const items = await getInventory(character.id, 'drug');
  if (!items.length) {
    inv.innerHTML = `<div class="role-empty">Keine Drugs im Inventar. Erst brewen.</div>`;
    return;
  }
  items.forEach(item => {
    inv.appendChild(buildInventoryItem({
      item,
      onUse: async () => {
        const target = await pickTarget();
        if (!target) return;
        await useInventoryItem(item.id, 1);
        await logAction(character.id, 'medtech', `Verabreicht: ${item.name}`, {
          target, summary: item.description
        });
        renderPatient(view, character);
      },
      onDelete: async () => { await deleteInventoryItem(item.id); renderPatient(view, character); }
    }));
  });
}

async function openTreatmentFlow(character, treatment) {
  const target = await pickTarget();
  if (!target) return;

  const html = `
    <h3>${treatment.name} → ${target.type === 'self' ? 'Selbst' : target.name}</h3>
    <div class="role-card-desc">${treatment.effect}</div>
    <label>TECH</label><input type="number" id="tr-stat" value="6">
    <label>${treatment.skill} Skill</label><input type="number" id="tr-skill" value="6">
    <label>Modifier (Tools, Conditions…)</label><input type="number" id="tr-mod" value="0">
    <div class="role-modal-actions">
      <button data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="roll">Roll Treatment</button>
    </div>
    <div id="tr-out" style="margin-top:12px;"></div>
  `;
  openModal(html, (modal, close) => {
    modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
    modal.querySelector('[data-act="roll"]').addEventListener('click', async () => {
      const roll = performCheck({
        stat: +modal.querySelector('#tr-stat').value || 0,
        skill: +modal.querySelector('#tr-skill').value || 0,
        mod: +modal.querySelector('#tr-mod').value || 0,
        dv: treatment.dv
      });
      modal.querySelector('#tr-out').innerHTML = renderRollResult(roll);
      await logAction(character.id, 'medtech', `${treatment.name} → ${target.type === 'self' ? 'self' : target.name}`, {
        target, roll, summary: roll.success ? treatment.effect : 'Treatment fehlgeschlagen'
      });
      setTimeout(close, 1800);
    });
  });
}

// ============================================================
// SURGERY — nur via Medicine Specialty Surgery
// ============================================================
async function renderSurgery(view, character) {
  const specItems = await getInventory(character.id, 'specialty');
  const spec = specItems.find(i => i.meta?.kind === 'medicine');
  const surgeryPts = spec?.meta?.surgery || 0;
  const surgerySkill = surgeryPts * 2;

  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Surgery Suite</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      <b>Dein Surgery Skill:</b> ${surgerySkill} (= ${surgeryPts} Specialty-Punkte × 2).
      Roll: TECH + Surgery + 1d10 vs DV. Surgery ist <b>nur</b> via Medicine Specialty Surgery zugänglich.
    </div>
    <div class="role-cards" id="sg-cards"></div>
  </div>`));

  const cards = view.querySelector('#sg-cards');
  SURGERY_PROCEDURES.forEach(p => {
    cards.appendChild(buildActionCard({
      name: p.name,
      meta: `DV ${p.dv} · ${p.time}`,
      desc: p.desc,
      onClick: () => openSurgeryFlow(character, p, surgerySkill)
    }));
  });
}

async function openSurgeryFlow(character, proc, defaultSkill) {
  const target = await pickTarget();
  if (!target) return;

  const html = `
    <h3>${proc.name} → ${target.type === 'self' ? 'Selbst' : target.name}</h3>
    <div class="role-card-desc">${proc.desc}</div>
    <label>TECH</label><input type="number" id="sg-stat" value="6">
    <label>Surgery Skill</label><input type="number" id="sg-skill" value="${defaultSkill}">
    <label>Modifier</label><input type="number" id="sg-mod" value="0">
    <label>Notes</label><textarea id="sg-notes"></textarea>
    <div class="role-modal-actions">
      <button data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="roll">Operate</button>
    </div>
    <div id="sg-out" style="margin-top:12px;"></div>
  `;
  openModal(html, (modal, close) => {
    modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
    modal.querySelector('[data-act="roll"]').addEventListener('click', async () => {
      const roll = performCheck({
        stat: +modal.querySelector('#sg-stat').value || 0,
        skill: +modal.querySelector('#sg-skill').value || 0,
        mod: +modal.querySelector('#sg-mod').value || 0,
        dv: proc.dv
      });
      modal.querySelector('#sg-out').innerHTML = renderRollResult(roll);
      await logAction(character.id, 'medtech', `Surgery: ${proc.name}`, {
        target, roll,
        summary: roll.success ? `✓ ${proc.desc}` : `✕ Komplikation — DM entscheidet`,
        meta: { notes: modal.querySelector('#sg-notes').value }
      });
      setTimeout(close, 2000);
    });
  });
}

// ============================================================
// INVENTORY
// ============================================================
async function renderInventory(view, character) {
  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Brewed Drugs</div>
    <div id="med-inv" class="role-inv"></div>
  </div>`));
  const inv = view.querySelector('#med-inv');
  const items = await getInventory(character.id, 'drug');
  if (!items.length) {
    inv.innerHTML = `<div class="role-empty">Leer. Brew im Pharma Lab.</div>`;
    return;
  }
  items.forEach(item => {
    inv.appendChild(buildInventoryItem({
      item,
      onUse: async () => {
        const target = await pickTarget();
        if (!target) return;
        await useInventoryItem(item.id, 1);
        await logAction(character.id, 'medtech', `Verabreicht: ${item.name}`, {
          target, summary: item.description
        });
        renderInventory(view, character);
      },
      onDelete: async () => { await deleteInventoryItem(item.id); renderInventory(view, character); }
    }));
  });
}
