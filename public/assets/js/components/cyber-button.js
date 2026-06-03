// <cyber-button variant="red" disabled active>Label</cyber-button>
// Rendert einen inneren <button class="cyber-button …"> für Form-/A11y-Semantik.
// Klicks bubblen natürlich aus dem inneren Button.
import { CyberElement } from './cyber-element.js';

class CyberButton extends CyberElement {
  static get observedAttributes() { return ['variant', 'disabled', 'active']; }

  connectedCallback() {
    if (this._label === undefined) this._label = this.innerHTML;
    super.connectedCallback();
  }

  render() {
    const variant  = this.attr('variant');
    const disabled = this.bool('disabled');
    const active   = this.bool('active');
    const cls = ['cyber-button'];
    if (variant === 'red') cls.push('cyber-button--red');
    if (active) cls.push('is-active');

    this.innerHTML =
      `<button type="button" class="${cls.join(' ')}"${disabled ? ' disabled' : ''}>${this._label || ''}</button>`;
  }
}

customElements.define('cyber-button', CyberButton);
