// Ground sampling for placement. Heights and normals come from the rendered terrain mesh itself,
// interpolated over the same triangles the GPU draws, so nothing floats or sinks. Biome weights
// come from a coarse grid of terrain.biomeAt() (it is too slow to call per blade of grass).
import { clamp } from './util.js';
import { spanClear } from '../v4/span/plan.js'; // v4: the Great Span's piers, stairs and fallen pieces
import { wornAt, leadNear } from '../v4/paths/routes.js'; // v4 map: the leads wear the cover off
import { plinthsClear, plinthsPaved } from '../v5/plinths.js'; // v5: the Plinth Road's corridor and paving
import { stillWorn, stillNear } from '../v7/still/clear.js'; // v7: the bare ground round the Sleeper and the Stylite's basket
import { collationClear } from '../v5/dressing/collation.js'; // v5: the Collation's table
import { prospectClear } from '../v5/dressing/prospect.js'; // v5: the Unfinished Prospect's easel
import { naveClear, naveHole } from '../v5/nave/ground.js'; // v5: BD the Foundered Nave's rim and hole
import { sextonClear } from '../v7/workers/graves.js'; // v7: CF the Sexton's graves and heaps
import { stairClear } from '../v12/stair/plan.js'; // v12-H3: the Diffident Stair's slabs in the turf
import { houseClear } from '../v8/house/clear.js'; // v8-05: the Pomegranate House's court and its trampled gate
import { threadsClear } from '../v8/threads/plan.js'; // v8-04: the story threads' props
import { twkClear } from '../v8/twk/plan.js'; // v8-07: the Twk-men's salt
import { COARSE_BOXES } from '../v4/regions.js'; // v4 regions: where a ground skin lies over a lowered mesh
import { coarseLowering } from '../v4/regions/skin.js';
import { onFigure } from '../v4/dressing/figure.js'; // v9 (#16): no tree on the Long Figure
import { MOTHER_FOOT } from './mother.js'; // the Lattice's mother crystal: no tree inside its foot

// Open ground other modules need: the man in the cloak of eyes (fauna/uncanny/cloak.js, first candidate spot)
// stands alone on the moor, so no tree may grow on him. [x, z, radius]
// Where trees and shrubs keep out (ground cover still grows): the cloak man's old stand, the Wayside Shrine, the Menology's spiral.
const CLEARINGS = [[-86, -48, 7], [-108, -128, 9], [-15, 255, 24]];

const BIOME_KEYS = ['moor', 'heath', 'wood', 'marsh', 'shore', 'rock', 'ice', 'orchard', 'crystal', 'glacier'];

export function makeGround(ctx) {
  const { terrain, landmarks: L, water } = ctx;
  const geo = terrain.mesh.geometry;
  const prm = geo.parameters;
  const segs = prm.widthSegments, size = prm.width;
  const step = size / segs, half = size / 2, row = segs + 1;
  const P = geo.attributes.position.array, N = geo.attributes.normal.array;

  // Height on the rendered triangle. PlaneGeometry (rotated -90° about x) puts vertex (ix, iz) at
  // x = ix*step - half, z = iz*step - half, faces (a,b,d) and (b,c,d) with a=(ix,iz) b=(ix,iz+1) c=(ix+1,iz+1) d=(ix+1,iz).
  // v4 regions: where the coarse pass lowered the mesh under a ground skin (a ha-ha's drop, a berm, a dune), a plant
  // stands on the skin (heightAt() + its lift), not buried under it on the mesh (regions/skin.js)
  const lowered = coarseLowering(terrain);
  function inCoarse(x, z) { for (const b of COARSE_BOXES) if (x >= b[0] && x <= b[1] && z >= b[2] && z <= b[3]) return true; return false; }
  function heightAt(x, z) {
    if (COARSE_BOXES.length && inCoarse(x, z) && lowered(x, z) > 0.02) return terrain.heightAt(x, z) + 0.02;
    const gx = clamp((x + half) / step, 0, segs - 1e-4), gz = clamp((z + half) / step, 0, segs - 1e-4);
    const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz;
    const a = (iz * row + ix) * 3 + 1, b = ((iz + 1) * row + ix) * 3 + 1, c = ((iz + 1) * row + ix + 1) * 3 + 1, d = (iz * row + ix + 1) * 3 + 1;
    if (fx + fz <= 1) return P[a] + (P[d] - P[a]) * fx + (P[b] - P[a]) * fz;
    return P[c] + (P[b] - P[c]) * (1 - fx) + (P[d] - P[c]) * (1 - fz);
  }
  // Bilinear vertex normal; writes into out (any {x,y,z}).
  function normalAt(x, z, out) {
    const gx = clamp((x + half) / step, 0, segs - 1e-4), gz = clamp((z + half) / step, 0, segs - 1e-4);
    const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz;
    const i00 = (iz * row + ix) * 3, i10 = i00 + 3, i01 = i00 + row * 3, i11 = i01 + 3;
    const w00 = (1 - fx) * (1 - fz), w10 = fx * (1 - fz), w01 = (1 - fx) * fz, w11 = fx * fz;
    let nx = N[i00] * w00 + N[i10] * w10 + N[i01] * w01 + N[i11] * w11;
    let ny = N[i00 + 1] * w00 + N[i10 + 1] * w10 + N[i01 + 1] * w01 + N[i11 + 1] * w11;
    let nz = N[i00 + 2] * w00 + N[i10 + 2] * w10 + N[i01 + 2] * w01 + N[i11 + 2] * w11;
    const l = Math.hypot(nx, ny, nz) || 1;
    out.x = nx / l; out.y = ny / l; out.z = nz / l;
    return out;
  }
  // The terrain's wet band (river margins, the spray round the fall), bilinear from its aWet attribute.
  const WET = geo.attributes.aWet ? geo.attributes.aWet.array : null;
  function wetAt(x, z) {
    if (!WET) return 0;
    const gx = clamp((x + half) / step, 0, segs - 1e-4), gz = clamp((z + half) / step, 0, segs - 1e-4);
    const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz;
    const i00 = iz * row + ix, i01 = i00 + row;
    return (WET[i00] * (1 - fx) + WET[i00 + 1] * fx) * (1 - fz) + (WET[i01] * (1 - fx) + WET[i01 + 1] * fx) * fz;
  }
  const _n = { x: 0, y: 1, z: 0 };
  const slopeAt = (x, z) => Math.acos(clamp(normalAt(x, z, _n).y, -1, 1));

  // Coarse biome grid over the walkable region.
  const BG = 4, BMIN = -324, BN = Math.ceil(648 / BG) + 1;
  const grid = {};
  for (const k of BIOME_KEYS) grid[k] = new Float32Array(BN * BN);
  for (let j = 0; j < BN; j++) for (let i = 0; i < BN; i++) {
    const x = BMIN + i * BG, z = BMIN + j * BG, k = j * BN + i;
    if (Math.hypot(x, z) > 335) { grid.rock[k] = 1; continue; }
    const b = terrain.biomeAt(x, z);
    grid.moor[k] = b.moor; grid.heath[k] = b.heath; grid.wood[k] = b.wood; grid.marsh[k] = b.marsh;
    grid.shore[k] = b.shore; grid.rock[k] = b.rock; grid.ice[k] = b.ice; grid.orchard[k] = b.orchard;
    grid.crystal[k] = b.crystal; grid.glacier[k] = terrain.glacierMask(x, z);
  }
  // Bilinear biome lookup into a reusable object.
  const biome = {}; for (const k of BIOME_KEYS) biome[k] = 0;
  function biomeAt(x, z, out = biome) {
    const gx = clamp((x - BMIN) / BG, 0, BN - 1.001), gz = clamp((z - BMIN) / BG, 0, BN - 1.001);
    const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz;
    const k00 = iz * BN + ix, k10 = k00 + 1, k01 = k00 + BN, k11 = k01 + 1;
    const w00 = (1 - fx) * (1 - fz), w10 = fx * (1 - fz), w01 = (1 - fx) * fz, w11 = fx * fz;
    for (const k of BIOME_KEYS) { const g = grid[k]; out[k] = g[k00] * w00 + g[k10] * w10 + g[k01] * w01 + g[k11] * w11; }
    return out;
  }

  const waters = Object.values(water);
  // The river and the ravine above the fall are paths with a width, not discs: terrain.waterLevelAt knows them.
  const riverLevel = (x, z) => terrain.waterLevelAt(x, z);
  function waterDepth(x, z, y = heightAt(x, z)) {
    for (const w of waters) if ((x - w.x) ** 2 + (z - w.z) ** 2 < w.r * w.r && (!w.shore || terrain.waterLevelAt(x, z) !== null)) return w.y - y; // v4: a disc with a shore (the tarn) asks where its water is
    const rl = riverLevel(x, z);
    return rl === null ? -Infinity : rl - y;
  }
  // Nearest water body within `extra` metres of its rim: depth (water level - ground) and how far inside the rim.
  const _wn = { dep: 0, rim: 0 };
  function waterNear(x, z, y, extra = 10) {
    for (const w of waters) {
      const d = Math.hypot(x - w.x, z - w.z), wr = w.shore ?? w.r; // v4: the tarn's reeds keep to its old round shore
      if (d < wr + extra) { _wn.dep = w.y - y; _wn.rim = wr - d; return _wn; }
    }
    const r = terrain.riverAt ? terrain.riverAt(x, z) : null;
    if (r && Math.abs(r.d) < r.hw + extra) { _wn.dep = r.y - y; _wn.rim = r.hw - Math.abs(r.d); return _wn; }
    return null;
  }
  const d2 = (x, z, p) => (x - p.x) ** 2 + (z - p.z) ** 2;
  // The shared placement rules from the brief. `margin` widens every keep-out (trees use it).
  // opts.wet: allow shallow water down to that depth (reeds).
  function excluded(x, z, margin = 0, opts = null) {
    if (x * x + z * z > 318 * 318) return true;
    // trees and shrubs (margin >= 0) keep out of the clearings; ground cover still grows there
    if (margin >= 0) for (const c of CLEARINGS) if ((x - c[0]) ** 2 + (z - c[1]) ** 2 < (c[2] + margin) ** 2) return true;
    if (d2(x, z, L.castle) < (31 + margin * 1.6) ** 2) return true; // the keep's hexagon has apothem ~29; trees (margin) stay further out
    if (d2(x, z, L.tower) < (12 + margin) ** 2) return true;
    if (d2(x, z, L.stones) < (10 + margin) ** 2) return true;
    if (d2(x, z, L.byre) < (16 + margin) ** 2) return true;
    if (d2(x, z, L.court) < (20 + margin) ** 2) return true;
    if (spanClear(x, z, margin)) return true; // v4: the Great Span
    if (slopeAt(x, z) > 0.85) return true;
    const y = heightAt(x, z);
    const depth = waterDepth(x, z, y);
    if (depth > (opts && opts.wet ? opts.wet : 0)) return true;
    if (terrain.causewayDistance(x, z) < 4 + margin) return true;
    if (margin >= 0 && wornAt(x, z) > 0.05) return true; // v4 map: nothing woody grows on a lead
    if (margin < 0 && (collationClear(x, z) || prospectClear(x, z))) return true; // v5: ground cover keeps off the Collation and the Prospect (after the draws: cells have their own rng)
    if (margin < 0 && plinthsPaved(x, z)) return true; // v5: ground cover keeps off the Plinth Road's paving (trees: hiddenAt)
    if (margin < 0 && naveHole(x, z)) return true; // v5: ground cover keeps off the Foundered Nave's hole (trees: hiddenAt)
    if (margin < 0 && stairClear(x, z, 0.15)) return true; // v12-H3: nothing grows through the stair's slabs (trees: hiddenAt)
    if (margin < 0 && houseClear(x, z)) return true; // v8-05: the house's court swept, the ground before its gate trampled
    if (margin < 0 && sextonClear(x, z, 0, 1)) return true; // v7: ground cover keeps off the Sexton's graves and heaps (after the draws)
    if (margin < 0 && threadsClear(x, z)) return true; // v8-04: ground cover keeps off the threads' props (after the draws)
    if (margin < 0 && twkClear(x, z)) return true; // v8-07: and off the Twk-men's salt
    return false;
  }

  // v5: the Sunken Court's piers reach 39 m; a tree placed there is kept (so the placement's rng and spacing stay as
  // they were everywhere else) but not drawn and not collided (trees.js)
  // Trees placed here are neither drawn nor collided, but keep their place in the placement rng so that every other tree
  // stays where it is: under the court's piers (39 m), inside the lens mount's fins (17 m; 12 when ?tower=v2) the armillary (LANDMARKS.arcature.r) and the mother crystal's foot (MOTHER_FOOT).
  // v9 (#16): and on the Long Figure, a tree's trunk a crown's reach (6 m) off his chalk, so no crown hangs over him
  const FIG_CROWN = 6;
  const TOWER_HIDE = new URL(location.href).searchParams.get('tower') === 'v2' ? 12 : 17;
  const hiddenAt = (x, z) => d2(x, z, L.court) < 39 * 39 || d2(x, z, L.tower) < TOWER_HIDE * TOWER_HIDE || d2(x, z, L.arcature) < L.arcature.r * L.arcature.r || d2(x, z, L.moraine) < MOTHER_FOOT * MOTHER_FOOT || plinthsClear(x, z) || naveClear(x, z) || stairClear(x, z, 1.5) || onFigure(x, z, FIG_CROWN, terrain);
  return { heightAt, normalAt, slopeAt, wetAt, biomeAt, waterDepth, waterNear, excluded, hiddenAt, causewayDistance: terrain.causewayDistance, wornAt: (x, z) => Math.max(wornAt(x, z), stillWorn(x, z)), leadNear: (x, z) => leadNear(x, z) || stillNear(x, z) }; // v7: the cover (not the trees: excluded() reads the routes' own) is worn off round the Sleeper
}
