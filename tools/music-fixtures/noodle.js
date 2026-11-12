// A deliberately bad track for the music harness's self-test: a random-walk noodle. Constant eighth notes with no
// rests, leaps of up to a seventh in any direction, no motif, wandering out of the pentatonic, over a pad. The
// gates must fail it (tools/music-score-selftest.mjs).
let s = 99;
const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
const notes = [];
let d = 12;
for (let b = 0; b < 230; b += 0.5) {
  d = Math.max(7, Math.min(21, d + Math.round((rnd() - 0.5) * 12)));
  notes.push([b, 0.5, d, 0.6]);
}
export default {
  name: 'noodle', length: 150, bpm: 92, mode: 'aeolian', seed: 1,
  voices: [
    { id: 'lead', patch: 'flute', mark: 'L', role: 'lead', gen: 'notes', from: 0, notes },
    { id: 'pad', patch: 'pad', mark: 'P', gen: 'drone', chords: [[[0, 4], 16], [[1, 5], 16]] },
  ],
};
