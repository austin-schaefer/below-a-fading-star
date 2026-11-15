// The Lynchets' ground hook (v13 L3: three-free, so the terrain's bake can run in a worker; lynchets.js re-exports
// it), with the middens and the polygon helpers its build shares
import { smoothstep, clamp } from '../../../noise.js';
import { col, Col } from '../../../height/color.js';
import { stripAt, stripEdge } from '../../../v8/strips.js';
import { N, POLY } from '../height/lynchets.js';

const cTurf = col('#566331'), cTurf2 = col('#6d6e3a'), cMid = col('#2f3a1c');
// v8-02: stubble, ley, plough, fallow (src/v8/strips.js)
const STRIP = [col('#b4a25a'), col('#3e6e22'), col('#3a2014'), col('#82704e')];
let MIDDENS = [];
// how much of a midden's soft patch is at (x, z), 0..1 (the middens placed on first use)
export function middenAt(x, z) {
  if (!MIDDENS.length) MIDDENS = makeMiddens();
  let m = 0; for (const d of MIDDENS) m = Math.max(m, 1 - smoothstep(d.r * 0.5, d.r, Math.hypot(x - d.x, z - d.z))); return m;
}
const _c = new Col();
export function ground(c, x, z, w) {
  const n = N.fbm2(x * 0.05, z * 0.05, 3) * 0.5 + 0.5;
  // v8-02: the strips, each a different crop's ghost, with a green balk between
  _c.copy(STRIP[stripAt(x, z)]).lerp(cTurf2, n * 0.15).lerp(cTurf, (1 - stripEdge(x, z)) * 0.7).lerp(cMid, middenAt(x, z) * 0.8);
  c.lerp(_c, smoothstep(0.3, 0.6, w));
}
function makeMiddens() {
  // where the farm's heaps were: a few soft patches inside the walls
  const r = (s) => { const v = Math.sin(s * 12.9898) * 43758.5453; return v - Math.floor(v); };
  const out = [];
  for (let i = 0; out.length < 4 && i < 200; i++) {
    const x = -222 + r(i * 2 + 1) * 58, z = -146 + r(i * 2 + 2) * 64;
    if (inPoly(x, z) && polyDist(x, z) > 7 && !out.some((m) => Math.hypot(m.x - x, m.z - z) < 14)) out.push({ x, z, r: 5 + r(i + 77) * 4 });
  }
  return out;
}

// ---------------------------------------------------------------- polygon helpers
export function inPoly(x, z) {
  let inside = false;
  for (let i = 0, j = POLY.length - 1; i < POLY.length; j = i++) {
    const [ax, az] = POLY[j], [bx, bz] = POLY[i];
    if ((az > z) !== (bz > z) && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside;
  }
  return inside;
}
export function polyDist(x, z) {
  let d = Infinity;
  for (let i = 0, j = POLY.length - 1; i < POLY.length; j = i++) {
    const [ax, az] = POLY[j], [bx, bz] = POLY[i], ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez;
    let t = ((x - ax) * ex + (z - az) * ez) / l2; t = clamp(t, 0, 1);
    d = Math.min(d, Math.hypot(x - ax - ex * t, z - az - ez * t));
  }
  return d;
}
