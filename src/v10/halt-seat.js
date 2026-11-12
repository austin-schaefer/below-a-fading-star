// The Lantern Halt's seat, and the ride (v10-A4): the tally's second half. Chalking is how a traveller claims the bed
// in the lantern, so when a visitor has chalked their stroke (src/v10/tally.js) the Halt takes them for its guest:
// the winch at the foot turns by itself, its pawl clacking, and the slung seat comes down its rope from the hatch to
// sitting height beside the wall, and sways there. A second act is offered at it ("Take the seat"); the visitor is
// hauled up the face of the slab, ten metres, the tallies passing, the moor opening out behind, and hangs level with
// the hatch, the sleeper an arm's length off. He turns his face to them under his nightcap, murmurs, and lifts a hand
// in his sleep and waves it, slowly, twice. After some seconds, or as soon as the visitor tries to walk, the seat lets
// them down again, exactly where they got on, and is hauled back up empty. Remembered: once a visitor has ridden,
// a second pillow lies on the sill beside his (he has made room), from their next visit on.
//
// The player is carried with ctx.controls.carry (src/controls.js): the look stays free, nothing else moves them, a
// teleport ends the ride (the seat goes back up empty), and the paused card or the settings panel hold the ride where
// it is. Built by src/v9/waystation.js with its frame: buildSeat(ctx, { M0, group, mat (the furniture's stone
// material), late, ropeC, iron, gilt, paint, seat (its top, local), pul (the rope's point under the pulley, local),
// HA, ground(x, z) (local), crank (the winch crank's world matrix), winchAt (the drum's), sleeper: { forearm, head
// (groups hinged at the elbow and the neck, in the globe's pivot), wrist, elbow, hd, side }, pillow2 }). Three draws (the seat,
// its rope, the crank); per frame only while the seat moves, sways or carries, or the sleeper answers.
// Sets ctx.tally.seat and ctx.tally.ride (for the tests and tools/tally-frames.mjs).
import * as THREE from 'three';
import { Builder } from '../structures/geo.js';

const ID = 'halt-seat';
const LOWER = 6, RISE = 11, TOP = 9, DOWN = 8, BOARD = 1.0, ALIGHT = 0.9, HAUL = 8; // seconds
const EYE = 0.97; // a sitter's eye over the plank

export function buildSeat(ctx, o) {
  const { M0, group, mat, late, ropeC, HA } = o;
  const rig = new THREE.Group(); rig.name = 'waystation-seat'; rig.applyMatrix4(M0);
  group.add(rig);

  // the seat: a plank slung on four cords from a ring; its origin is the plank's middle
  const Bs = new Builder(ctx.noise);
  const seatM = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
  Bs.add(Bs.box(0.8, 0.08, 0.34, { chip: 0.01 }), seatM(0, 0, 0), late(o.paint));
  const ringP = new THREE.Vector3(0, 0.95, 0);
  for (const [cx, cz] of [[-0.36, -0.13], [0.36, -0.13], [-0.36, 0.13], [0.36, 0.13]]) {
    const a = new THREE.Vector3(cx, 0.03, cz), len = a.distanceTo(ringP);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), ringP.clone().sub(a).normalize());
    Bs.add(Bs.box(0.025, len, 0.025, { seg: 4 }), new THREE.Matrix4().compose(a.clone().add(ringP).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)), late(ropeC));
  }
  Bs.add(new THREE.TorusGeometry(0.06, 0.018, 5, 10), seatM(0, 0.97, 0), late(o.iron, { iron: 0.8 }));
  const seat = new THREE.Mesh(Bs.build(), mat);
  seat.name = 'waystation-seat'; seat.castShadow = true; seat.receiveShadow = true;
  rig.add(seat);
  // its rope, from the ring up to the pulley: a unit length hung from its top, stretched each frame it moves
  const ropeG = new THREE.CylinderGeometry(0.02, 0.02, 1, 5, 1); ropeG.translate(0, -0.5, 0);
  const rope = new THREE.Mesh(ropeG, new THREE.MeshStandardMaterial({ color: ropeC, roughness: 1 }));
  rope.name = 'waystation-seat-rope'; rope.castShadow = true;
  rope.position.copy(o.pul);
  rig.add(rope);
  // the winch's crank: an iron arm and a gilt handle on the drum's axle (its local x)
  const Bc = new Builder(ctx.noise);
  Bc.add(Bc.box(0.06, 0.06, 0.5), seatM(0, 0, 0.22), late(o.iron, { iron: 0.8 }));
  Bc.add(Bc.cyl(0.04, 0.04, 0.3, 6, 1), seatM(0.15, 0, 0.46, 0, 0, Math.PI / 2), late(o.gilt));
  const crank = new THREE.Mesh(Bc.build(), mat);
  crank.name = 'waystation-crank'; crank.castShadow = true;
  const crankQ = new THREE.Quaternion();
  o.crank.decompose(crank.position, crankQ, new THREE.Vector3());
  crank.quaternion.copy(crankQ);
  group.add(crank);
  const XAX = new THREE.Vector3(1, 0, 0), qSpin = new THREE.Quaternion();

  // where the seat is: its top (where it hangs at the hatch) and its foot (sitting height over the ground)
  const top = o.seat.clone().add(new THREE.Vector3(0, 0.35, 0)), yTop = top.y, yLow = o.ground(top.x, top.z) + 0.58;
  const at = new THREE.Vector3(top.x, yLow, top.z).applyMatrix4(M0); // the act's place: the plank when down
  const winchW = new THREE.Vector3().setFromMatrixPosition(o.winchAt);
  const P = ctx.player;
  let y = yTop, mode = 'up', t = 0, from = yTop, dur = 1, travel = 0, swayT = -1, swayA = 0;
  let release = null, sleepT = -1, turned = 0;
  const start = new THREE.Vector3(), boardFrom = new THREE.Vector3();
  const sw = { x: 0, rot: 0 };
  const sp = new THREE.Vector3(), eye = new THREE.Vector3(), ringW = new THREE.Vector3(), dv = new THREE.Vector3(), DN = new THREE.Vector3(0, -1, 0);
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

  function place() {
    const s = swayT >= 0 ? swayA * Math.exp(-swayT / 3) : 0;
    sw.x = s * 0.1 * Math.sin(swayT * 2 * Math.PI / 3.2);
    sw.rot = s * 0.3 * Math.sin(swayT * 2 * Math.PI / 2.4);
    seat.position.set(top.x + sw.x * Math.cos(HA), y, top.z - sw.x * Math.sin(HA));
    seat.rotation.set(0, -HA + sw.rot, 0);
    ringW.copy(ringP).applyEuler(seat.rotation).add(seat.position);
    dv.copy(ringW).sub(rope.position); const len = dv.length();
    rope.quaternion.setFromUnitVectors(DN, dv.divideScalar(len || 1)); rope.scale.set(1, len, 1);
  }
  function wind(dy) { // the crank turns with the rope it winds (a drum of 0.2 m)
    travel += dy / 0.2;
    qSpin.setFromAxisAngle(XAX, travel); crank.quaternion.copy(crankQ).multiply(qSpin);
  }
  function move(to, seconds) {
    from = y; dur = seconds * Math.min(1, Math.max(0.3, Math.abs(to - y) / (yTop - yLow))); t = 0; target = to;
    ctx.audio?.cue('act-winch', { x: winchW.x, y: winchW.y, z: winchW.z }, { dur, rate: Math.abs(to - from) / dur });
  }
  let target = yTop;
  function seatWorld(out) { return out.set(seat.position.x, seat.position.y, seat.position.z).applyMatrix4(M0); }
  // the paused card, the settings panel, the title: the ride holds where it is
  const card = document.getElementById('card');
  const open = () => P.enabled && !ctx.settings?.shown && (!card || card.classList.contains('hidden'));

  // the carry: the eye where the ride puts it
  const carrier = {
    step(pos) {
      seatWorld(eye); eye.y += EYE;
      if (mode === 'boarding') pos.copy(boardFrom).lerp(eye, ease(t / BOARD));
      else if (mode === 'alighting') pos.copy(eye).lerp(start, ease(t / ALIGHT));
      else pos.copy(eye);
    },
    drop() { release = null; sleepEnd(); haul(1.2); }, // a teleport: the seat goes back up empty
  };
  let hauled = false;
  function haul(wait) { mode = 'hauling'; t = -wait; hauled = false; }
  function sleepEnd() { if (sleepT >= 0 && sleepT < 6.5) sleepT = Math.max(sleepT, 4.6); }

  // the sleeper's answer, in the globe's pivot frame: his head turns to the seat, his far forearm rises and waves
  const S = o.sleeper, fa = S.forearm, hd = S.head;
  const rest = S.wrist.clone().sub(S.elbow).normalize();
  const qArm = new THREE.Quaternion(), qPat = new THREE.Quaternion(), qHead = new THREE.Quaternion(), qI = new THREE.Quaternion();
  const patAx = new THREE.Vector3(), aim = new THREE.Vector3(), YAX = new THREE.Vector3(0, 1, 0);
  let headYaw = 0;
  function aimSleeper() { // where the seat is now, from his elbow and his neck (once, as the seat arrives)
    seatWorld(aim); aim.y += 0.12;
    const local = fa.parent.worldToLocal(aim.clone());
    // his far forearm raised from the elbow, the hand up and leaning toward the seat: a sleeper's greeting, beyond
    // his face from where the visitor hangs, so nothing comes between them
    const dir = S.hd.clone().multiplyScalar(0.25).addScaledVector(S.side, 0.45).setY(0.85).normalize();
    qArm.setFromUnitVectors(rest, dir);
    patAx.copy(S.hd);
    const h = local.clone().sub(hd.position); // the head's yaw toward the seat, from the way he faces (out of the hatch)
    headYaw = Math.max(-0.75, Math.min(0.75, Math.atan2(S.hd.z * h.x - S.hd.x * h.z, S.hd.x * h.x + S.hd.z * h.z)));
  }
  function stepSleeper(dt) {
    if (sleepT < 0) return;
    sleepT += dt;
    const T = sleepT;
    if (T > 1.2 && T - dt <= 1.2) { const hw = hd.getWorldPosition(dv); ctx.audio?.cue('act-murmur', { x: hw.x, y: hw.y, z: hw.z }); }
    const up = ease((T - 1.4) / 1.4) * (1 - ease((T - 4.6) / 1.6));
    const pat = T > 2.8 && T < 4.2 ? Math.sin((T - 2.8) * 2 * Math.PI / 0.7) * 0.3 * Math.sin(Math.PI * (T - 2.8) / 1.4) : 0; // two slow waves
    fa.quaternion.slerpQuaternions(qI, qArm, up);
    if (pat) fa.quaternion.premultiply(qPat.setFromAxisAngle(patAx, pat));
    const riding = mode === 'top' || mode === 'rising';
    turned += ((riding ? 1 : 0) - turned) * Math.min(1, dt * (riding ? 1.2 : 0.7));
    hd.quaternion.setFromAxisAngle(YAX, headYaw * ease(Math.min(1, (T - 0.5) / 1.2)) * turned);
    if (T > 6.5 && turned < 0.01) { sleepT = -1; fa.quaternion.identity(); hd.quaternion.identity(); }
  }

  ctx.registerUpdate((dt) => {
    if (mode === 'up' && sleepT < 0) return; // at rest at the hatch: nothing per frame
    if (mode === 'waiting' && swayT < 0 && sleepT < 0) return;
    const go = open();
    if (go) {
      t += dt;
      if (swayT >= 0) { swayT += dt; if (swayT > 12) swayT = -1; }
    }
    const moving = mode === 'lowering' || mode === 'rising' || mode === 'down' || (mode === 'hauling' && t > 0);
    if (go && moving && t >= 0) {
      const y0 = y; y = from + (target - from) * ease(t / dur); wind(target > from ? y - y0 : y0 - y);
      if (t >= dur) {
        y = target;
        if (mode === 'lowering') { mode = 'waiting'; swayT = 0; swayA = 1; }
        else if (mode === 'rising') { mode = 'top'; t = 0; swayT = 0; swayA = 0.35; sleepT = 0; aimSleeper(); }
        else if (mode === 'down') { mode = 'alighting'; t = 0; swayT = 0; swayA = 0.4; }
        else if (mode === 'hauling') { mode = 'up'; swayT = 0; swayA = 0.3; }
      }
    }
    if (mode === 'boarding' && t >= BOARD) { mode = 'rising'; t = -0.5; from = y; target = yTop; dur = RISE; ctx.audio?.cue('act-winch', { x: winchW.x, y: winchW.y, z: winchW.z }, { dur: RISE + 0.5, rate: (yTop - yLow) / RISE }); }
    if (mode === 'rising' && t > 0.6 && P.intent > 0.3) { move(yLow, DOWN); mode = 'down'; } // the visitor wants down: from where they are
    if (mode === 'top' && (t >= TOP || (t > 1.5 && P.intent > 0.3))) { move(yLow, DOWN); mode = 'down'; sleepEnd(); }
    if (mode === 'alighting' && t >= ALIGHT) {
      release?.(); release = null;
      P.pos.copy(start); P.vel.set(0, 0, 0); P.vy = 0;
      haul(1.5);
    }
    if (mode === 'hauling' && t >= 0 && !hauled) { hauled = true; move(yTop, HAUL); }
    place();
    stepSleeper(go ? dt : 0);
  }, { pos: { x: at.x, z: at.z }, near: 80, hz: 4 });

  // the chalked stroke brings the seat down, once the chalk has done its work
  let pending = 0;
  ctx.events.addEventListener('act', (e) => {
    if (e.detail?.id !== 'halt-tally') return;
    const wait = (ctx.tally?.strokeEnd?.() ?? 1.85) + 0.9;
    clearTimeout(pending);
    pending = setTimeout(() => { if (mode === 'up' || mode === 'hauling') { mode = 'lowering'; hauled = true; move(yLow, LOWER); } }, wait * 1000);
  });

  const handle = ctx.acts?.add({
    id: ID, at, reach: 2.4, rise: 3, cone: 0.75, words: 'Take the seat', every: 'visit',
    when: () => mode === 'waiting',
    show(n) { if (o.pillow2) o.pillow2.visible = n > 0; },
    do() {
      start.copy(P.pos); boardFrom.copy(P.pos);
      release = ctx.controls.carry(carrier);
      mode = 'boarding'; t = 0; swayT = 0; swayA = 0.5; y -= 0.06; // the plank gives under them
      return new Promise((resolve) => { const w = () => (mode === 'up' || mode === 'hauling' ? resolve() : setTimeout(w, 250)); w(); });
    },
  });
  if (!handle || ctx.acts?.off) { if (o.pillow2) o.pillow2.visible = false; }
  place();
  const headW = () => hd.getWorldPosition(new THREE.Vector3());
  if (ctx.tally) {
    ctx.tally.seat = {
      at, get down() { return mode === 'waiting'; }, get mode() { return mode; }, get y() { return seatWorld(new THREE.Vector3()).y; },
      // where a visitor stands to take it: 1.3 m out from the stone in front of it, facing it
      stand() {
        const p = new THREE.Vector3(top.x, 0, top.z + 1.3).applyMatrix4(M0);
        return { x: p.x, z: p.z, yaw: Math.atan2(-(at.x - p.x), -(at.z - p.z)), pitch: -0.45 };
      },
    };
    ctx.tally.ride = {
      get phase() { return mode === 'up' || mode === 'waiting' || mode === 'lowering' || mode === 'hauling' ? null : mode; },
      up: RISE, top: TOP, get start() { return start.clone(); }, get sleeper() { return headW(); },
      get answering() { return sleepT >= 0; },
    };
  }
  return { draws: 3 };
}
