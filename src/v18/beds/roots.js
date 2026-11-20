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
    const [tx, ty, tz] = tubs[k], o = (k - 2.5) * 0.15, hue = C(HUES[k]), col = PALE.map((v, i) => v * 0.62 + hue[i] * 0.38);
    const P = [];
    const along = (s, dy = 0) => { W.at(s, a); return new THREE.Vector3(a.x - a.tz * o, top(s) + dy, a.z + a.tx * o); };
    // out of the mass, up under the ceiling toward the mouth, down the wall over it
    P.push(new THREE.Vector3(tx, ty - 0.25, tz), new THREE.Vector3(tx + (wayEnd.x - tx) * 0.3, yc - 0.12, tz + (wayEnd.z - tz) * 0.3));
    const m = along(wayEnd.s), mx = m.x + (CH.x - m.x) * 0.12, mz = m.z + (CH.z - m.z) * 0.12;
    P.push(new THREE.Vector3(mx, yc - 0.15, mz), new THREE.Vector3(mx, top(wayEnd.s) + 0.05, mz));
    // along the way's roof, sagging a little between the frames, back to its start
    for (let s = wayEnd.s - 0.6; s > 0.3; s -= 0.9) P.push(along(s, -0.03 - 0.04 * Math.abs(Math.sin((s / 1.8) * Math.PI)) - hash(k, s) * 0.03));
    P.push(along(0));
    // into the vault and up its barrel, along it to over the tomb, and down into the crack
    const [ex, ey, ez] = ends[k];
    P.push(new THREE.Vector3(cx + o, BEDS.vault.y + W.height - 0.2, V.z0 + 0.25));
    P.push(new THREE.Vector3(cx + o * 2, ceilV(cx + o * 2) - 0.05, V.z0 + 1.0));
    const midx = cx + (ex - cx) * 0.6;
    P.push(new THREE.Vector3(midx, ceilV(midx), ez - 1.0 - hash(k, 1)), new THREE.Vector3(ex, ceilV(ex) - 0.05, ez - 0.2));
    P.push(new THREE.Vector3(ex, (ceilV(ex) + ey) / 2 + 0.2, ez - 0.08), new THREE.Vector3(ex, ey + 0.35, ez), new THREE.Vector3(ex, ey - 0.15, ez));
    const curve = new THREE.CatmullRomCurve3(P, false, 'centripetal');
    const L = curve.getLength(), seg = Math.ceil(L / 0.45);
    B.geo(taper(curve, 0.085, 0.06, seg, 6), new THREE.Matrix4(), col, 0.12);
    // the mass it comes out of: a dozen thinner roots hanging out of the tub's drain, crooked
    for (let j = 0; j < 12; j++) {
      const a0 = hash(k, j) * Math.PI * 2, r0 = 0.08 + hash(j, k) * 0.2, l = 0.5 + hash(k + 3, j) * 1.0;
      const p0 = new THREE.Vector3(tx + Math.cos(a0) * r0 * 0.5, ty + 0.05, tz + Math.sin(a0) * r0 * 0.5);
      const c = new THREE.CatmullRomCurve3([p0, new THREE.Vector3(tx + Math.cos(a0) * r0, ty - l * 0.4, tz + Math.sin(a0) * r0), new THREE.Vector3(tx + Math.cos(a0 + 0.8) * r0 * 1.6, ty - l * 0.75, tz + Math.sin(a0 + 0.8) * r0 * 1.6), new THREE.Vector3(tx + Math.cos(a0 + 1.2) * r0 * 1.3, ty - l, tz + Math.sin(a0 + 1.2) * r0 * 1.3)]);
      B.geo(taper(c, 0.035, 0.008, 8, 4), new THREE.Matrix4(), col, 0.15);
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
