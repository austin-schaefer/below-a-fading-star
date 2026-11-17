# Q3: the Lees (the square, the fountain of noon, the shops): report

Branch `issue-1512-lees`, port 8163. Frames are in `shots/wip/` of this worktree (moved to the deploy worktree's on `tools/worktree.sh rm`).

## What stands where

| Plot | What | 
|---|---|
| `fountain` (moved: run 1, s 19.6, D 25.0) | **The fountain of noon.** The broken foot of a vessel (celadon glaze, an ox-blood band, a milk body), a 4 m tongue left standing on its south side and its rim down to knee height on the north, stored daylight lying in it. A kerb, a notch the light runs over into a gutter, a shelf of flasks left to fill (each fuller than the last), the Swape (a well-sweep with a flask cradle), the Leerie's slate on its post, a bench against the warm glass, a vine. |
| the square (no plot) | The Heliarchs' way of hexagons from the Wanting Arch (s 14.6, D 28.7) to the stair's foot, dished and split round the bowl, a third robbed and made good in cobble; Late flags either side, beaten earth elsewhere; the gutter to a spout stone on the ha-ha's wall, where the light falls and goes out; a worn line of flags along the shops. |
| the old way's head | **The Wanting Arch**: a Heliarch arch with one voussoir gone from its shoulder and a raw pole propping the stone beyond the gap, the spandrel and the sign left on one side only. The fountain stands in its opening as you come up the bank. |
| `lees-shop-4` | **The Lagan** (dead-letter counter): a counter across the vault's mouth and a rack of pigeonholes to the arch's crown, the lit room showing through each. |
| `lees-shop-5` | **The Ullage** (vintner): a plank shutter propped out on two sticks, a low counter and half gate, a beam with twelve hooks. |
| `lees-shop-6` | **The Welt** (slipper-maker): a plank wall with a wicket and a window, a last's stand on the sill, half a curtain, a trying-on bench. |
| `lees-stall-salt` (new plot) | **The Tare** (salt-weigher): a door-slab counter on two drums under one cloth, a curtain, a balance with a perch on its beam, an empty peg. |
| `lees-house-3` | **The Rebate** (picture-framer): a Late house (`makePlot`, seed 7), empty frames leaned by the door, and on the brink a great frame on two posts holding the view of the Prospect. |

All names are `[Proposed]`. They are in a new plot field, `title` (the brief said `name`, which is the plot's id and what every test keys on).

## The light

No point light: `house-test` allows three sources in reach of P9 and the Pomegranate House's two and the Link-Boy fill them. The quarter draws its stone in its own instance of the stone shader (`leesStone`): channel 0, the ember glass everywhere else, is the noon light here, steady (a breath of 6 % at 0.7 rad/s, no flicker, not dimmed by the gutter). The light on the square is baked per vertex (`bakeNoon`: a heavy light that lies along the ground and thins with height, and the pool's glow on what looks down at it); one additive mesh (`lees-noon`) is the pool's surface, the run in the gutter, the fall off the spout and a low haze.

Histograms (share of the frame at luminance 200 or more / 240 or more / pure white), `shots/wip/lees-10-{low,high}-*.png`:

| view | low | high |
|---|---|---|
| at the kerb, looking in | 10.2 % / 0.91 % / 0 | 8.8 % / 0.41 % / 0 |
| from the west, 5 m | 1.8 % / 0.18 % / 0 | 1.0 % / 0.06 % / 0 |
| under the arch | 0.94 % / 0.01 % / 0 | 0.66 % / 0.01 % / 0 |
| from the old way, 40 m | 0.13 % / 0.03 % / 0 | 0.13 % / 0.03 % / 0 |

Nothing reaches white on either tier; the pool is the brightest thing in every frame it is in. With the gutter held at 0.3 the bowl is unchanged while the lamps and limewash go down (`lees-09-*-gutter.png`).

## The plan (V0's file): what I changed and why

- `fountain` moved from against the Strake's flags to run 1, s 19.6, D 25.0 (3.4 x 3.4): where it was it could not be walked round or seen from the old way; here it stands in the arch's opening and still inside the ha-ha's line.
- New plot `lees-stall-salt`, kind `stall` (not `shop`: as a `shop` it joined `village-test`'s real plots, shifted the seed of every plot after it, and `quarrels-house-1` builds with no door at the seed it then got. That is a fault waiting in V1's Late maker for whoever next adds a plot before it).
- `leesHead(x, z)`: the square's ground where it runs out past the ha-ha's line to the old way's bank head; `villageClear` and `lappetEarth` read it (nothing grows there, the ground is earth). This changes the terrain's baked colour and the vegetation's clearing in that patch: shared code, so `regions`, `rocks`, `paths`, `roads` were run.
- `title` on the five plots; geometry place `lappet-lees-square`.
- `village-plan-test`: 7 passed, 0 failed.

## Left by the houses

- **The pale strip** (`v15-row-r4-high-tread-along-east.png`): it was the Elder house's cleft room: its plaster back wall stands in the open slot between the leaning block and the Low Rung's parapet, white, seen end-on from the tread's west end and from above. Closed from the Lees' module with a weathering course of five stones over the slot and an upright at its west end (`src/v15/quarters/lees/square.js`, last block). Before `lees-11-high-tread-along-east.png`, `lees-13-crack-down.png`, `lees-13-crack-east-end.png`; after `lees-15-tread-along-east.png`, `lees-14-crack-east-end.png`. The cause (the room's `zbk` in `src/v15/houses/elder.js` reaching behind the block) is V1's and is not changed.
- **The rope rail and doubled lamps**: looked at from the Low Rung's tread behind the row in three frames (`lees-13-rail-{1,2,3}.png`). The row's back is stone parapet throughout; V0's rope rail is on the timber stair only and does not run beside a parapet in these frames; one V0 lamp stands at the stair's foot and no house lamp is within a few metres of it. Not judged from the square side at night-like gutter beyond `lees-09`.
- `makePlot` on `lees-house-3` leaves a coplanar pair or a back inside the house itself at seeds 3, 5, 6, 8 and 9 (geometry-test); 7 is clean and is what is built.

## Counts

- 2 draws (`lees`, `lees-noon`), 0 point lights. Triangles on low: see Tests.
- Both meshes are on `ctx.lappet.farHidden`.

## Places left for people and goods (`ctx.lees.places`)

The spout; the Lagan's 30 pigeonholes and hatch; the Ullage's twelve hooks and counter; the Welt's sill, last's stand and trying-on bench; the Tare's perch, counter and peg; the Rebate's leaned frames and the great frame; three seats on the bench against the fountain; the kerb where someone kneels to dip; the Leerie's slate.

## Round 2: what the readers and the review found, and what was done

- **The shops say what they sell.** `goods.js`: a trade board with a thing on it for each (bottle, sealed letter, slipper, salt cone, frame), the goods themselves on show (the Ullage's bottles on hooks and a shelf, the Lagan's letters sealed side out in the pigeonholes, the Welt's lasts and slippers, the Tare's cones, scale and hemp sacks, the Rebate's leaned frames and canvas), and each lit by its own lamp, baked (`bakeLamps`, channel 1; still no point light).
- **The Tare** is off the walked line (run 1, s 10.2, D 25.1, facing in) and its board hangs in under the cloth with its foot at 1.9 m; the first reader had the camera inside the old board.
- **The fountain can be walked round.** Walking it myself found it could not be: the Swape's legs and the vine's poles closed the east side. The post stands 2.85 m out at -68 degrees and the vine's first pole at -110; the way is between the bowl and the legs. The same walk found my own ruby street lamp standing in the only passage round the Noon main; it is moved (run 2, s 5.6, D 21.3).
- **From afar.** The sherd is taller (4.7 m), the pool glow lower, and three crossed additive sheets rise 15 m over the bowl: from the road at 100 m it is a pale shaft over a shell (`lees-25-far-road-100.png`), strong from the old way (`lees-25-arr-1-way.png`); from the causeway it is a thin line only (`lees-25-far-causeway.png`).
- **In the kit, two small commits of their own** (`711657c`, `ac936e7`): `shortEdges` before a facade is battered (the folded earcut slivers), the washing's cloths offset; for kind `elder` the packing is carried under the stone, and my cap over the slot is gone. `lees-house-3` builds clean at seeds 3, 7, 8, 9; seed 5 has two room walls in one plane and seed 6 a back face, from other causes, not fixed. The Rebate is on seed 7.
- `WAY`, `ARCH`, `ROW_EDGE`, `ROW_END` are read from the plan (`STRAKE`) and `ctx.village.row`. The great frame's bottom rail has a collider. `village-test` says in a `NOTE excused` line what the `stall` kind excuses (quarrels-house-1 has no door at seed 26 on low: V1's).
- Leaks: the spout's white seam (the fall is in lengths now), the gutter's glow (dimmer). The route is clear of the Heliarch stair's foot (the third reader had the stair's side filling the frame).
- **What each loose shape is.** The dark rectangle in `fount-north`: the arch pier's shadow. The two rails with a plank: the Strake's street drain (V1's `src/v15/row.js`), not mine, left. The red bar in the sky: the world's orbital debris. The salmon Elder face: the low sun on its west face. The blank round tower and the sliver at a pointed door's head are the houses' (kit, not touched). The orange pole at the stair's foot is V1's stair lamp. The big leaning slab on run 2 is the Noon main.

## Tests

Never the whole suite. Run twice: on 53b9287, and again on d43d642 after merging `origin/next` with the Quarrels in it (two conflicts, `plan.js` and `runtime.md`, both sides kept). The Rungs' and the Pennyworth's round 2 were not yet in `next`: one more merge and run is owed after them.

- On d43d642, the same list with `village-plan`: **16 tests, 0 failed** (paths 81, roads 62, village-plan 7, regions 56, contrast 3, strata 8, village 646, house 20, rocks 42, walk 13, hop 25, edges 214, heights 168, geometry 99, loading 28, perf 29), 12 min 31 s. On 53b9287:
- `ONLY=village,geometry,walk,hop,edges,heights,roads,paths,rocks,regions,strata,house,perf,loading,contrast tools/suite.sh 8163`: **15 tests, 0 failed** (paths 81 PASS lines, roads 62, regions 56, contrast 3, strata 8, village 640, house 20, rocks 42, walk 13, hop 25, edges 214, heights 165, geometry 96, loading 28, perf 29), 17 min 27 s.
- `node tools/geometry-test.mjs http://localhost:8163 lappet-lees,lappet-lees-square`: 15 passed, 0 failed, no baseline entry for either place.
- `node tools/lees-walk.mjs http://localhost:8163 keys low`: `[lock] the mouse is captured`, `walked: yes`, 36 frames (`lees-walk-keys-low-000` to `-035`), 0 page errors. Before the fixes it stuck at (74.6, -38.0) on the Swape and at (99.8, -10.9) on my lamp by the Noon main.
- `node tools/lees-walk.mjs http://localhost:8163 touch low`: `walked: yes`, 46 frames (`lees-walk-touch-low-000` to `-045`), 0 page errors. An earlier touch run climbed the Heliarch stair's first steps and stuck at (82.5, -28.1); the tool's line (and the route's) now passes clear of the stair's foot.
- Round 1's stuck places, for the record (`tools/village-walk.mjs`, not in the Lees): touch at (96.3, -26.1) on `pennyworth-ramp`, stick held forward, heading for waypoint 22 house-wall (101.0, -30.7), after frame 016 ramp-foot-back at (103.0, -16.5); keys run 1 at (73.8, -16.4) on lappet-mid heading for 8 upper-flight (75.8, -15.4); the `lees=0` control at (81.2, -24.6) on ground heading for 12 bastion (79.7, -25.2).
- `tools/route-frames.mjs http://localhost:8163 lappet-lees medium lees-r2`: both Lees routes framed. `lappet-lees-square` (276 frames, m000 to m045): **all read at full size, by three readers who were told nothing** (90, 96 and 90 frames opened), their findings above. **`lappet-lees` (the street past the shops) is framed but its frames were not read**; the shops were read from their own views and the two walks. The frames were not re-taken after the last fixes.
- Counts on low (`ctx.lees.stats()`): not re-read after round 2; the geometry test counts 33,043 faces in the square's place on medium.

## Frames, in the order a stranger should see them

All under `/Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1512-lees/shots/wip/`.

1. Far: `lees-25-far-road-100.png`, `lees-25-far-causeway.png`, `lees-25-arr-1-way.png`.
2. The fountain: `lees-25-fount-west.png`, `lees-25-fount-strake.png`, `lees-25-fount-north.png`, `lees-25-sq-from-stair.png`; in the gutter `lees-25-fount-west-gutter.png`, `lees-25-fount-strake-gutter.png`, `lees-25-sq-from-stair-gutter.png`.
3. The Tare: `lees-25-stall.png`, `lees-25-stall-far.png`, `lees-25-stall-gutter.png`.
4. The shops, near and from the street: `lees-25-lagan-near.png`, `lees-25-lagan.png`, `lees-25-ullage-near.png`, `lees-25-ullage.png`, `lees-25-welt-near.png`, `lees-25-welt.png`, `lees-25-rebate.png`, `lees-25-rebate-frame.png`, `lees-25-street-east.png`, `lees-25-street-run2.png`; each lamp in the gutter: `lees-25-lagan-near-gutter.png`, `lees-25-ullage-near-gutter.png`, `lees-25-welt-near-gutter.png`, `lees-25-rebate-gutter.png`, `lees-25-street-east-gutter.png`, `lees-25-street-run2-gutter.png`.
5. A phone on low (390 x 844): `lees-25-phone-low-sq.png`, `lees-25-phone-low-shops.png`.
6. The walks, in order: `lees-walk-keys-low-*.png`, `lees-walk-touch-low-*.png`.
7. The route: `lees-r2-lappet-lees-square-medium-m*.png`.

## What is weak

- **From the causeway the fountain is a thin pale line, not a shell**; from the road at 100 m a shaft over a small shape. It pulls from the old way and the stair, not from across the plain.
- The shops on runs 1 and 2 face a narrow street: there is no 15 m stand across from them on the bench, so "from across the square" is the street's width (about 5 m) and the `*-15` views (off the bench) show the rampart, not the shop. The Welt and the Rebate were read by me on a contact sheet, not by a cold reader.
- The second and third readers could not say what the Tare or the Lagan sold before the last changes (letters sealed side out, hemp sacks, the board moved); no reader has seen them since.
- The Tare's counter stands on two pale Heliarch drums that a reader called blank blocks; left.
- `lees-house-3` at seeds 5 and 6 still faults in the kit; the Rebate avoids them by its seed.
- The `lappet-lees` route frames are unread; route frames not re-taken after the last commit.
- Nothing here moves but the light's breath; the Swape does not dip. No story file was written for the fountain, the Swape or the Leerie.
- The drain's plank and rails (V1's) still read as laid by nobody.

## Defaults taken

No point light; the fountain moved; `title` not `name`; the stall as a new plot of kind `stall`; the slot closed from this module, not in V1's maker.
