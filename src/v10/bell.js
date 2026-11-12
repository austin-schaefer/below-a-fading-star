// The Bell under the Span (v10-A3): the great bell, and what it calls.
//
// The place. The Heliarchy hung a nine-metre bronze bell from the crown of the Great Span's bay between piers -70 and
// -22, and over the ages its weight split the crown: the crack a running hop clears on the deck (x -45) is the bell's
// doing. It still hangs there, eight metres off the ground in the vault's shadow, on four chains that go up into the
// crack and over a great timber wedged across it, its mouth over the pedlars' track (P15). Seen from the tarn or the
// causeway it is a bell's black shape in the arch against the lit wall beyond: nothing else in the walk is that shape.
// The Late folk could not ring a bell that size from inside, so they hung a ram beside it: a trimmed trunk, iron-shod,
// slung on two chains from the same crack, saffron rags tied round it and a hauling rope hanging from its tail.
//
// The act. Standing at the rope, looking at the bell: "Ring the bell". The rope draws the ram back over the visitor
// (1.4 s), it hangs a beat and swings into the sound-bow: the bell booms (src/v10/bell-sound.js, the loudest thing a
// visitor can make), shivers, and sways on its chains for half a minute; dust and grit sift down out of the crack.
//
// What it calls. The bell tolls for the dead. Twenty-five metres beyond it, on the slope past its mouth, the traveller
// (stories/the-traveller-on-the-span.md) has lain unburied for years. A few seconds after the stroke, out on the
// Corpse-Candle Fen (east, behind the visitor) nine pale candles rise out of the water one after another with a thin
// chord, and come: in a line along the Span's north side at a walking pace, past the visitor, under the bell (its
// mouth lights green-white from inside as each passes, and it hums back to them), and out to the traveller, where they
// stand round him in a ring. It takes a minute and a quarter. They stay: on a return visit they are there, lighting
// him so he can be found at last from the deck, and the ram's strike-plate on the bronze is rubbed bright. Each later
// ringing calls nine more, and the ring round him widens (up to three rings).
//
// Draws: the bell (one lathe, vertex colours; its inside lit by a uniform the candles drive), the chains (one
// instanced link mesh for the bell's, one for the ram's), the ram and its rope and rags (one merged mesh), the timbers in
// the crack and the fresh stones fallen from it (one instanced mesh each), the dust (points, only while it falls), the
// candles (points). No point light. Per frame: nothing while nothing moves but the standing candles' time uniform
// within 160 m. ?bell=0 leaves it out. ctx.bell: { site, stand(), state, ringing, candles(), strike }.
import * as THREE from 'three';
import { clamp, smoothstep, lerp } from '../noise.js';
import { PALETTE } from '../world.js';
import { TRAVELLER } from '../v8/threads/plan.js';
import { fogPars, fogAtten } from '../particles/shaderParts.js';
import { bayArch, intrados } from '../v4/span/plan.js';

const PARAM = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('bell') : null;
export const BELL = { x: -45, z: 215, r: 7 }; // under the crack (x -46.8..-43.2), the bay's crown at y 45.6
const ID = 'span-bell';
const PIV_Y = 50; // the timbers wedged across the crack, 4 m above the vault's crown: the chains go over them
const SC = 2.1; // the profile below is a 5 m bell; this one is 10.6 m high and 12.7 m across the mouth
const PROF = [[3.02, 0], [3.1, 0.12], [3.08, 0.3], [2.95, 0.42], [2.72, 0.8], [2.5, 1.3], [2.32, 1.9], [2.2, 2.5], [2.12, 3.1],
  [2.13, 3.25], [2.08, 3.3], [2.06, 3.62], [2.11, 3.67], [2.06, 3.72], [2.0, 4.05], [1.86, 4.38], [1.6, 4.68], [1.2, 4.9], [0.75, 5.02], [0.46, 5.06]];
const THICK = (y) => lerp(0.22, 0.12, clamp(y / 5, 0, 1)) * SC;
const RAM = { len: 5.6, r: 0.4, gap: 0.9, back: 3.0 }; // the ram's length, its trunk's radius, its rest gap to the bronze, how far it is hauled
// the timeline of a ringing, in seconds from the press
const LUGS = [-4.6, -1.5]; // the ram's chain lugs, local z (the head's face at 0, the tail at -len)
const HAUL = 1.8, HOLD = 0.5, SWING = 0.75, STRIKE = HAUL + HOLD + SWING;
const CALL = STRIKE + 2.5, EVERY = 1.1, RISE = 3.0, SPEED = 2.4; // the candles: first rises at CALL, one each EVERY s, RISE s up out of the water, then SPEED m/s
const NC = 9, MAXSTAND = 27; // candles a ringing calls; standing round him at most

export async function build(ctx) {
  if (PARAM === '0') { ctx.bell = null; return; }
  const { scene, terrain } = ctx;
  const low = ctx.quality === 'low';
  const N2 = ctx.noise.noise2;
  const rng = ctx.makeRng(10040);
  const H = (x, z) => terrain.heightAt(x, z);
  const BX = BELL.x, BZ = BELL.z;

  // ---------------------------------------------------------------- the bell's profile, lip at local y 0
  const prof = PROF.map(([r, y]) => ({ r: r * SC, y: y * SC }));
  const TOP = prof[prof.length - 1].y; // 8.86
  const R0 = prof[0].r; // 5.29
  let gHi = -Infinity;
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; gHi = Math.max(gHi, H(BX + Math.sin(a) * R0, BZ + Math.cos(a) * R0)); }
  gHi = Math.max(gHi, H(BX, BZ));
  const LIP = gHi + 3.2; // world y of the lip: a walker passes under it
  const outerAt = (y) => { let j = 0; while (j < prof.length - 2 && prof[j + 1].y < y) j++; const a = prof[j], b = prof[j + 1]; return lerp(a.r, b.r, clamp((y - a.y) / (b.y - a.y || 1), 0, 1)); };
  const BOW = 0.45; // the sound-bow, where the ram strikes: local height
  const RAMY = LIP + BOW, HEADX = BX - outerAt(BOW) - RAM.gap; // the ram's axis height and its head's face at rest (west of the bell)

  // ---------------------------------------------------------------- the bell: one lathe, outside then lip then inside
  // A closed profile from the crown's top centre down the outside, round the lip and up the inside to the crown's
  // underside; the lathe sweeps it. aIn marks the inside (the candles light it).
  const pts = [], inner = [];
  pts.push(new THREE.Vector2(0.001, TOP + 0.02)); inner.push(0);
  for (let j = prof.length - 1; j >= 0; j--) { pts.push(new THREE.Vector2(prof[j].r, prof[j].y)); inner.push(0); }
  pts.push(new THREE.Vector2(prof[0].r - THICK(0) * 0.5, -0.05)); inner.push(0); // the lip's rounded edge
  for (let j = 0; j < prof.length; j++) {
    const p = prof[j], t = THICK(p.y), a = prof[Math.max(0, j - 1)], b = prof[Math.min(prof.length - 1, j + 1)];
    const dr = b.r - a.r, dy = b.y - a.y, l = Math.hypot(dr, dy) || 1;
    pts.push(new THREE.Vector2(Math.max(0.05, p.r - (dy / l) * t), Math.min(TOP - 0.15, p.y + (dr / l) * t))); inner.push(1);
  }
  pts.push(new THREE.Vector2(0.001, TOP - 0.2)); inner.push(1);
  pts.reverse(); inner.reverse(); // inside first, top down, then the outside bottom up: the lathe's faces and normals point out of the metal
  const NA = low ? 48 : 72;
  const bellGeo = new THREE.LatheGeometry(pts, NA);
  {
    const p = bellGeo.attributes.position, n = p.count, np = pts.length;
    const col = new Float32Array(n * 3), aIn = new Float32Array(n), base = new Float32Array(n * 3);
    const BRONZE = new THREE.Color('#8a5a30'), VERD = new THREE.Color('#58937a'), VERD2 = new THREE.Color('#93c2a8'), SOOT = new THREE.Color('#15100c');
    const INSIDE = new THREE.Color('#3d2b1c'), DARK = new THREE.Color('#1c130c'), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const j = i % np, x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z); // a: 0 toward +z (south), pi toward the ram
      aIn[i] = inner[j];
      if (inner[j]) {
        c.copy(INSIDE).multiplyScalar(0.75 + 0.35 * N2(a * 4 + 9, y * 1.2)).lerp(VERD, 0.18 * (N2(a * 3, y) * 0.5 + 0.5)).lerp(DARK, smoothstep(TOP * 0.5, TOP, y) * 0.7);
      } else {
        const streak = N2(Math.cos(a) * 7 + Math.sin(a) * 3, y * 0.3) * 0.5 + 0.5; // verdigris run down from the bands
        const band = Math.max(1 - smoothstep(0, 0.4, Math.abs(y - 3.2 * SC)), 1 - smoothstep(0, 0.5, Math.abs(y - 3.66 * SC)), 1 - smoothstep(0, 0.3, Math.abs(y - 0.3 * SC)));
        const top = smoothstep(TOP * 0.6, TOP, y);
        c.copy(BRONZE).multiplyScalar(0.8 + 0.35 * N2(a * 6, y * 1.6));
        c.lerp(VERD, clamp(streak * 0.9 - 0.15 + band * 0.35 + top * 0.55, 0, 0.9));
        c.lerp(VERD2, clamp((top - 0.3) * 0.6 + band * 0.25 * streak, 0, 0.55));
        // the Heliarchy's legend round the shoulder: a band of raised letters, worn, read as light and dark blocks
        const ly = (y - 4.09 * SC) / (0.3 * SC);
        if (ly > 0 && ly < 1) {
          const cell = Math.floor((a + Math.PI) / (Math.PI * 2) * 140), row = Math.floor(ly * 3);
          const h = Math.sin(cell * 12.9898 + row * 78.233) * 43758.5453, f = h - Math.floor(h);
          if (f > 0.45 && cell % 9 !== 0) c.lerp(f > 0.8 ? VERD2 : DARK, 0.45);
        }
        // the crack up from the lip on the north-east side, the one the visitor faces: a dark seam with verdigris either side
        const ca = 2.55 + 0.04 * Math.sin(y * 2.3) + 0.02 * Math.sin(y * 7.1), cw = Math.abs(a - ca);
        if (y < 1.5 * SC) { c.lerp(VERD2, (1 - smoothstep(0.02, 0.07, cw)) * 0.5); c.lerp(SOOT, (1 - smoothstep(0.004, 0.012, cw)) * (1 - smoothstep(1.15 * SC, 1.5 * SC, y))); }
        c.lerp(SOOT, smoothstep(0, -0.05, y) * 0.3);
      }
      base[i * 3] = c.r; base[i * 3 + 1] = c.g; base[i * 3 + 2] = c.b;
    }
    col.set(base);
    bellGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    bellGeo.setAttribute('aIn', new THREE.BufferAttribute(aIn, 1));
    bellGeo.userData.base = base;
  }
  const uGlow = { value: new THREE.Color(0, 0, 0) };
  const bellMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.15, side: THREE.FrontSide });
  bellMat.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = uGlow;
    // the inside lit from below: brightest at the lip, gone by the crown, coloured by the bronze it falls on
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\nattribute float aIn; varying float vIn; varying float vH;`).replace('#include <begin_vertex>', `#include <begin_vertex>\nvIn = aIn; vH = clamp(position.y / ${TOP.toFixed(2)}, 0.0, 1.0);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vIn; varying float vH; uniform vec3 uGlow;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uGlow * vIn * pow(1.0 - vH, 2.2) * (0.25 + diffuseColor.rgb * 2.2) + diffuseColor.rgb * 0.09 * (1.0 - vIn);'); // its own sheen: bronze in a dark vault still reads from across the fen
  };
  bellMat.customProgramCacheKey = () => 'span-bell';
  const bell = new THREE.Mesh(bellGeo, bellMat);
  bell.castShadow = true; bell.receiveShadow = true; bell.name = 'bell';

  // the pivot: the timbers in the crack. The bell hangs a little askew (one chain stretched longer over the ages).
  const pivot = new THREE.Group(); pivot.position.set(BX, PIV_Y, BZ); pivot.name = 'bell-pivot';
  const hang = new THREE.Group(); hang.position.set(0, LIP - PIV_Y, 0); hang.rotation.z = 0.022;
  hang.add(bell); pivot.add(hang); scene.add(pivot);
  // the crown's loop (the canons), and its iron strap
  const ironMat = new THREE.MeshStandardMaterial({ color: '#221c18', roughness: 0.7, metalness: 0.5 });
  {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.2, 6, 14), new THREE.MeshStandardMaterial({ color: '#3f5f50', roughness: 0.6, metalness: 0.3 }));
    loop.position.set(0, TOP + 0.55, 0); loop.castShadow = true; hang.add(loop);
  }

  // ---------------------------------------------------------------- chains: instanced links
  const LINK = low ? 0.42 : 0.3;
  const linkGeo = new THREE.TorusGeometry(0.11, 0.032, 4, 6); linkGeo.scale(1, 1.55, 1);
  const ONE = new THREE.Vector3(1, 1, 1), tmpM = new THREE.Matrix4(), tq = new THREE.Quaternion(), tq2 = new THREE.Quaternion(), tv = new THREE.Vector3(), ts = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  function layChain(mesh, k0, A, B) { // links from A to B (Vector3s in the mesh's frame) from instance k0; returns the next free index
    dir.subVectors(B, A); const L = dir.length(); dir.multiplyScalar(1 / L);
    tq.setFromUnitVectors(up, dir);
    const n = Math.max(1, Math.floor(L / LINK));
    let k = k0;
    for (let i = 0; i < n; i++) {
      tq2.setFromAxisAngle(dir, (i % 2) * Math.PI / 2).multiply(tq);
      tv.copy(A).addScaledVector(dir, (i + 0.5) * (L / n));
      mesh.setMatrixAt(k++, tmpM.compose(tv, tq2, ONE));
    }
    return k;
  }
  const chainMat = new THREE.MeshStandardMaterial({ color: '#2a221d', roughness: 0.62, metalness: 0.55 });
  // the bell's four chains, in the pivot's frame: from the loop to the timber
  const crownL = new THREE.Vector3(0, LIP - PIV_Y + TOP + 1.0, 0);
  const bellTops = [[-1.05, 0.35], [1.05, 0.35], [-1.05, -0.35], [1.05, -0.35]].map(([x, z]) => new THREE.Vector3(x, 0, z));
  const bellLinks = Math.ceil(bellTops.reduce((s, t) => s + t.distanceTo(crownL), 0) / LINK) + 8;
  const bellChains = new THREE.InstancedMesh(linkGeo, chainMat, bellLinks);
  {
    let k = 0; const fan = new THREE.Vector3();
    for (const t of bellTops) { fan.set(t.x * 0.22, crownL.y, t.z * 0.3); k = layChain(bellChains, k, fan, t); }
    bellChains.count = k; bellChains.instanceMatrix.needsUpdate = true;
  }
  bellChains.name = 'bell-chains'; bellChains.castShadow = true; bellChains.computeBoundingSphere();
  pivot.add(bellChains);

  // ---------------------------------------------------------------- the ram: trunk, iron, rags; hung west of the bell
  // Built along its local z with the head's face at 0 and the tail at -len; the group turns it so the head points east
  // at the bell's west sound-bow, in the low sun, broadside to a visitor at the post north of it. At rest it hangs a
  // body's width clear of the bronze, daylight between them.
  const ramG = new THREE.Group(); ramG.name = 'bell-ram'; ramG.rotation.y = Math.PI / 2;
  scene.add(ramG);
  const ironMatR = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.1 });
  const cols = (g, c) => { const C = new THREE.Color(c), a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = C.r; a[i + 1] = C.g; a[i + 2] = C.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (g.attributes.uv) g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; };
  {
    const parts = [];
    const paint = (g, color, k = 0.15, f = 3) => {
      const p = g.attributes.position, c = new Float32Array(p.count * 3), C = new THREE.Color(color), o = new THREE.Color();
      for (let i = 0; i < p.count; i++) { o.copy(C).multiplyScalar(1 - k + 2 * k * (N2(p.getX(i) * f + 3, p.getZ(i) * f + p.getY(i) * f) * 0.5 + 0.5)); c[i * 3] = o.r; c[i * 3 + 1] = o.g; c[i * 3 + 2] = o.b; }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3)); if (g.attributes.uv) g.deleteAttribute('uv'); parts.push(g.index ? g.toNonIndexed() : g);
    };
    const along = (g, z) => { g.rotateX(Math.PI / 2); g.translate(0, 0, z); return g; }; // a cylinder laid along z
    const L = RAM.len, seg = low ? 8 : 12;
    // the trunk, a little thicker toward the head, not quite straight
    const trunk = along(new THREE.CylinderGeometry(RAM.r * 0.95, RAM.r * 0.8, L - 0.9, seg, 6), 0);
    { const p = trunk.attributes.position; for (let i = 0; i < p.count; i++) { const d = 1 + 0.06 * N2(p.getZ(i) * 0.8, Math.atan2(p.getX(i), p.getY(i)) * 2); p.setX(i, p.getX(i) * d + 0.05 * Math.sin(p.getZ(i) * 0.6)); p.setY(i, p.getY(i) * d); } }
    trunk.translate(0, 0, -L / 2 - 0.45); paint(trunk, '#6a5038', 0.25, 1.2);
    // the head: a great iron cap bound on with straps, its face a boss worn bright where it has met the bronze for ages
    paint(along(new THREE.CylinderGeometry(RAM.r * 1.35, RAM.r * 1.2, 1.1, seg), -0.6), '#2c241e', 0.15);
    paint(along(new THREE.CylinderGeometry(RAM.r * 1.45, RAM.r * 1.45, 0.16, seg), -1.12), '#1e1814', 0.1); // its collar
    { const d = new THREE.SphereGeometry(RAM.r * 1.35, seg, 6, 0, Math.PI * 2, 0, Math.PI / 2); d.scale(1, 0.45, 1); d.rotateX(Math.PI / 2); d.translate(0, 0, -0.05); paint(d, '#9a8a70', 0.15); }
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; const g = new THREE.BoxGeometry(0.07, 0.04, 1.4); g.translate(Math.sin(a) * RAM.r * 1.0, Math.cos(a) * RAM.r * 1.0, -1.6); paint(g, '#241d18', 0.1); } // the straps back along the trunk
    // iron bands, and the two lugs its chains hang from
    for (const z of [-L + 0.35, -L + 2.3]) paint(along(new THREE.CylinderGeometry(RAM.r * 1.0, RAM.r * 1.0, 0.12, seg), z), '#241d18', 0.1);
    for (const z of LUGS) { const g = new THREE.BoxGeometry(0.16, 0.36, 0.2); g.translate(0, RAM.r + 0.12, z); paint(g, '#241d18', 0.1); }
    // the tail's eye, where the hauling rope is made fast
    { const g = new THREE.TorusGeometry(0.16, 0.04, 5, 10); g.translate(0, 0, -L - 0.1); paint(g, '#241d18', 0.1); }
    // saffron and madder rags tied round it, hanging (the Late folk's colours)
    for (let i = 0; i < 9; i++) {
      const z = -L + 0.6 + i * 0.5 + rng() * 0.2, a = (rng() - 0.5) * 1.4, len = 0.4 + rng() * 0.5;
      const g = new THREE.BoxGeometry(0.012, len, 0.1 + rng() * 0.06); g.translate(0, -len / 2, 0); g.rotateX(a * 0.2); g.translate(Math.sin(a) * RAM.r * 0.95, -Math.cos(a) * RAM.r * 0.7, z);
      paint(g, i % 3 === 2 ? '#8e2e24' : '#e0a73a', 0.15, 6);
    }
    const m = new THREE.Mesh(mergeAll(parts), ironMatR);
    m.castShadow = true; m.receiveShadow = true; ramG.add(m);
  }
  // its chains: from iron staples in the vault straight over the lugs, relaid only while it moves
  const A = bayArch(-70, -22);
  const lugX = (s) => LUGS.map((lz) => HEADX - s + lz); // the lugs' world x with the ram s metres back (west)
  const RAMTOP = lugX(0).map((x) => new THREE.Vector3(x, intrados(A, x) - 0.2, BZ));
  const ramLinkN = Math.ceil(RAMTOP.reduce((t, v) => t + (v.y - RAMY) * 1.03, 0) / LINK) + 8;
  const ramChains = new THREE.InstancedMesh(linkGeo, chainMat, ramLinkN);
  ramChains.name = 'bell-ram-chains'; ramChains.castShadow = true; scene.add(ramChains);
  // the hauling rope: from the tail's eye west to a sheave bolted to pier -70's face, along the face to a ring at the
  // arch's mouth, and down to an iron ring on a squat stone by the pier's foot, where the visitor stands. Hauled, the
  // tail comes toward the sheave and the taken-in rope falls in a coil at the post.
  const SHEAVE = new THREE.Vector3(A.fl + 0.45, RAMY + 0.05, BZ), CORNER = new THREE.Vector3(A.fl + 0.45, RAMY + 0.05, 206.8);
  const POST = { x: A.fl + 2.4, z: 203.4 }; POST.y = H(POST.x, POST.z);
  const RING = new THREE.Vector3(POST.x, POST.y + 0.95, POST.z);
  const ropeMat = new THREE.MeshStandardMaterial({ color: '#a08a60', roughness: 0.95 });
  const ropeGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 6).translate(0, 0.5, 0);
  const rope = new THREE.Mesh(ropeGeo, ropeMat); rope.castShadow = true; rope.name = 'bell-rope'; scene.add(rope);
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.06, 5, 14).rotateX(Math.PI / 2), ropeMat); coil.name = 'bell-coil'; scene.add(coil);
  {
    const parts = [];
    const stone = new THREE.CylinderGeometry(0.32, 0.42, 1.0, 7, 2); { const p = stone.attributes.position; for (let i = 0; i < p.count; i++) { const d = 1 + 0.12 * N2(p.getX(i) * 3, p.getY(i) * 3 + p.getZ(i) * 2); p.setX(i, p.getX(i) * d); p.setZ(i, p.getZ(i) * d); } }
    stone.translate(POST.x, POST.y + 0.42, POST.z); parts.push(cols(stone, '#7c7466'));
    const ringG = new THREE.TorusGeometry(0.13, 0.03, 5, 10); ringG.rotateY(0.6); ringG.translate(RING.x, RING.y - 0.08, RING.z); parts.push(cols(ringG, '#2a221c'));
    // the sheave: an iron wheel in a bracket on the pier's face; the ring at the mouth; the fixed runs of rope between
    const wheel = new THREE.CylinderGeometry(0.42, 0.42, 0.14, 14); wheel.rotateX(Math.PI / 2); wheel.translate(SHEAVE.x + 0.1, SHEAVE.y, SHEAVE.z); parts.push(cols(wheel, '#2a221c'));
    const brk = new THREE.BoxGeometry(0.7, 0.16, 0.5); brk.translate(SHEAVE.x - 0.25, SHEAVE.y + 0.5, SHEAVE.z); parts.push(cols(brk, '#1e1814'));
    const eye = new THREE.TorusGeometry(0.16, 0.04, 5, 10); eye.rotateY(Math.PI / 2); eye.translate(CORNER.x, CORNER.y, CORNER.z); parts.push(cols(eye, '#2a221c'));
    const run = (A2, B2) => { const d = new THREE.Vector3().subVectors(B2, A2), l = d.length(), g = new THREE.CylinderGeometry(0.05, 0.05, l, 6); g.translate(0, l / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.normalize())); g.translate(A2.x, A2.y, A2.z); parts.push(cols(g, '#a08a60')); };
    run(SHEAVE, CORNER); run(CORNER, RING);
    const post = new THREE.Mesh(mergeAll(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.2 }));
    post.castShadow = true; post.receiveShadow = true; post.name = 'bell-post'; scene.add(post);
    ctx.addCollider?.({ x: POST.x, z: POST.z, r: 0.4, y: POST.y - 0.2, h: 1.1 });
  }
  const lugP = new THREE.Vector3(), tail = new THREE.Vector3();
  function placeRam(s) { // s: metres the ram stands back (west, -x) of its rest; negative is past it, toward the bell
    const lift = (s * s) / (2 * (RAMTOP[0].y - RAMY)); // a pendulum's rise
    ramG.position.set(HEADX - s, RAMY + lift, BZ);
    let k = 0; const xs = lugX(s);
    for (let i = 0; i < 2; i++) { lugP.set(xs[i], RAMY + lift + RAM.r + 0.25, BZ); k = layChain(ramChains, k, lugP, RAMTOP[i]); }
    ramChains.count = k; ramChains.instanceMatrix.needsUpdate = true; ramChains.computeBoundingSphere();
    tail.set(HEADX - s - RAM.len - 0.1, RAMY + lift, BZ);
    dir.subVectors(SHEAVE, tail); const l = dir.length();
    rope.position.copy(tail); rope.quaternion.setFromUnitVectors(up, dir.multiplyScalar(1 / l)); rope.scale.set(1, l, 1);
    const taken = clamp(s / RAM.back, 0, 1); // the coil at the post grows with the rope taken in
    coil.position.set(POST.x + 0.55, POST.y + 0.06 + 0.1 * taken, POST.z - 0.45); coil.scale.set(1 + 0.5 * taken, 1 + 3 * taken, 1 + 0.5 * taken);
  }
  placeRam(0);

  // the timber wedged across the crack, the bell's chains over it, seen from the deck looking down into the crack
  {
    const tm = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.7, 0.8), new THREE.MeshStandardMaterial({ color: '#3b2c20', roughness: 0.9 }));
    tm.position.set(BX, PIV_Y + 0.35, BZ); tm.castShadow = true; tm.name = 'bell-timber'; scene.add(tm);
  }

  // ---------------------------------------------------------------- fresh stones fallen from the crack (one or two a ringing)
  const NSTONE = 14;
  const stones = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#b3a68e', roughness: 0.95, flatShading: true }), NSTONE);
  {
    const r2 = ctx.makeRng(10041);
    for (let i = 0; i < NSTONE; i++) {
      // round the bell's foot, outside the lip's shadow line, mostly where the crack's grit lands (east and west of it)
      const a = r2() * Math.PI * 2, r = R0 + 0.4 + r2() * 2.4, x = BX + Math.sin(a) * r * 0.55, z = BZ + Math.cos(a) * r;
      const s = 0.12 + r2() * r2() * 0.35;
      tq.setFromEuler(new THREE.Euler(r2() * 3, r2() * 3, r2() * 3));
      stones.setMatrixAt(i, tmpM.compose(tv.set(x, H(x, z) + s * 0.35, z), tq, ts.set(s * (1 + r2() * 0.6), s * 0.7, s)));
    }
  }
  stones.count = 0; stones.castShadow = true; stones.receiveShadow = true; stones.name = 'bell-stones'; scene.add(stones);

  // ---------------------------------------------------------------- the dust, while it falls
  // three falls at once: a burst of verdigris where the ram strikes, a shawl of dust shaken off the bell's shoulder
  // that slides down past the lip, and grit out of the crack overhead; puffs (aS: their size in metres) and grains
  const ND = low ? 200 : 340;
  const dPos = new Float32Array(ND * 3), dVel = new Float32Array(ND * 3), dT0 = new Float32Array(ND), dA = new Float32Array(ND), dS = new Float32Array(ND), dK = new Uint8Array(ND);
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3).setUsage(THREE.DynamicDrawUsage));
  dGeo.setAttribute('aA', new THREE.BufferAttribute(dA, 1).setUsage(THREE.DynamicDrawUsage));
  dGeo.setAttribute('aS', new THREE.BufferAttribute(dS, 1));
  const dMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uScale: { value: 400 } }]),
    vertexShader: `uniform float uScale; attribute float aA, aS; varying float vA; varying float vS;
      #include <fog_pars_vertex>
      void main() { vec3 transformed = position; vec4 mvPosition = viewMatrix * vec4(transformed, 1.0); gl_Position = projectionMatrix * mvPosition;
        vA = aA; vS = aS; gl_PointSize = aA > 0.0 ? clamp(aS * uScale / max(-mvPosition.z, 0.1), 1.5, 220.0) : 0.0;
        #include <fog_vertex>
      }`,
    fragmentShader: `varying float vA; varying float vS;
      ${fogPars}
      void main() { ${fogAtten}
        float r = length(gl_PointCoord - 0.5) * 2.0; float a = (vS > 0.2 ? pow(max(0.0, 1.0 - r), 1.6) * 0.32 : smoothstep(1.0, 0.4, r)) * vA;
        gl_FragColor = vec4(mix(vec3(0.24, 0.28, 0.23), vec3(0.36, 0.33, 0.29), step(0.2, vS)) * fogAtten, a); }`,
    fog: true, transparent: true, depthWrite: false,
  });
  const dust = new THREE.Points(dGeo, dMat); dust.visible = false; dGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(BX, 25, BZ), 30); dust.name = 'bell-dust'; scene.add(dust);
  function startDust(t) {
    const r3 = ctx.makeRng(10042 + Math.floor(t * 10));
    for (let i = 0; i < ND; i++) {
      const u = i / ND, k = u < 0.2 ? 0 : u < 0.8 ? 1 : 2; dK[i] = k;
      if (k === 0) { // the strike: flakes of verdigris knocked off the bronze round the plate, falling
        const a = Math.PI + (r3() - 0.5) * 1.2, y = BOW + (r3() - 0.3) * 2.2, rr = outerAt(Math.max(0, y)) + 0.05;
        dPos[i * 3] = BX + Math.sin(a) * rr; dPos[i * 3 + 1] = LIP + y; dPos[i * 3 + 2] = BZ + Math.cos(a) * rr;
        dVel[i * 3] = -0.3 - r3() * 0.8; dVel[i * 3 + 1] = r3() * 0.6; dVel[i * 3 + 2] = (r3() - 0.5) * 0.8; dT0[i] = t + r3() * 0.1; dS[i] = r3() < 0.25 ? 0.25 : 0.05 + r3() * 0.04;
      } else if (k === 1) { // the crown and shoulders: dust lying on the bell for an age, shaken off all round it
        const a = r3() * Math.PI * 2, y = TOP * (0.4 + 0.6 * r3()), rr = outerAt(y) * (y > TOP * 0.93 ? r3() : 1) + 0.15;
        dPos[i * 3] = BX + Math.sin(a) * rr; dPos[i * 3 + 1] = LIP + y; dPos[i * 3 + 2] = BZ + Math.cos(a) * rr;
        dVel[i * 3] = Math.sin(a) * (0.2 + r3() * 0.5); dVel[i * 3 + 1] = -0.2 - r3() * 0.6; dVel[i * 3 + 2] = Math.cos(a) * (0.2 + r3() * 0.5); dT0[i] = t + r3() * 0.6; dS[i] = r3() < 0.45 ? 1.4 + r3() * 1.2 : 0.06;
      } else { // the crack: grit out of the vault's split crown
        dPos[i * 3] = BX + (r3() - 0.5) * 3.2; dPos[i * 3 + 1] = 44 + r3() * 2; dPos[i * 3 + 2] = BZ + (r3() - 0.5) * 14;
        dVel[i * 3] = (r3() - 0.5) * 0.4; dVel[i * 3 + 1] = -1 - r3() * 3; dVel[i * 3 + 2] = (r3() - 0.5) * 0.4; dT0[i] = t + r3() * 3; dS[i] = r3() < 0.3 ? 0.5 : 0.1;
      }
      dA[i] = 0;
    }
    dGeo.attributes.aS.needsUpdate = true;
    dust.visible = true;
  }
  function stepDust(dt, t) {
    let live = 0;
    for (let i = 0; i < ND; i++) {
      const age = t - dT0[i];
      if (age < 0) { dA[i] = 0; live++; continue; }
      const y = dPos[i * 3 + 1];
      if (y < H(dPos[i * 3], dPos[i * 3 + 2]) + 0.05 || age > 10) { dA[i] = 0; continue; }
      live++;
      const puff = dS[i] > 0.2, drag = Math.exp(-dt * (puff ? 1.6 : 0.4));
      dVel[i * 3] *= drag; dVel[i * 3 + 2] *= drag;
      dVel[i * 3 + 1] = puff ? dVel[i * 3 + 1] * drag - 0.5 * dt : Math.max(-9, dVel[i * 3 + 1] - 9.8 * dt * 0.5); // puffs hang and sink; grit falls
      dPos[i * 3] += dVel[i * 3] * dt; dPos[i * 3 + 1] += dVel[i * 3 + 1] * dt; dPos[i * 3 + 2] += dVel[i * 3 + 2] * dt;
      if (puff) dS[i] += dt * 0.25; // a puff spreads as it hangs
      dA[i] = (puff ? 0.4 : 0.9) * smoothstep(0, 0.15, age) * (1 - smoothstep(puff ? 4 : 6, puff ? 9 : 9, age));
    }
    dGeo.attributes.position.needsUpdate = true; dGeo.attributes.aA.needsUpdate = true; dGeo.attributes.aS.needsUpdate = true;
    if (!live) dust.visible = false;
  }

  // ---------------------------------------------------------------- the candles
  const fen = ctx.water?.fen || { x: 70, z: 160, y: -2.45 };
  const body = TRAVELLER.body;
  // where each rises: over the fen's water at its west end, nearest the Span
  const homes = [];
  {
    const r4 = ctx.makeRng(10043);
    for (let tries = 0; homes.length < NC && tries < 400; tries++) {
      const x = 28 + r4() * 26, z = 160 + r4() * 22;
      if (H(x, z) > fen.y - 0.2 && tries < 300) continue;
      if (homes.some((h) => (h.x - x) ** 2 + (h.z - z) ** 2 < 16)) continue;
      homes.push({ x, z });
    }
    while (homes.length < NC) homes.push({ x: 36 + homes.length * 2, z: 172 });
  }
  // the way they come: along the Span's north side, close past the post where the visitor stands, and in under the
  // bell, where they gather in its mouth and wait for the visitor; then on out through the arch to him
  const WAY1 = [[24, 180], [8, 187], [-10, 193.5], [-28, 198], [-44, 199.6], [-55, 200.6], [-56.5, 205.5], [-51, 210.5]];
  const WAY2 = [[-48.6, 223.5], [-54.5, 231.5]];
  const gatherSlot = (i) => { const a = (i / NC) * Math.PI * 2; return { x: BX + Math.cos(a) * 2.6, z: BZ + Math.sin(a) * 2.6, y: LIP - 0.6 + 0.5 * Math.sin(i * 1.9) }; };
  const ringSlot = (k) => { const ring = Math.floor(k / 9), a = (k % 9) / 9 * Math.PI * 2 + ring * 0.35, r = 1.9 + ring * 1.0; return { x: body.x + Math.cos(a) * r, z: body.z + Math.sin(a) * r }; };
  const HEAD = (() => { const B = TRAVELLER.body; return { x: B.x + 0.85 * Math.sin(B.yaw), z: B.z + 0.85 * Math.cos(B.yaw) }; })(); // over his head: where one candle keeps watch
  const NCMAX = MAXSTAND + NC;
  const cPos = new Float32Array(NCMAX * 3), cPh = new Float32Array(NCMAX), cOn = new Float32Array(NCMAX); // aOn: 0 unlit, 1 a candle, over 1 kindling (bigger, brighter)
  for (let i = 0; i < NCMAX; i++) cPh[i] = rng() * 6.28;
  const cGeo = new THREE.BufferGeometry();
  cGeo.setAttribute('position', new THREE.BufferAttribute(cPos, 3).setUsage(THREE.DynamicDrawUsage));
  cGeo.setAttribute('aPh', new THREE.BufferAttribute(cPh, 1));
  cGeo.setAttribute('aOn', new THREE.BufferAttribute(cOn, 1).setUsage(THREE.DynamicDrawUsage));
  // sized in the world (a flame 1.8 m tall with its halo), never under 2.5 px however far
  const cMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uScale: { value: 400 }, uWisp: { value: new THREE.Color(PALETTE.wisp) } }]),
    vertexShader: `uniform float uTime, uScale; attribute float aPh, aOn; varying float vI;
      #include <fog_pars_vertex>
      void main() { vec3 transformed = position; vec4 mvPosition = viewMatrix * vec4(transformed, 1.0); gl_Position = projectionMatrix * mvPosition;
        float pulse = 0.8 + 0.2 * sin(uTime * 1.7 + aPh * 3.0) * sin(uTime * 0.61 + aPh * 7.0);
        float px = 1.8 * max(aOn, 0.0) * uScale / max(-mvPosition.z, 0.1);
        vI = pulse * min(aOn, 1.6) * (1.0 + 0.6 * clamp((24.0 - px) / 24.0, 0.0, 1.0)); // small far off: brighter, so they still lead the eye
        gl_PointSize = aOn > 0.001 ? clamp(px, 2.5, 72.0) : 0.0; // close to, a candle is a hand's flame, not a lamp in your face
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uWisp; varying float vI;
      ${fogPars}
      void main() { ${fogAtten}
        vec2 c = (gl_PointCoord - 0.5) * 2.0; c.y += 0.08;
        vec2 f = vec2(c.x * 2.4, c.y < 0.0 ? c.y * 1.1 : c.y * 2.6); // a flame: taller above its heart than below
        float rf = dot(f, f), r2 = dot(c, c);
        float a = exp(-rf * 10.0) * 2.2 + exp(-r2 * 8.0) * 0.6 + exp(-r2 * 2.6) * 0.22;
        vec3 col = mix(uWisp, vec3(0.95, 1.0, 0.97), exp(-rf * 12.0)) * a;
        gl_FragColor = vec4(col * vI * fogAtten, 1.0); }`,
    fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const candles = new THREE.Points(cGeo, cMat); candles.renderOrder = 20; candles.name = 'bell-candles'; scene.add(candles);
  const cBound = () => { cGeo.computeBoundingSphere(); cGeo.boundingSphere.radius += 2; };
  // the light they make on him: a soft pool laid over him and the turf round him, there while they are
  const pool = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const g2 = cv.getContext('2d'), gr = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
    const geo = new THREE.PlaneGeometry(1, 1, 8, 8); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), color: new THREE.Color(PALETTE.wisp).multiplyScalar(0.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true }));
    m.name = 'bell-pool'; m.renderOrder = 2; m.visible = false; scene.add(m);
    return m;
  })();
  function placePool(R, k = 1) {
    pool.visible = R > 0; if (!(R > 0)) return;
    pool.material.color.set(PALETTE.wisp).multiplyScalar(0.3 * k);
    const p = pool.geometry.attributes.position, base = pool.userData.base || (pool.userData.base = Float32Array.from(p.array));
    for (let i = 0; i < p.count; i++) { const x = body.x + base[i * 3] * R, z = body.z + base[i * 3 + 2] * R; p.setXYZ(i, x, H(x, z) + 0.32, z); } // laid over him
    p.needsUpdate = true; pool.geometry.computeBoundingSphere();
  }
  const pathOf = (pts) => { const L = [0]; for (let k = 1; k < pts.length; k++) L.push(L[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])); return { P: pts, L, len: L[L.length - 1] }; };
  const along = (w, d, o) => { let s2 = 1; while (s2 < w.L.length - 1 && w.L[s2] < d) s2++; const f = clamp((d - w.L[s2 - 1]) / (w.L[s2] - w.L[s2 - 1] || 1), 0, 1); o.x = lerp(w.P[s2 - 1][0], w.P[s2][0], f); o.z = lerp(w.P[s2 - 1][1], w.P[s2][1], f); return o; };
  const cy = (x, z, k) => Math.max(H(x, z), fen.y) + k; // a candle's height: over the ground, or the water
  let standing = 0, gathered = false; // candles in the ring; his letters gathered (then one candle keeps watch, the rest have gone up)
  const standH = (k) => 1.2 + 0.2 * Math.sin(k * 2.3);
  function drawStanding() {
    for (let k = 0; k < NCMAX; k++) cOn[k] = 0;
    if (gathered) { cPos[0] = HEAD.x; cPos[1] = cy(HEAD.x, HEAD.z, 0.9); cPos[2] = HEAD.z; cOn[0] = standing > 0 ? 1 : 0; }
    else for (let k = 0; k < standing; k++) { const s2 = ringSlot(k); cPos[k * 3] = s2.x; cPos[k * 3 + 1] = cy(s2.x, s2.z, standH(k)); cPos[k * 3 + 2] = s2.z; cOn[k] = 1; }
    cGeo.attributes.position.needsUpdate = true; cGeo.attributes.aOn.needsUpdate = true; cBound();
    candles.visible = standing > 0;
    placePool(standing > 0 ? (gathered ? 2.4 : 2 * (1.9 + Math.floor((standing - 1) / 9) * 1.0 + 1.6)) : 0, gathered ? 0.6 : 1);
    uGlow.value.copy(cMat.uniforms.uWisp.value).multiplyScalar(shown > 0 ? 0.05 : 0); // a bell that has been rung keeps a little of their light in its mouth
  }

  // ---------------------------------------------------------------- the strike plate: the bronze rubbed bright where the ram lands
  // bare bronze where the ram has met it for ages (there before any visitor), brighter with each of theirs
  function rub(n) {
    const p = bellGeo.attributes.position, aIn = bellGeo.attributes.aIn, c = bellGeo.attributes.color, base = bellGeo.userData.base, GOLD = new THREE.Color('#d8b070'), o = new THREE.Color();
    const k = 0.55 + 0.45 * (1 - Math.pow(0.7, n));
    for (let i = 0; i < p.count; i++) {
      o.setRGB(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]);
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, -x); // 0 toward the ram (west)
      const w = (1 - smoothstep(0.08, 0.2, Math.abs(a))) * (1 - smoothstep(0.3, 0.75, Math.abs(y - BOW))) * (x < 0 ? 1 : 0) * (1 - aIn.getX(i));
      if (w > 0) o.lerp(GOLD, w * k);
      c.setXYZ(i, o.r, o.g, o.b);
    }
    c.needsUpdate = true;
  }

  // ---------------------------------------------------------------- the ringing
  const st = { t: -1, active: false, n: 0, from: 0, rang: false, called: 0, arrived: 0, hummed: false, settled: false, goT: -1, waiting: 0, asc: -1, resolve: null };
  const wayA = [], wayB = [], there = new Uint8Array(NC), cur = { x: 0, z: 0 };
  function ring(n) {
    there.fill(0);
    Object.assign(st, { t: 0, active: true, n, rang: false, called: 0, arrived: 0, hummed: false, settled: false, goT: -1, waiting: 0, asc: -1 });
    st.from = gathered ? 0 : standing;
    wayA.length = 0; wayB.length = 0;
    for (let i = 0; i < NC; i++) {
      const g = gatherSlot(i), k = Math.min(MAXSTAND - NC + i, st.from + i), r = ringSlot(k);
      wayA.push(pathOf([[homes[i].x, homes[i].z], ...WAY1, [g.x, g.z]])); const w = pathOf([[g.x, g.z], ...WAY2, [r.x, r.z]]); w.k = k; wayB.push(w);
    }
    ctx.audio?.cue('act-bell-haul', { x: RING.x, y: RING.y, z: RING.z });
    return new Promise((res) => { st.resolve = res; }); // busy until the candles have come to him (they wait for the visitor at the bell)
  }
  const ease = (u) => u * u * (3 - 2 * u);
  function ramAt(t) { // metres back (west) from rest; negative is toward the bell
    if (t < HAUL) return RAM.back * ease(t / HAUL); // hauled back on the rope
    if (t < HAUL + HOLD) return RAM.back; // hangs there
    if (t < STRIKE) { const u = (t - HAUL - HOLD) / SWING; return RAM.back - (RAM.back + RAM.gap) * (1 - Math.cos(u * Math.PI / 2)); } // let go: comes in, faster as it falls, onto the bronze
    const u = t - STRIKE; return -RAM.gap * Math.exp(-u / 2.4) * Math.cos(u * Math.PI * 2 / 3.4); // knocked back off it, swinging, dying
  }
  const RAM_STILL = STRIKE + 16;
  function finishRing() { st.active = false; pivot.rotation.z = 0; hang.rotation.x = 0; hang.position.x = 0; placeRam(0); dust.visible = false; const r = st.resolve; st.resolve = null; r?.(); }
  let lettersLaid = null; // the letters mesh as last laid (threads may build after this module: lay them when it comes)
  function step(dt, t) {
    cMat.uniforms.uTime.value = t;
    if (gathered && !letterAnim && lettersLaid !== lettersMesh() && lettersMesh()) placeLetters(true);
    if (!st.active && st.asc < 0 && !letterAnim) return;
    if (letterAnim) stepLetters(dt);
    if (st.asc >= 0) stepAscend(dt);
    if (!st.active) return;
    st.t += dt; const T = st.t;
    // the ram: relaid while it moves, then left still
    if (T < RAM_STILL) placeRam(ramAt(T)); else if (T - dt < RAM_STILL) placeRam(0);
    // the stroke
    if (!st.rang && T >= STRIKE) {
      st.rang = true;
      ctx.audio?.cue('act-bell', { x: HEADX + RAM.gap, y: LIP + 2, z: BZ }, { n: st.n });
      startDust(T); rub(st.n);
      stones.count = Math.min(NSTONE, st.n * 2); stones.instanceMatrix.needsUpdate = true;
    }
    // the bell: knocked off plumb, it swings east a degree and a half (a metre at the lip) on forty-seven metres of
    // chain, back to plumb and out again, slower to die than to start; a hard shiver as the stroke goes through it
    if (T >= STRIKE) {
      const u = T - STRIKE, sw = Math.sin(u * Math.PI / 12.8);
      pivot.rotation.z = 0.026 * Math.exp(-u / 30) * sw * sw + 0.002 * Math.exp(-u / 1.5) * Math.sin(u * Math.PI * 2 / 1.1);
      hang.rotation.x = 0.008 * Math.exp(-u / 0.8) * Math.sin(u * Math.PI * 2 * 5.5);
      hang.position.x = 0.04 * Math.exp(-u / 0.7) * Math.sin(u * Math.PI * 2 * 7.3 + 1);
    }
    if (dust.visible) stepDust(dt, T);
    // the candles
    let glow = 0, gatheredAll = 0;
    const pl = ctx.player.pos, near = Math.hypot(pl.x - BX, pl.z - BZ) < 32;
    for (let i = 0; i < NC && !st.settled; i++) {
      const idx = MAXSTAND + i; // a moving candle draws in its own entry past the standing ones
      const t0 = CALL + i * EVERY;
      if (T < t0) { cOn[idx] = 0; continue; }
      const h = homes[i];
      let x, y, z, on = 1;
      if (T < t0 + RISE) { // up out of the water, kindling
        const u = (T - t0) / RISE; x = h.x; z = h.z; y = fen.y - 0.3 + ease(u) * 1.7; on = smoothstep(0, 0.12, u) * (1 + 3 * Math.exp(-u * 4)); // a flare as it kindles, then a candle
        if (i === 0 && !st.called) { st.called = 1; ctx.audio?.cue('act-bell-candles', { x: h.x, y: fen.y + 1.5, z: h.z }); }
      } else {
        const wA = wayA[i], dA2 = (T - t0 - RISE) * SPEED;
        const bob = 0.15 * Math.sin(T * 1.9 + i * 1.7);
        if (dA2 < wA.len) { along(wA, dA2, cur); x = cur.x; z = cur.z; const g = gatherSlot(i), k = smoothstep(wA.len - 10, wA.len, dA2); y = lerp(cy(x, z, 1.5 + bob), g.y + bob, k); }
        else if (st.goT < 0 || T < st.goT + i * 0.8) { const g = gatherSlot(i); x = g.x; z = g.z; y = g.y + bob; gatheredAll++; } // in the bell's mouth, waiting
        else {
          const wB = wayB[i], d = Math.min(wB.len, (T - st.goT - i * 0.8) * SPEED);
          along(wB, d, cur); x = cur.x; z = cur.z;
          const g = gatherSlot(i), land = smoothstep(wB.len - 4, wB.len, d), off = smoothstep(0, 6, d);
          y = lerp(g.y + bob, lerp(cy(x, z, 1.5 + bob), cy(x, z, standH(wB.k)), land), off);
          if (d >= wB.len && !there[i]) { there[i] = 1; st.arrived++; }
        }
      }
      cPos[idx * 3] = x; cPos[idx * 3 + 1] = y; cPos[idx * 3 + 2] = z; cOn[idx] = on;
      // under the bell: its inside lights, and it hums back
      const dx = x - BX, dz = z - BZ, dd = Math.sqrt(dx * dx + dz * dz);
      glow += on * (1 - smoothstep(2, 9, dd));
      if (dd < 5 && !st.hummed) { st.hummed = true; ctx.audio?.cue('act-bell-hum', { x: BX, y: LIP + 3, z: BZ }); }
    }
    st.waiting = gatheredAll;
    if (st.goT < 0 && gatheredAll >= NC && near) st.goT = T + 1.5; // all nine in its mouth and the visitor near: they go on to him
    if (!st.settled) uGlow.value.copy(cMat.uniforms.uWisp.value).multiplyScalar(0.05 + 0.3 * Math.min(1.4, glow));
    candles.visible = true;
    cGeo.attributes.position.needsUpdate = true; cGeo.attributes.aOn.needsUpdate = true; cBound();
    // all nine at their places: they join the ring (drawn where they stand already)
    if (st.arrived >= NC && !st.settled) {
      st.settled = true; standing = Math.min(MAXSTAND, st.from + NC);
      if (gathered) startAscend(); else drawStanding();
      ctx.audio?.cue('act-bell-rest', { x: body.x, y: H(body.x, body.z) + 1.3, z: body.z });
      const r = st.resolve; st.resolve = null; r?.();
    }
    if (st.settled && T > STRIKE + 45 && !dust.visible) finishRing(); // the swing has died to nothing a visitor can see
  }

  // ---------------------------------------------------------------- the last beat: his letters gathered; the candles go up
  let letterAnim = null; const lM = new THREE.Matrix4(), lP = new THREE.Vector3(), lQ = new THREE.Quaternion(), lS = new THREE.Vector3(), lQ2 = new THREE.Quaternion(), lP2 = new THREE.Vector3(), lFrom = new THREE.Vector3();
  const lettersMesh = () => ctx.threads?.traveller?.letters || null;
  const stackAt = (k, L, o) => o.copy(L.userData.chest).add(lP2.set(Math.sin(k * 2.1) * 0.015, k * 0.0045, Math.cos(k * 1.7) * 0.015)); // a bundle a hand high
  function placeLetters(done) { // done: laid on his chest in a bundle; else as they lie
    const L = lettersMesh(); if (!L) return;
    const B = L.userData.base, yq = lQ2.setFromAxisAngle(up, L.userData.yaw);
    for (let k = 0; k < B.length; k++) { if (done) L.setMatrixAt(k, lM.compose(stackAt(k, L, lP), yq, ONE)); else L.setMatrixAt(k, B[k]); }
    L.instanceMatrix.needsUpdate = true; L.computeBoundingSphere(); lettersLaid = done ? L : null;
  }
  function startLetters() { const L = lettersMesh(); if (!L) return 0; letterAnim = { t: 0, n: L.userData.base.length }; ctx.audio?.cue('act-bell-letters', { x: body.x, y: H(body.x, body.z) + 0.5, z: body.z }); return 0.14 * letterAnim.n + 1.4; }
  function stepLetters(dt) {
    const L = lettersMesh(), A2 = letterAnim; A2.t += dt;
    const B = L.userData.base, yq = lQ2.setFromAxisAngle(up, L.userData.yaw);
    let doneAll = true;
    for (let k = 0; k < A2.n; k++) {
      const u = clamp((A2.t - k * 0.14) / 1.3, 0, 1); if (u < 1) doneAll = false;
      B[k].decompose(lFrom, lQ, lS); stackAt(k, L, tv);
      const e = ease(u);
      lP.lerpVectors(lFrom, tv, e); lP.y += Math.sin(u * Math.PI) * 1.1; // lifted, carried over the grass, laid down
      lQ.slerp(yq, e);
      L.setMatrixAt(k, lM.compose(lP, lQ, ONE));
    }
    L.instanceMatrix.needsUpdate = true;
    if (doneAll) { letterAnim = null; L.computeBoundingSphere(); gathered = true; startAscend(); }
  }
  // the ring lifts: one by one they rise past the Span and go out among the stars; one stays over his head
  const ascFrom = [];
  function startAscend() {
    ascFrom.length = 0;
    for (let k = 0; k < standing; k++) { const s2 = ringSlot(k); ascFrom.push({ x: s2.x, y: cy(s2.x, s2.z, standH(k)), z: s2.z }); }
    for (let k = 0; k < NCMAX; k++) cOn[k] = 0;
    st.asc = 0; ctx.audio?.cue('act-bell-ascend', { x: body.x, y: H(body.x, body.z) + 3, z: body.z });
  }
  function stepAscend(dt) {
    st.asc += dt; const T = st.asc; let live = 0;
    for (let k = 0; k < ascFrom.length; k++) {
      const f = ascFrom[k];
      if (k === 0) { const u = clamp(T / 4, 0, 1); cPos[0] = lerp(f.x, HEAD.x, ease(u)); cPos[1] = lerp(f.y, cy(HEAD.x, HEAD.z, 0.9), ease(u)); cPos[2] = lerp(f.z, HEAD.z, ease(u)); cOn[0] = 1; continue; }
      const age = T - 1.5 - k * 0.9;
      if (age < 0) { cPos[k * 3] = f.x; cPos[k * 3 + 1] = f.y; cPos[k * 3 + 2] = f.z; cOn[k] = 1; live++; continue; }
      const h = 0.6 * age * age + 1.2 * age; // slow to leave, then faster
      cPos[k * 3] = f.x + Math.sin(age * 0.7 + k) * 0.6; cPos[k * 3 + 1] = f.y + h; cPos[k * 3 + 2] = f.z + Math.cos(age * 0.5 + k) * 0.6;
      cOn[k] = 1 - smoothstep(60, 140, h); if (cOn[k] > 0) live++;
    }
    cGeo.attributes.position.needsUpdate = true; cGeo.attributes.aOn.needsUpdate = true; cBound();
    placePool(lerp(2 * (1.9 + 1.6), 2.4, clamp(T / 6, 0, 1)), lerp(1, 0.6, clamp(T / 6, 0, 1)));
    if (!live && T > 5) { st.asc = -1; drawStanding(); }
  }

  const ds = new THREE.Vector2();
  ctx.registerUpdate((dt, t) => {
    ctx.renderer.getDrawingBufferSize(ds);
    const sc = ds.y / (2 * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov) * 0.5));
    cMat.uniforms.uScale.value = sc; dMat.uniforms.uScale.value = sc;
    if (pool.visible) { const cp = ctx.camera.position, d = Math.hypot(cp.x - body.x, cp.y - H(body.x, body.z), cp.z - body.z); pool.material.opacity = 0.35 + 0.65 * smoothstep(8, 40, d); } // faint beside him, plain from the deck
    step(Math.min(dt, 0.1), t);
  }, { at: () => (st.active || st.asc >= 0 || letterAnim ? ctx.player.pos : BELL), near: 160, hz: 0 });

  // ---------------------------------------------------------------- the acts
  const at = { x: RING.x, y: RING.y, z: RING.z }; // the rope's ring on the post
  const AIM = { x: HEADX + 1.5, z: BZ }; // where a visitor ringing it looks: the ram's head and the bronze it strikes
  const STAND = { x: POST.x + 1.2, z: POST.z - 1.1 };
  function facing(P) {
    if (P.pos.z > POST.z + 3) return false; // under the vault past the post: not from there
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
    const tx = AIM.x - P.pos.x, tz = AIM.z - P.pos.z, tl = Math.hypot(tx, tz) || 1;
    return (fx * tx + fz * tz) / tl > 0.75 && P.pitch > -0.5 && P.pitch < 1.0;
  }
  let shown = 0;
  const handle = ctx.acts?.add({
    id: ID, at, reach: 3.2, rise: 3, face: { x: 0, z: -1 }, facing,
    words: 'Ring the bell', every: 'visit',
    show(n) {
      shown = n; standing = Math.min(MAXSTAND, n * NC); rub(n);
      stones.count = Math.min(NSTONE, n * 2); stones.instanceMatrix.needsUpdate = true;
      if (st.active) finishRing();
      st.asc = -1; letterAnim = null;
      if (!n) { gathered = false; placeLetters(false); }
      drawStanding();
    },
    do(n) { shown = n; return ring(n); },
  });
  // the last beat, at the traveller once the candles stand round him: his letters gathered from the grass and laid on
  // his chest; then the candles go up, but one
  const BODY_AT = { x: body.x, y: H(body.x, body.z) + 0.6, z: body.z };
  const letters = ctx.acts?.add({
    id: 'span-letters', at: BODY_AT, reach: 4.2, rise: 3, every: 'once',
    facing(P) { const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), tx = body.x - P.pos.x, tz = body.z - P.pos.z, tl = Math.hypot(tx, tz) || 1; return (fx * tx + fz * tz) / tl > 0.7 && P.pitch < 0.3; },
    when: () => !!lettersMesh() && standing > 0 && !gathered && !st.active && !letterAnim,
    words: 'Gather his letters',
    show(n) { gathered = n > 0; letterAnim = null; placeLetters(gathered); drawStanding(); },
    do() { return startLetters() + 14; },
  });
  if (!handle || ctx.acts?.off) drawStanding();

  // a walker who drops through the crack lands on the bell: its crown and its shoulders are something to stand on (high
  // over the heads of walkers below, so nobody on the ground meets them), and from there he walks off its flank
  ctx.addCollider?.({ x: BX, z: BZ, r: 1.5, y: LIP + TOP - 1.2, h: 1.75 });
  ctx.addCollider?.({ x: BX, z: BZ, r: 4.2, y: LIP + TOP * 0.62, h: TOP * 0.2 });

  ctx.bell = {
    site: BELL, lip: LIP, top: LIP + TOP, ramY: RAMY, headX: HEADX, at, body, homes, head: HEAD,
    get state() { return { active: st.active, t: st.t, rang: st.rang, arrived: st.arrived, waiting: st.waiting, going: st.goT >= 0, standing, gathered, ascending: st.asc >= 0, shown, ram: HEADX - ramG.position.x, sway: pivot.rotation.z, glow: uGlow.value.g, dust: dust.visible, stones: stones.count }; },
    candles: () => { const o = []; for (let k = 0; k < NCMAX; k++) if (cOn[k] > 0.01) o.push({ x: cPos[k * 3], y: cPos[k * 3 + 1], z: cPos[k * 3 + 2] }); return o; },
    // where a visitor stands to ring it: at the post, looking at the ram and the bell
    stand(back = 0) {
      const x = STAND.x, z = STAND.z - back, eye = H(x, z) + (ctx.player?.eye ?? 1.6), dx = AIM.x - x, dz = AIM.z - z;
      return { x, z, yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(LIP + 2.5 - eye, Math.hypot(dx, dz)) };
    },
    // where a visitor stands to gather his letters: two metres off, looking down at him
    standBody() { const x = body.x + 1.6, z = body.z - 2.2, eye = H(x, z) + (ctx.player?.eye ?? 1.6), dx = body.x - x, dz = body.z - z; return { x, z, yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(H(body.x, body.z) - eye, Math.hypot(dx, dz)) }; },
    post: POST, aim: AIM, strike: STRIKE, call: CALL,
    ff(sec) { for (let i = 0; i < sec * 10 && (st.active || st.asc >= 0 || letterAnim); i++) step(0.1, (st.t > 0 ? st.t : 0) + 0.1); }, // for the tests: run a ringing (or the last beat) on
    letters: lettersMesh,
  };
}

// merge non-indexed geometries with position, normal and colour
function mergeAll(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const g of list) {
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return m;
}
