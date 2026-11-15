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
