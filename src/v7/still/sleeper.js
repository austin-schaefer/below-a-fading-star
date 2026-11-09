// CB The Long Sleeper (IDEAS-v5.md CB; wilderness-v5.md "### CB. The Long Sleeper"; ?sleeper=0).
// "Under a single old medlar outside the close, a man asleep on his back in robes of a cut nobody wears, his beard grown
// into the grass and a ring of brown toadstools round him. He breathes once a minute, deeply enough to see. He never
// wakes; come close and his eyelids move as if he dreamed you. Sound: the breath, and a fruit dropping onto him now and
// then." The medlar is built here (medlar.js). Draws: the man (robe, hands, head, lids, beard, grass: one mesh), the
// toadstools (one instanced mesh), the fruit (one), the medlar (one).
import * as THREE from 'three';
import { SITES } from '../../world.js';
import { hyp } from '../../noise.js';
import { Painter, paintedMaterial, ell, strand, conform, clamp, smooth, lerp, ZERO, hash3 } from './kit.js';
import { medlarGeometry } from './medlar.js';

// the numbers (all of them in wilderness-v5.md)
export const SLEEP = {
  length: 1.85, beard: 1.2, ringN: [18, 24], ringR: [1.6, 2.0], capD: [0.04, 0.09],
  breath: { period: 60, phase: 17, inhale: 3.5, hold: 0.5, exhale: 5, lift: 0.05 },
  lid: { near: 5, burst: 1.5, every: [4, 8], hz: [3, 6], amp: 0.002 },
  fruit: { near: 30, every: [40, 120], drop: [4, 5], keep: 12, within: 1.45, bounce: 0.26, r: 0.034 },
};
const GRASS = '#8c8a44', G2 = '#6a6a30'; // the Bletting's rank grass (its tint) and a darker blade

export const breathAt = (t) => {
  const B = SLEEP.breath, u = ((t + B.phase) % B.period + B.period) % B.period;
  if (u < B.inhale) return smooth(0, 1, u / B.inhale);
  if (u < B.inhale + B.hold) return 1;
  if (u < B.inhale + B.hold + B.exhale) return 1 - smooth(0, 1, (u - B.inhale - B.hold) / B.exhale);
  return 0;
};

export function buildSleeper(ctx, G, flags) {
  const { scene, THREE: _T } = ctx, low = ctx.quality === 'low';
  const rng = ctx.makeRng(7301), site = SITES.sleeper;
  // the lie: head toward the trunk, the body running south from it; the trunk 1.4 m from the crown of his head
  const D = [0, 1], Pp = [-1, 0]; // along the body (head to feet), and across (to his left)
  const trunk = { x: site.x, z: site.z - 2.9 };
  const centre = { x: site.x, z: site.z - 0.45 }; // the middle of the man
  const yaw = Math.atan2(D[0], D[1]) - Math.PI / 2; // local +x (head to feet) turned onto D
  // three's rotation.y maps local (x, z) to (x cos + z sin, -x sin + z cos): x -> (cos, -sin)
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const toWorld = (lx, lz) => [centre.x + lx * cy + lz * sy, centre.z - lx * sy + lz * cy];
  const baseY = G.at(centre.x, centre.z);
  const api = { centre, trunk, yaw, breath: 0, lid: 0, lidBursts: 0, drops: 0, landed: [], cues: 0, bodyTop: null, objects: [] };

  // ---------------------------------------------------------------- the medlar
  {
    const dir = [site.x - trunk.x, site.z - trunk.z], dl = hyp(dir[0], dir[1]);
    const geo = medlarGeometry(ctx.makeRng(7302), [dir[0] / dl, dir[1] / dl], low);
    const mat = paintedMaterial({ side: THREE.DoubleSide });
    mat.customProgramCacheKey = () => 'fp-still-medlar';
    const m = new THREE.Mesh(geo, mat);
    m.position.set(trunk.x, G.at(trunk.x, trunk.z) - 0.05, trunk.z); m.rotation.y = 0;
    m.castShadow = true; m.receiveShadow = true; m.name = 'living-still-medlar';
    scene.add(m); api.medlar = m;
    ctx.addCollider({ x: trunk.x, z: trunk.z, r: 0.36 });
  }

  // ---------------------------------------------------------------- the man
  const P = new Painter(['aLid']);
  const skin = new THREE.Color('#ab8f76'), lidc = new THREE.Color('#85695a'), hair = new THREE.Color('#a8a090'), beard = new THREE.Color('#b4ac9c');
  const under = new THREE.Color('#4a4c66'), over = new THREE.Color('#6e3e48'), edge = new THREE.Color('#8e7c46'), boot = new THREE.Color('#2a2220');
  const chestW = (x, y) => Math.exp(-(((x + 0.38) / 0.3) ** 2)) * clamp((y - 0.03) / 0.13, 0, 1);
  // the long gown: wide at the shoulder, layered, spread on the ground at the sides
  const X = [-0.74, -0.58, -0.32, -0.06, 0.2, 0.46, 0.7, 0.92];
  const R = [[0.15, 0.09], [0.27, 0.13], [0.28, 0.18], [0.22, 0.14], [0.24, 0.125], [0.23, 0.115], [0.22, 0.105], [0.21, 0.095]];
  P.paint(under, 0, 0.95, 0);
  P.loft(X.map((x, i) => [x, R[i][1] - 0.02, 0]), R, 9, (p) => chestW(p[0], p[1]), true);
  P.paint(over, 0, 0.95, 0); // the over-robe, flung wide on the ground (sleeves wider than the arm, a hem that pools)
  P.loft([[-0.45, 0.05, 0], [-0.1, 0.05, 0], [0.3, 0.045, 0], [0.9, 0.04, 0]], [[0.36, 0.07], [0.38, 0.06], [0.34, 0.055], [0.3, 0.05]], 8, (p) => chestW(p[0], 0.12) * 0.3, false);
  P.paint(edge, 0, 0.9, 0); P.loft([[0.9, 0.07, 0], [0.93, 0.07, 0]], [[0.22, 0.1], [0.23, 0.105]], 8, 0, false); // the hem's border
  // the high stiff collar: a band standing round the neck
  P.paint(edge, 0, 0.85, 0); P.loft([[-0.86, 0.12, 0], [-0.78, 0.12, 0], [-0.69, 0.115, 0]], [[0.15, 0.125], [0.17, 0.14], [0.2, 0.15]], 9, 0, false);
  // sleeves, wide, the hands folded on the chest
  for (const s of [1, -1]) {
    P.paint(over, 0, 0.95, 0);
    P.loft([[-0.6, 0.17, s * 0.27], [-0.46, 0.14, s * 0.35], [-0.33, 0.25, s * 0.2], [-0.27, 0.31, s * 0.05]], [0.075, 0.1, 0.12, 0.125], 6, (p) => chestW(p[0], p[1] + 0.1), false);
    P.paint(edge, 0, 0.9, 0); P.loft([[-0.275, 0.31, s * 0.06], [-0.255, 0.315, s * 0.03]], [0.128, 0.13], 6, (p) => chestW(p[0], 0.2), false);
    P.paint(skin, 0, 0.8, 0); ell(P, -0.2, 0.33, s * 0.025, 0.07, 0.03, 0.035, 7, 4); // the hand
  }
  // the head, face up, the crown toward the trunk
  P.paint(hair, 0, 0.95, 0); ell(P, -0.9, 0.07, 0, 0.085, 0.045, 0.13, 7, 4);
  P.paint(skin, 0, 0.75, 0); ell(P, -0.81, 0.13, 0, 0.12, 0.085, 0.075, 10, 6);
  P.paint(skin, 0, 0.7, 0); ell(P, -0.775, 0.215, 0, 0.03, 0.018, 0.013, 6, 4); // the nose
  P.paint(skin, 0, 0.7, 0); ell(P, -0.84, 0.205, 0, 0.012, 0.02, 0.07, 6, 4);   // the brow
  P.set('aLid', 1);
  for (const s of [1, -1]) { P.paint(lidc, 0, 0.6, 0); ell(P, -0.805, 0.2, s * 0.032, 0.02, 0.009, 0.017, 6, 4); } // the lids: shut
  P.set('aLid', 0);
  P.paint(boot, 0, 0.6, 0); for (const s of [1, -1]) ell(P, 0.95, 0.105, s * 0.085, 0.07, 0.04, 0.04, 6, 4); // the soles of his shoes
  // the beard: from the chin over the chest, off the shoulder and along the turf, its last third turning to grass
  const chin = [-0.7, 0.12, 0];
  const path = [chin, [-0.62, 0.22, 0.03], [-0.54, 0.25, 0.14], [-0.5, 0.17, 0.3], [-0.46, 0.04, 0.42], [-0.44, 0.022, 0.62], [-0.4, 0.02, 0.8], [-0.37, 0.02, 0.97]];
  let plen = 0; for (let i = 1; i < path.length; i++) plen += hyp3(path[i], path[i - 1]);
  api.beardLength = plen;
  const mixc = (t) => beard.clone().lerp(new THREE.Color(GRASS), smooth(0.55, 1, t));
  for (const off of [-0.025, 0, 0.025]) {
    const pts = path.map((p, i) => [p[0] + (i > 0 ? off * 0.5 : 0), p[1], p[2] + off * (i > 0 ? 1 : 0.3)]);
    strand(P, pts, 0.03 - Math.abs(off) * 0.4, 0.009, mixc, 4);
  }
  // blades of grass rooted along the end of it
  const nBl = low ? 22 : 40, bc = new THREE.Color();
  for (let i = 0; i < nBl; i++) {
    const f = 0.62 + (i / nBl) * 0.38, k = f * (path.length - 1), a = Math.min(path.length - 2, Math.floor(k)), tt = k - a;
    const bx = lerp(path[a][0], path[a + 1][0], tt) + (rng() - 0.5) * 0.12, bz = lerp(path[a][2], path[a + 1][2], tt) + (rng() - 0.5) * 0.14;
    const h = 0.1 + rng() * 0.18, lean = (rng() - 0.5) * 0.12, lz = (rng() - 0.5) * 0.1, w = 0.007;
    bc.set(rng() < 0.5 ? GRASS : G2).lerp(beard, (1 - smooth(0.62, 1, f)) * 0.6);
    P.paint(bc, 0, 0.9, 0);
    const i0 = P.v(bx - w, 0.01, bz), i1 = P.v(bx + w, 0.01, bz), i2 = P.v(bx + lean, 0.01 + h, bz + lz);
    P.tri(i0, i1, i2);
  }
  const geo = P.geometry();
  conform(geo, centre.x, centre.z, yaw, G.at, baseY);
  const U = { uBreath: { value: 0 }, uLid: { value: 0 } };
  const mat = paintedMaterial({ side: THREE.DoubleSide }, (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aW; attribute float aLid; uniform float uBreath; uniform float uLid;')
      .replace('vMRE = aMRE;', 'vMRE = aMRE; transformed.y += uBreath * 0.05 * aW; transformed.x += uLid * aLid; transformed.y += 0.5 * uLid * aLid;');
  });
  mat.customProgramCacheKey = () => 'fp-still-sleeper';
  const man = new THREE.Mesh(geo, mat);
  man.position.set(centre.x, baseY, centre.z); man.rotation.y = yaw;
  man.castShadow = true; man.receiveShadow = true; man.name = 'living-still-sleeper';
  scene.add(man); api.man = man;
  // the height of his top at a lying-frame x (for a fruit that lands on him)
  api.bodyTop = (lx) => { for (let i = 1; i < X.length; i++) if (lx <= X[i]) { const f = (lx - X[i - 1]) / (X[i] - X[i - 1]); return lerp(R[i - 1][1] * 2 - 0.02, R[i][1] * 2 - 0.02, clamp(f, 0, 1)); } return 0.15; };
  for (const lx of [-0.4, 0.45]) { const [wx, wz] = toWorld(lx, 0); ctx.addCollider({ x: wx, z: wz, r: 0.4 }); }

  // ---------------------------------------------------------------- the ring of toadstools
  const nT = SLEEP.ringN[0] + Math.floor(rng() * (SLEEP.ringN[1] - SLEEP.ringN[0] + 1));
  {
    const prof = [[0.2, 0], [0.17, 0.8], [0.22, 1.7], [0.7, 1.82], [1.0, 2.0], [1.0, 2.12], [0.9, 2.4], [0.6, 2.68], [0.25, 2.85], [0.001, 2.88]].map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(prof, 8);
    const col = new Float32Array(g.attributes.position.count * 3), p = g.attributes.position, c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); c.set(y < 1.8 ? '#b7a888' : y < 2.1 ? '#6a4a30' : '#5a3a22'); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide }), nT);
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
    api.ring = [];
    for (let i = 0; i < nT; i++) {
      const a = (i + (rng() - 0.5) * 0.8) / nT * Math.PI * 2, r = lerp(SLEEP.ringR[0], SLEEP.ringR[1], rng());
      const x = centre.x + Math.cos(a) * r, z = centre.z + Math.sin(a) * r, s = lerp(SLEEP.capD[0], SLEEP.capD[1], rng()) / 2;
      e.set((rng() - 0.5) * 0.25, rng() * 6.28, (rng() - 0.5) * 0.25); q.setFromEuler(e);
      ps.set(x, G.at(x, z) - 0.01, z); sc.set(s, s * (0.9 + rng() * 0.5), s);
      M.compose(ps, q, sc); m.setMatrixAt(i, M); m.setColorAt(i, c.setScalar(0.8 + rng() * 0.35));
      api.ring.push({ x, z, r, cap: s * 2 });
    }
    m.name = 'living-still-toadstools'; m.receiveShadow = true; m.castShadow = false;
    scene.add(m); api.toadstools = m;
  }

  // ---------------------------------------------------------------- the fruit
  const FR = SLEEP.fruit, N = FR.keep;
  const fg = new THREE.IcosahedronGeometry(1, 0);
  const fm = new THREE.InstancedMesh(fg, new THREE.MeshStandardMaterial({ color: '#33170a', roughness: 0.5, flatShading: true }), N);
  const st = []; // per slot: state 0 free, 1 falling, 2 resting; x y z vy bounced seq r rot
  for (let i = 0; i < N; i++) { st.push({ s: 0, x: 0, y: 0, z: 0, vy: 0, b: 0, seq: 0, rest: 0, rot: 0 }); fm.setMatrixAt(i, ZERO); }
  fm.frustumCulled = false; fm.castShadow = false; fm.receiveShadow = true; fm.name = 'living-still-fruit';
  scene.add(fm); api.fruit = fm;
  const fM = new THREE.Matrix4(), fq = new THREE.Quaternion(), fe = new THREE.Euler(), fp = new THREE.Vector3(), fs = new THREE.Vector3();
  const place = (k) => { const f = st[k]; fe.set(f.rot, f.rot * 3, f.rot * 0.5); fq.setFromEuler(fe); fp.set(f.x, f.y, f.z); fs.set(FR.r, FR.r * 0.88, FR.r); fM.compose(fp, fq, fs); fm.setMatrixAt(k, fM); fm.instanceMatrix.needsUpdate = true; };
  let seq = 0;
  const camDir = new THREE.Vector3();
  const inView = (x, y, z) => { // within the camera's cone widened by 10 degrees, or near enough to be seen at all
    const c = ctx.camera; c.getWorldDirection(camDir);
    const dx = x - c.position.x, dy = y - c.position.y, dz = z - c.position.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    return d < 90 && (dx * camDir.x + dy * camDir.y + dz * camDir.z) / d > Math.cos(Math.min(1.4, (c.fov * Math.PI / 180) * 0.5 * Math.max(1, c.aspect) + 0.18));
  };
  api.fruitOnGround = () => st.filter((f) => f.s === 2).length;
  api.drop = () => {
    let k = st.findIndex((f) => f.s === 0);
    if (k < 0) { // 12 stay: the oldest is taken away only while out of view
      let o = -1; for (let i = 0; i < N; i++) if (st[i].s === 2 && (o < 0 || st[i].seq < st[o].seq)) o = i;
      if (o < 0 || inView(st[o].x, st[o].rest, st[o].z)) return false;
      st[o].s = 0; fm.setMatrixAt(o, ZERO); k = o;
    }
    const f = st[k];
    // where it lands: on him, or in the grass within 1.45 m of his middle
    let lx, lz, onHim = rng() < 0.55, wx, wz, top = 0;
    for (let tries = 0; tries < 20; tries++) {
      if (onHim) { lx = -0.6 + rng() * 1.3; lz = (rng() - 0.5) * 0.3; }
      else { lx = (rng() - 0.5) * 1.8; lz = (rng() < 0.5 ? -1 : 1) * (0.32 + rng() * 1.1); }
      [wx, wz] = toWorld(lx, lz);
      if (hyp(wx - centre.x, wz - centre.z) <= FR.within) break;
    }
    if (onHim) top = api.bodyTop(lx) * (lz * lz < 0.01 ? 1 : 0.8);
    f.rest = G.at(wx, wz) + top + FR.r * 0.8; f.x = wx + (rng() - 0.5) * 0.3; f.z = wz + (rng() - 0.5) * 0.3; f.vy = 0; f.b = 0; f.rot = rng() * 6.28;
    f.y = f.rest + lerp(FR.drop[0], FR.drop[1], rng()); f.tx = wx; f.tz = wz; f.s = 1; f.seq = ++seq;
    api.drops++; place(k);
    return true;
  };
  const stepFruit = (dt) => {
    for (let k = 0; k < N; k++) {
      const f = st[k]; if (f.s !== 1) continue;
      f.vy -= 9.8 * dt; f.y += f.vy * dt;
      // it drifts the last of the way to its mark as it falls
      f.x += (f.tx - f.x) * Math.min(1, dt * 3); f.z += (f.tz - f.z) * Math.min(1, dt * 3);
      if (f.y <= f.rest) {
        if (!f.b) { f.b = 1; f.y = f.rest; f.vy = -f.vy * FR.bounce; f.x = f.tx; f.z = f.tz; api.landed.push({ x: f.tx, z: f.tz, t: ctx.time.t }); if (api.landed.length > 40) api.landed.shift(); ctx.audio?.cue?.('sleeper-fruit', { x: f.tx, y: f.rest, z: f.tz }); api.cues++; }
        else { f.y = f.rest; f.vy = 0; f.s = 2; }
      }
      place(k);
    }
  };

  // ---------------------------------------------------------------- the update
  const L = SLEEP.lid, B = SLEEP.breath;
  const lidRng = ctx.makeRng(7303);
  let nextBurst = lidRng() * 3, burstT = -1, burstHz = 4, lastU = -1, dropClock = lerp(FR.every[0], FR.every[1], rng()), prevT = 0;
  api.inhales = 0;
  api.update = (dt, t) => {
    const px = ctx.player.pos.x, pz = ctx.player.pos.z, d = hyp(px - centre.x, pz - centre.z);
    // the breath: a deterministic phase on the clock
    const b = breathAt(t); api.breath = b; U.uBreath.value = b;
    const u = ((t + B.phase) % B.period + B.period) % B.period;
    if (u < lastU) { api.inhales++; if (d < 12) { ctx.audio?.cue?.('sleeper-breath', { x: centre.x, y: baseY + 0.3, z: centre.z }); api.cues++; } }
    lastU = u;
    // the lids: a burst of small quick movements every 4-8 s, shown only within 5 m
    if (t >= nextBurst && burstT < 0) { burstT = 0; burstHz = lerp(L.hz[0], L.hz[1], lidRng()); }
    let lid = 0;
    if (burstT >= 0) {
      burstT += dt;
      if (burstT >= L.burst) { burstT = -1; nextBurst = t + lerp(L.every[0], L.every[1], lidRng()); api.lidBursts++; }
      else if (d < L.near) lid = L.amp * Math.sin(burstT * burstHz * 6.2832) * Math.sin(Math.PI * burstT / L.burst);
    }
    api.lid = lid; U.uLid.value = lid;
    // the fruit: the clock runs only while the walker is within 30 m
    if (d < FR.near) { dropClock -= dt; if (dropClock <= 0) { if (api.drop()) dropClock = lerp(FR.every[0], FR.every[1], rng()); else dropClock = 5; } }
    stepFruit(dt);
  };
  api.stats = () => ({ calls: 4, tris: Math.round((geo.index.count + api.medlar.geometry.index.count + 12 * 20 + 0) / 3 + nT * 80) });
  return api;
}
const hyp3 = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
