// The Noon Road's glass (v14-D3): the Noonwrights' carriers afloat on the Foundered Nave's water, the hoops of their
// broken line, and the stored light a few still hold, built from the fourth hand's parts (v8/strata/noon.js) into one
// mesh under the kit's dark (v14/under.js). Called by v14/coffin-road.js, which owns the way down (the Late folk's
// shears and stair), the floor and the door. The plan: v14/noon-road/plan.js. The story: stories/the-noon-road.md.
import * as THREE from 'three';
import { UnderBuilder, underMaterial } from './under.js';
import { NOON, NOON_PARTS as P } from '../v8/strata/noon.js';
import { VESSELS, yOf, lamps, WY } from './noon-road/plan.js';

// glazed and blown: smooth, wet-bright under a lamp, clouded and crazed with age, a lime crust at the water's line
export function noonGlass(key = 'noon-glass', waterY = -1e5) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      float ngH(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float ngN(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(ngH(i), ngH(i + vec3(1,0,0)), f.x), mix(ngH(i + vec3(0,1,0)), ngH(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(ngH(i + vec3(0,0,1)), ngH(i + vec3(1,0,1)), f.x), mix(ngH(i + vec3(0,1,1)), ngH(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 ngW = vUnderW;
        diffuseColor.rgb *= 0.74 + 0.36 * ngN(ngW * 0.8) * (0.7 + 0.3 * ngN(ngW * 2.9 + 4.0));           // clouded
        float ngC = min(abs(ngN(ngW * 11.0) - ngN(ngW * 11.0 + 7.3)), abs(ngN(ngW * 23.0 + 2.0) - ngN(ngW * 23.0 + 5.1)) * 1.6); // crazed: a fine net of dark lines
        diffuseColor.rgb *= 1.0 - 0.3 * (1.0 - smoothstep(0.0, 0.022, ngC)) * smoothstep(0.2, 0.55, ngN(ngW * 0.5 + 3.0));
        float ngY = ngW.y - ${waterY.toFixed(2)};
        float ngT = smoothstep(0.0, 0.04, ngY) * (1.0 - smoothstep(0.08 + 0.3 * ngN(ngW * 1.9), 0.5, ngY)) * step(ngY, 2.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.6, 0.5), ngT * 0.75 * smoothstep(0.3, 0.6, ngN(ngW * 5.5)));   // lime at the water's line
        diffuseColor.rgb *= 1.0 - 0.45 * (1.0 - smoothstep(0.0, 0.07, ngY)) * step(ngY, 2.0) * step(-0.5, ngY);`);
  };
  m.customProgramCacheKey = () => 'fp-noon-glass' + waterY.toFixed(2);
  return underMaterial(m, key, NOON.lightHex);
}

// a vessel's frame: the origin on its axis at mid-length, +z along its heading, nose up by its pitch
export function vesselMatrix(v) {
  return new THREE.Matrix4().makeTranslation(v.x, yOf(v), v.z)
    .multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2 - v.a))
    .multiply(new THREE.Matrix4().makeRotationX(-(v.pitch || 0)));
}

export function buildNoon(ctx, { lit, below }) {
  const { scene } = ctx, low = ctx.quality === 'low';
  const B = new UnderBuilder(lit);
  // dust and silt on what faces up, a little; the rest is the material's
  const wear = (x, y, z, ny, base, out) => {
    const k = ny > 0.4 ? 0.3 * (ny - 0.4) * (0.6 + 0.8 * Math.abs(Math.sin(x * 3.7 + z * 5.1))) : 0;
    out[0] = base[0] + (NOON.silt.r - base[0]) * k; out[1] = base[1] + (NOON.silt.g - base[1]) * k; out[2] = base[2] + (NOON.silt.b - base[2]) * k;
    return out;
  };
  for (const v of VESSELS) {
    // the light lies in a vessel like something poured: deep in the belly, thin at the crown
    const y0 = yOf(v), glowFn = v.lit ? (x, y, z) => v.lit * (0.3 + 0.5 * Math.min(1, Math.max(0, (y0 + v.r * 0.75 - y) / (v.r * 1.6)))) : null;
    P.carrier(B, vesselMatrix(v), { r: v.r, len: v.len, lit: v.lit, roll: v.roll, crack: v.crack, glaze: v.glaze, glowFn, seed: Math.round(v.x * 13 + v.z * 7), seg: low ? 20 : 30, full: !low, wear });
  }
  const mesh = new THREE.Mesh(B.geometry(), noonGlass('noon-glass', WY));
  mesh.name = 'noon-road-glass'; mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh); below.keep(mesh);
  // the stored light: a steady lamp over each vessel that still holds it (lights.js keeps the nearest three)
  const lights = [];
  for (const [x, y, z, s, reach] of lamps()) {
    const L = new THREE.PointLight(new THREE.Color(NOON.lightHex), 7 * s, reach + 3, 2);
    L.position.set(x, y + 0.5, z); L.name = 'noon-road-light'; scene.add(L); lights.push({ L, i: 7 * s, ph: x * 0.37 });
  }
  const update = (dt, t) => { for (const l of lights) l.L.intensity = l.i * (0.94 + 0.06 * Math.sin(t * 0.7 + l.ph)); }; // it breathes; it does not flicker
  return { mesh, lights, update, tris: B.tris, vessels: VESSELS.length };
}
