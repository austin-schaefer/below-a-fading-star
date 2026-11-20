// v18-F4: the stilters (the code's name; a visitor meets none). Four tall things in the north wood's grove that stand
// among the trunks as trunks, 9.5 to 13 m: two or three legs like boles with bark, roots and moss, a body high up where a
// knot is a face looking down, two long arms held up like boughs with the wood's own leaves on them; and a fifth, asleep
// and nearly a tree, with a nest in its fork. They are grown from the wood's own atlas and colours (vegetation/trees.js),
// so standing still they pass for its trees.
//
// They move only when nobody is looking: a stilter outside a widened view (the camera's frustum with its vertical field
// 16 degrees wider and its aspect 1.1x, so the frame's edge is never a seam: a phone's tall view included), and not
// within STILTERS.near of the visitor, takes a step every few seconds: nearer, round behind the visitor, or only turns to
// face them. Never into the widened view, never within STILTERS.keep of the visitor, never within 4 m of a track's
// middle, of a trunk, or of each other, never further than the leash from the grove. In the sun's gutter, at the dark's
// depth, the waking ones all move at once into a ring round a visitor in the grove, facing in, with a gap toward the
// track out; they hold it some 20 s after the light comes back, then go on as before.
//
// One mesh each (one material: the wood's), five draws, no light; shadows from medium up. Every move sends 'stilter'
// on ctx.events ({ i, kind: 'step'|'turn'|'ring', x, y, z, h, from: { x, z } }) for the sound (F5) to answer.
import * as THREE from 'three';
import { GeoBuilder, tube, clamp, lerp, smoothstep } from '../vegetation/util.js';
import { makeAtlas, makeTreeMaterials } from '../vegetation/trees.js';
import { GROVE, SPURS, STILTERS } from './plan.js';
import { hyp } from '../noise.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const BARK_U0 = 0.01, BARK_U1 = 0.48; // the atlas's bark half (trees.js)
const leafUV = (tile) => { const u = 0.5 + (tile % 2) * 0.25, v = Math.floor(tile / 2) * 0.5; return [u + 0.004, 1 - v - 0.5 + 0.004, u + 0.246, 1 - v - 0.004]; };

// the deodand trees' colours (trees.js treeColours), so a stilter is the wood's bark, moss and leaf
export function stilterColours(palette) {
  const barkC = lin(palette.bark);
  return {
    bark: mixc(barkC, [0, 0, 0], 0.25), barkTop: barkC, mossCol: lin('#26301a'), moss: 0.7,
    leaf: lin('#1a2214'), leafAlt: lin('#2a2614'), mossHang: lin('#3a4028'),
    hollow: lin('#030202'), lip: mixc(barkC, lin('#5a4a3a'), 0.35), lichen: lin('#7d8466'), scar: lin('#a89a80'), fox: lin('#d9f6cf'), nest: lin('#3a2e22'), egg: lin('#b8b0a0'),
  };
}

// ---------- the body, as a skeleton of limbs (trees.js's form: { pts: [{x,y,z,r,wob}], level }) ----------
function bez(a, b, c, n, rr, wob, rng, jit) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const j = i > 0 && i < n ? jit : 0;
    out.push({
      x: u * u * a.x + 2 * u * t * b.x + t * t * c.x + (rng() - 0.5) * j,
      y: u * u * a.y + 2 * u * t * b.y + t * t * c.y,
      z: u * u * a.z + 2 * u * t * b.z + t * t * c.z + (rng() - 0.5) * j,
      r: rr(t), wob,
    });
  }
  return out;
}

function branch(sk, rng, start, dir, len, r, level, maxLevel) {
  const n = level <= 1 ? 5 : level === 2 ? 4 : 3;
  const pts = [{ x: start.x, y: start.y, z: start.z, r }];
  const p = start.clone(), d = dir.clone(), q = V();
  for (let i = 1; i <= n; i++) {
    q.set(rng() - 0.5, rng() - 0.5, rng() - 0.5);
    d.addScaledVector(q, 0.5 + level * 0.15); d.y += 0.12 - (level > 2 ? 0.08 : 0); d.normalize();
    p.addScaledVector(d, len / n);
    pts.push({ x: p.x, y: p.y, z: p.z, r: Math.max(r * (1 - 0.72 * (i / n)), 0.012) });
  }
  sk.limbs.push({ pts, level });
  if (level < maxLevel) {
    const nc = 2 + (rng() < 0.5 ? 1 : 0);
    for (let c = 0; c < nc; c++) {
      const b = pts[1 + Math.floor(rng() * (n - 1))];
      const cd = d.clone().add(V(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(1.5)).normalize();
      branch(sk, rng, V(b.x, b.y, b.z), cd, len * 0.6 * (0.7 + rng() * 0.5), b.r * 0.8, level + 1, maxLevel);
    }
  }
  if (level >= 2 && rng() < 0.85) {
    const n0 = V(p.x - sk.crown.x, (p.y - sk.crown.y) * 0.6 + 0.4, p.z - sk.crown.z).normalize();
    sk.leaves.push({ p: p.clone(), n: n0, s: 1.8 + rng() * 1.3, tile: Math.floor(rng() * 3), spin: rng() * Math.PI });
  }
  if (level <= 2 && rng() < 0.4) {
    const k = 1 + Math.floor(rng() * (pts.length - 2)), q2 = pts[k];
    sk.moss.push({ p: V(q2.x, q2.y - q2.r, q2.z), len: 1.0 + rng() * 2.2, w: 0.45 + rng() * 0.5, ang: rng() * Math.PI });
  }
}

export function growStilter(rng, spec) {
  const H = spec.h, asleep = !!spec.asleep;
  const sk = { limbs: [], leaves: [], moss: [], feet: [], height: H, crown: V(0, H * 0.86, 0), mark: spec.mark || null };
  const [lx, lz] = spec.lean || [0, 0];
  // where the boles meet, high up (the asleep one sunk low, into a fork of its own roots)
  const jy = asleep ? H * 0.3 : H * (0.76 + rng() * 0.06);
  const J = V(lx, jy, lz);
  const legR = asleep ? 0.5 + H * 0.02 : 0.24 + H * 0.013;
  const spread = asleep ? 2.6 + H * 0.05 : 0.55 + H * 0.04;
  const n = spec.legs;
  // the boles: long, thin, a close clump of trunks, each a little bowed, flared at the foot; with `prop` the last is a
  // thinner stay set further out and leaning in
  for (let k = 0; k < n; k++) {
    const prop = spec.prop && k === n - 1;
    const a = (k / n) * Math.PI * 2 + 0.6 + (rng() - 0.5) * 0.7;
    const sp = spread * (prop ? 1.9 : 0.8 + rng() * 0.4);
    const fx = Math.cos(a) * sp, fz = Math.sin(a) * sp;
    const r0 = legR * (prop ? 0.6 : 0.9 + rng() * 0.25);
    sk.feet.push({ x: fx, z: fz, r: r0 * 1.6 });
    const foot = V(fx, -0.5, fz), top = J.clone().add(V(Math.cos(a) * 0.25, -0.4, Math.sin(a) * 0.25));
    const mid = foot.clone().lerp(top, 0.45).add(V(Math.cos(a + 1.3) * (0.15 + rng() * 0.3), 0, Math.sin(a + 1.3) * (0.15 + rng() * 0.3)));
    const pts = bez(foot, mid, top, asleep ? 6 : 14, (t) => r0 * (1 - 0.45 * t) * (1 + 1.0 * Math.exp(-Math.max(t * jy, 0) * 1.4)), 0.16, rng, asleep ? 0.2 : 0.3);
    sk.limbs.push({ pts, level: 0 });
    // roots flared at the foot, as the trees' (the asleep one's many, its boles grown over)
    for (let r = 0; r < (asleep ? 5 : 3); r++) {
      const ra = a + (r - 1) * (asleep ? 0.8 : 1.2) + (rng() - 0.5) * 0.6, rp = [], L = r0 * (asleep ? 2.2 : 2.6);
      for (let q = 0; q <= 3; q++) {
        const t = q / 3;
        rp.push({ x: fx + Math.cos(ra) * (r0 * 0.4 + t * L), y: (asleep ? 1.1 : 0.7) * (1 - t) * (1 - t * 0.3) - 0.35 * t, z: fz + Math.sin(ra) * (r0 * 0.4 + t * L), r: r0 * (asleep ? 0.32 : 0.5) * (1 - 0.75 * t), wob: 0.2 });
      }
      sk.limbs.push({ pts: rp, level: 2, root: true });
    }
    // a burl and a snapped stub, as a trunk carries
    const q = pts[Math.floor(pts.length * (0.3 + rng() * 0.4))], ba = rng() * Math.PI * 2;
    sk.limbs.push({ pts: [{ x: q.x, y: q.y, z: q.z, r: q.r * 0.5 }, { x: q.x + Math.cos(ba) * 0.7, y: q.y + 0.45, z: q.z + Math.sin(ba) * 0.7, r: q.r * 0.25 }], level: 1, cap: true });
  }
  // the body: a small hanging burl, a wasps' nest under the crown where the boles meet
  const bR = asleep ? 1.0 : 0.5 + H * 0.02;
  sk.limbs.push({ pts: [
    { x: J.x, y: J.y + 0.4, z: J.z, r: bR * 0.6, wob: 0.2 },
    { x: J.x + 0.05, y: J.y - 0.3, z: J.z + 0.05, r: bR, wob: 0.25 },
    { x: J.x, y: J.y - 1.0, z: J.z, r: bR * 0.85, wob: 0.25 },
    { x: J.x - 0.05, y: J.y - 1.5, z: J.z - 0.05, r: bR * 0.4, wob: 0.2 },
  ], level: 0, cap: true, burl: true });
  // the crown: an ordinary tree's, one mass: a leader and limbs up and out from the meeting, branching to leaves
  const C = J.clone().add(V(0, 0.3, 0));
  sk.crown.set(J.x, asleep ? jy + H * 0.4 : jy + H * 0.12, J.z);
  sk.limbs.push({ pts: bez(C, C.clone().add(V(0.3, (H - jy) * 0.5, 0)), V(J.x + (rng() - 0.5), H, J.z + (rng() - 0.5)), 5, (t) => legR * 1.1 * (1 - 0.85 * t), 0.12, rng, 0.2), level: 1 });
  const nPrim = asleep ? 7 : 6 + Math.floor(rng() * 3);
  for (let k = 0; k < nPrim; k++) {
    const az = k * 2.39996 + rng() * 0.8, el = 0.1 + rng() * 0.6;
    const at = C.clone().add(V(0, (asleep ? H * 0.5 : (H - jy) * 0.6) * (k / nPrim), 0));
    branch(sk, rng, at, V(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)), H * (asleep ? 0.3 : 0.3) * (0.8 + rng() * 0.4), legR * 0.75, 1, 3);
  }
  if (asleep) {
    // its own trunk on up from the fork, for the crown it now is
    sk.limbs.push({ pts: bez(J.clone(), J.clone().add(V(0.4, H * 0.3, 0.2)), J.clone().add(V(-0.3, H * 0.62, 0)), 7, (t) => bR * 0.8 * (1 - 0.6 * t), 0.18, rng, 0.25), level: 0 });
  }
  // the hanging limb: out from the meeting and down among the boles, bent the wrong way, its end a knot that might be
  // a face, turned to whoever the stilter faces (+z)
  const out = asleep ? 1.6 : 1.8 + H * 0.12, drop = asleep ? 0.6 : jy * (0.38 + rng() * 0.08);
  const s0 = J.clone().add(V(0.25, -0.2, 0.4));
  const e = V(J.x + 0.2, jy - drop, J.z + out);
  const hang = bez(s0, s0.clone().add(V(0.15, 0.2, out * 1.05)), e, 10, (t) => legR * (0.9 - 0.45 * t), 0.12, rng, 0.12);
  sk.limbs.push({ pts: hang, level: 1 });
  for (let k = 0; k < 2; k++) { const q = hang[3 + k * 3]; sk.moss.push({ p: V(q.x, q.y - q.r, q.z), len: 0.8 + rng() * 1.4, w: 0.4, ang: rng() * 3 }); }
  // twigs with leaves off its upper run, so it is a bough that droops and not a bare arm
  for (let k = 0; k < 3; k++) { const q = hang[2 + k * 2]; branch(sk, rng, V(q.x, q.y, q.z), V((rng() - 0.5) * 1.4, 0.5, 0.6).normalize(), H * 0.09, q.r * 0.5, 2, 3); }
  const kr = legR * 0.75;
  sk.limbs.push({ pts: [{ x: e.x, y: e.y + 0.25, z: e.z - 0.1, r: kr * 0.9, wob: 0.15 }, { x: e.x, y: e.y - 0.05, z: e.z + 0.05, r: kr * 1.15, wob: 0.15 }, { x: e.x, y: e.y - 0.35, z: e.z + 0.05, r: kr * 0.6, wob: 0.12 }], level: 1, cap: true, burl: true });
  sk.face = { x: e.x, y: e.y - 0.02, z: e.z + kr * 1.05, tilt: 0.55, gap: kr * 0.42, eyeR: kr * 0.2, rim: kr * 0.12, closed: asleep };
  // foxfire on the knot: a clump of pale shelves round it (glow 1: the material's own emissive), so the face end is a
  // faint pale thing at head height in the dark (the asleep one's gone out)
  sk.shelves = [];
  if (!asleep) for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + rng() * 0.5, n = V(Math.cos(a), 0, Math.sin(a));
    sk.shelves.push({ p: V(e.x + n.x * kr * 1.05, e.y + 0.2 - (k % 3) * 0.17, e.z + n.z * kr * 1.05), n, s: 0.1 + rng() * 0.09 });
  }
  if (asleep) sk.nest = { x: J.x, y: jy + 0.5, z: J.z - 0.2, r: bR * 0.9 };
  // the one thing a visitor remembers it by: a pale scar down a bole, a long rag of moss, or a broken bough
  const leg0 = sk.limbs[0].pts;
  if (spec.mark === 'scar' || spec.mark === 'both') {
    const k0 = Math.floor(leg0.length * 0.12), k1 = Math.floor(leg0.length * 0.75), sc = [];
    for (let k = k0; k <= k1; k++) { const q = leg0[k], ox = q.x - J.x * (q.y / jy), oz = q.z - J.z * (q.y / jy), l = hyp(ox, oz) || 1; sc.push({ x: q.x + (ox / l) * q.r * 0.93, y: q.y, z: q.z + (oz / l) * q.r * 0.93, r: 0.05 + 0.04 * Math.sin((k - k0) / (k1 - k0) * Math.PI) }); }
    sk.limbs.push({ pts: sc, level: 1, scar: true });
  }
  if (spec.mark === 'rag' || spec.mark === 'both') sk.moss.push({ p: V(J.x + 0.3, J.y - 0.6, J.z + 0.2), len: Math.min(5, jy * 0.55), w: 1.1, ang: 0.4, rag: true });
  if (spec.mark === 'broken') {
    const b0 = J.clone().add(V(-0.3, 0.2, -0.2)), b1 = b0.clone().add(V(-2.6, 0.5, -0.8));
    sk.limbs.push({ pts: bez(b0, b0.clone().lerp(b1, 0.5).add(V(0, 0.4, 0)), b1, 5, (t) => legR * 0.75 * (1 - 0.3 * t), 0.1, rng, 0.1), level: 1, broken: true });
  }
  sk.spheres = boundSpheres(sk);
  return sk;
}

// what it occupies, as spheres in its own frame: a run along each limb, one each leaf cluster and hank of moss,
// the face and the nest. The test of whether it can be seen is these against the view (stilters can be seen past their
// arms' reach: a box round them is most of a clearing)
function boundSpheres(sk) {
  const out = [];
  // a limb as a run of spheres, one each two or three of its points (a long bole as one sphere would be seen from
  // beside it, behind the visitor's shoulder)
  for (const L of sk.limbs) {
    const P = L.pts, step = P.length > 6 ? 2 : P.length - 1 || 1;
    for (let k = 0; k < P.length - 1; k += step) {
      const a = P[k], b = P[Math.min(P.length - 1, k + step)], r = Math.max(a.r * (1 + (a.wob || 0)), b.r * (1 + (b.wob || 0)));
      out.push([(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / 2 + r * 1.6]);
    }
  }
  for (const L of sk.leaves) out.push([L.p.x, L.p.y + L.s * 0.2, L.p.z, L.s * 0.85]);
  for (const M of sk.moss) out.push([M.p.x, M.p.y - M.len / 2, M.p.z, M.len / 2 + M.w]);
  if (sk.nest) out.push([sk.nest.x, sk.nest.y, sk.nest.z, sk.nest.r * 1.5]);
  return out;
}

export function meshStilter(sk, colors, rng, detail = 'hi') {
  const gb = new GeoBuilder(['glow']);
  const ex0 = { glow: 0 }, exScar = { glow: 0.3 }, H = sk.height; // the scar catches what light there is (0.3^2 of the glow)
  const sidesFor = detail === 'hi' ? [9, 6, 4, 3] : [6, 4, 3, 0];
  const barkAt = (y) => mixc(mixc(colors.bark, colors.barkTop, clamp(y / H, 0, 1)), colors.mossCol, (1 - smoothstep(0, H * 0.35, y)) * colors.moss);
  for (const limb of sk.limbs) {
    const sides = sidesFor[Math.min(limb.level, 3)];
    if (!sides) continue;
    let pts = limb.pts;
    if (detail !== 'hi' && limb.level >= 2 && pts.length > 3) pts = pts.filter((_, i) => i % 2 === 0 || i === pts.length - 1);
    tube(gb, pts, limb.burl ? 9 : sides, (i) => (limb.scar ? colors.scar : limb.broken && i === pts.length - 1 ? colors.scar : limb.burl ? colors.lip : barkAt(pts[i].y)), { capTip: (limb.level > 0 || limb.cap) && !limb.broken, u0: BARK_U0, u1: BARK_U1, vPerMetre: 0.35, ex: limb.scar ? exScar : ex0 });
  }
  // the face: two hollows (or two shut slits, asleep) and a split, on a plane turned down by `tilt`
  const F = sk.face, ct = Math.cos(F.tilt), st = Math.sin(F.tilt);
  const n = V(0, -st, ct), up = V(0, ct, st), side = V(1, 0, 0);
  const disc = (cx, cy, rx, ry, depth, col, rim) => {
    const c = V(F.x || 0, F.y, F.z).addScaledVector(side, cx).addScaledVector(up, cy);
    const ic = gb.vert(c.x - n.x * depth, c.y - n.y * depth, c.z - n.z * depth, n.x, n.y, n.z, col[0], col[1], col[2], 0.2, 0.2, ex0);
    const ring = [], outer = [];
    const seg = 10;
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const p = c.clone().addScaledVector(side, ca * rx).addScaledVector(up, sa * ry);
      ring.push(gb.vert(p.x, p.y, p.z, n.x, n.y, n.z, col[0], col[1], col[2], 0.2, 0.2, ex0));
      const rw = F.rim || 0.07, o = c.clone().addScaledVector(side, ca * (rx + rw)).addScaledVector(up, sa * (ry + rw * 0.85)).addScaledVector(n, rw * 0.5);
      outer.push(gb.vert(o.x, o.y, o.z, n.x, n.y, n.z, rim[0], rim[1], rim[2], 0.2, 0.2, ex0));
    }
    for (let k = 0; k < seg; k++) {
      const k1 = (k + 1) % seg;
      gb.tri(ic, ring[k], ring[k1]);
      gb.quad(ring[k], outer[k], outer[k1], ring[k1]);
    }
  };
  const eyeRY = F.closed ? F.eyeR * 0.18 : F.eyeR * 0.8;
  for (const s of [-1, 1]) disc(s * F.gap, 0, F.eyeR * (F.closed ? 1.2 : 1), eyeRY, F.closed ? 0.02 : 0.16, colors.hollow, colors.lichen);
  disc(0.02, -F.eyeR * 3.4, F.eyeR * 0.28, F.eyeR * 1.8, 0.08, colors.hollow, colors.lip);
  // leaves: two crossed cards a cluster, as the trees' near mesh
  for (let i = 0; i < sk.leaves.length; i++) {
    const L = sk.leaves[i];
    const col = mixc(colors.leaf, colors.leafAlt, (i * 0.618) % 1);
    const [u0, v0, u1, v1] = leafUV(L.tile);
    const s = L.s;
    for (let q = 0; q < 2; q++) {
      if (detail !== 'hi' && q) continue;
      const ang = L.spin + q * Math.PI / 2;
      const ax = V(Math.cos(ang), 0, Math.sin(ang));
      const upv = V(0, 1, 0).applyAxisAngle(ax, q ? 0.9 : 0.25);
      const a = L.p.clone().addScaledVector(ax, -s / 2).addScaledVector(upv, -s * 0.3);
      const b = L.p.clone().addScaledVector(ax, s / 2).addScaledVector(upv, -s * 0.3);
      const c = L.p.clone().addScaledVector(ax, s / 2).addScaledVector(upv, s * 0.7);
      const d = L.p.clone().addScaledVector(ax, -s / 2).addScaledVector(upv, s * 0.7);
      const nn = L.n;
      const ia = gb.vert(a.x, a.y, a.z, nn.x, nn.y, nn.z, col[0], col[1], col[2], u0, v0, ex0);
      const ib = gb.vert(b.x, b.y, b.z, nn.x, nn.y, nn.z, col[0], col[1], col[2], u1, v0, ex0);
      const ic = gb.vert(c.x, c.y, c.z, nn.x, nn.y, nn.z, col[0], col[1], col[2], u1, v1, ex0);
      const id = gb.vert(d.x, d.y, d.z, nn.x, nn.y, nn.z, col[0], col[1], col[2], u0, v1, ex0);
      gb.quad(ia, ib, ic, id);
    }
  }
  // the foxfire shelves: drooping half-discs, glowing (the trees' shelf, trees.js)
  for (const Sh of sk.shelves || []) {
    const seg = 6, base = Math.atan2(Sh.n.z, Sh.n.x), c0 = colors.fox;
    const c = gb.vert(Sh.p.x - Sh.n.x * 0.03, Sh.p.y + Sh.s * 0.08, Sh.p.z - Sh.n.z * 0.03, 0, 1, 0, c0[0], c0[1], c0[2], 0.2, 0.2, { glow: 0.8 });
    const rim = [];
    for (let k = 0; k <= seg; k++) {
      const a = base + lerp(-1.35, 1.35, k / seg), rr = Sh.s * (0.85 + 0.15 * Math.sin(k * 2.3));
      rim.push(gb.vert(Sh.p.x + Math.cos(a) * rr, Sh.p.y - Sh.s * 0.25, Sh.p.z + Math.sin(a) * rr, Math.cos(a) * 0.4, 0.9, Math.sin(a) * 0.4, c0[0], c0[1], c0[2], 0.2, 0.25, { glow: 1 }));
    }
    for (let k = 0; k < seg; k++) { gb.tri(c, rim[k + 1], rim[k]); gb.tri(c, rim[k], rim[k + 1]); }
  }
  // hanging moss: crossed vertical cards
  for (const Mo of sk.moss) {
    const [u0, v0, u1, v1] = leafUV(3), col = colors.mossHang;
    for (let q = 0; q < 2; q++) {
      const ax = V(Math.cos(Mo.ang + q * 1.57), 0, Math.sin(Mo.ang + q * 1.57)).multiplyScalar(Mo.w / 2);
      const nn = V(-ax.z, 0.3, ax.x).normalize();
      const t0 = Mo.p.clone().sub(ax), t1 = Mo.p.clone().add(ax);
      const ia = gb.vert(t0.x, t0.y - Mo.len, t0.z, nn.x, nn.y, nn.z, col[0], col[1], col[2], u0, v0, ex0);
      const ib = gb.vert(t1.x, t1.y - Mo.len, t1.z, nn.x, nn.y, nn.z, col[0], col[1], col[2], u1, v0, ex0);
      const ic = gb.vert(t1.x, t1.y, t1.z, nn.x, nn.y, nn.z, col[0], col[1], col[2], u1, v1, ex0);
      const id = gb.vert(t0.x, t0.y, t0.z, nn.x, nn.y, nn.z, col[0], col[1], col[2], u0, v1, ex0);
      gb.quad(ia, ib, ic, id);
    }
  }
  // the nest: a ring of sticks round a dark cup, three pale eggs in it
  if (sk.nest) {
    const N = sk.nest;
    for (let k = 0; k < 22; k++) {
      const a = (k / 22) * Math.PI * 2 + rng() * 0.3, b = a + 0.9 + rng() * 0.8, rr = N.r * (0.8 + rng() * 0.35);
      const y0 = N.y + (rng() - 0.3) * 0.35, y1 = N.y + (rng() - 0.3) * 0.35;
      tube(gb, [{ x: N.x + Math.cos(a) * rr, y: y0, z: N.z + Math.sin(a) * rr, r: 0.035 }, { x: N.x + Math.cos((a + b) / 2) * rr * 1.08, y: (y0 + y1) / 2 + 0.06, z: N.z + Math.sin((a + b) / 2) * rr * 1.08, r: 0.03 }, { x: N.x + Math.cos(b) * rr, y: y1, z: N.z + Math.sin(b) * rr, r: 0.02 }], 3, () => colors.nest, { capTip: true, u0: BARK_U0, u1: BARK_U1, ex: ex0 });
    }
    tube(gb, [{ x: N.x, y: N.y - 0.25, z: N.z, r: N.r * 0.55 }, { x: N.x, y: N.y + 0.05, z: N.z, r: N.r * 0.85 }], 10, () => colors.nest, { capTip: false, u0: BARK_U0, u1: BARK_U1, ex: ex0 });
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + 0.4, r = 0.075, c = colors.egg;
      const p = V(N.x + Math.cos(a) * 0.17, N.y + 0.02, N.z + Math.sin(a) * 0.17);
      const v = [[r, 0, 0], [-r, 0, 0], [0, r * 1.35, 0], [0, -r, 0], [0, 0, r], [0, 0, -r]].map(([x, y, z]) => {
        const l = Math.hypot(x, y, z);
        return gb.vert(p.x + x, p.y + y, p.z + z, x / l, y / l, z / l, c[0], c[1], c[2], 0.1, 0.1, ex0);
      });
      for (const [i, j, l] of [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [4, 3, 0], [1, 3, 4], [5, 3, 1], [0, 3, 5]]) gb.tri(v[i], v[j], v[l]);
    }
  }
  return gb.build();
}

// one material for all of them: the wood's (trees.js), so they shade, fog and take the gutter as its trees do
let MAT = null, GLOW = null;
export function stilterMaterial(ctx) {
  if (!MAT) {
    const m = makeTreeMaterials({ palette: { ...ctx.palette, wisp: '#d9f6cf' } }, makeAtlas(ctx.makeRng(4101))); // F1's foxfire's greenish white
    MAT = m.tree; GLOW = m.glow; GLOW.value = 1.1;
  }
  return MAT;
}
export const stilterGlow = () => GLOW;

export function makeStilter(ctx, spec, i) {
  const rng = ctx.makeRng(18040 + i * 31);
  const sk = growStilter(rng, spec);
  const geo = meshStilter(sk, stilterColours(ctx.palette), rng, ctx.quality === 'low' ? 'lo' : 'hi');
  const mesh = new THREE.Mesh(geo, stilterMaterial(ctx));
  mesh.name = `stilter-${i}`;
  mesh.castShadow = false; // its shadow would step with it, in view when the body is not (the low sun throws it long)
  mesh.receiveShadow = true;
  return { mesh, sk };
}

// ---------- in the walk ----------
export function buildStilters(ctx, { leadAt = null, treadNear = null, exitAt = null, trees = [] } = {}) {
  const { scene, terrain, camera } = ctx;
  const rng = ctx.makeRng(18047);
  const cam = camera.position;
  const S = STILTERS;
  const list = [];
  const offTrack = (x, z) => (leadAt ? !leadAt(x, z) : true);
  const offTrees = (x, z) => { for (const t of trees) if (hyp(t.x - x, t.z - z) < 2.6) return false; return true; };
  const nearTrees = (x, z) => { for (const t of trees) if (hyp(t.x - x, t.z - z) < 2.2) return false; return true; }; // the ring may stand closer in
  const offGlade = (x, z) => hyp(x - GROVE.x, z - GROVE.z) > 7.5; // the glade's open middle is where they ring, not where they stand
  const inLeash = (x, z) => hyp(x - GROVE.x, z - GROVE.z) < S.leash;
  const dry = (x, z) => { const wl = terrain.waterLevelAt(x, z); return wl === null || terrain.heightAt(x, z) > wl + 0.4; };
  const apart = (x, z, me) => { for (const o of list) if (o !== me && hyp(o.x - x, o.z - z) < 5.5) return false; return true; };
  const ground = (x, z) => terrain.heightAt(x, z);

  S.list.forEach((spec, i) => {
    const { mesh, sk } = makeStilter(ctx, spec, i);
    // the start: the plan's bearing and distance, nudged off a track, a trunk or another stilter
    let x = GROVE.x + Math.sin(spec.a) * spec.d, z = GROVE.z - Math.cos(spec.a) * spec.d;
    for (let k = 0; k < 40; k++) {
      const tx = x + (k ? (rng() - 0.5) * k * 0.8 : 0), tz = z + (k ? (rng() - 0.5) * k * 0.8 : 0);
      if (offTrack(tx, tz) && offTrees(tx, tz) && offGlade(tx, tz) && dry(tx, tz) && apart(tx, tz, null)) { x = tx; z = tz; break; }
    }
    const st = {
      i, x, z, yaw: Math.atan2(GROVE.x - x, GROVE.z - z) + (rng() - 0.5) * 1.2, h: spec.h, asleep: !!spec.asleep, mesh, sk,
      wait: 3 + rng() * 4, seenT: -1, inView: false, steps: 0, turns: 0, colliders: [], home: { x, z },
    };
    // a collider at each foot, moved with it
    for (const f of sk.feet) { const c = { x: 0, z: 0, r: f.r }; st.colliders.push({ f, c }); ctx.addCollider(c); }
    list.push(st);
    scene.add(mesh);
    place(st);
  });

  function place(st) {
    st.mesh.position.set(st.x, ground(st.x, st.z), st.z);
    st.mesh.rotation.y = st.yaw;
    st.mesh.updateMatrixWorld();
    const c = Math.cos(st.yaw), s = Math.sin(st.yaw);
    for (const { f, c: col } of st.colliders) { col.x = st.x + f.x * c + f.z * s; col.z = st.z - f.x * s + f.z * c; }
  }

  // the widened view: the camera's own, its field and aspect opened out so nothing moves at the frame's edge
  const wide = new THREE.PerspectiveCamera(70, 1, 0.1, 600), fr = new THREE.Frustum(), pm = new THREE.Matrix4(), sph = new THREE.Sphere();
  function updateWide() {
    wide.fov = Math.min(camera.fov + 16, 150); wide.aspect = camera.aspect * 1.1; wide.near = 0.1; wide.far = 600;
    wide.updateProjectionMatrix();
    wide.position.copy(camera.position); wide.quaternion.copy(camera.quaternion); wide.updateMatrixWorld(true);
    pm.multiplyMatrices(wide.projectionMatrix, wide.matrixWorldInverse); fr.setFromProjectionMatrix(pm);
  }
  // what it occupies as it would stand there facing `yaw`: its spheres turned and set down, 1.5 m more each, against the
  // widened view; the whole first (one sphere round them all), then each
  for (const st of list) { const b = st.mesh.geometry.boundingSphere; st.bound = { y: b.center.y, r: b.radius + hyp(b.center.x, b.center.z) + 1.5 }; }
  const seenAt = (x, z, st, yaw = st.yaw) => {
    const y = ground(x, z);
    sph.center.set(x, y + st.bound.y, z); sph.radius = st.bound.r;
    if (!fr.intersectsSphere(sph)) return false;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    for (const [lx, ly, lz, r] of st.sk.spheres) {
      sph.center.set(x + lx * c + lz * s, y + ly, z - lx * s + lz * c); sph.radius = r + 1.5;
      if (fr.intersectsSphere(sph)) return true;
    }
    return false;
  };
  const faceYaw = (x, z) => Math.atan2(cam.x - x, cam.z - z);
  // never to where a foot of it would stand within 3.5 m of the visitor
  for (const st of list) st.reach = Math.max(...st.sk.feet.map((f) => hyp(f.x, f.z) + f.r));
  const fine = (st, x, z) => {
    const W = state.why;
    if (!inLeash(x, z)) { W.leash = (W.leash || 0) + 1; return false; }
    if (hyp(x - cam.x, z - cam.z) < Math.max(S.keep, st.reach + 3.5)) { W.keep = (W.keep || 0) + 1; return false; }
    if (treadNear ? treadNear(x, z, st.reach + 0.4) : !offTrack(x, z)) { W.track = (W.track || 0) + 1; return false; } // its feet off the tread
    if (!offTrees(x, z)) { W.trees = (W.trees || 0) + 1; return false; }
    if (hyp(x - GROVE.x, z - GROVE.z) <= 5) { W.glade = (W.glade || 0) + 1; return false; } // a follower may come to the glade's rim
    if (!dry(x, z)) { W.wet = (W.wet || 0) + 1; return false; }
    if (!apart(x, z, st)) { W.apart = (W.apart || 0) + 1; return false; }
    return true;
  };

  const ev = (st, kind, from) => {
    st.mesh.updateMatrixWorld();
    const came = cameFrom(), b = Math.atan2(st.x - cam.x, st.z - cam.z);
    ctx.events?.dispatchEvent(new CustomEvent('stilter', { detail: { i: st.i, kind, x: st.x, y: ground(st.x, st.z), z: st.z, h: st.h, from,
      stride: from ? hyp(st.x - from.x, st.z - from.z) : 0, d: hyp(st.x - cam.x, st.z - cam.z), trailOff: Math.abs(Math.atan2(Math.sin(b - came), Math.cos(b - came))) } }));
  };

  let cool = 0, ringHold = 0, ringed = false, clock = 0, pending = null, pendingT = 0;
  const look = new THREE.Vector3();
  // where each stood: a ring of pressed bare earth with root-holes at every foot it lifted, so the ground shows a walk
  const MARKS = 48, markGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const markMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]),
    vertexShader: `varying vec2 vUv;\n#include <fog_pars_vertex>\nvoid main() { vUv = uv; vec3 transformed = position; vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(transformed, 1.0); gl_Position = projectionMatrix * mvPosition;\n#include <fog_vertex>\n}`,
    fragmentShader: `varying vec2 vUv;\n#include <fog_pars_fragment>\nvoid main() {
      vec2 c = vUv * 2.0 - 1.0; float r = length(c); if (r > 1.0) discard;
      float a = atan(c.y, c.x), n = fract(sin(dot(floor(c * 7.0), vec2(12.9898, 78.233))) * 43758.5453);
      float earth = smoothstep(1.0, 0.72, r + n * 0.12) * smoothstep(0.12, 0.34, r);
      float k = fract(a / 6.2831853 * 7.0 + n * 0.15), hole = smoothstep(0.22, 0.08, abs(k - 0.5)) * smoothstep(0.17, 0.05, abs(r - 0.58));
      vec3 col = mix(vec3(0.05, 0.038, 0.028) * (0.8 + 0.4 * n), vec3(0.006, 0.004, 0.003), hole);
      float al = max(earth * 0.92, hole); if (al < 0.02) discard;
      gl_FragColor = vec4(col, al);\n#include <fog_fragment>\n}`,
    fog: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const marks = new THREE.InstancedMesh(markGeo, markMat, MARKS);
  marks.name = 'stilter-marks'; marks.count = 0; marks.renderOrder = 2;
  scene.add(marks);
  let markNext = 0;
  const mq = new THREE.Quaternion(), mUp = new THREE.Vector3(0, 1, 0), mN = new THREE.Vector3(), mM = new THREE.Matrix4(), mP = new THREE.Vector3(), mS = new THREE.Vector3();
  const leaveMarks = (st) => {
    for (const { c } of st.colliders) {
      terrain.normalAt(c.x, c.z, mN); mq.setFromUnitVectors(mUp, mN).multiply(new THREE.Quaternion().setFromAxisAngle(mUp, rng() * 6.28));
      mP.set(c.x, ground(c.x, c.z) + 0.04, c.z); const sc = c.r * 3.4; mS.set(sc, 1, sc);
      marks.setMatrixAt(markNext, mM.compose(mP, mq, mS));
      markNext = (markNext + 1) % MARKS; marks.count = Math.max(marks.count, markNext === 0 ? MARKS : markNext);
    }
    marks.instanceMatrix.needsUpdate = true; marks.computeBoundingSphere();
  };
  // the way the visitor came: where they stood some 8 to 14 s ago
  const trail = [], trailT = { t: 0 };
  const cameFrom = () => {
    for (let k = trail.length - 1; k >= 0; k--) { const [x, z] = trail[k]; if (hyp(x - cam.x, z - cam.z) > 4) return Math.atan2(x - cam.x, z - cam.z); }
    return ctx.player.yaw;
  };
  const state = { live: false, follower: null, list, ring: null, steps: 0, rings: 0, frozen: false, why: { fine: 0, seen: 0, short: 0 } };

  function step(st) {
    const vx = cam.x, vz = cam.z, d = hyp(st.x - vx, st.z - vz), inGrove = hyp(vx - GROVE.x, vz - GROVE.z) < S.leash + 20;
    const from = { x: st.x, z: st.z };
    const r = rng();
    let tries = [];
    if (!inGrove) {
      // the visitor is away: back toward where it stood, a step at a time
      const hd = hyp(st.home.x - st.x, st.home.z - st.z);
      if (hd < 1) return false;
      const k = Math.min(1, 3.5 / hd);
      tries.push([st.x + (st.home.x - st.x) * k, st.z + (st.home.z - st.z) * k]);
    } else {
      // it follows: a real stride (3 m or more) into the visitor's back-trail, to stand 8 to 12 m behind them within
      // 30 degrees of the way they came (beside the track's tread, never on it), where they will look when they turn
      const came = cameFrom(), side = rng() < 0.5 ? -1 : 1;
      for (let k = 0; k < 60; k++) {
        const a = came + (k % 2 ? side : -side) * (0.3 + rng() * 0.22), dd = 8 + rng() * 4;
        const x = vx + Math.sin(a) * dd, z = vz + Math.cos(a) * dd;
        if (hyp(x - st.x, z - st.z) < 3) { state.why.short++; continue; }
        tries.push([x, z]);
      }
    }
    if (tries) for (const [x, z] of tries) {
      const ny = faceYaw(x, z) + (rng() - 0.5) * 0.3;
      if (!fine(st, x, z)) { state.why.fine++; continue; }
      if (seenAt(x, z, st, ny)) { state.why.seen++; continue; }
      leaveMarks(st); st.x = x; st.z = z; st.yaw = ny;
      place(st); st.steps++; state.steps++; ev(st, 'step', from);
      return true;
    }
    if (inGrove) return false; // the follower only strides (a turn alone is not seen and would hold the next stride)
    const y = faceYaw(st.x, st.z);
    if (Math.abs(Math.atan2(Math.sin(y - st.yaw), Math.cos(y - st.yaw))) < 0.25 || seenAt(st.x, st.z, st, y)) return false;
    st.yaw = y; place(st); st.turns++; ev(st, 'turn', from);
    return true;
  }

  // the ring: at the gutter's depth, every waking one round a visitor in the grove, facing in, the gap toward the way out
  // the ring: at the gutter's depth, each waking one gets a place round a visitor in the grove, facing in, the gap toward
  // the way out; it goes there only while neither it nor its place is in view (the ones behind at once, one being
  // looked at when the visitor turns), so nothing moves in view even in the dark. The plan lasts 30 s.
  function ring() {
    const vx = cam.x, vz = cam.z;
    const out = exitAt ? exitAt(vx, vz) : { x: SPURS.north.from.x, z: SPURS.north.from.z };
    const gap = Math.atan2(out.x - vx, out.z - vz);
    const woke = list.filter((s) => !s.asleep);
    const span = Math.PI * 2 - S.gap;
    const plan = [];
    const taken = list.filter((s) => s.asleep).map((s) => [s.x, s.z]);
    const clear = (x, z) => taken.every(([tx, tz]) => hyp(tx - x, tz - z) >= 6);
    // each to the slot on its own side of the visitor (the slots in turn, the stilters by bearing, the cyclic shift that
    // moves them least), so it and its place are out of view together
    const n = woke.length, bear = (st) => Math.atan2(st.x - vx, st.z - vz);
    const slots = woke.map((_, k) => gap + S.gap / 2 + ((k + 0.5) / n) * span);
    const order = woke.slice().sort((p, q) => ((bear(p) - gap + 8 * Math.PI) % (2 * Math.PI)) - ((bear(q) - gap + 8 * Math.PI) % (2 * Math.PI)));
    const diff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
    let best = 0, bestC = Infinity;
    for (let sh = 0; sh < n; sh++) { let c = 0; order.forEach((st, k) => { c += diff(bear(st), slots[(k + sh) % n]); }); if (c < bestC) { bestC = c; best = sh; } }
    order.forEach((st, k) => {
      const base = slots[(k + best) % n];
      for (let t = 0; t < 80; t++) {
        const a = base + (t ? (rng() - 0.5) * Math.min(1.4, 0.4 + t * 0.03) : 0), rr = S.ring + (t ? (rng() - 0.35) * 4 : 0);
        const x = vx + Math.sin(a) * rr, z = vz + Math.cos(a) * rr;
        if (hyp(x - vx, z - vz) < Math.max(S.keep, st.reach + 3.5) || (treadNear ? treadNear(x, z, st.reach + 0.4) : !offTrack(x, z)) || !nearTrees(x, z) || !dry(x, z) || !clear(x, z)) continue;
        taken.push([x, z]); plan.push({ st, x, z, a, r: rr, done: false });
        break;
      }
    });
    state.ring = { x: vx, z: vz, gap, plan, placed: [], t: 0 };
    state.rings++;
  }
  function ringStep(dt) {
    const R = state.ring;
    R.t += dt;
    for (const P of R.plan) {
      if (P.done) continue;
      const st = P.st, y = Math.atan2(R.x - P.x, R.z - P.z);
      if (st.inView || seenAt(P.x, P.z, st, y)) continue;
      const from = { x: st.x, z: st.z };
      leaveMarks(st); st.x = P.x; st.z = P.z; st.yaw = y; place(st); st.steps++; state.steps++; ev(st, 'ring', from);
      P.done = true; R.placed.push({ i: st.i, a: P.a, r: P.r });
    }
  }

  // held: `?stilters=still`, a held sky (flicker.hold, or the gutter put off as views.mjs does) unless a test sets `live`,
  // the title card (the walk not begun) and the settings panel: nothing steps, rings or counts down
  const STILL = new URLSearchParams(location.search).get('stilters') === 'still';
  const held = () => {
    const f = ctx.sky?.flicker;
    if (STILL || state.frozen) return true;
    if (!state.live && f && (f.hold != null || f.next > 1e6)) return true;
    return ctx.controls?.state?.enabled === false || !!ctx.settings?.shown;
  };
  function update(dt) {
    if (held()) return;
    { const G = stilterGlow(); if (G) G.value = 1.1 + 1.2 * (ctx.sky?.flicker?.dark ?? 0); }
    trailT.t -= dt; if (trailT.t <= 0) { trailT.t = 1; trail.push([cam.x, cam.z]); if (trail.length > 14) trail.shift(); }
    updateWide();
    const f = ctx.sky?.flicker, dark = f?.dark ?? 0;
    const vx = cam.x, vz = cam.z, inGrove = hyp(vx - GROVE.x, vz - GROVE.z) < GROVE.r + 8;
    for (const st of list) st.inView = seenAt(st.x, st.z, st);
    if (dark > 0.85 && inGrove && !ringed) { ringed = true; ring(); ringHold = 30; }
    if (dark < 0.3) ringed = false;
    if (ringHold > 0) {
      if (state.ring.t < 30) ringStep(dt);
      if (dark < 0.5) ringHold -= dt;
      if (hyp(vx - state.ring.x, vz - state.ring.z) > 6) ringHold = 0;
      return;
    }
    // one mover a look: once one has moved, none moves again until the visitor has seen it where it now stands (or 12 s)
    clock += dt; cool -= dt;
    // looked at: its middle within 0.35 rad of the look (the one a visitor remembers)
    camera.getWorldDirection(look);
    for (const st of list) {
      if (!st.inView) continue;
      const dx = st.x - vx, dz = st.z - vz, dy = ground(st.x, st.z) + st.h * 0.5 - cam.y, l = Math.hypot(dx, dy, dz) || 1;
      if ((look.x * dx + look.y * dy + look.z * dz) / l > 0.94) st.seenT = clock;
    }
    if (pending) { if (pending.inView || clock - pendingT > 12) pending = null; else if (pending !== state.follower) return; } // the follower keeps up; no other moves meanwhile
    if (cool > 0) return;
    // the mover is one follower, the same each time (a visitor knows it again by its mark): the scarred one while it
    // is awake and free; else, of those out of view, the one the visitor saw last
    let mover = state.follower || (state.follower = list.find((s) => s.sk.mark === 'scar' && !s.asleep) || null);
    if (!mover || mover.asleep) {
      for (const st of list) { if (st.asleep) continue; if (!mover || st.seenT > mover.seenT || (st.seenT === mover.seenT && st.i < mover.i)) mover = st; }
      state.follower = mover;
    }
    if (mover && (mover.inView || hyp(mover.x - vx, mover.z - vz) < S.near)) mover = null;
    if (!mover) return;
    mover.wait -= dt;
    if (mover.wait > 0) return;
    mover.wait = 0.6 + rng() * 1.2;
    if (step(mover)) { cool = 1.1; pending = mover; pendingT = clock; }
  }
  ctx.registerUpdate(update, { at: () => GROVE, near: 160, hz: 0 });
  // what is drawn, every frame and unthrottled (a teleport out leaves nothing drawn): the stilters within 260 m of the
  // grove, the marks within 120 m; the marks' bounds kept with them
  ctx.registerUpdate(() => {
    const d = hyp(cam.x - GROVE.x, cam.z - GROVE.z), on = d < 260;
    for (const st of list) st.mesh.visible = on;
    marks.visible = marks.count > 0 && d < 120;
  });
  state.seenAt = seenAt; state.place = place; state.ringNow = ring; state.marks = marks; state.cameFrom = cameFrom;
  return state;
}

// The study page (src/study/registry.js): one waking stilter and the asleep one, standing still; and the lineup, two
// of the wood's own trees (trees.js's deodand recipe) with three stilters between them at one scale, to judge whether
// standing still they pass for trees.
const studyOne = (k) => ({
  id: `stilter${k ? '-asleep' : ''}`, name: k ? 'the asleep stilter' : 'a stilter', kind: 'creature', h: 13, at: [GROVE.x, GROVE.z],
  build(ctx) {
    const spec = STILTERS.list[k ? 4 : 0];
    const { mesh } = makeStilter(ctx, spec, k ? 4 : 0);
    mesh.rotation.y = 0.5;
    ctx.scene.add(mesh);
    return { at: (o) => o.set(0, 0, 0), face: () => 0.5, h: 13 };
  },
});
const lineup = {
  id: 'stilter-lineup', name: 'two wood trees and three stilters', kind: 'creature', h: 20, at: [GROVE.x, GROVE.z],
  async build(ctx) {
    const { studyRecipes } = await import('../vegetation/trees.js');
    const deo = studyRecipes.find((r) => r.id === 'tree-deodand');
    const row = [['tree', 0], ['stilter', 1], ['tree', 3], ['stilter', 3], ['stilter', 2]];
    row.forEach(([kind, k], i) => {
      const x = (i - 2) * 7.5;
      const m = kind === 'tree' ? deo.build(ctx.makeRng(4200 + k), k, ctx) : makeStilter(ctx, STILTERS.list[k], k).mesh;
      m.position.set(x, 0, (i % 2) * 3); m.rotation.y = 0.4 + i * 1.3;
      ctx.scene.add(m);
    });
    return { at: (o) => o.set(0, 0, 0), h: 20 };
  },
};
export const study = [studyOne(0), studyOne(1), lineup];
