// Audio building blocks: noise buffers, a generated reverb impulse, and small voice helpers.
export function makeNoiseBuffer(ac, seconds, kind, rand) {
  const n = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(2, n, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let b = 0, p0 = 0, p1 = 0, p2 = 0;
    for (let i = 0; i < n; i++) {
      const w = rand() * 2 - 1;
      if (kind === 'brown') { b = (b + 0.02 * w) / 1.02; d[i] = b * 3.5; }
      else if (kind === 'pink') { p0 = 0.99765 * p0 + w * 0.099046; p1 = 0.963 * p1 + w * 0.2965164; p2 = 0.57 * p2 + w * 1.0526913; d[i] = (p0 + p1 + p2 + w * 0.1848) * 0.2; }
      else d[i] = w;
    }
    // crossfade the loop seam
    const f = Math.min(2048, n >> 2);
    for (let i = 0; i < f; i++) { const k = i / f; d[i] = d[i] * k + d[n - f + i] * (1 - k) * (1 - k) * 0; }
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
