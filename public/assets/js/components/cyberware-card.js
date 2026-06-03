// <cyberware-card>  .data = { name, slot, humanity_loss, install, price, notes, illegal }
import { CardElement, escapeHTML } from './cyber-element.js';

class CyberwareCard extends CardElement {
  template(d) {
    const illegal = !!d.illegal;
    this.className = `card${illegal ? ' card--red' : ''}`;
    const rows = [
      d.slot          != null ? ['Slot', d.slot] : null,
      d.humanity_loss != null ? ['Humanity Loss', d.humanity_loss] : null,
      d.install       != null ? ['Install', d.install] : null,
    ].filter(Boolean);

    return `
      <div class="card__head">
        <div>
          <div class="card__title">${escapeHTML(d.name ?? 'Cyberware')}</div>
          <div class="card__sub">Cyberware</div>
        </div>
        ${d.price != null ? `<span class="card__price">${escapeHTML(d.price)}€</span>` : ''}
      </div>
      <div class="card__chips">
        ${illegal ? `<status-chip variant="red">ILLEGAL</status-chip>` : ''}
        ${d.slot ? `<status-chip>${escapeHTML(String(d.slot).toUpperCase())}</status-chip>` : ''}
      </div>
      ${rows.length ? `<div class="card__rows">${rows.map(([k, v]) =>
        `<div class="card__row"><span class="k">${escapeHTML(k)}</span><span class="v">${escapeHTML(v)}</span></div>`).join('')}</div>` : ''}
      ${d.notes ? `<div class="card__sub">${escapeHTML(d.notes)}</div>` : ''}`;
  }
}

customElements.define('cyberware-card', CyberwareCard);
