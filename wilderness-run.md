# The running order: v3 → v4 → v5, unattended

Austin, 2026-11-08, going to bed: "when v3 is finished, compact, then pick up v4; v4 runs for however many hours, then compact, then v5; set it up so it just continues autonomously." This file is the orchestrator's standing instructions for that run. It survives context compaction and session restarts; the scheduled check-in (every two hours, firing into the orchestrator's session) points here. Delete it when the run is over.

## Sequence

1. **v3** (`wilderness-v3.md`): finish stage 2 (in flight in worktree `v3-stage2`) and the flicker fix (worktree `v3-flicker`); merge both; stage 3 (medium tier + adaptive step, vegetation LOD and overdraw, material distance bands, target hygiene, allocation audit: one or two Opus agents); release as **v3** with curated shots and notes. Stage 4's hardware numbers wait for Austin's bench run; v3 ships without them and the table is filled in the morning.
2. **v4** (`wilderness-v4.md`, all sections including Light, Map structure, Height and architecture): placement plan first (orchestrator, written to `wilderness-v4-placement.md` with a map render, as v2 did); then the systems agent (kit, mountains, light rig, exposure, causeway spine, fog tiers); then the wonders in batches of three or four (Great Span its own agent); then the coherence agent and the audio pass; release as **v4**. If v4 is still running when Austin wakes, release what has landed as **v4 stage A** and continue.
3. **v5** (`wilderness-v5.md`, "The picks": Austin picked on 2026-11-08, with notes): placement plan first (`wilderness-v5-placement.md` with a map render, spreading the regions across the bowl), then three releases in order, **v5.0** the land (bioregions, tarn shore, glacier, Tinctures, longer gutter, region set-dressing), **v5.1** the people (humanoids, Link-Boy, Kept Fire), **v5.2** the small life and the light. Staff by bioregion for 5.0 (two or three regions per Opus agent, plus one for the glacier and the tarn shore), by figure for 5.1 (three or four per agent), by creature for 5.2.

Between stages: curate `shots/wip/` (the curation brief), write the `RELEASES.md` entry, PR, CI green, merge, publish the artifact, reset the branch to main, send a phone notification with the release line.

## Standing decisions (Austin's calls, made in advance for the night)

- The orchestrator decides what Austin would normally be shown first: placement plans, the awe audit's before/after trades, stage 2's look trades, the v5 picks. Each such decision is logged in `MORNING.md` (newest first) with the renders to look at, so he can reverse any of them in the morning. Reversals are cheap; waiting is not.
- Merge to `main` at each stage end after CI, as the v2 and v2.1 releases did. Netlify deploys main; the live site changes while he sleeps, which is intended.
- Nothing touches `design/`. No GitHub issues are created for this prototype; the `wilderness-v*.md` files are the briefs.
- Budgets and the tone notes in each brief are binding. When a brief and a render disagree, the render is re-done, not the brief.
- Stop and notify (phone, once) rather than push on when: an agent fails the same task twice; CI is red for a reason outside the diff; anything would delete or rewrite history; the live site is broken after a merge (roll forward with a fix, never force-push).

## Protocol per hand-back

Read the report; run the checks yourself (walk 6/6, audio 39/39, perf, loading 7/7, grass-flicker 3/3, artifact build); look at the renders; copy the best into `shots/`; commit. Same-tree agents never commit; worktree agents commit on their branch and the orchestrator merges.

## Check-in behaviour (the scheduled task)

Every two hours: if agents are running and nothing is blocked, do nothing. If nothing is in flight, pick up the next step above. If blocked, notify once and continue with anything that is not blocked. Disable the check-in when v5 has shipped or when Austin says stop.
