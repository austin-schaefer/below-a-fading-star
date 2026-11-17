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

## Round two (S2)

Brief: `briefs/v16/brief-v16-S2-gutter-bolder.md`.

### What changed

**One beat for the whole valley** (the part a visitor anywhere gets):
- **The night shows through.** In a gutter the ember goes out of the horizon and the whole vault sinks to violet. The fainter stars come out, every star burns three times as hard, and the galactic band brightens (`sky.js` `uDark`; the same is done in skylife's `sl_sky` (`uNight`) and in the standing water's reflected sky). A cold grade in post (`uGut`) turns the shadows and mid-tones grey-blue, while what burns stays warm, so the lamps that answer stand out. As the sun catches there is a warm flush over some five seconds (`flicker.after`).
- **The air holds its breath.** The wind falls away over the four seconds before the onset (`flicker.soon`) and stays half-hushed under the drone. As the sun catches, a gust comes, rising over 1.8 s (`audio/bed.js`). The Span's cloth hangs dead in the hush and whips in the relief gust (`v4/span/cloth.js`, `vestige.js`).
- **The lights answer in a wave outward from the eye.** One analytic model (`flicker.lampsAt`/`lampDelay`/`wave`) gives a delay of 0.3 s, plus 1 s per 45 m, plus up to 1.2 s that is a 6 m cell's own. It is used in the stone shader (`uWaveK`: the village's and the Lees' panes, house by house), the Lappet from far, the Halt's lamp and globe, and the Leerie's standards. The house lamps and the Escarpment Lamps keep their own answers.
- Every reading settles at once under `flicker.hold`. Nothing flashes: the fastest thing is the floor's shudder at 2.7 Hz (unchanged). No full-screen white.

**The answers a visitor walks past:**
- **The moths:** 48 more on each act come out of the stone in a gutter and climb a turning column to about 5 m. Their dust takes the starlight (emissive 0.9 x dusk, none by day). This uses the same instanced mesh.
- **The Laid Sun:** bands of light run out from its middle along the laid rays (1.5 m/s, one every 2.6 s). It is driven every frame from `flicker.slow`; this fixes the review's 2 Hz steps.
- **The Diffident Stair:** ember veins burn through the stub and every slab, the ones in the turf too.
- **Standing water** (tarn, fen): the sun's glints go out; a pale cold comes up out of the body.
- **The Noonwrights' glass:** the main's glass (`noonGlass` `gut`) and every carrier house's glaze (the stone's channel 3, `uNoon`) give back stored noon while the sun is out.
- **The creatures:** the rooks and the gibbet crows go up calling. The wings tighten and climb over the tower, and one cries. The grazers stop and turn their heads up to the sun.
- **The living (v7):** the Coheirs stop together and look up at the sun until it catches. Their hum stops while they look.
- **The Halt:** its lamp and globe skin flare when the wave reaches it.

**Review fixes:** the Laid Sun's wake runs every frame. Setting `flicker.next` lower now sets `out` (`crystal.js` also sets it). `?gutter=v3` runs from ready, its first gutter 70-150 s on. On the folk from afar (point 2), the decision: the Lappet's folk answer only within 45 m. From the Croft and the heights the answer is the lamps and the far specks; the table says so.
**Found on the way:** the new skylife uniform first collided with the parhelion's `uDark`, which broke that program. It is renamed `uNight`.

### What answers, by region (round two's column)

| Region | After S1 | New in S2 |
|---|---|---|
| Everywhere | the sun, the light, the fog dim; the first gutter at 87.5 s | the night through the sky (stars, violet, the ember out); cold grade; the hush before, the gust after; the lights in a wave outward |
| Old valley | as S1 | the Leerie's standards in the wave; the rooks and crows up calling; the wings kettle; the grazers look up; the tarn's glints out and its cold showing |
| The living (v7) | as S1 | the Coheirs stop and look up at the sun |
| v9, the Halt | lamp turned up | lamp and globe flare in the wave |
| v10, the acts | five moths wheel | a cloud of 48 a spot goes up |
| v11/v12, the Span and the heights | strut; icefall; stair signs | the Span's cloth dead in the hush, whipped in the relief; the Diffident Stair burns in ember veins |
| v14, underground | the Laid Sun warms | its gold runs in bands, every frame |
| v15, the Lappet | lamps, folk (within 45 m), sound | panes house by house in the wave; the Noonwrights' glass on the main and the carrier houses gives back noon; far specks in the wave. From the Croft and the heights the folk do not answer (their update runs only within 45 m) |
| The fen | the corpse-candles, the Reach | glints out, cold up (faint) |

### Tests

- `SHOT_ANGLE=metal ONLY=gutter,acts,stair,village,house,audio,walk,perf,settings tools/suite.sh 8161`: 9 tests, 0 failed (gutter 28 PASS, acts 163, stair 5, village 687, house 20, audio 106, walk 13, perf 29, settings 86). This is the subset, not the whole suite, although shared code changed (`post.js`, `sky.js`, `structures/materials.js`, the bed, `water.js`): the orchestrator's batch run is the whole one.
- gutter-test's new rows: soon, slow, the wave (10 m up 2 s before 250 m), after, a gutter brought forward before 'begin', and `?gutter=v3` from ready.
- Perf: on the branch only, `calls [169, 311]` on the bench, frame 16.7 ms. A "before" run on a second server was refused on this machine, so there is no before/after pair. Nothing adds a draw call or a light: the cloud of moths is in the lures' one instanced mesh, and everything else is a uniform.
- Audio (`tools/audio-survey.mjs --poses=moor-gutter,leerie-gutter,moor-stand`, before against after, `shots/wip/audio/s2-{before,after}`): gates ok on all three. leerie-gutter's roughness was 0.309 before (a gated failure already on the base) and is 0.139 after. moor-gutter goes from -32.7 to -31.3 LUFS: the gutter's 5-15 s are about 6 dB quieter in 125 Hz to 2 kHz (the hush), and the 15-20 s window is 5 dB louder (the relief gust). moor-stand is unchanged. To listen: `shots/wip/audio/s2-after/moor-gutter.wav` from 0 s (the wind falling away), then 15 s (the gust).

### Frames (`shots/wip/`), in order

1. Through one real gutter (`tools/gutter-frames.mjs`, AT=-3,0,1.5,3,5,8,13,17): `v16-S2-seq-moor-*`, `v16-S2-seq-lees-*`, `v16-S2-seq-span-*` (the Span's deck, feet at 56), and `v16-S2-seq-stair-*` (0, 3, 8, 17 s: the stair burning).
   - A blind sonnet helper, told only "consecutive frames of a walk; what happens?", described all three sequences as dusk going to a starry violet night and back.
   - Moor: "the warm glow drains... cold blue-grey... the scaffold's lamps look brighter against the dark... at 17 s back to the warm orange dusk".
   - Lees: "the crystal hill glows more bluely... the sail and street stay lit by a soft glow".
   - Span: "the lamps and the scaffold's lights standing out".
   - It did not name the lights answering one after another.
2. Pairs, held lit and guttered (`node tools/views-v16-gutter2.mjs && node tools/views.mjs tools/views-v16-gutter2.json shots/wip v16-S2-pair low`): `v16-S2-pair-{moths15,coheirs,rooks,grazers,tube,halt,tarn,fen,laidsun,stair}-{lit,gut}`. The stair under a held flicker: see Still weak; judge it from `v16-S2-seq-stair-*`. The moths' cloud seen close: `v16-S2-dbg-moths.png`.

### Still weak

- **The moths at 15 m** are a column of 2-3 px pale specks: seen if looked for, not a cloud at a glance.
- **The Halt's globe, the tarn's cold and the fen** hardly differ in their pairs. The glints are cut 90 % but something else in the tarn's reflection keeps a glitter. The fen's stand is in the reeds.
- **The Coheirs and the grazers** turn their heads, which is too small to read at 7-30 m in a still. The rooks and the wings' kettle have no usable pair (bad stands).
- **The Span's cloth answer** (dead in the hush) shows only in motion.
- **views.mjs and the stair:** under its held flicker the stair's veins do not show, while a real gutter and a held flicker in a plain page both show them. The cause was not found. Moving the stair's gutter reading before its sim did not change it.
- **The wave of lights** is real in the shaders, but nothing in the three sequences shows it plainly: a view that holds many lamps at different distances would.
- **The Lappet's folk** answer only within 45 m (the review's point 2: said, not changed).

### Defaults taken

- The beat: the night through the sky, a cold grade, the hush and the relief, and the wave. Not the lattices' or remnants' own light.
- The stored noon gives back pale gold (1.0, 0.86, 0.58).
- The Span gets the hush and the relief rather than a light.
- `?gutter=v3` waits one of its own intervals.

## Round three (S3)

Fixes to the cold review of round two:

1. **The warm flush no longer steps.** `sky.js` has a separate reading, `flicker.flush`: it rises over about a second from the catch (frame-rate independent, 0 under `flicker.hold`) and then falls over about five seconds. `post.js` feeds it to `uGut.y`. `flicker.after` is unchanged, so the audio latch and `vestige.js` still read the edge. The `gutter` test has a row for the flush: the largest change per frame is 0.017 at 60 fps and 0.050 at 20 fps, with a peak of 1 and gone after.
2. **The relief gust latches on the rising edge of `after`** (`audio/bed.js`), so a hitch between two 10 Hz ticks cannot skip it.
3. **The lure's at-rest cost is what it was.** The five moths of every slot sit first in the instance buffer and the 48-moth clouds after them, and every instance starts hidden. Only the written ranges are uploaded (`addUpdateRange`), and the draw `count` covers the clouds only while one is up and shrinks again.
4. **The water's texture fetch is guarded** by `uDark > 0.0`.
5. **`lampsAt` and `lampDelay` allocate nothing per call:** the smoothstep is hoisted and `Math.hypot` is replaced by `Math.sqrt`.
6. **The wave's centre is held** from the onset until the lights are done (`wcx, wcz` in `sky.js`); it follows the eye only while no gutter or wave is on, so a teleport or fall mid-gutter does not relight a house.
7. **The Diffident Stair's veins: not reproduced.** On this branch `SLAB_U.uGut` reads 0 when held lit and 1 when held at 0.3, and the veins are plainly visible in the guttered frame. This was tried both ways: `tools/views.mjs` with the stair view alone, and with a first view at (-61, 3.1) (the moths15 stand) before it, logging `SLAB_U.uGut` in `pre`; and a plain page at (275, 0). The stand-in for the walker (`pos.set` after an underground `placeAt`) was not needed to get the veins. Ruled out: the load stand, the hold's value (it must be 0.3, since `hold` 1 means lit and gives dark 0), and the update order. The likely cause is that the frames judged earlier predated the stair's gut reading or used `hold` 1 as "dark", but that is a guess.

### Tests
`SHOT_ANGLE=metal nice -n 10 env ONLY=gutter,acts,stair,village,house,audio,walk,perf,settings tools/suite.sh 8161`: 9 tests, 0 failed (settings 86, village 687, house 20, walk 13, audio 106, perf 29, acts 163, gutter 29, stair 5 PASS lines). The subset, not the whole suite, although `sky.js`, `post.js`, `water.js` and the bed changed.

### Frames
`shots/wip/v16-S3-seq-moor-00..07-*s.png` (`PREFIX=v16-S3 AT=7,10,12,13,14,15,16,17 tools/gutter-frames.mjs <base> moor -60 20 1.9 0.05`): the dark holds to 13 s; at 14 s the sun is back, with the flush at 0.45; at 15 s it is at its peak (0.91), and it fades through 16 and 17 s. The warmth comes up across two frames a second apart and is never a one-frame step.
