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
  // the posts at the top tread's sides: 4.2 m of ashlar shaft, a notched head, a bronze disc with an ember glass
  const top = stub[stub.length - 1];
  const H = 4.2;
  for (const s of [-1, 1]) {
    const sx = s * (top.hw + 0.22);
    const post = slab(0.36, 0.36, H + 1.2, 0, rng); post.translate(sx, H, 0);
    parts.push(place(post, top));
    const plinth = slab(0.56, 0.56, 1.0, 0, rng); plinth.translate(sx, 0.2, 0);
    parts.push(place(plinth, top));
    // the head: two blocks leaning apart (the notch), the disc seated between them
    for (const k of [-1, 1]) {
      const h = paint(new THREE.BoxGeometry(0.22, 0.6, 0.3), DARK);
      h.rotateZ(-k * 0.5); h.translate(sx + k * 0.2, H + 0.32, 0);
      parts.push(place(h, top));
    }
    const disc = paint(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 20), BRONZE); disc.rotateX(Math.PI / 2); disc.translate(sx, H + 0.36, 0);
    parts.push(place(disc, top));
    for (const fz of [-0.045, 0.045]) {
      const glass = paint(new THREE.CircleGeometry(0.15, 14), EMBER, 0.55);
      if (fz < 0) glass.rotateY(Math.PI);
      glass.translate(sx, H + 0.36, fz);
      parts.push(place(glass, top));
    }
    const ring = paint(new THREE.TorusGeometry(0.3, 0.035, 5, 20), POLISH); ring.translate(sx, H + 0.36, 0);
    parts.push(place(ring, top));
  }
  const geo = finish(parts);
  const mesh = new THREE.Mesh(geo, slabMaterial(false));
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'stair-stub';
  ctx.scene.add(mesh);
  // colliders: the sides and the west face of the masonry, their tops 0.35 under the treads they run beside
  const a = stub[1], b = top, out = top.hw + 0.12;
  for (const s of [-1, 1]) {
    const x1 = a.cx + X.x * s * out, z1 = a.cz + X.z * s * out, x2 = b.cx + X.x * s * out, z2 = b.cz + X.z * s * out;
    ctx.addCollider({ x1, z1, x2, z2, r: 0.12, y: lowest, h: a.y - 0.35 - lowest, dh: b.y - a.y, stand: false });
  }
  const fx = b.cx + Z.x * (b.hd + 0.12), fz = b.cz + Z.z * (b.hd + 0.12);
  ctx.addCollider({ x1: fx + X.x * b.hw, z1: fz + X.z * b.hw, x2: fx - X.x * b.hw, z2: fz - X.z * b.hw, r: 0.12, y: lowest, h: b.y - 0.35 - lowest, stand: false });
  // the posts: columns to the sky
  for (const s of [-1, 1]) ctx.addCollider({ x: b.cx + X.x * s * (b.hw + 0.22), z: b.cz + X.z * s * (b.hw + 0.22), r: 0.3 });
  return { mesh, calls: 1, tris: geo.attributes.position.count / 3, posts: H };
}
