// CQ The Simulacrum [Proposed] (wilderness-v5.md, "### CQ. The Simulacrum"): "Winter gnats dancing in columns over the
// Outwash's meltwater pools. When the sun gutters, one column draws together into a face, a long grave face the size of
// a man's, that looks at you and comes apart when the light comes back." Austin: liked but doubted; time-boxed.
// Four columns within r 5 of (20, -205), 240 gnats each (120 at low), one Points for all: each column 0.6 m wide and 3.0 m
// tall, its base 0.4 m over the ground there (the Outwash keeps the spot clear for the pools but draws none: they stand
// over the dry channel's gravel), every gnat orbiting its column's axis with its own radius, rate and bob, all on the GPU
// from attributes and a time uniform. Each gnat is a dark speck lit as a tiny sphere by the low sun, so its sun side
// glints warm (v7.1: 2.4-4 px, a sunlit side, the columns taller and their gnats held closer to the axis, so a column
// reads as a column from 20 m in daylight).
// The face (face.js): when flicker has been under 0.5 for 1 s, the column nearest the walker that is in view draws together
// over 2.5 s into a life-size face, turned to the walker every frame, its gnats catching a faint pale light; when flicker
// rises past 0.85 it unravels over 1.5 s back into its column. The face never speaks, follows or reaches.
import * as THREE from 'three';
import { SITES, PALETTE } from '../../world.js';
import { hyp } from '../../noise.js';
import { facePoints } from './face.js';

const SITE = SITES.simulacrum;          // (20, -205) r 5
const COLS = 4, PER = 240, PER_LOW = 120, WIDE = 0.3, TALL = 3.0, BASE = 0.4, FACE_Y = 1.55;
const LOW_FLICK = 0.5, LOW_FOR = 1, BACK = 0.85, FORM = 2.5, UNRAVEL = 1.5;

export function buildSimulacrum(ctx, { face: faceOn }) {
  const { scene, terrain, camera, player } = ctx;
  const low = ctx.quality === 'low';
  const per = low ? PER_LOW : PER, N = COLS * per;
  const rng = ctx.makeRng(7506);
  // ---- the columns: four over the spot kept clear for the pools, two metres or more apart
  const cols = [];
  for (let k = 0; k < 400 && cols.length < COLS; k++) {
    const a = rng() * 6.2832, r = Math.sqrt(rng()) * (SITE.r - 0.5), x = SITE.x + Math.cos(a) * r, z = SITE.z + Math.sin(a) * r;
    if (cols.some((c) => hyp(c.x - x, c.z - z) < 2.1)) continue;
    const wl = terrain.waterLevelAt?.(x, z);
    const g = Math.max(terrain.heightAt(x, z), wl ?? -Infinity);
    cols.push({ x, z, y: g + BASE, ground: g, water: wl != null });
  }
  // ---- the gnats
  const pos = new Float32Array(N * 3), aG = new Float32Array(N * 4), aB = new Float32Array(N * 4), aF = new Float32Array(N * 4);
  for (let c = 0; c < cols.length; c++) {
    const fp = facePoints(per, ctx.makeRng(7507 + c));
    for (let j = 0; j < per; j++) {
      const i = c * per + j;
      pos[i * 3] = cols[c].x; pos[i * 3 + 1] = cols[c].y; pos[i * 3 + 2] = cols[c].z;
      // held toward the axis (a column, not a cloud), the ends a little narrower than the middle
      const rad = WIDE * (0.15 + 0.85 * Math.pow(rng(), 1.4)), rate = (rng() < 0.5 ? -1 : 1) * (1.2 + rng() * 3.2), ph = rng() * 6.2832;
      aG[i * 4] = c; aG[i * 4 + 1] = rad; aG[i * 4 + 2] = rate; aG[i * 4 + 3] = ph;
      // thicker low in the column, thinning toward its top
      const h = TALL * Math.pow(rng(), 1.15);
      aB[i * 4] = h; aB[i * 4 + 1] = 0.03 + rng() * 0.1; aB[i * 4 + 2] = 0.8 + rng() * 2.2; aB[i * 4 + 3] = rng();
      aF[i * 4] = fp[j * 4]; aF[i * 4 + 1] = fp[j * 4 + 1]; aF[i * 4 + 2] = fp[j * 4 + 2]; aF[i * 4 + 3] = fp[j * 4 + 3];
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aG', new THREE.BufferAttribute(aG, 4));
  geo.setAttribute('aB', new THREE.BufferAttribute(aB, 4));
  geo.setAttribute('aF', new THREE.BufferAttribute(aF, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(SITE.x, cols[0].y + 1.2, SITE.z), SITE.r + 3);
  const sd = ctx.sun?.dir || { x: -0.8, y: 0.15, z: 0.3 };
  const U = {
    uCols: { value: cols.map((c) => new THREE.Vector3(c.x, c.y, c.z)) },
    uTime: { value: 0 }, uFace: { value: 0 }, uFaceCol: { value: -1 }, uH: { value: 720 }, uFlicker: { value: 1 },
    uFC: { value: new THREE.Vector3() }, uFR: { value: new THREE.Vector3(1, 0, 0) }, uFU: { value: new THREE.Vector3(0, 1, 0) }, uFN: { value: new THREE.Vector3(0, 0, 1) },
    uSun: { value: new THREE.Vector3(sd.x, sd.y, sd.z).normalize() }, uSunCol: { value: new THREE.Color(PALETTE.sunLight) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, U]),
    vertexShader: /* glsl */`
      uniform vec3 uCols[${COLS}]; uniform float uTime, uFace, uFaceCol, uH;
      uniform vec3 uFC, uFR, uFU, uFN, uSun;
      attribute vec4 aG, aB, aF;
      varying float vLit, vA; varying vec3 vSun;
      #include <fog_pars_vertex>
      void main() {
        int ci = int(aG.x + 0.5);
        vec3 base = uCols[0];
        for (int k = 1; k < ${COLS}; k++) if (k == ci) base = uCols[k];
        float a = aG.w + uTime * aG.z;
        float h = clamp(aB.x + sin(uTime * aB.z + aG.w * 3.0) * aB.y, 0.0, ${TALL.toFixed(2)});
        float hu = h / ${TALL.toFixed(2)};
        float taper = 0.75 + 0.25 * sin(3.1416 * clamp(hu * 1.15, 0.0, 1.0));
        float fc = aG.x;
        vec3 sway = vec3(sin(uTime * 0.41 + fc * 1.7), 0.0, cos(uTime * 0.33 + fc * 2.3)) * 0.07 * (h / ${TALL.toFixed(2)});
        vec3 p = base + vec3(cos(a) * aG.y * taper, h, sin(a) * aG.y * taper) + sway;
        // the face: this column's gnats drawn onto the relief, each in its turn
        float f = 0.0;
        if (abs(fc - uFaceCol) < 0.5) f = smoothstep(aB.w * 0.45, aB.w * 0.45 + 0.55, uFace);
        vec3 fp = uFC + uFR * aF.x + uFU * aF.y + uFN * aF.z
          + vec3(sin(uTime * 7.0 + aG.w * 13.0), sin(uTime * 6.1 + aG.w * 7.0), cos(uTime * 5.3 + aG.w * 11.0)) * 0.0025;
        vec3 mid = mix(p, fp, 0.5) + vec3(cos(a), 0.3, sin(a)) * 0.25 * sin(f * 3.1416);
        p = f < 0.5 ? mix(p, mid, f * 2.0) : mix(mid, fp, f * 2.0 - 1.0);
        vec3 transformed = p;
        vec4 mvPosition = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float depth = max(0.3, -mvPosition.z), px = uH / 720.0;
        // 4 px at 6 m, never under 2.4 px; a formed face's gnats a little finer, so the relief is not a blot
        float s = clamp(24.0 / depth, 2.4, 4.0) * mix(1.0, 0.55, f);
        gl_PointSize = s * px;
        vA = mix(1.0, 0.95, f);
        vLit = f * aF.w;
        // the sun in view space, to light each gnat as a tiny sphere
        vSun = (viewMatrix * vec4(uSun, 0.0)).xyz * (1.0 - f);
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSunCol; uniform float uFlicker;
      varying float vLit, vA; varying vec3 vSun;
      #include <fog_pars_fragment>
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float r = length(q) * 2.0;
        if (r > 1.0) discard;
        // a tiny sphere: its sun side glints warm, the rest dark
        vec3 nrm = vec3(q.x * 2.0, -q.y * 2.0, sqrt(max(0.0, 1.0 - r * r)));
        float lit = max(0.0, dot(nrm, vSun));
        vec3 col = vec3(0.012, 0.009, 0.007) + uSunCol * 0.5 * lit * uFlicker;
        // held in the face: a faint pale light, cold, strongest on the brows and the nose
        col = mix(col, vec3(0.42, 0.43, 0.47), vLit * 0.8);
        gl_FragColor = vec4(col, vA * (1.0 - smoothstep(0.8, 1.0, r)));
        #include <fog_fragment>
      }`,
    transparent: true, depthWrite: false, fog: true,
  });
  Object.assign(mat.uniforms, U); // merge() clones: share the live ones
  mat.customProgramCacheKey = () => 'small-simulacrum';
  const points = new THREE.Points(geo, mat);
  points.name = 'small-simulacrum'; points.castShadow = false; points.receiveShadow = false; points.renderOrder = 7;
  points.onBeforeRender = (r) => { U.uH.value = r.domElement.height; };
  scene.add(points);

  // ---- the face's state
  const st = { phase: 'columns', u: 0, lowT: 0, col: -1, pinned: null, forms: 0, flicker: 1 };
  const fwd = new THREE.Vector3(), c3 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), d3 = new THREE.Vector3();
  const halfFov = THREE.MathUtils.degToRad(camera.fov * 0.5);
  function pick() {
    camera.getWorldDirection(fwd);
    const cosV = Math.cos(halfFov * 0.9);
    let best = -1, bd = Infinity;
    for (let c = 0; c < cols.length; c++) {
      c3.set(cols[c].x, cols[c].ground + FACE_Y, cols[c].z).sub(camera.position);
      const d = c3.length(); if (d < 0.5) continue;
      if (c3.dot(fwd) / d < cosV) continue;                       // not in view
      const dw = hyp(cols[c].x - player.pos.x, cols[c].z - player.pos.z);
      if (dw < bd) { bd = dw; best = c; }
    }
    return best;
  }
  function orient() {
    if (st.col < 0) return;
    const c = cols[st.col];
    U.uFC.value.set(c.x, c.ground + FACE_Y, c.z);
    d3.copy(camera.position).sub(U.uFC.value).normalize();      // the face's normal on the walker
    U.uFN.value.copy(d3);
    U.uFR.value.crossVectors(up, d3).normalize();
    U.uFU.value.crossVectors(d3, U.uFR.value).normalize();
  }
  function update(dt, t) {
    U.uTime.value = t;
    const fl = ctx.sky?.flicker?.value ?? 1;
    U.uFlicker.value = fl; st.flicker = fl;
    if (st.pinned != null) { if (st.col < 0) st.col = pick() >= 0 ? pick() : 0; U.uFaceCol.value = st.col; st.u = st.pinned; U.uFace.value = st.u; orient(); return; }
    st.lowT = fl < LOW_FLICK ? st.lowT + dt : 0;
    if (!faceOn) return;
    if (st.phase === 'columns') {
      if (st.lowT >= LOW_FOR) { const c = pick(); if (c >= 0) { st.col = c; st.phase = 'forming'; st.forms++; } }
    } else if (st.phase === 'forming' || st.phase === 'held') {
      if (fl > BACK) st.phase = 'unravel';
      else { st.u = Math.min(1, st.u + dt / FORM); if (st.u >= 1) st.phase = 'held'; }
    } else if (st.phase === 'unravel') {
      st.u = Math.max(0, st.u - dt / UNRAVEL);
      if (st.u <= 0) { st.phase = 'columns'; st.col = -1; }
    }
    U.uFace.value = st.u; U.uFaceCol.value = st.col;
    orient();
  }
  return {
    points, update, cols, N, per,
    // test and render hook: face(s) pins the face at s (0..1) on the column nearest in view; face(null) lets it go
    face(s) { if (s == null) { st.pinned = null; st.u = 0; st.phase = 'columns'; st.col = -1; U.uFace.value = 0; U.uFaceCol.value = -1; } else { st.pinned = +s; st.col = -1; } },
    state: () => ({ ...st }),
    facePos: () => U.uFC.value.clone(),
    tris: () => 0,
  };
}
