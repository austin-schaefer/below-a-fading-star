# Wilderness v10: something to do

The walk has asked nothing of a visitor: you walk, look and hop. v10 adds the first acts. Come close to a few particular things and you are quietly offered one small thing to do there; do it, and the world keeps the mark for the next time you come.

## What was chosen, and why

Chosen 2026-11-11 by the orchestrator, with no issue labelled `next`. The milestone is the owner's issue **#24** (the lightweight interactivity milestone: "come close to tallies, you are offered a chance to press a button and add a tally"), joined with **#9** ("Reward me for finding the central thing": an act at a place's centre is a payoff that cannot be seen until you are there) and the tweak **#15** (walk to the very edge of chasms and pits and look down).

Why this one now:

- v8 made what exists hold together and v9 was plumbing shipped switched off. After two milestones of depth, this is reach: the thing a visitor would tell a friend ("you can chalk your mark on the wall with everyone who slept there, and it is still there when you go back").
- The v9 critic met no story beat on a short walk. An act is a reason to stop at a story and a way for two of the library's stories to get the turn they lack.
- The owner's warmest words of the last session were for the tally.

Passed over for now, all still in the pool: #5 better mountains and #6 the two square things (the strongest claim for the next depth milestone: they are in every frame), #4 the Heights and Depths, #18 the forest, #20 the village, #28 the familiar made strange (an agent's), #23 music v2 (needs the owner's ears on sketches first). #22 (Umami) waits on the owner.

The look before planning was the v9 critic's walk of the same day (49 renders, the audio tools; its leftovers are in `plans/IDEAS.md`), the story library and the pool; the orchestrator took no new renders before choosing.

## Calls made (the issue's "what to settle"), each reversible

- **How the offer appears.** Within a few metres, and facing the thing, a small mark and two or three words rise at the bottom of the view in the title card's lettering ("Chalk your stroke"), with a soft sound. `E` or a click does it on a desktop; on a phone the offer itself is the button. It fades when you turn or walk away. No offer ever shows from far off: the world, not the interface, leads you there.
- **Marks are yours.** Kept on the device (`localStorage`). No service, no account, nothing shared: a shared wall needs a server, which is money and the owner's call.
- **Rare.** Five to seven acts on the whole map at release, each at a place that already means something. Not a button on everything.
- **One before nine.** The framework and one act (the tally, at the Lantern Halt, whose slab already carries chalk strokes) are built and judged first; the rest are briefed after that from what it taught.
- **The two test waystations** (`issue-931-waystation-a`, the Drum, with the tally; `issue-932-waystation-b`, the Bell-House, whose concept and silhouette the owner preferred) stay unmerged: three waystations on one causeway is two too many. The tally moves to the Halt. The great bell may be rehomed away from the causeway as a thing to ring, in the second batch.

## Status

**2026-11-11, 22:55 PST. Opened; batch 1 dispatched.** `next` is `main` at v9.1 plus the look-back commit. In flight, each in its own worktree under `.claude/worktrees/`, pushing a branch and no PR:

| Brief | Model | Branch / worktree | Port |
|---|---|---|---|
| A0 the acts framework, the tally at the Lantern Halt, `tools/acts-test.mjs` (`briefs/v10/brief-v10-A0-acts.md`) | opus | `issue-1000-acts` | 8161 |
| T1 walk to the edge of pits and chasms, #15 (`briefs/v10/brief-v10-T1-edges.md`) | sonnet | `issue-1001-edges` | 8162 |

Next: when A0 reports, look at its renders before its report, give them to a fresh agent with no description and ask what it sees and what it thinks it can do there, cold review, merge. Then write batch 2 from `briefs/v10/index.md`'s coarse list (payoffs at central things; story acts; the bell), up to three agents side by side. Then the critic and curator, the notes, one gate, the release.

Leftover from v9, not in flight: worktrees `issue-931-waystation-a` and `issue-932-waystation-b` (kept as references for this milestone; remove them at v10's release).

**Waiting on the owner:** #22 (Umami tracking) needs them to create the Umami site and paste its snippet; agents may not create accounts.

## What a visitor should notice

At the foot of the Lantern Halt, among the chalk strokes of everyone who slept there, you are offered the chalk. Your stroke is a little whiter than the rest, and it is there when you come back tomorrow. At a handful of other places (the heart of the Lattice, the door at the bottom of the stair, the table laid for twelve) reaching the thing itself gives you one small act and something that only happens because you did it. And you can walk to the very lip of a pit and look down.

## Done when

- Five to seven acts on the map, each offered only up close, each leaving a mark that survives a reload, each with a sound.
- Every act works on a phone (the offer is the button) and with a keyboard and mouse.
- At least two of #9's central things pay off with something that cannot be seen or heard until the act is done.
- A visitor can clear their marks from the settings menu.
- `tools/acts-test.mjs` is in the gate: every act is offered at its place, not offered from far off, done, and found again after a reload.
- #15: a walker reaches the lip of the pits and chasms named in its brief and can look down, with no way to fall through the world.
- `tools/suite.sh` green; the phone's frame cost no worse than v9.1's.
