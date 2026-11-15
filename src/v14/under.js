// The kit for places under the ground (v14-D0): how a place here is made dark, sealed and made to sound like stone.
// The terrain is single-sided and casts no shadow, and the sun, the hemisphere and the ambient are global: so a room
// under the ground is dark only where its own materials say so, sealed only by its own inside-out meshes, and heard
// as stone only where ctx.below says the listener is. world-code/runtime.md, "Under the ground", has an example.
//
// 1. installBelow(ctx) -> ctx.below: the register of underground volumes.
//    add(fn, { size }) registers fn(x, y, z) -> 0..1 (1 deep inside, easing to 0 at the way out; boxBelow, pathBelow
//    or your own) and returns a handle: call it to remove the volume; .fn is the volume, reusable in another (a
//    passage's own fn and the hall's box both cover the mouth, so the max of the two never dips where they meet).
//    `size` (0 a narrow passage .. 1 a hall, default 1) is how big it sounds (graph.js scales the stone room's tail).
//    inside(x, y, z): the largest; size(x, y, z): the size of the volume that holds the point most; here: the
//    camera's, set by post.js each frame (no sun glow through the roof; the grade eases to UNDER_GRADE, the
//    dark-adapted eye). The audio reads inside() at the listener (graph.js: the stone room; bed.js: the wind
//    sheltered; steps.js: the hard step).
//    The seal (A1): while the camera is wholly under (here 1) the surface is not drawn except what can be seen through
//    an opening: opening({ x, y, z, r }) registers one (a hole's disc, a passage's mouth to the sky); keep(obj) marks
//    an object of the place itself, always drawn. Every light, the camera's children and any object with
//    frustumCulled false are kept too. Each frame under, a root of the scene is drawn only if its bounding sphere
//    falls in the cone from the eye through an opening (conservative: the rim, the sky and the far peaks through the
//    hole stay). It works by a layer (LAYER_BELOW) on the camera, so it never fights a module's own .visible; an object
//    added to the scene after the first descent is drawn only through an opening.
// 2. underMaterial(mat, key, glow, { far }): patches a MeshStandardMaterial so that, per vertex, the attribute
//    `aUnder` (vec3) scales what comes from the sky: x the sun and the sky's light (directional, hemisphere, ambient),
//    y the haze (0 none, 1 the moor's), z a baked glow of the place's own lights (times `glow` and the surface's
//    colour). Point lights (lights.js's slots) and emissive are untouched. `far: [near, far]` (m) fades the whole
//    fragment to black with its distance from the eye, so a long passage ends in the dark, not on a lit wall.
// 3. belowLit(mat): for any other built-in lit material (a creature, a prop carried down, another module's mesh): the
//    same sky-light and haze cut, but from the volumes registered with shape (boxBelow, pathBelow), evaluated per
//    fragment from its world position (up to MAX_SEG capsules, shared uniforms). Limit: materials not patched
//    (ShaderMaterials, Points, Sprites, unlit materials: the act's lure, particles) stay as they are below; most of
//    them glow anyway, and a module whose thing goes below patches its material with belowLit.
// 4. UnderBuilder: one non-indexed mesh of flat-shaded parts with vertex colours and aUnder baked from
//    lit(x, y, z, out) -> out[0..2]; tri/quad/geo/box/beam/prism. One draw per place.
import * as THREE from 'three';

// the dark-adapted eye (exposure, saturation, contrast, warmth), eased in by ctx.below.here: the room reads in the
// dark, and the phone's low tier does not go black
export const UNDER_GRADE = [1.25, 0.85, 1.12, -0.03];
export const LAYER_BELOW = 30;
export const MAX_SEG = 16;
const SHADOW_REACH = 110; // m round an opening within which a caster stays drawn under the seal (the sun is low: shadows come far; the shadow box is ±95 m)

// the shader's copy of the volumes: capsules (x1, z1, x2, z2) with (half-width, top at 1, top at 2, deep)
const SEG_A = Array.from({ length: MAX_SEG }, () => new THREE.Vector4(0, 0, 0, 0));
const SEG_B = Array.from({ length: MAX_SEG }, () => new THREE.Vector4(-1, -1e5, -1e5, 1));
const SEG_U = { uBelowA: { value: SEG_A }, uBelowB: { value: SEG_B } };
let nSeg = 0;
function addSegs(segs) {
  const at = [];
  for (const s of segs) { if (nSeg >= MAX_SEG) { console.warn('[fp] under: more than', MAX_SEG, 'capsules: belowLit ignores the rest'); break; } SEG_A[nSeg].set(s[0], s[1], s[2], s[3]); SEG_B[nSeg].set(s[4], s[5], s[6], s[7]); at.push(nSeg++); }
  return () => { for (const k of at) SEG_B[k].set(-1, -1e5, -1e5, 1); };
}

export function installBelow(ctx) {
  if (ctx.below) return ctx.below;
  const vols = [], openings = [], kept = new Set();
  let sealOn = false, roots = null, rr = 0;
  const _s = new THREE.Sphere();
  const below = {
    here: 0, sealed: 0, drawnRoots: 0,
    add(fn, opts = {}) {
      const v = { fn, size: opts.size ?? 1 };
      const unSeg = fn.segs ? addSegs(fn.segs) : null;
      vols.push(v);
      const remove = () => { const i = vols.indexOf(v); if (i >= 0) vols.splice(i, 1); unSeg?.(); };
      remove.fn = fn; remove.inside = fn;
      return remove;
    },
    inside(x, y, z) { let v = 0; for (let i = 0; i < vols.length; i++) { const w = vols[i].fn(x, y, z); if (w > v) v = w; } return v; },
    size(x, y, z) { let v = 0, s = 1; for (let i = 0; i < vols.length; i++) { const w = vols[i].fn(x, y, z); if (w > v) { v = w; s = vols[i].size; } } return s; },
    opening(o) { openings.push(o); return () => { const i = openings.indexOf(o); if (i >= 0) openings.splice(i, 1); }; },
    keep(obj) { kept.add(obj); roots = null; },
    // post.js, once a frame, before the draw: the camera's share, the grade, and the seal
    tick(p, grade) {
      const h = below.here = vols.length ? below.inside(p.x, p.y, p.z) : 0;
      if (grade && h > 0) {
        const G = UNDER_GRADE;
        grade.set(grade.x * Math.pow(G[0] / grade.x, h), grade.y + (G[1] - grade.y) * h, grade.z * Math.pow(G[2] / grade.z, h), grade.w + (G[3] - grade.w) * h);
      }
      seal(h >= 0.999);
      return h;
    },
  };
  // ---- the seal
  const SEAL_OFF = typeof location !== 'undefined' && new URLSearchParams(location.search).get('seal') === '0';
  // the units the seal decides on: every drawable (mesh, points, line, sprite) of every root of the scene once
  const _m = new THREE.Matrix4();
  function collect() {
    roots = [];
    ctx.camera.traverse((o) => o.layers.enable(LAYER_BELOW));
    for (const r of ctx.scene.children) {
      const keepAll = kept.has(r);
      r.traverse((o) => {
        // lights the camera sees now (not lights.js's sources, which live on a layer of their own)
        if (o.isLight) { if (o.layers.isEnabled(0)) o.layers.enable(LAYER_BELOW); return; }
        if (!o.isMesh && !o.isPoints && !o.isLine && !o.isSprite) { if (o.layers.isEnabled(0)) o.layers.enable(LAYER_BELOW); return; }
        if (!o.layers.isEnabled(0)) return; // drawn by a camera of its own, not ours
        let k = keepAll || kept.has(o);
        for (let p = o.parent; !k && p; p = p.parent) if (kept.has(p)) k = true;
        o.layers.enable(LAYER_BELOW);
        if (k || !o.geometry) return;
        // frustumCulled false: an instanced set that culls itself (far.js packs its near instances) is judged by its
        // instances' sphere, refreshed a few sets a frame; anything else that places itself in its shader is kept
        if (o.frustumCulled === false && !o.isInstancedMesh) return;
        roots.push({ o, on: true, r: 0, c: new THREE.Vector3(), packed: o.frustumCulled === false });
      });
    }
  }
  // a unit's world sphere: the geometry's (or the instances') under its world matrix, as of this frame
  function sphereOf(U) {
    const o = U.o;
    if (o.isInstancedMesh) { if (!o.boundingSphere || (U.packed && U.n !== o.count)) { o.computeBoundingSphere(); U.n = o.count; } _s.copy(o.boundingSphere).applyMatrix4(o.matrixWorld); }
    else { const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); _s.copy(g.boundingSphere).applyMatrix4(o.matrixWorld); }
    U.c.copy(_s.center); U.r = isFinite(_s.radius) ? _s.radius : Infinity;
  }
  function seal(on) {
    if (SEAL_OFF) return;
    const cam = ctx.camera;
    if (!on) { if (sealOn) { cam.layers.enable(0); cam.layers.disable(LAYER_BELOW); sealOn = false; below.sealed = 0; } return; }
    if (!roots) collect();
    if (!sealOn) { cam.layers.set(LAYER_BELOW); sealOn = true; }
    const e = cam.position;
    let shut = 0;
    // the self-culling sets' spheres: two a frame, round the list (and at once when their count changes)
    for (let j = 0, n = 0; j < roots.length && n < 2; j++) { const U = roots[(rr + j) % roots.length]; if (U.packed) { U.n = -1; n++; } }
    rr = (rr + 7) % Math.max(1, roots.length);
    for (let i = 0; i < roots.length; i++) {
      const U = roots[i];
      sphereOf(U);
      let vis = U.r === Infinity;
      if (!vis) {
        const dx = U.c.x - e.x, dy = U.c.y - e.y, dz = U.c.z - e.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d <= U.r) vis = true;
        else {
          for (let k = 0; k < openings.length; k++) {
            // through the opening (a level disc over the eye): the line from the eye to the thing's centre crosses the
            // disc's plane within its radius, widened by the thing's own radius as seen at that plane
            const o = openings[k];
            // a caster near the opening stays: three draws the sun's shadow map by the main camera's layers, and its
            // shadow can fall in through the hole onto what is seen (the capitals, the stair)
            if (U.o.castShadow) { const hx = U.c.x - o.x, hz = U.c.z - o.z, rr = o.r + SHADOW_REACH + U.r; if (hx * hx + hz * hz < rr * rr) { vis = true; break; } }
            if (U.c.y + U.r < o.y || dy <= 1e-3) continue;
            const t = Math.min(1, (o.y - e.y) / dy), px = e.x + dx * t - o.x, pz = e.z + dz * t - o.z;
            if (px * px + pz * pz <= (o.r + U.r * Math.max(t, 0.25) + 0.5) ** 2) { vis = true; break; }
          }
        }
      }
      if (vis !== U.on) { U.on = vis; if (vis) U.o.layers.enable(LAYER_BELOW); else U.o.layers.disable(LAYER_BELOW); }
      if (!vis) shut++;
    }
    below.sealed = shut; below.drawnRoots = roots.length - shut;
  }
  ctx.below = below;
  return below;
}

// the GLSL for the sky-light cut: the share under at world position w, from the capsules
const UNDER_GLSL = `
  uniform vec4 uBelowA[${MAX_SEG}]; uniform vec4 uBelowB[${MAX_SEG}];
  float fpBelow(vec3 w) {
    float u = 0.0;
    for (int i = 0; i < ${MAX_SEG}; i++) {
      vec4 A = uBelowA[i], B = uBelowB[i];
      if (B.x <= 0.0) continue;
      vec2 a = A.xy, ab = A.zw - A.xy, p = w.xz - a;
      float t = clamp(dot(p, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
      float d = length(p - ab * t), top = mix(B.y, B.z, t);
      float h = 1.0 - smoothstep(B.x, B.x + 1.0, d);
      u = max(u, h * (1.0 - smoothstep(top - B.w, top, w.y)));
    }
    return u;
  }`;
function patchLights(mat, key, skyExpr, extra) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    extra.compile(sh);
    const begin = THREE.ShaderChunk.lights_fragment_begin
      .replace('getDirectionalLightInfo( directionalLight, directLight );', `getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= ${skyExpr};`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <lights_fragment_begin>', begin)
      .replace('#include <lights_fragment_maps>', `#if defined( RE_IndirectDiffuse )\n\tirradiance *= ${skyExpr};\n#endif\n#include <lights_fragment_maps>`)
      .replace('#include <lights_fragment_end>', `#if defined( RE_IndirectSpecular )\n\tradiance *= ${skyExpr}; iblIrradiance *= ${skyExpr};\n#endif\n#include <lights_fragment_end>`);
    extra.after(sh);
  };
  const pk = mat.customProgramCacheKey?.bind(mat);
  mat.customProgramCacheKey = () => (pk ? pk() : '') + '|' + key;
  return mat;
}

// ---------------------------------------------------------------- the materials
export function underMaterial(mat, key, glow = '#9fe8c2', opts = {}) {
  const uGlow = { value: new THREE.Color(glow) }, far = opts.far || null;
  const uFar = { value: new THREE.Vector2(far ? far[0] : 1e6, far ? far[1] : 2e6) };
  mat.userData.uGlow = uGlow; mat.userData.uFar = uFar;
  return patchLights(mat, 'under-' + key + (far ? '-far' : ''), 'vUnder.x', {
    compile(sh) {
      sh.uniforms.uGlow = uGlow; sh.uniforms.uFar = uFar;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 aUnder; varying vec3 vUnder; varying vec3 vUnderW;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvUnder = aUnder; vUnderW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vUnder; varying vec3 vUnderW; uniform vec3 uGlow; uniform vec2 uFar;');
    },
    after(sh) {
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <opaque_fragment>', `outgoingLight += uGlow * diffuseColor.rgb * vUnder.z;${far ? '\noutgoingLight *= 1.0 - smoothstep(uFar.x, uFar.y, distance(vUnderW, cameraPosition));' : ''}\n#include <opaque_fragment>`)
        .replace('#include <fog_fragment>', 'vec3 fpNoFog = gl_FragColor.rgb;\n#include <fog_fragment>\ngl_FragColor.rgb = mix(fpNoFog, gl_FragColor.rgb, vUnder.y);');
    },
  });
}
export function belowLit(mat, key = 'below') {
  return patchLights(mat, 'belowlit-' + key, 'fpBelowK', {
    compile(sh) {
      Object.assign(sh.uniforms, SEG_U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vBelowW;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBelowW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vBelowW;${UNDER_GLSL}`)
        .replace('#include <lights_fragment_begin>', 'float fpBelowU = fpBelow(vBelowW), fpBelowK = 1.0 - 0.985 * fpBelowU;\n#include <lights_fragment_begin>');
    },
    after(sh) {
      sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', 'vec3 fpNoFog = gl_FragColor.rgb;\n#include <fog_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, fpNoFog, fpBelowU);');
    },
  });
}

// ---------------------------------------------------------------- the builder
export class UnderBuilder {
  // lit(x, y, z, out) -> out: [sky, air, glow]
  constructor(lit) { this.lit = lit; this.p = []; this.n = []; this.c = []; this.u = []; this._u = [1, 1, 0]; }
  get tris() { return this.p.length / 9; }
  vert(x, y, z, nx, ny, nz, col, jit = 0) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz);
    const j = 1 + jit * (Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453 % 1);
    this.c.push(col[0] * j, col[1] * j, col[2] * j);
    const u = this.lit(x, y, z, this._u); this.u.push(u[0], u[1], u[2]);
  }
  // a flat triangle; `hint` is any vector on its outward side (the winding is turned to face it)
  tri(a, b, c, col, hint, jit = 0.1) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz); if (l < 1e-9) return;
    nx /= l; ny /= l; nz /= l;
    if (hint && nx * hint[0] + ny * hint[1] + nz * hint[2] < 0) { [b, c] = [c, b]; nx = -nx; ny = -ny; nz = -nz; }
    this.vert(a[0], a[1], a[2], nx, ny, nz, col, jit); this.vert(b[0], b[1], b[2], nx, ny, nz, col, jit); this.vert(c[0], c[1], c[2], nx, ny, nz, col, jit);
  }
  quad(a, b, c, d, col, hint, jit) { this.tri(a, b, c, col, hint, jit); this.tri(a, c, d, col, hint, jit); }
  // a closed prism from a ring of (x, z) at y0 to the same ring at y1 (top and bottom caps, walls facing out)
  prism(ring, y0, y1, col, colTop = col, jit = 0.1) {
    let cx = 0, cz = 0; for (const [x, z] of ring) { cx += x; cz += z; } cx /= ring.length; cz /= ring.length;
    for (let i = 0; i < ring.length; i++) {
      const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length];
      const mx = (ax + bx) / 2 - cx, mz = (az + bz) / 2 - cz;
      this.quad([ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az], col, [mx, 0, mz], jit);
      this.tri([cx, y1, cz], [ax, y1, az], [bx, y1, bz], colTop, [0, 1, 0], jit);
      this.tri([cx, y0, cz], [ax, y0, az], [bx, y0, bz], col, [0, -1, 0], jit);
    }
  }
  // a box from its centre, half sizes and a yaw (about y)
  box(x, y, z, hx, hy, hz, yaw, col, colTop = col, jit = 0.1) {
    const c = Math.cos(yaw), s = Math.sin(yaw), P = (u, w) => [x + u * c + w * s, z - u * s + w * c];
    this.prism([P(-hx, -hz), P(hx, -hz), P(hx, hz), P(-hx, hz)], y - hy, y + hy, col, colTop, jit);
  }
  // a square beam of half-width w between two points (a timber, a chain's link run, a rope)
  beam(a, b, w, col, jit = 0.08) {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(); if (len < 1e-6) return;
    d.divideScalar(len);
    const up = Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(d, up).normalize().multiplyScalar(w), v = new THREE.Vector3().crossVectors(d, u).normalize().multiplyScalar(w);
    const corner = (p, su, sv) => [p[0] + u.x * su + v.x * sv, p[1] + u.y * su + v.y * sv, p[2] + u.z * su + v.z * sv];
    const S = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    for (let i = 0; i < 4; i++) {
      const [s1, t1] = S[i], [s2, t2] = S[(i + 1) % 4];
      const hint = [u.x * (s1 + s2) + v.x * (t1 + t2), u.y * (s1 + s2) + v.y * (t1 + t2), u.z * (s1 + s2) + v.z * (t1 + t2)];
      this.quad(corner(a, s1, t1), corner(a, s2, t2), corner(b, s2, t2), corner(b, s1, t1), col, hint, jit);
    }
  }
  // any three.js geometry under a matrix, one colour or col(nx, ny, nz)
  geo(g, m, col, jit = 0.1) {
    const ng = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m);
    ng.computeVertexNormals();
    const P = ng.attributes.position.array, N = ng.attributes.normal.array;
    for (let i = 0; i < P.length; i += 3) this.vert(P[i], P[i + 1], P[i + 2], N[i], N[i + 1], N[i + 2], typeof col === 'function' ? col(N[i], N[i + 1], N[i + 2]) : col, jit);
    ng.dispose(); g.dispose();
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aUnder', new THREE.Float32BufferAttribute(this.u, 3));
    g.computeBoundingSphere();
    return g;
  }
}

// a box's share of being underground: 1 inside (x0..x1, z0..z1) below `top(x, z)` less `deep`, easing out over
// `edge` metres horizontally and from `top` down to `top - deep` vertically (an opening's shaft, a stair's head).
// Its .segs (one capsule down its long axis) are what belowLit sees of it.
export function boxBelow(x0, x1, z0, z1, top, deep = 3, edge = 1.5) {
  const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const fn = (x, y, z) => {
    if (x < x0 - edge || x > x1 + edge || z < z0 - edge || z > z1 + edge) return 0;
    const h = Math.min(ss(x0 - edge, x0, x), 1 - ss(x1, x1 + edge, x), ss(z0 - edge, z0, z), 1 - ss(z1, z1 + edge, z));
    if (h <= 0) return 0;
    const t = typeof top === 'function' ? top(x, z) : top;
    return h * (1 - ss(t - deep, t, y));
  };
  const T = (x, z) => (typeof top === 'function' ? top(x, z) : top), alongX = x1 - x0 >= z1 - z0;
  const hw = (alongX ? z1 - z0 : x1 - x0) / 2, xc = (x0 + x1) / 2, zc = (z0 + z1) / 2;
  const a = alongX ? [x0 + Math.min(hw, (x1 - x0) / 2), zc] : [xc, z0 + Math.min(hw, (z1 - z0) / 2)], b = alongX ? [x1 - Math.min(hw, (x1 - x0) / 2), zc] : [xc, z1 - Math.min(hw, (z1 - z0) / 2)];
  fn.segs = [[a[0], a[1], b[0], b[1], hw, T(a[0], a[1]), T(b[0], b[1]), deep]];
  return fn;
}

// a passage's share of being underground (A2): within `half` of the polyline pts [[x, z], ...] (easing out over
// `edge` m beyond it), below the ground over it less `cover` (heightAt sampled every 2 m along the line), fully under
// `deep` m below that. Compose it with the hall's box: where the passage leaves the hall both cover the mouth.
// `top(x, z)` (optional) replaces heightAt - cover. Its .segs are the line's segments (cut at 20 m) for belowLit.
export function pathBelow(T, pts, { half = 2, cover = 1, deep = 2, edge = 1, top = null } = {}) {
  const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const segs = [], tops = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / 2));
    const ts = []; for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n; ts.push(top ? top(x, z) : T.heightAt(x, z) - cover); }
    segs.push({ ax, az, bx, bz, len, n, ts });
  }
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const m = half + edge;
  const fn = (x, y, z) => {
    if (x < x0 - m || x > x1 + m || z < z0 - m || z > z1 + m) return 0;
    let best = 0;
    for (const S of segs) {
      const dx = S.bx - S.ax, dz = S.bz - S.az, L2 = dx * dx + dz * dz || 1e-9;
      const t = Math.min(1, Math.max(0, ((x - S.ax) * dx + (z - S.az) * dz) / L2));
      const px = S.ax + dx * t - x, pz = S.az + dz * t - z, d = Math.sqrt(px * px + pz * pz);
      if (d >= m) continue;
      const f = t * S.n, k = Math.min(S.n - 1, Math.floor(f)), tp = S.ts[k] + (S.ts[k + 1] - S.ts[k]) * (f - k);
      const v = (1 - ss(half, m, d)) * (1 - ss(tp - deep, tp, y));
      if (v > best) best = v;
    }
    return best;
  };
  fn.segs = [];
  for (const S of segs) {
    const cut = Math.max(1, Math.ceil(S.len / 20));
    for (let c = 0; c < cut; c++) {
      const t0 = c / cut, t1 = (c + 1) / cut, at = (t) => { const f = t * S.n, k = Math.min(S.n - 1, Math.floor(f)); return S.ts[k] + (S.ts[k + 1] - S.ts[k]) * (f - k); };
      fn.segs.push([S.ax + (S.bx - S.ax) * t0, S.az + (S.bz - S.az) * t0, S.ax + (S.bx - S.ax) * t1, S.az + (S.bz - S.az) * t1, half, at(t0), at(t1), deep]);
    }
  }
  return fn;
}
