# v18-F4 who lives in the wood: report (issue-1804-inhabitants)

2026-11-20, opus. Built against the plan's coordinates: the grove is still moor and the glass a stand-in until F1 and F2 merge.

## What changed
- `src/v18/inhabitants.js` (one MODULES line, `inhabitants`), `stilters.js`, `eyes.js`, `moths.js`; `STILTERS` and `MOTHS` rows in `plan.js` (F4's section). `?inhabitants=0`, `?stilters=0`, `?eyes=0`, `?moths=0`, `?mothpanes=1` (stand-in glass).
- Stilters: four waking (9.5 to 12.5 m, 2 or 3 legs) and one asleep (13 m, shut slits, nest with three eggs, never moves), grown from the trees' own atlas, material and deodand colours. Move only out of a widened view (fov +16 deg, aspect x1.1, a sphere per limb, leaf cluster and moss hank, +1.5 m), never within 7 m, onto a lead (or the north spur's straight line until F1's lead exists), within 3.6 m of a trunk. In a gutter in the grove the four ring the visitor at 8 m, facing in, gap toward the way out. `stilter` event on `ctx.events` ({ i, kind: step|turn|ring, x, y, z, h, from }) for F5.
- Eyes: one Points draw, 3 watchers on low, 4 above; shut or sink within 0.24 rad of the look or 11 m.
- Moths: one instanced draw, 96 on low and 189 above, all motion in the shader; `paneColour` in `PANE_GLSL` is where F2's pane colours should be tied; `MOTHS.r` 7.2 is a guess at the glass.
- `tools/stilters-test.mjs` (`run stilters`), `tools/perf-views.mjs` takes `FP_EXTRA`, `tools/views-perf-v18-F4.json`; study registry rows; modules.md, runtime.md (### v18); `stories/the-patient-wood.md`.

## Tests
- `ONLY=stilters,study,perf,walk,dressing,strata,geometry tools/suite.sh 8184`: dressing 22/0, strata 8/0, walk 13 PASS, perf 29/29, study 15/0, stilters 36/0, geometry 145 passed 1 failed: `house: the baseline is no looser than the place` (a taverna `backs` finding at (88.5, 2, -35.5) no longer found; nothing of mine is near it; I would re-record that one row, did not).
- `stilters-test` with frames: 57/0 (low, phone, medium), 55/0 rerun.
- Perf (perf-views, low, 3 runs, medians; before = `&inhabitants=0`, same tree, a busy machine): grove calls 258→263, tris 1780k→1788k, GPU 23.9→22.8 ms; grove-back 268→272, GPU 18.3→20.3; glass 177→179, GPU 18.9→16.1; wood 214→216, GPU 18.7→19.4; road-mid 190→192, GPU 22.1→20.9. Module CPU 0.02 ms (suite perf). GPU differences are within the run-to-run noise.

## Frames (shots/wip)
- Grove in order: `v18-F4-r8-medium-desktop-00-look`, `-01-away`, `-02-back`, `-03-dark`, `-04..07-ring*`, `-08-ring-above`; the same at `r8-low-desktop-*` and `r8-low-phone-*`.
- Eyes: `v18-F4-r9-medium-desktop-09-eyes-side` .. `-12-eyes-turn100`.
- Moths: `v18-F4-moths-med-moths-{12m,4m,close,plinth}` (stand-in glass).
- Study: `v18-F4-study3-only-{neutral-a,neutral-b,sun}`.

## Blind readers (sonnet)
- Grove frames: "the tree trunk that stood in the middle of frame 1 is gone in frame 3; the big tree on the right has also changed shape" (took it for possible pop-in).
- Study: "a tree-person ... an ent or treant type", 3 to 4 m (no scale on the sheet), "leans toward generic-fantasy", foliage stippled, pose stiff and symmetric.

## Weak
- The stilter still reads as a treant on the sheet (the brief: not ents). In the walk it passes as a forked tree; the arms held up in a V are the giveaway. Next: asymmetric arms, one low and one high.
- The eyes are hard to find in frames at 20 to 30 m (5 px floor); the frames show no pair clearly.
- The moths' ring and plinth height are guesses until F2's house is in.
- Untested until F1 merges: the stilters among real trunks, and the spur as a lead.

## Round two (2026-11-20, the coordinator's notes)

- **Body:** each stilter is now a close clump of two or three long thin boles (76 to 82% of its height, roots flared, a burl and a stub on each; `prop` is a thinner stay set wide). They meet under an ordinary crown grown from the tree recipe's branching. Under the crown hangs a small burl body, and one leafy bough droops out and down among the boles; the knot at its end carries the face, so turning toward the visitor is that bough turning. `lean` and the leg count vary per stilter, 10 to 13 m. The asleep one is sunk into a fork of its own roots, with a trunk going on up and the nest. The study page has a new subject, `stilter-lineup`: two of the wood's own deodand trees and three stilters at one scale.
- **Seen moved:** each step leaves a mark at every foot it lifted (`stilter-marks`, 48 instances, one draw: pressed earth with root-holes). The "behind" step now goes into the way the visitor came (the trail of their last 14 s).
- **Eyes:** 2 watchers on low, 3 above, larger (7 px floor, kept 6 px apart). Sites sit 3.5 to 9 m off the wood way and the spurs, so they are met 8 to 20 m away. They open only toward the frame's edge (0.55 to 0.9 of its half-width), and when centred they blink once slowly and shut, or sink, over half a second.
- **Tests:** `stilters-test` with frames at low, medium and phone: 57/0. The sweep now walks 12 m down the spur. The nearest foot is measured where a stilter stepped to (6.6 m or more).
- **Frames:** grove `shots/wip/v18-F4-s3-{low,medium}-desktop-00..08-*` and `v18-F4-s3-low-phone-*`; eyes `-09..12-*`. Study sheet `v18-F4-r2study3-only-{neutral-a,sun}`.
- **Blind reader on the lineup:** the two wood trees at 85 to 90% "tree", the stilters at 55 to 60% "tree-like", but "their forked trunks read as legs", "walking tree".
- **Weak:**
  - The forked boles still read as legs to a reader who is looking for something.
  - On the phone the test's eyes (0.65 rad off the look) fall outside the narrow frame, so the phone frame shows none. The live rule (frame edge in NDC) does place them inside it.
  - In the frames the marks are faint.
- **Waiting on F1 and F2:** stilters among the lobe's real trees, `paneColour` and the moth ring tied to F2's panes, then everything rerun.
- **Blind reader on the grove frames (s3 medium):** "while my back was turned, the thick tree on the right seemed to be replaced by bare trunks". It still reads as a swap or pop-in, not "that tree followed me". Not yet met.
