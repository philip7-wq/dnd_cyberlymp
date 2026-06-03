// ============================================================
// CyberElement — schlanke Basisklasse für die Komponenten-Bibliothek
// Phase 1. Light DOM (kein Shadow DOM). Nutzt Tokens/Klassen aus
// cyberpunk-ui.css direkt. KEINE Geschäftslogik.
//
// Subklassen definieren:
//   static get observedAttributes() { return ['foo', 'bar']; }
//   render() { this.innerHTML = ...; }   // oder DOM-Aufbau
// ============================================================

export class CyberElement extends HTMLElement {
  constructor() {
    super();
    this._rafPending = false;
    this._connected  = false;
  }

  connectedCallback() {
    this._connected = true;
    this.render();
  }

  attributeChangedCallback(_name, oldVal, newVal) {
    if (oldVal === newVal) return;
    this._scheduleRender();
  }

  // Gedrosselter Re-Render: mehrere Attribut-Änderungen in einem Frame bündeln.
  _scheduleRender() {
    if (!this._connected || this._rafPending) return;
    this._rafPending = true;
    requestAnimationFrame(() => {
      this._rafPending = false;
      if (this._connected) this.render();
    });
  }

  disconnectedCallback() {
    this._connected = false;
  }

  // ── Attribut-Helfer ────────────────────────────────────────
  /** String-Attribut mit Fallback. */
  attr(name, fallback = '') {
    return this.hasAttribute(name) ? this.getAttribute(name) : fallback;
  }

  /** Boolean-Attribut (Präsenz zählt; "false" gilt als false). */
  bool(name) {
    if (!this.hasAttribute(name)) return false;
    return this.getAttribute(name) !== 'false';
  }

  /** Numerisches Attribut mit Fallback. */
  num(name, fallback = 0) {
    const v = parseFloat(this.getAttribute(name));
    return Number.isFinite(v) ? v : fallback;
  }

  // Render-Platzhalter — von Subklasse überschrieben.
  render() {}
}

/** HTML-escape für Text, der in Templates interpoliert wird. */
export function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ============================================================
// CardElement — Basis für data-getriebene Karten.
// Komplexe Daten via .data-Property (Objekt) → re-rendert.
// Subklassen implementieren template(data) → HTML-String.
// ============================================================
export class CardElement extends CyberElement {
  constructor() { super(); this._data = {}; }

  get data() { return this._data; }
  set data(obj) { this._data = obj || {}; if (this._connected) this.render(); }

  render() { this.innerHTML = this.template(this._data); }

  // Subklasse überschreibt.
  template(_data) { return ''; }
}
