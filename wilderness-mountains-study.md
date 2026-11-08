# The mountains study

**Austin chose C, the massifs; it is the wall now** (no flag; `?mountains=v4` builds the old wall, and A and B are gone from the code; the study below stands as written, and git holds its code). Landing raised the north-west col at 328° to 69 m; see `wilderness-v5.md`, "The massifs (the walls recast)".

Austin, after walking v4/v5:

> really not a fan of the reworked mountains. they now have a shape like: aggressively vertical wall; random-ass fractals above that; even more random-ass fractal walls behind them. what i want is a feeling of an organic mountain barrier. undulating, stooping almost to valley floor perhaps in places. so not 'this is a videogame wall to keep you in' but 'this valley happens to be surrounded by mountains'.

Three candidate profiles stand behind a flag: `?mountains=a`, `?mountains=b`, `?mountains=c`. No flag (or `?mountains=v4`) builds the walls as they are, unchanged to the sample (below). Everything lives in one marked block of `src/v4/mountains.js` ("v5 study"). This note describes the three and what each would cost to land. It makes no recommendation.

## What all three share

- **The crest is shaped, not noise.** It runs through a periodic spline of bearing-to-height control points, a few long rolls per circuit. Two small long-wave noise terms (±9 m, ±4 m) sit on top. The named PEAKS become broad crowns on the massifs: 35–45 % of their height, spread over 2.6× their width. No peak is new.
- **The face follows the crest's height.** The foot sits where the crest's height asks for a given mean slope: about 30° under the cols, up to 48° (A, B) or 52° (C) under the massifs. The profile is a long concave toe into a convex shoulder that rounds over the crest. There is no continuous cliff anywhere. The crest stands out to r 440–481 where it is high, held inside the terrain's square. Wherever the walk limit allows, the foot stays at or beyond r 296.
- **Fractal detail is only texture.** The old pinnacles survive at 22 m amplitude and half the frequency (v4: 52 m), on the upper half of the face. Buttresses, gullies and bedding ledges appear only where the face is steeper than about 46–60°. Shoulder-scale lumps (±18 m, ~110 m wavelength) stop any face reading as a cone.
- **The far ranges are the same form, farther off.** Each far ring takes the near crest's elevation smoothed over ±24° (the same rolls, with the cols filled in), scales it down and pales it toward the haze. So the far rings stand below the massifs in the picture and above the cols, and show through the cols and over the low shoulders.
- **Kept unchanged, using the same code:** the sun's saddle (gate, floor, walkable wedge; the crest is 22 m there in every profile), AM's seats, the glacier's notch, the Tumbling Water's wall, AP's merlons (raised 45 m off the new crest), `walkLimit`, `M_START`, and `crestAt`/`faceAt`/`saddleFloor`.

## A, the rolling range

One range rolls around the bowl. Its crest runs 145–273 m in five long waves: the NE massif (Ridge and Vigilant, 230–273 m), the Horn (265 m), the Abbess (235 m), the Galleries' west massif with the Lectern (240 m), and the Tierce (165 m). The waves dip to 145–180 m between them. Two cols open besides the saddle:

- **The south-east col** sits at **180°** between the Horn and the Abbess, with its floor **65 m** up.
- **The north-west col** sits at **329°** between the Lectern and the Tierce, with its floor **42 m** up. That is lower than the 60–90 m target. The spline point is 75 m and the noise takes it down; raising the point fixes it.

Each col's shoulders lie at about 30° and run long. The front range becomes rounded foothills: 30 ± 14 m high, around r 352, standing on about a third of the circuit. The far rings show at 0.74× (tier 2) and 0.84× (tier 3) of the smoothed crest's elevation, 30 % and 50 % paler.

What A does to the things hung on the wall:

- **Galleries (268–296°):** a face reaches 68 m and 150 m on every bearing. 245 m is reached at 288–296°; in v4 it was reached only at 292°. The face is laid back, though, and the bays were built for a cliff.
- **Vigilant (72°):** the crest is 252 m high at r 478 (v4: 184 m at r 476).
- **Hawser:** the anchor at 100 m sits at r 384, 14 m nearer the bowl than v4's 398.
- **Gradine (54°):** its band points come at r 359 / 391 / 428 (v4: 356 / 406 / 442).
- **Ridge (21–57°):** the crest is 205–272 m (v4: 170–253 m).
- **Span:** the abutments have a wall of 86 m (east) and 91 m (west) within 60 m beyond the gates. In v4 the east side had only 28 m.
- **Annals:** the band does not exist over 69° of the circuit: 0–14, 173–186, 238–261, 321–335 and 359. In v4 it was missing over 41°: 0–16 and 239–262.

## B, the shouldered range

B is A's crest, with four spurs added and the front range dissolved into them. Each spur is a long rounded ridge that leaves the crest at about 150–160 m and runs down into the floor. The spurs bend a few degrees as they descend:

| Leaves the crest at | Toe at | Toe radius |
|---|---|---|
| 110° | 116° | r 312 |
| 166° | 160° | r 308 |
| 208° | 203° | r 306 |
| 308° | 314° | r 312 |

Each spur broadens as it climbs, and its toe ends round, not cut.

**The toes.** A toe is the one part of the walls inside the walk limit (r 348). Each toe starts at r 306–312 and stands 7–13 m high at r 320, 26–32 m at r 340 and 37–42 m at the limit. That is at most 2–4 m above A's ground on the same bearings, which already rises there as the face's concave toe, so inside the limit a spur only rounds a slope that was there. The spurs show as ridges above the limit. A walker can climb a toe as far as the limit and no further. The bearings keep clear of the Span (130°, 230°), the fall and the pit (133–145°), the Gradine (59°), the Long Figure (103°), the tower and the Door (296–298°) and the Hawser (342–346°).

Cols, far ranges and wall-hung things are the same as A's; the chart's A and B lines overlap.

## C, the massifs

Five separate massifs, each 270–335 m high, with deep saddles between them:

| Massif | Bearings | Height | Holds |
|---|---|---|---|
| North-east | 20–100° | to 300 m | the Ridge, the Vigilant, the Mitre |
| South-east | 125–172° | the Horn to 335 m | the Span's east end and the fall |
| South | 190–235° | about 300 m | the Abbess and the Span's west end |
| West | 265–318° | to 320 m | the Galleries and the Lectern |
| Tierce | 336–356° | 300 m | the Tierce |

The cols between them:

- **East col:** **112°**, floor **62 m**.
- **South-east col:** **180°**, floor **40 m**.
- **North-west col:** **328°**, floor **24 m**. This is only 2 m above the sun's saddle (22 m). The saddle stays the lowest col, but only just. Raise this one before anyone looks at C for long.

The glacier's notch reads as a sixth gap. Within each massif the crest is rounded. The massif faces are convex shoulders, with a few cliff bands where the face passes 46° and scree (18 m) at the foot. The far rings are 0.6× and 0.7× of the smoothed elevation, so through the gaps they read as a second, lower line of the same form.

What C does to the things hung on the wall:

- **Galleries:** a face reaches 68 m and 150 m everywhere at 268–296°, and 245 m on 276–296°. This is their best home of the three.
- **Vigilant:** 287 m high at r 481.
- **Hawser:** the anchor sits at r 379.
- **Gradine:** 358 / 388 / 421.
- **Ridge:** 226–302 m.
- **Span:** 98 m (east) and 99 m (west).
- **Annals:** the band is lost over 79°: A's arcs plus 105–120, the east col.

## Every candidate

- **The sun's saddle:** the sun sits in the saddle from spawn, the causeway (−65, 12) and the road's start in all four (sheets `spawn`, `causeway-sun`, `roadstart`). The gate itself is untouched. Its flanks are lower in the candidates because the spline dips toward it (140–180 m against v4's 186+). It is still a steep-sided gate, because the saddle's walls rise over 5°, as in v4.
- **The Thrones' seats:** not moved; the seats and their heights are the same code.
- **The Lamps (300–335°, not built):** the north-west col takes 318–338° of that arc in every candidate. A face remains at 300–318°.

## The sheets

Each sheet sits in `shots/wip/` and shows v4 | A | B | C left to right, at 1280×720 per frame. Open these first:

1. `v5-11-mtn-crest.png`: crest height by bearing for all four profiles, with the cols, the wall-hung things and the Annals' 130 m line marked.
2. `v5-11-mtn-overview-high.png`: the bowl from 70 m above its centre, looking south (the SE col), north-west (the NW col and the Galleries' massif), north (the Tierce, the glacier, the Ridge), east (C's east col) and west (the saddle), plus the Outwash's foreland looking up. These are the views that show the form best. The per-view sheets are `v5-11-mtn-sheet-high-<south|northwest|north|east|west>.png` and `v5-11-mtn-sheet-foreland-up.png`.
3. `v5-11-mtn-overview.png`: the brief's views at the walker's height, one sheet each as `v5-11-mtn-sheet-<view>.png`:
   - `spawn`: (2, 35) looking west at the saddle;
   - `causeway-east`: (−40, 22) looking east;
   - `causeway-north`: (−40, 22) looking north;
   - `causeway-sun`: (−65, 12) looking at the sun;
   - `roadstart`: the road's start;
   - `foreland`: (60, −230) looking north-east;
   - `span`: the Span's deck at (−200, 215), y 56, looking north;
   - `highling`: the High Ling scarp at (250, 5) looking west.

   At the walker's height the keep and the near structures hide much of the walls. `causeway-north`, `span` and `highling` show them best.

The renders show one weakness. At a distance the candidates' faces can read smooth and lumpy, like modelling clay, where v4's were craggy. The texture amplitude was cut as the brief asked. The terrain shader's rock, grass and snow thresholds were tuned for cliffs, so the laid-back faces take mottled snow patches. Any candidate that lands needs a pass on mid-scale rock texture and the shader's slope thresholds.

## What landing it would take

- **A: about 1–1.5 days.**
  - Re-aim the Galleries' bays and booms for a laid-back face (half a day).
  - Retune the terrain shader's slope bands and add mid-scale rock texture (half a day).
  - Check that the Annals' frieze ends cleanly at the two new cols (an hour).
  - Raise the NW col to its intended 60–90 m.
  - Check the Hawser's chain length, the Gradine's flight, the Vigilant's seat and the merlons in renders. All four follow the ground by code, so no code changes are expected.
  - Retune the far ranges' fog tiers if they read too strong through the cols.
- **B: about 2 days.** Everything in A, plus:
  - the regions' edges and the leads against the four toes;
  - vegetation and rock scatter onto the toes;
  - the walk on the toes (`walk-test`) and the regions' tests;
  - a decision on whether the toes should be climbable at all.
- **C: about 2 days.**
  - The shader and texture pass from A.
  - Raise the NW col to about 50 m so the saddle stays plainly the lowest.
  - Through the gaps the far rings stand in the open, so they need more silhouette detail than a ring behind a wall.
  - The Annals lose a third arc.
  - The Galleries need the least re-aiming of the three: their massif's face is the tallest.

## Proof that the default is unchanged

`crestAt` at 36 bearings (every 10°) and `heightAt` at 792 radial samples (36 bearings × r 280–700 every 20 m) match before and after the change, sample for sample. A page probe compared them: `ctx.mountains.crestAt` and `ctx.terrain.heightAt` with no flag, run against the tree before the edit and again after it. The suite below also passes with no flag.
