// The three hands' parts (v8-03), as geometry added into a structures Builder (src/structures/geo.js), so a caller
// merges them with its own stone: one draw call for a site, whatever it borrows. Every part takes (B, M, o): B the
// Builder, M a THREE.Matrix4 placing the part's local frame (origin at its foot, centred; +y up; +z out of its face,
// toward whoever looks at it), o its options. Colours are the hands' own (COLORS); the Elder parts carry no colour
// worth the name, since they are drawn in the kit's cyclopean stone (strata.js gives them that material).
//
// The sign, the sun in the saddle: a disc in a V notch, half-angle 35 degrees; the disc's diameter 0.6 of the notch's
// width at its centre, its lower third below the notch's shoulders. For a notch of depth S (apex to shoulders):
// the notch is 1.4 S wide at the shoulders, the disc's centre 0.163 S above them, its radius 0.488 S (SIGN).
import * as THREE from 'three';
import { mat } from '../../structures/geo.js';

const TAN = Math.tan((35 * Math.PI) / 180);
export const SIGN = { tan: TAN, discUp: 0.163, discR: 0.488 };

const c = (h) => new THREE.Color(h);
export const COLORS = {
  elder: { stone: c('#86796a') },
  heliarch: { stone: c('#8c8592'), dark: c('#6e6878'), bronze: c('#3f6a5a'), bronzeDark: c('#4a3a22'), carve: c('#2a2430'), ember: [0.95, 0.26, 0.05] },
  late: {
    plaster: [c('#e9dcc0'), c('#e6b8a0'), c('#e8c070'), c('#efe8da')], // cream, rose, saffron, limewash
    tile: [c('#1f9a92'), c('#b3263a'), c('#2b4fa6'), c('#ece4d0'), c('#e0a32a')], // turquoise, pomegranate, cobalt, white, saffron
    paint: [c('#24877a'), c('#9a2a22'), c('#d89a2a'), c('#2c4f9a')], // the woodwork: green, ox-blood, ochre, blue
    wood: c('#5a3a24'), iron: c('#1c1714'), pom: c('#a8182a'), pomDark: c('#6a0e18'), gilt: c('#d8a440'), cloth: [c('#d8a03a'), c('#e8dcc4'), c('#a8302a'), c('#2a8a80')],
    glass: { ruby: [3.2, 0.35, 0.3], amber: [3.0, 1.5, 0.3], emerald: [0.4, 2.4, 0.9], sapphire: [0.5, 0.9, 3.2] },
  },
};

const ch = (M, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => M.clone().multiply(mat(x, y, z, rx, ry, rz, sx, sy, sz));

// ---------------------------------------------------------------- shapes
// a rectangle w x h (foot at y 0) with the sign's V cut in its top: depth S; `cup` rounds the apex to a seat of that radius
function notchedShape(w, h, S, cup = 0) {
  const a = S * TAN, sh = new THREE.Shape();
  sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, h); sh.lineTo(a, h);
  if (cup > 0) {
    // the V's sides meet a round seat: tangent points where the circle of radius cup meets each side
    const ang = (35 * Math.PI) / 180, cy = h - S + cup / Math.sin(ang);
    const tx = cup * Math.cos(ang), ty = cy - cup * Math.sin(ang);
    sh.lineTo(tx, ty);
    sh.absarc(0, cy, cup, -ang, -Math.PI + ang, true);
  } else sh.lineTo(0, h - S);
  sh.lineTo(-a, h); sh.lineTo(-w / 2, h); sh.lineTo(-w / 2, 0);
  return sh;
}
// a crescent, horns up, outer radius R: the inner circle (radius k R) raised by u R
export function crescentShape(R, k = 0.8, u = 0.36, n = 18) {
  const ri = k * R, cc = u * R, y = (R * R - ri * ri + cc * cc) / (2 * cc), x = Math.sqrt(Math.max(0, R * R - y * y));
  const aO = Math.atan2(y, x), aI = Math.atan2(y - cc, x);
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = aO - (i / n) * (Math.PI + 2 * aO); pts.push(new THREE.Vector2(Math.cos(a) * R, Math.sin(a) * R)); }
  for (let i = 1; i < n; i++) { const a = Math.PI - aI + (i / n) * (Math.PI + 2 * aI); pts.push(new THREE.Vector2(Math.cos(a) * ri, cc + Math.sin(a) * ri)); }
  return new THREE.Shape(pts);
}
// an opening's outline, from the right jamb's foot up, over and down to the left jamb's foot: a horseshoe (more than a
// semicircle, pinched at the springing) or an ogee (two reversed curves meeting in a point). w wide, springing at sp.
function openingPoints(kind, w, sp) {
  const r = w / 2, pts = [];
  if (kind === 'ogee') {
    const H = r * 1.15, n = 12;
    pts.push([r, 0], [r, sp]);
    for (let i = 1; i <= n; i++) { const t = i / n; pts.push([r * (1 - t), sp + H * (t < 0.5 ? 0.5 * Math.sin(Math.PI * t) : 1 - 0.5 * Math.sin(Math.PI * (1 - t)))]); }
    for (let i = n - 1; i >= 0; i--) { const t = i / n; pts.push([-r * (1 - t), sp + H * (t < 0.5 ? 0.5 * Math.sin(Math.PI * t) : 1 - 0.5 * Math.sin(Math.PI * (1 - t)))]); }
    pts.push([-r, 0]);
  } else {
    const n = 16, a0 = -0.5, a1 = Math.PI + 0.5;
    pts.push([r * 0.86, 0]);
    for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * (a1 - a0); pts.push([Math.cos(a) * r, sp + Math.sin(a) * r]); }
    pts.push([-r * 0.86, 0]);
  }
  return pts;
}
// the top of an opening (for a frame round it)
const openingTop = (kind, w, sp) => sp + (kind === 'ogee' ? w / 2 * 1.15 : w / 2);

// ---------------------------------------------------------------- the Elder hand: giant, plain, triangular
// notch: a great slab with the bare V cut in its top, the apex worn round into a seat for a disc that is not there.
// o: w (6), h (5), d (2.4), S (the notch's depth; 0.42 w). Returns the notch's apex and shoulders in world space.
function elderNotch(B, M, o = {}) {
  const g0 = M.elements[13];
  const w = o.w ?? 6, h = o.h ?? 5, d = o.d ?? 2.4, S = o.S ?? w * 0.42;
  B.add(B.extrude(notchedShape(w, h, S, S * 0.16), d, 16), ch(M, 0, 0, 0), { color: COLORS.elder.stone, moss: 0.3, ground: g0 });
  return { shoulders: h, apex: h - S, width: 2 * S * TAN };
}
// block: one cyclopean block, chipped; the material etches its faces with the recursive triangles
function elderBlock(B, M, o = {}) {
  const g0 = M.elements[13];
  const w = o.w ?? 2.4, h = o.h ?? 2, d = o.d ?? 2;
  B.add(B.box(w, h, d, { seg: 3, chip: o.chip ?? 0.12, seed: o.seed || 0 }), ch(M, 0, h / 2, 0, o.rx || 0, 0, o.rz || 0), { color: COLORS.elder.stone, moss: 0.4 });
}

// ---------------------------------------------------------------- the Heliarchy: formal, exact, bronze and ember glass
// roundel: the sign as the Heliarchy carved it, a disc set in an exactly notched head, with a moulded base and a bronze
// ring round the disc. o: size (0.8, the head's width), disc 'ember' | 'bronze'. Origin at the foot of the head.
function heliRoundel(B, M, o = {}) {
  const g0 = M.elements[13];
  const H = COLORS.heliarch, s = o.size ?? 0.8, d = s * 0.22, h = s * 0.62, S = s * 0.42;
  const base = { color: H.stone, moss: 0.25, ground: g0 - 2 };
  // the base moulding: a plinth and a fillet
  B.add(B.box(s * 1.12, s * 0.09, d * 1.25), ch(M, 0, s * 0.045, 0), { ...base, color: H.dark });
  B.add(B.extrude(notchedShape(s, h, S), d, 4), ch(M, 0, s * 0.09, 0), base);
  // a carved hexagon at each shoulder, the Heliarchy's everyday motif
  for (const sx of [-1, 1]) B.add(B.cyl(s * 0.07, s * 0.07, 0.012, 6, 1), ch(M, sx * s * 0.36, s * 0.09 + h * 0.5, d / 2 + 0.004, Math.PI / 2, 0, 0), { color: H.carve, moss: 0.1, ground: g0 - 2 });
  const cy = s * 0.09 + h + SIGN.discUp * S, r = SIGN.discR * S;
  const discOpts = o.disc === 'bronze' ? { color: H.bronze, moss: 0, ground: g0 - 2, iron: 0 } : { color: c('#4a1a08'), moss: 0, ground: g0 - 2, emit: [...H.ember, 0] };
  B.add(B.cyl(r, r, d * 0.7, 28, 1), ch(M, 0, cy, 0, Math.PI / 2, 0, 0), discOpts);
  B.add(new THREE.TorusGeometry(r * 1.06, s * 0.022, 6, 32), ch(M, 0, cy, d * 0.36), { color: H.bronzeDark, moss: 0, ground: g0 - 2 });
  return { disc: { y: cy, r } };
}
// drum: a hexagonal column drum, a raised band at each end. o: r (0.42), h (0.85)
function heliDrum(B, M, o = {}) {
  const g0 = M.elements[13];
  const H = COLORS.heliarch, r = o.r ?? 0.42, h = o.h ?? 0.85;
  B.add(B.cyl(r, r, h, 6, 1), ch(M, 0, h / 2, 0, 0, o.turn || 0, 0), { color: o.color || H.stone, moss: o.moss ?? 0.5, ground: g0, disp: 0.006, dispScale: 5 });
  for (const y of [0.05, h - 0.05]) B.add(B.cyl(r * 1.06, r * 1.06, 0.1, 6, 1), ch(M, 0, y, 0, 0, o.turn || 0, 0), { color: o.color || H.stone, moss: o.moss ?? 0.5, ground: g0 });
}
// capital: an echinus under a hexagonal abacus. o: r (0.42, the shaft's)
function heliCapital(B, M, o = {}) {
  const g0 = M.elements[13];
  const H = COLORS.heliarch, r = o.r ?? 0.42;
  B.add(B.lathe([[r, 0], [r * 1.05, 0.08], [r * 1.35, 0.3], [r * 1.5, 0.42], [0, 0.42]], 12), ch(M, 0, 0, 0), { color: o.color || H.stone, moss: 0.4, ground: g0 });
  B.add(B.cyl(r * 1.75, r * 1.75, 0.2, 6, 1), ch(M, 0, 0.52, 0, 0, o.turn || 0, 0), { color: o.color || H.stone, moss: 0.4, ground: g0 });
}
// slab: a bronze-bound door, lying or standing: a stone leaf with three straps, studs and a boss bearing the sign.
// o: w (1.2), h (2.4), d (0.16). Local frame: the leaf in the xy plane, its foot at y 0.
function heliSlab(B, M, o = {}) {
  const g0 = M.elements[13];
  const H = COLORS.heliarch, w = o.w ?? 1.2, h = o.h ?? 2.4, d = o.d ?? 0.16;
  B.add(B.box(w, h, d, { chip: 0.02 }), ch(M, 0, h / 2, 0), { color: H.dark, moss: 0.3, ground: g0 - 1 });
  for (const t of [0.14, 0.5, 0.86]) {
    B.add(B.box(w + 0.02, 0.09, d + 0.03), ch(M, 0, h * t, 0), { color: H.bronze, moss: 0, ground: g0 - 1 });
    for (let k = 0; k < 5; k++) B.add(B.box(0.035, 0.035, d + 0.06), ch(M, -w / 2 + 0.12 + k * (w - 0.24) / 4, h * t, 0), { color: H.bronzeDark, moss: 0, ground: g0 - 1 });
  }
  B.add(B.cyl(w * 0.16, w * 0.16, d + 0.05, 20, 1), ch(M, 0, h * 0.68, 0, Math.PI / 2, 0, 0), { color: H.bronze, moss: 0, ground: g0 - 1 });
  B.add(B.extrude(notchedShape(w * 0.2, w * 0.1, w * 0.07), d + 0.07, 2), ch(M, 0, h * 0.68 - w * 0.08, 0), { color: H.bronzeDark, moss: 0, ground: g0 - 1 });
}

// ---------------------------------------------------------------- the Late folk: small, crooked, cheerful, coloured
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length) % arr.length];
// the pomegranate: a squashed ball with its crown. o: r, col
function pomegranate(B, M, x, y, z, r, rng) {
  const g0 = M.elements[13];
  const L = COLORS.late;
  B.add(new THREE.IcosahedronGeometry(r, 1), ch(M, x, y, z, 0, 0, 0, 1, 0.9, 1), { color: L.pom, moss: 0, ground: g0 - 2 });
  B.add(B.cyl(r * 0.18, r * 0.3, r * 0.4, 5, 1), ch(M, x + r * 0.05, y + r * 0.95, z, 0, 0, (rng() - 0.5) * 0.4), { color: L.pomDark, moss: 0, ground: g0 - 2 });
}
// panel: the sign as the Late folk tile and paint it, slightly wrong: a tiled ground, a crescent (the notch gone round),
// the disc a pomegranate sitting a little off true. o: w (1.1), h (1.1), rng
function lateSign(B, M, o = {}) {
  const g0 = M.elements[13];
  const L = COLORS.late, rng = o.rng || Math.random, w = o.w ?? 1.1, h = o.h ?? 1.1, t = 0.06;
  // frame: saffron plaster moulding; ground: turquoise tiles, a few gone
  B.add(B.box(w + 0.16, h + 0.16, t), ch(M, 0, h / 2, 0), { color: L.plaster[2], moss: 0.05, ground: g0 - 2 });
  const n = Math.max(3, Math.round(w / 0.16)), m = Math.max(3, Math.round(h / 0.16)), tw = w / n, th = h / m;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    if (rng() < 0.06) continue;
    const edge = i === 0 || j === 0 || i === n - 1 || j === m - 1;
    const col = edge ? ((i + j) % 2 ? L.tile[1] : L.tile[3]) : (rng() < 0.12 ? L.tile[2] : L.tile[0]);
    B.add(B.box(tw * 0.92, th * 0.92, 0.02), ch(M, -w / 2 + (i + 0.5) * tw, (j + 0.5) * th, t / 2 + 0.01), { color: col.clone().multiplyScalar(0.9 + rng() * 0.2), moss: 0, ground: g0 - 2, wet: 0.35 });
  }
  // the crescent, painted saffron, tilted a few degrees off level; the pomegranate in its horns, off-centre
  const R = Math.min(w, h) * 0.34, tilt = (rng() - 0.5) * 0.22 + 0.08;
  B.add(B.extrude(crescentShape(R, 0.78, 0.4), 0.03, 4), ch(M, 0, h * 0.42, t / 2 + 0.035, 0, 0, tilt), { color: L.gilt, moss: 0, ground: g0 - 2 });
  pomegranate(B, M, R * 0.1, h * 0.42 + R * 0.62, t / 2 + 0.06, R * 0.42, rng);
}
// finial: a cut-out crescent with a pomegranate in its horns on a gilt pole with three knops. o: h (1.3)
function lateFinial(B, M, o = {}) {
  const g0 = M.elements[13];
  const L = COLORS.late, rng = o.rng || Math.random, h = o.h ?? 1.3, R = h * 0.26;
  B.add(B.cyl(h * 0.018, h * 0.024, h * 0.7, 6, 1), ch(M, 0, h * 0.35, 0), { color: L.iron, iron: 0.6, moss: 0, ground: g0 - 3 });
  for (const [y, r] of [[0.12, 0.07], [0.32, 0.055], [0.52, 0.045]]) B.add(new THREE.IcosahedronGeometry(h * r, 1), ch(M, 0, h * y, 0), { color: L.gilt, moss: 0, ground: g0 - 3 });
  B.add(B.extrude(crescentShape(R, 0.76, 0.42), 0.04, 4), ch(M, 0, h * 0.72 + R, 0, 0, 0, (rng() - 0.5) * 0.15), { color: L.gilt, moss: 0, ground: g0 - 3 });
  pomegranate(B, M, 0, h * 0.72 + R * 1.55, 0, R * 0.4, rng);
}
// wall: a stretch of lime plaster with a horseshoe or ogee opening framed in a painted band. o: w (3), h (3),
// d (0.5), open ('horseshoe' | 'ogee' | null), ow (1.2, the opening's width), color (an index into plaster or a Color)
function lateWall(B, M, o = {}) {
  const g0 = M.elements[13];
  const L = COLORS.late, w = o.w ?? 3, h = o.h ?? 3, d = o.d ?? 0.5, ow = o.ow ?? 1.2, sp = o.sp ?? Math.min(h - ow * 0.75, ow * 1.3);
  const col = o.color instanceof THREE.Color ? o.color : L.plaster[o.color ?? 0];
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2, 0); sh.lineTo(-w / 2, h); sh.lineTo(w / 2, h); sh.lineTo(w / 2, 0);
  if (o.open) {
    for (const [x, y] of openingPoints(o.open, ow, sp)) sh.lineTo(x, y);
    // the painted frame (an alfiz): a band round the opening, proud of the plaster
    const fc = o.frame || L.paint[0], fh = openingTop(o.open, ow, sp) + 0.16;
    for (const sx of [-1, 1]) B.add(B.box(0.1, fh, 0.03), ch(M, sx * (ow / 2 + 0.16), fh / 2, d / 2 + 0.01), { color: fc, moss: 0, ground: g0 });
    B.add(B.box(ow + 0.42, 0.1, 0.03), ch(M, 0, fh, d / 2 + 0.01), { color: fc, moss: 0, ground: g0 });
  }
  sh.lineTo(-w / 2, 0);
  B.add(B.extrude(sh, d, 14), ch(M, 0, 0, 0), { color: col, moss: 0.12, ground: g0, disp: 0.008, dispScale: 3 });
}
// screen: a pierced screen of turned slats in a painted frame. o: w (1.2), h (1.6)
function lateScreen(B, M, o = {}) {
  const g0 = M.elements[13];
  const L = COLORS.late, w = o.w ?? 1.2, h = o.h ?? 1.6, col = o.color || L.paint[0], p = 0.13;
  for (let x = -w / 2 + p; x < w / 2 - 0.02; x += p) B.add(B.box(0.03, h, 0.03), ch(M, x, h / 2, 0), { color: col, moss: 0, ground: g0 - 1 });
  for (let y = p; y < h - 0.02; y += p) B.add(B.box(w, 0.03, 0.035), ch(M, 0, y, 0), { color: col, moss: 0, ground: g0 - 1 });
  for (const y of [0, h]) B.add(B.box(w + 0.1, 0.08, 0.07), ch(M, 0, y, 0), { color: L.paint[1], moss: 0, ground: g0 - 1 });
  for (const sx of [-1, 1]) B.add(B.box(0.08, h, 0.07), ch(M, sx * w / 2, h / 2, 0), { color: L.paint[1], moss: 0, ground: g0 - 1 });
}
// bracket: an iron arm from a wall with a scroll and a hook, waiting for a lamp. Returns the hook (local) where it hangs.
function lateBracket(B, M, o = {}) {
  const g0 = M.elements[13];
  const L = COLORS.late, reach = o.reach ?? 0.55;
  B.add(B.box(0.12, 0.3, 0.03), ch(M, 0, 0, 0.015), { color: L.iron, iron: 0.8, moss: 0, ground: g0 - 3 });
  B.add(B.box(0.035, 0.035, reach), ch(M, 0, 0.1, reach / 2), { color: L.iron, iron: 0.8, moss: 0, ground: g0 - 3 });
  B.add(B.box(0.025, 0.025, reach * 0.8), ch(M, 0, -0.04, reach * 0.4, -0.45, 0, 0), { color: L.iron, iron: 0.8, moss: 0, ground: g0 - 3 });
  B.add(new THREE.TorusGeometry(0.05, 0.01, 4, 10), ch(M, 0, 0.06, reach, 0, Math.PI / 2, 0), { color: L.iron, iron: 0.8, moss: 0, ground: g0 - 3 });
  return { x: 0, y: 0.02, z: reach };
}
// lamp: a bracket with a pierced lamp of coloured glass hung from it. o: glass ('ruby'|'amber'|'emerald'|'sapphire')
function lateLamp(B, M, o = {}) {
  const g0 = M.elements[13];
  const L = COLORS.late, hook = lateBracket(B, M, o), g = L.glass[o.glass || 'amber'];
  const y = hook.y - 0.28, z = hook.z;
  B.add(B.cyl(0.006, 0.006, 0.12, 3, 1), ch(M, 0, hook.y - 0.06, z), { color: L.iron, iron: 1, moss: 0, ground: g0 - 3 });
  B.add(B.cyl(0.03, 0.11, 0.1, 8, 1), ch(M, 0, y + 0.14, z), { color: L.gilt, moss: 0, ground: g0 - 3 });
  B.add(new THREE.IcosahedronGeometry(0.11, 1), ch(M, 0, y, z, 0, 0, 0, 1, 1.3, 1), { color: c('#201008'), moss: 0, ground: g0 - 3, emit: [...g, 1] });
  B.add(B.cyl(0.07, 0.02, 0.08, 8, 1), ch(M, 0, y - 0.16, z), { color: L.gilt, moss: 0, ground: g0 - 3 });
  return { x: 0, y, z };
}
// awning: striped cloth on two poles, sloping from the wall, a scalloped hem. o: w (3), d (1.8), h (2.5, at the wall),
// poles (true)
function lateAwning(B, M, o = {}) {
  const g0 = M.elements[13];
  const L = COLORS.late, rng = o.rng || Math.random, w = o.w ?? 3, d = o.d ?? 1.8, h = o.h ?? 2.5, drop = 0.45, n = Math.max(4, Math.round(w / 0.32));
  const slope = Math.atan2(drop, d), len = Math.hypot(d, drop), a = pick([0, 2], rng), b = 1;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (i + 0.5) * (w / n);
    B.add(B.box(w / n + 0.005, 0.015, len), ch(M, x, h - drop / 2 + Math.sin(i * 1.7) * 0.02, d / 2, slope, 0, 0), { color: L.cloth[i % 2 ? b : a], moss: 0, ground: g0 - 1 });
    B.add(B.cyl(0, w / n / 2, 0.16, 3, 1), ch(M, x, h - drop - 0.08, d, Math.PI, 0, 0), { color: L.cloth[i % 2 ? b : a], moss: 0, ground: g0 - 1 });
  }
  if (o.poles !== false) for (const sx of [-1, 1]) B.add(B.cyl(0.035, 0.04, h - drop, 6, 1), ch(M, sx * (w / 2 - 0.05), (h - drop) / 2, d, (rng() - 0.5) * 0.06, 0, (rng() - 0.5) * 0.06), { color: L.paint[1], moss: 0.1, ground: g0 });
  B.add(B.box(w + 0.1, 0.05, 0.05), ch(M, 0, h, 0.03), { color: L.wood, moss: 0, ground: g0 });
}
// bench: a plastered bench faced with tiles. o: w (1.8), h (0.45), d (0.5)
function lateBench(B, M, o = {}) {
  const g0 = M.elements[13];
  const L = COLORS.late, rng = o.rng || Math.random, w = o.w ?? 1.8, h = o.h ?? 0.45, d = o.d ?? 0.5;
  B.add(B.box(w, h, d, { chip: 0.02 }), ch(M, 0, h / 2, 0), { color: L.plaster[3], moss: 0.1, ground: g0 });
  const n = Math.round(w / 0.15);
  for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
    const col = (i + j) % 2 ? L.tile[0] : (i % 4 === 0 ? L.tile[1] : L.tile[3]);
    B.add(B.box(w / n * 0.9, h * 0.4, 0.02), ch(M, -w / 2 + (i + 0.5) * w / n, h * (0.25 + j * 0.45), d / 2 + 0.01), { color: col.clone().multiplyScalar(0.9 + rng() * 0.2), moss: 0, ground: g0, wet: 0.3 });
  }
  B.add(B.box(w + 0.06, 0.05, d + 0.06), ch(M, 0, h + 0.025, 0), { color: L.tile[0], moss: 0, ground: g0, wet: 0.3 });
}
// tiles: a band of tiles along x, n of them, for a wall's dado or a cornice. o: w (each), h, colours (indices)
function lateTiles(B, M, o = {}) {
  const g0 = M.elements[13];
  const L = COLORS.late, rng = o.rng || Math.random, n = o.n ?? 8, tw = o.w ?? 0.2, th = o.h ?? 0.2, cols = o.cols || [0, 3, 1, 3];
  for (let i = 0; i < n; i++) {
    if (rng() < (o.lost ?? 0.05)) continue;
    B.add(B.box(tw * 0.92, th, 0.025), ch(M, -n * tw / 2 + (i + 0.5) * tw, th / 2, 0.012), { color: L.tile[cols[i % cols.length]].clone().multiplyScalar(0.88 + rng() * 0.24), moss: 0, ground: g0 - 1, wet: 0.3 });
  }
}

export const PARTS = {
  elder: { notch: elderNotch, block: elderBlock },
  heliarch: { roundel: heliRoundel, drum: heliDrum, capital: heliCapital, slab: heliSlab },
  late: { sign: lateSign, finial: lateFinial, wall: lateWall, screen: lateScreen, bracket: lateBracket, lamp: lateLamp, awning: lateAwning, bench: lateBench, tiles: lateTiles },
};
// each hand's rendering of the sign
export const SIGNS = { elder: elderNotch, heliarch: heliRoundel, late: lateSign };
