// The dealings (v8-06): small props that show the Heliarchy's last officers and the Late folk know each other. The
// figures' own share of it is in their files (the Leerie's ruby flask, the Coheirs' net darned with stole, the Taker's
// and the Sexton's one staff head); here are the two that stand on their own:
//
//   the slate    on the Leerie's first standard, the one nearest the Pomegranate House (SITES.leerie.from), a little
//                board in the house's saffron and pomegranate hangs on a nail, facing the causeway, chalked with the
//                Leerie's account for lamp oil: twenty-three strokes in fives, nothing crossed off
//   the peg      at the Kept Fire, between the hearth and P6, a forked stake with a spare ember stole hung over it, the
//                sign pinned to it, for the keeper who is never there; someone has sewn the Late sign onto its end
//
// One mesh each (Painter, vertex colours), casting. ?livery=0 leaves them out (and the figures' liveries). ctx.livery:
// { slate: {x, y, z}, peg: {x, y, z}, stats() }.
import * as THREE from 'three';
import { SITES } from '../../world.js';
import { LEERIE } from '../../v5/lights.js';
import { HEARTH } from '../../v5/keptfire.js';
import { Painter, paintedMaterial, makeGround } from '../../fauna/uncanny/kit.js';
import { hyp } from '../../noise.js';
import { LIVERY, stole, badge, wrongSign } from '../livery.js';

function mesh(P, name, x, y, z) {
  const mat = paintedMaterial({ side: THREE.DoubleSide });
  mat.customProgramCacheKey = () => 'v8-livery-props';
  const m = new THREE.Mesh(P.geometry(), mat);
  m.position.set(x, y, z); m.name = name; m.castShadow = true; m.receiveShadow = true;
  return m;
}

// the slate on the first standard: local frame +z out of its face (toward the causeway), +y up, origin at the nail
function slate(P) {
  // the nail and its string
  P.paint('#2a2420', 0.5, 0.6); P.loft([[0, 0, -0.06], [0, 0, 0.02]], [0.005, 0.004], 4, 0, true);
  P.paint('#8a7a5a', 0, 0.95); P.loft([[0, 0.0, 0.015], [-0.1, -0.08, 0.02]], [0.003, 0.003], 3, 0, false); P.loft([[0, 0.0, 0.015], [0.1, -0.08, 0.02]], [0.003, 0.003], 3, 0, false);
  // the board: saffron paint worn to the wood, a pomegranate-red border, the house's pomegranate at the head
  const W = 0.3, H = 0.38, top = -0.08;
  P.paint('#5a3a24', 0, 0.9); P.box(0, top - H / 2, 0.012, W + 0.03, H + 0.03, 0.022);
  P.paint(LIVERY.late.pom, 0, 0.85); P.box(0, top - H / 2, 0.025, W, H, 0.006);
  P.paint('#2a2a26', 0, 0.97); P.box(0, top - H / 2 - 0.03, 0.03, W - 0.04, H - 0.11, 0.004); // the slate ground
  P.paint(LIVERY.late.pom, 0, 0.7); P.blob(0, top - 0.04, 0.032, 0.025, 0.025, 0.012, 6, 4);
  P.paint('#3a6a2a', 0, 0.8); P.blob(0, top - 0.01, 0.032, 0.012, 0.008, 0.006, 4, 3);
  // the account: chalk strokes in fives, the fifth across; 23 of them, in rows of three fives
  P.paint('#e6e0cc', 0, 0.9, 0.15);
  const x0 = -0.11, y0 = top - 0.11, dy = 0.075, sw = 0.016, gw = 0.075;
  for (let k = 0; k < 23; k++) {
    const g = Math.floor(k / 5), r = Math.floor(g / 3), c = g % 3, i = k % 5;
    const gx = x0 + c * gw, gy = y0 - r * dy;
    const j = ((k * 37) % 7) / 7 - 0.5; // the hand's wobble
    if (i < 4) { const x = gx + i * sw; P.loft([[x, gy - 0.026, 0.034], [x + 0.006 * j, gy + 0.026, 0.034]], [0.0028, 0.0028], 3, 0, false); }
    else P.loft([[gx - 0.008, gy - 0.02, 0.035], [gx + 3 * sw + 0.008, gy + 0.018 + 0.006 * j, 0.035]], [0.0028, 0.0028], 3, 0, false);
  }
}

// the peg at the Kept Fire: a forked stake, a stole hung over the fork, the sign pinned to it. Local frame: the stake
// at the origin, +z toward the track
function peg(P) {
  P.paint('#4a3624', 0, 0.9);
  P.loft([[0, -0.15, 0], [0.01, 0.6, 0], [0, 1.25, 0.01]], [0.035, 0.03, 0.026], 6, 0, true);
  P.loft([[0, 1.2, 0.01], [-0.08, 1.38, 0.02]], [0.022, 0.016], 5, 0, true);
  P.loft([[0, 1.2, 0.01], [0.09, 1.36, 0.0]], [0.022, 0.016], 5, 0, true);
  // the stole: up the front, over the crotch of the fork, down the back; its ends a little apart
  const front = [[0.04, 0.42, 0.06], [0.03, 0.7, 0.055], [0.02, 0.98, 0.05], [0.0, 1.2, 0.04], [0.0, 1.26, 0.0]];
  const back = [[0.0, 1.26, 0.0], [0.0, 1.2, -0.04], [-0.02, 0.98, -0.05], [-0.03, 0.74, -0.055], [-0.04, 0.5, -0.06]];
  const path = [...front.reverse(), ...back.slice(1)];
  stole(P, path, { w: 0.15, out: (t, p) => [0, 0.2, p[2] >= 0 ? 1 : -1], fray: 0.06, dirt: 0.05, seed: 40 });
  badge(P, [0.0, 1.08, 0.068], [0, 1, 0], [0, 0, 1], 0.09, { th: 0.01 });
  // the Late folk have sewn their own sign near its end, wrong, as you would mend a thing you are keeping for someone
  wrongSign(P, [0.035, 0.52, 0.07], [0, 1, 0], [0, 0, 1], 0.07, { tilt: -0.2 });
}

export async function build(ctx) {
  if (!LIVERY.on) { ctx.livery = { off: true }; return; }
  const MG = makeGround(ctx), T = ctx.terrain;
  const G = (x, z) => Math.max(MG.at(x, z), T.heightAt(x, z));
  const out = { stats: () => ({ calls: 2, tris: 0 }) };
  let tris = 0;

  // ---- the slate: on the first standard (the house end), on its causeway side, at chest height
  {
    const S = SITES.leerie, [x0, z0] = S.from, [x1, z1] = S.to, len = hyp(x1 - x0, z1 - z0), ux = (x1 - x0) / len, uz = (z1 - z0) / len;
    const nx = uz, nz = -ux;
    const px = x0 + nx * LEERIE.side, pz = z0 + nz * LEERIE.side, gy = G(px, pz) - 0.12;
    const x = px - nx * 0.13, z = pz - nz * 0.13, y = gy + 1.5;
    const P = new Painter(); slate(P);
    const m = mesh(P, 'livery-slate', x, y, z);
    m.rotation.y = Math.atan2(-nx, -nz); // +z toward the causeway
    ctx.scene.add(m); tris += m.geometry.index.count / 3;
    out.slate = { x, y, z, face: [-nx, -nz] };
  }
  // ---- the peg: 2.4 m from the hearth toward P6's vertex (10, -188), clear of its colliders
  {
    const dx = 10 - HEARTH.x, dz = -188 - HEARTH.z, d = hyp(dx, dz), x = HEARTH.x + (dx / d) * 2.4 + (dz / d) * 0.6, z = HEARTH.z + (dz / d) * 2.4 - (dx / d) * 0.6;
    const P = new Painter(); peg(P);
    const m = mesh(P, 'livery-peg', x, G(x, z), z);
    m.rotation.y = Math.atan2(dx, dz) + 0.35; // its face toward the track, a little turned
    ctx.scene.add(m); tris += m.geometry.index.count / 3;
    ctx.addCollider({ x, z, r: 0.15 });
    out.peg = { x, y: G(x, z), z };
  }
  out.stats = () => ({ calls: 2, tris: Math.round(tris) });
  ctx.livery = out;
}
