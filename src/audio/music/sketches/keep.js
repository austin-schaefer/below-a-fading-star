// Carcanet Keep: a slow court dance in three (the weight on the second beat), G minor at 72, twelve bars for a small
// band of strings: one violin with the tune, violas restruck on the second beat, cellos on the bass. It opens
// with everyone at once.
//   bars 1-4   the theme over a bass that walks down G F Eb D: D5 Bb4. C5 | D5 A4 | Eb5 C5. D5 | D5 C5 A4, resting on the dominant
//   bars 5-8   the theme's first bar again, then upward where it went down (C5 to F5) into the relative major,
//              and a bass that climbs by half steps Bb B C under F5 D5
//   bars 9-12  the top (G5 over C minor), the theme's first bar once more over the dominant's bass, and a close
//              A. G F# | G on a G major chord: the minor piece ends in the major
// Harmony, a bar each: Gm Dm/F Cm/Eb D7 | Gm F Bb G7/B | Cm Gm/D D7 G.
export default {
  name: 'keep', place: 'Carcanet Keep', bpm: 72, meter: 3,
  line: 'A slow court dance for a few strings, grave and a little grand, that ends in the major as if remembering better days.',
  voices: [
    { id: 'tune', patch: 's-violin', legato: 0.97, gain: 1,
      part: `<.6> D5:1 Bb4:1.5 C5:.5 | D5:1 A4:2 | Eb5:1 C5:1.5 D5:.5 | D5:1 C5:1 A4:1 |
        <.66> D5:1 Bb4:1.5 C5:.5 | C5:1 F5:2 | F5:1 D5:1.5 Eb5:.5 | F5:1 D5:2 |
        <.8> Eb5:1 G5:1.5 F5:.5 | <.66> D5:1 Bb4:1.5 C5:.5 | <.58> A4:1.5 G4:.5 F#4:1 | G4:3` },
    { id: 'violas', patch: 's-viola', accents: [0.8, 1], gain: 1,
      part: `<.4> Bb3+D4:1 Bb3+D4:2 | A3+D4:1 A3+D4:2 | G3+C4:1 G3+C4:2 | F#3+A3:1 F#3+A3:2 |
        Bb3+D4:1 Bb3+D4:2 | A3+C4:1 A3+C4:2 | Bb3+D4:1 Bb3+D4:2 | G3+D4:1 G3+D4:2 |
        <.48> G3+Eb4:1 G3+Eb4:2 | <.4> G3+Bb3:1 G3+Bb3:2 | F#3+C4:1 F#3+C4:2 | G3+B3+D4:3` },
    { id: 'cellos', patch: 's-cello', gain: 1.4,
      part: `<.42> G2:3 | F2:3 | Eb2:3 | D2:3 | G2:3 | F2:3 | Bb2:3 | B2:3 | <.5> C3:3 | <.42> D3:3 | D2:3 | G2:3` },
  ],
};
