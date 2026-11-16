// A climbable ladder (v15-V0): the first in the walk. The visitor walks into its foot and holds forward to go up; at
// the top, walks at its head (forward or backing off) to come down. It is a carry (ctx.controls.carry): while on it
// nothing else moves them, the look stays free, and the forward key means "the way I was facing when I took hold":
// toward the wall, up; away from it, down. Back does the other. Letting go of the keys, they hang where they are.
// Pushing sideways for half a second, or a hop, lets go (they drop: never more than the ladder's height). A teleport
// ends it. It works the same on the touch stick (the stick's forward and back are the keys').
//
//   ladder(K, { name, x, z (the wall's face at its foot), y0, y1 (the floors it joins), n: [nx, nz] (unit, into the
//               wall: from the lower floor toward the upper), width (0.5), over (1.1: its poles above the top) })
// Draws it (two poles, lashed rungs), registers its ascent with a tick (so tools/heights-test.mjs's own clock climbs
// it) and returns { state(), foot, head }.
import { mat } from '../../structures/geo.js';
import { frame } from './stairs.js';

const SPEED = 1.5, REACH = 0.8, OUT0 = 0.62, OUT1 = 0.34; // m/s on the rungs; how near its foot or head takes hold; how far off the wall the climber is, bottom and top
export function ladder(K, o) {
  const { B, C, ctx } = K, rng = K.rng, [nx, nz] = o.n, H = o.y1 - o.y0, w = o.width ?? 0.5, over = o.over ?? 1.1;
  // ---- the thing: poles leaning on the wall's head, rungs every 0.3 m, the foot 0.5 m out
  const F = frame(o.x, o.y0, o.z, -nx, -nz), lean = Math.atan2(0.5 - 0.06, H), len = Math.hypot(H + over, 0.5) + 0.2, wood = C.late.wood;
  for (const sd of [-1, 1]) B.add(B.cyl(0.04, 0.05, len, 6, 1), F.clone().multiply(mat(sd * w / 2, (H + over) / 2 - 0.1, 0.5 - Math.tan(lean) * ((H + over) / 2 - 0.1), -lean, 0, sd * 0.01)), { color: C.late.wood.clone().multiplyScalar(0.95 + rng() * 0.3), moss: 0.15, ground: o.y0 });
  for (let y = 0.3; y < H + over - 0.25; y += 0.3) {
    const pale = rng() < 0.16;
    B.add(B.cyl(0.022, 0.022, w + 0.14, 5, 1), F.clone().multiply(mat(0, y, 0.5 - Math.tan(lean) * y, (rng() - 0.5) * 0.06, 0, Math.PI / 2 + (rng() - 0.5) * 0.05)), { color: wood.clone().multiplyScalar(pale ? 2.1 : 1.1 + rng() * 0.4), moss: pale ? 0 : 0.12, ground: o.y0 });
  }
  // lashed to an iron staple in the nosing; a flat stone under its feet
  B.add(B.box(w + 0.3, 0.05, 0.08), F.clone().multiply(mat(0, H - 0.05, 0.1)), { color: C.late.iron, iron: 1, moss: 0, ground: o.y0 });
  B.add(B.box(w + 0.5, 0.1, 0.5, { chip: 0.04 }), F.clone().multiply(mat(0, 0.03, 0.5)), { color: C.heliarch.dark, moss: 0.5, ground: o.y0 });

  // ---- the climb
  const P = ctx.player, ctl = ctx.controls;
  const foot = [o.x - nx * OUT0, o.z - nz * OUT0], head = [o.x + nx * 0.55, o.z + nz * 0.55];
  const st = { on: false, t: 0, sign: 1, side: 0, release: null, climbs: 0, want: null };
  const at = (t, out) => { const k = OUT0 + (OUT1 - OUT0) * (t / H); out.set(o.x - nx * k, o.y0 + t + P.eye, o.z - nz * k); };
  const facing = () => -Math.sin(P.yaw) * nx - Math.cos(P.yaw) * nz; // > 0: looking at the wall
  function off(where) {
    const r = st.release; st.on = false; st.release = null; st.want = null;
    if (r) r();
    if (where === 'top') ctl.placeAt(head[0], head[1], o.y1);
    else if (where === 'foot') ctl.placeAt(o.x - nx * 0.95, o.z - nz * 0.95, o.y0);
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
    if (push > 0.3 && Math.abs(feet - o.y0) < 0.35 && dxf * dxf + dzf * dzf < REACH * REACH && P.onGround) return take(0);
    const dxh = P.pos.x - head[0], dzh = P.pos.z - head[1];
    // (from the top they must be at its head and walking squarely off the edge: the lane passes a stride behind it)
    if (push < -0.6 && Math.abs(feet - o.y1) < 0.35 && dxh * dxh + dzh * dzh < 0.6 * 0.6 && P.onGround) return take(H);
  }
  ctx.registerUpdate(tick, { pos: { x: o.x, z: o.z }, near: 30, hz: 0 });
  K.ascent({ id: o.name, tick, held: true, offs: [0.12, 0.92],
    path: [[o.x - nx * 3.2, o.z - nz * 3.2, o.y0], [foot[0], foot[1], o.y0], [head[0], head[1], o.y1], [o.x + nx * 3.2, o.z + nz * 3.2, o.y1]] });
  return { state: () => ({ on: st.on, t: st.t, sign: st.sign, climbs: st.climbs }), foot, head, height: H };
}
