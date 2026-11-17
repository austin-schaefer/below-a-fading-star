// The valley floor's fall (v16 L1, the owner's #71, #73): the floor is not one plate. The ice once came down out of the
// northern notch and spread over the bowl; when it went, the water ran off south and west to where the tarn and the fen
// still lie. So the north and east stand three to five metres higher than the waters' side, and on that higher ground
// lie the ice's leavings: long whalebacks streamlined toward the notch they came from, two kettles where stranded ice
// melted out, and, lower down, the old strand: a bank a man's height where the tarn once stood higher, running round
// the fall's foot (the Cardinal Stones stand on its lip).
//
// floorLift(x, z) is what heightAt adds after the moor's own noise and the old tilt (src/height/field.js), before any
// landmark's flatten: every absolute level after it (the keep's crown, the tower's hill, the stones' shelf, the court,
// the tarn and the fen) holds where it was, and everything relative (the regions' hooks, the pit, the glacier's
// tongue, the walls) rides on the new ground. The lift is never negative and is exactly 0 at the waters, so nothing
// placed at a fixed height can float on its account (the worst case is burial).
//
// Protected places: floorMask below. A place built at fixed heights (or whose hook lerps to an absolute plane without
// adding floorLift, as the Outwash's does) goes in it: inside, floorLift returns 0 before any noise is read, so the
// ground there is bit for bit what it was; a skirt of 20 to 50 m fades the lift in round it. ?floor=v15 (src/height/params.js)
// turns it all off.
import { makeSimplex, smoothstep } from '../noise.js';
import { WORLD } from '../world.js';
import { HEIGHT_PARAMS } from './params.js';

const OFF = HEIGHT_PARAMS.floor === 'v15';
const SN = makeSimplex(WORLD.seed + 1603);

// the fall: u runs from the waters (south-west) to the high ground (north-east)
const UX = 0.45, UZ = -0.89, U0 = -100, U1 = 230;
const RISE = 4.2; // metres at the top of the fall, give or take the swell's 1.2

// the old strand: a bank of BANK metres across BANK_W metres of u, at u STRAND, wandering STRAND_WOB either way
const STRAND = -22, STRAND_WOB = 13, BANK = 2.0, BANK_W = 4;
const STRAND_REACH = BANK_W + STRAND_WOB * 1.1; // (|noise2| < 1.1: tools/height-check.mjs asserts it)

// the whalebacks: centre, the bearing toward the notch they point at, half-lengths up-ice (stoss) and down-ice (lee),
// half-width, height
const NOTCH = { x: 40, z: -320 };
const BACKS = [
  { x: -80, z: -112, stoss: 55, lee: 100, w: 28, h: 5.2 },
  { x: -180, z: -128, stoss: 45, lee: 80, w: 30, h: 4.8 }, // under the Lynchets: its terraces climb its flank
  { x: -128, z: -176, stoss: 36, lee: 64, w: 22, h: 4.0 },
  { x: 128, z: -186, stoss: 32, lee: 58, w: 22, h: 3.8 }, // (none under Medlar Close: its terraces' wave is read off the height, and a swell packs its steps closer than medium's cells draw)
  { x: 70, z: -128, stoss: 34, lee: 56, w: 21, h: 3.6 },
  { x: -10, z: -60, stoss: 28, lee: 50, w: 16, h: 2.6 },
].map((b) => {
  const dx = NOTCH.x - b.x, dz = NOTCH.z - b.z, l = Math.hypot(dx, dz);
  const R = Math.max(b.stoss, b.lee, b.w);
  return { ...b, ax: dx / l, az: dz / l, x0: b.x - R, x1: b.x + R, z0: b.z - R, z1: b.z + R };
});
// the kettles: a fraction of the lift taken out, so a kettle is never under the old ground
const KETTLES = [
  { x: -18, z: -98, r: 21, k: 0.8 },
  { x: -128, z: -88, r: 15, k: 0.7 },
].map((k) => ({ ...k, r2: k.r * k.r }));

// The protected places: boxes [x0, x1, z0, z1] and circles [x, z, r], each with the skirt S over which the lift fades
// in outside it and a wander W: the skirt's inner edge is pulled out by up to W metres, by a noise, so no ruled line or
// circle shows on the floor from above (a pull only ever widens the protection: inside the shape it is always 0).
const BOXES = [
  [40, 128, -64, 36, 40, 15], // the Lappet (src/v15/plan.js lappetGround's box)
  [215, 300, -125, 15, 40, 15], // High Ling, the Lonely Staircase, the Croft, the Hypogeum (226, -112, r 12)
  [228, 300, 13, 70, 30, 10], // the Foundered Nave's block and the Noon Road (x 246-296 at z 42)
  [182, 218, 167, 203, 20, 8], // the Pit's block (SITES.pit)
  [195, 235, 248, 290, 20, 8], // the fall's block (SITES.fallLip)
  [-270, -195, 180, 245, 20, 8], // the Span's west block (src/v4/span/plan.js)
  [220, 270, 160, 245, 20, 8], // the Span's east block
];
const CIRCLES = [
  [40, 30, 95, 45, 15], // the keep's hill, the Demesne and its ha-ha, the village (src/v15)
  [-90, 110, 92, 25, 10], // Lees Tarn (L2 redraws its edge; the lift is 0 over all of it)
  [70, 160, 85, 25, 10], // the fen
];
// the river's line, 25 m either side (src/height/field.js RIVER_CTRL, the lip to the fen)
const RIVER = [[214, 266], [208, 258], [203, 247], [193, 242], [181, 243], [169, 237], [161, 226], [151, 217], [139, 214], [128, 207], [116, 199], [104, 192], [90, 182]];
const RIVER_R = 25, RIVER_S = 20, RIVER_BOX = [90 - RIVER_R - RIVER_S, 214 + RIVER_R + RIVER_S, 182 - RIVER_R - RIVER_S, 266 + RIVER_R + RIVER_S];
const R_IN = 260, R_OUT = 300; // the walls' foot: the lift is gone by r 300

function riverDist(x, z) {
  let d2 = Infinity;
  for (let i = 0; i < RIVER.length - 1; i++) {
    const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1], ex = bx - ax, ez = bz - az;
    let t = ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez); t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - ax - ex * t, dz = z - az - ez * t, e = dx * dx + dz * dz;
    if (e < d2) d2 = e;
  }
  return Math.sqrt(d2);
}

// the skirt's factor at d metres outside a shape (d > 0): 0 at the pulled-in edge, 1 by S past it
function skirt(x, z, d, S, W) {
  const n = 0.5 + 0.5 * SN.noise2(x * 0.021 - 5.1, z * 0.021 + 2.3), e = d - W * (n < 0 ? 0 : n > 1 ? 1 : n);
  return e <= 0 ? 0 : smoothstep(0, S, e);
}
// 0 inside a protected place, 1 on open floor
export function floorMask(x, z) {
  const r2 = x * x + z * z;
  if (r2 >= R_OUT * R_OUT) return 0;
  let m = r2 > R_IN * R_IN ? 1 - smoothstep(R_IN, R_OUT, Math.sqrt(r2)) : 1;
  for (let i = 0; i < BOXES.length; i++) {
    const b = BOXES[i], reach = b[4] + b[5];
    const ex = x < b[0] ? b[0] - x : x > b[1] ? x - b[1] : 0, ez = z < b[2] ? b[2] - z : z > b[3] ? z - b[3] : 0;
    if (ex >= reach || ez >= reach) continue;
    const d2 = ex * ex + ez * ez;
    if (d2 >= reach * reach) continue;
    if (d2 === 0) return 0;
    m *= skirt(x, z, Math.sqrt(d2), b[4], b[5]);
    if (m === 0) return 0;
  }
  for (let i = 0; i < CIRCLES.length; i++) {
    const c = CIRCLES[i], dx = x - c[0], dz = z - c[1], R = c[2] + c[3] + c[4], d2 = dx * dx + dz * dz;
    if (d2 >= R * R) continue;
    if (d2 <= c[2] * c[2]) return 0;
    m *= skirt(x, z, Math.sqrt(d2) - c[2], c[3], c[4]);
    if (m === 0) return 0;
  }
  if (x > RIVER_BOX[0] && x < RIVER_BOX[1] && z > RIVER_BOX[2] && z < RIVER_BOX[3]) {
    const d = riverDist(x, z);
    if (d <= RIVER_R) return 0;
    if (d < RIVER_R + RIVER_S) m *= smoothstep(RIVER_R, RIVER_R + RIVER_S, d);
  }
  return m;
}

// the ice's leavings and the strand, in metres, before the mask
function forms(x, z, u) {
  // the fall itself, its height wandering slowly
  const ramp = smoothstep(U0, U1, u);
  // (two long crossed waves, not a noise: heightAt is the hottest call in the walk, and a wave of 500 m reads the same)
  let f = ramp > 0 ? ramp * (RISE + 1.2 * Math.sin(x * 0.0113 + 1.3) * Math.sin(z * 0.0091 - 0.7)) : 0;
  // the old strand's bank
  const su = u - STRAND;
  if (su > STRAND_REACH) f += BANK;
  else if (su > -STRAND_REACH) f += BANK * smoothstep(-BANK_W, BANK_W, su + STRAND_WOB * SN.noise2(x * 0.011 + 3.7, z * 0.011 - 1.3));
  // the whalebacks: a smooth hump, blunt up-ice, drawn out down-ice
  for (let i = 0; i < BACKS.length; i++) {
    const b = BACKS[i];
    if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) continue;
    const dx = x - b.x, dz = z - b.z, along = dx * b.ax + dz * b.az, across = dx * b.az - dz * b.ax;
    const a = along / (along > 0 ? b.stoss : b.lee), c = across / b.w, q = a * a + c * c;
    if (q < 1) { const s = 1 - q; f += b.h * s * s * (1.5 - 0.5 * s); }
  }
  // the kettles take a share of all of it out
  for (let i = 0; i < KETTLES.length; i++) {
    const k = KETTLES[i], dx = x - k.x, dz = z - k.z, d2 = dx * dx + dz * dz;
    if (d2 < k.r2) { const s = 1 - d2 / k.r2; f *= 1 - k.k * s * s * (3 - 2 * s); }
  }
  return f;
}

// what heightAt adds: never negative, 0 at the waters and in every protected place
export function floorLift(x, z) {
  if (OFF) return 0;
  const u = UX * x + UZ * z;
  if (u <= U0) return 0; // the waters' side of the fall (the strand lies higher, past U0 + STRAND_REACH)
  const m = floorMask(x, z);
  if (m === 0) return 0;
  const f = forms(x, z, u);
  return f > 0 ? m * f : 0;
}
