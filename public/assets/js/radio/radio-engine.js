import { STATIONS, PHANTOM_FREQUENCIES, BAND, NOISE_FILE, LOCK_THRESHOLD, NEAR_THRESHOLD, getLivePosition } from './radio-config.js';

const BASE = 'assets/sounds/radio/';

// Audio elements — created early so metadata can load lazily
const _stationAudio = new Audio();
_stationAudio.preload = 'auto';

const _noiseAudio = new Audio(BASE + NOISE_FILE);
_noiseAudio.loop = true;
_noiseAudio.preload = 'auto';

// Web Audio nodes (created lazily on first powerOn)
let _ctx = null;
let _masterGain = null;
let _stationGain = null;
let _noiseGain = null;

let _powered = false;
let _frequency = 88.0;
let _volume = 0.7;
let _activeStation = null;   // station object currently loaded in _stationAudio
let _wasLockedId = null;     // id of station we were last locked onto
let _stateCallback = null;   // called with { ledState, lockedStation, frequency } on changes

function _initContext() {
  if (_ctx) return;
  _ctx = new (window.AudioContext || window.webkitAudioContext)();
  _masterGain = _ctx.createGain();
  _masterGain.gain.value = _volume;
  _masterGain.connect(_ctx.destination);

  _stationGain = _ctx.createGain();
  _stationGain.gain.value = 0;
  _stationGain.connect(_masterGain);

  _noiseGain = _ctx.createGain();
  _noiseGain.gain.value = 1;
  _noiseGain.connect(_masterGain);

  _ctx.createMediaElementSource(_stationAudio).connect(_stationGain);
  _ctx.createMediaElementSource(_noiseAudio).connect(_noiseGain);
}

function _nearestStation(freq) {
  return STATIONS.reduce((a, b) =>
    Math.abs(b.frequency - freq) < Math.abs(a.frequency - freq) ? b : a
  );
}

function _isNearPhantom(freq) {
  return PHANTOM_FREQUENCIES.some(pf => Math.abs(pf - freq) < NEAR_THRESHOLD);
}

function _ledState(freq) {
  const dist = Math.abs(_nearestStation(freq).frequency - freq);
  if (dist < LOCK_THRESHOLD) return 'green';
  if (dist < NEAR_THRESHOLD) return 'yellow';
  if (_isNearPhantom(freq)) return 'flicker';
  return 'off';
}

function _applyGains(freq, immediate = false) {
  const dist = Math.abs(_nearestStation(freq).frequency - freq);
  let sv, nv;
  if (dist < LOCK_THRESHOLD)       { sv = 1.0; nv = 0.0; }
  else if (dist < NEAR_THRESHOLD)  { const t = (dist - LOCK_THRESHOLD) / (NEAR_THRESHOLD - LOCK_THRESHOLD); sv = 1 - t; nv = t; }
  else                             { sv = 0.0; nv = 1.0; }
  const t = immediate ? 0 : 0.05;
  const now = _ctx?.currentTime ?? 0;
  _stationGain?.gain.setTargetAtTime(sv, now, t);
  _noiseGain?.gain.setTargetAtTime(nv, now, t);
}

function _loadStation(station) {
  return new Promise(resolve => {
    _activeStation = station;
    _stationAudio.src = BASE + station.file;
    const onMeta = () => {
      if (_stationAudio.duration && isFinite(_stationAudio.duration)) {
        _stationAudio.currentTime = getLivePosition(_stationAudio.duration);
      }
      if (_powered) _stationAudio.play().catch(() => {});
      resolve();
    };
    _stationAudio.addEventListener('loadedmetadata', onMeta, { once: true });
    _stationAudio.addEventListener('error', resolve, { once: true });
    _stationAudio.load();
  });
}

function _emitState() {
  if (!_stateCallback) return;
  const nearest = _nearestStation(_frequency);
  const dist = Math.abs(nearest.frequency - _frequency);
  const locked = _powered && dist < LOCK_THRESHOLD ? nearest : null;
  _stateCallback({ ledState: _powered ? _ledState(_frequency) : 'off', lockedStation: locked, frequency: _frequency });
}

async function setFrequency(freq) {
  _frequency = Math.max(BAND.min, Math.min(BAND.max, parseFloat(freq.toFixed(1))));

  if (!_powered || !_ctx) { _emitState(); return; }

  const nearest = _nearestStation(_frequency);
  const dist = Math.abs(nearest.frequency - _frequency);

  if (dist < NEAR_THRESHOLD) {
    // Load station if we switched to a different one
    if (nearest.id !== _activeStation?.id) {
      await _loadStation(nearest);
    } else if (_stationAudio.paused && _powered) {
      _stationAudio.play().catch(() => {});
    }
    // Re-sync to live position when freshly locking onto a station
    if (dist < LOCK_THRESHOLD && _wasLockedId !== nearest.id) {
      if (_stationAudio.duration && isFinite(_stationAudio.duration)) {
        _stationAudio.currentTime = getLivePosition(_stationAudio.duration);
      }
    }
    _wasLockedId = dist < LOCK_THRESHOLD ? nearest.id : null;
  } else {
    _wasLockedId = null;
    _stationAudio.pause();
  }

  _applyGains(_frequency);
  _emitState();
}

async function powerOn(freq, volume) {
  if (_powered) return;

  const sfx = new Audio(BASE + 'radio_on.wav');
  sfx.volume = 0.8;
  sfx.play().catch(() => {});

  _initContext();
  if (_ctx.state === 'suspended') await _ctx.resume();

  if (volume !== undefined) _volume = Math.max(0, Math.min(1, volume));
  _masterGain.gain.value = _volume;

  _powered = true;
  _noiseAudio.play().catch(() => {});

  if (freq !== undefined) _frequency = Math.max(BAND.min, Math.min(BAND.max, freq));
  await setFrequency(_frequency);
}

function powerOff() {
  if (!_powered) return;
  _powered = false;
  _wasLockedId = null;

  const sfx = new Audio(BASE + 'radio_off.wav');
  sfx.volume = 0.8;
  sfx.play().catch(() => {});

  _stationAudio.pause();
  _noiseAudio.pause();
  _activeStation = null;
  _emitState();
}

async function seekNext() {
  const sorted = [...STATIONS].sort((a, b) => a.frequency - b.frequency);
  const next = sorted.find(s => s.frequency > _frequency + 0.01) ?? sorted[0];
  _wasLockedId = null;
  await setFrequency(next.frequency);
}

async function seekPrev() {
  const sorted = [...STATIONS].sort((a, b) => b.frequency - a.frequency);
  const prev = sorted.find(s => s.frequency < _frequency - 0.01) ?? sorted[0];
  _wasLockedId = null;
  await setFrequency(prev.frequency);
}

function setVolume(vol) {
  _volume = Math.max(0, Math.min(1, vol));
  if (_masterGain && _ctx) _masterGain.gain.setTargetAtTime(_volume, _ctx.currentTime, 0.05);
  return _volume;
}

function onStateChange(cb) { _stateCallback = cb; }

function getState() {
  const nearest = _nearestStation(_frequency);
  const dist = Math.abs(nearest.frequency - _frequency);
  return {
    powered: _powered,
    frequency: _frequency,
    volume: _volume,
    ledState: _powered ? _ledState(_frequency) : 'off',
    lockedStation: (_powered && dist < LOCK_THRESHOLD) ? nearest : null,
  };
}

export { powerOn, powerOff, setFrequency, seekNext, seekPrev, setVolume, onStateChange, getState };
