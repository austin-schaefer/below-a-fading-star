// The strata module (v8-03; ?strata=0 leaves it out, and the structures keep their v7 dress): the sign and the spolia
// placed across the map, wherever a placement is not part of a structures site (those add theirs into their own
// mesh: the Pomegranate House, the byre, the shrine, the Leaning Yard). Two draw calls: the Elder blocks in the kit's
// etched cyclopean stone, everything Heliarch and Late in the structures' stone shader.
//
// Signs: the Elder notch over the Great Span's two gates and at the Plinth Road's crown, where its paving runs in
// under the wall; the Heliarch roundel on the keep's gate lintel, over the Armiger's Tower's door, on the Hypogeum's
// cornice and on the Sunken Court's two stair newels; the Late sign on the Lynchets' new gate and on a wicket in
// Medlar Close's old circuit.
// Spolia: an etched Elder block for the Pomegranate House's corner and another for the byre's threshold; Heliarch
// drums and capitals for the Lynchets' gateposts and an Elder block left in its wall; a bronze-bound Heliarch door
// laid as a footbridge where the Outwash trod crosses the meltwater; an Elder die half quarried away by the Late folk,
// their wedges still in the split; Heliarch ashlar raised straight on an Elder footing by the Sunken Court.
import * as THREE from 'three';
import { mat, makeGround } from '../../structures/geo.js';
import { SPAN } from '../../v4/span/plan.js';
import { PLINTHS } from '../../v5/plinths.js';
import { SITES } from '../../world.js';
import { TAVERNA } from '../../structures/taverna.js';
import { leads } from '../../v4/paths/routes.js';

export async function build(ctx) {
  const S = ctx.strata;
  if (!S || !S.on) return;
  const t0 = performance.now();
  const P = S.parts, C = S.colors;
  const ground = makeGround(ctx);
  const rng = ctx.makeRng(8031);
  const E = S.builder(), H = S.builder(); // Elder, and Heliarch with Late (one shader)
  const F = (x, y, z, yaw = 0, rx = 0, rz = 0) => mat(x, y, z, rx, yaw, rz);
  const yawTo = (fx, fz) => Math.atan2(fx, fz); // the yaw that turns local +z to face (fx, fz)
  const wallYaw = (dx, dz) => Math.atan2(-dz, dx); // the yaw that runs local +x along (dx, dz)
  const sign = (hand, name, x, y, z, face, mount, extra = {}) => S.place({ hand, kind: 'sign', name, x, y, z, face, mount, ...extra });
  const spolia = (hand, from, name, x, y, z, extra = {}) => S.place({ hand, from, kind: 'spolia', name, x, y, z, mount: 'ground', ...extra });

  // ---------------------------------------------------------------- the Elder notch
  {
    // the Great Span's gates. West: a crest on the façade's top (116 m) with the notch cut in it, black against the
    // sunset from the deck. East (broken where the rock came down): the notch carved in relief on the lintel's face
    const Y = SPAN.deckY, gTop = Y + SPAN.gateH, F8 = SPAN.facade.depth;
    {
      const x = -(SPAN.gateX + F8 / 2), foot = SPAN.facade.top;
      const r = P.elder.notch(E, F(x, foot, SPAN.z, yawTo(1, 0)), { w: 26, h: 12, d: F8, S: 8 });
      sign('elder', 'the Great Span, west gate', x, foot + r.apex, SPAN.z, [1, 0], 'top', { foot, size: 26 });
    }
    {
      const xf = SPAN.gateX - 7, foot = gTop + 0.8, d = 1.0;
      const r = P.elder.notch(E, F(xf - d / 2 + 0.05, foot, SPAN.z, yawTo(-1, 0)), { w: 15, h: 10, d, S: 6 });
      sign('elder', 'the Great Span, east gate', xf - d / 2 + 0.05, foot + r.apex * 0.5, SPAN.z, [-1, 0], 'wall', { size: 15 });
    }
    // the Plinth Road's crown: where the paving runs in under the wall's foot, a slab across the road's whole width
    // with the notch in its head, as if the road went on through it
    const [AX, AZ] = SITES.plinths.from, [BX, BZ] = SITES.plinths.to, L = Math.hypot(BX - AX, BZ - AZ), ux = (BX - AX) / L, uz = (BZ - AZ) / L;
    // (at 151.5 m, the last level ground before the talus climbs 13 m in six: it stands against the rise)
    const s0 = PLINTHS.paveEnd - 6.5, x = AX + ux * s0, z = AZ + uz * s0;
    let lo = Infinity, hi = -Infinity;
    for (let a = -7; a <= 7; a += 1) for (const b of [-1.6, 0, 1.6]) { const h = ground.groundAt(x - uz * a + ux * b, z + ux * a + uz * b); lo = Math.min(lo, h); hi = Math.max(hi, h); }
    lo -= 0.6;
    const r = P.elder.notch(E, F(x, lo, z, yawTo(-ux, -uz)), { w: 14, h: hi - lo + 10, d: 3.2, S: 5.5 });
    sign('elder', 'the Plinth Road, its crown', x, lo + r.apex, z, [-ux, -uz], 'ground', { foot: lo, r: 1.6, size: 14 });
    ctx.addCollider({ x, z, r: 2.2 });
    for (const k of [-1, 1]) for (let d = 2.5; d <= 6.5; d += 2) ctx.addCollider({ x: x - uz * k * d, z: z + ux * k * d, r: 1.8 });
  }

  // ---------------------------------------------------------------- the Heliarch roundel
  {
    // the keep's gate lintel, its west face, on the uncracked south half: the keep is giant, so is its roundel
    const ks = 3.4, kd = ks * 0.22; // v8-09: 3.0 read as a dot from the causeway
    P.heliarch.roundel(H, F(6.8 - kd / 2 + 0.01, 42.7, 31.2, yawTo(-1, 0)), { size: ks, disc: 'ember' });
    sign('heliarch', "Carcanet Keep's gate", 6.8 - kd / 2, 42.7 + ks * 0.5, 31.2, [-1, 0], 'wall', { size: ks });
    // over the Armiger's Tower's door (the south fin's end face at z -120; its sill at 34.1, the door 5.8 m)
    const ty = ground.groundAt(-250, -120) + 5.8 + 0.45;
    P.heliarch.roundel(H, F(-250, ty, -120 + 0.11, 0), { size: 1.35, disc: 'ember' });
    sign('heliarch', "the Armiger's Tower's door", -250, ty + 0.65, -120 + 0.11, [0, 1], 'wall', { size: 1.35 });
    // the Hypogeum's cornice, against the cut's east wall above the lintel, facing down the stair
    const hx = 230.27, hy = 4.505, hz = -112; // the door's face at x 230.69, the cornice's top 4.5 (the floor + 3.31)
    P.heliarch.roundel(H, F(hx, hy, hz, yawTo(-1, 0)), { size: 1.15, disc: 'bronze' });
    sign('heliarch', "the Hypogeum's lintel", hx, hy + 0.4, hz, [-1, 0], 'top', { foot: hy, size: 1.15 });
    // the Sunken Court's stair head: one on each newel, a pair, as the Heliarchy liked things
    for (const nx of [-45.6, -34.4]) {
      const ny = 0.673, nz = -176.8;
      P.heliarch.roundel(H, F(nx, ny, nz, yawTo(0, -1)), { size: 1.1, disc: 'ember' });
      sign('heliarch', `the Sunken Court's stair head (${nx < -40 ? 'west' : 'east'} newel)`, nx, ny + 0.38, nz, [0, -1], 'top', { foot: ny, size: 1.1 });
    }
  }

  // ---------------------------------------------------------------- the Lynchets' gate (Late, on Heliarch drums)
  {
    // where the causeway crosses the Lynchets' north-east wall: two posts of Heliarch column drums under capitals, a
    // painted beam across with the Late sign on it and a crescent at each end, wing walls of limewashed plaster out
    // to the drystone wall's ends, one leaf of a painted gate swung open, and an Elder block the wall was built round
    const cx = -193.0, cz = -80.3, ux = 0.6976, uz = 0.7164, nx = -uz, nz = ux, wx = -0.979, wz = -0.208;
    const posts = [];
    for (const k of [1, -1]) {
      const px = cx + nx * 4.1 * k, pz = cz + nz * 4.1 * k, g = ground.minGround(px, pz, 0.5) - 0.25;
      for (let i = 0; i < 3; i++) P.heliarch.drum(H, F(px, g + i * 0.84, pz, 0), { r: 0.5, h: 0.84, turn: i * 0.3 + rng() * 0.2 });
      P.heliarch.capital(H, F(px, g + 2.52, pz, 0), { r: 0.5 });
      posts.push({ x: px, z: pz, g, top: g + 3.14 });
      ctx.addCollider({ x: px, z: pz, r: 0.55 });
      spolia('late', 'heliarch', `the Lynchets' gatepost (${k > 0 ? 'north' : 'south'}): three Heliarch drums and a capital`, px, g, pz, { r: 0.45 });
    }
    const by = Math.max(posts[0].top, posts[1].top), yawB = wallYaw(nx, nz), L = C.late;
    H.add(H.box(9.0, 0.3, 0.3), F(cx, by + 0.15, cz, yawB), { color: L.paint[1], moss: 0, ground: by - 3 });
    for (let i = -3; i <= 3; i++) H.add(H.box(0.5, 0.1, 0.32), F(cx + nx * i * 1.2, by + 0.15, cz + nz * i * 1.2, yawB), { color: L.paint[0], moss: 0, ground: by - 3 });
    P.late.sign(H, F(cx, by + 0.3, cz, yawTo(ux, uz)), { w: 1.4, h: 1.2, rng });
    sign('late', "the Lynchets' gate", cx, by + 0.9, cz, [ux, uz], 'top', { foot: by + 0.3, size: 1.4 });
    for (const k of [-1, 1]) P.late.finial(H, F(cx + nx * 4.4 * k, by + 0.3, cz + nz * 4.4 * k, yawTo(ux, uz)), { h: 1.1, rng });
    // the wing walls, limewash, to the drystone wall's ends 10 m along it either side of the road
    posts.forEach((p, i) => {
      const k = i === 0 ? 1 : -1, ex = cx + wx * 10.2 * k, ez = cz + wz * 10.2 * k, dx = ex - p.x, dz = ez - p.z, len = Math.hypot(dx, dz);
      const mx = (p.x + ex) / 2, mz = (p.z + ez) / 2, g = ground.minGround(mx, mz, len / 2) - 0.3, hh = ground.maxGround(mx, mz, len / 2) - g + 1.25;
      P.late.wall(H, F(mx, g, mz, wallYaw(dx / len, dz / len)), { w: len - 0.7, h: hh, d: 0.45, color: i ? 1 : 2 });
      for (let s = 0.6; s < len - 0.4; s += 0.9) ctx.addCollider({ x: p.x + dx * s / len, z: p.z + dz * s / len, r: 0.4, y: g, h: hh });
      if (i === 0) {
        // a tiled niche in the north wing, and the gate's one leaf swung back against it
        const t = 0.35, qx = p.x + dx * t, qz = p.z + dz * t, fx = -dz / len, fz = dx / len, s2 = (fx * ux + fz * uz) > 0 ? 1 : -1;
        P.late.tiles(H, F(qx + fx * s2 * 0.24, g + hh - 0.95, qz + fz * s2 * 0.24, yawTo(fx * s2, fz * s2)), { n: 5, w: 0.18, h: 0.18, cols: [0, 3, 1, 3, 0], rng });
        P.late.tiles(H, F(qx + fx * s2 * 0.24, g + hh - 0.77, qz + fz * s2 * 0.24, yawTo(fx * s2, fz * s2)), { n: 5, w: 0.18, h: 0.18, cols: [3, 0, 4, 0, 3], rng });
        const lx = p.x + dx / len * 2.0 + fx * s2 * 0.45, lz = p.z + dz / len * 2.0 + fz * s2 * 0.45, lg = ground.groundAt(lx, lz);
        const ly = wallYaw(dx / len, dz / len);
        for (const y of [0.25, 0.75, 1.25]) H.add(H.box(3.4, 0.12, 0.06), F(lx, lg + y, lz, ly), { color: L.paint[0], moss: 0.05, ground: lg });
        for (const sx of [-1.6, 0, 1.6]) H.add(H.box(0.1, 1.3, 0.07), F(lx + dx / len * sx, lg + 0.7, lz + dz / len * sx, ly), { color: L.paint[1], moss: 0.05, ground: lg });
        H.add(H.box(3.6, 0.1, 0.07), F(lx, lg + 0.75, lz, ly, 0, 0.34), { color: L.paint[1], moss: 0.05, ground: lg });
      }
    });
    // the Elder block the drystone wall was built round, beyond the south wing's end
    const bx = cx - wx * 11.6, bz = cz - wz * 11.6, bg = ground.minGround(bx, bz, 1.2) - 0.35;
    P.elder.block(E, F(bx, bg, bz, wallYaw(wx, wz)), { w: 2.3, h: 1.7, d: 1.5, seed: 3 });
    ctx.addCollider({ x: bx, z: bz, r: 1.2 });
    spolia('late', 'elder', "an Elder block in the Lynchets' wall", bx, bg, bz, { r: 1.1 });
  }

  // ---------------------------------------------------------------- Medlar Close: a wicket in the old circuit
  {
    // where the orchard track (P8) crosses the close's old circuit: a gateway of limewash with an ogee opening, a
    // tiled sign over it and a finial on top; the wall it was a gate in is long gone either side
    const p8 = leads().list.find((l) => l.id === 'P8');
    let best = null;
    if (p8) for (const line of p8.lines) for (let i = 1; i < line.length - 1; i++) {
      const s = line[i], d = Math.abs(Math.hypot(s.x - 130, s.z + 90) - 54);
      if (!best || d < best.d) best = { d, s, a: line[i - 1], b: line[i + 1] };
    }
    if (best) {
      const { s, a, b } = best, tl = Math.hypot(b.x - a.x, b.z - a.z), tx = (b.x - a.x) / tl, tz = (b.z - a.z) / tl;
      const g = ground.minGround(s.x, s.z, 2.2) - 0.25, base = ground.maxGround(s.x, s.z, 2.2) - g, hh = base + 4.0;
      const yaw = yawTo(-tx, -tz); // facing back down the track, toward the close
      P.late.wall(H, F(s.x, g, s.z, yaw), { w: 4.0, h: hh, d: 0.55, open: 'ogee', ow: 1.5, sp: base + 1.9, color: 2, frame: C.late.paint[3] });
      const fy = g + base + 3.05;
      P.late.sign(H, F(s.x - tx * 0.29, fy, s.z - tz * 0.29, yaw), { w: 0.62, h: 0.62, rng });
      sign('late', "Medlar Close's wicket", s.x - tx * 0.3, fy + 0.3, s.z - tz * 0.3, [-tx, -tz], 'wall', { size: 0.62 });
      P.late.finial(H, F(s.x, g + hh, s.z, yaw), { h: 1.0, rng });
      for (const k of [-1, 1]) for (const d of [1.15, 1.75]) ctx.addCollider({ x: s.x + tz * k * d, z: s.z - tx * k * d, r: 0.4 });
    }
  }

  // ---------------------------------------------------------------- the Pomegranate House's corner, and the byre's sill
  {
    // the north-west turret stands on an Elder block, its etch showing under the plaster's hem
    const x = TAVERNA.x - TAVERNA.half, z = TAVERNA.z - TAVERNA.half, g = ground.minGround(x, z, 1.8) - 0.4;
    P.elder.block(E, F(x - 0.2, g, z - 0.2, 0.12), { w: 3.3, h: ground.groundAt(x, z) - g + 1.9, d: 3.3, seed: 7 });
    spolia('late', 'elder', "the Pomegranate House's corner: an Elder block under the north-west turret", x, g, z, { r: 1.6 });
    // the Oast Byre's threshold: a long Elder block laid as the step before the door (door at (-157.42, 58.35),
    // the wall's face toward the wood at (-0.769, 0.639))
    const fx = -0.769, fz = 0.639, dx = -157.42 + fx * 0.75, dz = 58.35 + fz * 0.75, dg = ground.minGround(dx, dz, 1.2) - 0.45;
    P.elder.block(E, F(dx, dg, dz, yawTo(fx, fz)), { w: 2.6, h: ground.groundAt(dx, dz) - dg + 0.22, d: 1.1, seed: 11 });
    spolia('late', 'elder', "the Oast Byre's threshold: an Elder block", dx, dg, dz, { r: 1.0 });
  }

  // ---------------------------------------------------------------- the door as a footbridge (P6 over R1)
  {
    const L6 = leads().list.find((l) => l.id === 'P6'), R1 = leads().list.find((l) => l.id === 'R1');
    let best = null;
    if (L6 && R1) for (const a of L6.lines[0]) for (const b of R1.lines[0]) { const d = Math.hypot(a.x - b.x, a.z - b.z); if (!best || d < best.d) best = { d, a, b }; }
    if (best && best.d < 6) {
      const line = L6.lines[0], i = Math.max(1, Math.min(line.length - 2, line.indexOf(best.a)));
      const tx = line[i + 1].x - line[i - 1].x, tz = line[i + 1].z - line[i - 1].z, tl = Math.hypot(tx, tz);
      const x = best.b.x, z = best.b.z, yaw = yawTo(tx / tl, tz / tl);
      const g0 = ground.groundAt(x - tx / tl * 1.2, z - tz / tl * 1.2), g1 = ground.groundAt(x + tx / tl * 1.2, z + tz / tl * 1.2);
      const y = Math.max(g0, g1, ground.groundAt(x, z)) + 0.1;
      // lying flat, its foot toward the trod's start: local y along the trod, its face up
      P.heliarch.slab(H, F(x - tx / tl * 1.25, y, z - tz / tl * 1.25, yaw, Math.PI / 2), { w: 1.15, h: 2.5, d: 0.14 });
      spolia('late', 'heliarch', 'a bronze-bound Heliarch door laid as a footbridge over the meltwater', x, y - 0.1, z, { r: 1.2, mount: 'span' });
    }
  }

  // ---------------------------------------------------------------- the quarried die, by the Plinth Road's foot
  {
    // a fallen Elder die, its far end quarried back in steps, a split opened along its top with the Late folk's wedges
    // still in it, and three squared blocks cut from it stacked ready for a cart that has not come
    const x = 114, z = -156, yaw = 0.5, g = ground.minGround(x, z, 3) - 0.4;
    const M = F(x, g, z, yaw), ca = Math.cos(yaw), sa = Math.sin(yaw);
    const at = (lx, lz) => [x + ca * lx + sa * lz, z - sa * lx + ca * lz];
    P.elder.block(E, M, { w: 3.6, h: 3.2, d: 3.4, seed: 21 });
    const [x2, z2] = at(3.0, 0), g2 = ground.minGround(x2, z2, 1.5) - 0.3;
    P.elder.block(E, F(x2, g2, z2, yaw), { w: 2.4, h: 2.0, d: 3.4, seed: 22 }); // the first step cut back
    const [x3, z3] = at(4.9, 0.3), g3 = ground.minGround(x3, z3, 1) - 0.3;
    P.elder.block(E, F(x3, g3, z3, yaw), { w: 1.4, h: 1.0, d: 2.6, seed: 23 }); // the second
    // the split along the top, and the wedges
    const wood = C.late.wood;
    for (let k = 0; k < 6; k++) {
      const [wx, wz] = at(-1.4 + k * 0.55, 0.15);
      H.add(H.box(0.12, 0.34, 0.2), F(wx, g + 3.2 + 0.05, wz, yaw, 0, (rng() - 0.5) * 0.1), { color: wood.clone().multiplyScalar(0.8 + rng() * 0.4), moss: 0.1, ground: g });
    }
    H.add(H.box(3.3, 0.04, 0.05), F(x, g + 3.21, z + 0.0, yaw), { color: new THREE.Color('#0c0a08'), moss: 0, ground: g });
    // a maul left against it
    const [mx, mz] = at(-2.1, 1.4), mg = ground.groundAt(mx, mz);
    H.add(H.cyl(0.03, 0.03, 0.9, 5, 1), F(mx, mg + 0.45, mz, yaw, 0, 0.4), { color: C.late.paint[2], moss: 0, ground: mg });
    H.add(H.box(0.3, 0.16, 0.16), F(mx + 0.18, mg + 0.85, mz, yaw, 0, 0.4), { color: C.late.iron, iron: 0.8, moss: 0, ground: mg });
    for (let k = 0; k < 3; k++) {
      const [sx, sz] = at(1.2 + k * 0.1, 3.0 + (k === 2 ? 0 : 0)), sg = ground.groundAt(sx, sz) - 0.05;
      P.elder.block(E, F(sx + (k === 2 ? 0.3 : (k ? 0.9 : -0.4)) * ca, sg + (k === 2 ? 0.75 : 0), sz, yaw + (rng() - 0.5) * 0.2), { w: 1.1, h: 0.75, d: 0.8, seed: 30 + k, chip: 0.04 });
    }
    ctx.addCollider({ x, z, r: 2.2 }); ctx.addCollider({ x: x2, z: z2, r: 1.6 }); ctx.addCollider({ x: x3, z: z3, r: 1.0 });
    const [qx, qz] = at(1.4, 3.0); ctx.addCollider({ x: qx, z: qz, r: 1.0 });
    spolia('late', 'elder', 'a fallen Elder die, half quarried away, the Late wedges in its split', x, g, z, { r: 2.5 });
  }

  // ---------------------------------------------------------------- Heliarch ashlar on an Elder footing, by the court
  {
    // west of the Sunken Court where P5 ends: two Elder blocks, and on them three courses of the Heliarchy's ashlar,
    // a cornice and a stub of hexagonal column: a building of theirs, gone but for the corner it began on
    const x = -76, z = -140, yaw = 0.35, ca = Math.cos(yaw), sa = Math.sin(yaw), g = ground.minGround(x, z, 3.2) - 0.5;
    const top = ground.maxGround(x, z, 3.2) + 1.8;
    for (const k of [-1, 1]) P.elder.block(E, F(x + ca * k * 1.4, g, z - sa * k * 1.4, yaw), { w: 2.75, h: top - g, d: 2.4, seed: 40 + k });
    const Hc = C.heliarch;
    H.add(H.box(5.2, 2.1, 1.6, { chip: 0.05 }), F(x, top + 1.05, z, yaw), { color: Hc.stone, course: 0.42, moss: 0.45, ground: top - 0.2 });
    H.add(H.box(5.5, 0.22, 1.85, { chip: 0.03 }), F(x, top + 2.21, z, yaw), { color: Hc.dark, moss: 0.5, ground: top });
    P.heliarch.drum(H, F(x + ca * 1.8, top + 2.32, z - sa * 1.8, 0), { r: 0.45, h: 0.8 });
    P.heliarch.drum(H, F(x - ca * 2.6 + sa * 1.8, ground.groundAt(x - ca * 2.6 + sa * 1.8, z + sa * 2.6 + ca * 1.8) - 0.2, z + sa * 2.6 + ca * 1.8, 0, Math.PI / 2 - 0.1), { r: 0.45, h: 0.8 }); // one fallen
    for (const k of [-2, -0.7, 0.7, 2]) ctx.addCollider({ x: x + ca * k, z: z - sa * k, r: 1.3 });
    spolia('heliarch', 'elder', 'Heliarch ashlar raised on an Elder footing', x, g, z, { r: 2.6 });
  }

  // ---------------------------------------------------------------- meshes
  const meshes = [];
  if (E.count) meshes.push(S.mesh(E, 'elder', 'strata-elder'));
  if (H.count) meshes.push(S.mesh(H, 'stone', 'strata-heliarch-late'));
  for (const m of meshes) ctx.scene.add(m);
  const flick = ctx.sky?.flicker || { value: 1 };
  ctx.registerUpdate((dt, t) => S.tick(t, flick.value));
  const tris = meshes.reduce((a, m) => a + m.geometry.index.count / 3, 0);
  S.stats = () => ({ calls: meshes.length, tris, placements: S.placements.length });
  ctx.log(`strata: ${S.placements.length} placements so far, ${meshes.length} draw calls, ${(tris / 1000).toFixed(1)}k tris, ${(performance.now() - t0).toFixed(0)} ms`);
}
