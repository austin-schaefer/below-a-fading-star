// The lift's carriage (v12-H4): a cage of iron and old glass, once rich. Built in its own frame: x along the face
// (north +), y up, z out from the rails toward the bowl (east +); the origin is the middle of its floor. The rails'
// plane lies behind it (z < 0), leaning back with the face; the chassis reaches back to the two rails on four
// rollers, and a yoke over them takes the hauling cable. Two doors: east (the foot station's side) and west (the
// gallery's), each a grille sliding along the wall. A lamp under the dome, a bench in worn red velvet, a brass lever
// by the west door, a ring of keys swinging from a rib, a little bell on the dome that answers the call.
//
// buildCage(ctx, { stone, low, railZ, dirL, gap }) → { group, doors: { e, w }, lever, keys, bell, lamp, glassMat, draws,
// tris, dims, yokeLocal } where railZ is the rails' plane's z at the floor (negative), dirL the rails' direction in this frame.
import * as THREE from 'three';
import { Builder } from '../../structures/geo.js';

export const CAGE = { W: 3.4, D: 3.0, H: 2.55, DOME: 1.25, DOOR: 1.1, T: 0.07 };
const C = {
  iron: new THREE.Color('#2e241c'), dark: new THREE.Color('#1a1410'), brass: new THREE.Color('#8a6634'),
  velvet: new THREE.Color('#5a1822'), wood: new THREE.Color('#4a3424'), key: new THREE.Color('#6e5a3a'),
};

export function buildCage(ctx, o) {
  const { low, railZ, dirL, gap } = o;
  const stone = o.iron; // the cage is all iron, brass, wood and velvet: plain vertex colours, as the Galleries' own iron
  const { W, D, H, DOME, DOOR, T } = CAGE;
  const w2 = W / 2, d2 = D / 2;
  const group = new THREE.Group(); group.name = 'lift-cage';
  const B = new Builder(ctx.noise);
  const iron = (col = C.iron, more = {}) => ({ color: col, iron: col === C.brass ? 0.25 : 0.45, moss: 0, ground: -3, ...more });
  const box = (w, h, d, x, y, z, col = C.iron, rx = 0, ry = 0, rz = 0) => B.add(B.box(w, h, d, { seg: 9 }), new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)), iron(col));
  const bar = (a, b, t = T, col = C.iron) => {
    const d = b.clone().sub(a), l = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    B.add(new THREE.BoxGeometry(t, l, t), new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)), iron(col));
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // the floor's frame (the floor itself is a grating, below), its rim, cross bars under it
  for (const z of [-d2, d2]) box(W + 0.1, 0.14, 0.12, 0, -0.07, z);
  for (const x of [-w2, w2]) box(0.12, 0.14, D, x, -0.07, 0);
  for (let i = 1; i < 4; i++) box(W, 0.06, 0.05, 0, -0.1, -d2 + (D * i) / 4, C.dark);
  // corner posts with a turned capital, ring beams at the eaves and at the rail's height, a brass handrail inside
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(0.13, H, 0.13, sx * w2, H / 2, sz * d2);
    B.add(B.cyl(0.11, 0.08, 0.16, 8, 1), new THREE.Matrix4().setPosition(sx * w2, H - 0.02, sz * d2), iron(C.brass));
  }
  for (const y of [H, 0.95]) { for (const z of [-d2, d2]) box(W, y === H ? 0.12 : 0.06, 0.08, 0, y, z); for (const x of [-w2, w2]) box(0.08, y === H ? 0.12 : 0.06, D, x, y, 0); }
  for (const z of [-d2 + 0.12, d2 - 0.12]) for (const s of [-1, 1]) box(w2 - DOOR / 2 - 0.15, 0.04, 0.04, s * (DOOR / 2 + (w2 - DOOR / 2 - 0.15) / 2 + 0.05), 1.0, z, C.brass);
  for (const x of [-w2 + 0.12, w2 - 0.12]) box(0.04, 0.04, D - 0.4, x, 1.0, 0, C.brass);
  // mullions: the side walls in four lights, the end walls either side of their doors; a fret of scrolls in the dado
  const mull = [];
  for (const x of [-w2, w2]) for (let i = 1; i < 4; i++) mull.push([x, -d2 + (D * i) / 4, 'x']);
  for (const z of [-d2, d2]) for (const s of [-1, 1]) { mull.push([s * DOOR / 2, z, 'z']); mull.push([s * (DOOR / 2 + (w2 - DOOR / 2) / 2), z, 'z']); }
  for (const [x, z] of mull) box(0.06, H, 0.06, x, H / 2, z);
  if (!low) for (const [x, z, a] of mull) for (const y of [0.3, 0.62]) { // a pair of iron scrolls between each pair of lights
    const ux = a === 'x' ? 0 : 1, uz = a === 'x' ? 1 : 0;
    B.add(new THREE.TorusGeometry(0.12, 0.016, 4, 10, Math.PI * 1.5), new THREE.Matrix4().compose(V(x + ux * 0.2, y, z + uz * 0.2), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a === 'x' ? Math.PI / 2 : 0, y)), V(1, 1, 1)), iron(C.dark));
  }
  // the door heads: a transom over each door with a little crest (the sun in its notch, cast: whoever built this)
  for (const z of [-d2, d2]) {
    box(DOOR + 0.12, 0.08, 0.08, 0, 2.1, z);
    const notch = new THREE.Shape(); notch.moveTo(-0.28, 0); notch.lineTo(0, -0.0); notch.lineTo(0.28, 0); notch.lineTo(0.28, 0.32); notch.lineTo(0.02, 0.06); notch.lineTo(-0.02, 0.06); notch.lineTo(-0.28, 0.32); notch.closePath();
    const ng = new THREE.ExtrudeGeometry(notch, { depth: 0.03, bevelEnabled: false });
    B.add(ng, new THREE.Matrix4().compose(V(0, H + 0.06, z + (z > 0 ? 0.02 : -0.05)), new THREE.Quaternion(), V(1, 1, 1)), iron(C.brass));
    B.add(new THREE.SphereGeometry(0.1, 10, 6), new THREE.Matrix4().compose(V(0, H + 0.24, z), new THREE.Quaternion(), V(1, 1, 0.3)), iron(C.brass));
  }
  // the dome: eight ribs to a boss and a finial, the lamp hung under it
  const ribs = 8, R0 = Math.hypot(w2, d2);
  for (let i = 0; i < ribs; i++) {
    const a = (i / ribs) * Math.PI * 2 + Math.PI / 8;
    const ex = Math.cos(a), ez = Math.sin(a), k = 1 / Math.max(Math.abs(ex) / w2, Math.abs(ez) / d2);
    let prev = V(ex * k, H, ez * k);
    for (let j = 1; j <= 4; j++) {
      const f = j / 4, r = k * Math.cos(f * Math.PI / 2) ** 0.9, yy = H + DOME * Math.sin(f * Math.PI / 2);
      const p = V(ex * r, yy, ez * r);
      bar(prev, p, 0.07); prev = p;
    }
  }
  B.add(B.cyl(0.14, 0.18, 0.18, 10, 1), new THREE.Matrix4().setPosition(0, H + DOME + 0.05, 0), iron(C.brass));
  B.add(B.cyl(0.02, 0.07, 0.5, 8, 1), new THREE.Matrix4().setPosition(0, H + DOME + 0.38, 0), iron(C.brass));
  B.add(new THREE.SphereGeometry(0.07, 8, 6), new THREE.Matrix4().setPosition(0, H + DOME + 0.66, 0), iron(C.brass));
  bar(V(0, H + DOME - 0.02, 0), V(0, H + DOME - 0.55, 0), 0.025, C.dark); // the lamp's chain
  // the bench along the south wall, its velvet worn through to the boards at one end
  box(1.7, 0.08, 0.42, -w2 + 0.3, 0.46, 0.15, C.wood, 0, Math.PI / 2, 0);
  B.add(B.box(0.4, 0.1, 1.5, { chip: 0.03 }), new THREE.Matrix4().setPosition(-w2 + 0.3, 0.53, 0.15), { color: C.velvet, moss: 0, ground: -3 });
  for (const z of [-0.7, 0.7]) box(0.06, 0.46, 0.36, -w2 + 0.3, 0.23, z, C.dark);
  // the chassis: a stringer along each rail's face carried on two rollers, arms from the cage to them, the yoke over
  // them that takes the cable. The rail line in this frame: (sx * gap, 0, railZ) + t * dirL
  const railP = (sx, t, out = 0.42) => V(sx * gap, 0, railZ + out).addScaledVector(dirL, t);
  const T0 = -0.4, T1 = 2.75;
  for (const sx of [-1, 1]) {
    bar(railP(sx, T0 - 0.3), railP(sx, T1 + 0.3), 0.16, C.dark);
    for (const tt of [T0, T1]) {
      const p = railP(sx, tt, 0.28);
      B.add(B.cyl(0.2, 0.2, 0.12, 12, 1), new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), V(1, 1, 1)), iron(C.dark));
    }
    // arms: from the cage's back corners, low and high, to the stringer
    bar(V(sx * w2, -0.07, -d2), railP(sx, T0 + 0.05), 0.12);
    bar(V(sx * w2, H, -d2), railP(sx, T1 - 0.6), 0.12);
    bar(V(sx * w2, -0.07, -d2), railP(sx, T1 - 0.6), 0.07, C.dark);
  }
  const yokeL = railP(0, T1, 0.42);
  bar(railP(-1, T1, 0.42), railP(1, T1, 0.42), 0.18, C.dark);
  B.add(new THREE.TorusGeometry(0.12, 0.03, 6, 12), new THREE.Matrix4().setPosition(yokeL.clone().addScaledVector(dirL, 0.12)), iron(C.brass));
  // the little answering bell on the dome's west shoulder
  const bellL = V(0, H + 0.55, -d2 + 0.35);
  B.add(B.cyl(0.03, 0.12, 0.16, 10, 1, true), new THREE.Matrix4().setPosition(bellL), iron(C.brass));
  const ironMesh = new THREE.Mesh(B.build(), stone);
  ironMesh.name = 'lift-cage-iron'; ironMesh.castShadow = true; ironMesh.receiveShadow = true;
  group.add(ironMesh);

  // the glass: old, faintly green and amber, a light gone here and there and one starred with a crack (drawn paler)
  const gpos = [], gcol = [], gidx = [];
  const rng = ctx.makeRng(1206);
  const pane = (a, b, c, d, col) => { const n = gpos.length / 3; for (const p of [a, b, c, d]) { gpos.push(p.x, p.y, p.z); gcol.push(col.r, col.g, col.b); } gidx.push(n, n + 1, n + 2, n, n + 2, n + 3); };
  const tintA = new THREE.Color('#5d6b48'), tintB = new THREE.Color('#7a6038'), crack = new THREE.Color('#b8b0a0');
  const lights = [];
  for (const x of [-w2, w2]) for (let i = 0; i < 4; i++) lights.push(['x', x, -d2 + (D * i) / 4, -d2 + (D * (i + 1)) / 4]);
  for (const z of [-d2, d2]) { lights.push(['z', z, -w2, -DOOR / 2 - (w2 - DOOR / 2) / 2]); lights.push(['z', z, -DOOR / 2 - (w2 - DOOR / 2) / 2, -DOOR / 2]); lights.push(['z', z, DOOR / 2, DOOR / 2 + (w2 - DOOR / 2) / 2]); lights.push(['z', z, DOOR / 2 + (w2 - DOOR / 2) / 2, w2]); }
  let gone = 0;
  for (const [ax, c, a0, a1] of lights) for (const [y0, y1] of [[0.05, 0.93], [0.98, 2.08], [2.1, H - 0.06]]) {
    const r = rng();
    if (r < 0.12 && gone < 5) { gone++; continue; }
    const col = r > 0.94 ? crack : r > 0.55 ? tintB : tintA;
    const P = (u, y) => (ax === 'x' ? V(c, y, u) : V(u, y, c));
    pane(P(a0 + 0.03, y0), P(a1 - 0.03, y0), P(a1 - 0.03, y1), P(a0 + 0.03, y1), col);
  }
  // the dome's glass, in gores between the ribs
  for (let i = 0; i < ribs; i++) {
    const a = (i / ribs) * Math.PI * 2 + Math.PI / 8, a2 = ((i + 1) / ribs) * Math.PI * 2 + Math.PI / 8;
    const pt = (aa, f) => { const ex = Math.cos(aa), ez = Math.sin(aa), k = 1 / Math.max(Math.abs(ex) / w2, Math.abs(ez) / d2), r = k * Math.cos(f * Math.PI / 2) ** 0.9; return V(ex * r, H + DOME * Math.sin(f * Math.PI / 2), ez * r); };
    for (let j = 0; j < 4; j++) { if (rng() < 0.08) continue; pane(pt(a, j / 4), pt(a2, j / 4), pt(a2, (j + 1) / 4), pt(a, (j + 1) / 4), rng() < 0.5 ? tintA : tintB); }
  }
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.Float32BufferAttribute(gpos, 3)); gg.setAttribute('color', new THREE.Float32BufferAttribute(gcol, 3)); gg.setIndex(gidx); gg.computeVertexNormals();
  const glassMat = new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.2, roughness: 0.12, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false });
  const glass = new THREE.Mesh(gg, glassMat);
  glass.name = 'lift-cage-glass'; glass.renderOrder = 5;
  group.add(glass);

  // the floor: a grating of iron bars, the drop seen through it
  const fcv = document.createElement('canvas'); fcv.width = fcv.height = 64;
  { const g = fcv.getContext('2d'); g.fillStyle = '#2b2119'; for (let i = 0; i < 64; i += 8) { g.fillRect(i, 0, 2, 64); g.fillRect(0, i, 64, 2); } }
  const ftex = new THREE.CanvasTexture(fcv); ftex.wrapS = ftex.wrapT = THREE.RepeatWrapping; ftex.repeat.set(W * 1.6, D * 1.6); ftex.colorSpace = THREE.SRGBColorSpace;
  const fg = new THREE.PlaneGeometry(W, D); fg.rotateX(-Math.PI / 2); fg.translate(0, -0.01, 0);
  const floorM = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ map: ftex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.6, color: '#9a8a78' }));
  floorM.name = 'lift-cage-floor'; floorM.castShadow = true;
  group.add(floorM);

  // the doors: a grille each, sliding along its wall to the north to open
  const doorGeo = (() => {
    const Bd = new Builder(ctx.noise);
    for (let i = 0; i <= 5; i++) Bd.add(new THREE.BoxGeometry(0.022, 2.0, 0.022), new THREE.Matrix4().setPosition(-DOOR / 2 + (DOOR * i) / 5, 1.02, 0), iron(C.dark));
    for (const y of [0.06, 1.0, 1.98]) Bd.add(new THREE.BoxGeometry(DOOR, 0.05, 0.04), new THREE.Matrix4().setPosition(0, y, 0), iron(C.iron));
    Bd.add(new THREE.BoxGeometry(0.05, 0.22, 0.08), new THREE.Matrix4().setPosition(-DOOR / 2 + 0.08, 1.05, 0.03), iron(C.brass));
    return Bd.build();
  })();
  const doors = {};
  for (const [k, z] of [['e', d2 + 0.06], ['w', -d2 - 0.06]]) {
    const m = new THREE.Mesh(doorGeo, stone); m.name = `lift-cage-door-${k}`; m.castShadow = true;
    m.position.set(0, 0, z); m.userData.z = z;
    group.add(m); doors[k] = m;
  }
  // the sill at the west door: an iron plate hinged at the floor's edge, folded up against the door while the cage
  // moves and let down onto the gangway when the door opens at the gallery
  const sill = new THREE.Group(); sill.name = 'lift-cage-sill';
  {
    const Bs = new Builder(ctx.noise);
    Bs.add(new THREE.BoxGeometry(DOOR - 0.06, 0.05, 0.98), new THREE.Matrix4().setPosition(0, -0.025, -0.49), iron(C.iron));
    for (const x of [-0.4, 0, 0.4]) Bs.add(new THREE.BoxGeometry(0.04, 0.02, 0.9), new THREE.Matrix4().setPosition(x, 0.005, -0.5), iron(C.dark));
    const m = new THREE.Mesh(Bs.build(), stone); m.castShadow = true; sill.add(m);
  }
  sill.position.set(0, 0, -d2 - 0.04); sill.rotation.x = Math.PI / 2;
  group.add(sill);
  // the lever: a brass lever on a cast pedestal north of the west door; it is thrown back (toward the west) to go
  const lever = new THREE.Group(); lever.name = 'lift-cage-lever';
  {
    const Bl = new Builder(ctx.noise);
    Bl.add(Bl.cyl(0.07, 0.11, 0.8, 8, 1), new THREE.Matrix4().setPosition(0, 0.4, 0), iron(C.iron));
    Bl.add(Bl.box(0.22, 0.08, 0.3), new THREE.Matrix4().setPosition(0, 0.82, 0), iron(C.dark));
    const ped = new THREE.Mesh(Bl.build(), stone); ped.castShadow = true;
    lever.add(ped);
    const Bh = new Builder(ctx.noise);
    Bh.add(Bh.cyl(0.018, 0.022, 0.55, 6, 1), new THREE.Matrix4().setPosition(0, 0.275, 0), iron(C.brass));
    Bh.add(new THREE.SphereGeometry(0.045, 8, 6), new THREE.Matrix4().setPosition(0, 0.57, 0), { color: C.wood, moss: 0, ground: -3 });
    const handle = new THREE.Mesh(Bh.build(), stone); handle.position.set(0, 0.86, 0); handle.rotation.x = 0.45; // rest: leaning east
    lever.add(handle); lever.userData.handle = handle;
  }
  lever.position.set(DOOR / 2 + 0.35, 0, -d2 + 0.32);
  group.add(lever);
  // the keys: a ring of them on a hook from the dome's north-east rib, swinging as the cage moves
  const keys = new THREE.Group(); keys.name = 'lift-cage-keys';
  {
    const Bk = new Builder(ctx.noise);
    Bk.add(new THREE.TorusGeometry(0.07, 0.008, 4, 14), new THREE.Matrix4().setPosition(0, -0.3, 0), iron(C.key));
    Bk.add(new THREE.BoxGeometry(0.008, 0.3, 0.008), new THREE.Matrix4().setPosition(0, -0.15, 0), iron(C.dark));
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, len = 0.11 + (i % 3) * 0.035;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, a));
      const p = V(Math.cos(a - Math.PI / 2) * 0.07, -0.3 + Math.sin(a - Math.PI / 2) * 0.07, 0);
      const dn = V(Math.cos(a - Math.PI / 2), Math.sin(a - Math.PI / 2), 0);
      Bk.add(new THREE.BoxGeometry(0.012, len, 0.006), new THREE.Matrix4().compose(p.clone().addScaledVector(dn, len / 2), q, V(1, 1, 1)), iron(C.key));
      Bk.add(new THREE.BoxGeometry(0.03, 0.02, 0.006), new THREE.Matrix4().compose(p.clone().addScaledVector(dn, len - 0.01).add(V(0.012, 0, 0)), q, V(1, 1, 1)), iron(C.key));
    }
    const km = new THREE.Mesh(Bk.build(), stone); km.castShadow = false;
    keys.add(km);
  }
  keys.position.set(0.85, H + 0.6, 0.6);
  group.add(keys);
  // the lamp: a little cage of amber glass under the dome, lit
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.26, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.2, 0.5) }));
  lamp.position.set(0, H + DOME - 0.7, 0); lamp.name = 'lift-cage-lamp';
  group.add(lamp);
  const light = new THREE.PointLight(new THREE.Color('#ffae5a'), 3.2, 8, 2);
  light.position.copy(lamp.position); light.name = 'lift-cage-light';
  group.add(light);

  // its glow as seen from far off: a soft point about the lamp, gone when near (so the cage is found on the cliff from
  // the floor, as the Galleries' own lamps are)
  const haloU = { uScale: { value: 600 } };
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute([0, H + DOME - 0.7, 0], 3));
  const halo = new THREE.Points(hg, new THREE.ShaderMaterial({
    uniforms: haloU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`uniform float uScale; varying float vA;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); float d = -mv.z; gl_PointSize = max(3.0, 6.0 * uScale / d); vA = smoothstep(18.0, 40.0, d) * exp(-d * 0.0012); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`varying float vA; void main() { vec2 q = gl_PointCoord * 2.0 - 1.0; float r2 = dot(q, q); if (r2 > 1.0) discard; gl_FragColor = vec4(vec3(1.0, 0.66, 0.32) * exp(-r2 * 4.5) * vA * 0.8, 1.0); }`,
  }));
  halo.name = 'lift-cage-halo'; halo.frustumCulled = false;
  group.add(halo);

  const tris = [ironMesh, glass, floorM, doors.e, doors.e, lever.children[0], lever.children[1], keys.children[0], lamp].reduce((a, m) => a + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0);
  return { group, doors, sill, lever, keys, lamp, light, bellL, glassMat, yokeL, haloU, draws: 10, tris, dims: { W, D, H, DOOR } };
}
