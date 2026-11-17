# issue-1722: the sphere moved east, its walls, its stays, its join

Branch `issue-1722-sphere-east`, port 8177, 2026-11-17. The owner's four words on the Shuttered Noon: move it to the
eastern moor; the hitbox kept them far off; the lines inside end in air; triangles where it meets the ground.

## 1. The site: (292, 108), the east wall's foot north of the Noon Road

- Candidates looked at (air and ground frames `shots/wip/v17-1722-r0-cand-*`): NE (292, 108) and SE (296, -95).
  SE stands among tors and is 60 m off P8; NE is open moor, 78 m from the nearest path (P44), 69 to 77 m from the
  Noon Road, the Laid Sun and the Foundered Nave (the Noonwrights' road and nave: their junction belongs by them),
  112 m from the Lonely Staircase. Chosen: NE.
- Ground: 12.6 at the centre, about 5 on the valley side 15 m out, 17 on the wall side. Centre y 7: the valley side
  stands clear and its east third is in the wall's foot.
- Seen: from the valley at 140 m (`r4-medium-valley150-*`) and from the Lonely Staircase's top
  (`r4-medium-stairtop-*`), lit by the sun, never in front of it. **Not from the spawn**: the keep's walls and the
  Arcature stand between (`r3-medium-spawn-*`, `r3-medium-gate-*`).
- `SPHERE` (`src/v17/plan.js`) is now one row: `c`, `y`, `arrive` (the visitor's side), `face` (toward the Garth);
  the seat, node and keeper's facing are computed from them. The hoops point west-south-west at the Garth.
  `garth.js` aims its stub at `SPHERE.c` and so now points east (not edited: not mine).
- Moved with it: the claim (its "hill behind" now opposite `arrive`), rocks.js's pebble box, the sphere's own pebble
  clearing, `LANDMARKS.noonsphere`, the `noonsphere` map stand (268, 98) looking at the man, P56 (now off P51, round
  the Noon Road's east end; roads-test wanted it joined, and the Noon Road is not a track), the `v17-sphere`
  geometry place and its baseline, the five sphere views in `tools/views-v17-water.json`, the names doc, the story's
  State, Places and Beats, the modules and runtime rows. There is no sphere emitter in `src/v17/sound.js`.
- The old site: no claim, cut, pebble rule or baseline row is left there. Not compared frame to frame with main.

## 2. The walls

Cause: one collider disc of radius R + 0.25 (the equator). Half sunk on a slope, the glass meets the uphill ground
on a circle of about 12 m, so the disc held a walker about 3 m off it there. Fix: 48 capsule walls round it, each
corner where a walker's body column (feet on the ground to the eye) comes 0.55 m from the glass, less the body and the
wall's r. Walked at on the keys from 12 bearings (`stops.mjs`), nearest point of the body to the glass:
0.53, 0.54, 0.54, 0.52, 0.52, 0.51, 0.51, 0.51, 0.51, 0.53, 0.54, 0.52 m (bearings 7 to 337 in steps of 30). The eye is
1.1 to 1.6 m from the glass on the uphill side, where the glass curves away under the feet.

## 3. The lines

Cause: stays ran from all round, the lower ones up to the ring over his head, which crosses him; the node's stays
ended 0.15 m off the node. Fix: a rim round his seat; four hangers ring to rim at his sides and back; a cradle laced
across the rim; stays from the upper glass down to the ring (computed as rays from the ring's point to the glass);
stays from the node's skin (its ellipsoid) out of its far side to the glass. Every end has a fitting: an eye fused to
the glass, a small eye at the ring, rim or node. All from the keeper's frame `F` and the node's constants.
Frames: `r2-medium-lines*`, `r5-high-lines*`.

## 4. The triangles at the join

Rendered at the new site, before and after each change (the old site was not rendered first). Causes found:
- the faceted lip: per-triangle normals read as a fan of triangles round the glass (`r1-r6-08`). Now one indexed
  sheet with smoothed normals and the terrain's normal at its foot, heaped as a bank of earth and heather;
- the earth skin's coarse top edge stood up to a quad above the ground, its outer face outside the glass: its
  vertices are now held 8 cm under the drawn ground;
- on low, the terrain's own triangles showed through the bank's foot in teeth (the bank lay on bilinear heights):
  the bank now lies on the drawn triangles, sampled closer;
- the bank seen from inside the glass was back-face culled: two-sided now;
- terrain faces on the hill behind whose corners were all outside the glass but which dipped into it: cut too.
Frames: `r2-medium-join*`, `r5-low-join*`, `r6-low-*`, `r8-low-*`, `r5-high-*`.

**Still there:** from 2 m on the uphill side (`r8-low-join2-10`), through the glass, the far side's earth has a
ragged pale top edge. Its cause is not confirmed.

## The reader (sonnet, six frames, not briefed)

The reader saw "a glass observatory or orrery dome… a seated figure at a wheel, and wires to discs". It flagged:
- "the floor edge inside the shell is jagged and has holes where the floor meets the glass" (the low frame above: two
  fixes made since, and the edge is still there);
- the node "a brass sphere in mid-air", though the stays visibly hold it;
- the two glowing orbs (the point light's highlights on the glass);
- the hoop outside, which it called a leftover prop;
- a black slab and a purple box in the stair-top frame (the stair's own top; not the sphere).

## Light

The brightest pixel within 14 px of the sphere at 300 m (linear, before bloom), lit and guttered (hold 0.3):
0.164 and 0.083. The sun's disc, in the same light: 1.24 and 2.3 to 3.1. The far-glow guard was not extended.

## Tests (port 8177)

`ONLY=geometry,settings,paths,roads,regions,outline,threads,dressing,strata,rocks,heights,walk,edges,audio,village,shore
tools/suite.sh 8177`: dressing 22, threads 25, paths 88, outline 77, regions 56, strata 8, village 690, rocks 38,
walk 13, edges 214, heights 208 ok. In that run, settings (2 coords rows), roads (P56 unjoined), shore, geometry and
audio failed. Another agent's suite on 8176 wrote to the same log path, so those lines were read from the
summary table.
- settings: on a rerun, 87 PASS, ok;
- roads: fixed (P56 off P51); rerun roads 68, paths 88 ok;
- geometry: v17-sphere 17 passed, 0 failed after the new baseline rows and the last cut change (with their reasons:
  3 groups of backs at the earth skin's held top edge, and 4 moor stones half bedded 23 to 26 m out, outside the
  claim);
- shore: `tarn-north` worst step 6 to 7 against 3. It also failed in the other agent's run, which does not have
  this branch. The tarn is 380 m from the site;
- audio: 107/108, `act-bell-letters` +0.5 dB over the bed (the Tocsin). No audio was touched.
- After the last change: rocks 38 and walk 13 ok.
`node tools/walkers-test.mjs http://localhost:8177`: 19/20 (P12's pit-lamps row).

## Frames, in order (`shots/wip/`)

`v17-1722-r3-medium-teleport-lit.png`, `v17-1722-r4-medium-valley150-lit.png`, `v17-1722-r4-medium-stairtop-lit.png`,
`v17-1722-r5-high-lines3-03.png`, `v17-1722-r2-medium-join-sheet.png`, `v17-1722-r6-low-sheet.png`,
`v17-1722-r8-low-join2-10.png`, `v17-1722-r3-medium-teleport-gut.png`.

The owner's link: `http://localhost:8123/?pos=268,98&yaw=-1.97&pitch=0.2`.

## Round two (issue-1724, branch `issue-1724-sphere-under`)

The owner: "still got weird triangles on its edge" (screenshot `owner-v17-sphere-edge-triangles.png`, real
Chrome at 60 fps), and "it needs some additional visual 'payoff' for going to edge".

### The triangles

They were the earth skin's own faces, folded. issue-1722 clamped each straddling quad's upper corners straight
down to the ground. On the uphill side the ground lies over the equator, so a point moved straight down there goes
*inside* the glass. The folded faces were flat and dark, and through the glass they showed as a sawtooth of big blue
triangles along the rim. My round-one stands were all on the valley side, where a clamped corner goes outward under
the ground, so they never showed it. Reproduced at high from the south-east and east stands, walking at the glass
on the keys and looking down (`v17-1724-before2-high-se*`, `-eR`). The view stands are listed in `own2.json`.

Fix: the skin is no longer clamped. Each triangle is clipped on the sphere, with bisection on the drawn ground, at
6 cm under the ground. The skin keeps the glass's curve and ends on one line, which the bank's foot (outside the
glass, down to 45 cm under) closes. After: `v17-1724-after1-high-*`, the same eight stands, with no sawtooth. The
final round shows none at medium, high or low (`v17-1724-final-*`). geometry's 3 baseline "backs" at the skin's
top edge are gone with it, so the baseline is lowered.

### Under the edge

The works now stand in the opened bowl under the ground line, seen only from the rim looking down through the glass.
The story says he shut the line and holds the last noon in. So:
- **The mouth:** the line's mouth sits low on the Garth's side, 55 degrees under the horizon, toward the Garth, ringed
  in old glass, with a bronze bell standing in.
- **The iris:** eight bronze and verdigris leaves turned shut across the mouth.
- **The leak:** a crescent of noon leaks round one edge, the little the Garth still lives on. It is baked glow, glow 2.6
  against the beam's white; no light, no new draw.
- **The spindle:** it runs from a bevel box under the node down to a gear on the iris's ring. The wheel's axle runs to
  the node, so the wheel in his hands is what holds it shut. Its three bearings are each stayed to the glass, with an
  eye at each end.
- **The ladder:** it runs down the glass from the ground line to the mouth.
- **The tally:** beside the ladder, his tally of kept noons is scratched in the lime in rows of fives. Some strokes are
  worn off, and the rows stop short of the mouth.

All of it goes into the parts' one draw: draw calls unchanged. It does not read from 15 or 60 m
(`v17-1724-final-medium-far15/far60`), and nothing pokes out. The story's State, a loose end (why the iris leaks;
when he stopped counting) and its log are updated.

The first idea, a blade of light lying down the glass from the leak, read as an arrow cursor and is gone.

### The reader (sonnet, four rim frames, cold)

> "a hollow, rough, mottled lilac-grey inner surface (a big concave bowl) with a suspended mechanism… A central
> brass-coloured hub sits near the top with many thin taut cords… A long dark rod runs from the hub down to a flat,
> round, fan- or turbine-like disc at the bottom. The disc has a glowing white arc or ring on its rim… Hanging panels
> of tiny glyphs or writing… a ladder or rail pattern on the wall… The man: a small, translucent, grey figure… next to
> a green wheel or hoop. It looks like he is working a wheel or crank."

It flagged: the man is faint and hard to read from the rim; the leak's ring is "hard-edged and overbright" (so I
softened it, glow 3.6 to 2.6); a large shadow band across the wall in one frame (the terrain's shadow through the
glass); the wall speckle looks flat; the glyphs and rails are low-resolution. It read the mechanism and the man at
a crank. It did not say "holding it shut".

### Tests (port 8177)

`ONLY=geometry,settings,heights,rocks,dressing,strata,walk,edges`, before merging `next`: settings 87, dressing 22,
strata 8, rocks 38 and walk 13 ok. Three failed:
- **edges:** the Garth hall's coplanar pairs.
- **geometry:** v17-garth and v17-swallow, 2 new each, plus the sphere's baseline now looser than the place.
- **heights:** the top gallery's cost 381 calls against 380. That gallery is on the west wall, far from the sphere,
  and this branch adds no draw.

So I lowered the sphere's baseline, merged `next` (F3) and reran geometry, edges and heights. v17-sphere now passes 17/0. The same three still fail on the Garth's and the Swallow's rows and the gallery's 381 calls: they come from `next`, not this branch. This branch touches no file of theirs and adds no draw. The sphere's only cross-link, the Garth's stub aimed at `SPHERE.c`, is unchanged since round one.
`node tools/walkers-test.mjs http://localhost:8177`: 19/20 (P12's pit-lamps row).

### Frames (`shots/wip/`)

In order:
- `v17-1724-before2-high-seL.png` (the sawtooth reproduced), then `v17-1724-after1-high-seL.png`
- `v17-1724-final-medium-s-down.png`, `-e-down`, `-se-down`, `-tp-down`
- `v17-1724-final-high-s-down.png`, `-e-down`, `-se-down`, `-tp-down`
- `v17-1724-final-low-s-down.png`
- `v17-1724-final-medium-far15.png`, `-far60.png`

The best rim stand: `http://localhost:8123/?pos=284,134&yaw=-0.30&pitch=-0.5`. Walk forward to the glass first: the
link lands 12 m out.
