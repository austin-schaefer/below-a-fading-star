// The Diffident Stair's slabs (v12-H3): the geometry of a tread and of a landing, the kerb, the empty bed, and the one
// material they share. Heliarch work (src/v8/strata/parts.js, COLORS.heliarch): a grey-violet stone slab worn hollow
// where feet went, a bronze nosing gone green, a polished bronze hexagon let into the top, and cut into the underside
// the sign of the sun in its notch, inlaid with ember glass that burns while the slab is moving (`iGlow`, per
// instance, 0..1) and is dark once it rests.
// Local frame of a slab: +z forward (up the stair), +x to the walker's left, y up; the top face at y 0.
import * as THREE from 'three';
import { mergeGeometries } from '../../v4/kit/merge.js';

const C = (h) => new THREE.Color(h);
const STONE = C('#8c8592'), DARK = C('#6e6878'), CUT = C('#2a2430'), BRONZE = C('#3f6a5a'), POLISH = C('#9a7a48'), EMBER = C('#5a1a08');

// paint a geometry one colour (and its emissive weight), as attributes for merging
function paint(g, col, em = 0) {
  const n = g.attributes.position.count, c = new Float32Array(n * 3), e = new Float32Array(n);
  for (let i = 0; i < n; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; e[i] = em; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.setAttribute('aEm', new THREE.BufferAttribute(e, 1));
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g.index ? g.toNonIndexed() : g;
}

// a slab w across, d deep (from z -d/2 to d/2), t thick, its top worn hollow by `wear` (m) along a band across the
// middle; its top edges rounded down 2 cm; colours from stone to the darker underside
function slab(w, d, t, wear, rng) {
  const sx = Math.max(6, Math.round(w / 0.22)), sz = Math.max(2, Math.round(d / 0.18));
  const g = new THREE.BoxGeometry(w, t, d, sx, 1, sz);
  g.translate(0, -t / 2, 0);
  const p = g.attributes.position, n = p.count, col = new Float32Array(n * 3), em = new Float32Array(n);
  const tint = 0.92 + rng() * 0.16;
  for (let i = 0; i < n; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ex = 1 - Math.abs(x) / (w / 2), ez = 1 - Math.abs(z) / (d / 2);
    if (y > -0.001) {
      // the hollow: deepest a little left of centre (the side people keep to going up), shallow at the ends
      const u = (x + w * 0.06) / (w * 0.32);
      y -= wear * Math.exp(-u * u) * (0.55 + 0.45 * Math.min(1, ez * 2));
      if (ex < 0.02 || ez < 0.02) y -= 0.02; // the arris, rounded off
      y += (rng() - 0.5) * 0.006;
    }
    p.setXYZ(i, x, y, z);
    // worn top paler and smoother, the sides darker toward the bottom, the underside the dark of cut stone
    const top = y > -0.06 ? 1 : 0, under = y < -t + 0.001 ? 1 : 0;
    const k = top ? 1.08 + 0.12 * Math.exp(-(((x + w * 0.06) / (w * 0.3)) ** 2)) : under ? 0.55 : 0.78 + 0.22 * (1 + y / t);
    const c = top ? STONE : DARK;
    col[i * 3] = c.r * k * tint; col[i * 3 + 1] = c.g * k * tint; col[i * 3 + 2] = c.b * k * tint;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aEm', new THREE.BufferAttribute(em, 1));
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g.toNonIndexed();
}

// the sign of the sun in its notch, cut into an underside at y: a disc of ember glass seated in the mouth of a V
// (the notch in the hills where the sun stands), the V's arms a third of the disc's width; down the stair is -z
function sign(y, r) {
  const parts = [];
  // the sun: a ring of glass with a darker gap and a bright core, big in the V's mouth
  const core = new THREE.CircleGeometry(r * 0.3, 20); core.rotateX(Math.PI / 2); core.translate(0, y - 0.005, r * 0.32);
  parts.push(paint(core, EMBER, 1));
  const ring = new THREE.RingGeometry(r * 0.42, r * 0.54, 24); ring.rotateX(Math.PI / 2); ring.translate(0, y - 0.005, r * 0.32);
  parts.push(paint(ring, EMBER, 0.9));
  // the notch: two arms meeting below the sun, open wide above it, thin
  const tip = -r * 0.62, arm = r * 1.3, th = r * 0.09, ang = 0.78;
  for (const sd of [-1, 1]) {
    const bar = new THREE.PlaneGeometry(th, arm); bar.rotateX(Math.PI / 2);
    bar.translate(0, 0, arm / 2); bar.rotateY(sd * ang); bar.translate(0, y - 0.004, tip);
    parts.push(paint(bar, EMBER, 0.75));
  }
  return parts;
}

export { paint, slab, sign, finish, STONE, DARK, BRONZE, POLISH, EMBER };

export function treadGeometry(rng, going, width) {
  const t = 0.28, d = going + 0.05;
  const g = slab(width, d, t, 0.035, rng);
  g.translate(0, 0, -0.025); // the nosing overhangs the riser below by 5 cm (local -z is down the stair)
  const parts = [g];
  // the nosing: a bronze bar along the front edge, its top flush
  const nose = new THREE.BoxGeometry(width - 0.24, 0.05, 0.05); nose.translate(0, -0.03, -going / 2 - 0.035);
  parts.push(paint(nose, BRONZE));
  // the hexagon let into the top, polished by feet
  const hex = new THREE.CylinderGeometry(0.15, 0.15, 0.012, 6); hex.translate(-width * 0.06, -0.022, 0.0);
  parts.push(paint(hex, POLISH));
  parts.push(...sign(-t, 0.3));
  return finish(parts);
}

export function landingGeometry(rng, w, d) {
  const t = 0.42;
  const base = slab(w, d, t - 0.03, 0.0, rng); base.translate(0, -0.03, 0);
  const parts = [base];
  // the field: hexagonal pavers (the Heliarchs' own), a hand's breadth of plain stone round them, each paver its own
  // shade, a few sunk or lifted, the ones where feet cross worn paler
  const R = 0.19, dx = R * Math.sqrt(3), dz = R * 1.5, m = 0.16;
  for (let j = 0; ; j++) {
    const z = -d / 2 + m + R + j * dz; if (z > d / 2 - m - R * 0.86) break;
    for (let i = 0; ; i++) {
      const x = -w / 2 + m + R + i * dx + (j % 2 ? dx / 2 : 0); if (x > w / 2 - m - R * 0.86) break;
      const g = new THREE.CylinderGeometry(R - 0.012, R - 0.012, 0.05, 6); g.rotateY(Math.PI / 6);
      g.translate(x, -0.022 + (rng() - 0.5) * 0.01 - (rng() < 0.08 ? 0.015 : 0), z);
      const worn = Math.exp(-((x / (w * 0.3)) ** 2) - ((z / (d * 0.3)) ** 2));
      parts.push(paint(g, STONE.clone().multiplyScalar(0.82 + rng() * 0.26 + worn * 0.14).lerp(POLISH, rng() < 0.05 ? 0.5 : 0)));
    }
  }
  // the joints: the slab's top under the pavers, darker
  const joint = new THREE.PlaneGeometry(w - 2 * m + 0.02, d - 2 * m + 0.02); joint.rotateX(-Math.PI / 2); joint.translate(0, -0.027, 0);
  parts.push(paint(joint, CUT));
  // a bronze band round the field
  for (const [bw, bd, x, z] of [[w - 2 * m + 0.06, 0.04, 0, d / 2 - m + 0.02], [w - 2 * m + 0.06, 0.04, 0, -d / 2 + m - 0.02], [0.04, d - 2 * m + 0.06, w / 2 - m + 0.02, 0], [0.04, d - 2 * m + 0.06, -w / 2 + m - 0.02, 0]]) {
    const b = new THREE.BoxGeometry(bw, 0.016, bd); b.translate(x, -0.012, z); parts.push(paint(b, BRONZE));
  }
  parts.push(...sign(-t, Math.min(w, d) * 0.36));
  return finish(parts);
}

// a kerb a metre long (scaled along x), 0.24 wide, 0.26 over the slab's top; its ends chamfered
export function kerbGeometry(rng) {
  const g = slab(1, 0.24, 0.26 + 0.42, 0.0, rng);
  g.translate(0, 0.26, 0);
  return finish([g]);
}

// an empty bed: a shallow hollow of bare earth, a little bigger than the slab, its rim crumbled
export function bedGeometry(w, d) {
  const g = new THREE.PlaneGeometry(w + 0.16, d + 0.16, 6, 2); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, n = p.count, col = new Float32Array(n * 3);
  const earth = C('#2e231a'), rim = C('#4a3a26');
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), z = p.getZ(i), edge = Math.abs(x) > w / 2 || Math.abs(z) > d / 2;
    const c = edge ? rim : earth; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aEm', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.deleteAttribute('uv');
  return g.toNonIndexed();
}

function finish(parts) {
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  g.computeBoundingSphere();
  return g;
}

// The slabs' material: vertex colours, the stone mottled in world space, and the ember glass lit by aEm x iGlow
// (iGlow an instanced attribute; a mesh without it reads 0). `glow` is the ember's colour at full.
export function slabMaterial(instanced = true) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0.06 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute float aEm;
${instanced ? 'attribute float iGlow;' : ''}
varying float vEm; varying vec3 vSP;`).replace('#include <begin_vertex>', `#include <begin_vertex>
  vEm = aEm * ${instanced ? 'iGlow' : '1.0'};
  vSP = position * 3.1 + vec3(${instanced ? 'instanceMatrix[3].x, instanceMatrix[3].z, instanceMatrix[3].x * 0.37' : '0.0, 0.0, 0.0'});`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying float vEm; varying vec3 vSP;
float tHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float tNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(tHash(i), tHash(i + vec3(1,0,0)), f.x), mix(tHash(i + vec3(0,1,0)), tHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(tHash(i + vec3(0,0,1)), tHash(i + vec3(1,0,1)), f.x), mix(tHash(i + vec3(0,1,1)), tHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}`).replace('#include <color_fragment>', `#include <color_fragment>
  float tm = tNoise(vSP) * 0.6 + tNoise(vSP * 3.7) * 0.4;
  float lich = smoothstep(0.62, 0.8, tNoise(vSP * 0.8 + 7.0));
  diffuseColor.rgb *= 0.78 + 0.4 * tm;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30, 0.27, 0.16), lich * 0.35 * (1.0 - vEm));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += vec3(3.2, 0.9, 0.22) * vEm;`);
  };
  return m;
}
