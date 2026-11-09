// Audio building blocks: noise buffers, a generated reverb impulse, and small voice helpers.
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
