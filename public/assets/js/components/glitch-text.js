// <glitch-text>SYSTEM FAILURE</glitch-text>
// Text-Wrapper, der die glitch()-FX aus cyber-fx nutzt. Nur für seltene
// kritische Zustände. Auslösen: Methode .triggerGlitch() oder Attribut auto.
import { CyberElement } from './cyber-element.js';
import { glitch } from '../cyber-fx.js';

class GlitchText extends CyberElement {
  static get observedAttributes() { return ['auto']; }

  connectedCallback() {
    this.classList.add('glitch-text');
    super.connectedCallback();
    if (this.bool('auto')) this.triggerGlitch();
  }

  render() { /* Inhalt bleibt; reines FX-Element */ }

  /** Einmalige Glitch-Animation (No-Op bei prefers-reduced-motion). */
  triggerGlitch() { glitch(this); }
}

customElements.define('glitch-text', GlitchText);
