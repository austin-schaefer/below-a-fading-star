// v2 flora: A, the Heliotrope Sward [Proposed]. Pale nodding flowers like snowdrops on the keep hill's
// west flank, every head turned to the sun and straining toward it. When the sun gutters they shut
// together, in a wave from the sun's side, with a dry rustle, and reopen slowly once the light is back.
// Stand among them and the nearest turn from the sun to you, and whimper.
//
// One instanced mesh (one draw call). The flower is built in the vertex shader from parameters
// (stem curve, nodding head, three tepals that fold), so turning and closing need no new geometry.
// Per-instance state is a set of event times in an instanced attribute (closeAt, openAt, turnAt,
// turnTarget), written only when something happens: once per gutter for the whole sward, and for the
// few flowers round the player at 10 Hz. The shader turns the times into smooth motion.
// Exposes ctx.sward = { centre, open, turned, count }. Audio cues: 'sward-close', 'sward-open' (at the
// centre), 'sward-whimper' (at the nearest turned flower).
import * as THREE from 'three';
import { clamp, smoothstep, GLSL_WIND, unflipNormals } from '../vegetation/util.js';

const CLOSE_D = 0.6;   // seconds for one flower to shut
const WAVE = 0.9;      // seconds for the closing wave to cross the sward
const TURN_IN = 1.0, TURN_OUT = 2.6;
const NEAR = 3.0, FAR = 3.6; // turn toward the player inside NEAR, back to the sun beyond FAR

// ---------- geometry: parameters only, the shader places every vertex ----------
// aP = (part, s, w, k): part 0 stem, 1 ovary, 2 outer tepal, 3 inner tepal, 4 leaf.
function flowerGeo() {
  const P = [], C = [], I = [];
  const v = (part, s, w, k, c) => { P.push(part, s, w, k); C.push(c[0], c[1], c[2]); return P.length / 4 - 1; };
  const stemC = [0.30, 0.37, 0.27], ovC = [0.34, 0.45, 0.30], leafC = [0.31, 0.40, 0.35];
  const bone = [0.90, 0.88, 0.81], mark = [0.70, 0.77, 0.70], innerTip = [0.46, 0.58, 0.48];
  // stem: 3-sided, 4 segments
  const SS = 4, rings = [];
  for (let i = 0; i <= SS; i++) { const r = []; for (let j = 0; j < 3; j++) r.push(v(0, i / SS, j, 0, stemC)); rings.push(r); }
  for (let i = 0; i < SS; i++) for (let j = 0; j < 3; j++) { const j1 = (j + 1) % 3; I.push(rings[i][j], rings[i + 1][j], rings[i + 1][j1], rings[i][j], rings[i + 1][j1], rings[i][j1]); }
  // ovary: a short 3-sided knob between pedicel and tepals
  const o0 = [0, 1, 2].map((j) => v(1, 0, j, 0, ovC)), o1 = [0, 1, 2].map((j) => v(1, 1, j, 0, ovC));
  for (let j = 0; j < 3; j++) { const j1 = (j + 1) % 3; I.push(o0[j], o1[j], o1[j1], o0[j], o1[j1], o0[j1]); }
  // outer tepals: rows at s = 0, 1/3, 2/3 (three across) and a tip
  for (let k = 0; k < 3; k++) {
    const rows = [0, 1 / 3, 2 / 3].map((s, ri) => [-1, 0, 1].map((w) => v(2, s, w, k, ri === 2 && w === 0 ? mark : bone)));
    const tip = v(2, 1, 0, k, bone);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
      const a = rows[r][c], b = rows[r][c + 1], d = rows[r + 1][c], e = rows[r + 1][c + 1];
      I.push(a, d, e, a, e, b);
    }
    I.push(rows[2][0], tip, rows[2][1], rows[2][1], tip, rows[2][2]);
  }
  // inner tepals: one quad each, green-grey at the notched tip
  for (let k = 0; k < 3; k++) {
    const a = v(3, 0, -1, k, bone), b = v(3, 0, 1, k, bone), c = v(3, 1, -1, k, innerTip), d = v(3, 1, 1, k, innerTip);
    I.push(a, c, d, a, d, b);
  }
  // two strap leaves at the foot
  for (let k = 0; k < 2; k++) {
    const a = v(4, 0, -1, k, leafC), b = v(4, 0, 1, k, leafC), c = v(4, 0.5, -1, k, leafC), d = v(4, 0.5, 1, k, leafC), e = v(4, 1, 0, k, leafC);
    I.push(a, c, d, a, d, b, c, e, d);
  }
  const g = new THREE.InstancedBufferGeometry();
  const n = P.length / 4;
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aP', new THREE.Float32BufferAttribute(P, 4));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setIndex(I);
  return g;
}

// ---------- material ----------
function swardMaterial(u) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec4 aP; attribute vec4 iPos; attribute vec4 iPrm; attribute vec4 iState;
        uniform float uTime, uWave; uniform vec2 uSunH; uniform vec3 uSun, uPlayer;
        varying vec3 vFlW; varying float vFlT;
        ${GLSL_WIND}
        vec3 flBez(vec3 a, vec3 b, vec3 c, vec3 d, float s) { float r = 1.0 - s; return r*r*r*a + 3.0*r*r*s*b + 3.0*r*s*s*c + s*s*s*d; }
        vec3 flBezD(vec3 a, vec3 b, vec3 c, vec3 d, float s) { float r = 1.0 - s; return 3.0*r*r*(b - a) + 6.0*r*s*(c - b) + 3.0*s*s*(d - c); }`)
      .replace('#include <beginnormal_vertex>', `
        // ---- state from event times ----
        float flRnd = iPrm.y;
        float flC = clamp((uTime - iState.x) / ${CLOSE_D.toFixed(2)}, 0.0, 1.0);
        float flR = iState.y > iState.x ? clamp((uTime - iState.y) / iPrm.w, 0.0, 1.0) : 0.0;
        float flOpen = smoothstep(0.0, 1.0, 1.0 - flC * (1.0 - flR));
        float flTl = iState.w > 0.5 ? clamp((uTime - iState.z) / ${TURN_IN.toFixed(2)}, 0.0, 1.0) : 1.0 - clamp((uTime - iState.z) / ${TURN_OUT.toFixed(2)}, 0.0, 1.0);
        float flTurn = smoothstep(0.0, 1.0, flTl);
        // straining: a slow lean further toward the sun, each on its own breath
        float flStrain = (0.5 + 0.5 * sin(uTime * 0.23 + flRnd * 6.283)) * flOpen * (1.0 - flTurn);
        // ---- facing: the sun (with a little scatter), or the player ----
        float flAs = atan(uSunH.y, uSunH.x) + iPrm.x;
        vec2 flTp = uPlayer.xz - iPos.xz;
        float flAp = atan(flTp.y, flTp.x + 1e-5);
        float flDa = mod(flAp - flAs + 3.14159265, 6.2831853) - 3.14159265;
        float flA = flAs + flDa * flTurn;
        vec3 flF = vec3(cos(flA), 0.0, sin(flA)), flW = vec3(-flF.z, 0.0, flF.x);
        // ---- stem: a cubic curve with a crook at the top so the head nods ----
        float flH = iPos.w;
        vec2 flWv = fpWind(iPos.xz + flRnd * 5.0, uTime);
        vec3 flSway = vec3(flWv.x, 0.0, flWv.y) * 0.22 * flH + flW * 0.003 * sin(uTime * 11.0 + flRnd * 40.0);
        vec3 flB0 = vec3(0.0);
        vec3 flB1 = vec3(0.0, 0.55 * flH, 0.0) + flF * 0.02 * flH;
        vec3 flB2 = vec3(0.0, 1.06 * flH, 0.0) + flF * (0.06 * flH + 0.025 * flStrain);
        vec3 flB3 = vec3(0.0, flH * 0.93 - 0.022 * (1.0 - flOpen) + 0.014 * flTurn, 0.0) + flF * (0.07 * flH + 0.022 + 0.02 * flStrain);
        flB1 += flSway * 0.3; flB2 += flSway * 0.9; flB3 += flSway;
        vec3 flHinge = iPos.xyz + flB3;
        // ---- head axis: the mouth faces the sun, nodding; or looks up at the player; drops when shut ----
        vec3 flAsun = normalize(vec3(uSun.x, 0.0, uSun.z) * (0.62 + 0.18 * flStrain) + vec3(0.0, -0.78 + 0.16 * flStrain, 0.0));
        vec3 flApl = normalize(normalize(uPlayer - flHinge) + vec3(0.0, -0.3, 0.0));
        vec3 flAx = normalize(mix(flAsun, flApl, flTurn));
        flAx = normalize(flAx + vec3(0.0, -1.1, 0.0) * (1.0 - flOpen) * (1.0 - 0.5 * flTurn));
        vec3 flX = normalize(flW - flAx * dot(flW, flAx)), flY = cross(flAx, flX);
        float flL = 0.034 * iPrm.z; // outer tepal length
        // ---- place this vertex ----
        float part = aP.x, s = aP.y, w = aP.z, k = aP.w;
        vec3 flPos, flN; vFlT = 0.0;
        if (part < 0.5) {            // stem
          vec3 c = flBez(flB0, flB1, flB2, flB3, s), t = normalize(flBezD(flB0, flB1, flB2, flB3, s) + vec3(0.0, 1e-4, 0.0));
          vec3 n2 = normalize(cross(t, flW));
          float th = w * 2.0944; flN = flW * cos(th) + n2 * sin(th);
          flPos = iPos.xyz + c + flN * 0.0028 * (1.0 - 0.35 * s);
          vFlT = 0.25;
        } else if (part < 1.5) {     // ovary
          float th = w * 2.0944; flN = flX * cos(th) + flY * sin(th);
          flPos = flHinge + flAx * (s * 0.009) + flN * mix(0.0022, 0.0036, s);
          vFlT = 0.2;
        } else if (part < 3.5) {     // tepals
          bool outer = part < 2.5;
          float ph = k * 2.0944 + flRnd * 0.6 + (outer ? 0.0 : 1.0472);
          vec3 R = flX * cos(ph) + flY * sin(ph), Ct = -flX * sin(ph) + flY * cos(ph);
          float al = outer ? mix(0.08, 0.74, flOpen) + 0.07 * sin(k * 1.7 + flRnd * 9.0) * flOpen : mix(0.05, 0.2, flOpen);
          vec3 D = flAx * cos(al) + R * sin(al), Nt = R * cos(al) - flAx * sin(al);
          vec3 base = flHinge + flAx * 0.0085;
          if (outer) {
            float wd = flL * 0.46 * max(sin(3.14159 * pow(s, 0.62)), 0.14);
            flPos = base + D * (s * flL) + Ct * (w * wd) + Nt * (-0.4 * wd * w * w + flL * 0.14 * s * s * flOpen);
            flN = normalize(Nt - Ct * w * 0.5);
            vFlT = 1.0;
          } else {
            float li = flL * 0.46, wd = li * mix(0.32, 0.5, s);
            flPos = base + D * (s * li) + Ct * (w * wd) + Nt * (-0.3 * wd * w * w);
            flN = Nt; vFlT = 0.6;
          }
        } else {                     // leaf
          float la = flRnd * 6.283 + k * 2.7;
          vec3 dl = vec3(cos(la), 0.0, sin(la)), wl = vec3(-dl.z, 0.0, dl.x);
          float len = flH * (0.6 + 0.25 * k);
          float wd = 0.008 * (1.0 - s * s);
          flPos = iPos.xyz + dl * (len * 0.55 * s) + vec3(0.0, len * (0.95 * s - 0.5 * s * s), 0.0) + wl * (w * wd) + flSway * 0.25 * s * s;
          flN = normalize(vec3(0.0, 1.0, 0.0) - dl * (0.95 - s));
          vFlT = 0.3;
        }
        vFlW = flPos;
        vec3 objectNormal = flN;`)
      .replace('#include <begin_vertex>', 'vec3 transformed = flPos;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uSun, uSunCol; varying vec3 vFlW; varying float vFlT;`)
      .replace('#include <opaque_fragment>', `
        {
          // the low sun shines through the thin tepals and catches their edges: a rim of ember when backlit
          vec3 flV = normalize(vFlW - cameraPosition);
          float flBack = pow(max(dot(flV, uSun), 0.0), 3.0);
          float flRim = pow(1.0 - abs(dot(normalize(normal), -flV)), 2.0);
          outgoingLight += uSunCol * diffuseColor.rgb * vFlT * (0.06 + flBack * (0.9 + 1.6 * flRim));
          // pale in the gloom, as snowdrops are at dusk
          outgoingLight += diffuseColor.rgb * vFlT * 0.09;
        }
        #include <opaque_fragment>`);
    unflipNormals(shader);
  };
  mat.customProgramCacheKey = () => 'fp-flora-sward';
  return mat;
}

export async function build(ctx) {
  const t0 = performance.now();
  const { terrain, landmarks: L } = ctx;
  const S = L.sward;
  const R = S.r;
  const high = ctx.quality === 'high';
  const N = high ? 1150 : 450;
  const rng = ctx.makeRng(5101);
  const sunH = new THREE.Vector2(ctx.sun.dir.x, ctx.sun.dir.z).normalize();

  // ---- placement: clumps in drifts that thin toward the edges ----
  const keepOut = (x, z) => {
    if (terrain.causewayDistance(x, z) < 5.5) return true;
    if (terrain.slopeAt(x, z) > 0.55) return true;
    if (terrain.waterDepthAt(x, z) > -0.15) return true;
    const c = L.castle; if ((x - c.x) ** 2 + (z - c.z) ** 2 < 33 * 33) return true; // the keep's keep-out (as vegetation's)
    return false;
  };
  // a handful of dense drifts (snowdrop-carpet density at the heart, thinning to the rim), each made of
  // tight clumps, on ground that faces the sun; and a scatter of strays between them
  const xs = [], zs = [];
  const nrm = new THREE.Vector3();
  const drifts = [];
  for (let tries = 0; tries < 400 && drifts.length < (high ? 9 : 7); tries++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * R * 0.78;
    const x = S.x + Math.cos(a) * r, z = S.z + Math.sin(a) * r;
    if (keepOut(x, z)) continue;
    terrain.normalAt(x, z, nrm);
    if (nrm.x * sunH.x + nrm.z * sunH.y < 0.02) continue; // must face the sun
    if (drifts.some((d) => Math.hypot(d.x - x, d.z - z) < d.a + 5)) continue;
    if (L.tarn && Math.hypot(x - L.tarn.x, z - L.tarn.z) < L.tarn.r + 10) continue; // up the slope, not in the shore reeds
    const ar = 2.2 + rng() * 3.0;
    drifts.push({ x, z, a: ar, b: ar * (0.5 + rng() * 0.4), th: rng() * Math.PI, w: ar * ar });
  }
  const wSum = drifts.reduce((s, d) => s + d.w, 0) || 1;
  const nStray = Math.floor(N * 0.14);
  const clump = (cx, cz, k) => {
    for (let j = 0; j < k && xs.length < N; j++) {
      const b = rng() * Math.PI * 2, q = j ? 0.03 + Math.sqrt(rng()) * 0.22 : 0;
      const x = cx + Math.cos(b) * q, z = cz + Math.sin(b) * q;
      if (keepOut(x, z)) continue;
      xs.push(x); zs.push(z);
    }
  };
  for (const d of drifts) {
    const target = xs.length + Math.round(((N - nStray) * d.w) / wSum);
    const c = Math.cos(d.th), sn = Math.sin(d.th);
    for (let tries = 0; tries < 4000 && xs.length < Math.min(target, N - nStray); tries++) {
      const a = rng() * Math.PI * 2, r = Math.pow(rng(), 0.75); // denser toward the heart
      const u = Math.cos(a) * r * d.a, v = Math.sin(a) * r * d.b;
      clump(d.x + u * c - v * sn, d.z + u * sn + v * c, 2 + Math.floor(rng() * (2 + 6 * (1 - r))));
    }
  }
  for (let tries = 0; tries < 20000 && xs.length < N; tries++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * R;
    if (rng() > 1 - smoothstep(0.3 * R, R, r)) continue;
    const x = S.x + Math.cos(a) * r, z = S.z + Math.sin(a) * r;
    if (keepOut(x, z)) continue;
    clump(x, z, 1 + Math.floor(rng() * 3));
  }
  const n = xs.length;

  // spatial grid (1.5 m cells); instances are written in cell order so neighbours share index ranges
  const CELL = 1.5, GX0 = S.x - R - 1, GZ0 = S.z - R - 1, GN = Math.ceil((2 * R + 2) / CELL);
  const cellOf = (x, z) => clamp(Math.floor((z - GZ0) / CELL), 0, GN - 1) * GN + clamp(Math.floor((x - GX0) / CELL), 0, GN - 1);
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => cellOf(xs[a], zs[a]) - cellOf(xs[b], zs[b]));
  const cellStart = new Int32Array(GN * GN + 1);
  for (let i = 0; i < n; i++) cellStart[cellOf(xs[i], zs[i]) + 1]++;
  for (let c = 0; c < GN * GN; c++) cellStart[c + 1] += cellStart[c];

  const pos = new Float32Array(n * 4), prm = new Float32Array(n * 4), state = new Float32Array(n * 4);
  const delay = new Float32Array(n);
  for (let o = 0; o < n; o++) {
    const i = idx[o], x = xs[i], z = zs[i];
    pos[o * 4] = x; pos[o * 4 + 1] = terrain.heightAt(x, z) - 0.02; pos[o * 4 + 2] = z;
    pos[o * 4 + 3] = 0.25 + rng() * 0.15; // stem height 25-40 cm
    prm[o * 4] = (rng() - 0.5) * 0.4;      // yaw scatter from the sun
    prm[o * 4 + 1] = rng();                // seed
    prm[o * 4 + 2] = 0.9 + rng() * 0.35;   // head size
    prm[o * 4 + 3] = 7.5 + rng() * 3.5;    // reopening time (s)
    // the wave starts nearest the sun's side
    const d = ((x - S.x) * sunH.x + (z - S.z) * sunH.y) / R;
    delay[o] = clamp((1 - d) * 0.5, 0, 1) * WAVE + rng() * 0.06;
    state[o * 4] = 1e9; state[o * 4 + 1] = -1e9; state[o * 4 + 2] = -1e9; state[o * 4 + 3] = 0;
  }
  // which instance sits in which cell (CSR, in instance order)
  const cellItems = new Int32Array(n);
  { const fill = cellStart.slice(0, GN * GN); for (let o = 0; o < n; o++) cellItems[fill[cellOf(pos[o * 4], pos[o * 4 + 2])]++] = o; }

  // ---- mesh ----
  const geo = flowerGeo();
  geo.setAttribute('iPos', new THREE.InstancedBufferAttribute(pos, 4));
  geo.setAttribute('iPrm', new THREE.InstancedBufferAttribute(prm, 4));
  const aState = new THREE.InstancedBufferAttribute(state, 4).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('iState', aState);
  geo.instanceCount = n;
  const centre = new THREE.Vector3(S.x, terrain.heightAt(S.x, S.z), S.z);
  geo.boundingSphere = new THREE.Sphere(centre.clone(), R + 2);
  geo.boundingBox = new THREE.Box3().setFromCenterAndSize(centre, new THREE.Vector3(2 * R + 4, 30, 2 * R + 4));
  const sunCol = new THREE.Color();
  const u = {
    uTime: { value: 0 }, uSunH: { value: sunH }, uSun: { value: ctx.sun.vec }, uPlayer: { value: ctx.player.pos },
    uSunCol: { value: sunCol }, uWave: { value: 0 },
  };
  const mesh = new THREE.Mesh(geo, swardMaterial(u));
  mesh.name = 'flora-sward';
  mesh.receiveShadow = true; mesh.castShadow = false;
  ctx.scene.add(mesh);

  // ---- state, mirrored on the CPU (same formulas as the shader, linear) ----
  const openLin = (o, t) => {
    const c = clamp((t - state[o * 4]) / CLOSE_D, 0, 1);
    const r = state[o * 4 + 1] > state[o * 4] ? clamp((t - state[o * 4 + 1]) / prm[o * 4 + 3], 0, 1) : 0;
    return 1 - c * (1 - r);
  };
  const turnLin = (o, t) => state[o * 4 + 3] > 0.5 ? clamp((t - state[o * 4 + 2]) / TURN_IN, 0, 1) : 1 - clamp((t - state[o * 4 + 2]) / TURN_OUT, 0, 1);
  function closeAll(t) {
    for (let o = 0; o < n; o++) {
      const v = openLin(o, t);
      state[o * 4] = v > 0.999 ? t + delay[o] : t - (1 - v) * CLOSE_D; // carry on from wherever it was
      state[o * 4 + 1] = -1e9;
    }
    aState.clearUpdateRanges(); aState.needsUpdate = true;
  }
  function reopenAll(t) {
    for (let o = 0; o < n; o++) state[o * 4 + 1] = Math.max(t + delay[o] * 1.6, state[o * 4] + 1e-3);
    aState.clearUpdateRanges(); aState.needsUpdate = true;
  }

  // turned flowers round the player
  const turned = new Int32Array(n); let nTurned = 0;
  let dirtyLo = n, dirtyHi = -1;
  const mark = (o) => { if (o < dirtyLo) dirtyLo = o; if (o > dirtyHi) dirtyHi = o; };
  function turnTo(o, t, d) {
    const tv = turnLin(o, t);
    state[o * 4 + 2] = tv > 0.001 ? t - tv * TURN_IN : t + (d / NEAR) * 0.7; // nearest first
    state[o * 4 + 3] = 1; turned[nTurned++] = o; mark(o);
  }
  function turnBack(j, t) {
    const o = turned[j], tv = turnLin(o, t);
    state[o * 4 + 2] = t - (1 - tv) * TURN_OUT; state[o * 4 + 3] = 0; mark(o);
    turned[j] = turned[--nTurned];
  }

  // tools: jump every flower to the end of whatever it is doing (renders run at a few frames a second)
  const settle = () => {
    for (let o = 0; o < n; o++) for (let c = 0; c < 3; c++) if (Math.abs(state[o * 4 + c]) < 1e8) state[o * 4 + c] -= 100;
    aState.clearUpdateRanges(); aState.needsUpdate = true;
  };
  const sward = ctx.sward = { centre, open: 1, turned: 0, count: n, closed: false, positions: pos, drifts, settle }; // positions: x, y, z, stem height per flower (tools)
  const cue = (name, p) => ctx.audio?.cue?.(name, p);
  const whimperPos = new THREE.Vector3();
  const trng = ctx.makeRng(5102);
  let phase = 'open', lightT = 0, acc = 0, whimperT = 0, openAcc = 0;

  ctx.registerUpdate((dt, t) => {
    u.uTime.value = t;
    sunCol.copy(ctx.lights.sun.color).multiplyScalar(ctx.lights.sun.intensity);
    // gutter: shut together when the light drops; reopen once it has been back a moment
    const f = ctx.sky.flicker.value;
    if (phase === 'open' && f < 0.55) {
      phase = 'closed'; lightT = 0; closeAll(t); sward.closed = true; cue('sward-close', centre);
    } else if (phase === 'closed') {
      lightT = f > 0.8 ? lightT + dt : 0;
      if (lightT > 0.8) { phase = 'open'; reopenAll(t); sward.closed = false; cue('sward-open', centre); }
    }
    // the player: only near the sward, at 10 Hz
    acc += dt;
    if (acc >= 0.1) {
      acc = 0;
      const px = ctx.player.pos.x, pz = ctx.player.pos.z;
      for (let j = nTurned - 1; j >= 0; j--) {
        const o = turned[j];
        if (Math.hypot(pos[o * 4] - px, pos[o * 4 + 2] - pz) > FAR) turnBack(j, t);
      }
      if (Math.hypot(px - S.x, pz - S.z) < R + FAR + 1) {
        const c0 = clamp(Math.floor((px - NEAR - GX0) / CELL), 0, GN - 1), c1 = clamp(Math.floor((px + NEAR - GX0) / CELL), 0, GN - 1);
        const r0 = clamp(Math.floor((pz - NEAR - GZ0) / CELL), 0, GN - 1), r1 = clamp(Math.floor((pz + NEAR - GZ0) / CELL), 0, GN - 1);
        for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
          const c = rr * GN + cc;
          for (let q = cellStart[c]; q < cellStart[c + 1]; q++) {
            const o = cellItems[q];
            if (state[o * 4 + 3] > 0.5) continue;
            const d = Math.hypot(pos[o * 4] - px, pos[o * 4 + 2] - pz);
            if (d < NEAR) turnTo(o, t, d);
          }
        }
      }
      if (dirtyHi >= dirtyLo) {
        aState.clearUpdateRanges(); aState.addUpdateRange(dirtyLo * 4, (dirtyHi - dirtyLo + 1) * 4); aState.needsUpdate = true;
        dirtyLo = n; dirtyHi = -1;
      }
      // whimper on a quiet random timer while any are turned, at the nearest one
      if (nTurned > 0) {
        if (sward.turned === 0) whimperT = 1.2 + trng() * 1.5;
        whimperT -= 0.1;
        if (whimperT <= 0) {
          let best = -1, bd = Infinity;
          for (let j = 0; j < nTurned; j++) { const o = turned[j], d = Math.hypot(pos[o * 4] - px, pos[o * 4 + 2] - pz); if (d < bd) { bd = d; best = o; } }
          whimperPos.set(pos[best * 4], pos[best * 4 + 1] + pos[best * 4 + 3] * 0.9, pos[best * 4 + 2]);
          cue('sward-whimper', whimperPos);
          whimperT = 4 + trng() * 5;
        }
      }
      sward.turned = nTurned;
    }
    // a rough measure of how open the sward is, for tools and audio (4 Hz, a sample of 64)
    openAcc += dt;
    if (openAcc >= 0.25) {
      openAcc = 0; let s = 0;
      for (let j = 0; j < 64; j++) s += openLin(Math.floor((j * n) / 64), t);
      sward.open = s / 64;
    }
  });

  const tris = geo.index.count / 3;
  ctx.log(`flora2: sward ${n} flowers in ${drifts.length} drifts, ${tris} tris each (${n * tris} total), built in ${(performance.now() - t0).toFixed(0)}ms`);
}
