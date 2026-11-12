#!/usr/bin/env node
// The music harness's one audio check (v9-M1): render a track through the real patches and player offline and meter it.
// A blank headless page (no server, no world: the modules are served from this checkout by page.route), an
// OfflineAudioContext the track's length, the stem straight into its destination (no bus, no reverb: those are the
// director's, v9-M2), rendered faster than real time. Prints the stem's loudness, peak, clicks, sharpness and roughness
// (the meters of tools/audio-metrics.mjs), a text band-energy table and PASS/FAIL lines; --wav writes
// shots/wip/music-<track>.wav (gitignored) at the stem's level and shots/wip/music/<track>-listen.wav, the same gained
// to a -6 dBFS peak, for the owner's ear. The bands and what each number means: the `music` skill.
//
//   node tools/music-render.mjs <track|all|path/to/track.js> [--wav] [--q=low] [--seed=n] [--patches=fixture.js] [--solo=voice,...] [--json]
//
// --patches serves a fixture module in place of src/audio/music/patches.js (it imports the real one as
// /src/audio/music/patches.js?real and swaps a patch for a broken one: tools/music-fixtures/patches-*.js), to show the
// gates catch a bad patch. --solo renders only those voices of the track (to find which one a number comes from). Exit 1 on any FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, parseArgs } from './audio-render.mjs';
import { measure, writeWav } from './audio-metrics.mjs';
import { musicRough, selfTest } from './music-metrics.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TRACKS = path.join(ROOT, 'src/audio/music/tracks');
const HOST = 'http://music.local';
const SR = 48000;
const MUSIC_ROUGH_MAX = 0.15;

// [key, label, test, band]
export const GATES = [
  ['lufs_i', 'loudness LUFS', (v) => v != null && v >= -38 && v <= -32, '-38 to -32'],
  ['peak_dbfs', 'peak dBFS', (v) => v <= -12, '<= -12'],
  ['clicks', 'clicks', (v) => v === 0, '0'],
  ['sharp_db', 'sharp_db (2-5 kHz)', (v) => v != null && v < -16, '< -16'],
  ['music_rough', 'rough (partials, tools/music-metrics.mjs)', (v) => v < MUSIC_ROUGH_MAX, `< ${MUSIC_ROUGH_MAX}`],
  ['dropped', 'notes without a voice', (v) => v === 0, '0'],
];
const BANDS = [[20, 140, 'sub (the bed)'], [140, 300, 'D3-D4 (pad)'], [300, 600, 'D4-D5 (lead)'], [600, 1200, 'D5-D6 (wind)'], [1200, 2000, '1.2-2k'], [2000, 5000, '2-5k (sharp)'], [5000, 20000, 'over 5k']];

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a), h = len >> 1;
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < h; k++) { const p = i + k, q = p + h, tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr; re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
  }
}
// each band's share of the energy (dB re the whole), from 4096-point Hann frames every 4096 samples
export function bandTable(ch, sr) {
  const N = 4096, n = ch[0].length, w = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
  const E = new Float64Array(BANDS.length), re = new Float64Array(N), im = new Float64Array(N);
  for (let o = 0; o + N <= n; o += N) {
    for (let i = 0; i < N; i++) { let s = 0; for (const c of ch) s += c[o + i]; re[i] = s / ch.length * w[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 1; k < N / 2; k++) { const f = k * sr / N, p = re[k] * re[k] + im[k] * im[k]; const b = BANDS.findIndex(([lo, hi]) => f >= lo && f < hi); if (b >= 0) E[b] += p; }
  }
  const tot = E.reduce((a, b) => a + b, 0) || 1;
  return BANDS.map(([lo, hi, name], i) => ({ lo, hi, name, db: +(10 * Math.log10(Math.max(E[i] / tot, 1e-12))).toFixed(1) }));
}

const blank = '<!doctype html><meta charset="utf-8"><title>music render</title><body></body>';
const mime = (f) => (f.endsWith('.js') || f.endsWith('.mjs') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream');

// the page's rendered channels (window[key]), in chunks, as base64 float32
async function pull(page, key, frames) {
  const ch = [new Float32Array(frames), new Float32Array(frames)], STEP = 1 << 18;
  for (let c = 0; c < 2; c++) for (let off = 0; off < frames; off += STEP) {
    const b64 = await page.evaluate(({ key, c, off, STEP }) => {
      const a = window[key][c].subarray(off, off + STEP), u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
      let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
      return btoa(s);
    }, { key, c, off, STEP });
    const bytes = Buffer.from(b64, 'base64');
    ch[c].set(new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4), off);
  }
  return ch;
}

async function renderTrack(page, file, o) {
  const url = `${HOST}/${path.relative(ROOT, file).split(path.sep).join('/')}`;
  const info = await page.evaluate(async ({ url, quality, seed, sr, solo }) => {
    const S = await import('/src/audio/music/score.js'), P = await import('/src/audio/music/player.js');
    const track = (await import(url)).default;
    let events = S.compose(track, seed ?? track.seed);
    if (solo) events = events.filter((e) => solo.includes(e.voice));
    const plan = P.allocate(events, track.voices);
    const frames = Math.ceil((plan.length + 0.5) * sr);
    const ac = new OfflineAudioContext(2, frames, sr);
    const h = P.play(events, { ac, dest: ac.destination, voices: track.voices, at: 0, quality });
    const t0 = performance.now();
    const buf = await ac.startRendering();
    window.__buf = [buf.getChannelData(0), buf.getChannelData(1)];
    return { name: track.name, sr, frames, seconds: frames / sr, plan: h.plan, dropped: h.dropped, stolen: h.stolen, events: events.length, ms: Math.round(performance.now() - t0), ended: h.ended };
  }, { url, quality: o.q || 'high', seed: o.seed != null ? Number(o.seed) : null, sr: SR, solo: o.solo ? String(o.solo).split(',') : null });
  const ch = await pull(page, '__buf', info.frames);
  return { info, ch };
}

// Interruptible at any moment: the first 70 s again, ducked to 0.4 at 30 s (fadeTo over 2 s) and stopped at 61.3 s
// (inside a melody note, an organ note and a pad chord on the moor) with the director's 1.5 s fade, the context
// suspended at those times to call the player as the director would. Judged: no clicks, silence after the fade, ended.
const DUCK_AT = 30, STOP_AT = 61.3, CUT_LEN = 70;
async function interruptCheck(page, file, o) {
  const url = `${HOST}/${path.relative(ROOT, file).split(path.sep).join('/')}`;
  const r = await page.evaluate(async ({ url, quality, sr, DUCK_AT, STOP_AT, CUT_LEN }) => {
    const S = await import('/src/audio/music/score.js'), P = await import('/src/audio/music/player.js');
    const track = (await import(url)).default;
    const ac = new OfflineAudioContext(2, Math.ceil(CUT_LEN * sr), sr);
    const h = P.play(S.compose(track), { ac, dest: ac.destination, voices: track.voices, at: 0, quality });
    let stopped = null;
    ac.suspend(DUCK_AT).then(() => { h.fadeTo(0.4, 2); ac.resume(); });
    ac.suspend(STOP_AT).then(() => { stopped = h.stop(1.5); ac.resume(); });
    const buf = await ac.startRendering();
    await Promise.race([stopped, new Promise((res) => setTimeout(res, 2000))]);
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    let tail = 0; for (let i = Math.ceil((STOP_AT + 1.6) * sr); i < L.length; i++) tail = Math.max(tail, Math.abs(L[i]), Math.abs(R[i]));
    window.__cut = [L, R];
    return { frames: L.length, tail, ended: h.ended, playing: h.playing };
  }, { url, quality: o.q || 'high', sr: SR, DUCK_AT, STOP_AT, CUT_LEN });
  const f = await pull(page, '__cut', r.frames);
  const m = measure({ sr: SR, ch: f, frames: r.frames });
  const pk = 10 ** (m.peak_dbfs / 20), k = pk > 0 ? 10 ** (-6 / 20) / pk : 1;
  const mc = measure({ sr: SR, ch: f.map((c) => c.map((v) => v * k)), frames: r.frames });
  return { ...r, clicks: mc.clicks, tail_db: r.tail > 0 ? +(20 * Math.log10(r.tail)).toFixed(1) : -Infinity };
}

// The live path once (an AudioContext, the one timer, the 2 s lookahead): 3 s of the track, then stop(0.5).
async function liveCheck(page, file) {
  const url = `${HOST}/${path.relative(ROOT, file).split(path.sep).join('/')}`;
  return page.evaluate(async ({ url }) => {
    const S = await import('/src/audio/music/score.js'), P = await import('/src/audio/music/player.js');
    const track = (await import(url)).default;
    const ac = new AudioContext(); await ac.resume();
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const h = P.play(S.compose(track), { ac, dest: ac.destination, voices: track.voices });
    await sleep(3000);
    const mid = { t: +h.t.toFixed(2), playing: h.playing };
    const t0 = performance.now();
    await Promise.race([h.stop(0.5), sleep(3000)]);
    const out = { mid, stopMs: Math.round(performance.now() - t0), ended: h.ended, playing: h.playing, state: ac.state };
    await ac.close();
    return out;
  }, { url });
}

function report(name, info, m, bands, wavPath) {
  const out = [];
  const plan = Object.entries(info.plan).map(([k, v]) => `${k} ${v}`).join(', ');
  out.push(`${name}: ${info.seconds.toFixed(1)} s, ${info.events} notes, voices ${plan}${info.stolen ? ` (${info.stolen} stolen)` : ''}; rendered in ${(info.ms / 1000).toFixed(1)} s (${(info.seconds / (info.ms / 1000)).toFixed(0)}x real time)`);
  out.push(`  loudness ${m.lufs_i} LUFS (short-term max ${m.lufs_s_max}, range ${m.lra} LU)  peak ${m.peak_dbfs} dBFS  crest ${m.crest_db} dB  centroid ${m.centroid_hz} Hz`);
  out.push(`  rough ${m.music_rough} (partials; p95 ${m.music_rough_p95}, roughest at ${m.music_rough_worst} s)  bed meter's rough ${m.rough} (shown, not gated: it reads chords as rough)`);
  out.push(`  sharp_db ${m.sharp_db}  hf_db ${m.hf_db}  clicks ${m.clicks} (at a -6 dBFS peak)  silence ${m.silence_pct} %`);
  out.push('  band energy (dB re the whole)');
  for (const b of bands) out.push(`    ${b.name.padEnd(16)} ${String(b.db).padStart(6)}  ${'#'.repeat(Math.max(0, Math.round((b.db + 60) / 2)))}`);
  out.push(`  rough by band: ${m.detail.rough_bands.map((b) => `${b.band_hz} ${b.rough}${b.strongest_hz ? '@' + b.strongest_hz : ''} (${b.share})`).join(', ')}`);
  out.push(`  candidates ${m.detail.candidates}`);
  if (m.detail.click_times.length) out.push(`  seams ${JSON.stringify(m.detail.seams)} of ${m.detail.candidates} candidates; click times: ${m.detail.click_times.slice(0, 8).map((c) => `${c.t}s x${c.ratio}`).join(', ')}`);
  if (wavPath) out.push(`  wav: ${wavPath}`);
  let fail = 0;
  const vals = { ...m, dropped: info.dropped };
  for (const [k, label, test, band] of GATES) {
    const ok = test(vals[k]); if (!ok) fail++;
    out.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${label}: ${vals[k]} (${band})`);
  }
  return { text: out.join('\n'), fail };
}

async function main() {
  const { o, pos } = parseArgs(process.argv.slice(2));
  const which = pos[0] || 'all';
  const files = which === 'all' ? fs.readdirSync(TRACKS).filter((f) => f.endsWith('.js')).sort().map((f) => path.join(TRACKS, f))
    : [fs.existsSync(which) ? path.resolve(which) : path.join(TRACKS, `${which}.js`)];
  for (const f of files) if (!fs.existsSync(f)) { console.error(`no track ${f}`); process.exit(2); }
  const fixture = o.patches ? path.resolve(String(o.patches)) : null;

  const browser = await launch();
  let fail = 0; const results = [];
  if (selfTest()) fail++;
  try {
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.error('page error:', e.message));
    await page.route(`${HOST}/**`, async (route) => {
      const u = new URL(route.request().url());
      if (u.pathname === '/' || u.pathname === '/index.html') return route.fulfill({ status: 200, contentType: 'text/html', body: blank });
      let file = path.join(ROOT, decodeURIComponent(u.pathname));
      if (fixture && u.pathname === '/src/audio/music/patches.js' && !u.searchParams.has('real')) file = fixture;
      if (!file.startsWith(ROOT) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
      return route.fulfill({ status: 200, contentType: mime(file), body: fs.readFileSync(file) });
    });
    await page.goto(`${HOST}/`);
    for (const f of files) {
      const { info, ch } = await renderTrack(page, f, o);
      const name = fixture ? `${info.name}+${path.basename(fixture, '.js')}` : info.name;
      const m = measure({ sr: info.sr, ch, frames: info.frames });
      // clicks are judged on a copy raised to a -6 dBFS peak: the detector has an absolute floor, and a click too quiet
      // to count in the bare stem is still a click once the bus and the master bring the music up
      const pk = 10 ** (m.peak_dbfs / 20), k = pk > 0 ? 10 ** (-6 / 20) / pk : 1;
      const loud = ch.map((c) => c.map((v) => v * k));
      const mc = measure({ sr: info.sr, ch: loud, frames: info.frames });
      m.clicks = mc.clicks; m.detail.click_times = mc.detail.click_times; m.seam_s = mc.seam_s; m.detail.seams = mc.detail.seams; m.detail.candidates = mc.detail.candidates;
      const mr = musicRough(ch, info.sr); m.music_rough = mr.rough; m.music_rough_p95 = mr.p95; m.music_rough_worst = mr.worst_t;
      const bands = bandTable(ch, info.sr);
      let wavPath = null;
      let listenPath = null;
      if (o.wav) {
        wavPath = path.join(ROOT, 'shots/wip', `music-${name}.wav`); writeWav(wavPath, ch, info.sr);
        // the listening copy: the same audio gained to a -6 dBFS peak (the stem alone is too quiet to audition)
        listenPath = path.join(ROOT, 'shots/wip/music', `${name}-listen.wav`); writeWav(listenPath, loud, info.sr);
      }
      const r = report(name, info, m, bands, wavPath && `${wavPath}\n  listen: ${listenPath} (gained ${(20 * Math.log10(k)).toFixed(1)} dB to a -6 dBFS peak)`);
      console.log(r.text);
      fail += r.fail;
      if (!o.solo) {
        const c = await interruptCheck(page, f, o);
        const lines = [
          [c.clicks === 0, `ducked at ${DUCK_AT} s and stopped at ${STOP_AT} s: clicks ${c.clicks} (0)`],
          [c.tail_db < -90, `silent after the stop's fade: peak ${c.tail_db} dBFS (< -90)`],
          [c.ended && !c.playing, `stop() resolves, ended ${c.ended}, playing ${c.playing}`],
        ];
        const lv = await liveCheck(page, f);
        // the audio clock can start late on a loaded machine: judged on the clock moving, not on wall time
        lines.push([lv.mid.playing && lv.mid.t > 0.5 && lv.ended && !lv.playing && lv.stopMs < 2500,
          `live: playing at t ${lv.mid.t} s, stop(0.5) ended in ${lv.stopMs} ms (${lv.state})`]);
        for (const [ok, text] of lines) { if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${text}`); }
      }
      results.push({ name, info, metrics: { ...m, detail: undefined }, bands, wav: wavPath });
    }
  } finally { await browser.close(); }
  if (o.json) console.log(JSON.stringify(results, null, 1));
  console.log(fail ? `music-render: ${fail} FAIL` : `music-render: all PASS`);
  process.exit(fail ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
