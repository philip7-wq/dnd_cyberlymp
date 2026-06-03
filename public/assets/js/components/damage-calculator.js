// <damage-calculator></damage-calculator>
// UI um die BESTEHENDE Damage-Pipeline. Keine neue Spielregel.
// Bindung: computeDamageThrough(damage, sp, opts) aus ../combat-modifiers.js
//   opts = { weaponClass, aimedShot, crackedSkull }
//   → { through, spEff, ablate, spAfter }
import { CyberElement } from './cyber-element.js';
import { computeDamageThrough } from '../combat-modifiers.js';

const WEAPON_CLASSES = ['ranged', 'melee_weapon', 'martial_arts', 'brawling', 'choke_throw'];

class DamageCalculator extends CyberElement {
  render() {
    this.innerHTML = `
      <div class="cyber-panel cyber-panel--red">
        <div class="cyber-panel__title">Damage Calculator</div>
        <div class="tool">
          <div class="tool__grid">
            <label class="tool__field"><span class="label">Damage</span>
              <input class="cyber-input" type="number" min="0" value="13" data-damage></label>
            <label class="tool__field"><span class="label">Target SP</span>
              <input class="cyber-input" type="number" min="0" value="7" data-sp></label>
            <div class="tool__field"><span class="label">Weapon Class</span>
              <cyber-select data-class>
                ${WEAPON_CLASSES.map((c, i) => `<option value="${c}"${i === 0 ? ' selected' : ''}>${c}</option>`).join('')}
              </cyber-select></div>
            <div class="tool__field"><span class="label">Aimed Shot</span>
              <cyber-select data-aimed>
                <option value="" selected>—</option><option value="head">Head</option>
              </cyber-select></div>
          </div>
          <label class="tool__check"><input type="checkbox" data-cracked> Cracked Skull (Head x3)</label>
          <div class="calc-out" data-out></div>
        </div>
      </div>`;

    this._fields = {
      damage:  this.querySelector('[data-damage]'),
      sp:      this.querySelector('[data-sp]'),
      cls:     this.querySelector('[data-class]'),
      aimed:   this.querySelector('[data-aimed]'),
      cracked: this.querySelector('[data-cracked]'),
    };
    this._out = this.querySelector('[data-out]');

    Object.values(this._fields).forEach(el => {
      el.addEventListener('input', () => this._compute());
      el.addEventListener('change', () => this._compute());
    });
    this._compute();
  }

  _compute() {
    const damage = Number(this._fields.damage.value) || 0;
    const sp     = Number(this._fields.sp.value) || 0;
    const opts = {
      weaponClass:  this._fields.cls.value,
      aimedShot:    this._fields.aimed.value || null,
      crackedSkull: this._fields.cracked.checked,
    };
    const r = computeDamageThrough(damage, sp, opts);   // bestehende Logik
    this._out.innerHTML = [
      ['Through', r.through],
      ['Eff. SP', r.spEff],
      ['Ablate', r.ablate ? 'yes' : 'no'],
      ['SP After', r.spAfter],
    ].map(([k, v]) => `<stat-block label="${k}" value="${v}"></stat-block>`).join('');
  }
}

customElements.define('damage-calculator', DamageCalculator);
