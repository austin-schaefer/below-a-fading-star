// CL The Accrescent (plans/IDEAS-v5.md CL; plans/wilderness-v5.md "### CL. The Accrescent"; ?accrescent=0).
// "A man walking south out of the Lattice at one step an hour, his trailing half grown through with glacial-blue crystal
// from heel to shoulder, his front half still flesh and robes. Each step leaves a glassy footprint that stays. Come close
// and he does not see you; his eyes are on the keep. Sound: a faint tinkle like ice in a glass at each step." Austin:
// "have him leave a distinct trail": the glassy footprints are plainly visible from a distance, a line you can follow
// back to the Lattice. He stands at SITES.accrescent facing the keep (LANDMARKS.castle), caught mid-stride. One step an
// hour: when the session clock reaches each whole 3600 s he takes one step over 20 s (the rear leg comes through, a new
// print grows in where the old front foot stood, 'accrescent-step'); the new prints stay for the session.
// Draws: the man (one mesh: robes, flesh, crystal; the legs and arms swing in the vertex shader), the trail (one mesh:
// every print and its tuft of prisms, with 24 more waiting to grow). No light; the prints' glow follows the sun's gutter.
import * as THREE from 'three';
import { SITES } from '../../world.js';
import { hyp } from '../../noise.js';
import { Painter, paintedMaterial, ell, ellZ, prism, conform, smooth, lerp, clamp, hash3, ZERO } from './kit.js';
import { LIVERY, stole, badge, collar, tag } from '../../v8/livery.js';

export const ACC = {
  hour: 3600, stepT: 20, pace: 0.75, side: 0.18, slots: 24, wander: 0.55, tall: 1.8,
  hip: 0.83, leg: 0.809, rear: -33.8 * Math.PI / 180, front: 21.8 * Math.PI / 180, footZ: 0.35, rearZ: -0.4, // feet centres, local z
  print: { len: 0.28, wid: 0.11, raise: [0.02, 0.04], tuft: [3, 5], tuftLen: [0.1, 0.25] },
};
const SW = (o) => o.toFixed(5);

export async function buildAccrescent(ctx, G) {
  const { scene, terrain } = ctx, low = ctx.quality === 'low', site = SITES.accrescent, keep = ctx.landmarks.castle;
  const rng = ctx.makeRng(7321);
  // the outwash's own meshes (the region builds beside this module): the erratics the line must pass, the cobbles it clears
  const waitFor = async (name) => { let m = null; for (let t0 = performance.now(); !(m = scene.getObjectByName(name)) && performance.now() - t0 < 25000;) await new Promise((r) => setTimeout(r, 60)); return m; };
  const errMesh = await waitFor('outwash-erratics');
  const erratics = [];
  if (errMesh) { const M = new THREE.Matrix4(), v = new THREE.Vector3(), s = new THREE.Vector3(), q = new THREE.Quaternion(); for (let i = 0; i < errMesh.count; i++) { errMesh.getMatrixAt(i, M); M.decompose(v, q, s); erratics.push({ x: v.x, z: v.z, r: Math.max(s.x, s.z) * 1.25 + 0.55 }); } }

  // ---------------------------------------------------------------- the stance
  let hx = keep.x - site.x, hz = keep.z - site.z; { const l = hyp(hx, hz); hx /= l; hz /= l; }
  const yaw = Math.atan2(hx, hz);                                  // local +z onto the keep
  const lat = (dx, dz) => [dz, -dx];                               // local +x for a forward (dx, dz)
  const state = { x: site.x, z: site.z, done: 0, active: null, started: 0, swing: -1, forced: 0 };
  const A = ACC, tf = site.trailFrom;
  // the line under the rear foot, then back toward the Lattice: it begins on the heading (his own) and bends to the plan's line
  const R0 = [site.x + hx * A.rearZ, site.z + hz * A.rearZ];
  const cl = [{ p: R0.slice(), d: [hx, hz] }];
  for (let j = 1, p = R0.slice(); j < 300; j++) {
    const ts = [tf[0] - p[0], tf[1] - p[1]], tl = hyp(ts[0], ts[1]);
    if (tl < A.pace * 0.9) break;
    const w = smooth(0, 7, j); let bx = lerp(-hx, ts[0] / tl, w), bz = lerp(-hz, ts[1] / tl, w); const bl = hyp(bx, bz); bx /= bl; bz /= bl;
    p = [p[0] + bx * A.pace, p[1] + bz * A.pace];
    const off = (0.3 * Math.sin(j * 0.37 + 1.1) + 0.2 * Math.sin(j * 0.91 + 0.4)) * smooth(0, 3, j), nx = bz, nz = -bx;
    cl.push({ p: [p[0] + nx * off, p[1] + nz * off], d: [-bx, -bz] });
  }
  const N = cl.length;
  // the line passes an erratic, never moves it: the nearest stretch of the line bows away from it, smoothly
  for (const e of erratics) {
    let jm = -1, dm = 1e9;
    for (let j = 0; j < N; j++) { const d = hyp(cl[j].p[0] - e.x, cl[j].p[1] - e.z); if (d < dm) { dm = d; jm = j; } }
    const want = e.r + A.side + 0.3;
    if (dm >= want) continue;
    const ux = (cl[jm].p[0] - e.x) / (dm || 1), uz = (cl[jm].p[1] - e.z) / (dm || 1), need = want - dm;
    for (let j = Math.max(1, jm - 8); j <= Math.min(N - 2, jm + 8); j++) { const b = Math.cos((j - jm) / 8 * Math.PI / 2) ** 2; cl[j].p[0] += ux * need * b; cl[j].p[1] += uz * need * b; }
  }
  // prints: index 0 at the Lattice's edge ... N-1 under the rear foot; then the slots ahead of him
  const prints = [];
  const addPrint = (c, d, side, idx) => {
    const l = lat(d[0], d[1]); let x = c[0] + l[0] * A.side * side, z = c[1] + l[1] * A.side * side;
    for (const e of erratics) { const dd = hyp(x - e.x, z - e.z); if (dd < e.r) { x += (x - e.x) / (dd || 1) * (e.r - dd); z += (z - e.z) / (dd || 1) * (e.r - dd); } }
    prints.push({ x, z, d, side, idx });
  };
  for (let j = N - 1; j >= 0; j--) addPrint(cl[j].p, cl[j].d, j % 2 === 0 ? 1 : -1, N - 1 - j);
  for (let k = 1; k <= A.slots; k++) addPrint([R0[0] + hx * A.pace * k, R0[1] + hz * A.pace * k], [hx, hz], k % 2 === 0 ? 1 : -1, N + k - 1);

  // ---------------------------------------------------------------- the trail's mesh: slab and tuft of prisms for each print
  const crystalBase = new THREE.Color('#3a7898'), crystalDeep = new THREE.Color(ctx.palette.crystalDeep), crystalPale = new THREE.Color(ctx.palette.crystal);
  const T = new Painter(['aIdx', 'aBx', 'aBy', 'aBz']);
  const OUT = [[0, -0.14], [0.04, -0.12], [0.042, -0.03], [0.055, 0.05], [0.045, 0.115], [0, 0.14], [-0.045, 0.115], [-0.055, 0.05], [-0.042, -0.03], [-0.04, -0.12]];
  const nrm = new THREE.Vector3(), up = new THREE.Vector3(), fwd = new THREE.Vector3(), rgt = new THREE.Vector3();
  const prng = ctx.makeRng(7322);
  for (const pr of prints) {
    const y = G.at(pr.x, pr.z); G.normal(pr.x, pr.z, nrm); up.copy(nrm);
    fwd.set(pr.d[0], 0, pr.d[1]).addScaledVector(up, -up.x * pr.d[0] - up.z * pr.d[1]).normalize(); rgt.crossVectors(up, fwd).normalize(); fwd.crossVectors(rgt, up);
    pr.y = y;
    T.set('aIdx', pr.idx).set('aBx', pr.x).set('aBy', y).set('aBz', pr.z);
    const W = (lx, ly, lz) => [pr.x + rgt.x * lx + up.x * ly + fwd.x * lz, y + rgt.y * lx + up.y * ly + fwd.y * lz, pr.z + rgt.z * lx + up.z * ly + fwd.z * lz];
    const H = lerp(A.print.raise[0], A.print.raise[1], prng());
    const bot = OUT.map(([lx, lz]) => W(lx, -0.012, lz)), topR = OUT.map(([lx, lz]) => W(lx * 0.8, H, lz * 0.82)), mid = W(0, H + 0.006, 0.01);
    for (let i = 0; i < OUT.length; i++) {
      const j = (i + 1) % OUT.length;
      T.paint(crystalDeep, 0.2, 0.1, 0.14); const a = T.v(...bot[i]), b = T.v(...bot[j]);
      T.paint(crystalBase, 0.2, 0.08, 0.22); const c = T.v(...topR[j]), d = T.v(...topR[i]);
      T.quad(a, b, c, d);
      const e = T.v(...topR[i]), f = T.v(...topR[j]); T.paint(crystalPale, 0.2, 0.06, 0.3); const g = T.v(...mid);
      T.tri(e, f, g);
    }
    const nT = A.print.tuft[0] + Math.floor(prng() * (A.print.tuft[1] - A.print.tuft[0] + 1));
    for (let i = 0; i < nT; i++) {
      const lx = (prng() - 0.5) * 0.07, lz = (prng() - 0.5) * 0.2, base = W(lx, H * 0.4, lz);
      const lean = 0.32 * prng(), an = prng() * 6.283, L = lerp(A.print.tuftLen[0], A.print.tuftLen[1], prng() * prng());
      const ax = rgt.x * Math.cos(an) * lean + fwd.x * Math.sin(an) * lean + up.x, ay = rgt.y * Math.cos(an) * lean + fwd.y * Math.sin(an) * lean + up.y, az = rgt.z * Math.cos(an) * lean + fwd.z * Math.sin(an) * lean + up.z;
      prism(T, base[0], base[1], base[2], ax, ay, az, L, 0.016 + 0.012 * prng(), crystalBase, crystalPale, [0.2, 0.08, [0.3, 0.9, 1.9]]);
    }
  }
  const tg = T.geometry();
  const uN = { value: N };
  const trailMat = paintedMaterial({ flatShading: true, side: THREE.DoubleSide }, (sh) => {
    sh.uniforms.uN = uN;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aIdx; attribute float aBx; attribute float aBy; attribute float aBz; uniform float uN;')
      .replace('vMRE = aMRE;', 'vMRE = aMRE; { float g = clamp(uN - aIdx, 0.0, 1.0); vec3 b = vec3(aBx, aBy, aBz); transformed = b + (transformed - b) * g; }');
  });
  trailMat.customProgramCacheKey = () => 'fp-still-trail';
  const trail = new THREE.Mesh(tg, trailMat);
  trail.castShadow = false; trail.receiveShadow = true; trail.name = 'living-still-trail';
  const sky = ctx.sky;
  trail.onBeforeRender = () => { trailMat.userData.uEmit.value = 1 + (1 - (sky?.flicker?.value ?? 1)) * 2.6; }; // the glow rises as the sun gutters
  scene.add(trail);

  // ---------------------------------------------------------------- the man: forward +z, up y, left +x; the first leg (sign +1, x +0.18) is the rear one
  const P = new Painter(['aKind', 'aSign']);
  const cloth = new THREE.Color('#6a4e5e'), hem = new THREE.Color('#7a6240'), skin = new THREE.Color('#8e6e5a'), dark = new THREE.Color('#2e2c3a'), hair = new THREE.Color('#6a665e'), shoe = new THREE.Color('#2a2220');
  const clothMix = new THREE.Color();
  const prof = [[0.42, 0.31, 0.22], [0.6, 0.27, 0.2], [0.83, 0.23, 0.17], [1.1, 0.19, 0.13], [1.3, 0.22, 0.14], [1.44, 0.17, 0.11], [1.52, 0.07, 0.07]];
  const rAt = (y) => { for (let i = 1; i < prof.length; i++) if (y <= prof[i][0]) { const f = (y - prof[i - 1][0]) / (prof[i][0] - prof[i - 1][0]); return [lerp(prof[i - 1][1], prof[i][1], f), lerp(prof[i - 1][2], prof[i][2], f)]; } return [0.07, 0.07]; };
  P.set('aKind', 0).set('aSign', 0);
  P.grid(low ? 12 : 16, 12, (u, v, o) => {
    const a = u * Math.PI * 2, y = lerp(0.42, 1.52, v), [rx, rz] = rAt(y), sn = Math.sin(a);
    // the back is grown through: crystal where the robe is torn, ragged along the edge
    const c = smooth(0.1, 0.5, -sn + 0.5 * (hash3(Math.round(u * 16), Math.round(y * 9), 3) - 0.5)) * (y < 1.5 ? 1 : 0);
    const bump = c * 0.02 * hash3(Math.round(u * 32), Math.round(y * 14), 5);
    o[0] = Math.cos(a) * (rx + bump); o[1] = y; o[2] = sn * (rz + bump);
    clothMix.copy(y < 0.55 ? hem : cloth).lerp(crystalBase, c);
    P.paint(clothMix, 0.2 * c, lerp(0.92, 0.1, c), 0.2 * c);
  });
  // the legs: dark wrappings; the arms: wide sleeves; hands and feet; head
  const leg = (sx) => {
    P.set('aKind', 1).set('aSign', sx > 0 ? 1 : -1);
    P.paint(dark, 0, 0.9, 0); P.loft([[sx, A.hip, 0], [sx, 0.45, 0.0], [sx, 0.04, 0]], [0.075, 0.06, 0.045], 6, 0, true);
    P.paint(crystalBase, 0.2, 0.1, 0.2); P.loft([[sx, A.hip - 0.05, -0.05], [sx, 0.4, -0.05], [sx, 0.07, -0.04]], [0.04, 0.035, 0.03], 5, 0, false); // the crust down the back of the leg
    for (let i = 0; i < (low ? 12 : 20); i++) { // prisms: denser and larger toward the heel
      const f = Math.pow(prng(), 0.65), y = A.hip - 0.06 - f * 0.74, L = lerp(0.04, 0.17, f) * (0.7 + prng() * 0.6);
      const ax = (prng() - 0.5) * 1.0, ay = (prng() - 0.2) * 0.8 - 0.1 * f, az = -1;
      prism(P, sx + (prng() - 0.5) * 0.06, y, -0.045, ax, ay, az, L, L * 0.2, crystalBase, crystalPale, [0.2, 0.08, [0.2, 0.4, 0.8]]);
    }
    P.set('aKind', 3);
    P.paint(shoe, 0, 0.7, 0); ellZ(P, sx, -0.02, 0.05, 0.05, 0.04, 0.12, 8, 5);
    for (let i = 0; i < 6; i++) { const L = 0.11 + prng() * 0.09; prism(P, sx + (prng() - 0.5) * 0.06, -0.015 + prng() * 0.05, -0.05, (prng() - 0.5) * 0.8, 0.3 + prng() * 0.6, -1, L, L * 0.2, crystalBase, crystalPale, [0.2, 0.08, [0.2, 0.5, 0.9]]); } // the heel
  };
  leg(A.side); leg(-A.side);
  const arm = (sx) => {
    P.set('aKind', 2).set('aSign', sx > 0 ? -1 : 1); // an arm swings with the opposite leg
    const s = Math.sign(sx);
    P.paint(cloth, 0, 0.92, 0); P.loft([[s * 0.22, 1.4, 0], [s * 0.26, 1.1, 0.02], [s * 0.27, 0.8, 0.05]], [0.05, 0.065, 0.085], 6, 0, false);
    P.paint(crystalBase, 0.2, 0.1, 0.2); P.loft([[s * 0.23, 1.4, -0.04], [s * 0.27, 1.1, -0.04], [s * 0.28, 0.85, -0.02]], [0.03, 0.03, 0.03], 4, 0, false);
    P.paint(skin, 0, 0.7, 0); ell(P, s * 0.275, 0.72, 0.06, 0.035, 0.06, 0.04, 6, 4); // the hand
    for (let i = 0; i < 9; i++) { const f = prng(), y = 1.4 - f * 0.55, L = lerp(0.025, 0.045, prng()); prism(P, s * (0.22 + 0.05 * f) + (prng() - 0.5) * 0.03, y, -0.05, (prng() - 0.5) * 0.6, 0.2, -1, L, L * 0.22, crystalBase, crystalPale, [0.2, 0.08, [0.2, 0.4, 0.8]]); }
  };
  arm(0.24); arm(-0.24);
  P.set('aKind', 0).set('aSign', 0);
  P.paint(skin, 0, 0.7, 0); P.loft([[0, 1.46, 0.01], [0, 1.56, 0.02]], [0.045, 0.04], 6, 0, false);
  ell(P, 0, 1.65, 0.015, 0.085, 0.115, 0.1, 10, 6);                                // the head, face to the keep
  P.paint(skin, 0, 0.7, 0); ell(P, 0, 1.63, 0.105, 0.016, 0.03, 0.02, 5, 4);        // the nose
  P.paint(hair, 0, 0.95, 0); ell(P, 0, 1.69, -0.02, 0.09, 0.1, 0.09, 8, 5);        // grey hair at the back of the head
  if (LIVERY.on) {
    // v8-06 the livery: an officer once, walking to the keep in his stole, the collar and the sign; the crystal has
    // the stole's back and the left band from the shoulder, so it is half ember and half glacial glass
    const cb = [crystalBase.r, crystalBase.g, crystalBase.b];
    collar(P, 0, 1.44, 0.0, 0.075, 0.13, '#3a3448', { sides: low ? 10 : 14, gap: 0.5 });
    const fz = (y) => rAt(y)[1] + 0.014;
    for (const sx of [-1, 1]) {
      const pts = [[sx * 0.075, 1.47, 0.05], ...[1.38, 1.25, 1.1, 0.95, 0.8, 0.65].map((y, i) => [sx * (0.08 + 0.008 * i), y, fz(y)])];
      stole(P, pts, { w: 0.12, out: [0, 0.15, 1], seed: 30 + sx, dirt: 0.2, fray: 0.04,
        tint: sx > 0 ? (t, k) => [cb, t < 0.55 ? 0.9 : 0.9 * (1 - smooth(0.55, 0.8, t)) * (k < 0.5 ? 1 : 0.5)] : null });
    }
    stole(P, [[-0.075, 1.47, 0.05], [-0.13, 1.47, -0.02], [-0.08, 1.48, -0.1], [0.08, 1.48, -0.1], [0.13, 1.47, -0.02], [0.075, 1.47, 0.05]], { w: 0.1, out: (t, p) => [p[0], 0.3, p[2]], fray: 0, dirt: 0, seed: 33, tint: (t) => [cb, 0.9] });
    badge(P, [0, 1.3, fz(1.3) + 0.012], [0, 1, 0], [0, 0.1, 1], 0.075, { th: 0.01 });
  }
  // the back of the torso: prisms standing in the torn robe, small at the shoulder, large toward the hem
  for (let i = 0; i < (low ? 26 : 46); i++) {
    const f = Math.pow(prng(), 0.8), y = 1.46 - f * 0.9, a = Math.PI + (prng() - 0.5) * Math.PI * 0.9, [rx, rz] = rAt(y), L = lerp(0.025, 0.14, f) * (0.7 + prng() * 0.6);
    const ax = Math.cos(a) * 0.7 + (prng() - 0.5) * 0.5, az = Math.sin(a) * 1.0, ay = 0.25 + (prng() - 0.5) * 0.5;
    prism(P, Math.cos(a) * rx * 0.97, y, Math.sin(a) * rz * 0.97, ax, ay, az, L, L * 0.22, crystalBase, crystalPale, [0.2, 0.08, [0.2, 0.4, 0.8]]);
  }
  const bg = tag(P.geometry(), P, 'heliarch');
  const UB = { uSwing: { value: -1 } };
  const bodyMat = paintedMaterial({ side: THREE.DoubleSide }, (sh) => {
    Object.assign(sh.uniforms, UB);
    const lib = `attribute float aKind; attribute float aSign; uniform float uSwing;
      vec2 fpRot(vec2 q, float a) { float c = cos(a), s = sin(a); return vec2(q.x * c + q.y * s, q.y * c - q.x * s); }
      void fpLimb(float k, float sg, out float a1, out float a2, out float py) {
        float t = (uSwing + 1.0) * 0.5;
        float al = sg > 0.0 ? mix(${SW(A.rear)}, ${SW(A.front)}, t) : mix(${SW(A.front)}, ${SW(A.rear)}, t);
        py = ${SW(A.hip)}; a1 = 0.0; a2 = 0.0;
        if (k > 0.5) { a1 = al; if (k > 1.5 && k < 2.5) { a1 = al * 0.5; py = 1.4; } a2 = a1; if (k > 2.5) { a2 = a1 >= 0.0 ? 0.0 : -min(0.52, 0.9 * -a1); } }
      }`;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + lib)
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n{ float a1, a2, py; fpLimb(aKind, aSign, a1, a2, py); vec2 nn = fpRot(objectNormal.yz, a2); objectNormal = vec3(objectNormal.x, nn.x, nn.y); }')
      .replace('vMRE = aMRE;', `vMRE = aMRE;
        { float a1, a2, py; fpLimb(aKind, aSign, a1, a2, py);
          if (aKind > 0.5) {
            vec2 q = fpRot(vec2(transformed.y - py, transformed.z), a1);
            vec3 p1 = vec3(transformed.x, py + q.x, q.y);
            if (aKind > 2.5) { vec2 k0 = fpRot(vec2(0.021 - py, 0.0), a1); vec2 an = vec2(py + k0.x, k0.y); vec2 q2 = fpRot(vec2(p1.y - an.x, p1.z - an.y), a2 - a1); p1.y = an.x + q2.x; p1.z = an.y + q2.y; }
            transformed = p1;
          }
          transformed.y += 0.055 * (1.0 - uSwing * uSwing); }`);
  });
  bodyMat.customProgramCacheKey = () => 'fp-still-accrescent';
  const man = new THREE.Mesh(bg, bodyMat);
  man.rotation.y = yaw; man.castShadow = true; man.receiveShadow = true; man.frustumCulled = false; man.name = 'living-still-accrescent';
  scene.add(man);
  const collider = { x: site.x, z: site.z, r: 0.4 }; ctx.addCollider(collider);

  // the cobbles and cushions the prints cover are taken away after their draws (the outwash is not touched)
  const cleared = [];
  {
    const dead = new THREE.Matrix4().makeScale(0, 0, 0), M = new THREE.Matrix4(), v = new THREE.Vector3();
    for (const nm of ['outwash-cobbles', 'outwash-cushions']) {
      const m = await waitFor(nm); if (!m) continue;
      let n = 0;
      for (let i = 0; i < m.count; i++) {
        m.getMatrixAt(i, M); v.setFromMatrixPosition(M);
        if (v.x < 30 || v.x > 75 || v.z < -270 || v.z > -150) continue;
        for (const pr of prints) { if ((pr.x - v.x) ** 2 + (pr.z - v.z) ** 2 < 0.36 ** 2) { m.setMatrixAt(i, dead); n++; break; } }
      }
      if (n) m.instanceMatrix.needsUpdate = true;
      cleared.push([nm, n]);
    }
  }

  // ---------------------------------------------------------------- the step
  const api = { site, keep: { x: keep.x, z: keep.z }, heading: [hx, hz], yaw, man, trail, prints, N, state, collider, steps: 0, cues: 0, cleared, erratics: erratics.length, UB, uN,
    pos: { x: site.x, z: site.z } };
  const ease = (u) => u * u * (3 - 2 * u);
  const place = (k) => { // the stance after k steps (fractional)
    const x = site.x + hx * A.pace * k, z = site.z + hz * A.pace * k;
    man.position.set(x, G.at(x, z), z); api.pos.x = x; api.pos.z = z;
    // faces the keep, still
    const kx = keep.x - x, kz = keep.z - z; man.rotation.y = Math.atan2(kx, kz);
    return [x, z];
  };
  api.step = () => { state.forced++; };
  api.update = (dt, t) => {
    const hours = Math.floor(t / A.hour);
    if (!state.active && state.started < Math.min(A.slots, hours + state.forced)) {
      const mark = (state.started + 1) * A.hour; state.started++; state.active = { t0: mark <= t ? mark : t }; state.swing0 = state.done % 2 === 0 ? -1 : 1;
      api.cues++; ctx.audio?.cue?.('accrescent-step', { x: api.pos.x, y: man.position.y + 0.1, z: api.pos.z });
    }
    let k = state.done;
    if (state.active) {
      const p = clamp((t - state.active.t0) / A.stepT, 0, 1), e = ease(p);
      UB.uSwing.value = state.swing0 + (-state.swing0 - state.swing0) * e;
      uN.value = N + state.done + p; k = state.done + e;
      if (p >= 1) { state.done++; state.active = null; UB.uSwing.value = -state.swing0; uN.value = N + state.done; k = state.done; api.steps = state.done; }
    } else { UB.uSwing.value = state.done % 2 === 0 ? -1 : 1; uN.value = N + state.done; }
    const [x, z] = place(k); collider.x = x; collider.z = z;
  };
  place(0);
  api.stats = () => ({ calls: 2, tris: Math.round(tg.index.count / 3 + bg.index.count / 3) });
  return api;
}
