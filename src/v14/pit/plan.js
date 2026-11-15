// The Pit from the bottom (v14-D2): where everything at the bottom of the Pit is, in world metres. Shared by
// v14/pit.js (draws it, its floors, its act), v4/paths.js (the gap in the rim's colliders and clods at the stair's
// head, the throat's haze) and the tests. The Pit itself is PIT (v4/paths/ground.js): heightAt is untouched.
//
//   the Nadir: the hole in the floor at the Pit's centre, the floor of the world worn through; under it the night
//     that is under the world, its stars, and the wind that comes up out of it
//   the down-reel: a windlass on the floor beside the Nadir, on the side toward the passage, and the sheers over the
//     hole whose sheave its line runs over, down to a crystal lead hanging in the hole's mouth
//   the stair: the old road's own hex slabs, pinned to the wall one over the next and fanned up round it clockwise from
//     the floor on the west side to a landing over the lip on the north-west, beside where the road comes in
//   the passage's mouth (D1's): the wall on bearing 20 at the floor, kept clear for 15 degrees either side
import { PIT, pitRim } from '../../v4/paths/ground.js';

export const C = { x: PIT.x, z: PIT.z };
// compass bearing b (degrees, clockwise from north) to a unit (dx, dz)
export const dirOf = (b) => { const a = (b * Math.PI) / 180; return [Math.sin(a), -Math.cos(a)]; };
export const bearingOf = (x, z) => ((Math.atan2(x - C.x, -(z - C.z)) * 180) / Math.PI + 360) % 360;

// ---------------------------------------------------------------- the Nadir
export const NADIR = { r: 2.5, deep: 2.6, guard: 0.55 }; // the hole's radius (before its ragged edge), its rock throat, the colliders' ring past its edge
// the hole's ragged radius on bearing b
export function nadirR(b) {
  const a = (b * Math.PI) / 180;
  return NADIR.r + 0.35 * Math.sin(a * 3 + 1.3) + 0.22 * Math.sin(a * 7 + 0.4) + 0.12 * Math.sin(a * 13 + 2.2);
}

// ---------------------------------------------------------------- the down-reel and the sheers
export const REEL = { b: 32, r: 5.6 };     // the windlass: bearing and distance from the centre (on the passage's side)
export const SHEERS = { h: 6.2, legs: [92, 212, 332], r: 3.7 }; // the apex over the centre; three legs' bearings, their feet's distance
export const LEAD = { len: 1.7, rest: 0.6 }; // the crystal lead: length; its point at rest this far over the hole's mouth

// ---------------------------------------------------------------- the floor
// The ground the Pit's shape gives (heightAt) is a heap of rubble 5 m high in the middle with a trench round the
// wall's foot: from the passage's mouth a black slope filling the view, 30 degrees and more underfoot. The floor walked
// and drawn is a shallow bowl instead (a replacing walkable: heightAt stands):
// from the wall's foot on every bearing (the ground there, FLOOR.out m in from the rim, or FLOOR.edge where the ground
// there is lower: the trench round the north wall's foot is under the floor) easing down to the Nadir's mouth at y0,
// so the hole is the lowest place on the floor and the wind comes up out of it. Over the hole itself the floor is far
// below (FLOOR.sky): whoever gets in falls into the night under the world (v14/pit.js).
export const FLOOR = { out: 3.4, y0: -32.4, edge: -31.4, sky: -90 };
export function makeFloor(T, N) {
  const wall = new Float32Array(361);
  for (let b = 0; b <= 360; b++) { const [dx, dz] = dirOf(b), r = pitRim(b) - FLOOR.out; wall[b] = Math.max(FLOOR.edge, T.heightAt(C.x + dx * r, C.z + dz * r)); }
  const wallAt = (b) => { const i = Math.floor(b), f = b - i; return wall[i % 360] + (wall[(i + 1) % 360] - wall[i % 360]) * f; };
  const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  // the floor at (x, z) inside the wall's foot, else null (the terrain)
  function y(x, z) {
    const px = x - C.x, pz = z - C.z;
    if (px > 19 || px < -19 || pz > 19 || pz < -19) return null; // asked at every step on the map (a replacing walkable)
    const r = Math.sqrt(px * px + pz * pz);
    if (r > 19) return null;
    const b = ((Math.atan2(px, -pz) * 180) / Math.PI + 360) % 360, rf = pitRim(b) - FLOOR.out;
    // past the bowl's edge, up to the wall's foot: the ground, or the edge's height where the ground is lower, so the
    // old trench under the drawn floor is never walked into out of sight
    if (r > rf) return r > rf + 2.5 ? null : Math.max(T.heightAt(x, z), wallAt(b));
    const rh = nadirR(b);
    if (r < rh - 0.05) return FLOOR.sky; // the hole: nothing under it
    const t = ss(rh + 0.6, rf, r);
    return FLOOR.y0 + (wallAt(b) - FLOOR.y0) * t + (N ? N.noise2(x * 0.45, z * 0.45) * 0.12 * t * (1 - t) * 4 : 0);
  }
  return { y, wallAt, y0: FLOOR.y0 };
}

// ---------------------------------------------------------------- the passage's mouth (D1 ends there)
export const MOUTH = { b: 20, clear: 15 };
export const mouthClear = (b) => Math.abs(((b - MOUTH.b + 540) % 360) - 180) < MOUTH.clear;

// ---------------------------------------------------------------- the stair
export const STAIR = { head: 290, sweep: 330, half: 0.62, gap: 1.35, land: 2.6 };
// the wall's drawn radius on bearing b at height y (searched inward from outside the rim, as v4/paths.js's throat is)
export function wallR(T, b, y) {
  const [dx, dz] = dirOf(b), R = pitRim(b);
  for (let r = R + 3; r > 0.5; r -= 0.1) if (T.heightAt(C.x + dx * r, C.z + dz * r) <= y) return r;
  return 0.5;
}
// The stair's line: the bearing, radius and floor height for s in 0 (the head) .. 1 (the foot), and the landing.
// Built once from the terrain: a table at every degree, the radius kept `gap` metres inside the wall (and the throat's
// rock veneer, at most 1.55 m proud of it) over the treads' whole width, smoothed so the line does not wander.
export function makeStair(T, FL) {
  const floorY = FL.y;
  const S = STAIR, N = S.sweep, B0 = S.head;
  const R0 = pitRim(B0), [hx, hz] = dirOf(B0);
  // the landing: out over the lip from the rim to `land` past it, a step over the highest turf under it
  let g = -Infinity;
  for (let r = R0 - 1; r <= R0 + S.land; r += 0.25) for (const w of [-S.half, 0, S.half]) g = Math.max(g, T.heightAt(C.x + hx * r - hz * w, C.z + hz * r + hx * w));
  const yHead = g + 0.3;
  const footB = (B0 + N) % 360, [fx, fz] = dirOf(footB);
  // the foot: on the floor just in from the wall's foot
  const yFoot = (() => { const r = pitRim(footB) - FLOOR.out - 2.6; return floorY(C.x + fx * r, C.z + fz * r) ?? FLOOR.y0; })() + 0.04;
  // the floor under a tread (its middle and both edges), so no tread lies under the bowl: the line comes down straight
  // until it meets the floor, then lies on it to its foot
  const under = (b, r) => { const [dx, dz] = dirOf(b); let m = -Infinity; for (const w of [-S.half, 0, S.half]) { const f = floorY(C.x + dx * (r + w), C.z + dz * (r + w)); if (f !== null && f !== undefined && f > m) m = f; } return m; };
  const ys = new Float32Array(N + 1), rs = new Float32Array(N + 1), raw = new Float32Array(N + 1);
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    ys[i] = yHead + (yFoot - yHead) * s;
    const b = B0 + i;
    // clear of the wall a metre above and below the tread too (the head's room, the slab's underside)
    // (under the trench at the wall's foot the ground's crossing means nothing: the rubble heap in the middle is lower)
    let w = Infinity; for (const dy of [-1.2, 0, 1.6]) { if (ys[i] + dy < FL.wallAt(b % 360) + 1.5) continue; w = Math.min(w, wallR(T, b, ys[i] + dy)); }
    if (w === Infinity) w = pitRim(b) - FLOOR.out + 1.2; // at the floor: the wall's foot
    raw[i] = Math.min(w, pitRim(b)) - 1.55 - S.gap * 0.5 - S.half;
  }
  // the smallest within 5 degrees, then a running mean: never nearer the wall than raw, never wandering
  const mn = new Float32Array(N + 1);
  for (let i = 0; i <= N; i++) { let m = Infinity; for (let k = -5; k <= 5; k++) m = Math.min(m, raw[Math.max(0, Math.min(N, i + k))]); mn[i] = m; }
  for (let i = 0; i <= N; i++) { let a = 0, n = 0; for (let k = -6; k <= 6; k++) { a += mn[Math.max(0, Math.min(N, i + k))]; n++; } rs[i] = Math.min(a / n, raw[i] + 0.25); }
  for (let i = 0; i <= N; i++) { const f = under(B0 + i, rs[i]); if (f + 0.04 > ys[i]) ys[i] = f + 0.04; }
  const atInto = (s, o) => {
    const u = Math.max(0, Math.min(1, s)) * N, i = Math.min(N - 1, Math.floor(u)), f = u - i;
    o.b = B0 + s * N; o.r = rs[i] + (rs[i + 1] - rs[i]) * f; o.y = ys[i] + (ys[i + 1] - ys[i]) * f; return o;
  };
  const at = (s) => atInto(s, {});
  const _q = { b: 0, r: 0, y: 0 }; // floor()'s, per frame: no allocation
  const point = (s, dr = 0) => { const q = at(s), [dx, dz] = dirOf(q.b); return [C.x + dx * (q.r + dr), q.y, C.z + dz * (q.r + dr)]; };
  const len = (() => { let L = 0, p = point(0); for (let i = 1; i <= 200; i++) { const q = point(i / 200); L += Math.hypot(q[0] - p[0], q[2] - p[2]); p = q; } return L; })();
  // the landing, in its own frame: u out along bearing B0 from the stair's first tread, w across
  const land = { b: B0, r0: rs[0] - S.half, r1: R0 + S.land, y: yHead, dx: hx, dz: hz };
  const BOX = R0 + S.land + 2; // the landing's far end is the furthest the slabs' floor reaches
  // the floor: the landing, then the slabs; null off them
  function floor(x, z) {
    const px = x - C.x, pz = z - C.z;
    if (px > BOX || px < -BOX || pz > BOX || pz < -BOX) return null; // every floorAt on the map asks: away from the Pit, two compares
    const r = Math.sqrt(px * px + pz * pz);
    if (r < 6) return null;
    // the landing
    const u = px * hx + pz * hz, w = -px * hz + pz * hx;
    if (u >= land.r0 && u <= land.r1 && Math.abs(w) <= S.half) return yHead;
    const b = ((Math.atan2(px, -pz) * 180) / Math.PI + 360) % 360;
    let d = b - B0; if (d < 0) d += 360;
    // the half-width's worth of bearing either side of the line's two ends belongs to it too
    const s = d / N;
    if (s > 1 + 0.06 && s < 360 / N - 0.01) return null;
    const ss = s > 1 ? 1 : s;
    const q = atInto(ss, _q);
    if (Math.abs(r - q.r) > S.half) return null;
    if (s > 1) { const over = ((d - N) * Math.PI / 180) * r; if (over > S.half) return null; }
    const f = floorY(x, z); // never under the bowl beside it (its foot lies on the bowl)
    return f !== null && f !== undefined && f + 0.04 > q.y ? f + 0.04 : q.y;
  }
  return { at, point, floor, len, yHead, yFoot: ys[N], footB, land, R0, under: (s) => { const q = at(s); return under(q.b, q.r); } };
}

// ---------------------------------------------------------------- lamps: at the head, eight on the way, at the foot
export const LAMPS = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]; // a warm pool every 7 m or so on the way
// the colour of the light out of the Nadir (cold starlight)
export const STARLIGHT = '#bcd2ff';
// the sounder's lamps burn tallow behind horn, the Late folk's saffron light: warm pools going down into the dark
export const LAMP_WARM = '#ffae5c';
