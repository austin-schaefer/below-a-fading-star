// Colossal-scale helpers (v4 kit). Every vast thing needs a measure (IDEAS-v4, the rules of awe): a figure,
// a tread, a rook, so the eye does not read it as a model.
//  - measureFigures(ctx, spots, opts): robed figures 1.8 m tall standing at the given spots, one instanced mesh.
//    A dark silhouette, no face, no feet; read only as a person's height against the work. spots: [{x, z, y?, yaw?}].
//  - rookWheel(ctx, opts): rooks wheeling at mid-height round a tall thing (BM, the Rook-Wheel). One instanced
//    mesh, posed on the CPU into preallocated matrices; it holds still out of sight (throttled to 4 Hz past
//    200 m). opts: x, z, y (centre of the wheel), r 30, count 14, speed 0.25 (rad/s), spread 12 (m, height).
//    Returns { mesh, scatter() } (scatter: the birds break outward for a few seconds, e.g. at a gutter).
//  - SCALE: sizes the briefs name, in metres, for a module laying out a wonder against them.
import * as THREE from 'three';
import { mergeGeometries } from './merge.js';

export const SCALE = { person: 1.8, tread: 0.32, door: 3.2, rook: 0.45, rookSpan: 0.95 };

// v7.1 cut every use in the world at Austin's note ("too much random noise"); only kit/demo.js still calls it.
export function measureFigures(ctx, spots, opts = {}) {
  const T = THREE;
  const h = opts.height ?? SCALE.person;
  // a robe (a lathe of a hooded cloak's profile) and a hood; no feet
  const prof = [[0.0, 0], [0.27, 0], [0.25, 0.4], [0.2, 0.95], [0.17, 1.3], [0.2, 1.42], [0.0, 1.46]].map(([r, y]) => new T.Vector2(r * h / 1.8, y * h / 1.8));
  const robe = new T.LatheGeometry(prof, 9);
  const hood = new T.SphereGeometry(0.13 * h / 1.8, 8, 6); hood.scale(1, 1.25, 1.1); hood.translate(0, 1.58 * h / 1.8, 0.02);
  const geo = mergeGeometries([robe.toNonIndexed(), hood.toNonIndexed()]);
  const mat = new T.MeshStandardMaterial({ color: opts.color || '#1d1a1c', roughness: 0.95 });
  const mesh = new T.InstancedMesh(geo, mat, spots.length);
  const m = new T.Matrix4(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), p = new T.Vector3(), one = new T.Vector3(1, 1, 1);
  spots.forEach((s, i) => {
    p.set(s.x, s.y ?? ctx.terrain.heightAt(s.x, s.z), s.z);
    q.setFromAxisAngle(up, s.yaw ?? 0);
    mesh.setMatrixAt(i, m.compose(p, q, one));
  });
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = opts.name || 'kit-measure-figures';
  mesh.computeBoundingSphere();
  return mesh;
}

export function rookWheel(ctx, o = {}) {
  const T = THREE;
  const n = o.count ?? 14, R = o.r ?? 30, cy = o.y ?? 40, spread = o.spread ?? 12, speed = o.speed ?? 0.25;
  const rng = ctx.makeRng(o.seed ?? 7301);
  // a rook: a body and two wings, flat triangles; the flap is the wings' scale about the body
  const s = SCALE.rookSpan / 2;
  const pos = new Float32Array([
    0, 0, -0.22, -0.05, 0, 0.2, 0.05, 0, 0.2,          // body
    0, 0, -0.08, -s, 0.02, 0.05, 0, 0, 0.12,            // left wing
    0, 0, -0.08, 0, 0, 0.12, s, 0.02, 0.05,             // right wing
  ]);
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.computeVertexNormals();
  const mat = new T.MeshBasicMaterial({ color: '#0b0909', side: T.DoubleSide });
  const mesh = new T.InstancedMesh(geo, mat, n);
  mesh.frustumCulled = false; mesh.name = o.name || 'kit-rook-wheel';
  const birds = Array.from({ length: n }, () => ({ a: rng() * Math.PI * 2, r: R * (0.6 + 0.6 * rng()), y: cy + (rng() - 0.5) * spread, w: speed * (0.8 + 0.4 * rng()), ph: rng() * 6.28, bob: rng() * 6.28 }));
  const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), sc = new T.Vector3();
  let scatterT = 0;
  function update(dt, t) {
    scatterT = Math.max(0, scatterT - dt);
    const out = 1 + 1.6 * Math.sin(Math.min(1, scatterT / 4) * Math.PI);
    for (let i = 0; i < n; i++) {
      const b = birds[i];
      b.a += b.w * dt * (scatterT > 0 ? 1.8 : 1);
      const rr = b.r * out;
      p.set(o.x + Math.cos(b.a) * rr, b.y + Math.sin(t * 0.3 + b.bob) * 2.5 + (out - 1) * 6, o.z + Math.sin(b.a) * rr);
      e.set(0.25 * Math.sin(t * 0.7 + b.ph), -b.a, -0.35, 'YXZ'); // banking into the turn, heading tangent
      q.setFromEuler(e);
      const flap = 0.55 + 0.45 * Math.sin(t * 7.5 + b.ph);
      sc.set(0.5 + 0.5 * flap, 1, 1); // the wings beat: their span narrows as they rise
      m.compose(p, q, sc);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  ctx.registerUpdate(update, { pos: { x: o.x, z: o.z }, near: 200, hz: 4, r: R });
  return { mesh, update, scatter: () => { scatterT = 4; } };
}
