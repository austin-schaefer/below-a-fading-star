# Handoff: flickering spars (Austin's austin-01-wood-spars-flicker.webp)

Status: root cause **not yet found**. No source code has changed.

## Where Austin stood
On the Corpse-Candle Fen's **east** edge, about 9 m north of the dead hollow snag at (143, 158) (a `dead` instance in the trees BatchedMesh, `src/vegetation/trees.js` meshHollow, placed by the fen-edge loop at trees.js:622-627), looking south-south-west (yaw ≈ π−0.28, pitch ≈ 0.25). The "huge forked trunk" is that snag with its two snapped limbs. `shots/wip/flicker-01-before-yaw00.png` (pos 144,149) matches his frame: the snag, the white block on the left, the cliffs, the wet path bottom right.

## What the spars probably are
Dark, blunt-ended rods with a sun-lit edge, near eye height. Best match: **reed seed heads** (`src/vegetation/plants.js` reedGeo, plants.js:135-152: dark brown 5-sided tube, r 0.017, on the tallest stem), seen from under a metre while standing in the reed bed. My frames at 144,149 have no reed close enough to show them that large, so his exact spot was a little different. Not confirmed.

## Ruled out, with evidence
- **Tree batch frustum culling**: the per-geometry bounding spheres the BatchedMesh uses (three r170, copied from each source geometry's `computeBoundingSphere`) contain every vertex of all 75 geometries (worst overshoot 0.000 m); the batch sphere is 360 m. Trees have no vertex sway. Hypothesis 1 does not hold for trees.
- **Plant chunk culling or packing** at this spot: yaw 0-360° in 2° steps at (144,149), (143,151), (141,147) → reeds/grass/etc within 6 m packed counts constant (reeds 58/45/93). Walking 80 steps of 0.2 m: 0 instances within 4.5 m dropped between steps. Reeds drawn 4929, cap 20000.
- Frame order: controls update before vegetation (main.js:155, :173), so no one-frame frustum lag.

## Leads not yet checked
1. Tree LOD (trees.js:659-667): hi, lo and far meshes of one variant are grown from the same rng stream consumed in turn, so they **differ in shape** (meshHollow: `sides` changes how many rng draws the lip takes, so lean and limbs differ between hi and lo; meshSkeleton hi/lo/far likewise). A swap at 24/72 m × lodK changes the silhouette: popping on walking past the threshold, not on turning.
2. Shadow camera box (main.js:91, :161) clipping tall casters.
3. Exact spot: find where reed heads sit within ~0.6 m of the eye and sweep yaw there.
Fen-east frames on Austin's Mac at q=high, turning slowly, would settle whether the reeds or the trees flicker.

## Renders (shots/wip/)
- `flicker-01-cand-byre-{n,e,s,w}.png`, `flicker-01-cand-woodedge-n.png`: candidates, wrong place.
- `flicker-01-fen-east-from{NE,N,E,NNE}.png`: around the snag; fromN is close to Austin's view.
- `flicker-01-before-yaw00..02.png`: start of a 2°-step sweep at (144,149), yaw π−16°, π−14°, π−12°. calls 135/135/135, tris 2059642/2054615/2045823. Sweep stopped there; no after renders.

## Tooling notes
- Port 8126 is held by an unrelated python server; I served on 8141. `tools/views.mjs`, `tools/map.mjs` and `tools/grass-flicker-test.mjs` hardcode port 8123 (grass-flicker-test takes `q`, not a URL).
- No tests run: walk-test and grass-flicker-test were not run.
