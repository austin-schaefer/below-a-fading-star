# Brief v8-02: places that differ

**Goal.** A visitor who walks from the keep to any other region sees the ground, the cover and the light change, and could tell two regions apart from one frame each. Today a frame from almost anywhere is violet-dark with knee-high tawny grass to the horizon (look at `shots/wip/m8-walk-*.png` in the deploy worktree, `.claude/worktrees/deploy/shots/wip/`). The owner: "almost all areas of the world have similar dark palette, similarly dense vegetation".

**What the audit found.** Cover is `regionCover` (each region's `cover` hook in `src/v4/regions/*.js`: `density`, `scale`, `floor`, `tint`, `tintAmt`) times the biome weights in `src/vegetation/plants.js` `cell()` (~633). Bare already: Adust, Saltings, Strandline, Outwash. Everything else is 1.0–1.45 of the moor. Tinctures (`src/v4/tinctures.js`) turn the haze and hemisphere toward a hue but rescale to the same luminance, so no place is ever brighter or darker than another. The grade (`src/post.js` ~107–170) desaturates a fixed 20% and lifts shadows toward violet everywhere; its only per-place uniform is `uWade`. Fog and the light rig are global.

**Build.**
1. **A character per place**, written as a table at the top of your main file and in the milestone doc, then built. A starting point; improve it:
   - the moor round the causeway and keep: **cropped common**, grazed short and pale (ankle turf, sparse tussocks, bare trodden patches), so buildings and figures stand clear and long shadows read on the ground;
   - the far moor: knee grass as now, in drifts with bare gaps, not a carpet;
   - the Bletting: rank, over the head in places, the greenest and most flowered thing on the map;
   - the High Ling: purple-brown heather, low, wind-flat;
   - the Demesne: a shaven formal lawn, the smoothest ground on the map, dead straight edges;
   - the Lynchets: striped, furrows of different crops' ghosts;
   - the wood: the darkest place, almost no ground cover under the canopy, leaf litter, shafts of ember light;
   - the fen: tall reeds in stands with open black water between;
   - Adust red, Saltings white, Outwash grey-blue, Strandline black: push each further from the others.
2. **Light by place.** Let a region change luminance, saturation and contrast, not only hue: a per-place grade (uniforms in the finish pass fed from `ctx.regions` at the camera, blended over distance like the Tinctures) and/or Tinctures allowed to brighten and darken. The Saltings and the Demesne lawn should be the palest daylight on the map, the wood and the fen the darkest, the Bletting and the Pomegranate House's surroundings the warmest and most saturated. Keep the dying-sun palette; this is range within it, and the transition between regions must never pop (blend over 25 m or more; `pop-test` is in the gate).
3. **Ground colour** through the regions' `ground` hooks and the terrain's biome colours so the change is in the ground itself, visible from the keep top and on the map.
4. **`tools/contrast-survey.mjs`**: one eye-height frame and one 30° downward frame at a fixed pose per region and at six landmarks; reports mean luminance, mean saturation, dominant hue and the share of the lower half of the frame covered by blades; writes a table (`briefs/v8/contrast/before.md` now, `after.md` at the end). A gate in the suite: at least four regions differ from the cropped moor by a stated margin in at least two of the four numbers. Run it before you change anything.

**Constraints.** Density changes re-roll plant placement in the 24 m chunks they touch (`makeRng(33000 + chunk)`); that is accepted in v8, but use the hash-after-draw pattern (`stillWorn` in `src/v7/still/clear.js`, `swardW` in plants.js ~641) where you only need a local patch. `regions-test` pins each region's `airAt` to its `tint`: update it when you change one. Fewer blades should make the low tier faster: report `perf-test` and the bench before and after. Grass that is short must not flicker (`grass-flicker-test`).

**Not yours.** The tracks and their worn verges (01), buildings (03). 01 is making tracks pale relative to the ground; tell me in your report the final ground colours per region so I can check the two together.

**Done when** the survey gate passes, the before/after pairs for every region are in `shots/wip/` and each pair is visibly a different place from the others, and a pan from the keep top shows the regions as patches of different ground.
