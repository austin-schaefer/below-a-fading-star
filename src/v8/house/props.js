// v8-05 the Pomegranate House's furniture, in the Late hand (ctx.strata's parts and material, one mesh): the painted
// mast in the dry fountain that the strings of lamps hang from, the painted poles that carry them out along P9 and
// round to kerb K1, the strings themselves, benches by the way in, the patrons' board and counters and cups, the
// table over the sleeper (a Heliarch bronze door on two trestles: spolia), and what has been spilt outside the gate.
// The trampled bare ground before the gate is its own mesh (vertex colour with alpha, draped on the drawn ground).
import * as THREE from 'three';
import { mat } from '../../structures/geo.js';
import { stringAt } from './lamps.js';

const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _one = new THREE.Vector3(1, 1, 1);
// a rod from a to b ([x, y, z]) of radius r into the Builder
export function rod(B, a, b, r, o, sides = 4) {
  _a.set(a[0], a[1], a[2]); _b.set(b[0], b[1], b[2]);
  const L = _a.distanceTo(_b); if (L < 1e-4) return;
  _q.setFromUnitVectors(UP, _b.clone().sub(_a).normalize());
  _m.compose(_a.clone().add(_b).multiplyScalar(0.5), _q, _one);
  B.add(B.cyl(r, r, L, sides, 1), _m.clone(), o);
}

export function buildProps(ctx, plan, G, rng) {
  const S = ctx.strata, L = S.colors.late, Hc = S.colors.heliarch, P = S.parts, B = S.builder();
  const low = ctx.quality === 'low';
  const paint = [L.paint[1], L.paint[2], L.paint[0], L.plaster[3]];
  // ---- the mast: painted in bands, a finial on top
  {
    const m = plan.mast, n = Math.round((m.top - m.base) / 0.45);
    for (let i = 0; i < n; i++) {
      const y0 = m.base + i * (m.top - m.base) / n, h = (m.top - m.base) / n;
      B.add(B.cyl(0.075 - i * 0.002, 0.08 - i * 0.002, h + 0.01, 8, 1), mat(m.x, y0 + h / 2, m.z, 0, i * 0.4, 0), { color: paint[i % 4], moss: 0, ground: m.g });
    }
    P.late.finial(B, mat(m.x, m.top, m.z, 0, Math.PI, 0), { h: 1.3, rng });
    // a ring of iron at the strings' height
    B.add(new THREE.TorusGeometry(0.11, 0.02, 4, 10), mat(m.x, m.attach, m.z, Math.PI / 2, 0, 0), { color: L.iron, iron: 0.8, moss: 0, ground: m.g });
  }
  // ---- the poles: painted, a crossbar and a knob, set in a cairn of stones
  for (const p of plan.poles) {
    const g = G(p.x, p.z) - 0.25, h = p.top - g;
    B.add(B.cyl(0.055, 0.07, h, 6, 1), mat(p.x, g + h / 2, p.z, (rng() - 0.5) * 0.04, 0, (rng() - 0.5) * 0.04), { color: paint[p.i % 4], moss: 0.05, ground: g });
    B.add(B.box(0.5, 0.06, 0.06), mat(p.x, p.top - 0.12, p.z, 0, p.yaw, 0), { color: paint[(p.i + 1) % 4], moss: 0, ground: g });
    B.add(new THREE.IcosahedronGeometry(0.09, 0), mat(p.x, p.top + 0.05, p.z), { color: L.gilt, moss: 0, ground: g });
    for (let k = 0; k < 4; k++) { const a = k * 1.6 + rng(); B.add(B.rock(0.16 + rng() * 0.08, 0, 1, 0.7, 1), mat(p.x + Math.cos(a) * 0.2, g + 0.3, p.z + Math.sin(a) * 0.2, rng() * 3, rng() * 3, 0), { color: Hc.stone, moss: 0.4, ground: g + 0.25 }); }
    ctx.addCollider({ x: p.x, z: p.z, r: 0.18 });
  }
  // ---- the strings: cord, sagging between their ends
  for (const s of plan.strings) {
    const n = Math.max(6, Math.round(Math.hypot(s.b[0] - s.a[0], s.b[2] - s.a[2]) / (low ? 2.2 : 1.2)));
    const p0 = [0, 0, 0], p1 = [0, 0, 0];
    for (let i = 0; i < n; i++) { stringAt(s.a, s.b, s.sag, i / n, p0); stringAt(s.a, s.b, s.sag, (i + 1) / n, p1); rod(B, p0, p1, 0.008, { color: L.iron, moss: 0, ground: -1e3 }, 3); }
  }
  // ---- benches
  for (const b of plan.benches) P.late.bench(B, mat(b.x, G(b.x, b.z) - 0.05, b.z, 0, b.yaw, 0), { w: b.w, rng });
  // v8-10 (#7): each bench a capsule at its seat (0.45 m), to be hopped onto and walked along
  for (const b of plan.benches) { const ca = Math.cos(b.yaw), sa = Math.sin(b.yaw), e = b.w / 2 - 0.25, g = G(b.x, b.z); ctx.addCollider({ x1: b.x - ca * e, z1: b.z + sa * e, x2: b.x + ca * e, z2: b.z - sa * e, r: 0.25, y: g - 1, h: 1.45 }); }
  // ---- the patrons' board, counters and the winner's pile; two cups
  {
    const t = plan.table, top = t.top;
    B.add(B.box(0.44, 0.025, 0.44), mat(t.x, top + 0.012, t.z, 0, 0.15, 0), { color: L.plaster[3], moss: 0, ground: top - 1 });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) {
      const ca = Math.cos(0.15), sa = Math.sin(0.15), lx = -0.165 + i * 0.11, lz = -0.165 + j * 0.11;
      B.add(B.box(0.1, 0.006, 0.1), mat(t.x + lx * ca + lz * sa, top + 0.027, t.z - lx * sa + lz * ca, 0, 0.15, 0), { color: L.paint[1], moss: 0, ground: top - 1 });
    }
    // the winner's pile (on his side, +x), the loser's two
    for (let k = 0; k < (low ? 9 : 16); k++) { const a = rng() * 6.28, d = rng() * 0.07; B.add(B.cyl(0.025, 0.025, 0.012, 8, 1), mat(t.x + 0.3 + Math.cos(a) * d, top + 0.008 + (k % 5) * 0.012, t.z + 0.05 + Math.sin(a) * d), { color: L.gilt, iron: 0.4, moss: 0, ground: top - 1 }); }
    for (let k = 0; k < 2; k++) B.add(B.cyl(0.025, 0.025, 0.012, 8, 1), mat(t.x - 0.3 + k * 0.06, top + 0.008, t.z - 0.12), { color: L.gilt, iron: 0.4, moss: 0, ground: top - 1 });
    B.add(B.cyl(0.035, 0.03, 0.09, 8, 1), mat(t.x + 0.32, top + 0.045, t.z - 0.22), { color: L.tile[0], moss: 0, ground: top - 1, wet: 0.4 });
    B.add(B.lathe([[0.0, 0], [0.06, 0.01], [0.075, 0.12], [0.05, 0.2], [0.03, 0.26], [0.04, 0.29]], 10), mat(t.x - 0.05, top, t.z + 0.3), { color: L.tile[1], moss: 0, ground: top - 1, wet: 0.4 });
  }
  // ---- the sleeper's table: a Heliarch bronze door, studded, a roundel boss, on two ochre trestles; cups, a jug on its side
  {
    const t = plan.sleeperTable, g = G(t.x, t.z), top = g + 0.72, ca = Math.cos(t.yaw), sa = Math.sin(t.yaw);
    const at = (lx, lz) => [t.x + lx * ca + lz * sa, t.z - lx * sa + lz * ca];
    B.add(B.box(1.7, 0.07, 0.95, { chip: 0.01 }), mat(t.x, top, t.z, 0, t.yaw, 0.02), { color: Hc.bronze, iron: 0.7, moss: 0.15, ground: g, wet: 0.2 });
    for (let i = 0; i < 6; i++) for (const lz of [-0.38, 0.38]) { const [x, z] = at(-0.75 + i * 0.3, lz); B.add(new THREE.IcosahedronGeometry(0.025, 0), mat(x, top + 0.04, z), { color: Hc.bronzeDark, iron: 0.6, moss: 0, ground: g }); }
    { const [x, z] = at(0.1, 0); B.add(B.cyl(0.2, 0.22, 0.04, 16, 1), mat(x, top + 0.05, z), { color: Hc.bronzeDark, iron: 0.6, moss: 0.1, ground: g }); }
    for (const lx of [-0.62, 0.62]) {
      for (const s of [-1, 1]) { const [x, z] = at(lx, s * 0.25); B.add(B.box(0.06, 0.78, 0.06), mat(x, g + 0.34, z, s * 0.3 * ca, t.yaw, -s * 0.3 * sa), { color: L.paint[2], moss: 0.05, ground: g }); }
      const [x, z] = at(lx, 0); B.add(B.box(0.06, 0.06, 0.5), mat(x, g + 0.62, z, 0, t.yaw, 0), { color: L.paint[2], moss: 0, ground: g });
    }
    { const [x, z] = at(-0.4, 0.15); B.add(B.cyl(0.04, 0.032, 0.1, 8, 1), mat(x, top + 0.085, z), { color: L.tile[2], moss: 0, ground: g, wet: 0.4 }); }
    { const [x, z] = at(0.5, -0.2); B.add(B.lathe([[0.0, 0], [0.08, 0.02], [0.1, 0.16], [0.05, 0.27], [0.035, 0.33], [0.05, 0.36]], 10), mat(x, top + 0.11, z, 0, t.yaw + 0.4, Math.PI / 2 - 0.1), { color: L.tile[1], moss: 0, ground: g, wet: 0.4 }); }
    S.place({ hand: 'late', from: 'heliarch', kind: 'spolia', name: 'a Heliarch bronze door for a table', x: t.x, y: top, z: t.z, foot: g - 0.02, mount: 'ground', r: 0.6 });
    { const [x1, z1] = at(-0.6, 0), [x2, z2] = at(0.6, 0); ctx.addCollider({ x1, z1, x2, z2, r: 0.47, y: g - 1, h: 1.79 }); } // v8-10: the door-table at its top
  }
  // ---- spilt: a cup on its side, red shards of a jar, a split pomegranate, a spoon
  for (const s of plan.spilt) {
    const g = G(s.x, s.z);
    if (s.kind === 'cup') B.add(B.cyl(0.04, 0.032, 0.1, 8, 1, true), mat(s.x, g + 0.04, s.z, Math.PI / 2, s.yaw, 0), { color: L.tile[0], moss: 0, ground: g, wet: 0.4 });
    else if (s.kind === 'shards') for (let k = 0; k < 7; k++) { const a = rng() * 6.28, d = rng() * 0.45; B.add(B.box(0.06 + rng() * 0.06, 0.012, 0.04 + rng() * 0.05), mat(s.x + Math.cos(a) * d, G(s.x + Math.cos(a) * d, s.z + Math.sin(a) * d) + 0.01, s.z + Math.sin(a) * d, (rng() - 0.5) * 0.4, rng() * 6, (rng() - 0.5) * 0.4), { color: k % 3 ? L.tile[1] : L.plaster[3], moss: 0, ground: g, wet: 0.3 }); }
    else if (s.kind === 'pom') for (const k of [0, 1]) { B.add(new THREE.SphereGeometry(0.065, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(s.x + k * 0.16, g + 0.005, s.z + k * 0.05, k ? 0.2 : 0, k * 2, 0), { color: k ? L.pom : L.pomDark, moss: 0, ground: g }); B.add(B.cyl(0.06, 0.06, 0.01, 8, 1), mat(s.x + 0.16, g + 0.065, s.z + 0.05, 0.2, 2, 0), { color: new THREE.Color('#d86070'), moss: 0, ground: g }); }
    else if (s.kind === 'spoon') B.add(B.box(0.02, 0.012, 0.24), mat(s.x, g + 0.01, s.z, 0, s.yaw, 0.1), { color: L.wood, moss: 0, ground: g });
  }
  const mesh = S.mesh(B, 'late', 'house-props');
  ctx.scene.add(mesh);
  return mesh;
}

// the trampled ground before the gate: packed earth, a dark spill, faded out at the edges with the noise
export function bareGround(ctx, G, area, N2) {
  const nx = 26, nz = 16, pos = [], col = [], idx = [];
  const earth = new THREE.Color('#3e2f22'), wet = new THREE.Color('#1e1610');
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const u = i / nx * 2 - 1, v = j / nz * 2 - 1, x = area.x + u * area.rx, z = area.z + v * area.rz;
    const r = Math.hypot(u, v), n = N2(x * 0.45, z * 0.45);
    const a = Math.max(0, Math.min(1, (1 - r) * 2.2 + n * 0.5)) * 0.85;
    const spill = Math.hypot(x - area.spill[0], (z - area.spill[1]) * 1.6) < 0.7 + 0.2 * n ? 1 : 0;
    const c = earth.clone().lerp(wet, spill * 0.8).multiplyScalar(0.85 + 0.3 * N2(x * 2.1, z * 2.1));
    pos.push(x, G(x, z) + 0.035, z); col.push(c.r, c.g, c.b, a);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, depthWrite: false, roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.name = 'house-bare-ground'; m.receiveShadow = true; m.renderOrder = 2;
  ctx.scene.add(m);
  return m;
}
