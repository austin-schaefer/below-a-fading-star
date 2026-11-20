// The Lower Beds (v18-F3): the Graffer's dead under the wood. A vault door in the south-west rise under a great tree's
// roots, its bronze leaf open a body's width; a stair down to a low barrel-vaulted room of six tombs, each lid an
// effigy of one of the six people grown as flowers in the glasshouse (the plan's LIKENESSES), each cracked across where
// a root came down into it; the gardener's way north under the wood, shored with glasshouse iron, the six roots along
// its roof; the round chamber under the glasshouse, the tubs' undersides overhead, the grate's coloured light, and a
// seventh tomb open and empty, its lid half carved, the can on its rim. stories/the-graffer.md, beats 3 and 4.
// Numbers: BEDS in src/v18/plan.js; the floor: beds/line.js; the parts: beds/rooms.js, effigy.js, roots.js, light.js;
// the ground opened at the door: beds/ground.js. The kit: v14/under.js (runtime.md, "Under the ground").
//   ?beds=0 off. ctx.beds: { floor, line, meshes, lights, cut, capped, stats() }
import * as THREE from 'three';
import { installBelow, underMaterial, UnderBuilder } from '../v14/under.js';
import { BEDS } from './plan.js';
import * as L from './beds/line.js';
import { openBox } from './beds/ground.js';
import { door, stair, vault, wayTube, chamber, COL } from './beds/rooms.js';
import { roots, HUES } from './beds/roots.js';
import { grateLight } from './beds/light.js';

const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
export const BEDS_OFF = !!Q && Q.get('beds') === '0';
const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

export async function build(ctx) {
  if (BEDS_OFF) return;
  await ctx.progress?.('the lower beds', 0);
  const T = ctx.terrain, below = installBelow(ctx), low = ctx.quality === 'low';
  const { court: CT, stair: ST, landing: LA, steps: SP, vault: V, chamber: CH, grate: GR, block: BK } = BEDS;
  const YV = L.Y.vault, YC = L.Y.chamber, vcx = (V.x0 + V.x1) / 2;

  // ---- the ground at the door: its drawn triangles taken out over the forecourt and the door's block, cut clean
  const G = openBox(T, BEDS.cut);
  if (G.mesh) { G.mesh.name = 'beds-ground'; ctx.scene.add(G.mesh); }
  else console.warn('[fp] beds: the ground\'s cut at the door removed nothing: the terrain\'s mesh has moved');

  // ---- what lights each part (aUnder: the sky's share, the haze's, the baked glow of its own light)
  const fox = [[BEDS.face + 0.4, L.Y.sill + 0.15, 170.78], [BEDS.face + 0.4, L.Y.sill + 0.15, 173.22]]; // on two rotten root-stubs at the door's foot (rooms.js door())
  const near = (pts, x, y, z, k, r) => { let g = 0; for (const p of pts) { const d2 = (x - p[0]) ** 2 + (y - p[1]) ** 2 + (z - p[2]) ** 2; g += k / (1 + d2 / (r * r)); } return g; };
  const skyAt = (x) => Math.max(0.012, 1 - ss(BEDS.face + 0.3, BK.x0 - 1.2, x));
  const litDoor = (x, y, z, out) => { const s = skyAt(x); out[0] = s; out[1] = s; out[2] = Math.min(1.2, near(fox, x, y, z, 0.8, 0.8)); return out; };
  // the tombs' roots: where each comes down to its lid (the far side of the figure), for the vault's glow
  const drops = BEDS.tombs.map(([tx, tz]) => { const far = tx < vcx ? -1 : 1; return [tx + far * 0.42, YV + 1.5, tz + 0.16]; });
  const litStone = (x, y, z, out) => {
    const s = skyAt(x); out[0] = s; out[1] = s;
    out[2] = Math.min(1.1, 0.02 + near(fox, x, y, z, 0.5, 0.8) * s + (z < LA.z1 + 0.5 && x < ST.x0 ? near(drops, x, y, z, 0.6, 1.0) : 0));
    return out;
  };
  const _n = {};
  const litWay = (x, y, z, out) => { L.way.near(x, z, _n); const h = (y - L.way.floorY(Math.max(0, Math.min(L.way.LEN, _n.s)))) / L.way.height; out[0] = 0.01; out[1] = 0; out[2] = 0.16 + 0.4 * Math.max(0, h) ** 2; return out; };
  const slant = [-1.1, 0.15], spot = [GR.x + slant[0], YC + 0.3, GR.z + slant[1]];
  const litChamber = (x, y, z, out) => { out[0] = 0.01; out[1] = 0; out[2] = Math.min(1.2, 0.06 + near([spot, [GR.x, YC + CH.ceil, GR.z]], x, y, z, 0.6, 1.6) + near(BEDS.tubs.slice(0, 6).map(([a, b]) => [a, YC + CH.ceil - 0.8, b]), x, y, z, 0.12, 1.0)); return out; };
  const litRoot = (x, y, z, out) => { out[0] = 0.01; out[1] = 0; out[2] = 0.24; return out; };

  // ---- the parts
  const BD = new UnderBuilder(litDoor), dr = door(BD, T);
  const BS = new UnderBuilder(litStone); stair(BS); const VT = vault(BS);
  // the way's tube from inside the vault's north wall to the chamber's wall (where the line crosses r - 0.05)
  const sEnd = L.way.END;
  // the way and the chamber one mesh (one draw; and one thing to the geometry check, which it is: the way opens into it)
  const litUnder = (x, y, z, out) => (Math.hypot(x - CH.x, z - CH.z) < CH.r + 0.5 ? litChamber(x, y, z, out) : litWay(x, y, z, out));
  const BW = new UnderBuilder(litUnder), ch = {}; wayTube(BW, 0, sEnd); chamber(BW, ch);
  const BR = new UnderBuilder(litRoot);
  const we = L.way.at(sEnd); const RT = roots(BR, { tubs: ch.tubs, ends: VT.roots, vault: VT, wayEnd: { x: we.x, z: we.z, s: sEnd }, tomb: ch.tomb });
  // the glows: the foxfire on the door's foot, and the panes over the grate seen up through it
  const glowP = [], glowC = [];
  const gq = (a, b, c, d, col) => { for (const p of [a, b, c, a, c, d]) { glowP.push(...p); glowC.push(...col); } };
  const cOf = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };
  for (const [fx, fy, fz] of fox) for (let i = 0; i < 10; i++) {
    // little caps in tiers along the stub's top and its side toward the door, each a shelf tilted out
    const x = fx - 0.3 + (i / 9) * 0.55, sd = i % 2 ? 1 : -1, z = fz + sd * (0.06 + (i % 3) * 0.03), y = fy + 0.06 + (i % 3) * 0.03, s = 0.028 + (i % 3) * 0.012, r = 0.045 + (i % 4) * 0.02;
    const col = cOf(i % 2 ? '#8fdcb4' : '#b4f0d0').map((v) => v * 0.85);
    gq([x - s, y, z], [x + s, y, z], [x + s, y + s * 0.5, z + sd * r], [x - s, y + s * 0.5, z + sd * r], col);
    gq([x - s * 0.7, y + s * 0.5, z + sd * r], [x + s * 0.7, y + s * 0.5, z + sd * r], [x + s * 0.4, y + s * 0.2, z + sd * r * 1.3], [x - s * 0.4, y + s * 0.2, z + sd * r * 1.3], col.map((v) => v * 0.8));
  }
  { const t = (ch.grateTop ?? -3.3) + 0.25, h = GR.half;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const x0 = GR.x - h + i * (2 * h / 3), z0 = GR.z - h + j * (2 * h / 3), w = 2 * h / 3, col = cOf(HUES[(i * 3 + j * 2) % 6]).map((v) => v * 0.55);
      gq([x0, t, z0], [x0 + w, t, z0], [x0 + w, t, z0 + w], [x0, t, z0 + w], col); } }
  const glowG = new THREE.BufferGeometry(); glowG.setAttribute('position', new THREE.Float32BufferAttribute(glowP, 3)); glowG.setAttribute('color', new THREE.Float32BufferAttribute(glowC, 3)); glowG.computeBoundingSphere();
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: true });

  const std = (r = 0.92) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: r, metalness: 0 });
  const mk = (B, mat, name) => { const m = new THREE.Mesh(B.geometry(), mat); m.name = name; m.receiveShadow = true; m.castShadow = false; ctx.scene.add(m); return m; };
  const mDoor = mk(BD, underMaterial(std(0.9), 'beds-door', '#9fe8c2'), 'beds-door'); mDoor.castShadow = !low;
  const mStone = mk(BS, underMaterial(std(), 'beds-stone', '#e0aa84'), 'beds-stone');
  const mWay = mk(BW, underMaterial(std(), 'beds-way', '#d6aa74', { far: [10, 21] }), 'beds-way');
  const mRoots = mk(BR, underMaterial(std(0.6), 'beds-roots', '#ffffff'), 'beds-roots');
  const mGlow = new THREE.Mesh(glowG, glowMat); mGlow.name = 'beds-glow'; ctx.scene.add(mGlow);
  const GL = grateLight({ x: GR.x, z: GR.z, half: GR.half, top: ch.grateTop ?? -3.3, floor: YC, slant, hues: [HUES[0], HUES[1], HUES[2], HUES[3]] });
  GL.mesh.name = 'beds-light'; ctx.scene.add(GL.mesh);
  const under = [mStone, mWay, mRoots, mGlow, GL.mesh];
  for (const m of under) below.keep(m);

  // ---- the lights: the foxfire at the door; in the vault two pools of the roots' colours; one in the way's middle; the
  // grate's in the chamber. lights.js keeps the nearest three; each breathes, none flickers
  const lights = [];
  const pl = (hex, i, d, x, y, z) => { const l = new THREE.PointLight(hex, i, d, 2); l.position.set(x, y, z); ctx.scene.add(l); lights.push({ L: l, i, ph: lights.length * 1.7 }); return l; };
  pl('#8fe0b8', 1.1, 5, BEDS.face + 1.0, L.Y.sill + 0.4, 172);
  pl(HUES[0], 2.6, 6, vcx, YV + 2.5, 165.6);
  pl(HUES[3], 2.6, 6, vcx, YV + 2.5, 161.0);
  for (const f of [0.3, 0.7]) { const a = L.way.at(L.way.LEN * f); pl(f < 0.5 ? HUES[2] : HUES[4], 3.2, 7, a.x, L.way.floorY(L.way.LEN * f) + L.way.height - 0.3, a.z); }
  pl(HUES[1], 7, 8, spot[0], YC + 2.6, spot[2]);

  // ---- the floors: the forecourt and the doorway are the ground there (replacing heightAt, so the bank's walkers
  // never stand over the cut); from the doorway down, one held stacked floor to the chamber
  const courtGround = (x, z) => {
    if (x > CT.x1 + 0.02 || x < ST.x0 || z < CT.z0 || z > CT.z1) return null;
    if (x >= CT.x0 || Math.abs(z - 172) <= L.DOOR_HALF) return L.Y.sill;
    return null;
  };
  ctx.addWalkable(courtGround, { replace: true });
  const floor = (x, z) => (x < L.BBOX.x0 || x > L.BBOX.x1 || z < L.BBOX.z0 || z > L.BBOX.z1 || x > ST.x0 ? null : L.floorAt(x, z));
  ctx.addWalkable(floor, { stack: true, keep: true, name: 'beds' });
  ctx.ascents?.add({ id: 'beds', held: true, offs: [0.25, 0.55, 0.85], path: L.ROUTE });

  // ---- what a walker cannot pass: the wing walls, the door's piers and the mass over it, the leaf, the trunk; the
  // tombs, the open tomb and its lid
  if (ctx.addCollider) {
    const ys = L.Y.sill;
    for (const s of [-1, 1]) { const z = (s < 0 ? CT.z0 : CT.z1) + s * 0.375; ctx.addCollider({ x1: CT.x0 - 0.2, z1: z, x2: CT.x1 + 0.3, z2: z, r: 0.375, y: ys - 0.4, h: 4, stand: false }); }
    for (const z of [(BK.z0 + 172 - L.DOOR_HALF) / 2, (BK.z1 + 172 + L.DOOR_HALF) / 2]) ctx.addCollider({ x1: BK.x0 + 0.65, z1: z, x2: BEDS.face - 0.65, z2: z, r: 0.7, y: ys - 0.5, h: BK.top - ys + 0.5, stand: false });
    ctx.addCollider({ x1: BK.x0 + 0.95, z1: 172, x2: BEDS.face - 0.95, z2: 172, r: 1.0, y: ys + L.DOOR_H, h: BK.top - ys - L.DOOR_H + 1.2, stand: false });
    ctx.addCollider({ x1: dr.leaf.a[0], z1: dr.leaf.a[1], x2: dr.leaf.b[0], z2: dr.leaf.b[1], r: 0.07, y: ys, h: 2.6, stand: false });
    const tr = BEDS.tree; ctx.addCollider({ x: tr.x + 0.2, z: tr.z, r: tr.r, y: T.heightAt(tr.x, tr.z) - 1.5, h: 1e5 });
    BEDS.tombs.forEach(([tx, tz], i) => { const hx = i === 4 ? 0.75 : 0.55, hz = i === 2 ? 0.85 : 1.08; ctx.addCollider({ x1: tx, z1: tz - hz + hx, x2: tx, z2: tz + hz - hx, r: hx + 0.05, y: YV, h: 1.0, stand: false }); });
    const t7 = ch.tomb; ctx.addCollider({ x1: t7.x, z1: t7.z - t7.hz + 0.55, x2: t7.x, z2: t7.z + t7.hz - 0.55, r: 0.6, y: YC, h: 1.0, stand: false });
    ctx.addCollider({ x1: t7.x - t7.hx - 0.4, z1: t7.z - 0.75, x2: t7.x - t7.hx - 0.4, z2: t7.z + 0.75, r: 0.42, y: YC, h: 1.0, stand: false });
  }
  // what stands on the wood over the rooms (its trees' trunks, a stone) is a column through the ground as well as to
  // the sky: given a bottom 1.5 m under the ground it stands on, so it stops nobody down here (v14/passage.js's capOver)
  const overRooms = (x, z, r) => {
    if (x < L.BBOX.x0 - r || x > BK.x0 + r || z < L.BBOX.z0 - r || z > L.BBOX.z1 + r) return false;
    if (x <= BK.x0 + r && x >= ST.x1 - r && Math.abs(z - ST.z) <= ST.half + r + 0.3) return true;
    if (x >= LA.x0 - r && x <= LA.x1 + r && z >= SP.z1 - r && z <= LA.z1 + r) return true;
    if (x >= V.x0 - r && x <= V.x1 + r && z >= V.z0 - r && z <= V.z1 + r) return true;
    L.way.near(x, z, _n); if (_n.s > -1 && _n.s < L.way.LEN + 1 && Math.abs(_n.d) < L.way.half + r + 0.3) return true;
    return Math.hypot(x - CH.x, z - CH.z) < CH.r + r + 0.3;
  };
  let capped = 0;
  const capOver = () => { for (const c of ctx.controls?.state?.colliders || []) { if (c.y !== undefined || c.x1 !== undefined) continue; if (!overRooms(c.x, c.z, c.r || 0)) continue; c.y = T.heightAt(c.x, c.z) - 1.5; c.h = 1e5; capped++; } };
  capOver(); ctx.built?.().then(capOver);

  // ---- under the ground: the stair grows stone-sounding as it goes down (never sealed: the door is seen up it); the
  // vault, the way and the chamber sealed
  const inRect = (x, z, x0, x1, z0, z1, e) => (1 - ss(0, e, x0 - x)) * (1 - ss(0, e, x - x1)) * (1 - ss(0, e, z0 - z)) * (1 - ss(0, e, z - z1));
  const stairVol = (x, y, z) => {
    if (x > BEDS.face || x < LA.x0 - 1 || z < SP.z1 - 1 || z > LA.z1 + 1) return 0;
    let v = 0;
    if (Math.abs(z - ST.z) < ST.half + 0.6 && x >= ST.x1 - 0.2) { const f = L.stairY(Math.max(ST.x1, Math.min(ST.x0, x))); v = 0.95 * ss(BEDS.face, BK.x0 - 1.5, x) * (1 - ss(f + 3, f + 4, y)) * ss(f - 3, f - 2, y); }
    const w = 0.95 * inRect(x, z, LA.x0, LA.x1, SP.z1, LA.z1, 0.5) * (1 - ss(L.Y.landing + 3, L.Y.landing + 4, y)) * ss(YV - 3, YV - 2, y);
    return Math.max(v, w);
  };
  const vaultVol = (x, y, z) => (x < V.x0 - 1 || x > V.x1 + 1 || z < V.z0 - 1 || z > V.z1 + 1 ? 0 : inRect(x, z, V.x0, V.x1, V.z0, V.z1 - 0.3, 0.6) * (1 - ss(YV + V.crown + 0.5, YV + V.crown + 1.5, y)) * ss(YV - 3, YV - 2, y));
  vaultVol.segs = [[vcx, V.z0 + 3, vcx, V.z1 - 3, (V.x1 - V.x0) / 2, YV + V.crown + 0.5, YV + V.crown + 0.5, 1]];
  const wayVol = (x, y, z) => {
    if (x < L.way.BOX.x0 || x > L.way.BOX.x1 || z < L.way.BOX.z0 || z > L.way.BOX.z1) return 0;
    L.way.near(x, z, _n); if (_n.s < -0.8 || _n.s > L.way.LEN + 0.8) return 0;
    const f = L.way.floorY(Math.max(0, Math.min(L.way.LEN, _n.s)));
    return (1 - ss(L.way.half + 0.2, L.way.half + 0.8, Math.abs(_n.d))) * (1 - ss(f + L.way.height + 0.5, f + L.way.height + 1.5, y)) * ss(f - 3, f - 2, y);
  };
  { const a = {}, b = {}; wayVol.segs = []; for (let s = 0; s < L.way.LEN; s += 17) { L.way.at(s, a); L.way.at(Math.min(L.way.LEN, s + 17), b); wayVol.segs.push([a.x, a.z, b.x, b.z, L.way.half, YV + L.way.height + 0.5, YC + L.way.height + 0.5, 1]); } }
  const chamberVol = (x, y, z) => { const d = Math.hypot(x - CH.x, z - CH.z); return (1 - ss(CH.r - 0.2, CH.r + 0.6, d)) * (1 - ss(YC + CH.ceil + 0.3, YC + CH.ceil + 1.2, y)) * ss(YC - 3, YC - 2, y); };
  chamberVol.segs = [[CH.x, CH.z - 0.01, CH.x, CH.z + 0.01, CH.r, YC + CH.ceil + 0.3, YC + CH.ceil + 0.3, 1]];
  below.add(stairVol, { size: 0.3 });
  below.add(vaultVol, { size: 0.75 });
  below.add(wayVol, { size: 0.25 });
  below.add(chamberVol, { size: 0.6 });

  // ---- per frame, near: the lights breathe, the grate's light moves; far off, the rooms are not drawn at all
  const cam = ctx.camera.position, mid = { x: (vcx + CH.x) / 2, z: (V.z1 + CH.z) / 2 };
  ctx.registerUpdate((dt, t) => {
    GL.uniforms.uTime.value = t;
    for (const l of lights) l.L.intensity = l.i * (0.92 + 0.08 * Math.sin(t * 0.55 + l.ph));
  }, { pos: mid, near: 70, hz: 0 });
  const far = [mStone, mWay, mRoots, GL.mesh];
  let wasOn = null;
  ctx.registerUpdate(() => {
    const dx = cam.x - mid.x, dz = cam.z - mid.z, on = dx * dx + dz * dz < 75 * 75 || below.here > 0;
    if (on !== wasOn) { for (const m of far) m.visible = on; for (const l of lights.slice(1)) l.L.visible = on; wasOn = on; }
    const ddx = cam.x - BEDS.door.x, ddz = cam.z - BEDS.door.z; mDoor.visible = ddx * ddx + ddz * ddz < 160 * 160;
  });

  const meshes = [mDoor, mStone, mWay, mRoots, mGlow, GL.mesh];
  ctx.beds = {
    floor, line: L, meshes, lights, cut: G.cut, get capped() { return capped; }, roots: RT, overRooms, ground: G.mesh,
    stats() { let tris = 0; for (const m of meshes) tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; return { draws: meshes.length + (G.mesh ? 1 : 0), tris: Math.round(tris), ground: G.tris, cut: G.cut }; },
  };
  void COL;
  await ctx.progress?.('the lower beds', 1);
}
