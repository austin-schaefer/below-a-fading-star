// The map structure's heightfield (v4 map): the pit at the causeway's end and the taller Tumbling Water, each in
// its own marked block of the placement plan (SITES.pit.block, SITES.fallLip.block). Pure functions of (x, z), so
// terrain.js can call mapHeight() at the end of heightAt() and everything that samples the ground agrees.
import { SITES, WATER } from '../../world.js';
import { makeSimplex, smoothstep, lerp } from '../../noise.js';
import { runnelCut, leads } from './routes.js';

const SN = makeSimplex(20261108);

// ---------------------------------------------------------------- the pit (name [Proposed])
// "With a fractal, ragged edge that has swallowed the end of the road": a hole r 14 whose rim wanders on every
// scale (octaves of noise round the circle, each half the last), its throat dropping near-sheer to a floor 26 m
// down. The rim's lip, the arc it is lowest on, faces south and south-west toward the fall.
export const PIT = { x: SITES.pit.x, z: SITES.pit.z, r: SITES.pit.r, block: SITES.pit.block, depth: 26, lipBearing: 200 };
const PB = PIT.block;
export const PIT_PAVE = 3.5; // within this of the rim the road's slabs are v4/paths.js's: tilting in, hanging over
// rim radius on compass bearing b (degrees), metres from the pit's centre
export function pitRim(b) {
  const a = (b * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  let r = 0, amp = 2.6, f = 1.1;
  for (let k = 0; k < 6; k++) { r += amp * SN.noise2(c * f + 11.3 * k, s * f - 7.1 * k); amp *= 0.56; f *= 2.05; }
  return PIT.r + r;
}
// the bearing (compass degrees, clockwise from north) of (x, z) from the pit's centre
export const pitBearing = (x, z) => ((Math.atan2(x - PIT.x, -(z - PIT.z)) * 180) / Math.PI + 360) % 360;
// signed distance to the rim (< 0 over the hole)
export function pitEdge(x, z) { return Math.hypot(x - PIT.x, z - PIT.z) - pitRim(pitBearing(x, z)); }
// how far the lip arc reaches: 1 on its middle bearing, 0 beyond 55° off it
function lipW(b) { const d = Math.abs(((b - PIT.lipBearing + 540) % 360) - 180); return 1 - smoothstep(20, 55, d); }

function pitHeight(h, x, z) {
  if (x < PB[0] || x > PB[1] || z < PB[2] || z > PB[3]) return h;
  // fade the whole cut out over the block's last 2 m, so nothing changes at its edges
  const m = smoothstep(PB[0], PB[0] + 2, x) * smoothstep(PB[1], PB[1] - 2, x) * smoothstep(PB[2], PB[2] + 2, z) * smoothstep(PB[3], PB[3] - 2, z);
  const b = pitBearing(x, z), e = Math.hypot(x - PIT.x, z - PIT.z) - pitRim(b), lw = lipW(b);
  let y;
  if (e >= 0) {
    // the ground round the hole has slumped toward it, cracked and settling; most on the lip
    y = h - (0.55 + 1.1 * lw) * Math.exp(-e / (2.2 + 1.5 * lw)) - Math.max(0, SN.noise2(x * 0.7, z * 0.7)) * 0.25 * Math.exp(-e / 1.5);
  } else {
    // the throat: a lip that breaks off over a metre, sheer walls with ledges of harder layers, a rubble floor
    const lip = h - 0.55 - 1.1 * lw, floor = lip - PIT.depth + SN.fbm2(x * 0.15, z * 0.15, 3) * 2.5 + Math.max(0, -e - 6) * 0.25;
    const t = smoothstep(0, 3.2, -e);
    const ledge = Math.sin(-e * 2.1 + SN.noise2(x * 0.3, z * 0.3) * 2) * 0.6 * t * (1 - t);
    y = lerp(lip, floor, Math.pow(t, 0.55)) + ledge * 4;
  }
  return lerp(h, y, m);
}

// ---------------------------------------------------------------- the taller Tumbling Water
// The lip rises from y 23.5 to y 53.5 (terrain.js's FALL_DROP, 50 m); the pool stays at (208, 258), y 3.5. The
// face behind the pool is raised into a slot of cliff, 24 m across, whose top climbs from the lip to 65 m and more
// within 15 m of it, into the 76 m wall the mountains already stand behind it; the ravine above is cut again at
// the new height (terrain.js's GULLY_BED follows LIP_Y). Marked block x 195-235, z 248-290.
const FB = SITES.fallLip.block;
const POOL = WATER.pool;
export const FALL = { lipY: 53.5, poolY: POOL.y, block: FB, lipR: 10.1 };
const _gq = { s: 0, d: 0, hit: false };
function projectLine(L, x, z, out) {
  const { X, Z, S, n } = L;
  let best = Infinity, bi = 0, bt = 0;
  for (let i = 0; i < n - 1; i++) {
    const ax = X[i], az = Z[i], dx = X[i + 1] - ax, dz = Z[i + 1] - az, l2 = dx * dx + dz * dz;
    let t = ((x - ax) * dx + (z - az) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = ax + dx * t - x, ez = az + dz * t - z, e = ex * ex + ez * ez;
    if (e < best) { best = e; bi = i; bt = t; }
  }
  out.s = S[bi] + bt * Math.hypot(X[bi + 1] - X[bi], Z[bi + 1] - Z[bi]);
  out.d = Math.sqrt(best);
  out.end = bi === n - 2 && bt >= 1;
  return out;
}
function fallHeight(h, x, z, RV) {
  if (x < FB[0] || x > FB[1] || z < FB[2] || z > FB[3] || !RV) return h;
  const m = smoothstep(FB[0], FB[0] + 3, x) * smoothstep(FB[1], FB[1] - 3, x) * smoothstep(FB[2], FB[2] + 3, z) * smoothstep(FB[3], FB[3] - 3, z);
  const B = RV.back, px = x - POOL.x, pz = z - POOL.z;
  const along = px * B.x + pz * B.z, across = px * B.z - pz * B.x, rp = Math.hypot(px, pz);
  // the slot: full height within 9 m either side of the lip's line, gone by 14 m
  const side = 1 - smoothstep(9, 14 + SN.noise2(along * 0.12, 3.3) * 2, Math.abs(across));
  const w = m * side * smoothstep(-2, 4, along);
  if (w <= 0) return h;
  // the cliff: its foot just outside the pool's beach, its top at the lip's radius, climbing behind
  const foot = 7.3, top = RV.lipR + 0.4 * Math.abs(across) / 9;
  const crest = FALL.lipY + 0.8 + SN.fbm2(x * 0.08, z * 0.08, 3) * 1.8 + Math.abs(across) * 0.35;
  let y;
  if (rp < foot) return h;
  if (rp < top) y = lerp(POOL.y + 0.6, crest, Math.pow(smoothstep(foot, top, rp), 0.8));
  else y = crest + Math.min((rp - top) * 2.1, 26) + Math.max(0, SN.ridged2(x * 0.09, z * 0.09, 3) - 0.4) * 6 * smoothstep(top, top + 6, rp);
  // ledges of harder rock across the face
  y += Math.sin(y * 0.55 + SN.noise2(x * 0.2, z * 0.2) * 1.5) * 0.5 * smoothstep(foot, top, rp) * (1 - smoothstep(top, top + 2, rp));
  let out = Math.max(h, lerp(h, y, w));
  // the ravine above the lip, cut again at its new height
  const L = RV.gully;
  if (L) {
    const q = projectLine(L, x, z, _gq);
    if (q.d < 14 && !q.end && rp >= top - 0.6) {
      const bed = RV.gullyLevelAt(q.s) - 0.25;
      const c = q.d < 1.7 ? bed - 0.55 * (1 - (q.d / 1.7) ** 2) : bed + (q.d - 1.7) * 1.9 * (1 + SN.noise2(x * 0.15, z * 0.15) * 0.25);
      out = Math.min(out, lerp(out, c, m));
    }
  }
  return out;
}

// terrain.js calls this last in heightAt (one line), with its RIVER (the pool, the lip, the ravine's line)
export function mapHeight(h, x, z, RV) {
  return runnelCut(fallHeight(pitHeight(h, x, z), x, z, RV), x, z);
}
// terrain.js calls this before it lays its mesh: the leads are traced on the uncut ground, then the rivulets' cuts
// are in every heightAt() after
export function prepareMap() { leads(); }
