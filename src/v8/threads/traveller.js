// Thread 1, the traveller on the Span (briefs/v8/index.md): at the west lip of the first broken bay (the deck ends at
// pier -120's east face, 130 m from the west stair's head) a pair of boots set side by side with their toes to the
// drop, a cloak folded square, a pack with its flap thrown back and three things laid out in a row as if chosen: a tin cup, a book, and a coil of rope whose end is run
// out to the lip and hangs a forearm's length over a fall of sixty metres. Below, in the old Span's hollow by
// P15, what is left of him, years old: a skeleton on its back, splayed, in the same madder coat with the same saffron
// hem, bare bone feet (his boots are upstairs), the stick he walked with broken in two beside him and his purse burst
// with a few copper coins round it. His hat, the same cloth, lies on P16 at the wood's edge, on the way round to
// the west stair, caught against a stone.
// Three merged vertex-coloured meshes (deck, body, hat); one collider (the pack); nothing animated.
import * as THREE from 'three';
import { TRAVELLER as T } from './plan.js';
import { Acc, frame, local, ellipsoid, rod, boxAt, finish } from './kit.js';

const MADDER = '#a83226', MADDER_D = '#80241c', SAFFRON = '#d49a30', LEATHER = '#3a2718', CANVAS = '#6a5a3e', BONE = '#cbbfa2', BONE_D = '#a69a7c';
const HEMP = '#94805a', TIN = '#8b8e92', WOOD = '#7b6246', BREECH = '#2c2621', COPPER = '#8e5a34';

function boot(acc, F, x, z) {
  // a tall riding boot standing, toe toward -x (the drop): sole, foot, heel, a shaft with a turned-down top
  boxAt(acc, F, 0.27, 0.025, 0.095, x - 0.06, 0.0125, z, '#1e140d');
  ellipsoid(acc, F, x - 0.08, 0.055, z, 0.13, 0.05, 0.05, LEATHER);
  boxAt(acc, F, 0.07, 0.04, 0.085, x + 0.06, 0.03, z, '#1e140d');
  rod(acc, F, [x + 0.045, 0.04, z], [x + 0.05, 0.4, z], 0.058, LEATHER, 0.062);
  rod(acc, F, [x + 0.05, 0.38, z], [x + 0.052, 0.45, z], 0.068, '#4a3220', 0.07);
}

function deckKit(ctx, rng, acc) {
  const y = T.deckY, F = frame(T.kit.x, y, T.kit.z, T.yaw);
  // the boots: heels at the kit's origin, a hand's breadth apart
  boot(acc, F, 0, -0.12); boot(acc, F, 0, 0.12);
  // the cloak, folded in four and laid square: two layers, the saffron hem along the top fold's edge
  boxAt(acc, F, 0.48, 0.05, 0.38, 0.55, 0.025, 0.55, MADDER_D, 0, 0.05, 0);
  boxAt(acc, F, 0.46, 0.05, 0.36, 0.55, 0.075, 0.55, MADDER, 0, 0.04, 0);
  boxAt(acc, F, 0.46, 0.052, 0.04, 0.55, 0.077, 0.39, SAFFRON, 0, 0.04, 0);
  boxAt(acc, F, 0.02, 0.052, 0.36, 0.33, 0.077, 0.55, SAFFRON, 0, 0.04, 0);
  // the pack, upright, its back to the cloak; the flap thrown back over the top and down behind
  const P = local(F, 0.95, 0, -0.45, 0, -0.15, 0);
  boxAt(acc, P, 0.34, 0.4, 0.2, 0, 0.2, 0, CANVAS);
  ellipsoid(acc, P, 0, 0.4, 0, 0.17, 0.035, 0.1, CANVAS);
  boxAt(acc, P, 0.3, 0.02, 0.22, 0.17, 0.39, 0, '#5c4d34', 0, 0, -1.25); // the flap, hanging down the back
  for (const s of [-0.09, 0.09]) boxAt(acc, P, 0.03, 0.42, 0.012, -0.172, 0.2, s, '#3b2a1a'); // shoulder straps
  boxAt(acc, P, 0.36, 0.03, 0.22, 0, 0.1, 0, '#3b2a1a'); // the belt strap
  ellipsoid(acc, P, -0.02, 0.36, 0, 0.12, 0.05, 0.07, '#2c2a26'); // the dark of its open mouth
  // three things in a row toward the lip, each set square to the edge: a tin cup, a book, a coil of rope
  rod(acc, F, [0.35, 0, -0.62], [0.35, 0.085, -0.62], 0.04, TIN, 0.045);
  rod(acc, F, [0.35, 0.083, -0.62], [0.35, 0.087, -0.62], 0.035, '#2b2b2c'); // the dark inside it
  boxAt(acc, F, 0.15, 0.035, 0.21, 0.35, 0.0175, -0.98, '#2f4636');
  boxAt(acc, F, 0.004, 0.028, 0.19, 0.274, 0.0175, -0.98, '#cfc6ae'); // the page edges
  const coil = new THREE.TorusGeometry(0.12, 0.016, 5, 18);
  for (let k = 0; k < 3; k++) acc.add(coil, local(F, 0.35, 0.016 + k * 0.03, -1.4 + k * 0.006, Math.PI / 2, 0, 0, 1 - k * 0.07), HEMP, 0.08);
  // its end, run out straight to the lip and over it: on the deck to x 169, then down the stub's face
  const lipLocal = -Math.abs(T.edgeX - T.kit.x); // local -x is over the lip
  rod(acc, F, [0.23, 0.016, -1.4], [lipLocal + 0.02, 0.016, -1.33], 0.014, HEMP);
  rod(acc, F, [lipLocal + 0.02, 0.016, -1.33], [lipLocal - 0.03, -0.62, -1.31], 0.014, HEMP);
  const c = new THREE.Vector3(0.95, 0, -0.45).applyMatrix4(F);
  return { cols: [{ x: c.x, z: c.z, r: 0.32, y: y - 0.2, h: 0.75 }] };
}

// the body: a frame at the pelvis, +z toward the head, +x his left, y up from the ground (he lies on his back)
function body(ctx, rng, acc, gy, n) {
  const B = T.body, F = frame(B.x, gy(B.x, B.z) + 0.02, B.z, B.yaw, n);
  const lo = ctx.quality === 'low';
  // the coat: chest and belly under the cloth, sunk flat; the skirts spread on the ground to the knees, the saffron hem
  ellipsoid(acc, F, 0, 0.08, 0.27, 0.21, 0.085, 0.3, MADDER, { low: lo });
  ellipsoid(acc, F, 0, 0.05, -0.02, 0.2, 0.06, 0.16, MADDER_D, { low: lo });
  boxAt(acc, F, 0.62, 0.018, 0.42, 0, 0.012, -0.24, MADDER, 0, 0.12, 0);
  boxAt(acc, F, 0.64, 0.02, 0.06, 0.03, 0.014, -0.44, SAFFRON, 0, 0.12, 0);
  boxAt(acc, F, 0.3, 0.016, 0.3, 0.3, 0.008, -0.18, MADDER_D, 0, -0.5, 0); // a tail flung out
  // the open collar: a dark gap with the ribs and breastbone in it
  ellipsoid(acc, F, 0, 0.12, 0.44, 0.1, 0.03, 0.08, '#2a1f1b');
  for (let k = 0; k < 4; k++) rod(acc, F, [-0.09 + 0.004 * k, 0.13, 0.4 + k * 0.035], [0.09 - 0.004 * k, 0.13, 0.41 + k * 0.035], 0.008, BONE, 0.008, 0.05, 5);
  rod(acc, F, [0, 0.14, 0.38], [0, 0.14, 0.52], 0.01, BONE);
  boxAt(acc, F, 0.2, 0.025, 0.05, 0, 0.13, 0.55, SAFFRON, 0, 0.3, 0); // the kerchief at his neck
  // the skull, turned toward his left, the jaw fallen a little open
  const Hd = local(F, 0.05, 0.1, 0.72, 0, 0.9, 0.25);
  ellipsoid(acc, Hd, 0, 0, 0, 0.085, 0.09, 0.105, BONE, { low: lo });
  for (const s of [-1, 1]) ellipsoid(acc, Hd, s * 0.032, 0.02, 0.085, 0.022, 0.024, 0.02, '#211c18');
  ellipsoid(acc, Hd, 0, -0.02, 0.098, 0.01, 0.018, 0.01, '#211c18');
  boxAt(acc, Hd, 0.09, 0.03, 0.06, 0, -0.08, 0.06, BONE_D, -0.35, 0, 0);
  // the arms: the right flung up past his head, the left out on the ground; sleeves to the wrist, saffron cuffs, bone hands
  const arm = (sh, el, wr, fingers) => {
    rod(acc, F, sh, el, 0.055, MADDER, 0.05);
    rod(acc, F, el, wr, 0.05, MADDER, 0.045);
    const c = new THREE.Vector3(...wr).sub(new THREE.Vector3(...el)).normalize();
    rod(acc, F, [wr[0] - c.x * 0.03, wr[1], wr[2] - c.z * 0.03], [wr[0] + c.x * 0.01, wr[1], wr[2] + c.z * 0.01], 0.05, SAFFRON);
    for (let k = 0; k < 5; k++) {
      const a = Math.atan2(c.x, c.z) + (k - 2) * 0.28 + fingers, l = 0.1 + (k === 0 ? -0.03 : 0.02 * Math.sin(k));
      rod(acc, F, [wr[0] + c.x * 0.02, 0.02, wr[2] + c.z * 0.02], [wr[0] + c.x * 0.02 + Math.sin(a) * l, 0.012, wr[2] + c.z * 0.02 + Math.cos(a) * l], 0.007, BONE, 0.005, 0.05, 4);
    }
  };
  arm([-0.2, 0.08, 0.5], [-0.4, 0.05, 0.8], [-0.34, 0.04, 1.08], 0.2);
  arm([0.2, 0.08, 0.5], [0.5, 0.05, 0.42], [0.76, 0.04, 0.32], -0.15);
  // the legs: breeches to the knee, bare shin bones, bare bone feet splayed
  for (const s of [-1, 1]) {
    const kx = s * 0.2 + (s > 0 ? 0.08 : 0), ax = s * 0.27 + (s > 0 ? 0.16 : 0);
    rod(acc, F, [s * 0.1, 0.07, -0.02], [kx, 0.06, -0.44], 0.075, BREECH, 0.06);
    rod(acc, F, [kx, 0.05, -0.44], [ax, 0.03, -0.86], 0.022, BONE, 0.017);
    rod(acc, F, [kx + s * 0.03, 0.04, -0.46], [ax + s * 0.03, 0.025, -0.85], 0.012, BONE_D);
    const fa = s * 0.6 + (s > 0 ? 0.3 : 0);
    boxAt(acc, F, 0.06, 0.03, 0.08, ax, 0.03, -0.89, BONE, 0, fa, 0);
    for (let k = 0; k < 4; k++) rod(acc, F, [ax + Math.sin(fa) * 0.0 + (k - 1.5) * 0.015, 0.02, -0.92], [ax + Math.sin(fa) * -0.12 + (k - 1.5) * 0.02, 0.01, -0.92 - Math.cos(fa) * 0.12], 0.007, BONE, 0.006, 0.05, 4);
  }
  // round him, each on its own ground: the stick in two, the purse burst and its coins, a clay pipe's stem
  const at = (x, z, yaw = 0) => { const wx = B.x + x * Math.cos(B.yaw) + z * Math.sin(B.yaw), wz = B.z - x * Math.sin(B.yaw) + z * Math.cos(B.yaw); return frame(wx, gy(wx, wz), wz, yaw); };
  rod(acc, at(1.0, 0.5, 0.4), [-0.45, 0.02, 0], [0.4, 0.02, 0.02], 0.016, WOOD);
  rod(acc, at(1.6, -0.4, -0.9), [-0.28, 0.02, 0], [0.32, 0.02, 0], 0.016, WOOD);
  ellipsoid(acc, at(-0.9, -0.3, 0.6), 0, 0.03, 0, 0.07, 0.03, 0.05, '#4a3424');
  for (let k = 0; k < 7; k++) {
    const a = rng() * 6.28, r = 0.15 + rng() * 0.9;
    rod(acc, at(-0.9 + Math.cos(a) * r, -0.3 + Math.sin(a) * r, 0), [0, 0.003, 0], [0, 0.007, 0], 0.012, COPPER, 0.012, 0.15, 8);
  }
  rod(acc, at(0.7, 1.4, 1.2), [-0.12, 0.01, 0], [0.1, 0.01, 0], 0.005, '#c9c0ad');
  // his letters, burst from the coat and blown in a fan downstream: pale against the bank, seen from the deck
  for (let k = 0; k < 26; k++) {
    const a = -0.9 + rng() * 2.4, r = 0.6 + rng() * 3.4;
    boxAt(acc, at(Math.sin(a) * r, Math.cos(a) * r - 0.3, rng() * 6), 0.2, 0.004, 0.27, 0, 0.004, 0, rng() < 0.3 ? '#c9bea2' : '#ddd3bb', (rng() - 0.5) * 0.15, 0, (rng() - 0.5) * 0.15, 0.06);
  }
}

function hat(ctx, rng, acc, gy, n) {
  const H = T.hat, F = frame(H.x, gy(H.x, H.z), H.z, 0.9, n);
  // the stone it fetched up against, and the hat tipped against it on its brim
  ellipsoid(acc, F, 0.32, 0.12, 0, 0.26, 0.2, 0.22, '#55504a', { ay: 0.4, jitter: 0.04 });
  const Hm = local(F, 0.02, 0.17, 0, 0, 0, -1.05);
  rod(acc, Hm, [0, -0.014, 0], [0, 0.0, 0], 0.32, MADDER, 0.32, 0.04, 18); // the brim
  rod(acc, Hm, [0, 0, 0], [0, 0.14, 0], 0.15, MADDER, 0.125, 0.05, 14); // the crown
  rod(acc, Hm, [0, 0.0, 0], [0, 0.045, 0], 0.153, SAFFRON, 0.147, 0.03, 14); // the band
  ellipsoid(acc, Hm, 0, 0.14, 0, 0.125, 0.025, 0.125, MADDER_D);
  rod(acc, Hm, [0.12, 0.03, 0.08], [0.32, 0.2, 0.2], 0.012, '#e0d6c0', 0.003); // a white feather in the band
}

const yawTo = (a, b) => Math.atan2(-(b.x - a.x), -(b.z - a.z));

export function buildTraveller(ctx, gy) {
  const rng = ctx.makeRng(80401);
  const n = new THREE.Vector3();
  const deck = new Acc(rng), dk = deckKit(ctx, rng, deck);
  const bodyAcc = new Acc(rng); ctx.terrain.normalAt(T.body.x, T.body.z, n); body(ctx, rng, bodyAcc, gy, n.clone());
  const hatAcc = new Acc(rng); ctx.terrain.normalAt(T.hat.x, T.hat.z, n); hat(ctx, rng, hatAcc, gy, n.clone());
  const meshes = [finish(ctx, deck, 'threads-traveller-deck'), finish(ctx, bodyAcc, 'threads-traveller-body', { cast: true }), finish(ctx, hatAcc, 'threads-traveller-hat')];
  for (const c of dk.cols) ctx.addCollider(c);
  const ends = {
    deck: { x: T.kit.x, z: T.kit.z, y: T.deckY, lip: { x: T.edgeX, z: T.kit.z, y: T.deckY }, stand: { ...T.stand.deck, y: T.deckY + 1.72, yaw: yawTo(T.stand.deck, T.body), pitch: -1.3 } },
    body: { x: T.body.x, z: T.body.z, y: gy(T.body.x, T.body.z), stand: { ...T.stand.body, y: gy(T.stand.body.x, T.stand.body.z) + 1.72, yaw: yawTo(T.stand.body, { x: T.edgeX, z: T.kit.z }), pitch: 1.2 } },
    hat: { x: T.hat.x, z: T.hat.z, y: gy(T.hat.x, T.hat.z) },
  };
  return { meshes, ends, colliders: dk.cols.length };
}
