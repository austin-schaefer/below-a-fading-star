// The Sunken Court: a hall of massive proportions. Two colonnades of fluted columns, half standing,
// half fallen in drums across the floor; lintels still spanning a few; a broad stair descending into a
// flooded rectangular shaft (drawn by an interior-mapped quad, since the terrain cannot be cut);
// and the colossal fallen head of a crowned figure, half-buried, by the leg-stumps it fell from.
import * as THREE from 'three';
import { mat } from './geo.js';
import { vary, rubblePile, colliderChain } from './common.js';
import { makePitMaterial } from './materials.js';

export function buildCourt(ctx, B, env) {
  const { rng, ground, tints } = env;
  const C = ctx.landmarks.court;
  const cx = C.x, cz = C.z;
  const tint = vary(tints.old, rng, 0.03).multiplyScalar(0.9);
  const colR = 1.05, drumH = 1.5, nDrums = 7;
  const rowsX = [cx - 11, cx + 11];
  const nCol = 8, z0 = cz - 18, z1 = cz + 18;
  const pit = { x0: cx - 5, x1: cx + 5, z0: cz - 11, z1: cz + 9 };

  // floor: great flagstones, sunk and tilted, many lifted away
  for (let fx = cx - 13.5; fx < cx + 13.5; fx += 2.25) {
    for (let fz = cz - 20.5; fz < cz + 20.5; fz += 2.25) {
      const x = fx + 1.1, z = fz + 1.1;
      if (x > pit.x0 - 1.1 && x < pit.x1 + 1.1 && z > pit.z0 - 1.1 && z < pit.z1 + 0.6) continue;
      if (rng() < 0.28 || ctx.noise.noise2(x * 0.08, z * 0.08) > 0.45) continue;
      const gm = ground.groundAt(x, z);
      ground.groundNormal(x, z, env._n || (env._n = new THREE.Vector3()));
      B.add(B.box(2.12, 0.32, 2.12, { seg: 1.1, chip: 0.06, seed: x * 3 + z }), mat(x, gm - 0.11 - rng() * 0.05, z, (rng() - 0.5) * 0.05, (rng() - 0.5) * 0.04, (rng() - 0.5) * 0.05), {
        color: vary(tints.old, rng, 0.1).multiplyScalar(0.85), moss: 0.8, ground: gm - 0.3, disp: 0.02, dispScale: 1.5,
      });
    }
  }

  // columns
  const pattern = [['S', 'S', 'B', 'F', 'S', 'S', 'F', 'B'], ['B', 'S', 'S', 'F', 'F', 'S', 'B', 'S']];
  const tops = [[], []];
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < nCol; i++) {
      const x = rowsX[r], z = z0 + (i * (z1 - z0)) / (nCol - 1);
      const gm = ground.groundAt(x, z), gb = ground.minGround(x, z, 1.5) - 0.3;
      const kind = pattern[r][i];
      // plinth
      B.add(B.box(2.8, 0.75 + gm - gb, 2.8, { chip: 0.12, seed: i + r * 9 }), mat(x, gb + (0.75 + gm - gb) / 2, z), { color: vary(tint, rng, 0.05), moss: 0.9, ground: gm, disp: 0.04 });
      B.add(B.cyl(colR + 0.25, colR + 0.32, 0.35, 24, 1), mat(x, gm + 0.92, z), { color: vary(tint, rng, 0.05), moss: 0.85, ground: gm, disp: 0.03 });
      const drums = kind === 'S' ? nDrums : kind === 'B' ? 2 + Math.floor(rng() * 3) : (rng() < 0.5 ? 1 : 0);
      let y = gm + 1.1;
      for (let k = 0; k < drums; k++) {
        const last = k === drums - 1 && kind !== 'S';
        const g = B.cyl(colR * 0.98, colR, drumH, 24, last ? 3 : 2, false, { flute: 0.05, flutes: 20 });
        if (last) {
          // broken top: a slanted, jagged fracture
          const pos = g.attributes.position;
          const sa = rng() * 6.28;
          for (let q = 0; q < pos.count; q++) {
            if (pos.getY(q) > drumH / 2 - 0.01) pos.setY(q, drumH / 2 - 0.35 - 0.35 * Math.cos(Math.atan2(pos.getZ(q), pos.getX(q)) - sa) + ctx.noise.noise2(pos.getX(q) * 3, pos.getZ(q) * 3) * 0.15);
          }
        }
        B.add(g, mat(x + (rng() - 0.5) * 0.04, y + drumH / 2, z + (rng() - 0.5) * 0.04, (rng() - 0.5) * 0.008, rng() * 6.28, (rng() - 0.5) * 0.008), {
          color: vary(tint, rng, 0.05), moss: 0.75, ground: gm, disp: 0.045, dispScale: 1.6, flat: false,
        });
        y += drumH;
      }
      if (kind === 'S') {
        // capital: an echinus and a square abacus with a moulded lip
        B.add(B.cyl(colR + 0.45, colR, 0.6, 24, 1), mat(x, y + 0.3, z), { color: vary(tint, rng, 0.05), moss: 0.7, ground: gm, disp: 0.04 });
        B.add(B.box(3.0, 0.55, 3.0, { chip: 0.12, seed: i }), mat(x, y + 0.88, z, 0, (rng() - 0.5) * 0.03, 0), { color: vary(tint, rng, 0.05), moss: 0.85, ground: gm, disp: 0.04 });
        tops[r][i] = y + 1.15;
      }
      if (drums > 0 || kind !== 'F') ctx.addCollider({ x, z, r: colR + 0.2 });
      else ctx.addCollider({ x, z, r: 1.5, y: gm, h: 1.2 });
      if (kind === 'F') {
        // the column lies where it fell, its drums strung out across the floor
        const dir = (r === 0 ? -1 : 1) * (0.6 + rng() * 0.6) + (rng() < 0.3 ? Math.PI : 0);
        const fa = (r === 0 ? Math.PI : 0) + (rng() - 0.5) * 1.1;
        const dx = Math.cos(fa), dz = Math.sin(fa);
        const n = nDrums - drums;
        for (let k = 0; k < n; k++) {
          const s = 1.9 + k * (drumH + 0.12) + rng() * 0.25;
          const px = x + dx * s + (rng() - 0.5) * 0.5 * k * 0.3, pz = z + dz * s + (rng() - 0.5) * 0.5 * k * 0.3;
          const g0 = ground.groundAt(px, pz);
          const g = B.cyl(colR * 0.98, colR, drumH, 24, 2, false, { flute: 0.05, flutes: 20 });
          B.add(g, mat(px, g0 + colR * 0.62, pz, Math.PI / 2 + (rng() - 0.5) * 0.12, -fa + Math.PI / 2 + (rng() - 0.5) * 0.25 + Math.PI / 2, 0, 1, 1, 1, 'YXZ'), {
            color: vary(tint, rng, 0.06), moss: 0.95, ground: g0 - 0.4, disp: 0.05, dispScale: 1.6,
          });
          ctx.addCollider({ x: px, z: pz, r: 0.95 });
          void dir;
        }
        // the capital beyond the last drum, upended
        const s = 1.9 + n * (drumH + 0.12) + 0.8;
        const px = x + dx * s, pz = z + dz * s, g0 = ground.groundAt(px, pz);
        B.add(B.box(3.0, 0.55, 3.0, { chip: 0.18, seed: i * 5 }), mat(px, g0 + 0.6, pz, 1.2 + rng() * 0.3, rng() * 3, 0.2), { color: vary(tint, rng, 0.06), moss: 0.95, ground: g0 - 0.5, disp: 0.05 });
        ctx.addCollider({ x: px, z: pz, r: 1.4 });
        rubblePile(B, env, x + dx * 3, z + dz * 3, 2.2, 10, { height: 0.3, size: 0.5, tint });
      }
    }
  }
  // lintels where neighbours both stand; one has come down
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < nCol - 1; i++) {
      if (!tops[r][i] || !tops[r][i + 1]) continue;
      const za = z0 + (i * (z1 - z0)) / (nCol - 1), zb = z0 + ((i + 1) * (z1 - z0)) / (nCol - 1);
      const y = Math.min(tops[r][i], tops[r][i + 1]);
      const len = zb - za + 2.6;
      if (r === 1 && i === 5) {
        // fallen: one end on the floor, the other on its column's plinth
        const gm = ground.groundAt(rowsX[r] + 2.2, (za + zb) / 2);
        B.add(B.box(1.9, 1.45, len, { chip: 0.2, seed: 41 }), mat(rowsX[r] + 2.4, gm + 1.1, (za + zb) / 2, 0.22, 0.35, 0.1), { color: vary(tint, rng, 0.05), course: 0, moss: 0.95, ground: gm - 0.6, disp: 0.05 });
        continue;
      }
      B.add(B.box(1.9, 1.45, len, { seg: 1.2, chip: 0.16, seed: i * 3 + r }), mat(rowsX[r], y + 0.72, (za + zb) / 2, (rng() - 0.5) * 0.02, (rng() - 0.5) * 0.02, (rng() - 0.5) * 0.02), {
        color: vary(tint, rng, 0.05), moss: 0.7, ground: y - 10, disp: 0.045,
      });
      // a cornice moulding on the outer face
      const ox = rowsX[r] + (r === 0 ? -1.05 : 1.05);
      B.add(B.box(0.25, 0.3, len - 0.4, { chip: 0.05 }), mat(ox, y + 1.25, (za + zb) / 2), { color: vary(tints.old, rng, 0.05), moss: 0.5, ground: y - 10 });
    }
  }

  // the hall's outer walls: low ruined runs with gaps where doors were
  for (const side of [-1, 1]) {
    const wx = cx + side * 15.5;
    for (let z = cz - 21; z < cz + 21; z += 2) {
      const n = ctx.noise.noise2(z * 0.13 + side * 9, 2.2);
      const h = 0.6 + 2.6 * Math.max(0, n + 0.3) + rng() * 0.3;
      if (h < 0.75 && rng() < 0.6) continue;
      const gm = ground.groundAt(wx, z + 1), gb = ground.minGround(wx, z + 1, 1.0) - 0.3;
      const H = Math.round(h / 0.6) * 0.6 + gm - gb;
      B.add(B.box(1.4, H, 2.04, { chip: 0.2, chipTop: true, seed: z, uvOffset: [z, 0] }), mat(wx, gb + H / 2, z + 1), { color: vary(tint, rng, 0.06), course: 0.6, moss: 0.9, ground: gm, disp: 0.05 });
      if (h > 1.1) ctx.addCollider({ x: wx, z: z + 1, r: 0.95 });
    }
  }
  // the north end: an apse of great blocks, broken
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    const x = cx + Math.cos(a) * 15, z = cz - 21 + Math.sin(a) * 7;
    const h = 1 + 3.2 * Math.abs(Math.sin(i * 1.7)) * rng();
    const gm = ground.groundAt(x, z), gb = ground.minGround(x, z, 1.2) - 0.3;
    const H = h + gm - gb;
    B.add(B.box(3.6, H, 1.6, { chip: 0.25, chipTop: true, seed: i * 11 }), mat(x, gb + H / 2, z, 0, -a + Math.PI / 2 + Math.PI / 2, 0), { color: vary(tint, rng, 0.06), course: 0.6, moss: 0.9, ground: gm, disp: 0.05 });
    if (h > 1.1) ctx.addCollider({ x, z, r: 1.4 });
  }

  // ---- the flooded shaft ----
  let top = -Infinity, low = Infinity;
  for (let x = pit.x0 - 1; x <= pit.x1 + 1; x += 1) for (let z = pit.z0 - 1; z <= pit.z1 + 1; z += 1) {
    const h = ground.groundAt(x, z); top = Math.max(top, h); low = Math.min(low, h);
  }
  top += 0.04;
  const rise = 0.34, tread = 0.62;
  const box = { x0: pit.x0, x1: pit.x1, z0: pit.z0, z1: pit.z1, top, water: top - 3.5, rise, tread, sx0: pit.x0, sx1: pit.x1 };
  const pm = makePitMaterial(ctx, box);
  const qg = new THREE.PlaneGeometry(pit.x1 - pit.x0, pit.z1 - pit.z0).rotateX(-Math.PI / 2);
  const quad = new THREE.Mesh(qg, pm.mat);
  quad.position.set((pit.x0 + pit.x1) / 2, top, (pit.z0 + pit.z1) / 2);
  quad.name = 'structures-court-pit';
  quad.receiveShadow = false; quad.castShadow = false;
  (env.extraMeshes ||= []).push({ mesh: quad, tris: 2 });
  (env.updates ||= []).push((dt, t) => pm.update(dt, t));
  // the kerb: heavy coping blocks round three sides; the stair's north side opens flush with the floor
  const kerbH = 0.5, kw = 0.85;
  const kerb = (x, z, len, alongX, i) => {
    if (rng() < 0.1) return;
    const gb = ground.minGround(x, z, 0.8) - 0.2;
    const H = top + kerbH - gb + (rng() - 0.5) * 0.08;
    B.add(B.box(alongX ? len : kw, H, alongX ? kw : len, { chip: 0.1, chipTop: true, seed: i }), mat(x, gb + H / 2, z, (rng() - 0.5) * 0.02, (rng() - 0.5) * 0.03, (rng() - 0.5) * 0.02), {
      color: vary(tint, rng, 0.06), moss: 0.85, ground: top, disp: 0.03, wet: 0.15,
    });
  };
  let ki = 0;
  for (let x = pit.x0 - kw; x < pit.x1 + kw - 0.01; x += 1.4) kerb(x + 0.7, pit.z1 + kw / 2, 1.42, true, ki++);
  for (let z = pit.z0; z < pit.z1 - 0.01; z += 1.4) {
    const len = Math.min(1.42, pit.z1 - z);
    kerb(pit.x0 - kw / 2, z + len / 2, len, false, ki++);
    kerb(pit.x1 + kw / 2, z + len / 2, len, false, ki++);
  }
  // the stair's lip: a threshold of worn slabs level with the floor, and newel blocks at its ends
  for (let x = pit.x0; x < pit.x1 - 0.01; x += 1.25) {
    const gb = ground.minGround(x + 0.62, pit.z0 - 0.6, 0.6) - 0.2;
    B.add(B.box(1.24, top - gb + 0.02, 1.2, { chip: 0.05, chipTop: true, seed: x }), mat(x + 0.62, (top + 0.02 + gb) / 2, pit.z0 - 0.6), { color: vary(tint, rng, 0.07), moss: 0.6, ground: top, disp: 0.015 });
  }
  for (const sx of [pit.x0 - kw / 2, pit.x1 + kw / 2]) {
    const gb = ground.minGround(sx, pit.z0 - 0.6, 0.6) - 0.2;
    B.add(B.box(kw + 0.2, top + 1.1 - gb, 1.3, { chip: 0.12, seed: sx }), mat(sx, (top + 1.1 + gb) / 2, pit.z0 - 0.6), { color: vary(tint, rng, 0.05), moss: 0.85, ground: top, disp: 0.03 });
  }
  // nobody walks onto the water
  colliderChain(ctx, pit.x0 + 0.2, pit.z0 + 0.2, pit.x1 - 0.2, pit.z0 + 0.2, 0.45, 1.0);
  colliderChain(ctx, pit.x0 + 0.2, pit.z0 + 0.2, pit.x0 + 0.2, pit.z1 + 0.1, 0.45, 1.0);
  colliderChain(ctx, pit.x1 - 0.2, pit.z0 + 0.2, pit.x1 - 0.2, pit.z1 + 0.1, 0.45, 1.0);
  colliderChain(ctx, pit.x0 + 0.2, pit.z1 - 0.1, pit.x1 - 0.2, pit.z1 - 0.1, 0.45, 1.0);

  // ---- the colossus: leg-stumps on their plinth, and its head in the grass ----
  {
    const px = cx + 12, pz = cz + 27;
    const gm = ground.groundAt(px, pz), gb = ground.minGround(px, pz, 3) - 0.3;
    B.add(B.box(6.4, 2.2 + gm - gb, 4.6, { chip: 0.3, seed: 5 }), mat(px, gb + (2.2 + gm - gb) / 2, pz, 0, 0.3, 0), { color: vary(tint, rng, 0.05), course: 0.73, moss: 0.95, ground: gm, disp: 0.05 });
    B.add(B.box(6.9, 0.4, 5.1, { chip: 0.15 }), mat(px, gm + 2.15, pz, 0, 0.3, 0), { color: vary(tints.old, rng, 0.05), moss: 0.8, ground: gm, disp: 0.03 });
    for (const s of [-1, 1]) {
      const lx = px + Math.cos(0.3) * s * 1.5, lz = pz - Math.sin(0.3) * s * 1.5;
      // sandalled feet
      B.add(B.box(1.1, 0.7, 2.3, { chip: 0.2, seed: s }), mat(lx, gm + 2.7, lz + 0.35, 0, 0.3, 0), { color: vary(tint, rng, 0.04), moss: 0.7, ground: gm, disp: 0.05 });
      const hgt = s < 0 ? 3.4 : 1.8;
      const leg = B.cyl(0.62, 0.72, hgt, 14, 3);
      const pos = leg.attributes.position;
      for (let q = 0; q < pos.count; q++) if (pos.getY(q) > hgt / 2 - 0.01) pos.setY(q, hgt / 2 - 0.4 * (1 + Math.sin(Math.atan2(pos.getZ(q), pos.getX(q)) * 2 + s)) * 0.5);
      B.add(leg, mat(lx, gm + 3.0 + hgt / 2, lz - 0.1, 0.03 * s, 0, 0.02), { color: vary(tint, rng, 0.04), moss: 0.65, ground: gm, disp: 0.06, dispScale: 1.5 });
    }
    ctx.addCollider({ x: px, z: pz, r: 2.6 });
    ctx.addCollider({ x: px + 1.8, z: pz - 0.6, r: 2.0 });
    ctx.addCollider({ x: px - 1.8, z: pz + 0.6, r: 2.0 });
    colossalHead(ctx, B, env, px + 9, pz + 3, tint);
  }
  env.notes.court = { pit: box };
}

function colossalHead(ctx, B, env, hx, hz, tint) {
  const { rng, ground } = env;
  const N2 = ctx.noise.noise2;
  const g = new THREE.SphereGeometry(1, 60, 44);
  const pos = g.attributes.position;
  const gauss = (dx, dy, sx, sy) => Math.exp(-(dx * dx) / (sx * sx) - (dy * dy) / (sy * sy));
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // head proportions: taller than wide, the jaw narrowing, the back of the skull full
    const jaw = y < -0.2 ? 1 - 0.28 * Math.min(1, (-0.2 - y) / 0.8) : 1;
    x *= 0.8 * jaw; z *= 0.9 * (y < -0.2 ? 1 - 0.12 * Math.min(1, (-0.2 - y) / 0.8) : 1); y *= 1.12;
    if (z > 0) {
      const f = z;
      // nose: a ridge with a heavy tip
      z += 0.24 * gauss(x, y + 0.12, 0.09, 0.26) * (y < 0.15 ? 1 : 0.4) * f;
      // brow and the hollow eyes beneath
      z += 0.07 * gauss(0, y - 0.22, 1, 0.07) * gauss(x, 0, 0.5, 1);
      z -= 0.11 * (gauss(Math.abs(x) - 0.28, y - 0.08, 0.13, 0.09));
      z += 0.03 * (gauss(Math.abs(x) - 0.28, y - 0.07, 0.07, 0.04));
      // cheekbones, the lips and the line between them, the chin
      z += 0.05 * gauss(Math.abs(x) - 0.42, y + 0.1, 0.12, 0.14);
      z += 0.06 * gauss(x, y + 0.53, 0.2, 0.05) - 0.04 * gauss(x, y + 0.585, 0.24, 0.018) + 0.04 * gauss(x, y + 0.64, 0.17, 0.04);
      z += 0.07 * gauss(x, y + 0.86, 0.17, 0.09);
    }
    // ears
    const ear = gauss(Math.abs(x) > 0 ? 0 : 0, y + 0.02, 1, 0.2) * gauss(z + 0.05, 0, 0.16, 1) * (Math.abs(x) > 0.7 ? 1 : 0);
    x += Math.sign(x) * 0.06 * ear;
    // centuries of rain
    const w = N2(x * 2.6 + 3, y * 2.6 + z * 1.7) * 0.025 + N2(x * 9 + z * 5, y * 9) * 0.008;
    pos.setXYZ(i, x * (1 + w), y * (1 + w), z * (1 + w));
  }
  const S = 3.0;
  const gm = ground.groundAt(hx, hz);
  // lying on its right cheek, face toward the approach (and the sun), sunk to the ear
  const faceYaw = Math.atan2(-0.78, 0.62);
  const m = mat(hx, gm + 0.55 * S, hz, 0, faceYaw, -Math.PI / 2 + 0.22, S, S, S);
  B.add(g, m, { color: tint, moss: 1.0, ground: gm, disp: 0.06, dispScale: 0.8 });
  // a neck stump, broken across
  const neck = B.cyl(0.42, 0.5, 0.7, 20, 2);
  const np = neck.attributes.position;
  for (let i = 0; i < np.count; i++) if (np.getY(i) < -0.34) np.setY(i, -0.35 - 0.12 * Math.sin(np.getX(i) * 7) * Math.cos(np.getZ(i) * 5));
  B.add(neck, m.clone().multiply(new THREE.Matrix4().makeTranslation(0, -1.15, -0.12)), { color: tint, moss: 0.9, ground: gm, disp: 0.04 });
  // the crown: a band with tall points, some snapped off and lying near
  const crownM = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.72, -0.05));
  B.add(B.cyl(0.84, 0.8, 0.26, 28, 1, true), crownM, { color: vary(tint, rng, 0.05), moss: 0.7, ground: gm, disp: 0.02 });
  B.add(B.cyl(0.86, 0.86, 0.06, 28, 1, true), crownM.clone().multiply(new THREE.Matrix4().makeTranslation(0, -0.1, 0)), { color: vary(tint, rng, 0.05), moss: 0.6, ground: gm });
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.2;
    const broken = k === 2 || k === 5;
    const h = broken ? 0.18 : 0.55;
    const pm = crownM.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * 0.82, 0.13 + h / 2, Math.sin(a) * 0.82), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)), -0.18), new THREE.Vector3(1, 1, 1)));
    B.add(B.cyl(broken ? 0.07 : 0.0, 0.14, h, 4, 1), pm, { color: vary(tint, rng, 0.05), moss: 0.5, ground: gm });
    if (broken) {
      const px = hx + (rng() - 0.5) * 9, pz = hz + 4 + rng() * 3;
      const g0 = ground.groundAt(px, pz);
      B.add(B.cyl(0.0, 0.14 * S, 0.4 * S, 4, 1), mat(px, g0 + 0.2, pz, Math.PI / 2, rng() * 6, 0.2), { color: vary(tint, rng, 0.05), moss: 0.9, ground: g0 - 0.3, disp: 0.03 });
    }
  }
  ctx.addCollider({ x: hx, z: hz, r: 3.0 });
  ctx.addCollider({ x: hx + Math.cos(faceYaw) * 1.6, z: hz - Math.sin(faceYaw) * 1.6, r: 2.0 });
  ctx.addCollider({ x: hx - Math.cos(faceYaw) * 1.6, z: hz + Math.sin(faceYaw) * 1.6, r: 2.0 });
}
