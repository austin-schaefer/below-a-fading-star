# v14-B1, the acts' faults (#38, #39, #40, #43, #46): report

Branch `issue-1401-acts-faults`, port 8162. Every fault reproduced first in a real browser (new headless Chromium, which grants pointer lock: load, Go out, a click captures the mouse, walked to the act on W steering with the mouse, E, then no input), with the frames kept; then fixed at its cause and walked again the same way. The tool is new: `tools/act-walk.mjs` (frames on the page's own clock at 30, 10 and 2 m, at the offer, and at fixed seconds after E).

## Per issue

**#38, the lure.** Cause: v10-F1's lure was a 4.6 m spiral column of additive saffron motes with a halo, made *brighter* with distance so it read from 40 m; on the dark slab it was a column of lights (the owner's screenshot; v12's critic's "many-armed creature"). Fix: `src/v10/lure.js` rewritten as tally-moths: five chalk-dusted moths that sit on the very spot the hand goes (the next stroke's place, the bell's post ring, the bronze door, flat on the Hypogeum's plate, the seat's plank), wings opening and closing, now and then a short loop, and go up in a flurry when the act is done. Unlit colour, no light, no halo, nothing brighter far off; shrink to nothing from 34 to 42 m. They stay while the act is offered (`acts.js`: `lureWant` no longer drops the offered act), since that is when they are plain. One InstancedMesh, per-frame work only within 42 m. Frames: `b1-before-tally-00..01` (30 m, 10 m: the column) against `b1-after2-tally-00..02` (30, 10, 2 m). At 10 m they are a few small flecks; at 2 m plainly moths.

**#39, the seat.** Cause: the seat hangs 0.26 m off the slab's face and the sitter's eye sits 0.42 m behind the cords, so when the seat turned them out to the country the eye went 0.13 m into the stone for about 4 s of the climb and 2 s of the descent (probed: eye at local z 1.02 against the face at 1.15). Fix: while anyone sits, the seat stands out from the face as far as keeps the eye 0.45 m clear (a sitter pushing off with their feet), eased (`src/v10/halt-seat.js`; `src/v9/waystation.js` passes the face, one argument). Probe after: eye never under 0.45 m from the face. Frames: `b1-before-seat-08..16` against `b1-after-seat-08..16` (1-12 s after "Take the seat"). On the orchestrator's word (B2's #50 finding), the seat also now advances in the carrier's `step` by the frame's dt and its update skips that frame, so the eye no longer rides a frame behind the plank; the set-down waits for the update. Done, and walked again: `b1-after3-seat-06..13` (1-27 s, set down at the end).

**#40, the bell's ring.** Cause: the "giant ring" was the rope coil at the post, one torus scaled to four times its height as the ram was hauled, and not receiving shadow, so a pale ring rose out of the dark grass in the arch's shadow, joined to nothing. Fix (`src/v10/bell.js`): the rope taken in comes down from the post's ring a turn at a time into a loose pile (instanced, up to eight turns), with a rope from the ring down to it, and runs back out when the ram swings; both in shadow. What happens next is unchanged and was already there: the stroke, the dust wave, the nine candles kindling out on the low ground (visible from 8 s in the frames). Frames: `b1-before-bell-03..12` against `b1-after-bell-03..12` and `b1-after2-bell-03..06` (the shadowed pile).

**#43, the hand and the plate.** Cause: the timeline put the hand's shadow at 13.0-17.0 s and the plate's slide at 16.2-17.6 s; the hand was out and nearly gone before the plate moved. Fix (`src/v10/door.js`): the plate starts out at 15.0 s and the hand's shadow is tied to it, fingertips on the plate's back edge, pushing as far as an arm reaches under a door (0.25 m), then flat, fingers spread, while the plate glides on, and back under by 17.4 s. Frames: `b1-before-door-09..17` (hand alone at 13-15 s, plate alone after) against `b1-after-door-10..15` (15-16.5 s: plate and hand together).

**#46, Escape.** Cause: Escape let go of the mouse and raised the old paused card, a second thing beside the gear's panel. Fix: the settings panel is the pause (`src/hud.js`, `src/settings.js`, `index.html`): Escape (the capture let go, or the key in drag-look mode) opens it; it shows the keys under its header (hidden on touch); its Close is now "Back to the moor", which shuts it and takes the mouse again; the Escape that opened it does not also shut it (0.3 s). The title card is only the title (and the GPU-reset notice). `src/controls.js` untouched. Frame: `b1-after-esc-0p3s.png`.

## Tests

All through `tools/suite.sh` on 8162, `SHOT_ANGLE=metal nice -n 10`:

- `ONLY=acts,settings,touch,walk,loading tools/suite.sh 8162` on `ffe2109`: walk 13 PASS, loading 28, touch 43 (43/43); acts 154 of 155 (the new seat-eye row passed; the set-down row failed because the new row reused its variable: a test bug, fixed in `tools/acts-test.mjs`); settings crashed at its first gear click (a 30 s timeout waiting for the button to be stable, under load from other agents' browsers; the same file had run 74/78 minutes before, its four failures my 0.3 s Escape guard applying to the gear's opening too, fixed).
- `ONLY=settings tools/suite.sh 8162` after the fixes: 78 PASS, 0 failed.
- `ONLY=acts tools/suite.sh 8162` after the seat's step change (last code change): 155 passed, 0 failed, among them the new rows: the ride's eye never inside a collider (1353 frames), the bell's rope in turns, the hand and the plate within 0.5 s.
- walk, loading and touch were not rerun after the last two commits (the settings guard and the seat's step), which touch neither.

New checks: acts-test `the ride, press to set-down: the eye is never inside a collider`; `bell: hauled, the rope taken in lies in turns ...`; acts-central `door: the hand and the plate come together ...`; settings-test five `pause:` rows (Escape opens the one panel in drag-look and in captured mode, never the card; the opening Escape does not also shut it; Escape again and Back shut it).

Looked for others of each kind: every carrier in the tree (the seat, the door's knock carry, the lift) for an eye inside stone: the door's carry only eases the walker back on open floor; the lift is B2's. The swelling coil was the only scaled-torus prop on an act. No other act had cause and effect on separate clocks in its timeline (read the T tables of door.js, bell.js, chair.js, crystal.js).

## What is weak

- The moths at 30 m are nearly nothing and at 10 m small flecks: quiet as asked, but no one cold has yet tried to find an act by them. On a phone (low tier, small screen) they will be smaller still.
- The bell's post and its ring sit dark in tall grass; the rope pile now reads as rope, but the post itself is hard to see.
- At the seat's top the slab's shoulder still fills the left of the view (outside the stone, 0.48 m off it).
- Escape in a real desktop browser: headless does not let go of the mouse on Escape, so the walk emulated it (`exitPointerLock`); the 0.3 s guard covers a browser that also delivers the keydown after opening.


## Defaults taken

- #38: moths, not glow: the owner asked for it quiet; findability from 30 m now rests on the place and the easier offer (unchanged), not the lure. The moths stay while offered.
- #39: the seat is pushed off the face rather than the eye moved inside the seat or the davit moved (v9's geometry stays).
- #40: kept the rope (a thing with a cause) rather than removing it.
- #46: the panel does not drop the frame rate to 10 fps (an existing settings-test row says so; `main.js` untouched). Headless browsers do not let go of the mouse on Escape, so the walk and the test do what the browser does (`exitPointerLock`, the `lock` event).
- `waystation.js` (v9) got one argument (`faceZ`); not in B1's list but the seat's only way to know its face.

## After the orchestrator's review (commit 08329c1 and the docs after it)

- **Stuck key (blocker):** a key held through Escape was let go inside the panel, whose keyup swallow hid it from the walk. The keys are now cleared when the capture is let go (`controls.js` syncLock) and when the panel opens. settings-test: W held through Escape, let go in the panel, the walker stays still in it and after it, with no key held.
- **Idle:** the panel (the pause) idles the frame to 10 fps, except for 1.5 s after a change in it (`settings.idle`, one condition in `main.js`). The old row that wanted full rate dates from v7.1, when opening by the gear raised the pause card; nothing needed the full rate.
- **Re-lock:** a capture refused within 1.5 s of a let-go no longer drops the visitor into drag-look; the next click asks again.
- **Moths:** Lambert (lit by the scene), paler; each flies one loop 0.5 m out every 12 s, staggered so one is nearly always up. Frames `b1-r2-tally-00..03` (30, 15, 10, 2 m) and `b1-r2-bell-00..02` (30, 15, 10 m; in the arch's shadow). Honestly: at the tally from 15 m there is one small moving pale speck on the dark slab; I would not find the act by it without knowing where to look, though the slab and its chalk draw you anyway. At 2 m they read plainly as moths. At the bell the moths are a speck at the post; what now makes the bell findable is the post itself.
- **The bell's post:** 1.3 m (a head over the grass), pale with handling, the rope worn pale: it reads against the sky from 30, 15 and 10 m (`b1-r2-bell-00..02`).
- acts-test now pauses as Escape does (the capture let go), not with `#card.paused`. Nits fixed: acts.js's header, the GPU-reset note's words, act-walk's import.

Tests at the review's HEAD: `ONLY=acts,settings,touch,walk,loading tools/suite.sh 8162`: acts 155, touch 43, loading 28, walk 13 passed. Settings failed one new check: it read `pacing.idle` from the last drawn frame, and a software-GL frame can take seconds. The test now asks `targetFps(now)`. After that, `ONLY=settings` passed 83 checks, 0 failed. The test fix is the only change since the full run.
