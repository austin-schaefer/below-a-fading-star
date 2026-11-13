// The top of the Diffident Stair (v12-H3): the foot of a lattice come low, and the tender's place against it.
// One of the old lattices that hang in the high air (src/skylife/lattices.js draws the far ones as sky) has sunk until
// its lowest node hangs a hundred metres over the east moor: real metal, a grid of members 3.2 m square on a 42 m cell,
// four cells high, struts knocked out, others snapped, square webs strung in some panels. It does not turn. The stair
// ends at a landing against that lowest node, and on the node's east side someone has made a home: a deck of planks on
// iron brackets with a rope rail, a lean-to of old bronze sheet and canvas against the node, a cot, a stove and its
// kettle, a gilt chair gone brown turned to the sun, a line of washing, a pot of moss; and the tools of a job too big
// for anyone, an oil can as tall as a child and a brush on a pole longer than the deck, at the foot of a ladder of
// rungs that runs up the strut into the lattice. A lamp hook beside the ladder. The tender's lamp (the one the sky
// sees going from lattice to lattice) comes down the ladder now and then, hangs on its hook a while, and climbs away;
// it comes soon after a walker reaches the top. Nobody is ever seen. stories/the-tender-of-the-lattices.md.
// From the deck the lowest member north is a walkway 3.2 m wide and 38 m long in the open air, to the next node.
// Draws: the lattice (one), its webs (one), the home (one), the lamp (one mesh, one point); two lights (the stove, the
// lamp). The floors: the deck (held edges, the rail), the member and the far node (not held).
import * as THREE from 'three';
import { mergeGeometries } from '../../v4/kit/merge.js';
import { paint, slab, slabMaterial, BRONZE, POLISH, EMBER } from './treads.js';

const CELL = 42, TH = 3.2, NODE = 4.4; // the lattice's cell, a member's section, a node's cube
const col = (h) => new THREE.Color(h);
const WOOD = col('#5a3a24'), WOOD_D = col('#3e281a'), IRON = col('#1c1714'), GILT = col('#8a6a30'), CRIMSON = col('#7a2420'), CREAM = col('#d8ccb0');
const SAFFRON = col('#c8902a'), TEAL = col('#2a6a64'), TERRA = col('#8a4a2a'), MOSS = col('#4a5a26'), BRASS = col('#6a4e30'), CANVAS = col('#8a7a5e');

function metalMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.45, roughness: 0.55 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vLW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vLW;
float lHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float lNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(lHash(i), lHash(i + vec3(1,0,0)), f.x), mix(lHash(i + vec3(0,1,0)), lHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(lHash(i + vec3(0,0,1)), lHash(i + vec3(1,0,1)), f.x), mix(lHash(i + vec3(0,1,1)), lHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}`).replace('#include <color_fragment>', `#include <color_fragment>
  float lm = lNoise(vLW * 1.7) * 0.55 + lNoise(vLW * 6.1) * 0.45;
  float streak = lNoise(vec3(vLW.x * 5.0, vLW.y * 0.25, vLW.z * 5.0));
  float verd = smoothstep(0.52, 0.8, lNoise(vLW * 0.35 + 9.0) * 0.55 + lm * 0.45);
  diffuseColor.rgb *= 0.5 + 0.85 * lm;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.10, 0.20, 0.16), verd * 0.7);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.12, 0.07, 0.05), smoothstep(0.55, 0.9, streak) * 0.4);
  float lRough = 0.3 * verd;`).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = min(1.0, roughnessFactor + lRough);');
  };
  return m;
}

// a box from A to B (arrays), w x h section, `side` its across hint; painted
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _m = new THREE.Matrix4();
function member(A, B, w, h, color, side = [0, 1, 0], em = 0) {
  _a.fromArray(A); _b.fromArray(B);
  _z.subVectors(_b, _a); const len = _z.length(); _z.divideScalar(len);
  _x.fromArray(side); if (Math.abs(_x.dot(_z)) > 0.95) _x.set(1, 0, 0); _x.addScaledVector(_z, -_x.dot(_z)).normalize();
  _y.crossVectors(_z, _x);
  const g = new THREE.BoxGeometry(w, h, len);
  _m.makeBasis(_x, _y, _z).setPosition((_a.x + _b.x) / 2, (_a.y + _b.y) / 2, (_a.z + _b.z) / 2);
  g.applyMatrix4(_m);
  return paint(g, color, em);
}
const box = (x, y, z, w, h, d, color, em = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return paint(g, color, em); };
const cyl = (x, y, z, r0, r1, h, color, seg = 8, em = 0) => { const g = new THREE.CylinderGeometry(r0, r1, h, seg); g.translate(x, y, z); return paint(g, color, em); };

export function buildTop(ctx, P, { low }) {
  const top = P.top, rng = ctx.makeRng(12331);
  const Y = top.y; // the landing's floor
  const cz = top.cz, xw = top.cx + top.ux * top.hd; // the landing's west edge (the stair arrives heading west)
  // the lattice's lowest node: west of the deck, its centre 1.6 m under the floor so a member's top is level with it
  const n0 = { x: xw - 4 - NODE / 2, y: Y - TH / 2, z: cz };
  const node = (i, j, k) => [n0.x - CELL * i, n0.y + CELL * k, n0.z - CELL * j];
  // ------------------------------------------------------------------ the lattice
  // nodes i (west), j (north; -1 south), k (up); the lowest layer has only the foot, the north node and a stub west
  const has = (i, j, k) => i >= 0 && i <= 1 && j >= -1 && j <= 1 && k >= 0 && k <= 3 && (k > 0 || (i === 0 && (j === 0 || j === 1)));
  const struts = [], nodes = [];
  const keepAlways = new Set(['0,0,0>0,1,0', '0,0,0>0,0,1', '0,1,0>0,1,1', '0,0,1>1,0,1', '0,0,1>0,1,1']);
  for (let i = 0; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = 0; k <= 3; k++) {
    if (!has(i, j, k)) continue;
    nodes.push([i, j, k]);
    for (const [di, dj, dk] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
      if (!has(i + di, j + dj, k + dk)) continue;
      const key = `${i},${j},${k}>${i + di},${j + dj},${k + dk}`;
      if (!keepAlways.has(key) && rng() < 0.22) continue;
      let A = node(i, j, k), B = node(i + di, j + dj, k + dk);
      if (!keepAlways.has(key) && rng() < 0.16) { const f = 0.3 + rng() * 0.4; B = A.map((v, c) => v + (B[c] - v) * f); } // snapped
      struts.push([A, B]);
    }
  }
  // a stub south off the foot, snapped, and a member west off it bent down where it broke
  struts.push([node(0, 0, 0), [n0.x, n0.y, n0.z + 15]]);
  struts.push([node(0, 0, 0), [n0.x - 11, n0.y - 1.2, n0.z]]);
  const parts = [];
  const METAL = col('#4a3a32'), METAL_P = col('#8a6a4a');
  for (const [A, B] of struts) {
    const vert = Math.abs(A[1] - B[1]) > 1;
    parts.push(member(A, B, TH, TH, rng() < 0.13 ? METAL_P : METAL, vert ? [1, 0, 0] : [0, 1, 0]));
  }
  for (const [i, j, k] of nodes) { const [x, y, z] = node(i, j, k); parts.push(box(x, y, z, NODE, NODE, NODE, col('#3e322c'))); }
  // the seams round the foot node's faces: thin bands of paler metal
  for (const dy of [-NODE / 2 + 0.3, NODE / 2 - 0.3]) parts.push(box(n0.x, n0.y + dy, n0.z, NODE + 0.06, 0.08, NODE + 0.06, METAL_P));
  // the north member's top, where a walker goes: plates a stride and a half long, their seams dark, each its own shade,
  // a row of rivet heads along each seam; one plate in five worn bright down the middle
  {
    const x0 = n0.x - TH / 2, z0 = n0.z - NODE / 2, z1 = n0.z - CELL + NODE / 2;
    for (let z = z0; z > z1 + 0.4; z -= 1.5) {
      const zz = Math.max(z1, z - 1.46), bright = rng() < 0.2;
      parts.push(box(n0.x, n0.y + TH / 2 + 0.012, (z + zz) / 2, TH - 0.08, 0.024, z - zz - 0.05, (bright ? METAL_P : METAL).clone().multiplyScalar(0.8 + rng() * 0.4)));
      for (let k = 0; k < 7; k++) parts.push(box(x0 + 0.25 + k * (TH - 0.5) / 6, n0.y + TH / 2 + 0.03, zz + 0.05, 0.05, 0.03, 0.05, METAL_P));
    }
  }
  const latGeo = mergeGeometries(parts);
  const lattice = new THREE.Mesh(latGeo, metalMaterial());
  lattice.castShadow = true; lattice.receiveShadow = true; lattice.name = 'stair-lattice';
  ctx.scene.add(lattice);

  // the webs: the square spider-web of the lattices in a few panels of the upper cells
  const W = [];
  const webPanel = (o, u, v) => {
    const at = (fu, fv) => [o[0] + u[0] * fu + v[0] * fv, o[1] + u[1] * fu + v[1] * fv, o[2] + u[2] * fu + v[2] * fv];
    const c = at(0.5 + (rng() - 0.5) * 0.15, 0.5 + (rng() - 0.5) * 0.15);
    const seg = (p, q) => { if (rng() < 0.2) return; W.push(...p, ...q); };
    for (const [fu, fv] of [[0, 0], [1, 0], [1, 1], [0, 1], [0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]]) seg(c, at(fu, fv));
    for (let r = 1; r <= 4; r++) { const h = r / 9; const q = [at(0.5 - h, 0.5 - h), at(0.5 + h, 0.5 - h), at(0.5 + h, 0.5 + h), at(0.5 - h, 0.5 + h)]; for (let e = 0; e < 4; e++) seg(q[e], q[(e + 1) % 4]); }
  };
  for (let n = 0; n < (low ? 4 : 7); n++) {
    const i = rng() < 0.5 ? 0 : 1, j = -1 + ((rng() * 2) | 0), k = 1 + ((rng() * 2) | 0);
    const o = node(i, j, k);
    if (rng() < 0.5) webPanel(o, [-CELL, 0, 0], [0, CELL, 0]); else webPanel(o, [0, 0, -CELL], [0, CELL, 0]);
  }
  // and one low, between the foot's north member and the strut above it, where the walker can see it close
  webPanel(node(0, 0, 0), [0, 0, -CELL], [0, CELL, 0]);
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(W, 3));
  const webs = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: col('#9a8478'), transparent: true, opacity: 0.55, fog: true }));
  webs.name = 'stair-webs';
  ctx.scene.add(webs);

  // ------------------------------------------------------------------ the deck and the home
  // the deck: A east of the node (between it and the landing), B round its north-east corner onto the north member
  const yd = Y + 0.08;
  const nx0 = n0.x - NODE / 2, nx1 = n0.x + NODE / 2, nz0 = n0.z - NODE / 2;
  const A = { x0: nx1, x1: xw, z0: cz - 6, z1: cz + 3.6 }, B = { x0: n0.x - TH / 2, x1: nx1, z0: cz - 6, z1: nz0 };
  const H = [];
  const planks = (R, along) => {
    // boards across the short way, a finger's gap between, each its own shade
    const len = along === 'z' ? R.x1 - R.x0 : R.z1 - R.z0, n = Math.floor((along === 'z' ? R.z1 - R.z0 : R.x1 - R.x0) / 0.27);
    for (let k = 0; k < n; k++) {
      const c = WOOD.clone().multiplyScalar(0.75 + rng() * 0.45), t = 0.06, dy = (rng() - 0.5) * 0.015;
      if (along === 'z') H.push(box((R.x0 + R.x1) / 2, yd - t / 2 + dy, R.z0 + 0.135 + k * 0.27, len, t, 0.25, c));
      else H.push(box(R.x0 + 0.135 + k * 0.27, yd - t / 2 + dy, (R.z0 + R.z1) / 2, 0.25, t, len, c));
    }
  };
  planks(A, 'x'); planks(B, 'z');
  // the brackets: iron struts from under the deck back to the node's face
  for (let z = A.z0 + 0.6; z < A.z1; z += 2.2) {
    H.push(member([A.x0, yd - 0.12, z], [A.x1 - 0.2, yd - 0.12, z], 0.12, 0.16, IRON));
    H.push(member([A.x0, yd - 2.6, z], [A.x1 - 0.6, yd - 0.15, z], 0.1, 0.1, IRON));
  }
  // the rail: posts and a rope along the deck's open edges (east of A beside the landing, the south end, A's north end
  // beyond the member)
  const rail = (x0, z0, x1, z1) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 1.6));
    let prev = null;
    for (let k = 0; k <= n; k++) {
      const x = x0 + (x1 - x0) * k / n, z = z0 + (z1 - z0) * k / n, h = 1.0 + (rng() - 0.5) * 0.12;
      H.push(box(x, yd + h / 2, z, 0.09, h, 0.09, WOOD_D));
      const p = [x, yd + h - 0.06, z];
      if (prev) { const m = [(prev[0] + x) / 2, (prev[1] + p[1]) / 2 - 0.12, (prev[2] + z) / 2]; H.push(member(prev, m, 0.035, 0.035, CANVAS)); H.push(member(m, p, 0.035, 0.035, CANVAS)); }
      prev = p;
    }
  };
  rail(A.x1 - 0.05, cz + top.hw + 0.05, A.x1 - 0.05, A.z1);  // east, south of the landing's mouth
  rail(A.x1 - 0.05, A.z1 - 0.05, A.x0 + 0.05, A.z1 - 0.05);  // south end
  rail(A.x1 - 0.05, A.z0 + 0.05, A.x1 - 0.05, cz - top.hw - 0.05); // east, north of the mouth
  rail(A.x1 - 0.05, A.z0 + 0.05, B.x1 - 0.2, A.z0 + 0.05);     // north end of A
  rail(B.x0 - 0.05, B.z1, B.x0 - 0.05, B.z0 + 1.2);             // west side of B, beside the node, where the member does not run

  // the lean-to: bronze sheets and patches of canvas from the node's east face down to two poles
  const lx0 = nx1, lx1 = nx1 + 3.1, lz0 = cz - 3.4, lz1 = cz + 3.2;
  for (const z of [lz0 + 0.2, lz1 - 0.2]) H.push(box(lx1, yd + 1.05, z, 0.1, 2.1, 0.1, WOOD_D));
  let zz = lz0;
  while (zz < lz1 - 0.05) {
    const w = Math.min(lz1 - zz, 0.9 + rng() * 0.8), c = rng() < 0.35 ? CANVAS.clone().multiplyScalar(0.8 + rng() * 0.3) : BRONZE.clone().multiplyScalar(0.7 + rng() * 0.5);
    H.push(member([lx0, yd + 3.1 + rng() * 0.08, zz + w / 2], [lx1 + 0.3, yd + 1.95, zz + w / 2], w + 0.06, 0.03, c, [0, 0, 1]));
    zz += w - 0.04;
  }
  // under it: the cot along the node's face, its blanket and a pillow
  H.push(box(lx0 + 0.55, yd + 0.22, cz - 1.8, 0.85, 0.12, 2.0, WOOD));
  for (const [dx, dz] of [[-0.35, -0.9], [0.35, -0.9], [-0.35, 0.9], [0.35, 0.9]]) H.push(box(lx0 + 0.55 + dx, yd + 0.1, cz - 1.8 + dz, 0.07, 0.2, 0.07, WOOD_D));
  H.push(box(lx0 + 0.56, yd + 0.33, cz - 1.55, 0.92, 0.1, 1.45, CRIMSON));
  H.push(box(lx0 + 0.5, yd + 0.34, cz - 2.55, 0.55, 0.12, 0.35, CREAM));
  // the stove: an iron drum on legs, its door's glow, a pipe up through the sheets, the kettle
  const sx = lx0 + 0.7, sz = cz + 1.3;
  H.push(cyl(sx, yd + 0.55, sz, 0.3, 0.32, 0.7, IRON, 10));
  H.push(box(sx + 0.3, yd + 0.5, sz, 0.02, 0.18, 0.22, EMBER, 0.9));
  H.push(cyl(sx - 0.1, yd + 2.3, sz, 0.07, 0.07, 2.9, IRON, 6));
  H.push(cyl(sx + 0.05, yd + 1.0, sz, 0.12, 0.15, 0.2, BRASS, 8));
  H.push(member([sx + 0.15, yd + 1.05, sz], [sx + 0.3, yd + 1.12, sz], 0.03, 0.03, BRASS));
  // the shelf on the node's face: cups, a jar
  H.push(box(lx0 + 0.12, yd + 1.5, cz + 0.2, 0.24, 0.04, 1.4, WOOD_D));
  for (let k = 0; k < 4; k++) H.push(cyl(lx0 + 0.12, yd + 1.58, cz - 0.3 + k * 0.33, 0.045, 0.04, 0.12, k === 2 ? TERRA : CREAM, 6));
  // the chair: high-backed, gilt worn to brown, at the deck's south end turned to the sun (south-west)
  {
    const cx = A.x0 + 1.4, czc = A.z1 - 1.1, yaw = -2.2;
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    const R = (lx, ly, lz, w, h, d, c) => { const g = new THREE.BoxGeometry(w, h, d); g.rotateY(yaw); g.translate(cx + lx * cs + lz * sn, yd + ly, czc - lx * sn + lz * cs); return paint(g, c); };
    H.push(R(0, 0.46, 0, 0.56, 0.07, 0.52, GILT));
    for (const [lx, lz] of [[-0.24, -0.22], [0.24, -0.22], [-0.24, 0.22], [0.24, 0.22]]) H.push(R(lx, 0.22, lz, 0.05, 0.45, 0.05, GILT));
    H.push(R(0, 0.98, 0.24, 0.56, 1.0, 0.05, GILT));
    H.push(R(0, 1.52, 0.24, 0.3, 0.14, 0.06, GILT));
    H.push(R(0, 0.62, 0, 0.5, 0.06, 0.46, CRIMSON)); // a cushion
    // beside it a crate for a table, and a cup
    H.push(box(cx + 0.75, yd + 0.25, czc + 0.35, 0.5, 0.5, 0.45, WOOD));
    H.push(cyl(cx + 0.72, yd + 0.55, czc + 0.3, 0.045, 0.04, 0.1, CREAM, 6));
  }
  // the pot of moss by the chair
  H.push(cyl(A.x0 + 2.4, yd + 0.17, A.z1 - 0.5, 0.2, 0.15, 0.34, TERRA, 8));
  H.push(cyl(A.x0 + 2.4, yd + 0.38, A.z1 - 0.5, 0.17, 0.2, 0.1, MOSS, 8));
  // the job's tools: the oil can, its spout reaching up; the brush on a pole, leaning on the node; a coil of rope
  {
    const ox = A.x0 + 0.7, oz = A.z0 + 1.2;
    H.push(cyl(ox, yd + 0.65, oz, 0.42, 0.5, 1.3, BRASS, 12));
    H.push(cyl(ox, yd + 1.38, oz, 0.18, 0.4, 0.18, BRASS, 12));
    H.push(member([ox + 0.3, yd + 1.0, oz], [ox + 1.4, yd + 2.0, oz + 0.2], 0.08, 0.08, BRASS));
    H.push(member([ox - 0.45, yd + 1.25, oz], [ox - 0.45, yd + 0.6, oz], 0.05, 0.05, IRON));
  }
  H.push(member([A.x0 + 0.3, yd + 0.1, A.z0 + 2.6], [nx1 + 0.12, yd + 7.4, A.z0 + 3.4], 0.07, 0.07, WOOD));
  H.push(box(nx1 + 0.2, yd + 7.6, A.z0 + 3.45, 0.18, 0.5, 0.7, col('#3a3026')));
  for (let k = 0; k < 6; k++) H.push(cyl(A.x0 + 2.6, yd + 0.05 + k * 0.06, A.z0 + 0.8, 0.42 - k * 0.01, 0.42 - k * 0.01, 0.05, CANVAS, 10));
  // the ladder: iron rungs up the vertical member's east face from the node's top to the next node, and on the node
  const lx = n0.x + TH / 2 + 0.12;
  for (let y = yd + 0.35; y < n0.y + CELL - NODE / 2; y += 0.36) H.push(member([lx, y, cz - 0.32], [lx, y, cz + 0.32], 0.035, 0.035, IRON, [0, 1, 0]));
  for (const s of [-1, 1]) H.push(member([lx - 0.06, yd, cz + s * 0.36], [lx - 0.06, n0.y + CELL - NODE / 2, cz + s * 0.36], 0.05, 0.05, IRON));
  // the washing line from the ladder to a pole at the deck's north-east, three cloths on it
  const pole = [A.x1 - 0.3, yd + 2.2, A.z0 + 0.4];
  H.push(box(pole[0], yd + 1.1, pole[2], 0.08, 2.2, 0.08, WOOD_D));
  const line0 = [lx + 0.05, yd + 2.1, cz - 0.38];
  H.push(member(line0, pole, 0.02, 0.02, CANVAS));
  [[0.25, SAFFRON, 0.55], [0.5, CREAM, 0.7], [0.72, TEAL, 0.5]].forEach(([f, c, h]) => {
    const p = line0.map((v, k) => v + (pole[k] - v) * f);
    const g = new THREE.PlaneGeometry(0.5, h); g.translate(0, -h / 2, 0);
    const d = [pole[0] - line0[0], pole[2] - line0[2]]; g.rotateY(Math.atan2(d[0], d[1]) + Math.PI / 2 + (rng() - 0.5) * 0.3);
    g.translate(p[0], p[1] - 0.02, p[2]);
    H.push(paint(g, c));
  });
  // the lamp hook: a bracket off the ladder's rail at head height
  const hook = [lx + 0.55, yd + 2.35, cz + 0.55];
  H.push(member([lx - 0.06, yd + 2.45, cz + 0.36], [hook[0], yd + 2.45, hook[2]], 0.04, 0.04, IRON));
  H.push(member([hook[0], yd + 2.45, hook[2]], [hook[0], hook[1], hook[2]], 0.025, 0.025, POLISH));
  const homeGeo = mergeGeometries(H);
  homeGeo.computeBoundingSphere();
  const home = new THREE.Mesh(homeGeo, slabMaterial(false));
  home.castShadow = true; home.receiveShadow = true; home.name = 'stair-home';
  ctx.scene.add(home);

  // ------------------------------------------------------------------ the stove's light and the lamp
  const stove = new THREE.PointLight(col('#ff8a3a'), 2.4, 9, 2);
  stove.position.set(sx + 0.6, yd + 0.7, sz);
  ctx.scene.add(stove);
  const lampGeo = mergeGeometries([
    box(0, 0, 0, 0.26, 0.34, 0.26, IRON), box(0, 0.22, 0, 0.12, 0.1, 0.12, IRON),
    box(0, 0, 0.135, 0.18, 0.24, 0.01, col('#bfe4d8'), 2.2), box(0, 0, -0.135, 0.18, 0.24, 0.01, col('#bfe4d8'), 2.2),
    box(0.135, 0, 0, 0.01, 0.24, 0.18, col('#bfe4d8'), 2.2), box(-0.135, 0, 0, 0.01, 0.24, 0.18, col('#bfe4d8'), 2.2),
  ]);
  const lampMat = slabMaterial(false);
  const lamp = new THREE.Mesh(lampGeo, lampMat); lamp.name = 'stair-lamp';
  ctx.scene.add(lamp);
  const lampLight = new THREE.PointLight(col('#bfe4d8'), 0, 14, 2);
  ctx.scene.add(lampLight);
  // its halo, seen from the moor as a mote on the lattice
  const halo = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3)),
    new THREE.PointsMaterial({ color: col('#bfe4d8'), size: 0.9, sizeAttenuation: true, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, fog: true }));
  halo.frustumCulled = false; halo.name = 'stair-lamp-halo';
  ctx.scene.add(halo);
  // the lamp's round: away (in the lattice, out of sight), down the ladder, home on its hook, up the ladder
  const ladderTop = n0.y + CELL * 2.6, AWAY = 170, DOWN = 34, HOME = 70, UP = 30;
  const L = { phase: 'away', t: AWAY - 25, seen: false };
  const player = ctx.player;
  function update(dt, t) {
    dt = Math.min(dt, 0.1);
    L.t += dt;
    // a walker on the deck brings it: if it is away when they arrive, it starts down within a few seconds
    const onTop = Math.abs(player.pos.y - player.eye - Y) < 2 && Math.abs(player.pos.x - (A.x0 + A.x1) / 2) < 12 && Math.abs(player.pos.z - cz) < 12;
    if (onTop && !L.seen) { L.seen = true; if (L.phase === 'away') L.t = Math.max(L.t, AWAY - 4); }
    if (!onTop && Math.abs(player.pos.y - player.eye - Y) > 30) L.seen = false;
    const dur = { away: AWAY, down: DOWN, home: HOME, up: UP }[L.phase];
    if (L.t >= dur) { L.t = 0; L.phase = { away: 'down', down: 'home', home: 'up', up: 'away' }[L.phase]; }
    let y = ladderTop, x = lx + 0.25, z = cz, on = 1, sway = 0;
    const u = L.t / dur;
    if (L.phase === 'away') on = 0;
    else if (L.phase === 'down' || L.phase === 'up') {
      const f = L.phase === 'down' ? u : 1 - u, e = f * f * (3 - 2 * f);
      // it comes down the rungs in steps: a pause at each few metres, as a climber's hand-over-hand
      const stepped = e + Math.sin(e * Math.PI * 28) * 0.006;
      y = ladderTop + (hook[1] - 0.25 - ladderTop) * stepped;
      on = Math.min(1, f * 6, (1 - f) * 40 + 0.3);
      if (f > 0.97) { x += (hook[0] - x) * (f - 0.97) / 0.03; z += (hook[2] - z) * (f - 0.97) / 0.03; }
      sway = 0.05;
    } else { x = hook[0]; y = hook[1] - 0.25; z = hook[2]; sway = 0.02; }
    lamp.visible = on > 0;
    lamp.position.set(x, y, z);
    lamp.rotation.z = Math.sin(t * 1.7) * sway;
    lampLight.position.set(x, y, z);
    lampLight.intensity = 3.2 * on * (0.92 + 0.08 * Math.sin(t * 2.3));
    halo.position.set(x, y, z);
    halo.material.opacity = 0.75 * on;
  }
  update(0, 0);

  // ------------------------------------------------------------------ the floors
  const sTop = { x0: n0.x - TH / 2, x1: n0.x + TH / 2, z0: n0.z - CELL + NODE / 2, z1: nz0 }; // the north member's top, at Y
  const far = node(0, 1, 0), fTop = { x0: far[0] - NODE / 2, x1: far[0] + NODE / 2, z0: far[2] - NODE / 2, z1: far[2] + NODE / 2, y: far[1] + NODE / 2 };
  const inR = (R, x, z, m = 0) => x >= R.x0 - m && x <= R.x1 + m && z >= R.z0 - m && z <= R.z1 + m;
  const floor = (x, z) => {
    if (inR(A, x, z) || inR(B, x, z)) return yd;
    if (inR(fTop, x, z)) return fTop.y;
    if (inR(sTop, x, z)) return Y;
    return null;
  };
  ctx.addWalkable(floor, { stack: true, name: 'stair-top', keep: (x, z) => (inR(A, x, z, 0.9) || inR(B, x, z, 0.9)) && !inR(sTop, x, z) });
  // the foot node and the members that rise from it and from the far node: walls to the sky
  const wall = (x0, z0, x1, z1) => ctx.addCollider({ x1: x0, z1: z0, x2: x1, z2: z1, r: 0.12 });
  wall(nx0, nz0, nx1, nz0); wall(nx1, nz0, nx1, n0.z + NODE / 2); wall(nx1, n0.z + NODE / 2, nx0, n0.z + NODE / 2); wall(nx0, n0.z + NODE / 2, nx0, nz0);
  ctx.addCollider({ x: far[0], z: far[2], r: TH * 0.7 });
  // the cot, the stove, the oil can, the chair: low things on the deck
  for (const [x, z, r, h] of [[lx0 + 0.55, cz - 1.8, 0.5, 0.4], [sx, sz, 0.38, 1.0], [A.x0 + 0.7, A.z0 + 1.2, 0.52, 1.5], [A.x0 + 1.4, A.z1 - 1.1, 0.34, 1.6]]) ctx.addCollider({ x, z, r, y: yd, h, stand: false });

  const tris = (latGeo.attributes.position.count + homeGeo.attributes.position.count + lampGeo.attributes.position.count) / 3 + W.length / 6;
  return {
    update, calls: 5, tris, lattice, home, lamp: L, deck: { A, B, y: yd }, member: sTop, far: fTop, n0,
    // the walk on from the landing: the deck, round the node, out along the member to the far node
    path: [[(A.x0 + A.x1) / 2, cz, yd], [(B.x0 + B.x1) / 2 + 0.6, (B.z0 + B.z1) / 2, yd], [n0.x, sTop.z1 - 6, Y], [n0.x, (sTop.z0 + sTop.z1) / 2, Y], [n0.x, sTop.z0 + 2, Y]],
  };
}
