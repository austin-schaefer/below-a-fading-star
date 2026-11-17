# Report: issue-1537-tally-touch (T1)

Not reproduced. Two runs on a quiet machine, both green, so no bisect (nothing to find a commit for):

- `node tools/touch-test.mjs "http://localhost:8181/?q=low"` at 2a810c5: 43/43, "offer: up at the tally on touch" passed.
- `ONLY=touch tools/suite.sh 8181` at a99361f (current `next`): 43/43 (204 s), the offer row and the tap, stick and look rows passed.

No code or test changed. The row waits at most 6 s of wall clock (40 x 150 ms) for the offer to rise, and the offer needs 0.25 s of frame time in its condition. Under software GL on a loaded machine frames can be slow enough to miss that window, so the failure is most likely load, not a commit. If it fails again, rerun with the machine idle and note the frame rate before bisecting.
