#!/usr/bin/env node
// v8-05 the Pomegranate House lit and lived in (src/v8/house.js, src/v8/house/): the lamps and the people exist and stand
// on their ground (every lamp's hook 1.9-13 m over the ground under it; the host on his feet, the patrons on their
// stools, the musician on the fountain's rim, the sleeper on the floor); each behaviour triggers at its distance and
// resets (the host's bow in at 6 m and his bow out at the gate, at least four times shallower; the patrons' stare while
// you look at them from within 14 m, the game frozen, and back to it when you look away; the musician's offence within
// 3 m and his return after 4 s at 5 m or more; the sleeper's twitch within 2.2 m, armed again past 4 m); the lamps
// follow the gutter (dim and every fickle lamp out while it lasts, a flare as it ends, the fickle relit one by one
// after) and the voice does too (nothing during it, a nervous laugh first after it); the talk and a laugh carry to 55 m;
// at most three live point-light sources within reach + 20 m of any point on K1 and P9 (on P9 the Link-Boy's counted
// as well); the slipper's mate is on the sleeper's foot and is the causeway slipper's pair; the module's cost.
// Usage: node tools/house-test.mjs [base=http://localhost:8123]   (or FP_BASE=...)
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = [];
const check = (name, ok, info) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? '  ' + JSON.stringify(info) : ''}`); };
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 400)); });
await page.goto(`${base}/?q=low`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
// no gutter of the sun's own while we test (we make our own)
await page.evaluate(() => { const f = window.__fp.sky.flicker; f.next = 1e9; f.phase = 0; f.value = 1; f.hold = 1; });

const r = await page.evaluate(async () => {
  const fp = window.__fp, H = fp.house, out = {};
  if (!H) return { missing: true };
  const G = (await import('/src/structures/geo.js')).makeGround(fp).groundAt;
  const { TAVERNA_BRACKETS } = await import('/src/structures/taverna.js');
  out.stats = H.stats();
  // ---- standing
  const hooks = H.lamps.map((l) => l.y - G(l.x, l.z));
  out.lamps = { n: H.lamps.length, brackets: H.lamps.filter((l) => l.kind === 'bracket').length, wantBrackets: TAVERNA_BRACKETS.length, lo: Math.min(...hooks), hi: Math.max(...hooks), cols: [0, 1, 2, 3].map((c) => H.lamps.filter((l) => l.col === c).length) };
  const F = H.figures, P = fp.player.pos;
  const host = F.host.state, mus = F.musician, sl = F.sleeper;
  out.stand = {
    host: +(host.y - G(host.x, host.z)).toFixed(3),
    patrons: F.patrons.figs.map((f) => +((f.seat.y + f.seat.hs) - (G(f.seat.x, f.seat.z) + 0.41)).toFixed(3)),
    musician: +((mus.at.y + mus.at.hs) - (G(95, -45) + 0.575)).toFixed(3),
    sleeper: +(sl.place.elements[13] - G(sl.place.elements[12], sl.place.elements[14])).toFixed(3),
  };
  const put = (x, z, yaw = fp.player.yaw) => { P.set(x, fp.terrain.heightAt(x, z) + 1.7, z); fp.player.yaw = yaw; if (fp.player.vel) fp.player.vel.set(0, 0, 0); };
  const sim = (s) => H.sim(0.05, Math.round(s / 0.05));
  // ---- the host: bow in, bow out, re-armed
  put(host.x, host.z - 20); sim(1.5);
  const in0 = host.bowsIn;
  put(host.x - 0.5, host.z - 4); sim(0.2);
  const inPhase = host.phase; host.maxDepth = 0; sim(4);
  const inDepth = host.maxDepth, faced = Math.abs(((Math.atan2(P.x - host.x, P.z - host.z) - host.yaw + 9 * Math.PI) % (2 * Math.PI)) - Math.PI);
  put(95, -50); sim(1);
  put(95, -61.5); sim(0.2);
  const outPhase = host.phase; host.maxDepth = 0; let palm = 0; for (let i = 0; i < 50; i++) { sim(0.05); palm = Math.max(palm, host.palm); }
  const outDepth = host.maxDepth;
  put(host.x, host.z - 20); sim(1); put(host.x - 0.5, host.z - 4); sim(0.2);
  out.host = { in0, inPhase, inDepth: +inDepth.toFixed(2), faced: +faced.toFixed(2), outPhase, outDepth: +outDepth.toFixed(2), palm: +palm.toFixed(2), again: host.bowsIn - in0 };
  sim(4);
  // ---- the patrons: stare while looked at, back to the game when you look away
  const pt = F.patrons.state, c = F.patrons.center;
  const look = (x, z) => Math.atan2(-(c.x - x), -(c.z - z));
  put(c.x + 4, c.z - 4, look(c.x + 4, c.z - 4) + Math.PI); sim(1.5);
  const before = { phase: pt.phase, clock: pt.clock };
  fp.player.yaw = look(c.x + 4, c.z - 4); sim(1.2);
  const staring = { phase: pt.phase, look: pt.look, heads: pt.head.map((h) => +h.toFixed(2)) }; const ck = pt.clock; sim(1.0);
  const frozen = pt.clock === ck;
  fp.player.yaw += Math.PI; sim(1.6);
  const after = { phase: pt.phase, look: pt.look }; const ck2 = pt.clock; sim(0.5);
  put(c.x + 20, c.z - 20, look(c.x + 20, c.z - 20)); sim(0.5); // looking at them from 28 m: no stare
  out.patrons = { before, staring, frozen, after, moving: pt.clock > ck2, far: pt.phase };
  // ---- the musician: offended within 3 m, back after 4 s at 5 m or more
  const ma = mus.at, ms = mus.state;
  put(ma.x, ma.z - 6); sim(2);
  const n0 = ms.notes, play0 = ms.playing;
  put(ma.x + 0.3, ma.z - 2); sim(0.3);
  const off = { phase: ms.phase, playing: ms.playing }; sim(2); off.turn = +ms.turn.toFixed(2);
  const nOff = ms.notes; sim(3); const silent = ms.notes === nOff;
  put(ma.x, ma.z - 7); sim(3); const still = ms.phase;
  sim(4); sim(14);
  out.musician = { play0, off, silent, still, back: ms.phase, playing: ms.playing, notesAfter: ms.notes - nOff, offences: ms.offences, n0 };
  // ---- the sleeper: a twitch within 2.2 m, armed again past 4 m
  const fw = sl.footWorld, ss = sl.state, t0 = ss.twitches;
  put(fw.x + 3, fw.z); sim(0.5);
  put(fw.x + 1.5, fw.z); sim(0.3); const tw1 = ss.twitches - t0, foot = ss.foot; sim(2.5);
  const tw2 = ss.twitches - t0;
  put(fw.x + 5, fw.z); sim(0.5); put(fw.x + 1.5, fw.z); sim(0.3);
  out.sleeper = { tw1, foot: +foot.toFixed(2), tw2, tw3: ss.twitches - t0 };
  // ---- the gutter: lamps and voice
  const K = H.uK, fk = (a) => Array.from(a.slice(1));
  put(95, -55); const f = fp.sky.flicker, hold = (v) => { f.hold = v; f.value = v; }; hold(1); sim(1);
  const k0 = K[0];
  hold(0.2); const logAt = H.log.length; sim(4);
  const inG = { on: H.gutter.on, k0: +K[0].toFixed(2), fickle: Math.max(...fk(K)) };
  const during = H.log.slice(logAt).filter((e) => /murmur|pluck|laugh/.test(e.name)).length;
  hold(1); const logEnd = H.log.length; sim(0.5);
  const flare = +K[0].toFixed(2), fickleDark = Math.max(...fk(K)); sim(1.5); const fickleLate = Math.max(...fk(K));
  sim(40);
  const firstAfter = H.log.slice(logEnd).find((e) => /murmur|pluck|laugh/.test(e.name));
  out.gutter = { k0: +k0.toFixed(2), inG, during, flare, fickleDark, fickleLate, relit: H.gutter.relit, kEnd: [+K[0].toFixed(2), Math.min(...fk(K))], firstAfter };
  // ---- the voice from 55 m
  put(c.x, c.z - 56); const l55 = H.log.length; sim(60); // 56 m from the patrons' table
  const far = H.log.slice(l55);
  out.far = { murmur: far.filter((e) => e.name === 'house-murmur').length, laugh: far.filter((e) => e.name === 'house-laugh').length, d: far.length ? Math.round(far[0].d) : null };
  // ---- the light slots: on K1 and P9 every 4 m, sources within reach + 20 m
  const src = fp.lightSlots.sources.filter((s) => s.name !== 'walkers-link-light'), V = new fp.THREE.Vector3();
  const pos = src.map((s) => { s.updateWorldMatrix(true, false); V.setFromMatrixPosition(s.matrixWorld); return { x: V.x, y: V.y, z: V.z, r: s.distance + 20, name: s.name }; });
  out.slots = {};
  for (const id of ['K1', 'P9']) {
    const L = fp.paths.leads.find((l) => l.id === id); let worst = { n: 0 };
    if (!L) { out.slots[id] = null; continue; }
    for (const line of L.lines) for (let i = 0; i < line.length - 1; i++) {
      const [ax, az] = line[i], [bx, bz] = line[i + 1], sl2 = Math.hypot(bx - ax, bz - az);
      for (let s = 0; s < sl2; s += 4) {
        const x = ax + (bx - ax) * s / sl2, z = az + (bz - az) * s / sl2, y = fp.terrain.heightAt(x, z) + 1.7;
        const near = pos.filter((p) => Math.hypot(p.x - x, p.y - y, p.z - z) < p.r);
        const n = near.length + (id === 'P9' ? 1 : 0);
        if (n > worst.n) worst = { n, x: +x.toFixed(0), z: +z.toFixed(0), near: near.map((p) => p.name || '?') };
      }
    }
    out.slots[id] = worst;
  }
  out.houseLights = src.filter((s) => /^house|taverna/.test(s.name)).map((s) => s.name);
  // ---- the slipper's mate
  const mate = fp.scene.getObjectByName('house-slipper-mate'), orig = fp.scene.getObjectByName('slipper');
  const avg = (m) => { const im = m?.material?.map?.image; if (!im) return null; const g = im.getContext('2d').getImageData(0, 0, im.width, im.height).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < g.length; i += 4) { r += g[i]; gg += g[i + 1]; b += g[i + 2]; } const n = g.length / 4; return [r / n, gg / n, b / n].map((v) => Math.round(v)); };
  const mb = mate && (mate.geometry.computeBoundingSphere(), mate.geometry.boundingSphere.center);
  const slipCtr = mb ? { x: mb.x, z: mb.z } : null;
  out.slipper = {
    mate: !!mate, orig: !!orig, verts: [mate?.geometry.attributes.position.count, orig?.geometry.attributes.position.count], cols: [avg(mate), avg(orig)],
    footD: slipCtr ? +Math.hypot(slipCtr.x - sl.place.elements[12], slipCtr.z - sl.place.elements[14]).toFixed(2) : null,
    lenOrig: orig ? +(orig.geometry.boundingSphere.radius * 2).toFixed(3) : null, lenMate: mate ? +(mate.geometry.boundingSphere.radius * 2).toFixed(3) : null,
  };
  return out;
});
if (r.missing) { check('ctx.house exists', false); await browser.close(); process.exit(1); }
const L = r.lamps;
check(`the lamps: at least 100 (low tier), in all four colours, every bracket of the house hung`, L.n >= 100 && L.cols.every((n) => n >= 15) && L.brackets === L.wantBrackets && L.wantBrackets >= 20, L);
check(`every lamp hangs 1.9-13 m over the ground under it`, L.lo >= 1.9 && L.hi <= 13, { lo: +L.lo.toFixed(2), hi: +L.hi.toFixed(2) });
const s = r.stand;
check(`the people stand on their ground (host's feet, the patrons' seats on their stools, the musician on the rim, the sleeper on the floor, each within 8 cm)`, Math.abs(s.host) < 0.08 && s.patrons.every((d) => Math.abs(d) < 0.08) && Math.abs(s.musician) < 0.08 && Math.abs(s.sleeper) < 0.08, s);
const h = r.host;
check(`the host turns to you, bows you in at 6 m (deep), and bows you out at the gate (four times shallower, a palm out)`, h.inPhase === 'in' && h.inDepth >= 0.9 && h.faced < 0.6 && h.outPhase === 'out' && h.outDepth > 0.05 && h.outDepth * 4 <= h.inDepth && h.palm > 0.8, h);
check(`the host's bow in is armed again once you have been 15 m off`, h.again === 2, h);
const p = r.patrons;
check(`the patrons play until looked at, then both stare at you with the game frozen`, p.before.phase === 'play' && p.staring.phase === 'stare' && p.staring.look >= 0.99 && p.staring.heads.every((x) => Math.abs(x) > 0.2) && p.frozen, p);
check(`they go back to the game when you look away, and not stare from 28 m`, p.after.phase === 'play' && p.after.look === 0 && p.moving && p.far === 'play', p);
const m = r.musician;
check(`the musician plays, and within 3 m stops, offended, and turns his back`, m.play0 && m.off.phase === 'offended' && !m.off.playing && m.off.turn >= 0.99 && m.silent, m);
check(`he waits out four seconds at 5 m or more, turns back and plays again`, m.still === 'offended' && m.back === 'play' && m.playing && m.notesAfter >= 2, m);
const sl = r.sleeper;
check(`the sleeper's bare foot twitches within 2.2 m, once, and again after you have been 4 m off`, sl.tw1 === 1 && sl.foot > 0.3 && sl.tw2 === 1 && sl.tw3 === 2, sl);
const g = r.gutter;
check(`in a gutter the lamps dim to a flutter and every fickle lamp goes out; nothing is said or played`, g.k0 > 0.95 && g.inG.on && g.inG.k0 < 0.6 && g.inG.fickle === 0 && g.during === 0, g);
check(`as it ends they flare together, the fickle stay dark, then are relit one by one`, g.flare > 1.1 && g.fickleDark === 0 && g.fickleLate === 0 && g.relit >= 12 && g.kEnd[0] > 0.95 && g.kEnd[1] > 0.95, g);
check(`after it the first voice is a nervous laugh`, g.firstAfter && g.firstAfter.name === 'house-laugh' && g.firstAfter.opts?.nervous === true, g.firstAfter);
check(`the talk and a laugh carry to 55 m (a minute there: murmurs and at least one laugh)`, r.far.murmur >= 6 && r.far.laugh >= 1 && r.far.d >= 54, r.far);
check(`at most three live point-light sources within reach + 20 m of any point on K1 and P9 (P9 with the Link-Boy on it)`, r.slots.K1 && r.slots.P9 && r.slots.K1.n <= 3 && r.slots.P9.n <= 3, { slots: r.slots, house: r.houseLights });
const sp = r.slipper;
check(`the slipper's mate is on the sleeper's foot: the same shape and brocade as the one on the causeway`, sp.mate && sp.orig && sp.verts[0] === sp.verts[1] && sp.cols[0] && sp.cols[0].every((v, i) => Math.abs(v - sp.cols[1][i]) < 6) && sp.footD !== null && sp.footD < 1.3 && Math.abs(sp.lenOrig - sp.lenMate) < 0.01, sp);
check(`the module's cost: at most 12 draw calls and 120k triangles on the low tier`, r.stats.calls <= 12 && r.stats.tris < 120000, r.stats);
check(`no errors on the page`, errors.length === 0, errors.slice(0, 3));
await page.close();
// ---- ?house=0: none of it, and the court lantern's light where it was
const off = await browser.newPage({ viewport: { width: 640, height: 360 } });
await off.goto(`${base}/?q=low&house=0&only=structures,house`, { waitUntil: 'load', timeout: 120000 });
await off.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 600000 });
const o = await off.evaluate(() => ({ house: window.__fp.house, lantern: !!window.__fp.scene.getObjectByName('taverna-court-lantern'), lamps: !!window.__fp.scene.getObjectByName('house-lamps') }));
check(`?house=0 leaves it out (and the court keeps its own lantern light)`, o.house === null && !o.lamps && o.lantern, o);
await browser.close();
const failed = results.filter((x) => !x.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
