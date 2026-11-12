// The mother crystal's thread (v10-A1): what a hand on the crystal sends out of the Lattice. Light running in the ground
// itself, 250 m from the crystal's foot over the moor and through the wood's edge to the head of the Hypogeum's stair, down
// its treads and under the bronze door: a seam of the Lattice's biomesh that opens as the light passes (uneven, branching
// into short twigs, guttering as it runs), and small crystals pushing up out of the turf along it as the head goes by.
// Quieter after: a dim seam with slow pulses running toward the tomb, and the line of small crystals left standing, so
// a returning visitor sees from the Lattice's edge which way the light went. From the second hand on, an ember of the
// sun's colour runs back along it from the door to the crystal: the Reckoner's answer (stories/the-reckoner.md).
//
// buildThread(ctx, M, mother, ground, H) → { len, group, set(head, kept, back, time), end }. Heights from the drawn
// terrain mesh (meshGround: the mesh's triangles, which sit above heightAt() in hollows) and heightAt, whichever is
// higher, over water at its surface. Two draws: the seam (one mesh) and the crystals (one InstancedMesh).
import * as THREE from 'three';
import { hyp } from '../noise.js';
import { meshGround } from '../v4/regions/skin.js';

export function buildThread(ctx, M, mother, ground, H) {
  const rng = ctx.makeRng(1013), nz = ctx.noise;
  const drawn = ctx.terrain?.mesh ? meshGround(ctx.terrain) : null;
  const yAt0 = (x, z) => Math.max(ground.heightAt(x, z), drawn ? drawn(x, z) : -1e9) + Math.max(0, ground.waterDepth(x, z));
  const end = H.stairTop, door = H.door, Yf = H.floor;
  const yAt = (x, z) => Math.max(yAt0(x, z), hyp(x - end.x, z - end.z) < 8 ? end.y : -1e9);
  const dx0 = end.x - 1.5 - M.x, dz0 = end.z - M.z, L0 = hyp(dx0, dz0);
  const ux = dx0 / L0, uz = dz0 / L0, px = -uz, pz = ux;
  const s0 = mother.foot + 1.2, pts = [];
  // over the land: from the foot to a step short of the stair's head, wandering like the field's own filaments
  for (let s = s0; s <= L0; s += 0.7) {
    const taper = Math.min(1, (s - s0) / 20, (L0 - s) / 15);
    const off = (nz.noise2(s * 0.018, 3.7) * 7 + nz.noise2(s * 0.09, 9.1) * 1.2) * Math.max(0, taper);
    const x = M.x + ux * s + px * off, z = M.z + uz * s + pz * off;
    // round the tomb's mouth the terrain is cut away under the ruins' own ground (at the stair head's level)
    const dm = hyp(x - end.x, z - end.z), mouth = 1 - Math.min(1, Math.max(0, (dm - 6) / 4));
    pts.push({ x, z, y: Math.max(yAt(x, z), mouth > 0 ? end.y : -1e9) + 0.05 });
  }
  // down the stair's middle, tread by tread, to the threshold and under the door
  const xa = end.x - 1.5, xb = door.x - 0.02, ya = pts[pts.length - 1].y;
  const D = H.treadD ?? 0.32, R = H.treadRise ?? 0.3;
  for (let k = 1; k <= 40; k++) {
    const x = xa + (xb - xa) * (k / 40);
    const top = end.y + 0.03, bot = Yf + 0.03;
    const y = x < end.x ? ya + (top - ya) * Math.max(0, (x - xa) / 1.5) : Math.max(bot, top - Math.floor((x - end.x) / Math.max(0.01, D) + 1) * R);
    pts.push({ x, z: door.z, y });
  }

  // ---- the seam: a ribbon of uneven width with twigs off it, every vertex carrying how far along the light has to run
  const P = [], A = [], E = [];
  const quad = (a, b, wa, wb, la, lb) => {
    const dx = b.x - a.x, dz = b.z - a.z, l = hyp(dx, dz) || 1, nx = -dz / l, nzz = dx / l;
    P.push(a.x + nx * wa, a.y, a.z + nzz * wa, a.x - nx * wa, a.y, a.z - nzz * wa, b.x - nx * wb, b.y, b.z - nzz * wb,
      a.x + nx * wa, a.y, a.z + nzz * wa, b.x - nx * wb, b.y, b.z - nzz * wb, b.x + nx * wb, b.y, b.z + nzz * wb);
    A.push(la, la, lb, la, lb, lb); E.push(1, -1, -1, 1, -1, 1);
  };
  const width = (s) => 0.05 + 0.13 * Math.pow(0.5 + 0.5 * nz.noise2(s * 0.21, 1.3), 2);
  const along = [0];
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; along.push(along[i] + Math.sqrt((b.x - a.x) ** 2 + (b.z - a.z) ** 2 + (b.y - a.y) ** 2)); }
  const len = along[along.length - 1];
  for (let i = 0; i < pts.length - 1; i++) quad(pts[i], pts[i + 1], width(along[i]), width(along[i + 1]), along[i], along[i + 1]);
  const nLand = pts.length - 41;
  for (let i = 8; i < nLand - 4;) {
    // a twig: off to one side at a slant, wandering, thinning to nothing
    const a = pts[i], b = pts[i + 1], dir = Math.atan2(b.z - a.z, b.x - a.x) + (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.6);
    let x = a.x, z = a.z, y = a.y, ang = dir, la = along[i];
    const tl = 0.8 + rng() * 2.4, steps = Math.ceil(tl / 0.35);
    for (let k = 0; k < steps; k++) {
      ang += (rng() - 0.5) * 0.5;
      const x2 = x + Math.cos(ang) * 0.35, z2 = z + Math.sin(ang) * 0.35, y2 = yAt(x2, z2) + 0.05;
      const w0 = 0.03 * (1 - k / steps), w1 = 0.03 * (1 - (k + 1) / steps);
      quad({ x, y, z }, { x: x2, y: y2, z: z2 }, w0 + 0.004, w1 + 0.002, la, la + 0.35 * 1.6);
      x = x2; z = z2; y = y2; la += 0.35 * 1.6; // the light spreads into a twig a little slower than it runs
    }
    i += 6 + Math.floor(rng() * 8);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('aAlong', new THREE.Float32BufferAttribute(A, 1));
  g.setAttribute('aEdge', new THREE.Float32BufferAttribute(E, 1));
  g.computeBoundingSphere();
  // x: the head (m along; -1 none); y: kept (0..1); z: the ember running back (m along; -1 none); w: time
  const uTh = { value: new THREE.Vector4(-1, 0, -1, 0) };
  const COMMON = `
    float fpH1(float x) { return fract(sin(x * 12.9898) * 43758.5453); }
    float fpN1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(fpH1(i), fpH1(i + 1.0), f); }
    // the light at a point of the thread a metres along: the running head, the lit seam behind it, the kept glow, the
    // ember coming back; rgb out
    vec3 fpThread(float a, vec4 th, out float lit) {
      vec3 blue = vec3(0.30, 0.78, 1.0), ember = vec3(1.0, 0.42, 0.12);
      float uneven = 0.45 + 0.55 * fpN1(a * 0.35) * (0.6 + 0.4 * fpN1(a * 1.7 + 4.0));
      float gutter = 0.7 + 0.3 * sin(th.w * 6.0 + a * 0.4) * sin(th.w * 2.3 - a * 0.13);
      float ahead = th.x - a;
      float head = th.x < 0.0 ? 0.0 : exp(-abs(ahead) / 2.5) * step(-1.5, ahead);
      float run = th.x < 0.0 ? 0.0 : step(0.0, ahead) * (0.3 + 0.7 * exp(-ahead / 25.0)) * uneven * gutter;
      float slow = pow(0.5 + 0.5 * sin(a * 0.06 - th.w * 1.1), 8.0);
      float kept = th.y * (0.3 + 0.6 * slow) * uneven;
      float back = th.z < 0.0 ? 0.0 : exp(-abs(th.z - a) / 4.0);
      lit = clamp(max(run, kept) + head + back, 0.0, 1.0);
      return blue * (max(run * 2.0, kept) + head * 3.0) + ember * back * 3.0;
    }`;
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, toneMapped: false, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTh = uTh;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aAlong; attribute float aEdge; varying float vAlong; varying float vEdge;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlong = aAlong; vEdge = aEdge;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec4 uTh; varying float vAlong; varying float vEdge;' + COMMON)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float lit; vec3 c = fpThread(vAlong, uTh, lit);
          float edge = 1.0 - vEdge * vEdge;
          diffuseColor.rgb = c;
          diffuseColor.a = edge * edge * lit;
        }`);
  };
  m.customProgramCacheKey = () => 'fp-act-thread-v2';
  const seam = new THREE.Mesh(g, m);
  seam.name = 'act-crystal-thread'; seam.renderOrder = 2;

  // ---- the crystals: one every 2-3 m along the land, either side, pushed up out of the turf as the head passes
  const sites = [];
  for (let i = 4, k = 0; i < nLand - 2; k++) {
    const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dz = b.z - a.z, l = hyp(dx, dz) || 1;
    const side = k % 2 ? 1 : -1, off = side * (0.15 + rng() * 0.5);
    const x = a.x - dz / l * off, z = a.z + dx / l * off;
    sites.push({ x, z, y: yAt(x, z) - 0.06, a: along[i], h: 0.4 + Math.pow(rng(), 1.4) * 1.1, r: 0.06 + rng() * 0.07, tx: (rng() - 0.5) * 0.5, tz: (rng() - 0.5) * 0.5, rot: rng() * 6.28 });
    i += 2 + Math.floor(rng() * 2);
  }
  const cg = new THREE.ConeGeometry(1, 1, 6, 1); cg.translate(0, 0.5, 0);
  const aA = new Float32Array(sites.length);
  const cm = new THREE.MeshStandardMaterial({ color: new THREE.Color('#3a7898'), roughness: 0.12, metalness: 0.2, flatShading: true, emissive: new THREE.Color('#000000') });
  cm.onBeforeCompile = (sh) => {
    sh.uniforms.uTh = uTh;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aA; uniform vec4 uTh; varying float vA; varying float vY;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          // grow out of the turf over a second after the head passes; kept: all grown
          float grown = max(uTh.y, uTh.x < 0.0 ? 0.0 : smoothstep(aA - 1.0, aA + 25.0, uTh.x));
          transformed.y *= grown; transformed.xz *= 0.3 + 0.7 * grown;
          vA = aA; vY = position.y;
        }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec4 uTh; varying float vA; varying float vY;' + COMMON)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { float lit; vec3 c = fpThread(vA, uTh, lit); totalEmissiveRadiance += c * (0.35 + 0.9 * vY) * 1.6 + vec3(0.1, 0.28, 0.4) * uTh.y * (0.4 + 0.6 * vY); }`);
  };
  cm.customProgramCacheKey = () => 'fp-act-thread-crystals';
  const cr = new THREE.InstancedMesh(cg, cm, sites.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), dv = new THREE.Vector3(), yq = new THREE.Quaternion();
  sites.forEach((s, i) => {
    q.setFromUnitVectors(up, dv.set(s.tx, 1, s.tz).normalize()); yq.setFromAxisAngle(up, s.rot); q.multiply(yq);
    m4.compose(new THREE.Vector3(s.x, s.y, s.z), q, new THREE.Vector3(s.r, s.h, s.r)); cr.setMatrixAt(i, m4); aA[i] = s.a;
  });
  cg.setAttribute('aA', new THREE.InstancedBufferAttribute(aA, 1));
  cr.computeBoundingSphere(); cr.receiveShadow = true; cr.castShadow = false; cr.name = 'act-crystal-thread-crystals';

  const group = new THREE.Group(); group.name = 'act-crystal-thread-group';
  group.add(seam, cr); group.visible = false;
  ctx.scene.add(group);
  const v = uTh.value;
  return {
    len, group, end: { x: xb, y: Yf, z: door.z }, crystals: sites.length, uTh,
    set(head, kept, back, time) { v.set(head, kept, back, time); },
    // world positions along it, for the renders and tests: the point s metres along the land
    at(s) { let i = 0; while (i < along.length - 1 && along[i + 1] < s) i++; return pts[i]; },
  };
}
