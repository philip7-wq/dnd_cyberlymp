import { powerOn, powerOff, setFrequency, seekNext, seekPrev, setVolume, onStateChange, getState } from './radio-engine.js';
import { buildUI, updateDisplay } from './radio-ui.js';

const LS_FREQ = 'radio_standalone_frequency';
const LS_VOL  = 'radio_standalone_volume';

let _saveTimer = null;

function _persist(freq, vol) {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    localStorage.setItem(LS_FREQ, String(freq));
    localStorage.setItem(LS_VOL,  String(vol));
  }, 500);
}

export function mountStandaloneRadio(shellEl) {
  const storedFreq = parseFloat(localStorage.getItem(LS_FREQ));
  const storedVol  = parseFloat(localStorage.getItem(LS_VOL));
  const initFreq = Number.isFinite(storedFreq) ? storedFreq : 88.0;
  const initVol  = Number.isFinite(storedVol)  ? storedVol  : 0.7;

  function _refresh() {
    const s = getState();
    updateDisplay({
      frequency: s.frequency,
      ledState: s.ledState,
      stationName: s.lockedStation?.name ?? '',
      volume: s.volume,
      powered: s.powered,
    });
  }

  buildUI(shellEl, {
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
      _persist(s.frequency, s.volume);
      _refresh();
    },
    onVolumeChange: vol => {
      setVolume(vol);
      const s = getState();
      if (vol <= 0 && s.powered) powerOff();
      _persist(getState().frequency, vol);
      _refresh();
    },
    onSeekNext: async () => { await seekNext(); const s = getState(); _persist(s.frequency, s.volume); _refresh(); },
    onSeekPrev: async () => { await seekPrev(); const s = getState(); _persist(s.frequency, s.volume); _refresh(); },
  });

  setFrequency(initFreq);
  setVolume(initVol);
  updateDisplay({ frequency: initFreq, ledState: 'off', stationName: '', volume: initVol, powered: false });

  onStateChange(_refresh);
}
