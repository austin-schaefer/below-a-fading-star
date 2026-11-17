# v16 S1, the sun's gutter (#78): report

Branch `issue-1601-gutter`. Brief: `briefs/v16/brief-v16-S1-gutter.md`.

## What changed

1. **The first gutter** comes 87.5 s after "Go out" (`FIRST_GUTTER` = 60-120 s in `src/sky.js`). Its countdown is held behind the title card (`flicker.out`, set on `begin`), so a minute on the card does not spend it. The gutter's stream moves from salt 1733 to 1736: 1733's first draw put it at 60.4 s, the very edge of the range; 1736 puts it at 87.5 s and makes it a long one (15.2 s). A pinned `?gutter=` runs from ready as before, so renders and tests keep working (`flicker.hold`, `next = 1e9` and `next = 0` behave as before).
2. **Two readings for the answers** in `sky.js`: `flicker.dark` (0..1, how far down, no lag) and `flicker.lamps` (0..1, a hand's answer: up about 1.4 s after the dark has come, full in about 2 s more, down over some 8 s after the sun has caught). Under `flicker.hold` both settle at once.
3. **New answers** (no new draw calls, no new lights; uniforms, poses and instance matrices only):
   - **The Lappet's lamps and lit panes** are turned up by hand (`uWindow` x (1 + 1.1 lamps)) in the village's shared stone (`src/v8/strata.js` tick) and the Lees' own (`src/v15/quarters/lees/light.js`). They used to go *down* to 0.7 with the sun. They lag the dark and come down slowly after, so the village is seen to answer the gutter rather than dim with it.
   - **The Lappet from far** (`src/v15/far.js`): its specks are turned up with them. From the heights the village pricks out in a gutter.
   - **The Lappet's folk** (`src/v15/people/index.js`): each notices on its own count (0.5 to 2.3 s in), stops mid-stroke (its own clock halts, so every gesture freezes where it is) and looks up and round toward the sun. They go back to work a second or two after it has caught.
   - **The Lappet's sound** (`src/v15/sound.js`): the chisel, the salt pan, the plank and the well sweep stop while the folk look up, and start again 2.5 s after. The kiln and the drips go on.
   - **The acts (v10), the tally-moths** (`src/v10/lure.js`): they take the dark for dusk. One after another they go up off the spot and wheel round it, banked so the wings show, and settle again when the light comes back.
   - **Underground (v14)**: nothing under the moor can know, and it stays that way: the Line's stored daylight, the Flute's points and the sounder's lamps do not change. The one exception is **the Laid Sun** (`src/v14/passage.js`): the Reckoner's half-laid gold wakes warm (emissive up to about 0.2) over 3 s and fades over 6. It also **hums** (`src/v14/passage-sound.js`): D2 and D4 (2.6 cents flat), as a bed within 16 m of the room.
   - **The Diffident Stair (v12)** (`src/v12/stair/treads.js`, `SLAB_U.uGut`): the fixed signs of the sun (the stub's posts and steps, the tender's home) burn up to 4.5 times as hard, and every slab's sign burns at least at half.

## What answers the gutter, by region

| Region | Before v16 | New in v16 |
|---|---|---|
| Everywhere | the sun, the hemisphere and the fog dim (main.js); the sky's disc and glow; post; particles; the music and the bed (audio) | the first gutter at 87.5 s after "Go out" |
| The old valley (v2 to v6) | the river's and the pools' glints; the Lattice keener; flora, trees and plants; the Escarpment Lamps go out one by one; the Leerie's standards light; the gutter-bats; the deodand, the uncanny things; the birds (skylife, the Vigilant); the peafowl, the Bletting, the Adust, the Demesne, the High Ling; the Span's strut; the Annals; the Galleries; the Hawser; the Kept Fire; the Thrones; the Menology; the carillon, the cutting, the Hypogeum's lintel | none (they already answer) |
| The living (v7) | the toadstone, the scriveners, the Reach, the simulacrum, the Accrescent, the flames, the Leerie, the Link-Boy, the sexton | none |
| v8 | the Pomegranate House's lamps (they dim, sputter and are relit); the ember glass (strata) glows; roads, shafts, the gold thread, the Twk-men | the village's lit panes and lamps (the shared stone) turned up by hand |
| v9, the waystation | the lamp turned up, the globe sways wider | none |
| v10, the acts | the crystal brings a gutter on; the Reckoner's door keeps count; the thread | the tally-moths wheel up at every act |
| v12, the heights | the icefall's crystals keener; the gallery's rod of sunlight fails; the lift's lamp is deliberately indifferent (its own oil) | the Diffident Stair's signs flare |
| v14, underground | nothing (the Noon Road's lamps are deliberately steady) | the Laid Sun's gold wakes, and hums; the rest deliberately does not know |
| v15, the Lappet | the limewash dims; the Fountain of Noon holds (so it stands out); its chord brightens, the kiln's draw hushes | lamps and panes turned up by hand; the specks from far turned up; the eight folk stop and look up; the work's sounds stop |

## Tests

- `SHOT_ANGLE=metal nice -n 10 node tools/gutter-test.mjs http://localhost:8161`: 22 PASS, 0 FAIL (5 new rows on the first gutter, 4 on the readings).
- `SHOT_ANGLE=metal ONLY=gutter,acts,stair,village,house,audio,walk,perf tools/suite.sh 8161`: 8 tests, 0 failed (village 687 PASS lines, house 20, walk 13, audio 106, perf 29, acts 163, gutter 22, stair 5). The hum changed after that run, so `ONLY=audio` was run again: 1 test, 0 failed (106 PASS lines). Shared code: only a comment in `src/main.js`; `src/sky.js` is this brief's, so the subset, not the whole suite.
- Draw calls: no mesh, material or light is added (one emissive on an existing material, uniforms and instance poses only), so the low tier's draw calls are unchanged by construction. The `calls=` in the lit and guttered pairs match within the frame-to-frame noise of what is in view.

## Frames (in `shots/wip/`), in order

1. Pairs, lit and guttered, from one load (`tools/views-v16-gutter.json`, `flicker.hold` 1 then 0.3): `v16-S1-a-lappet-croft-{lit,gut}` (the village from the Hanging Croft: its lights flare), `v16-S1-e-sounder-{lit,gut}` (the Pennyworth's panes and lamps turned up), `v16-S1-e-leaver-{lit,gut}` and `v16-S1-e-copyist-{lit,gut}` (heads up and round toward the sun), `v16-S1-c-moths-{lit,gut}` (the moths wheeling at the Halt's tally), `v16-S1-b-laidsun-{lit,gut}` (the gold awake), `v16-S1-d-stair-{lit,gut}` (the stub's sign).
2. Sequences through a real gutter (`tools/gutter-frames.mjs`): `v16-S1-seq-lees-*.png` (the Lees' square at the fountain, 0 to 24 s) and `v16-S1-seq-laidsun-*.png` (underground, 0 to 24 s).

## Still weak

- The Diffident Stair's answer is small: the signs are small, and the slabs asleep in the turf are under it, so the "course pricked out in embers" does not show. A slab hesitating mid-flight in a gutter would read far better, but it would stop a walker on the stair and could upset `heights` mid-walk. Not done.
- The Laid Sun reads in a pair but is quiet in a sequence (warmer, not bright: the first try, at 0.55, washed the gold to cream).
- The Lees' square view: the noon-drawer is hidden behind the fountain's vessel from the fountain's stand. Its lamps' flare reads less there than on the Pennyworth's houses.

## Sound

`tools/audio-render.mjs "$B/?q=low&pos=225.9,118.56&yaw=2.66" … --seconds=20 --y=-28`, without and with `--gutter`, then `tools/audio-metrics.mjs --clicks` (WAVs in `shots/wip/audio/laidsun-*.wav`):

| Render | lufs_i | rough | sharp_db | clicks | 63 Hz band, 5-15 s |
|---|---|---|---|---|---|
| no gutter (`laidsun-lit`) | -38.2 | 0.02 | -18.7 | 0 | -42.9 |
| gutter, the hum silenced (`laidsun-gut-nohum`) | -37.1 | 0.15 | -20.3 | | |
| gutter, D3 + A3 + D4 (`laidsun-gut`, first try) | -36.2 | 0.64 | -23.0 | 0 | -37.1 |
| gutter, D3 + D4 (`laidsun-gut2`) | -36.4 | 0.52 | -22.6 | 0 | |
| gutter, D2 + D4, kept (`laidsun-gut3`) | -36.7 | 0.22 | -20.7 | 0 | -36.0 |

The first voicing beat against the draught's A2 and D3 noise bands in the same octave and failed the gutter poses' roughness gate (under 0.25). Moving the hum out of that octave passes it. To listen for: `laidsun-gut3.wav` from 2 s, a low warm D swelling in under the draught and gone by about 20 s.

## Defaults taken

- The first gutter at 87.5 s (salt 1736), not 60.4 s (salt 1733's first draw); its countdown waits on "Go out".
- The village's lamps go *up* in a gutter (a hand turns them up), where they used to go down to 0.7 with the sky. The Pomegranate House's own lamps keep their v8 behaviour (dim, sputter, relit), so the two answers differ.
- The noon specks in the far mesh flare with the lamps: the far mesh does not tell them apart.
