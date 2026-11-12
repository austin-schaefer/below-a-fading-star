// The music glue (v9-M2): the director's decisions turned into calls on the player, on the live walk. Started by
// audio.js on "Go out" with the audio graph's shared object `a`; ticked from audio.js's 10 Hz update with its frame
// record `f`. Per tick it allocates nothing: the weights, the inputs and the director's actions are all reused.
//
//   audio.music = { setting, setSetting(s), tracks, play(name), stop(fade), playing (a name or null), log }
//   setting  'off' | 'rare' | 'default' | 'frequent' (settings panel, localStorage `fp-music`); ?music=<track> plays that
//            track 3 s after the walk begins and nothing else (the director is off for the load); ?music=0 is off.
//   ?musicspeed=N runs the director's waits N times faster (tests). The player is music/player.js (play(events, { ac, dest, voices, at, quality }) -> a handle); where it is absent
//   or fails to load, a silent stand-in keeps the clock so the director and the tests run the same.
import { compose } from './score.js';
import { CATALOG, BY_NAME } from './catalog.js';
import { makeDirector, SETTINGS } from './director.js';

export const MUSIC_KEY = 'fp-music';
export const readSetting = () => { try { const s = localStorage.getItem(MUSIC_KEY); if (SETTINGS.includes(s)) return s; } catch (e) { /* private mode */ } return 'default'; };
export const writeSetting = (s) => { try { localStorage.setItem(MUSIC_KEY, s); } catch (e) { /* private mode */ } };

// the stand-in for a player that is missing: the same handle, no sound
function stubPlay(events, o) {
  const at = o.at ?? o.ac.currentTime + 0.1, last = events.length ? events[events.length - 1] : { t: 0, dur: 0 };
  const h = {
    stub: true, playing: true, ended: false, length: last.t + last.dur + 1,
    get t() { return o.ac.currentTime - at; },
    stop() { h.playing = false; h.ended = true; return Promise.resolve(); },
    fadeTo() {},
  };
  h.done = new Promise(() => {});
  return h;
}

export function startMusic(a, ctx, load = () => import('./player.js')) {
  const { ac, musicBus } = a;
  const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  const want = params.get('music');
  const forced = want !== null && want !== '' ? want : null;
  let setting = forced !== null ? 'off' : readSetting(); // ?music= takes the director out of the load
  const dir = makeDirector({ catalog: CATALOG, setting, seed: 4242 });
  const music = {
    setting, tracks: CATALOG.map((c) => c.name), playing: null, log: [], player: 'stub',
    setSetting(s) { if (!SETTINGS.includes(s)) return; setting = music.setting = s; writeSetting(s); if (forced === null) dir.setSetting(s); },
    play, stop, bus: musicBus,
  };
  let playerMod = null, handle = null;
  load().then((m) => { playerMod = m.play ? m : (m.default || null); if (playerMod && !playerMod.play) playerMod = null; if (playerMod) music.player = 'player'; })
    .catch(() => { /* no player yet: the stand-in */ });

  function play(name) {
    const c = BY_NAME[name];
    if (!c) return false;
    stop(0.3);
    const events = compose(c.track, c.track.seed);
    const o = { ac, dest: musicBus, voices: c.track.voices, at: ac.currentTime + 0.2, quality: ctx.quality === 'low' ? 'low' : 'high' };
    let h;
    try { h = (playerMod ? playerMod.play : stubPlay)(events, o); } catch (e) { console.warn('[fp] music: player failed:', e); h = stubPlay(events, o); }
    handle = h; music.playing = name;
    music.log.push({ name, t: dir.state.t, gutterIn: inp.gutterIn, swellSm: inp.swellSm, pool: dir.state.pool, stub: !!h.stub });
    if (h.done) h.done.then(() => { if (handle === h) { handle = null; music.playing = null; } });
    return true;
  }
  function stop(fade = 1.5) {
    if (!handle) return;
    const h = handle; handle = null; music.playing = null;
    try { h.stop(fade); } catch (e) { /* already gone */ }
  }

  // the debug panel lists the tracks
  const dbg = ctx.debug;
  if (dbg?.addToggle) {
    dbg.addHeading('Music');
    for (const n of music.tracks) dbg.addToggle('music ' + n, () => music.playing === n, (on) => (on ? play(n) : stop(1)));
  }
  if (forced !== null && forced !== '0' && !BY_NAME[forced]) console.warn('[fp] ?music=' + forced + ': no such track (' + music.tracks.join(', ') + ')');

  // hearing nothing from a hidden tab is the browser's; coming back mid-phrase is ours to avoid
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.hidden) { dir.interrupt(0.5); if (forced === null) stop(0.5); } });

  const W = {}, inp = { weights: W, place: null, swellSm: 0, gutterIn: 99, moving: true };
  const regions = ctx.regions, mount = ctx.mountains, L = ctx.landmarks || {};
  const speed = Math.max(1, +params.get('musicspeed') || 1); // a test's clock for the director's waits (?musicspeed=20)
  let clock = 0, lastDuck = 1;
  const edge = (X, x, z) => Math.sqrt((x - X.x) * (x - X.x) + (z - X.z) * (z - X.z));
  function placeAt(x, z) {
    if (L.castle && edge(L.castle, x, z) < L.castle.r) return 'keep';
    const br = L.bridge;
    if (br && x >= br.axis.x0 && x <= br.axis.x1 && Math.abs(z - br.z) < br.axis.half) return 'span';
    const S = mount?.saddle;
    if (S && x * x + z * z > 300 * 300) { let d = Math.atan2(z, x) - S.azimuth; d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI; if (Math.abs(d) < S.walkHalf) return 'gates'; }
    return null;
  }
  music.update = function update(f) {
    const dt = f.step;
    clock += dt;
    const sdt = dt * speed;
    if (forced !== null && forced !== '0' && clock >= 3 && !music.forcedDone) { music.forcedDone = true; play(forced); }
    regions?.regionAt(f.px, f.pz, W);
    inp.place = placeAt(f.px, f.pz);
    inp.swellSm = f.swellSm;
    const fl = ctx.sky?.flicker;
    inp.gutterIn = fl ? (fl.phase > 0 ? 0 : fl.next) : 99;
    inp.moving = !!ctx.player.moving;
    const acts = dir.step(sdt, inp);
    for (let i = 0; i < acts.length; i++) {
      const x = acts[i];
      if (x.start) play(x.start);
      else if (x.stop) stop(x.fade);
      else if (x.duck !== undefined && x.duck !== lastDuck) { lastDuck = x.duck; musicBus.gain.setTargetAtTime(x.duck, ac.currentTime, 0.4); } // to silence in ~1.5 s, back on the tail
    }
  };
  music.director = dir;
  return music;
}
