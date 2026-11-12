#!/usr/bin/env node
// A roughness measure fit for music (v9-M1). tools/audio-metrics.mjs's `rough` was built for noise beds: it reads
// envelope modulation at 15-300 Hz in octave bands, so any two tones 15-300 Hz apart in one band (a just fifth on D3)
// and any tone under 150 Hz alone (the 2f ripple of its 1 ms power envelope) read as rough, about 0.4. This one works
// on partials, as sensory dissonance is modelled (Plomp and Levelt 1965; Sethares 1993), with the critical band as an
// ERB (Glasberg and Moore 1990):
//   each 16384-point Hann frame (0.34 s at 48 kHz, every 8192 samples) → its spectral peaks (local maxima within 50 dB
//   of the frame's strongest and 15 dB over the median of the 128 bins round them, so a noise floor's maxima
//   are not partials; frequency and level by parabolic interpolation; one within 4 bins of a stronger, or
//   within an ERB and 25 dB under it, is leakage or masked and dropped; the 40 strongest kept) → each pair's
//   dissonance d(x), x = |f1 - f2| / ERB(mean), on the Plomp-Levelt curve normalised to 1 at its peak (x = 0.25) →
//   R = 2 Σ w1 w2 d / Σ w² with w = amplitude^0.6 (loudness grows as pressure to the 0.6), so two equal tones at the
//   curve's peak read 1 and a lone tone 0 → the file's value is the frames' mean weighted by Σ w² (quiet frames count less).
// It reads near 0 for a clean D3, a just fifth D3-A3 and an open just triad; high for two tones 20-40 Hz apart in the
// midrange and for a bare saw (its upper harmonics crowd inside one critical band). `--self-test` proves it on those.
//   node tools/music-metrics.mjs --self-test
//   node tools/music-metrics.mjs a.wav
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readWav } from './audio-metrics.mjs';

const N = 16384, HOP = 8192, FLOOR_DB = 50, MAX_PEAKS = 40, MASK_DB = 25, PROMINENCE = 10 ** (15 / 20);
const erb = (f) => 24.7 * (4.37 * f / 1000 + 1);
// Plomp-Levelt as Sethares fits it, rescaled so its maximum sits at x = 0.25 critical bands and is 1
const K = Math.log(5.75 / 3.5) / (5.75 - 3.5) / 0.25, PEAK = Math.exp(-3.5 * 0.25 * K) - Math.exp(-5.75 * 0.25 * K);
export const pl = (x) => (Math.exp(-3.5 * K * x) - Math.exp(-5.75 * K * x)) / PEAK;

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a), h = len >> 1;
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < h; k++) { const p = i + k, q = p + h, tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr; re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
  }
}
const WIN = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));

// the median magnitude of the 128 bins round k (every 4th, for speed)
const MED = new Float64Array(32);
function localMedian(mag, k) {
  let n = 0; for (let j = Math.max(1, k - 64); j < Math.min(mag.length, k + 64) && n < 32; j += 4) MED[n++] = mag[j];
  const a = MED.subarray(0, n).sort(); return a[n >> 1];
}
// the frame's peaks: [{ f, a }] (a linear amplitude, relative)
function peaks(mag, sr) {
  let top = 0; for (let k = 2; k < N / 2 - 2; k++) if (mag[k] > top) top = mag[k];
  if (!(top > 0)) return [];
  const floor = top * 10 ** (-FLOOR_DB / 20), out = [];
  for (let k = 3; k < N / 2 - 3; k++) {
    const m = mag[k];
    if (m < floor || m < mag[k - 1] || m <= mag[k + 1] || m < mag[k - 2] || m <= mag[k + 2]) continue;
    if (m < PROMINENCE * localMedian(mag, k)) continue; // a noise floor's maxima are not partials
    const l = Math.log(mag[k - 1] + 1e-30), c = Math.log(m), r = Math.log(mag[k + 1] + 1e-30);
    const den = l - 2 * c + r, d = den < 0 ? 0.5 * (l - r) / den : 0;
    out.push({ f: (k + d) * sr / N, a: Math.exp(c - 0.25 * (l - r) * d) });
  }
  out.sort((p, q) => q.a - p.a);
  // a weak peak beside a strong one is the strong one's leakage (a note's envelope or vibrato inside the frame smears
  // it into side maxima) or masked by it: dropped when within 4 bins of a stronger peak, or within one ERB and
  // MASK_DB under it
  const kept = [], bin = sr / N, mask = 10 ** (-MASK_DB / 20);
  for (const p of out) {
    if (kept.some((q) => { const df = Math.abs(q.f - p.f); return df < 4 * bin || (df < erb(q.f) && p.a < q.a * mask); })) continue;
    kept.push(p); if (kept.length >= MAX_PEAKS) break;
  }
  return kept;
}
// the peaks of one frame of channels (N samples)
export function framePeaks(seg, sr) {
  const re = new Float64Array(N), im = new Float64Array(N), mag = new Float64Array(N / 2);
  for (let i = 0; i < N; i++) { let v = 0; for (const c of seg) v += c[i] || 0; re[i] = v / seg.length * WIN[i]; }
  fft(re, im); for (let k = 0; k < N / 2; k++) mag[k] = Math.hypot(re[k], im[k]);
  return peaks(mag, sr);
}
// R for one set of peaks, and its weight Σ w²
export function frameRough(ps) {
  let num = 0, den = 0;
  const w = ps.map((p) => p.a ** 0.6);
  for (let i = 0; i < ps.length; i++) {
    den += w[i] * w[i];
    for (let j = i + 1; j < ps.length; j++) {
      const df = Math.abs(ps[i].f - ps[j].f), x = df / erb((ps[i].f + ps[j].f) / 2);
      if (x < 4) num += w[i] * w[j] * pl(x);
    }
  }
  return { r: den > 0 ? 2 * num / den : 0, w: den };
}
// ch: Float32Array channels → { rough, p95, worst_t } (worst_t: the roughest loud frame's time, s)
export function musicRough(ch, sr) {
  const n = ch[0].length, re = new Float64Array(N), im = new Float64Array(N), mag = new Float64Array(N / 2);
  let acc = 0, wt = 0; const frames = [];
  for (let o = 0; o + N <= n; o += HOP) {
    let e = 0;
    for (let i = 0; i < N; i++) { let s = 0; for (const c of ch) s += c[o + i]; s /= ch.length; e += s * s; re[i] = s * WIN[i]; im[i] = 0; }
    if (e / N < 1e-12) continue; // below -120 dBFS: silence
    fft(re, im);
    for (let k = 0; k < N / 2; k++) mag[k] = Math.hypot(re[k], im[k]);
    const { r, w } = frameRough(peaks(mag, sr));
    acc += r * w; wt += w; frames.push({ t: (o + N / 2) / sr, r, w });
  }
  const loud = frames.filter((f) => f.w >= 0.1 * Math.max(...frames.map((g) => g.w)));
  const sorted = loud.map((f) => f.r).sort((a, b) => a - b);
  const worst = loud.reduce((b, f) => (!b || f.r > b.r ? f : b), null);
  return { rough: wt > 0 ? +(acc / wt).toFixed(3) : 0, p95: sorted.length ? +sorted[Math.floor(0.95 * (sorted.length - 1))].toFixed(3) : 0, worst_t: worst ? +worst.t.toFixed(1) : null };
}

// ------------------------------------------------------------------------------------------------ the self-test
const D3 = 146.83;
function tones(parts, { sr = 48000, seconds = 3 } = {}) {
  const n = sr * seconds, c = new Float32Array(n);
  for (const [f, a] of parts) for (let i = 0; i < n; i++) c[i] += a * Math.sin(2 * Math.PI * f * i / sr);
  return [c];
}
const saw = (f, sr = 48000) => Array.from({ length: Math.floor(sr / 2 / f) }, (_, k) => [f * (k + 1), 0.2 / (k + 1)]);
export const CASES = [
  ['a clean D3 sine', tones([[D3, 0.2]]), (v) => v < 0.05, '< 0.05'],
  ['a just fifth D3-A3', tones([[D3, 0.2], [D3 * 1.5, 0.2]]), (v) => v < 0.05, '< 0.05'],
  ['an open just minor triad D3-A3-F4', tones([[D3, 0.2], [D3 * 1.5, 0.2], [D3 * 2.4, 0.2]]), (v) => v < 0.05, '< 0.05'],
  ['two tones 30 Hz apart at 500 Hz', tones([[500, 0.2], [530, 0.2]]), (v) => v > 0.5, '> 0.5'],
  ['two tones 20 Hz apart at 800 Hz', tones([[800, 0.2], [820, 0.2]]), (v) => v > 0.5, '> 0.5'],
  ['a bare saw on D3', tones(saw(D3)), (v) => v > 0.3, '> 0.3'],
];
// shown, not gated: a close just triad D4-F4-A4 (thirds crowd a critical band; the skill keeps them above D4)
export const SHOWN = [['a close just minor triad D4-F4-A4', tones([[D3 * 2, 0.2], [D3 * 2.4, 0.2], [D3 * 3, 0.2]])]];

export function selfTest(log = console.log) {
  let fail = 0;
  for (const [name, ch, test, band] of CASES) {
    const v = musicRough(ch, 48000).rough, ok = test(v);
    if (!ok) fail++;
    log(`${ok ? 'PASS' : 'FAIL'} music rough, ${name}: ${v} (${band})`);
  }
  for (const [name, ch] of SHOWN) log(`  (shown) music rough, ${name}: ${musicRough(ch, 48000).rough}`);
  return fail;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) process.exit(selfTest() ? 1 : 0);
  const at = args.find((a) => a.startsWith('--at='));
  for (const f of args.filter((a) => !a.startsWith('--'))) {
    const w = readWav(f); console.log(f, JSON.stringify(musicRough(w.ch, w.sr)));
    // --at=<s>: the peaks of the frame at that time, and its value (to see what a number comes from)
    if (at) { const o = Math.round(Number(at.slice(5)) * w.sr - N / 2), seg = w.ch.map((c) => c.subarray(o, o + N)); const ps = framePeaks(seg, w.sr); console.log(JSON.stringify(frameRough(ps)), ps.map((p) => `${p.f.toFixed(1)}:${(20 * Math.log10(p.a)).toFixed(0)}`).join(' ')); }
  }
}
