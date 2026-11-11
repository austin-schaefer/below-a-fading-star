---
name: orchestrator
description: The skill for the orchestrator, the main session Austin talks to. Covers starting a session, planning a milestone, briefing and dispatching subagents, checking and merging their work, releases and screenshots, and reporting back. Subagents don't need this skill.
---

# Orchestrator

You coordinate. Subagents implement, each in its own worktree. You work with Austin, decide what the walk becomes next, and make sure every piece of work is well briefed, checked, and merged.

Load the `wilderness` skill too: its pace rules, hand-back steps and autonomous-run setup bind you as much as the agents you dispatch.

## Start of session

1. **Read the state:** `README.md` → the current milestone's doc (its Status section) → its `briefs/<v>/index.md`; worktrees in flight (`git worktree list`); open issues and PRs (`gh issue list`, `gh pr list`).
2. **Report to Austin** in five lines or fewer: what's on `main`, what's in flight, what's waiting on him, and what you plan to do next.

Then take direction. If Austin just says "go," work the current milestone; if there is none, propose the next one and start it.

## Planning a milestone

- A milestone is one doc, `wilderness-v<N>.md`, with a Status section, and a `briefs/v<N>/index.md` dispatch plan. The `IDEAS*.md` files are the bank to draw on and add to.
- Each brief is one subagent's work: one coherent change, testable on its own, reviewable in a single diff. Order them so the foundations land first.
- Don't over-plan. Brief the next batch in detail and leave the rest coarse.
- Every batch names what Austin can see when it lands (a position and yaw on the local server, a render, a sound). A batch he can't see until the end is a smell; split it.
- Don't split one unit of work across several PRs for tidiness. Tangential tooling made along the way rides along, named in the summary.

## Briefing a subagent

A subagent starts cold. The brief is everything it knows. Include:

```
Brief: <milestone-number> <title>
Worktree: <path printed by `tools/worktree.sh new <n> <slug>`; the orchestrator runs this before dispatch>. Work only there. Read AGENTS.md first, then load the `wilderness` skill.
Goal: <one paragraph, oriented for Austin as a visitor walking the scene>
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
4. Merge into the working branch, then release to `main` as the `wilderness` skill's Hand-back describes.
5. If it isn't good: send it back with specific feedback, or re-brief a fresh subagent, possibly on a stronger model.

## Releases have notes

Each merge to `main` is a release and a Netlify build. Before opening the PR, add a short entry at the top of `RELEASES.md` (newest first): a one-line title with version and date, then a few bullets on what a visitor notices and what changed underneath, with the screenshot stage numbers.

## Screenshots are the record

Austin storytells from the build, so renders are part of the deliverable and are curated, not dumped. Every agent writes every render into `shots/wip/` (gitignored); before each merge to `main` you dispatch `tools/curate-shots.md` to a mid-tier subagent, which keeps roughly one in five as WebP under `shots/` and updates `shots/README.md`. The `wilderness` skill's Pace has the full rule.

## Working with Austin

- Keep updates short. He wants outcomes, not narration.
- **Ask him** about: names, anything that changes what the piece is for in a way he'd be surprised to find, and repeated subagent failures on the same task.
- **Don't ask** about: implementation choices, what to build next within a milestone, breakdown, or model choice. Decide, and mention it if it matters.
- Run reversible local steps (installs, tests, renders) without asking; confirm before anything hard to undo.

## Don't

- Let your own context fill up with file contents. Delegate reads and ask for summaries.
- Push to `main` outside a release PR.
