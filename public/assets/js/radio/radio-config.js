export const RADIO_EPOCH = Date.parse('2026-01-01T00:00:00Z');

export const STATIONS = [
  { id: 'chromewave', name: 'ChromeWave Radio',           frequency: 89.9,  file: 'chromewave_radio.mp3' },
  { id: 'ncebs',      name: 'NCEBS: Emergency Broadcast', frequency: 91.5,  file: 'emergency_broadcast.mp3' },
  { id: 'afterlife',  name: 'Afterlife FM',               frequency: 94.1,  file: 'afterlife_radio.mp3' },
  { id: 'wasteland',  name: 'Wasteland Relay',            frequency: 102.7, file: 'wasteland_radio.mp3' },
  { id: 'nightcity',  name: 'Nightcity Air',              frequency: 107.7, file: 'nightcity_air_radio.mp3' },
];

export const PHANTOM_FREQUENCIES = [92.7, 98.3, 104.5];
export const BAND = { min: 87.5, max: 108.0 };
export const NOISE_FILE = 'static_noise.mp3';
export const LOCK_THRESHOLD = 0.05;
export const NEAR_THRESHOLD = 0.30;

export function getLivePosition(durationSeconds) {
  return ((Date.now() - RADIO_EPOCH) / 1000) % durationSeconds;
}
