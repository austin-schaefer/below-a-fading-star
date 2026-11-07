// Omens: three small things in the sky, rare or quiet, none of them in your face.
// - The procession: every five or six minutes a file of nine dim lights crosses high over the
//   region in a dead straight line, slowly, and they wink out one by one before it reaches the
//   far side.
// - The shard belt: a thin arc of glinting fragments from the east round through the south, as if
//   a small moon broke there long ago. It is only there while the sun gutters.
// - The still star: one star in the north-north-east that moves, but only while nothing else
//   does. Stand still long enough and it begins to creep; take a step and it stops dead.
// Draw calls: procession and star (one Points), shard belt (one Points).
import * as THREE from 'three';
import { SKY_GLSL, withSky, dirFrom } from './common.js';

const PT_VS = /* glsl */`
  attribute vec3 aCol; attribute float aSize, aI, aSeed;
  uniform float uGlint, uT;
  varying vec3 vCol, vW; varying float vI;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vCol = aCol; vW = wp.xyz;
    // glints: each fragment flashes now and then as it turns (only the belt uses this)
    float g = pow(max(0.0, sin(uT * (0.4 + aSeed * 1.3) + aSeed * 61.0)), 12.0);
    vI = aI * (1.0 + uGlint * g * 2.5);
    gl_PointSize = aSize * (1.0 + uGlint * g * 0.6);
    gl_Position = projectionMatrix * viewMatrix * wp;
    if (vI <= 0.0005) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  }`;
const PT_FS = /* glsl */`
  ${SKY_GLSL}
  varying vec3 vCol, vW; varying float vI;
  void main() {
    vec3 d = normalize(vW - cameraPosition);
    vec2 q = gl_PointCoord - 0.5; float r2 = dot(q, q) * 4.0;
    float l = exp(-r2 * 9.0) * 1.3 + exp(-r2 * 2.5) * 0.12;
    gl_FragColor = vec4(vCol * l * vI * sl_trans(d, 0.06), 1.0);
  }`;

function pointsMesh(U, n, glint) {
  const g = new THREE.BufferGeometry();
  const a = {
    position: new THREE.BufferAttribute(new Float32Array(n * 3), 3),
    aCol: new THREE.BufferAttribute(new Float32Array(n * 3), 3),
    aSize: new THREE.BufferAttribute(new Float32Array(n), 1),
    aI: new THREE.BufferAttribute(new Float32Array(n), 1),
    aSeed: new THREE.BufferAttribute(new Float32Array(n), 1),
  };
  for (const k in a) g.setAttribute(k, a[k]);
  const m = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: withSky(U, { uGlint: { value: glint } }), vertexShader: PT_VS, fragmentShader: PT_FS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }));
  m.frustumCulled = false;
  return { m, a };
}

export function buildOmens(ctx, group, U, rng) {
  const pr = ctx.renderer.getPixelRatio();
  const smooth = THREE.MathUtils.smoothstep;
  const up = new THREE.Vector3(0, 1, 0);

  // ---------- procession (0..8) and the still star (9), one draw
  const NP = 9, R = 2000;
  const PS = pointsMesh(U, NP + 1, 0);
  PS.m.name = 'skylife-omens'; PS.m.renderOrder = 6;
  group.add(PS.m);
  const pc = new THREE.Color('#f2d8ae');
  for (let i = 0; i < NP; i++) {
    PS.a.aCol.setXYZ(i, pc.r * 0.85, pc.g * 0.85, pc.b * 0.85);
    PS.a.aSize.setX(i, (i === 0 ? 5.6 : 4.6) * pr);
    PS.a.aSeed.setX(i, rng());
  }
  const sc = new THREE.Color('#dfe6ff');
  PS.a.aCol.setXYZ(NP, sc.r, sc.g, sc.b); PS.a.aSize.setX(NP, 4.0 * pr); PS.a.aSeed.setX(NP, 0.5);

  const pro = { t0: -1e6, dur: 150, next: 100 + rng() * 80, a: new THREE.Vector3(), axis: new THREE.Vector3(), angle: 2, gap: 1.1 * Math.PI / 180, out: new Float32Array(NP) };
  const pv = new THREE.Vector3(), pb = new THREE.Vector3();
  function startProcession(t, mid = null) {
    // a straight line across the high sky: a great circle between two low points, peaking 40-65 deg up
    const b0 = rng() * 360, peak = 40 + rng() * 25;
    if (mid) {
      const h = pb.crossVectors(mid, up).normalize();
      pro.axis.crossVectors(mid, h).normalize().negate();
      pro.angle = 120 * Math.PI / 180;
      pro.a.copy(mid).applyAxisAngle(pro.axis, -pro.angle / 2);
      pro.t0 = t - pro.dur * 0.45;
    } else {
      const top = dirFrom(b0, peak, pv);
      const h = pb.crossVectors(top, up).normalize(); // horizontal, along the line at its top
      pro.axis.crossVectors(top, h).normalize();
      pro.angle = 130 * Math.PI / 180;
      pro.a.copy(top).applyAxisAngle(pro.axis, -pro.angle / 2);
      pro.t0 = t;
    }
    // the order they go out in, and when: from a third of the way over, one by one
    const order = [...Array(NP).keys()].sort(() => rng() - 0.5);
    order.forEach((k, j) => { pro.out[k] = 0.32 + j * 0.065 + rng() * 0.03; });
  }
  function updateProcession(dt, t) {
    pro.next -= dt;
    if (pro.next <= 0) { startProcession(t); pro.next = 290 + rng() * 130; }
    const f = (t - pro.t0) / pro.dur;
    for (let i = 0; i < NP; i++) {
      const fi = f - i * pro.gap / pro.angle; // they follow the leader along the line
      let I = 0;
      if (f >= 0 && f <= 1.2 && fi >= 0 && fi <= 1) {
        I = smooth(fi, 0, 0.05) * (1 - smooth(f, pro.out[i], pro.out[i] + 0.006));
        I *= 0.8 + 0.2 * Math.sin(t * 1.1 + i * 1.7);
        pv.copy(pro.a).applyAxisAngle(pro.axis, pro.angle * fi).multiplyScalar(R);
        PS.a.position.setXYZ(i, pv.x, pv.y, pv.z);
      }
      PS.a.aI.setX(i, I * 1.5);
    }
  }

  // the still star
  const star = { dir: dirFrom(22, 47).clone(), home: dirFrom(22, 47).clone(), heading: rng() * Math.PI * 2, still: 0, moved: 0, last: new THREE.Vector3().copy(ctx.camera.position) };
  const sx = new THREE.Vector3(), sy = new THREE.Vector3();
  function updateStar(dt, t) {
    const p = ctx.player?.pos || ctx.camera.position;
    const moving = p.distanceToSquared(star.last) > 0.0004 || ctx.player?.moving;
    star.last.copy(p);
    star.still = moving ? 0 : star.still + dt;
    // it creeps only once you have been still a while, faster the longer you wait
    const v = smooth(star.still, 14, 30) * 0.07 * Math.PI / 180; // rad/s
    if (v > 0) {
      star.heading += (rng() - 0.5) * dt * 0.6;
      // a leash: past 25 deg from home it bends back
      sx.crossVectors(star.dir, up).normalize(); sy.crossVectors(sx, star.dir);
      if (star.dir.angleTo(star.home) > 25 * Math.PI / 180) {
        const back = pb.copy(star.home).sub(star.dir);
        star.heading = Math.atan2(back.dot(sy), back.dot(sx));
      }
      star.dir.addScaledVector(sx, Math.cos(star.heading) * v * dt).addScaledVector(sy, Math.sin(star.heading) * v * dt).normalize();
      star.moved += v * dt;
    }
    pv.copy(star.dir).multiplyScalar(2300);
    PS.a.position.setXYZ(NP, pv.x, pv.y, pv.z);
    PS.a.aI.setX(NP, 1.0 + 0.15 * Math.sin(t * 2.3) * Math.sin(t * 0.7));
  }

  // ---------- the shard belt: only while the sun gutters
  const NB = ctx.quality === 'high' ? 1100 : 480, RB = 2150;
  const BS = pointsMesh(U, NB, 1);
  BS.m.name = 'skylife-shards'; BS.m.renderOrder = 5;
  group.add(BS.m);
  // a great circle through the east horizon and the high south, arcing down toward the south-west
  const A = dirFrom(78, 2), Bm = dirFrom(150, 38);
  const bAxis = new THREE.Vector3().crossVectors(A, Bm).normalize();
  const span = 150 * Math.PI / 180;
  const bc = new THREE.Color('#d6dbe8'), bc2 = new THREE.Color('#b0a090'), tc = new THREE.Color();
  const beltI = new Float32Array(NB);
  for (let i = 0; i < NB; i++) {
    // denser toward the middle of the arc, thicker in a few clumps
    const u = rng();
    const along = (u - 0.04) * span;
    pv.copy(A).applyAxisAngle(bAxis, along);
    const g1 = (rng() + rng() + rng() - 1.5) * 0.9;
    const clump = 0.6 + 0.8 * Math.pow(Math.max(0, Math.sin(along * 5.3 + 1.1)), 4);
    pv.addScaledVector(bAxis, g1 * 0.012 * clump).normalize();
    if (pv.y < 0.0) pv.y = 0.002;
    BS.a.position.setXYZ(i, pv.x * RB, pv.y * RB, pv.z * RB);
    tc.copy(bc).lerp(bc2, rng());
    BS.a.aCol.setXYZ(i, tc.r, tc.g, tc.b);
    const big = i === 7 ? 7.5 : 2.0 + Math.pow(rng(), 5) * 3.0;
    BS.a.aSize.setX(i, big * pr);
    BS.a.aSeed.setX(i, rng());
    beltI[i] = (i === 7 ? 1.2 : 0.45 + Math.pow(rng(), 3) * 1.1) * smooth(u, 0.02, 0.12) * (1 - smooth(u, 0.85, 1));
  }
  const beltDir = pv.copy(A).applyAxisAngle(bAxis, span * 0.45).clone();
  let beltShown = 0;
  function updateBelt(dt) {
    const gut = THREE.MathUtils.clamp((0.86 - U.uFlicker.value) / 0.5, 0, 1);
    const target = gut * gut;
    beltShown += (target - beltShown) * Math.min(1, dt * (target > beltShown ? 3 : 0.7));
    BS.m.visible = beltShown > 0.003;
    if (!BS.m.visible) return;
    const ia = BS.a.aI.array;
    for (let i = 0; i < NB; i++) ia[i] = beltI[i] * beltShown;
    BS.a.aI.needsUpdate = true;
  }

  BS.a.position.needsUpdate = true; BS.a.aCol.needsUpdate = true; BS.a.aSize.needsUpdate = true; BS.a.aSeed.needsUpdate = true;
  PS.a.aCol.needsUpdate = true; PS.a.aSize.needsUpdate = true; PS.a.aSeed.needsUpdate = true;

  function update(dt, t) {
    updateProcession(dt, t);
    updateStar(dt, t);
    PS.a.position.needsUpdate = true; PS.a.aI.needsUpdate = true;
    updateBelt(dt);
  }

  const api = {
    procession: pro, star, startProcession,
    dirs: {
      procession: () => { const f = Math.max(0, ((ctx.skylife?.uniforms.uT.value ?? 0) - pro.t0) / pro.dur); return pv.copy(pro.a).applyAxisAngle(pro.axis, pro.angle * Math.min(1, f)).clone(); },
      star: () => star.dir.clone(), shards: () => beltDir.clone(),
    },
    tris: 0, points: NP + 1 + NB,
  };
  return { update, api };
}
