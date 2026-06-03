// <humanity-bar value="40" max="60" show-numbers></humanity-bar>
// Humanity-Balken: grün/cyan bei stabil, rot bei sehr niedrig (Cyberpsychosis-Risiko).
import { SegmentedBar } from './segmented-bar.js';

class HumanityBar extends SegmentedBar {
  variantForRatio(ratio) {
    if (ratio <= 0.2)  return 'red';
    if (ratio <= 0.5)  return 'green';
    return 'cyan';
  }
}

customElements.define('humanity-bar', HumanityBar);
