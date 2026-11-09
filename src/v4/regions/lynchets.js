// BU The Lynchets [Proposed] (wilderness-v5.md; shape and site in wilderness-v4-placement.md section 2, REGIONS.lynchets
// in world.js). "The Byre's farmland gone back to grass: long terraces stepped down the slope toward the tarn,
// ridge-and-furrow under the turf that shows in low light, docks and nettles thick where middens were, and drystone
// walls of grey field-stone running in straight lines to nowhere, gapped and slumped. Thistle-down drifts in the
// air; the sound is wind in the dock-heads and a gate creaking somewhere with no gate in sight. The boundary is a
// wall: every edge of the Lynchets is a wall, with the moor plainly different on the other side. Only here: stoats
// in half-moult, ermine-white in patches and brown in others, that hunt the furrows and stand up to look at you."
// Moved to the tower hill's south-east flank (placement plan): the terraces step down toward the shrine.
import * as THREE from 'three';
import { REGIONS, CAUSEWAY, CAUSEWAY_V4 } from '../../world.js';
import { makeSimplex, smoothstep, clamp } from '../../noise.js';
import { instanced, meshStats, meshGround } from './skin.js';

const KEY = 'lynchets';
const N = makeSimplex(20261107 + 909);
const POLY = REGIONS.lynchets.shape.poly;
// ridge-and-furrow: the ridges run north-north-east, so the low sun from the west-south-west rakes across them
const RF = { ax: 0.34, az: -0.94, period: 7, amp: 0.15 }; // along-ridge direction, metres
const RFX = -RF.az, RFZ = RF.ax; // across the ridges
const TERRACE = 1.5; // metres from one tread to the next

// ---------------------------------------------------------------- relief: terraces along the contours, ridge and furrow
export function height(h, x, z, w) {
  // strip lynchets: long level treads and short steep risers, following the hill's own contours
  const t = (h + 100) / TERRACE, f = t - Math.floor(t);
  const terr = (Math.floor(t) + smoothstep(0.72, 0.98, f)) * TERRACE - 100;
  // the ridges, lowest at the risers' foot so the furrows drain off the terrace
  const a = (x * RFX + z * RFZ) / RF.period;
  const rf = RF.amp * (0.5 - 0.5 * Math.cos(a * 2 * Math.PI)) * (1 - smoothstep(0.6, 0.75, f));
  const k = smoothstep(0.15, 0.7, w);
  return h + (terr + rf - h) * k;
}

// rank turf, greener than the moor, darker where the middens were; the walls' foot is bare
const cTurf = new THREE.Color('#566331'), cTurf2 = new THREE.Color('#6d6e3a'), cMid = new THREE.Color('#2f3a1c');
let MIDDENS = [];
function middenAt(x, z) { let m = 0; for (const d of MIDDENS) m = Math.max(m, 1 - smoothstep(d.r * 0.5, d.r, Math.hypot(x - d.x, z - d.z))); return m; }
export function ground(col, x, z, w) {
  if (!MIDDENS.length) MIDDENS = makeMiddens();
  const n = N.fbm2(x * 0.05, z * 0.05, 3) * 0.5 + 0.5;
  _c.copy(cTurf).lerp(cTurf2, n).lerp(cMid, middenAt(x, z) * 0.8);
  col.lerp(_c, smoothstep(0.3, 0.6, w));
}
const _c = new THREE.Color();
function makeMiddens() {
  // where the farm's heaps were: a few soft patches inside the walls
  const r = (s) => { const v = Math.sin(s * 12.9898) * 43758.5453; return v - Math.floor(v); };
  const out = [];
  for (let i = 0; out.length < 4 && i < 200; i++) {
    const x = -222 + r(i * 2 + 1) * 58, z = -146 + r(i * 2 + 2) * 64;
    if (inPoly(x, z) && polyDist(x, z) > 7 && !out.some((m) => Math.hypot(m.x - x, m.z - z) < 14)) out.push({ x, z, r: 5 + r(i + 77) * 4 });
  }
  return out;
}

export const cover = {
  density: { grass: 1.1, heather: 0, bracken: 0.25, flowers: 0.35, fleshy: 0.4, sedge: 0, reeds: 0, trees: 0 },
  scale: { grass: 1.05 },
  tint: { grass: '#7c8448' }, tintAmt: 0.45,
};
export const stone = { density: 0.04, tors: false }; // the field-stone went into the walls
export const air = { tint: '#c6c8d6', strength: 0.85 }; // "silver thistle-down"

// ---------------------------------------------------------------- polygon helpers
function inPoly(x, z) {
  let inside = false;
  for (let i = 0, j = POLY.length - 1; i < POLY.length; j = i++) {
    const [ax, az] = POLY[j], [bx, bz] = POLY[i];
    if ((az > z) !== (bz > z) && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside;
  }
  return inside;
}
function polyDist(x, z) {
  let d = Infinity;
  for (let i = 0, j = POLY.length - 1; i < POLY.length; j = i++) {
    const [ax, az] = POLY[j], [bx, bz] = POLY[i], ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez;
    let t = ((x - ax) * ex + (z - az) * ez) / l2; t = clamp(t, 0, 1);
    d = Math.min(d, Math.hypot(x - ax - ex * t, z - az - ez * t));
  }
  return d;
}
function roadDist(x, z) {
  let d = Infinity;
  for (const L of [CAUSEWAY, CAUSEWAY_V4]) for (let i = 0; i < L.length - 1; i++) {
    const a = L[i], b = L[i + 1], ex = b.x - a.x, ez = b.z - a.z, l2 = ex * ex + ez * ez;
    let t = ((x - a.x) * ex + (z - a.z) * ez) / l2; t = clamp(t, 0, 1);
    d = Math.min(d, Math.hypot(x - a.x - ex * t, z - a.z - ez * t));
  }
  return d;
}

// ---------------------------------------------------------------- sound: wind in the dock-heads, a gate creaking
const GATE = { x: -206, z: -128 }; // somewhere with no gate in sight
export const sound = {
  start(k) {
    const { ac, master, pink, white, filt, send, loopSrc } = k;
    const rng = k.makeRng(9311);
    // the dock-heads: a dry seed-rattle riding the gusts, two bands
    const bus = ac.createGain(); bus.gain.value = 0; bus.connect(master); send(bus, 0.1);
    const src = loopSrc(pink, rng()), bp = filt('bandpass', 2400, 1.4), am = ac.createGain(); am.gain.value = 0;
    src.connect(bp); bp.connect(am); am.connect(bus);
    const src2 = loopSrc(white, rng()), bp2 = filt('bandpass', 4200, 2), am2 = ac.createGain(); am2.gain.value = 0;
    src2.connect(bp2); bp2.connect(am2); am2.connect(bus);
    // the gate: stick-slip on a dry hinge. A train of tiny grains of noise (each a slip), juddering from about 30 to 15
    // a second as it swings, rung through the hinge's pitch (Q 4) and two formants; a creak or two, then a long while
    const gl = k.placed({ ref: 8, roll: 1.0, range: 160, air: 70, verb: 0.45 }), gpan = gl.in;
    let lvl = 0, gx = 0, gz = 0, now0 = 0;
    function creak(t0) {
      const dur = 0.7 + rng() * 0.9, f0 = 380 + rng() * 260, f1 = f0 * (0.55 + rng() * 0.3);
      const r0 = 26 + rng() * 8, r1 = 13 + rng() * 5;
      const pitch = filt('bandpass', f0, 4);
      pitch.frequency.setValueAtTime(f0, t0); pitch.frequency.linearRampToValueAtTime(f1, t0 + dur * 0.6); pitch.frequency.linearRampToValueAtTime(f0 * 0.8, t0 + dur);
      const env = ac.createGain(); env.gain.setValueAtTime(0.0001, t0); env.gain.linearRampToValueAtTime(4, t0 + 0.06); env.gain.setTargetAtTime(0.0001, t0 + dur * 0.8, dur * 0.06);
      const b1 = filt('bandpass', 1100, 3), b2 = filt('bandpass', 2300, 4);
      pitch.connect(b1); pitch.connect(b2); pitch.connect(env); b1.connect(env); b2.connect(env); env.connect(gpan);
      for (let tt = t0; tt < t0 + dur;) {
        const u = (tt - t0) / dur, g = ac.createGain(), pk = 2.4 + rng() * 1.6;
        g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(pk, tt + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.03);
        const b = ac.createBufferSource(); b.buffer = white; b.start(tt, rng() * 2.5, 0.04);
        b.connect(g); g.connect(pitch);
        tt += (1 / (r0 + (r1 - r0) * u)) * (0.92 + rng() * 0.16);
      }
    }
    const gate = k.caller(rng, { bout: [1, 3], gap: [1.4, 2.6], rest: [25, 0.6, 8, 120], first: [3, 12],
      when: () => Math.hypot(gx - GATE.x, gz - GATE.z) <= 120 }, () => creak(now0 + k.lead()));
    gl.at(GATE.x, k.terrain.heightAt(GATE.x, GATE.z) + 1, GATE.z);
    return {
      tick(w, x, z, step, t, now) {
        lvl += (w - lvl) * 0.3;
        const gust = 0.5 + 0.5 * k.noise.fbm2(t * 0.11, 3.3, 2);
        bus.gain.setTargetAtTime(lvl * 0.35, now, 0.4);
        am.gain.setTargetAtTime(clamp(gust * 1.4 - 0.25, 0, 1) * 0.5, now, 0.3);
        am2.gain.setTargetAtTime(clamp(gust * 1.6 - 0.6, 0, 1) * 0.25, now, 0.2);
        // the creak carries a fair way beyond the walls
        gx = x; gz = z; now0 = now;
        gl.at(GATE.x, k.terrain.heightAt(GATE.x, GATE.z) + 1, GATE.z);
        gate.tick(step);
      },
    };
  },
};

// ---------------------------------------------------------------- the build
export async function build(ctx) {
  const { THREE: T, terrain } = ctx;
  const low = ctx.quality === 'low';
  const rng = ctx.makeRng(9300);
  const R = ctx.regions;
  const meshH = meshGround(terrain);
  const meshes = [];
  if (!MIDDENS.length) MIDDENS = makeMiddens();

  // ---- the walls: every edge, and a few straight runs to nowhere inside; gapped, slumped, open where the road runs
  const runs = [];
  for (let i = 0; i < POLY.length; i++) { const a = POLY[i], b = POLY[(i + 1) % POLY.length]; runs.push({ ax: a[0], az: a[1], bx: b[0], bz: b[1], edge: true }); }
  for (let k = 0; k < 60 && runs.length < POLY.length + 4; k++) {
    // from somewhere on a terrace, straight along the contour or down the slope, stopping short of anything
    const x = -215 + rng() * 50, z = -140 + rng() * 55;
    if (!inPoly(x, z) || polyDist(x, z) < 8) continue;
    const ang = rng() < 0.5 ? Math.atan2(RFZ, RFX) : Math.atan2(RF.az, RF.ax), len = 14 + rng() * 18;
    const bx = x + Math.cos(ang) * len, bz = z + Math.sin(ang) * len;
    if (!inPoly(bx, bz) || polyDist(bx, bz) < 3) continue;
    runs.push({ ax: x, az: z, bx, bz, edge: false });
  }
  const stones = [], walls = [];
  const coll = [];
  for (const r of runs) {
    const len = Math.hypot(r.bx - r.ax, r.bz - r.az), dx = (r.bx - r.ax) / len, dz = (r.bz - r.az) / len, yaw = Math.atan2(dx, dz);
    // gaps and slumps along the run, decided per metre
    let gapLeft = 0, slump = 0;
    for (let s = 0; s < len; s += 0.42) {
      const x = r.ax + dx * s, z = r.az + dz * s;
      if (roadDist(x, z) < 5.5) continue; // the causeway goes through
      if (gapLeft > 0) { gapLeft -= 0.42; continue; }
      if (rng() < 0.008) { gapLeft = 1.8 + rng() * 2.5; continue; }
      if (slump <= 0 && rng() < 0.012) slump = 2 + rng() * 5; else slump -= 0.42;
      const g = terrain.heightAt(x, z), fullH = 1.05 + 0.15 * N.noise2(x * 0.2, z * 0.2);
      const H = slump > 0 ? fullH * (0.3 + 0.25 * rng()) : fullH;
      const courses = Math.max(1, Math.round(H / 0.32));
      for (let c = 0; c < courses; c++) {
        // courses break joint: every other one shifted half a stone along the wall
        const sh = (c % 2) * 0.21, y = g + (c + 0.5) * (H / courses) - 0.04, taper = 1 - (c / courses) * 0.4;
        // a stone through the wall, longer than the step so they butt, jittered so the faces are rough
        stones.push({ x: x + dx * sh + (rng() - 0.5) * 0.06, y, z: z + dz * sh + (rng() - 0.5) * 0.06, ry: yaw + (rng() - 0.5) * 0.5, rx: (rng() - 0.5) * 0.25, rz: (rng() - 0.5) * 0.3,
          sx: 0.62 * taper * (0.8 + rng() * 0.4), sy: (H / courses) * 1.25 * (0.75 + rng() * 0.45), sz: 0.42 * (0.95 + rng() * 0.6), tone: rng() });
      }
      // the cope: stones on edge along the top, packed tight
      if (slump <= 0) for (let c = 0; c < 2; c++) stones.push({ x: x + dx * c * 0.21, y: g + H + 0.08, z: z + dz * c * 0.21, ry: yaw + (rng() - 0.5) * 0.3, rx: (rng() - 0.5) * 0.35, rz: (rng() - 0.5) * 0.2, sx: 0.5 + rng() * 0.12, sy: 0.32 + rng() * 0.1, sz: 0.2 + rng() * 0.07, tone: rng() * 0.6 });
      // spill at a slump's foot
      if (slump > 0 && rng() < 0.6) { const o = (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.6); stones.push({ x: x + dz * o, y: terrain.heightAt(x + dz * o, z - dx * o) + 0.05, z: z - dx * o, ry: rng() * 6, rx: rng(), rz: rng(), sx: 0.18 + rng() * 0.1, sy: 0.1, sz: 0.15, tone: rng() }); }
      if (Math.round(s / 0.42) % 2 === 0) coll.push({ x, z, r: 0.45, y: g - 0.5, h: H + 0.5 });
    }
    walls.push({ ...r, len });
  }
  for (const c of coll) ctx.addCollider(c);
  R.lynchetsWalls = walls; // v7: the Link-Boy's drawn shadows read the runs (src/v7/walkers/shadow.js)
  // field-stone: a lumpy, flat-bedded block (an icosahedron squared off top and bottom), not a brick
  const stoneGeo = new T.IcosahedronGeometry(0.62, 0);
  {
    const p = stoneGeo.attributes.position;
    for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); y = Math.sign(y) * Math.min(Math.abs(y), 0.42); const k = 1 + 0.12 * Math.sin(x * 9 + z * 7); p.setXYZ(i, x * k, y, z * k); }
    stoneGeo.computeVertexNormals();
  }
  const stoneMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.93 });
  const cA = new T.Color('#6c6a66'), cB = new T.Color('#4e4d4c'), cL = new T.Color('#5c6044'), tc = new T.Color();
  const wallMesh = instanced(ctx, stoneGeo, stoneMat, stones, { name: 'lynchets-walls', shadow: true, color: (it) => tc.copy(cA).lerp(cB, it.tone).lerp(cL, it.tone > 0.8 ? 0.6 : 0) });
  meshes.push(wallMesh);

  // ---- docks, nettles and thistles
  const plants = buildWeeds(ctx, rng, meshH, low);
  meshes.push(...plants.meshes);

  // ---- thistle-down in the air
  const down = buildDown(ctx, rng, low);
  meshes.push(down.mesh);
  ctx.registerUpdate((dt, t) => down.update(dt, t));

  // ---- the stoats
  const stoats = buildStoats(ctx, rng, low);
  meshes.push(stoats.mesh);
  ctx.registerUpdate((dt, t) => stoats.update(dt, t), { pos: { x: -195, z: -112 }, near: 120, hz: 2 });

  R.stats[KEY] = () => ({ ...meshStats(meshes), creature: stoats.count });
  R.creatures = Object.assign(R.creatures || {}, { stoats: stoats.list });
  ctx.log(`region lynchets: ${walls.length} walls (${stones.length} stones, ${coll.length} colliders), ${plants.count} weeds, ${stoats.count} stoats`);
}

// Docks (a rosette of long leaves and a rusty seed spike), nettles (an upright stem with paired leaves) and
// thistles (a spiny stem, a purple head or a white clock of down). Thick at the middens, scattered elsewhere.
function buildWeeds(ctx, rng, meshH, low) {
  const { THREE: T } = ctx;
  let I = [];
  const geo = (P, C) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('color', new T.Float32BufferAttribute(C, 3)); g.setIndex(I); I = []; g.computeVertexNormals(); return g; };
  const leaf = (P, C, x, y, z, ang, len, wid, rise, col) => {
    const o = P.length / 3, dx = Math.cos(ang), dz = Math.sin(ang), wx = -dz * wid, wz = dx * wid;
    P.push(x, y, z, x + dx * len * 0.45 + wx, y + rise * 0.6, z + dz * len * 0.45 + wz, x + dx * len, y + rise * 0.7, z + dz * len, x + dx * len * 0.45 - wx, y + rise * 0.6, z + dz * len * 0.45 - wz);
    for (let i = 0; i < 4; i++) C.push(...col);
    I.push(o, o + 1, o + 2, o, o + 2, o + 3);
  };
  const stem = (P, C, x0, y0, z0, x1, y1, z1, w, c0, c1) => {
    for (const [ux, uz] of [[1, 0], [0, 1]]) {
      const o = P.length / 3;
      P.push(x0 - ux * w, y0, z0 - uz * w, x0 + ux * w, y0, z0 + uz * w, x1 + ux * w, y1, z1 + uz * w, x1 - ux * w, y1, z1 - uz * w);
      C.push(...c0, ...c0, ...c1, ...c1);
      I.push(o, o + 1, o + 2, o, o + 2, o + 3);
    }
  };
  // dock
  const dP = [], dC = [], dg = [0.2, 0.26, 0.11], rust = [0.42, 0.18, 0.08], rust2 = [0.3, 0.12, 0.06];
  for (let i = 0; i < 7; i++) leaf(dP, dC, 0, 0.02, 0, (i / 7) * 6.28 + i * 0.3, 0.32 + (i % 3) * 0.06, 0.07, 0.18, i % 2 ? dg : [0.24, 0.24, 0.1]);
  stem(dP, dC, 0, 0, 0, 0.02, 0.9, 0.01, 0.008, dg, rust);
  for (let i = 0; i < 9; i++) { const y = 0.5 + i * 0.045, a = i * 2.1; stem(dP, dC, 0.02 * (y / 0.9), y, 0, 0.02 * (y / 0.9) + Math.cos(a) * 0.05, y + 0.05, Math.sin(a) * 0.05, 0.012, rust2, rust); }
  const dockGeo = geo(dP, dC);
  // nettle
  const nP = [], nC = [], ng = [0.12, 0.18, 0.08], ng2 = [0.16, 0.22, 0.1];
  stem(nP, nC, 0, 0, 0, 0.01, 0.75, 0, 0.006, ng, ng2);
  for (let i = 0; i < 6; i++) { const y = 0.15 + i * 0.1, a = (i % 2) * (Math.PI / 2); for (const sd of [0, Math.PI]) leaf(nP, nC, 0.01 * (y / 0.75), y, 0, a + sd, 0.11 - i * 0.008, 0.035, -0.03, i % 2 ? ng : ng2); }
  const nettleGeo = geo(nP, nC);
  // thistle
  const tP = [], tC = [], tg = [0.22, 0.26, 0.18], purple = [0.4, 0.14, 0.32], fluff = [0.82, 0.8, 0.84];
  stem(tP, tC, 0, 0, 0, 0, 0.85, 0, 0.007, tg, tg);
  for (let i = 0; i < 5; i++) leaf(tP, tC, 0, 0.1 + i * 0.12, 0, i * 2.4, 0.16, 0.03, 0.04, tg);
  for (const [hx, hy, c] of [[0, 0.88, purple], [0.07, 0.78, fluff], [-0.06, 0.74, purple]]) {
    stem(tP, tC, 0, hy - 0.08, 0, hx, hy, 0, 0.005, tg, tg);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.28; stem(tP, tC, hx, hy, 0, hx + Math.cos(a) * 0.035, hy + 0.035, Math.sin(a) * 0.035, 0.012, c, c); }
  }
  const thistleGeo = geo(tP, tC);
  const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: T.DoubleSide });
  const docks = [], nettles = [], thistles = [];
  for (let k = 0; k < (low ? 9000 : 16000); k++) {
    const x = -232 + rng() * 76, z = -154 + rng() * 80;
    if (!inPoly(x, z) || polyDist(x, z) < 1.2 || roadDist(x, z) < 4.5) continue;
    const y = meshH(x, z), m = middenAt(x, z), r = rng();
    if (m > 0.2 && r < 0.6) { // thick at the middens
      if (rng() < 0.55 && nettles.length < (low ? 500 : 900)) nettles.push({ x, y, z, s: 0.8 + rng() * 0.5, ry: rng() * 6.28 });
      else if (docks.length < (low ? 260 : 450)) docks.push({ x, y, z, s: 0.8 + rng() * 0.5, ry: rng() * 6.28 });
    } else if (r < 0.05 && docks.length < (low ? 260 : 450)) docks.push({ x, y, z, s: 0.7 + rng() * 0.5, ry: rng() * 6.28 });
    else if (r < 0.085 && thistles.length < (low ? 220 : 380)) thistles.push({ x, y, z, s: 0.8 + rng() * 0.5, ry: rng() * 6.28 });
  }
  const meshes = [
    instanced(ctx, dockGeo, mat, docks, { name: 'lynchets-docks' }),
    instanced(ctx, nettleGeo, mat, nettles, { name: 'lynchets-nettles' }),
    instanced(ctx, thistleGeo, mat, thistles, { name: 'lynchets-thistles' }),
  ];
  return { meshes, count: docks.length + nettles.length + thistles.length };
}

// Thistle-down: a few hundred tufts drifting slowly through the air round you, turning in the light.
function buildDown(ctx, rng, low) {
  const { THREE: T, camera } = ctx;
  const n = low ? 160 : 320, pos = new Float32Array(n * 3), seed = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { pos[i * 3] = rng() * 50; pos[i * 3 + 1] = rng() * 6; pos[i * 3 + 2] = rng() * 50; seed[i * 2] = rng(); seed[i * 2 + 1] = rng(); }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new T.BufferAttribute(seed, 2));
  const uT = { value: 0 }, uC = { value: new T.Vector3() }, uA = { value: 0 };
  const mat = new T.ShaderMaterial({
    uniforms: { ...T.UniformsUtils.clone(T.UniformsLib.fog), uT, uC, uA },
    vertexShader: /* glsl */`
      uniform float uT, uA; uniform vec3 uC; attribute vec2 aSeed; varying float vA;
      #include <fog_pars_vertex>
      void main() {
        vec3 transformed = position;
        transformed.x += uT * (0.5 + aSeed.x * 0.4) + sin(uT * 0.7 + aSeed.y * 40.0) * 0.8;
        transformed.z += uT * 0.2 + cos(uT * 0.5 + aSeed.x * 30.0) * 0.8;
        transformed.y += sin(uT * 0.3 + aSeed.y * 20.0) * 0.6;
        transformed = uC + mod(transformed - uC + vec3(25.0, 1.4, 25.0), vec3(50.0, 4.0, 50.0)) - vec3(25.0, 1.4, 25.0);
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = clamp(45.0 / -mvPosition.z, 1.0, 3.5);
        vA = uA * (1.0 - smoothstep(16.0, 25.0, length(transformed.xz - uC.xz)));
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      varying float vA;
      #include <fog_pars_fragment>
      void main() {
        vec2 c = gl_PointCoord - 0.5; float r = dot(c, c);
        if (r > 0.25 || vA < 0.01) discard;
        gl_FragColor = vec4(vec3(0.8, 0.79, 0.85), vA * (1.0 - r * 4.0) * 0.45);
        #include <fog_fragment>
      }`,
    transparent: true, depthWrite: false, fog: true,
  });
  const mesh = new T.Points(geo, mat);
  mesh.name = 'lynchets-thistledown'; mesh.frustumCulled = false;
  ctx.scene.add(mesh);
  let a = 0;
  return {
    mesh,
    update(dt, t) {
      const cp = camera.position;
      const w = ctx.regions.regionAt(cp.x, cp.z, undefined, 3)[KEY];
      a += (w - a) * Math.min(1, dt * 2);
      uA.value = a; uT.value = t; uC.value.copy(cp);
      mesh.visible = a > 0.01;
    },
  };
}

// Stoats in half-moult: a long low body that bounds along the furrows, pauses, and when you are near stands up on
// its hind legs to look at you before it goes. Piebald: ermine-white and brown in patches, a black tail tip.
// Built along +z (head forward); standing, it pitches up about its hips.
function buildStoats(ctx, rng, low) {
  const { THREE: T, terrain } = ctx;
  const P = [], C = [], I = [];
  const white = [0.86, 0.84, 0.8], brown = [0.42, 0.27, 0.15], black = [0.04, 0.035, 0.03];
  const patch = (x, y, z) => (Math.sin(x * 61 + z * 23) + Math.sin(y * 47 - z * 31) + Math.sin(x * 19 - y * 53) > 0.4 ? white : brown);
  const ell = (cx, cy, cz, rx, ry, rz, colf, seg = 8) => {
    const o = P.length / 3;
    for (let j = 0; j <= 5; j++) for (let i = 0; i < seg; i++) {
      const v = (j / 5) * Math.PI, u = (i / seg) * 6.283, x = cx + Math.cos(u) * Math.sin(v) * rx, y = cy + Math.cos(v) * ry, z = cz + Math.sin(u) * Math.sin(v) * rz;
      P.push(x, y, z); C.push(...colf(x, y, z));
    }
    for (let j = 0; j < 5; j++) for (let i = 0; i < seg; i++) { const a = o + j * seg + i, b = o + j * seg + ((i + 1) % seg); I.push(a, a + seg, b, b, a + seg, b + seg); }
  };
  // the body is two lobes (chest and haunch) so it can arch; the hips are the origin
  ell(0, 0.06, 0.02, 0.045, 0.045, 0.1, patch);
  ell(0, 0.065, 0.13, 0.04, 0.042, 0.08, patch);
  ell(0, 0.08, 0.22, 0.032, 0.03, 0.045, (x, y, z) => (z > 0.24 && y < 0.075 ? white : patch(x, y, z))); // head, white chin
  ell(0.022, 0.105, 0.2, 0.01, 0.012, 0.006, () => brown, 5); ell(-0.022, 0.105, 0.2, 0.01, 0.012, 0.006, () => brown, 5); // ears
  ell(0, 0.06, -0.12, 0.014, 0.014, 0.075, (x, y, z) => (z < -0.15 ? black : brown), 6); // tail, black tip
  for (const [lx, lz] of [[0.03, 0.14], [-0.03, 0.14], [0.03, -0.01], [-0.03, -0.01]]) ell(lx, 0.025, lz, 0.012, 0.03, 0.014, () => brown, 5);
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(P, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(C, 3));
  geo.setIndex(I); geo.computeVertexNormals();
  const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  const n = low ? 3 : 4;
  const list = [];
  for (let k = 0; k < 400 && list.length < n; k++) {
    const x = -215 + rng() * 45, z = -140 + rng() * 50;
    if (!inPoly(x, z) || polyDist(x, z) < 6 || list.some((s) => Math.hypot(s.x - x, s.z - z) < 10)) continue;
    // snap across onto a furrow (the ridges' low line)
    const a = (x * RFX + z * RFZ) / RF.period, off = (Math.round(a) - a) * RF.period;
    list.push({ x: x + RFX * off, z: z + RFZ * off, dir: rng() < 0.5 ? 1 : -1, state: 'run', t: 1 + rng() * 3, stand: 0, yaw: 0, ph: rng() * 6, cool: 0 });
  }
  const mesh = new T.InstancedMesh(geo, mat, n);
  mesh.name = 'lynchets-stoats'; mesh.castShadow = false; mesh.receiveShadow = true; mesh.frustumCulled = false;
  ctx.scene.add(mesh);
  const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), sc = new T.Vector3(1.45, 1.45, 1.45);
  const cam = ctx.camera.position;
  function update(dt, t) {
    dt = Math.min(dt, 0.25);
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const dpx = cam.x - s.x, dpz = cam.z - s.z, dp = Math.sqrt(dpx * dpx + dpz * dpz);
      s.t -= dt; s.cool -= dt;
      if (s.state === 'run') {
        // bound along the furrow; at the walls, turn back onto the next furrow over
        const sp = 2.6, nx = s.x + RF.ax * s.dir * sp * dt, nz = s.z + RF.az * s.dir * sp * dt;
        if (!inPoly(nx, nz) || polyDist(nx, nz) < 2.5) {
          s.dir = -s.dir; const side = rng() < 0.5 ? 1 : -1;
          const tx = s.x + RFX * RF.period * side, tz = s.z + RFZ * RF.period * side;
          if (inPoly(tx, tz) && polyDist(tx, tz) > 2.5) { s.x = tx; s.z = tz; }
        } else { s.x = nx; s.z = nz; }
        s.yaw = Math.atan2(RF.ax * s.dir, RF.az * s.dir);
        if (dp < 16 && s.cool <= 0) { s.state = 'stand'; s.t = 2.2 + rng() * 2; s.cool = 9; }
        else if (s.t <= 0) { s.state = 'pause'; s.t = 0.8 + rng() * 2.2; }
      } else if (s.state === 'pause') {
        if (dp < 16 && s.cool <= 0) { s.state = 'stand'; s.t = 2.2 + rng() * 2; s.cool = 9; }
        else if (s.t <= 0) { s.state = 'run'; s.t = 2 + rng() * 4; if (rng() < 0.4) s.dir = -s.dir; }
      } else if (s.state === 'stand') {
        // up on its hind legs, turned to look at you
        const want = Math.atan2(dpx, dpz);
        let d = want - s.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        s.yaw += d * Math.min(1, dt * 6);
        if (s.t <= 0) { s.state = 'run'; s.t = 3 + rng() * 3; s.dir = (dpx * RF.ax + dpz * RF.az) > 0 ? -1 : 1; }
      }
      s.stand += ((s.state === 'stand' ? 1 : 0) - s.stand) * Math.min(1, dt * 7);
      const running = s.state === 'run';
      const bound = running ? Math.abs(Math.sin(t * 9 + s.ph)) : 0;
      const y = terrain.heightAt(s.x, s.z);
      e.set(-s.stand * 1.35 + (running ? Math.sin(t * 9 + s.ph) * 0.18 : 0), s.yaw, 0, 'YXZ'); q.setFromEuler(e);
      p.set(s.x, y + bound * 0.09 + s.stand * 0.01, s.z);
      mesh.setMatrixAt(i, m.compose(p, q, sc));
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  update(0, 0);
  return { mesh, update, count: list.length, list };
}
