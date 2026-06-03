// <segmented-bar value="7" max="10" variant="cyan" show-numbers></segmented-bar>
// Basis-Balken aus N Segmenten, anteilig gefüllt.
// Subklassen (health/armor/humanity) überschreiben variantForRatio().
import { CyberElement, escapeHTML } from './cyber-element.js';

export class SegmentedBar extends CyberElement {
  static get observedAttributes() { return ['value', 'max', 'variant', 'show-numbers', 'segments']; }

  // Farb-Variante anhand des Füllverhältnisses (0..1). Basis: fixe variant-Attr.
  variantForRatio(_ratio) { return this.attr('variant', 'cyan'); }

  render() {
    const value = this.num('value', 0);
    const max   = Math.max(1, this.num('max', 1));
    const segs  = Math.max(1, Math.round(this.num('segments', max)));
    const ratio = Math.max(0, Math.min(1, value / max));
    const variant = this.variantForRatio(ratio);
    const onCount = Math.round(ratio * segs);

    this.classList.add('segbar');
    this.classList.toggle('segbar--cyan',   variant === 'cyan');
    this.classList.toggle('segbar--red',    variant === 'red');
    this.classList.toggle('segbar--yellow', variant === 'yellow');
    this.classList.toggle('segbar--green',  variant === 'green');
    this.setAttribute('role', 'progressbar');
    this.setAttribute('aria-valuenow', String(value));
    this.setAttribute('aria-valuemax', String(max));

    const cells = Array.from({ length: segs },
      (_, i) => `<span class="segbar__seg${i < onCount ? ' is-on' : ''}"></span>`).join('');
    const nums = this.bool('show-numbers')
      ? `<span class="segbar__nums"><b>${escapeHTML(value)}</b> / ${escapeHTML(max)}</span>` : '';

    this.innerHTML = `<div class="segbar__track">${cells}</div>${nums}`;
  }
}

customElements.define('segmented-bar', SegmentedBar);
