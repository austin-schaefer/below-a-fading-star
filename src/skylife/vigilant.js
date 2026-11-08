// The Vigilant: a crouched, hill-sized figure seated on the crest of the east-north-east wall,
// knees drawn up, forearms on its knees, head a little forward. It is made of the wall's own rock
// (the terrain's material, so the same strata, rime and haze) and reads as a crag until you see the
// shoulders and the head. The head is never seen to move: each time it leaves your view it turns
// a few degrees, usually a little more toward you. While the sun gutters there is a faint glint
// where its eyes would be.
// Draw calls: the body (one mesh, terrain material), the eye glint (two points).
// Audio: now and then 'rumble' at its head when it turns (never while watched).
import * as THREE from 'three';

const D2R = Math.PI / 180;
export const VIGILANT = { bearing: 72, r: 476, face: { x: 40, z: 30 } }; // seated on the crest; looks toward the keep
const HEAD_LIMIT = 35 * D2R;
const PIVOT = new THREE.Vector3(0, 52, 10);
const EYES = [new THREE.Vector3(-4.2, 57.6, 24.5), new THREE.Vector3(4.2, 57.6, 24.5)];

const EYE_VS = /* glsl */`
  uniform float uSize;
  varying float vFog;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float d = -mv.z;
    vFog = 0.35 + 0.65 * exp(-pow(0.0022 * d, 2.0));
    gl_PointSize = uSize;
    gl_Position = projectionMatrix * mv;
  }`;
const EYE_FS = /* glsl */`
  uniform vec3 uCol; uniform float uGlint;
  varying float vFog;
  void main() {
    vec2 q = gl_PointCoord - 0.5; float r2 = dot(q, q) * 4.0;
    float l = exp(-r2 * 7.0) + exp(-r2 * 2.5) * 0.12;
    gl_FragColor = vec4(uCol * l * uGlint * vFog, 1.0);
  }`;

export function buildVigilant(ctx, rng) {
  const { terrain, noise } = ctx;
  const hi = ctx.quality !== 'low';
  
  // seat and facing
  // it sits on the highest point of the crest near its bearing, so its shoulders and head stand
  // against the sky from the moor below
  const seat = new THREE.Vector3(0, -1e9, 0);
  for (let db = -2.5; db <= 2.5; db += 0.5) for (let r = VIGILANT.r - 16; r <= VIGILANT.r + 16; r += 4) {
    const bb = (VIGILANT.bearing + db) * D2R, x = Math.sin(bb) * r, z = -Math.cos(bb) * r, h = terrain.heightAt(x, z);
    if (h > seat.y) seat.set(x, h, z);
  }
  seat.y -= 3;
  const theta = Math.atan2(VIGILANT.face.x - seat.x, VIGILANT.face.z - seat.z);
  const cs = Math.cos(theta), sn = Math.sin(theta);
  const toWorldXZ = (x, z) => [seat.x + cs * x + sn * z, seat.z - sn * x + cs * z];
  const groundLocal = (x, z) => { const [wx, wz] = toWorldXZ(x, z); return terrain.heightAt(wx, wz) - seat.y; };

  // the parts, in the figure's frame (+z forward, y up from the ledge), as signed-distance shapes
  // melted together; the skin is found by shooting rays in from outside toward a centre, so it is
  // one continuous eroded mass rather than a heap of balls
  const SC = 1.25; // seated height (ledge to crown) about 85 m
  const parts = [];
  const blob = (c, r, opt = {}) => {
    const q = opt.rotX ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -opt.rotX) : null;
    parts.push({ kind: 0, c: new THREE.Vector3(...c), r: new THREE.Vector3(...r), qi: q, head: !!opt.head });
  };
  const limb = (a, b2, rad, opt = {}) => parts.push({ kind: 1, a: new THREE.Vector3(...a), b: new THREE.Vector3(...b2), rad, head: !!opt.head });
  blob([0, -16, -8], [40, 22, 34]);              // the talus it sits in
  blob([0, 7, -4], [25, 13, 19]);                // haunches
  blob([0, 26, -3], [19, 20, 14], { rotX: 0.3 }); // torso, leaning forward
  blob([0, 41, -1], [25, 12, 15], { rotX: 0.35 }); // the hunch of the back
  for (const s2 of [-1, 1]) {
    blob([22 * s2, 47, 2], [12, 9, 11]);                  // shoulders, high and hunched
    limb([25 * s2, 44, 3], [24 * s2, 26, 16], 7);         // upper arms
    limb([24 * s2, 26, 16], [8 * s2, 30, 31], 6);         // forearms laid across the knees
    blob([6 * s2, 26, 35], [5.5, 7, 5.5]);                // hands, hanging
    limb([12 * s2, 5, 4], [13 * s2, 24, 24], 10);         // thighs drawn up
    blob([13 * s2, 25, 25], [9.5, 9.5, 9]);               // knees
    // the shins reach down the slope to wherever the ground is
    const fy = Math.min(-6, groundLocal(15 * s2 * SC, 34 * SC) / SC + 2);
    limb([13 * s2, 22, 28], [15 * s2, fy, 34], 7.5);
    blob([15 * s2, fy - 2, 37], [8, 5, 11]);              // feet
  }
  limb([0, 46, 5], [0, 52, 11], 6);                       // neck
  blob([0, 58, 12], [9.5, 10.5, 10], { head: true });    // skull
  blob([0, 60.4, 19], [8.6, 3, 4], { head: true });       // a heavy brow
  blob([0, 55.5, 22.5], [3.2, 6, 5], { head: true });     // a long nose, jutting: it shows which way it looks
  blob([0, 51.5, 18], [6.5, 4.5, 8], { head: true });     // the jaw, thrust forward
  blob([0, 64, 3.5], [6.5, 6.5, 6.5], { head: true });    // the back of the skull, hooded
  blob([0, 66.4, 10], [3, 2.6, 7.5], { head: true });     // a worn crest

  const q = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3();
  function sdPart(p, P2) {
    if (P2.kind === 0) {
      q.subVectors(p, P2.c); if (P2.qi) q.applyQuaternion(P2.qi);
      const k0 = Math.hypot(q.x / P2.r.x, q.y / P2.r.y, q.z / P2.r.z);
      const k1 = Math.hypot(q.x / (P2.r.x * P2.r.x), q.y / (P2.r.y * P2.r.y), q.z / (P2.r.z * P2.r.z));
      return k1 > 1e-6 ? k0 * (k0 - 1) / k1 : -Math.min(P2.r.x, P2.r.y, P2.r.z);
    }
    t1.subVectors(p, P2.a); t2.subVectors(P2.b, P2.a);
    const h = THREE.MathUtils.clamp(t1.dot(t2) / t2.lengthSq(), 0, 1);
    return t1.addScaledVector(t2, -h).length() - P2.rad;
  }
  const smin = (a, b2, k) => { const h = Math.max(k - Math.abs(a - b2), 0) / k; return Math.min(a, b2) - h * h * k * 0.25; };
  const sdf = (p, head) => {
    let d = 1e9;
    for (const P2 of parts) if (P2.head === head) d = smin(d, sdPart(p, P2), head ? 2.5 : 4);
    return d;
  };

  // build: one wrapped grid per star-shaped skin (body, head), displaced, smooth-shaded
  const P = [], N = [], C = [], IDX = [];
  const v = new THREE.Vector3(), n = new THREE.Vector3(), u = new THREE.Vector3();
  const cRock = new THREE.Color('#3c3838'), cRockD = new THREE.Color('#1f1c20'), cScree = new THREE.Color('#4a4644'), col = new THREE.Color();
  const ss = THREE.MathUtils.smoothstep;
  function skin(centre, head, NU, NV, tMax, rough) {
    const base = P.length / 3;
    const pts = [], rays = [];
    for (let j = 0; j <= NV; j++) {
      const ph = Math.PI * j / NV;
      for (let i = 0; i < NU; i++) {
        const th = Math.PI * 2 * i / NU;
        u.set(Math.sin(ph) * Math.sin(th), Math.cos(ph), Math.sin(ph) * Math.cos(th));
        let t = tMax;
        for (let k = 0; k < 90 && t > 0; k++) {
          v.copy(centre).addScaledVector(u, t);
          const d = sdf(v, head);
          if (d < 0.05) break;
          t -= Math.max(d * 0.9, 0.2);
        }
        v.copy(centre).addScaledVector(u, Math.max(t, 0.5));
        pts.push(v.x, v.y, v.z); rays.push(u.x, u.y, u.z);
      }
    }
    const idx = [];
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
      const a = j * NU + i, b2 = j * NU + (i + 1) % NU, c = a + NU, d = b2 + NU;
      idx.push(a, c, b2, b2, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setIndex(idx);
    g.computeVertexNormals();
    // erode: vertical gullies like the wall's, crags, a finer grain
    const pos = g.attributes.position, nr = g.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i); n.fromBufferAttribute(nr, i);
      const gully = noise.ridged2(v.x * 0.11 + v.z * 0.09, v.y * 0.016 + v.x * 0.004, 4);
      const crag = noise.fbm2(v.x * 0.05 + v.y * 0.04, v.z * 0.05 - v.y * 0.03, 3);
      const fine = noise.fbm2(v.x * 0.21 + v.y * 0.13, v.z * 0.21 - v.y * 0.17, 2);
      v.addScaledVector(n, rough * ((gully - 0.5) * 2.4 + crag * 1.8 + fine * 0.6));
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    for (let i = 0; i < pos.count; i++) {
      P.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      N.push(nr.getX(i), nr.getY(i), nr.getZ(i));
      // the wall's colours by height, darker in the hollows and under the overhangs, mottled
      const wy = pos.getY(i) * SC + seat.y;
      col.copy(cScree).lerp(cRock, ss(wy, 10, 60)).lerp(cRockD, ss(wy, 60, 160));
      const under = THREE.MathUtils.clamp(-nr.getY(i), 0, 1);
      const mott = 0.9 + 0.2 * noise.noise2(pos.getX(i) * 0.08, pos.getZ(i) * 0.08 + pos.getY(i) * 0.05);
      // where neighbouring rays struck different limbs the skin hangs like a curtain between them,
      // edge-on to the centre: those are clefts in shadow, not lit faces
      const facing = nr.getX(i) * rays[i * 3] + nr.getY(i) * rays[i * 3 + 1] + nr.getZ(i) * rays[i * 3 + 2];
      col.multiplyScalar((1 - 0.3 * under) * mott * (0.35 + 0.65 * ss(facing, 0.05, 0.45)));
      C.push(col.r, col.g, col.b);
    }
    for (const k of idx) IDX.push(base + k);
    g.dispose();
    return [base, P.length / 3];
  }
  skin(new THREE.Vector3(0, 24, 6), false, hi ? 84 : 48, hi ? 56 : 32, 100, 1.25);
  const [headV0, headV1] = skin(new THREE.Vector3(0, 58, 13), true, hi ? 44 : 26, hi ? 30 : 18, 24, 0.45);

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
  mesh.scale.setScalar(SC);
  mesh.castShadow = false; mesh.receiveShadow = false;
  ctx.scene.add(mesh);
  mesh.updateMatrixWorld(true);

  // eyes
  const eyePos = new Float32Array(6);
  const eg = new THREE.BufferGeometry();
  const eyeAttr = new THREE.BufferAttribute(eyePos, 3);
  eg.setAttribute('position', eyeAttr);
  const eyeMat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color('#ffe2b0').multiplyScalar(4.0) }, uGlint: { value: 0 }, uSize: { value: 6.5 * ctx.renderer.getPixelRatio() } },
    vertexShader: EYE_VS, fragmentShader: EYE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  const eyes = new THREE.Points(eg, eyeMat);
  eyes.name = 'vigilant-eyes'; eyes.renderOrder = 5;
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
    eg.computeBoundingSphere(); // only when the head turns; lets the eyes cull when it is behind you
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
