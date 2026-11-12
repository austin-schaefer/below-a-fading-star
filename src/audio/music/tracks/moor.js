// The moor: the reference track, the one a visitor hears first, out on the open ground. D Aeolian at 52 BPM.
// A pad of open fifths on D3-A3 that leans to F-C and G-D and comes home; a flute that sings a falling figure
// (A G F G D) and wanders between its returns, with long rests; in the middle an organ under it a fifth or a fourth
// down, the parallel motion of the old modes; two high bells on loops of 31 and 37 beats that never realign.
// Old, plain, a little sad; nothing under D3, so the bed's drone keeps the sub.
export default {
  name: 'moor',
  length: 156,
  bpm: 52,
  mode: 'aeolian',
  seed: 7,
  voices: [
    // listed first: nothing moves them; everything after keeps clear of them
    { id: 'bell', patch: 'bell', mark: 'B', gen: 'loop', from: 24, to: 138, figure: [[0, 4, 18, 0.22]], period: 31, offset: 6 },
    { id: 'chime', patch: 'bell', mark: 'C', gen: 'loop', from: 40, to: 130, figure: [[0, 3, 14, 0.18], [3, 4, 13, 0.14]], period: 37, offset: 9, skip: 0.25 },
    { id: 'melody', patch: 'flute', mark: 'M', role: 'lead', gen: 'walk', from: 15, to: 142, range: [7, 15],
      notes: [4, 7], rest: [5, 9], durs: [[1, 3], [2, 4], [3, 1]], endBeats: [3, 5], step: 0.72, penta: 2.2, vel: [0.45, 0.7],
      motif: { notes: [[11, 2], [10, 1], [9, 1], [10, 2], [7, 4]], first: true, last: true, every: [2, 3], vary: 0.35 } },
    { id: 'pad', patch: 'pad', mark: 'P', gen: 'drone', to: 154, vel: 0.38,
      // D-A, a lean to F-C or G-D and home, once through (134 beats), ending on a long D-A
      chords: [[[0, 4], 28], [[2, 6], 8], [[0, 4], 12], [[3, 7], 8], [[0, 4], 12], [[2, 6], 8], [[3, 7], 8], [[0, 4], 12], [[2, 6], 8], [[0, 4], 30]] },
    { id: 'organ', patch: 'organ', mark: 'O', gen: 'follow', of: 'melody', from: 55, to: 118, every: 1, start: 1, vel: 0.65 },
  ],
};
