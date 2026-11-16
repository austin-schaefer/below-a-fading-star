// A house in a Noonwright carrier (v15-V1): one of the great vessels that carried a measure of noon, stalled here
// when the line failed, and far too big to be a house: somebody moved into the ruin. Blown whole and glazed in a
// field (celadon or ox-blood) with a band brushed round it, the shoulder amber glass; now crazed, cracked from a
// great scar where the glaze has come away in a sheet to the milk body, and that is where the noon it still holds
// comes out, by day a paler patch, in the gutter the brightest thing in the street. Lime crusts its foot, soot runs up
// it from the stovepipe and the door, a hole in it is boarded over. The door is a ragged cut with a frame of planks
// knocked into it. Three forms, three silhouettes:
//   'standing'  on its tail as it was fired and slumped since: above the room it leans hard, shored with raw poles
//   'broken'    the same, broken off above the room: a cup with a jagged rim, open to the sky, its shards beside it
//   'lying'     on its side along the plot (a plot at least 8 m wide and 1.8 times as wide as deep takes this form):
//               a door cut in its belly, a chimney through its shoulder, the great ring fallen at its nose
// Entered, all three: the wall glows where the scar is; a bed, a hearth, shelves on the curve, a flask of noon.
// o: seed, w (8), d (7), form, profile ('long' | 'waist' | 'gourd': the vessel's own shape), glaze (0..3, GLAZES),
// lit (0..1: 0.8), low. Needs 5 x 4.2 ('lying': 8 x 4.2); less throws.
import * as THREE from 'three';
import { GLAZES, formAt, NOON_PARTS } from '../../v8/strata/noon.js';
import { L, H, V, N, PARTS, CLOTHS, rngOf, pick, ch, worn, site, beam, pot, plate, addPainted, bed, washing } from './kit.js';

const PROFILES = ['long', 'waist', 'gourd']; // (a 'drop', fat at the nose, has no room at its foot)
export const CARRIER_FORMS = ['standing', 'broken', 'lying'];
const TH = 0.17; // the wall's thickness

export function carrier(B, M, o = {}) {
  const seed = o.seed | 0, rng = rngOf(seed, 3), w = o.w ?? 8, d = o.d ?? 7, low = !!o.low, g0 = M.elements[13], lit = o.lit ?? 0.8;
  if (w < 5 || d < 4.2) throw new Error(`carrier: a plot ${w} x ${d} m is too small (5 x 4.2)`);
  let form = o.form || (w >= 8 && w >= d * 1.8 ? 'lying' : seed % 3 === 1 ? 'broken' : 'standing');
  if (form === 'lying' && w < 8) form = 'standing';
  // (upright, it stands 0.3 m forward of its plot's middle: a plot is as deep as a house, and it is not a house)
  const M0 = M; if (form !== 'lying') M = ch(M, 0, 0, 0.3);
  const R = site(M, 'carrier', { seed, w, d }), base = B.triangles; R.form = form; R.plot.x = M0.elements[12]; R.plot.z = M0.elements[14];
  const profile = o.profile || PROFILES[seed % PROFILES.length], G = GLAZES[(o.glaze ?? seed) % GLAZES.length];
  const lying = form === 'lying', broken = form === 'broken', side = rng() < 0.5 ? -1 : 1;
  const ni = low ? 28 : 32, da = (Math.PI * 2) / ni;
  const hash = (a) => { const v = Math.sin(a * 127.1 + seed * 3.3) * 43758.5453; return v - Math.floor(v); };
  const set = (out, C, k = 1) => { out.r = C.r * k; out.g = C.g * k; out.b = C.b * k; };
  const mix = (out, C, k) => { out.r += (C.r - out.r) * k; out.g += (C.g - out.g) * k; out.b += (C.b - out.b) * k; };
  const wrap = (a) => a - Math.round(a / (Math.PI * 2)) * Math.PI * 2;
  const glass = (col, k = 0) => ({ color: col, moss: 0.05, wet: 0.45, ground: g0 - 3, emit: k ? [N.light[0] * k, N.light[1] * k, N.light[2] * k, 1] : undefined });
  const wood = () => ({ color: worn(L.wood, rng, 0.25, 0.2), moss: 0.08, ground: g0 - 1 });
  const dim = (col, k = 0.05) => ({ color: col, moss: 0, ground: g0 - 3, emit: [col.r * k, col.g * k, col.b * k, 1] }); // (a thing indoors, seen by the wall's light)

  // ---- the vessel, in its own measure: s along it from the tail's rim, a round it
  let Rr, Lh, body, S, P, sAt, soots = [], sootsIn = [], scar, bare;
  const rad = (s) => (s <= body ? Rr * formAt(profile, s / body) : Rr * formAt(profile, 1) * (s > Lh - 0.3 ? 1.24 : 1.02));
  // shells over the cells of the grid that are not `open`; a quad through the wall's thickness at every edge of an
  // opening; each made to face the way it is seen from
  const shell = (inner, j0, j1, open) => {
    const pos = [], idx = [], meta = [];
    for (let j = j0; j <= j1; j++) for (let i = 0; i < ni; i++) { pos.push(...P(i, j, inner)); meta.push([(i - 0.5) * da, sAt(i, j)]); }
    let flip = null;
    for (let j = j0; j < j1; j++) for (let i = 0; i < ni; i++) {
      if (open(i, j)) continue;
      const a = (j - j0) * ni + i, b = (j - j0) * ni + ((i + 1) % ni), c2 = a + ni, e = b + ni;
      if (flip === null) { // which winding looks out (in, for the inner shell): asked of the first cell
        const pa = new THREE.Vector3(...P(i, j, inner)), pb = new THREE.Vector3(...P(i + 1, j, inner)), pc = new THREE.Vector3(...P(i, j + 1, inner));
        const n = pb.sub(pa).cross(pc.sub(pa)), out = new THREE.Vector3(...P(i, j, false)).sub(new THREE.Vector3(...P(i, j, true)));
        flip = n.dot(out) < 0 !== inner;
      }
      if (flip) idx.push(a, c2, b, b, c2, e); else idx.push(a, b, c2, b, e, c2);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    return { g, meta };
  };
  const reveal = (open, j0, j1, o2) => {
    const pos = [], cen = new THREE.Vector3(), q = new THREE.Vector3(), n = new THREE.Vector3(), v = [0, 1, 2, 3].map(() => new THREE.Vector3());
    for (let j = j0; j < j1; j++) for (let i = 0; i < ni; i++) {
      if (!open(i, j)) continue;
      cen.set(0, 0, 0); for (const [di, dj] of [[0, 0], [1, 0], [0, 1], [1, 1]]) cen.add(q.set(...P(i + di, j + dj, false)));
      cen.multiplyScalar(0.25);
      for (const [ni2, nj, e0, e1] of [[i - 1, j, [0, 0], [0, 1]], [i + 1, j, [1, 0], [1, 1]], [i, j - 1, [0, 0], [1, 0]], [i, j + 1, [0, 1], [1, 1]]]) {
        if (nj >= j0 && nj < j1 && open((ni2 + ni) % ni, nj)) continue;
        v[0].set(...P(i + e0[0], j + e0[1], false)); v[1].set(...P(i + e1[0], j + e1[1], false)); v[2].set(...P(i + e1[0], j + e1[1], true)); v[3].set(...P(i + e0[0], j + e0[1], true));
        n.copy(v[1]).sub(v[0]).cross(q.copy(v[2]).sub(v[0]));
        const order = n.dot(q.copy(cen).sub(v[0])) > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
        for (const k of order) pos.push(v[k].x, v[k].y, v[k].z);
      }
    }
    if (!pos.length) return;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); B.add(g, M, o2);
  };
  // a point on the skin at (a, s), lifted off it
  let skin;
  // the same on the skin as it is drawn: straight between the stations S, where the true curve bellies out of them
  const onMesh = (a, s, lift) => { let j = 0; while (j < S.length - 2 && S[j + 1] < s) j++; const t = Math.max(0, Math.min(1, (s - S[j]) / (S[j + 1] - S[j]))), p = skin(a, S[j], lift), q = skin(a, S[j + 1], lift); return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]; };
  // a line laid on the skin through points [[a, s], ...]: a crack, a run of soot
  const lineOn = (pts, wid, o2, lift = 0.012) => {
    const pos = [], p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), n = new THREE.Vector3(), sd = new THREE.Vector3();
    for (let i = 1; i < pts.length; i++) {
      p0.set(...onMesh(pts[i - 1][0], pts[i - 1][1], lift)); p1.set(...onMesh(pts[i][0], pts[i][1], lift));
      n.set(...onMesh(pts[i][0], pts[i][1], lift + 0.3)).sub(p1).normalize(); sd.copy(p1).sub(p0).cross(n).normalize().multiplyScalar(wid / 2);
      const a = [p0.x - sd.x, p0.y - sd.y, p0.z - sd.z], b = [p1.x - sd.x, p1.y - sd.y, p1.z - sd.z], c2 = [p1.x + sd.x, p1.y + sd.y, p1.z + sd.z], e = [p0.x + sd.x, p0.y + sd.y, p0.z + sd.z];
      pos.push(...a, ...c2, ...b, ...a, ...e, ...c2);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); B.add(g, M, o2);
  };
  // the glaze at (a, s): the foot bare and crusted with lime, the field, the band and its drips, the amber shoulder;
  // the scar, where it is gone to the milk body and the light gets out; soot above every fire and the door
  const drip = (a, k) => { const u = ((a / (Math.PI * 2)) % 1 + 1) % 1 * 27, f = u - Math.floor(u), hh = hash(Math.floor(u) + k * 17); return hh > 0.6 ? Math.sin(f * Math.PI) ** 2 * (hh - 0.5) * 2 : 0; };
  const tb = 0.5 + rng() * 0.08;
  const inScar = (a, s) => { const t = (s - scar.s0) / (scar.s1 - scar.s0); if (t <= 0 || t >= 1) return 0; const wA = scar.w * Math.sin(Math.PI * t) ** 0.6 * (0.7 + 0.6 * B.n3(a * 2.1 + seed, s * 0.9, 3.3)); return 1 - Math.abs(wrap(a - scar.a)) / Math.max(0.05, wA); };
  const sootAt = (a, s, list = soots) => { let k = 0; for (const q of list) { const ds2 = (s - q.s) * q.dir, da2 = Math.abs(wrap(a - q.a)); if (ds2 > -0.2 && ds2 < q.len && da2 < q.w) k = Math.max(k, q.k * (1 - ds2 / q.len) * (1 - da2 / q.w)); } return k; };
  const paintAt = (a, s, out) => {
    const t = s / body, tone = 0.9 + 0.2 * hash(Math.round(s * 7) + 0.5), sc = inScar(a, s);
    const chip = 0.8 * B.n3(a * 1.9 + seed, s * 0.34, 1.7) + 0.6 * B.n3(a * 5.5, s * 1.1 + seed, 0.2);
    let glow = 0.05;
    if (s > body + 0.2) set(out, G[2], tone * 0.8);
    else if (sc > 0 || chip > 0.8) { set(out, N.milk, tone * (0.86 + 0.1 * Math.min(1, Math.max(0, sc) * 3))); glow = sc > 0 ? 0.3 + 0.25 * Math.min(1, sc * 2.5) : 0.2; }
    else if (bare(a, s) || t < 0.085 + 0.04 * drip(a, 1)) { set(out, N.milk, tone * 0.8); mix(out, V.lime, 0.75 * Math.min(1, 0.5 + B.n3(a * 3.1, s * 2.2, seed))); glow = 0.03; }
    else if (t > tb - 0.07 - 0.09 * drip(a, 2) && t < tb + 0.06) { set(out, G[1], tone); mix(out, V.dirt, 0.22); glow = 0.03; }
    else if (t > 0.86 - 0.05 * drip(a, 4)) { set(out, G[2], tone); glow = 0.12; }
    else { set(out, G[0], tone * (0.94 + 0.08 * Math.sin(a * 3 + seed))); mix(out, V.dirt, 0.12 + 0.14 * B.n3(a * 1.2, s * 0.5, seed + 9)); }
    const k = sootAt(a, s); if (k > 0) { mix(out, V.soot, Math.min(0.85, k)); glow *= 1 - Math.min(0.85, k); }
    out.e = lit * glow;
  };
  // the same wall from inside: the milk body, warm; bright where the scar is, the glaze's colour dim through it
  // elsewhere, soot over the hearth
  const paintIn = (a, s, out) => {
    const sc = inScar(a, s), t = s / body;
    set(out, N.milk, 0.74 + 0.1 * B.n3(a * 2.3, s * 0.8, seed + 4));
    mix(out, t > tb - 0.07 && t < tb + 0.06 ? G[1] : G[0], sc > 0 ? 0 : 0.22);
    const k = sootAt(a, s, sootsIn); if (k > 0) mix(out, V.soot, Math.min(0.7, k * 0.8));
    out.e = lit * (sc > 0 ? 0.42 + 0.3 * Math.min(1, sc * 2.5) : 0.1 + 0.05 * B.n3(a * 1.3, s * 0.4, seed)) * (1 - Math.min(0.7, k * 0.8));
  };
  const painted = (sh, o2, fn) => { let k = 0; addPainted(B, sh.g, M, o2, (x, y, z, out) => { const m = sh.meta[k++]; fn(m[0], m[1], out); }); };
  // cracks run out from the scar's edge, forking; a board nailed over a hole, lime daubed round it
  const cracks = () => {
    const nc = low ? 3 : 7, dark = { color: V.soot.clone().lerp(G[0], 0.2), moss: 0, ground: g0 - 3 };
    for (let c = 0; c < nc; c++) {
      const t0 = 0.12 + 0.76 * ((c + rng() * 0.6) / nc), sgn = c % 2 ? 1 : -1; let a = scar.a + sgn * scar.w * Math.sin(Math.PI * t0) ** 0.6 * 0.7, s = scar.s0 + t0 * (scar.s1 - scar.s0), va = sgn * (0.1 + rng() * 0.08), vs = (rng() - 0.5) * 0.5;
      const pts = [[a, s]];
      for (let i = 0; i < (low ? 5 : 8); i++) { a += va; s += vs; va += (rng() - 0.5) * 0.09; vs += (rng() - 0.5) * 0.35; if (s < 0.3 || s > body - 0.2) break; pts.push([a, s]); }
      if (pts.length > 2) lineOn(pts, 0.045 - 0.02 * rng(), dark);
      if (!low && pts.length > 4) { const f = pts[3], br = [f, [f[0] + sgn * 0.04, f[1] + 0.5], [f[0] + sgn * 0.1, f[1] + 1.0 + rng() * 0.5]]; if (br[2][1] < body - 0.2) lineOn(br, 0.03, dark); }
    }
  };
  const patchOn = (a, s, along) => {
    const m0 = new THREE.Vector3(...skin(a, s, 0.03)), n = new THREE.Vector3(...skin(a, s, 0.4)).sub(m0).normalize(), up = new THREE.Vector3(...skin(a, s + 0.5, 0.03)).sub(m0).normalize(), tx = new THREE.Vector3().crossVectors(up, n).normalize();
    up.crossVectors(n, tx);
    const mm = M.clone().multiply(new THREE.Matrix4().makeBasis(tx, up, n).setPosition(m0));
    for (let i = 0; i < 4; i++) B.add(B.box(along ? 1.25 + rng() * 0.3 : 0.24, along ? 0.24 : 1.25 + rng() * 0.3, 0.035, { seg: 9 }), ch(mm, along ? (rng() - 0.5) * 0.12 : (i - 1.5) * 0.27, along ? (i - 1.5) * 0.27 : (rng() - 0.5) * 0.12, 0.01 + (i % 2) * 0.012, 0, 0, (rng() - 0.5) * 0.14), wood());
    for (let i = 0; i < (low ? 2 : 5); i++) { const q = (i / 5) * 6.28 + rng(); B.add(new THREE.IcosahedronGeometry(0.16 + rng() * 0.1, 0), ch(mm, Math.cos(q) * 0.72, Math.sin(q) * 0.66, -0.03, rng(), rng(), 0, 1, 1, 0.4), { color: worn(V.lime, rng, 0.2), moss: 0.1, ground: g0 - 3 }); }
  };
  // the mouth stopped with a Late bung, and the great ring at its nose. m: the mouth's centre, +y out of it
  const nose = (m, rN, lean) => {
    B.add(B.cyl(rN * 1.22, rN * 1.22, 0.1, 14, 1), ch(m, 0, -0.03, 0), glass(N.bone));
    B.add(B.cyl(rN * 0.8, rN * 0.95, 0.5, 8, 1), ch(m, 0, 0.2, 0), { color: L.wood, moss: 0.3, ground: g0 - 3 });
    B.add(new THREE.TorusGeometry(rN * 1.05, 0.1, 6, low ? 14 : 20), ch(m, 0, 0.45 + rN * 1.05, 0, lean, rng() * 3, 0), glass(N.bone));
  };

  if (!lying) {
    // ================================================================ on its tail
    Rr = Math.min(w / 2 - 0.55, d / 2, 2.75 + rng() * 0.65); Lh = Rr * (4.25 + rng() * 0.9); body = Lh - 1.0;
    const sink = 0.95, yF = 0.24, sF = yF + sink, sT = sF + 2.12, sC = sF + 2.78; // the room: floor, the door's head, the loft
    const sB = sC + 1.9 + rng() * 1.5; // where a broken one is broken
    if (broken) { Lh = sB; body = Math.max(body, sB + 2); }
    // slumped: above the room every ring is carried aside, more the higher; as hard as the plot lets it
    const ldx = side * 0.94, ldz = -0.34; let bend = broken ? 0.012 : 0.05;
    const off = (s) => { const u = Math.max(0, s - sC); return [ldx * bend * u * u, ldz * bend * u * u]; };
    if (!broken) for (let it = 0; it < 30; it++) { let ok = true; for (let s = sC; s <= Lh + 1.6; s += 0.4) { const [ox, oz] = off(s), r = s > Lh ? rad(Lh) * 1.3 : rad(s); if (Math.abs(ox) + r * 0.95 > w / 2 + 0.45 || -oz + r > d / 2 + 0.55) ok = false; } if (ok) break; bend *= 0.88; }
    const jag = (i) => (broken ? 0.7 * Math.sin(i * 0.9 + seed) + 0.5 * Math.sin(i * 2.3 + seed * 2) - 1.5 * Math.max(0, Math.cos((i - 0.5) * da - side * 2.2)) ** 3 : 0), jagC = (i) => Math.max(-1.55, jag(i));
    const ss = new Set([sF, sT - 0.32, sT, sT + 0.28, sC]);
    if (broken) ss.add(sB); else for (const s of [body + 0.35, Lh - 0.3, Lh - 0.28, Lh]) ss.add(s);
    const top = broken ? sB - 1.9 : body, nb = low ? 13 : 20;
    for (let i = 0; i <= nb; i++) { const s = (i / nb) * body; if (s <= top && [...ss].every((q) => Math.abs(q - s) > 0.2)) ss.add(s); }
    S = [...ss].sort((a, b) => a - b);
    const jF = S.indexOf(sF), jT = S.indexOf(sT), jC = S.indexOf(sC), jTop = S.length - 1;
    sAt = (i, j) => S[j] + (broken && j === jTop ? jagC(((i % ni) + ni) % ni) : 0);
    skin = (a, s, lift = 0) => { const r = rad(s) + lift, [ox, oz] = off(s); return [Math.sin(a) * r * 0.95 + ox, s - sink, Math.cos(a) * r + oz]; };
    P = (i, j, inner) => skin((i - 0.5) * da, sAt(i, j), inner ? -TH : 0);
    // the door: three panels of the wall cut out, each to its own height
    const heads = { [ni - 1]: S.indexOf(sT - 0.32), 0: S.indexOf(sT + 0.28), 1: jT };
    const door = (i, j) => heads[i] !== undefined && j >= jF && j < heads[i];
    scar = { a: side * (0.85 + rng() * 0.3), s0: sF + 1.6, s1: Math.min(body * 0.7, Lh - 0.4), w: 0.34 + rng() * 0.14 };
    bare = (a, s) => s < 0.75 + 0.5 * B.n3(a * 2.2, seed, 0.4);
    const aP = -side * (2.3 + rng() * 0.3), sP = broken ? sC + 0.7 : Math.min(body * 0.8, Lh - 2.2); // the stovepipe's place
    soots.push({ a: aP, s: sP, dir: 1, len: 3.2, w: 0.55, k: 0.9 }, { a: 0, s: sT, dir: 1, len: 2.4, w: 0.42, k: 0.7 });
    sootsIn.push({ a: aP, s: sF + 0.9, dir: 1, len: 2.2, w: 0.5, k: 0.8 });
    painted(shell(false, 0, jTop, door), { color: N.milk, moss: 0.12, wet: 0.4, ground: g0 }, paintAt);
    painted(shell(true, jF, broken ? jTop : jC, door), { color: N.milk, moss: 0, wet: 0.2, ground: g0 - 3 }, paintIn);
    reveal(door, jF, S.indexOf(sT + 0.28), { color: N.milk.clone().multiplyScalar(0.85), moss: 0, ground: g0 - 3, emit: [N.light[0] * 0.2 * lit, N.light[1] * 0.2 * lit, N.light[2] * 0.2 * lit, 1] });
    cracks();
    patchOn(-side * (0.7 + rng() * 0.3), Math.min(sC + 1.0, Lh - 1.2), rng() < 0.5);
    if (broken) {
      // the broken edge, the milk body a hand thick; the loft's boards, open to the sky now
      const pos = []; for (let i = 0; i < ni; i++) { const a = P(i, jTop, false), b = P(i + 1, jTop, false), c2 = P(i + 1, jTop, true), e = P(i, jTop, true); pos.push(...a, ...b, ...c2, ...a, ...c2, ...e); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      { const pa = new THREE.Vector3(...P(0, jTop, false)), n = new THREE.Vector3(...P(1, jTop, false)).sub(pa).cross(new THREE.Vector3(...P(1, jTop, true)).sub(pa)); if (n.y < 0) g.setIndex([...Array(pos.length / 3).keys()].map((k) => k - (k % 3) + [0, 2, 1][k % 3])); }
      B.add(g.index ? g.toNonIndexed() : g, M, { color: N.milk, moss: 0.05, ground: g0 - 3, emit: [N.light[0] * 0.3 * lit, N.light[1] * 0.3 * lit, N.light[2] * 0.3 * lit, 1] });
      B.add(new THREE.CircleGeometry(rad(sC) - TH + 0.02, ni).rotateX(-Math.PI / 2), ch(M, off(sC)[0], sC - sink + 0.03, off(sC)[1], 0, 0, 0, 0.95, 1, 1), { color: worn(L.wood, rng, 0.3), moss: 0.3, ground: g0 - 3 });
      // up in the cup: a pole and the washing, a jar; its shards where they fell
      const py = sC - sink + 0.03, pr = rad(sC) - 0.7;
      for (const q of [-1, 1]) beam(B, M, [q * pr * 0.7, py, -pr * 0.5], [q * pr * 0.7, py + 3.4 + q * 0.3, -pr * 0.5], 0.07, { color: V.rawWood, moss: 0.05, ground: g0, round: 5 });
      washing(B, M, [-pr * 0.7, py + 3.0, -pr * 0.5], [pr * 0.7, py + 3.3, -pr * 0.5], rng, low ? 3 : 5);
      pot(B, M, side * pr * 0.5, py, pr * 0.4, 0.3, worn(L.tile[4], rng, 0.35), 2);
      for (let i = 0; i < (low ? 2 : 3); i++) {
        const sr = rad(sB) * (0.9 + rng() * 0.2), an = side * (0.75 + i * 0.3), dist = rad(sF + 1) + 0.8 + rng() * 0.4, sx2 = Math.max(-w / 2 + 1.2, Math.min(w / 2 - 1.2, Math.sin(an) * dist)), sz2 = Math.min(d / 2 + 0.3, Math.cos(an) * dist + 0.4), arcL = 0.3 + rng() * 0.25, hh = 0.7 + rng() * 0.6;
        const m2 = ch(M, sx2, 0.1 + 0.2 * i, sz2, Math.PI / 2 - 0.25 - rng() * 0.3, rng() * 6, rng() * 0.4);
        B.add(new THREE.CylinderGeometry(sr, sr, hh, 4, 1, true, 0, arcL).translate(0, 0, -sr), m2, { color: G[i % 2 ? 1 : 0].clone().lerp(V.dirt, 0.2), moss: 0.3, wet: 0.4, ground: g0 });
        const gi = new THREE.CylinderGeometry(sr - 0.05, sr - 0.05, hh, 4, 1, true, 0, arcL).translate(0, 0, -sr), ix = gi.index.array; for (let k = 0; k < ix.length; k += 3) { const t = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = t; }
        B.add(gi, m2, { color: N.milk, moss: 0.2, ground: g0, emit: [N.light[0] * 0.12 * lit, N.light[1] * 0.12 * lit, N.light[2] * 0.12 * lit, 1] });
        R.post(sx2, sz2, 0.45, 0, 0.5);
      }
    } else {
      const [tx, tz] = off(Lh), rN = rad(Lh - 0.5), tilt = Math.atan(2 * bend * (Lh - sC)); // (the mouth and its ring lean with the neck)
      nose(ch(M, tx, Lh - sink, tz, ldz * tilt, 0, -ldx * tilt), rN, 0);
      for (const t of [0.86, 0.1]) { const s = t * body, [ox, oz] = off(s); B.add(new THREE.TorusGeometry(rad(s), 0.08, 5, ni).rotateX(Math.PI / 2), ch(M, ox, s - sink, oz, 0, 0, 0, 0.95, 1, 1), glass(N.bone)); }
      // the pulled thread round its shoulder
      const pts = [], turns = 2.4 + rng(), ph = rng() * 6.28, nn = low ? 30 : 56;
      for (let i = 0; i <= nn; i++) { const f = i / nn; pts.push(new THREE.Vector3(...skin(ph + f * turns * Math.PI * 2, (0.78 + 0.2 * f) * body, 0.03))); }
      B.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), nn, 0.055, 4, false), M, glass(N.amberG, 0.05 * lit));
      // raw poles shoring the side it leans to, each foot on a stone
      for (let i = 0; i < 3; i++) {
        const a = Math.atan2(ldx, ldz) + (i - 1) * 0.55, s = sC + 1.6 + i * 0.9, hp = skin(a, s, -0.04), fr = Math.min(w / 2 - 0.25, Math.abs(hp[0]) + 1.5 + i * 0.3);
        const foot = [side * fr, -0.1, Math.max(-d / 2 + 0.3, Math.min(d / 2 - 0.3, hp[2] + (i - 1) * 1.1))];
        beam(B, M, foot, hp, 0.17, { color: V.rawWood, moss: 0.1, ground: g0, round: 6 });
        B.add(B.box(0.6, 0.3, 0.5, { seg: 9, chip: 0.04 }), ch(M, foot[0], 0.05, foot[2], 0, a, 0), { color: H.stone, moss: 0.5, ground: g0 });
        R.post(foot[0] * 0.92, foot[2], 0.3, 0, 1.6, { stand: false });
      }
      // one of its own bull's-eyes high in its front
      { const a = -side * (0.2 + rng() * 0.4), s = body * (0.62 + rng() * 0.06), p = skin(a, s); NOON_PARTS.lens(B, ch(M, p[0], p[1], p[2], 0, a, 0).multiply(new THREE.Matrix4().makeTranslation(0, 0, -0.02)), { r: 0.62, lit: lit * 0.3, cheap: low }); R.window(p[0], p[1], p[2], true); }
    }
    // the room's window: a bull's-eye at head height beside the door
    const ea = -side * (0.95 + rng() * 0.25), ep = skin(ea, sF + 1.55), em = ch(M, ep[0], ep[1], ep[2], 0, ea, 0);
    NOON_PARTS.lens(B, ch(em, 0, 0, -0.02), { r: 0.5, lit: lit * 0.35, cheap: low }); R.window(ep[0], ep[1], ep[2], true);
    B.add(new THREE.CircleGeometry(0.46, 10), ch(em, 0, 0, -TH - 0.02, 0, Math.PI, 0), { color: N.honey, moss: 0, ground: g0 - 3, emit: [N.light[0] * 0.7, N.light[1] * 0.6, N.light[2] * 0.3, 1] });
    // the door's frame: planks knocked into the cut, none of them plumb; a leaf of three boards hung open; a slab
    const ad = 1.5 * da, rD = rad(sF + 1) * 0.95, dxh = Math.sin(ad) * rD, dzh = Math.cos(ad) * rad(sF + 1);
    for (const s of [-1, 1]) beam(B, M, [s * (dxh + 0.02) + (rng() - 0.5) * 0.06, yF - 0.1, dzh + 0.06], [s * (dxh - 0.02) + (rng() - 0.5) * 0.1, yF + 2.05 + (s < 0 ? -0.3 : 0.05), dzh + 0.1], 0.13, wood(), 0.09);
    beam(B, M, [-dxh - 0.25, yF + 1.86, dzh + 0.12], [dxh + 0.3, yF + 2.16, dzh + 0.12], 0.14, wood(), 0.07);
    beam(B, M, [-dxh + 0.1, yF + 2.3, dzh + 0.1], [dxh * 0.4, yF + 2.42, dzh + 0.1], 0.1, wood(), 0.05);
    { const lm = ch(M, side * (dxh + 0.1), yF, dzh + 0.16, 0, side * (1.9 + rng() * 0.3), 0.03), bw = (dxh * 2 - 0.1) / 3;
      for (let i = 0; i < 3; i++) B.add(B.box(bw - 0.012, 1.95 - (i === 1 ? 0.12 : 0), 0.045, { seg: 9 }), ch(lm, -side * (bw * (i + 0.5)), 0.98 - (i === 1 ? 0.06 : 0), 0), wood());
      for (const y of [0.4, 1.5]) B.add(B.box(dxh * 2 - 0.2, 0.09, 0.03, { seg: 9 }), ch(lm, -side * (dxh - 0.05), y, 0.035, 0, 0, 0.04), wood());
      R.post(side * (dxh + 0.55), dzh + 0.8, 0.45, 0, 2.3, { stand: false }); }
    B.add(B.box(1.5, 0.3, 0.95, { seg: 9, chip: 0.05 }), ch(M, 0.05, yF - 0.19, dzh + 0.55, 0, 0.08, 0), { color: worn(H.stone, rng, 0.1), moss: 0.5, ground: g0 });
    R.floor(0, dzh + 0.55, 1.4, 0.95, yF - 0.04, { keep: false });
    // the stovepipe out through the wall, a lump of lime round it where it comes through, a cowl
    {
      const p0 = skin(aP, sP, -0.3), pw = skin(aP, sP), p1 = [p0[0] + Math.sin(aP) * 0.9, p0[1] + 0.45, p0[2] + Math.cos(aP) * 0.9], p2 = [p1[0] + (rng() - 0.5) * 0.15, p1[1] + 1.6 + rng() * 0.6, p1[2]];
      const iron = { color: L.iron, iron: 0.55, moss: 0, ground: g0 - 3, round: 6 };
      beam(B, M, p0, p1, 0.24, iron); beam(B, M, p1, p2, 0.22, iron);
      B.add(new THREE.IcosahedronGeometry(0.2, 0), ch(M, ...p1), { color: L.iron, iron: 0.55, moss: 0, ground: g0 - 3 });
      B.add(new THREE.IcosahedronGeometry(0.4, 1), ch(M, pw[0], pw[1] + 0.02, pw[2]), { color: worn(V.lime, rng, 0.2), moss: 0.2, ground: g0 - 3, disp: 0.05 });
      B.add(B.cyl(0.02, 0.26, 0.24, 6, 1), ch(M, p2[0], p2[1] + 0.2, p2[2]), { color: L.iron, iron: 0.6, moss: 0, ground: g0 - 3 });
      R.chimney = R.W(p2[0], p2[1] + 0.35, p2[2]);
    }
    // ---- the room. Boards, the loft's underside, a plank through the cut
    const ri = rad(sF + 0.6) * 0.95 - TH, boards = dim(worn(L.wood, rng, 0.1), 0.08);
    B.add(new THREE.CircleGeometry(rad(sF) - 0.05, ni).rotateX(-Math.PI / 2), ch(M, 0, yF - 0.007, 0, 0, 0, 0, 0.95, 1, 1), boards); // (a hair under the door's sill, which it runs in under)
    B.add(new THREE.CircleGeometry(rad(sC) - 0.05, ni).rotateX(Math.PI / 2), ch(M, 0, sC - sink, 0, 0, 0, 0, 0.95, 1, 1), dim(L.wood.clone().multiplyScalar(0.7), 0.06));
    B.add(B.box(dxh * 2 + 0.06, 0.3, 1.2, { seg: 9 }), ch(M, 0, yF - 0.18, dzh - 0.3), wood());
    R.disc(0, 0, ri - 0.1, yF); R.disc(0, dzh - 0.1, 0.72, yF);
    R.door(0, dzh + 1.25, { enter: true, w: dxh * 2 });
    { const rw = rad(sF + 1) - TH / 2, a0 = ad + 0.1, a1 = Math.PI * 2 - ad - 0.1, n = 14; for (let i = 0; i < n; i++) { const a = a0 + (i / n) * (a1 - a0), b = a0 + ((i + 1) / n) * (a1 - a0); R.wall(Math.sin(a) * rw * 0.95, Math.cos(a) * rw, Math.sin(b) * rw * 0.95, Math.cos(b) * rw, 0, 6, 0.13); } }
    // a bed built to the curve along the back wall, in patchwork
    const rb = ri - 0.5;
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + side * (-0.75 + i * 0.36), m = ch(M, Math.sin(a) * rb, yF, Math.cos(a) * rb, 0, a, 0);
      const bh = 0.3 + (i % 2) * 0.07; // (they overlap round the wall: no two neighbours one height)
      B.add(B.box(0.92, bh, 0.82, { seg: 9 }), ch(m, 0, bh / 2, 0), dim(L.wood, 0.05));
      B.add(B.box(0.94, 0.1, 0.74, { seg: 9 }), ch(m, 0, bh + 0.05, 0), dim(i === 0 ? worn(V.linen, rng, 0.05) : worn(CLOTHS[i % 4], rng, 0.12), 0.07));
    }
    R.wall(Math.sin(Math.PI - side * 0.75) * rb, Math.cos(Math.PI - side * 0.75) * rb, Math.sin(Math.PI + side * 0.7) * rb, Math.cos(Math.PI + side * 0.7) * rb, yF, 0.45, 0.42, { stand: true });
    // the hearth under the pipe: a hood of mud plaster against the wall, the fire's mouth, its flue up through the loft
    {
      const rs = ri - 0.42, x = Math.sin(aP) * rs, z = Math.cos(aP) * rs, m = ch(M, x, yF, z, 0, aP + Math.PI, 0), mud = dim(worn(V.mud, rng, 0.15), 0.06);
      B.add(B.box(1.0, 0.42, 0.7, { seg: 9, chip: 0.03 }), ch(m, 0, 0.21, 0), mud);
      B.add(B.cyl(0.16, 0.52, 1.25, 6, 1), ch(m, 0, 1.1, -0.08), mud);
      B.add(B.box(0.5, 0.36, 0.03, { seg: 9 }), ch(m, 0, 0.62, 0.3), { color: V.soot, moss: 0, ground: g0 - 3, emit: [...V.ember, 1] });
      beam(B, M, [x, yF + 1.7, z], [x, sC - sink + 0.02, z], 0.16, { color: L.iron, iron: 0.5, moss: 0, ground: g0 - 3, round: 6 });
      R.post(x, z, 0.5, yF, 1.2, { stand: false }); R.light(x - Math.sin(aP) * 0.6, yF + 0.7, z - Math.cos(aP) * 0.6, '#ff8a3a', 1.6, 7);
    }
    // things on the curve: two shelves bent round the wall in short boards, what stands on them; pegs, and what hangs
    {
      const a0 = side * 1.25, rsh = ri - 0.16;
      for (const [y, n] of [[1.2, 4], [1.68, 3]]) for (let i = 0; i < n; i++) {
        const a = a0 + side * (i - (n - 1) / 2) * 0.24, q = skin(a, sF + y, -TH - 0.13), m = ch(M, q[0], yF + y, q[2], 0, a, 0); // (let into the wall where it is at that height)
        B.add(B.box(rsh * 0.25, 0.035, 0.3, { seg: 9 }), m, dim(L.wood, 0.06));
        if (!low || i % 2 === 0) { const what = (i + seed + (y > 1.5 ? 1 : 0)) % 3; if (what === 0) pot(B, m, 0, 0.018, 0.02, 0.1 + rng() * 0.05, worn(pick([L.tile[0], V.mud, L.tile[4]], rng), rng, 0.3), 1.6 + rng(), 6); else if (what === 1) B.add(B.box(0.3, 0.16 + rng() * 0.1, 0.2, { seg: 9 }), ch(m, 0, 0.11, 0, 0, rng() - 0.5, 0), dim(worn(pick(CLOTHS, rng), rng, 0.2))); else for (const q of [-0.09, 0.03, 0.12]) B.add(B.cyl(0.035, 0.045, 0.2 + rng() * 0.1, 6, 1), ch(m, q, 0.13, 0.02), dim(worn(N.amberG || L.gilt, rng, 0.3), 0.12)); }
      }
      R.wall(Math.sin(a0 - 0.4) * (rsh - 0.05), Math.cos(a0 - 0.4) * (rsh - 0.05), Math.sin(a0 + 0.4) * (rsh - 0.05), Math.cos(a0 + 0.4) * (rsh - 0.05), yF + 1.0, 0.9, 0.2);
      const ap = -side * 1.9;
      for (let i = 0; i < 3; i++) { const a = ap - side * i * 0.2, q = skin(a, sF + 1.75, -TH - 0.02), m = ch(M, q[0], yF + 1.75, q[2], 0, a + Math.PI, 0); /* (the pegs driven into the wall where it is at their height) */ B.add(B.box(0.04, 0.04, 0.14, { seg: 9 }), m, dim(L.wood)); if (i === 0) B.add(B.box(0.5, 1.05, 0.07, { seg: 0.5 }), ch(m, 0, -0.56, 0.08, 0, 0, 0.03), { ...dim(worn(V.madder, rng, 0.25)), disp: 0.02, dispScale: 4 }); else if (i === 1) B.add(B.cyl(0.16, 0.16, 0.03, 9, 1), ch(m, 0, -0.17, 0.06, Math.PI / 2, 0, 0), dim(H.bronzeDull, 0.08)); else B.add(B.box(0.3, 0.42, 0.05, { seg: 9 }), ch(m, 0, -0.22, 0.06, 0, 0, -0.05), dim(worn(V.linen, rng, 0.1))); }
    }
    // a mat; a stool; a flask of the noon it was made to carry, hung from the loft
    B.add(B.box(1.7, 0.02, 1.0, { seg: 9 }), ch(M, 0.1 * side, yF + 0.011, 0.15, 0, 0.2 * side, 0), dim(worn(V.madder, rng, 0.3), 0.06));
    for (const q of [-0.7, 0.7]) B.add(B.box(0.1, 0.02, 1.0, { seg: 9 }), ch(M, 0.1 * side, yF + 0.02, 0.15, 0, 0.2 * side, 0).multiply(new THREE.Matrix4().makeTranslation(q, 0, 0)), dim(worn(V.linen, rng, 0.2), 0.06));
    PARTS.heliarch.drum(B, ch(M, -side * (ri - 1.3), yF, 0.9), { r: 0.22, h: 0.42, moss: 0 }); R.post(-side * (ri - 1.3), 0.9, 0.22, yF, 0.42);
    beam(B, M, [0, sC - sink, 0], [0, yF + 2.2, 0], 0.02, { color: V.rope, moss: 0, ground: g0 - 3 });
    B.add(new THREE.SphereGeometry(0.12, 8, 6), ch(M, 0, yF + 2.1, 0, 0, 0, 0, 1, 1.25, 1), { color: N.milk, moss: 0, ground: g0 - 3, emit: [N.light[0] * 0.9, N.light[1] * 0.9, N.light[2] * 0.9, 1] });
    R.light(0, yF + 1.9, 0, N.lightHex, 2.0 * lit + 0.5, 11);
    R.top = broken ? sC - sink + 3.8 : Lh - sink + 0.6 + 2.3 * rad(Lh - 0.5);
  } else {
    // ================================================================ on its side
    // the body along the plot's width, the nose toward `side`; bedded in, flattened under its own weight, and sagged
    // along its length. a: 0 is the front (+z), a quarter turn back from it the top
    Rr = Math.min(d / 2 - 0.22, 2.3 + rng() * 0.5);
    const rN0 = Rr * formAt(profile, 1), ring = 0.6 + 2.1 * rN0; // (the bung and the great ring beyond the nose)
    Lh = w - 0.3 - ring; body = Lh - 1.0;
    const bedIn = 0.5 + rng() * 0.25, pitch = 0.02 + rng() * 0.02, x0 = -side * (w / 2 - 0.15);
    const sq = (s) => 0.9 - 0.08 * Math.sin(Math.PI * Math.min(1, s / body)), cy = (s) => Rr * 0.86 - bedIn - (s - Lh / 2) * pitch - 0.12 * Math.sin(Math.PI * Math.min(1, s / body));
    skin = (a, s, lift = 0) => { const r = rad(s) + lift; return [x0 + side * s, cy(s) - Math.sin(a) * r * sq(s), Math.cos(a) * r]; };
    // the room: where the body is fat, 6 to 7 m of it; the door near its tail end
    const sR0 = body * 0.2, sR1 = Math.min(body * 0.78, sR0 + 7.2), sD = sR0 + 0.9, yF = 0.2;
    const ss = new Set([sR0, sR1, sD, sD + 0.45, sD + 0.9, sD + 1.3, body + 0.35, Lh - 0.3, Lh - 0.28, Lh]);
    const nb = low ? 14 : 22; for (let i = 0; i <= nb; i++) { const s = (i / nb) * body; if ([...ss].every((q) => Math.abs(q - s) > 0.2)) ss.add(s); }
    S = [...ss].sort((a, b) => a - b);
    const j0 = S.indexOf(sR0), j1 = S.indexOf(sR1), jD = S.indexOf(sD), jE = S.indexOf(sD + 1.3);
    sAt = (i, j) => S[j]; P = (i, j, inner) => skin((i - 0.5) * da, S[j], inner ? -TH : 0);
    // the door: in each of its three strips, the panels between the floor and that strip's own head
    const sM = sD + 0.65, rM = rad(sM), yAt = (i, lift = 0) => cy(sM) - Math.sin(i * da) * (rM + lift) * sq(sM), heads = [2.02, 2.3, 1.85];
    const door = (i, j) => { if (j < jD || j >= jE) return false; const ii = i > ni / 2 ? i - ni : i, y = yAt(ii); return Math.cos(ii * da) > 0 && y > yF - 0.2 && y < heads[Math.min(2, j - jD)]; };
    scar = { a: -0.95 - rng() * 0.25, s0: sR0 + 2.8, s1: Math.min(body * 0.86, sR1 + 0.8), w: 0.4 + rng() * 0.12 };
    bare = (a, s) => Math.sin(a) > 0.42 + 0.25 * B.n3(s * 0.7, seed, 1.1); // (lime and damp along the ground)
    const sP = sR1 - 1.0, aP = -Math.PI / 2 - 0.5; // the stovepipe: through the shoulder, behind the crown
    const sootTop = (a, s) => { const dsx = Math.abs(s - sP), up = wrap(a - aP); return dsx < 0.8 && up > -0.1 && up < 1.3 ? 0.85 * (1 - dsx / 0.8) * (1 - Math.max(0, up) / 1.3) : Math.abs(s - sM) < 0.8 && a < -0.3 && a > -1.3 ? 0.6 * (1 - Math.abs(s - sM) / 0.8) * (1 + (a + 0.3)) : 0; };
    const pOut = (a, s, out) => { paintAt(a, s, out); const k = sootTop(wrap(a), s); if (k > 0) { mix(out, V.soot, Math.min(0.85, k)); out.e *= 1 - Math.min(0.85, k); } };
    painted(shell(false, 0, S.length - 1, door), { color: N.milk, moss: 0.2, wet: 0.4, ground: g0 }, pOut);
    painted(shell(true, j0, j1, door), { color: N.milk, moss: 0, wet: 0.2, ground: g0 - 3 }, paintIn);
    reveal(door, jD, jE, { color: N.milk.clone().multiplyScalar(0.85), moss: 0, ground: g0 - 3, emit: [N.light[0] * 0.2 * lit, N.light[1] * 0.2 * lit, N.light[2] * 0.2 * lit, 1] });
    cracks();
    patchOn(-0.55, sR0 - 1.2 > 1 ? sR0 - 1.0 : sR1 + 1.0, true);
    // the tail's rim walled up in mud brick with a shuttered pane; the bung and the great ring at the nose
    { const r0 = rad(0), m = ch(M, x0 + side * 0.05, cy(0), 0, 0, -side * Math.PI / 2, 0);
      B.add(new THREE.CircleGeometry(r0 + 0.02, 14), ch(m, 0, 0, 0, 0, 0, 0, 1, sq(0), 1), { color: worn(V.mud, rng, 0.2), course: 0.19, moss: 0.25, ground: g0 });
      B.add(B.box(0.5, 0.5, 0.05, { seg: 9 }), ch(m, 0.1, 0.25, 0.02), { color: new THREE.Color('#3a2410'), moss: 0, ground: g0 - 3, emit: [V.lit[0] * 0.5, V.lit[1] * 0.5, V.lit[2] * 0.5, 1] });
      for (const q of [-0.13, 0.13]) B.add(B.box(0.03, 0.5, 0.07, { seg: 9 }), ch(m, 0.1 + q, 0.25, 0.03), { color: V.soot, moss: 0, ground: g0 - 3 });
      R.window(x0 + side * 0.05, cy(0) + 0.25, 0, true); }
    nose(ch(M, x0 + side * Lh, cy(Lh), 0, 0, 0, -side * (Math.PI / 2 + pitch)), rad(Lh - 0.5), 0.5 + rng() * 0.5);
    for (const t of [0.86, 0.1]) { const s = t * body; B.add(new THREE.TorusGeometry(rad(s), 0.08, 5, ni), ch(M, x0 + side * s, cy(s), 0, 0, Math.PI / 2, 0, 1, sq(s), 1), glass(N.bone)); }
    // chocks under its belly, front and back, so it does not roll; a bull's-eye for the room's window
    for (const [s, fz] of [[sR0 - 0.6, 1], [sR1 + 0.5, 1], [body * 0.5, -1]]) { const r = rad(Math.max(0.5, s)), x = x0 + side * s, z = fz * Math.min(d / 2 - 0.35, r * 0.82); B.add(B.box(1.2, 0.7, 0.8, { seg: 9, chip: 0.07, seed: s }), ch(M, x, 0.15, z, 0.1 * fz, rng() * 0.5, 0), { color: worn(H.stone, rng, 0.1), moss: 0.5, ground: g0, course: 0 }); R.post(x, z, 0.5, 0, 0.5); }
    { const s = sR0 + 3.4, a = -0.32, p = skin(a, s), m = ch(M, p[0], p[1], p[2], a * 0.9, 0, 0); NOON_PARTS.lens(B, ch(m, 0, 0, -0.02), { r: 0.5, lit: lit * 0.35, cheap: low }); R.window(p[0], p[1], p[2], true);
      B.add(new THREE.CircleGeometry(0.46, 10), ch(m, 0, 0, -TH - 0.03, 0, Math.PI, 0), { color: N.honey, moss: 0, ground: g0 - 3, emit: [N.light[0] * 0.7, N.light[1] * 0.6, N.light[2] * 0.3, 1] }); }
    // the door's frame of planks, its leaf of three boards hung open, a slab for a step
    const xD = x0 + side * sM, zO = rM * Math.cos(Math.asin(Math.min(0.95, (cy(sM) - yF) / (rM * sq(sM))))), zH = rM + 0.06; // the wall's face at the floor, and at its fattest
    for (const s of [-1, 1]) beam(B, M, [xD + s * 0.68 + (rng() - 0.5) * 0.06, yF - 0.15, zH], [xD + s * 0.64 + (rng() - 0.5) * 0.08, 2.15 + (s < 0 ? 0.1 : -0.2), zH - 0.04], 0.13, wood(), 0.09);
    beam(B, M, [xD - 0.9, 2.02, zH + 0.02], [xD + 0.85, 2.24, zH + 0.02], 0.14, wood(), 0.07);
    { const lm = ch(M, xD + side * 0.74, yF, zH + 0.08, 0, side * (1.85 + rng() * 0.3), 0.03);
      for (let i = 0; i < 3; i++) B.add(B.box(0.4, 1.85 - (i === 1 ? 0.1 : 0), 0.045, { seg: 9 }), ch(lm, -side * (0.41 * (i + 0.5)), 0.93, 0), wood());
      for (const y of [0.4, 1.45]) B.add(B.box(1.12, 0.09, 0.03, { seg: 9 }), ch(lm, -side * 0.62, y, 0.035, 0, 0, 0.04), wood());
      R.post(xD + side * 1.25, zH + 0.65, 0.45, 0, 2.2, { stand: false }); }
    B.add(B.box(1.5, 0.3, 1.0, { seg: 9, chip: 0.05 }), ch(M, xD, yF - 0.2, zH + 0.45, 0, 0.06, 0), { color: worn(H.stone, rng, 0.1), moss: 0.5, ground: g0 });
    R.floor(xD, zH + 0.45, 1.4, 1.0, yF - 0.05, { keep: false });
    // ---- the room: boards on joists across the belly, a bulkhead of planks at each end
    const riM = rad((sR0 + sR1) / 2) - TH, cyM = cy((sR0 + sR1) / 2), sqM = sq((sR0 + sR1) / 2), zFl = Math.min(...[sR0 + 0.3, (sR0 + sR1) / 2, sR1 - 0.3].map((s) => (rad(s) - TH) * Math.cos(Math.asin(Math.min(0.95, (cy(s) - yF) / ((rad(s) - TH) * sq(s))))))) - 0.02;
    const xr0 = x0 + side * sR0, xr1 = x0 + side * sR1, xm = (xr0 + xr1) / 2, Lr = sR1 - sR0, boards = dim(worn(L.wood, rng, 0.1), 0.08);
    B.add(B.box(Lr, 0.1, zFl * 2 + 0.16, { seg: 9 }), ch(M, xm, yF - 0.05, 0), boards);
    B.add(B.box(1.24, 0.12, zO - zFl + 0.6, { seg: 9 }), ch(M, xD, yF - 0.07, (zO + zFl) / 2 + 0.2), wood()); // the plank through the cut
    for (const [s, f] of [[sR0, 1], [sR1, -1]]) B.add(new THREE.CircleGeometry(rad(s) - TH + 0.03, 14), ch(M, x0 + side * (s + f * 0.03), cy(s), 0, 0, f * side * Math.PI / 2, 0, 1, sq(s), 1), dim(worn(L.wood, rng, 0.2).multiplyScalar(0.8), 0.07));
    R.floor(xm, 0, Lr - 0.1, zFl * 2, yF, { keep: false }); R.floor(xD, (zO + zFl) / 2 + 0.1, 1.1, zO - zFl + 0.7, yF, { keep: false });
    R.door(xD, zH + 1.3, { enter: true, w: 1.2 });
    // walls for the walker: the room's two long walls (the door left), its ends; the solid parts either side of it
    { const zw = zFl + 0.16, xa = Math.min(xr0, xr1), xb = Math.max(xr0, xr1);
      R.wall(xa, -zw, xb, -zw, 0, 4, 0.16); R.wall(xa, zw, xD - 0.72, zw, 0, 4, 0.16); R.wall(xD + 0.72, zw, xb, zw, 0, 4, 0.16);
      for (const x of [xr0, xr1]) R.wall(x, -zw, x, zw, 0, 4, 0.16);
      // (the body either side of the room: its outline at the ground, tail and nose closed)
      const zo = (q) => rad(q) * 0.8;
      for (const [sa, sb] of [[0.1, sR0], [sR1, Lh]]) { const n = Math.max(1, Math.round((sb - sa) / 1.3)); for (let i = 0; i < n; i++) { const q0 = sa + ((sb - sa) * i) / n, q1 = sa + ((sb - sa) * (i + 1)) / n; for (const f of [-1, 1]) R.wall(x0 + side * q0, f * zo(q0), x0 + side * q1, f * zo(q1), 0, 3, 0.2); } }
      R.wall(x0 + side * 0.1, -zo(0.1), x0 + side * 0.1, zo(0.1), 0, 3, 0.2); R.wall(x0 + side * Lh, -zo(Lh), x0 + side * Lh, zo(Lh), 0, 3, 0.2); R.post(x0 + side * (Lh + ring * 0.5), 0, 0.8, 0, 2, { stand: false }); }
    // the hearth against the nose-end bulkhead, its flue up and out through the shoulder; soot up the wall
    {
      const hx = xr1 - side * 0.5, mud = dim(worn(V.mud, rng, 0.15), 0.06), m = ch(M, hx, yF, -zFl * 0.25, 0, -side * Math.PI / 2, 0);
      B.add(B.box(1.1, 0.42, 0.75, { seg: 9, chip: 0.03 }), ch(m, 0, 0.21, 0), mud);
      B.add(B.cyl(0.16, 0.55, 1.3, 6, 1), ch(m, 0, 1.12, -0.06), mud);
      B.add(B.box(0.52, 0.36, 0.03, { seg: 9 }), ch(m, 0, 0.62, 0.33), { color: V.soot, moss: 0, ground: g0 - 3, emit: [...V.ember, 1] });
      const pin = [hx, yF + 1.75, -zFl * 0.25], pw = skin(aP, sP), p1 = [pw[0], pw[1] + 0.5, pw[2] - 0.15], p2 = [p1[0] + (rng() - 0.5) * 0.2, p1[1] + 1.5 + rng() * 0.5, p1[2]], iron = { color: L.iron, iron: 0.55, moss: 0, ground: g0 - 3, round: 6 };
      beam(B, M, pin, [pw[0], pw[1] - 0.2, pw[2] + 0.1], 0.17, iron); beam(B, M, [pw[0], pw[1] - 0.2, pw[2] + 0.1], p1, 0.22, iron); beam(B, M, p1, p2, 0.2, iron);
      B.add(new THREE.IcosahedronGeometry(0.4, 1), ch(M, pw[0], pw[1], pw[2]), { color: worn(V.lime, rng, 0.2), moss: 0.2, ground: g0 - 3, disp: 0.05 });
      B.add(B.cyl(0.02, 0.26, 0.24, 6, 1), ch(M, p2[0], p2[1] + 0.2, p2[2]), { color: L.iron, iron: 0.6, moss: 0, ground: g0 - 3 });
      R.chimney = R.W(p2[0], p2[1] + 0.35, p2[2]); R.post(hx, -zFl * 0.25, 0.55, yF, 1.2, { stand: false }); R.light(hx - side * 0.8, yF + 0.7, -zFl * 0.25, '#ff8a3a', 1.6, 7);
    }
    // a bed along the back wall, shelves on the curve above it, pegs by the door, a chest, a mat, the flask
    const zBack = (y) => -Math.sqrt(Math.max(0.05, riM * riM - ((cyM - y) / sqM) ** 2));
    bed(B, M, xm - side * 0.4, yF, -zFl + 0.55, Math.PI / 2, rng, { quilt: worn(pick(CLOTHS, rng), rng, 0.1) }); R.wall(xm - side * 0.4 - 0.7, -zFl + 0.55, xm - side * 0.4 + 0.7, -zFl + 0.55, yF, 0.6, 0.45, { stand: true });
    for (const y of [1.45, 1.95]) { const z = zBack(y + yF) + 0.2, len = Lr * 0.55; B.add(B.box(len, 0.035, 0.3, { seg: 9 }), ch(M, xm - side * 0.2, yF + y, z), dim(L.wood, 0.06)); R.shelf(xm - side * 0.2, yF + y + 0.02, z, len, 0.3);
      for (let i = 0; i < (low ? 3 : 7); i++) { const x = xm - side * 0.2 + (rng() - 0.5) * (len - 0.4), what = (i + seed) % 3; if (what === 0) pot(B, M, x, yF + y + 0.018, z, 0.1 + rng() * 0.05, worn(pick([L.tile[0], V.mud, L.tile[4]], rng), rng, 0.3), 1.6 + rng(), 6); else if (what === 1) B.add(B.box(0.3, 0.16 + rng() * 0.1, 0.2, { seg: 9 }), ch(M, x, yF + y + 0.11, z, 0, rng() - 0.5, 0), dim(worn(pick(CLOTHS, rng), rng, 0.2))); else B.add(B.cyl(0.04, 0.05, 0.22, 6, 1), ch(M, x, yF + y + 0.13, z), dim(worn(N.amberG || L.gilt, rng, 0.3), 0.12)); } }
    { const zf2 = -zBack(yF + 1.7) - 0.07; for (let i = 0; i < 3; i++) { const m = ch(M, xD + side * (1.2 + i * 0.45), yF + 1.7, zf2, 0, Math.PI, 0); B.add(B.box(0.04, 0.04, 0.14, { seg: 9 }), m, dim(L.wood)); if (i === 0) B.add(B.box(0.5, 1.0, 0.07, { seg: 0.5 }), ch(m, 0, -0.54, 0.08), { ...dim(worn(V.madder, rng, 0.25)), disp: 0.02, dispScale: 4 }); else if (i === 1) B.add(B.cyl(0.16, 0.16, 0.03, 9, 1), ch(m, 0, -0.24, 0.07, Math.PI / 2, 0, 0), dim(H.bronzeDull, 0.08)); else B.add(B.box(0.3, 0.42, 0.05, { seg: 9 }), ch(m, 0, -0.26, 0.07), dim(worn(V.linen, rng, 0.1))); } }
    B.add(B.box(0.9, 0.5, 0.5, { seg: 9 }), ch(M, xr0 + side * 0.55, yF + 0.25, -zFl * 0.3, 0, Math.PI / 2, 0), dim(worn(L.paint[seed % 4], rng, 0.4), 0.05)); R.post(xr0 + side * 0.5, -zFl * 0.3, 0.5, yF, 0.5);
    B.add(B.box(2.0, 0.014, 1.0, { seg: 9 }), ch(M, xm + side * 0.6, yF + 0.008, 0.2, 0, 0.1, 0), dim(worn(V.madder, rng, 0.3), 0.06));
    { const fy = cyM + riM * sqM - 0.02; beam(B, M, [xm, fy, 0], [xm, yF + 2.2, 0], 0.02, { color: V.rope, moss: 0, ground: g0 - 3 });
      B.add(new THREE.SphereGeometry(0.12, 8, 6), ch(M, xm, yF + 2.1, 0, 0, 0, 0, 1, 1.25, 1), { color: N.milk, moss: 0, ground: g0 - 3, emit: [N.light[0] * 0.9, N.light[1] * 0.9, N.light[2] * 0.9, 1] });
      R.light(xm, yF + 1.9, 0, N.lightHex, 2.0 * lit + 0.5, 11); }
    // washing from a pole at its tail to the shoulder
    if (!low) { const px = x0 + side * 0.9, pz = Math.min(d / 2 - 0.3, Rr * 0.6 + 1.3); beam(B, M, [px, -0.2, pz], [px, 3.0, pz], 0.08, { color: V.rawWood, moss: 0.05, ground: g0, round: 5 }); const q = skin(-0.9, sD - 0.8, 0.02); washing(B, M, [px, 2.9, pz], q, rng, 4); R.post(px, pz, 0.08); }
    R.top = Math.max(...[0.3, 0.5, 0.7].map((t) => cy(t * body) + rad(t * body) * sq(t * body)));
  }
  R.tris = B.triangles - base;
  return R;
}
