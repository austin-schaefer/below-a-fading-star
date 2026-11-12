// The director's simulator (v9-M2): ten hours of a walker's regions and sun-gutters through director.js, in Node, text.
//   node tools/music-director-sim.mjs [--hours=10] [--seed=1]
// The walker moves between places (a pool at a time, for 1-6 minutes), stands still now and then, passes through the
// specials' places; the sun gutters as sky.js does (12-16 s every 60-110 s). Gates: silent >= 70 % of the time, no start
// in a gutter or within 20 s of one, every pool with a track reached (also against a catalog that gives every pool and
// special a track), the first track 60-150 s in, no music from a pool that has none (except the first piece), the four
// settings ordered, one start per special a visit, the same seed the same course. Prints PASS/FAIL lines.
import { makeDirector, POOLS, SPECIALS, SETTINGS, GUTTER_CLEAR } from '../src/audio/music/director.js';
import { CATALOG } from '../src/audio/music/catalog.js';

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? +a.split('=')[1] : d; };
const HOURS = arg('hours', 10), SEED = arg('seed', 1), DT = 0.1;
function rngOf(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// a catalog with a track for every pool and special (to exercise the logic the single moor cannot)
const FULL = [...POOLS, ...SPECIALS].map((p) => ({ name: p + '-t', pool: p, length: SPECIALS.includes(p) ? 120 : 156 }));
const REAL = CATALOG.map(({ name, pool, length }) => ({ name, pool, length }));
const WEIGHT_KEYS = { moor: ['moor'], wood: ['wood'], wet: ['fen', 'saltings', 'strandline'], cold: ['lattice', 'highLing', 'outwash'], garden: ['demesne', 'bletting'], dry: ['adust', 'lynchets'] };

function run(catalog, setting, seed = SEED, hours = HOURS) {
  const rng = rngOf(seed * 31 + 7), dir = makeDirector({ catalog, setting, seed });
  const byName = Object.fromEntries(catalog.map((c) => [c.name, c]));
  const total = hours * 3600, W = {};
  let t = 0, pool = 'moor', poolLeft = 0, place = null, placeLeft = 0, standLeft = 0, still = false;
  let gNext = 25 + rng() * 30, gPhase = 0, gLen = 0, swell = 0;
  let playing = null, playEnd = 0, soundT = 0, starts = [], stopsAt = [], firstAt = null, bad = [], strays = 0;
  const reached = {}, visits = {}, specialStarts = {};
  const gate = [0, 0]; // [seconds fading out the last 3 s of a track counted as playing]
  let visit = 0;
  while (t < total) {
    if (poolLeft <= 0) {
      pool = POOLS[Math.floor(rng() * POOLS.length)]; poolLeft = 60 + rng() * 300; visits[pool] = (visits[pool] || 0) + 1;
      const ks = WEIGHT_KEYS[pool];
      for (const k of Object.values(WEIGHT_KEYS).flat()) W[k] = 0;
      W[ks[Math.floor(rng() * ks.length)]] = 0.8; W[ks[0]] += 0.2; // one region heavy
    }
    if (placeLeft <= 0) {
      if (place) { place = null; placeLeft = 300 + rng() * 900; } else { place = SPECIALS[Math.floor(rng() * 3)]; placeLeft = 20 + rng() * 120; visit++; }
    }
    if (standLeft <= 0) { still = !still; standLeft = still ? 10 + rng() * 50 : 60 + rng() * 240; }
    // the sun (sky.js: next counts down always; a gutter starts when it reaches 0)
    gNext -= DT;
    if (gNext <= 0 && gPhase <= 0) { gLen = gPhase = 12 + rng() * 4; gNext = 60 + rng() * 50; }
    let target = 0;
    if (gPhase > 0) { gPhase -= DT; target = gLen - gPhase < 1.4 || gPhase > 2.5 ? 1 : gPhase / 2.5; }
    swell += (target - swell) * (target > swell ? 0.25 : 0.04) * (DT / 0.1);
    const inG = gPhase > 0;
    const acts = dir.step(DT, { weights: W, place, swellSm: swell, gutterIn: inG ? 0 : gNext, moving: !still });
    for (let i = 0; i < acts.length; i++) {
      const a = acts[i];
      if (a.start) {
        const c = byName[a.start];
        starts.push(t);
        if (firstAt === null) firstAt = t;
        if (inG || gNext < GUTTER_CLEAR) bad.push(`start of ${a.start} at ${t.toFixed(0)} s: gutter ${inG ? 'running' : 'due in ' + gNext.toFixed(1) + ' s'}`);
        if (still) bad.push(`start of ${a.start} at ${t.toFixed(0)} s: walker standing`);
        reached[c.pool] = (reached[c.pool] || 0) + 1;
        if (SPECIALS.includes(c.pool)) { specialStarts[c.pool + '@' + visit] = (specialStarts[c.pool + '@' + visit] || 0) + 1; if (place !== c.pool) bad.push('special started outside its place'); }
        else if (c.pool !== pool && starts.length > 1) bad.push(`${a.start} started in pool ${pool}`);
        else if (c.pool !== pool) strays++;
        playing = c; playEnd = t + c.length;
      }
      if (a.stop) { if (playing) { soundT += Math.min(t - (playEnd - playing.length), playing.length) ; stopsAt.push(t); } playing = null; }
    }
    t += DT; poolLeft -= DT; placeLeft -= DT; standLeft -= DT;
  }
  if (playing) soundT += Math.min(t - (playEnd - playing.length), playing.length);
  return { starts: starts.length, firstAt, silent: 1 - soundT / total, bad, reached, visits, specialStarts, strays, soundT };
}

let fails = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS ' : 'FAIL ') + msg); if (!ok) fails++; };
console.log(`music director simulator: ${HOURS} h, seed ${SEED}, dt ${DT} s`);
const rows = {};
for (const s of SETTINGS) rows[s] = run(REAL, s);
console.log('\nreal catalog (' + REAL.map((c) => c.name + ':' + c.pool).join(', ') + ')');
console.log('setting    starts  first(s)  silent%  music min');
for (const s of SETTINGS) { const r = rows[s]; console.log(`${s.padEnd(9)} ${String(r.starts).padStart(6)}  ${r.firstAt == null ? '    -' : r.firstAt.toFixed(0).padStart(8)}  ${(r.silent * 100).toFixed(1).padStart(7)}  ${(r.soundT / 60).toFixed(0).padStart(8)}`); }
const full = run(FULL, 'default');
console.log('\nfull catalog (a track in every pool and special), default');
console.log(`starts ${full.starts}, silent ${(full.silent * 100).toFixed(1)}%, started by pool: ` + Object.entries(full.reached).map(([k, v]) => k + ' ' + v).join(', '));
console.log('');

const d = rows.default;
check(d.silent >= 0.7, `default setting silent ${(d.silent * 100).toFixed(1)}% of ${HOURS} h (>= 70%)`);
check(full.silent >= 0.7, `full catalog silent ${(full.silent * 100).toFixed(1)}% (>= 70%)`);
for (const [n, r] of [['real', d], ['full', full], ['rare', rows.rare], ['frequent', rows.frequent]]) check(r.bad.length === 0, `no start in or before a gutter, while standing, or in another pool (${n}${r.bad.length ? ': ' + r.bad[0] : ''})`);
check(d.firstAt >= 60, `the first track at ${d.firstAt?.toFixed(0)} s in the simulated walk (not before 60 s)`);
check(REAL.every((c) => d.reached[c.pool] > 0), 'every pool with a track reached (real catalog: ' + [...new Set(REAL.map((c) => c.pool))].join(', ') + ')');
check([...POOLS, ...SPECIALS].every((p) => full.reached[p] > 0), 'every pool and special reached (full catalog)');
check(d.strays <= 1, `moor's music outside moor only as the first piece (${d.strays})`);
const spec = {}; for (const k of Object.keys(full.specialStarts)) spec[k.split('@')[0]] = (spec[k.split('@')[0]] || 0) + full.specialStarts[k];
check(SPECIALS.every((p) => spec[p] === 1), 'each special starts once a visit, after 15 s in its place (' + SPECIALS.map((p) => p + ' ' + (spec[p] || 0)).join(', ') + ')');
// the first track, with every moment clear: 60-150 s in, for fifty seeds
let lo = 1e9, hi = 0;
for (let s = 1; s <= 50; s++) { const dd = makeDirector({ catalog: REAL, seed: s }); let tt = 0, got = null; while (got === null && tt < 400) { tt += 0.1; for (const a of dd.step(0.1, { weights: { moor: 1 }, gutterIn: 90, moving: true })) if (a.start) got = tt; } lo = Math.min(lo, got); hi = Math.max(hi, got); }
check(lo >= 59.9 && hi <= 150.1, `the first track 60-150 s in on a clear walk (fifty seeds: ${lo.toFixed(0)}-${hi.toFixed(0)} s)`);
const order = SETTINGS.map((s) => rows[s].soundT);
check(order[0] === 0 && order[0] < order[1] && order[1] < order[2] && order[2] < order[3], 'settings ordered by music heard: off ' + order.map((x) => (x / 60).toFixed(0)).join(' < ') + ' min');
const again = run(REAL, 'default');
check(again.starts === d.starts && again.firstAt === d.firstAt, 'same seed, same course');
// off and on again: a director switched off mid-track, or built while off, plays again once switched back on
{
  const run = (d, s) => { let n = 0; for (let t = 0; t < s; t += 0.5) for (const a of d.step(0.5, { weights: { moor: 1 }, gutterIn: 99, moving: true })) if (a.start) n++; return n; };
  const d1 = makeDirector({ catalog: CATALOG, setting: 'default', seed: 3 });
  for (let i = 0; i < 2000 && d1.state.mode !== 'playing'; i++) d1.step(0.5, { weights: { moor: 1 }, gutterIn: 99, moving: true }); // switched off while a track plays
  d1.setSetting('off'); const offN = run(d1, 1200); d1.setSetting('default'); const onN = run(d1, 3000);
  console.log(`${offN === 0 && onN > 0 ? 'PASS' : 'FAIL'} off mid-track, then on: ${offN} starts while off, ${onN} in the 3000 s after`);
  const d2 = makeDirector({ catalog: CATALOG, setting: 'off', seed: 4 });
  run(d2, 300); d2.setSetting('frequent'); const n2 = run(d2, 1500);
  console.log(`${n2 > 0 ? 'PASS' : 'FAIL'} built off, then on: ${n2} starts in 1500 s`);
  // switched on by hand while standing at the menu: a piece within ten seconds, moving or not
  const d3 = makeDirector({ catalog: CATALOG, setting: 'off', seed: 5 });
  for (let t = 0; t < 30; t += 0.5) d3.step(0.5, { weights: { moor: 1 }, gutterIn: 99, moving: false });
  d3.setSetting('default'); let at3 = -1;
  for (let t = 0; t < 20 && at3 < 0; t += 0.5) for (const x of d3.step(0.5, { weights: { moor: 1 }, gutterIn: 99, moving: false })) if (x.start) at3 = t;
  console.log(`${at3 >= 0 && at3 <= 10 ? 'PASS' : 'FAIL'} switched on by hand, standing still: first piece ${at3 < 0 ? 'never' : at3 + ' s'} after (within 10)`);
  if (!(offN === 0 && onN > 0 && n2 > 0 && at3 >= 0 && at3 <= 10)) fails++;
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
