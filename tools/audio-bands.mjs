// Band energy as text (v9-M5): what the spectrogram shows, in a table an agent reads without opening an image.
// Octave bands (63 Hz ... 16 kHz) in dB, one row for each slice of the render and one for the whole of it, so balance
// (where the energy sits) and change over time (does a band swell, hole, or fall away) are numbers.
// 0 dB is a full-scale sine's own power, so a sine at amplitude 0.1 in a band reads -20. Energy below 44 Hz and above
// 22 kHz is left out; a band the sampling rate cannot hold reads "-".
// Usage: node tools/audio-bands.mjs a.wav [--slices=4] [--baseline=b.wav]
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BAND_EDGES = [44.2, 88.4, 176.8, 353.6, 707.1, 1414.2, 2828.4, 5656.9, 11313.7, 22627.4];
export const BAND_LABELS = ['63', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];

function fft(re, im) { // in place, radix 2
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

// -> { labels, slices: [{ t0, t1, db: [per band] }], all: [per band], swing: [max - min over the slices, per band], tilt }
export function bandTable(wav, { slices = 4 } = {}) {
  const { sr, ch } = wav, n = ch[0].length, N = 4096, hop = 2048, nb = BAND_LABELS.length, bin = sr / N;
  const mono = new Float64Array(n); for (const c of ch) for (let i = 0; i < n; i++) mono[i] += c[i] / ch.length;
  const w = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)), re = new Float64Array(N), im = new Float64Array(N);
  const ref = 1.5 * N * N / 16; // a full-scale sine's power summed over its Hann main lobe
  const frames = Math.max(0, Math.floor((n - N) / hop) + 1), dur = n / sr;
  const per = []; // per frame: band powers
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < N; i++) { re[i] = mono[f * hop + i] * w[i]; im[i] = 0; }
    fft(re, im);
    const p = new Float64Array(nb);
    for (let k = 1; k <= N / 2; k++) {
      const fr = k * bin; if (fr < BAND_EDGES[0] || fr >= BAND_EDGES[nb]) continue;
      let b = 0; while (b < nb - 1 && fr >= BAND_EDGES[b + 1]) b++;
      p[b] += (re[k] * re[k] + im[k] * im[k]) / ref;
    }
    per.push(p);
  }
  const level = (from, to) => { // mean power over the frames whose centres fall in [from, to) s
    const acc = new Float64Array(nb); let c = 0;
    per.forEach((p, f) => { const t = (f * hop + N / 2) / sr; if (t >= from && t < to) { for (let b = 0; b < nb; b++) acc[b] += p[b]; c++; } });
    return Array.from(acc, (v, b) => (BAND_EDGES[b] >= sr / 2 || !c ? null : +(10 * Math.log10(Math.max(v / c, 1e-30))).toFixed(1)));
  };
  const out = { labels: BAND_LABELS, seconds: +dur.toFixed(2), slices: [], all: level(0, Infinity) };
  for (let s = 0; s < slices; s++) { const t0 = dur * s / slices, t1 = dur * (s + 1) / slices; out.slices.push({ t0: +t0.toFixed(1), t1: +t1.toFixed(1), db: level(t0, t1 + 1e-9) }); }
  out.swing = out.all.map((_, b) => { const v = out.slices.map((s) => s.db[b]).filter((x) => x != null); return v.length ? +(Math.max(...v) - Math.min(...v)).toFixed(1) : null; });
  return out;
}

const c = (v, w = 7) => (v == null ? '-' : v.toFixed(1)).padStart(w);
// the table as text; with `base` (a bandTable of an earlier render) the whole-render row also shows the change
export function bandText(bt, base = null, { indent = '' } = {}) {
  const lines = [];
  lines.push(`${indent}band Hz   ${bt.labels.map((l) => l.padStart(7)).join('')}`);
  for (const s of bt.slices) lines.push(`${indent}${`${s.t0}-${s.t1} s`.padEnd(10)}${s.db.map((v) => c(v)).join('')}`);
  lines.push(`${indent}${'whole'.padEnd(10)}${bt.all.map((v) => c(v)).join('')}`);
  lines.push(`${indent}${'swing'.padEnd(10)}${bt.swing.map((v) => c(v)).join('')}`);
  if (base) lines.push(`${indent}${'vs before'.padEnd(10)}${bt.all.map((v, b) => (v == null || base.all[b] == null ? c(null) : c(v - base.all[b]).replace(/^(\s*)(\d)/, '$1+$2'))).join('')}`);
  return lines.join('\n');
}

async function main() {
  const { readWav } = await import('./audio-metrics.mjs'); // not at the top: audio-metrics.mjs loads this file for its table
  const o = {}, files = [];
  for (const a of process.argv.slice(2)) { const m = a.match(/^--([^=]+)(?:=(.*))?$/); if (m) o[m[1]] = m[2] ?? true; else files.push(a); }
  if (!files.length) { console.error('usage: node tools/audio-bands.mjs a.wav [--slices=4] [--baseline=b.wav]'); process.exit(2); }
  const slices = o.slices ? Number(o.slices) : 4, bt = bandTable(readWav(files[0]), { slices });
  console.log(bandText(bt, o.baseline ? bandTable(readWav(o.baseline), { slices }) : null));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
