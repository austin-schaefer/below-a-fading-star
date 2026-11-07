// Shared helpers for the v2 ruins: a sampler of the ground as the terrain mesh draws it, a light
// "sky in the surface" term for glossy things (there is no environment map in this scene), and
// per-vertex recolouring of parts merged with the structures Builder.
import * as THREE from 'three';

// The rendered ground: the terrain mesh's own vertex heights on its own triangle split, so parts sit on
// the visible surface. Reads the live position array, so call it before anything lowers vertices or
// keep the result of snapshot() for a region.
export function meshGround(ctx) {
  const geo = ctx.terrain.mesh.geometry;
  const segs = geo.parameters.widthSegments, size = geo.parameters.width;
  const step = size / segs, half = size / 2, row = segs + 1;
  const P = geo.attributes.position.array;
  function at(x, z) {
    let gx = (x + half) / step, gz = (z + half) / step;
    gx = Math.min(Math.max(gx, 0), segs - 1e-4); gz = Math.min(Math.max(gz, 0), segs - 1e-4);
    const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz;
    const a = (iz * row + ix) * 3 + 1, b = ((iz + 1) * row + ix) * 3 + 1, c = ((iz + 1) * row + ix + 1) * 3 + 1, d = (iz * row + ix + 1) * 3 + 1;
    if (fx + fz <= 1) return P[a] + (P[d] - P[a]) * fx + (P[b] - P[a]) * fz;
    return P[c] + (P[b] - P[c]) * (1 - fx) + (P[d] - P[c]) * (1 - fz);
  }
  function min(x, z, r) { let m = at(x, z); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; m = Math.min(m, at(x + Math.cos(a) * r, z + Math.sin(a) * r)); } return m; }
  function max(x, z, r) { let m = at(x, z); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; m = Math.max(m, at(x + Math.cos(a) * r, z + Math.sin(a) * r)); } return m; }
  function normal(x, z, out = new THREE.Vector3(), e = 0.5) {
    return out.set(at(x - e, z) - at(x + e, z), 2 * e, at(x, z - e) - at(x, z + e)).normalize();
  }
  return { at, min, max, normal, step, half, segs, row };
}

// Recolour the vertices a Builder.add just appended: fn(x, y, z, out Color) for each.
export function recolor(B, from, fn) {
  const c = new THREE.Color();
  for (let i = from; i < B.count; i++) {
    c.setRGB(B.C[i * 3], B.C[i * 3 + 1], B.C[i * 3 + 2]);
    fn(B.P[i * 3], B.P[i * 3 + 1], B.P[i * 3 + 2], c, i);
    B.C[i * 3] = c.r; B.C[i * 3 + 1] = c.g; B.C[i * 3 + 2] = c.b;
  }
}
// Override the moss / wet channels for the vertices just appended.
export function reaux(B, from, fn) {
  for (let i = from; i < B.count; i++) fn(B.A, i * 4, B.P[i * 3], B.P[i * 3 + 1], B.P[i * 3 + 2]);
}

// A glossy surface with no environment map reads black. This adds what it would mirror: the ember
// horizon toward the sun and the violet zenith, by Fresnel, dimmed while the sun gutters.
// Returns GLSL for the fragment, using vViewPosition and normal (view space) at <emissivemap_fragment>.
export const SKY_SHEEN = `
  {
    vec3 sheenV = normalize(vViewPosition);
    vec3 sheenR = reflect(sheenV, normal);                      // view space
    vec3 sheenW = normalize((vec4(sheenR, 0.0) * viewMatrix).xyz); // to world
    float fres = pow(1.0 - clamp(dot(-sheenV, normal), 0.0, 1.0), 4.0);
    float toSun = max(0.0, dot(sheenW, uSheenSun));
    vec3 skyC = mix(vec3(0.16, 0.07, 0.07), vec3(0.05, 0.045, 0.10), smoothstep(-0.05, 0.6, sheenW.y));
    skyC += vec3(0.85, 0.32, 0.12) * pow(toSun, 6.0) * 0.6 + vec3(1.0, 0.55, 0.3) * pow(toSun, 120.0) * 2.5;
    skyC *= smoothstep(-0.35, 0.02, sheenW.y);                 // the ground below mirrors nothing
    totalEmissiveRadiance += skyC * (0.04 + 0.96 * fres) * uSheen * uSheenFlicker;
  }`;
