// The Lantern Halt (v9, issue #934): the causeway's waystation, halfway from Carcanet Keep to the Cardinal Stones.
//
// An Elder slab ten metres tall stands beside the road with the bare notch of the sign cut in its top, its seat for
// a disc that was never there. The Late folk made it a place to sleep: a painted ogee arch on its shoulders hangs, on
// chains, a pierced lantern-globe as big as a room in the notch where the disc should be, with a straw bed inside and
// a hatch in its side toward the road. A traveller sits in the slung seat at the foot, hauls himself up on the rope
// over the davit's pulley, steps in through the hatch and sleeps by the lamp, out of reach of whatever walks the moor.
// Tonight someone is up there, and you can see him: the hatch stands open, his head in a red nightcap lies on a pillow
// at the sill, his patchwork quilt hangs out over it, one arm and one striped-stockinged leg dangle out into the air.
// His bindle he took up with him: it leans on the slab's shoulder by his head. At the foot: the winch with its rope
// made fast, his clogs side by side, his other stocking drying on the winch, and chalk tallies on the slab, one stroke
// a night, by many hands. The globe sways on its chains, and when the sun gutters the lamp inside is turned up. The
// sleeper, his quilt and his bindle take a share of the lamp's glow (channel 1) so their colours hold against the
// lit cloth behind them.
// The story: stories/the-lantern-halt.md.
//
// Four draws: the slab (the Elder material, ctx.strata.mesh), the furniture at its foot (a stone-shader Builder), the
// globe with its chains (the same shader, its own material instance so its glow is its own, swung about the beam), and
// the travellers' tally on the face, with the act that adds the visitor's stroke (v10, src/v10/tally.js). One PointLight, inside the globe. Colliders: the slab (a capsule, uncapped), the
// winch, the bench and the fallen blocks (capped, low enough to hop onto). Deterministic: ctx.makeRng only.
// ?waystation=0 leaves it out. ctx.waystation: { site, globe, stats() }.
import * as THREE from 'three';
import { Builder, mat, makeGround } from '../structures/geo.js';
import { makeStoneMaterial } from '../structures/materials.js';
import { COLORS } from '../v8/strata/parts.js';
import { LIVERY } from '../v8/livery.js';

import { buildTally } from '../v10/tally.js';
import { WAYSTATION } from './waystation/site.js';
export { WAYSTATION };

const c = (h) => new THREE.Color(h);
const L = COLORS.late;

export async function build(ctx) {
  const url = new URL(location.href);
  if (url.searchParams.get('waystation') === '0') { ctx.waystation = { off: true }; return; }
  const t0 = performance.now();
  const W = WAYSTATION, T = ctx.terrain, rng = ctx.makeRng(934);
  const cy = Math.cos(W.yaw), sy = Math.sin(W.yaw);
  // local (x, z) -> world
  const wx = (x, z) => W.x + x * cy + z * sy, wz = (x, z) => W.z - x * sy + z * cy;
  // the ground: the lower of the heightfield and the drawn terrain mesh, so nothing hovers over a dip the mesh smooths
  const MG = makeGround(ctx);
  const gAt = (x, z) => Math.min(T.heightAt(wx(x, z), wz(x, z)), MG.groundAt(wx(x, z), wz(x, z)));
  // the slab's foot: below the lowest ground along its length, so it stands sunk in the moor
  let foot = Infinity;
  for (let i = 0; i <= 8; i++) for (const z of [-W.d / 2, W.d / 2]) foot = Math.min(foot, gAt(-W.w / 2 + (i / 8) * W.w, z));
  foot -= 0.7;
  const M0 = mat(W.x, foot, W.z, 0, W.yaw, 0);
  const at = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sY = 1, sz = 1) => M0.clone().multiply(mat(x, y, z, rx, ry, rz, sx, sY, sz));
  // a frame on the ground at local (x, z): its y is the ground there, relative to the slab's foot
  const onG = (x, z, ry = 0, rx = 0, rz = 0) => at(x, gAt(x, z) - foot, z, rx, ry, rz);
  const group = new THREE.Group(); group.name = 'waystation';
  let tris = 0;
  const count = (m) => { tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; };

  // ------------------------------------------------------------------ the slab (Elder)
  const E = ctx.strata.builder();
  ctx.strata.parts.elder.notch(E, at(0, 0, 0), { w: W.w, h: W.h, d: W.d, S: W.S });
  // two fallen courses at its foot, half buried, and a third the Late folk cut a trough into (below)
  ctx.strata.parts.elder.block(E, at(-2.6, gAt(-2.6, -2.4) - foot - 0.9, -2.5, 0, 0.3), { w: 2.6, h: 1.5, d: 1.8, seed: 3, rz: 0.12 });
  ctx.strata.parts.elder.block(E, at(3.4, gAt(3.4, -2.2) - foot - 1.1, -2.6, 0, -0.5), { w: 2.2, h: 1.6, d: 2.0, seed: 7, rx: 0.1 });
  const slab = ctx.strata.mesh(E, 'elder', 'waystation-slab');
  count(slab); group.add(slab);
  const shoulder = W.h, tanA = Math.tan((35 * Math.PI) / 180), half = W.S * tanA; // the notch's half-width at the shoulders

  // ------------------------------------------------------------------ the Late folk's work, at the foot and on the shoulders
  const stone = makeStoneMaterial(ctx); // its own instance: the globe's glow is driven here, not by strata's tick
  const B = new Builder(ctx.noise);
  const g0 = M0.elements[13];
  const late = (col, o = {}) => ({ color: col, moss: 0, ground: g0 - 2, ...o });
  const wood = L.wood, ox = L.paint[1], green = L.paint[0], iron = L.iron;
  // the ogee: two painted arches from shoulder to shoulder over the notch, meeting in a point, their feet set on
  // stones; the globe hangs from the point. The Late folk's arch, not a gallows: it bulges out, then draws in.
  const apexY = shoulder + 5.5, X0 = half + 0.35;
  const ogee = (sx, z) => new THREE.CatmullRomCurve3([
    [X0, 0], [X0 * 1.08, 1.6], [X0 * 0.92, 3.0], [X0 * 0.5, 4.0], [X0 * 0.18, 4.75], [0, 5.5],
  ].map(([x, y]) => new THREE.Vector3(sx * x, shoulder + y, z)), false, 'centripetal');
  for (const z of [-0.55, 0.55]) for (const sx of [-1, 1]) {
    B.add(new THREE.TubeGeometry(ogee(sx, z), 16, 0.13, 5, false), at(0, 0, 0), late(ox));
    B.add(new THREE.TubeGeometry(ogee(sx, z * 1.25), 16, 0.035, 4, false), at(0, -0.02, 0, 0, 0, 0, 1.04, 1, 1), late(L.paint[2])); // a saffron fillet outside it
    B.add(B.rock(0.36, 0, 1, 0.6, 1), at(sx * X0, shoulder + 0.08, z), { color: COLORS.elder.stone, moss: 0.5, ground: g0 - 2 });
  }
  // ties between the two arches, green, and the boss at the point with the hook the chains hang from
  for (const y of [1.6, 3.6]) for (const sx of [-1, 1]) B.add(B.box(0.1, 0.1, 1.25), at(sx * ogee(1, 0).getPoint(y / 5.5).x, shoulder + y, 0), late(green));
  B.add(B.box(0.42, 0.42, 1.4), at(0, apexY - 0.1, 0), late(green));
  ctx.strata.parts.late.finial(B, at(0, apexY + 0.1, 0), { h: 1.1, rng });
  // the globe's hatch faces the keep's side of the road: local (-sin HA, cos HA), a little round toward the road.
  // The globe and its hatch are measured here so the seat, the rope and the winch line up under it.
  const R = 0.488 * W.S, gcY = shoulder + 0.163 * W.S; // the sign's disc: its centre and radius in the notch
  const HA = 0.38, hdx = -Math.sin(HA), hdz = Math.cos(HA);
  const TH0 = (60 * Math.PI) / 180, TH1 = (114 * Math.PI) / 180, PH = (46 * Math.PI) / 180; // the hatch: polar band, half its width
  const sillY = gcY + R * Math.cos(TH1), sillR = R * Math.sin(TH1);
  // a beam or a rope between two local points
  const beam = (a, b, t, col, o = {}) => {
    const m = new THREE.Matrix4().lookAt(a, b, new THREE.Vector3(0, 1, 0));
    const q = new THREE.Quaternion().setFromRotationMatrix(m), len = a.distanceTo(b);
    B.add(B.box(t, t, len, { seg: 4 }), M0.clone().multiply(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1))), late(col, o));
  };
  const ropeC = c('#b09a6a');
  // the davit: a painted arm from the arch's point out over the hatch, a pulley at its end
  const dR = R + 0.35, dS = 1.75; // out from the axis, and aside, beyond the hatch's edge on the leg's side
  const pul = new THREE.Vector3(hdx * dR + hdz * dS, apexY - 0.45, hdz * dR - hdx * dS);
  beam(new THREE.Vector3(0, apexY - 0.2, 0), pul.clone().add(new THREE.Vector3(0, 0.28, 0)), 0.16, green);
  beam(new THREE.Vector3(0, apexY - 1.6, 0.2 * hdz), pul.clone().add(new THREE.Vector3(-hdx * 0.4, 0.2, -hdz * 0.4)), 0.09, ox); // its strut
  B.add(new THREE.TorusGeometry(0.2, 0.06, 6, 14), at(pul.x, pul.y, pul.z, 0, -HA + Math.PI / 2, 0), late(iron, { iron: 0.8 }));
  // the seat he hauled himself up on (a plank slung on four cords), hanging at the sill where he stepped off into the hatch
  const seat = new THREE.Vector3(pul.x - hdx * 0.1, sillY - 0.55, pul.z - hdz * 0.1);
  const sM = (x, y, z) => at(seat.x + x, seat.y + y, seat.z + z, 0, -HA, 0);
  B.add(B.box(0.8, 0.08, 0.34, { chip: 0.01 }), sM(0, 0, 0), late(L.paint[2]));
  const ring = seat.clone().add(new THREE.Vector3(0, 0.95, 0));
  for (const [ox2, oz2] of [[-0.36, -0.13], [0.36, -0.13], [-0.36, 0.13], [0.36, 0.13]]) {
    beam(seat.clone().add(new THREE.Vector3(ox2 * Math.cos(HA) + oz2 * Math.sin(HA), 0.03, -ox2 * Math.sin(HA) + oz2 * Math.cos(HA))), ring, 0.025, ropeC);
  }
  beam(ring, pul.clone().add(new THREE.Vector3(-hdz * 0.12, -0.1, hdx * 0.12)), 0.04, ropeC);
  // the hauling end, straight down from the pulley to the winch at the foot of the face
  const winch = { x: pul.x + hdz * 0.15 + hdx * 0.1, z: pul.z - hdx * 0.15 + hdz * 0.1 };
  const wy = gAt(winch.x, winch.z) - foot;
  beam(pul.clone().add(new THREE.Vector3(hdz * 0.14, -0.1, -hdx * 0.14)), new THREE.Vector3(winch.x, wy + 1.15, winch.z), 0.045, ropeC);
  // the winch: two painted cheeks on a stone sill, a drum wound with rope, a crank, a pawl; the rope's tail made fast
  const wM = (x, y, z, rx = 0, ry = 0, rz = 0) => at(winch.x + x * Math.cos(HA) + z * Math.sin(HA), wy + y, winch.z - x * Math.sin(HA) + z * Math.cos(HA), rx, ry - HA, rz);
  B.add(B.box(1.3, 0.5, 0.7, { chip: 0.04 }), wM(0, -0.1, 0), { color: COLORS.heliarch.stone, moss: 0.4, ground: g0 });
  for (const sx of [-0.5, 0.5]) B.add(B.box(0.12, 1.15, 0.5), wM(sx, 0.62, 0), late(green));
  B.add(B.cyl(0.2, 0.2, 0.9, 12, 1), wM(0, 1.0, 0, 0, 0, Math.PI / 2), late(c('#7a6a4a')));
  for (let k = 0; k < 5; k++) B.add(new THREE.TorusGeometry(0.21, 0.03, 4, 12), wM(-0.3 + k * 0.15, 1.0, 0, 0, Math.PI / 2, 0), late(ropeC));
  B.add(B.box(0.06, 0.06, 0.5), wM(0.62, 1.0, 0.22), late(iron, { iron: 0.8 }));
  B.add(B.cyl(0.04, 0.04, 0.3, 6, 1), wM(0.62, 1.0, 0.48, Math.PI / 2, 0, 0), late(L.gilt));
  // the rope's tail made fast round the cheek, and his other stocking hung over the drum to dry: red and cream bands
  for (let k = 0; k < 6; k++) B.add(B.box(0.16, 0.09, 0.05), wM(0.2 + k * 0.012, 1.05 - k * 0.1, 0.24, 0, 0, 0.1), late(k % 2 ? L.cloth[1] : L.cloth[2]));
  B.add(B.box(0.16, 0.12, 0.2), wM(0.27, 0.43, 0.32, 0.2, 0, 0.1), late(L.cloth[2]));
  // his bindle: he took it up with him, or it would be gone by morning. The staff leans on the slab's shoulder beside
  // the globe, by his head, its bundle tied to the top in a red cloth knotted over the stick; the lamp catches it
  {
    const bx = -3.3, bz = 0.95, lean = 0.5, len = 1.8;
    const tip = new THREE.Vector3(bx + Math.sin(lean) * len, shoulder + Math.cos(lean) * len, bz);
    B.add(B.cyl(0.035, 0.04, len, 6, 1), at(bx + Math.sin(lean) * len / 2, shoulder + Math.cos(lean) * len / 2, bz, 0, 0, -lean), late(c('#8a6a44'), { moss: 0.05 }));
    const bc = L.cloth[2], glow = { emit: [bc.r * 0.5, bc.g * 0.5, bc.b * 0.5, 1] };
    const bun = tip.clone().add(new THREE.Vector3(0.12, -0.36, 0));
    B.add(B.cyl(0.012, 0.012, 0.2, 4, 1), at(tip.x + 0.06, tip.y - 0.1, tip.z, 0, 0, 0.5), late(c('#b09a6a'))); // the knot's neck
    B.add(new THREE.IcosahedronGeometry(0.3, 2), at(bun.x, bun.y, bun.z).multiply(mat(0, 0, 0, 0, 0.3, 0.15, 1.05, 0.85, 0.95)), late(bc, { disp: 0.04, ...glow }));
    B.add(B.box(0.2, 0.2, 0.012), at(bun.x - 0.05, bun.y - 0.02, bun.z + 0.27, 0, 0, 0.3), late(L.cloth[0], { emit: [0.35, 0.22, 0.06, 1] })); // a saffron patch
    for (const s2 of [-1, 1]) B.add(B.cyl(0.0, 0.07, 0.26, 5, 1), at(tip.x + s2 * 0.1, tip.y + 0.02, tip.z, 0, 0, -s2 * 0.9), late(bc, glow)); // the knot's ears
    B.add(new THREE.IcosahedronGeometry(0.06, 1), at(tip.x - 0.02, tip.y - 0.01, tip.z), late(bc, glow));
  }
  // his clogs, side by side at the winch, toes to the road: painted saffron, the Late folk's upturned toe
  const clog = (x, z, ry) => {
    const y = gAt(x, z) - foot;
    const cM = (a, b2, d, rx = 0) => at(x + a * Math.cos(ry) + d * Math.sin(ry), y + b2, z - a * Math.sin(ry) + d * Math.cos(ry), rx, ry, 0);
    const cl = L.plaster[2]; // saffron, a step paler than the winch's paint so they stand off the turf
    B.add(B.box(0.17, 0.035, 0.3), cM(0, 0.018, -0.02), late(c('#3a2414'))); // the dark sole, so they read as shoes
    B.add(B.box(0.16, 0.11, 0.28, { chip: 0.02 }), cM(0, 0.09, -0.02), late(cl));
    B.add(new THREE.SphereGeometry(0.075, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), cM(0, 0.12, 0.06).multiply(mat(0, 0, 0, 0, 0, 0, 1, 0.9, 1.4)), late(cl));
    B.add(B.cyl(0.0, 0.045, 0.12, 6, 1), cM(0, 0.16, 0.21, 1.1), late(L.paint[1]));
    B.add(B.box(0.11, 0.014, 0.13), cM(0, 0.147, -0.07), late(c('#1a0e08'))); // the opening
  };
  {
    const cx = winch.x + hdx * 0.9 + hdz * 0.55, cz = winch.z + hdz * 0.9 - hdx * 0.55;
    clog(cx + hdz * 0.1, cz - hdx * 0.1, -HA + 0.06); clog(cx - hdz * 0.1, cz + hdx * 0.1, -HA - 0.04);
  }
  // the tallies: the travellers' chalk on the slab's face, and the act that adds the visitor's stroke (v10, src/v10/tally.js)
  // the strokes that were drawn here before v10 took the same draws from rng; burn them, so the bench, tiles, sign
  // and globe after this keep the shapes they had (the tally has its own stream)
  for (let row = 0; row < 5; row++) for (let grp = 0; grp < 5 - ((row * 7) % 3); grp++) {
    if (rng() < 0.2) continue;
    rng(); rng();
    for (let i = 0; i < ((row === 4 && grp === 1) ? 3 : 4); i++) rng();
  }
  const tally = buildTally(ctx, { M0, W, foot, gAt, at, B, late, group, iron });
  // the bench against the slab's face, tiled, and a cup left on it
  const bench = { x: -2.3, z: W.d / 2 + 0.35 };
  // its foot sunk below the lowest ground under it and its top 0.45 m over the highest, so no end stands in the air
  let bLo = Infinity, bHi = -Infinity;
  for (let i = 0; i <= 6; i++) for (const dz of [-0.35, 0.35]) { const g = gAt(bench.x - 1.2 + i * 0.4, bench.z + dz); bLo = Math.min(bLo, g); bHi = Math.max(bHi, g); }
  const by = bHi - foot;
  ctx.strata.parts.late.bench(B, at(bench.x, bLo - foot - 0.4, bench.z), { w: 2.4, h: bHi - bLo + 0.85, d: 0.55, rng });
  B.add(B.cyl(0.04, 0.035, 0.09, 8, 1), at(bench.x + 0.7, by + 0.53, bench.z + 0.05), late(L.tile[0], { wet: 0.4 }));
  // the trough cut into the fallen block on the south, a painted spout above it, water in it
  ctx.strata.parts.late.tiles(B, at(-2.6, gAt(-2.6, -2.4) - foot + 0.62, -1.55), { n: 10, w: 0.2, h: 0.2, rng });
  B.add(B.box(1.6, 0.04, 0.8), at(-2.6, gAt(-2.6, -2.4) - foot + 0.58, -2.45), { color: c('#14161c'), moss: 0, ground: g0 - 2, wet: 1 });
  // the sign at the roadside: a painted post with the Late sign, facing the road, so the halt is found
  const post = { x: -6.6, z: 1.6 };
  const py = gAt(post.x, post.z) - foot;
  B.add(B.cyl(0.07, 0.09, 2.5, 6, 1), at(post.x, py + 1.2, post.z, 0.03, 0, 0.04), late(ox, { moss: 0.1 }));
  ctx.strata.sign('late', B, at(post.x - 0.1, py + 1.75, post.z, 0, -Math.PI / 2, 0), { w: 0.62, h: 0.62, rng });
  ctx.strata.place({ hand: 'late', kind: 'sign', name: 'the Lantern Halt', x: wx(post.x, post.z), y: py + foot + 2, z: wz(post.x, post.z), face: [-cy, sy], mount: 'ground', foot: py + foot });
  // the arch stands on the slab's shoulder: the placement is at one of its feet, where there is stone under it
  ctx.strata.place({ hand: 'late', kind: 'spolia', from: 'elder', name: 'the Lantern Halt', x: wx(X0, 0), y: foot + shoulder + 1, z: wz(X0, 0), mount: 'top', foot: foot + shoulder });
  const furn = new THREE.Mesh(B.build(), stone.mat);
  furn.name = 'waystation-late'; furn.castShadow = true; furn.receiveShadow = true;
  count(furn); group.add(furn);

  // ------------------------------------------------------------------ the globe: a pierced lantern as big as a room
  // built round its pivot (the beam), so it swings by rotating one object
  const drop = apexY - 0.3 - gcY; // pivot (under the point's boss) to the globe's centre
  const glowMat = makeStoneMaterial(ctx);
  const Gb = new Builder(ctx.noise);
  const gl = (col, o = {}) => ({ color: col, moss: 0, ground: -50, ...o });
  // the bed and the sleeper catch the lamp: they give back a share of their own colour with its glow (channel 1), so
  // they keep their colours against the lit cloth behind them instead of going to a dark smudge
  const lit = (col, k = 1.3) => gl(col, { emit: [col.r * k, col.g * k, col.b * k, 1] });
  const O = (x, y, z) => mat(x, y - drop, z); // globe-centred
  const PHh = Math.PI / 2 - HA; // SphereGeometry's phi of the hatch's centre
  const inHatch = (phi) => { const d = Math.atan2(Math.sin(phi - PHh), Math.cos(phi - PHh)); return Math.abs(d) < PH; };
  // the lamp-skin: cloth stretched on the frame, glowing amber (channel 1: uWindow), in three pieces round the open hatch
  const skin = (r, flip, col, em) => {
    for (const [p0, pl, t0, tl, ws, hs] of [[0, Math.PI * 2, 0, TH0, 28, 6], [0, Math.PI * 2, TH1, Math.PI - TH1, 28, 7],
      [PHh + PH, Math.PI * 2 - 2 * PH, TH0, TH1 - TH0, 24, 5]]) {
      const g = new THREE.SphereGeometry(r, ws, hs, p0, pl, t0, tl);
      if (flip) g.index.array.reverse();
      Gb.add(g, O(0, 0, 0), gl(col, { emit: em }));
    }
  };
  skin(R * 0.95, false, c('#3a1a08'), [2.6, 0.95, 0.16, 1]);
  // the inside, seen through the hatch: the far wall of the same cloth from within, brighter, and the bed on its floor
  const lin = new THREE.SphereGeometry(R * 0.93, 24, 12); lin.index.array.reverse();
  Gb.add(lin, O(0, 0, 0), gl(c('#5a2a0c'), { emit: [1.5, 0.55, 0.12, 1] }));
  // the sill: a padded lip of ox-blood leather round the opening, and the hatch's door, swung out on its hinge
  const sph = (r, th, ph) => new THREE.Vector3(-r * Math.cos(ph) * Math.sin(th), r * Math.cos(th), r * Math.sin(ph) * Math.sin(th));
  const edge = (pts, t, col) => { for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1];
    const m = new THREE.Matrix4().lookAt(a, b, new THREE.Vector3(0, 1, 0)), q = new THREE.Quaternion().setFromRotationMatrix(m);
    Gb.add(Gb.box(t, t, a.distanceTo(b) + t * 0.6), new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5).add(new THREE.Vector3(0, -drop, 0)), q, new THREE.Vector3(1, 1, 1)), gl(ox, { iron: 0.2 })); } };
  const rimR = R * 0.99;
  for (const th of [TH0, TH1]) edge(Array.from({ length: 9 }, (_, i) => sph(rimR, th, PHh - PH + (i / 8) * 2 * PH)), 0.14, ox);
  for (const ph of [PHh - PH, PHh + PH]) edge(Array.from({ length: 6 }, (_, i) => sph(rimR, TH0 + (i / 5) * (TH1 - TH0), ph)), 0.14, ox);
  { // the door: a curved shell hinged on the hatch's road-side edge, swung wide; painted ox-blood, the Late crescent on it
    const door = new THREE.SphereGeometry(R * 1.0, 8, 5, PHh - PH, 2 * PH, TH0, TH1 - TH0);
    const dIn = new THREE.SphereGeometry(R * 0.985, 8, 5, PHh - PH, 2 * PH, TH0, TH1 - TH0); dIn.index.array.reverse();
    const hinge = sph(R, (TH0 + TH1) / 2, PHh + PH), swing = 1.75;
    const D = new THREE.Matrix4().makeTranslation(hinge.x, hinge.y - drop, hinge.z)
      .multiply(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 1, 0), -swing))
      .multiply(new THREE.Matrix4().makeTranslation(-hinge.x, -hinge.y, -hinge.z));
    Gb.add(door, D, gl(L.paint[1]));
    Gb.add(dIn, D, gl(L.paint[3]));
    const mid = sph(R * 1.02, (TH0 + TH1) / 2, PHh);
    Gb.add(Gb.extrude(new THREE.Shape([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => {
      const a = (i / 12) * Math.PI * 2; return new THREE.Vector2(Math.cos(a) * 0.32, Math.sin(a) * 0.32); })), 0.03, 4),
      D.clone().multiply(new THREE.Matrix4().compose(mid, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), mid.clone().normalize()), new THREE.Vector3(1, 1, 1))), gl(L.gilt));
  }
  // the bed: a straw mattress on the floor, his quilt of patches; the quilt's end spills over the sill and hangs down outside
  Gb.add(Gb.cyl(R * 0.72, R * 0.6, 0.35, 16, 1), O(0, -R * 0.62, 0), gl(c('#c8a050')));
  const hdV = new THREE.Vector3(hdx, 0, hdz), sideV = new THREE.Vector3(hdz, 0, -hdx);
  const qCols = [L.cloth[0], L.cloth[1], L.cloth[2], L.cloth[3], L.cloth[1], L.cloth[0], L.cloth[2]];
  // its path, in the hatch's plane (u: out from the axis, v: up), from inside over the sill and down
  const sv = sillY - gcY + 0.1;
  const qPath = [[0.2, -R * 0.42], [0.9, -R * 0.36], [sillR - 0.1, sv + 0.06], [sillR + 0.14, sv],
    [sillR + 0.24, sv - 0.32], [sillR + 0.22, sv - 0.7], [sillR + 0.18, sv - 1.1], [sillR + 0.16, sv - 1.5], [sillR + 0.18, sv - 1.75]];
  const qOff = -0.3; // to the left of the leg as you face it
  for (let i = 0; i < qPath.length - 1; i++) for (let j = 0; j < 3; j++) {
    const [u0, v0] = qPath[i], [u1, v1] = qPath[i + 1];
    const s0 = qOff + (j - 1) * 0.31 + Math.sin(i * 1.7 + j) * 0.03;
    const a = hdV.clone().multiplyScalar(u0).add(sideV.clone().multiplyScalar(s0)).setY(v0);
    const b = hdV.clone().multiplyScalar(u1).add(sideV.clone().multiplyScalar(s0 + (i > 3 ? 0.02 * (j - 1) : 0))).setY(v1);
    const m = new THREE.Matrix4().lookAt(a, b, sideV), q = new THREE.Quaternion().setFromRotationMatrix(m);
    Gb.add(Gb.box(0.07, 0.32, a.distanceTo(b) + 0.04), new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5).add(new THREE.Vector3(0, -drop, 0)), q, new THREE.Vector3(1, 1, 1)), lit(qCols[(i + j * 3) % qCols.length], 0.6));
  }
  // him: the quilt heaped over his body inside, and one leg out over the sill in a striped stocking, the foot hanging
  Gb.add(new THREE.IcosahedronGeometry(0.55, 1), O(0, 0, 0).multiply(new THREE.Matrix4().makeTranslation(hdx * 0.35 + hdz * 0.15, -R * 0.38, hdz * 0.35 - hdx * 0.15)).multiply(mat(0, 0, 0, 0, -HA + 0.5, 0, 1.5, 0.6, 0.85)), gl(L.cloth[2]));
  {
    const sOff = 0.55, knee = hdV.clone().multiplyScalar(sillR + 0.2).add(sideV.clone().multiplyScalar(sOff)).setY(sillY - gcY + 0.16);
    const hip = hdV.clone().multiplyScalar(0.5).add(sideV.clone().multiplyScalar(sOff * 0.5)).setY(-R * 0.4);
    const ankle = knee.clone().add(hdV.clone().multiplyScalar(0.06)).add(sideV.clone().multiplyScalar(0.05)).add(new THREE.Vector3(0, -0.78, 0));
    const limb = (a, b, r0, r1, n, cA = L.paint[3], cB = L.cloth[2]) => { for (let i = 0; i < n; i++) {
      const p = a.clone().lerp(b, i / n), q2 = a.clone().lerp(b, (i + 1) / n);
      const m = new THREE.Matrix4().lookAt(p, q2, new THREE.Vector3(0, 1, 0)), q = new THREE.Quaternion().setFromRotationMatrix(m);
      const rr = r0 + (r1 - r0) * (i + 0.5) / n;
      Gb.add(Gb.cyl(rr, rr, p.distanceTo(q2) + 0.01, 8, 1), new THREE.Matrix4().compose(p.clone().add(q2).multiplyScalar(0.5).add(new THREE.Vector3(0, -drop, 0)), q, new THREE.Vector3(1, 1, 1)).multiply(mat(0, 0, 0, Math.PI / 2, 0, 0)), lit(i % 2 ? cA : cB));
    } };
    limb(hip, knee, 0.12, 0.1, 4);
    limb(knee, ankle, 0.1, 0.07, 7);
    Gb.add(new THREE.SphereGeometry(0.11, 8, 6), O(knee.x, knee.y, knee.z), lit(L.cloth[2]));
    // his arm over the sill on the quilt's other side, limp, a turquoise sleeve and the hand hanging open
    const aOff = -1.15;
    const sh = hdV.clone().multiplyScalar(0.8).add(sideV.clone().multiplyScalar(aOff * 0.7)).setY(-R * 0.3);
    const elb = hdV.clone().multiplyScalar(sillR + 0.14).add(sideV.clone().multiplyScalar(aOff)).setY(sillY - gcY + 0.14);
    const wr = elb.clone().add(hdV.clone().multiplyScalar(0.04)).add(new THREE.Vector3(0, -0.5, 0));
    limb(sh, elb, 0.1, 0.09, 3, L.cloth[3], L.cloth[3]);
    limb(elb, wr, 0.085, 0.07, 3, L.cloth[3], L.cloth[3]);
    Gb.add(new THREE.SphereGeometry(0.09, 8, 6), O(elb.x, elb.y, elb.z), lit(L.cloth[3]));
    Gb.add(new THREE.CylinderGeometry(0.09, 0.08, 0.06, 8), O(wr.x, wr.y + 0.02, wr.z), lit(L.cloth[1])); // the cuff
    Gb.add(new THREE.SphereGeometry(0.06, 8, 6), O(wr.x, wr.y - 0.1, wr.z).multiply(mat(0, 0, 0, 0, -HA, 0, 0.75, 1.6, 0.45)), lit(c('#c89878')));
    // his head on a pillow at the sill, in a long red nightcap whose tip droops out over the edge, a gilt tassel on it
    const hOff = -0.78, pil = hdV.clone().multiplyScalar(sillR - 0.12).add(sideV.clone().multiplyScalar(hOff)).setY(sillY - gcY + 0.14);
    Gb.add(Gb.box(0.62, 0.16, 0.42, { chip: 0.04 }), O(pil.x, pil.y, pil.z).multiply(mat(0, 0, 0, 0, -HA, 0.08)), lit(L.cloth[1], 0.8));
    const head = pil.clone().add(new THREE.Vector3(0, 0.2, 0)).add(hdV.clone().multiplyScalar(0.04));
    Gb.add(new THREE.SphereGeometry(0.18, 10, 8), O(head.x, head.y, head.z).multiply(mat(0, 0, 0, 0, -HA, 0, 1, 0.95, 1.1)), lit(c('#c89878')));
    Gb.add(new THREE.SphereGeometry(0.05, 6, 5), O(head.x + hdV.x * 0.18, head.y - 0.01, head.z + hdV.z * 0.18), lit(c('#b8806a'))); // his nose
    const cap = [head.clone().add(sideV.clone().multiplyScalar(-0.06)).add(new THREE.Vector3(0, 0.07, 0)),
      head.clone().add(sideV.clone().multiplyScalar(-0.2)).add(hdV.clone().multiplyScalar(0.12)).add(new THREE.Vector3(0, 0.12, 0)),
      head.clone().add(sideV.clone().multiplyScalar(-0.3)).add(hdV.clone().multiplyScalar(0.36)).add(new THREE.Vector3(0, 0.0, 0)),
      head.clone().add(sideV.clone().multiplyScalar(-0.33)).add(hdV.clone().multiplyScalar(0.46)).add(new THREE.Vector3(0, -0.35, 0)),
      head.clone().add(sideV.clone().multiplyScalar(-0.33)).add(hdV.clone().multiplyScalar(0.46)).add(new THREE.Vector3(0, -0.62, 0))];
    const cr = [0.185, 0.13, 0.09, 0.06, 0.035];
    for (let i = 0; i < cap.length - 1; i++) limb(cap[i], cap[i + 1], cr[i], cr[i + 1], 2, L.cloth[2], L.cloth[2]);
    Gb.add(new THREE.SphereGeometry(0.185, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), O(head.x, head.y + 0.02, head.z), lit(L.cloth[2]));
    Gb.add(new THREE.IcosahedronGeometry(0.06, 1), O(cap[4].x, cap[4].y - 0.04, cap[4].z), lit(L.gilt));
    // the foot: heel down, toes out to the road, the stocking's red heel and toe
    const fM = O(ankle.x, ankle.y - 0.05, ankle.z).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2 - HA));
    Gb.add(new THREE.SphereGeometry(0.09, 8, 6), fM.clone().multiply(mat(0, 0, 0.09, -0.15, 0, 0, 1, 0.8, 2.2)), lit(L.paint[3]));
    Gb.add(new THREE.SphereGeometry(0.07, 8, 6), fM.clone().multiply(mat(0, 0.03, 0.27, 0, 0, 0, 1.1, 0.8, 1)), lit(L.cloth[2]));
    Gb.add(new THREE.SphereGeometry(0.07, 8, 6), fM.clone().multiply(mat(0, -0.02, -0.04)), lit(L.cloth[2]));
  }
  // meridians and parallels of painted iron, the pierced frame that reads black against the glow, broken at the hatch
  const run = (pts, t, col) => { if (pts.length > 1) Gb.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, t, 4, false), O(0, 0, 0), gl(col, { iron: 0.4 })); };
  const NM = 14;
  for (let k = 0; k < NM; k++) {
    const ph = (k / NM) * Math.PI * 2 + 0.11, cut = inHatch(ph);
    let pts = [];
    for (let i = 0; i <= 22; i++) {
      const th = (i / 22) * Math.PI;
      if (cut && th > TH0 - 0.03 && th < TH1 + 0.03) { run(pts, 0.05, k % 2 ? ox : c('#2a1a14')); pts = []; continue; }
      pts.push(sph(R, th, ph));
    }
    run(pts, 0.05, k % 2 ? ox : c('#2a1a14'));
  }
  for (const lat of [-62, -40, -18, 18, 40, 62]) {
    const th = Math.PI / 2 - (lat * Math.PI) / 180, cut = th > TH0 && th < TH1;
    let pts = [];
    for (let i = 0; i <= 36; i++) {
      const ph = PHh + PH + 0.02 + (i / 36) * (Math.PI * 2 - (cut ? 2 * PH + 0.04 : 0));
      pts.push(sph(R + 0.01, th, ph));
    }
    run(pts, 0.045, c('#2a1a14'));
  }
  // the equator: a band of turquoise tile with a little gallery rail, broken by the hatch
  const thH = Math.atan2(hdx, hdz);
  Gb.add(new THREE.CylinderGeometry(R + 0.06, R + 0.06, 0.34, 28, 1, true, thH + PH, Math.PI * 2 - 2 * PH), O(0, 0, 0), gl(L.tile[0], { wet: 0.3 }));
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a - thH), Math.cos(a - thH))) < PH + 0.05) continue;
    Gb.add(Gb.box(0.07, 0.07, 0.07), O(Math.sin(a) * (R + 0.09), 0.2, Math.cos(a) * (R + 0.09)), gl(L.gilt));
  }
  // the cap: an ogee dome in turquoise tile, gilt ribs, the finial with the crescent and pomegranate on its point
  const cap = [[R * 0.62, 0], [R * 0.7, 0.12], [R * 0.66, 0.4], [R * 0.48, 0.72], [R * 0.24, 1.0], [R * 0.1, 1.28], [0.06, 1.5], [0, 1.55]];
  Gb.add(Gb.lathe(cap.map(([r, y]) => [r, y]), 16), mat(0, -drop + R * 0.78, 0), gl(L.tile[0], { wet: 0.25 }));
  Gb.add(new THREE.IcosahedronGeometry(0.16, 1), mat(0, -drop + R * 0.78 + 1.55, 0), gl(L.gilt));
  // the pendant under it, gilt
  Gb.add(Gb.lathe([[0, 0], [0.12, 0.1], [0.42, 0.45], [R * 0.55, 0.62]], 14), mat(0, -drop - R - 0.42, 0), gl(L.gilt));
  // the chains: four from the beam to the cap's shoulder, links as thin boxes
  for (const [cx, cz] of [[0.55, 0.4], [-0.55, 0.4], [0.55, -0.4], [-0.55, -0.4]]) {
    const a = new THREE.Vector3(cx * 0.4, -0.16, cz * 0.25), b = new THREE.Vector3(cx * 1.15, -drop + R * 0.84, cz * 1.15);
    const n = 9;
    for (let i = 0; i < n; i++) {
      const p = a.clone().lerp(b, (i + 0.5) / n);
      Gb.add(new THREE.TorusGeometry(0.09, 0.022, 4, 8), mat(p.x, p.y, p.z, 0, (i % 2) * Math.PI / 2, 0, 1, 1.6, 1), gl(iron, { iron: 0.9 }));
    }
  }
  { // the middle chain, to the ball on the cap's point
    const top = -drop + R * 0.78 + 1.55, n = Math.max(2, Math.round(-top / 0.2));
    for (let i = 0; i < n; i++) Gb.add(new THREE.TorusGeometry(0.08, 0.02, 4, 8), mat(0, top * (i + 0.5) / n, 0, 0, (i % 2) * Math.PI / 2, 0, 1, 1.5, 1), gl(iron, { iron: 0.9 }));
  }
  const globe = new THREE.Mesh(Gb.build(), glowMat.mat);
  globe.name = 'waystation-globe'; globe.castShadow = true; globe.receiveShadow = true;
  const pivot = new THREE.Group(); pivot.name = 'waystation-pivot';
  pivot.position.set(0, apexY - 0.3, 0);
  pivot.add(globe);
  const frame = new THREE.Group(); frame.applyMatrix4(M0); frame.add(pivot);
  group.add(frame);
  count(globe);
  // the lamp: one warm light inside, a weaker one in the pendant's shadow at the foot
  const lamp = new THREE.PointLight(c('#ff9a48'), 30, 26, 2);
  lamp.position.set(0, -drop, 0); pivot.add(lamp);
  ctx.scene.add(group);
  group.updateMatrixWorld(true);

  // ------------------------------------------------------------------ colliders
  {
    const a = [wx(-W.w / 2 + 0.6, 0), wz(-W.w / 2 + 0.6, 0)], b = [wx(W.w / 2 - 0.6, 0), wz(W.w / 2 - 0.6, 0)];
    ctx.addCollider({ x1: a[0], z1: a[1], x2: b[0], z2: b[1], r: W.d / 2 + 0.2, mod: 'waystation' });
    const wg = gAt(winch.x, winch.z);
    ctx.addCollider({ x: wx(winch.x, winch.z), z: wz(winch.x, winch.z), r: 0.65, y: wg - 0.2, h: 1.35, mod: 'waystation' });
    const bA = [wx(bench.x - 1.0, bench.z), wz(bench.x - 1.0, bench.z)], bB = [wx(bench.x + 1.0, bench.z), wz(bench.x + 1.0, bench.z)];
    ctx.addCollider({ x1: bA[0], z1: bA[1], x2: bB[0], z2: bB[1], r: 0.3, y: bLo - 0.3, h: bHi - bLo + 0.77, mod: 'waystation' });
    for (const [x, z, r] of [[-2.6, -2.5, 1.2], [3.4, -2.6, 1.15]]) {
      const g = gAt(x, z);
      ctx.addCollider({ x: wx(x, z), z: wz(x, z), r, y: g - 0.5, h: 1.15, dome: 0.15, mod: 'waystation' });
    }
    ctx.addCollider({ x: wx(post.x, post.z), z: wz(post.x, post.z), r: 0.25, mod: 'waystation' });
  }

  // ------------------------------------------------------------------ the sway and the glow
  const flick = ctx.sky?.flicker || { value: 1 };
  const SP = { x: W.x, z: W.z };
  let gut = 0;
  const lampAt = new THREE.Vector3();
  ctx.registerUpdate((dt, t) => {
    const f = flick.value; // 1 in full sun, toward 0.2 in a gutter
    gut += ((f < 0.7 ? 1 : 0) - gut) * Math.min(1, dt * 1.5);
    // the sway: two slow periods, a little wider in a gutter's wind
    const amp = 0.022 + 0.02 * gut;
    pivot.rotation.z = amp * Math.sin(t * 0.83) + 0.4 * amp * Math.sin(t * 1.91 + 1.3);
    pivot.rotation.x = 0.6 * amp * Math.sin(t * 0.61 + 0.7);
    // the lamp: a steady flame with a slow breath, turned up while the sun gutters
    const fl = 0.9 + 0.06 * Math.sin(t * 2.3) + 0.04 * Math.sin(t * 7.1 + 0.4);
    const k = fl * (1 + 0.9 * gut);
    glowMat.uniforms.uWindow.value = 0.32 * k;
    glowMat.uniforms.uSTime.value = t;
    lamp.intensity = 30 * k;
  }, { pos: SP, near: 160, hz: 4 });

  const ms = Math.round(performance.now() - t0);
  const stats = () => ({ calls: 4, tris: Math.round(tris), lights: 1, ms });
  ctx.waystation = { site: W, globe: { x: W.x, y: foot + gcY, z: W.z, r: R }, foot, stats, lampAt: () => lamp.getWorldPosition(lampAt) };
  ctx.log(`waystation: ${Math.round(tris)} tris, 4 draws, ${tally.strokes()} strokes on the tally`);
}
