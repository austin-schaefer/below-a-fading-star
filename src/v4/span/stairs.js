// The Great Span's stairs (v4, W): at each end a monumental stair climbs the wall beside the gate in three
// switchback flights of worn treads (kit.stair) with landings, one landing fallen so you step across rubble,
// to the deck; masonry beneath every part to its footings, curbs on every open side. Climbable with the
// ordinary controls (each rise about 0.3 m); walk-test climbs the west one.
import * as THREE from 'three';
import { SPAN, STAIRS, STAIR_W, CURB, RUN, BOT, flightRect, deckAt } from './plan.js';
import { box, extrudeXY, extrudeZY, clean } from './geo.js';

const Y = SPAN.deckY, Z = SPAN.z, Z0 = SPAN.z0, Z1 = SPAN.z1;

export function buildStairs(K) {
  const { ctx, rng, H, addCol, stairs, addRubble, hi } = K;
  const kit = ctx.kit;
  // ---------------------------------------------------------------- the stairs
  // kit.stair flights and flat landings (span/plan.js STAIRS); one rise for the whole stair so it lands on the
  // deck; masonry beneath every part down to the footings; curbs on every open side.
  const stairInfo = {};
  const walkParts = []; // { rect, y } landings and { fl } flights, for floorAt and the colliders
  const rectOf = (p) => p.rect || flightRect(p);
  const inRect = (r, x, z, m = 0) => x > r[0] - m && x < r[1] + m && z > r[2] - m && z < r[3] + m;
  for (const [key, S] of Object.entries(STAIRS)) {
    const [fx, fz] = S.foot, y0 = H(fx, fz);
    const flights = S.parts.filter((p) => !p.rect);
    const nSteps = flights.map((f) => Math.max(4, Math.round(f.len / RUN)));
    const rise = (Y - y0) / nSteps.reduce((a, b) => a + b, 0);
    let y = y0, fi = 0;
    const info = { foot: { x: fx, z: fz, y: y0 }, rise: +rise.toFixed(3), steps: 0, flights: [], landings: [] };
    for (const p of S.parts) {
      const r = rectOf(p);
      if (p.rect) {
        stairs.push(box(r[0], r[1], BOT, y, r[2], r[3]));
        walkParts.push({ key, rect: r, y, top: !!p.top, rubble: !!p.rubble });
        info.landings.push({ rect: r, y: +y.toFixed(2) });
        continue;
      }
      const n = nSteps[fi++], run = p.len / n;
      const heading = Math.atan2(-p.dir[0], -p.dir[1]);
      const broken = []; for (let k = 0; k < 3; k++) broken.push(2 + Math.floor(rng() * (n - 4)));
      const st = kit.stair({ x: p.x, z: p.z, y, heading, width: STAIR_W, steps: n, rise, run, wear: 0.85, broken, rng: ctx.makeRng(9400 + fi) }, ctx);
      stairs.push(clean(st.geometry));
      if (y - 1.2 > BOT) stairs.push(box(r[0], r[1], BOT, y - 1.0, r[2], r[3]));
      // the curbs: sloped walls on both sides, 0.95 m above the treads' line
      const yTop = y + n * rise, along = p.dir[0] ? 'x' : 'z';
      for (const side of [-1, 1]) {
        const c0 = (along === 'x' ? p.z : p.x) + side * (STAIR_W / 2), c1 = c0 + side * CURB;
        const s0 = along === 'x' ? p.x : p.z, s1 = s0 + (along === 'x' ? p.dir[0] : p.dir[1]) * p.len;
        const poly = [[s0, y - 1.2], [s1, y - 1.2], [s1, yTop + 0.95], [s0, y + rise + 0.95]];
        if (s1 < s0) poly.reverse();
        stairs.push(along === 'x' ? extrudeXY(poly, Math.min(c0, c1), Math.max(c0, c1)) : extrudeZY(poly, Math.min(c0, c1), Math.max(c0, c1)));
      }
      walkParts.push({ key, rect: r, fl: st, f: p, y0: y, y1: yTop, along });
      info.flights.push({ x: p.x, z: p.z, dir: p.dir, steps: n, run: +run.toFixed(3), y0: +y.toFixed(2), y1: +yTop.toFixed(2) });
      info.steps += n;
      ctx.addWalkable(st.walkable);
      y = yTop;
    }
    stairInfo[key] = info;
  }
  const partY = (w, x, z) => (w.fl ? w.fl.walkable(x, z) : (inRect(w.rect, x, z) ? w.y : null));
  for (const w of walkParts) if (!w.fl) { const r = w.rect, yy = w.y; ctx.addWalkable((x, z) => (x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3] ? yy : null)); }
  // landing curbs on every edge that is not a way on (a part at the same height, or the deck), with colliders;
  // the flights' curbs collide along both sides; open ground round the massif is walled off below its top
  const curbCol = (x, z, yy) => addCol({ x, z, r: 0.9, y: yy - 0.4, h: 2.4 });
  for (const w of walkParts) {
    const r = w.rect;
    if (w.fl) {
      const f = w.f, n = Math.ceil(f.len / 1.2);
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * f.len, x = f.x + f.dir[0] * t, z = f.z + f.dir[1] * t;
        const yy = w.y0 + (w.y1 - w.y0) * (t / f.len);
        const ox = f.dir[1] * (STAIR_W / 2 + CURB / 2 + 1.0 - 0.15), oz = f.dir[0] * (STAIR_W / 2 + CURB / 2 + 1.0 - 0.15);
        curbCol(x + ox, z + oz, yy); curbCol(x - ox, z - oz, yy);
      }
      continue;
    }
    const edges = [[r[0], r[2], r[0], r[3], -1, 0], [r[1], r[2], r[1], r[3], 1, 0], [r[0], r[2], r[1], r[2], 0, -1], [r[0], r[3], r[1], r[3], 0, 1]];
    for (const [ax, az, bx, bz, nx, nz] of edges) {
      const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / 1.2));
      const pieces = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        const ox = x + nx * 0.4, oz = z + nz * 0.4;
        let open = Math.abs(oz - Z) < SPAN.half + 0.6 && deckAt(ox, oz) !== null;
        if (!open) for (const o of walkParts) if (o !== w) { const yo = partY(o, ox, oz); if (yo !== null && Math.abs(yo - w.y) < 0.7) { open = true; break; } }
        pieces.push(open);
        if (!open) curbCol(x + nx * 0.35, z + nz * 0.35, w.y);
      }
      // the curb itself along the closed stretches, inside the landing's edge
      let i0 = -1;
      for (let i = 0; i <= n + 1; i++) {
        const closed = i <= n && !pieces[i];
        if (closed && i0 < 0) i0 = i;
        if (!closed && i0 >= 0) {
          const t0 = Math.max(0, (i0 - 0.5) / n), t1 = Math.min(1, (i - 0.5) / n);
          const xa = ax + (bx - ax) * t0, za = az + (bz - az) * t0, xb = ax + (bx - ax) * t1, zb = az + (bz - az) * t1;
          if (nx) stairs.push(box(nx > 0 ? xa - CURB : xa, nx > 0 ? xa : xa + CURB, w.y - 0.5, w.y + 0.95, Math.min(za, zb), Math.max(za, zb)));
          else stairs.push(box(Math.min(xa, xb), Math.max(xa, xb), w.y - 0.5, w.y + 0.95, nz > 0 ? za - CURB : za, nz > 0 ? za : za + CURB));
          i0 = -1;
        }
      }
    }
  }
  // the ground round each stair: walled off below the parts' tops where the outside is open moor
  for (const w of walkParts) {
    const r = w.rect;
    const edges = [[r[0], r[2], r[0], r[3], -1, 0], [r[1], r[2], r[1], r[3], 1, 0], [r[0], r[2], r[1], r[2], 0, -1], [r[0], r[3], r[1], r[3], 0, 1]];
    for (const [ax, az, bx, bz, nx, nz] of edges) {
      const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / 2));
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        const cx = x + nx * 2, cz = z + nz * 2;
        if (walkParts.some((o) => inRect(o.rect, cx, cz, 0.2)) || (Math.abs(cz - Z) < SPAN.half + 1.5 && Math.abs(cx) > 200)) continue;
        const top = (w.fl ? (partY(w, x - nx * 0.3, z - nz * 0.3) ?? w.y0) : w.y) - 0.8;
        if (top < H(cx, cz) + 0.3) continue;
        addCol({ x: cx, z: cz, r: 1.5, y: BOT - 20, h: top - (BOT - 20) });
      }
    }
  }
  for (const w of walkParts) if (w.rubble) {
    const r = w.rect;
    for (let k = 0; k < (hi ? 26 : 12); k++) { const s = 0.18 + rng() * 0.35; addRubble(r[0] + 0.8 + rng() * (r[1] - r[0] - 1.6), r[2] + 0.8 + rng() * (r[3] - r[2] - 1.6), s, w.y - s * 0.25); }
  }
  K.stairInfo = stairInfo; K.walkParts = walkParts; K.partY = partY;
}
