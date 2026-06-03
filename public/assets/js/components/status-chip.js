// <status-chip variant="red|ok|warn">RANGED</status-chip>
// Label/Tag im HUD-Look. Host = .status-chip (Border via Pseudo-Layer).
import { CyberElement } from './cyber-element.js';

class StatusChip extends CyberElement {
  static get observedAttributes() { return ['variant']; }

  render() {
    const variant = this.attr('variant');
    this.classList.add('status-chip');
    this.classList.toggle('status-chip--red',  variant === 'red');
    this.classList.toggle('status-chip--ok',   variant === 'ok');
    this.classList.toggle('status-chip--warn', variant === 'warn');
    // Inhalt (Label) bleibt unangetastet — reines Styling-Element.
  }
}

customElements.define('status-chip', StatusChip);
