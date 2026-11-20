# Samples: sources and licences

Every file under `vendor/samples/` is listed here with where it came from, who made it and the licence it is under.
A file whose licence cannot be read is not shipped.

## vsco2/ : VS Chamber Orchestra: Community Edition

- **Source:** https://github.com/sgossner/VSCO-2-CE (branch `master`), fetched 2026-11-19 with plain `curl` from
  `https://raw.githubusercontent.com/sgossner/VSCO-2-CE/master/<path>`.
- **Authors:** Versilian Studios. The repository's README: "Recorded by Sam Gossner & Simon Dalzell; Sample Cutting by
  Elan Hickler/Soundemote".
- **Licence:** CC0 1.0 Universal (public domain dedication): the repository's `LICENSE` file, read on the day of the
  fetch (https://github.com/sgossner/VSCO-2-CE/blob/master/LICENSE). No credit is required; it is given anyway.
- **What was done to each file:** mixed to mono at 44.1 kHz, cut to start at the note (a sustained note where it has
  reached half its steady level, with a 25 ms fade in; a struck one 3 ms before its first sound), trimmed to the
  length below with a fade out, levelled (struck: peak 0.7; sustained: steady RMS 0.16), encoded as MP3
  (`libmp3lame -q:a 5`). Each note's sounding pitch was then measured from the file
  (`src/audio/music/sampler.js`, `SAMPLES`). The library names several instruments' files an octave under the pitch
  they sound; the names here are the sounding pitch.
- **Size:** 56 files, 1057630 bytes (1.06 MB).

| file | seconds | bytes | source path in the repository |
|---|---|---|---|
| `vsco2/cello-B2.mp3` | 3.4 | 27036 | `Strings/Cello Section/susvib/susvib_B1_v3_1.wav` |
| `vsco2/cello-C2.mp3` | 3.4 | 27088 | `Strings/Cello Section/susvib/susvib_C1_v3_1.wav` |
| `vsco2/cello-D3.mp3` | 3.4 | 26750 | `Strings/Cello Section/susvib/susvib_D2_v3_1.wav` |
| `vsco2/cello-E2.mp3` | 3.4 | 26984 | `Strings/Cello Section/susvib/susvib_E1_v3_1.wav` |
| `vsco2/cello-G2.mp3` | 3.4 | 26828 | `Strings/Cello Section/susvib/susvib_G1_v3_1.wav` |
| `vsco2/drum-boom.mp3` | 1.3 | 6261 | `VSCO 1 Percussion/drums/other/ethnic/giant/mallet/EthnicLargeMallet_hit_mf_1.wav` |
| `vsco2/drum-hand.mp3` | 1.23 | 6626 | `VSCO 1 Percussion/drums/other/ethnic/giant/hand/EthnicLargeHand_hit_f_1.wav` |
| `vsco2/drum-handmp.mp3` | 1.15 | 6314 | `VSCO 1 Percussion/drums/other/ethnic/giant/hand/EthnicLargeHand_hit_mp_1.wav` |
| `vsco2/drum-handpp.mp3` | 1.12 | 6340 | `VSCO 1 Percussion/drums/other/ethnic/giant/hand/EthnicLargeHand_hit_pp_1.wav` |
| `vsco2/drum-rim.mp3` | 0.51 | 4235 | `VSCO 1 Percussion/drums/other/ethnic/giant/EthnicLargeStick_rimshot_1.wav` |
| `vsco2/flute-A4.mp3` | 3.2 | 28430 | `Woodwinds/Flute/susvib/LDFlute_susvib_A3_v1_1.wav` |
| `vsco2/flute-C4.mp3` | 3.2 | 26924 | `Woodwinds/Flute/susvib/LDFlute_susvib_C3_v1_1.wav` |
| `vsco2/flute-C5.mp3` | 3.2 | 30282 | `Woodwinds/Flute/susvib/LDFlute_susvib_C4_v1_1.wav` |
| `vsco2/flute-E4.mp3` | 3.2 | 27344 | `Woodwinds/Flute/susvib/LDFlute_susvib_E3_v1_1.wav` |
| `vsco2/flute-E5.mp3` | 3.2 | 29278 | `Woodwinds/Flute/susvib/LDFlute_susvib_E4_v1_1.wav` |
| `vsco2/glock-C6.mp3` | 2.6 | 16145 | `Percussion/Glock/glock_medium_C5.wav` |
| `vsco2/glock-G5.mp3` | 2.6 | 16195 | `Percussion/Glock/glock_medium_G4.wav` |
| `vsco2/glock-G6.mp3` | 2.6 | 13440 | `Percussion/Glock/glock_medium_G5.wav` |
| `vsco2/harp-A2.mp3` | 3.6 | 26855 | `Strings/Harp/KSHarp_A2_mf.wav` |
| `vsco2/harp-A4.mp3` | 3.6 | 16662 | `Strings/Harp/KSHarp_A4_mf.wav` |
| `vsco2/harp-B3.mp3` | 3.6 | 22668 | `Strings/Harp/KSHarp_B3_mf.wav` |
| `vsco2/harp-C3.mp3` | 3.6 | 27322 | `Strings/Harp/KSHarp_C3_mf.wav` |
| `vsco2/harp-C5.mp3` | 3.6 | 17520 | `Strings/Harp/KSHarp_C5_mf.wav` |
| `vsco2/harp-D4.mp3` | 3.6 | 20640 | `Strings/Harp/KSHarp_D4_mf.wav` |
| `vsco2/harp-E3.mp3` | 3.6 | 26100 | `Strings/Harp/KSHarp_E3_mf.wav` |
| `vsco2/harp-F2.mp3` | 3.6 | 28076 | `Strings/Harp/KSHarp_F2_mf.wav` |
| `vsco2/harp-F4.mp3` | 3.6 | 20042 | `Strings/Harp/KSHarp_F4_mf.wav` |
| `vsco2/harp-G3.mp3` | 3.6 | 22356 | `Strings/Harp/KSHarp_G3_mf.wav` |
| `vsco2/marimba-B3.mp3` | 1.6 | 8836 | `Percussion/Marimba/Marimba_hit_Outrigger_B2_loud_01.wav` |
| `vsco2/marimba-C3.mp3` | 1.6 | 8525 | `Percussion/Marimba/Marimba_hit_Outrigger_C2_loud_01.wav` |
| `vsco2/marimba-C5.mp3` | 1.6 | 8499 | `Percussion/Marimba/Marimba_hit_Outrigger_C4_loud_01.wav` |
| `vsco2/marimba-F4.mp3` | 1.6 | 8447 | `Percussion/Marimba/Marimba_hit_Outrigger_F3_loud_01.wav` |
| `vsco2/marimba-G3.mp3` | 1.6 | 8368 | `Percussion/Marimba/Marimba_hit_Outrigger_G2_loud_01.wav` |
| `vsco2/oboe-As4.mp3` | 2.6 | 22537 | `Woodwinds/Oboe/Vib/Oboe_Vib_A#3_v1_Main.wav` |
| `vsco2/oboe-D4.mp3` | 2.6 | 18457 | `Woodwinds/Oboe/Vib/Oboe_Vib_D3_v1_Main.wav` |
| `vsco2/oboe-D5.mp3` | 2.6 | 22481 | `Woodwinds/Oboe/Vib/Oboe_Vib_D4_v1_Main.wav` |
| `vsco2/oboe-F4.mp3` | 2.6 | 20720 | `Woodwinds/Oboe/Vib/Oboe_Vib_F3_v1_Main.wav` |
| `vsco2/pizz-A3.mp3` | 1.7 | 8368 | `Strings/Cello Section/pizzT/pizzT_A2_v1_RR1.wav` |
| `vsco2/pizz-B2.mp3` | 1.7 | 8654 | `Strings/Cello Section/pizzT/pizzT_B1_v1_RR1.wav` |
| `vsco2/pizz-C4.mp3` | 1.7 | 8628 | `Strings/Cello Section/pizzT/pizzT_C3_v1_RR1.wav` |
| `vsco2/pizz-D3.mp3` | 1.7 | 10968 | `Strings/Cello Section/pizzT/pizzT_D2_v1_RR1.wav` |
| `vsco2/pizz-E2.mp3` | 1.7 | 10188 | `Strings/Cello Section/pizzT/pizzT_E1_v1_RR1.wav` |
| `vsco2/pizz-E4.mp3` | 1.7 | 8706 | `Strings/Cello Section/pizzT/pizzT_E3_v1_RR1.wav` |
| `vsco2/pizz-F3.mp3` | 1.7 | 8393 | `Strings/Cello Section/pizzT/pizzT_F2_v1_RR1.wav` |
| `vsco2/pizz-G2.mp3` | 1.7 | 8263 | `Strings/Cello Section/pizzT/pizzT_G1_v1_RR1.wav` |
| `vsco2/shaker-1.mp3` | 0.18 | 2887 | `VSCO 1 Percussion/varWood/Camo's Shaker/shake1.wav` |
| `vsco2/shaker-4.mp3` | 0.16 | 3095 | `VSCO 1 Percussion/varWood/Camo's Shaker/shake4.wav` |
| `vsco2/viola-B3.mp3` | 3.4 | 29617 | `Strings/Viola Section/susvib/ViolaEns_susvib_B2_v2_1.wav` |
| `vsco2/viola-D4.mp3` | 3.4 | 29855 | `Strings/Viola Section/susvib/ViolaEns_susvib_D3_v2_1.wav` |
| `vsco2/viola-F4.mp3` | 3.4 | 31471 | `Strings/Viola Section/susvib/ViolaEns_susvib_F3_v2_1.wav` |
| `vsco2/viola-G3.mp3` | 3.4 | 29698 | `Strings/Viola Section/susvib/ViolaEns_susvib_G2_v2_1.wav` |
| `vsco2/violin-A4.mp3` | 3.4 | 30225 | `Strings/Solo Violin/Arco Vib/LLVln_ArcoVib_A4_f.wav` |
| `vsco2/violin-C5.mp3` | 3.4 | 29009 | `Strings/Solo Violin/Arco Vib/LLVln_ArcoVib_C5_f.wav` |
| `vsco2/violin-E5.mp3` | 3.4 | 31309 | `Strings/Solo Violin/Arco Vib/LLVln_ArcoVib_E5_f.wav` |
| `vsco2/violin-G4.mp3` | 3.4 | 29908 | `Strings/Solo Violin/Arco Vib/LLVln_ArcoVib_G4_f.wav` |
| `vsco2/violin-G5.mp3` | 3.4 | 30777 | `Strings/Solo Violin/Arco Vib/LLVln_ArcoVib_G5_f.wav` |
