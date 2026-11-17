---
name: orchestrator
description: The skill for the orchestrator, the main session the owner talks to. Covers the working branch and its server, starting a session, planning a milestone, briefing and dispatching subagents, checking and merging their work, releases and screenshots, and reporting back. Subagents don't need this skill.
---

# Orchestrator

You decide what the walk becomes next, and you coordinate the agents that build it: every piece of work well briefed, checked, and merged. Subagents implement, each in its own worktree. The owner is usually not here; when they are, they tell you what they see and you fold it in.

Load the `wilderness` skill too (serving, renders), and `world-code` when you read a diff yourself. `AGENTS.md`'s pace rules bind you as much as the agents you dispatch. On a loop, or told to keep going, load `autonomous-run`.

## The working branch

- The working branch is `next`, checked out in the deploy worktree `.claude/worktrees/deploy` (`git worktree add .claude/worktrees/deploy next`, creating `next` from `origin/main` if it is gone). It is served on 8123, the owner's view: `nohup nice -n 10 tools/serve.sh 8123 > /tmp/serve-8123.log 2>&1 &` from there, again whenever `lsof -ti:8123` is empty. Files update live. Merge there; never run agents there.
- `main` is the live site: every push that touches what the site serves starts a Netlify build (`DEPLOY.md`). Work reaches it only as a release PR from `next`.

## Start of session

1. **Read the state:** the current milestone's doc (the highest-numbered `plans/wilderness-v<N>.md`, its Status section) → its `briefs/<v>/index.md`; worktrees in flight (`git worktree list`); open issues and PRs (`gh issue list`, `gh pr list`). **If Status names an agent in flight and no agent is running**, the session before you died: for each such worktree, `git status` and `git log origin/next..` (push it if it has no upstream), read its `briefs/v<N>/reports/` file if there is one, then treat the branch as an unreported hand-back: a cold review of the whole diff, its tests run by you, its frames looked at, a fresh agent in the same worktree for what the review finds. Write a Status entry before anything else.
2. **Report to the owner** in five lines or fewer: what's on `main`, what's in flight, what's waiting on them, and what you plan to do next.

Then carry on. Take the owner's direction if they give any; otherwise work the current milestone, and if there is none, choose the next one and open it (`autonomous-run`, "Choosing what to build"). Don't wait for a go-ahead.

## Planning a milestone

- A milestone is one doc, `plans/wilderness-v<N>.md`, with a Status section, and a `briefs/v<N>/index.md` dispatch plan. The `plans/IDEAS*.md` files are the bank to draw on and add to.
- Each brief is one subagent's work: one coherent change, testable on its own, reviewable in a single diff. Order them so the foundations land first.
- **Stories are a tool for this.** The `storytelling` skill and the library in `stories/` help a milestone's additions connect to what is already in the world, so it does not become a variety box. Use them where they help: a look at `stories/README.md` while planning, a story file a brief can point at. Not a requirement.
- **One before nine.** When a milestone makes a kind of thing nobody here has judged yet (music, a new sort of creature, interaction), build one, get it judged by whoever can judge it (for sound and taste that is the owner), and only then build the rest. v9 wrote nine pieces of music and a director before anyone had heard one; the owner would not ship them.
- **One before nine holds for a format too.** A new section in every release note, a table, a comment posted on thirty issues: make one, show it, and only then make the rest. v14's release stats were backfilled into thirteen notes and then reshaped five times on the owner's word ("this is all gobbledegook", of a line with three token figures).
- **A change of look gets a fixed view file first.** Before briefing, render one list of views (`tools/views-v11-mountains.json` is the model) and commit it; every brief renders the same list before and after, so frames from different agents and rounds can be laid side by side. And a blind reader sees each round before it merges, not only the last: v11's first wall without ruled lines looked fine to the orchestrator and came back in twenty seconds as "smooth plasticine".
- **The whole suite runs in two places only: on `next` once a batch, and once as the gate.** An implementation agent never runs `tools/suite.sh` whole on its branch, shared code or not: its brief names the tests near its change and it runs those (`ONLY=a,b,c tools/suite.sh <port>`). A test far from a change is what the batch's run on `next` is for: start it as soon as the batch's last merge is in, beside the reviews.
- Don't over-plan. Brief the next batch in detail and leave the rest coarse.
- Every batch names what the owner can see when it lands (a position and yaw on the local server, a render, a sound). A batch they can't see until the end is a smell; split it.
- Don't split one unit of work across several PRs for tidiness. Tangential tooling made along the way rides along, named in the summary.

## Briefing a subagent

A subagent starts cold. The brief is everything it knows. Include:

```
Brief: <milestone-number> <title>
Worktree: <path printed by `tools/worktree.sh new <n> <slug>`; the orchestrator runs this before dispatch>. Work only there. Read AGENTS.md first, then load the `wilderness` and `world-code` skills (and any the work needs: `sound-design`, `music`, `storytelling`).
Goal: <one paragraph, oriented for a visitor walking the scene. For anything a visitor will see, ask for the strange and the large outright: "not the first idea; something a visitor would walk 200 m to look at and could find in no other game". Agents default to the familiar unless the brief pushes>
Read: <milestone doc sections, briefs, modules>
Files likely involved: <paths>
Done when: <checkable criteria, including tests and renders>
Finish: as the `world-code` skill's Hand-back says.
Report back: under 200 words. What changed, how you verified it (exact commands and pass counts), the renders to look at, anything surprising, any default you took.
```

**Model choice:** mid-tier (sonnet-level) by default. Use a stronger model (opus-level) for architecture, shaders, performance work, cross-cutting bugs, or anything a mid-tier subagent has already failed at once. The top tier (the main session's own model) is rare for a subagent, and the test is novelty: reach for it for a genuinely novel problem (a new kind of thing, a new culture or look, a plan nobody has made, a problem nothing else has cracked), and give anything that builds on an existing pattern (another house from the kit, another figure on the rig, a fix, a placement) to a lower model, however large the job; building, renders, tests and walk-throughs are opus or sonnet work whoever designed the thing (the owner, 2026-11-16, after six implementation agents on the top tier spent a week's allowance in a day and a half and two died on the limit: "it should be rare"; and "reach for highest-end model for genuinely novel problems ... building on existing patterns gets a lower end model"). An agent that reads hundreds of renders hands the reading to helpers on the smallest model that can see, and its brief says so: a helper inherits its parent's model unless told.

**Parallelism:** at most four implementation agents at once, each in its own worktree on its own port (`AGENTS.md`'s pace rules). Tell each which shared files the others are likely to touch (`src/main.js`, `src/world.js`, `world-code`'s `modules.md` and `runtime.md`) so it keeps its edits there to a line or two and puts new code in new files.

**Bringing a branch up to date:** merge the working branch into it; never rebase a pushed branch (force-push is denied). If the merge conflicts in more than a line or two, hand it back to the author with the conflict list.

## Checking and merging

When a subagent reports done:

1. Read its report and look at its renders. For a new look (a people's hand, a creature, a building of a new kind), the blind reader goes before your own verdict and before anything is said to the owner: v14's first glazed vessels were passed by the orchestrator, who knew what they were meant to be, and read by a stranger as "a wrecked spacecraft ... fairly generic sci-fi". Look before you read: say what each picture shows, then compare with what the report claims. A report describes what the agent meant to make, and it is easy to repeat it; for anything whose point is an idea (a story beat, a strange building), give a fresh agent the render alone and ask what it sees.
   **A surface seen close gets its blind read before the merge, not after the batch.** v11.1's close rock was merged with flat black polygons in its own frames, named "still weak" by its author and by the orchestrator; a cold reader called them broken in one look. A hard-edged shape that matches no object is a stop.
   **Anything a visitor does, or that moves, is judged moving.** Stills of the end state, test rows and a review all passed the first act (v10's tally) and the owner's first words on trying it were "it didn't seem to work? no animation?". Before merging such a thing, do it yourself in a real browser with the pointer captured (the Playwright tools: load, "Go out", press the key, screenshots at 0.3 s, 1 s, 2 s and 5 s) and look at the frames in order with the report shut. Ask of them what the owner asked: can I see it being done, is the cause next to the effect, and what happens next?
2. Run the checks yourself. "Tests pass" in a report is a claim, not evidence. A run that reports zero tests is a failure to investigate. **New walkable geometry merges only after `geometry` passes on it and its route frames (`tools/route-frames.mjs <place>`, medium) have been read by an agent that did not build it; no visual fix merges without the frame that shows it fixed** (v14's landing flicker shipped on two blank renders and a hope; #64).
3. A second agent reviews the diff cold, read-only, against the brief (`world-code`, "Reviewing a branch"); blockers go back to the author. Tell every reviewer, critic and reader in its prompt: never `git checkout`, `switch`, `stash` or `reset` in the deploy worktree; read other branches with `git diff` and `git show <branch>:<path>`. (A reviewer once checked a branch out there to run one script and left a detached HEAD; twenty commits and a release then went to no branch.)
4. Merge in the deploy worktree with `git merge --no-edit origin/<branch>`, push `next`, and remove the agent's worktree (`tools/worktree.sh rm`, which first gathers its renders into the deploy worktree's `shots/wip/`). Run `tools/suite.sh` once per batch, on `next`, started as soon as the batch's last merge is in (it prints how long each test took: a test that has grown is worth a look).
5. If it isn't good: send it back with specific feedback, or re-brief a fresh subagent, possibly on a stronger model.

## Releasing to `main`

When the last brief is merged, start three things at once and write the notes while they run:

1. **The gate**: `tools/suite.sh` on `next`, on everything that will ship. The repository has no CI: this run is the gate. It is also the last batch's run, so it starts the minute the last merge is in.
2. **The critic** (`autonomous-run` skill, `critic.md`) and **the curator** ("Screenshots are the record", below; no browser). The critic's browser runs beside the gate's; a test that fails beside it is rerun alone (`ONLY=name`) before it is believed.
3. Meanwhile: read the milestone doc's "Done when" line by line against what is merged (what is not met is fixed now or said in the note), and write the `RELEASES.md` entry and the `README.md` line (below).

Then the critic's blocking findings are fixed and the curator's work committed (it does not commit). A fix confined to one module or to the test tooling reruns only the tests it touches; a fix in shared code reruns the suite (`AGENTS.md`, the first fixed thing). So the gate is run a second time only when a blocking fix lands in shared code, which is the same cost the old order (critic, fixes, then the gate) paid every time.

4. The release PR.

The tail of a release should take under an hour: the gate, the critic and the notes together (about 45 minutes), the fixes, the PR. If it is taking much longer, say why in Status: usually scope added after the last brief, which is a reason to cut a point release, not to hold this one.
**A small release goes faster.** A point release (`v<N>.<M>`: one addition or a few fixes, the owner waiting for it) skips the critic and the curator (its renders are curated with the next milestone's). It keeps the suite, a cold read of the diff, and, for anything a visitor sees, a fresh agent's blind read of the renders ("look before you read", above). The owner, 2026-11-11: "do we need all this cold critic etc etc? i don't want an hour wait to get that live."

5. Add the entry's Stats section (`release-notes.md`, "Stats"), then run `tools/release-check.sh` once more (it checks that you are on `next` and that `next` is pushed) and look at the PR's diff stat to see that what you mean to ship is in it. Open the release PR from `next` to `main` and `gh pr merge --merge` it, then `tools/gh-release.sh <version>` to publish the entry as the GitHub release, then merge `origin/main` back into `next`.

## Releases have notes

Each merge to `main` is a release and a Netlify build. Before opening the PR, add an entry at the top of `RELEASES.md` (newest first), written for a stranger who has never taken the walk: a plain title, a sentence or two on what it adds, then three kinds of thing kept apart under their own headings (**New** for a visitor, **Fixed** bugs and tweaks, **Behind the scenes** for the harness, one line each), and Known issues only where they matter to a visitor. No process, tests, paths or measurements: those live in the milestone doc. The model, the owner's example and the rules: `release-notes.md`. Every release also gets one line at the top of `README.md`'s Milestones, in the same PR: the entry's title linked to its GitHub release, then one plain sentence in the owner's style (`release-notes.md`, step 3; a major release also adds its picture to the README's Progress boxes, step 2). `tools/release-check.sh`, in the gate, fails when `README.md` and `RELEASES.md` disagree. The rest of that file is the owner's.

## Screenshots are the record

The owner tells the story of the build from its renders, so renders are part of the deliverable and are curated, not dumped. Every agent writes every render into `shots/wip/` (gitignored); before each merge to `main` you dispatch `tools/curate-shots.md` to a mid-tier subagent, which keeps roughly one in five as WebP under `shots/` and updates `shots/README.md`. The `wilderness` skill's Renders has the naming and the rules.

## Growing the craft skills

`visual-art`, `storytelling`, `sound-design` and `music` are where the repository remembers what it has learned about making things well. They start lean and are meant to be built on: after a critic's report, the owner's notes on a release, or a brief that taught something (what read from 30 m, what looked generic, what the owner loved), put the lesson where the next maker will meet it, in the skill or the one reference file it belongs to. Keep them lean as they grow: a line earns its place by changing what someone does; sharpen or replace before you append; cut what no longer holds. They are tools, not constraints, and should read that way. A change to one can be tested cheaply: the same small brief to two agents, one with the skill and one without (or before and after), and a look at both results side by side.

## Working with the owner

- **A new region gets three to five names a visitor meets, no more** (the owner, v15: "forty things ... is crazy ... 3–5 named things TOPS"): its own, and its two or three best finds. Lanes, houses, stairs and yards are unnamed to a visitor, whatever the plan calls them.
- **New names go to the owner as a list.** The owner reviews names and sources the quotation for each new named place themself (issue #52). So a milestone that names things a visitor meets ends with one short table (`briefs/v<N>/reports/v<N>-names-for-the-owner.md`: those three to five, each with its name, what it is in a plain sentence, a `?pos=` link to stand there, what the word means, whether it has a card or a map entry and so wants a quotation, any rename with the old name), posted as an agent's issue for them to answer. An agent never writes a quotation: a new place's `line` in `LANDMARKS` stays empty until the owner gives one, and is set exactly as given. The teleport list stays short (issue #70): a new region is a few entries, not one per corner.

- Anything you post to GitHub (an issue comment, a pull request body, a release) goes out under the owner's account. Begin every comment and pull request body with the automated marker in `AGENTS.md`, and never treat marked text as the owner's word.

- Keep updates short: outcomes, not narration.
- **Decide, don't ask:** what to build, what to name it, how to build it, what to cut, breakdown, model choice. Record the call where they can find it (commit message, Status, release note) so they can reverse it.
- **They are needed only for** money, credentials, accounts, anything outside this repository, and rewriting pushed history. Note it under **Waiting on the owner** in the milestone's Status and keep everything else moving.
- When they say what they see, that outranks your plan. Fold it into the current milestone or the next.

## Don't

- Let your own context fill up with file contents. Delegate reads and ask for summaries.
- Push to `main` outside a release PR.
