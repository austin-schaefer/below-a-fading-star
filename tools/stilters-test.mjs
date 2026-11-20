#!/usr/bin/env node
// v18-F4: the stilters (src/v18/stilters.js) move only when nobody is looking. Walks the grove on a scripted look and
// checks, frame by frame, against the camera's own frustum widened by MARGIN degrees (not the stilters' own test):
//   - no stilter's position or heading changes in a frame where it was in that view, before or after;
//   - at least one steps while out of view;
//   - none comes within 3 m of the visitor (the nearest foot's edge), none stands on a track (its middle or a foot);
//   - after a gutter in the grove the waking ones ring the visitor, facing in, with a gap of at least 60 degrees
//     toward the track out, and none stood within 3 m;
//   - the eyes shut when looked at (a watcher opened 10 to 18 m off to the side, the look turned onto it).
// Twice: 1280x720 and the phone's 390x844 (its tall view is where a frame's edge is nearest), both on low.
// Frames, in order (look, look away, look back; the ring in the dark and after): shots/wip/<prefix>-<q>-<view>-NN-*.png
//   node tools/stilters-test.mjs <base> [prefix=v18-F4-stilters] [frames=low]   (frames: low,medium,phone or none)
import { launch } from './launch.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const prefix = process.argv[3] || 'v18-F4-stilters';
const frameSet = (process.argv[4] || 'low').split(',');
const MARGIN = 6; // degrees the test's view is widened by, all round
mkdirSync('shots/wip', { recursive: true });
let pass = 0, fail = 0;
const check = (ok, name, info = '') => { if (ok) pass++; else fail++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ': ' + info : ''}`); };

const browser = await launch();
async function run(view, q, frames) {
  const [w, h] = view === 'phone' ? [390, 844] : [1280, 720];
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.setDefaultTimeout(600000);
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`${base}/?q=${q}&pos=-187.6,41&yaw=0.55`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
  const has = await page.evaluate(() => !!window.__fp?.stilters);
  check(has, `${view}: the stilters are built`);
  if (!has) { await page.close(); return; }
  await page.evaluate(() => {
    const fp = window.__fp;
    fp.events.dispatchEvent(new CustomEvent('begin'));
    for (const id of ['card', 'place', 'hint']) { const e = document.getElementById(id); if (e) { e.classList.add('hidden'); e.style.display = 'none'; } }
    fp.sky.flicker.next = 1e9; fp.stilters.live = true;
  });
  let n = 0;
  const shot = async (name) => {
    const url = await page.evaluate(() => { const fp = window.__fp; fp.renderer.shadowMap.needsUpdate = true; fp.post.composer.render(); return document.getElementById('scene').toDataURL('image/png'); });
    const out = `shots/wip/${prefix}-${q}-${view}-${String(n++).padStart(2, '0')}-${name}.png`;
    writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
    console.log(`[saved] ${out}`);
  };

  // the monitor: every frame after the stilters' own update, the camera's frustum widened by MARGIN, each stilter's
  // world bounds; a move in a frame where it was in view (before or after) is a fault
  await page.evaluate((MARGIN) => {
    const fp = window.__fp, THREE = fp.THREE, S = fp.stilters, cam = fp.camera, tread = fp.inhabitants.treadNear;
    const wide = new THREE.PerspectiveCamera(), fr = new THREE.Frustum(), m = new THREE.Matrix4(), sp = new THREE.Sphere();
    const steps = window.__steps = [];
    fp.events.addEventListener('stilter', (e) => { if (e.detail.kind === 'step') steps.push({ i: e.detail.i, stride: e.detail.stride, d: e.detail.d, off: e.detail.trailOff, dark: fp.sky.flicker.dark }); });
    const M = window.__mon = { frames: 0, moves: 0, inViewMoves: [], minFoot: 99, onTrack: [], seen: S.list.map(() => 0), script: null, t: 0 };
    const prev = S.list.map((s) => ({ x: s.x, z: s.z, yaw: s.yaw, seen: false }));
    const seen = (s) => {
      const r = THREE.MathUtils.degToRad, v2 = r(cam.fov / 2), h2 = Math.atan(Math.tan(v2) * cam.aspect);
      wide.fov = cam.fov + MARGIN * 2; wide.aspect = Math.tan(h2 + r(MARGIN)) / Math.tan(v2 + r(MARGIN));
      wide.near = 0.05; wide.far = 2000; wide.updateProjectionMatrix();
      cam.updateMatrixWorld(); wide.position.copy(cam.position); wide.quaternion.copy(cam.quaternion); wide.updateMatrixWorld(true);
      fr.setFromProjectionMatrix(m.multiplyMatrices(wide.projectionMatrix, wide.matrixWorldInverse));
      // a sphere round each limb, leaf cluster and moss hank, as it stands (the module's own, without its 1.5 m)
      const c = Math.cos(s.yaw), sn = Math.sin(s.yaw), y = s.mesh.position.y;
      for (const [lx, ly, lz, r] of s.sk.spheres) { sp.center.set(s.x + lx * c + lz * sn, y + ly, s.z - lx * sn + lz * c); sp.radius = r; if (fr.intersectsSphere(sp)) return true; }
      return false;
    };
    fp.registerUpdate((dt) => {
      M.t += dt;
      if (M.script) M.script(dt, M.t);
      M.frames++;
      const dark = fp.sky.flicker.dark;
      S.list.forEach((s, i) => {
        const p = prev[i], moved = Math.hypot(s.x - p.x, s.z - p.z) > 1e-3 || Math.abs(s.yaw - p.yaw) > 1e-3;
        const now = seen(s);
        if (now) M.seen[i]++;
        if (moved) {
          M.moves++;
          if (now || p.seen) M.inViewMoves.push({ i, t: +M.t.toFixed(2), from: [p.x, p.z].map((v) => +v.toFixed(1)), to: [s.x, s.z].map((v) => +v.toFixed(1)) });
          if (tread(s.x, s.z, s.reach)) M.onTrack.push({ i, x: s.x, z: s.z }); // a foot on the tread
        }
        if (moved) for (const { c } of s.colliders) M.minFoot = Math.min(M.minFoot, Math.hypot(c.x - cam.position.x, c.z - cam.position.z) - c.r); // where it stepped to (the visitor may walk up to one)
        p.x = s.x; p.z = s.z; p.yaw = s.yaw; p.seen = now;
      });
    });
  }, MARGIN);

  // 1. the sweep: 60 s of looking round, holding, looking back, walking 12 m down the track into the grove
  await page.evaluate(() => {
    const fp = window.__fp, p = fp.player, M = window.__mon;
    const y0 = p.yaw, x0 = p.pos.x, z0 = p.pos.z;
    // [seconds, yaw rate]: holds and turns
    const plan = [[4, 0], [2, 1.5], [7, 0], [2, -1.5], [4, 0], [3, 0.9], [6, 0], [3, 1.2], [8, 0], [2, -2], [5, 0], [4, 0.6], [5, 0], [2, 1.4], [3, 0]];
    let k = 0, left = plan[0][0], yaw = y0;
    M.script = (dt, t) => {
      if (k >= plan.length) { M.script = null; M.done = true; return; }
      yaw += plan[k][1] * dt; left -= dt;
      if (left <= 0) { k++; if (k < plan.length) left = plan[k][0]; }
      p.yaw = yaw; p.pitch = 0.12;
      const a = Math.min(1, t / 60);
      p.pos.x = x0 - 0.52 * 12 * a; p.pos.z = z0 - 0.85 * 12 * a; // 12 m down the north spur into the grove
    };
  });
  await page.waitForFunction(() => window.__mon.done, null, { timeout: 400000, polling: 500 });
  let M = await page.evaluate(() => { const M = window.__mon; return { frames: M.frames, moves: M.moves, inView: M.inViewMoves, minFoot: M.minFoot, onTrack: M.onTrack, seen: M.seen, steps: window.__fp.stilters.steps, why: window.__fp.stilters.why }; });
  console.log(`[sweep] ${M.frames} frames, ${M.moves} moves (steps ${M.steps}), frames each was seen in: ${M.seen.join(' ')}, nearest foot ${M.minFoot.toFixed(2)} m, refused ${JSON.stringify(M.why)}`);
  check(M.frames > 100, `${view}: the sweep ran`, `${M.frames} frames`);
  check(M.inView.length === 0, `${view}: no stilter moved in view (+${MARGIN} deg)`, M.inView.slice(0, 4).map((v) => JSON.stringify(v)).join(' '));
  check(M.moves >= 1, `${view}: a stilter moved while out of view`, `${M.moves}`);
  check(M.seen.filter((v) => v > 0).length >= 3, `${view}: the stilters were in view through the sweep`, M.seen.join(' '));
  check(M.minFoot >= 3, `${view}: none came within 3 m`, `${M.minFoot.toFixed(2)} m`);
  check(M.onTrack.length === 0, `${view}: no foot on a track's tread`, JSON.stringify(M.onTrack.slice(0, 3)));

  // 2. the walk out down the spur: look ahead, look back; walk 14 m; look back; twice more. At eye height, level.
  //    The follower (the scarred one) strides into the back-trail while it is not looked at.
  const spur = await page.evaluate(() => window.__fp.inhabitants.spur);
  {
    const G = [-198, 22], pts = Math.hypot(spur[0][0] - G[0], spur[0][1] - G[1]) < Math.hypot(spur[spur.length - 1][0] - G[0], spur[spur.length - 1][1] - G[1]) ? spur : spur.slice().reverse();
    const at = (s) => { let acc = 0; for (let k = 0; k < pts.length - 1; k++) { const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az); if (acc + L >= s) { const t = (s - acc) / L; return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, yaw: Math.atan2(-(bx - ax), -(bz - az)) }; } acc += L; } const [x, z] = pts[pts.length - 1]; return { x, z, yaw: 0 }; };
    const stand = async (s, look) => page.evaluate(([q, look]) => { const fp = window.__fp, p = fp.player; fp.controls.placeAt(q.x, q.z); p.yaw = q.yaw + (look === 'back' ? Math.PI : 0); p.pitch = 0; }, [at(s), look]);
    const walk = async (s0, s1) => { for (let s = s0; s <= s1; s += 1) { await stand(s, 'ahead'); await page.waitForTimeout(260); } };
    const fol = () => page.evaluate(() => { const fp = window.__fp, S = fp.stilters, f = S.follower, p = fp.player.pos; return f ? { i: f.i, x: f.x, z: f.z, d: Math.hypot(f.x - p.x, f.z - p.z), seen: f.inView } : null; });
    const rows = [];
    await stand(6, 'ahead'); await page.waitForTimeout(3000);
    if (frames) await shot('walk-ahead');
    for (const [k, s1] of [[1, 6], [2, 20], [3, 34], [4, 48]]) {
      if (k > 1) await walk(s1 - 14, s1);
      await page.waitForTimeout(2500); // the follower's stride, while it is behind
      await stand(s1, 'back'); await page.waitForTimeout(900);
      const f = await fol(); rows.push(f);
      if (frames) await shot(`walk-back${k}`);
      await stand(s1, 'ahead'); await page.waitForTimeout(400);
    }
    console.log(`[walk] the follower at each look back: ${rows.map((r) => r ? `#${r.i} ${r.d.toFixed(1)} m${r.seen ? ' (in view)' : ''}` : '-').join(', ')}`);
    const behind = rows.filter((r) => r && r.d >= 7.5 && r.d <= 12.5 && r.seen).length;
    check(behind >= 2, `${view}: the follower stands 8 to 12 m behind, in view, at two or more of four looks back`, `${behind}`);
    const moved = rows.slice(1).filter((r, k) => r && rows[k] && Math.hypot(r.x - rows[k].x, r.z - rows[k].z) >= 3).length;
    check(moved >= 2, `${view}: the follower came along between looks back`, `${moved} of 3`);
  }
  const ST = await page.evaluate(() => window.__steps.filter((s) => s.dark < 0.5));
  check(ST.length >= 2, `${view}: the follower stepped`, `${ST.length} steps`);
  check(ST.every((s) => s.stride >= 3), `${view}: every step a stride of 3 m or more`, ST.map((s) => s.stride.toFixed(1)).join(' '));
  check(ST.every((s) => s.d >= 7.9 && s.d <= 12.1 && s.off <= 0.53), `${view}: every step ends 8 to 12 m off, within 30 deg of the back-trail`, ST.map((s) => `${s.d.toFixed(1)}m/${(s.off * 57.3).toFixed(0)}deg`).join(' '));
  M = await page.evaluate(() => ({ inView: window.__mon.inViewMoves }));
  check(M.inView.length === 0, `${view}: still no stilter moved in view, the walk included`, M.inView.slice(0, 3).map((v) => JSON.stringify(v)).join(' '));

  // 3. the gutter: in the grove, at the dark's depth, the ring
  await page.evaluate(() => { const fp = window.__fp; fp.controls.placeAt(-194.5, 29); fp.player.yaw = 0.5; fp.player.pitch = 0.05; });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { const f = window.__fp.sky.flicker; f.next = 0.05; });
  await page.waitForFunction(() => window.__fp.sky.flicker.dark > 0.9, null, { timeout: 60000, polling: 100 });
  await page.waitForTimeout(1500);
  if (frames) await shot('dark');
  // the visitor turns round once in the dark, slowly (a quarter at a time), as a visitor would look about
  for (let k = 1; k <= 16; k++) { await page.evaluate((k) => { window.__fp.player.yaw = 0.5 + k * Math.PI / 4; }, k); await page.waitForTimeout(800); }
  await page.waitForFunction(() => window.__fp.sky.flicker.dark < 0.05 && window.__fp.sky.flicker.phase <= 0, null, { timeout: 60000, polling: 200 });
  await page.waitForTimeout(1500);
  const R = await page.evaluate(() => {
    const fp = window.__fp, S = fp.stilters, p = fp.player.pos, r = S.ring;
    if (!r) return null;
    // the ring: those that went to their places, and any already standing round the visitor within 12 m
    const placedI = new Set(r.placed.map((q) => q.i));
    const woke = S.list.filter((s) => !s.asleep && (placedI.has(s.i) || Math.hypot(s.x - p.x, s.z - p.z) < 12));
    const out = fp.inhabitants.exit;
    const at = woke.map((s) => {
      const d = Math.hypot(s.x - p.x, s.z - p.z), b = Math.atan2(s.x - p.x, s.z - p.z), face = Math.atan2(p.x - s.x, p.z - s.z);
      let off = Math.abs(Math.atan2(Math.sin(face - s.yaw), Math.cos(face - s.yaw)));
      const foot = Math.min(...s.colliders.map(({ c }) => Math.hypot(c.x - p.x, c.z - p.z) - c.r));
      return { d, b, off, foot, track: fp.inhabitants.treadNear(s.x, s.z, s.reach) };
    });
    const bs = at.map((a) => a.b).sort((x, y) => x - y);
    let gap = 0, mid = 0;
    for (let k = 0; k < bs.length; k++) { const a = bs[k], b = k + 1 < bs.length ? bs[k + 1] : bs[0] + Math.PI * 2; if (b - a > gap) { gap = b - a; mid = (a + b) / 2; } }
    const toOut = Math.atan2(out.x - p.x, out.z - p.z);
    return { at, gap, gapOff: Math.abs(Math.atan2(Math.sin(mid - toOut), Math.cos(mid - toOut))), placed: r.placed.length, round: woke.length, n: S.list.filter((s) => !s.asleep).length, faced: woke.map((s) => placedI.has(s.i)) };
  });
  check(!!R, `${view}: the gutter made a ring`);
  if (R) {
    console.log(`[ring] ${R.placed}/${R.n} placed; ${R.at.map((a) => `d ${a.d.toFixed(1)} foot ${a.foot.toFixed(1)} facing off ${a.off.toFixed(2)}`).join('; ')}; gap ${(R.gap * 57.3).toFixed(0)} deg, ${(R.gapOff * 57.3).toFixed(0)} deg off the way out`);
    check(R.round === R.n && R.placed >= 1, `${view}: every waking stilter stands round the visitor (those not already near went there unseen)`, `${R.placed} went, ${R.round}/${R.n} round`);
    check(R.at.every((a) => a.d > 4 && a.d < 12), `${view}: the ring stands round the visitor (4 to 12 m)`);
    check(R.at.every((a, k) => !R.faced[k] || a.off < 0.35), `${view}: those that went face in`);
    check(R.at.every((a) => a.foot >= 3), `${view}: none of the ring within 3 m`);
    check(R.at.every((a) => !a.track), `${view}: none of the ring on a track`);
    check(R.gap >= (60 / 57.3) && R.gapOff < 0.8, `${view}: the ring's gap faces the way out`, `${(R.gap * 57.3).toFixed(0)} deg wide, ${(R.gapOff * 57.3).toFixed(0)} deg off`);
    if (frames) {
      const y0 = await page.evaluate(() => window.__fp.player.yaw);
      for (let k = 0; k < 4; k++) { await page.evaluate((y) => { const p = window.__fp.player; p.yaw = y; p.pitch = 0.18; }, y0 + k * Math.PI / 2); await page.waitForTimeout(700); await shot(`ring${k}`); }
      // and from above: the camera alone lifted 34 m over the visitor, looking down (one frame, then put back)
      const url = await page.evaluate(() => {
        const fp = window.__fp, c = fp.camera, P = c.position.clone(), Q = c.quaternion.clone();
        c.position.set(P.x + 6, P.y + 34, P.z + 14); c.lookAt(P.x, P.y - 1.7, P.z); c.updateMatrixWorld();
        fp.renderer.shadowMap.needsUpdate = true; fp.post.composer.render();
        const u = document.getElementById('scene').toDataURL('image/png');
        c.position.copy(P); c.quaternion.copy(Q); c.updateMatrixWorld();
        return u;
      });
      const out = `shots/wip/${prefix}-${q}-${view}-${String(n++).padStart(2, '0')}-ring-above.png`;
      writeFileSync(out, Buffer.from(url.split(',')[1], 'base64')); console.log(`[saved] ${out}`);
    }
  }

  // 4. the eyes: a watcher opened 10 to 18 m off, 0.65 rad to the side (in the frame, off the look); the look turned onto it
  //    in steps; it shuts once the look is within its reach. Frames at each step when framing.
  const E0 = await page.evaluate(async () => {
    const fp = window.__fp, E = fp.inhabitants.eyes, p = fp.player;
    if (!E) return null;
    fp.controls.placeAt(-196, 150); p.yaw = 0; p.pitch = 0;
    await new Promise((r) => setTimeout(r, 800));
    // a spot 10 to 18 m off to one side, that no trunk stands in front of
    const T = fp.woodTrees || [];
    const clear = (x, z) => T.every((t) => { const ex = x - p.pos.x, ez = z - p.pos.z, l2 = ex * ex + ez * ez, k = Math.max(0, Math.min(1, ((t.x - p.pos.x) * ex + (t.z - p.pos.z) * ez) / l2)); return Math.hypot(t.x - p.pos.x - ex * k, t.z - p.pos.z - ez * k) > 1.6; });
    let a = p.yaw + 0.65, x = p.pos.x - Math.sin(a) * 25, z = p.pos.z - Math.cos(a) * 25;
    // off the look by 0.7 of the view's half-width (a phone's is narrow): in the frame, toward its edge
    const hf = Math.atan(Math.tan((fp.camera.fov * Math.PI) / 360) * fp.camera.aspect), o0 = hf * 0.7;
    search: for (const d of [14, 12, 16, 18, 10]) for (const off of [o0, -o0, o0 * 1.1, -o0 * 1.1, o0 * 0.9, -o0 * 0.9]) {
      const aa = p.yaw + off, xx = p.pos.x - Math.sin(aa) * d, zz = p.pos.z - Math.cos(aa) * d;
      if (clear(xx, zz)) { a = aa; x = xx; z = zz; break search; }
    }
    E.force(0, x, z, 1);
    for (const w of E.watchers.slice(1)) { w.mode = 'away'; w.t = 999; }
    await new Promise((r) => setTimeout(r, 500));
    return { a, y0: p.yaw, open: E.watchers[0].mode };
  });
  let E = null;
  if (E0) {
    if (frames) await shot('eyes-side');
    for (const k of [0.35, 0.6, 1]) {
      await page.evaluate(([y0, a, k]) => { window.__fp.player.yaw = y0 + (a - y0) * k; }, [E0.y0, E0.a, k]);
      await page.waitForTimeout(k === 1 ? 900 : 350);
      if (frames) await shot(`eyes-turn${Math.round(k * 100)}`);
    }
    E = await page.evaluate(() => { const W = window.__fp.inhabitants.eyes.watchers[0]; return { after: W.mode, shuts: W.shuts }; });
    E.openBefore = E0.open;
  }
  check(!!E, `${view}: the eyes are built`);
  if (E) {
    check(E.openBefore === 'open', `${view}: eyes held open off the look`, E.openBefore);
    check(E.after !== 'open' && E.shuts >= 1, `${view}: the eyes shut when looked at`, `${E.after}, ${E.shuts} shut`);
  }
  check(errs.length === 0, `${view}: no page errors`, errs.slice(0, 3).join(' | '));
  await page.close();
}

const runs = [['desktop', 'low'], ['phone', 'low']];
if (frameSet.includes('medium')) runs.push(['desktop', 'medium']);
for (const [view, q] of runs) {
  const frames = frameSet.includes('none') ? false : (view === 'phone' ? frameSet.includes('phone') || frameSet.includes('low') : frameSet.includes(q));
  await run(view, q, frames);
}
await browser.close();
console.log(`=== ${pass} passed, ${fail} failed`);
process.exit(fail || !pass ? 1 : 0);
