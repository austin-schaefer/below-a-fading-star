// A hole's drawn lip (v15-W3, the orchestrator's round on the owner's "pits ... go up to edge and fall in"): where the
// ground visibly breaks round a hole, found from the floors themselves, smoothed to the rim's hull, and given to the
// edge-guard with ctx.addLip (src/controls.js). A plain walk along the rim is held there, at the top of the crust, not
// halfway down it; a push square at it, a hurry or a hop goes over. Nothing unseen stands there: it is a lip, not a wall.
// holeLip(ctx, { x, z, rim(b) (the mapped rim's radius on bearing b, degrees), open(x, z) (true: no lip there, a way in),
//   out (m outside the rim to start looking, default 6), in (m inside it to stop, default 3) })
// The line is found once, on its first use (72 bearings, a march in 0.1 m steps over the floor that holds the feet):
// the outermost point where the floor falls more than 0.35 m inward over 0.5 m (35 degrees). Smoothed: the outermost of
// each three neighbours, then the mean of five, so a jag of a few metres does not turn its line.
const N = 72, STEP = 0.1;
export function holeLip(ctx, o) {
  const out = o.out ?? 6, inn = o.in ?? 3;
  let R = null;
  const bearing = (x, z) => { const b = Math.atan2(x - o.x, -(z - o.z)) * 180 / Math.PI; return b < 0 ? b + 360 : b; };
  function build() {
    const fl = ctx.controls.floorAt, raw = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const b = (i * 360) / N, a = (b * Math.PI) / 180, dx = Math.sin(a), dz = -Math.cos(a), r0 = o.rim(b);
      const f = []; let feet = null;
      for (let r = r0 + out; r >= r0 - inn; r -= STEP) {
        const y = fl(o.x + dx * r, o.z + dz * r, feet === null ? 1e4 : feet + 0.4).y;
        f.push([r, y]); feet = y;
      }
      let rb = r0;
      const k = Math.round(0.5 / STEP);
      for (let j = 0; j + k < f.length; j++) if (f[j][1] - f[j + k][1] > 0.35) { rb = f[j][0]; break; }
      raw[i] = rb;
    }
    const hull = raw.map((_, i) => Math.max(raw[(i + N - 1) % N], raw[i], raw[(i + 1) % N]));
    R = hull.map((_, i) => { let s = 0; for (let d = -2; d <= 2; d++) s += hull[(i + d + N) % N]; return s / 5; });
  }
  const rLip = (b) => { const f = (b / 360) * N, i = Math.floor(f) % N, t = f - Math.floor(f); return R[i] * (1 - t) + R[(i + 1) % N] * t; };
  let big = 0; for (let b = 0; b < 360; b += 5) big = Math.max(big, o.rim(b));
  const pad = big + out + 2;
  const L = {
    name: o.name || '',
    x0: o.x - pad, x1: o.x + pad, z0: o.z - pad, z1: o.z + pad,
    edge(x, z) {
      if (o.open && o.open(x, z)) return 1;
      if (!R) build();
      return Math.hypot(x - o.x, z - o.z) - rLip(bearing(x, z));
    },
    get line() { if (!R) build(); return R; },
  };
  ctx.addLip(L);
  (ctx.holeLips ||= []).push(L); // (for tests: tools/edges-test.mjs)
  return L;
}
