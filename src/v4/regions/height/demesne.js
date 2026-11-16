// The Demesne's height hook and what it reads (v13 L2: apart from v4/regions/demesne.js, so the heightfield imports no three
// and can be loaded in a worker). The region's module imports these back and re-exports height as its hook.
import { LANDMARKS, CAUSEWAY_V4 } from '../../../world.js';
import { crossingDistance } from '../../../v8/roads/crossings.js'; // v8-01
import { makeSimplex, smoothstep, lerp, clamp, hyp } from '../../../noise.js';
import { LEVEL, RISERS, APRON, SINK, Dof, villageAmt, benchAmt, footAmt, stepsY, stepsYCoarse, cutAt } from '../../../v15/plan.js'; // v15: the Lappet's terraces

export const N = makeSimplex(20261107 + 1010);
export const K = LANDMARKS.castle; // (40, 30)
export const HAHA = 77, FROM = 300, TO = 120, WALL_R = HAHA + 0.22; // the sunk wall; its ditch and the ramp back up run out to the region's edge at r 85
// the lower lawn's level by compass bearing from the keep (eased from the hill's own fall between r 70 and 85)
export const LAWN = [[300, 8.2], [330, 4.2], [0, 3.6], [30, 3.6], [45, 2.4], [60, 1.6], [90, 2.4], [120, 1.8]];
function lawnOld(b) {
  const u = b >= FROM ? b - 360 : b; // -60 .. 120
  for (let i = 0; i < LAWN.length - 1; i++) {
    const u0 = LAWN[i][0] >= FROM ? LAWN[i][0] - 360 : LAWN[i][0], u1 = LAWN[i + 1][0] >= FROM ? LAWN[i + 1][0] - 360 : LAWN[i + 1][0];
    if (u <= u1) return lerp(LAWN[i][1], LAWN[i + 1][1], clamp((u - u0) / (u1 - u0), 0, 1));
  }
  return LAWN[LAWN.length - 1][1];
}
// v15: under the Lappet the bench is one level (the Lees, 3.1), eased into the lawn's own at each end
export function lawnAt(b) { const a = benchAmt(b), L = lawnOld(b); return a > 0 ? lerp(L, LEVEL.bench.y, a) : L; }
export const bearingOf = (x, z) => ((Math.atan2(x - K.x, -(z - K.z)) * 180) / Math.PI + 360) % 360;
// how much ha-ha there is at a bearing: it runs out over the last 12 degrees at each end
export function hahaAmt(b) {
  const u = b >= FROM ? b - 360 : b;
  return smoothstep(-60, -48, u) * (1 - smoothstep(108, 120, u));
}
// the causeway's v4 bank across the ditch
export function roadD(x, z) {
  let d = Infinity;
  for (let i = 12; i < 19; i++) {
    const a = CAUSEWAY_V4[i], c = CAUSEWAY_V4[i + 1], ex = c.x - a.x, ez = c.z - a.z, l2 = ex * ex + ez * ez;
    let t = ((x - a.x) * ex + (z - a.z) * ez) / l2; t = clamp(t, 0, 1);
    d = Math.min(d, Math.hypot(x - a.x - ex * t, z - a.z - ez * t));
  }
  return Math.min(d, crossingDistance(x, z)); // v8-01: the ways' banks across the ditch (src/v8/roads/crossings.js)
}
// the parterre: a grid of beds north of the keep on the lower lawn, with a round bed in the middle; returns the
// distance (m) to the nearest bed's outline, Infinity off it
export const PART = { x0: 24, x1: 56, z0: -44, z1: -32 };
export function parterreD(x, z) {
  if (x < PART.x0 - 2 || x > PART.x1 + 2 || z < PART.z0 - 2 || z > PART.z1 + 2) return Infinity;
  const cx = (PART.x0 + PART.x1) / 2, cz = (PART.z0 + PART.z1) / 2;
  // the round bed and the walk round it
  const rc = Math.hypot(x - cx, z - cz);
  let d = Math.min(Math.abs(rc - 4.2), Math.abs(rc - 1.6));
  if (rc < 6.5) return d;
  // two rows of four beds, 7.5 x 5.5, paths 2 m
  const bw = (PART.x1 - PART.x0 - 3 * 2) / 4, bh = (PART.z1 - PART.z0 - 2) / 2;
  for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) {
    const bx0 = PART.x0 + i * (bw + 2), bz0 = PART.z0 + j * (bh + 2);
    const qx = Math.max(bx0 - x, 0, x - bx0 - bw), qz = Math.max(bz0 - z, 0, z - bz0 - bh);
    const outside = Math.hypot(qx, qz), inside = Math.min(x - bx0, bx0 + bw - x, z - bz0, bz0 + bh - z);
    d = Math.min(d, outside > 0 ? outside : inside);
    // a diagonal knot in each bed
    if (outside === 0) { const u = (x - bx0) / bw - 0.5, v = (z - bz0) / bh - 0.5; d = Math.min(d, Math.abs(Math.abs(u) - Math.abs(v)) * Math.min(bw, bh) * 0.7); }
  }
  return d;
}

// ---------------------------------------------------------------- relief
// r from the keep: the lower lawn eased level, the ha-ha (the lawn's edge, a 2 m drop to the ditch floor, a long
// ramp back to the field), and the parterre's ridges. The coarse pass takes the lowest of the profile across a
// mesh cell, so the terrain sits under the skin at the drop.
export function hahaProfile(r, b, hNat, x, z) {
  const L = lawnAt(b), ang = hahaAmt(b), amt = ang * smoothstep(4, 7, roadD(x, z));
  const lawn = lerp(hNat, L, smoothstep(58, 68, r) * (1 - smoothstep(HAHA + 0.2, HAHA + 0.6, r)) * ang);
  if (r <= HAHA) return lawn;
  const floor = Math.min(L - 2.1, hNat - 1.0), fa = footAmt(x, z, r, b);
  let out = r < HAHA + 9 ? lerp(floor, hNat, smoothstep(HAHA + 2.2, HAHA + 9, r)) : hNat;
  if (fa > 0) out = lerp(out, LEVEL.foot.y, fa); // v15: the Pennyworth, level under the lowest riser (no ditch)
  // the drop happens at the wall's face (WALL_R), across 10 cm: the skin draws it there (snapped to the line), the wall faces it
  const k = smoothstep(WALL_R - 0.05, WALL_R + 0.05, r);
  return lerp(lawn, lerp(lawn, out, k), amt);
}
// v15, the Lappet (src/v15/plan.js): where the village is, the scarp is cut into the Elder stair's treads (the crown's
// rim levelled, three treads, the bench), each riser's drop taken just behind its face and, under the mesh's coarse
// pass, its lower envelope; the terrain lies SINK under the built treads. Past the ha-ha the foot is levelled (above).
const V_BOX = [40, 122, -62, 36], RIM = RISERS[0].D, LOW = RISERS[3].D;
function village(y, h, x, z, r, coarse) {
  if (r >= HAHA) return y;
  const D = Dof(x, z);
  if (D < RIM - APRON - 6) return y;
  if (D >= LOW) return y; // the bench: lawnAt has it
  const A = villageAmt(x, z);
  if (A <= 0) return y;
  let v;
  if (D < RIM - APRON) v = lerp(h, LEVEL.crown.y, smoothstep(RIM - APRON - 6, RIM - APRON, D));
  else v = (coarse ? stepsYCoarse(D, coarse) : stepsY(D)) - SINK * smoothstep(0.9, 1, A);
  // a stair's slot or an undercroft, cut down into a tread (the plan's CUTS)
  if (D > -1) { const c = cutAt(x, z, coarse ? coarse * 1.45 : 0); if (c !== null && c < v) v = c; }
  return lerp(y, v, A);
}
export function height(h, x, z, w, coarse) {
  const dx = x - K.x, dz = z - K.z, r = Math.sqrt(dx * dx + dz * dz);
  const inV = x > V_BOX[0] && x < V_BOX[1] && z > V_BOX[2] && z < V_BOX[3] && r > 30;
  if (r > HAHA + 10 && !(inV && r < HAHA + 21)) return h;
  if (r < 54) return inV ? village(h, h, x, z, r, coarse) : h;
  const b = bearingOf(x, z);
  if (r > HAHA + 10) { const fa = footAmt(x, z, r, b); return fa > 0 ? lerp(h, LEVEL.foot.y, fa) : h; }
  let y;
  if (coarse && r > HAHA - 3 && r < HAHA + 3.5) {
    const c = coarse * 1.25;
    y = Math.min(hahaProfile(r - c, b, h, x, z), hahaProfile(r, b, h, x, z), hahaProfile(r + c, b, h, x, z));
  } else y = hahaProfile(r, b, h, x, z);
  { const cw = 1 - smoothstep(3, 6.5, crossingDistance(x, z)); if (cw > 0) y = lerp(y, lerp(lerp(h, lawnAt(b), smoothstep(58, 68, r) * hahaAmt(b)), h, smoothstep(HAHA - 3, HAHA + 9.5, r)), cw); } // v8-01: the ways' banks across the ditch, a ramp from the lawn to the field
  // parterre ridges (on the lawn; the coarse mesh can carry ridges this broad)
  const pd = parterreD(x, z);
  if (pd < 2) y += 0.36 * (1 - smoothstep(0.2, 1.5, pd)) * (0.85 + 0.15 * N.noise2(x * 0.3, z * 0.3));
  // everything fades with the ha-ha at the annulus's two ends, so the region's own (soft) weight is not needed
  void w;
  if (inV) {
    // the bench, level from the Low Rung's riser to the ha-ha (the lawn's own easing begins at r 58), then the steps
    if (r < HAHA) { const A = villageAmt(x, z); if (A > 0 && Dof(x, z) >= LOW) y = lerp(y, lawnAt(b), A); }
    // the Pomegranate House's corner lamps hang over the bench here: the ground is worn a hand lower under it (house-test: a lamp 1.9 m up)
    if (x > 78.5 && x < 86.5 && z < -28.5 && z > -36) { // the lamps' brackets are set from the ground at the house's wall (82, -32 is its corner): the ground a step out from it is no higher
      const d = Math.max(z + 32, 82 - x);
      y -= 0.36 * smoothstep(0.05, 0.8, d) * (1 - smoothstep(1.8, 3.2, d)) * (1 - smoothstep(84.6, 86.4, x)) * smoothstep(-35.9, -34.4, z);
    }
    y = village(y, h, x, z, r, coarse);
  }
  return y;
}
