#!/usr/bin/env node
// The village's circulation drawn as one plan (v15-W4, the owner's "the stair logic is just wild across the board").
// Loads the live page with every module built and draws, top down over x 40..130, z -75..40 (north up, 12 px a metre):
//   the ground   the floor the walker's feet find at each 0.5 m (controls.floorAt from above), shaded by its height,
//                with the plan's level keys written on each tread
//   walls        every collider that stands at the floor's height there (from a step over the feet to a head over
//                them), black; colliders under the feet or over the head, faint
//   ways         every registered ascent (ctx.ascents) as a coloured line by kind (stair, ramp, ladder, bridge, tube),
//                its id at its middle and each end ringed and labelled with its level
//   house steps  every flight a house record carries (a floor with steps) that is not a registered way, dashed
//   doors        every door a house record gives, a red tick out of its face
//   the spine    the plan's SPINE (src/v15/plan.js), a wide yellow band from the keep's end to the house's door
// Writes the PNG and a JSON of what it drew (ways, house steps, doors).
//   node tools/ways-plan.mjs [base=http://localhost:8123] [out=shots/wip/ways-plan.png]
// PLAN_BOX=x0,x1,z0,z1 and PLAN_SCALE=px a metre draw a part closer (the Rungs and the stairs: PLAN_BOX=44,112,-36,18 PLAN_SCALE=20).
import fs from 'node:fs';
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const out = process.argv[3] || 'shots/wip/ways-plan.png';
const [X0, X1, Z0, Z1] = (process.env.PLAN_BOX || '40,130,-75,40').split(',').map(Number), S = +(process.env.PLAN_SCALE || 12), G = S >= 18 ? 0.25 : 0.5;
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.setDefaultTimeout(600000);
await page.goto(`${base}/?q=low&music=0`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
const r = await page.evaluate(async ({ X0, X1, Z0, Z1, G }) => {
  const fp = window.__fp, P = await import('/src/v15/plan.js'), C = fp.controls, cols = C.state.colliders;
  const inBox = (x, z) => x > X0 && x < X1 && z > Z0 && z < Z1;
  const nx = Math.round((X1 - X0) / G), nz = Math.round((Z1 - Z0) / G), hgt = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = X0 + (i + 0.5) * G, z = Z0 + (j + 0.5) * G; hgt[j * nx + i] = C.floorAt(x, z, 60).y; }
  const floorTop = (x, z) => { const i = Math.floor((x - X0) / G), j = Math.floor((z - Z0) / G); return i >= 0 && j >= 0 && i < nx && j < nz ? hgt[j * nx + i] : 0; };
  const walls = [];
  for (const c of cols) {
    if (!inBox(c.x, c.z)) continue;
    const y = floorTop(c.x, c.z), top = c.h === undefined ? 99 : c.y + c.h, bot = c.h === undefined ? -99 : c.y;
    const at = bot < y + 1.9 && top > y + 0.35; // stands in the way of a walker on the floor there
    walls.push(c.len !== undefined ? { k: 'w', a: [c.x1, c.z1], b: [c.x2, c.z2], r: c.r, at, mod: c.mod } : { k: 'p', a: [c.x, c.z], r: c.r, at, mod: c.mod });
  }
  const kind = (a) => (a.tick || /ladder/.test(a.id) ? 'ladder' : /ramp/.test(a.id) ? 'ramp' : /main/.test(a.id) ? 'tube' : a.path.every((p) => Math.abs((p[2] ?? a.path[0][2]) - (a.path[0][2] ?? 0)) < 0.6) ? 'bridge' : 'stair');
  const lv = (y) => P.LEVELS.find((l) => Math.abs(l.y - y) < 0.35)?.key || y.toFixed(1);
  const ways = fp.ascents.list.filter((a) => !a.test && a.path.some((p) => inBox(p[0], p[1]))).map((a) => {
    const p = a.path.map((q) => [q[0], q[1], q[2] ?? floorTop(q[0], q[1])]);
    return { id: a.id, kind: kind(a), path: p, ends: [lv(p[0][2]), lv(p[p.length - 1][2])] };
  });
  // the houses' records: their stepped floors and their doors
  const recs = [];
  const take = (list) => { for (const R of list || []) if (R && R.plot) recs.push(R); };
  take(fp.village?.row?.records); take(fp.lees?.records); take(fp.rungs?.records && Object.values(fp.rungs.records)); take(fp.quarrels?.records); take(fp.pennyworth?.records);
  const steps = [], doors = [];
  for (const R of recs) {
    for (const f of R.floors) if (f.steps) {
      // the flight rises along its own +z: from (local z -d/2, y) to (+d/2, y1)
      const ax = f.x - f.s * (-f.d / 2), az = f.z + f.c * (-f.d / 2), bx = f.x - f.s * (f.d / 2), bz = f.z + f.c * (f.d / 2);
      steps.push({ of: R.name || R.kind, a: [ax, az, f.y], b: [bx, bz, f.y1], w: f.w });
    }
    for (const d of R.doors) doors.push({ of: R.name || R.kind, x: d.x, y: d.y, z: d.z, face: d.face, ladder: d.ladder, enter: d.enter });
  }
  const labels = [];
  for (const L of P.LEVELS) labels.push(L.key);
  const plots = P.PLOTS.filter((p) => inBox(p.x, p.z)).map((p) => ({ name: p.name, title: p.title, x: p.x, z: p.z, kind: p.kind, corners: P.plotCorners(p) }));
  let spine = null;
  if (P.SPINE) {
    const L = fp.ascents.list; spine = [[P.SPINE.from[0], P.SPINE.from[1]]];
    for (const leg of P.SPINE.legs) {
      if (leg.way) { const a = L.find((q) => q.id === leg.way); if (!a) continue; const p = a.path.map((q) => [q[0], q[1]]), last = spine[spine.length - 1]; if (Math.hypot(p[p.length - 1][0] - last[0], p[p.length - 1][1] - last[1]) < Math.hypot(p[0][0] - last[0], p[0][1] - last[1])) p.reverse(); spine.push(...p); }
      else spine.push(...leg.pts.map(([x, z]) => [x, z]));
    }
    spine.push([P.SPINE.to[0], P.SPINE.to[1]]);
  }
  return { nx, nz, hgt: Array.from(hgt), walls, ways, steps, doors, plots, spine, haveFp: !!fp };
}, { X0, X1, Z0, Z1, G });

// ---- the drawing
const W = (X1 - X0) * S, H = (Z1 - Z0) * S, px = (x) => ((x - X0) * S).toFixed(1), pz = (z) => ((z - Z0) * S).toFixed(1);
const shade = (y) => { // -1 .. 25 m: dark earth to pale stone, a hue step per level
  const t = Math.max(0, Math.min(1, (y + 1) / 24)); const h = 30 + t * 200, l = 22 + t * 52;
  return `hsl(${h.toFixed(0)},${(18 + t * 10).toFixed(0)}%,${l.toFixed(0)}%)`;
};
const svg = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + 60}" font-family="Helvetica,Arial,sans-serif">`);
svg.push(`<rect width="100%" height="100%" fill="#111"/>`);
for (let j = 0; j < r.nz; j++) for (let i = 0; i < r.nx; i++) {
  const y = r.hgt[j * r.nx + i]; svg.push(`<rect x="${(i * G * S).toFixed(0)}" y="${(j * G * S).toFixed(0)}" width="${G * S + 0.6}" height="${G * S + 0.6}" fill="${shade(y)}"/>`);
}
// metre grid every 10 m
for (let x = Math.ceil(X0 / 10) * 10; x <= X1; x += 10) svg.push(`<line x1="${px(x)}" y1="0" x2="${px(x)}" y2="${H}" stroke="#fff" stroke-opacity="0.15"/><text x="${+px(x) + 2}" y="12" font-size="11" fill="#fff" fill-opacity="0.6">x ${x}</text>`);
for (let z = Math.ceil(Z0 / 10) * 10; z <= Z1; z += 10) svg.push(`<line x1="0" y1="${pz(z)}" x2="${W}" y2="${pz(z)}" stroke="#fff" stroke-opacity="0.15"/><text x="2" y="${+pz(z) - 2}" font-size="11" fill="#fff" fill-opacity="0.6">z ${z}</text>`);
for (const p of r.plots) {
  svg.push(`<polygon points="${p.corners.map((c) => `${px(c[0])},${pz(c[1])}`).join(' ')}" fill="none" stroke="#ffe9b0" stroke-opacity="0.35" stroke-dasharray="3 3"/>`);
  svg.push(`<text x="${px(p.x)}" y="${pz(p.z)}" font-size="10" fill="#fff4cc" fill-opacity="0.7" text-anchor="middle">${p.name}</text>`);
}
for (const c of r.walls) {
  const col = c.at ? '#000' : '#000', op = c.at ? 0.95 : 0.25, sw = Math.max(1.5, c.r * 2 * S);
  if (c.k === 'w') svg.push(`<line x1="${px(c.a[0])}" y1="${pz(c.a[1])}" x2="${px(c.b[0])}" y2="${pz(c.b[1])}" stroke="${col}" stroke-opacity="${op}" stroke-width="${sw.toFixed(1)}" stroke-linecap="round"/>`);
  else svg.push(`<circle cx="${px(c.a[0])}" cy="${pz(c.a[1])}" r="${Math.max(1.5, c.r * S).toFixed(1)}" fill="${col}" fill-opacity="${op}"/>`);
}
if (r.spine) {
  const pts = r.spine.map((p) => `${px(p[0])},${pz(p[1])}`).join(' ');
  svg.push(`<polyline points="${pts}" fill="none" stroke="#ffd34a" stroke-opacity="0.45" stroke-width="${(2.4 * S).toFixed(0)}" stroke-linejoin="round" stroke-linecap="round"/>`);
  svg.push(`<polyline points="${pts}" fill="none" stroke="#ffd34a" stroke-width="2" stroke-dasharray="10 6"/>`);
  svg.push(`<text x="${+px(r.spine[0][0]) + 10}" y="${+pz(r.spine[0][1]) + 18}" font-size="14" font-weight="bold" fill="#ffd34a" stroke="#000" stroke-width="3" paint-order="stroke">THE SPINE: the keep's end</text>`);
  const e = r.spine[r.spine.length - 1]; svg.push(`<text x="${+px(e[0]) - 10}" y="${+pz(e[1]) + 22}" font-size="14" font-weight="bold" fill="#ffd34a" stroke="#000" stroke-width="3" paint-order="stroke" text-anchor="end">the Pomegranate House's door</text>`);
}
const KC = { stair: '#ff3b6b', ramp: '#ffb020', ladder: '#2be0ff', bridge: '#9dff4a', tube: '#c58bff' };
const registered = new Set(r.ways.map((w) => w.id));
for (const s of r.steps) {
  svg.push(`<line x1="${px(s.a[0])}" y1="${pz(s.a[1])}" x2="${px(s.b[0])}" y2="${pz(s.b[1])}" stroke="#ff8fb0" stroke-width="${Math.max(3, s.w * S * 0.6).toFixed(1)}" stroke-opacity="0.7" stroke-dasharray="6 4"/>`);
  svg.push(`<circle cx="${px(s.b[0])}" cy="${pz(s.b[1])}" r="4" fill="#ff8fb0"/>`);
}
for (const w of r.ways) {
  const c = KC[w.kind];
  svg.push(`<polyline points="${w.path.map((p) => `${px(p[0])},${pz(p[1])}`).join(' ')}" fill="none" stroke="#000" stroke-width="7" stroke-opacity="0.6"/>`);
  svg.push(`<polyline points="${w.path.map((p) => `${px(p[0])},${pz(p[1])}`).join(' ')}" fill="none" stroke="${c}" stroke-width="4"/>`);
  for (const [k, p] of [[0, w.path[0]], [1, w.path[w.path.length - 1]]]) {
    svg.push(`<circle cx="${px(p[0])}" cy="${pz(p[1])}" r="6" fill="none" stroke="${c}" stroke-width="2.5"/>`);
    svg.push(`<text x="${+px(p[0]) + 7}" y="${+pz(p[1]) + 4}" font-size="11" font-weight="bold" fill="${c}" stroke="#000" stroke-width="2.5" paint-order="stroke">${w.ends[k]}</text>`);
  }
  const m = w.path[Math.floor(w.path.length / 2)];
  svg.push(`<text x="${+px(m[0]) + 8}" y="${+pz(m[1]) - 6}" font-size="12" font-weight="bold" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">${w.id}</text>`);
}
for (const d of r.doors) {
  const x = +px(d.x), z = +pz(d.z), ex = x + d.face[0] * 14, ez = z + d.face[1] * 14;
  svg.push(`<line x1="${x}" y1="${z}" x2="${ex.toFixed(1)}" y2="${ez.toFixed(1)}" stroke="#ff2a00" stroke-width="3"/><circle cx="${x}" cy="${z}" r="3.5" fill="${d.ladder ? '#2be0ff' : '#ff2a00'}"/>`);
}
// legend
const lg = [['spine', '#ffd34a'], ['stair', KC.stair], ['ramp', KC.ramp], ['ladder', KC.ladder], ['bridge / crossing', KC.bridge], ['tube', KC.tube], ['house steps (not a registered way)', '#ff8fb0'], ['door', '#ff2a00'], ['wall at walking height', '#000']];
let lx = 8;
for (const [t, c] of lg) { svg.push(`<rect x="${lx}" y="${H + 12}" width="14" height="14" fill="${c}" stroke="#fff"/><text x="${lx + 18}" y="${H + 24}" font-size="12" fill="#fff">${t}</text>`); lx += 30 + t.length * 6.6; }
svg.push(`<text x="${W - 8}" y="${H + 48}" font-size="12" fill="#fff" text-anchor="end">${r.ways.length} ways, ${r.steps.length} house flights, ${r.doors.length} doors; floor shaded by height</text>`);
svg.push('</svg>');
const p2 = await browser.newPage({ viewport: { width: W, height: H + 60 } });
await p2.setContent(`<html><body style="margin:0;background:#111">${svg.join('')}</body></html>`);
await p2.screenshot({ path: out, fullPage: true });
fs.writeFileSync(out.replace(/\.png$/, '.json'), JSON.stringify({ ways: r.ways, steps: r.steps, doors: r.doors }, null, 1));
console.log(`ways-plan: ${r.ways.length} ways, ${r.steps.length} house flights, ${r.doors.length} doors, ${r.walls.length} colliders -> ${out}`);
await browser.close();
