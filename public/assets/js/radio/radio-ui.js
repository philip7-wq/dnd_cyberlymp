import { STATIONS, BAND } from './radio-config.js';

const BAND_RANGE = BAND.max - BAND.min;
const SWEEP = 270;          // total knob rotation arc in degrees
const SWEEP_HALF = SWEEP / 2;

function _freqPct(freq) { return ((freq - BAND.min) / BAND_RANGE) * 100; }
function _tToAngle(t)   { return -SWEEP_HALF + t * SWEEP; }

// Stationary tick ring around a knob (uniform 100×100 viewBox → no distortion)
function _knobTicksSvg(count) {
  const cx = 50, cy = 50, rOut = 47;
  let m = '';
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const ang = (-SWEEP_HALF + t * SWEEP) * Math.PI / 180;
    const major = (i % 4 === 0) || i === count - 1;
    const rIn = major ? 38 : 42;
    const x1 = cx + Math.sin(ang) * rOut, y1 = cy - Math.cos(ang) * rOut;
    const x2 = cx + Math.sin(ang) * rIn,  y2 = cy - Math.cos(ang) * rIn;
    m += `<line class="${major ? 'ktick-major' : 'ktick-minor'}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  }
  return m;
}

function _knobHtml(id, label) {
  return `
    <div class="radio-knob" data-knob="${id}">
      <svg class="knob-ticks" viewBox="0 0 100 100">${_knobTicksSvg(21)}</svg>
      <div class="knob-rotor" id="${id}Rotor" data-t="0">
        <span class="knob-pointer"></span>
        <span class="knob-grip"></span>
      </div>
      <div class="knob-center" id="${id}Center">—</div>
      <div class="knob-label">${label}</div>
    </div>`;
}

export function buildUI(container, callbacks) {
  const { onFreqChange, onVolumeChange, onPower, onSeekNext, onSeekPrev } = callbacks;

  container.innerHTML = `
    <div class="radio-head">
      <span class="radio-head-grip"></span>
      <span class="radio-head-title">RADIO SCANNER</span>
      <button class="radio-close-btn" id="radioCloseBtn" type="button">✕</button>
    </div>

    <div class="radio-screen" id="radioScreen">
      <span class="radio-led led-off" id="radioLed"></span>
      <div class="radio-screen-main">
        <span class="radio-freq-num" id="radioFreqNum">88.0</span>
        <span class="radio-mhz">MHz</span>
      </div>
      <span class="radio-station-name" id="radioStationName"></span>
    </div>

    <div class="radio-strip" id="radioStrip">
      <div class="strip-ticks" id="radioStripTicks"></div>
      <div class="strip-dots" id="radioStripDots"></div>
      <span class="strip-needle" id="radioNeedle" style="left:0%"></span>
    </div>

    <div class="radio-knobs">
      ${_knobHtml('tune', 'TUNE')}
      ${_knobHtml('vol', 'VOL')}
    </div>

    <div class="radio-controls">
      <button class="radio-ctrl-btn" id="radioSeekPrev" type="button" aria-label="Vorheriger Sender"><svg class="ic ic-flip" aria-hidden="true"><use href="/assets/icons/cyber-icons.svg#ic-seek"/></svg></button>
      <button class="radio-power-btn" id="radioPowerBtn" type="button" aria-label="Ein/Aus"><svg class="ic" aria-hidden="true"><use href="/assets/icons/cyber-icons.svg#ic-power"/></svg></button>
      <button class="radio-ctrl-btn" id="radioSeekNext" type="button" aria-label="Nächster Sender"><svg class="ic" aria-hidden="true"><use href="/assets/icons/cyber-icons.svg#ic-seek"/></svg></button>
    </div>
  `;

  _buildStrip(container);

  container.querySelector('#radioPowerBtn').addEventListener('click', onPower);
  container.querySelector('#radioSeekNext').addEventListener('click', onSeekNext);
  container.querySelector('#radioSeekPrev').addEventListener('click', onSeekPrev);

  _makeKnob(container.querySelector('[data-knob="tune"]'),
            t => onFreqChange(BAND.min + t * BAND_RANGE));
  _makeKnob(container.querySelector('[data-knob="vol"]'),
            t => onVolumeChange(t));

  // Click/drag on the strip tunes directly
  const strip = container.querySelector('#radioStrip');
  let stripDrag = false;
  const stripSet = e => {
    const r = strip.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    onFreqChange(BAND.min + ratio * BAND_RANGE);
  };
  strip.addEventListener('mousedown', e => {
    e.preventDefault(); stripDrag = true; stripSet(e);
    const mv = ev => stripDrag && stripSet(ev);
    const up = () => { stripDrag = false; window.removeEventListener('mousemove', mv); };
    window.addEventListener('mousemove', mv);
    window.addEventListener('mouseup', up, { once: true });
  });
}

function _buildStrip(container) {
  let th = '';
  for (let f = Math.ceil(BAND.min); f <= Math.floor(BAND.max); f++) {
    const left = _freqPct(f);
    const major = f % 5 === 0;
    th += `<span class="strip-tick${major ? ' major' : ''}" style="left:${left}%"></span>`;
    if (major) th += `<span class="strip-tick-label" style="left:${left}%">${f}</span>`;
  }
  container.querySelector('#radioStripTicks').innerHTML = th;

  let dh = '';
  for (const s of STATIONS) {
    dh += `<span class="strip-dot" style="left:${_freqPct(s.frequency)}%" title="${s.name}"></span>`;
  }
  container.querySelector('#radioStripDots').innerHTML = dh;
}

function _makeKnob(knobEl, onChangeT) {
  const rotor = knobEl.querySelector('.knob-rotor');

  const angleAt = e => {
    const r = knobEl.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return Math.atan2(e.clientX - cx, -(e.clientY - cy)) * 180 / Math.PI; // 0 at top, + clockwise
  };

  knobEl.addEventListener('mousedown', e => {
    e.preventDefault();
    const startAngle = angleAt(e);
    const startT = parseFloat(rotor.dataset.t) || 0;
    const mv = ev => {
      let d = angleAt(ev) - startAngle;
      if (d > 180) d -= 360; if (d < -180) d += 360;
      onChangeT(Math.max(0, Math.min(1, startT + d / SWEEP)));
    };
    const up = () => window.removeEventListener('mousemove', mv);
    window.addEventListener('mousemove', mv);
    window.addEventListener('mouseup', up, { once: true });
  });

  knobEl.addEventListener('wheel', e => {
    e.preventDefault();
    const t = parseFloat(rotor.dataset.t) || 0;
    onChangeT(Math.max(0, Math.min(1, t - Math.sign(e.deltaY) * 0.02)));
  }, { passive: false });
}

export function updateDisplay({ frequency, ledState, stationName, volume, powered }) {
  const screen = document.getElementById('radioScreen');
  const freqEl = document.getElementById('radioFreqNum');
  const ledEl  = document.getElementById('radioLed');
  const nameEl = document.getElementById('radioStationName');
  const needle = document.getElementById('radioNeedle');
  const pwrBtn = document.getElementById('radioPowerBtn');
  if (!screen) return;

  screen.classList.toggle('backlit', !!powered);
  if (freqEl) freqEl.textContent = frequency.toFixed(1);
  if (ledEl)  ledEl.className = 'radio-led led-' + (powered ? ledState : 'off');

  if (nameEl) {
    nameEl.textContent = (powered && ledState === 'green' && stationName) ? stationName : '';
    nameEl.classList.toggle('visible', powered && ledState === 'green' && !!stationName);
  }

  if (needle) needle.style.left = _freqPct(frequency) + '%';

  // Tune knob
  const tuneRotor = document.getElementById('tuneRotor');
  const tuneCenter = document.getElementById('tuneCenter');
  const tT = (frequency - BAND.min) / BAND_RANGE;
  if (tuneRotor) { tuneRotor.dataset.t = tT; tuneRotor.style.transform = `rotate(${_tToAngle(tT)}deg)`; }
  if (tuneCenter) tuneCenter.textContent = frequency.toFixed(1);

  // Volume knob
  const volRotor = document.getElementById('volRotor');
  const volCenter = document.getElementById('volCenter');
  if (volume !== undefined) {
    if (volRotor) { volRotor.dataset.t = volume; volRotor.style.transform = `rotate(${_tToAngle(volume)}deg)`; }
    if (volCenter) volCenter.textContent = Math.round(volume * 100);
  }

  if (pwrBtn) pwrBtn.classList.toggle('powered', !!powered);
}
