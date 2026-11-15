// The Bletting's ground hook (v13 L3: three-free, so the terrain's bake can run in a worker; bletting.js re-exports it)
import { smoothstep, hyp } from '../../../noise.js';
import { col, Col } from '../../../height/color.js';
import { O, SN } from '../height/bletting.js';

const cRank = col('#4c6a2a'), cWind = col('#4a3a24'), cHeal = col('#4e4250');
const _gc = new Col();
export function ground(c, x, z, w) {
  const n = SN.fbm2(x * 0.04, z * 0.04, 3) * 0.5 + 0.5;
  _gc.copy(cRank).lerp(cHeal, smoothstep(0.6, 0.78, SN.fbm2(x * 0.09 + 7, z * 0.09, 2) * 0.5 + 0.5) * 0.45);
  _gc.lerp(cWind, (1 - smoothstep(30, 52, hyp(x - O.x, z - O.z))) * smoothstep(0.45, 0.7, n) * 0.5); // the close's floor, browned by the fall of fruit
  c.lerp(_gc, w * 0.8);
}
