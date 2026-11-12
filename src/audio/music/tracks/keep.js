// Carcanet Keep: D Aeolian at 54 BPM, 150 s. The oldest and plainest, nearest to a chorale: a choir that sings a
// hymn-tune of stepwise notes (D F G F, then home), an organ holding slow chords of fifths, a second choir a fourth
// or fifth under the tune in most phrases, written as parallel organum, and a single far bell. No flute.
export default {
  name: 'keep',
  length: 150,
  bpm: 54,
  mode: 'aeolian',
  seed: 9,
  voices: [
    { id: 'knell', patch: 'bell', mark: 'B', gen: 'loop', from: 40, to: 134, figure: [[0, 5, 14, 0.18]], period: 47, offset: 12 },
    { id: 'organ', patch: 'organ', mark: 'O', gen: 'drone', to: 148, vel: 0.34,
      chords: [[[0, 4], 25], [[3, 7], 9], [[0, 4], 12], [[2, 6], 8], [[3, 7], 8], [[0, 4], 12], [[3, 7], 8], [[0, 4], 52]] },
    { id: 'tune', patch: 'choir', mark: 'M', role: 'lead', gen: 'walk', from: 12, to: 134, range: [5, 11],
      notes: [4, 5], rest: [7, 11], durs: [[2, 4], [3, 2], [1, 1]], endBeats: [4, 6], step: 0.9, penta: 1.2, vel: [0.4, 0.6], legato: 0.96, rubato: 0,
      motif: { notes: [[7, 2], [9, 2], [10, 2], [9, 2], [8, 2], [7, 6]], first: true, last: true, every: [3, 4], vary: 0.3 } },
    { id: 'bass', patch: 'choir', mark: 'W', gen: 'follow', of: 'tune', from: 36, to: 120, every: 1, start: 1, ratios: [3 / 4, 2 / 3], vel: 0.6, delay: 0.25 },
  ],
};
