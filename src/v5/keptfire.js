// DN The Kept Fire [Proposed] (plans/IDEAS-v5.md DN; plans/wilderness-v5.md "### DN"; site in plans/wilderness-v4-placement.md section 5,
// key `keptFire`, (10, -190), r 6, beside lead P6 on the Outwash): a hearth in a ring of stones, always burning, a
// blackened iron pot on a hook from a tripod of rods, a pile of driftwood beside it that is a little higher each
// visit, a flat stone to sit on. Nobody is ever there: no figure, no footprints, nothing else of anyone's. Come near
// and the fire flares, as if someone had just turned to it, and the shadows of the nearest erratics swing out across
// the gravel. The only warm light in the cold quarter.
//
// The hearth stands 3.7 m off P6 (the lead's vertex is at (10, -188)), at (8.3, -193.2), on the side away from the trod and
// 6.5 m from the boulder at (4.9, -187.6) that rocks.js drew first (the stream's rule: the hearth moves, the rock stays).
// Draws: the solid mesh (ring, seat, tripod, pot, logs, the pile: one merged mesh, vertex colours, casting shadows),
// the fire (one Points: flame tongues, coals, two halos, sparks, a burst of sparks, a thread of smoke, in one
// shader, premultiplied so the smoke darkens and the flame adds), and the flare's pool and shadow wedges (one draped
// disc, drawn only while the fire flares). One real PointLight (the lights slots take it). Colliders: the ring and the tripod, the seat.
//
// The flare: the walker comes within 12 m after having been beyond 30 m. For 3 s the light doubles and its reach
// grows by half, the tongues leap, a burst of sparks goes up, the crackle swells, and the nearest erratics (read from
// the Outwash's instanced mesh, within 34 m) throw wedges of shadow across the gravel that swing out from the side to
// directly away from the fire, lengthen and fade. A point light casts no shadow here (the one shadow map is the sun's;
// a cube map for a three-second event would be six more scene renders), so the swing is drawn: one disc of ground
// draped once, lit with a warm pool by a fragment shader that leaves a dark wedge behind each of the five nearest
// erratics; the wedges move in uniforms.
//
// The driftwood: the pile has six pieces to begin with and gains one per visit from twelve preset placements, kept
// for the page's session. A visit is an approach (inside 12 m after beyond 30 m) and the piece is laid once the
// walker has gone beyond 30 m again, so the pile is higher the next time and never grows while it is looked at.
//
// ?keptfire=0 leaves it out; ?keptfire=visits=4 starts as if four visits had been made. ctx.keptFire = { flare(at),
// visit(n), visits, stats() }: flare() starts one, flare(s) poses it s seconds in and holds it, flare(null) lets go.
import * as THREE from 'three';
import { SITES } from '../world.js';
import { mergeGeometries } from '../v4/kit/merge.js';
import { fogPars, fogAtten, softDot } from '../particles/shaderParts.js';
import { clamp, lerp, smoothstep, hyp } from '../noise.js';

const PARAM = (typeof location !== 'undefined' && new URLSearchParams(location.search).get('keptfire')) || '';
const OFF = PARAM === '0';
const VISITS0 = Math.max(0, Math.min(12, +(/visits=(\d+)/.exec(PARAM)?.[1] ?? 0)));

const SITE = SITES.keptFire;
export const HEARTH = { x: 8.3, z: -193.2, ring: 0.92, near: 12, far: 30 };
const WIND = [0.2, 0.98]; // the cold breath comes down off the ice, toward +z (the Outwash's motes drift [0.15, 0, 0.9])
const LIGHT = { colour: '#ff8a3a', i0: 22, dist: 18, flare: 1.0, grow: 0.5, y: 1.25 };
const FLARE = { rise: 0.35, tau: 0.85, end: 3.0 };
const PILE_BASE = 6, PILE_MAX = 12;

const flareEnv = (tt) => (tt < 0 ? 0 : tt < FLARE.rise ? smoothstep(0, 1, tt / FLARE.rise) : Math.exp(-(tt - FLARE.rise) / FLARE.tau) * (1 - smoothstep(FLARE.end - 0.6, FLARE.end, tt)));

export async function build(ctx) {
  if (OFF) { ctx.keptFire = null; return; }
  const { scene, terrain } = ctx;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(8801);
  const N2 = ctx.noise.noise2;
  const gy = terrain.heightAt(HEARTH.x, HEARTH.z);
  const rel = (x, z) => terrain.heightAt(HEARTH.x + x, HEARTH.z + z) - gy; // ground height relative to the hearth's

  // ---------------------------------------------------------------- the solid mesh
  const col = new THREE.Color(), tmpM = new THREE.Matrix4(), qa = new THREE.Quaternion(), eu = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  // geo: any geometry; shape(x,y,z)->[x,y,z] moves its vertices (a function of position, so duplicates agree); M places
  // it; paint(x,y,z,nx,ny,nz,out) fills the colour. Returns a flat-shaded non-indexed geometry with position, normal, colour.
  function part(geo, M, paint, shape) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.deleteAttribute('uv');
    if (shape) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const o = shape(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, o[0], o[1], o[2]); } }
    const loc = g.attributes.position.array.slice(); // the shaped vertices before they are placed
    g.applyMatrix4(M);
    g.computeVertexNormals();
    const p = g.attributes.position, n = g.attributes.normal, c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { paint(p.getX(i), p.getY(i), p.getZ(i), n.getX(i), n.getY(i), n.getZ(i), col, loc[i * 3], loc[i * 3 + 1], loc[i * 3 + 2]); c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  }
  const place = (x, y, z, yaw, rx, rz, sx, sy, szz) => tmpM.compose(ps.set(x, y, z), qa.setFromEuler(eu.set(rx, yaw, rz, 'YXZ')), sc.set(sx, sy, szz)).clone();
  const ICO = new THREE.IcosahedronGeometry(1, 1);
  const parts = [];

  // the ring: twelve gravel-rounded stones, soot on the faces that look in
  const GRANITE = [new THREE.Color('#9a9c9c'), new THREE.Color('#b4b4ae'), new THREE.Color('#82868a')];
  const SOOT = new THREE.Color('#0c0a09'), LICHEN = new THREE.Color('#7d8460');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + (rng() - 0.5) * 0.12, r = HEARTH.ring + (rng() - 0.5) * 0.1;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, w = 0.22 + rng() * 0.09, h = 0.14 + rng() * 0.08;
    const ox = rng() * 9, oz = rng() * 9, base = GRANITE[(rng() * 3) | 0], tone = 0.85 + rng() * 0.3, ux = Math.cos(a), uz = Math.sin(a);
    const M = place(x, rel(x, z) + h * 0.55, z, rng() * 6.28, (rng() - 0.5) * 0.25, (rng() - 0.5) * 0.25, w, h, w * (0.8 + rng() * 0.3));
    parts.push(part(ICO, M, (px, py, pz, nx, ny, nz, o) => {
      const inward = clamp(-(nx * ux + nz * uz), 0, 1), lich = smoothstep(0.55, 0.9, N2(px * 0.9 + ox, pz * 0.9 + 3)) * ny;
      o.copy(base).multiplyScalar(tone * (0.9 + 0.2 * N2(px * 3 + ox, py * 3 + pz))).lerp(LICHEN, lich * 0.35).lerp(SOOT, clamp(inward * 1.5 - 0.35, 0, 0.9));
    }, (x0, y0, z0) => { const d = 1 + 0.2 * N2(x0 * 1.7 + ox, y0 * 1.5 + z0 * 1.2 + oz); return [x0 * d, y0 * d, z0 * d]; }));
  }
  // the flat stone to sit on, north of the fire (upwind), long side across the line to the fire, and a smaller one
  // at its foot
  {
    const sx = 0.5, sz = -1.95, yaw = -Math.atan2(sz, sx) + Math.PI / 2;
    const paintSeat = (px, py, pz, nx, ny, nz, o) => { o.set('#b2b2ac').multiplyScalar(0.9 + 0.2 * N2(px * 4, pz * 4)).lerp(LICHEN, smoothstep(0.5, 0.9, N2(px * 1.2 + 5, pz * 1.2)) * ny * 0.3); };
    parts.push(part(ICO, place(sx, rel(sx, sz) + 0.17, sz, yaw, 0.02, -0.03, 0.46, 0.15, 0.32), paintSeat, (x0, y0, z0) => { const d = 1 + 0.1 * N2(x0 * 2 + 40, z0 * 2 + y0); return [x0 * d, y0 * (y0 > 0 ? 0.7 : 1) * d, z0 * d]; }));
    const fx = 0.3, fz = -1.52;
    parts.push(part(ICO, place(fx, rel(fx, fz) + 0.07, fz, 0.8, 0, 0, 0.19, 0.1, 0.16), paintSeat, (x0, y0, z0) => { const d = 1 + 0.15 * N2(x0 * 2.5 + 11, z0 * 2.5 + y0); return [x0 * d, y0 * d, z0 * d]; }));
  }

  // iron: three rods from the ground outside the ring to a point 1.72 m over the coals, and the pot's chain and bail
  const IRON = new THREE.Color('#1e1b19'), RUSTY = new THREE.Color('#3a2418');
  const ironPaint = (px, py, pz, nx, ny, nz, o) => { o.copy(IRON).lerp(RUSTY, smoothstep(0.2, 0.9, N2(px * 5 + 2, py * 4 + pz * 3)) * 0.5); };
  const rod = (ax, ay, az, bx, by, bz, r0, r1, seg = 5) => {
    const d = new THREE.Vector3(bx - ax, by - ay, bz - az), L = d.length();
    const g = new THREE.CylinderGeometry(r1, r0, L, seg, 1, false);
    tmpM.compose(ps.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2), qa.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), sc.set(1, 1, 1));
    parts.push(part(g, tmpM.clone(), ironPaint));
  };
  const APEX = 1.72, FOOT = 1.22, A0 = 0.55;
  for (let k = 0; k < 3; k++) {
    const a = A0 + (k * Math.PI * 2) / 3, fx = Math.cos(a) * FOOT, fz = Math.sin(a) * FOOT;
    rod(fx, rel(fx, fz) - 0.03, fz, -Math.cos(a) * 0.05, APEX + 0.08, -Math.sin(a) * 0.05, 0.02, 0.016);
  }
  const POT = { y: 0.8, r: 0.235, h: 0.27 }; // the pot's bottom height over the ground, its belly's radius, its height
  const rim = POT.y + POT.h;
  rod(0, APEX - 0.04, 0, 0, rim + 0.3, 0, 0.011, 0.011, 4); // the chain
  rod(-POT.r + 0.02, rim, 0, 0, rim + 0.3, 0, 0.011, 0.011, 4); rod(POT.r - 0.02, rim, 0, 0, rim + 0.3, 0, 0.011, 0.011, 4); // the bail
  {
    const prof = [[0.001, 0], [0.09, 0.006], [0.17, 0.045], [0.225, 0.12], [POT.r, 0.18], [0.225, 0.235], [0.2, POT.h - 0.004], [0.2, POT.h], [0.178, POT.h], [0.19, 0.235], [0.19, 0.2], [0.001, 0.2]].map(([x, y]) => new THREE.Vector2(x, y));
    const lathe = new THREE.LatheGeometry(prof, 12);
    parts.push(part(lathe, place(0, POT.y, 0, 0, 0, 0, 1, 1, 1), (px, py, pz, nx, ny, nz, o) => { o.set('#0d0c0b').multiplyScalar(0.75 + 0.5 * smoothstep(0.1, 0.9, N2(px * 9 + 3, pz * 9 + py * 6))).lerp(RUSTY, clamp(ny, 0, 1) * 0.06); }, null));
  }

  // wood: one log is a six-sided taper in three lengths with a bend and knots; every one has the same 48 triangles
  const LOG = new THREE.CylinderGeometry(1, 1, 1, 6, 3, false);
  LOG.rotateZ(Math.PI / 2); // along +x, from -0.5 to 0.5
  const BLEACH = [new THREE.Color('#a39e93'), new THREE.Color('#8d8880'), new THREE.Color('#b0aa9d'), new THREE.Color('#7e7a74')];
  const CHAR = new THREE.Color('#0d0b0a'), EMBER = new THREE.Color('#3a1a0e');
  function log(x, y, z, yaw, tilt, roll, len, rad, o = {}) {
    const bend = (rng() - 0.5) * 0.12 * len, ox = rng() * 20, bl = BLEACH[(rng() * 4) | 0], tone = 0.85 + rng() * 0.25, burnt = o.burnt ?? 0, flip = rng() < 0.5 ? 1 : -1;
    const M = place(x, y, z, yaw, tilt, roll, len, rad * 2, rad * 2);
    return part(LOG, M, (px, py, pz, nx, ny, nz, c, lx) => {
      c.copy(bl).multiplyScalar(tone * (0.85 + 0.3 * N2(px * 6 + ox, pz * 6 + py * 5)));
      const u = flip > 0 ? lx + 0.5 : 0.5 - lx; // 0..1 along the log, from its clean end to the burnt one
      if (o.charred) c.lerp(CHAR, 0.96).lerp(EMBER, 0.14 * smoothstep(0.3, 0.5, Math.abs(lx)));
      else if (burnt) c.lerp(CHAR, smoothstep(1 - burnt, 1 - burnt + 0.25, u));
    }, (x0, y0, z0) => {
      const u = x0 * 2; // -1..1 along the log
      const k = 1 + 0.18 * N2(x0 * 7 + ox, 1.3) - 0.06 * Math.abs(u);
      return [x0, y0 * k + bend * (1 - u * u) * 0.5, z0 * k + bend * (1 - u * u) * 0.35];
    });
  }
  // the fire's logs, charred: two below, two across, a short one leaning
  for (const [x, z, yaw, len] of [[0.02, -0.17, 0.05, 1.0], [-0.03, 0.2, -0.08, 0.95]]) parts.push(log(x, rel(x, z) + 0.065, z, yaw, 0, 0, len, 0.058, { charred: true }));
  for (const [x, z, yaw, len] of [[0.14, 0.0, 1.58, 0.92], [-0.16, -0.02, 1.5, 0.85]]) parts.push(log(x, rel(x, z) + 0.185, z, yaw, 0, 0, len, 0.052, { charred: true }));
  parts.push(log(0.0, rel(0, 0) + 0.3, 0.02, 0.8, 0, 0, 0.62, 0.045, { charred: true }));
  // three half-burned pieces at the ring's edge, burnt at the inner end
  for (const [a, yaw, len, burnt] of [[2.6, 2.6 + Math.PI, 0.95, 0.6], [4.1, 4.1 + Math.PI, 0.8, 0.45], [5.5, 5.5 + Math.PI, 0.9, 0.7]]) {
    const r = 0.5 + len * 0.2, x = Math.cos(a) * r, z = Math.sin(a) * r;
    parts.push(log(x, rel(x, z) + 0.07, z, yaw, 0, 0, len, 0.05, { burnt }));
  }
  // the pile, west of the fire: six pieces to begin with and twelve to come, in layers that cross, one set of
  // placements for every visitor (the world's own rng stream)
  const PILE = { x: -2.65, z: -0.35, axis: 0.45 };
  const prng = ctx.makeRng(8802);
  const placements = [];
  const layers = [4, 2, 2, 4, 3, 2, 1]; // pieces per layer; the first two layers (six) are there from the start
  let layer = 0;
  for (const count of layers) {
    for (let k = 0; k < count; k++) {
      const odd = layer % 2, spread = 0.38 - layer * 0.04;
      const along = (k - (count - 1) / 2) * (0.5 - layer * 0.04) * (odd ? 1 : 1), across = (prng() - 0.5) * spread * 1.3;
      const c = Math.cos(PILE.axis), s = Math.sin(PILE.axis);
      const lx = odd ? across : along, lz = odd ? along : across;
      placements.push({ x: PILE.x + lx * c - lz * s + (prng() - 0.5) * 0.12, z: PILE.z + lx * s + lz * c + (prng() - 0.5) * 0.12, y: 0.06 + layer * 0.1 + prng() * 0.02, yaw: PILE.axis + (odd ? Math.PI / 2 : 0) + (prng() - 0.5) * 0.4, len: 0.95 + prng() * 0.75, rad: 0.04 + prng() * 0.03, tilt: (prng() - 0.5) * 0.12 });
    }
    layer++;
  }
  const mkPile = (pl, i) => { const ya = pl.y + rel(pl.x, pl.z); return log(pl.x, ya, pl.z, pl.yaw, pl.tilt, (prng() - 0.5) * 0.3, pl.len, pl.rad); };
  const fixedParts = parts.slice();
  for (let i = 0; i < PILE_BASE; i++) fixedParts.push(mkPile(placements[i], i));
  const geo = mergeGeometries([...fixedParts, ...placements.slice(PILE_BASE).map(mkPile)]);
  geo.deleteAttribute('uv');
  geo.computeBoundingSphere();
  const vertsPerLog = LOG.index ? LOG.toNonIndexed().attributes.position.count : LOG.attributes.position.count;
  const fixedVerts = fixedParts.reduce((s, g) => s + g.attributes.position.count, 0);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0.05 });
  mat.customProgramCacheKey = () => 'keptfire-solid';
  const solid = new THREE.Mesh(geo, mat);
  solid.name = 'kept-fire-solid'; solid.position.set(HEARTH.x, gy, HEARTH.z);
  solid.castShadow = true; solid.receiveShadow = true;
  scene.add(solid);

  // ---------------------------------------------------------------- the fire: one Points
  const kinds = []; // [kind, count]
  const nF = low ? 28 : 40;
  const KIND = [[0, nF], [3, 7], [4, 1], [5, 1], [1, low ? 10 : 16], [2, low ? 24 : 36], [6, low ? 12 : 18]];
  const total = KIND.reduce((s, k) => s + k[1], 0);
  const seeds = new Float32Array(total * 4), kindA = new Float32Array(total);
  { let o = 0; for (const [k, n] of KIND) for (let i = 0; i < n; i++, o++) { kindA[o] = k; seeds[o * 4] = rng(); seeds[o * 4 + 1] = rng(); seeds[o * 4 + 2] = rng(); seeds[o * 4 + 3] = rng(); } }
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  pgeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  pgeo.setAttribute('aKind', new THREE.BufferAttribute(kindA, 1));
  const U = {
    uTime: { value: 0 }, uScale: { value: 500 }, uFlare: { value: 0 }, uBurstT: { value: -1e4 }, uFlick: { value: 1 },
    uOrigin: { value: new THREE.Vector3(HEARTH.x, gy, HEARTH.z) }, uWind: { value: new THREE.Vector3(WIND[0], 0, WIND[1]) },
  };
  const vs = /* glsl */`
    uniform float uTime, uScale, uFlare, uBurstT, uFlick; uniform vec3 uOrigin, uWind;
    attribute vec4 aSeed; attribute float aKind;
    varying vec4 vCol; varying float vA;
    #include <fog_pars_vertex>
    void main() {
      float k = aKind, T = uTime, s0 = aSeed.x, s1 = aSeed.y, s2 = aSeed.z, s3 = aSeed.w;
      vec3 p = uOrigin, c = vec3(0.0); float size = 0.05, al = 0.0, ak = 0.0, fade = 1.0;
      if (k < 0.5) { // a tongue of flame: born at the coals, rising, leaning a little, shrinking to nothing
        float ph = fract(T * (0.85 + 0.7 * s3) * (1.0 + 0.7 * uFlare) + s0);
        float hmax = (0.45 + 0.55 * s1 * s1) * (1.0 + 0.95 * uFlare) * (0.85 + 0.3 * uFlick);
        float a = s1 * 6.2831 + s2 * 3.0, r = (0.05 + 0.34 * s2 * s2) * (1.0 - 0.85 * ph);
        vec2 xz = vec2(cos(a), sin(a)) * r + vec2(sin(T * 6.0 + s0 * 50.0), cos(T * 5.3 + s1 * 40.0)) * 0.06 * ph;
        p += vec3(xz.x, 0.14 + hmax * ph, xz.y) + uWind * ph * ph * 0.3;
        size = (0.38 + 0.24 * s3) * (1.0 - ph * 0.75) * (1.0 + 0.3 * uFlare);
        c = mix(vec3(2.4, 1.3, 0.38), vec3(1.5, 0.3, 0.04), smoothstep(0.05, 0.75, ph));
        al = smoothstep(0.0, 0.12, ph) * (1.0 - smoothstep(0.6, 1.0, ph)) * 0.7;
      } else if (k < 1.5) { // a spark that goes up with the heat; more of them while it flares
        float life = 1.1 + 1.5 * s3, t = fract(T / life + s0) * life;
        vec3 v = vec3((s2 - 0.5) * 0.9, 0.9 + 1.3 * s1 + 0.9 * uFlare, (s3 - 0.5) * 0.9) + uWind * 0.5;
        p += vec3((s0 - 0.5) * 0.3, 0.45, (s2 - 0.5) * 0.3) + v * t + vec3(sin(t * 7.0 + s0 * 40.0) * 0.05, -0.35 * t * t, 0.0);
        size = 0.032; float f = 1.0 - t / life;
        c = mix(vec3(1.6, 0.25, 0.04), vec3(3.4, 1.7, 0.5), f);
        al = step(s1, 0.4 + 0.5 * uFlare) * f;
      } else if (k < 2.5) { // the burst: sparks thrown up when it flares, falling back
        float age = T - uBurstT, life = 1.0 + 1.5 * s3;
        float ang = s0 * 6.2831, hz = 0.25 + 0.75 * s1, sp = 2.0 + 3.6 * s2;
        vec3 v = vec3(cos(ang) * hz, 1.0, sin(ang) * hz) * sp;
        p += vec3(0.0, 0.45, 0.0) + v * age + vec3(0.0, -2.8 * age * age, 0.0) + uWind * 0.5 * age * age;
        size = 0.036; float f = 1.0 - age / life;
        c = mix(vec3(1.7, 0.28, 0.05), vec3(3.6, 1.8, 0.55), f);
        al = (age >= 0.0 && age < life) ? f : 0.0;
      } else if (k < 3.5) { // the bed of coals
        float a = s0 * 6.2831, r = 0.46 * sqrt(s1);
        p += vec3(cos(a) * r, 0.1 + 0.05 * s2, sin(a) * r);
        size = 0.3 + 0.18 * s3;
        c = vec3(1.7, 0.38, 0.06);
        al = 0.4 * (0.65 + 0.35 * sin(T * (1.5 + 3.0 * s2) + s0 * 30.0 + 2.0 * uFlick)) * (1.0 + 0.6 * uFlare);
      } else if (k < 4.5) { // the hot halo, a small sun over the coals
        p += vec3(0.0, 0.62, 0.0);
        size = 2.6 * (1.0 + 0.5 * uFlare) * (0.9 + 0.2 * uFlick);
        c = vec3(1.2, 0.48, 0.1); al = 0.85; fade = -1.0;
      } else if (k < 5.5) { // the wide halo, the glow in the air that carries across the gravel
        p += vec3(0.0, 0.9, 0.0);
        size = 10.0 * (1.0 + 0.4 * uFlare);
        c = vec3(1.0, 0.36, 0.08); al = 0.3 * (0.9 + 0.2 * uFlick); fade = -1.0;
      } else { // the smoke: a thread, rising and leaning off down the wind, widening and thinning
        float life = 11.0, ph = fract(T / life + s0), t = ph * life;
        p += vec3((s1 - 0.5) * 0.2, 1.0 + 0.5 * t, (s2 - 0.5) * 0.2) + uWind * (0.3 * t + 0.02 * t * t) + vec3(sin(T * 0.6 + s3 * 30.0), 0.0, cos(T * 0.5 + s1 * 30.0)) * 0.12 * ph * 3.0;
        size = 0.25 + 0.95 * ph;
        c = mix(vec3(0.3, 0.17, 0.1), vec3(0.1, 0.1, 0.12), smoothstep(0.0, 0.3, ph));
        al = 0.34 * smoothstep(0.0, 0.1, ph) * (1.0 - smoothstep(0.6, 1.0, ph)); ak = 1.0;
      }
      vec3 transformed = p;
      vec4 mvPosition = viewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      float depth = -mvPosition.z;
      if (fade < 0.0) al *= k < 4.5 ? smoothstep(5.0, 24.0, depth) : smoothstep(9.0, 38.0, depth);
      gl_PointSize = clamp(size * uScale / max(depth, 0.1), 1.5, 150.0);
      vCol = vec4(c, ak); vA = al;
      #include <fog_vertex>
    }`;
  const fs = /* glsl */`
    varying vec4 vCol; varying float vA;
    ${fogPars}
    ${softDot}
    void main() {
      ${fogAtten}
      float s = softDot(gl_PointCoord) * vA * fogAtten;
      gl_FragColor = vec4(vCol.rgb * s, vCol.a * s);
    }`;
  const pmat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, U]), vertexShader: vs, fragmentShader: fs, fog: true, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  Object.assign(pmat.uniforms, U); // the shared objects, by reference
  pmat.customProgramCacheKey = () => 'keptfire-points';
  const points = new THREE.Points(pgeo, pmat);
  points.name = 'kept-fire-flames'; points.frustumCulled = false; points.renderOrder = 26;
  scene.add(points);

  // ---------------------------------------------------------------- the light
  const light = new THREE.PointLight(new THREE.Color(LIGHT.colour), LIGHT.i0, LIGHT.dist, 2);
  light.name = 'kept-fire-light';
  light.position.set(HEARTH.x, gy + LIGHT.y, HEARTH.z);
  scene.add(light);
  const warm = new THREE.Color(LIGHT.colour), hot = new THREE.Color('#ffb255');

  // ---------------------------------------------------------------- colliders: the ring and the tripod, the seat
  ctx.addCollider({ x: HEARTH.x, z: HEARTH.z, r: HEARTH.ring + 0.38, y: gy - 0.4, h: 0.65 });
  ctx.addCollider({ x: HEARTH.x, z: HEARTH.z, r: 1.12, y: gy - 0.4, h: 2.4 });
  ctx.addCollider({ x: HEARTH.x + 0.5, z: HEARTH.z - 1.95, r: 0.5, y: gy - 0.4, h: 0.5 });

  // ---------------------------------------------------------------- the flare's pool and its shadows (found when the Outwash's erratics are there)
  // One disc of ground, 44 m across, draped on the gravel once (a 1.8 m grid at the ground's height and a hand over it)
  // and drawn only while the fire flares: a fragment shader lays a warm pool of added light round the hearth and, behind
  // each of the five nearest erratics, a wedge where that pool is stopped and the ground goes dark. The wedge's
  // direction swings from the rock's flank round to directly away from the fire as the flare rises, and lengthens
  // with it. Everything moves in uniforms; nothing is rewritten per frame.
  const NW = 5, PR = 22, GRID = 24;
  let wedges = null, wmesh = null;
  const WU = { uE: { value: Array.from({ length: NW }, () => new THREE.Vector4(0, 0, 0, 0)) }, uL: { value: new Array(NW).fill(0) }, uC: { value: new THREE.Vector2(HEARTH.x, HEARTH.z) }, uF: { value: 0 }, uSw: { value: 1 }, uGrow: { value: 0 }, uFl: { value: 1 } };
  // The Outwash's cobbles and cushions were drawn before the hearth: those inside the ring and under the pile go to
  // nothing after the fact (their matrices are zeroed), as plinths.js clears after its draws.
  function clearGround() {
    const spots = [[HEARTH.x, HEARTH.z, 1.25], [HEARTH.x + PILE.x, HEARTH.z + PILE.z, 1.05], [HEARTH.x + 0.5, HEARTH.z - 1.95, 0.7]];
    for (const name of ['outwash-cobbles', 'outwash-cushions']) {
      const m = scene.getObjectByName(name); if (!m) continue;
      const A = m.instanceMatrix.array; let cut = 0;
      for (let i = 0; i < m.count; i++) {
        const o = i * 16;
        for (const [x, z, r] of spots) if (hyp(A[o + 12] - x, A[o + 14] - z) < r) { for (let k = 0; k < 12; k++) A[o + k] = 0; cut++; break; }
      }
      if (cut) m.instanceMatrix.needsUpdate = true;
    }
  }
  function findErratics() {
    const m = scene.getObjectByName('outwash-erratics');
    if (!m || !m.count) return false;
    clearGround();
    const A = m.instanceMatrix.array, list = [];
    for (let i = 0; i < m.count; i++) {
      const o = i * 16, x = A[o + 12], z = A[o + 14], d = hyp(x - HEARTH.x, z - HEARTH.z);
      if (d < 34 && d > 2) list.push({ x, z, d, r: Math.hypot(A[o], A[o + 1], A[o + 2]), h: Math.hypot(A[o + 4], A[o + 5], A[o + 6]) });
    }
    list.sort((a, b) => a.d - b.d); list.length = Math.min(list.length, NW);
    wedges = list.map((e, i) => {
      const dx = e.x - HEARTH.x, dz = e.z - HEARTH.z;
      return { x: e.x, z: e.z, ang: Math.atan2(dz, dx), hw: e.r * 1.1, L: clamp(17 - e.d * 0.32, 7, 15) * (0.8 + 0.3 * e.h), side: i % 2 ? 1 : -1, swing: 0.55 + 0.25 * (i % 3) };
    });
    wedges.forEach((w, i) => WU.uL.value[i] = w.L);
    // the disc: a grid of 1.8 m squares, each vertex on the ground
    const n = GRID + 1, pos = new Float32Array(n * n * 3), idx = [], step = (2 * PR) / GRID;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = HEARTH.x - PR + i * step, z = HEARTH.z - PR + j * step, o = (j * n + i) * 3;
      pos[o] = x; pos[o + 1] = terrain.heightAt(x, z) + 0.42; pos[o + 2] = z;
      if (i < GRID && j < GRID) { const a = j * n + i; idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(HEARTH.x, gy, HEARTH.z), PR * 1.5);
    const wm = new THREE.ShaderMaterial({
      uniforms: WU, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      vertexShader: /* glsl */`varying vec2 vXZ; void main() { vXZ = position.xz; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform vec4 uE[${NW}]; uniform float uL[${NW}]; uniform vec2 uC; uniform float uF, uSw, uGrow, uFl;
        varying vec2 vXZ;
        void main() {
          float d = length(vXZ - uC);
          float sh = 0.0;
          for (int i = 0; i < ${NW}; i++) {
            if (uL[i] <= 0.0) continue;
            float ang = uE[i].z, hw = uE[i].w;
            vec2 D = vec2(cos(ang), sin(ang)), rel = vXZ - uE[i].xy;
            float al = dot(rel, D), ac = abs(dot(rel, vec2(-D.y, D.x))), len = uL[i] * (0.2 + 0.8 * uGrow);
            float w = hw * (0.85 + 0.5 * clamp(al / max(len, 1.0), 0.0, 1.0));
            sh = max(sh, smoothstep(-hw * 0.8, hw * 1.4, al) * (1.0 - smoothstep(len * 0.3, len, al)) * (1.0 - smoothstep(w * 0.15, w * 1.15, ac)));
          }
          float pool = (1.0 - smoothstep(3.0, ${PR - 1}.0, d)) * uF * uFl;
          vec3 warm = vec3(1.0, 0.52, 0.2) * 0.07 * pool * (1.0 - sh);
          float dark = 0.5 * sh * min(1.0, uF * 1.5) * (1.0 - smoothstep(10.0, ${PR}.0, d) * 0.7);
          gl_FragColor = vec4(warm * (1.0 - dark) + vec3(0.0), dark);
        }`,
    });
    wm.customProgramCacheKey = () => 'keptfire-pool';
    wmesh = new THREE.Mesh(g, wm);
    wmesh.name = 'kept-fire-shadows'; wmesh.frustumCulled = false; wmesh.renderOrder = 3; wmesh.visible = false;
    scene.add(wmesh);
    return true;
  }
  function poolUniforms(tt, f, fl) {
    const sw = 1 - smoothstep(0, 0.8, tt);
    WU.uF.value = f; WU.uFl.value = fl; WU.uGrow.value = smoothstep(0, 1.1, tt) * (0.55 + 0.45 * f);
    for (let w = 0; w < wedges.length; w++) { const E = wedges[w]; WU.uE.value[w].set(E.x, E.z, E.ang + E.side * E.swing * sw, E.hw); }
  }

  // ---------------------------------------------------------------- the state, the flare, the pile
  const S = { visits: VISITS0, pending: false, armed: true, tt: 99, held: false, burstT: -1e4, crack: 2, searched: 0, shown: -1 };
  const cue = { x: HEARTH.x, y: gy + 0.5, z: HEARTH.z };
  const camP = ctx.camera.position, tmpSize = new THREE.Vector2();
  function showPile() {
    const n = Math.min(PILE_MAX, S.visits);
    if (n === S.shown) return;
    S.shown = n;
    geo.setDrawRange(0, fixedVerts + n * vertsPerLog);
  }
  showPile();
  function startFlare(t, at = null) {
    S.tt = at ?? 0; S.held = at != null; S.burstT = t - S.tt;
    if (at == null) ctx.audio?.cue?.('kept-fire', cue, { flare: true });
  }
  ctx.registerUpdate((dt, t) => {
    const P = ctx.player.pos, d = hyp(P.x - HEARTH.x, P.z - HEARTH.z);
    if (d > HEARTH.far) {
      if (S.pending) { S.pending = false; S.visits = Math.min(PILE_MAX, S.visits + 1); showPile(); }
      S.armed = true;
    } else if (S.armed && d < HEARTH.near) {
      S.armed = false; S.pending = true; if (!S.held) startFlare(t);
    }
    if (!S.held && S.tt < 99) S.tt += dt;
    if (S.tt > FLARE.end && !S.held) S.tt = 99;
    if (S.held) S.burstT = t - S.tt;
    const f = flareEnv(S.tt);
    // the flicker: livelier and deeper the nearer you stand, nearly steady from afar
    const near = 1 - smoothstep(6, 45, d), amp = 0.05 + 0.17 * near;
    const fl = 1 + amp * (0.5 * Math.sin(t * 9.3) + 0.3 * Math.sin(t * 5.7 + 1.3) + 0.2 * Math.sin(t * 14.1 + 0.4)) + 0.07 * Math.sin(t * 0.9 + 2.0);
    light.intensity = LIGHT.i0 * fl * (1 + LIGHT.flare * f);
    light.distance = LIGHT.dist * (1 + LIGHT.grow * f);
    light.color.copy(warm).lerp(hot, f * 0.6);
    ctx.renderer.getDrawingBufferSize(tmpSize);
    U.uScale.value = tmpSize.y / (2 * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov) * 0.5));
    U.uTime.value = t; U.uFlare.value = f; U.uBurstT.value = S.burstT; U.uFlick.value = fl;
    if (!wedges && S.searched < 10 && ++S.searched) findErratics();
    if (wedges && wmesh) {
      const on = f > 0.004 && wedges.length > 0;
      if (on) poolUniforms(S.tt, f, fl);
      if (on !== wmesh.visible) wmesh.visible = on;
    }
    // the crackle, while you are near enough to hear it
    if (d < 40 && (S.crack -= dt) <= 0) { S.crack = 1.1 + rng() * 2.6; ctx.audio?.cue?.('kept-fire', cue, { strength: 1 - near * 0.3 }); }
  }, { pos: { x: HEARTH.x, z: HEARTH.z }, near: 60, hz: 20 });

  ctx.keptFire = {
    pos: { x: HEARTH.x, y: gy, z: HEARTH.z },
    light,
    get visits() { return S.visits; },
    // flare(): start one now; flare(s): pose it s seconds in and hold it; flare(null): let go (back to the quiet fire)
    flare(at) {
      if (at === null) { S.held = false; S.tt = 99; S.burstT = -1e4; return; }
      startFlare(ctx.time.t, at === undefined ? null : at);
    },
    // visit(n): n visits made and left (n pieces laid on the pile)
    visit(n = 1) { S.visits = Math.min(PILE_MAX, S.visits + n); showPile(); return S.visits; },
    stats() {
      const tris = (geo.drawRange.count) / 3 + (points.visible ? 0 : 0);
      return { lights: 1, calls: 2 + (wmesh && wmesh.visible ? 1 : 0), solidTris: Math.round(tris), points: total, visits: S.visits, pile: PILE_BASE + Math.min(PILE_MAX, S.visits), wedges: wedges ? wedges.length : 0, flare: flareEnv(S.tt) };
    },
  };
  ctx.log(`kept fire: ${geo.attributes.position.count / 3} solid triangles (${Math.round((fixedVerts + S.shown * vertsPerLog) / 3)} drawn), ${total} points`);
}
