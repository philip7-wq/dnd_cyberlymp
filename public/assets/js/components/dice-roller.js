// <dice-roller></dice-roller>
// UI um die BESTEHENDE Würfel-Logik. Keine eigene Würfel-Mathematik.
// Bindung: roll(expression, opts) aus ../dice.js
//   → { total, individualRolls, isCritSuccess, isCritFailure }
// Crit-Detection nur bei isSkillCheck (Toggle). Kein characterId → kein DB-Log.
import { CyberElement, escapeHTML } from './cyber-element.js';
import { roll } from '../dice.js';

const QUICK = ['1d6', '2d6', '1d10', '3d6'];

class DiceRoller extends CyberElement {
  connectedCallback() {
    super.connectedCallback();
  }

  render() {
    this.innerHTML = `
      <div class="cyber-panel cyber-panel--cyan">
        <div class="cyber-panel__title">Dice Roller</div>
        <div class="tool">
          <div class="tool__row">
            ${QUICK.map(q => `<button type="button" class="cyber-button" data-expr="${q}">${q}</button>`).join('')}
          </div>
          <div class="tool__row">
            <input class="cyber-input" type="text" placeholder="XdY+Z  z.B. 1d10+5" value="1d10+5" style="flex:1">
            <button type="button" class="cyber-button" data-roll-custom>Roll</button>
          </div>
          <label class="tool__check">
            <input type="checkbox" data-skillcheck checked> Skill Check (Crit auf erstem d10)
          </label>
          <div class="dice-result" data-result hidden></div>
        </div>
      </div>`;

    this._input  = this.querySelector('[type=text]');
    this._skill  = this.querySelector('[data-skillcheck]');
    this._result = this.querySelector('[data-result]');

    this.querySelectorAll('[data-expr]').forEach(btn =>
      btn.addEventListener('click', () => this._doRoll(btn.dataset.expr)));
    this.querySelector('[data-roll-custom]').addEventListener('click', () =>
      this._doRoll(this._input.value.trim()));
    this._input.addEventListener('keydown', e => {
      if (e.key === 'Enter') this._doRoll(this._input.value.trim());
    });
  }

  async _doRoll(expression) {
    if (!expression) return;
    const isSkillCheck = !!this._skill.checked;
    let res;
    try {
      res = await roll(expression, { isSkillCheck });   // kein characterId → kein DB-Log
    } catch (e) {
      this._result.hidden = false;
      this._result.innerHTML = `<span class="card__sub">Ungültiger Ausdruck: ${escapeHTML(expression)}</span>`;
      return;
    }
    this._renderResult(expression, res);
  }

  _renderResult(expression, res) {
    const { total, individualRolls, isCritSuccess, isCritFailure } = res;
    const totalCls = isCritSuccess ? ' is-crit-success' : isCritFailure ? ' is-crit-failure' : '';
    const dice = (individualRolls || []).map(r => {
      const cls = r.isCritBonus ? ' is-crit' : (r.isCritPenalty ? ' is-penalty' : '');
      return `<span class="dice-die${cls}" title="d${r.die}">${r.value}</span>`;
    }).join('');
    const tag = isCritSuccess
      ? `<span class="dice-result__crit-tag" style="color:var(--success-green)">CRITICAL SUCCESS</span>`
      : isCritFailure
        ? `<span class="dice-result__crit-tag" style="color:var(--danger-red)">CRITICAL FAILURE</span>` : '';

    this._result.hidden = false;
    this._result.innerHTML = `
      <span class="card__sub">${escapeHTML(expression)}</span>
      <span class="dice-result__total${totalCls}">${total}</span>
      ${tag}
      <div class="dice-result__dice">${dice}</div>`;
  }
}

customElements.define('dice-roller', DiceRoller);
