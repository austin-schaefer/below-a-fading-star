# v17 S1, the sphere and the man at the wheel: report

Branch `issue-1705-sphere` (opus), 2026-11-17 06:35 to 07:20 PST.

## What changed

- `src/v17/sphere.js` (new world module `sphere`, marked mesh, `?sphere=0`): the Noonwrights' glass junction at (-322, 22), r 15, centre y 8. One transparent glass mesh (fresnel glaze, milky fields, wandering lime courses, grime and lime at the ground; no transmission pass), lit from inside by one breathing uniform; an earth skin outside the lower glass painted in courses; an additive inner haze; an eye in the top of the glass and a shaft of light from it; the keeper seated in a sling of strands, hands at ten and two on a verdigris valve wheel on the node, head bowed; stays; seven worn hoops leaving south-east toward the Garth (the far ones broken, one fallen); one PointLight under the eye, ~9 s breath. Terrain triangles inside the glass made degenerate; a turf lip in the terrain's colours over the cut edge; one collider r 15.25 and one at each standing hoop's foot. Seven draws; 28.5k triangles on low, 44.9k on medium; builds in 1.0 s (low) / 1.3 s (medium).
- `src/v17/plan.js` S1 section (`SPHERE`: c, r, y 8, node, seat, keeperFace, face, hoops, hoopR). No other brief's row moved.
- `src/main.js` one line; `src/claims.js` one row (the glass + 4 m, the hill behind it to 26 m, the hoops' strip) and its import.
- rocks.js keeps pebbles off no claim, so the module zeroes the pebble instances inside the glass and on the hill behind it (105 on medium). Stones on that hill were seen through the clear glass as lumps in the air.
- Docs: `modules.md` row, `runtime.md` flag, `stories/the-man-at-the-wheel.md` State, Beats, Log.

## Decisions (defaults taken)

- **Site: the west one, kept.** From the spawn the ball is a small pale lens right of the right-hand Throne, under the gantry. Two blind readers named the sun first; the last said the ball is "tiny and nearly invisible", and nothing competes with the sun. So beat 1 (seen from 300 m) is weak from the spawn itself and strong from the Taker's pavements (`sphere-taker`).
- Centre y 8 (the table's 8 to 10), so the east bulge meets the ground and does not overhang it.
- The keeper sits 6 m east of the centre under the eye, at scale 1.8 (about 2.6 m standing: the Noonwrights are a tall people here), facing south-east. At the true centre and at human size he was a 30 px lump that no reader found. The node's lines and the tube's stub went: round one's reader saw them as "a brass telescope".

## Blind readers (sonnet, frames only)

1. r7 (60 m, 20 m, 8 m): "a glass observatory dome ... I can't tell what the small central object is."
2. r10: "a small dark figure ... kneeling ... with a pale-tipped pole." The wheel was edge on.
3. r15 (`sphere-near`, two at about 20 m): "a small seated figure holding a ring and an orange orb ... a bright light shaft from the apex", inside "a large translucent glass dome". Spawn: "the glowing orange sun" first.

## Tests

- `ONLY=geometry,seams,rocks,regions,threads,dressing,edges,walk tools/suite.sh 8165`: 7 ok (dressing 22, threads 25, regions 56, rocks 38, walk 13, edges 214, seams 3 PASS lines). geometry FAIL on `v17-swallow` only (52 new faults: U1's place, which came in with the merge of `next`; no sphere place in geometry). After the claim was widened: `ONLY=rocks,dressing,regions`: 38, 22, 56, ok.
- `height-speed --base=origin/next --sets=valley,fen`, twice: heightAt valley 1.138 then 1.006, fen 0.973 then 1.005; biomeAt valley 0.945 then 1.138. This branch changes no height file (`git diff origin/next -- src/height` is empty): the spread is noise.
- Walk on the keys (`step-frames`, 12 steps of 1 s from 60 m): the collider stops the walker at 15.7 m from the centre, and the feet stay on the ground.

## Frames (shots/wip/)

`v17-S1-r15-{sphere-spawn,sphere-taker,sphere-near,sphere-galleries-foot,air-sphere,own20a,own20b,at60,at8}.png` (medium); `v17-S1-r15-phone-{sphere-spawn,sphere-near}.png` (low, 390x844); the walk, `v17-S1-r13-walk-medium-00..12.png`, sheet `v17-S1-r13-walk-sheet.png`; the spawn before anything, `v17-S1-r0-sphere-spawn.png`.

## Still weak

- The node reads as "an orange orb": it is biscuit-coloured and catches the beam.
- The cut earth reads as a grey floor, not earth pressed to glass.
- The hoops, from the Taker's side, are pale arcs in the grass. On low, a few stones on the far hill still show through the glass.
- The breath has been checked only in the walk frames. No blind reader has judged the frames in order.
- Nothing in `geometry` covers the sphere.

See it on 8123: `?pos=-255,10&yaw=1.71` and `?pos=-296,20&yaw=1.571&pitch=0.2`.
