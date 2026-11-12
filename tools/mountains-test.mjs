#!/usr/bin/env node
// mountains-test (v11 M4): would have caught v10's wall, the ruled lines and the picket fins (plans/wilderness-v11.md).
//   node tools/mountains-test.mjs <base> [--self-check]
// Two parts, no judging by eye:
//   geometry: 72 radial profiles up the five massifs' faces (heightAt from 300 m out to crestAt, 1 m steps, the face
//     between 15 % and 90 % of the crest's height), clear of what is carved into the wall on purpose (CARVED: the
//     glacier's notch, the fall, the Span's abutments). Stepping: the face's angle along each profile, resampled at
//     1 m along the ground, its trend taken out (a 31 m running mean), autocorrelated at lags 8 to 25 m; the mean of
//     that curve over all 72 profiles must have no lag over STEP_AC (bedding repeats at one spacing on every face, so
//     its peak survives the mean; rock's relief does not). Fold (the fins' cause, a face pushed out further than its
//     own vertical wavelength): along a profile the ground climbs toward the crest; no more than FOLD_SHARE of the
//     profiles may dip over FOLD_DIP m below their running maximum, and no metre rises more than FOLD_RISE (a crag's
//     riser is steep; a fold's is steeper).
//   picture: high-y0 and high-y4 (tools/views-v11-mountains.json) rendered on low, two boxes of wall in each,
//     grey, smoothed 1 px and less its 15 px mean (the grain and the broad shading go); the share of that detail's
//     energy left in row means over 48 px strips: lines a ruler drew across a face survive the row mean, rock's
//     texture averages out. Fails over ROW_SHARE (mean of a frame's boxes). Frames to shots/wip/mountains-test-*.png.
// --self-check: the same measures fed v10: the geometry with v10's bedding (treads every 13-17 m on each massif's
// tilted plane, mixed at 60 %) and, apart, v10's ribs and bays (the face pushed 14 m by noise in its own chart), on
// today's heightfield; the picture on v11-00-before-high-y0/-y4.png (v10 at medium, the deploy worktree's
// shots/wip, or $MT_BEFORE) and on today's frames with ruled lines drawn in. Each must fail; the output says so.
// Exits 1 on any FAIL.
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
let pw;
try { pw = await import('playwright'); }
catch { pw = createRequire('/opt/node22/lib/node_modules/')('playwright'); }

const STEP_AC = 0.08, FOLD_DIP = 5, FOLD_SHARE = 0.1, FOLD_RISE = 30, ROW_SHARE = 0.1;
// bearings carved on purpose, where a profile dips or steps by design: the glacier's notch and its shoulder (to 38), the Span's east
// abutment and the fall (126-146), the Span's west abutment (226-234)
const CARVED = [[0, 38], [126, 146], [226, 234]];
const base = process.argv[2] || 'http://localhost:8123';
const self = process.argv.includes('--self-check');
const MAGICK = process.env.MAGICK || (spawnSync('magick', ['-version']).error ? '/opt/homebrew/bin/magick' : 'magick');
let fails = 0;
const say = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };

const browser = await pw.chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`${base}/?q=low&pos=0,0&yaw=0`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 300000 });

// ---------------------------------------------------------------- geometry
// mode: 'today', 'v10-beds' (v10's bedding on today's faces) or 'v10-ribs' (v10's ribs and bays)
const geometry = (mode) => page.evaluate(async ({ mode, CARVED }) => {
  const fp = window.__fp, M = await import('/src/v4/mountains.js'), N = await import('/src/noise.js'), W = await import('/src/world.js');
  const S = N.makeSimplex(W.WORLD.seed + 404), D2R = Math.PI / 180;
  // v10's MASSIFS: [first bearing, last bearing, dip dy/dx, dip dy/dz, ledge step m]
  const V10 = [[20, 100, 0.07, -0.06, 15], [125, 172, -0.05, -0.08, 17], [190, 235, 0.09, 0.03, 14], [264, 318, -0.04, 0.1, 16], [336, 356, 0.08, 0.05, 13]];
  const spans = [];
  for (const [b0, b1] of M.MASSIFS) {
    let a = b0 + 3;
    for (const [c0, c1] of CARVED) if (c1 > a && c0 < b1 - 3) { if (c0 > a) spans.push([a, c0]); a = Math.max(a, c1); }
    if (b1 - 3 > a) spans.push([a, b1 - 3]);
  }
  const total = spans.reduce((s, [a, b]) => s + b - a, 0), bearings = [];
  spans.forEach(([a, b]) => { const n = Math.max(1, Math.round(72 * (b - a) / total)); for (let k = 0; k < n; k++) bearings.push([a + (b - a) * (k + 0.5) / n, V10.find((m) => m[0] - 5 <= a && m[1] + 5 >= b)]); });
  const out = [];
  for (const [b, v10] of bearings.slice(0, 72)) {
    const c = fp.mountains.crestAt(b), az = (b - 90) * D2R, cx = Math.cos(az), cz = Math.sin(az);
    const H = (r) => fp.terrain.heightAt(cx * r, cz * r);
    const h = [];
    for (let r = 300; r <= c.r; r += 1) {
      let y = H(r);
      const u = (y / c.y - 0.15) / 0.75, face = u > 0 && u < 1 ? Math.min(1, u * 5, (1 - u) * 5) : 0;
      if (mode === 'v10-ribs' && face > 0) y = H(r + S.fbm2(az * c.r * 0.011 + 1.3, y * 0.011 - 2.1, 3) * 14 * face);
      if (mode === 'v10-beds' && face > 0) {
        const dip = cx * r * v10[2] + cz * r * v10[3], q = (y + dip) / v10[4], qf = Math.floor(q), t = q - qf;
        y += (((qf + t ** 4) * v10[4] - dip) - y) * 0.6 * face;
      }
      h.push(y);
    }
    // the face: from where the ground first passes 15 % of the crest's height to where it passes 90 %
    const i0 = h.findIndex((y) => y > 0.15 * c.y), i1 = h.findIndex((y) => y > 0.9 * c.y);
    if (i0 < 0 || i1 - i0 < 40) { out.push({ b, skip: true }); continue; }
    const f = h.slice(i0, i1 + 1);
    // the face's angle, resampled at 1 m along the ground (treads repeat along the slope, not along the radius)
    const ang = [], at = [0];
    for (let i = 1; i < f.length; i++) { ang.push(Math.atan(f[i] - f[i - 1])); at.push(at[i - 1] + Math.hypot(1, f[i] - f[i - 1])); }
    const n = Math.floor(at[at.length - 1]), s = new Float64Array(n);
    for (let k = 0, i = 0; k < n; k++) { while (at[i + 1] < k + 0.5) i++; s[k] = ang[i]; }
    const e = new Float64Array(n);
    for (let i = 0; i < n; i++) { let a = 0, k = 0; for (let j = Math.max(0, i - 15); j <= Math.min(n - 1, i + 15); j++) { a += s[j]; k++; } e[i] = s[i] - a / k; }
    let v0 = 0; for (let i = 0; i < n; i++) v0 += e[i] * e[i];
    const ac = []; for (let L = 7; L <= 26; L++) { let a = 0; for (let i = 0; i + L < n; i++) a += e[i] * e[i + L]; ac[L] = a / Math.max(1e-9, v0); }
    let peak = 0, lag = 0; for (let L = 8; L <= 25; L++) if (ac[L] > ac[L - 1] && ac[L] >= ac[L + 1] && ac[L] > peak) { peak = ac[L]; lag = L; }
    let run = -Infinity, dip = 0, rise = 0;
    for (let i = 0; i < f.length; i++) { run = Math.max(run, f[i]); dip = Math.max(dip, run - f[i]); if (i) rise = Math.max(rise, f[i] - f[i - 1]); }
    out.push({ b: +b.toFixed(1), n, peak: +peak.toFixed(3), lag, ac: ac.slice(8, 26).map((v) => +v.toFixed(3)), dip: +dip.toFixed(2), rise: +rise.toFixed(2) });
  }
  return out;
}, { mode, CARVED });

function judgeGeometry(rows, label) {
  const used = rows.filter((r) => !r.skip);
  const mean = used[0].ac.map((_, k) => used.reduce((a, r) => a + r.ac[k], 0) / used.length);
  const acMax = Math.max(...mean), acLag = 8 + mean.indexOf(acMax);
  const dipped = used.filter((r) => r.dip > FOLD_DIP), dipShare = dipped.length / used.length;
  const worstDip = used.reduce((a, r) => (r.dip > a.dip ? r : a), used[0]), worstRise = used.reduce((a, r) => (r.rise > a.rise ? r : a), used[0]);
  return {
    acMax, dipShare, worstRise, ok: { step: acMax <= STEP_AC, fold: dipShare <= FOLD_SHARE && worstRise.rise <= FOLD_RISE },
    text: `${label}: ${used.length} profiles (${rows.length - used.length} too short); mean autocorrelation of the face's angle peaks at ${acMax.toFixed(3)} at ${acLag} m (limit ${STEP_AC}); ${dipped.length} profiles dip over ${FOLD_DIP} m (share ${dipShare.toFixed(2)}, limit ${FOLD_SHARE}; deepest ${worstDip.dip} m at ${worstDip.b}°); steepest metre ${worstRise.rise} m at ${worstRise.b}° (limit ${FOLD_RISE})`,
  };
}

const gRows = await geometry('today');
if (process.env.MT_DEBUG) console.log(JSON.stringify(gRows));
const g = judgeGeometry(gRows, 'geometry');
console.log(g.text);
say(g.ok.step, `geometry: no periodic stepping up the faces (mean autocorrelation ${g.acMax.toFixed(3)} <= ${STEP_AC})`);
say(g.ok.fold, `geometry: no fold in the faces (share dipping over ${FOLD_DIP} m ${g.dipShare.toFixed(2)} <= ${FOLD_SHARE}, steepest metre ${g.worstRise.rise} <= ${FOLD_RISE} m)`);
if (self) {
  for (const mode of ['v10-beds', 'v10-ribs']) {
    const vRows = await geometry(mode);
    if (process.env.MT_DEBUG) console.log(JSON.stringify(vRows));
    const v = judgeGeometry(vRows, `self-check ${mode}`);
    console.log(v.text);
    const caught = mode === 'v10-beds' ? !v.ok.step : !v.ok.fold;
    say(caught, `self-check: the geometry test fails on ${mode} (${caught ? 'caught' : 'NOT caught'})`);
  }
}

// ---------------------------------------------------------------- picture
const VIEWS = [{ name: 'high-y0', x: 0, z: 0, yaw: 0, dy: 70 }, { name: 'high-y4', x: 0, z: 0, yaw: 4.19, dy: 70 }];
// boxes of wall (1280x720 coordinates) present in v10's frames and today's: the east and north-east faces in y0, the
// south-west and south faces in y4, clear of the sky, the Annals' frieze, the Span and the foreground
const BOXES = { 'high-y0': [[830, 190, 1270, 420], [380, 200, 600, 420]], 'high-y4': [[0, 100, 460, 400], [880, 180, 1270, 400]] };
const PW = 1088, PH = 612; // low's frame (pixel ratio 0.85); every frame is measured at this size
const shotDir = join(dirname(new URL(import.meta.url).pathname), '..', 'shots', 'wip');
mkdirSync(shotDir, { recursive: true });
await page.evaluate(() => { document.getElementById('card')?.classList.add('hidden'); for (const id of ['place', 'hint']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; } const fp = window.__fp; fp.sky.flicker.next = 1e9; fp.sky.flicker.phase = 0; fp.sky.flicker.value = 1; });
const frames = {};
for (const v of VIEWS) {
  await page.evaluate((v) => { const fp = window.__fp, p = fp.player; p.pos.set(v.x, fp.terrain.heightAt(v.x, v.z) + p.eye + v.dy, v.z); p.yaw = v.yaw; p.pitch = 0; if (p.vel) p.vel.set(0, 0, 0); }, v);
  await page.waitForTimeout(2500);
  const url = await page.evaluate((v) => {
    const fp = window.__fp;
    fp.player.pos.y = fp.terrain.heightAt(v.x, v.z) + fp.player.eye + v.dy; fp.camera.position.y = fp.player.pos.y;
    fp.renderer.shadowMap.needsUpdate = true; fp.post.composer.render();
    return document.getElementById('scene').toDataURL('image/png');
  }, v);
  frames[v.name] = join(shotDir, `mountains-test-${v.name}.png`);
  writeFileSync(frames[v.name], Buffer.from(url.split(',')[1], 'base64'));
}
await browser.close();

const gray = (f, lines = false) => {
  const a = [f, '-resize', `${PW}x${PH}!`, '-colorspace', 'Gray'];
  // the self-check's ruler: faint pale lines every 9 px, tilted 3°, as v10's treads read from 70 m up
  if (lines) a.push('-fill', 'rgba(255,255,255,0.12)', '-draw', Array.from({ length: 80 }, (_, i) => `line 0,${i * 9 - 30} ${PW},${i * 9 - 30 + PW * 0.05}`).join(' '));
  a.push('-depth', '8', 'gray:-');
  return Float64Array.from(execFileSync(MAGICK, a, { maxBuffer: 1 << 26 }));
};
const box = (g, k) => {
  const t = new Float64Array(g.length), o = new Float64Array(g.length);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { let s = 0, c = 0; for (let j = Math.max(0, x - k); j <= Math.min(PW - 1, x + k); j++) { s += g[y * PW + j]; c++; } t[y * PW + x] = s / c; }
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { let s = 0, c = 0; for (let j = Math.max(0, y - k); j <= Math.min(PH - 1, y + k); j++) { s += t[j * PW + x]; c++; } o[y * PW + x] = s / c; }
  return o;
};
function rowShare(g, name) {
  const lo = box(g, 1), bg = box(g, 7), hp = lo.map((v, i) => v - bg[i]), SW = 48;
  const shares = BOXES[name].map((b) => {
    const [x0, y0, x1, y1] = b.map((v) => Math.round(v * PW / 1280));
    let er = 0, ep = 0;
    for (let sx = x0; sx + SW <= x1; sx += SW) for (let y = y0; y < y1; y++) {
      let s = 0; for (let x = sx; x < sx + SW; x++) { s += hp[y * PW + x]; ep += hp[y * PW + x] ** 2; }
      er += (s / SW) ** 2 * SW;
    }
    return er / ep;
  });
  return { mean: shares.reduce((a, b) => a + b, 0) / shares.length, shares };
}
const fmt = (r) => `${r.mean.toFixed(3)} (boxes ${r.shares.map((s) => s.toFixed(3)).join(', ')})`;
for (const v of VIEWS) {
  const r = rowShare(gray(frames[v.name]), v.name);
  say(r.mean <= ROW_SHARE, `picture ${v.name}: horizontal-line share ${fmt(r)} <= ${ROW_SHARE} (${frames[v.name]})`);
}
if (self) {
  const repo = resolve(dirname(new URL(import.meta.url).pathname), '..');
  const common = execFileSync('git', ['-C', repo, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' }).trim();
  const beforeDir = process.env.MT_BEFORE || join(dirname(common), '.claude', 'worktrees', 'deploy', 'shots', 'wip');
  for (const v of VIEWS) {
    const f = join(beforeDir, `v11-00-before-${v.name}.png`);
    if (!existsSync(f)) { console.log(`self-check: ${f} is missing; the picture's calibration on v10's frames is unchecked (set MT_BEFORE)`); continue; }
    const r = rowShare(gray(f), v.name);
    say(r.mean > ROW_SHARE, `self-check: the picture test fails on v10's ${v.name}: share ${fmt(r)} (${r.mean > ROW_SHARE ? 'caught' : 'NOT caught'})`);
  }
  for (const v of VIEWS) {
    const r = rowShare(gray(frames[v.name], true), v.name);
    say(r.mean > ROW_SHARE, `self-check: the picture test fails on today's ${v.name} with ruled lines drawn in: share ${fmt(r)} (${r.mean > ROW_SHARE ? 'caught' : 'NOT caught'})`);
  }
}
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
