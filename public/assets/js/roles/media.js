// ============================================================
// MEDIA — Credibility (Cyberpunk RED, pg. 151-153)
// Passive Rumors 2× pro Woche (Credibility + 1d10 vs DV).
// Believability = % chance audience buys story (skaliert mit Rank).
// ============================================================

import {
  buildHeader, buildActionCard, buildInventoryItem, buildSubtabs,
  buildLog, openModal, performAbilityCheck, renderRollResult,
  getInventory, addInventoryItem, deleteInventoryItem,
  logAction, el
} from './roles-core.js';

// Rumor-Tabelle (Playbook pg. 151)
const RUMOR_TIERS = [
  { name: 'Vague Rumor',        passive: 7,  active: 13,
    desc: 'Hazy. Minimum-Info, um anzufangen zu suchen.' },
  { name: 'Typical Rumor',      passive: 9,  active: 15,
    desc: 'Reicht aus, um zu wissen wo es weitergeht.' },
  { name: 'Substantial Rumor',  passive: 11, active: 17,
    desc: 'Konkrete Info (Namen, Orte, Zeiten).' },
  { name: 'Detailed Rumor',     passive: 13, active: 21,
    desc: 'Verifizierbare Evidenz, die in eine Story einfließen kann.' },
];

// Credibility Rank Effects (Playbook pg. 152-153)
const CREDIBILITY_RANKS = [
  { rank: '1-2',  access: 'Local honcho, gang lord',           audience: 'Immediate neighborhood',           believ: '2/10', impact: 'Small, incremental. Small-time bad guys ändern sich vielleicht.' },
  { rank: '3-4',  access: 'City gang honcho, minor politico',  audience: 'Local screamsheet / Data Pool',    believ: '3/10', impact: 'Direct effect — Verhaftungen, Machtverlust für Kleinkriminelle.' },
  { rank: '5-6',  access: 'Major City player, City politico',  audience: 'Citywide',                         believ: '4/10', impact: 'Higher-level bad guys jailed. Local laws may pass.' },
  { rank: '7-8',  access: 'Local Corp president, mayor',       audience: 'Statewide',                        believ: '5/10', impact: 'Cross-City. Mid-level Corps/Govs toppled.' },
  { rank: '9',    access: 'Divisional Corp head, State pol.',  audience: 'National',                         believ: '6/10', impact: 'Whole nation. Large Corps / local govs fallen.' },
  { rank: '10',   access: 'World leader, Megacorp head',       audience: 'Worldwide',                        believ: '7/10', impact: 'Megacorps fall. International laws established.' },
];

function getCredibilityForRank(rank) {
  if (rank <= 2)  return CREDIBILITY_RANKS[0];
  if (rank <= 4)  return CREDIBILITY_RANKS[1];
  if (rank <= 6)  return CREDIBILITY_RANKS[2];
  if (rank <= 8)  return CREDIBILITY_RANKS[3];
  if (rank == 9)  return CREDIBILITY_RANKS[4];
  return CREDIBILITY_RANKS[5];
}

export async function mount(panel, character) {
  panel.innerHTML = '';
  panel.appendChild(el(buildHeader('media', character)));

  const main = el(`<div></div>`);
  panel.appendChild(main);
  panel.appendChild(await buildLog(character.id));

  const subtabs = buildSubtabs([
    { key: 'cred',    label: '📰 Credibility' },
    { key: 'rumor',   label: '🔍 Rumors' },
    { key: 'pub',     label: '✍️ Publish' },
    { key: 'stories', label: '📚 Archiv' },
  ], (k) => render(k));
  main.appendChild(subtabs);

  const view = el(`<div></div>`);
  main.appendChild(view);

  async function render(key) {
    view.innerHTML = '';
    if (key === 'cred')    return renderCredibility(view, character);
    if (key === 'rumor')   return renderRumors(view, character);
    if (key === 'pub')     return renderPublish(view, character);
    if (key === 'stories') return renderStories(view, character);
  }
  render('cred');
}

// ============================================================
// CREDIBILITY OVERVIEW
// ============================================================
function renderCredibility(view, character) {
  const rank = character.role_rank || 4;
  const c = getCredibilityForRank(rank);

  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Dein Credibility Stand — Rank ${rank}</div>
    <table style="width:100%; font-size:12px; line-height:1.6;">
      <tr><td style="width:140px; color:var(--role-muted);">Access / Sources</td><td>${c.access}</td></tr>
      <tr><td style="color:var(--role-muted);">Audience</td><td>${c.audience}</td></tr>
      <tr><td style="color:var(--role-muted);">Believability</td><td><b style="color:var(--role-accent)">${c.believ}</b> Chance dass Audience glaubt</td></tr>
      <tr><td style="color:var(--role-muted);">Impact</td><td>${c.impact}</td></tr>
    </table>
    <div class="role-card-desc" style="margin-top:12px;">
      Bei Publish: +1 Believability für 1+ Hard Evidence, +2 für 4+ Hard Evidence (stacken).
    </div>
  </div>`));

  view.appendChild(el(`<div class="role-section" style="margin-top:14px;">
    <div class="role-section-title">Credibility Reference Tabelle</div>
    <table style="width:100%; font-size:11px; border-collapse:collapse;">
      <thead><tr style="color:var(--role-muted); text-align:left;"><th>Rank</th><th>Audience</th><th>Believ.</th></tr></thead>
      <tbody>
        ${CREDIBILITY_RANKS.map(c => `<tr><td>${c.rank}</td><td>${c.audience}</td><td>${c.believ}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>`));
}

// ============================================================
// RUMORS — Passive + Active
// ============================================================
function renderRumors(view, character) {
  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Rumors</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      <b>Passive:</b> 2× pro Woche rollt der DM heimlich Credibility + 1d10 vs Passive-DV. Du kriegst den höchsten gewonnenen Tier.<br>
      <b>Active:</b> Aktive Suche via STAT + Library Search / Conversation / Interrogation vs Active-DV.
    </div>
    <table style="width:100%; font-size:12px; border-collapse:collapse;">
      <thead><tr style="color:var(--role-muted); text-align:left;"><th>Tier</th><th>Passive DV</th><th>Active DV</th><th>Inhalt</th></tr></thead>
      <tbody>
        ${RUMOR_TIERS.map(r => `<tr><td><b>${r.name}</b></td><td>${r.passive}</td><td>${r.active}</td><td>${r.desc}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>`));

  view.appendChild(el(`<div class="role-section" style="margin-top:14px;">
    <div class="role-section-title">Active Rumor Hunt</div>
    <div class="role-card-desc" style="margin-bottom:10px;">Wähle einen Tier den du jagst:</div>
    <div class="role-cards" id="rumor-cards"></div>
  </div>`));
  const cards = view.querySelector('#rumor-cards');
  RUMOR_TIERS.forEach(r => {
    cards.appendChild(buildActionCard({
      name: r.name,
      meta: `Active DV ${r.active}`,
      desc: r.desc,
      onClick: () => openRumorFlow(character, r)
    }));
  });
}

function openRumorFlow(character, tier) {
  const html = `
    <h3>Active Hunt: ${tier.name}</h3>
    <div class="role-card-desc">${tier.desc}</div>
    <label>Stat (INT / EMP / COOL je nach Skill)</label><input type="number" id="ru-stat" value="6">
    <label>Skill (Library Search / Conversation / Interrogation / Streetwise)</label>
    <input type="number" id="ru-skill" value="5">
    <label>Modifier</label><input type="number" id="ru-mod" value="0">
    <div class="role-modal-actions">
      <button data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="roll">Suchen</button>
    </div>
    <div id="ru-out" style="margin-top:12px;"></div>`;
  openModal(html, (modal, close) => {
    modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
    modal.querySelector('[data-act="roll"]').addEventListener('click', async () => {
      // Standard Stat+Skill+1d10
      const { performCheck } = await import('./roles-core.js');
      const roll = performCheck({
        stat:  +modal.querySelector('#ru-stat').value || 0,
        skill: +modal.querySelector('#ru-skill').value || 0,
        mod:   +modal.querySelector('#ru-mod').value || 0,
        dv:    tier.active
      });
      modal.querySelector('#ru-out').innerHTML = renderRollResult(roll);
      await logAction(character.id, 'media', `Rumor-Hunt: ${tier.name}`, {
        roll, summary: roll.success ? `✓ Tier "${tier.name}" gefunden — DM teilt Inhalt mit` : '✕ Nichts gefunden'
      });
      setTimeout(close, 1800);
    });
  });
}

// ============================================================
// PUBLISH STORY — Believability Roll
// ============================================================
function renderPublish(view, character) {
  const rank = character.role_rank || 4;
  const c = getCredibilityForRank(rank);

  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Story veröffentlichen</div>
    <div class="role-card-desc" style="margin-bottom:10px;">
      <b>Believability Roll:</b> 1d10 — du musst <b>≤ ${c.believ.split('/')[0]}</b> rollen damit ein Individuum/Group dir glaubt.<br>
      Bonus: +1 wenn 1+ Hard Evidence enthalten, +2 wenn 4+ Hard Evidence (Bonus addiert sich auf den Threshold).
    </div>
    <button class="role-dice-btn" id="open-pub">＋ Neue Story veröffentlichen</button>
  </div>`));

  view.querySelector('#open-pub').addEventListener('click', () => openPublishFlow(character, view, c));
}

function openPublishFlow(character, view, cred) {
  const baseBeliev = parseInt(cred.believ.split('/')[0], 10);
  const html = `
    <h3>Story veröffentlichen</h3>
    <label>Titel</label><input id="pb-title">
    <label>Subject / Target</label><input id="pb-subj">
    <label>Story Body (Notizen / Beweise)</label><textarea id="pb-body"></textarea>
    <label>Hard Evidence Pieces (für Believability-Bonus)</label>
    <select id="pb-ev">
      <option value="0">0 — kein Bonus</option>
      <option value="1">1-3 — +1 Threshold</option>
      <option value="2">4+ — +2 Threshold</option>
    </select>
    <div class="role-card-desc">
      Audience-Threshold: <b>${baseBeliev}/10</b> + Evidence-Bonus
    </div>
    <div class="role-modal-actions">
      <button data-act="cancel">Abbrechen</button>
      <button class="primary" data-act="pub">Publish + Roll Believability</button>
    </div>
    <div id="pb-out" style="margin-top:12px;"></div>`;
  openModal(html, (modal, close) => {
    modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
    modal.querySelector('[data-act="pub"]').addEventListener('click', async () => {
      const title = modal.querySelector('#pb-title').value.trim() || 'Untitled Story';
      const subj  = modal.querySelector('#pb-subj').value.trim();
      const body  = modal.querySelector('#pb-body').value.trim();
      const bonus = +modal.querySelector('#pb-ev').value;
      const threshold = baseBeliev + bonus;
      const d10 = 1 + Math.floor(Math.random() * 10);
      const believed = d10 <= threshold;

      modal.querySelector('#pb-out').innerHTML = `
        <div class="role-dice-result ${believed ? 'success' : 'fail'}">
          <span class="role-die ${believed ? '' : 'fumble'}">${d10}</span>
          <span class="dice-total">≤ ${threshold}?</span>
          <span class="dice-verdict ${believed ? 'success' : 'fail'}">${believed ? 'Geglaubt' : 'Skeptisch'}</span>
          <div class="dice-formula">d10[${d10}] vs Believability-Threshold ${threshold} (Base ${baseBeliev} + Evidence ${bonus})</div>
        </div>
      `;

      await addInventoryItem(character.id, {
        category: 'story', name: title,
        description: `Subject: ${subj}\n\n${body}\n\nEvidence: ${bonus === 0 ? 'none' : bonus === 1 ? '1-3 hard' : '4+ hard'}`,
        charges: 1, max_charges: 1,
        meta: { d10, threshold, believed, published_at: new Date().toISOString(), subject: subj }
      });
      await logAction(character.id, 'media', `Published: ${title}`, {
        roll: { d10, total: d10, dv: threshold, success: believed },
        summary: believed ? `Audience glaubt (1d10[${d10}] ≤ ${threshold})` : `Audience skeptisch (1d10[${d10}] > ${threshold})`
      });
      setTimeout(close, 2400);
    });
  });
}

async function renderStories(view, character) {
  view.appendChild(el(`<div class="role-section">
    <div class="role-section-title">Veröffentlichte Stories</div>
    <div id="story-list" class="role-inv"></div>
  </div>`));
  const list = view.querySelector('#story-list');
  const items = await getInventory(character.id, 'story');
  if (!items.length) {
    list.innerHTML = `<div class="role-empty">Noch nichts veröffentlicht.</div>`;
    return;
  }
  items.forEach(item => {
    list.appendChild(buildInventoryItem({
      item,
      onDelete: async () => { await deleteInventoryItem(item.id); renderStories(view, character); }
    }));
  });
}
