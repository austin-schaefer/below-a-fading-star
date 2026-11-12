// v8-07 the Twk-men (briefs/v8/brief-v8-07-twk.md): Vance's thumb-high green men on dragonflies, who trade news for
// salt, are vain and easily insulted, and are nobody's. Ten to fourteen of them on the map, at stations: on the
// gnomons (the one nearest the spawn, the one on the Thurifer's lead P3, the one by the Kept Fire, and at high two more
// far apart), over the river by the Salt-Pedlars' old beat, on guard over a neat pile of salt outside the Pomegranate
// House's gate, and at a split sack on the Salt-Pedlars' road (P42), ferrying the spill away. Their manners:
//   the inspection  come within 12 m of a station and a rider flies out, stops dead a metre from your face at eye
//                   height, looks you up and down (the insect tilts), sniffs and leaves. Once per station per visit
//   the escort      from a gnomon on a track, after the inspection, one flies ahead of you along the way for 30-40 m,
//                   looking back, then tires of you and goes home
//   the quarrel     the pair at the spawn's gnomon meet over its head and circle each other tightly, two thin angry
//                   voices, then split
//   the salute      the riders on P3's gnomon rise and hover in a rank as the Thurifer comes up the lead, and drop
//                   back the moment his back is turned
//   salt            the ferrying line at the spill stops dead and watches you until you pass; the guard at the house
//                   rises between you and his pile and will not be moved
//   the gutter      when the sun gutters every rider lands and holds on, and takes off again a beat late
// Three instanced meshes (insects, wings, riders) sharing one instance matrix, and one merged mesh of salt: four draws.
// Flight on the CPU, every frame within 70 m of a station, 4 Hz beyond. ctx.twk: { stations, riders, stats(), hold }.
// ?twk=0 leaves them out. The Salt-Pedlars at the river (v2/riverlife.js) stay as they are: the small fry of the same
// people, finger-high on their 30 cm insects; these are the ones who come to look at you.
import * as THREE from 'three';
import { tracks, nearestOn } from './roads/place.js';
import { hyp } from '../noise.js';
import { LANDMARKS, SPAWN } from '../world.js';
import { bodyGeometry, wingGeometry, riderGeometry, bodyMaterial, wingMaterial, riderMaterial } from './twk/model.js';
import { buildSalt } from './twk/salt.js';
import { saltPlan, pointOn } from './twk/plan.js';
import { waitFor, loaded } from '../v7/workers/rig.js';
import { buildSaltActs } from '../v10/salt.js'; // v10-A2: the pinch, and the news (shelved: ?salt=1)

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const LEGS = 0.03;       // thorax centre above whatever it stands on
const INSPECT_AT = 12;    // m: a station's rider comes out to you
const REARM_AT = 25;      // m: a visit ends when you go this far off
const FACE = 1.0;         // m: the inspection's hold in front of the eye
const MIN_CAM = 0.85;     // m: never nearer the eye than this, whatever it is doing
const GUT_DOWN = 0.55, GUT_UP = 0.85;

export async function build(ctx) {
  const t0 = performance.now();
  if (new URL(location.href).searchParams.get('twk') === '0') { ctx.log('twk: off (?twk=0)'); return; }
  const { scene, terrain, camera } = ctx;
  const low = ctx.quality === 'low';
  const cam = camera.position;
  const rng = ctx.makeRng(80701);
  const flick = ctx.sky?.flicker || { value: 1 };
  const cue = (name, pos, opts) => ctx.audio?.cue?.(name, pos, opts);
  const gy = (x, z) => terrain.heightAt(x, z);
  const dry = (x, z) => { const w = terrain.waterLevelAt(x, z); return w === null || gy(x, z) > w + 0.1; };

  // ================================================================ where: the stations
  // the gnomons are another module's, built in parallel: wait for them unless they are left out
  const roadsOn = loaded('roads') && new URL(location.href).searchParams.get('roads') !== '0';
  if (roadsOn) await waitFor(() => ctx.roads?.heads); // v8-09: the heads are in the roads' merged stone; ctx.roads.heads gives their matrices
  const T = tracks();
  const nearestTrack = (x, z) => { let best = null, bd = Infinity, bs = 0; for (const t of T) { const r = nearestOn(t, x, z); if (r.d < bd) { bd = r.d; best = t; bs = r.s; } } return { T: best, d: bd, s: bs }; };
  const stations = [];
  const heads = ctx.roads?.heads;
  const G = (ctx.roads?.gnomons || []).filter((g) => g.state === 'stand');
  const _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
  const HEAD = ctx.roads?.head;
  // a gnomon's perches from its head's own instance matrix: the two shoulders of the notch, and the bead's top
  function gnomonPerches(g) {
    if (!heads || !HEAD) return null;
    let bi = -1, bd = 1.2;
    for (let i = 0; i < heads.count; i++) {
      heads.getMatrixAt(i, _m); _p.setFromMatrixPosition(_m);
      const d = Math.hypot(_p.x - g.x, _p.z - g.z, (_p.y - g.top) * 0.5);
      if (d < bd) { bd = d; bi = i; }
    }
    if (bi < 0) return null;
    heads.getMatrixAt(bi, _m); _m.decompose(_p, _q, _s);
    const zAx = _v.set(0, 0, 1).applyQuaternion(_q), yaw = Math.atan2(zAx.x, zAx.z);
    const at = (x, y, z, ya) => { const w = new THREE.Vector3(x, y, z).applyMatrix4(_m); return { x: w.x, y: w.y + LEGS, z: w.z, yaw: ya }; };
    const sh = (HEAD.half + HEAD.W - 0.04) / 2;
    return [at(sh, HEAD.Hh, 0, yaw), at(-sh, HEAD.Hh, 0, yaw + Math.PI), at(0, HEAD.beadY + HEAD.beadR, 0, yaw + Math.PI / 2)];
  }
  function groundPerches(x, z, n) { // where there is no gnomon: on the turf beside the way
    const out = [];
    for (let k = 0; k < n; k++) { const a = k * 2.1, px = x + Math.cos(a) * 0.4 * k, pz = z + Math.sin(a) * 0.4 * k; out.push({ x: px, y: gy(px, pz) + LEGS + 0.02, z: pz, yaw: a }); }
    return out;
  }
  function addStation(kind, x, z, n, o = {}) {
    const near = nearestTrack(x, z);
    const st = { id: o.id || `${kind}-${stations.length}`, kind, x, z, n, perches: o.perches || groundPerches(x, z, n), riders: [], armed: true,
      track: near.d < 8 ? near.T : null, trackD: near.d, trackId: near.T?.id || null, escort: !!o.escort, quarrel: !!o.quarrel, salute: !!o.salute,
      loiter: !!o.loiter, gnomon: o.gnomon || null, gate: o.gate || null };
    stations.push(st);
    return st;
  }
  const dist2 = (a, x, z) => (a.x - x) * (a.x - x) + (a.z - z) * (a.z - z);
  const nearestGnomon = (x, z, ok = () => true) => { let b = null, bd = Infinity; for (const g of G) { if (!ok(g)) continue; const d = dist2(g, x, z); if (d < bd) { bd = d; b = g; } } return b; };
  const onGnomon = (id, g, n, o) => {
    const P = gnomonPerches(g);
    return addStation('gnomon', g.x, g.z, n, { ...o, id, gnomon: { x: g.x, z: g.z, top: g.top }, perches: P || groundPerches(g.x, g.z, n) });
  };
  // fall back to points on the leads when no gnomons are registered (?roads=0)
  const leadPoint = (x, z) => { const r = nearestTrack(x, z), o = {}; pointOn(r.T, r.s, o); return { x: o.x - o.dz * 1.2, z: o.z + o.dx * 1.2 }; };
  const station = (id, x, z, n, o) => {
    const g = G.length ? nearestGnomon(x, z, o.ok) : null;
    if (g && Math.hypot(g.x - x, g.z - z) < (o.within || 40)) return onGnomon(id, g, n, o);
    const p = leadPoint(x, z);
    return addStation('lead', p.x, p.z, n, { ...o, id });
  };
  // 1 the spawn's gnomon: a pair, who quarrel; the first a visitor meets
  station('spawn', SPAWN.x, SPAWN.z, 2, { escort: true, quarrel: true, within: 30 });
  // 2 the Thurifer's lead: the gnomon on P3 nearest its middle, a rank who salute him
  const p3 = T.find((t) => t.id === 'P3');
  if (p3) {
    const mid = {}; pointOn(p3, p3.pts[p3.pts.length - 1].s * 0.5, mid);
    station('p3', mid.x, mid.z, low ? 2 : 3, { salute: true, within: 60, ok: (g) => nearestTrack(g.x, g.z).T?.id === 'P3' });
  }
  // 3 the Kept Fire: the gnomon at the hearth, one warming himself
  const KF = LANDMARKS.keptfire;
  station('keptfire', KF.x, KF.z, 1, { within: 8 });
  // 4 the river by the old pedlars' beat (s 33-124 below the Cutting): over the water near the track nearest it
  {
    const RV = terrain.river, LN = RV?.line;
    let best = null;
    if (LN) for (let s = 40; s <= 120; s += 4) {
      let lo = 0, hi = LN.n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (LN.S[m] <= s) lo = m; else hi = m; }
      const x = LN.X[lo], z = LN.Z[lo], d = nearestTrack(x, z).d;
      if (!best || d < best.d) best = { x, z, d };
    }
    const E = best || LANDMARKS.eddy;
    const wl = terrain.waterLevelAt(E.x, E.z), y = Math.max(wl ?? -1e9, gy(E.x, E.z));
    addStation('river', E.x, E.z, 1, { id: 'river', loiter: true, perches: [{ x: E.x, y: y + 0.7, z: E.z, yaw: 0 }] });
  }
  // 5 the house: a neat pile of salt outside the gate, east of the spur and clear of the frontage, and its guard
  const SP = saltPlan(), gate = SP.gate, pile = { ...SP.pile };
  const salt = { pile, spill: SP.spill, cache: SP.cache };
  if (!salt.spill) { const p = leadPoint(70, 160); salt.spill = { x: p.x, z: p.z, yaw: 0 }; salt.cache = { x: p.x + 5, z: p.z + 3 }; }
  const S = buildSalt(ctx, salt);
  scene.add(S.mesh);
  ctx.addCollider?.({ x: pile.x, z: pile.z, r: 0.5, y: gy(pile.x, pile.z) - 0.2, h: 0.8 });
  // v10-A2: two more riders of the guard's, perched on the turf 18 m out toward the road, who come for a pinch of salt (src/v10/salt.js)
  const SALT_ON = new URL(location.href).searchParams.get('salt') === '1'; // v10-A2: the salt act is written, not built: off unless asked for
  const houseFar = [], road = Math.atan2((salt.spill?.x ?? pile.x + 1) - pile.x, (salt.spill?.z ?? pile.z) - pile.z);
  for (const da of SALT_ON ? [-0.5, 0.5, -1, 1, -1.5, 1.5, -2, 2] : []) {
    const ang = road + da, x = pile.x + Math.sin(ang) * 18, z = pile.z + Math.cos(ang) * 18;
    if (houseFar.length < 2 && dry(x, z)) houseFar.push({ x, y: gy(x, z) + LEGS + 0.02, z, yaw: ang });
  }
  addStation('house', pile.x, pile.z, 1 + houseFar.length, { id: 'house', gate, perches: [{ x: pile.x, y: pile.top + LEGS - 0.01, z: pile.z, yaw: Math.atan2(gate.x - pile.x, gate.z - pile.z) + Math.PI }, ...houseFar] });
  {
    const sp = salt.spill, fx = SP.fan ? SP.fan.x : sp.x, fz = SP.fan ? SP.fan.z : sp.z;
    const st = addStation('spill', fx, fz, low ? 3 : 4, { id: 'spill', perches: [] });
    st.A = { x: fx, y: gy(fx, fz) + 0.12, z: fz }; st.B = { x: salt.cache.x, y: gy(salt.cache.x, salt.cache.z) + 0.16, z: salt.cache.z };
  }
  // 7 at high, two more gnomons, as far from every other station as can be within 230 m of the keep
  if (!low && G.length) {
    const K = LANDMARKS.castle;
    for (let k = 0; k < 2; k++) {
      let best = null, bd = 0;
      for (const g of G) {
        if (Math.hypot(g.x - K.x, g.z - K.z) > 230 || !dry(g.x, g.z)) continue;
        let m = Infinity; for (const s of stations) m = Math.min(m, Math.hypot(s.x - g.x, s.z - g.z));
        if (m > bd) { bd = m; best = g; }
      }
      if (best && bd > 70) onGnomon(`far-${k}`, best, 1, { escort: true });
    }
  }

  // ================================================================ who: the riders
  const riders = [];
  for (const st of stations) {
    for (let k = 0; k < st.n; k++) {
      const P = st.perches[k % Math.max(1, st.perches.length)] || { x: st.x, y: gy(st.x, st.z) + LEGS, z: st.z, yaw: 0 };
      const r = {
        i: riders.length, st, k, mode: 'perch', t: 0, home: new THREE.Vector3(P.x, P.y, P.z), homeYaw: P.yaw,
        pos: new THREE.Vector3(P.x, P.y, P.z), vel: new THREE.Vector3(), goal: new THREE.Vector3(P.x, P.y, P.z), look: new THREE.Vector3(), looking: false,
        yaw: P.yaw, pitch: 0, roll: 0, tilt: 0, flap: 0, wantFlap: 0, carry: 0, vmax: 4.5, ph: rng() * 6.28, w1: rng() * 6.28, w2: rng() * 6.28,
        next: 4 + rng() * 10, darts: 0, cd: 0, landed: false, wake: 0, resume: null, e: null, minCam: Infinity,
      };
      if (st.loiter) { r.mode = 'loiter'; r.wantFlap = 1; r.flap = 1; }
      if (st.kind === 'spill') {
        // spaced round the loop: out with a grain, a pause to drop it, back, a pause to pick one up
        const f = k / st.n; r.mode = f < 0.5 ? 'ferry-out' : 'ferry-back'; const u = (f % 0.5) * 2;
        const A = st.A, B = st.B, a = r.mode === 'ferry-out' ? A : B, b = r.mode === 'ferry-out' ? B : A;
        r.pos.set(a.x + (b.x - a.x) * u, Math.max(a.y, b.y) + 0.35, a.z + (b.z - a.z) * u); r.carry = r.mode === 'ferry-out' ? 1 : 0; r.wantFlap = 1; r.flap = 1;
      }
      st.riders.push(r); riders.push(r);
    }
  }
  const N = riders.length;

  // ================================================================ the meshes
  const uTime = { value: 0 };
  const bodyG = bodyGeometry(low), wingG = wingGeometry(), riderG = riderGeometry(low);
  const aFly = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4); aFly.setUsage(THREE.DynamicDrawUsage);
  for (const g of [bodyG, wingG, riderG]) g.setAttribute('aFly', aFly);
  const wingM = wingMaterial(uTime);
  const body = new THREE.InstancedMesh(bodyG, bodyMaterial(uTime), N), wings = new THREE.InstancedMesh(wingG, wingM, N), men = new THREE.InstancedMesh(riderG, riderMaterial(uTime), N);
  body.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  wings.instanceMatrix = body.instanceMatrix; men.instanceMatrix = body.instanceMatrix;
  body.name = 'twk-insects'; wings.name = 'twk-wings'; men.name = 'twk-riders';
  for (const m of [body, wings, men]) { m.frustumCulled = false; m.castShadow = false; m.receiveShadow = true; scene.add(m); }
  wings.renderOrder = 14;

  // ================================================================ flight
  const _o = { x: 0, z: 0, dx: 0, dz: 0 }, _d = new THREE.Vector3();
  const plv = new THREE.Vector3(), plLast = new THREE.Vector3().copy(cam); let plSpeed = 0;
  const thur = { pos: new THREE.Vector3(), last: new THREE.Vector3(), v: new THREE.Vector3(), has: false };
  let gut = false, gutEnd = -1;
  // nobody is inspected, escorted or quarrelled at while the title card is up: their manners start with the walk
  let begun = false; ctx.events?.addEventListener('begin', () => { begun = true; });
  const api = { hold: false };
  if (new URL(location.href).searchParams.get('salt') === '1') api.runScript = (r, wps) => { r.script = wps; r.mode = 'script'; r.t = 0; r.hold = 0; r.looking = false; r.wantFlap = 1; r.landed = false; buzz(r); };
  const face = (r) => {
    // a metre in front of the eye, at eye height, a little to the side the rider came from
    const fy = ctx.player?.yaw ?? 0, fx = -Math.sin(fy), fz = -Math.cos(fy);
    r.goal.set(cam.x + fx * FACE, cam.y - 0.04, cam.z + fz * FACE);
  };
  const lookAt = (r, x, y, z) => { r.look.set(x, y, z); r.looking = true; };
  const buzz = (r) => { if (r.cd <= 0 && hyp(r.pos.x - cam.x, r.pos.z - cam.z) < 22) { cue('twk-buzz', r.pos, { voice: r.i }); r.cd = 2.2; } };
  const go = (r, mode, vmax = 4.5) => { r.mode = mode; r.t = 0; r.vmax = vmax; r.wantFlap = 1; r.looking = false; if (r.flap < 0.5 || mode === 'inspect-go') buzz(r); };
  const goHome = (r, vmax = 5) => { go(r, 'return', vmax); r.goal.copy(r.home); };
  const hopFrom = (r, n) => { go(r, 'hop', 3.5); r.darts = n; r.goal.set(r.home.x + (rng() - 0.5) * 2.2, r.home.y + 0.3 + rng() * 0.8, r.home.z + (rng() - 0.5) * 2.2); r.hold = 0; };
  const stDist = (st) => hyp(st.x - cam.x, st.z - cam.z);

  function stationTick(st, t, dt) {
    const d = stDist(st);
    if (d > REARM_AT) st.armed = true;
    if (gut || api.hold) return;
    // salute: the Thurifer coming up the lead toward this gnomon, still ahead of him
    if (st.salute && thur.has) {
      const ex = st.x - thur.pos.x, ez = st.z - thur.pos.z, ahead = ex * thur.v.x + ez * thur.v.z, td = hyp(ex, ez);
      const sp = hyp(thur.v.x, thur.v.z);
      const on = td < 24 && (sp < 0.05 ? st.saluting : ahead > 0.6 * sp);
      if (on && !st.saluting) {
        st.saluting = true;
        const nx = sp > 0.05 ? -thur.v.z / sp : 1, nz = sp > 0.05 ? thur.v.x / sp : 0;
        st.riders.forEach((r, k) => { go(r, 'salute', 3.2); const o = (k - (st.n - 1) / 2) * 0.42; r.goal.set(st.x + nx * o, r.home.y + 0.75, st.z + nz * o); });
      } else if (!on && st.saluting) {
        st.saluting = false;
        st.riders.forEach((r, k) => { if (r.mode === 'salute') { goHome(r, 7); if (k === 0) cue('twk-chirrup', r.pos, { mood: 'sniff', voice: r.i }); } });
      }
      if (st.saluting) { for (const r of st.riders) lookAt(r, thur.pos.x, thur.pos.y + 1.4, thur.pos.z); return; }
    }
    // the inspection
    if (begun && st.armed && d < INSPECT_AT && st.kind !== 'house' && st.kind !== 'spill') {
      const r = st.riders.find((x) => x.mode === 'eye' || x.mode === 'perch' || x.mode === 'hop' || x.mode === 'loiter' || x.mode === 'return');
      if (r) { st.armed = false; go(r, 'inspect-go', 4.2); face(r); r.e = null; }
    }
    // the quarrel: a pair, both at home, the walker about
    if (st.quarrel && d < 40 && begun) {
      if (st.qNext == null) st.qNext = t + 7 + rng() * 4;
      const [a, b] = st.riders;
      const idle = (x) => x.mode === 'perch' || x.mode === 'eye';
      if (t > st.qNext && a && b && idle(a) && idle(b)) {
        st.qNext = t + 26 + rng() * 30;
        const g = st.gnomon || st, top = Math.max(a.home.y, b.home.y);
        st.M = st.M || new THREE.Vector3();
        st.M.set(g.x + (cam.x - g.x) * 0.08, top + 0.8, g.z + (cam.z - g.z) * 0.08);
        go(a, 'q-go', 4); go(b, 'q-go', 4);
        a.goal.set(st.M.x + 0.3, st.M.y, st.M.z); b.goal.set(st.M.x - 0.3, st.M.y, st.M.z);
        a.mate = b; b.mate = a; a.th = 0; b.th = Math.PI; st.qT = -1;
      }
      if (a?.mode === 'q-go' && b?.mode === 'q-go' && a.pos.distanceTo(a.goal) < 0.12 && b.pos.distanceTo(b.goal) < 0.12) {
        a.mode = b.mode = 'q-circle'; a.t = b.t = 0; st.qT = t;
        cue('twk-quarrel', st.M, { voice: a.i });
      }
    } else if (st.quarrel && d > 60) st.qNext = null;
    // they have seen you coming: within 32 m the gnomons' riders rise off their perches and hang over them, dead
    // still, watching you, until you are past or gone
    if (st.kind === 'gnomon' && !st.salute || st.id === 'keptfire') {
      for (const r of st.riders) {
        if (r.mode === 'perch' && d < 32 && d > 2) { go(r, 'eye', 2.5); r.goal.set(r.home.x, r.home.y + 0.45 + r.k * 0.25, r.home.z); }
        else if (r.mode === 'eye') { lookAt(r, cam.x, cam.y, cam.z); if (d > 36) goHome(r, 2.5); }
      }
    }
    // idle life: now and then one hops off his perch and darts about, when anyone is near enough to see it
    if (d < 45 && !st.salute) for (const r of st.riders) {
      if (r.mode !== 'perch') continue;
      r.next -= dt;
      if (r.next <= 0) { r.next = 7 + rng() * 11; if (st.kind !== 'house') hopFrom(r, 1 + ((rng() * 3) | 0)); }
    }
  }

  function step(r, dt, t) {
    const st = r.st;
    r.t += dt; r.cd -= dt;
    const dc = hyp(r.pos.x - cam.x, r.pos.z - cam.z);
    switch (r.mode) {
      case 'perch':
        r.goal.copy(r.home); r.wantFlap = 0; r.looking = false;
        // a walker right against his gnomon: off he goes
        if (r.pos.distanceTo(cam) < 1.3 && !gut) hopFrom(r, 1);
        break;
      case 'loiter': // the river's: darting from one hover to the next over the water, holding dead still between
        r.wantFlap = 1;
        if (r.t > r.hold || r.hold == null) { r.t = 0; r.hold = 0.8 + rng() * 2.6; r.goal.set(r.home.x + (rng() - 0.5) * 4, r.home.y + (rng() - 0.3) * 0.6, r.home.z + (rng() - 0.5) * 4); r.vmax = 3 + rng() * 2; }
        break;
      case 'hop':
        if (r.pos.distanceTo(r.goal) < 0.05) {
          r.hold += dt;
          if (r.hold > 0.6 + (r.i % 3) * 0.5) {
            r.hold = 0;
            if (--r.darts <= 0) goHome(r, 3.5);
            else r.goal.set(r.home.x + (rng() - 0.5) * 2.4, r.home.y + 0.3 + rng() * 0.9, r.home.z + (rng() - 0.5) * 2.4);
          }
        }
        break;
      case 'return':
        r.goal.copy(r.home);
        if (r.pos.distanceTo(r.home) < 0.03) { r.mode = st.loiter ? 'loiter' : 'perch'; r.t = 0; r.hold = null; r.pos.copy(r.home); r.vel.set(0, 0, 0); if (!st.loiter) r.yaw = r.homeYaw; }
        break;
      // ---------------------------------------------------------------- the inspection
      case 'inspect-go':
        face(r);
        if (r.pos.distanceTo(r.goal) < 0.1) { r.mode = 'inspect-look'; r.t = 0; r.e = { x: cam.x, z: cam.z, moved: 0 }; }
        else if (r.t > 8) goHome(r);
        break;
      case 'inspect-look': {
        face(r); lookAt(r, cam.x, cam.y, cam.z);
        // up at the face, slowly down to the boots and up again; a moment's consideration; the sniff
        const u = r.t;
        r.tilt = u < 0.5 ? 0.25 * (u / 0.5) : u < 1.6 ? 0.25 - 0.85 * ((u - 0.5) / 1.1) : u < 2.4 ? -0.6 + 0.6 * ((u - 1.6) / 0.8) : 0;
        r.goal.y -= Math.max(0, -r.tilt) * 0.12;
        if (u > 2.45 && !r.e.sniffed) { r.e.sniffed = true; cue('twk-chirrup', r.pos, { mood: 'sniff', voice: r.i }); }
        const mv = hyp(cam.x - r.e.x, cam.z - r.e.z);
        if (plSpeed > 0.4) r.e.moved += dt; else r.e.moved = Math.max(0, r.e.moved - dt);
        if (u > 3.0 || mv > 2.5 || r.e.moved > 1.0) { r.mode = 'inspect-scorn'; r.t = 0; r.tilt = 0; }
        break;
      }
      case 'inspect-scorn': {
        // he turns his back on you, holds it a beat, and is off up and away
        const fy = ctx.player?.yaw ?? 0;
        if (r.t === dt && !r.e?.sniffed) cue('twk-chirrup', r.pos, { mood: 'sniff', voice: r.i }); // cut short: he sniffs as he turns
        r.looking = false; r.yawGoal = fy + (r.i % 2 ? 1.9 : -1.9) + Math.PI;
        r.goal.copy(r.pos);
        if (r.t > 0.55) {
          const side = r.i % 2 ? 1 : -1;
          go(r, 'leave', 6); r.goal.set(r.pos.x + Math.cos(fy) * 2.5 * side, r.pos.y + 1.4, r.pos.z - Math.sin(fy) * 2.5 * side);
        }
        break;
      }
      case 'leave':
        if (r.pos.distanceTo(r.goal) < 0.25) {
          // an escort, if he has a track and you are on it and walking
          if (st.escort && st.track && !gut) {
            const n = nearestOn(st.track, cam.x, cam.z);
            if (n.d < 8) { go(r, 'escort-wait', 4); r.e = { s0: n.s, sP: n.s, dir: 0, len: 30 + rng() * 10, tick: 0, still: 0, d: n.d }; r.goal.copy(r.pos); break; }
          }
          goHome(r);
        }
        break;
      // ---------------------------------------------------------------- the escort
      case 'escort-wait': case 'escort': {
        const e = r.e;
        e.tick -= dt;
        if (e.tick <= 0) { e.tick = 0.2; const n = nearestOn(st.track, cam.x, cam.z); e.d = n.d; const ds = n.s - e.sP; e.sP = n.s; if (Math.abs(ds) > 0.15) { e.dir = e.dir || Math.sign(ds); e.still = 0; } }
        if (plSpeed < 0.3) e.still += dt;
        if (r.mode === 'escort-wait') { if (e.dir) { r.mode = 'escort'; r.t = 0; e.s0 = e.sP; } else if (r.t > 5) goHome(r); r.goal.copy(r.pos); lookAt(r, cam.x, cam.y, cam.z); break; }
        pointOn(st.track, e.sP + e.dir * 7, _o);
        const side = r.i % 2 ? 1 : -1, gx = _o.x - _o.dz * 1.4 * side, gz = _o.z + _o.dx * 1.4 * side;
        r.goal.set(gx, gy(gx, gz) + 1.9, gz); r.vmax = 5.5;
        lookAt(r, cam.x, cam.y, cam.z);
        if (Math.abs(e.sP - e.s0) > e.len || e.d > 12 || e.still > 6 || r.t > 50) { r.mode = 'escort-tire'; r.t = 0; r.goal.copy(r.pos); }
        break;
      }
      case 'escort-tire':
        // enough of you: a stop, a long look, a turn toward home, and he goes
        r.goal.copy(r.pos);
        if (r.t < 1.0) lookAt(r, cam.x, cam.y, cam.z); else { r.looking = false; r.yawGoal = Math.atan2(r.home.x - r.pos.x, r.home.z - r.pos.z); }
        if (r.t > 0.9 && !r.sniffT) { r.sniffT = 1; cue('twk-chirrup', r.pos, { mood: 'sniff', voice: r.i }); }
        if (r.t > 1.6) { r.sniffT = 0; goHome(r, 6); }
        break;
      // ---------------------------------------------------------------- the quarrel
      case 'q-go': lookAt(r, r.mate.pos.x, r.mate.pos.y, r.mate.pos.z); break;
      case 'q-circle': {
        const M = st.M; r.th += dt * 13;
        r.goal.set(M.x + Math.cos(r.th) * 0.24, M.y + Math.sin(r.th * 2 + r.k) * 0.08, M.z + Math.sin(r.th) * 0.24);
        r.vmax = 6; lookAt(r, r.mate.pos.x, r.mate.pos.y, r.mate.pos.z);
        if (r.t > 3.4) {
          const a = Math.atan2(r.pos.z - M.z, r.pos.x - M.x);
          go(r, 'q-split', 5); r.goal.set(M.x + Math.cos(a) * 3.5, M.y + 0.5, M.z + Math.sin(a) * 3.5); r.hold = 0;
        }
        break;
      }
      case 'q-split':
        if (r.pos.distanceTo(r.goal) < 0.1) { r.hold += dt; lookAt(r, r.mate.pos.x, r.mate.pos.y, r.mate.pos.z); if (r.hold > 1.2 + r.k * 0.5) goHome(r, 3.5); }
        break;
      case 'salute': r.vmax = 3.2; break;
      // v10-A2 salt for news: a rider on an errand, a list of waypoints { x, y, z, v, hold, look, carry, fn } (src/v10/salt.js)
      case 'script': {
        const w = r.script[0];
        if (!w) { goHome(r, 5); break; }
        r.goal.set(w.x, w.y, w.z); r.vmax = w.v || 5; r.wantFlap = 1;
        if (w.look) lookAt(r, w.look.x, w.look.y, w.look.z); else r.looking = false;
        if (w.carry != null) r.carry = w.carry;
        if (r.pos.distanceTo(r.goal) < (w.r || 0.12) && (r.hold += dt) >= (w.hold || 0)) { r.hold = 0; r.script.shift(); w.fn?.(r); }
        break;
      }
      // ---------------------------------------------------------------- salt
      case 'ferry-out': case 'ferry-back': {
        const out = r.mode === 'ferry-out', P = out ? st.B : st.A, hi = out ? 0.3 : 0.75;
        // along the line low and laden, back higher and empty, settling at each end
        const left = hyp(P.x - r.pos.x, P.z - r.pos.z);
        r.goal.set(P.x, P.y + (left > 0.6 ? hi : 0.02), P.z); r.vmax = out ? 1.3 : 2.2; r.wantFlap = 1;
        if (left < 0.05 && Math.abs(r.pos.y - r.goal.y) < 0.05) { r.mode = out ? 'ferry-drop' : 'ferry-pick'; r.t = 0; }
        break;
      }
      case 'ferry-drop': r.goal.copy(st.B); r.goal.y += 0.02; if (r.t > 0.5) r.carry = 0; if (r.t > 0.8) { r.mode = 'ferry-back'; r.t = 0; } break;
      case 'ferry-pick': r.goal.copy(st.A); r.goal.y += 0.02; if (r.t > 0.6) r.carry = 1; if (r.t > 0.9) { r.mode = 'ferry-out'; r.t = 0; } break;
      case 'watch':
        // stopped dead where they were, every head turned to you, until you have gone by
        r.goal.copy(r.e); lookAt(r, cam.x, cam.y, cam.z); r.wantFlap = 1;
        break;
      case 'guard-up': {
        // between you and his pile, his lance up; no nearer, no farther
        const P = st.perches[0], ex = cam.x - P.x, ez = cam.z - P.z, e = hyp(ex, ez) || 1;
        const k = Math.min(0.95, Math.max(0.3, e - 1.6)); r.goal.set(P.x + (ex / e) * k, P.y + 0.55, P.z + (ez / e) * k); r.vmax = 3;
        lookAt(r, cam.x, cam.y, cam.z);
        if (e < 3.2 && r.cd2 <= 0) { cue('twk-chirrup', r.pos, { mood: 'indignant', voice: r.i }); r.cd2 = 4.5 + rng() * 2; }
        r.cd2 = (r.cd2 ?? 0) - dt;
        if (e > 9) goHome(r, 2.5);
        break;
      }
      // ---------------------------------------------------------------- the gutter
      case 'land':
        r.wantFlap = r.pos.distanceTo(r.goal) < 0.04 ? 0 : 1; r.vmax = 5;
        if (r.wantFlap === 0) r.landed = true;
        break;
    }
    // the guard's and the spill's own triggers
    if (st.kind === 'house' && !gut && r.mode === 'perch' && dc < 7) { go(r, 'guard-up', 3); r.cd2 = 0.8; }
    if (st.kind === 'spill' && !gut) {
      const ds = stDist(st);
      if (ds < 14 && r.mode.startsWith('ferry')) { r.resume = r.mode; r.e = r.pos.clone(); r.mode = 'watch'; r.t = 0; }
      else if (ds > 16 && r.mode === 'watch') { r.mode = r.resume || 'ferry-back'; r.t = 0; r.looking = false; }
    }
  }

  // integrate one rider: a velocity that seeks its goal and dies away near it, so a dart ends in a dead stop
  function fly(r, dt) {
    _d.subVectors(r.goal, r.pos);
    const dist = _d.length();
    const sp = Math.min(r.vmax, dist * 7);
    if (dist > 1e-5) _d.multiplyScalar(sp / dist); else _d.set(0, 0, 0);
    const k = Math.min(1, dt * 12);
    r.vel.x += (_d.x - r.vel.x) * k; r.vel.y += (_d.y - r.vel.y) * k; r.vel.z += (_d.z - r.vel.z) * k;
    r.pos.addScaledVector(r.vel, dt);
    // never nearer the eye than MIN_CAM
    _d.subVectors(r.pos, cam); const e = _d.length();
    if (e < MIN_CAM) r.pos.copy(cam).addScaledVector(_d, MIN_CAM / Math.max(e, 1e-3));
    r.minCam = Math.min(r.minCam, Math.max(e, MIN_CAM));
    // the whirr of one darting past within 4 m
    if (r.cd <= 0 && r.flap > 0.5 && e < 4 && r.vel.lengthSq() > 2.25) { cue('twk-buzz', r.pos, { voice: r.i }); r.cd = 2.2; }
    // and never into the ground
    const g = gy(r.pos.x, r.pos.z) + LEGS * 0.8;
    if (r.pos.y < g) r.pos.y = g;
    // heading: along a dart, toward what it looks at when holding, or as told
    const hs = hyp(r.vel.x, r.vel.z);
    let want = r.yaw;
    if (r.looking) want = Math.atan2(r.look.x - r.pos.x, r.look.z - r.pos.z);
    else if (r.yawGoal != null && (r.mode === 'inspect-scorn' || r.mode === 'escort-tire')) want = r.yawGoal;
    else if (hs > 0.5) want = Math.atan2(r.vel.x, r.vel.z);
    else if (r.mode === 'perch') want = hyp(r.pos.x - cam.x, r.pos.z - cam.z) < 25 ? Math.atan2(cam.x - r.pos.x, cam.z - r.pos.z) : r.homeYaw; // he watches you come
    let dy = want - r.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const turn = dy * Math.min(1, dt * 10);
    r.yaw += turn;
    r.roll += (clamp(-turn / Math.max(dt, 1e-3) * 0.04, -0.5, 0.5) - r.roll) * Math.min(1, dt * 8);
    // nose down into a dart, and the inspection's look up and down
    const fwd = r.vel.x * Math.sin(r.yaw) + r.vel.z * Math.cos(r.yaw);
    const pitchGoal = clamp(-fwd * 0.07, -0.35, 0.35) + (r.mode === 'inspect-look' ? r.tilt : 0) + (r.landed || r.mode === 'perch' ? 0 : 0.05);
    r.pitch += (pitchGoal - r.pitch) * Math.min(1, dt * 7);
    r.flap += ((r.wantFlap ? 1 : 0) - r.flap) * Math.min(1, dt * 9);
  }

  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(0, 0, 0, 'YXZ'), SC = new THREE.Vector3(1, 1, 1), PJ = new THREE.Vector3();
  const sunW = new THREE.Vector3(ctx.sun.dir.x, ctx.sun.dir.y, ctx.sun.dir.z).normalize();
  let lastT = 0;
  function update(dtIn, t) {
    uTime.value = t;
    // the walker's speed, and the Thurifer's heading, from where each was
    const ddt = Math.max(1e-3, t - lastT); lastT = t;
    plv.subVectors(cam, plLast); plSpeed += (hyp(plv.x, plv.z) / ddt - plSpeed) * Math.min(1, ddt * 6); plLast.copy(cam);
    const TP = ctx.walkers?.thurifer?.root?.position;
    if (TP) {
      if (!thur.has) { thur.last.copy(TP); thur.has = true; }
      thur.pos.copy(TP);
      const vx = (TP.x - thur.last.x) / ddt, vz = (TP.z - thur.last.z) / ddt;
      if (hyp(TP.x - thur.last.x, TP.z - thur.last.z) < 5) { thur.v.x += (vx - thur.v.x) * Math.min(1, ddt * 3); thur.v.z += (vz - thur.v.z) * Math.min(1, ddt * 3); }
      thur.last.copy(TP);
    }
    // the gutter: down at once, up again a beat late each
    const f = flick.value;
    if (!gut && f < GUT_DOWN) {
      gut = true;
      for (const r of riders) {
        r.landed = false;
        if (r.mode === 'perch') { r.landed = true; continue; }
        r.resume = r.mode.startsWith('ferry') || r.mode === 'watch' ? (r.mode === 'watch' ? r.resume : r.mode) : null;
        const near = r.pos.distanceTo(r.home) < 3 && !r.st.loiter;
        r.mode = 'land'; r.t = 0; r.looking = false;
        if (near) r.goal.copy(r.home); else r.goal.set(r.pos.x, gy(r.pos.x, r.pos.z) + LEGS + 0.01, r.pos.z);
        if (r.st.loiter) { const g = gy(r.pos.x, r.pos.z), w = terrain.waterLevelAt(r.pos.x, r.pos.z); if (w !== null && w > g) { r.goal.set(r.home.x + 2.5, 0, r.home.z); r.goal.y = gy(r.goal.x, r.goal.z) + LEGS; } }
      }
    } else if (gut && f > GUT_UP) {
      gut = false; gutEnd = t;
      for (const r of riders) r.wake = t + 0.7 + rng() * 0.9;
    }
    if (!gut && gutEnd >= 0) {
      let waiting = false;
      for (const r of riders) {
        if (!r.wake) continue;
        if (t < r.wake) { waiting = true; continue; }
        r.wake = 0; r.landed = false;
        if (r.mode === 'land') { if (r.resume) { r.mode = r.resume; r.t = 0; r.wantFlap = 1; buzz(r); } else goHome(r, 3.5); }
        else if (r.mode === 'perch' && hyp(r.pos.x - cam.x, r.pos.z - cam.z) < 60) hopFrom(r, 1);
      }
      if (!waiting) gutEnd = -1;
    }
    // big steps (the 4 Hz far loop) are taken in pieces
    const n = Math.min(10, Math.ceil(dtIn / 0.05)), dt = Math.min(dtIn, 0.5) / n;
    for (let s = 0; s < n; s++) {
      for (const st of stations) stationTick(st, t, dt);
      if (!api.hold) for (const r of riders) { step(r, dt, t); fly(r, dt); }
    }
    for (const r of riders) {
      // what holds still holds dead still: a hover is a few millimetres of drift, a perch none
      const hov = r.flap * (r.mode === 'salute' || r.mode === 'watch' ? 0.002 : 0.006);
      PJ.set(r.pos.x + Math.sin(t * 1.3 + r.w1) * hov, r.pos.y + Math.sin(t * 1.9 + r.w2) * hov, r.pos.z + Math.cos(t * 1.1 + r.w1) * hov);
      E.set(-r.pitch, r.yaw, r.roll * r.flap); Q.setFromEuler(E);
      M4.compose(PJ, Q, SC); body.setMatrixAt(r.i, M4);
      aFly.setXYZW(r.i, r.flap, r.ph, r.carry, clamp(r.vel.length() / 4, 0, 1));
    }
    body.instanceMatrix.needsUpdate = true; aFly.needsUpdate = true;
    wingM.userData.uFlicker.value = f;
    wingM.userData.uSunView.value.copy(sunW).transformDirection(camera.matrixWorldInverse);
  }
  // every frame within 70 m of a station (or of a rider out with you), 4 Hz beyond
  const at = { x: 0, z: 0 };
  ctx.registerUpdate(update, { at: () => {
    let bd = Infinity;
    for (const r of riders) { const d = (r.pos.x - cam.x) * (r.pos.x - cam.x) + (r.pos.z - cam.z) * (r.pos.z - cam.z); if (d < bd) { bd = d; at.x = r.pos.x; at.z = r.pos.z; } }
    return at;
  }, near: 70, hz: 4 });

  const tris = (bodyG.index.count + wingG.index.count + riderG.index.count) / 3 * N + S.tris;
  ctx.twk = Object.assign(api, {
    stations: stations.map((s) => ({ id: s.id, kind: s.kind, x: +s.x.toFixed(2), z: +s.z.toFixed(2), n: s.n, track: s.trackId, trackD: +s.trackD.toFixed(2), gnomon: s.gnomon, perches: s.perches.map((p) => ({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) })), manners: ['inspect', s.escort && 'escort', s.quarrel && 'quarrel', s.salute && 'salute', s.kind === 'house' && 'guard', s.kind === 'spill' && 'ferry'].filter(Boolean) })),
    riders, salt: { spill: salt.spill, cache: salt.cache, pile: { ...pile } },
    get gutter() { return gut; },
    stats: () => ({ riders: N, stations: stations.length, calls: 4, tris: Math.round(tris), modes: riders.reduce((a, r) => { a[r.mode] = (a[r.mode] || 0) + 1; return a; }, {}), ms: Math.round(performance.now() - t0) }),
  });
  if (SP && SALT_ON) buildSaltActs(ctx, { fan: SP.fan || salt.spill, pile, spill: salt.spill, gy, twk: ctx.twk, house: stations.find((q) => q.id === 'house'), gate });
  ctx.log(`twk: ${N} riders at ${stations.length} stations (${stations.map((s) => `${s.id} ${s.n}`).join(', ')}) in ${(performance.now() - t0).toFixed(0)} ms`);
}
