// The Outwash's ground hook (v13 L3: three-free, so the terrain's bake can run in a worker; outwash.js re-exports it)
import { smoothstep } from '../../../noise.js';
import { col, Col } from '../../../height/color.js';
import { SN, channelAt, moraineAt } from '../height/outwash.js';

const cGravel = col('#6e7c8a'), cBar = col('#56616e'), cWash = col('#9eaab6'), cTill = col('#6c7078'), cMoss = col('#4c5a52'), cWet = col('#434a56'); // v8-02: grey-blue, the glacier's
const _gc = new Col();
export function ground(c, x, z, w, b) {
  const ch = channelAt(x, z), mo = moraineAt(x, z);
  const n = SN.fbm2(x * 0.08 + 20, z * 0.08, 3) * 0.5 + 0.5;
  _gc.copy(cGravel).lerp(cBar, smoothstep(0.55, 0.75, n) * 0.8);
  _gc.lerp(cWash, ch);
  _gc.lerp(cTill, smoothstep(0.15, 0.6, mo));
  _gc.lerp(cMoss, smoothstep(0.62, 0.8, SN.fbm2(x * 0.05 - 9, z * 0.05 + 4, 3) * 0.5 + 0.5) * (1 - ch) * 0.7);
  _gc.lerp(cWet, (1 - smoothstep(-214, -204, z)) * 0.5); // the snout's foot is damp
  c.lerp(_gc, w * (1 - (b?.ice ?? 0)));
}
