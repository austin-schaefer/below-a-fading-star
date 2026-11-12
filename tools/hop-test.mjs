#!/usr/bin/env node
// Hop onto things (v8-10, the owner's issue #7): at six sites (a Lynchets wall, a boulder, the Great Span's
// parapet, the Sunken Court's kerb, a bench at the Pomegranate House, a fallen gnomon) a walker who walks into
// the thing is stopped by it, a running hop lands them on top of it, they can take three steps along it where it is
// long, and stepping off puts them back on the ground (off the parapet's outer side: 56 m down, as through the
// crack). Simulated at 60 Hz through controls.update, in one page. Usage: node tools/hop-test.mjs [base] [--json]
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = (process.argv[2] || 'http://localhost:8123').replace(/\/?(\?.*)?$/, '');
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(`${base}/?q=low&shadows=0&bloom=0`, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 180000 });
const R = await page.evaluate(() => {
  const fp = window.__fp, p = fp.player, T = fp.terrain, C = fp.controls.state.colliders, DT = 1 / 60;
  fp.events.dispatchEvent(new CustomEvent('begin'));
  const feet = () => p.pos.y - p.eye;
  // the nearest point of a collider's axis to (x, z), and how far along it
  const axis = (c, x, z) => {
    if (c.len === undefined) return { x: c.x, z: c.z, t: 0 };
    const t = Math.max(0, Math.min(c.len, (x - c.x1) * c.ux + (z - c.z1) * c.uz));
    return { x: c.x1 + c.ux * t, z: c.z1 + c.uz * t, t };
  };
  const dist = (c, x, z) => { const a = axis(c, x, z); return Math.hypot(x - a.x, z - a.z); };
  const topOf = (c, x, z) => { const a = axis(c, x, z), f = Math.min(1, Math.hypot(x - a.x, z - a.z) / c.r); return c.y + c.h + (c.len !== undefined ? c.dh * a.t / c.len : 0) - (c.dome ? c.dome * f * f : 0); };
  // clear ground: no other collider over the walker's line, from s0 to s1 metres out from the point along n
  const clearLine = (c, px, pz, nx, nz, s0, s1, floorY) => {
    for (let s = s0; s <= s1; s += 0.25) {
      const x = px + nx * s, z = pz + nz * s;
      for (const o of C) {
        if (o === c || Math.abs(o.x - x) > 12 || Math.abs(o.z - z) > 12) continue;
        if (dist(o, x, z) < o.r + 0.6 && !(o.h !== undefined && (o.y + o.h < floorY + 0.15 || o.y > floorY + 2))) return false;
      }
    }
    return true;
  };
  const place = (x, z, y) => { fp.controls.placeAt(x, z); if (y !== undefined) { p.pos.y = y + p.eye; } p.vel.set(0, 0, 0); p.vy = 0; p.onGround = true; for (let i = 0; i < 4; i++) { p.keys.clear(); fp.controls.update(DT); } };
  const face = (x, z) => { p.yaw = Math.atan2(-(x - p.pos.x), -(z - p.pos.z)); };
  const run = (ticks, until) => { for (let i = 0; i < ticks; i++) { fp.controls.update(DT); if (until && until()) return i; } return ticks; };
  const floorAt = (x, z) => (fp.span && fp.span.deckAt(x, z) !== null ? fp.span.deckAt(x, z) : T.heightAt(x, z));

  // one site: c the collider, (px, pz) the point aimed at, (nx, nz) the way out the walker comes from, along the
  // axis to walk on top (null for a round top), out: how far off to step at the end
  function trial(name, c, px, pz, nx, nz, opts = {}) {
    const g0 = opts.floor ?? floorAt(px + nx * 3, pz + nz * 3), top = topOf(c, px, pz), out = { name, mod: c.mod, at: [+px.toFixed(1), +pz.toFixed(1)], top: +(top - (opts.floor ?? T.heightAt(px, pz))).toFixed(2) };
    const start = c.r + 3.2, sx = px + nx * start, sz = pz + nz * start;
    // 1. walk into it: stopped at its face, on the ground
    place(sx, sz, opts.floor); face(px, pz); p.keys.clear(); p.keys.add('KeyW');
    run(240); p.keys.clear();
    out.walk = { gap: +(dist(c, p.pos.x, p.pos.z) - c.r).toFixed(2), feet: +(feet() - g0).toFixed(2) };
    out.stopped = out.walk.gap > 0.4 && Math.abs(out.walk.feet) < 0.2;
    // 2. a running hop: hurry at it, hop `lead` m short of its face (the nearest take-off that lands, as a
    // visitor would find it: a narrow low thing is overshot from too far), stop the keys once on top
    let landed = null;
    for (let lead = 0.4; lead < 4.5; lead += 0.4) {
      place(sx, sz, opts.floor); face(px, pz); p.keys.clear(); p.keys.add('KeyW'); p.keys.add('ShiftLeft');
      let hopped = false;
      for (let i = 0; i < 300; i++) {
        if (!hopped && dist(c, p.pos.x, p.pos.z) - c.r < lead) hopped = fp.controls.hop();
        fp.controls.update(DT);
        if (hopped && p.onGround) break;
      }
      p.keys.clear(); run(40);
      if (p.onTop && Math.abs(feet() - topOf(c, p.pos.x, p.pos.z)) < 0.3 && dist(c, p.pos.x, p.pos.z) < c.r + 0.2) { landed = +lead.toFixed(1); break; }
    }
    out.hop = { lead: landed, feet: +(feet() - g0).toFixed(2), onTop: p.onTop };
    out.landed = landed !== null;
    if (!out.landed) return out;
    // 3. three steps along it (2.2 m at a walk), where it is long
    if (opts.along) {
      const [ax, az] = opts.along, x0 = p.pos.x, z0 = p.pos.z;
      p.yaw = Math.atan2(-ax, -az); p.keys.clear(); p.keys.add('KeyW');
      let off = 0, minLift = Infinity;
      const want = opts.alongDist ?? 2.2;
      run(400, () => { if (!p.onTop) off++; minLift = Math.min(minLift, feet() - T.heightAt(p.pos.x, p.pos.z)); return Math.hypot(p.pos.x - x0, p.pos.z - z0) > want; });
      p.keys.clear(); run(20);
      out.along = { walked: +Math.hypot(p.pos.x - x0, p.pos.z - z0).toFixed(2), framesOff: off, lift: +minLift.toFixed(2) };
      out.walkedAlong = out.along.walked >= want && off === 0 && p.onTop;
    }
    // 4. step off, on the far side (or opts.off), and fall to whatever is below
    const [ox, oz] = opts.off || [-nx, -nz];
    p.yaw = Math.atan2(-ox, -oz); p.keys.clear(); p.keys.add('KeyW');
    run(opts.fall ? 60 : 90); p.keys.clear(); run(opts.fall ? 420 : 30);
    const g1 = T.heightAt(p.pos.x, p.pos.z);
    out.off = { feet: +(feet() - g1).toFixed(2), y: +feet().toFixed(1), onGround: p.onGround, onTop: p.onTop };
    out.steppedOff = p.onGround && !p.onTop && (opts.fall ? feet() < g0 - 20 : Math.abs(feet() - floorAt(p.pos.x, p.pos.z)) < 0.25);
    return out;
  }

  const res = [];
  const pick = (mod, test) => C.filter((c) => c.mod === mod && test(c));
  const perp = (c) => [-c.uz, c.ux];
  // try candidates until one has clear ground on its approach (both sides for a wall)
  function site(name, list, setup) {
    for (const c of list) { const s = setup(c); if (s) return res.push(trial(name, c, ...s)); }
    res.push({ name, missing: true });
  }
  // a Lynchets wall: a long level stretch of a full-height wall
  const level = (o) => Math.abs(o.dh) < 0.1;
  site('Lynchets wall', pick('region-lynchets', level).map((c) => ({ c, h: topOf(c, c.x, c.z) - T.heightAt(c.x, c.z) })).filter((o) => o.h > 1.0 && o.h < 1.4).map((o) => o.c), (c) => {
    // a run: the neighbours that continue it, so three steps stay on the wall
    const after = (q) => q && C.find((o) => o !== q && o.mod === q.mod && o.len !== undefined && Math.hypot(o.x1 - q.x2, o.z1 - q.z2) < 0.01 && level(o));
    if (!after(after(after(c)))) return null;
    // the approach from either side whose ground is level with the wall's foot (a lynchet's wall holds up a terrace)
    for (const s of [1, -1]) {
      const [nx, nz] = perp(c).map((v) => v * s), g = T.heightAt(c.x, c.z);
      if (Math.abs(T.heightAt(c.x + nx * 1.5, c.z + nz * 1.5) - g) > 0.2 || Math.abs(T.heightAt(c.x + nx * 3.5, c.z + nz * 3.5) - g) > 0.3) continue;
      if (clearLine(c, c.x, c.z, nx, nz, c.r + 0.9, c.r + 3.5, g) && clearLine(c, c.x, c.z, -nx, -nz, c.r + 0.9, c.r + 2, T.heightAt(c.x - nx, c.z - nz))) return [c.x, c.z, nx, nz, { along: [c.ux, c.uz] }];
    }
    return null;
  });
  // a boulder about chest height, on level ground
  site('boulder', pick('rocks', (c) => c.dome !== undefined && c.r > 0.9).filter((c) => { const h = c.y + c.h - T.heightAt(c.x, c.z); return h > 0.9 && h < 1.3 && T.slopeAt(c.x, c.z) < 0.15; }), (c) => {
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, nx = Math.cos(a), nz = Math.sin(a), g = T.heightAt(c.x, c.z);
      if (T.isUnderwater(c.x + nx * 4, c.z + nz * 4) || T.isUnderwater(c.x - nx * 4, c.z - nz * 4)) continue;
      if (clearLine(c, c.x, c.z, nx, nz, c.r + 0.3, c.r + 3.5, g) && clearLine(c, c.x, c.z, -nx, -nz, c.r + 0.3, c.r + 2, g)) return [c.x, c.z, nx, nz, {}];
    }
    return null;
  });
  // the Span's south parapet, at full height, from the deck; off its outer side, 56 m down
  site('Span parapet', pick('span', (c) => c.len !== undefined && c.len > 4 && c.z > fp.span.plan.z && c.h > 1.4 && c.x > -200 && c.x < -60), (c) => {
    const d = fp.span.plan.deckY;
    return [c.x, c.z, 0, -1, { floor: d, along: [c.ux, c.uz], off: [0, 1], fall: true }];
  });
  // the Sunken Court's kerb, its long (north) side, from the court's floor
  site('court kerb', pick('structures', (c) => c.len !== undefined && Math.abs(c.uz) < 0.01 && c.len > 4), (c) => {
    const g = T.heightAt(c.x, c.z + 3);
    return [c.x, c.z, 0, 1, { along: [c.ux, c.uz], off: [0, 1], floor: undefined }];
  });
  // a bench at the house, from its front; off the back
  // (a bench is short: aimed near one end, walked to the other)
  site('house bench', pick('house', (c) => c.len !== undefined && c.r < 0.3).sort((a, b) => b.len - a.len), (c) => {
    const ex = c.x1 + c.ux * c.len * 0.1, ez = c.z1 + c.uz * c.len * 0.1;
    for (const s of [1, -1]) {
      const [nx, nz] = perp(c).map((v) => v * s), g = T.heightAt(c.x, c.z);
      if (clearLine(c, ex, ez, nx, nz, c.r + 0.4, c.r + 3.5, g) && clearLine(c, c.x, c.z, -nx, -nz, c.r + 0.4, c.r + 1.6, g)) return [ex, ez, nx, nz, { along: [c.ux, c.uz], alongDist: c.len * 0.8 }];
    }
    return null;
  });
  // a fallen gnomon, from its side
  site('fallen gnomon', pick('roads', (c) => c.len !== undefined && !T.isUnderwater(c.x, c.z) && T.waterLevelAt(c.x, c.z) === null && T.slopeAt(c.x, c.z) < 0.2).sort((a, b) => b.len - a.len), (c) => {
    const ex = c.x1 + c.ux * c.len * 0.1, ez = c.z1 + c.uz * c.len * 0.1;
    for (const s of [1, -1]) {
      const [nx, nz] = perp(c).map((v) => v * s), g = T.heightAt(c.x, c.z);
      if (clearLine(c, ex, ez, nx, nz, c.r + 0.4, c.r + 4.5, g) && clearLine(c, c.x, c.z, -nx, -nz, c.r + 0.4, c.r + 1.6, g)) return [ex, ez, nx, nz, { along: [c.ux, c.uz], alongDist: c.len * 0.8 }];
    }
    return null;
  });
  // the broad phase's cost: the collider loop at a spot among many (the Lynchets) against an empty one
  const time = (x, z) => { place(x, z); p.keys.clear(); p.keys.add('KeyW'); const t0 = performance.now(); for (let i = 0; i < 600; i++) { p.yaw += 0.01; fp.controls.update(DT); } p.keys.clear(); return (performance.now() - t0) / 600; };
  const perFrame = time(-190, -110);
  return { res, colliders: C.length, perFrame };
});
await browser.close();
const json = process.argv.includes('--json');
let fail = 0;
const check = (ok, name, info) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`); if (!ok) fail++; };
for (const r of R.res) {
  if (r.missing) { check(false, `${r.name}: a site found`); continue; }
  const at = `${r.mod} at (${r.at}), top ${r.top} m`;
  check(r.stopped, `${r.name}: walking into it stops the walker`, `${at}; ${r.walk.gap} m off its face, feet ${r.walk.feet} m`);
  check(r.landed, `${r.name}: a running hop lands on top`, r.landed ? `hop ${r.hop.lead} m short, feet ${r.hop.feet} m up` : `feet ${r.hop.feet} m, onTop ${r.hop.onTop}`);
  if (r.along) check(r.walkedAlong, `${r.name}: three steps along the top`, `${r.along.walked} m, ${r.along.framesOff} frames off it, never under ${r.along.lift} m over the ground`);
  if (r.off) check(r.steppedOff, `${r.name}: stepping off returns to the ground`, `feet ${r.off.feet} m over the terrain (y ${r.off.y}), onGround ${r.off.onGround}`);
}
check(R.perFrame < 0.5, 'the walker\'s update stays cheap', `${R.perFrame.toFixed(3)} ms a frame with ${R.colliders} colliders`);
check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
if (json) console.log(JSON.stringify(R, null, 1));
process.exit(fail ? 1 : 0);
