// The Great Span's gates (v4, W): at either end, where the deck meets the wall, a portal 34 m tall framed in
// blocks the size of houses, its doors slabs of bronze-bound stone etched with the triangles, set in a crag of
// the wall. The west gate's doors are shut, meeting flush, no handle, no gap, its sill worn by nothing; the east
// gate is blocked by a fall of rock from the wall above, boulders the size of the keep's towers heaped against
// it and a few lying out across the deck to x 235.
import * as THREE from 'three';
import { SPAN, BOT } from './plan.js';
import { box, triPrism, clean } from './geo.js';

const Y = SPAN.deckY, Z = SPAN.z, Z0 = SPAN.z0, Z1 = SPAN.z1;

export function buildGates(K) {
  const { ctx, hi, rng, jit, H, addCol, gates, crags, doors, metals, paint } = K;
  // ---------------------------------------------------------------- the gates
  const F = SPAN.facade, gw = SPAN.gateW / 2, gTop = Y + SPAN.gateH;
  for (const s of [-1, 1]) {
    const X = (a, b) => [Math.min(s * a, s * b), Math.max(s * a, s * b)];
    const [fx0, fx1] = X(SPAN.gateX, SPAN.gateX + F.depth);
    const east = s > 0;
    // the wall's front: two flanks, the block over the portal (broken on the east, where the rock came down),
    // and under the deck
    gates.push(box(fx0, fx1, BOT - 4, F.top, F.z0, Z - gw));
    gates.push(box(fx0, fx1, BOT - 4, F.top - (east ? 6 : 0), Z + gw, F.z1));
    gates.push(box(fx0, fx1, gTop, east ? gTop + 12 : F.top, Z - gw, Z + gw));
    gates.push(box(fx0, fx1, BOT - 4, Y, Z - gw, Z + gw));
    if (east) for (let k = 0; k < 5; k++) { // the broken edge above the portal
      const z0 = Z - gw - 6 + k * 7 + jit(1), h = 4 + rng() * 9;
      gates.push(box(fx0 + rng() * 3, fx1, gTop + 12, gTop + 12 + h, z0, z0 + 5 + rng() * 3));
    }
    // the rock the gate is cut into: a crag of the wall standing out over the trough behind the front range,
    // so the gate reads in the wall and not as a block before it
    {
      const C = SPAN.crag, [cx0, cx1] = X(C.x0, C.x1), N = ctx.noise;
      const g = new THREE.BoxGeometry(cx1 - cx0, C.top - BOT, C.z1 - C.z0, hi ? 8 : 5, hi ? 12 : 7, hi ? 16 : 9);
      g.translate((cx0 + cx1) / 2, (C.top + BOT) / 2, (C.z0 + C.z1) / 2);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const u = (y - BOT) / (C.top - BOT);
        // crag the faces and pinch the top in; a shared corner gets the same displacement from every face. The
        // face toward the bowl only ever moves back, behind the dressed front.
        const ax = N.fbm2(y * 0.045 + z * 0.02, x * 0.03, 3), az = N.fbm2(x * 0.04 + 7, y * 0.05 + z * 0.01, 3), ay = N.ridged2(x * 0.035, z * 0.035, 3);
        const pinch = u * u * 10, xc = (cx0 + cx1) / 2, zc = (C.z0 + C.z1) / 2;
        const front = Math.abs(x - s * C.x0) < 0.1;
        const dx = front ? s * (2 + Math.abs(ax) * 4) : ax * 6 - Math.sign(x - xc) * pinch;
        const dy = u > 0.99 ? (ay - 0.4) * 30 : ay * 3 * u;
        p.setXYZ(i, x + dx, y + dy, z + az * 7 - Math.sign(z - zc) * pinch);
      }
      g.deleteAttribute('uv'); g.deleteAttribute('normal');
      crags.push(clean(g));
      // its foot keeps you off it (the wall's walk limit keeps you off the rest)
      for (let z = C.z0; z <= C.z1; z += 3) addCol({ x: s * (C.x0 + 1), z, r: 2.5 });
      for (let x = C.x0; x <= C.x1; x += 3) { addCol({ x: s * x, z: C.z0 + 1, r: 2.5 }); addCol({ x: s * x, z: C.z1 - 1, r: 2.5 }); }
    }
    // the portal's frame: jambs of three house-sized blocks each, a lintel, a relieving triangle over it
    const [jx0, jx1] = X(SPAN.gateX - 6, SPAN.gateX);
    for (const [zA, zB] of [[Z - gw - 8, Z - gw], [Z + gw, Z + gw + 8]]) {
      for (let k = 0; k < 3; k++) {
        const y0 = Y + k * (SPAN.gateH / 3), y1 = y0 + SPAN.gateH / 3, inset = k % 2 ? 0.35 : 0;
        gates.push(box(jx0 + (s < 0 ? inset : 0), jx1 - (s > 0 ? inset : 0), y0 + 0.05, y1 - 0.05, zA + inset, zB - inset));
      }
    }
    const [lx0, lx1] = X(SPAN.gateX - 7, SPAN.gateX + 1);
    gates.push(box(lx0, lx1, gTop, gTop + 12, Z - gw - 12, Z + gw + 12));
    if (!east) { const [tx0, tx1] = X(SPAN.gateX - 2.5, SPAN.gateX); gates.push(triPrism(tx0, tx1, Z - 13, Z + 13, gTop + 12, gTop + 24)); }
    // the doors: two leaves meeting flush, no handle, no gap; the west's sill worn by nothing
    const [dx0, dx1] = X(SPAN.gateX, SPAN.gateX + 2);
    const sill = Y + (east ? 0 : 0.25);
    if (!east) {
      // the north leaf keeps the Postern's opening at its foot (BG): (-257, 212), 1.1 m by 2.3 m
      const pz0 = 211.45, pz1 = 212.55, py1 = sill + 2.3;
      doors.push(box(dx0, dx1, sill, gTop, Z - gw, pz0), box(dx0, dx1, sill, gTop, pz1, Z), box(dx0, dx1, py1, gTop, pz0, pz1));
      gates.push(box(-SPAN.gateX, -SPAN.gateX + 6, Y - 0.5, sill, Z - gw, Z + gw)); // the sill
    } else doors.push(box(dx0, dx1, sill, gTop, Z - gw, Z));
    doors.push(box(dx0, dx1, sill, gTop, Z, Z + gw));
    // bronze binding, gone to verdigris: bands across both leaves and down their outer edges
    const [bx0, bx1] = X(SPAN.gateX - 0.18, SPAN.gateX);
    for (const yb of [Y + 3.5, Y + 12, Y + 20.5, Y + 29, Y + 34.5]) metals.push(paint(box(bx0, bx1, yb, yb + 0.8, Z - gw + 0.3, Z + gw - 0.3), '#3a4a3c'));
    for (const zb of [Z - gw + 0.3, Z + gw - 1.1]) metals.push(paint(box(bx0, bx1, sill, gTop, zb, zb + 0.8), '#344236'));
    // colliders: the doors at deck level (stop 0.6 m short of them), and the wall's foot below the deck
    for (let z = Z - SPAN.inner; z <= Z + SPAN.inner + 0.01; z += 1.2) addCol({ x: s * (SPAN.gateX - 0.6 + 1.45), z, r: 1.0, y: Y - 0.5, h: 40 });
    for (let z = F.z0; z <= F.z1; z += 3) addCol({ x: s * (SPAN.gateX + 1.45), z, r: 1.5, y: BOT - 20, h: Y - 1 - (BOT - 20), stand: false });
  }

  // the rockfall heaped against the east gate: boulders the size of the keep's towers, a few out across the
  // deck to x 235 (clear of the stair's arrival at x 236-250 on the north side)
  const boulders = [];
  const gx = SPAN.gateX;
  // the heap: the largest at the foot, filling the portal from jamb to jamb and over the lintel's foot
  for (let k = 0; k < 5; k++) boulders.push({ x: gx - 4 - rng() * 3, z: Z - 10 + k * 5 + jit(1), y: Y + 5 + rng() * 3, r: 8 + rng() * 3.5 });
  for (let k = 0; k < 5; k++) boulders.push({ x: gx - 3 - rng() * 3, z: Z - 10 + k * 5 + jit(1.5), y: Y + 17 + rng() * 5, r: 6.5 + rng() * 3 });
  for (let k = 0; k < 4; k++) boulders.push({ x: gx - 2 - rng() * 3, z: Z - 8 + k * 5.3 + jit(1.5), y: Y + 28 + rng() * 5, r: 5 + rng() * 2.5 });
  for (let k = 0; k < 4; k++) boulders.push({ x: gx - 1, z: Z - 9 + k * 6 + jit(1), y: Y + 38 + rng() * 6, r: 4 + rng() * 2 });
  // scree spilled down the heap's face
  for (let k = 0; k < (hi ? 10 : 5); k++) { const r = 0.8 + rng() * 1.6; boulders.push({ x: gx - 11 - rng() * 5, z: Z + 1 + rng() * 5, y: Y + r * 0.5, r }); }
  // out across the deck, the south half
  for (const [x, z, r] of [[236, 217.5, 1.9], [239.5, 219.5, 2.6], [241, 214.5, 1.6], [244, 219, 3.3], [246.5, 213.5, 2.4]]) boulders.push({ x, z, y: Y + r * 0.55, r });
  // two that went over the parapet to the ground
  for (const [x, z, r] of [[238, 231, 3.2], [231, 229, 2.4]]) boulders.push({ x, z, y: H(x, z) + r * 0.4, r });
  for (const b of boulders) {
    b.sx = b.r * (0.85 + rng() * 0.3); b.sy = b.r * (0.65 + rng() * 0.3); b.sz = b.r * (0.85 + rng() * 0.3); b.rx = rng() * 6.28; b.ry = rng() * 6.28;
    if (b.y > Y - 1 && b.y < Y + 12) addCol({ x: b.x, z: b.z, r: Math.min(b.sx, b.sz) * 0.8, y: Y - 0.5, h: b.y + b.sy - Y + 0.5 });
    else if (b.y < Y - 1) addCol({ x: b.x, z: b.z, r: Math.min(b.sx, b.sz) * 0.8, y: b.y - b.sy, h: b.sy * 2 });
  }
  // and the heap itself stops you short of the doors, whatever gaps the boulders leave
  for (let z = Z - SPAN.inner; z <= Z + SPAN.inner + 0.01; z += 1.2) addCol({ x: gx - 8.5, z, r: 1.0, y: Y - 0.5, h: 40 });
  K.boulders = boulders;
}

// a boulder: a craggy icosahedron, one shape turned and stretched for every boulder
export function boulderGeometry(ctx, hi) {
  // a boulder: a craggy icosahedron, one shape turned and stretched
  const bg = new THREE.IcosahedronGeometry(1, hi ? 2 : 1);
  { const p = bg.attributes.position, rr = ctx.makeRng(9501), v = new THREE.Vector3();
    const seen = new Map();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
      if (!seen.has(key)) seen.set(key, 0.7 + rr() * 0.45 - Math.max(0, v.y) * 0.12 + (Math.abs(v.x) > 0.7 ? -0.14 : 0));
      v.multiplyScalar(seen.get(key)); p.setXYZ(i, v.x, v.y, v.z);
    }
    bg.computeVertexNormals(); }
  return bg;
}
