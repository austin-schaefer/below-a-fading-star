// CI The Stylite (plans/IDEAS-v5.md CI; plans/wilderness-v5.md "### CI. The Stylite"; ?stylite=0).
// "On top of the tallest tor of the High Ling sits a gaunt man in a loincloth, cross-legged, facing the sun, unmoving. A
// rope runs from his hand down the tor's face to a basket at the foot. When you come near, the basket rises, empty, to
// his hand and then lowers again, as if offered. He never looks down. Sound: the rope's creak." No special shadow (DR
// "The Stylite's Umbra" was not picked). He sits on the down-cast top of 'highling-tors' within a metre of (268, -80);
// the rope lies from his right hand over the tor's crown by the upper hull of the stone's profile (down-casts every
// 0.2 m along the west, or the south, whichever lets the rope reach the ground soonest) and hangs off the lip to the
// basket on the turf. Draws: the man, the basket and the coil of slack (one mesh), the rope (one).
import * as THREE from 'three';
import { SITES } from '../../world.js';
import { hyp } from '../../noise.js';
import { makeDownCaster } from '../../fauna/geo.js';
import { Painter, paintedMaterial, ell, smooth, lerp, clamp } from './kit.js';

export const STY = {
  near: 18, rearm: 40, rise: 14, hold: 3, fall: 14, swing: 0.07, swingT: 3, creak: [0.8, 1.2],
  rope: { segs: 10, r: 0.011, sides: 5 }, basket: 0.45, attach: 0.42, coilTurns: [1.5, 6], coilR: 0.2,
};
const R = Math.PI / 180;

export async function buildStylite(ctx, G) {
  const { scene } = ctx, low = ctx.quality === 'low', site = SITES.stylite, tor = SITES.tallestTor;
  // the tor's stone (the region builds beside this module: wait for it, up to 25 s)
  let tors = null;
  for (let t0 = performance.now(); !(tors = scene.getObjectByName('highling-tors')) && performance.now() - t0 < 25000;) await new Promise((r) => setTimeout(r, 60));
  tors?.updateWorldMatrix(true, true);
  const cast = tors ? makeDownCaster([tors]) : (x, z) => G.at(x, z) + 10;
  const top = (x, z) => cast(x, z, 60, 80);
  // the seat: the highest stone within a metre of the tallest tor's centre
  let sx = tor.x, sz = tor.z, sy = -1e9;
  for (let dx = -1; dx <= 1.001; dx += 0.125) for (let dz = -1; dz <= 1.001; dz += 0.125) {
    if (dx * dx + dz * dz > 1) continue;
    const y = top(tor.x + dx, tor.z + dz); if (y != null && y > sy) { sy = y; sx = tor.x + dx; sz = tor.z + dz; }
  }
  if (sy < -1e8) sy = G.at(sx, sz) + 10;
  // he faces the sun's azimuth
  const sd = ctx.sun.dir, fl = hyp(sd.x, sd.z), f = [sd.x / fl, sd.z / fl], rt = [-f[1], f[0]]; // right hand: (-fz, fx)
  const yaw = Math.atan2(-f[1], f[0]);                        // local +x onto f, by rotation.y
  const rot = new THREE.Matrix4().makeRotationY(yaw);
  const hand = [sx + f[0] * 0.22 + rt[0] * 0.31, sy + 0.24, sz + f[1] * 0.22 + rt[1] * 0.31]; // his right hand, on the right knee

  // ---------------------------------------------------------------- the rope's way: the upper hull of the stone's profile
  const way = (dx, dz) => { // march along (dx, dz) from the hand; the last stone before the air
    const pts = [[0, hand[1]]]; let last = 0;
    for (let r = 0.2; r < 9; r += 0.2) { const y = top(hand[0] + dx * r, hand[2] + dz * r); if (y != null) { pts.push([r, y + 0.05]); last = r; } else if (r - last > 1.0) break; }
    return { pts, last };
  };
  const W = way(-1, 0), S = way(0, 1);
  const pick = W.last <= S.last ? { d: [-1, 0], ...W } : { d: [0, 1], ...S };
  // upper convex hull of the points from the hand to the lip
  const hull = []; for (const p of pick.pts) {
    while (hull.length >= 2) { const a = hull[hull.length - 2], b = hull[hull.length - 1]; if ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0) hull.pop(); else break; }
    hull.push(p);
  }
  const lip = hull[hull.length - 1];
  const footR = lip[0] + 0.9, fx = hand[0] + pick.d[0] * footR, fz = hand[2] + pick.d[1] * footR, fy = G.at(fx, fz);
  const A = STY.attach, foot = { x: fx, z: fz, y: fy + A }; // the rope's end on the basket's handle
  const way3 = hull.map(([r, y]) => [hand[0] + pick.d[0] * r, y, hand[2] + pick.d[1] * r]);
  const lipP = way3[way3.length - 1];
  way3.push([lipP[0] + pick.d[0] * 0.3, lipP[1] - 0.2, lipP[2] + pick.d[1] * 0.3], [lipP[0] + pick.d[0] * 0.55, (lipP[1] + foot.y) / 2, lipP[2] + pick.d[1] * 0.55], [foot.x, foot.y, foot.z]);
  // a polyline resampled every 0.1 m, with its arc length
  const PL = []; { let s = 0; PL.push([...way3[0], 0]); for (let i = 1; i < way3.length; i++) { const a = way3[i - 1], b = way3[i], l = Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2), n = Math.max(1, Math.ceil(l / 0.1)); for (let k = 1; k <= n; k++) { const u = k / n; s += l / n; PL.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u), s]); } } }
  const LEN = PL[PL.length - 1][3];
  const out = [0, 0, 0];
  const pathAt = (s, o = out) => { // position at arc length s, by bisection on the polyline
    s = clamp(s, 0, LEN); let lo = 0, hi = PL.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (PL[m][3] < s) lo = m; else hi = m; }
    const a = PL[lo], b = PL[hi], u = b[3] > a[3] ? (s - a[3]) / (b[3] - a[3]) : 0;
    o[0] = a[0] + (b[0] - a[0]) * u; o[1] = a[1] + (b[1] - a[1]) * u; o[2] = a[2] + (b[2] - a[2]) * u; return o;
  };

  // ---------------------------------------------------------------- the man, the basket and the coil: one mesh in the seat's frame
  const P = new Painter(['aB', 'aT']);   // aB: 1 on the basket; aT: a coil's turn fraction (0..1), -1 elsewhere
  const skin = new THREE.Color('#7e5c46'), dry = new THREE.Color('#6a4c3a'), cloth = new THREE.Color('#8b7c5a'), hair = new THREE.Color('#3c3028');
  P.xf(rot);
  const rg = (c, r, y = 0.8) => P.paint(c, 0, y, 0);
  rg(cloth); ell(P, -0.02, 0.17, 0, 0.19, 0.12, 0.21, 9, 5);                                   // the loincloth, over the seat
  rg(skin);
  for (const s of [1, -1]) {                                                                     // legs crossed: thighs out, shins over
    P.loft([[0.0, 0.2, s * 0.08], [0.1, 0.16, s * 0.27], [0.2, 0.12, s * 0.36]], [0.07, 0.06, 0.05], 6, 0, true);
    P.loft([[0.2, 0.12, s * 0.36], [0.3, 0.08, s * 0.16], [0.28, 0.07, -s * 0.12]], [0.05, 0.042, 0.04], 6, 0, true);
    P.loft([[0.0, 0.7, s * 0.17], [-0.02, 0.5, s * 0.24], [0.2, 0.3, s * 0.3]], [0.04, 0.035, 0.032], 5, 0, true); // the arm, hand to the knee
    ell(P, 0.22, 0.2, s * 0.31, 0.045, 0.02, 0.03, 6, 4);                                       // the hand
  }
  rg(skin); P.loft([[-0.02, 0.22, 0], [-0.01, 0.48, 0], [0.01, 0.74, 0]], [[0.085, 0.15], [0.075, 0.13], [0.09, 0.17]], 8, 0, true); // the torso, gaunt
  P.loft([[0.01, 0.72, 0], [0.04, 0.84, 0]], [0.04, 0.035], 6, 0, false);                       // the neck
  ell(P, 0.05, 0.96, 0, 0.1, 0.115, 0.082, 9, 6);                                                // the head, facing the sun
  rg(hair, 0, 0.95); ell(P, 0.0, 1.0, 0, 0.1, 0.1, 0.09, 8, 5);
  P.xf(null);
  // the basket, on the turf at the foot (its centre under the rope's end), hollow, woven in bands
  const bx = foot.x - sx, bz = foot.z - sz, by = fy - sy - 0.02;
  P.set('aB', 1);
  {
    const bw = STY.basket / 2, prof = [[0, 0], [0.17 * bw / 0.225, 0], [0.2 * bw / 0.225, 0.08], [0.2 * bw / 0.225, 0.1], [bw, 0.3], [bw * 0.92, 0.3], [0.8 * bw, 0.1], [0, 0.04]];
    P.paint('#6c5230', 0, 0.95, 0); P.lathe(bx, by, bz, prof, low ? 10 : 14);
    P.paint('#4a3822', 0, 0.9, 0); P.ring(bx, by + 0.29, bz, bw * 0.96, 0.012, 14, 4); // the rim's binding
    P.paint('#5a4228', 0, 0.9, 0);
    const arc = []; for (let k = 0; k <= 8; k++) { const a = k / 8 * Math.PI; arc.push([bx + Math.cos(a) * bw * 0.95, by + 0.29 + Math.sin(a) * 0.13, bz]); }
    P.loft(arc, arc.map(() => 0.012), 4, 0, false); // the handle
  }
  P.set('aB', 0);
  // the coil of slack, on the stone beside him (a flat spiral of rope, turns hidden as the basket comes down)
  const cp = [sx - rt[0] * 0.62 - f[0] * 0.1, 0, sz - rt[1] * 0.62 - f[1] * 0.1]; cp[1] = (top(cp[0], cp[2]) ?? sy - 0.2) + 0.012;
  {
    const T = STY.coilTurns[1], ptsN = Math.round(T * 12), pts = [], rad = [];
    for (let k = 0; k <= ptsN; k++) { const u = k / ptsN, a = u * T * Math.PI * 2, rr = STY.coilR * (1 - u * 0.35), lay = Math.floor(u * T) * 0.01; pts.push([cp[0] - sx + Math.cos(a) * rr, cp[1] - sy + lay + 0.012, cp[2] - sz + Math.sin(a) * rr]); rad.push(0.012); }
    P.paint('#7a6240', 0, 0.95, 0);
    // each short run carries its turn fraction
    for (let k = 0; k < ptsN; k++) { P.set('aT', (k + 0.5) / ptsN); P.loft([pts[k], pts[k + 1]], [0.012, 0.012], 4, 0, false); }
    P.set('aT', -1);
  }
  const geo = P.geometry();
  const U = { uOff: { value: new THREE.Vector3() }, uSwing: { value: 0 }, uSlack: { value: STY.coilTurns[0] / STY.coilTurns[1] }, uBase: { value: new THREE.Vector3(bx, by + A, bz) } };
  const mat = paintedMaterial({ side: THREE.DoubleSide }, (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aB; attribute float aT; uniform vec3 uOff; uniform float uSwing; uniform float uSlack; uniform vec3 uBase;')
      .replace('vMRE = aMRE;', `vMRE = aMRE;
        transformed += uOff * aB;
        transformed.x += uSwing * (uBase.y - position.y) * aB;
        if (aT >= 0.0 && aT > uSlack) transformed = vec3(0.0, -50.0, 0.0);`);
  });
  mat.customProgramCacheKey = () => 'fp-still-stylite';
  const man = new THREE.Mesh(geo, mat);
  man.position.set(sx, sy, sz); man.frustumCulled = false; man.castShadow = true; man.receiveShadow = true; man.name = 'living-still-stylite';
  scene.add(man);

  // ---------------------------------------------------------------- the rope: 10 segments, laid by the CPU while the basket moves
  const RS = STY.rope, rings = RS.segs + 1, rp = new Float32Array(rings * RS.sides * 3), ri = [];
  for (let k = 0; k < RS.segs; k++) for (let s = 0; s < RS.sides; s++) { const a = k * RS.sides + s, b = k * RS.sides + (s + 1) % RS.sides, c = a + RS.sides, d = b + RS.sides; ri.push(a, b, d, a, d, c); }
  const rgeo = new THREE.BufferGeometry(); rgeo.setAttribute('position', new THREE.BufferAttribute(rp, 3).setUsage(THREE.DynamicDrawUsage)); rgeo.setIndex(ri);
  const rmat = new THREE.MeshStandardMaterial({ color: '#8a7048', roughness: 0.95, side: THREE.DoubleSide });
  const rope = new THREE.Mesh(rgeo, rmat); rope.frustumCulled = false; rope.castShadow = true; rope.name = 'living-still-rope'; rope.position.set(0, 0, 0);
  scene.add(rope);
  const pa = [0, 0, 0], pb = [0, 0, 0];
  const layRope = (sb) => {
    // ring k at arc length sb * k / segs; its two neighbours give the direction, a normal pair is built round it
    for (let k = 0; k < rings; k++) {
      pathAt(sb * k / RS.segs, pa); pathAt(sb * Math.min(rings - 1, k + 1) / RS.segs + 0.02, pb);
      let tx = pb[0] - pa[0], ty = pb[1] - pa[1], tz = pb[2] - pa[2]; const tl = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      let ux = -tz, uy = 0, uz = tx; const ul = Math.sqrt(ux * ux + uz * uz) || 1; ux /= ul; uz /= ul;
      const vx = ty * uz - tz * uy, vy = tz * ux - tx * uz, vz = tx * uy - ty * ux;
      for (let s = 0; s < RS.sides; s++) { const an = s / RS.sides * 6.2832, c = Math.cos(an) * RS.r, sn = Math.sin(an) * RS.r, i = (k * RS.sides + s) * 3; rp[i] = pa[0] + ux * c + vx * sn; rp[i + 1] = pa[1] + uy * c + vy * sn; rp[i + 2] = pa[2] + uz * c + vz * sn; }
    }
    rgeo.attributes.position.needsUpdate = true; rgeo.computeVertexNormals(); rgeo.computeBoundingSphere();
  };

  // ---------------------------------------------------------------- the offer
  const api = { seat: { x: sx, y: sy, z: sz }, hand: { x: hand[0], y: hand[1], z: hand[2] }, foot, face: f, yaw, lip: { x: lipP[0], y: lipP[1], z: lipP[2] }, length: LEN, dir: pick.d,
    man, rope, state: 'idle', armed: true, t: 0, sb: LEN, offers: 0, cues: 0, moving: false, pos: { x: foot.x, y: foot.y, z: foot.z } };
  const ease = (u) => u * u * (3 - 2 * u);
  let clock = 0, creakIn = 0; const crng = ctx.makeRng(7311);
  const apply = (dt) => {
    const D = STY;
    const T = D.rise + D.hold + D.fall;
    let sb = LEN, st = 'idle';
    if (api.state === 'offer') {
      st = 'offer';
      if (clock < D.rise) sb = LEN * (1 - ease(clock / D.rise));
      else if (clock < D.rise + D.hold) sb = 0.12;
      else if (clock < T) sb = LEN * ease((clock - D.rise - D.hold) / D.fall);
      else { api.state = 'idle'; sb = LEN; st = 'idle'; }
    }
    const moving = st === 'offer' && !(clock >= D.rise && clock < D.rise + D.hold);
    api.moving = moving; api.sb = sb;
    if (st === 'offer' || api.swinging > 0 || true) {
      pathAt(Math.max(0.12, sb), out);
      U.uOff.value.set(out[0] - foot.x, out[1] - foot.y, out[2] - foot.z);
      const sw = st === 'offer' ? D.swing * Math.sin(clock * 6.2832 / D.swingT) * (clock < D.rise + D.hold ? smooth(0, 3, clock) : 1) : 0;
      U.uSwing.value = sw * (pick.d[0] !== 0 ? 1 : 0.0); // across the rope's run
      U.uSlack.value = (D.coilTurns[0] + (D.coilTurns[1] - D.coilTurns[0]) * (1 - sb / LEN)) / D.coilTurns[1];
      layRope(Math.max(0.12, sb));
    }
    if (moving) { // the rope's creak every 0.8-1.2 s while it runs
      creakIn -= dt; if (creakIn <= 0) { creakIn = lerp(D.creak[0], D.creak[1], crng()); ctx.audio?.cue?.('stylite-creak', { x: lipP[0], y: lipP[1], z: lipP[2] }); api.cues++; }
    } else creakIn = 0.3;
  };
  // s seconds into an offer begun now (the sightline renders and the test use it)
  api.offer = (s = 0) => { api.state = 'offer'; api.armed = false; clock = s; api.offers++; apply(0); };
  api.update = (dt, t) => {
    const p = ctx.player.pos, d = hyp(p.x - foot.x, p.z - foot.z);
    if (api.state === 'offer') clock += dt;
    else if (api.armed && d < STY.near) { api.offer(0); return; }
    if (!api.armed && api.state === 'idle' && d > STY.rearm) api.armed = true;
    if (api.state === 'offer' || api.moving) apply(dt); else if (U.uOff.value.lengthSq() > 1e-6 || api.sb !== LEN) apply(dt);
  };
  const idleAt = { x: foot.x, z: foot.z };
  api.at = () => (api.state === 'offer' ? ctx.player.pos : idleAt);
  apply(0);
  api.stats = () => ({ calls: 2, tris: Math.round(geo.index.count / 3 + ri.length / 3) });
  return api;
}
