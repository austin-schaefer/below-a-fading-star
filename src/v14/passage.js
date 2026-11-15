// The Bearers' Way (v14-D1): the walk's first tunnel, from the door in the Foundered Nave's south wall under the moor
// to the floor of the Pit, about 130 m and 16 m down. The old people who laid their dead in the Nave carried them in
// this way from where the old road ends; the wind that comes up the Pit from under the world has used it since, and
// scoured the middle of it round; the Reckoner has taken the room on the way to lay a new sun in its floor. Four
// kinds of space (v14/passage/plan.js says where): the Bearers' Flight (cut, square, a stair, the Sexton's candles),
// the Flute (a round bore fluted by the wind, its walls rimed with points of cold light), the Laid Sun (a domed room,
// the Reckoner's gold going into its floor, his lamp), the Gulf (a crack across the way, crossed by a stair on one
// arch, black below), then the Gate (square again, a stair down to a portal standing out of the Pit's wall at its
// floor). The story: stories/the-bearers-way.md. Dark, sealed and stone-sounding by the kit (v14/under.js).
// Draws: the way (one mesh a stretch: five), the room's things, the gold, the portal, the lights' and the rime's
// points (one Points): nine. Lights: thirteen PointLights, each with its owner (lights.js keeps the nearest three).
// It opens D0's fall of blocks behind the door (their triangles in the Coffin Road's mesh made degenerate), the Pit's
// throat and the terrain where the portal stands (the same), and leaves heightAt alone. ?passage=0 leaves it out.
import * as THREE from 'three';
import { UnderBuilder, underMaterial, installBelow } from './under.js';
import { makePlan, PASSAGE_OFF, KA, KF, MOUTH, START } from './passage/plan.js';
import { DOOR, ROAD_Y } from './coffin-road/plan.js';
import { PIT, pitRim } from '../v4/paths/ground.js';
import { lintelForms, prims } from '../v7/glyphs/forms.js';

const C = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const STONE = C('#6e655c'), STONE_D = C('#4c453f'), ROCK = C('#77707c'), GRIT = C('#8e877a'), ROOM = C('#5b534b'), DOME = C('#4a4440');
const GULF = C('#2f2a26'), IRON = C('#26221f'), WAX = C('#6f6a58'), TIMBER = C('#2a2018'), BED = C('#8c8576'), CHALK = C('#cfc6b2');
const GOLDS = [C('#c8962e'), C('#d9a843'), C('#b38428'), C('#e0b450')], RED = C('#6a2a1c'), OCHRE = C('#8a6420'), SLATE = C('#4d5a63');
const WICKER = C('#5e4a2e'), CLOTH = C('#4a1c18'), BRONZE = C('#6b4f2a'), CUT = C('#221e1b');
const GREEN = '#9fe8c2', COLD = '#bcd2ff', WARM = '#ffb36b'; // the Sexton's corpse-candles, the sounder's lamps (the Pit's starlight), the Reckoner's lamp
const KIND_COL = [GREEN, COLD, WARM];

export async function build(ctx) {
  if (PASSAGE_OFF) { ctx.passage = { off: true }; return; }
  await ctx.built?.('coffinroad');
  if (!ctx.coffinRoad || ctx.coffinRoad.off) { ctx.passage = { off: true }; return; }
  await Promise.all([ctx.built?.('paths'), ctx.built?.('pit')]);
  const t0 = performance.now();
  const { scene, terrain: T } = ctx;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(14101);
  await ctx.progress?.('the bearers\' way', 0);
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
    flight: new UnderBuilder(litFor([0], 7, 1.15)),
    flute: new UnderBuilder(litFor([1], 8.5, 0.95)),
    sun: new UnderBuilder(litFor([2], 11, 0.8)),
    gulf: new UnderBuilder(litFor([1], 8, 1.0)),
    gate: new UnderBuilder(litFor([1], 8, 1.0, true)),
  };
  const meshOf = (s) => { const k = P.kindAt(s); return k === 'neck' ? 'gulf' : k; };

  // ---- the colours: dressed blocks in courses; the Flute's rock banded along its flutes, its grit in ripples; the room
  const hsh = P.hsh;
  function colour(kind, s, k, v, i, floorStrip) {
    if (kind === 'flight' || kind === 'gate' || kind === 'neck') {
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
      const base = v > 3.1 ? DOME : ROOM; return [base[0] * j, base[1] * j, base[2] * j];
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
  await ctx.progress?.('the bearers\' way', 0.25);

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

  // ---- the Bearers' Flight: the bearers' benches either side on each landing, the candles' brackets and cages; a
  // bier left on the last bench
  {
    const Bd = builders.flight;
    const at = (s, d, v) => P.world(s, d, v);
    const fr = (s) => { const p = P.at(s), l = Math.hypot(p.tx, p.tz); return { tx: p.tx / l, tz: p.tz / l }; };
    const yawOf = (s) => { const f = fr(s); return Math.atan2(f.tx, f.tz) - Math.PI / 2; };
    const benches = [];
    for (const l of P.lamps) if (l.kind === 0) benches.push(l.s);
    for (const sb of benches) {
      for (const side of [-1, 1]) {
        const [x, y, z] = at(sb + 0.2, side * 0.88, 0.32), yaw = yawOf(sb);
        // a long low bench of one stone, a hollow worn in its top where a bier was set down
        Bd.box(x, y, z, 0.95, 0.32, 0.2, yaw, STONE_D, STONE, 0.08);
      }
    }
    // the candles: a stone bracket out of the wall, an iron cage on it, a candle in it (the flame is the Points'),
    // and the one gone out where the cut ends
    const cage = (s, d, v, lit) => {
      const side = Math.sign(d), [bx, by, bz] = at(s, d + side * 0.06, v - 0.18), yaw = yawOf(s);
      Bd.box(bx, by, bz, 0.13, 0.06, 0.16, yaw, STONE, STONE, 0.08);
      const [cx, cy, cz] = at(s, d - side * 0.02, v);
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) Bd.beam([cx + a * 0.07, cy - 0.12, cz + b * 0.07], [cx + a * 0.06, cy + 0.16, cz + b * 0.06], 0.008, IRON, 0.04);
      Bd.box(cx, cy + 0.17, cz, 0.08, 0.01, 0.08, 0, IRON);
      const h = lit ? 0.12 : 0.05;
      Bd.prism([[cx - 0.02, cz - 0.02], [cx + 0.02, cz - 0.02], [cx + 0.02, cz + 0.02], [cx - 0.02, cz + 0.02]], cy - 0.12, cy - 0.12 + h, WAX, WAX, 0.1);
    };
    for (const l of P.lamps) if (l.kind === 0) cage(l.s, l.d, l.v, true);
    cage(P.OUT_CANDLE[0], P.OUT_CANDLE[1], P.OUT_CANDLE[2], false);
    // the bier: two poles and the slats between them, leaning on the last landing's bench
    {
      const sb = benches[benches.length - 1] + 0.2, side = -1;
      const a = at(sb - 0.85, side * 0.72, 0.66), b = at(sb + 0.95, side * 0.72, 0.66);
      const a2 = at(sb - 0.85, side * 0.2, 0.05), b2 = at(sb + 0.95, side * 0.2, 0.05);
      Bd.beam(a, b, 0.03, TIMBER); Bd.beam(a2, b2, 0.03, TIMBER);
      for (let k = 0; k < 6; k++) { const f = 0.1 + k * 0.16, p = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f], q = [a2[0] + (b2[0] - a2[0]) * f, a2[1] + (b2[1] - a2[1]) * f, a2[2] + (b2[2] - a2[2]) * f]; Bd.beam(p, q, 0.018, TIMBER); }
    }
  }

  // ---- the sounder's lamps: an iron spike driven into the rock, a hanging cage, a bead of cold light (the Points')
  const lampHang = (Bd, l) => {
    const side = Math.sign(l.d) || 1, wallD = l.d + side * 0.5;
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
  await ctx.progress?.('the bearers\' way', 0.45);

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
    // the bearers' bench round the drum, broken at the two ways in
    const nb = 40;
    for (let i = 0; i < nb; i++) {
      const a0 = (i / nb) * Math.PI * 2, a1 = ((i + 1) / nb) * Math.PI * 2, am = (a0 + a1) / 2;
      if (Math.abs(Math.sin(am)) < 0.42 && true) continue; // the axis ends (the ways in)
      const q = [sunW(sun.rc - 0.05, a0), sunW(sun.rc - 0.05, a1), sunW(sun.rc - 0.5, a1), sunW(sun.rc - 0.5, a0)];
      RB.prism(q, fy, fy + 0.44, STONE_D, STONE, 0.1);
    }
  }
  await ctx.progress?.('the bearers\' way', 0.6);

  // ---- the Pit's door: a gatehouse of dressed stone standing out of the wall at its foot, the way through it, the old
  // sun over the lintel (its gold gone), one of the sounder's lamps on a bracket by it; seen from the Pit's floor
  const glowPO = glow([1], 8, 0.5);
  const PO = new UnderBuilder((x, y, z, out) => { out[0] = 0.22; out[1] = 0.35; out[2] = glowPO(x, y, z); return out; });
  const portal = (() => {
    const M = P.M, Y = P.YM, rx = -oz, rz = ox; // across the mouth (its right, looking out of the passage... any)
    const W = (along, lat, y) => [M[0] + ox * along + rx * lat, y, M[1] + oz * along + rz * lat];
    const yaw = Math.atan2(ox, oz) - Math.PI / 2;
    const f0 = -MOUTH.portal, f1 = 1.6, depth = (f1 - f0) / 2, mid = (f0 + f1) / 2;
    const box = (along, lat, y, ha, hl, hy, col, colTop = col) => { const [x, , z] = W(along, lat, 0); PO.box(x, y, z, ha, hy, hl, yaw, col, colTop, 0.1); };
    const open = 1.2, top = Y + 3.25, outer = 3.1;
    // the piers and the lintel block (the way through is between them), the cornice, the face's rough surround
    for (const s of [-1, 1]) box(mid, s * (open + (outer - open) / 2), Y + 3.4, depth, (outer - open) / 2, 4.0, STONE, STONE_D);
    box(mid, 0, top + 2.1, depth, open, 2.1, STONE, STONE_D);
    box(f0 - 0.12, 0, Y + 6.9, 0.2, outer + 0.3, 0.22, STONE_D);
    for (let i = 0; i < 14; i++) { const lat = (rng() - 0.5) * 2 * (outer + 0.6), h = 0.3 + rng() * 0.5; box(f0 + 0.2 + rng() * 0.6, lat, Y + 7.2 + rng() * 0.9, 0.5, 0.4 + rng() * 0.5, h, STONE_D); }
    // the sun over the door: a boss and its rays in relief, its sockets empty
    const [sx, , sz] = W(f0 - 0.06, 0, 0), sy = top + 1.95, R = 0.62;
    const P3 = (r, a) => [sx + rx * Math.cos(a) * r, sy + Math.sin(a) * r, sz + rz * Math.cos(a) * r];
    for (let i = 0; i < 20; i++) {
      const a0 = (i / 20) * Math.PI * 2, a1 = ((i + 1) / 20) * Math.PI * 2;
      PO.tri([sx - ox * 0.05, sy, sz - oz * 0.05], P3(R, a0), P3(R, a1), STONE_D, [-ox, 0, -oz], 0.15);
      if (i % 2 === 0) PO.tri(P3(R + 0.04, a0), P3(R + 0.04, a1), P3(R * 1.9, (a0 + a1) / 2), STONE, [-ox, 0, -oz], 0.15);
    }
    for (let i = 0; i < 18; i++) { const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * R * 0.9, p = P3(r, a); PO.box(p[0] - ox * 0.07, p[1], p[2] - oz * 0.07, 0.035, 0.035, 0.035, yaw, CUT, CUT, 0.05); }
    // a threshold of three slabs where the passage's floor ends
    for (let i = 0; i < 3; i++) box(f0 + 0.35 + i * 0.62, 0, Y - 0.1, 0.3, open - 0.02, 0.12, STONE_D, STONE);
    // the lamp, on an iron bracket out of the right pier's face
    const LO = P.lamps.find((l) => l.outside), lampAt = [LO.x, LO.y, LO.z];
    const [bx, , bz] = W(f0 - 0.02, open + 0.8, 0);
    PO.beam([bx, Y + 2.85, bz], [lampAt[0], Y + 2.85, lampAt[2]], 0.02, IRON, 0.04);
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) PO.beam([lampAt[0] + a * 0.07, Y + 2.38, lampAt[2] + b * 0.07], [lampAt[0] + a * 0.07, Y + 2.66, lampAt[2] + b * 0.07], 0.008, IRON, 0.03);
    PO.box(lampAt[0], Y + 2.37, lampAt[2], 0.09, 0.012, 0.09, 0, IRON); PO.box(lampAt[0], Y + 2.67, lampAt[2], 0.09, 0.012, 0.09, 0, IRON);
    PO.beam([lampAt[0], Y + 2.67, lampAt[2]], [lampAt[0], Y + 2.85, lampAt[2]], 0.006, IRON, 0.02);
    return { W, f0, f1, open, top, outer, lamp: { x: lampAt[0], y: Y + 2.5, z: lampAt[2] } };
  })();

  // ---- the meshes: one a stretch, each its own glow colour; far fades each to black
  const meshes = [];
  const FAR = { flight: [12, 30], flute: [14, 34], sun: [16, 36], gulf: [9, 26], gate: [14, 34] };
  const GLOWC = { flight: GREEN, flute: COLD, sun: WARM, gulf: COLD, gate: COLD };
  for (const [name, Bd] of Object.entries(builders)) {
    const mat = underMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.02 }), 'passage-' + name, GLOWC[name], { far: FAR[name] });
    const m = new THREE.Mesh(Bd.geometry(), mat); m.name = 'passage-' + name; m.castShadow = false; m.receiveShadow = true;
    scene.add(m); meshes.push(m);
  }
  const gmat = underMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.85 }), 'passage-gold', WARM, { far: [14, 34] });
  const gold = new THREE.Mesh(G.geometry(), gmat); gold.name = 'passage-gold'; gold.receiveShadow = true; scene.add(gold); meshes.push(gold);
  const pmat = underMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.02 }), 'passage-portal', COLD);
  const portalMesh = new THREE.Mesh(PO.geometry(), pmat); portalMesh.name = 'passage-portal'; portalMesh.castShadow = true; portalMesh.receiveShadow = true; scene.add(portalMesh); meshes.push(portalMesh);
  await ctx.progress?.('the bearers\' way', 0.75);

  // ---- the points: the flames and the beads of the lamps; the Flute's rime; the Gulf's motes going up
  const PT = []; // [x, y, z, size, phase, kind] kind 0 green flame, 1 cold bead, 2 warm flame, 3 rime, 4 mote
  for (const l of P.lamps) PT.push([l.x, l.y + (l.kind === 1 ? -0.08 : 0), l.z, l.kind === 1 ? 0.12 : l.kind === 2 ? 0.17 : 0.11, rng() * 40, l.kind]);
  {
    const n = low ? 420 : 760;
    for (let i = 0; i < n; i++) {
      const s = SP.FLIGHT + 1.5 + rng() * (SP.SUN - SP.RC - SP.FLIGHT - 1.5), sec = P.section(s);
      const k = 2 + Math.floor(rng() * (KA - 4)), f = rng(), a = sec.pts[k], b = sec.pts[k + 1];
      const u = (a[0] + (b[0] - a[0]) * f) * 0.985, v = (a[1] + (b[1] - a[1]) * f) * 0.985 + 0.01;
      if (v < 0.25) continue;
      const [x, y, z] = P.world(s, u, v), big = rng() < 0.06;
      // thicker toward the Pit (the wind's end of it), and in drifts along the flutes
      if (rng() > 0.35 + 0.65 * (s - SP.FLIGHT) / (SP.SUN - SP.RC - SP.FLIGHT) && !big) continue;
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
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uScale: { value: 400 }, uC0: { value: new THREE.Color(GREEN) }, uC1: { value: new THREE.Color(COLD) }, uC2: { value: new THREE.Color(WARM) } }]),
    vertexShader: `uniform float uTime, uScale; attribute vec3 aP; varying float vI; varying float vK; varying float vKind;
      #include <fog_pars_vertex>
      void main() {
        float ph = aP.y, kind = aP.z, fl = 0.82 + 0.1 * sin(uTime * 11.0 + ph) + 0.08 * sin(uTime * 23.0 + ph * 2.3);
        vec3 transformed = position;
        if (kind > 3.5) { float h = mod(uTime * 0.35 + ph * 1.7, 22.0); transformed.y += h; fl = smoothstep(0.0, 3.0, h) * (1.0 - smoothstep(16.0, 22.0, h)); }
        else if (kind > 2.5) { fl = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (0.6 + fract(ph) * 1.4) + ph * 3.1), 3.0); }
        else if (kind > 0.5 && kind < 1.5) { fl = 0.9 + 0.1 * sin(uTime * 1.7 + ph); }
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
        vec2 c = (gl_PointCoord - 0.5) * 2.0; if (vKind < 2.5) c.y *= 0.8; float r2 = dot(c, c), q = r2 / (vK * vK);
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
    const [i, d] = l.kind === 0 ? [2.4, 8.5] : l.kind === 2 ? [5.5, 13] : l.outside ? [3.2, 11] : [2.3, 10];
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
      const y0 = START.y - 0.65, y1 = DOOR.sill + DOOR.h - 0.01;
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
    const inWay = (Pp, i) => { const [al, lat] = local(Pp[i * 3], Pp[i * 3 + 2]), y = Pp[i * 3 + 1]; return al > portal.f0 - 0.3 && al < 7 && Math.abs(lat) < portal.open + 0.55 && y < P.YM + 3.9 && y > P.YM - 2; };
    cuts.throat = cutIdx(scene.getObjectByName('paths-pit-throat')?.geometry, (Pp, a, b, c) => inWay(Pp, a) || inWay(Pp, b) || inWay(Pp, c));
    // the terrain: triangles wholly in the wall (every corner under the lip by 4 m) with a corner across the way
    const lipY = T.heightAt(PIT.x + ox * (pitRim(MOUTH.b) + 1.5), PIT.z + oz * (pitRim(MOUTH.b) + 1.5));
    const inWall = (Pp, i) => Pp[i * 3 + 1] < lipY - 4;
    const across = (Pp, i) => { const [al, lat] = local(Pp[i * 3], Pp[i * 3 + 2]); return al > -1.0 && al < 7 && Math.abs(lat) < 3.2; };
    const tcut = (Pp, a, b, c) => inWall(Pp, a) && inWall(Pp, b) && inWall(Pp, c) && (across(Pp, a) || across(Pp, b) || across(Pp, c));
    cuts.terrain = cutIdx(T.mesh.geometry, tcut);
    cutIdx(scene.getObjectByName('saltings-crust')?.geometry, tcut);
  }

  // ---- the floors: the passage's (one stacked floor with held edges, the bridge's deck in the Gulf), and a catch at
  // the bottom of the Gulf that gives a walker back to the bridge
  ctx.addWalkable(P.floor, { stack: true, keep: true, name: 'passage' });
  ctx.addWalkable(P.catchFloor, { stack: true, keep: true, name: 'passage-gulf' });
  // what stands on the moor over the way: an uncapped collider is a column to the sky and down through the ground
  // (the Pit's rim ring stands across the Gate), so each one whose foot is within reach of the way is given a bottom
  // 1.5 m under the ground it stands on (as the trees' and rocks' are): the same above the ground, nothing below. Run
  // again once every module is built, for the colliders added after this one.
  const _c = { i: 0, s: 0, d: 0, e: 0, t: 0 }, CX0 = Math.min(...P.X) - 20, CX1 = Math.max(...P.X) + 20, CZ0 = Math.min(...P.Z) - 20, CZ1 = Math.max(...P.Z) + 20;
  const capOver = () => {
    let n = 0;
    for (const c of ctx.controls?.state?.colliders || []) {
      if (c.y !== undefined) continue;
      const pts = c.x1 !== undefined ? [[c.x1, c.z1], [c.x, c.z], [c.x2, c.z2]] : [[c.x, c.z]];
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
  // the room's things a walker would walk through: his lamp, the basket
  if (ctx.addCollider) {
    const L2 = P.lamps.find((l) => l.kind === 2);
    ctx.addCollider({ x: L2.x, z: L2.z, r: 0.25, y: sun.y, h: 0.7, stand: false });
  }

  // ---- under the ground: one volume a stretch (each its own size: the Flight and the Gate narrow, the room larger,
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
    below.add(vol(0, SP.FLIGHT, 1.3, 4.5), { size: 0.35 }),
    below.add(vol(SP.FLIGHT, SP.SUN - SP.RC, 2.6, 4.5), { size: 0.45 }),
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

  // the way, for heights-test and edges-test: from the Coffin Road's door spur through the door, down the Flight, the
  // Flute, across the room, over the Gulf, down the Gate and out onto the Pit's floor
  const path = [[DOOR.x, DOOR.z - 1.6, ROAD_Y], [DOOR.x, DOOR.z + 1.0, DOOR.sill], [DOOR.x, 59.0, START.y]];
  for (const s of [1, 4, 8, 12, 16, 20, SP.FLIGHT, SP.FLIGHT + 8, SP.FLIGHT + 16, SP.FLIGHT + 24, SP.FLIGHT + 32, SP.SUN - SP.RC - 0.5, SP.SUN, SP.NECK0 + 1, SP.GULF0 + 4, SP.GULF0 + 11, SP.GULF1 - 2, SP.GULF1 + 4, SP.GULF1 + 9, P.L - 2, P.L - 0.3]) {
    const p = P.at(s); path.push([p.x, p.z, P.yAt(s)]);
  }
  path.push([P.M[0] + P.IN[0] * 1.6, P.M[1] + P.IN[1] * 1.6]); // out onto the Pit's floor
  ctx.ascents?.add({ id: 'bearers-way', held: true, offs: [0.08, 0.3, 0.5, 0.62, 0.72, 0.9], path: path.map((q) => q.filter((v) => v !== undefined)) });

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
    for (const l of lights) l.L.intensity = l.i * (l.kind === 1 ? 0.96 + 0.04 * Math.sin(t * 1.7 + l.ph) : 0.85 + 0.1 * Math.sin(t * 9 + l.ph) + 0.05 * Math.sin(t * 21 + l.ph * 2));
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
  ctx.log?.(`bearers' way: ${P.L.toFixed(0)} m from ${START.y.toFixed(1)} to ${P.YM.toFixed(1)}, ${Math.round(tris)} tris, ${treads} treads, ${lights.length} lights, ${PT.length} points, cut ${cuts.fall}/${cuts.throat}/${cuts.terrain}, ${(performance.now() - t0).toFixed(0)} ms`);
}

// the Pit's lip on the mouth's side (the opening's plane)
function lipYAt(T) {
  let a = 0; for (let b = 0; b < 360; b += 30) { const r = pitRim(b) + 1.2, x = PIT.x + Math.sin((b * Math.PI) / 180) * r, z = PIT.z - Math.cos((b * Math.PI) / 180) * r; a += T.heightAt(x, z); }
  return a / 12;
}
