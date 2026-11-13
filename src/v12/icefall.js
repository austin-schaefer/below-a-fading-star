// The icefall (v12 H2): the glacier in the north wall's notch rebuilt as ice, a climb through it from the Lattice to a
// shelf about 90 m over the valley, and beyond the shelf, out of reach, the Plummet the Lattice comes down from, its
// thread up into the dark. The plan (heights, the climb's pieces) is src/v12/icefall/plan.js; the terrain carries the
// ice's bulk through it (src/v4/glacier.js), this module draws the ice, the crystals and the leads and walks the climb.
//   draws: the ice (one mesh: the steps' faces, the slot's walls and floor, the block, the stair, the seracs), the
//          crystals (one InstancedMesh), the leads' glass (one mesh), their bronze (one), the find's band and line
//   floors: the slot, the block, the bridge, the stair (stacked, edges held); the corridors past the walk limit for
//          T2, the stair and the shelf; the ascent `icefall` for tools/heights-test.mjs
//   ?icefall=0 leaves it out (the terrain keeps the icefall's shape)
import * as THREE from 'three';
import { SLOT, SLOT_CRYSTAL_AT, slotHalf, BLOCK, BRIDGE, STAIR, LANES, LIP, RISERS, UPPER, CREVASSE, levels, riserSpan, upperFoot, zOf, sOf, axisX, iceY, nearest, slumpW } from './icefall/plan.js';
import { iceMaterial, IceGeo, serac } from './icefall/ice.js';
import { buildFaces } from './icefall/faces.js';
import { samples, wall, ribbon, lineFloor, blockFrame, blockFloor, stairPlan, treadY, stairFloor } from './icefall/way.js';
import { crystalMaterial, crystalMesh } from './icefall/crystals.js';
import { lead, collar, bronzeMaterial, glyphBand, mergeGeometries } from './icefall/plummet.js';

const OFF = typeof location !== 'undefined' && new URLSearchParams(location.search).get('icefall') === '0';
const hyp = (x, z) => Math.sqrt(x * x + z * z);

export async function build(ctx) {
  if (OFF) return;
  levels();
  const T = ctx.terrain, H = (x, z) => T.heightAt(x, z), low = ctx.quality === 'low';
  const rng = ctx.makeRng(1203), noise = ctx.noise;
  const G = new IceGeo();
  const parts = []; // [name, first triangle]: which builder drew what (ctx.icefall.parts, for a probe)
  const colliders = [];
  const group = new THREE.Group(); group.name = 'icefall';
  ctx.scene.add(group);

  // ---------------------------------------------------------------- the floors and their drawn pieces
  // the slot: inside the ice. Walls that bend out of sight, pinch and lean over, scalloped by melt and banded by
  // the years, blue deepening downward and lit from the strip of sky; icicles off the lips, a block wedged overhead,
  // a crystal grown out of the north wall that the way goes round; a floor of old snow and rubble with a refrozen
  // melt channel down it
  const slotS = samples(SLOT.pts, low ? 1.3 : 0.8);
  const iceAt = (x, z) => iceY(x, z);
  parts.push(['slot-walls', G.p.length / 9]);
  for (const sgn of [1, -1]) {
    wall(G, rng, noise, slotS, {
      sgn, half: slotHalf, thick: 2.4, lean: 0.9, leanVary: true, rows: low ? 7 : 11, scallop: 0.32, icicles: 0.55, deepMax: 0.58, strata: 0.75, // deep enough to be blue at the foot, not so deep the bands go black at eye height
      top: (i, s, nx, nz) => Math.max(s.y + 3.4, iceAt(s.x + nx * (SLOT.half + 2.4), s.z + nz * (SLOT.half + 2.4)) + 0.7),
      ground: (i, s, nx, nz) => H(s.x + nx * (SLOT.half + 3.2), s.z + nz * (SLOT.half + 3.2)),
    }, colliders);
  }
  parts.push(['slot-floor', G.p.length / 9]);
  ribbon(G, slotS, SLOT.half + 0.2, 0.02, 0.3, 0.55);
  // the melt channel: a glassy blue strip, refrozen, wandering a little down the middle
  {
    const M = slotS.map((q) => ({ ...q, x: q.x - q.tz * 0.35 * noise.noise2(q.d * 0.08, 3.3), z: q.z + q.tx * 0.35 * noise.noise2(q.d * 0.08, 3.3) }));
    ribbon(G, M, 0.32, 0.035, 0.62, 0.0);
  }
  // rubble along the walls' feet, more where they lean
  for (let i = 1; i < slotS.length; i += low ? 2 : 1) {
    if (rng() < 0.35) continue;
    const sd = slotS[i], side = rng() < 0.5 ? 1 : -1, off = slotHalf(sd.d) - 0.1 - rng() * 0.45, w = 0.25 + rng() * rng() * 0.9;
    serac(G, rng, { x: sd.x - sd.tz * off * side, y: sd.y, z: sd.z + sd.tx * off * side, w, d: w * (0.6 + rng() * 0.5), h: w * (0.4 + rng() * 0.7), rot: rng() * 3, slant: (rng() - 0.5) * w * 0.5, sink: 0.3, deepTop: sd.y + 6, deepRange: 10 });
  }
  parts.push(['chock', G.p.length / 9]);
  // the chockstone: a block fallen in and wedged between the walls, 5 m over the way
  {
    const sd = slotS.reduce((a, q) => (Math.abs(q.d - 42) < Math.abs(a.d - 42) ? q : a));
    serac(G, rng, { x: sd.x, y: sd.y + 5.2, z: sd.z, w: 1.5, d: 4.4, h: 2.1, rot: Math.atan2(sd.tx, sd.tz), slant: 0.5, sink: 0.4, lx: 0, lz: 0, deepTop: sd.y + 8, deepRange: 6 });
  }
  // the crystal out of the north wall (left of the way going west), at chest height, slanting up into the way
  const slotCrystal = (() => {
    const sd = slotS.reduce((a, q) => (Math.abs(q.d - SLOT_CRYSTAL_AT) < Math.abs(a.d - SLOT_CRYSTAL_AT) ? q : a));
    const nx = -sd.tz, nz = sd.tx, h0 = slotHalf(sd.d); // north
    const base = [sd.x + nx * (h0 + 0.9), sd.y + 0.5, sd.z + nz * (h0 + 0.9)], dir = [-nx * 0.8 - sd.tx * 0.25, 0.55, -nz * 0.8 - sd.tz * 0.25];
    // it reaches 0.9 m into the way: the walker goes round it on the south side
    colliders.push({ x: sd.x + nx * (h0 - 0.55), z: sd.z + nz * (h0 - 0.55), r: 0.45, y: sd.y - 0.5, h: 3.2, stand: false });
    return { x: base[0], y: base[1], z: base[2], h: 3.4, r: 0.4, dir, rot: 0.3, tint: 0.95 };
  })();
  ctx.addWalkable(lineFloor(SLOT.pts, slotHalf), { stack: true, keep: true, name: 'icefall-slot' });
  // the cleft's mouth glows: a cold light just inside, so the gate in the ice front reads from the Lattice
  {
    const L = new THREE.PointLight(new THREE.Color(ctx.palette.crystal), 60, 30, 2);
    L.position.set(SLOT.pts[0][0] - 0.3, 20.5, -301); L.name = 'icefall-cleft-light';
    group.add(L);
  }

  parts.push(['block', G.p.length / 9]);
  // the block
  const B = blockFrame();
  {
    const n = Math.round(B.L / (low ? 3 : 2)), P = [], Q = [], seed = rng();
    const cs = [-B.half - 0.9, -B.half, -B.half * 0.33, B.half * 0.33, B.half, B.half + 0.9];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * B.L, top = B.fy + (B.hy - B.fy) * (a / B.L);
      const row = [], q = [];
      for (let j = 0; j < cs.length; j++) {
        const c = cs[j], edge = j === 0 || j === cs.length - 1;
        const x = B.fx + B.ux * a + B.vx * c, z = B.fz + B.uz * a + B.vz * c;
        // sides: from the top's edge down past the ground; the edge itself chipped (outward and down only)
        const chip = j === 1 || j === cs.length - 2 ? -Math.abs(noise.noise2(a * 0.4, j)) * 0.25 : 0;
        const y = edge ? Math.min(top, H(x, z)) - 2.5 : top + chip;
        row.push([x, y, z]); q.push([edge ? 0.55 : 0, seed, edge ? 0.1 : 0.35]);
      }
      P.push(row); Q.push(q);
    }
    G.grid(P, Q, false);
    // the head: a cliff from the top down to the ground, facing west (the way the block was riding)
    const hx = B.hx, hz = B.hz, cols = [], cq = [];
    for (let r = 0; r <= 6; r++) {
      const v = r / 6, row = [], q = [];
      for (let j = 0; j <= 4; j++) {
        const c = -B.half - 0.9 + (2 * B.half + 1.8) * (j / 4), x = hx + B.vx * c - B.ux * Math.abs(noise.noise2(c * 0.5, v * 3)) * 0.8 * Math.sin(v * Math.PI), z = hz + B.vz * c - B.uz * 0;
        const g = H(x, z) - 2.5, y = g + (B.hy - g) * v;
        row.push([x, y, z]); q.push([0.8 * (1 - v), seed, 0.1]);
      }
      cols.push(row); cq.push(q);
    }
    G.grid(cols, cq, true);
    // its sides keep a walker on T1 out of it; its top edges hold (the floor's keep)
    for (const sgn of [1, -1]) {
      const c = sgn * (B.half + 0.45);
      const x1 = B.fx + B.vx * c, z1 = B.fz + B.vz * c, x2 = B.hx + B.vx * c, z2 = B.hz + B.vz * c, g1 = H(x1, z1), g2 = H(x2, z2);
      colliders.push({ x1, z1, x2, z2, r: 0.5, y: g1 - 1, h: B.fy - g1 + 0.6, dh: (B.hy - B.fy) - (g2 - g1), stand: false });
    }
    colliders.push({ x1: B.hx - B.vx * B.half, z1: B.hz - B.vz * B.half, x2: B.hx + B.vx * B.half, z2: B.hz + B.vz * B.half, r: 0.5, y: H(B.hx, B.hz) - 1, h: B.hy - H(B.hx, B.hz) - 0.4, stand: false });
  }
  // the block: its north side (the gap against R2's foot), its head and its south side above 11 m along (6 m up) held;
  // off its low south side a walker steps down onto T1 on purpose
  ctx.addWalkable(blockFloor(), { stack: true, keep: (x, z) => { const dx = x - B.fx, dz = z - B.fz, a = dx * B.ux + dz * B.uz; return dx * B.vx + dz * B.vz > 0 || a > B.L || a > 11; }, name: 'icefall-block' });

  // the bridge: its start on the block's top near its head (plan.levels()), its floor the lead's top facet
  // the bridge: held where it lies over R2's face (below is the face, not a floor); its ends open onto T1 and T2
  ctx.addWalkable(lineFloor(BRIDGE.pts, BRIDGE.half), { stack: true, keep: (x, z) => { const s = sOf(z); return s > 39.6 && s < 54.5; }, name: 'icefall-bridge' });

  parts.push(['stair', G.p.length / 9]);
  // the stair
  const SP = stairPlan();
  {
    for (const f of SP.fl) {
      const seed = rng();
      // outer: +c is down-glacier; the flight's v points down-glacier for flight 1, up for flight 2
      const so = f.vz > 0 ? 1 : -1;
      const at = (a, c) => [f.a[0] + f.ux * a + f.vx * c * so, f.a[1] + f.uz * a + f.vz * c * so];
      const sh = (a) => (f.k === 2 && a > f.L * STAIR.crack ? STAIR.shift : 0);
      for (let i = 0; i < f.n; i++) {
        const a0 = i * f.run, a1 = (i + 1) * f.run, am = (a0 + a1) / 2;
        const yA = treadY(f, am, -STAIR.half + sh(am)), yB = treadY(f, am, STAIR.half + sh(am));
        const c0 = -STAIR.half + sh(am), c1 = STAIR.half + sh(am);
        const p00 = at(a0, c0), p10 = at(a1, c0), p11 = at(a1, c1), p01 = at(a0, c1);
        const dirt = 0.35 + 0.3 * rng(), q = [0.05, seed, dirt];
        // the tread (worn: a top), and its riser below its front edge
        const tA = [p00[0], yA, p00[1]], tB = [p10[0], yA, p10[1]], tC = [p11[0], yB, p11[1]], tD = [p01[0], yB, p01[1]];
        if (so > 0) G.quad(tA, tD, tC, tB, q, q, q, q); else G.quad(tA, tB, tC, tD, q, q, q, q);
        const prevA = i ? treadY(f, a0 - f.run * 0.5, c0) : f.y0, prevB = i ? treadY(f, a0 - f.run * 0.5, c1) : f.y0;
        const rq = [0.25, seed, 0.15];
        const rA = [p00[0], prevA - 0.05, p00[1]], rD = [p01[0], prevB - 0.05, p01[1]];
        if (so > 0) G.quad(rA, tA, tD, rD, rq, rq, rq, rq); else G.quad(rA, rD, tD, tA, rq, rq, rq, rq);
        // the outer side: the body of ice under the flight, down to the ground
        const o0 = at(a0, c1 + 0.15), o1 = at(a1, c1 + 0.15), g0 = H(o0[0], o0[1]) - 2, g1 = H(o1[0], o1[1]) - 2, bq = [0.6, seed, 0.1], tq = [0.15, seed, 0.2];
        const s1 = [o0[0], yB, o0[1]], s2 = [o1[0], yB, o1[1]], s3 = [o1[0], Math.min(g1, yB - 0.5), o1[1]], s4 = [o0[0], Math.min(g0, yB - 0.5), o0[1]];
        if (so > 0) G.quad(s1, s4, s3, s2, tq, bq, bq, tq); else G.quad(s1, s2, s3, s4, tq, tq, bq, bq);
      }
      // the cut: a wall of ice on the inner (up-glacier) side
      const line = [];
      for (let i = 0; i <= f.n; i += 2) { const a = Math.min(f.L, i * f.run), p = at(a, 0); line.push([p[0], p[1], treadY(f, Math.min(f.L - 1e-3, a), 0)]); }
      const S = samples(line, low ? 2 : 1.3);
      wall(G, rng, noise, S, {
        sgn: f.k === 1 ? -1 : 1, half: STAIR.half, thick: 1.8, lean: 0.25,
        top: (i, s, nx, nz) => Math.max(s.y + 2.2, iceAt(s.x + nx * 4, s.z + nz * 4) + 0.5),
        ground: (i, s, nx, nz) => H(s.x + nx * 5, s.z + nz * 5),
      }, colliders);
    }
    // the landing: a slab between the flights
    const LS = samples(SP.landing.pts, 1.2);
    ribbon(G, LS, SP.landing.half, 0, 0.05, 0.4);
    for (const sgn of [1, -1]) {
      const P = [LS.map((s) => [s.x - s.tz * SP.landing.half * sgn, s.y, s.z + s.tx * SP.landing.half * sgn]), LS.map((s) => { const x = s.x - s.tz * (SP.landing.half + 0.3) * sgn, z = s.z + s.tx * (SP.landing.half + 0.3) * sgn; return [x, H(x, z) - 2, z]; })];
      const Q = [LS.map(() => [0.1, 0.3, 0.2]), LS.map(() => [0.6, 0.3, 0.1])];
      G.grid(P, Q, sgn < 0);
    }
  }
  // the stair: its outer edge open (off it, the slump's slope or T2 below); the cut on its inner side is a wall
  ctx.addWalkable(stairFloor(), { stack: true, name: 'icefall-stair' });

  parts.push(['trodden', G.p.length / 9]);
  // the way worn into the ice: a faint trodden line up the block's ramp and across the terraces and the shelf (grit
  // and old footing, darker than the firn), so a walker can see where it goes
  {
    const tread = (pts, half, yAt) => {
      const S = samples(pts.map((p) => [p[0], p[1], 0]), low ? 1.5 : 1);
      for (const q of S) q.y = yAt(q.x, q.z);
      const P = [], Q = [];
      for (const k of [-1, -0.4, 0.4, 1]) {
        P.push(S.map((q) => { const w = half * (0.85 + 0.3 * noise.noise2(q.d * 0.3, k)); const x = q.x - q.tz * w * k, z = q.z + q.tx * w * k; return [x, yAt(x, z), z]; }));
        Q.push(S.map(() => [0.02, 0.5, Math.abs(k) > 0.5 ? 0.45 : 0.85]));
      }
      G.grid(P, Q, true);
    };
    const bf = blockFloor(), lift = 0.07;
    tread([[B.fx + B.ux * 0.5, B.fz + B.uz * 0.5], [B.hx - B.ux * 1.5, B.hz - B.uz * 1.5]], 0.75, (x, z) => (bf(x, z) ?? B.fy) + 0.03);
    for (const L of [LANES.t1, LANES.t2.slice(0, -1), LANES.shelf.slice(1), LANES.approach.slice(1)]) tread(L, 0.6, (x, z) => H(x, z) + lift);
  }

  parts.push(['faces', G.p.length / 9]);
  // ---------------------------------------------------------------- the faces of the steps
  const bridgeX = (z) => BRIDGE.pts[0][0] + (BRIDGE.pts[1][0] - BRIDGE.pts[0][0]) * ((z - BRIDGE.pts[0][1]) / (BRIDGE.pts[1][1] - BRIDGE.pts[0][1]));
  const r2top = zOf(RISERS[1][0] + RISERS[1][1]);
  const lines = { feet: [], lips: [] };
  const nFaces = buildFaces(G, rng, H, noise, low, {
    r2: (x) => (Math.abs(x - bridgeX(r2top)) < 3.2 ? BRIDGE.pts[0][2] - 0.6 : null),
  }, lines);
  // the faces' feet stop a walker on the terrace below; their lips are held (a kerb of ice the height of a person,
  // invisible past the teeth), but where the climb passes over or down them: the slot's cleft, the bridge, the slump
  const kerb = (pts, open, y0, h) => {
    for (let i = 0; i < pts.length - 2; i += 2) {
      const a = pts[i], b = pts[i + 2], mx = (a[0] + b[0]) / 2;
      if (open(mx)) continue;
      colliders.push({ x1: a[0], z1: a[1], x2: b[0], z2: b[1], r: 0.45, y: Math.min(y0(a), y0(b)), h, stand: false });
    }
  };
  kerb(lines.feet[0], (x) => Math.abs(x - SLOT.pts[0][0]) < 4.5, (p) => p[2], 9);
  kerb(lines.feet[1], (x) => Math.abs(x - bridgeX(r2top)) < 4, (p) => p[2], 9);
  kerb(lines.feet[2], (x) => slumpW(x) > 0.02, (p) => p[2], 9);
  kerb(lines.lips[0], () => false, (p) => H(p[0], p[1]) - 1, 2.8); // all along, the ledge south of the slot too (the cleft is a gap in the face: no lip there)
  kerb(lines.lips[1], (x) => Math.abs(x - bridgeX(r2top)) < 3.5, (p) => H(p[0], p[1]) - 1, 2.8);
  kerb(lines.lips[2], () => false, (p) => H(p[0], p[1]) - 1, 2.8);

  parts.push(['seracs', G.p.length / 9]);
  // ---------------------------------------------------------------- the seracs
  const lanePts = [...Object.values(LANES), SLOT.pts.map((p) => [p[0], p[1]]), BRIDGE.pts.map((p) => [p[0], p[1]]), [...STAIR.f1, ...STAIR.landing, ...STAIR.f2].map((p) => [p[0], p[1]])];
  const nr = [0, 0, 0, 0];
  const nearWay = (x, z, m) => {
    for (const L of lanePts) { const pts = L.map((p) => [p[0], p[1], 0]); nearest(pts, x, z, nr); if (nr[0] < m) return true; }
    const dx = x - B.fx, dz = z - B.fz, a = dx * B.ux + dz * B.uz, c = dx * B.vx + dz * B.vz;
    return a > -m && a < B.L + m && Math.abs(c) < B.half + m;
  };
  let nSer = 0;
  const sp = [0, 0];
  const place = (x, z, o, collide) => {
    const y = H(x, z);
    serac(G, rng, { x, y, z, ...o });
    nSer++;
    if (collide) colliders.push({ x, z, r: Math.max(o.w, o.d) * 0.42, y: y - 2, h: o.h + 2, stand: false });
  };
  // along the three steps' lips, where the climb does not pass
  for (let k = 0; k < 3; k++) {
    const zc = zOf(RISERS[k][0] + RISERS[k][1] / 2), ax = axisX(zc);
    for (let x = ax - 72; x < ax + 66; x += 4.5 + rng() * 3.5) {
      if (k === 0 && x > 14 && x < 98) continue; // the slot runs behind R1's lip
      if (k === 1 && x > 44 && x < 64) continue; // the bridge's landing
      if (k === 1 && x > -4 && x < 44 && rng() < 0.65) continue; // thinned in front of the stair
      if (k === 2 && slumpW(x) > 0.05) continue; // the stair's slump
      riserSpan(k, x, zc, sp);
      // the front row leans out over the lip, some far; a second row behind stands up
      const s = sp[1] + 0.8 + rng() * 2.5, z = zOf(s);
      const w = 3 + rng() * 5, d = 2.5 + rng() * 4, h = 3 + rng() * (k === 2 ? 6 : 8) * (rng() < 0.25 ? 1.6 : 1);
      if (!nearWay(x, z, 2.5 + Math.max(w, d) * 0.5)) place(x, z, { w, d, h, rot: rng() * 3.14, lx: (rng() - 0.5) * h * 0.15, lz: h * (0.08 + rng() * rng() * 0.3), slant: (rng() - 0.5) * Math.min(w, h) * 0.4 }, true);
      const x2 = x + (rng() - 0.5) * 3, z2 = zOf(s + 4 + rng() * 4), w2 = 3 + rng() * 4;
      if (rng() < 0.6 && !nearWay(x2, z2, 2.5 + w2 * 0.5)) place(x2, z2, { w: w2, d: 3 + rng() * 3, h: 2 + rng() * 5, rot: rng() * 3.14, lx: (rng() - 0.5), lz: (rng() - 0.5), slant: (rng() - 0.5) * 2 }, true);
    }
    // at the face's foot: columns of ice broken off it, leaning back on it, and the rubble of others
    for (let x = ax - 70; x < ax + 64; x += 7 + rng() * 9) {
      riserSpan(k, x, zc, sp);
      const rise = RISERS[k][2];
      const s = sp[0] - 1.5 - rng() * 3, z = zOf(s);
      const w = 6 + rng() * 7, h = rise * (0.25 + rng() * 0.35);
      if (nearWay(x, z, 3 + w * 0.5) || (k === 2 && slumpW(x) > 0.05) || (k === 0 && Math.abs(x - SLOT.pts[0][0]) < 10)) continue;
      if (k === 0 && hyp(x - 40, z + 265) < 20) continue; // the mother crystal
      place(x, z, { w, d: 4 + rng() * 5, h, rot: rng() * 3.14, lx: (rng() - 0.5) * 2, lz: -(0.5 + rng() * 2), slant: (rng() - 0.5) * w * 0.4 }, k > 0);
      for (let j = 0; j < 3; j++) {
        const rx = x + (rng() - 0.5) * 10, rz = z + 2 + rng() * 6, rw = 1 + rng() * 2.5;
        if (nearWay(rx, rz, 2 + rw) || hyp(rx - 40, rz + 265) < 16) continue;
        place(rx, rz, { w: rw, d: rw * (0.6 + rng() * 0.6), h: rw * (0.5 + rng() * 0.8), rot: rng() * 3, lx: (rng() - 0.5) * rw, lz: (rng() - 0.5) * rw, slant: (rng() - 0.5) * rw, sink: 0.6 }, false);
      }
    }
  }
  // the terraces themselves, away from the way: broken blocks, so the steps read as an icefall and not a stair
  for (let k = 0; k < 3; k++) {
    for (let x = -30; x < 125; x += 4.5 + rng() * 3.5) {
      const zc = zOf(RISERS[k][0] + RISERS[k][1] / 2);
      riserSpan(k, x, zc, sp);
      const top = sp[1];
      let next = k < 2 ? riserSpan(k + 1, x, zOf(RISERS[k + 1][0] + 5), [0, 0])[0] : 112;
      for (let s = top + 3 + rng() * 3; s < next - 3; s += 4.5 + rng() * 4) {
        const z = zOf(s), ax = axisX(z);
        if (Math.abs(x - ax) > 58) continue;
        if (k === 2 && x > 10 && x < 84) continue; // the shelf stays open: the view, and the way to the lip
        if (k === 1 && x > -6 && x < 52) continue; // T2 under the stair: open, so the stair shows from below
        const w = 2.5 + rng() * 5, h = 1.5 + rng() * 5;
        if (nearWay(x, z, 3.5 + w * 0.5)) continue;
        place(x + (rng() - 0.5) * 3, z, { w, d: w * (0.6 + rng() * 0.6), h, rot: rng() * 3, lx: (rng() - 0.5) * h * 0.3, lz: (rng() - 0.5) * h * 0.3, slant: (rng() - 0.5) * w * 0.5, sink: 1.2 }, true);
      }
    }
  }
  // the shelf: a few at its sides and its lip's corners, none in the middle
  for (const [x, z, w, h] of [[-2, -372, 6, 7], [2, -386, 7, 9], [96, -374, 6, 8], [94, -390, 7, 6], [6, -396, 5, 5], [86, -396, 6, 6], [70, -395, 4, 3.5]]) {
    if (nearWay(x, z, 3)) continue;
    place(x, z, { w, d: w * (0.7 + rng() * 0.4), h, rot: rng() * 3, lx: (rng() - 0.5), lz: -0.5 - rng(), slant: (rng() - 0.5) * 2 }, true);
  }
  // the far lip of the last crevasse, and the upper icefall: big, leaning, crowded (out of reach: no colliders)
  const tip = { x: 58, z: -482 };
  for (let x = axisX(zOf(CREVASSE.far)) - 64; x < axisX(zOf(CREVASSE.far)) + 60; x += 5 + rng() * 4) {
    const z = zOf(CREVASSE.far + 1.5 + rng() * 3);
    if (Math.abs(x - 55) < 14) continue; // where the needles land, and the sight of the Plummet's point from the lip
    place(x, z, { w: 4 + rng() * 5, d: 3 + rng() * 3, h: 4 + rng() * 7, rot: rng() * 3, lz: 0.4 + rng() * 1.5, lx: (rng() - 0.5) * 2, slant: (rng() - 0.5) * 2 }, false);
  }
  for (let k = 0; k < UPPER.n; k++) {
    const zc = zOf(UPPER.s0 + k * UPPER.every), ax = axisX(zc);
    for (let x = ax - 66; x < ax + 62; x += 6 + rng() * 6) {
      const s = upperFoot(k, x, zc) + UPPER.run + 1 + rng() * 5, z = zOf(s);
      if (hyp(x - tip.x, z - tip.z) < 16) continue;
      const off = Math.abs(x - (52 + (tip.x - 52) * ((z + 414) / (tip.z + 414))));
      if (off < 9) continue; // the crystals' line, and a clear sight of the Plummet's point from the shelf
      const big = rng() < 0.3 && off > 16;
      place(x, z, { w: (big ? 9 : 5) + rng() * 6, d: 4 + rng() * 5, h: (big ? 10 : 5) + rng() * 8, rot: rng() * 3, lz: 0.5 + rng() * 3, lx: (rng() - 0.5) * 3, slant: (rng() - 0.5) * 4 }, false);
    }
  }
  // the margins: lateral seracs where the ice leans on the walls, low and dirty
  for (let s = 14; s < 112; s += 7 + rng() * 6) {
    const z = zOf(s), ax = axisX(z);
    for (const side of [-1, 1]) {
      const x = ax + side * (52 + rng() * 10);
      if (nearWay(x, z, 6)) continue;
      place(x, z, { w: 3 + rng() * 4, d: 3 + rng() * 3, h: 2 + rng() * 4, rot: rng() * 3, dirt: 0.8, slant: (rng() - 0.5) * 1.5 }, false);
    }
  }

  const iceGeo = G.geometry();
  const ice = new THREE.Mesh(iceGeo, iceMaterial(ctx));
  ice.castShadow = true; ice.receiveShadow = true; ice.name = 'icefall-ice';
  group.add(ice);
  for (const c of colliders) ctx.addCollider(c);

  // ---------------------------------------------------------------- the leads
  const uTime = { value: 0 };
  const glassV = crystalMaterial(ctx, uTime, false), glassI = crystalMaterial(ctx, uTime, true);
  const LP = [], LA = [], bronze = [];
  const up = new THREE.Vector3(0, 1, 0);
  // a lead whose point is at `point`, its axis (point to collar) `u`; `face`: the local direction that is to face up
  const leadAt = (point, u, R, L, along, tint, o = {}) => {
    u = u.clone().normalize();
    let Z = up.clone().addScaledVector(u, -u.dot(up)); if (Z.lengthSq() < 1e-4) Z.set(0, 0, 1); Z.normalize();
    const X = new THREE.Vector3().crossVectors(u, Z).normalize();
    const M = new THREE.Matrix4().makeBasis(X, u, Z).setPosition(point);
    const lr = ctx.makeRng(Math.floor(along * 7 + 11));
    const res = lead(LP, LA, M, o.exact ? () => 0.5 : lr, R, L, along, tint);
    for (const g of collar(R, res.neckY, o)) { g.applyMatrix4(M); bronze.push(g); }
    return { M, neckY: res.neckY };
  };
  // the Plummet: point down in the ice at the head of the glacier, 180 m from its point to its eye (R 21, L 170, the collar on top)
  const tipY = H(tip.x, tip.z) - 10;
  const PL = { R: 21, L: 170 };
  const plumV0 = LP.length / 3;
  const plum = leadAt(new THREE.Vector3(tip.x, tipY, tip.z), up, PL.R, PL.L, 620, 0.12);
  const plumV1 = LP.length / 3; // its vertices: the pulse is run up them from the line's end (below)
  const eyeTop = new THREE.Vector3(tip.x, tipY + plum.neckY + PL.R * 0.62, tip.z);
  // where its point has gone in, the ice is split and lit from below: a cold light, and cracks of glass running out
  {
    const L = new THREE.PointLight(new THREE.Color(ctx.palette.crystal), 400, 70, 2);
    L.position.set(tip.x, H(tip.x, tip.z) + 2, tip.z); L.name = 'icefall-plummet-light';
    group.add(L);
  }
  // R3's lead, turned half over: its point out of the face, down and toward the valley, its collar in the ice
  {
    const x = 72, zc = zOf(RISERS[2][0] + RISERS[2][1] / 2); riserSpan(2, x, zc, sp);
    const sm = (sp[0] + sp[1]) / 2, y = iceY(x, zOf(sp[0])) + 9, z = zOf(sm) + 4.5;
    const u = new THREE.Vector3(0.25, Math.cos(1.05), -Math.sin(1.05));
    leadAt(new THREE.Vector3(x, y, z), u, 3.2, 30, 330, 0.5);
  }
  // R2's lead, further over: lying, its collar out of the face
  {
    const x = 18, zc = zOf(RISERS[1][0] + RISERS[1][1] / 2); riserSpan(1, x, zc, sp);
    const y = iceY(x, zOf(sp[0])) + 7, z = zOf(sp[0] + 7);
    const u = new THREE.Vector3(-0.35, -0.18, 0.92);
    const p = new THREE.Vector3(x, y, z).addScaledVector(u.clone().normalize(), -22);
    leadAt(p, u, 2.6, 28, 230, 0.55);
  }
  // the bridge's lead: its top facet is the bridge's floor, its collar on the block, its point in T2's lip
  {
    const S = new THREE.Vector3(BRIDGE.pts[0][0], BRIDGE.pts[0][2], BRIDGE.pts[0][1]), E = new THREE.Vector3(BRIDGE.pts[1][0], BRIDGE.pts[1][2], BRIDGE.pts[1][1]);
    const R = 1.9, body = S.distanceTo(E), L = body / 0.56;
    const u = S.clone().sub(E).normalize();
    const Z = up.clone().addScaledVector(u, -u.dot(up)).normalize();
    const Eaxis = E.clone().addScaledVector(Z, -R * Math.cos(Math.PI / 6));
    const point = Eaxis.addScaledVector(u, -L * 0.36);
    leadAt(point, u, R, L, 190, 0.6, { exact: true, broken: true, noEye: true });
    // the collar lying on the block: keep walkers out of it
    const c = S.clone().addScaledVector(u, L * 0.08 + 0.4);
    ctx.addCollider({ x: c.x, z: c.z, r: 1.15, y: c.y - 2, h: 2.6, stand: false });
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(LP, 3));
  const LAa = new Float32Array(LA.length / 2), LTa = new Float32Array(LA.length / 2);
  for (let i = 0; i < LAa.length; i++) { LAa[i] = LA[i * 2]; LTa[i] = LA[i * 2 + 1]; }
  lg.setAttribute('aAlong', new THREE.Float32BufferAttribute(LAa, 1));
  lg.setAttribute('aTint', new THREE.Float32BufferAttribute(LTa, 1));
  lg.computeVertexNormals(); lg.computeBoundingSphere();
  const leads = new THREE.Mesh(lg, glassV.mat);
  leads.castShadow = true; leads.receiveShadow = true; leads.name = 'icefall-leads';
  group.add(leads);

  // the find: an eye broken off a lead, lying at the lip of the last crevasse, the glyphs of the lintel on its band
  const FIND = { x: 41, z: -395.5, R: 6.4 }; // where the way ends at the lip, beside it
  let findMesh = null;
  {
    const y = H(FIND.x, FIND.z);
    const M = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.62, -0.9, -0.12, 'YXZ')); // tipped toward where the way arrives
    M.setPosition(FIND.x, y - 0.8, FIND.z);
    for (const g of collar(FIND.R, 0, { broken: true, noStraps: true })) { g.applyMatrix4(M); bronze.push(g); }
    // the band's glyphs: a second skin just outside the band, mapped round it
    const band = new THREE.CylinderGeometry(FIND.R * 0.512, FIND.R * 0.532, FIND.R * 0.2, 48, 1, true);
    band.translate(0, FIND.R * 0.05, 0); band.applyMatrix4(M);
    const tex = glyphBand(ctx); tex.repeat.set(2, 1);
    // the glyphs glow the crystal's blue, as the Reckoner's lintel does since the crystal's light reached it
    const bm = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, metalness: 0.5, roughness: 0.55, emissive: new THREE.Color('#5fc0ff'), emissiveIntensity: 1.4 });
    findMesh = new THREE.Mesh(band, bm); findMesh.name = 'icefall-find'; findMesh.castShadow = true; findMesh.receiveShadow = true;
    group.add(findMesh);
    // its line: a cord knotted through the eye, trailing to the lip and over it, its end frayed and still faintly lit
    const eyeW = new THREE.Vector3(0, FIND.R * 0.42, 0).applyMatrix4(M);
    const lip = new THREE.Vector3(FIND.x + 3, H(FIND.x + 3, LIP.z + 0.3) + 0.15, LIP.z + 0.2);
    const pts = [eyeW, eyeW.clone().add(new THREE.Vector3(1.2, -0.6, -0.8)), new THREE.Vector3((eyeW.x + lip.x) / 2, H((eyeW.x + lip.x) / 2, (eyeW.z + lip.z) / 2) + 0.12, (eyeW.z + lip.z) / 2), lip, lip.clone().add(new THREE.Vector3(0.3, -2.5, -1.0)), lip.clone().add(new THREE.Vector3(0.5, -5.5, -1.2))];
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.TubeGeometry(curve, 40, 0.16, 6, false);
    const cordMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6a5636'), roughness: 0.9, emissive: new THREE.Color('#ffc890'), emissiveIntensity: 0 });
    cordMat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying float vCordU;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvCordU = uv.x;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vCordU;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.78, 0.5) * 0.35 * smoothstep(0.75, 1.0, vCordU);');
    };
    const cord = new THREE.Mesh(tube, cordMat); cord.castShadow = true; cord.name = 'icefall-cord';
    group.add(cord);
    ctx.addCollider({ x: FIND.x, z: FIND.z, r: FIND.R * 0.5, y: y - 1, h: 1.6, stand: false });
    const fl = new THREE.PointLight(new THREE.Color('#7fd0ff'), 6, 9, 2); fl.position.set(FIND.x, y + 1.2, FIND.z); fl.name = 'icefall-find-light'; group.add(fl);
  }
  const bg = mergeGeometries(bronze);
  bg.computeVertexNormals();
  const bronzeMesh = new THREE.Mesh(bg, bronzeMaterial(ctx));
  bronzeMesh.castShadow = true; bronzeMesh.receiveShadow = true; bronzeMesh.name = 'icefall-bronze';
  group.add(bronzeMesh);

  // ---------------------------------------------------------------- the crystals' line
  const C = [];
  let along = 0;
  const cr = (x, y, z, h, r, dir, tint = 0.5) => C.push({ x, y, z, h, r, dir, rot: rng() * 6.28, along, tint });
  const cluster = (x, z, n, hMax, y0 = null) => {
    for (let k = 0; k < n; k++) {
      const a = rng() * 6.28, d = rng() * 0.9, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, h = hMax * (0.4 + rng() * 0.6);
      cr(px, (y0 ?? H(px, pz)) - 0.1, pz, h, h * (0.11 + rng() * 0.06), [Math.cos(a) * 0.35, 1, Math.sin(a) * 0.35], rng());
    }
  };
  const walkLine = (pts, every, fn) => {
    let carry = every * 0.5;
    for (let i = 0; i < pts.length - 1; i++) {
      const A = pts[i], Bp = pts[i + 1], L = hyp(Bp[0] - A[0], Bp[1] - A[1]);
      while (carry <= L) { const t = carry / L; along += every; fn(A[0] + (Bp[0] - A[0]) * t, A[1] + (Bp[1] - A[1]) * t, (Bp[0] - A[0]) / L, (Bp[1] - A[1]) / L, t, i); carry += every; }
      carry -= L;
    }
  };
  let side = 1;
  // from the mother crystal to the cleft: clusters beside the way, alternating
  walkLine(LANES.approach, 4.5, (x, z, tx, tz) => { side = -side; cluster(x - tz * side * 2.2, z + tx * side * 2.2, 3, 2.2); });
  // the cleft: a pair of giants either side of its mouth
  for (const [dx, z, h] of [[-4.9, -294.8, 15], [4.9, -294.2, 11], [-6.5, -297.6, 6], [6.5, -297.0, 5]]) { const x = SLOT.pts[0][0] + dx; cr(x, H(x, z) - 0.4, z, h, h * 0.1, [dx * 0.04, 1, 0.08], 0.8); }
  C.push({ ...slotCrystal, along: 40 });
  // the slot: out of its walls into the way and up, and along its outer wall's top (seen from below over R1's lip)
  {
    const S = samples(SLOT.pts, 1);
    for (let i = 2; i < S.length; i += 3) {
      const s = S[i]; along += 3; side = -side;
      const nx = -s.tz * side, nz = s.tx * side, y = s.y + 2.4 + rng() * 1.6; // above the head
      cr(s.x + nx * (slotHalf(s.d) + 0.15), y, s.z + nz * (SLOT.half + 0.15), 1.0 + rng() * 1.2, 0.14 + rng() * 0.08, [-nx * 0.7, 0.75, -nz * 0.7], rng());
      // beacons on the outer (south) wall's top, every 4 m: from the floor a line of glass up the ice front's lip
      if (i % 4 === 2 && i > 18) {
        const ox = s.x + s.tz * (SLOT.half + 1.4), oz = s.z - s.tx * (SLOT.half + 1.4);
        const top = Math.max(s.y + 3.4, iceAt(s.x + s.tz * (SLOT.half + 2.4), s.z - s.tx * (SLOT.half + 2.4)) + 0.7);
        cr(ox, top - 0.8, oz, 8 + rng() * 4, 0.85, [0.1, 1, 0.35], 1.0);
      }
    }
  }
  // T1: beside the lane on the slot's side
  walkLine(LANES.t1, 6, (x, z, tx, tz) => cluster(x - tz * 2.2, z + tx * 2.2, 2, 1.8));
  // the block: along its top's edges
  for (let a = 3; a < B.L - 2; a += 4) {
    along += 4;
    for (const sgn of [1, -1]) {
      if (rng() < 0.35) continue;
      const c = sgn * (B.half - 0.15), x = B.fx + B.ux * a + B.vx * c, z = B.fz + B.uz * a + B.vz * c, y = B.fy + (B.hy - B.fy) * (a / B.L);
      cr(x, y - 0.2, z, 1.8 + rng() * 2.6, 0.22, [B.vx * sgn * 0.5, 1, B.vz * sgn * 0.5], 0.8 + rng() * 0.2);
    }
  }
  along += 18; // the bridge (the lead)
  cluster(BRIDGE.pts[1][0] - 1.8, BRIDGE.pts[1][1] - 2.2, 5, 9.0);
  walkLine(LANES.t2, 6, (x, z, tx, tz) => cluster(x + tz * 2.3, z - tx * 2.3, 2, 1.7));
  // the stair: out of the cut above head height, pointing out over the treads
  for (const f of SP.fl) {
    for (let a = 1.5; a < f.L; a += 3.2) {
      along += 3.2;
      const so = f.vz > 0 ? 1 : -1, c = -(STAIR.half + 0.1);
      const x = f.a[0] + f.ux * a + f.vx * c * so, z = f.a[1] + f.uz * a + f.vz * c * so, y = treadY(f, a, 0) + 2.3 + rng() * 0.6;
      cr(x, y, z, 0.9 + rng() * 0.9, 0.12, [f.vx * so * 0.8, 0.6, f.vz * so * 0.8], rng());
      // and a post of glass at its outer edge every 3 m: the flights' line in silhouette from below
      const co = STAIR.half + 0.25 + (f.k === 2 && a > f.L * STAIR.crack ? STAIR.shift : 0);
      const px = f.a[0] + f.ux * a + f.vx * co * so, pz = f.a[1] + f.uz * a + f.vz * co * so;
      cr(px, treadY(f, a, STAIR.half) - 0.4, pz, 3.2 + rng() * 2.0, 0.3, [f.vx * so * 0.15, 1, f.vz * so * 0.15], 1.0);
    }
  }
  cr(44.2, SP.landing.y - 0.3, -357.6, 8, 0.8, [0.15, 1, 0.3], 0.85);
  cr(STAIR.f2[1][0] - 2.5, STAIR.f2[1][2] - 0.3, STAIR.f2[1][1] + 1.5, 10, 0.95, [-0.1, 1, 0.25], 0.85); // the stair's head, seen from below
  walkLine(LANES.shelf, 5.5, (x, z, tx, tz) => { side = -side; const cx = x - tz * side * 2.4, cz = z + tx * side * 2.4; if (hyp(cx - FIND.x, cz - FIND.z) > FIND.R + 2) cluster(cx, cz, 2, 1.6 + along * 0.002); });
  cluster(56, -396.8, 5, 3.2); cluster(60.5, -396.6, 4, 2.6);
  // across the last crevasse: needles, three strands from the lip to the far wall, too thin to bear anyone
  {
    const a0 = new THREE.Vector3(51, H(51, LIP.z + 0.6) - 0.3, LIP.z + 0.6), a1 = new THREE.Vector3(53, H(53, zOf(CREVASSE.far + 0.8)) - 0.5, zOf(CREVASSE.far + 0.8));
    for (const [ox, sag] of [[-1.6, 1.2], [0, 2.2], [1.9, 0.6]]) {
      const n = 4;
      for (let k = 0; k < n; k++) {
        const t0 = k / n, t1 = (k + 1) / n, p0 = a0.clone().lerp(a1, t0), p1 = a0.clone().lerp(a1, t1);
        p0.x += ox; p1.x += ox; p0.y -= sag * Math.sin(t0 * Math.PI); p1.y -= sag * Math.sin(t1 * Math.PI);
        const d = p1.clone().sub(p0), L = d.length();
        along += 1.5;
        C.push({ x: p0.x, y: p0.y, z: p0.z, h: L * 1.15, r: 0.1 + rng() * 0.08, dir: [d.x, d.y, d.z], rot: rng() * 6, along, tint: 0.9 });
      }
    }
  }
  // up the upper icefall to the Plummet's point, thickening into a crown round it
  {
    const p0 = [53, zOf(CREVASSE.far + 2)], n = 9;
    for (let k = 1; k <= n; k++) {
      const t = k / (n + 1), x = p0[0] + (tip.x - p0[0]) * t + (rng() - 0.5) * 3, z = p0[1] + (tip.z - p0[1]) * t;
      along += 7;
      cluster(x, z, 3, 2.5 + 4 * t);
    }
    along += 10;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * 6.28 + rng() * 0.3, d = 9 + rng() * 9, x = tip.x + Math.cos(a) * d, z = tip.z + Math.sin(a) * d, h = 8 + rng() * 16;
      cr(x, H(x, z) - 1, z, h, h * 0.1, [Math.cos(a) * 0.45, 1, Math.sin(a) * 0.45], 0.5 + rng() * 0.4);
    }
    // the ice split round the point: glass lying in the cracks, radiating out over the ice
    for (let k = 0; k < 11; k++) {
      const a = (k / 11) * 6.28 + rng() * 0.4;
      let x = tip.x + Math.cos(a) * (PL.R * 0.6), z = tip.z + Math.sin(a) * (PL.R * 0.6);
      for (let j = 0; j < 3; j++) {
        const L = 6 + rng() * 6, aa = a + (rng() - 0.5) * 0.5, x2 = x + Math.cos(aa) * L, z2 = z + Math.sin(aa) * L;
        C.push({ x, y: H(x, z) - 0.15, z, h: L * 1.1, r: 0.18 + rng() * 0.15, dir: [x2 - x, H(x2, z2) - H(x, z), z2 - z], rot: 0, along, tint: 0.95 });
        x = x2; z = z2;
      }
    }
  }
  // the pulse that climbs the line arrives in the Plummet's point and climbs it to the eye: its along runs on from the
  // line's end by height
  {
    const a = lg.attributes.aAlong;
    for (let i = plumV0; i < plumV1; i++) a.array[i] = along + (LP[i * 3 + 1] - tipY);
    a.needsUpdate = true;
  }
  const crys = crystalMesh(ctx, C, glassI.mat, rng);
  group.add(crys.mesh);

  // ---------------------------------------------------------------- past the walk limit: T2, the stair, the shelf
  const M = ctx.mountains;
  // one band over T2 and R3's face (so a fall off the shelf's front lands on T2, inside), one over the shelf to its lip
  M.addCorridor({ name: 'icefall-t2', pts: [[2, -352], [96, -352]], half: 15 });
  M.addCorridor({ name: 'icefall-shelf', pts: [[14, -381], [86, -381]], half: -LIP.z - 381 });

  // the ascent, walked by tools/heights-test.mjs
  const sl = SLOT.pts;
  const path = [
    [LANES.approach[0][0], LANES.approach[0][1]], LANES.approach[1], [sl[0][0], sl[0][1] + 1.0], [sl[0][0], sl[0][1], sl[0][2]],
    [sl[1][0], sl[1][1], sl[1][2]], [sl[3][0], sl[3][1] + 0.3, sl[3][2]], ...sl.slice(4).map((p) => [p[0], p[1], p[2]]),
    [sl[sl.length - 1][0] - 4.5, sl[sl.length - 1][1] - 0.5], ...LANES.t1.slice(0, 3), LANES.t1[3], LANES.t1[4], [B.fx + 2.2, B.fz - 0.1], [B.fx - 1.5, B.fz, B.fy + (B.hy - B.fy) * (1.5 / B.L)],
    [BRIDGE.pts[0][0] + 3.5, BRIDGE.pts[0][1] + 0.1], [BRIDGE.pts[0][0], BRIDGE.pts[0][1], BRIDGE.pts[0][2]], [BRIDGE.pts[1][0], BRIDGE.pts[1][1], BRIDGE.pts[1][2]],
    ...LANES.t2.slice(1, -1), [STAIR.f1[0][0] + 0.4, STAIR.f1[0][1] + 0.1],
    [STAIR.f1[1][0], STAIR.f1[1][1], STAIR.f1[1][2]], [STAIR.landing[1][0], STAIR.landing[1][1], STAIR.f1[1][2]], [STAIR.f2[0][0], STAIR.f2[0][1], STAIR.f2[0][2]],
    [STAIR.f2[1][0], STAIR.f2[1][1], STAIR.f2[1][2]], ...LANES.shelf.slice(1, -1), [LANES.shelf[LANES.shelf.length - 1][0], LANES.shelf[LANES.shelf.length - 1][1] + 0.8],
  ];
  ctx.ascents?.add({ id: 'icefall', path, offs: [0.12, 0.3, 0.5, 0.7, 0.97] });

  // the thread stands on the Plummet's eye: on the first frame the sky is there (the modules build side by side)
  let anchored = false;

  // per frame: the crystals' clock, their gain in a gutter
  ctx.registerUpdate((dt) => {
    if (!anchored && ctx.skylife?.anchorThread) { ctx.skylife.anchorThread(eyeTop); anchored = true; }
    uTime.value += dt;
    const g = 1 + 0.9 * (1 - (ctx.sky?.flicker?.value ?? 1));
    glassV.uni.uGain.value = g; glassI.uni.uGain.value = g;
  });

  const tris = iceGeo.attributes.position.count / 3 + crys.tris + LP.length / 9 + bg.attributes.position.count / 3;
  // where tools/icefall-walk.mjs falls from: standing on the way, facing off its side
  const f2 = SP.fl[1];
  const at = (x, z, yaw) => ({ x, z, y: 300, yaw });
  const falls = {
    block: at(B.fx + B.ux * 8 - B.vx * (B.half - 0.6), B.fz + B.uz * 8 - B.vz * (B.half - 0.6), Math.atan2(B.vx, B.vz)),
    bridge: at(B.fx + B.ux * (B.L - 4) - B.vx * (B.half - 0.6), B.fz + B.uz * (B.L - 4) - B.vz * (B.half - 0.6), Math.atan2(B.vx, B.vz)),
    stair: at(f2.a[0] + f2.ux * f2.L * 0.8 - f2.vx * 0.6, f2.a[1] + f2.uz * f2.L * 0.8 - f2.vz * 0.6, Math.atan2(f2.vx, f2.vz)),
    shelf: at(72, zOf(riserSpan(2, 72, zOf(77), [0, 0])[1] + 3), Math.PI),
    bridgeMid: at(BRIDGE.pts[0][0] + (BRIDGE.pts[1][0] - BRIDGE.pts[0][0]) * 0.6, BRIDGE.pts[0][1] + (BRIDGE.pts[1][1] - BRIDGE.pts[0][1]) * 0.6, -Math.PI / 2),
  };
  ctx.icefall = {
    group, eyeTop, tip: { ...tip, y: tipY }, find: FIND, path, falls, parts, ice,
    stats: () => ({ drawCalls: group.children.length, triangles: Math.round(tris), iceTris: Math.round(iceGeo.attributes.position.count / 3), seracs: nSer, faces: nFaces, crystals: C.length }),
  };
  ctx.log?.(`icefall: ${Math.round(tris)} tris, ${nSer} seracs, ${C.length} crystals`);
}
