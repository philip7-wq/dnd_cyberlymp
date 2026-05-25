// ============================================================
// ROCKERBOY — Charismatic Impact (Cyberpunk RED, pg. 144-145)
// Resolution: Charismatic Impact Rank + 1d10 (KEIN STAT, KEIN Skill)
// DVs: Single Fan DV8, Small Group ≤6 DV10, Huge Group DV12
// Convert Non-Fans → Fans: same DVs (außer "actively dislikes" — auto fail)
// Bei Fail: 1 Woche lang darfst du denselben Favor nicht nochmal fragen
// Effects skalieren mit Rank-Tier (1-2 / 3-4 / 5-6 / 7-8 / 9 / 10)
// ============================================================

import {
  buildHeader, buildActionCard, buildInventoryItem, buildSubtabs,
  buildLog, openModal, performAbilityCheck, renderRollResult,
  getInventory, addInventoryItem, deleteInventoryItem,
  logAction, el
} from './roles-core.js';

// Charismatic Impact Effects pro Rank-Tier (Playbook pg. 144-145)
const IMPACT_TIERS = [
  { rank: '1-2', venues: 'Small local clubs',
    single: 'Kleine Favors — Drink/Meal kaufen, Lift geben',
    small: 'Autogramme + persönliche Totems · Fans grüßen dich auf der Straße',
    huge: 'Du hast noch keine huge Groups, sorry.' },
  { rank: '3-4', venues: 'Well known clubs',
    single: 'Major Favor — Bett, gutes Wort einlegen',
    small: 'Group hängt regelmäßig mit dir · Booze/Drugs/Party-Favors',
    huge: 'Strong local following · Fans kaufen Records + Merch' },
  { rank: '5-6', venues: 'Large important clubs',
    single: 'Minor Crime — Shoplifting, in einem Kampf helfen',
    small: 'Personal Posse — hängt mit dir, macht Favors, sorgt für Bedürfnisse',
    huge: 'Fans City-wide + nahe Städte · Strong loyal, machen Major Favors für Attention' },
  { rank: '7-8', venues: 'Small concert halls, local video feed',
    single: 'Fan riskiert ohne Frage sein Leben für dich',
    small: 'Group commits Minor Crime — Shoplifting, im Kampf helfen',
    huge: 'Rabid Fans · fighten gegen rivalisierende Gangs · starke Fan-Info-Networks' },
  { rank: '9', venues: 'Large concert halls, national video feed',
    single: 'Major Crime — teures Item stehlen, jemanden zusammenschlagen',
    small: 'Group commits Major Crime',
    huge: 'Cult-like following · riot, destroy property, even kill für dich' },
  { rank: '10', venues: 'Huge stadiums or international video',
    single: 'Fan opfert sich für dich ohne Frage',
    small: 'Group risk lives für dich · personal protection',
    huge: 'Worldwide cult-following · private army based on Charisma' },
];

function getImpactTierForRank(rank) {
  if (rank <= 2)  return IMPACT_TIERS[0];
  if (rank <= 4)  return IMPACT_TIERS[1];
  if (rank <= 6)  return IMPACT_TIERS[2];
  if (rank <= 8)  return IMPACT_TIERS[3];
  if (rank == 9)  return IMPACT_TIERS[4];
  return IMPACT_TIERS[5];
}

const GROUP_SIZES = [
  { key: 'single', name: 'Single Fan',           dv: 8 },
  { key: 'small',  name: 'Small Group (≤6)',     dv: 10 },
  { key: 'huge',   name: 'Huge Group',           dv: 12 },
];

export async function mount(panel, character) {
  panel.innerHTML = '';
  panel.appendChild(el(buildHeader('rockerboy', character)));

  const main = el(`<div></div>`);
  panel.appendChild(main);
  panel.appendChild(await buildLog(character.id));

  const subtabs = buildSubtabs([
    { key: 'stage',  label: '🎤 Stage' },
    { key: 'tiers',  label: '📊 Impact Tiers' },
    { key: 'fans',   label: '⭐ Fans' },
    { key: 'songs',  label: '🎵 Setlist' },
  ], (k) => render(k));
  main.appendChild(subtabs);

  const view = el(`<div></div>`);
  main.appendChild(view);

  function render(key) {
    view.innerHTML = '';
    if (key === 'stage')  return renderStage(view, character);
    if (key === 'tiers')  return renderTiers(view, character);
    if (key === 'fans')   return renderFans(view, character);
    if (key === 'songs')  return renderSongs(view, character);
  }
  render('stage');
}

// ============================================================
// STAGE — Charismatic Impact Roll
// ============================================================
function renderStage(view, character) {
  view.innerHTML = '';
  const rank = character.role_rank || 4;
  const tier = getImpactTierForRank(rank);

  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Stage — Charismatic Impact</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      <b>Roll:</b> Charismatic Impact Rank + 1d10 vs DV.<br>
      <b>Wichtig:</b> KEIN STAT, KEIN Skill — nur Role Ability Rank.<br>
      <b>Bei Fail:</b> Same Favor kann 1 Woche lang nicht erneut gefragt werden (bei dieser Group).<br>
      <b>Venues du spielen kannst:</b> ${tier.venues}
    </div>
    <div class="role-cards" id="im-cards"></div>
  </div>`));

  const cards = view.querySelector('#im-cards');
  GROUP_SIZES.forEach(g => {
    const effect = tier[g.key];
    cards.appendChild(buildActionCard({
      name: g.name,
      meta: `DV ${g.dv} · Rank ${rank}`,
      desc: `<b>Möglich bei dir:</b> ${effect}`,
      onClick: () => openImpactFlow(character, g, rank, effect, 'use')
    }));
  });

  // Win Over Non-Fans
  view.appendChild(el(`<div class="role-section" style="margin-top:14px;">
    <div class="role-section-title">Win Over Non-Fans → Fans</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      Außerhalb Combat: Charismatic Impact + 1d10 vs gleicher DV (Single/Small/Huge). 
      Bei Erfolg werden sie Fans (außer sie mögen dich aktiv NICHT — dann auto-fail).
    </div>
    <div class="role-cards" id="win-cards"></div>
  </div>`));

  const win = view.querySelector('#win-cards');
  GROUP_SIZES.forEach(g => {
    win.appendChild(buildActionCard({
      name: `Convert: ${g.name}`,
      meta: `DV ${g.dv}`,
      desc: 'Macht Non-Fans zu Fans (bei Erfolg: kommt in dein Fan-Network).',
      onClick: () => openImpactFlow(character, g, rank, `Neue Fans gewonnen: ${g.name}`, 'convert')
    }));
  });
}

function openImpactFlow(character, group, rank, effectDesc, mode) {
  const isConvert = mode === 'convert';
  const html = `
    <h3>${isConvert ? 'Win Over' : 'Use Impact on'}: ${group.name}</h3>
    <div class="role-card-desc">${effectDesc}</div>
    <label>Audience / Wer / Wo?</label>
    <input id="im-aud" placeholder="z.B. 'Massen am Corpo Plaza'">
    <label>Charismatic Impact Rank</label>
    <input type="number" id="im-rank" value="${rank}">
    <label>Modifier (Akustik, Setting, Drugs…)</label>
    <input type="number" id="im-mod" value="0">
    <label>Performance Detail (Setlist / Speech / Move)</label>
    <textarea id="im-notes" placeholder="Was rockst/spielst/sagst du?"></textarea>
    <div class="role-modal-actions">
      <button data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="roll">Perform</button>
    </div>
    <div id="im-out" style="margin-top:12px;"></div>`;
  openModal(html, (modal, close) => {
    modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
    modal.querySelector('[data-act="roll"]').addEventListener('click', async () => {
      const aud = modal.querySelector('#im-aud').value.trim() || group.name;
      const notes = modal.querySelector('#im-notes').value.trim();
      const roll = performAbilityCheck({
        rank: +modal.querySelector('#im-rank').value || 0,
        mod:  +modal.querySelector('#im-mod').value || 0,
        dv:   group.dv,
        label: 'Charismatic Impact'
      });
      modal.querySelector('#im-out').innerHTML = renderRollResult(roll, {
        note: roll.success
          ? `✓ ${effectDesc}`
          : `✕ Crowd geht nicht mit · 1 Woche kein Retry derselben Favor`
      });

      if (roll.success && isConvert) {
        await addInventoryItem(character.id, {
          category: 'fan', name: aud,
          description: `${group.name} — gewonnen durch: ${notes || 'Performance'}`,
          charges: 1, max_charges: 1,
          meta: { group_size: group.key, won_at: new Date().toISOString() }
        });
      }
      await logAction(character.id, 'rockerboy', `${isConvert ? 'Won Over' : 'Impact'}: ${aud}`, {
        roll,
        summary: roll.success ? `✓ ${effectDesc}` : `✕ Lock-out 1 Woche`,
        meta: { notes, group: group.name, mode }
      });
      setTimeout(close, 2000);
    });
  });
}

// ============================================================
// IMPACT TIERS Reference
// ============================================================
function renderTiers(view, character) {
  view.innerHTML = '';
  const rank = character.role_rank || 4;

  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Impact pro Rank-Tier</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      Dein Rank: <b>${rank}</b>. Höhere Tiers freischalten = mehr/größere Favors möglich.
    </div>
  </div>`));

  IMPACT_TIERS.forEach(t => {
    const [min, max] = t.rank.includes('-') ? t.rank.split('-').map(Number) : [Number(t.rank), Number(t.rank)];
    const isActive = rank >= min && rank <= max;
    view.appendChild(el(`
      <div class="role-section" style="margin-top:10px; ${isActive ? 'border-color: var(--role-accent);' : ''}">
        <div class="role-section-title">
          Rank ${t.rank} — ${t.venues}
          ${isActive ? '<span class="role-pill" style="margin-left:8px;">DU</span>' : ''}
        </div>
        <table style="width:100%; font-size:11px; line-height:1.6;">
          <tr><td style="color:var(--role-muted); width:130px;">Single Fan (DV8)</td><td>${t.single}</td></tr>
          <tr><td style="color:var(--role-muted);">Small Group (DV10)</td><td>${t.small}</td></tr>
          <tr><td style="color:var(--role-muted);">Huge Group (DV12)</td><td>${t.huge}</td></tr>
        </table>
      </div>
    `));
  });
}

// ============================================================
// FANS
// ============================================================
async function renderFans(view, character) {
  view.innerHTML = '';
  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Fan Network</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      Via "Win Over" gewonnene Fans landen hier. Kannst sie wieder im Stage-Tab als Target für Impact-Würfe nehmen.
    </div>
    <div id="fan-list" class="role-inv"></div>
    <button class="role-dice-btn" id="add-fan" style="margin-top:10px;">＋ Fan manuell</button>
  </div>`));

  const list = view.querySelector('#fan-list');
  const items = await getInventory(character.id, 'fan');
  if (!items.length) {
    list.innerHTML = `<div class="role-empty">Noch keine Fans gewonnen.</div>`;
  } else {
    items.forEach(item => {
      list.appendChild(buildInventoryItem({
        item,
        onDelete: async () => { await deleteInventoryItem(item.id); renderFans(view, character); }
      }));
    });
  }

  view.querySelector('#add-fan').addEventListener('click', () => {
    const html = `
      <h3>Fan manuell hinzufügen</h3>
      <label>Name</label><input id="fn-name">
      <label>Group Size</label>
      <select id="fn-size">
        <option value="single">Single Fan</option>
        <option value="small">Small Group (≤6)</option>
        <option value="huge">Huge Group</option>
      </select>
      <label>Notiz</label><textarea id="fn-desc"></textarea>
      <div class="role-modal-actions">
        <button data-act="cancel">Abbrechen</button>
        <button class="primary" data-act="save">Speichern</button>
      </div>`;
    openModal(html, (modal, close) => {
      modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
      modal.querySelector('[data-act="save"]').addEventListener('click', async () => {
        const name = modal.querySelector('#fn-name').value.trim();
        if (!name) return;
        await addInventoryItem(character.id, {
          category: 'fan', name,
          description: modal.querySelector('#fn-desc').value,
          charges: 1, max_charges: 1,
          meta: { group_size: modal.querySelector('#fn-size').value }
        });
        close();
        renderFans(view, character);
      });
    });
  });
}

// ============================================================
// SETLIST — eigene Songs/Speeches/Performances
// ============================================================
async function renderSongs(view, character) {
  view.innerHTML = '';
  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Setlist / Performance History</div>
    <div class="role-card-desc">
      Tracking deiner Songs, Speeches, Performance-Konzepte. Reine Roleplay-Helper.
    </div>
    <div id="set-list" class="role-inv" style="margin-top:10px;"></div>
    <button class="role-dice-btn" id="add-set" style="margin-top:10px;">＋ Eintrag</button>
  </div>`));

  const list = view.querySelector('#set-list');
  const items = await getInventory(character.id, 'story');
  if (!items.length) {
    list.innerHTML = `<div class="role-empty">Setlist leer.</div>`;
  } else {
    items.forEach(item => {
      list.appendChild(buildInventoryItem({
        item,
        onDelete: async () => { await deleteInventoryItem(item.id); renderSongs(view, character); }
      }));
    });
  }

  view.querySelector('#add-set').addEventListener('click', () => {
    const html = `
      <h3>Song / Speech / Performance</h3>
      <label>Titel</label><input id="st-name">
      <label>Beschreibung / Lyrics / Notes</label><textarea id="st-desc"></textarea>
      <div class="role-modal-actions">
        <button data-act="cancel">Abbrechen</button>
        <button class="primary" data-act="save">Speichern</button>
      </div>`;
    openModal(html, (modal, close) => {
      modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
      modal.querySelector('[data-act="save"]').addEventListener('click', async () => {
        const name = modal.querySelector('#st-name').value.trim();
        if (!name) return;
        await addInventoryItem(character.id, {
          category: 'story', name,
          description: modal.querySelector('#st-desc').value,
          charges: 1, max_charges: 1
        });
        close();
        renderSongs(view, character);
      });
    });
  });
}
