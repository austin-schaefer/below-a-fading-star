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
