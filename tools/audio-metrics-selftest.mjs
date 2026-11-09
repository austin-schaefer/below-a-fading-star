#!/usr/bin/env node
// Self-test for tools/audio-metrics.mjs (v7.2-00): synthetic signals made here, with known answers. Exit 1 on any
// failure; zero checks is a failure. Usage: node tools/audio-metrics-selftest.mjs [--keep=dir] (keep the WAVs and a PNG)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readWav, writeWav, measure, spectrogramPanel, writeSpectrogram } from './audio-metrics.mjs';

const keep = (process.argv.find((a) => a.startsWith('--keep=')) || '').slice(7);
const dir = keep || fs.mkdtempSync(path.join(os.tmpdir(), 'audio-selftest-'));
fs.mkdirSync(dir, { recursive: true });
let pass = 0, fail = 0;
const check = (name, ok, info) => { (ok ? pass++ : fail++); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ': ' + info : ''}`); };
const near = (v, want, tol) => typeof v === 'number' && Math.abs(v - want) <= tol;
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += rnd(); return (u - 3) * Math.SQRT2; };
const gen = (sec, sr, f) => Float32Array.from({ length: Math.round(sec * sr) }, (_, i) => f(i / sr, i));
const sine = (amp, hz) => (t) => amp * Math.sin(2 * Math.PI * hz * t);
const white = (amp) => () => amp * gauss();
const pinkGen = (amp) => { let b0 = 0, b1 = 0, b2 = 0; return () => { const w = gauss(); b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; return amp * (b0 + b1 + b2 + w * 0.1848) * 0.25; }; };
// measure through a file, so the reader is exercised too
const viaFile = (name, ch, sr, opts, log) => { const f = path.join(dir, name + '.wav'); writeWav(f, ch, sr, opts); if (log) fs.writeFileSync(path.join(dir, name + '.json'), JSON.stringify(log)); const w = readWav(f); w.file = f; return measure(w, { log }); };

// ---- BS.1770: a -20 dBFS 1 kHz sine on one channel reads -23.0 LUFS (the standard's own check, -3.01 at 0 dBFS)
for (const sr of [48000, 44100]) {
  const m = viaFile(`sine1k-mono-${sr}`, [gen(10, sr, sine(0.1, 1000))], sr, { float: true });
  check(`BS.1770 -20 dBFS 1 kHz sine, mono, ${sr} Hz: -23.0 LUFS ±0.5`, near(m.lufs_i, -23.0, 0.5), `${m.lufs_i}`);
  if (sr === 48000) {
    check('sample peak of a 0.1 sine: -20.0 dBFS', near(m.peak_dbfs, -20, 0.05), `${m.peak_dbfs}`);
    check('crest of a sine: 3.0 dB', near(m.crest_db, 3.0, 0.1), `${m.crest_db}`);
    check('short-term max of a steady sine equals integrated (±0.2)', near(m.lufs_s_max, m.lufs_i, 0.2), `${m.lufs_s_max}`);
    check('LRA of a steady sine under 0.5 LU', m.lra != null && m.lra < 0.5, `${m.lra}`);
    check('centroid of a 1 kHz sine: 1000 Hz ±60', near(m.centroid_hz, 1000, 60), `${m.centroid_hz}`);
    check('a steady sine: no clicks, no seam, no onsets', m.clicks === 0 && m.seam_s == null && m.onsets_pm === 0, `clicks ${m.clicks}, onsets ${m.onsets_pm}`);
    check('a steady sine: rough under 0.05', m.rough < 0.05, `${m.rough}`);
    check('a steady sine: silence 0 %', m.silence_pct === 0, `${m.silence_pct}`);
  }
}
{ // two channels sum: the same sine in both reads 3 dB louder
  const sr = 48000, c = gen(10, sr, sine(0.1, 1000));
  const m = viaFile('sine1k-stereo', [c, c], sr, {});
  check('the same sine in two channels: -20.0 LUFS ±0.5 (channels summed, G = 1), 16-bit', near(m.lufs_i, -20.0, 0.5), `${m.lufs_i}`);
}
{ // loudness range: 10 s at -20, then 10 s at -30 (EBU Tech 3342 case 1 is 10 LU)
  const sr = 48000, c = gen(20, sr, (t) => (t < 10 ? 0.1 : 0.0316) * Math.sin(2 * Math.PI * 1000 * t));
  const m = viaFile('lra-10', [c], sr, { float: true });
  check('LRA of 10 s at -23 then 10 s at -33 LUFS: 10 LU ±1', near(m.lra, 10, 1), `${m.lra}`);
}
{ // silence share: half silent
  const sr = 48000, c = gen(20, sr, (t) => (t < 10 ? 0.1 * Math.sin(2 * Math.PI * 440 * t) : 0));
  const m = viaFile('half-silent', [c], sr, { float: true });
  check('half silent: silence_pct 50 ±3', near(m.silence_pct, 50, 3), `${m.silence_pct}`);
}

// ---- spectrum: white noise's sharpness is the band's share of a flat spectrum
{
  const sr = 48000, m = viaFile('white', [gen(20, sr, white(0.05)), gen(20, sr, white(0.05))], sr, { float: true });
  const want = 10 * Math.log10(3000 / 7900), wantHf = 10 * Math.log10((24000 - 6000) / (24000 - 20));
  check(`white noise sharp_db: the 2-5 kHz share of 100-8000 Hz, ${want.toFixed(1)} dB ±0.5`, near(m.sharp_db, want, 0.5), `${m.sharp_db}`);
  check(`white noise hf_db: ${wantHf.toFixed(2)} dB ±0.3`, near(m.hf_db, wantHf, 0.3), `${m.hf_db}`);
  check('white noise: rough under 0.1 (random fluctuation is not modulation)', m.rough < 0.1, `${m.rough}`);
  check('white noise: no clicks, no onsets, gap_max the whole render', m.clicks === 0 && m.onsets_pm === 0 && near(m.gap_max_s, 20, 0.1), `clicks ${m.clicks}, onsets ${m.onsets_pm}, gap ${m.gap_max_s}`);
  check('white noise (not looped): no repeat_s', m.repeat_s == null, `${m.repeat_s} (r ${m.detail.repeat?.r})`);
  check('white noise: crest 10-16 dB', m.crest_db > 10 && m.crest_db < 16, `${m.crest_db}`);
}
{
  const sr = 44100, p = pinkGen(0.05), m = viaFile('pink', [gen(20, sr, p)], sr, {});
  check('pink noise: rough under 0.1', m.rough < 0.1, `${m.rough}`);
  check(`pink noise sharp_db: ln(5000/2000)/ln(8000/100) of a 1/f spectrum, ${(10 * Math.log10(Math.log(2.5) / Math.log(80))).toFixed(1)} dB ±0.6`, near(m.sharp_db, 10 * Math.log10(Math.log(2.5) / Math.log(80)), 0.6), `${m.sharp_db}`);
  check('pink noise: no clicks, no onsets', m.clicks === 0 && m.onsets_pm === 0, `clicks ${m.clicks}, onsets ${m.onsets_pm}`);
}

// ---- roughness: a 1 kHz sine AM'd at 70 Hz, full depth, is rough; square gating at 25 Hz too; 2 Hz beating is not
{
  const sr = 44100;
  const am = viaFile('am70', [gen(10, sr, (t) => 0.1 * (0.5 + 0.5 * Math.cos(2 * Math.PI * 70 * t)) * Math.sin(2 * Math.PI * 1000 * t))], sr, { float: true });
  check('1 kHz sine AM\'d at 70 Hz (depth 1): rough over 0.5', am.rough > 0.5, `${am.rough}`);
  const half = viaFile('am70-half', [gen(10, sr, (t) => 0.1 * (1 + 0.3 * Math.cos(2 * Math.PI * 70 * t)) * Math.sin(2 * Math.PI * 1000 * t))], sr, { float: true });
  check('AM at depth 0.3 reads rougher than none and less than depth 1', half.rough > 0.05 && half.rough < am.rough, `${half.rough}`);
  const p = pinkGen(0.2);
  const gate = viaFile('gated25', [gen(10, sr, (t) => (Math.sin(2 * Math.PI * 25 * t) > 0 ? 1 : 0.15) * p())], sr, { float: true });
  check('pink noise square-gated at 25 Hz: rough over 0.3', gate.rough > 0.3, `${gate.rough}`);
  const beat = viaFile('beat2', [gen(10, sr, (t) => 0.05 * (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 442 * t)))], sr, { float: true });
  check('two sines 2 Hz apart (slow beating): rough under 0.1', beat.rough < 0.1, `${beat.rough}`);
}

// ---- clicks and seams: a looped noise buffer with the faulty crossfade (synth.js before v7.2: the tail weighted 0)
function loopBuffer(sr, sec, fixed, kind = 'brown') {
  const n = Math.round(sr * sec), d = new Float32Array(n); let b = 0, p0 = 0, p1 = 0, p2 = 0;
  for (let i = 0; i < n; i++) {
    const w = rnd() * 2 - 1;
    if (kind === 'brown') { b = (b + 0.02 * w) / 1.02; d[i] = b * 3.5; }
    else { p0 = 0.99765 * p0 + w * 0.099046; p1 = 0.963 * p1 + w * 0.2965164; p2 = 0.57 * p2 + w * 1.0526913; d[i] = (p0 + p1 + p2 + w * 0.1848) * 0.2; }
  }
  const f = 2048;
  if (fixed) { const head = d.slice(0, f); for (let i = 0; i < f; i++) { const k = i / f; d[n - f + i] = d[n - f + i] * Math.cos(k * Math.PI / 2) + head[i] * Math.sin(k * Math.PI / 2); } return d.slice(0, n); }
  for (let i = 0; i < f; i++) { const k = i / f; d[i] = d[i] * k + d[n - f + i] * (1 - k) * (1 - k) * 0; }
  return d;
}
{
  const sr = 48000, P = 1.7, buf = loopBuffer(sr, P, false), dur = 12;
  const c = gen(dur, sr, (t, i) => 0.3 * buf[(i + 9000) % buf.length]);
  const m = viaFile('seam', [c], sr, {});
  const expect = Math.floor((dur * sr - (buf.length - 9000)) / buf.length) + 1;
  check(`a ${P} s loop with the zeroed crossfade: a click at every seam (${expect})`, m.clicks >= expect - 1 && m.clicks <= expect + 1, `${m.clicks}: ${m.detail.click_times.map((x) => x.t).join(' ')}`);
  check(`... and seam_s ${P} ±0.005`, near(m.seam_s, P, 0.005), `${m.seam_s}`);
  const bp = (() => { let x1 = 0, x2 = 0, y1 = 0, y2 = 0; const w = 2 * Math.PI * 640 / sr, al = Math.sin(w) / (2 * 1.3), cw = Math.cos(w), a0 = 1 + al; return (v) => { const o = (al * v - al * x2 + 2 * cw * y1 - (1 - al) * y2) / a0; x2 = x1; x1 = v; y2 = y1; y1 = o; return o; }; })();
  const pk = loopBuffer(sr, 2.3, false, 'pink'), br = pinkGen(0.01);
  const cf = gen(dur, sr, (t, i) => 0.5 * bp(pk[(i + 300) % pk.length]) + br());
  const mf = viaFile('seam-bandpassed', [cf], sr, {});
  check('a pink loop through the wind\'s 640 Hz bandpass (Q 1.3) over a pink floor: the seam is no discontinuity (no clicks)', mf.clicks === 0, `${mf.clicks}`);
  check('... but the bed repeats itself: repeat_s 2.3 ±0.02', near(mf.repeat_s, 2.3, 0.02), `${mf.repeat_s} (r ${mf.detail.repeat?.r})`);
  const good = loopBuffer(sr, P, true);
  const g = viaFile('seam-fixed', [gen(dur, sr, (t, i) => 0.3 * good[(i + 9000) % good.length])], sr, {});
  check('the loop with a true crossfade: no clicks, no seam', g.clicks === 0 && g.seam_s == null, `${g.clicks} clicks, seam ${g.seam_s}`);
  check('... and still a loop: repeat_s 1.7 ±0.02', near(g.repeat_s, 1.7, 0.02), `${g.repeat_s}`);
}
{ // a tone burst with a 10 ms attack over noise is an onset, not a click; an instant step in a sine is a click
  const sr = 48000, p = pinkGen(0.01), at = [2, 6, 10, 14, 18];
  const env = (t) => { for (const a of at) { const e = t - a; if (e >= 0 && e < 0.3) return Math.min(1, e / 0.01) * Math.exp(-e / 0.08); } return 0; };
  const c = gen(20, sr, (t) => p() + 0.2 * env(t) * Math.sin(2 * Math.PI * 1200 * t));
  const m = viaFile('bursts', [c], sr, {});
  const hit = at.every((a) => m.detail.onset_times.some((o) => Math.abs(o - a) < 0.1));
  check('five tone bursts over pink noise: 5 onsets at their times (±0.1 s)', m.detail.onset_times.length === 5 && hit, m.detail.onset_times.join(' '));
  check('... onsets_pm 15, gap_max_s 4, gap_min_s 4', near(m.onsets_pm, 15, 0.1) && near(m.gap_max_s, 4, 0.15) && near(m.gap_min_s, 4, 0.15), `${m.onsets_pm}, ${m.gap_max_s}, ${m.gap_min_s}`);
  check('... and no clicks (a 10 ms attack is not a click)', m.clicks === 0, `${m.clicks}`);
  // the same file with a cue log naming the bursts at 6 and 14 s as the walker's steps: those two are left out
  const log = { events: [{ kind: 'step', t: 6.0 }, { kind: 'step', t: 14.0 }] };
  const ms = viaFile('bursts-steps', [c], sr, {}, log);
  check('steps in the cue log are left out of onsets (3 left, gap_max 8)', ms.detail.onset_times.length === 3 && near(ms.gap_max_s, 8, 0.15), `${ms.detail.onset_times.join(' ')}, gap ${ms.gap_max_s}`);
  const s = gen(10, sr, (t) => 0.1 * Math.sin(2 * Math.PI * 300 * t) + (t > 5 && t < 5.0004 ? 0.05 : 0));
  const ms2 = viaFile('one-click', [s], sr, { float: true });
  check('a 0.4 ms glitch in a sine: 1 click at 5.0 s', ms2.clicks === 1 && near(ms2.detail.click_times[0]?.t, 5.0, 0.002), `${ms2.clicks} ${ms2.detail.click_times.map((x) => x.t)}`);
}

// ---- the reader: 24-bit PCM and the extensible header
{
  const sr = 44100, n = 4410, C = 2, b = Buffer.alloc(68 + n * C * 3);
  b.write('RIFF', 0); b.writeUInt32LE(60 + n * C * 3, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(40, 16);
  b.writeUInt16LE(0xfffe, 20); b.writeUInt16LE(C, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * C * 3, 28); b.writeUInt16LE(C * 3, 32); b.writeUInt16LE(24, 34);
  b.writeUInt16LE(22, 36); b.writeUInt16LE(24, 38); b.writeUInt32LE(3, 40); b.writeUInt16LE(1, 44); // subformat PCM
  b.write('data', 60); b.writeUInt32LE(n * C * 3, 64);
  for (let i = 0; i < n; i++) for (let c = 0; c < C; c++) b.writeIntLE(Math.round(0.5 * Math.sin(2 * Math.PI * 441 * i / sr) * 8388607 * (c ? -1 : 1)), 68 + (i * C + c) * 3, 3);
  const f = path.join(dir, 'ext24.wav'); fs.writeFileSync(f, b);
  const w = readWav(f);
  check('reads 24-bit WAVE_FORMAT_EXTENSIBLE', w.sr === sr && w.ch.length === 2 && near(w.ch[0][25], 0.5, 1e-4) && near(w.ch[1][25], -0.5, 1e-4), `${w.ch[0][25]}, ${w.ch[1][25]}`);
}

// ---- the spectrogram PNG: 80 px a second plus margins, 512 rows plus margins; two panels stack
{
  const sr = 44100, c = gen(5, sr, sine(0.1, 1000)), w = { sr, ch: [c], file: 'x' };
  const p1 = spectrogramPanel(w, { title: 'selftest', log: { events: [{ kind: 'cue', t: 1, name: 'carillon', d: 3 }, { kind: 'gutter', t: 2, len: 2 }] } });
  const f = path.join(dir, 'spec.png'); writeSpectrogram(f, [p1, p1]);
  const b = fs.readFileSync(f), W = b.readUInt32BE(16), H = b.readUInt32BE(20);
  check('spectrogram PNG: 400 px of time for 5 s, 512 rows a panel, two panels stacked', b.toString('latin1', 1, 4) === 'PNG' && W === p1.w && p1.w - 52 === 400 && H === 2 * p1.h + 6, `${W}x${H}`);
  // the 1 kHz row is the brightest in the middle column
  const x = 44 + 200, rows = []; for (let y = 60; y < 60 + 512; y++) { const o = (y * p1.w + x) * 3; rows.push(p1.px[o] + p1.px[o + 1] + p1.px[o + 2]); }
  const yMax = 60 + rows.indexOf(Math.max(...rows)), want = 60 + Math.round(511 - 512 * Math.log(1000 / 40) / Math.log(16000 / 40));
  check('spectrogram: a 1 kHz sine is drawn on the 1 kHz row (±3 px)', Math.abs(yMax - want) <= 3, `row ${yMax}, want ${want}`);
}

console.log(`\n${pass}/${pass + fail} checks passed${keep ? `; files in ${dir}` : ''}`);
if (!keep) fs.rmSync(dir, { recursive: true, force: true });
process.exit(fail || !pass ? 1 : 0);
