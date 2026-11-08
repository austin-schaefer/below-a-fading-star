// The leads (v4 map, placement plan section 4): worn paths P1-P17, the old kerb K1 and the rivulets R1-R5, as
// lines on the ground computed once, deterministically, from the plan's endpoints and the terrain. Paths keep to
// a walker's line: a desire line between the plan's points, eased off water, steep ground, the landmarks' walls and
// the reserved sites, wandering a little as a sheep-track does. Rivulets run downhill only: each is traced down the
// ground from its source toward the plan's next point, never climbing, and ends where it reaches water or the
// ground gives it nowhere lower to go. The kerb is straight. Each sample knows the region it crosses, and so its
// material (MATERIALS). Shared by v4/paths.js (draws them), vegetation (wears the cover off them) and __fp.paths.
import { heightAt, slopeAt, waterLevelAt, causewayDistance } from '../../terrain.js';
import { regionAt, regionDistance } from '../regions.js';
import { LANDMARKS, SITES } from '../../world.js';
import { makeSimplex, smoothstep, clamp } from '../../noise.js';

const SN = makeSimplex(41108);

// what a lead is worn into, by the region it crosses (regionAt's primary)
export const MATERIALS = {
  moor: 'moor turf', demesne: 'Demesne turf', bletting: 'rank grass', outwash: 'Outwash gravel', saltings: 'salt crust',
  strandline: 'shingle', highLing: 'heather and clitter', lynchets: 'field-stone footings', adust: 'red clay',
  wood: 'leaf litter', fen: 'grey reeds', lattice: 'crystal grit',
};
export const MATERIAL_KEYS = Object.keys(MATERIALS);
export const materialAt = (x, z) => regionAt(x, z, _rw).primary;
const _rw = {};

// The plan's table. pts are the plan's points, nudged where a point is a building's centre or a reserved site (the
// lead stops at its edge) or inside a block another agent owns (the Span's stair feet: the lead stops at the
// block's edge). w: half-width of the worn line in metres. parts: extra branches of the same lead.
export const LEADS = [
  { id: 'P1', kind: 'path', w: 0.32, brief: 'sheep-track, Demesne turf to moor', pts: [[6, 36], [-14, 41], [-36, 44]] },
  { id: 'P2', kind: 'path', w: 0.5, brief: 'worn path, moor; ends at the Scriveners\' shallows', pts: [[-90, 4], [-95, 30], [-101, 50], [-122, 60], [-135, 62]] },
  { id: 'P3', kind: 'path', w: 0.32, brief: 'sheep-track along the Lynchets\' east wall (the Thurifer\'s track), drystone footings', near: { region: 'lynchets', within: 6 },
    pts: [[-108, -126], [-135, -120], [-157, -113], [-178, -79], [-163, -58], [-152, -44]] },
  { id: 'P4', kind: 'path', w: 0.4, brief: 'gap in a wall, Lynchets field-stone (the Link-Boy\'s post)', pts: [[-110, -124], [-128, -113], [-148, -107], [-167, -105]] },
  { id: 'P5', kind: 'path', w: 0.5, brief: 'worn path, moor', pts: [[-106, -131], [-90, -141], [-72, -149]] },
  { id: 'P6', kind: 'path', w: 0.45, brief: 'gravel trod across the Outwash\'s channels', pts: [[-8, -181], [10, -188], [22, -214]] },
  { id: 'P7', kind: 'path', w: 0.5, brief: 'gap in the blackthorn, Bletting grass', pts: [[100, -195], [118, -170], [130, -150], [131, -120], [130, -100]] },
  { id: 'P8', kind: 'path', w: 0.45, brief: 'orchard track, honey-stone wall gaps', pts: [[148, -100], [184, -118], [212, -102], [238, -118], [270, -160]] },
  { id: 'P9', kind: 'path', w: 0.5, brief: 'worn path, Demesne turf then Bletting grass', pts: [[80, -10], [86, -27], [80, -46], [92, -66], [112, -82]] },
  { id: 'K1', kind: 'kerb', w: 0.22, brief: 'old kerb (the Leerie\'s row)', pts: [[110, -25], [145, 35]] },
  { id: 'P10', kind: 'path', w: 0.35, brief: 'heather track with clitter', pts: [[230, -100], [233, -60], [236, -36]], parts: [[[234, -62], [261, -77]]] },
  { id: 'P11', kind: 'path', w: 0.32, brief: 'sheep-track, heather to moor', pts: [[250, 5], [240, 12], [226, 28], [204, 46], [182, 57]] },
  { id: 'P12', kind: 'path', w: 0.45, brief: 'worn crust', pts: [[212, 181], [216, 174], [219.5, 168]] },
  { id: 'P13', kind: 'path', w: 0.4, brief: 'rim path, shingle', pts: [[188, 197], [175, 207], [165, 215], [174, 224], [186, 232], [199, 236], [210, 245]] },
  { id: 'P14', kind: 'path', w: 0.45, brief: 'gap in the grey reeds, then salt crust along the fen\'s south rim', pts: [[125, 205], [105, 222], [86, 240], [70, 258], [40, 261], [9, 252]] },
  { id: 'P15', kind: 'path', w: 0.5, brief: 'worn path, moor to shingle', pts: [[-36, 246], [-65, 226], [-95, 209], [-75, 189], [-50, 166]] },
  { id: 'P16', kind: 'path', w: 0.4, brief: 'track through the wood\'s southern fringe', pts: [[-122, 172], [-150, 182], [-175, 192], [-194, 196]] },
  { id: 'P17', kind: 'path', w: 0.32, brief: 'sheep-track, to the spit', pts: [[-40, 62], [-30, 82], [-28, 110], [-33, 134], [-42, 150]] },
  { id: 'R1', kind: 'rivulet', w: 0.16, brief: 'meltwater rivulet, Outwash gravel', pts: [[40, -219], [0, -195], [-7, -188]] },
  { id: 'R2', kind: 'rivulet', w: 0.15, brief: 'runnel, heather to moor to red glasswort', pts: [[232, -20], [212, 34]], parts: [[[214, 76], [198, 136]]] },
  { id: 'R3', kind: 'rivulet', w: 0.14, brief: 'runnel, Bletting grass to the Demesne\'s ditch', pts: [[130, -92], [100, -20], [108, -16]], parts: [[[104, 62], [80, 92]]] },
  { id: 'R4', kind: 'rivulet', w: 0.14, brief: 'runnel, field-stone then moor', pts: [[-182, -78], [-165, -28], [-140, 55], [-130, 75]] },
  { id: 'R5', kind: 'rivulet', w: 0.13, brief: 'runnel, moor', pts: [[-65, 17], [-55, 40], [-50, 70]] },
];

// ---------------------------------------------------------------- what the leads keep off
// Landmarks' walls (not their grounds), every reserved floor site of the plan's section 5 (v5 and v6), the blocks
// other agents own. A lead may come to a site it is led to (one within reach of its own points) but no other.
const AVOID = [
  ...[['castle', 36] /* v5: the keep's corners reach 35 m */, ['tower', 17] /* v5: the lens mount's fins */, ['stones', 10], ['byre', 13], ['court', 34], ['taverna', 14], ['graveyard', 11], ['hypogeum', 9], ['arcature', 19], ['cutting', 8], ['eddy', 5], ['gradine', 12]]
    .map(([k, r]) => ({ x: LANDMARKS[k].x, z: LANDMARKS[k].z, r })),
  ...['keptFire', 'collation', 'prospect', 'tallestTor', 'lightPost', 'lightDoor', 'lightMoss', 'lightEmbers', 'nave', 'postern'].map((k) => ({ x: SITES[k].x, z: SITES[k].z, r: SITES[k].r })),
  // v6 (section 5): the Taker, the Coheirs, the Long Sleeper, the Bather's pool, the Sexton's graves, the Accrescent,
  // the moles, the Scriveners, the Simulacrum, the Toadstone
  { x: -255, z: 10, r: 4 }, { x: -45, z: 160, r: 6 }, { x: 180, z: -40, r: 6 }, { x: 158, z: 228, r: 10 }, { x: 55, z: 274, r: 18 },
  { x: 60, z: -180, r: 3 }, { x: 75, z: 0, r: 12 }, { x: -100, z: 58, r: 8 }, { x: 20, z: -205, r: 5 }, { x: 180, z: 230, r: 2 },
];
const BLOCKS = ['spanWest', 'spanEast', 'fallLip', 'nave'].map((k) => SITES[k].block);
// the set-dressing strips (section 4's table): the Discontinued Track, 2 m, and the Surveyor's Pegs, 1 m
export const STRIPS = [{ a: [170, 150], b: [215, 160], half: 1.0 }, { a: [-80, -285], b: [-80, 285], half: 0.5 }];
function stripDist(x, z, S) {
  const [ax, az] = S.a, [bx, bz] = S.b, ex = bx - ax, ez = bz - az;
  const t = clamp(((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez), 0, 1);
  return Math.hypot(x - ax - ex * t, z - az - ez * t) - S.half;
}
export function inStrip(x, z, pad = 0) { for (const S of STRIPS) if (stripDist(x, z, S) < pad) return true; return false; }

// ---------------------------------------------------------------- the walker's cost of a spot (cached on a 2 m grid)
const COST = new Map();
function cellCost(ix, iz) {
  const k = ix * 4096 + iz;
  let c = COST.get(k);
  if (c !== undefined) return c;
  const x = ix * 2 + 1, z = iz * 2 + 1;
  c = 0;
  const wl = waterLevelAt(x, z);
  if (wl !== null && heightAt(x, z) < wl + 0.05) c += 60;
  const s = slopeAt(x, z);
  c += Math.max(0, s - 0.32) * 60;
  if (Math.hypot(x, z) > 292) c += 40;
  COST.set(k, c);
  return c;
}
function siteCost(x, z, avoid) {
  let c = 0;
  for (const A of avoid) { const d = Math.hypot(x - A.x, z - A.z); if (d < A.r + 2) c += 40 * (1 - smoothstep(A.r - 2, A.r + 2, d)) + 10; }
  for (const b of BLOCKS) if (x > b[0] - 1 && x < b[1] + 1 && z > b[2] - 1 && z < b[3] + 1) c += 50;
  for (const S of STRIPS) { const d = stripDist(x, z, S); if (d < 3) c += 6 * (1 - d / 3); } // cross a strip, never run along it
  return c;
}
const costAt = (x, z, avoid) => cellCost(Math.floor(x / 2), Math.floor(z / 2)) + siteCost(x, z, avoid);

function resample(pts, step) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / step));
    for (let k = 0; k < n; k++) out.push([ax + (bx - ax) * (k / n), az + (bz - az) * (k / n), k === 0 ? 1 : 0]);
  }
  out.push([...pts[pts.length - 1], 1]);
  return out;
}

// a path: the plan's points joined, then eased sideways off what a walker would go round, smoothed, and given a
// sheep-track's wander (none for the kerb)
function routePath(L, pts, avoid) {
  const P = resample(pts, 2.0), n = P.length;
  if (L.kind !== 'kerb') {
    const offs = [-6, -3, -1.5, 0, 1.5, 3, 6];
    for (let it = 0; it < 14; it++) {
      for (let i = 1; i < n - 1; i++) {
        if (P[i][2]) continue; // the plan's own points hold
        const [px, pz] = P[i - 1], [qx, qz] = P[i + 1];
        let tx = qx - px, tz = qz - pz; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
        const mx = (px + qx) / 2, mz = (pz + qz) / 2;
        let best = Infinity, bx = P[i][0], bz = P[i][1];
        for (const o of offs) {
          const x = P[i][0] - tz * o, z = P[i][1] + tx * o;
          const c = costAt(x, z, avoid) + 0.9 * ((x - mx) ** 2 + (z - mz) ** 2);
          if (c < best) { best = c; bx = x; bz = z; }
        }
        P[i][0] = bx * 0.6 + mx * 0.4; P[i][1] = bz * 0.6 + mz * 0.4;
      }
    }
    // the wander: a long sway and a short one, fading to nothing at the plan's points
    let s = 0;
    for (let i = 1; i < n - 1; i++) {
      const [px, pz] = P[i - 1], [qx, qz] = P[i + 1];
      let tx = qx - px, tz = qz - pz; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
      s += 2;
      let near = Infinity; for (let j = Math.max(0, i - 6); j <= Math.min(n - 1, i + 6); j++) if (P[j][2]) near = Math.min(near, Math.abs(j - i) * 2);
      const o = (SN.noise2(s * 0.035, L.seed) * 1.4 + SN.noise2(s * 0.14, L.seed + 9) * 0.45) * smoothstep(0, 10, near);
      P[i][0] -= tz * o; P[i][1] += tx * o;
    }
  }
  return P.map(([x, z]) => [x, z]);
}

// a rivulet: the cheapest way from its source to each of the plan's points in turn on a 1.5 m grid, where any
// climb above the lowest ground the water has reached so far costs dearly (so it goes round rises, along the
// hollows, and only where nothing else serves cuts a little into the ground: CUT). It ends at water; the water's
// level along it is the running minimum of the ground, so it never runs uphill.
const CUT = 0.8, G = 1.5;
function heapPush(H, item) { H.push(item); let i = H.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (H[p][0] <= H[i][0]) break; [H[p], H[i]] = [H[i], H[p]]; i = p; } }
function heapPop(H) { const top = H[0], last = H.pop(); if (H.length) { H[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < H.length && H[l][0] < H[m][0]) m = l; if (r < H.length && H[r][0] < H[m][0]) m = r; if (m === i) break; [H[m], H[i]] = [H[i], H[m]]; i = m; } } return top; }
export function rivuletLeg(x0, z0, wy0, gx, gz, seed) {
  const pad = 40, bx0 = Math.min(x0, gx) - pad, bz0 = Math.min(z0, gz) - pad;
  const nx = Math.ceil((Math.max(x0, gx) + pad - bx0) / G) + 1, nz = Math.ceil((Math.max(z0, gz) + pad - bz0) / G) + 1;
  const H = new Float32Array(nx * nz).fill(NaN), dist = new Float64Array(nx * nz).fill(Infinity), wy = new Float32Array(nx * nz), prev = new Int32Array(nx * nz).fill(-1);
  const hAt = (k) => { if (Number.isNaN(H[k])) { const x = bx0 + (k % nx) * G, z = bz0 + Math.floor(k / nx) * G; H[k] = heightAt(x, z) + SN.noise2(x * 0.09 + seed, z * 0.09) * 0.04; } return H[k]; };
  const at = (x, z) => clamp(Math.round((z - bz0) / G), 0, nz - 1) * nx + clamp(Math.round((x - bx0) / G), 0, nx - 1);
  const s = at(x0, z0), goal = at(gx, gz);
  dist[s] = 0; wy[s] = Math.min(wy0, hAt(s));
  const heap = [[0, s]];
  const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  let reach = -1;
  while (heap.length) {
    const [d, k] = heapPop(heap);
    if (d > dist[k]) continue;
    const kx = k % nx, kz = Math.floor(k / nx), x = bx0 + kx * G, z = bz0 + kz * G;
    if (Math.hypot(x - gx, z - gz) < 5 || k === goal) { reach = k; break; }
    const wl = waterLevelAt(x, z);
    if (wl !== null && hAt(k) < wl && k !== s) { reach = k; break; } // it has found water on the way
    for (const [dx, dz] of D8) {
      const jx = kx + dx, jz = kz + dz;
      if (jx < 0 || jz < 0 || jx >= nx || jz >= nz) continue;
      const j = jz * nx + jx, hj = hAt(j);
      // under the causeway it runs through a culvert: the road's bank is no climb
      const climb = causewayDistance(bx0 + jx * G, bz0 + jz * G) < 6 ? 0 : Math.max(0, hj - wy[k]);
      if (climb > CUT) continue;
      const step = Math.hypot(dx, dz) * G, nd = d + step * (1 + 0.6 * Math.abs(hj - H[k]) / step) + climb * climb * 400 + climb * 40;
      if (nd < dist[j]) { dist[j] = nd; wy[j] = climb === 0 && hj > wy[k] ? wy[k] : Math.min(wy[k], hj); prev[j] = k; heapPush(heap, [nd, j]); }
    }
  }
  if (reach < 0) return null;
  const path = [];
  for (let k = reach; k >= 0; k = prev[k]) path.push([bx0 + (k % nx) * G, bz0 + Math.floor(k / nx) * G, wy[k]]);
  path.reverse();
  return { path, water: (() => { const x = bx0 + (reach % nx) * G, z = bz0 + Math.floor(reach / nx) * G, wl = waterLevelAt(x, z); return wl !== null && heightAt(x, z) < wl; })() };
}
function routeRivulet(L, pts) {
  let x = pts[0][0], z = pts[0][1], wyc = heightAt(x, z);
  const out = [[x, z]];
  L.ended = 'reaches its end';
  for (let t = 1; t < pts.length; t++) {
    const leg = rivuletLeg(x, z, wyc, pts[t][0], pts[t][1], L.seed);
    if (!leg) { // the ground will not let it get there downhill: it makes for the plan's next point instead
      (L.skipped || (L.skipped = [])).push(pts[t]);
      if (t === pts.length - 1) L.ended = `stops short of (${pts[t][0]}, ${pts[t][1]})`;
      continue;
    }
    for (const [px, pz, w] of leg.path.slice(1)) { out.push([px, pz]); wyc = w; }
    x = out[out.length - 1][0]; z = out[out.length - 1][1];
    if (leg.water) { L.ended = 'reaches water'; break; }
  }
  // ease the grid's corners (three passes of a small average; the ends hold)
  for (let it = 0; it < 3; it++) for (let i = 1; i < out.length - 1; i++) { out[i][0] = (out[i - 1][0] + out[i][0] * 2 + out[i + 1][0]) / 4; out[i][1] = (out[i - 1][1] + out[i][1] * 2 + out[i + 1][1]) / 4; }
  // and the meander a runnel has on flat ground
  let s = 0;
  for (let i = 1; i < out.length - 1; i++) {
    const tx = out[i + 1][0] - out[i - 1][0], tz = out[i + 1][1] - out[i - 1][1], tl = Math.hypot(tx, tz) || 1; s += G;
    const o = SN.noise2(s * 0.09, L.seed + 3) * 0.7 * smoothstep(0, 6, Math.min(i, out.length - 1 - i));
    out[i][0] -= (tz / tl) * o; out[i][1] += (tx / tl) * o;
  }
  return out;
}

// ---------------------------------------------------------------- the computed leads, and a grid to find them by
let BUILT = null;
const CELL = 4;
export function leads() {
  if (BUILT) return BUILT;
  const t0 = performance.now();
  const out = [];
  LEADS.forEach((D, li) => {
    const L = { ...D, seed: li * 7.31 + 3.7, lines: [] };
    const own = [D.pts, ...(D.parts || [])].flat();
    const avoid = AVOID.filter((A) => !own.some(([x, z]) => Math.hypot(x - A.x, z - A.z) < A.r + 4));
    for (const pts of [D.pts, ...(D.parts || [])]) {
      const line = D.kind === 'rivulet' ? routeRivulet(L, pts) : routePath(L, pts, avoid);
      // each sample: x, z, arc length, ground height, material key; the strips and the sites the lead keeps off
      // become gaps (open: 0)
      let s = 0;
      let wy = Infinity;
      const S = line.map(([x, z], i) => {
        if (i) s += Math.hypot(x - line[i - 1][0], z - line[i - 1][1]);
        const open = inStrip(x, z, D.w + 0.3) || (D.kind === 'rivulet' && causewayDistance(x, z) < 3.4) ? 0 : 1, y = heightAt(x, z);
        if (open || D.kind !== 'rivulet') wy = Math.min(wy, y); // a rivulet's water: the lowest ground it has reached (paths ignore it); in a culvert it holds
        // a lead that runs along a region's edge (P3 along the Lynchets' wall) is worn into that region's ground
        const mat = D.near && regionDistance(D.near.region, x, z) < D.near.within ? D.near.region : materialAt(x, z);
        return { x, z, s, y, wy, mat, open };
      });
      L.lines.push(S);
    }
    L.length = L.lines.reduce((a, S) => a + S[S.length - 1].s, 0);
    L.ends = L.lines.map((S) => [[S[0].x, S[0].z], [S[S.length - 1].x, S[S.length - 1].z]]);
    out.push(L);
  });
  // the grid: every segment in each 4 m cell it passes within reach of
  const grid = new Map();
  out.forEach((L, li) => L.lines.forEach((S, si) => {
    for (let i = 0; i < S.length - 1; i++) {
      const a = S[i], b = S[i + 1], r = L.w * 2 + 1.5;
      const x0 = Math.floor((Math.min(a.x, b.x) - r) / CELL), x1 = Math.floor((Math.max(a.x, b.x) + r) / CELL);
      const z0 = Math.floor((Math.min(a.z, b.z) - r) / CELL), z1 = Math.floor((Math.max(a.z, b.z) + r) / CELL);
      for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) {
        const k = gx * 4096 + gz; let c = grid.get(k); if (!c) grid.set(k, (c = [])); c.push(li, si, i);
      }
    }
  }));
  BUILT = { list: out, grid, ms: performance.now() - t0 };
  return BUILT;
}

// The nearest lead at (x, z), if (x, z) is on it: { id, kind, material (key), name (MATERIALS), d, s, along } or null
const _hit = { id: '', kind: '', material: '', name: '', d: 0, s: 0, w: 0, open: 1 };
export function nearestLead(x, z, pad = 0, out = _hit) {
  const B = leads(), c = B.grid.get(Math.floor(x / CELL) * 4096 + Math.floor(z / CELL));
  if (!c) return null;
  let best = Infinity, bl = -1, bs = 0, bi = 0, bt = 0;
  for (let k = 0; k < c.length; k += 3) {
    const L = B.list[c[k]], S = L.lines[c[k + 1]], a = S[c[k + 2]], b = S[c[k + 2] + 1];
    const ex = b.x - a.x, ez = b.z - a.z, l2 = ex * ex + ez * ez || 1;
    const t = clamp(((x - a.x) * ex + (z - a.z) * ez) / l2, 0, 1);
    const d = Math.hypot(x - a.x - ex * t, z - a.z - ez * t) - L.w;
    if (d < best) { best = d; bl = c[k]; bs = c[k + 1]; bi = c[k + 2]; bt = t; }
  }
  if (bl < 0 || best > pad) return null;
  const L = B.list[bl], a = L.lines[bs][bi], b = L.lines[bs][bi + 1], m = bt < 0.5 ? a : b;
  out.id = L.id; out.kind = L.kind; out.material = m.mat; out.name = MATERIALS[m.mat]; out.d = best + L.w; out.s = a.s + (b.s - a.s) * bt; out.w = L.w;
  out.open = Math.min(a.open, b.open);
  return out;
}

// How worn the cover is at (x, z), 0..1: bare down a path's middle, thinning out over its shoulders; a rivulet's
// line only. For vegetation (cheap where no lead is near: one grid lookup).
export function wornAt(x, z) {
  const h = nearestLead(x, z, 1.2, _w2);
  if (!h || !h.open) return 0;
  if (h.kind === 'rivulet') return 1 - smoothstep(h.w * 1.2, h.w * 3.5, h.d);
  return 1 - smoothstep(h.w * 0.9, h.w * 2.2 + 0.2, h.d);
}
const _w2 = { ..._hit };
// whether any lead passes within a 2 m cell's reach of (x, z) (vegetation's cell-level test)
export function leadNear(x, z) {
  const B = leads();
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (B.grid.has((Math.floor(x / CELL) + dx) * 4096 + Math.floor(z / CELL) + dz)) return true;
  return false;
}

// The runnel's own cut (terrain.js, through v4/paths/ground.js's mapHeight): where the plan's rivulet has to pass a
// rise (never more than CUT), the ground along it is cut down a hand below its water, so it runs downhill all the
// way; elsewhere a slight groove. 0 until the leads are built (they are traced on the uncut ground).
export function runnelCut(h, x, z) {
  if (!BUILT) return h;
  const c = BUILT.grid.get(Math.floor(x / CELL) * 4096 + Math.floor(z / CELL));
  if (!c) return h;
  let best = Infinity, wy = 0;
  for (let k = 0; k < c.length; k += 3) {
    const L = BUILT.list[c[k]];
    if (L.kind !== 'rivulet') continue;
    const S = L.lines[c[k + 1]], a = S[c[k + 2]], b = S[c[k + 2] + 1];
    const ex = b.x - a.x, ez = b.z - a.z, l2 = ex * ex + ez * ez || 1, t = clamp(((x - a.x) * ex + (z - a.z) * ez) / l2, 0, 1);
    const d = Math.hypot(x - a.x - ex * t, z - a.z - ez * t);
    if (d < best) { best = d; wy = a.wy + (b.wy - a.wy) * t; }
  }
  if (best > 1.8) return h;
  const bed = Math.min(h, wy) - 0.06 - 0.08 * Math.max(0, 1 - (best / 0.45) ** 2);
  return Math.min(h, bed + (h - bed) * smoothstep(0.35, 1.8, best));
}
