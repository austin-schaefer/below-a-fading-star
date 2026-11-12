// The player: turns a composed event list (score.js compose) into sound on any BaseAudioContext, live or offline.
// It owns no bus and reads nothing from the world: the director (director.js, v9-M2) decides when, and passes the
// destination (the musicBus). One call to play() is one track; it builds its own small voice pool (patches.js:
// at most 6 persistent voices, no node made per note) and tears it down when it ends or is stopped.
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
