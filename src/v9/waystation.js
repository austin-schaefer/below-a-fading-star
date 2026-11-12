// The Drum (v9, issue #931): a waystation on the causeway, halfway from Carcanet Keep to the Cardinal Stones.
//
// A Heliarch column, ages ago, fell full length beside the road: its stump still stands on its plinth at the east end,
// its drums lie where they rolled, and its capital lies tipped on its side at the west end against the sun. The Late
// folk hollowed one drum, each a hexagon 5 m across, into a house: they plastered its open end cream, cut a horseshoe
// door in it, hung an amber lamp and an awning, built a tiled bench and keep a brazier with a kettle on it. Somebody
// counts the travellers: five-barred tallies in charcoal on the plaster beside the door, thick in the upper rows and
// thinning row by row to single strokes far apart. One cup is set out on the bench. When the visitor comes near and
// looks away, a new stroke appears at the end of the count, blacker than the rest: they have been counted.
// The story: stories/the-tally-at-the-drum.md.
//
// Draws: one mesh in the structures' stone shader (the strata kit's, shared: no new program), the new stroke as a second
// small mesh, one PointLight (the brazier, taken by the light slots), all at every tier. Colliders: the hollow drum's
// walls (you can walk in), the other drums (low ones can be climbed), the stump, the capital, the bench, the brazier.
// ?waystation=0 leaves it out.
import * as THREE from 'three';
import { makeGround, mat } from '../structures/geo.js';
import { COLORS } from '../v8/strata/parts.js';
import { hyp } from '../noise.js';

const OFF = typeof location !== 'undefined' && new URLSearchParams(location.search).get('waystation') === '0';

// The site: a line parallel to the causeway (its segment (-90, 2) to (-40, 22)), 11 m north of it. s runs east along
// the road, t north away from it. clearings.js reads DRUM for the rocks.
const U = [0.928, 0.371], N = [0.371, -0.928];
const C0 = [-59.9, 2.2];
const at = (s, t) => [C0[0] + U[0] * s + N[0] * t, C0[1] + U[1] * s + N[1] * t];
const YAW0 = Math.atan2(-U[1], U[0]); // a local +x along the road, east
export const DRUM = { a: at(-19, 0.5), b: at(16, 0.5), half: 8, x: C0[0], z: C0[1] };

const R = 2.6, AP = R * Math.sqrt(3) / 2; // the drums' circumradius and apothem: lying on a face, 4.5 m high
const H = COLORS.heliarch, L = COLORS.late;
const col = (h) => new THREE.Color(h);

// an opening (horseshoe) cut up from the floor: from the right jamb's foot over to the left's (parts.js's own)
function horseshoe(w, sp) {
  const r = w / 2, pts = [[r * 0.86, 0]], n = 16, a0 = -0.5, a1 = Math.PI + 0.5;
  for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * (a1 - a0); pts.push([Math.cos(a) * r, sp + Math.sin(a) * r]); }
  pts.push([-r * 0.86, 0]);
  return pts;
}

export async function build(ctx) {
  if (OFF) return;
  const { scene, strata } = ctx;
  const G = makeGround(ctx);
  const rng = ctx.makeRng(9310);
  const B = strata.builder();
  const ch = (M, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => M.clone().multiply(mat(x, y, z, rx, ry, rz, sx, sy, sz));
  const frame = (s, t, yaw, sink, r = 3) => { const [x, z] = at(s, t); return mat(x, G.minGround(x, z, r) - sink, z, 0, YAW0 + yaw, 0); };
  const warm = H.stone.clone().lerp(COLORS.elder.stone, 0.55), warmDark = H.dark.clone().lerp(COLORS.elder.stone, 0.35);
  const stone = (o = {}) => ({ color: warm, moss: 0.7, ...o });

  // a solid drum lying along local x, on a face (roll 0) or rolled onto an edge, its end bands proud
  function lyingDrum(M, len, roll, o = {}) {
    const Mr = ch(M, 0, AP, 0, roll, 0, 0);
    B.add(B.cyl(R, R, len, 6, 1), ch(Mr, 0, 0, 0, 0, 0, Math.PI / 2), stone({ disp: 0.05, dispScale: 0.7, ...o }));
    for (const sx of [-1, 1]) {
      B.add(B.cyl(R * 1.05, R * 1.05, 0.3, 6, 1), ch(Mr, sx * (len / 2 - 0.15), 0, 0, 0, 0, Math.PI / 2), stone({ color: warmDark, ...o }));
      // the dowel's socket in the end, where the next drum sat on it
      B.add(B.box(0.04, 0.5, 0.5), ch(Mr, sx * (len / 2 + 0.005), 0, 0, Math.PI / 4, 0, 0), { color: H.cut, moss: 0, ground: -99 });
    }
  }

  // ---------------------------------------------------------------- the fallen column
  // the stump on its plinth, east: a stepped hexagonal base and the lowest drum, broken off on a slant
  {
    const [sx0, sz0] = at(12, 4), M = frame(12, 4, 0.1, 0.4, 4.5);
    B.add(B.cyl(R * 1.6, R * 1.7, 0.7, 6, 1), ch(M, 0, 0.35, 0, 0, Math.PI / 6, 0), stone({ color: warmDark, moss: 0.8 }));
    B.add(B.cyl(R * 1.3, R * 1.35, 0.6, 6, 1), ch(M, 0, 1.0, 0, 0, Math.PI / 6, 0), stone({ moss: 0.7 }));
    B.add(B.cyl(R, R, 4.2, 6, 1), ch(M, 0, 3.4, 0, 0, Math.PI / 6, 0), stone({ disp: 0.08, dispScale: 0.6 }));
    B.add(B.cyl(R * 1.05, R * 1.05, 0.3, 6, 1), ch(M, 0, 5.5, 0, 0, Math.PI / 6, 0), stone({ color: warmDark }));
    // the second drum, broken off on a slant: a wedge of it standing on, the rest lies in the grass
    B.add(B.cyl(R * 0.98, R * 0.98, 3.2, 6, 1), ch(M, -0.5, 6.6, 0.3, 0.3, Math.PI / 6, 0.22, 0.8, 1, 0.85), stone({ disp: 0.16, dispScale: 0.9 }));
    ctx.addCollider({ x: sx0, z: sz0, r: R * 1.6, y: -50, h: 50 + G.groundAt(sx0, sz0) + 0.9 });
    ctx.addCollider({ x: sx0, z: sz0, r: R * 0.95 });
  }
  // two drums where they rolled, sunk in the turf; the west one rolled onto an edge
  const drums = [[5.2, 3.6, 0.14, 0, 0.9, 4.2], [-6.2, 3.0, -0.1, 0.38, 1.6, 4.0]];
  for (const [s, t, yaw, roll, sink, len] of drums) {
    lyingDrum(frame(s, t, yaw, sink), len, roll);
    const [x, z] = at(s, t), [ux, uz] = [Math.cos(YAW0 + yaw), -Math.sin(YAW0 + yaw)];
    ctx.addCollider({ x1: x - ux * len / 2, z1: z - uz * len / 2, x2: x + ux * len / 2, z2: z + uz * len / 2, r: R * 0.8 });
  }
  // the capital, west, tipped on its side against the sun: the echinus's bell and the hexagonal abacus on edge
  {
    const M = frame(-13.2, 1.6, 0.25, 0.9, 4);
    const Mc = ch(M, 0, R * 1.9, 0, 0, 0, Math.PI / 2 - 0.12);
    B.add(B.lathe([[R, -0.4], [R, 0], [R * 1.08, 0.3], [R * 1.4, 1.2], [R * 1.65, 1.8], [R * 1.75, 2.1], [0, 2.1]], 18), Mc, stone({ moss: 0.5 }));
    B.add(B.cyl(R * 2.0, R * 2.0, 0.9, 6, 1), ch(Mc, 0, 2.55, 0, 0, 0.2, 0), stone({ color: warmDark, disp: 0.14, dispScale: 0.6 }));
    // the abacus's face: a carved hexagon and the sign's notch, the Heliarchy's, cut into the stone the sun lights
    B.add(B.cyl(R * 1.1, R * 1.1, 0.06, 6, 1), ch(Mc, 0, 3.01, 0, 0, 0.2, 0), { color: H.carve, moss: 0.2, ground: -99 });
    B.add(B.cyl(R * 0.95, R * 0.95, 0.08, 6, 1), ch(Mc, 0, 3.02, 0, 0, 0.2, 0), stone({ moss: 0.4 }));
    const [x, z] = at(-13.2, 1.6);
    ctx.addCollider({ x, z, r: R * 1.7 });
  }

  // ---------------------------------------------------------------- the house: the hollow drum
  // turned off the line as it rolled, its open end toward the road and the keep
  const HS = 0, HT = -2.5, HYAW = -0.6, LEN = 4.4, TH = 0.42;
  const MH = frame(HS, HT, HYAW, 0.35, 3);
  const floorY = MH.elements[13];
  // the six faces, each a slab: face k's outward normal at a = -90 + 60k degrees in the end's plane (k 0, the floor)
  for (let k = 0; k < 6; k++) {
    const a = (-90 + 60 * k) * Math.PI / 180, dn = AP - TH / 2;
    B.add(B.box(LEN, TH, R + 0.04, { seg: 1.2, chip: 0.06, seed: k }), ch(MH, 0, AP + Math.sin(a) * dn, Math.cos(a) * dn, Math.PI / 2 - a, 0, 0), stone({ disp: 0.03, dispScale: 0.8, moss: k === 0 ? 0.2 : 0.6 }));
  }
  for (const sx of [-1, 1]) B.add(B.cyl(R * 1.05, R * 1.05, 0.32, 6, 1, true), ch(MH, sx * (LEN / 2 - 0.16), AP, 0, 0, 0, Math.PI / 2), stone({ color: warmDark }));
  // the back end, stone; a crack of light would be nice and is not here
  B.add(B.cyl(R - 0.1, R - 0.1, 0.3, 6, 1), ch(MH, -LEN / 2 + 0.15, AP, 0, 0, 0, Math.PI / 2), stone({ moss: 0.4 }));
  // the front: cream plaster set 0.3 m into the drum's mouth, a horseshoe door framed in a green alfiz
  const FX = LEN / 2 - 0.34; // the plaster's outer face along local x
  const Mf = ch(MH, FX - 0.12, 0, 0, 0, Math.PI / 2, 0); // the wall's frame: +z out of the face (local +x), +x across (local -z)
  {
    const r = R - 0.12, sh = new THREE.Shape(), DW = 1.3, SP = 1.7;
    const v = [[-0.5 * r, 0], [-r, AP * r / R], [-0.5 * r, 2 * AP - 0.12], [0.5 * r, 2 * AP - 0.12], [r, AP * r / R], [0.5 * r, 0]];
    sh.moveTo(v[0][0], v[0][1]); for (let i = 1; i < v.length; i++) sh.lineTo(v[i][0], v[i][1]);
    for (const [x, y] of horseshoe(DW, SP)) sh.lineTo(x, y);
    sh.lineTo(v[0][0], v[0][1]);
    B.add(B.extrude(sh, 0.24, 14), Mf, { color: L.plaster[0], moss: 0.1, ground: floorY, disp: 0.008, dispScale: 3 });
    const top = SP + DW / 2 + 0.16, fc = L.paint[0];
    for (const sx of [-1, 1]) B.add(B.box(0.1, top, 0.03), ch(Mf, sx * (DW / 2 + 0.16), top / 2, 0.13), { color: fc, moss: 0, ground: floorY });
    B.add(B.box(DW + 0.42, 0.1, 0.03), ch(Mf, 0, top, 0.13), { color: fc, moss: 0, ground: floorY });
    // a band of tiles over the alfiz, and the sign above it
    strata.parts.late.tiles(B, ch(Mf, 0, top + 0.12, 0.12), { n: 9, w: 0.2, h: 0.2, cols: [0, 3, 1, 3], rng });
    strata.parts.late.sign(B, ch(Mf, 0.05, top + 0.42, 0.12, 0, 0, 0.04), { w: 0.9, h: 0.9, rng });
    // the threshold: a worn Heliarch step
    B.add(B.box(1.7, 0.18, 0.7, { chip: 0.04 }), ch(Mf, 0, 0.33, 0.4), stone({ color: warmDark, moss: 0.3 }));
    // the lamp on a bracket, left of the door, amber
    strata.parts.late.lamp(B, ch(Mf, -1.15, 2.55, 0.12), { glass: 'amber' });
  }
  const wp = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyMatrix4(Mf); // the wall's frame to the world

  // the tally: to the right of the door, rows of five-barred gates in charcoal, thinning to strokes far apart
  const Mt = ch(Mf, 0, 0, 0.125);
  const markCol = col('#3a3036'), faded = col('#6e6058');
  const rows = [6, 6, 6, 5, 5, 4, 3, 2, 1];
  let lastX = 0, lastY = 0;
  for (let j = 0; j < rows.length; j++) {
    const y = 2.75 - j * 0.2, x0 = 0.95, gates = rows[j];
    if (j < 7) {
      for (let g = 0; g < gates; g++) {
        const gx = x0 + g * 0.21 + (rng() - 0.5) * 0.02, c = markCol.clone().lerp(faded, 0.15 + 0.5 * (1 - j / 8) * rng());
        for (let i = 0; i < 4; i++) B.add(B.box(0.014, 0.13, 0.008), ch(Mt, gx + i * 0.032, y + (rng() - 0.5) * 0.015, 0, 0, 0, (rng() - 0.5) * 0.08), { color: c, moss: 0, ground: floorY });
        B.add(B.box(0.17, 0.014, 0.008), ch(Mt, gx + 0.048, y, 0.004, 0, 0, 0.5 + (rng() - 0.5) * 0.1), { color: c, moss: 0, ground: floorY });
        lastX = gx + 4 * 0.032; lastY = y;
      }
    } else {
      // the last rows: single strokes, further and further apart
      let gx = x0;
      for (let i = 0; i < 4 - (j - 7) * 2 + 1; i++) {
        B.add(B.box(0.014, 0.13, 0.008), ch(Mt, gx, y, 0, 0, 0, (rng() - 0.5) * 0.1), { color: markCol, moss: 0, ground: floorY });
        lastX = gx; lastY = y; gx += 0.09 + i * 0.07;
      }
    }
  }
  // the charcoal stub on the ledge below, and its smudge
  B.add(B.box(0.06, 0.025, 0.025), ch(Mt, 1.35, 0.98, 0.04, 0, 0.3, 0), { color: col('#141012'), moss: 0, ground: floorY });

  // three cups on iron hooks right of the tally; a peg with none
  for (let i = 0; i < 4; i++) {
    const x = 1.05 + i * 0.26, y = 0.95 + 0.0 * i;
    B.add(B.box(0.02, 0.1, 0.12), ch(Mf, x, y + 0.04, 0.17, -0.5, 0, 0), { color: L.iron, iron: 0.8, moss: 0, ground: floorY });
    if (i === 2) continue;
    B.add(B.cyl(0.05, 0.038, 0.09, 10, 1), ch(Mf, x, y - 0.04, 0.24), { color: L.tile[[0, 2, 1, 1][i]], moss: 0, wet: 0.5, ground: floorY });
  }

  // ---------------------------------------------------------------- before the door
  // the awning on its poles, the bench along the drum's flank, the cup set out on it
  strata.parts.late.awning(B, ch(Mf, 0, 0, 0.14), { w: 3.6, d: 2.2, h: 2.9, rng });
  strata.parts.late.bench(B, ch(MH, LEN / 2 + 0.9, 0, -1.55, 0, -Math.PI / 2 + 0.05, 0), { w: 1.7, rng });
  const cupAt = ch(MH, LEN / 2 + 0.95, 0.5, -1.2, 0, 0, 0);
  B.add(B.cyl(0.05, 0.038, 0.09, 10, 1), ch(cupAt, 0, 0.045, 0), { color: L.tile[2], moss: 0, wet: 0.6, ground: floorY });
  B.add(B.cyl(0.11, 0.11, 0.012, 14, 1), ch(cupAt, 0, 0.006, 0), { color: L.gilt, moss: 0, ground: floorY });
  // the brazier: an iron bowl on three legs, coals glowing, a black kettle on it
  const Mz = ch(MH, LEN / 2 + 1.9, 0, 0.9, 0, 0.3, 0);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    B.add(B.cyl(0.018, 0.022, 0.62, 5, 1), ch(Mz, Math.cos(a) * 0.2, 0.3, Math.sin(a) * 0.2, Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25), { color: L.iron, iron: 0.9, moss: 0, ground: floorY });
  }
  B.add(B.lathe([[0.08, 0], [0.26, 0.08], [0.33, 0.2], [0.31, 0.2], [0.24, 0.1], [0.06, 0.02]], 14), ch(Mz, 0, 0.55, 0), { color: L.iron, iron: 0.9, moss: 0, ground: floorY });
  B.add(B.cyl(0.29, 0.22, 0.05, 12, 1), ch(Mz, 0, 0.72, 0), { color: col('#3a1406'), moss: 0, ground: floorY, emit: [1.0, 0.32, 0.06, 1] });
  B.add(B.lathe([[0.0, 0], [0.15, 0.01], [0.19, 0.08], [0.17, 0.18], [0.07, 0.24], [0.05, 0.27], [0, 0.27]], 12), ch(Mz, 0, 0.75, 0), { color: col('#17130f'), iron: 0.5, moss: 0, ground: floorY });
  B.add(B.cyl(0.02, 0.03, 0.2, 5, 1), ch(Mz, 0.2, 0.9, 0, 0, 0, -1.0), { color: col('#17130f'), iron: 0.5, moss: 0, ground: floorY });
  B.add(new THREE.TorusGeometry(0.12, 0.01, 4, 12, Math.PI), ch(Mz, 0, 1.02, 0), { color: L.iron, iron: 0.9, moss: 0, ground: floorY });

  // inside: a pallet with a saffron blanket, a rug, a shelf of jars against the back
  const Mi = ch(MH, 0, 0, 0);
  B.add(B.box(2.0, 0.22, 0.9, { chip: 0.03 }), ch(Mi, -0.6, TH + 0.11, 1.2), { color: L.wood, moss: 0, ground: floorY });
  B.add(B.box(1.9, 0.08, 0.95, { chip: 0.02 }), ch(Mi, -0.6, TH + 0.26, 1.2, 0, 0.04, 0.02), { color: L.cloth[0], moss: 0, ground: floorY });
  B.add(B.box(1.6, 0.02, 1.3), ch(Mi, 0.3, TH + 0.01, -0.3, 0, 0.1, 0), { color: L.cloth[2], moss: 0, ground: floorY });
  B.add(B.box(0.35, 0.05, 2.2), ch(Mi, -LEN / 2 + 0.5, 1.6, 0), { color: L.wood, moss: 0, ground: floorY });
  for (let i = 0; i < 6; i++) B.add(B.cyl(0.08, 0.1, 0.22 + rng() * 0.12, 8, 1), ch(Mi, -LEN / 2 + 0.5, 1.75, -0.9 + i * 0.36), { color: L.tile[i % 5].clone().multiplyScalar(0.8), moss: 0, wet: 0.4, ground: floorY });

  const mesh = strata.mesh(B, 'heliarch', 'waystation');
  scene.add(mesh);
  strata.place({ hand: 'late', kind: 'spolia', from: 'heliarch', name: 'the Drum, a Heliarch drum hollowed into a waystation', x: MH.elements[12], y: floorY, z: MH.elements[14] });

  // ---------------------------------------------------------------- the new stroke: you are counted
  const B2 = strata.builder();
  const nx = lastX + 0.22, ny = lastY;
  B2.add(B2.box(0.02, 0.15, 0.01), ch(Mt, nx, ny, 0.002, 0, 0, -0.06), { color: col('#120c10'), moss: 0, ground: floorY });
  const stroke = strata.mesh(B2, 'heliarch', 'waystation-stroke');
  stroke.castShadow = false; stroke.visible = false;
  scene.add(stroke);

  // ---------------------------------------------------------------- colliders: the house's walls, you may walk in
  const hx = MH.elements[12], hz = MH.elements[14], hyaw = YAW0 + HYAW;
  const ax = Math.cos(hyaw), az = -Math.sin(hyaw), bx = -az, bz = ax; // a: along the drum (out of the door), b: across
  const P = (u, v) => [hx + ax * u + bx * v, hz + az * u + bz * v];
  const wall = (p, q, r = 0.3) => ctx.addCollider({ x1: p[0], z1: p[1], x2: q[0], z2: q[1], r });
  wall(P(-LEN / 2, R - 0.3), P(LEN / 2, R - 0.3));
  wall(P(-LEN / 2, -R + 0.3), P(LEN / 2, -R + 0.3));
  wall(P(-LEN / 2 + 0.2, -R + 0.3), P(-LEN / 2 + 0.2, R - 0.3));
  wall(P(FX, R - 0.3), P(FX, 0.85), 0.25);
  wall(P(FX, -0.85), P(FX, -R + 0.3), 0.25);
  const bp = new THREE.Vector3(LEN / 2 + 0.9, 0, -1.55).applyMatrix4(MH);
  ctx.addCollider({ x1: bp.x + bx * 0.85, z1: bp.z + bz * 0.85, x2: bp.x - bx * 0.85, z2: bp.z - bz * 0.85, r: 0.28, y: floorY - 1, h: 1.5 });
  const zp = new THREE.Vector3(0, 0, 0).applyMatrix4(Mz);
  ctx.addCollider({ x: zp.x, z: zp.z, r: 0.38 });

  // ---------------------------------------------------------------- the brazier's light, warmer as the sun gutters
  const light = new THREE.PointLight(col('#ff8a3c'), 6, 11, 2);
  light.position.set(zp.x, zp.y + 1.0, zp.z);
  scene.add(light);
  const doorIn = wp(0, 1.2, -0.6);
  const look = new THREE.Vector3();
  let counted = false;
  ctx.registerUpdate((dt, t) => {
    const f = ctx.sky?.flicker?.value ?? 1;
    light.intensity = (5 + 0.8 * Math.sin(t * 7.1) + 0.5 * Math.sin(t * 13.3 + 1.2)) * (1 + 0.8 * (1 - f));
    if (counted) return;
    const p = ctx.player.pos, d = hyp(p.x - doorIn.x, p.z - doorIn.z);
    if (d > 9) return;
    // counted when near and looking away from the wall, so the stroke is found, not seen arriving
    ctx.camera.getWorldDirection(look);
    const dx = doorIn.x - p.x, dz = doorIn.z - p.z;
    if ((look.x * dx + look.z * dz) / (d || 1) < 0.1) { counted = true; stroke.visible = true; }
  }, { pos: { x: hx, z: hz }, near: 40, hz: 2 });
  ctx.waystation = { count() { counted = true; stroke.visible = true; }, house: { x: hx, z: hz }, door: doorIn, stroke };
}
