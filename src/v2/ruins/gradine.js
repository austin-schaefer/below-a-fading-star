// N. The Gradine [Proposed]: steps cut up the mountain wall into the haze. The flight starts above a
// grown man's head on a stub of cut rock (the lowest steps are long gone, lying broken in the gully),
// then climbs the wall north-east, tread after tread hollowed in the middle by feet, until it thins into
// the rock and the mist. One merged geometry; every tread seated on the rendered ground; where the
// wall stands above a tread a notch is cut with a cheek of rock beside it.
import * as THREE from 'three';
import { Builder, mat } from '../../structures/geo.js';
import { vary } from '../../structures/common.js';
import { wornBlock, recolor, reaux, stoneMesh, hazeMesh } from './util.js';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function buildGradine(ctx, env) {
  const L = ctx.landmarks.gradine, G = env.ground, rng = ctx.makeRng(7201), N2 = ctx.noise.noise2;
  const low = ctx.quality === 'low';
  const B = new Builder(ctx.noise);
  const W = 2.8, D = 0.36, RISE = 0.33, N = 112;
  const C = (h) => new THREE.Color(h);
  // the terrain's rock (terrain.js: scree, rock, dark rock), the palette's stone, and pale worn stone
  const cScree = C('#4a4644'), cRock = C('#3c3838'), cRockD = C('#262224'), cStone = C(ctx.palette.scree), cPale = C('#c9bba6'), cMoss = C('#3a4226');
  const tmp = new THREE.Color();

  // ---- lay out the flight: a heading per tread, chosen so the treads ride the wall ----
  // heading: north-east-by-north (bearing 30°), so from the Yard and the Hypogeum the flight crosses the
  // wall as a diagonal instead of foreshortening into a vertical tick
  const aNE = Math.atan2(-Math.cos(Math.PI / 6), Math.sin(Math.PI / 6));
  const base = { x: L.x - 1.2, z: L.z + 1.0 };
  const gBase = G.at(base.x, base.z);
  const steps = [];
  let a = aNE, px = base.x + Math.cos(a) * 1.1, pz = base.z + Math.sin(a) * 1.1;
  // the first tread: its riser's foot 2.2 m over the ground where you stand under it (the collider line)
  const stand = 1.7;
  let y = ctx.terrain.heightAt(px - Math.cos(a) * stand, pz - Math.sin(a) * stand) + 2.2 + RISE;
  const foot = (x, z, h, out) => {      // highest and lowest rendered ground under a tread footprint
    const fx = Math.cos(h), fz = Math.sin(h), rx = -fz, rz = fx;
    let hi = -Infinity, lo = Infinity;
    for (const [u, v] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5], [0, 0], [0, -0.5], [-0.25, 0.5], [0.25, 0.5]]) {
      const g = G.at(x + rx * u * W + fx * v * D, z + rz * u * W + fz * v * D);
      hi = Math.max(hi, g); lo = Math.min(lo, g);
    }
    out.hi = hi; out.lo = lo; return out;
  };
  const fp = { hi: 0, lo: 0 }, fq = { hi: 0, lo: 0 };
  for (let i = 0; i < N; i++) {
    foot(px, pz, a, fp);
    if (i > 0 && fp.hi + 0.03 > y) y = Math.min(fp.hi + 0.03, y + 0.2); // the wall steeper than the flight: lift a little, cut the rest
    steps.push({ x: px, z: pz, a, y, hi: fp.hi, lo: fp.lo });
    // next heading: the one whose next footprint best meets the next tread height, near north-east, smooth
    let best = a, bestC = Infinity;
    for (let k = -4; k <= 4; k++) {
      const h = a + k * 0.03;
      if (Math.abs(h - aNE) > 0.75) continue;
      foot(px + Math.cos(h) * D, pz + Math.sin(h) * D, h, fq);
      const c = Math.abs(fq.hi - (y + RISE - 0.04)) + 0.25 * (fq.hi - fq.lo) + 0.35 * Math.abs(h - aNE) + 0.2 * Math.abs(k) * 0.03;
      if (c < bestC) { bestC = c; best = h; }
    }
    a = best; px += Math.cos(a) * D; pz += Math.sin(a) * D; y += RISE;
  }

  // ---- which treads are gone or broken ----
  const fate = new Array(N).fill(0); // 0 whole, 1 missing (a stub), 2 one end broken off
  for (let i = 9; i < N; i++) {
    const top = smooth(N - 34, N, i);
    const r = rng();
    if (r < 0.035 + top * 0.3) fate[i] = 1;
    else if (r < 0.1 + top * 0.35) fate[i] = 2;
  }
  fate[23] = 1; fate[24] = 2; fate[47] = 1; fate[61] = 2; fate[62] = 1;

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
    recolor(B, from, (x, yy, z, c) => c.copy(cScree).lerp(cRockD, 0.3 + 0.4 * smooth(gBase, gBase + 2.6, yy) * 0 + 0.3 * (N2(x * 1.3, yy * 1.3 + z) * 0.5 + 0.5)));
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

  // ---- the treads ----
  let wearTris = 0;
  for (let i = 0; i < N; i++) {
    const s = steps[i];
    const t = i / (N - 1);
    const fade = smooth(N - 40, N - 2, i);          // into the rock: narrower, rougher, rock-coloured
    const fx = Math.cos(s.a), fz = Math.sin(s.a), rx = -fz, rz = fx;
    const yaw = Math.PI / 2 - s.a;                   // local z (the riser) faces back down the flight
    const ry = yaw + Math.PI;
    const w = W * (1 - 0.3 * fade) * (0.97 + rng() * 0.06);
    // block: from the tread down into the ground (or down onto the rock stub for the first ones)
    const bottom = i < 7 ? s.y - RISE - 0.12 : Math.min(s.lo, s.y - RISE) - 0.35;
    let top = s.y;
    if (fate[i] === 1) top = s.y - RISE * (0.55 + rng() * 0.4);
    const h = top - bottom;
    if (h < 0.08) continue;
    const { g, wear } = wornBlock(B, w, h, D + 0.05, {
      wear: fate[i] === 1 ? 0 : (0.11 - 0.085 * t) * (1 - 0.6 * fade) * (0.8 + rng() * 0.4),
      nose: (0.06 - 0.03 * t) * (1 - 0.5 * fade), chip: 0.04 + 0.06 * fade, seed: i * 3.7,
      nu: low ? 5 : 9, nv: low ? 2 : 4, ny: 1, off: (rng() - 0.5) * 0.4,
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

    // the notch: where the wall stands above the tread beside it, a cheek of cut rock
    if (fate[i] !== 1) for (const sd of [-1, 1]) {
      const ex = s.x + rx * sd * (w / 2 + 0.35), ez = s.z + rz * sd * (w / 2 + 0.35);
      const gs = Math.max(G.at(ex, ez), G.at(ex + fx * 0.3, ez + fz * 0.3));
      if (gs < s.y + 0.18) continue;
      const ch = gs - s.y + 0.35;
      const cg = B.box(0.42, ch, D + 0.1, { chip: 0.05, seed: i * 11 + sd });
      const cf = B.count;
      B.add(cg, mat(s.x + rx * sd * (w / 2 + 0.2), s.y - 0.1 + ch / 2, s.z + rz * sd * (w / 2 + 0.2), 0, ry, 0), { color: cRock, moss: 0.6, ground: s.y, disp: 0.03, dispScale: 2.4 });
      recolor(B, cf, (x, yy, z, c) => c.copy(cRock).lerp(cScree, 0.3 + 0.3 * (N2(x * 1.7, yy * 1.7 + z) * 0.5 + 0.5)));
    }
    // a backing slab where the wall rises steeply behind the tread
    if (fate[i] !== 1 && i < N - 1) {
      const bx = s.x + fx * (D * 0.5 + 0.25), bz = s.z + fz * (D * 0.5 + 0.25);
      const gb = G.at(bx, bz);
      if (gb > steps[i + 1].y + 0.25) {
        const bh = gb - s.y + 0.2;
        const cf = B.count;
        B.add(B.box(w + 0.4, bh, 0.25, { chip: 0.04 }), mat(bx + fx * 0.05, s.y + bh / 2 - 0.05, bz + fz * 0.05, 0, ry, 0), { color: cRock, moss: 0.6, ground: s.y, disp: 0.03, dispScale: 2.4 });
        recolor(B, cf, (x, yy, z, c) => c.copy(cRock).lerp(cRockD, 0.4 * (N2(x * 1.9, yy * 1.9 - z) * 0.5 + 0.5)));
      }
    }
    // the broken treads went down into the gully: a piece of each lies at the foot
    if (fate[i] && i < N - 30) {
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

  // ---- the haze the flight climbs into: soft banks lying across the upper steps and above them ----
  const haze = [];
  for (let i = 50; i < N; i += 3) {
    const s = steps[i], t = (i - 50) / (N - 50);
    haze.push({ x: s.x + (rng() - 0.5) * 3, y: s.y + 0.8 + rng() * 1.5, z: s.z + (rng() - 0.5) * 3, size: 5 + 7 * t + rng() * 3, alpha: 0.08 + 0.26 * t * t, squash: 0.35 + rng() * 0.15 });
  }
  const top = steps[N - 1], fxT = Math.cos(top.a), fzT = Math.sin(top.a);
  for (let k = 0; k < 8; k++) {
    const d = 2 + k * 3.5;
    haze.push({ x: top.x + fxT * d + (rng() - 0.5) * 6, y: top.y + d * 1.1 + rng() * 2, z: top.z + fzT * d + (rng() - 0.5) * 6, size: 12 + rng() * 8, alpha: 0.28 + rng() * 0.1, squash: 0.4 });
  }
  env.meshes.push(hazeMesh(ctx, haze, new THREE.Color('#6a5864'), 'ruins-gradine-haze'));

  // ---- colliders: the rock stub at the base, and the flight while it is within reach ----
  for (let u = -W / 2 - 0.4; u <= W / 2 + 0.41; u += 0.55) {
    const x = s0.x - fx0 * (D / 2 + 0.35) + rx0 * u, z = s0.z - fz0 * (D / 2 + 0.35) + rz0 * u;
    ctx.addCollider({ x, z, r: 0.45 });
  }
  let cols = 0;
  for (let i = 0; i < N; i += 3) {
    const s = steps[i];
    if (Math.hypot(s.x, s.z) > ctx.world.regionRadius + 52) break;
    ctx.addCollider({ x: s.x, z: s.z, r: W / 2 + 0.1 }); cols++;
  }
  const last = steps[N - 1];
  ctx.gradine = { base: { x: base.x, z: base.z, y: gBase }, firstTread: { x: s0.x, z: s0.z, y: s0.y }, top: { x: last.x, z: last.z, y: last.y }, steps: N };
  return { steps: N, missing: fate.filter((f) => f === 1).length, broken: fate.filter((f) => f === 2).length, top: Math.round(last.y), colliders: cols };
}
