Brief: v18 F3, the Lower Beds (the crypt and the way under)
Worktree: `.claude/worktrees/issue-1803-beds`, branch `issue-1803-beds`, port 8183. Model: opus. Work only there. `briefs/v18/_common.md` first; `stories/the-graffer.md` beats 3 and 4 are what you build.

Goal. The owner: spur trails "that lead into tunnels and crypts". At `BEDS` in `src/v18/plan.js`.

**The door** at (-249, 172), in the south-west rise (slope 0.74; stay outside the Span's west block x -270..-195, z 180..245): a vault door in a bank under the roots of a great tree, the stone of a rich house's burying place, its bronze leaf standing open a body's width, wet leaves drifted in. It reads from the spur's end 15 m off by its own pale stone and a little foxfire (F1 brings the spur and the foxfire to your doorstep; put your own two clumps on the door).

**The vault** (about (-258, 164), under the rise): a low barrel-vaulted room, six tombs in two rows, each lid a full effigy of the plan's `LIKENESSES` in order: the lady with her fan, the armiger with his sword, the child with a hoop, the magnate with his cup, the two lovers on one lid hand in hand, the falconer with his bird. Worn stone, the props unmistakable. **Every lid is cracked across and a root as thick as an arm comes down through the roof into it.** The roots are pale and alive; a little light comes down along them from above (the glasshouse's colours, faint), which is how the room is lit at all, with the door's grey behind you. Nothing is labelled and nothing is tallied.

**The way under**, north about 45 m from the vault to `BEDS.under` beneath the glasshouse: a gardener's passage, not a mason's: narrow, shored with old glasshouse iron and planks, the six roots running along its roof like pipes toward the tombs, so that a visitor walking north is following them back to where they come from. It bends so neither end is seen from the other. Dark; the roots' faint glow and foxfire lead.

**The chamber under the glasshouse** (-265, 126): a round room. Overhead the undersides of seven stone tubs set in the floor above, root masses bursting from six of them, and a grate (F2 will say where its 1.2 m opening is in its first push: fetch `origin/issue-1802-glasshouse` read-only and read its report; until then assume 2 m east of centre) through which coloured light falls in bars and moves a little. In the middle a seventh tomb, open and empty, its lid leaning beside it half carved with a stooped figure, the chisel marks fresh; a watering can stands on the rim (the Garth's make: `src/v17/garth/`). From the seventh tub overhead, one thin root has only just reached the open tomb. A visitor cannot get up into the glasshouse: the grate is shut and out of reach.

Build with the under kit (`src/v14/under.js`: `installBelow`, `pathBelow`/`boxBelow`, the seal, `UnderBuilder`, `underMaterial`, a walkable and `ascents.add`), the terrain opened as the Nave's and the Swallow's are; models: `src/v17/` (the Swallow's tube and the Garth) and `src/v14/` (the Wellward Way). The seal keeps the rooms cheap: draw calls in the vault and the chamber on low no more than the Laid Sun's. What is seen up through the grate is yours to stand in under the seal (the tubs' undersides, the light): when F2's `buildLikeness` is on its branch you may show the stems' feet with it if cheap; otherwise dark shapes are right.

Name the place "The Lower Beds" in `LANDMARKS` with an empty `line` (its card where the vault opens out).

Done when: the plan's Done when 4; `tools/beds-walk.mjs` (model: `tools/swallow-walk.mjs`) walks door to chamber and back on the keys at medium and low and fails on a console error; `ONLY=edges,geometry,heights,walk,seams,gutter,dressing,strata,threads,perf` green with rows for the new rooms (`under-geometry` inside `edges`); route frames (`tools/route-frames.mjs`) read by a helper that did not build it; frames in order down the passage; each effigy lit well enough to name; a blind reader shown the six lids names at least four props; the phone frame.

What the owner can see: `http://localhost:8171/?pos=-240,172&yaw=1.57`, then walk in.

Finish and report as `_common.md` says.
