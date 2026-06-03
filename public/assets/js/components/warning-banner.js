// <warning-banner level="locked|combat|critical">COMBAT ACTIVE</warning-banner>
// Banner für kritische Zustände. Bei level="critical" einmalig glitch().
import { CyberElement } from './cyber-element.js';
import { glitch } from '../cyber-fx.js';

const ICON = { locked: '⊘', combat: '⚔', critical: '⚠' };
const DEFAULT_LABEL = { locked: 'LOCKED', combat: 'COMBAT ACTIVE', critical: 'CRITICAL INJURY' };

class WarningBanner extends CyberElement {
  static get observedAttributes() { return ['level']; }

  connectedCallback() {
    if (this._label === undefined) this._label = this.textContent.trim();
    super.connectedCallback();
  }

  render() {
    const level = this.attr('level', 'locked');
    const label = this._label || DEFAULT_LABEL[level] || '';

    this.classList.add('warning-banner');
    this.classList.toggle('warning-banner--locked',   level === 'locked');
    this.classList.toggle('warning-banner--combat',   level === 'combat');
    this.classList.toggle('warning-banner--critical', level === 'critical');
    this.setAttribute('role', 'alert');

    this.innerHTML =
      `<span class="warning-banner__icon" aria-hidden="true">${ICON[level] || '⚠'}</span>` +
      `<span class="warning-banner__label">${label}</span>`;

    if (level === 'critical') glitch(this);
  }
}

customElements.define('warning-banner', WarningBanner);
