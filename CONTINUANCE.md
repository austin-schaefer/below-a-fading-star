# Continuance: Below a Fading Star, after v5

Written 11:04 PST on 2026-11-08 and updated 11:14 PST after Austin's measurement and his phone and Firefox checks, for a fresh orchestrator session. Read with AGENTS.md (repo root) and HANDOFF.md (the run's rules; binding). Delete this file, HANDOFF.md and wilderness-run.md when v7 ships.

## Where things stand

- **v5 ("the built") is on main**: PR #95, merged 10:52 PST 2026-11-08, all CI green. Release notes in `RELEASES.md`; shots curated as stages 27–40; `wilderness-v5.md` is the spec, `wilderness-v5-coherence.md` the coherence pass.
- **Milestones were renumbered on Austin's instruction**: **v6 = performance and visible artefacts ("nothing pops"; `wilderness-v6.md`)**, **v7 = the living** (figures, small characters, the Link-Boy, the Luminous Reach, the glyph motif, then audio). `wilderness-run.md` items 4 and 5. Austin: "i want to share with folks but currently performance is too poor to share."
- **Working branch** `claude/intelligent-mendel-ca020e` in worktree `.claude/worktrees/wilderness-deploy`, in sync with main at the time of writing. It is served on **port 8123** by `http-server` started with `nohup nice -n 10 tools/serve.sh 8123` from `prototypes/wilderness` in that worktree (pid may not survive the old session: if `lsof -ti:8123` is empty, start it again the same way). That is Austin's live view; files update live, so merge there and never run agents there.
- The main checkout `/Users/user/dev/fading-planet` is Austin's live wiki: never pull, build, commit or run agents in it.
- **MORNING.md** is Austin's log, newest first; insert new entries after the line `Reverse any of them by saying so.` and its blank line. **Take the time from `date '+%H:%M'`**, never from an estimated clock (today's entries drifted seven hours and had to be corrected).
- Nothing is in flight. Worktree `.claude/worktrees/v6-harness` (branch `v6-harness`, Playwright installed) is prepared for v6-01 and is at the working branch's head.
- The hourly check-in cron was deleted with the old session; recreate it (below).

## Austin's clean measurement: done, and what it changed

Committed as `shots/perf/laptop-wood-pan-clean-2026-11-08.json` (medium pinned, 1920×1117 at pixel ratio 1.0, Chrome, no agent browser): 1500 frames at 60 fps, median 16.7 ms, p95 17.3, p99 17.5, worst 33.3, 0 frames over 2× the median, 0 pixel-ratio steps, 3 dynamic shadow redraws in 25 s, programs steady at 159. The hitching is fixed; share-ready bar items 1 and 2 are met. The GPU timers are not a cost breakdown here (they sum to 29.8 ms a frame at a steady 16.7 ms frame; the output pass likely carries the vsync wait), so the post chain's real cost is unknown until v6-01 measures it with the cap off. Austin then walked production on an iPhone ("phone performance seems fine") and found **light sources drawn as flat squares**, then saw the same on desktop Firefox; Chrome is clean. That is v6-00, first in line. Austin: "i don't wanna have a gigantic long milestone if performance is basically fine" → **v6 is cut to three batches** (below).

## v6: the plan and the briefs

- Plan: `wilderness-v6.md` (survey, catalogue, targets, six stages; stage 4's pixel-ratio and shadow-cadence parts already landed in `fix-dpr-steps`). Briefs: `briefs/v6/index.md` (dispatch order, batches, shared-file hot spots, the share-ready bar, the open questions decided at their defaults: log each default in MORNING.md when its brief merges) and `briefs/v6/brief-v6-01 … 09`. `briefs/v6/pairs.mjs` is the survey's pinned-pair script that v6-01 turns into a tool.
- Order (slim v6, `briefs/v6/index.md` "Slim v6"): **batch 1** v6-00 square lights (Sonnet, new brief, port 8173, worktree `v6-square-lights` to make) and v6-01 harness trimmed to `pop-test`, `pair-diff` and the uncapped GPU measurement (Sonnet, port 8172, worktree `v6-harness` ready); **batch 2** v6-04 trees and v6-05 ground (two Opus), time-boxed to the near switches; **batch 3, only if v6-01's uncapped run shows the post chain ≥ 40% of a GPU-bound frame**, v6-02 finish pass; then curate, `RELEASES.md`, merge to main as **v6**, and v7 begins. v6-03, 06, 07, 08, 09 are deferred with their briefs on disk.
- Every brief has its port to fill (`PORT`) except v6-01; give each agent a distinct port from 8172 upward and a worktree made with `git worktree add -q -b <name> .claude/worktrees/<name> HEAD` from the deploy worktree, then `npm install --no-save --silent playwright@1.63.0` in its `prototypes/wilderness` (no package.json; keep it that way).

## How each hand-back is handled (what worked today)

1. Fetch; a **cold Sonnet review, read only**, of `git diff HEAD...origin/<branch>` with the brief's claims listed; blockers and should-fixes go back to the author by SendMessage; merge after.
2. Merge into the deploy worktree with `git merge --no-edit origin/<branch>`; keep-both for README's URL-params line, then deduplicate it (split on `; `, keep first occurrences); push; remove the worktree (`git worktree remove --force`, `git branch --unset-upstream`, `git branch -d`).
3. One full suite per batch on 8123: `briefs/suite-batch.sh` (zsh; batch 9 was 295 checks, 0 failed; summarise with `grep -c '^PASS'` and `grep -i fail | grep -v '0 failed'`); the loading test rewrites `shots/wip/loading-01-card-*.png`, `git checkout --` them after.
4. Log every merge and every decision in MORNING.md; Austin reverses by saying so.
5. Release: curation per `tools/curate-shots.md` (a release agent did v5's), `RELEASES.md`, `gh pr create` against main, `gh pr checks` until no `pending` and no `fail` ("no checks reported" means wait), `gh pr merge --merge`, then merge origin/main back into the working branch.

## Open for Austin's eye (none blocking; all logged in MORNING.md)

- **Light sources draw as flat squares in Firefox, Safari and iOS Safari** (production, v5): v6-00, batch 1. Austin confirms on the phone after the fix merges.
- The massifs' bedding ledges read strong and even from the high east view (a quarry face); a number in `src/terrain.js`'s marked block lowers the amplitude or varies the spacing.
- The Battlemented Ridge's regularity is its stated idea and was left; the Armiger's Tower's mast still crosses the Galleries from the Lynchets (−165, −105).
- The causeway's post lamp keeps a glass box under a pyramid cap (the Leerie's standards were restyled to lamp-cages; the post lamp was not).
- The Annals' band is absent over bearings 0–14, 105–119, 174–186, 239–261, 324–331 (the face is not at 110–130 m there); nothing floats.
- A lamplighter for the Leerie's row and every figure is v7.

## v7, later

`briefs/v7/index.md` and `brief-v7-00 … 07`: 27 design gaps decided at the briefs' defaults, to be logged in MORNING.md when v7 starts; dispatch order v7-00 prep, then 01/02/04/06 together, then 05, then 03, then 07 audio. Never invent game content beyond the briefs' sources (`IDEAS-v5.md`, `wilderness-v4-placement.md` section 5, the picks in `wilderness-v5.md`).

## Session start checklist

1. Load the `orchestrator` skill; read AGENTS.md, HANDOFF.md, this file, MORNING.md's top ten entries, `wilderness-run.md`, `wilderness-v6.md`, `briefs/v6/index.md`.
2. `cd .claude/worktrees/wilderness-deploy && git fetch && git status`; confirm 8123 serves (restart if not).
3. Recreate the hourly check-in: `/loop 1h` with the text: "Hourly check-in for the Below a Fading Star run (prototypes/wilderness, working branch claude/intelligent-mendel-ca020e in worktree .claude/worktrees/wilderness-deploy). If agents are running and nothing is blocked, do nothing. If nothing is in flight, pick up the next step in prototypes/wilderness/CONTINUANCE.md then wilderness-run.md (v6 performance, then v7 the living). If blocked, write a 'Needs you' entry in prototypes/wilderness/MORNING.md once and continue with anything that is not blocked. Pace rules from HANDOFF.md are binding: at most four implementation agents, one headless browser each, renders and suites in sequence, wip renders at 1280x720, nice -n 10 and SHOT_ANGLE=metal on every node tools/ call. Stop the loop when v7, the living, has shipped or Austin says stop."
4. Make the `v6-square-lights` worktree, fill `PORT` (8173) in `briefs/v6/brief-v6-00-square-lights.md`, then dispatch batch 1: v6-00 and v6-01 together.
