// The taverna, the Pomegranate House: an arabesque walled compound, a rare stopping place. A horseshoe-arched gate, a
// courtyard with a dry fountain and four pomegranate trees, arcaded galleries with lattice screens,
// two lanterns still lit, and a low stable outside the wall with a hitching rail and a trough.
// v8-03: the Late folk's own, and kept: lime plaster in cream and rose, saffron turrets under domes of turquoise tile,
// tile bands, voussoirs in pomegranate red, painted woodwork; their sign (the crescent and the pomegranate) on the
// gate's alfiz under a finial; built on what was here before (an Elder block under the north-west turret, placed by
// v8/strata/place.js; Heliarch drums under the gallery's columns; a hex paver for the table under the awning, a drum
// to mount from, a capital for a planter). Iron brackets wait where brief 05's lamps will hang (TAVERNA_BRACKETS).
// ?strata=0: the v7 house in grey stone.
import * as THREE from 'three';
import { mat } from './geo.js';
import { vary, rubblePile, hexCellsIn } from './common.js';

export const TAVERNA = { x: 95, z: -45, half: 13 };
// v8-03: the empty lamp brackets, world space: { x, y, z (the hook), face: [fx, fz] (out from the wall) }
export const TAVERNA_BRACKETS = [];

export function buildTaverna(ctx, B, env) {
  const { rng, ground, tints } = env;
  const { x: cx, z: cz, half } = TAVERNA;
  const N2 = ctx.noise.noise2;
  const S = ctx.strata?.on ? ctx.strata : null, L = S?.colors.late, Hc = S?.colors.heliarch;
  const plaster = S ? L.plaster[0] : new THREE.Color('#9a8266');
  const plasterD = S ? new THREE.Color('#d8b890') : new THREE.Color('#7a6650');
  // each side its own wash: north cream, east rose, south cream, west rose; the turrets saffron
  const wash = S ? [L.plaster[0], L.plaster[1], L.plaster[3], L.plaster[1]] : [plaster, plaster, plaster, plaster];
  const turretC = S ? L.plaster[2] : plaster, domeC = S ? L.tile[0] : tints.old, carveC = S ? L.paint[0] : tints.carve;
  const pmoss = S ? 0.12 : 0.5;
  const th = 0.8, wallH = 4.2;
  TAVERNA_BRACKETS.length = 0;
  const gate = { w: 3.2, h: 3.4 }; // in the north wall, toward the keep
  const gC = ground.groundAt(cx, cz);

  // ---- outer walls, plastered, the plaster fallen away in places ----
  const sides = [
    { ax: -half, az: -half, bx: half, bz: -half, gate: true }, // north
    { ax: half, az: -half, bx: half, bz: half },
    { ax: half, az: half, bx: -half, bz: half },
    { ax: -half, az: half, bx: -half, bz: -half },
  ];
  sides.forEach((s, si) => {
    const L2 = Math.hypot(s.bx - s.ax, s.bz - s.az), tx = (s.bx - s.ax) / L2, tz = (s.bz - s.az) / L2;
    const yaw = Math.atan2(-tz, tx), nx = tz, nz = -tx; // outward for this winding
    for (let t = 0; t < L2 - 0.01; t += 1.6) {
      const w = Math.min(1.6, L2 - t), tm = t + w / 2;
      const lx = s.ax + tx * tm, lz = s.az + tz * tm;
      if (s.gate && Math.abs(lx) < gate.w / 2 + 1.0) continue;
      const x = cx + lx, z = cz + lz;
      const gm = ground.groundAt(x, z), gb = ground.minGround(x, z, 1.0) - 0.3;
      // kept up: the Late folk patch their walls; v7's are broken down in stretches
      let h = wallH + 0.15 * N2(tm * 0.3, lx + lz) - (!S && N2(tm * 0.11 + lx, 3.3) > 0.45 ? 1.4 + rng() : 0);
      const H = h + gm - gb;
      // where the plaster has fallen the wall shows what it was built of: Heliarch ashlar, coursed
      const bare = N2(x * 0.2, z * 0.2) > (S ? 0.62 : 0.1);
      B.add(B.box(w + 0.02, H, th, { seg: 0.7, chip: 0.08, chipTop: true, seed: t * 7, uvOffset: [t, 0] }), mat(x, gb + H / 2, z, 0, yaw, 0), {
        color: bare ? vary(S ? Hc.stone : tints.stone, rng, 0.05) : vary(wash[si], rng, 0.05), course: bare ? 0.32 : 0, moss: bare ? 0.5 : pmoss, ground: gm, disp: 0.02, dispScale: 2,
      });
      // crenellated cresting: stepped merlons, the Moorish kind
      if (h > wallH - 0.4 && Math.round(tm / 1.6) % 2 === 0) {
        const mc = S ? (Math.round(tm / 3.2) % 2 ? L.paint[1] : L.plaster[2]) : plasterD;
        B.add(B.box(0.7, 0.45, th * 0.7, { chip: 0.04 }), mat(x, gm + h + 0.22, z, 0, yaw, 0), { color: vary(mc, rng, 0.05), moss: pmoss, ground: gm });
        B.add(B.box(0.36, 0.3, th * 0.6, { chip: 0.03 }), mat(x, gm + h + 0.58, z, 0, yaw, 0), { color: vary(mc, rng, 0.05), moss: pmoss, ground: gm });
      }
      if (S) {
        // a band of tile under the cresting, both faces (the outer only on the low tier): turquoise, white and pomegranate
        for (const k of ctx.quality === 'low' ? [1] : [1, -1]) S.parts.late.tiles(B, mat(x + nx * k * (th / 2), gm + h - 0.42, z + nz * k * (th / 2), 0, Math.atan2(nx * k, nz * k), 0), { n: 8, w: w / 8, h: 0.2, cols: [0, 3, 1, 3, 0, 4, 0, 3], rng, lost: 0.03 });
        // a lamp bracket every other bay along the outer face, at the height of a raised hand
        if (Math.round(tm / 1.6) % 3 === 1 && !(s.gate && Math.abs(lx) < gate.w / 2 + 3)) {
          const by = gm + 2.7, hook = S.parts.late.bracket(B, mat(x + nx * (th / 2), by, z + nz * (th / 2), 0, Math.atan2(nx, nz), 0), { reach: 0.5 });
          TAVERNA_BRACKETS.push({ x: x + nx * (th / 2 + hook.z), y: by + hook.y, z: z + nz * (th / 2 + hook.z), face: [nx, nz] });
        }
      }
      if (h > 1) ctx.addCollider({ x, z, r: 0.55 });
    }
    // corner turrets
    const x = cx + s.ax, z = cz + s.az, gm = ground.groundAt(x, z);
    B.add(B.cyl(1.2, 1.35, wallH + 1.6 + 1.5, 12, 3), mat(x, gm + (wallH + 1.6) / 2 - 0.75, z), { color: vary(turretC, rng, 0.05), moss: pmoss, ground: gm, disp: 0.02 });
    B.add(B.lathe([[1.25, 0], [1.2, 0.4], [0.95, 0.9], [0.5, 1.25], [0.08, 1.45], [0, 1.6]], 12), mat(x, gm + wallH + 1.6, z), { color: vary(domeC, rng, 0.05), moss: S ? 0.05 : 0.6, ground: gm, disp: 0.02, wet: S ? 0.35 : 0 });
    if (S) {
      // a ring of tile where the dome meets the drum, and a finial on each dome
      B.add(B.cyl(1.3, 1.3, 0.22, 12, 1), mat(x, gm + wallH + 1.5, z), { color: L.tile[1], moss: 0, ground: gm, wet: 0.3 });
      S.parts.late.finial(B, mat(x, gm + wallH + 3.15, z, 0, Math.atan2(-s.ax, -s.az), 0), { h: 1.0, rng });
    }
    ctx.addCollider({ x, z, r: 1.3 });
  });

  // ---- the gate: a horseshoe arch in a tall rectangular frame (alfiz), carved bands ----
  {
    const z = cz - half, gm = ground.groundAt(cx, z);
    const r = gate.w / 2, spring = gate.h - r * 0.9;
    const frameW = gate.w + 2.2, frameH = gate.h + (S ? 3.1 : 1.9); // v8: taller, to carry the sign
    const sh = new THREE.Shape();
    sh.moveTo(-frameW / 2, 0); sh.lineTo(-frameW / 2, frameH); sh.lineTo(frameW / 2, frameH); sh.lineTo(frameW / 2, 0);
    sh.lineTo(r * 0.82, 0); sh.lineTo(r * 0.82, spring - 0.4);
    // horseshoe: more than a semicircle, pinched at the springing
    sh.absarc(0, spring, r, -0.45, Math.PI + 0.45, false);
    sh.lineTo(-r * 0.82, spring - 0.4); sh.lineTo(-r * 0.82, 0); sh.lineTo(-frameW / 2, 0);
    B.add(B.extrude(sh, th + 0.6, 18), mat(cx, gm - 0.3, z, 0, 0, 0), { color: vary(plaster, rng, 0.03), moss: S ? 0.08 : 0.35, ground: gm, disp: 0.012, dispScale: 3 });
    // voussoirs picked out in alternating stone, as in the old mosques (v8: pomegranate red and cream)
    for (let k = 0; k < 15; k++) {
      const a = -0.45 + (k + 0.5) / 15 * (Math.PI + 0.9);
      const col = k % 2 ? (S ? L.tile[1] : new THREE.Color('#6a2a1a')) : vary(S ? L.plaster[3] : tints.old, rng, 0.04);
      B.add(B.box(0.3, 0.42, th + 0.66), mat(cx + Math.cos(a) * (r + 0.22), gm - 0.3 + spring + Math.sin(a) * (r + 0.22), z, 0, 0, a - Math.PI / 2), { color: col, moss: 0.3, ground: gm });
    }
    // the alfiz moulding and a band of carved interlace above
    const zf = z - (th + 0.6) / 2;
    B.add(B.box(frameW + 0.2, 0.2, 0.2), mat(cx, gm - 0.3 + frameH - 0.5, zf - 0.08), { color: S ? L.paint[0] : vary(tints.old, rng, 0.03), moss: S ? 0 : 0.3, ground: gm });
    for (let k = 0; k < 14; k++) {
      const x = cx - frameW / 2 + 0.4 + k * (frameW - 0.8) / 13;
      B.add(B.box(0.2, 0.025, 0.02), mat(x, gm - 0.3 + frameH - 0.2, zf - 0.01, 0, 0, k % 2 ? 0.785 : -0.785), { color: carveC, moss: 0.1, ground: gm });
    }
    if (S) {
      // the alfiz itself, painted: a turquoise band up both sides and across over the arch, a red fillet inside it
      const ay = gm - 0.3, top = spring + r + 0.6;
      for (const sx of [-1, 1]) {
        B.add(B.box(0.16, top, 0.03), mat(cx + sx * (r + 0.75), ay + top / 2, zf - 0.015), { color: L.paint[0], moss: 0, ground: gm });
        B.add(B.box(0.06, top - 0.15, 0.03), mat(cx + sx * (r + 0.58), ay + (top - 0.15) / 2, zf - 0.02), { color: L.tile[1], moss: 0, ground: gm });
      }
      B.add(B.box(2 * r + 1.66, 0.16, 0.03), mat(cx, ay + top, zf - 0.015), { color: L.paint[0], moss: 0, ground: gm });
      // tiled spandrels, and the sign on the alfiz over the arch, the finial over all
      for (const sx of [-1, 1]) for (const j of [0, 1]) S.parts.late.tiles(B, mat(cx + sx * (r + 0.45), ay + spring + r * 0.88 + j * 0.2, zf - 0.005, 0, Math.PI, 0), { n: 2, w: 0.2, h: 0.2, cols: j ? [4, 0] : [0, 4], rng });
      const sy = ay + top + 0.18;
      S.parts.late.sign(B, mat(cx, sy, zf - 0.04, 0, Math.PI, 0), { w: 1.2, h: 1.0, rng });
      S.place({ hand: 'late', kind: 'sign', name: "the Pomegranate House's alfiz", x: cx, y: sy + 0.5, z: zf - 0.04, face: [0, -1], mount: 'wall', size: 1.2 });
      S.parts.late.finial(B, mat(cx, ay + frameH, z, 0, Math.PI, 0), { h: 1.5, rng });
      // a bracket either side of the gate for the lamps that will greet you
      for (const sx of [-1, 1]) {
        const bx = cx + sx * (frameW / 2 + 0.45), by = ay + 3.2, hook = S.parts.late.bracket(B, mat(bx, by, z - th / 2, 0, Math.PI, 0), { reach: 0.6 });
        TAVERNA_BRACKETS.push({ x: bx, y: by + hook.y, z: z - th / 2 - hook.z, face: [0, -1] });
      }
    }
    for (const s of [-1, 1]) ctx.addCollider({ x: cx + s * (r + 0.9), z, r: 0.75 });
    // a lantern hanging in the gateway, still lit
    lantern(ctx, B, env, cx, gm - 0.3 + spring + r - 0.55, z + 0.2, 0);
  }

  // ---- arcaded galleries round the courtyard ----
  const inner = half - th / 2;
  const depth = 3.0, colH = 2.7, bay = 2.6;
  const roofY = colH + 1.25;
  const lattice = [];
  for (let si = 0; si < 4; si++) {
    const s = sides[si];
    const Ls = Math.hypot(s.bx - s.ax, s.bz - s.az), tx = (s.bx - s.ax) / Ls, tz = (s.bz - s.az) / Ls;
    const nx = -tz, nz = tx; // inward for this winding
    const yaw = Math.atan2(-tz, tx);
    const run = 2 * (inner - depth);
    const nb = Math.round(run / bay);
    const b = run / nb;
    for (let i = 0; i <= nb; i++) {
      const t = -run / 2 + i * b;
      const mx = (s.ax + s.bx) / 2, mz = (s.az + s.bz) / 2;
      const lx = mx * (inner - depth) / half + tx * t, lz = mz * (inner - depth) / half + tz * t;
      const x = cx + lx, z = cz + lz, gm = ground.groundAt(x, z);
      // slender column, a cushion capital, a square impost
      B.add(B.cyl(0.17, 0.2, colH, 10, 1), mat(x, gm + colH / 2, z), { color: vary(tints.old, rng, 0.05), moss: 0.4, ground: gm, disp: 0.008, dispScale: 6 });
      if (S) S.parts.heliarch.drum(B, mat(x, gm - 0.15, z, 0, yaw, 0), { r: 0.3, h: 0.5, moss: 0.3 }); // v8: on Heliarch drums
      else B.add(B.box(0.5, 0.25, 0.5), mat(x, gm + 0.12, z, 0, yaw, 0), { color: vary(tints.old, rng, 0.05), moss: 0.7, ground: gm });
      B.add(B.cyl(0.32, 0.2, 0.28, 10, 1), mat(x, gm + colH + 0.14, z), { color: vary(tints.old, rng, 0.05), moss: 0.4, ground: gm });
      ctx.addCollider({ x, z, r: 0.25 });
      if (i < nb) {
        // a pointed horseshoe arch spanning to the next column, in a strip of wall up to the roof
        const ax = x + tx * b / 2, az = z + tz * b / 2, ag = ground.groundAt(ax, az);
        const hw = b / 2, rr = hw - 0.18;
        const sh = new THREE.Shape();
        sh.moveTo(-hw, 0); sh.lineTo(-hw, 1.35); sh.lineTo(hw, 1.35); sh.lineTo(hw, 0); sh.lineTo(rr * 0.85, 0);
        sh.absarc(0, 0.25, rr, -0.3, Math.PI + 0.3, false);
        sh.lineTo(-rr * 0.85, 0); sh.lineTo(-hw, 0);
        B.add(B.extrude(sh, 0.42, 10), mat(ax, ag + colH, az, 0, yaw, 0), { color: vary(plaster, rng, 0.04), moss: S ? 0.08 : 0.3, ground: ag, disp: 0.008, dispScale: 4 });
        // geometric lattice screens in some bays
        if ((i + si) % 3 === 1 && rng() > 0.2) lattice.push({ x: ax, z: az, g: ag, yaw, w: b - 0.4 });
        // a carved star-band along the gallery front
        if (rng() < 0.9) for (let k = 0; k < 3; k++) {
          const kk = (k - 1) * 0.5;
          B.add(B.box(0.22, 0.03, 0.02), mat(ax + tx * kk + nx * 0.22, ag + colH + 1.05, az + tz * kk + nz * 0.22, 0, yaw, 0.785), { color: carveC, moss: 0.1, ground: ag });
          B.add(B.box(0.22, 0.03, 0.02), mat(ax + tx * kk + nx * 0.22, ag + colH + 1.05, az + tz * kk + nz * 0.22, 0, yaw, -0.785), { color: carveC, moss: 0.1, ground: ag });
        }
      }
    }
    // the gallery roof: a flat slab from the wall to the arcade, broken through in one place
    const mx = (s.ax + s.bx) / 2 * (inner - depth / 2) / half, mz = (s.az + s.bz) / 2 * (inner - depth / 2) / half;
    const gm = ground.groundAt(cx + mx, cz + mz);
    const len = 2 * inner;
    for (let t = -len / 2; t < len / 2 - 0.01; t += 2.0) {
      const w = Math.min(2.0, len / 2 - t);
      if (si === 2 && t > 1 && t < 6) {
        // v8: the hole patched with striped cloth on poles, as the Late folk mend things
        if (S && t < 3) S.parts.late.awning(B, mat(cx + mx + tx * (t + 3) - nx * (depth / 2 + 0.15), gm + roofY - 0.2, cz + mz + tz * (t + 3) - nz * (depth / 2 + 0.15), 0, Math.atan2(nx, nz), 0), { w: 6.1, d: depth + 0.3, h: 0.45, poles: false, rng });
        continue;
      }
      B.add(B.box(w + 0.02, 0.3, depth + 0.3), mat(cx + mx + tx * (t + w / 2), gm + roofY + 0.12, cz + mz + tz * (t + w / 2), 0, yaw, 0), { color: vary(S ? L.paint[1] : plasterD, rng, 0.05), moss: S ? 0.2 : 0.8, ground: gm });
    }
    // a dado of glazed tiles along the inner wall, faded and broken
    const tiles = S ? [L.tile[0], L.tile[3], L.tile[1], L.tile[2]] : [new THREE.Color('#1f4a44'), new THREE.Color('#6a3a1e'), new THREE.Color('#8a7a5a'), new THREE.Color('#2a2430')];
    for (let t = -len / 2 + 0.3; t < len / 2 - 0.3; t += 0.34) {
      if (rng() < (S ? 0.04 : 0.22)) continue;
      for (let row = 0; row < 3; row++) {
        if (rng() < (S ? 0.03 : 0.12)) continue;
        const px = cx + (s.ax + s.bx) / 2 * (inner - 0.02) / half + tx * t, pz = cz + (s.az + s.bz) / 2 * (inner - 0.02) / half + tz * t;
        const pg = ground.groundAt(px, pz);
        B.add(B.box(0.3, 0.3, 0.025), mat(px + nx * 0.01, pg + 0.35 + row * 0.33, pz + nz * 0.01, 0, yaw, 0), { color: vary(tiles[(((row + Math.floor(t / 0.34)) % 4) + 4) % 4], rng, 0.1), moss: 0.15, ground: pg, wet: 0.5 });
      }
    }
  }
  // lattice screens: diagonal slats in a frame
  for (const l of lattice) {
    const h = 2.1;
    const ca = Math.cos(l.yaw), sa = -Math.sin(l.yaw);
    // diagonal slats clipped to the frame: each is the chord of the rectangle along a 45° line
    const hw = l.w / 2 - 0.05, hh = h / 2 - 0.05;
    for (let k = -9; k <= 9; k++) {
      for (const dir of [1, -1]) {
        const off = k * 0.2;
        // points (off + t, dir * t) inside |x| <= hw, |y| <= hh
        const t0 = Math.max(-hw - off, -hh), t1 = Math.min(hw - off, hh);
        if (t1 - t0 < 0.08) continue;
        const tm = (t0 + t1) / 2, lenS = (t1 - t0) * Math.SQRT2;
        const lx = off + tm, ly = dir * tm;
        B.add(B.box(0.035, lenS, 0.03), mat(l.x + ca * lx, l.g + 0.3 + h / 2 + ly, l.z + sa * lx, 0, l.yaw, -dir * 0.785), { color: vary(S ? L.paint[0] : tints.wood, rng, 0.1), moss: 0.1, ground: l.g });
      }
    }
    // the frame hides the slat ends
    for (const y of [0.3, 0.3 + h]) B.add(B.box(l.w, 0.1, 0.08), mat(l.x, l.g + y, l.z, 0, l.yaw, 0), { color: vary(S ? L.paint[1] : tints.wood, rng, 0.1), moss: 0.1, ground: l.g });
    for (const s of [-1, 1]) B.add(B.box(0.1, h, 0.08), mat(l.x + ca * s * l.w / 2, l.g + 0.3 + h / 2, l.z + sa * s * l.w / 2, 0, l.yaw, 0), { color: vary(S ? L.paint[1] : tints.wood, rng, 0.1), moss: 0.1, ground: l.g });
  }
  // the slats overrun the frame, so trim them visually with a plaster panel behind (dark, the room within)
  // (the galleries' back wall is the compound wall itself)

  // ---- the courtyard: a dry fountain and four pomegranates ----
  {
    const gm = ground.groundAt(cx, cz);
    const oct = B.cyl(2.4, 2.5, 0.75, 8, 1);
    B.add(oct, mat(cx, gm + 0.2, cz, 0, Math.PI / 8, 0), { color: vary(tints.old, rng, 0.04), moss: 0.7, ground: gm, disp: 0.015 });
    B.add(B.cyl(2.05, 2.05, 0.08, 8, 1), mat(cx, gm + 0.55, cz, 0, Math.PI / 8, 0), { color: vary(tints.dark, rng, 0.05), moss: 0.8, ground: gm - 0.4 });
    if (S) B.add(B.cyl(2.45, 2.45, 0.1, 8, 1, true), mat(cx, gm + 0.55, cz, 0, Math.PI / 8, 0), { color: L.tile[0], moss: 0, ground: gm, wet: 0.35 }); // v8: a tiled rim
    B.add(B.cyl(0.25, 0.32, 1.4, 10, 1), mat(cx, gm + 1.2, cz), { color: vary(tints.old, rng, 0.04), moss: 0.6, ground: gm });
    B.add(B.lathe([[0.15, 0], [0.7, 0.15], [0.95, 0.35], [0.9, 0.38], [0.6, 0.25], [0, 0.22]], 16), mat(cx, gm + 1.9, cz), { color: vary(tints.old, rng, 0.04), moss: 0.6, ground: gm });
    B.add(B.cyl(0.06, 0.12, 0.5, 8, 1), mat(cx, gm + 2.3, cz), { color: vary(tints.old, rng, 0.04), moss: 0.5, ground: gm });
    ctx.addCollider({ x: cx, z: cz, r: 2.5 });
    // a star-patterned pavement around it, mostly lost
    hexCellsIn(cx - 9, cz - 9, cx + 9, cz + 9, (x, z, i, j) => {
      const d = Math.hypot(x - cx, z - cz);
      if (d < 2.9 || d > 8.5 || rng() < 0.35 + d * 0.03) return;
      env.addPaver(x, z, i, j, { sink: 0.03, tilt: 0.04 });
    });
    for (const [dx, dz] of [[-5.5, -5.5], [5.5, -5.5], [5.5, 5.5], [-5.5, 5.5]]) pomegranate(ctx, B, env, cx + dx, cz + dz);
  }
  // a second lantern under the east gallery
  {
    const x = cx + inner - depth + 0.1, z = cz + 2.6, gm = ground.groundAt(x, z);
    lantern(ctx, B, env, x, gm + colH + 0.25, z, 1.3);
  }

  // ---- the stable outside the east wall ----
  {
    const sx = cx + half + 4.2, sz = cz + 2;
    const gm = ground.groundAt(sx, sz);
    const len = 11, dep = 4.2;
    // back wall against nothing, two ends, posts along the open front
    const wallRun = (x, z, w, d, h) => {
      const g0 = ground.groundAt(x, z), gb = ground.minGround(x, z, 0.8) - 0.3;
      B.add(B.box(w, h + g0 - gb, d, { chip: 0.06, chipTop: true, seed: x + z }), mat(x, gb + (h + g0 - gb) / 2, z), { color: vary(S ? L.plaster[3] : plasterD, rng, 0.06), course: S ? 0 : 0.3, moss: S ? 0.25 : 0.7, ground: g0, disp: 0.02 });
    };
    for (let z = sz - len / 2; z < sz + len / 2 - 0.01; z += 1.5) {
      wallRun(sx + dep / 2, z + 0.75, 0.6, 1.52, 2.4 + (rng() - 0.5) * 0.2);
      ctx.addCollider({ x: sx + dep / 2, z: z + 0.75, r: 0.45 });
    }
    for (const s of [-1, 1]) for (let x = sx - dep / 2; x < sx + dep / 2; x += 1.4) {
      wallRun(x + 0.7, sz + s * len / 2, 1.42, 0.6, 2.2);
      ctx.addCollider({ x: x + 0.7, z: sz + s * len / 2, r: 0.45 });
    }
    for (let k = 0; k < 5; k++) {
      const z = sz - len / 2 + 0.6 + k * (len - 1.2) / 4;
      B.add(B.box(0.2, 2.1, 0.2), mat(sx - dep / 2 + 0.1, gm + 1.0, z, 0, 0, (rng() - 0.5) * 0.06), { color: vary(tints.woodGrey, rng, 0.1), moss: 0.2, ground: gm });
    }
    // a lean-to roof of slates on poles, sagging, half its slates gone
    const pitch = 0.22;
    for (let z = sz - len / 2 - 0.2; z < sz + len / 2 + 0.2; z += 0.32) {
      for (let s = 0.1; s < dep + 0.6; s += 0.26) {
        if (rng() < 0.18 + (z > sz + 2 ? 0.35 : 0)) continue;
        const x = sx + dep / 2 + 0.3 - s;
        const y = gm + 2.5 - (dep / 2 + 0.3 - (x - sx)) * 0 - s * Math.sin(pitch) + 0.15 - 0.12 * Math.sin(Math.PI * (z - sz + len / 2) / len);
        B.add(B.box(0.42, 0.025, 0.3), mat(x, y, z, 0, 0, pitch + (rng() - 0.5) * 0.06), { color: vary(tints.slate, rng, 0.15), moss: 0.8, ground: gm });
      }
    }
    // hitching rail and trough in front
    const rx = sx - dep / 2 - 2.2;
    for (const dz of [-3, 0, 3]) B.add(B.box(0.18, 1.1, 0.18), mat(rx, gm + 0.45, sz + dz, 0, 0, (rng() - 0.5) * 0.08), { color: vary(tints.woodGrey, rng, 0.1), moss: 0.2, ground: gm });
    B.add(B.box(0.12, 0.12, 6.4), mat(rx, gm + 0.95, sz, 0.02, 0, 0), { color: vary(tints.woodGrey, rng, 0.1), moss: 0.2, ground: gm });
    for (const dz of [-1.5, 1.5]) B.add(new THREE.TorusGeometry(0.07, 0.013, 4, 10), mat(rx, gm + 0.85, sz + dz, 0, Math.PI / 2, 0), { color: tints.iron, iron: 1, moss: 0, ground: gm });
    ctx.addCollider({ x: rx, z: sz - 3, r: 0.2 }); ctx.addCollider({ x: rx, z: sz, r: 0.2 }); ctx.addCollider({ x: rx, z: sz + 3, r: 0.2 });
    const tx = rx - 1.3, tz = sz + 4.6, tg = ground.groundAt(tx, tz);
    B.add(B.box(0.75, 0.6, 2.2, { chip: 0.04 }), mat(tx, tg + 0.2, tz), { color: vary(tints.old, rng, 0.05), moss: 0.9, ground: tg, disp: 0.01 });
    B.add(B.box(0.5, 0.02, 1.95), mat(tx, tg + 0.47, tz), { color: new THREE.Color(0.006, 0.007, 0.006), moss: 0, wet: 1, ground: tg - 1 });
    ctx.addCollider({ x: tx, z: tz - 0.6, r: 0.5 }); ctx.addCollider({ x: tx, z: tz + 0.6, r: 0.5 });
  }

  // ---- v8: before the gate, the Late folk's frontage, built of what they found ----
  if (S) {
    const zf = cz - half - th / 2, P = S.parts;
    const wallY = (x) => ground.groundAt(x, zf - 1);
    // west of the gate: a striped awning over a tiled bench against the wall, and a table whose top is a Heliarch
    // hex paver on a crooked trestle, two stools
    const ax = cx - 5.6, ag = wallY(ax);
    P.late.awning(B, mat(ax, ag, zf, 0, Math.PI, 0), { w: 3.8, d: 2.0, h: 2.7, rng });
    P.late.bench(B, mat(ax, ag - 0.05, zf - 0.3, 0, Math.PI, 0), { w: 3.0, rng });
    ctx.addCollider({ x: ax - 1, z: zf - 0.3, r: 0.35 }); ctx.addCollider({ x: ax + 1, z: zf - 0.3, r: 0.35 });
    const tx = ax + 0.3, tz = zf - 2.3, tg = ground.groundAt(tx, tz);
    for (const s of [-1, 1]) {
      B.add(B.box(0.07, 0.95, 0.07), mat(tx + s * 0.32, tg + 0.36, tz - 0.2, 0, 0, s * 0.35), { color: L.paint[2], moss: 0, ground: tg });
      B.add(B.box(0.07, 0.95, 0.07), mat(tx + s * 0.32, tg + 0.36, tz + 0.2, 0, 0, -s * 0.35), { color: L.paint[2], moss: 0, ground: tg });
    }
    B.add(B.box(0.8, 0.06, 0.06), mat(tx, tg + 0.36, tz), { color: L.paint[1], moss: 0, ground: tg });
    B.add(B.cyl(0.62, 0.62, 0.12, 6, 1), mat(tx, tg + 0.8, tz, 0.03, 0.2, -0.02), { color: Hc.stone, course: -0.37, moss: 0.2, ground: tg });
    S.place({ hand: 'late', from: 'heliarch', kind: 'spolia', name: 'a Heliarch hex paver for a tabletop', x: tx, y: ground.minGround(tx, tz, 0.6) - 0.02, z: tz, mount: 'ground', r: 0.6 });
    for (const [dx, dz] of [[-0.95, 0.1], [0.9, -0.3]]) {
      const sx = tx + dx, sz = tz + dz, sg = ground.groundAt(sx, sz);
      B.add(B.cyl(0.2, 0.17, 0.42, 6, 1), mat(sx, sg + 0.2, sz, 0, rng(), 0), { color: L.paint[0], moss: 0, ground: sg });
    }
    ctx.addCollider({ x: tx, z: tz, r: 0.65 });
    // east of the gate: a Heliarch drum set up as a mounting block with a second for the step, and an upturned
    // capital for a planter, a pomegranate bush in it
    const mx = cx + 4.0, mz = zf - 1.0, mg = ground.minGround(mx, mz, 0.5) - 0.1;
    P.heliarch.drum(B, mat(mx, mg, mz, 0, 0.3, 0), { r: 0.48, h: 0.85, moss: 0.35 });
    P.heliarch.drum(B, mat(mx - 0.75, mg - 0.4, mz - 0.2, 0, 0.1, 0), { r: 0.38, h: 0.8, moss: 0.35 });
    S.place({ hand: 'late', from: 'heliarch', kind: 'spolia', name: 'two Heliarch drums for a mounting block', x: mx, y: mg, z: mz, mount: 'ground', r: 0.5 });
    ctx.addCollider({ x: mx, z: mz, r: 0.5 }); ctx.addCollider({ x: mx - 0.75, z: mz - 0.2, r: 0.4 });
    const px = cx + 6.3, pz = zf - 0.9, pg = ground.minGround(px, pz, 0.7) - 0.05;
    P.heliarch.capital(B, mat(px, pg + 0.72, pz, Math.PI, 0.4, 0), { r: 0.42 });
    for (let k = 0; k < 6; k++) {
      const a = rng() * 6.28, d = rng() * 0.35;
      B.add(B.rock(0.32 + rng() * 0.12, 1, 1, 0.9, 1), mat(px + Math.cos(a) * d, pg + 0.95 + rng() * 0.5, pz + Math.sin(a) * d, rng() * 3, rng() * 3, 0), { color: vary(new THREE.Color('#34502a'), rng, 0.15), moss: 0, ground: pg, flat: true });
    }
    for (let k = 0; k < 7; k++) { const a = rng() * 6.28; B.add(new THREE.IcosahedronGeometry(0.06, 1), mat(px + Math.cos(a) * 0.42, pg + 1.0 + rng() * 0.6, pz + Math.sin(a) * 0.42), { color: L.pom, moss: 0, ground: pg }); }
    S.place({ hand: 'late', from: 'heliarch', kind: 'spolia', name: 'a Heliarch capital, upturned, for a planter', x: px, y: pg, z: pz, mount: 'ground', r: 0.75 });
    ctx.addCollider({ x: px, z: pz, r: 0.75 });
    S.place({ hand: 'late', from: 'heliarch', kind: 'spolia', name: "the gallery's columns, set on Heliarch drums", x: cx - 1.37, y: ground.groundAt(cx - 1.37, cz - 9.6) - 0.15, z: cz - 9.6, mount: 'ground', r: 0.3 });
  }

  // ---- the spur track: broken paving from the gate toward the keep road ----
  {
    const ex = cx - 22, ez = cz - 34;
    const sx = cx, sz = cz - half - 1;
    const L = Math.hypot(ex - sx, ez - sz);
    hexCellsIn(Math.min(sx, ex) - 3, Math.min(sz, ez) - 3, Math.max(sx, ex) + 3, Math.max(sz, ez) + 3, (x, z, i, j) => {
      const t = Math.max(0, Math.min(1, ((x - sx) * (ex - sx) + (z - sz) * (ez - sz)) / (L * L)));
      const d = Math.hypot(x - (sx + (ex - sx) * t), z - (sz + (ez - sz) * t));
      if (d > 1.3 || rng() < 0.25 + t * 0.5) return;
      env.addPaver(x, z, i, j, { sink: 0.05, tilt: 0.1, dark: true });
    });
  }
  rubblePile(B, env, cx - half - 2, cz + 5, 2.5, 14, { height: 0.5, size: 0.5, tint: plasterD });
  env.notes.taverna = { brackets: TAVERNA_BRACKETS.length, x: cx, z: cz, gate: { x: cx, z: cz - half, width: gate.w }, courtyard: { x0: cx - (inner - depth), x1: cx + inner - depth, z0: cz - (inner - depth), z1: cz + inner - depth } };
  void gC;
}

function lantern(ctx, B, env, x, y, z, phase) {
  const { tints } = env;
  const gm = y;
  B.add(B.cyl(0.008, 0.008, 0.55, 3, 1), mat(x, y + 0.45, z), { color: tints.iron, iron: 1, moss: 0, ground: gm - 3 });
  B.add(B.cyl(0.0, 0.2, 0.2, 8, 1), mat(x, y + 0.2, z), { color: tints.iron, iron: 1, moss: 0, ground: gm - 3 });
  B.add(B.cyl(0.14, 0.12, 0.32, 8, 1), mat(x, y - 0.06, z), { color: new THREE.Color(0.06, 0.03, 0.01), moss: 0, ground: gm - 3, emit: [2.4, 1.0, 0.32, 1] });
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; B.add(B.box(0.018, 0.36, 0.018), mat(x + Math.cos(a) * 0.15, y - 0.06, z + Math.sin(a) * 0.15), { color: tints.iron, iron: 1, moss: 0, ground: gm - 3 }); }
  B.add(B.cyl(0.13, 0.04, 0.1, 8, 1), mat(x, y - 0.27, z), { color: tints.iron, iron: 1, moss: 0, ground: gm - 3 });
  const light = new THREE.PointLight(new THREE.Color('#ff9a4a'), 3, 12, 2);
  light.position.set(x, y - 0.05, z);
  light.name = phase ? 'taverna-court-lantern' : 'taverna-gate-lantern'; // v8-05: src/v8/house.js takes the court's light for the court
  ctx.scene.add(light);
  const N2 = ctx.noise.noise2;
  (env.updates ||= []).push((dt, t, f) => { light.intensity = 3.2 * (0.78 + 0.14 * N2(t * 1.3 + phase * 10, phase) + 0.08 * N2(t * 6.1, phase * 3)) * (0.5 + 0.5 * f); });
}

function pomegranate(ctx, B, env, x, z) {
  const { rng, ground, tints } = env;
  const gm = ground.groundAt(x, z);
  const leaf = new THREE.Color('#2a3a1c'), leafD = new THREE.Color('#1c2814'), fruit = new THREE.Color('#5a0e0c');
  // a short gnarled trunk splitting low
  const lean = (rng() - 0.5) * 0.2;
  B.add(B.cyl(0.09, 0.14, 1.3, 7, 3), mat(x, gm + 0.6, z, lean, 0, (rng() - 0.5) * 0.2), { color: vary(tints.wood, rng, 0.1), moss: 0.3, ground: gm, disp: 0.03, dispScale: 4 });
  for (let k = 0; k < 3; k++) {
    const a = k / 3 * 6.28 + rng();
    B.add(B.cyl(0.04, 0.07, 0.9, 5, 1), mat(x + Math.cos(a) * 0.25, gm + 1.5, z + Math.sin(a) * 0.25, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5, 1, 1, 1, 'XYZ'), { color: vary(tints.wood, rng, 0.1), moss: 0.2, ground: gm });
  }
  // a round crown of clumps
  for (let k = 0; k < 9; k++) {
    const a = rng() * 6.28, d = rng() * 0.8, y = gm + 1.9 + rng() * 0.9;
    const s = 0.55 + rng() * 0.35;
    B.add(B.rock(s, 1, 1, 0.85, 1), mat(x + Math.cos(a) * d, y, z + Math.sin(a) * d, rng() * 3, rng() * 3, 0), { color: vary(rng() < 0.5 ? leaf : leafD, rng, 0.15), moss: 0, ground: gm, disp: s * 0.25, dispScale: 3, flat: true });
  }
  for (let k = 0; k < 6; k++) {
    const a = rng() * 6.28, y = gm + 1.6 + rng() * 1.1;
    const d = 0.95 + rng() * 0.25;
    B.add(new THREE.IcosahedronGeometry(0.085, 1), mat(x + Math.cos(a) * d, y, z + Math.sin(a) * d), { color: vary(fruit, rng, 0.15), moss: 0, ground: gm });
  }
  ctx.addCollider({ x, z, r: 0.35 });
}
