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
    hollow: lin('#030202'), lip: mixc(barkC, lin('#5a4a3a'), 0.35), lichen: lin('#7d8466'), nest: lin('#3a2e22'), egg: lin('#b8b0a0'),
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
  const sk = { limbs: [], leaves: [], moss: [], feet: [], height: H, crown: V(0, H * 0.82, 0) };
  const bodyY = H * 0.64, bodyR = 0.7 + H * 0.02;
  const legR = 0.4 + H * 0.02;
  const spread = 1.4 + H * 0.055;
  const n = spec.legs;
  // legs: boles from the ground, bowed out at the knee, meeting under the body
  for (let k = 0; k < n; k++) {
    const a = n === 2 ? (k ? 0 : Math.PI) + (rng() - 0.5) * 0.4 : Math.PI / 2 + (k * 2 * Math.PI) / 3 + (rng() - 0.5) * 0.3;
    const fx = Math.cos(a) * spread, fz = Math.sin(a) * spread * (n === 2 ? 0.6 : 1) + (n === 2 ? (rng() - 0.5) * 0.8 : 0);
    sk.feet.push({ x: fx, z: fz, r: legR * 1.5 });
    const foot = V(fx, -0.6, fz), hip = V(fx * 0.22, bodyY - 0.5, fz * 0.22 - 0.1);
    const knee = V(fx * 0.92, bodyY * 0.45, fz * 0.92 - 0.3);
    const pts = bez(foot, knee, hip, 12, (t) => legR * (1 - 0.3 * t) * (1 + 0.9 * Math.exp(-Math.max(t * bodyY, 0) * 1.6)), 0.2, rng, 0.42);
    sk.limbs.push({ pts, level: 0 });
    // a burl or two on the bole, and a snapped stub: what a trunk carries
    for (let b = 0; b < 2; b++) {
      const q = pts[3 + Math.floor(rng() * 6)], ba = rng() * Math.PI * 2, br = q.r * (0.45 + rng() * 0.25);
      sk.limbs.push({ pts: [{ x: q.x, y: q.y, z: q.z, r: br }, { x: q.x + Math.cos(ba) * q.r * 0.8, y: q.y + 0.1, z: q.z + Math.sin(ba) * q.r * 0.8, r: br * 0.9, wob: 0.2 }], level: 1, cap: true });
    }
    { const q = pts[5 + Math.floor(rng() * 4)], ba = a + (rng() - 0.5) * 1.5;
      sk.limbs.push({ pts: [{ x: q.x, y: q.y, z: q.z, r: q.r * 0.35 }, { x: q.x + Math.cos(ba) * 0.9, y: q.y + 0.55, z: q.z + Math.sin(ba) * 0.9, r: q.r * 0.22 }], level: 1, cap: true }); }
    // roots: short buttresses into the ground, as the trees'
    for (let r = 0; r < 3; r++) {
      const ra = a + (r - 1) * 1.1 + (rng() - 0.5) * 0.5, rp = [];
      for (let i = 0; i <= 3; i++) {
        const t = i / 3;
        rp.push({ x: fx + Math.cos(ra) * (legR * 0.5 + t * legR * 2.4), y: 0.6 * (1 - t) - 0.35 * t, z: fz + Math.sin(ra) * (legR * 0.5 + t * legR * 2.4), r: legR * 0.42 * (1 - 0.7 * t) });
      }
      sk.limbs.push({ pts: rp, level: 2, root: true });
    }
  }
  // the body: a gnarled bole, thick, a little forward
  sk.limbs.push({ pts: [
    { x: 0, y: bodyY - 1.1, z: -0.05, r: bodyR * 0.75, wob: 0.2 },
    { x: 0.05, y: bodyY - 0.2, z: 0, r: bodyR * 1.0, wob: 0.22 },
    { x: -0.04, y: bodyY + 0.7, z: 0.08, r: bodyR * 1.05, wob: 0.2 },
    { x: 0, y: bodyY + 1.5, z: 0.12, r: bodyR * 0.85, wob: 0.18 },
    { x: 0.03, y: bodyY + 2.1, z: 0.08, r: bodyR * 0.55, wob: 0.15 },
  ], level: 0, cap: true });
  // a leader on up, as a trunk would go on
  sk.limbs.push({ pts: bez(V(0.03, bodyY + 2.0, 0.08), V(-0.2, H * 0.82, -0.1), V(0.1 + (rng() - 0.5) * 0.6, H * 0.97, -0.2), 5, (t) => bodyR * 0.5 * (1 - 0.8 * t), 0.12, rng, 0.2), level: 1 });
  // the face: a burl on the body's front, its two hollows and a split under them, turned down at the ground before it
  const fy = bodyY + 0.75, fz = bodyR * 1.0;
  sk.limbs.push({ pts: [{ x: 0, y: fy + 0.05, z: fz * 0.4, r: bodyR * 0.5, wob: 0.15 }, { x: 0, y: fy - 0.05, z: fz * 0.85, r: bodyR * 0.48, wob: 0.12 }, { x: 0, y: fy - 0.15, z: fz * 1.05, r: bodyR * 0.36, wob: 0.1 }], level: 1, cap: true, burl: true });
  sk.face = { y: fy - 0.08, z: fz * 1.05 + bodyR * 0.3, tilt: 0.5, gap: bodyR * 0.4, eyeR: bodyR * 0.2, closed: asleep };
  // arms: from the shoulders out and up, held like boughs, a hand of twigs and leaves at the end
  const sh = bodyY + 1.5;
  for (const s of [-1, 1]) {
    const el = 0.75 + rng() * 0.25, reach = H * (0.17 + rng() * 0.05);
    const shoulder = V(s * bodyR * 0.75, sh, 0.05);
    const elbow = shoulder.clone().add(V(s * reach * Math.cos(el), reach * Math.sin(el), 0.2 + rng() * 0.5));
    const wrist = elbow.clone().add(V(s * H * (0.09 + rng() * 0.04), H * (0.12 + rng() * 0.05), (rng() - 0.3) * 0.8));
    const armR = legR * 0.72;
    const arm = bez(shoulder, elbow.clone().add(V(0, -0.4, 0)), wrist, 8, (t) => armR * (1 - 0.5 * t), 0.12, rng, 0.2);
    sk.limbs.push({ pts: arm, level: 1 });
    // boughs all along the arm, up and out, so the crown is a canopy over it and not a fist of leaves
    for (let k = 0; k < 4; k++) {
      const q = arm[2 + k], a2 = (rng() - 0.5) * 1.2;
      branch(sk, rng, V(q.x, q.y, q.z), V(s * (0.6 + rng() * 0.5), 0.3 + rng() * 0.35, Math.sin(a2) * 1.1).normalize(), H * (0.13 + rng() * 0.06), q.r * 0.55, 2, 3);
    }
    // the hand: five twigs splayed up and out
    for (let f = 0; f < 3; f++) {
      const fa = (f - 1) * 0.55;
      const d = V(s * Math.sin(fa + 0.25 * s) * 0.8, 1, Math.cos(fa) * 0.3 + (rng() - 0.5) * 0.4).normalize();
      branch(sk, rng, wrist.clone(), d, H * (0.09 + rng() * 0.05), armR * 0.42, 2, asleep ? 3 : 3);
    }
    // a bough or two off the forearm, as a limb would carry
    const mid = elbow.clone().lerp(wrist, 0.4);
    branch(sk, rng, mid, V(s * 0.8, 0.6, (rng() - 0.5) * 0.8).normalize(), H * 0.12, armR * 0.5, 2, 3);
  }
  // a few short boughs off the leader, so the top is a crown and not a stalk
  for (let k = 0; k < 5; k++) {
    const y = lerp(bodyY + 2.3, H * 0.92, k / 4), a = k * 2.4 + rng();
    branch(sk, rng, V(0, y, -0.1), V(Math.cos(a), 0.55, Math.sin(a)).normalize(), H * 0.13, bodyR * 0.22, 2, 3);
  }
  // the asleep one: overgrown, with a nest of sticks and three eggs in the fork of its arms
  if (asleep) {
    sk.nest = { x: 0, y: sh + 0.55, z: -0.15, r: bodyR * 0.95 };
    for (let k = 0; k < 6; k++) {
      const a = rng() * Math.PI * 2;
      sk.moss.push({ p: V(Math.cos(a) * bodyR * 0.8, bodyY + rng() * 1.6, Math.sin(a) * bodyR * 0.8), len: 1.4 + rng() * 2.2, w: 0.5 + rng() * 0.5, ang: a });
    }
  }
  sk.spheres = boundSpheres(sk);
  return sk;
}

// what it occupies, as a few dozen spheres in its own frame: one round each limb, each leaf cluster, each hank of moss,
// the face and the nest. The test of whether it can be seen is these against the view (stilters can be seen past their
// arms' reach: a box round them is most of a clearing)
function boundSpheres(sk) {
  const out = [];
  for (const L of sk.limbs) {
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity, r = 0;
    for (const p of L.pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); r = Math.max(r, p.r * (1 + (p.wob || 0))); }
    out.push([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + r * 1.6]);
  }
  for (const L of sk.leaves) out.push([L.p.x, L.p.y + L.s * 0.2, L.p.z, L.s * 0.85]);
  for (const M of sk.moss) out.push([M.p.x, M.p.y - M.len / 2, M.p.z, M.len / 2 + M.w]);
  if (sk.nest) out.push([sk.nest.x, sk.nest.y, sk.nest.z, sk.nest.r * 1.5]);
  return out;
}

export function meshStilter(sk, colors, rng, detail = 'hi') {
  const gb = new GeoBuilder(['glow']);
  const ex0 = { glow: 0 }, H = sk.height;
  const sidesFor = detail === 'hi' ? [9, 6, 4, 3] : [6, 4, 3, 0];
  const barkAt = (y) => mixc(mixc(colors.bark, colors.barkTop, clamp(y / H, 0, 1)), colors.mossCol, (1 - smoothstep(0, H * 0.35, y)) * colors.moss);
  for (const limb of sk.limbs) {
    const sides = sidesFor[Math.min(limb.level, 3)];
    if (!sides) continue;
    let pts = limb.pts;
    if (detail !== 'hi' && limb.level >= 2 && pts.length > 3) pts = pts.filter((_, i) => i % 2 === 0 || i === pts.length - 1);
    tube(gb, pts, limb.burl ? 9 : sides, (i) => (limb.burl ? colors.lip : barkAt(pts[i].y)), { capTip: limb.level > 0 || limb.cap, u0: BARK_U0, u1: BARK_U1, vPerMetre: 0.35, ex: ex0 });
  }
  // the face: two hollows (or two shut slits, asleep) and a split, on a plane turned down by `tilt`
  const F = sk.face, ct = Math.cos(F.tilt), st = Math.sin(F.tilt);
  const n = V(0, -st, ct), up = V(0, ct, st), side = V(1, 0, 0);
  const disc = (cx, cy, rx, ry, depth, col, rim) => {
    const c = V(0, F.y, F.z).addScaledVector(side, cx).addScaledVector(up, cy);
    const ic = gb.vert(c.x - n.x * depth, c.y - n.y * depth, c.z - n.z * depth, n.x, n.y, n.z, col[0], col[1], col[2], 0.2, 0.2, ex0);
    const ring = [], outer = [];
    const seg = 10;
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const p = c.clone().addScaledVector(side, ca * rx).addScaledVector(up, sa * ry);
      ring.push(gb.vert(p.x, p.y, p.z, n.x, n.y, n.z, col[0], col[1], col[2], 0.2, 0.2, ex0));
      const o = c.clone().addScaledVector(side, ca * (rx + 0.07)).addScaledVector(up, sa * (ry + 0.06)).addScaledVector(n, 0.04);
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
let MAT = null;
export function stilterMaterial(ctx) {
  MAT ||= makeTreeMaterials(ctx, makeAtlas(ctx.makeRng(4101))).tree;
  return MAT;
}

export function makeStilter(ctx, spec, i) {
  const rng = ctx.makeRng(18040 + i * 31);
  const sk = growStilter(rng, spec);
  const geo = meshStilter(sk, stilterColours(ctx.palette), rng, ctx.quality === 'low' ? 'lo' : 'hi');
  const mesh = new THREE.Mesh(geo, stilterMaterial(ctx));
  mesh.name = `stilter-${i}`;
  mesh.castShadow = ctx.quality !== 'low';
  mesh.receiveShadow = true;
  return { mesh, sk };
}

// ---------- in the walk ----------
export function buildStilters(ctx, { leadAt = null, exitAt = null, trees = [] } = {}) {
  const { scene, terrain, camera } = ctx;
  const rng = ctx.makeRng(18047);
  const cam = camera.position;
  const S = STILTERS;
  const list = [];
  const offTrack = (x, z) => (leadAt ? !leadAt(x, z) : true);
  const offTrees = (x, z) => { for (const t of trees) if (hyp(t.x - x, t.z - z) < 3.6) return false; return true; };
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
      if (offTrack(tx, tz) && offTrees(tx, tz) && dry(tx, tz) && apart(tx, tz, null)) { x = tx; z = tz; break; }
    }
    const st = {
      i, x, z, yaw: Math.atan2(GROVE.x - x, GROVE.z - z) + (rng() - 0.5) * 1.2, h: spec.h, asleep: !!spec.asleep, mesh, sk,
      wait: 3 + rng() * 4, inView: false, steps: 0, turns: 0, colliders: [], home: { x, z },
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
  const fine = (st, x, z) => inLeash(x, z) && hyp(x - cam.x, z - cam.z) >= S.keep && offTrack(x, z) && offTrees(x, z) && dry(x, z) && apart(x, z, st);

  const ev = (st, kind, from) => {
    st.mesh.updateMatrixWorld();
    ctx.events?.dispatchEvent(new CustomEvent('stilter', { detail: { i: st.i, kind, x: st.x, y: ground(st.x, st.z), z: st.z, h: st.h, from } }));
  };

  let cool = 0, ringHold = 0, ringed = false;
  const state = { list, ring: null, steps: 0, rings: 0, frozen: false, why: { fine: 0, seen: 0 } };

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
    } else if (r < 0.2) {
      tries = null; // only turn
    } else if (r < 0.6 && d > S.keep + 3) {
      // nearer, but never inside the keep
      const want = Math.max(S.keep + 1, d - (2.5 + rng() * 2));
      for (let k = 0; k < 8; k++) {
        const a = Math.atan2(st.x - vx, st.z - vz) + (rng() - 0.5) * 0.7;
        tries.push([vx + Math.sin(a) * want, vz + Math.cos(a) * want]);
      }
    } else {
      // round behind the visitor's back
      const back = ctx.player.yaw; // the look is (-sin yaw, -cos yaw): behind is the bearing yaw itself
      for (let k = 0; k < 10; k++) {
        const a = back + (rng() - 0.5) * 2.4, dd = 8.5 + rng() * 8;
        tries.push([vx + Math.sin(a) * dd, vz + Math.cos(a) * dd]);
      }
    }
    if (tries) for (const [x, z] of tries) {
      const ny = faceYaw(x, z) + (rng() - 0.5) * 0.3;
      if (!fine(st, x, z)) { state.why.fine++; continue; }
      if (seenAt(x, z, st, ny)) { state.why.seen++; continue; }
      st.x = x; st.z = z; st.yaw = ny;
      place(st); st.steps++; state.steps++; ev(st, 'step', from);
      return true;
    }
    const y = faceYaw(st.x, st.z);
    if (Math.abs(Math.atan2(Math.sin(y - st.yaw), Math.cos(y - st.yaw))) < 0.25 || seenAt(st.x, st.z, st, y)) return false;
    st.yaw = y; place(st); st.turns++; ev(st, 'turn', from);
    return true;
  }

  // the ring: at the gutter's depth, every waking one round a visitor in the grove, facing in, the gap toward the way out
  function ring() {
    const vx = cam.x, vz = cam.z;
    const out = exitAt ? exitAt(vx, vz) : { x: SPURS.north.from.x, z: SPURS.north.from.z };
    const gap = Math.atan2(out.x - vx, out.z - vz);
    const woke = list.filter((s) => !s.asleep);
    const span = Math.PI * 2 - S.gap;
    const placed = [];
    const taken = list.filter((s) => s.asleep).map((s) => [s.x, s.z]);
    const clear = (x, z) => taken.every(([tx, tz]) => hyp(tx - x, tz - z) >= 6);
    woke.forEach((st, k) => {
      const base = gap + S.gap / 2 + ((k + 0.5) / woke.length) * span;
      const from = { x: st.x, z: st.z };
      for (let t = 0; t < 40; t++) {
        const a = base + (t ? (rng() - 0.5) * (0.4 + t * 0.04) : 0), rr = S.ring + (t ? (rng() - 0.3) * 3.5 : 0);
        const x = vx + Math.sin(a) * rr, z = vz + Math.cos(a) * rr;
        if (hyp(x - vx, z - vz) < S.keep || !offTrack(x, z) || !offTrees(x, z) || !dry(x, z) || !clear(x, z)) continue;
        st.x = x; st.z = z; st.yaw = faceYaw(x, z); place(st); st.steps++; state.steps++; ev(st, 'ring', from);
        taken.push([x, z]); placed.push({ i: st.i, a, r: rr });
        break;
      }
    });
    state.ring = { x: vx, z: vz, gap, placed };
    state.rings++;
  }

  function update(dt) {
    if (state.frozen) return;
    updateWide();
    const f = ctx.sky?.flicker, dark = f?.dark ?? 0;
    const vx = cam.x, vz = cam.z, inGrove = hyp(vx - GROVE.x, vz - GROVE.z) < GROVE.r + 8;
    for (const st of list) st.inView = seenAt(st.x, st.z, st);
    if (dark > 0.85 && inGrove && !ringed) { ringed = true; ring(); ringHold = 20; return; }
    if (dark < 0.3) ringed = false;
    if (ringHold > 0) { if (dark < 0.5) ringHold -= dt; if (hyp(vx - state.ring.x, vz - state.ring.z) > 6) ringHold = 0; return; }
    cool -= dt;
    for (const st of list) {
      if (st.asleep) continue;
      if (st.inView || hyp(st.x - vx, st.z - vz) < S.near) { st.wait = Math.max(st.wait, 1.2); continue; }
      st.wait -= dt;
      if (st.wait > 0 || cool > 0) continue;
      st.wait = 2.5 + rng() * 4.5;
      if (step(st)) cool = 1.1;
    }
  }
  ctx.registerUpdate(update, { at: () => GROVE, near: 160, hz: 0 });
  state.seenAt = seenAt; state.place = place; state.ringNow = ring;
  return state;
}

// The study page (src/study/registry.js): one waking stilter and the asleep one, standing still.
const studyOne = (k) => ({
  id: `stilter${k ? '-asleep' : ''}`, name: k ? 'the asleep stilter' : 'a stilter', kind: 'creature', h: k ? 13 : 12.5, at: [GROVE.x, GROVE.z],
  build(ctx) {
    const spec = STILTERS.list[k ? 4 : 0];
    const { mesh } = makeStilter(ctx, spec, k ? 4 : 0);
    mesh.rotation.y = 0.5;
    ctx.scene.add(mesh);
    return { at: (o) => o.set(0, 0, 0), face: () => 0.5, h: spec.h };
  },
});
export const study = [studyOne(0), studyOne(1)];
