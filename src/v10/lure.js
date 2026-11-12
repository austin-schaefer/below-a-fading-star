// The lure (v10-F1): one small sign, the same at every act that can be done now, so a visitor learns it once and can
// walk to it from 40 m. Owned by acts.js (buildLure(ctx, acts) from its build); a def opts out with `lure: false` or
// moves it with `lure: { x?, y?, z? }` (absolute world coordinates; y defaults to at.y). One Points draw for all of them,
// no point light; per frame, one vec4 per act (where, and how much) and the time. Hidden under ?acts=0 (acts.js never
// builds it). ctx.acts.lure: { mesh, state() } for the tests.
import * as THREE from 'three';
import { fogPars, fogAtten } from '../particles/shaderParts.js';

const MAXL = 12, M = 14; // act slots, motes a slot
const FADE = 1.2; // s for a lure to come or go
const H = 4.6; // m the motes rise
const HMAX = 9, CLEAR = 3; // m: the highest they rise; how far over the ground round a sunken thing
const OUT = 0.45; // m out from a faced thing's front

export function buildLure(ctx, acts) {
  const n = MAXL * M;
  const slot = new Float32Array(n * 2), pos = new Float32Array(n * 3);
  for (let s = 0; s < MAXL; s++) for (let k = 0; k < M; k++) { const i = s * M + k; slot[i * 2] = s; slot[i * 2 + 1] = k; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSK', new THREE.BufferAttribute(slot, 2));
  const at = Array.from({ length: MAXL }, () => new THREE.Vector4(0, 0, 0, 0)), hs = new Array(MAXL).fill(H), wants = new Array(MAXL).fill(0);
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uScale: { value: 400 }, uCol: { value: new THREE.Color('#ffc46a') } }]),
    vertexShader: `uniform float uTime, uScale; uniform vec4 uAt[${MAXL}]; uniform float uH[${MAXL}]; attribute vec2 aSK; varying float vI; varying float vK;
      #include <fog_pars_vertex>
      float h1(float x) { return fract(sin(x * 91.7 + 13.1) * 43758.5453); }
      void main() {
        int si = int(aSK.x + 0.5); vec4 A = uAt[si];
        float k = aSK.y, ph = h1(k + aSK.x * 17.0), on = A.w;
        vec3 p = A.xyz;
        // motes of the tally's saffron chalk-dust going slowly up a loose spiral over the thing, thinning as they rise
        float T = 11.0 + 4.0 * ph, u = fract(uTime / T + (k + 0.6 * ph) / ${M}.0);
        float sw = 0.12 + 0.3 * u, an = uTime * (0.45 + 0.2 * ph) + ph * 6.28 + u * 5.0;
        p += vec3(cos(an) * sw, uH[si] * u, sin(an) * sw);
        float tw = 0.75 + 0.25 * sin(uTime * (2.0 + 2.0 * ph) + ph * 30.0);
        float I = tw * smoothstep(0.0, 0.08, u) * (1.0 - smoothstep(0.55, 1.0, u)), sz = 0.09 * (1.0 - 0.45 * u);
        vec3 transformed = p; // the fog chunk reads it
        vec4 mvPosition = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mvPosition;
        float d = -mvPosition.z, px = sz * uScale / max(d, 0.1);
        float far = 1.0 - smoothstep(60.0, 85.0, d); // gone beyond about 80 m, so seven of them never litter the map
        vI = 1.5 * I * on * far * (1.0 + 1.6 * clamp((5.0 - px) / 5.0, 0.0, 1.0)); // small far off: brighter, so it still reads
        float core = max(px, 2.6), S = clamp(core * 4.0, 9.0, 64.0); // the bright heart never under 2 px; the halo round it
        vK = core / S;
        gl_PointSize = vI > 0.002 ? S : 0.0;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uCol; varying float vI; varying float vK; // vK: the heart's radius over the sprite's
      ${fogPars}
      void main() { ${fogAtten}
        vec2 c = (gl_PointCoord - 0.5) * 2.0; float r2 = dot(c, c), q = r2 / (vK * vK);
        float a = exp(-q * 1.4) * 2.2 + exp(-r2 * 5.0) * 0.28;
        vec3 col = mix(uCol, vec3(1.0, 0.94, 0.8), exp(-q * 3.0)) * a;
        gl_FragColor = vec4(col * vI * mix(1.0, fogAtten, 0.6), 1.0); }`,
    fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  mat.uniforms.uAt = { value: at };
  mat.uniforms.uH = { value: hs };
  const mesh = new THREE.Points(geo, mat);
  mesh.frustumCulled = false; mesh.renderOrder = 21; mesh.name = 'act-lures';
  ctx.scene.add(mesh);

  const ground = (x, z) => ctx.terrain?.heightAt?.(x, z) ?? 0;
  const slots = new Map(); // handle -> slot index
  const where = (h) => {
    const d = h.def, L = d.lure && typeof d.lure === 'object' ? d.lure : {};
    const out = d.face ? OUT : 0; // a thing with a front (a wall, a door): stood a little out from it
    const x = L.x ?? d.at.x + (d.face?.x ?? 0) * out, z = L.z ?? d.at.z + (d.face?.z ?? 0) * out;
    const y = L.y ?? (d.at.y ?? ground(x, z)) - 0.4;
    // the motes rise H, or higher where the ground round the thing stands over it (a sunken stair, a hollow), so that
    // they clear its lip by CLEAR and are seen from the land round about
    let top = y + H;
    for (let a = 0; a < 8; a++) for (const r of [5, 9]) top = Math.max(top, ground(x + Math.cos(a * Math.PI / 4) * r, z + Math.sin(a * Math.PI / 4) * r) + CLEAR);
    return { x, y, z, h: L.h ?? Math.min(top - y, HMAX) };
  };
  const ds = new THREE.Vector2();
  // per frame from acts.js: want(h) says whether h's lure should show now
  function step(dt, t, want) {
    mat.uniforms.uTime.value = t;
    ctx.renderer.getDrawingBufferSize(ds);
    mat.uniforms.uScale.value = ds.y / (2 * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov) * 0.5));
    let any = false;
    for (const h of acts.list) {
      if (h.def.lure === false) continue;
      let s = slots.get(h);
      if (s === undefined) { if (slots.size >= MAXL) continue; s = slots.size; slots.set(h, s); const w = where(h); at[s].set(w.x, w.y, w.z, 0); hs[s] = w.h; }
      const v = at[s], to = want(h) ? 1 : 0;
      wants[s] = to;
      if (v.w !== to) v.w = to > v.w ? Math.min(1, v.w + dt / FADE) : Math.max(0, v.w - dt / FADE);
      if (v.w > 0) any = true;
    }
    mesh.visible = any;
  }
  const state = () => acts.list.map((h) => { const s = slots.get(h); return { id: h.def.id, want: s === undefined ? 0 : wants[s], on: s === undefined ? 0 : +at[s].w.toFixed(3), at: s === undefined ? null : { x: at[s].x, y: at[s].y, z: at[s].z }, h: s === undefined ? 0 : hs[s] }; });
  return { mesh, step, state };
}
