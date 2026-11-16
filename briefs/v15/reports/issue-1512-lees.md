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

## Tests

Never the whole suite. Commands as run, with what they printed:

- `ONLY=village,geometry,walk,hop,edges,heights,roads,paths,rocks,regions,strata,house,perf,loading,contrast tools/suite.sh 8163`: 13 of 15 ok on the first run (paths 81 PASS lines, roads 62, regions 56, contrast 3, house 20, rocks 42, walk 13, hop 25, edges 214, heights 165, geometry 96, loading 28, perf 29); `strata` and `village` failed and were fixed (the arch's sign said no size, so strata-test cast past its spandrel; the stall plot as kind `shop`, above).
- After the fixes: `ONLY=village-plan,village,strata,house,geometry,roads,paths,regions tools/suite.sh 8163` (after merging `origin/next`): 8 of 8 (paths 81, roads 62, village-plan 7, regions 56, strata 8, village 640, house 20, geometry 96). `walk`, `hop`, `edges`, `heights`, `rocks`, `perf`, `loading`, `contrast` were not rerun after the last three small commits (the stall's kind, the sign's size, the stones over the slot).
- `node tools/village-plan-test.mjs`: 7 passed, 0 failed.
- `node tools/geometry-test.mjs http://localhost:8163 lappet-lees,lappet-lees-square,strake,lappet-low`: 21 passed, 0 failed; both of the Lees' places hold no finding, with no baseline entry. One exemption added: `lees-noon` (light, not a solid).
- An honest note on one commit: `fix(v15): Q3 geometry to zero ...` reported zero on a quarter that had not built (`zf` undefined in the Ullage); the next commit is the real zero.
- `node tools/village-walk.mjs http://localhost:8163 keys low 0 lees-walk2`: `walked: yes` (35 frames). A first run (`lees-walk`) stuck on the Mid Rung at (73.8, -16.4), and a control run with `lees=0` stuck at the stair's foot (81.2, -24.6): the tool does not repeat, with or without the quarter. Headless Chromium refused the pointer capture in all runs (the page's drag-to-look fallback).
- `node tools/village-walk.mjs http://localhost:8163 touch low 0 lees-walk`: `walked: no`: it crossed the square and went down the ramp, then stuck on the Pennyworth's ramp at (96.3, -26.1) heading for the house wall. Run once; not in the Lees, not looked into.
- Counts on low (`ctx.lees.stats()`): 2 draws, 17,457 triangles (17,101 stone, 356 light), 0 point lights. Budget 5 draws, 45,000 triangles, three lights.
- `tools/route-frames.mjs http://localhost:8163 lappet-lees-square medium lees-route`: 198 frames, one sheet. **Read at full size: the sheet and four frames (8.2 m ahead and down, 21 m ahead and left), not all 198.** `lappet-lees` (the street past the shops) was not route-framed; the shops were read from their own views instead. This is short of what `_common.md` asks.

## Frames, in the order a stranger should see them

All under `/Users/austin/dev/below-a-fading-star/.claude/worktrees/issue-1512-lees/shots/wip/`.

1. Far: `lees-05-far-road-100.png` (high, from the road at 100 m), `lees-10-high-far-north-50.png`.
2. Arriving by the old way: `lees-05-arr-1-way.png`, `lees-05-arr-2-bank.png`, `lees-02-arr-3-arch.png`, `lees-06-arr-4-under.png`; in the gutter `lees-09-arr-3-arch-gutter.png`.
3. The fountain: `lees-06-fount-west.png`, `lees-10-high-fount-kerb.png`, `lees-10-low-fount-kerb.png`, `lees-06-fount-strake.png` (its back, from the Strake), `lees-06-fount-north.png`, `lees-04-sweep-up.png`, `lees-06-spout.png`, `lees-04-above.png`.
4. The square from the stair: `lees-06-sq-from-stair.png`, `lees-09-sq-from-stair-gutter.png`; the Tare `lees-06-stall.png`.
5. The shops: `lees-08-lagan.png`, `lees-08-lagan-near.png`, `lees-08-ullage.png`, `lees-08-welt.png`, `lees-08-welt-near.png`, `lees-08-rebate.png`, `lees-09-rebate-frame-gutter.png` (through the great frame), `lees-08-street-east.png`, `lees-08-street-run2.png` (these two not read).
6. The route sheet: `lees-route-lappet-lees-square-medium-sheet.png`.
7. The slot: `lees-11-high-tread-along-east.png` (before), `lees-15-tread-along-east.png` (after).
8. Before any of it: `lees-00-before-*.png` (low).

## What is weak

- **From the road at 100 m the fountain is a small pale shape** among the houses' lit walls, not a thing that pulls you in; it reads from the old way (40 m) and from the stair. The brief asked for "seen from the road".
- The fountain's back, from the Strake, is a plain celadon swell with one band: a surface, not a picture.
- Nothing here moves but the light's breath; the Swape does not dip, and there is no act. Nothing was judged in a real browser with the pointer captured.
- The Tare stands close on the walked line: at 21 m of the route the walker's shoulder is against its curtain (`lees-route-lappet-lees-square-medium-m021.0-4left.png`).
- The Rebate's house is whatever seed 7 gives; its walls were not worked on beyond the kit's.
- The light on the Strake's own flags is only the additive haze (they are not the quarter's stone), so the pool of light stops being ground-lit at the row's edge.
- Route frames mostly unread (above); the phone render (390 x 844) was not taken.
- No story file was written for the fountain, the Swape or the Leerie.

## Defaults taken

No point light; the fountain moved; `title` not `name`; the stall as a new plot of kind `stall`; the slot closed from this module, not in V1's maker.
