// The mother crystal's act (v10-A1, #9): a hand laid on the 60 m crystal at the Lattice's heart. Registered from
// src/vegetation/lattice.js, which builds the mother (src/vegetation/mother.js) and owns the crystals' one material:
// this module adds three uniforms and some GLSL to that material and to the filaments', and draws one thing of its own,
// the thread (below).
//
// What answers ("Lay your hand", once a visit):
//   0-2 s     a handprint of light, twice a hand, lights in the glass where the look meets it, and veins of light run out of
//             it through the glass (act-crystal: the Lattice's A4 swelling);
//   1.6-5.6 s a band of glacial white climbs the trunk from the print to the apex and on through the haze, shaped by the
//             glass's veils, the tone climbing the harmonic series of A;
//   5.3 s     the sun gutters: at the press the sky's own clock is brought forward to then (ctx.sky.flicker.next), so the
//             music and the Hypogeum's lintel hear it coming: the crystal has drunk from the sun;
//   6.5-12 s  light in the veils of the whole crystal while a ring runs out through every crystal and filament of the field,
//             28 m a second, to the Lattice's edge 175 m off (act-crystal-ring);
//   6.5-15 s  out of the foot, on the side toward the Hypogeum, the thread (src/v10/thread.js): light running in the ground
//             over the moor, 30 m a second, small crystals pushing up along it, 250 m to the head of the tomb's stair and
//             down it under the bronze door, whose glyph row then glows the crystal's blue;
//   from the second hand: the ring comes back in from the field's edge, and when the thread has reached the door an
//             ember of the sun's colour runs back along it to the foot (the Reckoner's answer), where it becomes the new
//             ember; on the first hand the ember forms as the sun catches (14-17 s).
// Remembered: show(n) draws n embers (at most nine; from the tenth hand on all nine stay lit) round the trunk, 7 m up and
// 5.5 m apart, the thread kept (a dim seam with slow pulses toward the tomb and its crystals standing) and the lintel blue.
// A forget during an answer holds: the end of the answer lays the place out from the count as it is then.
//
// crystalAct(ctx, mother, M, ground) → { uniforms, glsl (the crystals' emissive), filGlsl / filVert (the filaments'),
// state() }. The thread is built on the first frame after ctx.hypogeum exists (the ruins build after the vegetation),
// drawn only once the hand has been laid; until then and while idle, the update is two comparisons.
import * as THREE from 'three';
import { hyp } from '../noise.js';
import { K } from '../vegetation/mother.js';
import { buildThread } from './thread.js';

const ID = 'mother-hand';
export const EMBERS = 9;            // embers drawn at most
export const EMBER_Y = [7, 5.5];    // metres up the trunk of the first, and between them
export const RING_V = 28, RING_R = 175; // the ring's speed (m/s) and how far it runs
export const THREAD_V = 30;         // the thread's head, m/s
export const BACK_V = 45;           // the ember coming back along it from the door (the second hand on), m/s
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
          float dh = (fpHm - hk) / 1.5;
          fpE += exp(-dh * dh) * clamp(uAct.y - fk, 0.0, 1.0);
        }
        float fpBreath = 0.85 + 0.15 * sin(uTime * 0.7 + fpHm * 0.3);
        totalEmissiveRadiance += vec3(1.0, 0.34, 0.09) * fpE * fpTrunk * fpBreath * (0.5 + 1.6 * smoothstep(0.3, 0.85, fpVeil)) * (1.0 - 0.5 * fres) * 2.4;
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
        float fpBand = exp(-db * db) * fpOn * (0.12 + 0.88 * smoothstep(0.06, 0.35, fpU)) * (1.0 - 0.5 * smoothstep(44.0, 64.0, hc)); // dim while it passes the eye (the print still reads) and as it goes into the haze
        float fpTrail = step(fpHm, hc) * step(h0 - 1.0, fpHm) * exp(-(hc - fpHm) / 10.0) * 0.06 * fpOn * smoothstep(0.35, 0.8, fpVeil);
        // the crystal drinking: all of it pale while the sun is down
        float fpDrink = smoothstep(5.6, 7.0, fpT) * (1.0 - smoothstep(12.0, 17.0, fpT)) * (0.03 + 0.3 * smoothstep(0.45, 0.85, fpVeil)); // light in the veils, not on the faces
        totalEmissiveRadiance += fpLit * fpTrunk * (fpPrint * 1.0 + fpVein * 0.6 + (fpBand * (0.35 + 1.1 * fpVeil) + fpTrail + fpDrink) * (0.4 + core));
        fpKeep = max(fpBand * 0.6, fpDrink * 0.4) * fpTrunk; // the band shows through the haze that hides the apex
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
  let thread = null;
  const lenOf = () => thread?.len ?? 260;
  // the answer's clock for a hand n: when the thread's head reaches the door, when the ember coming back (n > 1)
  // reaches the foot, when the new ember is formed, when it is over
  function times(n) {
    const arrive = T.top + lenOf() / THREAD_V;
    const backAt = arrive + 0.8, home = n > 1 ? backAt + lenOf() / BACK_V : 0;
    const ember = n > 1 ? [home, home + 2.5] : T.ember;
    return { arrive, backAt, home, ember, end: Math.max(T.end, ember[1] + 1, arrive + 3) };
  }
  function lintel(k) { // the glyph row's glow toward the crystal's blue (k 0..1)
    const gm = ctx.hypogeum?.glyphMat; if (!gm) return;
    if (!gm.userData.fpE0) gm.userData.fpE0 = gm.emissive.clone();
    gm.emissive.copy(gm.userData.fpE0).lerp(BLUE, k);
    st.lintel = k;
  }
  function keep(count) { // the place as a visit leaves it: embers, the thread kept or gone, the lintel
    const e = Math.min(count, EMBERS);
    uAct.value.y = e; st.embers = e; kept = count; st.n = count;
    if (thread) { thread.group.visible = count > 0; thread.set(-1, count > 0 ? 1 : 0, -1, 0); }
    lintel(count > 0 ? 1 : 0);
  }

  const flick = ctx.sky?.flicker;
  let t = -1, fired = 0, n = 0, kept = 0, want = false, tm = times(1);
  const cueAt = { x: M.x, y: g0 + 20, z: M.z };
  ctx.registerUpdate((dt, time) => {
    if (want && !thread) { // the ruins build after the vegetation: lay the thread on the first frame they are there
      if (!ctx.hypogeum) return;
      thread = buildThread(ctx, M, mother, ground, ctx.hypogeum);
      st.threadLen = thread.len; st.crystals = thread.crystals; st.path = thread; // for the renders and tests: at(s)
      if (t < 0) keep(kept); else tm = times(n);
    }
    if (thread && thread.group.visible) thread.uTh.value.w = time;
    if (t < 0) return; // idle: nothing more per frame
    t += dt;
    const v = uAct.value;
    v.x = t;
    if (!(fired & 2) && t >= T.top) { fired |= 2; ctx.audio?.cue('act-crystal-ring', cueAt, { n }); }
    if (!(fired & 4) && n > 1 && t >= T.back) { fired |= 4; ctx.audio?.cue('act-crystal-ring', cueAt, { n, back: true }); }
    // the thread's head runs from the foot to the door; the lintel turns blue as it arrives; from the second hand an
    // ember comes back along it from the door to the foot
    if (thread) {
      thread.group.visible = true;
      const head = (t - T.top) * THREAD_V, L = thread.len;
      const back = n > 1 && t >= tm.backAt ? L - (t - tm.backAt) * BACK_V : -1;
      thread.set(head < 0 ? -1 : Math.min(head, L + 30), Math.max(0, Math.min(1, kept)), back >= 0 ? back : -1, time);
      st.thread = Math.max(0, Math.min(1, head / L)); st.back = back;
      if (head >= L) lintel(Math.max(st.lintel, Math.min(1, (head - L) / 20)));
    }
    // the new ember forms as the sun catches (or as the Reckoner's ember reaches the foot); from the tenth hand on, all
    // nine stay lit and none re-forms
    const e = Math.min(n, EMBERS);
    v.y = n > EMBERS ? EMBERS : Math.min(e, (e - 1) + THREE.MathUtils.smoothstep(t, tm.ember[0], tm.ember[1]));
    st.embers = v.y;
    if (t >= tm.end) {
      t = -1; v.x = -1;
      keep(handle?.count ?? n); // the count now, not the one this answer began with: a forget during it holds
    }
    st.t = t;
  });

  function start(count, player) {
    n = count; fired = 0; t = 0; want = true; tm = times(n);
    const v = uAct.value;
    // the sun is to gutter as the light reaches the top: brought forward in the sky's own clock (unless it is guttering
    // already, or held for a render), so everything that listens to the gutter (the music, the lintel) hears it coming
    if (flick && flick.phase <= 0 && flick.hold == null && flick.next > T.gutter) { flick.next = T.gutter; st.gutters++; }
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
    lure: { x: M.x - 2, y: g0 + 0.2, z: M.z + 10 }, // the lure (acts.js) at the foot on the side the path comes up, not in the glass
    words: 'Lay your hand',
    // within arm's length of its foot (the trunk is 6-7 m from its axis) and looking at it, not up at the sky
    facing: (p) => {
      const dx = M.x - p.pos.x, dz = M.z - p.pos.z, r = hyp(dx, dz);
      if (r < near || r > far || p.pitch < -1.0 || p.pitch > 0.9) return false;
      return (-Math.sin(p.yaw) * dx - Math.cos(p.yaw) * dz) / r >= cosCone;
    },
    do: (count) => { start(count, P); return tm.end; },
    show: (count) => {
      if (count > 0) want = true;
      if (t < 0) keep(count); else kept = count; // during an answer: kept at its end (a forget holds)
    },
  });
  ctx.motherAct = st;
  st.handle = handle;
  st.state = () => ({ t: +st.t.toFixed(2), n: st.n, embers: +st.embers.toFixed(2), gutters: st.gutters, count: handle?.count ?? 0, offered: ctx.acts?.offered?.def.id === ID, thread: st.thread, threadLen: Math.round(st.threadLen), threadShown: !!thread?.group.visible, lintel: st.lintel, back: st.back ?? -1, crystals: st.crystals ?? 0 });
  return { uniforms, glsl, filGlsl, filVert, state: st.state };
}
