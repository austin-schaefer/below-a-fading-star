Brief: v17.1 Q3, the study page (#77)
Worktree: `.claude/worktrees/issue-1753-study`, branch `issue-1753-study`, port 8163. Model: opus. Work only there. `briefs/v17.1/_common.md` first; load `visual-art` (with its figures and creatures reference).

Goal. Issue #77's body is the brief: read it whole. A dev-only page (`study.html`, `src/study/`), not linked from the walk and loading nothing the walk loads lazily, that stands every figure rig and every creature side by side on plain ground, close and animating, under two lights (a neutral one for form and motion; the low western sun as a visitor meets them), and that shows any recipe that takes an rng (plants, trees, houses, structures) at six seeds side by side. One command renders the sheets into `shots/wip/` in one page load a sheet.

The hard part is registration without rewriting forty modules: find where figures and creatures are built today (`src/fauna/`, `src/v7/walkers/`, `src/v15/people/`, `src/v7/still/`, the uncanny ones, any rig kit) and give each a small way to say "here is how to build one of me, standing alone, and how to advance it", with as little change to each module as possible and none to what the walk draws. A test (`tools/study-test.mjs`, a `run study` line in the suite) fails when a figure or creature module exists that has not registered (decide how "exists" is known: a directory listing against the registry is enough) and when the page throws.

Then use it: render the first sheets, give them cold to blind readers (helpers on `sonnet`), and write what they show about stiffness, poly count and range as a short list of proposed next briefs in your report (the worst five figures by name with what is wrong; which recipes look like one thing six times). Do not fix the figures: this brief builds the tool.

Also: `visual-art`'s render loop and `autonomous-run/critic.md` each get a few lines saying when to use the sheets (edit under `.agents/skills/`, then `tools/link-skills.sh` if the mirror needs it); `world-code/runtime.md` gets the page's params.

Done when: the issue's Done when, line by line, said met or not in your report; `ONLY=study,loading,perf` green (the walk's first load fetches nothing new); the sheets in `shots/wip/v17.1-Q3-*.png`, each looked at.

What the owner can see: `http://localhost:8123/study.html`.

Finish and report as `_common.md` says.
