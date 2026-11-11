// Thread 1, the traveller on the Span (briefs/v8/index.md): at the west lip of the first broken bay (the deck ends at
// pier -120's east face, 130 m from the west stair's head) a pair of boots set side by side with their toes at the very
// edge, a saffron cloak folded square with its hood flopped over, a pack with its flap thrown back and three things
// laid out in a row as if chosen: a tin cup, a book, and a coil of rope whose end is run out to the lip and hangs a
// forearm's length over a fall of sixty metres. Below, on the sunlit slope by P15 out past pier -70, what is left of
// him, years old: a skeleton on its back, splayed on his greatcoat flung open two metres across (saffron one side, the
// cream lining the other, a madder border), the same cloth as the cloak upstairs, bare bone feet (his boots are
// upstairs), the stick he walked with broken in two beside him and his purse burst with a few copper coins round it.
// His hat, the same cloth, hangs on a dead thorn further along P15.
// Three merged vertex-coloured meshes (deck, body, hat); one collider (the pack); nothing animated.
import * as THREE from 'three';
import { TRAVELLER as T } from './plan.js';
import { Acc, frame, local, ellipsoid, rod, boxAt, finish } from './kit.js';

const CLOTH = '#d6a032', CLOTH_D = '#a87a22', TRIM = '#8e2a22', LINING = '#e6dcbc', LEATHER = '#3a2718', CANVAS = '#6a5a3e', BONE = '#cbbfa2', BONE_D = '#a69a7c';
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
  // the cloak, folded in three and laid square beside the boots: the saffron cloth, its cream lining at the folds, the
  // madder border round its edge, the hood flopped over one side and its brass clasp on top
  const Ck = local(F, 0.62, 0, 0.62, 0, 0.08, 0);
  for (let k = 0; k < 3; k++) {
    boxAt(acc, Ck, 0.66 - k * 0.02, 0.045, 0.5 - k * 0.02, 0, 0.022 + k * 0.045, 0, k % 2 ? CLOTH_D : CLOTH, 0, 0, 0, 0.04);
    boxAt(acc, Ck, 0.012, 0.03, 0.5 - k * 0.02, 0.33 - k * 0.01, 0.022 + k * 0.045, 0, LINING, 0, 0, 0, 0.03); // the folds' lining
  }
  boxAt(acc, Ck, 0.62, 0.012, 0.04, 0, 0.14, -0.23, TRIM, 0, 0, 0, 0.03); boxAt(acc, Ck, 0.04, 0.012, 0.46, -0.31, 0.14, 0, TRIM, 0, 0, 0, 0.03);
  ellipsoid(acc, Ck, -0.05, 0.1, 0.31, 0.2, 0.08, 0.13, CLOTH, { ax: 0.6 }); // the hood, flopped over the side
  ellipsoid(acc, Ck, -0.05, 0.06, 0.38, 0.14, 0.05, 0.08, LINING, { ax: 0.9 });
  rod(acc, Ck, [0.05, 0.14, 0.05], [0.05, 0.152, 0.05], 0.035, '#b8923a', 0.035, 0.05, 10); // the clasp
  // the pack, upright, its back to the cloak; the flap thrown back over the top and down behind
  const P = local(F, 0.95, 0, -0.45, 0, -0.15, 0, 1.3);
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
function body(ctx, rng, acc, gy) {
  const B = T.body, lo = ctx.quality === 'low', n = new THREE.Vector3();
  ctx.terrain.normalAt(B.x, B.z, n);
  const top = gy(B.x, B.z), F = frame(B.x, top + 0.03, B.z, B.yaw, n);
  // a sheet of cloth on the turf, w across by l along in his frame, laid as tiles that each follow the ground
  const toW = (x, z) => [B.x + x * Math.cos(B.yaw) + z * Math.sin(B.yaw), B.z - x * Math.sin(B.yaw) + z * Math.cos(B.yaw)];
  const sheet = (cx, cz, w, l, color, rot = 0) => {
    const nx = Math.max(1, Math.round(w / 0.4)), nz = Math.max(1, Math.round(l / 0.4)), c = Math.cos(rot), sn = Math.sin(rot);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const u = -w / 2 + (i + 0.5) * w / nx, v = -l / 2 + (j + 0.5) * l / nz, lx = cx + u * c + v * sn, lz = cz - u * sn + v * c, [wx, wz] = toW(lx, lz);
      ctx.terrain.normalAt(wx, wz, n);
      boxAt(acc, frame(wx, gy(wx, wz) + 0.025, wz, B.yaw + rot, n), w / nx + 0.02, 0.012, l / nz + 0.02, 0, 0, 0, color, 0, 0, 0, 0.04);
    }
  };
  // his greatcoat, flung open as he landed: the two halves spread either side of him on the turf, one the saffron
  // cloth, one turned over to its cream lining, a madder border at the hem: two and a half metres across
  sheet(-0.75, -0.15, 1.2, 2.0, CLOTH, 0.15); sheet(0.75, -0.15, 1.2, 2.0, LINING, -0.15);
  sheet(-0.9, -1.17, 1.2, 0.1, TRIM, 0.15); sheet(0.9, -1.17, 1.2, 0.1, TRIM, -0.15);
  // the coat: chest and belly under the cloth, sunk flat; the skirts spread on the ground to the knees, the saffron hem
  ellipsoid(acc, F, 0, 0.08, 0.27, 0.21, 0.085, 0.3, CLOTH, { low: lo });
  ellipsoid(acc, F, 0, 0.05, -0.02, 0.2, 0.06, 0.16, CLOTH_D, { low: lo });
  boxAt(acc, F, 0.62, 0.018, 0.42, 0, 0.012, -0.24, CLOTH, 0, 0.12, 0);
  boxAt(acc, F, 0.64, 0.02, 0.06, 0.03, 0.014, -0.44, TRIM, 0, 0.12, 0);
  boxAt(acc, F, 0.3, 0.016, 0.3, 0.3, 0.008, -0.18, CLOTH_D, 0, -0.5, 0); // a tail flung out
  // the open collar: a dark gap with the ribs and breastbone in it
  ellipsoid(acc, F, 0, 0.12, 0.44, 0.1, 0.03, 0.08, '#2a1f1b');
  for (let k = 0; k < 4; k++) rod(acc, F, [-0.09 + 0.004 * k, 0.13, 0.4 + k * 0.035], [0.09 - 0.004 * k, 0.13, 0.41 + k * 0.035], 0.008, BONE, 0.008, 0.05, 5);
  rod(acc, F, [0, 0.14, 0.38], [0, 0.14, 0.52], 0.01, BONE);
  boxAt(acc, F, 0.2, 0.025, 0.05, 0, 0.13, 0.55, TRIM, 0, 0.3, 0); // the kerchief at his neck
  // the skull, turned toward his left, the jaw fallen a little open
  const Hd = local(F, 0.05, 0.1, 0.72, 0, 0.9, 0.25);
  ellipsoid(acc, Hd, 0, 0, 0, 0.085, 0.09, 0.105, BONE, { low: lo });
  for (const s of [-1, 1]) ellipsoid(acc, Hd, s * 0.032, 0.02, 0.085, 0.022, 0.024, 0.02, '#211c18');
  ellipsoid(acc, Hd, 0, -0.02, 0.098, 0.01, 0.018, 0.01, '#211c18');
  boxAt(acc, Hd, 0.09, 0.03, 0.06, 0, -0.08, 0.06, BONE_D, -0.35, 0, 0);
  // the arms: the right flung up past his head, the left out on the ground; sleeves to the wrist, saffron cuffs, bone hands
  const arm = (sh, el, wr, fingers) => {
    rod(acc, F, sh, el, 0.055, CLOTH, 0.05);
    rod(acc, F, el, wr, 0.05, CLOTH, 0.045);
    const c = new THREE.Vector3(...wr).sub(new THREE.Vector3(...el)).normalize();
    rod(acc, F, [wr[0] - c.x * 0.03, wr[1], wr[2] - c.z * 0.03], [wr[0] + c.x * 0.01, wr[1], wr[2] + c.z * 0.01], 0.05, TRIM);
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
  rod(acc, at(1.7, 0.6, 0.4), [-0.45, 0.02, 0], [0.4, 0.02, 0.02], 0.016, WOOD);
  rod(acc, at(2.2, -0.7, -0.9), [-0.28, 0.02, 0], [0.32, 0.02, 0], 0.016, WOOD);
  ellipsoid(acc, at(-1.6, -0.3, 0.6), 0, 0.03, 0, 0.07, 0.03, 0.05, '#4a3424');
  for (let k = 0; k < 7; k++) {
    const a = rng() * 6.28, r = 0.15 + rng() * 0.9;
    rod(acc, at(-1.6 + Math.cos(a) * r * 0.6, -0.3 + Math.sin(a) * r, 0), [0, 0.003, 0], [0, 0.007, 0], 0.012, COPPER, 0.012, 0.15, 8);
  }
  rod(acc, at(1.1, 1.6, 1.2), [-0.12, 0.01, 0], [0.1, 0.01, 0], 0.005, '#c9c0ad');
  // his letters, burst from the coat and blown in a fan downstream: pale against the bank, seen from the deck
  for (let k = 0; k < (lo ? 70 : 120); k++) {
    const a = rng() * 6.283, r = 1.4 + Math.sqrt(rng()) * 5.4;
    boxAt(acc, at(Math.sin(a) * r, Math.cos(a) * r - 0.3, rng() * 6), 0.42, 0.004, 0.54, 0, 0.004, 0, rng() < 0.3 ? '#c9bea2' : '#ddd3bb', (rng() - 0.5) * 0.15, 0, (rng() - 0.5) * 0.15, 0.06);
  }
  // and the parasol he jumped with, meaning to float: a market parasol near five metres across, saffron and cream gores, blown
  // inside out and fetched up on its rim beside him, its handle in the air. The brightest thing below the bay.
  const Pa = local(at(3.6, 1.8, 0.6), 0, 0.95, 0, 0.22, 0, 0.1, 1.6);
  for (let k = 0; k < 8; k++) {
    const gore = new THREE.CylinderGeometry(0.06, 1.55, 0.55, 2, 1, true, k * Math.PI / 4, Math.PI / 4);
    acc.add(gore, local(Pa, 0, 0, 0, Math.PI, 0, 0), k % 2 ? LINING : CLOTH, 0.05); // inside out: the cone opens upward
  }
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; rod(acc, Pa, [0, -0.27, 0], [Math.sin(a) * 1.57, 0.29, Math.cos(a) * 1.57], 0.012, '#3a2c20'); } // the ribs
  rod(acc, Pa, [0, -0.3, 0], [0, -1.35, 0], 0.02, '#3a2c20'); // the shaft
  rod(acc, Pa, [0, -1.35, 0], [0.12, -1.5, 0], 0.025, TRIM); // the crook
  return top;
}

function hat(ctx, rng, acc, gy) {
  const H = T.hat, F = frame(H.x, gy(H.x, H.z), H.z, 0.9);
  // a dead thorn by the track, the height of a man's chest, and the hat caught on its highest spur, tipped, swinging
  const TH = '#2e241c';
  rod(acc, F, [0, -0.1, 0], [0.05, 0.75, 0.02], 0.05, TH, 0.03, 0.08, 6);
  const tip = [0.08, 1.25, 0.0];
  rod(acc, F, [0.05, 0.75, 0.02], tip, 0.03, TH, 0.008, 0.08, 5);
  for (let k = 0; k < 9; k++) {
    const y0 = 0.3 + rng() * 0.6, a = rng() * 6.28, l = 0.3 + rng() * 0.35;
    const p0 = [0.03, y0, 0.01], p1 = [0.03 + Math.cos(a) * l, y0 + 0.15 + rng() * 0.3, 0.01 + Math.sin(a) * l];
    rod(acc, F, p0, p1, 0.018, TH, 0.004, 0.08, 4);
    for (let j = 0; j < 2; j++) rod(acc, F, p1, [p1[0] + (rng() - 0.5) * 0.25, p1[1] + rng() * 0.15, p1[2] + (rng() - 0.5) * 0.25], 0.006, TH, 0.002, 0.08, 3);
  }
  const Hm = local(F, tip[0] + 0.02, tip[1] - 0.1, tip[2], 0.35, 0, -0.5);
  rod(acc, Hm, [0, -0.014, 0], [0, 0.0, 0], 0.32, CLOTH, 0.32, 0.04, 18); // the brim
  rod(acc, Hm, [0, 0, 0], [0, 0.14, 0], 0.15, CLOTH, 0.125, 0.05, 14); // the crown
  rod(acc, Hm, [0, 0.0, 0], [0, 0.045, 0], 0.153, TRIM, 0.147, 0.03, 14); // the band
  ellipsoid(acc, Hm, 0, 0.14, 0, 0.125, 0.025, 0.125, CLOTH_D);
  rod(acc, Hm, [0.12, 0.03, 0.08], [0.32, 0.2, 0.2], 0.012, '#e0d6c0', 0.003); // a white feather in the band
}

const yawTo = (a, b) => Math.atan2(-(b.x - a.x), -(b.z - a.z));

export function buildTraveller(ctx, gy) {
  const rng = ctx.makeRng(80401);
  const n = new THREE.Vector3();
  const deck = new Acc(rng), dk = deckKit(ctx, rng, deck);
  const bodyAcc = new Acc(rng); const bodyTop = body(ctx, rng, bodyAcc, gy);
  const hatAcc = new Acc(rng); hat(ctx, rng, hatAcc, gy);
  const meshes = [finish(ctx, deck, 'threads-traveller-deck'), finish(ctx, bodyAcc, 'threads-traveller-body', { cast: true }), finish(ctx, hatAcc, 'threads-traveller-hat')];
  for (const c of dk.cols) ctx.addCollider(c);
  const ends = {
    deck: { x: T.kit.x, z: T.kit.z, y: T.deckY, lip: { x: T.edgeX, z: T.kit.z, y: T.deckY }, stand: { ...T.stand.deck, y: T.deckY + 1.72, yaw: yawTo(T.stand.deck, T.body), pitch: Math.atan2(gy(T.body.x, T.body.z) - T.deckY - 1.72, Math.hypot(T.body.x - T.stand.deck.x, T.body.z - T.stand.deck.z)) } },
    body: { x: T.body.x, z: T.body.z, y: gy(T.body.x, T.body.z), top: bodyTop, stand: { ...T.stand.approach, y: gy(T.stand.approach.x, T.stand.approach.z) + 1.72, yaw: yawTo(T.stand.approach, T.body), pitch: -0.05 } },
    hat: { x: T.hat.x, z: T.hat.z, y: gy(T.hat.x, T.hat.z), stand: { ...T.stand.hat, y: gy(T.stand.hat.x, T.stand.hat.z) + 1.72 } },
  };
  return { meshes, ends, colliders: dk.cols.length };
}
