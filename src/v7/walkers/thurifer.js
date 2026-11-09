// CD The Little Thurifer (IDEAS-v5.md CD; wilderness-v5.md "### CD"): a child-sized figure in robes three times too
// long, the hem dragging a train metres behind, swinging a censer that gives off a thin blue smoke, walking P3
// between the Wayside Shrine and the Cardinal Stones and back. From far off a child; up close, under the hood, the face
// is old and unfinished. Approach and it steps off the track, bows far too low, and waits for you to pass.
//
// Numbers: 1.15 m to the hood's peak; 0.55 m/s; stride 0.55 m. The train: a cloth strip of 12 x 4 segments laid along
// the last 2.75 m that the hem's back has travelled (a ring buffer of its positions every 0.25 m), each vertex 3 cm
// over the rendered ground, lifting to the hem at the join. The censer: 0.8 m of chain from the right hand, +-35 degrees
// on a 1.8 s pendulum. Turns: on the spot over 3 s and a 6 s pause, at P3's last sample (the stones) and at the first
// sample at least 8 m from the man in the cloak of eyes (the shrine), read from ctx.uncanny.cloak each time it gets
// there. The bow: within 10 m and closing at over 0.3 m/s, or within 5 m: 1.6 m sideways away from your side over 2.5 s,
// turn to face the track, pitch 75 degrees about the hips over 1.5 s; held while you are within 6 m or have not passed
// (3 m beyond it along P3, or 14 m away); rise 1.5 s, step back 2 s, walk on. A collider of r 0.3 while it is off the track.
import * as THREE from 'three';
import { clamp, smoothstep, lerp, hyp } from '../../noise.js';
import { Track, Gait, figurePainter, figureMesh, rootMatrix, about, hang, point, easeYaw, standGround, TAU, DEG } from './gait.js';
import { angDiff } from '../../fauna/uncanny/kit.js';

const H = 1.15, SPEED = 0.55, STRIDE = 0.55, TURN_T = 3, PAUSE_T = 6;
const CHAIN = 0.8, SWING = 35 * DEG, PERIOD = 1.8;
const BOW = { near: 10, close: 0.3, inner: 5, step: 1.6, stepT: 2.5, pitch: 75 * DEG, downT: 1.5, hold: 6, passed: 3, far: 14, upT: 1.5, backT: 2 };
const TRAIN = { segs: 12, across: 4, len: 2.75, every: 0.25, lift: 0.03 };
const HIP = 0.5;
const ROBE = '#15110f', ROBE_HI = '#30231a', VOID = '#040303', SKIN = '#77695d', SKIN_D = '#3e322c', BRASS = '#8e6a32', BRASS_D = '#3a2a16';
const PARTS = 6; // 0 skirt, 1 torso and hood, 2 left arm, 3 right arm, 4 the censer, 5 its chain

function table(tab, v) {
  for (let k = 0; k < tab.length - 1; k++) if (v <= tab[k + 1][0]) { const t = (v - tab[k][0]) / (tab[k + 1][0] - tab[k][0]); return lerp(tab[k][1], tab[k + 1][1], smoothstep(0, 1, t)); }
  return tab[tab.length - 1][1];
}
const R_ROBE = [[0, 0.27], [0.15, 0.225], [0.42, 0.175], [0.6, 0.16], [0.86, 0.17], [0.94, 0.14], [1, 0.06]];
const R_HOOD = [[0, 0.13], [0.2, 0.14], [0.55, 0.135], [0.8, 0.108], [0.93, 0.07], [1, 0.012]];
const SH_R = [-0.15, 0.76, 0.0], SH_L = [0.15, 0.76, 0.0];
const HAND = [-0.33, 0.97, 0.12]; // the right hand, holding the chain up beside it
const FACE = { y: 0.94, z: 0.085 };

function paint(n2, low) {
  const P = figurePainter();
  // the robe: a narrow child's body in far too much cloth; the back of the hem trails to the train's join
  P.part(0).hem(0);
  P.grid(low ? 18 : 26, low ? 10 : 14, (u, v, o) => {
    const a = u * TAU, y = v * 0.84, side = Math.sin(a);
    const r = table(R_ROBE, v), fold = 1 + (0.09 * (1 - v) + 0.02) * Math.pow(Math.abs(Math.sin(a * 5 + 0.7 * Math.sin(a * 2))), 0.6) + 0.03 * n2(a * 2, v * 4);
    const trail = smoothstep(0.22, 0, v) * Math.max(0, -side);
    P.paint(n2(a * 3, v * 6) > 0.45 ? ROBE_HI : ROBE, 0, 0.97);
    const w = smoothstep(HIP - 0.08, HIP + 0.08, y);
    P.part(0, 1, w).hem(smoothstep(0.3, 0, v) * (1 - trail));
    o[0] = Math.cos(a) * r * fold; o[1] = Math.max(0.015, y - trail * 0.02); o[2] = side * r * 0.8 * fold - trail * 0.22 + 0.02 * v;
  }, false, false);
  // the hood: deep, bowed forward, its front pulled in to a dark recess where the face is
  P.part(1).hem(0);
  P.grid(low ? 16 : 22, 14, (u, v, o) => {
    const a = u * TAU, front = Math.sin(a);
    const cy = 0.8 + v * 0.35, cz = 0.0 + 0.05 * Math.sin(Math.PI * v) - 0.08 * Math.pow(v, 2.5);
    const r = table(R_HOOD, v);
    const m = smoothstep(0.45, 0.85, front) * smoothstep(0.1, 0.28, v) * (1 - smoothstep(0.55, 0.75, v));
    P.paint(m > 0.25 ? VOID : n2(a * 4, v * 5) > 0.5 ? ROBE_HI : ROBE, 0, 0.97);
    const rr = r * (1 - 0.9 * m);
    o[0] = Math.cos(a) * rr; o[1] = cy - 0.03 * front * smoothstep(0.6, 1, v); o[2] = cz + front * rr * 1.1 + 0.04 * smoothstep(0.5, 1, v) * front;
  }, true, true);
  // the face: a small curved sheet in the hood's recess; old, soft, creased; features barely formed
  const nu = low ? 8 : 12, nv = low ? 9 : 14;
  P.sheet(nu, nv, (u, v, o) => {
    const x = (0.5 - u) * 0.1, y = FACE.y + (v - 0.5) * 0.13; // wound to face +z
    const dy = y - FACE.y;
    let z = FACE.z - (x * x) / 0.09 - (dy * dy) / 0.16;
    // hollows for eyes, a ridge for a nose, a crease for a mouth; nothing else
    const eye = Math.exp(-(((Math.abs(x) - 0.022) / 0.012) ** 2) - (((dy - 0.017) / 0.01) ** 2));
    const nose = Math.exp(-((x / 0.007) ** 2)) * smoothstep(0.012, 0.0, dy) * smoothstep(-0.03, -0.012, dy);
    const mouth = Math.exp(-(((dy + 0.035) / 0.004) ** 2)) * smoothstep(0.03, 0.01, Math.abs(x));
    z += -0.008 * eye + 0.008 * nose - 0.003 * mouth;
    const crease = 0.5 + 0.5 * Math.sin(dy * 260 + Math.sin(x * 90) * 1.2);
    const dark = clamp(eye * 1.1 + mouth * 0.7 + (crease > 0.86 ? 0.25 : 0) + 0.3 * smoothstep(0.035, 0.05, Math.abs(x)), 0, 1);
    P.paint(new THREE.Color(SKIN).lerp(new THREE.Color(SKIN_D), dark).getHex(), 0, 0.8);
    o[0] = x; o[1] = y; o[2] = z;
  });
  // the left sleeve: hanging, far too long, nothing showing at the cuff
  P.part(2).paint(ROBE, 0, 0.97);
  P.loft([[SH_L[0], SH_L[1], 0], [0.19, 0.55, 0.02], [0.2, 0.36, 0.05], [0.2, 0.27, 0.06]], [0.045, 0.06, 0.075, 0.08], low ? 6 : 8, 0, true);
  // the right sleeve: up and out to the hand that holds the chain, the long cuff drooping under it
  P.part(3).paint(ROBE, 0, 0.97);
  P.loft([[SH_R[0], SH_R[1], 0], [-0.25, 0.8, 0.06], [HAND[0] + 0.02, HAND[1] - 0.02, HAND[2] - 0.02], [HAND[0] + 0.03, HAND[1] - 0.09, HAND[2] - 0.01]], [0.045, 0.05, 0.06, 0.045], low ? 6 : 8, 0, true);
  P.paint(SKIN_D, 0, 0.8);
  P.blob(HAND[0], HAND[1], HAND[2] + 0.03, 0.022, 0.02, 0.03, 5, 3);
  // the chain and the censer: a pierced brass bowl and lid on 0.8 m of chain
  P.part(5).paint(BRASS_D, 0.6, 0.5);
  P.loft([[HAND[0], HAND[1], HAND[2] + 0.03], [HAND[0], HAND[1] - CHAIN, HAND[2] + 0.03]], [0.005, 0.005], 3, 0, false);
  const cy = HAND[1] - CHAIN, cz = HAND[2] + 0.03;
  P.part(4).paint(BRASS, 0.75, 0.45);
  P.lathe(HAND[0], cy - 0.11, cz, [[0.0, 0], [0.03, 0.005], [0.06, 0.03], [0.068, 0.06], [0.06, 0.07]], 9);
  P.paint(BRASS_D, 0.7, 0.55);
  P.lathe(HAND[0], cy - 0.04, cz, [[0.062, 0], [0.05, 0.02], [0.03, 0.035], [0.008, 0.04]], 9);
  return P;
}

export function buildThurifer(ctx, F, cue) {
  const { THREE: T } = ctx;
  const low = ctx.quality === 'low';
  const G = standGround(ctx), GM = G.mesh;
  const leads = ctx._walkerLeads;
  const L3 = leads.find((l) => l.id === 'P3');
  const track = new Track(L3.lines[0]);
  const P = paint(ctx.noise.noise2, low);
  const fig = figureMesh(P, PARTS, 'walkers-thurifer', 0.6, 1.6);
  const root = new T.Group(); root.name = 'walkers-thurifer-root';
  root.add(fig.mesh);
  const parts = fig.parts;

  // ---- the train: a strip on the ground behind it, world space, rebuilt when the hem moves
  const nr = TRAIN.segs + 1, nc = TRAIN.across + 1;
  const tpos = new Float32Array(nr * nc * 3), tcol = new Float32Array(nr * nc * 3), tidx = [];
  const cA = new T.Color(ROBE), cB = new T.Color('#2a2219');
  for (let j = 0; j < nr; j++) for (let i = 0; i < nc; i++) {
    const k = j * nc + i, f = j / (nr - 1), wear = clamp(f * 0.8 + 0.25 * ctx.noise.noise2(i * 1.3, j * 0.7), 0, 1);
    const c = cA.clone().lerp(cB, wear * 0.6);
    tcol[k * 3] = c.r; tcol[k * 3 + 1] = c.g; tcol[k * 3 + 2] = c.b;
    if (i < nc - 1 && j < nr - 1) tidx.push(k, k + 1, k + nc, k + 1, k + nc + 1, k + nc); // facing up
  }
  const tgeo = new T.BufferGeometry();
  const tPosA = new T.BufferAttribute(tpos, 3); tPosA.setUsage(T.DynamicDrawUsage);
  tgeo.setAttribute('position', tPosA); tgeo.setAttribute('color', new T.BufferAttribute(tcol, 3));
  tgeo.setIndex(tidx);
  const tnorm = new Float32Array(nr * nc * 3); for (let k = 0; k < nr * nc; k++) tnorm[k * 3 + 1] = 1;
  const tNormA = new T.BufferAttribute(tnorm, 3); tNormA.setUsage(T.DynamicDrawUsage);
  tgeo.setAttribute('normal', tNormA);
  tgeo.boundingSphere = new T.Sphere(new T.Vector3(), 4);
  const tmat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0, side: T.DoubleSide });
  tmat.customProgramCacheKey = () => 'v7-walkers-train';
  const train = new T.Mesh(tgeo, tmat);
  train.name = 'walkers-thurifer-train'; train.receiveShadow = true; train.castShadow = false;

  // the hem's path: a ring buffer of the join's positions every 0.25 m (newest at head)
  const RING = Math.ceil(TRAIN.len / TRAIN.every) + 4;
  const rx = new Float64Array(RING), rz = new Float64Array(RING);
  let head = 0, filled = 0;
  const pushRing = (x, z) => { head = (head + 1) % RING; rx[head] = x; rz[head] = z; filled = Math.min(RING, filled + 1); };
  const ringAt = (k) => { const i = ((head - k) % RING + RING) % RING; return i; };

  // ---- state
  const S = {
    s: 0, dir: 1, mode: 'walk', t: 0, yaw: 0, x: 0, z: 0, gy: 0, off: 0, offSide: 1, bowK: 0, faceYaw: 0,
    walkerSide: 0, held: null, heldK: 1, swingA: 1, turnFrom: 0, turnTo: 0, shrineS: null, cloakAt: null, hiss: false, bows: 0, armed: true,
  };
  const at = { x: 0, z: 0, tx: 0, tz: 1 };
  const gait = new Gait('thurifer', H, () => STRIDE, (f, i) => {});
  const rng = ctx.makeRng(7101);
  S.s = 25 + rng() * (track.length - 50); S.dir = rng() < 0.5 ? 1 : -1;
  const collider = { x: 1e6, z: 1e6, r: 0.3 };
  ctx.addCollider(collider);

  // the shrine-end turn: the first sample (from the shrine end) at least 8 m from the man in the cloak of eyes
  function shrineTurnS() {
    const c = ctx.uncanny?.cloak?.position;
    S.cloakAt = c ? [c.x, c.z] : null;
    if (!c) return 8;
    for (let i = 0; i < track.n; i++) if (hyp(track.x[i] - c.x, track.z[i] - c.z) >= 8) return track.s[i];
    return 8;
  }
  S.shrineS = shrineTurnS();

  // fill the train's ring as if it had walked here
  function seedRing() {
    head = 0; filled = 0;
    for (let k = Math.ceil(TRAIN.len / TRAIN.every) + 3; k >= 0; k--) {
      track.at(S.s - S.dir * (0.42 + k * TRAIN.every), at); pushRing(at.x, at.z);
    }
  }

  // ---- the walker
  const cam = ctx.camera.position, walker = { x: 0, z: 0, vx: 0, vz: 0, init: false };
  const proj = { s: 0, d: 0 };

  const M0 = new T.Matrix4(), tmpV = new T.Vector3(), cueP = { x: 0, y: 0, z: 0 };
  const censerW = new T.Vector3(), _scale = new T.Matrix4(), _sh = new T.Matrix4();
  let lastSwingSign = 0;

  function pose(dt, t) {
    const sw = Math.sin((t / PERIOD) * TAU);
    S.swingA = lerp(S.swingA, S.mode === 'walk' || S.mode === 'turn' || S.mode === 'pause' ? 1 : 0, 1 - Math.exp(-2.5 * dt));
    const swing = SWING * sw * S.swingA;
    const dsw = Math.cos((t / PERIOD) * TAU);
    const sign = dsw > 0 ? 1 : -1;
    if (lastSwingSign && sign !== lastSwingSign && S.swingA > 0.3 && hyp(cam.x - S.x, cam.z - S.z) < 25) { cueP.x = censerW.x; cueP.y = censerW.y; cueP.z = censerW.z; cue('thurifer-chain', cueP); }
    lastSwingSign = sign;
    rootMatrix(parts[0], gait.bob, gait.roll);
    about(parts[1], parts[0], 0, HIP, 0, S.bowK * BOW.pitch);
    about(parts[2], parts[1], SH_L[0], SH_L[1], SH_L[2], -12 * DEG * gait.s1);
    about(parts[3], parts[1], SH_R[0], SH_R[1], SH_R[2], 0);
    point(tmpV, parts[3], HAND[0], HAND[1], HAND[2] + 0.03);
    // the chain hangs from the hand; when the hand is too low for it (the bow) the censer rests on the ground and the
    // chain between is shorter (slack, coiled at the bowl)
    const k = clamp((tmpV.y - 0.13) / CHAIN, 0.15, 1);
    hang(parts[5], tmpV.x, tmpV.y, tmpV.z, 0, 0, 0, swing);
    parts[5].multiply(_scale.makeScale(1, k, 1)).multiply(_sh.makeTranslation(-HAND[0], -HAND[1], -(HAND[2] + 0.03)));
    const cs = Math.sin(swing), cc = Math.cos(swing);
    hang(parts[4], tmpV.x, tmpV.y - CHAIN * k * cc, tmpV.z - CHAIN * k * cs, HAND[0], HAND[1] - CHAIN, HAND[2] + 0.03, swing);
    fig.gait.x = 0.05 * -gait.s1;
    // the censer in the world: the smoke's source
    point(censerW, parts[4], HAND[0], HAND[1] - CHAIN - 0.02, HAND[2] + 0.03);
    root.updateMatrixWorld(true);
    censerW.applyMatrix4(fig.mesh.matrixWorld);
  }

  function place() {
    track.at(S.s, at);
    const nx = at.tz, nz = -at.tx; // the track's left
    S.x = at.x + nx * S.off * S.offSide; S.z = at.z + nz * S.off * S.offSide;
    S.gy = G(S.x, S.z);
    root.position.set(S.x, S.gy - 0.02, S.z);
    root.rotation.y = S.yaw;
  }

  function trainUpdate() {
    // the join: the back of the hem
    const jx = S.x - Math.sin(S.yaw) * 0.4, jz = S.z - Math.cos(S.yaw) * 0.4;
    if (hyp(jx - rx[head], jz - rz[head]) >= TRAIN.every) pushRing(jx, jz);
    // lay the strip along the ring from the join back, by arc length
    let k = 0, ax = jx, az = jz, bx = rx[ringAt(0)], bz = rz[ringAt(0)], segL = hyp(bx - ax, bz - az), acc = 0;
    let tx = 0, tz = 1;
    for (let j = 0; j < nr; j++) {
      const want = (j / (nr - 1)) * TRAIN.len;
      while (acc + segL < want && k < filled - 1) { acc += segL; ax = bx; az = bz; k++; const i = ringAt(k); bx = rx[i]; bz = rz[i]; segL = hyp(bx - ax, bz - az); }
      const f = segL > 1e-4 ? clamp((want - acc) / segL, 0, 1) : 0;
      const cx = ax + (bx - ax) * f, cz = az + (bz - az) * f;
      if (segL > 1e-4) { tx = (bx - ax) / segL; tz = (bz - az) / segL; }
      const u = j / (nr - 1), half = lerp(0.24, 0.17, u) * (1 + 0.06 * Math.sin(j * 2.1)), nx = -tz, nz = tx;
      const lift = lerp(0.09, 0, smoothstep(0, 0.22, u));
      for (let i = 0; i < nc; i++) {
        const w = (i / (nc - 1)) * 2 - 1, x = cx + nx * half * w, z = cz + nz * half * w;
        const o = (j * nc + i) * 3;
        tpos[o] = x; tpos[o + 1] = GM(x, z) + TRAIN.lift + lift * (1 - 0.3 * w * w) + 0.012 * (1 - w * w) * (u > 0.2 ? 1 : 0); tpos[o + 2] = z;
      }
    }
    tPosA.needsUpdate = true;
    tgeo.boundingSphere.center.set(jx, S.gy, jz);
  }

  function readWalker(dt) {
    if (!walker.init || hyp(cam.x - walker.x, cam.z - walker.z) > 8) { walker.x = cam.x; walker.z = cam.z; walker.vx = walker.vz = 0; walker.init = true; return; }
    if (dt > 0) {
      const k = 1 - Math.exp(-6 * dt);
      walker.vx += ((cam.x - walker.x) / dt - walker.vx) * k; walker.vz += ((cam.z - walker.z) / dt - walker.vz) * k;
    }
    walker.x = cam.x; walker.z = cam.z;
  }

  function setMode(m) { S.mode = m; S.t = 0; }
  // facing the track from the side it stands on (the track's left is (tz, -tx))
  function faceTrackYaw() { track.at(S.s, at); return Math.atan2(-at.tz * S.offSide, at.tx * S.offSide); }
  function hiss(on) { if (on !== S.hiss) { S.hiss = on; cueP.x = S.x; cueP.y = S.gy + 0.2; cueP.z = S.z; cue('thurifer-hiss', cueP, on ? { start: true } : { stop: true }); } }

  function update(dt, t) {
    readWalker(dt);
    const wx = walker.x - S.x, wz = walker.z - S.z, wd = hyp(wx, wz);
    const radial = wd > 0.01 ? -(walker.vx * wx + walker.vz * wz) / wd : 0; // closing speed
    S.t += dt;
    let v = 0;
    const wantBow = (wd < BOW.near && radial > BOW.close) || wd < BOW.inner;
    if (wd > BOW.near) S.armed = true;
    if (S.held == null && S.armed && (S.mode === 'walk' || S.mode === 'pause' || S.mode === 'turn') && wantBow) {
      S.armed = false;
      // step off on the side away from the walker
      track.at(S.s, at);
      const left = (wx * at.tz - wz * at.tx) > 0; // the walker on the track's left?
      S.offSide = left ? -1 : 1; S.resume = S.mode === 'walk' ? 'walk' : S.mode; S.prevYaw = S.yaw;
      track.project(walker.x, walker.z, proj);
      S.walkerSide = Math.sign(proj.s - S.s) || 1;
      S.bows++;
      setMode('stepOff');
    }
    switch (S.mode) {
      case 'walk': {
        v = SPEED;
        S.s += S.dir * v * dt;
        const end = S.dir > 0 ? track.length : S.shrineS;
        if ((S.dir > 0 && S.s >= end) || (S.dir < 0 && S.s <= end)) { S.s = end; S.turnFrom = S.yaw; S.turnTo = S.yaw + Math.PI; setMode('turn'); }
        else S.yaw = easeYaw(S.yaw, track.heading(S.s) + (S.dir < 0 ? Math.PI : 0), dt);
        break;
      }
      case 'turn': {
        const k = smoothstep(0, 1, clamp(S.t / TURN_T, 0, 1));
        S.yaw = S.turnFrom + (S.turnTo - S.turnFrom) * k;
        v = 0.12 * Math.sin(Math.PI * clamp(S.t / TURN_T, 0, 1)); // small steps round
        if (S.t >= TURN_T) { S.dir = -S.dir; setMode('pause'); }
        break;
      }
      case 'pause':
        if (S.t >= PAUSE_T) { if (S.dir < 0) S.shrineS = shrineTurnS(); setMode('walk'); }
        break;
      case 'stepOff': {
        const k = smoothstep(0, 1, clamp(S.t / BOW.stepT, 0, 1));
        S.off = BOW.step * k; v = 0.6;
        S.faceYaw = faceTrackYaw();
        S.yaw = easeYaw(S.yaw, S.faceYaw, dt);
        if (S.t >= BOW.stepT) setMode('bowDown');
        break;
      }
      case 'bowDown':
        S.yaw = easeYaw(S.yaw, S.faceYaw, dt);
        S.bowK = smoothstep(0, 1, clamp(S.t / BOW.downT, 0, 1));
        if (S.t >= BOW.downT) setMode('bow');
        break;
      case 'bow': {
        S.bowK = S.held ? S.heldK : 1;
        if (S.held != null) break;
        track.project(walker.x, walker.z, proj);
        const passed = (proj.s - S.s) * S.walkerSide < -BOW.passed && proj.d < 8;
        if (wd > BOW.hold && (passed || wd > BOW.far)) setMode('rise');
        break;
      }
      case 'rise':
        S.bowK = 1 - smoothstep(0, 1, clamp(S.t / BOW.upT, 0, 1));
        if (S.t >= BOW.upT) setMode('stepBack');
        break;
      case 'stepBack': {
        const k = smoothstep(0, 1, clamp(S.t / BOW.backT, 0, 1));
        S.off = BOW.step * (1 - k); v = 0.6;
        S.yaw = easeYaw(S.yaw, track.heading(S.s) + (S.dir < 0 ? Math.PI : 0), dt);
        if (S.t >= BOW.backT) { S.off = 0; setMode(S.resume === 'pause' || S.resume === 'turn' ? 'pause' : 'walk'); }
        break;
      }
    }
    hiss(S.mode === 'walk');
    gait.advance(dt, v);
    place();
    const off = S.mode === 'stepOff' || S.mode === 'bowDown' || S.mode === 'bow' || S.mode === 'rise' || S.mode === 'stepBack';
    collider.x = off ? S.x : 1e6; collider.z = off ? S.z : 1e6;
    // far off (beyond 120 m) only its place along P3 is kept; the pose, the train and the smoke wait until you come back
    const far = wd > 120;
    if (far) { S.far = true; S.smokeAcc = 0; return; }
    if (S.far) { S.far = false; if (S.mode === 'walk' || S.mode === 'pause') seedRing(); }
    pose(dt, t);
    trainUpdate();
    // the smoke: one sprite every 0.1 s at the censer, more of them caught up after a throttled gap
    S.smokeAcc = (S.smokeAcc || 0) + dt;
    let n = 0;
    while (S.smokeAcc >= 0.1 && n < 40) { S.smokeAcc -= 0.1; F.born(F.K.smoke, censerW.x, censerW.y + 0.04, censerW.z, t - S.smokeAcc); n++; }
  }

  seedRing();
  place(); pose(0, 0); trainUpdate();
  ctx.registerUpdate(update, { at: () => root.position, near: 80, hz: 4 });

  const api = {
    root, train, mesh: fig.mesh, track, collider,
    get state() { return { s: S.s, dir: S.dir, mode: S.mode, x: S.x, z: S.z, yaw: S.yaw, off: S.off, bowK: S.bowK, bows: S.bows, shrineS: S.shrineS, cloakAt: S.cloakAt, length: track.length }; },
    // place(s, dir): put it walking at arc length s in direction dir
    place(s, dir = 1) { S.s = clamp(s, S.shrineS ?? 0, track.length); S.dir = dir; S.off = 0; S.bowK = 0; S.held = null; S.yaw = track.heading(S.s) + (dir < 0 ? Math.PI : 0); setMode('walk'); seedRing(); place(); pose(0, ctx.time.t); trainUpdate(); return api.state; },
    // bow(s, k = 1, side = 1): pose it bowed (k of the full bow) off the track at s, and hold; bow(null) lets go
    bow(s = 60, k = 1, side = 1) {
      if (s === null) { S.held = null; return api.state; }
      api.place(s, 1);
      S.offSide = side;
      // walk the step-off so the train follows it off the track
      const y0 = S.yaw, y1 = faceTrackYaw();
      for (let i = 1; i <= 12; i++) { S.off = (BOW.step * i) / 12; S.yaw = y0 + angDiff(y1, y0) * Math.min(1, i / 8); place(); trainUpdate(); }
      S.faceYaw = S.yaw = y1;
      S.bowK = S.heldK = k; S.held = true; S.walkerSide = 1; setMode('bow');
      place(); pose(0, ctx.time.t); trainUpdate();
      return api.state;
    },
    // sim(seconds, dt): run its update that long at once (tests), with the camera where it is
    sim(sec, dt = 0.1) { let t = ctx.time.t; for (let k = 0; k < sec / dt; k++) { t += dt; update(dt, t); } return api.state; },
    stats() { return { calls: 2, tris: fig.tris + tidx.length / 3 }; },
  };
  return api;
}
