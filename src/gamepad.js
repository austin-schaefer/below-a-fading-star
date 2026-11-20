// A gamepad (v17.1, #72). Fetched by src/controls.js at the first `gamepadconnected`, so a visitor without one never
// downloads it; it polls navigator.getGamepads() on its own requestAnimationFrame only while a pad is connected (a
// disconnect of the last one stops it), so the walk's frame pays nothing for it.
//
// The standard mapping (an Xbox, PlayStation or Switch Pro pad in Chromium and Firefox), by position:
//   left stick walks, analogue (past a dead zone the push is the speed: a light push is a slow walk);
//   right stick looks (a dead zone, a power curve, at most LOOK_YAW / LOOK_PITCH rad/s);
//   bottom face (A) hops; left face (X) does the act on offer; a trigger held (LT or RT) hurries, and so does a click of
//   the left stick, until the stick comes back to rest; Start (or Back / Select) opens the settings panel.
//   On the title card the bottom face or Start goes out, with no capture of the mouse (main.js's begin skips lock()).
//   In the panel: the d-pad or the left stick moves the focus to the nearest control that way (left and right step a
//   slider instead), the bottom face presses it, the right face (B) or Start shuts the panel, the right stick scrolls.
//   When the panel's api has `focusNext(dx, dy)` and `activate()` (v17.1 Q1's map: its marks move by where they lie)
//   they are asked first, and a `true` ends it; without them, or when they find nothing, plain DOM focus does it, so
//   any focusable mark works. B shuts the panel with settings.close(), never by "Back to the moor"'s click (below).
// Any other mapping gets the plain minimum: axes 0 and 1 walk, 2 and 3 look, button 0 hops (and presses in the panel),
// 1 shuts the panel, 2 does the act, 3 opens the panel; no d-pad.
//
// Hints: the first time a pad is used, the title's line of keys, the panel's line of keys and the act's offer (`E`) say
// the pad's buttons instead, in the same type (a letter or a word, no glyphs); a key, a click or a mouse move puts them
// back. ctx.gamepad: { active (the pad's hints are up), pads (polling), state() } for tools/gamepad-test.mjs.

const DEAD_MOVE = 0.16, DEAD_LOOK = 0.12;          // radial dead zones, fractions of the throw
const LOOK_YAW = 2.4, LOOK_PITCH = 1.6, LOOK_POW = 1.7; // rad/s at full throw; the response curve's power
const TRIGGER = 0.4;                                // a trigger past this hurries
const REPEAT_FIRST = 0.38, REPEAT_NEXT = 0.13;      // s: a held direction in the panel steps again after these
const SCROLL = 900;                                 // css px/s of panel scroll at full throw of the right stick

// labels by position (bottom, right, left, top face; triggers; start) for the three families the standard mapping covers
const LABELS = {
  xbox: { hop: 'A', back: 'B', act: 'X', trig: 'RT', start: 'Start' },
  ps: { hop: 'Cross', back: 'Circle', act: 'Square', trig: 'R2', start: 'Options' },
  nin: { hop: 'B', back: 'A', act: 'Y', trig: 'ZR', start: '+' },
  other: { hop: '1', back: '2', act: '3', trig: '', start: '4' },
};
const family = (g) => {
  if (g.mapping !== 'standard') return 'other';
  const id = g.id || '';
  if (/054c|playstation|dualshock|dualsense/i.test(id)) return 'ps';
  if (/057e|nintendo|switch|pro controller/i.test(id)) return 'nin';
  return 'xbox';
};

export function installGamepad(ctx) {
  if (ctx.gamepad) return ctx.gamepad;
  const P = ctx.controls.state, pad = ctx.controls.pad;
  const prev = new Uint8Array(32);         // the buttons held last poll
  let raf = 0, last = 0, lastIndex = -1, latch = false;
  let held = null, heldT = 0;               // the panel direction held, and when it steps next
  let lab = LABELS.xbox;
  const api = { active: false, get pads() { return raf !== 0; }, polls: 0, state: () => ({ x: pad.x, z: pad.z, hurry: pad.hurry, active: api.active, polls: api.polls, polling: raf !== 0 }) };
  ctx.gamepad = api;

  const connected = () => { try { return [...(navigator.getGamepads?.() || [])].filter((g) => g && g.connected !== false); } catch (e) { return []; } };
  function arm() { if (!raf && connected().length) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function disarm() { if (raf) cancelAnimationFrame(raf); raf = 0; pad.x = pad.z = 0; pad.hurry = false; prev.fill(0); held = null; }
  addEventListener('gamepadconnected', arm);
  addEventListener('gamepaddisconnected', () => { if (!connected().length) disarm(); });

  const card = document.getElementById('card');
  const titleUp = () => !P.enabled && card && !card.classList.contains('hidden') && document.body.classList.contains('ready');
  const panelUp = () => !!ctx.settings?.shown;
  const walkUp = () => P.enabled && !panelUp() && (!card || card.classList.contains('hidden'));

  // a stick through its radial dead zone: { x, y, m } with m in 0..1 after the dead zone
  const stick = (ax, ay, dead, out) => {
    const r = Math.hypot(ax, ay);
    if (r <= dead) { out.x = out.y = out.m = 0; return out; }
    const m = Math.min(1, (r - dead) / (1 - dead));
    out.x = ax / r * m; out.y = ay / r * m; out.m = m;
    return out;
  };
  const L = { x: 0, y: 0, m: 0 }, R = { x: 0, y: 0, m: 0 };

  function tick(now) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
    api.polls++;
    const pads = connected();
    if (!pads.length) { disarm(); return; }
    // the pad last pressed leads; else the first
    let g = pads.find((p) => p.index === lastIndex) || pads[0];
    for (const p of pads) if (p !== g && p.buttons.some((b) => b.pressed)) { g = p; break; }
    if (g.index !== lastIndex) { lastIndex = g.index; prev.fill(0); lab = LABELS[family(g)]; }
    const std = g.mapping === 'standard', B = g.buttons, A = g.axes;
    const btn = (i) => !!B[i] && (B[i].pressed || B[i].value > 0.5);
    const down = (i) => btn(i) && !prev[i];
    stick(A[0] || 0, A[1] || 0, DEAD_MOVE, L);
    stick(A[2] || 0, A[3] || 0, DEAD_LOOK, R);
    let any = L.m > 0 || R.m > 0;
    for (let i = 0; i < B.length && !any; i++) if (btn(i)) any = true;
    if (any && !api.active) showPad(true);

    const iHop = 0, iBack = 1, iAct = 2;
    const startDown = std ? down(9) || down(8) : down(3);
    if (titleUp()) {
      if (down(iHop) || startDown) ctx.events.dispatchEvent(new CustomEvent('begin', { detail: { pad: true } }));
      pad.x = pad.z = 0; pad.hurry = false;
    } else if (panelUp()) {
      pad.x = pad.z = 0; pad.hurry = false;
      panel(dt, std, down, btn, startDown);
    } else if (walkUp()) {
      pad.x = L.x; pad.z = -L.y;
      if (std && down(10)) latch = true;
      if (L.m === 0) latch = false;
      const trig = std && ((B[6]?.value || 0) > TRIGGER || (B[7]?.value || 0) > TRIGGER);
      pad.hurry = trig || latch;
      if (R.m > 0) {
        const k = Math.pow(R.m, LOOK_POW) / R.m; // the curve on the throw, the direction kept
        P.yaw -= R.x * k * LOOK_YAW * dt;
        P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch - R.y * k * LOOK_PITCH * dt));
        P.lookQuiet = 0;
      }
      if (down(iHop)) ctx.controls.hop();
      if (down(iAct)) ctx.acts?.doOffered?.();
      if (startDown) ctx.settings?.open({ paused: true });
    } else { pad.x = pad.z = 0; pad.hurry = false; }
    for (let i = 0; i < prev.length; i++) prev[i] = btn(i) ? 1 : 0;
  }

  // --- the panel, through DOM focus
  const root = () => document.getElementById('settings-panel');
  const focusables = () => {
    const r = root();
    if (!r) return [];
    return [...r.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')]
      .filter((el) => !el.disabled && !el.hidden && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
  };
  const focusEl = (el) => { el.focus({ focusVisible: true }); el.scrollIntoView?.({ block: 'nearest' }); };
  const current = () => { const a = document.activeElement, r = root(); return a && r && r.contains(a) && a !== r ? a : null; };
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  // the nearest control in a direction from the focused one: ahead of it, scored by the distance along plus twice
  // the distance across (so a list goes row by row and a map's marks go to the one that way)
  function move(dir) {
    const api2 = ctx.settings, [dx, dy] = DIRS[dir];
    if (typeof api2?.focusNext === 'function') { // the panel's own (v17.1 Q1: the map's marks by where they lie)
      let moved = false;
      try { moved = api2.focusNext(dx, dy) === true; } catch (e) { console.error('[fp] focusNext failed:', e); }
      if (moved || current()) return;
    }
    const els = focusables();
    if (!els.length) return;
    const cur = current();
    if (cur && cur.type === 'range' && (dir === 'left' || dir === 'right')) { stepRange(cur, dir === 'right' ? 1 : -1); return; }
    if (!cur) { focusEl(els[0]); return; }
    const c = cur.getBoundingClientRect(), cx = c.left + c.width / 2, cy = c.top + c.height / 2;
    let best = null, bs = Infinity;
    for (const el of els) {
      if (el === cur) continue;
      const r = el.getBoundingClientRect(), ex = r.left + r.width / 2, ey = r.top + r.height / 2;
      const along = (ex - cx) * dx + (ey - cy) * dy, across = Math.abs((ex - cx) * dy - (ey - cy) * dx);
      // ahead: past the near edge of the focused one that way (a row's buttons share a top)
      const half = dx ? c.width / 2 : c.height / 2;
      if (along <= Math.min(half, 4)) continue;
      const s = along + 2 * across;
      if (s < bs) { bs = s; best = el; }
    }
    if (best) focusEl(best);
  }
  function stepRange(el, s) {
    const step = Number(el.step) > 0 ? Number(el.step) : 1, span = (Number(el.max) || 100) - (Number(el.min) || 0);
    const by = Math.max(step, Math.round(span / 20 / step) * step);
    const v = Math.max(Number(el.min) || 0, Math.min(Number(el.max) || 100, Number(el.value) + s * by));
    if (v === Number(el.value)) return;
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function activate() {
    const cur = current();
    if (!cur) { const els = focusables(); if (els.length) focusEl(els[0]); return; }
    // "Back to the moor" takes the mouse again on a click; a pad's press is not a gesture the capture takes, and a
    // refused capture would fall back to drag-look: shut the panel instead
    if (cur.id === 'set-close') { closePanel(); return; }
    const api2 = ctx.settings;
    if (typeof api2?.activate === 'function') { try { if (api2.activate() === true) return; } catch (e) { console.error('[fp] activate failed:', e); } }
    if (cur.type === 'range' || !current()) return;
    cur.click();
  }
  function closePanel() { ctx.settings?.close(); document.activeElement?.blur?.(); }
  function panel(dt, std, down, btn, startDown) {
    if (down(1) || (std && startDown)) { closePanel(); return; }
    if (down(0)) activate();
    // a direction: the d-pad, else the left stick past half its throw
    let dir = null;
    if (std && btn(12)) dir = 'up'; else if (std && btn(13)) dir = 'down'; else if (std && btn(14)) dir = 'left'; else if (std && btn(15)) dir = 'right';
    else if (L.m > 0.5) dir = Math.abs(L.x) > Math.abs(L.y) ? (L.x > 0 ? 'right' : 'left') : (L.y > 0 ? 'down' : 'up');
    if (dir !== held) { held = dir; heldT = REPEAT_FIRST; if (dir) move(dir); }
    else if (dir && (heldT -= dt) <= 0) { heldT = REPEAT_NEXT; move(dir); }
    if (R.m > 0 && Math.abs(R.y) > 0.2) root()?.scrollBy?.(0, R.y * SCROLL * dt);
  }
  // --- hints: the pad's buttons in place of the keys while the pad is what is used
  const saved = new Map();
  const swap = (el, html) => { if (!el) return; if (!saved.has(el)) saved.set(el, el.innerHTML); el.innerHTML = html; };
  const k = (s) => `<kbd>${s}</kbd>`;
  function showPad(on) {
    if (on === api.active) return;
    api.active = on;
    document.body.classList.toggle('pad', on);
    if (on) {
      const trig = lab.trig ? `${k(lab.trig)} hurry` : 'stick click hurry';
      swap(card?.querySelector('.keys'), `${k(lab.hop)} go out · left stick walk · right stick look<br>${trig} · ${k(lab.hop)} hop · ${k(lab.start)} settings`);
      swap(document.querySelector('#settings-panel .set-keys'), `left stick walk · right stick look · ${trig} · ${k(lab.hop)} hop · ${k(lab.act)} where something is offered · ${k(lab.start)} this panel · d-pad and ${k(lab.hop)} to choose here, ${k(lab.back)} to go back`);
      const actK = document.querySelector('#act kbd');
      if (actK) { if (!saved.has(actK)) saved.set(actK, actK.innerHTML); actK.textContent = lab.act; }
      addEventListener('keydown', toKeys, true); addEventListener('mousedown', toKeys, true); addEventListener('mousemove', onMouse, true); addEventListener('touchstart', toKeys, true);
    } else {
      for (const [el, html] of saved) el.innerHTML = html;
      saved.clear();
      removeEventListener('keydown', toKeys, true); removeEventListener('mousedown', toKeys, true); removeEventListener('mousemove', onMouse, true); removeEventListener('touchstart', toKeys, true);
    }
  }
  function toKeys() { showPad(false); }
  let mouseRun = 0;
  function onMouse(e) { mouseRun += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0); if (mouseRun > 40) { mouseRun = 0; showPad(false); } }
  // a pad's press is a gesture to Chromium's autoplay only in some versions: if the sound has not started a moment
  // after going out on the pad, say what starts it
  ctx.events.addEventListener('begin', (e) => {
    if (!e.detail?.pad) return;
    setTimeout(() => {
      const ac = ctx.audio?.ctx;
      if (!ac || ac.state !== 'suspended' || ctx.audio?.muted) return;
      const hint = document.getElementById('hint');
      if (!hint) return;
      hint.textContent = 'The sound waits for a first key or click.';
      hint.classList.add('shown'); setTimeout(() => hint.classList.remove('shown'), 7000);
    }, 2000);
  });
  // when the pad opens the panel, the first control takes the focus, so its ring shows where the pad is
  const watchOpen = () => {
    if (panelUp() && api.active && !current()) { const els = focusables(); if (els.length) focusEl(els[0]); }
  };
  const mo = new MutationObserver(watchOpen);
  const sroot = document.getElementById('settings');
  if (sroot) mo.observe(sroot, { attributes: true, attributeFilter: ['class'] });

  // the focus ring a pad needs (a script's focus() shows no ring in some browsers) and the act's key on a touch device
  const st = document.createElement('style');
  st.textContent = 'body.pad #settings-panel :focus { outline: 1px solid var(--ink, #ffd9b0); outline-offset: 3px; } body.touch.pad #act kbd { display: inline; } @media (max-width: 700px) { body.pad #card .keys { display: block; } }';
  document.head.appendChild(st);

  arm();
  return api;
}
