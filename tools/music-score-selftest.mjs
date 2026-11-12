#!/usr/bin/env node
// Self-test for the music harness (v9-M0): the score's arithmetic, the gates against the reference track and two
// deliberately bad fixtures (tools/music-fixtures/: a random-walk noodle, a static drone), each gate on a hand-made
// event list with a known fault, the distance, the roll and the speed. Node only. Exit 1 on any failure; zero
// checks is a failure.  Usage: node tools/music-score-selftest.mjs
import { compose, degRatio, noteName, MODES } from '../src/audio/music/score.js';
import { analyse, measure, distance, roll, loadTrack, trackNames, GATES, PAIR_MIN } from './music-score.mjs';

const t0 = performance.now();
let pass = 0, fail = 0;
const check = (name, ok, info) => { (ok ? pass++ : fail++); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? ': ' + info : ''}`); };
const gate = (m, key) => GATES.find((g) => g[0] === key)[2](m[key]);

// the score's arithmetic
const A = MODES.aeolian;
check('degree 7 is D4 (ratio 2)', degRatio(A, 7) === 2);
check('degree -1 is C3 (ratio 0.9)', Math.abs(degRatio(A, -1) - 0.9) < 1e-12);
check('names', [noteName(1), noteName(1.5), noteName(9 / 5), noteName(2), noteName(8 / 5)].join(' ') === 'D3 A3 C4 D4 Bb3', [noteName(1), noteName(1.5), noteName(9 / 5), noteName(2), noteName(8 / 5)].join(' '));

// the reference track passes every gate, at its seed, in well under a second
const moor = await loadTrack('moor');
const ref = analyse(moor);
for (const r of ref.rows) check(`moor ${r.label}`, r.pass, `${typeof r.value === 'number' ? +r.value.toFixed(3) : r.value} (${r.band})`);
check('moor is listed among the tracks', trackNames().includes('moor'));
check('moor analysed in under 100 ms', ref.m.ms < 100, `${ref.m.ms.toFixed(1)} ms`);
const ev = ref.events;
check('events carry t, dur, voice, ratio, vel and are sorted', ev.every((e, i) => ['t', 'dur', 'voice', 'ratio', 'vel'].every((k) => k in e) && (!i || ev[i - 1].t <= e.t)));
check('a different seed gives a different list', JSON.stringify(compose(moor, 8)) !== JSON.stringify(ev));
check('a voice edited leaves the others as they were', (() => {
  const edited = { ...moor, voices: moor.voices.map((v) => (v.id === 'chime' ? { ...v, skip: 0.9 } : v)) };
  const a = compose(edited).filter((e) => e.voice === 'bell'), b = ev.filter((e) => e.voice === 'bell');
  return JSON.stringify(a) === JSON.stringify(b);
})());

// the bad fixtures fail where they should
const noodle = analyse(await loadTrack('tools/music-fixtures/noodle.js'));
for (const k of ['rest', 'density', 'phrases', 'motif', 'endings', 'range', 'steps']) check(`noodle fails ${k}`, !gate(noodle.m, k), +Number(noodle.m[k]).toFixed(3));
check('noodle fails overall', !noodle.pass);
const drone = analyse(await loadTrack('tools/music-fixtures/drone.js'));
for (const k of ['density', 'phrases', 'motif', 'rest']) check(`drone fails ${k}`, !gate(drone.m, k), +Number(drone.m[k]).toFixed(3));
check('drone fails overall', !drone.pass);

// each event-level gate on a hand-made list with one known fault
const T = { name: 'x', length: 120, bpm: 60, mode: 'aeolian', voices: [{ id: 'm', gen: 'notes', role: 'lead', notes: [] }, { id: 'p', gen: 'notes', notes: [] }] };
const E = (t, dur, ratio, voice = 'm') => ({ t, dur, voice, ratio, vel: 0.5 });
const sorted = (xs) => xs.sort((a, b) => a.t - b.t);
check('a 7:4 is out of mode', measure([E(0, 1, 7 / 4)], T).inMode === 1);
check('a held C3 is under the floor', measure([E(0, 2, 0.9, 'p')], T).low === 1);
check('a short C3 is not held', measure([E(0, 0.3, 0.9, 'p')], T).low === 0);
check('D4 against E4 is rough (37 Hz)', measure(sorted([E(0, 2, 2, 'p'), E(0.5, 1, 9 / 4)]), T).rough === 1);
check('D4 against A4 is not (147 Hz)', measure(sorted([E(0, 2, 2, 'p'), E(0.5, 1, 3)]), T).rough === 0);
check('D3 against D3 a few Hz out is not (slow beating)', measure(sorted([E(0, 2, 1, 'p'), E(0.5, 1, 1.03)]), T).rough === 0);
check('a 0.2 s brush is not rough', measure(sorted([E(0, 2, 2, 'p'), E(1.8, 1, 9 / 4)]), T).rough === 0);
check('seven at once is polyphony 7', measure([1, 1.5, 2, 3, 4, 5, 6].map((r) => E(0, 1, r, 'p')), T).poly === 7);
const run16 = [1, 9 / 8, 6 / 5, 4 / 3, 3 / 2, 6 / 5, 1, 9 / 8, 4 / 3, 3 / 2, 9 / 5, 2, 9 / 5, 3 / 2, 4 / 3, 1].map((r) => 2 * r);
check('a 16-note run played twice is a repeat', measure([...run16, ...run16].map((r, i) => E(i, 0.9, r)), T).repeat16 >= 1);
check('a leap of a ninth is over an octave', measure([E(0, 1, 2), E(1, 1, 4.5)], T).maxLeap > 1200);
const phr = (t0, rs) => rs.map((r, i) => E(t0 + i, 0.9, r));
const ph3 = measure([...phr(0, [3, 8 / 3, 12 / 5, 2]), ...phr(6.9, [2, 12 / 5, 8 / 3, 3])], T);
check('a 3 s rest between phrases is blurred', ph3.phrases === 2 && ph3.phraseRest === 1, `${ph3.phrases} phrases, ${ph3.phraseRest} blurred`);
const motif = [3, 8 / 3, 12 / 5, 8 / 3, 2], others = [[2, 9 / 4, 12 / 5, 2], [3, 18 / 5, 3, 8 / 3, 3], [12 / 5, 8 / 3, 3, 2]];
const mm = measure([0, 1, 2, 3, 4].flatMap((k) => phr(k * 12, k % 2 ? others[k >> 1] : motif)), T);
check('a figure in 3 of 5 phrases returns at 0.6', Math.abs(mm.motif - 0.6) < 1e-9 && mm.motifFig === 'A4 G4 F4 G4', `${mm.motif} ${mm.motifFig}`);
check('a melody with no rest has rest share 0', measure(phr(0, [2, 9 / 4, 12 / 5]).map((e) => ({ ...e, dur: 1 })), T).rest < 1e-9);
// rubato moves an onset after the roughness check: a jittered note must still keep clear of a chord that changes under it
const RUB = { name: 'rubato', length: 120, bpm: 60, mode: 'aeolian', voices: [
  { id: 'p', patch: 'pad', gen: 'drone', chords: [[[0, 4], 3], [[2, 6], 3], [[3, 7], 3], [[4, 7], 3]], vel: 0.4 },
  { id: 'm', patch: 'flute', role: 'lead', gen: 'walk', range: [7, 13], rest: [3, 5], durs: [[1, 2], [2, 1]], rubato: 0.3, legato: 0.9 }] };
const rubRough = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].reduce((s, sd) => s + measure(compose(RUB, sd), RUB).rough, 0);
check('a walk with heavy rubato over a moving chord stays clear of it (10 seeds)', rubRough === 0, `${rubRough} rough pairs`);
check('follow without its leader listed first says so', (() => { try { compose({ ...T, voices: [{ id: 'f', gen: 'follow', of: 'm' }] }); return false; } catch (e) { return /list it before/.test(e.message); } })());

// the distance: two seeds of one track are near; a different track is far
const d78 = distance(ref.m, analyse(moor, 8).m), dn = distance(ref.m, noodle.m);
check(`two seeds of moor are under ${PAIR_MIN} apart`, d78 < PAIR_MIN, d78.toFixed(3));
check(`moor and the noodle are ${PAIR_MIN} or more apart`, dn >= PAIR_MIN, dn.toFixed(3));

// the roll: one row per pitch used, the lead's letter on it, columns of half a second
const lines = roll(ev, moor, { to: 40 }).split('\n');
const rows = lines.filter((l) => /^[A-G]b?\d /.test(l));
check('roll has a row per pitch used', rows.length === new Set(ev.map((e) => e.ratio)).size, `${rows.length} rows`);
check('roll shows the lead and the pad', rows.some((l) => l.includes('M')) && rows.some((l) => l.includes('P=')));
check('roll is 80 columns for 40 s', rows.every((l) => l.split('|')[1].length === 80));

const ms = performance.now() - t0;
check('the self-test runs in under a second', ms < 1000, `${ms.toFixed(0)} ms`);
console.log(`=== music-score-selftest: ${pass} pass, ${fail} fail`);
process.exit(fail || !pass ? 1 : 0);
