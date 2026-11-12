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
const RAM = { len: 6.6, r: 0.38, gap: 0.22, back: 1.7 }; // the ram's length, its head's radius, its rest gap to the bronze, how far it is hauled
// the timeline of a ringing, in seconds from the press
const LUGS = [-5.4, -1.2]; // the ram's chain lugs, local z (the head's face at 0, the tail at -len)
const HAUL = 1.4, HOLD = 0.35, SWING = 0.5, STRIKE = HAUL + HOLD + SWING;
const CALL = STRIKE + 3.2, EVERY = 1.5, RISE = 3.5, SPEED = 2.3; // the candles: first rises at CALL, one each EVERY s, RISE s up out of the water, then SPEED m/s
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
  const RAMY = LIP + BOW, HEADX = BX + outerAt(BOW) + RAM.gap; // the ram's axis height and its head's face at rest (east of the bell)

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
    const BRONZE = new THREE.Color('#8e5c30'), VERD = new THREE.Color('#5f9e84'), VERD2 = new THREE.Color('#9cc8b0'), SOOT = new THREE.Color('#15100c');
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
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vIn; varying float vH; uniform vec3 uGlow;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uGlow * vIn * pow(1.0 - vH, 2.2) * (0.25 + diffuseColor.rgb * 2.2);');
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
  bellChains.name = 'bell-chains'; bellChains.castShadow = true; bellChains.frustumCulled = false;
  pivot.add(bellChains);

  // ---------------------------------------------------------------- the ram: trunk, iron, rags; hung east of the bell
  // Built along its local z with the head's face at 0 and the tail at -len; the group turns it so the head points west
  // at the bell's east sound-bow, broadside to a visitor coming down the track from the north.
  const ramG = new THREE.Group(); ramG.name = 'bell-ram'; ramG.rotation.y = -Math.PI / 2;
  scene.add(ramG);
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
    const trunk = along(new THREE.CylinderGeometry(RAM.r * 0.95, RAM.r * 0.8, L - 0.4, seg, 6), 0);
    { const p = trunk.attributes.position; for (let i = 0; i < p.count; i++) { const d = 1 + 0.06 * N2(p.getZ(i) * 0.8, Math.atan2(p.getX(i), p.getY(i)) * 2); p.setX(i, p.getX(i) * d + 0.05 * Math.sin(p.getZ(i) * 0.6)); p.setY(i, p.getY(i) * d); } }
    trunk.translate(0, 0, -L / 2 - 0.2); paint(trunk, '#5a4430', 0.25, 1.2);
    // the iron shoe on the head: a sleeve and a domed face, worn bright where it meets the bronze
    paint(along(new THREE.CylinderGeometry(RAM.r * 1.1, RAM.r * 1.04, 0.75, seg), -0.45), '#2a221c', 0.15);
    { const d = new THREE.SphereGeometry(RAM.r * 1.08, seg, 6, 0, Math.PI * 2, 0, Math.PI / 2); d.scale(1, 0.4, 1); d.rotateX(Math.PI / 2); d.translate(0, 0, -0.1); paint(d, '#6a5a48', 0.2); }
    // iron bands, and the two lugs its chains hang from
    for (const z of [-L + 0.35, -L + 2.3, -1.4]) paint(along(new THREE.CylinderGeometry(RAM.r * 1.0, RAM.r * 1.0, 0.12, seg), z), '#241d18', 0.1);
    for (const z of LUGS) { const g = new THREE.BoxGeometry(0.14, 0.32, 0.18); g.translate(0, RAM.r + 0.1, z); paint(g, '#241d18', 0.1); }
    // saffron and madder rags tied round it, hanging (the Late folk's colours)
    for (let i = 0; i < 9; i++) {
      const z = -L + 0.6 + i * 0.62 + rng() * 0.2, a = (rng() - 0.5) * 1.4, len = 0.4 + rng() * 0.5;
      const g = new THREE.BoxGeometry(0.012, len, 0.1 + rng() * 0.06); g.translate(0, -len / 2, 0); g.rotateX(a * 0.2); g.translate(Math.sin(a) * RAM.r * 0.95, -Math.cos(a) * RAM.r * 0.7, z);
      paint(g, i % 3 === 2 ? '#8e2e24' : '#e0a73a', 0.15, 6);
    }
    const m = new THREE.Mesh(mergeAll(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.1 }));
    m.castShadow = true; m.receiveShadow = true; ramG.add(m);
  }
  // its chains: from iron staples in the vault straight over the lugs, relaid while it moves
  const A = bayArch(-70, -22);
  const lugX = (s) => LUGS.map((lz) => HEADX + s - lz); // the lugs' world x with the ram s metres back (east)
  const RAMTOP = lugX(0).map((x) => new THREE.Vector3(x, intrados(A, x) - 0.2, BZ));
  const ramLinkN = Math.ceil(RAMTOP.reduce((t, v) => t + (v.y - RAMY) * 1.02, 0) / LINK) + 8;
  const ramChains = new THREE.InstancedMesh(linkGeo, chainMat, ramLinkN);
  ramChains.name = 'bell-ram-chains'; ramChains.castShadow = true; ramChains.frustumCulled = false; scene.add(ramChains);
  // the hauling rope: from the tail down to an iron ring on a squat stone by the track, where the visitor stands
  const POST = { x: HEADX + RAM.len + 0.5, z: BZ - 9 }; POST.y = H(POST.x, POST.z);
  const RING = new THREE.Vector3(POST.x, POST.y + 0.95, POST.z);
  const ropeMat = new THREE.MeshStandardMaterial({ color: '#8f7a55', roughness: 0.95 });
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 5).translate(0, 0.5, 0), ropeMat);
  rope.castShadow = true; rope.name = 'bell-rope'; scene.add(rope);
  {
    const parts = [];
    const stone = new THREE.CylinderGeometry(0.32, 0.42, 1.0, 7, 2); { const p = stone.attributes.position; for (let i = 0; i < p.count; i++) { const d = 1 + 0.12 * N2(p.getX(i) * 3, p.getY(i) * 3 + p.getZ(i) * 2); p.setX(i, p.getX(i) * d); p.setZ(i, p.getZ(i) * d); } }
    stone.translate(POST.x, POST.y + 0.42, POST.z); parts.push(stone.toNonIndexed());
    const ringG = new THREE.TorusGeometry(0.13, 0.028, 5, 10); ringG.rotateY(0.6); ringG.translate(RING.x, RING.y - 0.08, RING.z); parts.push(ringG.toNonIndexed());
    const cols = (g, c) => { const C = new THREE.Color(c), a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = C.r; a[i + 1] = C.g; a[i + 2] = C.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); };
    cols(parts[0], '#7c7466'); cols(parts[1], '#2a221c');
    const post = new THREE.Mesh(mergeAll(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
    post.castShadow = true; post.receiveShadow = true; post.name = 'bell-post'; scene.add(post);
    ctx.addCollider?.({ x: POST.x, z: POST.z, r: 0.4, y: POST.y - 0.2, h: 1.1 });
  }
  const lugP = new THREE.Vector3(), tail = new THREE.Vector3();
  function placeRam(s) { // s: metres the ram stands back (east, +x) of its rest
    const lift = (s * s) / (2 * (RAMTOP[0].y - RAMY)); // a pendulum's rise
    ramG.position.set(HEADX + s, RAMY + lift, BZ);
    let k = 0; const xs = lugX(s);
    for (let i = 0; i < 2; i++) { lugP.set(xs[i], RAMY + lift + RAM.r + 0.22, BZ); k = layChain(ramChains, k, lugP, RAMTOP[i]); }
    ramChains.count = k; ramChains.instanceMatrix.needsUpdate = true;
    tail.set(HEADX + s + RAM.len - 0.3, RAMY + lift, BZ);
    dir.subVectors(tail, RING); const l = dir.length();
    rope.position.copy(RING); rope.quaternion.setFromUnitVectors(up, dir.multiplyScalar(1 / l)); rope.scale.set(1, l, 1);
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
  const ND = low ? 140 : 240;
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
        vA = aA; vS = aS; gl_PointSize = aA > 0.0 ? clamp(aS * uScale / max(-mvPosition.z, 0.1), 1.5, 90.0) : 0.0;
        #include <fog_vertex>
      }`,
    fragmentShader: `varying float vA; varying float vS;
      ${fogPars}
      void main() { ${fogAtten}
        float r = length(gl_PointCoord - 0.5) * 2.0; float a = (vS > 0.2 ? pow(max(0.0, 1.0 - r), 2.5) * 0.7 : smoothstep(1.0, 0.4, r)) * vA;
        gl_FragColor = vec4(mix(vec3(0.5, 0.45, 0.38), vec3(0.3, 0.33, 0.29), step(0.2, vS)) * fogAtten, a); }`,
    fog: true, transparent: true, depthWrite: false,
  });
  const dust = new THREE.Points(dGeo, dMat); dust.frustumCulled = false; dust.visible = false; dust.name = 'bell-dust'; scene.add(dust);
  function startDust(t) {
    const r3 = ctx.makeRng(10042 + Math.floor(t * 10));
    for (let i = 0; i < ND; i++) {
      const u = i / ND, k = u < 0.25 ? 0 : u < 0.7 ? 1 : 2; dK[i] = k;
      if (k === 0) { // the strike: verdigris bursting off the bronze, back toward the ram and out
        dPos[i * 3] = HEADX - RAM.gap + 0.1; dPos[i * 3 + 1] = RAMY + (r3() - 0.5) * 0.5; dPos[i * 3 + 2] = BZ + (r3() - 0.5) * 0.5;
        const sp = 0.8 + r3() * 2.2, a = (r3() - 0.5) * 2.6, e = (r3() - 0.3) * 1.4;
        dVel[i * 3] = Math.cos(a) * sp; dVel[i * 3 + 1] = e * sp * 0.6; dVel[i * 3 + 2] = Math.sin(a) * sp; dT0[i] = t + r3() * 0.08; dS[i] = r3() < 0.5 ? 0.3 + r3() * 0.35 : 0.06;
      } else if (k === 1) { // the shoulder: dust lying on the bell for an age, shaken off all round it
        const a = r3() * Math.PI * 2, y = TOP * (0.55 + 0.42 * r3()), rr = outerAt(y) + 0.15;
        dPos[i * 3] = BX + Math.sin(a) * rr; dPos[i * 3 + 1] = LIP + y; dPos[i * 3 + 2] = BZ + Math.cos(a) * rr;
        dVel[i * 3] = Math.sin(a) * (0.2 + r3() * 0.5); dVel[i * 3 + 1] = -0.2 - r3() * 0.6; dVel[i * 3 + 2] = Math.cos(a) * (0.2 + r3() * 0.5); dT0[i] = t + r3() * 0.5; dS[i] = r3() < 0.6 ? 0.6 + r3() * 0.7 : 0.07;
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
      if (y < H(dPos[i * 3], dPos[i * 3 + 2]) + 0.05 || age > 9) { dA[i] = 0; continue; }
      live++;
      const puff = dS[i] > 0.2, drag = Math.exp(-dt * (puff ? 1.6 : 0.4));
      dVel[i * 3] *= drag; dVel[i * 3 + 2] *= drag;
      dVel[i * 3 + 1] = puff ? dVel[i * 3 + 1] * drag - 0.5 * dt : Math.max(-9, dVel[i * 3 + 1] - 9.8 * dt * 0.5); // puffs hang and sink; grit falls
      dPos[i * 3] += dVel[i * 3] * dt; dPos[i * 3 + 1] += dVel[i * 3 + 1] * dt; dPos[i * 3 + 2] += dVel[i * 3 + 2] * dt;
      if (puff) dS[i] += dt * 0.25; // a puff spreads as it hangs
      dA[i] = (puff ? 0.32 : 0.8) * smoothstep(0, 0.15, age) * (1 - smoothstep(puff ? 3 : 6, puff ? 7 : 9, age));
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
  // the way they come: along the Span's north side, past the rope, under the bell, out to him
  const WAY = [[24, 180], [8, 187], [-10, 193.5], [-27, 198.2], [-37.5, 202.6], [-42.6, 208], [-45, 215], [-48.6, 223.5], [-54.5, 231.5]];
  const ringSlot = (k) => { const ring = Math.floor(k / 9), a = (k % 9) / 9 * Math.PI * 2 + ring * 0.35, r = 2.4 + ring * 1.15; return { x: body.x + Math.cos(a) * r, z: body.z + Math.sin(a) * r }; };
  const NCMAX = MAXSTAND + NC;
  const cPos = new Float32Array(NCMAX * 3), cPh = new Float32Array(NCMAX), cOn = new Float32Array(NCMAX); // aOn: 0 unlit, 1 a candle, over 1 kindling (bigger, brighter)
  for (let i = 0; i < NCMAX; i++) cPh[i] = rng() * 6.28;
  const cGeo = new THREE.BufferGeometry();
  cGeo.setAttribute('position', new THREE.BufferAttribute(cPos, 3).setUsage(THREE.DynamicDrawUsage));
  cGeo.setAttribute('aPh', new THREE.BufferAttribute(cPh, 1));
  cGeo.setAttribute('aOn', new THREE.BufferAttribute(cOn, 1).setUsage(THREE.DynamicDrawUsage));
  const cMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uScale: { value: 400 }, uWisp: { value: new THREE.Color(PALETTE.wisp) } }]),
    vertexShader: `uniform float uTime, uScale; attribute float aPh, aOn; varying float vI;
      #include <fog_pars_vertex>
      void main() { vec3 transformed = position; vec4 mvPosition = viewMatrix * vec4(transformed, 1.0); gl_Position = projectionMatrix * mvPosition;
        float pulse = 0.78 + 0.22 * sin(uTime * 1.7 + aPh * 3.0) * sin(uTime * 0.61 + aPh * 7.0);
        vI = pulse * min(aOn, 1.6); gl_PointSize = aOn > 0.001 ? clamp(1.6 * aOn * uScale / max(-mvPosition.z, 0.1), 10.0, 260.0) : 0.0;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uWisp; varying float vI;
      ${fogPars}
      void main() { ${fogAtten}
        vec2 c = (gl_PointCoord - 0.5) * 2.0; c.y += 0.08;
        vec2 f = vec2(c.x * 2.4, c.y < 0.0 ? c.y * 1.1 : c.y * 2.6); // a flame: taller above its heart than below
        float rf = dot(f, f), r2 = dot(c, c);
        float a = exp(-rf * 12.0) * 1.8 + exp(-r2 * 9.0) * 0.5 + exp(-r2 * 3.0) * 0.2;
        vec3 col = mix(uWisp, vec3(0.94, 1.0, 0.96), exp(-rf * 14.0)) * a;
        gl_FragColor = vec4(col * vI * fogAtten, 1.0); }`,
    fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const candles = new THREE.Points(cGeo, cMat); candles.frustumCulled = false; candles.renderOrder = 20; candles.name = 'bell-candles'; scene.add(candles);
  // the light they make on the ground round him: a soft pool, as wide as the ring, there while they are
  const pool = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const g2 = cv.getContext('2d'), gr = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
    const geo = new THREE.PlaneGeometry(1, 1, 8, 8); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), color: new THREE.Color(PALETTE.wisp).multiplyScalar(0.5), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.name = 'bell-pool'; m.renderOrder = 2; m.visible = false; scene.add(m);
    return m;
  })();
  function placePool(n) {
    pool.visible = n > 0; if (!n) return;
    const R = 2 * (2.4 + Math.floor((n - 1) / 9) * 1.15 + 2.2);
    const p = pool.geometry.attributes.position, base = pool.userData.base || (pool.userData.base = Float32Array.from(p.array));
    for (let i = 0; i < p.count; i++) { const x = body.x + base[i * 3] * R, z = body.z + base[i * 3 + 2] * R; p.setXYZ(i, x, H(x, z) + 0.06, z); }
    p.needsUpdate = true; pool.geometry.computeBoundingSphere();
  }
  // the polyline each candle walks: its home, up, the way, its slot in the ring
  const paths = [];
  function wayFor(i, slot) {
    const h = homes[i], P = [[h.x, h.z], ...WAY, [slot.x, slot.z]], L = [0];
    for (let k = 1; k < P.length; k++) L.push(L[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]));
    return { P, L, len: L[L.length - 1] };
  }
  const cy = (x, z, k) => Math.max(H(x, z), fen.y) + k; // a candle's height: over the ground, or the water
  let standing = 0; // candles in the ring
  const standH = (k) => 1.25 + 0.2 * Math.sin(k * 2.3);
  function drawStanding() {
    for (let k = 0; k < NCMAX; k++) cOn[k] = 0;
    for (let k = 0; k < standing; k++) { const s = ringSlot(k); cPos[k * 3] = s.x; cPos[k * 3 + 1] = cy(s.x, s.z, standH(k)); cPos[k * 3 + 2] = s.z; cOn[k] = 1; }
    cGeo.attributes.position.needsUpdate = true; cGeo.attributes.aOn.needsUpdate = true;
    candles.visible = standing > 0; placePool(standing);
  }

  // ---------------------------------------------------------------- the strike plate: the bronze rubbed bright where the ram lands
  function rub(n) {
    const p = bellGeo.attributes.position, aIn = bellGeo.attributes.aIn, c = bellGeo.attributes.color, base = bellGeo.userData.base, GOLD = new THREE.Color('#c9a466'), o = new THREE.Color();
    const k = n > 0 ? 1 - Math.pow(0.7, n) : 0;
    for (let i = 0; i < p.count; i++) {
      o.setRGB(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]);
      if (k > 0) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x); // 0 toward the ram (east)
        const w = (1 - smoothstep(0.07, 0.17, Math.abs(a))) * (1 - smoothstep(0.25, 0.6, Math.abs(y - BOW))) * (x > 0 ? 1 : 0) * (1 - aIn.getX(i));
        o.lerp(GOLD, w * (0.35 + 0.55 * k));
      }
      c.setXYZ(i, o.r, o.g, o.b);
    }
    c.needsUpdate = true;
  }

  // ---------------------------------------------------------------- the ringing
  const st = { t: -1, active: false, n: 0, from: 0, rang: false, called: 0, arrived: 0, hummed: false, settled: false };
  const out = new THREE.Vector3();
  const wayPaths = [], there = new Uint8Array(NC);
  function ring(n) {
    there.fill(0);
    st.t = 0; st.active = true; st.n = n; st.rang = false; st.called = 0; st.arrived = 0; st.hummed = false; st.settled = false;
    st.from = standing;
    // the nine that come take the next slots; past three rings they take the outer ring's places again
    wayPaths.length = 0;
    for (let i = 0; i < NC; i++) { const k = Math.min(MAXSTAND - NC + i, st.from + i), w = wayFor(i, ringSlot(k)); w.k = k; wayPaths.push(w); }
    ctx.audio?.cue('act-bell-haul', { x: RING.x, y: RING.y, z: RING.z });
    const last = wayPaths[NC - 1];
    return CALL + (NC - 1) * EVERY + RISE + last.len / SPEED + 1;
  }
  const ease = (u) => u * u * (3 - 2 * u);
  function ramAt(t) { // metres back from rest
    if (t < HAUL) return RAM.back * ease(t / HAUL);
    if (t < HAUL + HOLD) return RAM.back;
    if (t < STRIKE) { const u = (t - HAUL - HOLD) / SWING; return RAM.back * Math.cos(u * Math.PI / 2); } // falls, faster as it goes
    const u = t - STRIKE; return 0.55 * Math.exp(-u / 1.3) * Math.sin(u * Math.PI * 2 / 2.4); // the rebound, dying
  }
  function step(dt, t) {
    if (!st.active) { cMat.uniforms.uTime.value = t; return; }
    st.t += dt; const T = st.t;
    // the ram
    placeRam(T < STRIKE + 8 ? ramAt(T) : 0);
    // the stroke
    if (!st.rang && T >= STRIKE) {
      st.rang = true;
      ctx.audio?.cue('act-bell', { x: HEADX - 0.4, y: LIP + 2, z: BZ }, { n: st.n });
      startDust(T); rub(st.n);
      stones.count = Math.min(NSTONE, st.n * 2); stones.instanceMatrix.needsUpdate = true;
    }
    // the bell: a shiver as the stroke goes through it, then a slow sway on forty metres of chain
    if (T >= STRIKE) {
      const u = T - STRIKE;
      // struck on its east side, it swings west (half a metre at the lip) and back, and less each time, never back into the ram
      const sw = Math.sin(u * Math.PI / 12.6);
      pivot.rotation.z = -0.014 * Math.exp(-u / 14) * sw * sw - 0.0015 * Math.exp(-u / 2) * Math.sin(u * Math.PI * 2 / 1.4);
      hang.rotation.x = 0.006 * Math.exp(-u / 0.7) * Math.sin(u * Math.PI * 2 * 6.5);
      hang.position.x = 0.03 * Math.exp(-u / 0.6) * Math.sin(u * Math.PI * 2 * 8.3 + 1);
    }
    if (dust.visible) stepDust(dt, T);
    // the candles
    cMat.uniforms.uTime.value = t;
    let glow = 0;
    for (let i = 0; i < NC && !st.settled; i++) {
      const idx = MAXSTAND + i; // a moving candle draws in its own entry past the standing ones
      const t0 = CALL + i * EVERY;
      if (T < t0) { cOn[idx] = 0; continue; }
      const w = wayPaths[i], h = homes[i];
      let x, y, z, on;
      if (T < t0 + RISE) { // up out of the water, kindling
        const u = (T - t0) / RISE; x = h.x; z = h.z; y = fen.y - 0.3 + ease(u) * 1.7; on = smoothstep(0, 0.12, u) * (1 + 3 * Math.exp(-u * 4)); // a flare as it kindles, then a candle
        if (i === 0 && !st.called) { st.called = 1; ctx.audio?.cue('act-bell-candles', { x: h.x, y: fen.y + 1.5, z: h.z }); }
      } else {
        const d = Math.min(w.len, (T - t0 - RISE) * SPEED);
        let s = 1; while (s < w.L.length - 1 && w.L[s] < d) s++;
        const f = clamp((d - w.L[s - 1]) / (w.L[s] - w.L[s - 1] || 1), 0, 1);
        x = lerp(w.P[s - 1][0], w.P[s][0], f); z = lerp(w.P[s - 1][1], w.P[s][1], f);
        const bob = 0.18 * Math.sin(T * 1.9 + i * 1.7);
        const land = smoothstep(w.len - 4, w.len, d); // settling to its height in the ring
        y = cy(x, z, lerp(1.35 + bob + 0.25 * (1 - smoothstep(0, 8, d)), standH(w.k), land)); on = 1;
        if (d >= w.len && !there[i]) { there[i] = 1; st.arrived++; }
      }
      cPos[idx * 3] = x; cPos[idx * 3 + 1] = y; cPos[idx * 3 + 2] = z; cOn[idx] = on;
      // under the bell: its inside lights, and it hums back
      const dx = x - BX, dz = z - BZ, dd = Math.sqrt(dx * dx + dz * dz);
      glow += on * (1 - smoothstep(1.5, 9, dd));
      if (dd < 4 && !st.hummed) { st.hummed = true; ctx.audio?.cue('act-bell-hum', { x: BX, y: LIP + 3, z: BZ }); }
    }
    if (!st.settled) uGlow.value.copy(cMat.uniforms.uWisp.value).multiplyScalar(0.32 * Math.min(1.2, glow));
    candles.visible = true;
    cGeo.attributes.position.needsUpdate = true; cGeo.attributes.aOn.needsUpdate = true;
    // all nine at their places: they join the ring (drawn where they stand already)
    if (st.arrived >= NC && !st.settled) {
      st.settled = true; standing = Math.min(MAXSTAND, st.from + NC); drawStanding(); uGlow.value.setRGB(0, 0, 0);
      ctx.audio?.cue('act-bell-rest', { x: body.x, y: H(body.x, body.z) + 1.3, z: body.z });
    }
    if (st.settled && T > STRIKE + 40 && !dust.visible) { // the sway has died to nothing a visitor can see: stop
      st.active = false; pivot.rotation.z = 0; hang.rotation.x = 0; hang.position.x = 0; placeRam(0); uGlow.value.setRGB(0, 0, 0);
    }
  }
  const ds = new THREE.Vector2();
  ctx.registerUpdate((dt, t) => {
    ctx.renderer.getDrawingBufferSize(ds);
    const sc = ds.y / (2 * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov) * 0.5));
    cMat.uniforms.uScale.value = sc; dMat.uniforms.uScale.value = sc;
    step(Math.min(dt, 0.1), t);
  }, { at: () => (st.active ? ctx.player.pos : BELL), near: 160, hz: 0 });

  // ---------------------------------------------------------------- the act
  const at = { x: RING.x, y: RING.y, z: RING.z }; // the rope's ring on the post
  const AIM = { x: HEADX + 0.8, z: BZ + 0.5 }; // where a visitor ringing it looks: the ram's head against the bronze
  function facing(P) {
    if (P.pos.z > POST.z + 1.5) return false; // past the post, under the vault: not from there
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
      if (st.active) { st.active = false; pivot.rotation.z = 0; hang.rotation.x = 0; hang.position.x = 0; placeRam(0); dust.visible = false; uGlow.value.setRGB(0, 0, 0); }
      drawStanding();
    },
    do(n) { shown = n; return ring(n); },
  });
  if (!handle || ctx.acts?.off) drawStanding();

  ctx.bell = {
    site: BELL, lip: LIP, top: LIP + TOP, ramY: RAMY, headX: HEADX, at, body, homes, way: WAY,
    get state() { return { active: st.active, t: st.t, rang: st.rang, arrived: st.arrived, standing, shown, ram: ramG.position.x - HEADX, sway: pivot.rotation.z, glow: uGlow.value.g, dust: dust.visible, stones: stones.count }; },
    candles: () => { const o = []; for (let k = 0; k < NCMAX; k++) if (cOn[k] > 0.01) o.push({ x: cPos[k * 3], y: cPos[k * 3 + 1], z: cPos[k * 3 + 2] }); return o; },
    // where a visitor stands to ring it: behind the rope, looking at the bell's mouth
    stand(back = 0) {
      const x = POST.x - 1.5, z = POST.z - 1.4 - back, eye = H(x, z) + (ctx.player?.eye ?? 1.6), dx = AIM.x - x, dz = AIM.z - z;
      return { x, z, yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(LIP + 2.2 - eye, Math.hypot(dx, dz)) };
    },
    post: POST, aim: AIM,
    strike: STRIKE, call: CALL,
    ff(sec) { for (let i = 0; i < sec * 10 && st.active; i++) step(0.1, st.t + 0.1); }, // for the tests: run a ringing on

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
