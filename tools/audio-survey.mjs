#!/usr/bin/env node
// Audio survey (v7.2-00): renders the listening stations in tools/audio-survey.json in sequence, each on a page of its own
// (the world loads fresh for every pose: the default, and what tools/audio-survey.json's bands and the baselines were
// made with), measures each (tools/audio-metrics.mjs) and writes into --out: per pose <name>.wav, .json (the cue log),
// .metrics.json; survey.md (pose x metric, a cell marked ! when out of its band and !! when that band is gated; then
// each pose's band-energy table from tools/audio-bands.mjs, so balance and change over time read as text) and
// survey.json. No images unless --images (then <name>.png, a spectrogram, and with --baseline <name>.compare.png).
// With --baseline=<dir> (an earlier survey) the table shows before -> after per cell and the band table the change.
// Exit 1 only on a gated failure.
// Usage: node tools/audio-survey.mjs <base> [--out=shots/wip/audio/survey-<label>] [--poses=moor-stand,fen-edge]
//        [--baseline=shots/wip/audio/survey-before] [--q=low] [--survey=tools/audio-survey.json] [--remeasure]
//        [--images] [--one-page [--between=<s>]]
// --poses (alias --only) matches a pose exactly or as a prefix (--poses=moor runs every moor pose); a partial run into a
// directory that already holds a survey replaces those poses and keeps the rest.
// --one-page loads the world once and moves the player from pose to pose (the bed settles --between seconds, default 8,
// before each tap): about a quarter faster, but the sound is not the sound a fresh page gives. The audio's gusts, its
// schedulers and the world's creatures run on one clock from `begin`, so a pose later in the list meets a different stretch
// of that clock (the full-survey comparison: -4 to +4 dB lufs_i on 8 of 16 poses, rough 0.02 -> 0.25 at the wood). Numbers
// from --one-page compare with numbers from --one-page of the same --poses list in the same order, never with the
// baselines or the bands. The first pose of a page is exactly the fresh one.
// --remeasure measures the WAVs already in --out again (after a change to the metrics) without rendering.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launch, parseArgs, render, openSession, sessionFits, BETWEEN } from './audio-render.mjs';
import { analyse, measure, METRICS, spectrogramPanel, writeSpectrogram, headline, readWav, loadLog } from './audio-metrics.mjs';
import { bandTable, bandText as spectrumText } from './audio-bands.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export function loadSurvey(file = path.join(HERE, 'audio-survey.json')) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
// the pose a url's params name: { x, z, yaw, pitch } as controls.js reads pos=, yaw= and pitch=
export function poseOf(params) {
  const q = new URLSearchParams(params), [x, z] = (q.get('pos') || '0,0').split(',').map(Number);
  return { x, z, yaw: q.get('yaw') != null ? Number(q.get('yaw')) : undefined, pitch: q.get('pitch') != null ? Number(q.get('pitch')) : 0 };
}
export function poseUrl(base, pose, q = 'low') { return `${base.replace(/\/$/, '')}/?q=${q}&${pose.params}`; }

// one metric against its band: null (no band), 'ok', 'out' or 'gated'
export function judge(v, b) {
  if (!b) return null;
  let ok = true;
  if (b.none) ok = v == null;
  else {
    if (v == null) ok = b.min == null; // a missing number (no gaps to measure) passes only a max-only band
    else { if (b.min != null && v < b.min) ok = false; if (b.max != null && v > b.max) ok = false; }
  }
  return ok ? 'ok' : b.gated ? 'gated' : 'out';
}
const bandText = (b) => (!b ? '' : b.none ? 'none' : b.min != null && b.max != null ? `${b.min}…${b.max}` : b.min != null ? `≥ ${b.min}` : `≤ ${b.max}`);
const cell = (v) => (v == null ? '–' : String(v));
const mark = (j) => (j === 'gated' ? ' !!' : j === 'out' ? ' !' : '');

export function table(rows, baseRows = null) {
  const head = `| pose | ${METRICS.join(' | ')} |`, sep = `|---|${METRICS.map(() => '---').join('|')}|`;
  const lines = [head, sep];
  for (const r of rows) {
    const b = baseRows?.find((x) => x.name === r.name);
    const cells = METRICS.map((k) => {
      const j = r.judged[k], now = cell(r.metrics?.[k]) + mark(j);
      if (!b) return now;
      return `${cell(b.metrics?.[k])}${mark(b.judged?.[k])} → ${now}`;
    });
    lines.push(`| ${r.name}${r.error ? ' (failed: ' + r.error + ')' : ''} | ${cells.join(' | ')} |`);
  }
  return lines.join('\n');
}

// `modify`: { poseName: render options merged over that pose's } (the quality test taps a pose pre-limiter too);
// `again`: render the first pose a second time at the end of the same page (a determinism and no-carry-over check),
// returned as `againRow`. `images`: spectrograms. `onePage`: all poses on one page (see below).
export async function survey(base, { out, only = null, baseline = null, q = 'low', surveyFile, browser: given = null, log = console.log, remeasure = false, images = false, between = BETWEEN, onePage = false, modify = {}, again = false } = {}) {
  const S = loadSurvey(surveyFile);
  const pick = only ? S.poses.filter((p) => only.some((o) => p.name === o || p.name.startsWith(o))) : S.poses;
  if (!pick.length) throw new Error(`no pose matches --only=${only}`);
  fs.mkdirSync(out, { recursive: true });
  const browser = given || (remeasure ? null : await launch()), rows = [];
  let sess = null, againRow = null, sessN = 0;
  // one pose: render (or re-measure), analyse, judge. `name` is the file's name; `p` the pose it renders
  const one = async (p, name, extra = {}) => {
    const url = poseUrl(base, p, q), wav = path.join(out, name + '.wav'), t0 = Date.now();
    const row = { name, place: p.place, url, options: p.options, seconds: p.seconds, metrics: null, judged: {}, outOfBand: [], gatedFail: [] };
    try {
      const o = { ...p.options, seconds: p.seconds, ...(modify[p.name] || {}), ...extra };
      let rl;
      if (remeasure && fs.existsSync(wav)) rl = JSON.parse(fs.readFileSync(wav.replace(/\.wav$/, '.json'), 'utf8'));
      else if (!onePage || !sessionFits(o)) rl = await render(browser, url, wav, o, { quiet: true });
      else {
        if (!sess) sess = await openSession(browser, url, o);
        rl = await sess.capture(wav, { ...o, pose: sessN++ ? poseOf(p.params) : null, between }, { quiet: true });
      }
      // a pre-limiter render's survey numbers are the post-limiter tap of the same render
      const mf = rl.postFile ? path.join(out, rl.postFile) : wav, W = readWav(mf); W.file = mf;
      // the post tap of a --pre render is float: take it to 16 bits as a plain render's WAV is, or the clicks metric reads the sub-LSB tails of quiet sounds that 16 bits round away
      if (rl.postFile) W.ch = W.ch.map((c) => Float32Array.from(c, (v) => { const x = Math.max(-1, Math.min(1, v)); return Math.round(x < 0 ? x * 32768 : x * 32767) / 32768; }));
      const m = measure(W, { log: rl }), A = { wav: W, log: rl, m };
      const bt = bandTable(W);
      fs.writeFileSync(wav.replace(/\.wav$/, '.metrics.json'), JSON.stringify({ ...m, bands: bt }, null, 1));
      if (images) writeSpectrogram(wav.replace(/\.wav$/, '.png'), [spectrogramPanel(A.wav, { log: A.log, title: `${name}  ${headline(A.m)}` })]);
      row.metrics = A.m; row.bands = bt; row.events = rl.counts; row.gutter = rl.gutter; row.errors = rl.errors.length; row.pose = rl.pose; row.wavFile = path.basename(mf);
    } catch (e) { row.error = e.message.split('\n')[0]; }
    for (const k of METRICS) {
      const j = row.metrics ? judge(row.metrics[k], p.bands[k]) : p.bands[k]?.gated ? 'gated' : null;
      row.judged[k] = j; if (j === 'out' || j === 'gated') row.outOfBand.push(k); if (j === 'gated') row.gatedFail.push(k);
    }
    if (row.error) row.gatedFail.push('render');
    log(`${name.padEnd(15)} ${row.metrics ? headline(row.metrics) : 'FAILED ' + row.error}  ${row.gatedFail.length ? 'GATED FAIL ' + row.gatedFail.join(',') : 'gates ok'}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    if (row.bands && pick.length <= 4) log(spectrumText(row.bands, null, { indent: '    ' }));
    return row;
  };
  try {
    for (const p of pick) rows.push(await one(p, p.name));
    if (again && rows.find((r) => r.metrics)) { // the first pose that rendered, once more at the end of the page
      const first = pick.find((p) => p.name === rows.find((r) => r.metrics).name);
      againRow = await one(first, first.name + '-again');
    }
  } finally { if (sess) await sess.close(); if (!given && browser) await browser.close(); }

  // a partial run (--only) into a directory that holds a survey keeps that survey's other poses, in the survey's order
  if (only) {
    try {
      const prev = JSON.parse(fs.readFileSync(path.join(out, 'survey.json'), 'utf8')).poses.filter((r) => !rows.some((x) => x.name === r.name));
      if (prev.length) {
        for (const r of prev) r.metrics = r.metrics && { ...r.metrics, detail: r.detail };
        rows.push(...prev); rows.sort((a, b) => S.poses.findIndex((p) => p.name === a.name) - S.poses.findIndex((p) => p.name === b.name));
        log(`kept ${prev.length} poses from the survey already in ${out}`);
      }
    } catch { /* no survey there yet */ }
  }
  let baseRows = null;
  if (baseline) {
    try { baseRows = JSON.parse(fs.readFileSync(path.join(baseline, 'survey.json'), 'utf8')).poses; }
    catch (e) { log(`baseline ${baseline}: no survey.json (${e.message})`); }
    for (const r of rows) {
      const bw = path.join(baseline, r.name + '.wav'), aw = path.join(out, r.name + '.wav');
      if (!images || !r.metrics || !fs.existsSync(bw)) continue;
      const B = readWav(bw), A = readWav(aw), bm = baseRows?.find((x) => x.name === r.name)?.metrics;
      writeSpectrogram(path.join(out, r.name + '.compare.png'), [spectrogramPanel(B, { log: loadLog(bw), title: `BEFORE ${r.name}  ${bm ? headline(bm) : ''}` }), spectrogramPanel(A, { log: loadLog(aw), title: `AFTER ${r.name}  ${headline(r.metrics)}` })]);
    }
  }
  let commit = null; try { commit = execSync('git rev-parse --short HEAD', { cwd: HERE }).toString().trim() + (execSync('git status --porcelain -- ../src', { cwd: HERE }).toString().trim() ? '+dirty src' : ''); } catch { /* not a checkout */ }
  const S2 = loadSurvey(surveyFile);
  const shown = S2.poses.filter((p) => rows.some((r) => r.name === p.name));
  const bands = `| pose | ${METRICS.join(' | ')} |\n|---|${METRICS.map(() => '---').join('|')}|\n` + shown.map((p) => `| ${p.name} | ${METRICS.map((k) => bandText(p.bands[k]) + (p.bands[k]?.gated ? ' (g)' : '')).join(' | ')} |`).join('\n');
  const failing = rows.filter((r) => r.gatedFail.length);
  // each pose's band-energy table (dB re a full-scale sine, octave bands, a row a slice of the render); with a baseline the whole-render change
  const spectrum = rows.map((r) => {
    if (!r.bands) return `### ${r.name}\n\n(no render)`;
    let bb = baseRows?.find((x) => x.name === r.name)?.bands ?? null;
    if (!bb && baseline) { const f = path.join(baseline, r.name + '.wav'); if (fs.existsSync(f)) bb = bandTable(readWav(f)); }
    return `### ${r.name}\n\n\`\`\`\n${spectrumText(r.bands, bb)}\n\`\`\``;
  }).join('\n\n');
  const md = `# Audio survey${baseline ? ' (before → after)' : ''}

Rendered ${new Date().toISOString()} from \`${base}\` at q=${q}, commit ${commit ?? 'unknown'}, by \`tools/audio-survey.mjs\`${baseline ? `; baseline \`${baseline}\`` : ''}. ${rows.length} poses, ${S2.poses[0]?.seconds ?? 20} s each, post-limiter tap, volume 100.
A cell marked \`!\` is outside its band; \`!!\` is outside a gated band (the survey fails). \`–\` is no value (no seam; fewer than two onsets for gap_min).
\`onsets_pm\` and the gaps leave out the walker's own steps (the cue log's).

${table(rows, baseRows)}

**Gated failures:** ${failing.length ? failing.map((r) => `${r.name} (${r.gatedFail.join(', ')})`).join('; ') : 'none'}.

## Poses

${rows.map((r) => `- **${r.name}**: ${r.place}. \`${r.url}\`${Object.keys(r.options || {}).length ? ' ' + JSON.stringify(r.options) : ''}${r.events ? `; events ${JSON.stringify(r.events)}` : ''}${r.gutter && typeof r.gutter === 'object' && r.gutter.start != null ? `; gutter ${r.gutter.start.toFixed(1)}–${r.gutter.end != null ? r.gutter.end.toFixed(1) : '?'} s (floor at ${r.gutter.floor?.toFixed(1)} s)` : ''}${r.metrics?.seam_s ? `; seams ${r.metrics.detail.seams.map((s) => s.period + ' s').join(', ')}` : ''}`).join('\n')}

## Bands

(g) = gated.

${bands}

## Spectrum

Octave-band energy in dB (0 = a full-scale sine's power) over slices of the render; swing = loudest slice less quietest, per band${baseline ? '; vs before = the whole-render change from the baseline' : ''}.

${spectrum}
`;
  fs.writeFileSync(path.join(out, 'survey.md'), md);
  fs.writeFileSync(path.join(out, 'survey.json'), JSON.stringify({ base, q, commit, rendered: new Date().toISOString(), baseline, poses: rows.map(({ metrics, ...r }) => ({ ...r, metrics: metrics && Object.fromEntries(Object.entries(metrics).filter(([k]) => k !== 'detail')), detail: metrics?.detail && { seams: metrics.detail.seams, repeat: metrics.detail.repeat, rough_bands: metrics.detail.rough_bands, click_times: metrics.detail.click_times.slice(0, 40), onset_times: metrics.detail.onset_times, step_onsets: metrics.detail.step_onsets, steps_logged: metrics.detail.steps_logged } })) }, null, 1));
  log(`survey: ${path.join(out, 'survey.md')}; gated failures: ${failing.length ? failing.map((r) => `${r.name} (${r.gatedFail.join(',')})`).join('; ') : 'none'}`);
  return { rows, failing, againRow };
}

async function main() {
  const { o, pos } = parseArgs(process.argv.slice(2));
  if (!pos[0]) { console.error('usage: node tools/audio-survey.mjs <base> [--out=dir] [--poses=a,b] [--baseline=dir] [--q=low] [--images] [--one-page [--between=s]]'); process.exit(2); }
  const out = typeof o.out === 'string' ? o.out : `shots/wip/audio/survey-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
  const list = typeof o.poses === 'string' ? o.poses : typeof o.only === 'string' ? o.only : null;
  const { failing } = await survey(pos[0], { out, only: list ? list.split(',') : null, baseline: typeof o.baseline === 'string' ? o.baseline : null, q: typeof o.q === 'string' ? o.q : 'low', surveyFile: typeof o.survey === 'string' ? o.survey : undefined, remeasure: !!o.remeasure, images: !!o.images, onePage: !!o['one-page'], between: o.between != null ? Number(o.between) : BETWEEN });
  process.exitCode = failing.length ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
