# v14, for every agent

Read `AGENTS.md`, then load `wilderness` and `world-code` (with `runtime.md` and `modules.md`), and `visual-art` and `storytelling` if you make or change anything a visitor sees. Read `plans/wilderness-v14.md` (all of it, it is short) and `briefs/v14/index.md`.

Rules for this milestone:

- **Judged moving, the way the owner met it.** Anything a visitor does or that moves is done by you in a real browser with the pointer captured (the Playwright tools: load, "Go out", walk there on the keys, press the key), with screenshots in order, looked at with your own report shut: can I see it happen, is the cause next to the effect, do my feet stay where the drawing says? A test that teleports, or a still of the end state, does not count. For a fault, reproduce it first and keep the before frame.
- **Not the first idea** for anything new a visitor sees: something they would walk 200 m to look at and could find in no other game; old, worn, once rich (`AGENTS.md`, Tone). Names in the valley's voice (`stories/README.md`).
- **A fault is fixed at its cause, and its kind is guarded.** Where the owner's note is one case of a class (a path through boulders, a chain that does not meet, faces missing), look for the others of its kind and add a check to an existing test where one fits. Say what you looked for and found.
- **Phones.** The touch stick has to manage it; render the low tier; stay inside the module budgets (`world-code`).
- **Others are at work beside you** (the index says who owns what). Keep edits to `src/main.js`, `src/world.js`, `src/settings.js`, `src/controls.js`, `src/post.js`, the audio graph and the skill references to the lines your brief names; new code goes in new files.
- One headless browser at a time; `nice -n 10` and `SHOT_ANGLE=metal` in front of every `node tools/...`; no `--trace`; never delete a render. Your port is in your brief; never serve or check out anything in `.claude/worktrees/deploy`.
- **Tests before handing back:** the ones your change touches and the one you add, by name: `ONLY=name,name tools/suite.sh <port>` (say the counts; zero tests is a failure). Never the whole suite on a branch: that is the orchestrator's, once a batch on `next`.
- Document in `world-code` (`runtime.md` or `modules.md`), in the present tense, in a few lines, whatever the next agent needs to use what you built. Update a story file in the commit that changes what it describes.
- Push after every part. Write your report into `briefs/v14/reports/<branch>.md` and push it. Hand back as `world-code` says, in under 250 words: what changed, the commands and counts, the frames to look at in order (paths), what is still weak, any default you took.
