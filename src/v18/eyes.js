// v18-F4: eyes between the trees. Along the three spurs and in the old wood off the road: pairs of small pale eyes low
// between the trunks, 15 to 40 m off, that open where the visitor is not quite looking and shut (or sink) when the view
// comes onto them, then open again somewhere else. Never a body. Kinds of spacing and height: something small, something
// long and low, something up a trunk, and one with three.
//
// One Points draw, no light: each eye a point with a world size and a floor of 5 px, its lid (and its sinking) read from
// a uniform per watcher. A few watchers at a time (3 on low, 4 above), each a state: 'away' (waiting to open somewhere),
// 'open' (blinking now and then), 'shut' (closing or sinking, then away). Placed only out of the view's middle; shut when
// the look comes within SHUT of them or the visitor within 11 m; never within 4 m of a track's middle.
import * as THREE from 'three';
import { SPURS } from './plan.js';
import { hyp } from '../noise.js';

// kind: eye gap (m), height over the ground (m), eye size (m), count, colour (linear, pre-tonemap)
export const EYE_KINDS = [
  { id: 'small', gap: 0.09, y: 0.25, s: 0.06, n: 2, col: [1.5, 1.55, 1.05] },
  { id: 'fox', gap: 0.14, y: 0.45, s: 0.07, n: 2, col: [1.7, 1.4, 0.7] },
  { id: 'low', gap: 0.24, y: 0.15, s: 0.065, n: 2, col: [1.1, 1.6, 1.4], slant: 0.05 },
  { id: 'high', gap: 0.12, y: 2.4, s: 0.065, n: 2, col: [1.6, 1.5, 1.25] },
  { id: 'three', gap: 0.13, y: 0.6, s: 0.065, n: 3, col: [1.4, 1.6, 1.25] },
];
const MAXW = 3, SHUT = 0.24; // watchers; radians off the look at which they shut (less on a narrow view)

export function buildEyes(ctx, { leadAt = null, woodTrees = [], tracks = [] } = {}) {
  const { scene, terrain, camera, landmarks } = ctx;
  const rng = ctx.makeRng(18048);
  const low = ctx.quality === 'low', W = low ? 2 : MAXW;
  const wood = landmarks.wood;
  const offTrack = (x, z) => !leadAt || !leadAt(x, z);
  const dry = (x, z) => { const wl = terrain.waterLevelAt(x, z); return wl === null || terrain.heightAt(x, z) > wl + 0.3; };

  // the sites: beside the tracks (the wood way and the spurs, `tracks` as polylines; the spurs' straight lines when none
  // are given), 3.5 to 9 m off their line, so they are met 8 to 20 m from a visitor on the track
  const sites = [];
  const lines = tracks.length ? tracks : Object.values(SPURS).map((sp) => [[sp.from.x, sp.from.z], [sp.to.x, sp.to.z]]);
  for (const pts of lines) for (let k = 0; k < pts.length - 1; k++) {
    const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = hyp(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
    for (let s = 0; s < L; s += 3) for (const side of [-1, 1]) {
      const off = 3.5 + rng() * 5.5;
      sites.push([ax + ux * s - uz * off * side, az + uz * s + ux * off * side, 'track']);
    }
  }
  // near a trunk is better (something peering round it); keep only the dry, off-track ones
  const good = sites.filter(([x, z]) => offTrack(x, z) && dry(x, z));
  const nearTrunk = (x, z) => { for (const t of woodTrees) if (hyp(t.x - x, t.z - z) < 3) return t; return null; };
  const SITES = good.map(([x, z, k]) => {
    const t = nearTrunk(x, z);
    return t ? { x: t.x + (x - t.x) * 0.5, z: t.z + (z - t.z) * 0.5, k, trunk: true } : { x, z, k, trunk: false };
  });

  // the points: every watcher has room for three eyes; an eye a watcher's kind does not use sits at size 0
  const N = W * 3;
  const pos = new Float32Array(N * 3), off = new Float32Array(N * 3), aW = new Float32Array(N), aS = new Float32Array(N), aC = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) aW[i] = Math.floor(i / 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aW', new THREE.BufferAttribute(aW, 1));
  geo.setAttribute('aOff', new THREE.BufferAttribute(off, 3));
  geo.setAttribute('aS', new THREE.BufferAttribute(aS, 1));
  geo.setAttribute('aC', new THREE.BufferAttribute(aC, 3));
  const uOpen = { value: new Array(MAXW).fill(0) }, uSink = { value: new Array(MAXW).fill(0) }, uScale = { value: 400 };
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]),
    vertexShader: /* glsl */`
      uniform float uOpen[${MAXW}]; uniform float uSink[${MAXW}]; uniform float uScale;
      attribute float aW; attribute float aS; attribute vec3 aC; attribute vec3 aOff;
      varying float vOpen; varying vec3 vC;
      #include <fog_pars_vertex>
      void main() {
        int w = int(aW + 0.5);
        float open = uOpen[w];
        // the eyes apart by their gap, or by 4.5 px from their middle when that is more: a pair still reads as two at 40 m
        float dc = max(-(modelViewMatrix * vec4(position, 1.0)).z, 0.1), lo = length(aOff);
        float k = lo > 0.0 ? max(1.0, 6.0 * dc / uScale / lo) : 1.0;
        vec3 transformed = position + aOff * k - vec3(0.0, uSink[w] * 0.35, 0.0);
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float depth = -mvPosition.z;
        vOpen = open; vC = aC;
        gl_PointSize = aS <= 0.0 || open <= 0.01 ? 0.0 : clamp(aS * 4.0 * uScale / max(depth, 0.1), 7.0, 18.0);
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      varying float vOpen; varying vec3 vC;
      #include <fog_pars_fragment>
      void main() {
        vec2 c = (gl_PointCoord - 0.5) * 2.0;
        float h = max(vOpen * 0.7, 0.02);
        float e = length(vec2(c.x, c.y / h));                // an almond, as tall as the lid lets it
        float a = 1.0 - smoothstep(0.72, 1.0, e);
        if (a <= 0.01) discard;
        vec3 col = vC * (0.6 + 0.4 * (1.0 - e));           // brighter at the middle: eyeshine
        gl_FragColor = vec4(col, a);
        #include <fog_fragment>
      }`,
    fog: true, transparent: true, depthWrite: false,
  });
  mat.uniforms.uOpen = uOpen; mat.uniforms.uSink = uSink; mat.uniforms.uScale = uScale;
  const pts = new THREE.Points(geo, mat);
  pts.name = 'v18-eyes'; pts.frustumCulled = false; pts.renderOrder = 21; pts.visible = false;
  scene.add(pts);

  const ndc = new THREE.Vector3(), fwd = new THREE.Vector3(), cam = camera.position, size = new THREE.Vector2();
  const watchers = [];
  for (let w = 0; w < W; w++) watchers.push({ w, mode: 'away', t: 2 + w * 3 + rng() * 4, kind: null, x: 0, z: 0, y: 0, open: 0, sink: 0, how: 'shut', blink: 3, site: null, opens: 0, shuts: 0 });
  let threeUsed = 0;
  const offLook = (x, y, z) => { const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z, l = Math.hypot(dx, dy, dz) || 1; return Math.acos(Math.max(-1, Math.min(1, (fwd.x * dx + fwd.y * dy + fwd.z * dz) / l))); };

  function open(W0) {
    // a site 8 to 20 m off, in the frame but toward its edge (it opens where the visitor is not quite looking: seen
    // from the corner of the eye), apart from the other watchers
    for (let k = 0; k < 40; k++) {
      const s = SITES[Math.floor(rng() * SITES.length)];
      const d = hyp(s.x - cam.x, s.z - cam.z);
      if (d < 8 || d > 20) continue;
      if (watchers.some((o) => o !== W0 && o.mode !== 'away' && hyp(o.x - s.x, o.z - s.z) < 10)) continue;
      // the kind: three only now and then, high only beside a trunk
      let kind = EYE_KINDS[Math.floor(rng() * 3)];
      if (s.trunk && rng() < 0.3) kind = EYE_KINDS[3];
      if (rng() < 0.08 && threeUsed < 1) { kind = EYE_KINDS[4]; threeUsed++; }
      const y = terrain.heightAt(s.x, s.z) + kind.y;
      ndc.set(s.x, y, s.z).project(camera);
      if (ndc.z > 1 || Math.abs(ndc.x) < 0.55 || Math.abs(ndc.x) > 0.9 || Math.abs(ndc.y) > 0.8) continue;
      W0.kind = kind; W0.x = s.x; W0.z = s.z; W0.y = y; W0.site = s; W0.mode = 'open'; W0.open = 0; W0.sink = 0; W0.blink = 2 + rng() * 5; W0.opens++;
      W0.how = rng() < 0.5 ? 'shut' : 'sink';
      // the eyes across the look from the visitor, the line between them square to it
      const a = Math.atan2(s.x - cam.x, s.z - cam.z), px = Math.cos(a), pz = -Math.sin(a);
      for (let e = 0; e < 3; e++) {
        const i = W0.w * 3 + e;
        if (e >= kind.n) { aS[i] = 0; continue; }
        const o = kind.n === 3 ? (e - 1) * kind.gap : (e - 0.5) * kind.gap;
        const dy = kind.n === 3 && e === 1 ? kind.gap * 0.55 : (kind.slant || 0) * (e - 0.5) * 2;
        pos[i * 3] = s.x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = s.z; off[i * 3] = px * o; off[i * 3 + 1] = dy; off[i * 3 + 2] = pz * o;
        aS[i] = kind.s; aC.set(kind.col, i * 3);
      }
      geo.attributes.position.needsUpdate = geo.attributes.aOff.needsUpdate = geo.attributes.aS.needsUpdate = geo.attributes.aC.needsUpdate = true;
      return true;
    }
    return false;
  }

  const state = { watchers, sites: SITES, shut: 0, opened: 0 };
  function update(dt) {
    camera.getWorldDirection(fwd);
    const inWood = hyp(cam.x - wood.x, cam.z - wood.z) < wood.r + 25;
    let any = false;
    for (const Wt of watchers) {
      if (Wt.mode === 'away') {
        Wt.t -= dt;
        if (Wt.t <= 0 && inWood) { if (!open(Wt)) Wt.t = 1; else state.opened++; }
      } else if (Wt.mode === 'open') {
        Wt.open = Math.min(1, Wt.open + dt / 0.6);
        Wt.blink -= dt;
        let lid = Wt.open;
        if (Wt.blink < 0) { lid *= Math.min(1, Math.abs(Wt.blink + 0.09) / 0.09); if (Wt.blink < -0.18) Wt.blink = 2.5 + rng() * 5; }
        const d = hyp(Wt.x - cam.x, Wt.z - cam.z);
        ndc.set(Wt.x, Wt.y, Wt.z).project(camera);
        const centred = ndc.z < 1 && Math.abs(ndc.x) < 0.3 && Math.abs(ndc.y) < 0.6;
        if (centred || offLook(Wt.x, Wt.y, Wt.z) < SHUT || d < 6) { Wt.mode = 'blinking'; Wt.tb = 0; Wt.shuts++; state.shut++; }
        else if (d > 26 || !inWood) { Wt.mode = 'shut'; }
        Wt.lid = lid;
      } else if (Wt.mode === 'blinking') {
        // one slow blink, then shut (or sink)
        Wt.tb += dt;
        Wt.lid = 1 - 0.85 * Math.sin(Math.PI * Math.min(1, Wt.tb / 0.55));
        if (Wt.tb >= 0.55) { Wt.mode = 'shut'; Wt.lid = 1; }
      } else {
        if (Wt.how === 'sink') Wt.sink = Math.min(1, Wt.sink + dt / 0.6); else Wt.lid = Math.max(0, (Wt.lid ?? 1) - dt / 0.45);
        if ((Wt.how === 'sink' ? Wt.sink >= 1 : Wt.lid <= 0)) { Wt.mode = 'away'; Wt.t = 3 + rng() * 9; Wt.lid = 0; Wt.sink = 0; }
      }
      const lid = Wt.mode === 'away' ? 0 : Wt.how === 'sink' && Wt.mode === 'shut' ? 1 - Wt.sink * 0.6 : (Wt.lid ?? 0);
      uOpen.value[Wt.w] = lid; uSink.value[Wt.w] = Wt.sink;
      if (lid > 0.01) any = true;
    }
    pts.visible = any;
    if (any) { ctx.renderer.getSize(size); uScale.value = size.y * ctx.renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5)); }
  }
  ctx.registerUpdate(update, { at: () => wood, near: wood.r + 60, hz: 0 });
  state.mesh = pts;
  // test hook: open watcher w at (x, z) with kind k, now
  state.force = (w, x, z, k = 1) => {
    const Wt = watchers[w], kind = EYE_KINDS[k], y = terrain.heightAt(x, z) + kind.y;
    Wt.kind = kind; Wt.x = x; Wt.z = z; Wt.y = y; Wt.mode = 'open'; Wt.open = 1; Wt.sink = 0; Wt.blink = 99; Wt.how = 'shut';
    const a = Math.atan2(x - cam.x, z - cam.z), px = Math.cos(a), pz = -Math.sin(a);
    for (let e = 0; e < 3; e++) { const i = w * 3 + e; if (e >= kind.n) { aS[i] = 0; continue; } const o = (e - (kind.n - 1) / 2) * kind.gap; pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; off[i * 3] = px * o; off[i * 3 + 1] = 0; off[i * 3 + 2] = pz * o; aS[i] = kind.s; aC.set(kind.col, i * 3); }
    geo.attributes.position.needsUpdate = geo.attributes.aOff.needsUpdate = geo.attributes.aS.needsUpdate = geo.attributes.aC.needsUpdate = true;
  };
  return state;
}

// The study page: a pair of each kind in a row, held open (a stand-in ctx has no wood: the row is placed by hand).
export const study = [{
  id: 'wood-eyes', name: 'eyes in the wood', kind: 'creature', h: 1.2, at: [-210, 130],
  build(ctx) {
    const L = { ...ctx.landmarks, wood: { x: 0, z: 0, r: 60 } };
    const S = buildEyes(Object.assign(Object.create(ctx), { landmarks: L }), {});
    [0, 1, 2, 4].forEach((k, i) => S.force(i, (i - 1.5) * 0.6, 0, k));
    ctx.registerUpdate(() => { for (const w of S.watchers) { w.mode = 'open'; w.blink = 99; w.lid = 1; } });
    return { at: (o) => o.set(0, 0, 0), h: 1.2 };
  },
}];
