# v11, for every agent

Read `AGENTS.md`, then load `wilderness`, `world-code` and `visual-art` (its `land.md`, "Mountains"). Read `plans/wilderness-v11.md` (all of it, it is short) and `briefs/v11/index.md`, "Where things are".

The owner, in issue #5: the mountains have "an exaggerated striation effect that's again very distracting"; they were "far too regular, creating an overly artificial feeling"; "Mountains are a supporting character, not the star"; they "need to look natural and are worth spending some budget on, because they're visible in practically every frame." Earlier, on the walls before the massifs: "not 'this is a videogame wall to keep you in' but 'this valley happens to be surrounded by mountains'".

Rules for this milestone:

- **Same views, before and after.** `SHOT_ANGLE=metal FP_BASE=http://localhost:<your port> nice -n 10 node tools/views.mjs tools/views-v11-mountains.json shots/wip v11-<brief>-<round> medium`. The before set is `v11-00-before-*.png` in the deploy worktree's `shots/wip/` (`.claude/worktrees/deploy/shots/wip/`; read them there, do not copy or overwrite). Render low once too before handing back. One headless browser at a time; never delete a render.
- **Look at every frame you take, at full size**, and ask of each: does the mountain catch my eye before the thing in front of it? Is there any line a ruler could have drawn? Would a geologist know which way water runs here? Then iterate. Expect four or more rounds; the first idea will not be good enough.
- **What natural rock has, and ours lacks:** everything runs downhill (gullies that branch upward, ribs between them, fans of scree spreading at the foot); form at every scale from 300 m to 3 m with the big scales strongest; asymmetry (a steep side and a long side); colour that varies by what the rock is and where water and lichen sit, not by height. Bedding, where it shows at all, is broken, tilted, and interrupted by the gullies.
- **Supporting character:** from the bowl the wall should sit behind what stands in front of it: lower contrast and cooler with distance, detail that is there when looked for and quiet when not.
- **Do not move the plan:** five massifs, their cols, the sun's saddle (lowest, 22 m), `walkLimit`, `seats`, the glacier's notch, the fall. `crestAt` and `faceAt` keep their meaning.
- **Others are at work beside you** in `src/v4/mountains.js` and `src/terrain.js`; the index says who owns which part. Keep out of the others' parts, and keep edits to `src/main.js`, `src/world.js` and the skill references to a line or two.
- No `?flag` for the old look unless it is free: git keeps it.
- Tests before handing back, at least: `ONLY=walk,paths,roads,edges,perf,loading,hop tools/suite.sh <port>` (say the counts), plus any your change touches. The orchestrator runs the full gate.
- Hand back as `world-code` says, in under 250 words: what changed, the commands and counts, the six frames most worth looking at (before and after names), what is still weak, any hung thing you saw disturbed.
