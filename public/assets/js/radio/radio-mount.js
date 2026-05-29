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

function _onStateUpdate({ ledState, lockedStation, frequency }) {
  if (!_drawer) return;
  const state = getState();
  updateDisplay({
    frequency: state.frequency,
    ledState,
    stationName: lockedStation?.name ?? '',
    volume: state.volume,
    powered: state.powered,
  });
}

function _openDrawer() {
  if (!_drawer) return;
  _drawer.style.display = 'flex';
  _drawerOpen = true;
  // Sync display with current engine state
  const s = getState();
  updateDisplay({ frequency: s.frequency, ledState: s.ledState, stationName: s.lockedStation?.name ?? '', volume: s.volume, powered: s.powered });
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

  // Create topbar button before #navCash
  _radioBtn = document.createElement('button');
  _radioBtn.id = 'radioBtn';
  _radioBtn.type = 'button';
  _radioBtn.className = 'btn btn-ghost';
  _radioBtn.style.fontSize = '.75rem';
  _radioBtn.textContent = '📻 Radio';
  const navCash = topNav.querySelector('#navCash');
  topNav.insertBefore(_radioBtn, navCash);

  // Create drawer
  _drawer = document.createElement('div');
  _drawer.id = 'radioDrawer';
  _drawer.style.display = 'none';
  document.body.appendChild(_drawer);

  // Build UI
  const initFreq = char.radio_last_frequency ?? 88.0;
  const initVol  = char.radio_volume ?? 0.7;

  buildUI(_drawer, {
    onPower: async () => {
      const s = getState();
      if (s.powered) {
        powerOff();
      } else {
        await powerOn(parseFloat(document.getElementById('radioFreqNum')?.textContent) || initFreq, s.volume);
      }
    },
    onFreqChange: async freq => {
      await setFrequency(freq);
      const s = getState();
      _saveState(s.frequency, s.volume);
    },
    onVolumeChange: vol => {
      setVolume(vol);
      const s = getState();
      _saveState(s.frequency, s.volume);
    },
    onSeekNext: async () => { await seekNext(); const s = getState(); _saveState(s.frequency, s.volume); },
    onSeekPrev: async () => { await seekPrev(); const s = getState(); _saveState(s.frequency, s.volume); },
  });

  // Initial display
  updateDisplay({ frequency: initFreq, ledState: 'off', stationName: '', volume: initVol, powered: false });

  // Volume slider initial value
  const vol = document.getElementById('radioVolSlider');
  if (vol) vol.value = initVol;
  setVolume(initVol);

  // Wire engine → UI
  onStateChange(_onStateUpdate);

  // Toggle drawer on button click
  _radioBtn.addEventListener('click', () => {
    _drawerOpen ? _closeDrawer() : _openDrawer();
  });

  // Close button inside drawer
  document.addEventListener('click', e => {
    if (e.target.id === 'radioCloseBtn') _closeDrawer();
  });

  // Close when clicking outside
  document.addEventListener('click', e => {
    if (!_drawerOpen) return;
    if (_drawer.contains(e.target) || e.target === _radioBtn) return;
    _closeDrawer();
  });
}

export function updateRadioOwnership(newGear) {
  if (!_hasRadio(newGear)) {
    if (_drawer) {
      powerOff();
      _closeDrawer();
      _drawer.remove();
      _drawer = null;
    }
    if (_radioBtn) {
      _radioBtn.remove();
      _radioBtn = null;
    }
  } else if (!_radioBtn) {
    // Item was added while page is live — re-mount requires a reload in practice
    // (edge case; user would normally buy item and it appears on next load)
  }
}
