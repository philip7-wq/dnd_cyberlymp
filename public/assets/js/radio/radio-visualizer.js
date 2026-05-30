import { attachAnalyser } from './radio-engine.js';

const LS_WAVE = 'radio_show_waveform';
const LS_BG   = 'radio_show_visualizer';

let _analyser = null;
let _waveCanvas = null, _waveCtx = null, _waveData = null;
let _bgCanvas   = null, _bgCtx   = null, _freqData = null;
let _waveOn = true, _bgOn = true;
let _rafId = null;
let _idlePhase = 0;

export function initVisualizer({ waveformCanvas, bgCanvas }) {
  _waveCanvas = waveformCanvas;
  _bgCanvas   = bgCanvas;
  _waveCtx = _waveCanvas.getContext('2d');
  _bgCtx   = _bgCanvas.getContext('2d');

  _waveOn = localStorage.getItem(LS_WAVE) !== '0';
  _bgOn   = localStorage.getItem(LS_BG)   !== '0';

  _analyser = attachAnalyser({ fftSize: 2048, smoothingTimeConstant: 0.8 });
  _waveData = new Uint8Array(_analyser.fftSize);
  _freqData = new Uint8Array(_analyser.frequencyBinCount);

  window.addEventListener('resize', _resizeAll);
  document.addEventListener('visibilitychange', () => document.hidden ? _stop() : _maybeStart());
  _resizeAll();
  _maybeStart();
}

function _resizeAll() {
  const dpr = window.devicePixelRatio || 1;
  for (const c of [_waveCanvas, _bgCanvas]) {
    if (!c) continue;
    const rect = c.getBoundingClientRect();
    c.width  = Math.max(1, Math.round(rect.width  * dpr));
    c.height = Math.max(1, Math.round(rect.height * dpr));
  }
}

export function setWaveformVisible(on) {
  _waveOn = !!on;
  localStorage.setItem(LS_WAVE, _waveOn ? '1' : '0');
  if (!_waveOn && _waveCtx) _waveCtx.clearRect(0, 0, _waveCanvas.width, _waveCanvas.height);
  _maybeStart();
}
export function setVisualizerVisible(on) {
  _bgOn = !!on;
  localStorage.setItem(LS_BG, _bgOn ? '1' : '0');
  if (!_bgOn && _bgCtx) _bgCtx.clearRect(0, 0, _bgCanvas.width, _bgCanvas.height);
  _maybeStart();
}
export function isWaveformOn()   { return _waveOn; }
export function isVisualizerOn() { return _bgOn; }

function _maybeStart() {
  if (document.hidden) return;
  if (!_waveOn && !_bgOn) { _stop(); return; }
  if (_rafId) return;
  _loop();
}
function _stop() { if (_rafId) cancelAnimationFrame(_rafId); _rafId = null; }

function _avgAmplitude(data) {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += Math.abs(data[i] - 128);
  return sum / data.length / 128;
}

function _loop() {
  _rafId = requestAnimationFrame(_loop);
  _analyser.getByteTimeDomainData(_waveData);
  _analyser.getByteFrequencyData(_freqData);
  _idlePhase += 0.04;
  if (_waveOn) _drawWaveform();
  if (_bgOn)   _drawBars();
}

function _drawWaveform() {
  const w = _waveCanvas.width, h = _waveCanvas.height;
  const ctx = _waveCtx;
  ctx.clearRect(0, 0, w, h);

  const amp = _avgAmplitude(_waveData);
  const idle = amp < 0.01;
  const glow = 8 + amp * 28;

  ctx.lineWidth = Math.max(1.5, h / 60);
  ctx.strokeStyle = '#00FFD0';
  ctx.shadowBlur = glow;
  ctx.shadowColor = '#00FFD0';
  ctx.beginPath();

  const slice = w / _waveData.length;
  for (let i = 0; i < _waveData.length; i++) {
    let v = _waveData[i] / 128.0;
    if (idle) {
      const t = (i / _waveData.length) * Math.PI * 6;
      v = 1.0 + Math.sin(t + _idlePhase) * 0.04 * (1 + Math.sin(_idlePhase * 0.5) * 0.5);
    }
    const y = (v * h) / 2;
    const x = i * slice;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function _drawBars() {
  const w = _bgCanvas.width, h = _bgCanvas.height;
  const ctx = _bgCtx;
  ctx.clearRect(0, 0, w, h);

  const bars = 64;
  const step = Math.max(1, Math.floor(_freqData.length / bars));
  const barW = w / bars;
  const mid = h / 2;
  const ampAvg = _avgAmplitude(_waveData);
  const idle = ampAvg < 0.01;

  for (let i = 0; i < bars; i++) {
    let amp;
    if (idle) {
      const breathe = 0.5 + Math.sin(_idlePhase * 0.6) * 0.5;
      const wave = Math.sin(_idlePhase + i * 0.18);
      amp = 0.04 + (wave * 0.5 + 0.5) * 0.06 * breathe;
    } else {
      amp = _freqData[i * step] / 255;
    }

    const barH = amp * h * 0.5;
    const hue = 180 + amp * 120;
    const light = 50 + amp * 20;
    const color = `hsl(${hue}, 100%, ${light}%)`;

    ctx.fillStyle = color;
    ctx.shadowBlur = 14 + amp * 18;
    ctx.shadowColor = color;
    ctx.globalAlpha = idle ? 0.45 : 0.85;

    const x = i * barW;
    const padW = Math.max(1, barW - 2);
    ctx.fillRect(x, mid - barH, padW, barH);
    ctx.fillRect(x, mid,        padW, barH);
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}
