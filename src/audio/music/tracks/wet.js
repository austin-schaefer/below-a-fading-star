// The wet country (fen, Saltings, Strandline, tarn): D Aeolian at 58 BPM, 132 s. Sparse. A still pad of one fifth that
// barely moves, a bell that tolls a rising figure (D A C) across long silences, a second bell far off on 29 beats, and a
// flute that sings a few short phrases, each ending long. The silence inside it is the piece.
export default {
  name: 'wet',
  length: 132,
  bpm: 58,
  mode: 'aeolian',
  seed: 5,
  voices: [
    { id: 'toll', patch: 'bell', mark: 'T', gen: 'loop', from: 10, to: 96, figure: [[0, 5, 14, 0.24], [4, 5, 18, 0.2], [9, 6, 21, 0.16]], period: 23, offset: 2, skip: 0.2 },
    { id: 'far', patch: 'bell', mark: 'F', gen: 'loop', from: 30, to: 92, figure: [[0, 5, 16, 0.16]], period: 29, offset: 14 },
    { id: 'reed', patch: 'flute', mark: 'R', role: 'lead', gen: 'walk', from: 8, to: 104, range: [7, 14],
      notes: [4, 6], rest: [7, 11], durs: [[1, 1], [2, 2], [3, 3], [5, 1]], endBeats: [5, 8], step: 0.95, penta: 2.5, vel: [0.3, 0.5], rubato: 0.1, legato: 0.9,
      motif: { notes: [[11, 3], [9, 2], [8, 2], [7, 6]], first: true, last: true, every: [4, 6] } },
    { id: 'still', patch: 'pad', mark: 'P', gen: 'drone', from: 4, to: 124, vel: 0.28, chords: [[[0, 4], 40], [[3, 7], 14], [[0, 4], 50]] },
  ],
};
