// The dry country (Adust, Lynchets): D Aeolian at 80 BPM, 96 s. A single flute and almost nothing else: a pad of one
// bare fifth, very quiet, in the middle only; wide rests. The flute sings short, uneven phrases that wander in a narrow
// band around A4 and rise at the end; no bell.
export default {
  name: 'dry',
  length: 96,
  bpm: 80,
  mode: 'aeolian',
  seed: 3,
  voices: [
    { id: 'flute', patch: 'flute', mark: 'M', role: 'lead', gen: 'walk', from: 4, to: 82, range: [8, 14],
      notes: [4, 6], rest: [6, 10], durs: [[1, 3], [2, 3], [3, 2], [6, 1]], endBeats: [4, 7], step: 0.96, penta: 1.5, vel: [0.45, 0.7], rubato: 0.15, legato: 0.88,
      motif: { notes: [[9, 3], [9, 1], [10, 2], [11, 6]], first: true, last: true, every: [4, 6] } },
    { id: 'dust', patch: 'pad', mark: 'P', gen: 'drone', from: 20, to: 70, vel: 0.14, chords: [[[0, 4], 80]] },
  ],
};
