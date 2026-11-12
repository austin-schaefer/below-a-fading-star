// The music glue (v9-M2, v9-M6): the director's decisions turned into calls on the player, on the live walk. Started by
// audio.js on "Go out" with the audio graph's shared object `a`; ticked from audio.js's 10 Hz update with its frame
// record `f`.
//
//   audio.music = { setting, setSetting(s), tracks, play(name), stop(fade), playing (a name or null), log, bus, mix,
//                   duck (the gutter's last duck the bus was sent to, 0..1), built (true once the music's modules are
//                   loaded and its director made) }
//   (Read the duck from `duck`, not from bus.gain.value: with no track sounding Chromium does not render the bus, and
//   its gain's value stays where it was.)
//   setting  'off' | 'rare' | 'default' | 'frequent' (settings panel, localStorage `fp-music`); the default is off
//            (v9-M6: the music is experimental, heard only by a visitor who turns it on). ?music=<track> plays that
//            track 3 s after the walk begins whatever the setting says, and nothing else (the director stays out of
//            the load); ?music=0 is off.
//   ?musicspeed=N runs the director's waits N times faster (tests).
//
// Off costs nothing: this file has no imports, so with the setting off and no ?music= the score, the tracks, the
// director and the player are never fetched, no node is made, no timer or listener runs, and update() is one test.
// They load the first time music is wanted (the setting turned on, ?music=, a debug row).
//
// Pacing comes from the audio clock, never from frames or wall-clock timers: the context's clock freezes while it is
// suspended (a tab in the background, a phone locked), and the director must not think a track has played meanwhile.
// One track plays at a time: play() stops the previous (0.3 s). A player that throws on a track (an unknown voice id)
// is warned about and plays nothing.
//
// The mix: a stem at the player's gain 1 measures about -35 LUFS on its own (tools/music-render.mjs); through master
// (0.25, -12 dB) it would be -47 LUFS at the output against the moor's bed at about -27. MIX on the bus brings it to
// about -35 at the output: well under the bed, heard when the wind drops. The gutter's duck multiplies it.
export const MUSIC_KEY = 'fp-music';
export const SETTINGS = ['off', 'rare', 'default', 'frequent']; // director.js's SETTINGS, kept here so off loads nothing
export const DEFAULT_SETTING = 'off';
export const TRACK_NAMES = ['moor', 'wood', 'wet', 'cold', 'garden', 'dry', 'span', 'keep', 'gates']; // catalog.js's, in order
export const MIX = 4;
export const readSetting = () => { try { const s = localStorage.getItem(MUSIC_KEY); if (SETTINGS.includes(s)) return s; } catch (e) { /* private mode */ } return DEFAULT_SETTING; };
export const writeSetting = (s) => { try { localStorage.setItem(MUSIC_KEY, s); } catch (e) { /* private mode */ } };

const loadAll = () => Promise.all([import('./score.js'), import('./catalog.js'), import('./director.js'), import('./player.js')]);

export function startMusic(a, ctx, load = loadAll) {
  const { ac, musicBus } = a;
  const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  const want = params.get('music');
  const forced = want !== null && want !== '' && want !== '0' ? want : null;
  const forcedOff = want === '0';
  let setting = forced !== null || forcedOff ? 'off' : readSetting();
  const speed = Math.max(1, +params.get('musicspeed') || 1); // a test's clock for the director's waits (?musicspeed=20)
  const music = {
    setting, tracks: TRACK_NAMES.slice(), playing: null, log: [], player: null, built: false, director: null,
    bus: musicBus, mix: MIX, duck: 1, setSetting, play, stop,
    update() {}, // nothing until the music is wanted
  };

  // ---- the modules, loaded once, the first time music is wanted
  let mods = null, booting = null, dir = null;
  function boot() {
    if (booting) return booting;
    booting = load().then(([S, C, D, P]) => {
      mods = { compose: S.compose, BY_NAME: C.BY_NAME, CATALOG: C.CATALOG, play: P.play };
      music.player = 'player';
      musicBus.gain.value = MIX;
      dir = music.director = D.makeDirector({ catalog: C.CATALOG, setting: forced !== null ? 'off' : setting, seed: 4242 });
      lastNow = ac.currentTime;
      // hearing nothing from a hidden tab is the browser's; coming back mid-phrase is ours to avoid
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.hidden && forced === null) { dir.interrupt(0.5); stop(0.5); } });
      music.built = true;
      music.update = update;
      return mods;
    }).catch((e) => { console.warn('[fp] music failed to load:', e); booting = null; return null; });
    return booting;
  }

  function setSetting(s) {
    if (!SETTINGS.includes(s)) return;
    setting = music.setting = s; writeSetting(s);
    if (forced !== null) return;
    if (s === 'off') { if (dir) dir.setSetting(s); stop(2); return; } // the director's own stop would be lost in its next step
    if (dir) dir.setSetting(s); else boot();
  }

  let handle = null;
  function play(name) {
    if (!TRACK_NAMES.includes(name)) return false;
    if (!mods) { boot().then((m) => { if (m) play(name); }); return true; }
    const c = mods.BY_NAME[name];
    if (!c) return false;
    stop(0.3);
    const events = mods.compose(c.track, c.track.seed);
    const o = { ac, dest: musicBus, voices: c.track.voices, at: ac.currentTime + 0.2, quality: ctx.quality === 'low' ? 'low' : 'high' };
    let h;
    try { h = mods.play(events, o); } catch (e) { console.warn('[fp] music: the player refused ' + name + ':', e); return false; }
    handle = h; music.playing = name;
    music.log.push({ name, t: dir ? dir.state.t : 0, gutterIn: inp.gutterIn, swellSm: inp.swellSm, pool: dir ? dir.state.pool : null });
    h.done.then(() => { if (handle === h) { handle = null; music.playing = null; } });
    return true;
  }
  function stop(fade = 1.5) {
    if (!handle) return;
    const h = handle; handle = null; music.playing = null;
    try { h.stop(fade); } catch (e) { /* already gone */ }
  }

  // the debug panel lists the tracks (by name: listing them loads nothing)
  const dbg = ctx.debug;
  if (dbg?.addToggle) {
    dbg.addHeading('Music');
    for (const n of TRACK_NAMES) dbg.addToggle('music ' + n, () => music.playing === n, (on) => (on ? play(n) : stop(1)));
  }
  if (forced !== null && !TRACK_NAMES.includes(forced)) console.warn('[fp] ?music=' + forced + ': no such track (' + TRACK_NAMES.join(', ') + ')');

  const W = {}, inp = { weights: W, place: null, swellSm: 0, gutterIn: 99, moving: true };
  const regions = ctx.regions, mount = ctx.mountains, L = ctx.landmarks || {};
  let clock = 0, lastNow = 0, lastDuck = 1;
  const edge = (X, x, z) => Math.sqrt((x - X.x) * (x - X.x) + (z - X.z) * (z - X.z));
  function placeAt(x, z) {
    if (L.castle && edge(L.castle, x, z) < L.castle.r) return 'keep';
    const br = L.bridge;
    if (br && x >= br.axis.x0 && x <= br.axis.x1 && Math.abs(z - br.z) < br.axis.half) return 'span';
    const S = mount?.saddle;
    if (S && x * x + z * z > 300 * 300) { let d = Math.atan2(z, x) - S.azimuth; d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI; if (Math.abs(d) < S.walkHalf) return 'gates'; }
    return null;
  }
  // per tick, once built: allocates nothing (the weights, the inputs and the director's actions are all reused)
  function update(f) {
    const now = ac.currentTime, dt = Math.min(1, Math.max(0, now - lastNow)); // the audio clock: still while suspended
    lastNow = now;
    if (dt === 0) return;
    clock += dt;
    if (forced !== null && clock >= 3 && !music.forcedDone) { music.forcedDone = true; play(forced); }
    if (forced === null && setting === 'off' && !handle) return; // turned off again: nothing to decide
    regions?.regionAt(f.px, f.pz, W);
    inp.place = placeAt(f.px, f.pz);
    inp.swellSm = f.swellSm;
    const fl = ctx.sky?.flicker;
    inp.gutterIn = fl ? (fl.phase > 0 ? 0 : fl.next) : 99;
    inp.moving = !!ctx.player.moving;
    const acts = dir.step(dt * speed, inp);
    for (let i = 0; i < acts.length; i++) {
      const x = acts[i];
      if (x.start) play(x.start);
      else if (x.stop) stop(x.fade);
      else if (x.duck !== undefined && x.duck !== lastDuck) { lastDuck = music.duck = x.duck; musicBus.gain.setTargetAtTime(x.duck * MIX, now, 0.4); } // to silence in ~1.5 s, back on the tail
    }
  }

  if (forced !== null || setting !== 'off') boot();
  return music;
}
