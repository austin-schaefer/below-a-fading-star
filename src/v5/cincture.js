// AQ The Cincture [Proposed] (v5 wonder; IDEAS-v4.md AQ, wilderness-v4.md "Yes, emphatically"; the arc in
// wilderness-v4-placement.md: from bearing 140 at the horizon, highest about 55 degrees up near bearing 70, down to
// bearing 350). A thin, broken band built round the world long ago, drawn in the sky dome's fragment shader: no
// textures, no draw calls, no uniforms of its own (it reads the dome's uSunDir and uFlicker).
//
// Geometry, in units of the world's radius (the eye at the origin, the world's centre at (0, -1, 0)): a hoop, a broad
// band like the wall of a cylinder, round the world in a plane that misses the world's centre, so from the surface it
// is a ring seen from inside and off-centre. Its circle passes through the two feet (horizontal, bearings 65 +- 75,
// 3 radii off) and the top (bearing 65, 55 degrees up), and its axis passes through the world's centre (a ring at a
// latitude, not round the equator). Solved here once at load: the circle's radius is 3.13 and its centre 0.47 from the
// world's centre, so the band runs 3.16 radii from the centre. The eye stands 0.75 radii off the ring's plane on the
// sun's side, and the sun lies within 8 degrees of the ring's axis, so the broad inner face the eye sees is grazed by
// the light (in shadow, dark) and the hoop's rim on the sun's side, its end face, takes the sun full on: the red edge,
// on the western side of the band. The top, 2.29 radii off, is the nearest part, so the band is widest there (1.5
// degrees with the rim) and thins toward the horizons, to about three quarters 10 degrees up: a ring round a world
// seen from its surface is always nearest at its highest point.
// Per fragment: one ray-cylinder intersection gives the point on the hoop's inner face, its height across the band
// and the angle round the ring; outside the band plus a margin nothing else runs. Inside: the angle picks the segment
// (120 round the whole ring, about 50 above the horizon, each about 5 degrees long at the top), its joints, four panels
// to each, a seam along the band, the gaps (whole segments missing, square ends), the rim (a second intersection, with
// the plane of the hoop's sunward end) and the haze toward the horizon. `?cincture=0` leaves it out (the chunk is
// empty).
import { SUN } from '../world.js';

const FLAG = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('cincture') : null;
const D2R = Math.PI / 180;

export const CINCTURE = {
  topBearing: 65, topElev: 55, footSpread: 75, footDist: 3, // the feet at 65 - 75 = 350 and 65 + 75 = 140
  faceDeg: 1.25, rimDeg: 0.25, // the inner face's and the rim's apparent widths at the top
  segments: 120,
  // missing lengths, in segment indices from the top (0 is the segment just past the top toward the north-east foot's
  // side; see the note for which way is which): [first, last + 1)
  gaps: [[1, 3], [-12, -11], [-18, -14], [9, 12]],
};

// The ring, solved in the vertical plane through bearing 65 (x out along it, y up); the lateral axis is bearing 155.
function solve() {
  const { topElev, footSpread, footDist: D } = CINCTURE;
  const ce = Math.cos(topElev * D2R), se = Math.sin(topElev * D2R), cf = Math.cos(footSpread * D2R), sf = Math.sin(footSpread * D2R);
  const at = (L) => {
    const M = [D * cf, 0], Q = [L * ce, L * se], v = [Q[0] - M[0], Q[1] - M[1]], m = Math.hypot(v[0], v[1]), e = [v[0] / m, v[1] / m];
    const c = D * sf, r = (m * m + c * c) / (2 * m), O = [Q[0] - r * e[0], Q[1] - r * e[1]];
    return { Q, e, r, O, f: -O[0] * e[0] + (-1 - O[1]) * e[1] }; // f = 0: the axis passes through the world's centre
  };
  let a = 0.01, b = 0.01;
  while (Math.sign(at(b * 1.02).f) === Math.sign(at(a).f) && b < 60) b *= 1.02;
  b *= 1.02;
  for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if (Math.sign(at(m).f) === Math.sign(at(a).f)) a = m; else b = m; }
  const g = at((a + b) / 2);
  const tb = CINCTURE.topBearing * D2R, lb = (CINCTURE.topBearing + 90) * D2R;
  const hx = [Math.sin(tb), -Math.cos(tb)], hz = [Math.sin(lb), -Math.cos(lb)];
  const W = (p) => [p[0] * hx[0], p[1], p[0] * hx[1]];
  const O = W(g.O);
  const n = W([-g.e[1], g.e[0]]);
  const top = W(g.Q), ta = [top[0] - O[0], top[1] - O[1], top[2] - O[2]], tl = Math.hypot(...ta);
  const ax = ta.map((x) => x / tl);
  const bx = [n[1] * ax[2] - n[2] * ax[1], n[2] * ax[0] - n[0] * ax[2], n[0] * ax[1] - n[1] * ax[0]];
  const dTop = Math.hypot(...top);
  // apparent widths at the top per unit of true size: the axis (the inner face's height) and the radius (the rim's
  // depth) seen across the sightline, over the distance (the arc's tangent at the top is lateral, across neither)
  const s = top.map((x) => x / dTop), dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const seen = (u) => Math.sqrt(Math.max(1e-6, 1 - dot(u, s) ** 2)) / dTop;
  const height = (CINCTURE.faceDeg * D2R) / seen(n), depth = (CINCTURE.rimDeg * D2R) / seen(ax);
  const e = O.map((x) => -x), ne = dot(n, e), ep = e.map((x, i) => x - n[i] * ne); // the eye from the ring's centre; off the axis
  const sun = SUN.dir, sunToAxis = Math.acos(dot(n, [sun.x, sun.y, sun.z])) / D2R;
  return { O, n, a: ax, b: bx, r: g.r, height, depth, dTop, ne, ep, epp: dot(ep, ep) - g.r * g.r, sunToAxis, fromCentre: Math.hypot(O[0], O[1] + 1, O[2]) };
}
export const RING = solve();

const f = (x) => x.toFixed(6);
const v3 = (v) => `vec3(${f(v[0])}, ${f(v[1])}, ${f(v[2])})`;

// The chunk goes inside the dome's main(), after the stars and before the high cloud: it reads d, up, sky and the
// dome's uniforms, and writes sky. Cloud, the sun's disc and the moon are composed over it afterwards (none of them
// lies on its line).
export function cinctureGLSL() {
  if (FLAG === '0') return '';
  const R = RING, N = CINCTURE.segments;
  const gaps = CINCTURE.gaps.map(([a, b]) => `(si >= ${a.toFixed(1)} && si < ${b.toFixed(1)})`).join(' || ');
  return /* glsl */`
        // AQ the Cincture (src/v5/cincture.js)
        {
          const vec3 cN = ${v3(R.n)}, cA = ${v3(R.a)}, cB = ${v3(R.b)}, cEp = ${v3(R.ep)};
          const float cR = ${f(R.r)}, cNe = ${f(R.ne)}, cEpp = ${f(R.epp)}, cH = ${f(R.height / 2)}, cT = ${f(R.depth)};
          // the inner face: |eye_perp + t d_perp| = R, the far root (the eye is inside)
          float cnd = dot(cN, d), cA2 = max(1.0 - cnd * cnd, 1e-5), cB2 = dot(cEp, d);
          float ct = (-cB2 + sqrt(max(cB2 * cB2 - cA2 * cEpp, 0.0))) / cA2;
          float cz = (cNe + ct * cnd) / cH;                    // -1 .. 1 across the inner face, +1 the sunward edge
          // the rim: the hoop's sunward end, from R out to R + depth
          float ct2 = (cH - cNe) / cnd;
          vec3 cq2 = cEp + ct2 * (d - cN * cnd);
          float cr2 = (length(cq2) - cR) / cT;                 // 0 .. 1 across the rim
          float cza = fwidth(cz), cra = fwidth(cr2);
          bool onFace = cz > -1.6 && cz < 1.6, onRim = ct2 > 0.0 && cr2 > -0.6 && cr2 < 1.6;
          if (up > -0.02 && (onFace || onRim)) { // a margin, so whole pixel quads take the branch and fwidth holds
            vec3 cq = onFace ? cEp + ct * (d - cN * cnd) : cq2;
            float cth = atan(dot(cq, cB), dot(cq, cA));
            float cs = cth * ${(N / (2 * Math.PI)).toFixed(6)};
            float si = floor(cs), sf = cs - si;
            float sw = fwidth(cs);
            float face = smoothstep(-1.0 - cza, -1.0 + cza, cz) * smoothstep(1.0 + cza, 1.0 - cza, cz);
            float rim = (1.0 - face) * smoothstep(-cra, cra, cr2) * smoothstep(1.0 + cra, 1.0 - cra, cr2);
            // whole lengths fallen: square ends at the joints
            float cov = (${gaps}) ? 0.0 : (face + rim);
            // structure: joints between segments, four panels to each, a seam along the band; lost as it grows finer
            // than a pixel and in the haze toward the horizon
            float haze = pow(1.0 - clamp(up / 0.42, 0.0, 1.0), 2.4);
            float fine = (1.0 - smoothstep(0.08, 0.3, sw)) * (1.0 - haze);
            float joint = 1.0 - smoothstep(0.0, 0.03 + sw, min(sf, 1.0 - sf));
            float pf = fract(sf * 4.0);
            float panel = (1.0 - smoothstep(0.0, 0.025 + sw * 4.0, min(pf, 1.0 - pf))) * (1.0 - smoothstep(0.02, 0.12, sw));
            float seam = 1.0 - smoothstep(0.0, 0.06 + cza, abs(cz + 0.35));
            float shade = 0.85 + 0.3 * hash12(vec2(si, 7.3)); // segment to segment, old plating
            float gut = clamp((0.9 - uFlicker) / 0.55, 0.0, 1.0);
            // the inner face: grazed by the sun, so in shadow; a little lighter than the night sky, darker than the haze
            vec3 rhat = (cq - cN * dot(cN, cq)) / cR;
            float graze = max(dot(-rhat, uSunDir), 0.0);
            vec3 body = (vec3(0.026, 0.02, 0.034) + vec3(0.30, 0.09, 0.04) * graze * uFlicker) * shade;
            body *= 1.0 - fine * (joint * 0.6 + panel * 0.25 + seam * 0.3);
            // the rim: the sun full on its end face, red, broken at the joints
            vec3 rimCol = vec3(0.56, 0.11, 0.035) * max(dot(cN, uSunDir), 0.0) * (0.8 + 0.2 * shade) * (1.0 - joint * fine * 0.7);
            vec3 col = mix(body, rimCol * (0.55 + 0.45 * uFlicker), rim / max(face + rim, 1e-3));
            // while the sun gutters it brightens as the sky darkens: the face takes a dull ember, the rim a hot one
            col += gut * mix(vec3(0.11, 0.045, 0.03) * shade * (1.0 - fine * joint * 0.5), vec3(0.55, 0.2, 0.09), rim / max(face + rim, 1e-3));
            col = mix(col, sky, haze * 0.92);
            sky = mix(sky, col, clamp(cov, 0.0, 1.0));
          }
        }`;
}
