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
// 250 m, capped lower with its fill and brightness dimmed so no window is a flat slab, and inside 160 m it grows again to
// 25 px, drawn as a room: a back wall that slides with the eye's parallax in a dark reveal, a lit sill, a heavy lintel, the lamp's pool
// of light low and to one side, now and then a shadow of something standing within, a warm spill on the rock; widths and
// heights differ per lamp, a few are arches or slots, one in five is shuttered (a leaf shut, or louvred shut), one in eight
// gutters hard. The ledge's string is lamps on iron brackets and stone posts, unevenly spaced, some out, one gap. The palette is the world's warm lights (amber, ember, sodium, crimson) with lilac, green-white and cold blue as
// rare exceptions. The wall's own haze (fogAtten) dims them and they flicker slowly from a hash of the index and time. The gutter's falling edge (ctx.sky.flicker through
// 0.85) puts out the next lamp in a fixed seeded order; the update sets two uniforms (time, the dark count) at 4 Hz.
// `?lamps=0` leaves them out; `?lamps=dark=N` starts with N already out.
// `ctx.lamps`: `stats()`, `dark` (count seen), `gutter()` (as if the sun had guttered), `posts` (indices of the ledge's lamps).
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
  // a ledge: a path that runs out to the right and climbs, with lamps on posts along it: unevenly spaced (3 to 11 m), a few
  // out and only the post left, the run thinning at the far end, one gap where the ledge has fallen. Its own rng, so the
  // windows' layout does not move with it.
  {
    const lr = ctx.makeRng(5519);
    const sy = yLo + 0.3 * RANGE, ci = warmPick();
    let b = spineAt(sy) + 3.0, y = sy;
    for (let k = 0; k < 64 && b < b1 - 0.4; k++) {
      b += arcDeg(1.8 + 5.5 * lr() * lr() + 0.8);              // mostly short steps, now and then a long one
      y += 0.5 + (lr() - 0.5) * 1.0;
      if (k > 18 && k < 24) continue;                             // a gap where the ledge has fallen
      const fade = k > 34 ? 0.55 : 1;
      if (lr() > fade) continue;
      const out = lr() < 0.22;                                    // the lamp is out; the post stays
      place(b, y, lr() < 0.08 ? colorPick() : ci, 2.4, out ? 3 : 2, 1);
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
  order.forEach((idx, r) => { rank[idx] = P[idx].kind === 1 || P[idx].kind === 3 ? 1e6 : r; });

  // low draws every other lamp; ranks stay the high set's, so the k-th lamp to go out is the same lamp on every tier
  const keep = P.map((_, i) => i).filter((i) => P[i].kind !== 1 && (!low || i % 2 === 0 || P[i].kind >= 2)); // the great opening is a mesh, below
  const N = keep.length;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), meta = new Float32Array(N * 3), nor = new Float32Array(N * 3), kin = new Float32Array(N);
  keep.forEach((src, i) => {
    const p = P[src];
    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
    const c = PALETTE[p.ci][1]; col[i * 3] = c[0] * p.dim; col[i * 3 + 1] = c[1] * p.dim; col[i * 3 + 2] = c[2] * p.dim;
    meta[i * 3] = p.size; meta[i * 3 + 1] = rank[src]; meta[i * 3 + 2] = rng();
    nor.set(p.n, i * 3); kin[i] = p.kind;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aMeta', new THREE.BufferAttribute(meta, 3));
  geo.setAttribute('aN', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('aKind', new THREE.BufferAttribute(kin, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(S.x, 140, S.z), 260);

  const U = { uTime: { value: 0 }, uDark: { value: seen0 }, uH: { value: 720 } };
  // vKind: 0 a window (vSub says which), 1 the great opening, 2 a lamp on a post, 3 a post with its lamp out
  // vSub (windows, from a hash of the lamp): 0 a plain opening, 1 arched, 2 a slot, 3 shuttered, a leaf closed, 4 louvred shut
  const vs = /* glsl */`
    uniform float uTime, uDark, uH;
    attribute vec3 aCol, aMeta, aN; attribute float aKind;
    varying vec3 vCol; varying float vA, vWin, vKind, vNear, vSub, vSeed; varying vec2 vShape, vShift;
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
      // a window held to 4.5-10 px tall; its point is 2.4 times that so the sill and the glow round it have room, and never
      // over 60 px (some GPUs clamp points at 64): the window is then what fits.
      // v11-F2: nearer than ~250 m a window is a small thing with a warm core, not a slab: its cap falls from 10 px at 250 m
      // to 7 px at 160 m, and its fill dims with it (vNear 0 close, 1 far).
      // v11.1-W3: inside 160 m it grows again (the walk ends about 100 m from the foot: r 348 against a wall at r 420 and
      // up), to 13 px at 100 m, 19 px at 45 m and 25 px (a 60 px point) inside 15 m, because what is drawn there is a room (a back wall, reveal faces that
      // slide as you walk, a sill, a lintel, a shadow within), not a lit patch; vNear still dims the fill.
      float near = smoothstep(60.0, 250.0, depth);
      float close = 1.0 - smoothstep(30.0, 160.0, depth);
      float cap = mix(7.0, 10.0, near) + 12.0 * close + 6.0 * (1.0 - smoothstep(15.0, 45.0, depth));
      if (aKind > 1.5) cap = cap * 1.35 + 2.0; // a post and its lantern need the room to show
      float win = clamp(phys, 4.5 * px, cap * px);
      float ps = min(win * 2.4, 60.0);
      win = ps / 2.4;
      float s = win;
      gl_PointSize = ps;
      vWin = win; vKind = aKind; vNear = near; vSeed = aMeta.z;
      // unequal windows: width and height vary by lamp; a few are arches, a few slots, a few shuttered
      float hz = h11(aMeta.z * 53.3 + 7.0), hw = h11(aMeta.z * 17.9 + 2.0), sub = h11(aMeta.z * 31.7 + 11.0);
      vSub = sub < 0.52 ? 0.0 : sub < 0.70 ? 1.0 : sub < 0.80 ? 2.0 : sub < 0.90 ? 3.0 : 4.0;
      vShape = vec2(0.24 + 0.2 * hw, 0.34 + 0.2 * h11(aMeta.z * 29.1));
      if (vSub > 0.5 && vSub < 1.5) vShape = vec2(0.27 + 0.08 * hw, 0.5);
      if (vSub > 1.5 && vSub < 2.5) vShape = vec2(0.10 + 0.04 * hw, 0.52);
      // the depth of the wall: the room's back wall stands 1.3 m behind the opening, and slides across it as the eye moves
      vec3 nv = mat3(viewMatrix) * aN;
      vec2 sh = -(nv.xy - nv.z * mvPosition.xy / mvPosition.z) * 1.3 / aMeta.x;
      vShift = clamp(sh, vec2(-0.3), vec2(0.3)) * 0.5;
      // a slow flicker of its own: two incommensurate sines on a hash of the index, and now and then a brief sag
      float i = aMeta.z * 91.7;
      float fl = 0.80 + 0.20 * sin(uTime * (0.25 + 0.5 * h11(i)) + i * 6.28) * sin(uTime * (0.11 + 0.2 * h11(i + 3.0)) + i * 3.1);
      float sag = step(0.992, sin(uTime * (0.07 + 0.05 * h11(i + 5.0)) + i * 9.0) * 0.5 + 0.5);
      fl *= 1.0 - 0.6 * sag;
      // one in eight is guttering: it gutters hard and fast, and is down to a red coal a third of the time
      if (hw > 0.875) fl *= 0.25 + 0.75 * smoothstep(0.1, 0.9, sin(uTime * (1.3 + 1.7 * h11(i + 8.0)) + i) * sin(uTime * 0.37 + i * 2.0) * 0.5 + 0.5);
      // gone: rank < dark. The one going out this gutter fades and stutters over its last second or two
      float go = clamp(uDark - aMeta.y, 0.0, 1.0);
      float stut = go > 0.0 && go < 1.0 ? 0.5 + 0.5 * sin(go * 60.0 + i) : 1.0;
      float lit = (1.0 - smoothstep(0.35, 1.0, go)) * stut;
      // energy: a window smaller than its dot is dimmer than the dot would be
      float k = pow(min(1.0, phys / s), 0.5);
      if (aKind > 2.5) lit = 1.0; // a post stands lit or not
      vA = fl * lit * mix(0.5, 1.0, k) * 2.6 * mix(0.5, 1.0, near * near);
      if (aKind > 1.5) vA = fl * lit * 2.2 * mix(0.6, 1.0, near);
      vCol = mix(aCol, aCol * aCol, 0.5);
    }`;
  const FS_HEAD = /* glsl */`
    varying vec3 vCol; varying float vA, vWin, vKind, vNear, vSub, vSeed; varying vec2 vShape, vShift;
    ${fogPars}
    float h11(float n) { return fract(sin(n * 127.1) * 43758.5453); }
    // an opening: a rectangle, or an arch (the top a half round), as a signed distance in window heights
    float opening(vec2 p, float hx, float hy, bool arch) {
      vec2 q = abs(p) - vec2(hx, hy);
      float sd = max(q.x, q.y);
      if (arch && p.y > hy - hx) sd = length(vec2(p.x, p.y - (hy - hx))) - hx;
      return sd;
    }`;
  const fs = FS_HEAD + /* glsl */`
    void main() {
      ${fogAtten}
      // p in window heights, the window centred
      vec2 p = (vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y) - 0.5) * 2.4;
      float vis = 0.5 + 0.5 * fogAtten;
      float ew = 0.6 / vWin;
      if (vKind > 1.5) {
        // a lamp along the path, one of two kinds by its seed: an iron bracket out of the rock (an arm, a brace under it, the
        // lantern hung from its end), or a squat stone post with the lantern set on top. Out: the iron or the stone only. The
        // iron and stone are dark against the rock (alpha); the flame and its glow add, and the metal near it takes some light.
        float side = vSeed > 0.5 ? 1.0 : -1.0;
        vec2 q = vec2(p.x * side, p.y);
        bool bracket = fract(vSeed * 7.0) < 0.5;
        vec2 lc = bracket ? vec2(0.20, 0.02) : vec2(0.0, -0.06);
        float body;
        if (bracket) {
          float arm = (1.0 - smoothstep(0.02, 0.04, abs(q.y - 0.26))) * step(-0.30, q.x) * step(q.x, 0.20);
          float diag = (1.0 - smoothstep(0.02, 0.045, abs(q.y - (0.26 - (0.05 - q.x) * 0.9)) )) * step(-0.30, q.x) * step(q.x, 0.05) * step(q.y, 0.27);
          float plate = (1.0 - smoothstep(0.04, 0.07, abs(q.x + 0.31))) * step(abs(q.y - 0.12), 0.2);
          float chain = (1.0 - smoothstep(0.012, 0.03, abs(q.x - 0.20))) * step(0.12, q.y) * step(q.y, 0.27);
          body = max(max(arm, diag), max(plate, chain));
        } else {
          float stump = (1.0 - smoothstep(0.075, 0.1, abs(q.x))) * step(-0.52, q.y) * step(q.y, -0.12);
          float cap = (1.0 - smoothstep(0.1, 0.13, abs(q.x))) * step(-0.17, q.y) * step(q.y, -0.11);
          body = max(stump, cap);
        }
        vec2 d = (q - lc) / vec2(0.085, 0.11);
        float cage = (1.0 - smoothstep(0.85, 1.05, length(d))) ;
        float ring = cage * smoothstep(0.55, 0.8, length(d)); // the cage's bars, round the flame
        body = max(body, ring * 0.9);
        float flame = exp(-dot((q - lc) * vec2(9.0, 6.5), (q - lc) * vec2(9.0, 6.5))) * step(vKind, 2.5);
        float edge = 1.0 - smoothstep(0.7, 1.15, length(p)); // the glow ends inside the sprite
        float halo = exp(-length(q - lc) * 3.2) * edge * step(vKind, 2.5);
        vec3 c = (mix(vCol, vec3(1.0, 0.82, 0.55), 0.35 * flame) * (flame * 1.5 + halo * 0.30) * vA) * vis;
        body = clamp(body, 0.0, 1.0);
        c += vCol * body * 0.55 * vA * vis * exp(-length(q - lc) * 2.6) * (0.25 + 0.75 * step(vKind, 2.5)); // the metal and stone near the lamp take its light
        gl_FragColor = vec4(c, body * 0.8 * fogAtten);
        return;
      }
      bool great = vKind > 0.5;
      float hx = great ? 0.34 : vShape.x, hy = great ? 0.5 : vShape.y;
      bool arch = great || (vSub > 0.5 && vSub < 1.5);
      float sd = opening(p, hx, hy, arch);
      float inside = 1.0 - smoothstep(-ew, ew, sd);
      // the room: the lamp stands low and to one side; its back wall (smaller, and slid by the eye's parallax) catches a pool of
      // light and is brighter toward the floor; round it the reveal's faces, the sill bright, the soffit dark, the side wall
      // nearer the lamp lit; and, in a lit room, a shadow of something standing within
      float lampx = (h11(vSeed * 13.7 + 1.0) - 0.5) * 0.9 * hx;
      vec2 pi = (p - vShift) / 0.74;
      float sdi = opening(pi, hx, hy, arch) * 0.74;
      float back = 1.0 - smoothstep(-ew, ew, sdi);
      float pool = exp(-(((pi.x - lampx) / (hx * 1.1)) * ((pi.x - lampx) / (hx * 1.1)) + ((pi.y + 0.55 * hy) / (hy * 0.9)) * ((pi.y + 0.55 * hy) / (hy * 0.9))) * 1.6);
      float grad = mix(0.30, 1.0, smoothstep(hy, -hy, pi.y));
      float room = 0.26 * grad + 0.95 * pool;
      if (vWin > 6.0 && !great) {
        float sx = -lampx + (h11(vSeed * 7.3) - 0.5) * 0.5 * hx;
        float bar = (1.0 - smoothstep(0.05 * hx, 0.16 * hx, abs(pi.x - sx))) * (1.0 - smoothstep(-0.1 * hy, 0.2 * hy, pi.y + 0.15)) * step(h11(vSeed * 3.1), 0.55);
        room *= 1.0 - 0.8 * bar;
      }
      vec2 rel = (p - vShift * 0.6) / vec2(hx, hy);
      float face = abs(rel.y) > abs(rel.x) * 0.9 ? (rel.y > 0.0 ? 0.04 : 0.55 * (0.35 + exp(-((p.x - lampx) / hx) * ((p.x - lampx) / hx)))) : 0.20 * grad * (0.5 + 0.9 * exp(-((p.x - lampx) / hx) * ((p.x - lampx) / hx) * 0.6));
      float lum = inside * mix(face, room, back);
      if (great) lum *= smoothstep(0.02, 0.05, abs(p.x)) * smoothstep(0.02, 0.05, abs(p.y + 0.12));
      else if (vSub > 2.5 && vSub < 3.5) {
        // shuttered, one leaf shut across the opening: planks, and the open side lit
        float cut = mix(-0.2, 0.6, h11(vSeed * 5.5)) * hx * (vSeed > 0.5 ? 1.0 : -1.0);
        float leaf = vSeed > 0.5 ? step(p.x, cut) : step(cut, p.x);
        lum *= 1.0 - leaf * 0.97;
      } else if (vSub > 3.5) {
        // shuttered shut: a thin line of light at the meeting of the leaves and a few louvres of it
        float gap = 1.0 - smoothstep(0.02, 0.05, abs(p.x));
        float lou = 0.55 * smoothstep(0.5, 0.9, sin(p.y * (40.0 / max(1.0, 14.0 / vWin)) ));
        lum *= (0.25 + 0.75 * gap) * (0.25 + 0.75 * lou);
      }
      // the wall it sits in: a dark reveal round it, a heavy lintel over, a sill under (catching the lamp), a warm spill beyond
      float rev = (1.0 - smoothstep(0.02, 0.17, sd)) * (1.0 - inside);
      float lint = (1.0 - smoothstep(0.0, 0.07, abs(p.y - hy - 0.07))) * step(abs(p.x), hx + 0.10) * (1.0 - inside);
      float sill = (1.0 - smoothstep(0.0, 0.035, abs(p.y + hy + 0.045))) * step(abs(p.x), hx + 0.08) * (1.0 - inside) * (arch || great ? 1.0 : 1.0);
      float spill = (1.0 - smoothstep(0.55, 1.2, length(p)));
      float halo = exp(-length(max(abs(p) - vec2(hx, hy) * 0.6, 0.0)) * 3.6) * (1.0 - inside) * step(0.0, sd) * 0.28 * spill * smoothstep(0.0, 0.12, sd);
      vec3 warm = vCol * vec3(1.0, 0.78, 0.55); // the rock's glow is warmer than the lamp
      vec3 c = (vCol * lum * vA + mix(warm, vCol, vNear * 0.5) * (halo + sill * 0.9 * (0.35 + pool)) * vA * 0.7) * vis;
      gl_FragColor = vec4(c, clamp(rev * 0.55 + lint * 0.5, 0.0, 0.8) * fogAtten);
    }`;
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, U]), vertexShader: vs, fragmentShader: fs, fog: true,
    // premultiplied: the reveal darkens the rock (alpha, no colour), the window and glow add
    transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  Object.assign(mat.uniforms, U);
  mat.customProgramCacheKey = () => 'escarpment-lamps-v111w3';
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
        varying vec3 vCol; varying float vA, vWin, vKind, vNear, vSub, vSeed; varying vec2 vShape, vShift; varying vec2 vUv;
        #include <fog_pars_vertex>
        void main() {
          vec3 transformed = position;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          #include <fog_vertex>
          vec4 centre = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          gl_Position = projectionMatrix * (mvPosition + vec4(0.0, 0.0, 3.0, 0.0));
          vUv = uv; vKind = 1.0; vNear = 1.0; vSub = 1.0; vSeed = 0.3; vShift = vec2(0.0); vShape = vec2(0.34, 0.5);
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
    posts: P.map((q, i) => (q.kind >= 2 ? i : -1)).filter((i) => i >= 0), // the ledge's lamps and posts, for the views
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
