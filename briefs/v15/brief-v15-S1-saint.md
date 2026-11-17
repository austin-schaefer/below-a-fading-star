# Brief v15-S1: the saint's face

Worktree `.claude/worktrees/issue-1521-saint`, branch `issue-1521-saint`, port 8166. Work only there. Read `briefs/v15/_common.md` first; load `visual-art` (its figures reference too). Helpers that read images run on `haiku` or `sonnet`.

## What it is

In the Quarrels, the yard under the keep, the masons burn lime in the head of a fallen Heliarch colossus (`stories/the-saint-in-the-kiln.md`; `src/v15/quarters/quarrels/saint.js`, placed by `quarrels.js` from the plan's `kiln`). The idea is the best new thing in the village. The head is not: after two rounds by its author it is a coursed dome with a nose from the square (`v15-Q1-fin-square-west.png`: "a beehive") and at 3 m a mask with hexagonal bolts for eyes (`v15-Q1-fin-face-3m.png`: "a bolted mask", a robot). Earlier readers: "a featureless blob", "a Batman cowl", "pumpkin lantern", "a pot". Those frames are in the deploy worktree's `shots/wip/` (read only).

## Goal

One thing: a carved stone face, colossal (the head about 4 m), fallen and lying where it fell, that a stranger at 30 m and at 3 m calls a statue's head at once, old and once magnificent, and then sees it is burning inside. Nothing else in the yard changes.

- **Sculpt it, do not assemble it.** A face made of boxes reads as a robot. Build one continuous surface: start from a subdivided ellipsoid or lathe and displace it with a face you define as smooth fields (brow ridge, eye hollows with lids, the nose's bridge and wings, philtrum, lips closed, chin, cheekbones, ears, a neck's stump), then facet it lightly to the walk's low-poly look. Hair or a fillet as carved bands with one roundel and its empty socket (the Heliarchy's ornament: `visual-art/architecture.md`). No spikes, bolts, plates or courses across the face; coursing only where the neck broke, showing it was built of drums.
- **Fallen and old:** on its side or three-quarters, part sunk; the nose's tip gone, a crack through one cheek, lichen and soot; the keep's stone (`COLORS.heliarch`), lit by the kiln's own light.
- **Burning:** fire at the stoke hole cut in at the neck's break, smoke and glow from the crown broken open (`air.js` has the smoke), at most a dull red far inside one eye seen only from close. No glowing eyes or mouth.
- **One before the rest:** first a turntable sheet of the head alone on bare ground (eight directions at 6 m, and 3 m front and three-quarter), in normal light and in a gutter, read by a helper told nothing ("what is this object?"). Only when it says a statue's head, place it. Keep the collider, the stair's head clear (`court` D > -7.4), the stoke bench and the story true; update the story's words if the pose changes.
- Budget: the Quarrels is 28k triangles on low of 45k; the head may take 6k on low, more on high.

## Done when

- The sheet and the placed frames: from the square's west, the causeway's end, the stair's head, 3 m front, behind; low at a phone's size; a gutter. A cold helper names it a fallen statue's head used as a kiln from the placed frames alone.
- `ONLY=village,geometry,walk,edges,heights,strata tools/suite.sh 8166` green; `node tools/quarrels-walk.mjs` as its header says, keys and touch.
- Report `briefs/v15/reports/issue-1521-saint.md`; hand back in under 200 words with the frames in order.
