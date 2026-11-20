// The Florilegium (v18-F2): the Graffer's glasshouse in the Deodand Wood, west of the wood way (stories/the-graffer.md,
// beat 2). A bud of many-coloured glass on a mossed plinth, lit from inside by one flask of stored noon, its door
// locked with the key hanging inside; in it seven stone tubs, six flowers the size and shape of people, and a sprout.
// Their heads follow whoever walks round the glass, a little late, each at its own pace; when the visitor stands they
// go back to the flask; when the sun gutters they all turn west. Nobody gets in. In a wood that is black and teal it
// is the one many-coloured thing: the panes glow, throw their colours on the ground (one additive ring) and on the
// trunks (four coloured PointLights and the flask's own; lights.js keeps the nearest three).
// The plan: src/v18/plan.js (GLASSHOUSE, FLORILEGIUM, LIKENESSES). The ground: a level pad (src/height/pads.js).
// Draws: the frame (one: stone, iron, floor, door, paving, grate, flask), the likenesses (one), the glass (one), the
// cast colour (one), the flask's halo (one), the dark under the grate (one, two triangles). ?florilegium=0 leaves it out.
// ctx.florilegium: { centre, floor, flask, grate, tubs, heads, panes (for the moths), turn (the heads' state), meshes }
import * as THREE from 'three';
import { GLASSHOUSE, FLORILEGIUM, LIKENESSES } from './plan.js';
import { Painter, paintedMaterial, makeGround, angDiff } from '../fauna/uncanny/kit.js';
import { hyp } from '../noise.js';
import { NOON } from '../v8/strata/noon.js';
import { buildLikeness, likenessMaterial, TURN_ATTRS, N_SLOTS } from './florilegium/likeness.js';
import { buildFrame, buildGlass, buildCast, N, A, RC, SILL, EAVE, FLASK_Y, GRATE, PROF, PANES, SCHEME_A, SCHEME_B } from './florilegium/house.js';

export const FLORILEGIUM_OFF = typeof location !== 'undefined' && new URLSearchParams(location.search).get('florilegium') === '0';

// where each tub stands in the house's frame, and which way its flower faces (out, to the glass)
export function tubsOf() {
  const F = FLORILEGIUM;
  return LIKENESSES.map((L, i) => {
    if (L.id === 'graffer') return { id: L.id, x: F.sprout.x - GLASSHOUSE.x, z: F.sprout.z - GLASSHOUSE.z, yaw: Math.PI / 2 };
    const a = ((30 + 60 * i) * Math.PI) / 180;
    return { id: L.id, x: Math.cos(a) * F.ring, z: Math.sin(a) * F.ring, yaw: Math.atan2(Math.cos(a), Math.sin(a)) };
  });
}

// The heads' turning. heads: [{ slot, at: [x, y, z], yaw }]; flask: [x, y, z]; uTurn: the material's Vector4s.
// update(dt, eye, dark): eye the visitor's (a Vector3), dark the gutter's depth (sky.flicker.dark).
const TAU = [1.1, 1.7, 0.8, 2.2, 1.4, 1.4, 1.0, 0.6]; // each its own pace (s); the lovers together
const WEST = -Math.PI / 2, STILL_AFTER = 8, REACH = 34;
export function makeTurner(heads, flask, uTurn, { stillAfter = STILL_AFTER } = {}) {
  const headingTo = (h, x, z) => Math.atan2(x - h.at[0], z - h.at[2]);
  const S = heads.map((h) => { const y0 = angDiff(headingTo(h, flask[0], flask[2]), h.yaw); return { h, yaw: y0, aim: y0, pitch: 0.4, tau: TAU[h.slot], mode: 'flask' }; });
  let still = 1e3, lx = NaN, lz = NaN;
  const ease = (dt, tau) => 1 - Math.exp(-dt / tau);
  const state = { S, get still() { return still; }, mode: 'flask', err: () => Math.max(...S.map((s) => s.err || 0)) }; // err: the worst head's angle off the visitor (rad)
  state.update = (dt, eye, dark = 0) => {
    dt = Math.min(dt, 0.25);
    if (dt <= 0) return;
    const moved = hyp(eye.x - lx, eye.z - lz);
    if (moved === moved) still = moved / dt > 0.25 ? 0 : still + dt;
    lx = eye.x; lz = eye.z;
    const near = hyp(eye.x - flask[0], eye.z - flask[2]) < REACH;
    const mode = dark > 0.3 ? 'west' : near && still < stillAfter ? 'visitor' : 'flask';
    state.mode = mode;
    for (const s of S) {
      const h = s.h;
      let heading, pitch, k;
      if (mode === 'west') { heading = WEST; pitch = 0.12; k = 0.55; }
      else if (mode === 'visitor') { heading = headingTo(h, eye.x, eye.z); pitch = Math.max(-0.45, Math.min(0.5, Math.atan2(eye.y - h.at[1] - 0.19, hyp(eye.x - h.at[0], eye.z - h.at[2])))); k = 1; }
      else { heading = headingTo(h, flask[0], flask[2]); pitch = Math.min(0.7, Math.atan2(flask[1] - h.at[1] - 0.19, hyp(flask[0] - h.at[0], flask[2] - h.at[2]))); k = 3.2; }
      // the head goes round the short way, as often as it likes; the stem under it leans with it and never winds up
      // (the body's share is 1.2 sin(turn): none when the head looks straight back)
      const base = angDiff(heading, h.yaw);
      s.aim += angDiff(base, s.aim) * ease(dt, 0.3 * s.tau * k);       // a little late: the turn itself follows an eased aim
      s.yaw += angDiff(s.aim, s.yaw) * ease(dt, 0.7 * s.tau * k);
      s.err = mode === 'visitor' ? Math.abs(angDiff(base, s.yaw)) : 0;
      s.pitch += (pitch - s.pitch) * ease(dt, s.tau * k);
      uTurn[h.slot].set(s.yaw, h.slot === 7 ? s.pitch * 0.3 : s.pitch, h.yaw, 1.2 * Math.sin(s.yaw));
    }
  };
  state.update(1e-3, { x: 1e6, y: 0, z: 1e6 }, 0);
  lx = NaN;
  return state;
}

// old stone and old iron: grain, stains and blotches on every painted surface of the house, from where it is
const weather = (sh) => {
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFlP;').replace('vMRE = aMRE;', 'vMRE = aMRE; vFlP = position;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
    varying vec3 vFlP;
    float flH3(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
    float flN(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(flH3(i), flH3(i + vec3(1, 0, 0)), f.x), mix(flH3(i + vec3(0, 1, 0)), flH3(i + vec3(1, 1, 0)), f.x), f.y), mix(mix(flH3(i + vec3(0, 0, 1)), flH3(i + vec3(1, 0, 1)), f.x), mix(flH3(i + vec3(0, 1, 1)), flH3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }`)
    .replace('#include <color_fragment>', `#include <color_fragment>
    { float big = flN(vFlP * 1.7), fine = flN(vFlP * 13.0), mid = flN(vFlP * 5.1 + 7.0);
      diffuseColor.rgb *= (0.5 + 0.75 * big) * (0.78 + 0.44 * fine);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.11, 0.05), smoothstep(0.55, 0.8, mid) * 0.55 * (1.0 - vMRE.x)); }`);
};

export async function build(ctx) {
  if (FLORILEGIUM_OFF) return;
  const { scene } = ctx, low = ctx.quality === 'low';
  const cx = GLASSHOUSE.x, cz = GLASSHOUSE.z, fy = FLORILEGIUM.floor;
  const tubs = tubsOf();

  // ---- the house: stone, iron, the floor, the door, the paving and the grate, the flask
  const frame = new THREE.Mesh(buildFrame({ low, tubs: tubs.map((t) => [t.x, t.z]) }), paintedMaterial({ side: THREE.DoubleSide }, weather));
  frame.name = 'florilegium-frame'; frame.position.set(cx, fy, cz); frame.castShadow = !low; frame.receiveShadow = true;
  scene.add(frame);
  // the dark under the grate: drawn from above only, so the room F3 builds below looks up through the bars
  const dark = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0x000000, fog: false }));
  { const g = GRATE, y = g.top - 0.08; dark.geometry.setAttribute('position', new THREE.Float32BufferAttribute([g.x - g.half, y, -g.half, g.x - g.half, y, g.half, g.x + g.half, y, g.half, g.x + g.half, y, -g.half], 3)); dark.geometry.setIndex([0, 1, 2, 0, 2, 3]); }
  dark.name = 'florilegium-grate-dark'; dark.position.copy(frame.position);
  scene.add(dark);

  // ---- the likenesses: one mesh, the heads turned in its vertex shader
  const P = new Painter(TURN_ATTRS), heads = [];
  for (const t of tubs) heads.push(...buildLikeness(t.id, { at: [cx + t.x, fy + 0.05, cz + t.z], yaw: t.yaw, into: P, low, rootDepth: 0 }).heads);
  const uTurn = Array.from({ length: N_SLOTS }, () => new THREE.Vector4());
  const people = new THREE.Mesh(P.geometry(), likenessMaterial(uTurn));
  people.name = 'florilegium-likenesses'; people.receiveShadow = false;
  scene.add(people);
  await ctx.progress?.('the florilegium', 0.5);

  // ---- the glass, the colour it throws, the flask's halo
  const flask = [cx, fy + FLASK_Y, cz];
  const glass = buildGlass({ low });
  const panes = new THREE.Mesh(glass.geometry, glass.material);
  panes.name = 'florilegium-glass'; panes.position.copy(frame.position); panes.renderOrder = 3;
  scene.add(panes);
  const ground = makeGround(ctx);
  const cast = buildCast({ groundAt: (x, z) => ground.at(cx + x, cz + z) - fy, low, r1: 27 });
  cast.mesh.position.copy(frame.position);
  scene.add(cast.mesh);
  // the glints: one Points draw. The flask's halo (never under 9 px, so it is found from the wood), and a scatter of
  // coloured points on the upper panes and the roof that hold their size and their light in the wood's fog, so that
  // from the wood way the house is coloured lights between the trunks; inside 30 m they fade and the panes are the panes
  const gp = [...flask], gc = [...NOON.light], gs = [1.1, 9, 0];
  for (let k = 0; k < N; k++) for (let j = 0; j < 5; j++) {
    const h = (k * 5 + j) * 0.618 % 1, a = (k + (h - 0.5) * 0.7) * (Math.PI * 2 / N), i = [0, 0, 1, 3, 5][j], t = (j * 0.37 + h) % 1;
    const r = j < 2 ? A + 0.05 : PROF[i][0] + (PROF[i + 1][0] - PROF[i][0]) * t, y = j < 2 ? 2.7 + 1.0 * t : PROF[i][1] + (PROF[i + 1][1] - PROF[i][1]) * t;
    const c = PANES[(j + k) % 3 === 0 ? SCHEME_B[k] : SCHEME_A[k]];
    gp.push(cx + Math.cos(a) * r * 0.97, fy + y, cz + Math.sin(a) * r * 0.97); gc.push(c[0], c[1], c[2]); gs.push(0.7 + 0.6 * h, 3.6, 1);
  }
  const hg = new THREE.BufferGeometry();
  hg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); hg.setAttribute('aCol', new THREE.Float32BufferAttribute(gc, 3)); hg.setAttribute('aS', new THREE.Float32BufferAttribute(gs, 3));
  const halo = new THREE.Points(hg, new THREE.ShaderMaterial({
    uniforms: { uBreath: glass.uniforms.uBreath, uScale: { value: 400 } },
    vertexShader: `uniform float uScale; attribute vec3 aCol, aS; varying vec3 vCol; varying float vHeart;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; float d = max(-mv.z, 0.1);
        gl_PointSize = clamp(aS.x * uScale / d, aS.y, 56.0);
        float far = smoothstep(16.0, 34.0, d) * (1.0 - smoothstep(110.0, 170.0, d));
        vCol = aCol * mix(1.0, far * 2.6, aS.z); vHeart = 1.0 - aS.z; }`,
    fragmentShader: `uniform float uBreath; varying vec3 vCol; varying float vHeart; void main() { vec2 c = (gl_PointCoord - 0.5) * 2.0; float r2 = dot(c, c); gl_FragColor = vec4(vCol * (exp(-r2 * 4.0) * 0.5 + exp(-r2 * 40.0) * 1.4 * vHeart + exp(-r2 * 9.0) * 0.5 * (1.0 - vHeart)) * (1.0 - smoothstep(0.7, 1.0, r2)) * uBreath, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  // the glow in the wood's air: five soft discs that face the eye, drawn at the house's depth so every trunk between
  // stands black against them; from 20 m in they are gone and the house is its own light
  const hz = { p: [], o: [], c: [], i: [] };
  [[NOON.light, 0, 7, 0, 13, 0.55], [PANES[0], 4.6, 4.5, 3.4, 12, 0.95], [PANES[3], -2.6, 5, 4.6, 12, 1.1], [PANES[4], -4.4, 6, -3.6, 12, 0.95], [PANES[1], 3.8, 7, -4.4, 12, 0.8], [PANES[2], 0, 10, 0, 9, 0.7],
    // the mist between the house and the wood way: its colours carried east along the spur, low, thinning
    [PANES[1], 14, 2.5, 3, 8, 0.3], [PANES[5], 22, 2.2, -4, 9, 0.24], [PANES[3], 30, 2, 2, 9, 0.2], [PANES[0], 38, 2, -2, 9, 0.15], [PANES[4], 12, 3, -9, 8, 0.25], [PANES[2], 13, 3, 10, 8, 0.22]].forEach(([c, x, y, z, r, k], q) => {
    for (const [ox, oy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { hz.p.push(cx + x, fy + y, cz + z); hz.o.push(ox, oy, r); hz.c.push(c[0] * k, c[1] * k, c[2] * k); }
    hz.i.push(q * 4, q * 4 + 1, q * 4 + 2, q * 4, q * 4 + 2, q * 4 + 3);
  });
  const hzg = new THREE.BufferGeometry();
  hzg.setAttribute('position', new THREE.Float32BufferAttribute(hz.p, 3)); hzg.setAttribute('aOff', new THREE.Float32BufferAttribute(hz.o, 3)); hzg.setAttribute('aCol', new THREE.Float32BufferAttribute(hz.c, 3)); hzg.setIndex(hz.i);
  const haze = new THREE.Mesh(hzg, new THREE.ShaderMaterial({
    uniforms: { uBreath: glass.uniforms.uBreath },
    vertexShader: `attribute vec3 aOff, aCol; varying vec3 vCol; varying vec2 vC;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); float d = max(-mv.z, 0.1); mv.xy += aOff.xy * aOff.z; gl_Position = projectionMatrix * mv;
        vC = aOff.xy; vCol = aCol * smoothstep(13.0, 34.0, d) * (1.0 - smoothstep(120.0, 190.0, d)); }`,
    fragmentShader: `uniform float uBreath; varying vec3 vCol; varying vec2 vC; void main() { float r2 = dot(vC, vC); gl_FragColor = vec4(vCol * exp(-r2 * 3.2) * (1.0 - smoothstep(0.75, 1.0, r2)) * uBreath, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  haze.name = 'florilegium-haze'; haze.frustumCulled = false; haze.renderOrder = 1;
  scene.add(haze);
  halo.name = 'florilegium-halo'; halo.frustumCulled = false; halo.renderOrder = 1;
  scene.add(halo);

  // ---- the light: the flask's own, and the panes' colours on the trunks round about, a quarter of the house each
  const lights = [];
  const lamp = (hex, i, d, x, y, z) => { const L = new THREE.PointLight(new THREE.Color(hex), i, d, 2); L.position.set(x, y, z); L.name = 'florilegium-light'; scene.add(L); lights.push({ L, i }); return L; };
  lamp(NOON.lightHex, low ? 9 : 10, 15, flask[0], flask[1] - 0.6, flask[2]);
  [['#ff3a4a', 0.6], ['#3aa0ff', 2.2], ['#b05aff', 3.75], ['#ffa030', 5.3]].forEach(([hex, a]) => lamp(hex, 14, 22, cx + Math.cos(a) * (RC + 1.2), fy + EAVE + 0.4, cz + Math.sin(a) * (RC + 1.2)));

  // ---- nobody gets in: a wall a side
  for (let k = 0; k < N; k++) {
    const a0 = (k - 0.5) * (Math.PI * 2 / N), a1 = (k + 0.5) * (Math.PI * 2 / N), r = RC + 0.05;
    ctx.addCollider({ x1: cx + Math.cos(a0) * r, z1: cz + Math.sin(a0) * r, x2: cx + Math.cos(a1) * r, z2: cz + Math.sin(a1) * r, r: 0.3, y: fy - 0.7, h: 4.75, stand: false });
  }
  ctx.addCollider({ x: cx + A + 0.15, z: cz, r: 0.5, y: fy - 0.7, h: 3.4, stand: false }); // the door's case and its step

  // ---- the heads, and the flask's breath (it breathes; it does not flicker)
  const turn = makeTurner(heads, flask, uTurn);
  const update = (dt, t) => {
    const b = 0.94 + 0.06 * Math.sin(t * 0.7);
    glass.uniforms.uBreath.value = b; cast.uniforms.uBreath.value = b; cast.uniforms.uT.value = t;
    frame.material.userData.uEmit.value = b;
    for (const l of lights) l.L.intensity = l.i * b;
    halo.material.uniforms.uScale.value = ctx.renderer.domElement.height * 0.74;
    turn.update(dt, ctx.player.pos, ctx.sky?.flicker?.dark ?? 0);
  };
  ctx.registerUpdate(update, { pos: { x: cx, z: cz }, near: 70, hz: 2 });

  // what the moths beat against (F4): each wall's pane, sill to eave, and the house's whole shape
  const walls = [];
  for (let k = 0; k < N; k++) { const a = k * (Math.PI * 2 / N); walls.push({ x: cx + Math.cos(a) * A, z: cz + Math.sin(a) * A, nx: Math.cos(a), nz: Math.sin(a), half: RC * Math.sin(Math.PI / N), y0: fy + SILL, y1: fy + EAVE, door: k === 0 }); }
  ctx.florilegium = {
    centre: { x: cx, z: cz }, floor: fy, flask, heads, turn, uTurn, panes: walls,
    grate: { x: cx + GRATE.x, z: cz + GRATE.z, half: GRATE.half, y: fy + GRATE.top, dark },
    tubs: tubs.map((t) => ({ id: t.id, x: cx + t.x, z: cz + t.z, yaw: t.yaw })),
    meshes: { frame, people, panes, cast: cast.mesh, halo, haze, dark }, lights: lights.map((l) => l.L), glass: glass.uniforms, castU: cast.uniforms,
  };
}

// The study page: each likeness alone on plain ground, turning to whoever looks (src/study/registry.js).
const NAMES = { fan: 'the lady with her fan', sword: 'the armiger', hoop: 'the child with a hoop', cup: 'the magnate', pair: 'the lovers', hawk: 'the falconer', graffer: 'the Graffer\'s sprout' };
export const study = tubsOf().map((t) => ({
  id: `likeness-${t.id}`, name: NAMES[t.id], kind: 'figure', h: t.id === 'graffer' ? 0.9 : t.id === 'hoop' ? 2.0 : 2.7, at: [GLASSHOUSE.x + t.x, GLASSHOUSE.z + t.z],
  build(ctx) {
    const x = GLASSHOUSE.x + t.x, z = GLASSHOUSE.z + t.z, P = new Painter(TURN_ATTRS);
    const R = buildLikeness(t.id, { at: [x, 0, z], yaw: t.yaw, into: P, low: ctx.quality === 'low', rootDepth: 0 });
    const uTurn = Array.from({ length: N_SLOTS }, () => new THREE.Vector4());
    const mesh = new THREE.Mesh(P.geometry(), likenessMaterial(uTurn));
    mesh.name = `likeness-${t.id}`;
    ctx.scene.add(mesh);
    const turn = makeTurner(R.heads, [GLASSHOUSE.x, FLASK_Y, GLASSHOUSE.z], uTurn, { stillAfter: Infinity });
    ctx.registerUpdate((dt) => turn.update(dt, ctx.player.pos, 0));
    return { at: (o) => o.set(x, 0, z), face: () => t.yaw, h: R.h };
  },
}));
