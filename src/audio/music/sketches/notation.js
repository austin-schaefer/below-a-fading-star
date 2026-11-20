// A sketch's parts, written note by note as text, turned into the player's events. Pure JS (Node and the browser).
//
// A PART is tokens separated by spaces:
//   D4:1        a note: its name (C D E F G A B, # or b, the octave; A4 = 440 Hz, equal temperament) and its length in beats
//   Bb3+D4:2    a chord: names joined by +
//   -:1.5       a rest
//   B:.5        on a voice with a `kit` ({ B: 1, T: 2 }), a drum by its letter (an unpitched patch's nth sample)
//   <.7>        the velocity from here on (0..1)
//   |           a barline: the notes since the last one must add up to the sketch's `meter` beats, or parse throws
//               (the check a copyist makes; a part's first bar may be any length up to it)
// A VOICE is { id, patch, part, osc?, oscRing?, vel?, gain?, legato?, accents?, kit? }: patch is the instrument
// (a sampled 's-...' patch or an oscillator one); osc, the oscillator patch that plays the same notes in the
// 'osc' variant; oscRing, beats added to each note there (a struck oscillator patch rings only as long as its note
// is written); gain scales every velocity; legato is the share of its beats a note sounds (default 1); accents
// are multipliers cycled over the notes ([1, .6, .7]: a strong first of three).
// A SKETCH is { name, place, line, bpm, meter, tempo?, oscGain?, voices }: bpm is beats a minute; tempo, when given, is
// [[beat, bpm], ...] joined by straight lines (a ritardando), the last value holding to the end; oscGain scales the
// 'osc' variant so the two are compared at one loudness.
import { D3 } from '../score.js';

const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOTE = /^([A-G])([#b]?)(-?\d)$/;
export function hzOf(name) {
  const m = NOTE.exec(name);
  if (!m) throw new Error(`notation: '${name}' is not a note`);
  const midi = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12 * (+m[3] + 1);
  return 440 * 2 ** ((midi - 69) / 12);
}

// → { notes: [{ beat, beats, names: [..], vel, bar }], beats (the part's length), bars }
export function parsePart(part, { meter = 0, kit = null, vel = 0.6, id = '?' } = {}) {
  const notes = [];
  let beat = 0, barStart = 0, bar = 0, v = vel;
  for (const tok of part.trim().split(/\s+/)) {
    if (tok === '|') {
      const len = beat - barStart;
      if (meter && Math.abs(len - meter) > 1e-6 && !(bar === 0 && len < meter)) throw new Error(`notation: voice '${id}' bar ${bar + 1} is ${len} beats, not ${meter}`);
      barStart = beat; bar++;
      continue;
    }
    const dyn = /^<([\d.]+)>$/.exec(tok);
    if (dyn) { v = +dyn[1]; continue; }
    const i = tok.lastIndexOf(':'), beats = +tok.slice(i + 1), what = tok.slice(0, i);
    if (i < 1 || !(beats > 0)) throw new Error(`notation: voice '${id}': bad token '${tok}'`);
    if (what !== '-') {
      const names = what.split('+');
      for (const n of names) if (!(kit && n in kit) && !NOTE.test(n)) throw new Error(`notation: voice '${id}': '${n}' in '${tok}' is neither a note nor in the kit`);
      notes.push({ beat, beats, names, vel: v, bar });
    }
    beat += beats;
  }
  const last = beat - barStart;
  if (meter && last > meter + 1e-6) throw new Error(`notation: voice '${id}' last bar is ${last} beats, over ${meter}`);
  return { notes, beats: beat, bars: bar + (last > 0 ? 1 : 0) };
}

// seconds at a beat, under a constant bpm or a tempo map of straight lines
export function clockOf(sketch) {
  const map = sketch.tempo;
  if (!map) return (beat) => beat * 60 / sketch.bpm;
  const bpmAt = (b) => {
    if (b <= map[0][0]) return map[0][1];
    for (let i = 1; i < map.length; i++) if (b <= map[i][0]) { const [b0, t0] = map[i - 1], [b1, t1] = map[i]; return t0 + (t1 - t0) * (b - b0) / (b1 - b0); }
    return map[map.length - 1][1];
  };
  const STEP = 1 / 64;
  return (beat) => { let t = 0; for (let b = 0; b < beat - 1e-9; b += STEP) { const d = Math.min(STEP, beat - b); t += d * 60 / bpmAt(b + d / 2); } return t; };
}

// the sketch as the player's events ([{ t, dur, voice, ratio, vel }], sorted) and the voices' patches for a variant
// ('sampled': each voice's patch; 'osc': its `osc` patch, for the voices that have one)
export function eventsOf(sketch, variant = 'sampled') {
  const clock = clockOf(sketch), events = [], voices = [];
  let beats = 0;
  sketch.voices.forEach((voice, order) => {
    const osc = variant === 'osc';
    if (osc && !voice.osc) throw new Error(`sketch '${sketch.name}': voice '${voice.id}' has no oscillator patch`);
    voices.push({ id: voice.id, patch: osc ? voice.osc : voice.patch });
    const p = parsePart(voice.part, { meter: sketch.meter, kit: voice.kit, vel: voice.vel ?? 0.6, id: voice.id });
    beats = Math.max(beats, p.beats);
    p.notes.forEach((n, i) => {
      const t = clock(n.beat), end = clock(n.beat + n.beats * (voice.legato ?? 1) + (osc ? voice.oscRing ?? 0 : 0));
      const acc = voice.accents ? voice.accents[i % voice.accents.length] : 1;
      for (const name of n.names) {
        const ratio = voice.kit && name in voice.kit ? voice.kit[name] : hzOf(name) / D3;
        events.push({ t: Math.round(t * 1000) / 1000, dur: Math.round((end - t) * 1000) / 1000, voice: voice.id, ratio, vel: Math.round(n.vel * acc * (voice.gain ?? 1) * (osc ? sketch.oscGain ?? 1 : 1) * 1000) / 1000, order });
      }
    });
  });
  events.sort((a, b) => a.t - b.t || a.order - b.order || a.ratio - b.ratio);
  for (const e of events) delete e.order;
  return { events, voices, beats, seconds: clock(beats) };
}

// a voice's part as a musician would read it aloud: bar by bar, each note's name and its length in beats
export function partText(sketch, id) {
  const voice = sketch.voices.find((v) => v.id === id), p = parsePart(voice.part, { meter: sketch.meter, kit: voice.kit, id });
  const bars = [];
  let at = 0;
  for (const tok of voice.part.trim().split(/\s+/)) {
    if (tok === '|') { at++; continue; }
    if (/^<.*>$/.test(tok)) continue;
    (bars[at] ??= []).push(tok.replace(':', ' ').replace(/^- /, 'rest '));
  }
  return bars.map((b, i) => `${String(i + 1).padStart(2)}: ${(b || []).join(', ')}`).join('\n') + `\n(${p.beats} beats)`;
}
