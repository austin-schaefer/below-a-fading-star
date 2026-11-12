// The player: turns a composed event list (score.js compose) into sound on any BaseAudioContext, live or offline.
// It owns no bus and reads nothing from the world: the director (director.js, v9-M2) decides when, and passes the
// destination (the musicBus). One call to play() is one track; it builds its own small voice pool (patches.js:
// at most 10 persistent voices, as many of each patch as the track ever needs at once, no node made per note) and tears it down when it ends or is stopped.
//
// INTERFACE (agreed with v9-M2; change only together)
//
//   import { play } from './music/player.js';
//   const h = play(events, { ac, dest, voices, at, quality, gain });
//     events   compose(track, seed) output: [{ t, dur, voice, ratio, vel }], seconds, ratio from D3 = 146.83 Hz
//     ac       the AudioContext or OfflineAudioContext
//     dest     an AudioNode the stem connects to (the musicBus live; the context's destination offline)
//     voices   the track's `voices` array: maps each event's `voice` id to its `patch` (pad organ flute choir bell)
//     at       audio-clock time the track's t = 0 falls on (default ac.currentTime + 0.1)
//     quality  'high' | 'medium' | 'low' (low: fewer detuned oscillators, a pool of LOW_POOL, no tape hiss); default 'high'
//     gain     the stem's starting level 0..1 (default 1; the stem fades in from 0 over 0.05 s at `at`)
//   Live, one timer schedules events about 2 s ahead on the audio clock, and issues the sources' one stop() once the
//   end (the track's, or a stop()'s fade) is inside that lookahead: older WebKit refuses a second stop() on a source,
//   so a source is never stopped twice. On an OfflineAudioContext everything is scheduled at once (there is no wall
//   clock to wait on). A note that throws as it is scheduled is skipped (warned once) and the schedule goes on.
//
//   h.stop(fade = 1.5)   fade the stem to silence over `fade` s, then free the voices; safe at any moment and
//                        more than once. Returns a Promise that resolves when it is silent and disposed.
//   h.fadeTo(g, s)       ramp the stem's level to g (0..1) over s seconds (ducking); does not stop
//   h.playing            true from play() until ended
//   h.t                  seconds into the track now (ac.currentTime - at; negative before it starts)
//   h.ended              true once the last note's release has finished or stop() has completed
//   h.length             seconds from t = 0 to the end of the last release
//   h.done               a Promise resolving when ended
//
// The stem is quiet by design: a track at gain 1 straight into a destination measures about -35 LUFS (the bed's
// level or under; tools/music-render.mjs gates it at -38 to -32). The director's bus sets the mix, not the player.
import { D3 } from './score.js';
import { makeVoices, tail } from './patches.js';

export const LOOKAHEAD = 2; // seconds of events on the audio clock ahead of now
export const TICK_MS = 250;
export const MAX_POOL = 10; // voices a track may hold at once (moor needs 9: a pad chord crossfading into the next holds four); past it, a voice is stolen (allocate)
export const LOW_POOL = 7; // on the low tier (a phone): a stolen voice's note is cut short, which the ear forgives
const GAP = 0.02; // a voice is free this long after its note's release ends, before it is retuned

// Which voice of its patch each event takes: greedy over the sorted events, a voice free once the note's release is
// over. The pool is sized by this (each patch as many voices as it ever needs at once, MAX_POOL in all). When the pool
// is full, a note takes its patch's voice whose note ends soonest, and that note is cut: silent by GAP before the new
// one starts (cuts[i], its release shortened to 40 ms or more; patches.js cut()). Only a patch with no voice at all
// once the pool is full drops its note (h.dropped).
export function allocate(events, voices, maxPool = MAX_POOL) {
  const patchOf = new Map(voices.map((v) => [v.id, v.patch]));
  const busy = {}, slots = [], cuts = new Array(events.length).fill(Infinity), plan = {};
  let total = 0, dropped = 0, stolen = 0, end = 0;
  events.forEach((e, i) => {
    const patch = patchOf.get(e.voice);
    if (!patch) throw new Error(`music: event voice '${e.voice}' is not in the track's voices`);
    const until = e.t + e.dur + tail(patch, e.dur) + GAP;
    const list = (busy[patch] ??= []);
    let k = list.findIndex((u) => u.until <= e.t);
    if (k < 0 && total < maxPool) { k = list.length; list.push({ until: 0, ev: -1 }); total++; }
    if (k < 0 && list.length) { // steal the voice whose note ends soonest
      k = list.reduce((b, u, j) => (u.until < list[b].until ? j : b), 0);
      cuts[list[k].ev] = e.t - GAP; stolen++;
    }
    if (k < 0) { slots.push(-1); dropped++; return; }
    list[k] = { until, ev: i }; slots.push(k);
    end = Math.max(end, until);
  });
  for (const [p, l] of Object.entries(busy)) plan[p] = l.length;
  return { patchOf, slots, cuts, plan, dropped, stolen, length: end };
}

// a voice id's place in the stereo field: spread by its order in the track, small (the stem is mostly centred)
const panOf = (voices) => new Map(voices.map((v, i) => [v.id, i === 0 ? 0 : (((i * 0.618034) % 1) - 0.5) * 0.6]));

export function play(events, { ac, dest, voices, at = ac.currentTime + 0.1, quality = 'high', gain = 1 } = {}) {
  const offline = typeof OfflineAudioContext !== 'undefined' && ac instanceof OfflineAudioContext;
  const { patchOf, slots, cuts, plan, dropped, stolen, length } = allocate(events, voices, quality === 'low' ? LOW_POOL : MAX_POOL);
  const pans = panOf(voices);
  const stem = ac.createGain();
  stem.gain.setValueAtTime(0, at);
  stem.gain.linearRampToValueAtTime(gain, at + 0.05);
  stem.connect(dest);
  const vs = makeVoices(ac, stem, { quality, plan });
  const clock = ac.createConstantSource(); clock.offset.value = 0; clock.connect(stem);
  const t0 = Math.max(at, ac.currentTime);
  vs.start(t0); clock.start(t0);
  let endAt = at + length + 0.4; // the tape's hiss fades over the last 0.3 s
  let stopIssued = false, warned = false;
  // the one stop() of every source: at once offline, lazily live (when the end is inside the lookahead)
  function issueStop(force) {
    if (stopIssued || (!force && endAt > ac.currentTime + LOOKAHEAD)) return;
    stopIssued = true;
    const t = Math.max(endAt, ac.currentTime);
    vs.stop(t); clock.stop(t);
  }
  if (offline) issueStop(true);

  let next = 0, timer = null, stopping = null, disposed = false, resolveDone;
  const done = new Promise((r) => { resolveDone = r; });
  const h = { playing: true, ended: false, length, dropped, stolen, done, plan,
    get t() { return ac.currentTime - at; } };

  function schedule(until) {
    for (; next < events.length && at + events[next].t < until; next++) {
      const e = events[next], k = slots[next];
      if (k < 0) continue;
      const when = at + e.t;
      if (when < ac.currentTime) continue; // late (a stalled tab): skip rather than click in mid-note
      const patch = patchOf.get(e.voice), v = vs.pool[patch][k];
      try {
        vs.place(v, when, pans.get(e.voice));
        v.note(when, D3 * e.ratio, e.dur, e.vel, at + cuts[next]);
      } catch (err) { if (!warned) { warned = true; console.warn('[fp] music: a note was skipped:', err); } }
    }
  }
  function tick() { schedule(ac.currentTime + LOOKAHEAD); issueStop(false); }
  function dispose() {
    if (disposed) return; disposed = true;
    if (timer) clearInterval(timer);
    h.playing = false; h.ended = true;
    try { stem.disconnect(); } catch { /* already */ }
    resolveDone();
  }
  clock.onended = dispose;

  if (offline) schedule(Infinity);
  else { tick(); timer = setInterval(tick, TICK_MS); }

  h.fadeTo = (g, s = 1) => {
    if (stopping || disposed) return;
    const now = ac.currentTime, p = stem.gain;
    p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); p.linearRampToValueAtTime(g, now + Math.max(0.02, s));
  };
  h.stop = (fade = 1.5) => {
    if (stopping) return stopping;
    if (disposed) return Promise.resolve();
    const now = Math.max(ac.currentTime, at), p = stem.gain, f = Math.max(0.05, fade);
    p.cancelScheduledValues(now); p.setValueAtTime(now > at ? p.value : 0, now); p.linearRampToValueAtTime(0, now + f);
    next = events.length; // schedule nothing more
    const end = now + f + 0.4;
    if (end < endAt) {
      endAt = end;
      // offline the sources' stop was issued at the start: move it (Chromium allows a second stop on an offline
      // context, and there is no tick to wait for); live the tick issues the first and only one
      if (stopIssued) { try { vs.stop(end); clock.stop(end); } catch { /* an engine that refuses */ } }
    }
    if (!offline) issueStop(false);
    stopping = done;
    return stopping;
  };
  return h;
}
