// The High Ling's ground hook (v13 L3: three-free, so the terrain's bake can run in a worker; high-ling.js re-exports it)
import { smoothstep } from '../../../noise.js';
import { col, Col } from '../../../height/color.js';
import { SN, edgeX } from '../height/high-ling.js';

const cLing = col('#54303e'), cBell = col('#5e3252') /* v8-02: purple-brown */, cBil = col('#34442a'), cGrit = col('#6a5854');
const _gc = new Col();
export function ground(c, x, z, w, b) {
  const n = SN.fbm2(x * 0.06 + 5, z * 0.06, 3) * 0.5 + 0.5;
  _gc.copy(cLing).lerp(cBell, smoothstep(0.55, 0.72, n) * 0.6);
  // bilberry in the hollows (the terrain's own low places), granite grit on the scarp's face
  const hollow = smoothstep(0.3, 0.7, SN.fbm2(x * 0.03 - 4, z * 0.03 + 2, 2) * -0.5 + 0.5);
  _gc.lerp(cBil, hollow * 0.55);
  const dw = x - edgeX(z);
  _gc.lerp(cGrit, (1 - smoothstep(0, 5, Math.abs(dw - 1.5))) * 0.6 * (z < 12 && z > -107 ? 1 : 0));
  c.lerp(_gc, w * 0.85);
}
