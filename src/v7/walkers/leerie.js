// CG The Leerie (plans/IDEAS-v5.md CG with Austin's change; plans/wilderness-v5.md "### CG"): a lamplighter with a long brass pole
// and a small flame at its tip, walking the row of iron standards beside kerb K1. At each he raises the pole, touches
// the flame to the wick, waits, and walks on; none of them lights. Only when the sun gutters does the row light (the
// lights module's wave, src/v5/lights.js: he never writes a lamp's state), and he never looks round at it. When the
// gutter ends and the row goes out, he turns round where he stands and does the round the other way.
//
// Numbers: 1.8 m; 0.9 m/s, 0.6 m on the kerb's side of the standards' feet; the pole 3.6 m, held 0.5 m from its butt.
// At each standard he stops where the raised pole reaches the mantle (the standards are 2.4-3.3 m, so that is about
// 2.8 m short of it, not under it), raises the pole over 1.2 s, holds 1.5 s (the touch: `leerie-click`), waits 1.0 s
// with it there, lowers over 1.0 s and walks on: about 11.7 s a standard. The gutter's end is the row going out
// (ctx.leerie.lit falling), else the sun's flicker rising past 0.85 after falling below 0.5. At it he lowers the pole if
// it is up, turns over 2.5 s and walks the row back from the standard he is at. At the row's end before a gutter he
// stands at the last standard facing along the row, the pole lowered, until a gutter has come and ended.
import * as THREE from 'three';
import { clamp, smoothstep, lerp, hyp } from '../../noise.js';
import { Gait, figurePainter, figureMesh, rootMatrix, about, hang, point, easeYaw, standGround, TAU, DEG } from './gait.js';
import { SITES } from '../../world.js';
import { LEERIE } from '../../v5/lights.js';
import { LIVERY, lv, stole, badge, collar } from '../../v8/livery.js';

const H = 1.8, SPEED = 0.9, SIDE = LEERIE.side - 0.6;
const T_RAISE = 1.2, T_HOLD = 1.5, T_WAIT = 1.0, T_LOWER = 1.0, T_TURN = 2.5;
const GRIP = 0.5, TIP = 3.6 - GRIP; // the pole: butt to grip, grip to tip
const SH_R = [-0.21, 1.43, 0.0], SH_L = [0.21, 1.43, 0.0];
const HAND_R = [-0.25, 1.13, 0.3], HAND_L = [0.24, 0.84, 0.04];
const ARM_RAISE = -0.5; // rad, the right arm forward and up as the pole goes up
const REST = { rx: 10 * DEG, ry: Math.atan2(0.25, 3) }; // the pole carried low before him, its tip on his line
const COAT = lv('#16120f', LIVERY.coat), COAT_HI = lv('#211913', LIVERY.coatHi), SKIN = '#6a5246', CAP = '#0f0c0b', BRASS = '#8a6a32', BRASS_D = '#4a3618';
const PARTS = 4; // 0 body, 1 left arm, 2 right arm, 3 the pole

function table(tab, v) {
  for (let k = 0; k < tab.length - 1; k++) if (v <= tab[k + 1][0]) { const t = (v - tab[k][0]) / (tab[k + 1][0] - tab[k][0]); return lerp(tab[k][1], tab[k + 1][1], smoothstep(0, 1, t)); }
  return tab[tab.length - 1][1];
}
const R_COAT = [[0, 0.29], [0.3, 0.235], [0.62, 0.195], [0.7, 0.185], [0.86, 0.225], [0.96, 0.235], [1, 0.08]];

function paint(n2, low) {
  const P = figurePainter();
  P.part(0).hem(0);
  // the coat: to the ankles, a little flared, heavy; worn paler at the folds
  P.grid(low ? 18 : 26, low ? 12 : 16, (u, v, o) => {
    const a = u * TAU, y = 0.04 + v * 1.43, side = Math.sin(a);
    const r = table(R_COAT, v), fold = 1 + (0.08 * (1 - v) + 0.015) * Math.pow(Math.abs(Math.sin(a * 6 + 0.6 * Math.sin(a * 3))), 0.6);
    const depth = lerp(0.82, 0.62, smoothstep(0.6, 0.95, v));
    P.paint(n2(a * 3 + 9, v * 7) > 0.5 ? COAT_HI : COAT, 0, 0.96);
    P.hem(smoothstep(0.45, 0, v));
    o[0] = Math.cos(a) * r * fold; o[1] = y + (v < 0.01 ? 0.012 * Math.sin(a * 7) : 0); o[2] = side * r * depth * fold + 0.02 * v;
  }, false, false);
  P.hem(0);
  // a standing collar edged in dull brass, the neck, the head, a close felt cap
  if (!LIVERY.on) {
    P.paint(COAT, 0, 0.95);
    P.lathe(0, 1.44, 0.01, [[0.11, 0], [0.095, 0.08], [0.1, 0.14]], low ? 10 : 14);
    P.paint(BRASS_D, 0.6, 0.55); P.ring(0, 1.585, 0.01, 0.1, 0.006, low ? 12 : 18, 3);
  } else {
    // v8-06 the livery: the Heliarch collar (his was the pattern), the stole worn as a sash from the left shoulder to
    // the right hip, its end hanging; the formal sign its brooch; and at his left hip an oil flask in the Pomegranate
    // House's ruby lamp glass, which he has not paid for (the tally is on his first standard: src/v8/livery/props.js)
    collar(P, 0, 1.43, 0.01, 0.1, 0.15, COAT, { sides: low ? 10 : 14, gap: 0.45 });
    const front = (y) => { const v = clamp((y - 0.04) / 1.43, 0, 1); return table(R_COAT, v) * lerp(0.82, 0.62, smoothstep(0.6, 0.95, v)) * 1.07 + 0.02 * v + 0.012; };
    const sash = [[0.15, 1.3, -0.14], [0.19, 1.43, -0.04], [0.17, 1.44, 0.07], [0.1, 1.36, front(1.36)], [0.0, 1.24, front(1.24)], [-0.1, 1.12, front(1.12)], [-0.19, 1.0, front(1.0) - 0.04], [-0.235, 0.94, 0.0]];
    stole(P, sash, { w: 0.13, out: (t, p) => [p[0] * 1.2, 0.35, p[2] + (t < 0.2 ? 0 : 0.05)], fray: 0, dirt: 0, seed: 1 });
    // the knot at the hip and the end hanging down his right side, swinging with the coat
    stole(P, [[-0.235, 0.96, 0.02], [-0.25, 0.82, 0.03], [-0.255, 0.66, 0.02], [-0.25, 0.5, 0.0]], { w: 0.11, out: [-1, 0, 0.25], seed: 2, dirt: 0.3, fray: 0.05, each: (t) => P.hem(t * 0.5) });
    P.hem(0);
    P.paint(LIVERY.stoleDeep, 0, 0.9); P.blob(-0.235, 0.96, 0.02, 0.05, 0.045, 0.05, 6, 4);
    badge(P, [0.115, 1.385, front(1.38) + 0.018], [0.25, 1, 0], [0.1, 0.25, 1], 0.085, { th: 0.01 });
    // the flask: a squat bottle of ruby glass on a thong, a cork
    P.paint('#8a1c22', 0.1, 0.18, 0.8); P.blob(0.255, 0.9, 0.05, 0.048, 0.06, 0.05, 7, 5);
    P.paint('#6a1418', 0.1, 0.2, 0.6); P.loft([[0.255, 0.95, 0.05], [0.255, 1.0, 0.05]], [0.016, 0.014], 5, 0, false);
    P.paint('#5a3a22', 0, 0.9); P.blob(0.255, 1.01, 0.05, 0.016, 0.016, 0.016, 5, 3);
    P.paint(BRASS_D, 0.4, 0.6); P.loft([[0.255, 1.0, 0.05], [0.24, 1.06, 0.07], [0.22, 1.12, 0.12]], [0.004, 0.004, 0.004], 3, 0, false);
  }
  P.paint(SKIN, 0, 0.8);
  P.blob(0, 1.66, 0.015, 0.082, 0.1, 0.095, low ? 8 : 10, 6);
  P.blob(0, 1.62, 0.1, 0.012, 0.015, 0.02, 4, 3); // the nose: faces only close
  P.paint(CAP, 0, 0.95);
  P.lathe(0, 1.705, 0.01, [[0.088, 0], [0.09, 0.03], [0.075, 0.06], [0.0, 0.07]], low ? 10 : 14);
  // arms in the coat's sleeves; hands bare
  P.part(1).paint(COAT, 0, 0.96);
  P.loft([[SH_L[0], SH_L[1], 0], [0.25, 1.15, 0.0], [HAND_L[0], HAND_L[1] + 0.08, HAND_L[2]]], [0.055, 0.05, 0.05], low ? 6 : 8, 0, true);
  P.paint(SKIN, 0, 0.8); P.blob(HAND_L[0], HAND_L[1], HAND_L[2], 0.03, 0.045, 0.03, 5, 3);
  P.part(2).paint(COAT, 0, 0.96);
  P.loft([[SH_R[0], SH_R[1], 0], [-0.25, 1.17, 0.04], [HAND_R[0], HAND_R[1] + 0.02, HAND_R[2] - 0.07]], [0.055, 0.05, 0.05], low ? 6 : 8, 0, true);
  P.paint(SKIN, 0, 0.8); P.blob(HAND_R[0], HAND_R[1], HAND_R[2], 0.032, 0.035, 0.04, 5, 3);
  // the pole, in its own frame: the grip at the origin, the tip along +z; a brass cup at the tip, the flame's bead in it
  P.part(3).paint(BRASS, 0.8, 0.42);
  P.loft([[0, 0, -GRIP], [0, 0, TIP - 0.04]], [0.016, 0.011], 5, 0, true);
  P.paint(BRASS_D, 0.7, 0.5); P.lathe(0, 0, TIP - 0.05, [[0.012, 0], [0.022, 0.03], [0.02, 0.05]], 6);
  P.paint('#ffb060', 0, 0.6, 3.0); P.blob(0, 0.0, TIP + 0.01, 0.014, 0.014, 0.022, 5, 3);
  return P;
}

export function buildLeerie(ctx, F, cue) {
  const T = ctx.THREE;
  const low = ctx.quality === 'low';
  const G = standGround(ctx);
  const S0 = SITES.leerie, [x0, z0] = S0.from, [x1, z1] = S0.to;
  const len = hyp(x1 - x0, z1 - z0), ux = (x1 - x0) / len, uz = (z1 - z0) / len, nx = uz, nz = -ux;
  const N = LEERIE.n, uJ = Array.from({ length: N }, (_, j) => (len * j) / (N - 1));
  const P = paint(ctx.noise.noise2, low);
  const fig = figureMesh(P, PARTS, 'walkers-leerie', 1.6, 4.4);
  const root = new T.Group(); root.name = 'walkers-leerie-root'; root.add(fig.mesh);
  const parts = fig.parts;
  const yawFor = (d) => Math.atan2(ux * d, uz * d);

  // the wicks: the lights module's mantles once it is built; until then, where they will about be
  const heads = Array.from({ length: N }, (_, j) => new T.Vector3(x0 + ux * uJ[j] + nx * 0.56, G(x0 + ux * uJ[j], z0 + uz * uJ[j]) + 2.4, z0 + uz * uJ[j] + nz * 0.56));
  let headsReal = false;
  const stopU = { 1: new Float64Array(N), [-1]: new Float64Array(N) };
  const raised = { 1: Array.from({ length: N }, () => ({ rx: 0, ry: 0 })), [-1]: Array.from({ length: N }, () => ({ rx: 0, ry: 0 })) };
  const hRaise = new T.Vector3();
  {
    // the hand when the arm is raised, in the figure's frame
    const m = new T.Matrix4(); about(m, new T.Matrix4(), SH_R[0], SH_R[1], SH_R[2], ARM_RAISE); point(hRaise, m, HAND_R[0], HAND_R[1], HAND_R[2]);
  }
  const loc = new T.Vector3();
  function toLocal(out, u, d, w) { // world point w as seen from the figure at u facing d
    const px = x0 + ux * u + nx * SIDE, pz = z0 + uz * u + nz * SIDE, py = G(px, pz), yaw = yawFor(d), c = Math.cos(yaw), s = Math.sin(yaw);
    const wx = w.x - px, wz = w.z - pz;
    return out.set(wx * c - wz * s, w.y - py, wx * s + wz * c);
  }
  function solveStops() {
    for (const d of [1, -1]) for (let j = 0; j < N; j++) {
      // the stop: where the raised pole's tip (TIP from the hand) is just at the mantle
      let lo = 0.3, hi = 4.5;
      const wick = heads[j], cage = uJ[j] + ((wick.x - x0) * ux + (wick.z - z0) * uz - uJ[j]);
      const reach = TIP - 0.03;
      for (let it = 0; it < 30; it++) {
        const a = (lo + hi) / 2;
        toLocal(loc, cage - d * a, d, wick);
        if (loc.distanceTo(hRaise) > reach) hi = a; else lo = a;
      }
      const a = (lo + hi) / 2;
      stopU[d][j] = cage - d * a;
      toLocal(loc, stopU[d][j], d, wick);
      const dx = loc.x - hRaise.x, dy = loc.y - hRaise.y, dz = loc.z - hRaise.z;
      raised[d][j].ry = Math.atan2(dx, dz); raised[d][j].rx = -Math.asin(clamp(dy / Math.max(1e-3, Math.hypot(dx, dy, dz)), -1, 1));
    }
  }
  function readHeads() {
    const L = ctx.leerie;
    if (!L?.heads?.length) return false;
    for (let j = 0; j < N; j++) heads[j].copy(L.heads[j]);
    headsReal = true; solveStops(); return true;
  }
  solveStops();

  const rng = ctx.makeRng(7201);
  const S = { u: 0, dir: rng() < 0.5 ? 1 : -1, j: Math.floor(rng() * N), mode: 'walk', t: 0, k: 0, yaw: 0, x: 0, z: 0, gy: 0,
    pending: false, turnFrom: 0, turnTo: 0, lit: false, wasLow: false, touches: 0, turns: 0, held: false, lastTouch: -1 };
  S.u = stopU[S.dir][S.j] - S.dir * 1.2; S.yaw = yawFor(S.dir);
  const gait = new Gait('leerie', H, (v) => 0.75, (f, i) => { cueP.x = S.x; cueP.y = S.gy; cueP.z = S.z; cue('leerie-step', cueP); });
  const cueP = { x: 0, y: 0, z: 0 }, tip = new T.Vector3(), hand = new T.Vector3();
  const setMode = (m) => { S.mode = m; S.t = 0; };
  const nextTarget = () => {
    // the first standard ahead of him in his direction (the one he is at, if he has not passed its stop)
    for (let i = 0; i < N; i++) { const j = S.dir > 0 ? i : N - 1 - i; if ((stopU[S.dir][j] - S.u) * S.dir >= -0.05) return j; }
    return -1;
  };

  function gutterEnded() {
    // the lights module's all-out moment, else the sun's flicker rising past 0.85 after falling below 0.5
    const L = ctx.leerie;
    if (L) { const lit = !!L.lit, ended = S.lit && !lit; S.lit = lit; return ended; }
    const f = ctx.sky?.flicker?.value ?? 1;
    if (f < 0.5) S.wasLow = true;
    if (S.wasLow && f > 0.85) { S.wasLow = false; return true; }
    return false;
  }

  function pose(dt, t) {
    rootMatrix(parts[0], gait.bob, gait.roll);
    about(parts[1], parts[0], SH_L[0], SH_L[1], SH_L[2], -12 * DEG * gait.s1);
    const kk = smoothstep(0, 1, S.k);
    about(parts[2], parts[0], SH_R[0], SH_R[1], SH_R[2], ARM_RAISE * kk);
    point(hand, parts[2], HAND_R[0], HAND_R[1], HAND_R[2]);
    const R = S.j >= 0 ? raised[S.dir][S.j] : REST;
    hang(parts[3], hand.x, hand.y, hand.z, 0, 0, 0, lerp(REST.rx, R.rx, kk), lerp(REST.ry, R.ry, kk));
    fig.gait.x = 0.05 * -gait.s1;
    point(tip, parts[3], 0, 0, TIP + 0.01);
    root.updateMatrixWorld(true);
    tip.applyMatrix4(fig.mesh.matrixWorld);
    const fl = 0.8 + 0.12 * Math.sin(t * 2.3 * TAU) + 0.08 * Math.sin(t * 4.7 * TAU + 1.3);
    F.U.uLeer.value.set(tip.x, tip.y, tip.z, root.visible ? fl : 0);
    fig.mat.userData.uEmit.value = fl;
  }
  function place() {
    S.x = x0 + ux * S.u + nx * SIDE; S.z = z0 + uz * S.u + nz * SIDE; S.gy = G(S.x, S.z);
    root.position.set(S.x, S.gy - 0.02, S.z); root.rotation.y = S.yaw;
  }

  function update(dt, t) {
    if (!headsReal) readHeads();
    if (gutterEnded() && !S.held) S.pending = true;
    S.t += dt;
    let v = 0;
    if (S.pending && (S.mode === 'raise' || S.mode === 'hold' || S.mode === 'wait')) setMode('lower');
    if (S.pending && (S.mode === 'walk' || S.mode === 'end')) { S.pending = false; S.turnFrom = S.yaw; S.turnTo = S.yaw + Math.PI; setMode('turn'); }
    switch (S.mode) {
      case 'walk': {
        if (S.j < 0) { setMode('end'); break; }
        const stop = stopU[S.dir][S.j];
        v = SPEED;
        S.u += S.dir * v * dt;
        if ((S.u - stop) * S.dir >= 0) { S.u = stop; setMode('raise'); }
        S.yaw = yawFor(S.dir); // locked to his way, gutter or not: he never looks round at the row
        break;
      }
      case 'raise': S.k = clamp(S.t / T_RAISE, 0, 1); if (S.t >= T_RAISE) { setMode('hold'); S.touches++; S.lastTouch = S.j; cue('leerie-click', heads[S.j]); } break;
      case 'hold': S.k = 1; if (S.t >= T_HOLD && !S.held) setMode('wait'); break;
      case 'wait': S.k = 1; if (S.t >= T_WAIT) setMode('lower'); break;
      case 'lower': {
        if (S.t < dt + 1e-6) S.k0 = S.k;
        S.k = (S.k0 ?? 1) * (1 - clamp(S.t / T_LOWER, 0, 1));
        if (S.t >= T_LOWER) {
          S.k = 0;
          if (S.pending) { S.pending = false; S.turnFrom = S.yaw; S.turnTo = S.yaw + Math.PI; setMode('turn'); }
          else { S.j += S.dir; if (S.j < 0 || S.j >= N) { S.j = -1; setMode('end'); } else setMode('walk'); }
        }
        break;
      }
      case 'end': S.k = 0; S.yaw = yawFor(S.dir); break; // facing along the row, at the last standard
      case 'turn': {
        const k = smoothstep(0, 1, clamp(S.t / T_TURN, 0, 1));
        S.yaw = S.turnFrom + (S.turnTo - S.turnFrom) * k; v = 0.15 * Math.sin(Math.PI * clamp(S.t / T_TURN, 0, 1));
        if (S.t >= T_TURN) { S.dir = -S.dir; S.turns++; S.yaw = yawFor(S.dir); S.j = nextTarget(); setMode(S.j < 0 ? 'end' : 'walk'); }
        break;
      }
    }
    gait.advance(dt, v);
    place();
    pose(dt, t);
  }
  place(); pose(0, 0);
  ctx.registerUpdate(update, { at: () => root.position, near: 80, hz: 4 });

  const api = {
    root, mesh: fig.mesh,
    get state() { return { u: S.u, dir: S.dir, j: S.j, mode: S.mode, k: S.k, x: S.x, z: S.z, yaw: S.yaw, touches: S.touches, turns: S.turns, lastTouch: S.lastTouch, headsReal, tip: tip.toArray(), side: SIDE }; },
    stops: stopU, heads,
    // at(j, k = 1, dir = 1): pose him at standard j's stop, the pole raised k, and hold; at(null) lets him go on
    at(j, k = 1, dir = 1) {
      if (j === null) { S.held = false; setMode(S.k > 0 ? 'wait' : 'walk'); return api.state; }
      if (!headsReal) readHeads();
      S.dir = dir; S.j = j; S.u = stopU[dir][j]; S.yaw = yawFor(dir); S.k = k; S.held = true; setMode(k > 0 ? 'hold' : 'walk');
      if (k <= 0) S.u -= dir * 1.5;
      place(); pose(0, ctx.time.t); return api.state;
    },
    sim(sec, dt = 0.1) { let t = ctx.time.t; for (let k = 0; k < sec / dt; k++) { t += dt; update(dt, t); } return api.state; },
    stats() { return { calls: 1, tris: fig.tris }; },
  };
  return api;
}
