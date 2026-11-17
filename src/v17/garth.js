// The Meridian Garth [Proposed] (v17-U2): a garden under the mountain where it is still noon. At the end of U1's tube
// under the water the walker comes in by the west door of a round hall the Heliarchs cut in the rock (40 m across,
// a dome to y -4), and in it, from a lens the Noonwrights hung in the crown and fed by a tube through the rock from
// the west (toward the sphere at the west wall's foot), white daylight falls on a circle of green grass and three
// trained fruit trees: the first true green and the first white light in the walk. Round it the garden is dead in
// rings, oldest outermost: each ring was once inside the light. The valley's water comes in round it in stone rills.
// At the light's edge stands a watering can as tall as a man, full, its spout dripping: the tender's make.
// stories/the-meridian-garth.md (beats 5 to 7). The plan: src/v17/plan.js (GARTH, GARTH_DOOR), garth/plan.js.
// Draws: the hall (one), the garden (one), the glass (one), the lens (one), the can (one), the water (one), the beam
// (one), the motes (one). No PointLight: the noon is a beam in every material here (garth/noon.js).
// ?garth=0 leaves it out.
import * as THREE from 'three';
import { UnderBuilder, underMaterial, installBelow } from '../v14/under.js';
import { noonGlass } from '../v14/noon-road.js';
import { NOON, NOON_PARTS as NP, GLAZES, strand } from '../v8/strata/noon.js';
import { SPHERE, GARTH_DOOR } from './plan.js';
import { CX, CZ, FLOOR, R, LENS, LIGHT_R, OCULUS, domeY, CAN, TREES, TREE, RILL, at, floorAt, DOOR_A } from './garth/plan.js';
import { U, noonLit, shaft, motes, NOON_I } from './garth/noon.js';
import { buildHall } from './garth/hall.js';
import { buildGarden } from './garth/garden.js';
import { channels, buildKerbs, waterMesh } from './garth/water.js';
import { buildCan, rosePoint } from './garth/can.js';

export const GARTH_OFF = typeof location !== 'undefined' && new URLSearchParams(location.search).get('garth') === '0';
// the eye's grade in the light: near daylight (the post's own grade takes a fifth of the colour and warms the
// highlights; this gives the colour back), eased in from the hall's dark-adapted one as the eye comes into the light
export const NOON_GRADE = [1.4, 1.05, 1.3, 0.0]; // daylight: bright and contrasty, neutral (the light itself carries the faint warmth, 5500 K against the world's 2500 K)
// the bounce off the lit garden: warm-neutral white
export const BOUNCE = '#ece6d6';
export const HALL_GRADE = [1.32, 0.5, 1.12, 0.12]; // dim, and the post's violet lift taken back toward stone grey: the only colour here is the noon's

export async function build(ctx) {
  if (GARTH_OFF) { ctx.garth = { off: true }; return; }
  const t0 = performance.now();
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(17203);
  const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

  // ---- the baked light: the noon's bounce, in its own colour (under.js's glow): the lit garden throws a dim gold up
  // onto the dome and out over the dead rings, less the further out; the sky's light nil, no haze
  const bounce = (x, y, z) => {
    const r = Math.hypot(x - CX, z - CZ), h = y - FLOOR;
    const ground = 0.12 + 0.75 * Math.exp(-Math.max(0, r - LIGHT_R) / 5.0);
    // the dome takes the light thrown up off the garden: brightest over it, falling off to the dark springing
    const q = Math.max(0, 1 - r / (R * 0.95)), up = 0.06 + 0.95 * Math.pow(Math.min(1, Math.max(0, h) / 19), 1.4) * q * q + 0.06 * q + 0.36 * (1 - 0.5 * Math.min(1, r / R)); // (and the whole hall a little: a sunlit floor lights a room)
    return h < 2.5 ? ground + (up - ground) * (h / 2.5) * 0.3 : up;
  };
  const lit = (x, y, z, out) => { out[0] = 0.012; out[1] = 0; out[2] = bounce(x, y, z); return out; };
  const meshes = [];
  const mk = (B, mat, name) => { const m = new THREE.Mesh(B.geometry(), mat); m.name = name; m.castShadow = false; m.receiveShadow = false; ctx.scene.add(m); meshes.push(m); return m; };
  const stoneMat = (key, o = {}) => underMaterial(noonLit(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.02, ...o }), !!o.side), key, BOUNCE);

  // ---- the hall
  await ctx.progress?.('the meridian garth', 0);
  const HB = new UnderBuilder(lit);
  buildHall(HB, low);
  const chans = channels(low);
  buildKerbs(HB, chans);
  mk(HB, stoneMat('garth-hall'), 'garth-hall');

  // ---- the garden: the light's own ring and the dead ones round it
  const GB = new UnderBuilder(lit);
  buildGarden(GB, rng, { low, rings: ['live', 'wilt', 'brown', 'grey', 'ash'] });
  mk(GB, stoneMat('garth-garden', { side: THREE.DoubleSide, roughness: 0.82 }), 'garth-garden');
  await ctx.progress?.('the meridian garth', 0.5);

  // ---- the glass: the lens's rim and its strands to the bronze ring, and the tube that feeds it, coming in through
  // the dome from the west (toward the sphere), the last length of it still holding a little light
  const NB = new UnderBuilder(lit);
  const lensM = new THREE.Matrix4().makeRotationX(Math.PI / 2).setPosition(CX, LENS.y, CZ); // +z down
  NP.collar(NB, lensM, { r: LENS.r + 0.05, t: 0.16, glaze: GLAZES[1], band: true, seg: 56 });
  const yo = domeY(OCULUS) - 0.3;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2, p = [CX + Math.cos(a) * (LENS.r + 0.1), LENS.y + 0.12, CZ + Math.sin(a) * (LENS.r + 0.1)], q = [CX + Math.cos(a) * (OCULUS - 0.05), yo, CZ + Math.sin(a) * (OCULUS - 0.05)];
    strand(NB, new THREE.Matrix4(), p, q, { t: 0.03 });
  }
  const toS = [SPHERE.c[0] - CX, SPHERE.c[1] - CZ], ls = Math.hypot(toS[0], toS[1]), sx = toS[0] / ls, sz = toS[1] / ls;
  const tubeA = [CX + sx * 15, domeY(15) + 1.4, CZ + sz * 15], tubeB = [CX + sx * (LENS.r + 0.9), LENS.y + 0.05, CZ + sz * (LENS.r + 0.9)]; // (its node clear of the dome)
  {
    const d = new THREE.Vector3(tubeB[0] - tubeA[0], tubeB[1] - tubeA[1], tubeB[2] - tubeA[2]), len = d.length(); d.normalize();
    const M = new THREE.Matrix4().lookAt(new THREE.Vector3(...tubeA), new THREE.Vector3(...tubeA).sub(d), new THREE.Vector3(0, 1, 0)).setPosition(...tubeA);
    NP.tube(NB, M, { r: 0.5, len, rib: 1.2, collar: true, glaze: GLAZES[0], seed: 7, lit: 0.35 });
    // where it meets the lens: a node on the rim, the line's end
    NP.node(NB, new THREE.Matrix4().makeTranslation(...tubeB), { r: 0.55, lit: 0.6, ports: [] });
  }
  mk(NB, noonGlass('garth-glass'), 'garth-glass');
  // the lens itself: a shallow bull's-eye of clear glass, the light in it (not lit by anything: it is the source), its
  // rings ground in (a lens of steps), dimmer toward its rim
  {
    const prof = []; for (let i = 0; i <= 40; i++) { const t = i / 40; prof.push(new THREE.Vector2(LENS.r * t, -0.32 * (1 - t * t))); }
    const g = new THREE.LatheGeometry(prof, 48); g.translate(CX, LENS.y, CZ);
    const cols = [], P = g.attributes.position.array;
    for (let i = 0; i < P.length; i += 3) { const r = Math.hypot(P[i] - CX, P[i + 2] - CZ) / LENS.r, k = (0.95 - 0.3 * r * r) * (Math.sin(r * 40) > 0.75 ? 0.62 : 1) * (r > 0.97 ? 0.5 : 1); const w = 3.2 * k * k; cols.push(w, w * 0.97, w * 0.9); } // too bright to look at: blown white, its rim warm
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const lm = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false });
    const lens = new THREE.Mesh(g, lm); lens.name = 'garth-lens'; ctx.scene.add(lens); meshes.push(lens);
  }
  let capMesh = null, capGone = false;
  // past the door's outer face, until U1's tube is there: a black end (taken away once the tube has built)
  {
    const d = GARTH_DOOR, P = (u, v, y) => new THREE.Vector3(CX + d.dir[0] * u - d.dir[1] * v, y, CZ + d.dir[1] * u + d.dir[0] * v);
    const g = new THREE.BufferGeometry().setFromPoints([P(d.outer, -d.half - 1, FLOOR - 0.5), P(d.outer, d.half + 1, FLOOR - 0.5), P(d.outer, d.half + 1, FLOOR + d.h + 1), P(d.outer, -d.half - 1, FLOOR - 0.5), P(d.outer, d.half + 1, FLOOR + d.h + 1), P(d.outer, -d.half - 1, FLOOR + d.h + 1)]);
    const cap = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, fog: false })); cap.name = 'garth-door-end';
    ctx.scene.add(cap); meshes.push(cap);
    capMesh = cap;
    ctx.built?.().then(() => { if (ctx.swallow && !ctx.swallow.off) { capGone = true; cap.visible = false; } });
  }
  // the beam in the air and the dust in it
  const beam = shaft(); ctx.scene.add(beam); meshes.push(beam);
  const dust = motes(rng, low ? 90 : 220); ctx.scene.add(dust); meshes.push(dust);

  // ---- the can, and the water: the rills and the drop from the can's rose (its rings spread on the rill below)
  const CB = new UnderBuilder(lit);
  const can = buildCan(CB);
  mk(CB, underMaterial(noonLit(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.45 })), 'garth-can', BOUNCE), 'garth-can');
  const uDrip = { value: new THREE.Vector4(0, 0, 9, 1) };
  const water = waterMesh(chans, uDrip); ctx.scene.add(water); meshes.push(water);
  const rose = rosePoint();
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4).scale(1, 1.5, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color('#dfe8ff').multiplyScalar(0.6), fog: false }));
  drop.name = 'garth-drop'; ctx.scene.add(drop); meshes.push(drop);
  uDrip.value.set(rose[0], rose[2], 9, 1);

  // ---- the floor: one held stacked floor inside the wall and through the door's reveal (U1's tube beyond its face)
  ctx.addWalkable(floorAt, { stack: true, keep: true, name: 'garth' });
  if (ctx.addCollider) {
    for (const t of TREES) {
      const [x, z] = at(t.r, t.b), a = DOOR_A + t.b, tx = -Math.sin(a) * TREE.half, tz = Math.cos(a) * TREE.half;
      ctx.addCollider({ x1: x - tx, z1: z - tz, x2: x + tx, z2: z + tz, r: 0.18, y: FLOOR, h: TREE.h, stand: false });
    }
    ctx.addCollider({ x: can.x, z: can.z, r: 0.66, y: FLOOR, h: CAN.h, stand: false });
  }

  // ---- under the ground: the hall's volume (a hall: it sounds big), sealed; its grade
  const below = installBelow(ctx);
  const vol = (x, y, z) => {
    const dx = x - CX, dz = z - CZ, r2 = dx * dx + dz * dz;
    if (r2 > 23 * 23 || y < FLOOR - 4 || y > -1) return 0;
    const r = Math.sqrt(r2);
    return (1 - ss(R + 1.6, R + 3, r)) * (1 - ss(-3.5, -1.5, y));
  };
  vol.segs = [[CX - 0.01, CZ, CX + 0.01, CZ, R + 1.6, -1.5, -1.5, 2]];
  const hvol = below.add(vol, { size: 1 });
  for (const m of meshes) below.keep(m);
  const _gn = [0, 0, 0, 0];
  const unGrade = below.grade?.((p, out) => {
    const dx = p.x - CX, dz = p.z - CZ, r = Math.sqrt(dx * dx + dz * dz);
    if (r > R + 3 || p.y > -2 || p.y < FLOOR - 3) return 0;
    const f = 1 - 0.7 * ss(LIGHT_R - 1.2, LIGHT_R + 2.5, r); // in the light: daylight; out of it mostly the hall's (the noon is in view from anywhere in it)
    for (let k = 0; k < 4; k++) out[k] = HALL_GRADE[k] + (NOON_GRADE[k] - HALL_GRADE[k]) * f;
    return 1 - ss(R + 0.5, R + 3, r);
  });

  // ---- what draws it: the hall is seen only from inside, from its door and from U1's tube down the aqueduct, so its
  // meshes are drawn only while the eye is under the moor's level and within the tube's reach (from the surface they
  // would cost their draws behind the ground: heights-test's top of the gallery saw them)
  // (.visible, not layers: the seal's layer is given only to what is on layer 0 when it first collects)
  const show = (on) => { for (const m of meshes) m.visible = on && !(m === capMesh && capGone); };
  let shown = true;
  ctx.registerUpdate(() => {
    const c = ctx.camera.position, dx = c.x - CX, dz = c.z - CZ, on = c.y < -8 && dx * dx + dz * dz < 95 * 95;
    if (on !== shown) { shown = on; show(on); }
  });

  // ---- per frame, near: the breath (a slow swell over nine seconds and a smaller one over four, never a flicker:
  // it does not answer the sun's gutter), the water's and the dust's clock
  const px = new THREE.Vector2();
  ctx.registerUpdate((dt, t) => {
    const b = 1 + 0.055 * Math.sin(t * 0.698) + 0.02 * Math.sin(t * 1.61 + 1.2);
    U.uNoon.value.x = NOON_I * b;
    U.uNoonT.value = t;
    // the drop: gathers at the rose (1.1 s), falls (0.47 s), and its rings spread on the rill; again every 2.3 s
    const ph = t % 2.3;
    if (ph < 1.1) { const k = ph / 1.1; drop.position.set(rose[0], rose[1] - 0.05 - 0.02 * k, rose[2]); drop.scale.setScalar(0.4 + 0.6 * k); }
    else if (ph < 1.57) { const f = (ph - 1.1) / 0.47; drop.position.set(rose[0], rose[1] - 0.07 - (rose[1] - RILL.y - 0.07) * f * f, rose[2]); drop.scale.setScalar(1); }
    else drop.scale.setScalar(0.001);
    uDrip.value.z = ph >= 1.57 ? ph - 1.57 : ph + 0.73;
    for (const m of meshes) { const g = m.material?.userData?.uGlow; if (g) g.value.set(BOUNCE).multiplyScalar(b); }
    ctx.renderer?.getDrawingBufferSize?.(px);
    dust.material.uniforms.uPx.value = (px.y || 720) / (2 * Math.tan(((ctx.camera.fov || 60) * Math.PI) / 360));
  }, { pos: { x: CX, z: CZ }, near: 60, hz: 0, r: R });

  ctx.garth = { off: false, meshes, floor: floorAt, vol: hvol, grade: unGrade, uniforms: U };
  ctx.log?.(`garth built in ${(performance.now() - t0).toFixed(0)} ms: ${meshes.length} meshes, ${HB.tris + GB.tris + NB.tris + CB.tris} tris`);
}
