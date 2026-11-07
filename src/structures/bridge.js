// The etched bridge: a huge crumbling bridge striding over the dry bed south of the tarn. Tall piers
// with cutwaters, arched spans, a broken deck with a gap in the middle, and great fallen chunks on the
// earth beneath. Parapets, piers and fallen chunks are cut with recursive triangle motifs.
import * as THREE from 'three';
import { mat } from './geo.js';
import { vary, rubblePile } from './common.js';

export const BRIDGE = { a: { x: -60, z: 200 }, b: { x: -130, z: 230 }, deckY: 15.5, width: 7 };

export function buildBridge(ctx, B, env) {
  const { rng, ground, tints } = env;
  const { a, b, deckY, width } = BRIDGE;
  const L = Math.hypot(b.x - a.x, b.z - a.z);
  const dx = (b.x - a.x) / L, dz = (b.z - a.z) / L;
  const nx = -dz, nz = dx;
  const yawAlong = Math.atan2(dx, dz);      // local z along the bridge
  const yawX = yawAlong - Math.PI / 2;      // local x along the bridge
  const P = (s, o = 0) => ({ x: a.x + dx * s + nx * o, z: a.z + dz * s + nz * o });
  const tint = vary(tints.old, rng, 0.03).multiplyScalar(0.82);
  const COURSE = 0.62;
  const gapS0 = L * 0.44, gapS1 = L * 0.58;

  // a recursive triangle motif, cut into a face: m positions the face (local x across, y up, +z out)
  const sierp = (m, cx0, cy0, size, depth) => {
    const strokes = [];
    const rec = (x, y, s, d) => {
      const h = s * 0.866;
      const p0 = [x - s / 2, y], p1 = [x + s / 2, y], p2 = [x, y + h];
      if (d === 0) { strokes.push([p0, p1], [p1, p2], [p2, p0]); return; }
      rec(x - s / 4, y, s / 2, d - 1); rec(x + s / 4, y, s / 2, d - 1); rec(x, y + h / 2, s / 2, d - 1);
    };
    rec(cx0, cy0, size, depth);
    const th = Math.max(0.025, size * 0.012);
    for (const [[x0, y0], [x1, y1]] of strokes) {
      const len = Math.hypot(x1 - x0, y1 - y0) + th;
      const lm = new THREE.Matrix4().compose(new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, 0.012), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan2(y1 - y0, x1 - x0)), new THREE.Vector3(1, 1, 1));
      B.add(B.box(len, th, 0.03), m.clone().multiply(lm), { color: tints.carve, moss: 0.15, ground: -100 });
    }
  };

  // piers and abutments
  const piers = [0, L * 0.2, L * 0.36, gapS0 - 1, gapS1 + 1, L * 0.78, L];
  const tops = [];
  for (let i = 0; i < piers.length; i++) {
    const s = piers[i], p = P(s);
    const gm = ground.groundAt(p.x, p.z), gb = ground.minGround(p.x, p.z, 4) - 0.6;
    const abut = i === 0 || i === piers.length - 1;
    const pw = abut ? 6 : 3.6;
    const H = deckY - gb - 1.6;
    const m = mat(p.x, gb + H / 2, p.z, 0, yawX, 0);
    B.add(B.box(pw, H, width + (abut ? 1 : 0.6), { seg: 1.2, chip: 0.3, seed: i * 9, uvOffset: [s, 0] }), m, { color: vary(tint, rng, 0.04), course: COURSE, moss: 0.8, ground: gm, disp: 0.08, dispScale: 0.9 });
    if (!abut) {
      // cutwaters: pointed noses up- and downstream, a stepped plinth
      for (const side of [-1, 1]) {
        const cp = P(s, side * (width / 2 + 0.3));
        const cw = B.cyl(pw * 0.5, pw * 0.62, H * 0.55, 3, 3);
        B.add(cw, mat(cp.x, gb + H * 0.275, cp.z, 0, yawX + (side > 0 ? 0 : Math.PI) + Math.PI / 6, 0), { color: vary(tint, rng, 0.04), course: COURSE, moss: 0.9, ground: gm, disp: 0.08, dispScale: 0.9 });
      }
      B.add(B.box(pw + 1.6, 1.4 + gm - gb, width + 3.2, { chip: 0.3 }), mat(p.x, gb + (1.4 + gm - gb) / 2, p.z, 0, yawX, 0), { color: vary(tint, rng, 0.05), course: COURSE, moss: 1, ground: gm, disp: 0.07 });
      // etched motif on both broad faces of the pier
      for (const side of [-1, 1]) {
        const fm = mat(p.x + nx * side * ((width + 0.6) / 2 + 0.01), gm + 6.5, p.z + nz * side * ((width + 0.6) / 2 + 0.01), 0, yawX + (side > 0 ? 0 : Math.PI), 0);
        sierp(fm, 0, 0, 2.6, i % 2 ? 3 : 2);
      }
      ctx.addCollider({ x: p.x, z: p.z, r: 2.4 });
      for (const side of [-1, 1]) { const q = P(s, side * 3.6); ctx.addCollider({ x: q.x, z: q.z, r: 2.0 }); }
    } else {
      for (const side of [-1, 1]) for (const k of [-1, 0, 1]) { const q = P(s + k * 2, side * 2.4); ctx.addCollider({ x: q.x, z: q.z, r: 1.8 }); }
      // a slope of rubble falling from the abutment toward the land (it cannot be climbed)
      const out = i === 0 ? -1 : 1;
      rubblePile(B, env, p.x + dx * out * 6, p.z + dz * out * 6, 6, 60, { height: 3.5, size: 1.0, tint, blocks: 0.55 });
    }
    tops.push(deckY - 1.6);
  }
  // spans: arches with spandrels, and the deck over them, except over the gap
  for (let i = 0; i < piers.length - 1; i++) {
    const s0 = piers[i], s1 = piers[i + 1];
    if (s0 >= gapS0 - 1.5 && s1 <= gapS1 + 1.5) continue;
    const pw0 = i === 0 ? 3 : 1.8, pw1 = i + 1 === piers.length - 1 ? 3 : 1.8;
    const sa = s0 + pw0, sb = s1 - pw1;
    const span = sb - sa, half = span / 2;
    const mid = P((sa + sb) / 2);
    const gm = ground.groundAt(mid.x, mid.z);
    const rise = Math.min(half, 9);
    const spring = deckY - 1.6 - rise - 0.9;
    const sh = new THREE.Shape();
    sh.moveTo(-half - 0.05, spring); sh.lineTo(-half - 0.05, deckY - 0.2); sh.lineTo(half + 0.05, deckY - 0.2); sh.lineTo(half + 0.05, spring);
    // a segmental-elliptical arch
    for (let k = 0; k <= 16; k++) { const t = k / 16 * Math.PI; sh.lineTo(Math.cos(t) * half, spring + Math.sin(t) * rise); }
    sh.lineTo(-half - 0.05, spring);
    B.add(B.extrude(sh, width, 4), mat(mid.x, 0, mid.z, 0, yawX, 0), { color: vary(tint, rng, 0.04), course: COURSE, moss: 0.75, ground: gm, disp: 0.07, dispScale: 0.9 });
    // voussoir ring proud of the faces
    for (const side of [-1, 1]) {
      for (let k = 0; k < 13; k++) {
        const t = (k + 0.5) / 13 * Math.PI;
        const vx = Math.cos(t) * (half + 0.35), vy = spring + Math.sin(t) * (rise + 0.35);
        const q = P((sa + sb) / 2 + vx, side * (width / 2 + 0.08));
        B.add(B.box(0.55, 0.9, 0.2, { chip: 0.06 }), mat(q.x, vy, q.z, 0, yawX, t - Math.PI / 2), { color: vary(tints.old, rng, 0.06).multiplyScalar(0.85), moss: 0.6, ground: gm });
      }
    }
  }
  // deck parapets with etched panels, crumbling toward the gap
  for (const side of [-1, 1]) {
    for (let s = 0; s < L - 0.01; s += 2.2) {
      const sm = s + 1.1;
      if (sm > gapS0 - 2 && sm < gapS1 + 2) continue;
      const near = Math.min(Math.abs(sm - gapS0), Math.abs(sm - gapS1));
      if (near < 6 && rng() < 0.5) continue;
      const q = P(sm, side * (width / 2 - 0.3));
      const h = 1.2 - (near < 8 ? rng() * 0.8 : 0) - (rng() < 0.1 ? 0.6 : 0);
      if (h < 0.25) continue;
      const m = mat(q.x, deckY - 0.2 + h / 2, q.z, 0, yawX, 0);
      B.add(B.box(2.22, h, 0.6, { chip: 0.08, chipTop: true, seed: s * 3 + side }), m, { color: vary(tint, rng, 0.05), course: 0.4, moss: 0.8, ground: deckY - 0.3, disp: 0.03 });
      if (h > 0.9 && Math.round(s / 2.2) % 2 === 0) {
        const fm = mat(q.x + nx * side * 0.31, deckY - 0.2 + 0.18, q.z + nz * side * 0.31, 0, yawX + (side > 0 ? 0 : Math.PI), 0);
        sierp(fm, 0, 0, 0.85, 2);
      }
    }
    // a moulded cornice along the outer face under the parapet
    for (let s = 0; s < L; s += 3) {
      const sm = s + 1.5;
      if (sm > gapS0 - 1 && sm < gapS1 + 1) continue;
      const q = P(sm, side * (width / 2 + 0.2));
      B.add(B.box(3.02, 0.35, 0.4, { chip: 0.06 }), mat(q.x, deckY - 0.35, q.z, 0, yawX, 0), { color: vary(tints.old, rng, 0.05).multiplyScalar(0.85), moss: 0.6, ground: deckY - 1 });
    }
  }
  // the broken ends of the deck over the gap: ragged, hanging blocks
  for (const [s, dir] of [[gapS0 - 1, 1], [gapS1 + 1, -1]]) {
    for (let k = 0; k < 6; k++) {
      const q = P(s + dir * (0.5 + rng() * 1.5), (rng() - 0.5) * width);
      B.add(B.box(1.2 + rng(), 0.9 + rng() * 0.8, 1.3, { chip: 0.2 }), mat(q.x, deckY - 1.0 - rng() * 1.2, q.z, (rng() - 0.5) * 0.4, yawX, dir * (0.2 + rng() * 0.4)), { color: vary(tint, rng, 0.05), course: COURSE, moss: 0.7, ground: deckY - 5, disp: 0.05 });
    }
  }
  // the fallen span: huge chunks on the earth beneath, etching still showing on their faces
  for (let k = 0; k < 7; k++) {
    const s = gapS0 + (k + 0.5) / 7 * (gapS1 - gapS0) + (rng() - 0.5) * 3;
    const q = P(s, (rng() - 0.5) * 14);
    const gy = ground.groundAt(q.x, q.z);
    const w = 3 + rng() * 3, h = 1.6 + rng() * 1.8, d = 2.5 + rng() * 3;
    const rx = (rng() - 0.5) * 0.9, ry = yawX + (rng() - 0.5) * 1.2, rz = (rng() - 0.5) * 0.9;
    const m = mat(q.x, gy + h * 0.25, q.z, rx, ry, rz);
    B.add(B.box(w, h, d, { seg: 1.0, chip: 0.4, seed: k * 5 }), m, { color: vary(tint, rng, 0.05), course: COURSE, moss: 0.95, ground: gy, disp: 0.1, dispScale: 0.8 });
    if (k % 2 === 0) sierp(m.clone().multiply(new THREE.Matrix4().makeTranslation(0, -h * 0.35, d / 2 + 0.01)), 0, 0, Math.min(w, h) * 0.8, 2);
    ctx.addCollider({ x: q.x, z: q.z, r: Math.min(w, d) * 0.5 + 0.3 });
  }
  rubblePile(B, env, P((gapS0 + gapS1) / 2).x, P((gapS0 + gapS1) / 2).z, 9, 70, { height: 1.2, size: 0.9, tint, blocks: 0.5 });
  env.notes.bridge = { a, b, deckY, gap: [P(gapS0), P(gapS1)] };
}
