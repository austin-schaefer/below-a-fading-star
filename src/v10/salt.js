// Salt for news (v10-A2; stories/salt-for-news.md): the story's turn, done with a pinch of salt carried from one place
// to another, and paid for in news.
//
// At the split sack on the Salt-Pedlars' road the visitor is offered "Take a pinch": a puff of bright grains lifts from
// the spilt fan into their hand (half a second) and the pinch is carried, as data on the take act in the acts' memory
// (it survives a reload; nothing on screen shows it). At the Twk-men's guard on his pile outside the Pomegranate
// House's gate they are offered "Pay in salt": the pinch is thrown onto the pile in a bright arc; the guard rises off
// it with a grain; two more riders of his come in over the turf from where they were perched 18 m out, settle on the
// pile one after the other, take a grain each and go off high and fast toward a far place; and the guard, hovering a
// moment over the tile, lets fall the payment, which is news, a thing that lands beside the pile and stays:
//   1 a scrap of saffron cloth, cream-lined, madder-hemmed, weighted with a grain of salt; the riders go off toward the
//     Great Span: the traveller. That is the turn: the pedlar looked up at the Span, saw the man go over, and dropped
//     his sack
//   2 a strip of faded ember, frayed, with a tuft of black wool; the riders go off toward the Collation: the officer's
//     collar of the twelfth chair's black coat
//   3 two gold tesserae on a leaf of paper; the riders go off toward the Wayside Shrine: the jackdaw's
// Free acts: a visitor may carry a pinch again until the three are laid; they stay on the tile (show). The riders are
// the twk module's own (the house station's three), driven by its 'script' mode (ctx.twk.runScript).
import * as THREE from 'three';
import { Acc, mat } from '../v5/dressing/kit.js';

const ID_TAKE = 'salt-pinch', ID_PAY = 'salt-news';
const COUNT = 3;
const SALT = '#f1ede4';
const DEST = [{ x: -118.5, z: 221 }, { x: 141, z: -66 }, { x: -108, z: -128 }]; // the Span, the Collation, the Wayside Shrine

export function buildSaltActs(ctx, { fan, pile, spill, gy, twk, house }) {
  if (!ctx.acts || !pile || !fan) return null;
  const rng = ctx.makeRng(1030), cam = ctx.camera;
  const ico = new THREE.IcosahedronGeometry(1, 0);

  // ------------------------------------------------------------------ the news: three things on the tile's near side
  const toward = Math.atan2((spill?.x ?? pile.x + 1) - pile.x, (spill?.z ?? pile.z) - pile.z);
  const spots = [-0.5, 0, 0.5].map((da) => { const a = toward + da; return { x: pile.x + Math.sin(a) * 1.0, z: pile.z + Math.cos(a) * 1.0, a }; });
  const grain = (acc, x, y, z) => acc.add(ico, mat(x, y, z, rng() * 3, rng() * 3, 0, 0.02), SALT, 0.04);
  const mk = (k) => {
    const A = new Acc(rng);
    if (k === 0) { // saffron on cream, madder border, one corner folded back, a grain of salt to hold it
      A.box(0.34, 0.012, 0.26, mat(0, 0.006, 0, 0, 0.1, 0), '#ece0c0', 0.02);
      A.box(0.32, 0.014, 0.22, mat(-0.005, 0.016, 0.01, 0, 0.1, 0), '#f0a812', 0.03);
      A.box(0.32, 0.016, 0.034, mat(-0.005, 0.017, 0.092, 0, 0.1, 0), '#b04a22', 0.03);
      A.box(0.1, 0.012, 0.09, mat(0.13, 0.034, -0.07, 0.12, 0.5, 0.2), '#efe3c4', 0.02);
      grain(A, 0.0, 0.032, 0.0); grain(A, 0.03, 0.03, 0.02);
    } else if (k === 1) { // a strip of ember, frayed at both ends, a stitched line, a tuft of black wool
      A.box(0.4, 0.012, 0.09, mat(0, 0.006, 0, 0, 0.25, 0), '#d8581e', 0.05);
      A.box(0.4, 0.004, 0.012, mat(0, 0.013, 0.01, 0, 0.25, 0), '#7a2c12', 0.05);
      for (let i = 0; i < 7; i++) { const e = i < 4 ? -1 : 1; A.box(0.06, 0.004, 0.006, mat(e * 0.225, 0.004, -0.04 + (i % 4) * 0.025, 0, 0.25 + (rng() - 0.5) * 0.5, 0), '#c04e1a', 0.05); }
      A.add(ico, mat(0.08, 0.02, 0.07, 0, 0, 0, 1).scale(new THREE.Vector3(0.04, 0.02, 0.03)), '#17141a', 0.1);
      grain(A, -0.05, 0.02, 0.0); grain(A, 0.09, 0.02, -0.02);
    } else { // a leaf of paper with two gold tesserae on it
      A.box(0.3, 0.006, 0.24, mat(0, 0.003, 0, 0, -0.2, 0), '#d8cfb4', 0.03);
      A.box(0.14, 0.05, 0.14, mat(-0.04, 0.03, 0.0, 0.0, 0.5, 0), '#e8b030', 0.02);
      A.box(0.1, 0.04, 0.1, mat(0.09, 0.025, 0.05, 0.0, 0.3, 0), '#d8a022', 0.02);
      grain(A, -0.1, 0.01, 0.08); grain(A, -0.08, 0.01, 0.1);
    }
    return A.geometry();
  };
  const things = [0, 1, 2].map((k) => {
    const m = new THREE.Mesh(mk(k), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: k === 2 ? 0.35 : 0.9, metalness: k === 2 ? 0.4 : 0, side: THREE.DoubleSide,
      emissive: ['#5a3c0a', '#5a200a', '#7a5a14'][k], emissiveIntensity: 1 }));
    const s = spots[k], y = Math.max(gy(s.x, s.z), gy(s.x + 0.2, s.z), gy(s.x - 0.2, s.z), gy(s.x, s.z + 0.2), gy(s.x, s.z - 0.2));
    m.position.set(s.x, y + 0.012, s.z); m.rotation.y = s.a + (k - 1) * 0.5; m.scale.setScalar(1.3); m.name = `twk-news-${k}`; m.castShadow = false; m.receiveShadow = true; m.visible = false;
    ctx.scene.add(m);
    return { m, y: m.position.y, drop: -1 };
  });

  // ------------------------------------------------------------------ grains in flight: one InstancedMesh of 16
  const NG = 16;
  const gI = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.03, 0), new THREE.MeshStandardMaterial({ color: SALT, roughness: 0.8, emissive: '#d8d2c0', emissiveIntensity: 1 }), NG);
  gI.frustumCulled = false; gI.visible = false; gI.name = 'twk-news-grains'; ctx.scene.add(gI);
  const tm = new THREE.Matrix4(), tp = new THREE.Vector3(), tq = new THREE.Quaternion(), ts = new THREE.Vector3(1, 1, 1);
  const top = pile.top ?? gy(pile.x, pile.z) + 0.5;
  let toss = null; // { t, dur, from, to, g[] }
  const hand = () => { const f = new THREE.Vector3(); cam.getWorldDirection(f); return new THREE.Vector3(cam.position.x + f.x * 0.5, cam.position.y - 0.38, cam.position.z + f.z * 0.5); };
  function throwGrains(from, to, dur, lift) {
    toss = { t: 0, dur, from, to, lift, g: Array.from({ length: NG }, (_, i) => ({ d: i * dur * 0.03, ox: (rng() - 0.5) * 0.22, oz: (rng() - 0.5) * 0.22, up: rng() * 0.5 })) };
    gI.visible = true;
  }
  let drops = 0; // things falling
  function frame(dt) {
    if (toss) {
      toss.t += dt;
      const { t, dur, from, to, g, lift } = toss;
      for (let i = 0; i < NG; i++) {
        const k = Math.min(1, Math.max(0, (t - g[i].d) / (dur - g[i].d)));
        tp.set(from.x + (to.x + g[i].ox - from.x) * k, from.y + (to.y - from.y) * k + lift * Math.sin(k * Math.PI) * (0.6 + g[i].up), from.z + (to.z + g[i].oz - from.z) * k);
        ts.setScalar(k >= 1 ? 0.001 : 1); tm.compose(tp, tq, ts); gI.setMatrixAt(i, tm);
      }
      gI.instanceMatrix.needsUpdate = true;
      if (t > dur + 0.05) { toss = null; gI.visible = false; }
    }
    if (drops) {
      drops = 0;
      for (const th of things) {
        if (th.drop < 0) continue;
        th.drop += dt; drops++;
        const u = Math.min(1, th.drop / 0.55), fall = 1 - u * u, bounce = u >= 1 ? Math.max(0, 0.04 * Math.sin((th.drop - 0.55) * 18) * Math.exp(-(th.drop - 0.55) * 7)) : 0;
        th.m.position.y = th.y + 0.55 * fall + bounce; th.m.rotation.z = (1 - u) * 1.2;
        if (th.drop > 1.2) { th.drop = -1; th.m.position.y = th.y; th.m.rotation.z = 0; }
      }
    }
  }
  ctx.registerUpdate(frame); // two places far apart, so no distance gate: it returns at once unless something is in flight

  // ------------------------------------------------------------------ the pay: the riders on their errand
  function errand(n) {
    const k = Math.min(n, COUNT) - 1, rs = house?.riders || [];
    if (!twk?.runScript || !rs.length) { if (k >= 0) { things[k].m.visible = true; things[k].drop = 0; drops = 1; } return; }
    const [guard, a, b] = rs, th = things[k], sp = spots[k], d = DEST[k];
    const away = (r, o) => { // up and off toward the story's place, then home unseen
      const dx = d.x - pile.x, dz = d.z - pile.z, l = Math.hypot(dx, dz) || 1, X = pile.x + dx / l * 38 + o, Z = pile.z + dz / l * 38;
      return { x: X, y: gy(X, Z) + 11, z: Z, v: 9, r: 3, fn: () => { r.pos.copy(r.home); r.vel.set(0, 0, 0); r.goal.copy(r.home); r.mode = 'perch'; r.t = 0; r.carry = 0; r.landed = false; } };
    };
    const look = { x: cam.position.x, y: cam.position.y, z: cam.position.z };
    twk.runScript(guard, [
      { x: pile.x, y: top + 0.45, z: pile.z, v: 3.5, hold: 1.1, look, r: 0.2, carry: 0 },
      { x: pile.x, y: top + 0.1, z: pile.z, v: 2, hold: 0.45, r: 0.1, fn: (r) => { r.carry = 1; } },
      { x: sp.x, y: th.y + 0.6, z: sp.z, v: 2.6, hold: 0.15, r: 0.15, fn: (r) => { r.carry = 0; th.m.visible = true; th.drop = 0; drops = 1; } },
      { x: sp.x + 0.2, y: th.y + 1.3, z: sp.z + 0.2, v: 1.6, hold: 1.6, look, r: 0.2 },
    ]);
    [a, b].forEach((r, i) => {
      if (!r) return;
      const lx = pile.x + (i ? -0.3 : 0.3), lz = pile.z + (i ? 0.2 : -0.2);
      twk.runScript(r, [
        { x: r.home.x, y: r.home.y + 2.5, z: r.home.z, v: 3, r: 0.4 },
        { x: lx + (pile.x - r.home.x) * 0.3, y: top + 1.0, z: lz + (pile.z - r.home.z) * 0.3, v: 8, r: 0.6 },
        { x: lx, y: top + 0.1, z: lz, v: 2.2, hold: 0.5 + i * 0.5, r: 0.1, fn: (rr) => { rr.carry = 1; } },
        away(r, i ? -6 : 6),
      ]);
    });
  }

  // ------------------------------------------------------------------ the acts
  const take = ctx.acts.add({
    id: ID_TAKE, at: { x: fan.x, y: (fan.y ?? gy(fan.x, fan.z)) + 0.05, z: fan.z }, reach: 2.0, rise: 2.5, cone: 0.5,
    words: 'Take a pinch', every: 'free',
    when: () => !take.data.held && ctx.acts.count(ID_PAY) < COUNT,
    do() {
      take.setData({ held: 1 });
      throwGrains(new THREE.Vector3(fan.x, gy(fan.x, fan.z) + 0.1, fan.z), hand(), 0.7, 0.25);
      ctx.audio?.cue('act-pinch', { x: fan.x, y: gy(fan.x, fan.z) + 0.3, z: fan.z });
      return 1.0;
    },
  });
  const pay = ctx.acts.add({
    id: ID_PAY, at: { x: pile.x, y: top - 0.1, z: pile.z }, reach: 2.4, rise: 2.5, cone: 0.45,
    words: 'Pay in salt', every: 'free',
    when: () => !!take.data.held && ctx.acts.count(ID_PAY) <= COUNT,
    show(n) { toss = null; gI.visible = false; things.forEach((th, k) => { th.m.visible = k < Math.min(n, COUNT); th.drop = -1; th.m.position.y = th.y; th.m.rotation.z = 0; }); },
    do(n) {
      take.setData({ held: 0 });
      throwGrains(hand(), new THREE.Vector3(pile.x, top, pile.z), 0.9, 0.35);
      ctx.audio?.cue('act-tribute', { x: pile.x, y: top, z: pile.z });
      if (n <= COUNT) errand(n);
      return 6.5;
    },
  });
  const stand = (at, a, d, y) => {
    const x = at.x + Math.sin(a) * d, z = at.z + Math.cos(a) * d, ey = ctx.terrain.heightAt(x, z) + ctx.player.eye;
    return { x, z, yaw: Math.atan2(-(at.x - x), -(at.z - z)), pitch: Math.atan2(y - ey, d) };
  };
  const out = { take, pay, things, spots, pile, fan, top, get tossing() { return !!toss; },
    standSack(d = 1.75) { const a = Math.atan2(fan.x - (spill?.x ?? fan.x - 1), fan.z - (spill?.z ?? fan.z)) + 2.4; return stand(fan, a, d, gy(fan.x, fan.z) + 0.1); },
    standPile(d = 1.7) { return stand(pile, toward + 0.9, d, top - 0.1); } };
  ctx.storyActs = Object.assign(ctx.storyActs || {}, { salt: out });
  return out;
}
