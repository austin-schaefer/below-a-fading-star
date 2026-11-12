// DM The Link-Boy (plans/IDEAS-v5.md DM; plans/wilderness-v5.md "### DM"): a thin youth in a long coat carrying a flaming link, who
// meets you on the lead paths between places and walks ahead of you, ten metres off, lighting the way to the next
// landmark. He never speaks and never looks back; at the place he stands aside and goes back the way he came. His light
// throws the drystone walls' and the heather's shadows swinging across the ground as he walks.
//
// One figure for the map. Post: at SITES.linkBoy, P4's west end by the Lynchets' east wall, facing along P4. Meet: when
// you are on a path lead (P1-P17, within 1.5 m, moving along it) or heading for one end of one (off it, within 60 m of
// that end, your way within 45 degrees of it), and he is free, he waits just off that end facing along it; he is placed
// there only while the spot is out of view (the camera's frustum widened by 10 degrees, his feet, head, flame and four
// points of his pool) and 40 m or more from you; once you are on the lead, 10 m ahead of you on it, again only out of
// view. P4 he leads only from his post. Lead: within 12 m he steps on and walks to the far end, 10 m of arc length ahead
// of you (to 3.6 m/s, his stride to 1.8 m); stops when you stop; if you hurry he lets the gap close to 5 m and holds it at
// your speed; if you turn back or leave the lead by 10 m for 6 s he walks on to the end at 1.1 m/s. The place: 2 m off the
// line on the side away from what continues, facing the line, until you have passed within 4 m or 20 s. Back: 1.1 m/s
// the way he came; out of view and 40 m off he is free, and goes back unseen to his post. One lead at a time, each at
// most once in 5 minutes. One real PointLight at the flame, built at load and kept live. v7.1: the line he walks keeps
// out of the colliders (ensure(), below), so he never walks through the Span's piers where a lead does.
import * as THREE from 'three';
import { clamp, smoothstep, lerp, hyp } from '../../noise.js';
import { Track, Gait, figurePainter, figureMesh, rootMatrix, about, hang, point, easeYaw, standGround, TAU, DEG } from './gait.js';
import { SITES, LANDMARKS } from '../../world.js';
import { nearestLead } from '../../v4/paths/routes.js';
import { buildShadowDisc } from './shadow.js';
import { angDiff, approach } from '../../fauna/uncanny/kit.js';
import { LIVERY, lv, stole, badge, collar } from '../../v8/livery.js';

const H = 1.7, WALK = 3.6, SLOW = 1.1, GAP = 10, GAP_HURRY = 5, NEAR = 12, FAR = 40, HEAD = 60, AWAY = 10, LOST_T = 6, ASIDE = 2, ASIDE_T = 20, PASS = 4, COOL = 300;
// the light: between PALETTE.ember (#e8591a) and the Kept Fire's #ff8a3a, half its 22 cd, reach 14 m
export const LINK_LIGHT = { colour: '#f4722a', i0: 11, dist: 14 };
const SH_R = [-0.19, 1.34, 0.0], SH_L = [0.19, 1.34, 0.0];
const HAND_R = [-0.25, 1.36, 0.22], HAND_L = [0.22, 0.8, 0.03];
const KNEE = [[0.085, 0.5, 0.0], [-0.085, 0.5, 0.0]];
const LINK_TOP = 0.56; // the link's head above the hand
const COAT = lv('#14110f', LIVERY.coat), COAT_HI = lv('#1f1914', LIVERY.coatHi), HOSE = lv('#1b1613', '#24262b'), BOOT = '#0d0b09', SKIN = '#715649', HAIR = '#0e0b0a', WOOD = '#1d140d', TOW = '#2a1a10';
const PARTS = 6; // 0 body, 1 left shin, 2 right shin, 3 left arm, 4 right arm, 5 the link

function table(tab, v) {
  for (let k = 0; k < tab.length - 1; k++) if (v <= tab[k + 1][0]) { const t = (v - tab[k][0]) / (tab[k + 1][0] - tab[k][0]); return lerp(tab[k][1], tab[k + 1][1], smoothstep(0, 1, t)); }
  return tab[tab.length - 1][1];
}
const R_COAT = [[0, 0.235], [0.28, 0.2], [0.5, 0.165], [0.6, 0.15], [0.82, 0.18], [0.94, 0.195], [1, 0.07]];

function paint(n2, low) {
  const P = figurePainter();
  P.part(0);
  // the coat: long, to the shins, thin shoulders; worn
  P.grid(low ? 16 : 24, low ? 10 : 14, (u, v, o) => {
    const a = u * TAU, y = 0.42 + v * 0.98, side = Math.sin(a);
    const r = table(R_COAT, v), fold = 1 + (0.07 * (1 - v) + 0.015) * Math.pow(Math.abs(Math.sin(a * 6 + 0.5 * Math.sin(a * 3))), 0.6);
    P.paint(n2(a * 3 + 4, v * 7) > 0.5 ? COAT_HI : COAT, 0, 0.96);
    P.hem(smoothstep(0.4, 0, v));
    o[0] = Math.cos(a) * r * fold; o[1] = y + (v < 0.01 ? 0.01 * Math.sin(a * 7) : 0); o[2] = side * r * lerp(0.75, 0.6, smoothstep(0.6, 0.95, v)) * fold + 0.015 * v;
  }, false, false);
  P.hem(0);
  if (!LIVERY.on) { P.paint(COAT, 0, 0.95); P.lathe(0, 1.4, 0.0, [[0.085, 0], [0.075, 0.07], [0.08, 0.1]], low ? 8 : 12); } // the collar up
  else {
    // v8-06 the livery: the Heliarch collar; a stole made for a bigger man, its ends down to his boots and dragging,
    // and a badge too big for his chest
    collar(P, 0, 1.39, 0.0, 0.085, 0.14, COAT, { sides: low ? 10 : 12, gap: 0.5 });
    const front = (y) => { const v = clamp((y - 0.42) / 0.98, 0, 1); return table(R_COAT, v) * lerp(0.75, 0.6, smoothstep(0.6, 0.95, v)) * 1.08 + 0.015 * v + 0.014; };
    for (const sx of [-1, 1]) {
      const ys = [1.42, 1.3, 1.12, 0.92, 0.72, 0.52, 0.34, 0.16, 0.03];
      const pts = ys.map((y, i) => [sx * (0.085 + 0.006 * i), y, i === 0 ? 0.08 : y > 0.42 ? front(y) : front(0.42) + 0.02 + (0.42 - y) * 0.25]);
      pts.push([sx * 0.13, 0.012, pts[pts.length - 1][2] + 0.12]); // the end on the ground before him
      stole(P, pts, { w: 0.125, out: [0, 0.2, 1], seed: sx + 5, dirt: 0.35, fray: 0.05, each: (t) => P.hem(t > 0.4 ? (t - 0.4) * 0.7 : 0) });
    }
    P.hem(0);
    stole(P, [[-0.075, 1.42, 0.08], [-0.13, 1.44, 0.0], [-0.09, 1.45, -0.09], [0.09, 1.45, -0.09], [0.13, 1.44, 0.0], [0.075, 1.42, 0.08]], { w: 0.14, out: (t, p) => [p[0], 0.3, p[2]], fray: 0, dirt: 0, seed: 11 });
    badge(P, [0, 1.25, front(1.25) + 0.02], [0, 1, 0], [0, 0.1, 1], 0.15, { th: 0.012 });
  }
  P.paint(SKIN, 0, 0.8); P.blob(0, 1.56, 0.012, 0.07, 0.095, 0.085, low ? 8 : 10, 6);
  P.blob(0, 1.53, 0.09, 0.01, 0.013, 0.016, 4, 3);
  P.paint(HAIR, 0, 0.9); P.blob(0, 1.6, -0.005, 0.075, 0.07, 0.088, low ? 8 : 10, 5);
  // the lower legs, below the coat: hose and worn boots, each a rigid piece swinging from the knee
  for (const [k, kn] of [[1, KNEE[0]], [2, KNEE[1]]]) {
    P.part(k).paint(HOSE, 0, 0.9);
    P.loft([[kn[0], kn[1], kn[2]], [kn[0], 0.12, kn[2]]], [0.045, 0.036], low ? 5 : 6, 0, true);
    P.paint(BOOT, 0.05, 0.75);
    P.blob(kn[0], 0.06, 0.04, 0.042, 0.05, 0.11, 6, 4);
  }
  // arms: the left hanging, the right up at the shoulder holding the link
  P.part(3).paint(COAT, 0, 0.96);
  P.loft([[SH_L[0], SH_L[1], 0], [0.23, 1.08, 0.0], [HAND_L[0], HAND_L[1] + 0.07, HAND_L[2]]], [0.05, 0.045, 0.045], low ? 5 : 7, 0, true);
  P.paint(SKIN, 0, 0.8); P.blob(HAND_L[0], HAND_L[1], HAND_L[2], 0.026, 0.04, 0.026, 5, 3);
  P.part(4).paint(COAT, 0, 0.96);
  P.loft([[SH_R[0], SH_R[1], 0], [-0.3, 1.14, 0.08], [HAND_R[0], HAND_R[1] - 0.05, HAND_R[2] - 0.03]], [0.05, 0.045, 0.045], low ? 5 : 7, 0, true);
  P.paint(SKIN, 0, 0.8); P.blob(HAND_R[0], HAND_R[1], HAND_R[2], 0.03, 0.035, 0.03, 5, 3);
  // the link: a 0.7 m stave, its head a wrapped knot of pitch and tow, charred, a little ember in it
  P.part(5).paint(WOOD, 0, 0.85);
  P.loft([[HAND_R[0], HAND_R[1] - 0.14, HAND_R[2]], [HAND_R[0], HAND_R[1] + LINK_TOP - 0.08, HAND_R[2] + 0.02]], [0.018, 0.02], 5, 0, true);
  P.paint(TOW, 0, 0.9, 0.4); P.blob(HAND_R[0], HAND_R[1] + LINK_TOP - 0.06, HAND_R[2] + 0.02, 0.04, 0.04, 0.09, 6, 4);
  return P;
}

export function buildLinkBoy(ctx, F, cue) {
  const T = ctx.THREE;
  const low = ctx.quality === 'low';
  const G = standGround(ctx);
  const P = paint(ctx.noise.noise2, low);
  const fig = figureMesh(P, PARTS, 'walkers-linkboy', 1.0, 1.6);
  const root = new T.Group(); root.name = 'walkers-linkboy-root'; root.add(fig.mesh);
  const parts = fig.parts;

  // the leads he walks: every line of every path lead (never the rivulets or K1)
  const recs = [];
  for (const L of ctx._walkerLeads) {
    if (L.kind !== 'path') continue;
    L.lines.forEach((S, li) => { const tr = new Track(S); if (tr.length > 15) recs.push({ id: L.id, key: `${L.id}:${li}`, li, track: tr, last: -1e9 }); });
  }
  const recOf = (id, li = 0) => recs.find((r) => r.id === id && r.li === li);

  // ---- v7.1: his line keeps out of the colliders. Some leads run through the Great Span's piers (and past a few
  // posts and ruins): the paths are drawn on the ground under them, but a walker is pushed round. So the line he
  // walks is the lead's own samples wherever they are clear of every collider (the controls' list, capped ones where
  // the ground is within their height) by PAD, and round each blocked stretch a short route found on a 0.5 m grid
  // and pulled straight, every straight piece of it clear. Built for a lead the first time he takes it (and again
  // if the list has grown), once: nothing per frame.
  const CL = ctx.controls?.state?.colliders || [];
  const PAD = 0.35;
  // a capped collider counts where the ground is within its height: judged once, at its centre
  const capMemo = new Map();
  const capOk = (c) => {
    if (c.h === undefined) return true;
    let v = capMemo.get(c);
    if (v === undefined) { const gy = ctx.terrain.heightAt(c.x, c.z); v = !(gy > c.y + c.h || gy < c.y - 0.5); capMemo.set(c, v); }
    return v;
  };
  const ptHit = (list, x, z, pad) => {
    for (const c of list) { const dx = x - c.x, dz = z - c.z, r = c.r + pad; if (dx * dx + dz * dz < r * r && capOk(c)) return true; }
    return false;
  };
  const segHit = (list, ax, az, bx, bz, pad) => {
    const ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez || 1e-9;
    for (const c of list) {
      const t = clamp(((c.x - ax) * ex + (c.z - az) * ez) / l2, 0, 1), qx = ax + ex * t, qz = az + ez * t, dx = qx - c.x, dz = qz - c.z, r = c.r + pad;
      if (dx * dx + dz * dz < r * r && capOk(c)) return true;
    }
    return false;
  };
  function nearColliders(xs, zs, margin) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < xs.length; i++) { x0 = Math.min(x0, xs[i]); x1 = Math.max(x1, xs[i]); z0 = Math.min(z0, zs[i]); z1 = Math.max(z1, zs[i]); }
    return CL.filter((c) => c.x + c.r + margin > x0 && c.x - c.r - margin < x1 && c.z + c.r + margin > z0 && c.z - c.r - margin < z1);
  }
  // a clear route from (ax, az) to (bx, bz) round the colliders in list: A* on a 0.5 m grid, then pulled straight
  function route(list, ax, az, bx, bz) {
    for (const M of [6, 16, 32]) { const r = routeIn(list, ax, az, bx, bz, M); if (r) return r; }
    return null;
  }
  function routeIn(list, ax, az, bx, bz, M) {
    const CELL = 0.5;
    let x0 = Math.min(ax, bx) - M, x1 = Math.max(ax, bx) + M, z0 = Math.min(az, bz) - M, z1 = Math.max(az, bz) + M;
    for (const c of list) if (segHit([c], ax, az, bx, bz, PAD + 1)) { x0 = Math.min(x0, c.x - c.r - M); x1 = Math.max(x1, c.x + c.r + M); z0 = Math.min(z0, c.z - c.r - M); z1 = Math.max(z1, c.z + c.r + M); }
    const nx = Math.ceil((x1 - x0) / CELL) + 1, nz = Math.ceil((z1 - z0) / CELL) + 1;
    if (nx * nz > 160000) return null;
    const local = list.filter((c) => c.x + c.r + 1 > x0 && c.x - c.r - 1 < x1 && c.z + c.r + 1 > z0 && c.z - c.r - 1 < z1);
    const block = new Uint8Array(nx * nz);
    for (const c of local) { // each collider marks the cells under it, grown by PAD and a little
      const r = c.r + PAD + 0.3, i0 = Math.max(0, Math.floor((c.x - r - x0) / CELL)), i1 = Math.min(nx - 1, Math.ceil((c.x + r - x0) / CELL));
      const j0 = Math.max(0, Math.floor((c.z - r - z0) / CELL)), j1 = Math.min(nz - 1, Math.ceil((c.z + r - z0) / CELL));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const k = j * nx + i, x = x0 + i * CELL, z = z0 + j * CELL, dx = x - c.x, dz = z - c.z;
        if (!block[k] && dx * dx + dz * dz < r * r && capOk(c)) block[k] = 1;
      }
    }
    const cellOf = (x, z) => clamp(Math.round((z - z0) / CELL), 0, nz - 1) * nx + clamp(Math.round((x - x0) / CELL), 0, nx - 1);
    const a = cellOf(ax, az), b = cellOf(bx, bz);
    block[a] = 0; block[b] = 0;
    const g = new Float32Array(nx * nz).fill(Infinity), from = new Int32Array(nx * nz).fill(-1), done = new Uint8Array(nx * nz);
    const heur = (k) => { const i = k % nx, j = (k / nx) | 0, bi = b % nx, bj = (b / nx) | 0; return Math.hypot(i - bi, j - bj); };
    // a binary heap of cells by f
    const heap = [], hf = [];
    const push = (k, f) => { heap.push(k); hf.push(f); let n = heap.length - 1; while (n > 0) { const p = (n - 1) >> 1; if (hf[p] <= hf[n]) break; [heap[p], heap[n]] = [heap[n], heap[p]]; [hf[p], hf[n]] = [hf[n], hf[p]]; n = p; } };
    const pop = () => { const top = heap[0], lk = heap.pop(), lf = hf.pop(); if (heap.length) { heap[0] = lk; hf[0] = lf; let n = 0; for (;;) { const l = 2 * n + 1, r = l + 1; let m = n; if (l < heap.length && hf[l] < hf[m]) m = l; if (r < heap.length && hf[r] < hf[m]) m = r; if (m === n) break; [heap[m], heap[n]] = [heap[n], heap[m]]; [hf[m], hf[n]] = [hf[n], hf[m]]; n = m; } } return top; };
    g[a] = 0; push(a, heur(a));
    while (heap.length) {
      const k = pop();
      if (done[k]) continue; done[k] = 1;
      if (k === b) break;
      const i = k % nx, j = (k / nx) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) continue;
        const q = jj * nx + ii;
        if (block[q] || done[q]) continue;
        const ng = g[k] + (di && dj ? Math.SQRT2 : 1);
        if (ng < g[q]) { g[q] = ng; from[q] = k; push(q, ng + heur(q)); }
      }
    }
    if (from[b] < 0) return null;
    const cells = []; for (let k = b; k >= 0; k = from[k]) cells.push(k);
    cells.reverse();
    const P = cells.map((k) => [x0 + (k % nx) * CELL, z0 + ((k / nx) | 0) * CELL]);
    P[0] = [ax, az]; P[P.length - 1] = [bx, bz];
    // pulled straight: from each kept point, on to the farthest point it sees clear
    const out = [P[0]];
    let c = 0;
    while (c < P.length - 1) {
      let f = P.length - 1;
      while (f > c + 1 && segHit(local, P[c][0], P[c][1], P[f][0], P[f][1], PAD)) f--;
      if (segHit(local, P[c][0], P[c][1], P[f][0], P[f][1], PAD)) return null;
      out.push(P[f]); c = f;
    }
    return out;
  }
  function ensure(rec) {
    if (!rec || rec.built === CL.length) return rec;
    rec.built = CL.length;
    const tr = rec.orig || (rec.orig = rec.track);
    const list = nearColliders(tr.x, tr.z, PAD + 1);
    // an end inside a collider (P13 starts on the pit's rim ring): his line starts at the first clear point along it
    let sa = 0, sb = tr.length;
    while (sa < Math.min(15, tr.length / 3)) { const p = tr.at(sa, at2); if (!ptHit(list, p.x, p.z, PAD)) break; sa += 0.25; }
    while (sb > tr.length - Math.min(15, tr.length / 3)) { const p = tr.at(sb, at2); if (!ptHit(list, p.x, p.z, PAD)) break; sb -= 0.25; }
    const xa = [], za = [];
    { const p = tr.at(sa, at2); xa.push(p.x); za.push(p.z); }
    for (let i = 0; i < tr.n; i++) if (tr.s[i] > sa + 1e-3 && tr.s[i] < sb - 1e-3) { xa.push(tr.x[i]); za.push(tr.z[i]); }
    { const p = tr.at(sb, at2); xa.push(p.x); za.push(p.z); }
    const n = xa.length, xs = xa, zs = za;
    const bad = new Uint8Array(Math.max(0, n - 1));
    let any = false;
    for (let i = 0; i < n - 1; i++) if (segHit(list, xs[i], zs[i], xs[i + 1], zs[i + 1], PAD)) { bad[i] = 1; any = true; }
    if (!any && sa === 0 && sb === tr.length) { rec.track = tr; rec.detours = 0; return rec; }
    // the blocked stretches (from sample i to sample j), two less than 12 m apart taken as one, so a clear pocket
    // between two blocks (under the Span's east arch, shut by the fallen bay) is passed by, not walked into and out of
    const runs = [];
    for (let i = 0; i < n - 1;) {
      if (!bad[i]) { i++; continue; }
      let j = i; while (j < n - 1 && bad[j]) j++;
      const last = runs[runs.length - 1];
      let gap = 0; if (last) for (let k = last[1]; k < i; k++) gap += hyp(xs[k + 1] - xs[k], zs[k + 1] - zs[k]);
      if (last && gap < 12) last[1] = j; else runs.push([i, j]);
      i = j;
    }
    const pts = [[xs[0], zs[0]]];
    let detours = 0, at0 = 0;
    for (const [i, j] of runs) {
      for (let k = at0 + 1; k <= i; k++) pts.push([xs[k], zs[k]]);
      const r = i > 0 || j < n - 1 ? route(list, xs[i], zs[i], xs[j], zs[j]) : null;
      if (r) { for (let k = 1; k < r.length; k++) pts.push(r[k]); detours++; }
      else for (let k = i + 1; k <= j; k++) pts.push([xs[k], zs[k]]);
      at0 = j;
    }
    for (let k = at0 + 1; k < n; k++) pts.push([xs[k], zs[k]]);
    let acc = 0;
    const samples = pts.map((p, k) => { if (k) acc += hyp(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1]); return { x: p[0], z: p[1], s: acc }; });
    rec.track = new Track(samples); rec.detours = detours;
    return rec;
  }
  // the clear side and distance for a step off the line at arc length s (its perpendicular from the line clear too):
  // the wanted side first, then the other, each from want down to 0.5 m; or { side, off: 0 }
  const offPick = { side: 1, off: 0 };
  function clearOff(rec, s, side, want) {
    const p = rec.track.at(s, at2), list = nearColliders([p.x], [p.z], want + PAD + 1);
    for (const sd of [side, -side]) for (let o = want; o >= 0.49; o -= 0.5) {
      const x = p.x + p.tz * o * sd, z = p.z - p.tx * o * sd;
      if (!segHit(list, p.x, p.z, x, z, PAD)) { offPick.side = sd; offPick.off = o; return offPick; }
    }
    offPick.side = side; offPick.off = 0; return offPick;
  }
  const P4 = recOf('P4');
  // the post: P4's west end, by the Lynchets' east wall; facing along P4
  const post = { x: SITES.linkBoy.x, z: SITES.linkBoy.z, yaw: 0 };
  post.yaw = P4.track.heading(P4.track.length - 2) + Math.PI;

  // the light
  const light = new T.PointLight(new T.Color(LINK_LIGHT.colour), LINK_LIGHT.i0, LINK_LIGHT.dist, 2);
  light.name = 'walkers-link-light';
  const disc = buildShadowDisc(ctx, G.mesh);

  // the state
  const S = {
    mode: 'post', rec: P4, s: P4.track.length, dir: -1, x: post.x, z: post.z, yaw: post.yaw, v: 0, t: 0, lost: 0, off: 0, offSide: 1, offTarget: 0,
    asideT: 0, held: false, leads: 0, placed: [], wait: null, swayT: 0, from: 'post',
  };
  const at = { x: 0, z: 0, tx: 0, tz: 1 }, at2 = { x: 0, z: 0, tx: 0, tz: 1 }, proj = { s: 0, d: 0 };
  const gait = new Gait('linkboy', H, (v) => lerp(0.75, 1.8, clamp((v - SLOW) / (WALK - SLOW), 0, 1)), (f, i) => { cueP.x = S.x; cueP.y = G(S.x, S.z); cueP.z = S.z; cue('linkboy-step', cueP); });
  const cueP = { x: 0, y: 0, z: 0 };
  const cam = ctx.camera, camP = cam.position;
  const walker = { x: 0, z: 0, vx: 0, vz: 0, init: false };
  function readWalker(dt) {
    if (!walker.init || hyp(camP.x - walker.x, camP.z - walker.z) > 8) { walker.x = camP.x; walker.z = camP.z; walker.vx = walker.vz = 0; walker.init = true; return; }
    if (dt > 0) { const k = 1 - Math.exp(-6 * dt); walker.vx += ((camP.x - walker.x) / dt - walker.vx) * k; walker.vz += ((camP.z - walker.z) / dt - walker.vz) * k; }
    walker.x = camP.x; walker.z = camP.z;
  }

  // ---- out of view: the camera's frustum widened by 10 degrees on every side, for his body, flame and pool
  const v3 = new T.Vector3();
  function pointSeen(x, y, z, margin) {
    v3.set(x, y, z).applyMatrix4(cam.matrixWorldInverse);
    if (v3.z > -0.05) return false;
    const hv = (cam.fov * DEG) / 2 + margin, hh = Math.atan(Math.tan((cam.fov * DEG) / 2) * cam.aspect) + margin;
    return Math.abs(v3.x / -v3.z) < Math.tan(Math.min(hh, 1.5)) && Math.abs(v3.y / -v3.z) < Math.tan(Math.min(hv, 1.5));
  }
  function seen(x, z, margin = 10 * DEG) {
    cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    const g = G.mesh(x, z);
    if (pointSeen(x, g + 0.1, z, margin) || pointSeen(x, g + 1.75, z, margin) || pointSeen(x, g + 2.1, z, margin)) return true;
    for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 2; if (pointSeen(x + Math.cos(a) * 5, G.mesh(x + Math.cos(a) * 5, z + Math.sin(a) * 5), z + Math.sin(a) * 5, margin)) return true; }
    return false;
  }
  function relocate(x, z, why) {
    const d = hyp(x - camP.x, z - camP.z);
    S.placed.push({ t: ctx.time.t, x, z, why, d, seen: seen(x, z, 0), seenFrom: seen(S.x, S.z, 0) });
    if (S.placed.length > 40) S.placed.shift();
    S.x = x; S.z = z;
  }

  // ---- choosing a lead
  const endPt = (rec, e) => rec.track.at(e ? rec.track.length : 0, at2);
  function spotAt(rec, e, out) { // just off end e, facing along the lead
    const tr = ensure(rec).track, s = e ? tr.length - 0.6 : 0.6, sd = e ? -1 : 1;
    const o = clearOff(rec, s, 1, 1.1), p = tr.at(s, at2);
    out.x = p.x + p.tz * o.off * o.side; out.z = p.z - p.tx * o.off * o.side; out.off = o.off; out.side = o.side;
    out.s = s; out.dir = sd; out.yaw = tr.heading(s) + (sd < 0 ? Math.PI : 0);
    return out;
  }
  const spot = { x: 0, z: 0, s: 0, dir: 1, yaw: 0, off: 0, side: 1 };
  function candidate(t) {
    const sp = hyp(walker.vx, walker.vz);
    // on a path lead, moving along it
    const h = nearestLead(walker.x, walker.z, 1.5);
    if (h && h.kind === 'path' && h.id !== 'P4' && sp > 0.8) {
      for (const rec of recs) {
        if (rec.id !== h.id || t - rec.last < COOL) continue;
        rec.track.project(walker.x, walker.z, proj);
        if (proj.d > 2) continue;
        const tg = rec.track.at(proj.s, at2), along = (walker.vx * tg.tx + walker.vz * tg.tz) / sp;
        if (Math.abs(along) < 0.7) continue;
        return { rec, kind: 'on', dir: along > 0 ? 1 : -1, ws: proj.s };
      }
    }
    // heading for an end, from off the lead
    if (sp < 0.8) return null;
    for (const rec of recs) {
      if (t - rec.last < COOL) continue;
      for (const e of [0, 1]) {
        if (rec === P4 && e === 0) continue; // P4: only from the post, at its west end
        const p = endPt(rec, e), dx = p.x - walker.x, dz = p.z - walker.z, d = hyp(dx, dz);
        if (d > HEAD || d < 2) continue;
        if ((walker.vx * dx + walker.vz * dz) / (sp * d) < Math.cos(45 * DEG)) continue;
        rec.track.project(walker.x, walker.z, proj);
        if (Math.abs(proj.s - (e ? rec.track.length : 0)) > 1.5) continue; // off it, beyond this end
        return { rec, kind: 'end', e, dir: e ? -1 : 1 };
      }
    }
    return null;
  }
  function startWait(c, t) {
    const rec = ensure(c.rec);
    if (c.kind === 'end') {
      spotAt(rec, c.e, spot);
      const atPost = rec === P4 && S.mode === 'post';
      if (!atPost) {
        if (hyp(spot.x - walker.x, spot.z - walker.z) < FAR || seen(spot.x, spot.z) || seen(S.x, S.z)) return false;
        relocate(spot.x, spot.z, `${rec.id} end`);
        S.rec = rec; S.s = spot.s; S.dir = spot.dir; S.off = spot.off; S.offSide = spot.side; S.yaw = spot.yaw;
      } else {
        // at his post already: where it lies off P4's end
        rec.track.project(post.x, post.z, proj);
        const p = rec.track.at(proj.s, at2), left = (post.x - p.x) * p.tz - (post.z - p.z) * p.tx;
        S.rec = rec; S.s = proj.s; S.dir = -1; S.off = proj.d; S.offSide = left >= 0 ? 1 : -1;
      }
    } else {
      rec.track.project(walker.x, walker.z, proj);
      const s = proj.s + c.dir * GAP;
      if (s < 2 || s > rec.track.length - 2) return false;
      const p = rec.track.at(s, at2);
      if (seen(p.x, p.z) || seen(S.x, S.z)) return false;
      relocate(p.x, p.z, `${rec.id} ahead`);
      S.rec = rec; S.s = s; S.dir = c.dir; S.off = 0; S.yaw = rec.track.heading(s) + (c.dir < 0 ? Math.PI : 0);
    }
    S.mode = 'wait'; S.t = 0;
    return true;
  }

  // ---- the walk along the current lead
  function placeOnLead() {
    const p = S.rec.track.at(S.s, at);
    S.x = p.x + p.tz * S.off * S.offSide; S.z = p.z - p.tx * S.off * S.offSide;
  }
  function leadYaw() { return S.rec.track.heading(S.s) + (S.dir < 0 ? Math.PI : 0); }
  function asideSide() {
    // the side away from what continues: the nearest landmark or site past the end, or any lead's end near it
    const tr = S.rec.track, e = S.dir > 0 ? tr.length : 0, p = tr.at(e, at2), tx = p.tx * S.dir, tz = p.tz * S.dir;
    let bx = tx, bz = tz, best = 70;
    for (const L of [...Object.values(LANDMARKS), ...Object.values(SITES)]) {
      if (L.x == null) continue;
      const d = hyp(L.x - p.x, L.z - p.z);
      if (d > 2 && d < best) { best = d; bx = (L.x - p.x) / d; bz = (L.z - p.z) / d; }
    }
    // left of the way is (tz, -tx); go to the other side from the continuation
    const left = bx * tz - bz * tx;
    return left > 0.05 ? -1 : 1;
  }

  const flame = new T.Vector3(), hand = new T.Vector3(), lean = new T.Vector3();
  let swing = 0;
  function pose(dt, t) {
    rootMatrix(parts[0], gait.bob, gait.roll);
    const sw = 25 * DEG * gait.s1;
    about(parts[1], parts[0], KNEE[0][0], KNEE[0][1], KNEE[0][2], -sw);
    about(parts[2], parts[0], KNEE[1][0], KNEE[1][1], KNEE[1][2], sw);
    about(parts[3], parts[0], SH_L[0], SH_L[1], SH_L[2], -12 * DEG * gait.s1);
    // the right arm holds the link up; it swings sideways with his stride (+-12 cm at the flame), and sways at rest
    S.swayT += dt;
    swing = 0.12 * gait.s1 + 0.03 * (1 - gait.m) * Math.sin(S.swayT * 0.7);
    about(parts[4], parts[0], SH_R[0], SH_R[1], SH_R[2], 0, 0, 0);
    parts[4].elements[12] += swing;
    parts[5].copy(parts[4]);
    fig.gait.x = 0.045 * -gait.s1;
    point(flame, parts[5], HAND_R[0], HAND_R[1] + LINK_TOP, HAND_R[2] + 0.02);
    root.updateMatrixWorld(true);
    flame.applyMatrix4(fig.mesh.matrixWorld);
    const fl = 1 + 0.15 * (0.5 * Math.sin(t * 2.3 * TAU) + 0.3 * Math.sin(t * 3.9 * TAU + 1.1) + 0.2 * Math.sin(t * 5.7 * TAU + 2.3));
    const vis = root.visible;
    light.position.copy(flame); light.position.y += 0.1;
    light.intensity = vis ? LINK_LIGHT.i0 * fl : 0;
    F.U.uLink.value.set(flame.x, flame.y, flame.z, vis ? fl : 0);
    const c = Math.sin(S.yaw), s = Math.cos(S.yaw);
    F.U.uLinkV.value.set(c * S.v, 0, s * S.v);
    fig.mat.userData.uEmit.value = 0.6 + 0.4 * fl;
  }

  function update(dt, t) {
    readWalker(dt);
    S.t += dt;
    const wd = hyp(walker.x - S.x, walker.z - S.z);
    let v = 0;
    if (!S.held) switch (S.mode) {
      case 'post': case 'free': {
        S.v = 0;
        const c = candidate(t);
        if (c) startWait(c, t);
        else if (S.mode === 'free' && hyp(post.x - walker.x, post.z - walker.z) >= FAR && !seen(post.x, post.z) && !seen(S.x, S.z)) {
          relocate(post.x, post.z, 'post'); S.mode = 'post'; S.rec = P4; S.s = P4.track.length; S.off = 0; S.yaw = post.yaw;
        }
        if (S.mode === 'post') S.yaw = easeYaw(S.yaw, post.yaw, dt, 0.5);
        break;
      }
      case 'wait': {
        // the walker within 12 m: he steps on and leads
        if (wd < NEAR) { S.mode = 'lead'; S.t = 0; S.lost = 0; S.rec.last = t; S.leads++; S.offTarget = 0; }
        else if (S.t > 90 && wd >= FAR && !seen(S.x, S.z)) { S.mode = 'free'; } // not come after 90 s: free again, to be put on the lead you are heading for
        break;
      }
      case 'lead': case 'onward': {
        const tr = S.rec.track;
        tr.project(walker.x, walker.z, proj);
        const ws = proj.s, gap = (S.s - ws) * S.dir;
        const tg = tr.at(ws, at2), along = (walker.vx * tg.tx + walker.vz * tg.tz) * S.dir, wsp = hyp(walker.vx, walker.vz);
        if (S.mode === 'lead') {
          S.lost = (proj.d > AWAY || along < -0.4) ? S.lost + dt : Math.max(0, S.lost - dt * 0.5);
          if (S.lost > LOST_T) { S.mode = 'onward'; S.t = 0; }
        }
        let target;
        if (S.mode === 'onward') target = SLOW;
        else {
          const hurry = wsp > 4.4;
          const want = hurry ? GAP_HURRY : GAP, vmax = hurry && gap < GAP_HURRY + 1 ? Math.max(WALK, wsp) : WALK;
          target = clamp(Math.max(0, along) + 1.2 * (want - gap), 0, vmax);
          if (along < 0.15 && gap >= want - 1.5) target = 0; // you have stopped: he stops, facing ahead
        }
        S.v = approach(S.v, target, 3, dt);
        S.s += S.dir * S.v * dt; v = S.v;
        S.off = approach(S.off, 0, 2.5, dt);
        S.yaw = easeYaw(S.yaw, leadYaw(), dt); // never looks back
        const end = S.dir > 0 ? tr.length : 0;
        if ((S.s - end) * S.dir >= -0.3) { S.s = end - S.dir * 0.3; S.mode = 'aside'; S.t = 0; const o = clearOff(S.rec, S.s, asideSide(), ASIDE); S.offSide = o.side; S.asideOff = o.off; S.v = 0; }
        placeOnLead();
        break;
      }
      case 'aside': {
        // 2 m off the line on the side away from what continues, facing the line
        const aOff = S.asideOff ?? ASIDE;
        S.off = approach(S.off, aOff, 2.2, dt); v = S.off < aOff - 0.1 ? 0.8 : 0;
        const p = S.rec.track.at(S.s, at2), fy = Math.atan2(-p.tz * S.offSide, p.tx * S.offSide);
        S.yaw = easeYaw(S.yaw, fy, dt);
        if (S.t > 2.5 && (wd < PASS || S.t > ASIDE_T)) S.passedNear = S.passedNear || wd < PASS;
        if (S.t > 2.5 && (S.passedNear && wd > PASS + 1 || S.t > ASIDE_T)) { S.mode = 'back'; S.t = 0; S.passedNear = false; }
        placeOnLead();
        break;
      }
      case 'back': {
        const tr = S.rec.track, home = S.dir > 0 ? 0 : tr.length;
        S.v = approach(S.v, (S.s - home) * S.dir > 0.5 && S.off < 0.05 ? SLOW : 0, 3, dt); v = Math.max(S.v, S.off > 0.05 ? 0.8 : 0);
        S.s -= S.dir * S.v * dt; S.off = approach(S.off, 0, 1.5, dt);
        S.yaw = easeYaw(S.yaw, leadYaw() + Math.PI, dt);
        placeOnLead();
        if (wd >= FAR && !seen(S.x, S.z)) { S.mode = 'free'; S.t = 0; }
        break;
      }
    }
    if (!S.held) gait.advance(dt, v);
    root.position.set(S.x, G(S.x, S.z) - 0.02, S.z); root.rotation.y = S.yaw;
    pose(dt, t);
    // the thread of smoke
    S.smoke = (S.smoke || 0) + dt;
    let n = 0;
    while (S.smoke >= 0.55 && n < 6) { S.smoke -= 0.55; F.born(F.K.lsmoke, flame.x, flame.y + 0.25, flame.z, t - S.smoke); n++; }
    // the drawn shadows, while he walks within 40 m of you; deeper as the sun gutters
    const walking = S.mode === 'lead' || S.mode === 'onward' || S.mode === 'back' || (S.mode === 'aside' && S.off < (S.asideOff ?? ASIDE) - 0.1) || S.held === 'walk';
    const f = ctx.sky?.flicker?.value ?? 1;
    const sx = -Math.cos(S.yaw) * swing, sz = Math.sin(S.yaw) * swing; // the flame's sideways offset in the world (local +x)
    disc.update(dt, walking && wd < FAR && root.visible, flame.x, flame.y, flame.z, sx, sz, 0.45 + 0.55 * (1 - f));
  }
  const busy = () => S.mode !== 'post';
  pose(0, 0);
  root.position.set(S.x, G(S.x, S.z) - 0.02, S.z); root.rotation.y = S.yaw;
  ctx.registerUpdate(update, { at: () => (busy() ? camP : root.position), near: 80, hz: 1 });

  const api = {
    root, mesh: fig.mesh, light, disc: disc.mesh, flame,
    get state() { return { mode: S.mode, id: S.rec?.id, s: S.s, dir: S.dir, x: S.x, z: S.z, yaw: S.yaw, v: S.v, off: S.off, leads: S.leads, placed: S.placed.slice(), obstacles: disc.obstacles, shadows: disc.mesh.visible, light: light.intensity }; },
    post,
    leads: recs.map((r) => ({ id: r.id, li: r.li, length: r.track.length })),
    // lead(id, s, dir = 1): pose him walking on that lead at arc length s, mid-stride, and hold; returns his spot and a
    // point 15 m behind him on the lead facing him (for a view); lead(null) lets him go on leading
    lead(id, s, dir = 1, behind = 15, li = 0) {
      if (id === null) { S.held = false; S.mode = 'lead'; S.t = 0; return api.state; }
      const rec = ensure(recOf(id, li)); S.rec = rec; S.dir = dir; S.s = clamp(s, 0, rec.track.length); S.off = 0; S.mode = 'lead'; S.held = 'walk'; S.v = WALK;
      S.yaw = leadYaw(); placeOnLead();
      gait.phase = 0.25; gait.m = 1; gait.advance(0, 0);
      gait.m = 1; gait.s1 = 1;
      root.position.set(S.x, G(S.x, S.z) - 0.02, S.z); root.rotation.y = S.yaw; pose(0, ctx.time.t);
      const b = rec.track.at(S.s - dir * behind, at2), byaw = Math.atan2(-(S.x - b.x), -(S.z - b.z));
      return { x: S.x, z: S.z, yaw: S.yaw, behind: { x: b.x, z: b.z, yaw: byaw } };
    },
    // aside(id, e = 1): pose him standing aside at end e of a lead, and hold
    aside(id, e = 1) {
      const rec = ensure(recOf(id)); S.rec = rec; S.dir = e ? 1 : -1; S.s = e ? rec.track.length - 0.3 : 0.3;
      const o = clearOff(rec, S.s, asideSide(), ASIDE); S.offSide = o.side; S.off = S.asideOff = o.off; S.mode = 'aside'; S.held = true; S.v = 0;
      placeOnLead(); const p = rec.track.at(S.s, at2); S.yaw = Math.atan2(-p.tz * S.offSide, p.tx * S.offSide);
      gait.m = 0; gait.s1 = 0; gait.bob = 0; gait.roll = 0;
      root.position.set(S.x, G(S.x, S.z) - 0.02, S.z); root.rotation.y = S.yaw; pose(0, ctx.time.t);
      return { x: S.x, z: S.z, yaw: S.yaw, end: [p.x, p.z] };
    },
    release() { S.held = false; },
    // sim(seconds, dt): run his update that long at once (tests), with the camera where it is
    sim(sec, dt = 0.1) { let t = ctx.time.t; for (let k = 0; k < sec / dt; k++) { t += dt; update(dt, t); } return api.state; },
    // walkLine(id, li): the line he walks on that lead, [[x, z], ...]
    walkLine(id, li = 0) { const tr = ensure(recOf(id, li)).track, o = []; for (let i = 0; i < tr.n; i++) o.push([tr.x[i], tr.z[i]]); return o; },
    reset() { S.held = false; S.mode = 'post'; S.rec = P4; S.s = P4.track.length; S.off = 0; S.x = post.x; S.z = post.z; S.yaw = post.yaw; for (const r of recs) r.last = -1e9; S.placed.length = 0; },
    seen: (x, z, m) => seen(x, z, m),
    stats() { return { calls: 1 + (disc.mesh.visible ? 1 : 0), tris: fig.tris + (disc.mesh.visible ? disc.mesh.geometry.index.count / 3 : 0), lights: 1 }; },
  };
  return { api, light, disc: disc.mesh };
}
