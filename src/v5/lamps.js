// AO The Escarpment Lamps [Decided: "Yes, multi-coloured lights, not all warm."] (plans/IDEAS-v4.md AO; plans/wilderness-v5.md "### AO").
// On the south massif's north face (bearings 190-218, 60-240 m up), over the Great Span's road and away from the sun's glare: a
// city of windows far too high and too many for anything on the floor, no inhabitants and no story. v11 moved it off the west
// wall (it stood beside the Galleries, two rectangles of one size) and gave it the shape of a place built into a ravine: the
// spine follows the deepest cleft of the rendered face up the wall (found from the mesh, so it follows the rock if the rock
// changes), broad and dense at the foot, a pinched waist, a swollen lobe, a thin finger to near the crest; a tributary climbs
// away to the left; a thread of lamps strings out along a ledge to the right with a gap where it has fallen; a dense quarter
// of lit floors at the foot of the waist; dark bays inside the body; single outliers high up. Lamps thin up the ribs
// between the clefts. Each sits 0.3-0.5 m off the rock. A light the sun would reach (face normal toward the sun), on the scree
// apron, or on a slope under 50 degrees is rejected.
// Each time the sun gutters, one of them goes out and stays out for the session: over a long walk the wall gets darker.
// One Points draw. The shader draws a soft dot sized by distance but held to 2.6-4.5 px (720p-relative), dimmed by the wall's own
// haze (fogAtten), with a slow flicker from a hash of the index and time. The gutter's falling edge (ctx.sky.flicker through
// 0.85) puts out the next lamp in a fixed seeded order; the update sets two uniforms (time, the dark count) at 4 Hz.
// `?lamps=0` leaves them out; `?lamps=dark=N` starts with N already out.
// `ctx.lamps`: `stats()`, `dark` (count seen), `gutter()` (as if the sun had guttered).
import * as THREE from 'three';
import { SITES, SUN } from '../world.js';
import { makeGround } from '../fauna/uncanny/kit.js';
import { fogPars, fogAtten, softDot } from '../particles/shaderParts.js';

const PARAM = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('lamps') : null;
const D2R = Math.PI / 180;
export const PALETTE = [ // dim colours, weighted toward the warm
  ['amber', [1.0, 0.62, 0.22], 0.30],
  ['sodium', [1.0, 0.42, 0.07], 0.22],
  ['rose', [1.0, 0.40, 0.50], 0.14],
  ['green-white', [0.72, 1.0, 0.82], 0.12],
  ['cold blue', [0.42, 0.60, 1.0], 0.12],
  ['violet', [0.64, 0.38, 1.0], 0.10],
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
  function place(b, y, ci, size) {
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
    // the sun never reaches this face: a light whose rock faces the sun (3-D normal . sun direction > 0) is rejected
    if (tmp.x * SUN.dir.x + tmp.y * SUN.dir.y + tmp.z * SUN.dir.z > 0) { rej.sun++; return false; }
    const proud = 0.3 + 0.2 * rng();
    P.push({ x: x + tmp.x * proud, y: y + tmp.y * proud, z: z + tmp.z * proud, ci, size, });
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
  let c1 = colorPick(), c2 = colorPick(); while (c2 === c1) c2 = colorPick();
  // the body: scatter weighted by the outline, the cleft and the dark bays; the low quarter in one colour, the lobe in another
  for (let g = 0; P.length < 380 && g < 30000; g++) {
    const y = yLo + Math.pow(rng(), 1.25) * (yHi - yLo);
    if (rng() > dens(y)) continue;
    const b = spineAt(y) + gauss() * half(y) * 0.55;
    const rv = ravAt(b, y);
    if (rng() > 0.28 + 0.72 * Math.max(0, Math.min(1, (rv + 1) / 7))) continue; // thins up a rib
    if (inVoid(b, y)) continue;
    const u = (y - yLo) / (yHi - yLo);
    place(b, y, rng() < 0.22 ? colorPick() : u < 0.34 ? c1 : u < 0.7 ? c2 : colorPick(), 0.3 + 0.3 * rng());
  }
  // the branch: a thin run, one colour, with its own dark bays
  for (let g = 0, n = 0; n < 56 && g < 3000; g++) {
    const y = brY0 + rng() * (brY1 - brY0), t = (y - brY0) / (brY1 - brY0);
    const b = branchAt(y) + gauss() * (1.5 - 0.8 * t);
    if (rng() < 0.18 + 0.5 * t) continue;
    if (Math.sin(y / 9) > 0.55 && rng() < 0.8) continue; // bays in its length
    if (place(b, y, rng() < 0.15 ? colorPick() : c2, 0.3 + 0.3 * rng())) n++;
  }
  // the dense quarter: a knot at the foot of the waist, rows of lit floors tight to the cleft's left wall
  {
    const cy = yLo + 0.2 * (yHi - yLo), cb = spineAt(cy) - 2.2;
    for (let k = 0; k < 70; k++) place(cb + gauss() * 1.7, cy + gauss() * 12, rng() < 0.2 ? colorPick() : c1, 0.35 + 0.3 * rng());
  }
  // a ledge: a thread of lamps strung along a ledge that runs out to the right and climbs, thinning as it goes, with one gap
  {
    const sy = yLo + 0.4 * (yHi - yLo), sb = spineAt(sy) + 3, ci = colorPick();
    for (let k = 0, b = sb, y = sy; k < 46 && b < b1 - 0.4; k++, b += arcDeg(5 + 3 * rng()), y += 0.55 + (rng() - 0.5) * 0.9) {
      if (k > 24 && rng() < 0.45) continue;                      // fading out
      if (k > 12 && k < 17) continue;                             // a gap where the ledge has fallen
      place(b, y, rng() < 0.08 ? colorPick() : ci, 0.3 + 0.25 * rng());
    }
  }
  // outliers: single lights far up and far out, on their own (a watch-room, a hermit's window)
  for (let k = 0; k < 9; k++) {
    const y = yLo + (0.72 + 0.28 * rng()) * (yHi - yLo), side = rng() < 0.5 ? -1 : 1;
    place(spineAt(y) + side * (3 + rng() * 6), y, colorPick(), 0.45);
  }
  for (let g = 0; P.length < want * 0.85 && g < want * 20; g++) { // a few strays to fill the count, inside the outline
    const y = yLo + rng() * (yHi - yLo) * 0.8, b = spineAt(y) + (rng() - 0.5) * 2 * half(y);
    if (!inVoid(b, y)) place(b, y, colorPick(), 0.3 + 0.3 * rng());
  }
  const NALL = P.length;

  // the order they go out in: a fixed seeded shuffle
  const order = Array.from({ length: NALL }, (_, i) => i);
  const orng = ctx.makeRng(5518);
  for (let i = NALL - 1; i > 0; i--) { const j = Math.floor(orng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const rank = new Float32Array(NALL);
  order.forEach((idx, r) => { rank[idx] = r; });

  // low draws every other lamp; ranks stay the high set's, so the k-th lamp to go out is the same lamp on every tier
  const keep = P.map((_, i) => i).filter((i) => !low || i % 2 === 0);
  const N = keep.length;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), meta = new Float32Array(N * 3);
  keep.forEach((src, i) => {
    const p = P[src];
    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
    const c = PALETTE[p.ci][1]; col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
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
    varying vec3 vCol; varying float vA;
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
      float s = clamp(phys, 2.6 * px, 4.5 * px);
      gl_PointSize = s;  // (set to 0 below when the lamp is out)
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
      vA = fl * lit * mix(0.5, 1.0, k) * 3.4;
      vCol = mix(aCol, aCol * aCol, 0.5);
    }`;
  const fs = /* glsl */`
    varying vec3 vCol; varying float vA;
    ${fogPars}
    ${softDot}
    void main() {
      ${fogAtten}
      float d = softDot(gl_PointCoord);
      gl_FragColor = vec4(vCol * d * vA * (0.5 + 0.5 * fogAtten), 1.0);
    }`;
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, U]), vertexShader: vs, fragmentShader: fs, fog: true,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  Object.assign(mat.uniforms, U);
  mat.customProgramCacheKey = () => 'escarpment-lamps';
  const points = new THREE.Points(geo, mat);
  points.name = 'escarpment-lamps'; points.frustumCulled = true; points.renderOrder = 24;
  points.onBeforeRender = (r) => { U.uH.value = r.domElement.height; };
  scene.add(points);

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
