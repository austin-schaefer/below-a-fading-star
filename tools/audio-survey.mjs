#!/usr/bin/env node
// Audio survey (v7.2-00): renders every listening station in tools/audio-survey.json in sequence (one browser, one page
// a pose), measures each (tools/audio-metrics.mjs), and writes into --out: per pose <name>.wav, .json (the cue log),
// .metrics.json and .png (spectrogram); survey.md (pose x metric, a cell marked ! when out of its band and !! when that
// band is gated) and survey.json. With --baseline=<dir> (an earlier survey) the table shows before → after per cell and
// each pose's two spectrograms stacked in <name>.compare.png. Exit 1 only on a gated failure.
// Usage: node tools/audio-survey.mjs <base> [--out=shots/wip/audio/survey-<label>] [--only=moor-stand,fen-edge]
//        [--baseline=shots/wip/audio/survey-before] [--q=low] [--survey=tools/audio-survey.json] [--remeasure]
// --remeasure measures the WAVs already in --out again (after a change to the metrics) without rendering.
// A name in --only matches a pose exactly or as a prefix (--only=moor runs every moor pose).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launch, parseArgs, render } from './audio-render.mjs';
import { analyse, METRICS, spectrogramPanel, writeSpectrogram, headline, readWav, loadLog } from './audio-metrics.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export function loadSurvey(file = path.join(HERE, 'audio-survey.json')) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
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

export async function survey(base, { out, only = null, baseline = null, q = 'low', surveyFile, browser: given = null, log = console.log, remeasure = false } = {}) {
  const S = loadSurvey(surveyFile);
  const pick = only ? S.poses.filter((p) => only.some((o) => p.name === o || p.name.startsWith(o))) : S.poses;
  if (!pick.length) throw new Error(`no pose matches --only=${only}`);
  fs.mkdirSync(out, { recursive: true });
  const browser = given || (remeasure ? null : await launch()), rows = [];
  try {
    for (const p of pick) {
      const url = poseUrl(base, p, q), wav = path.join(out, p.name + '.wav'), t0 = Date.now();
      const row = { name: p.name, place: p.place, url, options: p.options, seconds: p.seconds, metrics: null, judged: {}, outOfBand: [], gatedFail: [] };
      try {
        const rl = remeasure && fs.existsSync(wav) ? JSON.parse(fs.readFileSync(wav.replace(/\.wav$/, '.json'), 'utf8')) : await render(browser, url, wav, { ...p.options, seconds: p.seconds }, { quiet: true });
        const A = analyse(wav);
        fs.writeFileSync(wav.replace(/\.wav$/, '.metrics.json'), JSON.stringify(A.m, null, 1));
        writeSpectrogram(wav.replace(/\.wav$/, '.png'), [spectrogramPanel(A.wav, { log: A.log, title: `${p.name}  ${headline(A.m)}` })]);
        row.metrics = A.m; row.events = rl.counts; row.gutter = rl.gutter; row.errors = rl.errors.length; row.pose = rl.pose;
      } catch (e) { row.error = e.message.split('\n')[0]; }
      for (const k of METRICS) {
        const j = row.metrics ? judge(row.metrics[k], p.bands[k]) : p.bands[k]?.gated ? 'gated' : null;
        row.judged[k] = j; if (j === 'out' || j === 'gated') row.outOfBand.push(k); if (j === 'gated') row.gatedFail.push(k);
      }
      if (row.error) row.gatedFail.push('render');
      rows.push(row);
      log(`${p.name.padEnd(15)} ${row.metrics ? headline(row.metrics) : 'FAILED ' + row.error}  ${row.gatedFail.length ? 'GATED FAIL ' + row.gatedFail.join(',') : 'gates ok'}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
  } finally { if (!given && browser) await browser.close(); }

  let baseRows = null;
  if (baseline) {
    try { baseRows = JSON.parse(fs.readFileSync(path.join(baseline, 'survey.json'), 'utf8')).poses; }
    catch (e) { log(`baseline ${baseline}: no survey.json (${e.message})`); }
    for (const r of rows) {
      const bw = path.join(baseline, r.name + '.wav'), aw = path.join(out, r.name + '.wav');
      if (!r.metrics || !fs.existsSync(bw)) continue;
      const B = readWav(bw), A = readWav(aw), bm = baseRows?.find((x) => x.name === r.name)?.metrics;
      writeSpectrogram(path.join(out, r.name + '.compare.png'), [spectrogramPanel(B, { log: loadLog(bw), title: `BEFORE ${r.name}  ${bm ? headline(bm) : ''}` }), spectrogramPanel(A, { log: loadLog(aw), title: `AFTER ${r.name}  ${headline(r.metrics)}` })]);
    }
  }
  let commit = null; try { commit = execSync('git rev-parse --short HEAD', { cwd: HERE }).toString().trim() + (execSync('git status --porcelain -- ../src', { cwd: HERE }).toString().trim() ? '+dirty src' : ''); } catch { /* not a checkout */ }
  const S2 = loadSurvey(surveyFile);
  const bands = `| pose | ${METRICS.join(' | ')} |\n|---|${METRICS.map(() => '---').join('|')}|\n` + pick.map((p) => `| ${p.name} | ${METRICS.map((k) => bandText(p.bands[k]) + (p.bands[k]?.gated ? ' (g)' : '')).join(' | ')} |`).join('\n');
  const failing = rows.filter((r) => r.gatedFail.length);
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
`;
  fs.writeFileSync(path.join(out, 'survey.md'), md);
  fs.writeFileSync(path.join(out, 'survey.json'), JSON.stringify({ base, q, commit, rendered: new Date().toISOString(), baseline, poses: rows.map(({ metrics, ...r }) => ({ ...r, metrics: metrics && Object.fromEntries(Object.entries(metrics).filter(([k]) => k !== 'detail')), detail: metrics?.detail && { seams: metrics.detail.seams, repeat: metrics.detail.repeat, rough_bands: metrics.detail.rough_bands, click_times: metrics.detail.click_times.slice(0, 40), onset_times: metrics.detail.onset_times, step_onsets: metrics.detail.step_onsets, steps_logged: metrics.detail.steps_logged } })) }, null, 1));
  log(`survey: ${path.join(out, 'survey.md')}; gated failures: ${failing.length ? failing.map((r) => `${r.name} (${r.gatedFail.join(',')})`).join('; ') : 'none'}`);
  return { rows, failing };
}

async function main() {
  const { o, pos } = parseArgs(process.argv.slice(2));
  if (!pos[0]) { console.error('usage: node tools/audio-survey.mjs <base> [--out=dir] [--only=a,b] [--baseline=dir] [--q=low]'); process.exit(2); }
  const out = typeof o.out === 'string' ? o.out : `shots/wip/audio/survey-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
  const { failing } = await survey(pos[0], { out, only: typeof o.only === 'string' ? o.only.split(',') : null, baseline: typeof o.baseline === 'string' ? o.baseline : null, q: typeof o.q === 'string' ? o.q : 'low', surveyFile: typeof o.survey === 'string' ? o.survey : undefined, remeasure: !!o.remeasure });
  process.exitCode = failing.length ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
