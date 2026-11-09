// BZ the Coheirs (v7, living-workers): "Two women, identical, in identical dresses of a once-fine purple gone brown,
// sitting on the shingle with a net stretched on a frame between them. One mends; the other, facing her, unpicks the
// same mesh. When you come within 20 m they stop together, turn their heads to you together, and go back to work
// together."
// At the spit's root (SITES.coheirs), their line along the shore. One geometry drawn twice in one mesh (the second a
// half-turned copy, its bones offset), the frame in the same mesh, the net one LineSegments. The mender draws a knot
// tight every 4-6 s (`coheirs-knot`); the other's hands do the same a beat (0.5 s) behind, at the same place from her
// side. Within 20 m (armed again beyond 30 m), on the same frame, both stop and both heads turn to the walker over
// 0.9 s (up to 80 deg from the net, the shoulders 10 deg), hold 2.5 s, turn back over 0.9 s, and work again: one
// clock drives both. While they work within 25 m, `coheirs-hum` is started ({ start: true }), and stopped
// ({ stop: true }) when they stop or the walker goes.
import * as THREE from 'three';
import { SITES } from '../../world.js';
import { hyp, smoothstep, clamp, mulberry32 } from '../../noise.js';
import { angDiff } from '../../fauna/uncanny/kit.js';
import { rigPainter, rigMesh, makeBones, pivot, arm2, placeMatrix, ramp, ease, tris } from './rig.js';
import { rgb, tone, mix3, clothBody, head, sleeve } from './body.js';

const DRESS = rgb('#865a44'), DRESS_D = rgb('#4a3040'), DRESS_HEM = rgb('#6c5c4a'), SKIN = rgb('#a48a78'), HAIR = rgb('#211814'), FRAME = rgb('#3a2d22');
const A_UP = 0.26, A_FORE = 0.25, SEP = 0.55;          // each woman sits SEP in front of the frame
const SH_R = new THREE.Vector3(-0.17, 0.55, 0.0), SH_L = new THREE.Vector3(0.17, 0.55, 0.0); // her right is -x (she faces +z)
const WAIST = [0, 0.24, 0], NECK = [0, 0.645, 0.01], LEAN = 0.2;
const W = new THREE.Vector3(0.12, 0.52, 0);            // the place on the net they both work at (the pair's frame)
const NET = { x: 0.77, y0: 0.14, y1: 1.08, mesh: 0.07 };
const TURN = 0.9, HOLD = 2.5, NEAR = 20, REARM = 30, HUM = 25;
const MAXHEAD = (80 * Math.PI) / 180, SHOULDER = (10 * Math.PI) / 180;

function woman(low) {
  const P = rigPainter(), nu = low ? 16 : 24;
  const tab = (T, v) => { for (let k = 0; k < T.length - 1; k++) if (v <= T[k + 1][0]) { const t = smoothstep(T[k][0], T[k + 1][0], v); return T[k].slice(1).map((a, i) => a + (T[k + 1][i + 1] - a) * t); } return T[T.length - 1].slice(1); };
  // the dress pooled round legs folded to her right; purple only deep in the folds, a worn hem
  const SKIRT = [[0, 0.005, 0.47, 0.41, -0.12, 0.03], [0.35, 0.12, 0.43, 0.34, -0.1, 0.03], [0.7, 0.19, 0.25, 0.19, -0.03, 0.0], [1, 0.245, 0.15, 0.11, 0, 0]];
  const BODICE = [[0, 0.23, 0.15, 0.105, 0, 0], [0.45, 0.42, 0.155, 0.12, 0, 0.02], [0.85, 0.555, 0.175, 0.1, 0, 0], [1, 0.645, 0.052, 0.052, 0, 0.01]];
  const cloth = (v, r) => mix3(mix3(DRESS_D, DRESS, 0.3 + 0.7 * r), DRESS_HEM, 1 - smoothstep(0, 0.1, v));
  P.bone(0); clothBody(P, nu, low ? 6 : 9, (v) => tab(SKIRT, v), { folds: 11, amp: (v) => 0.06 * (1 - v * 0.5), colour: cloth, seed: 2.1, capTop: false, rough: 0.62 });
  P.bone(1); clothBody(P, nu, low ? 6 : 8, (v) => tab(BODICE, v), { folds: 5, amp: () => 0.018, colour: (v, r) => mix3(DRESS_D, DRESS, 0.5 + 0.5 * r), seed: 0.9, capBottom: false, rough: 0.6 });
  P.bone(2); head(P, 0, 0.74, 0.03, 0.084, { skin: SKIN, hair: HAIR, bun: true, sides: low ? 8 : 10 });
  for (const [b, f] of [[3, false], [4, true], [5, false], [6, true]]) { P.bone(b); f ? sleeve(P, A_FORE, 0.05, 0.06, mix3(DRESS_D, DRESS, 0.7), { hand: SKIN }) : sleeve(P, A_UP, 0.05, 0.05, mix3(DRESS_D, DRESS, 0.7)); }
  P.mre = [0, 0.6, 0];
  return P;
}
function frame(P) {
  P.bone(14); tone(P, FRAME, 1, 0, 0.8);
  for (const s of [-1, 1]) {
    P.loft([[s * 0.8, 0, 0], [s * 0.8, 1.13, 0]], [0.022, 0.02], 5, 0, true);
    P.loft([[s * 0.8, 0.02, -0.2], [s * 0.8, 0.02, 0.2]], [0.02, 0.02], 5, 0, true);
  }
  for (const y of [NET.y0 - 0.02, NET.y1 + 0.02]) P.loft([[-0.82, y, 0], [0.82, y, 0]], [0.016, 0.016], 5, 0, true);
}
// two copies of the woman's geometry in one: the second's bones offset by 7; then the frame
function pairGeometry(low) {
  const P = woman(low), n0 = P.n, i0 = P.i.length;
  const p = P.p.slice(), w = P.w.slice(), c = P.c.slice(), mr = P.mr.slice(), b = P.extra.aBone.slice(), idx = P.i.slice();
  for (let k = 0; k < p.length; k++) P.p.push(p[k]);
  for (let k = 0; k < w.length; k++) { P.w.push(w[k]); P.extra.aBone.push(b[k] + 7); }
  for (let k = 0; k < c.length; k++) { P.c.push(c[k]); P.mr.push(mr[k]); }
  for (let k = 0; k < i0; k++) P.i.push(idx[k] + n0);
  frame(P);
  return P.geometry();
}
function netGeometry(rng) {
  const nx = Math.round((2 * NET.x) / NET.mesh), ny = Math.round((NET.y1 - NET.y0) / NET.mesh);
  const K = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const edge = i === 0 || j === 0 || i === nx || j === ny;
    K.push([-NET.x + (i * 2 * NET.x) / nx + (edge ? 0 : (rng() - 0.5) * 0.008), NET.y0 + (j * (NET.y1 - NET.y0)) / ny + (edge ? 0 : (rng() - 0.5) * 0.008), (rng() - 0.5) * 0.004]);
  }
  const at = (i, j) => K[j * (nx + 1) + i], pos = [];
  // the place being worked has a few meshes open
  const open = (a, b) => Math.hypot((a[0] + b[0]) / 2 - W.x, (a[1] + b[1]) / 2 - W.y) < 0.065;
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    if (i < nx && !open(at(i, j), at(i + 1, j))) pos.push(...at(i, j), ...at(i + 1, j));
    if (j < ny && !open(at(i, j), at(i, j + 1))) pos.push(...at(i, j), ...at(i, j + 1));
  }
  // loose ends: short twine hanging from the worked place and from the lower edge
  const ends = [[W.x - 0.05, W.y + 0.02], [W.x + 0.06, W.y - 0.03], [W.x, W.y - 0.06], [-0.4, NET.y0], [0.31, NET.y0], [0.62, NET.y0 + 0.21]];
  for (const [x0, y0] of ends) {
    let x = x0, y = y0, z = 0; const sway = (rng() - 0.5) * 0.04, n = 3 + Math.floor(rng() * 2), seg = 0.025 + rng() * 0.02;
    for (let k = 0; k < n; k++) { const x1 = x + sway * (k + 1) * 0.3, y1 = y - seg, z1 = z + (rng() - 0.5) * 0.02; pos.push(x, y, z, x1, y1, z1); x = x1; y = y1; z = z1; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeBoundingSphere();
  return g;
}

export function buildCoheirs(ctx, groundAt) {
  const low = ctx.quality === 'low', site = SITES.coheirs;
  // their line runs along the shore (the Strandline's spine here runs from (-45, 153) to (-55, 162))
  const ax = -10, az = 9, al = Math.hypot(ax, az), A = [ax / al, az / al];
  const yaw = Math.atan2(A[0], A[1]);
  const gy = (x, z) => groundAt(x, z);
  const pairPlace = placeMatrix(new THREE.Matrix4(), site.x, gy(site.x, site.z), site.z, yaw);
  // each woman's place: A at -SEP facing +A, B at +SEP facing -A
  const seats = [-1, 1].map((s) => { const x = site.x + A[0] * SEP * s, z = site.z + A[1] * SEP * s; return { x, z, y: gy(x, z) - 0.02, yaw: s < 0 ? yaw : yaw + Math.PI }; });
  const places = seats.map((s) => placeMatrix(new THREE.Matrix4(), s.x, s.y, s.z, s.yaw));
  const geo = pairGeometry(low), bones = makeBones();
  const mesh = rigMesh(geo, bones, 'living-workers-coheirs', { sheen: true });
  ctx.scene.add(mesh);
  const netGeo = netGeometry(ctx.makeRng(70212));
  const net = new THREE.LineSegments(netGeo, new THREE.LineBasicMaterial({ color: new THREE.Color('#15120f'), fog: true }));
  net.name = 'living-workers-net'; net.matrixAutoUpdate = false; net.matrix.copy(pairPlace); net.castShadow = false;
  ctx.scene.add(net);
  for (const s of seats) ctx.addCollider({ x: s.x, z: s.z, r: 0.5 });
  ctx.addCollider({ x: site.x, z: site.z, r: 0.3 }); ctx.addCollider({ x: site.x - A[1] * 0.75, z: site.z + A[0] * 0.75, r: 0.25 }); ctx.addCollider({ x: site.x + A[1] * 0.75, z: site.z - A[0] * 0.75, r: 0.25 });
  // the work point in each woman's own frame
  const wl = [new THREE.Vector3(W.x, W.y, SEP - 0.035), new THREE.Vector3(-W.x, W.y, SEP - 0.035)];
  // the knots' intervals, 4-6 s, the same sequence every visit
  const krng = ctx.makeRng(70213), KN = 64, kint = Array.from({ length: KN }, () => 4 + krng() * 2);
  const cam = ctx.player.pos, cue = ctx.audio, cuePos = { x: site.x, y: pairPlace.elements[13] + 0.6, z: site.z };
  const S = { phase: 'work', t: 0, turn: 0, armed: true, knot: 0, kt: 0, knots: 0, humming: false, turns: 0, turnedAt: -1, frames: 0, head: [0, 0], shoulders: [0, 0] };
  const torsoL = new THREE.Matrix4(), I4 = new THREE.Matrix4(), sh = new THREE.Vector3(), hr = new THREE.Vector3(), hl = new THREE.Vector3();
  const POLE_R = new THREE.Vector3(-0.5, -1, -0.3), POLE_L = new THREE.Vector3(0.5, -1, -0.3);
  // the hands' offsets from the work point at time u in a knot of length L (0 .. L): working, then the pull
  const work = (u, L, side, out) => {
    const p = u / L, pull = smoothstep(0.78, 0.86, p) * (1 - smoothstep(0.9, 1.0, p));
    const ph = u * 10.0, still = 1 - pull;
    out.set(side * (0.035 + 0.055 * pull) + 0.012 * Math.cos(ph) * still * side, -0.01 * (side < 0 ? 0 : 1) + 0.01 * Math.sin(ph) * still, -0.03 - 0.045 * pull + 0.008 * Math.sin(ph * 0.5) * still);
    return out;
  };
  const wantHead = (k) => { // her head's yaw toward the walker, from the net (her forward), clamped
    const s = seats[k], rel = angDiff(Math.atan2(cam.x - s.x, cam.z - s.z), s.yaw);
    return clamp(rel, -MAXHEAD, MAXHEAD);
  };
  function pose() {
    const tau = ease(S.turn);
    for (let k = 0; k < 2; k++) {
      const o = k * 7, place = places[k];
      const h = wantHead(k) * tau, shy = Math.sign(h) * SHOULDER * tau;
      S.head[k] = h; S.shoulders[k] = shy;
      bones[o].copy(place);
      pivot(torsoL, I4, WAIST[0], WAIST[1], WAIST[2], LEAN, shy, 0);
      bones[o + 1].multiplyMatrices(place, torsoL);
      pivot(bones[o + 2], bones[o + 1], NECK[0], NECK[1], NECK[2], 0.32 * (1 - tau) - 0.05, h - shy, 0);
      // the unpicker's hands a beat behind the mender's
      let u = S.kt - (k ? 0.5 : 0), L = kint[S.knot % KN];
      if (u < 0) { L = kint[(S.knot + KN - 1) % KN]; u += L; }
      work(u, L, -1, hr).add(wl[k]); work(u, L, 1, hl).add(wl[k]);
      // while they look, the hands rest at the net
      if (tau > 0) { hr.lerp(sh.set(wl[k].x - 0.04, wl[k].y - 0.06, wl[k].z - 0.12), tau); hl.lerp(sh.set(wl[k].x + 0.04, wl[k].y - 0.06, wl[k].z - 0.12), tau); }
      arm2(bones[o + 3], bones[o + 4], place, sh.copy(SH_R).applyMatrix4(torsoL), hr, A_UP, A_FORE, POLE_R);
      arm2(bones[o + 5], bones[o + 6], place, sh.copy(SH_L).applyMatrix4(torsoL), hl, A_UP, A_FORE, POLE_L);
    }
    bones[14].copy(pairPlace);
    mesh.userData.posed();
  }
  const hum = (on) => { if (on === S.humming) return; S.humming = on; cue?.cue?.('coheirs-hum', cuePos, on ? { start: true } : { stop: true }); };
  function update(dt, t) {
    S.frames++;
    const d = hyp(cam.x - site.x, cam.z - site.z);
    if (d > REARM) S.armed = true;
    S.t += dt;
    if (S.phase === 'work') {
      S.kt += dt;
      const L = kint[S.knot % KN];
      if (S.kt >= L * 0.85 && !S.pulled) { S.pulled = true; S.knots++; cue?.cue?.('coheirs-knot', cuePos); }
      if (S.kt >= L) { S.kt -= L; S.knot++; S.pulled = false; }
      if (S.armed && d < NEAR) { S.phase = 'turn'; S.t = 0; S.armed = false; S.turns++; S.turnedAt = S.frames; }
    }
    if (S.phase === 'turn') { S.turn = ramp(S.turn, 1, 1 / TURN, dt); if (S.turn >= 1) { S.phase = 'hold'; S.t = 0; } }
    else if (S.phase === 'hold') { if (S.t >= HOLD) { S.phase = 'back'; S.t = 0; } }
    else if (S.phase === 'back') { S.turn = ramp(S.turn, 0, 1 / TURN, dt); if (S.turn <= 0) { S.phase = 'work'; S.t = 0; } }
    hum(S.phase === 'work' && d < HUM);
    pose();
  }
  pose();
  ctx.registerUpdate(update, { pos: site, near: 80, hz: 4 });
  return {
    mesh, net, state: S, seats, axis: A,
    stats: () => ({ calls: 2, tris: Math.round(tris(geo)), netSegments: netGeo.attributes.position.count / 2 }),
    // test and render hook: turn both heads to the walker now (and hold them there while `hold` is set)
    turn(hold = false) { S.phase = hold ? 'hold' : 'turn'; S.t = hold ? -1e9 : 0; S.armed = false; if (hold) S.turn = 1; S.turns++; S.turnedAt = S.frames; pose(); },
    release() { S.phase = 'back'; S.t = 0; },
  };
}
