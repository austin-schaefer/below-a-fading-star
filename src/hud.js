// HUD: the title card, a landmark name that fades in when you draw near, a notice line for failures, fps.
import { LANDMARKS, REGION_CARDS, landmarkDistance } from './world.js';
import { buildDebug } from './debug.js';

// The title card's loading bar: a hairline that fills as the world builds, with the current step's name
// under it. Built before anything else so the terrain's own steps show. Enables "Go out" once body.ready.
export function buildLoadBar() {
  const fill = document.querySelector('#load .fill');
  const step = document.querySelector('#load .step');
  const begin = document.getElementById('begin');
  let shown = 0;
  const ready = () => { if (fill) fill.style.width = '100%'; if (begin) begin.disabled = false; };
  if (document.body.classList.contains('ready')) ready();
  else new MutationObserver((_, ob) => { if (document.body.classList.contains('ready')) { ob.disconnect(); ready(); } }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  // Resolves after the browser has had a chance to paint, so the steps are seen and not batched.
  return (label, fraction) => {
    if (label && step) step.textContent = label;
    shown = Math.max(shown, Math.min(1, fraction)); // never backwards
    if (fill) fill.style.width = (shown * 100).toFixed(1) + '%';
    return new Promise((r) => { const t = setTimeout(r, 80); requestAnimationFrame(() => setTimeout(() => { clearTimeout(t); r(); })); });
  };
}

export function buildHud(ctx) {
  const card = document.getElementById('card');
  const place = document.getElementById('place');
  const placeName = document.getElementById('place-name');
  const placeLine = document.getElementById('place-line');
  const hint = document.getElementById('hint');
  const fps = document.getElementById('fps');
  const begin = document.getElementById('begin');

  begin.addEventListener('click', () => ctx.events.dispatchEvent(new CustomEvent('begin')));
  ctx.events.addEventListener('begin', () => card.classList.add('hidden'));
  // v14-B1 (#46): the pause is the settings panel. Escape (which lets go of the captured mouse) opens it, as the gear
  // does, on desktop and touch; its "Back to the moor" (or Escape again) shuts it. The title card is only the title.
  const pause = () => { card.classList.add('hidden'); if (ctx.settings) ctx.settings.open({ paused: true }); else { card.classList.remove('hidden'); card.classList.add('paused'); } };
  ctx.events.addEventListener('lock', (e) => {
    if (!e.detail && ctx.settings?.shown) return; // the settings panel releases the pointer itself
    if (!e.detail && ctx.player.enabled && ctx.player.everLocked) pause(); else card.classList.add('hidden');
  });
  // In drag-look mode (no capture to lose) Escape is the walk's: it opens the panel (settings.js shuts it on the next)
  ctx.events.addEventListener('pausetoggle', () => { if (!ctx.settings?.shown) pause(); });
  const dragBtn = document.getElementById('draglook');
  if (dragBtn) {
    dragBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const on = !ctx.player.dragLook;
      ctx.controls.setDragLook(on);
      if (on && !ctx.player.enabled) return; // they chose it before going out; begin as usual
      if (on) ctx.events.dispatchEvent(new CustomEvent('begin'));
    });
    const label = () => { dragBtn.textContent = ctx.player.dragLook ? 'Mouse look by dragging is on. Switch back to captured mouse' : 'Mouse trouble? Click to look by dragging instead.'; };
    ctx.events.addEventListener('draglook', label); label();
  }
  ctx.events.addEventListener('contextlost', () => {
    card.classList.remove('hidden'); card.classList.add('paused');
    hint.textContent = 'The graphics driver reset and the moor went dark. Reload the page to go back out.';
    hint.classList.add('shown');
    const err = document.getElementById('error');
    if (err) err.textContent = 'WebGL context lost (the GPU reset). Reload to continue; if it repeats, try ?q=low.';
  });
  ctx.events.addEventListener('lockfail', () => {
    if (('ontouchstart' in window) || navigator.maxTouchPoints > 0) return;
    hint.textContent = 'The mouse cannot be captured in this window. Hold the left button and drag to look.';
    hint.classList.add('shown'); setTimeout(() => hint.classList.remove('shown'), 9000);
  });

  const debug = buildDebug(ctx);
  const landmarkList = Object.entries(LANDMARKS);
  const regionList = Object.entries(REGION_CARDS), rw = {};
  let current = null, timer = 0;
  function update(dt) {
    debug.update(dt);
    const p = ctx.player.pos;
    let best = null, bestD = Infinity;
    const feet = p.y - (ctx.player.eye ?? 1.7);
    for (const [key, L] of landmarkList) {
      if (L.feet && (feet < L.feet[0] || feet > L.feet[1])) continue; // v14-B3: a deck's card is not the floor's under it
      const d = landmarkDistance(L, p.x, p.z);
      // a name card lying inside a broad landmark wins there; a broad card (v14-B5: Titan's Causeway, the whole deck)
      // wins over landmarks but gives way to every other card inside it
      const k = L.card && d < 6 ? d - (L.broad ? 500 : 1000) : d;
      if (k < bestD) { bestD = k; best = key; }
    }
    let near = bestD < 6 ? best : null;
    if (near === null && ctx.regions) { // no landmark card is up: a region card, where the region holds half the ground or more
      const w = ctx.regions.regionAt(p.x, p.z, rw);
      for (const [key, R] of regionList) if (w[R.region] >= 0.5) { near = 'region:' + key; break; }
    }
    if (near !== current) {
      current = near;
      if (near) {
        const C = near.startsWith('region:') ? REGION_CARDS[near.slice(7)] : LANDMARKS[near];
        placeName.textContent = C.name;
        placeLine.textContent = C.line || '';
        placeLine.style.display = C.line ? '' : 'none';
        place.classList.add('shown');
        timer = 7;
      } else place.classList.remove('shown');
    }
    if (current && timer > 0) { timer -= dt; if (timer <= 0) place.classList.remove('shown'); }
  }
  return { update, setFps: (v) => { fps.textContent = `${v.toFixed(0)} fps${ctx.pacing?.idle ? ' idle' : ''}`; } };
}
