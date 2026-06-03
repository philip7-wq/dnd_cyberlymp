// <stat-block label="REF" value="8"></stat-block>
// Stat-Anzeige (INT/REF/…) mit Cyan-Glow auf dem Wert.
import { CyberElement, escapeHTML } from './cyber-element.js';

class StatBlock extends CyberElement {
  static get observedAttributes() { return ['label', 'value']; }

  render() {
    this.classList.add('stat-block');
    this.innerHTML =
      `<span class="stat-block__label">${escapeHTML(this.attr('label'))}</span>` +
      `<span class="stat-block__value">${escapeHTML(this.attr('value'))}</span>`;
  }
}

customElements.define('stat-block', StatBlock);
