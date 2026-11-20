// The moor: a walking song. D Dorian, four in a bar at 84. A harp sets the pace alone for a bar, the flute sings an
// eight-bar tune over it in four two-bar phrases (a, a, b, a), and the harp closes by itself.
//   a   D up a fifth to A, held, and down by step: D A. G F | E G E (asking, on the second degree)
//   a'  the same head, answered upward to A: D A. G F | E G A
//   b   the lift: up the F chord to C, then the G chord to the tune's top, D5, on the head's own rhythm (the B natural is Dorian's)
//   a'' the head a third time, quieter, and home by the old cadence under the tonic: E C D
// Harmony, a bar each: Dm | Dm C | Dm C-Am | F G | Dm C-Dm | Dm.
const DM = 'D3:.5 A3:.5 F4:.5 A3:.5 D3:.5 A3:.5 F4:.5 A3:.5';
const C = 'C3:.5 G3:.5 E4:.5 G3:.5 C3:.5 G3:.5 E4:.5 G3:.5';
export default {
  name: 'moor', place: 'The moor', bpm: 84, meter: 4, oscGain: 0.65,
  line: 'A walking song: a flute tune over a harp that keeps step, plain enough to whistle on a long road.',
  voices: [
    { id: 'tune', patch: 's-flute', osc: 'flute', legato: 0.93, gain: 1,
      part: `-:4 |
        <.6> D4:1 A4:1.5 G4:.5 F4:1 | E4:1 G4:1 E4:2 |
        <.64> D4:1 A4:1.5 G4:.5 F4:1 | E4:1 G4:1 A4:2 |
        <.78> F4:1 A4:1 C5:1.5 A4:.5 | B4:1 D5:1.5 C5:.5 B4:1 |
        <.6> D4:1 A4:1.5 G4:.5 F4:1 | E4:1 C4:1 D4:2 |
        -:4` },
    { id: 'harp', patch: 's-harp', osc: 'bell', oscRing: 2, accents: [1, 0.62, 0.8, 0.62], gain: 1,
      part: `<.5> ${DM} |
        ${DM} | ${C} |
        ${DM} | C3:.5 G3:.5 E4:.5 G3:.5 A2:.5 E3:.5 C4:.5 E3:.5 |
        <.62> F2:.5 C3:.5 A3:.5 C3:.5 F2:.5 C3:.5 A3:.5 C3:.5 | G2:.5 D3:.5 B3:.5 D3:.5 G2:.5 D3:.5 B3:.5 D3:.5 |
        <.5> ${DM} | C3:.5 G3:.5 E4:.5 G3:.5 D3:.5 A3:.5 F4:.5 A3:.5 |
        <.55> D3:.5 A3:.5 D4:.5 F4:.5 A4:.5 D5:1.5` },
  ],
};
