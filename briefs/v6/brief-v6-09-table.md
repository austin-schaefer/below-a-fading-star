You are the v6 hardware-table agent for "Below a Fading Star", a Three.js r170 first-person walk in `prototypes/wilderness/` of the Fading Planet repo (no build step, ES modules). v6 is "nothing pops", moved ahead of v7 because Austin, the designer, said "i want to share with folks but currently performance is too poor to share". Austin has measured his laptop (Chrome, medium) before v6 and after each batch; your job is to read every file he sent, write the table that says whether v6 reached the share-ready bar, and lay out his before/after pairs so he can judge each in one sitting. You render nothing and change no source.

Worktree: /Users/user/dev/fading-planet/.claude/worktrees/v6-table on branch `v6-table` (`git fetch origin && git merge origin/claude/intelligent-mendel-ca020e` first thing; every v6 branch through `v6-image` must be merged; if not, list what is missing and continue with what is there). Work only there. No server, no browser.

Read first:
- `AGENTS.md`; `wilderness-v6.md` (Targets, stage 6, `## Results` with every brief's subsection and the defaults each took); the orchestrator's `v6-briefs-index.md` section "The share-ready bar" (it will paste the bar into your dispatch message if the file is not in the repo).
- `shots/perf/`: `laptop-wood-idle-2026-11-08.json`, `laptop-wood-pan-2026-11-08.json` (the pre-v6 samples, with their caveat: three agent browsers shared his GPU during the pan), and every `bench-*`/`record-*` file Austin sent for v6 (named by date, commit, quality and machine; `kind: 'fading-planet-record'` for records; the bench JSON from `?bench=1`). The orchestrator's dispatch message says which file is which batch.
- `src/perf.js`'s record summary (`recFinish`: median, p95, p99, worst, `over2xMedian`, `over3xMedian`, `tierStepsDuring`, the per-sample `gpu` with `post` after v6-02, `shadowRedraws`) and the bench summary, so you read the fields right.

Write, in `wilderness-v6.md` under `## Stage 6: hardware` (create it after `## Results`), present tense:
1. **The table**, one column per measurement (before v6, after each batch), rows: bench 1% low (ms), bench frames over 2× median per minute, bench pixel-ratio steps; wood pan p99, worst, frames over 2× per minute, pixel-ratio steps, shadow redraws per second while turning; GPU per frame standing at (−190, 165) (the first 3 s of the record: total, render, shadow, post); buffer size and ratio. Mark each cell against the share-ready bar (met / not met) and say in one line per batch what moved.
2. **The bar**: met or not, line by line, and if not, which line and by how much, and which brief's area it points to (post, shadow, LOD, something new). If a line is missed by more than 10%, write a `### Needs you` line for the orchestrator instead of a fix.
3. **Austin's pairs**: a list of the before/after pairs each brief left for his eye (from their `## Results` subsections and the `shots/wip/v6-0N-*` names), grouped trees, plants and rocks, shadow edge, creature shadows, fauna fades, light handover, aliasing (the crops first), pixel-ratio step, bloom, banding; one line each with the file names and the flag that shows the old behaviour, and a blank "Austin:" field after each for his judgement.
4. **The defaults table** as the briefs took them (antialiasing, fades versus pushed-out switches, the shadow box, the stall's look), each with the flag that reverses it.

Verify: every number in the table traces to a field in a named file (put the file name in the column header); recompute two cells by hand from the raw arrays and say which. No render, no test run needed beyond `build-artifact.mjs` building (docs only).

Rules (binding): never touch `design/`; never `--no-verify`; never delete or overwrite a render or a perf file; no game content; numbers from Austin's machine only (headless numbers are not hardware numbers; quote them only as ratios and say so); docs in the present tense.

Setup and pace: read-only apart from `wilderness-v6.md`; no browser (the `wilderness` skill: a read-only agent with no browser does not count toward the four). Model: Sonnet.

Finish: commit (`docs(wilderness): v6 hardware table and Austin's pairs (v6-09)`), `git fetch origin && git merge origin/claude/intelligent-mendel-ca020e`, `git push -u origin v6-table`. No merge, no PR.

Report back in under 200 words: the bar line by line (met / not, with the numbers before v6 and now); what moved most per batch; any `Needs you`; the count of pairs waiting for Austin's eye.
