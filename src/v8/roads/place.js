// v8-01 roads: where the gnomons stand. Pure and deterministic (hashes, the terrain, the leads), computed once.
// The tracks are every path lead's lines, the old kerb K1 and the causeway (the trunk). A gnomon stands at every
// junction (with an arm toward each branch), along every lead every 30-55 m (closer in the wood), and the
// causeway's old waymarker places (every 40 m, 2.9 m off, alternate sides) hold the grand ones. Many of the ones
// along the leads are sunk, snapped or fallen. Last, every 4 m of every track is checked for a standing gnomon
// within SIGHT m whose head clears the terrain from a walker's eye; where none does, one is raised there, so the
// rule the roads-test checks holds by construction.
import { leads, nearestLead } from '../../v4/paths/routes.js';
import { heightAt, waterLevelAt, causewayDistance, slopeAt } from '../../terrain.js';
import { regionAt } from '../../v4/regions.js';
import { CAUSEWAY_V4, SUN } from '../../world.js';
import { hash2, smoothstep } from '../../noise.js';

export const SIGHT = 80;   // the next gnomon is in sight within this
export const EYE = 1.6;
const STEP = 4;
const _rw = {};
const hx = (x, z, salt) => hash2(Math.round(x * 13) + salt * 7919, Math.round(z * 17) - salt * 104729); // [0, 1)

// the tracks as polylines of { x, z, s }; w: half the tread
export function tracks() {
  const out = [];
  for (const L of leads().list) {
    if (L.kind === 'rivulet') continue;
    L.lines.forEach((S, li) => out.push({ id: L.id, li, cls: L.kind === 'kerb' ? 'kerb' : L.cls || 'trod', w: L.kind === 'kerb' ? 0.6 : L.w, pts: S.map((p) => ({ x: p.x, z: p.z, s: p.s })) }));
  }
  let s = 0;
  out.push({ id: 'causeway', li: 0, cls: 'causeway', w: 1.75, pts: CAUSEWAY_V4.map((p, i, a) => { if (i) s += Math.hypot(p.x - a[i - 1].x, p.z - a[i - 1].z); return { x: p.x, z: p.z, s }; }) });
  return out;
}

export function pointAt(T, s) {
  const P = T.pts;
  s = Math.max(0, Math.min(P[P.length - 1].s, s));
  let j = 0; while (j < P.length - 2 && P[j + 1].s < s) j++;
  const a = P[j], b = P[j + 1], l = Math.max(1e-6, b.s - a.s), t = Math.max(0, Math.min(1, (s - a.s) / l));
  const dx = (b.x - a.x) / (Math.hypot(b.x - a.x, b.z - a.z) || 1), dz = (b.z - a.z) / (Math.hypot(b.x - a.x, b.z - a.z) || 1);
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, dx, dz };
}
// the nearest point of a track to (x, z): { d, s }
export function nearestOn(T, x, z) {
  const P = T.pts;
  let best = Infinity, bs = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], ex = b.x - a.x, ez = b.z - a.z, l2 = ex * ex + ez * ez || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * ex + (z - a.z) * ez) / l2));
    const d = Math.hypot(x - a.x - ex * t, z - a.z - ez * t);
    if (d < best) { best = d; bs = a.s + (b.s - a.s) * t; }
  }
  return { d: best, s: bs };
}

// a walker's eye at (x, z) sees a point at (gx, gy, gz) over the terrain
export function sees(x, z, gx, gy, gz, H = heightAt) {
  const y0 = H(x, z) + EYE, L = Math.hypot(gx - x, gz - z);
  const n = Math.max(1, Math.ceil(L / 2.5));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (t * L < 1 || (1 - t) * L < 1) continue;
    const px = x + (gx - x) * t, pz = z + (gz - z) * t;
    if (H(px, pz) > y0 + (gy - y0) * t - 0.25) return false; // a margin over the test's own trace
  }
  return true;
}

const dry = (x, z) => { const wl = waterLevelAt(x, z); return wl === null || heightAt(x, z) > wl + 0.15; };

export function placeGnomons() {
  const TR = tracks();
  const G = [];
  const grid = new Map(), CELL = 40;
  const key = (x, z) => Math.floor(x / CELL) * 4096 + Math.floor(z / CELL);
  const add = (g) => { G.push(g); const k = key(g.x, g.z); let c = grid.get(k); if (!c) grid.set(k, (c = [])); c.push(g); return g; };
  const near = (x, z, r, fn) => {
    const n = Math.ceil(r / CELL);
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
      const c = grid.get((Math.floor(x / CELL) + i) * 4096 + Math.floor(z / CELL) + j);
      if (c) for (const g of c) if (Math.hypot(g.x - x, g.z - z) < r && fn(g) === true) return true;
    }
    return false;
  };
  // clear of every tread (its middle and 0.7 m more), off the causeway, dry and not on a steep bank
  const clearAt = (x, z, pad = 0.7) => {
    if (causewayDistance(x, z) < 2.6) return false;
    if (!dry(x, z) || slopeAt(x, z) > 0.6) return false;
    return !nearestLead(x, z, pad); // the leads' own grid: no tread (nor kerb, nor runnel) within pad of its edge
  };
  const state = (x, z, kind) => {
    const h = hx(x, z, 1), h2 = hx(x, z, 2);
    if (kind === 'junction') return { state: 'stand', h2 }; // a junction's always stands
    if (kind !== 'along') return { state: h < 0.85 ? 'stand' : 'sunk', h2 };
    return { state: h < 0.42 ? 'stand' : h < 0.58 ? 'sunk' : h < 0.79 ? 'snapped' : 'fallen', h2 }; // the sight pass fills what these leave
  };
  const make = (x, z, tx, tz, kind, extra = {}) => {
    const st = state(x, z, kind);
    const grand = kind === 'grand';
    const sc = grand ? 1.3 : 1;
    const H = (2.15 + st.h2 * 0.5) * sc; // the shaft; the head adds 0.5 more
    const sink = st.state === 'sunk' ? 0.5 + st.h2 * 0.45 : 0;
    const y = heightAt(x, z);
    const visible = st.state === 'stand' || st.state === 'sunk';
    const top = y + H + 0.5 * sc - sink - 0.2; // the head's middle
    return { x, z, y, tx, tz, yaw: Math.atan2(tx, tz), kind, grand, sc, H, sink, state: st.state, seed: st.h2, top, visible, arms: [], ...extra };
  };

  // ---- the junctions: a lead's end on another track (or the causeway), merged within 12 m
  const J = [];
  for (const T of TR) {
    if (T.id === 'causeway' || T.cls === 'kerb') continue;
    for (const e of [T.pts[0], T.pts[T.pts.length - 1]]) {
      let on = false;
      for (const U of TR) { if (U === T) continue; if (nearestOn(U, e.x, e.z).d < U.w + 3.5) { on = true; break; } }
      if (!on) continue;
      const j = J.find((q) => Math.hypot(q.x - e.x, q.z - e.z) < 12);
      if (!j) J.push({ x: e.x, z: e.z });
    }
  }
  for (const j of J) {
    // the branches: each track passing within reach, both ways along it unless it ends here
    const br = [];
    for (const T of TR) {
      const n = nearestOn(T, j.x, j.z);
      if (n.d > T.w + 4) continue;
      const len = T.pts[T.pts.length - 1].s;
      for (const dir of [-1, 1]) {
        const s2 = n.s + dir * 12;
        if (s2 < -1 || s2 > len + 1 || Math.abs(Math.max(0, Math.min(len, s2)) - n.s) < 6) continue;
        const p = pointAt(T, s2);
        br.push(Math.atan2(p.x - j.x, p.z - j.z));
      }
    }
    br.sort((a, b) => a - b);
    // stand in the widest gap between the branches
    let gap = 0, mid = 0;
    for (let i = 0; i < br.length; i++) {
      const a = br[i], b = i + 1 < br.length ? br[i + 1] : br[0] + Math.PI * 2, g = b - a;
      if (g > gap) { gap = g; mid = (a + b) / 2; }
    }
    let placed = null;
    for (const r of [3.2, 4.2, 5.5, 7]) {
      for (const da of [0, 0.35, -0.35, 0.7, -0.7]) {
        const x = j.x + Math.sin(mid + da) * r, z = j.z + Math.cos(mid + da) * r;
        if (clearAt(x, z)) { placed = { x, z }; break; }
      }
      if (placed) break;
    }
    if (!placed) continue;
    // its head's notch faces the crossing, so a walker there sees the V face on (v8-09; it faced the widest gap)
    const jd = Math.hypot(j.x - placed.x, j.z - placed.z) || 1;
    const g = make(placed.x, placed.z, (j.x - placed.x) / jd, (j.z - placed.z) / jd, 'junction');
    // arms: one toward each branch, as bearings from the gnomon
    for (const b of br) {
      const px = j.x + Math.sin(b) * 12, pz = j.z + Math.cos(b) * 12;
      const a = Math.atan2(px - g.x, pz - g.z);
      if (!g.arms.some((q) => Math.abs(Math.atan2(Math.sin(q - a), Math.cos(q - a))) < 0.4)) g.arms.push(a);
    }
    add(g);
  }

  // ---- the causeway's grand ones, where its waymarkers stood
  {
    const T = TR.find((t) => t.id === 'causeway'), len = T.pts[T.pts.length - 1].s;
    let n = 0;
    for (let s = 38; s < len - 26; s += 40, n++) {
      const p = pointAt(T, s), side = n % 2 ? 1 : -1;
      const x = p.x - p.dz * side * 2.9, z = p.z + p.dx * side * 2.9;
      if (near(x, z, 9, () => true)) continue;
      add(make(x, z, p.dx, p.dz, 'grand'));
    }
  }

  // ---- along the leads
  for (const T of TR) {
    if (T.id === 'causeway' || T.cls === 'kerb') continue;
    const len = T.pts[T.pts.length - 1].s;
    // a way's first stands 20-30 m from its head, where a walker leaving the junction looks for it; then every
    // 30-55 m, tried again every 6 m where another stands too near
    let s = T.cls === 'way' ? 20 : 14, n = 0;
    while (s < len - 6) {
      const p = pointAt(T, s);
      const wood = regionAt(p.x, p.z, _rw).wood || 0;
      const spacing = 55 - 25 * smoothstep(0.2, 0.7, wood);
      const first = T.cls === 'way' && n === 0 && s < 32;
      if (near(p.x, p.z, first ? 12 : spacing * 0.5, () => true)) { s += 6; continue; }
      {
        let done = false;
        for (const ds of [0, 4, -4, 8, -8]) {
          const q = pointAt(T, s + ds), side = (n + Math.floor(hx(q.x, q.z, 3) * 4)) % 2 ? 1 : -1;
          for (const sd of [side, -side]) {
            const off = T.w + 0.95;
            const x = q.x - q.dz * sd * off, z = q.z + q.dx * sd * off;
            if (clearAt(x, z, 0.6)) { add(make(x, z, q.dx, q.dz, first ? 'head' : 'along', { lead: T.id })); done = true; break; }
          }
          if (done) break;
        }
        n++;
      }
      s += spacing;
    }
  }

  // ---- in sight at every point: raise one wherever a walker could see none
  const seen = (x, z) => near(x, z, SIGHT, (g) => g.visible && sees(x, z, g.x, g.top, g.z));
  for (const T of TR) {
    const len = T.pts[T.pts.length - 1].s;
    for (let s = 0; s <= len; s += STEP) {
      const p = pointAt(T, s);
      if (seen(p.x, p.z)) continue;
      let ok = false;
      for (const ds of [8, 4, 12, 0, 16, -4, 20, -8]) {
        const q = pointAt(T, Math.min(len, s + ds));
        for (const sd0 of [1, -1, 1.6, -1.6]) {
          const sd = Math.sign(sd0), off = (T.id === 'causeway' ? 2.9 : T.w + 0.95) * Math.abs(sd0);
          const x = q.x - q.dz * sd * off, z = q.z + q.dx * sd * off;
          if (!clearAt(x, z, T.id === 'causeway' ? 0.5 : 0.55)) continue;
          const g = make(x, z, q.dx, q.dz, T.id === 'causeway' ? 'grand' : 'sight', { lead: T.id });
          if (!sees(p.x, p.z, g.x, g.top, g.z)) continue;
          add(g); ok = true; break;
        }
        if (ok) break;
      }
    }
  }
  return { gnomons: G, junctions: J, tracks: TR };
}
