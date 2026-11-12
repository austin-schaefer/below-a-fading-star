// The cold country (Lattice, High Ling, Outwash): D Aeolian, high and thin, at 66 BPM, 114 s. Glass: two bells in
// fourths and fifths on loops of 19 and 47 beats, the Lattice's A4 held as a drone, a thin flute high up that sings a
// figure that stays (D D C D) and an organ-less pad of fifths only, quiet. Nothing under D4.
export default {
  name: 'cold',
  length: 114,
  bpm: 66,
  mode: 'aeolian',
  seed: 13,
  voices: [
    { id: 'glass', patch: 'bell', mark: 'G', gen: 'loop', from: 8, to: 94, figure: [[0, 3, 21, 0.16], [2, 3, 25, 0.12]], period: 19, offset: 0, skip: 0.2 },
    { id: 'rime', patch: 'bell', mark: 'R', gen: 'loop', from: 22, to: 92, figure: [[0, 4, 18, 0.12], [3, 3, 22, 0.1]], period: 47, offset: 5 },
    { id: 'hum', patch: 'pad', mark: 'H', gen: 'drone', from: 0, to: 112, vel: 0.2, chords: [[[11], 24], [[11], 30]] },
    { id: 'thin', patch: 'flute', mark: 'M', role: 'lead', gen: 'walk', from: 14, to: 86, range: [13, 19],
      notes: [4, 6], rest: [6, 10], durs: [[1, 3], [2, 2], [4, 1]], endBeats: [3, 5], step: 0.95, penta: 2.4, vel: [0.35, 0.55], rubato: 0.12,
      motif: { notes: [[14, 2], [14, 1], [13, 2], [14, 6]], first: true, last: true, every: [4, 6] } },
    { id: 'fifth', patch: 'pad', mark: 'P', gen: 'drone', from: 6, to: 100, vel: 0.22, chords: [[[7], 30], [[9], 14], [[7], 22]] },
  ],
};
