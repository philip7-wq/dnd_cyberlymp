// ============================================================
// FIXER — Operator (Cyberpunk RED, pg. 159-161)
// Haggle: COOL + Trading Skill + Operator Rank + 1d10 vs same (Target)
// Reach skaliert mit Rank: Cheap/Everyday → Super Luxury
// Grease: Sprachen/Kulturen pro Rank
// ============================================================

import {
  buildHeader, buildActionCard, buildInventoryItem, buildSubtabs,
  buildLog, openModal, performCheck, renderRollResult,
  getInventory, addInventoryItem, deleteInventoryItem,
  logAction, el
} from './roles-core.js';

// Operator Rank Effects (Playbook pg. 160-161)
const OPERATOR_RANKS = [
  { rank: '1-2', contacts: 'Local honcho, gang lord, neighborhood leadership',
    reach: 'Cheap & Everyday items immer verfügbar',
    haggle: 'Bei Erfolg: 10% mehr/weniger als Marktpreis',
    grease: 'Kulturen + Gangs des eigenen Viertels' },
  { rank: '3-4', contacts: 'City gang honcho, minor politico, Corp Exec',
    reach: 'Up to Expensive items immer verfügbar',
    haggle: 'Beim Kauf von 5+ gleichen Items: 1 extra gratis',
    grease: '+1 zusätzliche Kultur + 1 Sprache (Skill Level 4)' },
  { rank: '5-6', contacts: 'Major City player, City politico, neighborhood celebrity',
    reach: '1×/Monat Night Market organisieren — alle Super Luxury items dort verfügbar',
    haggle: 'Pay per Person für Jobs +20% verhandeln',
    grease: '+2 weitere Kulturen + Sprachen (3 total)' },
  { rank: '7-8', contacts: 'Local Corp president, mayor, City celebrity',
    reach: 'Up to Very Expensive items',
    haggle: 'Bei Luxury/Super Luxury: 50% jetzt / 50% in einem Monat (sonst nie wieder Deal)',
    grease: '+3 weitere Kulturen (6 total)' },
  { rank: '9', contacts: 'Divisional Corp head, State politico, well-known celebrity',
    reach: 'Up to Luxury items + Midnight Market im Night Market organisierbar',
    haggle: 'Bei Erfolg: 20% mehr/weniger als Marktpreis',
    grease: 'Kulturen + Corporate/Governmental Agencies' },
  { rank: '10', contacts: 'World leader, Megacorp head, world-famous celebrity',
    reach: 'Up to Super Luxury items',
    haggle: 'Double Pay per Person für Dangerous Jobs',
    grease: 'Auch sehr spezielle Gruppen (Secret Societies, Cults, exclusive Clubs)' },
];

function getOperatorRankInfo(rank) {
  if (rank <= 2)  return OPERATOR_RANKS[0];
  if (rank <= 4)  return OPERATOR_RANKS[1];
  if (rank <= 6)  return OPERATOR_RANKS[2];
  if (rank <= 8)  return OPERATOR_RANKS[3];
  if (rank == 9)  return OPERATOR_RANKS[4];
  return OPERATOR_RANKS[5];
}

export async function mount(panel, character) {
  panel.innerHTML = '';
  panel.appendChild(el(buildHeader('fixer', character)));

  const main = el(`<div></div>`);
  panel.appendChild(main);
  panel.appendChild(await buildLog(character.id));

  const subtabs = buildSubtabs([
    { key: 'haggle',   label: '💰 Haggle' },
    { key: 'reach',    label: '🌐 Reach' },
    { key: 'grease',   label: '🤝 Grease' },
    { key: 'contacts', label: '📇 Kontakte' },
  ], (k) => render(k));
  main.appendChild(subtabs);

  const view = el(`<div></div>`);
  main.appendChild(view);

  function render(key) {
    view.innerHTML = '';
    if (key === 'haggle')   return renderHaggle(view, character);
    if (key === 'reach')    return renderReach(view, character);
    if (key === 'grease')   return renderGrease(view, character);
    if (key === 'contacts') return renderContacts(view, character);
  }
  render('haggle');
}

// ============================================================
// HAGGLE — COOL + Trading + Operator + 1d10 vs Target's same
// ============================================================
function renderHaggle(view, character) {
  view.innerHTML = '';
  const rank = character.role_rank || 4;
  const info = getOperatorRankInfo(rank);

  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Haggle — Rank ${rank}</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      <b>Roll:</b> COOL + Trading + Operator Rank + 1d10 vs Target's same.
      Bei Erfolg: <b>1 Deal</b> deines Operator Rank oder niedriger. Nur <b>1 Fixer-Deal pro Transaktion</b>.
    </div>
    <div class="role-card" style="cursor:default; border-color: var(--role-accent);">
      <div class="role-card-name">Dein aktueller Haggle-Effekt</div>
      <div class="role-card-desc">${info.haggle}</div>
    </div>
    <button class="role-dice-btn" id="open-haggle" style="margin-top:14px;">💰 Haggle Roll starten</button>
  </div>`));

  view.querySelector('#open-haggle').addEventListener('click', () => openHaggleFlow(character, rank, info));
}

function openHaggleFlow(character, rank, info) {
  const stats = character.stats || {};
  const html = `
    <h3>Haggle vs Target</h3>
    <div class="role-card-desc">Roll: COOL + Trading + Operator + 1d10</div>
    <label>Item / Deal Subject</label>
    <input id="hg-item" placeholder="z.B. Militech Crusher">
    <label>Standardpreis (€$)</label>
    <input type="number" id="hg-price" value="500">
    <label>Dein COOL</label><input type="number" id="hg-cool" value="${stats.COOL ?? 6}">
    <label>Dein Trading Skill</label><input type="number" id="hg-trade" value="6">
    <label>Dein Operator Rank</label><input type="number" id="hg-op" value="${rank}">
    <hr style="border:0; border-top:1px solid var(--role-line); margin:12px 0;">
    <label>Target's COOL + Trading + (Operator wenn Fixer)</label>
    <input type="number" id="hg-tgt" value="10">
    <div class="role-modal-actions">
      <button data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="roll">Roll Haggle</button>
    </div>
    <div id="hg-out" style="margin-top:12px;"></div>`;
  openModal(html, (modal, close) => {
    modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
    modal.querySelector('[data-act="roll"]').addEventListener('click', async () => {
      const cool = +modal.querySelector('#hg-cool').value || 0;
      const trade = +modal.querySelector('#hg-trade').value || 0;
      const op = +modal.querySelector('#hg-op').value || 0;
      const tgtBase = +modal.querySelector('#hg-tgt').value || 0;

      // Mein Roll
      const myRoll = performCheck({ stat: cool, skill: trade + op, mod: 0, dv: null });
      // Target Roll (1d10 + base)
      const tgtD = 1 + Math.floor(Math.random() * 10);
      let tgtFinal = tgtD;
      if (tgtD === 10) tgtFinal += 1 + Math.floor(Math.random() * 10);
      else if (tgtD === 1) tgtFinal -= 1 + Math.floor(Math.random() * 10);
      const tgtTotal = tgtFinal + tgtBase;
      const success = myRoll.total > tgtTotal;

      modal.querySelector('#hg-out').innerHTML = `
        <div class="role-dice-result ${success ? 'success' : 'fail'}">
          <span class="role-die">${myRoll.base}</span>
          <span class="dice-total">${myRoll.total}</span>
          <span style="margin: 0 8px; color: var(--role-muted);">vs</span>
          <span class="role-die">${tgtD}</span>
          <span class="dice-total">${tgtTotal}</span>
          <span class="dice-verdict ${success ? 'success' : 'fail'}">${success ? 'Deal!' : 'Failed'}</span>
          <div class="dice-formula">
            DU: 1d10[${myRoll.base}] + COOL[${cool}] + Trading[${trade}] + Operator[${op}] = ${myRoll.total}<br>
            TGT: 1d10[${tgtD}] + Base[${tgtBase}] = ${tgtTotal}
          </div>
          <div class="dice-formula" style="margin-top:6px; color: var(--role-accent);">
            ${success ? `Bei Erfolg: ${info.haggle}` : 'Kein Deal — voller Preis oder DM-Komplikation'}
          </div>
        </div>
      `;
      await logAction(character.id, 'fixer', `Haggle: ${modal.querySelector('#hg-item').value || 'Item'}`, {
        roll: { d10: myRoll.base, total: myRoll.total, dv: tgtTotal, success },
        summary: success ? `✓ Deal — ${info.haggle}` : `✕ Failed (${myRoll.total} vs ${tgtTotal})`,
        meta: { item: modal.querySelector('#hg-item').value, base_price: +modal.querySelector('#hg-price').value }
      });
    });
  });
}

// ============================================================
// REACH — was kann gefunden werden
// ============================================================
function renderReach(view, character) {
  view.innerHTML = '';
  const rank = character.role_rank || 4;
  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Reach Levels — Was du beschaffen kannst</div>
    <div class="role-card-desc" style="margin-bottom:10px;">Dein Rank: <b>${rank}</b>. Markiert: dein aktueller Reach.</div>
  </div>`));

  OPERATOR_RANKS.forEach(r => {
    const [min, max] = r.rank.includes('-') ? r.rank.split('-').map(Number) : [Number(r.rank), Number(r.rank)];
    const isActive = rank >= min && rank <= max;
    view.appendChild(el(`
      <div class="role-section" style="margin-top:10px; ${isActive ? 'border-color: var(--role-accent);' : ''}">
        <div class="role-section-title">
          Rank ${r.rank}
          ${isActive ? '<span class="role-pill" style="margin-left:8px;">DU</span>' : ''}
        </div>
        <div style="font-size:12px; line-height:1.7;">
          <b>Contacts:</b> ${r.contacts}<br>
          <b>Reach:</b> ${r.reach}<br>
          <b>Haggle:</b> ${r.haggle}
        </div>
      </div>
    `));
  });
}

// ============================================================
// GREASE — Sprachen/Kulturen
// ============================================================
function renderGrease(view, character) {
  view.innerHTML = '';
  const rank = character.role_rank || 4;
  const info = getOperatorRankInfo(rank);

  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Grease — Rank ${rank}</div>
    <div class="role-card-desc">
      Grease = Fähigkeit, in verschiedenen Kulturen perfect zu blenden.
      Sprachen, Codes, Status-Marks.
    </div>
    <div class="role-card" style="cursor:default; margin-top:10px; border-color: var(--role-accent);">
      <div class="role-card-name">Aktuell freigeschaltet</div>
      <div class="role-card-desc">${info.grease}</div>
    </div>
  </div>`));

  view.appendChild(el(`<div class="role-section" style="margin-top:14px;">
    <div class="role-section-title">Grease-Progression</div>
    <table style="width:100%; font-size:12px; border-collapse:collapse;">
      <thead><tr style="color:var(--role-muted); text-align:left;"><th>Rank</th><th>Grease</th></tr></thead>
      <tbody>
        ${OPERATOR_RANKS.map(r => `<tr><td><b>${r.rank}</b></td><td>${r.grease}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>`));
}

// ============================================================
// CONTACTS
// ============================================================
async function renderContacts(view, character) {
  view.innerHTML = '';
  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Kontakte / Connections</div>
    <div id="cn-list" class="role-inv"></div>
    <button class="role-dice-btn" id="add-cn" style="margin-top:10px;">＋ Kontakt</button>
  </div>`));

  const list = view.querySelector('#cn-list');
  const items = await getInventory(character.id, 'contact');
  if (!items.length) {
    list.innerHTML = `<div class="role-empty">Keine Kontakte gespeichert.</div>`;
  } else {
    items.forEach(item => {
      list.appendChild(buildInventoryItem({
        item,
        onDelete: async () => { await deleteInventoryItem(item.id); renderContacts(view, character); }
      }));
    });
  }

  view.querySelector('#add-cn').addEventListener('click', () => {
    const html = `
      <h3>Kontakt hinzufügen</h3>
      <label>Name</label><input id="cn-name">
      <label>Rolle / Branche</label><input id="cn-role">
      <label>Notiz (Was er kann, Schulden, Connections)</label><textarea id="cn-desc"></textarea>
      <div class="role-modal-actions">
        <button data-act="cancel">Abbrechen</button>
        <button class="primary" data-act="save">Speichern</button>
      </div>`;
    openModal(html, (modal, close) => {
      modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
      modal.querySelector('[data-act="save"]').addEventListener('click', async () => {
        const name = modal.querySelector('#cn-name').value.trim();
        if (!name) return;
        await addInventoryItem(character.id, {
          category: 'contact', name,
          description: `${modal.querySelector('#cn-role').value} · ${modal.querySelector('#cn-desc').value}`,
          charges: 1, max_charges: 1
        });
        close();
        renderContacts(view, character);
      });
    });
  });
}
