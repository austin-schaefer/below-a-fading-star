# Bench results

Austin's `?bench=1` runs, one JSON file each, as the bench's Download button names them: `bench-<date>-<commit>-<quality>.json` (the commit appears when the page knows it; otherwise add it to the name by hand). Add the machine to the name when it is not obvious, for example `bench-2026-11-09-a1b2c3d-high-pc.json`. The agent that records them adds a line to the table in `wilderness-v3.md` (stage 4) with the date, commit, machine, quality, avg fps, 1% low and GPU ms per frame.

Nothing else goes here: headless runs are software WebGL and their numbers mean nothing.
