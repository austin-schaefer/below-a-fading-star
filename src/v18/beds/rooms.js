// The Lower Beds built (v18-F3): the door in the bank and its forecourt, the stair down, the vault of the six tombs,
// the gardener's way under the wood, the round chamber under the glasshouse. Each into an UnderBuilder (v14/under.js)
// handed in by beds.js, which makes the meshes. Numbers: BEDS in src/v18/plan.js; levels: beds/line.js.
//   door(B, T)          the forecourt's flags and wing walls, the door's block and its front, the bronze leaf, the tree
//   stair(B)            the stair from the doorway down west, the landing, the steps north into the vault
//   vault(B)            the barrel-vaulted room and its six tombs -> { roots: [[x, y, z], ...] } where each root goes in
//   way(B)              the way under, shored with glasshouse iron and planks -> { ceil(s) }
//   chamber(B)          the round room, the tubs' undersides, the grate's shaft, the seventh tomb, its lid, the can
import * as THREE from 'three';
import { BEDS, LIKENESSES } from '../plan.js';
import { Y, way as W, stairY, stepsY, DOOR_HALF, DOOR_H } from './line.js';
import { tomb, STONE, DARK } from './effigy.js';

const C = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
const K = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
// the house's pale dressed stone, gone grey-green with the wood's damp; the vault's courses; the gardener's iron and wood
export const COL = {
  face: C('#857d6e'), faceW: C('#6a6356'), moss: C('#39452a'), mossDark: C('#262e1d'), flag: C('#5e584c'), flagW: C('#4c463c'),
  bronze: C('#4d3a22'), verd: C('#41705c'), bark: C('#2a1e18'), barkW: C('#3a2a20'), leaf: C('#5a2e14'), leafB: C('#3e2414'),
  vault: C('#6e6757'), vaultW: C('#5d574a'), rib: C('#7b7363'), floor: C('#4a453b'), earth: C('#2c231a'), earthW: C('#3a2e22'),
  plank: C('#5c4630'), plankW: C('#483624'), iron: C('#2e2420'), paint: C('#3c5546'), rust: C('#5a3220'), black: C('#090807'),
  brass: C('#6a4e30'), brassW: C('#8a6a3a'), chip: C('#c8bfae'), foxfire: C('#9fe8c2'),
};
const { court: CT, block: BK, stair: ST, landing: LA, steps: SP, vault: V, chamber: CH, grate: GR } = BEDS;
const H_STAIR = 2.85; // headroom over a tread on the stair and the steps (a hop lifts the eye to 2.46 m)
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

// an axis-aligned wall of coursed stone, its face at x (facing `nx`) or at z (facing `nz`), from (a0..a1) along it and
// y0..y1, each block its own tone; top(a) may lower its top along it (a wing wall's coping follows the ground)
function coursedX(B, x, nx, z0, z1, y0, y1, col, colB, h = 0.42) {
  for (let y = y0, r = 0; y < y1 - 1e-3; y += h, r++) {
    const ya = y, yb = Math.min(y1, y + h), off = r % 2 ? 0.45 : 0;
    for (let z = z0 - off, i = 0; z < z1 - 1e-3; z += 0.9, i++) {
      const za = Math.max(z0, z), zb = Math.min(z1, z + 0.9); if (zb - za < 1e-3) continue;
      const c = hash(x + za, ya) > 0.5 ? col : colB;
      B.quad([x, ya, za], [x, ya, zb], [x, yb, zb], [x, yb, za], c, [nx, 0, 0], 0.08);
    }
  }
}
function coursedZ(B, z, nz, x0, x1, y0, y1, col, colB, h = 0.42) {
  for (let y = y0, r = 0; y < y1 - 1e-3; y += h, r++) {
    const ya = y, yb = Math.min(y1, y + h), off = r % 2 ? 0.45 : 0;
    for (let x = x0 - off; x < x1 - 1e-3; x += 0.9) {
      const xa = Math.max(x0, x), xb = Math.min(x1, x + 0.9); if (xb - xa < 1e-3) continue;
      const c = hash(xa + z, ya) > 0.5 ? col : colB;
      B.quad([xa, ya, z], [xb, ya, z], [xb, yb, z], [xa, yb, z], c, [0, 0, nz], 0.08);
    }
  }
}
// flags over a rectangle at y (facing up, or down with dn), in a grid of rough stones of two tones
function flags(B, x0, x1, z0, z1, y, col, colB, size = 0.7, dn = false) {
  for (let x = x0; x < x1 - 1e-3; x += size) for (let z = z0; z < z1 - 1e-3; z += size) {
    const xa = x, xb = Math.min(x1, x + size), za = z, zb = Math.min(z1, z + size), c = hash(xa, za) > 0.5 ? col : colB;
    B.quad([xa, y, za], [xb, y, za], [xb, y, zb], [xa, y, zb], c, [0, dn ? -1 : 1, 0], 0.1);
  }
}

// ------------------------------------------------------------------------------------------------ the door
export function door(B, T) {
  const ys = Y.sill, x0 = CT.x0, x1 = CT.x1, top = (x, z) => T.heightAt(x, z);
  // the forecourt's flags, wet leaves drifted against the walls and in at the door
  flags(B, x0, x1, CT.z0, CT.z1, ys, COL.flag, COL.flagW, 0.75);
  // the threshold at its mouth, standing down into the ground there
  B.box(x1 - 0.12, ys - 0.25 + 0.03, 172, 0.15, 0.28, (CT.z1 - CT.z0) / 2 + 0.5, 0, COL.faceW, COL.face, 0.08);
  // the wing walls: rubble, a coping over them that rises with the ground behind, 0.35 m over it all along
  for (const s of [-1, 1]) {
    const zi = s < 0 ? CT.z0 : CT.z1, zo = zi + s * 0.75, n = 8, xs = [];
    for (let k = 0; k <= n; k++) xs.push(x1 + 0.4 - (x1 + 0.4 - x0) * k / n);
    const yt = xs.map((x) => { let g = -Infinity; for (const dx of [-0.35, 0, 0.35]) for (const z of [zi, (zi + zo) / 2, zo, zo + s * 0.3]) g = Math.max(g, top(x + dx, z)); return Math.max(ys + 0.55, g + 0.35); });
    for (let k = 0; k < n; k++) {
      const xa = xs[k], xb = xs[k + 1], ya = yt[k], yb = yt[k + 1], cw = 0.14;
      // the inner face in two courses of rubble under the coping, the outer face down into the bank
      const mid = (ya + yb) / 2 - cw;
      for (const [y0, y1a, y1b, c] of [[ys - 0.02, (ys + mid) / 2, (ys + mid) / 2, hash(xa, s) > 0.5 ? COL.faceW : K(COL.faceW, 0.82)], [(ys + mid) / 2, ya - cw, yb - cw, hash(xb, s + 3) > 0.5 ? K(COL.faceW, 0.9) : K(COL.faceW, 0.75)]]) B.quad([xa, y0, zi], [xb, y0, zi], [xb, y1b, zi], [xa, y1a, zi], c, [0, 0, -s], 0.14);
      B.quad([xa, ys - 0.5, zo], [xb, ys - 0.5, zo], [xb, yb - cw, zo], [xa, ya - cw, zo], K(COL.faceW, 0.7), [0, 0, s], 0.12);
      // the coping: a slab 6 cm proud of both faces, its top mossed
      const zi2 = zi - s * 0.06, zo2 = zo + s * 0.06;
      B.quad([xa, ya - cw, zi2], [xb, yb - cw, zi2], [xb, yb, zi2], [xa, ya, zi2], COL.face, [0, 0, -s], 0.08);
      B.quad([xa, ya - cw, zo2], [xb, yb - cw, zo2], [xb, yb, zo2], [xa, ya, zo2], COL.faceW, [0, 0, s], 0.08);
      B.quad([xa, ya, zi2], [xb, yb, zi2], [xb, yb, zo2], [xa, ya, zo2], hash(xa, 9) > 0.4 ? COL.moss : COL.mossDark, [0, 1, 0], 0.15);
      B.quad([xa, ya - cw, zi2], [xb, yb - cw, zi2], [xb, yb - cw, zi], [xa, ya - cw, zi], COL.faceW, [0, -1, 0], 0.08);
    }
    // its end at the forecourt's mouth
    const xe = xs[0], ye = yt[0];
    B.quad([xe, ys - 0.5, zi - s * 0.06], [xe, ys - 0.5, zo + s * 0.06], [xe, ye, zo + s * 0.06], [xe, ye, zi - s * 0.06], COL.faceW, [1, 0, 0], 0.1);
  }
  // the door's block: two piers either side of the doorway, the mass over it, and its front
  const fx = BEDS.face, bx = BK.x0, yt = BK.top, dh = DOOR_H, zl = 172 - DOOR_HALF, zr = 172 + DOOR_HALF;
  B.box((fx + bx) / 2, (ys - 0.5 + yt) / 2, (BK.z0 + zl) / 2, (fx - bx) / 2, (yt - ys + 0.5) / 2, (zl - BK.z0) / 2, 0, COL.face, COL.moss, 0.07);
  B.box((fx + bx) / 2, (ys - 0.5 + yt) / 2, (zr + BK.z1) / 2, (fx - bx) / 2, (yt - ys + 0.5) / 2, (BK.z1 - zr) / 2, 0, COL.face, COL.moss, 0.07);
  B.box((fx + bx) / 2, (ys + dh + yt) / 2, 172, (fx - bx) / 2, (yt - ys - dh) / 2, DOOR_HALF, 0, COL.face, COL.moss, 0.07);
  // the front: pilasters, the architrave round the door, a cornice, the pediment, a blank cartouche worn smooth
  for (const z of [BK.z0 + 0.35, BK.z1 - 0.35]) { B.box(fx + 0.09, (ys + 0.4 + yt - 0.2) / 2, z, 0.09, (yt - 0.2 - ys - 0.4) / 2, 0.28, 0, COL.face, COL.faceW, 0.06); B.box(fx + 0.14, ys + 0.2, z, 0.14, 0.2, 0.36, 0, COL.faceW, COL.faceW, 0.06); }
  for (const z of [zl - 0.14, zr + 0.14]) B.box(fx + 0.06, ys + dh / 2, z, 0.06, dh / 2, 0.14, 0, COL.face, COL.face, 0.05);
  B.box(fx + 0.07, ys + dh + 0.16, 172, 0.07, 0.16, DOOR_HALF + 0.32, 0, COL.face, COL.face, 0.05);
  B.box(fx + 0.16, yt - 0.06, 172, 0.2, 0.1, (BK.z1 - BK.z0) / 2 + 0.12, 0, COL.face, COL.mossDark, 0.06);
  {
    const zc = 172, w = (BK.z1 - BK.z0) / 2 + 0.1, ph = 1.15, xa = fx + 0.3, xb = bx + 0.4, y0 = yt;
    const a = [xa, y0, zc - w], b = [xa, y0, zc + w], c = [xa, y0 + ph, zc], a2 = [xb, y0, zc - w], b2 = [xb, y0, zc + w], c2 = [xb, y0 + ph, zc];
    B.tri(a, b, c, COL.face, [1, 0, 0], 0.07); B.quad(a, c, c2, a2, COL.moss, [0, 0.8, -0.6], 0.12); B.quad(b, c, c2, b2, COL.moss, [0, 0.8, 0.6], 0.12); B.quad(a, a2, b2, b, COL.faceW, [0, -1, 0]);
    const q = new THREE.Matrix4().compose(new THREE.Vector3(xa + 0.01, y0 + 0.4, zc), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)), new THREE.Vector3(1, 0.8, 1));
    B.geo(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 14).rotateX(Math.PI / 2), q, COL.faceW, 0.05);
  }
  // the damp's streaks down the front from the cornice, and lichen in rounds
  for (let i = 0; i < 16; i++) {
    const z = BK.z0 + 0.15 + hash(i, 21) * (BK.z1 - BK.z0 - 0.3); if (Math.abs(z - 172) < DOOR_HALF + 0.35) continue;
    const l = 0.8 + hash(i, 22) * 2.4, w = 0.04 + hash(i, 23) * 0.09, x = fx + 0.185 + (Math.abs(z - (BK.z0 + 0.35)) < 0.3 || Math.abs(z - (BK.z1 - 0.35)) < 0.3 ? 0.005 : -0.175) + i * 0.0018; // (each its own plane: two that cross never fight)
    B.quad([x, yt - 0.22, z - w], [x, yt - 0.22, z + w], [x, yt - 0.22 - l, z + w * 0.4], [x, yt - 0.22 - l, z - w * 0.4], hash(i, 24) > 0.5 ? COL.mossDark : K(COL.faceW, 0.6), [1, 0, 0], 0.1);
  }
  // the bronze leaf, swung in on its south hinge 68 degrees: open a body's width; panels, verdigris where it ran
  const hinge = [fx - 0.25, 172 + DOOR_HALF - 0.05], A0 = 68 * Math.PI / 180, LW = 2 * DOOR_HALF - 0.08, LH = dh - 0.05;
  const leaf = { a: hinge, b: [hinge[0] - Math.sin(A0) * LW, hinge[1] - Math.cos(A0) * LW] };
  {
    const ux = -Math.sin(A0), uz = -Math.cos(A0), nx = -uz, nz = ux, th = 0.05; // along the leaf, and across it (toward the doorway's north)
    const P = (u, y, t) => [hinge[0] + ux * u + nx * t, ys + 0.02 + y, hinge[1] + uz * u + nz * t];
    for (const t of [-th, th]) B.quad(P(0, 0, t), P(LW, 0, t), P(LW, LH, t), P(0, LH, t), t > 0 ? COL.bronze : K(COL.bronze, 0.8), [nx * t, 0, nz * t], 0.1);
    B.quad(P(LW, 0, -th), P(LW, 0, th), P(LW, LH, th), P(LW, LH, -th), COL.bronze, [ux, 0, uz]); B.quad(P(0, LH, -th), P(LW, LH, -th), P(LW, LH, th), P(0, LH, th), COL.bronze, [0, 1, 0]);
    for (const t of [-1, 1]) for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
      const u0 = 0.15 + i * (LW - 0.3) / 2 + 0.05, u1 = u0 + (LW - 0.3) / 2 - 0.1, y0 = 0.2 + j * (LH - 0.4) / 3 + 0.05, y1 = y0 + (LH - 0.4) / 3 - 0.1, tt = t * (th + 0.012);
      B.quad(P(u0, y0, tt), P(u1, y0, tt), P(u1, y1, tt), P(u0, y1, tt), j === 0 ? COL.verd : K(COL.bronze, 1.15), [nx * t, 0, nz * t], 0.12);
    }
  }
  // the great tree over the door: a trunk broad as the doorway, leaning a little east over the block, roots down over
  // the pediment and the piers to the forecourt's walls, and two limbs going up into the dark
  const TR = BEDS.tree, gt = T.heightAt(TR.x, TR.z) - 0.3;
  const trunk = new THREE.CatmullRomCurve3([new THREE.Vector3(TR.x, gt - 0.6, TR.z), new THREE.Vector3(TR.x + 0.2, gt + 3, TR.z), new THREE.Vector3(TR.x + 0.7, gt + 7, TR.z - 0.3), new THREE.Vector3(TR.x + 0.6, gt + 12, TR.z - 0.4)]);
  B.geo(taper(trunk, TR.r, TR.r * 0.6, 14, 10), new THREE.Matrix4(), (nx) => (nx > 0.3 ? COL.barkW : COL.bark), 0.12);
  for (const [dx, dz, up] of [[-2.5, -3, 16], [2, 2.5, 17]]) {
    const l = new THREE.CatmullRomCurve3([new THREE.Vector3(TR.x + 0.6, gt + 10, TR.z - 0.4), new THREE.Vector3(TR.x + 0.6 + dx * 0.5, gt + 13, TR.z - 0.4 + dz * 0.5), new THREE.Vector3(TR.x + 0.6 + dx, gt + up, TR.z - 0.4 + dz)]);
    B.geo(taper(l, TR.r * 0.45, 0.12, 10, 7), new THREE.Matrix4(), COL.bark, 0.1);
  }
  const roots = [[fx + 0.2, yt + 0.4, BK.z0 + 0.1, fx + 0.4, ys + 0.3, BK.z0 - 0.3], [fx + 0.25, yt + 0.6, BK.z1 - 0.2, fx + 0.5, ys + 0.6, BK.z1 + 0.25], [fx + 0.3, yt + 1.0, 171.4, fx + 0.35, ys + dh + 0.35, 171.1], [fx - 0.4, yt + 0.5, BK.z0 - 0.6, x1 - 0.3, top(x1, CT.z0 - 0.6) + 0.05, CT.z0 - 0.75], [fx - 0.3, yt + 0.5, BK.z1 + 0.6, x1 - 0.5, top(x1, CT.z1 + 0.7) + 0.05, CT.z1 + 0.8]];
  for (const [ax, ay, az, ex, ey, ez] of roots) {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(TR.x + 0.4, gt + 0.6, TR.z), new THREE.Vector3((TR.x + ax) / 2, Math.max(gt + 0.5, ay + 0.6), (TR.z + az) / 2), new THREE.Vector3(ax, ay, az), new THREE.Vector3((ax + ex) / 2 + 0.1, (ay + ey) / 2, (az + ez) / 2), new THREE.Vector3(ex, ey, ez)]);
    B.geo(taper(c, 0.26, 0.05, 24, 6), new THREE.Matrix4(), COL.bark, 0.12);
  }
  // wet leaves: drifted against the walls, in a tongue through the doorway and down the first treads
  const leaves = [];
  for (let i = 0; i < 70; i++) {
    const r = hash(i, 1), q = hash(i, 2);
    let x, z;
    if (i < 40) { x = x0 + 0.1 + r * (x1 - x0 - 0.2); z = q < 0.5 ? CT.z0 + 0.05 + q * 0.7 : CT.z1 - 0.05 - (1 - q) * 0.7; }
    else { x = fx - r * 2.0; z = 171.15 + q * 1.7; }
    leaves.push([x, z, hash(i, 3) * Math.PI * 2, 0.07 + hash(i, 4) * 0.05]);
  }
  for (const [x, z, a, s] of leaves) {
    const y = (x > BEDS.stair.x0 ? Y.sill : stairY(x)) + 0.006 + hash(x, z) * 0.006, ca = Math.cos(a) * s, sa = Math.sin(a) * s;
    B.quad([x - ca, y, z - sa], [x - sa * 0.5, y + 0.004, z + ca * 0.5], [x + ca, y, z + sa], [x + sa * 0.5, y + 0.004, z - ca * 0.5], hash(x, 7) > 0.5 ? COL.leaf : COL.leafB, [0, 1, 0], 0.15);
  }
  return { leaf, foxfire: [[fx + 0.18, ys, zl - 0.45], [fx + 0.2, ys, zr + 0.5]] };
}
// a tube along a curve whose radius eases from r0 to r1 (TubeGeometry's radius is one number)
function taper(curve, r0, r1, seg, rad) {
  const g = new THREE.TubeGeometry(curve, seg, 1, rad, false), P = g.attributes.position, N = g.attributes.normal;
  const pts = curve.getSpacedPoints(seg);
  for (let i = 0; i <= seg; i++) {
    const r = r0 + (r1 - r0) * Math.pow(i / seg, 0.8), c = pts[i];
    for (let j = 0; j <= rad; j++) { const k = i * (rad + 1) + j; P.setXYZ(k, c.x + N.getX(k) * r, c.y + N.getY(k) * r, c.z + N.getZ(k) * r); }
  }
  return g;
}
export { taper };

// ------------------------------------------------------------------------------------------------ the stair
export function stair(B) {
  const zl = ST.z - ST.half, zr = ST.z + ST.half, n = Math.round((ST.x0 - ST.x1) * ST.slope / 0.166), go = (ST.x0 - ST.x1) / n, rise = (Y.sill - Y.landing) / n;
  // the doorway's last metre under the lintel (the block's piers are its walls), then the treads
  flags(B, ST.x0, BEDS.face, zl, zr, Y.sill, COL.flag, COL.flagW, 0.5);
  for (let i = 0; i < n; i++) {
    const xa = ST.x0 - i * go, xb = xa - go, y = Y.sill - (i + 1) * rise, worn = COL.flag;
    B.quad([xa, y, zl], [xb, y, zl], [xb, y, zr], [xa, y, zr], hash(i, 5) > 0.5 ? worn : COL.flagW, [0, 1, 0], 0.1);
    B.quad([xa, y, zl], [xa, y + rise, zl], [xa, y + rise, zr], [xa, y, zr], COL.faceW, [-1, 0, 0], 0.08); // the riser, seen from below
    // its walls and its stepped ceiling, each tread's own course: west of the block only (inside it, the piers)
    const yc = y + H_STAIR;
    if (xa <= BK.x0 + 1e-3) {
      coursedZ(B, zl, 1, xb, xa, y, yc, COL.vault, COL.vaultW, 0.5); coursedZ(B, zr, -1, xb, xa, y, yc, COL.vault, COL.vaultW, 0.5);
      B.quad([xa, yc, zl], [xb, yc, zl], [xb, yc, zr], [xa, yc, zr], hash(i, 9) > 0.5 ? COL.vault : COL.vaultW, [0, -1, 0], 0.08);
      B.quad([xb, yc, zl], [xb, yc + rise, zl], [xb, yc + rise, zr], [xb, yc, zr], COL.vaultW, [1, 0, 0], 0.08); // the step in the ceiling
    } else if (xb < BK.x0) {
      // the tread under the block's back: its walls up to the lintel's level
      coursedZ(B, zl, 1, xb, BK.x0, y, Y.sill + DOOR_H, COL.vault, COL.vaultW, 0.5); coursedZ(B, zr, -1, xb, BK.x0, y, Y.sill + DOOR_H, COL.vault, COL.vaultW, 0.5);
      B.quad([BK.x0, yc, zl], [xb, yc, zl], [xb, yc, zr], [BK.x0, yc, zr], COL.vaultW, [0, -1, 0], 0.08);
      B.quad([xb, yc, zl], [xb, yc + rise, zl], [xb, yc + rise, zr], [xb, yc, zr], COL.vaultW, [1, 0, 0], 0.08);
    } else {
      // inside the block: its piers are the walls down to their foot; under that, the stair's own
      coursedZ(B, zl, 1, xb, xa, y, Y.sill - 0.5, COL.vault, COL.vaultW, 0.5); coursedZ(B, zr, -1, xb, xa, y, Y.sill - 0.5, COL.vault, COL.vaultW, 0.5);
    }
  }
  // where the stair's ceiling leaves the lintel: the face between them
  { const yc = stairY(BK.x0) + H_STAIR, i0 = Math.floor((ST.x0 - BK.x0) / go), y1 = Y.sill - (i0 + 1) * rise + H_STAIR;
    B.quad([BK.x0, y1, zl], [BK.x0, Y.sill + DOOR_H, zl], [BK.x0, Y.sill + DOOR_H, zr], [BK.x0, y1, zr], COL.vaultW, [1, 0, 0], 0.08); void yc; }
  // the landing: its floor, walls (open east to the stair, north to the steps), ceiling
  const yl = Y.landing, hl = 3.05, sw = [SP.x - SP.half, SP.x + SP.half];
  flags(B, LA.x0, LA.x1, LA.z0, LA.z1, yl, COL.flag, COL.flagW, 0.6);
  coursedX(B, LA.x0, 1, LA.z0, LA.z1, yl, yl + hl, COL.vault, COL.vaultW);
  coursedX(B, LA.x1, -1, LA.z0, zl, yl, yl + hl, COL.vault, COL.vaultW); coursedX(B, LA.x1, -1, zr, LA.z1, yl, yl + hl, COL.vault, COL.vaultW);
  coursedX(B, LA.x1, -1, zl, zr, yl + H_STAIR, yl + hl, COL.vault, COL.vaultW);
  coursedZ(B, LA.z1, -1, LA.x0, LA.x1, yl, yl + hl, COL.vault, COL.vaultW);
  coursedZ(B, LA.z0, 1, LA.x0, sw[0], yl, yl + hl, COL.vault, COL.vaultW); coursedZ(B, LA.z0, 1, sw[1], LA.x1, yl, yl + hl, COL.vault, COL.vaultW);
  coursedZ(B, LA.z0, 1, sw[0], sw[1], yl + H_STAIR, yl + hl, COL.vault, COL.vaultW);
  flags(B, LA.x0, LA.x1, LA.z0, LA.z1, yl + hl, COL.vaultW, COL.vault, 0.8, true);
  // the steps north into the vault
  const m = 8, gz = (SP.z0 - SP.z1) / m, rz = (yl - Y.vault) / m;
  for (let i = 0; i < m; i++) {
    const za = SP.z0 - i * gz, zb = za - gz, y = yl - (i + 1) * rz, yc = y + H_STAIR;
    B.quad([sw[0], y, za], [sw[1], y, za], [sw[1], y, zb], [sw[0], y, zb], hash(i, 11) > 0.5 ? COL.flag : COL.flagW, [0, 1, 0], 0.1);
    B.quad([sw[0], y, za], [sw[1], y, za], [sw[1], y + rz, za], [sw[0], y + rz, za], COL.faceW, [0, 0, -1], 0.08);
    coursedX(B, sw[0], 1, zb, za, y, yc, COL.vault, COL.vaultW, 0.5); coursedX(B, sw[1], -1, zb, za, y, yc, COL.vault, COL.vaultW, 0.5);
    B.quad([sw[0], yc, za], [sw[1], yc, za], [sw[1], yc, zb], [sw[0], yc, zb], COL.vaultW, [0, -1, 0], 0.08);
    B.quad([sw[0], yc, zb], [sw[1], yc, zb], [sw[1], yc + rz, zb], [sw[0], yc + rz, zb], COL.vaultW, [0, 0, 1], 0.08);
  }
  void stepsY;
}

// ------------------------------------------------------------------------------------------------ the vault
export function vault(B) {
  const y = V.y, cx = (V.x0 + V.x1) / 2, hw = (V.x1 - V.x0) / 2, ys = y + V.spring, yc = y + V.crown;
  flags(B, V.x0, V.x1, V.z0, V.z1, y, COL.floor, K(COL.floor, 0.85), 0.75);
  coursedX(B, V.x0, 1, V.z0, V.z1, y, ys, COL.vault, COL.vaultW); coursedX(B, V.x1, -1, V.z0, V.z1, y, ys, COL.vault, COL.vaultW);
  // the barrel: a segmental arc over the width, in strips; transverse ribs every 2.5 m stand 6 cm proud
  const sag = yc - ys, R = (hw * hw + sag * sag) / (2 * sag), oy = yc - R, a0 = Math.asin(hw / R), N = 12;
  const arc = (k) => { const a = -a0 + (2 * a0 * k) / N; return [cx + Math.sin(a) * R, oy + Math.cos(a) * R]; };
  for (let k = 0; k < N; k++) {
    const [xa, ya] = arc(k), [xb, yb] = arc(k + 1);
    for (let z = V.z0, j = 0; z < V.z1 - 1e-3; z += 0.85, j++) {
      const zb = Math.min(V.z1, z + 0.85), c = hash(k + (j % 2 ? 0.5 : 0), j) > 0.5 ? COL.vault : COL.vaultW;
      B.quad([xa, ya, z], [xb, yb, z], [xb, yb, zb], [xa, ya, zb], c, [cx - (xa + xb) / 2, oy - (ya + yb) / 2, 0], 0.08);
    }
  }
  for (let z = V.z0 + 2.5; z < V.z1 - 1; z += 2.5) for (let k = 0; k < N; k++) {
    const [xa, ya] = arc(k), [xb, yb] = arc(k + 1), sh = 0.94;
    const pa = [cx + (xa - cx) * sh, oy + (ya - oy) * sh], pb = [cx + (xb - cx) * sh, oy + (yb - oy) * sh];
    const nIn = [cx - (xa + xb) / 2, oy - (ya + yb) / 2, 0];
    for (const dz of [-0.15, 0.15]) B.quad([xa, ya, z + dz], [xb, yb, z + dz], [pb[0], oy + (yb - oy) * sh, z + dz], [pa[0], oy + (ya - oy) * sh, z + dz], COL.rib, [0, 0, -dz], 0.06);
    B.quad([pa[0], pa[1], z - 0.15], [pb[0], pb[1], z - 0.15], [pb[0], pb[1], z + 0.15], [pa[0], pa[1], z + 0.15], COL.rib, nIn, 0.06);
  }
  // the end walls, their lunettes under the arc, each with its opening: the steps' at the south, the way's at the north
  // (the gardener's: broken through the coursing, its edges left rough)
  for (const [z, nz, half, top] of [[V.z1, -1, SP.half, y + H_STAIR], [V.z0, 1, W.half, y + W.height]]) {
    const sh = new THREE.Shape(); // (the opening a notch in the outline, not a hole touching it)
    sh.moveTo(-hw, 0); sh.lineTo(-half, 0); sh.lineTo(-half, top - y); sh.lineTo(half, top - y); sh.lineTo(half, 0); sh.lineTo(hw, 0); sh.lineTo(hw, ys - y);
    for (let k = N; k >= 0; k--) { const [xa, ya] = arc(k); sh.lineTo(xa - cx, ya - y); }
    sh.lineTo(-hw, 0);
    const g = new THREE.ShapeGeometry(sh, 4), m = new THREE.Matrix4().makeTranslation(cx, y, z);
    if (nz < 0) m.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
    B.geo(g, m, COL.vaultW, 0.1);
    // (the opening's sides and head are the steps' walls and ceiling at the south, the way's tube at the north)
    if (nz > 0) for (let i = 0; i < 5; i++) { // broken stones round the gardener's hole, standing proud
      const yy = y + 0.3 + i * 0.45, s = i % 2 ? 1 : -1;
      B.box(cx + s * (half + 0.12), yy, z + 0.06, 0.13, 0.17, 0.06, 0.1 * s, COL.vault, COL.vaultW, 0.12);
    }
  }
  // the six tombs, in the plan's order; each lid an effigy of one of the six; the roots' ends in their cracks
  const roots = [];
  BEDS.tombs.forEach(([tx, tz], i) => { const side = tx < cx ? 1 : -1; roots.push(tomb(B, LIKENESSES[i].id, tx, y, tz, side).root); });
  return { roots, crown: yc, arc, cx, R, oy };
}

// ------------------------------------------------------------------------------------------------ the way under
// lofted along the line: earth walls behind plank lagging, a plank ceiling on iron bars, an iron frame every 1.8 m
// (the glasshouse's own: cast columns with their capitals, a T-bar across, green paint flaking to rust)
export function wayTube(B, s0, s1) {
  const half = W.half, H = W.height, a = {}, b = {};
  const frameAt = (s, o) => { W.at(Math.max(0, Math.min(W.LEN, s)), o); if (s < 0) { o.x += o.tx * s; o.z += o.tz * s; } else if (s > W.LEN) { o.x += o.tx * (s - W.LEN); o.z += o.tz * (s - W.LEN); } o.rx = -o.tz; o.rz = o.tx; o.y = W.floorY(Math.max(0, Math.min(W.LEN, s))); return o; };
  const P = (o, d, h) => [o.x + o.rx * d, o.y + h, o.z + o.rz * d];
  const step = 0.45;
  for (let s = s0, i = 0; s < s1 - 1e-3; s += step, i++) {
    const sb = Math.min(s1, s + step); frameAt(s, a); frameAt(sb, b);
    const inCh = (o, d) => Math.hypot(o.x + o.rx * d - CH.x, o.z + o.rz * d - CH.z) < CH.r + 0.02;
    if (s >= 0 && !inCh(a, -half) && !inCh(a, half) && !inCh(b, -half) && !inCh(b, half)) B.quad(P(a, -half, 0), P(a, half, 0), P(b, half, 0), P(b, -half, 0), hash(i, 1) > 0.5 ? COL.earth : COL.earthW, [0, 1, 0], 0.15);
    // the walls: planks to 1.7 m, earth over them to the ceiling (the lagging stops short)
    for (const sd of [-1, 1]) {
      const d = sd * half, n = [-a.rx * sd, 0, -a.rz * sd];
      for (let k = 0; k < 6; k++) { const h0 = 0.05 + k * 0.28, h1 = h0 + 0.26; B.quad(P(a, d, h0), P(b, d, h0), P(b, d, h1), P(a, d, h1), (k + i) % 3 ? COL.plank : COL.plankW, n, 0.12); }
      B.quad(P(a, d, 0), P(b, d, 0), P(b, d, 0.05), P(a, d, 0.05), COL.earth, n, 0.1);
      for (let k = 0; k < 5; k++) { const h0 = 0.05 + k * 0.28 + 0.26, h1 = h0 + 0.02; B.quad(P(a, d, h0), P(b, d, h0), P(b, d, h1), P(a, d, h1), COL.earth, n, 0.1); }
      B.quad(P(a, d, 0.05 + 6 * 0.28 - 0.02), P(b, d, 0.05 + 6 * 0.28 - 0.02), P(b, d, H), P(a, d, H), COL.earthW, n, 0.15);
    }
    B.quad(P(a, -half, H), P(a, half, H), P(b, half, H), P(b, -half, H), i % 2 ? COL.plank : COL.plankW, [0, -1, 0], 0.12);
  }
  // the frames, every 1.8 m
  for (let s = Math.max(0.9, s0 + 0.4); s < s1 - 0.4; s += 1.8) {
    frameAt(s, a); const yaw = Math.atan2(a.tx, a.tz);
    for (const sd of [-1, 1]) {
      const p = P(a, sd * (half - 0.07), 0);
      B.box(p[0], 0.12 + p[1] + 0.003, p[2], 0.09, 0.12, 0.09, yaw, COL.iron, COL.rust, 0.1);                 // the base
      B.box(p[0], p[1] + (0.243 + H - 0.23) / 2, p[2], 0.045, (H - 0.23 - 0.243) / 2, 0.045, yaw, hash(s, sd) > 0.4 ? COL.paint : COL.rust, COL.iron, 0.2); // the column
      B.box(p[0], p[1] + H - 0.17, p[2], 0.08, 0.06, 0.08, yaw, COL.iron, COL.iron, 0.1);                       // its capital
    }
    const c = P(a, 0, H - 0.07);
    B.box(c[0], c[1], c[2], half, 0.05, 0.05, yaw, COL.iron, COL.rust, 0.15);                                    // the T-bar across
  }
}

// ------------------------------------------------------------------------------------------------ the chamber
export function chamber(B, out) {
  const { x: cx, z: cz, r, y, wall, ceil } = CH, yc = y + ceil, N = 36;
  // the way comes in at the bearing of its end; the wall is left open there (the way's own tube lines the hole)
  const e = W.at(W.LEN), ma = Math.atan2(e.z - cz, e.x - cx), mw = (W.half + 0.05) / r;
  const inMouth = (a) => Math.abs(Math.atan2(Math.sin(a - ma), Math.cos(a - ma))) < mw;
  // the floor: rings of flags round a round stone in the middle
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
    for (const [r0, r1, c] of [[0, 1.6, COL.floor], [1.6, 3.1, K(COL.floor, 0.9)], [3.1, r, i % 2 ? COL.floor : K(COL.floor, 0.82)]]) {
      const p = (a, rr) => [cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr];
      if (r0 === 0) B.tri([cx, y, cz], p(a0, r1), p(a1, r1), c, [0, 1, 0], 0.1); else B.quad(p(a0, r0), p(a0, r1), p(a1, r1), p(a1, r0), c, [0, 1, 0], 0.1);
    }
    // the wall: coursed, with the cove to the ceiling
    const p = (a, rr, h) => [cx + Math.cos(a) * rr, y + h, cz + Math.sin(a) * rr], n = [-Math.cos((a0 + a1) / 2), 0, -Math.sin((a0 + a1) / 2)];
    for (let h = 0, k = 0; h < wall - 1e-3; h += 0.45, k++) {
      const h1 = Math.min(wall, h + 0.45);
      if (inMouth((a0 + a1) / 2) && h < W.height - 0.01) continue;
      B.quad(p(a0, r, h), p(a1, r, h), p(a1, r, h1), p(a0, r, h1), hash(i + (k % 2) * 0.5, k) > 0.5 ? COL.vault : COL.vaultW, n, 0.08);
    }
    B.quad(p(a0, r, wall), p(a1, r, wall), p(a1, r - 0.6, ceil), p(a0, r - 0.6, ceil), COL.vaultW, [n[0], -1.2, n[2]], 0.08);
  }
  // the ceiling: a flat stone disc with the grate's square hole
  {
    const sh = new THREE.Shape(); sh.absarc(0, 0, r - 0.6 + 0.002, 0, Math.PI * 2, false);
    const g = GR, hole = new THREE.Path(), u0 = g.x - cx - g.half, u1 = g.x - cx + g.half, v0 = g.z - cz - g.half, v1 = g.z - cz + g.half;
    hole.moveTo(u0, v0); hole.lineTo(u0, v1); hole.lineTo(u1, v1); hole.lineTo(u1, v0); hole.lineTo(u0, v0); sh.holes.push(hole);
    const geo = new THREE.ShapeGeometry(sh, 24); // (u, v) -> world (cx + u, yc, cz + v), facing down
    B.geo(geo, new THREE.Matrix4().makeTranslation(cx, yc, cz).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), (nx, ny) => (ny < 0 ? COL.vaultW : COL.vault), 0.1);
    // the grate's shaft up to the glasshouse's floor, the grate across its top: iron bars both ways
    const top = BEDS.grate.top ?? -3.3, gx0 = g.x - g.half, gx1 = g.x + g.half, gz0 = g.z - g.half, gz1 = g.z + g.half;
    coursedX(B, gx0, 1, gz0, gz1, yc, top + 0.15, COL.vault, COL.vaultW, 0.4); coursedX(B, gx1, -1, gz0, gz1, yc, top + 0.15, COL.vault, COL.vaultW, 0.4);
    coursedZ(B, gz0, 1, gx0, gx1, yc, top + 0.15, COL.vault, COL.vaultW, 0.4); coursedZ(B, gz1, -1, gx0, gx1, yc, top + 0.15, COL.vault, COL.vaultW, 0.4);
    for (let k = 0; k < 6; k++) { const t = (k + 0.5) / 6; B.box(gx0 + (gx1 - gx0) * t, top, g.z, 0.02, 0.035, g.half, 0, COL.iron, COL.iron, 0.05); B.box(g.x, top - 0.07, gz0 + (gz1 - gz0) * t, g.half, 0.02, 0.02, 0, COL.iron, COL.iron, 0.05); }
    out.grateTop = top;
  }
  // the seven tubs' undersides, set in the floor above: stone bowls standing down out of the ceiling, a drain in each
  out.tubs = [];
  for (const [tx, tz] of BEDS.tubs) {
    const g = new THREE.SphereGeometry(0.62, 16, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    B.geo(g, new THREE.Matrix4().compose(new THREE.Vector3(tx, yc + 0.08, tz), new THREE.Quaternion(), new THREE.Vector3(1, 0.62, 1)), (nx, ny) => (ny < -0.9 ? COL.black : COL.faceW), 0.12);
    B.geo(new THREE.CylinderGeometry(0.66, 0.66, 0.12, 16, 1, true), new THREE.Matrix4().makeTranslation(tx, yc - 0.03, tz), COL.vault, 0.08);
    out.tubs.push([tx, yc + 0.08 - 0.62 * 0.62, tz]);
  }
  // the seventh tomb, open and empty, in the middle; its lid leaning on its west side, half carved; chips, a chisel,
  // a mallet; the can on its east rim
  const T7 = BEDS.tubs[6], tx = T7[0], tz = T7[1], hx = 0.55, hz = 1.08, th = 0.09, hc = 0.85;
  B.box(tx, y + 0.05 + 0.003, tz, hx + 0.08, 0.05, hz + 0.08, 0, COL.vaultW, COL.vaultW, 0.08);
  B.box(tx, y + 0.1 + 0.08 + 0.006, tz, hx - th, 0.08, hz - th, 0, COL.black, K(COL.vaultW, 0.6), 0.05); // the floor inside
  for (const s of [-1, 1]) {
    B.box(tx + s * (hx - th / 2), y + 0.1 + hc / 2 + 0.006, tz, th / 2, hc / 2, hz, 0, STONE, K(STONE, 1.1), 0.07);
    B.box(tx, y + 0.1 + hc / 2 + 0.009, tz + s * (hz - th / 2), hx - th - 0.003, hc / 2, th / 2, 0, STONE, K(STONE, 1.1), 0.07);
  }
  out.tomb = { x: tx, z: tz, hx, hz, top: y + 0.1 + hc + 0.006, floor: y + 0.27 };
  {
    // the lid: on the floor 0.75 m west of the tomb, its top edge on the west rim; its carved face up and out
    const lw = 1.2, lth = 0.12, lb = [tx - hx - 0.78, y + 0.06], lt = [tx - hx + 0.02, y + 0.1 + hc + 0.006 + 0.04];
    const ang = Math.atan2(lt[1] - lb[1], lt[0] - lb[0]), len = Math.hypot(lt[0] - lb[0], lt[1] - lb[1]);
    const mid = [(lb[0] + lt[0]) / 2, (lb[1] + lt[1]) / 2], ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux; // (n: out of the face, up and west)
    const M = (u, w, z) => [mid[0] + ux * u + nx * w, mid[1] + uy * u + ny * w, tz + z];
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, ang));
    B.geo(new THREE.BoxGeometry(len + 0.05, lth, 2.2), new THREE.Matrix4().compose(new THREE.Vector3(...M(0, -lth / 2, 0)), q, new THREE.Vector3(1, 1, 1)), STONE, 0.06);
    void lw;
    // the stooped figure: carved in the head half (to the north), roughed out below the waist, the rest still slab
    const fig = (g, u, w, z, sx, sy, sz, col = C('#b4a993'), rz = 0) => B.geo(g, new THREE.Matrix4().compose(new THREE.Vector3(...M(u, w, z)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, ang + rz)), new THREE.Vector3(sx, sy, sz)), col, 0.06);
    fig(new THREE.SphereGeometry(0.12, 10, 8), 0.12, 0.06, -0.78, 1, 0.5, 1.1);                 // the head, bowed
    fig(new THREE.BoxGeometry(0.42, 0.1, 0.45), 0.05, 0.04, -0.42, 1, 1, 1);                     // the shoulders, hunched
    fig(new THREE.SphereGeometry(0.16, 8, 6), 0.18, 0.05, -0.5, 1.1, 0.5, 1.2);                   // the stoop of the back
    fig(new THREE.BoxGeometry(0.1, 0.08, 0.42), -0.18, 0.04, -0.38, 1, 1, 1);                    // an arm, crooked
    fig(new THREE.BoxGeometry(0.34, 0.06, 0.4), 0.02, 0.025, -0.02, 1, 1, 1, C('#9c917d'));    // the waist, roughed
    for (let i = 0; i < 5; i++) fig(new THREE.BoxGeometry(0.06 + hash(i, 3) * 0.08, 0.035, 0.08), -0.25 + hash(i, 1) * 0.5, 0.017, 0.2 + i * 0.16, 1, 1, 1, C('#8f8572')); // the rough below
    for (let i = 0; i < 26; i++) { // the chisel's fresh marks: pale scars round the carving
      const u = -0.42 + hash(i, 5) * 0.84, z = -0.95 + hash(i, 6) * 1.4, p = M(u, 0.004, z), s = 0.018 + hash(i, 8) * 0.02;
      B.quad([p[0] - ux * s, p[1] - uy * s, p[2] - s * 0.4], [p[0] + ux * s, p[1] + uy * s, p[2] - s * 0.4], [p[0] + ux * s, p[1] + uy * s, p[2] + s * 0.4], [p[0] - ux * s, p[1] - uy * s, p[2] + s * 0.4], COL.chip, [nx, ny, 0], 0.08);
    }
    // the chips on the floor under it, the chisel and the mallet beside them
    for (let i = 0; i < 30; i++) { const x = lb[0] - 0.1 + hash(i, 13) * 0.7, z = tz - 0.8 + hash(i, 14) * 1.6, s = 0.015 + hash(i, 15) * 0.025; B.box(x, y + s * 0.5 + 0.004 + i * 0.0016, z, s, s * 0.5, s * 0.8, hash(i, 16) * 3, COL.chip, COL.chip, 0.1); }
    B.geo(new THREE.CylinderGeometry(0.012, 0.016, 0.24, 6), new THREE.Matrix4().compose(new THREE.Vector3(lb[0] - 0.35, y + 0.017, tz + 0.55), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0.6, 0)), new THREE.Vector3(1, 1, 1)), COL.iron, 0.05);
    B.box(lb[0] - 0.5, y + 0.058, tz + 0.3, 0.07, 0.05, 0.05, 0.4, COL.plank, COL.plank, 0.08);
    B.geo(new THREE.CylinderGeometry(0.016, 0.016, 0.3, 6), new THREE.Matrix4().compose(new THREE.Vector3(lb[0] - 0.42, y + 0.022, tz + 0.12), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0.4)), new THREE.Vector3(1, 1, 1)), COL.plankW, 0.06);
  }
  // the can: the Garth's make, small (src/v17/garth/can.js): brass, iron hoops, a bow handle, the long spout over the tomb
  {
    const x = tx + hx - th / 2 + 0.02, z = tz + 0.42, y0 = out.tomb.top + 0.003, k = 0.24;
    const prof = [[0.0, 0.0], [0.58, 0.0], [0.62, 0.06], [0.6, 0.9], [0.56, 1.3], [0.42, 1.52], [0.3, 1.6], [0.31, 1.68], [0.28, 1.7]];
    B.geo(new THREE.LatheGeometry(prof.map(([rr, yy]) => new THREE.Vector2(rr * k, yy * k)), 16), new THREE.Matrix4().makeTranslation(x, y0, z), (nx, ny) => (ny > 0.6 ? COL.brassW : COL.brass), 0.06);
    for (const yy of [0.2, 0.75, 1.22]) B.geo(new THREE.CylinderGeometry(0.615 * k, 0.615 * k, 0.07 * k, 16, 1, true), new THREE.Matrix4().makeTranslation(x, y0 + yy * k, z), COL.iron, 0.04);
    for (let i = 0; i < 8; i++) { const t0 = Math.PI * i / 8, t1 = Math.PI * (i + 1) / 8, rr = 0.42 * k; B.box(x, y0 + (1.52 + Math.sin((t0 + t1) / 2) * 0.6) * k, z + Math.cos((t0 + t1) / 2) * rr, 0.012, 0.02, 0.03, 0, COL.iron, COL.iron, 0.04); }
    const root = new THREE.Vector3(x - 0.55 * k, y0 + 0.35 * k, z), rose = new THREE.Vector3(x - 0.62, y0 + 0.28, z - 0.05);
    B.geo(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(root, new THREE.Vector3((root.x + rose.x) / 2, (root.y + rose.y) / 2 - 0.04, z), rose), 8, 0.02, 6, false), new THREE.Matrix4(), COL.brass, 0.04);
    B.geo(new THREE.CylinderGeometry(0.05, 0.022, 0.05, 10), new THREE.Matrix4().compose(rose, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -1.2)), new THREE.Vector3(1, 1, 1)), COL.brassW, 0.04);
    out.can = { x, z, y: y0, r: 0.16 };
  }
  out.mouth = { a: ma, w: mw };
  // the jambs where the way comes through the wall: two dressed stones and a lintel
  {
    const p = (a, rr, h) => [cx + Math.cos(a) * rr, y + h, cz + Math.sin(a) * rr], yaw = -ma;
    for (const s of [-1, 1]) { const q = p(ma + s * (mw + 0.05), r - 0.12, 0); B.box(q[0], y + W.height / 2 + 0.003, q[2], 0.16, W.height / 2, 0.16, yaw, COL.face, COL.faceW, 0.07); }
    const q = p(ma, r - 0.12, 0); B.box(q[0], y + W.height + 0.14, q[2], 0.2, 0.12, W.half + 0.25, yaw, COL.face, COL.faceW, 0.07);
  }
}
