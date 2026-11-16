// The Wellward Way (v14-D1): the walk's first tunnel, from the door in the Foundered Nave's south wall under the moor
// to the floor of the Pit, about 120 m and 14 m down. The Heliarchs cut a way from their hall to the well where the
// old road ends (the Gate with their sun over its door, the bridge over the Gulf, the round room); the wind that comes
// up the Pit from under the world scoured the middle of it round; the fourth people laid one of their tubes, the Line,
// down it from the Nave, and it broke where the wind's bore begins; the Reckoner has taken the round room to lay a new
// sun in its floor. Its spaces (v14/passage/plan.js says where): the Line (the tube: ribbed, silted, two nodes with a
// stalled carrier each, lenses of failing stored daylight), the Flute (a round bore fluted by the wind, its walls
// rimed with points of cold light), the Laid Sun (a domed room, the Reckoner's gold going into its floor, his lamp),
// the Gulf (a crack across the way, crossed by a stair on one arch, black below), then the Gate (square, a stair down
// to a gatehouse standing out of the Pit's wall at its floor). The story: stories/the-wellward-way.md. Dark, sealed
// and stone-sounding by the kit (v14/under.js).
// Draws: the way (one mesh a stretch: five), the room's things, the gold, the portal, the lights' and the rime's
// points (one Points): eight. Lights: sixteen PointLights, each with its owner, and one lens baked only (lights.js keeps the nearest three).
// It opens D0's fall of blocks behind the door (their triangles in the hall's road mesh made degenerate), the Pit's
// throat, the Pit's own rock and the terrain where the portal stands (the same), and leaves heightAt alone.
// ?passage=0 leaves it out.
import * as THREE from 'three';
import { UnderBuilder, underMaterial, installBelow } from './under.js';
import { makePlan, PASSAGE_OFF, KA, KF, MOUTH, START } from './passage/plan.js';
import { DOOR, ROAD_Y } from './coffin-road/plan.js';
import { PIT, pitRim, pitEdge, pitBearing } from '../v4/paths/ground.js';
import { lintelForms, prims } from '../v7/glyphs/forms.js';
import { NOON, GLAZES } from '../v8/strata/noon.js'; // v14-D3: the Noonwrights' palette (their parts: ctx.strata.parts.noon)

const C = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const STONE = C('#6e655c'), STONE_D = C('#4c453f'), ROCK = C('#77707c'), GRIT = C('#8e877a'), ROOM = C('#5b534b'), DOME = C('#4a4440');
const GULF = C('#2f2a26'), IRON = C('#26221f'), WAX = C('#6f6a58'), TIMBER = C('#2a2018'), BED = C('#8c8576'), CHALK = C('#cfc6b2');
const GOLDS = [C('#d8ac3c'), C('#ecc456'), C('#c09432'), C('#f2d070')], RED = C('#6a2a1c'), OCHRE = C('#8a6420'), SLATE = C('#4d5a63');
const WICKER = C('#5e4a2e'), CLOTH = C('#4a1c18'), BRONZE = C('#6b4f2a'), CUT = C('#221e1b');
const DAY = '#f4ead0', COLD = '#bcd2ff', WARM = '#ffc47e'; // stored daylight (the fourth people's, failing), the sounder's lamps (the Pit's starlight), the Reckoner's lamp
const KIND_COL = [DAY, COLD, WARM];
const HELIO = C('#8e7654'), MILK = C('#cdc8b8'), MILK_D = C('#9f9a8a'), SILT = C('#6e6656'), AMBER = C('#8a5a1c'), AMBER_L = C('#b4802e'), OXBLOOD = C('#5e1c16'), LENS = C('#fff6dc'), LENS_D = C('#5f6c63');

export async function build(ctx) {
  if (PASSAGE_OFF) { ctx.passage = { off: true }; return; }
  await ctx.built?.('coffinroad');
  await ctx.built?.('pit'); // (the portal's feet stand on its floor)
  if (!ctx.coffinRoad || ctx.coffinRoad.off) { ctx.passage = { off: true }; return; }
  await Promise.all([ctx.built?.('paths'), ctx.built?.('pit')]);
  const t0 = performance.now();
  const { scene, terrain: T } = ctx;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(14101);
  await ctx.progress?.('the wellward way', 0);
  const P = makePlan(T), SP = P.SP;
  const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const [ox, oz] = [-P.IN[0], -P.IN[1]]; // out from the Pit's centre along the mouth's bearing
  const rOf = (x, z) => Math.hypot(x - PIT.x, z - PIT.z);

  // ---- the baked light: each stretch's own lamps' glow (one colour a mesh), the sky's share ~0 (the Pit's a little at
  // the mouth), no haze
  // pools round each lamp (the cube of the falloff), and in the Gate the Pit's own cold light coming in at the mouth
  const glow = (kinds, R = 9, k = 0.62) => (x, y, z) => {
    let g = 0;
    for (const l of P.lamps) {
      if (!kinds.includes(l.kind)) continue;
      const dx = x - l.x, dy = y - l.y, dz = z - l.z, d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < R * R) { const f = 1 - Math.sqrt(d2) / R; g += f * f * f * (l.kind === 2 ? 1.6 : 1); }
    }
    return Math.min(1.2, g * k);
  };
  const pitLight = (x, y, z) => { const r = rOf(x, z); return r > P.rf + 14 ? 0 : 0.55 * Math.pow(ss(P.rf + 14, P.rf - 1, r), 1.6); };
  const litFor = (kinds, R, k, mouth = false) => { const G = glow(kinds, R, k); return (x, y, z, out) => { out[0] = 0.012; out[1] = 0; out[2] = Math.min(1.2, G(x, y, z) + (mouth ? pitLight(x, y, z) : 0)); return out; }; };
  const builders = {
    line: new UnderBuilder(litFor([0], 7, 0.62)),
    flute: new UnderBuilder(litFor([1], 8.5, 0.95)),
    // (v14-F1) and the lamp's light thrown up off the gold in the floor into the dome, most at its crown
    sun: new UnderBuilder(((L) => (x, y, z, out) => { L(x, y, z, out); const h = y - P.sun.y - 3.0; if (h > 0) { const r = Math.hypot(x - P.sun.x, z - P.sun.z) / P.sun.rc; out[2] = Math.min(1.2, out[2] + 0.26 * Math.min(1, h / 1.5) * Math.max(0, 1 - r * r)); } return out; })(litFor([2], 13.5, 0.95))),
    gulf: new UnderBuilder(litFor([1], 8, 1.0)),
    gate: new UnderBuilder(litFor([1], 8, 1.0, true)),
  };
  const meshOf = (s) => { const k = P.kindAt(s); return k === 'neck' ? 'gulf' : k; };

  // ---- the colours: dressed blocks in courses; the Flute's rock banded along its flutes, its grit in ripples; the room
  const hsh = P.hsh;
  function colour(kind, s, k, v, i, floorStrip) {
    if (kind === 'line') {
      // the Line: milk resin, crazed (a fine darker web), clouded toward its foot; silt drifted in its floor
      if (floorStrip) { const j = 0.85 + 0.25 * hsh(i * 7 + k) + (i % 4 === 0 ? -0.08 : 0); return [SILT[0] * j, SILT[1] * j, SILT[2] * j]; }
      // (the crazing a slow clouding along and round it, not quad by quad)
      // (their hand, NOON: milk glass clouding to bone toward the foot; a band of ox-blood glaze beside each collar; a
      // celadon field pooled thick in the lowest part of the wall; a crust of lime at the silt line)
      const craze = 0.9 + 0.1 * P.nz(s * 0.8 + k * 0.37, 1, 21), rib = (s % 1.2) < 0.41 ? 0.86 : 1, sc = s % 7.2;
      let C0 = v > 1.8 ? NOON.milk : NOON.bone;
      if (sc > 0.45 && sc < 0.95) C0 = NOON.oxbloodD;
      else if (v < 0.35) C0 = NOON.lime;
      else if (v < 0.9 && P.nz(s * 0.35, 1, 33) > 0.1) C0 = NOON.celadonD;
      const j = craze * rib * 0.9;
      return [C0.r * j, C0.g * j, C0.b * j];
    }
    if (kind === 'gate' || kind === 'neck') {
      if (floorStrip) { const b = Math.floor(s / 0.9) * 13 + Math.floor((k + 7) / 2); const j = 0.78 + 0.3 * hsh(b); return [STONE_D[0] * j * 1.1, STONE_D[1] * j * 1.1, STONE_D[2] * j * 1.1]; }
      const c = Math.floor((v + 0.4) / 0.46), b = Math.floor((s + (c % 2) * 0.45) / 0.9), j = 0.8 + 0.34 * hsh(b * 31 + c * 7 + (k > KA / 2 ? 999 : 0));
      const base = v > 2.85 ? STONE_D : STONE; return [base[0] * j, base[1] * j, base[2] * j];
    }
    if (kind === 'flute') {
      if (floorStrip) { const j = (i % 3 === 0 ? 0.86 : 1.04) * (0.94 + 0.1 * hsh(i * 3 + k)); return [GRIT[0] * j, GRIT[1] * j, GRIT[2] * j]; }
      const th = (k / (KA - 1)) * Math.PI, band = 0.82 + 0.22 * Math.sin(th * 9 + s * 0.55 + 0.9) + 0.06 * hsh(i * 41 + k);
      return [ROCK[0] * band, ROCK[1] * band, ROCK[2] * band * 1.04];
    }
    if (kind === 'sun') {
      if (floorStrip) { const j = 0.74 + 0.3 * hsh(Math.floor(s / 0.8) * 7 + k); return [ROOM[0] * j * 0.86, ROOM[1] * j * 0.86, ROOM[2] * j * 0.86]; }
      const c = Math.floor(v / 0.5), j = 0.82 + 0.28 * hsh(c * 17 + Math.floor(s / 0.8) + k * 3);
      if (v <= 3.1) return [ROOM[0] * j, ROOM[1] * j, ROOM[2] * j];
      // (v14-F1) the vault: its courses ringing up to the crown, each a shade off the next and set in pale lime; a band
      // of the Heliarchs' ochre two thirds up (their sun's ring, faded); the Reckoner's lamp's soot gone up the side over it
      const crs = Math.floor((v - 3.1) / 0.62), jc = (crs % 2 ? 0.8 : 1.12) * (0.9 + 0.2 * hsh(crs * 53 + Math.floor(k / 2)));
      const ring = Math.abs(v - (3.1 + 0.82 * SP.RC * 0.62)) < 0.2; // (a level ring on the sphere's section)
      const u = P.section(s).pts[k][0], soot = Math.exp(-((s - SP.SUN - 0.9) ** 2 + (u - 3.1) ** 2) / 4.5) * Math.min(1, Math.max(0, (v - 3.1) / 2.5));
      const base = ring ? OCHRE : DOME, f = (ring ? 1.25 : jc) * (1 - 0.7 * soot);
      return [base[0] * f, base[1] * f, base[2] * f];
    }
    // the Gulf: black-brown, a little lighter in streaks where the wind has worn it
    const j = 0.7 + 0.45 * hsh(i * 13 + k * 7) * (v > -6 ? 1 : 0.6);
    return [GULF[0] * j, GULF[1] * j, GULF[2] * j];
  }

  // ---- the loft: every ring a section at s, each ring joined to the next; the floor strip across between its ends
  const rings = [];
  for (let i = 0; i < P.N; i++) {
    const s = P.S[i], sec = P.section(s), y = P.yAt(s), x0 = P.X[i], z0 = P.Z[i], tx = P.TX[i], tz = P.TZ[i];
    const W = (u, v) => [x0 - tz * u, y + v, z0 + tx * u];
    const arc = sec.pts.map(([u, v]) => W(u, v));
    const fl = []; for (let k = 0; k < KF; k++) { const f = k / (KF - 1), u = -sec.w + 2 * sec.w * f; fl.push(W(u, sec.v0)); }
    fl[0] = arc[KA - 1]; fl[KF - 1] = arc[0];
    rings.push({ s, arc, fl, sec });
  }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  // a quad of the inside: a (this ring, k), a2 (this ring, k+1), b (next ring, k), b2 (next, k+1); the inward normal
  // is (a2 - a) x (b - a) by the rings' order (round the walls from the right floor end, along the line toward the Pit)
  const inQuad = (Bd, a, a2, b, b2, col) => { const n = cross(sub(a2, a), sub(b, a)); Bd.quad(a, a2, b2, b, col, n, 0); };
  for (let i = 0; i < P.N - 1; i++) {
    const A = rings[i], Bn = rings[i + 1], sm = (A.s + Bn.s) / 2, kind = P.kindAt(sm), Bd = builders[meshOf(sm)];
    for (let k = 0; k < KA - 1; k++) {
      const vm = (A.sec.pts[k][1] + A.sec.pts[k + 1][1]) / 2;
      inQuad(Bd, A.arc[k], A.arc[k + 1], Bn.arc[k], Bn.arc[k + 1], colour(kind, sm, k, vm, i, false));
    }
    if (!A.sec.stair && !Bn.sec.stair) for (let k = 0; k < KF - 1; k++) inQuad(Bd, A.fl[k], A.fl[k + 1], Bn.fl[k], Bn.fl[k + 1], colour(kind, sm, k, 0, i, true));
  }
  // where a stair meets a landing between two rings, the landing's floor runs on to the stair's first (or from its last) tread
  for (const [s0, s1] of P.STAIRS) for (const [sa, sb, ys] of [[Math.floor(s0 / P.step) * P.step, s0, s0], [s1, Math.ceil(s1 / P.step) * P.step, s1]]) {
    if (sb - sa < 1e-3) continue;
    const kind = P.kindAt((sa + sb) / 2); if (kind === 'gulf') continue;
    const w = P.section(sa).w, y = P.yAt(ys), Bd = builders[meshOf((sa + sb) / 2)];
    Bd.quad(P.world(sa, -w, 0).map((v, j) => (j === 1 ? y : v)), P.world(sa, w, 0).map((v, j) => (j === 1 ? y : v)), P.world(sb, w, 0).map((v, j) => (j === 1 ? y : v)), P.world(sb, -w, 0).map((v, j) => (j === 1 ? y : v)), colour(kind, sa, 1, 0, 0, true), [0, 1, 0], 0);
  }
  await ctx.progress?.('the wellward way', 0.25);

  // ---- the stairs: treads over the slope, each top at the floor's height at its middle, a riser at its far edge
  let treads = 0;
  for (const [s0, s1, run] of P.STAIRS) {
    const n = Math.max(1, Math.round((s1 - s0) / run)), r = (s1 - s0) / n;
    const inGulf = s0 >= SP.GULF0 - 0.5 && s1 <= SP.GULF1 + 0.5, w = inGulf ? P.BRIDGE : null;
    for (let j = 0; j < n; j++) {
      const sa = s0 + j * r, sb = sa + r, sm = (sa + sb) / 2, yt = P.yAt(sm), Bd = builders[meshOf(sm)];
      const hw = w ?? P.section(sm).w;
      const kind = P.kindAt(sm), col = kind === 'gulf' ? STONE_D : STONE;
      const j0 = 0.85 + 0.25 * hsh(j * 7 + Math.round(s0)), tc = [col[0] * j0, col[1] * j0, col[2] * j0];
      const c = (s, d, y) => { const p = P.at(s), l = Math.hypot(p.tx, p.tz); return [p.x - (p.tz / l) * d, y, p.z + (p.tx / l) * d]; };
      Bd.quad(c(sa, -hw, yt), c(sa, hw, yt), c(sb, hw, yt), c(sb, -hw, yt), tc, [0, 1, 0], 0.06);
      const yn = j < n - 1 ? P.yAt(sb + r / 2) : P.yAt(sb + 0.05);
      const bot = Math.min(yn, yt) - (inGulf ? 0.05 : P.TREAD_DROP);
      const p = P.at(sb);
      Bd.quad(c(sb, -hw, yt), c(sb, hw, yt), c(sb, hw, bot), c(sb, -hw, bot), [tc[0] * 0.7, tc[1] * 0.7, tc[2] * 0.7], [p.tx, 0, p.tz], 0.06);
      // the first tread's own riser up from the landing before it
      if (j === 0) { const yp = P.yAt(sa - 0.05), pa = P.at(sa); if (yp > yt + 0.01) Bd.quad(c(sa, -hw, yp), c(sa, hw, yp), c(sa, hw, yt), c(sa, -hw, yt), [tc[0] * 0.7, tc[1] * 0.7, tc[2] * 0.7], [pa.tx, 0, pa.tz], 0.06); }
      treads++;
    }
  }

  // ---- the Line: the fourth people's tube, made in one piece (no joint, no stone, no iron): its lenses (glass bulbs
  // in collars of the same milk resin, most dark, a few still holding stored daylight), two of their carriers stalled
  // in its nodes (sealed vessels of bottle amber, an ox-blood band round each, one cracked and silted), and its broken
  // end where the wind's bore begins (shards of the tube standing out of the rock)
  {
    const Bd = builders.line, M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), Sc = new THREE.Vector3();
    const place = (x, y, z, dir, up = [0, 1, 0]) => { const f = new THREE.Vector3(...dir).normalize(), u = new THREE.Vector3(...up); const r = new THREE.Vector3().crossVectors(u, f).normalize(); u.crossVectors(f, r); M4.makeBasis(r, u, f); M4.setPosition(x, y, z); return M4.clone(); };
    const inward = (s, d, v) => { const p = P.at(s), l = Math.hypot(p.tx, p.tz), c = P.section(s); void c; const [x, y, z] = P.world(s, d, v), [cx, cy, cz] = P.world(s, 0, 1.6); return [cx - x, cy - y, cz - z]; };
    const NP = ctx.strata?.parts?.noon || null; // the Noonwrights' kit (v8/strata/noon.js): the Line is their hand
    const lens = (s, d, v, lit) => {
      const [x, y, z] = P.world(s, d, v), n = inward(s, d, v);
      if (NP) { NP.lens(Bd, place(x, y, z, n), { r: 0.24, lit: lit ? 1 : 0, rim: lit ? NOON.oxblood : NOON.celadonD, bulge: 2.4 }); return; }
      Bd.geo(new THREE.TorusGeometry(0.27, 0.07, 6, 14), place(x, y, z, n), MILK_D, 0.05);
      Bd.geo(new THREE.SphereGeometry(0.2, 10, 7), place(x + n[0] * 0.03, y + n[1] * 0.03, z + n[2] * 0.03, n), lit ? LENS : LENS_D, 0.04);
    };
    for (const l of P.lamps) if (l.kind === 0) lens(l.s, l.d, l.v, true);
    lens(P.DARK_LENS[0], P.DARK_LENS[1], P.DARK_LENS[2], false);
    for (let s = 5.5; s < SP.LINE - 3; s += 7.2) if (!P.lamps.some((l) => l.kind === 0 && Math.abs(l.s - s) < 2.5)) lens(s, (Math.floor(s) % 2 ? 1 : -1) * 1.3, 2.6, false);
    // the carriers: one lying along the first node's side, one rolled and cracked in the second, silt drifted on it
    const carrier = (s, d, roll, crack) => {
      const p = P.at(s), l = Math.hypot(p.tx, p.tz), dir = [p.tx / l, 0, p.tz / l], y = P.yAt(s);
      const [x, , z] = P.world(s, d, 0), cy = y + 0.58;
      const m = place(x, cy, z, dir, [Math.sin(roll), Math.cos(roll), 0]), rot = new THREE.Matrix4().makeRotationX(Math.PI / 2);
      if (NP) { // a lesser carrier of theirs, stalled where it stopped
        NP.carrier(Bd, place(x, y + 0.66, z, dir), { r: 0.68, len: 3.1, form: crack ? 'gourd' : 'long', roll, crack, lit: 0, net: false, seed: crack ? 41 : 17, full: !low });
        Bd.box(x, y + 0.05, z, 1.4, 0.07, 0.8, Math.atan2(-dir[2], dir[0]), SILT, SILT, 0.1);
        if (ctx.addCollider) { const [ax, , az] = P.world(s - 1.6, d, 0), [bx, , bz] = P.world(s + 1.6, d, 0); ctx.addCollider({ x1: ax, z1: az, x2: bx, z2: bz, r: 0.7, y: y - 0.1, h: 1.45, stand: false }); }
        return;
      }
      Bd.geo(new THREE.CapsuleGeometry(0.58, 2.1, 5, 12), m.clone().multiply(rot), (nx, ny) => (ny > 0.5 ? AMBER_L : AMBER), 0.06);
      Bd.geo(new THREE.TorusGeometry(0.6, 0.06, 6, 16), m, OXBLOOD, 0.05);
      for (const e of [-1.2, 1.2]) Bd.geo(new THREE.TorusGeometry(0.42, 0.05, 6, 14), m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, e)), MILK_D, 0.05);
      if (crack) for (let k = 0; k < 5; k++) { const a = 0.4 + k * 0.5, [qx, , qz] = P.world(s + (k - 2) * 0.35, d, 0); Bd.beam([qx, cy + 0.59 * Math.cos(a), qz], [qx + dir[0] * 0.3, cy + 0.59 * Math.cos(a + 0.4), qz + dir[2] * 0.3], 0.012, CUT, 0); }
      // the silt it lies in
      Bd.box(x, y + 0.05, z, 1.4, 0.07, 0.8, Math.atan2(-dir[2], dir[0]), SILT, SILT, 0.1);
      if (ctx.addCollider) { const [ax, , az] = P.world(s - 1.6, d, 0), [bx, , bz] = P.world(s + 1.6, d, 0); ctx.addCollider({ x1: ax, z1: az, x2: bx, z2: bz, r: 0.62, y: y - 0.1, h: 1.25, stand: false }); }
    };
    const n1 = (P.NODES[0][0] + P.NODES[0][1]) / 2, n2 = (P.NODES[1][0] + P.NODES[1][1]) / 2;
    carrier(n1, 1.55, 0.05, false);
    carrier(n2, -1.5, 0.9, true);
    // their collars where the lengths were joined (every 7.2 m: the loft's own collar groove), glazed in their fields,
    // a band of ox-blood beside each and a row of amber cells; the arc stands above the silt
    if (NP) for (let s = 7.2, k = 0; s < SP.LINE - 1; s += 7.2, k++) {
      const p = P.at(s + 0.2), l = Math.hypot(p.tx, p.tz), dir = [p.tx / l, 0, p.tz / l], sec = P.section(s + 0.2), c = sec.pts[Math.floor(KA / 2)][1] - (sec.pts[Math.floor(KA / 2)][1] - sec.pts[0][1]) / 2;
      const [x, y, z] = P.world(s + 0.2, 0, 1.35 + 0.35 * P.nodeAt(s)), R = 1.95 + 0.95 * P.nodeAt(s) - 0.12;
      void c; NP.collar(Bd, place(x, y, z, dir), { r: R, t: 0.15, a0: -2.35, a1: 2.35, glaze: GLAZES[k % GLAZES.length], cells: low ? 4 : 7, seg: low ? 30 : 44 });
    }
    // the broken end: shards of the tube's wall standing out of the rock round the bore's mouth
    for (let k = 0; k < (low ? 9 : 14); k++) {
      const a = (k / 14) * Math.PI * 2 + rng() * 0.3, s0 = SP.LINE + 0.3 + rng() * 0.6, R = 2.05;
      const d = Math.cos(a) * R, v = 1.45 + Math.sin(a) * R; if (v < 0.2) continue;
      const [x, y, z] = P.world(s0, d, v), [x2, y2, z2] = P.world(s0 + 0.6 + rng() * 0.9, d * 0.92, 1.45 + (v - 1.45) * 0.92);
      Bd.beam([x, y, z], [x2, y2, z2], 0.05 + rng() * 0.05, MILK_D, 0.1);
    }
  }

  // ---- the sounder's lamps: an iron spike driven into the rock, a hanging cage, a bead of cold light (the Points')
  // (v15-F1, #63) the spike is driven 6 cm into the wall where the section's wall crosses its height on its side (it
  // was a fixed 0.5 m out from the cage, and stopped up to 0.35 m short of the rock)
  const wallAt = (s, d, v) => {
    const sec = P.section(s), side = Math.sign(d) || 1; let best = null;
    for (let k = 0; k < sec.pts.length - 1; k++) {
      const a = sec.pts[k], b = sec.pts[k + 1]; if ((a[1] - v) * (b[1] - v) > 0 || a[1] === b[1]) continue;
      const x = a[0] + (b[0] - a[0]) * (v - a[1]) / (b[1] - a[1]);
      if (x * side > d * side && (best === null || x * side < best * side)) best = x;
    }
    return best === null ? d + side * 0.5 : best + side * 0.06;
  };
  const lampHang = (Bd, l) => {
    const side = Math.sign(l.d) || 1, wallD = wallAt(l.s, l.d, l.v + 0.35);
    const [wx, wy, wz] = P.world(l.s, wallD, l.v + 0.35), [hx, hy, hz] = P.world(l.s, l.d, l.v + 0.35);
    Bd.beam([wx, wy, wz], [hx, hy, hz], 0.015, IRON, 0.04);
    Bd.beam([hx, hy, hz], [hx, hy - 0.2, hz], 0.006, IRON, 0.02);
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) Bd.beam([hx + a * 0.06, hy - 0.42, hz + b * 0.06], [hx + a * 0.06, hy - 0.2, hz + b * 0.06], 0.007, IRON, 0.03);
    Bd.box(hx, hy - 0.43, hz, 0.075, 0.012, 0.075, 0, IRON); Bd.box(hx, hy - 0.2, hz, 0.075, 0.012, 0.075, 0, IRON);
  };
  for (const l of P.lamps) if (l.kind === 1 && P.kindAt(l.s) === 'flute') lampHang(builders.flute, l);
  for (const l of P.lamps) if (l.kind === 1 && P.kindAt(l.s) === 'gate') lampHang(builders.gate, l);

  // ---- the Gulf's bridge: one arch from cliff to cliff, its body solid to the deck, the stair's treads on it, iron
  // posts with the sounder's lamps at its ends and its middle
  {
    const Bd = builders.gulf, s0 = SP.GULF0 - 0.2, s1 = SP.GULF1 + 0.2, n = Math.ceil((s1 - s0) / 0.4), hw = P.BRIDGE;
    const spring = P.yAt(SP.GULF0) - 6.2, crownDrop = 1.1;
    const under = (s) => { const f = (s - s0) / (s1 - s0), deck = P.yAt(s) - 0.05; return Math.min(deck - crownDrop, spring + (deck - crownDrop - spring) * Math.pow(Math.sin(Math.PI * f), 0.55)); };
    let prev = null;
    for (let j = 0; j <= n; j++) {
      const s = s0 + (s1 - s0) * (j / n), p = P.at(s), l = Math.hypot(p.tx, p.tz), rx = -p.tz / l, rz = p.tx / l;
      const top = P.yAt(Math.min(SP.GULF1 - 0.4, Math.max(SP.GULF0 + 0.4, s))) - 0.05, bot = under(s), b2 = 0.08 * ss(top - 2, bot, bot);
      const ring = [[p.x + rx * hw, top, p.z + rz * hw], [p.x + rx * (hw + b2), bot, p.z + rz * (hw + b2)], [p.x - rx * (hw + b2), bot, p.z - rz * (hw + b2)], [p.x - rx * hw, top, p.z - rz * hw]];
      if (prev) {
        const sm = s - (s1 - s0) / n / 2, jj = 0.75 + 0.3 * hsh(j * 5);
        const sc = [STONE_D[0] * jj, STONE_D[1] * jj, STONE_D[2] * jj];
        // outward: the right side, the underside (the arch's intrados), the left side
        for (const [a, b, hint] of [[0, 1, [rx, 0, rz]], [1, 2, [0, -1, 0]], [2, 3, [-rx, 0, -rz]]]) Bd.quad(prev[a], ring[a], ring[b], prev[b], sc, hint, 0.05);
        void sm;
      }
      prev = ring;
    }
    // a kerb along each side of the deck
    for (const side of [-1, 1]) for (let j = 0; j < n; j++) {
      const sa = s0 + (s1 - s0) * (j / n), sb = s0 + (s1 - s0) * ((j + 1) / n);
      const A = P.world(sa, side * (hw - 0.06), 0), Bq = P.world(sb, side * (hw - 0.06), 0);
      const ya = P.yAt(Math.min(SP.GULF1 - 0.4, Math.max(SP.GULF0 + 0.4, sa))), yb = P.yAt(Math.min(SP.GULF1 - 0.4, Math.max(SP.GULF0 + 0.4, sb)));
      Bd.beam([A[0], ya + 0.07, A[2]], [Bq[0], yb + 0.07, Bq[2]], 0.07, STONE, 0.05);
    }
    for (const l of P.lamps) if (l.kind === 1 && (P.kindAt(l.s) === 'gulf' || P.kindAt(l.s) === 'neck')) {
      const side = Math.sign(l.d), [px, py, pz] = P.world(l.s, side * (hw - 0.06), 0), yb = P.yAt(Math.min(SP.GULF1 - 0.4, Math.max(SP.GULF0 + 0.4, l.s)));
      Bd.beam([px, yb, pz], [px, yb + 1.95, pz], 0.035, IRON, 0.04);
      const [hx, hy, hz] = P.world(l.s, l.d, 0);
      Bd.beam([px, yb + 1.9, pz], [hx, yb + 1.9, hz], 0.015, IRON, 0.04);
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) Bd.beam([hx + a * 0.06, l.y - 0.07, hz + b * 0.06], [hx + a * 0.06, l.y + 0.15, hz + b * 0.06], 0.007, IRON, 0.03);
      Bd.box(hx, l.y - 0.08, hz, 0.075, 0.012, 0.075, 0, IRON); Bd.box(hx, l.y + 0.16, hz, 0.075, 0.012, 0.075, 0, IRON);
      Bd.beam([hx, yb + 1.9, hz], [hx, l.y + 0.16, hz], 0.006, IRON, 0.02);
    }
  }
  await ctx.progress?.('the wellward way', 0.45);

  // ---- the Laid Sun: the Reckoner's new sun going into the room's floor, in the gold picked out of the others
  const G = new UnderBuilder(litFor([2], 11, 0.75));
  const RB = builders.sun;
  const sun = P.sun, fy = sun.y;
  const sunW = (r, a) => { // the room's floor at radius r, angle a (0 along the axis toward the Pit, + to the right)
    const rx = -sun.uz, rz = sun.ux;
    return [sun.x + (sun.ux * Math.cos(a) + rx * Math.sin(a)) * r, sun.z + (sun.uz * Math.cos(a) + rz * Math.sin(a)) * r];
  };
  const rays = 16, done = new Set([3, 4, 5, 6, 7]), half = 8; // rays finished; ray 8 half done (the work goes round)
  const workA = ((half + 0.5) / rays) * Math.PI * 2;
  {
    // the setting bed: a disc of lime a little proud of the flags
    const n = 48;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, [x0, z0] = sunW(sun.r, a0), [x1, z1] = sunW(sun.r, a1);
      const jj = 0.92 + 0.12 * hsh(i);
      RB.tri([sun.x, fy + 0.02, sun.z], [x0, fy + 0.02, z0], [x1, fy + 0.02, z1], [BED[0] * jj, BED[1] * jj, BED[2] * jj], [0, 1, 0], 0.05);
      // its edge
      RB.quad([x0, fy + 0.02, z0], [x1, fy + 0.02, z1], [x1, fy - 0.02, z1], [x0, fy - 0.02, z0], BED, [x0 - sun.x, 0, z0 - sun.z], 0.05);
    }
    // the chalk: the design laid out where the gold has not come yet (the rays' edges, two rings)
    const chalk = (r0, a0, r1, a1, w = 0.012) => {
      const [x0, z0] = sunW(r0, a0), [x1, z1] = sunW(r1, a1), dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1, nx = -dz / l * w, nz = dx / l * w;
      RB.quad([x0 - nx, fy + 0.026, z0 - nz], [x0 + nx, fy + 0.026, z0 + nz], [x1 + nx, fy + 0.026, z1 + nz], [x1 - nx, fy + 0.026, z1 - nz], CHALK, [0, 1, 0], 0.08);
    };
    for (let i = 0; i < 64; i++) { const a0 = (i / 64) * Math.PI * 2, a1 = ((i + 1) / 64) * Math.PI * 2; chalk(1.25, a0, 1.25, a1); chalk(2.95, a0, 2.95, a1); }
    const rayW = (r) => 0.21 * (1 - (r - 1.3) / 1.9) + 0.015; // a ray's half-width (rad) narrowing out
    for (let k = 0; k < rays; k++) {
      if (done.has(k)) continue;
      const ac = ((k + 0.5) / rays) * Math.PI * 2;
      chalk(1.3, ac - rayW(1.3), 3.0, ac - 0.015); chalk(1.3, ac + rayW(1.3), 3.0, ac + 0.015);
    }
    // the gold: the centre's disc all laid, five rays and half a sixth; each piece its own small tilt, so the lamp
    // catches a few at a time; the gaps between them the bed
    const tess = (x, z, s, col) => {
      const tx = (hsh(x * 91.3 + z * 7.1) - 0.5) * 0.24, tz = (hsh(x * 13.7 - z * 51.9) - 0.5) * 0.24, y = fy + 0.035 + hsh(x * 3.1 + z * 9.7) * 0.006;
      const yy = (dx, dz) => y + dx * tx + dz * tz;
      G.quad([x - s, yy(-s, -s), z - s], [x + s, yy(s, -s), z - s], [x + s, yy(s, s), z + s], [x - s, yy(-s, s), z + s], col, [-tx, 1, -tz], 0.06);
    };
    const pitch = low ? 0.1 : 0.085, ts = pitch * 0.42;
    const rx = -sun.uz, rz = sun.ux;
    for (let u = -3.2; u <= 3.2; u += pitch) for (let w = -3.2; w <= 3.2; w += pitch) {
      const r = Math.hypot(u, w); if (r > 3.05) continue;
      let a = Math.atan2(w, u); if (a < 0) a += Math.PI * 2;
      let lay = r < 1.2;
      if (!lay && r > 1.3) {
        const k = Math.floor((a / (Math.PI * 2)) * rays), ac = ((k + 0.5) / rays) * Math.PI * 2, inRay = Math.abs(a - ac) < rayW(r) * (r < 3 ? 1 : 0);
        lay = inRay && (done.has(k) || (k === half && r < 2.15));
      }
      if (!lay) continue;
      const x = sun.x + sun.ux * u + rx * w, z = sun.z + sun.uz * u + rz * w;
      const g = GOLDS[Math.floor(hsh(u * 17.3 + w * 3.9) * GOLDS.length)];
      tess(x, z, ts, g);
    }
    // the rim's band: his eleven glyphs cut in the bed, the first three inlaid
    const forms = lintelForms(ctx);
    for (let gi = 0; gi < forms.length; gi++) {
      const ac = ((gi + 0.5) / forms.length) * Math.PI * 2 + workA, { segs, dots } = prims(forms[gi]), sc = 0.2, rc = 3.13;
      const col = gi < 3 ? GOLDS[1] : CUT, Bg = gi < 3 ? G : RB;
      // glyph units to the floor: x along the rim (tangent), y outward
      const toW = (gx, gy) => { const r = rc + gy * sc, a = ac + (gx * sc) / rc; return sunW(r, a); };
      for (const [ax, ay, bx, by] of segs) {
        const [x0, z0] = toW(ax, ay), [x1, z1] = toW(bx, by), dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1, nx = -dz / l * 0.012, nz = dx / l * 0.012, yy = fy + 0.03;
        Bg.quad([x0 - nx, yy, z0 - nz], [x0 + nx, yy, z0 + nz], [x1 + nx, yy, z1 + nz], [x1 - nx, yy, z1 - nz], col, [0, 1, 0], 0.05);
      }
      for (const [dx, dy] of dots) { const [x, z] = toW(dx, dy); Bg.box(x, fy + 0.03, z, 0.018, 0.004, 0.018, 0, col, col, 0.05); }
    }
    // the work: the kneeling-pad at the half-done ray's end, the trowel, the basket of gold (and a few red and ochre
    // pieces from the Nave's rays, and one of the court's grey), his wire with its beads, his lamp on its tripod
    const [kx, kz] = sunW(2.5, workA);
    RB.box(kx, fy + 0.05, kz, 0.3, 0.03, 0.22, workA, CLOTH, CLOTH, 0.06);
    const [twx, twz] = sunW(2.3, workA - 0.22);
    RB.box(twx, fy + 0.035, twz, 0.07, 0.004, 0.045, workA + 0.6, IRON, IRON, 0.04);
    const [thx, thz] = sunW(2.42, workA - 0.27);
    RB.beam([twx, fy + 0.04, twz], [thx, fy + 0.06, thz], 0.014, TIMBER);
    const [bkx, bkz] = sunW(3.7, workA - 0.18);
    const ringB = []; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ringB.push([bkx + Math.cos(a) * 0.27, bkz + Math.sin(a) * 0.27]); }
    RB.prism(ringB, fy, fy + 0.14, WICKER, WICKER, 0.18);
    ctx.addCollider?.({ x: bkx, z: bkz, r: 0.32, y: fy, h: 0.25, stand: false }); // the basket
    for (let i = 0; i < (low ? 40 : 70); i++) {
      const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 0.24, h = (1 - (r / 0.25) ** 2) * 0.08;
      const col = i % 23 === 0 ? RED : i % 31 === 0 ? OCHRE : i === 7 ? SLATE : GOLDS[i % 4];
      const x = bkx + Math.cos(a) * r, z = bkz + Math.sin(a) * r, s = 0.03, y = fy + 0.145 + h, tx = (rng() - 0.5) * 0.9, tz = (rng() - 0.5) * 0.9;
      (col === RED || col === OCHRE || col === SLATE ? RB : G).quad([x - s, y - s * tx, z - s], [x + s, y - s * tz, z - s], [x + s, y + s * tx, z + s], [x - s, y + s * tz, z + s], col, [-tx, 1, -tz], 0.05);
    }
    // the wire: a flat spiral of bronze on the bed beside the pad, a bead strung on it for every ray laid
    const [wx, wz] = sunW(2.75, workA + 0.3);
    let pp = null; for (let i = 0; i <= 60; i++) { const t = i / 60, a = t * Math.PI * 6, r = 0.02 + t * 0.15, p = [wx + Math.cos(a) * r, fy + 0.04, wz + Math.sin(a) * r]; if (pp) RB.beam(pp, p, 0.0035, BRONZE, 0.02); pp = p; if (i % 11 === 10 && i < 60) RB.box(p[0], p[1] + 0.005, p[2], 0.012, 0.012, 0.012, a, BRONZE, BRONZE, 0.05); }
    // his lamp: a bronze bowl on a tripod, the flame the Points' (P.lamps' kind 2 is its flame)
    const L2 = P.lamps.find((l) => l.kind === 2);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.3; RB.beam([L2.x + Math.cos(a) * 0.17, fy, L2.z + Math.sin(a) * 0.17], [L2.x + Math.cos(a) * 0.03, L2.y - 0.12, L2.z + Math.sin(a) * 0.03], 0.012, BRONZE, 0.04); }
    const bowl = []; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; bowl.push([L2.x + Math.cos(a) * 0.09, L2.z + Math.sin(a) * 0.09]); }
    RB.prism(bowl, L2.y - 0.13, L2.y - 0.05, BRONZE, BRONZE, 0.06);
    // the Heliarchs' bench round the drum, broken at the two ways in
    const nb = 40;
    for (let i = 0; i < nb; i++) {
      const a0 = (i / nb) * Math.PI * 2, a1 = ((i + 1) / nb) * Math.PI * 2, am = (a0 + a1) / 2;
      if (Math.abs(Math.sin(am)) < 0.42 && true) continue; // the axis ends (the ways in)
      const q = [sunW(sun.rc - 0.05, a0), sunW(sun.rc - 0.05, a1), sunW(sun.rc - 0.5, a1), sunW(sun.rc - 0.5, a0)];
      RB.prism(q, fy, fy + 0.44, STONE_D, STONE, 0.1);
    }
  }
  await ctx.progress?.('the wellward way', 0.6);

  // ---- the Pit's door: a gatehouse of dressed stone standing out of the wall at its foot, the way through it, the old
  // sun over the lintel (its gold gone), one of the sounder's lamps on a bracket by it; seen from the Pit's floor
  const glowPO = glow([2], 8, 0.55); // the warm lamp by the door
  const PO = new UnderBuilder((x, y, z, out) => { out[0] = 0.2; out[1] = 0.18; out[2] = glowPO(x, y, z); return out; });
  const portal = (() => {
    const M = P.M, Y = P.YM, rx = -oz, rz = ox; // across the mouth (its right, looking out of the passage... any)
    const W = (along, lat, y) => [M[0] + ox * along + rx * lat, y, M[1] + oz * along + rz * lat];
    const yaw = Math.atan2(ox, oz) - Math.PI / 2;
    const f0 = -MOUTH.portal, f1 = 1.6, depth = (f1 - f0) / 2, mid = (f0 + f1) / 2;
    // (v15-F1, #60) each box's back (in the rock, toward the passage) is drawn a few millimetres short of the last's, so
    // two boxes that share it never lay two faces in one plane where they overlap
    let bi = 0;
    const box = (along, lat, y, ha, hl, hy, col, colTop = col) => { const k = 0.0016 * bi++; const [x, , z] = W(along - k / 2, lat, 0); PO.box(x, y, z, ha - k / 2, hy, hl, yaw, col, colTop, 0.1); };
    const open = 1.2, top = Y + 3.25, outer = 3.5, order = 1.75;
    // the piers in courses of dressed blocks (the way through is between them), an inner order of jambs and a lintel
    // stepped in from the face, the lintel block over all, the cornice, the face's rough surround
    let ci = 0;
    for (const s of [-1, 1]) for (let y0 = Y - 0.6; y0 < Y + 7.4; y0 += 0.62) {
      const hy = Math.min(0.31, (Y + 7.4 - y0) / 2), j = 0.78 + 0.32 * hsh(ci++ * 7.3 + s), c = [STONE[0] * j, STONE[1] * j, STONE[2] * j];
      const inner = y0 < top ? order : open; // below the lintel the face steps in to the inner order
      box(mid, s * (inner + (outer - inner) / 2), y0 + hy, depth, (outer - inner) / 2, hy, c, c);
      if (y0 < top) box(mid + 0.35, s * (open + (order - open) / 2), y0 + hy, depth - 0.35, (order - open) / 2, hy, [c[0] * 0.8, c[1] * 0.8, c[2] * 0.8]);
    }
    // (v15-F1, #60) the lintel block's soffit sits 4 cm up inside the inner lintel, and the inner lintel's face 2 cm back
    // of the jambs': with both soffits at `top` the way's ceiling was two faces in one plane, and it flickered in bands
    box(mid + 0.01, 0, top + 2.14, depth - 0.01, open + 0.02, 2.06, STONE, STONE_D);
    box(mid + 0.36, 0, top + 0.12, depth - 0.36, order - 0.02, 0.12, STONE_D);
    box(f0 - 0.12, 0, Y + 6.9, 0.2, outer + 0.3, 0.22, STONE_D);
    for (let i = 0; i < 14; i++) { const lat = (rng() - 0.5) * 2 * (outer + 0.6), h = 0.3 + rng() * 0.5, a = f0 + 0.2 + rng() * 0.6; rng(); const hl = 0.4 + rng() * 0.5; box(a + ((i * 3) % 14) * 0.004, lat, Y + 6.9 + ((i * 5) % 14) * 0.069 + h, 0.5, hl, h, STONE_D); } // (each bottom and back its own: none share a plane)
    // the sun over the door: a boss and its rays in relief, its sockets empty (the Heliarchs')
    const [sx, , sz] = W(f0 - 0.06, 0, 0), sy = top + 1.95, R = 0.62;
    const P3 = (r, a) => [sx + rx * Math.cos(a) * r, sy + Math.sin(a) * r, sz + rz * Math.cos(a) * r];
    for (let i = 0; i < 20; i++) {
      const a0 = (i / 20) * Math.PI * 2, a1 = ((i + 1) / 20) * Math.PI * 2;
      PO.tri([sx - ox * 0.05, sy, sz - oz * 0.05], P3(R, a0), P3(R, a1), STONE_D, [-ox, 0, -oz], 0.15);
      if (i % 2 === 0) PO.tri(P3(R + 0.04, a0), P3(R + 0.04, a1), P3(R * 1.9, (a0 + a1) / 2), STONE, [-ox, 0, -oz], 0.15);
    }
    for (let i = 0; i < 18; i++) { const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * R * 0.9, p = P3(r, a), o = 0.07 + i * 0.004; PO.box(p[0] - ox * o, p[1], p[2] - oz * o, 0.035, 0.035, 0.035, yaw, CUT, CUT, 0.05); } // (each its own depth: two that overlap never share a face's plane)
    // a threshold of three slabs where the passage's floor ends
    for (let i = 0; i < 3; i++) box(f0 + 0.35 + i * 0.62, 0, Y - 0.1, 0.3, open - 0.02, 0.12, STONE_D, STONE);
    // the lamp, on an iron bracket out of the right pier's face
    const LO = P.lamps.find((l) => l.outside), lampAt = [LO.x, LO.y, LO.z];
    const [bx, , bz] = W(f0 - 0.02, open + 0.8, 0);
    PO.beam([bx, Y + 2.85, bz], [lampAt[0], Y + 2.85, lampAt[2]], 0.02, IRON, 0.04);
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) PO.beam([lampAt[0] + a * 0.07, Y + 2.38, lampAt[2] + b * 0.07], [lampAt[0] + a * 0.07, Y + 2.66, lampAt[2] + b * 0.07], 0.008, IRON, 0.03);
    PO.box(lampAt[0], Y + 2.37, lampAt[2], 0.09, 0.012, 0.09, 0, IRON); PO.box(lampAt[0], Y + 2.67, lampAt[2], 0.09, 0.012, 0.09, 0, IRON);
    PO.beam([lampAt[0], Y + 2.67, lampAt[2]], [lampAt[0], Y + 2.85, lampAt[2]], 0.006, IRON, 0.02);
    // the Heliarchs' frame round the mouth, so it is found from across the floor: their hexagon (flat-topped, its
    // foot under the floor) in raised warm stone on the face, a roundel at each of its corners
    const hx = (lat, y) => [M[0] + ox * (f0 - 0.1) + rx * lat, y, M[1] + oz * (f0 - 0.1) + rz * lat];
    // (v15-F1, #63) its two feet stand 6 cm into the Pit's floor where they meet it (at Y - 0.61 they hung under it, in
    // the floor's own hole at the wall's foot)
    const foot = (lat) => { const [x, , z] = hx(lat, 0), f = ctx.pit?.bowl?.(x, z); return (Number.isFinite(f) ? f + 0.04 : Y) - 0.06; };
    const HEX = [[-1.45, foot(-1.45)], [-2.9, Y + 1.9], [-1.45, Y + 4.41], [1.45, Y + 4.41], [2.9, Y + 1.9], [1.45, foot(1.45)]];
    for (let i = 0; i < 5; i++) PO.beam(hx(...HEX[i]), hx(...HEX[i + 1]), 0.11, HELIO, 0.06);
    const face = new THREE.Matrix4().makeBasis(new THREE.Vector3(rx, 0, rz), new THREE.Vector3(-ox, 0, -oz), new THREE.Vector3(0, 1, 0));
    for (const [lat, y] of HEX.slice(1, 5)) {
      const [x0, y0, z0] = hx(lat, y), m = face.clone().setPosition(x0 - ox * 0.06, y0, z0 - oz * 0.06);
      PO.geo(new THREE.CylinderGeometry(0.34, 0.38, 0.16, 18), m, HELIO, 0.05);
      PO.geo(new THREE.CylinderGeometry(0.14, 0.16, 0.24, 12), m, STONE_D, 0.05);
    }
    // what stops a walker (walls of capsules from under the floor to over the lintel): each pier's face, its outer side
    // running on back into the wall, the recess's side, the inner jamb's face and the reveal of the way through
    if (ctx.addCollider) {
      const wall = (a0, l0, a1, l1, r = 0.18) => { const [x1, , z1] = W(a0, l0, 0), [x2, , z2] = W(a1, l1, 0); ctx.addCollider({ x1, z1, x2, z2, r, y: Y - 1, h: 10, stand: false }); };
      for (const s of [-1, 1]) {
        wall(f0 + 0.18, s * order, f0 + 0.18, s * (outer + 0.1));
        wall(f0, s * (outer + 0.18), f1 + 3, s * (outer + 0.18));
        wall(f0 + 0.1, s * (order + 0.15), f0 + 0.6, s * (order + 0.15));
        wall(f0 + 0.85, s * open, f0 + 0.85, s * order);
        wall(f0 + 0.7, s * (open + 0.15), f1 + 0.3, s * (open + 0.15));
      }
    }
    return { W, f0, f1, open, order, top, outer, lamp: { x: lampAt[0], y: Y + 2.5, z: lampAt[2] } };
  })();

  // ---- the meshes: one a stretch, each its own glow colour; far fades each to black
  const meshes = [];
  const FAR = { line: [12, 30], flute: [14, 34], sun: [16, 36], gulf: [9, 26], gate: [14, 34] };
  const GLOWC = { line: DAY, flute: COLD, sun: WARM, gulf: COLD, gate: COLD };
  for (const [name, Bd] of Object.entries(builders)) {
    const mat = underMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.02 }), 'passage-' + name, GLOWC[name], { far: FAR[name] });
    const m = new THREE.Mesh(Bd.geometry(), mat); m.name = 'passage-' + name; m.castShadow = false; m.receiveShadow = true;
    scene.add(m); meshes.push(m);
  }
  const gmat = underMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.85 }), 'passage-gold', WARM, { far: [14, 34] });
  const gold = new THREE.Mesh(G.geometry(), gmat); gold.name = 'passage-gold'; gold.receiveShadow = true; scene.add(gold); meshes.push(gold);
  const pmat = underMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.02 }), 'passage-portal', WARM);
  const portalMesh = new THREE.Mesh(PO.geometry(), pmat); portalMesh.name = 'passage-portal'; portalMesh.castShadow = true; portalMesh.receiveShadow = true; scene.add(portalMesh); meshes.push(portalMesh);
  await ctx.progress?.('the wellward way', 0.75);

  // ---- the points: the flames and the beads of the lamps; the Flute's rime; the Gulf's motes going up
  const PT = []; // [x, y, z, size, phase, kind] kind 0 a lens's stored daylight, 1 cold bead, 2 warm flame, 3 rime, 4 mote
  for (const l of P.lamps) PT.push([l.x, l.y + (l.kind === 1 ? -0.08 : 0), l.z, l.kind === 1 ? 0.12 : l.kind === 2 ? 0.17 : 0.16, rng() * 40, l.kind]);
  {
    const n = low ? 420 : 760;
    for (let i = 0; i < n; i++) {
      const s = SP.LINE + 1.5 + rng() * (SP.SUN - SP.RC - SP.LINE - 1.5), sec = P.section(s);
      const k = 2 + Math.floor(rng() * (KA - 4)), f = rng(), a = sec.pts[k], b = sec.pts[k + 1];
      const u = (a[0] + (b[0] - a[0]) * f) * 0.985, v = (a[1] + (b[1] - a[1]) * f) * 0.985 + 0.01;
      if (v < 0.25) continue;
      const [x, y, z] = P.world(s, u, v), big = rng() < 0.06;
      // thicker toward the Pit (the wind's end of it), and in drifts along the flutes
      if (rng() > 0.35 + 0.65 * (s - SP.LINE) / (SP.SUN - SP.RC - SP.LINE) && !big) continue;
      PT.push([x, y, z, big ? 0.035 : 0.016 + rng() * 0.012, rng() * 40, 3]);
    }
    for (let i = 0; i < (low ? 70 : 130); i++) {
      const s = SP.GULF0 + 1 + rng() * (SP.GULF1 - SP.GULF0 - 2), side = rng() < 0.5 ? -1 : 1, d = side * (1.4 + rng() * 9);
      const [x, y, z] = P.world(s, d, -17);
      PT.push([x, y, z, 0.03 + rng() * 0.02, rng() * 40, 4]);
    }
  }
  const pts = new Float32Array(PT.length * 3), pat = new Float32Array(PT.length * 3);
  PT.forEach(([x, y, z, sz, ph, k], i) => { pts.set([x, y, z], i * 3); pat.set([sz, ph, k], i * 3); });
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  pg.setAttribute('aP', new THREE.BufferAttribute(pat, 3));
  const pmatF = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uScale: { value: 400 }, uC0: { value: new THREE.Color(DAY) }, uC1: { value: new THREE.Color(COLD) }, uC2: { value: new THREE.Color(WARM) } }]),
    vertexShader: `uniform float uTime, uScale; attribute vec3 aP; varying float vI; varying float vK; varying float vKind;
      #include <fog_pars_vertex>
      void main() {
        float ph = aP.y, kind = aP.z, fl = 0.82 + 0.1 * sin(uTime * 11.0 + ph) + 0.08 * sin(uTime * 23.0 + ph * 2.3);
        vec3 transformed = position;
        if (kind > 3.5) { float h = mod(uTime * 0.35 + ph * 1.7, 22.0); transformed.y += h; fl = smoothstep(0.0, 3.0, h) * (1.0 - smoothstep(16.0, 22.0, h)); }
        else if (kind > 2.5) { fl = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (0.6 + fract(ph) * 1.4) + ph * 3.1), 3.0); }
        else if (kind > 0.5 && kind < 1.5) { fl = 0.9 + 0.1 * sin(uTime * 1.7 + ph); }
        else if (kind < 0.5) { fl = 0.8 + 0.12 * sin(uTime * 0.37 + ph) - 0.35 * smoothstep(0.93, 1.0, sin(uTime * 0.13 + ph * 1.7)); } // stored daylight, failing: a slow ebb, now and then a dip
        vec4 mvPosition = viewMatrix * vec4(transformed, 1.0); gl_Position = projectionMatrix * mvPosition;
        float d = -mvPosition.z, px = aP.x * uScale / max(d, 0.1);
        float core = kind > 2.5 ? max(px, 1.1) : max(px * fl, 2.2), S = clamp(core * (kind > 2.5 ? 2.6 : 3.5), 3.0, 64.0);
        vK = core / S; vI = fl * (kind > 2.5 ? 1.0 : 1.0 + 1.2 * clamp((4.0 - px) / 4.0, 0.0, 1.0)); vKind = kind;
        gl_PointSize = S;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uC0, uC1, uC2; varying float vI; varying float vK; varying float vKind;
      #include <fog_pars_fragment>
      void main() {
        vec2 c = (gl_PointCoord - 0.5) * 2.0; if (vKind > 1.5 && vKind < 2.5) c.y *= 0.8; float r2 = dot(c, c), q = r2 / (vK * vK);
        float a = exp(-q * 1.6) * 2.0 + exp(-r2 * 6.0) * (vKind > 2.5 ? 0.08 : 0.22);
        vec3 base = vKind < 0.5 ? uC0 : vKind < 1.5 ? uC1 : vKind < 2.5 ? uC2 : uC1 * (vKind > 3.5 ? 0.8 : 0.9);
        vec3 col = mix(base, vec3(0.95, 1.0, 1.0), exp(-q * 4.0) * (vKind > 2.5 ? 0.5 : 1.0)) * a * vI;
        gl_FragColor = vec4(col, 1.0);
      }`,
    fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(pg, pmatF); points.name = 'passage-points'; points.frustumCulled = false; points.renderOrder = 20;
  scene.add(points);

  // ---- the lights: one at each flame and bead, its owner's colour
  const lights = [];
  for (const l of P.lamps) {
    if (l.baked) continue; // glow and bead only
    const [i, d] = l.outside ? [3.6, 12] : l.kind === 0 ? [1.3, 8] : l.kind === 2 ? [5.5, 13] : [2.3, 10];
    const L = new THREE.PointLight(new THREE.Color(KIND_COL[l.kind]), i, d, 2); L.position.set(l.x, l.y + 0.05, l.z); L.name = 'passage-light';
    scene.add(L); lights.push({ L, i, ph: rng() * 6, kind: l.kind });
  }

  // ---- the cuts: D0's fall of blocks behind the door (and its black end and its floor past the treads), the Pit's
  // throat in the way through the portal, the terrain's wall triangles across the way at the mouth
  const cuts = { fall: 0, throat: 0, terrain: 0 };
  {
    const cr = scene.getObjectByName('coffin-road'), g = cr?.geometry, A = g?.attributes.position;
    if (A && !g.index) {
      const p = A.array, x0 = DOOR.x - DOOR.half - 1.2, x1 = DOOR.x + DOOR.half + 1.2, zc = DOOR.fall + 0.3; // (its floor and walls start before)
      const y0 = START.y - 0.65, y1 = DOOR.sill + DOOR.h + 0.01; // (up to the vault: the black end's top is at it)
      for (let t = 0; t < p.length; t += 9) {
        let ok = true;
        for (let v = 0; v < 9 && ok; v += 3) { const x = p[t + v], y = p[t + v + 1], z = p[t + v + 2]; if (x < x0 || x > x1 || z < zc || z > zc + 6 || y < y0 || y > y1) ok = false; }
        if (!ok) continue;
        for (let v = 3; v < 9; v++) p[t + v] = p[t + (v % 3)];
        cuts.fall++;
      }
      if (cuts.fall) A.needsUpdate = true;
    }
    const M = P.M, rxm = -oz, rzm = ox;
    const local = (x, z) => { const dx = x - M[0], dz = z - M[1]; return [dx * ox + dz * oz, dx * rxm + dz * rzm]; };
    const cutIdx = (geo, test) => {
      if (!geo?.index) return 0;
      const idx = geo.index.array, Pp = geo.attributes.position.array; let n = 0;
      for (let t = 0; t < idx.length; t += 3) {
        const a = idx[t], b = idx[t + 1], c = idx[t + 2]; if (b === a && c === a) continue;
        const xa = Pp[a * 3], za = Pp[a * 3 + 2]; if (Math.abs(xa - M[0]) > 14 || Math.abs(za - M[1]) > 14) continue;
        if (test(Pp, a, b, c)) { idx[t + 1] = a; idx[t + 2] = a; n++; }
      }
      if (n) geo.index.needsUpdate = true;
      return n;
    };
    // the throat: any corner in the way through the gatehouse
    // (the whole of the gatehouse's face: the rock is cut where the gatehouse stands, its own mass covers the hole)
    const inWay = (Pp, i) => { const [al, lat] = local(Pp[i * 3], Pp[i * 3 + 2]), y = Pp[i * 3 + 1]; return al > portal.f0 - 0.3 && al < 7 && Math.abs(lat) < portal.outer + 0.2 && y < P.YM + 6.2 && y > P.YM - 2; };
    cuts.throat = cutIdx(scene.getObjectByName('paths-pit-throat')?.geometry, (Pp, a, b, c) => inWay(Pp, a) || inWay(Pp, b) || inWay(Pp, c));
    // the Pit's own rock at the wall's foot (D2's pit-floor mesh), not its bowl. (v15-F1) In the way through it is laid
    // down to the threshold (every corner there over it brought down to it, so the floor stays whole up to the slabs);
    // behind the face, triangles rising more than 0.6 m over the floor and wholly in the gatehouse's mass are cut.
    // Cutting every triangle with a corner in the way left a hole in front of the right pier, which the Heliarchs'
    // frame's foot stood over.
    { const g = scene.getObjectByName('pit-floor')?.geometry, hy = (Pp, i) => Pp[i * 3 + 1];
      const narrow = (Pp, i) => { if (!inWay(Pp, i)) return false; const [al, lat] = local(Pp[i * 3], Pp[i * 3 + 2]); return Math.abs(lat) < portal.open + 0.3 && al > portal.f0 - 0.3; };
      const behind = (Pp, i) => { if (!inWay(Pp, i)) return false; const [al] = local(Pp[i * 3], Pp[i * 3 + 2]); return al > portal.f0 + 0.05; };
      const test = (Pp, a, b, c) => Math.max(hy(Pp, a), hy(Pp, b), hy(Pp, c)) > P.YM + 0.6 && behind(Pp, a) && behind(Pp, b) && behind(Pp, c);
      if (g && !g.index) { const A = g.attributes.position, Pp = A.array; let n = 0, laid = 0;
        for (let i = 0; i < A.count; i++) if (narrow(Pp, i) && Pp[i * 3 + 1] > P.YM - 0.04) { Pp[i * 3 + 1] = P.YM - 0.04; laid++; }
        for (let t = 0; t < A.count; t += 3) if (test(Pp, t, t + 1, t + 2)) { for (let k = 3; k < 9; k++) Pp[t * 3 + k] = Pp[t * 3 + (k % 3)]; n++; }
        if (n || laid) A.needsUpdate = true; cuts.pitRock = n + laid; cuts.pitLaid = laid; } }
    // the terrain: triangles in the wall (no corner over the lip) with a corner across the way and a corner low enough
    // to reach into it (under the gatehouse's top). (v15-F1, #60) The wall is 24 m of drop over a cell or two, so one
    // triangle runs from the floor to the lip itself; asked to lie wholly 4 m under the lip, the one across the mouth
    // stood in the way as a violet blade. What is cut above the gatehouse is behind its mass and the throat's veneer.
    const lipY = T.heightAt(PIT.x + ox * (pitRim(MOUTH.b) + 1.5), PIT.z + oz * (pitRim(MOUTH.b) + 1.5));
    const inWall = (Pp, i) => Pp[i * 3 + 1] < lipY + 0.3, low = (Pp, i) => Pp[i * 3 + 1] < P.YM + 8;
    const across = (Pp, i) => { const [al, lat] = local(Pp[i * 3], Pp[i * 3 + 2]); return al > -1.0 && al < 7 && Math.abs(lat) < 3.2; };
    const tcut = (Pp, a, b, c) => inWall(Pp, a) && inWall(Pp, b) && inWall(Pp, c) && (low(Pp, a) || low(Pp, b) || low(Pp, c)) && (across(Pp, a) || across(Pp, b) || across(Pp, c));
    cuts.terrain = cutIdx(T.mesh.geometry, tcut);
    cutIdx(scene.getObjectByName('saltings-crust')?.geometry, tcut);
  }
  // loud, not silent: each cut is into another module's mesh by name and place; one that removed nothing means a name
  // or a shape moved under it (edges-test checks the same). The terrain's may be 0 when the Pit's own cut took them.
  for (const [k, name] of [['fall', 'the hall road\'s fall of blocks (coffin-road)'], ['throat', 'the Pit\'s throat (paths-pit-throat)'], ['pitRock', 'the Pit\'s rock (pit-floor)']]) {
    if (k === 'pitRock' && (!ctx.pit || ctx.pit.off)) continue;
    if (!cuts[k]) console.warn(`[fp] passage: the cut of ${name} removed nothing: a mesh's name or shape has moved`);
  }

  // ---- the floors: the passage's (one stacked floor with held edges, the bridge's deck in the Gulf), and a catch at
  // the bottom of the Gulf that gives a walker back to the bridge
  ctx.addWalkable(P.floor, { stack: true, keep: true, name: 'passage' });
  ctx.addWalkable(P.catchFloor, { stack: true, keep: true, name: 'passage-gulf' });
  // what stands over the way: an uncapped collider is a column to the sky and down through the ground. The only ones
  // over this way are the Pit's rim ring (v4/paths.js), which stands across the Gate; capOver touches those alone: a
  // round uncapped collider within 1.5 m of the rim, within 25 degrees of the mouth's bearing, and within reach of the
  // way, gets a bottom 1.5 m under the ground it stands on (the same above the ground, nothing below). Any other
  // uncapped collider found over the way is a fault for its module, and edges-test fails it. Run again once every
  // module is built, for rim colliders added after this one.
  const _c = { i: 0, s: 0, d: 0, e: 0, t: 0 }, CX0 = Math.min(...P.X) - 20, CX1 = Math.max(...P.X) + 20, CZ0 = Math.min(...P.Z) - 20, CZ1 = Math.max(...P.Z) + 20;
  const capOver = () => {
    let n = 0;
    for (const c of ctx.controls?.state?.colliders || []) {
      if (c.y !== undefined || c.x1 !== undefined) continue;
      if (Math.abs(pitEdge(c.x, c.z)) > 1.5 || Math.abs(((pitBearing(c.x, c.z) - MOUTH.b + 540) % 360) - 180) > 25) continue;
      const pts = [[c.x, c.z]];
      let hit = false;
      for (const [x, z] of pts) {
        if (x < CX0 || x > CX1 || z < CZ0 || z > CZ1) continue;
        P.near(x, z, _c);
        const g = T.heightAt(x, z);
        if (_c.e < P.walkHalf(_c.s) + c.r + 2 && P.yAt(_c.s) + 4 < g - 1.5) { hit = true; break; }
      }
      if (!hit) continue;
      let g = Infinity; for (const [x, z] of pts) g = Math.min(g, T.heightAt(x, z));
      c.y = g - 1.5; c.h = 1e5; n++;
    }
    return n;
  };
  cuts.colliders = capOver();
  ctx.built?.().then(() => { cuts.colliders += capOver(); });
  // the room's things a walker would walk through: his lamp (the basket's is with it, above)
  if (ctx.addCollider) {
    const L2 = P.lamps.find((l) => l.kind === 2);
    ctx.addCollider({ x: L2.x, z: L2.z, r: 0.25, y: sun.y, h: 0.7, stand: false });
  }

  // ---- under the ground: one volume a stretch (each its own size: the Line and the Gate narrow, the room larger,
  // the Gulf a hall), easing out toward the Pit's door over the Gate's last 13 m
  const below = installBelow(ctx);
  const bbox = { x0: Math.min(...P.X) - 16, x1: Math.max(...P.X) + 16, z0: Math.min(...P.Z) - 16, z1: Math.max(...P.Z) + 16 };
  const _q = { i: 0, s: 0, d: 0, e: 0, t: 0 };
  const vol = (sa, sb, W, H, mouth) => (x, y, z) => {
    if (x < bbox.x0 || x > bbox.x1 || z < bbox.z0 || z > bbox.z1) return 0;
    P.near(x, z, _q);
    if (_q.s < sa - 0.6 || _q.s > sb + 0.6 || (_q.i === 0 && _q.t < -1) || (_q.i === P.N - 1 && _q.t > MOUTH.portal + 0.5)) return 0;
    const h = 1 - ss(W, W + 1, Math.abs(_q.d)), top = P.yAt(_q.s) + H;
    let v = h * (1 - ss(top, top + 2, y)) * ss(P.yAt(_q.s) - 24, P.yAt(_q.s) - 21, y);
    // the Gate's last 13 m: stone-sounding and sheltered (0.95), never sealed (the seal needs 1: the Pit is seen from
    // here), easing to the Pit floor's own 0.6 (D2's) at the portal
    if (mouth) { const r = rOf(x, z); v *= r >= P.rf + 12 ? 0.95 + 0.05 * ss(P.rf + 12, P.rf + 14, r) : 0.6 + 0.35 * ss(P.rf - 1.5, P.rf + 3, r); }
    return v;
  };
  const vols = [
    below.add(vol(0, SP.LINE, 1.3, 4.5), { size: 0.35 }),
    below.add(vol(SP.LINE, SP.SUN - SP.RC, 2.6, 4.5), { size: 0.45 }),
    below.add(vol(SP.SUN - SP.RC, SP.NECK0, SP.RC + 0.5, 9.5), { size: 0.75 }),
    below.add(vol(SP.NECK0, SP.GULF0, 1.3, 4.0), { size: 0.35 }),
    below.add(vol(SP.GULF0, SP.GULF1, 15, 11), { size: 1 }),
    below.add(vol(SP.GULF1, P.L, 1.4, 4.2, true), { size: 0.35 }),
  ];
  // the Pit's top is an opening (under the seal, what is seen through it is drawn), registered only while the eye is in
  // the Gate: deeper in, nothing is seen through it, and its casters' reach (the kit's 110 m) would keep half the map
  const pitOpening = { x: PIT.x, y: lipYAt(T) + 0.5, z: PIT.z, r: PIT.r + 4 };
  let unOpen = null;
  for (const m of meshes) below.keep(m);
  below.keep(points);

  // the way, for heights-test and edges-test: from the hall's road by the south door, through the door, down the Line, the
  // Flute, across the room, over the Gulf, down the Gate and out onto the Pit's floor
  // (its first points on the hall's road as it is: its own floor down to the sill, whatever leads down to the door)
  const roadAt = (x, z, dflt) => { const f = ctx.coffinRoad?.floor?.(x, z); return f !== null && f !== undefined && isFinite(f) ? f : dflt; };
  const path = [[DOOR.x, DOOR.z - 1.6, roadAt(DOOR.x, DOOR.z - 1.6, ROAD_Y)], [DOOR.x, DOOR.z + 1.0, roadAt(DOOR.x, DOOR.z + 1.0, DOOR.sill)], [DOOR.x, 59.0, START.y]];
  for (const s of [1, 4, 8, 12, 16, 20, SP.LINE, SP.LINE + 8, SP.LINE + 16, SP.LINE + 24, SP.LINE + 32, SP.SUN - SP.RC - 0.5, SP.SUN, SP.NECK0 + 1, SP.GULF0 + 4, SP.GULF0 + 11, SP.GULF1 - 2, SP.GULF1 + 4, SP.GULF1 + 9, P.L - 2, P.L - 0.3]) {
    const p = P.at(s); path.push([p.x, p.z, P.yAt(s)]);
  }
  path.push([P.M[0] + P.IN[0] * 1.6, P.M[1] + P.IN[1] * 1.6]); // out onto the Pit's floor
  ctx.ascents?.add({ id: 'wellward-way', held: true, offs: [0.08, 0.3, 0.5, 0.62, 0.72, 0.9], path: path.map((q) => q.filter((v) => v !== undefined)) });

  // ---- per frame, near: the points' clock and scale, the lights' flicker, the catch
  const ds = new THREE.Vector2(), pl = ctx.player;
  let wet = 0, rescues = 0;
  const S = { get rescues() { return rescues; } };
  const cam = ctx.camera.position;
  function update(dt, t) {
    pmatF.uniforms.uTime.value = t;
    { // (held a little past where it comes on, so it does not flicker on and off at the line)
      const inBox = cam.x > bbox.x0 && cam.x < bbox.x1 && cam.z > bbox.z0 && cam.z < bbox.z1 && cam.y < P.YM + 9, s = inBox ? P.near(cam.x, cam.z, _q).s : -1;
      if (s > SP.GULF1 - 3 && !unOpen) unOpen = below.opening(pitOpening);
      else if (s < SP.GULF1 - 5 && unOpen) { unOpen(); unOpen = null; } }
    ctx.renderer.getDrawingBufferSize(ds);
    pmatF.uniforms.uScale.value = ds.y / (2 * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov) * 0.5));
    for (const l of lights) l.L.intensity = l.i * (l.kind === 0 ? 0.8 + 0.12 * Math.sin(t * 0.37 + l.ph) : l.kind === 1 ? 0.96 + 0.04 * Math.sin(t * 1.7 + l.ph) : 0.85 + 0.1 * Math.sin(t * 9 + l.ph) + 0.05 * Math.sin(t * 21 + l.ph * 2));
    if (pl.onStack && pl.onStack.name === 'passage-gulf') {
      wet += dt;
      if (wet > 0.9) {
        wet = 0; rescues++;
        P.near(pl.pos.x, pl.pos.z, _q);
        const s = Math.min(SP.GULF1 - 0.6, Math.max(SP.GULF0 + 0.6, _q.s)), p = P.at(s);
        ctx.controls.placeAt(p.x, p.z, P.yAt(s) + 0.05);
      }
    } else wet = 0;
  }
  const mid = P.at(P.L / 2);
  ctx.registerUpdate(update, { pos: { x: mid.x, z: mid.z }, near: 95, hz: 2, r: 70 });

  const tris = meshes.reduce((a, m) => a + m.geometry.attributes.position.count / 3, 0);
  ctx.passage = {
    off: false, plan: P, floor: P.floor, meshes, points, lights: lights.map((l) => l.L), portal, cuts, state: S, vols,
    stats: () => ({ calls: meshes.length + 1, tris: Math.round(tris), treads, lights: lights.length, points: PT.length, cuts }),
  };
  ctx.log?.(`wellward way: ${P.L.toFixed(0)} m from ${START.y.toFixed(1)} to ${P.YM.toFixed(1)}, ${Math.round(tris)} tris, ${treads} treads, ${lights.length} lights, ${PT.length} points, cut ${cuts.fall}/${cuts.throat}/${cuts.terrain}, ${(performance.now() - t0).toFixed(0)} ms`);
}

// the Pit's lip on the mouth's side (the opening's plane)
function lipYAt(T) {
  let a = 0; for (let b = 0; b < 360; b += 30) { const r = pitRim(b) + 1.2, x = PIT.x + Math.sin((b * Math.PI) / 180) * r, z = PIT.z - Math.cos((b * Math.PI) / 180) * r; a += T.heightAt(x, z); }
  return a / 12;
}
