// DH The Surveyor's Pegs [Proposed] (plans/wilderness-v5.md): "a line of wooden pegs, each with a faded ribbon, runs dead straight
// from the north wall to the south wall, ignoring everything: ... across the causeway, into Lees Tarn and out the other side,
// under the Great Span. Every hundred metres, a peg with a brass cap. The surveyor is not to be found." Along x = -80 from
// z -285 to 285 (placement plan section 4; the Lynchets' walls are no longer on it).
//
// One instanced mesh of pegs, one of ribbons, one of the five brass caps. A peg every 6 to 10 m from a fixed seed, the
// capped ones exactly at z -200, -100, 0, 100, 200. Pegs stand in the tarn where it is shallow (under 0.7 m), are absent where
// it is deeper, and resume on the far shore; none stands in a fallen slab of the Span. The ribbons stream east and flutter
// (a time uniform in their vertex shader, no per-peg work). No shadows: a peg is a hand's breadth wide.
import * as THREE from 'three';
import { groundOf } from '../regions/common.js';
import { spanClear } from '../span/plan.js';
import { engraveCaps } from '../../v7/glyphs/engrave.js'; // v7: the glyph motif, one of the Hypogeum's forms cut in each cap's top

export const PEGS = { x: -80, z0: -285, z1: 285, caps: [-200, -100, 0, 100, 200], height: 1.3, wet: 0.7 };

export function buildPegs(ctx) {
  const { terrain, scene } = ctx;
  const G = groundOf(terrain), rng = ctx.makeRng(5521);
  const stops = [PEGS.z0, ...PEGS.caps, PEGS.z1], list = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i], b = stops[i + 1], n = Math.max(1, Math.round((b - a) / 8)), step = (b - a) / n;
    for (let k = 0; k < n; k++) list.push({ z: a + k * step + (k === 0 ? 0 : (rng() - 0.5) * 1.6), cap: k === 0 && i > 0 && i <= PEGS.caps.length });
  }
  list.push({ z: PEGS.z1, cap: false });
  const pegs = [];
  for (const p of list) {
    const x = PEGS.x + (rng() - 0.5) * 0.06, z = p.z, depth = terrain.waterDepthAt(x, z);
    p.rnd = [rng(), rng(), rng(), rng()]; // drawn for every peg, so a gap elsewhere moves nothing
    if (depth > PEGS.wet) continue;            // the tarn's deeps, and the river
    if (spanClear(x, z, -4)) continue;         // inside a fallen slab or a pier
    pegs.push({ x, z, y: G.heightAt(x, z), cap: p.cap, rnd: p.rnd, wet: depth > 0 });
  }
  const H = PEGS.height;
  const wood = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.96 });
  const pegGeo = new THREE.CylinderGeometry(0.04, 0.06, H, 5, 1); pegGeo.translate(0, H / 2 - 0.12, 0); // base 12 cm in the ground
  const ribGeo = new THREE.PlaneGeometry(0.1, 0.62, 1, 5); ribGeo.translate(0, -0.31, 0);                  // hangs from its top edge
  const capGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.045, 10); capGeo.translate(0, H - 0.12 + 0.015, 0);
  const uTime = { value: 0 };
  const ribMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, side: THREE.DoubleSide });
  ribMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          float hang = -transformed.y;                                   // 0 at the peg, 0.46 at the tail
          vec3 eastL = normalize(transpose(mat3(instanceMatrix)) * vec3(1.0, 0.0, 0.0));
          float ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.37;
          float gust = 0.55 + 0.45 * sin(uTime * 0.37 + ph * 0.2);
          float flut = sin(uTime * (2.1 + 0.8 * sin(ph)) + ph * 3.0 + hang * 9.0);
          transformed.xz += eastL.xz * (hang * hang * 0.75 * gust + 0.035 * flut * hang);
          transformed.y += hang * hang * 0.4 * gust;                    // streaming out, it rises a little
        }`);
  };
  const brass = new THREE.MeshStandardMaterial({ color: '#c8a24c', roughness: 0.38, metalness: 0.65 });
  const wc = ['#8a7a63', '#76664f', '#9a8a72', '#6a5b48'].map((c) => new THREE.Color(c)).map((c) => new THREE.Color(c));
  const rc = ['#b06a62', '#b89a5c', '#7a8294', '#a07682'].map((c) => new THREE.Color(c)); // rose, ochre, slate, mauve: gone to rags of colour.map((c) => new THREE.Color(c)); // rose, ochre, slate, mauve, all gone to rags of colour
  const capped = pegs.filter((p) => p.cap);
  const pm = new THREE.InstancedMesh(pegGeo, wood, pegs.length), rm = new THREE.InstancedMesh(ribGeo, ribMat, pegs.length), cm = new THREE.InstancedMesh(capGeo, brass, Math.max(1, capped.length));
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3(), c = new THREE.Color();
  pegs.forEach((p, i) => {
    e.set((p.rnd[0] - 0.5) * 0.07, p.rnd[1] * 6.28, (p.rnd[2] - 0.5) * 0.07); q.setFromEuler(e);
    P.set(p.x, p.y, p.z); S.set(1, 0.94 + p.rnd[3] * 0.12, 1);
    pm.setMatrixAt(i, M.compose(P, q, S)); pm.setColorAt(i, c.copy(wc[(p.rnd[3] * 4) | 0]).multiplyScalar(0.85 + p.rnd[0] * 0.3));
    // the ribbon: tied at the top, its face to the wind
    const top = P.clone(); top.y += H * S.y - 0.16;
    e.set(0, p.rnd[1] * 6.28, 0); q.setFromEuler(e);
    rm.setMatrixAt(i, M.compose(top, q, S.set(1, 1, 1))); rm.setColorAt(i, c.copy(rc[(p.rnd[2] * 4) | 0]).multiplyScalar(0.8 + p.rnd[1] * 0.3));
  });
  capped.forEach((p, i) => cm.setMatrixAt(i, M.compose(P.set(p.x, p.y, p.z), q.identity(), S.set(1, 1, 1))));
  for (const m of [pm, rm, cm]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.castShadow = false; m.receiveShadow = false; m.computeBoundingSphere(); scene.add(m); }
  cm.count = capped.length;
  engraveCaps(ctx, cm, brass, capped.map((p) => PEGS.caps.indexOf(p.z))); // v7: cap i takes the lintel's form at its station's index
  pm.name = 'surveyors-pegs'; rm.name = 'surveyors-ribbons'; cm.name = 'surveyors-caps';
  // the ribbons' flutter: within 120 m only (they are specks beyond that)
  const ref = { x: PEGS.x, z: 0 }; // the nearest point of the line to the player, reused
  ctx.registerUpdate((dt, t) => { uTime.value = t; }, { at: () => { ref.z = Math.max(PEGS.z0, Math.min(PEGS.z1, ctx.player.pos.z)); return ref; }, near: 130, hz: 0 });
  return { pegs, count: pegs.length, caps: capped.map((p) => ({ x: p.x, z: p.z })), wet: pegs.filter((p) => p.wet).length, meshes: [pm, rm, cm] };
}
