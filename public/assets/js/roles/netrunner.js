// ============================================================
// NETRUNNER — Interface (Cyberpunk RED, pg. 195+)
// Resolution: Interface + 1d10 vs DV (KEIN STAT/Skill bei NET Actions)
// NET Actions per Turn: Rank 1-3=2, 4-6=3, 7-9=4, 10=5
// ============================================================

import {
  buildHeader, buildActionCard, buildInventoryItem, buildSubtabs,
  buildLog, openModal, performAbilityCheck, renderRollResult,
  getInventory, addInventoryItem, useInventoryItem, deleteInventoryItem,
  updateInventoryItem, logAction, el
} from './roles-core.js';

// Interface Abilities (Playbook pg. 199-201)
// Alle nutzen: Interface + 1d10 vs DV (variabel je Architektur-Element)
const NET_ACTIONS = [
  { id: 'jack',       name: 'Jack In / Out',  costsAction: true, dv: null,
    desc: 'Enter/leave NET-Architektur in 6m/yd Reichweite eines Access Points. Safe Jack Out vs unsafe (= alle Rezzed Black ICE Effekte beim Leave).' },
  { id: 'scanner',    name: 'Scanner',        costsAction: 'Meat', dv: 'varies',
    desc: 'MEAT Action (nicht NET Action). Findet Access Points anderer Architekturen in deiner Nähe.' },
  { id: 'backdoor',   name: 'Backdoor',       costsAction: true, dv: 'pwd',
    desc: 'Knackt Password-Obstruktion in Architektur. DV = Password-DV (typisch 6/8/10/12).' },
  { id: 'pathfinder', name: 'Pathfinder',     costsAction: true, dv: 'roll',
    desc: 'Zeigt Floors bis zur ersten Obstruktion ODER bis Roll-Höhe (was zuerst kommt).' },
  { id: 'control',    name: 'Control',        costsAction: true, dv: 'node',
    desc: 'Übernimmt Control Node (Kameras, Türen, Turrets, etc.). DV = Node-DV. Aktivieren des Nodes danach: separate NET Action.' },
  { id: 'eyedee',     name: 'Eye-Dee',        costsAction: true, dv: 'file',
    desc: 'Identifiziert was eine File ist + Wert. DV = File-DV (manche Files sind Dummies).' },
  { id: 'cloak',      name: 'Cloak',          costsAction: true, dv: null,
    desc: 'Versteckt deine Spuren + Virus. Andere Netrunner brauchen Pathfinder ≥ deinem Cloak-Roll.' },
  { id: 'slide',      name: 'Slide',          costsAction: true, dv: 'iceperc',
    desc: 'Flucht vor 1 Non-Demon Black ICE. Roll vs ICE Perception + 1d10. Geht NICHT durch Passwords. 1×/Turn.' },
  { id: 'virus',      name: 'Virus',          costsAction: 'multi', dv: 'custom',
    desc: 'Permanenter Effekt auf Architektur. Nur am lowest Floor. Mehrere NET Actions je nach DM-Definition.' },
  { id: 'zap',        name: 'Zap',            costsAction: true, dv: 'def',
    desc: 'Basic NET-Angriff. 1d6 dmg auf Program REZ ODER direkt aufs enemy Netrunner Brain. Roll vs Program DEF / enemy Interface +1d10.' },
];

// Programs (Playbook pg. 202+)
const PROGRAMS = {
  boosters: [
    { name: 'Eraser',           cost: 20,   atk: 0, def: 0, rez: 7,  icon: 'Pink glob mit Seifenblasen.',
      effect: '+2 auf alle Cloak Checks solange Rezzed.' },
    { name: 'See Ya',           cost: 20,   atk: 0, def: 0, rez: 7,  icon: 'Silberne Lupe.',
      effect: '+2 auf alle Pathfinder Checks solange Rezzed.' },
    { name: 'Speedy Gonzalvez', cost: 100,  atk: 0, def: 0, rez: 7,  icon: 'Staubspur hinter Netrunner.',
      effect: '+2 Speed solange Rezzed.' },
    { name: 'Worm',             cost: 50,   atk: 0, def: 0, rez: 7,  icon: 'Goldener Mechanik-Wurm.',
      effect: '+2 auf alle Backdoor Checks solange Rezzed.' },
  ],
  defenders: [
    { name: 'Armor',  cost: 50,  atk: 0, def: 0, rez: 7,  icon: 'Transparente goldene Rüstung.',
      effect: '-4 auf erhaltenen Brain-Schaden. 1× pro Netrun, 1 Copy gleichzeitig.' },
    { name: 'Flak',   cost: 50,  atk: 0, def: 0, rez: 7,  icon: 'Glühende Lichtwolke.',
      effect: 'Setzt ATK aller Non-Black-ICE Attacker auf 0. 1× pro Netrun, 1 Copy gleichzeitig.' },
    { name: 'Shield', cost: 20,  atk: 0, def: 0, rez: 7,  icon: 'Silberne Energy-Barriere.',
      effect: 'Stoppt ersten Non-Black-ICE Damage. Derezzed sich danach. 1× pro Netrun, 1 Copy gleichzeitig.' },
  ],
  attackers: [
    { name: 'Banhammer',     cost: 50,  atk: 1, def: 0, rez: 0, kind: 'Anti-Program',
      icon: 'Weißer Sledgehammer.',
      effect: '3d6 REZ vs Non-Black-ICE Program, 2d6 vs Black ICE.' },
    { name: 'Sword',         cost: 50,  atk: 1, def: 0, rez: 0, kind: 'Anti-Program',
      icon: 'Glühende Energy-Katana.',
      effect: '3d6 REZ vs Black ICE, 2d6 vs Non-Black-ICE.' },
    { name: 'DeckKRASH',     cost: 100, atk: 0, def: 0, rez: 0, kind: 'Anti-Personnel',
      icon: 'Cartoon-Dynamit-Stange.',
      effect: 'Enemy Netrunner wird unsafe ausgeworfen. Erleidet alle Rezzed Black ICE Effekte beim Leave.' },
    { name: 'Hellbolt',      cost: 100, atk: 2, def: 0, rez: 0, kind: 'Anti-Personnel',
      icon: 'Crimson-Feuer-Bolzen.',
      effect: '2d6 direkter Brain-Damage. Deck + Klamotten brennen (Meat Action zum Löschen, 2 HP/Turn).' },
    { name: 'Nervescrub',    cost: 100, atk: 0, def: 0, rez: 0, kind: 'Anti-Personnel',
      icon: 'Chrom-Kugel mit Funken.',
      effect: 'INT/REF/DEX -1d6 für 1h (min 1). Psychosomatisch, keine permanente Wirkung.' },
    { name: 'Poison Flatline',cost: 100,atk: 0, def: 0, rez: 0, kind: 'Anti-Personnel',
      icon: 'Giftgrüner Strudel.',
      effect: 'Zerstört ein zufälliges Non-Black-ICE Program im enemy Deck.' },
  ],
  blackICE: [
    { name: 'Asp',       cost: 100,  per: 4, spd: 6, atk: 2, def: 2, rez: 15, kind: 'Anti-Personnel',
      icon: 'Goldene Kobra, neongrünes Licht.',
      effect: 'Zerstört zufälliges Program im enemy Deck.' },
    { name: 'Hellhound', cost: 500,  per: 6, spd: 6, atk: 6, def: 2, rez: 20, kind: 'Anti-Personnel',
      icon: 'Massive schwarze Metallwölfin mit Feuer.',
      effect: '2d6 direkter Brain-Damage + Brand (wie Hellbolt).' },
    { name: 'Liche',     cost: 500,  per: 8, spd: 2, atk: 6, def: 2, rez: 25, kind: 'Anti-Personnel',
      icon: 'Metall-Skelett in schwarzer Robe.',
      effect: 'INT/REF/DEX -1d6 für 1h (wie Nervescrub).' },
    { name: 'Raven',     cost: 50,   per: 6, spd: 4, atk: 4, def: 2, rez: 15, kind: 'Anti-Personnel',
      icon: 'Rabe in Plattenrüstung mit Lanze.',
      effect: 'Derezzed 1 zufälliges Defender Program + 1d6 Brain-Damage.' },
    { name: 'Giant',     cost: 1000, per: 2, spd: 2, atk: 8, def: 4, rez: 25, kind: 'Anti-Personnel',
      icon: 'Riesige Füße & Knöchel.',
      effect: '3d6 Brain-Damage + unsafe Jack Out (mit allen ICE-Effekten außer Giant).' },
    { name: 'Kraken',    cost: 1000, per: 6, spd: 2, atk: 8, def: 4, rez: 30, kind: 'Anti-Personnel',
      icon: 'Orange Tentakel mit roten Saugnäpfen.',
      effect: '3d6 Brain-Damage + kein Progress / kein safe Jack Out bis nächster Turn.' },
  ],
};

// Architecture Floor Types (Playbook pg. 211 — random tables)
const FLOOR_TYPES = ['Password', 'File', 'Control Node', 'Black ICE', 'Empty'];

export async function mount(panel, character) {
  panel.innerHTML = '';
  panel.appendChild(el(buildHeader('netrunner', character)));

  const main = el(`<div></div>`);
  panel.appendChild(main);
  panel.appendChild(await buildLog(character.id));

  const rank = character.role_rank || 4;
  const netActions = rank <= 3 ? 2 : rank <= 6 ? 3 : rank <= 9 ? 4 : 5;
  panel.appendChild(el(`<div class="role-section" style="grid-column:1/-1; padding: 8px 14px;">
    <div style="font-size:11px; color:var(--role-muted); letter-spacing:0.15em; text-transform:uppercase;">
      Interface Rank ${rank} → <b style="color:var(--role-accent)">${netActions} NET Actions / Turn</b>
    </div>
  </div>`));

  const subtabs = buildSubtabs([
    { key: 'net',     label: '🕸️ NET Crawl' },
    { key: 'actions', label: '⚡ NET Actions' },
    { key: 'deck',    label: '📀 Deck / Programs' },
    { key: 'progref', label: '📖 Program Reference' },
  ], (k) => render(k));
  main.appendChild(subtabs);

  const view = el(`<div></div>`);
  main.appendChild(view);

  async function render(key) {
    view.innerHTML = '';
    if (key === 'net')     return renderNetCrawl(view, character);
    if (key === 'actions') return renderActions(view, character);
    if (key === 'deck')    return renderDeck(view, character);
    if (key === 'progref') return renderProgramReference(view);
  }
  render('net');
}

// ============================================================
// NET CRAWL — Architecture Tracker
// ============================================================
async function renderNetCrawl(view, character) {
  view.innerHTML = '';
  let arch = (await getInventory(character.id, 'architecture'))[0];

  if (!arch) {
    view.appendChild(el(`<div class="role-section">
      <div class="role-section-title">Aktive NET-Architektur</div>
      <div class="role-empty">
        <div class="role-empty-glyph">🕸️</div>
        Keine Architektur. DM erstellt typischerweise per Difficulty Rating (Basic / Standard / Uncommon / Advanced).
      </div>
      <button class="role-dice-btn" id="new-arch" style="margin-top:10px;">＋ Architektur eintragen</button>
    </div>`));
    view.querySelector('#new-arch').addEventListener('click', () => openArchitectureForm(character, view, null));
    return;
  }

  const floors = arch.meta.floors || [];
  const current = arch.meta.currentFloor ?? 0;

  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">${arch.name}</div>
    <div class="role-card-desc">${arch.description || 'Architektur ohne Beschreibung.'}</div>
    <div class="netrunner-net" id="floors" style="margin-top:12px;"></div>
    <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
      <button class="role-dice-btn" id="advance">▼ Nächste Floor</button>
      <button class="role-dice-btn secondary" id="reset-arch">Reset</button>
      <button class="role-dice-btn secondary" id="del-arch" style="color:var(--role-danger); border-color:var(--role-danger);">Architektur löschen</button>
    </div>
  </div>`));

  const floorsEl = view.querySelector('#floors');
  floors.forEach((f, i) => {
    floorsEl.appendChild(el(`
      <div class="netrunner-floor ${i === current ? 'current' : ''} ${i < current ? 'cleared' : ''}">
        <span class="netrunner-floor-num">F${i+1}</span>
        <span>${f.type || 'Node'} — ${f.name || '???'}</span>
        ${f.dv ? `<span class="role-pill" style="margin-left:auto;">DV ${f.dv}</span>` : ''}
      </div>
    `));
  });

  view.querySelector('#advance').addEventListener('click', async () => {
    const next = Math.min(current + 1, floors.length - 1);
    arch.meta.currentFloor = next;
    await updateInventoryItem(arch.id, { meta: arch.meta });
    renderNetCrawl(view, character);
    await logAction(character.id, 'netrunner', 'Advanced → Floor ' + (next+1), { summary: floors[next]?.name || '' });
  });
  view.querySelector('#reset-arch').addEventListener('click', async () => {
    arch.meta.currentFloor = 0;
    await updateInventoryItem(arch.id, { meta: arch.meta });
    renderNetCrawl(view, character);
  });
  view.querySelector('#del-arch').addEventListener('click', async () => {
    if (!confirm('Architektur löschen?')) return;
    await deleteInventoryItem(arch.id);
    renderNetCrawl(view, character);
  });
}

function openArchitectureForm(character, view, existing) {
  const html = `
    <h3>NET Architektur eintragen</h3>
    <div class="role-card-desc">Format: <code>type|name|dv</code> pro Zeile. Types: Password, File, Control Node, Black ICE, Empty.</div>
    <label>Name</label><input id="ar-name" value="${existing?.name || 'Daemonheim'}">
    <label>Beschreibung</label><textarea id="ar-desc">${existing?.description || ''}</textarea>
    <label>Floors</label>
    <textarea id="ar-floors" style="font-family:monospace; min-height:120px;" placeholder="Password|Login Wall|6
File|Public Email Cache|6
Control Node|Camera Hub|8
Password|Admin Wall|10
Black ICE|Asp|—
File|Secret Docs|12"></textarea>
    <div class="role-modal-actions">
      <button data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="save">Speichern</button>
    </div>
  `;
  openModal(html, (modal, close) => {
    modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
    modal.querySelector('[data-act="save"]').addEventListener('click', async () => {
      const name = modal.querySelector('#ar-name').value.trim();
      const desc = modal.querySelector('#ar-desc').value.trim();
      const raw = modal.querySelector('#ar-floors').value.trim();
      const floors = raw.split('\n').filter(Boolean).map(line => {
        const [type, n, dv] = line.split('|').map(s => s?.trim());
        return { type, name: n, dv: dv && dv !== '—' ? parseInt(dv, 10) : null };
      });
      await addInventoryItem(character.id, {
        category: 'architecture', name, description: desc,
        charges: 1, max_charges: 1,
        meta: { floors, currentFloor: 0 }
      });
      close();
      renderNetCrawl(view, character);
    });
  });
}

// ============================================================
// NET ACTIONS — Quick Rolls
// ============================================================
function renderActions(view, character) {
  view.innerHTML = '';
  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">NET Actions</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      Resolution: <b>Interface Rank + 1d10 vs DV</b>. KEIN STAT, KEIN Skill (außer Zap-Defense gegen Programme).
    </div>
    <div class="role-cards" id="net-actions"></div>
  </div>`));
  const cards = view.querySelector('#net-actions');
  NET_ACTIONS.forEach(a => {
    cards.appendChild(buildActionCard({
      name: a.name,
      meta: typeof a.dv === 'string' ? `DV: ${a.dv}` : (a.dv ? `DV ${a.dv}` : 'kein Roll'),
      desc: a.desc,
      onClick: () => openNetActionFlow(character, a)
    }));
  });
}

function openNetActionFlow(character, action) {
  const html = `
    <h3>${action.name}</h3>
    <div class="role-card-desc">${action.desc}</div>
    <label>Interface Rank</label><input type="number" id="na-rank" value="${character.role_rank || 4}">
    <label>Modifier (z.B. +2 von Worm für Backdoor, +2 von See Ya für Pathfinder)</label>
    <input type="number" id="na-mod" value="0">
    <label>DV</label><input type="number" id="na-dv" placeholder="z.B. 8">
    <div class="role-modal-actions">
      <button data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="roll">Execute</button>
    </div>
    <div id="na-out" style="margin-top:12px;"></div>`;
  openModal(html, (modal, close) => {
    modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
    modal.querySelector('[data-act="roll"]').addEventListener('click', async () => {
      const dvRaw = modal.querySelector('#na-dv').value.trim();
      const roll = performAbilityCheck({
        rank: +modal.querySelector('#na-rank').value || 0,
        mod:  +modal.querySelector('#na-mod').value || 0,
        dv:   dvRaw === '' ? null : +dvRaw,
        label: 'Interface'
      });
      modal.querySelector('#na-out').innerHTML = renderRollResult(roll);
      await logAction(character.id, 'netrunner', action.name, {
        roll, summary: roll.success ? action.desc : 'NET Action fehlgeschlagen'
      });
      setTimeout(close, 1600);
    });
  });
}

// ============================================================
// DECK / PROGRAMS — Player's loadout
// ============================================================
async function renderDeck(view, character) {
  view.innerHTML = '';
  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Programme im Deck</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      Deck-Slots: Poor=5 / Standard=7 / Excellent=9. Programme + Hardware teilen Slots. Install/Uninstall: 1 Stunde.
    </div>
    <div id="prog-inv" class="role-inv"></div>
    <button class="role-dice-btn" id="add-prog" style="margin-top:10px;">＋ Custom Programm</button>
    <button class="role-dice-btn secondary" id="seed-prog" style="margin-top:10px;">Starter-Set laden (Eraser/Shield/Sword/Banhammer)</button>
  </div>`));

  const inv = view.querySelector('#prog-inv');
  const progs = await getInventory(character.id, 'program');
  if (!progs.length) {
    inv.innerHTML = `<div class="role-empty">Kein Programm geladen.</div>`;
  } else {
    progs.forEach(p => {
      inv.appendChild(buildInventoryItem({
        item: p,
        onDelete: async () => { await deleteInventoryItem(p.id); renderDeck(view, character); }
      }));
    });
  }

  view.querySelector('#add-prog').addEventListener('click', () => openAddProgramFromList(character, view));
  view.querySelector('#seed-prog').addEventListener('click', async () => {
    if (!confirm('Starter-Set laden (4 Programme: Eraser, Shield, Sword, Banhammer)?')) return;
    const starter = [
      PROGRAMS.boosters.find(p => p.name === 'Eraser'),
      PROGRAMS.defenders.find(p => p.name === 'Shield'),
      PROGRAMS.attackers.find(p => p.name === 'Sword'),
      PROGRAMS.attackers.find(p => p.name === 'Banhammer'),
    ];
    for (const p of starter) {
      await addInventoryItem(character.id, {
        category: 'program', name: p.name,
        description: p.effect,
        charges: 1, max_charges: 1,
        meta: { atk: p.atk, def: p.def, rez: p.rez, cost: p.cost, kind: p.kind || 'standard' }
      });
    }
    renderDeck(view, character);
  });
}

function openAddProgramFromList(character, view) {
  const allProgs = [
    ...PROGRAMS.boosters.map(p => ({ ...p, kind: 'Booster' })),
    ...PROGRAMS.defenders.map(p => ({ ...p, kind: 'Defender' })),
    ...PROGRAMS.attackers.map(p => ({ ...p, kind: p.kind || 'Attacker' })),
    ...PROGRAMS.blackICE.map(p => ({ ...p, kind: 'Black ICE' })),
  ];
  const options = allProgs.map((p, i) =>
    `<option value="${i}">${p.name} — ${p.cost}eb · ${p.kind}</option>`
  ).join('');

  const html = `
    <h3>Programm aus Liste hinzufügen</h3>
    <label>Programm</label>
    <select id="p-pick">${options}</select>
    <div class="role-modal-actions">
      <button data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="save">Hinzufügen</button>
    </div>`;
  openModal(html, (modal, close) => {
    modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
    modal.querySelector('[data-act="save"]').addEventListener('click', async () => {
      const idx = +modal.querySelector('#p-pick').value;
      const p = allProgs[idx];
      await addInventoryItem(character.id, {
        category: 'program', name: p.name,
        description: `${p.kind} · ATK ${p.atk}/DEF ${p.def}/REZ ${p.rez} · ${p.effect}`,
        charges: 1, max_charges: 1,
        meta: { atk: p.atk, def: p.def, rez: p.rez, cost: p.cost, kind: p.kind, per: p.per, spd: p.spd }
      });
      close();
      renderDeck(view, character);
    });
  });
}

// ============================================================
// PROGRAM REFERENCE — read-only Table
// ============================================================
function renderProgramReference(view) {
  view.innerHTML = '';
  const block = (title, list, hasICEStats) => {
    const headers = hasICEStats
      ? '<th>Name</th><th>Cost</th><th>PER</th><th>SPD</th><th>ATK</th><th>DEF</th><th>REZ</th><th>Effect</th>'
      : '<th>Name</th><th>Cost</th><th>ATK</th><th>DEF</th><th>REZ</th><th>Effect</th>';
    const rows = list.map(p => hasICEStats
      ? `<tr><td><b>${p.name}</b></td><td>${p.cost}eb</td><td>${p.per}</td><td>${p.spd}</td><td>${p.atk}</td><td>${p.def}</td><td>${p.rez}</td><td>${p.effect}</td></tr>`
      : `<tr><td><b>${p.name}</b></td><td>${p.cost}eb</td><td>${p.atk}</td><td>${p.def}</td><td>${p.rez}</td><td>${p.effect}</td></tr>`
    ).join('');
    return `
      <div class="role-section" style="margin-bottom:10px;">
        <div class="role-section-title">${title}</div>
        <table style="width:100%; font-size:11px; border-collapse:collapse;">
          <thead><tr style="color:var(--role-muted); text-align:left;">${headers}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  };

  view.appendChild(el(block('Boosters',  PROGRAMS.boosters,  false)));
  view.appendChild(el(block('Defenders', PROGRAMS.defenders, false)));
  view.appendChild(el(block('Attackers', PROGRAMS.attackers, false)));
  view.appendChild(el(block('Black ICE', PROGRAMS.blackICE,  true)));
}
