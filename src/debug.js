// Debug panel: landmark teleports, live position, fps and render counts, and on/off rows (addToggle).
// Enabled by ?debug=1 or Backquote on desktop; on touch a corner button (top-right) shows once
// debug is on via the URL or after a 1.2 s long-press on that corner (controls.js calls reveal()).
import { LANDMARKS, SPAWN } from './world.js';

const KEYS = '123456789qerfgh'.split(''); // digits, then letters (never w/a/s/d, which walk)
for (const c of 'zxcvbtyuiopjklnm') if (!KEYS.includes(c)) KEYS.push(c);

export function buildDebug(ctx) {
  const url = new URL(location.href);
  const urlOn = url.searchParams.get('debug') === '1';
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const panel = document.getElementById('dbg');
  const btn = document.getElementById('dbg-btn');
  const live = document.getElementById('dbg-live');
  const list = document.getElementById('dbg-list');
  const keys = Object.keys(LANDMARKS);
  let acc = 0, smooth = 0;

  const api = { shown: false, enabled: urlOn, teleport, toggle, reveal, keyFor: (key) => KEYS[keys.indexOf(key)], addToggle, addHeading };
  ctx.debug = api;

  keys.forEach((key, i) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.innerHTML = `<kbd>${KEYS[i]}</kbd><span></span>`;
    row.lastChild.textContent = LANDMARKS[key].name;
    row.addEventListener('click', () => teleport(key));
    list.appendChild(row);
  });

  // On/off rows below the teleports (perf.js adds the profiler, bloom, shadows and one per module).
  function addHeading(text) {
    const h = document.createElement('div');
    h.className = 'dbg-head'; h.textContent = text;
    list.appendChild(h);
    return h;
  }
  function addToggle(name, get, set) {
    const row = document.createElement('button');
    row.type = 'button'; row.dataset.toggle = name;
    row.innerHTML = '<kbd></kbd><span></span>';
    row.lastChild.textContent = name;
    const sync = () => { const on = !!get(); row.firstChild.textContent = on ? 'on' : 'off'; row.classList.toggle('off', !on); };
    row.addEventListener('click', () => { set(!get()); sync(); });
    sync();
    list.appendChild(row);
    return row;
  }

  function teleport(key) {
    const L = LANDMARKS[key];
    if (!L) return false;
    if (L.at) { ctx.controls.placeAt(L.at.x, L.at.z); ctx.player.yaw = Math.atan2(-(L.x - L.at.x), -(L.z - L.at.z)); ctx.player.pitch = 0.1; if (api.shown) toggle(false); return true; } // a landmark that names its own spot (the Span)
    // a point 0.6 r from the centre, on the side facing spawn
    let dx = SPAWN.x - L.x, dz = SPAWN.z - L.z;
    const d = Math.hypot(dx, dz) || 1;
    dx /= d; dz /= d;
    // 0.6 r by default; if that is deep water (over a metre), step outward until it is wadeable
    const T = ctx.terrain;
    let f = 0.6;
    for (; f < 1.3; f += 0.05) {
      const x = L.x + dx * f * L.r, z = L.z + dz * f * L.r, wl = T.waterLevelAt(x, z);
      if (wl === null || wl - T.heightAt(x, z) < 1.0) break;
    }
    if (f >= 1.3) f = 0.6;
    const placed = ctx.controls.placeAt(L.x + dx * f * L.r, L.z + dz * f * L.r);
    // forward = (-sin yaw, 0, -cos yaw): face the centre
    ctx.player.yaw = Math.atan2(-(L.x - placed.x), -(L.z - placed.z));
    ctx.player.pitch = -0.04;
    if (api.shown) toggle(false);
    return true;
  }
  function toggle(force) {
    api.shown = typeof force === 'boolean' ? force : !api.shown;
    if (api.shown) { api.enabled = true; acc = 1; }
    panel.classList.toggle('shown', api.shown);
    syncButton();
    return api.shown;
  }
  function reveal() { api.enabled = true; syncButton(); toggle(true); }
  function syncButton() { btn.classList.toggle('shown', isTouch && api.enabled); document.body.classList.toggle('dbg-shown', isTouch && api.enabled); }

  btn.addEventListener('click', () => toggle());
  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Backquote') { toggle(); return; }
    if (!api.shown) return;
    const m = /^(?:Digit|Key)(.)$/.exec(e.code);
    const i = m ? KEYS.indexOf(m[1].toLowerCase()) : -1;
    if (i >= 0 && i < keys.length) teleport(keys[i]);
  });

  if (urlOn) { api.enabled = true; syncButton(); if (!isTouch) toggle(true); }


  function update(dt) {
    smooth = smooth ? smooth + (dt - smooth) * 0.1 : dt;
    if (!api.shown) return;
    acc += dt;
    if (acc < 0.25) return;
    acc = 0;
    const p = ctx.player, info = ctx.renderer.info.render;
    const deg = (((p.yaw * 180) / Math.PI) % 360 + 360) % 360;
    live.textContent = `x ${Math.round(p.pos.x)}  z ${Math.round(p.pos.z)}  yaw ${deg.toFixed(0)}°  ${(1 / smooth).toFixed(0)} fps  ${info.calls} calls  ${(info.triangles / 1000).toFixed(0)}k tris`;
  }
  return { update };
}
