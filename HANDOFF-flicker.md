# Handoff: flickering spars (Austin's austin-01-wood-spars-flicker.webp)

Status: **fixed** on `v3-flicker` (`src/vegetation/plants.js`, reedGeo). Wants Austin's eye on his Mac at `?q=high`.

## Cause
The spars are reed seed heads within a metre or two of the eye, at the fen's east edge about 13 m north of the dead hollow snag at (143, 158). The plant vertex shader scales every blade's height, and with it the wind bend, by a hash of the blade's `rand` (`fpBh`, 0.75 to 1.25). Each reed's seed head drew its own `rand` instead of its stem's, so it was scaled to a different height from the stem it was built on: it floated free beside, above or through its stem. Measured over the 223 reeds within 10 m of (144.6, 144.4), by replaying the shader's placement in JS: head-to-stem offset **mean 0.31 m, median 0.25 m, max 1.07 m** before; mean 0.01 m, max 0.026 m after (the residual is the linear interpolation of the curved stem). The stems are hairlines, so a free head reads as a disembodied dark spar, and walking or turning through the bed sweeps those near heads hundreds of pixels a frame with no stem to anchor them: spars popping in and out.

## Fix
`blade()` returns its `rnd`; the seed head uses its stem's (`s.rnd`) instead of a fresh `rng()`. It was the last draw in reedGeo, so nothing else moves. Grass seed heads (grassGeo) and flower florets (flowerGeo) had the same flaw and take their stalk's `rnd` too (their `rng()` draw stays, so the rest of each geometry is unchanged). Replayed over the plants within 10 m of the flower drift at (24, −72): grass heads 0.12 m mean off their stalks (max 0.51) before, 0.015 after; florets 0.15 m (max 0.85) before, 0.017 after. Renders: `flicker-03-{grass-heads,flower-florets}-{before,after}.png`.

## Ruled out, with evidence (q=high, device pixel ratio 2, Metal)
- **Tree batch frustum culling**: every geometry's bounding sphere contains all its vertices; the batch sphere is 360 m.
- **Tree LOD swaps (lead 1)**: `setGeometryIdAt` wrapped and counted over a 3 m walk (61 steps) and a 0.6 rad turn (60 frames) at the spot: 0 swaps. hi, lo and far meshes do differ in shape (meshHollow's lip draws `sides` rng values), but no tree crosses a threshold here.
- **Shadow box (lead 2)**: re-rendering one pose with the shadow camera moved as for yaw ±0.1 and ±0.3: 0 changed pixels.
- **Plant chunk culling or packing**: reeds/grass within 3 m change only as instances enter and leave the radius while walking; earlier yaw sweeps gave constant counts.
- Frame order: controls update before vegetation, so no one-frame frustum lag.

## Renders (shots/wip/)
- `flicker-02-fen-east-t{0,1,2}-{before,after}.png`: (144.6, 144.4), yaw π−0.28, pitch 0.25, wind time 4, 9, 13.5 s; `t3` is (145.17, 142.88) at 9 s.
- `flicker-02-reed-heads-closeup-before-after.png`: left of t1, before and after: the floating head sits on its stem.
- `flicker-02-walk-frozen-wind.png`, `flicker-02-walk-parallax-mask.png`: the walk sequence; red marks pixels that change for one 5 cm step only, all of it near-head parallax.
- `flicker-01-*`: the first pass's candidates and the snag views.

## Tooling
- `tools/shot.mjs` takes `SHOT_DPR` (device pixel ratio, default 1); `tools/grass-flicker-test.mjs` takes `FP_BASE` (default `http://localhost:8123`).
- `tools/views.mjs` and `tools/map.mjs` still hardcode port 8123.
