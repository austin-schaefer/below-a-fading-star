// The height tape (v13 L4): a module's own calls to the ground's pure queries, kept between visits. A builder that
// spends its time asking the ground (galleries, annals, vegetation, the regions' skins) runs exactly as before,
// every rng draw, clearance, collider and registration in its own order; only the answers come from the tape.
//   const tape = await keptHeights(ctx, 'galleries'); const terrain = tape.terrain; ... ; tape.done();
// tape.terrain is ctx.terrain with its own heightAt, slopeAt, causewayDistance and biomeAt (each a pure function of
// (x, z) in field.js). A builder that hands ctx on to helpers wraps each synchronous stretch of its build in
// tape.run(() => ...): for that stretch ctx.terrain's own four are the tape's (no other module's code runs inside a
// synchronous stretch; never put an await inside one), and put back after it, also on a throw. On a first visit each answers from the terrain and writes the call down (x, z and the
// answer as float64; biomeAt's eleven fields); done() keeps the tape (ctx.kept.open: the same store, keying and checks
// as any record) and from then on each is the terrain's own. On a repeat, call i of a query is answered from the tape
// only when its (x, z) are bit for bit call i's, else by the terrain without moving on: so every answer is the number a
// first visit gets, whatever the tape holds. A builder that never reaches done() keeps nothing (a miss next time).
// tape.stats: { calls, fromTape, missed, bytes }.
const CHUNK = 1 << 12;
const NUM = ['heightAt', 'slopeAt', 'causewayDistance'];
const BIOME = ['moor', 'heath', 'wood', 'marsh', 'shore', 'rock', 'ice', 'orchard', 'crystal', 'slope', 'h']; // biomeWith's fields, in its order
const W = { heightAt: 1, slopeAt: 1, causewayDistance: 1, biomeAt: BIOME.length };
const pack = { biomeAt: (o, v, j) => { for (let k = 0; k < BIOME.length; k++) v[j + k] = o[BIOME[k]]; } };
const unpack = { biomeAt: (v, j) => { const o = {}; for (let k = 0; k < BIOME.length; k++) o[BIOME[k]] = v[j + k]; return o; } };

export async function keptHeights(ctx, name, base = ctx.terrain) {
  const stats = { calls: 0, fromTape: 0, missed: 0, bytes: 0 };
  const plain = { terrain: base, stats, run: (fn) => fn(), done() {} };
  if (!ctx.kept?.open) return plain;
  const slot = await ctx.kept.open(`${name}.heights`);
  if (slot.timing) slot.timing.tape = stats;
  const terrain = Object.create(base);
  let closed = false;
  const fns = [...NUM, 'biomeAt'].filter((f) => typeof base[f] === 'function');
  const own = fns.map((f) => base[f]);
  const run = (fn) => {
    if (closed) return fn();
    for (const f of fns) base[f] = terrain[f];
    try { return fn(); } finally { fns.forEach((f, k) => { base[f] = own[k]; }); }
  };
  if (slot.data) {
    for (const f of fns) {
      const F = base[f], rec = slot.data[f], w = W[f], un = unpack[f];
      if (!rec) continue;
      const { xs, zs, vs } = rec, n = xs.length;
      stats.bytes += xs.byteLength + zs.byteLength + vs.byteLength;
      let i = 0;
      terrain[f] = (x, z) => {
        if (closed) return F(x, z);
        stats.calls++;
        if (i < n && Object.is(xs[i], x) && Object.is(zs[i], z)) { stats.fromTape++; const j = i++; return un ? un(vs, j * w) : vs[j]; }
        stats.missed++;
        return F(x, z);
      };
    }
    return { terrain, stats, run, done() { closed = true; } };
  }
  const tapes = {};
  for (const f of fns) {
    const F = base[f], w = W[f], pk = pack[f];
    const T = (tapes[f] = { xs: new Float64Array(CHUNK), zs: new Float64Array(CHUNK), vs: new Float64Array(CHUNK * w), n: 0 });
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
  }
  return {
    terrain, stats, run,
    done() {
      if (closed) return;
      closed = true;
      const data = {};
      for (const f of fns) {
        const T = tapes[f];
        if (!T.n) continue;
        data[f] = { xs: T.xs.slice(0, T.n), zs: T.zs.slice(0, T.n), vs: T.vs.slice(0, T.n * W[f]) };
        stats.bytes += T.n * 16 + T.n * W[f] * 8;
      }
      slot.keep(data);
      for (const f of fns) tapes[f].xs = tapes[f].zs = tapes[f].vs = null;
    },
  };
}
