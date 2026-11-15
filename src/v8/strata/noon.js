// The fourth hand (v14-D3): the Noonwrights, who came after the Heliarchy and before the folk here now. The Heliarchs
// faced the sun; when it began to fail, these people stopped facing it and tried to keep it: gathered daylight above
// the haze, stored it, and sent it where it was wanted in great sealed carriers down tubes. visual-art/architecture.md
// has the hand in words; this is its kit, reached through ctx.strata.parts.noon like the other three.
//
// Two registers. The BLOWN and CAST: nothing carved, coursed, jointed or nailed; every piece made whole, round in
// section, swelling where a line was joined: milk glass, bottle amber, celadon glaze, a band of ox-blood where a thing
// was marked. The SPUN: frames drawn out as filament and laced ring to ring at a tangent (never a strut, a rivet or a
// right angle). Their mark is the empty ring, alone or in a row; they have no sign of the sun (it was to be kept, not
// looked at). Their one light is stored daylight: LIGHT, the white-gold of a noon nobody alive has seen.
//
// Every part takes (B, M, o) like the other hands' and adds into either builder: a structures Builder (B.add: the
// surface world) or an UnderBuilder (B.vert: v14/under.js, under the ground, where `glow` is the baked light and
// `wear(x, y, z, ny, col, out)` may recolour a vertex by where it is in the world). The local frame of a round thing:
// the origin on its axis, the axis along +z. o.lit (0..1) is how much stored light it still holds.
import * as THREE from 'three';

const c = (h) => new THREE.Color(h);
export const NOON = {
  milk: c('#c9c3b0'), cloud: c('#9a9685'), bone: c('#aaa48f'), amber: c('#8a5418'), honey: c('#d9a04a'), biscuit: c('#6a6051'), celadon: c('#8fb09c'), oxblood: c('#701c16'),
  lime: c('#d4cfbb'), silt: c('#3a382f'), dark: c('#0b0a08'), strand: c('#b9b4a2'),
  light: [1.0, 0.93, 0.74], lightHex: '#ffedbd',
};
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rngOf = (o, salt = 1) => (o.seed !== undefined ? mulberry(o.seed * 7919 + salt) : o.rng || mulberry(salt));
const T = (M, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) => M.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'ZYX')), new THREE.Vector3(s, s, s)));
const _col = [0, 0, 0];

// one geometry into either builder; smooth normals kept. p: { color, glow (number or fn(x, y, z)), wear, jit, wet }
export function put(B, g, M, p = {}) {
  const col = p.color || NOON.milk;
  if (typeof B.vert === 'function') {
    const ng = g.index ? g.toNonIndexed() : g;
    if (!ng.attributes.normal) ng.computeVertexNormals();
    ng.applyMatrix4(M);
    const P = ng.attributes.position.array, N = ng.attributes.normal.array, base = [col.r, col.g, col.b];
    for (let i = 0; i < P.length; i += 3) {
      const cc = p.wear ? p.wear(P[i], P[i + 1], P[i + 2], N[i + 1], base, _col) : base;
      B.vert(P[i], P[i + 1], P[i + 2], N[i], N[i + 1], N[i + 2], cc, p.jit ?? 0.03);
      if (p.glow != null) B.u[B.u.length - 1] += typeof p.glow === 'function' ? p.glow(P[i], P[i + 1], P[i + 2]) : p.glow;
    }
    if (ng !== g) ng.dispose();
    g.dispose();
  } else {
    const k = typeof p.glow === 'number' ? p.glow : p.glow ? 1 : 0;
    B.add(g, M, { color: col, moss: p.moss ?? 0.08, wet: p.wet ?? 0.5, ground: p.ground, emit: k > 0 ? [NOON.light[0] * k, NOON.light[1] * k, NOON.light[2] * k, 1] : undefined });
  }
}
// a surface of revolution about +z from [[r, z], ...] (z ascending: faces out)
function latheZ(profile, segs) {
  return new THREE.LatheGeometry(profile.map(([r, z]) => new THREE.Vector2(Math.max(r, 1e-4), z)), segs).rotateX(Math.PI / 2);
}
// a ring about +z: centre-line radius R, section radius r; arc [a0, a1] measured from +y (the crown) toward +x
function ringZ(R, r, a0 = -Math.PI, a1 = Math.PI, seg = 40, sec = 8) {
  const g = new THREE.TorusGeometry(R, r, sec, Math.max(4, Math.round(seg * (a1 - a0) / (2 * Math.PI))), a1 - a0);
  return g.rotateZ(Math.PI / 2 - a1); // torus arc runs from +x counter-clockwise; ours from the crown clockwise
}

// ---------------------------------------------------------------- the blown and cast
// collar: the thick ring where two lengths were joined (a gall on the line), a band of ox-blood glaze beside it.
// o: r (3: the centre-line radius), t (0.26: its section), a0, a1 (the arc left standing, from the crown), band (true)
function collar(B, M, o = {}) {
  const r = o.r ?? 3, t = o.t ?? r * 0.085, a0 = o.a0 ?? -Math.PI, a1 = o.a1 ?? Math.PI, seg = o.seg ?? 44;
  put(B, ringZ(r, t, a0, a1, seg, o.sec ?? 8), M, { color: o.color || NOON.milk, wear: o.wear, glow: o.glow });
  if (o.band !== false) put(B, ringZ(r + t * 0.15, t * 0.62, a0, a1, seg, 6), T(M, 0, 0, t * 0.95), { color: NOON.oxblood, wear: o.wear, glow: o.glow });
  // a broken end is a clean shell-fracture: a dark disc across the section
  if (a1 - a0 < 6.2) for (const a of [a0, a1]) put(B, new THREE.CircleGeometry(t * 0.98, 8), T(M, Math.sin(a) * r, Math.cos(a) * r, 0, 0, 0, -a).multiply(new THREE.Matrix4().makeRotationY(a === a0 ? -Math.PI / 2 : Math.PI / 2)), { color: NOON.cloud, wear: o.wear });
}
// tube: a length of the line from the origin along +z, a collar at its start, thin ribs along it, its far end whole
// or broken. o: r (3, the bore), len (5.5), a0, a1 (the arc of wall left, from the crown), rib (1.1 m apart), collar
// (true), ragged (0..1: how torn the far end and the arc's edges are), lit (the wall lit from inside)
function tube(B, M, o = {}) {
  const r = o.r ?? 3, len = o.len ?? 5.5, a0 = o.a0 ?? -Math.PI, a1 = o.a1 ?? Math.PI, rag = o.ragged ?? 0, rng = rngOf(o, 11);
  const nt = Math.max(6, Math.round((o.seg ?? 40) * (a1 - a0) / (2 * Math.PI))), nz = Math.max(2, Math.round(len / 0.9));
  // the wall: built by hand so its torn end and edges can be drawn
  const pos = [], idx = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nt; i++) {
    let a = a0 + (a1 - a0) * i / nt, z = len * j / nz;
    if (rag > 0) {
      if (j === nz) z -= rng() * rag * 1.6 * (1 + Math.sin(a * 3 + rng()) * 0.5);
      if (a1 - a0 < 6.2 && (i === 0 || i === nt)) a += (i === 0 ? 1 : -1) * rng() * rag * 0.35;
    }
    pos.push(Math.sin(a) * r, Math.cos(a) * r, Math.max(0, z));
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nt; i++) { const a = j * (nt + 1) + i, b = a + 1, d = a + nt + 1, e = d + 1; idx.push(a, d, b, b, d, e); }
  const wall = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  put(B, wall(), M, { color: o.color || NOON.milk, wear: o.wear, glow: o.lit ? 0.55 * o.lit : null });
  if (typeof B.vert !== 'function') { const g = wall().scale(0.985, 0.985, 1); g.setIndex(idx.map((_, k) => idx[k - (k % 3) + [0, 2, 1][k % 3]])); put(B, g, M, { color: NOON.cloud }); } // (single-sided stone: its inside)
  const every = o.rib ?? 1.1;
  if (every > 0) for (let z = every; z < len - 0.3 - rag; z += every) put(B, ringZ(r + 0.03, r * 0.022, a0 + rag * 0.2, a1 - rag * 0.2, o.seg ?? 40, 5), T(M, 0, 0, z), { color: NOON.bone, wear: o.wear, glow: o.lit ? 0.2 * o.lit : null });
  if (o.collar !== false) collar(B, M, { r: r + r * 0.06, t: r * 0.085, a0, a1, wear: o.wear, seg: o.seg });
}
// lens: a bull's-eye, facing +z: a low dome of amber or clear glass in a rolled rim. o: r (0.55), lit, glass
function lens(B, M, o = {}) {
  const r = o.r ?? 0.55, k = o.lit ?? 0;
  const q = o.bulge ?? 2.6, dome = new THREE.SphereGeometry(r * q, 14, 5, 0, Math.PI * 2, 0, Math.asin(1 / q)).rotateX(Math.PI / 2).translate(0, 0, -r * q * Math.cos(Math.asin(1 / q)));
  put(B, dome, M, { color: o.glass || (k > 0 ? NOON.honey : NOON.amber), wear: o.wear, glow: k > 0 ? 0.75 * k : null, jit: 0.02 });
  put(B, ringZ(r * 1.04, r * 0.13, -Math.PI, Math.PI, 20, 6), M, { color: o.rim || NOON.oxblood, wear: o.wear, glow: k > 0 ? 0.25 * k : null });
  put(B, ringZ(r * 0.45, r * 0.05, -Math.PI, Math.PI, 14, 4), T(M, 0, 0, r * 0.19), { color: NOON.bone, glow: k > 0 ? 0.5 * k : null });
}
// mark: their mark, the empty ring, lying on a surface (facing +z). o: r (0.16), n (1: a row of them along +x), gap
function mark(B, M, o = {}) {
  const r = o.r ?? 0.16, n = o.n ?? 1, gap = o.gap ?? r * 2.7;
  for (let i = 0; i < n; i++) put(B, ringZ(r, r * 0.2, -Math.PI, Math.PI, 14, 4), T(M, (i - (n - 1) / 2) * gap, 0, 0), { color: o.color || NOON.bone, wear: o.wear, glow: o.glow });
}
// band: a band of glaze round a line (axis +z, centred on the origin) with a row of the empty ring on it.
// o: r (2.3: the body's radius there), w (0.5), marks (count round the whole band; 0 none), color
function band(B, M, o = {}) {
  const r = o.r ?? 2.3, w = o.w ?? 0.5, n = o.marks ?? Math.round(r * 4.2);
  put(B, new THREE.CylinderGeometry(r + 0.012, r + 0.012, w, o.seg ?? 32, 1, true).rotateX(Math.PI / 2), M, { color: o.color || NOON.oxblood, wear: o.wear, glow: o.glow });
  for (let i = 0; i < n; i++) {
    const a = (i + 0.5) / n * Math.PI * 2;
    if (o.only && !o.only(a)) continue;
    put(B, ringZ(w * 0.3, w * 0.06, -Math.PI, Math.PI, 12, 4), T(M, 0, 0, 0, 0, 0, -a).multiply(new THREE.Matrix4().makeTranslation(0, r + 0.02, 0)).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)), { color: NOON.bone, wear: o.wear, glow: o.glow });
  }
}
// carrier: one of the great sealed vessels the line carried, each once filled with a measure of noon. Blown whole,
// and no two alike: a punt and its pontil scar at the tail, a belly, a shoulder drawn out to a neck and a rolled lip
// at the nose (which sat in the punt of the one ahead); ribs; a band of ox-blood with its row of rings; a bull's-eye
// in its back; galls; the coupling ring at its nose. o: r (2.3), len (7.2), form ('long' | 'waist' (two bellies, a
// ring gripping the waist) | 'gourd' (fat at the tail, a long neck) | 'drop' (fat at the nose)), lit (0..1), roll
// (rad), crack (a shell-fracture in its back, black inside), net (true: its spun cradle, filament rings laced
// together), galls (2), couple (true), seg, glaze, full (false on low: fewer parts). Origin: the axis at mid-length.
export const FORMS = {
  long: [[0, 0.5], [0.07, 0.84], [0.15, 0.99], [0.5, 1.02], [0.8, 0.98], [0.91, 0.72], [1, 0.36]],
  waist: [[0, 0.5], [0.07, 0.84], [0.16, 1.02], [0.36, 1.0], [0.5, 0.88], [0.64, 0.99], [0.8, 0.96], [0.91, 0.7], [1, 0.34]],
  gourd: [[0, 0.42], [0.09, 0.88], [0.24, 1.06], [0.42, 0.97], [0.6, 0.64], [0.78, 0.4], [1, 0.3]],
  drop: [[0, 0.3], [0.2, 0.46], [0.45, 0.78], [0.68, 1.04], [0.85, 0.92], [0.94, 0.62], [1, 0.36]],
};
// the body's radius (in r) at t (0 the tail's rim .. 1 the neck's root)
export function formAt(form, t) {
  const F = FORMS[form] || FORMS.long;
  for (let i = 1; i < F.length; i++) if (t <= F[i][0]) { const u = (t - F[i - 1][0]) / (F[i][0] - F[i - 1][0]), q = u * u * (3 - 2 * u); return F[i - 1][1] + (F[i][1] - F[i - 1][1]) * q; }
  return F[F.length - 1][1];
}
function carrier(B, M, o = {}) {
  const R = o.r ?? 2.3, L = o.len ?? 7.2, k = o.lit ?? 0, seg = o.seg ?? 30, rng = rngOf(o, 3), h = L / 2, form = o.form || 'long';
  const MR = o.roll ? T(M, 0, 0, 0, 0, 0, o.roll) : M;
  const body = L - R * 0.14, zt = (t) => -h + t * body, rt = (t) => R * formAt(form, t), F = FORMS[form] || FORMS.long;
  const rT = rt(0), rN = rt(1);
  const prof = [[0, -h + rT * 0.5], [rT * 0.35, -h + rT * 0.42], [rT * 0.8, -h + rT * 0.1]];
  const n = o.full === false ? 16 : 24;
  for (let i = 0; i <= n; i++) prof.push([rt(i / n), zt(i / n)]);
  prof.push([rN * 1.02, h - R * 0.06], [rN * 1.22, h - R * 0.02], [rN * 1.22, h], [rN * 0.9, h + R * 0.02], [0, h - R * 0.03]);
  const wear = o.wear, glow = k > 0 ? (o.glowFn || k * 0.6) : null, part = (c, g) => ({ color: c, wear, glow: k > 0 ? k * g : null });
  put(B, latheZ(prof, seg), MR, { color: o.color || NOON.milk, wear, glow });
  // the pontil scar in the punt: where it was broken from the rod, rough and dark, a bead left in it
  put(B, new THREE.CircleGeometry(rT * 0.3, 10), T(MR, 0, 0, -h + rT * 0.49, 0, Math.PI, 0), { color: NOON.silt, wear });
  put(B, new THREE.SphereGeometry(rT * 0.1, 8, 6), T(MR, 0, 0, -h + rT * 0.44), { color: NOON.amber, wear });
  // ribs where the body turns; on a waisted one the ring that gripped it
  for (const t of form === 'gourd' ? [0.12, 0.5] : form === 'drop' ? [0.5, 0.9] : [0.1, 0.86]) put(B, ringZ(rt(t), R * 0.04, -Math.PI, Math.PI, seg, 5), T(MR, 0, 0, zt(t)), part(NOON.bone, 0.5));
  if (form === 'waist') collar(B, T(MR, 0, 0, zt(0.5)), { r: R * 0.97, t: R * 0.085, seg, band: false, wear, color: NOON.bone });
  put(B, ringZ(rN * 1.24, R * 0.06, -Math.PI, Math.PI, 18, 6), T(MR, 0, 0, h - R * 0.01), part(NOON.oxblood, 0));
  const top = o.full === false ? (a) => Math.abs(a) < 0.7 || Math.abs(a - Math.PI * 2) < 0.7 : null;
  const tb = form === 'drop' ? 0.72 : 0.27, tl = form === 'drop' ? 0.6 : form === 'waist' ? 0.7 : form === 'gourd' ? 0.33 : 0.56;
  band(B, T(MR, 0, 0, zt(tb)), { r: rt(tb) + R * 0.004, w: R * 0.12, seg, color: o.glaze || NOON.oxblood, wear, only: top, glow: k > 0 ? k * 0.2 : null });
  if (o.full !== false) band(B, T(MR, 0, 0, zt(form === 'gourd' ? 0.6 : 0.82)), { r: rt(form === 'gourd' ? 0.6 : 0.82) + R * 0.004, w: R * 0.06, seg, marks: 0, color: NOON.celadon, wear, glow: k > 0 ? k * 0.3 : null });
  // the bull's-eye in its back (and one in its flank, mostly under water afloat)
  const eye = (a, t, r) => lens(B, T(MR, 0, 0, zt(t), 0, 0, -a).multiply(new THREE.Matrix4().makeTranslation(0, rt(t) - r * 0.05, 0)).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)), { r, lit: k, wear });
  eye(0, tl, R * 0.24);
  if (o.full !== false) eye(1.25 + rng() * 0.3, tl - 0.12, R * 0.18);
  // the coupling at its nose: the great ring that held it to the next (it stands out of the water between two afloat)
  if (o.couple !== false) collar(B, T(MR, 0, 0, h + R * 0.03), { r: R * 0.72, t: R * 0.07, seg, band: false, wear, color: NOON.bone });
  // galls: a long blister budded from the shoulder in a ring of celadon
  const galls = o.galls ?? 2;
  for (let i = 0; i < galls; i++) {
    const a = (i ? -1 : 1) * (0.32 + rng() * 0.25), t = i ? 0.1 + rng() * 0.05 : 0.86 + rng() * 0.05, gr = R * (0.17 + rng() * 0.08);
    const G = T(MR, 0, 0, zt(t), 0, 0, -a).multiply(new THREE.Matrix4().makeTranslation(0, rt(t) * 0.94, 0));
    put(B, new THREE.SphereGeometry(gr, 12, 8).scale(0.85, 0.7, 1.5), G, part(o.color || NOON.milk, 0.75));
    put(B, ringZ(gr * 0.95, gr * 0.09, -Math.PI, Math.PI, 14, 5).rotateX(Math.PI / 2), G.clone().multiply(new THREE.Matrix4().makeTranslation(0, gr * 0.12, 0)), { color: NOON.celadon, wear });
  }
  // its spun cradle: filament rings round the body, laced one to the next at a slant (as a glass float is netted)
  if (o.net) {
    const ts = [0.14, 0.34, 0.56, 0.78], m = o.full === false ? 8 : 14, off = R * 0.035;
    ts.forEach((t, j) => {
      put(B, ringZ(rt(t) + off, R * 0.014, -Math.PI, Math.PI, seg, 4), T(MR, 0, 0, zt(t)), { color: NOON.strand, wear });
      if (!j) return;
      const t0 = ts[j - 1], r0 = rt(t0) + off, r1 = rt(t) + off;
      for (let i = 0; i < m; i++) { const a = i / m * Math.PI * 2, b = a + (j % 2 ? 1 : -1) * Math.PI / m * 1.6; strand(B, MR, [Math.sin(a) * r0, Math.cos(a) * r0, zt(t0)], [Math.sin(b) * r1, Math.cos(b) * r1, zt(t)], { t: R * 0.009, wear }); }
    });
  }
  if (o.crack) { // a shell-fracture: a curved black bite with a pale edge
    const a = o.crackAt ?? 0.12, t = 0.42;
    const bite = new THREE.Shape(); bite.moveTo(-0.5, -0.2); bite.bezierCurveTo(-0.2, 0.5, 0.5, 0.45, 0.75, 0.05); bite.bezierCurveTo(0.4, -0.1, 0.1, -0.5, -0.5, -0.2);
    const mk = (sc, col, lift) => put(B, new THREE.ShapeGeometry(bite, 5).scale(R * 0.62 * sc, R * 0.62 * sc, 1), T(MR, 0, 0, zt(t), 0, 0, -a).multiply(new THREE.Matrix4().makeTranslation(0, rt(t) + lift, 0)).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)), { color: col, jit: 0 });
    mk(1.1, NOON.cloud, R * 0.012); mk(1, NOON.dark, R * 0.018);
  }
}
// node: the swelling where lines met, a gall: an oblate bulb with a collared port for each line. o: r (1.4),
// ports ([[yaw, pitch], ...] of each port's axis; default three in a Y), pr (the ports' bore), lit
function node(B, M, o = {}) {
  const r = o.r ?? 1.4, k = o.lit ?? 0, pr = o.pr ?? r * 0.5, ports = o.ports || [[0, 0], [2.3, 0.1], [-2.0, -0.05]];
  put(B, new THREE.SphereGeometry(r, o.seg ?? 20, 12).scale(1, 0.86, 1), M, { color: o.color || NOON.milk, wear: o.wear, glow: k > 0 ? k * 1.2 : null });
  put(B, ringZ(r * 0.62, r * 0.05, -Math.PI, Math.PI, 20, 5).rotateX(Math.PI / 2), T(M, 0, r * 0.66, 0), { color: NOON.oxblood, wear: o.wear });
  for (const [yaw, pitch] of ports) {
    const P = M.clone().multiply(new THREE.Matrix4().makeRotationY(yaw)).multiply(new THREE.Matrix4().makeRotationX(-pitch));
    put(B, latheZ([[pr * 1.25, r * 0.6], [pr * 1.02, r * 0.95], [pr, r * 1.3]], 14), P, { color: o.color || NOON.milk, wear: o.wear, glow: k > 0 ? k * 0.6 : null });
    collar(B, T(P, 0, 0, r * 1.3), { r: pr * 1.08, t: pr * 0.16, seg: 18, sec: 6, wear: o.wear });
  }
}

// ---------------------------------------------------------------- the spun
// strand: one drawn filament between two points (world, or the frame of M), sagging a little. o: t (0.02), sag
export function strand(B, M, a, b, o = {}) {
  const t = o.t ?? 0.02, sag = o.sag ?? 0, A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b);
  const mid = A.clone().add(Bv).multiplyScalar(0.5); mid.y -= sag;
  const g = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(A, mid, Bv), sag ? 6 : 1, t, 4, false);
  put(B, g, M, { color: o.color || NOON.strand, wear: o.wear, glow: o.glow, jit: 0 });
}
// cell: a collector's cell, the spun frame's unit: a rim ring, a hub ring with a lens in it, and filaments laced from
// rim to hub at a tangent (as a wheel is laced), so it is all rings and straight drawn lines. Facing +z, centred.
// o: r (1.6), hub (0.32 of r), n (14 filaments), lit, lens (true)
function cell(B, M, o = {}) {
  const r = o.r ?? 1.6, hr = r * (o.hub ?? 0.32), n = o.n ?? 14, k = o.lit ?? 0;
  put(B, ringZ(r, r * 0.035, -Math.PI, Math.PI, 30, 5), M, { color: NOON.milk, wear: o.wear });
  put(B, ringZ(hr, r * 0.03, -Math.PI, Math.PI, 16, 5), M, { color: NOON.bone, wear: o.wear });
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, b = a + (i % 2 ? 1.25 : -1.25);
    strand(B, M, [Math.cos(a) * r, Math.sin(a) * r, 0], [Math.cos(b) * hr, Math.sin(b) * hr, (i % 2 ? 1 : -1) * r * 0.03], { t: r * 0.009, wear: o.wear });
  }
  if (o.lens !== false) lens(B, M, { r: hr * 0.86, lit: k, wear: o.wear });
}

export const NOON_PARTS = { carrier, tube, collar, node, lens, band, mark, cell };
