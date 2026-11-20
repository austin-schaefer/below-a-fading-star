// The gardens: a music box left running. G major in a rocking six (the beat here is the eighth, 180 a minute: two
// slow beats a bar at 60), bells over plucked strings. Two bars of plucking, the tune twice, and a coda that runs
// down like a spring: the last two bars slow from 180 to 104.
//   bars 3-6    the tune: up the chord and back, D G B G | A G E, and the same a fifth lower, C E G E | F# E D
//   bars 7-10   again, but the E of its second bar leaps up an octave (E6, the top) and it comes down by step, D C B A | G
//   bars 11-14  the first bar a third time, softer; then the one shadow, the same shape in C minor (Eb G C), and home: B A F# | G
// Harmony, a bar each: G G | G Em C D | G Em C-D G | G Cm D7 G.
const G = 'G2:1 D3:1 B3:1 G2:1 D3:1 B3:1';
export default {
  name: 'garden', place: 'The gardens', bpm: 180, meter: 6, tempo: [[0, 180], [72, 180], [84, 104]],
  line: 'A music box left running: a lullaby on bells over plucked strings, sweet with one shadow in it, winding down at the end.',
  voices: [
    { id: 'bells', patch: 's-glock', gain: 1.4,
      part: `-:6 | -:6 |
        <.6> D5:2 G5:1 B5:2 G5:1 | A5:2 G5:1 E5:3 | C5:2 E5:1 G5:2 E5:1 | F#5:2 E5:1 D5:3 |
        <.66> D5:2 G5:1 B5:2 G5:1 | A5:2 G5:1 E6:3 | D6:2 C6:1 B5:2 A5:1 | G5:3 -:3 |
        <.5> D5:2 G5:1 B5:2 G5:1 | Eb5:2 G5:1 C6:3 | <.45> B5:2 A5:1 F#5:3 | G5:6` },
    { id: 'plucked', patch: 's-pizz', accents: [1, 0.6, 0.72], gain: 1,
      part: `<.42> ${G} | ${G} |
        <.5> ${G} | E2:1 B2:1 G3:1 E2:1 B2:1 G3:1 | C3:1 G3:1 E4:1 C3:1 G3:1 E4:1 | D3:1 A3:1 F#4:1 D3:1 A3:1 F#4:1 |
        ${G} | E2:1 B2:1 G3:1 E2:1 B2:1 G3:1 | C3:1 G3:1 E4:1 D3:1 A3:1 F#4:1 | ${G} |
        <.42> ${G} | C3:1 G3:1 Eb4:1 C3:1 G3:1 Eb4:1 | D3:1 A3:1 C4:1 D3:1 F#3:1 C4:1 | G2:1 D3:1 B3:1 G3:3` },
  ],
};
