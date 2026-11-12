# Brief v11 M2: the form

Worktree: `.claude/worktrees/issue-1102-form` (branch `issue-1102-form`, port 8162). Work only there. Read `briefs/v11/_common.md` first and do what it says.

## Goal

Seen from the bowl, the five massifs are five smooth bell-shaped humps with flat lilac cardboard behind them (`v11-00-before-foreland-y2.png`, `-high-y2.png`, `-high-y0.png`). A visitor should instead see a range: outlines that climb by shoulders to a summit and fall away differently on the other side, ridgelines that come down toward the viewer as spurs, lower tops stepping back behind higher ones, and beyond them real ranges going pale, lit by the same sun. And the whole wall should sit back: "a supporting character, not the star".

## Yours

- `src/v4/mountains.js`: the crest (the spline's control points, `crownAt`, the crest's distance out) and the large form of each massif: asymmetry (a steep side and a long side), secondary summits and notches along the crest at the 40 to 150 m scale, two or three spurs or shoulders per massif that read as ridgelines from the bowl. Keep each massif's place, rough height and its cols; the sun's saddle stays the lowest col and stays as it is; the Battlemented Ridge, the glacier's notch and the fall keep their code.
- `buildRing`: the far ranges. Make them ranges, not cut-outs: real ridged form with depth (more cells are affordable: #5 allows budget; say the triangle count), lit by the sun's direction so they have a bright side and a shadow side, paler and cooler by tier, with outlines unlike the near crest's (today they are the near crest smoothed, which reads as an echo). They show through the cols and over the low shoulders: check each col.
- Recession: `src/atmosphere.js` / `src/v4/kit/fog.js`, the haze on the walls. In the cold light the near wall at 400 m should have clearly lower contrast and a cooler, paler cast than the ground at 50 m, as it already does toward the sun (`spawn-y1` is the model). Do not fog the bowl itself.

## Not yours

- M1 owns the faces: the face relief in `applyMassifs` (gullies, ribs, the ledge block) and the wall's bake and shader in `src/terrain.js`. Your frames will still show M1's "before" ruled lines; judge outline, mass and recession, not surface.
- Hung things: hold `crestAt` and `faceAt` within about 6 m at Hawser 342 to 346, Annals' band, Galleries 268 to 296, Lamps 300 to 318, Vigilant 72 (its crest is bent to r 476), Gradine 54 to 59, the Thrones' seats, the Long Figure 103, the Span's abutments 130 and 230, the fall 133 to 145. Put your asymmetry, summits and spurs between them. Where you cannot, say which thing moved and render it (`tools/views-v5-mountains-c-hung.json`).
- `walkLimit` does not move; spurs stay outside it.

## Done when

- A silhouette test you can state: trace each massif's outline in `high-y0` to `high-y5` and `foreland-y2`; none is a single symmetric hump, no two are alike.
- The far ranges in every col read as mountains with light on them, at medium and at low.
- In `high-y0`, `high-y3`, `high-y4` the wall is plainly quieter than the foreground and still reads as solid rock, not as fog.
- The tests in `_common.md` pass; `perf-test` no worse on low (report before and after).
- Three lines in `visual-art/land.md`'s "Mountains" on what made the outlines read.
