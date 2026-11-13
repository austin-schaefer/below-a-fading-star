# Brief v12 H3: the stair that appears

Worktree: written in at dispatch. Work only there. Read `briefs/v12/_common.md` first; `src/skylife/lattices.js` and `remnants.js`.

## Goal

The owner, in #4: "a staircase where only the first stpes are visible from the ground, but as you step up it you find that further steps are revealed, leading to an unknown destination".

On the bare plain in the east of the valley (about (330,-20) is the default; two critics called it empty; walk the candidates in renders first), a few steps of an old stair stand in the grass, climbing to nothing. A visitor who steps onto the last of them finds another is there. And another. The stair climbs west, toward the sun, into the open air: a hundred metres and more, with the valley opening under it, to a place nobody on the ground can see.

- **The appearing is the thing.** Not a fade-in of grey boxes: each tread arrives in a way worth watching (assembled out of the dust, turned into place edge-on, lit by the sun before it is solid, heard before it is seen), a few treads ahead of the feet and no more, and the ones behind stay, or do not: decide, and make the choice felt (a visitor who looks back should feel something). Looking down through a stair that is mostly not there is the fear; use it. It is old work that still functions, worn and once rich, not a hologram or a video-game platform.
- **The route** turns, has landings where the visitor stops and looks, and at least one place where the next tread is not where they expect. No hop is required; a touch stick manages it; a visitor who stands still is safe.
- **From the ground** the first steps must be seen from the Nave (255,40) and the road, and say "climb me". From elsewhere in the valley a visitor on the stair is on nothing.
- **The top** is where one of the old lattices hangs: bring the foot of one (the sky's lattices are drawn as sky, far away; this is a piece of one come low, real geometry, huge and close, turning slowly or not at all) and the landing against it. The seed (milestone doc): a lamp already goes "from lattice to lattice, stops at each a while as if tending it". This is the tender's place and the stair is how they come down: someone with an absurdly large job and small comforts. A plain story, with a file in `stories/`; make the lamp call there if you can.
- **The fall:** from high on the stair it is the longest fall in the valley. With `?fall=1` (H0) it blacks out; without, the visitor lands on the moor. Check both.

## Where things are

A new module under `src/` (the newest folder convention: ask `world-code`'s `modules.md`), H0's stacked floors, edges and `heights-test`. The stair is inside the walk limit unless its top passes r 348, in which case use a corridor. Several hundred treads: instance them, and do not add a collider each.

## Not yours

`src/controls.js`, `src/v4/mountains.js`, `src/terrain.js`. In `src/skylife/`, only what brings one lattice's foot into the world.

## Done when

- Registered with `heights-test` and passing; done by hand on keys and touch at 0.3 s steps over a stretch where treads arrive; falls from three heights.
- Frames: the first steps from the Nave and the road; six on the climb including one straight down and one back; the top; the view west from the top; on low and medium; `views-v12-heights.json` after.
- A fresh reader shown only the frame from the road says there is a stair and wonders where it goes; shown the top, says something about who lives there.
- The tests in `_common.md` pass; the low tier's cost at the top written down.
