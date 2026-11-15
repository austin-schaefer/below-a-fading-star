# v14-D0 report, round 2 (2026-11-15)

Part A, the kit, pushed at `39e7401` (told to main at once); Part B, the place, on top. `next` merged twice (B1, B2, B3 and the stands in).

## Part A, the kit (`src/v14/under.js`; runtime.md "Under the ground", with a passage in ten lines)

- **A1 the seal.** While the eye is wholly under (`below.here` 1) the camera draws only its own layer: the place's kept meshes, the lights it saw, and per drawable what lies in the cone through an opening (the Nave's hole) or casts a shadow within 110 m of one. At 45 m the sunlit capitals in the hole lost far casters' shadows (0.3% of a frame); at 110 m the pairs with `?seal=0` differ by 0.01–0.06% (the noise between two loads: 0.003%). Numbers on low, `?perf=1`, 6 s a stand, two passes each: from the east end looking back at the hole **285 → 140 draw calls, JS a frame 4.3–6.2 → 2.0–2.9 ms**; looking down the hall 112 → 98 calls, 1.8–1.9 → 1.7–2.0 ms; the rim (unchanged) 3.2–5.1 ms. The floor now costs less than the rim everywhere.
- **A2** `pathBelow(T, line, { half, cover, deep })`: a polyline's volume under `heightAt - cover` (sampled every 2 m); `add()` returns a handle (call it to remove; `.fn` to reuse where volumes meet).
- **A3** `underMaterial(…, { far: [near, far] })` fades to black with distance.
- **A4** `belowLit(material)`: any built-in lit material's sky light and haze cut by the volumes per fragment (16 capsules). Limit: ShaderMaterials, Points and unlit materials are not cut (documented). The Nave's shapes use it.
- **A5** `ctx.nave.ceilAt` exists; the road waits on `ctx.built('nave')`; `?coffinroad=0`, `?skip=coffinroad` or an `only=` without it leave the rim's colliders and the south wall whole.
- **A6** `add(fn, { size })`: the stone room's tail scales 0.4–1 with the size of the volume the listener is in (the passage 0.35); the surface is unchanged (size 1 outside every volume). `space.at(x, z, out, y)` takes the listener's y; no y means the surface.

## Part B, the place

- **B1 the forty.** Six-sided coffins, a lighter lid with a raised coffin-shaped panel over a darker body, rope handles tied pair to pair (the old lashings across the way read as sleepers), boards laid along the gaps and darker. Not alike: two children's, crude board boxes with plank lids, one fine (pale wood, a gilt plate, the sun's boss), lids slid off the head (the black inside). Pair 9's north coffin is adrift beside the road, lid off and floating, a shroud in it, candle out; its place bridged, its rope in the water. One far down the north aisle, candle lit. The last pair: one coffin and an empty place, its ropes laid ready. 30 + 4 + 4 on the road, 2 adrift: forty. **The count settled** (story file): forty graves on the hill for these, the forty-first the twelfth diner's; the coffin on the trestles (lid slid, empty, his size) is the Sexton's own, and its place is the empty one under the sun.
- **B2 the water.** Water's Fresnel (2% looking down, a mirror at a glance: black from the stair), a black body, four drips ringing slowly, each flame's image a thin vertical streak (4 on low, 8 above), the coffins 8 cm lower; on every upright a dark wet band and a pale tide line; boards, two black wreaths and the lid floating.
- **B3 the sun.** 12 m across in a moulded ring standing out of the east wall; a grid of tesserae, gold left in patches (its own metallic draw: the candles glint in it as you come) and dark sockets where it was picked out; sixteen red and ochre rays to the vault; a step at its foot with fallen gold awash; the great candles and two brackets either side are warm, the only warm light down there.
- **B4 the columns.** Drum joints, flaking plaster with a trace of red, blue-grey and ochre, the tide line; the north aisle's column at (282.5, 29) lies in the water with its capital beyond.
- **B5 a light every way.** Six candles in iron brackets on the walls (two warm by the sun) and the lit coffin adrift. Around-sheet on low (`coffinroad-r2-around-sheet.png`, 32 frames): median luma 23–49, pixels under 8/255 at most 0.9%, under 20/255 at most 32% (looking at the north wall from x 285, where the brackets are 20 m off).
- **B6** tapered candles with runs of wax, teardrop flames with a white heart; the "glowing blobs" were the broad glow round each flame's image on the water: gone (a thin streak now).
- **B7** the stair's head is clear of rocks, plants and scatter (`naveClear`, `naveHole`); the rubble stays 0.5 m past the floor's held end; edges-test has the stair at 98% and the landing (over the hole held; over the turf, onto the turf, never into the hole); the water's loop is 4 on low; stats fixed; `at()`'s y.
- **B8** the moth by the shears in keys-medium 02 is a Twk-man on his dragonfly (v8, not an act's lure; not mine to move); the shears' lantern now has the pull: never under 3 px, a wide halo.

## Tests (round 2)

Part A, on its own tree (`39e7401`): `ONLY=edges,walk,hop,heights,audio tools/suite.sh 8161`: 5 tests, 0 failed (walk 13, hop 25, edges 124, heights 111, audio 101); edges and heights again on a clean export of the commit: 124 and 111 PASS.

Part B, with `next` merged (B4 stands, B5 quotations): `ONLY=edges,heights,settings,walk,hop,audio,perf,loading,regions,paths,roads tools/suite.sh 8161`: **11 tests, 0 failed, 18 min 37 s**: settings 85, paths 76, roads 56, regions 56, walk 13, hop 25, edges 136 (12 new: the stair at 98%, the landing over the hole and over the turf), heights 111, audio 101, loading 28, perf 29 PASS lines. On the way: with `next` merged only up to B4, `audio` failed `act-bell-letters` (+0.5 dB, the bell's tail under the cue) three times running while the Part A tree and `next` passed; merging B5 cleared it (+2.3 dB), so I take it as `next`'s at that point, not this branch's (the audio graph is the same in Part A and here).

## Frames, in order (`shots/wip/`)

1. `coffinroad-r2-low-01-moor` … `-12-up`; the same as `coffinroad-r2-medium-*`, `coffinroad-r2-high-*`; `coffinroad-r2-high-dpr2-shears.png` (`SHOT_DPR=2`, 2560x1440) and `coffinroad-r2-high-dsf2-*`.
2. Walked: `coffinroad-r2-walk-touch-low-01..17`, `coffinroad-r2-walk-keys-medium-*`, `coffinroad-r2-walk-keys-high-*` (each `walked: yes`, lowest feet −16.74, no page errors).
3. Every direction: `coffinroad-r2-around-sheet.png`.
4. The seal, pairs: `coffinroad-r2-seal-*-off2.png` against `-on4.png`.

## What a stranger would now call them

- the road: a road of coffins on black water with a candle on every pair;
- the floor: still black water, columns standing in it with a tide line, the candles streaked in it;
- the thing at the end: a great mosaic sun in the end wall, most of its gold picked out, glinting in the only warm light.

## Still weak

- The water is black and streaked now but from far it is still a smooth plane; the columns are not reflected.
- The plaster patches still read a little like spots at mid range.
- The sun's rays partly hide behind its ring; the gold catches the light but there is no specular sweep yet on low.
- The step under the ground is the hard step on coffin lids too (wood would want its own).
- The Twk-man near the shears still draws the eye on the way there.


---

# v14-D0 report: the first descent (the Coffin Road)

Branch `issue-1400-first-descent`, port 8161, 2026-11-15. The Foundered Nave is entered: the first place in the walk below the ground.

## What a visitor finds

On the Nave's south-east rim stand **the Sexton's shears**: two black timbers lashed at the head 9.5 m over the moor, a corpse-candle lantern (the palette's wisp green) hung from the head, guys back to stakes, a coffin on two trestles beside them. A **landing** of planks a step over the turf runs out between the legs over the lip; from its end a timber **stair** hung on a fan of six chains from the shears' head goes down 17 m through the hole's light along the south aisle (40°, hand-ropes both sides) to the black water. On the water **forty coffins** lie lashed two by two, a candle on each pair: a raft of four at the stair's foot, a pair south to a **door in the south wall** (a candle each side; behind it a level floor, three steps going down south and the vault fallen in across them), a pair north between the columns, and sixteen pairs east along the nave on z 42, out of the hole's light and under the roof, to the east wall, where **a sun is set in tesserae** (red rays, a few dozen gold pieces left) over two great candles. The water doubles the eight nearest flames. It is the Sexton's: `stories/the-coffin-road.md` answers the twelfth chair's open thread (whose are his other forty graves?) and touches the Reckoner's tesserae.

Not the first idea: no ladder, no crypt. A gravedigger's hoist, a hung stair, and a road you walk on that is the dead.

## The kit (for the passage and the chamber next)

`src/v14/under.js`; `world-code/runtime.md`, "Under the ground", says how to use it.

- **Dark:** `underMaterial(mat, key, glow)` scales the sun, the hemisphere and the ambient per vertex by `aUnder.x`, the haze by `.y`, adds a baked glow `.z` in the lamps' colour; point lights and emissive pass untouched (the Nave's old `outgoingLight *= vLA.x` killed them). `UnderBuilder(lit)` builds one flat-shaded mesh with it baked. The Nave's hall now uses it, with the road's candles baked in (`glowAt`).
- **Sealed:** own inside-out meshes (the passage: floor, walls, vault, a black end); the terrain left alone.
- **Below:** `ctx.below` (`add(fn)`, `inside(x, y, z)`, `here`). post.js: the sun's glow and rays times `1 - here` (one line); the grade eases to `UNDER_GRADE` (the dark-adapted eye: 1.25, 0.85, 1.12, -0.03). graph.js: `inside` is a stone weight (`at()` takes a `y`, the camera's by default). bed.js: `inside` shelters the wind. steps.js: under the ground the step is the hard step, never the region's.
- **Floor:** one stacked floor with held edges for stair, landing, raft, spurs, road and passage (`plan.js makeFloor`); a held catch floor in the water (`NAVE.water - 1.25`) and a 0.9 s rescue onto the nearest road; the ascent `coffin-road` (`held: true`).

## Which wall the passage leaves by

**The south wall**, z 54.5, centred x 246.7 (2.2 m wide, 3.0 m high), one bay east of the choked west end. Its sill is y **-16.70** (the road at -16.66; the moor overhead about -0.4, so about 16 m down). Inside: level to z 56.8, then three treads down south (to -17.36) and the fall at z 58.4. It heads south toward the Pit (200, 185), whose floor is -27.7: D1 has about 11 m to lose over about 140 m.

## Tests (counts printed)

**Final:** `ONLY=edges,heights,settings,walk,hop,audio,perf,loading,regions,paths,roads tools/suite.sh 8161`, on the branch with `next` merged (B2 and B3 in): **11 tests, 0 failed, 16 min 47 s**: settings 76, paths 76, roads 64, regions 56, walk 13, hop 25, edges 124, heights 111, audio 101, loading 28, perf 29 PASS lines. `roads` is added because the Coffin Road is now a landmark with `reached` (B3's scheme); roads-test learnt that a place reached by its own way may be under the ground (feet under -5 m).

Before that: the same ten (without roads) after the first `next` merge gave 10 tests, 1 failed: `edges`, 3 rows (the landing's side colliders stopped a walker from bearing 120 3.9 m short of the lip); fixed in `ef9d720` (the stair's side colliders only over the hole). `node tools/build-artifact.mjs`: wrote `dist/artifact.html`.

Also run alone before the suite, on this branch: `edges` 124 PASS 0 FAIL (21 new Coffin Road rows), `settings` 73/0, `heights` 108/0 (the ascent `coffin-road` walked, four step-offs sane, top 16.70 ms vs floor 16.70 ms).

`tools/coffin-walk.mjs` (new, a judge's tool): touch stick on low, keys on medium and high (headless refuses the capture: steered by the drag fallback; the earlier Playwright-MCP walk on medium had the pointer captured): `walked: yes` each, from the trod north of the Nave to the shears, down, along the road to the sun, back, up and out; lowest feet -16.66; no page errors.

## Frames, in order (`shots/wip/`)

1. The descent on low: `coffinroad-d0c-low-01-moor` … `-12-up` (moor, shears, head, flight, stair, raft, road, under the roof, the sun, back toward the hole, the door, up the stair). The same on `coffinroad-d0-medium-*` and `coffinroad-d0-high-*`; `coffinroad-d0-high-shotdpr2-shears.png` at `SHOT_DPR=2` (2560x1440).
2. Walked by hand: `coffinroad-walk-touch-low-01..17-*`, `coffinroad-walk-keys-medium-*`, `coffinroad-walk-keys-high-*`.
3. Every direction from the floor: `coffinroad-d0-around-sheet.png` (four floor points, four headings, up and down; each frame `coffinroad-d0-around-dir-*`). Sky shows only through the hole; no terrain underside, no sunlit surface under the roof.
4. Before the landing (the turf wedge over the stair's head): `coffinroad-d0-low-03-head.png`, after: `coffinroad-d0c-low-03-head.png`.

## Numbers

- **Histogram (low):** under the ground, median luma 27–40 of 255 (the moor 46–62); pixels under 8/255 at most 0.8% of a frame (the sun at the road's end); under 20/255 at most 23%. It never goes black.
- **Audio** (`tools/audio-survey.mjs`, before on `next`, after here; `shots/wip/audio/survey-d0-before`, `-after`): `nave-rim` -30.7 → -30.7 LUFS, centroid 359 → 359 Hz (the surface unchanged); `nave-floor` -41.2 LUFS, centroid 167 Hz (the wind gone, the stone room); `nave-floor-walk` -37.3 LUFS, rough 0.22. The click's sine body beat in the stone room's tail (rough 1.98); under the ground its body is a noise thud now. The two below poses carry bands from their first render, gated only on clicks.
- **Cost:** the road is 2 draws (one mesh, ~8k triangles; one Points), 12 point lights (three slots). JS a frame on low (`perf=1`, 6 s each, two passes): the rim 4.8 ms; the floor looking east 2.8–3.9 ms, looking back west at the hole 4.9–5.9 ms (the same 285 draw calls as the rim; the extra is in `render`). `load-probe` low, 3 runs: ready 6104 ms here against 6290 on `next` (−3%).
- **build-check:** `node tools/build-check.mjs <next at 0a10449> --record`, then `--against` here: 54 identical, 3 moved: `coffinroad` (new), `colliders` (the rim's now have y and h, the gap, the road's), `nave` (the hall's attribute `aLA` → `aUnder`, 1,908 fewer vertices: the slabs off the road and the door's gap; the water's uniforms). The terrain and every other module identical.

## Defaults taken

- The way down on the **south-east rim**, the stair down the south aisle: the hole is not seen from afar, the shears are (from the trod off the Prospect, from the west, from the slope). I did not find an "east road"; the Pit's road ends 150 m south-west.
- The hall's floor is **the coffins on the water**, not a dried floor: the water stays (its shapes, its splashes) and the walk is held on the road; a fall in is caught and put back on the road after 0.9 s (with `?fall=1` there is no route to a 12 m fall: the rim's colliders and the held edges stop it; untested by teleport).
- The rim's colliders now stand from 1 m under the turf to 2 m over it (so they do not reach the road under the hole).
- The passage **fallen in**, not sealed: three steps down, then the vault's blocks.
- A landmark "The Coffin Road" in `world.js` (B3's scheme, merged from `next`: an axis along the road, `feet: [-22, -8]` so the card is the road's only down there and the Nave's stays the rim's, `reached: 'the Sexton’s stair'`) and its stand in `settings.js` NAMED_POSES on the road at (250.4, 42), looking east; settings-test measures a stand under the ground from its own floor and does not call it a hole.
- The grade under the ground lifts exposure 1.25 (not darker): navy, not black, on a phone.
- Two slabs and the fallen column's drums moved off the road (drums 3.2 m north).

## What is still weak

- Looking back west from the east end costs about 1 ms more JS than the rim: the moor above is still drawn (no occlusion under the ground). For 155 m of tunnel, hide what is above (a layer or a per-module switch keyed on `ctx.below.here`) rather than lean on depth.
- The columns lit by the baked glow read flat teal on their long faces (vertex light over 5–14 m quads).
- The sun's gold is dim: a few dots, not a glint.
- The stair is steep (40°) and its treads are a slope to the feet.
- The water under the hole reflects the sky lavender and reads more like ground than water from above.
- The step under the ground is the same hard step on stone and on coffin lids (no wood).
- Beat 7 (the empty graves) is a seed: nothing on the Saltings says so.

## For 155 m of tunnel

Bake `aUnder` from a lamp list as here, but chunk the tunnel into a few meshes by distance so far segments drop; register one `boxBelow` (or a capsule fn) per segment; use one stacked floor fn along a polyline (distance to the line, with a slope), not rectangles; give the floor a catch everywhere it can be left; hide the surface's modules while `ctx.below.here` is 1 and no opening is in view; keep the lamps every 8–10 m so there is always a next light; and build a sealed end-cap wherever the tunnel turns, so a turn never shows the hall's back face.
