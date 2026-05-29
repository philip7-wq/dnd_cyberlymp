import { powerOn, powerOff, setFrequency, seekNext, seekPrev, setVolume, onStateChange, getState } from './radio-engine.js';
import { buildUI, updateDisplay } from './radio-ui.js';

const ITEM_NAME = 'Radio Scanner / Music Player';

let _char = null;
let _patchFn = null;
let _radioBtn = null;
let _drawer = null;
let _drawerOpen = false;
let _saveTimer = null;

function _hasRadio(gear) {
  return (gear || []).some(g => g.name === ITEM_NAME);
}

function _saveState(freq, vol) {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    if (_char && _patchFn) {
      _patchFn(_char.id, { radio_last_frequency: freq, radio_volume: vol }).catch(() => {});
    }
  }, 1000);
}

function _updateButton(s) {
  if (!_radioBtn) return;
  const led  = _radioBtn.querySelector('.radio-btn-led');
  const freq = _radioBtn.querySelector('.radio-btn-freq');
  if (led)  led.className  = 'radio-btn-led led-' + (s.powered ? s.ledState : 'off');
  if (freq) freq.textContent = s.frequency.toFixed(1);
}

function _refresh() {
  const s = getState();
  if (_drawer && _drawerOpen) {
    updateDisplay({
      frequency: s.frequency,
      ledState: s.ledState,
      stationName: s.lockedStation?.name ?? '',
      volume: s.volume,
      powered: s.powered,
    });
  }
  _updateButton(s);
}

function _openDrawer() {
  if (!_drawer || !_radioBtn) return;
  const r = _radioBtn.getBoundingClientRect();
  const W = 320;
  let left = r.left;
  if (left + W > window.innerWidth - 12) left = window.innerWidth - 12 - W;
  _drawer.style.top    = (r.bottom + 8) + 'px';
  _drawer.style.left   = Math.max(12, left) + 'px';
  _drawer.style.right  = 'auto';
  _drawer.style.bottom = 'auto';
  _drawer.style.display = 'flex';
  _drawerOpen = true;
  _refresh();
}

function _closeDrawer() {
  if (!_drawer) return;
  _drawer.style.display = 'none';
  _drawerOpen = false;
}

export function mountRadio(topNav, char, patchCharacter) {
  _char = char;
  _patchFn = patchCharacter;

  if (!_hasRadio(char.gear)) return;

  // Topbar button: LED + 📻 + live frequency
  _radioBtn = document.createElement('button');
  _radioBtn.id = 'radioBtn';
  _radioBtn.type = 'button';
  _radioBtn.className = 'btn btn-ghost radio-topbar-btn';
  _radioBtn.style.fontSize = '.75rem';
  _radioBtn.innerHTML = `<span class="radio-btn-led led-off"></span><span class="radio-btn-icon">📻</span><span class="radio-btn-freq">88.0</span>`;
  topNav.insertBefore(_radioBtn, topNav.querySelector('#navCash'));

  // Drawer (positioned under the button on open)
  _drawer = document.createElement('div');
  _drawer.id = 'radioDrawer';
  _drawer.style.display = 'none';
  document.body.appendChild(_drawer);

  const initFreq = char.radio_last_frequency ?? 88.0;
  const initVol  = char.radio_volume ?? 0.7;

  buildUI(_drawer, {
    onPower: async () => {
      const s = getState();
      if (s.powered) {
        powerOff();
      } else {
        await powerOn(getState().frequency, getState().volume);
      }
      _refresh();
    },
    onFreqChange: async freq => {
      await setFrequency(freq);
      const s = getState();
      _saveState(s.frequency, s.volume);
      _refresh();
    },
    onVolumeChange: vol => {
      setVolume(vol);
      const s = getState();
      if (vol <= 0 && s.powered) powerOff();   // muting fully turns the radio off
      _saveState(getState().frequency, vol);
      _refresh();
    },
    onSeekNext: async () => { await seekNext(); const s = getState(); _saveState(s.frequency, s.volume); _refresh(); },
    onSeekPrev: async () => { await seekPrev(); const s = getState(); _saveState(s.frequency, s.volume); _refresh(); },
  });

  // Seed engine state (frequency + volume) without powering on
  setFrequency(initFreq);
  setVolume(initVol);

  updateDisplay({ frequency: initFreq, ledState: 'off', stationName: '', volume: initVol, powered: false });
  _updateButton(getState());

  onStateChange(_refresh);

  _radioBtn.addEventListener('click', () => { _drawerOpen ? _closeDrawer() : _openDrawer(); });

  document.addEventListener('click', e => {
    if (e.target.closest && e.target.closest('#radioCloseBtn')) _closeDrawer();
  });
  document.addEventListener('click', e => {
    if (!_drawerOpen) return;
    if (_drawer.contains(e.target) || _radioBtn.contains(e.target)) return;
    _closeDrawer();
  });
  window.addEventListener('resize', () => { if (_drawerOpen) _openDrawer(); });
}

export function updateRadioOwnership(newGear) {
  if (!_hasRadio(newGear)) {
    if (_drawer) { powerOff(); _closeDrawer(); _drawer.remove(); _drawer = null; }
    if (_radioBtn) { _radioBtn.remove(); _radioBtn = null; }
  }
}
