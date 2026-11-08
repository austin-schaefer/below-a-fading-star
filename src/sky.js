// Sky: a dome with a swollen red sun, a star field that shows even by day (the sky is thin and
// the sun is weak), a cold moon, a faint galactic band and slow high cloud. Also owns the sun's
// occasional guttering, which main() reads to dim the lights.
import * as THREE from 'three';
import { SUN, PALETTE } from './world.js';

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
      uniform float uTime, uFlicker;
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
        float bright = pow(r3, 14.0);
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
        vec3 horizon = mix(uHorizonAway, uHorizonSun, pow(toSun, 1.6));
        vec3 sky = mix(uZenith, horizon, horizonBand);
        // below the horizon fades into haze-dark
        sky = mix(sky, uHorizonAway * 0.55, smoothstep(0.0, -0.12, up));

        // Glow around the sun, broad and low
        float glow = pow(toSun, 6.0) * 0.55 + pow(toSun, 24.0) * 0.7 + pow(toSun, 90.0) * 1.2;
        sky += uSunLight * glow * uFlicker * (0.6 + 0.4 * (1.0 - smoothstep(0.0, 0.35, up)));

        // The galactic band: a faint dusty ribbon tilted across the sky
        vec3 bandN = normalize(vec3(0.55, 0.35, -0.75));
        float band = exp(-pow(dot(d, bandN) * 6.0, 2.0));
        float bandTex = fbm(d.xz * 6.0 + d.y * 4.0) * 0.6 + 0.4;
        sky += vec3(0.16, 0.12, 0.2) * band * bandTex * smoothstep(-0.05, 0.25, up) * 0.75;

        // Stars (fade near horizon and inside the sun's glare)
        float s = stars(d, 110.0, 0.06) + stars(d + 0.01, 220.0, 0.04) * 0.6;
        float starFade = smoothstep(-0.02, 0.2, up) * (1.0 - smoothstep(0.75, 0.995, toSun));
        sky += vec3(0.85, 0.88, 1.0) * s * starFade * 1.4;

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
  const geo = new THREE.SphereGeometry(10, 48, 24);
  const dome = new THREE.Mesh(geo, mat);
  dome.frustumCulled = false;
  dome.renderOrder = -1000;
  dome.name = 'sky';
  scene.add(dome);

  // Guttering: the sun falters now and then, as if about to go out.
  // flicker.hold (null normally) pins the value, for renders and tests of the gutter.
  // A gutter is a vast thing failing, not a light switch: it fades in over ~1.4 s, holds a dim,
  // shuddering floor of ~0.3 for a few seconds, and comes back over ~2.5 s with a slight overshoot.
  // Austin found the first version (a third of a second to the floor) too abrupt.
  const flicker = { value: 1.0, next: 25 + Math.random() * 30, phase: 0, len: 0, hold: null };
  function update(dt, t) {
    uniforms.uTime.value = t;
    flicker.next -= dt;
    if (flicker.next <= 0 && flicker.phase <= 0) { flicker.len = flicker.phase = 6.5 + Math.random() * 2.5; flicker.next = 70 + Math.random() * 80; }
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
    if (flicker.hold != null) flicker.value = flicker.hold;
    uniforms.uFlicker.value = flicker.value;
    dome.position.copy(ctx.camera.position);
  }
  return { dome, flicker, update, sunDir, moonDir };
}
