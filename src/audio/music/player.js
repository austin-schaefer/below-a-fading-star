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
//     quality  'high' | 'medium' | 'low' (low: fewer detuned oscillators); default 'high'
//     gain     the stem's starting level 0..1 (default 1; the stem fades in from 0 over 0.05 s at `at`)
//   Live, one timer schedules events about 2 s ahead on the audio clock; on an OfflineAudioContext everything is
//   scheduled at once (there is no wall clock to wait on).
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
export const MAX_POOL = 10; // voices a track may hold at once (moor needs 9: a pad chord crossfading into the next holds four); a note that finds none is dropped (h.dropped)
const GAP = 0.02; // a voice is free this long after its note's release ends, before it is retuned

// Which voice of its patch each event takes: greedy over the sorted events, a voice free once the note's release is
// over. The pool is sized by this (each patch as many voices as it ever needs at once), so nothing is stolen.
export function allocate(events, voices) {
  const patchOf = new Map(voices.map((v) => [v.id, v.patch]));
  const busy = {}, slots = [], plan = {};
  let total = 0, dropped = 0, end = 0;
  for (const e of events) {
    const patch = patchOf.get(e.voice);
    if (!patch) throw new Error(`music: event voice '${e.voice}' is not in the track's voices`);
    const until = e.t + e.dur + tail(patch, e.dur) + GAP;
    const list = (busy[patch] ??= []);
    let k = list.findIndex((u) => u <= e.t);
    if (k < 0 && total < MAX_POOL) { k = list.length; list.push(0); total++; }
    if (k < 0) { slots.push(-1); dropped++; continue; }
    list[k] = until; slots.push(k);
    end = Math.max(end, until);
  }
  for (const [p, l] of Object.entries(busy)) plan[p] = l.length;
  return { patchOf, slots, plan, dropped, length: end };
}

// a voice id's place in the stereo field: spread by its order in the track, small (the stem is mostly centred)
const panOf = (voices) => new Map(voices.map((v, i) => [v.id, i === 0 ? 0 : (((i * 0.618034) % 1) - 0.5) * 0.6]));

export function play(events, { ac, dest, voices, at = ac.currentTime + 0.1, quality = 'high', gain = 1 } = {}) {
  const offline = typeof OfflineAudioContext !== 'undefined' && ac instanceof OfflineAudioContext;
  const { patchOf, slots, plan, dropped, length } = allocate(events, voices);
  const pans = panOf(voices);
  const stem = ac.createGain();
  stem.gain.setValueAtTime(0, at);
  stem.gain.linearRampToValueAtTime(gain, at + 0.05);
  stem.connect(dest);
  const vs = makeVoices(ac, stem, { quality, plan });
  const clock = ac.createConstantSource(); clock.offset.value = 0; clock.connect(stem);
  const t0 = Math.max(at, ac.currentTime);
  vs.start(t0); clock.start(t0);
  let endAt = at + length + 0.05;
  vs.stop(endAt); clock.stop(endAt);

  let next = 0, timer = null, stopping = null, disposed = false, resolveDone;
  const done = new Promise((r) => { resolveDone = r; });
  const h = { playing: true, ended: false, length, dropped, done, plan,
    get t() { return ac.currentTime - at; } };

  function schedule(until) {
    for (; next < events.length && at + events[next].t < until; next++) {
      const e = events[next], k = slots[next];
      if (k < 0) continue;
      const when = at + e.t;
      if (when < ac.currentTime) continue; // late (a stalled tab): skip rather than click in mid-note
      const patch = patchOf.get(e.voice), v = vs.pool[patch][k];
      vs.place(v, when, pans.get(e.voice));
      v.note(when, D3 * e.ratio, e.dur, e.vel);
    }
  }
  function dispose() {
    if (disposed) return; disposed = true;
    if (timer) clearInterval(timer);
    h.playing = false; h.ended = true;
    try { stem.disconnect(); } catch { /* already */ }
    resolveDone();
  }
  clock.onended = dispose;

  if (offline) schedule(Infinity);
  else { schedule(ac.currentTime + LOOKAHEAD); timer = setInterval(() => schedule(ac.currentTime + LOOKAHEAD), TICK_MS); }

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
    if (timer) { clearInterval(timer); timer = null; }
    next = events.length; // schedule nothing more
    const end = now + f + 0.05;
    if (end < endAt) { endAt = end; try { vs.stop(end); clock.stop(end); } catch { /* stop twice on some engines */ } }
    stopping = done;
    return stopping;
  };
  return h;
}
