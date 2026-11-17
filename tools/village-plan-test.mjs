#!/usr/bin/env node
// The Lappet's plan checked against itself and the ground, in node (no browser): src/v15/plan.js with the height
// field. So the plan cannot drift as the quarters build on it.
//   - no two plots on one level overlap (the tube's bed is a plot);
//   - no plot stands in a lane of its level, nor in a way's line (a stair's flight, the ramp);
//   - a plot that `stands` on the ground has its corners on its level (within 0.35 m); one on a `tread` carries its
//     own floor y (the ground under a built tread lies lower, and lower still over an undercroft);
//   - no plot stands within 1 m of a road or kerb it does not front (src/v4/paths/routes.js);
//   - every opening a plot declares names a riser at its back;
//   - the foot has no step of more than 0.5 m in 0.5 m outside the lowest riser (the cliff of review round 2).
//   node tools/village-plan-test.mjs
globalThis.FP_HEIGHT_PARAMS = '?';
const P = await import('../src/v15/plan.js');
const F = await import('../src/height/field.js');
const { LEADS: ROUTES } = await import('../src/v4/paths/routes.js');

let pass = 0, fail = 0;
const check = (ok, name, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`); ok ? pass++ : fail++; };

// convex polygons [[x, z], ...]: do they overlap by more than `slack` (separating axes; slack shrinks both)?
const axes = (poly) => poly.map((p, i) => { const q = poly[(i + 1) % poly.length], dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1; return [-dz / l, dx / l]; });
function overlap(a, b, slack = 0.05) {
  let depth = Infinity;
  for (const [nx, nz] of [...axes(a), ...axes(b)]) {
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const [x, z] of a) { const d = x * nx + z * nz; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
    for (const [x, z] of b) { const d = x * nx + z * nz; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
    depth = Math.min(depth, Math.min(a1, b1) - Math.max(a0, b0));
    if (depth <= slack) return 0;
  }
  return depth;
}
// a polyline's segments as rectangles `w` wide
const strips = (pts, w) => pts.slice(0, -1).map((p, i) => { const q = pts[i + 1], dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l * w / 2, nz = dx / l * w / 2; return [[p[0] + nx, p[1] + nz], [q[0] + nx, q[1] + nz], [q[0] - nx, q[1] - nz], [p[0] - nx, p[1] - nz]]; });
const f1 = (v) => v.toFixed(2);

const plots = P.PLOTS, corners = new Map(plots.map((p) => [p.name, P.plotCorners(p)]));

// ---- plots against plots
{
  const bad = [];
  for (let i = 0; i < plots.length; i++) for (let j = i + 1; j < plots.length; j++) {
    const a = plots[i], b = plots[j];
    if (a.level !== b.level && !(a.kind === 'tube' || b.kind === 'tube')) continue;
    if (a.kind === 'tube' || b.kind === 'tube') { const t = a.kind === 'tube' ? a : b, o = t === a ? b : a; if (o.kind === 'tube' || o.run !== t.run) continue; }
    const d = overlap(corners.get(a.name), corners.get(b.name));
    if (d > 0) bad.push(`${a.name} x ${b.name} ${f1(d)} m`);
  }
  check(!bad.length, `no two of the ${plots.length} plots overlap on a level (nor stand on the tube's bed)`, bad.join('; '));
}
// ---- plots against lanes
{
  const bad = [];
  for (const l of P.LANES) for (const s of strips(l.pts, l.width)) for (const p of plots) {
    if (p.level !== l.level || p.kind === 'tube') continue;
    const d = overlap(corners.get(p.name), s, 0.08);
    if (d > 0) bad.push(`${p.name} in ${l.name} ${f1(d)} m`);
  }
  check(!bad.length, `no plot stands in a lane of its level (${P.LANES.length} lanes)`, [...new Set(bad)].join('; '));
}
// ---- plots against the ways' lines
{
  const bad = [];
  for (const w of P.WAYS) {
    if (w.run === undefined) continue;
    const half = (w.kind === 'tube' ? 2.2 : w.kind === 'ladder' ? 0.6 : w.name.startsWith('heliarch') ? P.STAIR.width / 2 : 0.9);
    const D0 = Math.min(w.D0, w.D1) - (w.kind === 'ladder' ? 0.2 : 0), D1 = Math.max(w.D0, w.D1) + (w.kind === 'ladder' ? 1.2 : 0);
    const rect = [P.at(w.run, w.s - half, D0), P.at(w.run, w.s + half, D0), P.at(w.run, w.s + half, D1), P.at(w.run, w.s - half, D1)];
    for (const p of plots) {
      if (p.kind === 'tube' || p.kind === 'pier') continue;
      if (![w.from, w.to].includes(p.level) && !(w.kind === 'tube')) continue;
      const d = overlap(corners.get(p.name), rect, 0.08);
      if (d > 0) bad.push(`${p.name} in ${w.name} ${f1(d)} m`);
    }
  }
  check(!bad.length, `no plot stands in a way's line (${P.WAYS.length} ways)`, bad.join('; '));
}
// ---- corners on their level
{
  const bad = [], kinds = { ground: 0, tread: 0 };
  for (const p of plots) {
    if (p.kind === 'tube' || p.kind === 'pier') continue;
    if (p.stands !== 'ground' && p.stands !== 'tread') { bad.push(`${p.name}: no \`stands\``); continue; }
    kinds[p.stands]++;
    if (typeof p.y !== 'number') { bad.push(`${p.name}: no floor y`); continue; }
    if (p.stands !== 'ground') continue;
    // (a plot against a riser has its back in the step: only what lies in front of the face is on the ground)
    const Rk = p.against ? P.RISERS.find((r) => r.key === p.against) : null;
    const on = [...corners.get(p.name), [p.x, p.z]].filter(([x, z]) => !Rk || P.frameOf(x, z).D > Rk.D + 0.3);
    const hs = on.map(([x, z]) => F.heightAt(x, z)), off = hs.map((h) => h - p.y), worst = off.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);
    if (Math.abs(worst) > (p.slope ? p.slope * 0.75 : 0.35)) bad.push(`${p.name}: ${off.map((o) => o.toFixed(1)).join(' / ')} off ${p.y}`);
  }
  check(!bad.length, `every plot says what it stands on and carries its floor y; ${kinds.ground} on the ground have their corners within 0.35 m of it (a plot marked slope, within three quarters of the fall it declares), ${kinds.tread} on a built tread`, bad.join('; '));
}
// ---- roads and kerbs a plot does not front
{
  const bad = [];
  for (const r of ROUTES) if (r.kind !== 'rivulet') for (const s of strips(r.pts, (r.w || 0.5) + 2)) for (const p of plots) {
    if (p.kind === 'tube' || p.kind === 'pier' || (p.fronts || []).includes(r.id)) continue;
    if (p.level !== 'foot' && p.level !== 'bench') continue; // (the roads on the steps are the plan's own lanes)
    const d = overlap(corners.get(p.name), s, 0.02);
    if (d > 0) bad.push(`${p.name} within 1 m of ${r.id} (${f1(d)} m in)`);
  }
  check(!bad.length, 'no plot on the bench or the foot stands within 1 m of a road, path or kerb it does not front', [...new Set(bad)].join('; '));
}
// ---- openings
{
  const bad = [], n = plots.filter((p) => p.opening).length;
  for (const p of plots) if (p.opening) {
    const R = P.RISERS.find((r) => r.key === p.opening.riser);
    if (!R || p.against !== p.opening.riser || !(p.opening.width > 0 && p.opening.width <= p.w) || !(p.opening.height > 0 && p.opening.height <= R.top - R.foot)) bad.push(p.name);
  }
  check(n >= 4 && !bad.length, `every opening a plot declares is in the riser at its back, no wider than the plot, no taller than the riser (${n} openings)`, bad.join('; '));
}
// ---- the foot has no cliff
{
  let worst = 0, at = null;
  for (let x = 60; x <= 130; x += 0.5) for (let z = -70; z <= 40; z += 0.5) {
    const r = P.radiusOf(x, z), b = P.bearingOf(x, z);
    if (r < P.HAHA + 1.4 || r > P.HAHA + 20.5 || b < 30 || b > 80 || P.houseOut(x, z) < 0.8) continue;
    const h = F.heightAt(x, z), j = Math.max(Math.abs(F.heightAt(x + 0.5, z) - h), Math.abs(F.heightAt(x, z + 0.5) - h));
    if (j > worst) { worst = j; at = [x, z]; }
  }
  check(worst < 0.5, 'the Pennyworth has no step of 0.5 m in 0.5 m from the lowest riser out to the end of its fade at r 97.7 (bearings 30 to 80)', `worst ${f1(worst)} m at ${at}`);
}
console.log(`village-plan: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
