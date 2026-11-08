# Curation brief: screenshots

Hand this to a mid-tier subagent before every merge to `main`. Fill in the two bracketed parts.

---

You are curating the screenshot archive at `prototypes/wilderness/shots/` (git root `/home/user/fading-planet`, branch `[branch]`). Austin storytells from these renders (how the scene was built, stage by stage, with agents), so the keepers must tell the story and there must not be hundreds of them. Read `shots/README.md` (the naming scheme, the stage table and the captioned index of what is already kept) and the `wilderness` skill (`.agents/skills/wilderness/SKILL.md`: renders are curated, not dumped).

1. **Leave alone** any file still being produced by a running agent: prefixes `[list the prefixes of agents currently running]`, anything newer than when you start, `shots/README.md`, `shots/wip/README.md`, and `shots/plan-*.png`.
2. **Look at every other image in `shots/wip/`** with the Read tool (it shows you the picture). Classify: keeper (a distinct subject or a story beat, the best of its near-duplicates), duplicate, or junk (black, blank, broken, debug maps). Keep roughly one in five. Always keep: the first render of a new module even if ugly; every before/after pair that shows a decision; each new landmark and creature at its best view; up to five of the funniest failures.
3. **Move keepers into `shots/`** under the scheme `NN-subject-view[-before|after].png`: `NN` is the stage number from the stage table (add a row if this hand-back is a new stage), then the subject word so that files about the same thing sort together, then the view. Lowercase, hyphens, keep the original extension.
4. **Use git for every move and delete** (`git mv`, `git rm`) so history keeps the originals. Do not commit; the orchestrator commits. Touch nothing outside `shots/`.
5. **Update `shots/README.md`**: the stage table and a one-line caption for every kept image, in sorted order.
6. Hand back counts (kept, moved, deleted), the stage table rows you added, and any image you could not interpret.
