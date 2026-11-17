// The Garth's watering can (v17-U2): as tall as a man, full to the brim, set down at the light's edge with its long
// spout reaching over the rill there, a drop gathering at the rose and falling. The tender's make (src/v12/stair/top.js,
// the oil can on the lattice's deck): the same brass, the same iron hoops round its body, a bow handle over the top and
// a grip behind, only bigger, and for water. Nobody is seen to use it. stories/the-meridian-garth.md, beat 7.
import * as THREE from 'three';
import { CX, CZ, FLOOR, CAN, RILL, at, DOOR_A } from './plan.js';

const C = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const BRASS = C('#6a4e30'), BRASS_W = C('#8a6a3a'), IRON = C('#1c1714'), VERD = C('#3f6a5a'), WATER = C('#0c1416');

export function buildCan(B) {
  const [x, z] = at(CAN.r, CAN.b), a = DOOR_A + CAN.b, ix = -Math.cos(a), iz = -Math.sin(a); // in toward the middle
  const M = (lx, ly, lz) => [x + ix * lx - iz * lz, FLOOR + ly, z + iz * lx + ix * lz]; // local: +x in, +z across
  // the body: a lathe, broad at the foot, a shoulder, a collar at the mouth; brass, verdigris where water ran
  const prof = [[0.0, 0.0], [0.58, 0.0], [0.62, 0.06], [0.6, 0.9], [0.56, 1.3], [0.42, 1.52], [0.3, 1.6], [0.31, 1.68], [0.28, 1.7]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 28);
  const mat = new THREE.Matrix4().makeTranslation(x, FLOOR + 0.015, z); // (its foot over the soil, not in its plane)
  B.geo(g, mat, (nx, ny) => (ny > 0.6 ? BRASS_W : BRASS), 0.06);
  // verdigris runs down from the mouth on the spout's side
  for (let k = 0; k < 5; k++) { const q = a + Math.PI + (k - 2) * 0.12, r = 0.605; B.quad([x + Math.cos(q) * r, FLOOR + 1.3, z + Math.sin(q) * r], [x + Math.cos(q + 0.05) * r, FLOOR + 1.3, z + Math.sin(q + 0.05) * r], [x + Math.cos(q + 0.05) * r, FLOOR + 0.5 + k * 0.08, z + Math.sin(q + 0.05) * r], [x + Math.cos(q) * r, FLOOR + 0.45 + k * 0.1, z + Math.sin(q) * r], VERD, [Math.cos(q), 0, Math.sin(q)], 0.05); }
  // the iron hoops round it
  for (const y of [0.2, 0.75, 1.22]) { const r = y < 1 ? 0.615 : 0.585; const h = new THREE.CylinderGeometry(r, r, 0.07, 28, 1, true); B.geo(h, new THREE.Matrix4().makeTranslation(x, FLOOR + y, z), IRON, 0.04); }
  // full: the water's face just under the lip
  { const d = new THREE.CircleGeometry(0.28, 20).rotateX(-Math.PI / 2); B.geo(d, new THREE.Matrix4().makeTranslation(x, FLOOR + 1.665, z), WATER, 0); }
  // the bow handle over the mouth, and the grip behind
  for (let i = 0; i < 12; i++) {
    const t0 = Math.PI * i / 12, t1 = Math.PI * (i + 1) / 12, r = 0.42; // (its feet on the shoulder)
    B.beam(M(0, 1.52 + Math.sin(t0) * 0.6, Math.cos(t0) * r), M(0, 1.52 + Math.sin(t1) * 0.6, Math.cos(t1) * r), 0.03, IRON, 0.04);
  }
  B.beam(M(-0.6, 1.2, 0), M(-0.9, 1.0, 0), 0.035, BRASS, 0.04); B.beam(M(-0.9, 1.0, 0), M(-0.88, 0.5, 0), 0.035, BRASS, 0.04); B.beam(M(-0.88, 0.5, 0), M(-0.6, 0.35, 0), 0.035, BRASS, 0.04);
  // the spout: from low on the body up and in over the rill, the rose at its end
  const root = M(0.55, 0.35, 0), rose = rosePoint();
  const mid = [(root[0] + rose[0]) / 2, (root[1] + rose[1]) / 2, (root[2] + rose[2]) / 2];
  const sp = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(...root), new THREE.Vector3(mid[0], mid[1] - 0.12, mid[2]), new THREE.Vector3(...rose)), 12, 0.085, 8, false);
  B.geo(sp, new THREE.Matrix4(), BRASS, 0.04);
  const head = new THREE.CylinderGeometry(0.21, 0.09, 0.18, 14);
  const dir = new THREE.Vector3(rose[0] - mid[0], rose[1] - mid[1] - 0.05, rose[2] - mid[2]).normalize();
  B.geo(head, new THREE.Matrix4().compose(new THREE.Vector3(...rose), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir), new THREE.Vector3(1, 1, 1)), BRASS_W, 0.04);
  return { x, z, rose };
}
// the rose's face, over the inner rill
export function rosePoint() {
  const [x, z] = at(RILL.inner + 0.02, CAN.b);
  return [x, FLOOR + 1.4, z];
}
