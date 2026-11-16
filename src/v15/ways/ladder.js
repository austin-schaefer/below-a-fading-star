// Ladders (v15-V0, made one behaviour everywhere by v15-W2). The owner's rule (2026-11-16): a ladder that reads as a
// way up (it stands on ground a walker reaches, leads to a place a person could be, its foot clear) is climbable, all
// of them the same way; one that stays scenery must not look like a way up (leaning shallow on blank wall, lying
// down, drawn up out of reach, broken off above the head).
//
// The climb: the visitor walks into its foot and holds forward to go up; at the top, walks at its head (forward or
// backing off) to come down. It is a carry (ctx.controls.carry): while on it nothing else moves them, the look stays
// free, and the forward key means "the way I was facing when I took hold": toward the wall, up; away from it, down.
// Back does the other. Letting go of the keys, they hang where they are. Pushing sideways for half a second, or a hop,
// lets go (they drop: never more than the ladder's height). A teleport ends it. It works the same on the touch stick
// (the stick's forward and back are the keys').
//
//   climb(ctx, { name, mod, foot: [x, z, y0] (where its poles stand), top: [x, z, y1] (where the poles pass the upper
//                floor's level, y1 that floor's height), n: [nx, nz] (unit, level: from the foot toward the upper
//                floor), back: [b0, b1] (how far behind the rungs the eye hangs, bottom and top: 0.12, 0.34), off (0.55:
//                how far past `top` along n they are set on the upper floor; or head: [x, z], the point itself),
//                from, away ([x, z]: the ascent's first and last points, default 2.7 m out from the foot and 3.2 m
//                in past the top), perch ('what it is': its head is a place to stand and the way's end, a scaffold's
//                stage, a ledge: tools/ways-test.mjs asks no landing or way on of it) })
// registers the climb (a tick, an ascent `name` with held: true so tools/heights-test.mjs climbs it on its own
// clock, and an entry in the ladders' register) and returns { state(), foot, head, height }.
//   ladder(K, { name, x, z (the wall's face at its foot), y0, y1 (the floors it joins), n, width (0.5), over (1.1) })
// is the ways' own: draws two poles and lashed rungs on a wall's face, then climb()s it.
//   ladders(ctx).add({ id, mod, foot, top, scenery: 'why it does not read as a way up' }): a ladder drawn as scenery.
// Every ladder drawn anywhere is in ctx.ladders.list, climbable or scenery; tools/ways-test.mjs fails one that is
// neither, and a file under src/ that draws one without saying which.
import { mat } from '../../structures/geo.js';
import { frame } from './stairs.js';

const SPEED = 1.5, REACH = 0.8; // m/s on the rungs; how near its foot takes hold

// the register of every ladder drawn: { id, mod, foot: [x, z, y], top: [x, z, y], climb: true } or { ..., scenery }
export function ladders(ctx) {
  if (!ctx.ladders) { const list = []; ctx.ladders = { list, add(d) { list.push(d); return d; }, get: (id) => list.find((d) => d.id === id) }; }
  return ctx.ladders;
}

export function climb(ctx, o) {
  const [fx, fz, y0] = o.foot, [tx, tz, y1] = o.top, [nx, nz] = o.n, H = y1 - y0, [b0, b1] = o.back || [0.12, 0.34], offT = o.off ?? 0.55;
  const P = ctx.player, ctl = ctx.controls;
  const foot = [fx - nx * b0, fz - nz * b0], head = o.head ? [o.head[0], o.head[1]] : [tx + nx * offT, tz + nz * offT], down = [fx - nx * (b0 + 0.33), fz - nz * (b0 + 0.33)];
  const st = { on: false, t: 0, sign: 1, side: 0, release: null, climbs: 0, want: null };
  const at = (t, out) => { const k = t / H; out.set(fx - nx * b0 + (tx - nx * b1 - fx + nx * b0) * k, y0 + t + P.eye, fz - nz * b0 + (tz - nz * b1 - fz + nz * b0) * k); };
  const facing = () => -Math.sin(P.yaw) * nx - Math.cos(P.yaw) * nz; // > 0: looking at the wall
  function off(where) {
    const r = st.release; st.on = false; st.release = null; st.want = null;
    if (r) r();
    if (where === 'top') {
      // (placeAt keeps 0.6 m off every collider: on a scaffold's stage between the wall and the standards that is
      // more room than there is, and it would push them off the edge; the floor at the head holds a walker, so there)
      const r = ctl.placeAt(head[0], head[1], y1);
      if (Math.abs(r.y - y1) > 0.2 || Math.hypot(r.x - head[0], r.z - head[1]) > 0.3) P.pos.set(head[0], y1 + P.eye, head[1]);
    }
    else if (where === 'foot') { const r = ctl.placeAt(down[0], down[1], y0); if (Math.abs(r.y - y0) > 0.2) P.pos.set(down[0], y0 + P.eye, down[1]); }
    else P.pos.set(P.pos.x - nx * 0.25, P.pos.y, P.pos.z - nz * 0.25); // let go: they drop from where they hang
  }
  function take(t) {
    st.from = P.pos.clone(); st.ease = 0;
    st.on = true; st.want = null; st.t = t; st.side = 0; st.sign = facing() >= 0 ? 1 : -1; st.climbs++;
    st.release = ctl.carry({
      step(pos, dt) {
        const mz = P.moveZ || 0, mx = P.moveX || 0;
        if (P.lookQuiet < 0.2 && Math.abs(facing()) > 0.45) st.sign = facing() >= 0 ? 1 : -1; // they turned round on it
        st.t += st.sign * mz * SPEED * Math.min(dt, 0.05);
        st.side = Math.abs(mx) > 0.7 && Math.abs(mz) < 0.3 ? st.side + dt : 0;
        // (they are given back from tick(), after this frame's carry is done: the controls still hold them here)
        if (st.t >= H) { st.t = H; st.want = 'top'; } else if (st.t <= 0 && st.sign * mz < 0) st.want = 'foot';
        else if (st.side > 0.5 || P.keys.has('Space')) st.want = 'drop';
        st.t = Math.max(0, st.t);
        at(st.t, pos);
        if (st.ease < 1) { st.ease = Math.min(1, st.ease + dt / 0.28); const e = st.ease * st.ease * (3 - 2 * st.ease); pos.set(st.from.x + (pos.x - st.from.x) * e, st.from.y + (pos.y - st.from.y) * e, st.from.z + (pos.z - st.from.z) * e); } // the hands find the rung
      },
      // they face the rungs on the way up unless they are looking about themselves
      look(dt, quiet) { return st.sign > 0 && quiet > 0.6 ? { yaw: Math.atan2(-nx, -nz), pitch: P.pitch, rate: 2.5 } : null; },
      drop() { st.on = false; st.release = null; st.want = null; },
    });
  }
  function tick() {
    if (st.on) { if (st.want) off(st.want); return; }
    if (P.carried || P.enabled === false) return;
    const mz = P.moveZ || 0;
    if (Math.abs(mz) < 0.3) return;
    const feet = P.pos.y - P.eye, push = facing() * mz; // > 0: pressing toward the wall
    const dxf = P.pos.x - foot[0], dzf = P.pos.z - foot[1];
    if (push > 0.3 && Math.abs(feet - y0) < 0.35 && dxf * dxf + dzf * dzf < REACH * REACH && P.onGround) return take(0);
    const dxh = P.pos.x - head[0], dzh = P.pos.z - head[1];
    // (from the top they must be at its head and walking squarely off the edge: a lane may pass a stride behind it)
    if (push < -0.6 && Math.abs(feet - y1) < 0.35 && dxh * dxh + dzh * dzh < 0.6 * 0.6 && P.onGround) return take(H);
  }
  ctx.registerUpdate(tick, { pos: { x: (fx + tx) / 2, y: (y0 + y1) / 2 + P.eye, z: (fz + tz) / 2 }, near: 30 + H / 2, hz: 0 }); // (its own y: high up, the throttle measures from the eye)
  const from = o.from || [fx - nx * 2.7, fz - nz * 2.7], away = o.away || [tx + nx * 3.2, tz + nz * 3.2];
  ctx.ascents?.add({ id: o.name, tick, held: true, offs: [0.12, 0.92], ladder: true, perch: o.perch,
    path: [[from[0], from[1], y0], [foot[0], foot[1], y0], [head[0], head[1], y1], [away[0], away[1], y1]] });
  const state = () => ({ on: st.on, t: st.t, sign: st.sign, climbs: st.climbs });
  ladders(ctx).add({ id: o.name, mod: o.mod || '?', foot: [fx, fz, y0], top: [tx, tz, y1], head: [head[0], head[1], y1], n: [nx, nz], take: foot, climb: true, state });
  return { state, foot, head, height: H };
}

export function ladder(K, o) {
  const { B, C, ctx } = K, rng = K.rng, [nx, nz] = o.n, H = o.y1 - o.y0, w = o.width ?? 0.5, over = o.over ?? 1.1;
  // ---- the thing: poles leaning on the wall's head, rungs every 0.3 m, the foot 0.5 m out
  const F = frame(o.x, o.y0, o.z, -nx, -nz), lean = Math.atan2(0.5 - 0.06, H), len = Math.hypot(H + over, 0.5) + 0.2;
  for (const sd of [-1, 1]) B.add(B.cyl(0.04, 0.05, len, 6, 1), F.clone().multiply(mat(sd * w / 2, (H + over) / 2 - 0.1, 0.5 - Math.tan(lean) * ((H + over) / 2 - 0.1), -lean, 0, sd * 0.01)), { color: C.late.wood.clone().multiplyScalar(0.95 + rng() * 0.3), moss: 0.15, ground: o.y0 });
  for (let y = 0.3; y < H + over - 0.25; y += 0.3) {
    const pale = rng() < 0.16;
    B.add(B.cyl(0.022, 0.022, w + 0.14, 5, 1), F.clone().multiply(mat(0, y, 0.5 - Math.tan(lean) * y, (rng() - 0.5) * 0.06, 0, Math.PI / 2 + (rng() - 0.5) * 0.05)), { color: C.late.wood.clone().multiplyScalar(pale ? 2.1 : 1.1 + rng() * 0.4), moss: pale ? 0 : 0.12, ground: o.y0 });
  }
  // lashed to an iron staple in the nosing; a flat stone under its feet
  B.add(B.box(w + 0.3, 0.05, 0.08), F.clone().multiply(mat(0, H - 0.05, 0.1)), { color: C.late.iron, iron: 1, moss: 0, ground: o.y0 });
  B.add(B.box(w + 0.5, 0.1, 0.5, { chip: 0.04 }), F.clone().multiply(mat(0, 0.03, 0.5)), { color: C.heliarch.dark, moss: 0.5, ground: o.y0 });
  return climb(ctx, { name: o.name, mod: o.mod || K.name, foot: [o.x - nx * 0.5, o.z - nz * 0.5, o.y0], top: [o.x, o.z, o.y1], n: [nx, nz] });
}
