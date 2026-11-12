// The sun's gates (the saddle between the Thrones): D Aeolian at 62 BPM, 130 s. The one grand piece, and it gives
// up. A rising figure to the octave (D F A D, then down to A), organ and choir doubling it in the middle, a bell
// high over, the pad swelling; then the voices drop out one by one, the lead thins and ends on A, the pad on a
// bare A-E. Unresolved on purpose.
export default {
  name: 'gates',
  length: 130,
  bpm: 62,
  mode: 'aeolian',
  seed: 21,
  voices: [
    { id: 'sun', patch: 'bell', mark: 'B', gen: 'loop', from: 30, to: 90, figure: [[0, 3, 18, 0.26], [4, 3, 14, 0.2]], period: 23, offset: 3 },
    { id: 'herald', patch: 'flute', mark: 'M', role: 'lead', gen: 'walk', from: 12, to: 118, range: [7, 15], ends: [4],
      notes: [4, 7], rest: [8, 11], durs: [[1, 3], [2, 3], [3, 1]], endBeats: [4, 7], step: 0.6, penta: 2, vel: [0.45, 0.75], rubato: 0.08,
      motif: { notes: [[7, 2], [9, 2], [10, 2], [11, 3], [12, 2], [11, 6]], first: true, last: true, every: [5, 6] } },
    { id: 'pad', patch: 'pad', mark: 'P', gen: 'drone', to: 128, vel: 0.36,
      chords: [[[0, 4], 24], [[2, 6], 10], [[0, 4], 10], [[3, 7], 12], [[2, 6], 10], [[0, 4], 12], [[4, 8], 60]] },
    { id: 'choir', patch: 'choir', mark: 'C', gen: 'follow', of: 'herald', from: 28, to: 76, every: 1, start: 1, ratios: [2 / 3, 3 / 4], vel: 0.7, delay: 0.3 },
    { id: 'organ', patch: 'organ', mark: 'O', gen: 'follow', of: 'herald', from: 40, to: 90, every: 2, start: 2, ratios: [3 / 4, 2 / 3], vel: 0.6, delay: 0.1 },
  ],
};
