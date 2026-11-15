// The Strandline's ground hook (v13 L3: three-free, so the terrain's bake can run in a worker; strandline.js re-exports it)
import { smoothstep } from '../../../noise.js';
import { col, Col } from '../../../height/color.js';

const cFlint = col('#0e0d11'); // v8-02: black
export function ground(c, x, z, w) {
  c.lerp(cFlint, smoothstep(0.55, 0.85, w));
}
