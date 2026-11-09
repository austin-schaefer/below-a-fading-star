#!/usr/bin/env node
// Bloom-shape regression test (v6.2): feeds the page's own bloom pass synthetic inputs and measures what comes out,
// so a box-shaped bloom (the "square lights") cannot come back silently.
//   node tools/bloom-test.mjs [base=http://localhost:8123] [q=medium]     (FP_BROWSER=webkit|firefox for those engines)
// Each input is a black half-float frame the size of the scene target, run through post.bloom's bright pass, mips
// and composite; the composite (the texture the finish adds to the scene) is read back.
//   point:  a 4×4 pixel light at 16 (the cap), one bright-pass texel. A separable box is anisotropic: at the same distance from the centre the
//           diagonal stays bright after the axis has fallen. Gate: |diagonal - axis| over radii 2..40 texels, at
//           most 0.06 of the response's peak (three's kernel: 0.46).
//   line:   a line one pixel wide at 8, slanted 1 in 12, across the frame. Taken by one tap in four rows, it enters
//           the blur as dots and comes out as a row of blobs. Gate: the ridge along the line varies (max/min)
//           by at most 1.25 (one tap: 6.6).
//   flat:   a 64×64 pixel square at 4, to check the bloom's overall energy against the old path (reported).
// Every load runs the default; the old path (?bloomkernel=box&bloomprefilter=0) is measured too and reported,
// and must fail both gates (otherwise the test is not measuring anything). Exit 1 on any gated failure.
import { createRequire } from 'node:module';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const engine = process.env.FP_BROWSER || 'chromium';
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const q = process.argv[3] || 'medium';
const ANISO_MAX = 0.06, RIPPLE_MAX = 1.25;

const browser = await pw[engine].launch(engine !== 'chromium' ? {} : { args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function measure(extra) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(600000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/?q=${q}&only=water&adapt=0&dpr=1${extra}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });
  const res = await page.evaluate(() => {
    const fp = window.__fp, T = fp.THREE, renderer = fp.renderer, bloom = fp.post.bloom;
    const src = fp.post.composer.readBuffer, W = src.width, H = src.height;
    const toHalf = T.DataUtils.toHalfFloat, fromHalf = T.DataUtils.fromHalfFloat;
    function run(paint) {
      const data = new Uint16Array(W * H * 4);
      const zero = toHalf(0), one = toHalf(1);
      for (let i = 0; i < W * H; i++) { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = zero; data[i * 4 + 3] = one; }
      paint((x, y, v) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4, h = toHalf(v); data[i] = data[i + 1] = data[i + 2] = h; });
      const tex = new T.DataTexture(data, W, H, T.RGBAFormat, T.HalfFloatType);
      tex.minFilter = tex.magFilter = T.LinearFilter; tex.needsUpdate = true;
      const old = renderer.getRenderTarget();
      bloom.render(renderer, null, { texture: tex }, 0, false);
      const out = bloom.renderTargetsHorizontal[0], w = out.width, h = out.height;
      const buf = new Uint16Array(w * h * 4);
      renderer.readRenderTargetPixels(out, 0, 0, w, h, buf);
      renderer.setRenderTarget(old);
      tex.dispose();
      const L = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) L[i] = fromHalf(buf[i * 4 + 1]); // green: the inputs are grey
      return { L, w, h, sx: w / W, sy: h / H };
    }
    // bilinear read of the composite at a point in its own texel space
    const at = (r, x, y) => {
      const x0 = Math.floor(x - 0.5), y0 = Math.floor(y - 0.5), fx = x - 0.5 - x0, fy = y - 0.5 - y0;
      const g = (i, j) => r.L[Math.min(r.h - 1, Math.max(0, j)) * r.w + Math.min(r.w - 1, Math.max(0, i))];
      return (g(x0, y0) * (1 - fx) + g(x0 + 1, y0) * fx) * (1 - fy) + (g(x0, y0 + 1) * (1 - fx) + g(x0 + 1, y0 + 1) * fx) * fy;
    };
    // point: one bright pixel; compare the response along the four axes and the four diagonals
    const px = 4 * Math.round(W / 8), py = 4 * Math.round(H / 8);
    const P = run((set) => { for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) set(px + i, py + j, 16); });
    const cx = (px + 2) * P.sx, cy = (py + 2) * P.sy;
    let peak = 0;
    for (const v of P.L) peak = Math.max(peak, v);
    let aniso = 0, worstR = 0;
    for (let r = 2; r <= 40; r += 0.5) {
      const d = r / Math.SQRT2;
      const ax = (at(P, cx + r, cy) + at(P, cx - r, cy) + at(P, cx, cy + r) + at(P, cx, cy - r)) / 4;
      const dg = (at(P, cx + d, cy + d) + at(P, cx - d, cy + d) + at(P, cx + d, cy - d) + at(P, cx - d, cy - d)) / 4;
      const a = Math.abs(dg - ax) / peak;
      if (a > aniso) { aniso = a; worstR = r; }
    }
    // line: one pixel wide, 1 in 12, across the middle half of the frame
    const Lr = run((set) => { for (let x = Math.round(W * 0.25); x < Math.round(W * 0.75); x++) set(x, Math.round(H * 0.4 + x / 12), 8); });
    const ridge = [];
    for (let X = Math.ceil(Lr.w * 0.32); X < Math.floor(Lr.w * 0.68); X++) {
      let m = 0;
      for (let Y = 0; Y < Lr.h; Y++) m = Math.max(m, Lr.L[Y * Lr.w + X]);
      ridge.push(m);
    }
    const ripple = Math.max(...ridge) / Math.max(1e-6, Math.min(...ridge));
    // flat: total energy of the bloom of a 64 px square
    const F = run((set) => { for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) set(px - 32 + x, py - 32 + y, 4); });
    let energy = 0;
    for (const v of F.L) energy += v;
    energy /= F.sx * F.sy * 64 * 64 * 4;
    return { W, H, comp: [P.w, P.h], peak, aniso, worstR, ripple, energy };
  });
  await page.close();
  return { ...res, errors };
}

const fmt = (r) => `peak ${r.peak.toFixed(4)}, anisotropy ${r.aniso.toFixed(3)} (at r ${r.worstR}), line ripple ${r.ripple.toFixed(2)}, energy ${r.energy.toFixed(4)}`;
const now = await measure('');
const old = await measure('&bloomkernel=box&bloomprefilter=0');
await browser.close();
console.log(`[bloom-test] ${engine} q=${q}: scene ${now.W}×${now.H}, composite ${now.comp.join('×')}`);
console.log(`  default: ${fmt(now)}`);
console.log(`  old (?bloomkernel=box&bloomprefilter=0): ${fmt(old)}`);
const checks = [
  ['no page errors', now.errors.length === 0 && old.errors.length === 0, [...now.errors, ...old.errors].join('; ')],
  [`point is round: anisotropy ${now.aniso.toFixed(3)} <= ${ANISO_MAX}`, now.aniso <= ANISO_MAX],
  [`line is a line: ripple ${now.ripple.toFixed(2)} <= ${RIPPLE_MAX}`, now.ripple <= RIPPLE_MAX],
  [`the old path is caught: anisotropy ${old.aniso.toFixed(3)} > ${ANISO_MAX}`, old.aniso > ANISO_MAX],
  [`the old path is caught: ripple ${old.ripple.toFixed(2)} > ${RIPPLE_MAX}`, old.ripple > RIPPLE_MAX],
  [`energy within 25% of the old path (${(now.energy / old.energy).toFixed(2)})`, Math.abs(now.energy / old.energy - 1) <= 0.25],
];
let fail = 0;
for (const [name, ok, note] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok && note ? ` (${note})` : ''}`); if (!ok) fail++; }
console.log(`${checks.length - fail}/${checks.length} passed`);
process.exit(fail ? 1 : 0);
