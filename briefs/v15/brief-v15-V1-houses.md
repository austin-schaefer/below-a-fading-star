# Brief v15-V1: the houses (the kit, and one finished row)

Worktree `.claude/worktrees/issue-1501-houses`, branch `issue-1501-houses`, port 8162. Work only there. Read `briefs/v15/_common.md` first and do what it says; then `plans/wilderness-v15.md` whole and `briefs/v15/index.md`.

## Goal

Nobody has built a street here: one inn, one keep, a byre. You build the makers every quarter of the village will call, and prove them with **one finished row of five buildings** that is judged (by a reader who sees only the pictures, and by the owner) before the other thirty are built. "One before nine": if the row reads as toy town, as medieval, or as boxes, the village will, thirty times over.

The row is the village's argument in small: **five buildings, five ages, shoulder to shoulder**, and it should be the strangest street front a visitor has seen:

1. **A Late house**: crooked lime plaster, an outside stair to a flat roof that is a yard (walkable: a pot, a bed frame, washing), a horseshoe door, one small saturated accent. Worn.
2. **A shop in a Heliarch undercroft**: a round ashlar arch let into a wall of exact coursed stone, the arch now a shopfront with a Late counter, shutter and awning built into it, the old bronze still in the jambs.
3. **A house in a Noonwright carrier**: a stalled vessel taller than a house lying on its side or standing on its tail, glazed (celadon or ox-blood, the milk body showing where the glaze broke), a door cut in its belly, a chimney through its shoulder, a window that is its own lens, lit from inside so the wall glows.
4. **A house under an Elder block**: a cyclopean block (or two leaning) with a dwelling scraped under and between them, the door a slot, a plaster front the size of a cupboard against stone the size of a barn.
5. **The new house, half built**: fresh-cut pale ashlar quarried from the keep (each block still carrying a Heliarch moulding on one face, turned any way up), raw timber scaffold, a ladder, a lime pit, the mason's line and plumb. The only new thing in the valley.

Bend any of these if you find a better one; keep the five ages and the shock of them side by side.

## What to build

- **`src/v15/houses/`**: one maker a kind, each `(B, M, o)` into a structures `Builder` like the strata parts (`src/v8/strata/parts.js`, `ctx.strata`), so a quarter's thirty buildings are still one or two draw calls. Each takes a seed and a plot (centre, facing, footprint, level: the shape `src/v15/plan.js` will give; until V0 pushes it, define the plot type yourself and adopt theirs when it lands) and returns what the quarter needs: colliders, walkable floors (roofs, outside stairs, with parapets where the drop is over the edge guard), lamp brackets, lit-window emitters (`aEmit` channel 1), door and counter positions for people and props. Variation by seed must be real (height, lean, door, roofline, accents, patches): ten Late houses from ten seeds in one render must not read as one house ten times ("machine repetition", `visual-art/architecture.md`).
- **Shopfronts** as an option on the makers: a counter, a shutter, an awning, a hanging sign in the Late hand (`lateSign`), a shelf for contents (the contents come in a later brief).
- **Interiors:** two of the five can be entered (the carrier is one): a room with a floor, a hearth or a lamp, something that says who lives there. The rest are closed fronts with depth (a real reveal at the door, shutters, a lit window with a shape behind it), never a painted box.
- **`src/v15/row.js`**: the five in a row on the bench as it stands today (y 3.1, about r 70 from the keep's centre (37, 31) on bearing 20, facing north-east toward the house; V0 keeps that ground and will give it a plot name), with the ground between them finished (a paved strip, a step, a drain). It ships as part of the village.
- A test page or param (`?v15=kit` or the like) that lays out every maker at ten seeds on flat ground for a contact sheet. Render it.

## Read

`visual-art` (all, and `architecture.md` twice: the hands, what failed), `src/structures/taverna.js` and `src/v8/house/` (the model for a lived-in building and its lamps), `src/v9/waystation.js` (a small mixed-hand site), `src/v8/strata.js` and `parts.js`, `noon.js`, `src/v14/noon-road.js` (the glass), `src/structures/geo.js` (the Builder), `src/structures/keep.js` (the ashlar the masons are quarrying).

## Done when

- The row, rendered from the east in the sun's light, into the sun as a silhouette, at the gutter with its windows lit, from 60 m and from 6 m, on low and high, and each building close. Look at every frame with this brief shut: five builders, plainly; which is oldest, which is new?
- The roof yard and the two interiors walked in a real browser on the keys; every walkable metre rendered a metre apart on medium (`_common.md`).
- The contact sheet shows real variation.
- Your share of the budget: the row at most 3 draw calls and 45k triangles at low; a Late house at most 2.5k triangles at low.
- `world-code/modules.md` says in a few lines how a quarter calls each maker.
- Tests: `ONLY=walk,hop,edges,perf,loading,strata,contrast,regions tools/suite.sh 8162` and one you add (`tools/village-test.mjs`: each maker at several seeds makes closed geometry inside its footprint, with colliders and floors that agree with what is drawn).

Report as `_common.md` says, plus: the frames in the order a reader should see them, and what you would tell four agents about to build thirty of these.
