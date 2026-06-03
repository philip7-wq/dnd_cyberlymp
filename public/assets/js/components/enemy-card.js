// <enemy-card>  .data = { name, type, threat, current_hp, max_hp, headSP, bodySP, tags[] }
// Gegner/NPC-Datei — Rot-Look (Combat).
import { CardElement, escapeHTML } from './cyber-element.js';

class EnemyCard extends CardElement {
  template(d) {
    this.className = 'card card--red';
    const tags = Array.isArray(d.tags) ? d.tags : [];
    return `
      <div class="card__head">
        <div>
          <div class="card__title">${escapeHTML(d.name ?? 'Hostile')}</div>
          ${d.type ? `<div class="card__sub">${escapeHTML(d.type)}</div>` : ''}
        </div>
        ${d.threat ? `<status-chip variant="red">${escapeHTML(String(d.threat).toUpperCase())}</status-chip>` : ''}
      </div>
      ${tags.length ? `<div class="card__chips">${tags.map(t =>
        `<status-chip variant="red">${escapeHTML(t)}</status-chip>`).join('')}</div>` : ''}
      <div class="card__rows">
        <div class="card__row"><span class="k">HP</span>
          <health-bar value="${num(d.current_hp)}" max="${num(d.max_hp, 1)}" show-numbers style="flex:1;margin-left:var(--sp-3)"></health-bar></div>
        ${(d.headSP != null || d.bodySP != null) ? `<div class="card__row">
          <span class="k">SP</span><span class="v">Head ${num(d.headSP)} · Body ${num(d.bodySP)}</span></div>` : ''}
      </div>`;
  }
}

function num(v, fb = 0) { const n = Number(v); return Number.isFinite(n) ? n : fb; }

customElements.define('enemy-card', EnemyCard);
