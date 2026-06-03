// <combat-participant-card>  .data = { name, initiative, current_hp, max_hp,
//   side ("pc"|"enemy"), active, conditions[] }
// Combat Tracker. PC = cyan, Enemy = rot. active → Glow-Pulse.
import { CardElement, escapeHTML } from './cyber-element.js';
import { glowPulse } from '../cyber-fx.js';

class CombatParticipantCard extends CardElement {
  template(d) {
    const isEnemy = d.side === 'enemy';
    this.className = `card${isEnemy ? ' card--red' : ''}`;
    const conditions = Array.isArray(d.conditions) ? d.conditions : [];

    queueMicrotask(() => glowPulse(this, !!d.active));

    return `
      <div class="card__head">
        <div>
          <div class="card__title">${escapeHTML(d.name ?? 'Combatant')}</div>
          <div class="card__sub">${isEnemy ? 'Hostile' : 'PC'}${d.active ? ' · ACTIVE TURN' : ''}</div>
        </div>
        <stat-block label="INIT" value="${escapeHTML(d.initiative ?? '—')}"></stat-block>
      </div>
      ${conditions.length ? `<div class="card__chips">${conditions.map(c =>
        `<status-chip variant="warn">${escapeHTML(c)}</status-chip>`).join('')}</div>` : ''}
      <div class="card__rows">
        <div class="card__row"><span class="k">HP</span>
          <health-bar value="${num(d.current_hp)}" max="${num(d.max_hp, 1)}" show-numbers style="flex:1;margin-left:var(--sp-3)"></health-bar></div>
      </div>`;
  }
}

function num(v, fb = 0) { const n = Number(v); return Number.isFinite(n) ? n : fb; }

customElements.define('combat-participant-card', CombatParticipantCard);
