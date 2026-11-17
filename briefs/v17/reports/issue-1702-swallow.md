# v17 U1, the Swallow: report

Branch `issue-1702-swallow`. It merges `issue-1701-brook` (W1's plan, cut and mere, through f3f1296) and U2's plan commit 73543e7 (`GARTH_DOOR`).

## What is built

- `src/v17/swallow.js` (module `swallow`, marked mesh, `?swallow=0`), `src/v17/swallow/`: `line.js` (one centreline, a polyline with rounded corners), `water.js` (water seen from inside a tube), `parts.js` (the conduit, the tube, the planks, lenses, weed, silt, bubbles), `head.js` (portal, fall, head, quay, pool surface, ground cut).
- The portal is a pale dressed face at z 311: a 12 m round arch, voussoirs, the hexagon and roundels, and the sun over the keystone with its gold gone. The water runs over the sill and falls 2.4 m into the head (a drowned hall), with a moving sheet and spray. A quay with steps leads from the shore onto the ledge. The tube's broken lip lies on the ledge, with a lens in the arch so it reads from the north shore.
- The tube goes down a plank stair in the head as the pool closes over the glass. It then runs about 50 m of drowned, coursed conduit to U2's door, on the door's own axis. The visitor sees caustics, bubbles, streaming silt, waving weed, and the pool's underside near the head.
- One held stacked floor (`swallow`) and the quay's floor (`swallow-quay`, plus a replacing ground under it). The ascent is `swallow`. There are two volumes: the conduit, sealed from s 17, and the head, never sealed. Four lens lamps.
- `plan.js` U1 rows (`SWALLOW`, `AQUEDUCT`; U2 owns `GARTH_DOOR`).
- `claims.js` has two rows covering the quay and the head (N1's file): the ground there is opened.
- Docs: `modules.md` row; `runtime.md` v17 section.
- Story beats 2–4 are marked built.

## Tests

| Test | Result |
|---|---|
| `ONLY=edges,geometry,heights,walk tools/suite.sh 8162` | walk 13 PASS; edges 214 PASS (under-geometry with `swallow-(stone\|wood)` added); heights 205 PASS (ascent `swallow` walked and stepped off three times) |
| geometry | 135 PASS, 2 FAIL (see below) |
| seams (earlier run) | FAIL ceiling, ghost 230 against 226 (see below) |
| `tools/swallow-walk.mjs` | PASS at medium (106 frames there and back) and at low (107 frames) |
| `height-speed` heightAt valley | 0.974 and 1.052 (noisy; U1 adds no height term) |

The geometry failures:

- **`v17-swallow`:** 44 coplanar faults in `water-v17-still` and 5 buried pebbles on the cut's banks. Both are W1's. Mine: 3 backs, 2 rays each, still open.
- **`span-east-stairs`:** a buried stone at (229, 166).

The seams failure is in the village box, x 10..160. The span-east-stairs failure is outside `BOX`. Neither is in this module's ground; compare them on `origin/next`.

Draw calls on low (views.mjs): the tube has 135–174 against the Wellward Way's Line at 184–187.

## Frames (`shots/wip/`)

- `v17-U1-r4-*` and `v17-U1-r4-sheet.png`: the fixed views and six inside views.
- `v17-U1-r3-walk-medium-NNN`, `v17-U1-r3-walk-low-NNN`: the walk frames.
- `v17-U1-r4-cost-*`: the draw-call views.

## Blind readers (sonnet)

- **Round 0:** no water named.
- **Round 1:** "a flooded aqueduct … pass under the waterline … a long underwater tube".
- **Low there and back:** "a flooded, green-lit tunnel". It flagged the pool's underside as a hard slab and the head as too dark on the way back; both are now dimmed or lit. Not re-read after that fix.

## Still weak

- The pool's underside edges near the head.
- The head is dark at low.
- The tube end is open until U2's hall is merged.
- The roar is A1's.

`?pos=-95,297&yaw=3.14` on 8123, then walk south.
