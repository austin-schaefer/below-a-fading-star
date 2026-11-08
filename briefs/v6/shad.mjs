const { chromium } = await import('/Users/user/dev/fading-planet/.claude/worktrees/v7-plan/prototypes/wilderness/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(300000);
await page.goto('http://localhost:8159/?q=medium&pos=-170,130&yaw=1.57', { waitUntil: 'load' });
await page.waitForFunction(() => document.body.classList.contains('ready'));
await page.evaluate(() => { document.getElementById('card')?.classList.add('hidden'); window.__fp.sky.flicker.next = 1e9; });
for (const [x, z] of [[-170, 130], [-140, 135], [2, 35], [-40, 22]]) {
  const r = await page.evaluate(async ([x, z]) => {
    const fp = window.__fp, p = fp.player; p.enabled = false; p.pos.x = x; p.pos.z = z; p.vel?.set(0, 0, 0);
    await new Promise((r) => setTimeout(r, 2000));
    const s = fp.shadowCadence.stats, r0 = s.redraws, d0 = s.dynamic, t0 = performance.now();
    await new Promise((r) => setTimeout(r, 8000));
    const near = fp.shadowCadence.casters.filter((c) => !c.far && c.want() && c.o.visible).map((c) => c.o.name || c.o.parent?.name || '?');
    return { x, z, perSec: +((s.redraws - r0) / ((performance.now() - t0) / 1000)).toFixed(1), dynamicPerSec: +((s.dynamic - d0) / 8).toFixed(1), nearCasters: s.near, names: [...new Set(near)].slice(0, 12) };
  }, [x, z]);
  console.log(JSON.stringify(r));
}
await browser.close();
