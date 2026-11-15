// The Demesne's ground hook (v13 L3: three-free, so the terrain's bake can run in a worker; demesne.js re-exports it)
import { smoothstep } from '../../../noise.js';
import { col, Col } from '../../../height/color.js';
import { N, parterreD } from '../height/demesne.js';

export const cLawn = col('#6f8c3a'), cLawn2 = col('#7c9444'), cRidge = col('#9a9c58'); // v8-02: shaven, the brightest green on the map
const _c = new Col();
export function ground(c, x, z, w) {
  const n = N.fbm2(x * 0.08, z * 0.08, 2) * 0.5 + 0.5, pd = parterreD(x, z);
  _c.copy(cLawn).lerp(cLawn2, n).lerp(cRidge, pd < 1.2 ? (1 - pd / 1.2) * 0.6 : 0);
  c.lerp(_c, smoothstep(0.45, 0.55, w)); // v8-02: a crisp edge, as a mown lawn has
}
