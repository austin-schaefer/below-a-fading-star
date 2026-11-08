// HUD: the title card, a landmark name that fades in when you draw near, a hint line, fps.
import { LANDMARKS } from './world.js';
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
  let hinted = false; // the opening hint shows once per visit, not on every return from the paused card
  ctx.events.addEventListener('begin', () => {
    card.classList.add('hidden');
    if (hinted) return;
    hinted = true;
    hint.classList.add('shown'); setTimeout(() => hint.classList.remove('shown'), 7000);
  });
  ctx.events.addEventListener('lock', (e) => { if (!e.detail && ctx.player.enabled && ctx.player.everLocked) { card.classList.remove('hidden'); card.classList.add('paused'); } else card.classList.add('hidden'); });
  // Paused in drag-look mode (no capture to lose): Esc toggles the card; the button resumes.
  ctx.events.addEventListener('pausetoggle', () => {
    if (card.classList.contains('hidden')) { card.classList.remove('hidden'); card.classList.add('paused'); }
    else card.classList.add('hidden');
  });
  const dragBtn = document.getElementById('draglook');
  if (dragBtn) {
    dragBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const on = !ctx.player.dragLook;
      ctx.controls.setDragLook(on);
      if (on && !ctx.player.enabled) return; // they chose it before going out; begin as usual
      if (on) ctx.events.dispatchEvent(new CustomEvent('begin'));
    });
    const label = () => { dragBtn.textContent = ctx.player.dragLook ? 'Mouse look by dragging is on. Switch back to captured mouse' : 'Mouse trouble? Look by dragging instead (no mouse capture)'; };
    ctx.events.addEventListener('draglook', label); label();
  }
  ctx.events.addEventListener('lockfail', () => {
    if (('ontouchstart' in window) || navigator.maxTouchPoints > 0) return;
    hint.textContent = 'The mouse cannot be captured in this window. Hold the left button and drag to look.';
    hint.classList.add('shown'); setTimeout(() => hint.classList.remove('shown'), 9000);
  });

  const debug = buildDebug(ctx);
  let current = null, timer = 0;
  function update(dt) {
    debug.update(dt);
    const p = ctx.player.pos;
    let best = null, bestD = Infinity;
    for (const [key, L] of Object.entries(LANDMARKS)) {
      const d = Math.hypot(p.x - L.x, p.z - L.z) - L.r;
      if (d < bestD) { bestD = d; best = key; }
    }
    const near = bestD < 6 ? best : null;
    if (near !== current) {
      current = near;
      if (near) {
        placeName.textContent = LANDMARKS[near].name;
        placeLine.textContent = LANDMARKS[near].line;
        place.classList.add('shown');
        timer = 7;
      } else place.classList.remove('shown');
    }
    if (current && timer > 0) { timer -= dt; if (timer <= 0) place.classList.remove('shown'); }
  }
  return { update, setFps: (v) => { fps.textContent = `${v.toFixed(0)} fps`; } };
}
