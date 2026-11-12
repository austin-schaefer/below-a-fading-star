// Audio: everything synthesised with WebAudio, started on the first click (the `begin` event).
// Wind, a low drone that swells when the sun gutters, footsteps by ground, place sounds (tarn, fen, Lattice,
// Cardinal Stones), calls (wings, crows, fish) and a faint counting click near the deodand.
// Exposes ctx.audio = { cue(name, position?, opts?), ctx: AudioContext, master, analyser, cueAnalyser, voices, fall,
// muted, setMuted(bool), mute (the GainNode after the limiter), volume (0..1), setVolume(v), vol (the GainNode after mute),
// levels { music, effects, ambience } (0..1, the settings panel's three sub-sliders, v9-M6), setLevel(kind, v) }. Chain: master -> bus compressor -> limiter (a net) -> mute -> vol -> out; audio.space (graph.js) is the listener's room.
// A no-op without AudioContext. One-shots share the cue bus (with its own analyser tap for tools/audio-test.mjs)
// and a hard cap of 12 voices, the oldest stolen. Positions are {x,y,z}, copied at the call.
//
// Where each part lives (src/audio/; each file's header says what it owns and which v7.2 brief voices it next):
//   graph.js   the AudioContext, master -> busComp -> limiter -> mute -> vol, the three rooms and the water's slap by
//              place (a.space), the distance model (voice, panned), the buses and noise buffers, the
//              listener, voice() and the cap, oneShotPanner, the helpers; startGraph returns the shared object `a`
//   bed.js     wind, drone, shimmer, the gutter's dip and swell, insects
//   steps.js   footsteps by ground, the step ring, audio.echoStep, figureStep
//   calls.js   the tarn's lap, the Lattice's hum, the fen's bubbles and frogs, the far call, the deodand's click; the phrasing (caller, placed)
//   cues.js    the cue dispatcher, the older one-shots, the Cardinal Stones, the fall's loop; cues-v2.js the v2 and
//              v5 one-shots (carillon to kept-fire); living.js v7's figures
//   regions.js the v4 regions' sound hooks and their kit
//   music/     v9: the director, the player and the tracks (index.js is the glue; audio.music)
//   synth.js   noise buffers (looped with a true crossfade at the seam) and the rooms' impulses (makeSpace)
// This file: build(ctx), the mute button, the ctx.audio surface, and the wiring that starts the parts in the shared
// stream's order of draws and ticks them at 10 Hz in the same order.
//
// Cues: name (position, opts): range
//   cry, crows, flush, plop, rumble, farcry, skycreak, eyes-close, eyes-open, slinker-seen, slinker-gone,
//   traveller-greet, tarn-hum, tarn-step (pos): voices (the cap, the air's lowpass), v7.2-04's formant cries and soft grains;
//   strike (stone index 0..3) rings on the stones' own panners
//   carillon (cap pos, { note: 0..8, quiet? }): a worn bronze bell, 2.5-4 s; quiet = a third the gain: ~260 m
//   glyph-shift (lintel pos): a low stone grind, sinking then rising, and a grit tail, 2 s: 40 m
//   sward-close (centre): a dry petal rustle swelling and fading as a wave across the sward, 1.5 s: ~240 m
//   sward-open (centre): the same, slower and softer, 4 s: ~240 m
//   sward-whimper (head pos): one tiny breathy pitched sigh, 0.3-0.6 s: 20 m
//   pedlar-pass (pos): a dragonfly wing-whirr sliding down in pitch as it passes, and a salt-goad tink, 0.4 s: 30 m
//   wrong-colour-near (pos): nearly a chord, beating, sagging, 3 s, quiet: 60 m
//   fall-rumble-enter / fall-rumble-leave (fall {x,y,z}): start / fade (2 s) the fall's positional rumble loop,
//     whose gain follows ctx.river.rumble (0..1), read at 10 Hz whether or not the cues arrive
//   procession (pos, ~300 m off): nine faint high whistles under a slow tremolo, 6-8 s: anywhere
//   guest-heartbeat (pos ignored, { strength: 0.05..1 }): lub-dub, centre, no rolloff; louder, brighter with strength
//   galley-drum (hull pos, { distance }): one deep damped boom, more muffled with distance, falling fast past 36 m: 130 m
//   lizard-skitter (pos): a few dry claw grains on stone, 0.2-0.3 s: 20 m
//   rooks-lift (centroid, { count }): wing clatter of the flock and two or three caws, 1.5 s: ~260 m
//   bats-out (tower window pos, { count }): a soft fluttering rush and a few faint squeaks, 3-4 s: 200 m
//   wader-gone (pos, { quiet }): a breath of air and one soft plip: 35 m
//   biomesh-settle (tile pos, { quiet }): a tiny glassy tick, 60-120 ms, at most one per 0.6 s: 25 m
//   lamp-tick (a Leerie standard lighting, v5/lights.js): a dark tock and the flame's breath, 0.9 s: 16 m
//   kept-fire (hearth pos, { flare?, strength? }): a fire's crackle, 1.8 s, pops and a hiss: 70 m; flare: a roar swelling under thick crackle and a low whump, 3.4 s: 130 m
//   hawser-groan (the chain's midpoint): iron dragged one link through the paving, a sagging groan, the grind, a long ring, 7.4 s: the whole bowl
//   v7, the living (src/audio/living.js, which lists each one's make and range): taker-click, taker-murmur, coheirs-knot,
//     coheirs-hum ({ start } / { stop }: a loop), sexton-bite, sexton-throw, sleeper-breath, sleeper-fruit, stylite-creak,
//     accrescent-step, moles-click, thurifer-chain, thurifer-hiss ({ start } / { stop }: a loop that follows the figure),
//     leerie-click, bather-pour, leerie-step and linkboy-step (footsteps by the ground under them, through stepSynth);
//     the Link-Boy's flutter is a loop by distance alone. audio.living.loops holds the loops' state for tests
import { startGraph, clamp } from './audio/graph.js';
import { startBed, startInsects } from './audio/bed.js';
import { startSteps } from './audio/steps.js';
import { startPlaces, startCalls } from './audio/calls.js';
import { startCues } from './audio/cues.js';
import { startRegions } from './audio/regions.js';
import { startLiving } from './audio/living.js';
import { startHouseSound } from './v8/house/sound.js'; // v8-05
import { startTwk } from './v8/twk/voice.js'; // v8-07: the Twk-men's buzz and chirrup

// The touch mute button (#mute, top right; shown on touch devices only). A short tap toggles
// ctx.audio.setMuted; a 1.2 s hold without moving reveals the debug panel instead, as the
// corner long-press on the canvas does.
let syncMuteButton = () => {};
export const LEVELS = ['music', 'effects', 'ambience'];
function wireMuteButton(ctx, audio) {
  const btn = typeof document !== 'undefined' && document.getElementById('mute');
  if (!btn) return;
  syncMuteButton = () => {
    btn.setAttribute('aria-pressed', audio.muted ? 'true' : 'false');
    btn.setAttribute('aria-label', audio.muted ? 'unmute sound' : 'mute sound');
  };
  syncMuteButton();
  let id = null, sx = 0, sy = 0, timer = 0, armed = false;
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (id !== null) return;
    const t = e.changedTouches[0];
    id = t.identifier; sx = t.clientX; sy = t.clientY; armed = true;
    btn.classList.add('held');
    clearTimeout(timer);
    timer = setTimeout(() => { if (armed) { armed = false; ctx.debug?.reveal(); } }, 1200);
  }, { passive: false });
  btn.addEventListener('touchmove', (e) => {
    e.preventDefault(); e.stopPropagation();
    for (const t of e.changedTouches) {
      if (t.identifier === id && Math.hypot(t.clientX - sx, t.clientY - sy) > 14) { armed = false; clearTimeout(timer); }
    }
  }, { passive: false });
  const end = (e) => {
    e.stopPropagation();
    for (const t of e.changedTouches) {
      if (t.identifier !== id) continue;
      clearTimeout(timer);
      if (armed && e.type === 'touchend') audio.setMuted(!audio.muted);
      armed = false; id = null; btn.classList.remove('held');
    }
  };
  btn.addEventListener('touchend', end); btn.addEventListener('touchcancel', end);
  btn.addEventListener('click', () => audio.setMuted(!audio.muted)); // assistive tech; touch taps preventDefault the click
}

export async function build(ctx) {
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  const audio = ctx.audio = { ctx: null, master: null, analyser: null, started: false, cue: () => {}, muted: false, mute: null, setMuted, volume: 1, vol: null, setVolume, levels: { music: 1, effects: 1, ambience: 1 }, setLevel };
  // Mute: a gain after the limiter, ramped rather than suspending the context (other code reads
  // ac.currentTime, which suspend freezes). Remembered in localStorage; settable before start().
  try { audio.muted = localStorage.getItem('fp-muted') === '1'; } catch (e) { /* private mode */ }
  function setMuted(on) {
    audio.muted = !!on;
    try { localStorage.setItem('fp-muted', audio.muted ? '1' : '0'); } catch (e) { /* private mode */ }
    const g = audio.mute && audio.mute.gain;
    if (g) {
      const t = audio.ctx.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(audio.muted ? 0 : 1, t + 0.15);
    }
    syncMuteButton();
    ctx.events.dispatchEvent(new CustomEvent('audiochange'));
  }
  // Volume (the settings panel's slider): 0..1 on a gain after the mute gain, with a squared taper so the
  // slider is even to the ear; 1 is the level the mix was made at. Remembered in localStorage; settable before start().
  try { const v = parseFloat(localStorage.getItem('fp-volume')); if (v >= 0 && v <= 1) audio.volume = v; } catch (e) { /* private mode */ }
  function setVolume(v) {
    audio.volume = clamp(+v || 0, 0, 1);
    try { localStorage.setItem('fp-volume', String(audio.volume)); } catch (e) { /* private mode */ }
    const g = audio.vol && audio.vol.gain;
    if (g) {
      const t = audio.ctx.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(audio.volume * audio.volume, t + 0.05);
    }
    ctx.events.dispatchEvent(new CustomEvent('audiochange'));
  }
  // The three parts of the sound (v9-M6): music (the music bus), effects (footsteps, one-shot cues, the figures: the dry
  // and cue buses) and ambience (the wind, the drone and every bed), each 0..1 on its own gains in graph.js
  // (audio.levelGains) with the volume's squared taper; 1 leaves the mix as made. Remembered as fp-level-<kind>.
  for (const k of LEVELS) { try { const v = parseFloat(localStorage.getItem('fp-level-' + k)); if (v >= 0 && v <= 1) audio.levels[k] = v; } catch (e) { /* private mode */ } }
  function setLevel(kind, v) {
    if (!LEVELS.includes(kind)) return;
    const x = audio.levels[kind] = clamp(+v || 0, 0, 1);
    try { localStorage.setItem('fp-level-' + kind, String(x)); } catch (e) { /* private mode */ }
    const gs = audio.levelGains?.[kind];
    if (gs) {
      const t = audio.ctx.currentTime;
      for (const n of gs) { const g = n.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(x * x, t + 0.05); }
    }
    ctx.events.dispatchEvent(new CustomEvent('audiochange'));
  }
  wireMuteButton(ctx, audio);
  if (!AC) { ctx.log('audio: no AudioContext, silent'); return; }
  ctx.events.addEventListener('begin', () => {
    if (audio.started) return;
    audio.started = true;
    try { start(); } catch (e) { console.error('[fp] audio failed to start:', e); audio.cue = () => {}; }
  });

  function start() {
    // the parts start in this order because each draws from the shared stream (a.rng) as it builds: the reverb and
    // noise buffers, the wind, the tarn's lap, the carillon's tuning, the regions, the insects, the first call
    const a = startGraph(ctx, audio, AC), ac = a.ac, cam = ctx.camera.position;
    const bed = startBed(a);
    startSteps(a);
    const places = startPlaces(a);
    const cues = startCues(a);
    const regionSnd = startRegions(a);
    // v7, the living: the figures' sounds (src/audio/living.js)
    const living = a.living = audio.living = startLiving(a);
    a.twk = startTwk(a); // v8-07: twk-buzz, twk-chirrup, twk-quarrel
    audio.cue = cues.cue;
    const insects = startInsects(a);
    const calls = startCalls(a);
    a.house = startHouseSound(a, ctx); // v8-05: the Pomegranate House's voices (its own rng, after every shared draw)
    let music = null; // v9-M2: the music's glue (audio/music/index.js), loaded on its own so a fault there cannot take the sound down
    import('./audio/music/index.js').then((m) => { music = audio.music = m.startMusic(a, ctx); }).catch((e) => console.warn('[fp] music failed to load:', e));

    // ================================================================ per-frame control
    let tick = 0;
    const f = { now: 0, t: 0, step: 0, px: 0, pz: 0, b: null, wood: 0, inKeep: 0, swellSm: 0 };
    // The fall follows the river on its own clock as well as on frames: under load frames can be
    // seconds apart, and a loop that waits for one starts late or stays up after the player has left.
    let lastFrame = performance.now();
    const fallTimer = setInterval(() => {
      if (ac.state === 'closed') { clearInterval(fallTimer); return; }
      if (performance.now() - lastFrame > 250) { cues.fallTick(0.1, performance.now() / 1000, ac.currentTime); living.tick(); }
    }, 100);
    function update(dt, t) {
      lastFrame = performance.now();
      if (ac.state === 'suspended') ac.resume?.();
      a.setListener();
      const now = ac.currentTime;
      a.updateLead(dt, now);
      tick -= dt;
      if (tick > 0) return;
      const step = 0.1 - tick; tick = 0.1;
      const px = cam.x, pz = cam.z;
      cues.fallTick(step, t, now);
      living.tick(); // v7 loops: follow, release, reopen
      regionSnd?.tick(px, pz, step, t, now); // v4 regions
      f.now = now; f.t = t; f.step = step; f.px = px; f.pz = pz; f.b = ctx.terrain.biomeAt(px, pz);
      bed.update(f); // wind, drone, shimmer; writes f.wood, f.inKeep, f.swellSm
      places.update(f); // tarn lap, fen bubbles, lattice hum
      cues.update(f); // the stones, struck as you come near
      insects.update(f);
      calls.update(f); // frogs, distant calls, the deodand's click
      music?.update(f); // v9: the director's step, the player's calls
    }
    ctx.registerUpdate(update);
    ctx.log('audio: started');
  }
}
