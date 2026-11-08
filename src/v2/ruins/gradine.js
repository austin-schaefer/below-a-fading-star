// N. The Gradine [Proposed]: steps cut up the mountain wall into the haze. The flight starts above a
// grown man's head on a stub of cut rock (the lowest steps are long gone, lying broken in the gully),
// then climbs the wall north-east, tread after tread hollowed in the middle by feet, over the front range's
// crest, down into the trough behind it and up the main wall, through the band where the Annals run (110–130 m)
// and on until it thins into the rock and the mist, 165 m up. One merged geometry and one haze mesh (two draw
// calls, as v2's); every tread seated on the rendered ground; where the wall stands above a tread a notch is cut
// with a cheek of rock beside it; where the wall lies back shallower than the flight, a landing.
//
// The walker gets onto the flight by the fallen treads heaped against the stub's flank and can climb it to
// the landing at the walk limit (ctx.mountains.walkLimit), where the next treads have fallen away; the
// flight above is out of reach. ctx.gradine reports the foot, the landing, the band crossing and the top.
//
// `?gradine=v2` builds the stair as it stood through v4 instead (gradine/v2.js: 112 treads to 58 m, no
// walkable reach); only one of the two is ever built.
import * as THREE from 'three';
import { Builder, mat } from '../../structures/geo.js';
import { vary } from '../../structures/common.js';
import { wornBlock, recolor, reaux, stoneMesh, hazeMesh } from './util.js';
import { buildGradineV2 } from './gradine/v2.js';

const V2 = typeof location !== 'undefined' && new URLSearchParams(location.search).get('gradine') === 'v2';
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// The flight: tread width, run, rise; the height it climbs to; the band the Annals take (AK, kept clear of
// everything but the treads themselves: no haze sits in it).
const W = 2.8, D = 0.36, RISE = 0.33, TOP_Y = 165, MAX_STEPS = 520;
const BAND = { y0: 110, y1: 130 };
const LANDING = 2.0, LIMIT_LANDING = 2.4, GAP = 4; // the landing at the walk limit, and the treads fallen above it
const LIFT = 1.6; // the most a tread on the route rises (or falls) beyond one rise to keep to the ground

export function buildGradine(ctx, env) {
  if (V2) return buildGradineV2(ctx, env);
  const L = ctx.landmarks.gradine, G = env.ground, rng = ctx.makeRng(7201), N2 = ctx.noise.noise2;
  const low = ctx.quality === 'low';
  const B = new Builder(ctx.noise);
  const C = (h) => new THREE.Color(h);
  // the terrain's rock (terrain.js: scree, rock, dark rock), the palette's stone, and pale worn stone
  const cScree = C('#4a4644'), cRock = C('#3c3838'), cRockD = C('#262224'), cStone = C(ctx.palette.scree), cPale = C('#c9bba6');
  const tmp = new THREE.Color();
  const limitAt = (x, z) => ctx.mountains?.walkLimit ? ctx.mountains.walkLimit(x, z) : ctx.world.regionRadius + 48;

  // ---- lay out the flight ----
  // The lower flight, to the landing at the walk limit, takes a heading per tread as v2's did: north-east-by-north
  // (bearing 30°), so from the Yard and the Hypogeum the flight crosses the wall as a diagonal instead of
  // foreshortening into a vertical tick, each heading the one whose footprint best meets the next tread's height.
  // Beyond it lie the front range's crest, a trough and the main wall's cliffs, which a flight on one heading can
  // only tunnel into or bridge, so the upper flight follows a route found over them (routeUp, below), on the same
  // line, and keeps to the ground.
  const aNE = Math.atan2(-Math.cos(Math.PI / 6), Math.sin(Math.PI / 6));
  const base = { x: L.x - 1.2, z: L.z + 1.0 };
  const gBase = G.at(base.x, base.z);
  const steps = [];
  let a = aNE, px = base.x + Math.cos(a) * 1.1, pz = base.z + Math.sin(a) * 1.1;
  // the first tread: its riser's foot 2.2 m over the ground where you stand under it (the collider line)
  const stand = 1.7;
  let y = ctx.terrain.heightAt(px - Math.cos(a) * stand, pz - Math.sin(a) * stand) + 2.2 + RISE;
  const foot = (x, z, h, run, out) => {      // highest and lowest rendered ground under a tread footprint
    const fx = Math.cos(h), fz = Math.sin(h), rx = -fz, rz = fx;
    let hi = -Infinity, lo = Infinity;
    for (const [u, v] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5], [0, 0], [0, -0.5], [-0.25, 0.5], [0.25, 0.5]]) {
      const g = G.at(x + rx * u * W + fx * v * run, z + rz * u * W + fz * v * run);
      hi = Math.max(hi, g); lo = Math.min(lo, g);
    }
    out.hi = hi; out.lo = lo; return out;
  };
  const fp = { hi: 0, lo: 0 }, fq = { hi: 0, lo: 0 };
  let run = D, flat = false, lastLanding = 0, limitStep = -1;
  // push(dir): dir 0 for the lower flight; on the route 1 going up, -1 going down (the tread turned to face downhill)
  const push = (upper = 0) => {
    foot(px, pz, a, run, fp);
    if (!upper && steps.length > 0 && fp.hi + 0.03 > y) y = Math.min(fp.hi + 0.03, y + 0.2); // the wall steeper than the flight: lift a little, cut the rest
    if (upper) {                               // on the route: kept to the ground along its line, the risers taller where it is steep
      const gc = G.at(px, pz) + 0.08;
      if (gc > y) y = Math.min(gc, y + LIFT); else if (upper < 0 && gc < y - LIFT) y -= LIFT;
    }
    steps.push({ x: px, z: pz, a, y, hi: fp.hi, lo: fp.lo, run, landing: flat, down: upper < 0 });
    if (flat) lastLanding = steps.length - 1;
  };
  for (let i = 0; i < MAX_STEPS && limitStep < 0; i++) {
    push();
    let best = a, bestC = Infinity;
    for (let k = -4; k <= 4; k++) {
      const h = a + k * 0.03;
      if (Math.abs(h - aNE) > 0.75) continue;
      foot(px + Math.cos(h) * (run / 2 + D / 2), pz + Math.sin(h) * (run / 2 + D / 2), h, D, fq);
      const c = Math.abs(fq.hi - (y + RISE - 0.04)) + 0.25 * (fq.hi - fq.lo) + 0.35 * Math.abs(h - aNE) + 0.2 * Math.abs(k) * 0.03;
      if (c < bestC) { bestC = c; best = h; }
    }
    // the next tread: a landing at the walk limit (its far edge just inside), or where the wall lies back and
    // the next tread would stand well clear of the ground; otherwise one rise up
    let next = D, rise = RISE;
    const fx = Math.cos(best), fz = Math.sin(best);
    const cx = px + fx * (run / 2 + LIMIT_LANDING / 2), cz = pz + fz * (run / 2 + LIMIT_LANDING / 2);
    if (limitStep < 0 && i > 8 && Math.hypot(cx + fx * LIMIT_LANDING / 2, cz + fz * LIMIT_LANDING / 2) > limitAt(cx, cz) - 0.6) {
      // the landing at the walk limit: as deep as the wall lets it be without burying its back under the ground
      // (or lifting it more than a step); a riser of the lift up to it
      limitStep = i + 1; next = 1.2;
      for (const ln of [LIMIT_LANDING, 2.0, 1.6, 1.2]) {
        foot(px + fx * (run / 2 + ln / 2), pz + fz * (run / 2 + ln / 2), best, ln, fq);
        if (fq.hi + 0.03 <= y + 0.45) { next = ln; break; }
      }
      foot(px + fx * (run / 2 + next / 2), pz + fz * (run / 2 + next / 2), best, next, fq);
      rise = Math.min(0.38, Math.max(0, fq.hi + 0.03 - y));
    } else if (i > 8 && i - lastLanding > 12) {
      foot(px + fx * (run / 2 + D / 2), pz + fz * (run / 2 + D / 2), best, D, fq);
      if (fq.hi < y + RISE - 1.3) { next = LANDING; rise = 0; }
    }
    flat = next > D;
    a = best; px += fx * (run / 2 + next / 2); pz += fz * (run / 2 + next / 2); y += rise; run = next;
  }
  // the upper flight: along the route, kept to the ground: a tread up wherever the ground has risen to meet the
  // next one (its run deepening to 0.9 m where the face lies back a little, its riser taller where the face is
  // steep), a tread down where the route goes over a crest (the front range's) into the trough behind it, and a
  // landing where it lies level
  const route = routeUp(G, px, pz, a, TOP_Y + 2);
  const along = (sa, out) => {                 // the point and heading on the route at arc length sa (resampled every 0.25 m)
    const k = Math.min(route.n - 2, Math.max(0, Math.floor(sa / 0.25)));
    const t = Math.min(1, Math.max(0, (sa - route.s[k]) / 0.25));
    out.x = route.x[k] + (route.x[k + 1] - route.x[k]) * t; out.z = route.z[k] + (route.z[k + 1] - route.z[k]) * t;
    out.a = Math.atan2(route.z[k + 1] - route.z[k], route.x[k + 1] - route.x[k]);
    return out;
  };
  const P = { x: 0, z: 0, a: 0 };
  let s = 0, dir = 1;
  while (y < TOP_Y && steps.length < MAX_STEPS && s < route.len - 1) {
    along(s, P); px = P.x; pz = P.z; a = P.a;
    push(dir);
    let next = 0, dy = 0;
    for (const r of [D, 0.5, 0.7, 0.9]) {
      along(s + run / 2 + r / 2, P);
      const d = G.at(P.x, P.z) + 0.08 - y;
      if (d >= RISE - 0.15) { next = r; dy = RISE; break; }
      if (r === D && d <= -(RISE - 0.1)) { next = D; dy = -RISE; break; }
    }
    flat = next === 0;
    if (flat) next = LANDING;
    if (dy) dir = Math.sign(dy);
    s += run / 2 + next / 2; y += dy; run = next;
  }
  const N = steps.length;
  const top = steps[N - 1];

  // ---- which treads are gone or broken ----
  const fate = new Array(N).fill(0); // 0 whole, 1 missing (a stub), 2 one end broken off, 3 gone (nothing left)
  for (let i = 9; i < N; i++) {
    const hi = smooth(N - 110, N, i);
    const r = rng();
    if (steps[i].landing) continue;
    if (r < 0.035 + hi * 0.3) fate[i] = 1;
    else if (r < 0.1 + hi * 0.35) fate[i] = 2;
    else if (r < 0.1 + hi * 0.5) fate[i] = 3;
  }
  fate[23] = 1; fate[24] = 2; fate[47] = 1; fate[61] = 2; fate[62] = 1;
  if (limitStep > 0) {
    fate[limitStep] = 0;
    for (let k = 1; k <= GAP && limitStep + k < N; k++) fate[limitStep + k] = k === GAP ? 1 : 3; // fallen away above the landing
  }
  const reach = limitStep > 0 ? limitStep : 0; // the walkable flight is treads 0..reach

  // ---- the stub of rock the flight starts on, a broken first flight in the gully below ----
  const s0 = steps[0];
  const fx0 = Math.cos(s0.a), fz0 = Math.sin(s0.a), rx0 = -fz0, rz0 = fx0;
  for (let k = 0; k < 7; k++) {
    const s = steps[k], under = s.y - RISE - 0.05;
    const bottom = Math.min(s.lo, gBase) - 0.4;
    if (under - bottom < 0.3) continue;
    const h = under - bottom;
    const g = B.box(W + 0.7 + k * 0.1, h, D + 0.14, { chip: 0.12, seed: k * 13 });
    const from = B.count;
    B.add(g, mat(s.x, bottom + h / 2, s.z, 0, Math.PI / 2 - s.a, 0), { color: cRock, moss: 0.5, ground: gBase, disp: 0.09, dispScale: 1.6 });
    recolor(B, from, (x, yy, z, c) => c.copy(cScree).lerp(cRockD, 0.3 + 0.3 * (N2(x * 1.3, yy * 1.3 + z) * 0.5 + 0.5)));
  }
  // the first flight, broken off and lying where it fell
  for (let k = 0; k < 9; k++) {
    const d = 1.2 + rng() * 4.5, side = (rng() - 0.5) * 5.5;
    const x = base.x - fx0 * d + rx0 * side, z = base.z - fz0 * d + rz0 * side;
    const gy = G.at(x, z);
    const w = 0.7 + rng() * 1.4;
    const { g, wear } = wornBlock(B, w, RISE + 0.12, D + 0.05, { wear: 0.07, nose: 0.05, chip: 0.06, seed: 100 + k, nu: 5, nv: 3, off: (rng() - 0.5) * 1.5, notch: 0.3 });
    const from = B.count;
    B.add(g, mat(x, gy + 0.05, z, (rng() - 0.5) * 1.6, rng() * 6.28, (rng() - 0.5) * 1.6), { color: cStone, moss: 0.95, ground: gy - 0.2, disp: 0.02, dispScale: 2 });
    recolor(B, from, (xx, yy, zz, c, i) => c.copy(cStone).multiplyScalar(0.8).lerp(cPale, wear[i - from] * 0.5));
  }
  for (let k = 0; k < 26; k++) {
    const d = 0.6 + rng() * 6, side = (rng() - 0.5) * 7;
    const x = base.x - fx0 * d + rx0 * side, z = base.z - fz0 * d + rz0 * side;
    const s = 0.12 + rng() * 0.35, gy = G.at(x, z);
    B.add(B.rock(s, 0), mat(x, gy + s * 0.15, z, rng() * 3, rng() * 6, rng() * 3), { color: vary(cScree, rng, 0.2), moss: 0.8, ground: gy - 0.1, flat: true, disp: s * 0.1 });
  }

  // ---- the heap: treads of the first flight fallen against the stub's flank, on the side where the gully
  // stands higher; each a little under half a metre above the last, so a walker can clamber up onto the flight
  const heap = [];
  {
    const sideG = (sd) => G.at(s0.x + rx0 * sd * 3.2 + fx0 * 0.8, s0.z + rz0 * sd * 3.2 + fz0 * 0.8);
    const sd = sideG(1) >= sideG(-1) ? 1 : -1;
    const along = 0.75;                                    // centred on treads 1–3
    const target = steps[2].y - 0.42;                      // the last block's top: one easy step onto tread 2
    const g0 = sideG(sd);
    const n = Math.max(1, Math.ceil((target - g0) / 0.46));
    for (let k = 0; k < n; k++) {
      const u = sd * (W / 2 + 0.35 + 0.55 + (n - 1 - k) * 1.0);
      const x = s0.x + rx0 * u + fx0 * along, z = s0.z + rz0 * u + fz0 * along;
      const gy = Math.min(G.min(x, z, 0.7), target - 0.2);
      const topY = k === n - 1 ? target : Math.max(gy + 0.3, g0 + (target - g0) * (k + 1) / n);
      const h = topY - (gy - 0.35), bw = 1.05, bd = 1.5;
      const { g, wear } = wornBlock(B, bw, h, bd, { wear: 0.03, nose: 0.06, chip: 0.08, seed: 300 + k, nu: low ? 3 : 5, nv: 3, ny: 1, off: (rng() - 0.5) * 1.2 });
      const from = B.count;
      const yaw = Math.PI / 2 - s0.a + (rng() - 0.5) * 0.18;
      B.add(g, mat(x, gy - 0.35 + h / 2, z, 0, yaw, (rng() - 0.5) * 0.05), { color: cStone, moss: 0.8, ground: gy, disp: 0.025, dispScale: 2.2 });
      recolor(B, from, (xx, yy, zz, c, i) => c.copy(cStone).multiplyScalar(0.82).lerp(cScree, 0.3 * smooth(0, 1.2, topY - yy)).lerp(cPale, wear[i - from] * 0.35));
      heap.push({ x, z, y: topY, hw: bw / 2, hd: bd / 2, ca: Math.cos(s0.a), sa: Math.sin(s0.a), g: gy });
    }
  }

  // ---- the treads ----
  const yFoot = s0.y;
  for (let i = 0; i < N; i++) {
    const s = steps[i];
    if (fate[i] === 3) { s.top = null; continue; }
    const t = Math.min(1, (s.y - yFoot) / (TOP_Y - yFoot));   // how far up the climb
    const fade = smooth(N - 110, N - 2, i);                  // into the rock: narrower, rougher, rock-coloured
    const far = i > reach + 30;                              // beyond reach and seen from 60 m or more: fewer vertices
    const fx = Math.cos(s.a), fz = Math.sin(s.a), rx = -fz, rz = fx;
    const yaw = Math.PI / 2 - s.a;                           // local z (the riser) faces back down the flight
    const ry = s.down ? yaw : yaw + Math.PI;                 // going down into the trough, the nosing faces on downhill
    const w = W * (1 - 0.45 * fade) * (0.97 + rng() * 0.06);
    // block: from the tread down into the ground (or down onto the rock stub for the first ones)
    const bottom = i < 7 ? s.y - RISE - 0.12 : Math.min(s.lo, s.y - RISE) - 0.35;
    let topY = s.y;
    if (fate[i] === 1) topY = s.y - RISE * (i <= reach + GAP ? 0.3 + rng() * 0.25 : 0.55 + rng() * 0.4); // within reach, a stub you can still step on
    s.top = topY; s.w = w;
    const h = topY - bottom;
    if (h < 0.08) continue;
    const { g, wear } = wornBlock(B, w, h, s.run + 0.05, {
      wear: fate[i] === 1 ? 0 : (0.11 - 0.085 * t) * (1 - 0.6 * fade) * (0.8 + rng() * 0.4) * (s.landing ? 0.6 : 1),
      nose: (0.06 - 0.03 * t) * (1 - 0.5 * fade), chip: 0.04 + 0.06 * fade, seed: i * 3.7,
      nu: far ? 3 : low ? 5 : 9, nv: far ? 1 : low ? 2 : (s.landing ? 6 : 4), ny: 1, off: (rng() - 0.5) * 0.4,
      notch: fate[i] === 2 ? (rng() < 0.5 ? -1 : 1) * (0.15 + rng() * 0.2) : 0,
    });
    const from = B.count;
    B.add(g, mat(s.x, bottom + h / 2, s.z, 0, ry, 0), {
      color: cStone, moss: 0.35 + 0.4 * fade, ground: s.y - RISE * 1.5,
      disp: fate[i] === 1 ? 0.06 : 0.012 + 0.04 * fade, dispScale: fate[i] === 1 ? 2.2 : 2.6,
    });
    // colour: risers and the body in the terrain's rock, the treads paler where feet wore them,
    // fading toward the wall's own rock up the flight
    recolor(B, from, (x, yy, z, c, k) => {
      const wv = wear[k - from];
      const below = smooth(0.0, 0.9, s.y - yy);
      tmp.copy(cStone).lerp(cScree, 0.35 + 0.3 * fade).lerp(cRock, below * 0.8).lerp(cRockD, below * smooth(0.8, 2.5, s.y - yy) * 0.6);
      tmp.lerp(cPale, wv * (0.85 - 0.6 * fade) * (fate[i] === 1 ? 0 : 1));
      tmp.multiplyScalar(0.92 + 0.16 * (N2(x * 2.1 + i, z * 2.1) * 0.5 + 0.5));
      c.copy(tmp);
    });
    // worn hollows hold no moss; the cut body is damp low down
    reaux(B, from, (A, o, x, yy) => { A[o + 1] *= 1 - wear[(o / 4) - from] * 0.9; A[o + 3] = 0.08 * smooth(0.5, 2, s.y - yy); });

    const seg = far ? 2 : 0.75;
    // the notch: where the wall stands above the tread beside it, a cheek of cut rock
    if (fate[i] !== 1) for (const sd of [-1, 1]) {
      const ex = s.x + rx * sd * (w / 2 + 0.35), ez = s.z + rz * sd * (w / 2 + 0.35);
      const gs = Math.max(G.at(ex, ez), G.at(ex + fx * 0.3, ez + fz * 0.3));
      if (gs < s.y + 0.18) continue;
      const ch = gs - s.y + 0.35;
      const cg = B.box(0.42, ch, s.run + 0.1, { chip: 0.05, seed: i * 11 + sd, seg });
      const cf = B.count;
      B.add(cg, mat(s.x + rx * sd * (w / 2 + 0.2), s.y - 0.1 + ch / 2, s.z + rz * sd * (w / 2 + 0.2), 0, ry, 0), { color: cRock, moss: 0.6, ground: s.y, disp: 0.03, dispScale: 2.4 });
      recolor(B, cf, (x, yy, z, c) => c.copy(cRock).lerp(cScree, 0.3 + 0.3 * (N2(x * 1.7, yy * 1.7 + z) * 0.5 + 0.5)));
    }
    // a backing slab where the wall rises steeply behind the tread
    if (fate[i] !== 1 && i < N - 1) {
      const bx = s.x + fx * (s.run * 0.5 + 0.25), bz = s.z + fz * (s.run * 0.5 + 0.25);
      const gb = G.at(bx, bz);
      if (gb > steps[i + 1].y + 0.25) {
        const bh = gb - s.y + 0.2;
        const cf = B.count;
        B.add(B.box(w + 0.4, bh, 0.25, { chip: 0.04, seg }), mat(bx + fx * 0.05, s.y + bh / 2 - 0.05, bz + fz * 0.05, 0, ry, 0), { color: cRock, moss: 0.6, ground: s.y, disp: 0.03, dispScale: 2.4 });
        recolor(B, cf, (x, yy, z, c) => c.copy(cRock).lerp(cRockD, 0.4 * (N2(x * 1.9, yy * 1.9 - z) * 0.5 + 0.5)));
      }
    }
    // the broken treads of the lower flight went down into the gully: a piece of each lies at the foot
    if (fate[i] && i < 82) {
      const d = 1.5 + rng() * 5, side = (rng() - 0.5) * 6;
      const x = base.x - fx0 * d + rx0 * side, z = base.z - fz0 * d + rz0 * side, gy = G.at(x, z);
      const pw = 0.5 + rng() * 0.9;
      const fr = wornBlock(B, pw, RISE + 0.1, D + 0.04, { wear: 0.05, nose: 0.04, chip: 0.06, seed: i, nu: 4, nv: 2, notch: 0.35 });
      const ff = B.count;
      B.add(fr.g, mat(x, gy + 0.06, z, (rng() - 0.5) * 2, rng() * 6.28, (rng() - 0.5) * 2), { color: cStone, moss: 0.95, ground: gy - 0.2, disp: 0.02 });
      recolor(B, ff, (xx, yy, zz, c, k) => c.copy(cStone).multiplyScalar(0.8).lerp(cPale, fr.wear[k - ff] * 0.45));
    }
  }
  const mesh = stoneMesh(B, env.stone.mat, 'ruins-gradine');
  env.meshes.push(mesh);

  // ---- the haze the flight climbs into: thin wisps low on the flight, thickening with height, none in the
  // Annals' band, and soft banks closing over the last treads and the wall above them ----
  const haze = [];
  const inBand = (hy, size, squash) => hy + size * squash > BAND.y0 - 2 && hy - size * squash < BAND.y1 + 2;
  for (let i = 50; i < N; i += steps[i].y > BAND.y1 ? 1 : 2) {
    const s = steps[i];
    const lowMist = 0.03 + 0.1 * smooth(45, BAND.y0 - 6, s.y), above = smooth(BAND.y1 + 4, TOP_Y - 6, s.y);
    const it = { x: s.x + (rng() - 0.5) * 4, y: s.y + 0.8 + rng() * 2, z: s.z + (rng() - 0.5) * 4, size: 7 + 14 * above + rng() * 4, alpha: s.y > BAND.y1 ? 0.14 + 0.4 * above : lowMist, squash: 0.35 + rng() * 0.15 };
    if (!inBand(it.y, it.size, it.squash)) haze.push(it);
  }
  // banks closing over the last treads and the wall above them
  const fxT = Math.cos(top.a), fzT = Math.sin(top.a);
  for (let k = 0; k < 12; k++) {
    const d = -22 + k * 2;                       // along the last treads, lying on the face (not standing in the sky)
    const it = { x: top.x + fxT * d + (rng() - 0.5) * 8, y: steps[Math.max(0, N - 1 + Math.round(d / D))].y + 1 + rng() * 2, z: top.z + fzT * d + (rng() - 0.5) * 8, size: 16 + rng() * 10, alpha: 0.4 + rng() * 0.15, squash: 0.42 };
    if (!inBand(it.y, it.size, it.squash)) haze.push(it);
  }
  env.meshes.push(hazeMesh(ctx, haze, new THREE.Color('#6a5864'), 'ruins-gradine-haze'));

  // ---- walking: the heap and the flight to the landing at the walk limit are floors (ctx.addWalkable) ----
  // Each floor is a rectangle in its tread's frame; the lookup is a bounding-box test, then at most a few dozen
  // rectangles, allocating nothing.
  const R = reach + 1, WX = new Float32Array(R + heap.length), WZ = new Float32Array(WX.length), WY = new Float32Array(WX.length),
    WC = new Float32Array(WX.length), WS = new Float32Array(WX.length), WU = new Float32Array(WX.length), WV = new Float32Array(WX.length);
  let nw = 0, bx0 = Infinity, bx1 = -Infinity, bz0 = Infinity, bz1 = -Infinity;
  const floor = (x, z, yy, c, sn, hu, hv) => {
    WX[nw] = x; WZ[nw] = z; WY[nw] = yy; WC[nw] = c; WS[nw] = sn; WU[nw] = hu; WV[nw] = hv; nw++;
    const e = Math.hypot(hu, hv);
    bx0 = Math.min(bx0, x - e); bx1 = Math.max(bx1, x + e); bz0 = Math.min(bz0, z - e); bz1 = Math.max(bz1, z + e);
  };
  for (let i = 0; i <= reach; i++) {
    const s = steps[i];
    if (s.top === null || s.top === undefined) continue;
    floor(s.x, s.z, s.top - (fate[i] === 1 ? 0 : 0.03), Math.cos(s.a), Math.sin(s.a), s.w / 2 - 0.1, s.run / 2 + 0.03);
  }
  for (const hb of heap) floor(hb.x, hb.z, hb.y - 0.02, hb.ca, hb.sa, hb.hw, hb.hd);
  if (nw) ctx.addWalkable?.((x, z) => {
    if (x < bx0 || x > bx1 || z < bz0 || z > bz1) return null;
    let best = null;
    for (let k = 0; k < nw; k++) {
      const dx = x - WX[k], dz = z - WZ[k];
      const v = dx * WC[k] + dz * WS[k], u = -dx * WS[k] + dz * WC[k];
      if (u > WU[k] || u < -WU[k] || v > WV[k] || v < -WV[k]) continue;
      if (best === null || WY[k] > best) best = WY[k];
    }
    return best;
  });

  // ---- colliders, capped below each floor so they stop a walker on the ground and not one on the stair:
  // the stub's face, the stub's and the flight's sides where they stand clear of the ground, and the heap ----
  const capped = (x, z, r, top, g) => ctx.addCollider({ x, z, r, y: g - 1, h: top - (g - 1) });
  for (let u = -W / 2 - 0.4; u <= W / 2 + 0.41; u += 0.55) {
    const x = s0.x - fx0 * (D / 2 + 0.35) + rx0 * u, z = s0.z - fz0 * (D / 2 + 0.35) + rz0 * u;
    capped(x, z, 0.45, s0.y - 1.0, G.at(x, z));
  }
  let cols = 0;
  for (let i = 0; i <= reach; i++) {
    const s = steps[i];
    if (s.top === null || s.top === undefined) continue;
    const fx = Math.cos(s.a), fz = Math.sin(s.a), rx = -fz, rz = fx;
    for (const sd of [-1, 1]) {
      const off = i < 7 ? (W + 0.7) / 2 + 0.05 : s.w / 2 + 0.3;
      const x = s.x + rx * sd * off, z = s.z + rz * sd * off, g = G.at(x, z);
      if (g > s.top - 1.1) continue;
      capped(x, z, 0.35, s.top - 1.0, g); cols++;
    }
  }
  for (let k = 1; k < heap.length; k++) { const hb = heap[k]; capped(hb.x, hb.z, 0.5, hb.y - 0.9, hb.g); cols++; }

  // ---- what the build reports: the foot, the landing at the walk limit, the band crossing, the top ----
  const at = (i) => ({ i, x: +steps[i].x.toFixed(1), z: +steps[i].z.toFixed(1), y: +steps[i].y.toFixed(1) });
  const cross = (yy) => { for (let i = 0; i < N; i++) if (steps[i].y >= yy) return at(i); return null; };
  const landings = steps.map((s, i) => (s.landing ? i : -1)).filter((i) => i >= 0);
  ctx.gradine = {
    base: { x: base.x, z: base.z, y: gBase }, firstTread: { x: s0.x, z: s0.z, y: s0.y }, top: { x: top.x, z: top.z, y: top.y }, steps: N,
    reach: reach ? { ...at(reach), r: +Math.hypot(steps[reach].x, steps[reach].z).toFixed(1) } : null,
    band: { enter: cross(BAND.y0), leave: cross(BAND.y1) }, landings,
    // the way up for a walker: the heap's blocks from the gully, then the treads to the landing ([x, z, floor y])
    climb: [...heap.map((hb) => [hb.x, hb.z, hb.y]), ...steps.slice(2, reach + 1).filter((s) => s.top != null).map((s) => [s.x, s.z, s.top])],
  };
  return { steps: N, missing: fate.filter((f) => f === 1).length, broken: fate.filter((f) => f === 2).length, gone: fate.filter((f) => f === 3).length, top: Math.round(top.y), reach: reach ? Math.round(steps[reach].y) : 0, landings: landings.length, colliders: cols };
}

// The route over the face for the upper flight: the cheapest way on a 2 m grid from (x0, z0) to ground at goalY,
// within HALF of the flight's own line, where a step's cost is its length, raised where the ground falls (the
// flight goes down only over a crest) and steeply where it climbs faster than the flight's tallest risers can
// follow (GMAX). Searched with A* over 32 directions on the ground blurred over ±2 m, then smoothed lightly and
// resampled every 0.25 m; it leaves (x0, z0) on heading a0. Deterministic: no rng.
const GMAX = 2.5, LINE_B = 30, HALF = 30;
function routeUp(G, x0, z0, a0, goalY) {
  const S = 2, X0 = 120, Z0 = -470, NX = 180, NZ = 190, NC = NX * NZ;
  // the corridor: HALF either side of the flight's own line (bearing 30°, on from where it is) up to where that
  // line meets the ground at goalY, so the route keeps the stair's line and winds only as the face makes it
  const lx = Math.sin(LINE_B * Math.PI / 180), lz = -Math.cos(LINE_B * Math.PI / 180);
  let lineLen = 0;
  while (lineLen < 260 && G.at(x0 + lx * lineLen, z0 + lz * lineLen) < goalY) lineLen += 1;
  const H = new Float32Array(NC), ok = new Uint8Array(NC);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const x = X0 + i * S, z = Z0 + j * S, c = j * NX + i;
    const r = Math.hypot(x, z), b = Math.atan2(x, -z) * 180 / Math.PI;
    const along = (x - x0) * lx + (z - z0) * lz, off = Math.abs(-(x - x0) * lz + (z - z0) * lx);
    ok[c] = r > 300 && r < 480 && along > -6 && along < lineLen + 12 && off < HALF ? 1 : 0;
    if (ok[c]) H[c] = G.at(x, z);
  }
  // the heights the search reads are the ground blurred over ±2 m, so it finds the face's lie rather than its knuckles
  const Hb = new Float32Array(NC);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    let sum = 0, n = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ii = i + di, jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= NX || jj >= NZ || !ok[jj * NX + ii]) continue;
      sum += H[jj * NX + ii]; n++;
    }
    Hb[j * NX + i] = n ? sum / n : 0;
  }
  H.set(Hb);
  // 32 directions, so a line across a steep face can hold close to the contour
  const DIRS = [];
  for (const [p, q] of [[1, 0], [1, 1], [2, 1], [3, 1], [3, 2], [4, 1], [4, 3]]) for (const [u, v] of [[p, q], [q, p]]) for (const sx of [1, -1]) for (const sz of [1, -1]) {
    const d = [u * sx, v * sz];
    if (!DIRS.some((e) => e[0] === d[0] && e[1] === d[1])) DIRS.push(d);
  }
  const gs = new Float32Array(NC).fill(Infinity), par = new Int32Array(NC).fill(-1), done = new Uint8Array(NC);
  // a binary heap of cells keyed on f
  const hc = new Int32Array(NC * 4), hf = new Float32Array(NC * 4);
  let hn = 0;
  const hpush = (c, f) => {
    let i = hn++;
    while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= f) break; hc[i] = hc[p]; hf[i] = hf[p]; i = p; }
    hc[i] = c; hf[i] = f;
  };
  const hpop = () => {
    const top = hc[0], lc = hc[--hn], lf = hf[hn];
    let i = 0;
    for (;;) { let m = 2 * i + 1; if (m >= hn) break; if (m + 1 < hn && hf[m + 1] < hf[m]) m++; if (hf[m] >= lf) break; hc[i] = hc[m]; hf[i] = hf[m]; i = m; }
    hc[i] = lc; hf[i] = lf;
    return top;
  };
  const ci = Math.min(NX - 1, Math.max(0, Math.round((x0 + Math.cos(a0) * 2 - X0) / S))), cj = Math.min(NZ - 1, Math.max(0, Math.round((z0 + Math.sin(a0) * 2 - Z0) / S)));
  const start = cj * NX + ci;
  const hEst = (c) => Math.max(0, goalY - H[c]) / GMAX;
  gs[start] = 0; hpush(start, hEst(start));
  let goal = -1;
  while (hn > 0) {
    const c = hpop();
    if (done[c]) continue;
    done[c] = 1;
    if (H[c] >= goalY) { goal = c; break; }
    const i = c % NX, j = (c - i) / NX;
    for (const [di, dj] of DIRS) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= NX || nj >= NZ) continue;
      const n = nj * NX + ni;
      if (!ok[n] || done[n]) continue;
      const len = S * Math.hypot(di, dj), gr = (H[n] - H[c]) / len;
      const cost = len * (1 + (gr < 0 ? 1.5 * -gr : 0) + (gr > GMAX ? 40 * (gr - GMAX) : 0));
      const g = gs[c] + cost;
      if (g < gs[n]) { gs[n] = g; par[n] = c; hpush(n, g + hEst(n)); }
    }
  }
  // the cells back to the start, then (x0, z0) itself in front
  const pts = [];
  for (let c = goal >= 0 ? goal : start; c >= 0; c = par[c]) pts.push([X0 + (c % NX) * S, Z0 + Math.floor(c / NX) * S]);
  pts.push([x0 + Math.cos(a0) * 0.5, z0 + Math.sin(a0) * 0.5], [x0, z0]);
  pts.reverse();
  for (let pass = 0; pass < 2; pass++) for (let k = 2; k < pts.length - 1; k++) {
    pts[k][0] = 0.25 * pts[k - 1][0] + 0.5 * pts[k][0] + 0.25 * pts[k + 1][0];
    pts[k][1] = 0.25 * pts[k - 1][1] + 0.5 * pts[k][1] + 0.25 * pts[k + 1][1];
  }
  // resample every 0.25 m
  const xs = [pts[0][0]], zs = [pts[0][1]], ss = [0];
  let acc = 0, carry = 0;
  for (let k = 1; k < pts.length; k++) {
    const dx = pts[k][0] - pts[k - 1][0], dz = pts[k][1] - pts[k - 1][1], l = Math.hypot(dx, dz);
    let t = 0.25 - carry;
    while (t <= l) { xs.push(pts[k - 1][0] + dx * t / l); zs.push(pts[k - 1][1] + dz * t / l); acc += 0.25; ss.push(acc); t += 0.25; }
    carry = l - (t - 0.25);
  }
  return { x: xs, z: zs, s: ss, n: xs.length, len: acc, reached: goal >= 0 };
}
