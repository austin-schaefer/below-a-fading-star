// Trees and fungi. Every tree (the Deodand Wood, the wind-bent moor trees, Medlar Close, the dead
// hollow trunks) lives in one BatchedMesh: one draw call and one shadow call for the lot. Each
// variant is grown as a skeleton once, then meshed twice (near and far detail); trees swap
// geometry by distance. Shelf fungi are baked into the bark geometry with a glow attribute;
// toadstools are a separate InstancedMesh. Both glow brighter when the sun gutters.
import * as THREE from 'three';
import { GeoBuilder, tube, clamp, lerp, smoothstep, unflipNormals, fogBatchFix } from './util.js';
import { makeBatch } from './batch.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lin = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// ---------- Procedural atlas: bark on the left half, four leaf sprays on the right ----------
export function makeAtlas(rng) {
  const W = 512, H = 256;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  // bark: furrowed, streaked, lichen-flecked; greyscale so vertex colour gives the hue
  g.fillStyle = '#b8b8b8'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    const x = rng() * 256, w = 1 + rng() * 4, v = 70 + rng() * 120;
    g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = w;
    g.beginPath();
    let px = x;
    for (let y = -10; y <= 266; y += 12) { px += (rng() - 0.5) * 5; y === -10 ? g.moveTo(px, y) : g.lineTo(px, y); }
    g.stroke();
  }
  for (let i = 0; i < 160; i++) { // deep furrows
    const x = rng() * 256, y = rng() * 256, l = 20 + rng() * 60;
    g.strokeStyle = 'rgba(30,30,30,0.7)'; g.lineWidth = 1 + rng() * 2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rng() - 0.5) * 6, y + l); g.stroke();
  }
  for (let i = 0; i < 90; i++) { // lichen flecks
    const v = 190 + rng() * 60;
    g.fillStyle = `rgba(${v},${v},${v * 0.9},0.55)`;
    g.beginPath(); g.ellipse(rng() * 256, rng() * 256, 1 + rng() * 5, 1 + rng() * 3, rng() * 3, 0, Math.PI * 2); g.fill();
  }
  // wrap the bark seamlessly in v (it repeats along the trunk): copy the top strip to the bottom with a fade
  // leaves: four 128px tiles of twig + leaf sprays, hard alpha for alpha test
  for (let t = 0; t < 4; t++) {
    const ox = 256 + (t % 2) * 128, oy = Math.floor(t / 2) * 128;
    g.save(); g.beginPath(); g.rect(ox, oy, 128, 128); g.clip();
    const cx = ox + 64, cy = oy + 64;
    if (t === 3) { // hanging moss: tangled strands from the top edge
      for (let k = 0; k < 140; k++) {
        const x0 = ox + 8 + rng() * 112, l = 30 + Math.pow(rng(), 0.6) * 95, v = 110 + rng() * 140;
        g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 0.8 + rng() * 1.8;
        g.beginPath(); g.moveTo(x0, oy); let x = x0;
        for (let y = oy; y < oy + l; y += 6) { x += (rng() - 0.5) * 3; g.lineTo(x, y); }
        g.stroke();
      }
      g.restore(); continue;
    }
    // twigs radiating from the lower middle
    g.strokeStyle = 'rgb(70,60,52)';
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (rng() - 0.5) * 2.6, l = 30 + rng() * 30;
      g.lineWidth = 1.2 + rng(); g.beginPath(); g.moveTo(cx, cy + 50);
      g.quadraticCurveTo(cx + Math.cos(a) * l * 0.5 + (rng() - 0.5) * 20, cy + 50 + Math.sin(a) * l * 0.5, cx + Math.cos(a) * l, cy + 40 + Math.sin(a) * l); g.stroke();
    }
    // leaves: small, narrow, clustered in a ragged blob; densest in the core so mips keep a body
    const n = 150 + t * 20;
    for (let k = 0; k < n; k++) {
      const rr = Math.pow(rng(), 0.7) * 54, a = rng() * Math.PI * 2;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.85 - 4;
      const v = 120 + rng() * 135;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.beginPath(); g.ellipse(x, y, 2 + rng() * 3.5, 1 + rng() * 1.6, rng() * Math.PI, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}
const BARK_U0 = 0.01, BARK_U1 = 0.48;
const leafUV = (tile) => { const u = 0.5 + (tile % 2) * 0.25, v = Math.floor(tile / 2) * 0.5; return [u + 0.004, 1 - v - 0.5 + 0.004, u + 0.246, 1 - v - 0.004]; };

// ---------- Skeletons ----------
// A skeleton is { limbs: [{pts:[{x,y,z,r}], level}], leaves: [{p, n, s, tile, spin}], shelves: [{p, n, s}], fruits: [{p, r}] }.
function rand3(rng, out) { out.set(rng() - 0.5, rng() - 0.5, rng() - 0.5); return out; }
const _r = V();

function growTree(rng, P) {
  const sk = { limbs: [], leaves: [], shelves: [], fruits: [], moss: [], height: 0, trunkR: 0 };
  const H = lerp(P.height[0], P.height[1], rng());
  const R0 = lerp(P.trunkR[0], P.trunkR[1], rng());
  sk.height = H; sk.trunkR = R0;
  const crown = V(0, H * 0.7, 0);
  // trunk
  const nT = P.trunkSegs;
  const trunkLen = H * P.trunkFrac;
  const tpts = [];
  const p = V(0, -0.6, 0), d = V(0, 1, 0);
  for (let i = 0; i <= nT; i++) {
    const t = i / nT;
    const flare = 1 + P.flare * Math.exp(-Math.max(p.y, 0) * 2.2);
    tpts.push({ x: p.x, y: p.y, z: p.z, r: R0 * (1 - P.taper * t) * flare, wob: P.wob });
    if (i === nT) break;
    rand3(rng, _r); _r.y = 0;
    d.addScaledVector(_r, P.crook).add(P.lean).normalize();
    p.addScaledVector(d, (trunkLen + 0.6) / nT);
  }
  sk.limbs.push({ pts: tpts, level: 0 });
  crown.set(p.x * 0.5, H * 0.72, p.z * 0.5);
  // roots: short buttresses diving into the ground
  for (let k = 0; k < P.roots; k++) {
    const a = (k / P.roots) * Math.PI * 2 + rng() * 0.8;
    const rp = [];
    for (let i = 0; i <= 3; i++) {
      const t = i / 3;
      rp.push({ x: Math.cos(a) * (R0 * 0.5 + t * R0 * 2.6), y: 0.7 * (1 - t) - 0.35 * t, z: Math.sin(a) * (R0 * 0.5 + t * R0 * 2.6), r: R0 * 0.45 * (1 - 0.7 * t) });
    }
    sk.limbs.push({ pts: rp, level: 2, root: true });
  }
  // limbs
  const nPrim = Math.round(lerp(P.primary[0], P.primary[1], rng()));
  for (let k = 0; k < nPrim; k++) {
    const t = lerp(P.primStart, 1, k / Math.max(1, nPrim - 1)) * 0.85 + rng() * 0.15;
    const idx = Math.min(nT, Math.max(1, Math.round(t * nT)));
    const base = tpts[idx];
    let az = (k * 2.39996 + rng() * 0.9); // golden angle spiral
    const el = lerp(P.primEl[0], P.primEl[1], rng());
    const dir = V(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
    if (P.flag && dir.x < -0.1) dir.x = -dir.x * 0.4; // flagged: no limbs to windward
    const len = H * lerp(P.primLen[0], P.primLen[1], rng()) * (1 - 0.35 * t);
    branch(sk, rng, P, V(base.x, base.y, base.z), dir, len, base.r * P.childR, 1, crown);
  }
  // the leader continues past the trunk top
  if (P.leader) branch(sk, rng, P, p.clone(), d.clone().add(V(0, 0.6, 0)).normalize(), H * 0.3, tpts[nT].r, 1, crown);
  return sk;
}

function branch(sk, rng, P, start, dir, len, r, level, crown) {
  const n = level === 1 ? 5 : level === 2 ? 4 : 3;
  const pts = [{ x: start.x, y: start.y, z: start.z, r }];
  const p = start.clone(), d = dir.clone();
  for (let i = 1; i <= n; i++) {
    rand3(rng, _r);
    d.addScaledVector(_r, P.kink * (0.6 + level * 0.3));
    d.y += P.up * 0.25 - (level > 1 ? P.droop * 0.2 : 0);
    d.add(P.wind);
    d.normalize();
    p.addScaledVector(d, len / n);
    pts.push({ x: p.x, y: p.y, z: p.z, r: Math.max(r * (1 - 0.72 * (i / n)), 0.012) });
  }
  sk.limbs.push({ pts, level });
  if (level < P.levels) {
    const nc = Math.round(lerp(P.children[0], P.children[1], rng()));
    for (let c = 0; c < nc; c++) {
      const i = 1 + Math.floor(rng() * (n - 1));
      const b = pts[i];
      const cd = d.clone().add(rand3(rng, V()).multiplyScalar(1.6)).normalize();
      if (P.flag && cd.x < 0) cd.x *= -0.3;
      branch(sk, rng, P, V(b.x, b.y, b.z), cd, len * P.childLen * (0.7 + rng() * 0.5), b.r * 0.8, level + 1, crown);
    }
  }
  // foliage and fruit at tips
  if (level >= P.leafLevel && rng() < P.leafChance) {
    const n0 = V(p.x - crown.x, (p.y - crown.y) * 0.6 + 0.4, p.z - crown.z).normalize();
    sk.leaves.push({ p: p.clone(), n: n0, s: lerp(P.leafSize[0], P.leafSize[1], rng()), tile: Math.floor(rng() * 3), spin: rng() * Math.PI });
  }
  if (P.moss && level <= 2 && rng() < P.moss) {
    const k = 1 + Math.floor(rng() * (pts.length - 2));
    const q = pts[k];
    sk.moss.push({ p: V(q.x, q.y - q.r, q.z), len: 1.2 + rng() * 2.6, w: 0.5 + rng() * 0.6, ang: rng() * Math.PI });
  }
  if (P.fruit && level >= P.levels - 1 && rng() < P.fruit) {
    sk.fruits.push({ p: p.clone().add(V((rng() - 0.5) * 0.2, -0.08 - rng() * 0.15, (rng() - 0.5) * 0.2)), r: 0.045 + rng() * 0.03 });
  }
}

function addShelves(sk, rng, count, yRange) {
  const trunk = sk.limbs[0].pts;
  for (let k = 0; k < count; k++) {
    const y = lerp(yRange[0], yRange[1], rng());
    let tp = trunk[0];
    for (const q of trunk) if (q.y <= y) tp = q;
    const a = rng() * Math.PI * 2;
    const tiers = 1 + Math.floor(rng() * 3);
    for (let t = 0; t < tiers; t++) {
      const n = V(Math.cos(a + t * 0.4), 0, Math.sin(a + t * 0.4));
      const rr = tp.r * 0.92;
      sk.shelves.push({ p: V(tp.x + n.x * rr, y + t * 0.16, tp.z + n.z * rr), n, s: (0.1 + rng() * 0.2) * (1 - t * 0.2) });
    }
  }
}

// ---------- Meshing ----------
function meshSkeleton(sk, detail, colors, rng) {
  const gb = new GeoBuilder(['glow']);
  const ex0 = { glow: 0 };
  const sidesFor = detail === 'hi' ? [8, 6, 4, 3, 3] : detail === 'lo' ? [5, 3, 0, 0, 0] : [4, 0, 0, 0, 0];
  for (const limb of sk.limbs) {
    const sides = sidesFor[Math.min(limb.level, 4)];
    if (!sides) continue;
    if (detail !== 'hi' && limb.root && sk.trunkR < 1) continue;
    let pts = limb.pts;
    const stride = detail === 'hi' ? (limb.level >= 3 ? 2 : 1) : detail === 'lo' ? (limb.level >= 2 ? 3 : 2) : 3;
    if (stride > 1 && pts.length > 3) pts = pts.filter((_, i) => i % stride === 0 || i === pts.length - 1);
    const H = Math.max(sk.height, 1);
    tube(gb, pts, sides, (i, t) => {
      const y = pts[i].y;
      const moss = (1 - smoothstep(0.0, H * 0.35, y)) * colors.moss;
      return mixc(mixc(colors.bark, colors.barkTop, clamp(y / H, 0, 1)), colors.mossCol, moss);
    }, { capTip: limb.level > 0, u0: BARK_U0, u1: BARK_U1, vPerMetre: 0.35, ex: ex0 });
  }
  // foliage cards: two crossed quads per cluster, normals bent outward from the crown
  const leafStep = detail === 'far' ? 2 : 1;
  for (let i = 0; i < sk.leaves.length; i += leafStep) {
    const L = sk.leaves[i];
    const col = mixc(colors.leaf, colors.leafAlt, (i * 0.618) % 1);
    const [u0, v0, u1, v1] = leafUV(L.tile);
    const s = L.s * (detail === 'hi' ? 1 : detail === 'lo' ? 1.1 : 1.45);
    for (let q = 0; q < 2; q++) {
      const ang = L.spin + q * Math.PI / 2;
      const ax = V(Math.cos(ang), 0, Math.sin(ang));
      const up = V(0, 1, 0).applyAxisAngle(ax, (q ? 0.9 : 0.25)); // second card lies flatter
      const a = L.p.clone().addScaledVector(ax, -s / 2).addScaledVector(up, -s * 0.3);
      const b = L.p.clone().addScaledVector(ax, s / 2).addScaledVector(up, -s * 0.3);
      const c = L.p.clone().addScaledVector(ax, s / 2).addScaledVector(up, s * 0.7);
      const d = L.p.clone().addScaledVector(ax, -s / 2).addScaledVector(up, s * 0.7);
      const n = L.n;
      const ia = gb.vert(a.x, a.y, a.z, n.x, n.y, n.z, col[0], col[1], col[2], u0, v0, ex0);
      const ib = gb.vert(b.x, b.y, b.z, n.x, n.y, n.z, col[0], col[1], col[2], u1, v0, ex0);
      const ic = gb.vert(c.x, c.y, c.z, n.x, n.y, n.z, col[0], col[1], col[2], u1, v1, ex0);
      const id = gb.vert(d.x, d.y, d.z, n.x, n.y, n.z, col[0], col[1], col[2], u0, v1, ex0);
      gb.quad(ia, ib, ic, id);
    }
  }
  // hanging moss: crossed vertical cards under the limbs
  if (detail !== 'far') for (const Mo of sk.moss) {
    const [u0, v0, u1, v1] = leafUV(3);
    const col = colors.mossHang || [0.25, 0.27, 0.18];
    for (let q = 0; q < 2; q++) {
      const ax = V(Math.cos(Mo.ang + q * 1.57), 0, Math.sin(Mo.ang + q * 1.57)).multiplyScalar(Mo.w / 2);
      const n = V(-ax.z, 0.3, ax.x).normalize();
      const t0 = Mo.p.clone().sub(ax), t1 = Mo.p.clone().add(ax);
      const ia = gb.vert(t0.x, t0.y - Mo.len, t0.z, n.x, n.y, n.z, col[0], col[1], col[2], u0, v0, ex0);
      const ib = gb.vert(t1.x, t1.y - Mo.len, t1.z, n.x, n.y, n.z, col[0], col[1], col[2], u1, v0, ex0);
      const ic = gb.vert(t1.x, t1.y, t1.z, n.x, n.y, n.z, col[0], col[1], col[2], u1, v1, ex0);
      const id = gb.vert(t0.x, t0.y, t0.z, n.x, n.y, n.z, col[0], col[1], col[2], u0, v1, ex0);
      gb.quad(ia, ib, ic, id);
    }
  }
  // shelf fungi: drooping half-discs on the trunk, glowing at the rim
  if (detail === 'hi' || (detail === 'lo' && sk.shelves.length > 6)) {
    for (const S of sk.shelves) {
      const seg = detail === 'hi' ? 6 : 3;
      const base = Math.atan2(S.n.z, S.n.x);
      const c = gb.vert(S.p.x - S.n.x * 0.03, S.p.y + S.s * 0.08, S.p.z - S.n.z * 0.03, 0, 1, 0, colors.shelf[0], colors.shelf[1], colors.shelf[2], 0.2, 0.2, { glow: 0.35 });
      const rim = [];
      for (let k = 0; k <= seg; k++) {
        const a = base + lerp(-1.35, 1.35, k / seg);
        const rr = S.s * (0.85 + 0.15 * Math.sin(k * 2.3));
        const x = S.p.x + Math.cos(a) * rr, z = S.p.z + Math.sin(a) * rr;
        rim.push(gb.vert(x, S.p.y - S.s * 0.25, z, Math.cos(a) * 0.4, 0.9, Math.sin(a) * 0.4, colors.shelfRim[0], colors.shelfRim[1], colors.shelfRim[2], 0.2, 0.25, { glow: 1 }));
      }
      for (let k = 0; k < seg; k++) gb.tri(c, rim[k + 1], rim[k]);
    }
  }
  // fruit: small dark octahedra hanging at twig tips
  if (detail !== 'far') for (const F of sk.fruits) {
    const r = F.r, p = F.p, cf = colors.fruit;
    const v = [[r, 0, 0], [-r, 0, 0], [0, r * 1.1, 0], [0, -r, 0], [0, 0, r], [0, 0, -r]].map(([x, y, z]) => {
      const l = Math.hypot(x, y, z);
      return gb.vert(p.x + x, p.y + y, p.z + z, x / l, y / l, z / l, cf[0], cf[1], cf[2], 0.1, 0.1, ex0);
    });
    const f = [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [4, 3, 0], [1, 3, 4], [5, 3, 1], [0, 3, 5]];
    for (const [a, b, c] of f) gb.tri(v[a], v[b], v[c]);
  }
  return gb.build();
}

// A broken, hollow snag: outer wall with a jagged lip, an inner wall, a dark floor.
function meshHollow(rng, colors, detail) {
  const gb = new GeoBuilder(['glow']);
  const ex0 = { glow: 0 };
  const H = 2.6 + rng() * 3.8, R = 0.55 + rng() * 0.45, sides = detail === 'hi' ? 11 : 7, rings = detail === 'hi' ? 7 : 3;
  const lip = []; for (let s = 0; s < sides; s++) lip.push(H - rng() * 1.3 * (0.4 + 0.6 * Math.abs(Math.sin(s * 1.7))));
  const lean = V((rng() - 0.5) * 0.25, 0, (rng() - 0.5) * 0.25);
  const ring = (j, inner) => {
    const out = [];
    const t = j / rings;
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * Math.PI * 2;
      const yTop = lip[s];
      const y = inner ? lerp(yTop, yTop * 0.45, t) : lerp(-0.5, yTop, t);
      const flare = inner ? 1 : 1 + 0.5 * Math.exp(-Math.max(y, 0) * 1.5);
      const rr = R * flare * (inner ? 0.72 : 1) * (1 + 0.12 * Math.sin(a * 3 + j));
      const nx = Math.cos(a), nz = Math.sin(a);
      const x = nx * rr + lean.x * y, z = nz * rr + lean.z * y;
      const col = inner ? colors.inner : mixc(colors.bark, colors.mossCol, (1 - smoothstep(0, H * 0.4, y)) * colors.moss);
      out.push(gb.vert(x, y, z, inner ? -nx : nx, 0, inner ? -nz : nz, col[0], col[1], col[2], BARK_U0 + (BARK_U1 - BARK_U0) * s / sides, y * 0.35, ex0));
    }
    return out;
  };
  const outer = []; for (let j = 0; j <= rings; j++) outer.push(ring(j, false));
  const inner = []; for (let j = 0; j <= rings; j++) inner.push(ring(j, true));
  for (let j = 0; j < rings; j++) for (let s = 0; s < sides; s++) {
    const s1 = (s + 1) % sides;
    gb.quad(outer[j][s], outer[j][s1], outer[j + 1][s1], outer[j + 1][s]);
    gb.quad(inner[j][s1], inner[j][s], inner[j + 1][s], inner[j + 1][s1]);
  }
  // join outer top to inner top (inner ring 0 is at the lip)
  const top = outer[rings];
  for (let s = 0; s < sides; s++) { const s1 = (s + 1) % sides; gb.quad(top[s], inner[0][s], inner[0][s1], top[s1]); }
  // dark floor of the hollow
  const fl = inner[rings];
  const cy = fl.reduce((a, i) => a + gb.p[i * 3 + 1], 0) / sides;
  const c = gb.vert(lean.x * cy, cy, lean.z * cy, 0, 1, 0, colors.inner[0] * 0.5, colors.inner[1] * 0.5, colors.inner[2] * 0.5, 0.2, 0.2, ex0);
  for (let s = 0; s < sides; s++) gb.tri(c, fl[(s + 1) % sides], fl[s]);
  // one or two snapped limbs
  const sk = { limbs: [], leaves: [], shelves: [], fruits: [], moss: [], height: H, trunkR: R };
  for (let k = 0; k < 1 + Math.floor(rng() * 2); k++) {
    const a = rng() * Math.PI * 2, y0 = H * (0.35 + rng() * 0.3), el = 0.2 + rng() * 0.6, l = 0.8 + rng() * 1.8;
    const d = V(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
    const pts = [];
    for (let i = 0; i <= 3; i++) pts.push({ x: lean.x * y0 + d.x * l * i / 3 + Math.cos(a) * R * 0.5, y: y0 + d.y * l * i / 3, z: lean.z * y0 + d.z * l * i / 3 + Math.sin(a) * R * 0.5, r: R * 0.32 * (1 - 0.5 * i / 3) });
    tube(gb, pts, detail === 'hi' ? 5 : 3, () => colors.bark, { capTip: true, u0: BARK_U0, u1: BARK_U1, vPerMetre: 0.35, ex: ex0 });
  }
  // many tiers of shelf fungus
  const spine = [];
  for (let i = 0; i <= 8; i++) { const y = -0.5 + (H + 0.5) * i / 8; spine.push({ x: lean.x * y, y, z: lean.z * y, r: R * (1 + 0.5 * Math.exp(-Math.max(y, 0) * 1.5)) * 1.04 }); }
  sk.limbs.push({ pts: spine, level: 0 });
  addShelves(sk, rng, 3 + Math.floor(rng() * 4), [0.3, H * 0.75]);
  sk.limbs.length = 0;
  const g2 = meshSkeleton(sk, 'hi', colors, rng);
  return { geo: mergeGeos([gb.build(), g2]), height: H, trunkR: R * 1.15 };
}

function mergeGeos(list) {
  const gb = new GeoBuilder(['glow']);
  for (const g of list) {
    const base = gb.count;
    const P = g.attributes.position.array, N = g.attributes.normal.array, C = g.attributes.color.array, U = g.attributes.uv.array, G = g.attributes.glow.array;
    for (let i = 0; i < P.length / 3; i++) gb.vert(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], N[i * 3], N[i * 3 + 1], N[i * 3 + 2], C[i * 3], C[i * 3 + 1], C[i * 3 + 2], U[i * 2], U[i * 2 + 1], { glow: G[i] });
    const I = g.index.array; for (let i = 0; i < I.length; i++) gb.idx.push(I[i] + base);
  }
  return gb.build();
}

// ---------- Species ----------
const SPECIES = {
  deodand: { height: [13, 21], trunkR: [0.42, 0.75], trunkFrac: 0.62, trunkSegs: 10, taper: 0.55, flare: 0.9, wob: 0.16, crook: 0.18, lean: V(0, 0, 0), roots: 4,
    primary: [5, 8], primStart: 0.4, primEl: [-0.15, 0.75], primLen: [0.3, 0.5], childR: 0.62, childLen: 0.55, children: [2, 3], levels: 3, kink: 0.55, up: 0.35, droop: 0.4,
    wind: V(0, 0, 0), leafLevel: 2, leafChance: 0.85, leafSize: [1.8, 3.0], leader: true, moss: 0.45 },
  lone: { height: [6, 9.5], trunkR: [0.26, 0.42], trunkFrac: 0.55, trunkSegs: 8, taper: 0.5, flare: 0.6, wob: 0.12, crook: 0.12, lean: V(0.12, 0, 0.01), roots: 3,
    primary: [4, 6], primStart: 0.45, primEl: [-0.05, 0.45], primLen: [0.4, 0.6], childR: 0.6, childLen: 0.6, children: [2, 3], levels: 3, kink: 0.4, up: 0.1, droop: 0.2,
    wind: V(0.22, -0.02, 0.0), flag: true, leafLevel: 2, leafChance: 0.85, leafSize: [1.2, 2.2], leader: true },
  crooked: { height: [5, 10], trunkR: [0.22, 0.4], trunkFrac: 0.5, trunkSegs: 7, taper: 0.5, flare: 0.7, wob: 0.15, crook: 0.32, lean: V(0.05, 0, 0), roots: 3,
    primary: [4, 6], primStart: 0.35, primEl: [-0.1, 0.6], primLen: [0.35, 0.55], childR: 0.62, childLen: 0.6, children: [2, 3], levels: 3, kink: 0.7, up: 0.15, droop: 0.35,
    wind: V(0.08, 0, 0), leafLevel: 2, leafChance: 0.75, leafSize: [1.2, 2.2], leader: true, moss: 0.12 },
  thorn: { height: [1.8, 3.4], trunkR: [0.07, 0.13], trunkFrac: 0.15, trunkSegs: 3, taper: 0.3, flare: 0.3, wob: 0.2, crook: 0.4, lean: V(0.03, 0, 0), roots: 0,
    primary: [6, 9], primStart: 0.0, primEl: [0.05, 1.0], primLen: [0.5, 0.85], childR: 0.75, childLen: 0.6, children: [2, 4], levels: 3, kink: 1.0, up: 0.05, droop: 0.3,
    wind: V(0, 0, 0), leafLevel: 2, leafChance: 0.55, leafSize: [0.6, 1.0], fruit: 0.18, leader: false },
  medlar: { height: [3.6, 5.2], trunkR: [0.16, 0.26], trunkFrac: 0.32, trunkSegs: 5, taper: 0.35, flare: 0.5, wob: 0.18, crook: 0.3, lean: V(0, 0, 0), roots: 0,
    primary: [3, 5], primStart: 0.85, primEl: [0.25, 0.85], primLen: [0.45, 0.6], childR: 0.72, childLen: 0.55, children: [2, 3], levels: 3, kink: 0.75, up: 0.15, droop: 0.5,
    wind: V(0, 0, 0), leafLevel: 3, leafChance: 0.2, leafSize: [0.7, 1.1], fruit: 0.35, leader: false },
  giant: { height: [26, 33], trunkR: [1.5, 2.0], trunkFrac: 0.5, trunkSegs: 12, taper: 0.6, flare: 1.3, wob: 0.22, crook: 0.08, lean: V(0.03, 0, 0), roots: 8,
    primary: [7, 10], primStart: 0.45, primEl: [-0.1, 0.55], primLen: [0.32, 0.48], childR: 0.55, childLen: 0.55, children: [2, 3], levels: 3, kink: 0.45, up: 0.25, droop: 0.35,
    wind: V(0.02, 0, 0), leafLevel: 2, leafChance: 0.95, leafSize: [3.0, 5.0], leader: true, moss: 0.6 },
};

// A fallen trunk lying along +x, root plate at x=0, sitting on the ground.
function growFallen(rng) {
  const sk = { limbs: [], leaves: [], shelves: [], fruits: [], moss: [], height: 2, trunkR: 0 };
  const len = 8 + rng() * 7, R = 0.38 + rng() * 0.32;
  sk.trunkR = R; sk.len = len;
  const pts = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push({ x: t * len, y: R * 0.75 + Math.sin(t * 3) * 0.05, z: Math.sin(t * 2.3 + rng()) * 0.25, r: R * (1 - 0.45 * t), wob: 0.18 }); }
  sk.limbs.push({ pts, level: 0 });
  // the torn-up root plate
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + rng() * 0.5, l = R * (2 + rng() * 1.5);
    sk.limbs.push({ pts: [{ x: 0.2, y: R, z: 0, r: R * 0.4 }, { x: -0.3 - rng() * 0.4, y: R + Math.sin(a) * l * 0.6, z: Math.cos(a) * l * 0.6, r: R * 0.25 }, { x: -0.5 - rng() * 0.5, y: R + Math.sin(a) * l, z: Math.cos(a) * l, r: R * 0.08 }], level: 2, root: true });
  }
  // snapped limbs pointing up and sideways
  for (let k = 0; k < 4; k++) {
    const t = 0.3 + rng() * 0.65, b = pts[Math.round(t * 8)];
    const a = rng() * Math.PI, l = 0.8 + rng() * 2.2;
    const d = V(rng() - 0.5, Math.sin(a) * 0.9, Math.cos(a)).normalize();
    sk.limbs.push({ pts: [{ x: b.x, y: b.y, z: b.z, r: b.r * 0.4 }, { x: b.x + d.x * l * 0.5, y: b.y + d.y * l * 0.5, z: b.z + d.z * l * 0.5, r: b.r * 0.3 }, { x: b.x + d.x * l, y: b.y + d.y * l, z: b.z + d.z * l, r: b.r * 0.15 }], level: 1 });
  }
  // fungus shelves along the top and sides
  for (let k = 0; k < 5 + Math.floor(rng() * 5); k++) {
    const t = rng() * 0.9, b = pts[Math.floor(t * 8)];
    const a = (rng() - 0.5) * 2.4;
    const n = V(0, Math.sin(a) * 0.3, Math.cos(a) * (rng() < 0.5 ? 1 : -1)).normalize();
    sk.shelves.push({ p: V(b.x + (rng() - 0.5), b.y + n.y * b.r, b.z + n.z * b.r), n: V(n.x, 0, n.z).normalize(), s: 0.1 + rng() * 0.2 });
  }
  for (let k = 0; k < 3; k++) { const b = pts[1 + Math.floor(rng() * 6)]; sk.moss.push({ p: V(b.x, b.y, b.z), len: 0.4 + rng() * 0.5, w: 0.8, ang: rng() * 3 }); }
  return sk;
}

// A lichen-crusted mound: lumpy dome, dark peat with pale grey-green and orange crusts.
function meshMound(rng, detail) {
  const gb = new GeoBuilder(['glow']);
  const ex0 = { glow: 0 };
  const seg = detail === 'hi' ? 11 : 6, rings = detail === 'hi' ? 5 : 3;
  const bumps = [rng() * 6, rng() * 6, rng() * 6];
  const cPeat = lin('#2e2a20'), cMoss = lin('#3c4026'), cLich = lin('#8a9878'), cOr = lin('#9a5a26');
  const rows = [];
  for (let j = 0; j <= rings; j++) {
    const phi = (j / rings) * Math.PI / 2;
    const row = [];
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * Math.PI * 2;
      const n = 1 + 0.18 * Math.sin(a * 2 + bumps[0]) + 0.12 * Math.sin(a * 3 + bumps[1] + j) + 0.08 * Math.cos(phi * 4 + bumps[2]);
      const x = Math.cos(a) * Math.cos(phi) * n, z = Math.sin(a) * Math.cos(phi) * n, y = Math.sin(phi) * 0.55 * n - 0.12;
      const l = (Math.sin(a * 5 + j * 2.1 + bumps[0]) * 0.5 + 0.5) * Math.sin(phi + 0.3);
      let c = mixc(cPeat, cMoss, Math.sin(phi));
      c = mixc(c, cLich, smoothstep(0.35, 0.8, l) * 0.8);
      c = mixc(c, cOr, smoothstep(0.85, 0.98, Math.sin(a * 7 + j * 3.3 + bumps[1]) * 0.5 + 0.5) * 0.7);
      row.push(gb.vert(x, y, z, x, y + 0.3, z, c[0], c[1], c[2], BARK_U0 + (BARK_U1 - BARK_U0) * s / seg, phi * 0.6, ex0));
    }
    rows.push(row);
  }
  for (let j = 0; j < rings; j++) for (let s = 0; s < seg; s++) { const s1 = (s + 1) % seg; gb.quad(rows[j][s], rows[j][s1], rows[j + 1][s1], rows[j + 1][s]); }
  const g = gb.build();
  g.computeVertexNormals();
  return g;
}

export function buildTrees(ctx, ground, mats) {
  const rng = ctx.makeRng(4101);
  const { landmarks: L, quality } = ctx;
  const low = quality === 'low';
  const P = ctx.palette;
  const barkC = lin(P.bark);
  const base = { fruit: [0, 0, 0], inner: lin('#120c0a'), shelf: lin('#6a6048'), shelfRim: lin('#b8c8a0'), mossHang: lin('#3a4028') };
  const colorsFor = {
    deodand: { ...base, bark: mixc(barkC, [0, 0, 0], 0.25), barkTop: barkC, mossCol: lin('#26301a'), moss: 0.7, leaf: lin('#1a2214'), leafAlt: lin('#2a2614') },
    giant: { ...base, bark: lin('#2a221c'), barkTop: lin('#3a3028'), mossCol: lin('#2a3420'), moss: 0.8, leaf: lin('#1e2816'), leafAlt: lin('#4a2a14') },
    lone: { ...base, bark: barkC, barkTop: lin('#3a2c22'), mossCol: lin('#3a3a22'), moss: 0.3, leaf: lin('#3a3218'), leafAlt: lin(P.leafRust) },
    crooked: { ...base, bark: lin('#2e241c'), barkTop: lin('#40322a'), mossCol: lin('#34381e'), moss: 0.45, leaf: lin('#2a2c16'), leafAlt: lin('#5a3016') },
    thorn: { ...base, bark: lin('#241a16'), barkTop: lin('#2e221c'), mossCol: lin('#2e3020'), moss: 0.3, leaf: lin('#1e2414'), leafAlt: lin('#3a2814'), fruit: lin('#4a0c0a') },
    medlar: { ...base, bark: lin('#32261e'), barkTop: lin('#4a3a2e'), mossCol: lin('#4a4a30'), moss: 0.5, leaf: lin('#5a3418'), leafAlt: lin('#4a2a12'), fruit: lin('#2a0e10') },
    dead: { ...base, bark: lin('#3a3029'), barkTop: lin('#4a4038'), mossCol: lin('#2a3420'), moss: 0.6, leaf: [0, 0, 0], leafAlt: [0, 0, 0], shelf: lin('#7a6a4a'), shelfRim: lin('#c0d4a8'), inner: lin('#0e0806') },
  };

  // Variants: each with three detail levels
  const variants = []; // {hi, lo, far, height, trunkR}
  const make = (species, n) => {
    const ids = [];
    for (let v = 0; v < n; v++) {
      const vr = ctx.makeRng(5000 + variants.length * 31);
      const sk = growTree(vr, SPECIES[species]);
      if (species === 'deodand') addShelves(sk, vr, 1 + (v % 3), [0.4, 3.2]);
      if (species === 'giant') addShelves(sk, vr, 5, [1, 6]);
      const c = colorsFor[species];
      ids.push(variants.length);
      variants.push({ hi: meshSkeleton(sk, 'hi', c, vr), lo: meshSkeleton(sk, 'lo', c, vr), far: meshSkeleton(sk, 'far', c, vr), height: sk.height, trunkR: sk.trunkR, sk });
    }
    return ids;
  };
  const woodV = make('deodand', 4), loneV = make('lone', 3), crookV = make('crooked', 3), thornV = make('thorn', 3), medV = make('medlar', 3), giantV = make('giant', 2);
  const deadV = [];
  for (let v = 0; v < 3; v++) {
    const h = meshHollow(ctx.makeRng(6100 + v), colorsFor.dead, 'hi');
    const l = meshHollow(ctx.makeRng(6100 + v), colorsFor.dead, 'lo');
    deadV.push(variants.length); variants.push({ hi: h.geo, lo: l.geo, far: l.geo, height: h.height, trunkR: h.trunkR });
  }
  const fallenV = [];
  for (let v = 0; v < 3; v++) {
    const vr = ctx.makeRng(6200 + v);
    const sk = growFallen(vr);
    const c = colorsFor.deodand;
    fallenV.push(variants.length);
    variants.push({ hi: meshSkeleton(sk, 'hi', c, vr), lo: meshSkeleton(sk, 'lo', c, vr), far: meshSkeleton(sk, 'far', c, vr), height: 1.5, trunkR: sk.trunkR, len: sk.len });
  }
  const moundV = [];
  for (let v = 0; v < 3; v++) { const lo = meshMound(ctx.makeRng(6300 + v), 'lo'); moundV.push(variants.length); variants.push({ hi: meshMound(ctx.makeRng(6300 + v), 'hi'), lo, far: lo, height: 0.5, trunkR: 0.8 }); }

  // Placement ------------------------------------------------------------
  const trees = []; // {x,y,z, rot, s, v, tint, kind}
  const occ = new Map(); // spatial hash for spacing
  const key = (i, j) => i * 4096 + j;
  const near = (x, z, r) => {
    const i0 = Math.floor((x - r) / 8), i1 = Math.floor((x + r) / 8), j0 = Math.floor((z - r) / 8), j1 = Math.floor((z + r) / 8);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const list = occ.get(key(i, j)); if (!list) continue;
      for (const t of list) if ((t.x - x) ** 2 + (t.z - z) ** 2 < (r + t.gap) ** 2 * 0.25) return true;
    }
    return false;
  };
  const place = (x, z, v, s, gap, rot, tint, kind, collide = true) => {
    const y = ground.heightAt(x, z);
    const t = { x, y, z, v, s, gap, rot, tint, kind };
    trees.push(t);
    const k = key(Math.floor(x / 8), Math.floor(z / 8));
    if (!occ.has(k)) occ.set(k, []);
    occ.get(k).push(t);
    if (collide) ctx.addCollider({ x, z, r: variants[v].trunkR * s * 1.25 });
    return t;
  };
  const b = {};
  const openMoor = (x, z, margin) => {
    ground.biomeAt(x, z, b);
    if (b.wood > 0.1 || b.orchard > 0.1 || b.crystal > 0.2 || b.ice > 0.1 || b.marsh > 0.3 || b.rock > 0.4) return false;
    return !ground.excluded(x, z, margin);
  };
  // (a) The Deodand Wood: dense and dim
  const W = L.wood;
  const tries = low ? 4000 : 6000;
  let nearestByre = { d: Infinity, x: 0, z: 0 };
  for (let k = 0; k < tries; k++) {
    const a = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * (W.r + 20);
    const x = W.x + Math.cos(a) * rr, z = W.z + Math.sin(a) * rr;
    ground.biomeAt(x, z, b);
    if (b.wood < 0.2 || rng() > Math.pow(b.wood, 1.1) * 1.2) continue;
    if (ground.excluded(x, z, 2)) continue;
    const gap = (low ? 7.5 : 6.6) - b.wood * 2.6; // tighter in the heart
    if (near(x, z, gap)) continue;
    const s = 0.75 + rng() * 0.45 * (0.5 + b.wood);
    place(x, z, woodV[Math.floor(rng() * woodV.length)], s, gap, rng() * Math.PI * 2, 0.8 + rng() * 0.3, 'wood');
    const db = Math.hypot(x - L.byre.x, z - L.byre.z);
    if (db < nearestByre.d) nearestByre = { d: db, x, z };
  }
  // undergrowth in the wood: thorn thickets and fallen trunks
  for (let k = 0, n = 0; k < 2000 && n < (low ? 40 : 70); k++) {
    const a = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * (W.r + 10);
    const x = W.x + Math.cos(a) * rr, z = W.z + Math.sin(a) * rr;
    ground.biomeAt(x, z, b);
    if (b.wood < 0.3 || ground.excluded(x, z, 1) || near(x, z, 3)) continue;
    place(x, z, thornV[n % 3], 0.8 + rng() * 0.6, 3, rng() * 6.28, 0.7 + rng() * 0.2, 'thorn', false); n++;
  }
  const fallenSpots = [];
  for (let k = 0; k < 1500 && fallenSpots.length < (low ? 10 : 16); k++) {
    const a = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * W.r;
    const x = W.x + Math.cos(a) * rr, z = W.z + Math.sin(a) * rr;
    ground.biomeAt(x, z, b);
    const v = fallenV[fallenSpots.length % 3], len = variants[v].len;
    const rot = rng() * 6.28, dx = Math.cos(rot), dz = -Math.sin(rot); // object +x after rotation about y
    let ok = b.wood > 0.4;
    for (let t = 0; ok && t <= 1; t += 0.25) { const px = x + dx * len * t, pz = z + dz * len * t; if (ground.excluded(px, pz, 1) || ground.slopeAt(px, pz) > 0.35 || near(px, pz, 0.6)) ok = false; }
    if (!ok) continue;
    const t = place(x, z, v, 1, 0, rot, 0.85 + rng() * 0.2, 'fallen', false);
    t.fullTilt = true;
    for (let s = 0; s <= len; s += 1.6) ctx.addCollider({ x: x + dx * s, z: z + dz * s, r: variants[v].trunkR * 1.1, y: t.y - 1, h: variants[v].trunkR * 2 + 1 });
    fallenSpots.push(t);
  }
  // (b) lone wind-bent trees on the open moor, all leaning east
  let lone = 0;
  for (let k = 0; k < 1500 && lone < 24; k++) {
    const a = rng() * Math.PI * 2, rr = 60 + Math.sqrt(rng()) * 220;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (!openMoor(x, z, 6) || b.moor < 0.6 || b.shore > 0.1) continue;
    if (near(x, z, 40)) continue;
    place(x, z, loneV[lone % loneV.length], 0.85 + rng() * 0.4, 30, (rng() - 0.5) * 0.35, 0.85 + rng() * 0.25, 'lone');
    lone++;
  }
  // (b2) huge solitary trees with buttress roots: landmarks of their own
  const giants = [];
  for (let k = 0; k < 3000 && giants.length < 4; k++) {
    const a = rng() * Math.PI * 2, rr = 70 + Math.sqrt(rng()) * 200;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (!openMoor(x, z, 14) || ground.slopeAt(x, z) > 0.2) continue;
    if (giants.some((g) => Math.hypot(g.x - x, g.z - z) < 140) || near(x, z, 30) || Math.hypot(x - W.x, z - W.z) < W.r + 40) continue;
    giants.push(place(x, z, giantV[giants.length % 2], 0.95 + rng() * 0.2, 30, rng() * 6.28, 0.9 + rng() * 0.15, 'giant'));
  }
  // (b3) copses of two to five crooked trees every 40-60 m across the moor, with thorn and mounds
  let copses = 0, thickets = 0, mounds = 0;
  const CS = 50;
  for (let gz = -300; gz < 300; gz += CS) for (let gx = -300; gx < 300; gx += CS) {
    const cx = gx + CS / 2 + (rng() - 0.5) * CS * 0.7, cz = gz + CS / 2 + (rng() - 0.5) * CS * 0.7;
    if (!openMoor(cx, cz, 5) || cx * cx + cz * cz > 285 * 285) continue;
    const kindR = rng();
    if (kindR < 0.62) { // copse
      const n = 2 + Math.floor(rng() * 4);
      let placed = 0;
      for (let i = 0; i < n * 3 && placed < n; i++) {
        const x = cx + (rng() - 0.5) * 14, z = cz + (rng() - 0.5) * 14;
        if (!openMoor(x, z, 4) || near(x, z, 4)) continue;
        place(x, z, crookV[Math.floor(rng() * 3)], 0.75 + rng() * 0.5, 4, rng() * 6.28, 0.8 + rng() * 0.3, 'copse'); placed++;
      }
      for (let i = 0; i < 3; i++) { // thorn understorey
        const x = cx + (rng() - 0.5) * 16, z = cz + (rng() - 0.5) * 16;
        if (openMoor(x, z, 4) && !near(x, z, 2)) place(x, z, thornV[Math.floor(rng() * 3)], 0.7 + rng() * 0.5, 2.5, rng() * 6.28, 0.7 + rng() * 0.25, 'thorn', false);
      }
      if (placed) copses++;
    } else if (kindR < 0.85) { // thorn thicket
      const n = 4 + Math.floor(rng() * 6);
      for (let i = 0; i < n; i++) {
        const x = cx + (rng() - 0.5) * 9, z = cz + (rng() - 0.5) * 9;
        if (openMoor(x, z, 4) && !near(x, z, 1.8)) place(x, z, thornV[Math.floor(rng() * 3)], 0.8 + rng() * 0.6, 1.8, rng() * 6.28, 0.7 + rng() * 0.25, 'thorn', false);
      }
      thickets++;
    }
    // lichen mounds scattered through every cell
    const nm = 1 + Math.floor(rng() * 4);
    for (let i = 0; i < nm; i++) {
      const x = gx + rng() * CS, z = gz + rng() * CS;
      if (!openMoor(x, z, 2) || near(x, z, 2)) continue;
      const s = 0.6 + Math.pow(rng(), 1.5) * 2.2;
      const t = place(x, z, moundV[Math.floor(rng() * 3)], s, 2, rng() * 6.28, 0.8 + rng() * 0.3, 'mound', false);
      t.sy = s * (0.5 + rng() * 0.6); t.fullTilt = true;
      if (s > 1.3) ctx.addCollider({ x, z, r: s * 0.75, y: t.y - 1, h: t.sy * 0.45 + 1 });
      mounds++;
    }
  }
  // (c) Medlar Close: old rows on a skewed grid, gaps where trees have died
  const O = L.orchard, sp = 8.5, rotO = 0.32;
  for (let i = -7; i <= 7; i++) for (let j = -7; j <= 7; j++) {
    const lx = i * sp + (rng() - 0.5) * 1.6, lz = j * sp * 0.9 + (rng() - 0.5) * 1.6;
    const x = O.x + lx * Math.cos(rotO) - lz * Math.sin(rotO), z = O.z + lx * Math.sin(rotO) + lz * Math.cos(rotO);
    if (Math.hypot(x - O.x, z - O.z) > O.r - 4) continue;
    if (rng() < 0.16) continue; // a gap
    if (ground.excluded(x, z, 1)) continue;
    const dead = rng() < 0.12;
    place(x, z, dead ? deadV[Math.floor(rng() * deadV.length)] : medV[Math.floor(rng() * medV.length)], dead ? 0.5 + rng() * 0.2 : 0.85 + rng() * 0.3, 7, rng() * Math.PI * 2, 0.85 + rng() * 0.3, 'orchard');
  }
  // (d) dead hollow trunks near the sunken court and the fen edge
  const deadSpots = [];
  for (let k = 0; k < 400 && deadSpots.length < 5; k++) {
    const a = rng() * Math.PI * 2, rr = 23 + rng() * 22;
    const x = L.court.x + Math.cos(a) * rr, z = L.court.z + Math.sin(a) * rr;
    if (ground.excluded(x, z, 1) || near(x, z, 10)) continue;
    deadSpots.push(place(x, z, deadV[deadSpots.length % deadV.length], 0.9 + rng() * 0.4, 10, rng() * 6.28, 0.9 + rng() * 0.2, 'dead'));
  }
  for (let k = 0, n = 0; k < 600 && n < 7; k++) {
    const a = rng() * Math.PI * 2, rr = L.fen.r - 14 + rng() * 26;
    const x = L.fen.x + Math.cos(a) * rr, z = L.fen.z + Math.sin(a) * rr;
    if (ground.excluded(x, z, 1) || near(x, z, 12) || ground.waterDepth(x, z) > -0.3) continue;
    deadSpots.push(place(x, z, deadV[n % deadV.length], 0.8 + rng() * 0.5, 12, rng() * 6.28, 0.9 + rng() * 0.2, 'dead')); n++;
  }

  // BatchedMesh -------------------------------------------------------------
  let vtx = 0, idx = 0;
  for (const v of variants) for (const g of new Set([v.hi, v.lo, v.far])) { vtx += g.attributes.position.count; idx += g.index.count; }
  const batch = makeBatch(ctx, trees.length + 8, vtx, idx, mats.tree); // instanced stand-in without multi-draw (batch.js)
  const gid = variants.map((v) => { const hi = batch.addGeometry(v.hi), lo = batch.addGeometry(v.lo); return [v.far === v.lo ? lo : batch.addGeometry(v.far), lo, hi]; });
  const lodSet = []; for (const g of gid) for (const k of g) lodSet[k] = g;
  batch.lodSets = (k) => lodSet[k];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color();
  const nrm = { x: 0, y: 1, z: 0 }, up = new THREE.Vector3(0, 1, 0), tilt = new THREE.Quaternion(), yawQ = new THREE.Quaternion();
  for (const t of trees) {
    ground.normalAt(t.x, t.z, nrm);
    // trees grow up, not along the slope: only a slight tilt toward the ground normal (logs and mounds lie on it)
    const k = t.fullTilt ? 1 : 0.25;
    tilt.setFromUnitVectors(up, new THREE.Vector3(nrm.x * k, nrm.y, nrm.z * k).normalize());
    yawQ.setFromAxisAngle(up, t.rot);
    q.copy(tilt).multiply(yawQ);
    pos.set(t.x, t.y - (t.kind === 'mound' ? 0 : 0.05), t.z); sc.set(t.s, t.sy || t.s, t.s);
    m4.compose(pos, q, sc);
    t.id = batch.addInstance(gid[t.v][0]);
    t.lod = 0;
    batch.setMatrixAt(t.id, m4);
    col.setRGB(t.tint, t.tint * (0.95 + 0.05 * t.tint), t.tint * 0.95);
    batch.setColorAt(t.id, col);
    // LOD distance scale: big things keep detail further out, small things drop it sooner
    t.lodK = t.kind === 'giant' ? 2.2 : t.kind === 'lone' || t.kind === 'dead' ? 1.5 : t.kind === 'thorn' || t.kind === 'mound' ? 0.6 : 1;
  }
  batch.castShadow = true; batch.receiveShadow = true;
  batch.name = 'veg-trees';
  batch.build?.();
  ctx.scene.add(batch);

  // LOD by distance with hysteresis: 0 far, 1 mid, 2 near. No allocation.
  const HI = low ? 18 : 24, MID = low ? 55 : 72, HYS = 4;
  function update(px, pz) {
    batch.sortFrom?.(px, pz);
    for (let i = 0; i < trees.length; i++) {
      const t = trees[i];
      const d = Math.sqrt((t.x - px) ** 2 + (t.z - pz) ** 2) / t.lodK;
      let want = d < HI ? 2 : d < MID ? 1 : 0;
      if (want < t.lod) { if (t.lod === 2 && d < HI + HYS) want = 2; else if (d < MID + HYS) want = Math.max(want, 1); }
      if (want !== t.lod) { t.lod = want; batch.setGeometryIdAt(t.id, gid[t.v][want]); }
    }
  }

  const tris = (g) => g.index.count / 3;
  const count = (k) => trees.filter((t) => t.kind === k).length;
  const stats = {
    instances: trees.length, wood: count('wood'), lone, copses, copseTrees: count('copse'), thickets, thorns: count('thorn'), giants: giants.length, fallen: fallenSpots.length, mounds,
    orchard: count('orchard'), dead: deadSpots.length,
    trisHiLoFar: variants.map((v) => `${tris(v.hi)}/${tris(v.lo)}/${tris(v.far)}`).join(' '),
    woodNearestByre: { d: +nearestByre.d.toFixed(1), x: +nearestByre.x.toFixed(1), z: +nearestByre.z.toFixed(1) },
    giantsAt: giants.map((g) => `${g.x.toFixed(0)},${g.z.toFixed(0)}`).join(' '),
  };
  return { trees, batch, update, stats, deadSpots, fallenSpots, giants };
}

// ---------- Toadstools ----------
function toadstoolGeo() {
  const gb = new GeoBuilder(['glow']);
  const stem = lin('#c8bca0'), cap = lin('#8a6a48'), gill = lin('#d8e0c0');
  const pts = [{ x: 0, y: -0.05, z: 0, r: 0.07 }, { x: 0.02, y: 0.4, z: 0, r: 0.06 }, { x: 0.05, y: 0.82, z: 0, r: 0.05 }];
  tube(gb, [pts[0], pts[2]], 5, (i) => mixc(stem, [0.3, 0.25, 0.2], i === 0 ? 0.5 : 0), { capTip: false, u0: 0.02, u1: 0.4, ex: { glow: 0.1 } });
  // cap: dome rings
  const R = 0.32, top = 0.98, base = 0.8, segs = 6;
  const ringAt = (rr, y, col, glow, ny) => {
    const out = [];
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      out.push(gb.vert(0.05 + Math.cos(a) * rr, y, Math.sin(a) * rr, Math.cos(a) * (1 - ny), ny, Math.sin(a) * (1 - ny), col[0], col[1], col[2], 0.1, 0.1, { glow }));
    }
    return out;
  };
  const r0 = ringAt(R, base, cap, 0.2, 0.2), r1 = ringAt(R * 0.7, base + 0.13, cap, 0.1, 0.7);
  const apex = gb.vert(0.05, top, 0, 0, 1, 0, cap[0] * 0.8, cap[1] * 0.8, cap[2] * 0.8, 0.1, 0.1, { glow: 0.05 });
  for (let s = 0; s < segs; s++) {
    const s1 = (s + 1) % segs;
    gb.quad(r0[s], r0[s1], r1[s1], r1[s]);
    gb.tri(r1[s], r1[s1], apex);
  }
  // gills: underside, glowing
  const gc = gb.vert(0.05, base + 0.02, 0, 0, -1, 0, gill[0], gill[1], gill[2], 0.1, 0.1, { glow: 1 });
  const r2 = ringAt(R * 0.98, base - 0.01, gill, 1, -0.9);
  for (let s = 0; s < segs; s++) gb.tri(gc, r2[s], r2[(s + 1) % segs]);
  return gb.build();
}

// Seed-pod stalk: a curved stem with drooping bulbs that glow.
function podGeo() {
  const gb = new GeoBuilder(['glow']);
  const stem = lin('#3a3a24'), pod = lin('#c8d890');
  const pts = [];
  for (let i = 0; i <= 4; i++) { const t = i / 4; pts.push({ x: Math.sin(t * 2.2) * 0.25, y: t, z: 0, r: 0.025 * (1 - 0.6 * t) }); }
  tube(gb, pts.filter((_, i) => i % 2 === 0), 3, () => stem, { capTip: false, u0: 0.02, u1: 0.4, ex: { glow: 0 } });
  for (let k = 0; k < 4; k++) {
    const t = 0.6 + k * 0.11, px = Math.sin(t * 2.2) * 0.25 + (k % 2 ? 0.07 : -0.07), py = t - 0.08, pz = (k % 3 - 1) * 0.06;
    const r = 0.035 + 0.012 * (k % 3);
    const v = [[r, 0, 0], [-r, 0, 0], [0, r * 0.9, 0], [0, -r * 2, 0], [0, 0, r], [0, 0, -r]].map(([x, y, z]) => {
      const l = Math.hypot(x, y, z);
      return gb.vert(px + x, py + y, pz + z, x / l, y / l, z / l, pod[0], pod[1], pod[2], 0.1, 0.1, { glow: y < 0 ? 1 : 0.6 });
    });
    for (const [a, b, c] of [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [4, 3, 0], [1, 3, 4], [5, 3, 1], [0, 3, 5]]) gb.tri(v[a], v[b], v[c]);
  }
  return gb.build();
}

// Split small instanced things into 100 m grid groups so far groups are skipped.
const GROUP = 100;
function instGroups(ctx, geo, mat, items, fill, name) {
  const by = new Map();
  for (const it of items) { const k = `${Math.floor(it.x / GROUP)},${Math.floor(it.z / GROUP)}`; if (!by.has(k)) by.set(k, []); by.get(k).push(it); }
  const groups = [];
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  for (const [k, list] of by) {
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => { fill(it, m4, col); mesh.setMatrixAt(i, m4); mesh.setColorAt(i, col); });
    mesh.computeBoundingSphere();
    mesh.receiveShadow = true; mesh.castShadow = false;
    mesh.name = name;
    const [gx, gz] = k.split(',').map(Number);
    groups.push({ mesh, x0: gx * GROUP, z0: gz * GROUP });
    ctx.scene.add(mesh);
  }
  return groups;
}

export function buildToadstools(ctx, ground, mats, trees) {
  const rng = ctx.makeRng(4207);
  const { landmarks: L, quality } = ctx;
  const spots = [];
  const b = {};
  const clusters = quality === 'low' ? 110 : 220;
  // wood floor: mostly near trunks; fen edges: on the drier hummocks; dead trunks always get some
  const woodTrees = trees.trees.filter((t) => t.kind === 'wood');
  for (let k = 0; k < clusters; k++) {
    let cx, cz;
    const r = rng();
    if (r < 0.62 && woodTrees.length) {
      const t = woodTrees[Math.floor(rng() * woodTrees.length)];
      const a = rng() * Math.PI * 2, d = 0.9 + rng() * 2.5; cx = t.x + Math.cos(a) * d; cz = t.z + Math.sin(a) * d;
    } else if (r < 0.8) {
      const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * L.wood.r; cx = L.wood.x + Math.cos(a) * d; cz = L.wood.z + Math.sin(a) * d;
      ground.biomeAt(cx, cz, b); if (b.wood < 0.4) continue;
    } else if (r < 0.9 && trees.deadSpots.length) {
      const t = trees.deadSpots[Math.floor(rng() * trees.deadSpots.length)];
      const a = rng() * Math.PI * 2, d = 0.9 + rng() * 1.5; cx = t.x + Math.cos(a) * d; cz = t.z + Math.sin(a) * d;
    } else {
      const a = rng() * Math.PI * 2, d = L.fen.r - 20 + rng() * 30; cx = L.fen.x + Math.cos(a) * d; cz = L.fen.z + Math.sin(a) * d;
    }
    const n = 3 + Math.floor(rng() * 9);
    for (let i = 0; i < n; i++) {
      const x = cx + (rng() - 0.5) * 1.4, z = cz + (rng() - 0.5) * 1.4;
      if (ground.excluded(x, z) || ground.waterDepth(x, z) > -0.1) continue;
      spots.push({ x, z, s: (0.06 + Math.pow(rng(), 2.2) * 0.26) * (i === 0 ? 1.4 : 1), tilt: (rng() - 0.5) * 0.4, rot: rng() * 6.28, hue: rng() });
    }
  }
  const geo = toadstoolGeo();
  const q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
  const tints = [lin('#e0d0b0'), lin('#c8a860'), lin('#9a5a3a'), lin('#d8d8c0')];
  const groups = instGroups(ctx, geo, mats.fungus, spots, (s, m4, col) => {
    pos.set(s.x, ground.heightAt(s.x, s.z), s.z);
    e.set(s.tilt, s.rot, s.tilt * 0.5); q.setFromEuler(e);
    sc.set(s.s * (0.8 + s.hue * 0.4), s.s, s.s * (0.8 + s.hue * 0.4));
    m4.compose(pos, q, sc);
    const t = tints[Math.floor(s.hue * 4) % 4]; col.setRGB(t[0], t[1], t[2]);
  }, 'veg-toadstools');

  // seed-pods: stands of glowing pods in the wood, by fallen trunks, on the fen edge and around mounds
  const pods = [];
  const mounds = trees.trees.filter((t) => t.kind === 'mound');
  const nPod = quality === 'low' ? 50 : 95;
  for (let k = 0; k < nPod; k++) {
    let cx, cz; const r = rng();
    if (r < 0.4) { const a = rng() * 6.28, d = Math.sqrt(rng()) * L.wood.r; cx = L.wood.x + Math.cos(a) * d; cz = L.wood.z + Math.sin(a) * d; }
    else if (r < 0.55 && trees.fallenSpots.length) { const t = trees.fallenSpots[Math.floor(rng() * trees.fallenSpots.length)]; cx = t.x + (rng() - 0.5) * 6; cz = t.z + (rng() - 0.5) * 6; }
    else if (r < 0.8) { const a = rng() * 6.28, d = L.fen.r - 25 + rng() * 35; cx = L.fen.x + Math.cos(a) * d; cz = L.fen.z + Math.sin(a) * d; }
    else if (mounds.length) { const t = mounds[Math.floor(rng() * mounds.length)]; const a = rng() * 6.28, d = t.s + 0.4; cx = t.x + Math.cos(a) * d; cz = t.z + Math.sin(a) * d; }
    else continue;
    const n = 2 + Math.floor(rng() * 6);
    for (let i = 0; i < n; i++) {
      const x = cx + (rng() - 0.5) * 1.6, z = cz + (rng() - 0.5) * 1.6;
      if (ground.excluded(x, z) || ground.waterDepth(x, z) > -0.1) continue;
      pods.push({ x, z, s: 0.5 + rng() * 0.8, rot: rng() * 6.28, tilt: (rng() - 0.5) * 0.3, hue: rng() });
    }
  }
  const pg = podGeo();
  const podT = [lin('#d0e0a0'), lin('#a0d0c0'), lin('#e0c890')];
  groups.push(...instGroups(ctx, pg, mats.fungus, pods, (s, m4, col) => {
    pos.set(s.x, ground.heightAt(s.x, s.z) - 0.02, s.z);
    e.set(s.tilt, s.rot, -s.tilt); q.setFromEuler(e); sc.setScalar(s.s);
    m4.compose(pos, q, sc);
    const t = podT[Math.floor(s.hue * 3) % 3]; col.setRGB(t[0], t[1], t[2]);
  }, 'veg-pods'));
  const VIS = 90;
  function update(px, pz) {
    for (const g of groups) {
      const dx = Math.max(g.x0 - px, 0, px - g.x0 - GROUP), dz = Math.max(g.z0 - pz, 0, pz - g.z0 - GROUP);
      g.mesh.visible = dx * dx + dz * dz < VIS * VIS;
    }
  }
  return { update, groups: groups.length, count: spots.length, pods: pods.length, tris: geo.index.count / 3 * spots.length + pg.index.count / 3 * pods.length };
}

// ---------- Materials ----------
// Shared glow uniform: emissive ∝ (1 - flicker), faint in steady light.
export function makeTreeMaterials(ctx, atlas) {
  const glow = { value: 0.1 };
  const glowCol = { value: new THREE.Color(ctx.palette.wisp) };
  const patchGlow = (shader) => {
    shader.uniforms.uGlow = glow; shader.uniforms.uGlowCol = glowCol;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float glow; varying float vGlow;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = glow;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uGlow; uniform vec3 uGlowCol; varying float vGlow;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uGlowCol * vGlow * vGlow * uGlow;');
  };
  const tree = new THREE.MeshStandardMaterial({ vertexColors: true, map: atlas, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.93, metalness: 0 });
  tree.onBeforeCompile = (shader) => { patchGlow(shader); unflipNormals(shader); fogBatchFix(shader); };
  tree.customProgramCacheKey = () => 'fp-veg-tree';
  const fungus = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0, side: THREE.DoubleSide });
  fungus.onBeforeCompile = (shader) => { patchGlow(shader); unflipNormals(shader); };
  fungus.customProgramCacheKey = () => 'fp-veg-fungus';
  return { tree, fungus, glow };
}
