// The Diffident Stair's stub (v12-H3): the seven steps that always stand, on the foot of the east wall. Heliarch
// ashlar under each tread down into the turf (the treads themselves are the stair's instanced ones), and at the top
// two posts that carry the sign of the sun in its notch, an ember glass in each disc, the way into the air between
// them. What says "climb me" from the Nave and the road: steps to nowhere, a gate on the sky, and a line of the same
// slabs lying in the grass running west from its foot. One mesh; colliders along its sides so nobody walks into the
// masonry from the turf (their tops under the treads, so a walker on the steps is not touched).
import * as THREE from 'three';
import { paint, slab, finish, slabMaterial, DARK, BRONZE, POLISH, EMBER } from './treads.js';

export function buildStub(ctx, P, stub) {
  const T = ctx.terrain, rng = ctx.makeRng(12311);
  const parts = [];
  const e0 = stub[0], ux = e0.ux, uz = e0.uz;
  // the local frame of the stub: x the walker's left, z up the stair, origin at the lowest tread's centre, its top y
  const X = new THREE.Vector3(uz, 0, -ux), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(ux, 0, uz);
  const frame = new THREE.Matrix4().makeBasis(X, Y, Z);
  const place = (g, e, dy = 0) => { g.applyMatrix4(new THREE.Matrix4().makeTranslation(0, dy, 0)); g.applyMatrix4(frame); g.translate(e.cx, e.y, e.cz); return g; };
  let lowest = Infinity;
  for (const e of stub) {
    // the course under the tread: from its underside into the turf, a little narrower than the tread
    const g0 = Math.min(T.heightAt(e.cx + X.x * e.hw, e.cz + X.z * e.hw), T.heightAt(e.cx - X.x * e.hw, e.cz - X.z * e.hw), T.heightAt(e.cx, e.cz)) - 0.5;
    lowest = Math.min(lowest, g0);
    const h = e.y - 0.28 - g0;
    if (h > 0.05) {
      const b = slab(e.hw * 2 - 0.1, e.hd * 2 + 0.002, h, 0, rng);
      // courses: darken a band every 0.55 m, as joints
      const p = b.attributes.position, c = b.attributes.color;
      for (let i = 0; i < p.count; i++) { const yy = p.getY(i); const k = Math.abs(((-yy) % 0.55) - 0.275) < 0.02 ? 0.55 : 1; c.setXYZ(i, c.getX(i) * k * 0.9, c.getY(i) * k * 0.9, c.getZ(i) * k * 0.92); }
      parts.push(place(b, e, -0.28));
    }
  }
  // the cheek walls: a course of ashlar either side of the steps, its top stepping up with them 0.7 m over the treads
  const CH = 0.7, CW = 0.42;
  for (const e of stub) for (const s of [-1, 1]) {
    const g0 = T.heightAt(e.cx + X.x * s * (e.hw + CW / 2), e.cz + X.z * s * (e.hw + CW / 2)) - 0.4;
    const h = e.y + CH - g0;
    const b = slab(CW, e.hd * 2 + 0.004, h, 0, rng); b.translate(s * (e.hw + CW / 2), CH, 0);
    parts.push(place(b, e));
    const cap = slab(CW + 0.08, e.hd * 2 + 0.03, 0.1, 0, rng); cap.translate(s * (e.hw + CW / 2), CH + 0.1, 0);
    parts.push(place(cap, e));
  }
  // the posts on the cheek walls at the top: 7.5 m of ashlar shaft, a notched head, a bronze disc with an ember glass
  const top = stub[stub.length - 1];
  const H = 7.5, PX = top.hw + CW / 2;
  for (const s of [-1, 1]) {
    const sx = s * PX;
    const plinth = slab(0.78, 0.78, 1.3, 0, rng); plinth.translate(sx, CH + 1.3, 0);
    parts.push(place(plinth, top));
    const post = slab(0.5, 0.5, H - 1.3, 0, rng); post.translate(sx, H, 0);
    parts.push(place(post, top));
    for (let k = 1; k < 6; k++) { const band = slab(0.56, 0.56, 0.06, 0, rng); band.translate(sx, CH + 1.3 + k * (H - 2.2) / 6, 0); parts.push(place(band, top)); }
    // the head: two blocks leaning apart (the notch), the disc seated between them
    for (const k of [-1, 1]) {
      const h = paint(new THREE.BoxGeometry(0.34, 1.0, 0.44), DARK);
      h.rotateZ(-k * 0.5); h.translate(sx + k * 0.34, H + CH + 0.45, 0);
      parts.push(place(h, top));
    }
    const disc = paint(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 24), BRONZE); disc.rotateX(Math.PI / 2); disc.translate(sx, H + CH + 0.62, 0);
    parts.push(place(disc, top));
    for (const fz of [-0.065, 0.065]) {
      const glass = paint(new THREE.CircleGeometry(0.3, 18), EMBER, 0.9);
      if (fz < 0) glass.rotateY(Math.PI);
      glass.translate(sx, H + CH + 0.62, fz);
      parts.push(place(glass, top));
    }
    const ring = paint(new THREE.TorusGeometry(0.55, 0.05, 5, 24), POLISH); ring.translate(sx, H + CH + 0.62, 0);
    parts.push(place(ring, top));
  }
  const geo = finish(parts);
  const mesh = new THREE.Mesh(geo, slabMaterial(false));
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'stair-stub';
  ctx.scene.add(mesh);
  // colliders: the cheek walls (their tops 0.7 m over the treads) and the west face (0.35 m under the top tread)
  const a = stub[0], b = top, out = top.hw + CW / 2;
  for (const s of [-1, 1]) {
    const x1 = a.cx + X.x * s * out, z1 = a.cz + X.z * s * out, x2 = b.cx + X.x * s * out, z2 = b.cz + X.z * s * out;
    ctx.addCollider({ x1, z1, x2, z2, r: CW / 2, y: lowest, h: a.y + CH - lowest, dh: b.y - a.y, stand: false });
  }
  const fx = b.cx + Z.x * (b.hd + 0.12), fz = b.cz + Z.z * (b.hd + 0.12);
  ctx.addCollider({ x1: fx + X.x * b.hw, z1: fz + X.z * b.hw, x2: fx - X.x * b.hw, z2: fz - X.z * b.hw, r: 0.12, y: lowest, h: b.y - 0.35 - lowest, stand: false });
  // the posts: columns to the sky
  for (const s of [-1, 1]) ctx.addCollider({ x: b.cx + X.x * s * PX, z: b.cz + X.z * s * PX, r: 0.45, stair: true });
  return { mesh, calls: 1, tris: geo.attributes.position.count / 3, posts: H + CH };
}
