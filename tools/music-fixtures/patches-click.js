// A deliberately bad patch for tools/music-render.mjs --patches: the flute gated square, its level jumping from 0 to
// the note's and back with setValueAtTime (no attack, no release). The render must fail its click gate.
import { PATCHES } from '/src/audio/music/patches.js?real';
export * from '/src/audio/music/patches.js?real';

PATCHES.flute = {
  attack: () => 0, release: () => 0.001,
  make(ac, out) {
    const x = ac.createOscillator(), env = ac.createGain();
    x.type = 'triangle'; env.gain.value = 0;
    x.connect(env).connect(out);
    return {
      note(t, f, dur, vel) { x.frequency.setValueAtTime(f, t); env.gain.setValueAtTime(vel * 0.5, t); env.gain.setValueAtTime(0, t + dur); },
      start(t) { x.start(t); }, stop(t) { try { x.stop(t); } catch { /* twice */ } },
    };
  },
};
