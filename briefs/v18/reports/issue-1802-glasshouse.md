# F2, the Florilegium: report (`issue-1802-glasshouse`)

## For F3 (the first push; these numbers are fixed, the code follows)

**The ground.** The site is levelled: one row in `src/height/pads.js` (`florilegium`: centre (-265, 126), a square of half 8.5 m turned 0.62 rad, a 7 m skirt) holds the court at **y -3.2**. Until that row is on your branch `heightAt(-265, 126)` reads about -3.07 and the door's ground about -3.95; build to -3.2.

**The grate's opening.** A square, 1.2 m, axis-aligned in the world, in the paving outside the east door:

- centre **(-258.0, 126.0)**; x -258.6 .. -257.4, z 125.4 .. 126.6
- the bars' top at **y -3.15** (the paving's top; the ground under it is the pad's -3.2), the bars 0.06 m deep, a stone kerb 0.2 m wide round it
- F2 draws nothing below y -3.25 there. Under the bars F2 draws one black square at y -3.23 facing up only (front-side: from below it is not drawn), so the grate is dark from above before and after you cut the ground; the cut of the terrain under it and everything below are yours.
- the door's leaf is at x -259.4 (the east wall's face), z 125.2 .. 126.8; the grate's west edge is 0.8 m from it.

**The house, for the room below.** Twelve-sided, centre (-265, 126), wall faces 5.6 m from the centre (corners 5.8), floor at y -3.2. The seven tubs stand on that floor: stone, r 0.62 at the rim, 0.5 at the foot, 0.7 m high. Their centres (x, z), in `LIKENESSES` order:

| id | x | z |
|---|---|---|
| fan | -262.06 | 127.70 |
| sword | -265.00 | 129.40 |
| hoop | -267.94 | 127.70 |
| cup | -267.94 | 124.30 |
| pair | -265.00 | 122.60 |
| hawk | -262.06 | 124.30 |
| graffer (the sprout) | -260.90 | 126.00 |

(Six on a ring of r 3.4 at 30, 90, ... 330 degrees from +x toward +z; the sprout 4.1 m east of centre, inside the door.) The flask hangs at (-265, 1.6, 126): 4.8 m over the floor.

**`buildLikeness`** (in `src/v18/florilegium/likeness.js`, three and the Painter only: no ctx):

```js
// id: an id of LIKENESSES ('fan' | 'sword' | 'hoop' | 'cup' | 'pair' | 'hawk' | 'graffer')
// opts: {
//   at: [x, y, z] = [0, 0, 0]   the middle of the tub's foot (y: the floor it stands on)
//   yaw: 0                      radians about y; at 0 the figure faces +z
//   plant: true                 the flower itself
//   tub: true                   the stone tub (r 0.62, 0.7 m high)
//   roots: true                 the roots: over the tub's rim, and down from its foot through the floor
//   rootDepth: 2.4              how far below `at.y` the roots go (they end ragged; six of them are as thick as an arm)
//   into: null                  a Painter (src/fauna/uncanny/kit.js) to paint into instead of making a mesh
//   low: false                  fewer sides
// }
// returns { mesh, h, heads, tub }: mesh a THREE.Mesh (paintedMaterial; null when `into` is given), h the plant's
// height over `at.y`, heads [[x, y, z], ...] (two for the pair), tub { r, h }
export function buildLikeness(id, opts = {}) {}
```

For a tub's underside: `buildLikeness(id, { at: [x, -3.2, z], plant: false })` gives the tub and its roots hanging to y -5.6; add `.mesh` to your scene (or pass `into` your own Painter and it costs no draw).

## Hand-back (2026-11-20)

**Built.** `src/v18/florilegium.js` (module `florilegium`, `?florilegium=0`), `florilegium/house.js`, `florilegium/likeness.js`; one row in `src/height/pads.js` (the court level at y -3.2: the site fell 2.5 m across the house); `LANDMARKS.florilegium` (`line` empty, `card: true`, `map: false` until the orchestrator gives it a stand: a default stand 19 m off would have been among trunks); `FLORILEGIUM` in `src/v18/plan.js`; the study page (seven subjects); `tools/geometry/places.mjs` (`v18-florilegium`, the walk round); `runtime.md`, `modules.md`, the story's beat 2 and Log. F1's branch is merged in twice (the claims, P57, P33): this branch carries its commits.

The house is a twelve-sided bud of fish-scale glass, 12.6 m to the finial. The glass is one draw that filters and glows (`src * alpha + dst * src`). The lower wall, to a little over the transom, is a nearly clear band inside a border of each side's colours, so the tubs are seen; the upper wall and roof are saturated. Seven draws: frame, likenesses, glass, cast colour on the ground, halo and far glints, the glow in the air (gone inside 20 m), the dark under the grate. Five PointLights (the flask and four colours; the three slots take the nearest). Twelve wall colliders to the eave and one at the door.

The flowers face out to the glass. Heads follow the visitor on a two-stage ease, each at its own pace (0.8 to 3.1 s; the lovers one pace); after 8 s of the visitor standing, or beyond 34 m, they go back to the flask; `sky.flicker.dark > 0.3` turns them west.

**Numbers** (`views.mjs`, low, the same poses before and after; after includes F1's merge):

| stand | before | after |
|---|---|---|
| `?pos=-250,128&yaw=1.57` | 170 calls, 1.380 M tris | 182 calls, 1.363 M |
| the wood way (-205, 128) | 192 calls, 1.547 M | 202 calls, 1.532 M |

Likenesses 2.4k to 5.3k triangles each on high (the study sheet's labels). `perf` 29/29 on low.

**Tests** (`ONLY=... tools/suite.sh 8182`, the counts printed): dressing 22/22, strata 8/8, threads 25/25, edges PASS (no FAIL line), perf 29/29, study 15/15, roads 69/69, outline 77/77, regions 56/56, rocks 38/38. **Red:**

- `geometry`: `v18-florilegium` 11 new, none of them this module's meshes now (its own coplanar faces are fixed): six floating `veg-pods` at (-254, 131) and (-255, 130), three sunk `rocks-pebble` on the court at (-267.2, 133.8), (-271.4, 120.1), (-255.9, 132.5), two `veg-toadstools` inside the sprout's tub at (-261, 126). These placers do not ask F1's claim `the Florilegium`; I would not re-record them, they want the claim. `span-west-stairs`: one baseline row no longer found (came with F1's merge).
- `settings` 101/103: the stand "A gap at the Collation" (131.5, -72.5) now looks into `veg-trees` at 1.49 m. Not at this site; I did not find which change moved that tree (F1's merge or this branch), and did not bisect.
- `paths` 90/91: the leads' count row says 56 and finds 59 (F1's three spurs).
- `seams`: the ceiling, ghost 232 against 226 (seam 61/63 and off 412/414 are under). The sweep is the village's; not attributed.

`walkers` not run.

**Frames** (`shots/wip/`, medium `v18-F2-medium-*`, low `v18-F2-low-*`, the same twenty views): `far-road`, `far-30m`, `near-stand`, `near-door`, `who-1` .. `who-6` (fan, sword, hoop, cup, pair, hawk), `walk-00` .. `walk-06` (the half circle, door round by the north to the west, 2.2 s apart), `still-20s`, `gutter`, `gutter-off`; `v18-F2-phone-stand.png` (390 by 844, low: not blown out); `v18-F2-after-*` (four views after the last change to the clear band); the study sheet `v18-F2-study3-neutral.png`; before: `v18-F2-before-*`.

**Blind readers** (sonnet, frames only, before the last change to the clear band):
- far and near: "a stained-glass greenhouse in the woods"; from 30 m "the obvious reason to leave the path"; from 60 m "a small patch of multicoloured speckled glitter ... small and hard to read". Found the key behind the door. Said the colours are "a little cartoonish against the muted forest" and that it "would try to enter".
- the six: "a stained-glass hothouse where flower-headed costumed figures stand in pots". The lady with a fan (70%), the armiger as "a grim guard or duellist" with a blade (60%), the child as "a hoop-dancer" (55%), the magnate as "a stout fat person or a cactus" (45%; the cup not named), the lovers as "a pair of courtiers or a couple" (40%), the falconer as "a robed noble or sorcerer" (50%; the bird read as "a gold ring and a small tag"). Three or four of six by the prop, not six.
- the walk: faces toward the camera in walk-01 to 03, mixed in 04 and 05, turned away in 06; in the gutter "the figures' backs face the camera", after it faces again. It could not say what changed in `still-20s`.

**Weak.**
- From the wood way the house is a small coloured patch between trunks, not a scatter of lights that pulls; the glow in the air barely shows there.
- The falconer's bird and the magnate's cup do not read through the glass; the bird reads on the study sheet.
- Every face is the same pale mask with two slits: the readers call it mascot-like. It wants a marking of its own a flower.
- The saturated panes are flat colour; "sticker-like" up close.
- The walk's frame 06 shows the heads turned away: at 2.2 s a stop the slow heads (the magnate 3.1 s, the armiger 2.4 s) had not come round, or had wound past the stem's limit and gone back the other way. Not looked into.
- The cast colour on the ground is thin at walking height (seen at a grazing angle).
- The roots over the tubs' rims are few and stiff.
- One geometry row may remain inside a plinth corner (0.02 m², seen in one run, gone in the last).

**Defaults taken.** The pad. The door on the house's east axis at z 126 (the plan's doorstep (-257, 127) is on the paving). The flowers face out, not toward the flask. The sprout's tub inside the door. `map: false`. F1 merged in.

## Round two (2026-11-20 05:12)

What changed, by the coordinator's six points.

1. **Faces.** No face is drawn. Each head is a different flower with a dark throat and its own unequal markings (`bloomHead`'s `marks`): orchid streaks for the lady, a spiked thistle boss for the armiger, a small ray flower for the child, a four-petal poppy with black blotches and a pod for the magnate, a spotted lily and a second poppy leaning together for the lovers, a dark-throated bell for the falconer. A blind reader (sonnet) on the six: "the heads read as flowers, with no faces... nothing reads as an emoji or a mask", but it still saw "small dark centres that look like eyes" on the armiger and the falconer. The armiger's two pale dots were then changed to one blotch and one streak; that change has not been read blind.
2. **Bodies and gestures.** Every plant is 1.17 times taller in the same tub; the cup is larger and held over the head; the bird is 1.45 times larger, at arm's length, turned. On the neutral study sheet (`shots/wip/v18-F2-study-r2-neutral.png`) fan, sword, hoop, cup and bird all read. Through the glass the reader named the lady (fan), the armiger ("knight or guard", sword or staff), the child (hoop), the couple. **Not read:** the magnate ("not clearly a person", the barrel body blocks the middle and the cup was called a golden bud) and the falconer ("a robed noble" with a hoop: in `who-6` the bird is behind the transom bar). The fan was not opened further, the sword not lengthened and no shoulders were added: those three asks are not done.
3. **Far view.** The halo and haze are larger and stronger, six more haze sprites carry the pane colours east along the spur toward the wood way, the ground cast reaches 27 m and is stronger. No new lights. In `far-road-r2` it is a lit patch with violet ground and mist round it, larger than round one's, still small in the frame; the lantern roof was not changed and does not show over the undergrowth.
4. **Walk 06.** Cause: the turn was accumulated and clamped at 1.3 pi, so after a walk round the house a head sat on the clamp facing away until it unwound. Now each head goes the short way round and the stem's share is periodic (1.2 sin(turn)), so nothing winds up. The check is in the frames, not a test row: each `who-` and `walk-` view logs `turn.err()`, the worst head's angle off the visitor. Stood still: 0.01 to 0.05 rad. During the walk: 0.09 rising to 0.40 rad (the lag), 0.34 at walk-06.
5. **Panes.** A highlight inside each quarry's leading, wider brightness variation pane to pane, more cracked and mismatched ones, a taller clear band.
6. **The key.** Larger, moved to the door's plane, emissive raised: it shows lit through the grille in `near-door-r2`.

Tests, `ONLY=dressing,strata,geometry,edges,threads,perf,study,settings tools/suite.sh 8182`: dressing 22, threads 25, strata 8, edges, perf 29/29, study 15 pass. **geometry fails** (147 passed, 2 failed): `v18-florilegium` has 11 new findings in 4 groups, all scatter inside the claim (veg-pods floating, three pebbles sunk, two toadstools inside the likenesses), and `span-west-stairs` has one baseline finding no longer found (not this module). **settings fails** (101/103): "A gap at the Collation" meets veg-trees at 1.49 m. `origin/next` does not hold F1 yet (its head is 5777739), so nothing was merged and the scatter was not cleared here. After the armiger's marks changed, only study and dressing were rerun (both pass).

Frames: `shots/wip/v18-F2-medium-{far-road,far-30m,near-stand,near-door,who-1..6,walk-00..06}-r2.png`, taken in order after the last change.
