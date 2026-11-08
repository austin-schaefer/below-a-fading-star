// BT The Demesne [Proposed] (wilderness-v5.md; shape and site in wilderness-v4-placement.md section 2, REGIONS.demesne in
// world.js). "The keep's home ground, once a park: turf grazed short and gone tussocky, the outlines of parterres
// showing as ridges under the grass, yew shapes clipped long ago into cones and urns and now grown shapeless, and
// dressed blocks scattered from the fallen curtain tower. The boundary is a ha-ha, a sunk wall in a ditch that you
// do not see until you reach its edge, then a two-metre drop. The air is still and smells of cut stone; rooks talk at
// the keep. Only here: the peafowl, white and moulted, trailing a few last eyed feathers, crying from the fallen
// blocks at every gutter."
// An annulus round the keep from r 42 to 85, north and east (bearings 300 to 120 from the keep). The lower lawn is
// eased level toward the ha-ha; the ha-ha's drop is a ground skin (skin.js) over the coarse terrain, faced with a
// coursed wall; the causeway's v4 route crosses it on a bank at (120, 52). No Tincture (decided: the brief gives none).
import * as THREE from 'three';
import { LANDMARKS, CAUSEWAY_V4 } from '../../world.js';
import { makeSimplex, smoothstep, clamp, lerp } from '../../noise.js';
import { buildSkin, instanced, meshStats, meshGround } from './skin.js';

const KEY = 'demesne';
const N = makeSimplex(20261107 + 1010);
const K = LANDMARKS.castle; // (40, 30)
const HAHA = 77, FROM = 300, TO = 120, WALL_R = HAHA + 0.22; // the sunk wall; its ditch and the ramp back up run out to the region's edge at r 85
// the lower lawn's level by compass bearing from the keep (eased from the hill's own fall between r 70 and 85)
const LAWN = [[300, 8.2], [330, 4.2], [0, 3.6], [30, 3.6], [45, 2.4], [60, 1.6], [90, 2.4], [120, 1.8]];
function lawnAt(b) {
  const u = b >= FROM ? b - 360 : b; // -60 .. 120
  for (let i = 0; i < LAWN.length - 1; i++) {
    const u0 = LAWN[i][0] >= FROM ? LAWN[i][0] - 360 : LAWN[i][0], u1 = LAWN[i + 1][0] >= FROM ? LAWN[i + 1][0] - 360 : LAWN[i + 1][0];
    if (u <= u1) return lerp(LAWN[i][1], LAWN[i + 1][1], clamp((u - u0) / (u1 - u0), 0, 1));
  }
  return LAWN[LAWN.length - 1][1];
}
const bearingOf = (x, z) => ((Math.atan2(x - K.x, -(z - K.z)) * 180) / Math.PI + 360) % 360;
// how much ha-ha there is at a bearing: it runs out over the last 12 degrees at each end
function hahaAmt(b) {
  const u = b >= FROM ? b - 360 : b;
  return smoothstep(-60, -48, u) * (1 - smoothstep(108, 120, u));
}
// the causeway's v4 bank across the ditch
function roadD(x, z) {
  let d = Infinity;
  for (let i = 12; i < 19; i++) {
    const a = CAUSEWAY_V4[i], c = CAUSEWAY_V4[i + 1], ex = c.x - a.x, ez = c.z - a.z, l2 = ex * ex + ez * ez;
    let t = ((x - a.x) * ex + (z - a.z) * ez) / l2; t = clamp(t, 0, 1);
    d = Math.min(d, Math.hypot(x - a.x - ex * t, z - a.z - ez * t));
  }
  return d;
}
// the parterre: a grid of beds north of the keep on the lower lawn, with a round bed in the middle; returns the
// distance (m) to the nearest bed's outline, Infinity off it
const PART = { x0: 24, x1: 56, z0: -44, z1: -32 };
function parterreD(x, z) {
  if (x < PART.x0 - 2 || x > PART.x1 + 2 || z < PART.z0 - 2 || z > PART.z1 + 2) return Infinity;
  const cx = (PART.x0 + PART.x1) / 2, cz = (PART.z0 + PART.z1) / 2;
  // the round bed and the walk round it
  const rc = Math.hypot(x - cx, z - cz);
  let d = Math.min(Math.abs(rc - 4.2), Math.abs(rc - 1.6));
  if (rc < 6.5) return d;
  // two rows of four beds, 7.5 x 5.5, paths 2 m
  const bw = (PART.x1 - PART.x0 - 3 * 2) / 4, bh = (PART.z1 - PART.z0 - 2) / 2;
  for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) {
    const bx0 = PART.x0 + i * (bw + 2), bz0 = PART.z0 + j * (bh + 2);
    const qx = Math.max(bx0 - x, 0, x - bx0 - bw), qz = Math.max(bz0 - z, 0, z - bz0 - bh);
    const outside = Math.hypot(qx, qz), inside = Math.min(x - bx0, bx0 + bw - x, z - bz0, bz0 + bh - z);
    d = Math.min(d, outside > 0 ? outside : inside);
    // a diagonal knot in each bed
    if (outside === 0) { const u = (x - bx0) / bw - 0.5, v = (z - bz0) / bh - 0.5; d = Math.min(d, Math.abs(Math.abs(u) - Math.abs(v)) * Math.min(bw, bh) * 0.7); }
  }
  return d;
}

// ---------------------------------------------------------------- relief
// r from the keep: the lower lawn eased level, the ha-ha (the lawn's edge, a 2 m drop to the ditch floor, a long
// ramp back to the field), and the parterre's ridges. The coarse pass takes the lowest of the profile across a
// mesh cell, so the terrain sits under the skin at the drop.
function hahaProfile(r, b, hNat, x, z) {
  const L = lawnAt(b), ang = hahaAmt(b), amt = ang * smoothstep(4, 7, roadD(x, z));
  const lawn = lerp(hNat, L, smoothstep(58, 68, r) * (1 - smoothstep(HAHA + 0.2, HAHA + 0.6, r)) * ang);
  if (r <= HAHA) return lawn;
  const floor = Math.min(L - 2.1, hNat - 1.0), out = r < HAHA + 9 ? lerp(floor, hNat, smoothstep(HAHA + 2.2, HAHA + 9, r)) : hNat;
  // the drop happens at the wall's face (WALL_R), across 10 cm: the skin draws it there (snapped to the line), the wall faces it
  const k = smoothstep(WALL_R - 0.05, WALL_R + 0.05, r);
  return lerp(lawn, lerp(lawn, out, k), amt);
}
export function height(h, x, z, w, coarse) {
  const dx = x - K.x, dz = z - K.z, r = Math.sqrt(dx * dx + dz * dz);
  if (r < 54 || r > HAHA + 10) return h;
  const b = bearingOf(x, z);
  let y;
  if (coarse && r > HAHA - 3 && r < HAHA + 3.5) {
    const c = coarse * 1.25;
    y = Math.min(hahaProfile(r - c, b, h, x, z), hahaProfile(r, b, h, x, z), hahaProfile(r + c, b, h, x, z));
  } else y = hahaProfile(r, b, h, x, z);
  // parterre ridges (on the lawn; the coarse mesh can carry ridges this broad)
  const pd = parterreD(x, z);
  if (pd < 2) y += 0.36 * (1 - smoothstep(0.2, 1.5, pd)) * (0.85 + 0.15 * N.noise2(x * 0.3, z * 0.3));
  // everything fades with the ha-ha at the annulus's two ends, so the region's own (soft) weight is not needed
  void w;
  return y;
}

// grazed turf: an even green, paler where the beds' ridges dry out, a little darker in the hollows of the tussocks
const cLawn = new THREE.Color('#4f5c2c'), cLawn2 = new THREE.Color('#5d6532'), cRidge = new THREE.Color('#6b6a3a');
export function ground(col, x, z, w) {
  const n = N.fbm2(x * 0.08, z * 0.08, 2) * 0.5 + 0.5, pd = parterreD(x, z);
  _c.copy(cLawn).lerp(cLawn2, n).lerp(cRidge, pd < 1.2 ? (1 - pd / 1.2) * 0.6 : 0);
  col.lerp(_c, smoothstep(0.2, 0.7, w));
}
const _c = new THREE.Color();

export const cover = {
  density: { grass: 1.45, heather: 0, bracken: 0, flowers: 0.35, fleshy: 0, sedge: 0, reeds: 0, trees: 0 },
  scale: { grass: 0.6 },
  tint: { grass: '#6c7c3a' }, tintAmt: 0.5,
};
export const stone = { density: 0.15, tors: false };
export const air = null; // neutral: "the air is still and smells of cut stone"

// ---------------------------------------------------------------- sound: rooks at the keep; the peafowl's cry
let PEAFOWL = [];
function cawInto(ac, filt, rng, out, t0, pitch = 1) {
  // one rook's "kaah": a buzzy pitched noise, a quick fall, a nasal formant
  const dur = 0.22 + rng() * 0.12;
  const o = ac.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(420 * pitch, t0); o.frequency.exponentialRampToValueAtTime(300 * pitch, t0 + dur);
  const am = ac.createOscillator(); am.frequency.value = 62 + rng() * 20; const amg = ac.createGain(); amg.gain.value = 0.5;
  const g = ac.createGain(); g.gain.value = 0.5; am.connect(amg); amg.connect(g.gain);
  const f1 = filt('bandpass', 1250 * pitch, 3), f2 = filt('bandpass', 2300 * pitch, 5);
  const env = ac.createGain(); env.gain.setValueAtTime(0.0001, t0); env.gain.linearRampToValueAtTime(0.16, t0 + 0.025); env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(f1); g.connect(f2); f1.connect(env); f2.connect(env); env.connect(out);
  o.start(t0); o.stop(t0 + dur + 0.02); am.start(t0); am.stop(t0 + dur + 0.02);
}
function peaCry(k, pos, t0) {
  // the peacock's scream: "may-AWE", a rising nasal yelp and a long falling wail, twice or three times
  const { ac, filt, panner, setPos, master, send } = k;
  const rng = k.makeRng(Math.floor(t0 * 1000) % 100000);
  const p = panner('equalpower', 14, 1.0, 400); setPos(p, pos.x, pos.y, pos.z); p.connect(master); send(p, 0.5);
  const n = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < n; i++) {
    const t = t0 + i * (0.95 + rng() * 0.25);
    const o = ac.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(560, t); o.frequency.exponentialRampToValueAtTime(820, t + 0.12);
    o.frequency.setValueAtTime(980, t + 0.16); o.frequency.exponentialRampToValueAtTime(700, t + 0.6);
    const vib = ac.createOscillator(); vib.frequency.value = 7; const vg = ac.createGain(); vg.gain.value = 18; vib.connect(vg); vg.connect(o.frequency);
    const f1 = filt('bandpass', 1500, 4), f2 = filt('bandpass', 2900, 6), f3 = filt('bandpass', 800, 3);
    const env = ac.createGain();
    env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(0.11, t + 0.04); env.gain.linearRampToValueAtTime(0.05, t + 0.14);
    env.gain.linearRampToValueAtTime(0.16, t + 0.2); env.gain.exponentialRampToValueAtTime(0.0001, t + 0.66);
    o.connect(f1); o.connect(f2); o.connect(f3); f1.connect(env); f2.connect(env); f3.connect(env); env.connect(p);
    o.start(t); o.stop(t + 0.7); vib.start(t); vib.stop(t + 0.7);
  }
  setTimeout(() => { try { p.disconnect(); } catch (e) { /* gone */ } }, (t0 - ac.currentTime + n * 1.3 + 1) * 1000);
}
export const sound = {
  start(k) {
    const { ac, master, filt, panner, setPos, send } = k;
    const rng = k.makeRng(10311);
    const top = { x: K.x, y: K.y + 22, z: K.z };
    const pan = panner('equalpower', 25, 1.0, 500); setPos(pan, top.x, top.y, top.z);
    const bus = ac.createGain(); bus.gain.value = 0; bus.connect(pan); pan.connect(master); send(pan, 0.4);
    let next = 2, lvl = 0, wasGutter = false;
    const flick = k.sky?.flicker || { value: 1 };
    return {
      tick(w, x, z, step, t, now) {
        // the rooks are heard round the keep and well beyond the park
        const d = Math.hypot(x - K.x, z - K.z), near = Math.max(w, 1 - smoothstep(60, 170, d));
        lvl += (near - lvl) * 0.2;
        bus.gain.setTargetAtTime(lvl * 0.55, now, 0.5);
        if (lvl > 0.02) {
          next -= step;
          if (next <= 0) {
            // a conversation: a few caws, sometimes answered from another part of the keep
            const t0 = now + k.lead(), n = 1 + Math.floor(rng() * 4), p = 0.9 + rng() * 0.25;
            for (let i = 0; i < n; i++) cawInto(ac, filt, rng, bus, t0 + i * (0.3 + rng() * 0.25), p);
            next = 1.5 + rng() * 6;
          }
        }
        // the peafowl cry at every gutter, from wherever they stand
        const g = flick.value < 0.5;
        if (g && !wasGutter && PEAFOWL.length && Math.hypot(x - 75, z + 15) < 260) {
          PEAFOWL.forEach((b, i) => peaCry(k, { x: b.x, y: b.y + 1.2, z: b.z }, now + k.lead() + 0.15 + i * (0.6 + rng() * 0.8)));
        }
        wasGutter = g;
      },
      cues: { 'demesne-peafowl-cry': (pos) => peaCry(k, pos || { x: 75, y: 6, z: -15 }, ac.currentTime + k.lead()) },
    };
  },
};

// ---------------------------------------------------------------- the build
export async function build(ctx) {
  const { THREE: T, terrain } = ctx;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(10300);
  const R = ctx.regions;
  const meshH = meshGround(terrain);
  const meshes = [];
  const inRing = (x, z, r0, r1) => { const r = Math.hypot(x - K.x, z - K.z); if (r < r0 || r > r1) return false; return hahaAmt(bearingOf(x, z)) > 0.01; };

  // ---- the ha-ha's ground: a skin over the ring where the drop is, so its edge is a clean line
  const edgeN = (x, z) => 0.5 + 0.2 * N.noise2(x * 0.4, z * 0.4) + 0.1 * N.noise2(x * 1.7, z * 1.7);
  const cTurf = new T.Color('#4f5c2c'), cDitch = new T.Color('#3e4626'), cField = new T.Color('#4c5228');
  const skin = buildSkin(ctx, {
    name: KEY, box: [K.x - 98, K.x + 98, K.z - 98, K.z + 72], step: low ? 0.7 : 0.45, lift: 0.02,
    keep: (x, z) => inRing(x, z, HAHA - 4.5, HAHA + 11),
    color: (x, z, y, c) => {
      const r = Math.hypot(x - K.x, z - K.z), n = N.fbm2(x * 0.08, z * 0.08, 2) * 0.5 + 0.5;
      c.copy(cTurf).lerp(cLawn2, n);
      c.lerp(cDitch, smoothstep(HAHA + 0.3, HAHA + 1.5, r) * (1 - smoothstep(HAHA + 4, HAHA + 9, r)));
      c.lerp(cField, smoothstep(HAHA + 6, HAHA + 11, r));
    },
    // y: 1 inside; the skin's inner and outer edges fray into the terrain under it
    attr: (x, z) => { const r = Math.hypot(x - K.x, z - K.z), e = Math.min(r - (HAHA - 4.5), HAHA + 11 - r) / 3; return [0, e / (2 * edgeN(x, z)), 0, 0]; },
    frag: /* glsl */`if (vSkin.y < 0.5) discard;`,
    // the skin's vertices within a grid diagonal of the wall's face sit on it (the lawn's just behind, the ditch's
    // on it), so the drop is a clean line hidden by the face, not a sawtooth of triangles standing out in front
    snap: (x, z, st) => {
      const dx = x - K.x, dz = z - K.z, r = Math.hypot(dx, dz);
      if (Math.abs(r - WALL_R) > st * 1.5 || !wallAt(x, z)) return null;
      const inner = r < WALL_R, pr = inner ? WALL_R - 0.05 : WALL_R, sr = inner ? WALL_R - 0.1 : WALL_R + 0.12;
      return [K.x + (dx / r) * pr, K.z + (dz / r) * pr, K.x + (dx / r) * sr, K.z + (dz / r) * sr];
    },
  });
  meshes.push(skin);

  // ---- the sunk wall: coursed ashlar facing the drop, a flush coping, from the ditch floor to the lawn's edge
  const wall = buildHahaWall(ctx);
  meshes.push(wall);

  // ---- yews: old topiary cones and urns, grown out of their shapes
  const yews = buildYews(ctx, rng, low);
  meshes.push(...yews.meshes);

  // ---- the dressed blocks of the keep's fallen north-east corner, in a fan on bearings 30-60 (structures/keep.js lays the fall's near end, r 27-47)
  const blocks = buildBlocks(ctx, rng, low);
  meshes.push(blocks.mesh);

  // ---- the white peafowl, on the biggest blocks round (75, -15)
  const birds = buildPeafowl(ctx, rng, blocks.perches);
  meshes.push(...birds.meshes);
  ctx.registerUpdate((dt, t) => birds.update(dt, t), { pos: { x: 75, z: -15 }, near: 160, hz: 4 });

  R.stats[KEY] = () => ({ ...meshStats(meshes), creature: birds.count });
  R.creatures = Object.assign(R.creatures || {}, { peafowl: birds.list });
  void meshH;
  ctx.log(`region demesne: skin ${skin.geometry.index.count / 3} tris, ha-ha wall, ${yews.count} yews, ${blocks.count} blocks, ${birds.count} peafowl`);
}

// The ha-ha's wall: a vertical face along r = 85 (+0.25), every half metre round the arc where the ha-ha runs, its
// top flush with the lawn and its foot below the ditch floor; courses and joints drawn from the world position.
// where the sunk wall stands: wherever there is ha-ha to face, away from the road's bank
function wallAt(x, z, amt = hahaAmt(bearingOf(x, z))) { return amt >= 0.02 && roadD(x, z) >= 5; }
function buildHahaWall(ctx) {
  const { THREE: T, terrain } = ctx;
  const P = [], Nn = [], I = [], U = [];
  const rf = WALL_R;
  let prev = -1;
  for (let b = FROM - 1; b <= 360 + TO + 1; b += 0.33) {
    const bb = b % 360, amt = hahaAmt(bb), a = (bb * Math.PI) / 180;
    const x = K.x + Math.sin(a) * rf, z = K.z - Math.cos(a) * rf;
    if (!wallAt(x, z, amt)) { prev = -1; continue; }
    const xi = K.x + Math.sin(a) * (HAHA - 0.6), zi = K.z - Math.cos(a) * (HAHA - 0.6), xo = K.x + Math.sin(a) * (HAHA + 1.2), zo = K.z - Math.cos(a) * (HAHA + 1.2);
    const top = terrain.heightAt(xi, zi) + 0.04, foot = terrain.heightAt(xo, zo) - 0.4;
    const o = P.length / 3, nx = Math.sin(a), nz = -Math.cos(a);
    // face (outward) and coping (up)
    P.push(x, foot, z, x, top, z, K.x + Math.sin(a) * (HAHA - 0.3), top, K.z - Math.cos(a) * (HAHA - 0.3));
    Nn.push(nx, 0, nz, nx, 0.15, nz, 0, 1, 0);
    U.push(0, 0, 0);
    if (prev >= 0) I.push(prev, o, prev + 1, o, o + 1, prev + 1, prev + 1, o + 1, prev + 2, o + 1, o + 2, prev + 2);
    prev = o;
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(P, 3));
  geo.setAttribute('normal', new T.Float32BufferAttribute(Nn, 3));
  geo.setIndex(I); geo.computeBoundingSphere();
  const mat = ashlar(T, '#7a7268', 0.35, 0.8);
  const mesh = new T.Mesh(geo, mat);
  mesh.name = 'demesne-haha-wall'; mesh.castShadow = false; mesh.receiveShadow = true;
  ctx.scene.add(mesh);
  return mesh;
}
// Coursed ashlar in the fragment from the world position: courses `course` m, blocks `len` m, sunk joints, weathered
// tone per block, lichen low down.
function ashlar(T, hex, course, len) {
  const mat = new T.MeshStandardMaterial({ color: new T.Color(hex), roughness: 0.92, side: T.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vAP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvAP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vAP;
      float aH(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float fw = length(fwidth(vAP));
          float along = (vAP.x + vAP.z) * 0.7071 + 0.0;
          float row = floor(vAP.y / ${course.toFixed(2)});
          float u = along / ${len.toFixed(2)} + row * 0.5;
          float jx = abs(fract(u) - 0.5), jy = abs(fract(vAP.y / ${course.toFixed(2)}) - 0.5);
          float joint = max(smoothstep(0.46, 0.49, jx), smoothstep(0.42, 0.48, jy)) * (1.0 - smoothstep(0.02, 0.08, fw));
          float tone = 0.8 + 0.35 * aH(vec2(floor(u), row));
          diffuseColor.rgb *= tone * (1.0 - 0.6 * joint);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.24, 0.3, 0.16), 0.35 * smoothstep(0.6, 0.9, aH(vec2(floor(u * 3.0), row * 7.0))) );
        }`);
  };
  return mat;
}

// Yews: lathe shapes (a cone, an urn on a stem) pushed about by noise so the clipped lines have grown out; near-black
// green, a few rusty dead patches. Two instanced meshes; each casts a shadow and blocks the way.
function buildYews(ctx, rng, low) {
  const { THREE: T, terrain } = ctx;
  const lathe = (profile, seg, seed) => {
    const pts = profile.map(([r, y]) => new T.Vector2(r, y));
    const g = new T.LatheGeometry(pts, seg);
    const p = g.attributes.position, col = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
      const k = 1 + 0.22 * N.noise2(Math.cos(a) * 1.6 + seed, y * 0.9 + Math.sin(a) * 1.6) + 0.1 * N.noise2(a * 3 + seed, y * 2.5);
      p.setXYZ(i, x * k, y + 0.12 * N.noise2(a * 2 + seed, y), z * k);
      const dead = smoothstep(0.55, 0.7, N.noise2(a * 1.3 + seed * 3, y * 0.7)) * 0.8;
      const sh = 0.75 + 0.35 * clamp(y / 4, 0, 1);
      col.push(lerp(0.08, 0.32, dead) * sh, lerp(0.14, 0.18, dead) * sh, lerp(0.07, 0.08, dead) * sh);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  };
  const cone = lathe([[0.01, 0], [0.45, 0], [0.45, 0.5], [1.5, 0.7], [1.35, 1.8], [1.0, 2.9], [0.55, 3.8], [0.15, 4.5], [0.01, 4.7]], low ? 10 : 14, 3.1);
  const urn = lathe([[0.01, 0], [0.9, 0], [1.0, 0.6], [0.7, 0.9], [0.4, 1.3], [0.45, 1.7], [1.3, 2.2], [1.45, 2.9], [1.1, 3.5], [0.4, 3.75], [0.55, 4.1], [0.3, 4.5], [0.01, 4.6]], low ? 10 : 14, 7.7);
  const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  // along the old walks: two rows framing the parterre, a ring round the keep's north and east side
  const cones = [], urns = [];
  const add = (x, z, kind) => {
    if (Math.hypot(x - K.x, z - K.z) > HAHA - 3 || roadD(x, z) < 5) return;
    const it = { x, y: terrain.heightAt(x, z) - 0.15, z, s: 0.85 + rng() * 0.35, ry: rng() * 6.28, rx: (rng() - 0.5) * 0.12, rz: (rng() - 0.5) * 0.12 };
    (kind ? urns : cones).push(it);
    ctx.addCollider({ x, z, r: 1.15 * it.s });
  };
  for (let i = 0; i <= 5; i++) { const x = PART.x0 - 1 + i * ((PART.x1 - PART.x0 + 2) / 5); add(x, PART.z0 - 3.5, i % 2); add(x, PART.z1 + 3, (i + 1) % 2); }
  for (let b = 312; b < 360 + 112; b += 14) {
    const bb = b % 360; if (bb > 340 || bb < 20) continue; // the parterre's own rows
    const a = (bb * Math.PI) / 180, r = 62 + (rng() - 0.5) * 3;
    add(K.x + Math.sin(a) * r, K.z - Math.cos(a) * r, rng() < 0.4);
  }
  const meshes = [instanced(ctx, cone, mat, cones, { name: 'demesne-yew-cones', shadow: true }), instanced(ctx, urn, mat, urns, { name: 'demesne-yew-urns', shadow: true })];
  return { meshes, count: cones.length + urns.length };
}

// Dressed blocks fallen from the curtain tower: squared ashlar, chamfered, lying askew, half sunk, in a fan.
function buildBlocks(ctx, rng, low) {
  const { THREE: T, terrain } = ctx;
  const g = new T.BoxGeometry(1, 1, 1, 1, 1, 1);
  { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.93 + 0.07 * Math.abs(Math.sin(i * 1.9)); p.setXYZ(i, p.getX(i) * k, p.getY(i), p.getZ(i) * k); } g.computeVertexNormals(); }
  const mat = ashlar(T, '#8a8072', 0.5, 1.0);
  mat.side = T.FrontSide;
  const list = [], perches = [];
  for (let k = 0; k < 600 && list.length < (low ? 34 : 52); k++) {
    const b = 30 + rng() * 30, r = 46 + Math.pow(rng(), 0.8) * 36, a = (b * Math.PI) / 180;
    const x = K.x + Math.sin(a) * r, z = K.z - Math.cos(a) * r;
    if (list.some((o) => Math.hypot(o.x - x, o.z - z) < 2.4) || roadD(x, z) < 5) continue;
    const big = rng() < 0.3 || (Math.hypot(x - 75, z + 15) < 12 && rng() < 0.7);
    const sx = big ? 1.4 + rng() * 0.9 : 0.6 + rng() * 0.6, sy = big ? 0.8 + rng() * 0.6 : 0.45 + rng() * 0.3, sz = big ? 1.0 + rng() * 0.7 : 0.5 + rng() * 0.5;
    const y = terrain.heightAt(x, z) + sy * 0.32;
    const it = { x, y, z, sx, sy, sz, ry: rng() * 6.28, rx: (rng() - 0.5) * 0.25, rz: (rng() - 0.5) * 0.3 };
    list.push(it);
    if (big) { ctx.addCollider({ x, z, r: Math.max(sx, sz) * 0.55, y: y - 1, h: sy * 0.5 + 1 }); perches.push(it); }
  }
  const mesh = instanced(ctx, g, mat, list, { name: 'demesne-blocks', shadow: true });
  return { mesh, perches, count: list.length };
}

// The white peafowl: moulted, a ragged white train with a few last eyed feathers. Each stands on a fallen block,
// turning its head; at every gutter it lifts its neck and cries (the cry is in the sound hook) and half raises its
// train. Built facing +z; the body and the train are two instanced meshes.
function buildPeafowl(ctx, rng, perches) {
  const { THREE: T } = ctx;
  const P = [], C = [], I = [];
  const W = [0.88, 0.87, 0.84], W2 = [0.74, 0.73, 0.7], BLK = [0.06, 0.06, 0.07], BEAK = [0.5, 0.42, 0.34];
  const ell = (cx, cy, cz, rx, ry, rz, col, seg = 8) => {
    const o = P.length / 3;
    for (let j = 0; j <= 5; j++) for (let i = 0; i < seg; i++) { const v = (j / 5) * Math.PI, u = (i / seg) * 6.283; P.push(cx + Math.cos(u) * Math.sin(v) * rx, cy + Math.cos(v) * ry, cz + Math.sin(u) * Math.sin(v) * rz); C.push(...col); }
    for (let j = 0; j < 5; j++) for (let i = 0; i < seg; i++) { const a = o + j * seg + i, b = o + j * seg + ((i + 1) % seg); I.push(a, a + seg, b, b, a + seg, b + seg); }
  };
  ell(0, 0.6, -0.02, 0.13, 0.14, 0.3, W);             // body, long and low
  ell(0, 0.62, -0.28, 0.1, 0.07, 0.12, W2, 7);         // the rump, where the train springs
  ell(0, 0.76, 0.22, 0.045, 0.12, 0.05, W, 7);         // lower neck, leaning forward
  ell(0, 0.92, 0.29, 0.035, 0.1, 0.04, W, 7);          // upper neck
  ell(0, 1.03, 0.33, 0.042, 0.04, 0.058, W, 7);        // head
  ell(0, 1.02, 0.4, 0.01, 0.01, 0.032, BEAK, 5);       // bill
  for (let i = -1; i <= 1; i++) ell(i * 0.014, 1.12, 0.32 - Math.abs(i) * 0.01, 0.005, 0.05, 0.005, W2, 4); // the crest's fan
  for (const sd of [-1, 1]) ell(sd * 0.06, 0.25, 0.02, 0.012, 0.25, 0.012, [0.45, 0.4, 0.38], 5); // legs
  ell(0.025, 1.05, 0.37, 0.007, 0.007, 0.007, BLK, 4); ell(-0.025, 1.05, 0.37, 0.007, 0.007, 0.007, BLK, 4); // eyes
  const bodyGeo = new T.BufferGeometry();
  bodyGeo.setAttribute('position', new T.Float32BufferAttribute(P, 3)); bodyGeo.setAttribute('color', new T.Float32BufferAttribute(C, 3));
  bodyGeo.setIndex(I); bodyGeo.computeVertexNormals();
  // the train: long ragged feathers fanning back from the rump, pivot at the rump (origin); most plain white and
  // gapped, three or four still carrying an eye
  const tP = [], tC = [], tI = [];
  const n = 15;
  for (let i = 0; i < n; i++) {
    if (i % 4 === 2) continue; // moulted gaps
    const a = (i / (n - 1) - 0.5) * 1.1, len = 1.1 + 0.35 * Math.cos(a * 2) - (i % 3) * 0.12, w = 0.05;
    const dx = Math.sin(a), dz = -Math.cos(a), px = -dz * w, pz = dx * w;
    const eyed = i === 4 || i === 8 || i === 13;
    const o = tP.length / 3;
    tP.push(px * 0.2, 0, pz * 0.2, -px * 0.2, 0, -pz * 0.2, dx * len - px, 0, dz * len - pz, dx * len + px, 0, dz * len + pz);
    tC.push(...W, ...W, ...W2, ...W2);
    tI.push(o, o + 2, o + 1, o + 1, o + 2, o + 3);
    if (eyed) { // the eye: a dark disc with a bronze ring, near the tip
      const ex = dx * (len - 0.07), ez = dz * (len - 0.07), r = 0.05;
      const e0 = tP.length / 3; tP.push(ex, 0.004, ez); tC.push(0.05, 0.08, 0.2);
      for (let k = 0; k < 8; k++) { const t = (k / 8) * 6.283; tP.push(ex + Math.cos(t) * r, 0.004, ez + Math.sin(t) * r * 1.3); tC.push(...(k % 2 ? [0.42, 0.3, 0.1] : [0.08, 0.32, 0.3])); }
      for (let k = 0; k < 8; k++) tI.push(e0, e0 + 1 + k, e0 + 1 + ((k + 1) % 8));
    }
  }
  const trainGeo = new T.BufferGeometry();
  trainGeo.setAttribute('position', new T.Float32BufferAttribute(tP, 3)); trainGeo.setAttribute('color', new T.Float32BufferAttribute(tC, 3));
  trainGeo.setIndex(tI); trainGeo.computeVertexNormals();
  const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: T.DoubleSide });
  // perches: the biggest blocks nearest (75, -15)
  const ps = perches.slice().sort((a, b) => Math.hypot(a.x - 75, a.z + 15) - Math.hypot(b.x - 75, b.z + 15)).slice(0, 3);
  const list = ps.map((b) => ({ x: b.x, y: b.y + b.sy * 0.5, z: b.z, yaw: rng() * 6.28, look: 0, next: 1 + rng() * 3, cry: 0, ph: rng() * 6 }));
  PEAFOWL = list;
  const body = new T.InstancedMesh(bodyGeo, mat, Math.max(1, list.length));
  const train = new T.InstancedMesh(trainGeo, mat, Math.max(1, list.length));
  body.name = 'demesne-peafowl'; train.name = 'demesne-peafowl-trains';
  for (const m of [body, train]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; ctx.scene.add(m); }
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), one = new T.Vector3(1, 1, 1), off = new T.Vector3();
  const flick = ctx.sky?.flicker || { value: 1 };
  let wasG = false;
  function update(dt, t) {
    dt = Math.min(dt, 0.3);
    const g = flick.value < 0.5;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (g && !wasG) b.cry = 2.6 + i * 0.7;
      b.cry = Math.max(0, b.cry - dt);
      b.next -= dt;
      if (b.next <= 0) { b.look = (rng() - 0.5) * 1.6; b.next = 1.5 + rng() * 4; }
      b.yaw += (b.look * 0.25) * dt;
      b.cs = (b.cs || 0) + ((b.cry > 0.3 ? 1 : 0) - (b.cs || 0)) * Math.min(1, dt * 6);
      const cr = b.cs; // up while crying
      // the body: a slight bob, the head raised (whole bird pitches back a little) while it cries
      e.set(-0.18 * cr + 0.03 * Math.sin(t * 1.3 + b.ph), b.yaw + 0.25 * Math.sin(t * 0.5 + b.ph) * (1 - cr), 0, 'YXZ'); q.setFromEuler(e);
      p.set(b.x, b.y, b.z);
      body.setMatrixAt(i, m4.compose(p, q, one));
      // the train: trailing behind, half raised and spread at the cry
      e.set(-0.25 + 1.15 * cr, b.yaw, 0, 'YXZ'); q.setFromEuler(e);
      off.set(0, 0.62, -0.34).applyQuaternion(_q.setFromEuler(_e.set(0, b.yaw, 0)));
      p.set(b.x + off.x, b.y + off.y, b.z + off.z);
      train.setMatrixAt(i, m4.compose(p, q, _s.set(1 + 0.4 * cr, 1, 1 - 0.15 * cr)));
    }
    wasG = g;
    body.instanceMatrix.needsUpdate = true; train.instanceMatrix.needsUpdate = true;
  }
  update(0, 0);
  return { meshes: [body, train], update, count: list.length, list };
}
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3();
