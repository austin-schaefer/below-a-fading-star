// The Hypogeum's door (v10-A1, #9): the bronze door at the foot of the stair that never opens, and the Reckoner behind it,
// who keeps the count of the sun's gutters (stories/the-reckoner.md). Registered from src/v2/ruins/hypogeum.js, which
// hands over its public frame (ctx.hypogeum: the door and its uniforms, the old ring, the glyph row's material, its
// reading lamp uRead, its glow lift and spin()). With ?acts=0 none of this is built and the door is as it was.
//
// Before anything is done: a great knocker ring, bronze worn bright, hangs from the right leaf's boss, the full height of
// the leaf's upper half, over a striking stud; a dim warm light shows in the seam between the leaves and in a fan under
// them (his lamp, far down); the bronze's sky sheen and the glyph row are raised so the door reads at the stair's foot.
//
// The act, "Knock", once a visit, about 22 s:
//   0-3 s     the great ring is lifted out toward the visitor and dropped, three times: each fall jolts the leaf, shakes
//             dust from the lintel and sends a ripple of light out over the bronze from the stud (act-knock);
//   3.8-5.6 s three knocks answer from inside, each jolting the door outward and flaring the light in the seam (act-answer):
//             from far below the first visit, nearer the second, just behind the bronze from the third;
//   6-10 s    the lamp comes up behind the door: the seam and the fan under it brighten, and the light passes behind the
//             glyph row from left to right, lighting each glyph in turn (his voice); then the row turns: one place, or from
//             the third visit a whole turn of eleven;
//   9.5-13 s  the shadow of a hand comes into the fan of light from under the door and lies flat, fingers spread (as the
//             visitor's lies on the crystal);
//   12.5-14 s a bronze plate is pushed out under the door and slides to the visitor's feet (act-plate): the door's last glyph
//             cut large in it, and beside it his tally for them, a stroke a visit in gates of five, in chalk;
//   15-21 s   the lamp goes back down: the light sinks down the seam and the fan dims to its first glow.
// Remembered: show(n) lays the plate (n > 0) with n strokes and its glyph (the act's data). Once the mother crystal's
// thread has come down the stair (src/v10/crystal.js) his light is the crystal's blue.
// No point light: the seam, its halo and the fan are emissive quads; the ripple is a term in the door's own material.
import * as THREE from 'three';
import { glyphStrokes } from '../v2/ruins/hypogeum.js';
import { doorsLast } from '../v7/glyphs/forms.js';

const ID = 'hypogeum-door';
export const T = { strikes: [1.5, 3.7, 5.9], answers: [7.4, 8.3, 9.2], lamp: [9.6, 19.6], read: [10.2, 13.2], turn: 13.4, hand: [13.0, 17.0], slide: [16.2, 17.6], sink: [19.6, 25.0], end: 25.5 };
const LIFT = 0.8, HOLD = 0.4, FALL = 0.14; // s: the ring hauled up and out, held clear, and falling back: one knock in 2.2 s
const STEP = 3.4; // m from the door's face: where the visitor is eased back to as the door jolts out at them, from which
// the lintel's glyphs, the seam, the sill and the plate at their feet are all in the view
const HINGE = new THREE.Vector3(Math.sin(0.9), 0, Math.cos(0.9)); // the ring's swing: out toward the visitor and wide to
// their right, so its lift is plain from in front and not foreshortened into the bronze
const EMBER = new THREE.Color('#ff8a3a'), BLUE = new THREE.Color('#79d2ff');

export function doorAct(ctx, H, meshes) {
  if (!ctx.acts || ctx.acts.off) return null;
  const rng = ctx.makeRng(1002);
  const D = H.door, x1 = D.x - 0.3, xd = D.x, zc = D.z, Yf = H.floor, dHalf = D.width / 2, HD = D.height;
  const doorMesh = H.doorMesh;
  const door0 = doorMesh.position.x;
  H.ring.visible = false; // the great ring hangs in its place on this leaf

  // ---- the place made legible: the bronze's sheen and the glyph row raised
  if (H.doorU?.uSheen) H.doorU.uSheen.value = 0.85;
  if (H.glyphLift) H.glyphLift.v = 0.9;

  // ---- the great ring, its staple under the boss and the stud it strikes; bronze polished by every hand that lifted it
  const zr = zc + dHalf / 2, yp = Yf + 2.02, RR = 0.4;
  const ringMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d0a864'), metalness: 0.85, roughness: 0.3, emissive: new THREE.Color('#7a4c22'), emissiveIntensity: 0.6 });
  const rg = new THREE.TorusGeometry(RR, 0.045, 10, 36); rg.rotateY(Math.PI / 2); rg.translate(0, -RR, 0);
  const ring = new THREE.Mesh(rg, ringMat); ring.position.set(xd - 0.075, yp, zr); ring.castShadow = true; ring.receiveShadow = true; ring.name = 'act-door-ring';
  const fit = new THREE.Group(); fit.name = 'act-door-fittings';
  { const g = new THREE.TorusGeometry(0.045, 0.014, 6, 12); g.rotateZ(Math.PI / 2); const m = new THREE.Mesh(g, ringMat); m.position.set(xd - 0.05, yp + 0.02, zr); fit.add(m); }
  { const g = new THREE.CylinderGeometry(0.075, 0.09, 0.05, 12); g.rotateZ(Math.PI / 2); const m = new THREE.Mesh(g, ringMat); m.position.set(xd - 0.025, yp - 2 * RR, zr); fit.add(m); }
  const ringRest = 0.04;
  ring.rotation.z = ringRest;
  const ringQ0 = ring.quaternion.clone(), qLift = new THREE.Quaternion();
  // ---- his light: a plate of light behind the leaves (seen through the seam and the gap over them), a soft halo over
  // the seam, and a fan on the floor under the door; the hand's shadow is cast in the fan
  const seamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#000000'), fog: true });
  const seam = new THREE.Mesh(new THREE.PlaneGeometry(dHalf * 2, HD), seamMat);
  seam.position.set(x1 + 0.41, Yf + HD / 2, zc); seam.rotation.y = -Math.PI / 2; seam.name = 'act-door-seam';
  const haloC = document.createElement('canvas'); haloC.width = 64; haloC.height = 8;
  { const g = haloC.getContext('2d'), gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 8); }
  const haloMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(haloC), color: new THREE.Color('#000000'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(0.22, HD - 0.1), haloMat);
  halo.position.set(xd - 0.05, Yf + HD / 2, zc); halo.rotation.y = -Math.PI / 2; halo.renderOrder = 3; halo.name = 'act-door-halo';
  // the fan: u runs from the visitor (0) to the door (1), v across the doorway
  const uFan = { uCol: { value: new THREE.Color() }, uHandS: { value: new THREE.Vector3(-1, 0, 0) }, uSink: { value: 0 } };
  const fanMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  const FL = 1.15, FW = dHalf * 2 + 0.1;
  fanMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uFan);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vFp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvFp = uv;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uCol, uHandS; uniform float uSink; varying vec2 vFp;
        float fpSeg(vec2 p, vec2 a, vec2 b, float r) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float dist = (1.0 - vFp.x) * ${FL.toFixed(2)};          // metres out from the door
          float side = (vFp.y - 0.5) * ${FW.toFixed(2)};          // metres across
          float fan = exp(-dist / 0.5) * (1.0 - smoothstep(${(dHalf - 0.45).toFixed(2)}, ${(dHalf + 0.05).toFixed(2)}, abs(side) - dist * 0.3)) * (0.75 + 0.25 * exp(-side * side / 0.05));
          // the hand: palm toward the door, fingers out toward the visitor, a little larger than a hand; uHandS.x how far
          // it has come out (m), y how spread, z how dark
          vec2 hp = vec2(side + 0.1, dist - uHandS.x) / 1.9;
          float hd = length((hp - vec2(0.0, -0.03)) / vec2(0.055, 0.065)) - 1.0; hd *= 0.05;
          for (int f = 0; f < 4; f++) {
            float ff = float(f);
            vec2 a = vec2(-0.036 + ff * 0.024, 0.02), b = a + vec2((ff - 1.5) * (0.006 + 0.02 * uHandS.y), 0.07 + 0.018 * (1.0 - abs(ff - 1.4) * 0.6));
            hd = min(hd, fpSeg(hp, a, b, 0.012));
          }
          hd = min(hd, fpSeg(hp, vec2(0.045, -0.03), vec2(0.07 + 0.03 * uHandS.y, 0.02), 0.013));
          hd = min(hd, fpSeg(hp, vec2(0.0, -0.06), vec2(0.0, -0.5), 0.05)); // the wrist and arm, back under the door
          float shade = 1.0 - uHandS.z * (1.0 - smoothstep(0.0, 0.012, hd));
          diffuseColor.rgb = uCol * fan * shade;
          diffuseColor.a = 1.0;
        }`);
  };
  fanMat.customProgramCacheKey = () => 'fp-act-door-fan';
  const fan = new THREE.Mesh(new THREE.PlaneGeometry(FL, FW), fanMat);
  fan.rotation.x = -Math.PI / 2; fan.position.set(xd - FL / 2 - 0.02, Yf + 0.04, zc); fan.renderOrder = 3; fan.name = 'act-door-fan';

  // ---- dust from the lintel's joint: falls while the door jolts
  const ND = 260, dp = new Float32Array(ND * 3), ds = new Float32Array(ND);
  for (let i = 0; i < ND; i++) { dp[i * 3] = x1 + 0.25 - rng() * 0.3; dp[i * 3 + 1] = Yf + HD + 0.02 - rng() * 0.05; dp[i * 3 + 2] = zc + (rng() - 0.5) * 2.2; ds[i] = rng(); }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dg.setAttribute('aSeed', new THREE.BufferAttribute(ds, 1));
  const dustU = { uT: { value: 9 }, uAmt: { value: 0 }, uFloor: { value: Yf } };
  const dustMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, dustU]), transparent: true, depthWrite: false, fog: true,
    vertexShader: `uniform float uT, uAmt, uFloor; attribute float aSeed; varying float vA;
      #include <common>
      #include <fog_pars_vertex>
      void main() {
        float t = uT - aSeed * 0.4, fall = max(0.0, t);
        vec3 p = position;
        p.y -= fall * (0.25 + 0.5 * aSeed) + 0.5 * fall * fall;
        p.x -= fall * (0.08 + 0.2 * fract(aSeed * 7.3));
        p.z += sin(fall * 3.0 + aSeed * 40.0) * 0.03;
        vA = step(0.0, t) * step(aSeed, uAmt) * (1.0 - smoothstep(uFloor + 0.2, uFloor, p.y)) * (1.0 - smoothstep(1.4, 2.4, fall));
        vec3 transformed = p; // the fog chunks read it
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = max(2.0, (0.008 + 0.014 * fract(aSeed * 13.1)) * 560.0 / -mvPosition.z);
        #include <fog_vertex>
      }`,
    fragmentShader: `varying float vA;
      #include <common>
      #include <fog_pars_fragment>
      void main() {
        float a = (1.0 - smoothstep(0.2, 0.5, length(gl_PointCoord - 0.5))) * vA * 0.9;
        if (a < 0.01) discard;
        gl_FragColor = vec4(0.92, 0.84, 0.7, a);
        #include <fog_fragment>
      }`,
  });
  const dust = new THREE.Points(dg, dustMat); dust.visible = false; dust.name = 'act-door-dust';
  dg.boundingSphere = new THREE.Sphere(new THREE.Vector3(x1, Yf + 1.3, zc), 3);

  // ---- the plate: a bronze tablet 64 x 40 cm, the door's last glyph cut large, his tally for the visitor in chalk; on
  // its back, cut, the lantern hanging in its notch (the Lantern Halt) and beside it in his chalk the strokes the visitor
  // has chalked on the Halt's tally (src/v10/tally.js): he reckons that too, and the back shows what he has counted
  const PW = 0.64, PD = 0.4, PT = 0.02;
  const pc = document.createElement('canvas'); pc.width = 256; pc.height = 160;
  const pTex = new THREE.CanvasTexture(pc); pTex.colorSpace = THREE.SRGBColorSpace; pTex.anisotropy = 4;
  function drawPlate(n, form) {
    const g = pc.getContext('2d'), W = 256, Hh = 160;
    g.fillStyle = '#5a4424'; g.fillRect(0, 0, W, Hh);
    const r2 = ctx.makeRng(1014);
    for (let i = 0; i < 260; i++) { g.fillStyle = r2() < 0.5 ? 'rgba(30,42,30,0.25)' : 'rgba(150,112,60,0.18)'; g.beginPath(); g.arc(r2() * W, r2() * Hh, 2 + r2() * 8, 0, 6.3); g.fill(); }
    g.strokeStyle = 'rgba(210,170,100,0.8)'; g.lineWidth = 4; g.strokeRect(6, 6, W - 12, Hh - 12);
    g.strokeStyle = 'rgba(25,18,10,0.7)'; g.lineWidth = 2; g.strokeRect(11, 11, W - 22, Hh - 22);
    // the glyph, cut: dark grooves with a bright lip, on the left
    const gx = 70, gy = 80, sc = 380;
    const path = (o) => { for (const s of glyphStrokes(form)) { g.beginPath(); if (s[0] === 's') { g.moveTo(gx + s[1] * sc, gy - s[2] * sc); g.lineTo(gx + s[3] * sc, gy - s[4] * sc); } else if (s[0] === 'r') g.arc(gx + s[1] * sc, gy - s[2] * sc, s[3] * sc, 0, 6.3); else g.arc(gx + s[1] * sc, gy - s[2] * sc, 3, 0, 6.3); o(); } };
    g.lineCap = 'round';
    path(() => { g.strokeStyle = 'rgba(230,190,120,0.9)'; g.lineWidth = 9; g.stroke(); });
    path(() => { g.strokeStyle = 'rgba(20,14,8,0.95)'; g.lineWidth = 5; g.stroke(); });
    // the tally: a stroke a visit, gates of five, in chalk, on the right
    g.strokeStyle = 'rgba(240,234,220,0.95)'; g.lineWidth = 4;
    for (let k = 0; k < Math.min(n, 25); k++) {
      const gate = Math.floor(k / 5), j = k % 5, row = Math.floor(gate / 2), col = gate % 2;
      const bx = 140 + col * 52, by = 34 + row * 40;
      g.beginPath();
      if (j < 4) { g.moveTo(bx + j * 9, by); g.lineTo(bx + j * 9 + 1, by + 30); } else { g.moveTo(bx - 4, by + 26); g.lineTo(bx + 32, by + 4); }
      g.stroke();
    }
    pTex.needsUpdate = true;
  }
  const bc = document.createElement('canvas'); bc.width = 256; bc.height = 160;
  const bTex = new THREE.CanvasTexture(bc); bTex.colorSpace = THREE.SRGBColorSpace; bTex.anisotropy = 4;
  function drawBack(k) { // k: the visitor's strokes at the Halt
    const g = bc.getContext('2d'), W = 256, Hh = 160;
    g.setTransform(-1, 0, 0, 1, W, 0); // the back face's uv runs right to left
    g.fillStyle = '#4e3a1e'; g.fillRect(0, 0, W, Hh);
    const r2 = ctx.makeRng(1015);
    for (let i = 0; i < 220; i++) { g.fillStyle = r2() < 0.5 ? 'rgba(30,42,30,0.25)' : 'rgba(150,112,60,0.16)'; g.beginPath(); g.arc(r2() * W, r2() * Hh, 2 + r2() * 8, 0, 6.3); g.fill(); }
    g.strokeStyle = 'rgba(210,170,100,0.8)'; g.lineWidth = 4; g.strokeRect(6, 6, W - 12, Hh - 12);
    // the slab with its notch, and the lantern hung in it on its arch: cut grooves with a bright lip, the globe gilt
    const cut = (draw, w) => { g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = 'rgba(230,190,120,0.9)'; g.lineWidth = w + 4; draw(); g.stroke(); g.strokeStyle = 'rgba(20,14,8,0.95)'; g.lineWidth = w; draw(); g.stroke(); };
    cut(() => { g.beginPath(); g.moveTo(26, 140); g.lineTo(26, 40); g.lineTo(52, 40); g.lineTo(72, 78); g.lineTo(92, 40); g.lineTo(118, 40); g.lineTo(118, 140); }, 4);
    cut(() => { g.beginPath(); g.moveTo(72, 22); g.lineTo(72, 46); }, 3); // its chain
    g.fillStyle = 'rgba(255,196,96,0.95)'; g.beginPath(); g.arc(72, 70, 22, 0, 6.3); g.fill();
    g.fillStyle = 'rgba(60,20,10,0.9)'; g.beginPath(); g.ellipse(80, 76, 8, 9, 0, 0, 6.3); g.fill(); // the open hatch
    cut(() => { g.beginPath(); g.arc(72, 70, 22, 0, 6.3); }, 3);
    cut(() => { g.beginPath(); g.ellipse(72, 70, 9, 22, 0, 0, 6.3); g.moveTo(50, 70); g.lineTo(94, 70); }, 2); // meridian, equator
    // his chalk: their strokes in saffron, gates of five, as they stand on the slab; none yet, one stroke's place dotted
    g.strokeStyle = 'rgba(255,206,110,0.98)'; g.lineWidth = 5; g.lineCap = 'round';
    if (k <= 0) { g.setLineDash([3, 7]); g.beginPath(); g.moveTo(160, 52); g.lineTo(162, 112); g.stroke(); g.setLineDash([]); }
    for (let i = 0; i < Math.min(k, 20); i++) {
      const gate = Math.floor(i / 5), j = i % 5, bx = 146 + (gate % 2) * 50, by = 36 + Math.floor(gate / 2) * 54;
      g.beginPath();
      if (j < 4) { g.moveTo(bx + j * 9, by); g.lineTo(bx + j * 9 + 1, by + 40); } else { g.moveTo(bx - 4, by + 34); g.lineTo(bx + 32, by + 6); }
      g.stroke();
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    bTex.needsUpdate = true;
  }
  const backMat = new THREE.MeshStandardMaterial({ map: bTex, metalness: 0.55, roughness: 0.5, emissive: new THREE.Color('#ffffff'), emissiveMap: bTex, emissiveIntensity: 0.25 });
  const plateMat = new THREE.MeshStandardMaterial({ map: pTex, metalness: 0.55, roughness: 0.5, emissive: new THREE.Color('#ffffff'), emissiveMap: pTex, emissiveIntensity: 0.08 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6a5028'), metalness: 0.85, roughness: 0.4 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(PD, PT, PW), [edgeMat, edgeMat, plateMat, backMat, edgeMat, edgeMat]);
  // the top face's uv: rotate so the glyph is on the visitor's left as they face the door (+x)
  { const uv = plate.geometry.attributes.uv; for (let i = 8; i < 12; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, 1 - v, u); } for (let i = 12; i < 16; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, v, u); } }
  plate.visible = false; plate.castShadow = false; plate.receiveShadow = true; plate.name = 'act-door-plate';
  let backUp = false; // the plate lies lantern side up once it has been read
  const restX = x1 - 0.4, yRest = Yf + PT / 2 + 0.004; // just out over the threshold: in the view from STEP back
  const placePlate = (x) => { plate.position.set(x, x > x1 - 0.16 - PD / 2 ? Yf + 0.03 + PT / 2 : yRest, zc - 0.05); plate.quaternion.set(0, 0, 0, 1); if (backUp) plate.rotateX(Math.PI); };
  placePlate(restX);

  meshes.push(ring, seam, halo, fan, dust, plate);
  ctx.scene.add(fit); // a group: the ruins' tally of meshes counts geometries

  // ---- the light, now: k 0..1 (0 the first glow), its colour by whether the crystal's thread has come
  const lit = new THREE.Color();
  function light(k, flash = 0) {
    const thread = (ctx.acts.count('mother-hand') > 0) ? 1 : 0;
    lit.copy(EMBER).lerp(BLUE, thread);
    const b = 0.9 * k + flash;
    seamMat.color.copy(lit).multiplyScalar(0.13 + 1.3 * b);   // at rest a faint line: his lamp far down
    haloMat.color.copy(lit).multiplyScalar(0.045 + 0.32 * b);
    uFan.uCol.value.copy(lit).multiplyScalar(0.05 + 0.75 * b);
    plateMat.emissiveIntensity = 0.2 + 0.5 * k + glow;
    st.light = b;
  }

  // ---- the act
  let t = -1, n = 0, fired = 0, form = 0, jolt = 0, joltV = 0, flash = 0, glow = 0; // glow: the new plate catching his light as it comes
  const cueRing = { x: xd - 0.05, y: yp - 2 * RR, z: zr }, cueIn = { x: x1 + 2, y: Yf - 1, z: zc };
  const st = { strikeAt: [], points: { lintel: [x1 - 0.21, Yf + 2.86, zc], seam: [xd, Yf + HD / 2, zc], sill: [xd, Yf, zc] }, t: -1, n: 0, strikes: 0, answers: 0, ring: 0, ringMax: 0, read: 0, spun: 0, hand: 0, plate: false, light: 0, jolt: 0 };
  const near = (i) => Math.min(1, Math.max(0, (n - 1) * 0.4 + i * 0.12)); // how near the inside's i-th knock lands
  const sstep = THREE.MathUtils.smoothstep;
  // ---- the visitor's view while he answers (ctx.controls.carry, as the Halt's seat): held where they knocked, the look on
  // the ring; as the door jolts out at them they are eased a step back to STEP, the look on the whole door, lintel to
  // sill, so the glyphs read, the seam lights, the hand comes and the plate arrives in one frame. Let go once the plate
  // is out, at once if they push to walk, and never steered again once they move the look themselves
  const P = ctx.player, from = new THREE.Vector3(), back = new THREE.Vector3(), view = { yaw: 0, pitch: 0, rate: 0 };
  let release = null, took = false;
  const eased = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const letGo = () => { if (release) { release(); release = null; P.vel?.set(0, 0, 0); } };
  const knockCarry = {
    step(pos) {
      pos.copy(from).lerp(back, eased(T.answers[0] - 0.4, T.answers[0] + 1.3, t));
    },
    drop() { release = null; },
    look(dt, quiet) {
      if (t > 0.3 && quiet < 0.05) took = true;
      if (took || t < 0) return null;
      const late = t > T.answers[0] - 0.4;
      const ax = late ? xd : xd - 0.05, az = late ? zc : zc + 0.18, ay = late ? Yf + 1.18 : yp - RR * 0.9;
      view.yaw = Math.atan2(-(ax - P.pos.x), -(az - P.pos.z)); view.pitch = Math.atan2(ay - P.pos.y, Math.hypot(ax - P.pos.x, az - P.pos.z));
      view.rate = late ? 1.6 : 2.5;
      return view;
    },
  };

  // ---- the plate's act, "Read the plate": the visitor takes it up from the flags into their hands, his side toward them
  // (the glyph, their knocks), turns it over (the lantern in its notch and their strokes at the Halt in his chalk), and
  // lays it down again lantern side up, as it stays
  const RD = { up: [0.2, 1.5], flip: [3.6, 4.5], down: [8.4, 9.6], end: 9.9 };
  let rt = -1;
  const qRest = new THREE.Quaternion(), qHold = new THREE.Quaternion(), qBack = new THREE.Quaternion(), qDown = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
  const pRest = new THREE.Vector3(), pHold = new THREE.Vector3(), fwd = new THREE.Vector3(), qa = new THREE.Quaternion();
  const YAX = new THREE.Vector3(0, 1, 0);
  const readCarry = {
    step(pos) { pos.copy(from); },
    drop() { release = null; },
    look(dt, quiet) {
      if (rt > 0.3 && quiet < 0.05) took = true;
      if (took || rt < 0) return null;
      if (rt > RD.down[0]) { // laid down: the look back up to the door, the plate at the foot of the view
        view.yaw = Math.atan2(-(xd - P.pos.x), -(zc - P.pos.z)); view.pitch = Math.atan2(Yf + 0.9 - P.pos.y, Math.hypot(xd - P.pos.x, zc - P.pos.z)); view.rate = 1.5;
        return view;
      }
      view.yaw = Math.atan2(-(plate.position.x - P.pos.x), -(plate.position.z - P.pos.z));
      view.pitch = Math.atan2(plate.position.y - P.pos.y, Math.hypot(plate.position.x - P.pos.x, plate.position.z - P.pos.z));
      view.rate = 3;
      return view;
    },
  };
  function stepRead(dt) {
    rt += dt; st.reading = rt;
    // held: in front of the eye, a little low, tilted up to face it (far edge up), its across-axis level
    fwd.set(-Math.sin(P.yaw), 0, -Math.cos(P.yaw));
    const cam = ctx.camera, hw = Math.tan((cam.fov * Math.PI) / 360) * cam.aspect; // the view's half-width a metre out
    const far = Math.max(0.6, 0.4 / hw); // far enough that the whole plate fits across, on a phone held upright too
    pHold.copy(P.pos).addScaledVector(fwd, far); pHold.y -= 0.17 * far / 0.6;
    qa.setFromAxisAngle(new THREE.Vector3(fwd.z, 0, -fwd.x).normalize(), -1.3); // tip its far edge up toward the eye
    qHold.setFromAxisAngle(YAX, P.yaw + Math.PI / 2).premultiply(qa); // its +x (toward the door when lying) along the look
    qBack.copy(qHold).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)); // turned over in the hands
    const up = eased(RD.up[0], RD.up[1], rt), fl = eased(RD.flip[0], RD.flip[1], rt), dn = eased(RD.down[0], RD.down[1], rt);
    const q = qa.copy(qHold).slerp(qBack, fl);
    plate.position.copy(pRest).lerp(pHold, up * (1 - dn));
    plate.quaternion.copy(qRest).slerp(q, up); if (dn > 0) plate.quaternion.slerp(qDown, dn);
    plate.position.y += Math.sin(Math.PI * fl) * 0.06; // lifted a little to turn it
    plateMat.emissiveIntensity = 0.35 + 0.6 * up * (1 - dn); backMat.emissiveIntensity = 0.25 + 0.6 * up * (1 - dn);
    st.flip = fl;
    if (rt >= RD.end) {
      rt = -1; st.reading = -1; backUp = true; placePlate(restX); letGo(); light(0);
    }
  }

  ctx.registerUpdate((dt) => {
    if (t < 0 && rt < 0) return; // idle: nothing per frame
    if (release && P.intent > 0.3) { letGo(); if (rt >= 0 && rt < RD.down[0]) rt = RD.down[0]; } // they want to walk: let them (the plate is laid down)
    if (rt >= 0) stepRead(dt);
    if (t < 0) return;
    t += dt; st.t = t;
    if (release && t > T.slide[1] + 1.2) letGo();
    // the visitor's knocks: the ring hauled out toward them and dropped
    let lift = 0;
    for (let i = 0; i < 3; i++) {
      const u = t - T.strikes[i] + LIFT + HOLD + FALL;
      if (u >= 0 && u < LIFT) lift = Math.max(lift, Math.sin((u / LIFT) * Math.PI / 2));
      else if (u >= LIFT && u < LIFT + HOLD) lift = 1;
      else if (u >= LIFT + HOLD && u < LIFT + HOLD + FALL) lift = Math.max(lift, 1 - ((u - LIFT - HOLD) / FALL) ** 2);
      else if (u >= LIFT + HOLD + FALL && u < LIFT + HOLD + FALL + 0.3) lift = Math.max(lift, 0.07 * Math.sin((u - LIFT - HOLD - FALL) / 0.3 * Math.PI));
      if (!(fired & (1 << i)) && t >= T.strikes[i]) {
        fired |= 1 << i; st.strikes++; st.strikeAt.push(+t.toFixed(3));
        ctx.audio?.cue('act-knock', cueRing);
        joltV += 0.35; // the leaf knocked back into its frame
        dustU.uT.value = 0; dustU.uAmt.value = Math.max(dustU.uAmt.value, 0.35); dust.visible = true;
      }
    }
    ring.quaternion.copy(ringQ0).premultiply(qLift.setFromAxisAngle(HINGE, -lift * 1.45)); st.ring = lift; st.ringMax = Math.max(st.ringMax, lift);
    ringMat.emissiveIntensity = 0.6 + 0.8 * lift;
    // the answers from inside
    for (let i = 0; i < 3; i++) {
      const b = 8 << i;
      if (!(fired & b) && t >= T.answers[i]) {
        fired |= b; st.answers++;
        const nr = near(i);
        ctx.audio?.cue('act-answer', cueIn, { near: nr });
        joltV -= 0.25 + 0.6 * nr; // outward, toward the visitor
        flash = Math.max(flash, 0.5 + 0.8 * nr);
        dustU.uT.value = 0; dustU.uAmt.value = Math.max(dustU.uAmt.value, 0.4 + 0.6 * nr); dust.visible = true;
      }
    }
    // the door in its frame: a damped spring about where it hangs
    joltV += (-jolt * 500 - joltV * 9) * dt; jolt += joltV * dt; jolt = Math.max(-0.03, Math.min(0.015, jolt));
    doorMesh.position.x = door0 + jolt; ring.position.x = xd - 0.075 + jolt; fit.position.x = jolt; st.jolt = jolt;
    if (dust.visible) { dustU.uT.value += dt; if (dustU.uT.value > 3) { dust.visible = false; dustU.uAmt.value = 0; } }
    flash = Math.max(0, flash - dt * 2);
    // the lamp coming up, and going back down
    const up = sstep(t, T.lamp[0], T.lamp[0] + 1.5), down = sstep(t, T.sink[0], T.sink[1]);
    light(up * (1 - down) * (0.8 + 0.2 * Math.sin(t * 7) * Math.sin(t * 2.9)), flash);
    // the light sinking: the plate of light behind the seam drops down it
    const sink = sstep(t, T.sink[0], T.sink[1] - 1);
    seam.scale.y = Math.max(0.02, 1 - sink); seam.position.y = Yf + (HD * seam.scale.y) / 2;
    halo.scale.y = seam.scale.y; halo.position.y = seam.position.y;
    // his voice: the light passing behind the glyph row, then the row turned
    if (H.glyphRead) {
      const r = (t - T.read[0]) / (T.read[1] - T.read[0]);
      H.glyphRead.value.set(-1 + r * 12, r > 0 && r < 1 ? 2.2 : 0);
      st.read = r > 0 && r < 1 ? r : st.read;
    }
    if (!(fired & 64) && t >= T.turn) { fired |= 64; H.spin(n >= 3 ? 11 : 1); st.spun = n >= 3 ? 11 : 1; ctx.audio?.cue('glyph-shift', { x: x1 - 0.21, y: Yf + 2.86, z: zc }); }
    // the hand in the light: coming out from under the door, stopping, spreading flat, going back
    const hIn = sstep(t, T.hand[0], T.hand[0] + 1.6), hOut = sstep(t, T.hand[1] - 0.8, T.hand[1]);
    uFan.uHandS.value.set(-0.35 + 0.6 * hIn - 0.6 * hOut, sstep(t, T.hand[0] + 1.6, T.hand[0] + 2.4), (hIn > 0.01 && hOut < 0.99) ? 0.92 : 0);
    st.hand = Math.max(st.hand, hIn * (1 - hOut));
    // the plate, pushed out under the door: over the threshold, off its lip, over the flags to the visitor's feet
    const u = (t - T.slide[0]) / (T.slide[1] - T.slide[0]);
    if (u >= 0 && !(fired & 128)) { fired |= 128; drawPlate(n, form); plate.visible = true; ctx.audio?.cue('act-plate', { x: x1, y: Yf + 0.1, z: zc }); }
    if (u >= 0 && rt < 0) { const w = Math.min(1, u), e = 1 - (1 - w) ** 3; placePlate(xd + PD / 2 + (restX - (xd + PD / 2)) * e); st.plate = w >= 1; }
    glow = u >= 0 ? 1.1 * (1 - sstep(t, T.slide[1] + 1, T.end)) : 0;
    if (t >= T.end) {
      t = -1; st.t = -1; jolt = joltV = flash = 0;
      doorMesh.position.x = door0; ring.position.x = xd - 0.075; fit.position.x = 0; ring.quaternion.copy(ringQ0); ringMat.emissiveIntensity = 0.6;
      dust.visible = false; H.glyphRead?.value.set(-9, 0); uFan.uHandS.value.set(-1, 0, 0);
      seam.scale.y = halo.scale.y = 1; seam.position.y = halo.position.y = Yf + HD / 2;
      lay(handle.count, handle.data); // the count now: a forget during the answer holds
    }
  });

  function lay(count, data) {
    const f = Number.isInteger(data?.glyph) ? data.glyph : 0;
    plate.visible = count > 0; if (count > 0) { drawPlate(count, f); drawBack(ctx.acts.count('halt-tally')); if (rt < 0) placePlate(restX); }
    light(0); st.plate = count > 0; st.n = count;
  }
  const handle = ctx.acts.add({
    id: ID,
    at: { x: D.x - 0.1, y: Yf + 1.3, z: zc },
    face: { x: -1, z: 0 },
    reach: 2.8, rise: 1.4, cone: 0.75,
    words: 'Knock',
    do: (count) => {
      n = count; t = 0; fired = 0; jolt = joltV = flash = 0; st.strikes = st.answers = 0; st.strikeAt = []; st.ringMax = 0; st.hand = 0; st.read = 0; st.spun = 0;
      form = doorsLast(ctx, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      handle.setData({ glyph: form });
      plate.visible = false; backUp = false; // his plate goes back in, to come out again with one more stroke, his side up
      st.n = count; st.knocked = true;
      from.copy(P.pos); back.copy(P.pos);
      const d = D.x - P.pos.x; if (d < STEP) back.x = D.x - STEP; back.z += (zc - back.z) * 0.6; // a step back, toward the stair's line
      took = false; release = ctx.controls?.carry?.(knockCarry) ?? null;
      return T.end;
    },
    show: (count, data) => { if (t < 0) lay(count, data); },
  });
  const readH = ctx.acts.add({
    id: 'hypogeum-plate',
    at: { x: restX, y: Yf + 0.05, z: zc - 0.05 },
    face: { x: -1, z: 0 },
    reach: 3.3, rise: 2.2, cone: 0.75,
    words: 'Read the plate',
    when: () => st.knocked && st.plate && rt < 0 && !(t >= 0 && t < T.slide[1]),
    do: () => {
      letGo(); // the knock's hold, if it is still on
      rt = 0; st.reads = (st.reads || 0) + 1; took = false;
      drawBack(ctx.acts.count('halt-tally'));
      pRest.copy(plate.position); qRest.copy(plate.quaternion);
      from.copy(P.pos); release = ctx.controls?.carry?.(readCarry) ?? null;
      return RD.end;
    },
    show: (count) => { backUp = count > 0 && !st.knocked; if (rt < 0 && plate.visible) placePlate(restX); },
  });
  st.readCount = () => readH.count;
  Object.defineProperty(st, 'backUp', { get: () => backUp, enumerable: true });
  ctx.hypogeumAct = st;
  st.state = () => ({ ...st, count: handle.count, offered: ctx.acts.offered?.def.id === ID });
  return st;
}
