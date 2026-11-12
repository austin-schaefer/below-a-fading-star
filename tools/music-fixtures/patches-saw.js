// A deliberately bad patch for tools/music-render.mjs --patches: the pad as three bare sawtooths straight to the
// stem, no lowpass, at the lead's level (the harsh, buzzy pad the patches' rules forbid). The render must fail its
// sharpness or roughness gate.
import { PATCHES, envelope } from '/src/audio/music/patches.js?real';
export * from '/src/audio/music/patches.js?real';

PATCHES.pad = {
  attack: () => 0.5, release: () => 1,
  make(ac, out) {
    const env = ac.createGain(); env.gain.value = 0; env.connect(out);
    const oscs = [-7, 0, 7].map((c) => { const x = ac.createOscillator(); x.type = 'sawtooth'; x.detune.value = c; x.connect(env); return x; });
    return {
      note(t, f, dur, vel) { for (const x of oscs) x.frequency.setValueAtTime(f, t); envelope(env, t, dur, vel * 0.6, 0.5, 1); },
      start(t) { for (const x of oscs) x.start(t); }, stop(t) { for (const x of oscs) { try { x.stop(t); } catch { /* twice */ } } },
    };
  },
};
