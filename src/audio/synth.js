// Audio building blocks: noise buffers, generated reverb impulses (makeSpace, v7.2-05: one per kind of place;
// makeImpulse, the old single room, kept for any caller), and small voice helpers.
// A looped noise buffer, n samples a channel. The loop seam is a true crossfade: the noise is made f samples past the
// end (the same filter state, on a local stream so the caller's rand draws exactly n a channel), and that continuation
// is faded into the first f samples on equal-power weights. So the sample after d[n - 1] at the wrap is d[0], the
// continuation's first sample, as if the noise had run on, and by d[f] it is the buffer's own noise again.
// f is 0.1 s (4800 samples at 48 kHz), at most a quarter of the buffer.
export function makeNoiseBuffer(ac, seconds, kind, rand) {
  const n = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(2, n, ac.sampleRate);
  const f = Math.min(Math.round(ac.sampleRate * 0.1), n >> 2);
  const tail = new Float32Array(f);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let b = 0, p0 = 0, p1 = 0, p2 = 0;
    let s = (0x9e3779b9 ^ (n * 31 + c * 7 + kind.length)) >>> 0; // the continuation's own stream (xorshift32)
    const local = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    for (let i = 0; i < n + f; i++) {
      const w = (i < n ? rand() : local()) * 2 - 1;
      let x;
      if (kind === 'brown') { b = (b + 0.02 * w) / 1.02; x = b * 3.5; }
      else if (kind === 'pink') { p0 = 0.99765 * p0 + w * 0.099046; p1 = 0.963 * p1 + w * 0.2965164; p2 = 0.57 * p2 + w * 1.0526913; x = (p0 + p1 + p2 + w * 0.1848) * 0.2; }
      else x = w;
      if (i < n) d[i] = x; else tail[i - n] = x;
    }
    // crossfade the loop seam: the head fades in over the continuation of the tail
    for (let i = 0; i < f; i++) { const k = (i + 0.5) / f * Math.PI / 2; d[i] = d[i] * Math.sin(k) + tail[i] * Math.cos(k); }
  }
  return buf;
}

export function makeImpulse(ac, seconds, decay, rand) {
  const n = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(2, n, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const k = 0.55 - 0.45 * t; // darker as it decays
      lp += ((rand() * 2 - 1) - lp) * k;
      d[i] = lp * Math.pow(1 - t, decay) * (i < 400 ? i / 400 : 1);
    }
  }
  return buf;
}

// v7.2-05: a room's impulse, generated. o: { rt60 (s, the tail's fall to -60 dB), len (s, the buffer; default rt60),
// pre (s, the gap before the first reflection), early: [count, from s, to s, level] (discrete reflections after the gap,
// spaced on a square law so they crowd toward the tail; level 0..1 against the tail's start), fade (s, the tail's
// rise after the gap), bright / dark (Hz: a two-pole lowpass on the tail, swept from bright at the start to dark at
// its end, so the top decays first), low (Hz: a one-pole highpass, so no room rings the sub-bass) }.
// Stereo, decorrelated (each channel its own draws). Drawn from `rand` alone (a private stream: the caller's).
export function makeSpace(ac, o, rand) {
  const sr = ac.sampleRate, n = Math.floor(sr * (o.len || o.rt60)), buf = ac.createBuffer(2, n, sr);
  const pre = Math.round((o.pre || 0) * sr), fade = Math.max(1, Math.round((o.fade || 0.004) * sr));
  const [ec, e0, e1, el] = o.early || [0, 0, 0, 0];
  const kLow = 1 - Math.exp(-2 * Math.PI * (o.low || 120) / sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c), x = new Float32Array(n);
    // the late tail: noise under an exponential fall, rising over `fade` after the gap
    for (let i = pre; i < n; i++) {
      const t = (i - pre) / sr, rise = Math.min(1, (i - pre) / fade);
      x[i] = (rand() * 2 - 1) * Math.exp(-6.9078 * t / o.rt60) * rise;
    }
    // the early reflections: each a short diffuse grain (3 ms of noise under a quick fall), not a spike, so a sharp
    // strike comes back as a wall's answer and not as a copy of its click
    const gl = Math.round(0.003 * sr);
    for (let k = 0; k < ec; k++) {
      const u = (k + 0.3 + 0.4 * rand()) / Math.max(1, ec), at = pre + Math.round((e0 + (e1 - e0) * u * u) * sr);
      const g = el * (1 - 0.6 * u) * 0.5;
      for (let j = 0; j < gl && at + j < n; j++) x[at + j] += g * (rand() * 2 - 1) * Math.exp(-4 * j / gl) * Math.min(1, j / 16);
    }
    // darker as it decays (two one-pole stages, 12 dB an octave), and no sub-bass
    let lp = 0, lp2 = 0, lo = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n, f = o.bright * Math.pow(o.dark / o.bright, t), k = 1 - Math.exp(-2 * Math.PI * f / sr);
      lp += (x[i] - lp) * k; lp2 += (lp - lp2) * k; lo += (lp2 - lo) * kLow; d[i] = lp2 - lo;
    }
  }
  return buf;
}
