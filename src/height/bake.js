// The terrain's bake (v13 L3), three-free so it can run in a worker (src/height/bake-worker.js) or, where a worker is
// not to be had, on the page (terrain.js): from the plane's vertices it computes every height and every baked vertex
// attribute, the same numbers either way. terrain.js keeps the mesh, its material and its shader, and makes the
// geometry from these arrays (computeVertexNormals is three's, on the page).
//   planePositions(size, segs) -> Float32Array  the vertices of three's PlaneGeometry(size, size, segs, segs) after
//                                               rotateX(-PI/2), to the bit (three's own arithmetic, in its order)
//   bakeTerrain(P, segs, size) -> { color, aIce, aWet, aWall, aRock, aGlac }  writes each vertex's height into P (y)
// The caller traces the leads (v4/paths/ground.js prepareMap) first, as the bake's heights carry the runnels' cuts.
// The URL switches it reads (?bakeslope=mesh, ?regions=1) are the page's: in the worker, globalThis.FP_PAGE_QUERY
// (set before any import; the worker's own URL has no query, which a service worker would not keep). tools/height-check.mjs (pure) checks it bit for bit.
import { clamp, lerp, smoothstep } from '../noise.js';
import { WORLD, PALETTE } from '../world.js';
import { heightAt, slopeAt, causewayDistance, BAKE_KIT } from './field.js';
import { setRegionsCoarse } from './regions.js';
import { regionsGround, REGIONS_DEBUG } from './ground.js';
import { M_START, PROFILE as MTN_PROFILE, WALL_SAMPLE, faceNoise } from '../v4/mountains.js';
import { ground as placesGround } from '../v8/places.js';
import { glacierFloorIce, glacierCoords } from '../v4/glacier.js';
import { Col } from './color.js';
const { SX, riverSection, cs: _cs, biomeWith, POOL, POOL_R, GULLY_BED, IMPACT } = BAKE_KIT;

const MESH_SLOPE = new URLSearchParams(globalThis.FP_PAGE_QUERY ?? globalThis.location?.search ?? '').get('bakeslope') === 'mesh';
// the attributes the bake makes, with their item sizes (terrain.js sets them in this order)
export const BAKED = [['color', 3], ['aIce', 1], ['aWet', 1], ['aWall', 1], ['aRock', 3], ['aGlac', 3]];

export function planePositions(size, segs) {
  // PlaneGeometry(width, height, widthSegments, heightSegments), as three r170 builds it
  const r = size / 2, s = size / 2, a = Math.floor(segs), o = Math.floor(segs), l = a + 1, c = o + 1, h = size / a, u = size / o;
  const P = new Float32Array(l * c * 3);
  // rotateX(-PI/2): makeRotationX's matrix, then each vertex through Vector3.applyMatrix4 (column-major elements)
  const cs = Math.cos(-Math.PI / 2), sn = Math.sin(-Math.PI / 2);
  const e = [1, 0, 0, 0, 0, cs, sn, 0, 0, -sn, cs, 0, 0, 0, 0, 1];
  let k = 0;
  for (let t = 0; t < c; t++) {
    const ey = t * u - s;
    for (let n = 0; n < l; n++) {
      const x = Math.fround(n * h - r), y = Math.fround(-ey), z = 0; // the Float32BufferAttribute's values, read back
      const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
      P[k++] = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
      P[k++] = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
      P[k++] = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
    }
  }
  return P;
}

const C = (hex) => new Col(hex);

export function bakeTerrain(P, segs, size) {
  const count = P.length / 3;
  const colors = new Float32Array(count * 3);
  const iceArr = new Float32Array(count);
  const glacArr = new Float32Array(count * 3), gc = [0, 0, 0];
  const wetArr = new Float32Array(count);
  const wallArr = new Float32Array(count); // the wall's water (v4/mountains.js drainage): the couloirs and their gullies
  const rockArr = new Float32Array(count * 3); // (v11.1) how much of the colour is the wall's bare rock, its scree (the shader's close detail), and the face's convexity over ~12 m (ribs +, couloirs -)
  const rsec = { ..._cs };
  const cShingle = C('#48443e'), cPale = C('#8a8274'), cSilt = C('#2c2a24');
  const col = new Col();
  // Ground reads olive, peat and moss under the red sun, not rust dust: the dry grass is dun-olive, not tan,
  // and the mountain rock is cool slate so the haze can layer the ridges against each other.
  const cMoor = C('#4a5329'), cDry = C('#6b6a3c'), cHeath = C(PALETTE.heather), cMud = C(PALETTE.mud);
  const cRock = C('#3c3838'), cRockD = C('#1f1c20'), cScree = C('#4a4644'), cIce = C(PALETTE.ice);
  const cWood = C('#2a3220'), cShore = C('#3a3832'), cOrch = C('#544a2c'), cCrys = C('#56727e'), cRoad = C('#5e5650'), cPeat = C('#1c1a16'), cMoss = C('#38542c');
  const tmp = new Col();
  const cFlWet = C('#20361a'), cFlBleak = C('#b0a474'), cFlLing = C('#26141c'), cFlStone = C('#8c8572'), cFlStrand = C('#c8bb9a'); // v16 L4
  const MASSIF_BANDS = MTN_PROFILE !== 'v4', cScreeL = C('#5c5752'), tmp2 = new Col(); // the massifs' bands
  // the wall's rock masses (v11): slate, a rust-brown, a dark basalt, a cold lichen-grey; and the damp of the couloirs
  const cRust = C('#5a4232'), cBasalt = C('#242226'), cLichen = C('#3d453a'), cDamp = C('#141618'), cHard = C('#8a7f70'), cSlate = C('#3e3d44'), cFan = C('#7a736a');
  setRegionsCoarse(size / segs); // v4 regions: the mesh takes fine relief's lower envelope (regions.js)
  // the heights first, so the wall's colour classes can read its slope over 4 cells (below); with them the wall's
  // water and its fans' mouths (v4/mountains.js WALL_SAMPLE, read straight after each heightAt)
  const mouthArr = new Float32Array(count), hardArr = new Float32Array(count), stepArr = new Float32Array(count), nV = segs + 1, cellW = size / segs;
  for (let i = 0; i < count; i++) {
    WALL_SAMPLE.water = 0; WALL_SAMPLE.mouth = 0; WALL_SAMPLE.hard = 0; WALL_SAMPLE.step = 0;
    P[i * 3 + 1] = heightAt(P[i * 3], P[i * 3 + 2]);
    wallArr[i] = WALL_SAMPLE.water; mouthArr[i] = WALL_SAMPLE.mouth; hardArr[i] = WALL_SAMPLE.hard; stepArr[i] = WALL_SAMPLE.step;
  }
  const Y = (k) => P[k * 3 + 1];
  // the wall's slope from the mesh over ±2 cells (4-6 m): biomeAt's reads a 0.6 m step, so on a face near the scree's
  // angle the colour classes flipped from vertex to vertex in the pattern of the finest noise, stretched up the face
  // (the herringbone fur on the faces)
  const slopeW = (i) => {
    const ci = i % nV, cj = (i - ci) / nV;
    const i0 = Math.max(0, ci - 2), i1 = Math.min(segs, ci + 2), j0 = Math.max(0, cj - 2), j1 = Math.min(segs, cj + 2);
    const gx = (Y(cj * nV + i1) - Y(cj * nV + i0)) / ((i1 - i0) * cellW);
    const gz = (Y(j1 * nV + ci) - Y(j0 * nV + ci)) / ((j1 - j0) * cellW);
    return Math.atan(Math.hypot(gx, gz));
  };
  // ?bakeslope=mesh (v13 L2, a trial, off): the biome's slope from the mesh's own heights a cell either side, as
  // slopeAt's normal is from 0.6 m either side, so the bake makes no heightAt of its own for it. It is not the same
  // slope (a 2-3 m baseline smooths what 0.6 m sees), so the colours move: the orchestrator's call, not a default.
  const slopeMesh = (i) => {
    const ci = i % nV, cj = (i - ci) / nV;
    const i0 = Math.max(0, ci - 1), i1 = Math.min(segs, ci + 1), j0 = Math.max(0, cj - 1), j1 = Math.min(segs, cj + 1);
    const gx = (Y(cj * nV + i0) - Y(cj * nV + i1)) / ((i1 - i0) * cellW), gz = (Y(j0 * nV + ci) - Y(j1 * nV + ci)) / ((j1 - j0) * cellW);
    return Math.acos(clamp(1 / Math.sqrt(gx * gx + 1 + gz * gz), -1, 1));
  };
  for (let i = 0; i < count; i++) {
    const x = P[i * 3], z = P[i * 3 + 2];
    const y = P[i * 3 + 1];
    const wWater = wallArr[i], wMouth = mouthArr[i];
    // the biome's slope (four heightAt at 0.6 m) feeds its rock, the ice's hold and the shingle; on the wall the rock is
    // read from the mesh instead (sW, below), so where that rock is whole (it covers the moor's colours) and there is
    // no ice or shingle, the biome takes slope 0 and nothing baked changes
    const r = riverSection(x, z, rsec);
    const rW = Math.hypot(x, z), mmW = MASSIF_BANDS ? smoothstep(300, 334, rW) : 0, sW = mmW > 0 ? slopeW(i) : 0;
    const wallRock = clamp(smoothstep(0.55, 0.95, sW) + smoothstep(WORLD.regionRadius, WORLD.regionRadius + 60, rW) * 0.6, 0, 1);
    let b = mmW === 1 && wallRock === 1 && !(r.shingle > 0) ? biomeWith(x, z, y, 0, r) : null;
    if (!b || b.ice > 0) b = biomeWith(x, z, y, MESH_SLOPE ? slopeMesh(i) : slopeAt(x, z), r);
    // base: moor grass to dry grass by noise, heather patches
    const dry = SX.warped2(x * 0.01 + 3, z * 0.01 + 1, 3) * 0.5 + 0.5;
    col.copy(cMoor).lerp(cDry, dry);
    col.lerp(cHeath, b.heath * 0.55 * b.moor);
    // peat hags and moss cushions break up the moor
    const peat = smoothstep(0.35, 0.6, SX.warped2(x * 0.02 + 70, z * 0.02 + 33, 3));
    col.lerp(cPeat, peat * 0.7 * b.moor);
    const mossLow = smoothstep(2, -2, y); // (0 at y 2 and above: the lerp by +0 leaves the colour, so no noise)
    if (mossLow !== 0) col.lerp(cMoss, smoothstep(0.3, 0.55, SX.warped2(x * 0.05 - 40, z * 0.05 + 12, 3)) * mossLow * 0.5);
    // v16 L4: the floor's character (src/height/floor.js floorCharacter): the strand's shingle, the crests bleached,
    // the lees dark with ling, the high north-east stony, the low ground and the hollows wet and green
    if (b.wet > 0 || b.bleak > 0 || b.lee > 0 || b.stone > 0 || b.strand > 0) {
      col.lerp(cFlStone, b.stone * 0.75).lerp(cFlBleak, b.bleak * 0.85).lerp(cFlLing, b.lee * 0.85);
      col.lerp(cFlWet, b.wet * 0.85).lerp(cFlStrand, b.strand * 0.95);
    }
    col.lerp(cWood, b.wood * 0.8);
    col.lerp(cOrch, b.orchard * 0.5);
    col.lerp(cMud, b.marsh * 0.85);
    col.lerp(cShore, b.shore * 0.8);
    col.lerp(cCrys, b.crystal * 0.5);
    // slope → rock; height → scree then dark rock (on the massifs' wall, by the slope over 4 cells)
    const rockMix = lerp(clamp(b.rock, 0, 1), wallRock, mmW);
    tmp.copy(cScree).lerp(cRock, smoothstep(10, 60, y)).lerp(cRockD, smoothstep(60, 160, y));
    // --- the massifs' bands (begin): on the walls (not ?mountains=v4) the colour goes by what the rock is and where
    // water runs, not by height, in three values a face: dark (the couloirs, damp; the basalt; the crags' risers),
    // middle (slate and rust masses, two or three to a massif, tilted so they lie across the face like beds) and
    // pale (the hard beds outcropping in pieces, the scree of the aprons and the fans at the couloirs' mouths)
    if (MASSIF_BANDS) {
      const mm = mmW;
      if (mm > 0) {
        // (in the face's chart, tilted along the massif's beds: xz noise hangs in vertical smears on a steep face)
        const azW = Math.atan2(z, x), yb = y + 0.07 * x - 0.05 * z;
        const mass = faceNoise(azW, yb, 0.0035, 0.007, 11.3, 4.2, 3), mass2 = faceNoise(azW, yb, 0.008, 0.012, 31, 17, 3);
        tmp2.copy(cSlate).lerp(cRust, smoothstep(0.0, 0.3, mass)).lerp(cBasalt, smoothstep(0.12, 0.4, -mass) * 0.85).lerp(cLichen, smoothstep(0.2, 0.55, mass2) * 0.4);
        tmp2.lerp(cHard, hardArr[i] * 0.85).multiplyScalar(1 - 0.45 * stepArr[i]);
        tmp2.lerp(cDamp, Math.min(1, wWater * 1.2) * 0.85).lerp(cLichen, wWater * smoothstep(0.2, 0.6, mass2 + 0.3) * 0.2);
        // (scree lies at the foot, on the aprons and the fans; the high shoulders' gentler ground is the rock masses'
        // own colour, frost-broken, not the aprons' pale: M4, the upper faces read pale and plain)
        const scree = (1 - smoothstep(0.62, 0.86, sW - 0.12 * wMouth)) * (1 - smoothstep(70, 140, y) * (1 - wMouth));
        tmp2.lerp(cScreeL, scree).lerp(cFan, scree * Math.min(1, wMouth * 1.5) * 0.8);
        tmp.lerp(tmp2, mm);
        const rf = mm * clamp(rockMix, 0, 1);
        rockArr[i * 3] = rf * (1 - scree); rockArr[i * 3 + 1] = rf * scree;
      }
    }
    // --- the massifs' bands (end)
    col.lerp(tmp, rockMix);
    // ice lies on the glacier floor, not plastered up the notch's cliff walls
    const ice = glacierFloorIce(b.ice, b.slope, x, z); // v4 regions: ice holds on the snout's face too
    col.lerp(cIce, ice);
    iceArr[i] = ice;
    if (ice > 0) { rockArr[i * 3] *= 1 - ice; rockArr[i * 3 + 1] *= 1 - ice; }
    if (ice > 0) { glacierCoords(x, z, gc); glacArr[i * 3] = gc[0]; glacArr[i * 3 + 1] = gc[1]; glacArr[i * 3 + 2] = gc[2]; }
    // the river: shingle banks and bed, pale stones in the pool, a wet band along the water and spray-soaked
    // rock round the fall
    {
      let wet = 0;
      if (r.cut < Infinity || r.gully) {
        const prp = Math.hypot(x - POOL.x, z - POOL.z);
        const lvl = r.gully ? GULLY_BED(r.gs) + 0.25 : prp < 8 ? POOL.y : r.W;
        const above = y - lvl;
        const near = r.gully ? 1 : prp < 9 ? 1 : 1 - smoothstep(r.bank + 1, r.bank + 4, Math.abs(r.d));
        wet = (1 - smoothstep(0.05, 1.3 + SX.noise2(x * 0.3, z * 0.3) * 0.5, above)) * near;
        const sh = r.shingle * (1 - smoothstep(0.6, 0.95, b.slope));
        col.lerp(cShingle, sh * 0.85);
        col.lerp(cSilt, r.slow * 0.5);
        if (prp < POOL_R + 0.6) col.lerp(cPale, (1 - smoothstep(POOL_R - 1.5, POOL_R + 0.6, prp)) * (0.6 + 0.4 * SX.noise2(x * 1.3, z * 1.3)));
      }
      // spray from the fall soaks the cirque walls
      const spray = 1 - smoothstep(5, 19, Math.hypot(x - IMPACT.x, z - IMPACT.z, (y - POOL.y) * 0.5));
      wetArr[i] = b.wet > 0 ? Math.max(wet, spray, b.wet * 0.5) : Math.max(wet, spray); // v16 L4: the floor's wet ground darkens and takes a sheen
    }
    // causeway paving colour
    const cd = causewayDistance(x, z);
    col.lerp(cRoad, 1 - smoothstep(2.6, 4.2, cd));
    regionsGround(col, x, z, b); // v4 systems: the regions' ground hooks (and the ?regions=1 tint)
    if (!REGIONS_DEBUG) placesGround(col, x, z, cd); // v8-02
    // a little per-vertex variation so the moor isn't flat
    const v = SX.noise2(x * 0.11, z * 0.11) * 0.06 * (1 - 0.85 * mmW); // (on the wall the shader's grain does this)
    col.r = clamp(col.r + v, 0, 1); col.g = clamp(col.g + v, 0, 1); col.b = clamp(col.b + v, 0, 1);
    colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
  }
  setRegionsCoarse(0);
  // Crevices and ridges on the mountains: grid curvature darkens gullies and lifts crests, so the wall
  // reads as folded rock from a distance instead of a smooth dune.
  {
    const n = segs + 1, cell = size / segs;
    for (let j = 1; j < segs; j++) for (let i = 1; i < segs; i++) {
      const k = j * n + i;
      const x = P[k * 3], z = P[k * 3 + 2];
      const r = Math.hypot(x, z);
      const m = smoothstep(WORLD.regionRadius - 20, WORLD.regionRadius + 40, r) * (1 - iceArr[k]);
      if (m <= 0) continue;
      const lap = (Y(k - 1) + Y(k + 1) + Y(k - n) + Y(k + n) - 4 * Y(k)) / (cell * cell);
      // lap > 0: concave (gully), < 0: convex (crest)
      const crev = clamp(lap * 1.6, -0.6, 1);
      let f = crev > 0 ? 1 - 0.72 * crev * m : 1 - crev * 0.45 * m;
      // the massifs' wall (v11): the one-cell curvature outlined every crease the mesh holds (it drew the old ledges
      // as ruled lines); on the wall the curvature is read over ~4 cells, so it shades gullies and ribs, gently
      const mw = MASSIF_BANDS ? smoothstep(M_START + 10, M_START + 40, r) : 0;
      if (mw > 0 && j > 5 && i > 5 && j < segs - 5 && i < segs - 5) {
        const lap2 = (Y(k - 2) + Y(k + 2) + Y(k - 2 * n) + Y(k + 2 * n) - 4 * Y(k)) / (4 * cell * cell);
        const c2 = clamp(lap2 * 2.2, -0.6, 1);
        // and over ~12 m, the couloirs dark and the ribs between them light: the cold side's light is mostly the
        // sky's, which the normals barely vary, so the drainage has to show in the colour
        const lap6 = (Y(k - 6) + Y(k + 6) + Y(k - 6 * n) + Y(k + 6 * n) - 4 * Y(k)) / (36 * cell * cell);
        const c6 = clamp(lap6 * 8, -0.8, 1);
        rockArr[k * 3 + 2] = clamp(-(lap6 * 8 + lap2 * 1.5), -1, 1);
        const fw = (c2 > 0 ? 1 - 0.3 * c2 : 1 - c2 * 0.25) * (c6 > 0 ? 1 - 0.5 * c6 : 1 - c6 * 0.5);
        f = lerp(f, 1 - (1 - fw) * m, mw);
      }
      colors[k * 3] *= f; colors[k * 3 + 1] *= f; colors[k * 3 + 2] *= f;
    }
  }
  return { color: colors, aIce: iceArr, aWet: wetArr, aWall: wallArr, aRock: rockArr, aGlac: glacArr };
}
