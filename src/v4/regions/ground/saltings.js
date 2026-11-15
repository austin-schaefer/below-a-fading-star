// The Saltings' ground hook (v13 L3: three-free, so the terrain's bake can run in a worker; saltings.js re-exports it)
import { smoothstep } from '../../../noise.js';
import { col, Col } from '../../../height/color.js';
import { SN, runnel } from '../height/saltings.js';

const cCrust = col('#f0ebe8'), cPink = col('#e6cccb'), cDamp = col('#a89e9a'); // v8-02: white, the palest ground on the map
const _gc = new Col();
export function ground(c, x, z, w) {
  const n = SN.fbm2(x * 0.05 + 3, z * 0.05, 3) * 0.5 + 0.5;
  _gc.copy(cCrust).lerp(cPink, smoothstep(0.55, 0.8, n) * 0.35);
  _gc.lerp(cDamp, (1 - smoothstep(0.05, 0.25, runnel(x, z))) * 0.5);
  c.lerp(_gc, smoothstep(0.2, 0.8, w));
}
