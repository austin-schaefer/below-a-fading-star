// The gardens: a music box left running. C major in a rocking six (the beat here is the eighth, 180 a minute: two
// slow beats a bar at 60), bells over plucked strings. Two bars of plucking, the tune twice, and a coda that runs
// down like a spring: the last two bars slow from 180 to 104. The bells stay at G5 and above, the lowest note the
// glockenspiel was recorded at.
//   bars 3-6    the tune: up the chord and back, G C E C | D C A, then up the next chord and further, A C F C | B A G
//   bars 7-10   again, but the A of its second bar leaps up an octave (A6, the top) and it comes down by step, G F E D | C
//   bars 11-14  the first bar a third time, softer; then the one shadow, the same shape in F minor (Ab C F), and home: E D B | C
// Harmony, a bar each: C C | C Am F G | C Am F-G C | C Fm G7 C.
const C = 'C3:1 G3:1 E4:1 C3:1 G3:1 E4:1', AM = 'A2:1 E3:1 C4:1 A2:1 E3:1 C4:1';
export default {
  name: 'garden', place: 'The gardens', bpm: 180, meter: 6, tempo: [[0, 180], [72, 180], [84, 104]],
  line: 'A music box left running: a lullaby on bells over plucked strings, sweet with one shadow in it, winding down at the end.',
  voices: [
    { id: 'bells', patch: 's-glock', gain: 1.4,
      part: `-:6 | -:6 |
        <.6> G5:2 C6:1 E6:2 C6:1 | D6:2 C6:1 A5:3 | A5:2 C6:1 F6:2 C6:1 | B5:2 A5:1 G5:3 |
        <.66> G5:2 C6:1 E6:2 C6:1 | D6:2 C6:1 A6:3 | G6:2 F6:1 E6:2 D6:1 | C6:3 -:3 |
        <.5> G5:2 C6:1 E6:2 C6:1 | Ab5:2 C6:1 F6:3 | <.45> E6:2 D6:1 B5:3 | C6:6` },
    { id: 'plucked', patch: 's-pizz', accents: [1, 0.6, 0.72], gain: 1,
      part: `<.42> ${C} | ${C} |
        <.5> ${C} | ${AM} | F2:1 C3:1 A3:1 F2:1 C3:1 A3:1 | G2:1 D3:1 B3:1 G2:1 D3:1 B3:1 |
        ${C} | ${AM} | F2:1 C3:1 A3:1 G2:1 D3:1 B3:1 | ${C} |
        <.42> ${C} | F2:1 C3:1 Ab3:1 F2:1 C3:1 Ab3:1 | G2:1 D3:1 F3:1 G2:1 B2:1 F3:1 | C3:1 G3:1 E4:1 C4:3` },
  ],
};
