// BA The Hawser [Proposed] (v5 wonder; IDEAS-v4.md BA, wilderness-v4.md "Yes, emphatically"; site in
// wilderness-v4-placement.md section 5 and answer 3). One stud-link chain of dressed iron, each link 15 m long, runs taut
// and straight from a bronze hawse collar in the bare rock of the north wall (on the bearing of (-120, -380), where the
// face reaches y 100) down across the north-west floor into the Sunken Court's paving at COURT.hawser (-40, -189), where
// it goes into the ground. It is held down: once in a long while whatever is below takes one more link. The whole chain
// jerks 10 m (one link's pitch) toward the court, overshoots and settles over about two seconds, bowing a little across
// its length; a groan the whole bowl hears comes from its midpoint (ctx.audio 'hawser-groan'), and dust shaken off the
// links falls down its whole length and thins away over four to six seconds.
// Straight rather than a catenary: the chain is under a tension that takes out the sag, and a straight line lets the
// shift be one translation of the whole instanced mesh. Links are one InstancedMesh, each along the line and turned
// 90 degrees from the one before; the shift is the mesh's position along the line, kept modulo two pitches (the pattern
// repeats every two links), so there is no per-link CPU work. Links run on past both ends, into the rock behind the
// collar and into the ground below the paving, so a link always comes out of the wall and goes into the floor.
// Interval: 90-240 s from a private rng; the first falls within 60 s of first standing within 160 m of the chain.
// `?hawser=shift` forces one 3 s after the frames start; `__fp.hawser.shift(at)` forces one (posed `at` seconds in).
// `?hawser=0` leaves the whole thing out. Draws: the links, the collar, the dust (only while it falls).
import * as THREE from 'three';
import { SITES } from '../world.js';
import { COURT } from '../structures/court.js';
import { hyp } from '../noise.js';

const FLAG = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('hawser') : null;

// a stud link after an anchor cable's proportions (outer length 6 bar diameters, width 3.6): bar 2.5 m, so the link
// is 15 m by 9 m and the pitch (its inner length, the spacing of linked links) is 10 m
export const LINK = { len: 15, bar: 2.5, width: 9, pitch: 10 };
export const HAWSER = { anchorY: 100, entry: COURT.hawser, every: [90, 240], first: 60, near: 160 };
const TAU = Math.PI * 2;

export async function build(ctx) {
  if (FLAG === '0') { ctx.hawser = null; return; }
  const { terrain, scene } = ctx;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(8811);

  // ---- the line: from the paving (E) up to where it meets the face (A); u points down it, toward the court
  const site = SITES.hawser;
  const bearing = ((Math.atan2(site.from[1], site.from[0]) * 180) / Math.PI + 90 + 360) % 360;
  const F = ctx.mountains.faceAt(bearing, HAWSER.anchorY);
  if (!F) { console.warn('hawser: the wall has no face at bearing', bearing.toFixed(0), 'and height', HAWSER.anchorY, 'm; the chain is left out'); ctx.hawser = null; return; }
  const E = new THREE.Vector3(HAWSER.entry.x, terrain.heightAt(HAWSER.entry.x, HAWSER.entry.z) + 0.12, HAWSER.entry.z);
  const A = new THREE.Vector3(F.x, HAWSER.anchorY, F.z);
  const u = new THREE.Vector3().subVectors(E, A);
  const L = u.length();
  u.divideScalar(L);
  const H = new THREE.Vector3().crossVectors(u, new THREE.Vector3(0, 1, 0)).normalize(); // across the line, level
  const V = new THREE.Vector3().crossVectors(H, u).normalize(); // across the line, up
  const P = LINK.pitch, bar = LINK.bar / 2, Rc = LINK.width / 2 - bar, half = LINK.len / 2 - bar - Rc;
  const at = (s, out = new THREE.Vector3()) => out.copy(A).addScaledVector(u, s); // s metres down from the anchor
  // clearance over the ground along the line (the envelope's underside), for the notes
  let clear = Infinity, clearAt = 0;
  for (let s = 20; s < L - 30; s += 2) {
    const p = at(s), g = terrain.heightAt(p.x, p.z), c = p.y - LINK.width / 2 - g;
    if (c < clear) { clear = c; clearAt = s; }
  }

  // ---- one link: a stadium-shaped loop of octagonal bar (dressed: flat facets), long axis local x, in the xy plane,
  // with a stud across its waist banded in bronze. Vertex colours: iron, rust where water runs, worn bright where the
  // links bear on each other. `dust`: how much settles on the upward faces (the shader reads which way is up).
  const IRON = new THREE.Color('#2a2622'), RUST = new THREE.Color('#4a2e1e'), WORN = new THREE.Color('#57524b'), BRONZE = new THREE.Color('#5e4526');
  const pos = [], nor = [], col = [], dust = [];
  const N2 = ctx.noise.noise2, c = new THREE.Color();
  function vert(x, y, z, nx, ny, nz, cc, d) { pos.push(x, y, z); nor.push(nx, ny, nz); col.push(cc.r, cc.g, cc.b); dust.push(d); }
  const SIDES = 8, nS = low ? 8 : 14, nL = low ? 2 : 3;
  const path = []; // [x, y, tx, ty]
  const arc = (cx, a0, a1) => { for (let k = 0; k < nS; k++) { const a = a0 + ((a1 - a0) * k) / nS; path.push([cx + Math.cos(a) * Rc, Math.sin(a) * Rc, -Math.sin(a), Math.cos(a)]); } };
  const line = (x0, y0, x1, y1) => { const l = Math.hypot(x1 - x0, y1 - y0); for (let k = 0; k < nL; k++) { const f = k / nL; path.push([x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, (x1 - x0) / l, (y1 - y0) / l]); } };
  arc(half, -Math.PI / 2, Math.PI / 2); line(half, Rc, -half, Rc); arc(-half, Math.PI / 2, (3 * Math.PI) / 2); line(-half, -Rc, half, -Rc);
  const ring = path.map(([x, y, tx, ty]) => {
    // the section's frame: n2 in the link's plane, out from the loop; z out of it
    const n2x = ty, n2y = -tx;
    const corners = [];
    for (let j = 0; j < SIDES; j++) { const f = ((j + 0.5) / SIDES) * TAU; corners.push([x + Math.cos(f) * n2x * bar * 1.04, y + Math.cos(f) * n2y * bar * 1.04, Math.sin(f) * bar * 1.04]); }
    return { x, y, n2x, n2y, corners };
  });
  const colourAt = (x, y, z, inner) => {
    const n = 0.5 + 0.5 * N2(x * 0.35 + z * 0.2, y * 0.35 - z * 0.15);
    c.copy(IRON).lerp(RUST, Math.max(0, n - 0.35) * 1.4);
    if (inner) c.lerp(WORN, 0.75);
    return c.multiplyScalar(0.9 + 0.2 * n);
  };
  for (let i = 0; i < ring.length; i++) {
    const r0 = ring[i], r1 = ring[(i + 1) % ring.length];
    for (let j = 0; j < SIDES; j++) {
      const j1 = (j + 1) % SIDES, fm = ((j + 1) / SIDES) * TAU; // the facet's middle, between corners j and j+1
      const q = [[r0, j], [r1, j], [r1, j1], [r0, j], [r1, j1], [r0, j1]];
      for (const [r, k] of q) {
        const [x, y, z] = r.corners[k];
        const nx = Math.cos(fm) * r.n2x, ny = Math.cos(fm) * r.n2y, nz = Math.sin(fm);
        // where linked links bear: the inside of each end bend
        const inner = Math.abs(r.x) > half + Rc * 0.55 && Math.cos(fm) < -0.3;
        vert(x, y, z, nx, ny, nz, colourAt(x, y, z, inner), 0.55 + 0.45 * N2(x * 0.6 + 3.1, z * 0.6 + y * 0.4));
      }
    }
  }
  // the stud: an octagonal bar across the waist, from bar to bar, with a bronze band at its middle
  {
    const sr = 0.75, y0 = -(Rc - bar) - 0.4, y1 = Rc - bar + 0.4, ys = [y0, -0.6, -0.6, 0.6, 0.6, y1];
    for (let k = 0; k < ys.length - 1; k++) {
      if (ys[k] === ys[k + 1]) continue;
      const band = ys[k] > -0.7 && ys[k + 1] < 0.7, rr = band ? sr * 1.12 : sr;
      for (let j = 0; j < SIDES; j++) {
        const a0 = (j / SIDES) * TAU, a1 = ((j + 1) / SIDES) * TAU, am = (a0 + a1) / 2;
        const p = (a, y) => [Math.cos(a) * rr, y, Math.sin(a) * rr];
        for (const [a, y] of [[a0, ys[k]], [a1, ys[k + 1]], [a0, ys[k + 1]], [a0, ys[k]], [a1, ys[k]], [a1, ys[k + 1]]]) {
          const [x, yy, z] = p(a, y);
          vert(x, yy, z, Math.cos(am), 0, Math.sin(am), band ? BRONZE : colourAt(x, yy, z, false), 0.4);
        }
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('dust', new THREE.Float32BufferAttribute(dust, 1));
  geo.computeBoundingSphere();
  // wind every triangle to face along its own normal
  {
    const p = geo.attributes.position.array, n = geo.attributes.normal.array, swaps = [geo.attributes.normal.array, geo.attributes.color.array];
    const d = geo.attributes.dust.array;
    for (let t = 0; t < p.length; t += 9) {
      const e1x = p[t + 3] - p[t], e1y = p[t + 4] - p[t + 1], e1z = p[t + 5] - p[t + 2];
      const e2x = p[t + 6] - p[t], e2y = p[t + 7] - p[t + 1], e2z = p[t + 8] - p[t + 2];
      const cx = e1y * e2z - e1z * e2y, cy = e1z * e2x - e1x * e2z, cz = e1x * e2y - e1y * e2x;
      if (cx * n[t] + cy * n[t + 1] + cz * n[t + 2] >= 0) continue;
      for (const a of [p, ...swaps]) for (let k = 0; k < 3; k++) { const q = a[t + 3 + k]; a[t + 3 + k] = a[t + 6 + k]; a[t + 6 + k] = q; }
      const i = t / 3, q = d[i + 1]; d[i + 1] = d[i + 2]; d[i + 2] = q;
    }
  }

  // ---- the links' material: iron with dust lying on whichever faces are up, and the shift's bow across the line
  const U = {
    uA: { value: A }, uU: { value: u }, uH: { value: H }, uL: { value: L }, uOff: { value: 0 }, uShake: { value: 0 },
    uDust: { value: new THREE.Color('#8c7d69') },
  };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.55, roughness: 0.62 });
  mat.customProgramCacheKey = () => 'hawser-links';
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uA, uU, uH; uniform float uL, uOff, uShake; attribute float dust; varying float vTop; varying float vDust;`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        vTop = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal).y; vDust = dust;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          // the shift's bow: the line swings across itself, most at the middle, nothing where it is held
          vec3 ip = (instanceMatrix * vec4(transformed, 1.0)).xyz + uU * uOff;
          float bow = sin(3.14159265 * clamp(dot(ip - uA, uU) / uL, 0.0, 1.0));
          transformed += transpose(mat3(instanceMatrix)) * (uH * (uShake * bow));
        }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uDust; varying float vTop; varying float vDust;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb = mix(diffuseColor.rgb, uDust, smoothstep(0.2, 0.8, vTop) * vDust);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.95, smoothstep(0.3, 0.85, vTop) * vDust);`);
  };

  // ---- the instances: from two pitches inside the rock to past the paving; even links stand in the vertical plane
  // through the line, odd ones lie across it (each a little rolled, the same for every pair, so two pitches repeat)
  const N = Math.ceil(L / P) + 4;
  const links = new THREE.InstancedMesh(geo, mat, N);
  {
    const m = new THREE.Matrix4(), w = new THREE.Vector3(), z = new THREE.Vector3(), o = new THREE.Vector3();
    const roll = 0.14;
    for (let k = 0; k < N; k++) {
      const a = (k % 2 ? Math.PI / 2 : 0) + roll;
      w.copy(V).multiplyScalar(Math.cos(a)).addScaledVector(H, Math.sin(a));
      z.crossVectors(u, w);
      at(k * P - 2 * P, o);
      m.makeBasis(u, w, z).setPosition(o);
      links.setMatrixAt(k, m);
    }
  }
  links.computeBoundingSphere();
  links.name = 'hawser-links';
  links.castShadow = true; links.receiveShadow = true;
  scene.add(links);

  // ---- the anchor: a bronze hawse collar set in the rock, the chain going into its dark throat, on a boss of
  // dressed iron let into the face. One mesh, one material.
  const anchorParts = [];
  {
    const n = new THREE.Vector3(); terrain.normalAt(F.x, F.z, n);
    // the collar: a lathe about its own axis (local y out of the rock, along u)
    const prof = [[6.6, -16], [6.6, -1.2], [7.1, 1.0], [8.3, 2.3], [10.2, 2.9], [11.7, 2.5], [12.2, 1.5], [11.7, 0.2], [11.2, -16]].map(([r, y]) => new THREE.Vector2(r, y));
    const lathe = new THREE.LatheGeometry(prof, low ? 16 : 28).toNonIndexed();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), u);
    lathe.applyQuaternion(q).translate(A.x, A.y, A.z);
    anchorParts.push([lathe, 'collar']);
    // the boss: an octagon of dressed iron let into the face, upright, facing out along the ground's level normal,
    // its front a little proud of the rock where the collar comes through
    const out = new THREE.Vector3(n.x, 0, n.z).normalize();
    const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), out).normalize();
    const faceM = (cx, cy, cz) => new THREE.Matrix4().makeBasis(side, new THREE.Vector3(0, 1, 0), out).setPosition(cx, cy, cz);
    const boss = new THREE.CylinderGeometry(17, 17, 16, 8, 1).rotateX(Math.PI / 2).rotateZ(Math.PI / 8).toNonIndexed();
    boss.applyMatrix4(faceM(A.x - out.x * 7.6, A.y, A.z - out.z * 7.6));
    anchorParts.push([boss, 'plate']);
  }
  const anchorGeo = (() => {
    let count = 0; for (const [g] of anchorParts) count += g.attributes.position.count;
    const p = new Float32Array(count * 3), cc = new Float32Array(count * 3);
    let o = 0;
    const verd = new THREE.Color('#3b6655'), bron = new THREE.Color('#5a4024'), dark = new THREE.Color('#141312'), plateC = new THREE.Color('#121110');
    for (const [g, kind] of anchorParts) {
      const a = g.attributes.position.array;
      for (let i = 0; i < a.length; i += 3) {
        p[o * 3] = a[i]; p[o * 3 + 1] = a[i + 1]; p[o * 3 + 2] = a[i + 2];
        const x = a[i] - A.x, y = a[i + 1] - A.y, z = a[i + 2] - A.z, along = x * u.x + y * u.y + z * u.z;
        const rr = Math.sqrt(Math.max(0, x * x + y * y + z * z - along * along));
        const nn = 0.5 + 0.5 * N2(a[i] * 0.2 + a[i + 1] * 0.13, a[i + 2] * 0.2 - a[i + 1] * 0.11);
        if (kind === 'plate') c.copy(plateC).lerp(RUST, nn * 0.25);
        else c.copy(bron).lerp(verd, Math.max(0, nn - 0.3) * 1.3);
        // the throat goes black as it goes into the rock
        if (kind === 'collar' && rr < 7.3) c.lerp(dark, Math.min(1, Math.max(0, (1.2 - along) / 6)));
        cc[o * 3] = c.r; cc[o * 3 + 1] = c.g; cc[o * 3 + 2] = c.b;
        o++;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  })();
  const anchor = new THREE.Mesh(anchorGeo, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.45, roughness: 0.72, side: THREE.DoubleSide }));
  anchor.name = 'hawser-anchor';
  anchor.castShadow = true; anchor.receiveShadow = true;
  scene.add(anchor);

  const horiz = Math.hypot(u.x, u.z); // metres on the ground per metre of chain
  // ---- colliders: where the links come down within a body's height of the ground (near the paving), so a walker
  // can come up against the iron; beyond that the chain passes overhead and nothing stands on the ground
  for (let hd = 0; hd <= 12.5; hd += 2) {
    const p = at(L - hd / horiz), g = terrain.heightAt(p.x, p.z);
    ctx.addCollider({ x: p.x, z: p.z, r: 3.2, y: g - 0.5, h: p.y + LINK.width / 2 - g + 0.5 });
  }

  // ---- the dust: shaken off the links all along the line, falling and drifting downwind, gone in 4-6 s
  const DN = low ? 1100 : 2600;
  const dBase = new Float32Array(DN * 3), dSeed = new Float32Array(DN * 4), dDir = new Float32Array(DN * 4);
  {
    const p = new THREE.Vector3();
    for (let i = 0; i < DN; i++) {
      const s = 4 + rng() * (L - 6);
      at(s, p).addScaledVector(V, (rng() - 0.3) * 4.2).addScaledVector(H, (rng() - 0.5) * 7);
      dBase[i * 3] = p.x; dBase[i * 3 + 1] = p.y; dBase[i * 3 + 2] = p.z;
      // delay (the shiver runs up the line from the paving), fall rate, life, size
      dSeed[i * 4] = 1 - s / L; dSeed[i * 4 + 1] = rng(); dSeed[i * 4 + 2] = rng(); dSeed[i * 4 + 3] = rng();
      const a = rng() * TAU, e = (rng() - 0.3) * 1.2;
      dDir[i * 4] = Math.cos(a) * Math.cos(e); dDir[i * 4 + 1] = Math.sin(e); dDir[i * 4 + 2] = Math.sin(a) * Math.cos(e);
      dDir[i * 4 + 3] = terrain.heightAt(p.x, p.z) + 0.3;
    }
  }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute('position', new THREE.BufferAttribute(dBase, 3));
  dGeo.setAttribute('aSeed', new THREE.BufferAttribute(dSeed, 4));
  dGeo.setAttribute('aDir', new THREE.BufferAttribute(dDir, 4));
  dGeo.boundingSphere = new THREE.Sphere(at(L / 2), L / 2 + 40);
  const flick = ctx.sky?.flicker || { value: 1 };
  const DU = { uT: { value: 0 }, uScale: { value: 400 }, uFlicker: flick, uCol: { value: new THREE.Color('#857360') }, uWind: { value: new THREE.Vector3(1.1, 0, 0.45) } };
  const dMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]),
    fog: true, transparent: true, depthWrite: false,
    vertexShader: /* glsl */`
      uniform float uT, uScale; uniform vec3 uWind;
      attribute vec4 aSeed, aDir; varying float vA;
      #include <fog_pars_vertex>
      void main() {
        float t = uT - aSeed.x * 0.55 - 0.04;
        float life = 4.0 + 2.0 * aSeed.z, k = clamp(t / life, 0.0, 1.0);
        vec3 transformed = position;
        if (t > 0.0) {
          transformed += aDir.xyz * (1.0 - exp(-2.5 * t)) * (0.6 + 1.2 * aSeed.w);
          transformed += uWind * t * (0.4 + aSeed.y);
          transformed.y -= (0.25 + 0.9 * aSeed.y) * t + 0.12 * aSeed.y * t * t;
          transformed.y = max(transformed.y, aDir.w);
        }
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float depth = -mvPosition.z;
        vA = t > 0.0 ? smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.45, 1.0, k)) * (0.22 + 0.2 * aSeed.w) * smoothstep(8.0, 30.0, depth) : 0.0;
        gl_PointSize = t > 0.0 ? clamp((0.5 + 2.2 * k + 0.7 * aSeed.w) * uScale / max(depth, 0.1), 1.5, 48.0) : 0.0;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uCol; uniform float uFlicker; varying float vA;
      #include <fog_pars_fragment>
      void main() {
        vec2 c = (gl_PointCoord - 0.5) * 2.0; float r2 = dot(c, c);
        float a = vA * exp(-r2 * 2.2) * (1.0 - smoothstep(0.6, 1.0, r2));
        if (a < 0.004) discard;
        gl_FragColor = vec4(uCol * (0.55 + 0.45 * uFlicker), a);
        #include <fog_fragment>
      }`,
  });
  Object.assign(dMat.uniforms, DU);
  const dustPts = new THREE.Points(dGeo, dMat);
  dustPts.name = 'hawser-dust';
  dustPts.visible = false; dustPts.renderOrder = 22;
  scene.add(dustPts);

  // ---- the shift: base is where the pattern stands (0 or one pitch), x the jerk's travel, a damped spring from rest
  const MID = { x: 0, y: 0, z: 0 };
  { const m = at(L / 2); MID.x = m.x; MID.y = m.y; MID.z = m.z; }
  const DUR = 6.5, TAU_S = 0.3, OM = TAU / 0.95;
  const S = { clock: 0, next: HAWSER.every[0] + rng() * (HAWSER.every[1] - HAWSER.every[0]), metNear: false, active: false, el: 0, base: 0, count: 0 };
  if (FLAG === 'shift') S.next = 3;
  const size = new THREE.Vector2();
  function pose(el) {
    const x = P * (1 - Math.exp(-el / TAU_S) * (Math.cos(OM * el) + Math.sin(OM * el) / (OM * TAU_S)));
    let o = (S.base + (el < 0 ? 0 : x)) % (2 * P); if (o < 0) o += 2 * P;
    links.position.set(u.x * o, u.y * o, u.z * o);
    U.uOff.value = o;
    U.uShake.value = 0.55 * Math.exp(-el / 0.55) * Math.sin(TAU * 1.7 * el);
    DU.uT.value = el;
  }
  function begin(el0 = 0) {
    S.active = true; S.el = el0; S.count++;
    dustPts.visible = true;
    ctx.renderer.getDrawingBufferSize(size);
    DU.uScale.value = size.y / (2 * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov) * 0.5));
    ctx.audio?.cue?.('hawser-groan', MID);
    pose(S.el);
  }
  function end() {
    S.active = false; S.base = (S.base + P) % (2 * P);
    dustPts.visible = false; U.uShake.value = 0; pose(-1);
    S.next = S.clock + HAWSER.every[0] + rng() * (HAWSER.every[1] - HAWSER.every[0]);
  }
  // the player's distance to the line on the ground (E to A), no allocation
  const ax = A.x, az = A.z, ex = E.x - A.x, ez = E.z - A.z, ee = ex * ex + ez * ez;
  const distToLine = (x, z) => { const f = Math.min(1, Math.max(0, ((x - ax) * ex + (z - az) * ez) / ee)); return hyp(x - ax - ex * f, z - az - ez * f); };
  ctx.registerUpdate((dt) => {
    S.clock += dt;
    const pp = ctx.player.pos;
    if (!S.metNear && distToLine(pp.x, pp.z) < HAWSER.near) {
      S.metNear = true;
      if (S.next - S.clock > HAWSER.first) S.next = S.clock + 15 + rng() * (HAWSER.first - 15);
    }
    if (!S.active && S.clock >= S.next) begin();
    if (!S.active) return;
    S.el += dt;
    if (S.el >= DUR) { end(); return; }
    pose(S.el);
    // the links move: the shadow map follows them while the walker is in the shadow box's reach
    if (S.el < 2.5 && distToLine(pp.x, pp.z) < 220) ctx.renderer.shadowMap.needsUpdate = true;
  }, { pos: MID, r: L / 2, near: 600, hz: 4 });

  const tris = (geo.attributes.position.count / 3) * N + anchorGeo.attributes.position.count / 3;
  ctx.hawser = {
    A, E, u, L, pitch: P, links: N, mid: MID, state: S, clearance: { min: clear, at: clearAt },
    // force a shift, posed `el0` seconds in (views use it for the mid-shift render)
    shift: (el0 = 0) => { if (S.active) end(); begin(el0); },
    stats: () => ({ calls: 2 + (dustPts.visible ? 1 : 0), tris: Math.round(tris), dust: DN }),
  };
  ctx.log(`hawser: anchor (${A.x.toFixed(1)}, ${A.y.toFixed(1)}, ${A.z.toFixed(1)}), entry (${E.x}, ${E.y.toFixed(2)}, ${E.z}), ${L.toFixed(1)} m, ${N} links, least clearance ${clear.toFixed(1)} m at ${clearAt} m, ${Math.round(tris)} tris`);
}
