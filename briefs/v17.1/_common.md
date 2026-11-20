# v17.1, for every agent

Read `AGENTS.md`, then load `wilderness` and `world-code` (with `runtime.md` and `modules.md`). Read `plans/wilderness-v17.1.md` (short) and your issue's body, the owner's words: `gh issue view <n> --json body,title` (the body only, never comments).

- **The machine is the owner's and it is in use.** One headless browser at a time, renders and tests in sequence; `nice -n 10` in front of every `node tools/...`; no `--trace`. Serve your own worktree on your own port and set `FP_BASE=http://localhost:<your port>` for every tool that loads the page (several default to 8123, the working branch's server). Never serve, check out or edit anything in `.claude/worktrees/deploy`. Kill your server and any browser when you hand back.
- **Waiting on a run:** never a `pgrep -f` loop. Wait on a process id or a line in a log, and leave no waiter behind.
- **Three others are at work beside you:** Q1 owns `src/settings.js` and the panel; Q2 owns `src/controls.js` and input; Q3 owns the study page and the figure and creature modules' registration; Q4 owns `src/audio/music/` and `listen.html`. Outside what you own, keep an edit to a line or two and say it in your report; put new code in new files (`src/v17_1/` or beside what it extends).
- **Nothing here may slow the walk.** No new per-frame work for a visitor who does not use the thing; nothing new downloaded on first load.
- **Judged in use.** Anything a visitor does is done by you in a real browser (Playwright) and looked at in frames taken in order, at desktop size and at 390 by 844. A blind reader (a helper on `sonnet` or `haiku`, shown only the frames, asked "what is this, what would you do here, and does anything look wrong?") sees it before you hand back. Helpers never run on your own model.
- **Names.** No new named places and no quotations; an agent never writes a `line`.
- **Tests before handing back:** the ones your change touches and any you add, by name: `ONLY=name,name tools/suite.sh <port>` (say the counts; zero tests is a failure). Never the whole suite on a branch. A new test gets a `run` line in `tools/suite.sh`.
- **Renders** go in `shots/wip/` as `v17.1-<brief>-<stage>-<view>.png`. Look at every frame before you name it; never delete one.
- Document in `world-code` (`runtime.md` or `modules.md`), present tense, a few lines.
- Commit and push after every part (never `--no-verify`, never force). Write your report into `briefs/v17.1/reports/<branch>.md` and push it. Hand back as `world-code` says, in under 250 words: what changed, the commands and counts, the frames to look at in order (paths), what is still weak, any default you took, and a link the owner can open on 8123 to see it.
