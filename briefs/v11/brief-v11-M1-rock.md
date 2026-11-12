# Brief v11 M1: the rock

Worktree: `.claude/worktrees/issue-1101-rock` (branch `issue-1101-rock`, port 8161). Work only there. Read `briefs/v11/_common.md` first and do what it says.

## Goal

A visitor standing anywhere in the bowl looks at a mountain face 300 to 500 m off and sees rock that weather made: no ruled lines, no picket fins, nothing that repeats. Today every face in the cold light is a quarry: ledges every 13 to 17 m cut into the geometry, outlined by the curvature bake, brightened by shader ledge lines that never fade with distance, with three more height bands on top and rows of vertical fins across them (`v11-00-before-high-y0.png`, `-high-y4.png`, `-spawn-y3.png`). Replace that with a face organised by erosion. Not the first idea: look at real photographs in your head (the Dolomites' scree fans, the Hoggar, Torres del Paine's ribs, a desert escarpment at dusk) and build what makes those read at a glance.

## Yours

- `src/v4/mountains.js`: the face relief inside `applyMassifs` (gullies, corries, buttresses, noise, and the ledge block). The ledges go, or survive only as rare broken, tilted outcrop that gullies cut through. In their place: drainage that branches upward from the foot (a few big couloirs a massif, many small ones feeding them), ribs between, fans of scree where each gully meets the apron, relief at several scales with the large strongest. The fins must go: find what makes them (probably a high-frequency term stretched vertically, or aliasing of noise against the 2 m grid) and remove the cause.
- `src/terrain.js`: the wall's vertex-colour bake (slope classes, the curvature pass) and the wall's part of the shader (near strata, `bed`, `hard`, the ledge lines, snow on treads, detail and bump). Take the rulers out. Give the wall detail that holds at distance (the bump stops at 60 m today; the wall is never that near): for example a second, larger triplanar scale or normal perturbation from noise for the wall only, streaks that follow the fall line, colour varied by rock mass and by where water runs, snow that lies in hollows and on lee ledges, not in lines. The mesh may be the limit (2 m cells, 3 m on low): if what you need is finer than that, do it in the shader, and say so.
- Budget: #5 allows spending. Shader cost on the wall may rise; `perf-test` on low must still pass and you report its numbers before and after.

## Not yours

- M2 owns the crest spline, the crowns, `buildRing` (far ranges) and the haze by distance. Do not change the crest's height or the face's mean position: hold `faceAt` and `crestAt` within about 4 m at the hung bearings (Hawser 342 to 346, Annals' band at y 110 to 130, Galleries 268 to 296, Lamps 300 to 318, Vigilant 72, Gradine 54 to 59, the Thrones' seats, the Long Figure 103, the Span's abutments 130 and 230, the fall 133 to 145).
- The shared material also paints the bowl's ground, the regions' skins, the Thrones and the Vigilant: confine changes to the wall (radius or `M_START`), and render two ground frames (`spawn-y1`, `foreland-y2` from the view file) to show the ground did not move. The Annals frieze and the Occultation's shadow keep working.

## Done when

- The seventeen views, at medium and at low, have no ruled horizontal line and no fin row at any distance. Zoom into your own frames to check.
- The faces read at a glance as eroded rock, in the cold light (`high-y0`, `high-y3`, `high-y4`) and toward the sun (`spawn-y1`, `highling-y1`).
- Close to the wall it holds too: add three views standing at the walk limit looking up a face (your choice of bearings) and include them.
- The tests in `_common.md` pass; `perf-test` no worse on low.
- `visual-art/land.md`'s "Mountains" says, in five lines or fewer, what you learned (what made the lines, what made it read as rock).
