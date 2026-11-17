// The Swallow's parts (v17-U1): the conduit and its saddles, the tube's glass, its planks and lenses, the weed and the
// silt in the current. One opaque mesh for everything of stone, wood and glaze (under the kit's dark, the water over
// it: water.js swPatch), one for the clear glass, one instanced set of weed, one of silt. Called by swallow.js.
import * as THREE from 'three';
import { UnderBuilder, underMaterial } from '../../v14/under.js';
import { NOON, GLAZES } from '../../v8/strata/noon.js';
import { AQUEDUCT as A, SWALLOW as SP } from '../plan.js';
import { SW, SW_GLSL, swPatch, MAX_LAMPS } from './water.js';
import { buildHead } from './head.js';

const C = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
// the Heliarchs' stone, dressed and pale where it was out of the water's reach, darker and green-stained in it
const STONE = C('#8f8778'), STONE_D = C('#6c665e'), STONE_W = C('#4f5a4c'), SILT = C('#3d3a2e'), WOOD = C('#6b5d4a'), WOOD_D = C('#4b4236');
const hash = (a) => { const v = Math.sin(a * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

export function buildParts(ctx, L) {
  const low = ctx.quality === 'low', strata = ctx.strata?.parts?.noon;
  const W = SP.pool, CH = A.conduit;
  const rng = ctx.makeRng(1702);
  // the line's frame at s: the axis point, the heading (3D, down the slope), the right (level), the up
  const frameAt = (s) => {
    const a = L.at(Math.max(0, Math.min(L.LEN, s))), y = L.floorY(s), k = L.slope(s);
    const t = new THREE.Vector3(a.tx, k, a.tz).normalize(), r = new THREE.Vector3(-a.tz, 0, a.tx), u = new THREE.Vector3().crossVectors(r, t).normalize();
    return { x: a.x, z: a.z, y, ax: y + A.axisUp, t, r, u, tx: a.tx, tz: a.tz };
  };

  // ---- the lamps: the tube's lenses that still hold a little noon, and the two lights from the ends (the portal's
  // daylight down in the head, the Garth's noon at the door). They light the water (water.js) and bake the glow
  const LENS_S = [2.6, 11, 27, 44, 61]; // (the first in the arch: the noon that draws a visitor in, seen from the shore)
  const lenses = LENS_S.map((s) => { const f = frameAt(s); return { s, x: f.x, y: f.ax + A.outer - 0.07, z: f.z }; }); // (set in the glass's crown, its rim on the glass)
  const dawn = { x: -94.5, y: -6.6, z: 312.5 }, noon = { x: -31.2, y: A.profile.at(-1)[1] + 1.4, z: 318 };
  const glowAt = (x, y, z) => {
    let g = 0;
    for (const l of lenses) { const dx = x - l.x, dy = y - l.y, dz = z - l.z; g += 0.55 / (1 + (dx * dx + dy * dy + dz * dz) / 5); }
    { const dx = x - noon.x, dy = y - noon.y, dz = z - noon.z; g += 1.2 / (1 + (dx * dx + dy * dy + dz * dz) / 30); }
    return Math.min(1.4, g);
  };
  // the sky's share: the head's daylight through the portal, nothing past the turn
  // (outside the face: the moor's light and haze; in the arch and the head, the daylight that comes in at the portal)
  const skyAt = (x, y, z) => { const dz = z - SP.face, dx = x + 94.5; return dz <= 0.02 ? 1 : Math.max(0.012, 0.22 * Math.exp(-dz / 2.5) * Math.exp(-Math.abs(dx) / 14)); };
  const lit = (x, y, z, out) => { out[0] = skyAt(x, y, z); out[1] = z <= SP.face + 0.02 ? 1 : 0; out[2] = glowAt(x, y, z); return out; };
  const S = new UnderBuilder(lit), K = new UnderBuilder(lit); // the stone; the wood and the glaze (no courses)

  // ---- the conduit: a loft of one ring shape along the line (floor, walls, a round vault), facing in, coursed
  // (each block its own shade, a course every 0.6 m up, a block 1.2 m along), the water's stain to the crown
  // the head first (it finds where the line leaves it: the conduit's first ring)
  const KV = low ? 10 : 14;
  const uPx = { value: 1 }, env = { ctx, L, S, K, frameAt, rng, low, uPx, KV };
  const head = buildHead(env);
  const S0 = env.conduitStart, S1 = L.LEN - 0.03; // from the head's east wall to the Garth's wall
  const ring = [];
  { // (u across, v up from the conduit's floor), in order round from the right foot
    const h = CH.half, sp = CH.spring;
    for (let i = 0; i <= 3; i++) ring.push([h - (2 * h * i) / 3, 0]);
    for (let i = 1; i <= 3; i++) ring.push([-h, (sp * i) / 3]);
    for (let i = 1; i < KV; i++) { const a = Math.PI - (Math.PI * i) / KV; ring.push([h * Math.cos(a), sp + h * Math.sin(a)]); }
    for (let i = 0; i <= 3; i++) ring.push([h, sp - (sp * i) / 3]);
  }
  // (the first ring is laid in the head's east wall's plane, so the loft meets the wall's hole edge to edge)
  const conduitPt = (s, u, v) => { const f = frameAt(s), fy = f.y - CH.below; return [s <= S0 + 1e-6 ? env.headWallX : f.x + f.r.x * u, fy + v, s <= S0 + 1e-6 ? f.z + (f.r.z / Math.hypot(f.r.x, f.r.z)) * u : f.z + f.r.z * u]; };
  const DSc = 1.2;
  const nS = Math.ceil((S1 - S0) / DSc);
  for (let j = 0; j < nS; j++) {
    const sa = S0 + (j * (S1 - S0)) / nS, sb = S0 + ((j + 1) * (S1 - S0)) / nS;
    for (let k = 0; k < ring.length - 1; k++) {
      const [ua, va] = ring[k], [ub, vb] = ring[k + 1], vm = (va + vb) / 2;
      const a = conduitPt(sa, ua, va), b = conduitPt(sa, ub, vb), c = conduitPt(sb, ub, vb), d = conduitPt(sb, ua, va);
      const f = frameAt((sa + sb) / 2), cen = [f.x, f.y - CH.below + CH.spring, f.z], mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2];
      const course = Math.floor(vm / 0.6), j2 = Math.floor((sa + (course % 2) * 0.6) / 1.2), hsh = hash(course * 13.1 + j2 * 7.7);
      const isFloor = va < 0.01 && vb < 0.01;
      let col = isFloor ? SILT : STONE;
      const wet = (mid[1] < W + 0.3) ? 1 : 0.4;
      col = col.map((v, i) => (isFloor ? v : v * (0.86 + 0.18 * hsh)) * (1 - 0.35 * wet) + STONE_W[i] * 0.35 * wet * (isFloor ? 0 : 1));
      S.quad(a, b, c, d, col, [cen[0] - mid[0], cen[1] - mid[1], cen[2] - mid[2]], 0.06);
    }
  }
  // a black end where the loft starts (until the head is built, round 2) and the bulkhead at the door: the conduit's
  // section closed round the tube's circle
  const capAt = (s, face) => {
    const f = frameAt(s), cx = f.x, cy = f.ax, cz = f.z;
    const outer = (u, v) => conduitPt(s, u, v);
    const n = ring.length - 1;
    for (let k = 0; k < n; k++) {
      const [ua, va] = ring[k], [ub, vb] = ring[k + 1];
      const pa = outer(ua, va), pb = outer(ub, vb);
      const ang = (p) => Math.atan2(p[1] - cy, (p[0] - cx) * f.r.x + (p[2] - cz) * f.r.z);
      const R = A.outer + 0.02, ca = ang(pa), cb = ang(pb);
      const tp = (a) => [cx + f.r.x * Math.cos(a) * R, cy + Math.sin(a) * R, cz + f.r.z * Math.cos(a) * R];
      S.quad(pa, pb, tp(cb), tp(ca), STONE_D, [f.t.x * face, f.t.y * face, f.t.z * face], 0.08);
    }
  };
  capAt(S1, -1);

  // ---- the saddles: dressed blocks the tube was laid in, every 5.5 m; and the collars where its lengths join
  const tubeR = A.outer;
  for (let s = S0 + 2; s < S1 - 1; s += 5.5) {
    // a bed block under the belly (its top a hand under the glass) and a cheek either side, clear of the glass's curve
    const f = frameAt(s), yb = f.y - CH.below, top = f.ax - tubeR - 0.03, cheek = f.ax - 1.02;
    const yaw = Math.atan2(f.tx, f.tz);
    S.box(f.x, (yb + top) / 2, f.z, 1.0, (top - yb) / 2, 0.45, yaw, STONE_D, STONE, 0.1);
    for (const sd of [-1, 1]) { const u = sd * 1.85; S.box(f.x + f.r.x * u, (yb + cheek) / 2, f.z + f.r.z * u, 0.3, (cheek - yb) / 2, 0.42, yaw, STONE_D, STONE, 0.1); }
  }
  const putCollar = (s, glaze) => {
    if (!strata) return;
    const f = frameAt(s), M = new THREE.Matrix4().makeBasis(f.u, f.r, f.t).setPosition(f.x, f.ax, f.z);
    strata.collar(K, M, { r: tubeR + 0.05, t: 0.085, seg: low ? 20 : 32, glaze });
  };
  for (let s = 4.6, i = 0; s < L.LEN - 1.5; s += 4.2, i++) putCollar(s, GLAZES[i % 4]);
  // the lenses in its crown: the stored noon, a bull's-eye each, glowing (one in four still lights the water)
  for (const l of lenses) {
    if (!strata) break;
    const f = frameAt(l.s), M = new THREE.Matrix4().makeBasis(f.r, f.t.clone().negate(), f.u.clone().negate()).setPosition(l.x, l.y, l.z);
    strata.lens(K, M, { r: 0.36, lit: 0.6, cheap: low });
  }

  // ---- the planks: the Late folk's treads down the bore (a riser every 0.2 m of fall where it is steep, boards laid
  // level between), two stringers under them
  const pw = Math.sqrt(A.bore * A.bore - A.axisUp * A.axisUp) - 0.02; // the planks' half-width where they meet the bore
  {
    let s = 0.05;
    while (s < L.LEN - 0.05) {
      const k = Math.abs(L.slope(s + 0.2)), run = k > 0.08 ? Math.min(0.9, 0.2 / k) : 0.42, s2 = Math.min(L.LEN - 0.05, s + run);
      const fa = frameAt(s), fb = frameAt(s2), y = L.floorY((s + s2) / 2) + (k > 0.08 ? 0.09 : 0), pale = rng() < 0.12;
      const g = pale ? 1.35 : 0.7 + rng() * 0.45, col = WOOD.map((v) => v * g);
      const P = (f, u, yy) => [f.x + f.r.x * u, yy, f.z + f.r.z * u];
      const w = pw - 0.04 - rng() * 0.06;
      K.quad(P(fa, w, y), P(fa, -w, y), P(fb, -w, y), P(fb, w, y), col, [0, 1, 0], 0.08);
      if (k > 0.08) { const yl = y - 0.2; K.quad(P(fb, w, y), P(fb, -w, y), P(fb, -w, yl), P(fb, w, yl), WOOD_D, [fb.t.x, 0, fb.t.z], 0.05); }
      s = s2 + 0.012;
    }
    for (const sd of [-1, 1]) for (let s = 0.3; s < L.LEN - 0.05; s += 1.0) {
      const fa = frameAt(s), fb = frameAt(Math.min(L.LEN - 0.05, s + 1.0)), u = sd * (pw - 0.3);
      K.beam([fa.x + fa.r.x * u, fa.y - 0.22, fa.z + fa.r.z * u], [fb.x + fb.r.x * u, fb.y - 0.22, fb.z + fb.r.z * u], 0.07, WOOD_D, 0.05);
    }
  }

  const stoneMat = swPatch(underMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.02 }), 'swallow-stone', NOON.lightHex), 'stone', { mortar: true });
  const stone = new THREE.Mesh(S.geometry(), stoneMat);
  stone.name = 'swallow-stone'; stone.receiveShadow = true; stone.castShadow = false;
  const woodMat = swPatch(underMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.02 }), 'swallow-wood', NOON.lightHex), 'wood', { caustic: 0.6 });
  const wood = new THREE.Mesh(K.geometry(), woodMat);
  wood.name = 'swallow-wood'; wood.receiveShadow = true; wood.castShadow = false;

  // ---- the glass: one thin wall the length of the line, clear (no sun has touched it), a lime line where it rides
  // the pool's surface in the head, crazed and clouded only at its broken lip
  const NA = low ? 22 : 32, GDS = 0.5;
  const gpos = [], gnor = [], gcol = [], gund = [], gidx = [];
  const nG = Math.ceil(L.LEN / GDS);
  const RG = A.outer - 0.05;
  const lip = (a) => 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(a * 5.3 + 1.1)) + 0.4 * hash(Math.round(a * 4)); // the broken end's ragged edge
  for (let j = 0; j <= nG; j++) {
    const sj = (j * L.LEN) / nG, f = frameAt(sj);
    for (let i = 0; i <= NA; i++) {
      const a = (i / NA) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      // the lip: the crown and the shoulders broken back, ragged; the belly runs out to the end
      let s = sj;
      if (j === 0) s = Math.max(0, lip(a) * (0.5 + 0.5 * Math.max(0, ca)));
      const ff = j === 0 ? frameAt(s) : f;
      const nx = ff.r.x * sa + ff.u.x * ca, ny = ff.r.y * sa + ff.u.y * ca, nz = ff.r.z * sa + ff.u.z * ca;
      gpos.push(ff.x + nx * RG, ff.ax + ny * RG, ff.z + nz * RG); gnor.push(nx, ny, nz);
      const tint = 0.9 + 0.08 * Math.sin(sj * 1.7 + a * 2);
      gcol.push(0.78 * tint, 0.86 * tint, 0.8 * tint);
      gund.push(skyAt(ff.x, ff.ax, ff.z), 0, glowAt(ff.x, ff.ax + ny * RG, ff.z));
    }
  }
  for (let j = 0; j < nG; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1; gidx.push(a, c, b, b, c, d); }
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.Float32BufferAttribute(gpos, 3));
  gg.setAttribute('normal', new THREE.Float32BufferAttribute(gnor, 3));
  gg.setAttribute('color', new THREE.Float32BufferAttribute(gcol, 3));
  gg.setAttribute('aUnder', new THREE.Float32BufferAttribute(gund, 3));
  gg.setIndex(gidx); gg.computeBoundingSphere();
  const gm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const gprev = gm.onBeforeCompile;
  gm.onBeforeCompile = (sh, r) => {
    gprev?.call(gm, sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
      {
        // clear: little of it seen face on, more at a slant, the lime line where it rides the pool, the old crust at its lip
        float gFr = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 2.5);
        float gLine = (1.0 - smoothstep(0.0, 0.35, abs(vUnderW.y - uSwPool - 0.05))) * step(vUnderW.x, -78.0);
        float gLip = 0.6 - 0.6 * smoothstep(0.0, 0.9, length(vUnderW.xz - vec2(${L.at(0).x.toFixed(2)}, ${L.at(0).z.toFixed(2)})));
        diffuseColor.a = clamp(0.07 + 0.5 * gFr + 0.6 * gLine + 0.55 * gLip, 0.0, 0.92);
        outgoingLight = mix(outgoingLight, vec3(0.42, 0.41, 0.36) * (0.4 + 0.6 * vUnder.x), max(gLine, gLip) * 0.6);
      }
      #include <opaque_fragment>`);
  };
  const gkey = gm.customProgramCacheKey?.bind(gm);
  gm.customProgramCacheKey = () => (gkey ? gkey() : '') + '|swallow-glass';
  // (the underMaterial and the water go on after: the water's swPatch replaces the same include after this one, so the
  // alpha above is set first and the water darkens what shows through)
  const glassMat = swPatch(underMaterial(gm, 'swallow-glass', NOON.lightHex), 'glass', { caustic: 0.35 });
  const glass = new THREE.Mesh(gg, glassMat);
  glass.name = 'swallow-glass'; glass.renderOrder = 2; glass.castShadow = false;

  // ---- the weed: ribbons rooted on the conduit's floor beside the saddles and in the joints of its walls, streaming
  // toward the dark with the current, waving
  const NW = low ? 220 : 420;
  const rib = new THREE.PlaneGeometry(0.09, 1, 1, 6).translate(0, 0.5, 0);
  const wmat = new THREE.ShaderMaterial({
    uniforms: { ...SW },
    vertexShader: /* glsl */`
      uniform float uSwT; uniform vec2 uSwFlow;
      attribute vec4 aW; // phase, length, lean, shade
      varying vec3 vW; varying float vShade, vTip;
      void main() {
        vec3 p = position; float h = p.y * aW.y; p.y = 0.0;
        vec4 root = modelMatrix * instanceMatrix * vec4(p, 1.0);
        float f = h / max(aW.y, 0.01);
        float wave = sin(uSwT * 1.4 + aW.x + f * 3.0) * 0.18 + sin(uSwT * 2.3 + aW.x * 1.7 + f * 5.0) * 0.07;
        vec3 flow = vec3(uSwFlow.x, 0.0, uSwFlow.y), side = vec3(-uSwFlow.y, 0.0, uSwFlow.x);
        vec3 w = root.xyz + vec3(0.0, h * (1.0 - 0.5 * aW.z * f), 0.0) + flow * (aW.z * f * f * aW.y * 0.9 + wave * f) + side * (sin(uSwT * 1.1 + aW.x * 2.1 + f * 2.0) * 0.12 * f);
        vW = w; vShade = aW.w; vTip = f;
        gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
      }`,
    fragmentShader: /* glsl */`
      ${SW_GLSL}
      varying vec3 vW; varying float vShade, vTip;
      void main() {
        vec3 base = mix(vec3(0.05, 0.07, 0.035), vec3(0.16, 0.18, 0.07), vShade) * (0.6 + 0.5 * vTip);
        vec3 col = base * (swLight(vW) * 9.0 * (0.5 + 2.5 * swCaustic(vW)));
        gl_FragColor = vec4(swWater(col, vW), 1.0);
      }`,
    side: THREE.DoubleSide,
  });
  const weed = new THREE.InstancedMesh(rib, wmat, NW);
  { const aW = new Float32Array(NW * 4), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); let n = 0;
    for (let tries = 0; n < NW && tries < NW * 6; tries++) {
      const s = S0 + 1 + rng() * (S1 - S0 - 2), f = frameAt(s), wall = rng() < 0.3;
      let u, v;
      if (wall) { const sd = rng() < 0.5 ? -1 : 1; u = sd * (CH.half - 0.04); v = rng() * CH.spring; }
      else { const sd = rng() < 0.5 ? -1 : 1; u = sd * (1.9 + rng() * (CH.half - 2.0)); v = 0.02; }
      const p = conduitPt(s, u, v);
      if (p[1] > W - 0.4) continue;
      e.set((rng() - 0.5) * 0.3, rng() * Math.PI, (rng() - 0.5) * 0.3); q.setFromEuler(e);
      M.compose(new THREE.Vector3(p[0], p[1], p[2]), q, new THREE.Vector3(1, 1, 1));
      weed.setMatrixAt(n, M);
      aW.set([rng() * 6.28, 0.5 + rng() * (wall ? 0.7 : 1.4), 0.4 + rng() * 0.5, rng()], n * 4); n++;
    }
    weed.count = n;
    rib.setAttribute('aW', new THREE.InstancedBufferAttribute(aW, 4)); }
  weed.computeBoundingSphere(); weed.boundingSphere.radius += 1.6; // (it sways: bounded with room for it)
  weed.name = 'swallow-weed';

  // ---- the silt: motes carried down the conduit with the current, a few tumbling; only in the water, never in the bore
  const NM = low ? 420 : 900, SA = 22, SB = Math.min(S1 - 0.5, 57), RANGE = SB - SA;
  const mpos = new Float32Array(NM * 3), mA = new Float32Array(NM * 4);
  for (let i = 0; i < NM; i++) {
    let u, v, tries = 0;
    do { u = (rng() * 2 - 1) * (CH.half - 0.25); v = 0.15 + rng() * (CH.spring + CH.half - 0.6); tries++; }
    while (tries < 20 && ((u * u + (v - CH.below - A.axisUp) ** 2) < (A.outer + 0.15) ** 2 || (v > CH.spring && u * u + (v - CH.spring) ** 2 > (CH.half - 0.25) ** 2)));
    mpos.set([u, v, 0], i * 3);
    mA.set([rng(), 0.18 + rng() * 0.28, rng() * 6.28, 0.5 + rng()], i * 4);
  }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute('position', new THREE.Float32BufferAttribute(mpos, 3));
  mg.setAttribute('aM', new THREE.Float32BufferAttribute(mA, 4));
  // the straight's line in the shader: x, z at SA, its heading, and the conduit floor's level as a line in s
  const fA = frameAt(30), fB = frameAt(60), kY = (fB.y - fA.y) / 30;
  const mmat = new THREE.ShaderMaterial({
    uniforms: { ...SW, uLine: { value: new THREE.Vector4(L.at(SA).x, L.at(SA).z, fA.tx, fA.tz) }, uY: { value: new THREE.Vector3(fA.y - CH.below - kY * (30 - SA), kY, RANGE) }, uPx },
    vertexShader: /* glsl */`
      uniform float uSwT, uSwPool, uPx; uniform vec4 uLine; uniform vec3 uY;
      attribute vec4 aM; // where along (0..1), speed, phase, size
      varying vec3 vW; varying float vA;
      void main() {
        float s = fract(aM.x + uSwT * aM.y / uY.z) * uY.z;
        vec2 h = uLine.zw, r = vec2(-h.y, h.x);
        float tum = sin(uSwT * 0.7 + aM.z) * 0.18;
        vec3 w = vec3(uLine.x + h.x * s + r.x * (position.x + tum), uY.x + uY.y * s + position.y + sin(uSwT * 0.5 + aM.z * 2.0) * 0.15, uLine.y + h.y * s + r.y * (position.x + tum));
        vW = w;
        // fade in and out at the ends of the run, and never over the pool's surface
        vA = smoothstep(0.0, 4.0, s) * (1.0 - smoothstep(uY.z - 4.0, uY.z, s)) * step(w.y, uSwPool - 0.1);
        vec4 mv = viewMatrix * vec4(w, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uPx * 0.028 * aM.w / -mv.z, 1.0, 6.0);
      }`,
    fragmentShader: /* glsl */`
      ${SW_GLSL}
      varying vec3 vW; varying float vA;
      void main() {
        vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); if (d > 0.25 || vA <= 0.0) discard;
        vec3 col = vec3(0.55, 0.52, 0.42) * swLight(vW) * 14.0;
        vec3 mid; float p = swPath(vW, mid);
        float k = exp(-p * 0.22);
        gl_FragColor = vec4(swWater(col, vW), vA * k * (1.0 - d * 4.0) * 0.85);
      }`,
    transparent: true, depthWrite: false,
  });
  const motes = new THREE.Points(mg, mmat);
  const conduitSphere = () => { const a = frameAt(S0), b = frameAt(S1); const c = new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); return new THREE.Sphere(c, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) / 2 + 6); };
  mg.boundingSphere = conduitSphere(); // (moved in its shader: bounded by the conduit)
  motes.name = 'swallow-silt'; motes.renderOrder = 1;
  const ds = new THREE.Vector2();
  const update = () => { ctx.renderer.getDrawingBufferSize(ds); mmat.uniforms.uPx.value = ds.y / (2 * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov) * 0.5)); };

  // ---- the bubbles: strings of them rising off the floor beside the tube and off the tube's crown at its collars (air
  // still working out of the old joints), wobbling as they go, gone at the vault or the surface
  const NB = low ? 26 : 44, PER = 7;
  const bpos = [], bA = [];
  for (let i = 0; i < NB; i++) {
    const crown = rng() < 0.4, s = crown ? 4.6 + 4.2 * Math.floor(rng() * ((L.LEN - 6) / 4.2)) : 17 + rng() * (S1 - 19);
    if (s < 15) continue;
    const f = frameAt(s), u = crown ? (rng() - 0.5) * 0.5 : (rng() < 0.5 ? -1 : 1) * (2.15 + rng() * 1.1);
    const y0 = crown ? f.ax + tubeR + 0.08 : f.y - CH.below + 0.05, top = Math.min(W - 0.08, f.y - CH.below + CH.spring + CH.half * Math.sqrt(Math.max(0, 1 - (u / CH.half) ** 2)) - 0.1);
    if (top - y0 < 0.6) continue;
    const speed = 0.45 + rng() * 0.4, ph = rng();
    for (let k = 0; k < PER; k++) { bpos.push(f.x + f.r.x * u, y0, f.z + f.r.z * u); bA.push(top - y0, speed, (ph + k / PER + rng() * 0.05) % 1, 0.6 + rng() * 0.8); }
  }
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.Float32BufferAttribute(bpos, 3));
  bg.setAttribute('aB', new THREE.Float32BufferAttribute(bA, 4));
  const bmat = new THREE.ShaderMaterial({
    uniforms: { ...SW, uPx: mmat.uniforms.uPx },
    vertexShader: /* glsl */`
      uniform float uSwT, uPx; uniform vec2 uSwFlow;
      attribute vec4 aB; // the rise, speed, phase, size
      varying vec3 vW; varying float vA;
      void main() {
        float f = fract(uSwT * aB.y / aB.x + aB.z), h = f * aB.x;
        vec3 w = position + vec3(sin(uSwT * 7.0 + aB.z * 40.0) * 0.03 + uSwFlow.x * h * 0.12, h, cos(uSwT * 6.0 + aB.z * 31.0) * 0.03 + uSwFlow.y * h * 0.12);
        vW = w; vA = smoothstep(0.0, 0.04, f) * (1.0 - smoothstep(0.9, 1.0, f));
        vec4 mv = viewMatrix * vec4(w, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uPx * 0.07 * aB.w * (0.8 + 0.4 * f) / -mv.z, 2.0, 16.0);
      }`,
    fragmentShader: /* glsl */`
      ${SW_GLSL}
      varying vec3 vW; varying float vA;
      void main() {
        vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
        // a bubble: a bright rim, a clear middle, a glint up and to one side
        float rim = smoothstep(0.32, 0.45, d) * (1.0 - smoothstep(0.45, 0.5, d)), glint = 1.0 - smoothstep(0.0, 0.12, length(c - vec2(-0.14, -0.14)));
        vec3 col = vec3(0.75, 0.9, 0.82) * (0.5 + swLight(vW) * 30.0) * (rim + glint * 1.4);
        vec3 mid; float p = swPath(vW, mid);
        gl_FragColor = vec4(swWater(col, vW), vA * max(rim, glint) * exp(-p * 0.18));
      }`,
    transparent: true, depthWrite: false,
  });
  const bubbles = new THREE.Points(bg, bmat);
  bg.boundingSphere = conduitSphere();
  bubbles.name = 'swallow-bubbles'; bubbles.renderOrder = 1;

  // ---- the lights: the nearest three of these are live (lights.js); the lenses' noon, the door's
  const lights = [];
  const addLight = (p, hex, i, d) => { const Lt = new THREE.PointLight(new THREE.Color(hex), i, d, 2); Lt.position.set(p.x, p.y, p.z); Lt.name = 'swallow-light'; lights.push({ L: Lt, i, ph: p.x * 0.37 }); };
  for (const l of lenses) addLight({ x: l.x, y: l.y - 0.35, z: l.z }, NOON.lightHex, 1.5, 8);
  // the water's own light (water.js): the lenses, the door, the head's daylight
  const LP = SW.uSwLampP.value, LC = SW.uSwLampC.value, nl = new THREE.Color(NOON.lightHex);
  let li = 0;
  const lamp = (p, col, k, reach) => { if (li >= MAX_LAMPS) return; LP[li].set(p.x, p.y, p.z, reach); LC[li].set(col.r * k, col.g * k, col.b * k); li++; };
  for (const l of lenses) lamp(l, nl, 0.018, 3.2);
  lamp(noon, nl, 0.05, 7);
  lamp(dawn, new THREE.Color('#d9805a'), 0.05, 7);

  return { meshes: [stone, wood, glass, weed, motes, bubbles, ...head.meshes], lights, update, lenses, frameAt, quayGround: head.quayGround, quayFloor: head.quayFloor, quayKeep: head.quayKeep, quayPath: head.quayPath, headVolume: head.headVolume, cut: head.cut };
}
