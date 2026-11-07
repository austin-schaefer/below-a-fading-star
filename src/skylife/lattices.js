// Lattices: the old works hanging in the high air. Each is a grid of straight struts meeting at
// right angles (cells knocked out, struts snapped), with square spiderwebs of finer line strung
// across some panels. All struts of all lattices are one instanced box draw; all webbing is one
// LineSegments draw. Each lattice turns about its own axis over minutes, through a uniform
// matrix array, so the CPU writes five matrices a frame and nothing else. Faces lit by the low
// sun go copper; one strut in eight is still polished and glints; when the sun gutters the
// struts carry a faint crawling glow, as if they had drunk its light and give it back.
import * as THREE from 'three';
import { SKY_GLSL, withSky, dirFrom } from './common.js';

const MAXS = 5;

const STRUT_VS = /* glsl */`
  #define MAXS ${MAXS}
  attribute vec3 iA, iB;
  attribute vec4 iMeta;   // structure index, thickness (m), seed, polished
  uniform mat4 uM[MAXS];
  varying vec3 vN, vW; varying float vSeed, vAlong, vPolish;
  void main() {
    mat4 M = uM[int(iMeta.x + 0.5)];
    vec3 ax = iB - iA; float len = length(ax); vec3 z = ax / len;
    vec3 ref = abs(z.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 x = normalize(cross(ref, z)), y = cross(z, x);
    vec3 lp = iA + z * (position.z + 0.5) * len + (x * position.x + y * position.y) * iMeta.y;
    vec4 wp = modelMatrix * (M * vec4(lp, 1.0));
    vN = mat3(M) * (x * normal.x + y * normal.y + z * normal.z);
    vW = wp.xyz; vSeed = iMeta.z; vAlong = (position.z + 0.5) * len + dot(iA, vec3(0.7, 0.9, 1.1)); vPolish = iMeta.w;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const STRUT_FS = /* glsl */`
  ${SKY_GLSL}
  uniform vec3 uBase, uAmb, uGlow;
  varying vec3 vN, vW; varying float vSeed, vAlong, vPolish;
  void main() {
    vec3 d = normalize(vW - cameraPosition);
    vec3 n = normalize(vN);
    float diff = max(dot(n, uSunDir), 0.0);
    vec3 col = uBase * (uAmb + uSunLight * diff * 1.7 * uFlicker);
    vec3 r = reflect(d, n);
    float rs = max(dot(r, uSunDir), 0.0);
    col += uSunLight * (pow(rs, 900.0) * 9.0 * vPolish + pow(rs, 40.0) * 0.04) * uFlicker;
    float gut = clamp((0.88 - uFlicker) / 0.5, 0.0, 1.0);
    float crawl = 0.5 + 0.5 * sin(vAlong * 0.09 - uT * 2.6 + vSeed * 6.283);
    col += uGlow * gut * (0.25 + 0.75 * crawl * crawl);
    gl_FragColor = vec4(sl_air(col, d, 0.085), 1.0);
  }`;
const WEB_VS = /* glsl */`
  #define MAXS ${MAXS}
  attribute vec2 aMeta;   // structure index, seed
  uniform mat4 uM[MAXS];
  varying vec3 vW; varying float vSeed;
  void main() {
    mat4 M = uM[int(aMeta.x + 0.5)];
    vec4 wp = modelMatrix * (M * vec4(position, 1.0));
    vW = wp.xyz; vSeed = aMeta.y;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const WEB_FS = /* glsl */`
  ${SKY_GLSL}
  uniform vec3 uBase, uAmb, uGlow;
  varying vec3 vW; varying float vSeed;
  void main() {
    vec3 d = normalize(vW - cameraPosition);
    vec3 col = uBase * (uAmb + uSunLight * 0.5 * uFlicker);
    // a strand now and then catches the light, like dew
    float tick = floor(uT * 0.7 + vSeed * 13.0);
    float glint = step(0.985, sl_hash12(vec2(vSeed * 97.0, tick)));
    col += uSunLight * glint * 0.5 * uFlicker;
    float gut = clamp((0.88 - uFlicker) / 0.5, 0.0, 1.0);
    col += uGlow * gut * 0.6;
    gl_FragColor = vec4(sl_air(col, d, 0.085), 0.5 + glint * 0.4);
  }`;

// One lattice's struts and webs in its own frame (metres, centred on the origin).
function makeLattice(rng, spec, sIndex, struts, webs, quality) {
  const { nx, ny, nz, cell, keep, pBreak, pWeb, thick } = spec;
  const [cx, cy, cz] = cell;
  const ox = -nx * cx / 2, oy = -ny * cy / 2, oz = -nz * cz / 2;
  const P = (i, j, k) => [ox + i * cx, oy + j * cy, oz + k * cz];
  const present = (i, j, k) => i >= 0 && j >= 0 && k >= 0 && i < nx && j < ny && k < nz && keep(i, j, k);
  const edges = new Map();
  const nodes = [];
  // count the present cells round each edge; boundary edges (fewer cells) are the heavy frame
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
    if (!present(i, j, k)) continue;
    for (let a = 0; a < 3; a++) for (let u = 0; u < 2; u++) for (let v = 0; v < 2; v++) {
      const n = [i, j, k];
      const o1 = (a + 1) % 3, o2 = (a + 2) % 3;
      n[o1] += u; n[o2] += v;
      const key = `${a}:${n[0]},${n[1]},${n[2]}`;
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  }
  const protect = spec.protect || (() => false);
  for (const [key, count] of edges) {
    const [a, rest] = key.split(':'); const n = rest.split(',').map(Number); const ax = +a;
    const m = n.slice(); m[ax] += 1;
    const A = P(n[0], n[1], n[2]), B = P(m[0], m[1], m[2]);
    const isProt = protect(ax, n);
    if (!isProt && rng() < pBreak) {
      // snapped: half the time gone, otherwise a stub hanging from one end
      if (rng() < 0.5) continue;
      const f = 0.25 + rng() * 0.5;
      if (rng() < 0.5) { for (let c = 0; c < 3; c++) B[c] = A[c] + (B[c] - A[c]) * f; }
      else { for (let c = 0; c < 3; c++) A[c] = B[c] + (A[c] - B[c]) * f; }
    }
    const heavy = count <= (nz > 1 && ny > 1 && nx > 1 ? 2 : 1);
    struts.push(A, B, [sIndex, (heavy ? thick[0] : thick[1]) * (0.85 + rng() * 0.3), rng(), rng() < 0.13 ? 1 : 0]);
    if (count >= 1 && rng() < 0.5) nodes.push(new THREE.Vector3(A[0], A[1], A[2]));
  }
  // spars: a few long struts running out past the frame, like broken booms
  for (let s = 0; s < (spec.spars || 0); s++) {
    const ax = (rng() * 3) | 0;
    const n = [(rng() * (nx + 1)) | 0, (rng() * (ny + 1)) | 0, (rng() * (nz + 1)) | 0];
    const out = rng() < 0.5 ? 0 : [nx, ny, nz][ax]; n[ax] = out;
    const A = P(n[0], n[1], n[2]); const B = A.slice();
    B[ax] += (out === 0 ? -1 : 1) * cell[ax] * (1.5 + rng() * 3);
    struts.push(A, B, [sIndex, thick[1], rng(), 1]);
  }
  // webbing on panels whose faces are open on at least one side
  const wq = quality === 'high' ? 1 : 0.6;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
    if (!present(i, j, k)) continue;
    for (let a = 0; a < 3; a++) for (const side of [0, 1]) {
      const nb = [i, j, k]; nb[a] += side ? 1 : -1;
      if (present(nb[0], nb[1], nb[2])) continue;
      if (spec.webAxis !== undefined && a !== spec.webAxis) continue;
      if (rng() > pWeb * wq) continue;
      const o = P(i, j, k); o[a] += side * cell[a];
      const u = (a + 1) % 3, v = (a + 2) % 3;
      web(rng, o, u, v, cell[u], cell[v], sIndex, webs, spec.rings || 3);
    }
  }
  return nodes;
}

// A square spiderweb in the panel at corner o spanning axes u,v.
function web(rng, o, u, v, su, sv, sIndex, out, rings) {
  const jx = (rng() - 0.5) * 0.16, jy = (rng() - 0.5) * 0.16;
  const at = (fu, fv) => { const p = o.slice(); p[u] += fu * su; p[v] += fv * sv; return p; };
  const cu = 0.5 + jx, cv = 0.5 + jy;
  const seg = (a, b) => { if (rng() < 0.22) return; out.push(a, b, [sIndex, rng()]); };
  const C = at(cu, cv);
  // radials: to the corners and the midpoints of the sides
  for (const [fu, fv] of [[0, 0], [1, 0], [1, 1], [0, 1], [0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]]) seg(C, at(fu, fv));
  // concentric squares (the right-angled spiral)
  for (let r = 1; r <= rings; r++) {
    const h = (r / (rings + 0.6)) * 0.5;
    const hu = Math.min(h, cu, 1 - cu), hv = Math.min(h, cv, 1 - cv);
    const c = [at(cu - hu, cv - hv), at(cu + hu, cv - hv), at(cu + hu, cv + hv), at(cu - hu, cv + hv)];
    for (let e = 0; e < 4; e++) seg(c[e], c[(e + 1) % 4]);
  }
}

export function buildLattices(ctx, group, U, rng, skyline) {
  const high = ctx.quality === 'high';
  // The lattices. A: the great one low over the eastern mountains. The rest higher and smaller.
  const aElev = skyline(92) + 13;
  const specs = [
    { name: 'great', bearing: 92, elev: aElev, R: 2150, nx: 10, ny: 5, nz: 1, cell: [50, 50, 30], thick: [6.5, 4.2], pBreak: 0.1, pWeb: 0.55, rings: 2, spars: 3, webAxis: 2,
      keep: (i, j) => j === 4 || !((i === 6 && j < 2) || (i === 7 && j === 0) || (i === 1 && j === 1) || (i === 3 && j === 2)),
      protect: (ax, n) => ax === 0 && n[1] === 5 && n[2] === 1, spin: [0.004, 0.0012], tilt: 0.12 },
    { name: 'cube', bearing: 318, elev: 50, R: 2250, nx: 3, ny: 3, nz: 3, cell: [36, 36, 36], thick: [5, 3.6], pBreak: 0.12, pWeb: 0.35, rings: 2, spars: 2,
      keep: (i, j, k) => !(i === 1 && j === 1) && !(i === 2 && j === 2 && k === 0), spin: [0.013, 0.006], tilt: 0.6 },
    { name: 'spar', bearing: 198, elev: 29, R: 2150, nx: 12, ny: 1, nz: 1, cell: [26, 26, 26], thick: [4.5, 3.5], pBreak: 0.08, pWeb: 0.5, rings: 2, spars: 2,
      keep: (i) => i !== 8, spin: [0.009, 0.002], tilt: 0.9 },
    { name: 'cross', bearing: 34, elev: 21, R: 2350, nx: 5, ny: 5, nz: 1, cell: [32, 32, 20], thick: [5, 3.6], pBreak: 0.14, pWeb: 0.45, rings: 2, spars: 1, webAxis: 2,
      keep: (i, j) => i === 2 || j === 2 || (i === 3 && j === 1), spin: [0.006, 0.0025], tilt: 0.35 },
    { name: 'mote', bearing: 247, elev: 36, R: 2250, nx: 4, ny: 3, nz: 1, cell: [24, 24, 24], thick: [4, 3.4], pBreak: 0.1, pWeb: 0.6, rings: 2, spars: 1, webAxis: 2,
      keep: () => true, spin: [0.011, 0.004], tilt: 0.5 },
  ].slice(0, high ? 5 : 4);

  const struts = [], webs = [], info = [];
  specs.forEach((s, i) => {
    const nodes = makeLattice(rng, s, i, struts, webs, ctx.quality);
    const dir = dirFrom(s.bearing, s.elev);
    // face the viewer, leaning a little, then spin about a lean axis over minutes
    const q0 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().negate());
    const lean = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(), s.tilt * (0.5 + rng()));
    q0.multiply(lean);
    const axis = new THREE.Vector3(0, 0, 1).applyQuaternion(lean).normalize().lerp(new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5), s.tilt * 0.4).normalize();
    info.push({ ...s, dir, pos: dir.clone().multiplyScalar(s.R), q0, axis, phase: rng() * Math.PI * 2, nodes, M: new THREE.Matrix4(), q: new THREE.Quaternion(), qs: new THREE.Quaternion() });
  });

  // struts: one instanced box
  const box = new THREE.BoxGeometry(1, 1, 1);
  const sg = new THREE.InstancedBufferGeometry();
  sg.index = box.index; sg.setAttribute('position', box.attributes.position); sg.setAttribute('normal', box.attributes.normal);
  const nS = struts.length / 3;
  const iA = new Float32Array(nS * 3), iB = new Float32Array(nS * 3), iM = new Float32Array(nS * 4);
  for (let k = 0; k < nS; k++) {
    iA.set(struts[k * 3], k * 3); iB.set(struts[k * 3 + 1], k * 3); iM.set(struts[k * 3 + 2], k * 4);
  }
  sg.setAttribute('iA', new THREE.InstancedBufferAttribute(iA, 3));
  sg.setAttribute('iB', new THREE.InstancedBufferAttribute(iB, 3));
  sg.setAttribute('iMeta', new THREE.InstancedBufferAttribute(iM, 4));
  sg.instanceCount = nS;
  const uM = { value: [] }; for (let i = 0; i < MAXS; i++) uM.value.push(new THREE.Matrix4());
  const own = {
    uM,
    uBase: { value: new THREE.Color('#2a2224') },
    uAmb: { value: new THREE.Color('#2e2a4a').multiplyScalar(0.5) },
    uGlow: { value: new THREE.Color('#ff6a2a').multiplyScalar(0.06) },
  };
  const smat = new THREE.ShaderMaterial({ uniforms: withSky(U, own), vertexShader: STRUT_VS, fragmentShader: STRUT_FS, fog: false });
  const strutMesh = new THREE.Mesh(sg, smat);
  strutMesh.frustumCulled = false; strutMesh.name = 'skylife-lattice'; strutMesh.renderOrder = 1;
  group.add(strutMesh);

  // webbing: one LineSegments
  const nW = webs.length / 3;
  const wp = new Float32Array(nW * 6), wm = new Float32Array(nW * 4);
  for (let k = 0; k < nW; k++) {
    wp.set(webs[k * 3], k * 6); wp.set(webs[k * 3 + 1], k * 6 + 3);
    const m = webs[k * 3 + 2]; wm.set(m, k * 4); wm.set(m, k * 4 + 2);
  }
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.BufferAttribute(wp, 3));
  wg.setAttribute('aMeta', new THREE.BufferAttribute(wm, 2));
  const wmat = new THREE.ShaderMaterial({
    uniforms: withSky(U, { uM, uBase: { value: new THREE.Color('#3a3034') }, uAmb: own.uAmb, uGlow: { value: new THREE.Color('#ff7a3a').multiplyScalar(0.035) } }),
    vertexShader: WEB_VS, fragmentShader: WEB_FS, transparent: true, depthWrite: false, fog: false,
  });
  const webMesh = new THREE.LineSegments(wg, wmat);
  webMesh.frustumCulled = false; webMesh.name = 'skylife-webbing'; webMesh.renderOrder = 2;
  group.add(webMesh);

  const one = new THREE.Vector3(1, 1, 1);
  function update(dt, t) {
    for (let i = 0; i < info.length; i++) {
      const L = info[i];
      const a = L.phase + t * L.spin[0];
      L.qs.setFromAxisAngle(L.axis, a);
      L.q.copy(L.qs).multiply(L.q0);
      L.M.compose(L.pos, L.q, one);
      uM.value[i].copy(L.M);
    }
  }
  update(0, 0);
  return { update, info, strutMesh, webMesh, struts: nS, webs: nW, tris: nS * 12 };
}
