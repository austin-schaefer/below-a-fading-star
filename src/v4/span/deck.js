// The Great Span's deck and piers (v4, W): the elevation along z 215 cut as one outline per half-bay and
// extruded through the structure's depth: the abutments into each wall, ten piers with cutwaters, pointed arches
// with their rings, the three fallen bays' stubs, the crack at x -45, the cornice and the broken parapets. The
// deck is walkable (plan.js deckAt) and its parapets, piers and abutments collide.
import * as THREE from 'three';
import { SPAN, STAIRS, BOT, RING, deckAt, bayArch, isCollapsed } from './plan.js';
import { box, extrudeXY, loft, clean } from './geo.js';

const Y = SPAN.deckY, Z = SPAN.z, Z0 = SPAN.z0, Z1 = SPAN.z1;

export function buildDeck(K) {
  const { ctx, hi, rng, H, addCol, body, ragged } = K;
  // ---------------------------------------------------------------- the elevation: abutments, piers, arches
  const seg = hi ? 14 : 7;
  const P = SPAN.piers, T2 = SPAN.pierT / 2;
  const arc = (cx, cy, R, t0, t1, n) => { const o = []; for (let i = 0; i <= n; i++) { const t = t0 + (t1 - t0) * (i / n); o.push([cx + R * Math.cos(t), cy + R * Math.sin(t)]); } return o; };
  const thetaAt = (cx, R, x) => Math.acos(Math.max(-1, Math.min(1, (x - cx) / R)));
  // the half of a bay against its western pier (a); kind: 'whole' | 'crack' | 'fallen'. Returns the piece's
  // outline and its arch ring's.
  function halfBay(A, kind, right = false) {
    const out = [[A.a, BOT], [A.fl, BOT], [A.fl, A.ys]];
    const ring = [];
    let tEnd, xEnd;
    if (kind === 'whole') xEnd = A.m;
    else if (kind === 'crack') xEnd = right ? 2 * A.m - (SPAN.crack.x + SPAN.crack.w / 2) : SPAN.crack.x - SPAN.crack.w / 2;
    else xEnd = A.fl + 5;
    tEnd = thetaAt(A.cl, A.R, xEnd);
    const inner = arc(A.cl, A.ys, A.R, Math.PI, tEnd, Math.max(3, Math.round(seg * (Math.PI - tEnd) / (Math.PI - thetaAt(A.cl, A.R, A.m)))));
    out.push(...inner.slice(1));
    const yEnd = inner[inner.length - 1][1];
    if (kind === 'whole') out.push([A.m, Y]);
    else if (kind === 'crack') { out.push(...ragged(xEnd, yEnd, xEnd, Y, 5, 0.35, -1, xEnd)); out.push([xEnd, Y]); }
    else { out.push(...ragged(xEnd, yEnd, A.fl + 0.4, Y - 1, 6, 1.4, 1, A.fl + 0.2)); out.push([A.fl, Y]); }
    out.push([A.a, Y]);
    // the ring: the inner arc and the outer (R + RING) from the same centre, back to the springing
    const tO = thetaAt(A.cl, A.R + RING, kind === 'whole' ? A.m : xEnd);
    const outer = arc(A.cl, A.ys, A.R + RING, tO, Math.PI, inner.length - 1);
    ring.push(...inner, ...outer);
    return { out, ring };
  }
  const mirror = (pts, m) => pts.map(([x, y]) => [2 * m - x, y]).reverse();
  const bays = [];
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], A = bayArch(a, b);
    const kind = isCollapsed(a, b) ? 'fallen' : (SPAN.crack.x > a && SPAN.crack.x < b ? 'crack' : 'whole');
    bays.push({ A, kind });
    const L = halfBay(A, kind), R = halfBay(A, kind, true); // the eastern half: built as a western one, mirrored
    body.push(extrudeXY(L.out, Z0, Z1), extrudeXY(mirror(R.out, A.m), Z0, Z1));
    body.push(extrudeXY(L.ring, Z0 - 0.5, Z1 + 0.5), extrudeXY(mirror(R.ring, A.m), Z0 - 0.5, Z1 + 0.5));
  }
  // the abutments, 48 m into the walls: the gate's face to the end pier
  body.push(extrudeXY([[-SPAN.gateX, BOT], [P[0], BOT], [P[0], Y], [-SPAN.gateX, Y]], Z0, Z1));
  body.push(extrudeXY([[P[P.length - 1], BOT], [SPAN.gateX, BOT], [SPAN.gateX, Y], [P[P.length - 1], Y]], Z0, Z1));
  // the piers' cutwaters, pointed up and down the line, capped where the arches spring
  for (let i = 1; i < P.length - 1; i++) {
    const a = P[i], ys = Math.min(bays[i - 1].A.ys, bays[i].A.ys);
    const ring = (tip) => [[a - T2, Z0], [a, Z0 - tip], [a + T2, Z0], [a + T2, Z1], [a, Z1 + tip], [a - T2, Z1]];
    body.push(clean(loft([{ y: BOT, pts: ring(7) }, { y: ys - 5, pts: ring(7) }, { y: ys + 2, pts: ring(0.4) }])));
  }
  // the deck's cornice and parapets, on the standing deck only; the crack splits them
  const deckRuns = [];
  for (const [x0, x1] of SPAN.decks) {
    const c0 = SPAN.crack.x - SPAN.crack.w / 2, c1 = SPAN.crack.x + SPAN.crack.w / 2;
    if (x0 < c0 && x1 > c1) deckRuns.push([x0, c0], [c1, x1]); else deckRuns.push([x0, x1]);
  }
  const gaps = [STAIRS.west.gap, STAIRS.east.gap];
  const rails = []; // v8-10: each parapet piece as it stands, for its collider: [x0, x1, zA, zB, height]
  for (const [x0, x1] of deckRuns) {
    body.push(box(x0, x1, Y - 2.1, Y - 1.0, Z0 - 0.7, Z1 + 0.7));
    for (const [zA, zB, north] of [[Z0, Z - SPAN.inner, true], [Z + SPAN.inner, Z1, false]]) {
      let x = x0;
      while (x < x1 - 0.5) {
        const xb = Math.min(x1, x + 5 + rng() * 5);
        const inGap = north && gaps.some(([g0, g1]) => x < g1 && xb > g0);
        if (inGap) {
          for (const [g0, g1] of gaps) if (north && x < g1 && xb > g0) {
            if (x < g0) { body.push(box(x, g0, Y, Y + 1.05, zA, zB)); rails.push([x, g0, zA, zB, 1.05]); }
            if (xb > g1) { body.push(box(g1, xb, Y, Y + 1.05, zA, zB)); rails.push([g1, xb, zA, zB, 1.05]); }
          }
        } else {
          const r = rng(), top = r < 0.1 ? 0.35 : r < 0.22 ? 0.7 : 1.05; // a few courses fallen
          body.push(box(x + 0.04, xb - 0.04, Y, Y + top, zA, zB)); rails.push([x + 0.04, xb - 0.04, zA, zB, top]);
        }
        x = xb;
      }
    }
  }
  K.bays = bays; K.gaps = gaps;
  // ---------------------------------------------------------------- the deck: walkable, parapets collide
  ctx.addWalkable(deckAt);
  // v8-10 (#7): each parapet piece is a capsule at its own height (1.05 m, or 0.7 and 0.35 where courses have
  // fallen), so a hop and a scramble put the walker on top of it, 56 m over the ground, and a step outward drops
  // them as the crack does. Its inner face stops a walker on the deck where SPAN.keep says.
  for (const [x0, x1, zA, zB, top] of rails) {
    const r = (zB - zA) / 2, zc = (zA + zB) / 2, e = Math.min(r, (x1 - x0) / 2);
    addCol({ x1: x0 + e, z1: zc, x2: x1 - e, z2: zc, r, y: Y - 0.5, h: top + 0.5 });
  }
  // v10-T1 (#15): a low kerb along each broken edge (the crack's two lips, the three fallen bays' ends), its top 0.14 m
  // over the deck: a walker who walks on stops 0.3 m short of the edge and can look down into the gap, and a hop
  // (feet more than 0.02 m up) goes over it as before, to clear the crack or to drop. Its axis lies 0.45 m out over the
  // gap, so the push on a walker on the deck is back along the deck.
  K.kerbs = [];
  for (const [x0, x1] of deckRuns) for (const [x, dir] of [[x0, 1], [x1, -1]]) {
    if (Math.abs(x) > SPAN.gateX - 1) continue;
    const kx = x - dir * 0.45; // dir 1: the run starts here (its gap lies to -x)
    K.kerbs.push(kx);
    addCol({ x1: kx, z1: Z - SPAN.inner, x2: kx, z2: Z + SPAN.inner, r: 0.3, y: Y - 0.5, h: 0.64, stand: false });
  }
  // the piers and abutments at ground level, up to just under the deck
  const footY = (x) => Math.min(H(x - 6, Z), H(x + 6, Z), H(x, Z - 8), H(x, Z + 8)) - 3;
  for (let i = 0; i < P.length; i++) {
    const a = P[i], yb = footY(a);
    // (their tops are under the deck, not surfaces: stand: false, so a walker falling past one is not caught in the air)
    addCol({ x: a, z: Z, r: 8, y: yb, h: Y - 1 - yb, stand: false });
    if (i > 0 && i < P.length - 1) { addCol({ x: a, z: Z0 - 1.5, r: 5, y: yb, h: Y - 1 - yb, stand: false }); addCol({ x: a, z: Z1 + 1.5, r: 5, y: yb, h: Y - 1 - yb, stand: false }); }
  }
  for (const s of [-1, 1]) {
    const xa = s < 0 ? -SPAN.gateX : P[P.length - 1], xb = s < 0 ? P[0] : SPAN.gateX;
    for (let x = xa; x <= xb; x += 2.5) for (const z of [Z0 - 1.5, Z1 + 1.5]) addCol({ x, z, r: 1.5, y: BOT - 20, h: Y - 1 - (BOT - 20), stand: false });
  }

}
