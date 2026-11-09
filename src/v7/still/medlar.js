// One old medlar, for CB the Long Sleeper to sleep under (v7-03). trees.js plants none within 4 m of SITES.sleeper (the
// nearest are 4.1 m and 4.2 m off, and the Bletting's list is not touched), so the module builds one from the Bletting's
// medlar form: a short, crooked, knotted trunk (the 'medlar' form's height 3.6-5.2 m, trunk 0.16-0.26 m) forking at about
// 1.5 m into four spreading limbs, bare twigs, and sparse clusters of rust-brown late leaves ('#5a3418', '#4a2a12') with
// the bark of the form ('#32261e' to '#4a3a2e', moss '#4a4a30'). One limb reaches over the sleeper. One painted mesh.
import * as THREE from 'three';
import { Painter, ell, lerp } from './kit.js';

export const MEDLAR = { height: 4.6, crown: 3.1 };

// toward: unit [x, z] from the trunk to the sleeper
export function medlarGeometry(rng, toward, low) {
  const P = new Painter();
  const bark = new THREE.Color('#32261e'), barkTop = new THREE.Color('#4a3a2e'), moss = new THREE.Color('#4a4a30');
  const leafA = new THREE.Color('#5a3418'), leafB = new THREE.Color('#4a2a12');
  const ang0 = Math.atan2(toward[1], toward[0]);
  const wob = (a) => (rng() - 0.5) * a;
  const tubes = [];
  // the trunk: crooked, flared at the foot, knotted
  const trunk = [[0, -0.15, 0], [0.04, 0.45, 0.02], [0.12, 0.95, -0.06], [0.1, 1.5, 0.0]];
  P.paint(bark, 0, 0.95, 0); P.loft(trunk, [0.4, 0.27, 0.22, 0.19], 7, 0, true);
  P.paint(moss, 0, 0.95, 0); P.loft([[0.04, 0.2, 0.02], [0.1, 0.8, -0.04]], [0.285, 0.235], 5, 0, false); // moss on the north side
  const ends = [];
  const limb = (a, up, len, r0, depth) => {
    const pts = [[0.1, 1.5, 0]], radii = [r0];
    let x = 0.1, y = 1.45, z = 0, ca = a;
    const n = 5, step = len / n;
    for (let k = 1; k <= n; k++) {
      ca += wob(0.5); const u = lerp(up, up * 0.35, k / n) + wob(0.25);
      x += Math.cos(ca) * step * Math.cos(u); z += Math.sin(ca) * step * Math.cos(u); y += Math.sin(u) * step;
      pts.push([x, y, z]); radii.push(Math.max(0.02, r0 * (1 - k / n * 0.85)));
    }
    P.paint(k0(depth), 0, 0.95, 0); P.loft(pts, radii, 5, 0, false);
    ends.push(pts[pts.length - 1]);
    if (depth < 2) for (const f of [0.45, 0.75]) {
      const b = pts[Math.round(f * n)], na = ca + (rng() < 0.5 ? -1 : 1) * (0.7 + rng() * 0.6);
      twig(b, na, 0.9 + rng() * 0.8, radii[Math.round(f * n)] * 0.5, depth + 1);
    }
  };
  const k0 = (d) => (d === 0 ? bark : barkTop);
  const twig = (b, a, len, r0, depth) => {
    const pts = [b], radii = [Math.max(0.025, r0)];
    let x = b[0], y = b[1], z = b[2], ca = a;
    for (let k = 1; k <= 3; k++) { ca += wob(0.6); x += Math.cos(ca) * len / 3; z += Math.sin(ca) * len / 3; y += 0.18 * len / 3 + wob(0.2); pts.push([x, y, z]); radii.push(Math.max(0.012, radii[0] * (1 - k / 3 * 0.75))); }
    P.paint(barkTop, 0, 0.95, 0); P.loft(pts, radii, 4, 0, false);
    ends.push(pts[3]);
  };
  // four limbs; the first reaches out over the sleeper
  limb(ang0, 0.62, 3.3, 0.14, 0);
  limb(ang0 + 1.7, 0.7, 2.8, 0.13, 0);
  limb(ang0 + 3.3, 0.55, 3.0, 0.13, 0);
  limb(ang0 - 1.6, 0.75, 2.6, 0.12, 0);
  // sparse late leaves in clusters at the twig ends, some bare
  for (const e of ends) {
    if (rng() < 0.25) continue;
    const n = low ? 2 : 3 + (rng() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      P.paint(rng() < 0.5 ? leafA : leafB, 0, 0.9, 0);
      const r = 0.2 + rng() * 0.2;
      ell(P, e[0] + wob(0.7), e[1] + 0.02 + rng() * 0.35, e[2] + wob(0.7), r * 1.1, r * 0.8, r, 6, 4);
    }
  }
  return P.geometry();
}
