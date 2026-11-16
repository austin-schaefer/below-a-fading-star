// The Lappet's ground (v15-V0), three-free (the terrain's bake reads it in a worker): the colour of the village's
// unbuilt ground, and where the built treads cover the mesh. The plan is src/v15/plan.js.
//   lappetTint(c, x, z)   lerps a vertex colour (a THREE.Color or a height/color.js Col) toward trodden earth where
//                         the village is: the Lees' bench, the Pennyworth's foot, the masons' ground on the crown.
//                         Called once for the terrain's bake (height/ground.js) and by the Demesne's skin.
//   lappetEarth(x, z)     how much of it, 0..1
//   underSlabs(x, z)      true where a built tread of the Elder stair lies over the terrain (src/v15/bones.js)
import { makeSimplex } from '../noise.js';
import { col } from '../height/color.js';
import { HAHA, RISERS, APRON, FADE, HOUSE, Dof, frameOf, villageAmt, benchAmt, footAmt, radiusOf, bearingOf, leesHead } from './plan.js';

const N = makeSimplex(20261115 + 15);
const cEarth = col('#75624a'), cPale = col('#94826a'), cDamp = col('#4c4336'), cLime = col('#9d968a');
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const RIM = RISERS[0].D, LOW = RISERS[3].D;
const _f = { run: 0, s: 0, D: 0 };

export function underSlabs(x, z) {
  if (x < 40 || x > 122 || z < -50 || z > 36) return false;
  frameOf(x, z, _f);
  if (_f.D < RIM - APRON - 0.5 || _f.D > LOW + 0.3) return false;
  return _f.run === 1 ? _f.s > FADE.s1[1] - 0.2 : _f.s < FADE.s2[0] + 0.2;
}
export function lappetEarth(x, z) {
  if (x < 36 || x > 126 || z < -68 || z > 40) return 0;
  const r = radiusOf(x, z);
  if (r < 30 || r > HAHA + 24) return 0;
  const b = bearingOf(x, z);
  if (r >= HAHA - 0.4) {
    // the Pennyworth: the wedge under the house's south wall, and the lanes round its east side
    const east = sstep(HOUSE.x1 - 1, HOUSE.x1 + 1.5, x) * (1 - sstep(HOUSE.x1 + 7, HOUSE.x1 + 10, x)) * sstep(HOUSE.z0 - 7, HOUSE.z0 - 3, z) * (1 - sstep(HOUSE.z1 + 2, HOUSE.z1 + 8, z));
    return Math.max(footAmt(x, z, r, b), east, leesHead(x, z)); // (and the Lees' square where it runs out onto the old way's bank: v15-Q3)
  }
  const D = Dof(x, z);
  if (D >= LOW - 1) return benchAmt(b) * sstep(4, 14, b >= 300 ? b - 360 : b); // the Lees (the parterre's end stays lawn)
  const A = villageAmt(x, z);
  if (D < RIM) return A * sstep(RIM - APRON - 9, RIM - APRON - 2, D);
  return A * 0.85;
}
export function lappetTint(c, x, z) {
  const a = lappetEarth(x, z);
  if (a <= 0) return c;
  const n = N.fbm2(x * 0.09, z * 0.09, 2) * 0.5 + 0.5, m = N.noise2(x * 0.31 + 9, z * 0.31) * 0.5 + 0.5;
  const r = cEarth.r + (cPale.r - cEarth.r) * n, g = cEarth.g + (cPale.g - cEarth.g) * n, bl = cEarth.b + (cPale.b - cEarth.b) * n;
  const d = m * m * 0.45, lime = Dof(x, z) < RIM ? 0.4 : 0;
  const R = (r + (cDamp.r - r) * d) * (1 - lime) + cLime.r * lime, G = (g + (cDamp.g - g) * d) * (1 - lime) + cLime.g * lime, B = (bl + (cDamp.b - bl) * d) * (1 - lime) + cLime.b * lime;
  c.r += (R - c.r) * a; c.g += (G - c.g) * a; c.b += (B - c.b) * a;
  return c;
}
