// Low plants: grass and sedge, heather, reeds. Each kind is generated into 24 m chunks and stored
// once; every frame the chunks inside the view frustum and draw distance are packed, nearest
// first, into one instanced buffer per kind, so each kind costs one draw call. Inside a chunk the
// instances are shuffled and carry their rank, so a prefix is a uniform subsample: far chunks copy
// only a prefix, and the vertex shader thins and shrinks each instance by its own distance.
import * as THREE from 'three';
import { clamp, lerp, smoothstep, GLSL_WIND, unflipNormals } from './util.js';

const CHUNK = 24, CMIN = -324, CN = 27; // 27 * 24 = 648 m square

// ---------- geometry ----------
// Plant geometry carries position, normal, color and aBlade = (t: height fraction, family, rand, tintWeight).
class PlantGeo {
  constructor() { this.p = []; this.n = []; this.c = []; this.a = []; this.i = []; }
  v(x, y, z, nx, ny, nz, c, t, fam, rnd, tw) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.c.push(c[0], c[1], c[2]); this.a.push(t, fam, rnd, tw);
    return this.p.length / 3 - 1;
  }
  tri(a, b, c) { this.i.push(a, b, c); }
  build() {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aBlade', new THREE.Float32BufferAttribute(this.a, 4));
    g.setIndex(this.i);
    return g;
  }
}
const ONE = [1, 1, 1];
// A tapered, curving blade: base width w, height h, leaning along (dx,dz) by `lean` of its height.
function blade(pg, rng, x0, z0, ang, w, h, lean, segs, fam, col = ONE, tw = 1, tipW = 0) {
  const dx = Math.cos(ang), dz = Math.sin(ang);
  const px = -dz, pz = dx; // width axis
  const rnd = rng();
  const nx = dx * 0.55, ny = 0.8, nz = dz * 0.55;
  const L = [], R = [];
  for (let s = 0; s <= segs; s++) {
    const t = s / segs;
    const off = lean * h * t * t;
    const y = h * t * (1 - lean * lean * 0.35 * t);
    const ww = lerp(w, tipW, Math.pow(t, 1.3)) * 0.5;
    const cx = x0 + dx * off, cz = z0 + dz * off;
    if (s === segs && tipW === 0) { L.push(pg.v(cx, y, cz, nx, ny, nz, col, t, fam, rnd, tw)); break; }
    L.push(pg.v(cx - px * ww, y, cz - pz * ww, nx, ny, nz, col, t, fam, rnd, tw));
    R.push(pg.v(cx + px * ww, y, cz + pz * ww, nx, ny, nz, col, t, fam, rnd, tw));
  }
  for (let s = 0; s < segs; s++) {
    if (s === segs - 1 && tipW === 0) { pg.tri(L[s], R[s], L[s + 1]); break; }
    pg.tri(L[s], R[s], R[s + 1]); pg.tri(L[s], R[s + 1], L[s + 1]);
  }
  return { dx, dz, lean, h, rnd };
}

// Grass cluster: three families in one geometry. The shader shows family sets per instance, so
// it reads as three variants: fine tussock + bent broad blades, fine + seed stalks, or all.
function grassGeo(rng) {
  const pg = new PlantGeo();
  for (let k = 0; k < 7; k++) { // fine
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 0.2;
    blade(pg, rng, Math.cos(a) * r, Math.sin(a) * r, a + (rng() - 0.5) * 1.2, 0.03 + rng() * 0.014, 0.28 + rng() * 0.28, 0.18 + rng() * 0.3, 2, 0);
  }
  const seed = [1.25, 0.72, 0.5];
  for (let k = 0; k < 2; k++) { // tall seed stalks with a small head
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 0.14;
    const h = 0.62 + rng() * 0.3, lean = 0.08 + rng() * 0.15;
    const x0 = Math.cos(a) * r, z0 = Math.sin(a) * r;
    const bl = blade(pg, rng, x0, z0, a, 0.011, h, lean, 2, 1);
    // head: a narrow diamond hugging the top 22% of the stalk, following its lean
    const t0 = 0.74, t1 = 1.04;
    const at = (t) => [x0 + bl.dx * lean * h * t * t, h * t, z0 + bl.dz * lean * h * t * t];
    const p0 = at(t0), p1 = at((t0 + t1) / 2), p2 = at(t1);
    const wx = -bl.dz * 0.014, wz = bl.dx * 0.014;
    const rnd = rng();
    const i0 = pg.v(p0[0], p0[1], p0[2], bl.dx, 0.6, bl.dz, seed, t0, 1, rnd, 1);
    const i1 = pg.v(p1[0] - wx, p1[1], p1[2] - wz, bl.dx, 0.6, bl.dz, seed, (t0 + t1) / 2, 1, rnd, 1);
    const i2 = pg.v(p1[0] + wx, p1[1], p1[2] + wz, bl.dx, 0.6, bl.dz, seed, (t0 + t1) / 2, 1, rnd, 1);
    const i3 = pg.v(p2[0], p2[1], p2[2], bl.dx, 0.6, bl.dz, seed, 1, 1, rnd, 1);
    pg.tri(i0, i2, i1); pg.tri(i1, i2, i3);
  }
  for (let k = 0; k < 2; k++) { // broad, bent over
    const a = rng() * Math.PI * 2, r = 0.06 + rng() * 0.14;
    blade(pg, rng, Math.cos(a) * r, Math.sin(a) * r, a + (rng() - 0.5) * 0.6, 0.05 + rng() * 0.02, 0.4 + rng() * 0.22, 0.45 + rng() * 0.25, 2, 2);
  }
  return pg.build();
}

// Heather (ling): a dome of wiry woody stalks, the upper half of each a spike of bloom.
function heatherGeo(rng) {
  const pg = new PlantGeo();
  const wood = [0.55, 0.45, 0.36], bloom = [1, 1, 1];
  for (let k = 0; k < 16; k++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 0.16;
    const x0 = Math.cos(a) * r, z0 = Math.sin(a) * r;
    const h = (0.36 - r * 1.1) * (0.8 + rng() * 0.4), lean = 0.35 + r * 2.5 + rng() * 0.2; // taller in the middle: a dome
    const dx = Math.cos(a), dz = Math.sin(a);
    const at = (t) => [x0 + dx * lean * h * t, h * t, z0 + dz * lean * h * t];
    const rnd = rng();
    const b0 = at(0), b1 = at(0.75);
    const wx = -dz * 0.016, wz = dx * 0.016;
    const nx = dx * 0.5, nz = dz * 0.5;
    const s0 = pg.v(b0[0] - wx, b0[1] - 0.02, b0[2] - wz, nx, 0.8, nz, wood, 0.1, 0, rnd, 0.25);
    const s1 = pg.v(b0[0] + wx, b0[1] - 0.02, b0[2] + wz, nx, 0.8, nz, wood, 0.1, 0, rnd, 0.25);
    const s2 = pg.v(b1[0], b1[1], b1[2], nx, 0.8, nz, wood, 0.75, 0, rnd, 0.25);
    pg.tri(s0, s1, s2);
    const m0 = at(0.4), m1 = at(0.72), m2 = at(1.04);
    const ca = a + Math.PI / 2 + (rng() - 0.5);
    const ox = Math.cos(ca) * 0.03, oz = Math.sin(ca) * 0.03;
    const i0 = pg.v(m0[0], m0[1], m0[2], nx, 0.8, nz, bloom, 0.4, 1, rnd, 1);
    const i1 = pg.v(m1[0] - ox, m1[1], m1[2] - oz, nx, 0.8, nz, bloom, 0.72, 1, rnd, 1);
    const i2 = pg.v(m1[0] + ox, m1[1], m1[2] + oz, nx, 0.8, nz, bloom, 0.72, 1, rnd, 1);
    const i3 = pg.v(m2[0], m2[1], m2[2], nx, 0.8, nz, bloom, 1, 1, rnd, 1);
    pg.tri(i0, i2, i1); pg.tri(i1, i2, i3);
  }
  return pg.build();
}

// Reeds and bulrushes: tall thin stems, arching strap leaves, a couple of brown cattail heads.
// Reed-free gaps on the tarn shore: the north shore facing the woman in the water, and the north-east bank.
const OPEN_SHORE = [[-90, 52], [-49, 69]];

function reedGeo(rng) {
  const pg = new PlantGeo();
  const stems = [];
  for (let k = 0; k < 7; k++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 0.28;
    const x0 = Math.cos(a) * r, z0 = Math.sin(a) * r;
    const h = 1.5 + rng() * 1.0, lean = 0.04 + rng() * 0.1;
    stems.push({ x0, z0, a, h, lean, ...blade(pg, rng, x0, z0, a, 0.026, h, lean, 3, 0, ONE, 1, 0) });
  }
  for (let k = 0; k < 4; k++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 0.2;
    blade(pg, rng, Math.cos(a) * r, Math.sin(a) * r, a, 0.05, 0.9 + rng() * 0.5, 0.55 + rng() * 0.3, 3, 1, [0.9, 0.95, 0.8], 1, 0);
  }
  // one slender seed head per clump, long and narrow, riding high on the tallest stem
  const head = [0.2, 0.11, 0.06];
  stems.sort((p, q) => q.h - p.h);
  for (let k = 0; k < 1; k++) {
    const s = stems[k];
    const at = (t) => [s.x0 + s.dx * s.lean * s.h * t * t, s.h * t * (1 - s.lean * s.lean * 0.35 * t), s.z0 + s.dz * s.lean * s.h * t * t];
    const t0 = 0.72, t1 = 0.9, rr = 0.017, sides = 5;
    // the head shares its stem's rand: the shader scales each blade's height (and so its wind bend)
    // by a hash of it, and a head with its own rand floated off the stem and swung on its own
    const rnd = s.rnd;
    const ringAt = (t) => {
      const c = at(t), out = [];
      for (let j = 0; j < sides; j++) {
        const an = (j / sides) * Math.PI * 2;
        out.push(pg.v(c[0] + Math.cos(an) * rr, c[1], c[2] + Math.sin(an) * rr, Math.cos(an), 0.2, Math.sin(an), head, t, 2, rnd, 0));
      }
      return out;
    };
    const A = ringAt(t0), B = ringAt(t1);
    for (let j = 0; j < sides; j++) { const j1 = (j + 1) % sides; pg.tri(A[j], B[j], B[j1]); pg.tri(A[j], B[j1], A[j1]); }
    const ct = at(t1 + 0.01), cb = at(t0 - 0.01);
    const it = pg.v(ct[0], ct[1], ct[2], 0, 1, 0, head, t1, 2, rnd, 0), ib = pg.v(cb[0], cb[1], cb[2], 0, -1, 0, head, t0, 2, rnd, 0);
    for (let j = 0; j < sides; j++) { const j1 = (j + 1) % sides; pg.tri(B[j], it, B[j1]); pg.tri(A[j1], ib, A[j]); }
  }
  return pg.build();
}

// Bracken: broad arching fronds, rust and dying.
function brackenGeo(rng) {
  const pg = new PlantGeo();
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + rng() * 0.6, r = rng() * 0.12;
    blade(pg, rng, Math.cos(a) * r, Math.sin(a) * r, a, 0.2 + rng() * 0.08, 0.65 + rng() * 0.35, 0.75 + rng() * 0.25, 4, 0, [1, 1, 1], 1, 0);
  }
  return pg.build();
}
// Pale flower spikes: three stems in a clump, florets up the top half, a few strap leaves.
function flowerGeo(rng) {
  const pg = new PlantGeo();
  const stemC = [0.16, 0.2, 0.1], leafC = [0.14, 0.18, 0.1];
  for (let k = 0; k < 3; k++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 0.12;
    const x0 = Math.cos(a) * r, z0 = Math.sin(a) * r, h = 0.9 + rng() * 0.7, lean = 0.05 + rng() * 0.1;
    const bl = blade(pg, rng, x0, z0, a, 0.016, h, lean, 2, 0, stemC, 0);
    const n = 12;
    for (let i = 0; i < n; i++) {
      const t = 0.55 + 0.45 * (i / (n - 1));
      const cx = x0 + bl.dx * lean * h * t * t, cy = h * t, cz = z0 + bl.dz * lean * h * t * t;
      const fa = i * 2.4 + rng(), fs = 0.026 * (1.2 - 0.6 * (i / n));
      const ox = Math.cos(fa) * fs, oz = Math.sin(fa) * fs;
      const rnd = rng();
      const i0 = pg.v(cx, cy - fs * 0.6, cz, ox, 0.7, oz, [1, 1, 1], t, 1, rnd, 1);
      const i1 = pg.v(cx + ox * 1.1, cy + fs * 0.2, cz + oz * 1.1, ox, 0.7, oz, [1, 1, 1], t, 1, rnd, 1);
      const i2 = pg.v(cx - oz, cy + fs * 0.8, cz + ox, ox, 0.7, oz, [1, 1, 1], t, 1, rnd, 1);
      const i3 = pg.v(cx + oz, cy + fs * 0.8, cz - ox, ox, 0.7, oz, [1, 1, 1], t, 1, rnd, 1);
      pg.tri(i0, i1, i2); pg.tri(i0, i3, i1);
    }
  }
  for (let k = 0; k < 4; k++) { const a = rng() * Math.PI * 2; blade(pg, rng, 0, 0, a, 0.05, 0.35 + rng() * 0.2, 0.6, 2, 2, leafC, 0); }
  return pg.build();
}
// Broad black-green fleshy leaves, cycad or giant hosta: a creased rosette.
function fleshyGeo(rng) {
  const pg = new PlantGeo();
  const nL = 7, segs = 4;
  for (let k = 0; k < nL; k++) {
    const a = (k / nL) * Math.PI * 2 + rng() * 0.5;
    const dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx;
    const len = 0.8 + rng() * 0.45, W = 0.22 + rng() * 0.1, rise = 0.5 + rng() * 0.35;
    const rows = [];
    const rnd = rng();
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const out = len * t, y = rise * Math.sin(t * Math.PI * 0.8) * (1 - 0.4 * t) + 0.02;
      const w = W * Math.sin(Math.min(1, t * 1.15) * Math.PI) * 0.5 + 0.01;
      const cx = dx * out, cz = dz * out;
      const crease = 0.05 * Math.sin(t * Math.PI);
      const n0 = [dx * 0.3, 0.9, dz * 0.3];
      rows.push([
        pg.v(cx - px * w, y - crease, cz - pz * w, n0[0] - px * 0.4, n0[1], n0[2] - pz * 0.4, [1, 1, 1], t, 0, rnd, 1),
        pg.v(cx, y + crease * 0.4, cz, n0[0], n0[1], n0[2], [2.2, 2.2, 1.7], t, 0, rnd, 1),
        pg.v(cx + px * w, y - crease, cz + pz * w, n0[0] + px * 0.4, n0[1], n0[2] + pz * 0.4, [1, 1, 1], t, 0, rnd, 1),
      ]);
    }
    for (let s = 0; s < segs; s++) {
      const A = rows[s], B = rows[s + 1];
      pg.tri(A[0], A[1], B[1]); pg.tri(A[0], B[1], B[0]);
      pg.tri(A[1], A[2], B[2]); pg.tri(A[1], B[2], B[1]);
    }
  }
  return pg.build();
}

// ---------- material ----------
function makePlantMaterial(ctx, shared, o) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const u = {
    uTime: shared.time, uR0: { value: o.r0 }, uFade0: { value: o.fade0 }, uFade1: { value: o.fade1 },
    uWind: { value: o.wind }, uTip: { value: new THREE.Color(o.tip || '#7a2e14') }, uBase: { value: new THREE.Color(o.base || '#ffffff') },
    uTrans: { value: o.trans ?? 1.5 }, uSunDir: { value: ctx.sun.vec }, uComp: { value: o.comp ?? 1.8 }, uExp: { value: o.exp ?? 1 },
    // The Wrong Colour [Proposed]: within 8 m of the eddy everything low is bleached grey-brown
    uGrey: shared.grey,
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec4 aBlade; attribute vec4 iPos; attribute vec4 iShape; attribute vec4 iTint;
        uniform float uTime, uR0, uFade0, uFade1, uWind, uComp, uExp; uniform vec3 uTip, uBase; uniform vec4 uGrey;
        varying float vFpT; varying vec3 vFpW;
        ${GLSL_WIND}`)
      .replace('#include <color_vertex>', `
        float fpDist = distance(cameraPosition.xz, iPos.xz);
        float fpDens = pow(min(1.0, uR0 / max(fpDist, 0.001)), uExp) * (1.0 - smoothstep(uFade0, uFade1, fpDist));
        float fpKeep = clamp((fpDens - iShape.z) / 0.1, 0.0, 1.0);
        float fpVar = floor(iShape.w); float fpSeed = fract(iShape.w);
        float fam = aBlade.y;
        float fpShow = 1.0;
        if (fpVar < 0.5 && fam > 0.5 && fam < 1.5) fpShow = 0.0;
        if (fpVar > 0.5 && fpVar < 1.5 && fam > 1.5) fpShow = 0.0;
        float fpComp = clamp(inversesqrt(max(fpDens, 0.04)), 1.0, uComp);
        float fpBh = 0.75 + 0.5 * fract(sin((aBlade.z + fpSeed) * 91.7) * 437.5);
        float fpC = cos(iPos.w), fpS = sin(iPos.w);
        vColor = color * mix(uBase, iTint.rgb, aBlade.w);
        vColor = mix(vColor, uTip * (0.7 + 0.6 * fpSeed), smoothstep(0.6, 1.0, aBlade.x) * iTint.w * step(fam, 1.5));
        vColor *= mix(0.62, 1.0, smoothstep(0.0, 0.7, aBlade.x)) * (0.85 + 0.3 * fpBh - 0.15);
        {
          float fpG = (1.0 - smoothstep(uGrey.z * 0.6, uGrey.z, distance(iPos.xz, uGrey.xy))) * uGrey.w;
          float fpLum = dot(vColor, vec3(0.3, 0.59, 0.11));
          vColor = mix(vColor, vec3(fpLum) * vec3(1.06, 1.0, 0.9) * 1.35, fpG); // bleached: grey-brown and paler
        }
        vFpT = aBlade.x * aBlade.w;`)
      .replace('#include <beginnormal_vertex>', `
        vec3 objectNormal = vec3(normal.x * fpC - normal.z * fpS, normal.y, normal.x * fpS + normal.z * fpC);
        objectNormal = normalize(mix(objectNormal, vec3(0.0, 1.0, 0.0), 0.6));`)
      .replace('#include <begin_vertex>', `
        vec3 fpL = position;
        fpL.xz *= iShape.x * fpComp;
        fpL.y *= iShape.y * fpBh * mix(1.0, 1.35, (fpComp - 1.0) / max(uComp - 1.0, 0.01));
        vec3 transformed = iPos.xyz + vec3(fpL.x * fpC - fpL.z * fpS, fpL.y, fpL.x * fpS + fpL.z * fpC);
        vec2 fpWv = fpWind(transformed.xz + fpSeed * 3.0, uTime) * uWind;
        float fpBend = aBlade.x * aBlade.x;
        vec2 fpD = fpWv * fpBend * fpL.y;
        transformed.xz += fpD;
        transformed.y -= dot(fpD, fpD) * 0.6 / max(fpL.y, 0.05);
        transformed = mix(iPos.xyz, transformed, fpKeep * fpShow);
        vFpW = transformed;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTrans; uniform vec3 uSunDir; varying float vFpT; varying vec3 vFpW;`)
      .replace('#include <opaque_fragment>', `
        {
          vec3 fpV = normalize(vFpW - cameraPosition);
          float fpBack = pow(max(dot(fpV, uSunDir), 0.0), 3.0);
          // the low sun shines through the tips: borrow the (already shadowed) direct light
          outgoingLight += reflectedLight.directDiffuse * (0.5 + fpBack * uTrans * 1.8) * vFpT;
        }
        #include <opaque_fragment>`);
    unflipNormals(shader);
  };
  mat.customProgramCacheKey = () => 'fp-veg-plant';
  return mat;
}

// ---------- the chunked store ----------
// Chunks are generated on demand (each from its own rng stream, so order does not matter) and
// freed when far away; every frame the visible ones are packed into one instanced buffer.
class Kind {
  constructor(name, geo, mat, o, cap) {
    this.name = name; this.geo = geo; this.mat = mat; this.o = o;
    this.chunks = new Array(CN * CN).fill(null);
    this.scratch = []; this.total = 0; this.drawn = 0; this.sig = -1;
    this.cap = cap;
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aShape = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aTint = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iPos', this.aPos); geo.setAttribute('iShape', this.aShape); geo.setAttribute('iTint', this.aTint);
    geo.instanceCount = 0;
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false; // culled per chunk below
    this.mesh.receiveShadow = true; this.mesh.castShadow = false;
    this.mesh.name = `veg-${name}`;
    this.order = new Int32Array(CN * CN);
  }
  add(x, y, z, rot, sx, sy, variant, seed, r, g, b, rust) {
    this.scratch.push(x, y, z, rot, sx, sy, 0, variant + seed * 0.999, r, g, b, rust);
  }
  // Seal the scratch list as chunk k: shuffle, store rank in iShape.z.
  commit(k, rng) {
    const a = this.scratch, m = a.length / 12;
    const ci = k % CN, cj = Math.floor(k / CN), x0 = CMIN + ci * CHUNK, z0 = CMIN + cj * CHUNK;
    const ch = { n: m, x0, z0, x1: x0 + CHUNK, z1: z0 + CHUNK, d: 0, q: 0, pos: null, shape: null, tint: null, box: null, sphere: null };
    if (m) {
      const pos = new Float32Array(m * 4), shape = new Float32Array(m * 4), tint = new Float32Array(m * 4);
      const order = new Uint32Array(m); for (let i = 0; i < m; i++) order[i] = i;
      for (let i = m - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
      let y0 = Infinity, y1 = -Infinity;
      for (let i = 0; i < m; i++) {
        const s = order[i] * 12, d = i * 4;
        pos[d] = a[s]; pos[d + 1] = a[s + 1]; pos[d + 2] = a[s + 2]; pos[d + 3] = a[s + 3];
        shape[d] = a[s + 4]; shape[d + 1] = a[s + 5]; shape[d + 2] = (i + 0.5) / m; shape[d + 3] = a[s + 7];
        tint[d] = a[s + 8]; tint[d + 1] = a[s + 9]; tint[d + 2] = a[s + 10]; tint[d + 3] = a[s + 11];
        if (a[s + 1] < y0) y0 = a[s + 1]; if (a[s + 1] > y1) y1 = a[s + 1];
      }
      ch.pos = pos; ch.shape = shape; ch.tint = tint;
      ch.box = new THREE.Box3(new THREE.Vector3(x0 - 1, y0 - 0.5, z0 - 1), new THREE.Vector3(x0 + CHUNK + 1, y1 + this.o.height, z0 + CHUNK + 1));
      ch.sphere = new THREE.Sphere(new THREE.Vector3(x0 + CHUNK / 2, (y0 + y1) / 2, z0 + CHUNK / 2), CHUNK * 0.7072 + 2.5 + (y1 - y0 + this.o.height) / 2);
    }
    this.chunks[k] = ch; this.total += m;
    a.length = 0;
  }
  free(k) { const ch = this.chunks[k]; if (ch) { this.total -= ch.n; this.chunks[k] = null; } }
  // Pick visible chunks and how much of each to draw; repack only when that changes.
  update(px, pz, frustum, genCount) {
    const { r0, fade0, fade1 } = this.o, ex = this.o.exp || 1;
    let nv = 0, sig = genCount | 0;
    const pci = Math.floor((px - CMIN) / CHUNK), pcj = Math.floor((pz - CMIN) / CHUNK);
    for (let c = 0; c < this.chunks.length; c++) {
      const ch = this.chunks[c];
      if (!ch || !ch.n) continue;
      const dx = Math.max(ch.x0 - px, 0, px - ch.x1), dz = Math.max(ch.z0 - pz, 0, pz - ch.z1);
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d > fade1) continue;
      // the chunk underfoot and its eight neighbours are always drawn; the rest are tested as
      // spheres (half-diagonal plus room for sway and the far-distance widening) against the frustum
      const near = Math.abs((c % CN) - pci) <= 1 && Math.abs(Math.floor(c / CN) - pcj) <= 1;
      if (!near && !frustum.intersectsSphere(ch.sphere)) continue;
      const dens = Math.pow(Math.min(1, r0 / Math.max(d, 0.001)), ex) * (1 - smoothstep(fade0, fade1, d));
      if (dens <= 0) continue;
      const q = Math.min(64, Math.ceil(dens * 64 + 0.5)); // in 1/64 steps, rounded up
      ch.q = q; ch.d = d;
      this.order[nv++] = c;
      sig = (Math.imul(sig, 31) + c * 128 + q) | 0;
    }
    sig = (Math.imul(sig, 31) + nv) | 0;
    if (sig === this.sig) return;
    this.sig = sig;
    // nearest first so that if the cap is hit it is the far chunks that lose out
    const ord = this.order.subarray(0, nv);
    ord.sort((a, b) => (this.chunks[a].d - this.chunks[b].d) || (a - b)); // ties broken by index: a stable order
    let w = 0;
    const P = this.aPos.array, S = this.aShape.array, T = this.aTint.array;
    for (let i = 0; i < nv; i++) {
      const ch = this.chunks[ord[i]];
      let m = Math.ceil(ch.n * ch.q / 64);
      if (w + m > this.cap) m = this.cap - w;
      if (m <= 0) break;
      const e = m * 4;
      P.set(ch.pos.subarray(0, e), w * 4); S.set(ch.shape.subarray(0, e), w * 4); T.set(ch.tint.subarray(0, e), w * 4);
      w += m;
    }
    for (const a of [this.aPos, this.aShape, this.aTint]) { a.clearUpdateRanges(); a.addUpdateRange(0, w * 4); a.needsUpdate = true; }
    this.geo.instanceCount = w;
    this.drawn = w;
  }
}

// ---------- placement ----------
export function buildPlants(ctx, ground, shared) {
  const { landmarks: L, quality, noise } = ctx;
  const low = quality === 'low';
  const eddy = L.eddy;
  shared.grey = { value: new THREE.Vector4(eddy ? eddy.x : 0, eddy ? eddy.z : 0, 8, eddy ? 1 : 0) };
  const half = low ? 0.5 : 1;
  let rng = null; // per chunk, see genChunk
  const C = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };

  const grass = new Kind('grass', grassGeo(ctx.makeRng(3302)), makePlantMaterial(ctx, shared, { r0: 6.5, exp: 2.0, fade0: 85, fade1: 125, wind: 1.0, tip: '#8a3418', trans: 1.6, comp: 4.5 }), { r0: 6.5, exp: 2.0, fade0: 85, fade1: 125, height: 2 }, low ? 30000 : 60000);
  const heather = new Kind('heather', heatherGeo(ctx.makeRng(3303)), makePlantMaterial(ctx, shared, { r0: 10, exp: 1.6, fade0: 100, fade1: 150, wind: 0.22, base: '#a08868', trans: 0.6, comp: 3.2 }), { r0: 10, exp: 1.6, fade0: 100, fade1: 150, height: 1 }, low ? 12000 : 24000);
  const bracken = new Kind('bracken', brackenGeo(ctx.makeRng(3305)), makePlantMaterial(ctx, shared, { r0: 14, exp: 1.5, fade0: 90, fade1: 140, wind: 0.35, tip: '#6a2a12', trans: 1.4, comp: 2.4 }), { r0: 14, exp: 1.5, fade0: 90, fade1: 140, height: 1.4 }, low ? 8000 : 16000);
  const flowers = new Kind('flowers', flowerGeo(ctx.makeRng(3306)), makePlantMaterial(ctx, shared, { r0: 15, exp: 1.5, fade0: 100, fade1: 150, wind: 0.6, trans: 0.8, comp: 2.0 }), { r0: 15, exp: 1.5, fade0: 100, fade1: 150, height: 2 }, low ? 6000 : 12000);
  const fleshy = new Kind('fleshy', fleshyGeo(ctx.makeRng(3307)), makePlantMaterial(ctx, shared, { r0: low ? 20 : 28, fade0: 110, fade1: 160, wind: 0.12, trans: 0.5, comp: 1.2 }), { r0: low ? 20 : 28, fade0: 110, fade1: 160, height: 2 }, low ? 3000 : 6000);
  const reeds = new Kind('reeds', reedGeo(ctx.makeRng(3304)), makePlantMaterial(ctx, shared, { r0: 20, exp: 1.4, fade0: 100, fade1: 145, wind: 0.75, tip: '#7a4a22', trans: 1.2, comp: 2.0 }), { r0: 20, exp: 1.4, fade0: 100, fade1: 145, height: 3 }, low ? 10000 : 20000);

  // grass colours: dun-olive, sere, rust-tipped (olive rather than straw, so the moor is not desert under the red sun)
  const cTawny = C('#8e8c56'), cDry = C('#aaa478'), cOchre = C('#7c7a40'), cHeathG = C('#8a7058'), cWoodG = C('#4e5030'), cMarsh = C('#8a8a48'), cBleach = C('#a0a8a8'), cOrch = C('#948a4c');
  const cSedge = C('#6a6a3a'), cSedge2 = C('#857a48');
  const cHeath = [C('#6a4058'), C('#7a5068'), C('#5a4044'), C('#6a4a34')]; // bloom, bloom, faded, dead-rust
  const cReed = C('#8a7a4a'), cReed2 = C('#6a6a38');
  const cBone = C('#e0d6b4'), cBrk = [C('#8a4420'), C('#6e3a1c'), C('#5a4a24')], cBrkWood = C('#2e3a1e');
  const cFlw = [C('#e0dcd0'), C('#a090c4'), C('#d0c0a0'), C('#c8b8d8')];
  const cFlesh = C('#2a4024'), cFlesh2 = C('#303a20');
  const tint = [0, 0, 0];
  const mixInto = (a, b2, t) => { tint[0] = lerp(tint[0], b2[0], t); tint[1] = lerp(tint[1], b2[1], t); tint[2] = lerp(tint[2], b2[2], t); };
  const setT = (a) => { tint[0] = a[0]; tint[1] = a[1]; tint[2] = a[2]; };

  const D_BRACKEN = 0.6 * half, D_FLOWER = 0.6 * half, D_FLESH = 0.16 * half;
  const D_GRASS = 6.0 * half, D_HEATH = 0.8 * half, D_REED = 1.6 * half, D_SEDGE = 1.5 * half;
  const CELL = 2;
  const b = {};
  const kinds = [grass, heather, bracken, flowers, fleshy, reeds];
  // Generate chunk k: every 2 m cell inside it, for every kind.
  function genChunk(k) {
    rng = ctx.makeRng(33000 + k);
    const ci = k % CN, cj = Math.floor(k / CN);
    const X0 = CMIN + ci * CHUNK, Z0 = CMIN + cj * CHUNK;
    for (let cz = Z0; cz < Z0 + CHUNK; cz += CELL) for (let cx = X0; cx < X0 + CHUNK; cx += CELL) cell(cx, cz);
    const sr = ctx.makeRng(34000 + k);
    for (const kd of kinds) kd.commit(k, sr);
  }
  function cell(cx, cz) {
    const mx = cx + 1, mz = cz + 1;
    if (mx * mx + mz * mz > 318 * 318) return;
    ground.biomeAt(mx, mz, b);
    // the Wrong Colour's eddy sits in the rocky canyon: give it a reed stand (which its uGrey ring bleaches)
    const nearEddy = L.eddy ? Math.hypot(mx - L.eddy.x, mz - L.eddy.z) < 9 : false;
    if ((b.rock > 0.6 || b.ice > 0.5) && !nearEddy) return;
    const cd = ground.causewayDistance(mx, mz);
    // cheap cell-level keep-outs (exact ones per plant below where it matters)
    if (ground.excluded(mx, mz, -1.5, { wet: 1.8 })) return;
    const patch = noise.fbm2(mx * 0.045, mz * 0.045, 3) * 0.5 + 0.5; // tussocks and bare ground
    const dry = noise.warped2(mx * 0.012 + 3, mz * 0.012 + 1, 3) * 0.5 + 0.5;
    // people walk the causeway, the keep's skirts and the stones: denser, shorter grass there
    const path = 1 - smoothstep(4, 28, cd);
    const dCastle = Math.hypot(mx - L.castle.x, mz - L.castle.z), dStones = Math.hypot(mx - L.stones.x, mz - L.stones.z);
    const land = Math.max(1 - smoothstep(31, 80, dCastle), 1 - smoothstep(10, 40, dStones), 1 - smoothstep(16, 40, Math.hypot(mx - L.byre.x, mz - L.byre.z)));
    const heathW = smoothstep(0.35, 0.8, b.heath) * b.moor * (1 - b.wood);
    const marshW = smoothstep(0.25, 0.7, b.marsh);
    const crysW = smoothstep(0.15, 0.7, b.crystal);
    const nearCd = cd < 7;
    const bleach = smoothstep(0.58, 0.78, noise.fbm2(mx * 0.02 + 70, mz * 0.02 - 20, 3) * 0.5 + 0.5);
    const tussock = smoothstep(0.55, 0.75, noise.fbm2(mx * 0.06 - 30, mz * 0.06 + 12, 2) * 0.5 + 0.5) * (1 - path);
    const hc = ground.heightAt(mx, mz);
    const hollow = smoothstep(0.25, 1.1, (ground.heightAt(mx + 7, mz) + ground.heightAt(mx - 7, mz) + ground.heightAt(mx, mz + 7) + ground.heightAt(mx, mz - 7)) / 4 - hc);
    // the Heliotrope Sward [Proposed] (v2/flora.js): short, thin turf so the snowdrops stand clear of it
    const swardW = L.sward ? 1 - smoothstep(L.sward.r * 0.7, L.sward.r * 1.1, Math.hypot(mx - L.sward.x, mz - L.sward.z)) : 0;
    const wetEdge = (() => { const dep = ground.waterDepth(mx, mz, hc); return dep === -Infinity ? 0 : smoothstep(-2.0, -0.6, dep) * (1 - smoothstep(-0.2, 0.1, dep)); })();

    // grass + sedge
    let dg = D_GRASS * (0.6 + 0.6 * path + 0.4 * land) * (0.35 + 1.0 * smoothstep(0.2, 0.75, patch));
    dg *= (1 - 0.55 * swardW);
    dg *= (1 - 0.6 * heathW) * (1 - 0.6 * b.wood) * (1 - 0.92 * crysW) * (1 - b.rock) * (1 - 0.6 * b.ice) * (1 - 0.7 * marshW);
    const ng = Math.floor(dg * CELL * CELL + rng());
    for (let i = 0; i < ng; i++) {
      const x = cx + rng() * CELL, z = cz + rng() * CELL;
      if (nearCd && ground.causewayDistance(x, z) < 4) continue;
      const y = ground.heightAt(x, z);
      if (ground.waterDepth(x, z, y) > -0.05) continue;
      const v = rng() < 0.4 ? 0 : rng() < 0.6 ? 1 : 2;
      setT(cTawny); mixInto(null, cDry, dry * 0.8); mixInto(null, cOchre, rng() * 0.4);
      mixInto(null, cHeathG, heathW * 0.6); mixInto(null, cOrch, b.orchard * 0.5);
      mixInto(null, cBone, bleach * 0.75 * (1 - b.wood));
      mixInto(null, cWoodG, smoothstep(0.2, 0.8, b.wood)); mixInto(null, cMarsh, marshW * 0.9); mixInto(null, cBleach, crysW * 0.9);
      const br = 0.8 + rng() * 0.35; tint[0] *= br; tint[1] *= br; tint[2] *= br;
      const tus = rng() < tussock * 0.5;
      const sy = (0.75 + rng() * 0.5) * (1 - 0.35 * swardW) * (1 - 0.3 * path) * (1 - 0.35 * b.wood) * (1 + 0.25 * marshW) * (tus ? 1.35 + rng() * 0.45 : 1);
      grass.add(x, y - 0.03, z, rng() * 6.283, (0.8 + rng() * 0.5) * (tus ? 1.3 : 1), sy, tus ? 2 : v, rng(), tint[0], tint[1], tint[2], (0.1 + 0.55 * rng() * rng()) * (1 - b.wood * 0.7) * (1 - crysW) * (1 - bleach * 0.6));
    }
    // sedge: taller, olive, in the fen and on the tarn shore
    const ds = D_SEDGE * Math.max(marshW, b.shore * 0.8, nearEddy ? 0.7 : 0) * (0.4 + 0.8 * patch);
    const ns = Math.floor(ds * CELL * CELL + rng());
    for (let i = 0; i < ns; i++) {
      const x = cx + rng() * CELL, z = cz + rng() * CELL;
      const y = ground.heightAt(x, z);
      const dep = ground.waterDepth(x, z, y);
      if (dep > 0.15) continue;
      setT(cSedge); mixInto(null, cSedge2, rng());
      const br = 0.8 + rng() * 0.3; tint[0] *= br; tint[1] *= br; tint[2] *= br;
      grass.add(x, y - 0.03, z, rng() * 6.283, 0.9 + rng() * 0.4, 1.35 + rng() * 0.7, rng() < 0.5 ? 1 : 2, rng(), tint[0], tint[1], tint[2], 0.25 * rng());
    }
    // bracken: rust patches on the moor, dark undergrowth in the wood
    const bpatch = smoothstep(0.55, 0.75, noise.fbm2(mx * 0.035 + 11, mz * 0.035 + 50, 3) * 0.5 + 0.5);
    const db = D_BRACKEN * (bpatch * b.moor * (1 - heathW * 0.5) * (1 - marshW) + 1.3 * smoothstep(0.3, 0.8, b.wood) * (0.4 + 0.6 * patch)) * (1 - crysW) * (1 - path * 0.8) * (1 - swardW);
    const nb = Math.floor(db * CELL * CELL + rng());
    for (let i = 0; i < nb; i++) {
      const x = cx + rng() * CELL, z = cz + rng() * CELL;
      if (nearCd && ground.causewayDistance(x, z) < 4.5) continue;
      const y = ground.heightAt(x, z);
      if (ground.waterDepth(x, z, y) > -0.1) continue;
      setT(cBrk[Math.floor(rng() * 3)]); mixInto(null, cBrkWood, smoothstep(0.3, 0.8, b.wood) * 0.85);
      const br = 0.75 + rng() * 0.4; tint[0] *= br; tint[1] *= br; tint[2] *= br;
      const s = (0.8 + rng() * 0.6) * (1 + 0.4 * b.wood);
      bracken.add(x, y - 0.03, z, rng() * 6.283, s, s * (0.8 + rng() * 0.4), 2, rng(), tint[0], tint[1], tint[2], 0.5 * rng() * (1 - b.wood));
    }
    // pale flower spikes in drifts; one colour per drift
    const drift = smoothstep(0.56, 0.74, noise.fbm2(mx * 0.025 - 90, mz * 0.025 + 33, 3) * 0.5 + 0.5);
    const df = D_FLOWER * (drift * (b.moor + 0.5 * b.marsh) * (1 - b.wood * 0.7) + wetEdge * 0.4) * (1 - crysW) * (1 - path * 0.5) * (1 - swardW);
    const nf = Math.floor(df * CELL * CELL + rng());
    if (nf) {
      const hueN = noise.noise2(mx * 0.01 + 5, mz * 0.01 - 5) * 0.5 + 0.5;
      const fc = cFlw[Math.min(3, Math.floor(hueN * 4))];
      for (let i = 0; i < nf; i++) {
        const x = cx + rng() * CELL, z = cz + rng() * CELL;
        if (nearCd && ground.causewayDistance(x, z) < 4.5) continue;
        const y = ground.heightAt(x, z);
        if (ground.waterDepth(x, z, y) > -0.05) continue;
        setT(fc); const br = 0.8 + rng() * 0.3; tint[0] *= br; tint[1] *= br; tint[2] *= br;
        const s = 0.8 + rng() * 0.5;
        flowers.add(x, y - 0.03, z, rng() * 6.283, s, s * (0.75 + rng() * 0.5), 2, rng(), tint[0], tint[1], tint[2], 0);
      }
    }
    // black-green fleshy leaves in the hollows, along the water, and in the wood's wet places
    const dl = D_FLESH * Math.max(hollow * (1 - b.rock), wetEdge * 1.4, b.wood * hollow * 1.5) * (1 - crysW) * (1 - swardW);
    const nl = Math.floor(dl * CELL * CELL + rng());
    for (let i = 0; i < nl; i++) {
      const x = cx + rng() * CELL, z = cz + rng() * CELL;
      if (cd < 9) continue;
      // a rosette laid on steep ground reads as a flat black disc: keep them to gentle ground off the river's wet band
      if (ground.slopeAt(x, z) > 0.6 || ground.wetAt(x, z) > 0.3) continue;
      const y = ground.heightAt(x, z);
      if (ground.waterDepth(x, z, y) > -0.05) continue;
      setT(cFlesh); mixInto(null, cFlesh2, rng());
      const s = 0.7 + Math.pow(rng(), 2) * 1.0;
      fleshy.add(x, y - 0.05, z, rng() * 6.283, s, s * (0.8 + rng() * 0.4), 2, rng(), tint[0], tint[1], tint[2], 0);
    }
    // heather
    const dh = D_HEATH * (heathW * (0.5 + patch) + 0.03 * b.moor * (1 - b.wood)) * (1 - crysW) * (1 - marshW) * (1 - 0.7 * swardW);
    const nh = Math.floor(dh * CELL * CELL + rng());
    for (let i = 0; i < nh; i++) {
      const x = cx + rng() * CELL, z = cz + rng() * CELL;
      if (nearCd && ground.causewayDistance(x, z) < 4.5) continue;
      const y = ground.heightAt(x, z);
      if (ground.waterDepth(x, z, y) > -0.1) continue;
      const pick = rng();
      setT(cHeath[pick < 0.4 ? 0 : pick < 0.65 ? 1 : pick < 0.85 ? 2 : 3]);
      const br = 0.75 + rng() * 0.4; tint[0] *= br; tint[1] *= br; tint[2] *= br;
      const s = 0.75 + rng() * 0.7;
      heather.add(x, y - 0.04, z, rng() * 6.283, s * (0.9 + rng() * 0.3), s * (0.8 + rng() * 0.4), 2, rng(), tint[0], tint[1], tint[2], 0);
    }
    // reeds: in stands along the water's edge, standing in the shallows
    if (b.marsh > 0.15 || b.shore > 0.05 || nearEddy) {
      const stand = Math.max(smoothstep(0.35, 0.65, noise.fbm2(mx * 0.08 + 40, mz * 0.08, 2) * 0.5 + 0.5), nearEddy ? 0.9 : 0);
      if (stand > 0) {
        const nr = Math.floor(D_REED * stand * CELL * CELL * 1.2 + rng());
        for (let i = 0; i < nr; i++) {
          const x = cx + rng() * CELL, z = cz + rng() * CELL;
          const y = ground.heightAt(x, z);
          const wn = ground.waterNear(x, z, y, 8);
          if (!wn) continue;
          const dep = wn.dep;
          if (dep < -1.1 || dep > (wn.rim < 7 ? 1.7 : 0.55)) continue;
          if (ground.causewayDistance(x, z) < 4) continue;
          // two open stretches of Lees Tarn's shore, so the black water (and whoever stands in it) can be seen
          if (Math.hypot(x - OPEN_SHORE[0][0], z - OPEN_SHORE[0][1]) < 11 || Math.hypot(x - OPEN_SHORE[1][0], z - OPEN_SHORE[1][1]) < 10) continue;
          setT(cReed); mixInto(null, cReed2, rng());
          const br = 0.8 + rng() * 0.3; tint[0] *= br; tint[1] *= br; tint[2] *= br;
          const sy = (0.75 + rng() * 0.45) * (1 - 0.3 * smoothstep(-0.2, -1.1, dep)) * (1 + Math.max(dep, 0) * 0.45);
          reeds.add(x, y - 0.05, z, rng() * 6.283, 0.8 + rng() * 0.5, sy, 2, rng(), tint[0], tint[1], tint[2], 0.4 + 0.6 * rng());
        }
      }
    }
  }
  // Streaming: chunks within reach are built, nearest first; far ones are freed.
  const gen = new Uint8Array(CN * CN);
  const REACH = 175, FREE = 260;
  let genCount = 0;
  const chunkDist = (k, px, pz) => {
    const x0 = CMIN + (k % CN) * CHUNK, z0 = CMIN + Math.floor(k / CN) * CHUNK;
    const dx = Math.max(x0 - px, 0, px - x0 - CHUNK), dz = Math.max(z0 - pz, 0, pz - z0 - CHUNK);
    return Math.sqrt(dx * dx + dz * dz);
  };
  function stream(px, pz, budget) {
    for (let n = 0; n < budget; n++) {
      let best = -1, bd = REACH;
      for (let k = 0; k < CN * CN; k++) {
        if (gen[k]) { if (chunkDist(k, px, pz) > FREE) { gen[k] = 0; for (const kd of kinds) kd.free(k); } continue; }
        const d = chunkDist(k, px, pz);
        if (d < bd) { bd = d; best = k; }
      }
      if (best < 0) return;
      genChunk(best); gen[best] = 1; genCount++;
    }
  }
  const tStart = performance.now();
  for (const k of kinds) ctx.scene.add(k.mesh);
  stream(ctx.player.pos.x, ctx.player.pos.z, CN * CN);
  const genMs = performance.now() - tStart;

  function update(px, pz, frustum) {
    stream(px, pz, 1);
    for (const k of kinds) k.update(px, pz, frustum, genCount);
  }
  const tris = (k) => k.geo.index.count / 3;
  const api = {
    kinds, update, grey: shared.grey,
    stats: () => Object.fromEntries(kinds.map((k) => [k.name, { stored: k.total, drawn: k.drawn, tris: tris(k), drawnTris: k.drawn * tris(k) }])),
    genMs,
  };
  window.__vegPlants = api; // for tools/grass-flicker-test.mjs
  return api;
}
