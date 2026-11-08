// The Armiger's Tower as it stood to v4 (`?tower=v2`): a tall slender watchtower on its hill. Crenellated,
// slitted, one window lit near the top, a banner that still flies. A low ruined barmkin wall rings the hilltop.
import * as THREE from 'three';
import { mat } from '../geo.js';
import { vary, rubblePile } from '../common.js';
import { CAUSEWAY } from '../../world.js'; // v4 map: placed by the v3 stretch of the road (gate to tower hill), which CAUSEWAY_V4 keeps

export function buildTowerV2(ctx, B, env) {
  const { rng, ground, tints } = env;
  const L = ctx.landmarks.tower;
  const x = L.x, z = L.z;
  const gm = ground.groundAt(x, z), gb = ground.minGround(x, z, 4.2) - 0.6;
  const rOut = 3.0, rIn = 2.0, shaftTop = 21.0;
  const sectors = 18, da = Math.PI * 2 / sectors;
  const course = 0.42;
  const tint = vary(tints.stone, rng, 0.04).multiplyScalar(0.92);
  // the window looks back down the causeway toward the keep
  const end = CAUSEWAY[CAUSEWAY.length - 1];
  const winA = Math.atan2(end.z - z, end.x - x);
  const winS = Math.round(winA / da - 0.5);
  const winY0 = 18.2, winY1 = 19.8;

  // battered plinth
  B.add(B.cyl(rOut + 0.35, rOut + 1.05, 2.6 + (gm - gb), 18, 2), mat(x, gb + (2.6 + gm - gb) / 2, z), { color: vary(tint, rng, 0.04), course, moss: 0.95, ground: gm, disp: 0.06 });
  B.add(B.cyl(rOut + 0.42, rOut + 0.42, 0.28, 18, 1), mat(x, gm + 2.7, z), { color: vary(tints.old, rng, 0.04), moss: 0.8, ground: gm, disp: 0.03 });
  // shaft of curved blocks, with a doorway raised above the ground on the east
  const doorA = winA + 0.2;
  for (let s = 0; s < sectors; s++) {
    const a0 = s * da, a1 = a0 + da, am = a0 + da / 2;
    const gaps = [];
    let d = Math.abs(am - doorA) % (Math.PI * 2); if (d > Math.PI) d = Math.PI * 2 - d;
    if (d < da * 0.55) gaps.push([2.9, 5.0]);
    const sw = ((s - winS) % sectors + sectors) % sectors;
    if (sw === 0) gaps.push([winY0, winY1]);
    let y = 2.6;
    for (const [y0, y1] of gaps) {
      B.add(B.wedge(a0, a1, rIn, rOut, y, y0, 2, Math.ceil((y0 - y) / 1.4)), mat(x, gm, z), { color: vary(tint, rng, 0.04), course, moss: 0.65, ground: gm });
      B.add(B.wedge(a0 - 0.04, a1 + 0.04, rIn, rOut + 0.07, y1, y1 + 0.32, 2, 1), mat(x, gm, z), { color: vary(tints.old, rng, 0.05), moss: 0.4, ground: gm });
      B.add(B.wedge(a0 - 0.03, a1 + 0.03, rIn, rOut + 0.12, y0 - 0.12, y0, 2, 1), mat(x, gm, z), { color: vary(tints.old, rng, 0.05), moss: 0.4, ground: gm });
      y = y1 + 0.32;
    }
    B.add(B.wedge(a0, a1, rIn, rOut, y, shaftTop, 2, Math.ceil((shaftTop - y) / 1.4)), mat(x, gm, z), { color: vary(tint, rng, 0.04), course, moss: 0.6, ground: gm });
    // arrow slits climbing the shaft in a loose spiral
    for (let k = 0; k < 3; k++) {
      const sy = 6 + ((s * 5 + k * 7) % 13) * 0.95;
      if (sw === 0 || d < da || (s + k) % 3 !== 0 || sy > 19.5) continue;
      const r = rOut + 0.025;
      B.add(B.box(0.09, 0.95, 0.1), mat(x + Math.cos(am) * r, gm + sy, z + Math.sin(am) * r, 0, Math.PI / 2 - am, 0), { color: tints.black, moss: 0, ground: gm });
    }
    // corbels carrying the parapet
    const r = rOut + 0.2;
    B.add(B.box(0.36, 0.5, 0.45, { chip: 0.04 }), mat(x + Math.cos(am) * r, gm + shaftTop - 0.05, z + Math.sin(am) * r, 0, Math.PI / 2 - am, 0), { color: vary(tints.old, rng, 0.05), moss: 0.4, ground: gm });
  }
  // the lit window: a warm room glimpsed through iron bars
  {
    const am = (winS + 0.5) * da;
    const rr = rIn + 0.05;
    const cx = x + Math.cos(am) * rr, cz = z + Math.sin(am) * rr;
    B.add(B.box(1.05, winY1 - winY0, 0.05), mat(cx, gm + (winY0 + winY1) / 2, cz, 0, Math.PI / 2 - am, 0), { color: new THREE.Color(0.05, 0.03, 0.02), moss: 0, ground: gm, emit: [1.6, 0.62, 0.2, 1] });
    const ro = rOut - 0.15;
    const bx = x + Math.cos(am) * ro, bz = z + Math.sin(am) * ro;
    for (const off of [-0.18, 0.18]) {
      const tx = -Math.sin(am) * off, tz = Math.cos(am) * off;
      B.add(B.box(0.035, winY1 - winY0, 0.035), mat(bx + tx, gm + (winY0 + winY1) / 2, bz + tz), { color: tints.iron, iron: 1, moss: 0, ground: gm });
    }
    B.add(B.box(0.035, 0.035, 1.0), mat(bx, gm + (winY0 + winY1) / 2 + 0.2, bz, 0, Math.PI / 2 - am + Math.PI / 2, 0), { color: tints.iron, iron: 1, moss: 0, ground: gm });
    env.rust.push([bx + Math.cos(am) * 0.18, gm + winY0, bz + Math.sin(am) * 0.18, 2.4]);
    // the light itself, just outside, so it warms the jambs and the stone below
    const light = new THREE.PointLight(new THREE.Color('#ff8a3c'), 6, 11, 2);
    light.position.set(x + Math.cos(am) * (rOut + 0.6), gm + (winY0 + winY1) / 2, z + Math.sin(am) * (rOut + 0.6));
    ctx.scene.add(light);
    (env.updates ||= []).push((dt, t, f, flame) => { light.intensity = 6 * flame * (0.3 + 0.7 * f); });
    env.notes.towerWindow = { x: light.position.x, y: light.position.y, z: light.position.z };
  }
  // parapet with merlons, a slate cone inside it, the pole
  {
    const pr0 = rOut - 0.1, pr1 = rOut + 0.5;
    const ps = 24, pda = Math.PI * 2 / ps;
    for (let s = 0; s < ps; s++) {
      const a0 = s * pda, a1 = a0 + pda;
      const merlon = s % 2 === 0 && rng() > 0.12;
      const top = shaftTop + 1.15 + (merlon ? 0.9 + (rng() - 0.5) * 0.15 : 0) - (rng() < 0.08 ? 0.5 : 0);
      B.add(B.wedge(a0 - 0.002, a1 + 0.002, pr0, pr1, shaftTop + 0.2, top, 1, 2), mat(x, gm, z), { color: vary(tint, rng, 0.06), course, moss: 0.7, ground: gm, disp: 0.03 });
    }
    B.add(B.cyl(0.0, rOut - 0.2, 3.6, 18, 3), mat(x, gm + shaftTop + 1.8 + 0.3, z), { color: vary(tints.slate, rng, 0.06), moss: 0.5, ground: gm, disp: 0.04, dispScale: 2 });
    const pole = 4.2;
    B.add(B.cyl(0.06, 0.08, pole, 6, 2), mat(x, gm + shaftTop + 3.6 + pole / 2, z), { color: tints.iron, iron: 1, moss: 0, ground: gm });
    B.add(B.cyl(0.0, 0.1, 0.4, 6, 1), mat(x, gm + shaftTop + 3.7 + pole, z), { color: tints.iron, iron: 1, moss: 0, ground: gm });
    env.banners.add(new THREE.Vector3(x + 0.07, gm + shaftTop + 3.6 + pole - 0.15, z), new THREE.Vector3(0.93, 0, -0.36), 3.2, 1.8, 4.4, 1);
  }
  ctx.addCollider({ x, z, r: rOut + 0.9 });

  // a barmkin ring around the hilltop, mostly fallen
  const R = 9.5, n = 30;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let d = Math.abs(a - winA) % (Math.PI * 2); if (d > Math.PI) d = Math.PI * 2 - d;
    if (d < 0.17) continue; // its gate, toward the causeway
    const h = Math.max(0, 0.6 + 1.7 * (0.5 + 0.5 * Math.sin(a * 3 + 1.1)) * (0.6 + 0.4 * rng()) - (rng() < 0.25 ? 1.2 : 0));
    if (h < 0.35) continue;
    const px = x + Math.cos(a) * R, pz = z + Math.sin(a) * R;
    const g0 = ground.groundAt(px, pz), gl = ground.minGround(px, pz, 1.2) - 0.3;
    const H = h + g0 - gl;
    B.add(B.box(2.1, H, 0.9, { chip: 0.16, chipTop: true, seed: i, uvOffset: [i * 2, 0] }), mat(px, gl + H / 2, pz, 0, Math.PI / 2 - a, 0), { color: vary(tints.stone, rng, 0.08), course: 0.38, moss: 0.9, ground: g0, disp: 0.05 });
    if (h > 1.0) ctx.addCollider({ x: px, z: pz, r: 0.9 });
  }
  for (let i = 0; i < 5; i++) {
    const a = rng() * Math.PI * 2;
    rubblePile(B, env, x + Math.cos(a) * (R + 1.5), z + Math.sin(a) * (R + 1.5), 2.2, 14, { height: 0.5, size: 0.5 });
  }
}
