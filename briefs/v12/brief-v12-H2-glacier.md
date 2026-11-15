# Brief v12 H2: the glacier

Worktree: `.claude/worktrees/issue-1203-glacier` (branch `issue-1203-glacier`, port 8161). Work only there. Read `briefs/v12/_common.md` first; `visual-art`'s `land.md`; `stories/the-reckoner.md`. Model: strong.

## Goal

The owner: "the glacier has always looked kinda ass fwiw, and it's felt weird you can't climb it. if we keep the glaicer, it should be more... glacial. chasms and such things." "Perhaps glacier is high up, spills down a bit, but alos the crystals sort of climb up it. a way fo connecting the valley floor to the mountains. maybe even there's some high crystaline structure you can't get to but can see is cnnected to the ground-level crystal formation."

Today the glacier is a pale smooth ramp in a notch of the north wall (x about 40, z < -200), only 15 m up where the visitor is stopped, with the Lattice (the field of blue crystals) and its 60 m mother crystal at (40,-265) at its foot. Rebuild it as a thing a visitor looks up at from the Lattice and wants to climb, and then can.

- **Ice that is ice.** High in its notch, coming down in an icefall: steps, tilted blocks the size of houses, crevasses with blue depth in them, dirt bands, a broken snout with meltwater, old moraine. Not white: this sun is red and the sky violet; the ice takes both, and its own cold blue only in its depths.
- **The crystals climb it.** From the mother crystal the Lattice goes up the ice in a thinning line: crystals grown out of crevasse walls, across a block, along a seam, so the eye follows them up and the feet can too. They are the way-marks of the climb.
- **The climb.** A route on foot from the Lattice up through the icefall to a shelf 80 to 110 m above the valley floor, inside a corridor (H0's API) no wider than the notch. It should be a climb, not a ramp: along the floor of a crevasse with walls over the head, across a block bridged by fallen crystal, up a stair somebody once cut and the ice has since tilted, out onto the shelf. A touch stick has to manage it; no hop is required. Find the slope limits in the index and build inside them (walkables and `replace` floors where the terrain will not do).
- **The shelf, and what is beyond it.** From the shelf the whole valley lies south with the sun's saddle to the south-west. Behind the visitor, higher and out of reach across a last great crevasse, stands the thing the Lattice comes down from: a crystalline structure far bigger than the mother crystal, plainly joined to the line they climbed. Behind and above it the thread that `src/skylife/remnants.js` already draws "from beyond the glacier pass into the dark with a mote of light climbing it" should now be seen to stand on something. What the structure is, is yours (not the first idea). Whatever is frozen into the ice on the way up, or left on the shelf, belongs to someone: the milestone doc's seed, the Reckoner's thread, the Scriveners.
- **From the floor:** the icefall and the line of crystals must read from the Lattice, the Kept Fire (10,-190) and the centre of the valley as a way up.

## Where things are

`src/terrain.js` (`glacierMask` at about :48, the ice height at about :576, its colour in the bake and shader), `src/v4/glacier.js` (tongue and snout), `src/vegetation/` (the Lattice, `mother.js`), `src/v10/crystal.js` and `thread.js` (the act at the mother crystal: keep it working), `src/skylife/remnants.js` (the thread). The terrain mesh is 2.1 m a cell (3.1 on low): crevasses and blocks want their own geometry over a simple bed, not the heightfield.

## Not yours

`src/controls.js` and the rest of `src/v4/mountains.js` (H0's, merged before you start: use its corridors, stacked floors, edges and `heights-test`; if they fall short, say so and add the least that serves). The notch's bearings on the crest stay.

## Done when

- The climb is registered with `heights-test` and passes; you have done it by hand on keys and touch, frame by frame; a fall from three places lands sane.
- Frames: the glacier from the Lattice, the Kept Fire and the centre (before and after); six along the climb; the shelf looking south, and looking up at the structure; on low and medium, the shelf on high too; `tools/views-v12-heights.json` after.
- A fresh reader shown the frame from the Lattice says it is a glacier and that something leads up it.
- `perf-test` on low at the Lattice no slower; the cost at the shelf written down.
- The tests in `_common.md`, `acts`, `mountains` and, since `terrain.js` is shared, the whole suite.
