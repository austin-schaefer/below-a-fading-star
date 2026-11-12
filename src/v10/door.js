// The Hypogeum's door (v10-A1, #9): the bronze door at the foot of the stair that never opens, and the one inside who
// keeps the count of the sun's gutters (stories/the-reckoner.md). Registered from src/v2/ruins/hypogeum.js, which
// hands over its public frame (ctx.hypogeum: the door, its loose ring, the glyph row's material and spin()).
//
// The act, "Knock", once a visit. What the visitor sees and hears:
//   0-2 s     the right leaf's ring lifts from its boss and falls, three times (act-knock at each strike), the leaf
//             shivering in its frame;
//   3-4.6 s   three knocks answer from inside (act-answer), and with each the door jolts in its frame and dust sifts from
//             the lintel. On the first visit they come from far below, deeper than a tomb cut four metres into the
//             ground could go; on the second, nearer; from the third on, the last lands just behind the bronze;
//   4.6-9 s   light shows in the seam between the leaves and spills on the threshold (ember; glacial blue once the mother
//             crystal's thread has reached the stair, src/v10/crystal.js); from the third visit the glyph row runs a
//             whole turn, eleven places, as if someone inside had counted it through;
//   5.6-6.6 s a gold tessera is pushed out under the door, slides over the threshold and stops at the visitor's feet,
//             the door's last glyph cut in its face (act-tessera).
// Remembered: show(n) lays n tesserae (at most nine) on the flags in front of the door, each with the glyph it came with.
//
// No point light: the seam and the spill are unlit emissive quads, drawn only while lit. One InstancedMesh of
// tesserae (engraved: src/v7/glyphs/engrave.js), one Points of dust (drawn only while it falls).
import * as THREE from 'three';
import { engrave } from '../v7/glyphs/engrave.js';
import { doorsLast } from '../v7/glyphs/forms.js';

const ID = 'hypogeum-door';
export const TESSERAE = 9;
export const T = { strikes: [0.25, 0.87, 1.49], answers: [3.0, 3.75, 4.45], seam: [4.6, 9.0], spin: 5.0, slide: [5.6, 6.6], end: 9.5 };
const LIFT = 0.32, FALL = 0.1; // s: the ring rising off its boss, and dropping back

export function doorAct(ctx, H, meshes) {
  if (!ctx.acts) return null;
  const rng = ctx.makeRng(1002);
  const D = H.door, x1 = D.x - 0.3, zc = D.z, Yf = H.floor, dHalf = D.width / 2;
  const doorMesh = H.doorMesh, ring = H.ring;
  const door0 = doorMesh.position.x, ring0 = ring.position.x, ringRot = ring.rotation.z;
  // the ring the visitor lifts: bronze worn bright by every hand that has lifted it, so the thing to use is the thing
  // that catches the eye, and its swing can be followed in the dark at the foot of the stair
  const ringMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#b8925a'), metalness: 0.9, roughness: 0.3, emissive: new THREE.Color('#5a3a18'), emissiveIntensity: 0.7 });
  ring.material = ringMat;

  // ---- the seam: a plate of light behind the leaves, seen only through the gap between them; and its spill
  const seamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a2a'), toneMapped: false, fog: true });
  const seam = new THREE.Mesh(new THREE.PlaneGeometry(dHalf * 2, D.height), seamMat);
  seam.position.set(x1 + 0.41, Yf + D.height / 2, zc); seam.rotation.y = -Math.PI / 2;
  seam.visible = false; seam.name = 'act-door-seam';
  const sc = document.createElement('canvas'); sc.width = 128; sc.height = 64;
  {
    // a long thin fan out from the seam's foot (the canvas's right edge is the door), brightest where it leaves it
    const g = sc.getContext('2d');
    g.save(); g.translate(128, 32); g.scale(1, 0.3);
    const gr = g.createRadialGradient(0, 0, 1, 0, 0, 128);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.2, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(-128, -110, 128, 220); g.restore();
  }
  const spillMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), color: new THREE.Color('#ff7a2a'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: true, opacity: 0 });
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.5), spillMat);
  spill.rotation.x = -Math.PI / 2;
  spill.position.set(x1 + 0.3 - 0.65, Yf + 0.045, zc); spill.visible = false; spill.renderOrder = 3; spill.name = 'act-door-spill';

  // ---- dust from the lintel's joint: falls while the door jolts
  const ND = 220, dp = new Float32Array(ND * 3), ds = new Float32Array(ND);
  for (let i = 0; i < ND; i++) { dp[i * 3] = x1 + 0.25 - rng() * 0.3; dp[i * 3 + 1] = Yf + D.height + 0.02 - rng() * 0.05; dp[i * 3 + 2] = zc + (rng() - 0.5) * 2.2; ds[i] = rng(); }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dg.setAttribute('aSeed', new THREE.BufferAttribute(ds, 1));
  dg.boundingSphere = new THREE.Sphere(new THREE.Vector3(x1, Yf + 1.3, zc), 3);
  const dustU = { uT: { value: 0 }, uAmt: { value: 0 }, uFloor: { value: Yf } };
  const dustMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, dustU]), transparent: true, depthWrite: false, fog: true,
    vertexShader: `uniform float uT, uAmt, uFloor; attribute float aSeed; varying float vA;
      #include <common>
      #include <fog_pars_vertex>
      void main() {
        float t = uT - aSeed * 0.5;                    // each mote lets go a little after the jolt
        vec3 p = position;
        float fall = max(0.0, t);
        p.y -= fall * (0.25 + 0.5 * aSeed) + 0.4 * fall * fall;
        p.x -= fall * (0.08 + 0.2 * fract(aSeed * 7.3));
        p.z += sin(fall * 3.0 + aSeed * 40.0) * 0.03;
        vA = step(0.0, t) * step(aSeed, uAmt) * (1.0 - smoothstep(uFloor + 0.2, uFloor, p.y)) * (1.0 - smoothstep(1.6, 2.6, fall));
        vec3 transformed = p; // the fog chunks read it
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = max(1.5, (0.006 + 0.012 * fract(aSeed * 13.1)) * 560.0 / -mvPosition.z);
        #include <fog_vertex>
      }`,
    fragmentShader: `varying float vA;
      #include <common>
      #include <fog_pars_fragment>
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float a = (1.0 - smoothstep(0.2, 0.5, length(c))) * vA * 0.9;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vec3(0.92, 0.84, 0.7), a);
        #include <fog_fragment>
      }`,
  });
  const dust = new THREE.Points(dg, dustMat); dust.visible = false; dust.frustumCulled = false; dust.name = 'act-door-dust';

  // ---- a puff of verdigris and grit where the ring strikes, at each of the visitor's knocks
  const NP = 60, pp = new Float32Array(NP * 3), pv = new Float32Array(NP * 3);
  const hitAt = new THREE.Vector3(ring.position.x + 0.03, ring.position.y - 0.22, ring.position.z);
  for (let i = 0; i < NP; i++) {
    pp.set([hitAt.x, hitAt.y, hitAt.z], i * 3);
    const a = rng() * Math.PI * 2, sp = 0.25 + rng() * 0.6;
    pv.set([-(0.3 + rng() * 0.7) * sp, Math.sin(a) * sp * 0.6 + 0.1, Math.cos(a) * sp], i * 3);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('aVel', new THREE.BufferAttribute(pv, 3));
  const puffU = { uT: { value: 9 } };
  const puffMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, puffU]), transparent: true, depthWrite: false, fog: true,
    vertexShader: `uniform float uT; attribute vec3 aVel; varying float vA;
      #include <common>
      #include <fog_pars_vertex>
      void main() {
        vec3 p = position + aVel * (1.0 - exp(-uT * 3.0)) / 3.0 * 1.4 + vec3(0.0, -0.35 * uT * uT, 0.0);
        vA = (1.0 - smoothstep(0.15, 1.1, uT));
        vec3 transformed = p;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = max(3.0, 0.022 * 560.0 / -mvPosition.z);
        #include <fog_vertex>
      }`,
    fragmentShader: `varying float vA;
      #include <common>
      #include <fog_pars_fragment>
      void main() {
        float a = (1.0 - smoothstep(0.15, 0.5, length(gl_PointCoord - 0.5))) * vA;
        if (a < 0.01) discard;
        gl_FragColor = vec4(0.75, 0.95, 0.78, a);
        #include <fog_fragment>
      }`,
  });
  const puff = new THREE.Points(pg, puffMat); puff.visible = false; puff.frustumCulled = false; puff.name = 'act-door-puff';

  // ---- the tesserae: gold worn to brass, 4 cm, each with one of the lintel's forms cut in its face
  const TS = 0.04, TH = 0.018;
  const tg = new THREE.BoxGeometry(TS, TH, TS);
  const aForm = new THREE.InstancedBufferAttribute(new Float32Array(TESSERAE).fill(-1), 1);
  tg.setAttribute('aForm', aForm);
  const tMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c9a24a'), metalness: 0.85, roughness: 0.32, emissive: new THREE.Color('#4a300c'), emissiveIntensity: 1 });
  engrave(tMat, { scale: 0.13 / (TS * 0.42), half: 0.016, top: TH / 2, face: TS / 2 });
  tMat.customProgramCacheKey = () => 'fp-act-tessera';
  const tess = new THREE.InstancedMesh(tg, tMat, TESSERAE);
  tess.count = 0; tess.castShadow = false; tess.receiveShadow = true; tess.name = 'act-door-tesserae'; tess.frustumCulled = false;
  // where each comes to rest: a loose spread on the flags in front of the threshold, the first nearest the door
  const rest = [];
  for (let k = 0; k < TESSERAE; k++) rest.push({ x: x1 - 0.24 - k * 0.05 - rng() * 0.06, z: zc + (rng() - 0.5) * 0.36 + (k % 2 ? -0.07 : 0.07), ry: rng() * Math.PI });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  function place(k, x, y, z, ry) { q.setFromEuler(e.set(0, ry, 0)); m4.compose(v3.set(x, y, z), q, one); tess.setMatrixAt(k, m4); tess.instanceMatrix.needsUpdate = true; }
  const yRest = Yf + TH / 2 + 0.003;
  function lay(n, forms) {
    const c = Math.min(n, TESSERAE);
    for (let k = 0; k < c; k++) { place(k, rest[k].x, yRest, rest[k].z, rest[k].ry); aForm.setX(k, forms?.[k] ?? 0); }
    aForm.needsUpdate = true; tess.count = c;
  }
  meshes.push(seam, spill, dust, tess, puff);

  // ---- the act
  const P = ctx.player;
  let t = -1, n = 0, fired = 0, k0 = 0, lit = new THREE.Color();
  const cueDoor = { x: x1 + 0.2, y: Yf + 1.2, z: zc }, cueRing = { x: ring.position.x, y: ring.position.y - 0.1, z: ring.position.z };
  const cueIn = { x: x1 + 2, y: Yf - 1, z: zc };
  let jolt = 0, joltV = 0, flash = 0;
  const st = { t: -1, n: 0, tesserae: 0, strikes: 0, answers: 0, ring: 0, ringMax: 0, seam: 0, jolt: 0, spun: 0 };
  const near = (i) => Math.min(1, Math.max(0, (n - 1) * 0.4 + i * 0.12)); // how near the inside's i-th knock lands

  ctx.registerUpdate((dt) => {
    if (t < 0) return; // idle: nothing per frame
    t += dt; st.t = t;
    // the visitor's knocks: the ring rises off its boss and drops back
    let lift = 0;
    for (let i = 0; i < 3; i++) {
      const u = t - T.strikes[i] + LIFT; // u in [0, LIFT]: rising; [LIFT, LIFT + FALL]: falling
      if (u >= 0 && u < LIFT) lift = Math.max(lift, Math.sin((u / LIFT) * Math.PI / 2));
      else if (u >= LIFT && u < LIFT + FALL) lift = Math.max(lift, 1 - ((u - LIFT) / FALL) ** 2);
      else if (u >= LIFT + FALL && u < LIFT + FALL + 0.25) lift = Math.max(lift, 0.08 * Math.sin((u - LIFT - FALL) / 0.25 * Math.PI)); // the bounce
      if (!(fired & (1 << i)) && t >= T.strikes[i]) { fired |= 1 << i; st.strikes++; ctx.audio?.cue('act-knock', cueRing); joltV -= 0.05; puffU.uT.value = 0; puff.visible = true; }
    }
    ring.rotation.z = ringRot - lift * 1.45; st.ring = lift; st.ringMax = Math.max(st.ringMax, lift); ringMat.emissiveIntensity = 0.7 + 1.3 * lift;
    if (puff.visible) { puffU.uT.value += dt; if (puffU.uT.value > 1.2) puff.visible = false; }
    // the answers from inside: knocks, each nearer than the last, jolting the door and loosening the dust
    for (let i = 0; i < 3; i++) {
      const b = 8 << i;
      if (!(fired & b) && t >= T.answers[i]) {
        fired |= b; st.answers++;
        const nr = near(i);
        ctx.audio?.cue('act-answer', cueIn, { near: nr });
        joltV -= 0.12 + 0.55 * nr; // m/s, outward
        flash = Math.max(flash, 0.35 + 0.65 * nr); // a lamp swung behind the door: light in the seam with each knock
        dustU.uT.value = 0; dustU.uAmt.value = Math.max(dustU.uAmt.value, 0.25 + 0.75 * nr); dust.visible = true;
      }
    }
    // the door in its frame: a damped spring about where it hangs
    joltV += (-jolt * 600 - joltV * 12) * dt; jolt += joltV * dt; jolt = Math.max(-0.025, Math.min(0.01, jolt));
    doorMesh.position.x = door0 + jolt; ring.position.x = ring0 + jolt; st.jolt = jolt;
    if (dust.visible) { dustU.uT.value += dt; if (dustU.uT.value > 3.2) { dust.visible = false; dustU.uAmt.value = 0; } }
    // the light inside
    const s0 = T.seam[0], s1 = T.seam[1];
    flash = Math.max(0, flash - dt * 2.2);
    const glow = Math.max(flash, t < s0 || t > s1 ? 0 : Math.min(1, (t - s0) / 0.5) * Math.min(1, (s1 - t) / 2) * (0.75 + 0.25 * Math.sin(t * 9) * Math.sin(t * 3.7)));
    tMat.emissiveIntensity = 1 + 5 * glow;
    seam.visible = spill.visible = glow > 0.002; st.seam = glow;
    seamMat.color.copy(lit).multiplyScalar(0.5 + 3.0 * glow * (0.5 + 0.5 * near(2)));
    spillMat.opacity = glow * (0.35 + 0.4 * near(2));
    if (!(fired & 64) && n >= 3 && t >= T.spin) { fired |= 64; H.spin(11); st.spun++; ctx.audio?.cue('glyph-shift', { x: x1 - 0.21, y: Yf + 2.86, z: zc }); }
    // the tessera, pushed out under the door: along the threshold's top, off its lip, and over the flags to rest
    if (k0 < TESSERAE) {
      const u = (t - T.slide[0]) / (T.slide[1] - T.slide[0]);
      if (u >= 0) {
        if (!(fired & 128)) { fired |= 128; tess.count = k0 + 1; ctx.audio?.cue('act-tessera', { x: x1, y: Yf + 0.1, z: zc }); }
        const w = Math.min(1, u), ease = 1 - (1 - w) ** 3, r = rest[k0];
        const x = (x1 + 0.34) + (r.x - (x1 + 0.34)) * ease, z = zc + (r.z - zc) * ease;
        const y = x > x1 - 0.16 ? Yf + 0.03 + TH / 2 : yRest + Math.max(0, (x - (x1 - 0.3)) / 0.14) * 0.03 * (1 - w);
        place(k0, x, y, z, r.ry * ease + (1 - ease) * 0.6);
        st.tesserae = k0 + (w >= 1 ? 1 : 0);
      }
    }
    if (t >= T.end) {
      t = -1; st.t = -1; seam.visible = spill.visible = false; dust.visible = false;
      doorMesh.position.x = door0; ring.position.x = ring0; ring.rotation.z = ringRot; jolt = joltV = flash = 0; tMat.emissiveIntensity = 1; puff.visible = false; ringMat.emissiveIntensity = 0.7;
    }
  });

  const handle = ctx.acts.add({
    id: ID,
    at: { x: D.x - 0.1, y: Yf + 1.3, z: zc },
    face: { x: -1, z: 0 },
    reach: 2.6, rise: 1.4, cone: 0.75,
    words: 'Knock',
    do: (count, data) => {
      n = count; t = 0; fired = 0; jolt = joltV = 0;
      k0 = Math.min(count - 1, TESSERAE);
      // the light behind: glacial blue once the crystal's thread has come down the stair
      lit.set((ctx.acts.count('mother-hand') > 0) ? '#7fd8ff' : '#ff7a2a');
      const forms = Array.isArray(data?.forms) ? data.forms.slice(0, TESSERAE) : [];
      if (k0 < TESSERAE) {
        forms[k0] = doorsLast(ctx, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        aForm.setX(k0, forms[k0]); aForm.needsUpdate = true;
        handle.setData({ forms });
      }
      st.n = count;
      return T.end;
    },
    show: (count, data) => { lay(count, data?.forms); st.tesserae = Math.min(count, TESSERAE); st.n = count; },
  });
  // the tessera being pushed out is not drawn until it moves (lay() drew the remembered ones)
  ctx.hypogeumAct = st;
  st.state = () => ({ ...st, count: handle.count, offered: ctx.acts.offered?.def.id === ID, drawn: tess.count });
  st.rest = rest; st.at = handle.def.at;
  return st;
}
