// Q. The Cutting [Proposed]: where the canyon's outer bank slumped at the first bend, the face shows
// the strata of made things: dressed stone, a band of black glass, a lattice rusted and crushed flat,
// stone again, then soil. A talus of the fallen strata lies at its foot, short of the water.
import * as THREE from 'three';
import { Builder, mat } from '../../structures/geo.js';
import { stoneTints, vary } from '../../structures/common.js';
import { recolor, reaux, Acc, stoneMesh, SKY_SHEEN } from './util.js';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function buildCutting(ctx, env) {
  const T = ctx.terrain, G = env.ground, rng = ctx.makeRng(7301), N2 = ctx.noise.noise2;
  const low = ctx.quality === 'low';
  const tints = stoneTints(ctx.palette);
  const B = new Builder(ctx.noise);

  // ---- the frame: on the outer (north) bank of the bend, facing the water ----
  const line = T.river.line;
  const S0 = 22.5;
  let k = 0; while (k < line.n - 2 && line.S[k + 1] < S0) k++;
  const f = (S0 - line.S[k]) / (line.S[k + 1] - line.S[k]);
  const cx = line.X[k] + (line.X[k + 1] - line.X[k]) * f, cz = line.Z[k] + (line.Z[k + 1] - line.Z[k]) * f;
  let tx = line.X[k + 1] - line.X[k], tz = line.Z[k + 1] - line.Z[k];
  const tl = Math.hypot(tx, tz); tx /= tl; tz /= tl;
  // tangent runs downstream (west); u along the face runs the other way so +u is to the viewer's right
  const ux = -tx, uz = -tz;
  let nx = tz, nz = -tx;                 // toward the north bank
  if (nz > 0) { nx = -nx; nz = -nz; }
  const ox = -nx, oz = -nz;              // the face's outward normal: back toward the river
  const wl = T.waterLevelAt(cx, cz) ?? T.river.levelAt(S0);
  // walk up the bank to where the ground stands clear of the water
  let fx = cx, fz = cz;
  for (let d = 0; d < 14; d += 0.1) {
    fx = cx + nx * d; fz = cz + nz * d;
    if (G.at(fx, fz) > wl + 1.0 && T.waterDepthAt(fx, fz) < -0.6) break;
  }
  // the face plane sits a little into the bank from there
  fx += nx * 0.4; fz += nz * 0.4;
  const Yb = G.at(fx, fz) - 0.45;        // the face's foot, buried a little
  const HALF = 4.3, HT = 4.05;           // half width; height in the middle (incl. the buried foot)
  const P = (u, v, o) => [fx + ux * u + ox * o, Yb + v, fz + uz * u + oz * o];
  // the slump scar: tallest in the middle, running out to nothing at the ends
  const topAt = (u) => HT * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u) / HALF, 2.2)), 0.55) + 0.12 * N2(u * 0.9, 3.1) * (1 - Math.pow(Math.abs(u) / HALF, 4));
  // strata boundaries (above the foot), bent a little by the slump
  const bend = (u) => 0.13 * Math.sin(u * 0.55 + 0.8) + 0.04 * N2(u * 1.3, 7.7) - 0.025 * u;
  const BANDS = [0.0, 1.3, 1.72, 2.0, 3.1, 4.4]; // stone | glass | lattice | stone | soil
  const bandOf = (u, v) => { const w = v - bend(u); for (let i = 4; i >= 0; i--) if (w >= BANDS[i]) return i; return 0; };
  const C = (h) => new THREE.Color(h);
  const cStone = C(ctx.palette.stone), cDark = C('#1b1715'), cRust = C('#4a2412'), cRustD = C('#24120c'),
    cSoil = C('#2a2017'), cSoilL = C('#3d3122'), cRoot = C('#1a1410'), cTurf = C('#38452a');

  // ---- the backing face: one displaced sheet, its colour and relief set by the band ----
  {
    const du = low ? 0.26 : 0.14, dv = low ? 0.2 : 0.11;
    const NU = Math.ceil(HALF * 2 / du), NV = Math.ceil(HT / dv);
    const pos = [], idx = [];
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
      const u = -HALF + i * (HALF * 2 / NU);
      const vt = topAt(u);
      const v = (j / NV) * vt;
      const b = bandOf(u, v);
      let o = 0;
      const n1 = ctx.noise.noise2(u * 3.1, v * 3.1), n2 = ctx.noise.noise2(u * 9.0 + 4, v * 9.0);
      if (b === 0) o = -0.12 + 0.03 * n1;                     // behind the dressed blocks
      else if (b === 1) o = -0.09;                             // behind the glass
      else if (b === 2) o = -0.02 + 0.015 * n2;                // the crushed lattice layer
      else if (b === 3) o = 0.04 * n1 + 0.03 * n2 - 0.02;      // rough rubble-stone
      else o = 0.08 + 0.1 * smooth(BANDS[4], BANDS[4] + 0.9, v - bend(u)) + 0.06 * n1 + 0.04 * n2; // soil, overhanging at the lip
      // the scar's edges lean back into the bank
      o -= 0.5 * Math.pow(Math.abs(u) / HALF, 3) + 0.25 * smooth(vt - 0.4, vt, v) * (j === NV ? 1 : 0.5);
      pos.push(...P(u, v, o));
    }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
      const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    // the soil cap: from the face's top edge back into the bank, under the turf
    const cap0 = pos.length / 3;
    const ROWS = 4;
    for (let r = 0; r <= ROWS; r++) for (let i = 0; i <= NU; i++) {
      const u = -HALF + i * (HALF * 2 / NU), vt = topAt(u);
      const back = r / ROWS * 3.2;
      const o = (0.08 + 0.1 + 0.06 * ctx.noise.noise2(u * 3.1, vt * 3.1)) - 0.5 * Math.pow(Math.abs(u) / HALF, 3) - back;
      pos.push(...P(u, vt + back * 0.55 + (r ? 0.05 : 0), o));
    }
    const top0 = NV * (NU + 1);
    for (let i = 0; i < NU; i++) {
      // the face's last row joins the cap's first row, wound like the face so it faces out and up
      const a = top0 + i, b = a + 1, c = cap0 + i, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    for (let r = 0; r < ROWS; r++) for (let i = 0; i < NU; i++) {
      const a = cap0 + r * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    const from = B.count;
    B.add(g, null, { color: cStone, moss: 0.5, ground: Yb + 0.45 });
    const capFrom = from + cap0;
    recolor(B, from, (x, y, z, c, i) => {
      const u = (x - fx) * ux + (z - fz) * uz, v = y - Yb;
      if (i >= capFrom) { c.copy(cSoil).lerp(cTurf, smooth(0.0, 0.6, (i - capFrom) / (NU + 1) / ROWS) * 0.8); return; }
      const b = bandOf(u, v), n = ctx.noise.noise2(u * 5.3, v * 5.3) * 0.5 + 0.5;
      if (b === 0) c.copy(cDark).lerp(cStone, 0.25 * n);
      else if (b === 1) c.copy(cDark).multiplyScalar(0.6);
      else if (b === 2) c.copy(cRustD).lerp(cRust, n);
      else if (b === 3) c.copy(cStone).multiplyScalar(0.75 + 0.35 * n).lerp(cDark, 0.25 * (1 - n));
      else c.copy(cSoil).lerp(cSoilL, n * 0.7).lerp(cRoot, smooth(0.6, 1, ctx.noise.noise2(u * 14, v * 3) * 0.5 + 0.5) * 0.5);
    });
    reaux(B, from, (A, o, x, y, z) => {
      const u = (x - fx) * ux + (z - fz) * uz, v = y - Yb, b = bandOf(u, v);
      A[o + 1] = b === 4 ? 0.0 : b === 2 ? 0.0 : 0.55;        // moss on the stone only
      A[o + 2] = b === 2 ? 0.75 : 0;                         // the lattice band is iron
      A[o + 3] = 0.25 * (1 - smooth(0.3, 1.2, v));           // damp at the foot
    });
  }

  // ---- band 0: dressed stone, three courses, a few blocks slumped out of true ----
  const course = 0.42;
  for (let row = 0; row < 3; row++) {
    let u = -HALF + (row % 2) * 0.35;
    while (u < HALF) {
      const len = 0.65 + rng() * 0.45;
      const um = u + len / 2;
      const v0 = row * course + bend(um);
      const vt = topAt(um);
      u += len;
      if (v0 + course > vt - 0.05 || Math.abs(um) > HALF - 0.4) continue;
      if (rng() < 0.08) continue;              // a block fallen out
      const slump = rng() < 0.15 ? 0.06 + rng() * 0.1 : 0.0;
      const [x, y, z] = P(um, v0 + course / 2, -0.15 + 0.04 + slump);
      const yaw = Math.atan2(ux, uz) - Math.PI / 2;
      B.add(B.box(len - 0.03, course - 0.03, 0.34, { chip: 0.04, seed: um * 7 + row }), mat(x, y, z, (rng() - 0.5) * 0.05, yaw + (rng() - 0.5) * 0.05, (rng() - 0.5) * 0.06 - 0.02 * bendSlope(um)),
        { color: vary(tints.stone, rng, 0.1), moss: 0.6, ground: Yb + 0.45, disp: 0.01, dispScale: 3 });
    }
  }
  function bendSlope(u) { return (bend(u + 0.1) - bend(u - 0.1)) / 0.2; }

  // ---- band 3: stone again, broken masonry set every which way ----
  for (let i = 0; i < 26; i++) {
    const u = -HALF + 0.6 + rng() * (HALF * 2 - 1.2);
    const v = BANDS[3] + 0.15 + rng() * (BANDS[4] - BANDS[3] - 0.3) + bend(u);
    if (v + 0.25 > topAt(u)) continue;
    const s = 0.22 + rng() * 0.22;
    const [x, y, z] = P(u, v, -0.05 + rng() * 0.06);
    B.add(B.box(s * 1.6, s, s * 1.2, { chip: 0.05, seed: i * 3 }), mat(x, y, z, (rng() - 0.5) * 0.6, rng() * 6.28, (rng() - 0.5) * 0.6),
      { color: vary(tints.old, rng, 0.12).multiplyScalar(0.85), moss: 0.4, ground: Yb + 0.45, disp: 0.02, dispScale: 3 });
  }

  // ---- band 2: the lattice, crushed flat: a right-angled grid of bars pressed into the face ----
  {
    const pitch = 0.17, th = 0.022;
    const yaw = Math.atan2(ux, uz) - Math.PI / 2;
    const crush = (u) => 0.03 * Math.sin(u * 2.3) + 0.02 * N2(u * 4.1, 2.2);
    for (let u = -HALF + 0.5; u < HALF - 0.5; u += pitch) {
      const v0 = BANDS[2] + bend(u) + 0.02, v1 = BANDS[3] + bend(u) - 0.02;
      if (v1 > topAt(u) - 0.05 || rng() < 0.07) continue;
      const lean = (rng() - 0.5) * 0.35 + crush(u) * 4;      // bars bent over by the weight above
      const [x, y, z] = P(u, (v0 + v1) / 2 + crush(u), 0.008);
      B.add(B.box(th, (v1 - v0) / Math.cos(lean), th * 0.8), mat(x, y, z, 0, yaw, lean), { color: cRust, iron: 1, moss: 0, ground: Yb + 0.45 });
    }
    for (const fv of [0.1, 0.5, 0.9]) {
      let u = -HALF + 0.5;
      while (u < HALF - 0.5) {
        const len = 0.5 + rng() * 1.2, um = Math.min(u + len / 2, HALF - 0.5);
        u += len + (rng() < 0.3 ? 0.15 + rng() * 0.3 : 0.0);
        const v = BANDS[2] + (BANDS[3] - BANDS[2]) * fv + bend(um) + crush(um);
        if (v > topAt(um) - 0.1) continue;
        const [x, y, z] = P(um, v, 0.012);
        B.add(B.box(len, th, th * 0.9, { seg: 0.3 }), mat(x, y, z, 0, yaw, -bendSlope(um) * 0.8 + (rng() - 0.5) * 0.06), { color: cRust, iron: 1, moss: 0, ground: Yb + 0.45, disp: 0.012, dispScale: 4 });
      }
    }
  }

  // ---- band 4: roots hanging out of the soil over the lip ----
  for (let i = 0; i < 18; i++) {
    const u = -HALF + 0.8 + rng() * (HALF * 2 - 1.6), vt = topAt(u);
    const len = 0.3 + rng() * 0.9;
    const [x, y, z] = P(u, vt - 0.25 - len / 2, 0.22 + rng() * 0.06);
    B.add(B.cyl(0.006, 0.014, len, 4, 3), mat(x, y, z, (rng() - 0.5) * 0.5, 0, (rng() - 0.5) * 0.5), { color: cRoot, moss: 0, ground: Yb, disp: 0.03, dispScale: 5 });
  }

  // ---- the glass: one band, broken off where the scar runs out, and shards at the foot ----
  const GA = new Acc();
  {
    const seg = low ? 0.3 : 0.16;
    // the band's live extent along u
    let ua = -HALF, ub = HALF;
    for (let u = 0; u > -HALF; u -= 0.05) if (topAt(u) < BANDS[2] + bend(u) + 0.05) { ua = u + 0.1; break; }
    for (let u = 0; u < HALF; u += 0.05) if (topAt(u) < BANDS[2] + bend(u) + 0.05) { ub = u - 0.1; break; }
    const NU = Math.ceil((ub - ua) / seg), NV = 4;
    const pos = [], idx = [];
    const thick = 0.12;
    // front and back sheets, closed top and bottom; ends jagged
    for (const side of [0, 1]) for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
      const u = ua + (ub - ua) * i / NU;
      const endBite = 0.12 * (Math.abs(N2(u * 7.3, j * 1.7)) + (i === 0 || i === NU ? 1 : 0));
      const v0 = BANDS[1] + bend(u), v1 = BANDS[2] + bend(u);
      let v = v0 + (v1 - v0) * j / NV;
      if (j === 0) v += 0.01; if (j === NV) v -= 0.01;
      // conchoidal fracture on the front: shallow scallops
      const conch = side === 0 ? 0.03 * Math.abs(N2(u * 5.5, v * 9.0)) + 0.02 * N2(u * 13.0, v * 21.0) : 0;
      const o = side === 0 ? -0.09 + thick + conch - endBite * (i === 0 || i === NU ? 1 : 0.2) : -0.09;
      pos.push(...P(u, v, o));
    }
    const sheet = (NU + 1) * (NV + 1);
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
      const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    for (let i = 0; i < NU; i++) { // bottom and top lips
      const fb = i, fb1 = i + 1, bb = sheet + i, bb1 = sheet + i + 1;
      idx.push(fb, bb, fb1, fb1, bb, bb1);
      const ft = NV * (NU + 1) + i, ft1 = ft + 1, bt = sheet + ft, bt1 = bt + 1;
      idx.push(ft, ft1, bt, ft1, bt1, bt);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    GA.add(g.toNonIndexed());   // faceted: every scallop catches the sun its own way
  }

  // ---- the talus: chunks of every stratum, spread down toward the water ----
  const yawF = Math.atan2(ux, uz) - Math.PI / 2;
  const colliders = [];
  let placed = 0;
  for (let i = 0; i < 70 && placed < 52; i++) {
    const u = (rng() + rng() + rng() - 1.5) / 1.5 * (HALF - 0.2);
    const out = 0.25 + Math.pow(rng(), 1.3) * 3.3 * (1 - Math.abs(u) / HALF * 0.5);
    const x = fx + ux * u + ox * out, z = fz + uz * u + oz * out;
    if (T.waterDepthAt(x, z) > -0.15) continue;
    const gy = G.at(x, z);
    const kind = rng();
    const near = 1 - out / 3.6;
    if (kind < 0.32) {
      const s = 0.2 + rng() * 0.32 * (0.6 + near);
      B.add(B.box(s * 1.7, s, s * 1.2, { chip: 0.05, seed: i }), mat(x, gy + s * 0.25, z, (rng() - 0.5) * 0.9, rng() * 6.28, (rng() - 0.5) * 0.9), { color: vary(tints.stone, rng, 0.1), moss: 0.7, ground: gy - 0.1, disp: 0.015 });
      if (s > 0.33) colliders.push([x, z, s * 0.8]);
    } else if (kind < 0.5) {
      const s = 0.07 + rng() * 0.16;
      const sh = new THREE.OctahedronGeometry(s, 0);
      sh.scale(0.5 + rng() * 0.4, 1.4 + rng() * 1.2, 0.25 + rng() * 0.2);
      GA.add(sh, mat(x, gy + s * 0.4, z, (rng() - 0.5) * 1.8, rng() * 6.28, (rng() - 0.5) * 1.8), 0, { flat: true });
    } else if (kind < 0.62) {
      // a lattice fragment: a bent scrap of the grid
      const n = 2 + Math.floor(rng() * 3), pitch = 0.17, rot = rng() * 6.28, tilt = (rng() - 0.5) * 0.5;
      const base = mat(x, gy + 0.03, z, tilt, rot, (rng() - 0.5) * 0.4);
      for (let a = 0; a < n; a++) {
        B.add(B.box(0.022, 0.02, pitch * n), base.clone().multiply(mat(a * pitch - n * pitch / 2, 0.01 * Math.sin(a * 2.1), 0, 0, 0, 0.15 * (rng() - 0.5))), { color: cRust, iron: 1, moss: 0, ground: gy - 0.1 });
        B.add(B.box(pitch * n, 0.02, 0.022), base.clone().multiply(mat(0, 0.012, a * pitch - n * pitch / 2, 0.15 * (rng() - 0.5), 0, 0)), { color: cRust, iron: 1, moss: 0, ground: gy - 0.1 });
      }
    } else if (kind < 0.82) {
      const s = 0.15 + rng() * 0.3;
      const from = B.count;
      B.add(B.rock(s, 0, 1.2, 0.6, 1), mat(x, gy + s * 0.1, z, rng(), rng() * 6.28, rng()), { color: cSoil, moss: 0, ground: gy - 0.2, flat: true, disp: s * 0.15, dispScale: 3 });
      recolor(B, from, (xx, yy, zz, c) => c.copy(cSoil).lerp(cSoilL, ctx.noise.noise2(xx * 6, zz * 6) * 0.5 + 0.5));
    } else {
      const s = 0.12 + rng() * 0.25;
      B.add(B.rock(s, 0), mat(x, gy + s * 0.15, z, rng() * 3, rng() * 6.28, rng() * 3), { color: vary(tints.old, rng, 0.15).multiplyScalar(0.8), moss: 0.6, ground: gy - 0.1, flat: true, disp: s * 0.1 });
    }
    placed++;
  }
  // a slump of earth and rubble along the foot, so the face rises out of its own debris
  for (let i = 0; i < 16; i++) {
    const u = -HALF + 0.4 + (i + rng() * 0.6) * (HALF * 2 - 0.8) / 16;
    const [x, y0, z] = P(u, 0, 0.35 + rng() * 0.3);
    if (T.waterDepthAt(x, z) > -0.15) continue;
    const gy = G.at(x, z), s = 0.35 + rng() * 0.3;
    const from = B.count;
    B.add(B.rock(s, low ? 0 : 1, 1.5, 0.55, 1.1), mat(x, Math.max(gy, Yb + 0.3) + s * 0.05, z, 0, yawF + rng(), 0), { color: cSoil, moss: 0.2, ground: gy - 0.2, disp: s * 0.12, dispScale: 2 });
    recolor(B, from, (xx, yy, zz, c) => c.copy(cSoil).lerp(cStone, 0.25 * (ctx.noise.noise2(xx * 4, zz * 4) * 0.5 + 0.5)).multiplyScalar(0.9));
  }

  env.meshes.push(stoneMesh(B, env.stone.mat, 'ruins-cutting'));
  env.meshes.push(glassMesh(ctx, GA));

  // ---- colliders: the face, and the larger fallen blocks ----
  for (let u = -HALF + 0.6; u <= HALF - 0.6; u += 0.7) {
    const x = fx + ux * u - ox * 0.25, z = fz + uz * u - oz * 0.25;
    ctx.addCollider({ x, z, r: 0.55 });
  }
  for (const [x, z, r] of colliders) ctx.addCollider({ x, z, r });
  ctx.cutting = { face: { x: fx, y: Yb, z: fz, nx: ox, nz: oz, ux, uz, width: HALF * 2, height: HT }, glass: { y: Yb + BANDS[1] + 0.2 } };
  return { faceAt: [+fx.toFixed(1), +fz.toFixed(1)], footY: +Yb.toFixed(2), water: +wl.toFixed(2), talus: placed };
}

// Black glass: near-black, very smooth, mirroring the ember sky at grazing angles, with faint fractures
// seen a little way inside (parallax layers) so it reads as glass and not as paint.
function glassMesh(ctx, GA) {
  const uniforms = {
    uSheen: { value: 0.9 }, uSheenFlicker: { value: 1 },
    uSheenSun: { value: new THREE.Vector3(ctx.sun.dir.x, ctx.sun.dir.y, ctx.sun.dir.z) },
  };
  const mt = new THREE.MeshStandardMaterial({ color: new THREE.Color('#06070a'), roughness: 0.07, metalness: 0.15 });
  mt.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGW;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvGW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uSheen, uSheenFlicker; uniform vec3 uSheenSun; varying vec3 vGW;
        float gH(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
        float gV(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(gH(i), gH(i+vec3(1,0,0)), f.x), mix(gH(i+vec3(0,1,0)), gH(i+vec3(1,1,0)), f.x), f.y),
                     mix(mix(gH(i+vec3(0,0,1)), gH(i+vec3(1,0,1)), f.x), mix(gH(i+vec3(0,1,1)), gH(i+vec3(1,1,1)), f.x), f.y), f.z); }
        float gCrack(vec3 p){ float n = gV(p) * 0.65 + gV(p * 2.3 + 7.1) * 0.35; return 1.0 - smoothstep(0.0, 0.035, abs(n - 0.5)); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        ${SKY_SHEEN}
        {
          // fractures inside: sample the crack field a little behind the surface along the view ray
          vec3 vd = normalize(vGW - cameraPosition);
          float cr = gCrack((vGW + vd * 0.05) * 3.2) * 0.6 + gCrack((vGW + vd * 0.13) * 2.1 + 3.0) * 0.4;
          float fresIn = clamp(dot(-normalize(vViewPosition), normal), 0.0, 1.0);
          totalEmissiveRadiance += vec3(0.20, 0.13, 0.15) * cr * fresIn * 0.22 * uSheenFlicker;
          // a smoky depth, faintly green-violet, where you look straight in
          totalEmissiveRadiance += vec3(0.010, 0.012, 0.018) * fresIn;
        }`);
  };
  mt.customProgramCacheKey = () => 'fp-ruins-black-glass';
  const flick = ctx.sky?.flicker || { value: 1 };
  ctx.registerUpdate(() => { uniforms.uSheenFlicker.value = 0.35 + 0.65 * flick.value; });
  const mesh = new THREE.Mesh(GA.build(), mt);
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'ruins-cutting-glass';
  return mesh;
}
