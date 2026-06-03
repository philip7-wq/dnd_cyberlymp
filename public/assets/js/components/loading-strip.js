// <loading-strip progress="60"></loading-strip>  → determinierter Balken
// <loading-strip></loading-strip>                → indeterminierter Scan
import { CyberElement } from './cyber-element.js';

class LoadingStrip extends CyberElement {
  static get observedAttributes() { return ['progress']; }

  render() {
    this.classList.add('loading-strip');
    const hasProgress = this.hasAttribute('progress');
    const pct = Math.max(0, Math.min(100, this.num('progress', 0)));

    this.setAttribute('role', 'progressbar');
    if (hasProgress) {
      this.setAttribute('aria-valuenow', String(pct));
      this.innerHTML = `<div class="loading-strip__fill" style="width:${pct}%"></div>`;
    } else {
      this.removeAttribute('aria-valuenow');
      this.innerHTML = `<div class="loading-strip__fill is-scan"></div>`;
    }
  }
}

customElements.define('loading-strip', LoadingStrip);
