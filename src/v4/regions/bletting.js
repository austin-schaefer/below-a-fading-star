// BO The Bletting [Proposed] (plans/wilderness-v5.md; shape and site in plans/wilderness-v4-placement.md section 2, REGIONS.bletting
// in world.js). "The orchard country round Medlar Close, spread out past its wall: old medlars and quinces gone to
// thicket, windfalls browning in the grass, a hedge-line of blackthorn running between broken field walls of
// honey-coloured stone laid without mortar. The ground is long rank grass with knapweed and the dull purple of
// self-heal; the air is sweet and slightly rotten, full of drowsy wasps, and the sound is fruit dropping. The
// boundary is the blackthorn hedge itself, gapped where paths come through. Only here: the pomace snails,
// fist-sized, their shells a worn gilt lacquer, grazing the windfalls and leaving trails that catch the red light
// like thread."
// The trees (medlars and quinces past the close, the blackthorn hedge) are planted by vegetation/trees.js from this
// module's cover.trees, so they batch with the rest; the windfalls, walls, wasps and snails are built here.
import * as THREE from 'three';
import { REGIONS, LANDMARKS, CAUSEWAY_V4 } from '../../world.js';
import { makeSimplex, smoothstep, lerp, hyp } from '../../noise.js';
import { groundOf, instanced, stoneMaterial, airMotes, meshStats, compose, vegetationTrees } from './common.js';

const KEY = 'bletting';
const R = REGIONS.bletting, CI = R.shape.circle, ZMIN = R.clip.zMin;
const O = LANDMARKS.orchard; // Medlar Close
const SN = makeSimplex(5511);
const HEDGE_R = CI.r - 3, HEDGE_N = ZMIN + 3; // the hedge stands just inside the region's edge, and along its northern clip
// gaps where paths come through (placement plan section 4: P7 at the Plinth Road's foot, P8 toward the Hypogeum,
// P9 and the causeway from (80, -8), the Leerie's kerb K1)
// [x, z, r]: r the wall's gap (6 m unless given; the hedge's is 4.5). v8-09: Medlar Close's wicket (strata/place.js),
// where P8 comes through the close's circuit, a gate's width
const GAPS = [[130, -150], [212, -121], [82, -6], [123, 5], [178.7, -115.05, 1.2]];

function hedgeDist(x, z) {
  const r = hyp(x - CI.x, z - CI.z);
  let d = Math.abs(r - HEDGE_R);
  if (z < ZMIN + 12) d = Math.min(d, Math.abs(z - HEDGE_N) + Math.max(0, r - HEDGE_R));
  return d;
}

// a low bank under the hedge, and nothing else: the orchard ground keeps the moor's lie (and Medlar Close its terraces)
export function height(h, x, z, w) {
  const d = hedgeDist(x, z);
  if (d > 4) return h;
  return h + 0.55 * Math.exp(-((d / 1.3) ** 2)) * Math.min(1, w * 2);
}

const C = (h) => new THREE.Color(h);
const cRank = C('#4c6a2a'), cWind = C('#4a3a24'), cHeal = C('#4e4250');
const _gc = new THREE.Color();
export function ground(col, x, z, w) {
  const n = SN.fbm2(x * 0.04, z * 0.04, 3) * 0.5 + 0.5;
  _gc.copy(cRank).lerp(cHeal, smoothstep(0.6, 0.78, SN.fbm2(x * 0.09 + 7, z * 0.09, 2) * 0.5 + 0.5) * 0.45);
  _gc.lerp(cWind, (1 - smoothstep(30, 52, hyp(x - O.x, z - O.z))) * smoothstep(0.45, 0.7, n) * 0.5); // the close's floor, browned by the fall of fruit
  col.lerp(_gc, w * 0.8);
}

// the trees this region plants: medlars and quinces gone to thicket past the close's wall, and the blackthorn hedge
function plantTrees(ground, rng, regionAt) {
  const out = [];
  const inside = (x, z) => hyp(x - CI.x, z - CI.z) < HEDGE_R - 5 && z > HEDGE_N + 5;
  const clear = (x, z) => hyp(x - LANDMARKS.taverna.x, z - LANDMARKS.taverna.z) > 24 && hyp(x - LANDMARKS.graveyard.x, z - LANDMARKS.graveyard.z) > 16 && hyp(x - LANDMARKS.hypogeum.x, z - LANDMARKS.hypogeum.z) > 16;
  // the old rows, carried on past the wall and mostly gone
  const sp = 8.5, rot = 0.32;
  for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) {
    const lx = i * sp + (rng() - 0.5) * 2.4, lz = j * sp * 0.9 + (rng() - 0.5) * 2.4;
    const x = O.x + lx * Math.cos(rot) - lz * Math.sin(rot), z = O.z + lx * Math.sin(rot) + lz * Math.cos(rot);
    const r = hyp(x - O.x, z - O.z);
    if (r < O.r + 3 || !inside(x, z) || !clear(x, z) || rng() > 0.3) continue;
    out.push({ x, z, kind: rng() < 0.15 ? 'dead' : 'medlar', s: 0.8 + rng() * 0.35, gap: 5 });
  }
  // thickets: the rows' suckers grown up into knots of medlar and quince with thorn among them
  for (let k = 0, n = 0; k < 400 && n < 13; k++) {
    const a = rng() * 6.283, r = O.r + 8 + rng() * 34, cx = O.x + Math.cos(a) * r, cz = O.z + Math.sin(a) * r;
    if (!inside(cx, cz) || !clear(cx, cz)) continue;
    n++;
    for (let i = 0; i < 6; i++) {
      const x = cx + (rng() - 0.5) * 11, z = cz + (rng() - 0.5) * 11;
      if (!inside(x, z) || !clear(x, z)) continue;
      out.push(rng() < 0.65 ? { x, z, kind: 'medlar', s: 0.6 + rng() * 0.4, gap: 3 } : { x, z, kind: 'thorn', s: 0.7 + rng() * 0.4, gap: 2 });
    }
  }
  // the hedge, gapped where the paths and the causeway come through, and where the Demesne or the High Ling take over
  const W = {};
  const hedgeAt = (x, z) => {
    if (GAPS.some(([gx, gz, r]) => hyp(x - gx, z - gz) < Math.min(4.5, r ?? 4.5))) return;
    for (let i = 0; i < CAUSEWAY_V4.length - 1; i++) {
      const a = CAUSEWAY_V4[i], b = CAUSEWAY_V4[i + 1], ex = b.x - a.x, ez = b.z - a.z, l2 = ex * ex + ez * ez;
      const t = Math.max(0, Math.min(1, ((x - a.x) * ex + (z - a.z) * ez) / l2));
      if (hyp(x - a.x - ex * t, z - a.z - ez * t) < 6) return;
    }
    if (regionAt) { const w = regionAt(x, z, W); if (w.demesne > 0.25 || w.highLing > 0.25) return; }
    if (!clear(x, z)) return;
    out.push({ x: x + (rng() - 0.5) * 0.8, z: z + (rng() - 0.5) * 0.8, kind: 'thorn', s: 0.75 + rng() * 0.45, gap: 1.6, rot: rng() * 6.28 });
  };
  const zc = (HEDGE_N - CI.z) / HEDGE_R, a0 = Math.asin(Math.max(-1, zc)); // where the circle meets the northern line
  const arc = (Math.PI - 2 * a0);
  for (let s = 0, n = Math.floor((2 * Math.PI - arc) * HEDGE_R / 2.4); s < n; s++) {
    const a = Math.PI - a0 + (s / n) * (2 * Math.PI - arc);
    hedgeAt(CI.x + Math.cos(a) * HEDGE_R, CI.z - Math.sin(a) * HEDGE_R);
  }
  const xh = Math.sqrt(Math.max(0, HEDGE_R * HEDGE_R - (HEDGE_N - CI.z) ** 2));
  for (let x = CI.x - xh; x <= CI.x + xh; x += 2.4) hedgeAt(x, HEDGE_N);
  return out;
}

// rank grass, long and rough; knapweed and self-heal in it; little heather or bracken; the moor's copses give way
export const cover = {
  density: { grass: 1.3, heather: 0.15, bracken: 0.35, flowers: 2.6, fleshy: 1.2, trees: 0 },
  scale: { grass: 1.9, heather: 0.8 }, // v8-02: rank, over the head where it stands thickest (plants.js's rank patches)
  floor: { flowers: 0.6 },
  tint: { grass: '#6e9a3a', flowers: '#b03a6a', bracken: '#6a6a2a' }, tintAmt: 0.85,
  trees: plantTrees,
};
export const stone = { density: 0.45, tors: false };
export const air = { tint: '#ecb45c', strength: 1 }; // "amber wasp-haze" (DI)

// ---------------------------------------------------------------- sound: fruit dropping, and a drowsy buzz
const DROPS = []; // tree spots for the falls (filled at build)
export const sound = {
  start(k) {
    const { ac, panner, setPos, filt, gainOf, chain, white, brown, pink, camera, loopSrc } = k;
    const rng = k.makeRng(5101);
    const bus = gainOf(0); bus.connect(k.master); k.send(bus, 0.35);
    const pl = k.placed({ ref: 4, roll: 1.1, range: 80, air: 60, dest: bus }), pan = pl.in; // a windfall's place, with the air between
    // the buzz: a few wasps drifting round you, pitch wandering
    const buzz = gainOf(0); buzz.connect(k.master);
    const bpan = panner('equalpower', 1.5, 1.4, 25); bpan.connect(buzz);
    const osc = ac.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 170;
    const fm = ac.createOscillator(); fm.frequency.value = 7; const fmg = gainOf(14); fm.connect(fmg); fmg.connect(osc.frequency);
    chain(osc, filt('bandpass', 520, 1.6), gainOf(0.025), bpan); osc.start(); fm.start();
    let wob = 0, cx = 0, cz = 0, cw = 0, now0 = 0;
    function drop(x, z, at) {
      // the nearest tree spot round you, or a guess in the grass
      let px = x + (rng() - 0.5) * 30, pz = z + (rng() - 0.5) * 30;
      for (let i = 0; i < 6 && DROPS.length; i++) { const d = DROPS[(rng() * DROPS.length) | 0]; if (hyp(d[0] - x, d[1] - z) < 28) { px = d[0]; pz = d[1]; break; } }
      pl.at(px, camera.position.y, pz);
      // a rustle through the leaves on its way down, then a soft thud in long grass
      const fallT = 0.18 + rng() * 0.3;
      for (let i = 0; i < 3 + (rng() * 3 | 0); i++) {
        const tt = at + i * (fallT / 4) + rng() * 0.03, g = gainOf(0); k.env(g, tt, 0.035, 0.004, 0.05 + rng() * 0.05);
        const s = ac.createBufferSource(); s.buffer = white; s.start(tt, rng() * 2, 0.12); chain(s, filt('bandpass', 2000 + rng() * 1800, 1.5), g, pan);
      }
      const tt = at + fallT, o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(130 + rng() * 60, tt); o.frequency.exponentialRampToValueAtTime(70, tt + 0.09);
      const og = gainOf(0); k.env(og, tt, 0.18, 0.003, 0.11); o.connect(og); og.connect(pan); o.start(tt); o.stop(tt + 0.2);
      const s = ac.createBufferSource(); s.buffer = brown; s.start(tt, rng() * 5, 0.15); const sg = gainOf(0); k.env(sg, tt, 0.25, 0.002, 0.07); chain(s, filt('lowpass', 500), sg, pan);
      const s2 = ac.createBufferSource(); s2.buffer = pink; s2.start(tt, rng() * 3, 0.15); const sg2 = gainOf(0); k.env(sg2, tt, 0.04, 0.005, 0.1); chain(s2, filt('bandpass', 1800, 0.8), sg2, pan);
    }
    // windfalls come in ones and twos, a few seconds apart, then a while with none
    const drops = k.caller(rng, { bout: [1, 3], gap: [1.5, 4], rest: [10, 0.7, 3, 60], first: [1, 5], when: () => cw > 0.1 },
      () => drop(cx, cz, now0 + k.lead() + 0.02));
    return {
      tick(w, x, z, step, t, now) {
        bus.gain.setTargetAtTime(w > 0.02 ? w : 0, now, 0.5);
        const nearClose = 1 - smoothstep(30, 70, hyp(x - O.x, z - O.z));
        wob += step;
        const a = t * 0.7, r = 1.2 + Math.sin(t * 0.37) * 0.8;
        setPos(bpan, x + Math.cos(a) * r, camera.position.y - 0.6 + Math.sin(t * 1.3) * 0.3, z + Math.sin(a * 1.3) * r);
        osc.frequency.setTargetAtTime(160 + 40 * Math.sin(t * 0.9) + 20 * Math.sin(t * 2.7), now, 0.2);
        buzz.gain.setTargetAtTime(w * nearClose * (0.5 + 0.5 * Math.max(0, Math.sin(t * 0.21))) * (k.sky?.flicker?.value ?? 1), now, 0.6);
        cx = x; cz = z; cw = w; now0 = now;
        drops.tick(step);
      },
    };
  },
};

// ---------------------------------------------------------------- windfalls, walls, wasps, snails
export async function build(ctx) {
  const { scene, terrain, regions } = ctx;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(5100);
  const G = groundOf(terrain);
  const W = {};
  const inRegion = (x, z, min = 0.5) => regions.regionAt(x, z, W).bletting >= min;
  const meshes = [];

  // the trees round here: Medlar Close's own (vegetation) and the ones this region planted
  const vt = ((await vegetationTrees()) || []).filter((t) => (t.kind === 'orchard' || t.kind === 'region') && inRegion(t.x, t.z, 0.3));
  const spots = vt.length ? vt.map((t) => [t.x, t.z, t.s]) : plantTrees(null, ctx.makeRng(5100 + 1), regions.regionAt).filter((t) => t.kind === 'medlar').map((t) => [t.x, t.z, t.s]);
  for (const s of spots) DROPS.push(s);

  // windfalls: medlars brown and soft, a few quinces gone from gold to rot, under every tree and drifting downhill
  const fruitGeo = new THREE.IcosahedronGeometry(1, 0);
  { const p = fruitGeo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * 0.82); fruitGeo.computeVertexNormals(); }
  const fruitMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55 });
  const fruit = [];
  const perTree = low ? 4 : 8;
  for (const [tx, tz, ts] of spots) {
    for (let i = 0; i < perTree; i++) {
      const a = rng() * 6.283, r = Math.sqrt(rng()) * 2.8 * (ts || 1), x = tx + Math.cos(a) * r, z = tz + Math.sin(a) * r;
      const quince = rng() < 0.18, rot = rng();
      const s = quince ? 0.045 + rng() * 0.02 : 0.025 + rng() * 0.012;
      const c = quince ? new THREE.Color().setRGB(lerp(0.55, 0.16, rot), lerp(0.4, 0.09, rot), lerp(0.06, 0.03, rot)) : new THREE.Color().setRGB(0.12 + rot * 0.05, 0.06 + rot * 0.02, 0.025);
      fruit.push({ x, y: G.heightAt(x, z) + s * 0.5, z, sx: s, sy: s * (quince ? 1.15 : 0.9), sz: s, ry: rng() * 6.28, rx: (rng() - 0.5) * 0.6, c });
    }
  }
  const fruitMesh = instanced(fruitGeo, fruitMat, fruit, { name: 'bletting-windfalls', colors: true });
  scene.add(fruitMesh); meshes.push(fruitMesh);

  // broken field walls of honey-coloured stone, laid dry: fragments of the close's old circuit, and field walls
  // running out from it toward the hedge, gapped and tumbled
  const blockGeo = new THREE.BoxGeometry(1, 1, 1);
  const wallMat = stoneMaterial({ color: '#ffffff', rough: 0.92, strata: 0.1, grain: 1.1, warm: [0.62, 0.42, 0.2],
    lichen: [{ color: [0.62, 0.6, 0.38], scale: 1.6, cover: 0.3, up: 0.8, rim: 0.2 }, { color: [0.7, 0.38, 0.12], scale: 3.1, cover: 0.18, up: 0.4, rim: 0 }] });
  const blocks = [];
  const runs = [];
  const circR = O.r + 2;
  for (let k = 0; k < 7; k++) { // the circuit, in pieces
    const a0 = k * 0.9 + rng() * 0.5, len = 0.18 + rng() * 0.22, pts = [];
    for (let s = 0; s <= 10; s++) { const a = a0 + (s / 10) * len; pts.push([O.x + Math.cos(a) * circR, O.z + Math.sin(a) * circR]); }
    runs.push(pts);
  }
  for (const ang of [0.45, 2.2, 3.6, 5.3]) { // field walls running out toward the hedge
    const pts = [], a = ang + (rng() - 0.5) * 0.3;
    for (let s = 0; s <= 10; s++) { const r = circR + 4 + s * 3.4; pts.push([O.x + Math.cos(a + s * 0.012) * r, O.z + Math.sin(a + s * 0.012) * r]); }
    runs.push(pts);
  }
  const taverna = LANDMARKS.taverna, yard = LANDMARKS.graveyard;
  const okWall = (x, z) => inRegion(x, z, 0.7) && hyp(x - taverna.x, z - taverna.z) > 22 && hyp(x - yard.x, z - yard.z) > 14 && terrain.causewayDistance(x, z) > 5 && !GAPS.some(([gx, gz, r]) => hyp(x - gx, z - gz) < (r ?? 6));
  let wallLen = 0;
  for (const pts of runs) {
    // walk the run a metre at a time; the wall's height wanders and falls to nothing at the breaks
    let along = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = hyp(bx - ax, bz - az), yaw = Math.atan2(-(bz - az), bx - ax);
      for (let s = 0; s < L; s += 0.55) {
        const x = ax + (bx - ax) * (s / L), z = az + (bz - az) * (s / L);
        along += 0.55;
        if (!okWall(x, z)) continue;
        const hN = SN.fbm2(x * 0.05 + 3, z * 0.05, 3) * 0.5 + 0.5;
        const courses = Math.round(smoothstep(0.28, 0.6, hN) * 5 + (rng() < 0.1 ? -1 : 0));
        const y0 = G.heightAt(x, z) - 0.06;
        for (let c = 0; c < courses; c++) {
          const sh = 0.2 + rng() * 0.1, sw = 0.45 + rng() * 0.25;
          blocks.push({ x: x + (rng() - 0.5) * 0.06, y: y0 + c * 0.25 + sh * 0.5, z: z + (rng() - 0.5) * 0.06, sx: sw, sy: sh, sz: 0.5 - c * 0.05 + rng() * 0.08, ry: yaw + (rng() - 0.5) * 0.12, rx: (rng() - 0.5) * 0.08, rz: (rng() - 0.5) * 0.1, c: new THREE.Color().setHSL(0.09 + rng() * 0.03, 0.4 + rng() * 0.15, 0.16 + rng() * 0.06) });
        }
        if (courses >= 3 && rng() < 0.55) // a coping stone set on edge
          blocks.push({ x, y: y0 + courses * 0.25 + 0.12, z, sx: 0.14 + rng() * 0.06, sy: 0.26 + rng() * 0.08, sz: 0.42, ry: yaw, rz: (rng() - 0.5) * 0.4, c: new THREE.Color().setHSL(0.09, 0.35, 0.15 + rng() * 0.04) });
        if (courses < 2 && rng() < 0.6) for (let t = 0; t < 2; t++) { // tumbled stones at the breaks
          const ox = (rng() - 0.5) * 2.2, oz = (rng() - 0.5) * 2.2;
          blocks.push({ x: x + ox, y: G.heightAt(x + ox, z + oz) + 0.06, z: z + oz, sx: 0.4 + rng() * 0.2, sy: 0.18 + rng() * 0.08, sz: 0.3 + rng() * 0.2, ry: rng() * 6.28, rx: (rng() - 0.5) * 0.5, rz: (rng() - 0.5) * 0.5, c: new THREE.Color().setHSL(0.09, 0.35, 0.14 + rng() * 0.05) });
        }
        if (courses >= 2 && Math.round(along / 0.55) % 2 === 0) ctx.addCollider({ x, z, r: 0.5, y: y0 - 0.5, h: courses * 0.25 + 0.6 });
        wallLen += 0.55;
      }
    }
  }
  const wallMesh = instanced(blockGeo, wallMat, blocks, { name: 'bletting-walls', shadow: true, colors: true });
  scene.add(wallMesh); meshes.push(wallMesh);

  // drowsy wasps over the windfalls: slow loops, settling and lifting; drawn only near you
  const NW = low ? 24 : 48;
  const waspGeo = (() => {
    const g = new THREE.BufferGeometry();
    // body (a stretched diamond) and two wing flakes
    const P = [0, 0, 0.012, 0.004, 0, 0, 0, 0.004, 0, -0.004, 0, 0, 0, 0, -0.012, 0, -0.003, 0,
      0, 0.003, 0.002, 0.012, 0.004, -0.002, 0.004, 0.003, -0.004, 0, 0.003, 0.002, -0.012, 0.004, -0.002, -0.004, 0.003, -0.004];
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setIndex([0, 1, 2, 0, 2, 3, 4, 2, 1, 4, 3, 2, 0, 5, 1, 0, 3, 5, 4, 1, 5, 4, 5, 3, 6, 7, 8, 9, 11, 10]);
    g.computeVertexNormals();
    const c = new Float32Array(12 * 3);
    for (let i = 0; i < 12; i++) { const wing = i >= 6; c[i * 3] = wing ? 0.7 : 0.55; c[i * 3 + 1] = wing ? 0.7 : 0.38; c[i * 3 + 2] = wing ? 0.75 : 0.05; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  })();
  const waspMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, side: THREE.DoubleSide });
  const waspMesh = new THREE.InstancedMesh(waspGeo, waspMat, NW);
  waspMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); waspMesh.frustumCulled = false; waspMesh.name = 'bletting-wasps';
  scene.add(waspMesh); meshes.push(waspMesh);
  const wasps = Array.from({ length: NW }, () => ({ hx: 0, hz: 0, hy: 0, ph: rng() * 6.28, r: 0.4 + rng() * 1.2, sp: 0.4 + rng() * 0.6, k: 0 }));
  const cam = ctx.camera.position, it = { x: 0, y: 0, z: 0, s: 1.4, ry: 0 }, M4 = new THREE.Matrix4();
  let waspHome = { x: Infinity, z: Infinity };
  function rehome(px, pz) {
    // the windfalls nearest you; wasps hang over them
    waspHome.x = px; waspHome.z = pz;
    const near = [];
    for (let i = 0; i < fruit.length; i += 3) { const f = fruit[i]; if (hyp(f.x - px, f.z - pz) < 26) near.push(f); }
    wasps.forEach((w, i) => { const f = near.length ? near[(i * 7) % near.length] : null; w.k = f ? 1 : 0; if (f) { w.hx = f.x; w.hz = f.z; w.hy = f.y; } });
  }
  const waspUpdate = (dt, t) => {
    const w = regions.regionAt(cam.x, cam.z, W).bletting;
    waspMesh.visible = w > 0.2;
    if (!waspMesh.visible) return;
    if (hyp(cam.x - waspHome.x, cam.z - waspHome.z) > 8) rehome(cam.x, cam.z);
    const dim = ctx.sky?.flicker?.value ?? 1; // they settle on the fruit while the sun gutters
    for (let i = 0; i < NW; i++) {
      const s = wasps[i];
      if (!s.k) { it.x = 0; it.y = -100; it.z = 0; it.s = 0.001; waspMesh.setMatrixAt(i, compose(it, M4)); continue; }
      const a = t * s.sp + s.ph, lift = (0.15 + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.3 + s.ph))) * dim;
      it.x = s.hx + Math.cos(a) * s.r * (0.4 + 0.6 * dim); it.z = s.hz + Math.sin(a * 1.3) * s.r * (0.4 + 0.6 * dim); it.y = s.hy + 0.05 + lift + Math.sin(t * 2.1 + s.ph) * 0.06;
      it.ry = -a + Math.PI / 2; it.s = hyp(it.x - cam.x, it.z - cam.z) < 1.5 ? 0.001 : 1.4; // none in your face
      waspMesh.setMatrixAt(i, compose(it, M4));
    }
    waspMesh.instanceMatrix.needsUpdate = true;
  };
  ctx.registerUpdate(waspUpdate, { pos: { x: CI.x, z: CI.z }, near: 120, hz: 0 });

  // the amber haze itself: dust and pollen hanging gold in the low light
  const motes = airMotes(ctx, KEY, { count: 200, color: '#f0b860', size: 0.035, drift: [0.12, 0, 0.05], sway: 0.6, opacity: 0.4, low: 0.3, high: 4 });
  meshes.push(motes);

  // the pomace snails ------------------------------------------------------
  // each has a path from one windfall to the next (a few metres), crawls it a centimetre a second and stops to
  // graze; its trail behind it is a thread of slime that takes the red light
  const NS = low ? 8 : 13;
  const closeFruit = fruit.filter((f) => hyp(f.x - O.x, f.z - O.z) < O.r - 4);
  const snails = [];
  for (let k = 0; k < NS * 20 && snails.length < NS && closeFruit.length > 4; k++) {
    const f0 = closeFruit[(rng() * closeFruit.length) | 0];
    if (snails.some((s) => hyp(s.path[0][0] - f0.x, s.path[0][1] - f0.z) < 4)) continue;
    // a wandering path toward another windfall 3-7 m off
    const cand = closeFruit.filter((f) => { const d = hyp(f.x - f0.x, f.z - f0.z); return d > 3 && d < 7; });
    if (!cand.length) continue;
    const f1 = cand[(rng() * cand.length) | 0];
    const pts = [], n = 40, ph = rng() * 6.28, amp = 0.4 + rng() * 0.6;
    const dx = f1.x - f0.x, dz = f1.z - f0.z, L = hyp(dx, dz);
    for (let i = 0; i <= n; i++) {
      const t = i / n, side = Math.sin(t * Math.PI * 2.2 + ph) * amp * Math.sin(t * Math.PI);
      const x = f0.x + dx * t - (dz / L) * side + 0.12, z = f0.z + dz * t + (dx / L) * side;
      pts.push([x, z, G.heightAt(x, z)]);
    }
    let len = 0; const cum = [0];
    for (let i = 1; i < pts.length; i++) { len += hyp(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(len); }
    const prog = len * (0.3 + rng() * 0.5);
    snails.push({ path: pts, cum, len, prog, speed: 0.009 + rng() * 0.006, pause: rng() * 20, next: prog + 0.5 + rng() });
  }
  // shell: a coiled cone of whorls, gilt; body: a grey-brown foot with two horns
  const shellGeo = (() => {
    const pos = [], idx = [], sides = 9, steps = 46;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, ang = t * Math.PI * 2 * 3.0, R = 0.042 * Math.pow(0.28, 1 - t), cx = Math.cos(ang) * R, cz = Math.sin(ang) * R, cy = 0.07 - t * 0.04;
      for (let s = 0; s < sides; s++) {
        const b = (s / sides) * Math.PI * 2, rad = R, r = R * 0.62;
        pos.push(cx + Math.cos(ang) * Math.cos(b) * r, cy + Math.sin(b) * r, cz + Math.sin(ang) * Math.cos(b) * r);
      }
    }
    for (let i = 0; i < steps; i++) for (let s = 0; s < sides; s++) { const a = i * sides + s, b = i * sides + (s + 1) % sides; idx.push(a, b, a + sides, b, b + sides, a + sides); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    g.translate(0, 0.02, -0.01);
    return g;
  })();
  const shellMat = new THREE.MeshStandardMaterial({ color: '#d6a644', metalness: 0.75, roughness: 0.38 });
  shellMat.onBeforeCompile = (sh) => { // the lacquer worn through to dull horn in places
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSL;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvSL = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vSL;')
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        float growth = smoothstep(0.6, 0.9, sin(atan(vSL.z, vSL.x) * 14.0 + length(vSL.xz) * 300.0) * 0.5 + 0.5);
        float worn = smoothstep(0.62, 0.85, fract(sin(dot(floor(vSL * 60.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453));
        roughnessFactor = mix(roughnessFactor, 0.85, max(worn, growth * 0.6));`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor *= 1.0 - 0.8 * worn;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= 1.0 - 0.45 * smoothstep(0.6, 0.9, sin(atan(vSL.z, vSL.x) * 14.0 + length(vSL.xz) * 300.0) * 0.5 + 0.5);`);
  };
  const bodyGeo = (() => {
    const g = new THREE.SphereGeometry(1, 8, 5); g.scale(0.035, 0.018, 0.09); g.translate(0, 0.012, 0.01);
    const h1 = new THREE.CylinderGeometry(0.003, 0.004, 0.04, 4); h1.rotateX(-0.6); h1.translate(0.012, 0.03, 0.09);
    const h2 = h1.clone(); h2.translate(-0.024, 0, 0);
    const parts = [g, h1, h2].map((x) => x.toNonIndexed());
    let n = 0; for (const p of parts) n += p.attributes.position.count;
    const P = new Float32Array(n * 3); let o = 0; for (const p of parts) { P.set(p.attributes.position.array, o * 3); o += p.attributes.position.count; }
    const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(P, 3)); m.computeVertexNormals();
    return m;
  })();
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#4a4038', roughness: 0.35, metalness: 0.05 });
  const shellMesh = new THREE.InstancedMesh(shellGeo, shellMat, Math.max(1, snails.length));
  const bodyMesh = new THREE.InstancedMesh(bodyGeo, bodyMat, Math.max(1, snails.length));
  for (const m of [shellMesh, bodyMesh]) { m.count = snails.length; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.castShadow = false; m.receiveShadow = true; scene.add(m); meshes.push(m); }
  shellMesh.name = 'bletting-snail-shells'; bodyMesh.name = 'bletting-snail-bodies';
  // trails: a thin ribbon along each path, drawn up to the snail; wet and bright where the light catches it
  const trailGeo = (() => {
    const P = [], A = [], I = [];
    snails.forEach((s, si) => {
      const base = P.length / 3;
      for (let i = 0; i < s.path.length; i++) {
        const [x, z, y] = s.path[i], [x1, z1] = s.path[Math.min(i + 1, s.path.length - 1)], [x0, z0] = s.path[Math.max(i - 1, 0)];
        const tx = x1 - x0, tz = z1 - z0, tl = hyp(tx, tz) || 1, nx = -tz / tl * 0.014, nz = tx / tl * 0.014;
        P.push(x + nx, y + 0.012, z + nz, x - nx, y + 0.012, z - nz);
        A.push(s.cum[i], si, s.cum[i], si);
        if (i) I.push(base + (i - 1) * 2, base + (i - 1) * 2 + 1, base + i * 2, base + (i - 1) * 2 + 1, base + i * 2 + 1, base + i * 2);
      }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aTrail', new THREE.Float32BufferAttribute(A, 2)); g.setIndex(I);
    const n = new Float32Array(P.length); for (let i = 1; i < n.length; i += 3) n[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
    return g;
  })();
  const progU = { value: new Float32Array(16) };
  const trailMat = new THREE.MeshStandardMaterial({ color: '#c8c0b8', metalness: 0.8, roughness: 0.12, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  trailMat.onBeforeCompile = (sh) => {
    sh.uniforms.uProg = progU;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aTrail; varying vec2 vTr;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvTr = aTrail;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uProg[16]; varying vec2 vTr;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float pr = uProg[int(vTr.y + 0.5)];
        if (vTr.x > pr) discard;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.a *= 0.35 + 0.65 * smoothstep(pr - 6.0, pr - 0.2, vTr.x); // older thread dries dull`);
  };
  const trailMesh = new THREE.Mesh(trailGeo, trailMat);
  trailMesh.name = 'bletting-snail-trails'; trailMesh.receiveShadow = true;
  scene.add(trailMesh); meshes.push(trailMesh);
  const _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _up = new THREE.Vector3(0, 1, 0);
  function placeSnail(i, s) {
    const d = Math.min(s.prog, s.len - 1e-3);
    let k = 1; while (k < s.cum.length - 1 && s.cum[k] < d) k++;
    const a = s.path[k - 1], b = s.path[k], f = (d - s.cum[k - 1]) / Math.max(1e-6, s.cum[k] - s.cum[k - 1]);
    const x = lerp(a[0], b[0], f), z = lerp(a[1], b[1], f), y = lerp(a[2], b[2], f);
    _q.setFromAxisAngle(_up, Math.atan2(b[0] - a[0], b[1] - a[1]));
    _p.set(x, y, z); M4.compose(_p, _q, _s);
    shellMesh.setMatrixAt(i, M4); bodyMesh.setMatrixAt(i, M4);
    progU.value[i] = s.prog;
  }
  snails.forEach((s, i) => placeSnail(i, s));
  shellMesh.instanceMatrix.needsUpdate = true; bodyMesh.instanceMatrix.needsUpdate = true;
  ctx.registerUpdate((dt) => {
    for (let i = 0; i < snails.length; i++) {
      const s = snails[i];
      if (s.prog >= s.len) continue; // arrived: it grazes its windfall now
      if (s.pause > 0) { s.pause -= dt; continue; }
      s.prog = Math.min(s.len, s.prog + s.speed * dt);
      if (s.prog > s.next) { s.pause = 6 + rng() * 18; s.next = s.prog + 0.6 + rng() * 1.6; } // it stops to graze
      placeSnail(i, s);
    }
    shellMesh.instanceMatrix.needsUpdate = true; bodyMesh.instanceMatrix.needsUpdate = true;
  }, { pos: { x: O.x, z: O.z }, near: 80, hz: 1 });

  regions.stats[KEY] = () => ({ ...meshStats(meshes), creature: snails.length, at: snails.map((s) => s.path[0].slice(0, 2).map(Math.round)), windfalls: fruit.length, wallBlocks: blocks.length, wallMetres: Math.round(wallLen), wasps: NW });
  ctx.log(`region-bletting: ${spots.length} trees' windfalls (${fruit.length}), ${blocks.length} wall stones over ${Math.round(wallLen)} m, ${snails.length} snails`);
}
