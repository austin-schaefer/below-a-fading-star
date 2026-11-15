// The glacier, rebuilt (v4 regions, with BQ the Outwash; plans/wilderness-v5.md: "flow lines, crevasses that follow the
// slope, a snout that reads as ice"). The notch in the north wall is unchanged (terrain.glacierMask, which the
// Lattice and the walls read); this file shapes the tongue on the floor and paints it.
// - glacierTongue(h, x, z, ramp): the ice on the floor, called from terrain.js's heightAt. A convex tongue,
//   thickest down its middle and thinning to nothing at its margins, so you can walk onto it from the sides; up
//   the middle it ends in a snout, a face of about five metres at 45 degrees that you clamber up, lobed forward
//   where the middle flows fastest (z about -215 there, -221 at the sides). Low ogive swells cross it.
// - glacierIce(x, z): biomeAt's ice weight: the tongue's whole width (as the notch), cut sharp at the snout.
// - glacierFloorIce(ice, slope, x, z): the terrain's ice attribute: ice holds on the snout's face and down the middle
//   of the notch (an icefall), not on the notch's cliff walls.
// - glacierCoords(x, z, out): [across (-1..1, signed), metres up-glacier from the snout, the face's weight], the
//   terrain's aGlac attribute, so the shader knows which way the ice flows.
// - GLACIER_GLSL: fpGlacier(), the ice's colour: blue-white, dirtier toward the snout; foliation along the flow and
//   two dark medial moraines; transverse crevasses in arcs bowed down-glacier, densest where the bed steepens and
//   splaying at the snout; chevron crevasses at the margins; the snout's face banded with debris and glassy blue.
import { makeSimplex, smoothstep } from '../noise.js';
import { WORLD, LANDMARKS } from '../world.js';
import { iceY, carve, sOf } from '../v12/icefall/plan.js'; // v12-H2: the icefall's heights and the climb's carve

// v12-H2: up the notch the ice is the icefall's (src/v12/icefall/plan.js): from s 4 to 14 (z -289 to -299) the old
// ramp (`old`, terrain.js's) hands over to it, and the tongue's own thickness fades out over the same metres.
// h: the floor under the walls; returns the ice's height over h (applyMountains lerps to it by glacierMask)
const hand = (z) => smoothstep(4, 14, sOf(z));
export function glacierBedH(x, z, h, ramp, old) {
  const w = hand(z);
  if (w <= 0) return old;
  return old + (iceY(x, z) - h - old) * w;
}
export function glacierCarve(x, z, h) { return z < -285 ? carve(x, z, h) : h; }

const SX = makeSimplex(WORLD.seed); // the same stream as terrain.js's, so the wobble matches glacierMask's
const L = LANDMARKS.moraine;
const HALF = 95; // the tongue's half-width (glacierMask's across falls to zero at 95 m)
const wobble = (z) => SX.fbm2(z * 0.004, 3.1, 3) * 40;

// the snout line: z of the ice's front at across a (signed, -1..1)
function snoutZ(a) { return -221 + 5.5 * (1 - a * a) + 1.6 * SX.noise2(a * 3.1, 7.7); }

export function glacierCoords(x, z, out = [0, 0, 0]) {
  const a = (x - L.x - wobble(z)) / HALF;
  const dz = snoutZ(Math.max(-1, Math.min(1, a))) - z;
  out[0] = a; out[1] = dz;
  out[2] = Math.abs(a) < 0.9 ? smoothstep(-1.5, 0, dz) * (1 - smoothstep(5.5, 9, dz)) * (1 - smoothstep(0.7, 0.9, Math.abs(a))) : 0;
  return out;
}

const _g = [0, 0, 0];
export function glacierTongue(h, x, z, ramp) {
  if (z > -205 || ramp >= 1) return h;
  const g = glacierCoords(x, z, _g), a = g[0], dz = g[1];
  if (Math.abs(a) >= 1 || dz <= 0) return h;
  const prof = Math.pow(1 - a * a, 0.7);
  // the face: five metres over four and a half; then it thickens slowly up-glacier
  let T = 5.0 * smoothstep(0, 4.5, dz) + 2.6 * smoothstep(4.5, 50, dz);
  // ogives: low swells in arcs, bowed down-glacier like the crevasses
  T += 0.35 * Math.sin((dz + 16 * a * a) * 0.28) * smoothstep(8, 22, dz);
  T += SX.fbm2(x * 0.03, z * 0.03, 3) * 0.5 * smoothstep(4, 12, dz);
  return h + T * prof * (1 - ramp) * (1 - hand(z));
}

export function glacierIce(x, z) {
  const dx = Math.abs(x - L.x - wobble(z));
  const across = 1 - smoothstep(55, HALF, dx);
  if (across <= 0) return 0;
  // the notch's full width, ending on the floor at the snout
  const a = Math.max(-1, Math.min(1, (x - L.x - wobble(z)) / HALF));
  return across * smoothstep(snoutZ(a) + 0.6, snoutZ(a) - 0.6, z);
}

export function glacierFloorIce(ice, slope, x, z) {
  if (ice <= 0) return 0;
  const g = glacierCoords(x, z, _g), core = 1 - smoothstep(0.45, 0.75, Math.abs(g[0]));
  // the snout's face, and the ice's middle as it comes down the notch (an icefall), keep their ice on the steep
  return ice * (1 - smoothstep(0.35, 0.75, slope) * (1 - Math.max(g[2], core * 0.85)));
}

export const GLACIER_GLSL = /* glsl */`
  float fpCrev(float u, float sp, float w) {
    float v = u / sp, fw = fwidth(v);
    float line = 1.0 - smoothstep(w, w + fw * 1.5, abs(fract(v) - 0.5));
    return line * (1.0 - smoothstep(0.2, 0.45, fw)); // fade out where they would alias
  }
  float fpHash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
  vec3 fpGlacier(vec3 col, vec3 p, vec3 n, float ice, vec3 g, vec3 d1, vec3 d2) {
    if (ice <= 0.001) return col;
    float a = g.x, dz = g.y, face = g.z;
    // blue-white ice, dirtier and greyer toward the snout, cleaner up-glacier
    float dirt = (1.0 - smoothstep(3.0, 45.0, dz)) * 0.5 + (d2.r - 0.5) * 0.35;
    vec3 c = mix(vec3(0.25, 0.31, 0.39), vec3(0.15, 0.15, 0.16), clamp(dirt, 0.0, 0.8)) * (0.86 + 0.24 * d1.g);
    // foliation: fine bands running down-glacier
    c *= 0.94 + 0.06 * (sin(a * 150.0 + d2.g * 3.0 + d1.r * 1.5) * 0.5 + 0.5);
    // two medial moraines: dark stony stripes along the flow
    float med = 1.0 - smoothstep(0.012, 0.04, abs(abs(a) - 0.36 - 0.025 * sin(dz * 0.045) + (d2.b - 0.5) * 0.03));
    c = mix(c, vec3(0.08, 0.075, 0.075) * (0.8 + 0.4 * d1.b), med * 0.8 * smoothstep(-1.0, 2.0, dz));
    // transverse crevasses in arcs bowed down-glacier, broken into runs; denser where the bed steepens and at the snout
    float sl = 1.0 - n.y;
    float sp = mix(7.5, 3.2, clamp(smoothstep(0.04, 0.22, sl) + (1.0 - smoothstep(2.0, 18.0, dz)) * 0.6, 0.0, 1.0));
    float u = dz + 16.0 * a * a + d2.g * 2.0;
    float row = floor(u / sp);
    float run = step(0.4, fpHash(row * 7.31 + floor(a * 5.0 + fpHash(row) * 3.0 + d2.r * 1.5)));
    float cr = fpCrev(u, sp, 0.05 + 0.04 * d1.r) * run * (1.0 - smoothstep(0.75, 0.95, abs(a)));
    // marginal crevasses: chevrons pointing up-glacier near the sides
    float um = dz + 38.0 * abs(a) + d2.g * 2.0;
    float crm = fpCrev(um, 4.2, 0.04) * smoothstep(0.55, 0.8, abs(a)) * step(0.35, fpHash(floor(um / 4.2) * 3.7 + sign(a)));
    // v12-H2: up the icefall (dz past ~70 m, src/v12/icefall) the tongue's crevasse rows give way to the terraces'
    // old firn: wind-scoured, grit in streaks along the flow (drawn cracks read as doodles: the icefall's own crevasses are geometry)
    float fall = smoothstep(70.0, 82.0, dz); // with the heights' handover (s 4 to 14: dz about 68 to 84 across the tongue)
    float crev = max(cr, crm) * smoothstep(0.5, 3.0, dz) * (1.0 - fall);
    c = mix(c, vec3(0.015, 0.04, 0.08), crev * 0.92);
    if (fall > 0.0) {
      vec3 firn = vec3(0.37, 0.355, 0.40) * (0.84 + 0.22 * d1.g) * (0.94 + 0.12 * d2.b);
      firn = mix(firn, vec3(0.17, 0.15, 0.15), smoothstep(0.52, 0.78, d2.r) * 0.55 * (0.6 + 0.4 * sin(a * 40.0 + d1.r * 4.0)));
      // a steep bit of terrain up the icefall (a riser's margin where no face is drawn): grey-blue ice
      firn = mix(firn, vec3(0.13, 0.19, 0.26) * (0.85 + 0.3 * d1.g), smoothstep(0.8, 0.55, n.y));
      c = mix(c, firn, fall);
    }
    // the snout's face: debris bands and clean glassy blue between them
    float steep = smoothstep(0.88, 0.62, n.y) * face;
    float band = smoothstep(0.3, 0.48, abs(fract(p.y * 1.15 + d2.r * 0.9 + a * 2.0) - 0.5));
    vec3 faceCol = mix(vec3(0.10, 0.22, 0.34) * (0.8 + 0.3 * d1.g), vec3(0.07, 0.065, 0.065), band * 0.85);
    c = mix(c, faceCol, steep);
    return mix(col, c, ice);
  }
`;
