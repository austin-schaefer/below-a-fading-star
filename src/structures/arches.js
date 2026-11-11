// The Arcature [Proposed] (v5 recast, the awe audit; site in plans/wilderness-v4-placement.md section 5). The age of the
// reckoning engines: a stone armillary. Fourteen parabolic arches nested one inside the next, each spanning the
// whole nest from a pair of bronze trunnions, each turned 25.7 degrees from the one outside it and tilted on its
// trunnions the other way, as though the nest were set to some reckoning; their feet wind inward in two spirals.
// The outermost whole arch faces the causeway and stands 40 m (ARCATURE_TOP); the innermost, 7.6 m from the
// centre, about 24 m. Outside them all one more arch was begun and never closed: its two halves stand as horns,
// and a length of its crown lies in the grass where it was set down.
// Every arch's intrados carries a vein of black glass, ruled like a gauge, in which a dim cold pulse travels,
// slowly, foot to foot; it brightens when the sun gutters. Bronze trunnions on stone cradles, bronze bands; the
// outer four arches and the horns carry bronze graduations off their backs, so against the sky they read as the
// ruled limbs of an instrument.
// The floor inside r 6 is bare turf and dark: the embers light (SITES.lightEmbers) is a later agent's.
// ARCATURE_TOP is the top's height above the ground at the centre; ?arcature=h<m> sets it (e.g. ?arcature=h62)
// so a taller nest can be compared in the page. ?arcature=v2 builds the earlier arch-nest (arches/v2.js) instead.
// Draws: the stone (kit masonry, black glass set in some blocks), the glass veins, the bronze.
import * as THREE from 'three';
import { mergeGeometries } from '../v4/kit/merge.js';
import { LANDMARKS, SITES } from '../world.js';
import { ARCHES_V2, buildArchesV2 } from './arches/v2.js';

const FLAG = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('arcature') : null;
const V2 = FLAG === 'v2';
// metres above the ground at the centre to the highest point of the highest arch
export const ARCATURE_TOP = /^h\d+(\.\d+)?$/.test(FLAG || '') ? Math.min(150, Math.max(15, +FLAG.slice(1))) : 40;

const L = LANDMARKS.arcature;
export const ARCHES = V2 ? ARCHES_V2 : { x: L.x, z: L.z, r: L.r };

export function buildArches(ctx, B, env) {
  return V2 ? buildArchesV2(ctx, B, env) : buildArcature(ctx, env);
}

// the nest, outermost arch first: feet radius, height (fraction of the top), tilt on the trunnions (radians), the
// section's half-depth and half-thickness at the foot and the crown (outermost, innermost); then the unclosed arch
const NEST = {
  n: 14, r: [19, 7.6], h: [1.0, 0.6], turn: Math.PI / 7, lean: [0.26, 0.08],
  d: [1.9, 1.0], dc: [1.1, 0.62], w: [0.8, 0.55], wc: [0.56, 0.42],
  horn: { r: 20.2, h: 1.06, lean: 0.16, cut: [0.3, 0.7] },
};

function buildArcature(ctx, env) {
  const { ground } = env;
  const rng = ctx.makeRng(2011);
  const low = ctx.quality === 'low';
  const cx = L.x, cz = L.z, g0 = ground.groundAt(cx, cz);
  const TOP = ARCATURE_TOP;
  const sc = Math.sqrt(TOP / 40); // the sections thicken a little with a taller nest
  const ds = low ? 1.4 : 0.7; // sample spacing along a rib (m)
  const stone = acc(false), glass = acc(true), bronze = acc(false);
  const extraStone = [], extraBronze = [];
  const col = (x, z, r, y, h) => ctx.addCollider(h === undefined ? { x, z, r } : { x, z, r, y, h });
  // the bearing from the centre toward the causeway at (-40, 22): the tallest arch faces it
  const thW = Math.atan2(22 - cz, -40 - cx);
  const crowns = [], allFeet = [];
  let ribs = 0, horns = 0;

  // the nest, raised once the helpers below exist
  function raiseNest() {
    const phi0 = thW + Math.PI / 2; // the outermost arch's chord runs across the line to the causeway, so it faces it
    const lerp = (a, b, q) => a + (b - a) * q;
    const arches = [];
    for (let k = 0; k < NEST.n; k++) {
      const q = k / (NEST.n - 1);
      arches.push({ k, q, r: lerp(NEST.r[0], NEST.r[1], q) + (k ? (rng() - 0.5) * 0.5 : 0), h: lerp(NEST.h[0], NEST.h[1], Math.pow(q, 0.9)), phi: phi0 + k * NEST.turn,
        lean: (k % 2 ? -1 : 1) * lerp(NEST.lean[0], NEST.lean[1], q) * (k ? 0.85 + 0.3 * rng() : 1),
        sec: { d0: lerp(NEST.d[0], NEST.d[1], q) * sc, d1: lerp(NEST.dc[0], NEST.dc[1], q) * sc, w0: lerp(NEST.w[0], NEST.w[1], q) * sc, w1: lerp(NEST.wc[0], NEST.wc[1], q) * sc } });
    }
    const Hn = NEST.horn;
    arches.push({ k: -1, q: 0, r: Hn.r, h: Hn.h, phi: phi0 - NEST.turn, lean: Hn.lean, open: true, sec: { ...arches[0].sec } });
    for (const A of arches) {
      // the lean tilts the crown toward the causeway for the outermost, alternately either side for the rest
      const ux = Math.cos(A.phi), uz = Math.sin(A.phi);
      const tilt = A.k === 0 ? { x: Math.cos(thW), z: Math.sin(thW) } : { x: -uz, z: ux };
      const rt = A.sec.d0 * 1.05; // the trunnions' radius
      const feet = [1, -1].map((sg) => {
        const x = cx + ux * A.r * sg, z = cz + uz * A.r * sg;
        return { x, z, y: ground.groundAt(x, z) + rt * 0.35 };
      });
      const P = ribPath(feet[0], feet[1], A.lean, tilt, g0 + TOP * A.h, A.sec);
      const phase = rng();
      const runs = A.open ? [[0, P.at(Hn.cut[0] + rng() * 0.03)], [P.at(Hn.cut[1] - rng() * 0.03), P.n - 1]] : [[0, P.n - 1]];
      for (const [i0, i1] of runs) { solidRib(P, i0, i1, A.open); vein(P, i0, i1, phase); }
      // bronze bands near the feet, and at the crown of the outer few
      for (const t of A.k >= 0 && A.k < 4 ? [0.14, 0.5, 0.86] : [0.14, 0.86]) {
        const i = P.at(t);
        if (runs.some(([a, b]) => i > a + 1 && i < b - 1)) collar(P, i);
      }
      if (A.open) { for (const [i0, i1] of runs) collar(P, i0 === 0 ? i1 - 1 : i0 + 1); horns++; }
      else ribs++;
      // the outer four, and the horns, carry the graduations
      if (A.k < 4) for (const [i0, i1] of runs) graduate(P, i0, i1);
      // the trunnions, lying along the arch's chord on their stone cradles
      const ex = feet[1].x - feet[0].x, ez = feet[1].z - feet[0].z, el = Math.hypot(ex, ez), yaw = Math.atan2(-ez / el, ex / el);
      const len = A.sec.w0 * 2 + 1.4;
      for (const f of feet) {
        const g = new THREE.CylinderGeometry(rt, rt, len, 16, 1);
        g.rotateZ(Math.PI / 2); g.rotateY(yaw); g.translate(f.x, f.y, f.z);
        extraBronze.push(g);
        const gy = ground.minGround(f.x, f.z, rt + 0.4) - 0.5, top = f.y - rt * 0.45;
        const c = new THREE.BoxGeometry(len - 0.5, top - gy, rt * 1.9);
        c.rotateY(yaw); c.translate(f.x, (gy + top) / 2, f.z);
        extraStone.push(c);
        col(f.x, f.z, rt + 0.3);
        allFeet.push({ x: f.x, z: f.z, r: rt + 0.3 });
      }
      // the highest point of each arch, and the horns' tips: the sightline probe reads these
      if (!A.open) crowns.push({ k: A.k, x: +P.top.x.toFixed(1), y: +P.top.y.toFixed(1), z: +P.top.z.toFixed(1) });
      else {
        for (const i of [runs[0][1], runs[1][0]]) crowns.push({ k: -1, horn: true, x: +P.p[i].x.toFixed(1), y: +P.ext(i).toFixed(1), z: +P.p[i].z.toFixed(1) });
        layDown(P, runs[0][1], runs[1][0]);
      }
    }
  }

  // ------------------------------------------------------------------ a rib's path
  // A parabola in a plane through the chord between two feet, the plane tilted about the chord by `lean` toward
  // `tilt` (a horizontal direction). Resampled by arc length: p (centreline), T (tangent), N (in-plane normal toward the intrados),
  // Bn (the plane's normal), s (arc length from the foot), t (parameter), d and w (the section's half-depth
  // and half-thickness).
  function ribPath(A, Bp, lean, tilt, topY, sec) {
    const c = new THREE.Vector3(Bp.x - A.x, Bp.y - A.y, Bp.z - A.z);
    const my = (A.y + Bp.y) / 2;
    // the plane tilts about the chord toward `tilt` (horizontal) by `lean`
    const e = new THREE.Vector3(c.x, 0, c.z).normalize();
    const nOut = new THREE.Vector3(-e.z, 0, e.x);
    if (nOut.x * tilt.x + nOut.z * tilt.z < 0) nOut.negate();
    const u = new THREE.Vector3(0, Math.cos(lean), 0).addScaledVector(nOut, Math.sin(lean));
    const H = (topY - my) / Math.cos(lean) - sec.d1; // the extrados's crown at topY
    const Bn = new THREE.Vector3().crossVectors(c, u).normalize();
    const at = (t, out) => out.set(A.x + c.x * t + u.x * H * 4 * t * (1 - t), A.y + c.y * t + u.y * H * 4 * t * (1 - t), A.z + c.z * t + u.z * H * 4 * t * (1 - t));
    const M = 800, dense = [], cum = [0];
    for (let i = 0; i <= M; i++) dense.push(at(i / M, new THREE.Vector3()));
    for (let i = 1; i <= M; i++) cum.push(cum[i - 1] + dense[i].distanceTo(dense[i - 1]));
    const Ltot = cum[M], n = Math.max(12, Math.ceil(Ltot / ds) + 1);
    const out = { n, p: [], T: [], N: [], Bn, s: [], t: [], d: [], w: [], hf: [], top: null };
    let j = 0;
    for (let i = 0; i < n; i++) {
      const target = (Ltot * i) / (n - 1);
      while (j < M - 1 && cum[j + 1] < target) j++;
      const f = (target - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]);
      const t = (j + f) / M;
      const p = at(t, new THREE.Vector3());
      const T = new THREE.Vector3(c.x + u.x * H * (4 - 8 * t), c.y + u.y * H * (4 - 8 * t), c.z + u.z * H * (4 - 8 * t)).normalize();
      const N = new THREE.Vector3().crossVectors(T, Bn).normalize();
      out.p.push(p); out.T.push(T); out.N.push(N); out.s.push(target); out.t.push(t);
      out.hf.push(Math.max(0, 4 * t * (1 - t)));
    }
    // the section tapers with height
    out.hf.forEach((h, i) => { out.d.push(sec.d0 + (sec.d1 - sec.d0) * Math.pow(h, 1.4)); out.w.push(sec.w0 + (sec.w1 - sec.w0) * Math.pow(h, 1.4)); });
    out.at = (t) => { let best = 0; for (let i = 0; i < n; i++) if (Math.abs(out.t[i] - t) < Math.abs(out.t[best] - t)) best = i; return best; };
    out.ext = (i) => out.p[i].y - out.N[i].y * out.d[i]; // the extrados's height at sample i
    let ti = 0; for (let i = 0; i < n; i++) if (out.ext(i) > out.ext(ti)) ti = i;
    out.top = new THREE.Vector3(out.p[ti].x, out.ext(ti), out.p[ti].z);
    return out;
  }

  // ------------------------------------------------------------------ sections and sweeps
  // the keel: a flat intrados (n = +d) for the vein, a sharp arris on the extrados
  const keel = (d, w) => [[d, -0.6 * w], [d, 0.6 * w], [0.3 * d, w], [-0.6 * d, 0.7 * w], [-d, 0], [-0.6 * d, -0.7 * w], [0.3 * d, -w]];
  const wp = (P, i, n, b, o = [0, 0, 0]) => { const p = P.p[i], N = P.N[i], Bn = P.Bn; o[0] = p.x + N.x * n + Bn.x * b; o[1] = p.y + N.y * n + Bn.y * b; o[2] = p.z + N.z * n + Bn.z * b; return o; };
  const wn = (P, i, nn, nb) => { const N = P.N[i], Bn = P.Bn, x = N.x * nn + Bn.x * nb, y = N.y * nn + Bn.y * nb, z = N.z * nn + Bn.z * nb, l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
  // sweep a section (fn(i) -> polygon in (n, b)) along samples i0..i1, each edge its own strip so arrises stay crisp
  function sweep(P, i0, i1, secFn, A) {
    let prev = secFn(i0);
    for (let i = i0 + 1; i <= i1; i++) {
      const cur = secFn(i), m = cur.length;
      // the polygon's winding decides which side of each edge is out
      let area = 0; for (let j = 0; j < m; j++) { const a = cur[j], b = cur[(j + 1) % m]; area += a[0] * b[1] - b[0] * a[1]; }
      const sg = area > 0 ? 1 : -1;
      for (let j = 0; j < m; j++) {
        const j2 = (j + 1) % m;
        const nEdge = (s) => { const a = s[j], b = s[j2], dn = b[0] - a[0], db = b[1] - a[1]; return [sg * db, -sg * dn]; };
        const ep = nEdge(prev), ec = nEdge(cur);
        const n0 = wn(P, i - 1, ep[0], ep[1]), n1 = wn(P, i, ec[0], ec[1]);
        A.quad(wp(P, i - 1, prev[j][0], prev[j][1], []), wp(P, i - 1, prev[j2][0], prev[j2][1], []), wp(P, i, cur[j2][0], cur[j2][1], []), wp(P, i, cur[j][0], cur[j][1], []), n0, n0, n1, n1);
      }
      prev = cur;
    }
  }
  // close a section at sample i, facing along +T (dir 1) or -T (dir -1)
  function cap(P, i, poly, dir, A) {
    const T = P.T[i], nn = [T.x * dir, T.y * dir, T.z * dir];
    const c = wp(P, i, poly.reduce((s, q) => s + q[0], 0) / poly.length, poly.reduce((s, q) => s + q[1], 0) / poly.length, []);
    for (let j = 0; j < poly.length; j++) {
      const a = wp(P, i, poly[j][0], poly[j][1], []), b = wp(P, i, poly[(j + 1) % poly.length][0], poly[(j + 1) % poly.length][1], []);
      A.tri(c, a, b, nn, nn, nn);
    }
  }
  function solidRib(P, i0, i1, isOpen) {
    sweep(P, i0, i1, (i) => keel(P.d[i], P.w[i]), stone);
    if (isOpen) { if (i0 > 0) cap(P, i0, keel(P.d[i0], P.w[i0]), -1, stone); if (i1 < P.n - 1) cap(P, i1, keel(P.d[i1], P.w[i1]), 1, stone); }
  }
  // the black-glass vein along the intrados, carrying its arc length for the pulse
  function vein(P, i0, i1, phase) {
    for (let i = i0 + 1; i <= i1; i++) {
      const n0 = P.d[i - 1] + 0.025, n1 = P.d[i] + 0.025, b0 = P.w[i - 1] * 0.34, b1 = P.w[i] * 0.34;
      const N0 = P.N[i - 1], N1 = P.N[i];
      glass.quad(wp(P, i - 1, n0, -b0, []), wp(P, i - 1, n0, b0, []), wp(P, i, n1, b1, []), wp(P, i, n1, -b1, []), [N0.x, N0.y, N0.z], [N0.x, N0.y, N0.z], [N1.x, N1.y, N1.z], [N1.x, N1.y, N1.z],
        [P.s[i - 1], phase], [P.s[i - 1], phase], [P.s[i], phase], [P.s[i], phase]);
    }
  }
  // the graduations: bronze blades standing off the extrados every 1.5 m of arc, every fifth one twice as long,
  // from 4 m above the feet; against the sky the outer arches' edges read as a ruled limb
  function graduate(P, i0, i1) {
    const s0 = Math.ceil((P.s[i0] + 0.01) / 1.5) * 1.5;
    for (let s = s0, k = Math.round(s0 / 1.5); s < P.s[i1] - 0.2; s += 1.5, k++) {
      let i = i0; while (i < i1 && P.s[i + 1] < s) i++;
      if (P.p[i].y - ground.groundAt(P.p[i].x, P.p[i].z) < 4) continue;
      const len = k % 5 ? 0.75 : 1.6, d = P.d[i], w = P.w[i] * 0.8;
      const poly = [[-d - len, -w], [-d - len, w], [-d + 0.1, w], [-d + 0.1, -w]];
      const T = P.T[i], p = P.p[i];
      const Q = { p: [p.clone().addScaledVector(T, -0.11), p.clone().addScaledVector(T, 0.11)], N: [P.N[i], P.N[i]], T: [T, T], Bn: P.Bn };
      sweep(Q, 0, 1, () => poly, bronze);
      cap(Q, 0, poly, -1, bronze); cap(Q, 1, poly, 1, bronze);
    }
  }
  // a bronze band round the rib at sample i, 0.9 m long
  function collar(P, i) {
    const poly = keel(P.d[i] + 0.1, P.w[i] + 0.1);
    const T = P.T[i], p = P.p[i];
    const Q = { n: 2, p: [p.clone().addScaledVector(T, -0.45), p.clone().addScaledVector(T, 0.45)], N: [P.N[i], P.N[i]], T: [T, T], Bn: P.Bn };
    sweep(Q, 0, 1, () => poly, bronze);
    cap(Q, 0, poly, -1, bronze); cap(Q, 1, poly, 1, bronze);
  }
  // a length of the unclosed arch's crown, never raised: lying on its side on two stone chocks inside the nest,
  // curved along it, where it is clearest of the trunnions
  function layDown(P, ia, ib) {
    const rr = 14, half = 0.34;
    let am = 0, best = -1;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 90) {
      let m = Infinity;
      for (let k = -2; k <= 2; k++) { const x = cx + Math.cos(a + (half * k) / 2) * rr, z = cz + Math.sin(a + (half * k) / 2) * rr; for (const f of allFeet) m = Math.min(m, Math.hypot(x - f.x, z - f.z) - f.r); }
      if (m > best) { best = m; am = a; }
    }
    const A = { x: cx + Math.cos(am - half) * rr, z: cz + Math.sin(am - half) * rr }, Bq = { x: cx + Math.cos(am + half) * rr, z: cz + Math.sin(am + half) * rr };
    const w = P.w[Math.round((ia + ib) / 2)], y = Math.max(ground.groundAt(A.x, A.z), ground.groundAt(Bq.x, Bq.z), ground.groundAt(cx + Math.cos(am) * rr, cz + Math.sin(am) * rr)) + w + 0.55;
    A.y = y; Bq.y = y;
    // lying flat: its plane level, its crown toward the centre
    const c = new THREE.Vector3(Bq.x - A.x, 0, Bq.z - A.z), e = c.clone().normalize();
    const uIn = new THREE.Vector3(-e.z, 0, e.x); if (uIn.x * (cx - (A.x + Bq.x) / 2) + uIn.z * (cz - (A.z + Bq.z) / 2) < 0) uIn.negate();
    const Bn = new THREE.Vector3().crossVectors(c, uIn).normalize();
    const Hs = 1.6, n = Math.ceil(2 * rr * Math.sin(half) / ds) + 1;
    const Q = { n, p: [], T: [], N: [], Bn, d: [], w: [] };
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      Q.p.push(new THREE.Vector3(A.x + c.x * t + uIn.x * Hs * 4 * t * (1 - t), y, A.z + c.z * t + uIn.z * Hs * 4 * t * (1 - t)));
      const T = new THREE.Vector3(c.x + uIn.x * Hs * (4 - 8 * t), 0, c.z + uIn.z * Hs * (4 - 8 * t)).normalize();
      Q.T.push(T); Q.N.push(new THREE.Vector3().crossVectors(T, Bn).normalize());
      Q.d.push(P.d[ia]); Q.w.push(w);
    }
    sweep(Q, 0, n - 1, (i) => keel(Q.d[i], Q.w[i]), stone);
    cap(Q, 0, keel(Q.d[0], Q.w[0]), -1, stone); cap(Q, n - 1, keel(Q.d[n - 1], Q.w[n - 1]), 1, stone);
    // the chocks, and colliders along it (a walker can step over neither)
    for (const t of [0.22, 0.78]) {
      const p = Q.p[Math.round(t * (n - 1))], gy = ground.minGround(p.x, p.z, 1.2) - 0.3;
      const g = new THREE.BoxGeometry(1.4, y - w * 0.7 - gy, 1.6 * Q.d[0]);
      g.rotateY(-Math.atan2(c.z, c.x)); g.translate(p.x, (gy + y - w * 0.7) / 2, p.z);
      extraStone.push(g);
    }
    for (let i = 0; i < n; i++) { const p = Q.p[i]; col(p.x, p.z, Q.d[0] + 0.2, ground.groundAt(p.x, p.z) - 0.5, y + w - ground.groundAt(p.x, p.z) + 0.5); }
    env.notes.arcatureCrown = { x: +((A.x + Bq.x) / 2).toFixed(1), z: +((A.z + Bq.z) / 2).toFixed(1) };
  }

  raiseNest();

  // ------------------------------------------------------------------ meshes
  const out = (env.extraMeshes ||= []);
  const add = (geos, material, name, shadow) => {
    const g = mergeGeometries(geos);
    for (const x of geos) x.dispose();
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, material);
    m.name = name; m.castShadow = shadow; m.receiveShadow = true;
    m.matrixAutoUpdate = false; m.updateMatrix();
    out.push({ mesh: m, tris: g.attributes.position.count / 3 });
    return g;
  };
  const masonry = ctx.kit.masonry({ color: '#7f8580', course: 1.5, base: g0 - 0.5, diminish: 0.985, slab: 2.2, joint: 0.03, wear: 0.6, moss: 0.4, inlay: 'glass', inlayEvery: 0.07 });
  add([stone.geo(), ...extraStone], masonry.mat, 'structures-arcature', true);
  // the veins: black glass, a cold pulse travelling foot to foot
  const glassMat = new THREE.MeshStandardMaterial({ color: '#05060a', roughness: 0.08, metalness: 0.45, emissive: new THREE.Color(ctx.palette.crystal), emissiveIntensity: 0.03 });
  const gu = { uPulseT: { value: 0 }, uGutter: { value: 1 } };
  glassMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, gu);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aAlong; varying vec2 vAlong;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlong = aAlong;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uPulseT, uGutter; varying vec2 vAlong;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          float w = fract(vAlong.x / 34.0 - uPulseT * 0.018 + vAlong.y);
          float pulse = 0.16 + 0.95 * exp(-pow((w - 0.5) * 11.0, 2.0)) + 0.25 * exp(-pow((fract(w * 3.0 + 0.4) - 0.5) * 7.0, 2.0)) * vAlong.y;
          float rule = 0.35 + 0.65 * step(0.82, fract(vAlong.x / 1.5)) + 1.2 * step(0.94, fract(vAlong.x / 15.0));
          totalEmissiveRadiance *= pulse * rule * uGutter;
        }`);
  };
  glassMat.customProgramCacheKey = () => 'fp-arcature-glass-v1';
  add([glass.geo()], glassMat, 'structures-arcature-glass', false);
  (env.updates ||= []).push((dt, t, f) => { gu.uPulseT.value = t; gu.uGutter.value = 1 + (1 - f) * 1.4; });
  // bronze, verdigris where the rain runs, black where it does not
  const bg = add([bronze.geo(), ...extraBronze], new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.7, roughness: 0.5 }), 'structures-arcature-bronze', true);
  {
    const p = bg.attributes.position, n = bg.attributes.normal, c = new Float32Array(p.count * 3);
    const dark = new THREE.Color('#2a2016'), verd = new THREE.Color('#3b6656'), k = new THREE.Color(), N2 = ctx.noise.noise2;
    for (let i = 0; i < p.count; i++) {
      const v = 0.5 + 0.5 * N2(p.getX(i) * 0.5 + p.getY(i) * 0.3, p.getZ(i) * 0.5 - p.getY(i) * 0.2);
      const m = Math.min(1, Math.max(0, (v - 0.4) * 2.0 + Math.max(0, n.getY(i)) * 0.5));
      k.copy(dark).lerp(verd, m);
      c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b;
    }
    bg.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  const top = Math.max(...crowns.map((c) => c.y));
  const note = { x: cx, z: cz, r: L.r, top: +(top - g0).toFixed(1), arches: ribs, horns };
  Object.defineProperty(note, 'crowns', { value: crowns, enumerable: false });
  env.notes.arches = note;
}

// a triangle soup: positions, normals and (for the glass) a vec2 per vertex; quads are wound to face their normal
function acc(along) {
  const P = [], Nn = [], A = along ? [] : null;
  const _e1 = [0, 0, 0], _e2 = [0, 0, 0];
  const face = (a, b, c, na, nb, nc) => {
    _e1[0] = b[0] - a[0]; _e1[1] = b[1] - a[1]; _e1[2] = b[2] - a[2]; _e2[0] = c[0] - a[0]; _e2[1] = c[1] - a[1]; _e2[2] = c[2] - a[2];
    const fx = _e1[1] * _e2[2] - _e1[2] * _e2[1], fy = _e1[2] * _e2[0] - _e1[0] * _e2[2], fz = _e1[0] * _e2[1] - _e1[1] * _e2[0];
    return fx * (na[0] + nb[0] + nc[0]) + fy * (na[1] + nb[1] + nc[1]) + fz * (na[2] + nb[2] + nc[2]) >= 0;
  };
  const push = (p, n, a) => { P.push(p[0], p[1], p[2]); Nn.push(n[0], n[1], n[2]); if (A) A.push(a ? a[0] : 0, a ? a[1] : 0); };
  return {
    tri(a, b, c, na, nb, nc, aa, ab, ac) {
      if (face(a, b, c, na, nb, nc)) { push(a, na, aa); push(b, nb, ab); push(c, nc, ac); }
      else { push(a, na, aa); push(c, nc, ac); push(b, nb, ab); }
    },
    quad(a, b, c, d, na, nb, nc, nd, aa, ab, ac, ad) { this.tri(a, b, c, na, nb, nc, aa, ab, ac); this.tri(a, c, d, na, nc, nd, aa, ac, ad); },
    geo() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
      if (A) g.setAttribute('aAlong', new THREE.Float32BufferAttribute(A, 2));
      return g;
    },
  };
}
