// v18-F4: moths at the glass. At the Florilegium a thick slow cloud of big moths (hand-sized, an eye on each hindwing)
// beats against the coloured panes, each bumping out and back off the glass and sliding over it; their pale wings take
// the colour of the pane behind them as they cross it, lit through it. A few lie on the plinth, wings flat, one now and
// then twitching.
//
// One draw: an InstancedBufferGeometry of one moth (a body and two wings, 26 triangles), every moth's place, beat and
// flap worked out in the vertex shader from its seed and the clock: no work a frame but one uniform. No light. The
// glass is the Florilegium's own (GLASS: its twelve walls' apothem, sill and eave over its floor, from florilegium/
// house.js and plan.js), `paneColour` its panes' colours; hidden past 200 m with the house. The study page alone draws
// a stand-in of the glass (`standin`).
import * as THREE from 'three';
import { GLASSHOUSE, FLORILEGIUM } from './plan.js';
import { N, A, SILL, EAVE, PANES, SCHEME_A, SCHEME_B } from './florilegium/house.js';
import { hyp } from '../noise.js';

// the panes' colours, as the Florilegium's glass has them (florilegium/house.js): twelve sides, each with its two schemes
// of the eight colours, the lower scheme giving way to the upper with height, a quarry in seven its own
export const PANE_GLSL = /* glsl */`
  const vec3 FL_PANES[8] = vec3[8](${PANES.map((c) => `vec3(${c.join(', ')})`).join(', ')});
  const int FL_A[12] = int[12](${SCHEME_A.join(', ')});
  const int FL_B[12] = int[12](${SCHEME_B.join(', ')});
  vec3 paneColour(float th, float y) {
    int side = int(mod(floor(th / ${(Math.PI * 2 / N).toFixed(6)} + 0.5), ${N}.0));
    float h = fract(sin(floor(th * 9.0) * 12.9898 + floor(y / 0.33) * 78.233) * 43758.5453);
    float up = smoothstep(0.6, 6.6, y + (h - 0.5) * 3.2);
    int ci = h < 0.15 ? int(h * 53.0) : (fract(h * 7.31) < up ? FL_B[side] : FL_A[side]);
    return FL_PANES[ci];
  }
`;
// the real glass (FLORILEGIUM in plan.js, the house's own numbers): the walls' apothem, sill and eave over the floor
export const GLASS = { x: GLASSHOUSE.x, z: GLASSHOUSE.z, floor: FLORILEGIUM.floor, r: A, n: N, y0: SILL, y1: EAVE };

function mothTemplate() {
  const P = [], S = [], UV = [], I = [];
  const v = (x, y, side, u, w) => { P.push(x, y, 0); S.push(side); UV.push(u, w); return S.length - 1; };
  // the wings: a fan from the body for each side (span along x, the body along y, head at +y)
  const rim = [[0.01, 0.032], [0.05, 0.04], [0.08, 0.03], [0.083, 0.004], [0.066, -0.026], [0.042, -0.047], [0.012, -0.03]];
  for (const sg of [-1, 1]) {
    const c = v(0.003 * sg, 0, sg, 0, 0);
    const r = rim.map(([x, y]) => v(x * sg, y, sg, x / 0.083, y / 0.047));
    for (let k = 0; k < r.length - 1; k++) if (sg > 0) I.push(c, r[k + 1], r[k]); else I.push(c, r[k], r[k + 1]);
  }
  // the body: a furred lozenge, not flapping (side 0; u -1 marks it dark)
  const b = [v(0, 0.042, 0, -1, 1), v(0.009, 0.008, 0, -1, 0), v(0, -0.04, 0, -1, -1), v(-0.009, 0.008, 0, -1, 0)];
  I.push(b[0], b[1], b[2], b[0], b[2], b[3]);
  return { P, S, UV, I };
}

export function buildMoths(ctx, { glass = GLASS, standin = false } = {}) {
  const { scene, terrain, camera } = ctx;
  const rng = ctx.makeRng(18049);
  const low = ctx.quality === 'low';
  const nGlass = low ? 90 : 180, nLie = low ? 6 : 9, n = nGlass + nLie;
  const T = mothTemplate();
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(T.P, 3));
  geo.setAttribute('aSide', new THREE.Float32BufferAttribute(T.S, 1));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(T.UV, 2));
  geo.setIndex(T.I);
  const seed = new Float32Array(n * 4), mode = new Float32Array(n);
  for (let i = 0; i < n; i++) { for (let k = 0; k < 4; k++) seed[i * 4 + k] = rng(); mode[i] = i < nGlass ? 0 : 1; }
  // the cloud is thickest on the side toward the door (east, +x) and low, where a visitor stands to look in
  for (let i = 0; i < nGlass; i++) { const a = seed[i * 4]; seed[i * 4] = (a < 0.55 ? (a / 0.55 - 0.5) * 0.45 : a); }
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
  geo.setAttribute('aMode', new THREE.InstancedBufferAttribute(mode, 1));
  geo.instanceCount = n;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, (glass.y0 + glass.y1) / 2, 0), glass.r + 5);

  const uTime = { value: 0 };
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uR: { value: glass.r }, uN: { value: glass.n || 0 }, uY0: { value: glass.y0 }, uY1: { value: glass.y1 } }]),
    vertexShader: /* glsl */`
      uniform float uTime, uR, uN, uY0, uY1;
      // the wall's distance at bearing th (a regular polygon of uN sides, its walls' normals at k * 2pi / uN; a circle at 0)
      float wallR(float th) { if (uN < 0.5) return uR; float h = 3.14159265 / uN; return uR / cos(mod(th + h, 2.0 * h) - h); }
      float wallA(float th) { if (uN < 0.5) return th; float s = 6.2831853 / uN; return floor(th / s + 0.5) * s; }
      attribute float aSide; attribute vec4 aSeed; attribute float aMode;
      varying vec2 vUv; varying vec3 vPane; varying float vLit;
      ${PANE_GLSL}
      #include <fog_pars_vertex>
      void main() {
        float t = uTime;
        float sc = 1.1 + aSeed.w * 0.55;
        vec3 P, N, Hd; float flap;
        if (aMode < 0.5) {
          float th = aSeed.x * 6.2831853 + 0.07 * sin(t * 0.11 + aSeed.y * 20.0) + t * 0.012 * (aSeed.z - 0.5);
          float y = mix(uY0 + 0.25, uY1 - 0.3, pow(aSeed.y, 1.4)) + 0.3 * sin(t * (0.23 + aSeed.w * 0.3) + aSeed.x * 30.0);
          float ph = t * (1.1 + aSeed.z * 1.3) + aSeed.w * 40.0;
          float out1 = pow(abs(sin(ph)), 0.55) * (0.55 + 0.45 * sin(t * 0.37 + aSeed.x * 9.0));
          float d = 0.035 + 0.42 * out1;
          float wa = wallA(th);
          N = vec3(cos(wa), 0.0, sin(wa));
          P = vec3(cos(th), 0.0, sin(th)) * wallR(th) + N * d + vec3(0.0, y, 0.0);
          vec3 T = vec3(-sin(wa), 0.0, cos(wa));
          float psi = (aSeed.z - 0.5) * 1.8 + 0.35 * sin(t * 0.6 + aSeed.x * 11.0);
          Hd = cos(psi) * vec3(0.0, 1.0, 0.0) + sin(psi) * T;
          // beating hard while off the glass, flatter as it presses on it
          flap = 0.2 + (0.4 + 0.8 * out1) * (0.5 + 0.5 * sin(t * (15.0 + aSeed.w * 7.0) + aSeed.x * 50.0));
          vPane = paneColour(th, y);
          vLit = 1.0 - 0.6 * out1;
        } else {
          float th = aSeed.x * 6.2831853;
          N = vec3(0.0, 1.0, 0.0);
          P = vec3(cos(th), 0.0, sin(th)) * (wallR(th) + 0.1 + aSeed.y * 0.22) + vec3(0.0, uY0 + 0.012, 0.0);
          float ya = aSeed.z * 6.2831853;
          Hd = vec3(cos(ya), 0.0, sin(ya));
          float tw = step(0.93, fract(t * 0.07 + aSeed.w)) * abs(sin(t * 18.0));
          flap = 0.04 + 0.7 * tw;
          vPane = paneColour(th, uY0 + 0.2);
          vLit = 0.35;
        }
        vec3 S = normalize(cross(Hd, N));
        float sp = abs(position.x) * sc, sg = sign(position.x);
        vec3 transformed = P + S * (sp * cos(flap) * sg) + N * (sp * sin(flap)) + Hd * (position.y * sc);
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      varying vec2 vUv; varying vec3 vPane; varying float vLit;
      #include <fog_pars_fragment>
      void main() {
        vec3 bone = vec3(0.80, 0.74, 0.62);
        vec3 col;
        if (vUv.x < -0.5) col = vec3(0.10, 0.08, 0.07);       // the body
        else {
          float u = vUv.x, v = vUv.y;
          col = bone;
          col *= 0.82 + 0.18 * smoothstep(0.1, 0.0, abs(u - 0.62 + 0.15 * v)); // a pale band across
          col *= 1.0 - 0.35 * smoothstep(0.85, 1.0, u);                      // a darker hem
          col *= 0.85 + 0.15 * sin(u * 40.0 + v * 6.0);                       // veins
          // the eye on the hindwing: a dark ring, a pale ring, a dark pupil, a glint
          float r = length(vec2((u - 0.52) / 0.2, (v + 0.5) / 0.32));
          col = mix(col, vec3(0.08, 0.05, 0.04), smoothstep(1.05, 0.95, r));
          col = mix(col, vec3(0.92, 0.86, 0.66), smoothstep(0.78, 0.7, r));
          col = mix(col, vec3(0.05, 0.03, 0.03), smoothstep(0.45, 0.38, r));
          col = mix(col, vec3(1.0), smoothstep(0.16, 0.08, length(vec2(u - 0.49, (v + 0.44) * 0.6) / 0.2)));
          // lit through the pane behind: the wing takes its colour
          col = col * (0.12 + 0.8 * mix(vec3(1.0), vPane, 0.8) * vLit) + vPane * 0.12 * vLit;
        }
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }`,
    fog: true, side: THREE.DoubleSide,
  });
  mat.uniforms.uTime = uTime;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'v18-moths';
  const gy = glass.floor ?? terrain.heightAt(glass.x, glass.z);
  mesh.position.set(glass.x, gy, glass.z);
  mesh.updateMatrixWorld();
  scene.add(mesh);

  let pane = null;
  if (standin) {
    const rc = glass.n ? glass.r / Math.cos(Math.PI / glass.n) : glass.r;
    const cg = new THREE.CylinderGeometry(rc, rc, glass.y1 - glass.y0, glass.n || 48, 6, true);
    if (glass.n) cg.rotateY(Math.PI / 2 - Math.PI / glass.n);
    cg.translate(0, (glass.y0 + glass.y1) / 2, 0);
    const pm = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]),
      vertexShader: `varying vec3 vP;\n#include <fog_pars_vertex>\nvoid main(){ vec3 transformed = position; vP = position; vec4 mvPosition = modelViewMatrix * vec4(transformed,1.0); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}`,
      fragmentShader: `varying vec3 vP;\n${PANE_GLSL}\n#include <fog_pars_fragment>\nvoid main(){ float th = atan(vP.z, vP.x); if (th < 0.0) th += 6.2831853; vec3 c = paneColour(th, vP.y); vec2 g = abs(fract(vec2(th / 6.2831853 * 18.0, vP.y / 1.15)) - 0.5); float lead = smoothstep(0.47, 0.5, max(g.x, g.y)); gl_FragColor = vec4(mix(c * 0.55, vec3(0.03), lead), 1.0);\n#include <fog_fragment>\n}`,
      fog: true, side: THREE.DoubleSide,
    });
    pane = new THREE.Mesh(cg, pm);
    pane.name = 'v18-moth-panes-standin';
    pane.position.copy(mesh.position);
    scene.add(pane);
  }

  let t = 0;
  ctx.registerUpdate((dt) => {
    t += dt; uTime.value = t;
    mesh.visible = hyp(camera.position.x - glass.x, camera.position.z - glass.z) < 200; // the house's own cull (florilegium.js)
  }, { at: () => glass, near: 210, hz: 0 });
  return { mesh, pane, n, uTime };
}

// The study page: the cloud at a stand-in pane ring, small (r 1.6) so the cell can hold it.
export const study = [{
  id: 'glass-moths', name: 'moths at the glass', kind: 'creature', h: 4.5, at: [GLASSHOUSE.x, GLASSHOUSE.z],
  build(ctx) {
    const M = buildMoths(ctx, { glass: { x: 0, z: 0, floor: 0, r: A, n: N, y0: SILL, y1: EAVE }, standin: true });
    M.mesh.rotation.y = M.pane.rotation.y = -0.87; // the cloud's thick side (east) to the cell's camera
    return { at: (o) => o.set(0, 0, 0), h: 4.5 };
  },
}];
