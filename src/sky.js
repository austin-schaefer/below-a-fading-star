// Sky: a dome with a swollen red sun, a star field that shows even by day (the sky is thin and
// the sun is weak), a cold moon, a faint galactic band and slow high cloud. Also owns the sun's
// occasional guttering, which main() reads to dim the lights.
import * as THREE from 'three';
import { SUN, PALETTE } from './world.js';
import { cinctureGLSL } from './v5/cincture.js'; // v5: AQ the Cincture, a chunk of the dome's shader
import { injectOccultSky } from './v5/occultation.js'; // v5 wonders: AR the Occultation's bite on the disc

// Gutter timings, seconds: total length [min, max] and gap between gutters [min, max]. v4: 12-16 s in all
// (1.4 s down, about 8 s at the floor, 2.5 s back), every 60-110 s. The first gutter comes 60-120 s after "Go out"
// (v16-S1, the owner's #78: let the visitor explore a minute or two, then startle them); its countdown waits on 'begin'.
// ?gutter=<len>,<every> pins both (a single length and interval); ?gutter=v3 is the old 6.5-9 s every 70-150 s.
export const GUTTER_V4 = { len: [12, 16], every: [60, 110] };
export const FIRST_GUTTER = [60, 120];
export const GUTTER_V3 = { len: [6.5, 9], every: [70, 150] };
export const GUTTER = (() => {
  let q = '';
  try { q = new URLSearchParams(location.search).get('gutter') || ''; } catch { /* not in a browser */ }
  if (q === 'v3') return GUTTER_V3;
  const m = q.split(',').map(Number);
  if (m.length === 2 && m.every((n) => Number.isFinite(n) && n > 0)) return { len: [m[0], m[0]], every: [m[1], m[1]], pinned: true };
  return GUTTER_V4;
})();

export function buildSky(ctx) {
  const { scene } = ctx;
  const sunDir = new THREE.Vector3(SUN.dir.x, SUN.dir.y, SUN.dir.z);
  // Moon: opposite-ish the sun, higher, a sliver
  const moonDir = new THREE.Vector3(0.62, 0.42, 0.66).normalize();

  const uniforms = {
    uTime: { value: 0 },
    uSunDir: { value: sunDir },
    uMoonDir: { value: moonDir },
    uFlicker: { value: 1.0 },
    uDark: { value: 0 }, // v16-S2: flicker.dark, for the night that shows through a gutter
    uSunCore: { value: new THREE.Color(PALETTE.sunCore) },
    uSunLight: { value: new THREE.Color(PALETTE.sunLight) },
    uHorizonSun: { value: new THREE.Color(PALETTE.skyHorizonSun) },
    uHorizonAway: { value: new THREE.Color(PALETTE.skyHorizonAway) },
    uZenith: { value: new THREE.Color(PALETTE.skyZenith) },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww; // always at the far plane
      }`,
    fragmentShader: `
      precision highp float;
      varying vec3 vDir;
      uniform float uTime, uFlicker, uDark;
      uniform vec3 uSunDir, uMoonDir, uSunCore, uSunLight, uHorizonSun, uHorizonAway, uZenith;

      float hash13(vec3 p) { p = fract(p * vec3(443.897, 441.423, 437.195)); p += dot(p, p.yzx + 19.19); return fract((p.x + p.y) * p.z); }
      float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 443.897); p3 += dot(p3, p3.yzx + 19.19); return fract((p3.x + p3.y) * p3.z); }
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash12(i), hash12(i + vec2(1,0)), f.x), mix(hash12(i + vec2(0,1)), hash12(i + vec2(1,1)), f.x), f.y);
      }
      float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
      float vnoise3(vec3 p) {
        vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
      }

      // Stars: cells on the unit sphere via a cubemap-ish projection
      float stars(vec3 d, float density, float size) {
        vec3 a = abs(d);
        vec2 uv; float face;
        if (a.x >= a.y && a.x >= a.z) { uv = d.yz / a.x; face = d.x > 0.0 ? 0.0 : 1.0; }
        else if (a.y >= a.z) { uv = d.xz / a.y; face = d.y > 0.0 ? 2.0 : 3.0; }
        else { uv = d.xy / a.z; face = d.z > 0.0 ? 4.0 : 5.0; }
        uv = uv * 0.5 + 0.5;
        vec2 g = uv * density;
        vec2 id = floor(g), f = fract(g);
        float r1 = hash12(id + face * 97.0), r2 = hash12(id + face * 97.0 + 31.7), r3 = hash12(id + face * 97.0 + 63.1);
        vec2 c = vec2(r1, r2) * 0.8 + 0.1;
        float dist = length(f - c);
        float bright = pow(r3, 14.0 - 7.0 * uDark); // v16-S2: in a gutter the fainter stars come out too
        float tw = 0.75 + 0.25 * sin(uTime * (1.5 + r2 * 3.0) + r1 * 40.0);
        return smoothstep(size * (0.6 + bright), 0.0, dist) * bright * tw;
      }

      void main() {
        vec3 d = normalize(vDir);
        float up = clamp(d.y, -1.0, 1.0);
        float sunDot = dot(d, uSunDir);
        float toSun = max(sunDot, 0.0);

        // Gradient: horizon → zenith, warmer toward the sun's side of the sky
        float horizonBand = pow(1.0 - clamp(up, 0.0, 1.0), 3.5);
        // v16-S2: in a gutter the ember goes out of the horizon (uDark, flicker.dark) and the whole vault sinks to violet,
        // the dark blue that is always behind the red showing through (skylife/common.js's sl_sky does the same)
        vec3 horizon = mix(uHorizonAway, uHorizonSun, pow(toSun, 1.6) * (1.0 - 0.8 * uDark));
        vec3 sky = mix(uZenith, horizon, horizonBand);
        // below the horizon fades into haze-dark
        sky = mix(sky, uHorizonAway * 0.55, smoothstep(0.0, -0.12, up));
        sky *= mix(vec3(1.0), vec3(0.62, 0.58, 1.12), uDark);

        // Glow around the sun, broad and low
        float glow = pow(toSun, 6.0) * 0.55 + pow(toSun, 24.0) * 0.7 + pow(toSun, 90.0) * 1.2;
        sky += uSunLight * glow * uFlicker * (0.6 + 0.4 * (1.0 - smoothstep(0.0, 0.35, up)));

        // The galactic band: a faint dusty ribbon tilted across the sky
        vec3 bandN = normalize(vec3(0.55, 0.35, -0.75));
        float band = exp(-pow(dot(d, bandN) * 6.0, 2.0));
        float bandTex = fbm(d.xz * 6.0 + d.y * 4.0) * 0.6 + 0.4;
        sky += vec3(0.16, 0.12, 0.2) * band * bandTex * smoothstep(-0.05, 0.25, up) * (0.75 + 1.1 * uDark);

        // Stars (fade near horizon and inside the sun's glare)
        float s = stars(d, 110.0, 0.06) + stars(d + 0.01, 220.0, 0.04) * 0.6;
        float starFade = smoothstep(-0.02 - 0.06 * uDark, 0.2 - 0.12 * uDark, up) * (1.0 - smoothstep(0.75 + 0.2 * uDark, 0.995, toSun));
        sky += vec3(0.8, 0.86, 1.0) * s * starFade * (1.4 + 3.2 * uDark); // and every star comes out hard and cold

        ${cinctureGLSL()}
        // High cloud: slow, thin, lit from the sun side
        vec2 cuv = d.xz / max(d.y, 0.05);
        float cloud = fbm(cuv * 0.9 + vec2(uTime * 0.004, uTime * 0.0015));
        cloud = smoothstep(0.58, 0.86, cloud) * smoothstep(0.02, 0.18, up) * (1.0 - smoothstep(0.35, 0.8, up));
        vec3 cloudCol = mix(vec3(0.12, 0.08, 0.12), uSunLight * 0.9, pow(toSun, 2.5)) ;
        sky = mix(sky, cloudCol, cloud * 0.42);

        // The sun: a huge dim disc with limb darkening, mottled, and a seething rim
        float sunRadius = 0.072; // angular size (cos-space approx): about 4 degrees across
        float ang = acos(clamp(sunDot, -1.0, 1.0));
        float disc = 1.0 - smoothstep(sunRadius * 0.96, sunRadius * 1.02, ang);
        float limb = sqrt(max(0.0, 1.0 - pow(ang / sunRadius, 2.0)));
        // surface mottling in a local frame
        vec3 t = normalize(cross(uSunDir, vec3(0.0, 1.0, 0.0)));
        vec3 b = cross(uSunDir, t);
        vec2 suv = vec2(dot(d, t), dot(d, b)) / sunRadius;
        mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
        vec2 q1 = suv * 3.0 + vec2(uTime * 0.01, 0.0);
        vec2 q2 = rot * suv * 7.0 + vec2(0.0, uTime * 0.02);
        float mottle = fbm(q1) * 0.55 + fbm(q2) * 0.45; // granulation
        float spots = smoothstep(0.6, 0.72, fbm(rot * suv * 1.6 + 13.0 + uTime * 0.003)) * 0.6 + smoothstep(0.66, 0.78, fbm(suv * 4.5 + 31.0)) * 0.4;
        vec3 sunCol = mix(vec3(0.72, 0.16, 0.06), uSunCore, pow(limb, 0.7)) * (0.7 + 0.5 * mottle) * (1.0 - spots * 0.7);
        sunCol *= 0.2 + 0.8 * pow(limb, 0.55); // limb darkening: the edge goes nearly to blood
        float rim = exp(-pow((ang - sunRadius) / (sunRadius * 0.25), 2.0)) * 0.6;
        sky = mix(sky, sunCol * 0.95 * uFlicker, disc);
        sky += uSunLight * rim * uFlicker * (0.8 + 0.4 * vnoise3(vec3(suv * 8.0, uTime * 0.3)));

        // The moon: a thin, cold crescent
        float mAng = acos(clamp(dot(d, uMoonDir), -1.0, 1.0));
        float mR = 0.018;
        float mDisc = 1.0 - smoothstep(mR * 0.9, mR * 1.05, mAng);
        vec3 mt = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0))); vec3 mb = cross(uMoonDir, mt);
        vec2 muv = vec2(dot(d, mt), dot(d, mb)) / mR;
        float phase = smoothstep(-0.1, 0.25, muv.x * 0.9 + sqrt(max(0.0, 1.0 - dot(muv, muv))) * -0.55 + 0.3);
        vec3 moonCol = vec3(0.78, 0.8, 0.86) * (0.55 + 0.45 * vnoise3(vec3(muv * 3.0, 1.0)));
        sky = mix(sky, moonCol * (0.08 + 0.75 * phase), mDisc * starFade);

        gl_FragColor = vec4(sky, 1.0);
      }`,
  });
  injectOccultSky(mat); // v5 wonders: AR the Occultation, the disc's bite and the band in the sky (src/v5/occultation.js)
  const geo = new THREE.SphereGeometry(10, 48, 24);
  const dome = new THREE.Mesh(geo, mat);
  dome.frustumCulled = false;
  dome.renderOrder = -1000;
  dome.name = 'sky';
  scene.add(dome);

  // Guttering: the sun falters now and then, as if about to go out.
  // flicker.hold (null normally) pins the value, for renders and tests of the gutter.
  // A gutter is a vast thing failing, not a light switch: it fades in over ~1.4 s, holds a dim,
  // shuddering floor of ~0.3 for about 8 s, and comes back over ~2.5 s with a slight overshoot.
  // Austin found the first version (a third of a second to the floor) too abrupt.
  // Timings come from GUTTER (below) so everything that wants them reads one place; ?gutter=<len>,<every> overrides, ?gutter=v3 restores the old ones.
  const grng = ctx.makeRng(1736); // the gutter's own stream (v7.2-05; salt 1736 since v16-S1, so the first lands at 87.5 s, a long one of 15.2 s): the same course every visit
  // FIRST_GUTTER: the first one's [min, max] seconds after 'begin'. Until the visitor goes out the countdown is held
  // (flicker.out false), so the title card's minute does not spend it; a pinned ?gutter= and ?gutter=v3 run from ready
  // (v3's first comes one of its own intervals on, as it did). Anything that brings `next` forward from outside (an act,
  // a test, a render) means the gutter to come: setting it lower than it stands sets `out` too (v16-S2).
  let next = FIRST_GUTTER[0] + grng() * (FIRST_GUTTER[1] - FIRST_GUTTER[0]);
  const v3 = GUTTER === GUTTER_V3;
  if (v3) next = GUTTER.every[0] + grng() * (GUTTER.every[1] - GUTTER.every[0]);
  const flicker = {
    value: 1.0, phase: 0, len: 0, hold: null, timing: GUTTER, out: !!GUTTER.pinned || v3,
    get next() { return next; },
    set next(v) { if (v < next) this.out = true; next = v; },
    dark: 0, lamps: 0, slow: 0, soon: 0, after: 0, flush: 0, lampsAt: null, lampDelay: null, wave: null,
  };
  // The readings for the things that answer (v16-S1, S2), all 0..1, all settled at once under flicker.hold:
  //   `dark`: how far down the sun is (0 above 0.9, 1 at the floor of 0.3), with no lag.
  //   `lamps`: the hand that answers it: lamps and panes turned up about a second and a half after the dark has come (a
  //     person noticing), full in about two, turned down slowly over some eight seconds once the sun is back.
  //   `lampsAt(x, z)`: `lamps` as it reaches a place: the valley's lights answer in a ragged wave outward from the one who
  //     watches, the nearest first (0.3 s plus a second per 45 m, plus up to 1.2 s that is the place's own 6 m cell's; at
  //     most 7 s), each up over 1.8 s and down over 8 s; `wave` is the same for shaders, `lampDelay(x, z)` the delay alone
  //     (for a thing that lights on its own beat: the Leerie's standards).
  //   `slow`: a stored warmth: up over three seconds while the dark is down, back over six (the Laid Sun, the glass).
  //   `soon`: the air holding its breath: 0 to 1 over the four seconds before a gutter's onset, 1 through it, gone as the
  //     sun catches (the wind drops before the dark comes).
  //   `after`: the relief: 1 as the sun catches, gone over some five seconds (a gust, the lamps' sigh); an edge, not a ramp.
  //   `flush`: the warm flush on the screen: the same relief as a smooth reading, rising over about a second from the catch,
  //     then gone over some five seconds (never a step at any frame rate; 0 under flicker.hold).
  let lampWait = 0;
  if (GUTTER.pinned) next = Math.min(next, GUTTER.every[0]); // a pinned ?gutter= starts after one interval at most
  ctx.events?.addEventListener('begin', () => { flicker.out = true; });
  // the wave: seconds since the hand began turning the lamps up (rise) and since it began turning them down (fall), -1
  // when not; a place's own answer is its delay (lampDelay) behind those. flicker.wave is a uniform holder for shaders
  // (src/structures/materials.js: the stone's lit panes): (eye x, eye z, rise, fall).
  let rise = -1, fall = -1;
  const cam = ctx.camera.position;
  // The wave's centre: the eye while no gutter is on, held from its onset until the lights are done, so a teleport or a
  // fall mid-gutter does not relight a house.
  let wcx = cam.x, wcz = cam.z, flushUp = false;
  flicker.wave = { value: new THREE.Vector4(0, 0, -1, -1) };
  const lampDelay = (x, z) => {
    const cx = Math.floor(x / 6) + 0.5, cz = Math.floor(z / 6) + 0.5; // (6 m cells, as the stone's shader: a house answers whole)
    let h = Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453; h -= Math.floor(h);
    return Math.min(7, 0.3 + Math.sqrt((x - wcx) * (x - wcx) + (z - wcz) * (z - wcz)) / 45 + 1.2 * h);
  };
  flicker.lampDelay = lampDelay;
  const ss = (a, b, v) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
  flicker.lampsAt = (x, z) => {
    if (flicker.hold != null || rise < 0) return flicker.lamps;
    const d = lampDelay(x, z);
    return ss(0, 1.8, rise - d) * (fall < 0 ? 1 : 1 - ss(0, 8, fall - d));
  };
  let wasDown = false;
  function update(dt, t) {
    uniforms.uTime.value = t;
    if (flicker.out) next -= dt;
    if (next <= 0 && flicker.phase <= 0) { flicker.len = flicker.phase = GUTTER.len[0] + grng() * (GUTTER.len[1] - GUTTER.len[0]); next = GUTTER.every[0] + grng() * (GUTTER.every[1] - GUTTER.every[0]); }
    let target = 1.0;
    if (flicker.phase > 0) {
      flicker.phase -= dt;
      const e = flicker.len - flicker.phase;            // seconds since onset
      const onset = Math.min(1, e / 1.4);                 // 0..1 over the first 1.4 s
      const tail = Math.min(1, flicker.phase / 2.5);      // 1 until the last 2.5 s, then 0
      const depth = Math.pow(onset, 2) * Math.pow(tail, 1.6);
      const shudder = 0.06 * Math.sin(e * 17.0) + 0.05 * Math.sin(e * 5.3);
      const floor = 0.3 + shudder;
      target = 1 - (1 - floor) * depth;
      if (flicker.phase < 0.6) target = 1 + 0.06 * Math.sin((0.6 - flicker.phase) / 0.6 * Math.PI); // a faint overshoot as it catches
      target = Math.min(1.06, Math.max(0.22, target));
    }
    flicker.value += (target - flicker.value) * Math.min(1, dt * 6);
    const held = flicker.hold != null;
    if (held) flicker.value = flicker.hold;
    flicker.dark = Math.min(1, Math.max(0, (0.9 - flicker.value) / 0.6));
    lampWait = flicker.dark > 0.4 ? lampWait + dt : 0;
    const lampTo = lampWait > 1.4 ? 1 : flicker.dark > 0.15 ? Math.min(flicker.lamps, 1) : 0;
    if (held) flicker.lamps = flicker.dark > 0.4 ? 1 : 0;
    else flicker.lamps += (lampTo - flicker.lamps) * Math.min(1, dt / (lampTo > flicker.lamps ? 0.8 : 3.5));
    if (held) flicker.slow = flicker.dark;
    else flicker.slow = Math.min(1, Math.max(0, flicker.slow + Math.max(-dt / 6, Math.min(dt / 3, flicker.dark - flicker.slow))));
    const soonTo = flicker.phase > 0.6 ? 1 : flicker.out && flicker.phase <= 0 ? Math.min(1, Math.max(0, 1 - next / 4)) : 0;
    flicker.soon = held ? (flicker.dark > 0.4 ? 1 : 0) : soonTo;
    const down = flicker.dark > 0.5;
    if (wasDown && !down) { flicker.after = 1; flushUp = true; }
    wasDown = down;
    flicker.after = held ? 0 : Math.max(0, flicker.after - dt / 5);
    if (held) { flicker.flush = 0; flushUp = false; }
    else if (flushUp) { flicker.flush = Math.min(1, flicker.flush + dt); if (flicker.flush >= 1) flushUp = false; }
    else flicker.flush = Math.max(0, flicker.flush - dt / 5);
    if (held) { rise = flicker.lamps > 0.5 ? 1e4 : -1; fall = -1; }
    else {
      if (lampTo >= 1 && (rise < 0 || fall >= 0)) { rise = fall >= 0 ? 1.8 * Math.max(0, 1 - fall / 8) : 0; fall = -1; }
      else if (rise >= 0) rise += dt;
      if (lampTo <= 0 && rise >= 0 && fall < 0) fall = 0; else if (fall >= 0) fall += dt;
      if (fall > 18) rise = fall = -1;
    }
    if (flicker.phase <= 0 && rise < 0 && fall < 0) { wcx = cam.x; wcz = cam.z; }
    flicker.wave.value.set(wcx, wcz, rise, fall);
    uniforms.uFlicker.value = flicker.value;
    uniforms.uDark.value = flicker.dark;
    dome.position.copy(ctx.camera.position);
  }
  return { dome, flicker, update, sunDir, moonDir };
}
