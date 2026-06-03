// <health-bar value="12" max="40" show-numbers></health-bar>
// HP-Balken: cyan bei gesund → rot bei niedrig (MASTER §2: Combat/Gefahr = rot).
import { SegmentedBar } from './segmented-bar.js';

class HealthBar extends SegmentedBar {
  variantForRatio(ratio) {
    if (ratio <= 0.25) return 'red';
    if (ratio <= 0.5)  return 'yellow';
    return 'cyan';
  }
}

customElements.define('health-bar', HealthBar);
