// The Diffident Stair's plan (v12-H3): every tread and landing, where it stands when it is called and where it lies
// when it is not. Pure (no three.js), so tools can read it.
//
// The stair climbs from a stub on the foot of the east wall, west toward the sun, in flights that turn at landings,
// to the foot of a lattice come low. Each element (a tread, a landing, the stub's treads, the top) is an oriented box:
// centre (cx, cz), forward (ux, uz), half width hw across, half depth hd along, its top at y. `rest` is where it lies
// on the moor when it is not called: in its bed in the turf directly under its place (where two beds would overlap,
// the later lies on the earlier). The stub's treads and the top never leave.
//
// Coordinates: +x east, +z south. A walker facing (ux, uz) has their right at (-uz, ux).

export const RISE = 0.32, GOING = 0.33, WIDTH = 2.2;
export const FOOT = { x: 288, z: -4 }; // the stub's lowest tread; the stair climbs north from here (so the road and the Nave, west and south-west, see the stub side on)
export const STUB = 30; // treads that always stand: 9.6 m of steps on their masonry, ending in air

// the route: flights (n treads) and landings (turn: 'S' straight on, 'L', 'R', or 'BL'/'BR' a switchback to that side)
export const ROUTE = [
  { n: 48 }, { turn: 'L' }, // north from the stub; then west
  { n: 50 }, { turn: 'L' }, // then south
  { n: 32 }, { turn: 'BR' }, // the switchback: straight on is nothing; the next flight is behind, to the right (west)
  { n: 60 }, { turn: 'L' }, // north; then west
  { n: 28 }, { turn: 'R' }, // then north
  { n: 50 }, { turn: 'L' }, // then west, into the sun
  { n: 56 }, { top: true },
];

export const KIND = { TREAD: 0, LANDING: 1, STUB: 2, TOP: 3 };

export function buildPlan(heightAt) {
  const els = [];
  let px = FOOT.x, pz = FOOT.z + GOING / 2, ux = 0, uz = -1; // the cursor: the back edge of the next element
  let y = heightAt(FOOT.x, FOOT.z) + 0.05; // the floor the first riser rises from
  let s = 0; // the path length to the cursor
  const y0 = y;
  let flight = 0, landing = 0;
  for (const step of ROUTE) {
    if (step.n) {
      for (let k = 0; k < step.n; k++) {
        y += RISE;
        const cx = px + ux * GOING / 2, cz = pz + uz * GOING / 2;
        const stub = els.length < STUB;
        els.push({ i: els.length, kind: stub ? KIND.STUB : KIND.TREAD, cx, cz, ux, uz, hw: WIDTH / 2, hd: GOING / 2, y, s: s + GOING / 2, flight, k, n: step.n });
        px += ux * GOING; pz += uz * GOING; s += GOING;
      }
      flight++;
      continue;
    }
    const W = WIDTH + 0.6; // a landing is wider than the flight by 0.3 m each side
    if (step.top) {
      // the top: a long landing straight on, against the lattice's foot (src/v12/stair/top.js builds what is there)
      const D = 4.4;
      els.push({ i: els.length, kind: KIND.TOP, cx: px + ux * D / 2, cz: pz + uz * D / 2, ux, uz, hw: W / 2 + 0.4, hd: D / 2, y, s: s + D / 2, landing: landing++ });
      px += ux * D; pz += uz * D; s += D;
      break;
    }
    const rx = -uz, rz = ux;
    if (step.turn === 'S') {
      const D = 2.6;
      els.push({ i: els.length, kind: KIND.LANDING, cx: px + ux * D / 2, cz: pz + uz * D / 2, ux, uz, hw: W / 2, hd: D / 2, y, s: s + D / 2, landing: landing++, turn: 'S' });
      px += ux * D; pz += uz * D; s += D;
    } else if (step.turn === 'L' || step.turn === 'R') {
      const sd = step.turn === 'R' ? 1 : -1;
      const cx = px + ux * W / 2, cz = pz + uz * W / 2;
      els.push({ i: els.length, kind: KIND.LANDING, cx, cz, ux, uz, hw: W / 2, hd: W / 2, y, s: s + W / 2, landing: landing++, turn: step.turn });
      const nx = rx * sd, nz = rz * sd;
      px = cx + nx * W / 2; pz = cz + nz * W / 2; ux = nx; uz = nz; s += W;
    } else {
      // a switchback: the landing spans this flight and the next beside it (a gap of 0.9 m between them)
      const sd = step.turn === 'BR' ? 1 : -1, gap = 0.9, D = 2.6, span = WIDTH * 2 + gap + 0.6;
      const off = (WIDTH + gap) / 2;
      const cx = px + ux * D / 2 + rx * sd * off, cz = pz + uz * D / 2 + rz * sd * off;
      els.push({ i: els.length, kind: KIND.LANDING, cx, cz, ux, uz, hw: span / 2, hd: D / 2, y, s: s + D / 2 + off, landing: landing++, turn: step.turn });
      px = cx + rx * sd * off - ux * D / 2; pz = cz + rz * sd * off - uz * D / 2; ux = -ux; uz = -uz; s += D + 2 * off;
    }
  }
  // where each lies when it is not called: in its bed under its place, or on an earlier slab its bed would overlap
  for (const e of els) {
    e.ground = heightAt(e.cx, e.cz);
    if (e.kind === KIND.STUB || e.kind === KIND.TOP) { e.rest = null; continue; }
    e.thick = e.kind === KIND.LANDING ? 0.42 : 0.28;
    let on = null;
    for (const o of els) {
      if (o === e) break;
      if (!o.rest || (o.flight === e.flight && o.flight !== undefined)) continue;
      if (overlaps(o, e)) { if (!on || o.rest.y > on.rest.y) on = o; }
    }
    // sunk into the turf by most of its thickness; a slab on a slab lies on it, a little askew
    e.rest = on ? { y: on.rest.y + on.thick, on: on.i } : { y: e.ground + e.thick * 0.55, on: -1 }; // proud of the turf, so the line of them reads
  }
  const top = els[els.length - 1];
  return { els, y0, top, length: s, count: els.length };
}

// do two elements' boxes overlap (by more than 5 cm)? Tested at the corners and centre of the smaller, both ways
function overlaps(a, b) {
  const pts = (e) => { const out = [[e.cx, e.cz]]; for (const sf of [-0.8, 0.8]) for (const sr of [-0.8, 0.8]) out.push([e.cx + e.ux * e.hd * sf - e.uz * e.hw * sr, e.cz + e.uz * e.hd * sf + e.ux * e.hw * sr]); return out; };
  return pts(b).some(([x, z]) => inside(a, x, z, -0.05)) || pts(a).some(([x, z]) => inside(b, x, z, -0.05));
}

// call f(i, j) for each grid cell under an element's box
function forCells(e, C, f) {
  const ex = Math.abs(e.ux) * e.hd + Math.abs(e.uz) * e.hw, ez = Math.abs(e.uz) * e.hd + Math.abs(e.ux) * e.hw;
  for (let i = Math.floor((e.cx - ex) / C); i <= Math.floor((e.cx + ex - 1e-6) / C); i++)
    for (let j = Math.floor((e.cz - ez) / C); j <= Math.floor((e.cz + ez - 1e-6) / C); j++) f(i, j);
}

// a grid over the plan for finding the element at (x, z): 1 m cells, each a list of element indices
export function makeIndex(els) {
  const C = 1, cells = new Map(), key = (i, j) => i * 100003 + j;
  for (const e of els) forCells(e, C, (i, j) => { const k = key(i, j); if (!cells.has(k)) cells.set(k, []); cells.get(k).push(e.i); });
  const empty = [];
  return (x, z) => cells.get(key(Math.floor(x / C), Math.floor(z / C))) || empty;
}

// is (x, z) inside element e's box, grown by m?
export function inside(e, x, z, m = 0) {
  const dx = x - e.cx, dz = z - e.cz;
  const f = dx * e.ux + dz * e.uz, r = dx * -e.uz + dz * e.ux;
  return Math.abs(f) <= e.hd + m && Math.abs(r) <= e.hw + m;
}

// Is (x, z) on the stair's ground: under a slab's bed or the stub, grown by m (read by rocks.js and the vegetation's
// ground, so nothing grows through the slabs lying in the turf)? False with ?stair=0.
let clearIdx = null, clearEls = null;
const CLEAR_MAX = 6; // the widest margin a caller may ask (a boulder's reach); a larger one is clamped to it
const OFF = typeof location !== 'undefined' && new URLSearchParams(location.search).get('stair') === '0';
export function stairClear(x, z, m = 0.6) {
  if (OFF) return false;
  if (!clearIdx) { clearEls = buildPlan(() => 0).els; clearIdx = makeIndex(clearEls.map((e) => ({ ...e, hw: e.hw + CLEAR_MAX, hd: e.hd + CLEAR_MAX }))); }
  if (x < 205 || x > 305 || z < -80 || z > 5) return false;
  const L = clearIdx(x, z), mm = Math.min(m, CLEAR_MAX);
  for (let k = 0; k < L.length; k++) { const e = clearEls[L[k]]; if (e.kind !== KIND.TOP && inside(e, x, z, mm)) return true; }
  return false;
}

// The sightlines to the stub from the road and the Nave: no gorse or clitter in a band 5 m either side of each, so the
// stub is seen whole from both (read by the High Ling, with stairClear)
const SIGHTS = [[[236, -22], [287, -6]], [[255, 30], [287, -6]]];
export function stairSight(x, z) {
  if (OFF) return false;
  for (const [[ax, az], [bx, bz]] of SIGHTS) {
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    const ex = x - ax - dx * t, ez = z - az - dz * t;
    if (ex * ex + ez * ez < 25) return true;
  }
  return false;
}
