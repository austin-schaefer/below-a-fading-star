// The height tape (v13 L4): a module's own calls to the ground's pure queries, kept between visits. A builder that
// spends its time asking the ground (galleries, annals, vegetation, the regions' skins) runs exactly as before,
// every rng draw, clearance, collider and registration in its own order; only the answers come from the tape.
//   const tape = await keptHeights(ctx, 'galleries'); const terrain = tape.terrain; ... ; tape.done();
// tape.terrain is ctx.terrain with its own heightAt, slopeAt, causewayDistance and biomeAt (each a pure function of
// (x, z) in field.js). A builder that hands ctx on to helpers wraps each synchronous stretch of its build in
// tape.run(() => ...): for that stretch ctx.terrain's own four are the tape's (no other module's code runs inside a
// synchronous stretch; never put an await inside one), and put back after it, also on a throw.
// On a first visit each query answers from the terrain and writes the call down (x, z and the answer as float64;
// biomeAt's eleven fields); done() keeps each query's tape (ctx.kept.open: the same store, keying and checks as any
// record), in parts of at most PART bytes, so no one write holds the main thread long (slots '<name>.<query>' and
// '<name>.<query>.<k>'), and from then on each is the terrain's own. On a repeat, a call is answered from the tape only
// when its (x, z) are bit for bit those of the next entry or one of the AHEAD after it (the tape resyncs past entries the
// module no longer asks for); else by the terrain without moving on: so every answer is the number a first visit gets,
// whatever the tape holds. A query whose parts are not all there records again. A builder that never reaches done()
// keeps nothing (a miss next time). tape.stats: { calls, fromTape, missed, skipped, bytes }; done() lets the arrays go.
const CHUNK = 1 << 12, AHEAD = 8, PART = 1.5e6;
const NUM = ['heightAt', 'slopeAt', 'causewayDistance'];
const BIOME = ['moor', 'heath', 'wood', 'marsh', 'shore', 'rock', 'ice', 'orchard', 'crystal', 'slope', 'h']; // biomeWith's fields, in its order
const W = { heightAt: 1, slopeAt: 1, causewayDistance: 1, biomeAt: BIOME.length };
const pack = { biomeAt: (o, v, j) => { for (let k = 0; k < BIOME.length; k++) v[j + k] = o[BIOME[k]]; } };
const unpack = { biomeAt: (v, j) => { const o = {}; for (let k = 0; k < BIOME.length; k++) o[BIOME[k]] = v[j + k]; return o; } };
const cat = (list) => { const out = new Float64Array(list.reduce((n, a) => n + a.length, 0)); let o = 0; for (const a of list) { out.set(a, o); o += a.length; } return out; };

export async function keptHeights(ctx, name, base = ctx.terrain) {
  const stats = { calls: 0, fromTape: 0, missed: 0, skipped: 0, bytes: 0 };
  if (!ctx.kept?.open) return { terrain: base, stats, run: (fn) => fn(), done() {} };
  const terrain = Object.create(base);
  let closed = false;
  const fns = [...NUM, 'biomeAt'].filter((f) => typeof base[f] === 'function');
  const own = fns.map((f) => base[f]);
  const run = (fn) => {
    if (closed) return fn();
    for (const f of fns) base[f] = terrain[f];
    try { return fn(); } finally { fns.forEach((f, k) => { base[f] = own[k]; }); }
  };
  const finish = []; // per query: done()'s part
  let first = true;
  for (const f of fns) {
    const F = base[f], w = W[f], un = unpack[f], pk = pack[f];
    const s0 = await ctx.kept.open(`${name}.${f}`);
    if (first && s0.timing) { s0.timing.tape = stats; first = false; }
    // the parts: part 0 says how many there are
    const slots = [s0];
    let parts = s0.data ? [s0.data] : null;
    for (let k = 1; parts && k < (s0.data.parts || 1); k++) { const sk = await ctx.kept.open(`${name}.${f}.${k}`); slots.push(sk); if (sk.data) parts.push(sk.data); else parts = null; }
    if (parts) {
      let xs = cat(parts.map((p) => p.xs)), zs = cat(parts.map((p) => p.zs)), vs = cat(parts.map((p) => p.vs));
      parts = null; for (const sk of slots) sk.data = null;
      const n = xs.length;
      stats.bytes += (xs.length + zs.length + vs.length) * 8;
      let i = 0;
      terrain[f] = (x, z) => {
        if (closed) return F(x, z);
        stats.calls++;
        // call i, or (a call the module no longer makes) one of the next AHEAD: the tape resyncs there
        for (let j = i, e = Math.min(n, i + AHEAD + 1); j < e; j++) {
          if (Object.is(xs[j], x) && Object.is(zs[j], z)) { stats.fromTape++; if (j > i) stats.skipped += j - i; i = j + 1; return un ? un(vs, j * w) : vs[j]; }
        }
        stats.missed++; // (a call the tape lacks: answered by the terrain, the tape stays where it was)
        return F(x, z);
      };
      finish.push(() => { xs = zs = vs = null; });
      continue;
    }
    const T = { xs: new Float64Array(CHUNK), zs: new Float64Array(CHUNK), vs: new Float64Array(CHUNK * w), n: 0 };
    terrain[f] = (x, z) => {
      const v = F(x, z);
      if (closed) return v;
      if (T.n === T.xs.length) {
        const grow = (a) => { const b = new Float64Array(a.length * 2); b.set(a); return b; };
        T.xs = grow(T.xs); T.zs = grow(T.zs); T.vs = grow(T.vs);
      }
      const i = T.n++;
      T.xs[i] = x; T.zs[i] = z;
      if (pk) pk(v, T.vs, i * w); else T.vs[i] = v;
      stats.calls++;
      return v;
    };
    finish.push(async () => {
      const per = Math.max(1, Math.floor(PART / ((2 + w) * 8))), np = Math.max(1, Math.ceil(T.n / per));
      for (let k = 0; k < np; k++) {
        const a = k * per, b = Math.min(T.n, a + per);
        const sk = k < slots.length ? slots[k] : await ctx.kept.open(`${name}.${f}.${k}`);
        sk.keep({ parts: np, xs: T.xs.slice(a, b), zs: T.zs.slice(a, b), vs: T.vs.slice(a * w, b * w) });
      }
      stats.bytes += T.n * (2 + w) * 8;
      T.xs = T.zs = T.vs = null;
    });
  }
  return {
    terrain, stats, run,
    done() {
      if (closed) return;
      closed = true;
      for (const fin of finish) fin();
    },
  };
}
