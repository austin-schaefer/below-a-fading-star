// The dry country: a drum song for a road through dust. D with a lowered second and a raised third (D Eb F# G A Bb C),
// four in a bar at 100. A hand drum alone for a bar, wooden bars and a low string drone join it, then a reed pipe
// sings eight bars (a, a, b, a) and the drum walks on without it.
//   a   bars 3-4   a sigh from the fifth down to the tonic across the scale's wide step: A. Bb A G F# | G F# Eb D
//   a'  bars 5-6   the same first bar, turned back up to wait on the fifth: G A Bb A
//   b   bars 7-8   a fourth higher over G, from the tune's top: D5. C Bb C D | C Bb A G (the cadence's rhythm, a fourth up)
//   a'' bars 9-10  the sigh again with a turn on its long note (A Bb A Bb A G F#), and the same way home
// The drum keeps one pattern (low, high, -, high, low, -, high, ghost) with a fill before b and before the end.
const P = 'B:.5 t:.5 -:.5 T:.5 B:.5 -:.5 T:.5 k:.5', FILL = 'B:.5 t:.5 -:.5 T:.5 B:.5 T:.25 t:.25 T:.5 T:.5';
const SH = 's:.5 z:.5 s:.5 z:.5 s:.5 z:.5 s:.5 z:.5';
const OD = 'D3:1 A3:.5 D3:.5 -:.5 C4:.5 D4:.5 A3:.5', OG = 'G3:1 D4:.5 G3:.5 -:.5 Bb3:.5 D4:.5 G3:.5';
export default {
  name: 'dry', place: 'The dry country', bpm: 100, meter: 4,
  line: 'A drum song for a road through dust: a hand drum and wooden bars under a reed pipe, on a bent scale that sounds far from home.',
  voices: [
    { id: 'pipe', patch: 's-oboe', legato: 0.96, gain: 1,
      part: `-:4 | -:4 |
        <.62> A4:1.5 Bb4:.5 A4:.5 G4:.5 F#4:1 | G4:.5 F#4:.5 Eb4:1 D4:2 |
        <.66> A4:1.5 Bb4:.5 A4:.5 G4:.5 F#4:1 | G4:.5 A4:.5 Bb4:1 A4:2 |
        <.78> D5:1.5 C5:.5 Bb4:.5 C5:.5 D5:1 | C5:.5 Bb4:.5 A4:1 G4:2 |
        <.68> A4:.75 Bb4:.25 A4:.5 Bb4:.5 A4:.5 G4:.5 F#4:1 | G4:.5 F#4:.5 Eb4:1 D4:2 |
        -:4` },
    { id: 'drum', patch: 's-drum', kit: { B: 1, T: 2, t: 3, k: 4, r: 5 }, gain: 1,
      part: `<.7> ${P} | ${P} | ${P} | ${P} | ${P} | ${FILL} | ${P} | ${P} | ${P} | ${FILL} | <.55> ${P} | <.7> B:1` },
    { id: 'rattle', patch: 's-shaker', kit: { s: 1, z: 2 }, accents: [1, 0.5], gain: 1,
      part: `-:4 | -:4 | <.5> ${SH} | ${SH} | ${SH} | ${SH} | ${SH} | ${SH} | ${SH} | ${SH} | <.35> ${SH} | -:1` },
    { id: 'bars', patch: 's-marimba', gain: 1,
      part: `-:4 | <.5> ${OD} | ${OD} | ${OD} | ${OD} | ${OD} | <.56> ${OG} | ${OG} | <.5> ${OD} | ${OD} | <.42> ${OD} | <.5> D3:1` },
    { id: 'drone', patch: 's-cello', gain: 0.55,
      part: `-:4 | <.3> D2+A2:4 | D2+A2:4 | D2+A2:4 | D2+A2:4 | D2+A2:4 | G2+D3:4 | G2+D3:4 | D2+A2:4 | D2+A2:4 | D2+A2:4 | D2+A2:3` },
  ],
};
