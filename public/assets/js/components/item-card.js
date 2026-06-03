// <item-card>  .data = { name, category, subcategory, price, damage, rof, illegal, notes }
// Shop / Night Market. Cyan = legal, Rot = illegal.
import { CardElement, escapeHTML } from './cyber-element.js';

class ItemCard extends CardElement {
  template(d) {
    const illegal = !!d.illegal;
    const rows = [
      d.damage ? ['DMG', d.damage] : null,
      d.rof    ? ['ROF', d.rof] : null,
      d.subcategory ? ['Type', d.subcategory] : null,
    ].filter(Boolean);

    this.className = `card${illegal ? ' card--red' : ''}`;
    return `
      <div class="card__head">
        <div>
          <div class="card__title">${escapeHTML(d.name ?? 'Unknown Item')}</div>
          ${d.category ? `<div class="card__sub">${escapeHTML(d.category)}</div>` : ''}
        </div>
        ${d.price != null ? `<span class="card__price">${escapeHTML(d.price)}€</span>` : ''}
      </div>
      <div class="card__chips">
        ${illegal ? `<status-chip variant="red">ILLEGAL</status-chip>` : ''}
        ${d.subcategory ? `<status-chip>${escapeHTML(String(d.subcategory).toUpperCase())}</status-chip>` : ''}
      </div>
      ${rows.length ? `<div class="card__rows">${rows.map(([k, v]) =>
        `<div class="card__row"><span class="k">${k}</span><span class="v">${escapeHTML(v)}</span></div>`).join('')}</div>` : ''}
      ${d.notes ? `<div class="card__sub">${escapeHTML(d.notes)}</div>` : ''}`;
  }
}

customElements.define('item-card', ItemCard);
