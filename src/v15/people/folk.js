// The Lappet's people (v15-P1): who lives under Carcanet Keep, one person to a story. Each stands where a quarter left
// a place for someone (ctx.quarrels.places, ctx.lees.places, ctx.pennyworth.places, the Rungs' records) or by a thing
// the plan names, never at a coordinate of its own. Each entry:
//   id, name, story     its id, what a villager would call them (an office, never a name), its file in stories/
//   place(ctx, plan, Q) → { x, y, z, yaw, ... } or null (its quarter is off)
//   body                the figure's make (src/v15/people/body.js)
//   props(P, base, fig, at, low)  what they hold or wear beyond the body, painted on their own bones
//   still(P, at, low)   what of theirs lies still in the world (bone 0: world coordinates)
//   init, update(fig, dt, t, cam, state)  the one thing they do, and what they do when you come within 6 m
//   colliders(fig)      what the walker cannot walk through
//
//   the burner     the Quarrels, at the Smoking Saint's stoke hole: rakes the fire in him with a long iron; she has
//                  put her own red cap on the smallest of the three heads waiting their turn (the-saint-in-the-kiln.md)
//   the copyist    the Quarrels, before the Unroofed House: a mason on a block with a Heliarch moulding and his copy of
//                  it side by side, the copy wrong, two more wrong ones by him; taps, sits back, compares (the-copyist.md)
//   the noon-drawer the Lees, at the fountain's kerb: bends to dip a jug into the noon and looks into it; two full
//                  jugs by her (noon-by-the-jug.md)
//   the child on the Leads  the Rungs, on the Low Rung's roof over its lane: a basket let down on a cord, an empty
//                  jug in it, waiting for the noon-drawer (noon-by-the-jug.md)
//   the dead-letter clerk  the Lees, behind the Lagan's counter: sorts the letters nobody collects, and holds one out
//                  to every stranger who comes near, and takes it back (the-dead-letters.md)
//   the dyer       the Rungs, the dyers' yard at the Tenter's foot: stirs the saffron vat, saffron to the elbows
//                  (the-wait-on-the-span.md: the cloth was dyed here)
//   the sounder of the wreck  the Pennyworth, at the Spilt Measure's door: his ear to the hull, tapping it, listening
//                  for the noon still in it; come close and he hushes you (the-spilt-measure.md)
//   the one who is leaving  the Pennyworth, at the Leave: her house's door on her back, looking back up at the
//                  village (the-door-on-her-back.md)
import * as THREE from 'three';
import { smoothstep, clamp } from '../../noise.js';
import { angDiff } from '../../fauna/uncanny/kit.js';
import { rgb, tone, mix3 } from '../../v7/workers/body.js';
import { ease, ramp } from '../../v7/workers/rig.js';
import { C, BONE, ARM } from './body.js';
import { letterAct, givePose } from './letter.js';

const yawOf = (fx, fz) => Math.atan2(fx, fz);
const norm = (x, z) => { const l = Math.hypot(x, z) || 1; return [x / l, z / l]; };
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _u = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _one = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler(), Z = new THREE.Vector3(0, 0, 1);
// the feet's floor at (x, z), near `hint`
const floorY = (ctx, x, z, hint) => { const f = ctx.controls.floorAt?.(x, z, hint + 0.3); return f && Number.isFinite(f.y) && Math.abs(f.y - hint) < 1.2 ? f.y : hint; };
// a prop's frame: at `o`, its +z along `dir` (unit), its +y kept as near up as it will go
function along(out, o, dir) { _q.setFromUnitVectors(Z, dir); return out.compose(o, _q, _one); }
// paint `emit` into the colour last toned (the noon: the only light any of them carries)
const glow = (P, k) => { P.mre = [P.mre[0], P.mre[1], k]; };
const lin = (a, b, t) => a + (b - a) * t;
const pulse = (t, a, b, c, d) => smoothstep(a, b, t) * (1 - smoothstep(c, d, t)); // 0 → 1 over a..b, back over c..d
const NOON = rgb('#e8f0c8'), NOON_D = rgb('#9ab08a'), CLAY = rgb('#8a5236'), CLAY_D = rgb('#4a2a1c'), IRON = rgb('#2a2624'), STONE_OLD = rgb('#8a8070'), STONE_NEW = rgb('#d8d2c2');

// a jug: round belly, neck, lip; `full` glows at its mouth (noon), `emit` how much
function jug(P, x, y, z, s, full, low) {
  tone(P, CLAY, 1, 0, 0.75);
  P.lathe(x, y, z, [[0.001, 0], [0.09 * s, 0.01], [0.13 * s, 0.09 * s], [0.12 * s, 0.17 * s], [0.06 * s, 0.24 * s], [0.055 * s, 0.3 * s], [0.07 * s, 0.32 * s]], low ? 7 : 10);
  if (full) { tone(P, NOON, 1, 0, 0.3); glow(P, 1.6); P.blob(x, y + 0.305 * s, z, 0.058 * s, 0.012 * s, 0.058 * s, low ? 6 : 8, 2); }
}

// (v16-V1, the critic: "from 20 m most folk are lost in walls") a lantern: an iron cap and ring, its horn glowing
// ember; painted like the noon (emit), no light of its own. What carries at dusk from 20 m where a figure does not
function lantern(P, x, y, z, low) {
  tone(P, IRON, 1, 0.6, 0.6); P.box(x, y + 0.16, z, 0.17, 0.025, 0.17); P.loft([[x, y + 0.17, z], [x, y + 0.27, z]], [0.009, 0.009], 3, 0, true);
  P.box(x, y - 0.14, z, 0.15, 0.025, 0.15);
  tone(P, rgb('#ffa448'), 1, 0, 0.4); glow(P, 3.2); P.blob(x, y, z, 0.075, 0.135, 0.075, low ? 6 : 8, 4);
}

export const FOLK = [
  // ---------------------------------------------------------------- the burner
  {
    id: 'burner', name: 'the burner', story: 'the-saint-in-the-kiln.md',
    place(ctx, plan, Q) {
      const st = Q.quarrels?.places?.stoke?.at; if (!st) return null;
      const K = plan.QUARRELS.kiln, [fx, fz] = norm(K.x - st[0], K.z - st[2]);
      return { x: st[0], y: floorY(ctx, st[0], st[2], st[1]), z: st[2], yaw: yawOf(fx, fz) };
    },
    body: { pose: 'stand', robe: { cloth: C.undyed, dark: rgb('#4a4236'), seed: 2.1, patch: 0.12, dust: [C.lime, 0.55] }, apron: C.leather, rolled: true, forearm: C.skinD, hand: C.skinD, hairC: C.grey, mask: rgb('#8a8070'), sign: true, girth: 1.05 },
    // the rake: an iron rod 2 m, its blade at the far end (+z)
    props(P, base) {
      P.bone(base + BONE.prop);
      tone(P, IRON, 1, 0.6, 0.6); P.loft([[0, 0, 0], [0, 0, 2.0]], [0.02, 0.018], 5, 0, true);
      tone(P, rgb('#3a1a10'), 1, 0.5, 0.6); P.box(0, -0.06, 2.0, 0.36, 0.15, 0.03);
      tone(P, C.wood, 1, 0, 0.8); P.loft([[0, 0, -0.02], [0, 0, 0.5]], [0.032, 0.032], 6, 0, true); // a wooden grip
    },
    // her cap, on the smallest of the three heads that wait: red felt, a turquoise band
    still(P, at, low, plan) {
      const [run, s, D, r] = plan.QUARRELS.heads[2], [x, z] = plan.at(run, s, D), y = plan.LEVEL.crown.y - r * 0.12 + r * 1.92;
      tone(P, C.ox, 1, 0, 0.9); P.loft([[x, y - 0.02, z], [x + 0.02, y + 0.2, z - 0.01]], [0.13, 0.1], low ? 8 : 12, 0, true);
      tone(P, C.turq, 1, 0, 0.7); P.ring(x, y + 0.02, z, 0.13, 0.014, low ? 10 : 14, 3);
    },
    init: () => ({ t: 0, push: 0, wipe: 0, strokes: 0 }),
    update(f, dt, t, cam, S) {
      f.look(cam, dt, 6, 0, 0.3);
      S.t += dt;
      const near = f.lookK > 0.3, cyc = 2.4, rest = 4;           // four strokes, then a rest
      const T = S.t % (cyc * 4 + rest), k = T < cyc * 4 ? (T % cyc) / cyc : -1;
      const want = near || k < 0 ? 0 : pulse(k, 0.05, 0.4, 0.55, 0.95);
      S.push = ramp(S.push, want, 2.5, dt);
      S.wipe = ramp(S.wipe, !near && k < 0 && T > cyc * 4 + 0.6 && T < cyc * 4 + rest - 0.8 ? 1 : 0, 2, dt);
      const p = S.push;
      f.lean = 0.12 + 0.22 * p; f.twist = -0.12;
      const tip = _v.set(0.02, 0.6, 1.12 + 0.42 * p), u = _u.set(0.1, -0.24, 1).normalize();
      const butt = _w.copy(tip).addScaledVector(u, -2.0);
      along(f.propL, butt, u);
      f.hR.copy(butt).addScaledVector(u, 0.45);
      f.hL.copy(butt).addScaledVector(u, 0.95).lerp(_v.set(0.04, 1.62, 0.14), S.wipe); // (or her wrist to her brow)
    },
    colliders: (f) => [{ x: f.x, z: f.z, r: 0.2, y: f.y, h: 1.8, stand: false }], // (0.2: at 0.3 the geometry walk's stand by her stepped out to where a keep block's back shows)
  },

  // ---------------------------------------------------------------- the copyist
  {
    id: 'copyist', name: 'the copyist', story: 'the-copyist.md', tell: [0.58, 0.81, 0.74], // (v16-V1) what of them carries from 20 m, in their own frame (tools/folk-frames.mjs)
    place(ctx, plan, Q) {
      if (!Q.quarrels?.places) return null;
      const p = plan.plot('new-house'), [fx, fz] = p.face, rx = -fz, rz = fx;
      // before the Unroofed House's west end, on the brink, facing along its front toward its door (v15-W2: at the east
      // end he sat in the mouth of the scaffold's way up, which is climbed now; this end is 1.4 m clear all round)
      const x = p.x + fx * (p.d / 2 + 0.75) - rx * 3, z = p.z + fz * (p.d / 2 + 0.75) - rz * 3;
      return { x, y: floorY(ctx, x, z, plan.LEVEL.crown.y), z, yaw: yawOf(rx, rz) };
    },
    body: { pose: 'sit', hs: 0.46, robe: { cloth: C.undyed, dark: rgb('#3e382e'), seed: 4.4, patch: 0.15, dust: [C.lime, 0.35] }, apron: C.leather, rolled: true, legs: rgb('#6a5a44'), hat: 'cap', hatC: rgb('#7a6a4a'), beard: true, hairC: rgb('#3a2a1e'), belly: 0.4, sign: true },
    props(P, base, f, at, low) {
      // his seat, a block of the keep's ashlar
      P.bone(base + BONE.place);
      tone(P, STONE_NEW, 0.82, 0, 0.9); P.box(0, 0.22, -0.02, 0.52, 0.44, 0.42);
      // before him, on two blocks at his knees: the Heliarchs' moulding (dark, the egg and the tongue, exact) and his copy (pale, wrong)
      const mould = (cx, old, seed) => {
        tone(P, old ? STONE_OLD : STONE_NEW, old ? 1 : 0.95, 0, 0.9); P.box(cx, 0.28, 0.72, 0.62, 0.56, 0.4);
        P.box(cx, 0.61, 0.79, 0.62, 0.1, 0.32);                     // the fillet over it
        const n = 5;
        for (let i = 0; i < n; i++) {
          const h = old ? 0 : Math.sin(i * 2.3 + seed) * 0.5 + 0.5, gone = !old && i === 2 + (seed % 2);
          const x = cx - 0.24 + (i / (n - 1)) * 0.48 + (old ? 0 : (h - 0.5) * 0.03);
          if (!gone) P.blob(x, 0.43 + (old ? 0 : (h - 0.5) * 0.05), 0.93, old ? 0.045 : 0.03 + 0.03 * h, old ? 0.075 : 0.05 + 0.04 * (1 - h), 0.04, low ? 6 : 8, 4);
          if (i < n - 1) P.box(x + 0.06, 0.43, 0.925, 0.012, old ? 0.12 : 0.07 + 0.06 * h, 0.03); // the tongue between
        }
        P.box(cx, 0.31, 0.93, 0.62, 0.025, 0.02);                    // a bead under
      };
      mould(0.36, true, 0); mould(-0.38, false, 1);
      lantern(P, 0.58, 0.81, 0.74, low); // (v16-V1) his lantern on the old moulding's fillet, to see the egg and the tongue by
      // the two that went wrong before, on the ground at his left, one on its side
      for (const [x, z, a, s] of [[0.95, 0.15, 0.5, 2], [1.05, -0.45, 1.3, 3]]) {
        tone(P, STONE_NEW, 0.9, 0, 0.9); P.box(x, 0.17, z, 0.55, 0.34, 0.36, a);
        for (let i = 0; i < 4; i++) { const h = Math.sin(i * 1.7 + s) * 0.5 + 0.5, ox = (i - 1.5) * 0.12; P.blob(x + Math.cos(a) * ox + Math.sin(a) * 0.19, 0.22 + 0.04 * h, z - Math.sin(a) * ox + Math.cos(a) * 0.19, 0.03 + 0.02 * h, 0.05, 0.03, 5, 3); }
      }
      // the mallet in his right fist, the chisel in his left
      P.bone(base + BONE.rF);
      tone(P, C.wood, 1, 0, 0.8); P.loft([[0, -ARM.fore + 0.03, 0.02], [0, -ARM.fore - 0.03, 0.12]], [0.014, 0.014], 5, 0, true);
      tone(P, rgb('#7a5a3a'), 1, 0, 0.8); P.loft([[-0.07, -ARM.fore - 0.03, 0.14], [0.07, -ARM.fore - 0.03, 0.14]], [0.04, 0.04], 6, 0, true);
      P.bone(base + BONE.lF);
      tone(P, IRON, 1, 0.6, 0.5); P.loft([[0, -ARM.fore + 0.06, 0.02], [0, -ARM.fore - 0.12, 0.03]], [0.009, 0.006], 4, 0, true);
    },
    init: () => ({ t: 0, strike: 0, cmp: 0 }),
    update(f, dt, t, cam, S) {
      S.t += dt;
      const T = S.t % 11, work = T < 6.5;
      // six blows, then he sits back and looks from theirs to his and back, and shakes his head
      const b = work ? (T % 0.9) / 0.9 : 0;
      S.strike = work ? (b < 0.7 ? ease(b / 0.7) : 1 - ease((b - 0.7) / 0.3)) : ramp(S.strike, 0, 2, dt);
      S.cmp = ramp(S.cmp, work ? 0 : 1, 1.5, dt);
      const cmpYaw = T < 6.5 ? 0 : T < 8 ? -0.45 : T < 9.3 ? 0.4 : -0.45 + 0.12 * Math.sin((T - 9.3) * 14) * (1 - smoothstep(9.8, 10.6, T));
      f.look(cam, dt, 6, lin(-0.35, cmpYaw, S.cmp), lin(0.55, 0.35, S.cmp));
      f.lean = lin(0.42, 0.12, S.cmp); f.twist = lin(-0.25, 0, S.cmp);
      const hs = 0.46, chisel = _v.set(-0.38 + 0.06, 0.44 + 0.06, 0.9);  // the chisel's edge on his copy's third egg
      f.hL.set(chisel.x + 0.03, hs + 0.25, chisel.z - 0.12).lerp(_w.set(0.15, hs + 0.15, 0.32), S.cmp);
      f.hR.set(chisel.x - 0.06, hs + 0.3 + 0.2 * S.strike, chisel.z - 0.24 - 0.06 * S.strike).lerp(_w.set(-0.18, hs + 0.13, 0.3), S.cmp);
    },
    colliders: (f) => [{ x: f.x, z: f.z, r: 0.35, y: f.y, h: 1.2, stand: false }, ...[[0.36, 0.72], [-0.38, 0.72], [1.0, -0.15]].map(([lx, lz]) => { const p = f.toWorld(_v.set(lx, 0, lz), _w); return { x: p.x, z: p.z, r: 0.38, y: f.y, h: 0.66 }; })],
  },

  // ---------------------------------------------------------------- the noon-drawer
  {
    id: 'noon-drawer', name: 'the noon-drawer', story: 'noon-by-the-jug.md', tell: [0, 0.95, 0.3], // (v16-V1) what of them carries from 20 m, in their own frame (tools/folk-frames.mjs)
    place(ctx, plan, Q) {
      const L = Q.lees; if (!L?.fountain) return null;
      const k = L.places.find((p) => /fountain's kerb/.test(p.what)); if (!k) return null;
      const [fx, fz] = norm(L.fountain.x - k.x, L.fountain.z - k.z), x = k.x - fx * 0.55, z = k.z - fz * 0.55;
      return { x, y: floorY(ctx, x, z, L.fountain.y), z, yaw: yawOf(fx, fz), kerb: k.y - L.fountain.y };
    },
    body: { pose: 'stand', robe: { cloth: C.saffron, dark: rgb('#5a3a14'), seed: 6.2, patch: 0.12 }, hat: 'kerchief', hairC: C.grey, skin: C.skinD, hand: C.skinD, girth: 1 },
    props(P, base, f, at, low) {
      P.bone(base + BONE.prop); jug(P, 0, -0.16, 0, 1.15, true, low);
      // two jugs drawn already, by her left knee, and the yoke they hang from
      P.bone(base + BONE.place);
      jug(P, 0.42, 0, 0.18, 1.15, true, low); jug(P, 0.55, 0, -0.16, 1.1, true, low);
      tone(P, C.woodP, 0.8, 0, 0.85); P.loft([[0.35, 0.03, -0.55], [0.82, 0.03, 0.42]], [0.03, 0.03], 5, 0, true);
    },
    init: () => ({ t: 1.5, dip: 0, peer: 0 }),
    update(f, dt, t, cam, S) {
      S.t += dt;
      const T = S.t % 10, near = f.lookK > 0.4;
      const dip = near ? 0 : pulse(T, 1.0, 2.6, 4.4, 5.8), peer = near ? 0 : pulse(T, 5.4, 6.4, 8.8, 9.6);
      S.dip = ramp(S.dip, dip, 1.5, dt); S.peer = ramp(S.peer, peer, 1.5, dt);
      f.look(cam, dt, 6, 0, lin(0.3, 0.75, Math.max(S.dip, S.peer)));
      f.lean = 0.1 + 0.8 * S.dip + 0.08 * S.peer;
      const jp = _v.set(0, 0.92, 0.3).lerp(_w.set(0, 0.62, 0.62), S.dip).lerp(_w.set(0, 1.22, 0.3), S.peer);
      f.propL.makeRotationX(0.5 * S.dip).setPosition(jp);
      f.hR.set(jp.x - 0.13, jp.y, jp.z - 0.02); f.hL.set(jp.x + 0.13, jp.y, jp.z - 0.02);
    },
    colliders: (f) => [{ x: f.x, z: f.z, r: 0.32, y: f.y, h: 1.8, stand: false }],
  },

  // ---------------------------------------------------------------- the child on the Leads
  {
    id: 'child-leads', name: 'the child on the Leads', story: 'noon-by-the-jug.md',
    place(ctx, plan, Q) {
      const R = Q.rungs?.records?.['rungs-low-2'], p = plan.plot('rungs-low-2'); if (!R?.front || !p) return null;
      const [fx, fz] = p.face, rx = -fz, rz = fx, lx = R.front.x0 + 1.0, lz = R.front.zf, top = p.y + R.front.h, k = 0.62, hs = 0.45;
      const x = p.x + rx * lx + fx * (lz - 0.33 * k), z = p.z + rz * lx + fz * (lz - 0.33 * k);
      return { x, y: top - hs * k, z, yaw: yawOf(fx, fz), scale: k, top, lane: p.y };
    },
    body: { pose: 'sit', hs: 0.45, dangle: true, bare: true, robe: { cloth: C.turq, dark: rgb('#123a38'), seed: 8.3, patch: 0.12 }, headR: 0.118, bun: true, legs: C.rose, skin: C.skinP, hand: C.skinP },
    props(P, base, f, at, low) {
      // the cord from her fists to the basket, the basket, and in it a jug, empty
      P.bone(base + BONE.prop);
      const L = at.top - 0.3 + 0.03 - (at.lane + 1.95), s = low ? 7 : 10;
      tone(P, C.rope, 1, 0, 0.9); P.loft([[0, 0.12, 0], [0, -L, 0]], [0.008, 0.008], 3, 0, true);
      P.loft([[0, -L, 0], [-0.15, -L - 0.12, 0], [-0.17, -L - 0.2, 0]], [0.008, 0.008, 0.008], 3, 0, true);
      P.loft([[0, -L, 0], [0.15, -L - 0.12, 0], [0.17, -L - 0.2, 0]], [0.008, 0.008, 0.008], 3, 0, true);
      tone(P, rgb('#8a6a3a'), 1, 0, 0.95);
      P.lathe(0, -L - 0.42, 0, [[0.001, 0], [0.13, 0.01], [0.17, 0.08], [0.18, 0.22], [0.165, 0.22], [0.155, 0.04], [0.001, 0.04]], s);
      tone(P, rgb('#6a4a24'), 1, 0, 0.95); P.ring(0, -L - 0.32, 0, 0.175, 0.012, s, 3); P.ring(0, -L - 0.22, 0, 0.18, 0.014, s, 3);
      jug(P, 0, -L - 0.38, 0.0, 0.85, false, low);
      f.cordL = L;
    },
    init: () => ({ t: 0, haul: 0, tug: 0 }),
    update(f, dt, t, cam, S) {
      S.t += dt;
      const d = f.look(cam, dt, 7, 0, 0.75, 1.3), wants = f.lookK;
      const T = S.t % 12;
      S.haul = ramp(S.haul, pulse(T, 1, 2.4, 5, 6.5), 0.8, dt);
      S.tug = ramp(S.tug, wants, 2, dt);
      const bob = 0.03 * Math.sin(S.t * 2.1) + S.tug * 0.06 * Math.max(0, Math.sin(S.t * 9));
      const hs = 0.45, up = (S.haul * 0.45 + bob) / f.k;
      f.lean = 0.25; f.hr = 0;
      f.hR.set(-0.03, hs + 0.12 + up, 0.5); f.hL.set(0.03, hs + 0.28 + up * 0.6 + 0.1 * S.haul, 0.47);
      // the cord hangs from her right fist, swinging a little
      f.placeNow(); const hw = f.toWorld(_v.copy(f.hR), _w), sw = 0.05 * Math.sin(S.t * 1.3);
      f.propWorld = true; f.propL.makeRotationFromEuler(_e.set(sw * 0.6, f.yaw, sw)).setPosition(hw);
    },
    colliders: (f) => [{ x: f.x, z: f.z, r: 0.25, y: f.top - 0.2, h: 0.9, stand: false }],
  },

  // ---------------------------------------------------------------- the dead-letter clerk
  {
    id: 'clerk', name: 'the dead-letter clerk', story: 'the-dead-letters.md', tell: [0, 1.36, 0.45], // (v16-V1) what of them carries from 20 m, in their own frame (tools/folk-frames.mjs)
    place(ctx, plan, Q) {
      const h = Q.lees?.places?.find((p) => p.shop === 'lees-shop-4'), p = plan.plot('lees-shop-4'); if (!h || !p) return null;
      const x = h.x - p.face[0] * 0.38, z = h.z - p.face[1] * 0.38; // (in the vault behind the pigeonholes: seen through them, and through the hatch among them)
      return { x, y: floorY(ctx, x, z, plan.LEVEL.bench.y), z, yaw: yawOf(p.face[0], p.face[1]), hatch: h.hatch, ledger: h.ledger, face: p.face };
    },
    body: { pose: 'stand', robe: { cloth: rgb('#4a5468'), dark: rgb('#1e2230'), seed: 9.1, patch: 0.08 }, sleeve: rgb('#1a1612'), hat: 'skull', beard: true, hairC: C.grey, girth: 0.88, sign: true },
    props(P, base) {
      // a letter in his right hand: cream, sealed in red (on the prop bone, which follows his forearm: given, it goes)
      P.bone(base + BONE.prop);
      tone(P, rgb('#e2d6b8'), 1, 0, 0.8); glow(P, 0.06); P.box(0, -ARM.fore - 0.1, 0.03, 0.2, 0.15, 0.008);
      tone(P, C.pom, 1, 0, 0.5); P.blob(0, -ARM.fore - 0.1, 0.036, 0.022, 0.022, 0.007, 5, 2);
    },
    init: (f, at, ctx) => { const S = { t: 0, phase: 'sort', pt: 0, armed: true, offers: 0, offer: 0, read: 0, reach: 0, g: -1 }; letterAct(ctx, f, at, S); return S; },
    update(f, dt, t, cam, S) {
      S.t += dt; S.pt += dt;
      if (S.handle?.done) S.armed = false; // his letter taken this visit: he holds no more out
      const dx = cam.x - f.x, dz = cam.z - f.z, d = Math.hypot(dx, dz), front = Math.abs(angDiff(Math.atan2(dx, dz), f.yaw)) < 1.2;
      if (d > 8) S.armed = true;
      if (S.phase !== 'offer' && S.armed && d < 4.5 && front) { S.phase = 'offer'; S.pt = 0; S.armed = false; S.offers++; }
      if (S.phase === 'offer' && S.pt > 2.8) { S.phase = 'doubt'; S.pt = 0; }
      if (S.phase === 'doubt' && S.pt > 2.4) { S.phase = 'sort'; S.pt = 0; }
      const T = S.t % 10;
      S.offer = ramp(S.offer, S.phase === 'offer' ? 1 : 0, 1.6, dt);
      S.reach = ramp(S.reach, S.phase === 'sort' ? pulse(T, 0.3, 1.2, 1.8, 2.8) : 0, 1.8, dt);
      S.read = ramp(S.read, S.phase === 'doubt' ? 1 : S.phase === 'sort' ? pulse(T, 3, 4, 8, 9) : 0, 1.5, dt);
      f.look(cam, dt, S.phase === 'sort' ? 3 : 7, -0.1, lin(0.15, 0.5, S.read));
      if (S.phase === 'doubt') f.hy += 0.16 * Math.sin(S.pt * 11) * (1 - smoothstep(0.8, 1.6, S.pt)) * (1 - f.lookK * 0.5);
      f.lean = 0.04 + 0.32 * S.offer; f.twist = -0.35 * S.reach;
      f.hR.set(-0.14, 1.0, 0.16).lerp(_v.set(-0.06, 1.24, 0.24), S.read).lerp(_v.set(-0.24, 1.72, -0.3), S.reach).lerp(_v.set(-0.02, 1.36, 0.7), S.offer);
      f.hL.set(0.13, 1.0, 0.18).lerp(_v.set(0.06, 1.2, 0.26), S.read);
      if (S.g >= 0) givePose(f, S, dt, cam); // "Take his letter" (src/v15/people/letter.js)
      const rF = f.b[BONE.rF]; f.propWorld = true; // the letter follows his forearm (a frame behind); not yet posed, or given: hidden
      if (rF.elements[12] === 0 && rF.elements[14] === 0) f.propL.makeScale(1e-4, 1e-4, 1e-4).setPosition(f.x, f.y, f.z);
      else { f.propL.copy(rF); if (S.g >= 0.1 && S.g < 5.5) f.propL.scale(_u.setScalar(1e-4)); }
    },
    colliders: (f) => [{ x: f.x, z: f.z, r: 0.28, y: f.y, h: 1.8, stand: false }],
  },

  // ---------------------------------------------------------------- the dyer
  {
    id: 'dyer', name: 'the dyer', story: 'the-wait-on-the-span.md', tell: [-0.05, 2.6, -0.1], // (v16-V1) what of them carries from 20 m, in their own frame (tools/folk-frames.mjs)
    place(ctx, plan, Q) {
      if (!Q.rungs?.records) return null;
      const y = plan.plot('rungs-dyers'), run = 2, R = plan.RUN[run], [vx, vz] = plan.at(run, y.s - 1.25, plan.RISERS[2].D + 2.3);
      const ox = -0.6 * R.dir[0] + 0.8 * R.n[0], oz = -0.6 * R.dir[1] + 0.8 * R.n[1], x = vx + ox * 0.98, z = vz + oz * 0.98;
      return { x, y: floorY(ctx, x, z, plan.LEVEL.low.y), z, yaw: yawOf(-ox, -oz), vat: 0.98, vatTop: 0.72 };
    },
    body: { pose: 'stand', robe: { cloth: C.undyed, dark: rgb('#4a3a2a'), seed: 3.3, patch: 0.1 }, apron: C.madder, rolled: true, forearm: rgb('#c88a1a'), hand: rgb('#c88a1a'), hat: 'kerchief', hatC: C.madder, beard: true, girth: 1.08, belly: 0.5 },
    props(P, base) {
      P.bone(base + BONE.prop);
      tone(P, C.woodP, 0.75, 0, 0.85); P.loft([[0, 0, 0.1], [0, 0, 1.95]], [0.024, 0.022], 5, 0, true);
      tone(P, rgb('#b07a18'), 1, 0, 0.6); P.box(0, 0, 0.12, 0.13, 0.02, 0.26);       // its paddle, the dye on it
      // (v16-V1) over her, the drying pole: three hanks of saffron wool, wet, hung high where they carry over the walls
      P.bone(base + BONE.place);
      tone(P, C.woodP, 0.7, 0, 0.9); P.loft([[-0.55, 0, -0.45], [-0.55, 3.15, -0.45]], [0.035, 0.03], 5, 0, true); P.loft([[-0.55, 3.0, -0.45], [0.45, 3.02, 0.25]], [0.025, 0.022], 5, 0, true);
      tone(P, C.saffron, 1, 0, 0.75); glow(P, 0.12);
      for (const [k, l] of [[0.22, 0.8], [0.5, 0.95], [0.78, 0.72]]) { const x = -0.55 + k, z = -0.45 + k * 0.7; P.box(x, 2.97 - l / 2, z, 0.13, l, 0.06); }
    },
    init: () => ({ t: 0, stir: 1 }),
    update(f, dt, t, cam, S) {
      S.t += dt;
      f.look(cam, dt, 6, 0, 0.55);
      S.stir = ramp(S.stir, f.lookK > 0.5 ? 0.25 : 1, 0.8, dt);
      S.a = (S.a || 0) + dt * 1.7 * S.stir;
      const at = f.spec.at, tip = _v.set(0.2 * Math.cos(S.a), at.vatTop - 0.2, at.vat + 0.2 * Math.sin(S.a)), top = _w.set(-0.08, 1.62, -0.05);
      const u = _u.subVectors(top, tip).normalize();
      along(f.propL, tip, u);
      f.hR.copy(tip).addScaledVector(u, 0.75); f.hL.copy(tip).addScaledVector(u, 1.2);
      f.lean = 0.2 + 0.04 * Math.sin(S.a); f.twist = 0.08 * Math.cos(S.a);
    },
    colliders: (f) => [{ x: f.x, z: f.z, r: 0.3, y: f.y, h: 1.8, stand: false }],
  },

  // ---------------------------------------------------------------- the sounder of the wreck
  {
    id: 'sounder', name: 'the sounder of the wreck', story: 'the-spilt-measure.md', tell: [0.45, 1.78, 0.36], // (v16-V1) what of them carries from 20 m, in their own frame (tools/folk-frames.mjs)
    place(ctx, plan, Q) {
      const dpl = Q.pennyworth?.places?.find((p) => /Spilt Measure/.test(p.name)), p = plan.plot('carrier-house'); if (!dpl || !p) return null;
      const [fx, fz] = p.face, tx = -fz, tz = fx, x = dpl.x - fx * 0.62 - tx * 1.5, z = dpl.z - fz * 0.62 - tz * 1.5; // (the door's record stands a metre out from the hull: he stands at the hull, beside it)
      return { x, y: floorY(ctx, x, z, dpl.y), z, yaw: yawOf(-fx, -fz) };
    },
    body: { pose: 'stand', robe: { cloth: C.madder, dark: rgb('#2a1410'), seed: 5.7, patch: 0.08 }, hair: false, beard: true, beardC: C.white, skin: C.skinD, hand: C.skinD, girth: 1.12, belly: 0.7, sash: C.saffron },
    props(P, base) {
      P.bone(base + BONE.rF); // a tapping hammer, small, its head brass
      tone(P, C.wood, 1, 0, 0.8); P.loft([[0, -ARM.fore + 0.03, 0.01], [0, -ARM.fore - 0.02, 0.15]], [0.011, 0.011], 4, 0, true);
      tone(P, rgb('#b08a3e'), 1, 0.7, 0.4); P.loft([[-0.04, -ARM.fore - 0.02, 0.16], [0.04, -ARM.fore - 0.02, 0.16]], [0.022, 0.022], 6, 0, true);
      // (v16-V1, the critic: "light at the wreck's door would have made me look") his lantern, on a nail in the hull by his ear
      P.bone(base + BONE.place); lantern(P, 0.45, 1.78, 0.36, false);
    },
    init: () => ({ t: 0, phase: 'listen', pt: 0, armed: true, hush: 0, tap: 0, hushes: 0 }),
    update(f, dt, t, cam, S) {
      S.t += dt; S.pt += dt;
      const d = Math.hypot(cam.x - f.x, cam.z - f.z);
      if (d > 7) S.armed = true;
      if (S.phase === 'listen' && S.armed && d < 5) { S.phase = 'hush'; S.pt = 0; S.armed = false; S.hushes++; }
      if (S.phase === 'hush' && S.pt > 3.2) { S.phase = 'listen'; S.pt = 0; }
      S.hush = ramp(S.hush, S.phase === 'hush' ? 1 : 0, 2.2, dt);
      const T = S.t % 5;
      S.tap = S.phase === 'listen' ? Math.max(pulse(T, 0, 0.08, 0.12, 0.3), pulse(T, 0.45, 0.53, 0.57, 0.75)) : 0;
      f.look(cam, dt, S.phase === 'hush' ? 8 : 0, 1.3, 0.05, 1.3);
      f.hr = 0.3 * (1 - S.hush); f.lean = 0.3 - 0.15 * S.hush; f.twist = 0.25 * (1 - S.hush);
      f.hL.set(0.16, 1.42, 0.4).lerp(_v.set(0.02, 1.5, 0.22), S.hush);
      f.hR.set(-0.2, 1.02, 0.3 + 0.08 * S.tap);
    },
    colliders: (f) => [{ x: f.x, z: f.z, r: 0.34, y: f.y, h: 1.8, stand: false }],
  },

  // ---------------------------------------------------------------- the one who is leaving
  {
    id: 'leaver', name: 'the one who is leaving', story: 'the-door-on-her-back.md', tell: [0.66, 2.4, -0.3], // (v16-V1) what of them carries from 20 m, in their own frame (tools/folk-frames.mjs)
    place(ctx, plan, Q) {
      const L = Q.pennyworth?.places?.find((p) => p.name === 'the Leave'), fx0 = plan.fixture('leave-east'); if (!L || !fx0) return null;
      const [fx, fz] = fx0.face, sx = fz, sz = -fx, x = L.x + fx * 3.6 - sx * 1.1, z = L.z + fz * 3.6 - sz * 1.1; // (past the posts, at the kerb's west edge: off the track's middle, which roads-test keeps clear)
      return { x, y: floorY(ctx, x, z, L.y), z, yaw: yawOf(fx, fz) - 0.15 }; // (her back, and the door on it, to the village)
    },
    body: { pose: 'stand', robe: { cloth: C.rose, dark: rgb('#4a2028'), seed: 7.4, patch: 0.12 }, hat: 'straw', sash: C.turq, girth: 0.95, sign: true },
    props(P, base, f, at, low) {
      // her house's door, on her back on two cords: turquoise gone grey, iron studs, a brass ring for a knocker
      P.bone(base + BONE.torso);
      // (v16-V1: a whole door, 0.84 by 2.02, standing half a metre over her hat and wider than her shoulders, so that from
      // in front of her it reads as a door: its top rail, strap hinges and studs on the side toward her are the ones seen)
      const M = new THREE.Matrix4().makeRotationX(-0.1).setPosition(0, 1.32, -0.31);
      P.xf(M);
      tone(P, mix3(C.turq, C.undyed, 0.25), 0.85, 0, 0.85); P.box(0, 0, 0, 0.84, 2.02, 0.05);
      tone(P, mix3(C.turq, C.dark, 0.5), 1, 0, 0.85); for (const y of [-0.7, 0.05, 0.75]) P.box(0, y, -0.035, 0.8, 0.1, 0.03); // its ledges, behind
      P.box(0, 0.86, 0.035, 0.8, 0.12, 0.03); P.box(0, 0.98, 0.012, 0.86, 0.06, 0.07);           // its top rail toward her, a worn head
      tone(P, IRON, 1, 0.6, 0.6); for (const y of [-0.85, 0.85]) for (const x of [-0.32, 0, 0.32]) P.blob(x, y, -0.035, 0.018, 0.018, 0.012, 4, 2);
      for (const y of [0.7, -0.75]) { P.box(-0.12, y, 0.032, 0.62, 0.045, 0.012); P.blob(-0.42, y, 0.02, 0.03, 0.04, 0.03, 4, 2); } // strap hinges and their pins
      for (const x of [-0.3, -0.1, 0.1, 0.3]) P.blob(x, 0.86, 0.052, 0.016, 0.016, 0.01, 4, 2);
      tone(P, rgb('#c8a050'), 1, 0.8, 0.35); P.ring(0, 0.05, -0.06, 0.06, 0.009, low ? 8 : 12, 3); P.xf(null);
      // the cords over her shoulders and round her
      tone(P, C.rope, 1, 0, 0.9);
      for (const s of [-1, 1]) P.loft([[s * 0.13, 1.42, -0.27], [s * 0.15, 1.45, 0.02], [s * 0.12, 1.3, 0.17], [s * 0.1, 1.04, 0.2], [s * 0.18, 1.0, -0.25]], [0.013, 0.013, 0.013, 0.013, 0.013], 3, 0, false);
      // (v16-V1) a lantern on a stick off the door's top corner, out over her shoulder: she goes at dusk, and it shows the door
      tone(P, C.wood, 1, 0, 0.85); P.loft([[0.3, 2.18, -0.36], [0.66, 2.62, -0.3]], [0.014, 0.012], 4, 0, true);
      lantern(P, 0.66, 2.4, -0.3, low);
      // a bundle tied to the door's top
      tone(P, C.undyed, 0.8, 0, 0.9); P.blob(0.05, 2.42, -0.42, 0.2, 0.14, 0.13, low ? 6 : 8, 4);
    },
    init: () => ({ t: 0, shrug: 0 }),
    update(f, dt, t, cam, S) {
      S.t += dt;
      const T = S.t % 7;
      S.shrug = pulse(T, 0.2, 0.7, 0.9, 1.6);
      f.twist = -0.42; f.lean = -0.04 - 0.05 * S.shrug;
      f.look(cam, dt, 6, -1.2, -0.12 + 0.04 * Math.sin(S.t * 0.4), 1.2);
      f.hR.set(-0.11, 1.26 + 0.04 * S.shrug, 0.19); f.hL.set(0.11, 1.0, 0.21);
    },
    colliders: (f) => [{ x: f.x, z: f.z, r: 0.42, y: f.y, h: 2.1, stand: false }],
  },
];
