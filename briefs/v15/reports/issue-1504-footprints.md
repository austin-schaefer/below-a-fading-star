# F2: the Discontinued Track, whole again (next red after F1): report

Branch `issue-1504-footprints`. Frames are in `shots/wip/` of this worktree (moved to the deploy worktree's on `tools/worktree.sh rm`).

## The fault

`ONLY=dressing` on `next` failed two rows: 15 footprints (wants 40 to 60), ends at x 170.0 to 194.4. Cause as read: F1's reroute (#59, `CAUSEWAY_V4` now runs (172, 135), (190, 160), (205, 160.5), (217, 160), (225, 161.8)) lies along the Track's old line (170, 150) to (215, 160), and `track.js` drops every print within 4.6 m of the road. Reproduced before any change (`before.log`: dressing 22 of 24).

## Where it went, and why

The old line has no room left: the triangle north of the road's bend is about 30 m long and half paved by the road's margin pavers (39 prints at most). A search over the east lobe (every 2 m start, 36 bearings, keeping 6 m off the road, 3 m off every drawn lead sample, 2.5 m off every instanced prop, on crust at 0.75 or more, dry, out of the Pit's block) found three corridors over 30 m:

1. South from the road (177, 152) toward the Pit: it ends in the Span's fallen bay (span-rubble on the line at (177, 180), pavers from z 188). Rendered, rejected.
2. From the western reeds (145, 194) east-north-east toward the Pit: open on paper, but it runs beside the fallen bay's huge deck plates and rubble blocks (`v15-F2-after2-p40end.png`, `-along.png`, `-above.png`). Rendered, rejected: it does not end in nothing.
3. **Taken:** from where the crust meets the moor's step (193.5, 133), south-west over the open flat toward the causeway, to (168.5, 112): **43 prints**, stopping 9 m short of the road. A visitor on the causeway walking north-east sees a line of prints coming to meet the road that never arrives; one on the salt trod P44 passes 7 m from where it starts. It crosses no road or trod; the nearest other thing is the Collation's twelfth rest, 9.6 m off.

## What changed

- `src/v4/dressing/track.js`: `TRACK.from/to` and the header (the story's place and why).
- `src/v4/paths/routes.js`: `STRIPS[0]` (the leads' cost to cross it, the drawn-lead gap) to the new line; P44's brief no longer says it goes round the Track.
- `src/v4/regions/saltings.js`: the keep-out reads `STRIPS[0]` instead of its own copy of the old numbers.
- `tools/dressing-test.mjs`: the ends row now asks both ends' x and z ((193.5, 133) and (168.5, 112), within 1.2 m); the spacing row asks no gap at all ("evenly spaced and unbroken (it crosses no road)"), where it allowed exactly one gap for the causeway's old crossing: stricter, and it now fails if any road is laid across the line again. The count and on-crust rows are as they were.
- `tools/paths-test.mjs` (the strip no lead is drawn on), `tools/sites-v4.json` (the placement map's two sites), `tools/views-v4-dress.json` (`dress-track-along`, `dress-track-end`) to the new line.
- No story file names the Track; the settings map has no entry for it; no lead's route moved (paths, roads green unchanged in count).

## Tests

- Before: `ONLY=dressing,threads,strata,acts,contrast,settings,regions tools/suite.sh 8164`: 6 of 7 (settings 86, dressing 22 of 24, threads 25, regions 56, contrast 3, strata 8, acts 163). `glyphs` and `small` are not tests in `suite.sh`.
- After: `ONLY=dressing,paths,roads`: 3 of 3 (24, 81, 61 PASS lines). `ONLY=threads,strata,regions,contrast,settings,geometry,rocks,acts`: 8 of 8 (25, 8, 56, 3, 86, 41, 42, 163). Nothing else the reroute broke in these.

## Frames (low; before = the tree before this branch, same stands)

- From above: `v15-F2-before3-above-low.png` / `v15-F2-after4-above-low.png` (16 m up: the dotted line on the crust beside the road); 40 m up: `v15-F2-before-above-old.png` (the old line under the road) / `v15-F2-after4-above.png`.
- From the causeway: `v15-F2-before-causeway-old.png` (the old line, on the road: no prints) / `v15-F2-after4-causeway.png`, `v15-F2-after4-causeway-ahead.png` (walking north-east; the line faint on the right).
- Along it and at its end: `v15-F2-before3-along.png` / `v15-F2-after4-along.png`; `v15-F2-before3-end-close.png` / `v15-F2-after4-end-close.png` (the last prints, the road beyond).

## Still weak

- From the road the line is faint beyond 15 m (the prints are 27 cm hollows on the low tier); it is plain within 10 m and along its length. From P44 at 13 m it is not seen (`v15-F2-after4-p44.png`).
- The first line I tried (`v15-F2-after-*`, `-after2-*` frames) and the commits `eb4418b`, `ee28d8d` are the two rejected corridors; `d49517a` is the line kept.
- Not walked on the keys: nothing here moves or is walked on (a decal on the crust).

## Defaults taken

- The direction: off the moor toward the road (the old brief said "from the reed margin toward the middle"; here it is from the crust's edge toward the road, and stops short of it).
