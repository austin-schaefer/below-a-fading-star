// The Lees' light (v15-Q3): what the fountain of noon is drawn with.
//
// Stored daylight is steady: it breathes, it never flickers, and it does not go down with the sun. The village's
// shared stone shader has no such channel (its three are the ember glass, which sleeps by day; the lamps, which
// flutter; the limewash, which dims with the sky). So the quarter draws its stone in an instance of its own
// (leesStone): the same program, its own uniforms. Channel 1 (lamps, lit panes) and channel 2 (limewash) are driven
// as the village's are; channel 0 is the noon light: uGlyph is its breath, and uSTime is held still so the shader's
// own slow pulse is a fixed field with its crest on the fountain.
//
// No PointLight: on P9 the Pomegranate House's two and the Link-Boy's already fill the three slots (house-test).
// The light on the square is baked into the quarter's own stone (bakeNoon: a heavy light that lies along the ground
// and thins with height, and the pool's own glow on whatever looks down at it), and drawn over what is not the
// quarter's (the Strake's flags) as a low additive haze (noonGlow).
import * as THREE from 'three';
import { makeStoneMaterial } from '../../../structures/materials.js';
import { NOON } from '../../../v8/strata/noon.js';

export const LIGHT = NOON.light;
const BREATH = (t) => 0.94 + 0.06 * Math.sin(t * 0.7); // as the Noon Road's lamps (src/v14/noon-road.js)

export function leesStone(ctx, fx, fz) {
  const s = makeStoneMaterial(ctx);
  s.uniforms.uSTime.value = (Math.PI / 2 - (fx * 0.21 + fz * 0.17)) / 0.31;
  s.tick = (t, f, lamps = 0) => { // (lamps: the panes turned up in a gutter, as the village's: src/v8/strata.js tick)
    s.uniforms.uGlyph.value = BREATH(t) * 0.9;
    s.uniforms.uWindow.value = (0.85 + 0.1 * Math.sin(t * 1.7) + 0.05 * Math.sin(t * 5.3)) * (0.7 + 0.3 * f);
    s.uniforms.uWaveK.value = 1.6;
    s.uniforms.uNoon.value = ctx.sky?.flicker?.slow ?? 0; // (v16-S2: any carrier's glaze in the Lees gives back its noon) // (v16-S2: house by house in the wave, as the village's)
    s.uniforms.uLime.value = 0.85 * (0.3 + 0.7 * f);
  };
  return s;
}

// triangles gathered loose, each turned to face `out`, then added to a Builder in one piece with a colour (and a
// noon glow, channel 0) a vertex. Points are [x, y, z]; M (flush) carries them into the world.
export class Soup {
  constructor() { this.p = []; this.c = []; this.e = []; }
  tri(a, b, c, out, col, e = 0) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (out && nx * out[0] + ny * out[1] + nz * out[2] < 0) { const t = b; b = c; c = t; }
    this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    const cs = Array.isArray(col) ? col : [col, col, col], es = Array.isArray(e) ? e : [e, e, e];
    if (out && nx * out[0] + ny * out[1] + nz * out[2] < 0) { const t = cs[1]; cs[1] = cs[2]; cs[2] = t; const q = es[1]; es[1] = es[2]; es[2] = q; }
    for (let i = 0; i < 3; i++) { this.c.push(cs[i].r, cs[i].g, cs[i].b); this.e.push(es[i]); }
  }
  quad(a, b, c, d, out, col, e = 0) {
    const cs = Array.isArray(col) ? col : [col, col, col, col], es = Array.isArray(e) ? e : [e, e, e, e];
    this.tri(a, b, c, out, [cs[0], cs[1], cs[2]], [es[0], es[1], es[2]]); this.tri(a, c, d, out, [cs[0], cs[2], cs[3]], [es[0], es[2], es[3]]);
  }
  // a convex outline as a fan, facing out
  poly(pts, out, col, e = 0) { for (let i = 1; i < pts.length - 1; i++) this.tri(pts[0], pts[i], pts[i + 1], out, col, e); }
  // a convex top (facing up) with a skirt down to yb(point) all round it
  slab(pts, drop, col, sideCol = col) {
    let cx = 0, cz = 0; for (const p of pts) { cx += p[0]; cz += p[2]; } cx /= pts.length; cz /= pts.length;
    this.poly(pts, [0, 1, 0], col);
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; this.quad(a, b, [b[0], b[1] - drop, b[2]], [a[0], a[1] - drop, a[2]], [(a[0] + b[0]) / 2 - cx, 0, (a[2] + b[2]) / 2 - cz], sideCol); }
  }
  get triangles() { return this.p.length / 9; }
  // tint: the glow takes the vertex's own colour, that many times over (light through a glaze)
  flush(B, o, M = null, tint = 0) {
    if (!this.p.length) return;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    const base = B.count, n = this.p.length / 3;
    B.add(g, M, o);
    for (let i = 0; i < n; i++) {
      const k = (base + i) * 3, q = (base + i) * 4, e = this.e[i];
      B.C[k] = this.c[i * 3]; B.C[k + 1] = this.c[i * 3 + 1]; B.C[k + 2] = this.c[i * 3 + 2];
      if (e > 0) { const t = tint > 0; B.E[q] = LIGHT[0] * e * (t ? this.c[i * 3] * tint : 1); B.E[q + 1] = LIGHT[1] * e * (t ? this.c[i * 3 + 1] * tint : 1); B.E[q + 2] = LIGHT[2] * e * (t ? this.c[i * 3 + 2] * tint : 1); B.E[q + 3] = 0; }
    }
    this.p = []; this.c = []; this.e = [];
  }
}

// The light on the square, baked into every vertex of B from `from` on that is not already a light of its own.
// F: { x, z (the bowl's middle), y (the paving), ys (the pool's surface), r (the reach) }.
// heavy: it lies along the ground, deepest by the bowl, a hand deep at the reach, and whatever stands in it is lit to
// the knee; pool: the surface's own glow on faces that look toward it from above the rim.
export function bakeNoon(B, from, to, F, o = {}) {
  const A = o.heavy ?? 0.5, D = o.pool ?? 0.6, P = B.P, N = B.Nn, C = B.C, E = B.E, R = F.r;
  for (let i = from; i < to; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], dx = F.x - x, dz = F.z - z, d = Math.hypot(dx, dz);
    if (d > R) continue;
    const nx = N[i * 3], ny = N[i * 3 + 1], nz = N[i * 3 + 2], h = Math.max(0, y - F.y);
    const edge = 1 - Math.min(1, Math.max(0, (d - R * 0.6) / (R * 0.4))) ** 2;
    const depth = 0.16 + 0.5 / (1 + (d / 3) ** 2); // how deep the light lies here
    const toward = d > 0.01 ? Math.max(0, (nx * dx + nz * dz) / d) : 0;
    const heavy = (A / (1 + (d / 2.6) ** 2)) * Math.exp(-h / depth) * (ny > 0.5 ? 1 : ny < -0.5 ? 0.5 : 0.5 + 0.5 * toward);
    const ly = F.ys - y, dist = Math.hypot(d, ly) || 1, nl = Math.max(0, (nx * dx + ny * ly + nz * dz) / dist);
    const pool = y > F.ys + 0.15 ? (D * nl) / (1 + (dist / 3.2) ** 2) : 0;
    const e = (heavy + pool) * edge;
    if (e < 0.006) continue;
    const q = i * 4, r = C[i * 3] * LIGHT[0] * e, g = C[i * 3 + 1] * LIGHT[1] * e, b = C[i * 3 + 2] * LIGHT[2] * e;
    if (E[q] + E[q + 1] + E[q + 2] > 0) { if (E[q + 3] === 0) continue; if (r + g + b < (E[q] + E[q + 1] + E[q + 2]) * 1.5) continue; } // (a lamp or a lit pane keeps its own; limewash's faint hold gives way)
    E[q] = r; E[q + 1] = g; E[q + 2] = b; E[q + 3] = 0;
  }
}

// the light itself where it is seen as light: additive, soft at every edge because every edge is drawn at nothing
export function noonGlow() {
  const pos = [], col = [];
  const G = {
    tri(a, b, c, ka, kb, kc) { pos.push(...a, ...b, ...c); for (const k of [ka, kb, kc]) col.push(LIGHT[0] * k, LIGHT[1] * k, LIGHT[2] * k); },
    quad(a, b, c, d, ka, kb, kc, kd) { G.tri(a, b, c, ka, kb, kc); G.tri(a, c, d, ka, kc, kd); },
    get triangles() { return pos.length / 9; },
    mesh(name) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.Float32BufferAttribute(col, 3));
      const mat = new THREE.ShaderMaterial({
        name: 'lees.noon', uniforms: { uBreath: { value: 1 } },
        vertexShader: /* glsl */`attribute vec3 aCol; varying vec3 vCol;
          void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vCol = aCol * (1.0 - smoothstep(160.0, 420.0, -mv.z)); gl_Position = projectionMatrix * mv; }`, // (additive: it thins with distance, it does not go to the haze's colour)
        fragmentShader: /* glsl */`uniform float uBreath; varying vec3 vCol; void main() { gl_FragColor = vec4(vCol * uBreath, 1.0); }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(g, mat); m.name = name; m.renderOrder = 3; m.frustumCulled = true;
      m.tick = (t) => { mat.uniforms.uBreath.value = BREATH(t); };
      return m;
    },
  };
  return G;
}
