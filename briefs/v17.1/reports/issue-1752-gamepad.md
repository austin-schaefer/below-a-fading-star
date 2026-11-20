# v17.1 Q2, a controller (#72): report

**What changed.** `src/gamepad.js` (new): fetched by `controls.js` at the first `gamepadconnected` (and one `getGamepads()` check at load); polls on its own rAF only while a pad is connected. Standard mapping: left stick walks (analogue, radial dead zone 0.16), right stick looks (dead zone 0.12, power 1.7, 2.4 / 1.6 rad/s), A hops, X acts, RT/LT held or a left-stick click (until the stick rests) hurries, Start/Back opens the panel. Title: A or Start goes out. Panel: d-pad or stick moves focus (Q1's `settings.focusNext(dx, dy)` / `activate()` first when present, else nearest focusable that way; left/right step a slider), A presses, B or Start shuts (`settings.close()`; A on "Back to the moor" shuts without its lock()). Other mappings: axes 0-3, buttons 0 hop/press, 1 back, 2 act, 3 panel. Hints (title keys line, panel keys line, the offer's `E`) say the pad's buttons from first use (Xbox, PlayStation, Nintendo names by `id`; the button names in their own case, a 2 px focus ring) until a key, click or mouse move; shown at phone width too.

Outside the module: `controls.js` +`pad` vector beside the touch stick (2 lines), its hurry, the arming listener; `main.js` 1 line: `begin` with `detail.pad` skips `lock()` (a pad press is no capture gesture; a refused capture would fall back to drag-look). `settings.js` untouched.

**Tests.** `ONLY=gamepad,walk,touch,settings,loading,perf tools/suite.sh 8162`: settings 90, walk 13, loading 28, perf 29, touch 45, gamepad 33 PASS; 0 failed. Gamepad rerun after the reader's fixes: 33/33.

**Frames** (in order): `shots/wip/v17.1-Q2-hint-{1-title-keys,2-title-pad,3-offer-pad,4-panel-focus,5-panel-place,6-offer-keys}-desktop.png`, `...-{1,2,3,4}-*-phone.png`. Blind reader (haiku): could play with a controller from the screen; said lowercased "a"/"x" read as keys and the 1 px ring was thin: both fixed.

**Weak.** Audio from a pad press: headless runs with autoplay allowed, so untested; if the context stays suspended a hint says the sound waits for a key or click. Real hardware untested. Spatial nav down a column can skip a slider beside a button (left reaches it).

## Round two (the cold review)

- Two pads: each pad keeps its own last buttons; another pad takes the lead only on a button newly pressed on it, and a switch clears nothing. Two pads holding A hop once; holding Start toggle the panel once.
- Other mappings: each axis's first reading is its rest; one resting far from 0 (a trigger at -1 on axis 2) is not a stick and reads 0, the rest read from their rest. "Pad used" (the hints) is a button newly pressed or a stick moved since the last poll, never a steady axis or a held button.
- `controls.js`: Escape toggles the pause with no capture held (gone out on the pad), as in drag-look.
- `move()`: the panel's `focusNext` first; when it moves nothing, DOM focus (left/right on a slider left to the panel's own). The fallback scores by the edge gap along the move plus twice the gap across (0 where spans overlap).
- The stick click's hurry latch clears when the panel opens.
- New rows: two pads holding A / Start, a trigger resting at -1 (no turn, pulled or not; hints stay on keys after a key), Escape after a pad start, focus moved compared by element.

`ONLY=gamepad,walk,touch,settings,loading,perf tools/suite.sh 8162`: settings 90, walk 13, loading 28, perf 29, touch 45, gamepad 39 PASS; 0 failed.
