// <hud-divider></hud-divider> — leuchtende Segment-Trennlinie.
import { CyberElement } from './cyber-element.js';

class HudDivider extends CyberElement {
  render() {
    this.setAttribute('role', 'separator');
    this.innerHTML = `<hr class="hud-divider">`;
  }
}

customElements.define('hud-divider', HudDivider);
