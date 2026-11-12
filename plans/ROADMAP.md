# Roadmap

Where every open issue from the owner stands, and the order the milestones are planned in. The orchestrator keeps this file and the issues' labels in step on every wake (`autonomous-run` skill, "Triage"). The owner's word reorders it: an issue, a comment, or a line here.

Labels: a kind (`milestone`, `bug`, `tweak`, `harness`), a target (`v8`, `v9`, …, or `hotfix`), and a state (`in-progress`, `planned`). An issue is closed by the release that ships it, with the release linked.

## Now

| Issue | Kind | Where |
|---|---|---|
| #1 Consistency, Coherence, and Conscious Contrast | milestone | **v8**, in progress: `plans/wilderness-v8.md` |
| #7 Let me jump on more stuff | tweak | v8, brief 10 (`briefs/v8/brief-v8-10-owner-tweaks.md`) |
| #8 Gaps at top of crystals | bug | v8, brief 10 |
| #11 Lamplighter walks thru a giant rock | bug | v8, brief 11 (`briefs/v8/brief-v8-11-rocks.md`) |
| #12 Too many of those goofy dalmation colored rocks | tweak | v8, brief 11 |
| #3 Improve release notes | harness | done on `next` and on GitHub (all entries rewritten, 19 GitHub releases published, `tools/gh-release.sh`, `.agents/skills/orchestrator/release-notes.md`); closes when v8's entry ships in the same style |

## Next, in order

| Milestone | Issues | Why here |
|---|---|---|
| **v9, the music** | #2 | The owner: "let's treat music as a v9 after the CCC v8". Designed and briefed: `plans/wilderness-v9.md`, `briefs/v9/`. |
| **v10, better mountains** | #5, #6 | The owner: the mountains are "what users see most" and have been the jankiest thing in every release. #6 (the two square things on the wall; move the city of windows) is part of the same look at the walls. Before #4 because #4 builds on them. |
| **v11, the heights and depths** | #4 | Verticality: the Span walkable end to end, ways up the ring mountains, tunnels, the stranger machines. Wants v10's mountains to climb. |
| **v12, a payoff at the centre** | #9 | Something that happens when a visitor reaches a zone's central thing. After v11 so the new heights and depths get their payoffs in the same pass. |

The order after v9 is the orchestrator's call (2026-11-11) and is the owner's to change.

## Shipped

| Issue | Release |
|---|---|
| #10 The bird takeoff noises are kinda insane | v7.2.1 (2026-11-11), with the keep's rooks |
