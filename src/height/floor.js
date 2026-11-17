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
// tongue, the walls) rides on the new ground. The lift is never negative (the pools' bowls below it are the one place the ground goes under
// the old) and is exactly 0 at the waters, so nothing placed at a fixed height can float on its account (the worst case
// is burial).
//
// Protected places: floorMask below. A place built at fixed heights (or whose hook lerps to an absolute plane without
// adding floorLift, as the Outwash's does) goes in it: inside, floorLift returns 0 before any noise is read, so the
// ground there is bit for bit what it was; a skirt of 20 to 50 m fades the lift in round it. ?floor=v15 (src/height/params.js)
// turns it all off.
//
// v16 L4, what makes the forms read from the heights (4 m is lost in the moor's own relief): floorGround(h, x, z) is
// the line heightAt calls (h + floorLift, then the pools); POOLS are three still waters the fall leaves standing, two in
// the kettles and one ponded behind the old strand's ridge, each on the shared edge (src/height/outline.js) with its
// own level, a bowl cut under it, a bank cut down to it on the high side and a lip raised to hold it on the low side
// (WATER_BODIES in field.js carries them; src/water/pools.js draws them). floorCharacter(x, z) is one seeded field of
// what the ground is like, which the paint (src/height/bake.js), the ground cover (src/vegetation/plants.js) and the
// rocks (src/rocks.js) read: wet (the low west and south, the strand's foot, the pools' margins, the kettles), bleak (the
// whalebacks' crests and the high ground: thin, dry, wind-bleached), lee (the whalebacks' down-ice tails: dark ling),
// stone (the high north-east, paler and stonier toward the Outwash), strand (the old strand's bank, a pale shingle
// line), shore (the pools' own margins). All 0 under ?floor=v15.
import { makeSimplex, smoothstep } from '../noise.js';
import { WORLD } from '../world.js';
import { HEIGHT_PARAMS } from './params.js';
import { radialOutline } from './outline.js';

const OFF = HEIGHT_PARAMS.floor === 'v15';
const SN = makeSimplex(WORLD.seed + 1603);

// the fall: u runs from the waters (south-west) to the high ground (north-east)
const UX = 0.45, UZ = -0.89, U0 = -100, U1 = 230;
const RISE = 4.2; // metres at the top of the fall, give or take the swell's 1.2
// the strand's bank BANK_X higher where nothing protected is within FAR metres (v16 L4: a bolder top to the fall by the
// north-east wall was tried and dropped: that ground is the Bletting's, whose things and tracks rode 8 m up and broke roads-test)
const FAR = 60, BANK_X = 1.0;

// the old strand: a bank of BANK metres across BANK_W metres of u, at u STRAND, wandering STRAND_WOB either way
const STRAND = -22, STRAND_WOB = 13, BANK = 2.0, BANK_W = 4;
const STRAND_REACH = BANK_W + STRAND_WOB * 1.1; // (|noise2| < 1.1: tools/height-check.mjs asserts it)

// the whalebacks: centre, the bearing toward the notch they point at, half-lengths up-ice (stoss) and down-ice (lee),
// half-width, height
const NOTCH = { x: 40, z: -320 };
// a meltwater channel cut through the third whaleback's lee: without it the fall and the whaleback close a dip by the Plinth Road
// (138, -202) 1.9 m deep with no way out (found by tools/outline-test.mjs's flood). [x, z, metres of the lift taken out there],
// from the dip's floor north then west to where the ground is lower than it, over a width of 9 m
const CHAN = [[138, -203, 0], [138, -198, 0.6], [137, -190, 1.8], [136, -181, 2.6], [133, -175, 2.6], [127, -173, 1.5], [121, -173, 0.7], [116, -173, 0]];
const CHAN_W = 9, CHAN_BOX = [100, 154, -214, -158];
function chanCut(x, z) {
  if (x < CHAN_BOX[0] || x > CHAN_BOX[1] || z < CHAN_BOX[2] || z > CHAN_BOX[3]) return 0;
  let best = Infinity, cut = 0;
  for (let i = 0; i < CHAN.length - 1; i++) {
    const a = CHAN[i], b = CHAN[i + 1], ex = b[0] - a[0], ez = b[1] - a[1];
    let t = ((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez); t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - a[0] - ex * t, dz = z - a[1] - ez * t, d = dx * dx + dz * dz;
    if (d < best) { best = d; cut = a[2] + (b[2] - a[2]) * t; }
  }
  return best >= CHAN_W * CHAN_W ? 0 : cut * (1 - smoothstep(3, CHAN_W, Math.sqrt(best)));
}
const BACKS = [
  { x: -80, z: -112, stoss: 55, lee: 100, w: 28, h: 5.2 },
  { x: -128, z: -176, stoss: 36, lee: 64, w: 22, h: 4.0 },
  { x: 128, z: -186, stoss: 32, lee: 58, w: 22, h: 3.8 }, // (none under Medlar Close: its terraces' wave is read off the height, and a swell packs its steps closer than medium's cells draw)
  { x: 70, z: -128, stoss: 34, lee: 56, w: 21, h: 3.6 },
  { x: -10, z: -60, stoss: 28, lee: 50, w: 16, h: 2.6 },
].map((b) => {
  const dx = NOTCH.x - b.x, dz = NOTCH.z - b.z, l = Math.hypot(dx, dz);
  const R = Math.max(b.stoss, b.lee, b.w);
  return { ...b, ax: dx / l, az: dz / l, x0: b.x - R, x1: b.x + R, z0: b.z - R, z1: b.z + R };
});
// the kettles: a fraction of the lift taken out (so the lift never leaves a kettle under the old ground; the pools' bowls, up to 4.6 m, do dig below it), a dish round each pool
const KETTLES = [
  { x: -68, z: -82, r: 30, k: 0.6 },
  { x: -118, z: -104, r: 24, k: 0.5 },
].map((k) => ({ ...k, r2: k.r * k.r }));

// The pools (v16 L4): still water the fall leaves standing on the high ground, seen from the stair's top as glints that
// say which way the ground falls. Each: its edge (radialOutline), its level y (measured on the ground round it with the
// pools left out: tools/outline-test.mjs holds the shore dry and the water in), the bowl's depth D under it.
const POOL_DEFS = [
  { name: 'kettle', x: -68, z: -82, r: 16, seed: 16041, amp: 0.16, K: 6, y: 1.6, D: 1.4,
    lobes: [{ bearing: 200, d: 14, r: 7 }] },
  { name: 'kettle-west', x: -118, z: -104, r: 12, seed: 16042, amp: 0.18, K: 6, y: 5.6, D: 1.1,
    lobes: [{ bearing: 40, d: 10, r: 5 }] },
  { name: 'strand-pond', x: -94, z: -42.5, r: 7, seed: 16043, amp: 0.12, K: 5, y: 5.6, D: 0.8,
    lobes: [{ x: -106, z: -48.5, r: 4.5, to: { x: -82, z: -36.5, r: 4 } }] }, // drawn out along the strand behind its ridge
];
// the bank cut down to the water on the high side (rise a metre out), the lip raised to hold it on the low side
const BANK_SLOPE = 0.45, LIP = 0.3, LIP_W = 2.2, LIP_FALL = 0.32, POOL_REACH = 26;
export const POOLS = POOL_DEFS.map((p) => {
  const o = radialOutline({ x: p.x, z: p.z, r: p.r, seed: p.seed, amp: p.amp, K: p.K, lobes: p.lobes, far: 40 });
  const R = o.rMax + POOL_REACH;
  return { ...p, outline: o, sd: o.sd, rMax: o.rMax, box: [p.x - R, p.x + R, p.z - R, p.z + R], wetBox: [p.x - o.rMax, p.x + o.rMax, p.z - o.rMax, p.z + o.rMax] };
});

// The protected places: boxes [x0, x1, z0, z1] and circles [x, z, r], each with the skirt S over which the lift fades
// in outside it and a wander W: the skirt's inner edge is pulled out by up to W metres, by a noise, so no ruled line or
// circle shows on the floor from above (a pull only ever widens the protection: inside the shape it is always 0).
const BOXES = [
  [40, 128, -64, 36, 40, 15], // the Lappet (src/v15/plan.js lappetGround's box)
  [215, 300, -125, 15, 40, 15], // High Ling, the Lonely Staircase, the Croft, the Hypogeum (226, -112, r 12)
  [215, 300, 13, 70, 30, 10], // the Foundered Nave's block and the Noon Road (x 246-296 at z 42), from High Ling's x 215 (no lifted strip between)
  [182, 218, 167, 203, 20, 8], // the Pit's block (SITES.pit)
  [176, 215, -22, 13, 20, 8], // the heights rig's site (src/v12/heights.js, (210, 0)): its floors' tests want the ground they were made on
  [-232, -156, -154, -74, 25, 8], // the Lynchets (REGIONS.lynchets' polygon): its terraces' wave and walls are read off the height, so they stand on the old ground
  [195, 235, 248, 290, 20, 8], // the fall's block (SITES.fallLip)
  [-270, -195, 180, 245, 20, 8], // the Span's west block (src/v4/span/plan.js)
  [220, 270, 160, 245, 20, 8], // the Span's east block
];
const CIRCLES = [
  [40, 30, 95, 45, 15], // the keep's hill, the Demesne and its ha-ha, the village (src/v15)
  [-90, 110, 92, 25, 10], // Lees Tarn (L2 redraws its edge; the lift is 0 over all of it)
  [70, 160, 85, 25, 10], // the fen
  [-40, -165, 58, 35, 6], // the Sunken Court (LANDMARKS.court): its flatten to an absolute -1 reaches r 60 (0.01 of it past 58)
];
// Lines held at the old ground: [[x, z], ...], radius R, skirt S, wander W. The Wellward Way (src/v14/passage/plan.js,
// the Nave's door to the Pit, the Laid Sun at (223.6, 123)) under the moor; and the old ground's drains where the lift
// would dam a hollow at a protected place's foot (found by a priority flood, v15 against v16: tools/outline-test.mjs
// "floor's hollows"): each runs where the water ran on the old ground, so it still runs there, and from above it is
// a dry channel the meltwater left between the lifted ground.
const LINES = [
  { pts: [[246.7, 58], [246.7, 65.5], [246.0, 72.5], [244.0, 80.0], [241.4, 86.6], [237.6, 93.0], [236.6, 100.0], [232.6, 105.8], [230.0, 112.0], [223.6, 123.0], [216.6, 137.6], [213.4, 145.6], [210.8, 153.2], [206, 167]], R: 14, S: 25, W: 8 }, // the passage
  { pts: [[-46, -150], [-56, -158], [-56, -170], [-52, -178], [-58, -184], [-64, -190], [-72, -194], [-84, -194], [-92, -198], [-104, -198], [-108, -206], [-108, -218], [-118, -220], [-128, -222], [-138, -224], [-142, -232], [-148, -238], [-156, -246]], R: 5, S: 28, W: 10 }, // the court's drain along the north wall's foot, west
  { pts: [[218, 36], [220, 46], [220, 58], [220, 70], [220, 82], [222, 92], [224, 102], [228, 110], [228, 122], [224, 130], [220, 138], [216, 146], [216, 158], [206, 166]], R: 5, S: 25, W: 8 }, // below High Ling and the Nave, south to the Pit
  { pts: [[128, -10], [128, 2], [128, 14], [136, 18], [148, 18], [156, 18], [164, 14], [174, 16], [180, 22], [188, 26], [196, 30], [206, 32], [214, 36]], R: 4, S: 25, W: 8 }, // the Lappet's east foot, east
  { pts: [[140, -46], [150, -44], [162, -44], [174, -44], [184, -42], [184, -30], [194, -28], [192, -18], [188, -10], [184, -2], [184, 6], [188, 14], [194, 20], [196, 30]], R: 4, S: 12, W: 4 }, // the Lappet's north-east foot (a narrow skirt: Medlar Close's terraces and the Collation lie 20 m south)
  { pts: [[230, -130], [230, -144], [242, -144], [250, -148]], R: 4, S: 22, W: 6 }, // High Ling's south foot, to the wall
  { pts: [[-148, -134], [-138, -136], [-132, -142], [-130, -152], [-128, -162], [-128, -174], [-132, -182], [-140, -186], [-144, -194], [-154, -196], [-154, -208], [-166, -208], [-180, -208], [-192, -212], [-204, -222]], R: 4, S: 25, W: 8 }, // the Lynchets' north-east foot, round to the wall
  { pts: [[-118, -156], [-128, -160]], R: 4, S: 20, W: 6 }, // a hollow between two whalebacks, into it
  { pts: [[-170, -166], [-166, -174], [-166, -198], [-168, -208]], R: 4, S: 22, W: 6 }, // the Lynchets' north foot
  { pts: [[-56, -24], [-64, -19], [-76, -20], [-86, -18], [-88, -8], [-86, 2], [-84, 12], [-84, 26]], R: 4, S: 22, W: 6 }, // the keep's west skirt, down to the tarn
].map((L) => {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of L.pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const reach = L.R + L.S + L.W;
  return { ...L, box: [x0 - reach, x1 + reach, z0 - reach, z1 + reach] };
});
function lineDist(L, x, z) {
  const P = L.pts;
  let d2 = Infinity;
  for (let i = 0; i < P.length - 1; i++) {
    const ax = P[i][0], az = P[i][1], ex = P[i + 1][0] - ax, ez = P[i + 1][1] - az;
    let t = ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez); t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - ax - ex * t, dz = z - az - ez * t, e = dx * dx + dz * dz;
    if (e < d2) d2 = e;
  }
  return Math.sqrt(d2);
}
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
  for (let i = 0; i < LINES.length; i++) {
    const L = LINES[i], b = L.box;
    if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) continue;
    const d = lineDist(L, x, z) - L.R;
    if (d <= 0) return 0;
    if (d < L.S + L.W) { m *= skirt(x, z, d, L.S, L.W); if (m === 0) return 0; }
  }
  if (x > RIVER_BOX[0] && x < RIVER_BOX[1] && z > RIVER_BOX[2] && z < RIVER_BOX[3]) {
    const d = riverDist(x, z);
    if (d <= RIVER_R) return 0;
    if (d < RIVER_R + RIVER_S) m *= smoothstep(RIVER_R, RIVER_R + RIVER_S, d);
  }
  return m;
}

// how far (x, z) lies outside every protected place, up to FAR: where the forms may be bolder
function protDist(x, z) {
  let d = R_IN - Math.sqrt(x * x + z * z);
  if (d <= 0) return 0;
  for (let i = 0; i < BOXES.length; i++) {
    const b = BOXES[i];
    const ex = x < b[0] ? b[0] - x : x > b[1] ? x - b[1] : 0, ez = z < b[2] ? b[2] - z : z > b[3] ? z - b[3] : 0;
    if (ex >= d || ez >= d) continue;
    d = Math.min(d, Math.sqrt(ex * ex + ez * ez));
  }
  for (let i = 0; i < CIRCLES.length; i++) {
    const c = CIRCLES[i], e = Math.sqrt((x - c[0]) * (x - c[0]) + (z - c[1]) * (z - c[1])) - c[2];
    if (e < d) d = Math.max(0, e);
  }
  for (let i = 0; i < LINES.length; i++) {
    const L = LINES[i], b = L.box;
    if (x < b[0] - FAR || x > b[1] + FAR || z < b[2] - FAR || z > b[3] + FAR) continue;
    d = Math.min(d, Math.max(0, lineDist(L, x, z) - L.R));
  }
  if (x > RIVER_BOX[0] - FAR && x < RIVER_BOX[1] + FAR && z > RIVER_BOX[2] - FAR && z < RIVER_BOX[3] + FAR) d = Math.min(d, Math.max(0, riverDist(x, z) - RIVER_R));
  return d > FAR ? FAR : d;
}
// 0 within 20 m of a protected place, 1 past FAR
const farFactor = (x, z) => smoothstep(20, FAR, protDist(x, z));

// the ice's leavings and the strand, in metres, before the mask
function forms(x, z, u) {
  // the fall itself, its height wandering slowly
  const ramp = smoothstep(U0, U1, u);
  // (two long crossed waves, not a noise: heightAt is the hottest call in the walk, and a wave of 500 m reads the same)
  let f = ramp > 0 ? ramp * (RISE + 1.2 * Math.sin(x * 0.0113 + 1.3) * Math.sin(z * 0.0091 - 0.7)) : 0;
  // (v16 L4) bolder by the north-east wall's foot and at the strand, where nothing protected is near
  const su = u - STRAND, far = su > -STRAND_REACH ? farFactor(x, z) : 0;
  // the old strand's bank
  const bank = BANK + BANK_X * far;
  if (su > STRAND_REACH) f += bank;
  else if (su > -STRAND_REACH) f += bank * smoothstep(-BANK_W, BANK_W, su + STRAND_WOB * SN.noise2(x * 0.011 + 3.7, z * 0.011 - 1.3));
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
  const c = chanCut(x, z);
  return c > 0 ? (f > c ? f - c : 0) : f;
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

// true within `m` metres of a pool's widest reach (the reeds' stands: src/vegetation/plants.js); false under ?floor=v15
export function nearPool(x, z, m) {
  if (OFF) return false;
  for (let i = 0; i < POOLS.length; i++) { const p = POOLS[i]; if (p.y !== null && x > p.wetBox[0] - m && x < p.wetBox[1] + m && z > p.wetBox[2] - m && z < p.wetBox[3] + m) return true; }
  return false;
}
// the pools' ground: the bowl under the level, the bank cut down to it, the lip raised to hold it (h is the ground
// with the lift; pools lie only where the mask is 1, so a protected place never sees this)
function poolGround(h, x, z) {
  for (let i = 0; i < POOLS.length; i++) {
    const p = POOLS[i], b = p.box;
    if (p.y === null || x < b[0] || x > b[1] || z < b[2] || z > b[3]) continue;
    const sd = p.sd(x, z), W = p.y;
    if (sd > POOL_REACH || floorMask(x, z) === 0) continue; // (a protected place's ground is never touched)
    // the lip: a crest LIP over the water from the shore to LIP_W out, falling at LIP_FALL beyond; inside, it falls fast
    const lo = sd < 0 ? W + LIP + 0.6 * sd : W + LIP - LIP_FALL * (sd > LIP_W ? sd - LIP_W : 0);
    // the bank and the bowl: the shore at the level, rising at BANK_SLOPE out of it; under it a shelf, then the deep
    const hi = sd < 0 ? W - 0.5 * smoothstep(0, -3, sd) - p.D * smoothstep(-1.5, -8, sd) : W + BANK_SLOPE * sd;
    if (h < lo) h = lo;
    if (h > hi) h = hi;
  }
  return h;
}
// what heightAt calls in place of h += floorLift(x, z)
export function floorGround(h, x, z) {
  if (OFF) return h;
  const l = floorLift(x, z);
  if (l > 0) h += l;
  return poolGround(h, x, z);
}

// One seeded field of what the ground is like (the header): each 0..1, all 0 under ?floor=v15 and where the mask is 0
const _fc = { wet: 0, bleak: 0, lee: 0, stone: 0, strand: 0, shore: 0, any: false };
function zero(o) { o.wet = 0; o.bleak = 0; o.lee = 0; o.stone = 0; o.strand = 0; o.shore = 0; o.any = false; return o; }
export function floorCharacter(x, z, out = _fc) {
  if (OFF) return zero(out);
  const m = floorMask(x, z);
  if (m === 0) return zero(out);
  const u = UX * x + UZ * z;
  // a slow patchiness, so no band is ruled
  const n = 0.5 + 0.5 * SN.noise2(x * 0.023 + 11.3, z * 0.023 - 4.1);
  // the low west and south: wetter, greener
  let wet = (1 - smoothstep(-130, 10, u)) * (0.6 + 0.4 * n);
  // the old strand: its face and lip pale shingle, its foot wet
  let strand = 0;
  const su = u - STRAND;
  if (su > -STRAND_REACH - 14 && su < STRAND_REACH + 6) {
    const e = su + STRAND_WOB * SN.noise2(x * 0.011 + 3.7, z * 0.011 - 1.3);
    strand = 1 - smoothstep(3, 9, Math.abs(e - 1));
    wet = Math.max(wet, smoothstep(-16, -7, e) * (1 - smoothstep(-6, -2.5, e)) * (0.55 + 0.35 * n));
  }
  // the whalebacks: crests bleak, the down-ice tails dark with ling
  let bleak = smoothstep(-40, 240, u) * 0.6 * (0.65 + 0.35 * n), lee = 0; // (the whole fall pales toward the top: the plainest cue from the heights which way it goes)
  for (let i = 0; i < BACKS.length; i++) {
    const b = BACKS[i];
    if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) continue;
    const dx = x - b.x, dz = z - b.z, along = dx * b.ax + dz * b.az, across = dx * b.az - dz * b.ax;
    const a = along / (along > 0 ? b.stoss : b.lee), c = across / b.w, q = a * a + c * c;
    if (q >= 1.2) continue;
    const s = 1 - q;
    bleak = Math.max(bleak, smoothstep(0.35, 0.8, s));
    if (along < 0) lee = Math.max(lee, smoothstep(-0.2, 0.15, s) * (1 - smoothstep(0.4, 0.75, s)) * smoothstep(0.1, 0.5, -a));
  }
  // the kettles' dishes and the pools' margins: wet; the pools' own shore
  let shore = 0;
  for (let i = 0; i < KETTLES.length; i++) {
    const k = KETTLES[i], dx = x - k.x, dz = z - k.z, d2 = dx * dx + dz * dz;
    if (d2 < k.r2) wet = Math.max(wet, 0.7 * (1 - d2 / k.r2));
  }
  for (let i = 0; i < POOLS.length; i++) {
    const p = POOLS[i], b = p.box;
    if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) continue;
    const sd = p.sd(x, z);
    wet = Math.max(wet, 1 - smoothstep(1, 12, sd));
    shore = Math.max(shore, (1 - smoothstep(0.5, 4.5 + 2 * n, sd)) * smoothstep(-3, 0, sd));
  }
  // the high north-east: stonier and paler toward the Outwash
  const stone = smoothstep(90, 240, u) * smoothstep(0.3, 0.7, n + 0.25 * SN.noise2(x * 0.09 - 2.2, z * 0.09 + 7.9));
  out.wet = m * wet * (1 - 0.8 * bleak); out.bleak = m * bleak; out.lee = m * lee; out.stone = m * stone * (1 - wet);
  out.strand = m * strand; out.shore = m * shore;
  out.any = true;
  return out;
}
