# Common to every v8 brief

Read first, in order: `AGENTS.md`, the `wilderness` skill (`.agents/skills/wilderness/SKILL.md`, then `modules.md` and `runtime.md`; the pace rules bind you), `plans/wilderness-v8.md`, `briefs/v8/index.md` (the bible binds you), then your brief.

Your worktree, branch and port are in the dispatch message. First: `git fetch origin && git merge --no-edit origin/next` (the v8 docs are on `next`). Work only in your worktree. `nice -n 10` and `SHOT_ANGLE=metal` on every `node tools/...`; one headless browser at a time; serve on your own port and kill the server when you hand back. Renders at 1280×720 into `shots/wip/`, named `v8-<nn>-<stage>-<view>.png`; take a before of every view you will change, from the same pose, and look at every render you make (the Read tool shows images). A render that does not show what the brief asked for is a failed brief whatever the tests say: redo the work, not the camera.

Deterministic: `ctx.makeRng(salt)` or hashes, never `Math.random()`. Budgets per module at high: about 25 draw calls, 400k triangles in view; merge static props into one or two meshes. The low tier (`?q=low`, phones) must not get slower: say what you drop there. Every new module gets a `?<name>=0` flag, a row in `modules.md`, and a test under `tools/` with a `run` line in `tools/suite.sh` if it has behaviour worth pinning. If a test pins something you change on purpose (a count, a position), change the test and say so in the commit.

Decide open calls yourself and name them in the commit. Add, move and tweak freely within the bible; do not ask.

Before pushing: the tests for what you touched, plus `walk-test`, `perf-test`, `loading-test`, `grass-flicker-test`, `build-artifact` (commands in the skill). Then `git fetch origin && git merge --no-edit origin/next`, rerun what the merge touched, `git push -u origin <branch>`. No PR, no merge into `next`.

Report in under 200 words: what a visitor now sees and where (pos and yaw), the exact test commands and pass counts, the five renders to look at first, anything weaker than the brief asked, every default you took.
