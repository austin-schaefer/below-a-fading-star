#!/usr/bin/env node
// The music harness's text half (v9-M0): compose a track (src/audio/music/score.js) and judge its note list by
// arithmetic, in milliseconds, with no browser and no sound. The gates and what each protects against are in the
// `music` skill (.agents/skills/music/SKILL.md).
//
//   node tools/music-score.mjs <track|all|path/to/track.js> [--roll] [--json] [--seed=n] [--from=s] [--to=s] [--res=s]
//
// <track> is a file in src/audio/music/tracks/ by name; `all` judges every one there and the distance between each
// pair. --roll prints an ASCII piano roll (time across at --res seconds a column, default 0.5; pitch down; one
// letter at each onset, - or = while it sounds). Exit 1 on any FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compose, leadOf, modeOf, hz, pc, inSet, noteName, rough, PENTATONIC, ROUGH_OVERLAP, FLOOR_HZ } from '../src/audio/music/score.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const TRACKS = path.join(ROOT, 'src/audio/music/tracks');
const PHRASE_GAP = 2; // seconds of silence in the lead that end a phrase
const cents = (a, b) => 1200 * Math.log2(b / a);
const ENDS = [1, 3 / 2]; // D and A

// the gates: [key, label, test(value), band as text]
export const GATES = [
  ['valid', 'events well formed', (v) => v === 0, '0 bad'],
  ['determinism', 'same seed, same list', (v) => v === true, 'equal'],
  ['length', 'length s', (v) => v >= 90 && v <= 180, '90-180'],
  ['inMode', 'pitches out of mode', (v) => v === 0, '0'],
  ['penta', 'lead pentatonic share', (v) => v >= 0.6, '>= 0.60'],
  ['endings', 'phrase ends on D or A', (v) => v >= 0.8, '>= 0.80'],
  ['steps', 'lead steps share', (v) => v >= 0.6, '>= 0.60'],
  ['maxLeap', 'lead widest leap c', (v) => v <= 1200, '<= 1200'],
  ['range', 'lead range c', (v) => v <= 1902, '<= 1902 (a 12th)'],
  ['density', 'lead notes a minute', (v) => v >= 4 && v <= 20, '4-20'],
  ['rest', 'lead rest share', (v) => v >= 0.3 && v <= 0.6, '0.30-0.60'],
  ['phraseLen', 'phrases outside 4-9 notes', (v) => v === 0, '0'],
  ['phraseRest', 'rests 2-4 s (blurred)', (v) => v === 0, '0'],
  ['phrases', 'lead phrases', (v) => v >= 4, '>= 4'],
  ['rough', 'rough pairs (8-70 Hz)', (v) => v === 0, '0'],
  ['low', `held under ${FLOOR_HZ} Hz`, (v) => v === 0, '0'],
  ['motif', 'motif return rate', (v) => v >= 0.2 && v <= 0.6, '0.20-0.60'],
  ['repeat16', '16-note runs repeated', (v) => v === 0, '0'],
  ['poly', 'polyphony', (v) => v >= 1 && v <= 6, '1-6'],
];
export const PAIR_MIN = 0.2; // two tracks must differ at least this much (distance(), 0..1)

export async function loadTrack(arg) {
  const file = arg.endsWith('.js') ? path.resolve(arg) : path.join(TRACKS, `${arg}.js`);
  const mod = await import(pathToFileURL(file).href);
  return mod.default;
}
export const trackNames = () => fs.readdirSync(TRACKS).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).sort();

// lead phrases: runs of notes separated by >= PHRASE_GAP s of silence
function phrasesOf(lead) {
  const out = [];
  let cur = [];
  for (const e of lead) {
    if (cur.length && e.t - (cur[cur.length - 1].t + cur[cur.length - 1].dur) >= PHRASE_GAP) { out.push(cur); cur = []; }
    cur.push(e);
  }
  if (cur.length) out.push(cur);
  return out;
}

// every metric the gates read, plus what the distance and the report need
export function measure(events, track) {
  const mode = modeOf(track), leadId = leadOf(track);
  const lead = events.filter((e) => e.voice === leadId);
  const m = { events: events.length, voices: track.voices.length, lead: leadId, length: track.length, bpm: track.bpm };
  let bad = 0, prevT = -Infinity;
  for (const e of events) {
    if (![e.t, e.dur, e.ratio, e.vel].every(Number.isFinite) || e.dur <= 0 || e.vel <= 0 || e.vel > 1 || e.t < prevT) bad++;
    prevT = e.t;
  }
  m.valid = bad;
  m.inMode = events.filter((e) => !inSet(e.ratio, mode)).length;
  m.low = events.filter((e) => hz(e.ratio) < FLOOR_HZ && e.dur >= 0.5).length;
  // roughness: every pair that sounds together long enough, by fundamentals
  const rp = [];
  for (let i = 0; i < events.length; i++) {
    const a = events[i];
    for (let j = i + 1; j < events.length && events[j].t < a.t + a.dur; j++) {
      const b = events[j], ov = Math.min(a.t + a.dur, b.t + b.dur) - b.t;
      if (ov >= ROUGH_OVERLAP && rough(hz(a.ratio), hz(b.ratio))) rp.push(`${a.t.toFixed(1)}s ${a.voice}:${noteName(a.ratio)}/${b.voice}:${noteName(b.ratio)}`);
    }
  }
  m.rough = rp.length; m.roughAt = rp.slice(0, 4);
  // polyphony: a sweep over onsets and ends
  const edges = events.flatMap((e) => [[e.t, 1], [e.t + e.dur, -1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let n = 0; m.poly = 0;
  for (const [, d] of edges) { n += d; m.poly = Math.max(m.poly, n); }
  // the lead
  const ph = phrasesOf(lead);
  m.phrases = ph.length;
  m.penta = lead.length ? lead.filter((e) => inSet(e.ratio, PENTATONIC)).length / lead.length : 0;
  m.endings = ph.length ? ph.filter((p) => inSet(p[p.length - 1].ratio, ENDS)).length / ph.length : 0;
  const within = ph.flatMap((p) => p.slice(1).map((e, i) => Math.abs(cents(p[i].ratio, e.ratio))));
  m.steps = within.length ? within.filter((c) => c <= 320).length / within.length : 0;
  m.maxLeap = lead.slice(1).reduce((mx, e, i) => Math.max(mx, Math.abs(cents(lead[i].ratio, e.ratio))), 0);
  m.range = lead.length ? cents(Math.min(...lead.map((e) => e.ratio)), Math.max(...lead.map((e) => e.ratio))) : 0;
  m.density = lead.length / (track.length / 60);
  if (lead.length) {
    const span = lead[lead.length - 1].t + lead[lead.length - 1].dur - lead[0].t;
    let sound = 0, end = -Infinity;
    for (const e of lead) { const s = Math.max(e.t, end), f = e.t + e.dur; if (f > s) sound += f - s; end = Math.max(end, f); }
    m.rest = 1 - sound / span;
  } else m.rest = 1;
  m.phraseSizes = ph.map((p) => p.length);
  m.phraseLen = ph.filter((p) => p.length < 4 || p.length > 9).length;
  const gaps = ph.slice(1).map((p, i) => p[0].t - (ph[i][ph[i].length - 1].t + ph[i][ph[i].length - 1].dur));
  m.phraseRest = gaps.filter((g) => g < 4).length;
  m.restMin = gaps.length ? Math.min(...gaps) : 0;
  // the motif: the 4-note figure (exact pitches) found in the most phrases
  const names = new Map(), key = (e) => { const k = e.ratio.toFixed(5); names.set(k, noteName(e.ratio)); return k; };
  const counts = new Map();
  for (const p of ph) {
    const seen = new Set();
    for (let i = 0; i + 4 <= p.length; i++) seen.add(p.slice(i, i + 4).map(key).join(' '));
    for (const k of seen) counts.set(k, (counts.get(k) || 0) + 1);
  }
  let best = null, bestN = 0;
  for (const [k, c] of counts) if (c > bestN) { best = k; bestN = c; }
  m.motif = bestN >= 2 ? bestN / ph.length : 0;
  m.motifFig = best && bestN >= 2 ? best.split(' ').map((k) => names.get(k)).join(' ') : '-';
  // exact repetition: any 16-note run (pitch and length) that occurs twice
  const seq = lead.map((e) => e.ratio.toFixed(5) + ':' + e.dur.toFixed(2)), runs = new Set();
  m.repeat16 = 0;
  for (let i = 0; i + 16 <= seq.length; i++) { const k = seq.slice(i, i + 16).join(','); if (runs.has(k)) m.repeat16++; runs.add(k); }
  // features for the distance between tracks
  const hist = (xs) => { const h = {}; for (const x of xs) h[x] = (h[x] || 0) + 1 / xs.length; return h; };
  m.pcHist = hist(lead.map((e) => noteName(pc(e.ratio)).replace(/\d+$/, '')));
  m.ivHist = hist(lead.slice(1).map((e, i) => Math.max(-12, Math.min(12, Math.round(cents(lead[i].ratio, e.ratio) / 100)))));
  m.register = lead.length ? lead.reduce((s, e) => s + Math.log2(e.ratio), 0) / lead.length : 0;
  m.modeKey = JSON.stringify(mode.map((r) => r.toFixed(4)));
  return m;
}

// 0..1: the mean of six differences (pitch classes, intervals, motif, tempo, mode, register). Two seeds of one track
// sit near 0.05; tracks must be PAIR_MIN apart.
export function distance(a, b) {
  const l1 = (x, y) => [...new Set([...Object.keys(x), ...Object.keys(y)])].reduce((s, k) => s + Math.abs((x[k] || 0) - (y[k] || 0)), 0) / 2;
  const terms = [l1(a.pcHist, b.pcHist), l1(a.ivHist, b.ivHist), a.motifFig === b.motifFig ? 0 : 1,
    Math.min(1, Math.abs(Math.log(a.bpm / b.bpm)) / Math.log(1.5)), a.modeKey === b.modeKey ? 0 : 1, Math.min(1, Math.abs(a.register - b.register))];
  return terms.reduce((s, x) => s + x, 0) / terms.length;
}

export function analyse(track, seed = track.seed ?? 1) {
  const t0 = performance.now();
  const events = compose(track, seed);
  const again = compose(track, seed);
  const m = measure(events, track);
  m.determinism = JSON.stringify(events) === JSON.stringify(again);
  m.seed = seed;
  const rows = GATES.map(([k, label, test, band]) => ({ key: k, label, value: m[k], band, pass: test(m[k]) }));
  m.ms = performance.now() - t0;
  return { events, m, rows, pass: rows.every((r) => r.pass) };
}

const fmt = (v) => (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : String(v));
export function table(name, { m, rows }) {
  const out = [`music-score ${name} (seed ${m.seed}): ${m.length} s, ${m.bpm} bpm, ${m.voices} voices, ${m.events} events, lead '${m.lead}', ${m.phrases} phrases [${m.phraseSizes.join(' ')}], shortest rest ${m.restMin.toFixed(1)} s, motif ${m.motifFig}`];
  for (const r of rows) {
    let line = `${r.pass ? 'PASS' : 'FAIL'} ${name} ${r.label.padEnd(27)} ${fmt(r.value).padStart(7)}   ${r.band}`;
    if (r.key === 'rough' && m.roughAt.length) line += `   e.g. ${m.roughAt.join(', ')}`;
    out.push(line);
  }
  const f = rows.filter((r) => !r.pass).length;
  out.push(`=== ${name}: ${rows.length - f} pass, ${f} fail (${m.ms.toFixed(0)} ms)`);
  return out.join('\n');
}

// the piano roll: one row a pitch used (high to low), one column `res` seconds, blocks of `width` columns
export function roll(events, track, { from = 0, to = track.length, res = 0.5, width = 80 } = {}) {
  const marks = {}, sustain = {}, rank = {};
  track.voices.forEach((v, i) => { marks[v.id] = (v.mark || v.id[0]).toUpperCase(); sustain[v.id] = v.gen === 'drone' ? '=' : '-'; rank[v.id] = i; });
  const lead = leadOf(track); if (lead) rank[lead] = 99; // the lead is drawn last, over the rest
  const ratios = [...new Set(events.map((e) => e.ratio))].sort((a, b) => b - a);
  const cols = Math.ceil((to - from) / res), grid = ratios.map(() => new Array(cols).fill(' '));
  const drawn = [...events].sort((a, b) => rank[a.voice] - rank[b.voice]);
  for (const e of drawn) {
    const row = grid[ratios.indexOf(e.ratio)];
    const c0 = Math.floor((e.t - from) / res), c1 = Math.ceil((e.t + e.dur - from) / res);
    for (let c = Math.max(0, c0); c < Math.min(cols, c1); c++) row[c] = c === c0 ? marks[e.voice] : sustain[e.voice];
  }
  const label = (r) => `${noteName(r).padEnd(4)}${hz(r).toFixed(0).padStart(5)}`;
  const out = [`roll ${track.name}: ${from}-${to} s, ${res} s a column; ` + track.voices.map((v) => `${marks[v.id]} ${v.id}`).join(', ')];
  for (let b = 0; b < cols; b += width) {
    const w = Math.min(width, cols - b);
    let ruler = ''.padEnd(10) + '|';
    for (let c = 0; c < w; c++) { const s = from + (b + c) * res; ruler += Math.abs(s / 10 - Math.round(s / 10)) < 1e-9 ? '|' : Math.abs(s / 5 - Math.round(s / 5)) < 1e-9 ? "'" : ' '; }
    const t0 = from + b * res;
    out.push(''.padEnd(11) + `${t0}s`.padEnd(w - 6) + `${(t0 + w * res)}s`);
    out.push(ruler);
    ratios.forEach((r, i) => out.push(`${label(r)} |${grid[i].slice(b, b + w).join('')}`));
  }
  return out.join('\n');
}

async function main() {
  const args = process.argv.slice(2), flag = (k) => args.includes(`--${k}`), opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
  const target = args.find((a) => !a.startsWith('--'));
  if (!target) { console.log('usage: node tools/music-score.mjs <track|all|path.js> [--roll] [--json] [--seed=n] [--from=s] [--to=s] [--res=s]'); process.exit(2); }
  const names = target === 'all' ? trackNames() : [target];
  const results = [];
  for (const n of names) {
    const track = await loadTrack(n), seed = opt('seed') ? +opt('seed') : undefined;
    const r = analyse(track, seed);
    results.push({ name: track.name || n, track, ...r });
  }
  const pairs = [];
  for (let i = 0; i < results.length; i++) for (let j = i + 1; j < results.length; j++) {
    const d = distance(results[i].m, results[j].m);
    pairs.push({ a: results[i].name, b: results[j].name, d, pass: d >= PAIR_MIN });
  }
  if (flag('json')) {
    console.log(JSON.stringify({ tracks: results.map(({ name, m, rows, pass, events }) => ({ name, pass, rows, metrics: m, events: flag('roll') ? events : undefined })), pairs }, null, 1));
  } else {
    for (const r of results) {
      console.log(table(r.name, r));
      if (flag('roll')) console.log(roll(r.events, r.track, { from: +(opt('from') ?? 0), to: +(opt('to') ?? r.track.length), res: +(opt('res') ?? 0.5) }));
    }
    for (const p of pairs) console.log(`${p.pass ? 'PASS' : 'FAIL'} distance ${p.a}/${p.b} ${p.d.toFixed(2)}   >= ${PAIR_MIN}`);
    if (target === 'all' && results.length < 2) console.log(`(${results.length} track: no pairs to compare)`);
  }
  process.exit(results.every((r) => r.pass) && pairs.every((p) => p.pass) ? 0 : 1);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
