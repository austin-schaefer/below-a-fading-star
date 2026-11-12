// The gardens (Demesne, Bletting): D Dorian at 72 BPM, 150 s. The nearest to warm: an organ that carries the tune, a
// little courtly (a figure that rises by step to the B and bows back down, a dance without a pulse), a flute answering
// in parallel fourths, a pad that leans on G and A, one bell. The raised sixth (B) is its colour and its wryness.
export default {
  name: 'garden',
  length: 150,
  bpm: 72,
  mode: 'dorian',
  seed: 17,
  voices: [
    { id: 'chime', patch: 'bell', mark: 'C', gen: 'loop', from: 20, to: 124, figure: [[0, 3, 14, 0.2], [5, 3, 11, 0.16]], period: 41, offset: 7, skip: 0.15 },
    { id: 'tune', patch: 'organ', mark: 'O', role: 'lead', gen: 'walk', from: 12, to: 126, range: [7, 15],
      notes: [5, 8], rest: [8, 13], durs: [[1, 4], [2, 3], [3, 1]], endBeats: [3, 5], step: 0.8, penta: 1.3, vel: [0.4, 0.62], rubato: 0.1,
      motif: { notes: [[7, 1], [8, 1], [9, 1], [12, 3], [11, 1], [9, 1], [7, 4]], first: true, last: true, every: [2, 3], vary: 0.4 } },
    { id: 'pad', patch: 'pad', mark: 'P', gen: 'drone', to: 126, vel: 0.34,
      chords: [[[0, 4], 20], [[3, 7], 12], [[4, 8], 12], [[0, 4], 16], [[3, 7], 12], [[0, 4], 24]] },
    { id: 'answer', patch: 'flute', mark: 'F', gen: 'follow', of: 'tune', from: 40, to: 118, every: 2, start: 1, ratios: [4 / 3, 3 / 2], vel: 0.6, delay: 0.5 },
  ],
};
