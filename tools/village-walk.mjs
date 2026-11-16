#!/usr/bin/env node
// The Lappet walked by hand (v15-V0): a judge's tool, not a gate (the model: tools/noon-walk.mjs). One page: press
// "Go out", click the view so the mouse is captured (if headless Chromium refuses the capture, the page's own
// fallback, drag to look, which this uses and says so), then hold W and steer with the mouse alone, from the keep's
// fallen corner down the Heliarch stair (the head's west flight, the slot, the landing, the Late timber flight, the
// bastion, the foot flight) into the Lees' square, down the ramp to the Pomegranate House's wall and back up it; then
// up the daylight main from its foot to the breach, out along the gangway to the Mid Rung, down the Tenter and up it
// again, back through the breach and up the main to the High Rung, up the head's east flight to the crown, west along
// the fallen corner, west along the brink, and down the ladder at the rim and up it. With `touch` the same on a phone-sized touch page with the stick only: one finger holds the stick
// up, a second drags to steer. With every=1 it stops each metre it walks on a way (not on a tread or the ground),
// turns the head left or right and writes a frame; at checkpoints it always does.
//   node tools/village-walk.mjs [base=http://localhost:8123] [keys|touch] [q=low] [every=0] [prefix=v15-V0-walk]
// ROUTE=rungs (v15-Q2) walks the Rungs' own ways instead, from the Lees' square: up the Lees' stair, up the Tenter and down
// it, the Slype, up the Gullet, the Leads' three crossings, the five house stairs (each in the direction the
// tour meets it). The ways' points are the registered ascents' own paths; it prints each way as it is finished and a
// count, and wants the ladder taken once.
// With route=pennyworth (v15-Q4) it walks the quarter at the hill's foot instead: from the ramp's foot between the
// garden and the wreck's neck to the old kerb, up it to the market and along the Thumbway to the Pomegranate House's
// south door, through it, across the court and out of the north gate; round the house by the Hitch (between the two
// houses, the stable's back); down the kerb past the wreck to the Leave; along the Skirts and back to the ramp.
//   node tools/village-walk.mjs [base=http://localhost:8123] [keys|touch] [q=low] [every=0] [prefix=v15-V0-walk] [route=village|pennyworth]
// Frames go to shots/wip/<prefix>-<mode>-<q>-NNN-<what>.png in order. Prints each frame with where the feet are and
// on what floor, each time the ladder is taken hold of, and a last line `walked: yes|no`.
import { createRequire } from 'node:module';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const [base = 'http://localhost:8123', mode = 'keys', q = 'low', every0 = '0', prefix0 = 'v15-V0-walk', routeName = 'village'] = process.argv.slice(2);
const quarter = routeName === 'pennyworth';
const every = +every0;
const prefix = `${prefix0}-${mode}-${q}`;
const touch = mode === 'touch';
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext(touch ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const RUNGS = process.env.ROUTE === 'rungs';
const start = RUNGS ? (await import('../src/v15/plan.js')).at(2, 20.5, 20.5).map((v) => v.toFixed(1)).join(',') : '58,-6';
await page.goto(`${base}/?q=${q}&${quarter ? 'pos=103.2,-16.2&yaw=2.6' : `pos=${start}&yaw=-1.9`}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = touch ? 390 : 1280, H = touch ? 844 : 720;
let cdp = null;
if (touch) {
  cdp = await context.newCDPSession(page);
  await page.evaluate(() => { const b = document.getElementById('begin'); if (b) b.click(); });
} else {
  await page.click('#begin').catch(() => page.evaluate(() => window.__fp.events.dispatchEvent(new CustomEvent('begin'))));
  await sleep(500);
  await page.mouse.click(W / 2, H / 2);
}
await sleep(1200);
const st = () => page.evaluate(() => { const p = window.__fp.player; return { x: p.pos.x, z: p.pos.z, feet: p.pos.y - p.eye, yaw: p.yaw, pitch: p.pitch, floor: p.onStack?.name || 'ground', carried: !!p.carried, climbs: window.__fp.lappet.built['rungs-ladder'].state().climbs, locked: !!document.pointerLockElement }; });
const s0 = await st();
const locked = s0.locked;
console.log(touch ? 'touch page' : `pointer captured: ${s0.locked}${s0.locked ? '' : ' (refused: steering by the page\'s drag-to-look fallback)'}`);
// the route, from the village's own plan (read only)
const route = await page.evaluate(async ([RUNGS, quarter]) => {
  const P = await import('/src/v15/plan.js'), R = [], S = P.STAIR.s, tb = P.way('noon-main'), ld = P.way('rungs-ladder'), pr = P.way('pennyworth-ramp'), up = P.way('heliarch-upper'), hf = P.way('heliarch-foot');
  const push = (xz, tag) => R.push({ x: xz[0], z: xz[1], tag });
  if (quarter) {
    const lane = (n) => P.LANES.find((l) => l.name === n).pts, D = P.HOUSE.door, G = P.HOUSE.gate, cx = (P.HOUSE.x0 + P.HOUSE.x1) / 2, cz = (P.HOUSE.z0 + P.HOUSE.z1) / 2, wl = lane('wall-lane'), gl = lane('gate-lane');
    // the ramp's foot; between the garden and the wreck's neck to the old kerb; up the kerb to the market; the Thumbway west to the south door
    push([103.6, -16.8], 'ramp-foot'); for (const q of lane('ramp-cut')) push(q, q === lane('ramp-cut')[3] ? 'slip' : undefined); for (const q of [...lane('ramp-cut')].reverse()) push(q); push([106.6, -17.5]); push([110.9, -17.5], 'neck'); push([113.4, -19.2]); push([112.6, -21], 'garden'); push([110.8, -26.4]); push(wl[2], 'market'); push(wl[1], 'thumbway'); push(wl[0]);
    // through the door, across the court, out of the north gate
    push([D.x, D.z + 1.3], 'south-door'); push([D.x, D.z - 0.2], 'in-the-door'); push([D.x, D.z - 2.6], 'gallery'); push([cx - 2.8, cz + 6]); push([cx - 2.8, cz - 6], 'court'); push([G[0], G[1] + 2.2], 'gate-inside'); push([G[0], G[1] - 2.6], 'gate-outside');
    // the west way (the path P9): from the gate west and north round the house's haha to where the riser shuts it by the north-west tower (no way through to the south door's pocket: 0.3 m between the tower and the riser's end), and back
    { const ww = [[90, -64.6], [76, -62], [67, -52], [69, -42], [70.5, -36.4], [79.9, -32.6]]; ww.forEach((q, i) => push(q, { 2: 'west-way', 5: 'west-end' }[i])); for (let i = ww.length - 2; i >= 0; i--) push(ww[i]); push([G[0], G[1] - 2.6], 'gate-from-west'); }
    // round the house by the Hitch: the far side, the two houses, the stable's back, the Thumbway's east end
    for (let i = gl.length - 1; i >= 0; i--) push(gl[i], { 6: 'hitch-far', 3: 'hitch-houses', 2: 'hitch-stable', 0: 'thumbway-east' }[i]);
    // down the old kerb past the wreck to the Leave; the Skirts and back; by the neck to the ramp
    push([110.8, -26.4]); push([112.6, -21]); push([115.2, -16.2], 'wreck'); push([118.2, -10.6]); push([121.1, -6], 'leave');
    push([117.6, -9.5]); push([116.2, -3.5], 'skirts'); push([115.8, 1.6], 'lean-tos'); push([116.2, -3.5]); push([117.6, -9.5]);
    push([113.4, -19.2]); push([110.9, -17.5]); push([106.6, -17.5]); push([103.6, -16.8], 'ramp-foot-again');
    return R;
  }
  const a = (s, D, tag) => push(P.at(1, s, D), tag), b = (s, D, tag) => push(P.at(2, s, D), tag), pol = (bg, r, tag) => push(P.polar(bg, r), tag);
  if (RUNGS) {
    const A = Object.fromEntries(window.__fp.ascents.list.map((w) => [w.id, w.path]));
    const way = (id, rev) => { const pts = rev ? [...A[id]].reverse() : A[id]; pts.forEach((q, k) => push([q[0], q[1]], k === pts.length - 1 ? `way:${id}` : undefined)); };
    // a house stair runs along its front: come to its foot from out in the lane and leave it the same way, or the straight
    // line to the next point runs back up the flight
    const lane = (id) => { const q = A[id][0], f = P.frameOf(q[0], q[1]); push(P.at(f.run, f.s, f.D > 12 ? 14.7 : 9.4)); };
    const up2 = (id) => { if (/-stair$/.test(id) && id !== 'lees-stair') lane(id); way(id, false); }, dn = (id) => { way(id, true); if (/-stair$/.test(id)) lane(id); };
    up2('lees-stair'); b(22.4, 14.6); b(22.15, 12.4); b(19.7, 12.2); up2('rungs-tenter'); // (v15-W1: the ladder that stood beside the Tenter climbs the rim now: taken below, from the High Rung)
    dn('rungs-tenter'); b(12.2, 11.9); b(9, 11.7); b(5.6, 11.9); b(4.4, 14.5); b(1, 14.6); up2('rungs-gullet');
    b(1.5, 9.3); dn('rungs-leads-3'); a(37, 9.3); a(27.5, 9.3); dn('rungs-low-3-stair'); up2('rungs-low-3-stair'); dn('rungs-leads-2'); dn('rungs-leads-1'); a(6, 9.4);
    up2('rungs-mid-1-stair'); a(7.5, 3.4); a(ld.s, -2.9); a(ld.s, -4.1); a(ld.s, -5.7, 'way:rungs-ladder'); a(13.5, -7.2); a(ld.s, -5.5); a(ld.s, -3.85); a(ld.s, -2.9); a(14.2, 3.4); // (off the head onto the crown and back to it, as the main route comes: turned about on the head, the walker hung on the top rung) dn('rungs-mid-2-stair'); up2('rungs-mid-3-stair'); a(22.6, 3.4); a(33, 3.2); b(2, 3.0); b(6, 1.5); b(12, 1.5); b(22, 3.2); dn('rungs-mid-7-stair');
    return R;
  }
  // down: the keep's fallen corner, the court, the head, its west flight, the slot, the landing, the timber, the bastion, the foot
  a(S, -9, 'court'); a(S, -5.5, 'head'); a(S - 0.6, -3.7); a(S - 3.4, -3.7, 'head-flight'); a(S - 6.6, -3.7); a(S - 6.6, 0.2); a(S, 0.8, 'slot');
  a(S, up.D0 + 0.4); a(S, (up.D0 + up.D1) / 2, 'upper-flight'); a(S, up.D1 + 0.9, 'landing'); a(S, 10.4); a(S, 12.8, 'timber'); a(S, 15.9, 'bastion'); { const fp = window.__fp.ascents.list.find((w) => w.id === 'heliarch-foot').path; push(fp[2]); push([(fp[1][0] + fp[2][0]) / 2, (fp[1][1] + fp[2][1]) / 2], 'foot-flight'); push(fp[0], 'square'); void hf; } // (v15-W1: the foot flight is turned toward the square: its own registered line)
  // to the house's wall by the ramp, and back
  pol(pr.b0 - 3.2, P.HAHA - 2.2); pol(pr.b0 - 1.2, P.HAHA + 1.1, 'ramp-head'); for (const bg of [pr.b0 + 2, pr.b0 + 6, pr.b0 + 10]) pol(bg, P.HAHA + 1.1, bg === pr.b0 + 6 ? 'ramp' : undefined); pol(pr.b1 + 0.6, P.HAHA + 1.1, 'ramp-foot');
  const cut = (P.LANES.find((l) => l.name === 'ramp-cut') || { pts: [] }).pts; // (v15-Q4: the Slip, between the booths' end and the garden's wall)
  for (const q of cut) push(q);
  push([P.HOUSE.x1 - 7, P.HOUSE.z1 + 1.3], 'house-wall');
  for (const q of [...cut].reverse()) push(q);
  pol(pr.b1 + 0.6, P.HAHA + 1.1); for (const bg of [pr.b0 + 10, pr.b0 + 6, pr.b0 + 2]) pol(bg, P.HAHA + 1.1); pol(pr.b0 - 1.2, P.HAHA + 1.1); pol(pr.b0 - 3.2, P.HAHA - 2.2, 'bench');
  // the main from its foot to the breach, the gangway, the Mid Rung
  const k = 4 / 5.4, door = (P.LEVEL.high.y + 0.81 - P.LEVEL.mid.y) / k + P.RISERS[1].D;
  b(tb.s + 0.4, 22.6, 'tube-foot'); b(tb.s, 20.2); b(tb.s, 17, 'tube-low'); b(tb.s, 14, 'tube-mid'); b(tb.s, door + 0.15, 'breach'); b(tb.s + 2.6, door, 'gangway'); b(tb.s + 2.6, 9.2); b(16.5, 9.2, 'mid-rung');
  // the Tenter: down it and up again (v15-W1: the ladder that stood beside it is taken at the end, up the rim)
  { const tp = window.__fp.ascents.list.find((w) => w.id === 'rungs-tenter').path; [...tp].reverse().forEach((q, k) => push(q, k === 3 ? 'tenter-foot' : undefined)); tp.forEach((q, k) => push(q, k === 3 ? 'tenter-top' : undefined)); }
  // back through the breach and up the main to the High Rung; the head's east flight; the court; the fallen corner
  b(tb.s + 2.6, 9.2); b(tb.s + 2.6, door); b(tb.s, door - 0.15); b(tb.s, 8, 'tube-high'); b(tb.s, 5.2); b(tb.s, 2.6, 'tube-top'); b(4, -0.5);
  const cs = P.cornerS(1, -3.7);
  a(cs + 1.4, -3.7); a(S + 1.5 + 2, -3.7, 'head-flight-up'); a(S + 0.4, -3.7); a(S, -6.5, 'crown'); a(S - 4, -11, 'corner');
  // the ladder (v15-W1: up the rim at the crown's west end): west along the brink, off its head and down, into its foot and up
  a(27.2, -8.6); a(22, -6.6); a(13.5, -7.2); a(ld.s, -5.5); a(ld.s, -3.85, 'ladder-down'); a(ld.s, -2.9, 'ladder-foot'); a(ld.s, -4.1, 'ladder-up'); a(ld.s, -5.7, 'ladder-top');
  return R;
}, [RUNGS, quarter]);
const SENS = touch ? 0.005 : 0.0021;
const touchPts = (pts) => pts.map(([id, x, y]) => ({ id, x, y }));
let stickDown = false, stickHome = null;
async function walkOn(on) {
  if (!touch) { if (on) await page.keyboard.down('KeyW'); else await page.keyboard.up('KeyW'); return; }
  if (on && !stickDown) {
    stickHome = await page.evaluate(() => { const r = document.getElementById('stick').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 3, x: stickHome.x, y: stickHome.y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 3, x: stickHome.x, y: stickHome.y - 55 }] });
    stickDown = true;
  } else if (!on && stickDown) {
    stickDown = false;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
}
async function lookTouch(dyaw, dpitch = 0) {
  const px = -dyaw / SENS, py = -dpitch / SENS, was = stickDown, sx = 195, sy = 300, n = 6;
  if (was) await walkOn(false);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touchPts([[7, sx, sy]]) });
  for (let i = 1; i <= n; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touchPts([[7, sx + px * i / n, sy + py * i / n]]) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  if (was) await walkOn(true);
}
let mx = W / 2, my = H / 2;
async function lookKeys(dyaw, dpitch = 0) {
  const px = -dyaw / SENS, py = -dpitch / SENS, n = Math.max(1, Math.ceil(Math.max(Math.abs(px), Math.abs(py)) / 150));
  if (locked) { for (let i = 0; i < n; i++) { mx += px / n; my += py / n; await page.mouse.move(mx, my); } return; }
  mx = W / 2; my = H / 2; await page.mouse.move(mx, my); await page.mouse.down();
  for (let i = 0; i < n; i++) { mx += px / n; my += py / n; await page.mouse.move(mx, my); }
  await page.mouse.up();
}
const turn = touch ? lookTouch : lookKeys;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
let frame = 0;
async function shot(what) {
  frame++;
  const f = `shots/wip/${prefix}-${String(frame).padStart(3, '0')}-${what}.png`;
  await page.screenshot({ path: f });
  const s = await st();
  console.log(`[frame] ${f} at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(2)} on ${s.carried ? 'the ladder' : s.floor}`);
}
async function pause(fn) { await walkOn(false); await sleep(400); await fn(); await walkOn(true); }
// at a checkpoint: what to look at, as turns from the walking direction (yaw, pitch)
const LOOKS = {
  court: [['down-the-stair', 0, -0.25]], head: [['over', 0, -0.5]], 'head-flight': [['ahead', 0, -0.3]], slot: [['down', 0, -0.45]], 'upper-flight': [['ahead', 0, -0.35]],
  landing: [['timber', 0, -0.4], ['back', Math.PI, 0.5]], timber: [['ahead', 0, -0.4]], bastion: [['square', 0, -0.25], ['back', Math.PI, 0.45]], 'foot-flight': [['ahead', 0, -0.2]], square: [['back', Math.PI, 0.35]],
  'ramp-head': [['down', 0, -0.2]], ramp: [['ahead', 0, -0.1]], 'ramp-foot': [['back', Math.PI, 0.15]], 'house-wall': [['wall', 0, 0.1], ['back', Math.PI, 0.3]], bench: [['tube', 1.2, 0.2]],
  'tube-foot': [['mouth', 0, 0.35]], 'tube-low': [['up', 0, 0.5]], 'tube-mid': [['up', 0, 0.5], ['back', Math.PI, -0.5]], breach: [['out', -1.4, 0]], gangway: [['along', 0, 0], ['back', Math.PI, 0]],
  'mid-rung': [['ladder', 0, 0]], 'ladder-foot': [['back', Math.PI, 0.6]], 'ladder-top': [['back', Math.PI, -0.5]], 'tube-high': [['up', 0, 0.5]], 'tube-top': [['back', Math.PI, -0.5], ['ahead', 0, 0]],
  'head-flight-up': [['ahead', 0, 0.3]], crown: [['house', Math.PI, -0.3]], corner: [['back', Math.PI, -0.1]],
  // route=pennyworth
  slip: [['ahead', 0, 0.05], ['back', Math.PI, 0.2]],
  'west-way': [['ahead', 0, 0.05], ['house', -1.4, 0.15]], 'gate-from-west': [['gate', -1.2, 0.1]], 'west-end': [['ahead', 0, 0.05], ['back', Math.PI, 0.1]],
  thumbway: [['west', 0, 0.05], ['stalls', 1.5, 0.05]], 'south-door': [['door', 0, 0.1]], 'in-the-door': [['court', 0, 0]], gallery: [['back', Math.PI, 0]], court: [['gate', 0, 0.05]], 'gate-inside': [['back', Math.PI, 0.05]],
  'gate-outside': [['back', Math.PI, 0.2]], 'hitch-far': [['ahead', 0, 0.05]], 'hitch-houses': [['ahead', 0, 0.2], ['up-the-bank', 1.45, 0.25]], 'hitch-stable': [['ahead', 0, 0.1]], 'thumbway-east': [['keep', -0.66, 0.3]],
  market: [['stalls', 0.9, 0], ['back', Math.PI, 0.1]], garden: [['garden', 1.2, -0.1]], wreck: [['wreck', -1.1, 0.05]], leave: [['out', 0, 0], ['back', Math.PI, 0.15]], skirts: [['riser', -1.5, 0.2]], 'lean-tos': [['lean-tos', -1.3, 0.1], ['back', Math.PI, 0.1]],
  neck: [['ahead', 0, 0.1]], 'ramp-foot-again': [['back', Math.PI, 0.1]],
};
await shot('start');
await walkOn(true);
let i = 0, stuck = 0, last = null, since = 0, side = 1, climbs = 0, ways = 0;
const t0 = Date.now();
const onWay = (s) => s.carried || (s.floor !== 'ground' && !/^lappet-(crown|high|mid|low|bench)/.test(s.floor));
while (i < route.length && Date.now() - t0 < (+process.env.WALK_MIN || 30) * 60 * 1000) {
  const s = await st();
  const w = route[i], dx = w.x - s.x, dz = w.z - s.z, d = Math.hypot(dx, dz);
  if (s.climbs !== climbs) { climbs = s.climbs; console.log(`took hold of the ladder at feet ${s.feet.toFixed(2)} (${climbs})`); }
  if (last && onWay(s)) since += Math.hypot(s.x - last.x, s.feet - last.feet, s.z - last.z);
  if (every > 0 && since >= every) {
    since = 0; side = -side;
    await pause(async () => { const p0 = (await st()).pitch; await turn(side * 0.55, 0); await sleep(700); await shot(`m-${s.carried ? 'ladder' : s.floor}`); await turn(-side * 0.55, p0 - (await st()).pitch); await sleep(150); });
  }
  if (d < 0.6) {
    if (w.tag && LOOKS[w.tag]) for (const [what, dy, dp] of LOOKS[w.tag]) await pause(async () => { await turn(dy, dp - (await st()).pitch); await sleep(1100); await shot(`${w.tag}-${what}`); await turn(-dy, -(await st()).pitch); await sleep(200); });
    else if (w.tag && w.tag.startsWith('way:')) { ways++; console.log(`[way] ${w.tag.slice(4)} walked, feet ${s.feet.toFixed(2)} on ${s.carried ? 'the ladder' : s.floor}`); }
    else if (w.tag) console.log(`[at] ${w.tag} (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(2)} on ${s.carried ? 'the ladder' : s.floor}`);
    i++; continue;
  }
  const want = Math.atan2(-dx, -dz), dy = wrap(want - s.yaw);
  if (Math.abs(dy) > (touch ? 0.06 : 0.02)) await turn(dy, -s.pitch * 0.5);
  await sleep(d < 2 ? 60 : 120);
  if (last && Math.hypot(s.x - last.x, s.z - last.z, s.feet - last.feet) < 0.01) { if (++stuck > 80) { console.log(`stuck at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}) feet ${s.feet.toFixed(2)} on ${s.floor} heading for ${i} ${w.tag || ''} (${w.x.toFixed(1)}, ${w.z.toFixed(1)})`); break; } } else stuck = 0;
  last = s;
}
await walkOn(false);
const walked = i >= route.length;
if (!walked && last && stuck <= 80) console.log(`out of time at (${last.x.toFixed(1)}, ${last.z.toFixed(1)}) feet ${last.feet.toFixed(2)} on ${last.floor} heading for ${i} ${route[i].tag || ''} (${route[i].x.toFixed(1)}, ${route[i].z.toFixed(1)})`);
console.log(`ladder taken ${climbs} times; page errors: ${errors.length}${errors.length ? ' ' + errors.slice(0, 3).join(' | ') : ''}`);
if (RUNGS) console.log(`ways walked: ${ways} of ${route.filter((w) => w.tag && w.tag.startsWith('way:')).length}`);
console.log(`walked: ${walked ? 'yes' : 'no'}`);
await browser.close();
process.exit(walked && (quarter || climbs >= (RUNGS ? 1 : 2)) && !errors.length ? 0 : 1);
