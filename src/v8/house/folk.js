// v8-05 the Pomegranate House's people: Late folk in patched colour, each with the sign (the crescent and the pomegranate)
// sewn on somewhere and sewn wrong: the pomegranate under the horns instead of in them. One rigged mesh each (the v7
// workers' rig: src/v7/workers/rig.js, body.js), their bones posed per frame from small state machines that
// src/v8/house.js runs. Every figure is in its own local frame: origin on the ground under the feet or the seat, +z
// forward, its right hand at -x.
//
//   host      at the gate, standing, a tall red felt cap and a paunch. He turns to face you within 25 m. Coming in
//             (within 6 m, from outside the court) he bows you in, deep, a hand on his heart and the other swept out
//             behind; going out through the gate he gives you a nod of a sixth the depth and holds out a palm.
//   patrons   two at the hex-paver table outside the gate, over a board: the winner (saffron) stacks his counters and
//             laughs; the loser (rose, two counters left) moves one, rubs his brow and drinks. Look at them from within
//             14 m and both stop and stare back at you, hands frozen, until you look away.
//   musician  on the dry fountain's rim, facing the gate, an oud on his lap; he plucks its notes. Come within 3 m and
//             he stops, offended, and shuffles round to give you his back, nose up; he turns back and plays again
//             once you have kept 5 m off for four seconds.
//   sleeper   under a table made of a Heliarch bronze door, on his back, feet out: the right bare, the left in the
//             slipper's mate (the brocade of src/v5/dressing/slipper.js). Within 2.2 m the bare foot twitches.
import * as THREE from 'three';
import { smoothstep, clamp } from '../../noise.js';
import { angDiff } from '../../fauna/uncanny/kit.js';
import { rigPainter, rigMesh, makeBones, pivot, arm2, placeMatrix, ramp, ease } from '../../v7/workers/rig.js';
import { rgb, tone, mix3, clothBody, head, sleeve } from '../../v7/workers/body.js';

const C = {
  skin: rgb('#a07a62'), skinD: rgb('#7a5844'), hair: rgb('#1e1612'), grey: rgb('#8a8278'),
  saffron: rgb('#d89a2a'), rose: rgb('#c4705e'), turq: rgb('#24877a'), ox: rgb('#8a2a22'), cream: rgb('#d8ccb0'),
  cobalt: rgb('#2c4f9a'), green: rgb('#4a7a3a'), gilt: rgb('#d8a440'), pom: rgb('#a8182a'), wood: rgb('#4a2e1c'), board: rgb('#c8b48a'),
  dark: rgb('#2a2018'), shoe: rgb('#b8402a'),
};
const PATCHES = [C.saffron, C.turq, C.ox, C.cream, C.cobalt, C.green, C.rose];
const tab = (T, v) => { for (let k = 0; k < T.length - 1; k++) if (v <= T[k + 1][0]) { const t = smoothstep(T[k][0], T[k + 1][0], v); return T[k].slice(1).map((a, i) => a + (T[k + 1][i + 1] - a) * t); } return T[T.length - 1].slice(1); };
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

// a robe's colour: the cloth shaded by its folds, patches of other cloth in some cells, a worn hem, and the sign sewn
// wrong on the chest or the back (sx, sy in metres on the cloth's surface from the sign's centre)
function robeColour(o, prof) {
  return (v, ridge, a) => {
    const [y, rx] = prof(v);
    let base = mix3(o.dark, o.cloth, 0.35 + 0.65 * ridge);
    const ca = Math.floor((a / (Math.PI * 2)) * 7 + o.seed), cv = Math.floor(y * 4.5 + o.seed * 3);
    const h = hash(ca, cv);
    if (h < (o.patch ?? 0.22)) base = mix3(mix3(PATCHES[Math.floor(hash(cv, ca) * PATCHES.length)], [0, 0, 0], 0.35), PATCHES[Math.floor(hash(cv, ca) * PATCHES.length)], 0.4 + 0.6 * ridge);
    if (o.hem != null && y < o.hem) base = mix3(base, o.hemC || C.dark, 0.5 * (1 - y / o.hem));
    if (o.sign) {
      const [sy0, face] = o.sign, R = 0.075;
      const sx = angDiff(a, face) * rx, sy = y - sy0;
      const d = Math.hypot(sx, sy);
      if (d < R * 1.25) {
        const inCres = d < R && Math.hypot(sx, sy - R * 0.42) > R * 0.78; // the notch gone round: a crescent, horns up
        const disc = Math.hypot(sx - R * 0.18, sy + R * 0.62) < R * 0.36;   // the pomegranate: under the horns, not in them
        if (disc) return C.pom; if (inCres) return C.gilt;
        if (d > R * 1.08) return C.cream; // a ring of stitching
      }
    }
    return base;
  };
}

// ---------------------------------------------------------------- geometry
const ARM = { up: 0.29, fore: 0.28 };
// standing: hips at 0.95, shoulders at 1.41, the head's centre at 1.585
const ST = { hip: 0.95, neck: [0, 1.47, 0.01], head: [0, 1.585, 0.02], sh: 1.405, shx: 0.2 };
function standing(P, o, low) {
  const nu = low ? 14 : 22;
  const SK = [[0, 0.02, 0.27, 0.25, 0, 0.0], [0.5, 0.5, 0.235, 0.2, 0, 0.0], [1, 0.97, 0.185, 0.155, 0, 0.0]];
  const TO = [[0, 0.93, 0.185, 0.155, 0, 0], [0.4, 1.12, 0.21, 0.2, 0, 0.05 * (o.belly || 0)], [0.78, 1.36, 0.2, 0.13, 0, 0], [1, 1.47, 0.06, 0.06, 0, 0.01]];
  const sk = (v) => tab(SK, v), to = (v) => tab(TO, v);
  P.bone(0);
  // the shoes, pointed, under the hem
  tone(P, o.shoe || C.shoe, 1, 0, 0.7);
  for (const s of [-1, 1]) P.blob(s * 0.1, 0.035, 0.12, 0.05, 0.035, 0.12, 6, 4);
  clothBody(P, nu, low ? 5 : 8, sk, { folds: 9, amp: (v) => 0.05 * (1 - v * 0.6), colour: robeColour({ ...o.robe, hem: 0.2 }, sk), seed: o.robe.seed, capTop: false, rough: 0.85 });
  P.bone(1);
  clothBody(P, nu, low ? 5 : 8, to, { folds: 5, amp: () => 0.015, colour: robeColour({ ...o.robe, sign: o.signFront ? [1.24, Math.PI / 2] : null }, to), seed: o.robe.seed + 1, capBottom: false, rough: 0.85 });
  // a sash at the waist
  tone(P, o.sash || C.turq, 1, 0, 0.7);
  P.ring(0, 0.98, 0.015, 0.195, 0.035, low ? 10 : 16, 4, 1, 0.82 + 0.1 * (o.belly || 0));
  P.bone(2);
  head(P, ST.head[0], ST.head[1], ST.head[2], 0.1, { skin: C.skin, hair: o.hair === false ? null : C.hair, beard: o.beard ? C.hair : null, sides: low ? 8 : 10 });
  hat(P, o.hat, ST.head[1], 0.1, low);
  arms(P, o, low);
}
// seated on a seat `hs` high
function seated(P, o, low) {
  const hs = o.hs, nu = low ? 14 : 20;
  P.bone(0);
  const HP = [[0, hs - 0.04, 0.19, 0.17, 0, 0.02], [1, hs + 0.12, 0.185, 0.155, 0, 0]], hp = (v) => tab(HP, v);
  clothBody(P, nu, 3, hp, { folds: 7, amp: () => 0.03, colour: robeColour(o.robe, hp), seed: o.robe.seed, capTop: false, rough: 0.85 });
  for (const s of [-1, 1]) {
    tone(P, mix3(o.robe.dark, o.robe.cloth, 0.75), 1, 0, 0.85);
    P.loft([[s * 0.1, hs + 0.02, 0.02], [s * 0.11, hs + 0.04, 0.42]], [0.085, 0.07], low ? 6 : 8, 0, true);
    tone(P, o.legs || C.cream, 0.8, 0, 0.9);
    P.loft([[s * 0.11, hs + 0.03, 0.42], [s * 0.12, 0.08, 0.47]], [0.058, 0.045], low ? 5 : 7, 0, true);
    tone(P, o.shoe || C.shoe, 1, 0, 0.7);
    P.blob(s * 0.12, 0.04, 0.54, 0.05, 0.035, 0.11, 6, 4);
  }
  P.bone(1);
  const TO = [[0, hs + 0.06, 0.18, 0.155, 0, 0.0], [0.4, hs + 0.26, 0.2, 0.18, 0, 0.04 * (o.belly || 0)], [0.78, hs + 0.48, 0.19, 0.13, 0, 0], [1, hs + 0.56, 0.06, 0.06, 0, 0.01]], to = (v) => tab(TO, v);
  clothBody(P, nu, low ? 5 : 7, to, { folds: 5, amp: () => 0.015, colour: robeColour({ ...o.robe, sign: o.signBack ? [hs + 0.36, -Math.PI / 2] : o.signFront ? [hs + 0.36, Math.PI / 2] : null }, to), seed: o.robe.seed + 1, capBottom: false, rough: 0.85 });
  if (o.oud) oud(P, o, low);
  P.bone(2);
  head(P, 0, hs + 0.675, 0.02, 0.095, { skin: o.skin || C.skin, hair: o.hair === false ? null : (o.hairC || C.hair), beard: o.beard ? (o.hairC || C.hair) : null, sides: low ? 8 : 10 });
  hat(P, o.hat, hs + 0.675, 0.095, low);
  arms(P, o, low);
}
function arms(P, o, low) {
  const sc = mix3(o.robe.dark, o.robe.cloth, 0.7), sides = low ? 6 : 7;
  for (const [b, fore] of [[3, false], [4, true], [5, false], [6, true]]) {
    P.bone(b);
    if (fore) sleeve(P, ARM.fore, 0.055, 0.075, sc, { hand: o.skin || C.skin, sides });
    else sleeve(P, ARM.up, 0.06, 0.06, sc, { sides });
    if (fore && b === 6 && o.cup) { tone(P, C.ox, 1, 0, 0.5); P.loft([[0, -ARM.fore - 0.04, 0.05], [0, -ARM.fore + 0.06, 0.05]], [0.03, 0.04], 7, 0, true); }
  }
}
function hat(P, kind, hy, r, low) {
  if (kind === 'cap') { // a tall felt cap, a turquoise band, a gilt button
    tone(P, C.ox, 1, 0, 0.9); P.loft([[0, hy + r * 0.45, -0.01], [0, hy + r * 2.6, -0.03]], [r * 0.92, r * 0.78], low ? 8 : 10, 0, true);
    tone(P, C.turq, 1, 0, 0.6); P.ring(0, hy + r * 0.62, -0.01, r * 0.93, 0.016, low ? 10 : 14, 3);
    tone(P, C.gilt, 1, 0.6, 0.4); P.blob(0, hy + r * 2.68, -0.03, 0.025, 0.025, 0.025, 6, 4);
  } else if (kind === 'turban') {
    tone(P, C.saffron, 1, 0, 0.85); P.blob(0, hy + r * 0.62, -0.005, r * 1.25, r * 0.75, r * 1.22, low ? 8 : 10, 6);
    tone(P, C.pom, 1, 0.2, 0.4); P.blob(0, hy + r * 0.85, r * 1.15, 0.02, 0.025, 0.012, 5, 3);
  } else if (kind === 'kerchief') {
    tone(P, C.turq, 1, 0, 0.85); P.blob(0, hy + r * 0.3, -0.02, r * 1.13, r * 0.95, r * 1.15, low ? 8 : 10, 6);
  }
}
// the oud, on the musician's lap (painted on the torso's bone): bowl at his right hip, neck rising to his left
export const OUD = { at: [-0.04, 0.25, 0.24], tilt: 0.5 };
function oudFrame(hs) { return new THREE.Matrix4().compose(new THREE.Vector3(OUD.at[0], hs + OUD.at[1], OUD.at[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, OUD.tilt)), new THREE.Vector3(1, 1, 1)); }
function oud(P, o, low) {
  P.xf(oudFrame(o.hs));
  tone(P, C.wood, 1, 0, 0.5); P.blob(-0.1, 0, -0.02, 0.19, 0.15, 0.08, low ? 8 : 12, 6);
  tone(P, C.board, 1, 0, 0.6); P.blob(-0.1, 0, 0.035, 0.17, 0.135, 0.025, low ? 8 : 12, 4);
  tone(P, C.dark, 1, 0, 0.9); P.blob(-0.06, 0.0, 0.058, 0.03, 0.03, 0.006, 6, 3);
  tone(P, C.wood, 0.8, 0, 0.6); P.loft([[0.06, 0, 0.03], [0.46, 0, 0.03]], [0.026, 0.02], 5, 0, true);
  P.loft([[0.46, 0, 0.03], [0.55, -0.07, 0.0]], [0.02, 0.016], 5, 0, true);
  P.xf(null);
}
const OUD_M = new Map();
export function oudPoint(hs, x, y, z, out) { let m = OUD_M.get(hs); if (!m) { m = oudFrame(hs); OUD_M.set(hs, m); } return out.set(x, y, z).applyMatrix4(m); }

// ---------------------------------------------------------------- the figures
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _s = new THREE.Vector3(), _u = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0), I4 = new THREE.Matrix4();
const POLE_R = new THREE.Vector3(-0.6, -1, -0.4), POLE_L = new THREE.Vector3(0.6, -1, -0.4);

// a rigged figure: geometry, bones, mesh, place; pose(fn) helpers
function rigged(ctx, name, build, spec) {
  const P = rigPainter(); build(P, spec, ctx.quality === 'low');
  const geo = P.geometry(), bones = makeBones();
  const mesh = rigMesh(geo, bones, name);
  ctx.scene.add(mesh);
  return { geo, bones, mesh, tris: (geo.index ? geo.index.count : geo.attributes.position.count) / 3 };
}

export function buildHost(ctx, at) {
  const spec = { robe: { cloth: C.rose, dark: rgb('#5a2a28'), seed: 1.3 }, sash: C.saffron, belly: 1, hat: 'cap', beard: true, signFront: true };
  const R = rigged(ctx, 'house-host', standing, spec);
  const place = new THREE.Matrix4(), torsoL = new THREE.Matrix4();
  const S = { x: at.x, z: at.z, y: at.y, yaw: at.yaw, home: at.yaw, phase: 'idle', t: 0, depth: 0, armedIn: true, wasIn: false, bowsIn: 0, bowsOut: 0, lastBow: 0, maxDepth: 0, palm: 0 };
  const BOW_IN = 1.0, BOW_OUT = BOW_IN / 6;
  function pose(t) {
    placeMatrix(place, S.x, S.y, S.z, S.yaw);
    R.bones[0].copy(place);
    const breath = 0.012 * Math.sin(t * 1.3);
    pivot(torsoL, I4, 0, ST.hip, 0, S.depth + breath, 0, 0);
    R.bones[1].multiplyMatrices(place, torsoL);
    pivot(R.bones[2], R.bones[1], ST.neck[0], ST.neck[1], ST.neck[2], S.depth * 0.25 - 0.04, 0, 0);
    // hands: clasped on the belly; in a bow the right on the heart and the left swept out behind; going out, a palm held out
    const bowK = clamp(S.depth / BOW_IN, 0, 1);
    const hr = _v.set(-0.05, 1.08, 0.24).lerp(_w.set(-0.04, 1.31, 0.18), bowK).applyMatrix4(torsoL);
    arm2(R.bones[3], R.bones[4], place, _s.set(-ST.shx, ST.sh, 0).applyMatrix4(torsoL), hr, ARM.up, ARM.fore, POLE_R);
    const hl = _v.set(0.05, 1.08, 0.24).lerp(_w.set(0.5, 1.05, -0.2), bowK).applyMatrix4(torsoL);
    if (S.palm > 0) hl.lerp(_w.set(0.22, 1.02, 0.42), S.palm);
    arm2(R.bones[5], R.bones[6], place, _s.set(ST.shx, ST.sh, 0).applyMatrix4(torsoL), hl, ARM.up, ARM.fore, POLE_L);
    R.mesh.userData.posed();
  }
  // inCourt(x, z): is the walker in the court (or the gate's passage)
  function update(dt, t, cam, inCourt) {
    const dx = cam.x - S.x, dz = cam.z - S.z, d = Math.hypot(dx, dz), inside = inCourt(cam.x, cam.z);
    // face the walker within 25 m, else the road
    const want = d < 25 ? Math.atan2(dx, dz) : S.home;
    S.yaw += clamp(angDiff(want, S.yaw), -1.6 * dt, 1.6 * dt);
    if (d > 15) S.armedIn = true;
    S.t += dt;
    if (S.phase === 'idle') {
      if (S.armedIn && !inside && d < 6) { S.phase = 'in'; S.t = 0; S.armedIn = false; S.bowsIn++; S.lastBow = BOW_IN; }
      else if (S.wasIn && !inside && d < 9) { S.phase = 'out'; S.t = 0; S.bowsOut++; S.lastBow = BOW_OUT; }
    }
    if (S.phase === 'in' || S.phase === 'out') {
      const D = S.lastBow, down = S.phase === 'in' ? 1.1 : 0.35, hold = S.phase === 'in' ? 1.0 : 1.6, up = S.phase === 'in' ? 1.0 : 0.4;
      S.depth = S.t < down ? D * ease(S.t / down) : S.t < down + hold ? D : D * (1 - ease((S.t - down - hold) / up));
      S.palm = S.phase === 'out' ? (S.t < down + hold ? ease(Math.min(1, S.t / 0.5)) : 1 - ease((S.t - down - hold) / up)) : 0;
      S.maxDepth = Math.max(S.maxDepth, S.depth);
      if (S.t >= down + hold + up) { S.phase = 'idle'; S.depth = 0; S.palm = 0; S.t = 0; if (S.lastBow === BOW_IN) S.armedOut = true; }
    }
    if (inside) { S.armedIn = false; S.wasIn = true; } // you are in: the next bow is the bow out
    else if (d > 12) S.wasIn = false;                   // gone some other way
    if (S.phase === 'out') S.wasIn = false;
    pose(t);
  }
  pose(0);
  ctx.addCollider({ x: at.x, z: at.z, r: 0.35 });
  return { ...R, state: S, update, BOW_IN, BOW_OUT };
}

// the two at the table: A loses (rose), B wins (saffron). `table` { x, z, top (y) }; seats each { x, z, y, yaw }
export function buildPatrons(ctx, seats, table) {
  const specs = [
    { robe: { cloth: C.rose, dark: rgb('#4a2830'), seed: 2.2 }, hs: seats[0].hs, hat: 'kerchief', cup: true, signBack: true },
    { robe: { cloth: C.saffron, dark: rgb('#5a3a14'), seed: 3.7 }, hs: seats[1].hs, hat: 'turban', belly: 1, beard: true, signFront: true },
  ];
  const figs = seats.map((s, k) => ({ ...rigged(ctx, `house-patron-${k ? 'winner' : 'loser'}`, seated, specs[k]), seat: s, spec: specs[k], place: new THREE.Matrix4(), torsoL: new THREE.Matrix4() }));
  const S = { phase: 'play', t: 0, look: 0, stares: 0, clock: 0, laugh: 0, drink: -1, drinks: 0, sets: 0, head: [0, 0], away: 0 };
  // the table in each one's frame: the board's centre and his own counters
  const local = (f, x, y, z, out) => out.set(x - f.seat.x, y - f.seat.y, z - f.seat.z).applyAxisAngle(UPV, -f.seat.yaw);
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  function pose(t, cam) {
    const tau = ease(S.look);
    figs.forEach((f, k) => {
      const s = f.seat, hs = f.spec.hs;
      placeMatrix(f.place, s.x, s.y, s.z, s.yaw);
      f.bones[0].copy(f.place);
      const rel = clamp(angDiff(Math.atan2(cam.x - s.x, cam.z - s.z), s.yaw), -1.45, 1.45), h = rel * tau;
      S.head[k] = h;
      const shake = k === 1 ? 0.06 * S.laugh * Math.sin(t * 38) : 0;
      const lean = (k === 0 ? 0.28 : 0.12) + shake - 0.12 * tau;
      pivot(f.torsoL, I4, 0, hs + 0.08, 0, lean, h * 0.25, 0);
      f.bones[1].multiplyMatrices(f.place, f.torsoL);
      pivot(f.bones[2], f.bones[1], 0, hs + 0.56, 0.01, (k === 0 ? 0.25 : -0.05) * (1 - tau) - shake * 2, h * 0.75, 0);
      // the hands: over the board at the clock, or frozen
      const c = S.clock, board = local(f, table.x, table.top + 0.05, table.z, tmp);
      let hr, hl;
      if (k === 0) {
        // the loser: right hand hovers, moves a counter (every 7 s), goes to his brow; the left holds his cup and drinks
        const ph = (c % 7) / 7;
        hr = tmp2.copy(board).add(_v.set(-0.12 + 0.18 * smoothstep(0.2, 0.45, ph) - 0.18 * smoothstep(0.55, 0.7, ph), 0.04 + 0.08 * Math.sin(ph * Math.PI * 2) * (ph < 0.5 ? 1 : 0), -0.05));
        if (ph > 0.72) hr.lerp(_v.set(-0.05, hs + 0.66, 0.16).applyMatrix4(f.torsoL), smoothstep(0.72, 0.8, ph) * (1 - smoothstep(0.93, 1, ph)));
        const dk = S.drink >= 0 ? S.drink : 0;
        hl = local(f, table.x, table.top + 0.08, table.z, _u).add(_v.set(0.28, 0, -0.25)).lerp(_v.set(0.03, hs + 0.6, 0.14).applyMatrix4(f.torsoL), Math.sin(Math.min(1, dk) * Math.PI));
      } else {
        // the winner: stacks his counters, a tap now and then; laughing, hands flat on the table
        const ph = (c % 3.2) / 3.2;
        hr = tmp2.copy(board).add(_v.set(-0.2, 0.03 + 0.05 * Math.max(0, Math.sin(ph * Math.PI * 2)), 0.02));
        hl = _u.copy(board).add(_v.set(0.18 + 0.03 * Math.sin(c * 2.1), 0.02, 0.04));
      }
      arm2(f.bones[3], f.bones[4], f.place, _v.set(-0.19, hs + 0.5, 0).applyMatrix4(f.torsoL), hr, ARM.up, ARM.fore, POLE_R);
      arm2(f.bones[5], f.bones[6], f.place, _w.set(0.19, hs + 0.5, 0).applyMatrix4(f.torsoL), hl, ARM.up, ARM.fore, POLE_L);
      f.mesh.userData.posed();
    });
  }
  // fwd: the camera's look direction (x, z, normalised)
  const ctr = { x: (seats[0].x + seats[1].x) / 2, z: (seats[0].z + seats[1].z) / 2 };
  function update(dt, t, cam, fwd, cue) {
    const dx = ctr.x - cam.x, dz = ctr.z - cam.z, d = Math.hypot(dx, dz);
    const ang = d > 0.01 ? Math.acos(clamp((dx * fwd.x + dz * fwd.z) / d, -1, 1)) : 0;
    const seen = d < 14 && ang < 0.3, away = ang > 0.45 || d > 16;
    S.away = away ? S.away + dt : 0;
    S.t += dt;
    if (S.phase === 'play' && seen) { S.phase = 'stare'; S.t = 0; S.stares++; }
    else if (S.phase === 'stare' && S.away > 0.35) { S.phase = 'back'; S.t = 0; }
    if (S.phase === 'stare') S.look = ramp(S.look, 1, 1 / 0.6, dt);
    else S.look = ramp(S.look, 0, 1 / 0.8, dt);
    if (S.phase === 'back' && S.look <= 0) S.phase = 'play';
    if (S.phase === 'play') {
      S.clock += dt;
      if (S.drink >= 0) { const prev = S.drink; S.drink += dt / 3.2; if (prev < 1 && S.drink >= 1) { S.drink = -1; S.sets++; cue?.('house-cup', 0); } }
    }
    S.laugh = Math.max(0, S.laugh - dt / 1.6);
    pose(t, cam);
  }
  pose(0, { x: 0, z: 0 });
  for (const s of seats) ctx.addCollider({ x: s.x, z: s.z, r: 0.38 });
  return { figs, state: S, update, center: ctr, drink() { if (S.drink < 0 && S.phase === 'play') { S.drink = 0; S.drinks++; } }, laugh() { S.laugh = 1; }, heads: () => figs.map((f) => f.bones[2].elements.slice(12, 15)) };
}

// the musician on the fountain's rim; `at` { x, z, y (his seat's ground), yaw, hs }
export function buildMusician(ctx, at) {
  const spec = { robe: { cloth: C.turq, dark: rgb('#123a38'), seed: 5.1 }, hs: at.hs, hat: 'cap', oud: true, signBack: true, legs: C.saffron, hairC: C.grey, beard: true };
  const R = rigged(ctx, 'house-musician', seated, spec);
  const place = new THREE.Matrix4(), torsoL = new THREE.Matrix4();
  const S = { phase: 'play', t: 0, turn: 0, far: 0, offences: 0, playing: true, pluck: 0, note: 0, notes: 0, yaw: at.yaw };
  const NEAR = 3.0, CLEAR = 5.0, WAIT = 4.0, TURN = 2.3;
  const pr = new THREE.Vector3(), pl = new THREE.Vector3();
  function pose(t) {
    const tau = ease(S.turn);
    S.yaw = at.yaw + TURN * tau;
    placeMatrix(place, at.x, at.y, at.z, S.yaw);
    R.bones[0].copy(place);
    pivot(torsoL, I4, 0, at.hs + 0.08, 0, 0.16 - 0.1 * tau + 0.01 * Math.sin(t * 0.9), 0, 0);
    R.bones[1].multiplyMatrices(place, torsoL);
    pivot(R.bones[2], R.bones[1], 0, at.hs + 0.56, 0.01, 0.3 * (1 - tau) - 0.32 * tau + 0.05 * Math.sin(t * 0.7), 0.25 * (1 - tau), 0.08 * (1 - tau));
    // right hand at the bowl, plucking (a quick stroke down), left on the neck, its place by the note
    const k = S.pluck;
    oudPoint(at.hs, -0.07, 0.03 - 0.05 * k, 0.11 + 0.02 * k, pr);
    oudPoint(at.hs, 0.26 + 0.035 * S.note, 0.035, 0.07, pl);
    if (tau > 0) { pr.lerp(_v.set(-0.12, at.hs + 0.18, 0.22), tau); pl.lerp(_w.set(0.15, at.hs + 0.3, 0.3), tau); } // arms folded over it, offended
    pr.applyMatrix4(torsoL); pl.applyMatrix4(torsoL);
    arm2(R.bones[3], R.bones[4], place, _v.set(-0.19, at.hs + 0.5, 0).applyMatrix4(torsoL), pr, ARM.up, ARM.fore, POLE_R);
    arm2(R.bones[5], R.bones[6], place, _w.set(0.19, at.hs + 0.5, 0).applyMatrix4(torsoL), pl, ARM.up, ARM.fore, POLE_L);
    R.mesh.userData.posed();
  }
  function update(dt, t, cam) {
    const d = Math.hypot(cam.x - at.x, cam.z - at.z);
    S.t += dt;
    S.pluck = Math.max(0, S.pluck - dt / 0.14);
    if (S.phase === 'play' && d < NEAR) { S.phase = 'offended'; S.t = 0; S.offences++; S.playing = false; }
    else if (S.phase === 'offended') { S.far = d > CLEAR ? S.far + dt : 0; if (S.far > WAIT) { S.phase = 'relent'; S.t = 0; } }
    else if (S.phase === 'relent' && S.turn <= 0 && S.t > 1.5) { S.phase = 'play'; S.playing = true; }
    S.turn = ramp(S.turn, S.phase === 'offended' ? 1 : 0, 1 / 1.2, dt);
    pose(t);
  }
  pose(0);
  ctx.addCollider({ x: at.x + Math.sin(at.yaw) * 0.25, z: at.z + Math.cos(at.yaw) * 0.25, r: 0.4 });
  return { ...R, state: S, update, at, pluck(note) { if (!S.playing) return false; S.pluck = 1; S.note = note; S.notes++; return true; } };
}

// the sleeper under the table, on his back, head at -z, feet at +z (+x is his left: the slippered foot)
// foot: the slipper's heel, toe: the way its length runs (out, a little up, onward), up: roughly where its vamp faces
export const SLEEPER = { foot: [0.13, 0.035, 0.76], toe: [0.5, 0.3, 0.81], up: [-0.45, 0.89, 0], bare: [-0.13, 0.0, 0.86] };
function sleeperGeometry(P, o, low) {
  const robe = { cloth: C.green, dark: rgb('#1e2e1a'), seed: 7.7, patch: 0.3 };
  const rc = robeColour(robe, (v) => [v * 0.3, 0.2]);
  const s6 = low ? 6 : 8;
  P.bone(0);
  tone(P, mix3(robe.dark, robe.cloth, 0.6), 1, 0, 0.9);
  P.blob(0, 0.12, 0.02, 0.2, 0.11, 0.17, s6, 5);
  // legs: the left straight, the right straight and splayed; trousers saffron, rolled
  tone(P, C.saffron, 0.85, 0, 0.9);
  P.loft([[0.1, 0.1, 0.05], [0.11, 0.1, 0.45], [0.12, 0.085, 0.8]], [0.075, 0.06, 0.045], s6, 0, true);
  P.loft([[-0.1, 0.1, 0.05], [-0.12, 0.1, 0.45], [-0.13, 0.085, 0.78]], [0.075, 0.06, 0.045], s6, 0, true);
  // the left foot is in the slipper (house.js), rolled out on its side as a sleeper's foot rolls
  P.bone(1);
  // the body: robe in patches, a belly that rises and falls
  P.grid(s6 + 4, 6, (u, v, out) => {
    const a = u * Math.PI * 2, z = -0.08 - v * 0.62, r = 0.17 + 0.05 * Math.sin(v * Math.PI) + (v < 0.4 ? 0.03 : 0);
    P.col = rc(v, 0.5 + 0.5 * Math.sin(a * 5), a); P.mre = [0, 0.85, 0];
    out[0] = Math.cos(a) * r * 1.15; out[1] = 0.13 + Math.sin(a) * r * 0.7; out[2] = z;
  }, true, true);
  // arms: the right across his chest, the left flung out, palm up
  tone(P, mix3(robe.dark, robe.cloth, 0.7), 1, 0, 0.9);
  P.loft([[-0.2, 0.15, -0.6], [-0.12, 0.24, -0.38], [0.08, 0.27, -0.36]], [0.055, 0.05, 0.045], s6, 0, true);
  P.loft([[0.2, 0.15, -0.6], [0.45, 0.07, -0.5], [0.66, 0.05, -0.36]], [0.055, 0.05, 0.045], s6, 0, true);
  tone(P, C.skin, 1, 0, 0.75); P.blob(0.12, 0.27, -0.36, 0.045, 0.025, 0.05, 6, 3); P.blob(0.72, 0.04, -0.33, 0.045, 0.02, 0.055, 6, 3);
  P.bone(2);
  head(P, 0, 0.12, -0.86, 0.1, { skin: C.skin, hair: C.hair, beard: C.hair, sides: low ? 8 : 10 });
  tone(P, C.ox, 1, 0, 0.9); P.loft([[-0.2, 0.05, -0.98], [-0.33, 0.12, -1.05]], [0.085, 0.07], 8, 0, true); // his cap, rolled off
  P.bone(3);
  // the right foot, bare, toes up (it twitches)
  tone(P, C.skin, 1, 0, 0.75);
  P.blob(SLEEPER.bare[0], 0.11, SLEEPER.bare[2] - 0.03, 0.044, 0.1, 0.05, 6, 4);
  for (let i = 0; i < 4; i++) P.blob(SLEEPER.bare[0] - 0.025 + i * 0.017, 0.21, SLEEPER.bare[2] - 0.015, 0.011, 0.016, 0.013, 4, 3);
}
export function buildSleeper(ctx, at) {
  const R = rigged(ctx, 'house-sleeper', sleeperGeometry, {});
  const place = placeMatrix(new THREE.Matrix4(), at.x, at.y, at.z, at.yaw);
  const S = { phase: 'sleep', t: 0, twitches: 0, armed: true, foot: 0, breath: 0 };
  const chest = new THREE.Matrix4(), tA = new THREE.Matrix4(), tB = new THREE.Matrix4(), sc = new THREE.Matrix4();
  const footWorld = new THREE.Vector3(SLEEPER.bare[0], 0, SLEEPER.bare[2]).applyMatrix4(place);
  function pose(t) {
    R.bones[0].copy(place);
    S.breath = 0.5 + 0.5 * Math.sin(t * 0.55);
    tA.makeTranslation(0, 0.1, -0.35); sc.makeScale(1, 1 + 0.07 * S.breath, 1 + 0.015 * S.breath); tB.makeTranslation(0, -0.1, 0.35);
    chest.multiplyMatrices(tA, sc).multiply(tB);
    R.bones[1].multiplyMatrices(place, chest);
    pivot(R.bones[2], place, 0, 0.12, -0.78, 0, 0, 0.08 * Math.sin(t * 0.13));
    // the bare foot: a twitch, toes curling down and the foot rolling out
    const k = S.foot;
    pivot(R.bones[3], place, SLEEPER.bare[0], 0.05, SLEEPER.bare[2] - 0.06, 0.55 * k, 0, -0.35 * k);
    R.mesh.userData.posed();
  }
  function update(dt, t, cam) {
    const d = Math.hypot(cam.x - footWorld.x, cam.z - footWorld.z);
    S.t += dt;
    if (d > 4) S.armed = true;
    if (S.phase === 'sleep' && S.armed && d < 2.2) { S.phase = 'twitch'; S.t = 0; S.armed = false; S.twitches++; }
    if (S.phase === 'twitch') {
      S.foot = S.t < 0.18 ? S.t / 0.18 : S.t < 0.5 ? 1 - 0.5 * Math.sin((S.t - 0.18) * 30) * 0.3 : Math.max(0, 1 - (S.t - 0.5) / 0.6);
      if (S.t > 1.1) { S.phase = 'sleep'; S.foot = 0; }
    }
    pose(t);
  }
  pose(0);
  return { ...R, state: S, update, place, footWorld };
}
