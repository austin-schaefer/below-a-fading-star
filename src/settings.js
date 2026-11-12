// The settings panel (v7-08): a gear beside the speaker opens volume, mute, quality, mouse capture and a list of
// places to teleport to. UI only: it builds no world, draws nothing and registers no per-frame update; with the
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
  tower: { x: -228, z: -135, look: LANDMARKS.tower },
  court: { x: LANDMARKS.court.x, z: LANDMARKS.court.z, look: 'sun' },
  arcature: { x: LANDMARKS.arcature.x, z: LANDMARKS.arcature.z, look: { x: 200, z: 60 } },
  moraine: { x: 40, z: -215, look: LANDMARKS.moraine },
  pit: { x: 192, z: 193, look: LANDMARKS.pit }, // the lip's south-west side
  gradine: { x: LANDMARKS.gradine.x, z: LANDMARKS.gradine.z, look: { x: 287.8, z: -192.6 } },
  wood: { x: SITES.lightMoss.x + 6, z: SITES.lightMoss.z, look: SITES.lightMoss },
  bridge: { x: LANDMARKS.bridge.at.x, z: LANDMARKS.bridge.at.z, look: { x: 257, z: 215 } },
  tarn: { x: -90, z: 50, look: LANDMARKS.tarn },
};
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
  ['moles', 80, -8, 2.583, -0.1], // glyphs-moles-causeway
  ['glyphs', 69.5, -198, -1.223, 0.03], // glyphs-erratic-sun: the erratic
  ['indistinct', 68.69, -41.02, -1.755, -0.498], // small-indistinct-lawn
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
    if (!L.name || key === 'graves') continue; // the Sexton's entry among the living lands there
    const h = HAND[key];
    if (h) out.push({ name: key === 'wood' ? 'The moss light, ' + L.name : L.name, group: 'Places', ...h });
    else if (L.at) out.push({ name: L.name, group: 'Places', x: L.at.x, z: L.at.z, look: L });
    else { const p = offToward(L, L.r + 6); out.push({ name: L.name, group: 'Places', x: p.x, z: p.z, look: L }); }
  }
  for (const R of Object.values(REGION_CARDS)) if (R.region !== 'adust') out.push({ name: R.name, group: 'Places', x: R.x, z: R.z, yaw: SPAWN.yaw });
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
  const api = { open, close, toggle, teleport, qualityUrl, setQuality, navigate: (u) => location.assign(u), get shown() { return open_; }, places: PLACES };
  ctx.settings = api;
  let open_ = false;

  // --- sound
  const audio = () => ctx.audio;
  slider.addEventListener('input', () => audio()?.setVolume(slider.value / 100));
  muteBtn.addEventListener('click', () => audio()?.setMuted(!audio().muted));
  function syncSound() {
    const a = audio();
    if (!a) return;
    slider.value = Math.round(a.volume * 100); sliderOut.textContent = slider.value;
    muteBtn.setAttribute('aria-pressed', a.muted ? 'true' : 'false');
    muteBtn.textContent = a.muted ? 'Muted' : 'Mute';
  }
  ctx.events.addEventListener('audiochange', syncSound);

  // --- music: how often it comes (v9-M2); read by audio/music/index.js on start and applied at once if it runs
  const musicEl = $('set-music');
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
  function syncMusic() { if (musicEl) { const n = musicNow(); for (const b of musicEl.children) b.setAttribute('aria-pressed', b.dataset.music === n ? 'true' : 'false'); } }
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
    const at = pl.y != null ? (p.pos.set(pl.x, pl.y + p.eye, pl.z), p.vel.set(0, 0, 0), p.vy = 0, { x: pl.x, z: pl.z }) : ctx.controls.placeAt(pl.x, pl.z); // v8-04: y, a floor above the ground (the Span's deck)
    if (pl.look === 'sun') p.yaw = yawToward(0, 0, SUN.dir.x, SUN.dir.z);
    else if (pl.look) p.yaw = yawToward(at.x, at.z, pl.look.x, pl.look.z);
    else p.yaw = pl.yaw;
    p.pitch = pl.pitch || 0;
    close(); // the debug panel, if shown, stays as it was
    return true;
  }

  // --- open and close
  function open() {
    if (open_) return;
    open_ = true;
    ctx.controls.release(); // the mouse is free for the panel; the view is clicked to take it back
    syncSound(); syncMusic(); syncQuality(); syncCapture(); syncPos();
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
  $('set-close').addEventListener('click', close);
  root.addEventListener('mousedown', (e) => { if (e.target === root) { e.preventDefault(); panel.focus({ preventScroll: true }); } });
  // Escape closes the panel before the pause toggle (drag-look mode) sees it; while the mouse is captured the
  // browser takes Escape for itself and the panel stays shut. Other keys typed in the panel are the panel's, not the walk's.
  window.addEventListener('keydown', (e) => {
    if (open_ && e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
  }, true);
  const swallow = (e) => { if (e.code !== 'Escape') e.stopPropagation(); };
  root.addEventListener('keydown', swallow); root.addEventListener('keyup', swallow);
  syncSound(); syncMusic(); syncQuality(); syncCapture(); syncPos();
  return api;
}
