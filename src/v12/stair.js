// The Diffident Stair (v12-H3). On the foot of the east wall a few Heliarch steps stand in the turf going nowhere,
// between two posts that carry the sign of the sun; from them a line of the same slabs runs west across the moor,
// lying in the grass like a broken pavement and turning at right angles. Step onto the last standing step and the next
// slab tears itself out of its bed in the turf, flies up edge-on with its sign burning, turns flat and settles in its
// place; then the next, a few strides ahead of the feet and never more. Behind the walker the slabs wait a moment,
// then tip up and sink away to their beds. So the stair is only ever a short length of steps in the open air, which
// climbs, turning at landings (kerbed: a landing is safe to stand on), to the foot of a lattice come low over the
// moor, a hundred metres up, where the one who tends the lattices lives (src/v12/stair/top.js,
// stories/the-tender-of-the-lattices.md). From elsewhere in the valley a walker on it stands on almost nothing.
//
// The feet and the eye agree: a slab holds the walker only once it has settled (a = 1). The place of a slab not yet
// come is a held edge (a stacked floor's keep), so a walker who outruns the stair stops at its end and waits; a
// landing's sides are held; a flight's sides are not, so a walker who steers off one falls (the edge-guard keeps a
// walker who is not steering at it on). Coming down is the same, the slabs below rising to meet the feet.
// The window: everything within NEAR m of the walker's element along the path is called, and, the way they are going,
// as far again as they cover while a slab comes up (so the slabs are seen to arrive a few strides ahead at a walk).
//
// Draws: treads, landings, kerbs, beds (one instanced mesh each), the stub (one), the dust (one points), and the top's
// (top.js). One stacked floor (`stair`), no colliders on the stair itself. ctx.stair: { plan, state, stats(), ... }.
// ?stair=0 leaves it out.
import * as THREE from 'three';
import { hyp } from '../noise.js';
import { buildPlan, makeIndex, inside, KIND, RISE, GOING, WIDTH, STUB } from './stair/plan.js';
import { treadGeometry, landingGeometry, kerbGeometry, bedGeometry, slabMaterial } from './stair/treads.js';
import { buildStub } from './stair/stub.js';
import { buildDust } from './stair/dust.js';
import { buildTop } from './stair/top.js';

export const STAIR_OFF = typeof location !== 'undefined' && new URLSearchParams(location.search).get('stair') === '0';
const TP = new THREE.Vector3();
const NEAR = 2.6, TAIL = 4.2, LEAD = 1.15; // m of path called round the walker (TAIL behind them); s of their way called ahead
const T_ARRIVE = 1.3, T_LEAVE = 4.2;     // s for a slab to come up from its bed, and to go back down to it
const LINGER = 1.1, RIPPLE = 0.07;       // s a slab stays after it leaves the window; s between one slab starting and the next

export async function build(ctx) {
  if (STAIR_OFF) { ctx.stair = { off: true, stats: () => ({ calls: 0, tris: 0 }) }; return; }
  const { scene, terrain: T } = ctx;
  const low = ctx.quality === 'low';
  const t0 = performance.now();
  const rng = ctx.makeRng(12301);
  const P = buildPlan((x, z) => T.heightAt(x, z));
  const E = P.els, N = E.length, find = makeIndex(E);

  // ------------------------------------------------------------------ state
  // a: 0 in its bed .. 1 in its place; want: called; wait: s before it may start (the ripple, the linger)
  const a = new Float32Array(N), want = new Uint8Array(N), wait = new Float32Array(N), seed = new Float32Array(N);
  const fixed = (e) => e.kind === KIND.STUB || e.kind === KIND.TOP;
  for (const e of E) { a[e.i] = fixed(e) ? 1 : 0; seed[e.i] = rng(); }
  const present = (i) => a[i] >= 1;

  // ------------------------------------------------------------------ the floor
  let top = {}; // the top's own floor and held edges (top.js), set below
  const landings = E.filter((e) => e.kind === KIND.LANDING || e.kind === KIND.TOP || e.i === STUB - 1);
  const floor = (x, z) => {
    const L = find(x, z);
    let best = null;
    for (let k = 0; k < L.length; k++) {
      const e = E[L[k]];
      if (!present(e.i) || !inside(e, x, z)) continue;
      if (best === null || e.y > best) best = e.y;
    }
    return best;
  };
  // held: the place of a slab that has not come (a walker waits at the end of the stair), and a band round each
  // landing (and the stub's top) that no settled slab covers
  const keep = (x, z) => {
    const L = find(x, z);
    for (let k = 0; k < L.length; k++) { const e = E[L[k]]; if (inside(e, x, z) && !present(e.i)) return true; }
    for (const e of landings) if (present(e.i) && inside(e, x, z, 0.9) && floor(x, z) === null) return true;
    return top.keep ? top.keep(x, z) : false;
  };
  const removeFloor = ctx.addWalkable(floor, { stack: true, keep, name: 'stair' });

  // ------------------------------------------------------------------ the slabs
  const mat = slabMaterial(true);
  const treads = E.filter((e) => e.kind === KIND.TREAD || e.kind === KIND.STUB);
  const lands = E.filter((e) => e.kind === KIND.LANDING || e.kind === KIND.TOP); // the top never moves (fixed: a = 1)
  function instanced(geo, list, name) {
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    const glow = new THREE.InstancedBufferAttribute(new Float32Array(list.length), 1); glow.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iGlow', glow);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.castShadow = true; m.receiveShadow = true; m.name = name; m.frustumCulled = false;
    const col = new THREE.Color();
    list.forEach((e, j) => { const v = 0.9 + seed[e.i] * 0.2; m.setColorAt(j, col.setRGB(v, v * (0.98 + seed[e.i] * 0.03), v)); });
    scene.add(m);
    return { m, glow, list };
  }
  const tGeo = treadGeometry(ctx.makeRng(12302), GOING, WIDTH);
  const TR = instanced(tGeo, treads, 'stair-treads');
  // landings come in two sizes (a turn's square and a switchback's long one): one instanced mesh for each
  const sizes = new Map();
  for (const e of lands) { const k = `${e.hw.toFixed(2)}x${e.hd.toFixed(2)}`; if (!sizes.has(k)) sizes.set(k, []); sizes.get(k).push(e); }
  const LAS = [...sizes.values()].map((list, n) => instanced(landingGeometry(ctx.makeRng(12303 + n), list[0].hw * 2, list[0].hd * 2), list, `stair-landings-${n}`));
  // the kerbs: along each landing's sides, open where a flight meets it
  const kerbs = [];
  for (const e of lands) {
    const mouths = E.filter((o) => (o.i === e.i - 1 || o.i === e.i + 1) && o.kind !== KIND.LANDING);
    // the four sides in the landing's frame: forward (+f), back (-f), left (+r... the walker's right is r)
    for (const [fx, rx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (e.kind === KIND.TOP && fx === 1) continue; // the top's far side opens onto the tender's deck
      const along = fx !== 0 ? e.hw : e.hd, cf = fx * (e.hd - 0.12), cr = rx * (e.hw - 0.12);
      // the open stretches on this side: where a neighbouring flight's tread touches it (a switchback has two)
      const opens = [];
      for (const o of mouths) {
        const dx = o.cx - e.cx, dz = o.cz - e.cz, f = dx * e.ux + dz * e.uz, r = dx * -e.uz + dz * e.ux;
        if (fx !== 0 && Math.sign(f) === fx && Math.abs(f) > e.hd - 0.3) opens.push([r - o.hw - 0.05, r + o.hw + 0.05]);
        if (rx !== 0 && Math.sign(r) === rx && Math.abs(r) > e.hw - 0.3) opens.push([f - o.hw - 0.05, f + o.hw + 0.05]);
      }
      opens.sort((p, q) => p[0] - q[0]);
      const segs = []; let at = -along;
      for (const [o0, o1] of opens) { segs.push([at, o0]); at = o1; }
      segs.push([at, along]);
      for (const [s0, s1] of segs) {
        if (s1 - s0 < 0.25) continue;
        const mid = (s0 + s1) / 2, len = s1 - s0;
        kerbs.push({ e, f: fx !== 0 ? cf : mid, r: rx !== 0 ? cr : mid, len, across: fx !== 0 });
      }
    }
  }
  const KM = new THREE.InstancedMesh(kerbGeometry(ctx.makeRng(12304)), mat, Math.max(1, kerbs.length));
  KM.geometry.setAttribute('iGlow', new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, kerbs.length)), 1));
  KM.instanceMatrix.setUsage(THREE.DynamicDrawUsage); KM.castShadow = true; KM.receiveShadow = true; KM.frustumCulled = false; KM.name = 'stair-kerbs';
  KM.count = kerbs.length;
  scene.add(KM);

  // the empty beds: one under each slab that lies in the turf (not on another)
  const bedEls = E.filter((e) => e.rest && e.rest.on < 0);
  const BM = new THREE.InstancedMesh(bedGeometry(WIDTH, GOING), mat, bedEls.length);
  BM.geometry.setAttribute('iGlow', new THREE.InstancedBufferAttribute(new Float32Array(bedEls.length), 1));
  BM.receiveShadow = true; BM.name = 'stair-beds';

  // ------------------------------------------------------------------ poses
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Qt = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1);
  const X = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(), AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
  const basis = new THREE.Matrix4();
  const sstep = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  // the rest's tilt: the turf's slope under the bed (pitch along, roll across), and a little askew
  for (const e of E) {
    if (!e.rest) continue;
    const g = (f, r) => T.heightAt(e.cx + e.ux * f - e.uz * r, e.cz + e.uz * f + e.ux * r);
    e.rest.pitch = Math.atan2(g(e.hd, 0) - g(-e.hd, 0), 2 * e.hd) * (e.rest.on < 0 ? 1 : 0.3);
    e.rest.roll = Math.atan2(g(0, e.hw) - g(0, -e.hw), 2 * e.hw) * (e.rest.on < 0 ? 1 : 0.3);
    e.rest.yaw = (seed[e.i] - 0.5) * (e.rest.on < 0 ? 0.06 : 0.3);
  }
  // write the pose of element e at a (0 bed .. 1 place) into M; sc: the instance's scale
  function pose(e, av, sc) {
    Z.set(e.ux, 0, e.uz); X.set(e.uz, 0, -e.ux);
    basis.makeBasis(X, Y, Z);
    Q.setFromRotationMatrix(basis);
    let y = e.y;
    if (av < 1 && e.rest) {
      const H = 1 - Math.pow(1 - av, 4);
      y = e.rest.y + (e.y - e.rest.y) * H;
      // edge-on in flight: turned up about its across axis, a twist about the vertical, flat again before it settles
      const edge = sstep(0, 0.08, av) * (1 - sstep(0.55, 0.93, av));
      const sgn = seed[e.i] < 0.5 ? -1 : 1;
      const lie = 1 - sstep(0, 0.08, av);
      Qt.setFromAxisAngle(AY, e.rest.yaw * lie + sgn * 0.55 * Math.sin(Math.PI * Math.min(1, av / 0.93)) * edge); Q.multiply(Qt);
      Qt.setFromAxisAngle(AX, -Math.PI / 2 * 0.94 * edge * sgn + e.rest.pitch * -lie); Q.multiply(Qt);
      Qt.setFromAxisAngle(Z.set(0, 0, 1), e.rest.roll * lie); Q.multiply(Qt);
      // edge-on, the slab turns about its middle: lift it by half its depth so it never dips through its bed
      y += edge * e.hd * 0.9;
      if (av > 0.93) y -= 0.035 * Math.sin(Math.PI * (av - 0.93) / 0.07);
    }
    V.set(e.cx, y, e.cz);
    M.compose(V, Q, sc || S);
  }
  const SL = new THREE.Vector3();
  // where each element is drawn: its mesh's record and its slot there; the kerbs of each landing
  const slotOf = new Array(N).fill(null), kerbsOf = new Array(N).fill(null);
  TR.list.forEach((e, j) => { slotOf[e.i] = { R: TR, j }; });
  for (const LA of LAS) LA.list.forEach((e, j) => { slotOf[e.i] = { R: LA, j }; });
  function writeAll() {
    for (let j = 0; j < TR.list.length; j++) { const e = TR.list[j]; pose(e, a[e.i]); TR.m.setMatrixAt(j, M); }
    for (const LA of LAS) { for (let j = 0; j < LA.list.length; j++) { const e = LA.list[j]; pose(e, a[e.i]); LA.m.setMatrixAt(j, M); } LA.m.instanceMatrix.clearUpdateRanges(); LA.m.instanceMatrix.needsUpdate = true; }
    for (let j = 0; j < kerbs.length; j++) writeKerb(j);
    TR.m.instanceMatrix.clearUpdateRanges(); TR.m.instanceMatrix.needsUpdate = true;
    KM.instanceMatrix.clearUpdateRanges(); KM.instanceMatrix.needsUpdate = true;
  }
  // only the elements that moved this frame: their matrices and glow, and an update range over their slots per mesh
  const recs = [TR, ...LAS];
  for (const R of recs) { R.lo = Infinity; R.hi = -1; }
  let kLo = Infinity, kHi = -1;
  function writeOne(i) {
    const sl = slotOf[i]; if (!sl) return;
    pose(E[i], a[i]); sl.R.m.setMatrixAt(sl.j, M); sl.R.glow.array[sl.j] = GL[i];
    if (sl.j < sl.R.lo) sl.R.lo = sl.j; if (sl.j > sl.R.hi) sl.R.hi = sl.j;
    const ks = kerbsOf[i]; if (ks) for (const j of ks) { writeKerb(j); if (j < kLo) kLo = j; if (j > kHi) kHi = j; }
  }
  function flush() {
    for (const R of recs) {
      if (R.hi < 0) continue;
      const im = R.m.instanceMatrix; im.clearUpdateRanges(); im.addUpdateRange(R.lo * 16, (R.hi - R.lo + 1) * 16); im.needsUpdate = true;
      R.glow.clearUpdateRanges(); R.glow.addUpdateRange(R.lo, R.hi - R.lo + 1); R.glow.needsUpdate = true;
      R.lo = Infinity; R.hi = -1;
    }
    if (kHi >= 0) { const im = KM.instanceMatrix; im.clearUpdateRanges(); im.addUpdateRange(kLo * 16, (kHi - kLo + 1) * 16); im.needsUpdate = true; kLo = Infinity; kHi = -1; }
  }
  const KL = new THREE.Matrix4(), KS = new THREE.Vector3(), KQ = new THREE.Quaternion(), KV = new THREE.Vector3();
  kerbs.forEach((k, j) => { (kerbsOf[k.e.i] ||= []).push(j); });
  function writeKerb(j) {
    const k = kerbs[j];
    pose(k.e, a[k.e.i]);
    // the kerb in the landing's frame: x is the walker's left (-r), z forward (f)
    KQ.identity(); if (!k.across) KQ.setFromAxisAngle(AY, Math.PI / 2);
    KL.compose(KV.set(-k.r, 0, k.f), KQ, KS.set(k.len, 1, 1));
    M.multiply(KL);
    KM.setMatrixAt(j, M);
  }
  for (let j = 0; j < bedEls.length; j++) {
    const e = bedEls[j];
    pose(e, 0);
    const sc = e.kind === KIND.LANDING ? SL.set((e.hw * 2) / WIDTH, 1, (e.hd * 2) / GOING) : null;
    // the bed sits a little under the slab's top as it lies (the slab hides it until it goes)
    M.compose(V.set(e.cx, e.ground + 0.03, e.cz), Q, sc || S);
    BM.setMatrixAt(j, M);
  }
  scene.add(BM);
  writeAll();

  const GL = new Float32Array(N); // the ember's glow per element
  // ------------------------------------------------------------------ the stub, the dust, the top
  const stub = buildStub(ctx, P, E.slice(0, STUB));
  const dust = buildDust(ctx, low);
  top = buildTop(ctx, P, { low });

  // ------------------------------------------------------------------ the walker and the window
  const player = ctx.player;
  let s0 = null, lost = 0, lastEl = -1, vUp = 0;
  // the element the walker stands on (or is just over, in a hop): its index, or -1
  function underfoot() {
    const fx = player.pos.x, fz = player.pos.z, feet = player.pos.y - player.eye;
    const L = find(fx, fz);
    let best = -1;
    for (let k = 0; k < L.length; k++) { const e = E[L[k]]; if (inside(e, fx, fz, 0.05) && feet > e.y - 0.4 && feet < e.y + 1.4 && (best < 0 || e.y > E[best].y)) best = e.i; }
    return best;
  }
  let moving = 0, rippleT = 0, tockT = 0, simTicked = false;
  function tick(dt) {
    dt = Math.min(dt, 0.1);
    const u = underfoot();
    if (u >= 0) {
      // the way they are going along the path, and how fast (smoothed), from their velocity and the element's forward
      const e = E[u], vf = player.vel.x * e.ux + player.vel.z * e.uz;
      const turnLanding = e.kind !== KIND.TREAD && e.kind !== KIND.STUB;
      const sp = turnLanding ? hyp(player.vel.x, player.vel.z) : Math.abs(vf);
      const dir = turnLanding ? (vUp >= 0 ? 1 : -1) : Math.sign(vf);
      vUp += ((sp > 0.3 ? dir * sp : vUp * 0.98) - vUp) * Math.min(1, dt * 3);
      s0 = e.s; lost = 0; lastEl = u;
    }
    else if (s0 !== null && (lost += dt) > 0.8) s0 = null;
    // who is called: the window about s0, longer the way they are going, and the fixed ones always
    const up = Math.max(0, vUp) * LEAD * T_ARRIVE, down = Math.max(0, -vUp) * LEAD * T_ARRIVE;
    for (let i = 0; i < N; i++) {
      if (fixed(E[i])) continue;
      const w = s0 !== null && E[i].s >= s0 - (vUp >= 0 ? TAIL : NEAR) - down - E[i].hd && E[i].s <= s0 + (vUp < 0 ? TAIL : NEAR) + up + E[i].hd ? 1 : 0;
      if (w !== want[i]) { want[i] = w; wait[i] = w ? 0 : LINGER + Math.abs(E[i].s - (s0 ?? E[i].s)) * 0.08; }
    }
    // move them: arrivals one at a time on the ripple (nearest first; as many in a frame as the ripple allows, so the
    // stair grows as fast at 20 fps as at 60), leavings after their linger
    rippleT = Math.max(rippleT - dt, -RIPPLE * 4);
    tockT -= dt;
    moving = 0;
    for (let i = 0; i < N; i++) {
      if (fixed(E[i])) continue;
      const g0 = GL[i], a0 = a[i];
      if (want[i] && a[i] < 1) {
        if (a[i] === 0) {
          if (rippleT > 0 || !nextUp(i)) continue;
          rippleT += RIPPLE;
          dust.puff(E[i].cx, E[i].rest.y + 0.1, E[i].cz, 10, 0); // torn out of the turf
        }
        a[i] = Math.min(1, a[i] + dt / (T_ARRIVE * (0.9 + seed[i] * 0.25)));
        GL[i] = 1;
        if (a[i] >= 1) {
          dust.shake(E[i], 8);
          // a stone tock as a slab settles ahead of the walker: one now and then, not one a slab
          if (tockT <= 0 && s0 !== null && E[i].s > s0) { tockT = 0.55 + seed[i] * 0.5; TP.set(E[i].cx, E[i].y, E[i].cz); ctx.audio?.cue?.('lamp-tick', TP); }
        }
        moving++;
      } else if (!want[i] && a[i] > 0) {
        if ((wait[i] -= dt) > 0) { GL[i] = Math.max(0, GL[i] - dt * 0.8); if (GL[i] !== g0) writeOne(i); continue; }
        a[i] = Math.max(0, a[i] - dt / T_LEAVE);
        GL[i] = Math.min(1, 0.25 + (1 - a[i]) * 0.9);
        if (a[i] === 0) { GL[i] = 0; dust.puff(E[i].cx, E[i].rest.y + 0.1, E[i].cz, 6, 1); }
        moving++;
      } else if (GL[i] > 0) { GL[i] = Math.max(0, GL[i] - dt * 0.6); }
      if (GL[i] !== g0 || a[i] !== a0) writeOne(i);
    }
    flush();
  }
  // the next to come is the lowest-numbered called slab nearer the walker than this one that has not started: arrivals
  // go outward from the feet in order, so the stair is always whole from the walker to its end
  function nextUp(i) {
    if (s0 === null) return true;
    const dir = E[i].s >= s0 ? 1 : -1;
    for (let j = i - dir; j >= 0 && j < N && (dir > 0 ? E[j].s >= s0 : E[j].s <= s0); j -= dir) if (want[j] && a[j] === 0 && !fixed(E[j])) return false;
    return true;
  }
  // A column to the sky (an uncapped collider: a post, a rock) under the stair would stop a walker high over it. So
  // uncapped colliders under the footprint get a top just under the lowest tread over them, where that tread is more
  // than 3 m over the ground (lower, the column stays a column: a walker on the turf beside the stub is still stopped).
  // Moving ones (the figures who walk: their x, z change) are left alone: their place is noted on the first frame and
  // a collider that has moved by the second look is skipped. Colliders registered later are looked at every 5 s.
  let capped = 0, looks = 0, lookT = 0;
  const seenAt = new WeakMap(), done = new WeakSet(), cappedList = [];
  function capColumns() {
    let n = 0;
    for (const c of ctx.controls.state.colliders) {
      if (done.has(c)) continue;
      if (c.h !== undefined || c.x2 !== undefined || c.stair) { done.add(c); continue; }
      const was = seenAt.get(c);
      if (!was) { seenAt.set(c, [c.x, c.z]); continue; } // first seen: decided at the next look
      done.add(c);
      if (was[0] !== c.x || was[1] !== c.z) continue; // it walks
      let lo = Infinity;
      for (const [ox, oz] of [[0, 0], [c.r + 0.5, 0], [-c.r - 0.5, 0], [0, c.r + 0.5], [0, -c.r - 0.5]]) {
        const L = find(c.x + ox, c.z + oz);
        for (let k = 0; k < L.length; k++) if (inside(E[L[k]], c.x, c.z, c.r + 0.5)) lo = Math.min(lo, E[L[k]].y);
      }
      const g = T.heightAt(c.x, c.z);
      if (lo === Infinity || lo - g < 3) continue;
      c.y = g - 2; c.h = lo - 0.6 - c.y; c.stand = false; n++; cappedList.push({ c, lo, g });
    }
    capped += n;
    if (n) ctx.log(`stair: capped ${n} column${n > 1 ? 's' : ''} under the stair (${capped} in all)`);
  }
  function columns(dt) {
    looks++;
    if (looks === 1 || looks === 30) capColumns(); // note where each is; then cap the ones that have not moved
    else if (looks > 30 && (lookT += dt) > 5) { lookT = 0; capColumns(); } // and those registered later, the same way
  }
  ctx.registerUpdate((dt, t) => { columns(dt); if (!simTicked) tick(dt); simTicked = false; dust.update(dt, t); top.update(dt, t); });

  // ------------------------------------------------------------------ the ascent, and the API
  // the path heights-test walks: the turf east of the stub, each flight's first and last tread (steering only), each
  // landing's centre (the feet there), the top
  const pts = [[FOOTX(E), E[0].cz, undefined]];
  for (const e of E) {
    const pv = E[e.i - 1], nx = E[e.i + 1];
    if (e.kind === KIND.LANDING || e.kind === KIND.TOP) pts.push([e.cx, e.cz, e.y]);
    else if (!pv || pv.kind === KIND.LANDING || !nx || nx.kind === KIND.LANDING || nx.kind === KIND.TOP) pts.push([e.cx, e.cz, undefined]);
  }
  if (top.path) for (const q of top.path) pts.push(q);
  ctx.ascents?.add({
    id: 'stair', path: pts.map(([x, z, y]) => (y === undefined ? [x, z] : [x, z, y])),
    offs: [0.1, 0.55, 0.86], tick: (dt) => ctx.stair.tick(dt),
  });

  const tris = (g, n) => (g.attributes.position.count / 3) * n;
  ctx.stair = {
    plan: P, a, want, find, floor, keep, top, stub, dust, removeFloor, capped: () => capped, cappedList: () => cappedList,
    // a test's own simulated frame (heights-test): the stair moves on with it, and the next real frame does not move it again
    tick(dt) { columns(dt); tick(dt); simTicked = true; },
    at: () => s0, el: () => lastEl,
    // call every slab (true) or none (false) at once, for renders of the whole stair; null gives them back to the walker
    all(v) { for (let i = 0; i < N; i++) if (!fixed(E[i])) a[i] = v ? 1 : 0; writeAll(); },
    stats: () => ({
      calls: 3 + LAS.length + stub.calls + dust.calls + top.calls,
      tris: Math.round(tris(tGeo, treads.length) + LAS.reduce((n, L) => n + tris(L.m.geometry, L.list.length), 0) + tris(KM.geometry, kerbs.length) + tris(BM.geometry, bedEls.length) + stub.tris + top.tris),
      treads: treads.length, landings: lands.length, kerbs: kerbs.length, beds: bedEls.length, height: +(P.top.y - P.y0).toFixed(1),
      top: { x: +P.top.cx.toFixed(1), z: +P.top.cz.toFixed(1), y: +P.top.y.toFixed(1) },
      moving,
    }),
  };
  ctx.log(`stair: ${treads.length} treads, ${lands.length} landings, ${kerbs.length} kerbs, ${P.top.y - P.y0 | 0} m from the stub to the top at (${P.top.cx.toFixed(0)}, ${P.top.cz.toFixed(0)}), ${(performance.now() - t0).toFixed(0)} ms`);
}

// a step east of the stub's first tread, on the turf
function FOOTX(E) { return E[0].cx - E[0].ux * 1.6; }
