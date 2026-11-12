// The Deodand Wood: D Phrygian at 50 BPM, 168 s. Dark and close, the lowest piece: a choir that sings a falling
// figure ending on the half-step Eb-D (A G F Eb D), an organ drone that sinks to Eb and comes back, a second choir a
// fifth or fourth under the first in the middle, one low bell on a loop of 43 beats. No flute, no high bells; nothing above D5.
export default {
  name: 'wood',
  length: 168,
  bpm: 50,
  mode: 'phrygian',
  seed: 11,
  voices: [
    { id: 'knell', patch: 'bell', mark: 'K', gen: 'loop', from: 30, to: 140, figure: [[0, 6, 7, 0.2]], period: 43, offset: 11 },
    { id: 'voice', patch: 'choir', mark: 'V', role: 'lead', gen: 'walk', from: 18, to: 142, range: [7, 14],
      notes: [4, 7], rest: [7, 12], durs: [[1, 1], [2, 4], [3, 2], [4, 1]], endBeats: [4, 6], step: 0.9, penta: 1.6, vel: [0.4, 0.65], rubato: 0.1, legato: 0.92,
      motif: { notes: [[11, 2], [10, 2], [9, 2], [8, 2], [7, 6]], first: true, last: true, every: [2, 3], vary: 0.3 } },
    { id: 'organ', patch: 'organ', mark: 'O', gen: 'drone', to: 165, vel: 0.34,
      chords: [[[0, 4], 24], [[1, 5], 8], [[0, 4], 14], [[3, 7], 10], [[1, 5], 10], [[0, 4], 18], [[2, 6], 8], [[0, 4], 40]] },
    { id: 'low', patch: 'choir', mark: 'W', gen: 'follow', of: 'voice', from: 50, to: 112, every: 2, start: 1, ratios: [2 / 3, 3 / 4], vel: 0.55, delay: 0.4 },
  ],
};
