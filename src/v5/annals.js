// AK The Annals [Proposed] (plans/IDEAS-v4.md AK; site in plans/wilderness-v4-placement.md section 5, key `annals`; SITES.annals in
// world.js). A frieze runs round the bowl's main wall 110-130 m up: a procession of figures each 40 m tall, walking
// sunwise (toward rising bearings, to the viewer's right on every wall), worn almost smooth. The band is narrower
// than the figures, so their feet and heads are lost: it shows hips, torsos, the swing of arms and whatever each one
// carries, none of it legible.
//
// No geometry: a chunk injected into the terrain's fragment shader (terrain.js calls injectAnnals in its
// onBeforeCompile, so the ground skins and the Thrones, which compile that material again, carry it too; nothing of
// theirs reaches the band). The relief is two metres deep, a soft-edged 2D field in the wall's own
// (arc, height) frame. Its slope comes from two more evaluations half a metre along and up (screen-space
// derivatives went blocky in 2x2 pixel steps), laid on the face in world space, and is used twice: the shading
// normal tilts by it, and the albedo is shaded by it against the sun's direction projected on the face. That projection is long where the sun
// grazes the face and short where it strikes it square, so the frieze reads only in raking light. Faces turned from
// the sun (the west wall) do not show it.
//
// The period: 120 figures round the bowl, one every 3° (about 21 m of arc at r 400), deliberately not in step with
// the buttresses (40, every ~9°, wandering with noise). The procession runs over arêtes and into gullies alike, so
// it reads as cut before the wall took its folds, and no buttress gives the eye a unit to count the figures by.
//
// The gutter: while the sun gutters (ctx.sky.flicker falling), uAnnFlip swings the relief's light round the face's
// normal, through the side to its opposite, and the normal's share fades; the lit and shadowed edges of every
// figure trade sides, and for a few seconds the procession seems to walk the other way, then settles (the same
// envelope as the Thrones' rim: catches below 0.85, holds about 4.5 s, gone by 7.5 s).
//
// Where it breaks: the saddle and the Thrones (bearings 238-262), the glacier's notch (from the terrain's
// glacierMask on the face at 120 m), the Gradine's crossing (ctx.gradine.band, about bearing 54°; nothing under
// ?gradine=v2), the bench's flat tops (the relief holds to faces steeper than about 40°), and anything inside r 330.
// Clearest on bearings 60-120 (SITES.annals): elsewhere it is worn to under half its depth.
//
// Cost: outside 106-134 m the chunk is one compare; inside, three evaluations of the figure (nine capsules each).
// ?annals=0 compiles it out; ctx.annals.uniforms.uAnnals.value = 0 zeroes it at runtime (and scales its depth);
// ?annals=mask paints the relief's height red and ?annals=shade the raking term, to find them. One uniform written
// per frame, no allocation.
import * as THREE from 'three';
import { SUN, SITES } from '../world.js';
import { clamp, smoothstep } from '../noise.js';

const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('annals') : null;
const OFF = Q === '0';
const MASK = Q === 'mask'; // ?annals=mask paints the relief's height red, to find the band and its breaks

export const ANNALS = {
  band: SITES.annals.band,  // [110, 130]
  clear: SITES.annals.bearings, // [60, 120]
  figures: 120,             // round the bowl
  height: 40,               // each figure, feet to crown
  foot: 96,                 // the figures' feet, so the band shows hips to shoulders
  amp: 2.0,                 // relief, metres
  gain: 7.0,                // the raking shade's strength on the albedo
  arcR: 400,                // the radius the period is measured at (one figure ~21 m of arc)
  saddle: [250, 12, 3],     // a break: bearing, half-width, fade (degrees)
};

// one set of uniforms shared by every program built from the terrain's material
const uniforms = {
  uAnnals: { value: OFF ? 0 : 1 },
  uAnnFlip: { value: 0 },
  uAnnGrad: { value: new THREE.Vector3() },
  uAnnGlac: { value: new THREE.Vector3() },
};

const f = (n) => n.toFixed(5);
const S = SUN.dir;
const DECL = /* glsl */`
#define FP_ANNALS
uniform float uAnnals, uAnnFlip;
uniform vec3 uAnnGrad, uAnnGlac; // breaks: bearing (deg), half-width, fade; z 0 leaves the break out
vec3 annG = vec3(0.0); // the relief's world-space gradient times its depth, for the normal
float annHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float annNoise(vec2 p) {
  vec2 i = floor(p), u = fract(p); u = u * u * (3.0 - 2.0 * u);
  return mix(mix(annHash(i), annHash(i + vec2(1.0, 0.0)), u.x), mix(annHash(i + vec2(0.0, 1.0)), annHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float annCap(vec2 p, vec2 a, vec2 b, float ra, float rb) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - mix(ra, rb, h);
}
// a worn rounded edge, about 2.6 m from the ground of the band to the top of the relief
float annDome(float d) { return smoothstep(0.8, -1.8, d); }
// one figure: q.x metres along the walk (it walks +x), q.y metres up from its feet; k and j vary it
float annFigure(vec2 q, float k, float j) {
  float st = (k - 0.5) * 3.0;
  vec2 sh = vec2(1.6 + (j - 0.5), 32.5);
  float h = 0.0;
  // the far arm, swung back, lowest of all
  vec2 fe = vec2(-3.0 - st * 0.3, 24.5);
  h = max(h, 0.5 * annDome(min(annCap(q, sh - vec2(0.6, 0.0), fe, 2.1, 1.8), annCap(q, fe, fe + vec2(-1.5 - st * 0.2, -7.0), 1.8, 1.5))));
  // the legs, the far one first
  h = max(h, 0.55 * annDome(annCap(q, vec2(-0.3, 21.0), vec2(-2.5 - st, 11.0), 3.0, 2.2)));
  h = max(h, 0.72 * annDome(annCap(q, vec2(0.5, 21.0), vec2(3.0 + st, 11.0), 3.2, 2.3)));
  // the torso, leaning into the walk; the neck and head, lost above the band
  h = max(h, 0.8 * annDome(annCap(q, vec2(0.0, 22.0), sh, 3.6, 3.3)));
  h = max(h, 0.75 * annDome(annCap(q, sh + vec2(0.4, 1.5), sh + vec2(1.2, 5.2), 1.5, 2.6)));
  // the near arm, forward and raised to what it carries
  vec2 el = vec2(4.5, 25.5), ha = vec2(7.5, 29.0 + (j - 0.5) * 4.0);
  h = max(h, annDome(min(annCap(q, sh, el, 2.0, 1.7), annCap(q, el, ha, 1.7, 1.4))));
  // what it carries: a rounded mass held before it, a long pole, or a load on the shoulder
  float o;
  if (k < 0.4) o = (length((q - ha - vec2(1.0, 1.0)) / vec2(2.2, 3.4)) - 1.0) * 2.4;
  else if (k < 0.75) o = annCap(q, ha + vec2(-1.0, -12.0), ha + vec2(1.4, 13.0), 0.8, 0.7);
  else o = (length((q - sh - vec2(-1.5, 2.5)) / vec2(4.2, 2.6)) - 1.0) * 2.6;
  return max(h, 0.9 * annDome(o));
}
float annBreak(float b, vec3 w) {
  float d = abs(mod(b - w.x + 180.0, 360.0) - 180.0);
  return mix(1.0, smoothstep(w.y, w.y + w.z, d), step(0.5, w.z));
}
`;

// after the terrain's colour block: the height, its surface gradient, the raking shade
const COLOR = /* glsl */`
{
  float aH = 0.0;
  vec3 aN = normalize(vTNormal);
  if (uAnnals > 0.0 && vTPos.y > ${ANNALS.band[0] - 4}.0 && vTPos.y < ${ANNALS.band[1] + 4}.0) {
    float aR = length(vTPos.xz);
    float az = atan(vTPos.z, vTPos.x);
    float brg = mod(degrees(az) + 90.0, 360.0);
    float keep = smoothstep(330.0, 345.0, aR) * smoothstep(0.82, 0.62, aN.y) * uAnnals
      * annBreak(brg, vec3(${ANNALS.saddle.map((n) => n.toFixed(1)).join(', ')})) * annBreak(brg, uAnnGlac) * annBreak(brg, uAnnGrad);
    if (keep > 0.0) {
      float u = az * ${f(ANNALS.figures / (2 * Math.PI))};
      float cell = floor(u);
      vec2 q = vec2((u - cell - 0.5) * ${f(2 * Math.PI * ANNALS.arcR / ANNALS.figures)} + 1.0, vTPos.y - ${ANNALS.foot.toFixed(1)});
      float k = annHash(vec2(cell, 7.1)), j = annHash(vec2(cell, 3.3));
      // the figure and its slope along the wall and up it (forward differences, half a metre)
      float f0 = annFigure(q, k, j);
      float fs = (annFigure(q + vec2(0.5, 0.0), k, j) - f0) * 2.0, fy = (annFigure(q + vec2(0.0, 0.5), k, j) - f0) * 2.0;
      // the band's two borders, a worn fillet each, and the field between them
      float y = vTPos.y;
      float band = smoothstep(${ANNALS.band[0] - 2}.0, ${ANNALS.band[0] + 2}.0, y) * (1.0 - smoothstep(${ANNALS.band[1] - 2}.0, ${ANNALS.band[1] + 2}.0, y));
      float la = (y - ${ANNALS.band[0] - 1.5}) * 0.9, lb = (y - ${ANNALS.band[1] + 1.5}) * 0.9;
      float ea = exp(-la * la), eb = exp(-lb * lb);
      // wear: broad patches gone smooth, runnels down the face, a finer grain (slow enough to leave out of the slope)
      vec2 w = vec2(az * ${f(ANNALS.arcR)}, y);
      float wear = mix(0.45, 1.0, smoothstep(0.2, 0.7, annNoise(w * vec2(0.035, 0.05) + 5.3))) * (0.75 + 0.25 * annNoise(w * vec2(0.4, 0.06)))
        - 0.1 * annNoise(w * 0.5);
      // the east wall, facing the sun, keeps its depth; elsewhere it is worn to under half
      float dc = abs(mod(brg - ${((ANNALS.clear[0] + ANNALS.clear[1]) / 2).toFixed(1)} + 180.0, 360.0) - 180.0);
      float clear = mix(0.42, 1.0, 1.0 - smoothstep(${((ANNALS.clear[1] - ANNALS.clear[0]) / 2).toFixed(1)}, ${((ANNALS.clear[1] - ANNALS.clear[0]) / 2 + 25).toFixed(1)}, dc));
      float m = band * max(wear, 0.0) * keep * clear;
      aH = f0 * m + 0.35 * (ea + eb) * keep * clear;
      float dHs = fs * m, dHy = fy * m - 0.63 * (la * ea + lb * eb) * keep * clear;
      // the slope in world space (s = az * ${ANNALS.arcR}), laid on the face
      vec3 g = vec3(-vTPos.z, 0.0, vTPos.x) * (dHs * ${ANNALS.arcR.toFixed(1)} / dot(vTPos.xz, vTPos.xz)) + vec3(0.0, dHy, 0.0);
      annG = ${ANNALS.amp.toFixed(2)} * (g - aN * dot(aN, g));
      float gl = length(annG); if (gl > 0.9) annG *= 0.9 / gl;
      // the sun on the face (long where it grazes, short where it strikes square); while the sun gutters it swings
      // round the face's normal through the side to its opposite, so lit and shadowed edges trade places
      vec3 aS = vec3(${f(S.x)}, ${f(S.y)}, ${f(S.z)});
      vec3 aLt = aS - aN * dot(aN, aS);
      float aTh = 3.14159265 * uAnnFlip;
      vec3 aL = cos(aTh) * aLt + sin(aTh) * cross(aN, aLt);
      float aLit = smoothstep(-0.05, 0.3, dot(aN, aS));
      float aShade = clamp(-dot(annG, aL) * ${ANNALS.gain.toFixed(2)} * aLit, -0.75, 0.75);
      diffuseColor.rgb *= 1.0 + aShade;
      ${Q === 'shade' ? 'diffuseColor.rgb = vec3(0.5 + aShade, length(aLt), aLit);' : ''}
    }
  }
${MASK ? 'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.0, 0.0), clamp(aH, 0.0, 1.0));' : ''}
}
`;

// before normal_fragment_maps: the shading normal (view space) tilts by the relief, less while the light is swung
const NORMAL = /* glsl */`
if (annG.x != 0.0 || annG.y != 0.0 || annG.z != 0.0) normal = normalize(normal - mat3(viewMatrix) * (annG * (1.0 - 0.85 * uAnnFlip)));
`;

// Called from the terrain material's onBeforeCompile, after its own replacements.
export function injectAnnals(shader) {
  if (OFF) return;
  Object.assign(shader.uniforms, uniforms);
  shader.fragmentShader = shader.fragmentShader
    .replace('void main() {', `${DECL}\nvoid main() {`)
    .replace('#include <alphamap_fragment>', `${COLOR}\n#include <alphamap_fragment>`)
    .replace('#include <normal_fragment_maps>', `${NORMAL}\n#include <normal_fragment_maps>`);
}

// ---------------------------------------------------------------- the module: the breaks, and the gutter's swing
export async function build(ctx) {
  if (OFF) { ctx.annals = { off: true, uniforms }; return; }
  // the glacier's notch: the bearings where the face at 120 m lies in the terrain's glacier mask
  let lo = null, hi = null;
  for (let b = -60; b <= 60; b += 0.25) {
    const p = ctx.mountains.faceAt((b + 360) % 360, 120);
    if (p && ctx.terrain.glacierMask(p.x, p.z) > 0.02) { if (lo === null) lo = b; hi = b; }
  }
  if (lo !== null) uniforms.uAnnGlac.value.set(((lo + hi) / 2 + 360) % 360, (hi - lo) / 2, 2.5);
  const api = { uniforms, flipHold: null, glacier: lo === null ? null : [lo, hi], gradine: null }; // flipHold pins the swing (0..1), for renders
  // the Gradine's crossing, once its module has built (the modules build together)
  const gradine = () => {
    const band = ctx.gradine?.band;
    if (!band?.enter || !band?.leave) return;
    const brg = (p) => ((Math.atan2(p.z, p.x) * 180 / Math.PI + 90) % 360 + 360) % 360;
    const a = brg(band.enter), b = brg(band.leave);
    uniforms.uAnnGrad.value.set((a + b) / 2, Math.abs(a - b) / 2 + 0.6, 0.8);
    api.gradine = [Math.min(a, b), Math.max(a, b)];
  };
  let looked = false;
  const g = { on: false, t: 0 };
  ctx.registerUpdate((dt) => {
    if (!looked) { looked = true; gradine(); }
    const fl = ctx.sky.flicker.value;
    if (fl < 0.85) { if (!g.on) { g.on = true; g.t = 0; } g.t += dt; }
    else if (fl > 0.95) g.on = false;
    const depth = clamp((0.88 - fl) / 0.4, 0, 1);
    const env = g.on ? 1 - smoothstep(4.5, 7.5, g.t) : 0;
    uniforms.uAnnFlip.value = api.flipHold ?? depth * env;
  });
  ctx.annals = api;
}
