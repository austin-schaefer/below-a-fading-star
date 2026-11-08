// The woman in the tarn: pale shoulders and a long neck above the black water of Lees Tarn, her hair poured
// down her back and spread across the surface round her like spilt ink. She keeps her back to you, turning
// slowly as you walk the shore. Walk round faster than she turns and you find the back of a head on that
// side too. Each time the sun gutters she is gone, and when it comes back she is standing a little nearer
// the shore you are on. She never leaves the water.
import * as THREE from 'three';
import { clamp, smoothstep } from '../geo.js';
import { Painter, paintedMaterial, approach, turnToward, angDiff } from './kit.js';
import { hyp } from '../../noise.js';
import { CAUSEWAY } from '../../world.js'; // v4 map: placed by the v3 stretch of the road (gate to tower hill), which CAUSEWAY_V4 keeps

const SKIN = '#bdb3aa';

function bodyGeometry(low) {
  const P = new Painter();
  const sides = low ? 12 : 16;
  P.paint(SKIN, 0, 0.5, 0.06);
  // torso, front and back alike: two spines, four shoulder blades
  P.grid(sides, 16, (u, v, o) => {
    const a = u * Math.PI * 2, y = -1.05 + v * 1.5;
    const w = 0.15 + 0.055 * smoothstep(-0.4, 0.16, y) - 0.15 * smoothstep(0.17, 0.45, y);
    const d = 0.1 + 0.014 * smoothstep(-0.3, 0.12, y) - 0.06 * smoothstep(0.2, 0.45, y);
    const groove = 1 - 0.07 * Math.exp(-((Math.cos(a)) ** 2) / 0.02) * smoothstep(-0.6, 0.2, y);
    o[0] = Math.cos(a) * w; o[1] = y; o[2] = Math.sin(a) * d * groove;
  }, true, true);
  for (const sx of [-1, 1]) {
    P.blob(sx * 0.185, 0.2, 0, 0.068, 0.07, 0.075, 8, 6);                                 // shoulders
    for (const sz of [-1, 1]) P.blob(sx * 0.085, 0.1, sz * 0.095, 0.055, 0.075, 0.03, 8, 5); // blades, both sides
    P.loft([[sx * 0.2, 0.2, 0], [sx * 0.235, -0.1, 0.0], [sx * 0.24, -0.45, 0.0]], [0.05, 0.043, 0.036], 8); // arms, down into the water
  }
  // a neck a little too long
  P.loft([[0, 0.36, 0], [0, 0.45, 0], [0, 0.55, 0]], [0.056, 0.048, 0.048], 10);
  P.blob(0, 0.63, 0, 0.083, 0.108, 0.098, 12, 8);
  return P.geometry();
}

function hairGeometry(low) {
  const P = new Painter(['aFloat']);
  P.paint('#0a0707', 0, 0.32);
  // cap: the back of a head, all the way round
  P.set('aFloat', 0);
  P.blob(0, 0.645, 0, 0.093, 0.118, 0.108, 14, 9);
  // falls: front and back alike, from the crown down the shoulders to the water
  for (const sz of [-1, 1]) {
    P.sheet(low ? 8 : 12, low ? 12 : 18, (u, v, o) => {
      const y = 0.72 - v * 0.74;
      const w = 0.05 + 0.045 * smoothstep(0.0, 0.5, v) - 0.02 * smoothstep(0.7, 1.0, v);
      const x = (u - 0.5) * 2 * w;
      // hugs the skull, then the neck and back
      const zHead = Math.sqrt(Math.max(0, 1 - ((y - 0.645) / 0.125) ** 2 - (x / 0.1) ** 2)) * 0.112;
      const zBack = 0.124 + 0.006 * Math.sin(u * 17);
      const z = y > 0.55 ? Math.max(zHead, 0.06) + 0.004 : zBack * smoothstep(0.55, 0.3, y) + 0.065 * smoothstep(0.3, 0.55, y);
      o[0] = x; o[1] = y; o[2] = sz * Math.max(z, 0.05);
    });
  }
  // spread on the water round her, ragged at the rim
  P.set('aFloat', 1);
  P.sheet(low ? 48 : 72, low ? 6 : 9, (u, v, o) => {
    const a = u * Math.PI * 2, rim = 1.3 + 0.55 * Math.sin(a * 3 + 1) * Math.sin(a * 5) + 0.25 * Math.sin(a * 11);
    const r = 0.16 + v * rim * (v > 0.98 ? 1 : 1);
    o[0] = Math.cos(a) * r; o[1] = 0.012; o[2] = Math.sin(a) * r * 1.0;
  });
  return P.geometry();
}

export function buildTarnWoman(ctx, U) {
  const { scene, camera, terrain, landmarks, causeway, sky } = ctx;
  const rng = ctx.makeRng(9505);
  const low = ctx.quality === 'low';
  const W = ctx.water?.tarn || { x: -90, z: 110, r: 60, y: -4.6 };
  const depth = (x, z) => { const w = terrain.waterLevelAt(x, z); return w === null ? -1 : w - terrain.heightAt(x, z); };
  // home: out from the north shore, toward the causeway, where the water is still chest deep
  const toward = { x: -90, z: 2 };
  const dirx = (toward.x - W.x), dirz = (toward.z - W.z), dl = Math.hypot(dirx, dirz);
  let hx = W.x, hz = W.z;
  for (let d = 18; d < W.r - 2; d += 1) {
    const x = W.x + (dirx / dl) * d, z = W.z + (dirz / dl) * d;
    if (depth(x, z) > 1.5) { hx = x; hz = z; } else break;
  }
  const home = { x: hx, z: hz };

  const skinMat = paintedMaterial();
  const body = new THREE.Mesh(bodyGeometry(low), skinMat);
  body.castShadow = true; body.receiveShadow = true; body.name = 'uncanny-tarn-woman';
  const uT = { value: 0 };
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x0b0808, roughness: 0.3, metalness: 0.1, side: THREE.DoubleSide });
  hairMat.onBeforeCompile = (sh) => {
    sh.uniforms.uT = uT;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aFloat; uniform float uT; varying vec3 vHP; varying float vFl;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vHP = position; vFl = aFloat;
        if (aFloat > 0.5) {
          float r = length(position.xz), an = atan(position.z, position.x);
          an += sin(uT * 0.21 + r * 1.7) * 0.06 * r;
          r *= 1.0 + 0.04 * sin(uT * 0.35 + an * 3.0);
          transformed.x = cos(an) * r; transformed.z = sin(an) * r;
          transformed.y += sin(r * 7.0 - uT * 1.1) * 0.006;
        }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHP; varying float vFl;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float an = vFl > 0.5 ? atan(vHP.z, vHP.x) * 70.0 + length(vHP.xz) * 9.0 : vHP.x * 260.0 + vHP.y * 12.0;
          diffuseColor.rgb *= 0.55 + 0.45 * (0.5 + 0.5 * sin(an)) * (0.5 + 0.5 * sin(an * 0.37 + 1.3));
        }`);
  };
  const hair = new THREE.Mesh(hairGeometry(low), hairMat);
  hair.castShadow = true; hair.receiveShadow = true; hair.name = 'uncanny-tarn-hair';

  // rings spreading on the water from her
  const ringGeo = new THREE.RingGeometry(0.94, 1.0, 64, 1);
  ringGeo.rotateX(-Math.PI / 2);
  const ringA = new THREE.InstancedBufferAttribute(new Float32Array(3), 1); ringA.setUsage(THREE.DynamicDrawUsage);
  ringGeo.setAttribute('aA', ringA);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xd8c8c0, transparent: true, depthWrite: false, opacity: 1 });
  ringMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aA; varying float vA;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvA = aA;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vA;').replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vA;');
  };
  const rings = new THREE.InstancedMesh(ringGeo, ringMat, 3);
  rings.name = 'uncanny-tarn-rings'; rings.frustumCulled = false; rings.renderOrder = 2;

  const g = new THREE.Group();
  g.add(body, hair);
  scene.add(g, rings);
  const S = { x: home.x, z: home.z, yaw: 0, gone: false, wasGutter: false, humT: 8 };
  const pub = ctx.tarnWoman = { position: g.position, visible: true };
  const cam = camera.position;
  S.yaw = Math.atan2(S.x - CAUSEWAY[2].x, S.z - CAUSEWAY[2].z); // back to the road
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pv = new THREE.Vector3(), sv = new THREE.Vector3();

  function stepToward() {
    // a few metres nearer the shore you are on, staying chest deep
    const dx = cam.x - S.x, dz = cam.z - S.z, d = Math.hypot(dx, dz) || 1;
    const far = Math.hypot(cam.x - W.x, cam.z - W.z) > W.r + 70;
    const tx = far ? home.x : S.x + (dx / d) * (3 + rng() * 2.5), tz = far ? home.z : S.z + (dz / d) * (3 + rng() * 2.5);
    if (depth(tx, tz) > 1.3 && Math.hypot(tx - cam.x, tz - cam.z) > 7) { S.x = tx; S.z = tz; ctx.audio?.cue?.('tarn-step', g.position); }
  }
  function update(dt, t) {
    uT.value = t;
    const f = sky.flicker.value, gutter = f < 0.55;
    if (gutter && !S.wasGutter) { S.gone = true; stepToward(); }
    if (!gutter && S.wasGutter) S.gone = false;
    S.wasGutter = gutter;
    g.visible = !S.gone; pub.visible = !S.gone;
    const dx = cam.x - S.x, dz = cam.z - S.z, dist = hyp(dx, dz);
    // her back to you, always, but she turns slowly
    if (!S.gone) S.yaw = turnToward(S.yaw, Math.atan2(dx, dz) + Math.PI, 0.32 * dt);
    const bob = Math.sin(t * 1.05) * 0.012;
    g.position.set(S.x, W.y + bob + 0.1, S.z);
    g.rotation.y = S.yaw;
    if ((S.humT -= dt) <= 0) { S.humT = 18 + rng() * 14; if (dist < 70 && !S.gone) ctx.audio?.cue?.('tarn-hum', g.position); }
    // rings: three, spreading and fading in turn
    for (let i = 0; i < 3; i++) {
      const p = ((t / 7 + i / 3) % 1);
      const r = 0.5 + p * 4.5;
      ringA.array[i] = (1 - p) * (1 - p) * 0.22 * smoothstep(0, 0.08, p);
      pv.set(S.x, W.y + 0.015, S.z); sv.set(r, 1, r);
      m4.compose(pv, q, sv); rings.setMatrixAt(i, m4);
    }
    rings.instanceMatrix.needsUpdate = true; ringA.needsUpdate = true;
  }
  ctx.registerUpdate(update, { at: () => S, near: 120, hz: 5 }); // v3: 5 Hz beyond 120 m

  U.tarn = Object.assign(pub, {
    state: S, home,
    // test hooks
    moveTo(x, z) { S.x = x; S.z = z; return { depth: depth(x, z) }; },
    faceAway() { S.yaw = Math.atan2(cam.x - S.x, cam.z - S.z) + Math.PI; },
    gutterStep() { stepToward(); },
  });
  const tri = (gg) => gg.index.count / 3;
  return { drawCalls: 3, tris: tri(body.geometry) + tri(hair.geometry) + tri(ringGeo) * 3 };
}
