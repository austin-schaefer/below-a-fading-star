# v15-P1 people and stories: report (issue-1523-people)

2026-11-16 10:40 PST, opus.

## What changed

`src/v15/people/` (`index.js`, `body.js`, `folk.js`), one `MODULES` line (`people`, `?people=0`). Eight villagers in one `SkinnedMesh` (65 bones as world matrices; the v8 house folk's bodies by bone), each placed from a place its quarter handed out or a plan record. **On low: 1 draw, 9,242 triangles, 0 lights**, on `ctx.lappet.farHidden`. Each turns its head to a walker within 6 m and does one thing.

| Figure | Where | Doing | Story |
|---|---|---|---|
| the burner | Quarrels, saint's stoke hole | rakes his fire, wipes her brow; her red cap on the smallest waiting head | the-saint-in-the-kiln.md |
| the copyist | Quarrels, Unroofed House's east end | taps at a pale copy of a dark Heliarch moulding, sits back, compares, shakes his head; two spoiled copies by him | the-copyist.md (new) |
| the noon-drawer | Lees, fountain's kerb | bends to dip a jug of noon, looks into it; two lit jugs and a yoke | noon-by-the-jug.md (new) |
| the child on the Leads | Rungs, rungs-low-2's roof edge | basket on a cord over the low lane, an empty jug in it; tugs when you are under | noon-by-the-jug.md |
| the dead-letter clerk | Lees, behind the Lagan's pigeonholes | sorts; holds a red-sealed letter out to you within 4.5 m, takes it back, shakes his head | the-dead-letters.md (new) |
| the dyer | Rungs, saffron vat at the Tenter's foot | stirs, saffron to the elbows | the-wait-on-the-span.md (extended) |
| the sounder | Pennyworth, the Spilt Measure's hull | ear to the hull, taps with a brass hammer; within 5 m a finger to his lips | the-spilt-measure.md (new) |
| the one leaving | Pennyworth, past the Leave | her house's door on her back, looking back over her shoulder, shrugging it up | the-door-on-her-back.md (new) |

`stories/README.md`, modules.md and runtime.md updated.

## Tests

`ONLY=village,ways,geometry,walk,edges,heights,strata,livery,perf tools/suite.sh 8166` after merging origin/next: strata 8, village 687, ways 129, livery 16, walk 13, edges 214, heights 198, perf 29, **geometry failed** (1 new: a back on `structures-keep-blocks[36]` at (76.2, 18.3, 8.6) seen from a stand at (69.1, 0.5) that the burner's 0.3 m collider pushed there). The burner's collider is now 0.2 m; then `ONLY=geometry,ways`: geometry 144, ways 129, 0 failed (a fix confined to this module, so only those two were rerun). That keep block's back is a real fault the test reached only by chance. It is not fixed. Skinned meshes are not read by `geometry-test`.

## Frames (in order; first-seen, 3 m, gutter medium, phone low 390x844)

- /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1523-people/shots/wip/p1/p1-fin-burner-{first,3m,gutter,phone}.png
- /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1523-people/shots/wip/p1/p1-fin-copyist-{first,3m,gutter,phone}.png
- /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1523-people/shots/wip/p1/p1-fin-noon-{first,3m,gutter,phone}.png
- /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1523-people/shots/wip/p1/p1-fin-child-{first,3m,gutter,phone}.png
- /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1523-people/shots/wip/p1/p1-fin-clerk-{first,3m,gutter,phone}.png
- /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1523-people/shots/wip/p1/p1-fin-dyer-{first,3m,gutter,phone}.png
- /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1523-people/shots/wip/p1/p1-fin-sounder-{first,3m,gutter,phone}.png
- /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1523-people/shots/wip/p1/p1-fin2-leaver-{first,3m,gutter,phone}.png
- A walk up to the clerk on the keys: /Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1523-people/shots/wip/p1/p1-walk2-clerk-00..10 (the offer at stop-0s..1s, the doubt at 2..3 s). The pointer was not captured in headless (metal), so the look was turned through the page.

## The cold helper (sonnet), per figure

- burner: "a hooded figure in a long dark-blue robe ... holding a long pole with a burning flame at its tip ... by a forge" (fire-pole read as a torch)
- copyist: "a bearded man in a tall dark brimless hat ... sits behind two crates of eggs or stones" (3 m); far: "tiny dark figure ... working at the blocks"
- noon-drawer: "a collector or alchemist filling or collecting liquid" beside "a giant glowing white tear-shaped vat"
- child: "a person ... sits on a high ledge, legs dangling over the edge ... relaxing or keeping lookout" (basket not mentioned)
- clerk: "a post-office clerk or letter-keeper ... holding a white letter"; first/gutter: "barely visible inside"
- dyer: "a cloth dyer at his dye pits ... stirring one with a long pole"
- sounder: "working at the wall with a small tool ... repairing or tapping stone"
- leaver: "a blue-grey tall board or banner shape on his back ... walking away down a path"; first: "cannot tell what they are doing"

## Weak

The leaver's door reads as "a board", not a door. From where she is first seen she is small. The burner's rake reads as a torch. The copyist's moulding reads as "crates of eggs". The child's basket was not seen. The clerk is hard to see from the street because the pigeonholes are in front of him, and his letter never clears them. Only the clerk was walked up to on the keys. The others were judged from stills and logged state. The empty doorway the leaver came from is not built.
