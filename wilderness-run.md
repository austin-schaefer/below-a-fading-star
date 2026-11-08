# The running order: v3 → v4 → v5, unattended

Austin, 2026-11-08, going to bed: "when v3 is finished, compact, then pick up v4; v4 runs for however many hours, then compact, then v5; set it up so it just continues autonomously." This file is the orchestrator's standing instructions for that run. It survives context compaction and session restarts. The run moved from the cloud to Austin's Mac at about 06:00 UTC (see `HANDOFF.md`: setup, GPU rendering, the pace rules that protect the Mac, and what replaces the cloud's scheduled task and phone notifications). Delete both files when the run is over.

## Sequence

Austin (2026-11-08, last thing): "check the sequence of v4 and v5 and see if it makes sense to arrange them differently; v4 has a lot of terrain stuff and parts of v5 might really go with that; v4, v5, v6, whatever you judge best." Judged: the two briefs are cut by when they were written, not by what they touch. Both rewrite the ground (v4's paths, causeway route, pit, taller fall, mountain rework; v5's eight bioregions, tarn shore, glacier) and both would repaint the map and redo the placement renders. So the work is re-cut into layers, ground first, and ships as three releases after v3. The briefs themselves (`wilderness-v4.md`, `wilderness-v5.md`) are unchanged and remain the specs; this file says which parts land when.

1. **v3** (`wilderness-v3.md`): finish stage 2 (in flight in worktree `v3-stage2`) and the flicker fix (worktree `v3-flicker`); merge both; stage 3 (medium tier + adaptive step, vegetation LOD and overdraw, material distance bands, target hygiene, allocation audit: one or two Opus agents); release as **v3** with curated shots and notes. Stage 4's hardware numbers wait for Austin's bench run; v3 ships without them and the table is filled in the morning.

2. **v4, the land and the Span.** One master placement plan first (`wilderness-v4-placement.md`, with a map render), fixing the sites of everything in v4, v5 and v6 at once, the regions spread so every sector of the bowl has one, so paths can be laid to reserved sites and nothing is placed twice. Then, in order:
   - the **systems agent** (Opus): mountain rework (BI: layered ranges, fog tiers, named silhouettes, the wider sun saddle), the light rig and exposure (v4 Light (b)), the cyclopean kit, and a **regions kit** (`src/v4/regions.js`: each region a shape with a soft boundary, hooks for ground colour, cover, stone, a marked heightfield block, air colour and sound; `regionAt(x, z)` for everything else). Nothing else starts until it lands.
   - **region agents** in parallel (Opus, two or three regions each, one more for the glacier rebuild and the tarn's new shore): the eight bioregions from `wilderness-v5.md`, each with its ground, stone, flora, air, sound and its one creature, in its own module under `src/v4/regions/`.
   - the **Great Span agent** (Opus) alongside them: W with its gates and stairs, in a marked block of the wall.
   - after the regions: the **map-structure agent** (Opus): paths and rivulets between places that take each region's material, the causeway's new route from the colossi's feet to the fractal pit, the Tumbling Water two to three times taller; then the **Tinctures** and the longer gutter (small, Sonnet), and the terrain-side set-dressing (the Long Figure, the Discontinued Track, the Surveyor's Pegs).
   - curate, notes, release as **v4**.

3. **v5, the built.** The remaining v4 wonders (AK, AL, AM, AO, AP, AQ, AR, AW, BA, BD) one agent each in batches of three or four, the awe audit's recasts (Carcanet Keep, the Armiger's Tower, the Sunken Court, the Arcature, the Lattice's mother crystal, the Gradine) in the layered register, the local lights (v4 Light (a), the Leerie's row of standards, the Kept Fire DN), the story set-dressing (the Collation CY, the Slipper DE, the Unfinished Prospect DF if doable) and the coherence agent. Release as **v5**.

4. **v7, nothing pops.** Performance and visible artefacts, straight after v5 ships (Austin, 14:50 on 2026-11-08: "i want to share with folks but currently performance is too poor to share"): the survey and the six stages in `wilderness-v7.md` (pop-test harness; LOD cross-fades; streaming; shadow, light-slot, pixel-ratio and AA stability; uploads and compiles at load; Austin's hardware table). Its open questions (AA, fade versus pushed-out switches, the shadow box) are decided by the agents at their defaults and logged; Austin changes them later if he wants. Release as **v7**.

5. **v6, the living.** The nine humanoids, the six little characters, the Link-Boy, the Luminous Reach, the glyph motif, then the audio pass over everything new. Three or four figures per agent. After v7. Release as **v6**.

Between stages: curate `shots/wip/` (the curation brief), write the `RELEASES.md` entry, PR, CI green, merge, publish the artifact if the session has the tool, reset the branch to main, and log the release line in `MORNING.md` (a phone notification too where the session can send one). If Austin wakes mid-stage, what has landed ships as that version's stage A.

## Standing decisions (Austin's calls, made in advance for the night)

- The orchestrator decides what Austin would normally be shown first: placement plans, the awe audit's before/after trades, stage 2's look trades, the v5 picks. Each such decision is logged in `MORNING.md` (newest first) with the renders to look at, so he can reverse any of them in the morning. Reversals are cheap; waiting is not.
- Merge to `main` at each stage end after CI, as the v2 and v2.1 releases did. Netlify deploys main; the live site changes while he sleeps, which is intended.
- Nothing touches `design/`. No GitHub issues are created for this prototype; the `wilderness-v*.md` files are the briefs.
- Budgets and the tone notes in each brief are binding. When a brief and a render disagree, the render is re-done, not the brief.
- Stop and notify (a **Needs you** entry in `MORNING.md`; the phone too where possible, once) rather than push on when: an agent fails the same task twice; CI is red for a reason outside the diff; anything would delete or rewrite history; the live site is broken after a merge (roll forward with a fix, never force-push).

## Pace

On the Mac the binding rules are in `HANDOFF.md` (two agents at most, one browser each, half-size wip renders, `nice`). On the cloud container (four CPUs, software WebGL) a render took minutes and a suite ten to fifty, so hand-backs ran one to two hours; the same rules applied: at most two implementation agents at once; wip renders at half size (`--scale 0.5` or 1280×720), full size only for the renders that go into `shots/`; an agent runs the test for the module it touched and the orchestrator runs the full suite once per merge, not per agent; the orchestrator does not run its own renders or suites while two agents are rendering.

## Protocol per hand-back

Read the report; run the checks yourself (walk 6/6, audio 39/39, perf, loading 7/7, grass-flicker 3/3, artifact build); look at the renders; copy the best into `shots/`; commit. Same-tree agents never commit; worktree agents commit on their branch and the orchestrator merges.

## Check-in behaviour (the hourly check-in: `/loop 1h` on the Mac, a scheduled task on the cloud)

Every hour: if agents are running and nothing is blocked, do nothing. If nothing is in flight, pick up the next step above. If blocked, notify once and continue with anything that is not blocked. Disable the check-in when v5 has shipped or when Austin says stop.
