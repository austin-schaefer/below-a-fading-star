// The water seen from inside the tube (v17-U1): what makes the drowned head and conduit read as water all round, from
// the one length of clear glass. No volume is drawn: every surface out there (the stone, the saddles, the collars,
// the weed, the silt, the water's underside, the glass itself) darkens and takes the water's colour by how far the ray
// from the eye to it runs through water, the eye's own air inside the tube taken off. So the stone a metre past the
// glass is plain and dim, the vault three metres up is half lost, and the conduit ahead goes to the water's colour.
//
// One set of uniforms (SW), updated once a frame by update(eye): the pool's level, the clock, the tube's axis at the
// eye (a cylinder: the ray's air is up to where it leaves it), the lights in the water (the portal's daylight at the
// head, the Garth's noon at the door, the tube's lenses) that colour the water by where the ray runs.
//   swPatch(mat, key)          on an underMaterial'd MeshStandardMaterial (the stone, the glass): the water over it,
//                              and the light wavering on it (caustics: under the pool, on the vault over it)
//   SW_GLSL                    the functions, for the ShaderMaterials (the silt, the weed, the surface, the fall)
//   SW                         the uniforms
import * as THREE from 'three';

export const MAX_LAMPS = 8;
export const SW = {
  uSwT: { value: 0 },
  uSwPool: { value: -9.2 },
  uSwAx: { value: new THREE.Vector4(0, -1e5, 0, 0) },   // xyz a point on the tube's axis near the eye; w 1 when the eye is in its bore
  uSwAd: { value: new THREE.Vector3(1, 0, 0) },           // the axis's direction there
  uSwR: { value: 1.6 },                                   // the bore (a little under the glass's inside)
  uSwFlow: { value: new THREE.Vector2(1, 0) },            // the current's heading in the conduit (xz)
  uSwLampP: { value: Array.from({ length: MAX_LAMPS }, () => new THREE.Vector4(0, -1e5, 0, 1)) }, // xyz, reach
  uSwLampC: { value: Array.from({ length: MAX_LAMPS }, () => new THREE.Vector3(0, 0, 0)) },        // colour times strength
  uSwDeep: { value: new THREE.Color(0.002, 0.009, 0.007) }, // the water's own colour where no light reaches
  uSwBox: { value: new THREE.Vector4(-102, -28, 310.5, 326) }, // the water's extent (x0, x1, z0, z1): nothing outside is in it
};

export const SW_GLSL = /* glsl */`
  uniform float uSwT, uSwPool, uSwR;
  uniform vec4 uSwAx; uniform vec3 uSwAd; uniform vec2 uSwFlow;
  uniform vec4 uSwLampP[${MAX_LAMPS}]; uniform vec3 uSwLampC[${MAX_LAMPS}];
  uniform vec3 uSwDeep; uniform vec4 uSwBox;
  // how far along the ray from the eye (unit v, length len) it stays in the tube's bore
  float swAir(vec3 E, vec3 v, float len) {
    if (uSwAx.w < 0.5) return 0.0;
    vec3 w = E - uSwAx.xyz, d = uSwAd;
    vec3 vp = v - dot(v, d) * d, wp = w - dot(w, d) * d;
    float a = dot(vp, vp), b = 2.0 * dot(wp, vp), c = dot(wp, wp) - uSwR * uSwR;
    if (c > 0.0) return 0.0;               // the eye is not in the bore
    if (a < 1e-5) return len;              // straight down the axis
    float t = (-b + sqrt(max(0.0, b * b - 4.0 * a * c))) / (2.0 * a);
    return clamp(t, 0.0, len);
  }
  // the ray's metres in water, from the eye to P; and (out) the middle of its wet part
  float swPath(vec3 P, out vec3 mid) {
    vec3 E = cameraPosition, D = P - E; float len = length(D); vec3 v = D / max(len, 1e-4);
    mid = P;
    if (P.x < uSwBox.x || P.x > uSwBox.y || P.z < uSwBox.z || P.z > uSwBox.w) return 0.0;
    float t0 = swAir(E, v, len);
    vec3 S = E + v * t0; float l = len - t0;
    float W = uSwPool, ys = S.y, yp = P.y;
    if (ys >= W && yp >= W) return 0.0;
    if (ys < W && yp < W) { mid = (S + P) * 0.5; return l; }
    float f = (W - min(ys, yp)) / max(abs(ys - yp), 1e-4);
    vec3 X = S + (P - S) * clamp((W - ys) / (yp - ys), 0.0, 1.0); // where it crosses the surface
    mid = ys < W ? (S + X) * 0.5 : (X + P) * 0.5;
    return l * f;
  }
  // the light the water carries at Q (what the ray takes on as it runs through)
  vec3 swLight(vec3 Q) {
    vec3 c = uSwDeep;
    for (int i = 0; i < ${MAX_LAMPS}; i++) {
      vec4 L = uSwLampP[i]; vec3 d = Q - L.xyz;
      c += uSwLampC[i] / (1.0 + dot(d, d) / (L.w * L.w));
    }
    return c * vec3(0.55, 1.0, 0.72); // light that has come through water is green
  }
  // over the water seen through: absorbed (red first: the water is green-dark), and its own light added
  vec3 swWater(vec3 col, vec3 P) {
    vec3 mid; float p = swPath(P, mid);
    if (p <= 0.0) return col;
    vec3 T = exp(-p * vec3(0.5, 0.21, 0.3));
    return col * T + swLight(mid) * (1.0 - exp(-p * 0.3));
  }
  // light wavering through moving water: where two moving noise fields cross, a thin bright line, so a net of small
  // cells (about 0.4 m) that drifts with the current and slowly re-forms
  float swH(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  float swN(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(swH(i), swH(i + vec3(1,0,0)), f.x), mix(swH(i + vec3(0,1,0)), swH(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(swH(i + vec3(0,0,1)), swH(i + vec3(1,0,1)), f.x), mix(swH(i + vec3(0,1,1)), swH(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float swCaustic(vec3 P) {
    vec3 q = P * 2.4 - vec3(uSwFlow.x, 0.0, uSwFlow.y) * uSwT * 0.5;
    float a = swN(q + vec3(0.0, uSwT * 0.35, 0.0)), b = swN(q * 1.13 + vec3(5.2, -uSwT * 0.3, 1.7));
    float l = 1.0 - smoothstep(0.0, 0.09, abs(a - b));
    float a2 = swN(q * 1.9 + vec3(2.0, uSwT * 0.5, 7.0)), b2 = swN(q * 2.1 + vec3(9.0, -uSwT * 0.45, 3.0));
    float l2 = 1.0 - smoothstep(0.0, 0.12, abs(a2 - b2));
    return l * 0.9 + l2 * 0.45;
  }
`;

// the stone and the glass: the water over the lit fragment; caustics on what is under the pool (from above: the
// surface's light) and on what is over it within 4 m (the light thrown back up off the moving surface)
export function swPatch(mat, key, o = {}) {
  const prev = mat.onBeforeCompile, caus = (o.caustic ?? 1).toFixed(2);
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    Object.assign(sh.uniforms, SW);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${SW_GLSL}`)
      .replace('#include <opaque_fragment>', `{
        vec3 swMid; float swP = swPath(vUnderW, swMid);
        float swD = uSwPool - vUnderW.y;
        // under: the surface's light comes down in a net, strongest near the surface; over: thrown up onto the vault
        float swK = swD > 0.0 ? exp(-swD * 0.12) : exp(swD * 0.5) * 0.6;
        vec3 swL = swLight(vUnderW);
        ${o.mortar ? `// the Heliarchs' courses: 0.6 m high, blocks 1.2 m long, broken joint; the joints dark with silt
        { float swC = floor(vUnderW.y / 0.6); vec2 swJ = vec2(fract(vUnderW.y / 0.6), fract((vUnderW.x + vUnderW.z * 0.15 + swC * 0.6) / 1.2));
          float swM = (1.0 - smoothstep(0.0, 0.025, min(swJ.x, 1.0 - swJ.x)) ) + (1.0 - smoothstep(0.0, 0.0125, min(swJ.y, 1.0 - swJ.y)));
          outgoingLight *= 1.0 - 0.55 * clamp(swM, 0.0, 1.0); }` : ''}
        outgoingLight += diffuseColor.rgb * vec3(0.95, 1.0, 0.9) * swL * swCaustic(vUnderW) * swK * ${caus} * 18.0;
        outgoingLight += diffuseColor.rgb * swL * 0.8 * step(0.0, swD);
        if (swP > 0.0) { vec3 T = exp(-swP * vec3(0.5, 0.21, 0.3)); outgoingLight = outgoingLight * T + swLight(swMid) * (1.0 - exp(-swP * 0.3)); }
      }
      #include <opaque_fragment>`);
  };
  const pk = mat.customProgramCacheKey?.bind(mat);
  mat.customProgramCacheKey = () => (pk ? pk() : '') + '|sw-' + key;
  return mat;
}

// once a frame: the clock, and the tube's axis at the eye
export function makeWaterUpdate(L, A) {
  const o = {};
  return (t, eye) => {
    SW.uSwT.value = t;
    const inBox = eye.x > L.BBOX.x0 - 4 && eye.x < L.BBOX.x1 + 4 && eye.z > L.BBOX.z0 - 4 && eye.z < L.BBOX.z1 + 4;
    if (!inBox) { SW.uSwAx.value.w = 0; return; }
    L.near(eye.x, eye.z, o);
    const s = Math.max(0, Math.min(L.LEN, o.s)), a = L.at(s, {}), y = L.floorY(s) + A.axisUp, k = L.slope(s);
    const d = new THREE.Vector3(a.tx, k, a.tz).normalize();
    SW.uSwAx.value.set(a.x, y, a.z, Math.abs(o.d) < A.bore && Math.abs(eye.y - y) < A.bore + 0.5 && o.s > -0.3 && o.s < L.LEN + 0.3 ? 1 : 0);
    SW.uSwAd.value.copy(d);
  };
}
