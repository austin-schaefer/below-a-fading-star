// The Great Span (the bridge): D Dorian at 50 BPM, 150 s. Height and wind and a long way down: wide intervals (the
// lead opens on a fifth and an octave), a pad of bare open fifths that holds nearly still, two bells very far apart
// on loops of 41 and 53 beats, a second flute a fifth under the first for a few phrases. Slow, wide, thin.
export default {
  name: 'span',
  length: 150,
  bpm: 50,
  mode: 'dorian',
  seed: 5,
  voices: [
    { id: 'toll', patch: 'bell', mark: 'B', gen: 'loop', from: 26, to: 134, figure: [[0, 6, 14, 0.22]], period: 41, offset: 8 },
    { id: 'far', patch: 'bell', mark: 'C', gen: 'loop', from: 50, to: 128, figure: [[0, 5, 11, 0.16]], period: 53, offset: 17 },
    { id: 'gaze', patch: 'flute', mark: 'M', role: 'lead', gen: 'walk', from: 14, to: 136, range: [7, 15],
      notes: [4, 5], rest: [8, 12], durs: [[2, 3], [3, 3], [5, 1]], endBeats: [5, 8], step: 0.88, penta: 2.4, vel: [0.4, 0.62], rubato: 0.14, legato: 0.95,
      motif: { notes: [[11, 3], [14, 4], [13, 2], [11, 7]], first: true, last: true, every: [2, 3] } },
    { id: 'wind', patch: 'pad', mark: 'P', gen: 'drone', to: 148, vel: 0.3,
      chords: [[[0, 4], 36], [[3, 7], 14], [[0, 4], 30], [[4, 8], 10], [[0, 4], 44]] },
    { id: 'under', patch: 'flute', mark: 'U', gen: 'follow', of: 'gaze', from: 60, to: 120, every: 2, start: 1, ratios: [2 / 3, 3 / 4], vel: 0.5, delay: 0.6 },
  ],
};
