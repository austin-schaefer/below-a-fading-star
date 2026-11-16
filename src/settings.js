// The settings panel (v7-08), which is also the pause (v14-B1, #46: Escape opens it, as the gear does; "Back to the
// moor" shuts it and takes the mouse again): a gear beside the speaker opens volume, mute (and under them, v9-M6, the sound's three
// parts: sound effects, ambience, music, with the music's off / how often), quality, mouse capture and a list of
// places to teleport to, and (v13) Measure, which reloads into the bench. UI only: it builds no world, draws nothing and registers no per-frame update; with the
// panel closed it is a handful of listeners. The markup and CSS are in index.html. Reads ctx.audio (audio.js),
// ctx.controls (controls.js), ctx.quality (tier.js) and ctx.terrain lazily, because those build after the hud.
import { LANDMARKS, REGION_CARDS, SITES, SPAWN, SUN } from './world.js';
import { THREAD_PLACES } from './v8/threads/plan.js'; // v8-04: both ends of each story thread

const TIERS = ['low', 'medium', 'high'];

// Where the panel puts you: the whole map, grouped. Spawn; Places (every LANDMARKS entry with a name: its own `at`, a
// hand-picked stand point from the v4-v6 renders, or a point r + 6 m from its centre toward spawn, looking at it); and
// The living (the v7 figures by their SITES names, each from the pose of its v7 render in tools/views-v7-*.json).
// Names are LANDMARKS' and SITES' [Proposed] placeholders. An entry is { name, group, x, z, yaw | look, pitch? }.
const HAND = { // stand points kept from the first list; look: a point, a landmark, or 'sun'
  castle: { x: -40, z: 22, look: LANDMARKS.castle },
  tower: { x: -167, z: -90, look: LANDMARKS.tower, pitch: 0.4 }, // v11-F2: 95 m back on the grass, the spire on its mound under the rock (22 m out was a wall at arm's length)
  court: { x: LANDMARKS.court.x, z: LANDMARKS.court.z, look: 'sun' },
  arcature: { x: LANDMARKS.arcature.x, z: LANDMARKS.arcature.z, look: { x: 200, z: 60 } },
  // v10-F1: the places with an act land about 9 m back from it, facing it, its lure in view (src/v10/lure.js)
  moraine: { x: 39, z: -245, look: { x: 37.5, z: -255.3 }, pitch: 0.12 }, // the mother crystal's foot, where the hand goes
  hypogeum: { x: 221.5, z: -112, look: { x: 230.6, z: -112 } }, // down the stair, facing the bronze door
  collation: { x: 135.4, z: -73.8, look: { x: 138.9, z: -65.5 } }, // the twelfth place and its bottle
  pit: { x: 194.2, z: 201, look: LANDMARKS.pit, pitch: -0.45 }, // v11-F2: on the rim at the south lookout (bearing 200, 17 m out), looking in and down; (192, 193) stood on the pit floor
  gradine: { x: 235, z: -110, look: LANDMARKS.gradine, pitch: 0.35 }, // v11-F2: from the grass 70 m off, the stair climbing the wall
  wood: { x: SITES.lightMoss.x + 6, z: SITES.lightMoss.z, look: SITES.lightMoss },
  bridge: { x: -60, z: 150, look: { x: 60, z: 215 }, pitch: 0.25 }, // v11-F2: on the open ground south of the arches, the Span's arcade in view (the old stand was in the woods)
  tarn: { x: -90, z: 50, look: LANDMARKS.tarn },
  taverna: { x: 66, z: -52, look: { x: 95, z: -45 }, pitch: 0.05 }, // v15-W1: on the west way, the house's west wall and its towers across the grass (r + 6 toward spawn now lands inside the Strake's new house)
};
// v11-F2: the card places (no `at`, no hand stand) were r + 6 m from their centre toward spawn: grass at the foot of a wall
const CARD_POSES = {
  galleries: { x: -120, z: -70, look: { x: -338, z: -69 }, pitch: 0.38 }, // the whole ragged prow over the tarn's west shore
  hawser: { x: -102, z: -134, look: { x: -80, z: -272 }, pitch: 0.28 }, // the chain running off to the crystals and the arch
  // v11.1-W4: the canyon's three were a rock at arm's length or a wall; each now on dry ground with the thing across open air
  river: { x: 208, z: 240, look: { x: 214, z: 266 }, pitch: 0.2 }, // the taller fall, whole, from the slope 26 m off
  cutting: { x: 200, z: 240, look: { x: 188, z: 246 }, pitch: -0.05 }, // the gorge from its north bank, on dry ground a few metres over the river: the slot between the walls (a stand on the rim sees only turf; the hole check exempts it as it does the Speculum)
  orchard: { x: 80, z: -100, look: { x: 130, z: -90 }, pitch: 0.05 }, // v14-B4: from the grove's west side, the medlars and the path through (the old stand put a trunk across the frame)
  byre: { x: -160, z: 48, look: { x: -148, z: 64 }, pitch: 0.05 }, // v14-B4: 21 m off, the roof clear of the wood's trunks
  plinths: { x: 175, z: -160, look: { x: 148, z: -220 }, pitch: 0.1 }, // v14-B4: beside the road's foot, the plinths running off in file (the old stand was at a wall's foot)
  nave: { x: 262.4, z: 28.2, look: { x: 252, z: 44 }, pitch: -0.55 }, // v14-F1: at the north-east lip, looking down past the capitals onto the Noon Road's lit carriers and hoops (B4's, 4 m back at (251, 24), framed the rim's grass)
  thrones: { x: -290, z: 85, look: { x: -324, z: 118 }, pitch: 0.3 }, // v14-B4: out of the wood's edge, the thrones against the sunset (the old stand looked into black trunks)
  leerie: { x: 110, z: -12, look: { x: 128, z: 5 }, pitch: 0.05 }, // v14-B4: the standards and their lamplighter, the arch behind
  prospect: { x: 248, z: -30, look: { x: 238, z: -30 }, pitch: 0.05 }, // from the east, the sun behind it: the easel, the cairns, the set, the saucer
};
// v14-B4: a region card's stand (default: its card point, facing the spawn's way)
const REGION_STANDS = {
  lynchets: { x: -170, z: -95, look: { x: -200, z: -135 }, pitch: 0.1 }, // the terraced walls climbing the slope
};
// v11-F2: places that stand on the wall or in the air with no landmark; each a postcard from open ground
const FAR_PLACES = [
  { name: 'The Escarpment Lamps', x: -45, z: 45, look: { x: -171, z: 384 }, pitch: 0.32 }, // across the tarn, 400 m: the city of windows over the Span's arches
  // v14-B5: two places whose cards the owner cut (#52) keep the stands and names they had before v14-B3
  { name: 'The foot of the icefall', x: 62, z: -266, look: { x: 72.5, z: -293 }, pitch: 0.18 }, // v12-C1: on the Lattice's floor, the lit cleft in the ice front, the steps of ice over it
  { name: 'The lift\'s lower station', x: -282, z: -19, look: { x: -299, z: -18 }, pitch: 0.42 }, // v12-C1: on the path east of the station's stair: the plinth, the bell's arch and the rails going up the face
];
// v14-B3 (#52): the named places of v9 to v12 (LANDMARKS' cards), each where it reads: the ways up from their feet, the
// tops on their own floor (y), the act places 9 m out in front of the act (v10-F1); v14-B5: the owner's cuts and renames
const NAMED_POSES = {
  halt: { x: -54.0, z: 5.95, look: { x: -62.4, z: 2.6 }, pitch: 0.08 }, // the tally slab's chalked face
  tocsin: { x: -60.6, z: 194.2, look: { x: -57.2, z: 203.4 }, pitch: 0.2 }, // 9 m from the ringing post (the act's lure, 20 degrees off the look) so the bell, hung to the east of it, and its arch are in the frame
  escalade: { x: -120, z: 175, look: { x: -226, z: 195 }, pitch: 0.3 }, // from the tarn's side, 100 m off: the gate's masonry against the last of the sky (at its foot, in the wood, the stair stands in its own deep shade and the frame is black)
  causeway: { x: -150, y: 56, z: 213, look: { x: -60, z: 215 }, pitch: -0.04 }, // on the west deck between piers, running off east to the fallen bay and the footing course (nearer the stair's top the wall's shoulder rings the stand: the hole check)
  wait: { x: 101, y: 56, z: 214, look: { x: 88, z: 210 }, pitch: -0.08 }, // the camp, its lean-to and hearth, the worn lane to her stone
  spar: { x: 173, y: 56, z: 215, look: { x: 122, z: 215 }, pitch: -0.1 }, // on the east deck, the truss member going back over the river bay
  bitter: { x: 44, z: -390, yaw: 1.2, pitch: 0.1 }, // on the shelf at the lip of the last crevasse, the broken eye (stories/the-soundings.md, beat 4)
  diffident: { x: 275, z: 0, look: { x: 288, z: -9 }, pitch: 0.18 }, // the stub side on, its steps going up to nothing between the posts
  coffinroad: { x: 250.4, y: -15.7, z: 42, look: { x: 296, z: 42 }, pitch: 0.04 }, // v14-D3: on the first carrier's back 15 m under the moor, looking east along the string through the hoops into the dark under the roof
  laidsun: { x: 225.9, y: -28.0, z: 118.56, look: { x: 223.6, z: 123.0 }, pitch: -0.36 }, // v14-D1: at the room's way in from the Flute, 28 m under the moor, the half-laid gold sun in the floor and his lamp
  nadir: { x: 203.08, y: -31.66, z: 176.54, look: { x: 200, z: 185 }, pitch: 0.12 }, // v14-D2: on the Pit's floor where the passage comes in, the down-reel and the sheers over the Nadir ahead, the slabs going up the wall behind them
  croft: { x: 228.6, y: 108, z: -55, look: { x: 226, z: -47 }, pitch: -0.2 }, // on the deck at the top, 100 m up: the lean-to, the stove, the chair
  remand: { x: -377, y: 135.2, z: -50, look: { x: -372, z: -100 }, pitch: 0 }, // on the gallery at 135 m, the cells going off south to the ragged end
};
// v15-N1: two things in the Lappet, named on the map though they have no card of their own (the village is the one entry already, The Lappet, and its quarters' cards are the walk's own, `map: false`): `thing` is what the stand faces (settings-test checks it is in view and nothing shuts the view within 3 m)
const VILLAGE_PLACES = [
  { name: 'The Fountain of Noon', x: 80, z: -33, look: { x: 72.5, z: -37.9 }, pitch: 0.05, thing: { x: 72.5, z: -37.9 } }, // the square's foot of a vessel, welling stored daylight; the Wanting Arch behind it
  { name: 'The Smoking Saint', x: 64.5, y: 18, z: -3.5, look: { x: 72.9, z: -1.3 }, pitch: 0.3, thing: { x: 72.9, z: -1.3 } }, // the fallen colossus's head, the masons' lime kiln, from the Saint's Rest
];
// The living: [SITES key, x, z, yaw, pitch] from the view named in the comment.
const LIVING = [
  ['taker', -275.35, 13.29, -1.222, -0.04], // workers-taker-road
  ['coheirs', -42, 150, 2.85, -0.12], // workers-coheirs-p17
  ['sexton', 30, 259.4, -2.099, -0.06], // workers-sexton-rows
  ['sleeper', 165, -45, -1.862, 0.008], // sleeper-15m
  ['stylite', 250, 5, -0.211, 0.17], // stylite-p11
  ['accrescent', 57, -222, -3.07, -0.138], // accrescent-trail-40m
  ['thurifer', null], // its P3 start, six metres off toward spawn
  ['leerie', 149, 42, 0.516, 0.05], // walkers-leerie-gutter: the row's south end
  ['linkBoy', -150, -95, 0.983, -0.04], // walkers-linkboy-post
  ['scriveners', -101, 50, 3.266, -0.3], // glyphs-scriveners-wander: the tarn's bank
  ['moles', 99.5, -27.5, -1.75, -0.2], // glyphs-moles-causeway
  ['glyphs', 69.5, -198, -1.223, 0.03], // glyphs-erratic-sun: the erratic
  ['repetend', -167.2, -96.3, 1.513, -0.14], // small-repetend-p3
  ['simulacrum', 10.8, -201.5, -1.291, 0.016], // small-simulacrum-columns
  ['bather', 166.5, 218.5, 2.43, -0.45], // canyon-bather-rim
  ['toadstone', 186, 232, 0.95, -0.3], // canyon-toad-p13-day
  ['reach', null], // the Span's line by the river (its deck is not walkable there)
];
const offToward = (c, d) => { // d metres from (c.x, c.z) toward spawn
  const dx = SPAWN.x - c.x, dz = SPAWN.z - c.z, l = Math.hypot(dx, dz) || 1;
  return { x: c.x + dx / l * d, z: c.z + dz / l * d };
};
function buildPlaces() {
  const out = [{ name: 'Spawn', group: null, x: SPAWN.x, z: SPAWN.z, yaw: SPAWN.yaw }];
  for (const [key, L] of Object.entries(LANDMARKS)) {
    if (!L.name || key === 'graves' || L.map === false) continue; // the Sexton's entry among the living lands there
    const h = HAND[key] || NAMED_POSES[key];
    if (h) out.push({ name: key === 'wood' ? 'The moss light, ' + L.name : L.name, group: 'Places', ...h });
    else if (L.at) out.push({ name: L.name, group: 'Places', x: L.at.x, z: L.at.z, look: L });
    else { const p = offToward(L, L.r + 6); out.push({ name: L.name, group: 'Places', x: p.x, z: p.z, look: L }); }
  }
  for (const a of FAR_PLACES) out.push({ ...a, group: 'Places' });
  for (const a of VILLAGE_PLACES) out.push({ ...a, group: 'Places' }); // v15-N1
  for (const [key, h] of Object.entries(CARD_POSES)) { const i = out.findIndex((o) => o.name === LANDMARKS[key].name); if (i >= 0) Object.assign(out[i], h); } // v11-F2
  for (const R of Object.values(REGION_CARDS)) if (R.region !== 'adust') out.push({ name: R.name, group: 'Places', x: R.x, z: R.z, yaw: SPAWN.yaw, ...REGION_STANDS[R.region] });
  for (const [key, x, z, yaw, pitch] of LIVING) {
    const S = SITES[key];
    if (x != null) out.push({ name: S.name, group: 'The living', x, z, yaw, pitch });
    else if (key === 'thurifer') { const p = offToward({ x: S.from[0], z: S.from[1] }, 6); out.push({ name: S.name, group: 'The living', x: p.x, z: p.z, look: { x: S.from[0], z: S.from[1] } }); }
    else out.push({ name: S.name, group: 'The living', x: 165, z: 216, look: { x: 150, z: 216 } }); // the Span's line, the last firm ground by the river
  }
  for (const pl of THREAD_PLACES) out.push({ ...pl, group: 'Stories' }); // v8-04
  return out;
}
export const PLACES = buildPlaces();

// yaw 0 looks down -z, so the forward vector is (-sin yaw, -cos yaw)
const yawToward = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz));
// The eight points from a yaw: yaw 0 looks down -z (north), +x is east, +z south, so the compass bearing is -yaw
const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export const facing = (yaw) => POINTS[(Math.round((((-yaw * 180) / Math.PI) % 360 + 360) % 360 / 45)) % 8];
export const positionLine = (p) => `x ${Math.round(p.pos.x)}  z ${Math.round(p.pos.z)}  facing ${facing(p.yaw)}`.replace(/-(\d)/g, '\u2212$1');

export function buildSettings(ctx) {
  const $ = (id) => document.getElementById(id);
  const gear = $('gear'), root = $('settings'), panel = $('settings-panel');
  if (!gear || !root || !panel) return null;
  const slider = $('set-volume'), sliderOut = $('set-volume-out'), muteBtn = $('set-mute');
  const posEl = $('set-pos'), posToggle = $('set-showpos'), posHud = $('posline');
  const qualityEl = $('set-quality'), captureEl = $('set-capture-choice'), placesEl = $('set-places');
  let touched = -1e9; // the last change made in the panel: the frame stays full for a moment after it (a slider's preview)
  const api = { get idle() { return open_ && performance.now() - touched > 1500; }, open, close, toggle, teleport, qualityUrl, setQuality, navigate: (u) => location.assign(u), get shown() { return open_; }, places: PLACES };
  ctx.settings = api;
  let open_ = false, openedAt = -1e9;

  // --- sound
  const audio = () => ctx.audio;
  slider.addEventListener('input', () => audio()?.setVolume(slider.value / 100));
  muteBtn.addEventListener('click', () => audio()?.setMuted(!audio().muted));
  // the three parts under it (v9-M6): music, sound effects, ambience (audio.setLevel; graph.js says which buses each moves)
  const levelEls = [...panel.querySelectorAll('input[data-level]')];
  for (const el of levelEls) el.addEventListener('input', () => { audio()?.setLevel(el.dataset.level, el.value / 100); el.nextElementSibling.textContent = el.value; });
  function syncSound() {
    const a = audio();
    if (!a) return;
    slider.value = Math.round(a.volume * 100); sliderOut.textContent = slider.value;
    muteBtn.setAttribute('aria-pressed', a.muted ? 'true' : 'false');
    muteBtn.textContent = a.muted ? 'Muted' : 'Mute';
    for (const el of levelEls) { el.value = Math.round((a.levels?.[el.dataset.level] ?? 1) * 100); el.nextElementSibling.textContent = el.value; }
  }
  ctx.events.addEventListener('audiochange', syncSound);

  // --- music: off, or how often it comes (v9-M2); on ('default') unless the visitor chose otherwise (v15). Read by audio/music/index.js
  // on start and applied at once if it runs. While off, the music's level and the three frequencies are dimmed.
  const musicEl = $('set-music'), musicLevel = $('set-level-music');
  const MUSIC = ['off', 'rare', 'default', 'frequent'];
  const musicNow = () => { try { const s = localStorage.getItem('fp-music'); if (MUSIC.includes(s)) return s; } catch (e) { /* private mode */ } return 'default'; };
  function setMusic(s) {
    if (ctx.audio?.music) ctx.audio.music.setSetting(s);
    else { try { localStorage.setItem('fp-music', s); } catch (e) { /* private mode */ } }
    syncMusic();
  }
  if (musicEl) for (const s of MUSIC) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.music = s; b.textContent = s;
    b.addEventListener('click', () => setMusic(s));
    musicEl.appendChild(b);
  }
  function syncMusic() {
    if (!musicEl) return;
    const n = musicNow();
    for (const b of musicEl.children) { b.setAttribute('aria-pressed', b.dataset.music === n ? 'true' : 'false'); b.classList.toggle('set-dim', n === 'off' && b.dataset.music !== 'off'); }
    musicLevel?.closest('.set-part')?.classList.toggle('set-dim', n === 'off');
  }
  api.setMusic = setMusic;

  // --- quality: the tier ?q= sets, applied on reload at the same place and heading
  for (const t of TIERS) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.tier = t; b.textContent = t;
    b.addEventListener('click', () => setQuality(t));
    qualityEl.appendChild(b);
  }
  function syncQuality() { for (const b of qualityEl.children) b.setAttribute('aria-pressed', b.dataset.tier === ctx.quality ? 'true' : 'false'); }
  function qualityUrl(tier) {
    const u = new URL(location.href), p = ctx.player;
    u.searchParams.delete('tier');
    u.searchParams.set('q', tier); // every other parameter stays; only q, pos, yaw and pitch are replaced
    if (ctx.debug?.shown) u.searchParams.set('debug', '1'); // a panel opened by the key survives the reload
    u.searchParams.set('pos', `${p.pos.x.toFixed(1)},${p.pos.z.toFixed(1)}`);
    u.searchParams.set('yaw', p.yaw.toFixed(3));
    u.searchParams.set('pitch', p.pitch.toFixed(3));
    return u.href;
  }
  function setQuality(tier) {
    if (!TIERS.includes(tier) || tier === ctx.quality) return false;
    api.navigate(qualityUrl(tier));
    return true;
  }

  // --- mouse capture: pointer lock on click, or drag to look
  for (const b of captureEl.children) b.addEventListener('click', () => ctx.controls.setDragLook(b.dataset.capture === 'drag'));
  function syncCapture() { for (const b of captureEl.children) b.setAttribute('aria-pressed', (b.dataset.capture === 'drag') === !!ctx.player.dragLook ? 'true' : 'false'); }
  ctx.events.addEventListener('draglook', syncCapture);

  // --- position: a line at the top of the panel while it is open, and an optional one bottom-left; 4 Hz, nothing while both are off
  let showPos = false, posTimer = 0;
  try { showPos = localStorage.getItem('fp-showpos') === '1'; } catch (e) { /* ignore */ }
  function tickPos() {
    const line = positionLine(ctx.player);
    if (open_) posEl.textContent = line;
    if (showPos) posHud.textContent = line;
  }
  function syncPos() {
    posHud.classList.toggle('shown', showPos);
    posToggle.setAttribute('aria-pressed', showPos ? 'true' : 'false');
    posToggle.textContent = showPos ? 'Shown' : 'Hidden';
    const need = open_ || showPos;
    if (need && !posTimer) { tickPos(); posTimer = setInterval(tickPos, 250); }
    else if (!need && posTimer) { clearInterval(posTimer); posTimer = 0; }
  }
  posToggle.addEventListener('click', () => {
    showPos = !showPos;
    try { localStorage.setItem('fp-showpos', showPos ? '1' : '0'); } catch (e) { /* ignore */ }
    syncPos();
  });

  // --- a long fall costs (v12): off by default, remembered in 'fp-fall'; src/v12/fall.js reads it (ctx.fall.refresh)
  const fallBtn = $('set-fall');
  const fallNow = () => { try { return localStorage.getItem('fp-fall') === '1'; } catch (e) { return false; } };
  function syncFall() {
    if (!fallBtn) return;
    const on = fallNow();
    fallBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    fallBtn.textContent = on ? 'On' : 'Off';
  }
  fallBtn?.addEventListener('click', () => {
    try { localStorage.setItem('fp-fall', fallNow() ? '0' : '1'); } catch (e) { /* private mode */ }
    ctx.fall?.refresh();
    syncFall();
  });

  // --- measure (v13): reload into the bench (src/perf.js, ?bench=45&perf=1) at the tier in use; it ends on a panel whose
  // Copy gives a short JSON; the bench takes its params off the URL when done (and q, unless it was there before), and its
  // Close reloads that clean URL, so the profiler and its hooks are gone and a refresh is an ordinary visit
  function measureUrl() {
    const u = new URL(location.href);
    const hadQ = u.searchParams.has('q'); // measure=q: keep it afterwards; measure=1: the bench takes it off again
    for (const k of ['pos', 'yaw', 'pitch', 'tier', 'record']) u.searchParams.delete(k);
    u.searchParams.set('q', ctx.quality);
    u.searchParams.set('bench', '45'); u.searchParams.set('perf', '1'); u.searchParams.set('measure', hadQ ? 'q' : '1');
    return u.href;
  }
  api.measureUrl = measureUrl;
  $('set-measure')?.addEventListener('click', () => api.navigate(measureUrl()));

  // --- teleport: the whole map under small headings
  let group;
  PLACES.forEach((pl, i) => {
    if (pl.group && pl.group !== group) { group = pl.group; const h = document.createElement('h4'); h.textContent = group; placesEl.appendChild(h); }
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = pl.name;
    b.addEventListener('click', () => teleport(i));
    if (pl.thread) { b.dataset.thread = pl.thread; b.hidden = true; } // v8-04: shown once the thread has built (open())
    placesEl.appendChild(b);
  });
  function teleport(pl) {
    if (typeof pl === 'number') pl = PLACES[pl];
    if (!pl || (pl.thread && !ctx.threads?.[pl.thread])) return false; // v8-04: a story's end only when its thread was built
    const p = ctx.player;
    const at = ctx.controls.placeAt(pl.x, pl.z, pl.y); // y (v8-04, v12): the floor at that height there (the Span's deck, a gallery), else the ground
    if (pl.look === 'sun') p.yaw = yawToward(0, 0, SUN.dir.x, SUN.dir.z);
    else if (pl.look) p.yaw = yawToward(at.x, at.z, pl.look.x, pl.look.z);
    else p.yaw = pl.yaw;
    p.pitch = pl.pitch || 0;
    close(); // the debug panel, if shown, stays as it was
    return true;
  }

  // --- open and close
  function open(o) {
    if (open_) return;
    ctx.player?.keys?.clear(); // a key held as the panel opens is let go in it, where the walk never hears it: the walker stops
    open_ = true; openedAt = o?.paused ? performance.now() : -1e9; // opened by Escape (hud.js): that Escape is not also the one that shuts it
    document.getElementById('card')?.classList.add('hidden'); // the one panel: never the old paused card behind it
    ctx.controls.release(); // the mouse is free for the panel; the view is clicked to take it back
    syncSound(); syncMusic(); syncQuality(); syncCapture(); syncPos(); syncFall();
    for (const b of placesEl.querySelectorAll('button[data-thread]')) b.hidden = !ctx.threads?.[b.dataset.thread]; // v8-04
    root.classList.add('shown');
    gear.setAttribute('aria-expanded', 'true');
    panel.focus({ preventScroll: true });
  }
  function close() {
    if (!open_) return;
    open_ = false;
    root.classList.remove('shown');
    gear.setAttribute('aria-expanded', 'false');
    gear.blur();
    syncPos();
  }
  function toggle() { if (open_) close(); else open(); }
  gear.addEventListener('click', toggle);
  // Back to the moor: shut it and, on a desktop with the mouse captured on click, take the mouse again (the click is the
  // gesture the browser asks for; Escape is not one, so after Escape a click on the view takes it, as before)
  $('set-close').addEventListener('click', () => {
    close();
    const pl = ctx.player;
    if (pl?.enabled && !pl.locked && !pl.lockFailed && !pl.dragLook && !(('ontouchstart' in window) || navigator.maxTouchPoints > 0)) ctx.controls.lock();
  });
  root.addEventListener('mousedown', (e) => { if (e.target === root) { e.preventDefault(); panel.focus({ preventScroll: true }); } });
  // Escape closes the panel before the pause toggle (drag-look mode) sees it; while the mouse is captured the
  // browser takes Escape for itself and the panel stays shut. Other keys typed in the panel are the panel's, not the walk's.
  window.addEventListener('keydown', (e) => {
    if (open_ && e.code === 'Escape' && performance.now() - openedAt > 300) { e.preventDefault(); e.stopImmediatePropagation(); close(); }
  }, true);
  const swallow = (e) => { if (e.code !== 'Escape') e.stopPropagation(); };
  for (const ev of ['input', 'pointerdown']) root.addEventListener(ev, () => { touched = performance.now(); });
  root.addEventListener('keydown', swallow); root.addEventListener('keyup', swallow);
  syncSound(); syncMusic(); syncQuality(); syncCapture(); syncPos();
  return api;
}
