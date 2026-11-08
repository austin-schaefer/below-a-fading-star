// CY The Collation [Decided] (wilderness-v5.md "Detail"; IDEAS-v5.md CY): in a clearing inside Medlar Close a long table
// laid for twelve. Pewter plates with a bletted medlar on each, glasses with dust at the bottom, the chairs pulled out as
// if the guests had just stood, one knocked over on its back; a cloth gone to grey; nothing else.
//
// Where: the plan's centre is (150, -70), but the orchard's rows stand there on a terrace edge with a metre of fall across
// any 11 m line and a tree every 8 m. The table sits at (141, -66), 10 m off, on the nearest ground that is level (0.2 m of
// fall along it) and more than 1.5 m clear of every tree in both the high and the low build (found by search over the
// planted trees of each; no tree is moved). Its axis runs 23 degrees north of east. One merged mesh, vertex-coloured, casting
// shadows; colliders on the table (a row of circles) and every chair. Static.
import * as THREE from 'three';
import { Acc, mat } from './kit.js';

const OFF = typeof location !== 'undefined' && (() => { const q = new URLSearchParams(location.search); return q.get('dressing5') === '0' || q.get('collation') === '0'; })();
export const COLLATION = { x: 141, z: -66, angle: -0.4, length: 11, width: 1.1, height: 0.74, places: 12 };
const CA = Math.cos(COLLATION.angle), SA = Math.sin(COLLATION.angle);
// the table's frame: u along its axis, v across (to the south-south-east)
export const toWorld = (u, v) => [COLLATION.x + u * CA - v * SA, COLLATION.z + u * SA + v * CA];
// true where ground cover keeps off (ground.js, margin < 0, after the draws): the clearing round the table, an oval 11 m
// along it and 8 m across, its outer quarter frayed by a hash of the spot so the edge is grass and gaps, not a line
export function collationClear(x, z) {
  if (OFF) return false;
  const dx = x - COLLATION.x, dz = z - COLLATION.z, u = dx * CA + dz * SA, v = -dx * SA + dz * CA;
  const e = Math.hypot(u / 11, v / 8); // 1 at the oval's rim
  if (e >= 1) return false;
  if (e < 0.75) return true;
  const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return (h - Math.floor(h)) < (1 - e) / 0.25 + 0.1;
}

export function buildCollation(ctx) {
  const counts = { plates: 0, medlars: 0, glasses: 0 }, chairs = [];
  const rng = ctx.makeRng(5400), H = (x, z) => ctx.terrain.heightAt(x, z);
  const acc = new Acc(rng);
  const L = COLLATION.length, W = COLLATION.width;
  // the table's top is level, at the highest ground under a trestle plus its height
  const TU = [-4.8, -2.4, 0, 2.4, 4.8];
  let hi = -Infinity, lo = Infinity;
  for (const u of TU) for (const v of [-0.45, 0.45]) { const [x, z] = toWorld(u, v), h = H(x, z); hi = Math.max(hi, h); lo = Math.min(lo, h); }
  const top = hi + COLLATION.height;
  const at = (u, v, y, rx = 0, ry = 0, rz = 0) => { const [x, z] = toWorld(u, v); return mat(x, y, z, rx, ry - COLLATION.angle, rz); }; // ry measured in the table's frame

  // trestles: two legs, a foot bar and a stretcher each, each foot on its own ground
  for (const u of TU) {
    for (const v of [-0.4, 0.4]) {
      const [x, z] = toWorld(u, v), g = H(x, z) - 0.05, h = top - 0.06 - g;
      acc.box(0.075, h, 0.075, at(u, v, g + h / 2), '#3f3329', 0.1);
    }
    for (const v of [-0.4, 0.4]) { const [x, z] = toWorld(u, v), g = H(x, z); acc.box(0.09, 0.07, 0.7, at(u + 0.0, v, g + 0.03, 0, 0, 0), '#3a3027', 0.1); }
    acc.box(0.06, 0.08, W - 0.1, at(u, 0, top - 0.55), '#3f3329', 0.1);
  }
  // the top: four planks, ends staggered, one or two a little warped
  for (let i = 0; i < 4; i++) {
    const w = (W - 0.03) / 4, v = -W / 2 + w * (i + 0.5) + 0.01 * i, len = L - 0.5 + (rng() - 0.5) * 0.5;
    acc.box(len, 0.05, w - 0.012, at((rng() - 0.5) * 0.3, v, top - 0.025, 0, 0, (rng() - 0.5) * 0.012), i % 2 ? '#5b4b3d' : '#54463a', 0.1);
  }
  // the cloth, gone to grey: a runner over the middle, hanging in short drops along both edges
  acc.box(L - 0.9, 0.012, 0.86, at(0, 0, top + 0.006), '#8a857f', 0.04);
  for (const side of [-1, 1]) {
    for (let u = -L / 2 + 0.6; u < L / 2 - 0.9;) {
      const seg = 0.3 + rng() * 0.8, drop = rng() < 0.28 ? 0.03 + rng() * 0.05 : 0.1 + rng() * 0.3; // some edges have rotted back to a hem
      acc.box(Math.min(seg, L / 2 - 0.9 - u), drop, 0.012, at(u + seg / 2, side * (0.43 + drop * 0.12), top - drop / 2 - 0.002, side * 0.14 + (rng() - 0.5) * 0.1, 0, 0), rng() < 0.5 ? '#7c7771' : '#85807a', 0.08);
      u += seg + rng() * 0.12;
    }
  }

  // plates, medlars and glasses: six a side
  const plate = new THREE.LatheGeometry([[0, 0], [0.085, 0], [0.098, 0.004], [0.138, 0.013], [0.148, 0.021], [0.153, 0.019], [0.149, 0.012]].map(([x, y]) => new THREE.Vector2(x, y)), 12);
  const medlar = new THREE.IcosahedronGeometry(1, 1), bowl = new THREE.CylinderGeometry(0.034, 0.021, 0.075, 10, 1, true), stem = new THREE.CylinderGeometry(0.005, 0.006, 0.06, 5), foot = new THREE.CylinderGeometry(0.03, 0.033, 0.006, 10), dust = new THREE.CylinderGeometry(0.0225, 0.0225, 0.004, 10), calyx = new THREE.CylinderGeometry(0.01, 0.012, 0.006, 6);
  const PU = []; for (let i = 0; i < 6; i++) PU.push(-4.25 + i * 1.7);
  for (const side of [-1, 1]) for (const u of PU) {
    const v = side * 0.27, tilt = (rng() - 0.5) * 0.02;
    acc.add(plate, at(u, v, top + 0.012, tilt, rng() * 6.28, 0), '#666a72', 0.1); counts.plates++;
    const ms = 0.04 + rng() * 0.008;
    acc.add(medlar, at(u + (rng() - 0.5) * 0.04, v + (rng() - 0.5) * 0.04, top + 0.012 + 0.03, 0, rng() * 6.28, 0).scale(new THREE.Vector3(ms, ms * 0.82, ms)), '#4b2f1b', 0.18);
    counts.medlars++;
    acc.add(calyx, at(u, v, top + 0.012 + 0.03 + ms * 0.8, 0, 0, 0), '#23160e', 0.1);
    const gu = u + 0.2, gv = side * 0.43;
    acc.add(foot, at(gu, gv, top + 0.003), '#929f98', 0.04);
    acc.add(stem, at(gu, gv, top + 0.036), '#929f98', 0.04);
    acc.add(bowl, at(gu, gv, top + 0.066 + 0.0375), '#a5b3ab', 0.04);
    acc.add(dust, at(gu, gv, top + 0.067 + 0.004), '#58554f', 0.12); counts.glasses++;
  }

  // chairs
  const chairAt = (x, z, psi, ground, fallen) => {
    const from = acc.count, c = '#4a3b2f';
    const parent = new THREE.Matrix4().compose(new THREE.Vector3(x, ground, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(fallen ? -1.36 : 0, psi, 0, 'YXZ')), new THREE.Vector3(1, 1, 1));
    const put = (w, h, d, px, py, pz, col) => acc.box(w, h, d, parent.clone().multiply(new THREE.Matrix4().makeTranslation(px, py, pz)), col, 0.1);
    put(0.44, 0.045, 0.42, 0, 0.45, 0, c);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(0.04, 0.45, 0.04, sx * 0.19, 0.225, sz * 0.18, '#43362b');
    for (const sx of [-1, 1]) put(0.04, 0.52, 0.04, sx * 0.19, 0.71, -0.18, '#43362b');
    put(0.42, 0.07, 0.03, 0, 0.93, -0.18, c);
    put(0.4, 0.045, 0.03, 0, 0.74, -0.18, c);
    if (fallen) { const [lo2] = acc.yRange(from); acc.shift(from, ground - lo2 + 0.005); }
    chairs.push({ x, z, fallen, ground, ...(fallen ? { rise: acc.yRange(from)[1] - ground } : {}) });
  };
  const cols = [];
  for (const side of [-1, 1]) PU.forEach((u, i) => {
    const pull = (rng() < 0.3 ? 0.65 + rng() * 0.45 : 0.08 + rng() * 0.42), du = (rng() - 0.5) * 0.3, jitter = (rng() - 0.5) * 0.9;
    const v = side * (0.55 + 0.26 + pull);
    const [x, z] = toWorld(u + du, v);
    // facing: toward the table's axis, turned by jitter
    const psi = Math.atan2(side * SA, -side * CA) + jitter; // facing -side * (world direction of +v) = -side * (-sin, cos)
    if (side === -1 && i === 3) return; // this one is the knocked-over chair, below
    chairAt(x, z, psi, H(x, z), false);
    cols.push({ x, z, r: 0.3, y: H(x, z) - 0.1, h: 1.0 });
  });
  { // knocked over backward, a pace behind where it stood, lying with its back on the grass
    const [x, z] = toWorld(PU[3] + 0.15, -(0.55 + 0.26 + 0.95));
    chairAt(x, z, Math.atan2(-SA, CA) + 0.5, H(x, z), true); // it faced the table (+v) from the -v side
    cols.push({ x, z, r: 0.42, y: H(x, z) - 0.1, h: 0.6 });
  }
  for (let u = -5; u <= 5.01; u += 1) {
    const [x, z] = toWorld(u, 0);
    cols.push({ x, z, r: 0.62, y: lo - 0.3, h: top - lo + 0.3 });
  }
  for (const c of cols) ctx.addCollider(c);

  const mesh = new THREE.Mesh(acc.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, side: THREE.DoubleSide }));
  mesh.name = 'collation'; mesh.castShadow = true; mesh.receiveShadow = true;
  ctx.scene.add(mesh);
  return { mesh, meshes: [mesh], top, colliders: cols.length, places: PU.length * 2, ...counts, chairs, axis: { ...COLLATION } };
}
