// The twelfth place, and the act that pours for him (v10-A2; stories/the-twelfth-chair.md, beat 1's plainer surface).
// The Collation is laid for twelve and one chair has been carried off (src/v8/threads/chair.js). Where it stood the
// table is still laid, and somebody still serves him, and the place is made large enough to read from a step away:
// his plate (half as big again as theirs) is piled with food gone old (bletted medlars furred grey-green, a heel of
// bread, a wedge of cheese gone blue), a twelfth napkin is folded beside it, white against the grey cloth, and his
// goblet (1.7 times theirs) stands a little drunk down beside a dark bottle. The eleven chairs are turned a little
// toward the gap (v5/dressing/collation.js). The eleven glasses are dry, with dust in them.
//
// Standing where the chair was, close to his place and looking at it, the visitor is offered "Pour for him". The bottle
// lifts by itself, tilts over his goblet and pours (a stream of wine for about a second and a half, the level rising to
// the brim and a little over the rim onto the cloth); it is set down. Then the eleven answer, who are never seen:
// round the table, outward from the gap, one glass after another takes wine rising in it and flares ember-red with a
// ping. Last his flares, and a string of ember lights runs from it off the table, low over the ground, along the way
// the chair was carried (the table, the rests, as far as the visitor has earned), and at the first rest a glass of wine
// stands on a stone that was not there: they drank to him at every stop. Each time the visitor pours (one a visit) the
// string goes one rest farther: three in all. All kept: the stain, the full goblet, the poured eleven, the glasses at
// the rests the visitor has opened.
//
// Draws: his place (one static mesh), his bottle, his wine, his stream, the stain, the eleven's wine (one
// InstancedMesh), three glasses at the rests (one geometry), sprites for the flares and the string. Hidden, and no
// per-frame work, outside the act.
import * as THREE from 'three';
import { Acc, mat } from '../v5/dressing/kit.js';
import { COLLATION, toWorld } from '../v5/dressing/collation.js';
import { CHAIR_GONE } from '../v8/threads/plan.js';

const ID = 'collation-twelfth';
const NREST = 3;
const PEWTER = '#8a8e96', GLASS = '#b0c0b8', WINE = '#a21a2c';
const CA = Math.cos(COLLATION.angle), SA = Math.sin(COLLATION.angle);
const G = 1.7; // his goblet's scale on theirs
const T_POUR = 1.0, T_POURED = 2.6, T_BACK = 3.5, T_RIPPLE = 3.0, PER = 0.25, T_STRING = 5.7, V_STRING = 18;
const LEVEL0 = 0.45;

export function buildTwelfthPlace(ctx, col, marks) {
  if (!col || !ctx.acts) return null;
  const rng = ctx.makeRng(1020), { top } = col;
  const PU = []; for (let i = 0; i < 6; i++) PU.push(-4.25 + i * 1.7);
  const u0 = PU[CHAIR_GONE.i], side = CHAIR_GONE.side;
  const M = (u, v, y, rx = 0, ry = 0, rz = 0, s = 1) => { const [x, z] = toWorld(u, v); return mat(x, y, z, rx, ry - COLLATION.angle, rz, s); };
  const dirU = new THREE.Vector3(CA, 0, SA);
  const scl = (x, y, z) => new THREE.Vector3(x, y, z);

  // ------------------------------------------------------------------ his place: static
  const A = new Acc(rng);
  const PS = 1.5, pv = side * 0.2, py = top + 0.012; // the plate's scale, its v, its height
  const plate = new THREE.LatheGeometry([[0, 0], [0.085, 0], [0.098, 0.004], [0.138, 0.013], [0.148, 0.021], [0.153, 0.019], [0.149, 0.012]].map(([x, y]) => new THREE.Vector2(x, y)), 16);
  A.add(plate, M(u0, pv, py, 0, 0, 0, PS), PEWTER, 0.04);
  const ico = new THREE.IcosahedronGeometry(1, 1);
  const layer = (n, r, y, ms) => { for (let k = 0; k < n; k++) { const a = k / n * 6.28 + y * 40, x = Math.cos(a) * r * PS, z = Math.sin(a) * r * PS, s = ms * PS * (0.9 + rng() * 0.2);
    A.add(ico, M(u0 + x, pv + z, py + y * PS, 0, rng() * 6, 0).scale(scl(s, s * 0.82, s)), k % 3 === 0 ? '#3a2416' : '#5a361e', 0.15);
    if (y > 0.05 && k % 2 === 0) A.add(ico, M(u0 + x * 0.9, pv + z * 0.9, py + y * PS + s * 0.5).scale(scl(s * 0.66, s * 0.36, s * 0.66)), '#c4cab0', 0.12); // the mould's fur
  } };
  layer(6, 0.075, 0.04, 0.05); layer(4, 0.04, 0.09, 0.048); layer(1, 0, 0.133, 0.05);
  A.add(ico, M(u0, pv, py + 0.158 * PS).scale(scl(0.042 * PS, 0.03 * PS, 0.042 * PS)), '#d0d6bc', 0.1);
  A.box(0.13 * PS, 0.05 * PS, 0.07 * PS, M(u0 + 0.05, pv - 0.1, py + 0.026 * PS, 0, 0.5, 0.05), '#7a5e3a', 0.1); // a heel of bread
  A.add(ico, M(u0 + 0.05, pv - 0.1, py + 0.054 * PS).scale(scl(0.05 * PS, 0.016 * PS, 0.03 * PS)), '#b4bda0', 0.1);
  A.add(new THREE.CylinderGeometry(0.06 * PS, 0.06 * PS, 0.04 * PS, 3), M(u0 - 0.09, pv + 0.1, py + 0.022 * PS, 0, 1.2, 0), '#8a9a78', 0.08); // a wedge of cheese gone blue
  // the napkin: folded square beside the plate, white against the grey cloth, an ember hem
  const nu = u0 - 0.5, nv = pv - 0.08;
  A.box(0.4, 0.016, 0.3, M(nu, nv, top + 0.02, 0, 0.12, 0), '#f0e8d2', 0.02);
  A.box(0.4, 0.014, 0.16, M(nu, nv, top + 0.035, 0, 0.12, 0), '#e2d9c0', 0.02);
  A.box(0.4, 0.005, 0.02, M(nu, nv, top + 0.045, 0, 0.12, 0), '#c8581e', 0.04);
  // his goblet and the bottle beside it
  const gu = u0 + 0.42, gv = side * 0.34;
  const foot = new THREE.CylinderGeometry(0.03, 0.03, 0.006, 14), stem = new THREE.CylinderGeometry(0.005, 0.006, 0.06, 6), bowl = new THREE.CylinderGeometry(0.034, 0.021, 0.075, 16, 1, true);
  const glass = (acc, at, k) => {
    acc.add(foot, at(0.003 * k, k), '#a0b0a8', 0.04);
    acc.add(stem, at(0.036 * k, k), '#a0b0a8', 0.04);
    acc.add(bowl, at((0.066 + 0.0375) * k, k), GLASS, 0.04);
  };
  glass(A, (y, k) => M(gu, gv, top + y, 0, 0, 0, k), G);
  const placeMesh = new THREE.Mesh(A.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide, emissive: '#3a352c', emissiveIntensity: 0.5 }));
  placeMesh.name = 'collation-twelfth-place'; placeMesh.castShadow = true; placeMesh.receiveShadow = true;
  ctx.scene.add(placeMesh);
  const rg = ctx.scene.getObjectByName('collation-rings'); if (rg) rg.visible = false; // the cloth's two dark rounds are covered by his place now

  // the bottle: dark glass with a cream band, origin at its base, axis +y
  const BH = 0.352, BK = 1.1;
  const bottleGeo = (() => {
    const B = new Acc(rng), prof = [[0, 0], [0.05, 0], [0.058, 0.02], [0.058, 0.16], [0.05, 0.2], [0.022, 0.25], [0.02, 0.31], [0.025, 0.316], [0.019, 0.32]].map(([x, y]) => new THREE.Vector2(x * BK, y * BK));
    B.add(new THREE.LatheGeometry(prof, 16), new THREE.Matrix4(), '#22362c', 0.02);
    B.add(new THREE.CylinderGeometry(0.0595 * BK, 0.0595 * BK, 0.07 * BK, 16, 1, true), mat(0, 0.1 * BK, 0), '#d8caa0', 0.02);
    return B.geometry();
  })();
  const bottle = new THREE.Mesh(bottleGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.1, side: THREE.DoubleSide, emissive: '#142018', emissiveIntensity: 0.6 }));
  bottle.castShadow = true; bottle.name = 'collation-twelfth-bottle'; ctx.scene.add(bottle);
  const bu = gu + 0.27, bv = gv + 0.03;
  const rest = new THREE.Vector3(...(() => { const [x, z] = toWorld(bu, bv); return [x, top, z]; })());
  const glassPos = new THREE.Vector3(...(() => { const [x, z] = toWorld(gu, gv); return [x, top, z]; })());
  const mouth = glassPos.clone().add(new THREE.Vector3(0, (0.066 + 0.075) * G + 0.035, 0)).addScaledVector(dirU, 0.05); // over the rim, a little toward the bottle
  const restMouth = rest.clone().add(new THREE.Vector3(0, BH, 0));
  const _up = new THREE.Vector3(), _base = new THREE.Vector3(), _m0 = new THREE.Vector3();
  function poseBottle(p, extra = 0) { // p 0 = standing, 1 = tilted over the goblet; extra: further tilt (rad)
    const e = p * p * (3 - 2 * p), th = e * 1.7 + extra;
    _up.set(0, 1, 0).multiplyScalar(Math.cos(th)).addScaledVector(dirU, -Math.sin(th));
    _m0.lerpVectors(restMouth, mouth, Math.min(1, e * 1.0));
    _base.copy(_m0).addScaledVector(_up, -BH);
    bottle.position.copy(_base); bottle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _up);
  }
  poseBottle(0);

  // wine: a cylinder filling the goblet to a level f (0..1 of its 0.073 of the bowl); his, and the stream into it
  const WINE_MAT = new THREE.MeshStandardMaterial({ color: WINE, roughness: 0.25, metalness: 0, emissive: '#6a0e1c', emissiveIntensity: 1 });
  const unit = new THREE.CylinderGeometry(1, 1, 1, 16);
  const hisWine = new THREE.Mesh(unit, WINE_MAT); hisWine.name = 'collation-twelfth-wine'; ctx.scene.add(hisWine);
  const level = (f) => {
    const h = f * 0.073 * G, r = (0.021 + 0.013 * f * 0.5) * G * 0.95;
    hisWine.scale.set(r, Math.max(1e-3, h), r); hisWine.position.set(glassPos.x, top + (0.066 + 0.002) * G + h / 2, glassPos.z);
    return top + (0.066 + 0.002) * G + h;
  };
  const stream = new THREE.Mesh(unit, new THREE.MeshStandardMaterial({ color: '#c02a3c', roughness: 0.2, emissive: '#9a1428', emissiveIntensity: 1 }));
  stream.visible = false; stream.name = 'collation-twelfth-stream'; ctx.scene.add(stream);
  const stain = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshStandardMaterial({ color: '#4a0c16', roughness: 0.3, emissive: '#2a0610', emissiveIntensity: 1, side: THREE.DoubleSide }));
  stain.rotation.x = -Math.PI / 2; stain.position.set(glassPos.x + SA * 0.0 - 0.0, top + 0.0135, glassPos.z); stain.visible = false; stain.name = 'collation-twelfth-stain'; ctx.scene.add(stain);
  const setStain = (k) => { stain.visible = k > 0.01; stain.scale.set(0.14 * k, 0.1 * k, 1); };
  level(LEVEL0);

  // ------------------------------------------------------------------ the eleven's glasses: wine, and a flare
  const slots = [];
  for (const s of [-1, 1]) PU.forEach((u, i) => { if (!(s === side && i === CHAIR_GONE.i)) slots.push({ u: u + 0.2, v: s * 0.43, ring: s < 0 ? u + 5 : 10 + (5 - u) }); });
  const gring = side < 0 ? u0 + 5 : 10 + (5 - u0);
  const ringOf = (r) => { const d = Math.abs(r - gring); return Math.min(d, 20 - d); };
  slots.sort((p, q) => ringOf(p.ring) - ringOf(q.ring));
  const N = slots.length; // 11
  const wineI = new THREE.InstancedMesh(unit, WINE_MAT, N);
  wineI.frustumCulled = false; wineI.name = 'collation-twelfth-eleven';
  const tm = new THREE.Matrix4(), tp = new THREE.Vector3(), tq = new THREE.Quaternion(), ts = new THREE.Vector3();
  const home = slots.map((s) => { const [x, z] = toWorld(s.u, s.v); return new THREE.Vector3(x, top, z); });
  const setWine = (i, k) => { const h = Math.max(1e-3, 0.03 * k); ts.set(0.0255, h, 0.0255); tp.set(home[i].x, top + 0.067 + h / 2, home[i].z); tm.compose(tp, tq, ts); wineI.setMatrixAt(i, tm); };
  for (let i = 0; i < N; i++) setWine(i, 0);
  wineI.instanceMatrix.needsUpdate = true; wineI.visible = false;
  ctx.scene.add(wineI);

  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  { const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,200,150,1)'); gr.addColorStop(0.2, 'rgba(255,110,70,0.7)'); gr.addColorStop(1, 'rgba(170,24,32,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  // glows are camera-facing quads (the atmosphere's fog patch does not suit THREE.Sprite), turned to the eye while the act runs
  const glows = [], plane = new THREE.PlaneGeometry(1, 1);
  const spr = (size) => { const sp = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); sp.scale.setScalar(size); sp.visible = false; ctx.scene.add(sp); glows.push(sp); return sp; };
  const flares = home.map((p) => { const s = spr(1.0); s.position.set(p.x, top + 0.2, p.z); s.name = 'collation-twelfth-flare'; return s; });
  const hisFlare = spr(1.1); hisFlare.position.set(glassPos.x, top + 0.3, glassPos.z); hisFlare.name = 'collation-twelfth-flare';

  // ------------------------------------------------------------------ the way he was carried: the string, and the glasses at the rests
  const R = (marks || []).slice(0, NREST).map((m) => ({ x: m.x, z: m.z, y: ctx.terrain.heightAt(m.x, m.z) }));
  // the string's corners: off the table toward the visitor and past their shoulder (so it is seen leave), then the rests
  const wnw = { x: Math.cos(-2.62), z: Math.sin(-2.62) }; // the way the furrows go (threads/plan.js CHAIR.drag.bearing)
  const path = [{ x: glassPos.x, z: glassPos.z }, { x: glassPos.x - SA * side * 1.6 + wnw.x * 1.0, z: glassPos.z + CA * side * 1.6 + wnw.z * 1.0 }, ...R]; // cum[i] the length to path[i]
  const cum = [0]; for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z));
  const pointAt = (s, o) => { // s metres along the path
    let i = 1; while (i < path.length - 1 && cum[i] < s) i++;
    const u = Math.min(1, Math.max(0, (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1])));
    o.x = path[i - 1].x + (path[i].x - path[i - 1].x) * u; o.z = path[i - 1].z + (path[i].z - path[i - 1].z) * u; return o;
  };
  const NB = 14, SPACE = 1.5;
  const beads = Array.from({ length: NB }, () => { const s = spr(0.8); s.name = 'collation-twelfth-string'; return s; });
  const restGeo = (() => { const B = new Acc(rng); glass(B, (y, k) => mat(0, y, 0, 0, 0, 0, k), 1.9);
    B.add(unit, mat(0, (0.066 + 0.002) * 1.9 + 0.017 * 1.9, 0).scale(scl(0.0255 * 1.9, 0.034 * 1.9, 0.0255 * 1.9)), WINE, 0);
    B.add(new THREE.DodecahedronGeometry(0.2, 0), mat(0, -0.03, 0, 0, 0.5, 0).scale(scl(1.2, 0.35, 1.0)), '#6a665e', 0.1); // the flat stone it stands on
    return B.geometry(); })();
  const restMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0, side: THREE.DoubleSide, emissive: '#5a1a1a', emissiveIntensity: 0.6 });
  const restGlass = R.map((r, k) => { const m = new THREE.Mesh(restGeo, restMat); m.position.set(r.x + 0.55, r.y + 0.04, r.z + 0.25 * (k % 2 ? -1 : 1)); m.rotation.y = rng() * 6; m.castShadow = true; m.visible = false; m.name = 'collation-twelfth-rest'; ctx.scene.add(m); return m; });
  const restFlare = R.map((r, k) => { const s = spr(1.4); s.position.set(r.x + 0.55, r.y + 0.5, r.z + 0.25 * (k % 2 ? -1 : 1)); s.name = 'collation-twelfth-flare'; return s; });

  // ------------------------------------------------------------------ the act
  const at = { x: glassPos.x, y: top + 0.2, z: glassPos.z };
  const nrm = { x: -SA * side, z: CA * side }; // out from the table on his side (the table's v runs (-SA, CA))
  let run = null;
  const o = { x: 0, z: 0 };
  function frame(dt) {
    if (!run) return;
    const t = (run.t += dt), K = run.k;
    for (const g of glows) if (g.visible) g.quaternion.copy(ctx.camera.quaternion);
    // the pour
    if (t < T_BACK + 0.05) {
      const p = t < T_POUR ? t / T_POUR : t < T_POURED ? 1 : Math.max(0, 1 - (t - T_POURED) / (T_BACK - T_POURED));
      poseBottle(p, t > T_POUR && t < T_POURED ? 0.25 * (t - T_POUR) / (T_POURED - T_POUR) : 0);
      const f = t < T_POUR + 0.15 ? LEVEL0 : Math.min(1, LEVEL0 + (1 - LEVEL0) * (t - T_POUR - 0.15) / (T_POURED - T_POUR - 0.15)), s = level(f);
      const pouring = t > T_POUR + 0.15 && t < T_POURED + 0.1;
      stream.visible = pouring;
      if (pouring) { const h = mouth.y - s; stream.scale.set(0.011, Math.max(1e-3, h), 0.011); stream.position.set(mouth.x - dirU.x * 0.02, s + h / 2, mouth.z - dirU.z * 0.02); }
      setStain(Math.max(0, Math.min(1, (t - T_POURED + 0.3) / 0.9)));
      if (t >= T_BACK) { poseBottle(0); run.poured = true; }
    }
    // the eleven
    let any = false;
    for (let i = 0; i < N; i++) {
      const u = t - (T_RIPPLE + i * PER), s = flares[i];
      if (u < 0) continue;
      setWine(i, Math.min(1, u / 0.5)); any = true;
      s.visible = u < 1.8; s.material.opacity = u < 0.15 ? u / 0.15 : Math.max(0, 1 - (u - 0.15) / 1.6) * 0.9;
    }
    if (any) wineI.instanceMatrix.needsUpdate = true;
    { const u = t - (T_RIPPLE + N * PER + 0.1); if (u >= 0) { hisFlare.visible = u < 2.4; hisFlare.material.opacity = u < 0.2 ? u / 0.2 : Math.max(0, 1 - (u - 0.2) / 2.1) * 0.8; } }
    // the string, and what it finds
    if (t > T_STRING) {
      const head = (t - T_STRING) * V_STRING, last = cum[K + 1] || 0;
      for (let i = 0; i < NB; i++) {
        const s = head - i * SPACE, b = beads[i];
        b.visible = s > 0 && s <= last + 0.1;
        if (!b.visible) continue;
        pointAt(Math.min(s, last), o); b.position.set(o.x, ctx.terrain.heightAt(o.x, o.z) + 0.8 + 0.15 * Math.sin(t * 6 + i), o.z);
        b.material.opacity = (1 - i / NB) * 0.9;
      }
      for (let k = 1; k <= K; k++) {
        const u = (head - cum[k + 1]) / V_STRING; // seconds since the head arrived
        if (u < 0) continue;
        restGlass[k - 1].visible = true;
        const f = restFlare[k - 1]; f.visible = u < 3; f.material.opacity = u < 0.2 ? u / 0.2 : Math.max(0, 1 - (u - 0.2) / 2.6);
      }
      if (head > last + NB * SPACE + 2.5 * V_STRING) run.done = true;
    }
    for (const g of glows) if (g.visible) g.quaternion.copy(ctx.camera.quaternion);
    if (run.done) { run = null; for (const s of [...flares, hisFlare, ...beads, ...restFlare]) s.visible = false; }
  }
  ctx.registerUpdate(frame, { pos: { x: at.x, z: at.z }, near: 600, hz: 30 });

  const set = (n) => { // the remembered state: the goblet full, the stain, the eleven poured, the rests the visitor has opened
    const on = n > 0;
    level(on ? 1 : LEVEL0); setStain(on ? 1 : 0); poseBottle(0); stream.visible = false;
    wineI.visible = on;
    for (let i = 0; i < N; i++) setWine(i, on ? 1 : 0);
    wineI.instanceMatrix.needsUpdate = true;
    restGlass.forEach((m, k) => { m.visible = k < Math.min(n, NREST); });
  };
  const handle = ctx.acts.add({
    id: ID, at, reach: 1.9, rise: 2, face: nrm, cone: 0.45, words: 'Pour for him', every: 'visit',
    show(n) { run = null; for (const s of [...flares, hisFlare, ...beads, ...restFlare]) s.visible = false; set(n); },
    do(n) {
      const K = Math.min(n, R.length);
      run = { t: 0, k: K, done: false }; wineI.visible = true;
      for (let i = 0; i < N; i++) setWine(i, 0);
      wineI.instanceMatrix.needsUpdate = true;
      restGlass.forEach((m, k) => { m.visible = k < K - 1; }); // the newest is found when the string reaches it
      ctx.audio?.cue('act-glasses', { x: at.x, y: at.y, z: at.z });
      return T_STRING + (cum[K + 1] || 0) / V_STRING + 1;
    },
  });
  const out = {
    handle, at, normal: nrm, place: placeMesh, wine: hisWine, bottle, eleven: wineI, rests: restGlass, path, flares, beads, top, T: { T_POUR, T_POURED, T_BACK, T_RIPPLE, PER, T_STRING, V_STRING },
    get running() { return !!run; }, get t() { return run ? run.t : -1; },
    // where a visitor stands: 1.25 m out from the table's edge, looking at his place
    stand(d = 1.2) { const x = at.x + nrm.x * d, z = at.z + nrm.z * d; return { x, z, yaw: Math.atan2(-(at.x - x), -(at.z - z)), pitch: Math.atan2(top + 0.15 - (ctx.terrain.heightAt(x, z) + ctx.player.eye), d) }; },
  };
  ctx.storyActs = Object.assign(ctx.storyActs || {}, { chair: out });
  return out;
}
