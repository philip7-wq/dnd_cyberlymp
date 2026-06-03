// <cyber-panel variant="cyan|red|ghost|neutral" title="…">
// Abgeschrägter HUD-Container. Host = .cyber-panel (Border via Pseudo-Layer).
// Light-DOM-„Slot": vorhandener Inhalt wandert in einen Body-Wrapper.
import { CyberElement, escapeHTML } from './cyber-element.js';
import { bootFlicker } from '../cyber-fx.js';

class CyberPanel extends CyberElement {
  static get observedAttributes() { return ['variant', 'title']; }

  connectedCallback() {
    // Original-Inhalt einmalig sichern (vor erstem render).
    if (this._bodyHTML === undefined) this._bodyHTML = this.innerHTML;
    super.connectedCallback();
    bootFlicker(this);
  }

  render() {
    const variant = this.attr('variant', 'neutral');
    const title   = this.attr('title');

    this.classList.add('cyber-panel');
    this.classList.toggle('cyber-panel--cyan',  variant === 'cyan');
    this.classList.toggle('cyber-panel--red',   variant === 'red');
    this.classList.toggle('cyber-panel--ghost', variant === 'ghost');

    const head = title
      ? `<div class="cyber-panel__title">${escapeHTML(title)}</div>` : '';
    this.innerHTML = `${head}<div class="cyber-panel__body">${this._bodyHTML || ''}</div>`;
  }
}

customElements.define('cyber-panel', CyberPanel);
