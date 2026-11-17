# v17 A1, the water heard (branch `issue-1707-sound`)

`src/v17/sound.js` (started from `v10/sound.js`: an import, a start line and a cue line). Poses in `tools/audio-survey.json`: `brook-run`, `brook-mouth`, `swallow-portal`, `swallow-far`, `swallow-tube`, `garth-floor`, `tube-walk`. Two cue rows in `tools/audio-test.mjs` (`act-water-lap`, `act-water-drop`). `modules.md` has the row.

Survey, LUFS_i / rough, before (`?watersound=0`) -> after:

| pose | LUFS | rough |
|---|---|---|
| moor-stand, fen-edge, tarn, canyon-rim (controls) | unchanged to 0.1 | unchanged (0.001-0.004) |
| moor-gutter (control) | -33.6 -> -33.5 | 0.153 -> 0.159 |
| brook-run | -29.6 -> -28.0 | 0.002 -> 0 |
| brook-mouth | -30.7 -> -26.1 | 0.001 -> 0 |
| swallow-portal | -30.7 -> -25.3 | 0 -> 0 |
| swallow-far (50 m) | -30.7 -> -29.5 | 0.001 -> 0.001 |
| swallow-tube | -41.9 -> -37.2 | 0.156 -> 0.01 |
| garth-floor | -41.6 -> -39.0 | 0.143 -> 0.068 |
| tube-walk | -37.6 -> -33.6 | 0.32 -> 0.108 |

No gated failures. `audio-test` 108/108 (one check failed in a first run through `suite.sh`, whose log was a temp file lost to the pipe; the rerun of the same test passed 108/108).

Things found and decided:
- Two sines in one octave band (D2 and its octave) read `rough` 0.69 (a 73 Hz envelope line): the tube's press is narrow noise bands now, as the draught is.
- A moved panner position set outright is a zipper: 35 clicks (-66 to -77 dBFS) in the walk through the tube, one after gliding positions over 0.12 s (`put`). `tube-walk` allows 2.
- The tube and the Garth rendered quieter than the stone room's bed already was rough (0.14-0.32 before: the walker's steps on a quiet bed); the water bed masks it.
- `brook-run` had 10 weak clicks and a 0.496 s seam before my code (`watersound=0`), 0 after in the last run; not mine, not found.
- Weirs: `stepsOf(levels)` reads any two stations under 4 m apart falling 0.12 m or more; the brook's three steps have a rush each. W2 lists `LEAT.steps = [[x, z, drop, y], ...]` in `plan.js` and the leat has its rushes with no change here.
- The mere's lap is a one-shot (soft knock, 30 m) in twos and threes with 3-26 s rests.

To listen: `?pos=-95,297&yaw=3.14` (the roar, 14 m from the portal), `?pos=-76,232&yaw=3.0` (the fall far off, the brook near), `shots/wip/audio/survey-after/tube-walk.wav` (the roar closing over to the press, then the hall). Not heard by me: levels are measured, not listened to.
