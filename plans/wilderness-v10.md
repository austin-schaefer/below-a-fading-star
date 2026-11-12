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

**2026-11-11, 23:44 PST. A0 merged: the first act is on `next`. Batch 2 dispatched.** A0's fix round came back with all eleven items done (its counts after its last merge: acts 39, touch 43, settings 66, walk 10, hop 25, strata 8, loading 7, perf 17, audio 76, 0 failed). The orchestrator looked at `shots/wip/acts-halt2-*.png` before the report: the visitor's strokes are saffron, the colour of the chalk stub, underlined with dust, in their own gates after the last row (findable at once); no offer behind the paused card. From the road the wall is still modest: a 0.5 m sign and a pale band; accepted. Merged without the orchestrator's own rerun of the finished branch (its run during the fix round was green on a mixed tree); instead `ONLY=acts,touch,settings,walk,hop,audio,strata,loading,perf,edges tools/suite.sh 8123` is running on `next` now, its log in the session scratchpad: if this session is gone, run it again before anything else. Try the act: `http://localhost:8123/?pos=-60.0,2.3&yaw=1.19&pitch=-0.1`. The contract every later act uses is in `world-code`, "Acts" (`ctx.acts.add`, with `when`, busy, `data`, `rise`).

In flight (three implementation agents, each told the other two exist and to keep shared-file edits to small blocks):

| Brief | Model | Branch / worktree | Port |
|---|---|---|---|
| A1 the mother crystal and the Hypogeum's door (`brief-v10-A1-central.md`) | opus | `issue-1002-central` | 8163 |
| A2 the full glass at the Collation, salt for news (`brief-v10-A2-stories.md`) | sonnet | `issue-1003-stories` | 8164 |
| A3 a great bell to ring (`brief-v10-A3-bell.md`) | opus | `issue-1004-bell` | 8165 |

Next: as each reports, pictures before the report, a blind read by a fresh agent, a cold review, the orchestrator's tests, merge (expect small conflicts in `tools/acts-test.mjs`, `tools/audio-test.mjs`, `src/v10/sound.js`, `modules.md`, `runtime.md`). When all three are in: the critic and the curator together, the `RELEASES.md` entry and `README.md` line, one full gate, the release; remove the two v9 waystation worktrees then.

**2026-11-11, 23:18 PST. A0 reported, was judged, and is back with its agent for one round of fixes.** A0 pushed `issue-1000-acts` (its counts on 8161: acts 24, touch 43, settings 66, walk 10, hop 25, strata 8, loading 7, perf 17, audio 76, 0 failed; not rerun after its last merge of `next`). A fresh agent read its renders blind: the lantern draws you over, the tallies read as travellers' counts, the offer is clear and not ugly, the phone button is unobstructed; but nothing says "writing" from the road, and the visitor's own stroke is "one white line among hundreds" on a return. A cold review (opus) found one blocker: the paused card does not stop an act (Esc, then E, chalks behind the card); and the offer shows behind the open settings panel. Sent back to the same agent, same worktree and port, as one list: that blocker; the offer button's focus and modifier keys; a clamp on stored counts; the contract widened before three agents build on it (`when()`, a busy state while an answer plays, a `data` object beside the count, a vertical reach); the visitor's marks made findable on a return; one thing on the wall that reads from 25 m; no full-canvas upload per frame while a stroke is drawn, half the canvas on low; the Halt's rng draws shifted by moving the tally out of `waystation.js`. The orchestrator's own run of A0's tests on the branch was started before the fixes went back and is superseded: rerun `ONLY=acts,touch,settings,walk,audio,strata tools/suite.sh 8161` in the worktree when it reports, look at `shots/wip/acts-halt2-*.png`, then merge and dispatch batch 2 (worktrees `tools/worktree.sh new 1002 central`, `1003 stories`, `1004 bell`; briefs in `briefs/v10/`).

**2026-11-11, 23:11 PST. A0 is running its last tests; batch 2 is briefed and waits for it.** A0's code, test, sounds and contract are committed in its worktree (`issue-1000-acts`, port 8161; not pushed yet). The orchestrator looked at its final renders before any report: the tally wall reads from the road, the offer ("Chalk your stroke", `E`) is small and at the bottom, the new stroke is whiter than the rest, and on a phone the offer is a button clear of the stick and the hop ring. Still owed on A0 when it hands back: a fresh agent's blind read of the renders, a cold review, the orchestrator's own run of its tests, the merge. Batch 2's briefs are written against A0's contract (`ctx.acts.add`, in `world-code`'s "Acts"): `briefs/v10/_common.md` and A1 (the mother crystal and the Hypogeum's door; opus; `issue-1002-central`, 8163), A2 (the full glass at the Collation and salt for news; sonnet; `issue-1003-stories`, 8164), A3 (a great bell to ring, rehomed from the Bell-House branch; opus; `issue-1004-bell`, 8165). None is dispatched and no worktree is made: do both when A0 is merged. The slipper's mate keeps its missing turn; it was cut from A2 to keep that brief to two acts.

**2026-11-11, 23:01 PST. T1 is finished and merged; only A0 is out.** The Pit has three lookouts (`PIT_LOOKOUTS`, bearings 312, 200 and 90, in `src/v4/paths/ground.js`) where the lip's clods sit small and behind the walker; the orchestrator looked at the renders (`shots/wip/edges-pit-lookout-*.png`: the stepped walls, the mist and the rubble floor far below fill the frame) and read the 16-line diff; the agent's rerun printed edges 101, walk 10, hop 25, paths 75, rocks 32, 0 failed (not rerun by the orchestrator; the batch's suite covers it). The Nave is left dark on purpose. Its worktree is removed. Try: `?pos=195.0,198.0&yaw=-0.35&pitch=-1.2`. In flight: A0 (opus, `issue-1000-acts`, 8161).

**2026-11-11, 22:57 PST. T1 merged; its Pit sent back; A0 still out.** T1 (#15, `issue-1001-edges`) is merged into `next` after the orchestrator looked at its renders, reran `ONLY=edges,walk,hop,paths,stair tools/suite.sh 8162` on the branch (75, 10, 25, 92, 5 PASS lines; 0 failed) and a cold review found no blockers. What it did: the collider rings at the Foundered Nave and the Pit stand 0.3 m from the rim where they stood 1.1 to 2 m; the Great Span's broken deck edges have a 0.14 m kerb (a walk stops at the lip where it fell 56 m; a hop still goes over); pale glints on the Sunken Court's water; `tools/edges-test.mjs` in the gate. The ha-ha, the canyon, the glacier and the Hypogeum's stair are slopes that never stopped anyone. `main` (PR #29, a line of `AGENTS.md`) is merged into `next` too. Not good enough yet: at the Pit the rim's boulders fill the view and the throat is mist behind them, so the same agent is back in the same worktree (port 8162) making two or three clear lookouts on the rim and giving the throat some depth; it pushes to the same branch, to be merged again. In flight beside it: A0 (opus, `issue-1000-acts`, 8161), uncommitted work in `src/v10/`, `tools/acts-test.mjs` and the Halt. The full suite has not run on `next` since the merge (T1 touched no shared file); it runs once with the batch.

**2026-11-11, 22:38 PST. Opened; batch 1 dispatched.** `next` is `main` at v9.1 plus the look-back commit. In flight, each in its own worktree under `.claude/worktrees/`, pushing a branch and no PR:

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
