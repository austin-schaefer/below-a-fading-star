# v14-B2 report: the heights' faults (#41 #47 #48 #49 #50 #51)

Branch `issue-1402-heights-faults`, port 8163, 2026-11-15 10:08 PST. Every issue's screenshot was fetched (the bodies' signed image URLs) and looked at, so each place is matched **by the screenshot**, not by kind. All six are fixed at their cause; each kind was looked for elsewhere and a check added.

## Per issue

- **#50 the lift gyrates** (`src/v12/lift.js`). Ridden in a real browser on low, medium and under a 4x CPU throttle with `tools/lift-ride-trace.mjs` (every rendered frame recorded). Three causes: (1) `controls.update` places the eye *before* the modules' updates, so the eye rode one frame behind the cage it drew: the bars jumped round the head by v·dt, unevenly as the frame time wandered (up to 11.8 cm a frame); (2) at the counterweight's crossing the look was steered at the weight itself, which passes nearly overhead: the yaw swung 337° in 4 s, the pitch +0.28 to −0.82; (3) the slip at the stop was 0.14 m in one frame, and the eye took the cage's full jolt. Fix: while ridden, the carriage advances inside the carrier's `step` by the frame's own dt (its update skips that frame; the ride's end is released after controls are done with the frame); the look's goal turns at most 0.55 rad/s, eased; the crossing beat holds a bearing along the face and only lifts the pitch; the slip is eased over 0.3 s; the eye takes 15% of the rattle (the cage, lamp and keys still show it all). Before → after (low): largest turn in a frame 3.4° → 0.8°; eye against the cage, frame to frame, max 11.8 → 5.3 cm (what is left is the cage's own jolt rattle; p95 0.9 cm); largest drop in a frame 6.2 → 2.1 cm. Medium and 4x throttle after: 0.6° and 0.9° a frame, p95 0.9 and 1.1 cm. `lift-test` now rides with a wandering frame time (11–33 ms) and checks the eye's place in the cage, dips, and the look's turn rate.
- **#47 the crystal bridge's missing faces** (`src/v12/icefall/plummet.js`). `lead()` wound every face the inside way, so every lead (the bridge, R2's, R3's, the Plummet) was drawn inside out: near faces culled, far ones seen through. Faces reversed. Kind: the only other crystal geometry (`shardGeo`) was checked and is wound outward; `heights-test` checks the leads' signed volume is positive.
- **#41 the lamp's flickering inside** (the waystone, `src/v8/roads.js`: the owner's "lamp" is a gnomon, its V notch and ember bead). The notch's dark lining lay exactly on the head's flanks and shoulders: coplanar faces fighting for the pixel. It stands 8 mm into the notch and 4 mm over the shoulders now. Kind: `tools/coplanar.js` (a page module) finds same-plane overlapping faces; `roads-test` checks 40 heads, `heights-test` the stair's lamp, the cage and the gallery's six warders' lamps: none.
- **#49 the lantern's lighting bug** (the lamp-tender's lamp, `src/v12/stair/top.js`). Its halo was a `PointsMaterial` with no map: a flat pale square 0.9 m wide over the lamp. Now a small shader: round soft falloff, gone within 5–14 m, thinned by the fog. Kind: every `THREE.Points` in `src/` surveyed; the only other square ones are the tally's chalk dust and the Halt's salt (v10, B1's; dust, not lamps): not touched.
- **#51 chain links not connected, clipping the floor** (`src/v5/galleries.js`, `src/v12/lift/gallery.js`; the owner's place (−378, −37) is the gallery at 135 m). Links were laid one outer length apart and their ends sampled off the tips, so a gap showed between every two: the link's hole is now a link length (outer 1.28, wire 0.14) with the tips sampled. The middle boom's tip chain hangs 0.6 m behind the deck's rear and its 1.55 m links cut through the rear plates and runner: the deck is notched round any chain that comes down past it (plates and runner cut back, no floor there, the collider the link's half-width). `lift-test` checks links interlock and no chain goes down through the deck.
- **#48 path through boulders** (the Diffident Stair's slabs in the turf at (272, −18) ran into a High Ling tor). Two tors, (252, −40) and (281, −20), stood on the slabs' beds (the clitter and gorse were cleared off them, the tors were not); they move to (258, −64) and (284, −36). The guard found two more: saltings stumps on P14's and P44's crossings, dropped after the draws. `rocks-test` now checks every scatter collider (by `c.mod`: rocks, vegetation, lattice, region-*) against the roads' and paths' treads, the stair's slabs, the ways up (`ctx.ascents`) and the settings map's stands, at low and high. (The tor at (281, −20) is also the one v12's Status named as hiding the stair's stub from the road.)

## Tests

`ONLY=lift,heights,paths,roads,rocks,edges,walk,perf tools/suite.sh 8163`: 8 tests, 0 failed (paths 76, roads 45, rocks 42, walk 13, edges 103, heights 105, lift 42, perf 28 PASS lines; 5 min 7 s).

`node tools/build-check.mjs http://localhost:8163 --q=low --against=<a503d8a's recording>`: MOVED stair, roads, region-saltings, region-highLing, lift, icefall, galleries, colliders, and core (only the far stand-ins of saltings-stumps, highling-gorse and highling-stonechats). The scatter streams that moved: the High Ling's own (its clitter count depends on where a tor stands, so its gorse and stonechats moved) and the saltings' stumps (2 dropped). rocks and vegetation IDENTICAL.

## Frames, in order (`shots/wip/`)

1. #50: `lift-before-low-01..06-*.png`, then `lift-after-low-01..06-*.png` (also `lift-after-medium-*`, `lift-after-low-cpu4-*`); traces `*-trace.json`.
2. #49: `faults-before-lamp-01..06`, `faults-after-lamp-01..06` (04 is 1.3 m).
3. #47: `faults-before-bridge-01..06` (05 `back-along` shows it inside out), `faults-after-bridge-01..06`.
4. #51: `chains51-before-01-owner-spot.png`, `faults-before-chain-01..08`, `faults-after-chain-01..08`.
5. #48: `rocks48-before-01-spot.png`, `faults-before-slabs-01..04`, `faults-after-slabs-01..04`.
6. #41: `faults-before-gnomon-01..07`, `faults-after-gnomon-01..07`.

## Not fixed, and weak

- #41's flicker does not show in a headless still before or after (it is a frame-to-frame fight); the fix is judged by the geometry check, not by eye. The side-step frames walk off the head.
- Headless Chromium refused pointer capture: the walks used the page's drag-to-look fallback.
- No #50 before-traces at medium or throttled (the low one shows the cause).
- The Halt's seat (`src/v10/halt-seat.js`, B1's) advances in its update, so its rider lags it by a frame too (slower, less visible); written into `runtime.md`, not changed.
- The dark gallery frames (#51) are hard to read; the test is the proof.

## Defaults taken

- The rider takes 15% of the cage's jolt; the carrier turns the look at most 0.55 rad/s.
- The tors' new places (258, −64) and (284, −36), chosen 12 m and more off every slab bed, clear of the stub's sightlines and the Prospect.
- Stumps on a road are dropped, not moved (keeps the saltings' stream).
- A stand's clearance in the guard is a body's width (0.6 m): at 1–2 m a tree by the Deodand Wood's stand failed, though it stands clear.
- `?heights=test`'s site is fixed at (210, 0), where v12's search found it: the search counted colliders and moved with the tors to a place its bridge's foot is not reached.
- `tools/coplanar.js` lives in `tools/` and is imported by the page from `/tools/` (served with the repo root).

## After review (2026-11-15)

- The gallery's notch spans whole plate columns, so the walkable deck and the drawn plates (and grating) agree; `lift-test` samples a 5 m square round the chain (961 points: none walkable without a plate, none drawn but unwalkable). Frame: `shots/wip/faults-after2-chain-06-down-past-the-deck.png`.
- `lift-test` also rides on the page's own frames (12 s from the lever, the middle stepped by hand, the last 10 m real): eye in the cage 0.9 cm a frame at most, look 0.55 rad/s, the end released in the update. About 40 s more.
- `ONLY=lift,heights,edges,perf tools/suite.sh 8163`: 4 of 4 (lift 45, heights 105, edges 103, perf 28).
- For the Halt's seat (B1), the fix pattern, in two lines:
  > Move the seat's advance out of its `registerUpdate` into the carrier's `step(pos, dt)`: advance by `ctx.time.dt`, then set `pos`, and mark the frame stepped so the update skips it.
  > Anything that releases the carry while inside `step` (the ride's end) sets a flag instead; the update calls `release()` after controls are done with the frame.
