// The six roots (v18-F3): from the masses bursting out of six tubs' undersides in the chamber, across its ceiling and
// down over the way's mouth, along the way's roof like pipes, through the vault's north wall and along its barrel, and
// down each into the crack of one lid (the tubs and the tombs in the plan's order, so the flower above is the effigy
// below). Pale and alive, each faintly lit with one of the glasshouse's colours: the light comes down along them.
// The seventh tub's one thin root has only just reached the open tomb. One UnderBuilder, drawn with a glow that takes
// its hue from the vertex colour (beds.js).
//   roots(B, { tubs, ends, vault, wayEnd, tomb }) -> { lights: [[x, y, z, hex], ...] } where the light pools
import * as THREE from 'three';
import { BEDS } from '../plan.js';
import { way as W } from './line.js';
import { taper } from './rooms.js';

const C = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
export const HUES = ['#e0a050', '#d06a6a', '#86b878', '#a07ad0', '#c84a3a', '#d8c060']; // amber, rose, green, violet, crimson, straw: the panes
const PALE = C('#c9bea4');
const hash = (a, b) => { const s = Math.sin(a * 91.7 + b * 47.3) * 43758.5453; return s - Math.floor(s); };

export function roots(B, { tubs, ends, vault, wayEnd, tomb }) {
  const CH = BEDS.chamber, yc = CH.y + CH.ceil, V = BEDS.vault, cx = (V.x0 + V.x1) / 2;
  const top = (s) => W.floorY(Math.max(0, Math.min(W.LEN, s))) + W.height - 0.14;
  const ceilV = (x) => vault.oy + Math.sqrt(Math.max(0, vault.R * vault.R - (x - cx) ** 2)) - 0.1;
  const a = {}, lights = [];
  for (let k = 0; k < 6; k++) {
    const [tx, ty, tz] = tubs[k], o = (k - 2.5) * 0.24, hue = C(HUES[k]), col = PALE.map((v, i) => v * 0.74 + hue[i] * 0.26);
    const P = [];
    // (a little crooked all along: a root finds its way, it is not laid)
    const along = (s, dy = 0) => { W.at(s, a); const j = (hash(k, s * 3.1) - 0.5) * 0.09; return new THREE.Vector3(a.x - a.tz * (o + j), top(s) + dy, a.z + a.tx * (o + j)); };
    // out of the tub's drain, a short droop, then up flat against the ceiling's stone, across it to the wall over the
    // way's mouth, down that wall over the portal's lintel and into the way's roof
    const ma = Math.atan2(wayEnd.z - CH.z, wayEnd.x - CH.x) + o / CH.r, wr = CH.r - 0.16;
    const wx = CH.x + Math.cos(ma) * wr, wz = CH.z + Math.sin(ma) * wr, dx = wx - tx, dz = wz - tz, dl = Math.hypot(dx, dz) || 1;
    P.push(new THREE.Vector3(tx, ty + 0.02, tz), new THREE.Vector3(tx + dx / dl * 0.14, ty - 0.18, tz + dz / dl * 0.14), new THREE.Vector3(tx + dx / dl * 0.5, yc - 0.13, tz + dz / dl * 0.5));
    for (const f of [0.35, 0.65]) P.push(new THREE.Vector3(tx + dx * f + (hash(k, f) - 0.5) * 0.3, yc - 0.1 - hash(f, k) * 0.05, tz + dz * f + (hash(f, k + 1) - 0.5) * 0.3));
    P.push(new THREE.Vector3(wx, CH.y + CH.wall + 0.25, wz), new THREE.Vector3(CH.x + Math.cos(ma) * (CH.r - 0.42), top(wayEnd.s) + 0.32, CH.z + Math.sin(ma) * (CH.r - 0.42)));
    // along the way's roof, sagging a little between the frames, back to its start; hair-roots up to the planks
    for (let s = wayEnd.s - 0.6; s > 0.3; s -= 0.9) {
      const q = along(s, -0.03 - 0.04 * Math.abs(Math.sin((s / 1.8) * Math.PI)) - hash(k, s) * 0.03); P.push(q);
      if (hash(k, s * 1.7) < 0.4) for (const sd of [-1, 1]) {
        W.at(s, a); const ex2 = q.x - a.tz * sd * 0.14, ez2 = q.z + a.tx * sd * 0.14;
        const c = new THREE.CatmullRomCurve3([q.clone(), new THREE.Vector3((q.x + ex2) / 2, q.y + 0.07, (q.z + ez2) / 2 + 0.03), new THREE.Vector3(ex2, top(s) + 0.13, ez2 + 0.05)]);
        B.geo(taper(c, 0.018, 0.004, 5, 4), new THREE.Matrix4(), col, 0.3);
      }
    }
    P.push(along(0));
    // into the vault and up its barrel, along it to over the tomb, and down into the crack
    const [ex, ey, ez] = ends[k];
    P.push(new THREE.Vector3(cx + o, BEDS.vault.y + W.height - 0.2, V.z0 + 0.25));
    P.push(new THREE.Vector3(cx + o * 2, ceilV(cx + o * 2) - 0.05, V.z0 + 1.0));
    const midx = cx + (ex - cx) * 0.6;
    P.push(new THREE.Vector3(midx + (hash(k, 4) - 0.5) * 0.4, ceilV(midx) - 0.12 * hash(k, 5), ez - 1.0 - hash(k, 1)), new THREE.Vector3(ex, ceilV(ex) - 0.05, ez - 0.2));
    // the drop to the lid, crooked: it found its way down, it was not hung
    for (let j = 1; j <= 4; j++) { const f = j / 5; P.push(new THREE.Vector3(ex + (hash(k, j) - 0.5) * 0.22 * (1 - f), ceilV(ex) - 0.05 + (ey + 0.35 - ceilV(ex) + 0.05) * f, ez - 0.2 * (1 - f) + (hash(j, k) - 0.5) * 0.18 * (1 - f))); }
    P.push(new THREE.Vector3(ex, ey + 0.35, ez), new THREE.Vector3(ex, ey - 0.15, ez));
    const curve = new THREE.CatmullRomCurve3(P, false, 'centripetal');
    const L = curve.getLength(), seg = Math.ceil(L / 0.45);
    B.geo(taper(curve, 0.06, 0.08, seg, 6), new THREE.Matrix4(), col, 0.3); // (thin out of the tub, as thick as an arm where it goes into the lid)
    // the mass it comes out of: a dozen thinner roots out of the tub's drain, curling back up and matted flat against
    // the tub's foot and the ceiling round it (nothing here ends in the air)
    for (let j = 0; j < 12; j++) {
      const a0 = hash(k, j) * Math.PI * 2, r0 = 0.12 + hash(j, k) * 0.12, r1 = 0.68 + hash(k + 3, j) * 0.5;
      const c = new THREE.CatmullRomCurve3([new THREE.Vector3(tx + Math.cos(a0) * 0.06, ty + 0.02, tz + Math.sin(a0) * 0.06), new THREE.Vector3(tx + Math.cos(a0) * r0, ty - 0.12 - hash(j, 9) * 0.12, tz + Math.sin(a0) * r0),
        new THREE.Vector3(tx + Math.cos(a0 + 0.3) * 0.58, ty + 0.2, tz + Math.sin(a0 + 0.3) * 0.58), new THREE.Vector3(tx + Math.cos(a0 + 0.5) * r1, yc - 0.02, tz + Math.sin(a0 + 0.5) * r1)]);
      B.geo(taper(c, 0.032, 0.008, 10, 4), new THREE.Matrix4(), col, 0.3);
    }
    // where it goes into the lid: three rootlets spreading over the stone into the crack
    for (let j = 0; j < 3; j++) {
      const da = (j - 1) * 0.5, c = new THREE.CatmullRomCurve3([new THREE.Vector3(ex, ey + 0.35, ez), new THREE.Vector3(ex + Math.sin(da) * 0.12, ey + 0.16, ez + Math.cos(da) * 0.1 - 0.05), new THREE.Vector3(ex + Math.sin(da) * 0.22, ey + 0.07, ez + Math.cos(da) * 0.06 - 0.02)]);
      B.geo(taper(c, 0.03, 0.008, 6, 4), new THREE.Matrix4(), col, 0.12);
    }
    lights.push([ex, ceilV(ex) - 0.4, ez, HUES[k]]);
  }
  // the seventh: one thin root from the middle tub down into the open tomb, its tip just on the floor inside
  {
    const [tx, ty, tz] = tubs[6], T = tomb;
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(tx, ty + 0.02, tz), new THREE.Vector3(tx + 0.06, ty - 1.2, tz - 0.04), new THREE.Vector3(tx - 0.05, T.top + 0.6, tz - 0.12), new THREE.Vector3(tx + 0.04, T.floor + 0.25, tz - 0.2), new THREE.Vector3(tx + 0.1, T.floor + 0.01, tz - 0.3)]);
    B.geo(taper(c, 0.018, 0.006, 30, 5), new THREE.Matrix4(), PALE.map((v, i) => v * 0.7 + C('#9fe8c2')[i] * 0.3), 0.1);
  }
  return { lights };
}
