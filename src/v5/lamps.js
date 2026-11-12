// AO The Escarpment Lamps [Decided: "Yes, multi-coloured lights, not all warm."] (plans/IDEAS-v4.md AO; plans/wilderness-v5.md "### AO").
// On the south massif's north face (bearings 190-218, 60-240 m up), over the Great Span's road and away from the sun's glare: a
// city of windows (v11 round two: 227 windows at high, 114 at low, plus the great opening) far too high and too many for anything on the floor, no inhabitants and no story. v11 moved it off the west
// wall (it stood beside the Galleries, two rectangles of one size) and gave it the shape of a place built into a ravine: the
// spine follows the deepest cleft of the rendered face up the wall (found from the mesh, so it follows the rock if the rock
// changes), broad and dense at the foot, a pinched waist, a swollen lobe, a thin finger to near the crest, windows laid in level terraces that stack in columns, each a lit rectangle in a dark reveal with a glow on the rock beside it, and one tall lit arch (the great opening, never put out); a tributary climbs
// away to the left; a thread of lamps strings out along a ledge to the right with a gap where it has fallen; a dense quarter
// of lit floors at the foot of the waist; dark bays inside the body; single outliers high up. Lamps thin up the ribs
// between the clefts. Each sits 0.3-0.5 m off the rock. A light the sun would reach (face normal toward the sun), on the scree
// apron, or on a slope under 50 degrees is rejected.
// Each time the sun gutters, one of them goes out and stays out for the session: over a long walk the wall gets darker.
// One Points draw. The shader draws a window sized by distance, its on-screen height held to 4.5-10 px (720p-relative) and, nearer than
// 250 m, capped lower (5.5 px inside 60 m) with its fill and brightness dimmed so no window is a flat slab: a warm core where the lamp
// stands, a thin mullion, a dark reveal and a warm spill on the rock beside; widths and heights differ per lamp and one in six is
// shuttered to a slit. The palette is the world's warm lights (amber, ember, sodium, crimson) with lilac, green-white and cold blue as
// rare exceptions. The wall's own haze (fogAtten) dims them and they flicker slowly from a hash of the index and time. The gutter's falling edge (ctx.sky.flicker through
// 0.85) puts out the next lamp in a fixed seeded order; the update sets two uniforms (time, the dark count) at 4 Hz.
// `?lamps=0` leaves them out; `?lamps=dark=N` starts with N already out.
// `ctx.lamps`: `stats()`, `dark` (count seen), `gutter()` (as if the sun had guttered).
import * as THREE from 'three';
import { SITES, SUN } from '../world.js';
import { makeGround } from '../fauna/uncanny/kit.js';
import { fogPars, fogAtten } from '../particles/shaderParts.js';

const PARAM = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('lamps') : null;
const D2R = Math.PI / 180;
export const PALETTE = [ // the world's own warm lights; the cold ones are rare exceptions (v11-F2: the critic read the old set as UI)
  ['amber', [1.0, 0.56, 0.16], 0.31],
  ['ember', [1.0, 0.34, 0.08], 0.27],
  ['sodium', [1.0, 0.45, 0.05], 0.16],
  ['crimson', [0.90, 0.15, 0.09], 0.20],
  ['green-white', [0.70, 0.95, 0.80], 0.02],
  ['lilac', [0.66, 0.50, 1.0], 0.02],
  ['cold blue', [0.45, 0.62, 1.0], 0.02],
];

export async function build(ctx) {
  if (PARAM === '0') { ctx.lamps = null; return; }
  let seen0 = 0;
  const dm = /dark=(\d+)/.exec(PARAM || '');
  if (dm) seen0 = +dm[1];
  const { scene, terrain } = ctx;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(5517);
  const MG = makeGround(ctx);
  const S = SITES.lamps;
  const az = (b) => (b - 90) * D2R;

  // ---- placement
  const want = 480; // one layout for every tier; low draws every other lamp of it
  const P = [], tmp = new THREE.Vector3();
  const rej = { sun: 0, slope: 0, apron: 0, off: 0 };
  let tries = 0, litByLocal = 0;
  const colorPick = () => { let u = rng(), a = 0; for (let i = 0; i < PALETTE.length; i++) { a += PALETTE[i][2]; if (u < a) return i; } return 0; };
  function place(b, y, ci, size, kind = 0, dim = 1) {
    tries++;
    if (b < S.bearings[0] || b > S.bearings[1] || y < S.y[0] || y > S.y[1]) { rej.off++; return false; }
    const a = az(b), cx = Math.cos(a), cz = Math.sin(a);
    // the face on the rendered mesh: the first radius where it reaches y, bisected
    let lo = 330, hi = 0;
    for (let r = 330; r <= 520; r += 2) { if (MG.at(cx * r, cz * r) >= y) { hi = r; break; } lo = r; }
    if (!hi) { rej.off++; return false; }
    for (let k = 0; k < 7; k++) { const m = (lo + hi) / 2; if (MG.at(cx * m, cz * m) >= y) hi = m; else lo = m; }
    const x = cx * hi, z = cz * hi;
    MG.normal(x, z, tmp);
    const ny = tmp.y;
    // the mesh normal is the rock's slope at this column; a 3-D face normal at height y is the horizontal gradient pushed out
    if (ny > 0.64) { rej.slope++; return false; }                    // under ~50 degrees: scree, a shelf, a corrie floor
    const rise = MG.at(cx * (hi - 8), cz * (hi - 8));
    if (rise > y - 12) { rej.apron++; return false; }                 // a ledge or shoulder just in front: the apron, a gully floor
    // the sun never reaches this face: a light whose rock faces the sun (3-D normal . sun direction > 0.2, a face turned well toward the sun) is rejected
    if (tmp.x * SUN.dir.x + tmp.y * SUN.dir.y + tmp.z * SUN.dir.z > 0.2) { rej.sun++; return false; }
    const proud = 0.3 + 0.2 * rng();
    P.push({ x: x + tmp.x * proud, y: y + tmp.y * proud, z: z + tmp.z * proud, ci, size, kind, dim, n: [tmp.x, tmp.y, tmp.z] });
    return true;
  }
  const b0 = S.bearings[0], b1 = S.bearings[1];
  const arcDeg = (m) => m / (D2R * 400); // metres along the arc at r 400, in degrees (the south face stands near there)
  const gauss = () => (rng() + rng() + rng() - 1.5) * 1.6;
  // the face's own ravines: at each height, how far back the rock stands against its neighbours either side (metres, positive
  // in a cut). The city gathers where water has cut the face, thins up a rib, and its spine follows the cleft up the wall.
  const dB = 0.5, nB = Math.round((b1 - b0) / dB) + 1, yLo = S.y[0], yHi = S.y[1], dY = 6, nY = Math.round((yHi - yLo) / dY) + 1;
  const faceR = (b, y) => {
    const a = az(b), cx = Math.cos(a), cz = Math.sin(a);
    let lo = 330, hi = 0;
    for (let r = 330; r <= 520; r += 3) { if (MG.at(cx * r, cz * r) >= y) { hi = r; break; } lo = r; }
    return hi ? lo + (hi - lo) * 0.5 : 520;
  };
  const R = [];
  for (let j = 0; j < nY; j++) { const row = new Float32Array(nB); for (let i = 0; i < nB; i++) row[i] = faceR(b0 + i * dB, yLo + j * dY); R.push(row); }
  const ravine = (i, j) => { // cut depth at column i, row j against the mean of columns +-8 (4 degrees) away
    let m = 0, c = 0;
    for (const o of [-8, -6, 6, 8]) { const k = i + o; if (k >= 0 && k < nB) { m += R[j][k]; c++; } }
    return c ? R[j][i] - m / c : 0;
  };
  // the spine: per row, the bearing of the deepest cut within the middle of the window; then smoothed up the wall
  const spine = new Float32Array(nY), lo0 = Math.round(4 / dB), hi0 = nB - 1 - lo0;
  for (let j = 0; j < nY; j++) {
    let best = -1e9, bi = (lo0 + hi0) >> 1;
    for (let i = lo0; i <= hi0; i++) { const v = ravine(i, j) - Math.abs(i - ((lo0 + hi0) >> 1)) * 0.06; if (v > best) { best = v; bi = i; } }
    spine[j] = bi;
  }
  for (let pass = 0; pass < 6; pass++) for (let j = 0; j < nY; j++) spine[j] = (spine[Math.max(0, j - 1)] + 2 * spine[j] + spine[Math.min(nY - 1, j + 1)]) / 4;
  // (the cleft is straight where water ran straight; the city wanders off it a little, as a stair wanders)
  const spineAt = (y) => { const f = Math.max(0, Math.min(nY - 1.001, (y - yLo) / dY)), j = Math.floor(f); return b0 + dB * (spine[j] + (spine[j + 1] - spine[j]) * (f - j)) + 1.6 * Math.sin(y / 31) + 0.9 * Math.sin(y / 13 + 1); };
  // a tributary: from the cleft's waist a second, thinner run climbs away to the left and ends short of the crest
  const brY0 = yLo + 0.4 * (yHi - yLo), brY1 = yLo + 0.9 * (yHi - yLo);
  const branchAt = (y) => spineAt(y) - 9.5 * Math.pow((y - brY0) / (brY1 - brY0), 0.8);
  const ravAt = (b, y) => { const i = Math.max(0, Math.min(nB - 1, Math.round((b - b0) / dB))), j = Math.max(0, Math.min(nY - 1, Math.round((y - yLo) / dY))); return ravine(i, j); };
  // the outline, from the foot: broad and dense at the bottom, a pinched waist, a swollen lobe, then a thin finger of light up
  // the cleft to near the crest; it leans with the spine. Half-width in degrees.
  const half = (y) => { const u = (y - yLo) / (yHi - yLo); return 1.1 + 4.4 * Math.exp(-(((u - 0.12) / 0.14) ** 2)) + 2.6 * Math.exp(-(((u - 0.52) / 0.16) ** 2)) + 0.5 * u; };
  const dens = (y) => { const u = (y - yLo) / (yHi - yLo); return 0.25 + 0.75 * Math.exp(-(((u - 0.14) / 0.28) ** 2)) + 0.35 * Math.exp(-(((u - 0.55) / 0.12) ** 2)); };
  // dark bays: ovals inside the body where nothing is lit (a collapsed quarter, a blind stair)
  const voids = [[0.00, 0.32, 1.3, 16], [1.6, 0.58, 1.0, 11], [-1.2, 0.80, 0.8, 10], [2.2, 0.14, 0.9, 9]]
    .map(([db, u, rb, ry]) => [db, yLo + u * (yHi - yLo), rb, ry]);
  const inVoid = (b, y) => voids.some(([db, vy, rb, ry]) => ((b - spineAt(vy) - db) / rb) ** 2 + ((y - vy) / ry) ** 2 < 1);
  const warmPick = () => { let c; do c = colorPick(); while (c > 3); return c; }; // the two main colours of the city are warm; the cold ones come only as the odd exception
  let c1 = warmPick(), c2 = warmPick(); while (c2 === c1) c2 = warmPick();
  // the city: windows in terraces. Rows run level along the couloir's flanks every 7 m, windows at one spacing so they stack
  // in columns (rows and stacks with dark wall between), broad at the foot and narrowing up the cleft; runs of bays are dark;
  // the lit fraction falls with height until only strings and outliers remain.
  const step = arcDeg(4.1), RANGE = yHi - yLo;
  const terrace = (y, cen, hw, lit, ci, ci2, sz) => {
    const tip = (rng() - 0.5) * 0.5;
    let skip = 0;
    for (let k = Math.ceil(-hw / step); k * step <= hw; k++) {
      if (skip > 0) { skip--; continue; }
      if (rng() < 0.07) { skip = 1 + Math.floor(rng() * 4); continue; } // a dark run of bays
      if (rng() > lit) continue;
      const b = cen + k * step + (rng() - 0.5) * 0.08;
      if (inVoid(b, y)) continue;
      place(b, y + tip * k * step + (rng() - 0.5) * 0.4, rng() < 0.12 ? colorPick() : rng() < 0.3 ? ci2 : ci, sz * (0.85 + 0.3 * rng()) * (1.2 - 0.45 * (y - yLo) / RANGE), 0, rng() < 0.33 ? 0.5 : 1);
    }
  };
  for (let y = yLo + 3; y < yLo + 0.7 * RANGE; y += 5.2 + rng() * 0.8) {
    const u = (y - yLo) / RANGE;
    // the width of the lit quarter: broad low, pinched at the waist, a second swelling, then the finger
    const hw = 1.6 + 5.8 * Math.exp(-(((u - 0.3) / 0.2) ** 2)) + 2.4 * Math.exp(-(((u - 0.56) / 0.1) ** 2)) + 0.5 * (1 - u);
    const lit = Math.max(0.25, 0.98 - 0.8 * u);
    terrace(y, spineAt(y) + (rng() - 0.5) * 0.6, hw, lit, u < 0.42 ? c1 : c2, c1 === c2 ? warmPick() : c1, 3.7);
  }
  // the finger and what is above it: single strings up the cleft, a window to a row
  for (let y = yLo + 0.7 * RANGE; y < yHi - 6; y += 12 + rng() * 6) terrace(y, spineAt(y), 0.6 + 1.0 * rng(), 0.7, c2, c2, 3.3);
  // the tributary: a thinner stair of terraces climbing away to the left
  for (let y = brY0; y < brY1; y += 8 + rng() * 2) {
    const t = (y - brY0) / (brY1 - brY0);
    terrace(y, branchAt(y), 2.8 - 1.9 * t, 0.9 - 0.6 * t, c2, c2, 3.5);
  }
  // a ledge: a thread of lamps strung along a ledge that runs out to the right and climbs, thinning as it goes, with one gap
  {
    const sy = yLo + 0.3 * RANGE, sb = spineAt(sy) + 3.2, ci = warmPick();
    for (let k = 0, b = sb, y = sy; k < 46 && b < b1 - 0.4; k++, b += step * (1 + 0.5 * rng()), y += 0.55 + (rng() - 0.5) * 0.9) {
      if (k > 24 && rng() < 0.45) continue;                      // fading out
      if (k > 12 && k < 17) continue;                             // a gap where the ledge has fallen
      place(b, y, rng() < 0.08 ? colorPick() : ci, 3.3);
    }
  }
  // outliers: single lights far up and far out, on their own (a watch-room, a hermit's window)
  for (let k = 0; k < 9; k++) {
    const y = yLo + (0.7 + 0.3 * rng()) * RANGE, side = rng() < 0.5 ? -1 : 1;
    place(spineAt(y) + side * (3 + rng() * 6), y, colorPick(), 4.2);
  }
  // the great opening: one tall lit arch in the face at the heart of the dense quarter, where the eye goes first
  for (let t = 0; t < 40 && !P.some((q) => q.kind === 1); t++) {
    const y = yLo + 0.33 * RANGE + (rng() - 0.5) * 14;
    place(spineAt(y) + (rng() - 0.5) * 1.2, y, 0, 15, 1, 1);
  }
  const NALL = P.length;

  // the order they go out in: a fixed seeded shuffle
  const order = Array.from({ length: NALL }, (_, i) => i);
  const orng = ctx.makeRng(5518);
  for (let i = NALL - 1; i > 0; i--) { const j = Math.floor(orng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const rank = new Float32Array(NALL);
  order.forEach((idx, r) => { rank[idx] = P[idx].kind ? 1e6 : r; });

  // low draws every other lamp; ranks stay the high set's, so the k-th lamp to go out is the same lamp on every tier
  const keep = P.map((_, i) => i).filter((i) => !P[i].kind && (!low || i % 2 === 0)); // the great opening is a mesh, below
  const N = keep.length;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), meta = new Float32Array(N * 3);
  keep.forEach((src, i) => {
    const p = P[src];
    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
    const c = PALETTE[p.ci][1]; col[i * 3] = c[0] * p.dim; col[i * 3 + 1] = c[1] * p.dim; col[i * 3 + 2] = c[2] * p.dim;
    meta[i * 3] = p.size; meta[i * 3 + 1] = rank[src]; meta[i * 3 + 2] = rng();
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aMeta', new THREE.BufferAttribute(meta, 3));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(S.x, 140, S.z), 260);

  const U = { uTime: { value: 0 }, uDark: { value: seen0 }, uH: { value: 720 } };
  const vs = /* glsl */`
    uniform float uTime, uDark, uH;
    attribute vec3 aCol, aMeta;
    varying vec3 vCol; varying float vA, vWin, vKind, vNear; varying vec2 vShape;
    #include <fog_pars_vertex>
    float h11(float n) { return fract(sin(n * 127.1) * 43758.5453); }
    void main() {
      vec3 transformed = position;
      vec4 mvPosition = viewMatrix * vec4(position, 1.0);
      #include <fog_vertex>
      float depth = -mvPosition.z;
      // a metre or two toward the eye so the rock's own mesh never swallows a light 0.3-0.5 m off it
      gl_Position = projectionMatrix * (mvPosition + vec4(0.0, 0.0, 2.0, 0.0));
      float sc = uH * 0.5 * projectionMatrix[1][1], px = uH / 720.0;
      float phys = aMeta.x * sc / max(depth, 1.0);
      // a window (0.68 as wide as tall) held to 4.5-10 px tall; its point is 2.4 times that so the sill and the glow round
      // it have room, and never over 60 px (some GPUs clamp points at 64): the window is then what fits
      // v11-F2: nearer than ~250 m a window is a small thing with a warm core, not a slab: its cap falls from 10 px at 250 m
      // to 5.5 px inside 60 m, and its fill dims with it (vNear 0 close, 1 far)
      float near = smoothstep(60.0, 250.0, depth);
      float win = clamp(phys, 4.5 * px, mix(5.5, 10.0, near) * px);
      float ps = min(win * 2.4, 60.0);
      win = ps / 2.4;
      float s = win;
      gl_PointSize = ps;
      vWin = win; vKind = 0.0; vNear = near;
      // unequal windows: width and height vary by lamp, and one in six is shuttered to a thin line
      float hz = h11(aMeta.z * 53.3 + 7.0), hw = h11(aMeta.z * 17.9 + 2.0);
      vShape = vec2(0.24 + 0.2 * hw, hz > 0.84 ? 0.08 : 0.34 + 0.2 * h11(aMeta.z * 29.1));
      // a slow flicker of its own: two incommensurate sines on a hash of the index, and now and then a brief sag
      float i = aMeta.z * 91.7;
      float fl = 0.80 + 0.20 * sin(uTime * (0.25 + 0.5 * h11(i)) + i * 6.28) * sin(uTime * (0.11 + 0.2 * h11(i + 3.0)) + i * 3.1);
      float sag = step(0.992, sin(uTime * (0.07 + 0.05 * h11(i + 5.0)) + i * 9.0) * 0.5 + 0.5);
      fl *= 1.0 - 0.6 * sag;
      // gone: rank < dark. The one going out this gutter fades and stutters over its last second or two
      float go = clamp(uDark - aMeta.y, 0.0, 1.0);
      float stut = go > 0.0 && go < 1.0 ? 0.5 + 0.5 * sin(go * 60.0 + i) : 1.0;
      float lit = (1.0 - smoothstep(0.35, 1.0, go)) * stut;
      // energy: a window smaller than its dot is dimmer than the dot would be
      float k = pow(min(1.0, phys / s), 0.5);
      if (lit <= 0.0) gl_PointSize = 0.0;
      vA = fl * lit * mix(0.5, 1.0, k) * 2.6 * mix(0.36, 1.0, near * near);
      vCol = mix(aCol, aCol * aCol, 0.5);
    }`;
  const fs = /* glsl */`
    varying vec3 vCol; varying float vA, vWin, vKind, vNear; varying vec2 vShape;
    ${fogPars}
    void main() {
      ${fogAtten}
      // p in window heights, the window centred (the great one's top an arch)
      vec2 p = (vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y) - 0.5) * 2.4;
      float hx = vKind > 0.5 ? 0.34 : vShape.x, hy = vKind > 0.5 ? 0.5 : vShape.y;
      vec2 q = abs(p) - vec2(hx, hy);
      float sd = max(q.x, q.y);
      if (vKind > 0.5 && p.y > 0.5 - hx) sd = length(vec2(p.x, p.y - (0.5 - hx))) - hx; // the arch
      float ew = 0.6 / vWin;
      float inside = 1.0 - smoothstep(-ew, ew, sd);
      // a lit room seen through a hole: a warm core where the lamp stands (low in the opening), the room's far wall dimmer,
      // dark towards the reveal; near, the fill is held down and the core carries the window (never a flat bright slab)
      vec2 lc = (p - vec2(0.0, -0.18 * hy)) / vec2(hx, hy);
      float core = exp(-dot(lc, lc) * 2.2);
      float fill = mix(0.30, 0.62, vNear);
      float glowy = fill + (1.0 - fill) * core;
      float mull = 1.0;
      if (vKind > 0.5) mull = smoothstep(0.02, 0.05, abs(p.x)) * smoothstep(0.02, 0.05, abs(p.y + 0.12));
      else if (vWin > 6.5 && hy > 0.2) mull = 1.0 - 0.7 * (1.0 - smoothstep(0.012, 0.035, abs(p.x))); // a thin mullion in the larger ones
      float lum = inside * glowy * mull;
      // the wall it sits in: a dark sill and reveal round it, and a soft warm glow spilling on the rock beside it
      float reveal = (1.0 - smoothstep(0.02, 0.17, sd)) * (1.0 - inside);
      float spill = (1.0 - smoothstep(0.55, 1.2, length(p)));
      float halo = exp(-max(sd, 0.0) * 3.4) * (1.0 - inside) * step(0.0, sd) * 0.30 * spill;
      float vis = 0.5 + 0.5 * fogAtten;
      vec3 warm = vCol * vec3(1.0, 0.78, 0.55); // the rock's glow is warmer than the lamp
      vec3 c = (vCol * lum * vA + mix(warm, vCol, vNear * 0.5) * halo * vA * 0.7) * vis;
      gl_FragColor = vec4(c, reveal * 0.55 * fogAtten);
    }`;
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, U]), vertexShader: vs, fragmentShader: fs, fog: true,
    // premultiplied: the reveal darkens the rock (alpha, no colour), the window and glow add
    transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  Object.assign(mat.uniforms, U);
  mat.customProgramCacheKey = () => 'escarpment-lamps-v11f2';
  const blend = { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor };
  const points = new THREE.Points(geo, mat);
  points.name = 'escarpment-lamps'; points.frustumCulled = true; points.renderOrder = 24;
  points.onBeforeRender = (r) => { U.uH.value = r.domElement.height; };
  scene.add(points);

  // the great opening: one tall lit arch (15 m) in the face, a quad with the windows' look (a point would be over any GPU's
  // size limit), set 1.5 m off the rock facing out; the shader nudges it 3 m toward the eye as the points are
  const great = P.find((q) => q.kind === 1);
  if (great) {
    const n = new THREE.Vector3(...great.n).normalize(), xa = new THREE.Vector3(0, 1, 0).cross(n).normalize(), ya = n.clone().cross(xa);
    const gm = new THREE.Mesh(new THREE.PlaneGeometry(great.size * 2.4, great.size * 2.4), new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uH: U.uH, uTime: U.uTime, uCol: { value: new THREE.Vector3(...PALETTE[great.ci][1]) } }]),
      vertexShader: /* glsl */`
        uniform float uH, uTime; uniform vec3 uCol;
        varying vec3 vCol; varying float vA, vWin, vKind, vNear; varying vec2 vShape; varying vec2 vUv;
        #include <fog_pars_vertex>
        void main() {
          vec3 transformed = position;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          #include <fog_vertex>
          vec4 centre = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          gl_Position = projectionMatrix * (mvPosition + vec4(0.0, 0.0, 3.0, 0.0));
          vUv = uv; vKind = 1.0; vNear = 1.0; vShape = vec2(0.34, 0.5);
          vWin = max(${great.size.toFixed(2)} * uH * 0.5 * projectionMatrix[1][1] / max(-centre.z, 1.0), 2.0);
          vA = 2.0 * (0.9 + 0.1 * sin(uTime * 0.4));
          vCol = mix(uCol, uCol * uCol, 0.5);
        }`,
      fragmentShader: fs.replace('varying vec3 vCol;', 'varying vec2 vUv; varying vec3 vCol;').replace('gl_PointCoord', 'vUv'),
      fog: true, ...blend,
    }));
    gm.matrixAutoUpdate = false;
    gm.matrix.makeBasis(xa, ya, n).setPosition(great.x + n.x * 1.5, great.y + n.y * 1.5 + great.size * 0.1, great.z + n.z * 1.5);
    gm.name = 'escarpment-lamps-great'; gm.frustumCulled = false; gm.renderOrder = 24;
    gm.material.customProgramCacheKey = () => 'escarpment-lamps-great';
    scene.add(gm);
  }

  // ---- the gutter: each falling edge through 0.85 puts out the next lamp, and it stays out
  const flick = ctx.sky.flicker;
  const S_ = { seen: seen0, armed: true, shown: seen0 };
  const api = {
    get dark() { return S_.seen; },
    gutter() { S_.seen = Math.min(NALL, S_.seen + 1); },
    order, position: (i, out) => out.set(P[i].x, P[i].y, P[i].z),
    stats: () => ({ n: N, placed: NALL, tries, rejected: { ...rej }, dark: Math.min(NALL, S_.seen), colours: PALETTE.map((p) => p[0]) }),
  };
  ctx.lamps = api;
  ctx.registerUpdate((dt, t) => {
    const v = flick.value;
    if (S_.armed && v < 0.85) { S_.armed = false; api.gutter(); }
    else if (!S_.armed && v > 0.95) S_.armed = true;
    // the lamp that has just gone ease out over ~2 s (dt covers the skipped time)
    const to = Math.min(NALL, S_.seen);
    S_.shown += Math.max(-1, Math.min(1, (to - S_.shown))) * Math.min(1, dt * 0.6) ;
    if (Math.abs(to - S_.shown) < 0.005) S_.shown = to;
    U.uDark.value = S_.shown; U.uTime.value = t;
  }, { at: () => S, near: 150, hz: 4 });
  U.uDark.value = seen0;
  ctx.log?.(`lamps: ${N} placed in ${tries} tries; rejected ${JSON.stringify(rej)}`);
}
