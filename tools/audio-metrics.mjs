#!/usr/bin/env node
// Audio metrics (v7.2-00): reads a WAV (16/24/32-bit PCM or 32/64-bit float, any channel count) and reports the
// numbers `.agents/skills/sound-design/harness.md` defines: K-weighted loudness per BS.1770 (integrated, gated;
// short-term max; loudness range per EBU Tech 3342), sample peak, crest, spectral centroid, sharpness (2-5 kHz over
// 100-8000 Hz), roughness (periodic envelope modulation at 15-300 Hz in octave bands), the share above 6 kHz, clicks
// (sample discontinuities with no onset round them) and the period they repeat at (a loop seam), onsets (spectral
// flux peaks over an adaptive threshold; the walker's own steps are left out when the render's cue log lists them),
// the longest and shortest gap between onsets, and the share of silent blocks. Draws a log-frequency spectrogram
// PNG on a fixed dB scale, with the cue log's events along the top when `<wav>.json` (audio-render's log) sits beside it.
// Dependency-free: the PNG is encoded here with node:zlib.
// Usage:
//   node tools/audio-metrics.mjs a.wav [--spectrogram=a.png] [--json] [--clicks]
//   node tools/audio-metrics.mjs after.wav --baseline=before.wav [--spectrogram=pair.png] [--json]
// --json writes <wav>.metrics.json. --clicks lists every click. With --baseline the two spectrograms are stacked
// (before on top) in one PNG, by default <after>.compare.png.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

// ------------------------------------------------------------------------------------------------ WAV in and out
export function readWav(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`${file}: not a RIFF WAVE`);
  let off = 12, fmt = null, data = null;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4), size = b.readUInt32LE(off + 4), body = off + 8;
    if (id === 'fmt ') {
      let tag = b.readUInt16LE(body);
      const channels = b.readUInt16LE(body + 2), sr = b.readUInt32LE(body + 4), bits = b.readUInt16LE(body + 14);
      if (tag === 0xfffe && size >= 40) tag = b.readUInt16LE(body + 24); // WAVE_FORMAT_EXTENSIBLE: the subformat GUID's first word
      fmt = { tag, channels, sr, bits };
    } else if (id === 'data') data = { at: body, size: Math.min(size, b.length - body) };
    off = body + size + (size & 1);
  }
  if (!fmt || !data) throw new Error(`${file}: no fmt or data chunk`);
  const { tag, channels, sr, bits } = fmt, bps = bits / 8, frames = Math.floor(data.size / (bps * channels));
  const ch = Array.from({ length: channels }, () => new Float32Array(frames));
  for (let i = 0, p = data.at; i < frames; i++) {
    for (let c = 0; c < channels; c++, p += bps) {
      let v;
      if (tag === 3) v = bits === 64 ? b.readDoubleLE(p) : b.readFloatLE(p);
      else if (bits === 16) v = b.readInt16LE(p) / 32768;
      else if (bits === 24) v = b.readIntLE(p, 3) / 8388608;
      else if (bits === 32) v = b.readInt32LE(p) / 2147483648;
      else if (bits === 8) v = (b[p] - 128) / 128;
      else throw new Error(`${file}: ${bits}-bit PCM not read`);
      ch[c][i] = v;
    }
  }
  return { sr, ch, frames, bits, float: tag === 3 };
}

// ch: array of Float32Array (one per channel); 16-bit PCM unless float (32-bit IEEE)
export function writeWav(file, ch, sr, { float = false } = {}) {
  const C = ch.length, n = ch[0].length, bps = float ? 4 : 2, size = n * C * bps;
  const b = Buffer.alloc(44 + size);
  b.write('RIFF', 0, 'ascii'); b.writeUInt32LE(36 + size, 4); b.write('WAVE', 8, 'ascii');
  b.write('fmt ', 12, 'ascii'); b.writeUInt32LE(16, 16); b.writeUInt16LE(float ? 3 : 1, 20); b.writeUInt16LE(C, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * C * bps, 28); b.writeUInt16LE(C * bps, 32); b.writeUInt16LE(bps * 8, 34);
  b.write('data', 36, 'ascii'); b.writeUInt32LE(size, 40);
  let p = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < C; c++) {
    const v = ch[c][i];
    if (float) { b.writeFloatLE(v, p); p += 4; }
    else { const s = Math.max(-1, Math.min(1, v)); b.writeInt16LE(Math.round(s < 0 ? s * 32768 : s * 32767), p); p += 2; }
  }
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, b);
}

// ------------------------------------------------------------------------------------------------ DSP pieces
function fft(re, im) { // in place, radix 2
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), h = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < h; k++) {
        const a = i + k, b2 = a + h;
        const tr = re[b2] * cr - im[b2] * ci, ti = re[b2] * ci + im[b2] * cr;
        re[b2] = re[a] - tr; im[b2] = im[a] - ti; re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}
const hann = (n) => Float64Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / n));
// power spectra of frames of x: calls fn(frameIndex, power Float64Array of n/2+1)
function stft(x, n, hop, fn) {
  const w = hann(n), re = new Float64Array(n), im = new Float64Array(n), P = new Float64Array(n / 2 + 1);
  const frames = Math.max(0, Math.floor((x.length - n) / hop) + 1);
  for (let f = 0; f < frames; f++) {
    const o = f * hop;
    for (let i = 0; i < n; i++) { re[i] = x[o + i] * w[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k <= n / 2; k++) P[k] = re[k] * re[k] + im[k] * im[k];
    fn(f, P);
  }
  return frames;
}
// RBJ biquad, direct form I, returns a new array
function biquad(x, [b0, b1, b2, a0, a1, a2]) {
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i], o = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = v; y2 = y1; y1 = o; y[i] = o;
  }
  return y;
}
// BS.1770 K-weighting at any rate: the high shelf (+4 dB above ~1.7 kHz) and the RLB high-pass (~38 Hz), designed
// from their analogue prototypes as libebur128 does (at 48 kHz these are the standard's own coefficients)
function kWeight(x, sr) {
  let f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196;
  let K = Math.tan(Math.PI * f0 / sr);
  const Vh = 10 ** (G / 20), Vb = Vh ** 0.4996667741545416, a0 = 1 + K / Q + K * K;
  const shelf = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0, 1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0];
  f0 = 38.13547087602444; Q = 0.5003270373238773; K = Math.tan(Math.PI * f0 / sr);
  const d = 1 + K / Q + K * K;
  const hp = [1, -2, 1, 1, 2 * (K * K - 1) / d, (1 - K / Q + K * K) / d];
  return biquad(biquad(x, shelf), hp);
}
const bandpass = (f, Q, sr) => { const w = 2 * Math.PI * f / sr, al = Math.sin(w) / (2 * Q), c = Math.cos(w); return [al, 0, -al, 1 + al, -2 * c, 1 - al]; };
const db = (p) => 10 * Math.log10(Math.max(p, 1e-30));
const median = (a) => { if (!a.length) return 0; const s = Float64Array.from(a).sort(); const m = s.length >> 1; return s.length & 1 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (a, q) => { const s = Float64Array.from(a).sort(); if (!s.length) return null; const i = (s.length - 1) * q, lo = Math.floor(i); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (i - lo); };
const r = (v, d = 1) => (v == null || !Number.isFinite(v) ? v : +v.toFixed(d));

// ------------------------------------------------------------------------------------------------ loudness
function loudness(ch, sr) {
  const kw = ch.map((c) => kWeight(c, sr)), n = ch[0].length;
  // per channel, the running sum of squares, so any block's mean square is two lookups
  const cs = kw.map((k) => { const s = new Float64Array(n + 1); for (let i = 0; i < n; i++) s[i + 1] = s[i] + k[i] * k[i]; return s; });
  const blocks = (len) => {
    const L = Math.round(len * sr), hop = Math.round(0.1 * sr), out = [];
    for (let o = 0; o + L <= n; o += hop) { let z = 0; for (const s of cs) z += (s[o + L] - s[o]) / L; out.push(z); }
    return out; // summed channel mean squares (G = 1 for every channel: no surround weights)
  };
  const lk = (z) => -0.691 + db(z);
  const mom = blocks(0.4), st = blocks(3);
  const abs = mom.filter((z) => lk(z) > -70);
  let lufsI = null;
  if (abs.length) {
    const rel = lk(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
    const g = abs.filter((z) => lk(z) > rel);
    lufsI = g.length ? lk(g.reduce((a, b) => a + b, 0) / g.length) : null;
  }
  const stL = st.map(lk);
  // EBU Tech 3342: short-term blocks above -70 LUFS, then above the gated mean less 20 LU; P95 - P10
  let lra = null;
  const sAbs = st.filter((z) => lk(z) > -70);
  if (sAbs.length) {
    const rel = lk(sAbs.reduce((a, b) => a + b, 0) / sAbs.length) - 20;
    const g = sAbs.map(lk).filter((v) => v > rel);
    if (g.length) lra = pct(g, 0.95) - pct(g, 0.1);
  }
  return {
    lufs_i: lufsI, lufs_s_max: stL.length ? Math.max(...stL) : (mom.length ? Math.max(...mom.map(lk)) : null), lra,
    silence_pct: mom.length ? 100 * mom.filter((z) => lk(z) < -60).length / mom.length : 100,
    momentary: mom.map(lk), short: stL,
  };
}

// ------------------------------------------------------------------------------------------------ spectrum
function spectral(mono, sr) {
  const N = 2048, hop = 1024, bin = sr / N;
  let eS = 0, eRef = 0, eHf = 0, eTot = 0, cSum = 0, cN = 0;
  stft(mono, N, hop, (f, P) => {
    let num = 0, den = 0;
    for (let k = 1; k <= N / 2; k++) {
      const fr = k * bin, p = P[k];
      if (fr >= 20) { den += p; num += p * fr; eTot += p; }
      if (fr >= 2000 && fr < 5000) eS += p;
      if (fr >= 100 && fr < 8000) eRef += p;
      if (fr >= 6000) eHf += p;
    }
    // a frame counts toward the centroid when it is above -90 dBFS (a full-scale Hann frame's power is ~N^2/16)
    if (den > (N * N / 16) * 1e-9) { cSum += num / den; cN++; }
  });
  return { centroid_hz: cN ? cSum / cN : null, sharp_db: eRef > 0 ? db(eS / eRef) : null, hf_db: eTot > 0 ? db(eHf / eTot) : null };
}

// Roughness proxy: in each octave band (125 Hz-8 kHz) the power envelope (1 ms mean squares), its modulation spectrum
// over ~3 s Hann segments averaged, and the energy of the spectral lines at 15-300 Hz (bins over 3x the local median,
// less that floor) over the envelope's mean squared; summed over bands weighted by each band's share of the energy.
// Steady or randomly fluctuating noise reads near 0; a tone AM'd at 70 Hz at full depth ~0.9; square gating high.
function roughness(mono, sr) {
  const dec = Math.max(1, Math.round(sr / 1378)), esr = sr / dec, M = 4096, step = M / 2;
  const w = hann(M); let w2 = 0; for (const v of w) w2 += v * v;
  const bands = [125, 250, 500, 1000, 2000, 4000, 8000].filter((f) => f * 1.41 < sr / 2);
  let tot = 0, acc = 0;
  for (const fc of bands) {
    const y = biquad(mono, bandpass(fc, 1.41, sr));
    const ne = Math.floor(y.length / dec), e = new Float64Array(ne);
    for (let i = 0; i < ne; i++) { let s = 0; for (let j = 0; j < dec; j++) { const v = y[i * dec + j]; s += v * v; } e[i] = s / dec; }
    let mean = 0; for (const v of e) mean += v; mean /= ne || 1;
    if (!(mean > 1e-14) || ne < M) continue;
    const P = new Float64Array(M / 2 + 1), re = new Float64Array(M), im = new Float64Array(M); let segs = 0;
    for (let o = 0; o + M <= ne; o += step) {
      let m = 0; for (let i = 0; i < M; i++) m += e[o + i]; m /= M;
      for (let i = 0; i < M; i++) { re[i] = (e[o + i] - m) * w[i]; im[i] = 0; }
      fft(re, im);
      for (let k = 0; k <= M / 2; k++) P[k] += 2 * (re[k] * re[k] + im[k] * im[k]) / (M * w2);
      segs++;
    }
    for (let k = 0; k <= M / 2; k++) P[k] /= segs;
    const df = esr / M, half = Math.round(5 / df);
    let line = 0;
    for (let k = Math.ceil(15 / df); k <= Math.min(M / 2, Math.floor(300 / df)); k++) {
      const nb = []; for (let j = k - half; j <= k + half; j++) if (j > 0 && j <= M / 2 && Math.abs(j - k) > 2) nb.push(P[j]);
      const fl = median(nb);
      if (P[k] > 3 * fl) line += P[k] - fl;
    }
    const m = line / (mean * mean);
    tot += mean; acc += mean * Math.min(m, 2);
  }
  return tot > 0 ? acc / tot : 0;
}

// ------------------------------------------------------------------------------------------------ clicks and seams
// Discontinuities are found in the signal's linear-prediction residual: an order-16 predictor fitted to every 1024
// samples (Hann-windowed autocorrelation, Levinson-Durbin) whitens the signal, so a filtered noise bed's residual is
// near-white and a sample jump (a loop seam, a gain step), even one smoothed by a filter downstream, stands out as a
// spike. A candidate is a residual sample more than 5x the residual's RMS over the 20 ms round it (the 2 ms at the
// centre left out), above -90 dBFS, with no onset round it (the signal's level in the 20 ms after within 10 dB of the
// 20 ms before). A click is a candidate over 8x, or one on a seam (below). Candidates within 5 ms merge.
function lpcResidual(x, order = 16, N = 1024, hop = 512) {
  const n = x.length, e = new Float64Array(n), w = hann(N), a = new Float64Array(order + 1), r = new Float64Array(order + 1), tmp = new Float64Array(order + 1);
  for (let o = 0; o < n; o += hop) {
    const c0 = Math.max(0, o - (N - hop) / 2), c1 = Math.min(n, c0 + N);
    for (let k = 0; k <= order; k++) { let s = 0; for (let i = c0 + k; i < c1; i++) s += x[i] * w[i - c0] * x[i - k] * w[i - k - c0]; r[k] = s; }
    a.fill(0); a[0] = 1;
    if (r[0] > 1e-20) {
      r[0] *= 1 + 1e-9; let err = r[0];
      for (let i = 1; i <= order; i++) {
        let acc = r[i]; for (let j = 1; j < i; j++) acc += a[j] * r[i - j];
        const k = -acc / err; tmp.set(a);
        for (let j = 1; j < i; j++) a[j] = tmp[j] + k * tmp[i - j];
        a[i] = k; err *= 1 - k * k; if (err <= 0) break;
      }
    }
    for (let i = o; i < Math.min(n, o + hop); i++) { let s = x[i]; for (let j = 1; j <= order && i - j >= 0; j++) s += a[j] * x[i - j]; e[i] = s; }
  }
  return e;
}
function discontinuities(ch, sr) {
  const B = Math.max(8, Math.round(sr / 1000)), found = [];
  for (const x of ch) {
    const n = x.length, nb = Math.floor(n / B), res = lpcResidual(x);
    const bms = new Float64Array(nb), bpk = new Float64Array(nb), bpi = new Int32Array(nb), xms = new Float64Array(nb);
    for (let k = 0; k < nb; k++) {
      let s = 0, pk = 0, pi = 0, sx = 0;
      for (let i = k * B; i < (k + 1) * B; i++) { const v = res[i]; s += v * v; if (Math.abs(v) > pk) { pk = Math.abs(v); pi = i; } sx += x[i] * x[i]; }
      bms[k] = s / B; bpk[k] = pk; bpi[k] = pi; xms[k] = sx / B;
    }
    for (let k = 20; k < nb - 21; k++) {
      if (bpk[k] < 3e-5) continue;
      let s = 0, c = 0; for (let j = k - 10; j <= k + 10; j++) if (Math.abs(j - k) > 1) { s += bms[j]; c++; }
      const ref = Math.sqrt(s / c);
      if (bpk[k] <= 5 * ref) continue;
      let pre = 0, post = 0; for (let j = 2; j <= 21; j++) { pre += xms[k - j]; post += xms[k + j]; }
      if (db(post) - db(pre) > 10) continue; // an onset, not a click
      found.push({ t: bpi[k] / sr, ratio: bpk[k] / Math.max(ref, 1e-12), dbfs: 20 * Math.log10(bpk[k]) });
    }
  }
  found.sort((a, b) => a.t - b.t);
  const merged = [];
  for (const c of found) { const l = merged[merged.length - 1]; if (l && c.t - l.t < 0.005) { if (c.ratio > l.ratio) Object.assign(l, c); } else merged.push({ ...c }); }
  return merged;
}
// The period at which discontinuities repeat (a loop seam): the candidate period (every difference between two of the
// 300 strongest, 0.3-15 s) that the most of them agree with (another at +-1..4 periods within 1.5 ms); at least three
// must agree. Repeated for a second and third seam on what the first does not explain.
function seams(times, dur) {
  const out = []; let left = times.slice();
  const agree = (t, P, set) => [1, 2, 3, 4].some((k) => set.some((u) => Math.abs(Math.abs(u - t) - k * P) < 0.0015));
  for (let pass = 0; pass < 3 && left.length >= 3; pass++) {
    let best = null;
    for (let i = 0; i < left.length; i++) for (let j = i + 1; j < left.length; j++) {
      const P = left[j] - left[i]; if (P < 0.3 || P > Math.min(15, dur / 2)) continue;
      if (best && Math.abs(P - best.P) < 0.0005) continue;
      const hits = left.filter((t) => agree(t, P, left));
      if (!best || hits.length > best.hits.length || (hits.length === best.hits.length && P < best.P)) best = { P, hits };
    }
    if (!best || best.hits.length < 3) break;
    const h = best.hits, est = [];
    for (let i = 1; i < h.length; i++) { const k = Math.round((h[i] - h[i - 1]) / best.P); if (k >= 1 && Math.abs(h[i] - h[i - 1] - k * best.P) < 0.0015) est.push((h[i] - h[i - 1]) / k); }
    out.push({ period: est.length ? est.reduce((a, b) => a + b, 0) / est.length : best.P, hits: h.length, times: h });
    left = left.filter((t) => !h.includes(t));
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ onsets
// Spectral flux in ~20 log bands (each at least 4 bins wide), 2048-point frames every 512 samples. Each band's rise
// over its own mean 35-140 ms before is divided by that rise's robust spread over the file (1.48 x MAD, at least
// 0.5 dB), so a band that always fluctuates (low bins, gusts) must rise further; novelty is the sum over bands of the
// part above 2 spreads. An onset is a novelty peak, the largest within 60 ms, over 10 and over the median of the 3 s
// round it plus 3 MADs. Onsets within 80 ms merge.
function onsets(mono, sr) {
  const N = 2048, hop = 512, bin = sr / N, edges = [];
  let f = 40; edges.push(Math.round(f / bin));
  while (true) { const k = Math.max(edges[edges.length - 1] + 4, Math.round(f * 1.32 / bin)); f = k * bin; if (f > Math.min(16000, sr / 2 - bin)) break; edges.push(k); }
  const nb = edges.length - 1, L = [];
  stft(mono, N, hop, (fi, P) => {
    const row = new Float64Array(nb);
    for (let b = 0; b < nb; b++) { let s = 0; for (let k = edges[b]; k < edges[b + 1]; k++) s += P[k]; row[b] = Math.max(db(s / (N * N / 16)), -100); }
    L.push(row);
  });
  const T = L.length, D = Array.from({ length: nb }, () => new Float64Array(T));
  for (let t = 12; t < T; t++) for (let b = 0; b < nb; b++) { let m = 0; for (let j = t - 12; j <= t - 3; j++) m += L[j][b]; D[b][t] = L[t][b] - m / 10; }
  const sig = D.map((d) => { const a = Array.from(d.subarray(12)), md = median(a); return Math.max(0.5, 1.4826 * median(a.map((v) => Math.abs(v - md)))); });
  const nov = new Float64Array(T);
  for (let t = 12; t < T; t++) { let s = 0; for (let b = 0; b < nb; b++) { if (L[t][b] <= -95) continue; const z = D[b][t] / sig[b] - 2; if (z > 0) s += z; } nov[t] = s; }
  const W = Math.round(1.5 * sr / hop), pk = Math.round(0.06 * sr / hop), times = [];
  for (let t = 12; t < T; t++) {
    if (nov[t] <= 10) continue;
    let isMax = true; for (let j = Math.max(0, t - pk); j <= Math.min(T - 1, t + pk); j++) if (nov[j] > nov[t] || (nov[j] === nov[t] && j < t)) { isMax = false; break; }
    if (!isMax) continue;
    const win = Array.from(nov.subarray(Math.max(12, t - W), Math.min(T, t + W)));
    const med = median(win), mad = median(win.map((v) => Math.abs(v - med)));
    if (nov[t] > med + 3 * mad) {
      const tt = (t * hop + N / 2) / sr;
      if (!times.length || tt - times[times.length - 1] > 0.08) times.push(tt);
    }
  }
  times.levels = L; times.hop = hop / sr; times.frame0 = N / 2 / sr;
  return times;
}

// Repetition: a looped buffer makes the bed repeat itself exactly, whether or not its seam clicks. Each onset band's
// level (11.6 ms frames) less its own 1 s moving average, frames within logged events masked (a step 20 ms before to
// 250 ms after, a one-shot voice to 1 s after); the normalised correlation of that picture with itself at every lag from
// 1 to 15 s (at least 4 s of overlap). Independent noise reads ~0; a bed with a 7 s loop at its whole level ~1.
// Reported as repeat_s (the shortest lag within 85 % of the highest peak) when that correlation is 0.2 or more.
function repetition(times, events, dur) {
  const L = times.levels, T = L.length, nb = T ? L[0].length : 0, hop = times.hop, half = Math.round(0.5 / hop);
  if (T < 2 * half + 10) return null;
  const X = Array.from({ length: T }, () => new Float64Array(nb)), ok = new Uint8Array(T).fill(1);
  for (let b = 0; b < nb; b++) {
    let acc = 0; const pre = new Float64Array(T + 1); for (let t = 0; t < T; t++) { acc += L[t][b]; pre[t + 1] = acc; }
    for (let t = 0; t < T; t++) { const a = Math.max(0, t - half), z = Math.min(T, t + half + 1); X[t][b] = L[t][b] > -95 ? L[t][b] - (pre[z] - pre[a]) / (z - a) : 0; }
  }
  for (const e of events || []) {
    const [a, z] = e.kind === 'step' ? [e.t - 0.02, e.t + 0.25] : e.kind === 'voice' ? [e.t - 0.02, e.t + 1] : [0, -1];
    for (let t = Math.max(0, Math.floor((a - times.frame0) / hop)); t <= Math.min(T - 1, Math.ceil((z - times.frame0) / hop)); t++) ok[t] = 0;
  }
  const kMin = Math.round(1 / hop), kMax = Math.min(Math.round(15 / hop), T - Math.round(4 / hop));
  let best = null; const rs = new Float64Array(kMax + 2).fill(-1);
  for (let k = kMin; k <= kMax; k++) {
    let xy = 0, xx = 0, yy = 0, n = 0;
    for (let t = 0; t + k < T; t++) {
      if (!ok[t] || !ok[t + k]) continue;
      const a = X[t], c = X[t + k];
      for (let b = 0; b < nb; b++) { xy += a[b] * c[b]; xx += a[b] * a[b]; yy += c[b] * c[b]; }
      n++;
    }
    if (n * hop < 4 || !(xx > 0 && yy > 0)) continue;
    const r = xy / Math.sqrt(xx * yy); rs[k] = r;
    if (!best || r > best.r) best = { k, r };
  }
  if (!best) return null;
  // a loop correlates at every multiple of its period: the shortest local peak within 85 % of the best is the period
  for (let k = kMin; k < best.k; k++) if (rs[k] >= 0.85 * best.r && rs[k] >= rs[k - 1] && rs[k] >= rs[k + 1]) { best = { k, r: rs[k] }; break; }
  return { period: best.k * hop, r: best.r };
}

// ------------------------------------------------------------------------------------------------ the whole report
export function measure(wav, { log = null } = {}) {
  const { sr, ch } = wav, n = ch[0].length, dur = n / sr;
  const mono = new Float64Array(n); for (const c of ch) for (let i = 0; i < n; i++) mono[i] += c[i] / ch.length;
  let peak = 0, ss = 0; for (const c of ch) for (let i = 0; i < n; i++) { const v = Math.abs(c[i]); if (v > peak) peak = v; ss += v * v; }
  const rms = Math.sqrt(ss / (n * ch.length));
  const ld = loudness(ch, sr), sp = spectral(mono, sr), all = onsets(mono, sr);
  // a discontinuity from 20 ms before to 120 ms after an event the render logged (a step, a cue, a voice's start) is
  // that sound's own attack: not a click (a cue whose attack is a click shows on its own render, without a log)
  const logged = (log?.events || []).filter((e) => e.kind === 'step' || e.kind === 'cue' || e.kind === 'voice').map((e) => e.t);
  const disc = discontinuities(ch, sr).filter((c) => !logged.some((t) => c.t >= t - 0.02 && c.t <= t + 0.12));
  const rep = repetition(all, log?.events, dur);
  const sm = seams(disc.slice().sort((a, b) => b.ratio - a.ratio).slice(0, 300).map((c) => c.t).sort((a, b) => a - b), dur);
  // a click: a discontinuity over 8x, or a weaker one that repeats at a seam's period
  const onSeam = new Set(sm.flatMap((s) => s.times)), cl = disc.filter((c) => c.ratio > 8 || onSeam.has(c.t));
  // the walker's own steps (and, when asked, the render's own fired cues) are not the world's events
  const steps = (log?.events || []).filter((e) => e.kind === 'step').map((e) => e.t);
  const isStep = (t) => steps.some((s) => t >= s - 0.05 && t <= s + 0.2);
  const ev = all.filter((t) => !isStep(t));
  const gaps = []; for (let i = 1; i < ev.length; i++) gaps.push(ev[i] - ev[i - 1]);
  const gapMax = ev.length ? Math.max(ev[0], dur - ev[ev.length - 1], ...gaps) : dur;
  return {
    file: wav.file, seconds: r(dur, 2), sample_rate: sr, channels: ch.length,
    lufs_i: r(ld.lufs_i), lufs_s_max: r(ld.lufs_s_max), lra: r(ld.lra),
    peak_dbfs: r(peak > 0 ? 20 * Math.log10(peak) : -Infinity), crest_db: r(rms > 0 ? 20 * Math.log10(peak / rms) : null),
    centroid_hz: r(sp.centroid_hz, 0), sharp_db: r(sp.sharp_db), rough: r(roughness(mono, sr), 3), hf_db: r(sp.hf_db),
    clicks: cl.length, seam_s: sm.length ? r(sm[0].period, 3) : null, repeat_s: rep && rep.r >= 0.2 ? r(rep.period, 2) : null,
    onsets_pm: r(ev.length / (dur / 60)), gap_max_s: r(gapMax), gap_min_s: gaps.length ? r(Math.min(...gaps), 2) : null,
    silence_pct: r(ld.silence_pct),
    detail: {
      click_times: cl.map((c) => ({ t: r(c.t, 4), ratio: r(c.ratio), dbfs: r(c.dbfs) })), seams: sm.map((s) => ({ period: r(s.period, 4), hits: s.hits })), candidates: disc.length,
      repeat: rep && { period: r(rep.period, 3), r: r(rep.r, 3) },
      onset_times: ev.map((t) => r(t, 2)), step_onsets: all.length - ev.length, steps_logged: steps.length,
      short_term: ld.short.filter((_, i) => i % 10 === 0).map((v) => r(v)), // one a second
    },
  };
}
export const METRICS = ['lufs_i', 'lufs_s_max', 'lra', 'peak_dbfs', 'crest_db', 'centroid_hz', 'sharp_db', 'rough', 'hf_db', 'clicks', 'seam_s', 'repeat_s', 'onsets_pm', 'gap_max_s', 'gap_min_s', 'silence_pct'];

// ------------------------------------------------------------------------------------------------ PNG
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function encodePng(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy ? rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3) : raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1); }
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}
// a 3x5 bitmap font, drawn at 2x
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
  '-': '000000111000000', '.': '000000000000010', ':': '000010000010000', '/': '001001010100100', '+': '000010111010000',
  ',': '000000000010100', '=': '000111000111000', '>': '100010001010100', '_': '000000000000111', '(': '010100100100010', ')': '010001001001010', ' ': '000000000000000',
};
class Canvas {
  constructor(w, h, bg = [0, 0, 0]) { this.w = w; this.h = h; this.px = Buffer.alloc(w * h * 3); for (let i = 0; i < w * h; i++) this.px.set(bg, i * 3); }
  set(x, y, c) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.px[(y * this.w + x) * 3] = c[0]; this.px[(y * this.w + x) * 3 + 1] = c[1]; this.px[(y * this.w + x) * 3 + 2] = c[2]; }
  text(x, y, s, c = [230, 230, 230], sc = 2) {
    for (const ch of String(s).toUpperCase()) { const g = FONT[ch] || FONT[' ']; for (let i = 0; i < 15; i++) if (g[i] === '1') for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) this.set(x + (i % 3) * sc + a, y + Math.floor(i / 3) * sc + b, c); x += 4 * sc; }
    return x;
  }
  vline(x, y0, y1, c) { for (let y = y0; y <= y1; y++) this.set(x, y, c); }
  hline(x0, x1, y, c) { for (let x = x0; x <= x1; x++) this.set(x, y, c); }
  blit(o, ox, oy) { for (let y = 0; y < o.h; y++) o.px.copy(this.px, ((oy + y) * this.w + ox) * 3, y * o.w * 3, (y + 1) * o.w * 3); }
}
const STOPS = [[0, [0, 0, 0]], [0.15, [20, 8, 52]], [0.35, [100, 20, 110]], [0.55, [190, 50, 70]], [0.75, [245, 130, 20]], [0.9, [250, 220, 90]], [1, [255, 255, 255]]];
function colour(t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < STOPS.length; i++) if (t <= STOPS[i][0]) { const [a, ca] = STOPS[i - 1], [b, cb] = STOPS[i], k = (t - a) / (b - a); return ca.map((v, j) => Math.round(v + (cb[j] - v) * k)); }
  return STOPS[STOPS.length - 1][1];
}
const SPEC = { fmin: 40, fmax: 16000, H: 512, pxPerS: 80, dbLo: -90, dbHi: -20, left: 44, top: 60, bottom: 18 };
// One panel: title, the cue log's events along the top, the log-frequency spectrogram, 1 s ticks.
export function spectrogramPanel(wav, { log = null, title = '' } = {}) {
  const { sr, ch } = wav, n = ch[0].length, N = 4096, hop = Math.round(sr / SPEC.pxPerS);
  const mono = new Float64Array(n + N); for (const c of ch) for (let i = 0; i < n; i++) mono[i + N / 2] += c[i] / ch.length;
  const cols = Math.max(1, Math.floor(n / hop)), H = SPEC.H, W = cols;
  const cv = new Canvas(SPEC.left + W + 8, SPEC.top + H + SPEC.bottom, [12, 12, 16]);
  const bin = sr / N, ref = (N / 4) ** 2;  // a full-scale sine reads 0 dB
  const rows = Array.from({ length: H }, (_, y) => { // y 0 is the top (fmax)
    const f0 = SPEC.fmin * (SPEC.fmax / SPEC.fmin) ** ((H - 1 - y) / H), f1 = SPEC.fmin * (SPEC.fmax / SPEC.fmin) ** ((H - y) / H);
    return [f0 / bin, f1 / bin];
  });
  stft(mono, N, hop, (x, P) => {
    if (x >= W) return;
    for (let y = 0; y < H; y++) {
      const [k0, k1] = rows[y]; let p;
      if (Math.floor(k1) > Math.floor(k0) + 0) { p = 0; for (let k = Math.ceil(k0); k <= Math.floor(k1); k++) p = Math.max(p, P[k]); }
      else { const k = (k0 + k1) / 2, a = Math.floor(k), fr = k - a; p = P[a] * (1 - fr) + (P[a + 1] || 0) * fr; }
      const d = db(p / ref);
      cv.set(SPEC.left + x, SPEC.top + y, colour((d - SPEC.dbLo) / (SPEC.dbHi - SPEC.dbLo)));
    }
  });
  const yOf = (f) => SPEC.top + Math.round(H - 1 - H * Math.log(f / SPEC.fmin) / Math.log(SPEC.fmax / SPEC.fmin));
  for (const [f, lab] of [[50, '50'], [100, '100'], [200, '200'], [500, '500'], [1000, '1K'], [2000, '2K'], [5000, '5K'], [10000, '10K']]) {
    const y = yOf(f); cv.hline(SPEC.left - 5, SPEC.left - 1, y, [160, 160, 160]); cv.text(2, y - 4, lab, [160, 160, 160]);
    if (f === 2000 || f === 5000) for (let x = SPEC.left; x < SPEC.left + W; x += 6) cv.set(x, y, [90, 200, 255]); // the sharpness band's edges
  }
  const xOf = (t) => SPEC.left + Math.round(t * SPEC.pxPerS);
  for (let s = 0; s * SPEC.pxPerS <= W; s++) { const x = xOf(s); cv.vline(x, SPEC.top + H, SPEC.top + H + 4, [200, 200, 200]); if (s % 5 === 0) cv.text(x - 3, SPEC.top + H + 6, s, [200, 200, 200]); }
  cv.text(SPEC.left, 2, title.slice(0, Math.floor((cv.w - SPEC.left) / 8)), [240, 240, 240]);
  // the cue log: gutters as a bar, steps as short grey ticks, cues and voices as labelled ticks (three rows)
  const evs = log?.events || [];
  for (const e of evs.filter((e) => e.kind === 'gutter')) { const x0 = xOf(e.t), x1 = xOf(e.t + (e.len || 0)); for (let x = x0; x <= x1; x++) for (let y = SPEC.top - 6; y < SPEC.top - 2; y++) cv.set(x, y, [230, 60, 230]); cv.text(x0 + 2, SPEC.top - 17, 'GUTTER', [230, 60, 230]); }
  for (const e of evs.filter((e) => e.kind === 'step')) cv.vline(xOf(e.t), SPEC.top, SPEC.top + 5, [150, 150, 150]);
  // cues that made a voice are labelled by the voice (name and metres); a cue call that made none (out of range, or
  // sounding on a node of its own) is a short tick; a voice no cue call made (a bed's own one-shot) is labelled 'v'
  const voices = evs.filter((e) => e.kind === 'voice');
  for (const e of evs.filter((e) => e.kind === 'cue')) if (!voices.some((v) => v.name === e.name && v.t >= e.t - 0.01 && v.t <= e.t + 0.3)) cv.vline(xOf(e.t), SPEC.top - 10, SPEC.top - 7, [70, 120, 140]);
  const lastEnd = [0, 0, 0];
  for (const e of voices) {
    const x = xOf(e.t), lab = (e.name || 'v') + (e.d != null ? ' ' + Math.round(e.d) : '');
    let row = lastEnd.findIndex((end) => end < x); if (row < 0) row = lastEnd.indexOf(Math.min(...lastEnd));
    const y = 14 + row * 10, c = e.name ? [90, 230, 255] : [140, 200, 140];
    cv.vline(x, y + 10, SPEC.top + 8, c);
    lastEnd[row] = cv.text(x + 2, y, lab, c) + 4;
  }
  return cv;
}
export function writeSpectrogram(file, panels) {
  const W = Math.max(...panels.map((p) => p.w)), H = panels.reduce((a, p) => a + p.h, 0) + (panels.length - 1) * 6;
  const cv = new Canvas(W, H, [40, 40, 48]); let y = 0;
  for (const p of panels) { cv.blit(p, 0, y); y += p.h + 6; }
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, encodePng(W, H, cv.px));
}

// ------------------------------------------------------------------------------------------------ CLI
export function loadLog(wavFile) { try { return JSON.parse(fs.readFileSync(wavFile.replace(/\.wav$/i, '') + '.json', 'utf8')); } catch { return null; } }
export function analyse(file) { const wav = readWav(file); wav.file = file; const log = loadLog(file); return { wav, log, m: measure(wav, { log }) }; }
const fmt = (v) => (v == null ? 'none' : typeof v === 'number' ? String(v) : String(v));
export function headline(m) { return `${path.basename(m.file || '')}  ${m.lufs_i} LUFS  s-max ${m.lufs_s_max}  pk ${m.peak_dbfs}  sharp ${m.sharp_db}  rough ${m.rough}  clicks ${m.clicks}${m.seam_s ? ' seam ' + m.seam_s : ''}  onsets ${m.onsets_pm}/min`; }

async function main() {
  const args = process.argv.slice(2), opt = {}, files = [];
  for (const a of args) { const m = a.match(/^--([^=]+)(?:=(.*))?$/); if (m) opt[m[1]] = m[2] ?? true; else files.push(a); }
  if (!files.length) { console.error('usage: node tools/audio-metrics.mjs a.wav [--spectrogram=a.png] [--json] [--clicks] [--baseline=before.wav]'); process.exit(2); }
  const A = analyse(files[0]);
  if (opt.baseline) {
    const B = analyse(opt.baseline);
    console.log(`metric        before → after (delta)   [${path.basename(opt.baseline)} → ${path.basename(files[0])}]`);
    for (const k of METRICS) {
      const b = B.m[k], a = A.m[k], d = typeof a === 'number' && typeof b === 'number' ? (a - b >= 0 ? '+' : '') + (+(a - b).toFixed(3)) : '';
      console.log(`${k.padEnd(13)} ${fmt(b).padStart(8)} → ${fmt(a).padEnd(8)} ${d}`);
    }
    const out = typeof opt.spectrogram === 'string' ? opt.spectrogram : files[0].replace(/\.wav$/i, '') + '.compare.png';
    writeSpectrogram(out, [spectrogramPanel(B.wav, { log: B.log, title: 'BEFORE ' + headline(B.m) }), spectrogramPanel(A.wav, { log: A.log, title: 'AFTER ' + headline(A.m) })]);
    console.log('spectrograms (before above, after below):', out);
  } else {
    const { detail, ...flat } = A.m;
    for (const k of METRICS) console.log(`${k.padEnd(13)} ${fmt(flat[k])}`);
    if (detail.seams.length > 1) console.log(`seams         ${detail.seams.map((s) => `${s.period} s (${s.hits} hits)`).join(', ')}`);
    if (detail.repeat) console.log(`repeat        best self-correlation ${detail.repeat.r} at ${detail.repeat.period} s (reported from 0.2)`);
    if (detail.steps_logged) console.log(`steps         ${detail.steps_logged} logged, ${detail.step_onsets} onsets left out as steps`);
    if (opt.clicks) for (const c of detail.click_times) console.log(`click         ${c.t} s  ${c.ratio}x local  ${c.dbfs} dBFS`);
    if (opt.spectrogram) {
      const out = typeof opt.spectrogram === 'string' ? opt.spectrogram : files[0].replace(/\.wav$/i, '') + '.png';
      writeSpectrogram(out, [spectrogramPanel(A.wav, { log: A.log, title: headline(A.m) })]);
      console.log('spectrogram:', out);
    }
  }
  if (opt.json) { const out = files[0].replace(/\.wav$/i, '') + '.metrics.json'; fs.writeFileSync(out, JSON.stringify(A.m, null, 1)); console.log('json:', out); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
