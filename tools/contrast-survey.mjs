#!/usr/bin/env node
// The contrast survey (v8-02): do the places look different? One page load; at a fixed pose in every region and
// place (and at six landmarks) it renders an eye-height frame and a frame pitched 30° down, each twice (the low
// plants shown and hidden), and measures from the drawn canvas:
//   L    mean luma of the frame (sRGB 0..1, Rec. 709)
//   S    mean saturation (HSV, 0..1)
//   hue  the dominant hue: the peak of a saturation-weighted hue histogram (15° bins, smoothed), in degrees
//   blades  the share of it that the low plants (grass, heather, bracken, flowers, reeds) cover:
//        pixels that change by more than 0.04 when they are hidden
// The gate: on the downward frames (the ground itself), at least GATE_N regions differ from the cropped common by
// the margin in at least two of the four numbers. Margins (MARGIN below): L 0.035, S 0.05, hue 20° (counted only
// where both frames are saturated enough, S >= 0.08, for the hue to mean something), blades 0.15.
// The wind is held (wind=0), the grain's clock pinned (postclock=0) and the sun's guttering held off, so two runs match.
//   node tools/contrast-survey.mjs [base=http://localhost:8123] [--q=medium] [--out=after] [--shots=after]
//   --out=<label>: writes briefs/v8/contrast/<label>.md. --shots=<stage>: saves every frame (plants shown) to
//   shots/wip/v8-02-<stage>-<place>-<eye|down>.png. Exits 1 if the gate fails.
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
const base = args.find((a) => !a.startsWith('--')) || process.env.FP_BASE || 'http://localhost:8123';
const q = opt.q || 'medium';
const W = 1280, H = 720;

// the poses: [name, x, z, yaw, kind]; kind 'common' is the reference, 'region' counts toward the gate
export const POSES = [
  ['common', -15, 50, 3.0, 'common'],           // the cropped moor south-west of the keep, looking south
  ['moor', -70, -95, -0.4, 'region'],           // the far moor north-west, between the court and the stones
  ['bletting', 185, -70, 1.2, 'region'],
  ['highLing', 262, -30, 3.0, 'region'],
  ['demesne', 40, -38, 1.3, 'region'],          // the lawn north of the keep, looking west along it
  ['lynchets', -180, -95, 0.59, 'region'],
  ['wood', -185, 118, 1.9, 'region'],      // toward the sun through the trunks
  ['fen', 40, 135, 2.6, 'region'],
  ['adust', -275, -15, 0.2, 'region'],
  ['saltings', 45, 246, 1.0, 'region'],
  ['outwash', 25, -192, -1.4, 'region'],
  ['strandline', -60, 166, 2.5, 'region'],
  ['house', 118, -70, 2.6, 'region'],          // the Pomegranate House's surroundings
  ['spawn', null, null, null, 'landmark'],
  ['stones', -150, -40, 1.4, 'landmark'],
  ['court', -40, -128, 0.1, 'landmark'],
  ['arcature', 140, 48, -1.3, 'landmark'],
  ['tower', -232, -120, 1.0, 'landmark'],
  ['graves', 40, 262, -1.2, 'landmark'],
];
export const MARGIN = { L: 0.035, S: 0.05, hue: 20, blades: 0.15 };
const GATE_N = 4;

const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.setDefaultTimeout(600000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}/?q=${q}&wind=0&postclock=0`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
await page.evaluate(() => {
  for (const id of ['card', 'place', 'hint']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  const fp = window.__fp; fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1;
});

const rows = [];
if (opt.shots) mkdirSync('shots/wip', { recursive: true });
for (const [name, px, pz, pyaw, kind] of POSES) {
  for (const [frame, pitch] of [['eye', -0.04], ['down', -Math.PI / 6]]) {
    await page.evaluate(({ px, pz, pyaw, pitch }) => {
      const fp = window.__fp, p = fp.player;
      const x = px ?? fp.spawn.x, z = pz ?? fp.spawn.z, yaw = pyaw ?? fp.spawn.yaw;
      p.pos.set(x, fp.terrain.heightAt(x, z) + p.eye, z);
      p.yaw = yaw; p.pitch = pitch; if (p.vel) p.vel.set(0, 0, 0);
    }, { px, pz, pyaw, pitch });
    await page.waitForTimeout(frame === 'eye' ? 3500 : 1500);
    const r = await page.evaluate(({ withUrl }) => {
      const fp = window.__fp, P = window.__vegPlants;
      const meshes = P ? P.kinds.flatMap((k) => [k.mesh, k.far?.mesh].filter(Boolean)) : [];
      const c2 = document.createElement('canvas'); c2.width = 320; c2.height = 180;
      const g = c2.getContext('2d', { willReadFrequently: true });
      const grab = () => {
        fp.renderer.shadowMap.needsUpdate = true; fp.post.composer.render();
        g.drawImage(document.getElementById('scene'), 0, 0, 320, 180);
        return g.getImageData(0, 0, 320, 180).data;
      };
      const on = grab();
      const url = withUrl ? document.getElementById('scene').toDataURL('image/png') : null;
      const vis = meshes.map((m) => m.visible);
      meshes.forEach((m) => { m.visible = false; });
      const off = grab();
      meshes.forEach((m, i) => { m.visible = vis[i]; });
      // the numbers
      let L = 0, S = 0, n = 0, cov = 0, low = 0;
      const hist = new Float64Array(24);
      for (let i = 0, p = 0; i < on.length; i += 4, p++) {
        if (p < 160 * 90) continue; // the lower half: the ground, at eye height and looking down
        const r = on[i] / 255, gg = on[i + 1] / 255, b = on[i + 2] / 255;
        const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), d = mx - mn;
        L += 0.2126 * r + 0.7152 * gg + 0.0722 * b;
        const s = mx > 0 ? d / mx : 0; S += s; n++;
        if (d > 0.02) {
          let h = mx === r ? ((gg - b) / d) % 6 : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4;
          h = (h * 60 + 360) % 360;
          hist[Math.floor(h / 15) % 24] += s * mx;
        }
        low++;
        const dd = Math.max(Math.abs(on[i] - off[i]), Math.abs(on[i + 1] - off[i + 1]), Math.abs(on[i + 2] - off[i + 2])) / 255;
        if (dd > 0.04) cov++;
      }
      let best = 0, bv = -1;
      for (let k = 0; k < 24; k++) { const v = hist[(k + 23) % 24] * 0.5 + hist[k] + hist[(k + 1) % 24] * 0.5; if (v > bv) { bv = v; best = k; } }
      const w = fp.regions.regionAt(fp.player.pos.x, fp.player.pos.z, {});
      return { L: L / n, S: S / n, hue: best * 15 + 7.5, blades: cov / low, url, primary: w.primary, x: fp.player.pos.x, z: fp.player.pos.z };
    }, { withUrl: !!opt.shots });
    if (opt.shots) {
      const f = `shots/wip/v8-02-${opt.shots}-${name}-${frame}.png`;
      writeFileSync(f, Buffer.from(r.url.split(',')[1], 'base64'));
    }
    rows.push({ name, kind, frame, L: +r.L.toFixed(3), S: +r.S.toFixed(3), hue: r.hue, blades: +r.blades.toFixed(3), primary: r.primary, pos: `${r.x.toFixed(0)},${r.z.toFixed(0)}` });
    console.log(`${name.padEnd(11)} ${frame.padEnd(4)} L ${r.L.toFixed(3)}  S ${r.S.toFixed(3)}  hue ${String(r.hue).padStart(5)}  blades ${r.blades.toFixed(3)}  (${r.primary})`);
  }
}
await browser.close();

// the gate, on the downward frames
const down = (nm) => rows.find((r) => r.name === nm && r.frame === 'down');
const ref = down('common');
const hd = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };
const diffs = rows.filter((r) => r.frame === 'down' && r.kind === 'region').map((r) => {
  const hueOk = r.S >= 0.08 && ref.S >= 0.08;
  const apart = [
    Math.abs(r.L - ref.L) >= MARGIN.L && 'L',
    Math.abs(r.S - ref.S) >= MARGIN.S && 'S',
    hueOk && hd(r.hue, ref.hue) >= MARGIN.hue && 'hue',
    Math.abs(r.blades - ref.blades) >= MARGIN.blades && 'blades',
  ].filter(Boolean);
  return { name: r.name, apart };
});
const passing = diffs.filter((d) => d.apart.length >= 2);
const ok = passing.length >= GATE_N && !errors.length;

if (opt.out) {
  mkdirSync('briefs/v8/contrast', { recursive: true });
  const lines = [
    `# Contrast survey: ${opt.out}`, '',
    `\`node tools/contrast-survey.mjs ${base} --q=${q}\`, ${new Date().toISOString().slice(0, 10)}. L mean luma, S mean saturation, hue the dominant hue (°), blades the share of the lower half covered by low plants. Margins against the cropped common's downward frame: L ${MARGIN.L}, S ${MARGIN.S}, hue ${MARGIN.hue}°, blades ${MARGIN.blades}.`, '',
    '| place | at | region | eye L | eye S | eye hue | eye blades | down L | down S | down hue | down blades | apart from common (down) |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const [name] of POSES) {
    const e = rows.find((r) => r.name === name && r.frame === 'eye'), d = down(name), df = diffs.find((x) => x.name === name);
    lines.push(`| ${name} | ${d.pos} | ${d.primary} | ${e.L} | ${e.S} | ${e.hue} | ${e.blades} | ${d.L} | ${d.S} | ${d.hue} | ${d.blades} | ${df ? (df.apart.join(', ') || 'none') : '-'} |`);
  }
  lines.push('', `Gate: ${passing.length} regions differ from the common in two or more numbers (needs ${GATE_N}): ${passing.map((p) => p.name).join(', ') || 'none'}. ${ok ? 'PASS' : 'FAIL'}.`, '');
  writeFileSync(`briefs/v8/contrast/${opt.out}.md`, lines.join('\n'));
}
console.log(`${passing.length >= GATE_N ? 'PASS' : 'FAIL'} contrast: ${passing.length} regions apart from the common in 2+ numbers (need ${GATE_N}): ${diffs.map((d) => `${d.name}[${d.apart.join('+')}]`).join(' ')}`);
console.log(`${errors.length ? 'FAIL' : 'PASS'} no page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
process.exit(ok ? 0 : 1);
