// The Strake (v15-V1): one finished row of five buildings on the Lees' bench, five ages shoulder to shoulder, the
// village's argument in small and the proof of the makers in src/v15/houses/: an Elder slab-house, a Late house with
// its roof yard, a shop before a Heliarch undercroft, a house in a Noonwright carrier stood on its tail, the new
// house, half built. Before them a strip of flags, and down it the street's drain: lengths of a Noonwright line
// split in half, celadon, mended in mud brick where one was lost, a slab over it at every door.
//
// Where it stands is the plan's (src/v15/plan.js STRAKE and its five strake-* plots, read through ctx.lappet.plan,
// which src/v15/bones.js sets: the `lappet` module builds before this one), each plot built by makePlot at the
// plan's level; nothing here names a coordinate. On a tree without the Lappet's bones (ctx.lappet absent or off)
// the row stands instead at ROW on the bench as the terrain has it, on plots of its own (ROW_PLOTS): the makers'
// proof needs no village.
//
// Draws: one mesh in the stone shader (everything but the Elder blocks), one in the Elder material. A point light
// for every light a record asks for (five or six). ctx.village = { row: { frame, plots, records, route }, stats() };
// route: the flags walked end to end (tools/geometry/places.mjs 'strake', tools/route-frames.mjs).
// ?v15=0 leaves it out; ?v15=kit also lays every maker out for a contact sheet (src/v15/sheet.js).
import * as THREE from 'three';
import { mat } from '../structures/geo.js';
import { make, makePlot, registerAll, faceOf } from './houses/index.js';
import { L, H, V, N, PARTS, rngOf, ch, worn, quad, hangLamp, beam } from './houses/kit.js';

// Without the plan: the row's frame on the bench as the terrain has it (the flat is 8 m wide here, bearing 15): the
// middle of the line its fronts stand on, and the bearing they face; the level comes from the ground.
export const ROW = { x: 59.6, z: -38.8, bearing: 15 };
// With the plan: what each of its plots is given beyond what the plan says (the seed is the building)
export const STRAKE_OPTS = {
  'strake-elder': { seed: 2, form: 'overhang' }, 'strake-late': { seed: 4 }, 'strake-shop': { seed: 3 },
  'strake-carrier': { seed: 6, form: 'standing', profile: 'long', glaze: 0 }, 'strake-new': { seed: 1, stage: 1 },
};
const LIFT = 0.04; // the flags stand this far above the bench's turf, and the row with them
// along the street from its east end (the left of someone facing the fronts): kind, the plot's width and depth, how
// far the plot comes out over the fronts' line (the masons' scaffold stands in the street), the maker's options
export const ROW_PLOTS = [
  { kind: 'late', w: 6.6, d: 4.8, o: { seed: 4, form: 'yard', stair: 'front', h: 2.85 } }, // (h: thirteen risers, so the front stair's foot clears the door on a 6.6 m plot)
  { kind: 'undercroft', w: 7.4, d: 4.8, o: { seed: 3 } },
  { kind: 'carrier', w: 7.6, d: 6.4, over: 0.9, o: { seed: 6, form: 'standing', profile: 'long', glaze: 0 } },
  { kind: 'elder', w: 8.6, d: 7.2, over: 0.3, o: { seed: 2, form: 'lean', back: -1.3 } },
  { kind: 'new', w: 7.6, d: 6.4, over: 1.15, o: { seed: 1, stage: 1 } },
];
const BACK = -4.8, PAVE0 = -1.6, DRAIN = 1.45, EDGE = 2.6; // across the street from the fronts' line: where the flat begins, where the flags start, the drain's axis, the kerb

export async function build(ctx) {
  const url = new URL(location.href), mode = url.searchParams.get('v15');
  if (mode === '0' || !ctx.strata?.on) { ctx.village = { off: true }; return; }
  const low = ctx.quality === 'low', T = ctx.terrain, rng = rngOf(1501, 9);
  const plan = ctx.lappet && ctx.lappet.on !== false ? ctx.lappet.plan : null, S = plan && plan.STRAKE, viaPlan = !!(S && S.slots && S.slots.every((n) => plan.plot(n)));
  const face = viaPlan ? [S.face[0], S.face[1]] : faceOf(ROW.bearing), yaw = Math.atan2(face[0], face[1]), cy = Math.cos(yaw), sy = Math.sin(yaw);
  const slots = viaPlan ? S.slots.map((n) => plan.plot(n)) : null, len = viaPlan ? slots.reduce((q, p) => q + p.w, 0) : ROW_PLOTS.reduce((q, p) => q + p.w, 0);
  // the frame: the middle of the fronts' line (with the plan: the mean of the plots' front middles)
  const F0 = viaPlan ? { x: slots.reduce((q, p) => q + p.x + face[0] * p.d / 2, 0) / slots.length, z: slots.reduce((q, p) => q + p.z + face[1] * p.d / 2, 0) / slots.length } : ROW;
  const wx = (x, z) => F0.x + x * cy + z * sy, wz = (x, z) => F0.z - x * sy + z * cy;
  let Y, lowEdge;
  if (viaPlan) { Y = S.y + LIFT; lowEdge = S.y; }
  else { // the level: clear of the ground under every room and the whole strip
    Y = -Infinity; lowEdge = Infinity;
    for (let x = -len / 2; x <= len / 2; x += 1.5) { for (let z = BACK; z <= EDGE; z += 1.1) Y = Math.max(Y, T.heightAt(wx(x, z), wz(x, z))); if (Math.abs(x) < len / 4) lowEdge = Math.min(lowEdge, T.heightAt(wx(x, EDGE + 0.5), wz(x, EDGE + 0.5))); }
    Y += 0.06;
  }
  const M0 = mat(F0.x, Y, F0.z, 0, yaw, 0);
  const B = ctx.strata.builder(), E = ctx.strata.builder();
  const records = [], plots = [], kinds = [];
  const done = (R, plot) => {
    for (const l of R.lights) { const pl = new THREE.PointLight(new THREE.Color(l.color), l.intensity, l.distance, 2); pl.position.set(l.x, l.y, l.z); pl.name = `village-row-${R.kind}`; ctx.scene.add(pl); }
    R.lamps.forEach((lamp, i) => hangLamp(B, lamp, ['amber', 'ruby', 'emerald', 'sapphire'][(R.seed + i) % 4], 0.42)); // (dim: at a door they are met at arm's length)
    records.push(R); plots.push(plot); kinds.push(R.kind);
  };
  if (viaPlan) for (const p of slots) { const plot = { ...p, y: p.y + LIFT }; done(makePlot(B, plot, { plan, built: ctx.lappet.built, E, low, ...(STRAKE_OPTS[p.name] || { seed: 1 }) }), plot); }
  else {
    let x = -len / 2;
    for (const p of ROW_PLOTS) {
      const lz = (p.over || 0) - p.d / 2, plot = { x: wx(x + p.w / 2, lz), z: wz(x + p.w / 2, lz), y: Y, face, w: p.w, d: p.d, kind: p.kind, lx: x + p.w / 2, lz };
      done(make(p.kind, B, plot, { ...p.o, E, low }), plot);
      x += p.w;
    }
  }
  registerAll(ctx, records, 'village-row');
  // ---------------------------------------------------------------- the ground between them
  const g0 = Y, x0 = -len / 2 - 0.4, x1 = len / 2 + 0.4, drop = Y - lowEdge;
  const body = (za, zb, top, hh, col, course) => B.add(B.box(x1 - x0, hh, zb - za, { seg: 3, chip: 0.03 }), ch(M0, (x0 + x1) / 2, top - hh / 2, (za + zb) / 2), { color: col, course, moss: 0.4, ground: Y - drop });
  body(PAVE0, DRAIN - 0.31, -0.03, 1.5, worn(V.dirt, rng, 0.1), 0);        // under the flags (which oversail the drain a finger)
  body(DRAIN + 0.31, EDGE, -0.03, 1.5, worn(H.dark, rng, 0.2), 0.3);        // the kerb: coursed, old
  body(DRAIN - 0.33, DRAIN + 0.33, -0.31, 1.2, V.soot.clone().lerp(V.dirt, 0.4), 0); // the drain's bed
  // flags, three rows before the doors and one beyond the drain: no two the same size, a few lost, some a hexagon
  const flag = (xa, xb, za, zb) => {
    const r = rng();
    if (r < 0.05) return; // lost: the packing shows
    if (r < 0.11 && xb - xa > 0.8) { const hr = Math.min(0.46, (xb - xa) / 2 - 0.02, (zb - za) / 2 - 0.02); B.add(B.cyl(hr, hr, 0.16, 6, 1), ch(M0, (xa + xb) / 2, -0.07 + rng() * 0.012, (za + zb) / 2, 0, rng(), 0), { color: worn(H.stone, rng, 0.1), course: -0.34, moss: 0.4, ground: g0 - 0.3 }); return; }
    B.add(B.box(xb - xa - 0.03, 0.16, zb - za - 0.03, { seg: 9, chip: 0.025, chipTop: true, seed: xa * 9 + za }), ch(M0, (xa + xb) / 2, -0.08 + (rng() - 0.5) * 0.02, (za + zb) / 2, (rng() - 0.5) * 0.012, 0, (rng() - 0.5) * 0.012), { color: worn(V.flag, rng, 0.15, 0.22), moss: 0.45, wet: 0.08, ground: g0 - 0.3 });
  };
  const rowsZ = [PAVE0, -0.65, 0.3, DRAIN - 0.27];
  for (let r = 0; r < 4; r++) {
    const za = r < 3 ? rowsZ[r] : DRAIN + 0.27, zb = r < 3 ? rowsZ[r + 1] : EDGE;
    for (let xx = x0 - rng() * 0.5; xx < x1;) { const w = 0.75 + rng() * 0.75, xa = Math.max(x0, xx), xb = Math.min(x1, xx + w); if (xb - xa > 0.25) flag(xa, xb, za, zb); xx += w; }
  }
  // the drain: a Noonwright line split along its length, the glaze worn off its lip; one length gone, and mud brick
  {
    const r = 0.25, n = low ? 5 : 8, lens = [], gl = [N.celadonD, N.celadon, N.celadonT, N.celadonD, N.oxbloodD, N.celadon, N.celadonD];
    for (let xx = x0; xx < x1 - 0.5;) { const l = Math.min(x1 - xx, 4.6 + rng() * 2.2); lens.push([xx, xx + l]); xx += l; }
    lens.forEach(([xa, xb], k) => {
      if (k === 2) { // the mend
        for (const s of [-1, 1]) B.add(B.box(xb - xa, 0.3, 0.1, { seg: 0.8, chip: 0.02 }), ch(M0, (xa + xb) / 2, -0.15, DRAIN + s * 0.22), { color: worn(V.mud, rng, 0.2), course: 0.1, moss: 0.3, ground: g0 - 0.3 });
        return;
      }
      const col = worn(gl[k % gl.length], rng, 0.12), o = { color: col, moss: 0.15, wet: 0.55, ground: g0 - 2 }, milk = { color: worn(N.milk, rng, 0.15), moss: 0.2, wet: 0.3, ground: g0 - 2 };
      for (let i = 0; i < n; i++) {
        const a0 = Math.PI + (i / n) * Math.PI, a1 = Math.PI + ((i + 1) / n) * Math.PI, p = (a, xq) => [xq, Math.sin(a) * r + 0.012, DRAIN + Math.cos(a) * r];
        quad(B, M0, p(a0, xa + 0.02), p(a1, xa + 0.02), p(a1, xb - 0.02), p(a0, xb - 0.02), i === 0 || i === n - 1 ? milk : o);
      }
      // its lip either side, and the collar it was joined by
      for (const s of [-1, 1]) B.add(B.box(xb - xa - 0.04, 0.05, 0.06, { seg: 9 }), ch(M0, (xa + xb) / 2, -0.012, DRAIN + s * (r + 0.028)), milk);
      B.add(new THREE.TorusGeometry(r - 0.02, 0.035, 5, n, Math.PI).rotateZ(Math.PI).rotateY(Math.PI / 2), ch(M0, xa + 0.12, 0.012, DRAIN), { color: worn(N.oxblood, rng, 0.1), moss: 0.1, wet: 0.5, ground: g0 - 2 });
    });
  }
  // a slab over the drain at every door: stone, a plank, a leaf of somebody's bronze-bound door
  records.forEach((R, i) => {
    const d0 = R.doors.find((q) => q.enter) || R.doors[0]; if (!d0) return;
    const lx = (d0.x - F0.x) * cy - (d0.z - F0.z) * sy, kind = kinds[i];
    if (kind === 'undercroft') PARTS.heliarch.slab(B, ch(M0, lx, 0.035, DRAIN + 0.55, -Math.PI / 2, 0, 0), { w: 1.0, h: 1.1, d: 0.1 });
    else if (kind === 'new') for (const s of [-1, 0, 1]) B.add(B.box(0.28, 0.05, 1.0, { seg: 9 }), ch(M0, lx + s * 0.3, 0.03, DRAIN, 0, (rng() - 0.5) * 0.06, 0), { color: V.rawWood, moss: 0.03, ground: g0 - 1 });
    else B.add(B.box(0.95 + rng() * 0.3, 0.09, 0.95, { seg: 9, chip: 0.03 }), ch(M0, lx, 0.012, DRAIN, 0, (rng() - 0.5) * 0.1, 0), { color: worn(kind === 'elder' ? V.flag : H.stone, rng, 0.1), moss: 0.4, ground: g0 - 1 });
  });
  // a step down to the bench where the kerb stands a little high (where it stands on the ha-ha's brink it is a wall)
  const step = drop > 0.34 && drop < 0.9;
  if (step) body(EDGE, EDGE + 0.55, -drop / 2, 1.0, worn(H.stone, rng, 0.15), 0.3);
  // the strip walked: the flags' level from under the fronts to the kerb, the step beyond it
  const inRow = (px, pz) => { const dx = px - F0.x, dz = pz - F0.z, lx = dx * cy - dz * sy, lz = dx * sy + dz * cy; return lx < x0 || lx > x1 || lz < PAVE0 ? null : lz <= EDGE ? Y : step && lz <= EDGE + 0.55 ? Y - drop / 2 : null; };
  ctx.addWalkable(inRow);

  const mesh = ctx.strata.mesh(B, 'late', 'village-row');
  const blocks = ctx.strata.mesh(E, 'elder', 'village-row-elder');
  ctx.scene.add(mesh, blocks);
  const tris = B.triangles + E.triangles;
  const route = [-len / 2 + 1, -len / 4, 0, len / 4, len / 2 - 1].map((x, i) => [wx(x, i % 2 ? 0.7 : 2.0), wz(x, i % 2 ? 0.7 : 2.0), Y]);
  ctx.village = { row: { frame: { x: F0.x, z: F0.z, face, y: Y, len, back: BACK, edge: EDGE, viaPlan }, plots, records, route }, meshes: [mesh, blocks], stats: () => ({ draws: 2, triangles: tris, lights: records.reduce((s, R) => s + R.lights.length, 0), perHouse: records.map((R) => ({ kind: R.kind, tris: R.tris + (R.etris || 0) })) }) };
  ctx.log?.(`village row: ${tris} triangles, level ${Y.toFixed(2)}, kerb ${drop.toFixed(2)} m`);
  if (mode === 'kit') (await import('./sheet.js')).buildSheet(ctx);
}
