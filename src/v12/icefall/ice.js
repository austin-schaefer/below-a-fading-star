// The icefall's ice (v12 H2): the material every drawn piece of ice shares, and a small builder for faceted ice.
// The ice takes the red sun and the violet sky on its tops and faces, and its own cold blue only where it is deep:
// a vertex's `aIce.x` is how deep it is (0 at a lip or a top, 1 at the bottom of a crevasse or a face's foot),
// `aIce.y` a seed per block (its dirt bands' tilt and spacing), `aIce.z` how dirty it is (moraine on a top, 0..1).
// The shader adds, by world position and the facet's own normal: tops worn and dusted (pale violet-grey, darker with
// dirt), faces of clean grey-blue ice fluted downward, dirt bands across them (old snowfalls, tilted with the block),
// and in the depths a dark glacial blue that glows a little, so a crevasse reads blue from the floor of the valley.
import * as THREE from 'three';

export function iceMaterial(ctx) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.0, side: THREE.DoubleSide }); // double: the climb's pieces are wound by hand
  const S = ctx.sun.dir, uSun = { value: new THREE.Vector3(S.x, S.y, S.z) };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSun = uSun;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aIce; varying vec3 vIce; varying vec3 vIceW; varying vec3 vIceN;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vIce = aIce;
        vIceW = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vIceN = normalize(mat3(modelMatrix) * objectNormal);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uSun; varying vec3 vIce; varying vec3 vIceW; varying vec3 vIceN;
        float icH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float icN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(icH(i), icH(i + vec2(1, 0)), f.x), mix(icH(i + vec2(0, 1)), icH(i + vec2(1, 1)), f.x), f.y); }
        vec3 icNw; float icDeep = 0.0, icUp = 0.0, icShade = 0.0, icPat = 1.0;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          icNw = normalize(vIceN) * (gl_FrontFacing ? 1.0 : -1.0);
          float deep = clamp(vIce.x, 0.0, 1.0);
          icUp = smoothstep(0.6, 0.86, icNw.y);
          icShade = smoothstep(0.2, -0.35, dot(icNw, uSun));
          // across the face (its horizontal tangent) and down it: the flutes and bands are drawn in those
          vec2 tH = normalize(vec2(-icNw.z, icNw.x) + 1e-4);
          float u = dot(vIceW.xz, tH), y = vIceW.y;
          float flute = icN(vec2(u * 0.3, y * 0.05)) * 0.6 + icN(vec2(u * 1.1, y * 0.16 + 3.0)) * 0.4;
          float tilt = (vIce.y - 0.5) * 0.35;
          float bandY = y + u * tilt + icN(vec2(u * 0.06, 7.0)) * 3.0;
          float sp = mix(3.0, 6.5, fract(vIce.y * 7.31));
          float band = smoothstep(0.45, 0.49, abs(fract(bandY / sp) - 0.5)) * smoothstep(0.4, 0.7, icN(vec2(u * 0.12, bandY * 0.3)));
          // a face: blue ice, glassier and bluer as it goes down; the depths dark glacial blue
          vec3 face = mix(vec3(0.15, 0.25, 0.37), vec3(0.06, 0.15, 0.27), smoothstep(0.0, 0.55, deep));
          face = mix(face, vec3(0.012, 0.05, 0.11), smoothstep(0.55, 1.0, deep));
          face *= 0.93 + 0.14 * flute;
          icPat = (0.7 + 0.6 * flute) * (1.0 - 0.75 * band);
          face = mix(face, vec3(0.08, 0.065, 0.06), band * (0.3 + 0.5 * vIce.z) * (1.0 - smoothstep(0.7, 1.0, deep)));
          // fine strata between the bands (a crevasse's wall shows its years)
          face *= 1.0 - 0.12 * vIce.z * smoothstep(0.3, 0.5, abs(fract(bandY * 1.3) - 0.5));
          // a top: old firn, wind-scoured, dusted with the moraine's grit in streaks
          float mott = icN(vIceW.xz * 0.3) * 0.55 + icN(vIceW.xz * 1.1) * 0.3 + icN(vIceW.xz * 4.0) * 0.15;
          float grit = smoothstep(0.55, 0.8, icN(vec2(dot(vIceW.xz, vec2(0.12, 0.5)), dot(vIceW.xz, vec2(1.6, -0.4)))));
          // sastrugi: ridges the wind cut, streaked one way; cracks across
          float sas = icN(vec2(dot(vIceW.xz, vec2(0.9, 0.25)), dot(vIceW.xz, vec2(-0.08, 0.3))));
          vec3 top = vec3(0.40, 0.385, 0.43) * (0.72 + 0.45 * mott) * (0.82 + 0.3 * smoothstep(0.3, 0.7, sas));
          float crk = 1.0 - smoothstep(0.0, 0.06, abs(icN(vIceW.xz * 0.18 + 5.0) - 0.5));
          top = mix(top, vec3(0.03, 0.08, 0.14), crk * 0.6);
          top = mix(top, vec3(0.16, 0.14, 0.14), clamp(vIce.z * 0.7 + grit * 0.45, 0.0, 0.85));
          icDeep = deep;
          diffuseColor.rgb = mix(face, top, icUp * (1.0 - deep * 0.8));
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(0.16, 0.8, icUp);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        // light in the ice: a cold blue from within a face turned from the sun, more where it is deep; the violet sky
        // on it at a graze, as glass shows it
        {
          float graze = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 2.5);
          float side = 1.0 - icUp;
          totalEmissiveRadiance += vec3(0.006, 0.042, 0.085) * side * icPat * (0.25 + 0.9 * icShade + 1.4 * smoothstep(0.3, 1.0, icDeep));
          totalEmissiveRadiance += vec3(0.05, 0.035, 0.085) * graze * side * (1.0 - icDeep);
        }`);
  };
  mat.customProgramCacheKey = () => 'fp-icefall-ice-v3';
  return mat;
}

// A builder for ice: triangles with their aIce and normals. A tri or quad is flat (a facet: seracs, treads); a grid
// may be smooth (a face, a wall: fluted, not crumpled), its normals from its neighbours. Non-indexed.
export class IceGeo {
  constructor() { this.p = []; this.a = []; this.n = []; }
  tri(A, B, C, ia, ib, ic, nA, nB, nC) {
    this.p.push(A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2]);
    this.a.push(...ia, ...ib, ...ic);
    if (nA) { this.n.push(...nA, ...nB, ...nC); return; }
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    this.n.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  }
  quad(A, B, C, D, ia, ib, ic, id, nn) {
    if (nn) { this.tri(A, B, C, ia, ib, ic, nn[0], nn[1], nn[2]); this.tri(A, C, D, ia, ic, id, nn[0], nn[2], nn[3]); return; }
    this.tri(A, B, C, ia, ib, ic); this.tri(A, C, D, ia, ic, id);
  }
  // a grid of points P[i][j] (rows i, columns j) with their attributes Q[i][j]; flip winds it the other way
  grid(P, Q, flip = false, smooth = false) {
    let N = null;
    if (smooth) {
      N = P.map((row, i) => row.map((p, j) => {
        const a = P[i][Math.min(row.length - 1, j + 1)], b = P[i][Math.max(0, j - 1)];
        const c = P[Math.min(P.length - 1, i + 1)][j], d = P[Math.max(0, i - 1)][j];
        const ux = a[0] - b[0], uy = a[1] - b[1], uz = a[2] - b[2], vx = c[0] - d[0], vy = c[1] - d[1], vz = c[2] - d[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1;
        const s = flip ? -1 / l : 1 / l;
        return [nx * s, ny * s, nz * s];
      }));
    }
    for (let i = 0; i < P.length - 1; i++) for (let j = 0; j < P[i].length - 1; j++) {
      const a = P[i][j], b = P[i][j + 1], c = P[i + 1][j + 1], d = P[i + 1][j];
      const qa = Q[i][j], qb = Q[i][j + 1], qc = Q[i + 1][j + 1], qd = Q[i + 1][j];
      const nn = N ? (flip ? [N[i][j], N[i + 1][j], N[i + 1][j + 1], N[i][j + 1]] : [N[i][j], N[i][j + 1], N[i + 1][j + 1], N[i + 1][j]]) : null;
      if (flip) this.quad(a, d, c, b, qa, qd, qc, qb, nn); else this.quad(a, b, c, d, qa, qb, qc, qd, nn);
    }
  }
  get tris() { return this.p.length / 9; }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('aIce', new THREE.Float32BufferAttribute(this.a, 3));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}
// A serac: a block of ice of footprint w x d, h tall, standing at (x, y, z) turned by rot, leaning (lx, lz) (m of its
// top's shift), its top cut by a slant (m of drop across), broken: its sides of uneven width (5 to 7 of them), its top
// split along a fracture into two planes at different heights, or stepped, its corners pushed about by rng. Deep at its foot.
export function serac(G, rng, o) {
  const { x, y, z, w, d, h } = o, rot = o.rot ?? 0, lx = o.lx ?? 0, lz = o.lz ?? 0, slant = o.slant ?? 0, sink = o.sink ?? 2;
  const seed = rng(), dirt = o.dirt ?? rng() * 0.5;
  const c = Math.cos(rot), s = Math.sin(rot);
  const n = 5 + Math.floor(rng() * 3);
  const ang = [], rad = [];
  let acc = 0; for (let k = 0; k < n; k++) { const g = 0.6 + rng() * 0.8; ang.push(g); acc += g; }
  { let t = rng() * 6.28; for (let k = 0; k < n; k++) { const a = t; t += (ang[k] / acc) * Math.PI * 2; ang[k] = a; rad.push(0.8 + rng() * 0.4); } }
  // the fracture across the top: a line through the top at angle fa, the far side dropped by fd
  const fa = rng() * 6.28, fo = (rng() - 0.5) * 0.5, fd = rng() < 0.6 ? h * (0.12 + rng() * 0.3) : 0;
  const fx = Math.cos(fa), fz = Math.sin(fa);
  const local = (k, scale, jit) => { const ux = Math.cos(ang[k]) * w * 0.5 * scale * rad[k] * (1 + (rng() - 0.5) * jit), uz = Math.sin(ang[k]) * d * 0.5 * scale * rad[k] * (1 + (rng() - 0.5) * jit); return [ux, uz]; };
  const world = (ux, uz, yy, f) => [x + ux * c - uz * s + lx * f, y + yy, z + ux * s + uz * c + lz * f];
  const ring = (f, scale, jit, ty, top) => {
    const out = [];
    for (let k = 0; k < n; k++) {
      const [ux, uz] = local(k, scale, jit);
      let yy = ty + (slant ? slant * (ux / (w * 0.5)) : 0) + (rng() - 0.5) * jit * h * 0.1 * (top ? 1 : 0.3);
      if (top && fd && (ux / (w * 0.5)) * fx + (uz / (d * 0.5)) * fz > fo) yy -= fd;
      out.push(world(ux, uz, yy, f));
    }
    return out;
  };
  const R0 = ring(0, 1.0, 0.2, -sink, false), R1 = ring(0.5, 1.03, 0.22, h * 0.5, false), R2 = ring(1, 0.9, 0.25, h, true);
  const deepOf = (yy) => Math.max(0, Math.min(1, (o.deepTop ?? (y + h) - yy) / Math.max(4, o.deepRange ?? h * 1.4)));
  const att = (P) => [deepOf(P[1]), seed, dirt * 0.4];
  const band = (A, B) => { for (let k = 0; k < n; k++) { const k1 = (k + 1) % n; G.quad(A[k], B[k], B[k1], A[k1], att(A[k]), att(B[k]), att(B[k1]), att(A[k1])); } };
  band(R0, R1); band(R1, R2);
  // the top: a fan from a point off centre on the high side of the fracture
  let cx = 0, cy = 0, cz = 0; for (const P of R2) { cx += P[0]; cy += P[1]; cz += P[2]; }
  const T = [cx / n + (rng() - 0.5) * w * 0.2, cy / n + (fd ? fd * 0.5 : 0) + (rng() - 0.3) * h * 0.06, cz / n + (rng() - 0.5) * d * 0.2];
  const at = [0, seed, dirt];
  for (let k = 0; k < n; k++) G.tri(R2[(k + 1) % n], R2[k], T, at, at, at); // wound outward
  return R2;
}
