// The leavings of a long rule, scattered across the region: broken statuary half-sunk in the grass
// (hands, crowned heads, robed torsos), a ruined aqueduct striding from the castle hill toward the
// court, solitary arches and doorways to nowhere, a hermit's shrine with a weathered seated figure,
// toppled obelisks with worn glyph bands, a walled graveyard near the orchard, broken hex paving
// surfacing through the turf, and a gibbet by the causeway. Repeated fragments are instanced.
import * as THREE from 'three';
import { Builder, mat } from './geo.js';
import { vary, rubblePile, findSpot, hexCellsIn } from './common.js';
import { causewayAt } from './causeway.js';

export function buildScatter(ctx, B, env) {
  const { rng, ground, tints } = env;
  const T = ctx.terrain;
  const N2 = ctx.noise.noise2;
  const inst = (env.instanced ||= []);
  const tintOld = vary(tints.old, rng, 0.03).multiplyScalar(0.85);

  // ---------- instanced statuary ----------
  const templ = (fn) => { const TB = new Builder(ctx.noise); fn(TB); return TB.build(); };
  const handGeo = templ((TB) => makeHand(TB, tintOld));
  const headGeo = templ((TB) => makeCrownedHead(TB, ctx, tintOld));
  const torsoGeo = templ((TB) => makeTorso(TB, tintOld));
  const obeliskGeo = templ((TB) => makeObelisk(TB, tintOld, tints, rng));
  const graveGeo = templ((TB) => makeGravestone(TB, tintOld, tints));
  const ashlarGeo = templ((TB) => TB.add(TB.box(1.0, 0.55, 0.7, { chip: 0.09 }), mat(0, 0, 0), { color: tintOld, course: 0, moss: 0.9, ground: -0.3, disp: 0.03, dispScale: 2.5 }));
  const drumGeo = templ((TB) => TB.add(TB.cyl(0.55, 0.56, 0.8, 16, 1, false, { flute: 0.05, flutes: 14 }), mat(0, 0, 0), { color: tintOld, moss: 0.9, ground: -0.4, disp: 0.03, dispScale: 2.5 }));
  const sets = {
    hand: { name: 'frag-hands', geo: handGeo, mats: [], cols: [], material: 'stone', cast: true },
    head: { name: 'frag-heads', geo: headGeo, mats: [], cols: [], material: 'stone', cast: true },
    torso: { name: 'frag-torsos', geo: torsoGeo, mats: [], cols: [], material: 'stone', cast: true },
    obelisk: { name: 'obelisks', geo: obeliskGeo, mats: [], cols: [], material: 'stone', cast: true },
    grave: { name: 'gravestones', geo: graveGeo, mats: [], cols: [], material: 'stone', cast: true },
    ashlar: { name: 'ashlars', geo: ashlarGeo, mats: [], cols: [], material: 'stone', cast: true },
    drum: { name: 'drums', geo: drumGeo, mats: [], cols: [], material: 'stone', cast: true },
  };
  for (const s of Object.values(sets)) inst.push(s);
  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), UP = new THREE.Vector3(0, 1, 0), _n = new THREE.Vector3();
  const put = (set, x, z, o) => {
    const gy = ground.groundAt(x, z);
    ground.groundNormal(x, z, _n, 1.0);
    _q.setFromUnitVectors(UP, _n);
    _e.set(o.rx || 0, o.ry ?? rng() * 6.28, o.rz || 0, 'YXZ');
    _q.multiply(_q2.setFromEuler(_e));
    const s = o.s || 1;
    set.mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, gy + (o.y || 0) * s, z), _q.clone(), new THREE.Vector3(s, s, s)));
    set.cols.push(new THREE.Color(1, 1, 1).multiplyScalar(0.85 + rng() * 0.3));
    if (o.r) ctx.addCollider({ x, z, r: o.r * s });
  };
  // hands: palm up or palm down, sunk to the wrist; a few colossal
  for (let i = 0; i < 7; i++) {
    const p = findSpot(env, { slope: 0.4, sep: 18, size: 3 });
    if (!p) continue;
    const s = i === 0 ? 2.6 : 1.1 + rng() * 0.9;
    put(sets.hand, p.x, p.z, { s, y: -0.12, rx: (rng() - 0.5) * 0.3, rz: rng() < 0.5 ? 0.15 : Math.PI - 0.25, r: 0.8 });
  }
  // crowned heads: on their sides, chins in the turf
  for (let i = 0; i < 7; i++) {
    const p = findSpot(env, { slope: 0.4, sep: 18, size: 3 });
    if (!p) continue;
    const s = 1.0 + rng() * 0.9;
    put(sets.head, p.x, p.z, { s, y: 0.35, rz: Math.PI / 2 + (rng() - 0.5) * 0.4, rx: (rng() - 0.5) * 0.4, r: 0.75 });
  }
  // robed torsos: lying, or upright to the waist in the ground
  for (let i = 0; i < 7; i++) {
    const p = findSpot(env, { slope: 0.4, sep: 18, size: 3 });
    if (!p) continue;
    const s = 1.1 + rng() * 0.8;
    if (i % 2) put(sets.torso, p.x, p.z, { s, y: 0.32, rx: Math.PI / 2 - 0.1, r: 0.6 });
    else put(sets.torso, p.x, p.z, { s, y: -0.35, rx: (rng() - 0.5) * 0.35, rz: (rng() - 0.5) * 0.35, r: 0.6 });
  }
  // obelisks: toppled, broken, one still leaning on its base
  for (let i = 0; i < 8; i++) {
    const p = findSpot(env, { slope: 0.3, sep: 24, size: 5 });
    if (!p) continue;
    const s = 0.9 + rng() * 0.4;
    if (i === 0) {
      put(sets.obelisk, p.x, p.z, { s, y: -0.3, rx: 0.12, rz: 0.06, r: 0.9 });
    } else {
      put(sets.obelisk, p.x, p.z, { s, y: 0.45, rx: Math.PI / 2 + (rng() - 0.5) * 0.08, rz: (rng() - 0.5) * 0.2, r: 0 });
      // colliders along the fallen shaft
      const ry = sets.obelisk.mats.length;
      void ry;
      ctx.addCollider({ x: p.x, z: p.z, r: 0.8 });
      rubblePile(B, env, p.x + (rng() - 0.5) * 2, p.z + (rng() - 0.5) * 2, 1.4, 6, { height: 0.2, size: 0.4, tint: tintOld });
    }
  }

  // ---------- fallen dressed stone everywhere: ashlars and column drums in loose clusters ----------
  for (let c = 0; c < 95; c++) {
    const p = findSpot(env, { slope: 0.45, sep: 8, size: 3, causeway: 5 });
    if (!p) continue;
    const n = 3 + Math.floor(rng() * 7);
    const drums = rng() < 0.35;
    for (let k = 0; k < n; k++) {
      const a = rng() * 6.28, d = rng() * 4;
      const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      const sc = 0.7 + rng() * 0.8;
      if (drums && k % 2 === 0) put(sets.drum, x, z, { s: sc, y: rng() < 0.5 ? 0.2 : 0.35, rx: rng() < 0.6 ? Math.PI / 2 : (rng() - 0.5) * 0.2, rz: (rng() - 0.5) * 0.2 });
      else put(sets.ashlar, x, z, { s: sc, y: 0.1 + rng() * 0.12, rx: (rng() - 0.5) * 0.4, rz: (rng() - 0.5) * 0.4 });
    }
  }

  // ---------- house foundations: low wall outlines, a doorway, a hearthstone ----------
  for (let i = 0; i < 26; i++) {
    const p = findSpot(env, { slope: 0.3, sep: 12, size: 6 });
    if (!p) continue;
    const w = 5 + rng() * 5, d = 4 + rng() * 3.5, yaw = rng() * Math.PI;
    const ca = Math.cos(yaw), sa = Math.sin(yaw);
    const toW = (lx, lz) => [p.x + ca * lx + sa * lz, p.z - sa * lx + ca * lz];
    const door = Math.floor(rng() * 4);
    const col = vary(tints.stone, rng, 0.08).multiplyScalar(0.9);
    const edges = [[-w / 2, -d / 2, w / 2, -d / 2], [w / 2, -d / 2, w / 2, d / 2], [w / 2, d / 2, -w / 2, d / 2], [-w / 2, d / 2, -w / 2, -d / 2]];
    edges.forEach(([x0, z0, x1, z1], ei) => {
      const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 1.3));
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        if (ei === door && Math.abs(t - 0.5) < 0.12) continue;
        const h = 0.25 + Math.max(0, N2(p.x + k * 0.4, p.z + ei) * 0.7 + 0.35) * (rng() < 0.15 ? 0.3 : 1);
        if (h < 0.3 && rng() < 0.5) continue;
        const [x, z] = toW(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t);
        const gm = ground.groundAt(x, z), gb = ground.minGround(x, z, 0.7) - 0.25;
        B.add(B.box(L / n + 0.03, h + gm - gb, 0.62, { chip: 0.1, chipTop: true, seed: x + z }), mat(x, gb + (h + gm - gb) / 2, z, 0, yaw + Math.atan2(-(z1 - z0), x1 - x0), 0), { color: vary(col, rng, 0.06), course: 0.28, moss: 1, ground: gm, disp: 0.04, dispScale: 2.4 });
      }
    });
    const [hx, hz] = toW((rng() - 0.5) * w * 0.4, (rng() - 0.5) * d * 0.4), hg = ground.groundAt(hx, hz);
    B.add(B.box(1.1, 0.2, 0.9, { chip: 0.05 }), mat(hx, hg - 0.02, hz, 0, yaw, 0), { color: vary(tints.dark, rng, 0.1), moss: 0.4, ground: hg - 0.3 });
  }

  // ---------- old field walls wandering over the moor, broken into runs ----------
  for (let i = 0; i < 7; i++) {
    const p = findSpot(env, { slope: 0.3, sep: 10, size: 4 });
    if (!p) continue;
    let x = p.x, z = p.z, dir = rng() * 6.28;
    const steps = 30 + Math.floor(rng() * 40);
    for (let k = 0; k < steps; k++) {
      dir += N2(x * 0.02 + i, z * 0.02) * 0.12;
      const nx = x + Math.cos(dir) * 1.5, nz = z + Math.sin(dir) * 1.5;
      const r = Math.hypot(nx, nz);
      if (r > 280 || T.causewayDistance(nx, nz) < 5 || T.slopeAt(nx, nz) > 0.6 || T.heightAt(nx, nz) < -2.2) break;
      let wet = false; for (const w of Object.values(ctx.water)) if (Math.hypot(nx - w.x, nz - w.z) < w.r + 4) wet = true;
      if (wet) break;
      const h = 0.45 + 0.5 * (0.5 + 0.5 * N2(k * 0.15 + i * 3, 1.7));
      if (N2(k * 0.21 + i * 7, 9.3) > 0.3) { x = nx; z = nz; continue; }
      const mx = (x + nx) / 2, mz = (z + nz) / 2;
      const gm = ground.groundAt(mx, mz), gb = ground.minGround(mx, mz, 0.8) - 0.2;
      B.add(B.box(1.56, h + gm - gb, 0.55, { chip: 0.12, chipTop: true, seed: k + i * 100 }), mat(mx, gb + (h + gm - gb) / 2, mz, 0, -dir, (rng() - 0.5) * 0.04), { color: vary(tints.scree, rng, 0.12), course: 0.22, moss: 1, ground: gm, disp: 0.05, dispScale: 2.5 });
      x = nx; z = nz;
    }
  }

  // ---------- the aqueduct: from the castle hill toward the court, most of it fallen ----------
  {
    const a = { x: 26, z: -4 }, b = { x: -24, z: -138 };
    const L = Math.hypot(b.x - a.x, b.z - a.z);
    const dx = (b.x - a.x) / L, dz = (b.z - a.z) / L;
    const yaw = Math.atan2(dx, dz); // local z along the line
    const span = 7.2, n = Math.floor(L / span);
    const topA = 17.2, topB = 9.5;
    const piers = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = a.x + dx * i * span, z = a.z + dz * i * span;
      const top = topA + (topB - topA) * t;
      const gm = ground.groundAt(x, z), gb = ground.minGround(x, z, 1.5) - 0.4;
      const ok = T.causewayDistance(x, z) > 6 && top - gm > 2.5;
      const standing = ok && (N2(i * 0.45 + 2.0, 7.1) > -0.05 || i < 2) && rng() > 0.18;
      piers.push({ x, z, gm, gb, top, standing, ok });
    }
    for (let i = 0; i < piers.length; i++) {
      const p = piers[i];
      if (!p.ok) continue;
      const col = vary(tints.stone, rng, 0.05);
      const h = p.standing ? p.top - 1.2 - p.gb : 0.6 + rng() * 2.2 + (p.gm - p.gb);
      B.add(B.box(2.3, h, 1.7, { seg: 0.9, chip: 0.2, chipTop: !p.standing, seed: i, uvOffset: [i * 3, 0] }), mat(p.x, p.gb + h / 2, p.z, 0, yaw + Math.PI / 2, 0), { color: col, course: 0.5, moss: 0.85, ground: p.gm, disp: 0.05 });
      B.add(B.box(2.9, 0.5, 2.3, { chip: 0.15 }), mat(p.x, p.gm + 0.1, p.z, 0, yaw + Math.PI / 2, 0), { color: vary(tints.stone, rng, 0.06), moss: 1, ground: p.gm, disp: 0.04 });
      if (p.standing) {
        // impost moulding where the arches spring
        B.add(B.box(2.6, 0.32, 2.0, { chip: 0.06 }), mat(p.x, p.top - 1.2 - 3.6 + 0.16, p.z, 0, yaw + Math.PI / 2, 0), { color: vary(tints.old, rng, 0.05), moss: 0.7, ground: p.gm });
      } else {
        // the fallen pier's blocks downhill of it
        rubblePile(B, env, p.x + (rng() - 0.5) * 4, p.z + (rng() - 0.5) * 4, 3.2, 18, { height: 0.7, size: 0.75, blocks: 0.6 });
      }
      ctx.addCollider({ x: p.x, z: p.z, r: 1.4 });
      const q = piers[i + 1];
      if (q && p.standing && q.standing) {
        // the arch and the channel it carried
        const top = (p.top + q.top) / 2 - 1.2;
        const half = (span - 2.3) / 2;
        const sh = new THREE.Shape();
        const spring = -3.6 + 0.32;
        sh.moveTo(-half - 1.17, 1.3); sh.lineTo(half + 1.17, 1.3); sh.lineTo(half + 1.17, spring - 0.01); sh.lineTo(half, spring);
        sh.absarc(0, spring, half, 0, Math.PI, false);
        sh.lineTo(-half - 1.17, spring - 0.01); sh.lineTo(-half - 1.17, 1.3);
        const eg = B.extrude(sh, 1.7, 10);
        const mx = (p.x + q.x) / 2, mz = (p.z + q.z) / 2;
        // the extrude's local x runs along the line
        B.add(eg, mat(mx, top - 0.0, mz, 0, yaw - Math.PI / 2, Math.atan2(p.top - q.top, span)), { color: vary(tints.stone, rng, 0.05), course: 0.5, moss: 0.85, ground: Math.min(p.gm, q.gm), disp: 0.04 });
        // channel walls on top, broken in places
        for (const s of [-1, 1]) {
          if (rng() < 0.3) continue;
          const ox = -dz * s * 0.68, oz = dx * s * 0.68;
          B.add(B.box(0.34, 0.5, span + 0.02, { chip: 0.08, chipTop: true }), mat(mx + ox, top + 1.3 + 0.25, mz + oz, -Math.atan2(p.top - q.top, span), yaw, 0), { color: vary(tints.stone, rng, 0.06), moss: 0.95, ground: top - 4 });
        }
      }
    }
  }

  // ---------- solitary arches and doorways leading nowhere ----------
  for (let i = 0; i < 4; i++) {
    const p = findSpot(env, { slope: 0.3, sep: 30, size: 4 });
    if (!p) continue;
    const gm = ground.groundAt(p.x, p.z), gb = ground.minGround(p.x, p.z, 2.4) - 0.3;
    const yaw = rng() * Math.PI;
    const ca = Math.cos(yaw), sa = Math.sin(yaw);
    const col = vary(tints.old, rng, 0.05).multiplyScalar(0.85);
    if (i % 2 === 0) {
      // a freestanding arch with a moulded archivolt and a keystone
      const half = 1.4 + rng() * 0.6, ph = 2.6 + rng() * 0.8;
      for (const s of [-1, 1]) {
        const x = p.x + ca * s * (half + 0.45), z = p.z - sa * s * (half + 0.45);
        const H = ph + gm - gb;
        B.add(B.box(0.9, H, 1.0, { chip: 0.12, seed: s + i }), mat(x, gb + H / 2, z, 0, yaw, 0), { color: col, course: 0.48, moss: 0.9, ground: gm, disp: 0.03 });
        B.add(B.box(1.2, 0.25, 1.25, { chip: 0.05 }), mat(x, gm + ph - 0.12, z, 0, yaw, 0), { color: vary(tints.old, rng, 0.05), moss: 0.8, ground: gm });
        B.add(B.box(1.25, 0.4, 1.3, { chip: 0.08 }), mat(x, gm + 0.15, z, 0, yaw, 0), { color: col, moss: 1, ground: gm });
        ctx.addCollider({ x, z, r: 0.7 });
      }
      const sh = new THREE.Shape();
      sh.moveTo(-half - 0.9, 0); sh.lineTo(-half - 0.9, half + 0.8); sh.lineTo(half + 0.9, half + 0.8); sh.lineTo(half + 0.9, 0); sh.lineTo(half, 0);
      sh.absarc(0, 0, half, 0, Math.PI, false); sh.lineTo(-half - 0.9, 0);
      B.add(B.extrude(sh, 0.95, 12), mat(p.x, gm + ph, p.z, 0, yaw, 0), { color: col, course: 0.48, moss: 0.85, ground: gm, disp: 0.03 });
      for (let k = 0; k < 9; k++) {
        const a = (k + 0.5) / 9 * Math.PI;
        B.add(B.box(0.3, 0.16, 1.05, { chip: 0.04 }), mat(p.x + ca * Math.cos(a) * (half + 0.12), gm + ph + Math.sin(a) * (half + 0.12), p.z - sa * Math.cos(a) * (half + 0.12), 0, yaw, a - Math.PI / 2, 1, 1, 1, 'YXZ'), { color: vary(tints.old, rng, 0.04), moss: 0.6, ground: gm });
      }
      B.add(B.box(0.42, 0.62, 1.08, { chip: 0.04 }), mat(p.x, gm + ph + half + 0.18, p.z, 0, yaw, 0), { color: vary(tints.old, rng, 0.04), moss: 0.5, ground: gm });
      rubblePile(B, env, p.x + sa * 2.5, p.z + ca * 2.5, 2.0, 10, { height: 0.3, size: 0.45, tint: col });
    } else {
      // a doorway: jambs, a lintel with a carved band, a worn step, and nothing behind it
      const w = 1.5, H = 3.0;
      for (const s of [-1, 1]) {
        const x = p.x + ca * s * (w / 2 + 0.35), z = p.z - sa * s * (w / 2 + 0.35);
        const hh = H + gm - gb;
        B.add(B.box(0.7, hh, 0.8, { chip: 0.08, seed: s * 3 + i }), mat(x, gb + hh / 2, z, 0, yaw, 0), { color: col, course: 0.6, moss: 0.9, ground: gm, disp: 0.025 });
        ctx.addCollider({ x, z, r: 0.55 });
      }
      B.add(B.box(w + 1.9, 0.75, 0.95, { chip: 0.1 }), mat(p.x, gm + H + 0.37, p.z, 0, yaw, (rng() - 0.5) * 0.04), { color: vary(tints.old, rng, 0.04), moss: 0.7, ground: gm, disp: 0.02 });
      for (let k = 0; k < 7; k++) B.add(B.box(0.06, 0.32, 0.03), mat(p.x + ca * (k - 3) * 0.36 + sa * 0.48, gm + H + 0.37, p.z - sa * (k - 3) * 0.36 + ca * 0.48, 0, yaw, k % 2 ? 0.6 : -0.6), { color: tints.carve, moss: 0.2, ground: gm });
      B.add(B.box(w + 1.2, 0.25, 1.4, { chip: 0.06 }), mat(p.x + sa * 0.3, gm + 0.05, p.z + ca * 0.3, 0, yaw, 0), { color: vary(tints.old, rng, 0.05), moss: 0.8, ground: gm - 0.3 });
    }
  }

  // ---------- a hermit's shrine: a corbelled cell, half fallen, and a niche with a seated figure ----------
  {
    const p = findSpot(env, { slope: 0.3, sep: 30, size: 6, near: { x: -100, z: -100, r: 60 } }) || findSpot(env, { slope: 0.3, sep: 30, size: 6 });
    if (p) {
      const gm = ground.groundAt(p.x, p.z);
      // beehive cell: rings of stone stepping inward, the top fallen in
      for (let l = 0; l < 9; l++) {
        const r0 = 2.2 - l * 0.22, y0 = l * 0.36;
        const segs = 14;
        for (let s = 0; s < segs; s++) {
          if (l > 5 && (s < 4 || s > 11)) continue;
          if (l < 5 && s === 0) continue; // the low door
          const a0 = (s / segs) * Math.PI * 2, a1 = a0 + Math.PI * 2 / segs;
          B.add(B.wedge(a0, a1 + 0.01, r0 - 0.55, r0, y0 - (l === 0 ? 0.5 : 0), y0 + 0.37, 1, 1), mat(p.x, gm, p.z), { color: vary(tints.scree, rng, 0.1), course: 0.36, moss: 1, ground: gm, disp: 0.04, dispScale: 2.5 });
        }
      }
      for (let s = 0; s < 10; s++) { const a = (s / 10) * 6.28 + 0.3; ctx.addCollider({ x: p.x + Math.cos(a) * 1.9, z: p.z + Math.sin(a) * 1.9, r: 0.5 }); }
      // the niche, and the figure in it, its face rubbed away by prayer or weather
      const nx = p.x + 4.2, nz = p.z + 1.2, ng = ground.groundAt(nx, nz);
      const yaw = Math.atan2(p.x - nx, p.z - nz) + Math.PI;
      const m = mat(nx, ng, nz, 0, yaw, 0);
      const add = (g, lm, o) => B.add(g, m.clone().multiply(lm), o);
      const tr = (x, y, z, rx = 0, ry = 0, rz = 0) => mat(x, y, z, rx, ry, rz);
      add(B.box(2.0, 0.6, 1.4, { chip: 0.1 }), tr(0, 0.15, 0), { color: tintOld, moss: 1, ground: ng });
      for (const s of [-1, 1]) add(B.box(0.4, 2.4, 1.0, { chip: 0.08 }), tr(s * 0.8, 1.6, -0.1), { color: tintOld, course: 0.5, moss: 0.9, ground: ng, disp: 0.02 });
      add(B.box(2.1, 0.5, 1.2, { chip: 0.08 }), tr(0, 3.05, -0.1), { color: tintOld, moss: 0.9, ground: ng });
      add(B.cyl(0.0, 1.05, 0.7, 4, 1), tr(0, 3.65, -0.1, 0, Math.PI / 4, 0), { color: tintOld, moss: 1, ground: ng });
      add(B.box(1.25, 2.4, 0.2), tr(0, 1.65, -0.55), { color: vary(tints.dark, rng, 0.05), moss: 0.7, ground: ng });
      const body = B.lathe([[0, 0], [0.42, 0], [0.45, 0.25], [0.38, 0.6], [0.28, 0.95], [0.3, 1.1], [0.18, 1.2], [0, 1.22]], 12);
      add(body, tr(0, 0.45, -0.15, 0, 0, 0), { color: tintOld, moss: 0.8, ground: ng, disp: 0.02, dispScale: 4 });
      add(B.rock(0.17, 1, 0.9, 1.15, 0.95), tr(0, 1.8, -0.1), { color: tintOld, moss: 0.6, ground: ng, disp: 0.015, dispScale: 6 });
      add(B.box(0.7, 0.18, 0.3, { chip: 0.03 }), tr(0, 1.15, 0.16, 0.3, 0, 0), { color: tintOld, moss: 0.6, ground: ng });
      // offerings long gone: a hollowed stone bowl before it
      add(B.cyl(0.32, 0.24, 0.25, 10, 1), tr(0, 0.12, 1.1), { color: tintOld, moss: 0.9, ground: ng });
      ctx.addCollider({ x: nx, z: nz, r: 1.1 });
      env.notes.shrine = { x: +p.x.toFixed(1), z: +p.z.toFixed(1) };
    }
  }

  // ---------- a walled graveyard near the orchard ----------
  {
    const O = ctx.landmarks.orchard;
    const p = findSpot(env, { slope: 0.25, sep: 10, size: 10, near: { x: O.x - 30, z: O.z + 40, r: 25 }, landmarkPad: 4 })
      || findSpot(env, { slope: 0.3, sep: 10, size: 10, near: { x: O.x, z: O.z, r: O.r + 30 }, nearMin: O.r + 6, landmarkPad: 2 });
    if (p) {
      const W = 16, Dp = 11, yaw = rng() * 0.6 - 0.3;
      const ca = Math.cos(yaw), sa = Math.sin(yaw);
      const toW = (lx, lz) => [p.x + ca * lx + sa * lz, p.z - sa * lx + ca * lz];
      // drystone wall, gaps where it fell, a gate gap in the south side
      const run = (x0, z0, x1, z1) => {
        const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / 1.2);
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n, lx = x0 + (x1 - x0) * t, lz = z0 + (z1 - z0) * t;
          if (Math.abs(lz - Dp / 2) < 0.1 && Math.abs(lx) < 1.2) continue;
          const h = 1.0 + (rng() - 0.5) * 0.25 - (N2(lx * 0.3 + p.x, lz * 0.3) > 0.35 ? 0.7 : 0);
          if (h < 0.4) continue;
          const [x, z] = toW(lx, lz);
          const gm = ground.groundAt(x, z), gb = ground.minGround(x, z, 0.7) - 0.2;
          B.add(B.box(1.24, h + gm - gb, 0.6, { chip: 0.1, chipTop: true, seed: i + x }), mat(x, gb + (h + gm - gb) / 2, z, 0, yaw + Math.atan2(-(z1 - z0), x1 - x0), 0), { color: vary(tints.scree, rng, 0.08), course: 0.24, moss: 1, ground: gm, disp: 0.04, dispScale: 2.4 });
          if (h > 0.8) ctx.addCollider({ x, z, r: 0.45 });
        }
      };
      run(-W / 2, -Dp / 2, W / 2, -Dp / 2); run(W / 2, -Dp / 2, W / 2, Dp / 2); run(W / 2, Dp / 2, -W / 2, Dp / 2); run(-W / 2, Dp / 2, -W / 2, -Dp / 2);
      // gateposts with ball finials
      for (const s of [-1, 1]) {
        const [x, z] = toW(s * 1.3, Dp / 2), gm = ground.groundAt(x, z);
        B.add(B.box(0.55, 1.7, 0.55, { chip: 0.06 }), mat(x, gm + 0.7, z, 0, yaw, 0), { color: tintOld, moss: 0.9, ground: gm });
        if (s < 0) B.add(B.rock(0.26, 1, 1, 1, 1), mat(x, gm + 1.8, z), { color: tintOld, moss: 0.8, ground: gm, disp: 0.01 });
      }
      // the stones, in rows, leaning every way
      for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
        if (rng() < 0.18) continue;
        const lx = -W / 2 + 1.6 + c * (W - 3.2) / 7 + (rng() - 0.5) * 0.4, lz = -Dp / 2 + 1.6 + r * (Dp - 3.4) / 3 + (rng() - 0.5) * 0.3;
        const [x, z] = toW(lx, lz);
        const fallen = rng() < 0.15;
        put(sets.grave, x, z, fallen
          ? { s: 0.9 + rng() * 0.3, y: 0.08, ry: yaw + (rng() - 0.5) * 0.5, rx: -Math.PI / 2 + 0.05 }
          : { s: 0.8 + rng() * 0.45, y: -0.15, ry: yaw + (rng() - 0.5) * 0.3, rx: (rng() - 0.5) * 0.45, rz: (rng() - 0.5) * 0.35, r: 0.3 });
      }
      // a great tomb in the middle: a lidded chest on a plinth, the lid askew
      const [tx, tz] = toW(0, -0.3), tg = ground.groundAt(tx, tz);
      B.add(B.box(2.6, 0.4, 1.5, { chip: 0.08 }), mat(tx, tg + 0.1, tz, 0, yaw, 0), { color: tintOld, moss: 1, ground: tg });
      B.add(B.box(2.2, 0.85, 1.1, { chip: 0.06 }), mat(tx, tg + 0.7, tz, 0, yaw, 0), { color: tintOld, course: 0.85, moss: 0.85, ground: tg, disp: 0.02 });
      B.add(B.box(2.5, 0.22, 1.35, { chip: 0.07 }), mat(tx + 0.25, tg + 1.24, tz + 0.1, 0.04, yaw + 0.12, 0.05), { color: vary(tints.old, rng, 0.05), moss: 0.9, ground: tg });
      ctx.addCollider({ x: tx, z: tz, r: 1.3 });
      env.notes.graveyard = { x: +p.x.toFixed(1), z: +p.z.toFixed(1) };
    }
  }

  // ---------- a gibbet by the causeway ----------
  {
    const c = causewayAt(ctx.causeway, 168);
    const side = 1, x = c.x - c.dz * side * 4.2, z = c.z + c.dx * side * 4.2;
    const gm = ground.groundAt(x, z), yaw = Math.atan2(c.dx, c.dz);
    B.add(B.box(0.95, 0.7, 0.95, { chip: 0.1 }), mat(x, gm + 0.15, z, 0, yaw, 0), { color: tintOld, moss: 1, ground: gm });
    B.add(B.box(0.26, 5.0, 0.26, { seg: 0.6 }), mat(x, gm + 2.6, z, 0.02, yaw, -0.03), { color: vary(tints.woodGrey, rng, 0.1), moss: 0.25, ground: gm, disp: 0.015, dispScale: 4 });
    const ax = x + c.dx * 0.9, az = z + c.dz * 0.9;
    B.add(B.box(0.2, 0.2, 2.1), mat(ax - c.dx * 0.1, gm + 4.85, az - c.dz * 0.1, 0, yaw, 0), { color: vary(tints.woodGrey, rng, 0.1), moss: 0.2, ground: gm });
    B.add(B.box(0.14, 0.14, 1.3), mat(x + c.dx * 0.45, gm + 4.35, z + c.dz * 0.45, Math.PI / 4, yaw, 0), { color: vary(tints.woodGrey, rng, 0.1), moss: 0.2, ground: gm });
    // the cage: iron hoops and bars, empty, turned a little on its chain
    const kx = x + c.dx * 1.65, kz = z + c.dz * 1.65;
    B.add(B.cyl(0.015, 0.015, 0.8, 4, 1), mat(kx, gm + 4.35, kz), { color: tints.iron, iron: 1, moss: 0, ground: gm });
    for (const y of [2.15, 2.95, 3.75]) B.add(new THREE.TorusGeometry(y === 2.95 ? 0.42 : 0.34, 0.02, 4, 16), mat(kx, gm + y, kz, Math.PI / 2, 0, 0), { color: tints.iron, iron: 1, moss: 0, ground: gm });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      B.add(B.box(0.025, 1.65, 0.025), mat(kx + Math.cos(a) * 0.36, gm + 2.95, kz + Math.sin(a) * 0.36, Math.sin(a) * 0.05, 0, -Math.cos(a) * 0.05, 1, 1, 1, 'XYZ'), { color: tints.iron, iron: 1, moss: 0, ground: gm });
    }
    B.add(B.cyl(0.0, 0.36, 0.3, 8, 1), mat(kx, gm + 3.92, kz), { color: tints.iron, iron: 1, moss: 0, ground: gm });
    ctx.addCollider({ x, z, r: 0.6 });
    env.notes.gibbet = { x: +x.toFixed(1), z: +z.toFixed(1) };
  }

  // ---------- broken hex paving surfacing through the turf, as if the whole region was once paved ----------
  for (let i = 0; i < 28; i++) {
    const p = findSpot(env, { slope: 0.3, sep: 10, size: 5, causeway: 9, waterPad: 8 });
    if (!p) continue;
    const r = 3 + rng() * 6;
    hexCellsIn(p.x - r, p.z - r, p.x + r, p.z + r, (x, z, ci, cj) => {
      const d = Math.hypot(x - p.x, z - p.z) / r;
      if (d > 1) return;
      const keep = 0.75 - d * 0.75 + N2(x * 0.4 + i, z * 0.4) * 0.35;
      if (keep < rng() * 0.6) return;
      env.addPaver(x, z, ci, cj, { sink: 0.06 + d * 0.06, tilt: 0.12, dark: true });
    });
  }
}

// ---------- fragment templates (origin at the ground contact, +y up) ----------
function makeHand(B, tint) {
  // a stone hand, palm toward +y, fingers along +z, broken at the wrist
  const o = { color: tint, moss: 0.85, ground: -0.3, disp: 0.012, dispScale: 6 };
  B.add(B.box(0.42, 0.16, 0.5, { chip: 0.04 }), mat(0, 0.1, 0, 0, 0, 0), o);
  B.add(B.cyl(0.17, 0.19, 0.3, 10, 1), mat(0, 0.1, -0.38, Math.PI / 2, 0, 0, 1.2, 1, 0.7), o);
  const fingers = [[-0.15, 0.36, 0.25], [-0.05, 0.42, 0.1], [0.05, 0.4, -0.05], [0.15, 0.33, 0.6]];
  for (let i = 0; i < 4; i++) {
    const [x, len, curl] = fingers[i];
    const broken = i === 2;
    const l1 = len * 0.55, l2 = broken ? 0 : len * 0.45;
    B.add(B.cyl(0.045, 0.05, l1, 8, 1), mat(x, 0.11 + Math.sin(curl * 0.5) * l1 / 2, 0.25 + l1 / 2 * Math.cos(curl * 0.5), Math.PI / 2 - curl * 0.5, 0, 0), o);
    if (l2) B.add(B.cyl(0.035, 0.044, l2, 8, 1), mat(x, 0.11 + Math.sin(curl * 0.5) * l1 + Math.sin(curl * 1.4) * l2 / 2, 0.25 + l1 * Math.cos(curl * 0.5) + l2 / 2 * Math.cos(curl * 1.4), Math.PI / 2 - curl * 1.4, 0, 0), o);
  }
  B.add(B.cyl(0.05, 0.06, 0.26, 8, 1), mat(0.25, 0.12, 0.1, Math.PI / 2 - 0.2, 0.7, 0), o);
  // a ring on one finger
  B.add(new THREE.TorusGeometry(0.052, 0.014, 4, 10), mat(-0.05, 0.11, 0.33, 0, 0, 0), o);
}

function makeCrownedHead(B, ctx, tint) {
  const N2 = ctx.noise.noise2;
  const g = new THREE.SphereGeometry(0.42, 28, 20);
  const pos = g.attributes.position;
  const gs = (a, b, sa, sb) => Math.exp(-(a * a) / (sa * sa) - (b * b) / (sb * sb));
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i) / 0.42, y = pos.getY(i) / 0.42, z = pos.getZ(i) / 0.42;
    const jaw = y < -0.2 ? 1 - 0.25 * Math.min(1, (-0.2 - y) / 0.8) : 1;
    x *= 0.8 * jaw; y *= 1.12; z *= 0.9;
    if (z > 0) {
      z += 0.22 * gs(x, y + 0.12, 0.1, 0.25) * z + 0.06 * gs(0, y - 0.22, 1, 0.07) - 0.1 * gs(Math.abs(x) - 0.28, y - 0.08, 0.13, 0.09);
      z += 0.05 * gs(x, y + 0.53, 0.2, 0.05) - 0.04 * gs(x, y + 0.585, 0.24, 0.02) + 0.06 * gs(x, y + 0.86, 0.17, 0.09);
    }
    const w = N2(x * 3 + 1, y * 3 + z * 2) * 0.03;
    pos.setXYZ(i, x * 0.42 * (1 + w), y * 0.42 * (1 + w), z * 0.42 * (1 + w));
  }
  const o = { color: tint, moss: 0.95, ground: -0.4, disp: 0.01, dispScale: 5 };
  B.add(g, mat(0, 0, 0), o);
  B.add(B.cyl(0.35, 0.33, 0.12, 20, 1, true), mat(0, 0.3, -0.02), o);
  for (let k = 0; k < 6; k++) {
    if (k === 4) continue;
    const a = (k / 6) * Math.PI * 2;
    B.add(B.cyl(0.0, 0.06, 0.22, 4, 1), mat(Math.cos(a) * 0.34, 0.47, Math.sin(a) * 0.34 - 0.02, Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2, 1, 1, 1, 'XYZ'), o);
  }
}

function makeTorso(B, tint) {
  // a robed torso, broken at the waist and the neck, one arm stump
  const lg = B.lathe([[0.0, 0], [0.4, 0], [0.42, 0.25], [0.4, 0.55], [0.46, 0.8], [0.5, 0.95], [0.38, 1.05], [0.16, 1.1], [0.14, 1.18], [0.0, 1.2]], 16);
  const pos = lg.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const fold = 1 + 0.06 * Math.sin(a * 6 + y * 3) + 0.03 * Math.sin(a * 11 - y * 5);
    pos.setXYZ(i, x * fold, y, z * fold * 0.72);
  }
  const o = { color: tint, moss: 0.9, ground: 0, disp: 0.015, dispScale: 4 };
  B.add(lg, mat(0, 0, 0), o);
  B.add(B.cyl(0.12, 0.14, 0.5, 8, 1), mat(0.48, 0.72, 0.04, 0, 0, 0.35), o);
  // a sash or baldric across the breast, carved proud
  B.add(B.box(0.12, 0.9, 0.06, { chip: 0.01 }), mat(0.0, 0.62, 0.3, 0, 0, 0.65), o);
}

function makeObelisk(B, tint, tints, rng) {
  // a tall square shaft on a moulded base, a pyramidion, a band of worn glyphs; origin at the base
  const o = { color: tint, moss: 0.9, ground: 0, disp: 0.03, dispScale: 1.5 };
  B.add(B.box(1.6, 0.5, 1.6, { chip: 0.08 }), mat(0, 0.25, 0), o);
  B.add(B.box(1.3, 0.25, 1.3, { chip: 0.05 }), mat(0, 0.62, 0), o);
  const H = 5.6;
  const g = B.box(0.95, H, 0.95, { seg: 0.6, chip: 0.06 });
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) { const t = pos.getY(i) / H + 0.5; pos.setX(i, pos.getX(i) * (1 - 0.3 * t)); pos.setZ(i, pos.getZ(i) * (1 - 0.3 * t)); }
  B.add(g, mat(0, 0.75 + H / 2, 0), o);
  B.add(B.cyl(0.0, 0.47, 0.6, 4, 1), mat(0, 0.75 + H + 0.3, 0, 0, Math.PI / 4, 0), o);
  // glyph band on all four faces, worn dark
  const bandY = 0.75 + H * 0.55, half = 0.475 * (1 - 0.3 * 0.55) + 0.006;
  for (let f = 0; f < 4; f++) {
    const fm = new THREE.Matrix4().makeRotationY(f * Math.PI / 2);
    for (const dy of [-0.32, 0.32]) B.add(B.box(0.6, 0.03, 0.02), fm.clone().multiply(mat(0, bandY + dy, half)), { color: tints.carve, moss: 0.1, ground: 0 });
    for (let k = 0; k < 3; k++) for (let s = 0; s < 4; s++) {
      const x0 = -0.2 + k * 0.2 + (rng() - 0.5) * 0.08, y0 = bandY + (rng() - 0.5) * 0.4;
      B.add(B.box(0.11, 0.03, 0.02), fm.clone().multiply(mat(x0, y0, half, 0, 0, Math.floor(rng() * 4) * Math.PI / 4)), { color: tints.carve, moss: 0.1, ground: 0 });
    }
  }
}

function makeGravestone(B, tint, tints) {
  // a slab with a rounded head and a carved hex rosette; origin at the ground
  const sh = new THREE.Shape();
  sh.moveTo(-0.32, -0.3); sh.lineTo(0.32, -0.3); sh.lineTo(0.32, 0.7); sh.absarc(0, 0.7, 0.32, 0, Math.PI, false); sh.lineTo(-0.32, -0.3);
  B.add(B.extrude(sh, 0.13, 8), mat(0, 0, 0), { color: tint, moss: 0.95, ground: -0.3, disp: 0.012, dispScale: 5 });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    B.add(B.box(0.12, 0.022, 0.02), mat(Math.cos(a) * 0.1, 0.72 + Math.sin(a) * 0.1, 0.07, 0, 0, a + Math.PI / 2), { color: tints.carve, moss: 0.2, ground: -0.3 });
  }
  for (let k = 0; k < 3; k++) B.add(B.box(0.36 - k * 0.06, 0.022, 0.02), mat(0, 0.38 - k * 0.09, 0.07), { color: tints.carve, moss: 0.2, ground: -0.3 });
}
