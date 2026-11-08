// v2 inhabitants: H the Wimpled Guest at the taverna's dry fountain, I the Sable Galley on Lees Tarn, AB the
// Menology with its lizards. Names [Proposed]. Follows the module contract in README.md; each site lives in
// src/v2/inhabitants/*.js and is built here in turn, so one failing does not take the others with it.
// Exposes ctx.inhabitants2 = { guest, galley, menology, report } for tests and the console.
export async function build(ctx) {
  const [g, s, m] = await Promise.all([
    import('./inhabitants/guest.js'), import('./inhabitants/galley.js'), import('./inhabitants/menology.js'),
  ]);
  const out = ctx.inhabitants2 = { report: {} };
  for (const [name, fn] of [['guest', g.buildGuest], ['galley', s.buildGalley], ['menology', m.buildMenology]]) {
    const t0 = performance.now();
    try {
      const r = fn(ctx);
      out[name] = r.api;
      out.report[name] = { drawCalls: r.drawCalls, tris: Math.round(r.tris), ms: Math.round(performance.now() - t0) };
    } catch (e) { console.error(`[fp] inhabitants2: ${name} failed:`, e?.stack || e); }
  }
  ctx.log('inhabitants2', JSON.stringify(out.report));
  return out;
}
