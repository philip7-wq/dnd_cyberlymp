// <cyber-select placeholder="Choose…">
//   <option value="ranged">Ranged</option> …
// </cyber-select>
//
// Vollwertiger Dropdown-Ersatz im HUD-Look — KEIN natives <select>.
// API spiegelt <select>:
//   .value (get/set), .options (get/set: [{value,label}]), 'change'-Event.
// Options-Quellen: <option>-Kinder, .options (JS) oder options-Attribut
//   ("a,b" oder "val:Label,val2:Label2").
// Keyboard: ↑↓ navigieren, Enter wählt, Esc schließt, Klick außerhalb schließt.
// ARIA: Trigger button + role=listbox/option, aria-expanded/-selected.
import { CyberElement, escapeHTML } from './cyber-element.js';

let UID = 0;

class CyberSelect extends CyberElement {
  static get observedAttributes() { return ['placeholder', 'options', 'value', 'disabled']; }

  constructor() {
    super();
    this._options = [];     // [{value, label}]
    this._value   = null;
    this._open    = false;
    this._active  = -1;     // hervorgehobener Index (Keyboard)
    this._uid     = `cyber-select-${++UID}`;
    this._onDocDown = this._onDocDown.bind(this);
  }

  connectedCallback() {
    // Options aus <option>-Kindern lesen (einmalig), bevor wir innerHTML ersetzen.
    if (!this._initialized) {
      const fromDom = [...this.querySelectorAll('option')].map(o => ({
        value: o.getAttribute('value') ?? o.textContent.trim(),
        label: o.textContent.trim(),
        selected: o.hasAttribute('selected'),
      }));
      if (fromDom.length) {
        this._options = fromDom.map(({ value, label }) => ({ value, label }));
        const sel = fromDom.find(o => o.selected);
        if (sel) this._value = sel.value;
      } else if (this.hasAttribute('options')) {
        this._options = parseOptionsAttr(this.getAttribute('options'));
      }
      if (this._value == null && this.hasAttribute('value')) this._value = this.getAttribute('value');
      // Native-<select>-Parität: ohne placeholder + ohne Vorauswahl → erste Option ist Default.
      if (this._value == null && !this.hasAttribute('placeholder') && this._options.length) {
        this._value = this._options[0].value;
      }
      this._initialized = true;
    }
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('pointerdown', this._onDocDown, true);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal || !this._initialized) return;
    if (name === 'value')   this._value = newVal;
    if (name === 'options') this._options = parseOptionsAttr(newVal);
    this._scheduleRender();
  }

  // ── Öffentliche API (spiegelt <select>) ───────────────────────
  get value() { return this._value; }
  set value(v) {
    this._value = v;
    this._syncTriggerLabel();
    this._syncOptionStates();
  }

  get options() { return this._options.slice(); }
  set options(list) {
    this._options = (list || []).map(normalizeOption);
    if (this._value != null && !this._options.some(o => o.value === this._value)) this._value = null;
    this.render();
  }

  get selectedOption() { return this._options.find(o => o.value === this._value) || null; }

  // ── Render ───────────────────────────────────────────────────
  render() {
    const placeholder = this.attr('placeholder', 'Select…');
    const disabled = this.bool('disabled');
    const sel = this.selectedOption;
    const triggerId = `${this._uid}-trigger`;
    const listId = `${this._uid}-list`;

    this.innerHTML = `
      <button type="button" class="cyber-select-trigger" id="${triggerId}"
              aria-haspopup="listbox" aria-expanded="${this._open}" aria-controls="${listId}"
              ${disabled ? 'disabled' : ''}>
        <span class="cyber-select-trigger__label${sel ? '' : ' is-placeholder'}">${escapeHTML(sel ? sel.label : placeholder)}</span>
        <span class="cyber-select-trigger__arrow" aria-hidden="true"></span>
      </button>
      <ul class="cyber-select-panel" id="${listId}" role="listbox" aria-labelledby="${triggerId}"${this._open ? '' : ' hidden'}>
        ${this._options.map((o, i) => `
          <li class="cyber-select-option${i === this._active ? ' is-active' : ''}" role="option"
              data-index="${i}" aria-selected="${o.value === this._value}">${escapeHTML(o.label)}</li>
        `).join('')}
      </ul>`;

    this.toggleAttribute('open', this._open);
    this._trigger = this.querySelector('.cyber-select-trigger');
    this._panel   = this.querySelector('.cyber-select-panel');
    this._wireEvents();
  }

  _wireEvents() {
    this._trigger.addEventListener('click', () => this._open ? this.close() : this.open());
    this._trigger.addEventListener('keydown', e => this._onTriggerKey(e));
    this._panel.addEventListener('click', e => {
      const li = e.target.closest('.cyber-select-option');
      if (li) this._choose(Number(li.dataset.index));
    });
    this._panel.addEventListener('mousemove', e => {
      const li = e.target.closest('.cyber-select-option');
      if (li) this._setActive(Number(li.dataset.index));
    });
  }

  // ── Open / Close ─────────────────────────────────────────────
  open() {
    if (this._open || this.bool('disabled') || !this._options.length) return;
    this._open = true;
    this._active = Math.max(0, this._options.findIndex(o => o.value === this._value));
    this.render();
    document.addEventListener('pointerdown', this._onDocDown, true);
    this._scrollActiveIntoView();
  }

  close() {
    if (!this._open) return;
    this._open = false;
    this.render();
    document.removeEventListener('pointerdown', this._onDocDown, true);
  }

  _onDocDown(e) { if (!this.contains(e.target)) this.close(); }

  // ── Tastatur ─────────────────────────────────────────────────
  _onTriggerKey(e) {
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); this._open ? this._move(1) : this.open(); break;
      case 'ArrowUp':   e.preventDefault(); this._open ? this._move(-1) : this.open(); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (this._open && this._active >= 0) this._choose(this._active);
        else this.open();
        break;
      case 'Escape': if (this._open) { e.preventDefault(); this.close(); } break;
      case 'Tab': if (this._open) this.close(); break;
      case 'Home': if (this._open) { e.preventDefault(); this._setActive(0); } break;
      case 'End':  if (this._open) { e.preventDefault(); this._setActive(this._options.length - 1); } break;
    }
  }

  _move(delta) {
    const n = this._options.length;
    if (!n) return;
    this._setActive((this._active + delta + n) % n);
  }

  _setActive(i) {
    this._active = i;
    this._panel?.querySelectorAll('.cyber-select-option').forEach((li, idx) =>
      li.classList.toggle('is-active', idx === i));
    this._scrollActiveIntoView();
  }

  _scrollActiveIntoView() {
    const li = this._panel?.querySelector(`.cyber-select-option[data-index="${this._active}"]`);
    li?.scrollIntoView({ block: 'nearest' });
  }

  _choose(i) {
    const opt = this._options[i];
    if (!opt) return;
    const changed = opt.value !== this._value;
    this._value = opt.value;
    this.close();
    this._trigger?.focus();
    if (changed) this.dispatchEvent(new CustomEvent('change', {
      bubbles: true, detail: { value: opt.value, label: opt.label },
    }));
  }

  // ── kleine Sync-Helfer (ohne Full-Render bei .value=) ─────────
  _syncTriggerLabel() {
    const label = this.querySelector('.cyber-select-trigger__label');
    if (!label) return;
    const sel = this.selectedOption;
    label.textContent = sel ? sel.label : this.attr('placeholder', 'Select…');
    label.classList.toggle('is-placeholder', !sel);
  }

  _syncOptionStates() {
    this.querySelectorAll('.cyber-select-option').forEach((li, i) =>
      li.setAttribute('aria-selected', String(this._options[i]?.value === this._value)));
  }
}

function normalizeOption(o) {
  if (o && typeof o === 'object') return { value: o.value, label: o.label ?? String(o.value) };
  return { value: o, label: String(o) };
}

function parseOptionsAttr(str) {
  return (str || '').split(',').map(s => s.trim()).filter(Boolean).map(part => {
    const idx = part.indexOf(':');
    return idx >= 0
      ? { value: part.slice(0, idx).trim(), label: part.slice(idx + 1).trim() }
      : { value: part, label: part };
  });
}

customElements.define('cyber-select', CyberSelect);
