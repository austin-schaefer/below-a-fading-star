// CF the Sexton of No One (v7, living-workers): "A man in black with a spade, digging graves in neat rows on the
// south moor: forty or so open, square, each the same depth, none with a stone, none filled. He digs one more each
// gutter. Approach and he stops, leans on the spade, measures you from head to foot with a look, and goes back to
// digging."
// The plan and the clearances are graves.js, the ground cut.js. At load 40 graves are open and he is part way down
// the 41st, standing at its end. A dig is 2.6 s: the spade's bite (`sexton-bite`), a lever, a throw onto the heap
// with 4-6 clods in the air (`sexton-throw`). The grave deepens from 0 to 1.8 m over the time to the next gutter;
// at each gutter's end (armed when the sun's flicker falls below 0.5, fired when it rises past 0.85, read by a
// 1 Hz watcher that runs wherever you are) it is finished and he walks to the next slot (3 m over 4 s) and begins
// it. The count holds for the page's session; after the last slot he goes on digging the last. Within 12 m (armed
// again beyond 20 m) he stops, leans on the spade (1.2 s), his look goes from your feet up to your eyes (2.0 s),
// holds (1.0 s), and he goes back to digging (1 s).
import * as THREE from 'three';
import { hyp, smoothstep, clamp, lerp } from '../../noise.js';
import { angDiff } from '../../fauna/uncanny/kit.js';
import { rigPainter, rigMesh, makeBones, pivot, limb, arm2, placeMatrix, ramp, ease, tris } from './rig.js';
import { rgb, tone, mix3, clothBody, head, sleeve } from './body.js';
import { GRAVE, heapZ } from './graves.js';
import { buildGround } from './cut.js';
import { LIVERY, lv, stole, badge, collar, staffHead, tag } from '../../v8/livery.js';

const BLACK = rgb(lv('#17141a', LIVERY.coat)), BLACK_D = rgb(lv('#0b0a0c', LIVERY.coatD)), HEM = rgb(lv('#2a2522', '#3a3836')), SKIN = rgb('#86705f'), HAIR = rgb('#2b2622'), WOOD = rgb('#3a2c20'), IRON = rgb('#2d2b29'), BOOT = rgb('#120f0d');
const A_UP = 0.3, A_FORE = 0.3, GRIP = 0.45, SPADE = 1.0, BLADE = 0.28;
const HIP = [0, 0.95, 0], NECK = [0, 1.52, 0.02], HEAD_Y = 1.63;
const SH_R = new THREE.Vector3(-0.2, 1.42, 0.0), SH_L = new THREE.Vector3(0.2, 1.42, 0.0); // his right is -x (he faces +z)
const STAND = GRAVE.len / 2 + 0.45, WALK = 0.75;      // he stands 0.45 m off the grave's end; walks 3 m in 4 s
const DIG = 2.6, NEAR = 12, REARM = 20;
const LEAN_T = 1.2, LOOK_T = 2.0, HOLD_T = 1.0, BACK_T = 1.0;
// the dig, as key poses over one 2.6 s stroke: [u, grip (x, y, z), shaft direction (grip to blade), torso lean, twist]
// x is mirrored to the heap's side (hs) at run time
const KEYS = [
  [0.0, [0.08, 1.12, 0.32], [0, -0.85, 0.52], 0.15, 0],
  [0.22, [0.05, 0.86, 0.5], [0, -0.96, 0.28], 0.45, 0],   // the bite
  [0.45, [0.05, 0.74, 0.28], [0, -0.72, 0.69], 0.38, 0],  // the lever
  [0.62, [0.0, 1.0, 0.32], [0, -0.55, 0.83], 0.25, 0.15],
  [0.75, [0.12, 1.08, 0.38], [0.55, -0.35, 0.76], 0.2, 0.5], // the throw
  [1.0, [0.08, 1.12, 0.32], [0, -0.85, 0.52], 0.15, 0],
];
const LEANPOSE = [[0.0, 1.05, 0.42], [0, -1, 0], 0.12, 0];

function build(low) {
  const P = rigPainter(), nu = low ? 14 : 20;
  const tab = (T, v) => { for (let k = 0; k < T.length - 1; k++) if (v <= T[k + 1][0]) { const t = smoothstep(T[k][0], T[k + 1][0], v); return T[k].slice(1).map((a, i) => a + (T[k + 1][i + 1] - a) * t); } return T[T.length - 1].slice(1); };
  // ---- 0: legs, boots and the coat's skirts
  P.bone(0);
  tone(P, BLACK_D, 1, 0, 0.9);
  for (const s of [-1, 1]) P.loft([[s * 0.1, 0.95, 0], [s * 0.11, 0.5, 0.01], [s * 0.115, 0.1, 0.0]], [0.08, 0.065, 0.055], 6, 0, false);
  tone(P, BOOT, 1, 0.05, 0.7);
  for (const s of [-1, 1]) P.blob(s * 0.115, 0.05, 0.05, 0.055, 0.055, 0.14, 6, 4);
  const SKIRT = [[0, 0.32, 0.25, 0.21, 0, -0.01], [0.5, 0.65, 0.21, 0.16, 0, 0], [1, 0.97, 0.19, 0.13, 0, 0]];
  clothBody(P, nu, low ? 4 : 6, (v) => tab(SKIRT, v), { folds: 6, amp: (v) => 0.04 * (1 - v), colour: (v, r) => mix3(mix3(BLACK_D, BLACK, 0.3 + 0.7 * r), HEM, 1 - smoothstep(0, 0.12, v)), seed: 0.5, capTop: false, capBottom: false });
  // ---- 1: the torso from the hips
  P.bone(1);
  const TORSO = [[0, 0.93, 0.19, 0.13, 0, 0], [0.5, 1.2, 0.2, 0.135, 0, 0.01], [0.85, 1.42, 0.225, 0.13, 0, 0.0], [1, 1.52, 0.065, 0.065, 0, 0.02]];
  clothBody(P, nu, low ? 5 : 7, (v) => tab(TORSO, v), { folds: 4, amp: () => 0.02, colour: (v, r) => mix3(BLACK_D, BLACK, 0.4 + 0.6 * r), seed: 1.1, capBottom: false });
  if (!LIVERY.on) { tone(P, BLACK, 0.9); P.ring(0, 1.5, 0.02, 0.075, 0.028, low ? 8 : 12, 4); }
  else {
    // v8-06 the livery: the Heliarch collar; the stole wound twice round his waist as a belt and tucked in, out of
    // the dirt, a loop of it hanging at his hip; the sign is the buckle. His spade's head is the Taker's staff head.
    collar(P, 0, 1.47, 0.02, 0.072, 0.14, LIVERY.coat, { sides: low ? 10 : 12, gap: 0.5 });
    const belt = [];
    for (let k = 0; k <= 16; k++) { const a = Math.PI / 2 + (k / 16) * Math.PI * 2; belt.push([Math.cos(a) * 0.205, 0.97 + 0.012 * Math.sin(a * 2), Math.sin(a) * 0.145]); }
    stole(P, belt, { w: 0.12, out: (t, p) => [p[0], 0, p[2]], fray: 0, dirt: 0.1, seed: 4 });
    stole(P, [[0.19, 0.99, 0.06], [0.235, 0.86, 0.06], [0.24, 0.74, 0.02], [0.23, 0.8, -0.04], [0.2, 0.95, -0.07]], { w: 0.085, out: [1, 0, 0.1], fray: 0, dirt: 0.2, seed: 6 });
    badge(P, [0, 1.005, 0.165], [0, 1, 0], [0, 0, 1], 0.07, { th: 0.01 });
  }
  // ---- 2: the head
  P.bone(2); head(P, 0, HEAD_Y, 0.03, 0.1, { skin: SKIN, hair: HAIR, sides: low ? 8 : 10 });
  // ---- 3-6: the arms
  for (const [b, f] of [[3, false], [4, true], [5, false], [6, true]]) { P.bone(b); f ? sleeve(P, A_FORE, 0.06, 0.06, BLACK, { hand: SKIN }) : sleeve(P, A_UP, 0.065, 0.06, BLACK); }
  // ---- 7: the spade, from its grip down -y: a T-handle, the shaft, the iron blade
  P.bone(7);
  tone(P, WOOD, 1, 0, 0.75);
  P.loft([[-0.07, 0, 0], [0.07, 0, 0]], [0.016, 0.016], 5, 0, true);
  if (LIVERY.on) { staffHead(P, 0, 0.01, 0); tone(P, WOOD, 1, 0, 0.75); }
  P.loft([[0, 0, 0], [0, -SPADE, 0]], [0.018, 0.02], 6, 0, false);
  tone(P, IRON, 1, 0.55, 0.55);
  P.loft([[0, -SPADE + 0.04, 0], [0, -SPADE - 0.03, 0]], [0.026, 0.024], 6, 0, false); // the socket
  P.sheet(3, 3, (u, v, o) => { const w = 0.095 * (1 - 0.15 * v * v); o[0] = (u - 0.5) * 2 * w; o[1] = -SPADE - 0.02 - v * BLADE; o[2] = 0.015 * (1 - (2 * u - 1) ** 2); });
  return tag(P.geometry(), P, 'heliarch');
}

// the clods: a few dark points per throw, flown on the GPU from the blade to the heap (no uploads)
function buildClods(ctx) {
  const THROWS = 3, PER = 6, n = THROWS * PER, rng = ctx.makeRng(70311);
  const seed = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { seed[i * 4] = (rng() - 0.5) * 1.5; seed[i * 4 + 1] = rng() * 0.15; seed[i * 4 + 2] = (rng() - 0.5) * 0.5; seed[i * 4 + 3] = Math.floor(i / PER); }
  const g = new THREE.BufferGeometry();
  const slotP = new Float32Array(n * 3); for (let i = 0; i < n; i++) slotP[i * 3] = i % PER; // x: the clod's place in its throw
  g.setAttribute('position', new THREE.Float32BufferAttribute(slotP, 3));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 4));
  const U = { uFrom: { value: Array.from({ length: THROWS }, () => new THREE.Vector3()) }, uTo: { value: Array.from({ length: THROWS }, () => new THREE.Vector3()) }, uAge: { value: new Float32Array(THROWS).fill(1e3) }, uScale: { value: 500 }, uCount: { value: new Float32Array(THROWS).fill(PER) } };
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]),
    vertexShader: `
      uniform vec3 uFrom[${THROWS}]; uniform vec3 uTo[${THROWS}]; uniform float uAge[${THROWS}]; uniform float uCount[${THROWS}]; uniform float uScale;
      attribute vec4 aSeed; varying float vShade;
      #include <fog_pars_vertex>
      void main() {
        int k = int(aSeed.w + 0.5);
        float age = uAge[k], f = clamp(age / 0.55, 0.0, 1.0), slot = position.x;
        vec3 to = uTo[k] + aSeed.xyz;
        vec3 p = mix(uFrom[k] + aSeed.xyz * 0.12, to, f);
        p.y += 1.6 * f * (1.0 - f);
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        float vis = step(0.0, age) * (1.0 - smoothstep(0.9, 1.6, age)) * step(slot, uCount[k] - 0.5);
        gl_PointSize = vis * uScale * (0.05 + 0.04 * fract(aSeed.x * 91.7)) / max(0.1, -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
        vec3 transformed = p; // (the height fog reads it)
        vShade = 0.7 + 0.6 * fract(aSeed.z * 53.1);
        #include <fog_vertex>
      }`,
    fragmentShader: `
      varying float vShade;
      #include <fog_pars_fragment>
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        if (dot(c, c) > 0.25) discard;
        gl_FragColor = vec4(vec3(0.045, 0.032, 0.02) * vShade * (1.2 - 1.4 * length(c)), 1.0);
        #include <fog_fragment>
      }`,
    fog: true,
  });
  Object.assign(mat.uniforms, U);
  const pts = new THREE.Points(g, mat);
  pts.name = 'living-workers-clods'; pts.frustumCulled = false; pts.visible = false;
  ctx.scene.add(pts);
  let next = 0;
  return {
    pts, U,
    throw(from, to, count) { const k = next; next = (next + 1) % THROWS; U.uFrom.value[k].copy(from); U.uTo.value[k].copy(to); U.uAge.value[k] = 0; U.uCount.value[k] = count; pts.visible = true; },
    update(dt, H) {
      U.uScale.value = H / (2 * Math.tan((34 * Math.PI) / 180));
      let any = false; for (let k = 0; k < THROWS; k++) { U.uAge.value[k] += dt; if (U.uAge.value[k] < 1.6) any = true; }
      pts.visible = any;
    },
  };
}

export function buildSexton(ctx, order) {
  const low = ctx.quality === 'low';
  const G = buildGround(ctx, order);
  const geo = build(low), bones = makeBones();
  const mesh = rigMesh(geo, bones, 'living-workers-sexton');
  ctx.scene.add(mesh);
  const clods = buildClods(ctx);
  const T = ctx.terrain, cam = ctx.player.pos, cue = ctx.audio, flick = ctx.sky?.flicker || { value: 1 };
  const rng = ctx.makeRng(70321);
  const OPEN = Math.min(GRAVE.open, order.length - 1);
  const uD = G.uD;
  for (let k = 0; k < OPEN; k++) uD[order[k].n] = GRAVE.depth;
  // colliders: two circles along each open grave and two on its heap (the walker cannot fall in: the analytic ground
  // still says turf there)
  let colliders = 0;
  const collide = (s) => {
    for (const dx of [-0.5, 0.5]) { ctx.addCollider({ x: s.x + dx, z: s.z, r: 0.55 }); ctx.addCollider({ x: s.x + dx, z: heapZ(s), r: 0.45 }); colliders += 2; }
    s.collided = true;
  };
  for (let k = 0; k <= OPEN; k++) collide(order[k]);
  const S = {
    cur: OPEN, depth: GRAVE.depth * (0.3 + 0.2 * rng()), rate: 0, gutters: 0, armed: false,
    phase: 'dig', t: 0, u: rng() * DIG, x: 0, z: 0, yaw: 0, from: null, armedNear: true, measures: 0,
    pitch: 0, hyaw: 0, measurePitch: [0, 0], walk: null, bites: 0, throws: 0,
  };
  const standOf = (s) => ({ x: s.x + s.dir * STAND, z: s.z, yaw: Math.atan2(-s.dir, 0) }); // at the end he is heading for, facing back along the grave
  { const p = standOf(order[S.cur]); S.x = p.x; S.z = p.z; S.yaw = p.yaw; }
  const col = { x: S.x, z: S.z, r: 0.35 }; ctx.addCollider(col);
  // the time to the next gutter's end: the sky's own count to the next onset, plus a gutter's mean length
  const untilNext = () => (flick.next != null && isFinite(flick.next) && flick.next < 1e6 ? flick.next : 85) + ((flick.timing?.len?.[0] ?? 12) + (flick.timing?.len?.[1] ?? 16)) / 2;
  S.rate = (GRAVE.depth - S.depth) / untilNext();
  uD[order[S.cur].n] = S.depth;

  const place = new THREE.Matrix4(), torsoL = new THREE.Matrix4(), I4 = new THREE.Matrix4();
  const grip = new THREE.Vector3(), dir = new THREE.Vector3(), hand = new THREE.Vector3(), sh = new THREE.Vector3(), blade = new THREE.Vector3(), tmp = new THREE.Vector3(), heap = new THREE.Vector3();
  const POLE_R = new THREE.Vector3(-1, -0.4, -0.5), POLE_L = new THREE.Vector3(1, -0.4, -0.5);
  let lean = 0.15, twist = 0;
  const keyAt = (u, hs) => { // the dig's pose at u (0..1)
    let k = 0; while (k < KEYS.length - 2 && KEYS[k + 1][0] <= u) k++;
    const a = KEYS[k], b = KEYS[k + 1], f = ease((u - a[0]) / (b[0] - a[0]));
    grip.set(lerp(a[1][0], b[1][0], f) * hs, lerp(a[1][1], b[1][1], f), lerp(a[1][2], b[1][2], f));
    dir.set(lerp(a[2][0], b[2][0], f) * hs, lerp(a[2][1], b[2][1], f), lerp(a[2][2], b[2][2], f)).normalize();
    lean = lerp(a[3], b[3], f); twist = lerp(a[4], b[4], f) * hs;
  };
  const leanTo = (w) => { // blend the current dig pose toward leaning on the planted spade
    const L = LEANPOSE;
    grip.lerp(tmp.set(L[0][0], L[0][1], L[0][2]), w); dir.lerp(tmp.set(L[1][0], L[1][1], L[1][2]), w).normalize();
    lean = lerp(lean, L[2], w); twist = lerp(twist, L[3], w);
  };
  function pose(bob = 0) {
    const s = order[S.cur], hs = -s.dir; // the heap (north) is on his local +x when he faces west, -x facing east
    const gy = T.heightAt(S.x, S.z);
    placeMatrix(place, S.x, gy + bob, S.z, S.yaw);
    keyAt(S.phase === 'dig' ? S.u / DIG : 0, hs);
    let w = 0;
    if (S.phase === 'lean') w = ease(S.t / LEAN_T); else if (S.phase === 'look' || S.phase === 'hold') w = 1; else if (S.phase === 'back') w = 1 - ease(S.t / BACK_T);
    if (w > 0) leanTo(w);
    if (S.phase === 'walk') { grip.set(-0.18, 1.0, 0.12); dir.set(0.05, -0.97, 0.18).normalize(); lean = 0.08; twist = 0; }
    bones[0].copy(place);
    pivot(torsoL, I4, HIP[0], HIP[1], HIP[2], lean, twist, 0);
    bones[1].multiplyMatrices(place, torsoL);
    pivot(bones[2], bones[1], NECK[0], NECK[1], NECK[2], S.pitch - lean, S.hyaw - twist, 0);
    limb(bones[7], place, grip, dir);
    // the right hand at the grip, the left down the shaft (both on the grip while he leans)
    arm2(bones[3], bones[4], place, sh.copy(SH_R).applyMatrix4(torsoL), hand.copy(grip).addScaledVector(dir, 0.0).add(tmp.set(-0.03 * (1 - w), 0, 0)), A_UP, A_FORE, POLE_R);
    arm2(bones[5], bones[6], place, sh.copy(SH_L).applyMatrix4(torsoL), hand.copy(grip).addScaledVector(dir, GRIP * (1 - w)).add(tmp.set(0.07 * w, 0, 0)), A_UP, A_FORE, POLE_L);
    mesh.userData.posed();
  }
  // the walker in his frame: horizontal distance and his head's pitch to their feet and eyes (+ down)
  const look = (out) => {
    const dx = cam.x - S.x, dz = cam.z - S.z, d = Math.max(0.5, hyp(dx, dz)), gy = T.heightAt(S.x, S.z) + HEAD_Y;
    const feet = T.heightAt(cam.x, cam.z);
    out[0] = Math.atan2(gy - feet, d); out[1] = Math.atan2(gy - cam.y, d); out[2] = angDiff(Math.atan2(dx, dz), S.yaw);
    return out;
  };
  const L3 = [0, 0, 0];
  const advance = () => { // the grave is finished: on to the next slot
    const s = order[S.cur];
    uD[s.n] = GRAVE.depth;
    if (S.cur >= order.length - 1) { S.depth = GRAVE.depth; return false; } // the last: he goes on digging it
    S.cur++;
    const n = order[S.cur], to = standOf(n);
    S.depth = 0; uD[n.n] = 0; S.rate = GRAVE.depth / untilNext();
    if (!n.collided) collide(n);
    // walk there; past a blocked slot (a boulder) he goes round on the south side of the row
    const pts = [[S.x, S.z]];
    if (Math.abs(to.x - S.x) > 4.5 && to.z === S.z) pts.push([S.x + Math.sign(to.x - S.x) * 0.6, S.z + 1.3], [to.x - Math.sign(to.x - S.x) * 0.6, to.z + 1.3]);
    pts.push([to.x, to.z]);
    let len = 0; for (let i = 1; i < pts.length; i++) len += hyp(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    S.walk = { pts, len, s: 0, yaw: to.yaw };
    S.phase = 'walk'; S.t = 0;
    return true;
  };
  function update(dt) {
    S.t += dt;
    const near = hyp(cam.x - S.x, cam.z - S.z);
    if (near > REARM) S.armedNear = true;
    if (S.armedNear && near < NEAR && (S.phase === 'dig' || S.phase === 'walk')) { S.armedNear = false; S.phase = 'lean'; S.t = 0; S.measures++; look(L3); S.measurePitch[0] = L3[0]; S.measurePitch[1] = L3[1]; }
    let bob = 0, wantP = 0.25, wantY = 0;
    if (S.phase === 'dig') {
      const u0 = S.u; S.u += dt;
      if (u0 < 0.22 * DIG && S.u >= 0.22 * DIG) { S.bites++; cue?.cue?.('sexton-bite', blade.set(S.x + Math.sin(S.yaw) * 0.9, T.heightAt(S.x, S.z), S.z + Math.cos(S.yaw) * 0.9)); }
      if (u0 < 0.75 * DIG && S.u >= 0.75 * DIG) {
        S.throws++;
        const s = order[S.cur];
        blade.copy(grip).addScaledVector(dir, SPADE + BLADE * 0.6).applyMatrix4(place);
        heap.set(s.x, T.heightAt(s.x, heapZ(s)) + 0.25, heapZ(s));
        clods.throw(blade, heap, 4 + Math.floor(rng() * 3));
        cue?.cue?.('sexton-throw', heap);
      }
      if (S.u >= DIG) S.u -= DIG;
      wantP = 0.55;
    } else if (S.phase === 'walk') {
      const W = S.walk; W.s = Math.min(W.len, W.s + WALK * dt);
      let s = W.s, i = 1;
      for (; i < W.pts.length; i++) { const l = hyp(W.pts[i][0] - W.pts[i - 1][0], W.pts[i][1] - W.pts[i - 1][1]); if (s <= l || i === W.pts.length - 1) { const f = l > 0 ? Math.min(1, s / l) : 1; S.x = lerp(W.pts[i - 1][0], W.pts[i][0], f); S.z = lerp(W.pts[i - 1][1], W.pts[i][1], f); break; } s -= l; }
      const a = W.pts[i - 1], b = W.pts[Math.min(i, W.pts.length - 1)];
      const head = W.s >= W.len - 0.3 ? W.yaw : Math.atan2(b[0] - a[0], b[1] - a[1]);
      S.yaw += clamp(angDiff(head, S.yaw), -2.5 * dt, 2.5 * dt);
      bob = 0.02 * Math.abs(Math.sin(W.s * Math.PI / 0.75));
      if (W.s >= W.len && Math.abs(angDiff(W.yaw, S.yaw)) < 0.02) { S.yaw = W.yaw; S.phase = 'dig'; S.u = 0; S.t = 0; }
    } else {
      // the measure: lean (1.2 s), the look from the feet up to the eyes (2.0 s), hold (1.0 s), back (1.0 s)
      look(L3);
      wantY = clamp(L3[2], -1.3, 1.3);
      if (S.phase === 'lean') { wantP = L3[0]; if (S.t >= LEAN_T) { S.phase = 'look'; S.t = 0; } }
      else if (S.phase === 'look') { wantP = lerp(L3[0], L3[1], ease(S.t / LOOK_T)); if (S.t >= LOOK_T) { S.phase = 'hold'; S.t = 0; } }
      else if (S.phase === 'hold') { wantP = L3[1]; if (S.t >= HOLD_T) { S.phase = 'back'; S.t = 0; } }
      else if (S.phase === 'back') { wantP = 0.55; wantY = 0; if (S.t >= BACK_T) { S.phase = S.walk && S.walk.s < S.walk.len ? 'walk' : 'dig'; S.t = 0; } }
      S.measurePitch[0] = L3[0]; S.measurePitch[1] = L3[1];
    }
    // the look follows exactly while he measures; otherwise the head goes back to the work at its own pace
    if (S.phase === 'look' || S.phase === 'hold') { S.pitch = wantP; S.hyaw = ramp(S.hyaw, wantY, 2.5, dt); }
    else { S.pitch = ramp(S.pitch, wantP, 1.2, dt); S.hyaw = ramp(S.hyaw, wantY, 1.5, dt); }
    col.x = S.x; col.z = S.z;
    clods.update(dt, ctx.renderer.domElement.height);
    pose(bob);
  }
  // the gutters, counted wherever you are: the grave deepens to the next one's end, then he moves on
  function watch(dt) {
    if (S.cur < order.length) { S.depth = Math.min(GRAVE.depth, S.depth + S.rate * dt); uD[order[S.cur].n] = S.depth; }
    const f = flick.value;
    if (f < 0.5) S.armed = true;
    else if (S.armed && f > 0.85) { S.armed = false; S.gutters++; advance(); }
  }
  pose();
  ctx.registerUpdate(update, { at: () => S, near: 80, hz: 4 });
  ctx.registerUpdate(watch, { pos: { x: 55, z: 274 }, near: 0, hz: 1 });
  const openCount = () => { let n = 0; for (const s of order) if (uD[s.n] >= GRAVE.depth - 1e-6) n++; return n; };
  return {
    mesh, clods: clods.pts, ground: G, state: S, order,
    current: () => order[S.cur], openCount, colliders: () => colliders,
    stats: () => { const g = G.stats(); return { calls: 1 + g.calls + (clods.pts.visible ? 1 : 0), tris: Math.round(tris(geo) + g.tris), figure: Math.round(tris(geo)), turf: g.turf, pits: g.pits, terrainCut: g.terrainCut }; },
    // test and render hooks: a gutter's end now; the measure at its phase (0..1 through the lean, look, hold, back)
    gutter() { S.gutters++; S.armed = false; const moved = advance(); return moved; },
    measure(f = 0.5) {
      const tot = LEAN_T + LOOK_T + HOLD_T + BACK_T; let t = f * tot;
      S.armedNear = false; S.measures++;
      for (const [ph, d] of [['lean', LEAN_T], ['look', LOOK_T], ['hold', HOLD_T], ['back', BACK_T]]) { if (t <= d) { S.phase = ph; S.t = t; break; } t -= d; }
      update(0);
    },
  };
}
