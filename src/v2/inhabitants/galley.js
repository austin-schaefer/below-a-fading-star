// I. The Sable Galley [Proposed]: a long black galley on Lees Tarn, with no sail, no mast, no oars and
// no one aboard; a crescent hull whose stern and prow rise high and curl inward, a low deckhouse, a lantern
// that is never lit. It crosses the tarn behind the woman who stands in it, slowly, to a muffled drum,
// lies a minute in the shadow of the far reeds, and comes back by the southern water.
import * as THREE from 'three';
import { Painter, paintedMaterial, approach } from '../../fauna/uncanny/kit.js';
import { smoothstep, clamp } from '../../fauna/geo.js';
import { hyp } from '../../noise.js';

const HULL = '#030304', TRIM = '#060506', DECK = '#08070a', IRON = '#0b0a0a', GLASS = '#0d0b08';
const LEN = 20;           // hull length between the posts' feet; the posts carry it to about 22 m overall
const SPEED = 1.2;

// Hull stations: s in -1 (stern) .. 1 (prow).
const beam = (s) => 1.55 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(s), 2.4)), 0.55);
const draft = (s) => 0.85 * (1 - Math.pow(Math.abs(s), 3)) + 0.05;
const sheer = (s) => 0.62 + (s > 0 ? 2.1 : 2.7) * Math.pow(smoothstep(0.4, 1, Math.abs(s)), 2.2);

function galleyGeometry(low) {
  const P = new Painter();
  const NA = low ? 10 : 12, NL = low ? 28 : 38;
  // ---- the hull: an open shell, U in section, sharp at both ends, the sheer sweeping up
  P.paint(HULL, 0, 0.22);
  P.sheet(NA, NL, (u, v, o) => {
    const s = v * 2 - 1, th = Math.PI * u;     // u: port gunwale (0) under the keel to starboard (1)
    const b = beam(s), d = draft(s), h = sheer(s);
    const sn = Math.pow(Math.sin(th), 0.55);
    o[0] = -Math.cos(th) * b; o[1] = h - (h + d) * sn; o[2] = s * LEN / 2;
    // a faint keel line
    if (Math.abs(u - 0.5) < 0.04) o[1] -= 0.08 * (1 - Math.abs(s));
  });
  // ---- the wales: two heavy rubbing strakes along each side
  P.paint(TRIM, 0, 0.4);
  for (const sx of [-1, 1]) for (const [off, rr] of [[0.0, 0.07], [-0.32, 0.05]]) {
    const pts = [], rad = [];
    for (let k = 0; k <= 22; k++) {
      const s = -0.96 + (k / 22) * 1.92, b = beam(s), h = sheer(s);
      const th = 0.12 - off * 0.25, sn = Math.pow(Math.sin(th), 0.55);
      pts.push([sx * (Math.cos(th) * b + 0.02), h - (h + draft(s)) * sn + off, s * LEN / 2]); rad.push(rr * (0.5 + 0.5 * Math.sqrt(b / 1.55)));
    }
    P.loft(pts, rad, 4, 0, false);
  }
  // ---- the deck, a little below the gunwale
  P.paint(DECK, 0, 0.75);
  P.sheet(4, low ? 14 : 20, (u, v, o) => {
    const s = -0.82 + v * 1.64, b = beam(s) * 0.97, h = sheer(s);
    const y = Math.min(h - 0.12, 0.55 + 0.25 * smoothstep(0.5, 0.82, Math.abs(s)));
    o[0] = (u * 2 - 1) * b; o[1] = y + 0.04 * (1 - (u * 2 - 1) ** 2); o[2] = s * LEN / 2;
  });
  // ---- the posts: the prow lifts and curls back on itself; the stern rises higher and leans in over the deck
  P.paint(HULL, 0, 0.25);
  const post = (sign, pts, r0, r1) => {
    // thick and deep where it grows out of the hull, thinning into the scroll
    const rad = pts.map((_, k) => { const f = k / (pts.length - 1), r = r1 + (r0 - r1) * Math.pow(1 - f, 1.6); return [r, r * (1.2 + 1.6 * (1 - f))]; });
    P.loft(pts.map(([y, z]) => [0, y, sign * z]), rad, 6, 0, true);
  };
  // a scroll: from the given start, round a centre, the radius closing to rEnd (in the post's (y, z) plane)
  const scroll = (cy, cz, r0, a0, a1, rEnd, n) => { const out = []; for (let k = 1; k <= n; k++) { const f = k / n, a = a0 + (a1 - a0) * f, r = r0 + (rEnd - r0) * Math.pow(f, 0.8); out.push([cy + Math.sin(a) * r, cz + Math.cos(a) * r]); } return out; };
  const nC = low ? 9 : 14;
  // prow: up the stem, leaning out, then over and back into a scroll
  post(1, [[-0.3, 9.85], [1.2, 9.95], [2.6, 10.2], [3.6, 10.55], [4.3, 10.9], ...scroll(4.3, 10.35, 0.55, 0, Math.PI * 1.75, 0.12, nC)], 0.2, 0.04);
  // stern: taller, its head bowed forward over the deck
  post(-1, [[-0.3, 9.85], [1.4, 9.95], [3.0, 10.25], [4.2, 10.6], [5.2, 11.0], [5.9, 11.15], ...scroll(5.9, 10.5, 0.65, 0, Math.PI * 1.7, 0.13, nC)], 0.22, 0.045);
  // ---- the deckhouse, low and long, aft of the middle; a roof like a closed bivalve
  P.paint(DECK, 0, 0.7);
  const dz0 = -6.2, dz1 = -1.4, dw = 1.0, dh = 0.95, dy = 0.58;
  P.box(0, dy + dh / 2, (dz0 + dz1) / 2, dw * 2, dh, dz1 - dz0);
  P.paint(TRIM, 0, 0.45);
  P.sheet(8, 6, (u, v, o) => {
    const x = (u * 2 - 1) * (dw + 0.15), z = dz0 - 0.15 + v * (dz1 - dz0 + 0.3);
    o[0] = x; o[1] = dy + dh + 0.04 + 0.32 * (1 - (u * 2 - 1) ** 2) * (1 - 0.3 * (v * 2 - 1) ** 2); o[2] = z;
  });
  // its doorway, a black slot in the forward face
  P.paint('#000000', 0, 1);
  P.box(0, dy + 0.42, dz1 + 0.005, 0.5, 0.8, 0.02);
  // a low rail along each side of the deck, posts and a cap
  P.paint(TRIM, 0, 0.5);
  for (const sx of [-1, 1]) {
    const pts = [];
    for (let k = 0; k <= 12; k++) { const s = -0.62 + (k / 12) * 1.18; pts.push([sx * beam(s) * 0.93, sheer(s) + 0.32, s * LEN / 2]); }
    P.loft(pts, pts.map(() => 0.03), 4, 0, false);
    for (let k = 0; k <= 12; k += 2) { const p = pts[k]; P.loft([[p[0], p[1] - 0.34, p[2]], [p[0], p[1], p[2]]], [0.025, 0.025], 4, 0, false); }
  }
  // ---- the lantern: an iron arm off the stern, a cage and dark glass; never lit
  P.paint(IRON, 0.6, 0.5);
  P.loft([[0, 1.3, -8.4], [0, 2.6, -8.3], [0, 3.1, -7.8], [0, 3.05, -7.3]], [0.04, 0.035, 0.03, 0.025], 5, 0, false);
  const lx = 0, ly = 2.6, lz = -7.3;
  P.loft([[lx, ly + 0.45, lz], [lx, ly + 0.3, lz]], [0.008, 0.008], 4, 0, false);
  P.lathe(lx, ly + 0.2, lz, [[0.15, 0], [0.07, 0.07], [0.02, 0.1], [0, 0.11]], 8);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) P.box(lx + sx * 0.1, ly + 0.03, lz + sz * 0.1, 0.02, 0.32, 0.02);
  P.box(lx, ly - 0.14, lz, 0.24, 0.035, 0.24);
  P.paint(GLASS, 0.2, 0.12);
  P.box(lx, ly + 0.03, lz, 0.17, 0.28, 0.17);
  return P.geometry();
}

// Path: a closed loop over the deep water, longer east to west. The northern leg runs behind the woman
// as you see her from the causeway side; the far western end lies in the bank's shadow by the reeds,
// where it waits; the southern leg brings it back.
function makePath(T) {
  const C = { x: -92, z: 104 }, a = 37, aW = 40, bN = 25, bS = 20;   // the west end reaches nearer the reeds
  const pts = [];
  const N = 16;
  for (let k = 0; k < N; k++) {
    const ph = -(k / N) * Math.PI * 2;               // east, then north, west, south
    const sn = Math.sin(ph);
    const cs = Math.cos(ph);
    pts.push(new THREE.Vector3(C.x + cs * (cs < 0 ? aW : a), T.y, C.z + sn * (sn < 0 ? bN : bS)));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  // a lookup table at even arc length
  const M = 600, xs = new Float32Array(M), zs = new Float32Array(M), tx = new Float32Array(M), tz = new Float32Array(M);
  const p = new THREE.Vector3(), t = new THREE.Vector3();
  let west = 0, minX = 1e9;
  for (let i = 0; i < M; i++) {
    curve.getPointAt(i / M, p); curve.getTangentAt(i / M, t);
    xs[i] = p.x; zs[i] = p.z; const l = Math.hypot(t.x, t.z) || 1; tx[i] = t.x / l; tz[i] = t.z / l;
    if (p.x < minX) { minX = p.x; west = i; }
  }
  return { length: curve.getLength(), M, xs, zs, tx, tz, pauseU: west / M };
}

function wakeMesh(K, waterY) {
  // three soft strips: the two arms of the V off the prow, and the wash behind the stern
  const strips = 3, across = 3, nv = strips * K * across;
  const pos = new Float32Array(nv * 3), al = new Float32Array(nv), uu = new Float32Array(nv);
  const idx = [];
  for (let s = 0; s < strips; s++) for (let k = 0; k < K; k++) for (let j = 0; j < across; j++) {
    const i = (s * K + k) * across + j; uu[i] = j - 1; pos[i * 3 + 1] = waterY;
    if (k < K - 1 && j < across - 1) { const a = i, b = i + 1, c = i + across + 1, d = i + across; idx.push(a, d, c, a, c, b); }
  }
  const g = new THREE.BufferGeometry();
  const pa = new THREE.BufferAttribute(pos, 3); pa.setUsage(THREE.DynamicDrawUsage);
  const aa = new THREE.BufferAttribute(al, 1); aa.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('position', pa); g.setAttribute('aAlpha', aa); g.setAttribute('aU', new THREE.BufferAttribute(uu, 1));
  g.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uCol: { value: new THREE.Color(0.42, 0.36, 0.4) } }]),
    vertexShader: `
      attribute float aAlpha; attribute float aU; varying float vA; varying float vU;
      #include <fog_pars_vertex>
      void main(){ vA = aAlpha; vU = aU; vec3 transformed = position; vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0); gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform vec3 uCol; varying float vA; varying float vU;
      #include <fog_pars_fragment>
      void main(){ float e = 1.0 - abs(vU); gl_FragColor = vec4(uCol, vA * e * e);
        #include <fog_fragment>
      }`,
    transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = 'inhabitants-galley-wake';
  mesh.renderOrder = 11;   // over the water surface (renderOrder 10)
  return { mesh, pos, al, pa, aa, strips, across };
}

export function buildGalley(ctx) {
  const { scene, camera, terrain } = ctx;
  const low = ctx.quality === 'low';
  const W = ctx.water?.tarn || { x: -90, z: 110, r: 60, y: -4.6 };
  const geo = galleyGeometry(low);
  const mat = paintedMaterial({ side: THREE.DoubleSide, envMapIntensity: 1 });
  const hull = new THREE.Mesh(geo, mat);
  hull.name = 'inhabitants-galley'; hull.castShadow = true; hull.receiveShadow = true;
  scene.add(hull);

  const path = makePath(W);
  // check the whole hull stays over deep water, a good way from any shore
  let worst = -1e9, worstAt = null;
  for (let i = 0; i < path.M; i += 3) for (const f of [-11, -5, 0, 5, 11]) for (const sd of [-2, 0, 2]) {
    const x = path.xs[i] + path.tx[i] * f - path.tz[i] * sd, z = path.zs[i] + path.tz[i] * f + path.tx[i] * sd;
    const h = terrain.heightAt(x, z);
    if (h > worst) { worst = h; worstAt = [x.toFixed(1), z.toFixed(1)]; }
  }
  let nearShore = 1e9;
  for (let i = 0; i < path.M; i += 6) for (let a = 0; a < 24; a++) {
    // distance to the nearest dry ground, sampled on rays out from the path
    const an = (a / 24) * Math.PI * 2;
    for (let r = 1; r < 30; r += 1) {
      if (terrain.heightAt(path.xs[i] + Math.cos(an) * r, path.zs[i] + Math.sin(an) * r) > W.y) { nearShore = Math.min(nearShore, r); break; }
    }
  }
  if (worst > W.y - 1.5) ctx.log(`galley: path grounds at ${worstAt} (bed ${worst.toFixed(2)})`);

  const K = 34, HIST_DT = 0.45;
  const wake = wakeMesh(K, W.y + 0.04);
  // the wake never leaves the tarn: a fixed sphere round the water lets it be culled
  wake.mesh.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(W.x, W.y, W.z), W.r + 20);
  scene.add(wake.mesh);
  // history of the hull's centre, heading and speed, sampled every HIST_DT
  const H = { x: new Float32Array(K), z: new Float32Array(K), tx: new Float32Array(K), tz: new Float32Array(K), v: new Float32Array(K), t: new Float32Array(K), head: 0, n: 0, acc: 0 };

  const S = { u: 0.62, v: SPEED, wait: 0, waited: false, drumT: 1, x: 0, z: 0, tx: 1, tz: 0, held: false };
  const sample = (u, out) => {
    const f = ((u % 1) + 1) % 1 * path.M, i = Math.floor(f), j = (i + 1) % path.M, r = f - i;
    out.x = path.xs[i] + (path.xs[j] - path.xs[i]) * r; out.z = path.zs[i] + (path.zs[j] - path.zs[i]) * r;
    let tx = path.tx[i] + (path.tx[j] - path.tx[i]) * r, tz = path.tz[i] + (path.tz[j] - path.tz[i]) * r; const l = Math.hypot(tx, tz) || 1;
    out.tx = tx / l; out.tz = tz / l;
  };
  sample(S.u, S);
  const wp = { x: 0, z: 0 };
  const lookAhead = { x: 0, z: 0, tx: 0, tz: 0 };

  const WAKE_NEAR = 160;
  function update(dt, t) {
    // ---- along the loop; slowing into the western pause, a minute's wait, and away
    const toPause = (((path.pauseU - S.u) % 1) + 1) % 1 * path.length;   // metres ahead to the pause point
    let target = SPEED;
    if (S.wait > 0) { target = 0; S.wait -= dt; }
    else if (!S.waited && toPause < 9) { target = SPEED * Math.max(0.0, (toPause - 0.3) / 9); if (toPause < 0.6) { S.wait = 60; S.waited = true; } }
    if (S.waited && toPause > 20 && toPause < path.length - 20) S.waited = false;
    // the woman in the tarn: never run her down; hold off while she is in the way ahead
    const wo = ctx.tarnWoman;
    S.held = false;
    if (wo && wo.visible) {
      sample(S.u + 9 / path.length, lookAhead);
      const dx = wo.position.x - lookAhead.x, dz = wo.position.z - lookAhead.z;
      const along = dx * lookAhead.tx + dz * lookAhead.tz, side = Math.abs(dx * lookAhead.tz - dz * lookAhead.tx);
      if (side < 4.5 && along > -14 && along < 6) { target = 0; S.held = true; }
    }
    S.v = approach(S.v, target, 0.35, dt);
    S.u = (S.u + S.v * dt / path.length) % 1;
    sample(S.u, S);
    // ---- the hull: riding low, the faintest roll and pitch
    const yaw = Math.atan2(S.tx, S.tz);
    hull.position.set(S.x, W.y - 0.05 + Math.sin(t * 0.47) * 0.03, S.z);
    hull.rotation.set(Math.sin(t * 0.31 + 1) * 0.006, yaw, Math.sin(t * 0.39) * 0.012, 'YXZ');

    // ---- the drum, slow and muffled, while you are within earshot
    const cam = camera.position;
    const dist = hyp(cam.x - S.x, cam.z - S.z);
    if ((S.drumT -= dt) <= 0) {
      S.drumT += 2.4;
      if (dist < 120) ctx.audio?.cue?.('galley-drum', hull.position, { distance: dist });
    }

    // ---- the wake (v3 stage 2: the strip is rebuilt only within 160 m; the history is kept regardless)
    H.acc += dt;
    if (H.acc >= HIST_DT || H.n === 0) {
      H.acc = 0; H.head = (H.head + 1) % K;
      H.x[H.head] = S.x; H.z[H.head] = S.z; H.tx[H.head] = S.tx; H.tz[H.head] = S.tz; H.v[H.head] = S.v; H.t[H.head] = t;
      H.n = Math.min(K, H.n + 1);
    }
    if (dist > WAKE_NEAR && ctx.throttle !== false) return;
    const pos = wake.pos, al = wake.al;
    for (let s = 0; s < 3; s++) {
      for (let k = 0; k < K; k++) {
        // k = 0 is now; older samples further down the strip
        let x, z, tx, tz, v, age;
        if (k === 0 || k >= H.n) { x = S.x; z = S.z; tx = S.tx; tz = S.tz; v = S.v; age = 0; if (k > 0) v = 0; }
        else { const h = (H.head - k + 1 + K) % K; x = H.x[h]; z = H.z[h]; tx = H.tx[h]; tz = H.tz[h]; v = H.v[h]; age = t - H.t[h]; }
        const nx = tz, nz = -tx;                     // to starboard
        const life = clamp(1 - age / (K * HIST_DT), 0, 1);
        let cx, cz, half, a;
        if (s < 2) {
          const side = s === 0 ? -1 : 1;
          const spread = 0.35 + 0.42 * age * Math.max(v, 0.3);
          const back = age * 0.25;                   // the arms trail a little behind where the prow was
          cx = x + tx * (LEN / 2 - 0.4 - back) + nx * side * spread; cz = z + tz * (LEN / 2 - 0.4 - back) + nz * side * spread;
          half = 0.22 + 0.06 * age; a = 0.3 * life * life * smoothstep(0, 0.8, age + 0.2);
        } else {
          cx = x - tx * (LEN / 2 - 1.2); cz = z - tz * (LEN / 2 - 1.2);
          half = 0.6 + 0.12 * age; a = 0.14 * life * life;
        }
        a *= clamp(v / SPEED, 0, 1);
        // across the strip: perpendicular to the strip's own direction (the V arms angle outward)
        let ax = nx, az = nz;
        if (s < 2) { const side = s === 0 ? -1 : 1, sl = 0.42 * Math.max(v, 0.3); ax = nx - tx * side * sl * 0.6; az = nz - tz * side * sl * 0.6; const l = hyp(ax, az); ax /= l; az /= l; }
        for (let j = 0; j < 3; j++) {
          const i = (s * K + k) * 3 + j;
          pos[i * 3] = cx + ax * (j - 1) * half; pos[i * 3 + 2] = cz + az * (j - 1) * half;
          al[i] = a;
        }
      }
    }
    wake.pa.needsUpdate = true; wake.aa.needsUpdate = true;
  }
  ctx.registerUpdate(update);

  return {
    api: {
      mesh: hull, state: S, path,
      check: { bedMax: worst, nearestShore: nearShore, length: path.length },
      // test hook: put it at a point of the loop (0..1)
      tick: (dt, t) => update(dt, t),
      setU(u) { S.u = u; sample(u, S); H.n = 0; },
    },
    drawCalls: 2, tris: geo.index.count / 3 + (K - 1) * 3 * 4,
  };
}
