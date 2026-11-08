// AO The Escarpment Lamps [Decided: "Yes, multi-coloured lights, not all warm."] (IDEAS-v4.md AO; wilderness-v4.md; site in
// wilderness-v4-placement.md, key `lamps`: the north-west wall's face at bearings 300-318, 60-220 m up, in the part the sun never
// reaches; wilderness-v5.md "### AO"). High on the west massif, a scatter of hundreds of tiny window-lights, far too high and
// too many for anything on the floor. Each time the sun gutters, one of them goes out and stays out for the session: over a long
// walk the wall gets darker. No inhabitants, no story: windows, in rows.
//
// One Points draw. Placement is a seeded rng with the rendered mesh's height (makeGround) so each light sits 0.3-0.5 m off the rock in
// the steep band: loose horizontal runs (storeys), two dense knots, a few lone ones high up. A light the sun would reach (face
// normal toward the sun), on the scree apron, or on a slope under 50 degrees is rejected. The shader draws a soft dot sized by distance
// but held to 2.6-4.5 px (720p-relative), dimmed by the wall's own haze (fogAtten), with a slow flicker from a hash of the index
// and time. The gutter's falling edge (ctx.sky.flicker through 0.85) puts out the next lamp in a fixed seeded order; the update
// sets two uniforms (time, the dark count) at 4 Hz. `?lamps=0` leaves them out; `?lamps=dark=N` starts with N already out.
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
  const arcDeg = (m) => m / (D2R * 425); // metres along the arc at r 425, in degrees
  // storeys: long rows with gaps, each a mostly one colour, on a line that tips with the bedding
  const rows = 10;
  for (let i = 0; i < rows; i++) {
    const y0 = S.y[0] + 6 + (S.y[1] - S.y[0] - 12) * (i + rng() * 0.9) / rows;
    const len = 22 + Math.floor(rng() * 22), step = arcDeg(4.5 + rng() * 4), tip = (rng() - 0.5) * 1.6;
    const start = b0 + 0.5 + rng() * (b1 - b0 - 6), ci = colorPick();
    for (let k = 0, b = start, skip = 0; k < len && b < b1; k++, b += step * (0.7 + rng() * 0.8)) {
      if (skip > 0) { skip--; continue; }
      if (rng() < 0.06) { skip = 1 + Math.floor(rng() * 3); continue; }  // a dark bay
      place(b, y0 + tip * (b - start) + (rng() - 0.5) * 0.5, rng() < 0.1 ? colorPick() : ci, 0.3 + 0.3 * rng());
    }
  }
  // two dense knots (a block lit floor over floor)
  for (let n = 0; n < 2; n++) {
    const cb = b0 + 4 + rng() * (b1 - b0 - 8), cy = S.y[0] + 30 + rng() * (S.y[1] - S.y[0] - 60), ci = colorPick(), cnt = 44;
    for (let k = 0; k < cnt; k++) place(cb + (rng() - 0.5) * arcDeg(46), cy + (rng() - 0.5) * 34, rng() < 0.25 ? colorPick() : ci, 0.3 + 0.3 * rng());
  }
  // lone ones, high up, and a thin scatter to fill the rest to the budget
  for (let k = 0; k < 5; k++) place(b0 + rng() * (b1 - b0), S.y[1] - 22 + rng() * 22, colorPick(), 0.45);
  for (let g = 0; P.length < want * 0.9 && g < want * 20; g++) place(b0 + rng() * (b1 - b0), S.y[0] + rng() * (S.y[1] - S.y[0]), colorPick(), 0.3 + 0.3 * rng());
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
