// The Lantern Halt (v9, issue #934): the causeway's waystation, halfway from Carcanet Keep to the Cardinal Stones.
//
// An Elder slab ten metres tall stands beside the road with the bare notch of the sign cut in its top, its seat for
// a disc that was never there. The Late folk made it a place to sleep: two painted trestles on its shoulders carry a
// beam, and from the beam on chains hangs a pierced lantern-globe as big as a room, in the notch where the disc
// should be. A traveller winches himself up into it for the night, out of reach of whatever walks the moor, and the
// lamp inside is lit. Tonight someone is up there: his clogs stand by the winch at the foot, with his staff, and the
// rope is made fast. The globe sways a little on its chains, and when the sun gutters the lamp inside is turned up.
// The story: stories/the-lantern-halt.md.
//
// Three draws: the slab (the Elder material, ctx.strata.mesh), the furniture at its foot (a stone-shader Builder), and
// the globe with its chains (the same shader, its own material instance so its glow is its own, swung about the
// beam). One PointLight inside the globe, one under it at the foot. Colliders: the slab (a capsule, uncapped), the
// winch, the bench and the trough (capped, low enough to hop onto). Deterministic: ctx.makeRng only.
// ?waystation=0 leaves it out. ctx.waystation: { site, globe, stats() }.
import * as THREE from 'three';
import { Builder, mat, makeGround } from '../structures/geo.js';
import { makeStoneMaterial } from '../structures/materials.js';
import { COLORS } from '../v8/strata/parts.js';

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
  // the rope: from a pulley at the point down to a second at the slab's south corner, then to the winch at the foot
  const pul2 = new THREE.Vector3(-W.w / 2 + 0.25, shoulder + 0.35, W.d / 2 + 0.1);
  B.add(new THREE.TorusGeometry(0.22, 0.06, 6, 14), at(0, apexY - 0.5, 0.75), late(iron, { iron: 0.8 }));
  B.add(new THREE.TorusGeometry(0.22, 0.06, 6, 14), at(pul2.x, pul2.y, pul2.z, 0, Math.PI / 2, 0), late(iron, { iron: 0.8 }));
  const winch = { x: -3.2, z: 2.6 };
  const wy = gAt(winch.x, winch.z) - foot;
  const rope = (a, b) => {
    const m = new THREE.Matrix4().lookAt(a, b, new THREE.Vector3(0, 1, 0));
    const q = new THREE.Quaternion().setFromRotationMatrix(m), len = a.distanceTo(b);
    B.add(B.box(0.035, 0.035, len, { seg: 4 }), M0.clone().multiply(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1))), late(c('#8a7a5a')));
  };
  rope(new THREE.Vector3(0, apexY - 0.7, 0.8), pul2.clone().add(new THREE.Vector3(0.05, 0.2, 0)));
  rope(pul2.clone().add(new THREE.Vector3(0, -0.2, 0.05)), new THREE.Vector3(winch.x + 0.05, wy + 1.1, winch.z));
  // the winch: two painted cheeks on a stone sill, a drum wound with rope, a crank, a pawl; the rope's tail made fast
  B.add(B.box(1.3, 0.3, 0.7, { chip: 0.04 }), onG(winch.x, winch.z), { color: COLORS.heliarch.stone, moss: 0.4, ground: g0 });
  for (const sx of [-0.5, 0.5]) B.add(B.box(0.12, 0.95, 0.5), at(winch.x + sx, wy + 0.6, winch.z), late(green));
  B.add(B.cyl(0.2, 0.2, 0.9, 12, 1), at(winch.x, wy + 0.95, winch.z, 0, 0, Math.PI / 2), late(c('#7a6a4a')));
  for (let k = 0; k < 5; k++) B.add(new THREE.TorusGeometry(0.21, 0.025, 4, 12), at(winch.x - 0.3 + k * 0.15, wy + 0.95, winch.z, 0, Math.PI / 2, 0), late(c('#9a8a62')));
  B.add(B.box(0.06, 0.06, 0.5), at(winch.x + 0.62, wy + 0.95, winch.z + 0.22), late(iron, { iron: 0.8 }));
  B.add(B.cyl(0.04, 0.04, 0.3, 6, 1), at(winch.x + 0.62, wy + 0.95, winch.z + 0.48, Math.PI / 2, 0, 0), late(L.gilt));
  // the staff leaning on the winch, the clogs side by side in front of it, toes to the road: he went up in his stockings
  B.add(B.cyl(0.025, 0.03, 1.7, 6, 1), at(winch.x + 0.75, wy + 0.82, winch.z - 0.12, 0.05, 0, -0.32), late(c('#4a3624'), { moss: 0.05 }));
  B.add(new THREE.IcosahedronGeometry(0.06, 0), at(winch.x + 1.02, wy + 1.62, winch.z - 0.08), late(L.pom));
  for (const [dx, ry] of [[-0.13, 0.08], [0.14, -0.05]]) {
    const cx = winch.x + 0.15 + dx, cz = winch.z + 0.8, cyy = gAt(cx, cz) - foot;
    B.add(B.box(0.13, 0.08, 0.32, { chip: 0.02 }), at(cx, cyy + 0.04, cz, 0, ry, 0), late(c('#5a3a20')));
    B.add(B.box(0.12, 0.08, 0.15), at(cx, cyy + 0.11, cz + 0.06, 0.25, ry, 0), late(L.cloth[0]));
    B.add(B.cyl(0.0, 0.05, 0.12, 5, 1), at(cx + Math.sin(ry) * 0.17, cyy + 0.1, cz + Math.cos(ry) * 0.17, 1.1, ry, 0), late(L.cloth[0]));
  }
  // the bench against the slab's face, tiled, and a cup left on it
  const bench = { x: 1.6, z: W.d / 2 + 0.35 };
  const by = gAt(bench.x, bench.z) - foot;
  ctx.strata.parts.late.bench(B, at(bench.x, by - 0.5, bench.z), { w: 2.4, h: 0.95, d: 0.55, rng });
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
  ctx.strata.place({ hand: 'late', kind: 'spolia', from: 'elder', name: 'the Lantern Halt', x: W.x, y: foot + apexY, z: W.z, mount: 'top' });
  const furn = new THREE.Mesh(B.build(), stone.mat);
  furn.name = 'waystation-late'; furn.castShadow = true; furn.receiveShadow = true;
  count(furn); group.add(furn);

  // ------------------------------------------------------------------ the globe: a pierced lantern as big as a room
  // built round its pivot (the beam), so it swings by rotating one object
  const R = 0.488 * W.S, gcY = shoulder + 0.163 * W.S; // the sign's disc: its centre and radius in the notch
  const drop = apexY - 0.3 - gcY; // pivot (under the point's boss) to the globe's centre
  const glowMat = makeStoneMaterial(ctx);
  const Gb = new Builder(ctx.noise);
  const gl = (col, o = {}) => ({ color: col, moss: 0, ground: -50, ...o });
  // the lamp-skin inside: cloth stretched on the frame, glowing amber (channel 1: uWindow)
  Gb.add(new THREE.IcosahedronGeometry(R * 0.95, 3), mat(0, -drop, 0), gl(c('#3a1a08'), { emit: [2.6, 0.95, 0.16, 1] }));
  // the sleeper's shadow thrown on the cloth by the lamp: a man lying curled on the floor, knees up, his arm under his
  // head; drawn on both faces (east, toward the road from the keep, and west), on the lower half where the floor is
  const SL = [[-0.76, -0.56], [-0.75, -0.47], [-0.69, -0.41], [-0.61, -0.42], [-0.57, -0.48], [-0.47, -0.46], [-0.3, -0.5],
    [-0.12, -0.54], [0.05, -0.5], [0.18, -0.46], [0.36, -0.36], [0.43, -0.38], [0.5, -0.5], [0.6, -0.6], [0.68, -0.57],
    [0.71, -0.63], [0.66, -0.68], [0.3, -0.68], [-0.3, -0.67], [-0.6, -0.65], [-0.72, -0.62]];
  for (const side of [1, -1]) {
    // drawn large, as a shadow is, from the lamp on its hook above him
    const sg = new THREE.ShapeGeometry(new THREE.Shape(SL.map(([x, y]) => new THREE.Vector2(x * 0.88, -0.6 + (y + 0.68) * 1.7))));
    const P = sg.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = Math.sqrt(Math.max(0.02, 1 - x * x - y * y));
      P.setXYZ(i, side * x * R * 0.962, y * R * 0.962, side * z * R * 0.962);
    }
    if (side < 0) sg.index.array.reverse();
    Gb.add(sg, mat(0, -drop, 0), gl(c('#1a0a04')));
  }
  // meridians and parallels of painted iron, the pierced frame that reads black against the glow
  const NM = 14;
  for (let k = 0; k < NM; k++) Gb.add(new THREE.TorusGeometry(R, 0.05, 4, 22, Math.PI), mat(0, -drop, 0, 0, (k / NM) * Math.PI * 2, -Math.PI / 2), gl(k % 2 ? ox : c('#2a1a14'), { iron: 0.4 }));
  for (const lat of [-62, -40, -18, 18, 40, 62]) {
    const a = (lat * Math.PI) / 180;
    Gb.add(new THREE.TorusGeometry(R * Math.cos(a) + 0.01, 0.045, 4, 28), mat(0, -drop + R * Math.sin(a), 0, Math.PI / 2, 0, 0), gl(c('#2a1a14'), { iron: 0.4 }));
  }
  // the equator: a band of turquoise tile with a little gallery rail, and a door, a dark horseshoe toward the road
  Gb.add(Gb.cyl(R + 0.06, R + 0.06, 0.34, 28, 1, true), mat(0, -drop, 0), gl(L.tile[0], { wet: 0.3 }));
  for (let k = 0; k < 28; k++) { const a = (k / 28) * Math.PI * 2; Gb.add(Gb.box(0.07, 0.07, 0.07), mat(Math.cos(a) * (R + 0.09), -drop + 0.2, Math.sin(a) * (R + 0.09)), gl(L.gilt)); }
  // the cap: an ogee dome in turquoise tile, gilt ribs, the finial with the crescent and pomegranate on its point
  const cap = [[R * 0.62, 0], [R * 0.7, 0.12], [R * 0.66, 0.4], [R * 0.48, 0.72], [R * 0.24, 1.0], [R * 0.1, 1.28], [0.06, 1.5], [0, 1.55]];
  Gb.add(Gb.lathe(cap.map(([r, y]) => [r, y]), 16), mat(0, -drop + R * 0.78, 0), gl(L.tile[0], { wet: 0.25 }));
  Gb.add(new THREE.IcosahedronGeometry(0.16, 1), mat(0, -drop + R * 0.78 + 1.55, 0), gl(L.gilt));
  // the pendant under it, gilt, and the rope ladder rolled up and hung beneath (he pulled it up after him)
  Gb.add(Gb.lathe([[0, 0], [0.12, 0.1], [0.42, 0.45], [R * 0.55, 0.62]], 14), mat(0, -drop - R - 0.42, 0), gl(L.gilt));
  Gb.add(Gb.cyl(0.22, 0.22, 1.1, 10, 1), mat(0, -drop - R - 0.75, 0.0, 0, 0, Math.PI / 2), gl(c('#7a6a4a')));
  for (const sx of [-0.4, 0.4]) Gb.add(Gb.box(0.03, 0.4, 0.03), mat(sx, -drop - R - 0.55, 0), gl(c('#7a6a4a')));
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
    ctx.addCollider({ x1: bA[0], z1: bA[1], x2: bB[0], z2: bB[1], r: 0.3, y: by + foot - 0.3, h: 0.83, mod: 'waystation' });
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
  const stats = () => ({ calls: 3, tris: Math.round(tris), lights: 1, ms });
  ctx.waystation = { site: W, globe: { x: W.x, y: foot + gcY, z: W.z, r: R }, foot, stats, lampAt: () => lamp.getWorldPosition(lampAt) };
  ctx.log(`waystation: ${Math.round(tris)} tris, 3 draws`);
}
