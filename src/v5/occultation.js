// AR The Occultation [Proposed] (IDEAS-v4.md AR; wilderness-v4.md "Yes, but the shadow band sweeps a couple of
// hundred metres up, through the air and across the walls, a weather event, not along the floor"; placement in
// wilderness-v4-placement.md, AR). Every several minutes a band of shadow sweeps the bowl from the sun's saddle in the
// west to the east wall at a walking pace, as if something vast were passing between the bowl and the sun. Nothing is
// drawn: look up and there is only haze, and the sun's disc dims along one edge. Birds under it go quiet.
//
// The body: 400 m long north-south (full within 180 m of its middle, gone by 220 m), 60-90 m thick east-west (per
// pass), 170-230 m up (OCCULT.body), every edge soft over 20 m. Its middle runs from x -340 (over the saddle's mouth)
// to x 400 (the east wall's face at that height) at 2 m/s: 740 m in about 6 min 10 s, fading in and out over 25 s at
// the ends. Its north-south middle is z 50 +-20, so the Span's deck (z 215), the causeway and spawn lie under it and
// the Outwash (z -230) looks at it from past its northern end. The first pass comes 40-90 s after the frames start,
// then 180-420 s after each one ends, from its own ctx.makeRng stream.
//
// Everything is derived from the sun (SUN.dir, 13.5 degrees up): a point is in the band's shadow when its ray toward
// the sun passes through the body.
//   the walls (terrain.js calls injectOccultation, after lights_fragment_end): the ray from vTPos toward the sun is
//     intersected with the body (an inner and an outer box, averaged; soft over the last 40 m of its run through
//     them), and the terrain loses 80% of its direct light (the sun is the only directional light) and 30% of its
//     indirect, for fragments from the bench's brow up (faded over 108-122 m) and inside r 500. Above the body nothing
//     is in its shadow. The shadow of a body 200 m up lands 4.2 m east for every metre it falls, so on the floor it
//     would land about 830 m east, past the east wall: the clamp loses nothing true. Under the saddle, where the sun
//     is lowest over the ground, the body's shadow falls east onto the bowl's floor and is clamped away, and the
//     saddle's flanks face away from the sun. The wall term goes on to the fog through a global (fpOccWallAmt).
//   the air (atmosphere.js calls injectOccultFog; every fogged material, ShaderLib's and those built from
//     UniformsLib.fog): the camera's ray to the fragment is intersected with the body itself (the same two boxes,
//     unsheared), and the haze and the low mist lose up to 50% of their light by the length inside (63% of that at
//     60 m); in front of a shadowed wall fragment they lose a further 45% of the wall term. The sky dome (sky.js calls
//     injectOccultSky) takes the air term to infinity at up to 45%, so the band shows crossing the bowl where no wall
//     stands behind it.
//   the disc: the thing is always above the sun's line from the bowl (from the floor the line to the sun only
//     reaches 200 m 750 m west, past the saddle), so the bite is on the disc's upper limb, its eastern one: a soft
//     chord darkened by 22% whose inner edge starts 0.15 radii above the middle and recedes off the limb as the band
//     goes east, gone by the time it reaches the east wall. The rim on that limb dims with it.
//
// The hush: ctx.hush = { level(x, z), cue(name, pos) }. level is the pass's envelope within the body's ground
// footprint (straight below it) plus 100 m, soft over 20 m, and 0 beyond; cue(name, pos) drops a bird's cue (crows,
// rooks-lift, flush, stonechat, grouse-flush, wader-gone) with probability 0.97 * level at its position, drawing from
// a stream of its own. audio/cues.js asks ctx.hush.cue first thing in ctx.audio.cue; audio/regions.js hands the region kit a hush(pos);
// the Demesne's rooks, the one bird voice that is a bed rather than a cue, scale their gain by 1 - hush. The
// sandpipers do not call. Nothing sounds.
//
// Cost: one vec4 uniform, uOccult (x the pass's envelope, y and z the body's middle, w its half-thickness), the same
// plain object in every program (cloneUniforms copies a value without isVector4 by reference), written once a frame;
// no draw calls, no allocation. With no pass running uOccult.x is 0 and every chunk is one compare. During a pass a
// wall fragment 108-230 m up adds two ray-box intersections (about 40 instructions), every fogged fragment two more,
// the dome two. ?occult=0 compiles it all out; ?occult=now starts a pass 3 s in; ?occult=mask sets every term to
// full; ?occult=paint paints the wall term red, the air green, the sky blue; __fp.occultation.pass(at) poses one
// `at` seconds in and holds it (pass(at, false) lets it run on; pass(null) clears it).
import { SUN } from '../world.js';

const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('occult') : null;
const OFF = Q === '0';
const MASK = Q === 'mask'; // ?occult=mask: every term at full strength, to find them
const PAINT = Q === 'paint'; // ?occult=paint: the wall term red, the air's green (the sky's blue), to find them

export const OCCULT = {
  y: 200, body: [170, 230],  // the body's middle and its bottom and top
  airLen: 60,                // metres of the body's air that take 63% of the haze's darkening
  wallLow: [108, 122],       // the wall term's floor: from the bench's brow, nothing below it
  half: [180, 220],          // half its length, north-south: full, gone
  thick: [60, 90],           // east-west, per pass
  soft: 20,                  // the edges' width
  x: [-340, 400], speed: 2.0, ramp: 25, // west to east, m/s, fade at each end (s)
  z: [50, 20],               // middle north-south, jitter
  first: [40, 90], every: [180, 420],
  wall: 0.8, wallSky: 0.3, wallHaze: 0.45, air: 0.5, sky: 0.45, bite: 0.22, // how much each loses
  pad: 100,                  // the hush reaches this far past the footprint
};
const S = SUN.dir;
const f = (n) => n.toFixed(5);
const HS = (OCCULT.soft / 2).toFixed(1);
if (MASK) Object.assign(OCCULT, { wall: 1, wallSky: 1, wallHaze: 1, air: 1, sky: 1, bite: 1 });

// the one uniform's value, shared by reference
export const OCC = { x: 0, y: 0, z: 0, w: 0 };

// the shared GLSL: declared once per program (the fog's pars and the terrain both carry it)
const COMMON = /* glsl */`
#ifndef FP_OCC
#define FP_OCC
uniform vec4 uOccult; // x envelope, yz the body's middle (x, z), w its half-thickness
float fpOccWallAmt = 0.0; // the terrain's wall term, for the fog after it: the air at a shadowed wall is shadowed too
// the interval of t where f0 + fd t lies in (lo, hi)
vec2 fpOccIv(float f0, float fd, float lo, float hi) {
  if (abs(fd) < 1e-5) return (f0 > lo && f0 < hi) ? vec2(-1e9, 1e9) : vec2(1e9, -1e9);
  float a = (lo - f0) / fd, b = (hi - f0) / fd;
  return vec2(min(a, b), max(a, b));
}
// how far a ray from ro along rd, [0, d], runs through a box (half-extents h.x, h.y across x and z round the body's
// middle; y from ylo to yhi), the box given in the frame q (the world, or the sun-sheared one for the air)
float fpOccBox(vec3 ro, vec3 rd, float d, vec2 h, float ylo, float yhi) {
  vec2 i = fpOccIv(ro.x - uOccult.y, rd.x, -h.x, h.x), j = fpOccIv(ro.z - uOccult.z, rd.z, -h.y, h.y), k = fpOccIv(ro.y, rd.y, ylo, yhi);
  return max(0.0, min(min(i.y, j.y), min(k.y, d)) - max(max(i.x, j.x), max(k.x, 0.0)));
}
// the walls: how much of the body a ray from q toward the sun passes through, 0..1 (soft over the last 40 m of it)
float fpOccWall(vec3 q) {
  vec3 s = vec3(${f(S.x)}, ${f(S.y)}, ${f(S.z)});
  float l = fpOccBox(q, s, 3000.0, vec2(uOccult.w - ${HS}, ${OCCULT.half[0].toFixed(1)}), ${OCCULT.body[0].toFixed(1)}, ${OCCULT.body[1].toFixed(1)})
          + fpOccBox(q, s, 3000.0, vec2(uOccult.w + ${HS}, ${OCCULT.half[1].toFixed(1)}), ${OCCULT.body[0].toFixed(1)}, ${OCCULT.body[1].toFixed(1)});
  return smoothstep(0.0, 80.0, l);
}
// the air: how far a ray runs through the body itself, the haze inside it (an inner and an outer box, averaged,
// soften every edge over ${OCCULT.soft} m); 0..1
float fpOccAir(vec3 ro, vec3 rd, float d) {
  float l = fpOccBox(ro, rd, d, vec2(uOccult.w - ${HS}, ${OCCULT.half[0].toFixed(1)}), ${(OCCULT.body[0] + OCCULT.soft / 2).toFixed(1)}, ${(OCCULT.body[1] - OCCULT.soft / 2).toFixed(1)})
          + fpOccBox(ro, rd, d, vec2(uOccult.w + ${HS}, ${OCCULT.half[1].toFixed(1)}), ${(OCCULT.body[0] - OCCULT.soft / 2).toFixed(1)}, ${(OCCULT.body[1] + OCCULT.soft / 2).toFixed(1)});
  return 1.0 - exp(-l * 0.5 / ${OCCULT.airLen.toFixed(1)});
}
#endif
`;

// ---------------------------------------------------------------- the air: atmosphere.js's fog chunks
const FOG_AT = 'gl_FragColor.rgb = mix( gl_FragColor.rgb, lowMist, hf * 0.78 );';
const FOG = /* glsl */`
      if (uOccult.x > 0.0) { float fpOcc = (1.0 - ${OCCULT.air.toFixed(2)} * uOccult.x * fpOccAir(cameraPosition, fpDir, fpDist)) * (1.0 - ${OCCULT.wallHaze.toFixed(2)} * fpOccWallAmt); haze *= fpOcc; lowMist *= fpOcc;${PAINT ? ' gl_FragColor.g += 1.0 - fpOcc;' : ''} }
      `;
// Called at the end of installAtmosphere, before any material compiles. The fog chunks get the term; every built-in
// shader whose uniforms carry the fog's gets uOccult (ShaderMaterials with fog keep it at 0, so it is off for them).
export function injectOccultFog(THREE) {
  if (OFF) return;
  const C = THREE.ShaderChunk;
  if (!C.fog_fragment.includes(FOG_AT)) { console.warn('occultation: the fog chunk has changed; the band is left out of the air'); return; }
  C.fog_pars_fragment = `${COMMON}\n${C.fog_pars_fragment}`;
  C.fog_fragment = C.fog_fragment.replace(FOG_AT, `${FOG}${FOG_AT}`);
  for (const lib of Object.values(THREE.ShaderLib)) if (lib.uniforms?.fogDensity) lib.uniforms.uOccult = { value: OCC };
  // the ShaderMaterials that build their uniforms from UniformsLib.fog (water, river, pool, particles, paths, the
  // regions' and the v2 and v5 modules' own) merge or clone it at build time, after this, and keep the same object
  THREE.UniformsLib.fog.uOccult = { value: OCC };
}

// ---------------------------------------------------------------- the walls: the terrain's fragment shader
const WALL = /* glsl */`
if (uOccult.x > 0.0 && vTPos.y > ${OCCULT.wallLow[0].toFixed(1)} && vTPos.y < ${OCCULT.body[1].toFixed(1)}) {
  float oW = fpOccWall(vTPos) * smoothstep(${OCCULT.wallLow[0].toFixed(1)}, ${OCCULT.wallLow[1].toFixed(1)}, vTPos.y) * (1.0 - smoothstep(480.0, 520.0, length(vTPos.xz)));
  fpOccWallAmt = oW * uOccult.x;
  float oK = 1.0 - ${OCCULT.wall.toFixed(2)} * fpOccWallAmt;
  reflectedLight.directDiffuse *= oK; reflectedLight.directSpecular *= oK;
  reflectedLight.indirectDiffuse *= 1.0 - ${OCCULT.wallSky.toFixed(2)} * fpOccWallAmt;
  ${PAINT ? 'reflectedLight.directDiffuse += vec3(oW * uOccult.x, 0.0, 0.0);' : ''}
}
`;
// Called from the terrain material's onBeforeCompile, after its own replacements and the Annals'.
export function injectOccultation(shader) {
  if (OFF) return;
  shader.uniforms.uOccult = { value: OCC };
  shader.fragmentShader = shader.fragmentShader
    .replace('void main() {', `${COMMON}\nvoid main() {`)
    .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>\n${WALL}`);
}

// ---------------------------------------------------------------- the sky: the disc's bite and the dome's dimming
const SKY_DISC = 'sky = mix(sky, sunCol * 0.95 * uFlicker, disc);';
const SKY_END = 'gl_FragColor = vec4(sky, 1.0);';
const X0 = OCCULT.x[0], X1 = OCCULT.x[1];
const BITE = /* glsl */`
if (uOccult.x > 0.0) {
  // up the disc, toward the zenith: its eastern limb; the bite's inner edge recedes off it as the band goes east
  vec3 oUp = normalize(vec3(0.0, 1.0, 0.0) - uSunDir * uSunDir.y);
  float oV = dot(d, oUp) / sunRadius;
  float oP = clamp((uOccult.y - ${X0.toFixed(1)}) / ${(X1 - X0).toFixed(1)}, 0.0, 1.0);
  float oE = mix(0.15, 1.15, oP);
  float oB = 1.0 - ${OCCULT.bite.toFixed(2)} * uOccult.x * smoothstep(oE - 0.12, oE + 0.12, oV);
  sunCol *= oB; rim *= oB;
}
`;
const SKY_AIR = /* glsl */`
if (uOccult.x > 0.0) { float oA = fpOccAir(cameraPosition, d, 4000.0); sky *= 1.0 - ${OCCULT.sky.toFixed(2)} * uOccult.x * oA;${PAINT ? ' sky.b += oA;' : ''} }
`;
// Called from buildSky once its material is made.
export function injectOccultSky(mat) {
  if (OFF) return;
  const s = mat.fragmentShader;
  if (!s.includes(SKY_DISC) || !s.includes(SKY_END)) { console.warn('occultation: the sky shader has changed; the disc keeps no bite'); return; }
  mat.uniforms.uOccult = { value: OCC };
  mat.fragmentShader = s
    .replace('void main() {', `${COMMON}\nvoid main() {`)
    .replace(SKY_DISC, `${BITE}${SKY_DISC}`)
    .replace(SKY_END, `${SKY_AIR}${SKY_END}`);
}

// ---------------------------------------------------------------- the module: the passes and the hush
const BIRDS = new Set(['crows', 'rooks-lift', 'flush', 'stonechat', 'grouse-flush', 'wader-gone']);
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export async function build(ctx) {
  if (OFF) { ctx.occultation = { off: true }; return; }
  const rng = ctx.makeRng(9241);    // the schedule: when a pass starts, its thickness and its middle
  const hushRng = ctx.makeRng(9242); // the hush's draws, so the birds never move the schedule
  const span = (r) => r[0] + rng() * (r[1] - r[0]);
  const dur = (X1 - X0) / OCCULT.speed;
  // one pass: e seconds in, its half-thickness and middle north-south; held passes do not advance
  const P = { on: false, e: 0, hw: 37.5, zc: OCCULT.z[0], hold: false };
  let clock = 0, next = Q === 'now' ? 3 : span(OCCULT.first);
  const start = (e = 0, hold = false, posed = false) => {
    P.on = true; P.e = e; P.hold = hold;
    P.hw = posed ? (OCCULT.thick[0] + OCCULT.thick[1]) / 4 : span(OCCULT.thick) / 2;
    P.zc = posed ? OCCULT.z[0] : OCCULT.z[0] + (rng() * 2 - 1) * OCCULT.z[1];
  };
  const env = () => (P.on ? ss(0, OCCULT.ramp, P.e) * ss(0, OCCULT.ramp, dur - P.e) : 0);
  const sync = () => {
    OCC.x = env(); OCC.y = X0 + OCCULT.speed * Math.min(P.e, dur); OCC.z = P.zc; OCC.w = P.hw;
  };
  // the hush: 1 under the band (its ground footprint plus 100 m), 0 beyond
  const level = (x, z) => {
    if (!P.on || OCC.x <= 0) return 0;
    const dx = Math.abs(x - OCC.y) - OCC.w - OCCULT.pad, dz = Math.abs(z - OCC.z) - OCCULT.half[0] - OCCULT.pad;
    return OCC.x * (1 - ss(-OCCULT.soft, 0, Math.max(dx, dz)));
  };
  ctx.hush = {
    level,
    cue(name, pos) {
      if (!BIRDS.has(name) || !pos || typeof pos.x !== 'number') return false;
      const h = level(pos.x, pos.z);
      return h > 0 && hushRng() < 0.97 * h;
    },
  };
  ctx.registerUpdate((dt) => {
    clock += dt;
    if (P.on) {
      if (!P.hold) P.e += dt;
      if (P.e >= dur) { P.on = false; next = clock + span(OCCULT.every); }
    } else if (clock >= next) start();
    sync();
  });
  ctx.occultation = {
    uniform: OCC, params: OCCULT, duration: dur, state: P,
    // pose a pass `at` seconds in (held unless hold is false); null clears it
    pass(at = 0, hold = true) {
      if (at === null) { P.on = false; next = clock + span(OCCULT.every); sync(); return null; }
      start(at, hold, true); sync(); return { x: OCC.y, z: OCC.z, envelope: OCC.x };
    },
    get next() { return P.on ? 0 : next - clock; },
    hush: ctx.hush,
  };
  ctx.log?.(`occultation: a pass of ${dur.toFixed(0)} s, the first in ${next.toFixed(0)} s`);
}
