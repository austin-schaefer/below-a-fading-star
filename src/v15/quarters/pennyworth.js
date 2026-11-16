// The Pennyworth (v15-Q4): the Lappet's foot, where the village meets the Pomegranate House and the open valley.
// Everything stands where src/v15/plan.js says (its plots, its FIXTURES, its lanes); nothing here names a coordinate
// of its own but offsets inside a thing's own frame.
//
//   the plots     the two plaster booths under the ramp's revetment and the two houses north of the house's stable
//                 (one on the flat, one up on the field bank, washing across the lane between them, steps down the
//                 bank), and the Spilt Measure: the carrier that fell off the end of the daylight main, lying along
//                 the lowest riser, someone living in its sound half, beans in pots at its broken mouth.
//   the market    along the Thumbway, facing the house's south wall and its lamps: a three-cornered cloth by the
//                 south door, the salt-weigher's plank on two Heliarch drums (the Twk-men's perch on it, a peg at
//                 thumb height, the pedlar's peg empty on the post behind), a block of the keep for a counter.
//                 Every board is bare: what is sold comes with the people (batch 3).
//   the Grudge    the garden: a low mud wall, three beds, beans on crossed poles, a well under a bored Heliarch drum
//                 with a sweep on a forked post. The Tesserine Moles heap in the beds (src/v7/glyphs/moles.js, kept
//                 off the stalls and lanes by the plan's molesMay); the gardener picks the tesserae out and lines
//                 them up along the wall's coping, and has laid a slab over the worst of it.
//   the Skirts    the lowest riser east of the wreck, what later hands made of the giants' face: a Heliarch panel of
//                 exact ashlar with a walled-up arch, a Late buttress raked against it, two lean-tos under plank roofs.
//   the Leave     two posts of stacked Heliarch drums either side of the old kerb where the village ends (one broken
//                 short), and the last lamp on an arm lashed to the whole one.
//   the ground    flags at the south door and along the lane's worn line.
//
// No point light: the house's court light, the Leerie's and the main's already fill the three slots anywhere near
// kerb K1 (tools/house-test.mjs). The quarter is lit by glass: its lamps, its lit panes, the booths' niches.
// Draws: `pennyworth` (the stone shader) and `pennyworth-elder` (when a maker writes Elder blocks). On low both are
// hidden from beyond 150 m (ctx.lappet.farHidden). ctx.pennyworth = { records, places, stats() }. ?pennyworth=0.
import * as THREE from 'three';
import { mat } from '../../structures/geo.js';
import { makePlot, registerAll, plotMatrix } from '../houses/index.js';
import { L, H, V, N, PARTS, rngOf, ch, worn, quad, hangLamp, beam, pot, washing, limeGlow, facade, pick, leaf, hangSign } from '../houses/kit.js';

// what each plot is given beyond what the plan says (the seed is the building)
const OPTS = {
  'pennyworth-stall-1': { seed: 3 }, 'pennyworth-stall-2': { seed: 8 },
  'pennyworth-house-1': { seed: 5, form: 'step', stair: false }, 'pennyworth-house-2': { seed: 17, form: 'tower', stair: false },
  'carrier-house': { seed: 3, form: 'wreck', glaze: 3 },
  // (round 2: stood at the ground before their doors; `to` is what the weather has taken each one's wash toward)
  'pennyworth-kerb-1': { seed: 11, form: 'step', stair: false, stand: true, to: '#8a6a4e', k: 0.34 }, 'pennyworth-kerb-2': { seed: 7, form: 'tower', stair: false, stand: true, to: '#6f6a78', k: 0.3 },
  'pennyworth-east-1': { seed: 4, form: 'tower', stair: false, stand: true, to: '#93704a', k: 0.38 },
  'pennyworth-hitch-3': { seed: 9, form: 'long', stair: false, stand: true, to: '#7b5f52', k: 0.36 }, 'pennyworth-hitch-4': { seed: 14, form: 'tower', stair: false, stand: true, to: '#6b6f66', k: 0.3 },
  'pennyworth-gate-1': { seed: 21, form: 'tower', stair: false, stand: true, to: '#8c6b55', k: 0.33 }, 'pennyworth-gate-2': { seed: 12, form: 'step', stair: false, stand: true, to: '#75697a', k: 0.3 }, // (seed 3: its neck lies at the end toward the main)
};
const LEAF = new THREE.Color('#5c7a40'), LEAF_D = new THREE.Color('#46633a'), SOIL = new THREE.Color('#3a2e22');
const TESS = [new THREE.Color('#8a2a1c'), new THREE.Color('#b8902a'), new THREE.Color('#26407a')]; // the moles' red, gold and lapis (src/v7/glyphs/moles.js)

export async function build(ctx) {
  if (!ctx.strata?.on || new URL(location.href).searchParams.get('pennyworth') === '0') return;
  if (ctx.built) { await ctx.built('lappet'); await ctx.built('living-glyphs'); } // (the plan and the bones' kit; the moles' slots: modules build side by side)
  if (!ctx.lappet || ctx.lappet.on === false || !ctx.lappet.plan) return;
  const P = ctx.lappet.plan, T = ctx.terrain, low = ctx.quality === 'low', rng = rngOf(1513, 1);
  const G = (x, z) => T.heightAt(x, z);
  const B = ctx.strata.builder(), E = ctx.strata.builder();
  const places = [], lamps = []; // what is left for people and goods; the glass that lights the quarter
  const frame = (f, y = G(f.x, f.z)) => plotMatrix({ x: f.x, y, z: f.z, face: f.face });
  const world = (M, x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(M);
  const collide = (M, x1, z1, x2, z2, r, y, h, extra = {}) => { const a = world(M, x1, y, z1), b = world(M, x2, y, z2); ctx.addCollider({ x1: a.x, z1: a.z, x2: b.x, z2: b.z, r, y: a.y, h, ...extra }); };
  const post = (M, x, z, r, y = 0, h = 2.4) => { const a = world(M, x, y, z); ctx.addCollider({ x: a.x, z: a.z, r, y: a.y, h, stand: false }); };
  const place = (name, M, x, y, z, what) => { const a = world(M, x, y, z); places.push({ name, x: +a.x.toFixed(2), y: +a.y.toFixed(2), z: +a.z.toFixed(2), what }); };
  const wood = (k = 0.2) => ({ color: worn(L.wood, rng, k), moss: 0.12, ground: -3 }), raw = () => ({ color: worn(V.rawWood, rng, 0.25), moss: 0.1, ground: -3, round: 5 });
  const stoneO = (g0, k = 0.12) => ({ color: worn(H.stone, rng, k), moss: 0.4, ground: g0 });
  // a cloth between three or four corners (local points), hanging in its middle: two leaves a finger apart, so it has an underside
  const cloth = (M, pts, sag, col, laid = false, glow = 0) => { // (laid: flat on something, one leaf; glow: lamplight caught in it, so its dye reads from under at dusk)
    const o = { color: col, moss: 0.02, ground: -5, ...(glow ? { emit: [col.r * glow, col.g * glow, col.b * glow, 2] } : {}) }, n = pts.length === 4 ? 4 : 0;
    const up = (pts[1][2] - pts[0][2]) * (pts[2][0] - pts[0][0]) - (pts[1][0] - pts[0][0]) * (pts[2][2] - pts[0][2]) > 0; // the corners as given wind to face up
    const at = n ? (u, v, d) => { const a = pts[0], b = pts[1], c = pts[2], e = pts[3], w = [(1 - u) * (1 - v), u * (1 - v), u * v, (1 - u) * v], k = 16 * u * (1 - u) * v * (1 - v); return [0, 1, 2].map((i) => a[i] * w[0] + b[i] * w[1] + c[i] * w[2] + e[i] * w[3] - (i === 1 ? sag * k + d : 0)); } : null;
    for (const d of laid ? [0] : [0, 0.014]) {
      const under = d > 0, nat = under !== up, oo = under ? { ...o, color: col.clone().multiplyScalar(0.78) } : o;
      if (n && under) for (let i = 0; i < n; i++) for (const [e0, e1] of [[[i / n, 0], [(i + 1) / n, 0]], [[i / n, 1], [(i + 1) / n, 1]], [[0, i / n], [0, (i + 1) / n]], [[1, i / n], [1, (i + 1) / n]]]) { const t0 = at(e0[0], e0[1], 0), t1 = at(e1[0], e1[1], 0), u0 = at(e0[0], e0[1], d), u1 = at(e1[0], e1[1], d); const c = at(0.5, 0.5, 0), out = ((t1[1] - t0[1]) * (u1[2] - t0[2]) - (t1[2] - t0[2]) * (u1[1] - t0[1])) * (t0[0] - c[0]) + ((t1[0] - t0[0]) * (u1[1] - t0[1]) - (t1[1] - t0[1]) * (u1[0] - t0[0])) * (t0[2] - c[2]) > 0; if (out) quad(B, M, t0, t1, u1, u0, oo); else quad(B, M, u0, u1, t1, t0, oo); } // (the hem: the two leaves sewn shut all round)
      if (n) for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const p = [at(i / n, j / n, d), at((i + 1) / n, j / n, d), at((i + 1) / n, (j + 1) / n, d), at(i / n, (j + 1) / n, d)]; if (nat) quad(B, M, p[0], p[1], p[2], p[3], oo); else quad(B, M, p[2], p[1], p[0], p[3], oo); } // (turned over on the same diagonal: two leaves split on different diagonals cross where the cloth sags)
      else {
        const [a, b, c] = pts, mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - sag - d, (p[2] + q[2]) / 2], ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
        for (const t of [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]]) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(nat ? [...t[0], ...t[1], ...t[2]] : [...t[0], ...t[2], ...t[1]], 3)); B.add(g, M, oo); }
      }
    }
  };
  // a flag of the lane's paving at a world point, on the ground as it lies
  const flag = (x, z, w, d, ry = 0) => { const g = G(x, z); B.add(B.box(w, 0.16, d, { seg: 9, chip: 0.03, chipTop: true, seed: x * 7 + z }), mat(x, g - 0.045 + rng() * 0.012, z, (rng() - 0.5) * 0.02, ry, (rng() - 0.5) * 0.02), { color: worn(V.flag, rng, 0.2, 0.2), moss: 0.45, wet: 0.08, ground: g - 0.3 }); };
  // a cloth roof on four poles over a stall (local: hx half its width, zb its back, zf its front, hb and hf its heights), and a lamp hung under it
  const roofed = (M, g, hx, zb, zf, hb, hf, col, lx) => {
    for (const [x, z, h] of [[-hx, zb, hb], [hx, zb, hb], [-hx, zf, hf], [hx, zf, hf]]) { beam(B, M, [x + (rng() - 0.5) * 0.06, -0.25, z], [x, h + 0.1, z], 0.06, raw()); post(M, x, z, 0.08); }
    cloth(M, [[-hx - 0.1, hb, zb - 0.1], [hx + 0.1, hb, zb - 0.1], [hx + 0.12, hf, zf + 0.15], [-hx - 0.12, hf, zf + 0.15]], 0.14, col, false, 0.22);
    const ly = (hb + hf) / 2 - 0.2; beam(B, M, [lx, ly, (zb + zf) / 2], [lx, ly + 0.13, (zb + zf) / 2], 0.008, { color: V.rope, moss: 0, ground: g - 3 });
    const lp = world(M, lx, ly, (zb + zf) / 2); hangLamp(B, { x: lp.x, y: lp.y, z: lp.z }, 'amber', 0.6); lamps.push({ x: lp.x, y: lp.y, z: lp.z });
  };
  const leafy = (M, x, y, z, s, col = LEAF) => B.add(B.rock(s, low ? 0 : 1, 1, 0.55, 1), ch(M, x, y, z, (rng() - 0.5) * 0.5, rng() * 3, (rng() - 0.5) * 0.5), { color: worn(col, rng, 0.1, 0.3), moss: 0, ground: -5, flat: true });
  // a bine up a pole from a to b (local points): one ragged column of leaf from the earth at its foot to short of the top
  const bine = (M, a, b, r, col = LEAF) => { const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(), t0 = -0.02, t1 = 0.86, mid = new THREE.Vector3(a[0], a[1], a[2]).addScaledVector(d, (t0 + t1) / 2), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); B.add(B.rock(1, low ? 0 : 1, r, len * (t1 - t0) / 2, r), M.clone().multiply(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1))), { color: worn(col, rng, 0.1, 0.25), moss: 0, ground: -5, flat: true, disp: r * 0.5, dispScale: 5 }); };
  // a plot's building weathered after its maker: its colours taken toward dirt and its limewash's held light halved (out of the keep's shadow a clean wash is a white box)
  const dull = (from, k, to = V.dirt) => { const C = B.C, Em = B.E; for (let i = from; i < B.count; i++) { const f = k * (0.55 + 0.9 * rng()); C[i * 3] += (to.r - C[i * 3]) * f; C[i * 3 + 1] += (to.g - C[i * 3 + 1]) * f; C[i * 3 + 2] += (to.b - C[i * 3 + 2]) * f; if (Em[i * 4 + 3] === 2) { Em[i * 4] *= 0.4; Em[i * 4 + 1] *= 0.4; Em[i * 4 + 2] *= 0.4; } } };

  // ---------------------------------------------------------------- the plots, by the kit
  const records = [];
  for (const p of P.PLOTS) {
    if (p.quarter !== 'pennyworth' || !OPTS[p.name]) continue;
    const O = OPTS[p.name];
    let q = p.kind === 'carrier' ? { ...p, y: p.y + 0.015 } : p; // (the wreck a finger proud of its pad: a board of its yard lies at its foot's own height, in the pad's plane)
    if (O.stand) {
      // at the ground before its door; where the ground falls away under it, a footing of the Heliarchy's ashlar that was here first
      const yy = G(p.x + p.face[0] * (p.d / 2 + 0.3), p.z + p.face[1] * (p.d / 2 + 0.3)) + 0.03; q = { ...p, y: yy };
      const Mq = plotMatrix(q); let lo = Infinity; for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) { const wq = world(Mq, a * p.w / 2, 0, b * p.d / 2); lo = Math.min(lo, G(wq.x, wq.z)); }
      if (yy - lo > 0.2) {
        const hh = yy - lo + 0.5;
        B.add(B.box(p.w + 0.36, hh, p.d + 0.36, { seg: 1.4, chip: 0.05, seed: p.x }), ch(Mq, 0, -hh / 2 - 0.035, 0), { color: worn(H.stone, rng, 0.14), course: 0.34, moss: 0.5, ground: lo });
        for (const [x1, z1, x2, z2] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) collide(Mq, x1 * p.w / 2, z1 * p.d / 2, x2 * p.w / 2, z2 * p.d / 2, 0.18, -hh, hh - 0.25, { stand: false });
      }
    }
    if (p.kind === 'house' && !O.stand) { // no corner of its walls' feet (0.5 m under its floor) out of the ground
      const Mq = plotMatrix(p); let lo = Infinity; for (const a of [-1, 1]) for (const b of [-1, 1]) { const wq = world(Mq, a * p.w / 2, 0, b * p.d / 2); lo = Math.min(lo, G(wq.x, wq.z)); }
      if (p.y > lo + 0.05) q = { ...p, y: lo + 0.05 };
    }
    const from = B.count, R = makePlot(B, q, { plan: P, built: ctx.lappet.built, E, low, seed: O.seed, form: O.form, stair: O.stair, glaze: O.glaze });
    if (p.kind === 'carrier') dull(from, 0.3, N.milk); // (fired ware, not iron: its glaze toward the milk body it was thrown in; a blind reader took the dark glaze for rusted plate)
    if (p.kind === 'house') dull(from, O.k ?? 0.2, O.to ? new THREE.Color(O.to) : V.dirt);
    if (p.kind === 'shop') {
      // a booth's back is dark and its goods are lit by a lamp hung before them (the blind reader: the backs were "glowing panels ... like a game UI"); each a trade told by what hangs at its front
      for (let i = from; i < B.count; i++) if (B.E[i * 4 + 3] === 1) { B.E[i * 4] *= 0.12; B.E[i * 4 + 1] *= 0.12; B.E[i * 4 + 2] *= 0.12; }
      const Ms = plotMatrix(q), c0 = R.counters[0], zf = (c0 ? world(Ms.clone().invert(), c0.x, c0.y, c0.z).z - 0.2 : p.d / 2 - 0.55) - 0.13, first = p.name.endsWith('1');
      const lp = world(Ms, first ? 0.5 : -0.4, 1.945, zf + 0.1); hangLamp(B, { x: lp.x, y: lp.y, z: lp.z }, first ? 'amber' : 'ruby', 0.55); lamps.push({ x: lp.x, y: lp.y, z: lp.z });
      beam(B, Ms, [-p.w / 2 + 0.2, 1.955, zf + 0.1], [p.w / 2 - 0.2, 1.955, zf + 0.1], 0.03, wood(0.2)); // the rail they hang from, its ends in the booth's cheeks
      for (let k = 0; k < (low ? 4 : 7); k++) {
        const x = -1.05 + k * (2.1 / (low ? 3 : 6)), len = 0.25 + rng() * 0.3; if (Math.abs(x - (first ? 0.5 : -0.4)) < 0.2) continue;
        beam(B, Ms, [x, 1.95, zf + 0.1], [x, 1.95 - len, zf + 0.1], 0.008, { color: V.rope, moss: 0, ground: p.y - 3 });
        if (first) for (let m = 0; m < 3; m++) B.add(B.rock(0.045, 0, 1, 1.5, 1), ch(Ms, x + (m - 1) * 0.02, 1.93 - len - m * 0.08, zf + 0.1, 0, m * 2, 0.3), { color: worn(pick([V.madder, new THREE.Color('#8a2f1e'), V.saffron], rng), rng, 0.2), moss: 0, ground: p.y - 3, flat: true }); // dried pods and peppers on strings
        else B.add(B.cyl(0.05, 0.035, 0.09, 7, 1), ch(Ms, x, 1.93 - len - 0.03, zf + 0.1, 0, 0, (rng() - 0.5) * 0.3), { color: L.gilt.clone().multiplyScalar(0.5 + rng() * 0.3), iron: 0.5, moss: 0, ground: p.y - 3 }); // cups and ladles of old brass
      }
    }
    R.lamps.forEach((lamp, i) => { hangLamp(B, lamp, ['amber', 'ruby', 'amber', 'amber'][(R.seed + i) % 4], 0.5); lamps.push(lamp); });
    for (const c of R.counters) places.push({ name: `${p.name}: counter`, x: +c.x.toFixed(2), y: +c.y.toFixed(2), z: +c.z.toFixed(2), what: 'a bare counter; whoever keeps it stands behind' });
    for (const s of R.shelves) places.push({ name: `${p.name}: shelf`, x: +s.x.toFixed(2), y: +s.y.toFixed(2), z: +s.z.toFixed(2), what: 'a bare shelf' });
    for (const d of R.doors) places.push({ name: `${p.name}: door`, x: +d.x.toFixed(2), y: +d.y.toFixed(2), z: +d.z.toFixed(2), what: 'a doorway: someone in it, or on its step' });
    records.push(R);
  }
  registerAll(ctx, records, 'pennyworth');
  const rec = (name) => records.find((R) => R.name === name);

  // ---------------------------------------------------------------- a door over a fall (v15-W4)
  // A house stood at the ground before its door can still have the ground fall away a stride further out: hitch-4's
  // doorstep stood 0.7 m over the Hitch with nothing to climb by (tools/ways-test.mjs door row: its step a 4 m2 pocket).
  // Where the ground within 2 m out falls more than 0.3 m under the floor at the door, slabs of the old paving go down it.
  for (const R of records) {
    if (R.name === 'pennyworth-house-2') continue; // (its bank steps are below)
    for (const d of R.doors) {
      const [fx, fz] = d.face, top = ctx.controls.floorAt ? ctx.controls.floorAt(d.x + fx * 0.2, d.z + fz * 0.2, d.y + 0.3).y : d.y;
      let zd = null; for (let z = 0.3; z <= 2.0 && zd === null; z += 0.1) if (G(d.x + fx * z, d.z + fz * z) < top - 0.3) zd = z;
      if (zd === null) continue;
      const zs = Math.max(0.3, zd - 0.25), M = plotMatrix({ x: d.x, y: top, z: d.z, face: d.face }), steps = [];
      for (let i = 0, y = G(d.x + fx * (zs - 0.05), d.z + fz * (zs - 0.05)); i < 6; i++) {
        const z0 = zs + i * 0.36, g = G(d.x + fx * (z0 + 0.18), d.z + fz * (z0 + 0.18));
        if (z0 > zd && y - g < 0.14) break; // down on the ground (past the fall)
        y = Math.max(g + 0.03, y - 0.22);
        B.add(B.box(1.15 - (i % 2) * 0.1, 0.5, 0.4, { seg: 9, chip: 0.04, chipTop: true, seed: i + 60 }), ch(M, (i % 2 ? 0.04 : -0.03), y - top - 0.25, z0 + 0.18, 0, (rng() - 0.5) * 0.08, 0), stoneO(g - 0.3, 0.2));
        steps.push({ z0, y });
      }
      if (steps.length) ctx.addWalkable((x, z) => { const dx = x - d.x, dz = z - d.z, lz = dx * fx + dz * fz, lx = -dx * fz + dz * fx; if (Math.abs(lx) > 0.55 || lz < zs) return null; const st = steps[Math.floor((lz - zs) / 0.36)]; return st ? st.y : null; });
    }
  }

  // ---------------------------------------------------------------- between the two houses: steps down the bank, washing over the lane
  {
    const h1 = rec('pennyworth-house-1'), h2 = rec('pennyworth-house-2'), p1 = P.plot('pennyworth-house-1'), p2 = P.plot('pennyworth-house-2');
    if (h2 && p2) {
      // from the upper house's door down the field bank to the lane: slabs of the old paving, each a hand lower
      const d0 = h2.doors[0] || { x: p2.x + p2.face[0] * p2.d / 2, z: p2.z + p2.face[1] * p2.d / 2 }, fx = p2.face[0], fz = p2.face[1], M = plotMatrix({ x: d0.x, y: p2.y, z: d0.z, face: p2.face });
      const steps = [];
      for (let i = 0, y = p2.y - 0.02; i < 9; i++) {
        const z0 = 0.15 + i * 0.42, wx = d0.x + fx * (z0 + 0.21), wz = d0.z + fz * (z0 + 0.21), g = G(wx, wz);
        if (g < p2.y - 0.7 && y - g < 0.07) break; // down on the lane
        y = Math.max(g + 0.04, y - 0.19);
        B.add(B.box(1.25 - (i % 2) * 0.12, 0.5, 0.46, { seg: 9, chip: 0.04, chipTop: true, seed: i + 40 }), ch(M, (i % 2 ? 0.05 : -0.04), y - p2.y - 0.25, z0 + 0.21, 0, (rng() - 0.5) * 0.08, 0), stoneO(g - 0.3, 0.2));
        steps.push({ z0, y });
      }
      if (steps.length) ctx.addWalkable((x, z) => { const dx = x - d0.x, dz = z - d0.z, lz = dx * fx + dz * fz, lx = -dx * fz + dz * fx; if (Math.abs(lx) > 0.62 || lz < 0.15) return null; const s = steps[Math.floor((lz - 0.15) / 0.42)]; return s ? s.y : null; });
      places.push({ name: 'the upper house\'s steps', x: +(d0.x + fx * 1.2).toFixed(2), y: +(p2.y - 0.5).toFixed(2), z: +(d0.z + fz * 1.2).toFixed(2), what: 'someone sitting on the bank\'s steps over the lane' });
    }
    if (h1 && h2 && p1 && p2) {
      // a line from the lower house's parapet to the upper one's wall, the lane under it
      const a = [p1.x + p1.face[0] * (p1.d / 2 - 0.25), p1.y + 3.05, p1.z - 1.2], b = [p2.x + p2.face[0] * (p2.d / 2 - 0.3), Math.min(p2.y + 2.4, p1.y + 3.2), p2.z + 1.4]; // (near level: the kit's cloths hang square, and on a steep line a corner leaves the rope)
      for (const [q, pp] of [[a, p1], [b, p2]]) beam(B, mat(0, 0, 0), [q[0] - pp.face[0] * 0.4, q[1] - 0.04, q[2]], [q[0] + pp.face[0] * 0.03, q[1] + 0.02, q[2]], 0.05, wood(0.3)); // a peg driven into each wall
      washing(B, mat(0, 0, 0), a, b, rngOf(41), low ? 3 : 5);
    }
  }

  // ---------------------------------------------------------------- the Spilt Measure's broken mouth: beans in pots, a ladder to its roof
  {
    const p = P.plot('carrier-house'), R = rec('carrier-house');
    if (p && R) {
      const M = plotMatrix(p), g0 = p.y;
      // (in the plot's frame the body lies from -x toward +x and its torn mouth is near x 3.2; the neck lies beyond)
      for (const [x, z, r, hh] of [[2.6, 2.2, 0.3, 1.9], [3.5, 3.0, 0.24, 1.6], [3.0, -1.4, 0.27, 0]]) {
        pot(B, M, x, -0.03, z, r, worn(pick([V.mud, N.celadonD || V.teal, L.tile[4]], rng), rng, 0.4), 1.5, 7);
        if (hh) { beam(B, M, [x, r * 1.3, z], [x + 0.12, hh, z - 0.15], 0.035, raw()); bine(M, [x, r * 1.4, z], [x + 0.12, hh, z - 0.15], 0.1); }
        else for (let k = 0; k < 3; k++) leafy(M, x + (rng() - 0.5) * 0.2, r * 1.5 + 0.08, z + (rng() - 0.5) * 0.2, 0.17, LEAF_D);
        post(M, x, z, r + 0.05, 0, 0.8);
      }
      place('the Spilt Measure: its door', M, R.doors[0] ? 0 : 0, 0, p.d / 2 + 0.6, 'whoever lives in the sound half, in the doorway or on a stool before it');
      void g0;
    }
  }

  // ---------------------------------------------------------------- the market along the Thumbway
  // the three-cornered cloth in the pocket by the south door
  {
    const f = P.fixture('cloth-stall'), g = G(f.x, f.z), M = mat(f.x, g, f.z);
    // two poles lean on the ramp's revetment (it runs from north-west to south-east behind the stall), one stands at the lane
    const a = [-1.25, 2.9, -0.42], b = [0.55, 2.55, 1.38], c = [0.5, 2.32, -0.75];
    beam(B, M, [a[0] - 0.12, -0.2, a[2] - 0.4], [a[0], a[1] + 0.12, a[2]], 0.07, raw()); beam(B, M, [b[0] - 0.35, -0.2, b[2] - 0.3], [b[0], b[1] + 0.12, b[2]], 0.07, raw());
    beam(B, M, [c[0] + 0.1, -0.2, c[2] - 0.05], [c[0], c[1] + 0.14, c[2]], 0.075, raw());
    cloth(M, [a, b, c], 0.13, worn(V.madder, rng, 0.3));
    // under it a rush mat and a low board on two stones: bare
    B.add(B.box(1.5, 0.03, 1.0, { seg: 9 }), ch(M, -0.05, 0.03, 0.05, 0, 0.75, 0), { color: worn(V.rope, rng, 0.35), moss: 0.1, ground: g - 1 });
    for (const s of [-1, 1]) B.add(B.rock(0.16, 0, 1, 0.8, 1), ch(M, -0.05 + s * 0.38, 0.1, 0.05 - s * 0.36), stoneO(g, 0.2));
    B.add(B.box(1.25, 0.04, 0.34, { seg: 9 }), ch(M, -0.05, 0.25, 0.05, 0, 0.75, 0), wood(0.15));
    for (const q of [a, b]) post(M, q[0] - 0.1, q[2] - 0.2, 0.1); post(M, c[0], c[2], 0.1);
    collide(M, -0.5, 0.45, 0.4, -0.35, 0.3, -0.3, 0.6);
    // on the board: bolts of cloth; from the lane's pole a string of slippers by their heels; a lamp under the cloth
    [V.teal, V.saffron, V.linen].forEach((c, k) => B.add(B.cyl(0.065, 0.065, 0.42 + k * 0.05, 7, 1), ch(M, -0.05 + (k - 1) * 0.3 * Math.cos(0.75), 0.335, 0.05 - (k - 1) * 0.3 * Math.sin(0.75), 0, 0.75 + 0.1 * k, Math.PI / 2), { color: worn(c, rng, 0.3), moss: 0, ground: g - 3, flat: true }));
    for (let k = 0; k < 4; k++) { const hx = c[0] - 0.12 - k * 0.04, hy = c[1] - 0.25 - k * 0.22; beam(B, M, [c[0], hy + 0.1, c[2]], [hx, hy, c[2] + 0.05], 0.008, { color: V.rope, moss: 0, ground: g - 3 }); B.add(B.rock(0.07, 0, 1.5, 0.5, 0.7), ch(M, hx, hy - 0.02, c[2] + 0.05, 0, k, 0.5), { color: worn([V.madder, V.saffron, V.teal, V.linen][k], rng, 0.25), moss: 0, ground: g - 3, flat: true }); }
    { const lp = world(M, -0.2, 2.38, 0.1); hangLamp(B, { x: lp.x, y: lp.y, z: lp.z }, 'ruby', 0.6); lamps.push({ x: lp.x, y: lp.y, z: lp.z }); beam(B, M, [-0.2, 2.38, 0.1], [-0.2, 2.62, 0.1], 0.008, { color: V.rope, moss: 0, ground: g - 3 }); }
    place('the three-cornered cloth: its board', M, -0.05, 0.28, 0.05, 'a bare board a hand off the ground under the cloth (slippers); the seller sits on the mat behind it');
  }
  // the salt-weigher's
  {
    const f = P.fixture('salt-stall'), g = G(f.x, f.z), M = frame(f, g);
    for (const s of [-1, 1]) PARTS.heliarch.drum(B, ch(M, s * 0.78, -0.06, 0, 0, s * 0.4, s * 0.02), { r: 0.33, h: 0.86, moss: 0.4 });
    B.add(B.box(2.5, 0.07, 0.56, { seg: 9, chip: 0.012 }), ch(M, 0, 0.845, 0.02, 0, 0.015, 0.012), { color: worn(L.wood, rng, 0.3), moss: 0.06, ground: g - 2 });
    ctx.strata.place?.({ hand: 'late', from: 'heliarch', kind: 'spolia', name: 'two Heliarch drums under the salt-weigher\'s plank', x: f.x, y: g, z: f.z, mount: 'ground', r: 1.1 });
    // the balance: a post, a beam out of true, two pans on threads
    const brass = { color: L.gilt.clone().multiplyScalar(0.55), iron: 0.4, moss: 0, ground: g - 3 }, by = 0.88;
    beam(B, M, [-0.55, by, -0.05], [-0.55, by + 0.5, -0.05], 0.03, brass); beam(B, M, [-0.83, by + 0.47, -0.05], [-0.27, by + 0.53, -0.05], 0.02, brass);
    for (const [sx, yy] of [[-0.83, 0.47], [-0.27, 0.53]]) { beam(B, M, [sx, by + yy, -0.05], [sx, by + yy - 0.3, -0.05], 0.008, brass); B.add(B.cyl(0.085, 0.05, 0.025, 8, 1), ch(M, sx, by + yy - 0.31, -0.05), brass); }
    // the Twk-men's perch: a twig on two pins at the plank's end, thumb-high, and beside it a peg at thumb height with a thimble's measure under it
    const tw = { color: worn(V.rawWood, rng, 0.2), moss: 0, ground: g - 3 };
    for (const sx of [0.72, 1.02]) beam(B, M, [sx, by, 0.16], [sx, by + 0.062, 0.16], 0.012, tw); beam(B, M, [0.66, by + 0.062, 0.16], [1.08, by + 0.066, 0.16], 0.012, tw);
    beam(B, M, [1.14, by, 0.02], [1.14, by + 0.07, 0.02], 0.02, tw); beam(B, M, [1.14, by + 0.06, 0.02], [1.14, by + 0.066, 0.075], 0.008, tw);
    B.add(B.cyl(0.016, 0.012, 0.022, 6, 1), ch(M, 0.9, by + 0.011, -0.02), brass);
    // behind it: the weigher's stool, and a post with three pegs: a sack's neck on one, a scoop on one, the pedlar's bare
    B.add(B.cyl(0.2, 0.17, 0.42, 6, 1), ch(M, -0.1, 0.2, -0.85, 0, 0.4, 0), { color: worn(L.paint[2], rng, 0.5), moss: 0.05, ground: g });
    beam(B, M, [0.95, -0.2, -0.95], [0.98, 1.95, -0.93], 0.09, raw());
    for (const [k, yy] of [[-1, 1.5], [0, 1.6], [1, 1.5]]) beam(B, M, [0.97 + k * 0.03, yy, -0.93], [0.97 + k * 0.16, yy + 0.05, -0.8], 0.022, tw);
    B.add(B.rock(0.13, 0, 0.8, 1.5, 0.7), ch(M, 0.82, 1.36, -0.79), { color: worn(V.linen, rng, 0.3), moss: 0, ground: g - 3, flat: true });
    B.add(B.cyl(0.05, 0.035, 0.1, 6, 1), ch(M, 0.97, 1.5, -0.79), brass);
    collide(M, -0.95, 0.02, 0.95, 0.02, 0.3, -0.3, 1.22); post(M, 0.96, -0.94, 0.1); post(M, -0.1, -0.85, 0.22, -0.3, 0.75);
    roofed(M, g, 1.25, -1.2, 0.85, 2.55, 2.12, worn(V.teal, rng, 0.3), 0.35); // (v15-W1: 1.25 wide each side, not 1.42: its west poles stood 0.63 m from the Slip's line, inside the lane, and the walks stuck on them)
    // salt: three cones off the pan-house's moulds and a broken block, pale in any light
    const salt = { color: new THREE.Color('#d9d2c4'), moss: 0, ground: g - 3, emit: [0.05, 0.048, 0.045, 2] };
    for (const [sx, sz, sh2] of [[-0.12, 0.08, 0.24], [0.14, -0.06, 0.2], [0.36, 0.1, 0.17]]) B.add(B.cyl(0.012, sh2 * 0.42, sh2, 7, 1), ch(M, sx, by + sh2 / 2, sz, 0, sx * 9, 0), salt);
    B.add(B.box(0.2, 0.11, 0.15, { seg: 9, chip: 0.03 }), ch(M, 0.52, by + 0.055, -0.1, 0, 0.5, 0), salt);
    place('the salt-weigher\'s plank', M, 0, 0.9, 0.02, 'a bare plank on two drums: salt by the thumb; the weigher sits on the stool behind');
    place('the Twk-men\'s perch', M, 0.87, 0.95, 0.16, 'a perch a thumb high at the plank\'s west end: a rider or two, their dragonflies on the twig');
    place('the pedlar\'s peg', M, 1.13, 1.55, -0.8, 'the bare peg of three on the post: his sack hangs here when he is in');
  }
  // the block of the keep: news is sold over it
  {
    const f = P.fixture('news-block'), g = G(f.x, f.z), M = frame(f, g);
    const Mb = ch(M, 0, -0.22, 0, 0.03, 0, -0.05);
    B.add(B.box(1.95, 1.02, 1.05, { seg: 0.5, chip: 0.09, seed: 21 }), ch(Mb, 0, 0.51, 0), { color: worn(H.stone, rng, 0.1), moss: 0.45, ground: g, disp: 0.012, dispScale: 2 });
    PARTS.heliarch.roundel(B, ch(Mb, 0.3, 1.02, 0.08, -Math.PI / 2, 0, 0.5), { size: 0.62, disc: 'bronze' }); // the sign it carried, on its back now
    ctx.strata.place?.({ hand: 'late', from: 'heliarch', kind: 'spolia', name: 'a block of Carcanet Keep for the news-seller\'s counter', x: f.x, y: g - 0.22, z: f.z, mount: 'ground', r: 0.9 });
    // a cloth over its west end under a stone, a bench of a plank on two stones behind
    cloth(Mb, [[-0.92, 1.045, 0.47], [-0.3, 1.05, 0.47], [-0.3, 1.05, -0.47], [-0.92, 1.045, -0.47]], 0, worn(V.saffron, rng, 0.35), true);
    B.add(B.rock(0.11, 0, 1, 0.6, 1), ch(Mb, -0.7, 1.1, -0.3), stoneO(g, 0.25));
    for (const s of [-1, 1]) B.add(B.rock(0.2, 0, 1, 0.9, 1), ch(M, s * 0.55, 0.13, -1.1), stoneO(g, 0.2));
    B.add(B.box(1.5, 0.05, 0.3, { seg: 9 }), ch(M, 0, 0.35, -1.1, 0, 0.04, 0), wood(0.25));
    collide(M, -0.45, 0, 0.45, 0, 0.55, -0.4, 1.2); collide(M, -0.6, -1.1, 0.6, -1.1, 0.2, -0.3, 0.7);
    roofed(M, g, 1.02, -1.55, 0.8, 2.7, 2.2, worn(V.madder.clone().lerp(V.saffron, 0.5), rng, 0.3), -0.3);
    // the news: a cord between the front poles hung with knotted strings, a tag at each one's end (what is known, by the knot); a stranger reads none of it and counts them
    beam(B, M, [-1.02, 2.02, 0.8], [1.02, 2.02, 0.8], 0.012, { color: V.rope, moss: 0, ground: g - 3 });
    for (let k = 0; k < (low ? 6 : 11); k++) { const x = -0.9 + k * (1.8 / (low ? 5 : 10)), len = 0.3 + rng() * 0.55; beam(B, M, [x, 2.02, 0.8], [x + (rng() - 0.5) * 0.03, 2.02 - len, 0.8], 0.01, { color: worn(pick([V.rope, V.madder, V.saffron, V.teal], rng), rng, 0.2), moss: 0, ground: g - 3 }); B.add(B.box(0.06, 0.09, 0.012, { seg: 9 }), ch(M, x, 2.02 - len - 0.04, 0.8, 0, rng() * 0.6 - 0.3, 0), { color: worn(pick([V.linen, V.saffron, L.gilt], rng), rng, 0.25), moss: 0, ground: g - 3 }); }
    place('the keep\'s block', M, -0.6, 0.95, 0, 'a counter that is a block of the keep, a cloth over one end: news; the seller sits on the plank behind');
  }

  // ---------------------------------------------------------------- the Grudge: the garden, its well, the moles' share
  {
    const p = P.plot('pennyworth-garden'), M = plotMatrix(p), g0 = p.y, hw = p.w / 2, hd = p.d / 2;
    const heaps = (ctx.glyphs?.moles?.slots || []).map((s) => world(M.clone().invert(), s.x, 0, s.z)).filter((v) => Math.abs(v.x) < hw && Math.abs(v.z) < hd);
    const nearHeap = (x, z, r = 0.45) => heaps.some((h) => Math.hypot(h.x - x, h.z - z) < r);
    // the wall: mud, plastered once, a flat stone coping in runs; broken down at the corners; a way in from the lane and one to the kerb
    const cop = [];
    const run = (x1, z1, x2, z2) => {
      const len = Math.hypot(x2 - x1, z2 - z1), ry = Math.atan2(x2 - x1, z2 - z1), n = Math.max(1, Math.round(len / 1.5));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t, h = 0.5 + rng() * 0.16, wp = world(M, x, 0, z), g = G(wp.x, wp.z) - g0;
        B.add(B.box(0.26 + (i % 2) * 0.02, h + 0.5, len / n + 0.02, { seg: 0.8, chip: 0.05, chipTop: true, seed: x * 3 + z }), ch(M, x, g + h / 2 - 0.25, z, 0, ry, 0), { color: worn(V.mud, rng, 0.2, 0.16).lerp(L.plaster[0], 0.25 * rng()), moss: 0.4, ground: g0 + g, disp: 0.02, dispScale: 2 });
        if (rng() < 0.7) { B.add(B.box(0.36, 0.06, len / n * (0.6 + rng() * 0.3), { seg: 9, chip: 0.02 }), ch(M, x, g + h - 0.005, z, 0, ry, 0), { color: worn(H.dark, rng, 0.15), moss: 0.5, ground: g0 + g }); cop.push([x, g + h + 0.025, z, ry]); }
      }
      collide(M, x1, z1, x2, z2, 0.15, -0.4, 1.05);
    };
    run(-hw + 0.4, hd, -0.9, hd); run(0.3, hd, hw, hd);                 // the lane's side (the plot's front), a gap to come in by
    run(hw, hd - 0.3, hw, -hd + 1.3);                                   // the west side, toward the booths
    run(hw - 0.4, -hd, -hw + 0.3, -hd);                                 // the south, toward the wreck
    run(-hw, -hd + 0.3, -hw, -0.5); run(-hw, 0.9, -hw, hd - 1.7);       // the kerb's side, a gap onto the kerb
    // three beds of turned earth
    const beds = [[-0.4, 1.9, 2.9], [-0.4, 0.1, 3.3], [-0.4, -1.75, 3.3]]; // [the bed's middle x, z, its length]
    for (const [bx, bz, len] of beds) B.add(B.box(len, 0.3, 0.95, { seg: 0.6, chip: 0.06, chipTop: true, seed: bz }), ch(M, bx, -0.03, bz, 0.045 * (bz > 0 ? 1 : -1), 0, 0.02), { color: worn(SOIL, rng, 0.1, 0.2), moss: 0.15, ground: g0 - 1, disp: 0.03, dispScale: 3 });
    // beans on crossed poles down the two southern beds: pairs lashed where they cross, a ridge pole through the crotches; where a heap has come up under a pair it leans
    for (const [bx, bz, len] of beds.slice(1)) {
      const n = Math.round(len / 0.75), tops = [];
      for (let i = 0; i <= n; i++) {
        const x = bx - len / 2 + 0.25 + i * (len - 0.5) / n, shove = nearHeap(x, bz, 0.6) ? 0.3 * (i % 2 ? 1 : -1) : 0, top = [x + shove, 1.95 + (rng() - 0.5) * 0.1 - Math.abs(shove) * 0.4, bz + (rng() - 0.5) * 0.05];
        for (const s of [-1, 1]) {
          const foot = [x, 0.02, bz + s * 0.36], over = [top[0] + (top[0] - foot[0]) * 0.14, top[1] + 0.26, top[2] - s * 0.05];
          beam(B, M, foot, over, 0.032, raw());
          if (rng() < 0.85) bine(M, foot, top, 0.08 + rng() * 0.05, (i + (s > 0 ? 1 : 0)) % 2 ? LEAF_D : LEAF);
        }
        tops.push(top);
      }
      for (let i = 0; i < n; i++) beam(B, M, tops[i], tops[i + 1], 0.028, raw());
      collide(M, bx - len / 2 + 0.2, bz, bx + len / 2 - 0.2, bz, 0.25, -0.3, 2.4, { stand: false }); // (nobody walks through a row of poles)
    }
    // pot herbs in the northern bed, low
    for (let i = 0; i < (low ? 5 : 9); i++) { const x = beds[0][0] - 1.5 + i * 0.36 + rng() * 0.1, z = beds[0][1] + (rng() - 0.5) * 0.5; if (!nearHeap(x, z, 0.4)) leafy(M, x, 0.16, z, 0.13 + rng() * 0.07, i % 3 ? LEAF_D : LEAF); }
    // the gardener's quarrel: the tesserae he has picked out of the heaps, set in a row along the coping; a riddle against the wall; a spade stood in a bed; a slab he laid over one run
    const tess = cop.filter((c) => Math.abs(c[2] - hd) < 0.01).slice(0, 2);
    tess.forEach((c, j) => { for (let k = 0; k < (low ? 5 : 9); k++) B.add(B.box(0.028, 0.028, 0.028, { seg: 9 }), ch(M, c[0] - 0.36 + k * 0.085 + j * 0.02, c[1] + 0.012, c[2] + 0.04, 0, rng(), 0), { color: TESS[(k + j) % 3].clone().multiplyScalar(0.75 + rng() * 0.4), moss: 0, ground: g0 - 2, iron: (k + j) % 3 === 1 ? 0.5 : 0 }); });
    B.add(new THREE.TorusGeometry(0.26, 0.022, 4, 12), ch(M, 1.2, 0.27, hd - 0.2, 0.32, 0, 0), wood(0.3)); B.add(B.cyl(0.25, 0.25, 0.012, 12, 1), ch(M, 1.2, 0.262, hd - 0.2, Math.PI / 2 + 0.32, 0, 0), { color: worn(V.rope, rng, 0.3), moss: 0, ground: g0 - 2 });
    beam(B, M, [0.6, 0.0, -0.8], [0.68, 1.02, -0.75], 0.035, wood(0.1)); B.add(B.box(0.2, 0.3, 0.02, { seg: 9 }), ch(M, 0.59, 0.06, -0.805, 0.05, 0, 0.08), { color: L.iron, iron: 0.7, moss: 0, ground: g0 - 2 });
    PARTS.heliarch.slab(B, ch(M, -1.9, 0.1, -0.8, -Math.PI / 2 + 0.05, 0.5, 0), { w: 0.8, h: 1.1, d: 0.09 });
    // the well, in the corner nearest the booths: a Heliarch drum bored through and set over the shaft, a sweep on a forked post
    const f = P.fixture('well'), gw = G(f.x, f.z), W = mat(f.x, gw, f.z);
    PARTS.heliarch.drum(B, ch(W, 0, -0.13, 0, 0.012, 0.3, 0), { r: 0.66, h: 0.82, moss: 0.5 });
    B.add(B.cyl(0.43, 0.43, 0.02, 12, 1), ch(W, 0, 0.726, 0), { color: new THREE.Color(0.006, 0.007, 0.008), moss: 0, wet: 1, ground: gw - 2 });
    B.add(new THREE.TorusGeometry(0.45, 0.035, 5, 14), ch(W, 0, 0.725, 0, Math.PI / 2, 0, 0), { color: worn(H.dark, rng, 0.1), moss: 0.3, wet: 0.4, ground: gw });
    ctx.strata.place?.({ hand: 'late', from: 'heliarch', kind: 'spolia', name: 'a Heliarch drum, bored, for the Pennyworth\'s well-head', x: f.x, y: gw, z: f.z, mount: 'ground', r: 0.7 });
    const fork = [-0.55, 2.5, 1.5], tip = [0.06, 3.5, -0.42], butt = [-0.78, 1.25, 4.0]; // (the sweep lies along the garden's west wall, clear of the beds)
    beam(B, W, [fork[0], -0.3, fork[2]], fork, 0.13, raw()); for (const s of [-1, 1]) beam(B, W, fork, [fork[0] + s * 0.2, fork[1] + 0.36, fork[2]], 0.07, raw());
    beam(B, W, butt, tip, 0.085, raw());
    B.add(B.rock(0.27, 0, 1, 0.8, 1), ch(W, butt[0], butt[1] - 0.2, butt[2] - 0.1), stoneO(gw, 0.2)); // the counterweight, lashed on
    beam(B, W, tip, [tip[0], 1.02, tip[2] + 0.03], 0.014, { color: V.rope, moss: 0, ground: gw - 3 });
    B.add(B.cyl(0.13, 0.1, 0.24, 8, 1), ch(W, tip[0], 0.9, tip[2] + 0.03), wood(0.3));
    ctx.addCollider({ x: f.x, z: f.z, r: 0.7, y: gw - 0.3, h: 1.05, stand: false }); post(W, fork[0], fork[2], 0.12, 0, 2.6);
    place('the well', W, 0.9, 0, -0.2, 'someone drawing water, a hand on the sweep\'s rope');
    place('the Grudge: the gardener', M, 1.5, 0, -0.8, 'the gardener, by the spade stood in the middle bed, glaring at a heap');
  }

  // ---------------------------------------------------------------- the Skirts: what later hands made of the lowest riser
  {
    // (a riser fixture's frame: origin 0.3 m out from the giants' face at the foot, +z straight out from it; the
    // face leans back from 0.04 m behind the origin at the ground to 0.22 behind at the bench)
    // the Heliarchy's repair: exact, plumb, coursed; an arch in it that led somewhere; walled up since in mud
    {
      const f = P.fixture('riser-repair'), g = G(f.x, f.z), M = frame(f, g), top = P.LEVEL.bench.y - g, w = 3.1;
      B.add(B.box(w, top + 0.6, 0.62, { seg: 0.8, chip: 0.03, seed: 31 }), ch(M, 0, (top - 0.6) / 2 - 0.02, 0.0), { color: worn(H.stone, rng, 0.08), course: 0.32, moss: 0.4, ground: g });
      B.add(B.box(w + 0.16, 0.22, 0.72, { seg: 0.8, chip: 0.03 }), ch(M, 0, top - 0.42, 0.01), { color: worn(H.dark, rng, 0.08), moss: 0.45, ground: g });      // its cornice
      B.add(B.box(w + 0.1, 0.3, 0.7, { seg: 0.8, chip: 0.04 }), ch(M, 0, 0.1, 0.01), { color: worn(H.dark, rng, 0.1), moss: 0.5, ground: g });                    // its plinth
      facade(B, ch(M, 0, 0.25, 0.33), { w: 1.9, h: 2.75, d: 0.1, sink: 0, openings: [{ kind: 'round', x: 0, y: 0, w: 1.3, sp: 1.55 }], color: worn(H.dark, rng, 0.06), course: 0.32, moss: 0.35, ground: g, n: low ? 6 : 10 });
      B.add(B.box(1.36, 2.26, 0.05, { seg: 0.7, chip: 0.02 }), ch(M, 0, 0.25 + 1.13, 0.325), { color: worn(V.mud, rng, 0.25), course: 0.11, moss: 0.2, ground: g });   // mud brick in the arch
      PARTS.heliarch.roundel(B, ch(M, 0, 2.92, 0.445), { size: 0.5 });
      ctx.strata.place?.({ hand: 'heliarch', kind: 'sign', name: 'the roundel over the walled arch in the Skirts', x: f.x + f.face[0] * 0.4, y: g + 3.3, z: f.z + f.face[1] * 0.4, face: f.face, mount: 'wall', size: 0.5 });
      // a lamp niche knocked into the mud, lit
      B.add(B.box(0.3, 0.34, 0.03, { seg: 9 }), ch(M, 0.1, 1.45, 0.352), { color: new THREE.Color('#2a1a0c'), moss: 0, ground: g - 2, emit: [V.lit[0] * 0.55, V.lit[1] * 0.55, V.lit[2] * 0.55, 1] });
      B.add(B.box(0.4, 0.05, 0.1, { seg: 9 }), ch(M, 0.1, 1.26, 0.38), stoneO(g - 2, 0.1));
      collide(M, -w / 2, 0.1, w / 2, 0.1, 0.36, -0.5, top + 0.4, { stand: false });
    }
    // the Late buttress: rubble under plaster, raked, two offsets, a flat stone on its head
    {
      const f = P.fixture('riser-buttress'), g = G(f.x, f.z), M = frame(f, g), top = P.LEVEL.bench.y - g - 0.5;
      const sh = new THREE.Shape(); sh.moveTo(-0.5, -0.6); sh.lineTo(1.35, -0.6); sh.lineTo(1.2, 0.9); sh.lineTo(0.95, 1.0); sh.lineTo(0.62, 2.1); sh.lineTo(0.42, 2.2); sh.lineTo(0.18, top); sh.lineTo(-0.5, top); sh.lineTo(-0.5, -0.6);
      const col = worn(L.plaster[1], rng, 0.4, 0.1);
      B.add(B.extrude(sh, 1.05, 1), ch(M, 0, 0, 0, 0, -Math.PI / 2, 0), { color: col, moss: 0.25, ground: g, emit: limeGlow(col, 0.05) }); // (no disp: an extrusion's faces are not welded, and it opens along its arrises)
      B.add(B.box(1.2, 0.09, 0.85, { seg: 9, chip: 0.03 }), ch(M, 0, top + 0.03, -0.12), stoneO(g + top, 0.1));
      collide(M, 0, 0, 0, 0.9, 0.55, -0.5, top, { stand: false });
    }
    // the lean-tos: a plank roof off pegs in the riser, down to two posts; a counter across the front, bare shelves on the giants' face
    for (const [name, w, d, hb, hf, what] of [['leanto-oil', 2.7, 2.0, 2.85, 2.34, 'lamp oil by the gill'], ['leanto-slippers', 2.3, 1.7, 2.62, 2.28, 'whatever comes']]) {
      const f = P.fixture(name), g = G(f.x, f.z), M = frame(f, g), oil = name === 'leanto-oil';
      for (const s of [-1, 1]) {
        beam(B, M, [s * (w / 2 - 0.1), -0.3, d], [s * (w / 2 - 0.1) + s * 0.03, hf - 0.04, d - 0.02], 0.1, raw()); post(M, s * (w / 2 - 0.1), d, 0.1);
        beam(B, M, [s * (w / 2 - 0.1), hb - 0.03, -0.3], [s * (w / 2 - 0.1), hf - 0.01, d + 0.25], 0.07, wood(0.3), 0.1); // the rafters, their heads in the face
      }
      beam(B, M, [-w / 2 - 0.1, hf + 0.03, d], [w / 2 + 0.1, hf + 0.03, d], 0.07, wood(0.3));
      const nb = Math.round(w / 0.33), sl = Math.atan2(hb - hf, d + 0.25);
      for (let i = 0; i < nb; i++) { if (!oil && i === 2) continue; const x = -w / 2 - 0.06 + (i + 0.5) * (w + 0.12) / nb; B.add(B.box((w + 0.12) / nb - 0.012, 0.03, d + 0.62 + (i % 3) * 0.07, { seg: 9 }), ch(M, x, (hb + hf) / 2 + 0.085 + (i % 2) * 0.004, (d - 0.02) / 2, sl, 0, 0), { color: worn(i % 4 === 1 ? V.rawWood : L.wood, rng, 0.3, 0.2), moss: 0.25, ground: g - 4 }); }
      // one cheek of plastered mud on the windward side
      const side = oil ? -1 : 1, colp = worn(L.plaster[oil ? 2 : 0], rng, 0.42, 0.1);
      B.add(B.box(0.24, hf + 0.35, d - 0.25, { seg: 0.9, chip: 0.05, chipTop: true, seed: 5 + w }), ch(M, side * (w / 2 - 0.02), (hf - 0.35) / 2 - 0.12, (d - 0.25) / 2 - 0.1), { color: colp, moss: 0.2, ground: g, emit: limeGlow(colp, 0.05) });
      collide(M, side * (w / 2 - 0.02), -0.1, side * (w / 2 - 0.02), d - 0.3, 0.14, -0.4, hf + 0.4, { stand: false });
      // the counter: a plank on an upturned capital and a drum (the oil-seller's), on two trestle legs (the other)
      if (oil) { PARTS.heliarch.capital(B, ch(M, -0.7, 0.62, d - 0.25, Math.PI, 0.3, 0), { r: 0.26 }); B.add(B.box(0.5, 0.22, 0.46, { seg: 9, chip: 0.04 }), ch(M, -0.7, 0.71, d - 0.25, 0, 0.2, 0), stoneO(g, 0.15)); PARTS.heliarch.drum(B, ch(M, 0.75, -0.08, d - 0.25, 0, 0.2, 0), { r: 0.27, h: 0.9, moss: 0.4 }); }
      else for (const s of [-1, 1]) for (const q of [-1, 1]) beam(B, M, [s * 0.75 + q * 0.2, -0.1, d - 0.25 + q * 0.14], [s * 0.75, 0.82, d - 0.25], 0.05, raw());
      B.add(B.box(w - 0.5, 0.06, 0.5, { seg: 9, chip: 0.012 }), ch(M, 0.02, 0.85, d - 0.25, 0, 0.01, 0), { color: worn(L.wood, rng, 0.25), moss: 0.06, ground: g - 2 });
      collide(M, -w / 2 + 0.35, d - 0.25, w / 2 - 0.35, d - 0.25, 0.3, -0.4, 1.3);
      // shelves on pegs in the face, bare; under the roof's beam a lamp (the oil-seller's is lit)
      collide(M, -w / 2 + 0.5, 0.08, w / 2 - 0.5, 0.08, 0.16, 1.1, 0.75, { stand: false }); // (the shelves, at a head's height)
      for (const yy of oil ? [1.2, 1.65] : [1.35]) { for (const s of [-1, 1]) beam(B, M, [s * (w / 2 - 0.6), yy - 0.03, -0.3], [s * (w / 2 - 0.6), yy - 0.03, 0.22], 0.04, wood(0.2)); B.add(B.box(w - 0.9, 0.035, 0.26, { seg: 9 }), ch(M, 0, yy + 0.01, 0.08), wood(0.15)); place(`${name}: shelf`, M, 0, yy + 0.03, 0.08, 'a bare shelf on pegs in the giants\' face'); }
      if (oil) {
        const lp = world(M, 0.35, hf - 0.005, d); hangLamp(B, { x: lp.x, y: lp.y, z: lp.z }, 'amber', 0.75); lamps.push({ x: lp.x, y: lp.y, z: lp.z });
        pot(B, M, -w / 2 + 0.55, -0.03, 0.5, 0.34, worn(V.mud, rng, 0.3), 2.0, low ? 7 : 10); post(M, -w / 2 + 0.55, 0.5, 0.36, 0, 0.7);
      }
      place(`${name}: counter`, M, 0, 0.9, d - 0.25, `a bare counter under a lean-to against the riser (${what}); its keeper stands behind, under the roof`);
    }
  }

  // ---------------------------------------------------------------- the Leave: where the village ends and the road begins
  {
    for (const [name, n, lamp] of [['leave-east', 4, true], ['leave-west', 2, false], ['west-post-1', 3, true], ['west-post-2', 3, true]]) { // (the last two: the west way round the house, the path P9)
      const f = P.fixture(name), g = G(f.x, f.z), M = frame(f, g);
      let y = -0.25, lx = 0, lz = 0;
      for (let i = 0; i < n; i++) { const h = 0.78 + rng() * 0.1; PARTS.heliarch.drum(B, ch(M, lx, y, lz, 0, rng() * 3, 0), { r: 0.36 - i * 0.012, h, moss: 0.5 - i * 0.08 }); y += h - 0.005; lx += (rng() - 0.5) * 0.05; lz += (rng() - 0.5) * 0.05; }
      ctx.addCollider({ x: f.x, z: f.z, r: 0.42, y: g - 0.3, h: y + 0.3, stand: false });
      if (lamp) {
        PARTS.heliarch.capital(B, ch(M, lx, y, lz, 0, 0.5, 0), { r: 0.33 });
        // an arm lashed to it with rope, out over the kerb (the kerb lies to this post's -x), and the last lamp
        const ya = y - 0.42, tip = [-1.15, ya + 0.22, 0.02];
        beam(B, M, [0.42, ya - 0.08, 0.02], tip, 0.06, wood(0.25)); beam(B, M, [-0.2, ya - 0.75, 0.0], [-0.72, ya + 0.1, 0.02], 0.045, wood(0.25));
        for (const yy of [ya - 0.02, ya + 0.1]) B.add(new THREE.TorusGeometry(0.37, 0.022, 4, 10), ch(M, lx, yy, lz, Math.PI / 2, 0, 0), { color: V.rope, moss: 0, ground: g - 3 });
        const lp = world(M, tip[0] + 0.04, tip[1] - 0.025, tip[2]); hangLamp(B, { x: lp.x, y: lp.y, z: lp.z }, 'amber', 1); lamps.push({ x: lp.x, y: lp.y, z: lp.z });
      } else {
        // its upper drums lie where they fell, and the capital with them
        PARTS.heliarch.drum(B, ch(M, -0.9, 0.3, 0.5, Math.PI / 2 - 0.06, 0.7, 0), { r: 0.35, h: 0.8, moss: 0.6 }); PARTS.heliarch.capital(B, ch(M, -1.75, 0.34, -0.2, 0, 0.2, Math.PI / 2 + 0.2), { r: 0.33 }); // (away from the kerb, which lies to this post's +x)
        const a = world(M, -0.9, 0, 0.5); ctx.addCollider({ x: a.x, z: a.z, r: 0.5, y: g - 0.3, h: 0.95 }); const b = world(M, -1.75, 0, -0.2); ctx.addCollider({ x: b.x, z: b.z, r: 0.45, y: g - 0.3, h: 0.9 });
      }
      ctx.strata.place?.({ hand: 'late', from: 'heliarch', kind: 'spolia', name: `Heliarch drums stacked for a lamp post (${name})`, x: f.x, y: g - 0.25, z: f.z, mount: 'ground', r: 0.36 });
    }
    const a = P.fixture('leave-east'); place('the Leave', mat(a.x, G(a.x, a.z), a.z), -1.2, 0, 1.0, 'someone leaving, or looking back, under the last lamp');
  }

  // ---------------------------------------------------------------- the ground: flags at the south door and down the lane's worn line
  {
    const D = P.HOUSE.door;
    for (let j = 0; j < 3; j++) for (let x = D.x - 1.5 + (j % 2) * 0.3; x < D.x + 1.6;) { const w = 0.6 + rng() * 0.5; if (rng() < 0.85 && P.radiusOf(x + w / 2, D.z + 0.95 + j * 0.62) > P.HAHA + 2.75) flag(x + w / 2, D.z + 0.95 + j * 0.62, w - 0.03, 0.59); x += w; }
    // the south door says come in: its leaf stood open against the wall, a sign on a bracket over it
    { const g = G(D.x + 0.7, D.z + 0.7), Ml = mat(D.x + 0.68, g - 0.02, D.z + 0.66, 0, Math.PI / 2 - 0.12, 0);
      leaf(B, Ml, 1.16, 2.05, worn(L.paint[2], rng, 0.3), rng, { plain: low }); ctx.addCollider({ x1: D.x + 0.68, z1: D.z + 0.1, x2: D.x + 0.75, z2: D.z + 1.2, r: 0.1, y: g - 0.3, h: 2.2, stand: false });
      if (!low) hangSign(B, mat(D.x - 0.95, g + 2.75, D.z + 0.02), rng, { size: 0.45, reach: 0.7 }); }
    // the village's edge frays past the Leave: a last length of wall broken down, a midden of sherds against it, flags farther and farther apart down the kerb
    { const a = P.fixture('leave-west'), kx = 0.5, kz = 0.86, wx = a.x - 2.6, wz = a.z + 2.4, gw = G(wx, wz), Mw = mat(wx, gw, wz, 0, Math.atan2(kx, kz), 0);
      [0.95, 0.7, 0.42, 0.2].forEach((h, k) => B.add(B.box(0.3 + (k % 2) * 0.02, h + 0.4, 1.0, { seg: 0.8, chip: 0.06, chipTop: true, seed: k + 3 }), ch(Mw, 0, h / 2 - 0.2, k * 0.98), { color: worn(V.mud, rng, 0.2, 0.16), moss: 0.5, ground: gw, disp: 0.02, dispScale: 2 }));
      collide(Mw, 0, -0.4, 0, 2.5, 0.2, -0.3, 0.9);
      for (let k = 0; k < (low ? 5 : 10); k++) B.add(B.rock(0.12 + rng() * 0.16, 0, 1, 0.45, 1), ch(Mw, 0.45 + rng() * 0.9, -0.06 + rng() * 0.06, 0.2 + rng() * 1.6, rng(), rng() * 3, rng()), { color: worn(pick([V.mud, L.tile[0], N.milk, V.dirt], rng), rng, 0.3), moss: 0.3, ground: gw });
      for (let k = 0; k < 6; k++) { const t = 3 + k * (1.3 + k * 0.5); flag(a.x + 1.4 + kx * t + (rng() - 0.5) * 0.8, a.z - 0.8 + kz * t + (rng() - 0.5) * 0.8, 0.6 + rng() * 0.3, 0.7, rng()); } }
    // the market's ground flagged where feet go: before the weigher's and the news-seller's, close-set, a flag gone here and there
    for (let z = -29.5; z < -27.25; z += 0.74) for (let x = 103.2 + ((z * 10) & 1) * 0.3; x < 110.6;) { const w = 0.62 + rng() * 0.4; if (rng() < 0.84 && !P.FIXTURES.some((f) => Math.hypot(f.x - x - w / 2, f.z - z) < f.r + 0.25)) flag(x + w / 2, z, w - 0.04, 0.7, (rng() - 0.5) * 0.06); x += w; }
    for (const lane of ['wall-lane', 'ramp-cut'].map((n) => P.LANES.find((l) => l.name === n))) for (let i = 0; i < lane.pts.length - 1; i++) {
      const a = lane.pts[i], b = lane.pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]), ry = Math.atan2(b[0] - a[0], b[1] - a[1]);
      for (let s = i || lane.name !== 'wall-lane' ? 0.4 : 2.2; s < len; s += 0.86) { if (rng() < (i === 2 ? 0.6 : 0.3)) continue; const off = (rng() - 0.5) * (lane.width - 1.1); flag(a[0] + (b[0] - a[0]) * s / len + Math.cos(ry) * off, a[1] + (b[1] - a[1]) * s / len - Math.sin(ry) * off, 0.55 + rng() * 0.3, 0.7 + rng() * 0.2, ry + (rng() - 0.5) * 0.2); }
    }
  }

  // ---------------------------------------------------------------- the meshes
  const meshes = [];
  const mesh = ctx.strata.mesh(B, 'late', 'pennyworth'); if (low) mesh.castShadow = false;
  ctx.scene.add(mesh); meshes.push(mesh);
  if (E.count > 0) { const m = ctx.strata.mesh(E, 'elder', 'pennyworth-elder'); if (low) m.castShadow = false; ctx.scene.add(m); meshes.push(m); }
  ctx.lappet.farHidden?.push(...meshes); // on low, not drawn from more than 150 m (bones.js: the heights' cost from above)
  const tris = B.triangles + E.triangles;
  ctx.pennyworth = { records, places, lamps, meshes, stats: () => ({ draws: meshes.length, triangles: tris, lights: 0, lamps: lamps.length, perPlot: records.map((R) => ({ name: R.name, form: R.form, tris: R.tris + (R.etris || 0) })) }) };
  ctx.log?.(`pennyworth: ${tris} triangles in ${meshes.length} draws, ${records.length} plots, ${lamps.length} lamps, ${places.length} places left for people and goods`);
}
