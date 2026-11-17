#!/usr/bin/env node
// The edge (src/height/outline.js) held to its word, in node (no browser):
//   - |∇sd| is near 1 on the shore (sd is a distance there, so a smoothstep on it is a band of the width it says);
//   - the GLSL glsl() writes, read as JS, gives sd's numbers (the shader's shore is the height's shore);
//   - the same seed draws the same shore, another seed another; polyOutline's inside is negative;
//   - the cost of a call;
//   - Lees Tarn on its outline (src/v4/tarn.js): the water disc covers it, the galley's course and the tarn woman's
//     water are deep, the Scriveners' shallows and the Strandline's strip still meet the shore, and no circle is left.
//   node tools/outline-test.mjs
globalThis.FP_HEIGHT_PARAMS = '?';
const O = await import('../src/height/outline.js');

let pass = 0, fail = 0;
const check = (ok, name, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`); ok ? pass++ : fail++; };
const f2 = (v) => v.toFixed(2);

const SPEC = {
  x: 10, z: -20, r: 50, seed: 77, K: 8, amp: 0.12, falloff: 1.1, warp: 1.2, warpFreq: 0.09,
  window: [{ bearing: 160, half: 40, ramp: 20, min: 0.25 }],
  lobes: [{ bearing: 250, d: 52, r: 14, k: 9 }, { bearing: 330, d: 50, r: 9, k: 6, land: true },
    { bearing: 60, d: 44, r: 6, k: 3, to: { bearing: 66, d: 74, r: 2.5 } }],
};

// the shore: on rays from the centre, where sd changes sign (outermost crossing)
function shorePoints(E, n = 720) {
  const out = [], { x: cx, z: cz } = E.centre;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI, ux = Math.cos(a), uz = Math.sin(a);
    let lo = null;
    for (let d = E.rMax + 2; d > 0; d -= 0.5) if (E.sd(cx + ux * d, cz + uz * d) < 0) { lo = d; break; }
    if (lo === null) continue;
    let a0 = lo, a1 = lo + 0.5;
    for (let k = 0; k < 40; k++) { const m = (a0 + a1) / 2; if (E.sd(cx + ux * m, cz + uz * m) < 0) a0 = m; else a1 = m; }
    out.push([cx + ux * a0, cz + uz * a0]);
  }
  return out;
}
// the shore as a grid finds it: every 0.4 m cell edge whose ends differ in sign, the crossing interpolated
function contour(E, step = 0.4) {
  const out = [], [x0, x1, z0, z1] = E.box;
  for (let z = z0 - 2; z <= z1 + 2; z += step) for (let x = x0 - 2; x <= x1 + 2; x += step) {
    const a = E.sd(x, z), b = E.sd(x + step, z), c = E.sd(x, z + step);
    if ((a < 0) !== (b < 0)) out.push([x + step * a / (a - b), z]);
    if ((a < 0) !== (c < 0)) out.push([x, z + step * a / (a - c)]);
  }
  return out;
}
function gradStats(E, pts, h = 0.05) {
  const g = pts.map(([x, z]) => Math.hypot(E.sd(x + h, z) - E.sd(x - h, z), E.sd(x, z + h) - E.sd(x, z - h)) / (2 * h)).sort((a, b) => a - b);
  return { med: g[g.length >> 1], p05: g[Math.floor(g.length * 0.05)], p95: g[Math.floor(g.length * 0.95)], min: g[0], max: g[g.length - 1] };
}
const glslAsJs = (src) => new Function('sqrt', 'max', 'min', 'clamp', 'sin', 'cos',
  src.replace(/^float \w+\(vec2 p\) \{/, 'return function (p) {').replace(/\bfloat\b/g, 'let'))(
  Math.sqrt, Math.max, Math.min, (v, a, b) => Math.min(Math.max(v, a), b), Math.sin, Math.cos);
let seed = 4242; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

// ---- the generic outline: windows, a bay, a point, an inlet, the warp
{
  const E = O.radialOutline(SPEC);
  const pts = shorePoints(E);
  const g = gradStats(E, pts);
  check(pts.length >= 700, 'every ray from the centre finds the shore', `${pts.length} of 720`);
  check(g.p05 > 0.8 && g.p95 < 1.2 && g.med > 0.93 && g.med < 1.07, '|∇sd| near 1 on the shore', `median ${f2(g.med)}, 5% ${f2(g.p05)}, 95% ${f2(g.p95)} (min ${f2(g.min)}, max ${f2(g.max)})`);
  // inside and out: sd is the distance to the drawn shore within 10% a few metres off it (the bands readers draw)
  const errs = [];
  const cpts = contour(E);
  for (let i = 0; i < 1500; i++) {
    const a = rnd() * 2 * Math.PI, d = E.rMin * 0.5 + rnd() * (E.rMax - E.rMin * 0.5 + 12);
    const x = E.centre.x + Math.cos(a) * d, z = E.centre.z + Math.sin(a) * d, s = E.sd(x, z);
    if (Math.abs(s) < 1 || Math.abs(s) > 10) continue;
    let m = Infinity; for (const [px, pz] of cpts) m = Math.min(m, Math.hypot(px - x, pz - z));
    errs.push((Math.abs(s) - m) / m);
  }
  // (a smooth min joins lobes by a fillet, and behind a land lobe the land is the lobe's and the circle's both: there
  // sd is short, never long, a bound as an SDF union is)
  errs.sort((a, b) => Math.abs(a) - Math.abs(b));
  const p90 = Math.abs(errs[Math.floor(errs.length * 0.9)]), over = Math.max(...errs), mid = Math.abs(errs[errs.length >> 1]);
  check(mid < 0.02 && p90 < 0.25 && over < 0.2, 'within 1 to 10 m of the shore |sd| is the distance to the shore drawn', `median ${(mid * 100).toFixed(1)}%, 90% within ${(p90 * 100).toFixed(0)}%, never over by ${(over * 100).toFixed(0)}% (${errs.length} points)`);
  const G = glslAsJs(E.glsl('edge'));
  let dmax = 0;
  for (let i = 0; i < 20000; i++) {
    const x = E.centre.x + (rnd() * 2 - 1) * (E.rMax + E.far + 20), z = E.centre.z + (rnd() * 2 - 1) * (E.rMax + E.far + 20);
    dmax = Math.max(dmax, Math.abs(G({ x, y: z }) - E.sd(x, z)));
  }
  check(dmax < 1e-6, 'the GLSL (read as JS) gives sd\'s numbers', `max |diff| ${dmax.toExponential(1)} m over 20000 points`);
  check(/^float edge\(vec2 p\) \{[\s\S]*\n\}$/.test(E.glsl('edge')) && !/\b(let|const|Math)\b/.test(E.glsl('edge')), 'the GLSL is one function, no JS left in it');
  const E2 = O.radialOutline(SPEC), E3 = O.radialOutline({ ...SPEC, seed: 78 });
  let same = true, diff = 0;
  for (let i = 0; i < 500; i++) { const x = rnd() * 160 - 70, z = rnd() * 160 - 100; same &&= E2.sd(x, z) === E.sd(x, z); diff = Math.max(diff, Math.abs(E3.sd(x, z) - E.sd(x, z))); }
  check(same && diff > 2, 'the same seed draws the same shore; another seed another', `another seed moves it up to ${f2(diff)} m`);
  const t0 = performance.now(); let acc = 0;
  for (let i = 0; i < 1e6; i++) acc += E.sd(-60 + (i % 1000) * 0.14, -80 + Math.floor(i / 1000) * 0.14);
  const ns = (performance.now() - t0);
  check(ns < 400 && acc !== 0, 'cost: a million calls in the shape\'s box under 0.4 s', `${ns.toFixed(0)} ns a call (K 8, 1 window, 3 lobes, warp)`);
}
// ---- polyOutline
{
  const P = O.polyOutline([[0, 0], [60, -10], [80, 40], [30, 70], [-10, 40]], { seed: 3, amp: 3, freq: 0.06 });
  const inside = P.sd(35, 30) < -10, outside = P.sd(150, 30) > 40 && P.sd(-40, 30) > 10;
  let gs = [];
  for (let i = 0; i < P.pts.n; i += 7) { const x = P.pts.X[i], z = P.pts.Z[i], h = 0.3; const nx = (P.sd(x + 2 + h, z) - P.sd(x + 2 - h, z)) / (2 * h), nz = (P.sd(x + 2, z + h) - P.sd(x + 2, z - h)) / (2 * h); gs.push(Math.hypot(nx, nz)); }
  gs.sort((a, b) => a - b);
  check(inside && outside, 'polyOutline: negative inside, positive out', `sd at its middle ${f2(P.sd(35, 30))}`);
  check(gs[gs.length >> 1] > 0.95 && gs[gs.length >> 1] < 1.05, 'polyOutline: |∇sd| near 1 by its shore', `median ${f2(gs[gs.length >> 1])}`);
}

// ---- Lees Tarn on its outline
const T = await import('../src/v4/tarn.js');
if (!T.TARN_EDGE) check(false, 'Lees Tarn is drawn on its outline (src/v4/tarn.js exports TARN_EDGE)');
else {
  const F = await import('../src/height/field.js');
  const { WATER, LANDMARKS, REGIONS, SITES } = await import('../src/world.js');
  const W = WATER.tarn, E = T.TARN_EDGE;
  check(E.rMax + 3 < W.r && Math.hypot(T.BAY.x - W.x, T.BAY.z - W.z) + T.BAY.r + 0.5 < W.r, 'the water\'s disc (WATER.tarn.r) covers the outline and the bay', `outline ${f2(E.rMax)}, disc ${W.r}`);
  const depth = (x, z) => { const w = F.waterLevelAt(x, z); return w === null ? -1 : w - F.heightAt(x, z); };
  // the galley's loop (src/v2/inhabitants/galley.js makePath), its hull 11 m fore and aft and 2.5 abeam
  {
    const C = { x: -92, z: 104 }, a = 37, aW = 40, bN = 25, bS = 20;
    let worst = Infinity, at = null;
    for (let k = 0; k < 720; k++) {
      const ph = -(k / 720) * Math.PI * 2, sn = Math.sin(ph), cs = Math.cos(ph);
      const x = C.x + cs * (cs < 0 ? aW : a), z = C.z + sn * (sn < 0 ? bN : bS);
      const ph2 = ph - 0.01, x2 = C.x + Math.cos(ph2) * (Math.cos(ph2) < 0 ? aW : a), z2 = C.z + Math.sin(ph2) * (Math.sin(ph2) < 0 ? bN : bS);
      const tl = Math.hypot(x2 - x, z2 - z) || 1, tx = (x2 - x) / tl, tz = (z2 - z) / tl;
      for (const [u, v] of [[-11, 0], [11, 0], [0, 2.5], [0, -2.5], [-11, 2.5], [11, -2.5], [0, 0]]) {
        const px = x + tx * u - tz * v, pz = z + tz * u + tx * v, d = depth(px, pz);
        if (d < worst) { worst = d; at = [px, pz]; }
      }
    }
    check(worst > 2, 'the galley\'s course is deep water under the whole hull (over 2 m)', `shallowest ${f2(worst)} m at ${at.map(f2)}`);
  }
  // the tarn woman walks out from the centre toward the causeway while the water is over 1.5 m (src/fauna/uncanny/tarn.js)
  {
    const tw = { x: -90, z: 2 }, dl = Math.hypot(tw.x - W.x, tw.z - W.z);
    let home = 0; for (let d = 18; d < 58; d++) { if (depth(W.x + (tw.x - W.x) / dl * d, W.z + (tw.z - W.z) / dl * d) > 1.5) home = d; else break; }
    check(home >= 30, 'the tarn woman\'s home lies 30 m or more out, in water over 1.5 m', `${home} m from the centre`);
  }
  // the Scriveners' glyphs lie in the shallows by the north shore
  {
    const S = SITES.scriveners, d = depth(S.x, S.z);
    check(d > 0.2 && d < 2.5, 'the Scriveners\' site is still in the north shallows', `depth ${f2(d)} m`);
  }
  // the Strandline's strip still meets the water: every spine point within 9 m of the shore
  {
    const spine = REGIONS.strandline.shape.strip.filter(([, , w]) => w > 5); // the spit's own spine (4.5 wide) runs out into the water
    const far = spine.filter(([x, z]) => Math.abs(T.tarnShoreDistance(x, z)) > 9);
    check(far.length === 0, 'the Strandline\'s spine lies within 9 m of the shore', far.length ? `off: ${JSON.stringify(far)}` : `${spine.length} points`);
  }
  // no circle: over every 60 degrees of shore, the radius from the centre varies by 4 m or more
  {
    const pts = shorePoints({ ...E, sd: T.tarnShoreDistance, rMax: W.r - 4, centre: { x: W.x, z: W.z } }, 360);
    const rs = pts.map(([x, z]) => Math.hypot(x - W.x, z - W.z));
    let flat = 99, at = 0;
    for (let i = 0; i < rs.length; i++) { let lo = Infinity, hi = -Infinity; for (let j = 0; j < 60; j++) { const v = rs[(i + j) % rs.length]; lo = Math.min(lo, v); hi = Math.max(hi, v); } if (hi - lo < flat) { flat = hi - lo; at = i; } }
    check(flat >= 4, 'no 60 degrees of the tarn\'s shore is a circle round its centre (the radius varies 4 m or more)', `least ${f2(flat)} m, from bearing ${(((at + 90) % 360 + 360) % 360)}`);
  }
}


// ---- every still water: no wet cell stands more than a metre above its water (waterLevelAt says water where the ground
// is over it: the waders, the canyon's spray and the audio's water read it as water)
{
  const F = await import('../src/height/field.js');
  for (const b of F.WATER_BODIES) {
    const w = b.w, st = w.r > 20 ? 2 : 0.5;
    let n = 0, worst = -Infinity, at = null, cells = 0;
    for (let x = w.x - w.r; x <= w.x + w.r; x += st) for (let z = w.z - w.r; z <= w.z + w.r; z += st) {
      if (!b.wet(x, z)) continue;
      cells++;
      const over = F.heightAt(x, z) - w.y;
      if (over > worst) { worst = over; at = [x, z]; }
      if (over > 1) n++;
    }
    let dry = 0, dat = null;
    for (let x = w.x - w.r; x <= w.x + w.r; x += st) for (let z = w.z - w.r; z <= w.z + w.r; z += st) {
      if (b.sd(x, z) >= 0 || F.heightAt(x, z) > w.y - 0.05 || F.waterLevelAt(x, z) !== null) continue;
      dry++; dat = dat || [x, z];
    }
    check(dry === 0, `${b.name}: every cell inside its shore with its ground under the water is wet`, `${dry} dry${dat ? ', first at ' + dat.map(f2) : ''}`);
    // (v16 L5) water held by nothing: a dry cell (no water at all) more than LEAK m under the body's level beside one
    // of its wet cells, on a 1 m grid over its disc and a few metres round it (L3's fen pool at (61, 246), dug into
    // the Saltings' ground that lay under the level already)
    {
      const LEAK = 0.1, g = w.r > 20 ? 1 : 0.5, pad = 4, x0 = w.x - w.r - pad, z0 = w.z - w.r - pad, n = Math.ceil((2 * (w.r + pad)) / g) + 1;
      const WET = new Uint8Array(n * n), LOW = new Uint8Array(n * n);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x = x0 + i * g, z = z0 + j * g, k = i * n + j;
        if (b.wet(x, z)) WET[k] = 1;
        else if (F.heightAt(x, z) < w.y - LEAK && F.waterLevelAt(x, z) === null) LOW[k] = 1;
      }
      let leak = 0, lat = null;
      for (let i = 1; i < n - 1; i++) for (let j = 1; j < n - 1; j++) {
        const k = i * n + j;
        if (LOW[k] && (WET[k - n] || WET[k + n] || WET[k - 1] || WET[k + 1])) { leak++; lat = lat || [x0 + i * g, z0 + j * g]; }
      }
      check(leak === 0, `${b.name}: no dry cell more than ${LEAK} m under its water beside a wet one (water held by nothing)`, `${leak} cells${lat ? ', first at ' + lat.map(f2) : ''}`);
    }
    check(n === 0, `${b.name}: no wet cell with its ground over 1 m above the water`, `${n} of ${cells} cells; the highest ${f2(worst)} m at ${at ? at.map(f2) : '-'}`);
  }
}

// ---- Corpse-Candle Fen on its edge (src/height/fen.js)
{
  const F = await import('../src/height/field.js');
  const N = await import('../src/height/fen.js');
  const { WATER } = await import('../src/world.js');
  const E = N.FEN_EDGE, W = WATER.fen;
  // the shader's edge is the height's
  {
    const fn = glslAsJs(E.glsl('fenSd'));
    let worst = 0;
    for (let i = 0; i < 4000; i++) { const x = W.x + (rnd() - 0.5) * 260, z = W.z + (rnd() - 0.5) * 260; worst = Math.max(worst, Math.abs(fn([x, z].reduce((p, v, k) => (k ? (p.y = v) : (p.x = v), p), {})) - E.sd(x, z))); }
    check(worst < 1e-6, 'the fen: the ribbon\'s GLSL edge is sd', `worst ${worst.toExponential(2)} m`);
  }
  // the disc takes in every wet cell, and every cell under the water inside the disc is wet (nothing drawn dry)
  {
    let miss = 0, out = 0;
    for (let x = W.x - W.r - 20; x <= W.x + W.r + 20; x += 1.5) for (let z = W.z - W.r - 20; z <= W.z + W.r + 20; z += 1.5) {
      const r = Math.hypot(x - W.x, z - W.z), h = F.heightAt(x, z);
      if (r < W.r && E.sd(x, z) < 0 && h < W.y - 0.05 && F.waterLevelAt(x, z) === null) miss++;
      if (r >= W.r && E.sd(x, z) < -1 && h < W.y - 0.05 && F.RIVER.section(x, z).inRiver === false) out++;
    }
    check(miss === 0, 'the fen: every cell under its water inside its edge is wet', `${miss} dry`);
    check(out === 0, 'the fen: no water inside its edge lies outside the disc', `${out} outside`);
  }
  // the river's shader takes the fen's fade as 1 past rMax + 3 (src/water/river.js): sd is 3 or more everywhere there
  {
    let least = Infinity;
    for (let r = E.rMax + 3; r < E.rMax + E.far; r += 0.5) for (let a = 0; a < 2 * Math.PI; a += 0.004) least = Math.min(least, E.sd(W.x + Math.cos(a) * r, W.z + Math.sin(a) * r));
    check(least >= 3, 'the fen: its sd is 3 or more everywhere past rMax + 3 (the river\'s shader skips the edge there)', `least ${f2(least)} m`);
  }
  // the Span's bed is not the fen's water, nor the river's (v16 L5: the river inside the fen's edge holds to its ground)
  check(F.waterLevelAt(98, 209.5) === null, 'the fen: no water at the Span\'s bed (98, 209.5), the river\'s nor the fen\'s');
  check(!N.fenWet(98, 209.5), 'the fen: the Span\'s bed at (98, 209.5) is not its water');
  // the islets stand dry
  {
    const isles = E.lobes.filter((l) => l.land), wet = isles.filter((l) => F.heightAt(l.x, l.z) < W.y + 0.2);
    check(isles.length >= 3 && wet.length === 0, 'the fen: its islets stand dry', `${isles.length} islets, ${wet.length} awash`);
  }
  // pools apart: wet cells out past the shore, in the fringe, not joined to the main water
  {
    let past = 0;
    for (let x = W.x - W.r; x <= W.x + W.r; x += 1.5) for (let z = W.z - W.r; z <= W.z + W.r; z += 1.5) if (N.fenWet(x, z) && E.sd(x, z) > 3 && F.heightAt(x, z) < W.y) past++;
    check(past > 40, 'the fen: pools lie out past its shore, in the fringe', `${past} cells of 1.5 m`);
  }
  // tight toward the keep's slope, open toward the river: the furthest water past the shore in each sector
  {
    const far = (b0, b1) => { let m = -Infinity; for (let x = W.x - W.r; x <= W.x + W.r; x += 1.5) for (let z = W.z - W.r; z <= W.z + W.r; z += 1.5) {
      const b = ((Math.atan2(x - W.x, -(z - W.z)) * 180 / Math.PI) + 360) % 360; if (!(b0 < b1 ? b >= b0 && b < b1 : b >= b0 || b < b1)) continue;
      if (N.fenWet(x, z) && F.heightAt(x, z) < W.y) m = Math.max(m, E.sd(x, z)); } return m; };
    const north = far(320, 30), river = far(100, 160);
    check(river > north + 6, 'the fen: open toward the river, tight toward the keep\'s slope (furthest water past the shore)', `north ${f2(north)} m, river side ${f2(river)} m`);
  }
  // the waders (fauna/life.js, fauna/uncanny/wader.js) find shallows on the edge: 0.05-1.2 m deep, ringed by more
  {
    const sh = (x, z) => { const h = F.heightAt(x, z); return h < W.y - 0.05 && h > W.y - 1.2; };
    let n = 0;
    for (let k = 0; k < 400; k++) { const p = N.fenIn(k * 2.399, 0.15 + (k % 17) / 20); if (!sh(p.x, p.z)) continue; let m = 0; for (let j = 0; j < 8; j++) if (sh(p.x + Math.cos(j * 0.785) * 1.6, p.z + Math.sin(j * 0.785) * 1.6)) m++; if (m >= 3) n++; }
    check(n >= 10, 'the fen: shallows for the waders within its edge', `${n} of 400 draws`);
  }
  // no circle: over every 60 degrees of shore, the radius varies 6 m or more
  {
    const pts = shorePoints(E, 360);
    const rs = pts.map(([x, z]) => Math.hypot(x - W.x, z - W.z));
    let flat = 99;
    for (let i = 0; i < rs.length; i++) { let lo = Infinity, hi = -Infinity; for (let j = 0; j < 60; j++) { const v = rs[(i + j) % rs.length]; lo = Math.min(lo, v); hi = Math.max(hi, v); } flat = Math.min(flat, hi - lo); }
    check(flat >= 6, 'the fen: no 60 degrees of its shore is a circle (the radius varies 6 m or more)', `least ${f2(flat)} m`);
  }
}

console.log(`outline: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
