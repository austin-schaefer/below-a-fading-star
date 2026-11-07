// Shared pieces for skylife: the uniforms every sky-distance material reads, and a GLSL chunk
// that reproduces the sky dome's gradient, sun glow and high cloud (same maths as sky.js) so
// objects at sky distance can be hazed into the exact colour of the sky behind them and sit
// under its cloud. Directions use compass bearings: 0 = north (-z), PI/2 = east (+x).
import * as THREE from 'three';
import { SUN, PALETTE } from '../world.js';

export function makeSkyUniforms() {
  return {
    uSunDir: { value: new THREE.Vector3(SUN.dir.x, SUN.dir.y, SUN.dir.z) },
    uSunLight: { value: new THREE.Color(PALETTE.sunLight) },
    uHorizonSun: { value: new THREE.Color(PALETTE.skyHorizonSun) },
    uHorizonAway: { value: new THREE.Color(PALETTE.skyHorizonAway) },
    uZenith: { value: new THREE.Color(PALETTE.skyZenith) },
    uFlicker: { value: 1 },
    uSkyTime: { value: 0 }, // the dome's clock, for cloud drift
    uT: { value: 0 },       // skylife's own clock (can be paused by the test hooks)
  };
}

// Pick the shared uniforms plus a material's own into one object (sharing the {value} holders).
export function withSky(sky, own) { return Object.assign({}, sky, own); }

export const SKY_GLSL = /* glsl */`
  uniform vec3 uSunDir, uSunLight, uHorizonSun, uHorizonAway, uZenith;
  uniform float uFlicker, uSkyTime, uT;
  float sl_hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 443.897); p3 += dot(p3, p3.yzx + 19.19); return fract((p3.x + p3.y) * p3.z); }
  float sl_vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(sl_hash12(i), sl_hash12(i + vec2(1,0)), f.x), mix(sl_hash12(i + vec2(0,1)), sl_hash12(i + vec2(1,1)), f.x), f.y);
  }
  float sl_fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * sl_vnoise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
  // The dome's colour in direction d, without stars, moon or the sun's disc.
  vec3 sl_sky(vec3 d) {
    float up = clamp(d.y, -1.0, 1.0);
    float toSun = max(dot(d, uSunDir), 0.0);
    float horizonBand = pow(1.0 - clamp(up, 0.0, 1.0), 3.5);
    vec3 horizon = mix(uHorizonAway, uHorizonSun, pow(toSun, 1.6));
    vec3 sky = mix(uZenith, horizon, horizonBand);
    sky = mix(sky, uHorizonAway * 0.55, smoothstep(0.0, -0.12, up));
    float glow = pow(toSun, 6.0) * 0.55 + pow(toSun, 24.0) * 0.7 + pow(toSun, 90.0) * 1.2;
    sky += uSunLight * glow * uFlicker * (0.6 + 0.4 * (1.0 - smoothstep(0.0, 0.35, up)));
    return sky;
  }
  float sl_cloud(vec3 d) {
    float up = d.y;
    vec2 cuv = d.xz / max(d.y, 0.05);
    float c = sl_fbm(cuv * 0.9 + vec2(uSkyTime * 0.004, uSkyTime * 0.0015));
    return smoothstep(0.58, 0.86, c) * smoothstep(0.02, 0.18, up) * (1.0 - smoothstep(0.35, 0.8, up));
  }
  vec3 sl_cloudCol(vec3 d) { return mix(vec3(0.12, 0.08, 0.12), uSunLight * 0.9, pow(max(dot(d, uSunDir), 0.0), 2.5)); }
  // How much air lies between the eye and something at sky distance in direction d (k: thickness).
  float sl_haze(vec3 d, float k) { float m = 1.0 / (max(d.y, 0.0) + 0.07); return 1.0 - exp(-k * m); }
  // Put an opaque colour behind the air and under the cloud.
  vec3 sl_air(vec3 col, vec3 d, float k) {
    col = mix(col, sl_sky(d), sl_haze(d, k));
    return mix(col, sl_cloudCol(d), sl_cloud(d) * 0.42);
  }
  // For emitted light: what fraction gets through the air and cloud.
  float sl_trans(vec3 d, float k) { return (1.0 - sl_haze(d, k)) * (1.0 - 0.42 * sl_cloud(d)); }
`;

const D2R = Math.PI / 180;
// Unit direction from a compass bearing and an elevation, both in degrees.
export function dirFrom(bearingDeg, elevDeg, out = new THREE.Vector3()) {
  const b = bearingDeg * D2R, e = elevDeg * D2R;
  return out.set(Math.sin(b) * Math.cos(e), Math.sin(e), -Math.cos(b) * Math.cos(e));
}

// The elevation (degrees) of the mountain skyline along a bearing, seen from a point.
export function skylineElevation(terrain, x, z, bearingDeg) {
  const b = bearingDeg * D2R, sx = Math.sin(b), sz = -Math.cos(b);
  const eye = terrain.heightAt(x, z) + 1.7;
  let best = -90;
  for (let r = 60; r <= 620; r += 8) {
    const h = terrain.heightAt(x + sx * r, z + sz * r);
    best = Math.max(best, Math.atan2(h - eye, r) / D2R);
  }
  return best;
}

// A tiny triangle-soup builder: positions plus optional per-vertex extras.
export class Soup {
  constructor() { this.p = []; this.x = []; }
  tri(a, b, c, extra = 0) { this.p.push(...a, ...b, ...c); this.x.push(extra, extra, extra); }
  quad(a, b, c, d, extra = 0) { this.tri(a, b, c, extra); this.tri(a, c, d, extra); }
  geometry(extraName) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    if (extraName) g.setAttribute(extraName, new THREE.Float32BufferAttribute(this.x, 1));
    g.computeVertexNormals();
    return g;
  }
}
