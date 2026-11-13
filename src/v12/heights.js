// The heights' footing (v12 H0): the register of ascents that tools/heights-test.mjs walks, and, behind ?heights=test,
// test floors that exercise stacked floors, held edges, the edge-guard and a corridor through the walk limit.
//
// ctx.ascents.add({ id, path, offs, test }): an ascent registers itself from its module's build. `path` is the way up
// as points to walk through on the keys, in order: [x, z] (on whatever floor holds the feet there) or [x, z, y] (the
// feet's height there; the first point's y places the walker, the last is the top). `offs`: where to step off, as
// fractions of the path's length (default [0.3, 0.6, 0.95]); `test`: built only for ?heights=test. heights-test walks
// every ascent, steps off at each `off` and checks the landing, and compares the frame time at the top with the floor's.
//
// ?heights=test builds, east of the Moot (about (150, -40); the site is found at build, flat and clear of colliders):
//   a bridge (a stacked floor with held edges) that leaves the ground, rises 6 m and comes back down to it;
//   a deck 3 m up reached by a ramp, and over it a beam 0.9 m wide at 7 m (a floor over a floor, the edge-guard's
//   narrow walkway), reached by a second ramp from the deck; a perch 18 m up at the beam's far end (for the fall);
//   a step 1 m up (hops off it); a cut 3 m under the ground with held sides, entered and left by ramps (a walkway under higher ground);
//   and a corridor through the walk limit on bearing 140, 3 m either side of its line, carrying a walkway 8 m wide
//   (so the corridor, not the walkway's edge, is what stops a walker stepping sideways past r 348).
import * as THREE from 'three';

export function installHeights(ctx, url) {
  const list = [];
  ctx.ascents = {
    list,
    add(def) { if (!def || !def.id || !Array.isArray(def.path) || def.path.length < 2) { console.warn('[fp] ascent needs an id and a path'); return null; } list.push(def); return def; },
  };
  if (url.searchParams.get('heights') !== 'test') return;
  // on the first frame, after every module has registered its colliders (the site is chosen clear of them)
  let built = false;
  ctx.registerUpdate(() => { if (!built) { built = true; buildTest(ctx); } });
}

function buildTest(ctx) {
  const T = ctx.terrain, H = (x, z) => T.heightAt(x, z);
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6d6458'), roughness: 0.95 });
  const group = new THREE.Group(); group.name = 'heights-test';
  ctx.scene.add(group);
  // a slab from (x0, z0) to (x1, z1) (axis-aligned), its top y0 at the x0/z0 end and y1 at the other, along `ax`
  const slabs = [];
  function slab(x0, x1, z0, z1, ax, y0, y1, thick = 0.4) {
    const g = new THREE.BoxGeometry(1, 1, 1);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const fx = pos.getX(i) + 0.5, fy = pos.getY(i) + 0.5, fz = pos.getZ(i) + 0.5;
      const f = ax === 'x' ? fx : fz, top = y0 + (y1 - y0) * f;
      pos.setXYZ(i, x0 + (x1 - x0) * fx, top - thick * (1 - fy), z0 + (z1 - z0) * fz);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
    group.add(m); slabs.push(m);
  }
  // a stacked floor from a list of axis-aligned pieces: { x0, x1, z0, z1, ax, y0, y1 }
  const floor = (pieces) => (x, z) => {
    for (const p of pieces) {
      if (x < p.x0 || x > p.x1 || z < p.z0 || z > p.z1) continue;
      const f = p.ax === 'x' ? (x - p.x0) / (p.x1 - p.x0) : (z - p.z0) / (p.z1 - p.z0);
      return p.y0 + (p.y1 - p.y0) * f;
    }
    return null;
  };
  const draw = (pieces, thick) => { for (const p of pieces) slab(p.x0, p.x1, p.z0, p.z1, p.ax, p.y0, p.y1, thick); };

  // the site: the clearest flat 70 x 40 m near (150, -40)
  const S = findSite(ctx, 150, -40);
  const sx = S.x, sz = S.z, g0 = H(sx, sz);
  const site = ctx.heightsTest = { x: sx, z: sz, y: g0 };

  // 1. the bridge: along +x at z sz - 14, 2 m wide, up 6 m over 12, level 12, down 12; the ends on the ground
  {
    const z0 = sz - 15, z1 = sz - 13, xa = sx - 30, ga = H(xa, sz - 14), gb = H(xa + 36, sz - 14), top = Math.max(ga, gb) + 6;
    const P = [
      { x0: xa, x1: xa + 12, z0, z1, ax: 'x', y0: ga, y1: top },
      { x0: xa + 12, x1: xa + 24, z0, z1, ax: 'x', y0: top, y1: top },
      { x0: xa + 24, x1: xa + 36, z0, z1, ax: 'x', y0: top, y1: gb },
    ];
    ctx.addWalkable(floor(P), { stack: true, keep: true, name: 'test-bridge' });
    draw(P, 0.5);
    site.bridge = { x0: xa, x1: xa + 36, z: sz - 14, top };
    ctx.ascents.add({ id: 'test-bridge', test: true, path: [[xa - 3, sz - 14], [xa + 6, sz - 14], [xa + 18, sz - 14, top], [xa + 33, sz - 14], [xa + 39, sz - 14]], offs: [0.45, 0.55], held: true });
  }
  // 2. the deck (3 m up, 10 x 10) and its ramp from the ground; the beam (7 m, 0.9 m wide) over it and its ramp; the
  // perch at 18 m off the beam's far end
  {
    const dx0 = sx - 5, dx1 = sx + 5, dz0 = sz - 5, dz1 = sz + 5, dy = g0 + 3;
    const rampA = { x0: dx0 - 12, x1: dx0, z0: sz + 1, z1: sz + 3, ax: 'x', y0: H(dx0 - 12, sz + 2), y1: dy };
    const deck = { x0: dx0, x1: dx1, z0: dz0, z1: dz1, ax: 'x', y0: dy, y1: dy };
    const by = g0 + 7;
    // ramp B: off the deck's north edge at its east end, up toward -z to the beam's level 12 m out
    const rampB = { x0: dx1 - 2, x1: dx1, z0: dz0 - 12, z1: dz0, ax: 'z', y0: by, y1: dy };
    const beam = { x0: dx1 - 30, x1: dx1, z0: dz0 - 12.45, z1: dz0 - 11.55, ax: 'x', y0: by, y1: by };
    // the beam: 0.9 m wide west from the ramp's head along z dz0 - 12, and from its middle south over the deck
    const beam2 = { x0: sx - 0.45, x1: sx + 0.45, z0: dz0 - 11.55, z1: dz1 + 8, ax: 'z', y0: by, y1: by };
    const A = [rampA, deck], B = [rampB, beam, beam2];
    ctx.addWalkable(floor(A), { stack: true, name: 'test-deck' });
    ctx.addWalkable(floor(B), { stack: true, name: 'test-beam' });
    draw(A, 0.5); draw(B, 0.35);
    const perch = { x0: sx - 2, x1: sx + 2, z0: dz1 + 8, z1: dz1 + 12, ax: 'x', y0: g0 + 18, y1: g0 + 18 };
    ctx.addWalkable(floor([perch]), { stack: true, name: 'test-perch' });
    draw([perch], 0.5);
    site.deck = { x0: dx0, x1: dx1, z0: dz0, z1: dz1, y: dy };
    site.beam = { x: sx, z0: dz0 - 11.55, z1: dz1 + 8, y: by, w: 0.9 };
    site.perch = { x: sx, z: dz1 + 10, y: g0 + 18 };
    ctx.ascents.add({ id: 'test-beam', test: true, path: [[dx0 - 15, sz + 2], [dx0 - 4, sz + 2], [dx1 - 1, sz + 2, dy], [dx1 - 1, dz0 - 1, dy], [dx1 - 1, dz0 - 11.5], [dx1 - 1, dz0 - 12, by], [sx, dz0 - 12, by], [sx, sz, by], [sx, dz1 + 6, by]], offs: [0.6, 0.8, 0.97] });
  }
  // 2b. a step: a 6 x 6 m block 1 m up, south-west of the deck (a hop off it, steered or not, must go as it always did)
  {
    const x0 = sx - 22, z0 = sz - 3, y = H(x0 + 3, z0 + 3) + 1;
    const P = [{ x0, x1: x0 + 6, z0, z1: z0 + 6, ax: 'x', y0: y, y1: y }];
    ctx.addWalkable(floor(P), { stack: true, name: 'test-step' });
    draw(P, 1.4);
    site.step = { x0, x1: x0 + 6, z0, z1: z0 + 6, y };
  }
  // 3. the cut: along +x at z sz + 16, 3 m under the ground, ramps down and up, its sides held
  {
    const xa = sx - 25, z0 = sz + 15, z1 = sz + 17, za = sz + 16, ga = H(xa, za), gb = H(xa + 40, za), lo = Math.min(ga, gb, H(xa + 20, za)) - 3;
    const P = [
      { x0: xa, x1: xa + 10, z0, z1, ax: 'x', y0: ga, y1: lo },
      { x0: xa + 10, x1: xa + 30, z0, z1, ax: 'x', y0: lo, y1: lo },
      { x0: xa + 30, x1: xa + 40, z0, z1, ax: 'x', y0: lo, y1: gb },
    ];
    // the ramps start at the ground's height: the walker steps onto them where they are level with it, and they hold
    ctx.addWalkable(floor(P), { stack: true, keep: true, name: 'test-cut' });
    draw(P, 0.3);
    site.cut = { x0: xa, x1: xa + 40, z: za, lo };
    ctx.ascents.add({ id: 'test-cut', test: true, path: [[xa - 3, za], [xa + 1, za], [xa + 20, za, lo], [xa + 39, za], [xa + 43, za]], offs: [0.5], held: true });
  }
  // 4. the corridor: bearing 140, from r 330 to r 372, half 3; a walkway 8 m wide in it from the ground at r 330
  {
    const b = 140 * Math.PI / 180, ux = Math.sin(b), uz = -Math.cos(b), vx = -uz, vz = ux;
    const at = (r, s = 0) => [ux * r + vx * s, uz * r + vz * s];
    const [ax, az] = at(326), [bx, bz] = at(372);
    const remove = ctx.mountains.addCorridor({ name: 'test', pts: [[ax, az], [bx, bz]], half: 3 });
    const y0 = H(ax, az);
    // the walkway: a stacked floor, level at the ground's height at r 326, 8 m wide, r 326..376 (into the wall's foot)
    const walk = (x, z) => { const r = x * ux + z * uz, s = x * vx + z * vz; return r >= 326 && r <= 376 && Math.abs(s) <= 4 ? y0 : null; };
    ctx.addWalkable(walk, { stack: true, name: 'test-corridor' });
    const g = new THREE.BoxGeometry(8, 0.4, 50); g.translate(0, -0.2, 0);
    const m = new THREE.Mesh(g, mat); m.position.set(ux * 351, y0, uz * 351); m.rotation.y = Math.atan2(ux, uz); m.receiveShadow = true;
    group.add(m);
    site.corridor = { b: 140, ux, uz, vx, vz, y: y0, r0: 326, r1: 372, half: 3, remove };
    ctx.ascents.add({ id: 'test-corridor', test: true, path: [at(320), at(330), [...at(360), y0], at(370)], offs: [0.85] });
  }
  ctx.log(`heights test floors at (${sx.toFixed(0)}, ${sz.toFixed(0)}), ground ${g0.toFixed(1)}`);
}

// the clearest, flattest 70 x 44 m box near (x, z): fewest colliders, least relief, no water
function findSite(ctx, x, z) {
  const T = ctx.terrain, cols = ctx.controls.state.colliders;
  let best = null;
  for (let dx = -60; dx <= 60; dx += 20) for (let dz = -60; dz <= 60; dz += 20) {
    const cx = x + dx, cz = z + dz;
    let lo = Infinity, hi = -Infinity, wet = false;
    for (let i = -35; i <= 35; i += 7) for (let j = -22; j <= 22; j += 5.5) {
      const h = T.heightAt(cx + i, cz + j); lo = Math.min(lo, h); hi = Math.max(hi, h);
      if (T.waterLevelAt(cx + i, cz + j) !== null) wet = true;
    }
    let n = 0;
    for (const c of cols) if (Math.abs(c.x - cx) < 40 && Math.abs(c.z - cz) < 26) n++;
    const score = n * 4 + (hi - lo) + (wet ? 100 : 0) + Math.hypot(dx, dz) * 0.02;
    if (!best || score < best.score) best = { x: cx, z: cz, score, n, relief: hi - lo };
  }
  return best;
}
