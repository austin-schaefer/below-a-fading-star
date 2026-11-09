// Shared figure parts for the workers (v7, living-workers): cloth bodies of revolution with folds, sleeves, heads.
// Everything is built in the figure's own frame: origin on the ground under the seat or the feet, +z forward,
// y up. Colours are written per vertex: the folds darker, the hems worn.
import * as THREE from 'three';
import { smoothstep, lerp } from '../../noise.js';

const _c = new THREE.Color();
export const rgb = (hex) => { _c.set(hex); return [_c.r, _c.g, _c.b]; };
export function tone(P, col, k = 1, metal = 0, rough = 0.9) { P.col = [col[0] * k, col[1] * k, col[2] * k]; P.mre = [metal, rough, 0]; }
export function mix3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

// A cloth body round the y axis. prof(v) -> [y, rx, rz, cx, cz] for v 0 (bottom) .. 1 (top); `folds` the number of
// vertical folds, `amp(v)` their depth; colour(v, fold) -> [r, g, b] (fold 0 in a hollow .. 1 on a ridge).
export function clothBody(P, nu, nv, prof, { folds = 7, amp = () => 0.04, colour, rough = 0.92, seed = 0, capTop = true, capBottom = true } = {}) {
  P.grid(nu, nv, (u, v, o) => {
    const [y, rx, rz, cx, cz] = prof(v), a = u * Math.PI * 2;
    const w = Math.sin(a * folds + seed + 0.7 * Math.sin(a * 3 + seed)), ridge = 0.5 + 0.5 * w;
    const f = 1 + amp(v) * (Math.pow(Math.abs(w), 0.7) * Math.sign(w));
    const col = colour(v, ridge, a);
    P.col = col; P.mre = [0, rough, 0];
    o[0] = cx + Math.cos(a) * rx * f; o[1] = y; o[2] = cz + Math.sin(a) * rz * f; // a = 90 deg is the front (+z)
  }, capBottom, capTop);
}

// a head: skin, a cap of hair or none, a beard or none (an old man's), no features: faces are seen only close
export function head(P, cx, cy, cz, r, { skin, hair = null, beard = null, bun = false, sides = 10 }) {
  tone(P, skin, 1, 0, 0.75);
  P.blob(cx, cy, cz + 0.005, r * 0.92, r * 1.08, r * 1.0, sides, 7);
  // the nose's ridge and the brow, a hint of a face's relief and no more
  tone(P, skin, 0.92, 0, 0.75);
  P.blob(cx, cy - r * 0.05, cz + r * 0.92, r * 0.13, r * 0.28, r * 0.16, 5, 3);
  if (hair) {
    tone(P, hair, 1, 0, 0.9);
    P.grid(sides, 5, (u, v, o) => {
      const a = u * Math.PI * 2, ph = v * Math.PI * 0.55; // the back and top of the skull
      const back = 0.5 - 0.5 * Math.sin(a);              // 1 at the back (-z), 0 over the brow
      const rr = r * 1.07 * Math.cos(ph * (1 - 0.35 * back));
      // low at the nape, high over the brow
      o[0] = cx + Math.cos(a) * rr; o[1] = cy + r * 1.07 * Math.sin(ph) + r * (0.35 * (1 - back) - 0.45 * back) * (1 - v); o[2] = cz + Math.sin(a) * rr - 0.008;
    }, false, true);
    if (bun) P.blob(cx, cy + r * 0.35, cz - r * 1.05, r * 0.42, r * 0.42, r * 0.36, 7, 4);
  }
  if (beard) {
    tone(P, beard, 1, 0, 0.95);
    P.sheet(8, 4, (u, v, o) => {
      const a = (u - 0.5) * Math.PI * 1.3, w = 1 - v * 0.7;
      o[0] = cx + Math.sin(a) * r * 0.85 * w; o[1] = cy - r * 0.35 - v * r * 1.25; o[2] = cz + Math.cos(a) * r * 0.75 * w + r * 0.18 - v * r * 0.1;
    });
  }
}

// A sleeve from its origin down -y, `len` long, radius r0 -> r1, with a hand (skin) at the end when `hand` is set.
// The forearm's hand ends exactly at len: the IK in rig.js reaches it there.
export function sleeve(P, len, r0, r1, col, { hand = null, cuff = 0, sides = 7 } = {}) {
  tone(P, col, 1, 0, 0.92);
  P.loft([[0, 0.02, 0], [0, -len * 0.5, 0.004], [0, -len + 0.05 + cuff * 0.5, 0]], [r0, (r0 + r1) / 2, r1], sides, 0, true);
  if (hand) {
    tone(P, hand, 1, 0, 0.7);
    P.blob(0, -len + 0.02, 0.008, 0.028, 0.045, 0.02, 6, 4);
  }
}
