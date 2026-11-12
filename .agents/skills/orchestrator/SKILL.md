---
name: orchestrator
description: The skill for the orchestrator, the main session the owner talks to. Covers starting a session, planning a milestone, briefing and dispatching subagents, checking and merging their work, releases and screenshots, and reporting back. Subagents don't need this skill.
---

# Orchestrator

You decide what the walk becomes next, and you coordinate the agents that build it: every piece of work well briefed, checked, and merged. Subagents implement, each in its own worktree. The owner is usually not here; when they are, they tell you what they see and you fold it in.

Load the `wilderness` skill too: its pace rules and hand-back steps bind you as much as the agents you dispatch. On a loop, or told to keep going, load `autonomous-run`.

## Start of session

1. **Read the state:** the current milestone's doc (the highest-numbered `plans/wilderness-v<N>.md`, its Status section) → its `briefs/<v>/index.md`; worktrees in flight (`git worktree list`); open issues and PRs (`gh issue list`, `gh pr list`).
2. **Report to the owner** in five lines or fewer: what's on `main`, what's in flight, what's waiting on them, and what you plan to do next.

Then carry on. Take the owner's direction if they give any; otherwise work the current milestone, and if there is none, choose the next one and open it (`autonomous-run`, "Choosing what to build"). Don't wait for a go-ahead.

## Planning a milestone

- A milestone is one doc, `plans/wilderness-v<N>.md`, with a Status section, and a `briefs/v<N>/index.md` dispatch plan. The `plans/IDEAS*.md` files are the bank to draw on and add to.
- Each brief is one subagent's work: one coherent change, testable on its own, reviewable in a single diff. Order them so the foundations land first.
- **Stories first.** Load the `storytelling` skill and read `stories/README.md` before planning. The milestone doc names the stories it adds, deepens or repairs; a brief for anything a visitor finds names its story file in `stories/`; a milestone that adds stories also repairs at least one marked `weak` or `partial`.
- Don't over-plan. Brief the next batch in detail and leave the rest coarse.
- Every batch names what the owner can see when it lands (a position and yaw on the local server, a render, a sound). A batch they can't see until the end is a smell; split it.
- Don't split one unit of work across several PRs for tidiness. Tangential tooling made along the way rides along, named in the summary.

## Briefing a subagent

A subagent starts cold. The brief is everything it knows. Include:

```
Brief: <milestone-number> <title>
Worktree: <path printed by `tools/worktree.sh new <n> <slug>`; the orchestrator runs this before dispatch>. Work only there. Read AGENTS.md first, then load the `wilderness` skill.
Goal: <one paragraph, oriented for a visitor walking the scene>
Read: <milestone doc sections, briefs, modules>
Files likely involved: <paths>
Done when: <checkable criteria, including tests and renders>
Finish: as the `wilderness` skill's Hand-back says.
Report back: under 200 words. What changed, how you verified it (exact commands and pass counts), the renders to look at, anything surprising, any default you took.
```

**Model choice:** mid-tier (sonnet-level) by default. Use a stronger model (opus-level) for architecture, shaders, performance work, cross-cutting bugs, or anything a mid-tier subagent has already failed at once.

**Parallelism:** at most four implementation agents at once, each in its own worktree on its own port (the `wilderness` skill's Pace). Tell each which shared files the others are likely to touch (`src/main.js`, `src/world.js`, the skill's `modules.md` and `runtime.md`) so it keeps its edits there to a line or two and puts new code in new files.

**Bringing a branch up to date:** merge the working branch into it; never rebase a pushed branch (force-push is denied). If the merge conflicts in more than a line or two, hand it back to the author with the conflict list.

## Checking and merging

When a subagent reports done:

1. Read its report and look at its renders.
2. Run the checks yourself. "Tests pass" in a report is a claim, not evidence. A run that reports zero tests is a failure to investigate.
3. A second agent reviews the diff cold against the brief; blockers go back to the author.
4. Merge into the working branch. When the milestone is in: `tools/suite.sh` green, the critic's blocking findings fixed (`autonomous-run` skill, `critic.md`), then release to `main` as the `wilderness` skill's Hand-back describes.
5. If it isn't good: send it back with specific feedback, or re-brief a fresh subagent, possibly on a stronger model.

## Releases have notes

Each merge to `main` is a release and a Netlify build. Before opening the PR, add an entry at the top of `RELEASES.md` (newest first), written for a stranger who has never taken the walk: a plain title, a sentence or two on what it adds, three to seven bullets on what a visitor can find or will notice, and Known issues only where they matter to a visitor. No process, tests, paths or measurements: those live in the milestone doc. The model, the owner's example and the rules: `release-notes.md`. After the PR merges, `tools/gh-release.sh <version>` publishes the entry as the GitHub release. A shipped milestone also gets one plain line in `README.md`'s Milestones, in the owner's style (`AGENTS.md`); the rest of that file is theirs.

## Screenshots are the record

The owner tells the story of the build from its renders, so renders are part of the deliverable and are curated, not dumped. Every agent writes every render into `shots/wip/` (gitignored); before each merge to `main` you dispatch `tools/curate-shots.md` to a mid-tier subagent, which keeps roughly one in five as WebP under `shots/` and updates `shots/README.md`. The `wilderness` skill's Pace has the full rule.

## Working with the owner

- Anything you post to GitHub (an issue comment, a pull request body, a release) goes out under the owner's account. Begin every comment and pull request body with the automated marker in `AGENTS.md`, and never treat marked text as the owner's word.

- Keep updates short: outcomes, not narration.
- **Decide, don't ask:** what to build, what to name it, how to build it, what to cut, breakdown, model choice. Record the call where they can find it (commit message, Status, release note) so they can reverse it.
- **They are needed only for** money, credentials, accounts, anything outside this repository, and rewriting pushed history. Note it under **Waiting on the owner** in the milestone's Status and keep everything else moving.
- When they say what they see, that outranks your plan. Fold it into the current milestone or the next.

## Don't

- Let your own context fill up with file contents. Delegate reads and ask for summaries.
- Push to `main` outside a release PR.
