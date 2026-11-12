// The score: music as data. A track is a small plain object; compose(track, seed) turns it into a sorted list of
// note events; tools/music-score.mjs judges that list as text. Pure JS: no Web Audio, no DOM, imported by Node and
// the browser alike. Sound is the player's business (src/audio/music/player.js, later).
//
// EVENTS  { t, dur, voice, ratio, vel }: onset and length in seconds (rounded to ms), the voice's id, the pitch as a
// just ratio from D3 = 146.83 Hz (1 = D3, 2 = D4, 1.5 = A3; rounded to 1e-9 so one pitch is one number), velocity 0..1. Sorted by t, then by voice order.
//
// A TRACK
//   name    the file's name; length  seconds (90-180); bpm  beats a minute (one beat = 60 / bpm s; 50-80)
//   mode    'aeolian' | 'dorian' | 'phrygian' (just ratios from D, MODES below), or an array of seven ratios
//   seed    the default seed (compose's second argument overrides it)
//   voices  in order. Each has an id, a patch (for the player: pad, organ, flute, choir, bell), a gen (below),
//           optional from / to (seconds: the window it plays in), role ('lead' for the one melody the tool judges;
//           a walk voice is the lead if no voice says so), mark (one letter for the piano roll).
// PITCH is a scale degree of the mode: 0 = D3, 1 = E3, 4 = A3, 7 = D4, 11 = A4, 14 = D5; negative goes below D3.
// TIME inside a voice is in beats.
// ORDER matters: a voice never places a note that sounds rough (ROUGH_HZ apart for ROUGH_OVERLAP s) against the
// voices listed before it; it chooses another pitch, holds, or rests. List what must not move first.
// Each voice has its own random stream (from the seed and its id), so editing one voice leaves the others as they were.
//
// GENERATORS
//   drone   chords: [[degrees, beats], ...] cycled until `to`; a chord that would be rough against earlier voices
//           is replaced by chords[0]; repeated degrees are held, not restruck. vel.
//   loop    figure: [[atBeat, beats, degree, vel?], ...] repeated every `period` beats from `offset`; give two loops
//           periods with no common factor (23, 29, 31, 37) and they never realign (Eno). skip: chance to leave a cycle out.
//   walk    a monophonic melody of phrases and rests. range [lo, hi] degrees; notes [min, max] a phrase; rest [min, max]
//           beats between phrases; durs [[beats, weight], ...]; endBeats [min, max] for the phrase's last note;
//           ends: degree classes (mod 7) a phrase may end on (default D and A: [0, 4]); step: chance of moving by one
//           degree; penta: weight on the pentatonic degrees; vel [quiet, loud] (arched over the phrase); rubato:
//           onset jitter as a share of a beat; legato: a note's share of its beats.
//           motif { notes: [[degree, beats], ...], first, last, every: [min, max] phrases between returns, vary: chance
//           its last note becomes the other of the phrase ends (needs 5 notes or more) }: the figure that returns. first / last: open and close with it.
//   follow  shadows another voice's phrases a fifth (2/3) or fourth (3/4) below, whichever stays in the mode, fits and
//           stays at D3 or above; else rests for that note. of: the leader's id; every: take one phrase in `every`;
//           start: the first phrase index to take; vel: a scale on the leader's velocity; delay: beats.
//   notes   notes: [[atBeat, beats, degree, vel?], ...] written by hand, from `from`. No checks: the tool judges them.
//
// A COMPLETE SMALL EXAMPLE (it passes every gate of tools/music-score.mjs)
//   export default {
//     name: 'tiny', length: 96, bpm: 56, mode: 'aeolian', seed: 3,
//     voices: [
//       { id: 'melody', patch: 'flute', gen: 'walk', role: 'lead', from: 8, to: 90, range: [7, 14],
//         notes: [4, 6], rest: [5, 8], motif: { notes: [[11, 2], [10, 1], [9, 1], [7, 4]], first: true, last: true, every: [2, 3] } },
//       { id: 'pad', patch: 'pad', gen: 'drone', chords: [[[0, 4], 16], [[2, 6], 8]], vel: 0.4 },
//       { id: 'bell', patch: 'bell', gen: 'loop', from: 20, figure: [[0, 3, 18, 0.3]], period: 29, offset: 3 },
//     ],
//   };

import { mulberry32 } from '../../noise.js';

export const D3 = 146.83;
export const MODES = {
  aeolian: [1, 9 / 8, 6 / 5, 4 / 3, 3 / 2, 8 / 5, 9 / 5],
  dorian: [1, 9 / 8, 6 / 5, 4 / 3, 3 / 2, 5 / 3, 9 / 5],
  phrygian: [1, 16 / 15, 6 / 5, 4 / 3, 3 / 2, 8 / 5, 9 / 5],
};
// the carillon's just minor pentatonic on D (src/audio/cues-v2.js): D F G A C, held by all three modes
export const PENTATONIC = [1, 6 / 5, 4 / 3, 3 / 2, 9 / 5];
// two notes this far apart in Hz, sounding together this long, beat as roughness or mud (judged on fundamentals)
export const ROUGH_HZ = [8, 70];
export const ROUGH_OVERLAP = 0.25;
export const FLOOR_HZ = 140; // nothing held under it: the sub belongs to the bed's drone

const NAMES = [[1, 'D'], [16 / 15, 'Eb'], [9 / 8, 'E'], [6 / 5, 'F'], [4 / 3, 'G'], [3 / 2, 'A'], [8 / 5, 'Bb'], [5 / 3, 'B'], [9 / 5, 'C']];

export const modeOf = (track) => (Array.isArray(track.mode) ? track.mode : MODES[track.mode || 'aeolian']);
export const hz = (ratio) => D3 * ratio;
export function pc(ratio) { let r = ratio; while (r >= 2 - 1e-9) r /= 2; while (r < 1 - 1e-9) r *= 2; return r; }
export const inSet = (ratio, set) => { const p = pc(ratio); return set.some((s) => Math.abs(p / s - 1) < 1e-6); };
export function degRatio(mode, deg) { const o = Math.floor(deg / 7); return mode[deg - o * 7] * 2 ** o; }
export function noteName(ratio) {
  const p = pc(ratio), hit = NAMES.find(([r]) => Math.abs(p / r - 1) < 1e-6);
  if (!hit) return `${(1200 * Math.log2(p)).toFixed(0)}c`;
  const oct = 3 + Math.round(Math.log2(ratio / p)) + (hit[1] === 'C' ? 1 : 0);
  return hit[1] + oct;
}
export const rough = (f1, f2) => { const d = Math.abs(f1 - f2); return d >= ROUGH_HZ[0] && d <= ROUGH_HZ[1]; };
// does a note (t, dur, f) sound rough against any of the events?
export function clashAt(events, t, dur, f) {
  for (const e of events) {
    const ov = Math.min(t + dur, e.t + e.dur) - Math.max(t, e.t);
    if (ov >= ROUGH_OVERLAP && rough(f, hz(e.ratio))) return e;
  }
  return null;
}

const r3 = (x) => Math.round(x * 1000) / 1000;
const hashStr = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const pick = (rng, [lo, hi]) => lo + Math.floor(rng() * (hi - lo + 1));
function weighted(rng, items) { // items: [[value, weight], ...]
  const sum = items.reduce((s, [, w]) => s + w, 0);
  let x = rng() * sum;
  for (const [v, w] of items) if ((x -= w) < 0) return v;
  return items[items.length - 1][0];
}
const isTritone = (a, b) => { const p = pc(a > b ? a / b : b / a); return p > 1.38 && p < 1.46; };

// ---------------------------------------------------------------- generators: ({ v, rng, beat, mode, from, to, prior, phrases }) → events
function drone({ v, beat, mode, from, to, prior }) {
  const out = [], vel = v.vel ?? 0.4, chords = v.chords;
  let t = from, i = 0, held = new Map(); // ratio → the event still sounding
  while (t < to - 1e-6 && chords.length) {
    const [degs, beats] = chords[i++ % chords.length];
    const dur = Math.min(beats * beat, to - t);
    let rs = degs.map((d) => degRatio(mode, d));
    if (rs.some((r) => clashAt(prior, t, dur, hz(r)))) rs = chords[0][0].map((d) => degRatio(mode, d));
    const next = new Map();
    for (const r of rs) {
      const e = held.get(r);
      if (e) { e.dur = t + dur - e.t; next.set(r, e); } else { const n = { t, dur, ratio: r, vel }; out.push(n); next.set(r, n); }
    }
    held = next; t += dur;
  }
  return out;
}

function loop({ v, rng, beat, mode, from, to, prior }) {
  const out = [];
  for (let k = 0; ; k++) {
    const t0 = from + ((v.offset ?? 0) + k * v.period) * beat;
    if (t0 >= to) break;
    if (v.skip && rng() < v.skip) continue;
    for (const [at, beats, deg, vel] of v.figure) {
      const t = t0 + at * beat, dur = beats * beat, ratio = degRatio(mode, deg);
      if (t < to && !clashAt(prior, t, dur, hz(ratio))) out.push({ t, dur, ratio, vel: vel ?? v.vel ?? 0.3 });
    }
  }
  return out;
}

function notes({ v, beat, mode, from }) {
  return v.notes.map(([at, beats, deg, vel]) => ({ t: from + at * beat, dur: beats * beat, ratio: degRatio(mode, deg), vel: vel ?? v.vel ?? 0.5 }));
}

function walk({ v, rng, beat, mode, from, to, prior, phrases }) {
  const [lo, hi] = v.range, ends = v.ends ?? [0, 4], step = v.step ?? 0.7, penta = v.penta ?? 2;
  const durs = v.durs ?? [[1, 2], [2, 3], [3, 1]], endBeats = v.endBeats ?? [3, 4], nNotes = v.notes ?? [4, 7];
  const restB = v.rest ?? [5, 9], [vq, vl] = v.vel ?? [0.5, 0.7], rubato = v.rubato ?? 0.03, legato = v.legato ?? 0.92;
  const motif = v.motif, every = motif?.every ?? [2, 4];
  const isPenta = (d) => inSet(degRatio(mode, d), PENTATONIC);
  const isEnd = (d) => ends.includes(((d % 7) + 7) % 7);
  const fits = (t, dur, d) => !clashAt(prior, t, dur, hz(degRatio(mode, d)));
  const motifBeats = motif ? motif.notes.reduce((s, [, b]) => s + b, 0) : 0;
  const out = [], mine = [];
  let t = from, prev = v.start ?? (motif ? motif.notes[0][0] : Math.round((lo + hi) / 2));
  let untilMotif = motif?.first ? 0 : motif ? pick(rng, every) : Infinity;

  // one note of a generated phrase: from `cur`, toward `aim`, a step with chance `step`, else a third to a fifth
  function choose(cur, aim, tt, dur) {
    const cand = [];
    for (let dd = -4; dd <= 4; dd++) {
      const d = cur + dd;
      if (d < lo || d > hi || !fits(tt, dur, d)) continue;
      if (dd && isTritone(degRatio(mode, cur), degRatio(mode, d))) continue;
      let w = dd === 0 ? 0.15 : Math.abs(dd) === 1 ? step : (1 - step) / 3;
      if (Math.sign(dd) === Math.sign(aim - cur)) w *= 2.2;
      if (isPenta(d)) w *= penta;
      cand.push([d, w]);
    }
    return cand.length ? weighted(rng, cand) : null;
  }

  function genPhrase(t0) {
    const n = pick(rng, nNotes), seq = [];
    const beatsOf = Array.from({ length: n }, (_, i) => (i === n - 1 ? pick(rng, endBeats) : weighted(rng, durs)));
    const peakAt = Math.max(1, Math.floor(n / 2 + (rng() - 0.5) * 2)), peak = Math.min(hi, prev + pick(rng, [2, 5]));
    let tt = t0, cur = prev;
    for (let i = 0; i < n; i++) {
      const dur = beatsOf[i] * beat;
      let d;
      if (i === n - 1) { // the cadence: the nearest D or A within a fifth, from above if it can
        const cand = [];
        for (let x = lo; x <= hi; x++) if (isEnd(x) && fits(tt, dur, x)) cand.push(x);
        cand.sort((a, b) => (Math.abs(a - cur) - (a > cur ? 0.1 : 0)) - (Math.abs(b - cur) - (b > cur ? 0.1 : 0)));
        d = cand.find((x) => x !== cur) ?? cand[0] ?? null;
      } else {
        const aim = i < peakAt ? peak : lo + 1;
        d = i === 0 ? choose(prev, prev + (rng() < 0.5 ? -2 : 2), tt, dur) : choose(cur, aim, tt, dur);
      }
      if (d == null) d = cur;
      seq.push([d, beatsOf[i]]); cur = d; tt += dur;
    }
    return seq;
  }

  function motifPhrase() {
    const seq = motif.notes.map(([d, b]) => [d, b]);
    if (motif.vary && rng() < motif.vary && seq.length > 4) { // a new cadence: the head as written, the last note the other of D and A
      const cur = seq[seq.length - 2][0], c = [];
      for (let x = lo; x <= hi; x++) if (isEnd(x) && x !== seq[seq.length - 1][0] && Math.abs(x - cur) <= 4) c.push(x);
      c.sort((a, b) => Math.abs(a - cur) - Math.abs(b - cur));
      if (c.length) seq[seq.length - 1][0] = c[0];
    }
    return seq;
  }
  const seqFits = (seq, t0) => { let tt = t0; for (const [d, b] of seq) { if (!fits(tt, b * beat, d)) return false; tt += b * beat; } return true; };

  const beatsOf = (seq) => seq.reduce((s, [, b]) => s + b, 0) * beat;
  const tryMotif = (closing) => {
    const m = closing ? motif.notes.map(([d, b]) => [d, b]) : motifPhrase();
    for (let shift = 0; shift <= 4; shift++) if (seqFits(m, t + shift * beat)) { t += shift * beat; return m; }
    return null;
  };
  while (t < to) {
    let seq = null, closing = false;
    if (motif && untilMotif <= 0) { seq = tryMotif(false); untilMotif = pick(rng, every); } else untilMotif--;
    if (!seq) seq = genPhrase(t);
    // close with the motif, as written, when no further phrase and the motif would fit after this one
    if (motif?.last && t + beatsOf(seq) + (restB[0] + motifBeats) * beat > to) { closing = true; seq = tryMotif(true) ?? seq; }
    const total = beatsOf(seq);
    if (t + total > to + 1e-6) break;
    const ph = [];
    let tt = t;
    seq.forEach(([d, b], i) => {
      const arch = seq.length > 1 ? Math.sin(Math.PI * i / (seq.length - 1)) : 1;
      // rubato moves the onset off the grid the roughness check judged, so it is checked again: a jittered note never
      // starts before the phrase's previous note ends (a melody does not sound two notes at once), and one that would
      // now sound rough against an earlier voice (an early onset under the end of a held chord) goes back to the grid
      // (or as near it as the previous note allows)
      const prevEnd = ph.length ? ph[ph.length - 1].t + ph[ph.length - 1].dur : -Infinity, dur = b * beat * legato;
      let jit = i === 0 ? 0 : (rng() - 0.5) * 2 * rubato * beat;
      jit = Math.max(jit, prevEnd - tt);
      if (jit && !fits(tt + jit, dur, d)) jit = Math.max(0, prevEnd - tt);
      const e = { t: tt + jit, dur, ratio: degRatio(mode, d), vel: Math.min(1, vq + (vl - vq) * arch + (rng() - 0.5) * 0.04) };
      out.push(e); ph.push(e); tt += b * beat;
    });
    mine.push(ph);
    prev = seq[seq.length - 1][0];
    let rest = pick(rng, restB) * beat; // and leave room for the closing motif if a rest this long would not
    if (motif?.last) rest = Math.max(restB[0] * beat, Math.min(rest, to - (t + total) - motifBeats * beat));
    t += total + rest;
    if (closing) break;
  }
  phrases[v.id] = mine;
  return out;
}

function follow({ v, beat, mode, from, to, prior, phrases }) {
  const lead = phrases[v.of];
  if (!lead) throw new Error(`follow: no phrases from voice '${v.of}' (list it before '${v.id}')`);
  const out = [], every = v.every ?? 2, start = v.start ?? 1, ratios = v.ratios ?? [2 / 3, 3 / 4];
  lead.forEach((ph, i) => {
    if (i < start || (i - start) % every || ph[0].t < from || ph[0].t >= to) return;
    for (const e of ph) {
      const t = e.t + (v.delay ?? 0) * beat;
      const r = ratios.map((k) => e.ratio * k).find((r) => inSet(r, mode) && hz(r) >= FLOOR_HZ && !clashAt(prior, t, e.dur, hz(r)));
      if (r) out.push({ t, dur: e.dur, ratio: r, vel: e.vel * (v.vel ?? 0.7) });
    }
  });
  return out;
}

export const GENERATORS = { drone, loop, walk, follow, notes };

// ---------------------------------------------------------------- compose
export function leadOf(track) {
  return (track.voices.find((v) => v.role === 'lead') || track.voices.find((v) => v.gen === 'walk') || {}).id ?? null;
}

export function compose(track, seed = track.seed ?? 1) {
  const beat = 60 / track.bpm, mode = modeOf(track), out = [], phrases = {}, order = {};
  track.voices.forEach((v, i) => {
    order[v.id] = i;
    const gen = GENERATORS[v.gen];
    if (!gen) throw new Error(`voice '${v.id}': unknown gen '${v.gen}'`);
    const rng = mulberry32((Math.imul(seed >>> 0, 2654435761) ^ hashStr(v.id)) >>> 0);
    const from = v.from ?? 0, to = Math.min(v.to ?? track.length, track.length);
    const evs = gen({ v, rng, beat, mode, from, to, prior: out.slice(), phrases, track });
    for (const e of evs) {
      const t = r3(Math.max(0, e.t));
      out.push({ t, dur: r3(Math.min(e.dur, track.length - t)), voice: v.id, ratio: Math.round(e.ratio * 1e9) / 1e9, vel: r3(e.vel) });
    }
  });
  return out.filter((e) => e.dur > 0).sort((a, b) => a.t - b.t || order[a.voice] - order[b.voice] || a.ratio - b.ratio);
}
