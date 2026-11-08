import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const { chromium } = await import('/Users/user/dev/fading-planet/.claude/worktrees/v7-plan/prototypes/wilderness/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(300000);
await page.goto('http://localhost:8159/?q=medium&pos=2,35&yaw=0', { waitUntil: 'load' });
await page.waitForFunction(() => document.body.classList.contains('ready'));
const r = await page.evaluate(() => {
  const fp = window.__fp, T = fp.THREE;
  const tb = fp.scene.getObjectByName('veg-trees');
  const trees = []; const m = new T.Matrix4(), p = new T.Vector3();
  const isB = tb.isBatchedMesh;
  const n = isB ? tb.instanceCount ?? tb._instanceInfo?.length : tb.inst.length;
  for (let i = 0; i < n; i++) {
    try { if (isB) tb.getMatrixAt(i, m); else m.copy(tb.inst[i].matrix); } catch { continue; }
    p.setFromMatrixPosition(m); trees.push([+p.x.toFixed(1), +p.z.toFixed(1), +(new T.Vector3().setFromMatrixScale(m).x).toFixed(2)]);
  }
  const src = fp.lightSlots.sources.map((s) => { s.updateWorldMatrix(true, false); const w = new T.Vector3().setFromMatrixPosition(s.matrixWorld); return { n: s.name || s.parent?.name || '?', x: +w.x.toFixed(1), y: +w.y.toFixed(1), z: +w.z.toFixed(1), d: s.distance, i: +s.intensity.toFixed(2) }; });
  // where more than 3 sources are within reach: grid every 4 m
  const over = [];
  for (let x = -400; x <= 400; x += 4) for (let z = -400; z <= 400; z += 4) {
    let c = 0; for (const s of src) { const r = (s.d > 0 ? s.d + 20 : 1e9); if (Math.hypot(s.x - x, s.z - z) < r) c++; }
    if (c > 3) over.push([x, z, c]);
  }
  const fungi = []; fp.scene.traverse((o) => { if (/veg-(toadstools|pods)/.test(o.name)) fungi.push(o.name); });
  return { batched: isB, nTrees: trees.length, trees, src, overCount: over.length, overMax: over.reduce((a, b) => Math.max(a, b[2]), 0), overSample: over.filter((_, i) => i % 25 === 0).slice(0, 60), fungiGroups: fungi.length,
    tb: { type: tb.type, isB, multi: !!fp.renderer.extensions.get('WEBGL_multi_draw') } };
});
writeFileSync(process.argv[2], JSON.stringify(r));
console.log(JSON.stringify({ ...r, trees: r.trees.length, src: r.src.length, srcList: r.src.slice(0, 80) }).slice(0, 6000));
await browser.close();
