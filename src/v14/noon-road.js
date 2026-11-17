// The Noon Road's glass (v14-D3): the Noonwrights' carriers afloat on the Foundered Nave's water, the hoops of their
// broken line, and the stored light a few still hold, built from the fourth hand's parts (v8/strata/noon.js) into one
// mesh under the kit's dark (v14/under.js). Called by v14/coffin-road.js, which owns the way down (the Late folk's
// shears and stair), the floor and the door. The plan: v14/noon-road/plan.js. The story: stories/the-noon-road.md.
import * as THREE from 'three';
import { UnderBuilder, underMaterial } from './under.js';
import { NOON, NOON_PARTS as P, GLAZES, put, strand, formAt } from '../v8/strata/noon.js';
import { DOOR } from './coffin-road/plan.js';
import { VESSELS, NODE, HOOPS, SHARDS, LINE, ELBOW, elbowAt, yOf, lamps, WY } from './noon-road/plan.js';

// glazed and blown: smooth, wet-bright under a lamp, clouded and crazed with age, a lime crust at the water's line
// o: { worn (0.65: how far the glaze is worn through to the body in patches), cloud ([0.62, 0.5]: the glaze's clouding, floor and swing),
//      gut ({ value }: v16-S2, 0..1, the glass gives back the noon it stored while the sun above gutters; the Lappet's, not the Nave's) }
export function noonGlass(key = 'noon-glass', waterY = -1e5, o = {}) {
  const worn = (o.worn ?? 0.65).toFixed(3), cl = o.cloud ?? [0.62, 0.5];
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    if (o.gut) sh.uniforms.uNoonGut = o.gut;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>${o.gut ? '\n      uniform float uNoonGut;' : ''}
      float ngH(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float ngN(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(ngH(i), ngH(i + vec3(1,0,0)), f.x), mix(ngH(i + vec3(0,1,0)), ngH(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(ngH(i + vec3(0,0,1)), ngH(i + vec3(1,0,1)), f.x), mix(ngH(i + vec3(0,1,1)), ngH(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 ngW = vUnderW;
        float ngY = ngW.y - ${waterY.toFixed(2)}, ngIn = step(ngY, 9.0) * step(-0.6, ngY);
        // old: the glaze clouded and stained, worn through in patches to the dull body under it, chipped darker
        float ngA = ngN(ngW * 0.55) * 0.6 + ngN(ngW * 1.7 + 4.0) * 0.3 + ngN(ngW * 6.0) * 0.1;
        diffuseColor.rgb *= ${cl[0].toFixed(3)} + ${cl[1].toFixed(3)} * ngN(ngW * 0.9 + 2.0);
        float ngWorn = smoothstep(0.56, 0.66, ngA);
        // worn through, the glaze shows the milk body under it (a milk field wears to a duller biscuit)
        vec3 ngBody = vec3(0.58, 0.55, 0.47) * (0.8 + 0.3 * ngN(ngW * 8.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, ngBody, ngWorn * ${worn});
        // chipped: ragged flakes off the glaze to the duller body, never round dark spots (they read as rivets)
        float ngChip = smoothstep(0.8, 0.83, ngN(ngW * 3.1 + 9.0) + 0.12 * ngN(ngW * 14.0)) * smoothstep(0.45, 0.65, ngN(ngW * 0.8 + 5.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, ngBody * 0.55, ngChip * 0.8);
        // streaks run down it from every rib and ring
        float ngS = smoothstep(0.55, 0.8, ngN(vec3(ngW.x * 3.0, ngW.y * 0.35, ngW.z * 3.0)));
        diffuseColor.rgb *= 1.0 - 0.38 * ngS;
        // crazed: a fine net of dark lines
        float ngC = min(abs(ngN(ngW * 11.0) - ngN(ngW * 11.0 + 7.3)), abs(ngN(ngW * 23.0 + 2.0) - ngN(ngW * 23.0 + 5.1)) * 1.6);
        diffuseColor.rgb *= 1.0 - 0.4 * (1.0 - smoothstep(0.0, 0.022, ngC)) * smoothstep(0.2, 0.5, ngN(ngW * 0.5 + 3.0));
        // where it rides: weed above the line, a lime crust at it, wet black at the water
        float ngWeed = (1.0 - smoothstep(0.25, 0.75 + 0.5 * ngN(ngW * 1.3), ngY)) * ngIn;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1, 0.14, 0.09) * (0.6 + 0.8 * ngN(ngW * 7.0)), ngWeed * 0.8);
        float ngT = smoothstep(0.0, 0.04, ngY) * (1.0 - smoothstep(0.06 + 0.22 * ngN(ngW * 1.9), 0.34, ngY)) * ngIn;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.5, 0.48, 0.4), ngT * 0.7 * smoothstep(0.3, 0.6, ngN(ngW * 5.5)));
        diffuseColor.rgb *= 1.0 - 0.5 * (1.0 - smoothstep(0.0, 0.07, ngY)) * ngIn;
        // the old waterline, when the hall was fuller: a ragged crust of lime at 1.5-1.8 m, silt-stained under it
        float ngOld = ngY - 1.55 - 0.18 * ngN(ngW * 1.1);
        float ngOldT = smoothstep(-0.05, 0.0, ngOld) * (1.0 - smoothstep(0.12, 0.26 + 0.1 * ngN(ngW * 4.0), ngOld)) * ngIn;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.55, 0.53, 0.45), ngOldT * 0.75 * smoothstep(0.25, 0.55, ngN(ngW * 6.5)));
        diffuseColor.rgb *= 1.0 - 0.25 * (1.0 - smoothstep(-0.9, 0.0, ngOld)) * smoothstep(0.07, 0.4, ngY) * ngIn;`)
      // the nave's violet in its shadow (the dark-adapted eye: an old glaze is never black)
      .replace('#include <opaque_fragment>', `outgoingLight += diffuseColor.rgb * vec3(0.03, 0.028, 0.05);${o.gut ? `
outgoingLight += vec3(1.0, 0.86, 0.58) * uNoonGut * (0.18 + 0.55 * smoothstep(0.35, 0.75, ngN(ngW * 0.45 + 1.0))) * (1.0 - 0.7 * ngWorn);` : ''}
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'fp-noon-glass' + waterY.toFixed(2) + (o.worn != null || o.cloud ? `-${worn}-${cl.join('-')}` : '') + (o.gut ? '-gut' : '');
  return underMaterial(m, key, NOON.lightHex);
}

// a vessel's frame: the origin on its axis at mid-length, +z along its heading, nose up by its pitch
export function vesselMatrix(v) {
  return new THREE.Matrix4().makeTranslation(v.x, yOf(v), v.z)
    .multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2 - v.a))
    .multiply(new THREE.Matrix4().makeRotationX(-(v.pitch || 0)));
}

// (v15-F1, #63) is (x, y, z) inside the glass a rope can be tied to, or under the water: every carrier's body (its
// lathe, slumped as noon.js's carrier slumps it), the coupling ring at its nose, the junction node. The Late folk's
// ties are ended where they first meet it (coffin-road.js `tie`): a rope ended in the air beside a nose that narrows
// read as a strut holding nothing.
export function makeGlassTest() {
  const parts = VESSELS.map((v) => {
    const M = vesselMatrix(v); if (v.roll) M.multiply(new THREE.Matrix4().makeRotationZ(v.roll));
    return { v, M, inv: M.clone().invert(), h: v.len / 2, body: v.len - v.r * 0.14 };
  });
  const q = new THREE.Vector3(), r = new THREE.Vector3();
  // the nearest point on a walked carrier's coupling ring (the centre of its section) within `far` of (x, y, z), or null
  const ring = (x, y, z, far = 2.5) => {
    let best = null, bd = far;
    for (const P of parts) {
      if (!P.v.walked) continue;
      const R = P.v.r, rc = R * 0.72, zc = P.h + R * 0.03;
      q.set(x, y, z).applyMatrix4(P.inv);
      const l = Math.hypot(q.x, q.y) || 1e-6;
      r.set(q.x / l * rc, q.y / l * rc, zc);
      const d = r.distanceTo(q);
      if (d < bd) { bd = d; best = r.clone().applyMatrix4(P.M); }
    }
    return best && [best.x, best.y, best.z];
  };
  const test = (x, y, z) => {
    if (y <= WY) return true;
    { const dx = x - NODE.x, dy = (y - NODE.y) / 0.86, dz = z - NODE.z; if (dx * dx + dy * dy + dz * dz <= NODE.r * NODE.r) return true; }
    for (const P of parts) {
      const R = P.v.r;
      q.set(x, y, z).applyMatrix4(P.inv);
      if (q.z < -P.h - 0.1 || q.z > P.h + R * 0.2 || Math.abs(q.x) > R * 1.3 || Math.abs(q.y) > R * 1.3) continue;
      const t = (q.z + P.h) / P.body;
      if (t >= 0 && t <= 1 && Math.hypot(q.x / 0.91, q.y) <= R * formAt(P.v.form, t)) return true;
      if (Math.hypot(Math.hypot(q.x, q.y) - R * 0.72, q.z - (P.h + R * 0.03)) <= R * 0.07) return true; // the coupling ring
    }
    return false;
  };
  test.ring = ring;
  return test;
}

// the frame of a ring or a length of the line at (x, y, z): +z along `dir` (unit), +y toward `up` (the crown)
function lineMatrix(p, dir, up = [0, 1, 0]) {
  const z = new THREE.Vector3(...dir).normalize(), y = new THREE.Vector3(...up), x = new THREE.Vector3().crossVectors(y, z).normalize();
  y.crossVectors(z, x);
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(p[0], p[1], p[2]);
}

// env: { lit (the kit's light at a point), below, extras: [{ at: [x, y, z], r, lit, kind: 'bulb' | 'flask' }] } (the
// Late folk's takings: the bulb on the trestle, the flask in the shears' cage, the flasks on the stage)
export function buildNoon(ctx, { lit, below, extras = [] }) {
  const { scene } = ctx, low = ctx.quality === 'low', seg = low ? 20 : 30;
  const B = new UnderBuilder(lit);
  // dust and silt on what faces up; the rest of its age is the material's
  const wear = (x, y, z, ny, base, out) => {
    const k = ny > 0.35 ? 0.55 * (ny - 0.35) * (0.5 + 0.9 * Math.abs(Math.sin(x * 3.7 + z * 5.1))) : 0;
    out[0] = base[0] + (NOON.silt.r - base[0]) * k; out[1] = base[1] + (NOON.silt.g - base[1]) * k; out[2] = base[2] + (NOON.silt.b - base[2]) * k;
    return out;
  };
  let vi = 0;
  for (const v of VESSELS) {
    // the light lies in a vessel like something poured: deep in the belly, thin at the crown
    // a lantern of milk glass: the light through the whole wall, brightest low where it pools, thin at the crown
    const y0 = yOf(v), glowFn = v.lit ? (x, y, z) => { const b = Math.min(1, Math.max(0, (y0 + v.r * 0.85 - y) / (v.r * 1.5))); return v.lit * (0.5 + 1.2 * b * b); } : null;
    P.carrier(B, vesselMatrix(v), { r: v.r, len: v.len, form: v.form, lit: v.lit, roll: v.roll, crack: v.crack, crackAt: v.crackAt, net: v.net, glaze: v.glaze, glazes: vi++, glowFn, seed: Math.round(v.x * 13 + v.z * 7), seg, full: !low, wear });
  }
  // the junction node under the stage, its three ports: north to the main, south to the door's branch, one blind
  P.node(B, new THREE.Matrix4().makeTranslation(NODE.x, NODE.y, NODE.z), { r: NODE.r, lit: NODE.lit, ports: [[Math.PI, 0.05], [0.12, -0.2], [-1.9, 0.1]], pr: 1.05, seg: low ? 16 : 24, wear });
  // the hoops: the line's collars, still standing round the string
  const hoopM = (x) => lineMatrix([x, LINE.y, LINE.z], [1, 0, 0]);
  // the hoops: great glazed collars, each in its own glaze, an amber band inlaid round both faces, catching the light
  // of a lit carrier near it
  const near = (x) => VESSELS.reduce((m, v) => (v.lit > 0 && v.walked ? Math.max(m, v.lit * Math.max(0, 1 - Math.abs(v.x - x) / 5)) : m), 0);
  HOOPS.forEach((h, i) => {
    P.collar(B, hoopM(h.x), { r: LINE.hoop, t: LINE.t, a0: h.a0, a1: h.a1, seg: low ? 36 : 56, wear, glaze: GLAZES[(i * 3 + 1) % 4], inlay: true, inlayLit: 0.6 * near(h.x) });
    if (h.wall) P.tube(B, hoopM(h.x), { r: LINE.r, len: h.wall.len, a0: h.wall.a0, a1: h.wall.a1, ragged: h.wall.ragged, collar: false, seed: 5, seg: low ? 28 : 44, wear, glaze: GLAZES[0] });
  });
  for (const [i, len, a0, a1, rag] of SHARDS) P.tube(B, hoopM(HOOPS[i].x), { r: LINE.r, len, a0, a1, ragged: rag, collar: false, seed: 9 + i, seg: low ? 28 : 44, wear, glaze: GLAZES[(i + 1) % 4] });
  // one hoop fallen off its line, tipped half under the water, its north rim propped up between two columns
  P.collar(B, lineMatrix([251.6, WY - 0.3, 38.0], [0.15, 0.85, 0.5], [0, -0.5, 0.85]), { r: LINE.hoop, t: LINE.t, a0: -2.6, a1: 2.2, seg: low ? 36 : 56, wear, glaze: GLAZES[2], inlay: true });
  // the elbow: the line turning up toward the sky, torn open on its under side, its mouth to the hole
  const F = ELBOW.f, mouth = { p: null, d: null };
  for (let i = 0; i < F.length - 1; i++) {
    const f = F[i], p = elbowAt(f), q = elbowAt(F[i + 1]), d = [q[0] - p[0], q[1] - p[1], 0], len = Math.hypot(d[0], d[1]);
    const up = [Math.sin(f), Math.cos(f), 0], last = i === F.length - 2;
    // (in this frame + is south: the wall is kept over the crown and down the north side, clear of the road)
    P.tube(B, lineMatrix(p, d, up), { r: LINE.r, len: len + 0.05, a0: i === 0 ? -2.5 : -2.7, a1: i === 0 ? -0.6 : 0.75 - i * 0.12, ragged: last ? 1 : 0.25, collar: i > 0, seed: 21 + i, seg: low ? 28 : 44, wear, glaze: GLAZES[i % 2 ? 3 : 0], inlay: i > 0 });
    if (last) { mouth.p = q; mouth.d = [d[0] / len, d[1] / len, 0]; }
  }
  // the spun register: the cradle the elbow hung in. A collector's cell above the torn mouth, on the line it took to
  // the sky, and filaments from it and from the elbow's collars to the capitals round about
  const stays = [];
  {
    const c = [mouth.p[0] + mouth.d[0] * 3.2, mouth.p[1] + mouth.d[1] * 3.2, LINE.z], CM = lineMatrix(c, mouth.d, [mouth.d[1], -mouth.d[0], 0]);
    P.cell(B, CM, { r: 2.5, n: low ? 10 : 18, wear, lit: 0 });
    const I = new THREE.Matrix4(), caps = [[260.5, -4.6, 44.5 - 0.9], [266, -4.6, 35.5 + 0.9], [266, -4.6, 44.5 - 0.9], [255, -4.8, 35.5 + 0.9]];
    const rim = (a, r = 2.5) => new THREE.Vector3(Math.sin(a) * r, Math.cos(a) * r, 0).applyMatrix4(CM).toArray();
    [[0.9, 0], [-0.7, 1], [0.4, 2], [-2.2, 3], [2.4, 0], [-1.4, 1]].forEach(([a, k]) => { strand(B, I, rim(a), caps[k], { t: 0.022, sag: 0.5, wear }); stays.push(caps[k]); });
    for (const a of [-2.4, -1.2, 0, 0.6]) { const e = new THREE.Vector3(Math.sin(a) * LINE.hoop, Math.cos(a) * LINE.hoop, 0).applyMatrix4(lineMatrix(mouth.p, mouth.d, [mouth.d[1], -mouth.d[0], 0])).toArray(); strand(B, I, rim(a), e, { t: 0.018, wear }); }
    // a second, smaller cell fallen and hung by two filaments over the road's first hoop
    const c2 = [264.6, WY + 6.4, 38.4], C2 = lineMatrix(c2, [0.5, -0.6, 0.62], [0, 1, 0]);
    P.cell(B, C2, { r: 1.25, n: low ? 8 : 12, wear });
    const r2 = (a) => new THREE.Vector3(Math.sin(a) * 1.25, Math.cos(a) * 1.25, 0).applyMatrix4(C2).toArray();
    strand(B, I, r2(0.3), caps[1], { t: 0.018, sag: 0.3, wear }); strand(B, I, r2(-0.5), rim(1.6), { t: 0.018, sag: 0.8, wear });
  }
  // the lesser line's collar before the Heliarchs' south door: it left the hall through it. It stands free of the old
  // frame (0.8 m out, its bore clear of the lintel's corners); its lower arc is under the water, outside the pitched
  // carrier's nose and the boards
  P.collar(B, lineMatrix([DOOR.x, DOOR.sill + 1.5, DOOR.z - 0.8], [0, 0, 1]), { r: 2.9, t: 0.22, seg: low ? 30 : 44, wear, glaze: GLAZES[1], inlay: true });
  // the Late folk's takings
  for (const e of extras) {
    const M = new THREE.Matrix4().makeTranslation(...e.at);
    if (e.kind === 'bulb') P.node(B, M, { r: e.r, lit: e.lit, ports: [[0, 1.45]], pr: e.r * 0.3, seg: 14, wear: null });
    else put(B, new THREE.SphereGeometry(e.r, 10, 8).scale(1, 1.25, 1), M, { color: NOON.honey, glow: 1.6 * e.lit, jit: 0 });
  }
  const mesh = new THREE.Mesh(B.geometry(), noonGlass('noon-glass', WY));
  mesh.name = 'noon-road-glass'; mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh); below.keep(mesh);
  // the stored light: a steady lamp over each vessel that still holds it (lights.js keeps the nearest three)
  const lights = [], LAMPS = lamps();
  // (v14-F1) a light is kept 3.3 m off any column's axis (its face ~2.4 m), moved straight away from it: the last
  // carrier's, 1.6 m from the south row's column at (293.5, 44.5), washed that column's face flat and pale at eye
  // height, and from the road's east end it read as daylight
  const cols = ctx.nave?.columns || [], KEEP = 3.3;
  for (const [x0, y, z0, s, reach] of LAMPS) {
    let x = x0, z = z0;
    for (const c of cols) { const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz); if (d < KEEP && d > 1e-3) { x = c.x + (dx / d) * KEEP; z = c.z + (dz / d) * KEEP; } }
    const L = new THREE.PointLight(new THREE.Color(NOON.lightHex), 9 * s, reach + 4, 2);
    L.position.set(x, y + 0.6, z); L.name = 'noon-road-light'; scene.add(L); lights.push({ L, i: 9 * s, ph: x * 0.37 });
  }
  const update = (dt, t) => { for (const l of lights) l.L.intensity = l.i * (0.94 + 0.06 * Math.sin(t * 0.7 + l.ph)); }; // it breathes; it does not flicker
  return { mesh, lights, lamps: LAMPS, update, tris: B.tris, vessels: VESSELS.length, lit: VESSELS.filter((v) => v.lit > 0).length, hoops: HOOPS.length };
}
