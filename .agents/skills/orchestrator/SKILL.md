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
4. Write the new HEAD commit to `.orchestrator/last-sync` and commit it in a throwaway worktree branched from `origin/main` (`tools/worktree.sh new sync <date>`), then push it straight to main (`git push origin HEAD:main`) and remove the worktree. Never commit in the main checkout: an unpushed commit there blocks Austin's promote.
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

**Parallelism:** run independent issues in parallel, each in its own worktree. Tell each subagent which shared files the others are likely to touch (route registration, `App.tsx`, `main.tsx`, `README.md`) so it keeps its edits there to a line or two and puts new code in new files. Give each a distinct dev-server port pair (`WIKI_CLIENT_PORT`/`WIKI_API_PORT`) so they don't collide with each other or with the designer's running wiki on 7300.

**Bringing a branch up to date:** merge `origin/main` into the branch; never rebase a pushed branch (force-push is denied). If the merge conflicts in more than a line or two, hand it back to the author with the conflict list rather than resolving it yourself.

**The main checkout is Austin's live wiki.** His login service runs the built wiki from `/Users/user/dev/fading-planet`, and his unsaved edits and chat turns live in it. Never pull, check out, build or restart there; worktrees branch from `origin/main` (`tools/worktree.sh new` fetches first), so you never need the main checkout to be current. Promotion is Austin's: he runs `tools/wiki-service.sh promote` or pulls main himself.

## Checking and merging

When a subagent reports done:

1. Read its report. If it found design gaps, make sure the question files exist.
2. Run the checks yourself in the worktree (`npm test`, typecheck, validators). "Tests pass" in a report is a claim, not evidence. A run that reports zero tests is a failure to investigate.
3. Skim the diff for scope creep, invented game content, and edits under `design/`. For architecture, the rules engine, or anything risky, dispatch a review subagent that sees the diff and the issue but not the author's reasoning.
4. If everything's good: `gh pr create --fill --body "Closes #<n> ..."` from the branch, wait for CI (`gh pr checks <pr> --watch`; if it says "no checks reported", the workflow hasn't registered yet: wait 30 seconds and run it again, never merge on that message), then `gh pr merge <pr> --squash --delete-branch`, then `tools/worktree.sh rm <n>`. Close the issue with a two- or three-line comment if the merge didn't close it.
5. If not: send it back with specific feedback, or re-brief a fresh subagent, possibly on a stronger model.

## Visual prototypes: releases have notes

Each merge of a visual prototype to `main` is a release. Before opening the PR, add a short entry at the top of the prototype's `RELEASES.md` (newest first): a one-line title with version and date, then a few bullets on what a visitor notices and what changed underneath, with the screenshot stage numbers. Not verbose; the archive carries the pictures.

## Visual prototypes: screenshots are the record

For anything visual under `prototypes/` (the wilderness scene is the first), Austin storytells from the build, so renders are part of the deliverable and are curated, not dumped. The full rule lives in the `wilderness` skill (Pace, and `tools/curate-shots.md`).md` ("Screenshots are part of the record") and the reusable curation brief in `prototypes/wilderness/tools/curate-shots.md`. The short form:

- Every subagent writes every render it takes into `shots/wip/` (gitignored, never committed) named `<module>-<stage>-<view>.png`, never only its scratchpad. Nothing is deleted by the agent that made it. `tools/worktree.sh rm` moves a removed worktree's wip files into the deploy worktree's `shots/wip/` (`.claude/worktrees/wilderness-deploy`), where the curator works; it refuses if that worktree is missing.
- Renders enter the repository only as curated WebP keepers under `shots/`, committed by the curator; a pre-commit hook rejects staged PNGs there and images over 1 MB.
- Before every merge to `main`, the orchestrator dispatches the curation brief to a mid-tier subagent: it looks at every image, keeps roughly one in five (each subject's best view, every before/after that shows a decision, the first render of each module, a few good failures), moves keepers into the flat `shots/` folder under the `NN-subject-view[-before|after]` scheme, deletes the rest with `git rm` so history keeps them, and updates `shots/README.md`, the captioned index. Files agents are still producing are left alone.

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
