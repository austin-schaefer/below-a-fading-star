// The dry country: a drum song for a road through dust, in a limping seven (2 + 2 + 3; the beat is the eighth, 220 a
// minute). A is home, on a scale with a lowered second and a raised third (A Bb C# D E F G). A hand drum alone for
// two bars, a drone and wooden bars join, then a reed pipe calls and the bars answer; the pipe takes the answer for
// itself, climbs a step a bar to the tune's top and stays up on the fifth while the drum ends it.
//   bar 4      the call: four quick notes up and a long one, A C# D C# E (it asks, on the fifth)
//   bar 5      the bars answer an octave down, falling: E F E D C#
//   bar 6      the call again, straight up and a step further, to the tense note: A C# D E F
//   bar 7      the bars answer and go home: F E D E A
//   bars 8-9   the call, and the pipe plays the first answer itself an octave up, the bars under it
//   bars 10-12 the climb: one turning figure (C# D C# D E) a step higher each bar, to G5, the top
//   bars 13-14 down two steps and it holds E5, the fifth, unresolved; bar 15 is the drum's
// Nothing here but the drone's A and E is harmony: every pipe note is judged against those two.
const P = 'B:1 k:1 T:1 k:1 B:1 T:1 T:1', FILL = 'B:1 T:1 T:1 t:1 B:1 T:.5 T:.5 T:1';
const SH = 's:1 z:1 s:1 z:1 s:1 z:1 z:1';
const OST = 'A3:2 E4:2 A3:1 G3:1 A3:1';
export default {
  name: 'dry', place: 'The dry country', bpm: 220, meter: 7,
  line: 'A drum song for a road through dust: a reed pipe calls, wooden bars answer, and a hand drum limps along in seven while the tune climbs out of sight.',
  voices: [
    { id: 'pipe', patch: 's-oboe', legato: 0.95, gain: 1,
      part: `-:7 | -:7 | -:7 |
        <.64> A4:1 C#5:1 D5:1 C#5:1 E5:3 | -:7 |
        <.68> A4:1 C#5:1 D5:1 E5:1 F5:3 | -:7 |
        <.66> A4:1 C#5:1 D5:1 C#5:1 E5:3 | E5:1 F5:1 E5:1 D5:1 C#5:3 |
        <.7> C#5:1 D5:1 C#5:1 D5:1 E5:3 | <.76> D5:1 E5:1 D5:1 E5:1 F5:3 | <.84> E5:1 F5:1 E5:1 F5:1 G5:3 |
        <.74> F5:2 E5:2 D5:1 C#5:1 D5:1 | <.7> E5:7 |
        -:1` },
    { id: 'drum', patch: 's-drum', kit: { B: 1, T: 2, t: 3, k: 4, r: 5 }, gain: 1,
      part: `<.55> ${P} | <.7> ${P} | ${P} | ${P} | ${P} | ${P} | ${FILL} | ${P} | ${P} | ${P} | ${P} | ${P} | ${P} | ${FILL} | B:1` },
    { id: 'rattle', patch: 's-shaker', kit: { s: 1, z: 2 }, accents: [1, 0.5, 1, 0.5, 1, 0.5, 0.5], gain: 1,
      part: `-:7 | -:7 | <.5> ${SH} | ${SH} | ${SH} | ${SH} | ${SH} | ${SH} | ${SH} | ${SH} | ${SH} | ${SH} | ${SH} | ${SH} | -:1` },
    { id: 'bars', patch: 's-marimba', gain: 1,
      part: `-:7 | -:7 | <.5> ${OST} | ${OST} |
        <.62> E4:1 F4:1 E4:1 D4:1 C#4:3 | <.5> ${OST} | <.62> F4:1 E4:1 D4:1 E4:1 A3:3 |
        <.5> ${OST} | <.56> E4:1 F4:1 E4:1 D4:1 C#4:3 |
        <.54> ${OST} | ${OST} | <.6> ${OST} | <.54> ${OST} | ${OST} | <.62> A3+E4:1` },
    { id: 'drone', patch: 's-cello', gain: 0.55,
      part: `-:7 | -:7 | <.3> A2+E3:7 | A2+E3:7 | A2+E3:7 | A2+E3:7 | A2+E3:7 | A2+E3:7 | A2+E3:7 | A2+E3:7 | A2+E3:7 | A2+E3:7 | A2+E3:7 | A2+E3:7 | A2+E3:1` },
  ],
};
