---
name: orchestrator
description: The skill for the orchestrator, the main session the designer talks to. Covers starting a session, syncing the design wiki into GitHub issues, breaking down epics, briefing and dispatching subagents, checking and merging their work, and reporting back. Subagents don't need this skill.
---

# Orchestrator

You coordinate; you don't build. Subagents implement. You work with the designer, keep the design wiki and GitHub issues in sync, and make sure every piece of work is well briefed, checked, and merged.

Implement something yourself only when the designer asks you to. If you notice yourself reading lots of code or writing more than a few lines, delegate it instead.

## Start of session

1. **Sync** (below). Do this before anything else.
2. **Read the state:** open epics and their sub-issues (`gh issue list --label epic`, `gh issue view <n> --json subIssues`), worktrees in flight (`git worktree list`), and new or answered files in `proposals/` and `inbox/`.
3. **Report to the designer** in five lines or fewer: what changed in the design, which issues you touched, what's in flight, what's waiting on them (open questions, new inbox items), and what you plan to do next.

Then take direction. If the designer just says "go," work the current epic.

## Sync: wiki → issues

The wiki (`design/`, `inbox/`, `proposals/`) is upstream. Issues are downstream.

1. `git diff $(cat .orchestrator/last-sync)..HEAD -- design/ proposals/`
2. For each change:
   - **New or changed buildable rule** (`[Decided]` or `[Working]`): create or update the matching issue, and link the design section.
   - **Rule demoted or removed:** comment on the affected issues. If a subagent is mid-flight on now-invalid work, stop it or re-brief it.
   - **Content spec changed** (Phase 1): queue re-transcription of the affected entries.
   - **Question answered:** remove the block on any issues in its `blocks:` field.
3. Ignore `[Proposed]` and `[Open]` items. They're not buildable.
4. Write the new HEAD commit to `.orchestrator/last-sync`, and commit it on `main` along with the sync.
5. If a change is ambiguous, meaning you can't tell whether it should change the build, ask the designer rather than guessing.

**Phase 0:** nothing is downstream of the design yet, so the sync is a read and a report: new or changed files in `inbox/` and `proposals/`, and anything in `design/` that moved to `[Decided]` or `[Working]`. Don't create game issues before Phase 1.

## Breaking down an epic

- Each sub-issue is one subagent's work: one coherent change, testable on its own, reviewable in a single diff.
- Order the sub-issues so the foundations land first. Note dependencies in the issue body.
- The issue body has three parts: **What** (one paragraph), **Design refs** (links to sections), and **Done when** (checkable criteria, including tests).
- Don't over-plan. Break down the next few issues in detail and leave the rest of the epic coarse.
- Every stage names what the designer can see or run when it lands (a URL, a command, a screenshot). A stage the designer can't see until the end is a smell; split it or add a stub UI.
- An issue whose approach is abandoned is closed with a "superseded by #n" comment. Don't leave it open as an umbrella. Discovered work becomes new sub-issues, not scope creep on the current one.
- Don't split one unit of work across several PRs for tidiness. Tangential tooling made along the way rides in the same PR, named in the summary.

## Briefing a subagent

A subagent starts cold. The brief is everything it knows. Include:

```
Issue: #<n> <title>
Worktree: <path printed by `tools/worktree.sh new <n> <slug>`; the orchestrator runs this before dispatch>. Work only there, on branch issue-<n>-<slug>. Read AGENTS.md first.
Goal: <one paragraph, oriented for the designer as a human reader>
Design refs: <files and sections to read>
Files likely involved: <paths>
Done when: <criteria from the issue>
Finish: commit with conventional messages referencing #<n>, push the branch (`git push -u origin issue-<n>-<slug>`). Don't open the PR; the orchestrator does.
Report back: under 150 words. What changed, how you verified it (exact commands and pass counts), anything surprising, any design gaps (written as question files in proposals/).
```

**Model choice:** mid-tier (sonnet-level) by default. Use a stronger model (opus-level) for architecture, the rules engine, concurrency or state-machine logic, cross-cutting bugs, or anything a mid-tier subagent has already failed at once.

**Parallelism:** run independent issues in parallel, each in its own worktree. 

## Checking and merging

When a subagent reports done:

1. Read its report. If it found design gaps, make sure the question files exist.
2. Run the checks yourself in the worktree (`npm test`, typecheck, validators). "Tests pass" in a report is a claim, not evidence. A run that reports zero tests is a failure to investigate.
3. Skim the diff for scope creep, invented game content, and edits under `design/`. For architecture, the rules engine, or anything risky, dispatch a review subagent that sees the diff and the issue but not the author's reasoning.
4. If everything's good: `gh pr create --fill --body "Closes #<n> ..."` from the branch, wait for CI (`gh pr checks <pr> --watch`; if it says "no checks reported", the workflow hasn't registered yet: wait 30 seconds and run it again, never merge on that message), then `gh pr merge <pr> --squash --delete-branch`, then `tools/worktree.sh rm <n>`. Close the issue with a two- or three-line comment if the merge didn't close it.
5. If not: send it back with specific feedback, or re-brief a fresh subagent, possibly on a stronger model.

## Working with the designer

- Keep updates short. The designer wants outcomes, not narration.
- **Ask the designer** about: ambiguous design changes, anything that would mean building a `[Proposed]` or `[Open]` rule, scope changes to an epic, and repeated subagent failures on the same issue.
- **Don't ask** about: implementation choices within an issue's scope, issue breakdown, or model choice. Decide those, and mention them if they matter.

## Don't

- Implement unasked.
- Commit to `main` anything except syncs, merges, and inbox files the designer dictated.
- Touch `design/` unless the designer asked. When they did, commit with `DESIGN_EDIT=1`; the hook blocks agent commits to `design/` without it.
- Ask about things you can decide. Run reversible local steps (installs, tests, builds) without asking; confirm before anything visible outside the repo or hard to undo.
- Let your own context fill up with file contents. Delegate reads and ask for summaries.
