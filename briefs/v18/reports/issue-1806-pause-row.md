# issue-1806-pause-row: the flaky pause row in settings-test

The row "pause: W held through Escape and let go in the panel: the walker stands still in it and after it, no key held" failed about one run in three.

## Cause

Two faults, the first hiding the second.

1. **The row passed for nothing.** Just before it the test clicks "Back to the moor". `close()` hides the panel (`display: none`) but left the focus on the hidden `#set-close` until Chrome's focus fixup. The panel's `keydown` swallow (`settings.js`, `root.addEventListener('keydown', swallow)`) then ate the test's W: the walker never walked, `held0` was the placed point exactly (`[2,35]`), and every distance was 0. Logged: `activeElement` was `set-close` right after the click in the passing runs and `BODY` in the failing ones.
2. **When W did reach the walk, the walker drifted under the pause.** `open()` clears the keys, but the walk's velocity eases out (accel 14/s): the walker coasted 0.14 to 0.2 m over about 0.3 s after the panel opened, and the row fails that. Nothing was held after the panel shut (`held2.keys` was always empty), and no keyup was lost: no stuck key.

Whether the fixup or the W came first is timing (v17.1's lazily loaded, sliced map changed the main thread's load around the close, the likely reason it started then; not proven).

## A visitor could hit both

- Click "Back to the moor" and press a key at once: the press is lost (W does nothing until pressed again). Short window, real.
- Open the panel (Escape, the gear, Start, the capture lost) while walking: the view drifts 15 to 20 cm behind the panel.

## Fix (`src/settings.js` only; `src/controls.js` untouched)

- `close()`: if the focus is inside the panel, blur it.
- `open()`: after clearing the keys, zero the horizontal velocity when on the ground (a hop in the air keeps its way, so pausing over a gap never drops it short).
- `tools/settings-test.mjs`: a new row checks W reached the walk (KeyW held, speed > 1, 0.3 m walked) before the Escape, so the pause row cannot pass vacuously again.

## Numbers

A loop of the row (scratchpad script, 1280x720, one page, opening and shutting the panel by "Back to the moor" before each round as the test does):

- Before: 29/30 failed (25 with W swallowed, which the loop counts as a failure; 4 drifting).
- After: the test's route (a `lock` false event) 0/60; the gear 0/30; Escape with no capture 0/30; CPU throttled 4x, the lock event 0/30 and the gear 0/30.
- The real pointer-lock route could not be driven: headless Chromium here refuses `requestPointerLock` (`lockFailed` true after a click on Go out). That route goes `syncLock` (clears keys) → `'lock'` → `hud.js` pause → the same `settings.open()`.
- The real test before: 3 of 6 runs failed (with logging added).

`ONLY=settings,gamepad,walk,touch,hop,loading tools/suite.sh 8186`: 6 tests, 0 failed (settings 104, walk 13, hop 30, loading 29, touch 45, gamepad 39 PASS lines). Settings alone five times in a row: 104/104 passed each time.
