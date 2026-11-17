# v15-L1, the village heard and lit to walk by (issue-1524-sound)

## What changed
- `src/v15/sound.js` (started from `src/v10/sound.js`, its own rng 15240, `?lappetsound=0`, `ctx.lappetSound`). Each emitter stands at a plan or quarter position. The beds start within 95 m of the village. The levels below are from the renders at the five stands, against a valley bed at about -29.5 LUFS.
  - Quarrels: the kiln's draw at the stoke hole. A low roar under 300 Hz that surges with the gusts, about -34 LUFS alone at 6 m, reaching 35 m. The kiln's tick: 1 to 4 dry ticks, then 3 to 16 s of nothing, reaching 18 m. A chisel at the new house: 3 to 7 blows 0.5 to 1.2 s apart (uneven), then 14 to 70 s of rest, reaching 75 m.
  - Rungs: the Tenter's cloth. A rustle on gusts, with 1 or 2 flaps at a gust's crest, reaching 28 m. The dye vats: drips on A4, D5 and F5 in phrases of 1 to 3, then 6 to 28 s, reaching 22 m.
  - Lees: the Fountain of Noon. Stored daylight as three noise bands on D5, A5 and D6 (Q 28 twice, never a tone), each wandering over 9 to 23 s and brightening by up to +5 dB at the gutter. Under it a welling on the world's noise. Spout and gutter: a babbling trickle and a gurgle. Together about -33 LUFS at 4 m.
  - Pennyworth: the salt pan (a brass ring on D6, rest about 40 s), a pot set down (about 50 s), the well's sweep creak and bucket (about 45 s), the beans' poles knocking on gusts, and the court's room air at the south door (14 m).
  - Footsteps: planks give the step `timber`. The treads, Heliarch stairs, squares and the Gullet give `click`. The Pennyworth's earth keeps the valley's step. The wind is sheltered and the room is stone under the main (shelter 0.85), in the Gullet (0.6) and in the Slype (0.7). This was probed in the page on each floor.
- `src/v15/lamps.js` and `plan.js` `LAMPS` (one draw, emissive glass, no PointLight; `house` 20/20) light five dark stretches. The Hitch's far end was already lit by the house's pole and the gate houses' lamps; a post was tried there and removed.
  - The Drag: a drum post (`drag-post`) and a lantern hung from the Stage.
  - The Lees' street past the last shop: a post at the east end.
  - The Slype: a bracket lamp over its door.
  - The Skirts: a bracket on the buttress.
  - The Pennyworth's foot: a post by the wreck's neck.
- Edits to other files, one line each: `steps.js` (3 lines), `bed.js`, `graph.js`, `src/main.js`.
- Docs: `runtime.md` (how a village place gets its sound and its step; the lamps) and a row in `modules.md`.

## Survey (`briefs/v15/audio/L1-survey-{before,after}.md`, lufs_i, before → after)
| stand | lufs_i | other changes |
|---|---|---|
| causeway | -28.8 → -28.4 | onsets 0 → 9 (the chisel is heard from above) |
| quarrels | -28.1 → -27.2 | |
| rungs | -29.6 → -28.8 | clicks 1 → 0 |
| lees | -29.6 → -28.2 | |
| pennyworth | -29.5 → -29.4 | onsets 15 → 15 |

All gated bands pass. Leerie-gutter with and without the village sound: -31.7 and -31.5 LUFS. Its rough (0.26 vs 0.07) and onsets swing with events, not with this branch.

## Tests
`ONLY=audio,village,ways,geometry,contrast,perf,house,roads,village-plan tools/suite.sh 8167` after merging origin/next gave 8 of 9: audio 106, village 687, ways 129, contrast 3, perf 29, house 20, roads 62, village-plan 7. Geometry failed on two lantern cords and then on a coplanar bracket plate. All three are fixed. `ONLY=geometry`: 144 passed, 0 failed.

## Frames (`shots/wip/v15-L1/`)
`before-*` and `after2-*` (the Slype `after3-*`), each `<stretch>` and `<stretch>-gutter`, on medium. Look at:
- `after2-quarrels-drag-gutter`
- `after2-lees-east2-gutter`
- `after3-slype-gutter`
- `after2-skirts-gutter`
- `after2-pennyworth-foot-gutter`

## Weak
- Nobody has heard any of it. The music never started in a 30 s render even with `musicspeed=30`, so "sits under the music" is judged against the music skill's -38 to -32 LUFS, not measured.
- The lamps are small at distance.
- `stage-lantern` is in no frame I looked at.
- The Slype's lamp sits over the door, not west of it as written.
- No touch or keys walk of the lamps.
- No phone frame.
