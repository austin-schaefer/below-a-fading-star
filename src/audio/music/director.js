// The music director (v9-M2): when a track starts, which one, and when it stops. A pure state machine: no Web Audio, no
// DOM, no clock of its own; the caller feeds it time. Seeded, so a walk and a simulation of it decide the same.
//
//   const d = makeDirector({ catalog, setting: 'default', seed: 1 });
//   d.step(dt, { weights, place, swellSm, gutterIn, moving }) -> actions (a shared array, valid until the next step)
//     weights   region weights (ctx.regions.regionAt's: moor, wood, fen, lattice, saltings, ...); the pool is the
//               heaviest group of them (POOL_OF)
//     place     null, or 'span' / 'keep' / 'gates' while the walker stands in one of the specials' places
//     swellSm   the bed's gutter follower (0..1), gutterIn seconds until the next gutter starts (0 inside one)
//     moving    true while the walker walks
//   actions   { start: name } | { stop: true, fade: seconds } | { duck: gain } (the bus's gain, 1 when the sun is whole)
//   d.interrupt(fade) stops what plays (tab hidden); d.setSetting(s); d.state is for tests and the debug panel.
//
// catalog: [{ name, pool, length }] (pool: a POOLS key, or a special: SPECIALS key). The rules:
//  * silence is the rule: the first track 60-150 s into the walk, then 4-9 minutes of the land alone (lognormal, median
//    6, clamped), both scaled by the setting (off never; rare longer; frequent shorter);
//  * a pool is where the walker stands (the heaviest group); a pool with no track yet means silence, never moor's
//    music in the wood. The first piece of a visit is moor's wherever the walker is, so a first minute is never empty;
//  * a track never starts inside a gutter or with one due in its first 20 s, nor while the walker stands still; it
//    waits for the first moment that is clear;
//  * leaving a track's pool for 10 s fades it over 8 s; entering a special's place and staying 15 s starts the
//    special's track (once a visit; a place with no track yet is spent all the same). A place the walker is already in
//    at the first step is not entered (v9-M6: the walk begins inside the keep's radius, and its piece must not be the
//    first thing a visit hears 15 s in): it counts once they have left it and come back;
//  * every track can be cut at any moment (the gutter ducks the bus, a stop fades it).
export const POOLS = ['moor', 'wood', 'wet', 'cold', 'garden', 'dry'];
export const SPECIALS = ['span', 'keep', 'gates'];
// region weight key -> pool (moor is the remainder: anything not named)
export const POOL_OF = {
  moor: 'moor', wood: 'wood',
  fen: 'wet', saltings: 'wet', strandline: 'wet', tarn: 'wet',
  lattice: 'cold', highLing: 'cold', outwash: 'cold',
  demesne: 'garden', bletting: 'garden',
  adust: 'dry', lynchets: 'dry',
};
export const SETTINGS = ['off', 'rare', 'default', 'frequent'];
// per setting: scale on the first delay, on the silences
const SCALE = { off: [Infinity, Infinity], rare: [1.5, 1.8], default: [1, 1], frequent: [0.7, 0.5] };
export const FIRST = [60, 150]; // s into the walk
export const SWITCH_ON = 6; // s from switching music on by hand to its first piece
export const SILENCE = { median: 360, sigma: 0.28, min: 240, max: 540 }; // s between tracks, lognormal
export const GUTTER_CLEAR = 20; // s a start needs before the next gutter
export const SPECIAL_DWELL = 15; // s in the place before a special
export const LEAVE_AFTER = 10, LEAVE_FADE = 8; // s out of a pool before its track is faded, and how long the fade is
export const END_FADE = 3; // s after a track's length

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function makeDirector({ catalog = [], setting = 'default', seed = 1 } = {}) {
  const rng = mulberry32(seed * 7919 + 13);
  const byPool = {}, byName = {};
  for (const c of catalog) { (byPool[c.pool] ||= []).push(c); byName[c.name] = c; }
  const acts = [], aStart = { start: '' }, aStop = { stop: true, fade: 0 }, aDuck = { duck: 1 }; // reused: step allocates nothing
  const S = {
    setting, t: 0, mode: 'wait', // wait | playing
    timer: 0, // wait: seconds to the next start; playing: seconds since it began
    track: null, away: 0, dwell: 0, special: null, spent: {}, started: 0, stray: false, steps: 0,
    pool: 'moor', duck: 1, lastDuck: 1,
  };
  const normal = () => { let u = 0; while (u === 0) u = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); };
  const sc = () => SCALE[S.setting] || SCALE.default;
  const firstDelay = () => (FIRST[0] + rng() * (FIRST[1] - FIRST[0])) * sc()[0];
  const silence = () => Math.min(SILENCE.max, Math.max(SILENCE.min, SILENCE.median * Math.exp(SILENCE.sigma * normal()))) * sc()[1];
  S.timer = firstDelay();

  function poolOf(w) {
    // the heaviest pool by summed weight; with no weights, moor
    let best = 'moor', bw = -1;
    if (!w) return best;
    let sums = poolSums;
    for (const p of POOLS) sums[p] = 0;
    for (const k in POOL_OF) { const v = w[k]; if (v > 0) sums[POOL_OF[k]] += v; }
    for (const p of POOLS) if (sums[p] > bw) { bw = sums[p]; best = p; }
    return best;
  }
  const poolSums = {};
  const pick = (pool) => { const l = byPool[pool]; if (!l || !l.length) return null; return l[Math.floor(rng() * l.length)]; };

  function begin(c, stray = false) {
    S.mode = 'playing'; S.track = c; S.timer = 0; S.away = 0; S.started++; S.stray = stray;
    aStart.start = c.name; acts.push(aStart);
  }
  function end(fade) {
    if (S.mode !== 'playing') return;
    S.mode = 'wait'; S.track = null; S.timer = silence();
    aStop.fade = fade; acts.push(aStop);
  }

  return {
    state: S,
    setSetting(s) {
      if (!SCALE[s] || s === S.setting) return;
      if (s === 'off' && S.mode === 'playing') end(2); // ended on the old setting's scale, so its wait stays finite
      const wasOff = S.setting === 'off';
      S.setting = s;
      // switched on by hand: a piece within a few seconds, moving or not (the visitor is standing at the menu and
      // would otherwise hear nothing for a minute or more and take it for broken); gutters are still respected
      if (wasOff && s !== 'off' && S.mode !== 'playing') { S.timer = SWITCH_ON; S.eager = true; return; }
      // a wait drawn while off is infinite (off never plays): coming back on draws a fresh one
      if (s !== 'off' && !isFinite(S.timer)) S.timer = S.started ? silence() : firstDelay();
    },
    interrupt(fade = 1) { if (S.mode === 'playing') end(fade); },
    step(dt, { weights, place = null, swellSm = 0, gutterIn = 99, moving = true } = {}) {
      acts.length = 0;
      if (dt > 5) dt = 5;
      S.t += dt; S.steps++;
      S.pool = poolOf(weights);
      // the bus's duck: to silence with the gutter, back on its tail (the follower already shapes it)
      S.duck = swellSm > 0.02 ? Math.max(0, 1 - swellSm * 1.15) : 1;
      if (Math.abs(S.duck - S.lastDuck) > 0.02 || (S.duck === 1 && S.lastDuck !== 1)) { S.lastDuck = S.duck; aDuck.duck = S.duck; acts.push(aDuck); }
      if (S.setting === 'off') return acts;

      // a special: the place, 15 s in it, once a visit
      if (place && S.special !== place) { S.special = place; S.dwell = S.steps === 1 ? -Infinity : 0; } else if (!place) { S.special = null; S.dwell = 0; } else S.dwell += dt;
      const specialDue = place && S.dwell >= SPECIAL_DWELL && !S.spent[place];

      if (S.mode === 'playing') {
        S.timer += dt;
        const c = S.track, isSpecial = SPECIALS.includes(c.pool);
        const here = isSpecial ? place === c.pool : (S.stray || S.pool === c.pool); // the first piece, moor's wherever the walker is, plays out
        S.away = here ? 0 : S.away + dt;
        if (S.away >= LEAVE_AFTER) end(LEAVE_FADE);
        else if (S.timer >= c.length + END_FADE) end(0.5);
        else if (specialDue && !isSpecial && byPool[place]) end(6); // the place takes over; the special starts when this fades
        return acts;
      }

      // waiting
      if (specialDue) {
        const c = pick(place);
        if (!c) S.spent[place] = true; // a hook with no track yet
        else if (moving && gutterIn >= GUTTER_CLEAR && swellSm < 0.02) { S.spent[place] = true; begin(c); return acts; }
      }
      S.timer -= dt;
      if (S.timer > 0) return acts;
      // due: a pool with a track, a clear sky, a walker on the move
      let c = pick(S.pool), stray = false;
      if (!c && S.started === 0) { c = pick('moor'); stray = true; }
      if (!c) { S.timer = 20; return acts; } // this pool has no track yet: look again in a while, never moor's music in the wood
      if ((!moving && !S.eager) || gutterIn < GUTTER_CLEAR || swellSm > 0.02) { S.timer = 0.5; return acts; }
      S.eager = false;
      begin(c, stray);
      return acts;
    },
  };
}
