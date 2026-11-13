// The Plummet and the old leads (v12 H2; stories/the-soundings.md). Whoever is up there sounds the world as a
// leadsman sounds a sea: a lead of crystal let down on a line, to learn how far below them the floor has sunk as the
// sun fails. The newest lead hangs over the head of the glacier on the thread out of the dark, point down, 105 m from
// its point to the bronze eye at its top; its point has gone into the ice and the ice has it. The older ones are in
// the ice below: the glacier takes each down the notch and turns it over as it goes. One shows in R3's face beside
// the stair (turned half over), one lies in R2's face, one lies across R2's lip as the climb's bridge, and the oldest
// stands upright on the moor: the mother crystal. Each lead is a hexagonal prism with a long pyramid for its point,
// growth terraces on its faces, a shoulder up to a neck, and a bronze collar with a crown of lobes and an eye.
// The eye of one has broken off and lies on the shelf at the lip of the last crevasse, its band cast with the
// eleven glyphs of the Reckoner's lintel, the frayed end of its line still knotted through it (the find).
import * as THREE from 'three';
import { mergeGeometries } from '../../v4/kit/merge.js';
import { lintelForms } from '../../v7/glyphs/forms.js';
import { prims } from '../../v7/glyphs/forms.js';

const TAU = Math.PI * 2;

// a lead in its own frame: point at the origin, axis +y. R the prism's radius, L its whole length to the neck.
// Pushes triangles into P (positions) and A (aAlong, aTint per vertex) transformed by M. Returns the neck's local y.
export function lead(P, A, M, rng, R, L, along, tint) {
  const n = 6, pt = L * 0.36, body = L * 0.56, sh = L * 0.08;
  const rr = [], aa = [];
  const a0 = rng() * TAU;
  for (let s = 0; s < n; s++) { rr.push(0.9 + rng() * 0.2); aa.push(a0 + (s / n) * TAU + (rng() - 0.5) * 0.12); }
  const ring = (y, r) => rr.map((k, s) => new THREE.Vector3(Math.cos(aa[s]) * r * k, y, Math.sin(aa[s]) * r * k));
  // rings up the body: growth terraces every L/14, each a small step in
  const rings = [ring(pt, R)];
  // growth terraces: three, each a slight step in (more read as writing on a slab)
  const steps = 3;
  for (let k = 1; k <= steps; k++) {
    const y = pt + body * (k / steps), r = R * (1 - 0.02 * k);
    rings.push(ring(y - body / steps * 0.04, r)); rings.push(ring(y, r * 0.975));
  }
  const neckY = pt + body + sh;
  rings.push(ring(neckY, R * 0.42));
  const v = new THREE.Vector3();
  const put = (p) => { v.copy(p).applyMatrix4(M); P.push(v.x, v.y, v.z); A.push(along, tint); };
  const tri = (a, b, c) => { put(a); put(b); put(c); };
  const tip = new THREE.Vector3((rng() - 0.5) * R * 0.08, 0, (rng() - 0.5) * R * 0.08);
  const r0 = rings[0];
  for (let s = 0; s < n; s++) tri(tip, r0[(s + 1) % n], r0[s]);
  for (let k = 0; k < rings.length - 1; k++) {
    const B = rings[k], C = rings[k + 1];
    for (let s = 0; s < n; s++) { const s1 = (s + 1) % n; tri(B[s], C[s1], C[s]); tri(B[s], B[s1], C[s1]); }
  }
  // the neck's top: closed under the collar
  const top = rings[rings.length - 1], c = new THREE.Vector3(0, neckY + R * 0.05, 0);
  for (let s = 0; s < n; s++) tri(top[s], top[(s + 1) % n], c);
  return { neckY, aa, rr };
}

// the bronze collar at a lead's neck: a band, a crown of lobes, straps down the shoulder, and the eye on top.
// Returns a list of geometries in the lead's frame (transform them by its matrix).
export function collar(R, neckY, opts = {}) {
  const geos = [];
  const band = new THREE.CylinderGeometry(R * 0.5, R * 0.52, R * 0.32, 18, 1, true);
  band.translate(0, neckY + R * 0.05, 0); geos.push(band);
  const lip = new THREE.TorusGeometry(R * 0.51, R * 0.05, 5, 18); lip.rotateX(Math.PI / 2); lip.translate(0, neckY - R * 0.11, 0); geos.push(lip);
  const lobes = opts.broken ? 5 : 8;
  for (let k = 0; k < lobes; k++) {
    const a = (k / 8) * TAU, g = new THREE.ConeGeometry(R * 0.09, R * 0.3, 4);
    g.translate(Math.cos(a) * R * 0.47, neckY + R * 0.34, Math.sin(a) * R * 0.47); geos.push(g);
  }
  if (!opts.noStraps) for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + 0.26, g = new THREE.BoxGeometry(R * 0.07, R * 0.9, R * 0.04);
    g.rotateZ(0.5); g.rotateY(-a); g.translate(Math.cos(a) * R * 0.66, neckY - R * 0.4, Math.sin(a) * R * 0.66); geos.push(g);
  }
  if (!opts.noEye) {
    const eye = new THREE.TorusGeometry(R * 0.2, R * 0.055, 8, 20); eye.translate(0, neckY + R * 0.42, 0); geos.push(eye);
    const post = new THREE.CylinderGeometry(R * 0.08, R * 0.16, R * 0.25, 8); post.translate(0, neckY + R * 0.25, 0); geos.push(post);
  }
  for (const g of geos) for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  return geos;
}

// bronze: dark bronze, verdigris in its hollows and on the tops of things (by the world normal and noise)
export function bronzeMaterial(ctx) {
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#4a3a22'), metalness: 0.55, roughness: 0.5 });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBrW; varying vec3 vBrN;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvBrW = (modelMatrix * vec4(transformed, 1.0)).xyz; vBrN = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vBrW; varying vec3 vBrN;
      float brH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float brN(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(brH(i), brH(i + vec3(1,0,0)), f.x), mix(brH(i + vec3(0,1,0)), brH(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(brH(i + vec3(0,0,1)), brH(i + vec3(1,0,1)), f.x), mix(brH(i + vec3(0,1,1)), brH(i + vec3(1,1,1)), f.x), f.y), f.z); }
      float brV = 0.0;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float n = brN(vBrW * 0.9) * 0.6 + brN(vBrW * 3.1) * 0.4;
          brV = clamp(smoothstep(0.42, 0.7, n) + smoothstep(0.3, 0.9, vBrN.y) * 0.35, 0.0, 1.0);
          diffuseColor.rgb = mix(diffuseColor.rgb * 1.5, vec3(0.3, 0.52, 0.44), brV);
        }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.42, 0.9, brV);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(0.6, 0.1, brV);');
  };
  mat.customProgramCacheKey = () => 'fp-icefall-bronze';
  return mat;
}

// the find's band: the eleven glyphs of the Reckoner's lintel, raised pale bronze on a dark ground (a canvas texture)
export function glyphBand(ctx) {
  const W = 1024, Hh = 96;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
  const g = cv.getContext('2d');
  g.fillStyle = '#2e2416'; g.fillRect(0, 0, W, Hh);
  const forms = lintelForms(ctx);
  const cell = W / 12;
  g.strokeStyle = '#b8c8a0'; g.fillStyle = '#b8c8a0'; g.lineCap = 'round'; g.lineWidth = 6;
  forms.forEach((f, i) => {
    const cx = cell * (i + 0.5) + cell * 0.5, cy = Hh / 2, s = Hh * 3.2; // glyph units run about ±0.13
    const { segs, dots } = prims(f);
    for (const [ax, ay, bx, by] of segs) { g.beginPath(); g.moveTo(cx + ax * s, cy - ay * s); g.lineTo(cx + bx * s, cy - by * s); g.stroke(); }
    for (const [px, py] of dots) { g.beginPath(); g.arc(cx + px * s, cy - py * s, 5, 0, TAU); g.fill(); }
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.anisotropy = 4;
  return tex;
}

export { mergeGeometries };
