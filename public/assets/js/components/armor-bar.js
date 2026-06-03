// <armor-bar value="7" max="11" show-numbers></armor-bar>
// SP-Balken: gelb bei beginnender Ablation, rot wenn stark abgetragen.
import { SegmentedBar } from './segmented-bar.js';

class ArmorBar extends SegmentedBar {
  variantForRatio(ratio) {
    if (ratio <= 0.3) return 'red';
    if (ratio < 1)    return 'yellow';   // unter Maximum = bereits abgetragen
    return 'cyan';
  }
}

customElements.define('armor-bar', ArmorBar);
