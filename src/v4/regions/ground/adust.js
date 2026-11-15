// The Adust's ground hook (v13 L3: three-free, so the terrain's bake can run in a worker; adust.js re-exports it)
import { smoothstep } from '../../../noise.js';
import { col, Col } from '../../../height/color.js';
import { N } from '../height/adust.js';

const cOchre = col('#8a4a2c'), cRust = col('#7a2a16'); // v8-02: redder, further from the moor
export function ground(c, x, z, w) {
  const k = smoothstep(0.04, 0.5, w);
  c.lerp(cOchre, k).lerp(cRust, k * 0.4 * (0.5 + 0.5 * N.noise2(x * 0.05, z * 0.05)));
}
