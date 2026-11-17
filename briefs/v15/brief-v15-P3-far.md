# Brief v15-P3: the village from far off, and what it costs

Worktree `.claude/worktrees/issue-1522-far`, branch `issue-1522-far`, port 8167. Work only there. Read `briefs/v15/_common.md` first. Helpers that read images run on `haiku` or `sonnet`.

## The problem

1. **On the low tier (phones) the village's houses and quarters are not drawn beyond 150 m** (`ctx.lappet.farHidden`, `src/v15/bones.js:326-337`): the high views over the valley (`heights-test`, "cost: top stair on low" and "top gallery") were at their limits before the village (364 calls, 2.73M triangles). So from the Hanging Croft, the lift's galleries, the Span and the east road a phone shows bare giant steps.
2. **On every tier the village is weak from far off.** From the east road at 100 m "a few pale specks", the fountain of noon "a thin line"; from the heather track 141 m east "no village edge at all" (`lees-25-far-road-100.png`, `pennyworth-r2-far-p11.png` in the deploy worktree's `shots/wip/`, read only). The owner asked for a village that is "cohesive and widespread": it should be seen as one from the places a visitor first sees it: the spawn's side of the keep, the causeway, the east road, the Pomegranate House's gate, and from above.

## Goal

- **A far mesh:** one draw call, a few thousand triangles, built at load from what the quarters built (their records and the plan's plots: `ctx.village`, `ctx.lees`, `ctx.pennyworth`, the Rungs' and Quarrels' records): each house as a box or two in its own wall colour with its roof, the fountain's sherd, the wreck, the tube's dressing, and **lit windows and lamps as emissive specks** in their real places. On low it replaces the near meshes beyond 150 m (cross-fade or a dither, no pop a walker notices on the causeway or the east road); on medium and high the near meshes stay and the specks may add to them if they help.
- **Read from far:** the village's own light is what carries (it stands in the keep's shadow): windows at different heights up the steps, the fountain's glow against the wall behind it, the kiln's smoke lit from below, one or two lamps at the edges. Tune so that from each of the five places it reads as a lit hill town under the keep, on low and on high, without lifting the whole scene's exposure. `tools/views-v15-village.json` has the far views; render it before and after.
- **Cost:** `ONLY=heights,perf,loading tools/suite.sh 8167` green on low with the far mesh drawn from the heights; say the village's whole cost near (draws, triangles, lights at the square, the Rungs' middle, the Pennyworth) and far, per tier, against the budgets in `world-code`; `load-probe` low within 5% of `next`.
- Guard it: a row in `village-test` that the far mesh has a box for every built plot and a speck for every lamp record.

## Done when

Before/after frames of the five far views on low and high (and one walking in along the causeway across the 150 m line, frames every 10 m); the cost table; tests `ONLY=village-plan,village,geometry,heights,perf,loading,regions tools/suite.sh 8167`; `runtime.md` says in a few lines how a new building gets into the far mesh. Report `briefs/v15/reports/issue-1522-far.md`; hand back in under 200 words.
