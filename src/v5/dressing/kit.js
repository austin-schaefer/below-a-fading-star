// A tiny accumulator for the three set-dressings: boxes, cylinders and lathes placed by matrix, each part painted one
// colour (with a little per-part jitter), merged into one non-indexed BufferGeometry with vertex colours. Nothing here
// draws; the parts own one mesh each.
import * as THREE from 'three';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
export const mat = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => _m.clone().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(s, s, s));

export class Acc {
  constructor(rng) { this.pos = []; this.nor = []; this.col = []; this.uv = []; this.rng = rng; }
  get count() { return this.pos.length / 3; }
  // geo: any three geometry; m: its placement; color: a THREE.Color or hex; jitter: 0..1 per-part lightness spread
  add(geo, m, color, jitter = 0.08) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone());
    g.applyMatrix4(m);
    const c = new THREE.Color(color), k = 1 + (this.rng() - 0.5) * 2 * jitter;
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      this.pos.push(p.getX(i), p.getY(i), p.getZ(i)); this.nor.push(n.getX(i), n.getY(i), n.getZ(i));
      this.col.push(c.r * k, c.g * k, c.b * k); this.uv.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
    }
    g.dispose();
  }
  box(w, h, d, m, color, jitter) { this.add(new THREE.BoxGeometry(w, h, d), m, color, jitter); }
  // lowest and highest y among vertices from index `from` on
  yRange(from) { let lo = Infinity, hi = -Infinity; for (let i = from * 3 + 1; i < this.pos.length; i += 3) { lo = Math.min(lo, this.pos[i]); hi = Math.max(hi, this.pos[i]); } return [lo, hi]; }
  shift(from, dy) { for (let i = from * 3 + 1; i < this.pos.length; i += 3) this.pos[i] += dy; }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}
