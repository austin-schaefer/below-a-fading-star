// v8-05 the Pomegranate House, lit and lived in (briefs/v8/brief-v8-05-house.md): the one warm, bright, silly place on
// the map. "While we are alive we should sit among colored lights and taste good wines."
//
//   lamps   house/lamps.js: lanterns in four colours on brief 03's brackets, on strings from a mast in the dry fountain
//           to the turrets and the galleries' roofs, over the gate, and on painted poles out along P9 toward the
//           causeway and round the east side to the head of kerb K1. No point light of its own (the court keeps the
//           house's two lanterns; walkers-test allows three sources within reach of any path): emissive glass, halos at
//           least two pixels across, warm pools on the ground. They sway, and dim, flutter, go out and flare with the
//           sun's gutter; the fickle ones are relit late, one by one.
//   folk    house/folk.js: the host at the gate, the two patrons at the board, the musician on the fountain's rim,
//           the sleeper under the bronze-door table, wearing the slipper's mate (thread 3: src/v5/dressing/slipper.js).
//   props   house/props.js: the mast, the poles and strings, benches, the board, the table, the spilt things, the
//           trampled ground before the gate.
//   voice   house/sound.js (the cues; audio.js starts it, audio/cues.js routes `house-*` to it). This file phrases them:
//           talk in bouts with rests, a laugh at the end of some, the oud in short halting phrases with long rests (and
//           not while the musician is offended), a cup set down when the loser drinks, the lamps' glass ticking within
//           a few metres of one. In a gutter all of it stops; after it, one nervous laugh first, then the talk, then
//           the music. The sleeper breathes with the Long Sleeper's cue.
//
// ctx.house = { lamps, figures: { host, patrons, musician, sleeper }, slipper, gutter, uK, plan, log, sim(dt), stats() }.
// ?house=0 leaves it all out. Updates within 160 m every frame, beyond at 4 Hz.
import * as THREE from 'three';
import { TAVERNA, TAVERNA_BRACKETS } from '../structures/taverna.js';
import { makeGround } from '../structures/geo.js';
import { waitFor, loaded } from '../v7/workers/rig.js';
import { hyp } from '../noise.js';
import { layLamps, lampMesh, glowMesh, makeGutter, FICKLE, GLASS_Y } from './house/lamps.js';
import { buildProps, bareGround } from './house/props.js';
import { buildHost, buildPatrons, buildMusician, buildSleeper, SLEEPER } from './house/folk.js';
import { slipperShape, brocade, SLIPPER } from '../v5/dressing/slipper.js';
import { BARE } from './house/clear.js';

const MIN_PX = 1.6; // a halo's least radius in pixels, so a far lamp stays a point
const PARAM = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('house') : null;

export async function build(ctx) {
  if (PARAM === '0') { ctx.house = null; return; }
  await ctx.progress?.('the Pomegranate House', 0);
  const { x: cx, z: cz, half } = TAVERNA;
  const low = ctx.quality === 'low';
  const GR = makeGround(ctx), G = GR.groundAt, N2 = ctx.noise.noise2;
  const rng = ctx.makeRng(8050);
  // brief 03's brackets, once the structures have built (modules build in parallel)
  if (ctx.strata?.on && loaded('structures')) await waitFor(() => TAVERNA_BRACKETS.length || null, 30000);

  // ---------------------------------------------------------------- the plan
  const gc = G(cx, cz);
  const plan = { brackets: [], strings: [], hung: [], poles: [], benches: [], spilt: [] };
  for (const b of TAVERNA_BRACKETS) plan.brackets.push({ x: b.x, y: b.y, z: b.z });
  plan.mast = { x: cx, z: cz, g: gc, base: gc + 2.2, top: gc + 11.0, attach: gc + 10.5 };
  const M = [cx, plan.mast.attach, cz];
  const turret = (sx, sz) => { const x = cx + sx * half, z = cz + sz * half; return [x, G(x, z) + 7.6, z]; };
  const roof = (dx, dz) => { const x = cx + dx * 9.6, z = cz + dz * 9.6; return [x, G(x, z) + 4.3, z]; };
  const T = { nw: turret(-1, -1), ne: turret(1, -1), se: turret(1, 1), sw: turret(-1, 1) };
  // the tent of lamps over the court: mast to the turrets and to the galleries' roofs
  for (const t of Object.values(T)) plan.strings.push({ a: M, b: t, sag: 0.55, step: 1.7, size: 0.95 });
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) plan.strings.push({ a: M, b: roof(dx, dz), sag: 0.25, step: 1.5, size: 0.85 });
  // round the walls, turret to turret
  for (const [a, b] of [[T.nw, T.ne], [T.ne, T.se], [T.se, T.sw], [T.sw, T.nw]]) plan.strings.push({ a, b, sag: 1.5, step: 1.8, size: 0.9 });
  // the poles: out along P9 toward the causeway (west), and round the east side to kerb K1's head
  const poleH = 3.5;
  const west = [[86.0, -62.0], [80.0, -61.0], [78.5, -52.5], [78.5, -43.5], [80.0, -35.0], [82.6, -26.5], [81.0, -18.0]];
  const east = [[104.0, -62.0], [111.0, -61.5], [117.5, -55.0], [119.0, -46.0], [118.5, -36.5], [116.0, -28.5], [111.5, -24.0]];
  const poles = (pts, from) => pts.map(([x, z], i) => {
    const n = pts[Math.min(i + 1, pts.length - 1)], p = pts[Math.max(i - 1, 0)];
    const p0 = { x, z, top: G(x, z) + poleH, i: i + from, yaw: Math.atan2(n[0] - p[0], n[1] - p[1]) + Math.PI / 2 };
    plan.poles.push(p0); return [x, p0.top - 0.12, z];
  });
  const W = poles(west, 0), E = poles(east, 3);
  for (const R of [W, E]) for (let i = 0; i < R.length - 1; i++) plan.strings.push({ a: R[i], b: R[i + 1], sag: 0.45, step: 1.7, size: 0.8 });
  plan.strings.push({ a: W[0], b: E[0], sag: 0.75, step: 1.6, size: 0.85 }); // across the front of the gate
  plan.strings.push({ a: T.nw, b: W[1], sag: 0.6, step: 1.8, size: 0.85 });
  plan.strings.push({ a: T.ne, b: E[1], sag: 0.6, step: 1.8, size: 0.85 });
  // the patrons' table (03's hex paver on its trestle) and their stools, before the gate west of it
  const zf = cz - half - 0.4, tx = cx - 5.3, tz = zf - 2.3, tg = G(tx, tz);
  plan.table = { x: tx, z: tz, top: tg + 0.865 };
  plan.benches.push({ x: 84.6, z: -63.6, yaw: Math.PI * 0.5 + 0.35, w: 2.2 }, { x: 101.6, z: -63.8, yaw: -Math.PI * 0.5 - 0.3, w: 2.2 }, { x: 77.3, z: -47.5, yaw: Math.PI / 2, w: 2.0 });
  plan.sleeperTable = { x: 92.2, z: -51.6, yaw: 0 };
  plan.spilt.push({ kind: 'cup', x: 93.6, z: -61.6, yaw: 0.7 }, { kind: 'shards', x: 91.6, z: -63.2 }, { kind: 'pom', x: 96.2, z: -62.6 }, { kind: 'spoon', x: 88.4, z: -62.4, yaw: 1.1 });
  const inCourt = (x, z) => (Math.abs(x - cx) < 9.8 && Math.abs(z - cz) < 9.8) || (Math.abs(x - cx) < 1.6 && z < cz - 9 && z > cz - half - 0.5);

  // ---------------------------------------------------------------- the lamps
  const lamps = layLamps(ctx, plan, rng);
  const U = { uK: { value: new Float32Array(FICKLE + 1).fill(1) }, uTime: { value: 0 }, uSway: { value: low ? 0 : 1 }, uMinPx: { value: 0.004 }, uPool: { value: 1 } };
  const lampM = lampMesh(ctx, lamps, U);
  const pools = [
    { x: cx, z: cz, rx: 10.5, rz: 10.5, col: [0.22, 0.11, 0.035] },
    { x: cx, z: zf - 3.2, rx: 7, rz: 4.5, col: [0.2, 0.1, 0.03] },
    ...plan.poles.map((p) => ({ x: p.x, z: p.z, rx: 3.2, rz: 3.2, col: [0.1, 0.05, 0.016] })),
  ];
  const glowM = glowMesh(ctx, lamps, pools, G, U);
  ctx.scene.add(lampM, glowM);
  const gutter = makeGutter(rng);
  // the court's light: the house's own east-gallery lantern keeps its glass, and its light moves to the mast, warmer and
  // brighter, under the lamps (so the court is lit and the count of point lights near the paths stays what it was)
  const old = loaded('structures') ? await waitFor(() => ctx.scene.getObjectByName('taverna-court-lantern'), 30000) : null;
  old?.removeFromParent();
  const courtLight = new THREE.PointLight(new THREE.Color('#ffb070'), 0, 14, 2);
  courtLight.name = 'house-court-light'; courtLight.position.set(cx, gc + 4.2, cz);
  ctx.scene.add(courtLight);

  // ---------------------------------------------------------------- the props
  const props = buildProps(ctx, plan, G, rng);
  const bare = bareGround(ctx, G, { ...BARE, spill: [93.4, -61.9] }, N2);

  // ---------------------------------------------------------------- the people
  const stoolG = (x, z) => G(x, z);
  const host = buildHost(ctx, { x: 97.3, z: zf - 2.0, y: G(97.3, zf - 2.0) - 0.02, yaw: Math.PI + 0.5 });
  const seats = [[tx - 0.95, tz + 0.1, Math.PI / 2], [tx + 0.9, tz - 0.3, -Math.PI / 2]].map(([x, z, yaw]) => ({ x, z, yaw, y: stoolG(x, z), hs: 0.43 }));
  const patrons = buildPatrons(ctx, seats, plan.table);
  const rimY = gc + 0.575, mx = cx + 1.1, mz = cz - 2.28, mg = G(mx, mz);
  const musician = buildMusician(ctx, { x: mx, z: mz, y: mg, yaw: Math.PI, hs: rimY - mg + 0.01 });
  const st = plan.sleeperTable, sleeper = buildSleeper(ctx, { x: st.x + 0.6, z: st.z, y: G(st.x + 0.6, st.z), yaw: Math.PI / 2 });
  // thread 3: the slipper's mate on his left foot, toe up, the brocade of the one on the causeway
  const slipper = (() => {
    const g = slipperShape();
    const u = new THREE.Vector3(...SLEEPER.toe).normalize(), w = new THREE.Vector3(...SLEEPER.up), x = new THREE.Vector3();
    w.addScaledVector(u, -w.dot(u)).normalize(); x.crossVectors(u, w);
    const local = new THREE.Matrix4().makeBasis(u, w, x).setPosition(SLEEPER.foot[0], SLEEPER.foot[1], SLEEPER.foot[2]);
    g.applyMatrix4(local); g.applyMatrix4(sleeper.place); g.computeVertexNormals(); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: brocade(ctx.makeRng(5402)), roughness: 0.62, metalness: 0, side: THREE.DoubleSide }));
    m.name = 'house-slipper-mate'; m.castShadow = true; m.receiveShadow = true;
    ctx.scene.add(m);
    return m;
  })();
  ctx.addCollider({ x: sleeper.place.elements[12] + 0.85, z: sleeper.place.elements[14], r: 0.3 });

  // ---------------------------------------------------------------- the voice's phrasing, and the per-frame work
  const srng = ctx.makeRng(8052);
  const log = []; // the cues fired: { name, t, d } (the last 400)
  const cam = ctx.player.pos, fwd = { x: 0, z: -1 };
  const headPos = (f, k) => { const e = f.bones[2].elements; return { x: e[12], y: e[13] + 0.7, z: e[14] }; };
  const at = (o) => ({ x: o.x, y: o.y, z: o.z });
  const S = {
    t: 0, talk: { next: 1.2, left: 0, speaker: 0 }, music: { next: 2.5, left: 0, note: 2, gap: 0 }, drinkNext: 9, tickNext: 3, breathNext: 6,
    nervousAt: -1, resumeTalk: 0, resumeMusic: 0, fired: 0,
  };
  const fire = (name, pos, opts) => {
    const d = hyp(pos.x - cam.x, pos.z - cam.z);
    log.push({ name, t: +S.t.toFixed(2), d: +d.toFixed(1), opts: opts || null }); if (log.length > 400) log.shift();
    S.fired++;
    ctx.audio?.cue?.(name, pos, opts);
  };
  const patronPos = (k) => { const e = patrons.figs[k].bones[2].elements; return { x: e[12], y: e[13] + 0.7, z: e[14] }; };
  patrons.cue = (name) => fire(name, { x: plan.table.x, y: plan.table.top, z: plan.table.z });
  const lampXYZ = lamps.map((l) => ({ x: l.x, y: l.y + GLASS_Y * l.size, z: l.z, ch: l.ch }));
  const chLamp = []; lamps.forEach((l, i) => { if (l.ch) chLamp[l.ch] = i; });
  const K = U.uK.value;
  function scheduler(dt, d) {
    const live = d < 130 && !gutter.on, t = S.t;
    // after a gutter: one nervous laugh, then the talk, then the music
    if (S.nervousAt > 0 && t >= S.nervousAt) { S.nervousAt = -1; if (d < 130) { fire('house-laugh', patronPos(1), { nervous: true }); patrons.laugh(); } }
    if (!live) return;
    const T = S.talk;
    if (t >= T.next && t >= S.resumeTalk) {
      if (T.left <= 0) { T.left = 3 + Math.floor(srng() * 4); }
      const who = T.speaker, n = 3 + Math.floor(srng() * 6);
      fire('house-murmur', who === 2 ? headPos(host) : patronPos(who), { voice: who, n });
      T.left--;
      T.speaker = srng() < 0.12 ? 2 : (who === 2 ? Math.floor(srng() * 2) : 1 - who);
      const len = n * 0.17 + 0.1;
      if (T.left > 0) T.next = t + len + 0.25 + srng() * 0.7;
      else {
        // the end of a bout: the winner laughs at some of them, then a rest
        if (srng() < 0.4) { const l = t + len + 0.3; S.laughAt = l; }
        T.next = t + len + 2.5 + srng() * 5;
      }
    }
    if (S.laughAt && t >= S.laughAt) { S.laughAt = 0; fire('house-laugh', patronPos(1), { n: 4 + Math.floor(srng() * 4) }); patrons.laugh(); }
    // the oud: a phrase of 3-7 notes walking the pentatonic, one hesitation in some, then a long rest
    const Mu = S.music;
    if (!musician.state.playing) { Mu.left = 0; Mu.next = Math.max(Mu.next, t + 2); }
    else if (t >= Mu.next && t >= S.resumeMusic) {
      if (Mu.left <= 0) { Mu.left = 3 + Math.floor(srng() * 5); Mu.hes = srng() < 0.5 ? 1 + Math.floor(srng() * (Mu.left - 1)) : -1; }
      const step = srng() < 0.2 ? 0 : srng() < 0.5 ? -1 : 1;
      Mu.note = Math.max(0, Math.min(5, Mu.note + step + (Mu.note >= 5 ? -1 : 0)));
      if (musician.pluck(Mu.note)) fire('house-pluck', { x: musician.at.x, y: musician.at.y + musician.at.hs + 0.3, z: musician.at.z }, { note: Mu.note, v: 0.6 + srng() * 0.35 });
      Mu.left--;
      Mu.next = Mu.left > 0 ? t + (Mu.left === Mu.hes ? 1.1 + srng() * 0.8 : 0.32 + srng() * 0.42) : t + 5 + srng() * 7;
      if (Mu.left <= 0) Mu.note = 1 + Math.floor(srng() * 3);
    }
    // the loser drinks now and then (the cup is set down by patrons.update)
    if (t >= S.drinkNext) { patrons.drink(); S.drinkNext = t + 14 + srng() * 16; }
    // the sleeper's breath, the Long Sleeper's cue
    if (t >= S.breathNext) { if (hyp(sleeper.footWorld.x - cam.x, sleeper.footWorld.z - cam.z) < 25) fire('sleeper-breath', { x: sleeper.place.elements[12], y: sleeper.place.elements[13] + 0.2, z: sleeper.place.elements[14] }); S.breathNext = t + 16 + srng() * 10; }
    // the lamps' glass, near one
    if (t >= S.tickNext) {
      S.tickNext = t + 4 + srng() * 9;
      let best = -1, bd = 9;
      for (let i = 0; i < lampXYZ.length; i++) { const l = lampXYZ[i], dd = hyp(l.x - cam.x, l.z - cam.z); if (dd < bd) { bd = dd; best = i; } }
      if (best >= 0) fire('house-tick', lampXYZ[best]);
    }
  }
  function update(dt, t) {
    S.t += dt;
    const f = ctx.sky?.flicker?.value ?? 1;
    for (const e of gutter.step(dt, f, N2, K)) {
      if (e.type === 'gutter-on') { S.talk.left = 0; S.music.left = 0; S.laughAt = 0; }
      if (e.type === 'gutter-off') { S.nervousAt = S.t + 1.3; S.resumeTalk = S.t + 3.6; S.talk.next = S.resumeTalk; S.resumeMusic = S.t + 9 + srng() * 3; }
      if (e.type === 'relit') { const l = lampXYZ[chLamp[e.ch]]; if (l && hyp(l.x - cam.x, l.z - cam.z) < 40) fire('house-tick', l); }
    }
    U.uTime.value = t;
    courtLight.intensity = 30 * K[0] * (0.9 + 0.1 * N2(t * 1.7, 3.3));
    U.uMinPx.value = MIN_PX * 2 / Math.max(1, ctx.renderer.domElement.height);
    // the camera's look, for the patrons' stare
    fwd.x = -Math.sin(ctx.player.yaw); fwd.z = -Math.cos(ctx.player.yaw);
    const d = hyp(cam.x - cx, cam.z - cz);
    host.update(dt, t, cam, inCourt);
    patrons.update(dt, t, cam, fwd, patrons.cue);
    musician.update(dt, t, cam);
    sleeper.update(dt, t, cam);
    scheduler(dt, d);
  }
  ctx.registerUpdate(update, { pos: { x: cx, z: cz }, near: 160, hz: 4 });
  ctx.house = {
    lamps, plan, gutter, uK: K, U, log, state: S, inCourt, slipper, meshes: { lamps: lampM, glows: glowM, props, bare },
    figures: { host, patrons, musician, sleeper },
    sim(dt, n = 1) { for (let i = 0; i < n; i++) update(dt, S.t + dt); },
    stats() {
      const tri = (m) => (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;
      const ms = [lampM, glowM, props, bare, slipper, host.mesh, ...patrons.figs.map((f) => f.mesh), musician.mesh, sleeper.mesh];
      return { calls: ms.length, tris: Math.round(ms.reduce((s, m) => s + tri(m), 0)), lamps: lamps.length, fickle: FICKLE };
    },
  };
  void at; void SLIPPER;
}
