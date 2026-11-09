// The settings panel (v7-08): a gear beside the speaker opens volume, mute, quality, mouse capture and a list of
// places to teleport to. UI only: it builds no world, draws nothing and registers no per-frame update; with the
// panel closed it is a handful of listeners. The markup and CSS are in index.html. Reads ctx.audio (audio.js),
// ctx.controls (controls.js), ctx.quality (tier.js) and ctx.terrain lazily, because those build after the hud.
import { LANDMARKS, SITES, SPAWN, SUN } from './world.js';

const TIERS = ['low', 'medium', 'high'];

// Where the panel puts you: the stand points the v4-v6 docs use for their renders (wilderness-v5.md, tools/sites-v4.json),
// each facing a point of interest, or the sun when `look` is 'sun'. Names are LANDMARKS' and SITES' [Proposed] placeholders.
export const PLACES = [
  { name: 'Spawn', x: SPAWN.x, z: SPAWN.z, yaw: SPAWN.yaw },
  { name: LANDMARKS.castle.name, x: -40, z: 22, look: LANDMARKS.castle },
  { name: LANDMARKS.tower.name, x: -228, z: -135, look: LANDMARKS.tower },
  { name: LANDMARKS.court.name, x: LANDMARKS.court.x, z: LANDMARKS.court.z, look: 'sun' },
  { name: LANDMARKS.arcature.name, x: LANDMARKS.arcature.x, z: LANDMARKS.arcature.z, look: { x: 200, z: 60 } },
  { name: LANDMARKS.moraine.name, x: 40, z: -215, look: LANDMARKS.moraine },
  { name: LANDMARKS.gradine.name, x: LANDMARKS.gradine.x, z: LANDMARKS.gradine.z, look: { x: 287.8, z: -192.6 } },
  { name: 'The moss light, ' + LANDMARKS.wood.name, x: SITES.lightMoss.x + 6, z: SITES.lightMoss.z, look: SITES.lightMoss },
  { name: SITES.spanWest.name, x: LANDMARKS.bridge.at.x, z: LANDMARKS.bridge.at.z, look: { x: 257, z: 215 } },
  { name: LANDMARKS.tarn.name, x: -90, z: 50, look: LANDMARKS.tarn },
];

// yaw 0 looks down -z, so the forward vector is (-sin yaw, -cos yaw)
const yawToward = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz));

export function buildSettings(ctx) {
  const $ = (id) => document.getElementById(id);
  const gear = $('gear'), root = $('settings'), panel = $('settings-panel');
  if (!gear || !root || !panel) return null;
  const slider = $('set-volume'), sliderOut = $('set-volume-out'), muteBtn = $('set-mute');
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
    u.searchParams.set('q', tier);
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

  // --- teleport
  for (const pl of PLACES) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = pl.name;
    b.addEventListener('click', () => teleport(pl));
    placesEl.appendChild(b);
  }
  function teleport(pl) {
    if (typeof pl === 'number') pl = PLACES[pl];
    if (!pl) return false;
    const p = ctx.player;
    const at = ctx.controls.placeAt(pl.x, pl.z);
    if (pl.look === 'sun') p.yaw = yawToward(0, 0, SUN.dir.x, SUN.dir.z);
    else if (pl.look) p.yaw = yawToward(at.x, at.z, pl.look.x, pl.look.z);
    else p.yaw = pl.yaw;
    p.pitch = 0;
    close();
    return true;
  }

  // --- open and close
  function open() {
    if (open_) return;
    open_ = true;
    ctx.controls.release(); // the mouse is free for the panel; the view is clicked to take it back
    syncSound(); syncQuality(); syncCapture();
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
  syncSound(); syncQuality(); syncCapture();
  return api;
}
