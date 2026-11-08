// The Great Span's fallen bays (v4, W): each collapsed bay's crown broken into bay-sized pieces, cut from the arch
// as it stood so the triangles run on across them, and laid where plan.js SLABS puts them: across the old Span's
// hollow and in the tarn's south bay's shallows, half sunk in the fen's south reach, on the canyon's north rim
// (never in the river); one leans against pier -70. Rubble aprons at the piers' feet. The crack at x -45 is the
// one gap a running hop clears: its broken faces collide below the lip.
import * as THREE from 'three';
import { SPAN, SLABS, intrados } from './plan.js';
import { extrudeXY } from './geo.js';

const Y = SPAN.deckY, Z = SPAN.z, Z0 = SPAN.z0, Z1 = SPAN.z1;

export function buildFallen(K) {
  const { ctx, hi, rng, jit, H, addCol, body, ragged, addRubble, rubble } = K;
  const terrain = ctx.terrain, bays = K.bays, P = SPAN.piers;
  // the crack's two broken faces, below the lip (a hop that lands short still catches the deck)
  { const c0 = SPAN.crack.x - SPAN.crack.w / 2, c1 = SPAN.crack.x + SPAN.crack.w / 2;
    for (let z = Z - SPAN.inner; z <= Z + SPAN.inner + 0.01; z += 1.2) { addCol({ x: c0 - 1.0, z, r: 1.0, y: SPAN.apexY - 8, h: Y - 1.5 - (SPAN.apexY - 8) }); addCol({ x: c1 + 1.0, z, r: 1.0, y: SPAN.apexY - 8, h: Y - 1.5 - (SPAN.apexY - 8) }); } }
  // ---------------------------------------------------------------- the fallen pieces
  // Each collapsed bay's crown, broken into bay-sized pieces (cut from the arch as it stood, so the triangles
  // run on across them) and laid where the plan puts them (span/plan.js SLABS): in the hollow and the tarn's
  // south bay's shallows, half sunk in the fen, on the canyon's north rim. One leans against pier -70.
  const fallenBays = bays.filter((b) => b.kind === 'fallen');
  const pieceCounts = [5, 3, 3];
  const slabInfo = [];
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
  for (const sl of SLABS) {
    const B = fallenBays[sl.bay].A, k = pieceCounts[sl.bay];
    const xs0 = B.fl + 5, xs1 = B.fr - 5, w = (xs1 - xs0) / k;
    const u0 = xs0 + w * sl.piece + jit(0.6), u1 = xs0 + w * (sl.piece + 1) + jit(0.6);
    // the piece's outline: the intrados beneath, the deck (ragged) above, broken sides
    const pts = [];
    const nb = 6;
    for (let i = 0; i <= nb; i++) { const x = u0 + (u1 - u0) * (i / nb); pts.push([x, intrados(B, x) + (i === 0 || i === nb ? jit(0.5) : 0)]); }
    const yTop = Y - rng() * 1.5;
    pts.push(...ragged(u1, intrados(B, u1), u1 + jit(0.8), yTop, 4, 0.9, 1, -1e9).map(([x, y]) => [x, y]));
    pts.push([u1 + jit(0.6), yTop], [u0 + jit(0.6), yTop + jit(0.5)]);
    pts.push(...ragged(u0, yTop, u0, intrados(B, u0), 4, 0.9, 1, -1e9));
    const depth = sl.bay === 0 && sl.piece === 2 ? 9 : 16;
    let g = extrudeXY(pts, Z0, Z0 + depth);
    // to the piece's own frame: its centre at the origin
    g.computeBoundingBox();
    const bb = g.boundingBox, cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2, cz = (bb.min.z + bb.max.z) / 2;
    g.translate(-cx, -cy, -cz);
    let x = sl.x, z = sl.z;
    if (sl.bay === 2) for (let t = 0; t < 8 && (terrain.waterLevelAt(x, z) !== null); t++) z -= 4; // never in the river
    if (sl.bay === 0 && !sl.lean) for (let t = 0; t < 8; t++) { const wl = terrain.waterLevelAt(x, z); if (wl === null || wl - H(x, z) < 1.4) break; z += 3; } // shallows only
    if (sl.lean) {
      // leaning on its end against the pier's west face: its far edge touches the face high up
      const hgt = bb.max.y - bb.min.y, phi = 0.42;
      _e.set(0, 0, -phi, 'YXZ'); _q.setFromEuler(_e);
      g.applyMatrix4(_m.compose(_v.set(0, 0, 0), _q, _s));
      g.computeBoundingBox();
      const b2 = g.boundingBox, gy = H(sl.lean - 6, z);
      g.translate(sl.lean - b2.max.x - 0.2, gy - b2.min.y - 1.2, z - (b2.min.z + b2.max.z) / 2);
      x = sl.lean - (b2.max.x - b2.min.x) / 2; void hgt;
    } else {
      _e.set(sl.tilt, sl.yaw, sl.roll, 'YXZ'); _q.setFromEuler(_e);
      g.applyMatrix4(_m.compose(_v.set(0, 0, 0), _q, _s));
      g.computeBoundingBox();
      const b2 = g.boundingBox, gy = Math.min(H(x, z), H(x + 5, z), H(x - 5, z), H(x, z + 5), H(x, z - 5));
      g.translate(x, gy - b2.min.y - (b2.max.y - b2.min.y) * sl.sink, z);
    }
    g.computeBoundingBox();
    const b3 = g.boundingBox;
    body.push(g);
    // colliders: a row of circles along its longer side on the ground
    const lx = b3.max.x - b3.min.x, lz = b3.max.z - b3.min.z, long = Math.max(lx, lz), short = Math.min(lx, lz);
    const nC = Math.max(1, Math.round(long / short)), rr = Math.min(short, long / nC) * 0.42;
    for (let i = 0; i < nC; i++) {
      const t = (i + 0.5) / nC;
      const ccx = lx >= lz ? b3.min.x + lx * t : (b3.min.x + b3.max.x) / 2, ccz = lx >= lz ? (b3.min.z + b3.max.z) / 2 : b3.min.z + lz * t;
      addCol({ x: ccx, z: ccz, r: rr, y: b3.min.y - 2, h: b3.max.y - b3.min.y + 2 });
    }
    slabInfo.push({ bay: sl.bay, x: +((b3.min.x + b3.max.x) / 2).toFixed(1), z: +((b3.min.z + b3.max.z) / 2).toFixed(1), top: +b3.max.y.toFixed(1), water: terrain.waterLevelAt(x, z) !== null });
  }
  // rubble aprons at the piers' feet and round the fallen pieces
  const nPier = hi ? 12 : 6;
  for (let i = 0; i < P.length; i++) for (let k = 0; k < nPier; k++) {
    const ang = rng() * 6.283, d = 8.5 + rng() * rng() * 9;
    const x = P[i] + Math.cos(ang) * d * 0.9, z = Z + Math.sin(ang) * d * 1.4;
    if (Math.abs(x) > 250) continue;
    addRubble(x, z, 1.2 + rng() * rng() * 3.6);
  }
  for (const s of slabInfo) for (let k = 0; k < (hi ? 7 : 4); k++) { const ang = rng() * 6.283, d = 5 + rng() * 8; addRubble(s.x + Math.cos(ang) * d, s.z + Math.sin(ang) * d, 0.9 + rng() * 2.4); }
  for (const rb of rubble) if (rb.sx > 2.2 && Math.abs(rb.z - Z) > 9) addCol({ x: rb.x, z: rb.z, r: Math.min(rb.sx, rb.sz) * 0.45, y: rb.y - 1, h: rb.sy * 0.5 + 1 });
  K.slabInfo = slabInfo;
}
