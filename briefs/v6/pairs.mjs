// Survey frame pairs: walk a line in small steps until a watched state changes, then save the frame before
// and the frame after with the camera pinned at the "before" pose, so the pair differs only by the pop.
import { writeFileSync } from 'node:fs';
const { chromium } = await import('/Users/user/dev/fading-planet/.claude/worktrees/v7-plan/prototypes/wilderness/node_modules/playwright/index.mjs');
const OUT = '/Users/user/dev/fading-planet/.claude/worktrees/v7-plan/prototypes/wilderness/shots/wip';
const only = process.argv[2] ? process.argv[2].split(',') : null;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(300000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:8159/?q=medium&wind=0&pos=-40,22&yaw=1.6', { waitUntil: 'load' });
await page.waitForFunction(() => document.body.classList.contains('ready'));
await page.evaluate(() => {
  const fp = window.__fp;
  document.getElementById('card')?.classList.add('hidden');
  for (const id of ['place', 'hint']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  fp.sky.flicker.next = 1e9;
  fp.player.enabled = false;
  const tb = fp.scene.getObjectByName('veg-trees');
  window.__pp = {
    pose(x, z, yaw, pitch = 0) { const p = fp.player; p.pos.x = x; p.pos.z = z; p.pos.y = fp.terrain.heightAt(x, z) + p.eye; p.yaw = yaw; p.pitch = pitch; p.vel?.set(0, 0, 0); },
    frames: (n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }),
    grab(pin) {
      if (pin) { fp.camera.position.set(pin.x, pin.y, pin.z); fp.camera.updateMatrixWorld(); }
      fp.post.composer.render();
      return document.getElementById('scene').toDataURL('image/png');
    },
    cam: () => ({ x: fp.camera.position.x, y: fp.camera.position.y, z: fp.camera.position.z }),
    // watched states
    treeGeo: (i) => tb.getGeometryIdAt(i),
    treeNear(x, z) { const T = fp.THREE, m = new T.Matrix4(), p = new T.Vector3(); let b = -1, bd = 1e9; for (let i = 0; i < tb.instanceCount; i++) { try { tb.getMatrixAt(i, m); } catch { continue; } p.setFromMatrixPosition(m); const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; b = i; } } return b; },
    ver(re) { let s = 0; const r = new RegExp(re); fp.scene.traverse((o) => { if (r.test(o.name)) s += (o.geometry?.attributes?.iPos?.version ?? o.instanceMatrix?.version ?? 0) * 1000 + (o.geometry?.instanceCount ?? o.count ?? 0); }); return s; },
    vis(re) { let s = ''; fp.scene.traverse((o) => { if (new RegExp(re).test(o.name)) s += o.visible ? 1 : 0; }); return s; },
    shadow: () => fp.shadowCadence.stats.redraws,
  };
});
const save = (name, url) => { const f = `${OUT}/v7-00-survey-${name}.png`; writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); console.log('[saved]', f); };
// walk from (x0,z0) toward (x1,z1) in `step` metres, looking along yaw, until watch() changes
async function pair(name, { from, to, yaw, pitch = 0, step = 0.5, watch, settle = 6 }) {
  if (only && !only.includes(name)) return;
  const n = Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / step);
  await page.evaluate(([x, z, y, p]) => window.__pp.pose(x, z, y, p), [from[0], from[1], yaw, pitch]);
  await page.evaluate((s) => window.__pp.frames(s), 40);
  let prev = await page.evaluate(watch), prevPose = null;
  for (let i = 1; i <= n; i++) {
    const u = i / n, x = from[0] + (to[0] - from[0]) * u, z = from[1] + (to[1] - from[1]) * u;
    const a = await page.evaluate(() => ({ cam: window.__pp.cam() }));
    await page.evaluate(([x, z, y, p]) => window.__pp.pose(x, z, y, p), [x, z, yaw, pitch]);
    await page.evaluate((s) => window.__pp.frames(s), 2);
    const cur = await page.evaluate(watch);
    if (cur !== prev) {
      // re-render the before state: step back, settle, grab; then forward, settle, grab pinned at before
      const bx = from[0] + (to[0] - from[0]) * (i - 1) / n, bz = from[1] + (to[1] - from[1]) * (i - 1) / n;
      // re-approach from the start so hysteresis and lazy repacks hold the before state
      await page.evaluate(([x, z, y, p]) => window.__pp.pose(x, z, y, p), [from[0], from[1], yaw, pitch]);
      await page.evaluate((s) => window.__pp.frames(s), settle);
      for (let j = 1; j < i; j += Math.max(1, Math.floor(4 / step))) {
        const px = from[0] + (to[0] - from[0]) * j / n, pz = from[1] + (to[1] - from[1]) * j / n;
        await page.evaluate(([x, z, y, p]) => window.__pp.pose(x, z, y, p), [px, pz, yaw, pitch]);
        await page.evaluate((s) => window.__pp.frames(s), 2);
      }
      await page.evaluate(([x, z, y, p]) => window.__pp.pose(x, z, y, p), [bx, bz, yaw, pitch]);
      await page.evaluate((s) => window.__pp.frames(s), settle);
      const back = await page.evaluate(watch);
      const A = await page.evaluate(() => { const c = window.__pp.cam(); return { c, url: window.__pp.grab() }; });
      await page.evaluate(([x, z, y, p]) => window.__pp.pose(x, z, y, p), [x, z, yaw, pitch]);
      await page.evaluate((s) => window.__pp.frames(s), settle);
      const fwd = await page.evaluate(watch);
      const B = await page.evaluate((c) => window.__pp.grab(c), A.c);
      save(`${name}-a`, A.url); save(`${name}-b`, B);
      console.log(`[pair] ${name}: change between (${bx.toFixed(1)}, ${bz.toFixed(1)}) and (${x.toFixed(1)}, ${z.toFixed(1)}) yaw ${yaw}; watch ${JSON.stringify(back)} -> ${JSON.stringify(fwd)}`);
      return;
    }
    prev = cur;
  }
  console.log(`[pair] ${name}: no change along the line`);
}
const W = Math.PI / 2; // looking west
// trees: an isolated tree south-west of the causeway, approached from the east; then a wood tree from the tarn side
const t1 = await page.evaluate(() => window.__pp.treeNear(-125.8, -44));
await pair('tree-near', { from: [-125.8 + 44, -44], to: [-125.8 + 14, -44], yaw: W, watch: `window.__pp.treeGeo(${t1})` });
await pair('tree-far', { from: [-125.8 + 130, -44], to: [-125.8 + 50, -44], yaw: W, step: 1, watch: `window.__pp.treeGeo(${t1})` });
const t2 = await page.evaluate(() => window.__pp.treeNear(-142.2, 140.9));
await pair('tree-wood', { from: [-142.2 + 34, 140.9], to: [-142.2 + 14, 140.9], yaw: W, watch: `window.__pp.treeGeo(${t2})` });
// grass: the far clumps take over a chunk at 60 m (heading west along the causeway's moor)
await pair('grass-far', { from: [-20, 18], to: [-70, 14], yaw: W, step: 1, watch: `window.__pp.ver('^veg-grass-far$')` });
// rocks: stones and pebbles repack every 6 m of travel (High Ling's tors and clitter)
await pair('rocks', { from: [230, -20], to: [250, -40], yaw: 2.4, step: 1, watch: `window.__pp.ver('^rocks-stone')`, settle: 3 });
// fungi: the toadstool and pod groups switch whole at 90 m (into the wood from the spit)
await pair('fungi', { from: [-68, 142], to: [-160, 132], yaw: W, step: 1, watch: `window.__pp.vis('veg-(toadstools|pods)')` });
// the shadow box: its centre moves on a redraw; walking the wood westward, the far edge 135 m ahead jumps
await pair('shadow-edge', { from: [-150, 128], to: [-170, 128], yaw: W, pitch: -0.05, step: 3.5, watch: `window.__pp.shadow()`, settle: 2 });
async function still(name, { at, yaw, pitch = 0, a = '', b = '', frames = 6, move }) {
  if (only && !only.includes(name)) return;
  await page.evaluate(([x, z, y, p]) => window.__pp.pose(x, z, y, p), [at[0], at[1], yaw, pitch]);
  await page.evaluate((s) => window.__pp.frames(s), 40);
  if (a) await page.evaluate(a);
  await page.evaluate((s) => window.__pp.frames(s), 4);
  const A = await page.evaluate(() => window.__pp.grab());
  if (move) await page.evaluate(([x, z, y, p]) => window.__pp.pose(x, z, y, p), [move[0], move[1], move[2] ?? yaw, pitch]);
  if (b) await page.evaluate(b);
  await page.evaluate((s) => window.__pp.frames(s), frames);
  const B = await page.evaluate(() => window.__pp.grab());
  save(`${name}-a`, A); save(`${name}-b`, B);
  console.log(`[still] ${name}`);
}
// the noise floor: the same pose grabbed twice, 6 frames apart
await still('baseline', { at: [-125.8 + 40, -44], yaw: W });
// aliasing on thin things: 5 cm sideways in the wood, branches against the sky
await still('aliasing', { at: [-160, 140], yaw: W, pitch: 0.25, move: [-160, 140.05], frames: 3 });
// the adaptive pixel ratio's step (medium: 1.0 -> 0.9)
await still('dpr-step', { at: [-40, 22], yaw: 1.9, b: 'window.__fp.tier.setPixelRatio(0.9)', frames: 4 });
// first-sight uploads when panning in the wood (yaw 3.4 -> 3.7 at (-195, 128)): what enters the view
await still('wood-pan', { at: [-195, 128], yaw: 3.4, move: [-195, 128, 3.7], frames: 2 });
await browser.close();
