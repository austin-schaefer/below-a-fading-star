// The Heliarchs' leat (v17 W2): the stonework of the channel the kit's leat runs in (src/v17/bodies.js LEAT_BODY; its
// line, levels and weirs are plan.js LEAT). The water is the kit's (src/v17/water.js draws it in the streams' one
// ribbon, its white at each weir from the kit's ROUGH); this module is the made thing round it, one mesh in the stone
// shader (one draw): a kerb of dressed blocks either side, each a little sunk and tilted, a few gone and one fallen
// into the third pond; at each weir a sill of three blocks across the channel under a dressed coping, the water over
// it, the fourth breached (its middle block gone, lying in the pond below); a stone headwall at the head; and the slab
// bridge where P14 and P38 meet at (9, 252), two long slabs on the kerbs with a step down at each end where the ground
// is low, hexagonal posts at its four corners (the Heliarchs' hexagon), walkable (a raise-only floor).
import * as THREE from 'three';
import { makeStoneMaterial } from '../structures/materials.js';
import { Builder } from '../structures/geo.js';
import { COLORS } from '../v8/strata/parts.js';
import { LEAT } from './plan.js';
import { LEAT_BODY as L } from './bodies.js';

export async function build(ctx) {
  const T = ctx.terrain, H = (x, z) => T.heightAt(x, z);
  const rng = ctx.makeRng(17042);
  const r = (a, b) => a + (b - a) * rng();
  const B = new Builder(ctx.noise);
  const base = COLORS.heliarch.stone, dark = COLORS.heliarch.dark;
  const tint = (k = 0.5) => base.clone().lerp(dark, k * rng()).multiplyScalar(r(0.86, 1.04));
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(0, 0, 0, 'YXZ'), V = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);
  // a box of w (across the flow, local x) by h by d (along it, local z), its centre at (x, y, z), turned to the flow
  // (yaw from the tangent) and tipped by (rx, rz)
  const put = (w, h, d, x, y, z, tx, tz, o = {}, rx = 0, rz = 0, dyaw = 0) => {
    E.set(rx, Math.atan2(tx, tz) + dyaw, rz); Q.setFromEuler(E);
    M.compose(V.set(x, y, z), Q, ONE);
    B.add(B.box(w, h, d, { chip: o.chip ?? 0.05, seg: 0.8, seed: rng() * 50 }), M, { color: o.color ?? tint(), course: 0, moss: o.moss ?? 0.55, wet: o.wet ?? 0.4 });
  };
  const near = (x, z) => { let bi = 0, bd = Infinity; for (let k = 0; k < L.n; k++) { const d = (L.X[k] - x) ** 2 + (L.Z[k] - z) ** 2; if (d < bd) { bd = d; bi = k; } } return bi; };
  const sMouth = L.sOf(...LEAT.hold[1]);
  const weirS = LEAT.weirs.map(([x, z]) => L.S[near(x, z)]);
  const fallenK = near(...LEAT.fallen);
  const bridgeK = near(...LEAT.bridge.at);
  const atS = (s) => Math.min(L.n - 1, Math.max(0, Math.round(s / 0.5)));

  // ---- the kerbs: a block every 1.15 m either side, its inner face on the water's edge
  const KW = 0.5, KL = 1.05, KH = 0.72;
  const sb = L.S[bridgeK], bHalf = LEAT.bridge.w / 2 + 0.2;
  for (let s = 0.9; s < sMouth - 0.6; s += KL + 0.1) {
    const k = atS(s), tx = L.TX[k], tz = L.TZ[k];
    // the highest level the block spans (so it never dips at a weir), and the ground behind it
    let y = -Infinity; for (let j = atS(s - KL / 2); j <= atS(s + KL / 2); j++) y = Math.max(y, L.Y[j]);
    for (const side of [1, -1]) {
      if (rng() < 0.05) continue; // a stone gone
      if (Math.abs(s - sb) < bHalf) continue; // the bridge's own bearers stand here
      const d = side * (L.HW[k] + KW / 2 - 0.02), x = L.X[k] + tz * d, z = L.Z[k] - tx * d;
      if (side < 0 && Math.abs(s - L.S[fallenK]) < 1.4) continue; // the one fallen in
      const back = H(L.X[k] + tz * side * (L.HW[k] + KW + 0.3), L.Z[k] - tx * side * (L.HW[k] + KW + 0.3));
      const top = Math.min(y + 0.85, Math.max(y + 0.3, back + 0.06)) - r(0, 0.12); // sunk a little, some more than others
      put(KW, KH, KL, x, top - KH / 2, z, tx, tz, { wet: 0.6 }, r(-0.04, 0.04), side * r(-0.03, 0.09), r(-0.035, 0.035));
    }
  }
  // the one fallen into the third pond: on its side, half under the water
  {
    const k = fallenK, tx = L.TX[k], tz = L.TZ[k], d = -(L.HW[k] - 0.45);
    put(KW, KH, KL, L.X[k] + tz * d, L.Y[k] - 0.3, L.Z[k] - tx * d, tx, tz, { wet: 1, moss: 0.8 }, 0.25, 1.25, 0.5);
  }

  // ---- the weirs: a sill of three blocks across under a dressed coping, its downstream face at the step's head
  const breached = [];
  LEAT.weirs.forEach(([, , top, below, state], i) => {
    const s0 = weirS[i] - 0.3, k = atS(s0), tx = L.TX[k], tz = L.TZ[k], hw = L.HW[k];
    const W = hw * 2 + 0.6, n = 3, bw = W / n, D = 0.8, bot = below - 0.3, yt = top - 0.05;
    for (let j = 0; j < n; j++) {
      const d = -W / 2 + bw * (j + 0.5);
      const cx = L.X[k] - tx * D / 2 + tz * d, cz = L.Z[k] - tz * D / 2 - tx * d;
      if (state === 'breached' && j === 1) { breached.push({ k, d, tx, tz, below }); continue; }
      const sink = state === 'breached' ? 0.12 + 0.1 * (j === 0 ? 1 : 0.4) : r(0, 0.03);
      put(bw - 0.03, yt - bot, D, cx, (yt + bot) / 2 - sink, cz, tx, tz, { wet: 0.9 }, 0, state === 'breached' ? (j === 0 ? 0.06 : -0.08) : 0);
      // the coping: a dressed lip, proud of the face by 0.08, its edge where the water turns over
      put(bw - 0.02, 0.14, 0.42, cx + tx * (D / 2 - 0.13), yt - 0.06 - sink, cz + tz * (D / 2 - 0.13), tx, tz, { color: tint(0.2).multiplyScalar(1.08), chip: 0.025, wet: 1, moss: 0.3 }, 0, state === 'breached' ? (j === 0 ? 0.06 : -0.08) : 0);
    }
    // its cheeks: a taller block in each kerb at the weir
    for (const side of [1, -1]) {
      const d = side * (hw + KW / 2), x = L.X[k] + tz * d, z = L.Z[k] - tx * d;
      put(KW + 0.08, 1.4, 1.3, x, top + 0.42 - 0.7, z, tx, tz, { color: tint(0.3), wet: 0.6 });
    }
  });
  // the breach's stone, lying in the pond below, tipped downstream
  for (const b of breached) {
    const k = Math.min(L.n - 1, b.k + 5), x = L.X[k] + b.tz * (b.d + 0.2), z = L.Z[k] - b.tx * (b.d + 0.2);
    put(0.95, 1.0, 0.8, x, b.below - 0.35, z, L.TX[k], L.TZ[k], { wet: 1, moss: 0.85 }, 0.9, 0.2, 0.3);
  }

  // ---- the headwall: where the leat leaves the fen's flat, a low wall round its head with the kerbs' ends in it
  {
    const k = 0, tx = L.TX[k], tz = L.TZ[k], w = L.HW[k] * 2 + 1.2;
    put(w, 1.0, 0.6, L.X[k] - tx * 0.4, LEAT.head - 0.15, L.Z[k] - tz * 0.4, tx, tz, { wet: 0.5 });
  }

  // ---- the slab bridge across pond 2, square to the channel, where P14 and P38 meet
  {
    const k = bridgeK, tx = L.TX[k], tz = L.TZ[k], cx = L.X[k], cz = L.Z[k], y = L.Y[k];
    const half = LEAT.bridge.len / 2, w = LEAT.bridge.w, top = y + 0.78;
    // across (bx, bz) = (tz, -tx): along the walk; the deck in two slabs side by side
    const P = (b, a) => [cx + tz * b + tx * a, cz - tx * b + tz * a];
    for (const a of [-w / 4, w / 4]) {
      const [x, z] = P(0, a);
      put(w / 2 - 0.04, 0.34, half * 2, x, top - 0.17, z, tz, -tx, { color: tint(0.25), chip: 0.04, wet: 0.2 }, 0, 0.012 * Math.sign(a));
    }
    // the bearers on the kerbs' line and the steps down to the ground at each end
    const steps = [];
    for (const side of [1, -1]) {
      const [bx, bz] = P(side * (L.HW[k] + 0.35), 0);
      const g = Math.min(H(...P(side * (L.HW[k] + 0.6), 0)), y + 0.2);
      put(w + 0.3, top - 0.34 - (g - 0.4), 0.9, bx, (top - 0.34 + g - 0.4) / 2, bz, tz, -tx, { wet: 0.5 });
      // steps: down 0.36 a tread, 0.75 deep, until the ground is within a riser
      let b = half, t = top;
      for (let i = 0; i < 4; i++) {
        const [gx, gz] = P(side * (b + 0.4), 0), gh = H(gx, gz);
        if (t - gh <= 0.42) break;
        t -= 0.36;
        const [sx, sz] = P(side * (b + 0.375), 0);
        put(w + 0.1, t - gh + 0.4, 0.75, sx, (t + gh - 0.4) / 2, sz, tz, -tx, { color: tint(0.4), wet: 0.1, moss: 0.7 }, 0, 0, r(-0.03, 0.03));
        steps.push({ b0: b, b1: b + 0.75, side, t });
        b += 0.75;
      }
      // the hexagonal posts at the deck's corners
      for (const a of [-1, 1]) {
        const [px, pz] = P(side * (half - 0.25), a * (w / 2 + 0.12));
        M.compose(V.set(px, top + 0.3, pz), Q.setFromEuler(E.set(0, r(0, 1), 0)), ONE);
        B.add(B.cyl(0.19, 0.22, 0.95, 6), M, { color: tint(0.3), moss: 0.4 });
        M.compose(V.set(px, top + 0.8, pz), Q, ONE);
        B.add(B.cyl(0.24, 0.24, 0.08, 6), M, { color: tint(0.1), moss: 0.3 });
      }
    }
    // the floor: the deck, then the treads (raise-only: the ground wins where it is higher)
    ctx.addWalkable((x, z) => {
      const dx = x - cx, dz = z - cz, a = dx * tx + dz * tz, b = dx * tz - dz * tx;
      if (Math.abs(a) > w / 2 + 0.05) return null;
      if (Math.abs(b) <= half) return top;
      for (const st of steps) if (Math.sign(b) === st.side && Math.abs(b) > st.b0 && Math.abs(b) <= st.b1) return st.t;
      return null;
    });
    ctx.leat = { bridge: { x: cx, z: cz, top, across: [tz, -tx], half, w } };
    // walked by tools/heights-test.mjs: from the meeting of P14 and P38 at its east foot over the deck to the trod on its west side
    const foot = (b) => P(b, 0);
    ctx.ascents?.add({ id: 'leat-bridge', path: [LEAT.meet, foot(half - 0.3).concat([top]), foot(0).concat([top]), foot(-half + 0.3).concat([top]), foot(-half - 2.6)], offs: [0.5] });
  }

  const mesh = new THREE.Mesh(B.build(), makeStoneMaterial(ctx).mat);
  mesh.name = 'leat-stone'; mesh.castShadow = true; mesh.receiveShadow = true;
  ctx.scene.add(mesh);
}
