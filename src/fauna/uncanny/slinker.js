// The slinking thing at the edge of vision: a long, low, boneless dark shape on far too many jointed legs.
// It keeps about 30 m off, 50-70 degrees from where you are looking, slinking along with a rippling gait.
// Turn toward it and it flattens itself into the ground, runs for the nearest cover and is gone; some
// while later it is back, on your other side. It keeps out of water and out of the keep.
import * as THREE from 'three';
import { clamp, smoothstep } from '../geo.js';
import { Painter, makeGround, approach, turnToward, DITHER_GLSL } from './kit.js';

function slinkerGeometry(low) {
  const P = new Painter(['aPh']);
  P.paint('#050406', 0.3, 0.38);
  // spine: blunt head, a long jointed trunk, a whip of a tail. Lofted along +z.
  const pts = [], rad = [];
  const n = low ? 46 : 64;
  for (let k = 0; k <= n; k++) {
    const z = -2.1 + (k / n) * 3.65;
    let w, h;
    if (z < -0.8) { const f = (z + 2.1) / 1.3; w = 0.012 + f * f * 0.13; h = 0.01 + f * f * 0.08; }
    else if (z < 1.15) { w = 0.15; h = 0.085; }
    else { const f = (z - 1.15) / 0.4; w = 0.15 - f * 0.09; h = 0.085 + Math.sin(f * Math.PI) * 0.03 - f * 0.04; }
    const joint = z > -1.4 && z < 1.15 ? 0.82 + 0.18 * Math.abs(Math.sin(z * Math.PI / 0.17)) : 1;
    pts.push([0, 0.24 + (z > 1.15 ? -(z - 1.15) * 0.15 : 0), z]);
    rad.push([w * joint, h * joint]);
  }
  P.loft(pts, rad, low ? 6 : 8, 0);
  // legs: fourteen pairs, each three-jointed, knees well above the back
  const pairs = low ? 11 : 14;
  for (let i = 0; i < pairs; i++) {
    const z = -0.75 + (i / (pairs - 1)) * 1.85;
    for (const s of [-1, 1]) {
      P.set('aPh', i * 0.9 + (s > 0 ? Math.PI : 0));
      const spread = 1 + 0.15 * Math.sin(i * 1.7);
      const L = [[s * 0.1, 0.24, z], [s * 0.3 * spread, 0.6, z + 0.04], [s * 0.36 * spread, 0.62, z + 0.05], [s * 0.6 * spread, 0.4, z + 0.09], [s * 0.74 * spread, 0.0, z + 0.05]];
      const R = [0.024, 0.017, 0.02, 0.012, 0.004];
      P.loft(L, R, 4, (p) => clamp((Math.abs(p[0]) - 0.1) / 0.64, 0, 1));
    }
  }
  // feelers at the head, long as fingers, tapping
  for (const s of [-1, 0, 1]) {
    P.set('aPh', 2 + s * 1.3);
    P.loft([[s * 0.04, 0.2, 1.48], [s * 0.12, 0.3, 1.8], [s * 0.18, 0.04, 2.15]], [0.014, 0.01, 0.003], 4, (p) => clamp((p[2] - 1.48) / 0.67, 0, 1));
  }
  return P.geometry();
}

const VERT_PARS = `
  uniform float uPhase; uniform float uMove; uniform float uFlat; uniform float uTime;
  attribute float aW; attribute float aPh;`;
const VERT = `
  {
    float zz = position.z;
    float lat = sin(zz * 2.3 - uPhase * 1.1) * (0.06 + 0.16 * uMove) * smoothstep(1.9, 0.4, zz);
    transformed.x += lat;
    transformed.y += sin(zz * 6.0 - uPhase * 2.3) * 0.022 * (1.0 - aW);
    float st = uPhase * 3.1 + aPh;
    float lift = max(0.0, sin(st));
    transformed.y += aW * (lift * 0.15 * uMove + max(0.0, sin(uTime * 9.0 + aPh * 5.0)) * 0.02 * (1.0 - uMove));
    transformed.z += aW * cos(st) * 0.13 * uMove;
    transformed.y *= mix(1.0, 0.06, uFlat);
    transformed.x *= 1.0 + uFlat * 0.55;
  }`;

export function buildSlinker(ctx, U) {
  const { scene, camera } = ctx;
  const rng = ctx.makeRng(9202);
  const ground = makeGround(ctx);
  const rules = U.rules;
  const uni = { uPhase: { value: 0 }, uMove: { value: 0 }, uFlat: { value: 0 }, uTime: { value: 0 }, uFade: { value: 0 } };
  const patch = (sh) => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>' + VERT_PARS).replace('#include <begin_vertex>', '#include <begin_vertex>' + VERT);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uFade;\n' + DITHER_GLSL)
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (fpIGN(gl_FragCoord.xy) > uFade) discard;');
  };
  const mat = new THREE.MeshStandardMaterial({ color: 0x040306, roughness: 0.36, metalness: 0.3 });
  mat.onBeforeCompile = patch;
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depth.onBeforeCompile = patch;
  const geo = slinkerGeometry(ctx.quality === 'low');
  const mesh = new THREE.Mesh(geo, mat);
  mesh.customDepthMaterial = depth;
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.name = 'uncanny-slinker';
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);

  const cam = camera.position, fwd = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), nrm = new THREE.Vector3();
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  const colliders = ctx.controls?.state?.colliders || [];
  const S = { x: 0, z: 0, vx: 0, vz: 0, heading: 0, mode: 'gone', timer: -8, fade: 0, flat: 1, side: 1, tx: 0, tz: 0, hold: false, speed: 0 };
  const pub = ctx.slinker = { position: mesh.position, seen: false, mode: 'gone', fade: 0 };
  const ok = (x, z) => rules.dry(x, z, 0.4) && !rules.inKeep(x, z, 48) && rules.inRegion(x, z, 285) && ctx.terrain.slopeAt(x, z) < 0.8;

  let camBearing = 0, hHalf = 0.9;
  // a point at bearing (radians from camera forward, + is to the camera's left) and distance
  const at = (off, d, out) => { const b = camBearing + off; out[0] = cam.x - Math.sin(b) * d; out[1] = cam.z - Math.cos(b) * d; return out; };
  const pt = [0, 0];
  function lurkTarget() {
    for (const [o, d] of [[1.05, 32], [0.9, 30], [1.2, 34], [0.95, 26], [1.15, 39]]) {
      at(S.side * o, d, pt);
      if (ok(pt[0], pt[1])) { S.tx = pt[0]; S.tz = pt[1]; return true; }
    }
    return false;
  }
  function viewAngle(x, z) {
    const dx = x - cam.x, dz = z - cam.z, l = Math.hypot(dx, dz) || 1;
    return Math.acos(clamp((fwd.x * dx + fwd.z * dz) / l, -1, 1));
  }
  function flee() {
    S.mode = 'flee'; S.timer = 0;
    ctx.audio?.cue?.('slinker-seen', mesh.position);
    // the nearest cover that lies beyond it from you: get behind that; else straight away
    let best = null, bd = 14;
    const ax = S.x - cam.x, az = S.z - cam.z, al = Math.hypot(ax, az) || 1;
    for (const c of colliders) {
      if (c.r < 0.6 || c.r > 4) continue;
      const d = Math.hypot(c.x - S.x, c.z - S.z);
      if (d > bd) continue;
      const cx = c.x - cam.x, cz = c.z - cam.z;
      if ((cx * ax + cz * az) / al < al - 1) continue; // must be farther off than it is
      bd = d; best = c;
    }
    if (best) {
      const cx = best.x - cam.x, cz = best.z - cam.z, cl = Math.hypot(cx, cz) || 1;
      S.tx = best.x + (cx / cl) * (best.r + 0.9); S.tz = best.z + (cz / cl) * (best.r + 0.9);
    } else { S.tx = S.x + (ax / al) * 12; S.tz = S.z + (az / al) * 12; }
  }
  function appear() {
    for (let k = 0; k < 10; k++) {
      at(S.side * (1.05 + (rng() - 0.5) * 0.3), 30 + rng() * 9, pt);
      if (!ok(pt[0], pt[1]) || viewAngle(pt[0], pt[1]) < hHalf + 0.1) continue;
      S.x = pt[0]; S.z = pt[1]; S.vx = S.vz = 0;
      S.heading = Math.atan2(cam.x - S.x, cam.z - S.z) + S.side * 1.4;
      S.mode = 'enter'; S.fade = 0; S.flat = 1;
      return true;
    }
    return false;
  }
  function move(dt, vmax, accel) {
    let dx = S.tx - S.x, dz = S.tz - S.z;
    const d = Math.hypot(dx, dz);
    const sp = Math.min(vmax, d * 0.8);
    const wx = d > 0.01 ? (dx / d) * sp : 0, wz = d > 0.01 ? (dz / d) * sp : 0;
    S.vx = approach(S.vx, wx, accel, dt); S.vz = approach(S.vz, wz, accel, dt);
    const nx = S.x + S.vx * dt, nz = S.z + S.vz * dt;
    if (ok(nx, nz)) { S.x = nx; S.z = nz; }
    else if (ok(nx, S.z)) { S.x = nx; S.vz = 0; }
    else if (ok(S.x, nz)) { S.z = nz; S.vx = 0; }
    else { S.vx = S.vz = 0; }
    S.speed = Math.hypot(S.vx, S.vz);
    if (S.speed > 0.15) S.heading = turnToward(S.heading, Math.atan2(S.vx, S.vz), 2.6 * dt);
  }

  function update(dt, t) {
    uni.uTime.value = t;
    camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    camBearing = Math.atan2(-fwd.x, -fwd.z);
    hHalf = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect);
    if (!S.hold) {
      S.timer += dt;
      if (S.mode === 'gone') {
        if (S.timer > 0 && appear()) S.timer = 0; else if (S.timer > 0) S.timer = -1;
      } else {
        const ang = viewAngle(S.x, S.z), dist = Math.hypot(S.x - cam.x, S.z - cam.z);
        if (S.mode === 'enter') {
          S.fade = Math.min(1, S.fade + dt / 2.5); S.flat = Math.max(0, S.flat - dt / 2);
          if (lurkTarget()) move(dt, 1.2, 2);
          if (S.fade >= 1) S.mode = 'lurk';
          if (ang < 0.6) flee();
        } else if (S.mode === 'lurk') {
          S.flat = approach(S.flat, 0, 3, dt);
          if (!lurkTarget()) S.side = -S.side;
          move(dt, dist > 50 ? 7 : 3.4, 1.6);
          if (ang < 0.52 && dist < 75) flee();
          else if (dist > 90) { S.mode = 'gone'; S.timer = -2; S.fade = 0; }
        } else if (S.mode === 'flee') {
          move(dt, 6.5, 5);
          S.flat = Math.min(1, S.flat + dt / 0.5);
          if (S.timer > 0.6) S.fade = Math.max(0, S.fade - dt / 1.1);
          if (S.fade <= 0) { S.mode = 'gone'; S.timer = -(10 + rng() * 15); S.side = -S.side; ctx.audio?.cue?.('slinker-gone', mesh.position); }
        }
      }
    }
    pub.mode = S.mode; pub.fade = S.fade;
    const vis = S.mode !== 'gone' && S.fade > 0.01;
    mesh.visible = vis;
    pub.seen = vis && viewAngle(S.x, S.z) < hHalf + 0.05 && Math.hypot(S.x - cam.x, S.z - cam.z) < 90;
    if (!vis) return;
    uni.uPhase.value += dt * (0.35 + S.speed * 2.2);
    uni.uMove.value = approach(uni.uMove.value, clamp(S.speed / 2.5, 0, 1), 4, dt);
    uni.uFlat.value = smoothstep(0, 1, S.flat); uni.uFade.value = S.fade;
    mesh.castShadow = S.fade > 0.6;
    ground.normal(S.x, S.z, nrm);
    nrm.lerp(up, 0.4).normalize();
    qa.setFromUnitVectors(up, nrm); qb.setFromAxisAngle(up, S.heading);
    mesh.quaternion.multiplyQuaternions(qa, qb);
    mesh.position.set(S.x, ground.at(S.x, S.z) - 0.02, S.z);
  }
  ctx.registerUpdate(update);

  U.slinker = Object.assign(pub, {
    state: S,
    // test hook: put it at a bearing (degrees, + to the left of view) and distance from the camera, and hold it
    stage(deg, d, o = {}) {
      camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize(); camBearing = Math.atan2(-fwd.x, -fwd.z);
      at((deg * Math.PI) / 180, d, pt);
      S.x = pt[0]; S.z = pt[1]; S.hold = true; S.mode = 'lurk'; S.fade = o.fade ?? 1; S.flat = o.flat ?? 0;
      S.heading = o.heading ?? Math.atan2(cam.x - S.x, cam.z - S.z) + Math.PI / 2; S.speed = o.speed ?? 2.2;
      return { x: S.x, z: S.z, ok: ok(S.x, S.z) };
    },
    release() { S.hold = false; },
  });
  return { drawCalls: 1, tris: geo.index.count / 3 };
}
