// The mother crystal's act (v10-A1, #9): a hand laid on the 60 m crystal at the Lattice's heart. Registered from
// src/vegetation/lattice.js, which builds the mother (src/vegetation/mother.js) and owns the crystals' one material:
// this module adds three uniforms and some GLSL to that material and to the filaments', and draws one thing of its own,
// the thread (below).
//
// What answers ("Lay your hand", once a visit):
//   0-2 s     a handprint of light, a little larger than a hand, lights in the glass where the hand lies, in the middle
//             of the view, and veins of light run out of it through the glass (act-crystal: the Lattice's A4 swelling);
//   1.6-5.6 s a band of glacial white climbs the trunk from the print to the apex and into the haze, a trail of light
//             under it, the tone climbing the harmonic series of A;
//   5.3 s     the band reaches the top and the sun gutters (ctx.sky.flicker, the world's one shared event, drawn early:
//             so the Hypogeum's lintel turns too): the crystal has drunk from the sun;
//   6.5-12 s  the whole crystal glows pale while the light runs out of its foot through every crystal and filament of the
//             field as one ring, 28 m a second, to the Lattice's edge 175 m off (act-crystal-ring);
//   6.5-15 s  and out of the foot, on the side toward the Hypogeum, one filament keeps going: a thread of light runs over
//             the moor, 30 m a second, 250 m to the head of the tomb's stair and down it to the bronze door, whose glyph
//             row then glows the crystal's blue. The visitor can follow it, and it is still there when they come back;
//   13-16 s   from the second hand on, the field sends the ring back in from its edge to the foot;
//   14-17 s   as the sun catches, a coal of its own colour is left in the glass: an ember ring round the trunk.
// Remembered: show(n) draws n embers (at most nine) round the trunk, the first 7 m up, each 5.5 m above the last (a
// returning visitor finds the sun they took still in the crystal, and sees from far off how often they have come), the
// thread lit faintly with a slow pulse running toward the tomb, and the lintel's glyphs blue.
//
// crystalAct(ctx, mother, M, ground) → { uniforms, glsl (the crystals' emissive), filGlsl / filVert (the filaments'),
// state() }. The thread is built on the first frame after ctx.hypogeum exists (the ruins build after the vegetation),
// one mesh, drawn only once the hand has been laid; until then and while idle, the update is two comparisons.
import * as THREE from 'three';
import { hyp } from '../noise.js';
import { K } from '../vegetation/mother.js';

const ID = 'mother-hand';
export const EMBERS = 9;            // embers drawn at most
export const EMBER_Y = [7, 5.5];    // metres up the trunk of the first, and between them
export const RING_V = 28, RING_R = 175; // the ring's speed (m/s) and how far it runs
export const THREAD_V = 30;         // the thread's head, m/s
export const T = { climb: [1.6, 5.6], gutter: 5.3, top: 6.5, back: 13, ember: [14, 17], end: 18 };
const BLUE = new THREE.Color('#3fa8d8');

export function crystalAct(ctx, mother, M, ground) {
  const g0 = mother.g0;
  // x: seconds since the hand (-1: idle); y: embers drawn (fractional while one forms); z: the count this visit; w: the
  // back-ring (1 from the second hand on)
  const uAct = { value: new THREE.Vector4(-1, 0, 0, 0) };
  const uActM = { value: new THREE.Vector3(M.x, g0, M.z) };
  const uHand = { value: new THREE.Vector3(M.x, g0 + 1.5, M.z) };
  const uHandN = { value: new THREE.Vector3(1, 0, 0) }; // the face's outward normal there, level
  const uniforms = { uAct, uActM, uHand, uHandN };
  // the glass under the look: a ray from the eye, a little below the centre of the view, against the mother's pieces
  // (meshes made once, on the first hand, never added to the scene)
  let probe = null;
  const ray = new THREE.Raycaster(), rdir = new THREE.Vector3(), reye = new THREE.Vector3();
  function touchAt(player) {
    if (!probe) probe = ['trunk', 'twins', 'shoots', 'druse'].map((k) => { const m = new THREE.Mesh(mother.geos[k]); m.matrixAutoUpdate = false; m.matrix.copy(mother.matrix); m.matrixWorld.copy(mother.matrix); return m; });
    const cam = ctx.camera; cam.getWorldPosition(reye); cam.getWorldDirection(rdir);
    rdir.y -= 0.12; rdir.normalize();
    ray.set(reye, rdir); ray.far = 6;
    const h = ray.intersectObjects(probe, false)[0];
    if (!h || !h.face) return null;
    const n = h.face.normal.clone().transformDirection(mother.matrix);
    if (n.dot(rdir) > 0) n.negate();
    return { point: h.point.clone().addScaledVector(n, 0.01), n };
  }
  const st = { t: -1, n: 0, embers: 0, gutters: 0, hand: uHand.value, thread: 0, threadLen: 0, lintel: 0 };

  // the crystals' share, inside the emissive block of lattice.js (fpD, fres, core, fpVeil, fpN3 in scope)
  const glsl = `
    {
      vec2 fpRel = vCrW.xz - uActM.xz;
      float fpR = length(fpRel);
      float fpHm = vCrH * ${K.toFixed(1)}; // metres up the mother (its pieces share one origin and scale)
      float fpTrunk = vCrBig * (1.0 - smoothstep(7.5, 11.0, fpR));
      // the embers: the sun's own colour held in the glass, deepest in the veils
      if (fpTrunk > 0.0 && uAct.y > 0.0) {
        float fpE = 0.0;
        for (int k = 0; k < ${EMBERS}; k++) {
          float fk = float(k);
          if (fk >= uAct.y) break;
          float hk = ${EMBER_Y[0].toFixed(1)} + fk * ${EMBER_Y[1].toFixed(1)};
          float dh = (fpHm - hk) / 1.1;
          fpE += exp(-dh * dh) * clamp(uAct.y - fk, 0.0, 1.0);
        }
        float fpBreath = 0.85 + 0.15 * sin(uTime * 0.7 + fpHm * 0.3);
        totalEmissiveRadiance += vec3(1.0, 0.34, 0.09) * fpE * fpTrunk * fpBreath * (0.5 + 1.6 * smoothstep(0.3, 0.85, fpVeil)) * (1.0 - 0.5 * fres) * 1.6;
      }
      float fpT = uAct.x;
      if (fpT >= 0.0) {
        vec3 fpLit = uPale * 1.4 + vec3(0.45, 0.7, 0.85);
        // the handprint: palm, four fingers and a thumb, twice a hand, on the face toward the visitor
        vec2 nH = uHandN.xz;
        vec2 dW = vCrW.xz - uHand.xz;
        vec2 hp = vec2(dot(dW, vec2(-nH.y, nH.x)), vCrW.y - uHand.y) / 2.2;
        float hd = length((hp - vec2(0.0, -0.02)) / vec2(0.052, 0.062)) - 1.0;
        hd *= 0.05;
        for (int f = 0; f < 4; f++) {
          float ff = float(f);
          vec2 a = vec2(-0.036 + ff * 0.024, 0.03), b = a + vec2((ff - 1.5) * 0.008, 0.062 + 0.018 * (1.0 - abs(ff - 1.4) * 0.6));
          vec2 pa = hp - a, ba = b - a;
          float hh = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
          hd = min(hd, length(pa - ba * hh) - 0.0115);
        }
        { vec2 a = vec2(0.042, -0.025), b = vec2(0.088, 0.022); vec2 pa = hp - a, ba = b - a; float hh = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); hd = min(hd, length(pa - ba * hh) - 0.013); }
        float fpNear = 1.0 - smoothstep(0.6, 1.2, abs(dot(dW, nH)));
        float fpPrintT = smoothstep(0.0, 0.35, fpT) * (1.0 - smoothstep(2.5, 7.0, fpT));
        float fpPrint = ((1.0 - smoothstep(0.0, 0.003, hd)) * 1.3 + exp(-max(hd, 0.0) / 0.008) * 0.3) * fpNear * fpPrintT;
        // veins of light running out of the print through the glass, mostly upward, reaching 4 m in two seconds
        float dHand = distance(vCrW, uHand);
        float fpReach = clamp((fpT - 0.3) * 2.4, 0.0, 5.0);
        float fpRidge = 1.0 - abs(fpN3(vCrW * vec3(4.0, 1.3, 4.0)) * 2.0 - 1.0);
        float fpVein = pow(fpRidge, 40.0) * (1.0 - smoothstep(fpReach * 0.7, fpReach, dHand)) * (1.0 - smoothstep(3.0, 7.0, fpT)) * step(0.3, fpT);
        // the band climbing from the print into the haze, a trail of light left under it
        float fpU = clamp((fpT - ${T.climb[0].toFixed(2)}) / ${(T.climb[1] - T.climb[0]).toFixed(2)}, 0.0, 1.0);
        float h0 = uHand.y - uActM.y;
        float hc = h0 + (64.0 - h0) * pow(fpU, 1.35);
        float db = (fpHm - hc) / (0.8 + 2.6 * fpU);
        float fpOn = step(${T.climb[0].toFixed(2)}, fpT) * (1.0 - smoothstep(${T.top.toFixed(1)}, ${(T.top + 1).toFixed(1)}, fpT));
        float fpBand = exp(-db * db) * fpOn * (0.25 + 0.75 * smoothstep(0.04, 0.3, fpU)); // dim while it passes the eye, so the print still reads
        float fpTrail = step(fpHm, hc) * step(h0 - 1.0, fpHm) * exp(-(hc - fpHm) / 14.0) * 0.18 * fpOn;
        // the crystal drinking: all of it pale while the sun is down
        float fpDrink = smoothstep(5.6, 7.0, fpT) * (1.0 - smoothstep(12.0, 17.0, fpT)) * (0.12 + 0.35 * smoothstep(0.3, 0.8, fpVeil));
        totalEmissiveRadiance += fpLit * fpTrunk * (fpPrint * 1.6 + fpVein * 1.1 + (fpBand * 2.4 + fpTrail + fpDrink) * (0.4 + core));
        fpKeep = max(fpBand, fpDrink * 0.5) * fpTrunk; // the band shows through the haze that hides the apex
        // the ring through the field: every crystal it reaches lights as it passes; from the second hand, it comes back
        float fpOut = (fpT - ${T.top.toFixed(1)}) * ${RING_V.toFixed(1)};
        float fpIn = ${RING_R.toFixed(1)} - (fpT - ${T.back.toFixed(1)}) * ${RING_V.toFixed(1)};
        float dr1 = (fpR - fpOut) / 7.0, dr2 = (fpR - fpIn) / 7.0;
        float fpRing = exp(-dr1 * dr1) * step(0.0, fpOut) * (1.0 - smoothstep(${(RING_R - 25).toFixed(1)}, ${RING_R.toFixed(1)}, fpOut))
                     + uAct.w * exp(-dr2 * dr2) * step(${T.back.toFixed(1)}, fpT) * step(0.0, fpIn);
        totalEmissiveRadiance += fpLit * fpRing * (1.0 - fpTrunk) * (0.6 + 1.6 * core) * 1.6;
      }
    }`;
  // the filaments: the ring runs along them too (their mesh is in world space, so position.xz is the ground's)
  const filVert = 'vFpXZ = position.xz;';
  const filGlsl = `
    if (uAct.x >= 0.0) {
      float fpR = length(vFpXZ - uActM.xz);
      float fpOut = (uAct.x - ${T.top.toFixed(1)}) * ${RING_V.toFixed(1)};
      float fpIn = ${RING_R.toFixed(1)} - (uAct.x - ${T.back.toFixed(1)}) * ${RING_V.toFixed(1)};
      float dr1 = (fpR - fpOut) / 5.0, dr2 = (fpR - fpIn) / 5.0;
      float fpRing = exp(-dr1 * dr1) * step(0.0, fpOut) * (1.0 - smoothstep(${(RING_R - 25).toFixed(1)}, ${RING_R.toFixed(1)}, fpOut))
                   + uAct.w * exp(-dr2 * dr2) * step(${T.back.toFixed(1)}, uAct.x) * step(0.0, fpIn);
      diffuseColor.rgb += uFil * 3.5 * fpRing;
      diffuseColor.a = max(diffuseColor.a, fpRing * (1.0 - vEdge * vEdge) * vFade);
    }`;

  // ---------------------------------------------------------------- the thread, from the foot to the tomb's door
  // x: the head (m along; -1 none), y: the steady glow of a thread already run (0..1)
  const uTh = { value: new THREE.Vector2(-1, 0) };
  let thread = null, threadLen = 0;
  function buildThread(H) {
    const end = H.stairTop, door = H.door, Yf = H.floor;
    const dx0 = end.x - 1.5 - M.x, dz0 = end.z - M.z, L0 = hyp(dx0, dz0);
    const ux = dx0 / L0, uz = dz0 / L0, px = -uz, pz = ux;
    const s0 = mother.foot + 1.2, pts = [];
    const nz = ctx.noise;
    // over the land: from the foot to a step short of the stair's head, wandering like the field's own filaments
    for (let s = s0; s <= L0; s += 0.8) {
      const taper = Math.min(1, (s - s0) / 20, (L0 - s) / 15);
      const off = (nz.noise2(s * 0.018, 3.7) * 7 + nz.noise2(s * 0.09, 9.1) * 1.2) * Math.max(0, taper);
      const x = M.x + ux * s + px * off, z = M.z + uz * s + pz * off;
      const wd = ground.waterDepth(x, z);
      pts.push({ x, z, y: ground.heightAt(x, z) + Math.max(0, wd) + 0.07 });
    }
    // down the stair's middle to the threshold and under the door
    const xa = end.x - 1.5, xb = door.x - 0.02;
    const ya = pts[pts.length - 1].y;
    for (let k = 1; k <= 24; k++) {
      const u = k / 24, x = xa + (xb - xa) * u;
      const top = end.y + 0.035, bot = Yf + 0.035;
      // treads: the thread steps down with them (it was laid on stone, not on a slope)
      const y = x < end.x ? ya + (top - ya) * Math.max(0, (x - xa) / 1.5) : Math.max(bot, top - Math.floor((x - end.x) / Math.max(0.01, H.treadD ?? 0.32) + 1) * (H.treadRise ?? 0.3));
      pts.push({ x, z: door.z + 0.0, y: Math.max(y, bot) });
    }
    const P = [], A = [], E = [];
    const W = 0.09;
    let along = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dz = b.z - a.z, l = hyp(dx, dz) || 1, nx = -dz / l * W, nzz = dx / l * W;
      const l3 = Math.sqrt(dx * dx + dz * dz + (b.y - a.y) ** 2);
      P.push(a.x + nx, a.y, a.z + nzz, a.x - nx, a.y, a.z - nzz, b.x - nx, b.y, b.z - nzz, a.x + nx, a.y, a.z + nzz, b.x - nx, b.y, b.z - nzz, b.x + nx, b.y, b.z + nzz);
      A.push(along, along, along + l3, along, along + l3, along + l3);
      E.push(1, -1, -1, 1, -1, 1);
      along += l3;
    }
    threadLen = st.threadLen = along;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('aAlong', new THREE.Float32BufferAttribute(A, 1));
    g.setAttribute('aEdge', new THREE.Float32BufferAttribute(E, 1));
    g.computeBoundingSphere();
    const u = { uTh, uTime: { value: 0 }, uLen: { value: along } };
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, side: THREE.DoubleSide, toneMapped: false });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aAlong; attribute float aEdge; varying float vAlong; varying float vEdge;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlong = aAlong; vEdge = aEdge;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec2 uTh; uniform float uTime, uLen; varying float vAlong; varying float vEdge;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          {
            vec3 c = vec3(0.37, 0.82, 1.0);
            float ahead = uTh.x - vAlong;                       // metres behind the head
            float run = uTh.x < 0.0 ? 0.0 : step(0.0, ahead);
            float head = uTh.x < 0.0 ? 0.0 : exp(-abs(ahead) / 3.0) * step(-1.0, ahead);
            float behind = run * (0.35 + 0.65 * exp(-ahead / 40.0));
            float slow = pow(0.5 + 0.5 * sin(vAlong * 0.08 - uTime * 1.4), 6.0);  // the kept glow: pulses running to the tomb
            float kept = uTh.y * (0.28 + 0.9 * slow);
            float k = max(behind, kept);
            float edge = 1.0 - vEdge * vEdge;
            diffuseColor.rgb = c * (k * 1.6 + head * 6.0);
            diffuseColor.a = edge * clamp(k + head, 0.0, 1.0);
          }`);
    };
    m.customProgramCacheKey = () => 'fp-act-thread';
    thread = new THREE.Mesh(g, m);
    thread.name = 'act-crystal-thread'; thread.renderOrder = 2; thread.frustumCulled = true;
    thread.userData.u = u;
    ctx.scene.add(thread);
    st.threadEnd = { x: xb, y: Yf, z: door.z };
  }
  function lintel(k) { // the glyph row's glow toward the crystal's blue (k 0..1)
    const gm = ctx.hypogeum?.glyphMat; if (!gm) return;
    if (!gm.userData.fpE0) gm.userData.fpE0 = gm.emissive.clone();
    gm.emissive.copy(gm.userData.fpE0).lerp(BLUE, k);
    st.lintel = k;
  }

  const flick = ctx.sky?.flicker;
  let t = -1, fired = 0, n = 0, kept = 0, want = false;
  const cueAt = { x: M.x, y: g0 + 20, z: M.z };
  ctx.registerUpdate((dt, time) => {
    if (want && !thread) { // the ruins build after the vegetation: lay the thread on the first frame they are there
      if (!ctx.hypogeum) return;
      buildThread(ctx.hypogeum);
      thread.visible = kept > 0; uTh.value.y = kept > 0 ? 1 : 0;
      lintel(kept > 0 ? 1 : 0);
    }
    if (thread && thread.visible) thread.userData.u.uTime.value = time;
    if (t < 0) return; // idle: nothing more per frame
    t += dt;
    const v = uAct.value;
    v.x = t;
    // the sun gutters as the light reaches the top (unless it is guttering already, or held for a render)
    if (!(fired & 1) && t >= T.gutter) {
      fired |= 1;
      if (flick && flick.phase <= 0 && flick.hold == null) { flick.next = 0; st.gutters++; }
    }
    if (!(fired & 2) && t >= T.top) { fired |= 2; ctx.audio?.cue('act-crystal-ring', cueAt, { n }); }
    if (!(fired & 4) && n > 1 && t >= T.back) { fired |= 4; ctx.audio?.cue('act-crystal-ring', cueAt, { n, back: true }); }
    // the thread's head runs from the foot to the door; the lintel turns blue as it arrives
    if (thread) {
      thread.visible = true;
      const head = (t - T.top) * THREAD_V;
      uTh.value.x = head < 0 ? -1 : Math.min(head, threadLen + 4);
      st.thread = Math.max(0, Math.min(1, head / threadLen));
      if (head >= threadLen) lintel(Math.max(st.lintel, Math.min(1, (head - threadLen) / 20)));
    }
    // the new ember forms as the sun catches
    const e = Math.min(n, EMBERS);
    v.y = Math.min(e, (e - 1) + THREE.MathUtils.smoothstep(t, T.ember[0], T.ember[1]));
    st.embers = v.y;
    const tEnd = Math.max(T.end, T.top + (threadLen + 24) / THREAD_V);
    if (t >= tEnd) {
      t = -1; v.x = -1; v.y = e; st.embers = e; kept = n;
      uTh.value.set(-1, 1); lintel(1);
    }
    st.t = t;
  });

  function start(count, player) {
    n = count; fired = 0; t = 0; want = true;
    const v = uAct.value;
    v.z = n; v.w = n > 1 ? 1 : 0; v.x = 0; v.y = Math.min(n - 1, EMBERS);
    // the hand: where the look meets the glass (a ray against the mother's pieces), else the trunk toward the visitor
    const dx = player.pos.x - M.x, dz = player.pos.z - M.z, r = hyp(dx, dz) || 1;
    const rs = Math.max(mother.foot * 0.9, Math.min(r - 0.6, mother.foot * 1.1));
    uHand.value.set(M.x + (dx / r) * rs, player.pos.y - 0.35, M.z + (dz / r) * rs);
    uHandN.value.set(dx / r, 0, dz / r);
    const hit = touchAt(player);
    if (hit) {
      uHand.value.copy(hit.point);
      const nx = hit.n.x, nz = hit.n.z, nl = hyp(nx, nz);
      if (nl > 0.2) uHandN.value.set(nx / nl, 0, nz / nl);
    }
    st.hit = !!hit;
    st.n = n; st.t = 0;
    ctx.audio?.cue('act-crystal', { x: uHand.value.x, y: uHand.value.y, z: uHand.value.z }, { n });
  }

  const P = ctx.player;
  const near = 4.5, far = 10.5, cosCone = Math.cos(0.8);
  const handle = ctx.acts?.add({
    id: ID,
    at: { x: M.x, y: g0 + 1.6, z: M.z },
    reach: far, rise: 7,
    words: 'Lay your hand',
    // within arm's length of its foot (the trunk is 6-7 m from its axis) and looking at it, not up at the sky
    facing: (p) => {
      const dx = M.x - p.pos.x, dz = M.z - p.pos.z, r = hyp(dx, dz);
      if (r < near || r > far || p.pitch < -1.0 || p.pitch > 0.9) return false;
      return (-Math.sin(p.yaw) * dx - Math.cos(p.yaw) * dz) / r >= cosCone;
    },
    do: (count) => { start(count, P); return Math.max(T.end, T.top + (threadLen + 24) / THREAD_V); },
    show: (count) => {
      const e = Math.min(count, EMBERS);
      if (t < 0) uAct.value.y = e;
      kept = count; st.embers = e; st.n = count;
      if (count > 0) want = true;
      if (thread && t < 0) { thread.visible = count > 0; uTh.value.set(-1, count > 0 ? 1 : 0); lintel(count > 0 ? 1 : 0); }
    },
  });
  ctx.motherAct = st;
  st.handle = handle;
  st.state = () => ({ t: +st.t.toFixed(2), n: st.n, embers: +st.embers.toFixed(2), gutters: st.gutters, count: handle?.count ?? 0, offered: ctx.acts?.offered?.def.id === ID, thread: st.thread, threadLen: Math.round(st.threadLen), threadShown: !!thread?.visible, lintel: st.lintel });
  return { uniforms, glsl, filGlsl, filVert, state: st.state };
}
