// The kit for places under the ground (v14-D0): how a place here is made dark, sealed and made to sound like stone.
// The terrain is single-sided and casts no shadow, and the sun, the hemisphere and the ambient are global: so a room
// under the ground is dark only where its own materials say so, sealed only by its own inside-out meshes, and heard
// as stone only where ctx.below says the listener is. Three parts, used by v5/nave.js and v14/coffin-road.js:
//
// 1. installBelow(ctx) -> ctx.below: the register of underground volumes.
//    ctx.below.add(fn) registers fn(x, y, z) -> 0..1 (1 deep inside, easing to 0 at the way out) and returns a
//    remover; ctx.below.inside(x, y, z) is the largest; ctx.below.here is the camera's, read each frame by post.js
//    (no sun glow through the roof; the eye's grade eases to UNDER_GRADE, the dark-adapted eye), and the audio reads
//    inside() at the listener (graph.js: the stone room; bed.js: the wind sheltered; steps.js: the hard step).
// 2. underMaterial(mat, key): patches a MeshStandardMaterial (vertexColors or not) so that, per vertex, the attribute
//    `aUnder` (vec3) scales what comes from the sky: x the sun and the sky's light (directional, hemisphere, ambient),
//    y the haze (0 none, 1 the moor's), z a baked glow of the place's own lights (times uGlow, the lights' colour,
//    and the surface's colour). Point lights (lights.js's slots) and emissive are untouched, so a lamp carried in or
//    a candle near the walker lights the place as anywhere else.
// 3. UnderBuilder: one non-indexed mesh of flat-shaded parts with vertex colours and aUnder baked from
//    lit(x, y, z, out) -> out[0..2]; tri/quad/geo/box/beam. One draw per place.
import * as THREE from 'three';

// the dark-adapted eye (exposure, saturation, contrast, warmth), eased in by ctx.below.here: the room reads in the
// dark, and the phone's low tier does not go black
export const UNDER_GRADE = [1.25, 0.85, 1.12, -0.03];

export function installBelow(ctx) {
  if (ctx.below) return ctx.below;
  const fns = [];
  const below = {
    here: 0,
    add(fn) { fns.push(fn); return () => { const i = fns.indexOf(fn); if (i >= 0) fns.splice(i, 1); }; },
    inside(x, y, z) { let v = 0; for (let i = 0; i < fns.length; i++) { const w = fns[i](x, y, z); if (w > v) v = w; } return v; },
    // post.js, once a frame: the camera's share, and the grade eased toward the dark-adapted eye's
    tick(p, grade) {
      const h = below.here = fns.length ? below.inside(p.x, p.y, p.z) : 0;
      if (grade && h > 0) {
        const G = UNDER_GRADE;
        grade.set(grade.x * Math.pow(G[0] / grade.x, h), grade.y + (G[1] - grade.y) * h, grade.z * Math.pow(G[2] / grade.z, h), grade.w + (G[3] - grade.w) * h);
      }
      return h;
    },
  };
  ctx.below = below;
  return below;
}

// ---------------------------------------------------------------- the material
export function underMaterial(mat, key, glow = '#9fe8c2') {
  const uGlow = { value: new THREE.Color(glow) };
  mat.userData.uGlow = uGlow;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    sh.uniforms.uGlow = uGlow;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aUnder; varying vec3 vUnder;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvUnder = aUnder;');
    const begin = THREE.ShaderChunk.lights_fragment_begin
      .replace('getDirectionalLightInfo( directionalLight, directLight );', 'getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= vUnder.x;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vUnder; uniform vec3 uGlow;')
      .replace('#include <lights_fragment_begin>', begin)
      .replace('#include <lights_fragment_maps>', '#if defined( RE_IndirectDiffuse )\n\tirradiance *= vUnder.x;\n#endif\n#include <lights_fragment_maps>')
      .replace('#include <lights_fragment_end>', '#if defined( RE_IndirectSpecular )\n\tradiance *= vUnder.x; iblIrradiance *= vUnder.x;\n#endif\n#include <lights_fragment_end>')
      .replace('#include <opaque_fragment>', 'outgoingLight += uGlow * diffuseColor.rgb * vUnder.z;\n#include <opaque_fragment>')
      .replace('#include <fog_fragment>', 'vec3 fpNoFog = gl_FragColor.rgb;\n#include <fog_fragment>\ngl_FragColor.rgb = mix(fpNoFog, gl_FragColor.rgb, vUnder.y);');
  };
  const pk = mat.customProgramCacheKey?.bind(mat);
  mat.customProgramCacheKey = () => (pk ? pk() : '') + '|under-' + key;
  return mat;
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
// `edge` metres horizontally and from `top` down to `top - deep` vertically (an opening's shaft, a stair's head)
export function boxBelow(x0, x1, z0, z1, top, deep = 3, edge = 1.5) {
  const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  return (x, y, z) => {
    if (x < x0 - edge || x > x1 + edge || z < z0 - edge || z > z1 + edge) return 0;
    const h = Math.min(ss(x0 - edge, x0, x), 1 - ss(x1, x1 + edge, x), ss(z0 - edge, z0, z), 1 - ss(z1, z1 + edge, z));
    if (h <= 0) return 0;
    const t = typeof top === 'function' ? top(x, z) : top;
    return h * (1 - ss(t - deep, t, y));
  };
}
