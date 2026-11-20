// Sampled instruments (v17.1, issue #23): real recorded notes played through the same player and tape as the
// oscillator patches. Importing this file adds one patch an instrument to PATCHES ('s-harp', 's-flute', ...), so a
// voice asks for one by name like any other. Nothing in the walk imports it: only the sketches do (sketches/index.js),
// and the samples are fetched only by loadSamples().
//
// The notes are vendor/samples/vsco2/<instrument>-<note>.mp3 (CC0: vendor/samples/LICENCES.md), a handful an
// instrument, each cut to its start, levelled and measured: SAMPLES holds each one's sounding pitch in Hz as measured
// from the file (0: unpitched; a sustained note's is its mean over 2.4 s, through its vibrato), so a note is the
// nearest sample played at rate f / f0 and comes out in tune whatever the player's intonation was.
//
// A sampled voice makes two nodes a note (a buffer source and its gain) and frees them when the note ends: fine for
// a sketch of a few hundred notes, and the one place the music breaks patches.js's "no node per note".
//   struck (harp, glock, pizz, marimba, drum, shaker): the note sounds for at least `ring` s whatever its written
//     length, then falls over `rel`; the recording carries its own attack and decay
//   sustained (flute, oboe, violin, viola, cello): held for the written length, then released over `rel`; the
//     recordings are 2.6 to 3.4 s long and not looped, so a part holds no note longer than that
// An unpitched instrument (drum, shaker) takes its sample by number: frequency D3 x n plays its nth sample.
import { PATCHES, cut } from './patches.js';
import { D3 } from './score.js';

export const SAMPLE_DIR = new URL('../../../vendor/samples/vsco2/', import.meta.url).href;
export const SAMPLES = {
  cello: { C2: 65.39, E2: 82.21, G2: 97.97, B2: 123.47, D3: 146.82 },
  drum: { boom: 0, hand: 0, handmp: 0, handpp: 0, rim: 0 },
  flute: { C4: 261.57, E4: 329.55, A4: 439.64, C5: 523.66, E5: 659.29 },
  glock: { G5: 787.72, C6: 1053.62, G6: 1578.69 },
  harp: { F2: 86.96, A2: 109.86, C3: 130.63, E3: 164.52, G3: 195.36, B3: 245.48, D4: 291.7, F4: 349.08, A4: 437.52, C5: 519.9 },
  marimba: { C3: 131.82, G3: 197.05, B3: 247.39, F4: 349.32, C5: 524.71 },
  oboe: { D4: 293.5, F4: 348.98, As4: 465.9, D5: 587.79 },
  pizz: { E2: 83.26, G2: 97.68, B2: 122.05, D3: 147.72, F3: 175.3, A3: 220.1, C4: 260.13, E4: 328.96 },
  shaker: { 1: 0, 4: 0 },
  viola: { G3: 195.88, B3: 247.01, D4: 293.58, F4: 349.47 },
  violin: { G4: 392.26, A4: 443.58, C5: 523.95, E5: 664.69, G5: 786.31 },
};
// gain: the patch's level at velocity 1 (struck files peak at 0.7, sustained ones hold about 0.16 RMS); ring, rel: above;
// lp: a lowpass on the voice in Hz (steep: two of them, 24 dB an octave), where the recording alone is brighter than this music wants (a solo violin played
// forte has more 2-5 kHz than anything in the walk: the owner's "piercing" is judged per instrument, tools/sketch-render.mjs)
export const INSTRUMENTS = {
  harp: { gain: 0.62, ring: 1.6, rel: 1.2 },
  glock: { gain: 1.5, ring: 1.4, rel: 1.0, lp: 2200, steep: true },
  pizz: { gain: 1.6, ring: 0.9, rel: 0.6 },
  marimba: { gain: 0.6, ring: 0.6, rel: 0.5, lp: 1800, steep: true },
  drum: { gain: 1.4, ring: 0.7, rel: 0.3 },
  shaker: { gain: 0.55, ring: 0.2, rel: 0.05 },
  flute: { gain: 1.2, ring: 0, rel: 0.22, lp: 2600 },
  oboe: { gain: 1.15, ring: 0, rel: 0.16, lp: 2000 },
  violin: { gain: 1.1, ring: 0, rel: 0.28, lp: 1600, steep: true },
  viola: { gain: 0.85, ring: 0, rel: 0.4, lp: 2200 },
  cello: { gain: 0.9, ring: 0, rel: 0.45, lp: 2600 },
};
export const patchName = (inst) => `s-${inst}`;
export const instrumentOf = (patch) => (patch.startsWith('s-') && INSTRUMENTS[patch.slice(2)] ? patch.slice(2) : null);
export const fileOf = (inst, note) => `${inst}-${note}.mp3`;

const BUFFERS = new Map(); // 'harp-D4' → AudioBuffer (an AudioBuffer serves any context, live or offline)
const STARTS = new Map(); // 'harp-D4' → seconds into its buffer where the sound begins (below)
const LOADING = new Map(); // 'harp-D4' → the Promise of a load in flight, so two sketches pressed together fetch a note once

// An MP3 decoder puts silence in front of what was encoded (the encoder's delay: 0 to about 50 ms, different in each
// browser), which would land every sampled note late by an amount nobody chose. Measured once a buffer: the first
// sample over 1 % of its peak, less 2 ms; a note starts from there.
function startOf(buf) {
  const d = buf.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; }
  let i = 0;
  while (i < d.length && Math.abs(d[i]) < peak * 0.01) i++;
  return Math.max(0, i / buf.sampleRate - 0.002);
}
const FALL = Float32Array.from({ length: 48 }, (_, i) => { const x = i / 47; return (Math.exp(-4 * x) - Math.exp(-4)) / (1 - Math.exp(-4)); });

// fetch and decode every note of these instruments (those not held or already on their way); resolves to the bytes this call fetched
export async function loadSamples(ac, instruments, dir = SAMPLE_DIR) {
  let bytes = 0;
  await Promise.all(instruments.flatMap((inst) => Object.keys(SAMPLES[inst] || {}).map((note) => {
    const key = `${inst}-${note}`;
    if (BUFFERS.has(key)) return null;
    if (!LOADING.has(key)) {
      LOADING.set(key, (async () => {
        const res = await fetch(dir + fileOf(inst, note));
        if (!res.ok) throw new Error(`music: sample ${key}: HTTP ${res.status}`);
        const data = await res.arrayBuffer();
        bytes += data.byteLength;
        const buf = await ac.decodeAudioData(data);
        STARTS.set(key, startOf(buf)); BUFFERS.set(key, buf);
      })().finally(() => LOADING.delete(key)));
    }
    return LOADING.get(key);
  })));
  return bytes;
}
export const sampleStart = (key) => STARTS.get(key);
export const samplesLoaded = (instruments) => instruments.every((inst) => Object.keys(SAMPLES[inst]).every((n) => BUFFERS.has(`${inst}-${n}`)));

function nearest(inst, f) {
  const table = SAMPLES[inst], keys = Object.keys(table);
  if (!table[keys[0]]) return [keys[Math.max(0, Math.min(keys.length - 1, Math.round(f / D3) - 1))], 0];
  let best = keys[0];
  for (const k of keys) if (Math.abs(Math.log(f / table[k])) < Math.abs(Math.log(f / table[best]))) best = k;
  return [best, table[best]];
}

for (const [inst, I] of Object.entries(INSTRUMENTS)) {
  PATCHES[patchName(inst)] = {
    attack: () => 0.005,
    release: (d) => Math.max(0, I.ring - d) + I.rel, // what sounds after the written length: the rest of the ring, then the fall
    make(ac, out) {
      let bus = out;
      for (let i = 0; I.lp && i < (I.steep ? 2 : 1); i++) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = I.lp; f.Q.value = 0.5; f.connect(bus); bus = f; }
      return {
        note(t, f, dur, vel, end) {
          const [note, f0] = nearest(inst, f), key = `${inst}-${note}`, buf = BUFFERS.get(key);
          if (!buf) throw new Error(`music: sample ${key} is not loaded`);
          const src = ac.createBufferSource(), g = ac.createGain(), peak = vel * I.gain;
          src.buffer = buf; src.playbackRate.value = f0 ? f / f0 : 1;
          const [h, r] = cut(t, Math.max(dur, I.ring), I.rel, end);
          g.gain.setValueAtTime(peak, t);
          g.gain.setValueCurveAtTime(FALL.map((v) => v * peak), t + h, r);
          src.connect(g).connect(bus);
          src.start(t, STARTS.get(key) || 0);
          src.stop(t + h + r + 0.02); // its one stop(): a source is never stopped twice (older WebKit refuses the second)
          src.onended = () => g.disconnect();
        },
        // a note's source is stopped once, by its own note; a track stopped early is silenced by the player's stem
        // (its fade, then its disconnect), and at most the lookahead's two seconds of notes play out unheard
        start() {}, stop() {},
      };
    },
  };
}
