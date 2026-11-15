// The Noon Road's plan (v14-D3): where the Noonwrights' stalled freight lies on the Foundered Nave's water, in world
// metres. Shared by v14/noon-road.js (draws it), v5/nave.js (the stored light baked into the hall, the hulls seen
// through the water) and the tests. The walked floor's rectangles are v14/coffin-road/plan.js's (the file keeps the
// name the way down was first built under); the hall is NAVE (v5/nave/ground.js).
import { NAVE } from '../../v5/nave/ground.js';

export const WY = NAVE.water;
export const FLOOR_Y = WY + 1.3;           // the carriers' backs: they ride a third out of the water (coffin-road/plan.js ROAD_Y)
export const R_MAIN = 2.3, R_LESS = 1.5;   // the main's carriers and the branch's
// a carrier afloat: its axis lies level, `a` its heading (0 east, pi/2 south), its crown a hand under the floor line
export const axisY = (r, sink = 0) => FLOOR_Y - 0.05 - r * 1.035 - sink;
// every vessel: { id, x, z, a, r, len, lit (0..1), roll, pitch (nose up, rad), sink (m lower), crack, glaze, y (axis, if not afloat level) }
export const VESSELS = [
  { id: 'trial-lit', x: 274.25, z: 38.3, a: 0.04, r: R_MAIN, len: 7.2, lit: 1 },
  { id: 'trial-dark', x: 263.25, z: 38.2, a: -0.08, r: R_MAIN, len: 7.2, lit: 0, roll: 0.2 },
  { id: 'trial-up', x: 268.9, z: 32.3, a: 0.3, r: R_MAIN, len: 7.2, lit: 0.7, pitch: 1.1, y: WY + 0.9 },
];
export const yOf = (v) => v.y ?? axisY(v.r, v.sink || 0);
// the stored light, as lamps: [x, y, z, strength, reach (m)] for the hall's baked glow and the point lights
export function lamps() {
  return VESSELS.filter((v) => v.lit > 0).map((v) => [v.x, Math.max(yOf(v) + v.r * 0.9, WY + 1.1), v.z, v.lit * (v.r / R_MAIN), 9 + 5 * v.lit * (v.r / R_MAIN)]);
}
// the hulls as the water sees them, lit ones first: [x1, z1, x2, z2, r, depth of the axis under the water, light]
export function hulls() {
  return VESSELS.filter((v) => !v.pitch || Math.abs(v.pitch) < 0.5).map((v) => {
    const h = Math.max(0, v.len / 2 - v.r * 0.75), c = Math.cos(v.a), s = Math.sin(v.a);
    return [v.x - c * h, v.z - s * h, v.x + c * h, v.z + s * h, v.r, WY - yOf(v), v.lit || 0];
  }).sort((p, q) => q[6] - p[6]);
}
