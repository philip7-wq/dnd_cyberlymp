// <character-card>  .data = { name, handle, role, image_url,
//   current_hp, max_hp, current_humanity, max_humanity, conditions[] }
import { CardElement, escapeHTML } from './cyber-element.js';

class CharacterCard extends CardElement {
  template(d) {
    this.className = 'card';
    const portrait = d.image_url
      ? `<img class="card__portrait" src="${escapeHTML(d.image_url)}" alt="${escapeHTML(d.name ?? '')}">`
      : `<div class="card__portrait card__portrait--ph">${escapeHTML((d.name ?? '?').charAt(0))}</div>`;
    const conditions = Array.isArray(d.conditions) ? d.conditions : [];

    return `
      <div class="card__head">
        <div style="display:flex; gap:var(--sp-3); align-items:center">
          ${portrait}
          <div>
            <div class="card__title">${escapeHTML(d.handle ?? d.name ?? 'Unknown')}</div>
            <div class="card__sub">${escapeHTML([d.name, d.role].filter(Boolean).join(' · '))}</div>
          </div>
        </div>
      </div>
      ${conditions.length ? `<div class="card__chips">${conditions.map(c =>
        `<status-chip variant="warn">${escapeHTML(c)}</status-chip>`).join('')}</div>` : ''}
      <div class="card__rows">
        <div class="card__row"><span class="k">HP</span>
          <health-bar value="${num(d.current_hp)}" max="${num(d.max_hp, 1)}" show-numbers style="flex:1;margin-left:var(--sp-3)"></health-bar></div>
        ${d.max_humanity ? `<div class="card__row"><span class="k">Humanity</span>
          <humanity-bar value="${num(d.current_humanity)}" max="${num(d.max_humanity, 1)}" show-numbers style="flex:1;margin-left:var(--sp-3)"></humanity-bar></div>` : ''}
      </div>`;
  }
}

function num(v, fb = 0) { const n = Number(v); return Number.isFinite(n) ? n : fb; }

customElements.define('character-card', CharacterCard);
