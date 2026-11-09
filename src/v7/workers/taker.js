// BY the Taker of Altitudes (v7, living-workers): "An old man in a faded orange robe on a red pavement of the Adust,
// sighting the sun along a staff set with a brass quadrant, then writing a figure in a book on his knee. The sun does
// not move, so he writes the same figure each time, and the book is thick with it. He ignores you; stand between
// him and the sun and he lowers the staff and waits, without impatience, until you move."
// He sits on the Adust's pavement slab nearest SITES.taker (within its r 4), facing the sun's azimuth. The cycle
// (18 s): raise the staff and bring the quadrant to the eye (2 s), sight along it at the sun, 13.5 deg up (6 s,
// `taker-click` at the end), lower it to rest against the shoulder (2 s), write (8 s, `taker-murmur` at the start:
// the pen makes the same small strokes at one place on the page every time). Between him and the sun (the
// walker's bearing from his eye within 3 deg of the sun's azimuth, 1.5-60 m off; the causeway crosses that line
// about 23 m out): he lowers the staff over 2 s, rests both hands on the book, head level, and waits; 3 s after
// the walker leaves the line he starts again from the raise. He never looks at you otherwise. One mesh.
import * as THREE from 'three';
import { SITES, SUN } from '../../world.js';
import { hyp, smoothstep } from '../../noise.js';
import { angDiff } from '../../fauna/uncanny/kit.js';
import { rigPainter, rigMesh, makeBones, pivot, limb, arm2, placeMatrix, ramp, ease, tris, UP } from './rig.js';
import { rgb, tone, mix3, clothBody, head, sleeve } from './body.js';

const ROBE = rgb('#a2713f'), ROBE_D = rgb('#4e3018'), HEM = rgb('#857560'), SKIN = rgb('#8e6c56'), GREY = rgb('#8a857d');
const WOOD = rgb('#3a2a1c'), BRASS = rgb('#8a6a30'), BRASS_D = rgb('#5e4622'), BINDING = rgb('#2a1b13'), PAGES = rgb('#b9a884'), INK = rgb('#15110e');
const A_UP = 0.27, A_FORE = 0.27, PEN = 0.1;          // upper arm, forearm to the hand, the pen beyond it
const APEX = 0.55, Q_R = 0.35, STAFF = 2.2;          // the quadrant's apex on the staff, its radius; the staff
const EL = SUN.elevation;
const SUN_YAW = Math.atan2(SUN.dir.x, SUN.dir.z);     // local +z toward the sun's azimuth
const SH_R = new THREE.Vector3(-0.2, 0.6, 0.04), SH_L = new THREE.Vector3(0.2, 0.6, 0.04); // he faces +z: his right is -x
const NECK = [0, 0.7, 0.06], EYE = new THREE.Vector3(0, 0.82, 0.17);
// the book on his right knee: a little turned in, its far edge tipped up toward him
const BOOK = new THREE.Matrix4().makeTranslation(-0.15, 0.22, 0.27).multiply(new THREE.Matrix4().makeRotationY(0.22)).multiply(new THREE.Matrix4().makeRotationX(-0.38));
const bookPt = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(BOOK);
const PAGE_R = bookPt(0.085, 0.058, 0.03), PAGE_L = bookPt(-0.09, 0.07, 0.0);
const PAGE_U = new THREE.Vector3(1, 0, 0).transformDirection(BOOK), PAGE_V = new THREE.Vector3(0, 0, -1).transformDirection(BOOK), PAGE_N = new THREE.Vector3(0, 1, 0).transformDirection(BOOK);
// the staff at rest: its butt on the slab by his left hip, leaning on the left shoulder; sighting: the quadrant's
// apex beside the eye and the staff along the sun's line
const BUTT_REST = new THREE.Vector3(0.4, 0, 0.12), DIR_REST = new THREE.Vector3(-0.13, 0.62, -0.12).normalize();
const DIR_SIGHT = new THREE.Vector3(0, Math.sin(EL), Math.cos(EL)), APEX_SIGHT = new THREE.Vector3(0.035, EYE.y, EYE.z);
const BUTT_SIGHT = APEX_SIGHT.clone().addScaledVector(DIR_SIGHT, -APEX);
const HOLD_REST = 0.4, HOLD_SIGHT = APEX + 0.28;     // where the left hand holds the staff, from the butt
// the figure he writes: the same few strokes every time, in page millimetres (x across, y up the page), pen up between
const STROKES = [[[0, 0], [0, -11]], [[5, 0], [11, 0], [10, -5], [5, -5], [6, -11], [11, -11]], [[15, 0], [21, 0], [17, -11]], [[24, -6], [29, -6]]];
const PATH = (() => { // [x, y, lift] at even speed, a lift (5 mm up) between strokes
  const pts = [];
  STROKES.forEach((s, i) => {
    if (i) pts.push([s[0][0], s[0][1], 1]);
    for (const p of s) pts.push([p[0], p[1], 0]);
    if (i < STROKES.length - 1) pts.push([s[s.length - 1][0], s[s.length - 1][1], 1]);
  });
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) + 4 * Math.abs(pts[i][2] - pts[i - 1][2]));
  return { pts, len, total: len[len.length - 1] };
})();
const CYCLE = { raise: 2, sight: 6, lower: 2, write: 8 };

function build(low) {
  const P = rigPainter(), nu = low ? 16 : 26;
  // ---- 0: the seated body: the robe pooled round crossed legs, the stooped torso, the cowl, the book
  P.bone(0);
  const wear = (v, ridge) => mix3(mix3(ROBE_D, ROBE, 0.35 + 0.65 * ridge), HEM, 1 - smoothstep(0.0, 0.12, v));
  const LAP = [[0, 0.005, 0.5, 0.45, 0, 0.13], [0.3, 0.13, 0.5, 0.43, 0, 0.13], [0.62, 0.2, 0.36, 0.3, 0, 0.07], [1, 0.27, 0.2, 0.14, 0, 0.0]];
  const TORSO = [[0, 0.25, 0.19, 0.13, 0, 0.0], [0.5, 0.45, 0.2, 0.14, 0, 0.03], [0.85, 0.6, 0.215, 0.125, 0, 0.055], [1, 0.7, 0.07, 0.065, 0, 0.07]];
  const tab = (T, v) => { for (let k = 0; k < T.length - 1; k++) if (v <= T[k + 1][0]) { const t = smoothstep(T[k][0], T[k + 1][0], v); return T[k].slice(1).map((a, i) => a + (T[k + 1][i + 1] - a) * t); } return T[T.length - 1].slice(1); };
  clothBody(P, nu, low ? 6 : 9, (v) => tab(LAP, v), { folds: 9, amp: (v) => 0.05 * (1 - v * 0.6), colour: wear, seed: 1.3, capTop: false });
  clothBody(P, nu, low ? 6 : 9, (v) => tab(TORSO, v), { folds: 6, amp: (v) => 0.03 * (1 - v), colour: (v, r) => mix3(ROBE_D, ROBE, 0.45 + 0.55 * r), seed: 0.4, capBottom: false });
  tone(P, ROBE, 0.8); P.ring(0, 0.675, 0.065, 0.085, 0.03, low ? 10 : 14, 4);
  P.xf(BOOK);
  tone(P, BINDING, 1, 0, 0.8); P.box(0, -0.006, 0, 0.36, 0.012, 0.25);
  tone(P, PAGES, 1, 0, 0.95); P.box(-0.088, 0.03, 0, 0.165, 0.058, 0.236); P.box(0.088, 0.03, 0, 0.165, 0.058, 0.236);
  tone(P, PAGES, 0.82, 0, 0.95); P.box(0, 0.03, 0, 0.012, 0.05, 0.236); // the gutter
  P.xf(null);
  // ---- 1: the head, an old man's, grey
  P.bone(1);
  head(P, 0, 0.8, 0.09, 0.098, { skin: SKIN, hair: GREY, beard: GREY, sides: low ? 8 : 10 });
  // ---- 2-5: the arms in their sleeves; the pen in the right hand
  P.bone(2); sleeve(P, A_UP, 0.06, 0.066, mix3(ROBE_D, ROBE, 0.7));
  P.bone(3); sleeve(P, A_FORE, 0.066, 0.088, mix3(ROBE_D, ROBE, 0.7), { hand: SKIN });
  tone(P, INK, 1, 0.1, 0.6); P.loft([[0, -A_FORE + 0.03, 0.006], [0, -A_FORE - PEN, 0]], [0.0045, 0.002], 4, 0, false);
  P.bone(4); sleeve(P, A_UP, 0.06, 0.066, mix3(ROBE_D, ROBE, 0.7));
  P.bone(5); sleeve(P, A_FORE, 0.066, 0.088, mix3(ROBE_D, ROBE, 0.7), { hand: SKIN });
  // ---- 6: the staff, built from its butt up +y, with the quadrant's quarter-circle frame at the apex toward +z
  P.bone(6);
  tone(P, WOOD, 1, 0, 0.7); P.loft([[0, 0, 0], [0, STAFF * 0.5, 0], [0, STAFF, 0]], [0.017, 0.015, 0.012], 6, 0, true);
  tone(P, BRASS, 1, 0.75, 0.45);
  P.lathe(0, STAFF - 0.04, 0, [[0.0, 0], [0.016, 0.0], [0.017, 0.04], [0.0, 0.05]], 6); // the ferrule
  const arc = [];
  for (let k = 0; k <= (low ? 6 : 10); k++) { const f = (k / (low ? 6 : 10)) * Math.PI / 2; arc.push([0, APEX + Q_R * Math.cos(f), Q_R * Math.sin(f)]); }
  P.loft(arc, arc.map(() => 0.0065), 4, 0, true);
  P.loft([[0, APEX, 0], [0, APEX, Q_R]], [0.0055, 0.0055], 4, 0, true);
  P.loft([[0, APEX, 0.005], [0, APEX + Q_R * 0.72, Q_R * 0.72]], [0.004, 0.004], 4, 0, true); // a brace
  tone(P, BRASS_D, 1, 0.6, 0.5);
  P.box(0, APEX + 0.04, 0.02, 0.028, 0.006, 0.03); P.box(0, APEX + Q_R + 0.02, 0.02, 0.028, 0.006, 0.03); // the two sight vanes
  // ---- 7: the plumb line and its bob, hanging from the apex whatever the staff does
  P.bone(7);
  tone(P, rgb('#6a5a40'), 1, 0, 0.9); P.loft([[0, 0, 0], [0, -0.3, 0]], [0.0018, 0.0018], 3, 0, false);
  tone(P, BRASS_D, 1, 0.6, 0.5); P.blob(0, -0.31, 0, 0.012, 0.012, 0.016, 6, 4);
  return P.geometry();
}

export function buildTaker(ctx, seat) {
  const low = ctx.quality === 'low';
  const geo = build(low), bones = makeBones();
  const mesh = rigMesh(geo, bones, 'living-workers-taker');
  ctx.scene.add(mesh);
  const place = placeMatrix(new THREE.Matrix4(), seat.x, seat.y, seat.z, SUN_YAW);
  const eyeW = EYE.clone().applyMatrix4(place);
  const sunH = Math.atan2(SUN.dir.x, SUN.dir.z);
  ctx.addCollider({ x: seat.x + Math.sin(SUN_YAW) * 0.1, z: seat.z + Math.cos(SUN_YAW) * 0.1, r: 0.6 });
  const cam = ctx.player.pos, cue = ctx.audio, cuePos = { x: eyeW.x, y: eyeW.y, z: eyeW.z };
  const S = { phase: 'write', t: 0, staff: 0, hands: 0, pitch: 0.5, yaw: -0.12, between: false, clear: 0, waits: 0, sights: 0, writes: 0 };
  const butt = new THREE.Vector3(), dir = new THREE.Vector3(), hand = new THREE.Vector3(), tip = new THREE.Vector3(), apex = new THREE.Vector3();
  const POLE_L = new THREE.Vector3(0.45, -1, -0.35), POLE_R = new THREE.Vector3(-0.45, -1, -0.35), M = new THREE.Matrix4();
  const strokeAt = (s, out) => { // the pen's tip at path length s (page mm), on the right page
    const L = PATH.len; let i = 1; while (i < L.length - 1 && L[i] < s) i++;
    const a = PATH.pts[i - 1], b = PATH.pts[i], f = L[i] > L[i - 1] ? Math.min(1, Math.max(0, (s - L[i - 1]) / (L[i] - L[i - 1]))) : 1;
    const x = (a[0] + (b[0] - a[0]) * f) * 0.0015 - 0.02, y = (a[1] + (b[1] - a[1]) * f) * 0.0015 + 0.01, lift = (a[2] + (b[2] - a[2]) * f) * 0.005;
    return out.copy(PAGE_R).addScaledVector(PAGE_U, x).addScaledVector(PAGE_V, y).addScaledVector(PAGE_N, lift + 0.001);
  };
  function pose() {
    const s = ease(S.staff), w = ease(S.hands);
    butt.lerpVectors(BUTT_REST, BUTT_SIGHT, s); dir.lerpVectors(DIR_REST, DIR_SIGHT, s).normalize();
    limb(bones[6], place, butt, dir, UP);
    apex.copy(butt).addScaledVector(dir, APEX);
    M.makeTranslation(apex.x, apex.y, apex.z); bones[7].multiplyMatrices(place, M);
    bones[0].copy(place);
    pivot(bones[1], place, NECK[0], NECK[1], NECK[2], S.pitch, S.yaw, 0);
    // the left hand on the staff, or on the book's left page while he waits
    hand.copy(butt).addScaledVector(dir, HOLD_REST + (HOLD_SIGHT - HOLD_REST) * s).lerp(PAGE_L, w);
    arm2(bones[4], bones[5], place, SH_L, hand, A_UP, A_FORE, POLE_L);
    // the right hand writing, or resting the pen at the figure's start
    if (S.phase === 'write') strokeAt((S.t / CYCLE.write) * PATH.total, tip); else strokeAt(0, tip).addScaledVector(PAGE_N, 0.012);
    arm2(bones[2], bones[3], place, SH_R, tip, A_UP, A_FORE + PEN, POLE_R);
    mesh.userData.posed();
  }
  function update(dt) {
    // between him and the sun: the walker's bearing from his eye within 3 deg of the sun's, 1.5-60 m off
    const dx = cam.x - eyeW.x, dz = cam.z - eyeW.z, d = hyp(dx, dz);
    const on = d > 1.5 && d < 60 && Math.abs(angDiff(Math.atan2(dx, dz), sunH)) < (3 * Math.PI) / 180;
    if (on) S.clear = 0; else S.clear += dt;
    if (on && S.phase !== 'wait') { S.phase = 'wait'; S.t = 0; S.waits++; }
    S.between = on;
    S.t += dt;
    switch (S.phase) {
      case 'wait':
        S.staff = ramp(S.staff, 0, 0.5, dt); S.hands = ramp(S.hands, 1, 0.5, dt);
        if (S.clear >= 3) { S.phase = 'raise'; S.t = 0; }
        break;
      case 'raise':
        S.staff = ramp(S.staff, 1, 0.5, dt); S.hands = ramp(S.hands, 0, 0.5, dt);
        if (S.staff >= 1 && S.hands <= 0) { S.phase = 'sight'; S.t = 0; S.sights++; }
        break;
      case 'sight':
        if (S.t >= CYCLE.sight) { S.phase = 'lower'; S.t = 0; cue?.cue?.('taker-click', cuePos); }
        break;
      case 'lower':
        S.staff = ramp(S.staff, 0, 0.5, dt);
        if (S.staff <= 0) { S.phase = 'write'; S.t = 0; S.writes++; cue?.cue?.('taker-murmur', cuePos); }
        break;
      case 'write':
        if (S.t >= CYCLE.write) { S.phase = 'raise'; S.t = 0; }
        break;
    }
    // the head: down to the page while he writes, up the staff's line while he sights, level while he waits
    const sightP = -EL, writeP = 0.52;
    const wantP = S.phase === 'wait' ? 0 : writeP + (sightP - writeP) * ease(S.staff);
    const wantY = S.phase === 'wait' ? 0 : -0.12 * (1 - ease(S.staff));
    S.pitch = ramp(S.pitch, wantP, 0.45, dt); S.yaw = ramp(S.yaw, wantY, 0.3, dt);
    pose();
  }
  pose();
  ctx.registerUpdate(update, { at: () => seat, near: 80, hz: 4 });
  return {
    mesh, state: S, seat, eye: eyeW, yaw: SUN_YAW, sunYaw: sunH, cycle: CYCLE,
    stats: () => ({ calls: 1, tris: Math.round(tris(geo)) }),
    // render hook: sighting now (the cycle goes on from there)
    sight() { S.phase = 'sight'; S.t = 0; S.staff = 1; S.hands = 0; S.pitch = -EL; S.yaw = 0; pose(); },
    // the point on his line to the sun, d metres out (for tests and renders)
    onLine: (d) => ({ x: eyeW.x + Math.sin(sunH) * d, z: eyeW.z + Math.cos(sunH) * d }),
  };
}
