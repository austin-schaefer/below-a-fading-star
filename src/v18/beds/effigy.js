// The six tombs of the Lower Beds and their lids (v18-F3): each lid a full effigy of one of the plan's LIKENESSES, in
// worn pale stone, the prop made big enough to name from the aisle (the fan, the sword, the hoop, the cup, the two
// hands, the bird). Every lid is cracked across where a root came down into it: the lid in two, the foot half sunk
// and tipped, the effigy split with it, and the gap dark. stories/the-graffer.md, beat 3.
//   tomb(B, kind, cx, y, cz, side) -> { root: [x, y, z] } the point in the crack the root goes into
//   (side: +1 when the aisle is to the east, -1 to the west; the prop and the root keep to the side away from it)
import * as THREE from 'three';

const C = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const SHADE = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
export const STONE = C('#a29785'), STONE_W = C('#8d8372'), PROP = C('#b8ad98'), CHEST = C('#6f6858'), PLINTH = C('#5c564a'), DARK = C('#14100d'), PANEL = C('#5d574a');
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

// a frame on the lid: u across (+x), v along toward the feet (+z; the head is to the north), y up from the lid's top
function frame(B, cx, y0, cz, drop, vc) {
  const at = (u, h, v) => [cx + u, y0 + h - (v > vc ? drop : 0), cz + v];
  const put = (g, u, h, v, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, col = STONE, jit = 0.06) => {
    _p.set(...at(u, h, v)); _q.setFromEuler(_e.set(rx, ry, rz)); _s.set(sx, sy, sz);
    B.geo(g, _m.compose(_p, _q, _s), col, jit);
  };
  return { at, put };
}
const sphere = (r, w = 10, h = 7) => new THREE.SphereGeometry(r, w, h);
const cyl = (r0, r1, l, n = 8) => new THREE.CylinderGeometry(r0, r1, l, n);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);

// a lying figure: head on a cushion at v -0.7*k, body to the feet at +0.8*k; `wide` for the magnate's girth
function figure(F, u0, k, { wide = 1, gown = false, tilt = 0, armour = false } = {}) {
  const { put } = F;
  put(box(0.5 * k, 0.1 * k, 0.3 * k), u0, 0.05 * k, -0.74 * k, 0, 0, 0, 1, 1, 1, STONE_W);                       // the cushion
  put(sphere(0.12 * k), u0 + tilt * 0.06, 0.21 * k, -0.7 * k, 0, 0, tilt * 0.4, 1, 1, 1.12);                       // the head
  if (armour) put(cyl(0.02 * k, 0.125 * k, 0.12 * k, 8), u0, 0.34 * k, -0.7 * k);                                   // a peaked helm
  put(cyl(0.05 * k, 0.06 * k, 0.12 * k, 6), u0, 0.18 * k, -0.57 * k, Math.PI / 2);                                  // the neck
  put(box(0.44 * k * wide, 0.2 * k, 0.6 * k), u0, 0.1 * k + 0.003, -0.24 * k);                                      // the torso
  if (wide > 1.1) put(sphere(0.3 * k, 12, 8), u0, 0.2 * k, -0.12 * k, 0, 0, 0, 0.95, 0.55, 1.05);                  // the belly
  // the legs, or a gown to the feet: a flattened cone lying along v
  put(cyl((gown ? 0.27 : 0.13) * k * Math.min(wide, 1.15), (gown ? 0.3 : 0.21) * k * Math.min(wide, 1.15), 0.92 * k, 10), u0, 0.085 * k, 0.4 * k, Math.PI / 2, 0, 0, 1, 1, 0.5);
  for (const s of [-1, 1]) put(box(0.08 * k, 0.12 * k, 0.1 * k), u0 + s * 0.07 * k, 0.12 * k, 0.86 * k, -0.25);      // the feet, up
}
// an arm from the shoulder (side s) to a hand at (u, h, v): two capsules
function arm(F, u0, k, s, hand, elbow) {
  const { at, put } = F, sh = [u0 + s * 0.24 * k, 0.17 * k, -0.48 * k];
  const seg = (a, b, r) => {
    const A = at(...a), Bp = at(...b), d = new THREE.Vector3(Bp[0] - A[0], Bp[1] - A[1], Bp[2] - A[2]), l = d.length();
    _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    _p.set((A[0] + Bp[0]) / 2, (A[1] + Bp[1]) / 2, (A[2] + Bp[2]) / 2);
    F.B.geo(new THREE.CylinderGeometry(r, r * 0.9, l, 6), _m.compose(_p, _q, _s.set(1, 1, 1)), STONE, 0.05);
  };
  seg(sh, elbow, 0.055 * k); seg(elbow, hand, 0.048 * k);
  put(sphere(0.055 * k, 6, 5), hand[0], hand[1], hand[2]);
}

export function tomb(B, kind, cx, y, cz, side) {
  const wide = kind === 'pair' ? 1.5 : 1.1, len = kind === 'hoop' ? 1.7 : 2.15, hx = wide / 2, hz = len / 2;
  // the plinth, the chest (its top dark: seen only through the crack), panels on its long sides, the lid in two
  B.box(cx, y + 0.05 + 0.003, cz, hx + 0.08, 0.05, hz + 0.08, 0, PLINTH, PLINTH, 0.08);
  B.box(cx, y + 0.1 + 0.345 + 0.006, cz, hx, 0.345, hz, 0, CHEST, DARK, 0.08);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const z0 = cz - hz + 0.15 + i * (len - 0.3) / 3, z1 = z0 + (len - 0.3) / 3 - 0.12, x = cx + s * (hx + 0.012);
    B.quad([x, y + 0.24, z0], [x, y + 0.24, z1], [x, y + 0.66, z1], [x, y + 0.66, z0], PANEL, [s, 0, 0], 0.05);
  }
  const top = y + 0.8 + 0.01, lid = 0.12, vc = kind === 'hoop' ? 0.05 : 0.16, drop = 0.045, gap = 0.035;
  // the head half, level; the foot half sunk and tipped toward the crack
  B.box(cx, top + lid / 2, cz + (-(hz + 0.05) + vc - gap / 2) / 2, hx + 0.05, lid / 2, (hz + 0.05 + vc - gap / 2) / 2, 0, STONE_W, STONE_W, 0.07);
  {
    const zc = cz + (vc + gap / 2 + hz + 0.05) / 2, half = (hz + 0.05 - vc - gap / 2) / 2;
    _p.set(cx, top + lid / 2 - drop + 0.012, zc); _q.setFromEuler(_e.set(-0.035, 0, 0.012 * side));
    B.geo(box(wide + 0.1, lid, half * 2), _m.compose(_p, _q, _s.set(1, 1, 1)), STONE_W, 0.07);
  }
  const y0 = top + lid + 0.004, F = { ...frame(B, cx, y0, cz, drop, vc), B };
  const far = -side; // the side away from the aisle: the prop and the root keep to it, the face to the aisle
  if (kind === 'fan') {
    figure(F, 0, 1, { gown: true, tilt: side * 0.4 });
    arm(F, 0, 1, far, [far * 0.04, 0.32, -0.36], [far * 0.2, 0.26, -0.3]);
    arm(F, 0, 1, -far, [far * 0.02, 0.3, -0.34], [-far * 0.17, 0.25, -0.26]);
    // the fan, open and held high over the breast: twelve pleats in the plane along the body, a half disc 0.42 across
    const pv = [far * 0.03, 0.34, -0.35], n = 12, R = 0.42, P0 = F.at(...pv);
    for (let i = 0; i < n; i++) {
      const a0 = Math.PI * (0.03 + 0.94 * i / n), a1 = Math.PI * (0.03 + 0.94 * (i + 1) / n), col = i % 2 ? PROP : SHADE(PROP, 0.84);
      const p = (a, r) => [P0[0] + (i % 2 ? 0.012 : -0.012) * (r / R), P0[1] + Math.sin(a) * r, P0[2] - Math.cos(a) * r];
      for (const s of [-1, 1]) B.tri([P0[0] + s * 0.006, P0[1], P0[2]], p(a0, R), p(a1, R), col, [s, 0, 0], 0.04);
    }
    F.put(cyl(0.02, 0.02, 0.06, 6), pv[0], pv[1], pv[2], 0, 0, Math.PI / 2, 1, 1, 1, PROP);
  } else if (kind === 'sword') {
    figure(F, 0, 1, { armour: true, tilt: side * 0.3 });
    // the sword down the body, point to the feet: grip and both hands at the breast, a broad guard, the blade raised
    const u = 0, h = 0.27;
    F.put(box(0.1, 0.035, 0.98), u, h, 0.24, 0, 0, 0, 1, 1, 1, PROP);                       // the blade
    F.put(box(0.03, 0.05, 0.9), u, h + 0.03, 0.22, 0, 0, 0, 1, 1, 1, STONE_W);             // its fuller's ridge
    F.put(box(0.46, 0.06, 0.06), u, h + 0.01, -0.27, 0, 0, 0, 1, 1, 1, PROP);               // the guard
    F.put(cyl(0.03, 0.03, 0.2, 6), u, h + 0.01, -0.39, Math.PI / 2, 0, 0, 1, 1, 1, PROP);   // the grip
    F.put(sphere(0.055, 8, 6), u, h + 0.01, -0.51, 0, 0, 0, 1, 1, 1, PROP);                 // the pommel
    arm(F, 0, 1, -1, [-0.03, h + 0.05, -0.36], [-0.22, 0.22, -0.3]);
    arm(F, 0, 1, 1, [0.03, h + 0.05, -0.42], [0.22, 0.22, -0.34]);
  } else if (kind === 'hoop') {
    const k = 0.66, u0 = side * 0.12;
    figure(F, u0, k, { tilt: side * 0.5 });
    // the hoop on its edge on the far side, as tall as the child is long, the near hand reaching across to it
    const R = 0.5, uh = far * 0.33, P = F.at(uh, R + 0.02, -0.02);
    _p.set(...P); _q.setFromEuler(_e.set(0, Math.PI / 2, 0));
    B.geo(new THREE.TorusGeometry(R, 0.035, 6, 30), _m.compose(_p, _q, _s.set(1, 1, 1)), PROP, 0.04);
    F.put(box(0.05, 0.04, 0.16), uh, 0.02, -0.02, 0, 0, 0, 1, 1, 1, STONE_W);              // the block it stands in
    arm(F, u0, k, far, [uh - far * 0.03, 0.2, -0.12], [u0 + far * 0.2, 0.16, -0.24]);
    arm(F, u0, k, -far, [u0 + 0.02 * far, 0.17, -0.12], [u0 - far * 0.14, 0.13, -0.2]);
  } else if (kind === 'cup') {
    figure(F, 0, 1, { wide: 1.4, tilt: side * 0.3 });
    // the cup raised: the far forearm up from the belly, a broad goblet held high
    const hand = [far * 0.12, 0.62, -0.3];
    arm(F, 0, 1, far, hand, [far * 0.3, 0.32, -0.28]);
    arm(F, 0, 1, -far, [far * 0.02, 0.38, -0.18], [-far * 0.26, 0.26, -0.22]);
    const prof = [[0, 0], [0.09, 0], [0.09, 0.015], [0.02, 0.03], [0.018, 0.12], [0.04, 0.14], [0.12, 0.2], [0.135, 0.3], [0.125, 0.305], [0.11, 0.21], [0, 0.17]];
    F.put(new THREE.LatheGeometry(prof.map(([r, yy]) => new THREE.Vector2(r, yy)), 14), hand[0], hand[1] - 0.04, hand[2], 0, 0, 0, 1, 1, 1, PROP);
  } else if (kind === 'pair') {
    // two on one lid, heads together, the inner hands clasped between them
    for (const s of [-1, 1]) {
      figure(F, s * 0.33, 0.95, { gown: s === far, tilt: -s * 0.9 });
      arm(F, s * 0.33, 0.95, -s, [s * 0.04, 0.5, -0.22], [s * 0.2, 0.32, -0.3]);
      arm(F, s * 0.33, 0.95, s, [s * 0.3, 0.24, -0.2], [s * 0.5, 0.16, -0.32]);
    }
    F.put(sphere(0.085, 8, 6), 0, 0.53, -0.22, 0, 0, 0, 1.2, 1.1, 1, PROP);                 // the clasped hands, raised between them
  } else if (kind === 'hawk') {
    figure(F, 0, 1, { tilt: side * 0.3 });
    // the falconer's far arm raised, the gauntleted fist high over the breast, the bird on it, upright
    const fist = [far * 0.14, 0.6, -0.36];
    arm(F, 0, 1, far, fist, [far * 0.32, 0.3, -0.36]);
    arm(F, 0, 1, -far, [far * 0.0, 0.29, -0.2], [-far * 0.24, 0.22, -0.28]);
    F.put(cyl(0.07, 0.06, 0.14, 7), fist[0], fist[1] - 0.04, fist[2], 0, 0, 0, 1, 1, 1, PROP);          // the gauntlet
    F.put(sphere(0.1, 10, 8), fist[0], fist[1] + 0.17, fist[2] + 0.01, 0.25, 0, 0, 0.85, 1.45, 0.95, PROP); // the bird's body
    // its head turned over its shoulder toward the aisle, the hooked beak in profile; a long fanned tail down past the fist
    const hx = fist[0] - far * 0.05, hb = fist[1] + 0.34, hz = fist[2] + 0.0;
    F.put(sphere(0.066, 8, 6), hx, hb, hz, 0, 0, 0, 1, 1, 1.15, PROP);                                   // its head
    F.put(new THREE.ConeGeometry(0.026, 0.09, 5), hx - far * 0.075, hb - 0.015, hz, 0, 0, far * 1.9, 1, 1, 1, STONE_W); // the hooked beak, turned
    F.put(box(0.03, 0.04, 0.05), hx - far * 0.02, hb + 0.05, hz, 0, 0, 0, 1, 1, 1, PROP);                // the crest
    for (const t of [-0.25, 0, 0.25]) F.put(box(0.04, 0.3, 0.022), fist[0] + t * 0.12, fist[1] - 0.08, fist[2] + 0.12, 0.5, 0, t, 1, 1, 1, STONE_W); // the tail, fanned
    for (const s of [-1, 1]) F.put(box(0.025, 0.2, 0.13), fist[0] + s * 0.085, fist[1] + 0.17, fist[2] + 0.03, 0.2, 0, s * 0.12, 1, 1, 1, STONE_W); // the folded wings
  }
  // the crack across the lid where the root went in: on the far side, between the figure and the lid's edge
  const ru = far * (hx - 0.12);
  return { root: F.at(ru, -0.05, vc), vc };
}
