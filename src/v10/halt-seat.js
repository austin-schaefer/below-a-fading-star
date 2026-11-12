// The Lantern Halt's seat, and the ride (v10-A4): the tally's second half. Chalking is how a traveller claims the bed
// in the lantern, so when a visitor has chalked their stroke (src/v10/tally.js) the Halt takes them for its guest:
// the winch at the foot turns by itself, its pawl clacking, and the slung seat comes down its rope out of the dark
// above, past the tallies, a metre out from the stone beside the stroke just made, slowing as it comes, and stops
// swaying at knee height in the view the visitor already has. A second act is offered at it ("Take the seat"); the
// visitor is hauled up the face of the slab, ten metres, the moor opening out behind, and hangs at the hatch an arm's
// length from the sleeper. He turns his face to them under his nightcap, murmurs, lifts his closed hand over the sill
// to them and opens it: salt runs out of it, past the seat, down into the dark (he is the pedlar whose sack split;
// stories/salt-for-news.md). After some seconds, or as soon as the visitor tries to walk, the seat lets them down
// exactly where they got on and is hauled back up empty; if nobody takes it, it goes back up after a while. The lamp
// is turned low while a guest hangs there. Remembered: from the visit after a ride, a second pillow on the sill and,
// on the open door, a saffron stroke chalked for each time they have come up.
//
// The player is carried with ctx.controls.carry (src/controls.js): the look stays free, nothing else moves them, a
// teleport ends the ride (the seat goes back up empty), and the paused card or the settings panel hold the ride and
// the seat where they are. Built by src/v9/waystation.js with its frame: buildSeat(ctx, { M0, group, mat (the
// furniture's stone material), late, ropeC, iron, gilt, paint, seat (its top, local), pul (the rope's point under
// the pulley, local), HA, ground(x, z) (local), winchAt (the drum's world matrix), sleeper: { forearm, head (groups
// hinged at the elbow and the neck, in the globe's pivot), wrist, elbow, hd, side }, pillow2, pivot, doorMark: { pos,
// normal } (in the pivot), dimmer: { value } (the lamp's turn-down) }). Five draws (the seat, its rope, the drum and
// crank, the salt while it falls, the door's chalk once there is some); per frame only while the seat moves, waits
// or carries, or the sleeper answers. Sets ctx.tally.seat and ctx.tally.ride (for the tests and tools/tally-frames.mjs).
import * as THREE from 'three';
import { Builder } from '../structures/geo.js';

const ID = 'halt-seat';
const LOWER = 7.5, RISE = 11, TOP = 10, DOWN = 8, BOARD = 1.0, ALIGHT = 0.9, HAUL = 8; // seconds
const EYE = 0.8, LEAN = 0.12, TUCK = 0.13; // a sitter's eye over the plank, leant out from the stone on the way up, and
// at the top tucked toward it, so the seat's cord on his side stands clear of the line from the eye to his face
const STOP = 0.8; // the plank's height over the ground when down: in the view from where the visitor chalked
const AWAY = 25, AWAY_T = 20, WAIT_T = 150; // the seat goes back up: 20 s with nobody within 25 m, or 150 s untaken

export function buildSeat(ctx, o) {
  const { M0, group, mat, late, ropeC } = o;
  const rig = new THREE.Group(); rig.name = 'waystation-seat'; rig.applyMatrix4(M0);
  group.add(rig);
  const M = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s));

  // the seat: a plank hung like a swing, a cord up from each end to a painted spreader over the sitter's head, two
  // more from its ends to the ring; its origin is the plank's middle. The sitter looks out between the cords
  const Bs = new Builder(ctx.noise);
  Bs.add(Bs.box(0.8, 0.08, 0.34, { chip: 0.01 }), M(0, 0, 0), late(o.paint));
  const ringP = new THREE.Vector3(0, 2.1, 0);
  const cord = (a, b, t = 0.022) => {
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    Bs.add(Bs.box(t, a.distanceTo(b), t, { seg: 4 }), new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)), late(ropeC));
  };
  for (const sx of [-1, 1]) {
    cord(new THREE.Vector3(sx * 0.37, 0.03, 0), new THREE.Vector3(sx * 0.4, 1.62, 0));
    cord(new THREE.Vector3(sx * 0.4, 1.66, 0), ringP);
  }
  Bs.add(Bs.box(0.9, 0.06, 0.06), M(0, 1.64, 0), late(o.green ?? o.paint)); // the spreader
  Bs.add(new THREE.TorusGeometry(0.06, 0.018, 5, 10), M(0, 2.12, 0), late(o.iron, { iron: 0.8 }));
  const seat = new THREE.Mesh(Bs.build(), mat);
  seat.name = 'waystation-seat'; seat.castShadow = true; seat.receiveShadow = true;
  rig.add(seat);
  // its rope, from the ring up to the pulley: a unit length hung from its top, stretched each frame it moves
  const ropeG = new THREE.CylinderGeometry(0.02, 0.02, 1, 5, 1); ropeG.translate(0, -0.5, 0);
  const rope = new THREE.Mesh(ropeG, new THREE.MeshStandardMaterial({ color: ropeC, roughness: 1 }));
  rope.name = 'waystation-seat-rope';
  rope.position.copy(o.pul);
  rig.add(rope);
  // what turns at the winch, on the drum's axle (its local x): the drum wound with rope, an iron ratchet wheel outside
  // the right cheek with its teeth for the pawl, and the crank, its handle of turned wood worn pale where hands go
  const Bc = new Builder(ctx.noise);
  Bc.add(Bc.cyl(0.2, 0.2, 0.86, 14, 1), M(0, 0, 0, 0, 0, Math.PI / 2), late(new THREE.Color('#7a6a4a')));
  for (let k = 0; k < 6; k++) Bc.add(new THREE.TorusGeometry(0.215, 0.032, 5, 14), M(-0.33 + k * 0.13, 0, 0, 0, Math.PI / 2, 0), late(ropeC));
  for (const x of [-0.43, 0.43]) Bc.add(Bc.cyl(0.25, 0.25, 0.04, 14, 1), M(x, 0, 0, 0, 0, Math.PI / 2), late(o.paint)); // the drum's painted flanges
  Bc.add(Bc.cyl(0.24, 0.24, 0.05, 16, 1), M(0.6, 0, 0, 0, 0, Math.PI / 2), late(o.iron, { iron: 0.9 })); // the ratchet
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; Bc.add(Bc.box(0.05, 0.06, 0.05), M(0.6, Math.cos(a) * 0.26, Math.sin(a) * 0.26, a + 0.4, 0, 0), late(o.iron, { iron: 0.9 })); }
  Bc.add(Bc.cyl(0.04, 0.04, 0.3, 6, 1), M(0.66, 0, 0, 0, 0, Math.PI / 2), late(o.iron, { iron: 0.8 })); // the axle's end
  Bc.add(Bc.box(0.05, 0.07, 0.5), M(0.8, 0, 0.22), late(o.iron, { iron: 0.8 })); // the crank's arm
  Bc.add(Bc.cyl(0.045, 0.04, 0.26, 8, 1), M(0.93, 0, 0.45, 0, 0, Math.PI / 2), late(new THREE.Color('#c8a878'))); // its handle, worn pale
  Bc.add(new THREE.IcosahedronGeometry(0.05, 1), M(1.07, 0, 0.45), late(o.gilt)); // a gilt knob on it
  const crank = new THREE.Mesh(Bc.build(), mat);
  crank.name = 'waystation-winch-drum';
  const crankQ = new THREE.Quaternion();
  o.winchAt.decompose(crank.position, crankQ, new THREE.Vector3());
  crank.quaternion.copy(crankQ);
  group.add(crank);
  const XAX = new THREE.Vector3(1, 0, 0), qSpin = new THREE.Quaternion();

  // where the seat is: its top (where it hangs at the hatch) and its foot (in the view from where the visitor chalked)
  const top = o.seat.clone().add(new THREE.Vector3(0, 0.35, 0)), yTop = top.y, yLow = o.ground(top.x, top.z) + STOP;
  const at = new THREE.Vector3(top.x, yLow, top.z).applyMatrix4(M0); // the act's place: the plank when down
  const winchW = new THREE.Vector3().setFromMatrixPosition(o.winchAt);
  const P = ctx.player;
  let y = yTop, mode = 'up', t = 0, from = yTop, dur = 1, target = yTop, profile = 0, travel = 0, swayT = -1, swayA = 0;
  let release = null, sleepT = -1, turned = 0, pending = -1, waited = 0, alone = 0, hauled = false;
  const start = new THREE.Vector3(), boardFrom = new THREE.Vector3();
  const sw = { x: 0, rot: 0 };
  const out = new THREE.Vector3(0, 0, 1).transformDirection(M0); // away from the stone
  const eye = new THREE.Vector3(), ringW = new THREE.Vector3(), dv = new THREE.Vector3(), sp = new THREE.Vector3(), DN = new THREE.Vector3(0, -1, 0);
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const easeOut = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - (1 - x) ** 3); // quick from the hatch, slow into the view

  function place() {
    const s = swayT >= 0 ? swayA * Math.exp(-swayT / 3) : 0;
    sw.x = s * 0.1 * Math.sin(swayT * 2 * Math.PI / 3.2);
    sw.rot = s * 0.3 * Math.sin(swayT * 2 * Math.PI / 2.4);
    seat.position.set(top.x + sw.x, y, top.z);
    seat.rotation.set(0, sw.rot, 0); // the plank along the stone
    ringW.copy(ringP).applyEuler(seat.rotation).add(seat.position);
    dv.copy(ringW).sub(rope.position); const len = dv.length();
    rope.quaternion.setFromUnitVectors(DN, dv.divideScalar(len || 1)); rope.scale.set(1, len, 1);
  }
  function wind(dy) { // the drum turns with the rope it winds (0.2 m)
    travel += dy / 0.2;
    qSpin.setFromAxisAngle(XAX, travel); crank.quaternion.copy(crankQ).multiply(qSpin);
  }
  function move(to, seconds, prof = 0) {
    from = y; dur = seconds * Math.min(1, Math.max(0.3, Math.abs(to - y) / (yTop - yLow))); t = 0; target = to; profile = prof;
    ctx.audio?.cue('act-winch', { x: winchW.x, y: winchW.y, z: winchW.z }, { dur, rate: Math.abs(to - from) / dur, out: !!prof });
  }
  function seatWorld(out) { return out.set(seat.position.x, seat.position.y, seat.position.z).applyMatrix4(M0); }
  // the paused card, the settings panel, the title: the ride and the seat hold where they are
  const card = document.getElementById('card');
  const open = () => P.enabled && !ctx.settings?.shown && (!card || card.classList.contains('hidden'));

  // the carry: the eye where the ride puts it
  const carrier = {
    step(pos) {
      seatWorld(eye); eye.y += EYE;
      const k = ease((y - yLow - 6.5) / 2); eye.addScaledVector(out, LEAN * (1 - k) - TUCK * k);
      if (mode === 'boarding') pos.copy(boardFrom).lerp(eye, ease(t / BOARD));
      else if (mode === 'alighting') pos.copy(eye).lerp(start, ease(t / ALIGHT));
      else pos.copy(eye);
    },
    drop() { release = null; sleepEnd(); haul(1.2); }, // a teleport (or a fault): the seat goes back up empty
  };
  function haul(wait) { mode = 'hauling'; t = -wait; hauled = false; }
  function sleepEnd() { if (sleepT >= 0 && sleepT < 6.8) sleepT = Math.max(sleepT, 6.8); }

  // the sleeper's answer, in the globe's pivot frame: his head turns to the seat; his near forearm rises from the quilt
  // out over the sill to the visitor, the hand turns over and opens, and salt runs out of it
  const S = o.sleeper, fa = S.forearm, hd = S.head;
  const rest = S.wrist.clone().sub(S.elbow).normalize();
  const aimDir = S.hd.clone().multiplyScalar(0.75).addScaledVector(S.side, -0.15).setY(0.62).normalize();
  const qArm = new THREE.Quaternion().setFromUnitVectors(rest, aimDir), qRoll = new THREE.Quaternion(), qI = new THREE.Quaternion();
  const handLocal = S.wrist.clone().sub(S.elbow).addScaledVector(rest, 0.12);
  // the salt: grains from his hand, falling past the seat into the dark
  const NS = 120, spos = new Float32Array(NS * 3), svel = new Float32Array(NS * 3), slife = new Float32Array(NS);
  const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(spos, 3));
  const salt = new THREE.Points(sGeo, new THREE.PointsMaterial({ color: '#f6f2e8', size: 0.012 }));
  salt.name = 'waystation-salt'; salt.frustumCulled = false; salt.visible = false;
  group.add(salt);
  const srng = ctx.makeRng(1006);
  let snext = 0, slive = 0;
  function stepSalt(dt, pouring) {
    if (pouring) {
      fa.localToWorld(sp.copy(handLocal));
      for (let n = Math.round(dt * 60 + srng()); n > 0; n--) {
        const i = snext; snext = (snext + 1) % NS;
        spos[i * 3] = sp.x + (srng() - 0.5) * 0.04; spos[i * 3 + 1] = sp.y - 0.03; spos[i * 3 + 2] = sp.z + (srng() - 0.5) * 0.04;
        svel[i * 3] = (srng() - 0.5) * 0.12; svel[i * 3 + 1] = -0.2 - srng() * 0.3; svel[i * 3 + 2] = (srng() - 0.5) * 0.12;
        slife[i] = 2.2;
      }
    }
    slive = 0;
    for (let i = 0; i < NS; i++) {
      if (slife[i] <= 0) { spos[i * 3 + 1] = -1e4; continue; }
      slife[i] -= dt; slive++;
      svel[i * 3 + 1] -= 5 * dt; // grains in still air, slowed a little
      for (let a = 0; a < 3; a++) spos[i * 3 + a] += svel[i * 3 + a] * dt;
    }
    sGeo.attributes.position.needsUpdate = true;
    salt.visible = slive > 0;
  }
  function stepSleeper(dt) {
    if (sleepT < 0) return;
    sleepT += dt;
    const T = sleepT;
    if (T > 1.2 && T - dt <= 1.2) { const hw = hd.getWorldPosition(dv); ctx.audio?.cue('act-murmur', { x: hw.x, y: hw.y, z: hw.z }); }
    const up = ease((T - 1.8) / 1.8) * (1 - ease((T - 6.8) / 1.8)), roll = ease((T - 3.6) / 0.8) * (1 - ease((T - 6.0) / 0.8));
    fa.quaternion.slerpQuaternions(qI, qArm, up);
    if (roll > 0) fa.quaternion.premultiply(qRoll.setFromAxisAngle(aimDir, roll * 2.2));
    const riding = mode === 'top' || mode === 'rising';
    turned += ((riding ? 1 : 0) - turned) * Math.min(1, dt * (riding ? 1.2 : 0.7));
    hd.quaternion.setFromAxisAngle(S.crown, 0.5 * ease((T - 0.4) / 1.2) * turned);
    stepSalt(dt, T > 3.9 && T < 6.0);
    if (T > 8.8 && turned < 0.01 && slive === 0) { sleepT = -1; fa.quaternion.identity(); hd.quaternion.identity(); salt.visible = false; }
  }

  ctx.registerUpdate((dt) => {
    if (mode === 'up' && sleepT < 0 && pending < 0 && o.dimmer.value === 0) return; // at rest at the hatch: nothing per frame
    if (mode === 'waiting' && swayT < 0 && sleepT < 0) { if (open()) checkWait(dt); return; } // waiting still: a distance a frame
    const go = open();
    if (go) {
      if (pending >= 0 && (pending -= dt) < 0 && (mode === 'up' || mode === 'hauling')) { mode = 'lowering'; hauled = true; move(yLow, LOWER, 1); }
      t += dt;
      if (swayT >= 0) { swayT += dt; if (swayT > 12) swayT = -1; }
    }
    const moving = mode === 'lowering' || mode === 'rising' || mode === 'down' || (mode === 'hauling' && t > 0);
    if (go && moving && t >= 0) {
      const y0 = y; y = from + (target - from) * (profile ? easeOut(t / dur) : ease(t / dur)); wind(Math.abs(y - y0));
      if (t >= dur) {
        y = target;
        if (mode === 'lowering') { mode = 'waiting'; swayT = 0; swayA = 1; waited = 0; alone = 0; }
        else if (mode === 'rising') { mode = 'top'; t = 0; swayT = 0; swayA = 0.35; sleepT = 0; }
        else if (mode === 'down') { mode = 'alighting'; t = 0; swayT = 0; swayA = 0.4; }
        else if (mode === 'hauling') { mode = 'up'; swayT = 0; swayA = 0.3; }
      }
    }
    if (mode === 'waiting') checkWait(go ? dt : 0);
    if (mode === 'boarding' && t >= BOARD) { mode = 'rising'; t = -0.5; from = y; target = yTop; dur = RISE; profile = 0; ctx.audio?.cue('act-winch', { x: winchW.x, y: winchW.y, z: winchW.z }, { dur: RISE + 0.5, rate: (yTop - yLow) / RISE }); }
    if (mode === 'rising' && t > 0.6 && P.intent > 0.3) { move(yLow, DOWN); mode = 'down'; } // the visitor wants down: from where they are
    if (mode === 'top' && (t >= TOP || (t > 1.5 && P.intent > 0.3))) { move(yLow, DOWN); mode = 'down'; sleepEnd(); }
    if (mode === 'alighting' && t >= ALIGHT) {
      release?.(); release = null;
      P.pos.copy(start); P.vel.set(0, 0, 0); P.vy = 0;
      haul(1.5);
    }
    if (mode === 'hauling' && t >= 0 && !hauled) { hauled = true; move(yTop, HAUL); }
    // the lamp turned low while a guest hangs near it, so the light on him is warm and not blinding
    const near = mode === 'rising' || mode === 'top' || mode === 'down' ? Math.min(1, Math.max(0, (y - yLow - 4) / 3)) : 0;
    o.dimmer.value += (near - o.dimmer.value) * Math.min(1, dt * 1.5);
    if (o.dimmer.value < 0.002 && near === 0) o.dimmer.value = 0;
    place();
    stepSleeper(go ? dt : 0);
  }, { pos: { x: at.x, z: at.z }, near: 80, hz: 4 });
  // untaken: back up after a while, sooner if the visitor has gone away
  function checkWait(dt) {
    waited += dt;
    const d = Math.hypot(P.pos.x - at.x, P.pos.z - at.z);
    alone = d > AWAY ? alone + dt : 0;
    if (mode === 'waiting' && (alone > AWAY_T || (waited > WAIT_T && d > 6))) { haul(0); return true; }
    return false;
  }

  // the chalked stroke brings the seat down, once the chalk has done its work (on the walk's own clock)
  ctx.events.addEventListener('act', (e) => {
    if (e.detail?.id !== 'halt-tally') return;
    pending = (ctx.tally?.strokeEnd?.() ?? 1.85) + 0.3;
  });

  // the door's chalk: a saffron stroke for each ride before this visit, in gates of five, on both faces of the door
  const dcv = document.createElement('canvas'); dcv.width = dcv.height = 128;
  const dtex = new THREE.CanvasTexture(dcv); dtex.colorSpace = THREE.SRGBColorSpace;
  const dmat = new THREE.MeshStandardMaterial({ map: dtex, transparent: true, depthWrite: false, roughness: 1, emissive: new THREE.Color('#ffd890'), emissiveMap: dtex, emissiveIntensity: 0.35 });
  const marks = [];
  if (o.doorMark && o.pivot) for (const sgn of [1, -1]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), dmat);
    const n = o.doorMark.normal.clone().multiplyScalar(sgn);
    m.position.copy(o.doorMark.pos).addScaledVector(n, 0.035);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    m.name = 'waystation-door-chalk'; m.visible = false; o.pivot.add(m); marks.push(m);
  }
  function drawDoor(n) {
    const g = dcv.getContext('2d'); g.clearRect(0, 0, 128, 128);
    g.strokeStyle = 'rgb(255,214,132)'; g.lineWidth = 7; g.lineCap = 'round';
    const k = Math.min(n, 15);
    for (let i = 0; i < k; i++) {
      const gate = Math.floor(i / 5), j = i % 5, gx = 10 + (gate % 2) * 60, gy = 12 + Math.floor(gate / 2) * 58;
      g.beginPath();
      if (j < 4) { g.moveTo(gx + j * 12 + 2, gy); g.lineTo(gx + j * 12, gy + 44); } else { g.moveTo(gx - 6, gy + 34); g.lineTo(gx + 50, gy + 8); }
      g.stroke();
    }
    dtex.needsUpdate = true;
    for (const m of marks) m.visible = n > 0;
  }

  const handle = ctx.acts?.add({
    id: ID, at, reach: 2.6, rise: 3, cone: 0.75, words: 'Take the seat', every: 'visit',
    when: () => mode === 'waiting',
    show(n) { if (o.pillow2) o.pillow2.visible = n > 0; drawDoor(n); },
    do() {
      start.copy(P.pos); boardFrom.copy(P.pos);
      release = ctx.controls.carry(carrier);
      mode = 'boarding'; t = 0; swayT = 0; swayA = 0.5; y -= 0.06; // the plank gives under them
      return new Promise((resolve) => { const w = () => (mode === 'up' || mode === 'hauling' ? resolve() : setTimeout(w, 250)); w(); });
    },
  });
  if (!handle || ctx.acts?.off) { if (o.pillow2) o.pillow2.visible = false; drawDoor(0); }
  place();
  const headW = () => hd.getWorldPosition(new THREE.Vector3());
  if (ctx.tally) {
    ctx.tally.seat = {
      at, get down() { return mode === 'waiting'; }, get mode() { return mode; }, get y() { return seatWorld(new THREE.Vector3()).y; },
      world: () => seatWorld(new THREE.Vector3()),
      winch: winchW,
      // where a visitor stands to take it: 1.3 m out from the stone in front of it, facing it
      stand() {
        const p = new THREE.Vector3(top.x, 0, top.z + 1.3).applyMatrix4(M0);
        return { x: p.x, z: p.z, yaw: Math.atan2(-(at.x - p.x), -(at.z - p.z)), pitch: -0.45 };
      },
    };
    ctx.tally.ride = {
      get phase() { return mode === 'up' || mode === 'waiting' || mode === 'lowering' || mode === 'hauling' ? null : mode; },
      up: RISE, top: TOP, get start() { return start.clone(); }, get sleeper() { return headW(); },
      get answering() { return sleepT >= 0; }, get salt() { return slive; },
    };
  }
  return { draws: 5 };
}
