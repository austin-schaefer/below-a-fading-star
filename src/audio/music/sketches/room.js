// The listening page's bus (listen.html): where the walk has its musicBus and master, the page has a small room and
// one gain. A stem leaves the player at about -35 LUFS (it is mixed under the walk's wind); LISTEN_GAIN brings it to
// a level a person plays music at, and the room (a made impulse response, about 1.8 s, dark) is what a hall adds to
// instruments recorded close. No limiter: a sketch is the same samples every time, and tools/sketch-render.mjs holds
// its peak under -3 dBFS.
import { mulberry32 } from '../../../noise.js';

export const LISTEN_GAIN = 6.5, ROOM_WET = 0.2, ROOM_T60 = 1.8, ROOM_TAIL = 2.2;

function impulse(ac) {
  const sr = ac.sampleRate, n = Math.floor(ROOM_TAIL * sr), buf = ac.createBuffer(2, n, sr), pre = Math.floor(0.012 * sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c), rng = mulberry32(7001 + c * 97);
    let y = 0, e = 0;
    for (let i = pre; i < n; i++) {
      const t = (i - pre) / sr, a = 1 - Math.exp(-2 * Math.PI * (1400 + 4600 * Math.exp(-t * 2.5)) / sr); // the tail darkens: 6 kHz to 1.4 kHz
      y += a * ((rng() * 2 - 1) - y);
      d[i] = y * Math.exp(-6.91 * t / ROOM_T60);
      e += d[i] * d[i];
    }
    const k = 1 / Math.sqrt(e);
    for (let i = pre; i < n; i++) d[i] *= k;
  }
  return buf;
}

// → { input (connect a stem here), tap (an AnalyserNode on what reaches dest) }
export function makeRoom(ac, dest, { wet = ROOM_WET, gain = LISTEN_GAIN } = {}) {
  const input = ac.createGain(), out = ac.createGain(), conv = ac.createConvolver(), w = ac.createGain(), tap = ac.createAnalyser();
  out.gain.value = gain; w.gain.value = wet; conv.normalize = false; conv.buffer = impulse(ac); tap.fftSize = 2048;
  input.connect(out); input.connect(conv).connect(w).connect(out);
  out.connect(dest); out.connect(tap);
  return { input, tap };
}
