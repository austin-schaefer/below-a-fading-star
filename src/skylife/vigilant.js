// The Vigilant: a crouched, hill-sized figure seated on a ledge of the east-north-east wall,
// knees drawn up, forearms on its knees, head a little forward. It is made of the wall's own rock
// (the terrain's material, so the same strata, rime and haze) and reads as a crag until you see the
// shoulders and the head. The head is never seen to move: each time it leaves your view it turns
// a few degrees, usually a little more toward you. While the sun gutters there is a faint glint
// where its eyes would be.
// Draw calls: the body (one mesh, terrain material), the eye glint (two points).
// Audio: now and then 'rumble' at its head when it turns (never while watched).
import * as THREE from 'three';

const D2R = Math.PI / 180;
export const VIGILANT = { bearing: 68, r: 440, face: { x: 40, z: 30 } }; // seat on the wall; looks toward the keep
const HEAD_LIMIT = 35 * D2R;
const PIVOT = new THREE.Vector3(0, 52, 10);
const EYES = [new THREE.Vector3(-3.4, 58.6, 21.4), new THREE.Vector3(3.4, 58.6, 21.4)];

const EYE_VS = /* glsl */`
  uniform float uSize;
  varying float vFog;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float d = -mv.z;
    vFog = exp(-pow(0.0022 * d, 2.0)) * 0.8 + 0.2 * exp(-d * 0.002);
    gl_PointSize = uSize;
    gl_Position = projectionMatrix * mv;
  }`;
const EYE_FS = /* glsl */`
  uniform vec3 uCol; uniform float uGlint;
  varying float vFog;
  void main() {
    vec2 q = gl_PointCoord - 0.5; float r2 = dot(q, q) * 4.0;
    float l = exp(-r2 * 10.0) + exp(-r2 * 2.5) * 0.12;
    gl_FragColor = vec4(uCol * l * uGlint * vFog, 1.0);
  }`;

export function buildVigilant(ctx, rng) {
  const { terrain, noise } = ctx;
  const hi = ctx.quality === 'high';
  const WS = hi ? 24 : 14, HS = hi ? 16 : 10;

  // seat and facing
  const b = VIGILANT.bearing * D2R;
  const seat = new THREE.Vector3(Math.sin(b) * VIGILANT.r, 0, -Math.cos(b) * VIGILANT.r);
  seat.y = terrain.heightAt(seat.x, seat.z) - 2;
  const theta = Math.atan2(VIGILANT.face.x - seat.x, VIGILANT.face.z - seat.z);
  const cs = Math.cos(theta), sn = Math.sin(theta);
  const toWorldXZ = (x, z) => [seat.x + cs * x + sn * z, seat.z - sn * x + cs * z];
  const groundLocal = (x, z) => { const [wx, wz] = toWorldXZ(x, z); return terrain.heightAt(wx, wz) - seat.y; };

  // the parts, in the figure's frame: +z forward, y up from the ledge
  const parts = [];
  const blob = (c, r, opt = {}) => parts.push({ c: new THREE.Vector3(...c), r: new THREE.Vector3(...r), ...opt });
  const limb = (a, b2, rad, opt = {}) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b2);
    const c = A.clone().add(B).multiplyScalar(0.5), len = A.distanceTo(B);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    parts.push({ c, r: new THREE.Vector3(rad, len / 2 + rad * 0.6, rad), q, ...opt });
  };
  blob([0, -16, -8], [38, 22, 32], { rock: 0.22 });          // the talus it sits in
  blob([0, 7, -4], [25, 13, 19], { rock: 0.16 });            // haunches
  blob([0, 26, -3], [19, 20, 14], { rotX: 0.3, rock: 0.14 }); // torso, leaning forward
  blob([0, 40, 0], [23, 12, 15], { rotX: 0.35, rock: 0.12 }); // the hunch of the back
  for (const s of [-1, 1]) {
    blob([20 * s, 44, 4], [11, 9, 11], { rock: 0.1 });        // shoulders
    limb([23 * s, 42, 5], [22 * s, 22, 19], 7, { rock: 0.12 });   // upper arms
    limb([22 * s, 22, 19], [9 * s, 23, 33], 6, { rock: 0.12 });   // forearms across the knees
    blob([7 * s, 20, 36], [6, 6.5, 6], { rock: 0.14 });       // hands, hanging
    limb([12 * s, 5, 4], [13 * s, 17, 27], 10, { rock: 0.12 });   // thighs drawn up
    blob([13 * s, 17, 28], [9.5, 9, 9], { rock: 0.1 });       // knees
    // the shins reach down the slope to wherever the ground is
    const fy = Math.min(-6, groundLocal(15 * s, 34) + 2);
    limb([13 * s, 14, 30], [15 * s, fy, 34], 7.5, { rock: 0.14 });
    blob([15 * s, fy - 2, 37], [8, 5, 11], { rock: 0.2 });    // feet
  }
  limb([0, 46, 6], [0, 53, 11], 7.5, { rock: 0.1 });          // neck
  const headStart = parts.length;
  blob([0, 58, 12], [9, 10, 9.5], { rock: 0.06, head: true });   // skull
  blob([0, 60.2, 19], [8.5, 2.8, 3.6], { rock: 0.05, head: true }); // brow
  blob([0, 52.5, 15], [7, 4.5, 7], { rock: 0.06, head: true });  // jaw
  blob([0, 66.5, 10], [3, 2.6, 7.5], { rock: 0.08, head: true }); // a worn crest
  void headStart;

  // build: displaced, smooth-shaded ellipsoids merged into one indexed geometry
  const P = [], N = [], C = [], I = [], IDX = [];
  let headV0 = -1, headV1 = -1;
  const v = new THREE.Vector3(), n = new THREE.Vector3(), w = new THREE.Vector3();
  const cRock = new THREE.Color('#3c3838'), cRockD = new THREE.Color('#1f1c20'), cScree = new THREE.Color('#4a4644'), col = new THREE.Color();
  const ss = THREE.MathUtils.smoothstep;
  const rq = new THREE.Quaternion();
  for (const p of parts) {
    const g = new THREE.SphereGeometry(1, WS, HS);
    const pos = g.attributes.position;
    if (p.rotX) rq.setFromAxisAngle(new THREE.Vector3(1, 0, 0), p.rotX); else if (p.q) rq.copy(p.q); else rq.identity();
    const minR = Math.min(p.r.x, p.r.y, p.r.z);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      n.set(v.x / p.r.x, v.y / p.r.y, v.z / p.r.z).normalize().applyQuaternion(rq);
      v.multiply(p.r).applyQuaternion(rq).add(p.c);
      // crags and slabs: a ridged lump field plus finer grain, in the figure's own frame
      const f = 0.045;
      const big = noise.ridged2(v.x * f + v.y * 0.6 * f, v.z * f - v.y * 0.5 * f, 4);
      const fine = noise.fbm2(v.x * 0.17 + v.y * 0.11, v.z * 0.17 - v.y * 0.13, 3);
      const d = minR * p.rock * (big - 0.45) * 1.6 + fine * minR * p.rock * 0.5;
      v.addScaledVector(n, d);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    const base = P.length / 3;
    if (p.head && headV0 < 0) headV0 = base;
    const nrm = g.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      P.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      N.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
      // the wall's colours by height, darker under overhangs, a little mottled
      const wy = pos.getY(i) + seat.y;
      col.copy(cScree).lerp(cRock, ss(wy, 10, 60)).lerp(cRockD, ss(wy, 60, 160));
      const under = THREE.MathUtils.clamp(-nrm.getY(i), 0, 1);
      const mott = 0.9 + 0.2 * noise.noise2(pos.getX(i) * 0.08, pos.getZ(i) * 0.08 + pos.getY(i) * 0.05);
      col.multiplyScalar((1 - 0.4 * under) * mott);
      C.push(col.r, col.g, col.b);
    }
    for (let i = 0; i < g.index.count; i++) IDX.push(base + g.index.getX(i));
    if (p.head) headV1 = P.length / 3;
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.Float32BufferAttribute(P, 3), nrmAttr = new THREE.Float32BufferAttribute(N, 3);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('normal', nrmAttr);
  geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  geo.setAttribute('aIce', new THREE.Float32BufferAttribute(new Float32Array(P.length / 3), 1));
  geo.setIndex(IDX);
  geo.computeBoundingSphere();
  // the head's rest pose, to turn from
  const head0P = new Float32Array(P.slice(headV0 * 3, headV1 * 3)), head0N = new Float32Array(N.slice(headV0 * 3, headV1 * 3));

  const tmat = terrain.mesh?.material;
  const mat = tmat && tmat.isMeshStandardMaterial ? tmat : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'vigilant';
  mesh.position.copy(seat);
  mesh.rotation.y = theta;
  mesh.castShadow = false; mesh.receiveShadow = false;
  ctx.scene.add(mesh);
  mesh.updateMatrixWorld(true);

  // eyes
  const eyePos = new Float32Array(6);
  const eg = new THREE.BufferGeometry();
  const eyeAttr = new THREE.BufferAttribute(eyePos, 3);
  eg.setAttribute('position', eyeAttr);
  const eyeMat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color('#ffe2b0').multiplyScalar(2.2) }, uGlint: { value: 0 }, uSize: { value: 3.2 * ctx.renderer.getPixelRatio() } },
    vertexShader: EYE_VS, fragmentShader: EYE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  const eyes = new THREE.Points(eg, eyeMat);
  eyes.name = 'vigilant-eyes'; eyes.frustumCulled = false; eyes.renderOrder = 5;
  ctx.scene.add(eyes);

  // ---- turning the head (CPU, only when it changes: it is never seen to move)
  const st = { headYaw: (rng() - 0.5) * 24 * D2R, watched: false, watchT: 0, turns: 0, sinceCheck: 1, occluded: false };
  const headWorld = new THREE.Vector3();
  const e3 = new THREE.Vector3();
  function poseHead() {
    const c = Math.cos(st.headYaw), s = Math.sin(st.headYaw);
    for (let i = 0; i < head0P.length; i += 3) {
      const x = head0P[i] - PIVOT.x, z = head0P[i + 2] - PIVOT.z;
      posAttr.array[headV0 * 3 + i] = PIVOT.x + c * x + s * z;
      posAttr.array[headV0 * 3 + i + 1] = head0P[i + 1];
      posAttr.array[headV0 * 3 + i + 2] = PIVOT.z - s * x + c * z;
      const nx = head0N[i], nz = head0N[i + 2];
      nrmAttr.array[headV0 * 3 + i] = c * nx + s * nz;
      nrmAttr.array[headV0 * 3 + i + 2] = -s * nx + c * nz;
    }
    posAttr.clearUpdateRanges?.(); nrmAttr.clearUpdateRanges?.();
    posAttr.addUpdateRange?.(headV0 * 3, head0P.length); nrmAttr.addUpdateRange?.(headV0 * 3, head0N.length);
    posAttr.needsUpdate = true; nrmAttr.needsUpdate = true;
    EYES.forEach((E, k) => {
      const x = E.x - PIVOT.x, z = E.z - PIVOT.z;
      e3.set(PIVOT.x + c * x + s * z, E.y, PIVOT.z - s * x + c * z);
      mesh.localToWorld(e3);
      eyePos[k * 3] = e3.x; eyePos[k * 3 + 1] = e3.y; eyePos[k * 3 + 2] = e3.z;
    });
    eyeAttr.needsUpdate = true;
    headWorld.set(0, 59, 13); mesh.localToWorld(headWorld);
  }
  poseHead();

  const frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), sphere = new THREE.Sphere(new THREE.Vector3(), 13);
  const toPlayer = new THREE.Vector3(), cueAt = new THREE.Vector3();
  function occludedFrom(cam) {
    // march the sight line over the terrain; the last stretch is the Vigilant's own ledge
    const dx = headWorld.x - cam.x, dy = headWorld.y - cam.y, dz = headWorld.z - cam.z;
    for (let k = 1; k < 28; k++) {
      const f = k / 32;
      if (terrain.heightAt(cam.x + dx * f, cam.z + dz * f) > cam.y + dy * f + 1.5) return true;
    }
    return false;
  }
  function turn() {
    // usually a little more toward whoever is looking; sometimes not
    mesh.worldToLocal(toPlayer.copy(ctx.camera.position));
    const want = THREE.MathUtils.clamp(Math.atan2(toPlayer.x - PIVOT.x, toPlayer.z - PIVOT.z), -HEAD_LIMIT, HEAD_LIMIT);
    const step = (3 + rng() * 5) * D2R;
    let sign = Math.abs(want - st.headYaw) > 2 * D2R && rng() < 0.75 ? Math.sign(want - st.headYaw) : (rng() < 0.5 ? -1 : 1);
    if (Math.abs(st.headYaw + sign * step) > HEAD_LIMIT) sign = -sign;
    st.headYaw = THREE.MathUtils.clamp(st.headYaw + sign * step, -HEAD_LIMIT, HEAD_LIMIT);
    st.turns++;
    poseHead();
    if (step > 6 * D2R && rng() < 0.2) ctx.audio?.cue?.('rumble', cueAt.copy(headWorld));
  }

  function update(dt, flicker) {
    const cam = ctx.camera;
    pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    frustum.setFromProjectionMatrix(pm);
    sphere.center.copy(headWorld);
    const inFrustum = frustum.intersectsSphere(sphere);
    st.sinceCheck += dt;
    if (inFrustum && st.sinceCheck > 0.25) { st.sinceCheck = 0; st.occluded = occludedFrom(cam.position); }
    const watched = inFrustum && !st.occluded;
    if (watched) st.watchT += dt;
    else {
      if (st.watched && st.watchT > 0.4) turn();
      st.watchT = 0;
    }
    st.watched = watched;
    const gut = THREE.MathUtils.clamp((0.85 - flicker) / 0.45, 0, 1);
    eyeMat.uniforms.uGlint.value = gut * gut * (0.8 + 0.2 * Math.sin(ctx.time.t * 1.3));
    eyes.visible = gut > 0.001;
  }

  const api = {
    mesh, eyes, seat, headWorld, state: st,
    get headYaw() { return st.headYaw; },
    get watched() { return st.watched; },
    setHeadYaw: (rad) => { st.headYaw = THREE.MathUtils.clamp(rad, -HEAD_LIMIT, HEAD_LIMIT); poseHead(); },
    turn,
  };
  return { update, api, tris: IDX.length / 3 };
}
