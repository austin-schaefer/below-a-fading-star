# v16, for every agent

Read `AGENTS.md`, then load `wilderness` and `world-code` (with `runtime.md` and `modules.md`), and `visual-art` (with `land.md`) if you change anything a visitor sees. Read `plans/wilderness-v16.md` (short) and `briefs/v16/index.md`.

Rules for this milestone:

- **The machine is the owner's and it is in use.** One headless browser at a time, renders and tests in sequence; `nice -n 10` and `SHOT_ANGLE=metal` in front of every `node tools/...`; no `--trace`. Your port is in your brief; never serve, check out or edit anything in `.claude/worktrees/deploy`. Kill your server and any browser when you hand back.
- **Waiting on a run:** never a `pgrep -f` loop (`wilderness`, "Waiting on a run"). Wait on a process id or a line in a log, and never leave a waiter behind.
- **Others are at work beside you** (the index says who owns what). Keep edits to `src/main.js`, `src/world.js`, `src/settings.js`, `src/controls.js`, `src/post.js`, `src/height/field.js`, the audio graph and the skill references to the lines your brief names; new code goes in new files.
- **Judged moving.** Anything that moves or that a visitor does (water at a shore, a light failing, a walk across new ground) is looked at in frames taken in order, your own report shut. A still of the end state does not count.
- **A fault is fixed at its cause, and its kind is guarded:** add a row to an existing test where one fits.
- **Phones.** Render the low tier; stay inside the module budgets (`world-code`). Nothing in this milestone may make the low tier slower.
- **Tests before handing back:** the ones your change touches and any you add, by name: `ONLY=name,name tools/suite.sh <port>` (say the counts; zero tests is a failure). Never the whole suite on a branch.
- **Renders** go in `shots/wip/` as `v16-<brief>-<stage>-<view>.png`; look at every one before you name it; never delete one.
- **Helpers run small.** If you hand frames to helper agents to read, start them on `haiku` or `sonnet`, never on your own model.
- Document in `world-code` (`runtime.md` or `modules.md`), present tense, a few lines, what the next agent needs. Comments in the present tense.
- Commit and push after every part (never `--no-verify`, never force). Write your report into `briefs/v16/reports/<branch>.md` and push it. Hand back as `world-code` says, in under 250 words: what changed, the commands and counts, the frames to look at in order (paths), what is still weak, any default you took.
