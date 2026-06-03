// <location-card>  .data = { name, zone, type, danger, vendors, notes }
import { CardElement, escapeHTML } from './cyber-element.js';

class LocationCard extends CardElement {
  template(d) {
    const danger = String(d.danger || '').toLowerCase();
    const isHot = danger === 'high' || danger === 'extreme';
    this.className = `card${isHot ? ' card--red' : ''}`;
    const rows = [
      d.type    != null ? ['Type', d.type] : null,
      d.vendors != null ? ['Vendors', d.vendors] : null,
    ].filter(Boolean);

    return `
      <div class="card__head">
        <div>
          <div class="card__title">${escapeHTML(d.name ?? 'Location')}</div>
          ${d.zone ? `<div class="card__sub">${escapeHTML(d.zone)}</div>` : ''}
        </div>
        ${d.danger ? `<status-chip variant="${isHot ? 'red' : 'warn'}">${escapeHTML(String(d.danger).toUpperCase())}</status-chip>` : ''}
      </div>
      ${rows.length ? `<div class="card__rows">${rows.map(([k, v]) =>
        `<div class="card__row"><span class="k">${escapeHTML(k)}</span><span class="v">${escapeHTML(v)}</span></div>`).join('')}</div>` : ''}
      ${d.notes ? `<div class="card__sub">${escapeHTML(d.notes)}</div>` : ''}`;
  }
}

customElements.define('location-card', LocationCard);
