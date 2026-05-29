import { STATIONS, BAND } from './radio-config.js';

const BAND_RANGE = BAND.max - BAND.min;

// Converts frequency to knob rotation angle (-150° to +150°)
function _freqToAngle(freq) {
  return ((freq - BAND.min) / BAND_RANGE) * 300 - 150;
}

// Converts strip X ratio (0–1) to frequency
function _ratioToFreq(r) {
  return BAND.min + r * BAND_RANGE;
}

function _freqLabel(freq) {
  return freq.toFixed(1);
}

export function buildUI(container, { onFreqChange, onVolumeChange, onPower, onSeekNext, onSeekPrev }) {
  container.innerHTML = `
    <div class="radio-head">
      <span class="radio-head-title">RADIO SCANNER</span>
      <button class="radio-close-btn" id="radioCloseBtn" type="button">✕</button>
    </div>

    <div class="radio-display">
      <div class="radio-display-left">
        <span class="radio-freq-num" id="radioFreqNum">88.0</span>
        <span class="radio-mhz">MHz</span>
      </div>
      <div class="radio-display-right">
        <span class="radio-led led-off" id="radioLed"></span>
        <span class="radio-station-name" id="radioStationName"></span>
      </div>
    </div>

    <div class="radio-strip-wrap" id="radioStripWrap">
      <svg class="radio-strip-svg" id="radioStripSvg" xmlns="http://www.w3.org/2000/svg"></svg>
    </div>

    <div class="radio-knob-wrap">
      <svg class="radio-knob-svg" id="radioKnobSvg" viewBox="0 0 60 60" width="72" height="72">
        <circle cx="30" cy="30" r="27" class="knob-body"/>
        <circle cx="30" cy="30" r="26" class="knob-ring"/>
        <circle cx="30" cy="8" r="3.5" class="knob-dot" id="radioKnobDot"/>
      </svg>
    </div>

    <div class="radio-controls">
      <button class="radio-ctrl-btn" id="radioSeekPrev" type="button">◄ SEEK</button>
      <button class="radio-power-btn" id="radioPowerBtn" type="button">⏻ POWER</button>
      <button class="radio-ctrl-btn" id="radioSeekNext" type="button">SEEK ►</button>
    </div>

    <div class="radio-volume-wrap">
      <span class="radio-vol-label">VOL</span>
      <input class="radio-vol-slider" id="radioVolSlider" type="range" min="0" max="1" step="0.01" value="0.7">
    </div>
  `;

  _buildStrip(container);
  _wireEvents(container, { onFreqChange, onVolumeChange, onPower, onSeekNext, onSeekPrev });
}

function _buildStrip(container) {
  const svg = container.querySelector('#radioStripSvg');
  const W = 280, H = 36;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', H);

  let markup = '';

  // Tick marks: major (5 MHz), medium (1 MHz), minor (0.5 MHz)
  for (let f = BAND.min; f <= BAND.max + 0.01; f += 0.5) {
    const x = ((f - BAND.min) / BAND_RANGE) * W;
    const isMajor = Math.abs(f % 5) < 0.01;
    const isMedium = !isMajor && Math.abs(f % 1) < 0.01;
    const h = isMajor ? 14 : isMedium ? 9 : 5;
    const cls = isMajor ? 'strip-tick-major' : isMedium ? 'strip-tick-medium' : 'strip-tick-minor';
    markup += `<line class="${cls}" x1="${x.toFixed(1)}" y1="${H - h}" x2="${x.toFixed(1)}" y2="${H}" />`;
    if (isMajor) {
      markup += `<text class="strip-freq-label" x="${x.toFixed(1)}" y="${H - 16}" text-anchor="middle">${f.toFixed(0)}</text>`;
    }
  }

  // Station markers
  for (const s of STATIONS) {
    const x = ((s.frequency - BAND.min) / BAND_RANGE) * W;
    markup += `<circle class="strip-station-dot" cx="${x.toFixed(1)}" cy="6" r="4" data-sid="${s.id}" />`;
  }

  // Needle (current position)
  markup += `<line class="strip-needle" id="radioNeedle" x1="0" y1="0" x2="0" y2="${H}" />`;

  svg.innerHTML = markup;
}

export function updateDisplay({ frequency, ledState, stationName, volume, powered }) {
  const freqEl = document.getElementById('radioFreqNum');
  const ledEl  = document.getElementById('radioLed');
  const nameEl = document.getElementById('radioStationName');
  const knob   = document.getElementById('radioKnobSvg');
  const needle = document.getElementById('radioNeedle');
  const pwrBtn = document.getElementById('radioPowerBtn');

  if (freqEl) freqEl.textContent = _freqLabel(frequency);

  if (ledEl) {
    ledEl.className = `radio-led led-${ledState}`;
  }

  if (nameEl) {
    if (ledState === 'green' && stationName) {
      nameEl.textContent = stationName;
      nameEl.classList.add('visible');
    } else {
      nameEl.textContent = '';
      nameEl.classList.remove('visible');
    }
  }

  // Rotate knob
  if (knob) {
    const angle = _freqToAngle(frequency);
    knob.style.transform = `rotate(${angle}deg)`;
  }

  // Move needle
  if (needle) {
    const stripWrap = document.getElementById('radioStripWrap');
    const W = stripWrap ? stripWrap.clientWidth : 280;
    const x = ((frequency - BAND.min) / BAND_RANGE) * W;
    needle.setAttribute('x1', x.toFixed(1));
    needle.setAttribute('x2', x.toFixed(1));
  }

  // Volume slider
  const vol = document.getElementById('radioVolSlider');
  if (vol && volume !== undefined) vol.value = volume;

  // Power button state
  if (pwrBtn) {
    pwrBtn.classList.toggle('powered', !!powered);
  }
}

function _wireEvents(container, { onFreqChange, onVolumeChange, onPower, onSeekNext, onSeekPrev }) {
  container.querySelector('#radioPowerBtn')?.addEventListener('click', onPower);
  container.querySelector('#radioSeekNext')?.addEventListener('click', onSeekNext);
  container.querySelector('#radioSeekPrev')?.addEventListener('click', onSeekPrev);

  const volSlider = container.querySelector('#radioVolSlider');
  volSlider?.addEventListener('input', e => onVolumeChange(parseFloat(e.target.value)));

  // Knob drag
  const knob = container.querySelector('#radioKnobSvg');
  let _knobDragStart = null;
  let _knobDragFreq = null;

  knob?.addEventListener('mousedown', e => {
    e.preventDefault();
    _knobDragStart = e.clientX;
    _knobDragFreq = parseFloat(document.getElementById('radioFreqNum').textContent) || BAND.min;
    document.addEventListener('mousemove', _onKnobDrag);
    document.addEventListener('mouseup', _onKnobUp, { once: true });
  });

  function _onKnobDrag(e) {
    if (_knobDragStart === null) return;
    const delta = e.clientX - _knobDragStart;
    const newFreq = Math.max(BAND.min, Math.min(BAND.max, _knobDragFreq + delta * 0.033));
    onFreqChange(newFreq);
  }

  function _onKnobUp() {
    _knobDragStart = null;
    document.removeEventListener('mousemove', _onKnobDrag);
  }

  knob?.addEventListener('wheel', e => {
    e.preventDefault();
    const cur = parseFloat(document.getElementById('radioFreqNum').textContent) || BAND.min;
    onFreqChange(Math.max(BAND.min, Math.min(BAND.max, cur - Math.sign(e.deltaY) * 0.1)));
  }, { passive: false });

  // Strip drag
  const stripWrap = container.querySelector('#radioStripWrap');
  let _stripDragging = false;

  function _stripClick(e) {
    const rect = stripWrap.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onFreqChange(_ratioToFreq(ratio));
  }

  stripWrap?.addEventListener('mousedown', e => {
    e.preventDefault();
    _stripDragging = true;
    _stripClick(e);
    document.addEventListener('mousemove', _onStripDrag);
    document.addEventListener('mouseup', _onStripUp, { once: true });
  });

  function _onStripDrag(e) {
    if (!_stripDragging) return;
    _stripClick(e);
  }

  function _onStripUp() {
    _stripDragging = false;
    document.removeEventListener('mousemove', _onStripDrag);
  }
}
