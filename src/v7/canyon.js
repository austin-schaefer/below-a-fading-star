// v7, the living: the Tumbling Water's canyon (world module living-canyon; ?canyon=0 leaves it out).
//
// CE The Bather (IDEAS-v5.md CE; wilderness-v5.md "### CE. The Bather"; ?bather=0): "Seen only from the canyon's rim: a
// woman eight metres tall reclining in the slow pool below the second rapid, pale shoulders and hair in the water,
// washing one arm with slow care. She never looks up. Climb down into the Clough and there are only long pale stones in
// the river and the water moving round them." Austin: "a classy, featureless nude". She lies along the pool below the
// second rapid, head upstream, so the rim at SITES.bather.rim sees her whole length. The swap, by the walker's height:
// she is shown while the walker's feet are SHOW_RISE or more above the pool's water and MIN_DIST or more from her, the
// stones otherwise (hysteresis 1.5 m on the height). It is made only while she is out of the camera's view (a frustum
// widened by 10 degrees) or behind the canyon's wall (sight lines to her head, middle and knee against the drawn
// ground); if the walker has wanted the other for 4 s in view, the two cross-fade over 1.2 s by a dithered screen
// door, never a pop. From the rim, at each turn of her stroke (every 8 s), the cue 'bather-pour'.
//
// CX The Toadstone (IDEAS-v5.md CX; "### CX. The Toadstone"; ?toadstone=0): "A fat toad on a wet ledge of the Clough
// with a red stone set in its forehead like a cabochon, which glows faintly when the sun gutters. It never moves."
// Austin: without the turning-to-face-you. On drawn ground under 20 degrees within 2 m of SITES.toadstone, seen from the
// rim path, nearest the lip.
//
// The forms are in canyon/: bather.js (the figure, the stones, their material), toad.js, nets.js. DP the Luminous Reach
// is reach.js (shader chunks in the river's and the fen's materials). No heightfield change, no clearance, no light.
// ctx.canyon = { bather, toad, stats(), inView(), want(), hold(f | null) }.
import * as THREE from 'three';
import { SITES } from '../world.js';
import { hyp } from '../noise.js';
import { meshHeightSampler } from '../water/river.js';
import { SPAN, spanClear } from '../v4/span/plan.js';
import { buildForms, stoneMaterial, ARM, STROKE, STONE_PARTS } from './canyon/bather.js';
import { buildToad, glowAt, TOAD } from './canyon/toad.js';

const Q = new URLSearchParams(location.search);
const OFF = Q.get('canyon') === '0';
const BATHER = Q.get('bather') !== '0', TOADSTONE = Q.get('toadstone') !== '0';

// The rule (wilderness-v5.md, "### CE. The Bather"): the rim at SITES.bather.rim stands 6.0 m over the pool's water,
// so the plan's 7 m would never show her there; 5 m does, and the canyon's floor beside her stays under 2.5 m.
export const SWAP = { showRise: 5.0, hideRise: 3.5, minDist: 10, hold: 4, fade: 1.2, margin: 10 * Math.PI / 180 };

export async function build(ctx) {
  if (OFF) { ctx.canyon = { off: true }; return; }
  const { scene, terrain } = ctx;
  const RV = terrain.river, low = ctx.quality === 'low';
  const meshH = meshHeightSampler(terrain);
  const api = { bather: null, toad: null };
  ctx.canyon = api;
  const updates = [];

  // ---------------------------------------------------------------- CE the Bather
  if (BATHER) {
    await ctx.progress?.('the pool below the second rapid', 0.1);
    const L = RV.line, W = RV.levelAt;
    const at = (s) => { let i = 0; while (i < L.n - 2 && L.S[i + 1] < s) i++; const f = Math.max(0, Math.min(1, (s - L.S[i]) / (L.S[i + 1] - L.S[i]))); return { x: L.X[i] + (L.X[i + 1] - L.X[i]) * f, z: L.Z[i] + (L.Z[i + 1] - L.Z[i]) * f }; };
    // the second rapid from the roughness of the water's fall, and the widening pool below it
    const rough = (s) => (W(s - 1.2) - W(s + 1.2)) / 2.4;
    const rapids = [];
    for (let s = 6, inR = false; s < RV.fenEnter; s += 0.5) { const r = rough(s) > 0.12; if (r && !inR) rapids.push([s, s]); if (r) rapids[rapids.length - 1][1] = s; inR = r; }
    const site = SITES.bather, q = terrain.riverAt(site.x, site.z, {});
    const sc = Math.max(q.s, (rapids[1] ? rapids[1][1] : 58.5) + 4.8); // her head clear of the rapid's foot
    const hw = RV.halfWidthAt(sc), dc = Math.max(-(hw - 2.6), Math.min(hw - 2.6, q.d)); // in the water, her far arm short of the bank
    const a = at(sc - 2), b = at(sc + 2), tl = hyp(b.x - a.x, b.z - a.z);
    const tx = (b.x - a.x) / tl, tz = (b.z - a.z) / tl; // downstream
    const p0 = at(sc), cx = p0.x + tz * dc, cz = p0.z - tx * dc; // + d is left of downstream: (tz, -tx)
    const U = [-tx, -tz];                                   // her length, toward the head: upstream
    let V = [tz, -tx];                                       // across, toward the rim's side
    if ((site.rim[0] - cx) * V[0] + (site.rim[1] - cz) * V[1] < 0) V = [-V[0], -V[1]];
    const waterY = W(sc), slope = (W(sc - 1) - W(sc + 1)) / 2; // the surface rises toward her head
    const frame = { U, V };
    const toWorld = (u, y, v) => [u * U[0] + v * V[0], y + slope * u, u * U[1] + v * V[1]];
    const forms = buildForms(toWorld, frame, low);
    await ctx.progress?.('the pool below the second rapid', 0.6);

    // the stroke: the forearm turns about the elbow, its axis across the forearm and the way the hand travels
    const E = toWorld(...ARM.elbow), Wr = toWorld(...ARM.wrist), Tr = toWorld(...STROKE.travel);
    const Fv = new THREE.Vector3(Wr[0] - E[0], Wr[1] - E[1], Wr[2] - E[2]), Tv = new THREE.Vector3(Tr[0], Tr[1] - slope * STROKE.travel[0], Tr[2]);
    const axis = new THREE.Vector3().crossVectors(Fv, Tv).normalize();
    const shared = {
      uTime: { value: 0 }, uStroke: { value: STROKE.angle },
      uElbow: { value: new THREE.Vector3(...E) }, uAxis: { value: axis },
      uWaterP: { value: new THREE.Vector4(cx, cz, waterY, slope) }, uWaterD: { value: new THREE.Vector2(U[0], U[1]) },
      uFoamCol: { value: new THREE.Color('#b8aea6') }, uSunView: { value: new THREE.Vector3(0, 1, 0) }, uWrapCol: { value: new THREE.Color(0, 0, 0) },
    };
    const matB = stoneMaterial(shared, false), matS = stoneMaterial(shared, true);
    const still = { ...shared, uStroke: { value: 0 } }; // the stones: the same program, no stroke
    matS.onBeforeCompile = ((f) => (sh) => { f(sh); Object.assign(sh.uniforms, { uStroke: still.uStroke }); })(matS.onBeforeCompile);
    const bather = new THREE.Mesh(forms.bather, matB), stones = new THREE.Mesh(forms.stones, matS);
    for (const m of [bather, stones]) { m.position.set(cx, waterY, cz); m.receiveShadow = true; m.castShadow = false; m.renderOrder = 2; scene.add(m); }
    bather.name = 'living-canyon-bather'; stones.name = 'living-canyon-stones';

    // colliders: the stones' masses (they stand for her too); live only for feet near the water's level
    for (const [A, B, ra, rb] of STONE_PARTS) {
      const n = Math.max(2, Math.ceil(hyp(B[0] - A[0], B[2] - A[2]) / 0.6));
      for (let k = 0; k <= n; k++) {
        const f = k / n, u = A[0] + (B[0] - A[0]) * f, v = A[2] + (B[2] - A[2]) * f, w = toWorld(u, 0, v);
        ctx.addCollider({ x: cx + w[0], z: cz + w[2], r: (ra + (rb - ra) * f) * 0.85, y: waterY - 1.6, h: 2.1 });
      }
    }

    // the swap
    const centre = { x: cx, z: cz };
    const H = toWorld(3.6, 0.9, 0), K = toWorld(-1.75, 0.3, 0.5), M = toWorld(1.2, 0.4, 0), Hd = toWorld(...ARM.hand);
    const targets = [H, M, K].map((w) => new THREE.Vector3(cx + w[0], waterY + w[1], cz + w[2]));
    const handW = new THREE.Vector3(cx + Hd[0], waterY + Hd[1], cz + Hd[2]);
    const sphere = new THREE.Sphere(new THREE.Vector3(cx, waterY + 0.5, cz), 5.6);
    const frustum = new THREE.Frustum(), pmW = new THREE.Matrix4(), pm = new THREE.Matrix4();
    let pFov = -1, pAsp = -1, pNear = -1;
    const st = { f: 0, target: 0, held: 0, fading: 0, swaps: 0, fades: 0, popsInView: 0, cues: 0, lastK: null, hold: null, rise: 0, dist: 0, seen: false };
    const occluded = (cam) => {
      for (const T of targets) {
        let hit = false;
        const dx = T.x - cam.x, dy = T.y - cam.y, dz = T.z - cam.z, len = hyp(dx, dz), n = Math.min(40, Math.max(8, Math.ceil(len / 1.5)));
        for (let k = 1; k < n; k++) { const f = k / n; if (meshH(cam.x + dx * f, cam.z + dz * f) > cam.y + dy * f + 0.25) { hit = true; break; } }
        if (!hit) return false;
      }
      return true;
    };
    const inView = () => {
      const cam = ctx.camera;
      if (cam.fov !== pFov || cam.aspect !== pAsp || cam.near !== pNear) {
        pFov = cam.fov; pAsp = cam.aspect; pNear = cam.near;
        const vf = cam.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * cam.aspect);
        const top = cam.near * Math.tan(Math.min(3.0, vf + 2 * SWAP.margin) / 2), right = cam.near * Math.tan(Math.min(3.0, hf + 2 * SWAP.margin) / 2);
        pmW.makePerspective(-right, right, top, -top, cam.near, cam.far);
      }
      cam.updateMatrixWorld();
      pm.multiplyMatrices(pmW, cam.matrixWorldInverse);
      frustum.setFromProjectionMatrix(pm);
      return frustum.intersectsSphere(sphere) && !occluded(cam.position);
    };
    const want = () => {
      const p = ctx.player, feet = p.pos.y - (p.eye ?? 1.72);
      st.rise = feet - waterY; st.dist = hyp(p.pos.x - cx, p.pos.z - cz);
      const need = st.target === 1 ? SWAP.hideRise : SWAP.showRise;
      return st.rise >= need && st.dist >= SWAP.minDist ? 1 : 0;
    };
    const apply = () => {
      matB.userData.uniforms.uFade.value = st.f; matS.userData.uniforms.uFade.value = 1 - st.f;
      bather.visible = st.f > 0; stones.visible = st.f < 1;
    };
    const sunV = new THREE.Vector3(), sunW = new THREE.Vector3(ctx.sun.dir.x, ctx.sun.dir.y, ctx.sun.dir.z).normalize();
    const sunCol = new THREE.Color(ctx.palette.sunLight);
    updates.push((dt, t) => {
      shared.uTime.value = t;
      const fl = ctx.sky?.flicker?.value ?? 1;
      shared.uWrapCol.value.copy(sunCol).multiplyScalar(0.22 * fl);
      sunV.copy(sunW).transformDirection(ctx.camera.matrixWorldInverse);
      shared.uSunView.value.copy(sunV);
      if (st.hold !== null) { st.f = st.hold; st.target = st.hold >= 0.5 ? 1 : 0; st.fading = 0; apply(); return; }
      const w = want();
      if (st.fading) {
        if (w !== st.target) { st.target = w; st.fading = w ? 1 : -1; } // turned round mid-fade
        st.f = Math.max(0, Math.min(1, st.f + st.fading * dt / SWAP.fade));
        if (st.f === st.target) { st.fading = 0; st.held = 0; }
      } else if (w !== st.target) {
        st.seen = inView();
        if (!st.seen) { st.target = w; st.f = w; st.held = 0; st.swaps++; }
        else if ((st.held += dt) >= SWAP.hold) { st.target = w; st.fading = w ? 1 : -1; st.fades++; st.held = 0; }
      } else st.held = 0;
      apply();
      // from the rim, at each turn of the stroke (the far turn, half-way through each period)
      const k = Math.floor((t - STROKE.period / 2) / STROKE.period);
      if (st.f === 1 && st.rise >= SWAP.hideRise && st.dist < 40 && k !== st.lastK && st.lastK !== null) { st.cues++; ctx.audio?.cue?.('bather-pour', handW); }
      st.lastK = k;
    });
    // start in the state the spawn asks for, so nothing swaps in view on the first frames
    st.target = st.f = want(); apply();
    api.bather = {
      mesh: bather, stones, state: st, centre: { x: cx, z: cz, y: waterY, s: sc, d: dc }, frame: { U, V, slope }, rapids, targets, handW,
      tris: forms.tris, SWAP, inView, want, materials: [matB, matS], uniforms: shared,
      hold(f) { st.hold = f; }, // pin the cross-fade (0 stones .. 1 her), for renders; null lets go
    };
    api.inView = inView; api.want = want;
  }

  // ---------------------------------------------------------------- CX the Toadstone
  if (TOADSTONE) {
    await ctx.progress?.('a wet ledge', 0.8);
    const site = SITES.toadstone, R = site.r;
    const slopeAt = (x, z) => { const e = 0.3, gx = (meshH(x + e, z) - meshH(x - e, z)) / (2 * e), gz = (meshH(x, z + e) - meshH(x, z - e)) / (2 * e); return Math.atan(hyp(gx, gz)); };
    // seen from the rim path (P13): its bend at (174, 224) stands inside the Span's pier 176 (its cutwater runs to z 230),
    // so the sight lines are from the next bend (186, 232) and a step on toward (199, 236), at eye height, clear of the
    // drawn ground and of the pier. Ground cover keeps off the pier's margin (vegetation/ground.js: spanClear at -1.5),
    // so a spot there is bare ledge and the toad is not lost in the grass.
    const T2 = SPAN.pierT / 2, inPier = (x, z) => SPAN.piers.slice(1, -1).some((a) => {
      const dx = Math.abs(x - a), dz = Math.abs(z - SPAN.z) - SPAN.half;
      return dx < T2 && (dz < 0 || dz < 7 * (1 - dx / T2));
    });
    const views = [[186, 232], [190.3, 233.3]];
    const seen = (x, z, y) => views.filter(([vx, vz]) => {
      const ey = meshH(vx, vz) + 1.72, ty = y + 0.08, n = 32;
      for (let k = 1; k < n; k++) {
        const f = k / n, px = vx + (x - vx) * f, pz = vz + (z - vz) * f;
        if (hyp(x - px, z - pz) < 0.3) break;
        if (inPier(px, pz) || meshH(px, pz) > ey + (ty - ey) * f - 0.02) return false;
      }
      return true;
    }).length;
    let best = null;
    for (let dz = -R; dz <= R + 1e-6; dz += 0.25) for (let dx = -R; dx <= R + 1e-6; dx += 0.25) {
      if (hyp(dx, dz) > R) continue;
      const x = site.x + dx, z = site.z + dz, y = meshH(x, z), sl = slopeAt(x, z);
      if (terrain.waterLevelAt(x, z) !== null || inPier(x, z) || inPier(x + 0.4, z) || inPier(x - 0.4, z) || inPier(x, z + 0.4) || inPier(x, z - 0.4)) continue;
      // a ledge: under 20 degrees, seen from the path, bare, and nearest the lip (the deepest drop within 3 m)
      let drop = 0;
      for (let k = 0; k < 8; k++) { const an = k * Math.PI / 4; drop = Math.max(drop, y - meshH(x + Math.cos(an) * 3, z + Math.sin(an) * 3)); }
      const vis = seen(x, z, y), bare = spanClear(x, z, -1.6);
      const score = (sl < 20 * Math.PI / 180 ? 0 : 100 + sl * 10) + (2 - vis) * 20 + (bare ? 0 : 8) - drop;
      if (!best || score < best.score) best = { x, z, y, slope: sl, drop, seen: vis, bare, score };
    }
    // it faces the rim path's bend at (186, 232), where it is seen from
    const spot = { x: best.x, z: best.z, y: best.y, yaw: Math.atan2(-(views[0][1] - best.z), views[0][0] - best.x), lift: 0.004 };
    const toad = buildToad(ctx, spot, meshH, low);
    scene.add(toad.mesh); scene.add(toad.glow);
    toad.mesh.receiveShadow = true; toad.mesh.castShadow = false;
    updates.push(() => {
      const cam = ctx.camera, h = ctx.renderer.domElement.height || 720;
      toad.uScale.value = h / (2 * Math.tan(cam.fov * Math.PI / 360));
      toad.glow.visible = (ctx.sky?.flicker?.value ?? 1) < 0.995; // drawn only while the sun gutters
    });
    api.toad = { mesh: toad.mesh, glow: toad.glow, spot: best, gem: toad.gemWorld, tris: toad.tris, glowAt, TOAD };
  }

  ctx.registerUpdate((dt, t) => { for (let i = 0; i < updates.length; i++) updates[i](dt, t); }, { at: () => (api.bather ? api.bather.centre : SITES.toadstone), near: 120, hz: 4 });

  api.stats = () => {
    const b = api.bather, td = api.toad;
    const calls = (b ? (b.mesh.visible ? 1 : 0) + (b.stones.visible ? 1 : 0) : 0) + (td ? 1 + (td.glow.visible ? 1 : 0) : 0);
    const tris = (b ? (b.mesh.visible ? b.tris.bather : 0) + (b.stones.visible ? b.tris.stones : 0) : 0) + (td ? td.tris : 0);
    const built = (b ? b.tris.bather + b.tris.stones : 0) + (td ? td.tris : 0);
    return { calls, tris: Math.round(tris), built: Math.round(built), lights: 0, f: b ? b.state.f : null, swaps: b ? b.state.swaps : 0, fades: b ? b.state.fades : 0, cues: b ? b.state.cues : 0 };
  };
  ctx.log(`living-canyon: the Bather ${api.bather ? `${api.bather.tris.bather} tris, the stones ${api.bather.tris.stones}` : 'off'}; the Toadstone ${api.toad ? `${api.toad.tris} tris at (${api.toad.spot.x.toFixed(1)}, ${api.toad.spot.z.toFixed(1)}), slope ${(api.toad.spot.slope * 57.3).toFixed(0)} deg` : 'off'}`);
}
