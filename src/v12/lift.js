// The lift of the Galleries of Durance, ridden (v12-H4; briefs/v12/brief-v12-H4-lift.md; the owner in #4: "Perhaps
// there's a glass elevator bearing you high indeed"). The Galleries' rails (src/v5/galleries.js) come down off the
// west wall on trestles to the floor west of the Armiger's Tower; where they meet the ground stands the lower station: a
// stone plinth with a stair, an iron arch over its west end with a bell in it and a pull hanging, the counterweight's
// pit beside it. The carriage (src/v12/lift/cage.js: a cage of iron and old glass) is up the face, making its round
// past the lower tiers on its own, its lamp lit and a warder's ring of keys swinging inside, nobody in it. Ring and it
// answers with its own bell, and comes down the cliff to you, the counterweight rising out of its pit as it comes.
// Step in, throw the lever: the grilles close, it jolts, and climbs 127 m up the face for about 45 s: the floor and the
// station dropping away through the grating, the counterweight passing close on its way down, the trestles, then the
// tiers, chains and the lesser wheel; once it judders, once it slows, and once it stops for no reason and slips a hand's
// breadth before it goes on. At the top the west grille opens on a gangway to the gallery at 135 m
// (src/v12/lift/gallery.js): about 100 m of iron walkway on the cliff, the cells against the rock, the valley east, to
// the ragged end. Ride down the same way, or ring for it there. No trap: the carriage waits at a landing while the
// visitor is near; either landing's bell always brings it, whatever it is doing; a fall from the gallery lands on the
// talus inside the band corridors laid from the gallery down to the walk limit (they let a walker stand there without
// adding open floor), and walks down (or, with ?fall=1, blacks out and wakes at the keep's gate). Sounds:
// src/v12/lift-sound.js. The carriage's update runs every frame within 140 m and at 15 Hz beyond (it is seen moving
// from the floor); the gallery's only within 90 m of it.
//
// The ride is ctx.controls.carry (the look free, turned at the beats while the visitor leaves it alone; the paused card
// and the settings panel hold the carriage where it is). Three acts: 'lift-call' (the station's bell), 'lift-lever' (in
// the cage, at either landing) and 'lift-call-top' (the gallery's bell). Floors: the station's plinth and stair, the
// cage's floor wherever it rests, the gangway, the gallery: stacked, edges held (an edge onto another floor is open).
// ?lift=0 leaves it out (and src/v5/galleries.js draws the carriage in the shader as before).
// ctx.lift: { where(), heading(), cage, gal, station, call(where), ride(), jump(), tick(), S0, SG, stats(), drawn(camera) } for
// the tests and tools/lift-walk.mjs.
import * as THREE from 'three';
import { makeStoneMaterial } from '../structures/materials.js';
import { Builder } from '../structures/geo.js';
import { hyp } from '../noise.js';
import { buildCage, CAGE } from './lift/cage.js';
import { buildGallery } from './lift/gallery.js';

const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const V = { max: 5.3, slow: 2.5, acc: 1.2 };     // m/s along the rails, m/s²
const DOOR_T = 1.3;                               // s a grille takes to slide
const GAP = 0.6;                                  // the cage's back from the rails' plane at its floor
const WEIGHT_AL = 5.0;                            // the counterweight's guide, metres north of the rails' middle
const FOOT_CLEAR = 1.25;                          // the cage's floor over the ground under it, at rest at the foot
const ROUND = [118, 102, 85];                     // the carriage's round, by itself: the tiers it stops at below the gallery
const AWAY = { foot: [25, 120], top: [45, 60] };  // m and s: it leaves a landing once the visitor has been that far off that long

export async function build(ctx) {
  const G = ctx.galleries;
  if (!G || G.off || !G.geo?.lift?.foot || Q.get('lift') === '0') { ctx.lift = null; return; }
  const geo = G.geo, Lg = geo.lift, T = ctx.terrain, P = ctx.player;
  const low = ctx.quality === 'low';
  const stone = makeStoneMaterial(ctx).mat; // its own instance (nothing here glows by its glyph or window channels)
  const iron = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.45 }); // the Galleries' iron, plain
  const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const foot = V3(Lg.foot), dir = V3(Lg.dir), al = V3(Lg.al), io = V3(Lg.io), UP = new THREE.Vector3(0, 1, 0);
  const sOfY = (y) => (y - foot.y) / dir.y;
  const railAt = (s, out = new THREE.Vector3()) => out.copy(foot).addScaledVector(dir, s);
  const d2 = CAGE.D / 2, w2 = CAGE.W / 2, OUT = GAP + d2;
  const cageAt = (s, out = new THREE.Vector3()) => railAt(s, out).addScaledVector(io, OUT); // the cage's floor middle
  const group = new THREE.Group(); group.name = 'lift';
  ctx.scene.add(group);

  // ---- the gallery, and where the carriage stops: the foot (its floor FOOT_CLEAR over the ground under it), the gallery
  const gal = buildGallery(ctx, { geo, stone, iron, low });
  group.add(gal.group); // one group for the module (its draws are counted together)
  const SG = sOfY(gal.y);
  const footprint = (s) => { const c = cageAt(s); let g = -Infinity; for (const a of [-w2, 0, w2]) for (const b of [-d2, 0, d2]) g = Math.max(g, T.heightAt(c.x + al.x * a + io.x * b, c.z + al.z * a + io.z * b)); return c.y - g; };
  let S0 = 1; while (S0 < 20 && footprint(S0) < FOOT_CLEAR) S0 += 0.05;
  const C0 = cageAt(S0), floorY0 = C0.y;
  const sRound = ROUND.map(sOfY);

  // ---- the cage
  const dirL = new THREE.Vector3(dir.dot(al), dir.dot(UP), dir.dot(io));
  const cage = buildCage(ctx, { iron, low, railZ: -OUT, dirL, gap: Lg.gap });
  const basis = new THREE.Matrix4().makeBasis(al, UP, io);
  cage.group.matrixAutoUpdate = false;
  group.add(cage.group);

  // ---- the station: frame = the cage at rest at the foot (x along al, z along io, from C0)
  const toW = (x, y, z, out = new THREE.Vector3()) => out.copy(C0).addScaledVector(al, x).addScaledVector(io, z).setY(y);
  const loc = (x, z, o) => { const dx = x - o.x, dz = z - o.z; return [dx * al.x + dz * al.z, dx * io.x + dz * io.z]; };
  const PLAT = { x: 4.4, z0: d2 + 0.25, z1: d2 + 5.2, door: CAGE.DOOR / 2 - 0.06 };
  // the stair down the plinth's east face to the ground
  let nSteps = 10, rise = 0.25, tread = 0.38;
  for (let it = 0; it < 4; it++) { const p = toW(0, 0, PLAT.z1 + nSteps * tread), g = T.heightAt(p.x, p.z); nSteps = Math.max(4, Math.ceil((floorY0 - g) / 0.25)); rise = (floorY0 - g) / nSteps; }
  const STAIR = { x: 1.6, z0: PLAT.z1, z1: PLAT.z1 + nSteps * tread, n: nSteps, rise, tread };
  const stationFloor = (x, z) => {
    const ex = x - C0.x, ez = z - C0.z; if (ex * ex + ez * ez > 900) return null;
    const [lx, lz] = loc(x, z, C0);
    if (lz >= PLAT.z0 && lz <= PLAT.z1 && Math.abs(lx) <= PLAT.x) return floorY0;
    if (lz >= d2 - 0.06 && lz < PLAT.z0 && Math.abs(lx) <= PLAT.door) return floorY0; // the step to the cage's east door
    if (lz > STAIR.z0 && lz <= STAIR.z1 && Math.abs(lx) <= STAIR.x) { const i = Math.min(STAIR.n - 1, Math.floor((lz - STAIR.z0) / STAIR.tread)); return floorY0 - (i + 1) * STAIR.rise; }
    return null;
  };
  ctx.addWalkable(stationFloor, { stack: true, keep: true, name: 'lift-station' });
  // the gangway at the top, from the cage's west door at the gallery to the deck: frame = the cage at the gallery
  const CG = cageAt(SG);
  const landL = loc(gal.landing.x, gal.landing.z, CG);
  const GANG = { x: 0.8, z0: landL[1] - 0.35, z1: -OUT - 0.32 };
  const gangFloor = (x, z) => {
    const ex = x - CG.x, ez = z - CG.z; if (ex * ex + ez * ez > 64) return null;
    const [lx, lz] = loc(x, z, CG);
    return Math.abs(lx) <= GANG.x && lz >= GANG.z0 && lz <= GANG.z1 ? gal.y : null;
  };
  ctx.addWalkable(gangFloor, { stack: true, keep: true, name: 'lift-gangway' });
  ctx.addWalkable(gal.floor, { stack: true, keep: gal.keep, name: 'lift-gallery' });
  // the cage's floor, where it rests (while it moves its rider is carried); a door's sill only while that door is open
  const cc = new THREE.Vector3(); // the cage's floor middle now (with its shake)
  let moving = false;
  const doorOpen = { e: 0, w: 0 };
  const cageFloor = (x, z) => {
    if (moving) return null;
    const dx = x - cc.x, dz = z - cc.z;
    if (dx * dx + dz * dz > 16) return null;
    const lx = dx * al.x + dz * al.z, lz = dx * io.x + dz * io.z;
    if (lx >= -w2 + 0.55 && lx <= w2 - 0.12 && lz >= -d2 + 0.12 && lz <= d2 - 0.12) return cc.y;
    if (Math.abs(lx) <= PLAT.door && doorOpen.e > 0.9 && lz > 0 && lz <= d2 + 0.1) return cc.y;
    if (Math.abs(lx) <= PLAT.door && doorOpen.w > 0.9 && lz < 0 && lz >= -OUT - 0.36) return cc.y;
    return null;
  };
  ctx.addWalkable(cageFloor, { stack: true, keep: true, name: 'lift-cage' });

  // ---- the station's stone and iron (frame: x along al, z out along io from C0; y world)
  const B = new Builder(ctx.noise), Bi = new Builder(ctx.noise), Bg = new Builder(ctx.noise); // the station's stone and iron; the gangway's (135 m up, culled apart)
  const stoneC = new THREE.Color('#77706a'), darkC = new THREE.Color('#4e4a46'), ironC = new THREE.Color('#2e241c'), bronze = new THREE.Color('#7a5a2c'), ropeC = new THREE.Color('#8a7656'), woodC = new THREE.Color('#5a3e26');
  const qS = new THREE.Quaternion().setFromRotationMatrix(basis);
  const put = (g, x, y, z, o, rx = 0, ry = 0, rz = 0) => (o.iron > 0.3 ? Bi : B).add(g, new THREE.Matrix4().compose(toW(x, y, z), qS.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz))), new THREE.Vector3(1, 1, 1)), o);
  const groundMin = (x0, x1, z0, z1) => { let g = Infinity; for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 4) for (let z = z0; z <= z1 + 0.01; z += (z1 - z0) / 4) { const p = toW(x, 0, z); g = Math.min(g, T.heightAt(p.x, p.z)); } return g; };
  const gP = groundMin(-PLAT.x, PLAT.x, PLAT.z0, PLAT.z1) - 0.6;
  // the plinth: coursed blocks from below the ground to the platform, a moulded cap, a parapet north and south
  put(B.box(PLAT.x * 2, floorY0 - 0.2 - gP, PLAT.z1 - PLAT.z0 + 0.05, { chip: 0.05, seg: 1.2 }), 0, (floorY0 - 0.2 + gP) / 2, (PLAT.z0 + PLAT.z1) / 2, { color: stoneC, course: 0.55, moss: 0.5, ground: gP + 0.6 });
  put(B.box(PLAT.x * 2 + 0.3, 0.22, PLAT.z1 - PLAT.z0 + 0.35, { chip: 0.04 }), 0, floorY0 - 0.11, (PLAT.z0 + PLAT.z1) / 2, { color: darkC, course: 0, moss: 0.3, ground: gP + 0.6 });
  put(B.box(PLAT.door * 2 + 0.1, 0.2, PLAT.z0 - d2 + 0.06, { chip: 0.02 }), 0, floorY0 - 0.1, (PLAT.z0 + d2) / 2 - 0.03, { color: ironC, iron: 1, moss: 0 }); // an iron sill plate to the door
  for (const s of [-1, 1]) {
    put(B.box(0.45, 0.8, PLAT.z1 - PLAT.z0, { chip: 0.04 }), s * (PLAT.x - 0.22), floorY0 + 0.4, (PLAT.z0 + PLAT.z1) / 2, { color: stoneC, course: 0.4, moss: 0.6 });
    put(B.box((PLAT.x - STAIR.x) - 0.2, 0.8, 0.45, { chip: 0.04 }), s * (STAIR.x + (PLAT.x - STAIR.x) / 2 + 0.1), floorY0 + 0.4, PLAT.z1 - 0.22, { color: stoneC, course: 0.4, moss: 0.6 });
  }
  // the stair: a block a tread, its top the walk's
  for (let i = 0; i < STAIR.n; i++) {
    const top = floorY0 - (i + 1) * STAIR.rise, z = STAIR.z0 + (i + 0.5) * STAIR.tread;
    const gs = groundMin(-STAIR.x, STAIR.x, z - STAIR.tread / 2, z + STAIR.tread / 2) - 0.5;
    put(B.box(STAIR.x * 2, top - gs, STAIR.tread + 0.02, { chip: 0.04, seg: 2 }), 0, (top + gs) / 2, z, { color: i % 3 ? stoneC : darkC, course: 0, moss: 0.7, ground: gs + 0.5 });
  }
  // the rails' feet: two stone sleepers where they go into the ground under the cage, an iron buffer on each
  for (const s of [-1, 1]) {
    const p = railAt(0.3).addScaledVector(al, s * Lg.gap);
    const lp = loc(p.x, p.z, C0);
    put(B.box(1.2, 1.0, 1.6, { chip: 0.06 }), lp[0], T.heightAt(p.x, p.z) - 0.2, lp[1], { color: darkC, course: 0, moss: 0.8 });
    put(B.box(0.5, 0.5, 0.5), lp[0], T.heightAt(p.x, p.z) + 0.45, lp[1] + 0.4, { color: ironC, iron: 1, moss: 0 });
  }
  // under the cage at rest: a block of stone the carriage settles over, so nobody stands under it as it lands
  {
    const g0 = groundMin(-w2, w2, -d2 + 0.4, d2) - 0.8, top = floorY0 - 0.4;
    put(B.box(CAGE.W + 0.2, top - g0, CAGE.D - 0.4, { chip: 0.05, seg: 1.2 }), 0, (top + g0) / 2, 0.2, { color: darkC, course: 0.5, moss: 0.6, ground: g0 + 0.8 });
    const a = toW(-w2, 0, 0.2), b = toW(w2, 0, 0.2);
    ctx.addCollider({ x1: a.x, z1: a.z, x2: b.x, z2: b.z, r: (CAGE.D - 0.4) / 2, y: g0, h: top - g0, stand: false });
  }
  // the counterweight's pit: a kerb of four stones round a square of dark where the weight sinks
  const pitC = railAt(0).addScaledVector(al, WEIGHT_AL).addScaledVector(io, 0.3);
  const pitL = loc(pitC.x, pitC.z, C0), pitG = T.heightAt(pitC.x, pitC.z);
  for (const [dx, dz, w, d] of [[0, -1.25, 2.6, 0.5], [0, 1.25, 2.6, 0.5], [-1.15, 0, 0.5, 2.0], [1.15, 0, 0.5, 2.0]]) put(B.box(w, 0.9, d, { chip: 0.06 }), pitL[0] + dx, pitG + 0.05, pitL[1] + dz, { color: darkC, course: 0, moss: 0.8 });
  ctx.addCollider({ x: pitC.x, z: pitC.z, r: 1.45, y: pitG - 2, h: 2.5, stand: false }); // the pit and the weight in it
  for (const f of Lg.trestleFeet || []) ctx.addCollider({ x: f[0], z: f[2], r: 0.4, y: f[1] - 1, h: 80, stand: false }); // the trestles' legs
  // the arch over the platform's west end, a bell in its crown, the pull hanging by its south post
  const ARCH = { z: PLAT.z0 + 0.35, x: 2.3, h: 4.6 };
  for (const s of [-1, 1]) {
    put(B.box(0.28, ARCH.h, 0.28, { seg: 9 }), s * ARCH.x, floorY0 + ARCH.h / 2, ARCH.z, { color: ironC, iron: 1, moss: 0 });
    put(B.cyl(0.24, 0.3, 0.3, 8, 1), s * ARCH.x, floorY0 + 0.15, ARCH.z, { color: darkC, moss: 0.3 });
  }
  for (let i = 0; i < 9; i++) { // the crown: a flattened ogee of iron, built in short straight pieces
    const a0 = i / 9, a1 = (i + 1) / 9, x0 = -ARCH.x + a0 * ARCH.x * 2, x1 = -ARCH.x + a1 * ARCH.x * 2;
    const y0 = floorY0 + ARCH.h + Math.sin(a0 * Math.PI) ** 0.6 * 0.9, y1 = floorY0 + ARCH.h + Math.sin(a1 * Math.PI) ** 0.6 * 0.9;
    const l = Math.hypot(x1 - x0, y1 - y0);
    put(new THREE.BoxGeometry(l + 0.04, 0.22, 0.24), (x0 + x1) / 2, (y0 + y1) / 2, ARCH.z, { color: ironC, iron: 1, moss: 0 }, 0, 0, Math.atan2(y1 - y0, x1 - x0));
  }
  put(new THREE.SphereGeometry(0.16, 8, 6), 0, floorY0 + ARCH.h + 1.15, ARCH.z, { color: bronze, iron: 0.6, moss: 0 });
  // a rail on each side of the platform's west edge, where the cage is not
  for (const s of [-1, 1]) {
    for (let x = PLAT.door + 0.2; x <= PLAT.x - 0.3; x += 0.5) put(new THREE.BoxGeometry(0.05, 1.0, 0.05), s * x, floorY0 + 0.5, PLAT.z0 + 0.08, { color: ironC, iron: 1, moss: 0 });
    put(new THREE.BoxGeometry(PLAT.x - PLAT.door - 0.4, 0.06, 0.07), s * ((PLAT.x + PLAT.door) / 2 - 0.05), floorY0 + 1.0, PLAT.z0 + 0.08, { color: ironC, iron: 1, moss: 0 });
  }
  // the gangway at the top: iron plates on two stringers from the deck's lip to the rails, a handrail each side
  {
    const toG = (x, y, z) => CG.clone().addScaledVector(al, x).addScaledVector(io, z).setY(y);
    const putG = (g, x, y, z, o) => Bg.add(g, new THREE.Matrix4().compose(toG(x, y, z), qS, new THREE.Vector3(1, 1, 1)), o);
    const L = GANG.z1 - GANG.z0, zc = (GANG.z0 + GANG.z1) / 2, gy = gal.y;
    const n = Math.round(L / 0.6);
    for (let i = 0; i < n; i++) putG(new THREE.BoxGeometry(GANG.x * 2, 0.05, L / n - 0.03), 0, gy - 0.025, GANG.z0 + (i + 0.5) * L / n, { color: i % 4 === 1 ? new THREE.Color('#33211a') : ironC, iron: 0.4, moss: 0 });
    for (const sx of [-1, 1]) {
      putG(new THREE.BoxGeometry(0.12, 0.28, L), sx * (GANG.x - 0.06), gy - 0.19, zc, { color: ironC, iron: 0.4, moss: 0 });
      putG(new THREE.BoxGeometry(0.05, 0.05, L - 0.4), sx * (GANG.x + 0.02), gy + 1.02, zc - 0.2, { color: ironC, iron: 0.4, moss: 0 });
      for (let z = GANG.z0 + 0.1; z <= GANG.z1 - 0.3; z += 0.9) putG(new THREE.BoxGeometry(0.04, 1.02, 0.04), sx * (GANG.x + 0.02), gy + 0.51, z, { color: ironC, iron: 0.4, moss: 0 });
    }
  }
  const stationMesh = new THREE.Mesh(B.build(), stone);
  stationMesh.name = 'lift-station'; stationMesh.castShadow = true; stationMesh.receiveShadow = true;
  const stationIron = new THREE.Mesh(Bi.build(), iron);
  stationIron.name = 'lift-station-iron'; stationIron.castShadow = true; stationIron.receiveShadow = true;
  group.add(stationMesh, stationIron);
  // the station's colliders: the arch's posts
  for (const s of [-1, 1]) { const p = toW(s * ARCH.x, 0, ARCH.z); ctx.addCollider({ x: p.x, z: p.z, r: 0.25, y: floorY0, h: ARCH.h, stand: false }); }

  // the bells: one at the station's arch, one at the gallery's landing, each swung on a yoke by its pull
  const bellGeo = (() => {
    const Bb = new Builder(ctx.noise);
    Bb.add(Bb.cyl(0.17, 0.42, 0.66, 16, 3, true), new THREE.Matrix4().setPosition(0, -0.43, 0), { color: bronze, iron: 0.5, moss: 0 });
    Bb.add(Bb.cyl(0.46, 0.44, 0.06, 16, 1), new THREE.Matrix4().setPosition(0, -0.77, 0), { color: bronze, iron: 0.5, moss: 0 }); // its lip
    Bb.add(Bb.cyl(0.17, 0.17, 0.1, 14, 1), new THREE.Matrix4().setPosition(0, -0.1, 0), { color: bronze, iron: 0.5, moss: 0 });
    Bb.add(new THREE.SphereGeometry(0.08, 8, 6), new THREE.Matrix4().setPosition(0, -0.78, 0), { color: ironC, iron: 1, moss: 0 });
    Bb.add(new THREE.BoxGeometry(0.06, 0.06, 0.9), new THREE.Matrix4().setPosition(0, -0.04, 0), { color: woodC, moss: 0 }); // the yoke
    Bb.add(new THREE.BoxGeometry(0.05, 0.05, 1.45), new THREE.Matrix4().setPosition(0, -0.04, 1.1), { color: ironC, iron: 1, moss: 0 }); // the lever arm the pull hangs from
    return Bb.build();
  })();
  const bells = {};
  const makeBell = (key, pos, quat, cordLen) => {
    const pivot = new THREE.Group(); pivot.position.copy(pos); pivot.quaternion.copy(quat);
    const m = new THREE.Mesh(bellGeo, iron); m.castShadow = true; pivot.add(m);
    // the pull: a rope from the arm and a turned wooden handle, one draw, hung from its top and moved down as it is pulled
    const Bp = new Builder(ctx.noise);
    Bp.add(new THREE.CylinderGeometry(0.02, 0.02, cordLen, 5, 1), new THREE.Matrix4().setPosition(0, -cordLen / 2, 0), { color: ropeC, moss: 0 });
    Bp.add(new THREE.CylinderGeometry(0.04, 0.045, 0.26, 8), new THREE.Matrix4().setPosition(0, -cordLen - 0.1, 0), { color: new THREE.Color('#c8a878'), moss: 0 });
    Bp.add(new THREE.TorusGeometry(0.05, 0.012, 4, 10), new THREE.Matrix4().setPosition(0, -cordLen + 0.05, 0), { color: ropeC, moss: 0 });
    const cord = new THREE.Mesh(Bp.build(), iron); cord.castShadow = true;
    group.add(pivot, cord);
    const b = bells[key] = { pivot, cord, len: cordLen, swing: -1, arm: new THREE.Vector3(0, -0.04, 1.8), handleAt: new THREE.Vector3() };
    bellList.push(b);
    placeCord(b, 0);
    return b;
  };
  const tmpA = new THREE.Vector3(), bellList = [];
  function placeCord(b, pull) {
    b.pivot.updateMatrixWorld();
    tmpA.copy(b.arm).applyMatrix4(b.pivot.matrixWorld);
    if (b.top === undefined) b.top = tmpA.clone(); // where it hangs from at rest; the swing does not carry the rope
    b.cord.position.copy(b.top); b.cord.position.y -= pull;
    b.handleAt.copy(b.top); b.handleAt.y -= b.len + 0.1;
  }
  const bellQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(io, UP, al.clone().negate())); // the yoke along al, its arm south
  makeBell('foot', toW(0, floorY0 + ARCH.h + 0.62, ARCH.z), bellQ, ARCH.h + 0.62 - 0.04 - 1.25);
  // the gallery's bell: hung from a little iron gallows on the deck north of the gangway, its pull beside it
  {
    const foot2 = new THREE.Vector3(gal.landing.x, gal.y, gal.landing.z).addScaledVector(al, 0.9).addScaledVector(io, -3.9);
    const tb = Bg;
    const q = (x, y, z) => foot2.clone().addScaledVector(io, x).addScaledVector(al, z).add(new THREE.Vector3(0, y, 0));
    tb.add(new THREE.BoxGeometry(0.12, 3.9, 0.12), new THREE.Matrix4().compose(q(-0.4, 1.95, 0), qS, new THREE.Vector3(1, 1, 1)), { color: ironC, iron: 1, moss: 0 });
    tb.add(new THREE.BoxGeometry(0.6, 0.1, 0.1), new THREE.Matrix4().compose(q(-0.15, 3.85, 0), qS, new THREE.Vector3(1, 1, 1)), { color: ironC, iron: 1, moss: 0 });
    tb.add(new THREE.BoxGeometry(0.06, 0.6, 0.06), new THREE.Matrix4().compose(q(-0.35, 3.5, 0), qS.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.8))), new THREE.Vector3(1, 1, 1)), { color: ironC, iron: 1, moss: 0 });
    const pp = q(-0.4, 0, 0); ctx.addCollider({ x: pp.x, z: pp.z, r: 0.12, y: gal.y, h: 4, stand: false });
    const topQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(io.clone().negate(), UP, al)); // its arm north
    makeBell('top', q(0, 3.75, 0), topQ, 3.75 - 0.04 - 1.25);
    bells.top.q = topQ;
  }

  const gangMesh = new THREE.Mesh(Bg.build(), iron);
  gangMesh.name = 'lift-gangway'; gangMesh.castShadow = true; gangMesh.receiveShadow = true;
  group.add(gangMesh);

  // ---- the counterweight: a block of iron on its own guide north of the rails, the sun-in-the-notch cast on its face;
  // it hangs from the other end of the cable, so it rises as the carriage comes down
  const wDir = dir.clone(), wN = new THREE.Vector3().crossVectors(al, wDir).normalize(); // out of the rails' plane, up and out
  const weight = (() => {
    const Bw = new Builder(ctx.noise);
    const ir = (c = ironC) => ({ color: c, iron: 1, moss: 0, ground: -5 });
    Bw.add(Bw.box(1.5, 2.8, 0.9, { chip: 0.06, seg: 9 }), new THREE.Matrix4().setPosition(0, -1.6, 0), ir());
    for (const y of [-0.35, -2.85]) Bw.add(Bw.box(1.6, 0.14, 1.0), new THREE.Matrix4().setPosition(0, y, 0), ir(new THREE.Color('#1a1410')));
    const notch = new THREE.Shape(); notch.moveTo(-0.5, 0.4); notch.lineTo(0, -0.3); notch.lineTo(0.5, 0.4); notch.lineTo(0.38, 0.4); notch.lineTo(0, -0.12); notch.lineTo(-0.38, 0.4); notch.closePath();
    Bw.add(new THREE.ExtrudeGeometry(notch, { depth: 0.06, bevelEnabled: false }), new THREE.Matrix4().setPosition(0, -1.5, 0.45), ir(bronze));
    Bw.add(new THREE.SphereGeometry(0.2, 12, 8), new THREE.Matrix4().compose(new THREE.Vector3(0, -1.22, 0.48), new THREE.Quaternion(), new THREE.Vector3(1, 1, 0.35)), ir(bronze));
    Bw.add(new THREE.TorusGeometry(0.16, 0.05, 6, 12), new THREE.Matrix4().setPosition(0, 0.05, 0), ir());
    const m = new THREE.Mesh(Bw.build(), iron); m.name = 'lift-counterweight'; m.castShadow = true; m.matrixAutoUpdate = false;
    return m;
  })();
  group.add(weight);
  const wBasis = new THREE.Matrix4().makeBasis(al, wDir, wN);
  // the head: two sheaves on one axle at the rails' top, the carriage's cable over one, the weight's over the other
  const headP = railAt(Lg.runLen * (1 - Lg.uF) - 0.0); // the rails' top (u = 1)
  const head = (() => {
    const Bh = new Builder(ctx.noise);
    for (const x of [0, WEIGHT_AL]) {
      Bh.add(Bh.cyl(1.1, 1.1, 0.24, 18, 1), new THREE.Matrix4().compose(new THREE.Vector3(x, 0, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), new THREE.Vector3(1, 1, 1)), { color: ironC, iron: 1, moss: 0 });
      for (let i = 0; i < 6; i++) Bh.add(new THREE.BoxGeometry(0.1, 2.0, 0.1), new THREE.Matrix4().compose(new THREE.Vector3(x + 0.16, 0, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler((i / 6) * Math.PI, 0, 0)), new THREE.Vector3(1, 1, 1)), { color: ironC, iron: 1, moss: 0 });
    }
    Bh.add(Bh.cyl(0.14, 0.14, WEIGHT_AL + 1.2, 8, 1), new THREE.Matrix4().compose(new THREE.Vector3(WEIGHT_AL / 2, 0, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), new THREE.Vector3(1, 1, 1)), { color: ironC, iron: 1, moss: 0 });
    const m = new THREE.Mesh(Bh.build(), iron); m.name = 'lift-head';
    return m;
  })();
  const headAt = headP.clone().addScaledVector(io, 0.42).add(new THREE.Vector3(0, 1.1, 0));
  const headC = headAt.clone().addScaledVector(io, 1.0).add(new THREE.Vector3(0, 0.3, 0)), headW = headC.clone().addScaledVector(al, WEIGHT_AL);
  head.position.copy(headAt); head.quaternion.setFromRotationMatrix(basis);
  group.add(head);
  // the cables: the carriage's from its yoke to the head, the weight's from the head to its ring (one instanced draw)
  const cableG = new THREE.CylinderGeometry(0.035, 0.035, 1, 5, 1); cableG.translate(0, 0.5, 0);
  const cables = new THREE.InstancedMesh(cableG, new THREE.MeshStandardMaterial({ color: '#2a241e', roughness: 0.6, metalness: 0.5 }), 2);
  cables.name = 'lift-cables'; cables.frustumCulled = false;
  group.add(cables);

  // ---- the motion: s along the rails (0 at the rails' foot), its speed, a queue of steps, the jolts
  let runT = 0, s = SG, v = 0, seq = [], cur = null, shake = 0, shakeT = 9, nextJudder = 6, callTo = null;
  let ridden = false, release = null, rideEnd = null, took = false, rideT = 0, rideDir = 0, idleFoot = 0, idleTop = 0, roamWait = 50;
  const rng = ctx.makeRng(1207);
  const off = new THREE.Vector3(); // the rider's eye from the cage's floor middle
  const lookV = { yaw: 0, pitch: 0, rate: 0 };
  let keysA = 0, keysV = 0, keysB = 0, keysVB = 0, lastV = 0, leverT = -1;
  const go = (to, o = {}) => seq.push({ k: 'move', to, lo: o.slow ? Math.min(...o.slow) : 0, hi: o.slow ? Math.max(...o.slow) : -1 });
  const wait = (sec, f) => seq.push({ k: 'wait', sec, f });
  const door = (which, open) => seq.push({ k: 'door', which, open });
  const fn = (f) => seq.push({ k: 'fn', f });
  const jolt = (a = 0.05) => { shake = a; shakeT = 0; ctx.audio?.cue('act-lift-clank', cageAt(s), { amp: a }); };
  const where = () => (Math.abs(s - S0) < 0.05 && !moving ? 'foot' : Math.abs(s - SG) < 0.05 && !moving ? 'gallery' : null);
  const heading = () => { const q = [cur, ...seq].filter((x) => x && x.k === 'move').pop(); return q ? q.to : null; };
  // the round it makes by itself: down past the lower tiers, a stop at each, and back to the gallery
  function round() {
    callTo = null;
    door('w', false);
    for (const sr of sRound) { go(sr); wait(9 + rng() * 6); }
    go(SG); door('w', true);
  }
  function call(to) {
    callTo = to;
    seq = []; // whatever it was doing next is dropped: it finishes the step it is in, if that is a move it is turned
    if (cur && cur.k === 'move') cur.to = to; else if (cur && cur.k === 'wait') cur = null;
    const here = to === S0 ? 'e' : 'w', there = to === S0 ? 'w' : 'e';
    if (doorOpen[there] > 0) door(there, false);
    fn(() => ctx.audio?.cue('act-lift-answer', cageAt(s).add(new THREE.Vector3(0, CAGE.H + 0.6, 0))));
    wait(1.4);
    go(to);
    door(here, true);
    if (to === S0) idleFoot = 0; else idleTop = 0;
  }
  // the ride: the lever thrown, the grilles shut, a jolt, up (or down) with a slow stretch, a judder and a stop
  function ride() {
    const up = where() === 'foot';
    const to = up ? SG : S0;
    ridden = true; took = false; rideT = 0; rideDir = up ? 1 : -1; callTo = to;
    off.copy(P.pos).sub(cc);
    let lx = off.x * al.x + off.z * al.z, lz = off.x * io.x + off.z * io.z;
    lx = Math.max(-w2 + 0.6, Math.min(w2 - 0.45, lx)); lz = Math.max(-d2 + 0.45, Math.min(d2 - 0.45, lz));
    off.copy(al).multiplyScalar(lx).addScaledVector(io, lz).setY(P.pos.y - cc.y);
    release = ctx.controls.carry(carrier);
    leverT = 0;
    seq = [];
    ctx.audio?.cue('act-lift-lever', leverWorld());
    wait(0.35);
    door(up ? 'e' : 'w', false);
    fn(() => { jolt(0.07); ctx.audio?.cue('act-lift-answer', cageAt(s).add(new THREE.Vector3(0, CAGE.H + 0.6, 0))); });
    wait(0.7);
    if (up) {
      const sStop = sOfY(92);
      go(sStop, { slow: [sOfY(38), sOfY(52)] });
      wait(1.4); fn(() => ctx.audio?.cue('act-lift-creak', cageAt(s))); wait(2.6); // the stop: silence, then the iron groans
      fn(() => { jolt(0.09); s -= 0.14; }); wait(0.9);
      go(to);
    } else go(to, { slow: [sOfY(52), sOfY(38)] });
    door(up ? 'w' : 'e', true);
    fn(() => { if (release) { release(); release = null; P.vel.set(0, 0, 0); P.vy = 0; } ridden = false; rideEnd?.(); rideEnd = null; });
    return new Promise((res) => { rideEnd = res; });
  }
  const yawTo = (x, z) => Math.atan2(-(x - P.pos.x), -(z - P.pos.z));
  const carrier = {
    step(pos) { pos.copy(cc).add(off); },
    drop() { release = null; ridden = false; rideEnd?.(); rideEnd = null; }, // a teleport: the carriage goes on to its landing and waits
    look(dt, quiet) {
      if (quiet < 0.05 && rideT > 0.4) took = true;
      const crossing = Math.abs(s - (SG - s)) < 16 && rideDir > 0 && moving;
      const arriving = rideDir > 0 ? s > SG - 9 : s < S0 + 7;
      const tiers = rideDir > 0 && s > SG - 40 && !arriving; // the tiers, the chains and the lesser wheel going by, to the north
      const beat = crossing || arriving;
      if (took ? !(quiet > 3 && beat) : quiet < 0.3) return null;
      const px = P.pos.x, pz = P.pos.z;
      if (arriving && rideDir > 0) { lookV.yaw = yawTo(gal.landing.x, gal.landing.z); lookV.pitch = 0.02; lookV.rate = 1.6; return lookV; }
      if (arriving) { lookV.yaw = yawTo(px + io.x, pz + io.z); lookV.pitch = -0.12; lookV.rate = 1.4; return lookV; }
      if (crossing) { // the counterweight going down past them, close on the north side
        const w = railAt(SG - s, _lk).addScaledVector(al, WEIGHT_AL);
        lookV.yaw = yawTo(w.x, w.z); lookV.pitch = Math.atan2(w.y - 1.5 - P.pos.y, hyp(w.x - px, w.z - pz)); lookV.rate = 1.2; return lookV;
      }
      if (tiers) { lookV.yaw = yawTo(px + al.x * 10 - io.x * 2.5, pz + al.z * 10 - io.z * 2.5); lookV.pitch = 0.12; lookV.rate = 0.7; return lookV; }
      // out over the valley through the glass beside the door, looking down a little more the higher they go; at the
      // stop, down past their feet
      const stopped = !moving && rideT > 3 && rideDir > 0;
      lookV.yaw = yawTo(px + io.x * 10 - al.x * 6.5, pz + io.z * 10 - al.z * 6.5);
      lookV.pitch = stopped ? -0.62 : rideDir > 0 ? -0.18 - 0.2 * Math.min(1, (s - S0) / (SG - S0)) : -0.25;
      lookV.rate = rideT < 2 ? 0.6 : 0.9;
      return lookV;
    },
  };

  // where the lever is (in the world), for its act
  const leverAt = { x: 0, y: 0, z: 0 };
  const _lv = new THREE.Vector3(), _lk = new THREE.Vector3();
  function leverWorld() { return _lv.copy(cage.leverAt).applyMatrix4(cage.group.matrix); }
  const inCage = () => {
    const dx = P.pos.x - cc.x, dz = P.pos.z - cc.z, lx = dx * al.x + dz * al.z, lz = dx * io.x + dz * io.z;
    return Math.abs(lx) < w2 && Math.abs(lz) < d2 && Math.abs(P.pos.y - P.eye - cc.y) < 0.4;
  };

  // the paused card, the settings panel, the title: the carriage holds where it is
  const card = typeof document !== 'undefined' ? document.getElementById('card') : null;
  const open = () => P.enabled && !ctx.settings?.shown && (!card || card.classList.contains('hidden'));
  const _c = new THREE.Vector3(), _w = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1);
  const _y = new THREE.Vector3(), _d = new THREE.Vector3(), XA = new THREE.Vector3(1, 0, 0);

  function step(dt) {
    if (!cur) cur = seq.shift() || null;
    if (!cur) return;
    if (cur.k === 'wait') { cur.t = (cur.t || 0) + dt; if (cur.f && !cur.fired) { cur.fired = true; cur.f(); } if (cur.t >= cur.sec) cur = null; return; }
    if (cur.k === 'fn') { cur.f(); cur = null; return; }
    if (cur.k === 'door') {
      const k = cur.which, to = cur.open ? 1 : 0;
      if (!cur.started) { cur.started = true; if (doorOpen[k] !== to) ctx.audio?.cue('act-lift-door', cageAt(s), { open: cur.open }); }
      doorOpen[k] += Math.sign(to - doorOpen[k]) * Math.min(Math.abs(to - doorOpen[k]), dt / DOOR_T);
      if (doorOpen[k] === to) cur = null;
      return;
    }
    if (cur.k === 'move') {
      if (!cur.started) { cur.started = true; moving = true; jolt(0.04); }
      const d = cur.to - s, sg = Math.sign(d);
      let vmax = V.max;
      if (s > cur.lo && s < cur.hi) vmax = V.slow;
      const want = sg * Math.min(vmax, Math.sqrt(2 * V.acc * 0.9 * Math.abs(d)));
      v += Math.sign(want - v) * Math.min(Math.abs(want - v), V.acc * dt);
      s += v * dt;
      if ((sg > 0 && s >= cur.to) || (sg < 0 && s <= cur.to) || (Math.abs(d) < 0.01)) { s = cur.to; v = 0; moving = false; jolt(0.05); cur = null; }
      // its running, cued again every 1.2 s where it is, so the sound travels with it
      if (moving && (runT -= dt) <= 0) { runT = 1.2; if (Math.abs(v) > 0.3) ctx.audio?.cue('act-lift-run', cageAt(s), { speed: Math.abs(v) }); }
      // a judder now and then on the way
      if (moving && (nextJudder -= dt) < 0) { nextJudder = 4 + rng() * 6; jolt(0.025 + rng() * 0.02); }
    }
  }

  function place(dt, tt) {
    // the shake: a damped rattle, mostly up and down, a little along the face
    shakeT += dt;
    const sh = shake * Math.exp(-shakeT / 0.35) * Math.sin(shakeT * 2 * Math.PI * 7.5);
    const sh2 = shake * 0.5 * Math.exp(-shakeT / 0.35) * Math.sin(shakeT * 2 * Math.PI * 5.3 + 1);
    cageAt(s, _c); _c.y += sh; _c.addScaledVector(al, sh2);
    cc.copy(_c);
    _m.copy(basis).setPosition(_c);
    cage.group.matrix.copy(_m); cage.group.matrixWorldNeedsUpdate = true;
    // the doors slide north along their walls; the sill folds down onto the gangway as the west one opens
    const PU = cage.PU;
    PU.uDoor.value.set(doorOpen.e * (CAGE.DOOR * 0.98), doorOpen.w * (CAGE.DOOR * 0.98));
    PU.uSill.value = (1 - Math.min(1, doorOpen.w * 1.3)) * Math.PI / 2;
    // the lever thrown back and settling
    if (leverT >= 0) { leverT += dt; const k = Math.min(1, leverT / 0.35); PU.uLever.value = 0.45 - 0.9 * k + (leverT > 2.5 ? 0.9 * Math.min(1, (leverT - 2.5) / 1.2) : 0); if (leverT > 3.8) leverT = -1; }
    // the keys swing: a pendulum kicked by the cage's acceleration and its jolts
    const acc = (v - lastV) / Math.max(dt, 1e-3); lastV = v;
    keysV += (-36 * keysA - 1.4 * keysV + acc * 1.1 + sh * 40) * dt; keysA += keysV * dt;
    keysVB += (-36 * keysB - 1.4 * keysVB + sh2 * 50) * dt; keysB += keysVB * dt;
    PU.uKeys.value.set(keysA * 0.9, keysB);
    // the lamp is lit by its own oil (it does not answer the sun's gutter); it flickers when the cage is jolted
    cage.light.intensity = 3.2 * (1 - Math.min(0.6, Math.abs(sh) * 8));
    cage.haloU.uScale.value = ctx.renderer.domElement.height / (2 * Math.tan((ctx.camera.fov * Math.PI / 180) / 2));
    // the counterweight, the cables, the head turning with the cable run
    const sw = SG - s;
    railAt(sw, _w).addScaledVector(al, WEIGHT_AL).addScaledVector(io, 0.75);
    weight.matrix.copy(wBasis).setPosition(_w); weight.matrixWorldNeedsUpdate = true;
    _y.copy(_c).addScaledVector(al, cage.yokeL.x).addScaledVector(io, cage.yokeL.z); _y.y += cage.yokeL.y;
    setCable(0, _y, headC);
    _d.copy(_w).addScaledVector(wDir, 0.05);
    setCable(1, _d, headW);
    head.quaternion.copy(qS).multiply(_q.setFromAxisAngle(XA, -s / 1.1));
    // the bells' swing
    for (const b of bellList) {
      if (b.swing < 0) continue;
      b.swing += dt;
      const a = Math.exp(-b.swing / 1.6) * Math.sin(b.swing * 2 * Math.PI * 0.9) * 0.6;
      b.pivot.quaternion.copy(b.q || bellQ).multiply(_q.setFromAxisAngle(XA, a));
      placeCord(b, b.swing < 0.4 ? Math.sin(b.swing / 0.4 * Math.PI) * 0.3 : 0);
      if (b.swing > 8) { b.swing = -1; b.pivot.quaternion.copy(b.q || bellQ); placeCord(b, 0); }
    }
    // the lever's act stands where the lever is
    const lw = leverWorld(); leverAt.x = lw.x; leverAt.y = lw.y; leverAt.z = lw.z;
  }
  const _cm = new THREE.Matrix4(), _cq = new THREE.Quaternion(), _cd = new THREE.Vector3();
  function setCable(i, a, b) {
    const d = _cd.copy(b).sub(a), l = d.length();
    _cq.setFromUnitVectors(UP, d.divideScalar(l || 1));
    _cm.compose(a, _cq, _s.set(1, l, 1)); cables.setMatrixAt(i, _cm); _s.set(1, 1, 1);
    cables.instanceMatrix.needsUpdate = true;
  }
  function ring(key) {
    const b = bells[key]; b.swing = 0;
    ctx.audio?.cue('act-lift-bell', b.pivot.position);
  }

  // ---- the acts
  const footCord = bells.foot.handleAt, topCord = bells.top.handleAt;
  const callFoot = ctx.acts?.add({
    id: 'lift-call', at: { x: footCord.x, y: footCord.y + 0.2, z: footCord.z }, reach: 2.4, rise: 2.4, face: { x: io.x, z: io.z },
    words: 'Ring for the carriage', every: 'free',
    when: () => !ridden && where() !== 'foot' && callTo !== S0 && !(pendingCall && pendingCall.to === S0),
    do() { ring('foot'); callAfter(S0, 1.2); return 2.4; },
  });
  const callTop = ctx.acts?.add({
    id: 'lift-call-top', at: { x: topCord.x, y: topCord.y + 0.2, z: topCord.z }, reach: 2.4, rise: 2.4, face: { x: -io.x, z: -io.z },
    words: 'Ring for the carriage', every: 'free',
    when: () => !ridden && where() !== 'gallery' && callTo !== SG && !(pendingCall && pendingCall.to === SG),
    do() { ring('top'); callAfter(SG, 1.2); return 2.4; },
  });
  const leverAct = ctx.acts?.add({
    id: 'lift-lever', at: leverAt, reach: 2.4, rise: 2.2, cone: 0.85, lure: false, ease: false,
    words: 'Throw the lever', every: 'free',
    when: () => !ridden && (where() === 'foot' || where() === 'gallery') && !cur && seq.length === 0 && inCage(),
    do() { return ride(); },
  });
  let pendingCall = null;
  function callAfter(to, sec) { pendingCall = { to, t: sec }; }

  // ---- the walk limit: band corridors, not open floor (walkLimit, what grazers and paving spread over, is unchanged).
  // One along the gallery's deck, and spokes from the deck's rear down the face to just inside the circle at every bay's
  // end, 5 m either side, overlapping: a walker on the gallery may stand there, and one who falls lands on the talus
  // between deck and floor inside a band and can walk down it to the floor
  const spokes = [];
  const spoke = (b) => { const a = (b - 90) * Math.PI / 180, cx = Math.cos(a), cz = Math.sin(a); const bk = gal.backAt(b); spokes.push(ctx.mountains.addCorridor({ name: 'lift', pts: [[cx * (bk + 1), cz * (bk + 1)], [cx * 344, cz * 344]], half: 5 })); };
  for (let k = 0; k <= gal.nW; k++) spoke(gal.bs[k]);
  spoke(gal.bs[0] - 0.5); spoke((gal.bs[gal.nW - 1] + gal.end.b) / 2); spoke(gal.end.b + 0.8); spoke(gal.end.b + 1.6);
  spokes.push(ctx.mountains.addCorridor({ name: 'lift', pts: gal.deckLine, half: gal.D / 2 + 1.5 }));
  const removeCorridor = () => { for (const r of spokes) r(); };

  // ---- the ascent: the gallery walked from the gangway to the ragged end; stepped off where the rail is gone
  const gw = new THREE.Vector3(CG.x, 0, CG.z).addScaledVector(io, GANG.z1 - 0.3);
  const apath = [[gw.x, gw.z, gal.y], ...gal.path.map(([x, z]) => [x, z])];
  const lens = []; let tot = 0; for (let i = 1; i < apath.length; i++) { const dl = Math.hypot(apath[i][0] - apath[i - 1][0], apath[i][1] - apath[i - 1][1]); lens.push(tot += dl); }
  const fracAtBay = (k, f) => { const p = gal.at(k, f, 0); let best = 0, bd = Infinity; for (let i = 1; i < apath.length; i++) { const dd = Math.hypot(apath[i][0] - p.x, apath[i][1] - p.z); if (dd < bd) { bd = dd; best = lens[i - 1] / tot; } } return best; };
  ctx.ascents?.add({ id: 'lift-gallery', path: apath, offs: [fracAtBay(5, 0.5), fracAtBay(9, 0.5), 0.97] });

  // ---- per frame: the carriage always (it is seen moving from the floor); the rest only near
  let lastT = 0, manual = false;
  ctx.registerUpdate((dt, tt) => {
    lastT = tt;
    if (manual) return; // a test steps it with tick()
    if (!open()) { place(0, tt); return; }
    advance(dt, tt);
  }, { at: () => cc, near: 140, hz: 15 });
  const galMid = gal.at(Math.floor(gal.nW / 2), 0.5, 2);
  ctx.registerUpdate((dt, tt) => { if (!manual) gal.update(dt, tt); }, { pos: { x: galMid.x, z: galMid.z }, near: 90, hz: 0 });
  function advance(dt, tt) {
    if (pendingCall && (pendingCall.t -= dt) <= 0) { const to = pendingCall.to; pendingCall = null; call(to); }
    if (ridden) rideT += dt;
    // left alone, it makes its round; it waits at a landing while the visitor is near it
    const atW = where();
    if (!ridden && !cur && seq.length === 0) {
      const pf = hyp(P.pos.x - C0.x, P.pos.z - C0.z), pt = hyp(P.pos.x - CG.x, P.pos.z - CG.z);
      if (atW === 'foot') { idleFoot = pf > AWAY.foot[0] ? idleFoot + dt : 0; if (idleFoot > AWAY.foot[1]) { idleFoot = 0; callTo = SG; door('e', false); go(SG); door('w', true); } }
      else if (atW === 'gallery') {
        const near = pt < AWAY.top[0] * 3 && P.pos.y > gal.y - 30;
        idleTop = near ? 0 : idleTop + dt;
        if (idleTop > roamWait) { idleTop = 0; roamWait = 40 + rng() * 40; round(); }
      } else { callTo = SG; go(SG); }
    }
    step(dt);
    place(dt, tt);
    if (manual) gal.update(dt, tt);
  }
  place(0, 0);
  doorOpen.w = 1; place(0, 0);

  ctx.lift = {
    S0, SG, sRound, C0, CG, floorY0, al, io, cage, gal, station: { PLAT, STAIR, ARCH, C0, floorY0 }, acts: { callFoot, callTop, leverAct },
    get s() { return s; }, get v() { return v; }, get moving() { return moving; }, get ridden() { return ridden; }, get doors() { return { ...doorOpen }; },
    where, heading, call: (w) => call(w === 'foot' ? S0 : SG), ride, inCage, removeCorridor, sOfY,
    // for renders and tests: the carriage put at s at once, standing, the doors as given
    jump(sv, doors = {}) { s = sv; v = 0; cur = null; seq = []; callTo = null; pendingCall = null; moving = false; doorOpen.e = doors.e ?? (Math.abs(sv - S0) < 0.05 ? 1 : 0); doorOpen.w = doors.w ?? (Math.abs(sv - SG) < 0.05 ? 1 : 0); idleFoot = idleTop = 0; roamWait = 1e9; place(0, lastT); },
    // for tests: step the carriage by hand, in lockstep with controls.update (the page's own frames leave it alone)
    set manual(on) { manual = !!on; }, get manual() { return manual; }, tick(dt) { lastT += dt; advance(dt, lastT); },
    get rideT() { return rideT; },
    roam() { round(); }, // for tests: start its round now
    cageCentre: () => cc.clone(), lever: () => leverWorld().clone(), weight: () => railAt(SG - s).addScaledVector(al, WEIGHT_AL),
    stand: { // where a visitor stands for each act, and the yaw that faces it
      foot() { const p = toW(-ARCH.x + 0.9, floorY0, ARCH.z + 1.4); const h = bells.foot.handleAt; return { x: p.x, z: p.z, y: floorY0, yaw: Math.atan2(-(h.x - p.x), -(h.z - p.z)) }; },
      top() { const h = bells.top.handleAt, p = h.clone().addScaledVector(io, -0.9).addScaledVector(al, -0.8); return { x: p.x, z: p.z, y: gal.y, yaw: Math.atan2(-(h.x - p.x), -(h.z - p.z)) }; },
    },
    stats() { // the draws and triangles the module adds, counted from the scene
      let calls = 0, tris = 0;
      group.traverse((o) => { if (!o.isMesh && !o.isPoints) return; calls++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1) * (o.isPoints ? 0 : 1); });
      return { calls, tris, colliders: gal.colliders + 4 };
    },
    // the draws in view from a camera (its frustum against each draw's bounds), for the tests
    drawn(camera) {
      camera.updateMatrixWorld(); const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      let n = 0; group.updateMatrixWorld(true);
      group.traverse((o) => { if ((!o.isMesh && !o.isPoints) || !o.visible) return; if (o.frustumCulled === false) { n++; return; } if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); const sp = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld); if (fr.intersectsSphere(sp)) n++; });
      return n;
    },
    get t() { return lastT; },
  };
  ctx.log?.(`lift: foot at s ${S0.toFixed(2)} (floor ${floorY0.toFixed(2)}), gallery at s ${SG.toFixed(2)} (${gal.y.toFixed(1)} m), ${STAIR.n} steps; gallery ${gal.nW} bays, ${gal.cells.length} cells, ${gal.colliders} colliders; ${Math.round(ctx.lift.stats().tris / 1000)}k tris`);
}
