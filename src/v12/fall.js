// A fall that costs (v12 H0, part 7; plans/wilderness-v12.md, "Falling costs something"). Behind ?fall=1, off by
// default until the owner has tried it (FALL_DEFAULT below is the one line that switches it). A fall of more than
// FALL_M closes the view as the walker drops (no impact is shown), holds the dark a moment, and wakes them lying by
// the keep's gate (the spawn), the view opening on the sky and coming down to the gate as they get up.
// Reads the controls' fall state (player.fallTop: the highest the feet have been since they last stood;
// player.floorBelow: the floor under them now) and holds the walker with ctx.controls.carry while dark and waking.
// One fixed DOM layer (the eyelids, two radial gradients) and one per-frame check while idle: nothing drawn in 3D.
// No sound yet: the wind of the fall wants the `sound-design` pass (a cue in src/v10/sound.js and a row in audio-test).
const FALL_DEFAULT = false; // the owner's call: true makes the blackout the default, ?fall=0 the way back
const FALL_M = 12;          // m: a drop of more than this blacks out
const CLOSE_S = 0.55, DARK_S = 1.4, WAKE_S = 3.2; // s: the shortest close (a long fall closes over 0.8 of its time), the dark, the waking

export async function build(ctx) {
  const q = new URLSearchParams(location.search).get('fall');
  const on = q === '1' ? true : q === '0' ? false : FALL_DEFAULT;
  if (!on) return;
  const el = document.createElement('div');
  el.id = 'fall';
  el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:8;opacity:0;';
  document.body.appendChild(el);
  // the lids: a dark that closes from the edges to a slit and then to nothing (amount 0 open .. 1 shut)
  function lids(a) {
    if (a <= 0.001) { el.style.opacity = '0'; return; }
    const open = Math.max(0, 1 - a);
    const ry = 75 * open * open, rx = 95 * Math.sqrt(open);
    el.style.opacity = '1';
    el.style.background = a >= 0.999 ? '#000'
      : `radial-gradient(ellipse ${rx.toFixed(1)}% ${ry.toFixed(1)}% at 50% 50%, rgba(0,0,0,0) 55%, rgba(4,2,6,${(0.6 + 0.4 * a).toFixed(3)}) 100%), rgba(0,0,0,${(a * a * 0.85).toFixed(3)})`;
  }
  const p = ctx.player, SP = ctx.spawn;
  let phase = 'idle', t = 0, amount = 0, release = null, closeS = CLOSE_S;
  const hold = new ctx.THREE.Vector3();
  const state = ctx.fall = { get phase() { return phase; }, get amount() { return amount; }, falls: 0, FALL_M };
  const ease = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);

  ctx.events.addEventListener('land', (e) => {
    if (phase !== 'falling') return;
    if (e.detail.drop > FALL_M) dark();
    else phase = 'opening'; // caught short by a ledge: the view comes back
  });
  function dark() {
    phase = 'dark'; t = 0; amount = 1; lids(1); state.falls++;
    hold.copy(p.pos);
    // a teleport while dark (the settings map) ends it there: the view opens where they went
    release = ctx.controls.carry({ step(pos) { pos.copy(hold); }, drop() { release = null; if (phase === 'dark') phase = 'opening'; } });
  }
  function wake() {
    release?.(); release = null;
    const at = ctx.controls.placeAt(SP.x, SP.z);
    const gy = at.y, x = at.x, z = at.z;
    phase = 'waking'; t = 0;
    p.yaw = SP.yaw; p.pitch = 1.15;
    // lying, then up onto the feet; the look eases from the sky down to the gate; walking cuts it short
    release = ctx.controls.carry({
      step(pos, dt) {
        const k = ease((t - 1.2) / 1.6);
        pos.set(x, gy + 0.3 + (p.eye - 0.3) * k, z);
      },
      look() { return t > 0.9 ? { yaw: SP.yaw, pitch: -0.04, rate: 0.9 + 1.5 * ease((t - 0.9) / 2) } : null; },
      drop() { release = null; phase = 'idle'; amount = 0; lids(0); },
    });
  }
  ctx.registerUpdate((dt) => {
    if (phase === 'idle') {
      if (p.onGround || p.carried || p.vy > -3) return;
      const total = p.fallTop - p.floorBelow, fallen = p.fallTop - (p.pos.y - p.eye);
      if (total > FALL_M && fallen > 1) {
        // shut over most of the time left to the ground (the visitor sees the fall begin), and well before it
        const v = -p.vy, rem = total - fallen;
        closeS = Math.max(CLOSE_S, 0.8 * (-v + Math.sqrt(v * v + 24 * rem)) / 12);
        phase = 'falling'; t = 0;
      }
      return;
    }
    t += dt;
    if (phase === 'falling') {
      const total = Math.max(1, p.fallTop - p.floorBelow), fallen = p.fallTop - (p.pos.y - p.eye);
      amount = Math.max(amount, Math.min(1, t / closeS), clamp01((fallen - 1) / Math.max(1, total * 0.85 - 1)));
      lids(amount);
      if (p.onGround && phase === 'falling') { if (p.fallTop - (p.pos.y - p.eye) > FALL_M) dark(); else phase = 'opening'; }
    } else if (phase === 'opening') {
      amount = Math.max(0, amount - dt * 2.5); lids(amount);
      if (amount <= 0) phase = 'idle';
    } else if (phase === 'dark') {
      if (t >= DARK_S) wake();
    } else if (phase === 'waking') {
      amount = 1 - ease((t - 0.3) / 1.8); lids(amount);
      if (t >= WAKE_S || (t > 1.6 && p.intent > 0.3)) {
        const r = release; release = null; phase = 'idle'; amount = 0; lids(0);
        if (r) { r(); ctx.controls.placeAt(p.pos.x, p.pos.z); }
      }
    }
  });
}
const clamp01 = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
