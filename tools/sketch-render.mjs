#!/usr/bin/env node
// The sketches' audio check (v17.1, issue #23): render each sketch of src/audio/music/sketches/ offline, as
// listen.html plays it (the real player, the sampled or oscillator patches, the page's room and gain), and meter it.
// A blank headless page with the modules and the samples served from this checkout by page.route (no server, no
// world), like tools/music-render.mjs. The gates are tripwires for broken output, not taste:
//   every bar adds up (the notation throws otherwise), no note dropped or stolen, nothing held past its sample;
//   the mix the page plays: loudness -23 to -16 LUFS, peak <= -3 dBFS (the page has no limiter), sharp_db < -10;
//   each voice alone, when within 20 dB of the stem: its own sharp_db < -10 (one harsh instrument);
//   the tune alone sounds its written notes (each within 25 cents, not an octave off: a sample at the wrong rate);
//   the oscillator variant: clicks 0 (a recorded pluck or drum is a transient the click meter cannot tell from a
//   click, so the sampled variants' count is shown, not gated).
// The recorded instruments are judged at -10 where the oscillator tracks have -16: a real flute or bell has more
// 2-5 kHz than a filtered triangle, and that is the point of them.
//
//   node tools/sketch-render.mjs [name|all] [--wav] [--spectrogram] [--parts] [--variant=sampled|osc] [--solo=voice,...]
//
// --wav writes shots/wip/music/v17.1-sketch-<name>-<variant>.wav (gitignored): the page's mix, as heard.
// --spectrogram writes shots/wip/audio/v17.1-sketch-<name>-<variant>.png. --parts prints every voice's notes, bar by bar.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch, parseArgs } from './audio-render.mjs';
import { measure, writeWav, spectrogramPanel, writeSpectrogram } from './audio-metrics.mjs';
import { musicRough } from './music-metrics.mjs';
import { bandTable } from './music-render.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'http://music.local';
const SR = 48000, SHARP_MAX = -10, LUFS = [-23, -16], PEAK_MAX = -3;
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.mp3': 'audio/mpeg' };
const blank = '<!doctype html><meta charset="utf-8"><title>sketch render</title><body></body>';

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

async function render(page, name, o) {
  const info = await page.evaluate(async ({ name, o }) => {
    const S = await import('/src/audio/music/sketches/index.js');
    const r = await S.renderSketch(name, o);
    window.__buf = r.channels;
    return { ...r.info, frames: r.channels[0].length, seconds: r.seconds };
  }, { name, o: { sr: SR, ...o } });
  return { info, ch: await pull(page, '__buf', info.frames) };
}

// Does the tune sound what is written? Each of its notes of 0.25 s or more, alone in the bare stem: the strongest
// sine within 80 cents of the written pitch (a Hann window of up to 0.6 s inside the note, long enough to average a vibrato) must sit within TUNE_CENTS
// of it and be at least twice as strong as the octave below (a sample played an octave down would put its
// fundamental there). A spectrum, not an autocorrelation: bells and plucked strings ring over the next note.
// The tape's wow is +-4 cents of this.
const TUNE_CENTS = 25;
function tuning(L, R, events) {
  const off = []; let checked = 0, worst = 0;
  for (const e of events) {
    if (e.dur < 0.25) continue;
    const f = 146.83 * e.ratio, from = Math.floor((e.t + 0.012 + Math.min(0.12, e.dur * 0.25)) * SR), N = Math.floor(Math.min(0.6, e.dur * 0.7) * SR);
    const x = new Float64Array(N); for (let i = 0; i < N; i++) x[i] = (L[from + i] + R[from + i]) / 2 * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
    const mag = (fr) => { let re = 0, im = 0; const w = 2 * Math.PI * fr / SR; for (let i = 0; i < N; i++) { re += x[i] * Math.cos(w * i); im += x[i] * Math.sin(w * i); } return Math.hypot(re, im); };
    let best = 0, got = f;
    for (let c = -80; c <= 80; c += 2) { const fr = f * 2 ** (c / 1200), m = mag(fr); if (m > best) { best = m; got = fr; } }
    const cents = Math.round(1200 * Math.log2(got / f)); let under = 0;
    for (let c = -60; c <= 60; c += 10) under = Math.max(under, mag(f / 2 * 2 ** (c / 1200)));
    checked++; worst = Math.abs(cents) > Math.abs(worst) ? cents : worst;
    if (Math.abs(cents) > TUNE_CENTS || under > best / 2) off.push(`${e.t}s ${f.toFixed(0)} Hz: ${cents}c, the octave below at ${(under / best).toFixed(2)} of it`);
  }
  return { checked, off, worst };
}

async function main() {
  const { o, pos } = parseArgs(process.argv.slice(2));
  const S = await import(pathToFileURL(path.join(ROOT, 'src/audio/music/sketches/notation.js')).href);
  const names = ['moor', 'keep', 'garden', 'dry'], sketches = {};
  for (const n of names) sketches[n] = (await import(pathToFileURL(path.join(ROOT, `src/audio/music/sketches/${n}.js`)).href)).default;
  const which = !pos[0] || pos[0] === 'all' ? names : [pos[0]];
  for (const n of which) if (!sketches[n]) { console.error(`no sketch ${n} (${names.join(', ')})`); process.exit(2); }
  let fail = 0;
  const gate = (ok, text) => { if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'} ${text}`); };

  const browser = await launch();
  try {
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.error('page error:', e.message));
    page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.error('page:', m.text()); });
    await page.route(`${HOST}/**`, async (route) => {
      const u = new URL(route.request().url());
      if (u.pathname === '/') return route.fulfill({ status: 200, contentType: 'text/html', body: blank });
      const file = path.join(ROOT, decodeURIComponent(u.pathname));
      if (!file.startsWith(ROOT) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
      return route.fulfill({ status: 200, contentType: MIME[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
    });
    await page.goto(`${HOST}/`);
    for (const name of which) {
      const sketch = sketches[name];
      const variants = o.variant ? [String(o.variant)] : sketch.voices.every((v) => v.osc) ? ['sampled', 'osc'] : ['sampled'];
      for (const variant of variants) {
        const tag = `${name}/${variant}`;
        const ev = S.eventsOf(sketch, variant);
        const solo = o.solo ? String(o.solo).split(',') : null; // --solo=tune,harp: the mix (and its WAV) with only those voices
        const { info, ch } = await render(page, name, { variant, room: true, solo });
        const m = measure({ sr: SR, ch, frames: info.frames }), mr = musicRough(ch, SR), bands = bandTable(ch, SR);
        const stem = await render(page, name, { variant, room: false });
        const ms = measure({ sr: SR, ch: stem.ch, frames: stem.info.frames });
        console.log(`${tag}: ${ev.seconds.toFixed(1)} s written (${ev.beats} beats, ${sketch.meter} to a bar), ${info.seconds.toFixed(1)} s rendered, ${info.notes} notes, voices ${Object.entries(info.plan).map(([k, v]) => `${k} ${v}`).join(', ')}`);
        console.log(`  the page's mix: ${m.lufs_i} LUFS (short-term max ${m.lufs_s_max}, range ${m.lra} LU)  peak ${m.peak_dbfs} dBFS  crest ${m.crest_db} dB  centroid ${m.centroid_hz} Hz`);
        console.log(`  sharp_db ${m.sharp_db}  hf_db ${m.hf_db}  rough ${mr.rough} (partials; p95 ${mr.p95}, roughest at ${mr.worst_t} s)  clicks ${m.clicks}  silence ${m.silence_pct} %   bare stem ${ms.lufs_i} LUFS`);
        console.log('  band energy (dB re the whole)');
        for (const b of bands) console.log(`    ${b.name.padEnd(16)} ${String(b.db).padStart(6)}  ${'#'.repeat(Math.max(0, Math.round((b.db + 60) / 2)))}`);
        if (m.detail.click_times.length) console.log(`  click times: ${m.detail.click_times.slice(0, 10).map((c) => `${c.t}s x${c.ratio}`).join(', ')}`);
        gate(info.dropped === 0 && info.stolen === 0, `${tag} notes dropped ${info.dropped}, stolen ${info.stolen} (0, 0)`);
        gate(m.lufs_i >= LUFS[0] && m.lufs_i <= LUFS[1], `${tag} loudness of the mix: ${m.lufs_i} LUFS (${LUFS[0]} to ${LUFS[1]})`);
        gate(m.peak_dbfs <= PEAK_MAX, `${tag} peak of the mix: ${m.peak_dbfs} dBFS (<= ${PEAK_MAX})`);
        gate(m.sharp_db != null && m.sharp_db < SHARP_MAX, `${tag} sharp_db of the mix: ${m.sharp_db} (< ${SHARP_MAX})`);
        if (variant === 'osc') gate(m.clicks === 0, `${tag} clicks: ${m.clicks} (0)`);
        // nothing held past its recording: a sustained sampled note longer than its sample fades out early
        const long = variant === 'sampled' ? ev.events.filter((e) => { const p = ev.voices.find((v) => v.id === e.voice).patch; return ['s-flute', 's-oboe'].includes(p) ? e.dur > 2.5 : ['s-violin', 's-viola', 's-cello'].includes(p) ? e.dur > 3.2 : false; }) : [];
        gate(long.length === 0, `${tag} sustained notes longer than their recording: ${long.length} (0)`);
        console.log('  per voice (alone, bare stem): level re the stem, own sharp_db, peak');
        for (const [id, patch] of info.ids) {
          const r = await render(page, name, { variant, room: false, solo: [id] });
          if (id === sketch.voices[0].id) { const t = tuning(r.ch[0], r.ch[1], ev.events.filter((e) => e.voice === id)); gate(t.checked > 0 && t.off.length === 0, `${tag} the tune sounds its written notes: ${t.checked} checked, ${t.off.length} off by over ${TUNE_CENTS} cents or an octave${t.off.length ? ' (' + t.off.slice(0, 6).join('; ') + ')' : ''}, worst ${t.worst} cents`); }
          const mv = measure({ sr: SR, ch: r.ch, frames: r.info.frames });
          const rel = mv.lufs_i == null || ms.lufs_i == null ? null : mv.lufs_i - ms.lufs_i, gated = rel != null && rel > -20;
          const ok = !gated || mv.sharp_db == null || mv.sharp_db < SHARP_MAX;
          if (!ok) fail++;
          console.log(`${!gated ? '(shown)' : ok ? 'PASS' : 'FAIL'} ${tag} voice ${(id + ' (' + patch + ')').padEnd(22)} level ${rel == null ? '    -' : rel.toFixed(1).padStart(5)} dB  sharp_db ${String(mv.sharp_db).padStart(6)} (< ${SHARP_MAX})  centroid ${String(mv.centroid_hz).padStart(5)} Hz  peak ${mv.peak_dbfs} dBFS`);
        }
        if (o.wav) { const f = path.join(ROOT, 'shots/wip/music', `v17.1-sketch-${name}-${variant}${solo ? '-' + solo.join('+') : ''}.wav`); writeWav(f, ch, SR); console.log(`  wav: ${f}`); }
        if (o.spectrogram) { const f = path.join(ROOT, 'shots/wip/audio', `v17.1-sketch-${name}-${variant}.png`); writeSpectrogram(f, [spectrogramPanel({ sr: SR, ch, frames: info.frames }, { title: `${name} (${variant})` })]); console.log(`  spectrogram: ${f}`); }
      }
      if (o.parts) for (const v of sketch.voices) console.log(`  ${name} ${v.id} (${v.patch}):\n${S.partText(sketch, v.id).split('\n').map((l) => '    ' + l).join('\n')}`);
    }
  } finally { await browser.close(); }
  console.log(fail ? `sketch-render: ${fail} FAIL` : 'sketch-render: all PASS');
  process.exit(fail ? 1 : 0);
}

main();
