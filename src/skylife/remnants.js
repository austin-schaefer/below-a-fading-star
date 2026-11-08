// Remnants: the things still moving up there. A great four-winged flier crossing the sky on a
// long slow track every few minutes; a mechanical inchworm a city block long walking the top
// spar of the great lattice with a pause-lunge-pause gait and a dim lamp at its head; a derelict
// hull tumbling end over end, glinting when a facet finds the sun; a thread rising from beyond
// the glacier pass into the dark with a mote of light climbing it; and a lamp that goes from
// lattice to lattice, stops at each a while as if tending it, and moves on.
// Draw calls: flier, worm (instanced), hull, thread, lamps (points).
import * as THREE from 'three';
import { SKY_GLSL, withSky, dirFrom, Soup } from './common.js';
import { hyp } from '../noise.js';

const SOLID_VS = /* glsl */`
  #ifdef FLAP
    attribute float aWing;
    uniform vec2 uFlap;
  #endif
  varying vec3 vN, vW, vTint;
  void main() {
    vec3 p = position;
    #ifdef FLAP
      if (aWing > 0.5) {
        float th = aWing < 1.5 ? uFlap.x : uFlap.y;
        float s = sign(p.x), ax = abs(p.x);
        float tt = th * (1.0 + ax * 0.007);
        p.x = s * ax * cos(tt); p.y += ax * sin(tt);
      }
    #endif
    vec4 lp = vec4(p, 1.0); vec3 n = normal;
    #ifdef USE_INSTANCING
      lp = instanceMatrix * lp; n = mat3(instanceMatrix) * n;
    #endif
    vec4 wp = modelMatrix * lp;
    vN = mat3(modelMatrix) * n; vW = wp.xyz;
    #ifdef USE_INSTANCING_COLOR
      vTint = instanceColor;
    #else
      vTint = vec3(1.0);
    #endif
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const SOLID_FS = /* glsl */`
  ${SKY_GLSL}
  uniform vec3 uBase, uAmb; uniform float uPolish, uK;
  varying vec3 vN, vW, vTint;
  void main() {
    vec3 d = normalize(vW - cameraPosition);
    vec3 n = normalize(vN); if (dot(n, d) > 0.0) n = -n;
    float diff = max(dot(n, uSunDir), 0.0);
    vec3 col = uBase * vTint * (uAmb + uSunLight * diff * 1.6 * uFlicker);
    float rs = max(dot(reflect(d, n), uSunDir), 0.0);
    col += uSunLight * (pow(rs, 700.0) * 10.0 + pow(rs, 60.0) * 0.08) * uPolish * uFlicker;
    gl_FragColor = vec4(sl_air(col, d, uK), 1.0);
  }`;

function solidMaterial(U, base, { polish = 0, k = 0.08, flap = false, amb = 0.5 } = {}) {
  const own = {
    uBase: { value: new THREE.Color(base) }, uAmb: { value: new THREE.Color('#2e2a4a').multiplyScalar(amb) },
    uPolish: { value: polish }, uK: { value: k },
  };
  if (flap) own.uFlap = { value: new THREE.Vector2() };
  return new THREE.ShaderMaterial({
    uniforms: withSky(U, own), vertexShader: SOLID_VS, fragmentShader: SOLID_FS, fog: false,
    side: THREE.DoubleSide, defines: flap ? { FLAP: 1 } : {},
  });
}

// ---------------------------------------------------------------- the flier
function flierGeometry() {
  const S = new Soup();
  // body: a long spindle, a hooked head, a tail streamer (forward is +z, metres)
  const st = [[-30, 0.3], [-20, 0.9], [-10, 1.8], [-2, 2.6], [5, 2.4], [11, 1.4], [15, 1.2], [18, 1.6], [21, 0.3]];
  for (let i = 0; i < st.length - 1; i++) {
    const [z0, r0] = st[i], [z1, r1] = st[i + 1];
    for (let a = 0; a < 4; a++) {
      const a0 = (a / 4) * Math.PI * 2, a1 = ((a + 1) / 4) * Math.PI * 2;
      S.quad([Math.cos(a0) * r0, Math.sin(a0) * r0 * 0.7, z0], [Math.cos(a1) * r0, Math.sin(a1) * r0 * 0.7, z0],
        [Math.cos(a1) * r1, Math.sin(a1) * r1 * 0.7, z1], [Math.cos(a0) * r1, Math.sin(a0) * r1 * 0.7, z1], 0);
    }
  }
  // wings as fans from the root; fore pair large and fingered, hind pair smaller
  const fore = [[1.5, 6], [10, 10], [22, 9.5], [36, 4], [31, -1], [27, 2.5], [21, -4], [16, -0.5], [10, -6], [5, -3], [1.5, -2]];
  const hind = [[1.5, -6], [9, -6.5], [18, -9], [25, -15], [18, -15.5], [13, -13.5], [7, -18], [1.5, -13]];
  for (const [outline, id] of [[fore, 1], [hind, 2]]) {
    const cz = (outline[0][1] + outline[outline.length - 1][1]) / 2;
    for (const side of [1, -1]) {
      for (let i = 0; i < outline.length - 1; i++) {
        const a = outline[i], b = outline[i + 1];
        S.tri([1.5 * side, 0, cz], [a[0] * side, 0, a[1]], [b[0] * side, 0, b[1]], id);
      }
    }
  }
  return S.geometry('aWing');
}

// ---------------------------------------------------------------- the hull
// A wreck picked to its bones: a keel, open ribs like a ribcage, a few plates still hanging,
// a snapped prow spar. Faceted, so a plate flashes when the tumble brings it round to the sun.
function beam(S, a, b, w) {
  const ax = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(...ax); const z = ax.map((v) => v / l);
  const ref = Math.abs(z[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let x = [ref[1] * z[2] - ref[2] * z[1], ref[2] * z[0] - ref[0] * z[2], ref[0] * z[1] - ref[1] * z[0]];
  const xl = Math.hypot(...x); x = x.map((v) => (v / xl) * w);
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  const c = (p, sx, sy) => [p[0] + x[0] * sx + y[0] * sy, p[1] + x[1] * sx + y[1] * sy, p[2] + x[2] * sx + y[2] * sy];
  const k = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  for (let i = 0; i < 4; i++) {
    const [s0, t0] = k[i], [s1, t1] = k[(i + 1) % 4];
    S.quad(c(a, s0, t0), c(a, s1, t1), c(b, s1, t1), c(b, s0, t0));
  }
}
function hullGeometry(rng) {
  const S = new Soup();
  const NR = 12, LEN = 170;
  const ribPts = [];
  for (let k = 0; k < NR; k++) {
    const z = -LEN / 2 + 12 + k * (LEN - 24) / (NR - 1);
    const u = k / (NR - 1);
    const r = 5 + 13 * Math.pow(Math.sin(Math.PI * (0.12 + 0.8 * u)), 0.7);
    const pts = [];
    // an open C: from one gunwale down under the keel and up the other side, not closed over
    const n = 8, a0 = -0.15 * Math.PI, a1 = -0.85 * Math.PI - Math.PI * 0.3;
    for (let i = 0; i <= n; i++) {
      const an = a0 + (a1 - a0) * (i / n);
      pts.push([Math.cos(an) * r, Math.sin(an) * r * 0.85, z]);
    }
    // some ribs are snapped short
    const keep = rng() < 0.3 ? 3 + ((rng() * 4) | 0) : n;
    const start = rng() < 0.2 ? 2 : 0;
    for (let i = start; i < keep; i++) beam(S, pts[i], pts[i + 1], 0.9);
    ribPts.push(pts);
  }
  // keel and a stringer
  const keelIdx = 4;
  for (let k = 0; k < NR - 1; k++) beam(S, ribPts[k][keelIdx], ribPts[k + 1][keelIdx], 1.4);
  for (let k = 0; k < NR - 1; k++) if (rng() < 0.7) beam(S, ribPts[k][1], ribPts[k + 1][1], 0.7);
  // snapped prow spar and a stern post
  beam(S, ribPts[0][keelIdx], [0, -6, -LEN / 2 - 22], 1.2);
  beam(S, ribPts[NR - 1][keelIdx], [0, 8, LEN / 2 + 6], 1.0);
  // plates still hanging: mirror-flat, so they flash
  for (let k = 0; k < NR - 1; k++) for (let i = 1; i < 7; i++) {
    if (rng() > 0.2) continue;
    const a = ribPts[k][i], b = ribPts[k][i + 1], c = ribPts[k + 1][i + 1], d = ribPts[k + 1][i];
    S.quad(a, b, c, d);
  }
  return S.geometry();
}

// ---------------------------------------------------------------- thread and lamps
const THREAD_VS = /* glsl */`
  uniform vec3 uBase, uSide; uniform float uH0, uH1;
  varying float vF; varying vec3 vW;
  void main() {
    float f = position.y;
    vec3 P = uBase + vec3(0.0, mix(uH0, uH1, f), 0.0);
    P += uSide * position.x * length(P) * 0.0006;
    vec4 wp = modelMatrix * vec4(P, 1.0);
    vF = f; vW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const THREAD_FS = /* glsl */`
  ${SKY_GLSL}
  uniform vec3 uCol;
  varying float vF; varying vec3 vW;
  void main() {
    vec3 d = normalize(vW - cameraPosition);
    float a = smoothstep(0.02, 0.22, vF) * (1.0 - smoothstep(0.3, 0.95, vF));
    float run = 0.82 + 0.18 * sin(vF * 140.0 - uT * 0.9) * sin(vF * 23.0 + uT * 0.13);
    float lit = 0.75 + 0.25 * uFlicker;
    gl_FragColor = vec4(uCol * a * run * lit * sl_trans(d, 0.07), 1.0);
  }`;
const LAMP_VS = /* glsl */`
  attribute vec3 aCol; attribute float aSize, aI;
  varying vec3 vCol, vW; varying float vI;
  void main() {
    vec3 P = position - normalize(position) * 20.0; // a hair in front of whatever carries it
    vec4 wp = modelMatrix * vec4(P, 1.0);
    vCol = aCol; vI = aI; vW = wp.xyz;
    gl_PointSize = aSize;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const LAMP_FS = /* glsl */`
  ${SKY_GLSL}
  varying vec3 vCol, vW; varying float vI;
  void main() {
    vec3 d = normalize(vW - cameraPosition);
    vec2 q = gl_PointCoord - 0.5; float r2 = dot(q, q) * 4.0;
    float l = exp(-r2 * 14.0) * 1.6 + exp(-r2 * 3.5) * 0.18;
    gl_FragColor = vec4(vCol * l * vI * sl_trans(d, 0.07), 1.0);
  }`;

export function buildRemnants(ctx, group, U, rng, lat, skyline) {
  const cam = ctx.camera;
  const up = new THREE.Vector3(0, 1, 0);
  const smooth = THREE.MathUtils.smootherstep;

  // ---------- flier
  const flierMat = solidMaterial(U, '#0a080c', { flap: true, k: 0.075, amb: 0.25 });
  const flier = new THREE.Mesh(flierGeometry().scale(1.8, 1.8, 1.8), flierMat);
  flier.matrixAutoUpdate = false; flier.frustumCulled = false; flier.name = 'skylife-flier'; flier.renderOrder = 3;
  flier.visible = false;
  group.add(flier);
  const FR = 1900;
  const fl = { a: new THREE.Vector3(), axis: new THREE.Vector3(), angle: 2, t0: -1e6, dur: 80, next: 18 + rng() * 14, flapPh: 0, flapAmt: 1, toggle: 6, cried: false };
  const cryPos = new THREE.Vector3(), fPos = new THREE.Vector3(), fFwd = new THREE.Vector3(), fX = new THREE.Vector3(), fY = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), fm = new THREE.Matrix4();
  function startFlight(t, mid = null) {
    fl.dur = 75 + rng() * 30;
    fl.angle = (95 + rng() * 55) * Math.PI / 180;
    if (mid) {
      // centre the track on a given direction, crossing it left to right
      const h = fX.crossVectors(mid, up).normalize();
      fl.axis.crossVectors(mid, h).normalize().negate();
      fl.a.copy(mid).applyAxisAngle(fl.axis, -fl.angle / 2);
      fl.t0 = t - fl.dur * 0.5;
    } else {
      // low, and more often across the sun's side of the sky, where a silhouette shows
      const b0 = rng() < 0.6 ? 180 + rng() * 140 : rng() * 360;
      const b1 = b0 + (rng() < 0.5 ? 1 : -1) * (100 + rng() * 60);
      const e0 = Math.max(6, skyline(b0) + 3 + rng() * 6), e1 = Math.max(6, skyline(b1) + 3 + rng() * 6);
      const A = dirFrom(b0, e0, fl.a), B = dirFrom(b1, e1, fPos);
      fl.axis.crossVectors(A, B).normalize();
      fl.angle = A.angleTo(B);
      fl.t0 = t;
    }
    fl.cried = false;
  }
  function updateFlier(dt, t) {
    fl.next -= dt;
    if (fl.next <= 0) { startFlight(t); fl.next = 150 + rng() * 100; }
    const f = (t - fl.t0) / fl.dur;
    flier.visible = f >= 0 && f <= 1;
    if (!flier.visible) return;
    fPos.copy(fl.a).applyAxisAngle(fl.axis, fl.angle * f);
    fPos.y += 0.012 * Math.sin(t * 0.21 + 1.3);
    fPos.normalize();
    fFwd.crossVectors(fl.axis, fPos).normalize();
    fX.crossVectors(up, fFwd).normalize();
    fY.crossVectors(fFwd, fX);
    // a slow roll as it beats
    tmpQ.setFromAxisAngle(fFwd, 0.12 * Math.sin(fl.flapPh * 0.5));
    fm.makeBasis(fX.applyQuaternion(tmpQ), fY.applyQuaternion(tmpQ), fFwd);
    fm.setPosition(fPos.multiplyScalar(FR));
    flier.matrix.copy(fm); flier.matrixWorldNeedsUpdate = true;
    // four wings: the hind pair a quarter-beat behind the fore; beats in bouts, then a long glide
    fl.toggle -= dt;
    if (fl.toggle <= 0) { fl.flapAmt = fl.flapAmt > 0.5 ? 0 : 1; fl.toggle = fl.flapAmt ? 9 + rng() * 6 : 5 + rng() * 5; }
    fl.cur = (fl.cur ?? 1) + ((fl.flapAmt) - (fl.cur ?? 1)) * Math.min(1, dt * 0.8);
    fl.flapPh += dt * Math.PI * 2 / 3.2 * (0.4 + 0.6 * fl.cur);
    const glide = 0.1;
    flierMat.uniforms.uFlap.value.set(
      glide + fl.cur * 0.62 * Math.sin(fl.flapPh),
      glide * 0.6 + fl.cur * 0.5 * Math.sin(fl.flapPh - 1.7));
    if (!fl.cried && f > 0.45) { fl.cried = true; if (rng() < 0.35) ctx.audio?.cue?.('farcry', cryPos.copy(fPos).setLength(300).add(cam.position)); }
  }

  // ---------- worm on the great lattice
  const A = lat.info[0];
  const NSEG = 20, L = 175;
  const top = A.ny * A.cell[1] / 2, front = A.nz * A.cell[2] / 2;
  const x0 = -A.nx * A.cell[0] / 2 + 24, x1 = A.nx * A.cell[0] / 2 - 24;
  const box = new THREE.BoxGeometry(1, 1, 1);
  const wormMat = solidMaterial(U, '#2a201c', { polish: 0.6, k: 0.085, amb: 0.4 });
  const worm = new THREE.InstancedMesh(box, wormMat, NSEG + 2);
  worm.frustumCulled = false; worm.name = 'skylife-worm'; worm.renderOrder = 3;
  { const c = new THREE.Color(); for (let s = 0; s < NSEG + 2; s++) worm.setColorAt(s, c.setScalar(s >= NSEG ? 0.6 : s % 2 ? 0.55 : 1.25)); }
  group.add(worm);
  const W = { head: x0 + L, tail: x0, dirn: 1, phase: 0, pt: 0, d: L, pending: false };
  const GAIT = [3.6, 2.8, 2.4, 0.85]; // pause extended, draw up the tail, pause arched, lunge
  const DMIN = 0.34 * L;
  const lm = new THREE.Matrix4(), rm = new THREE.Matrix4(), headLocal = new THREE.Vector3(), headWorld = new THREE.Vector3();
  function wormShape(d) {
    // amplitude for a sine arch of span d whose length is L
    return (d / Math.PI) * Math.sqrt(Math.max(0, 4 * (L / d - 1))) * 0.8;
  }
  function updateWorm(dt) {
    // it stops dead while the sun gutters, and goes on when it returns
    const g = U.uFlicker.value;
    const go = g > 0.7 ? 1 : 0;
    W.pt += dt * go;
    let dur = GAIT[W.phase];
    while (W.pt >= dur) {
      W.pt -= dur; W.phase = (W.phase + 1) % 4; dur = GAIT[W.phase];
      if (W.phase === 3 && rng() < 0.3) ctx.audio?.cue?.('skycreak', cryPos.copy(headWorld).setLength(300).add(cam.position));
      if (W.phase === 0) {
        // at the end of the spar it turns: what was its tail leads
        const end = W.dirn > 0 ? x1 : x0;
        if ((end - W.head) * W.dirn < DMIN) { const h = W.head; W.head = W.tail; W.tail = h; W.dirn = -W.dirn; }
      }
    }
    const p = W.pt / dur;
    let d = L;
    if (W.phase === 1) { d = L - (L - DMIN) * smooth(p, 0, 1); }
    else if (W.phase === 2) d = DMIN;
    else if (W.phase === 3) { const e = 1 - Math.pow(1 - p, 3); d = DMIN + (L - DMIN) * e; }
    // the tail moves in phase 1; the head in phase 3
    if (W.phase === 1) W.tail = W.head - W.dirn * d;
    else W.head = W.tail + W.dirn * d;
    W.d = d;
    const amp = wormShape(d);
    const thick = 15;
    for (let s = 0; s < NSEG; s++) {
      const u0 = s / NSEG, u1 = (s + 1) / NSEG, um = (u0 + u1) / 2;
      const xa = W.tail + W.dirn * d * u0, xb = W.tail + W.dirn * d * u1;
      const ya = amp * Math.sin(Math.PI * u0), yb = amp * Math.sin(Math.PI * u1);
      const dx = xb - xa, dy = yb - ya, len = hyp(dx, dy) * (s % 2 ? 1.12 : 0.9);
      const ang = Math.atan2(dy, dx);
      const fat = s === NSEG - 1 ? 1.5 : (1 + 0.25 * Math.sin(um * Math.PI * 9)) * (s < 2 ? 1.2 : 1);
      rm.makeRotationZ(ang);
      lm.makeScale(len, thick * fat, thick * 0.9 * fat).premultiply(rm);
      lm.setPosition((xa + xb) / 2, top + 5 + thick * 0.5 + (ya + yb) / 2, front + 9);
      lm.premultiply(A.M);
      worm.setMatrixAt(s, lm);
      if (s === NSEG - 1) headLocal.set(xb + W.dirn * 6, top + 5 + thick * 0.6 + yb, front + 14);
    }
    // claspers where it grips the spar, fore and aft
    for (let c = 0; c < 2; c++) {
      const x = c ? W.head : W.tail;
      lm.makeScale(6, 12, 14).setPosition(x, top + 4, front + 9);
      lm.premultiply(A.M);
      worm.setMatrixAt(NSEG + c, lm);
    }
    worm.instanceMatrix.needsUpdate = true;
    headWorld.copy(headLocal).applyMatrix4(A.M);
  }

  // ---------- hull
  const hull = new THREE.Mesh(hullGeometry(rng), solidMaterial(U, '#3a302a', { polish: 1, k: 0.08, amb: 0.45 }));
  hull.name = 'skylife-hull'; hull.frustumCulled = false; hull.renderOrder = 3;
  const hullDir = dirFrom(132, 36);
  hull.position.copy(hullDir).multiplyScalar(1750);
  const hullAxis = new THREE.Vector3(0.35, 0.8, 0.5).normalize(), hullAxis2 = new THREE.Vector3(1, 0.1, -0.3).normalize();
  const hq0 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0.2, 1, 0.1).normalize(), rng() * 6), hq1 = new THREE.Quaternion();
  group.add(hull);
  function updateHull(t) {
    // end over end once in four minutes, with a slower wobble on another axis
    hull.quaternion.setFromAxisAngle(hullAxis, t * (Math.PI * 2 / 240));
    hq1.setFromAxisAngle(hullAxis2, 0.5 * Math.sin(t * 0.009));
    hull.quaternion.multiply(hq1).multiply(hq0);
  }

  // ---------- thread rising beyond the glacier pass
  const tb = dirFrom(8, 0); const threadBase = new THREE.Vector3(tb.x * 1250, 0, tb.z * 1250);
  const tside = new THREE.Vector3().crossVectors(up, tb).normalize();
  const tgeo = new THREE.BufferGeometry();
  { const pos = [], idx = []; const n = 40; for (let k = 0; k <= n; k++) pos.push(-1, k / n, 0, 1, k / n, 0); for (let k = 0; k < n; k++) { const a = k * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); } tgeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tgeo.setIndex(idx); }
  const H0 = -250, H1 = 2150;
  const thread = new THREE.Mesh(tgeo, new THREE.ShaderMaterial({
    uniforms: withSky(U, { uBase: { value: threadBase }, uSide: { value: tside }, uH0: { value: H0 }, uH1: { value: H1 }, uCol: { value: new THREE.Color('#ffe0b0').multiplyScalar(0.3) } }),
    vertexShader: THREAD_VS, fragmentShader: THREAD_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide,
  }));
  thread.frustumCulled = false; thread.name = 'skylife-thread'; thread.renderOrder = 2;
  group.add(thread);

  // ---------- lamps: worm head, the wanderer, the climber on the thread
  const NL = 3;
  const lpos = new Float32Array(NL * 3), lcol = new Float32Array(NL * 3), lsize = new Float32Array(NL), li = new Float32Array(NL);
  const lampCols = ['#ffc890', '#bfe4d8', '#ffe6b8'].map((h) => new THREE.Color(h));
  lampCols.forEach((c, i) => { lcol[i * 3] = c.r; lcol[i * 3 + 1] = c.g; lcol[i * 3 + 2] = c.b; });
  const lg = new THREE.BufferGeometry();
  const lpa = new THREE.BufferAttribute(lpos, 3).setUsage(THREE.DynamicDrawUsage), lia = new THREE.BufferAttribute(li, 1).setUsage(THREE.DynamicDrawUsage);
  lg.setAttribute('position', lpa); lg.setAttribute('aCol', new THREE.BufferAttribute(lcol, 3)); lg.setAttribute('aSize', new THREE.BufferAttribute(lsize, 1)); lg.setAttribute('aI', lia);
  const pr = ctx.renderer.getPixelRatio();
  lsize[0] = 11 * pr; lsize[1] = 13 * pr; lsize[2] = 9 * pr;
  const lamps = new THREE.Points(lg, new THREE.ShaderMaterial({
    uniforms: withSky(U, {}), vertexShader: LAMP_VS, fragmentShader: LAMP_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }));
  lamps.frustumCulled = false; lamps.name = 'skylife-lamps'; lamps.renderOrder = 6;
  group.add(lamps);

  // the wanderer: from a node of one lattice to a node of another, pausing at each
  const wan = { from: new THREE.Vector3(), cur: new THREE.Vector3(), L: 2, node: 0, mode: 1, t: 0, dur: 12, tgt: new THREE.Vector3() };
  const nodeWorld = (li2, ni, out) => out.copy(lat.info[li2].nodes[ni]).applyMatrix4(lat.info[li2].M);
  function pickNode() {
    let L2 = 1 + ((rng() * (lat.info.length - 1)) | 0);
    if (L2 === wan.L) L2 = 1 + ((L2) % (lat.info.length - 1));
    wan.L = L2; wan.node = (rng() * lat.info[L2].nodes.length) | 0;
  }
  pickNode(); nodeWorld(wan.L, wan.node, wan.cur);
  function updateWanderer(dt, t) {
    wan.t += dt;
    if (wan.mode === 1) {
      // tending: it sits on the node, brightening and dimming slowly
      nodeWorld(wan.L, wan.node, wan.cur);
      li[1] = 0.9 + 0.6 * Math.max(0, Math.sin(wan.t * 0.8));
      if (wan.t >= wan.dur) {
        wan.from.copy(wan.cur); pickNode();
        wan.mode = 0; wan.t = 0; wan.dur = 30 + rng() * 25;
      }
    } else {
      nodeWorld(wan.L, wan.node, wan.tgt);
      const e = smooth(wan.t / wan.dur, 0, 1);
      const r = THREE.MathUtils.lerp(wan.from.length(), wan.tgt.length(), e);
      wan.cur.lerpVectors(wan.from, wan.tgt, e).setLength(r);
      li[1] = 0.75;
      if (wan.t >= wan.dur) { wan.mode = 1; wan.t = 0; wan.dur = 9 + rng() * 10; }
    }
  }
  const climb = { f: 0.06 };

  function update(dt, t) {
    updateFlier(dt, t);
    updateWorm(dt);
    updateHull(t);
    updateWanderer(dt, t);
    const gut = THREE.MathUtils.clamp((0.88 - U.uFlicker.value) / 0.5, 0, 1);
    // worm head: a slow breath, and it flares while the sun gutters
    lpos[0] = headWorld.x; lpos[1] = headWorld.y; lpos[2] = headWorld.z;
    li[0] = (0.7 + 0.3 * Math.sin(t * 0.7)) * (1 + 1.6 * gut) * (W.phase === 3 ? 1.35 : 1);
    lpos[3] = wan.cur.x; lpos[4] = wan.cur.y; lpos[5] = wan.cur.z;
    // the climber: up the thread over five minutes, gone at the top, back at the bottom
    climb.f += dt / 300;
    if (climb.f > 0.62) climb.f = 0.04;
    const cy = THREE.MathUtils.lerp(H0, H1, climb.f);
    lpos[6] = threadBase.x; lpos[7] = cy; lpos[8] = threadBase.z;
    li[2] = 0.8 * THREE.MathUtils.smoothstep(climb.f, 0.04, 0.09) * (1 - THREE.MathUtils.smoothstep(climb.f, 0.5, 0.62));
    lpa.needsUpdate = true; lia.needsUpdate = true;
  }

  const api = {
    flier, worm, hull, thread, lamps, wormState: W, climb,
    startFlight, flierPos: () => fPos,
    dirs: {
      hull: () => hullDir, thread: () => tb.clone().setY(0.35).normalize(),
      worm: () => headWorld.clone().normalize(), lamp: () => wan.cur.clone().normalize(),
      flier: () => fPos.clone().normalize(),
    },
    tris: (flier.geometry.attributes.position.count + hull.geometry.attributes.position.count) / 3 + (NSEG + 2) * 12 + 80,
  };
  return { update, api };
}
