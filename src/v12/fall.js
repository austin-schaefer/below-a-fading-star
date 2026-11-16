// A fall that costs (v12 H0, part 7; v15-W3). On by default since v15-W3 (the owner's "allow you to go up to edge and
// fall in": the edges are open, so the cost is what keeps a drop meaning something); a visitor turns it off in the
// settings panel (localStorage 'fp-fall', '0' off, anything else on), and ?fall=1 / ?fall=0 in the URL wins over that.
// The DOM layer is always built; the update acts only while it is on, so the toggle works live. A fall of more than
// FALL_M, or a landing in a trap (ctx.fall.trap(fn) or ctx.fallTraps.push(fn): a place below with no way out, which
// wakes the walker whether or not falling costs), closes the view as the walker
// drops (no impact is shown), holds the dark a moment, and wakes them lying on the last ground they walked, BACK_M
// back along their own trail from the lip they left, facing it: the cost is seconds, not a walk back. With no trail
// (a teleport and straight off), at the keep's gate, as before. Off: the fall plays and the walk goes on below.
// Reads the controls' fall state (player.fallTop: the highest the feet have been since they last stood;
// player.floorBelow: the floor under them now) and holds the walker with ctx.controls.carry while dark and waking.
// One fixed DOM layer (the eyelids, two radial gradients) and one per-frame check while idle: nothing drawn in 3D.
// No sound yet: the wind of the fall wants the `sound-design` pass (a cue in src/v10/sound.js and a row in audio-test).
const FALL_M = 12;          // m: a drop of more than this blacks out
const BACK_M = 3.5, TRAIL = 24, SAMPLE_M = 0.5; // m back from the lip; the trail's points, and their spacing
const CLOSE_S = 0.55, DARK_S = 1.4, WAKE_S = 3.2; // s: the shortest close (a long fall closes over 0.8 of its time), the dark, the waking

export async function build(ctx) {
  const q = new URLSearchParams(location.search).get('fall');
  const stored = () => { try { return localStorage.getItem('fp-fall') !== '0'; } catch (e) { return true; } }; // private mode: on
  let on = q === '1' ? true : q === '0' ? false : stored();
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
  const state = ctx.fall = { get phase() { return phase; }, get enabled() { return on; },
    // the settings toggle calls this after writing 'fp-fall'; the URL still wins
    refresh() { on = q === '1' ? true : q === '0' ? false : stored(); }, get amount() { return amount; }, falls: 0, FALL_M,
    wake: () => wake(null), // the waking alone, from the dark, at the gate: the bench's last leg (perf.js), whether or not falling costs
    trap(fn) { traps.push(fn); return () => { const i = traps.indexOf(fn); if (i >= 0) traps.splice(i, 1); }; }, // fn(x, z, feet) → true: a landing there has no way out
    get spot() { return spot; } }; // where the last waking was (for tests): { x, y, z, yaw } or null
  // the trail: the last TRAIL places the feet stood on ground, SAMPLE_M apart, newest last; a jump of more than 3 m
  // between frames (a teleport, a carry's end) starts it again
  const trail = [], traps = (ctx.fallTraps ||= []); // a module built before this one pushes onto ctx.fallTraps
  let spot = null, lx = Infinity, lz = 0;
  // (the trail is held still from the moment the feet leave standable ground for more than 0.3 s until they have stood
  // again for a second, so a tumble down a talus does not write its stops into the way back)
  let air = 0, stood = 0, frozen = false;
  function remember(dt) {
    const x = p.pos.x, z = p.pos.z;
    const d = Math.hypot(x - lx, z - lz);
    if (d > 3) { trail.length = 0; frozen = false; }
    lx = x; lz = z;
    if (p.carried) return;
    if (!p.onGround || p.steep) { air += dt; stood = 0; if (air > 0.3) frozen = true; return; }
    air = 0; stood += dt;
    if (frozen && stood < 1) return;
    frozen = false;
    if (p.hopping) return;
    const last = trail[trail.length - 1];
    if (last && Math.hypot(x - last.x, z - last.z) < SAMPLE_M && Math.abs(p.pos.y - p.eye - last.y) < 0.3) return;
    if (trail.length >= TRAIL) trail.shift();
    trail.push({ x, z, y: p.pos.y - p.eye });
  }
  // the place to wake: BACK_M back along the trail from its newest point (the lip), facing the lip
  function backFromLip() {
    if (!trail.length) return null;
    const lip = trail[trail.length - 1];
    let at = lip, run = 0;
    for (let i = trail.length - 2; i >= 0 && run < BACK_M; i--) { run += Math.hypot(trail[i].x - at.x, trail[i].z - at.z); at = trail[i]; }
    const dx = lip.x - at.x, dz = lip.z - at.z;
    return { x: at.x, y: at.y, z: at.z, yaw: Math.hypot(dx, dz) > 0.3 ? Math.atan2(-dx, -dz) : p.yaw };
  }
  const trapped = (x, z, feet) => traps.some((fn) => fn(x, z, feet));
  const ease = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);

  ctx.events.addEventListener('land', (e) => {
    if (phase !== 'falling') return;
    if ((on && e.detail.drop > FALL_M) || trapped(e.detail.x, e.detail.z, e.detail.y)) dark();
    else phase = 'opening'; // caught short by a ledge: the view comes back
  });
  let back = null;
  function dark() {
    phase = 'dark'; t = 0; amount = 1; lids(1); state.falls++;
    back = backFromLip();
    hold.copy(p.pos);
    // a teleport while dark (the settings map) ends it there: the view opens where they went
    release = ctx.controls.carry({ step(pos) { pos.copy(hold); }, drop() { release = null; if (phase === 'dark') phase = 'opening'; } });
  }
  function wake(b) {
    release?.(); release = null;
    const at = b ? ctx.controls.placeAt(b.x, b.z, b.y) : ctx.controls.placeAt(SP.x, SP.z);
    const gy = at.y, x = at.x, z = at.z, yaw = b ? b.yaw : SP.yaw, pitch = b ? -0.18 : -0.04;
    spot = { x, y: gy, z, yaw };
    trail.length = 0; lx = x; lz = z;
    phase = 'waking'; t = 0;
    p.yaw = yaw; p.pitch = 1.15;
    // lying, then up onto the feet; the look eases from the sky down to the gate; walking cuts it short
    release = ctx.controls.carry({
      step(pos, dt) {
        const k = ease((t - 1.2) / 1.6);
        pos.set(x, gy + 0.3 + (p.eye - 0.3) * k, z);
      },
      look() { return t > 0.9 ? { yaw, pitch, rate: 0.9 + 1.5 * ease((t - 0.9) / 2) } : null; },
      drop() { release = null; phase = 'idle'; amount = 0; lids(0); },
    });
  }
  ctx.registerUpdate((dt) => {
    if (phase === 'idle') {
      remember(dt);
      if ((p.onGround && !p.steep) || p.carried || (p.vy > -3 && !p.steep)) return; // (a slide down a face too steep to stand is a fall: p.steep)
      const total = p.fallTop - p.floorBelow, fallen = p.fallTop - (p.pos.y - p.eye);
      if (fallen > 1 && ((on && total > FALL_M) || trapped(p.pos.x, p.pos.z, p.floorBelow))) {
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
      // (touching ground too steep to stand, after more than FALL_M, is the landing too: a slide down a talus is not watched)
      if (p.onGround && phase === 'falling') { const drop = p.fallTop - (p.pos.y - p.eye); if ((on && drop > FALL_M) || trapped(p.pos.x, p.pos.z, p.pos.y - p.eye)) dark(); else if (!p.steep) phase = 'opening'; }
    } else if (phase === 'opening') {
      amount = Math.max(0, amount - dt * 2.5); lids(amount);
      if (amount <= 0) phase = 'idle';
    } else if (phase === 'dark') {
      if (t >= DARK_S) { wake(back); back = null; }
    } else if (phase === 'waking') {
      amount = 1 - ease((t - 0.3) / 1.8); lids(amount);
      if (t >= WAKE_S || (t > 1.6 && p.intent > 0.3)) {
        const r = release; release = null; phase = 'idle'; amount = 0; lids(0);
        if (r) { r(); ctx.controls.placeAt(p.pos.x, p.pos.z, spot ? spot.y : undefined); }
      }
    }
  });
}
const clamp01 = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
