// A deliberately bad track for the music harness's self-test: a static drone with nothing happening. One open
// fifth held for the whole length, no melody. The gates must fail it (tools/music-score-selftest.mjs).
export default {
  name: 'drone', length: 150, bpm: 60, mode: 'aeolian', seed: 1,
  voices: [{ id: 'pad', patch: 'pad', mark: 'P', gen: 'drone', chords: [[[0, 4], 150]] }],
};
