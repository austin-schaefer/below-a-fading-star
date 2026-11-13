// The crystals that climb the icefall (v12 H2): the Lattice's glass going up the ice in a thinning line from the mother
// crystal to the shelf, across the last crevasse in needles, and up the upper icefall to the Plummet's point, where it
// thickens again into a crown. They are the climb's way-marks: grown out of the slot's walls, along the block's edge,
// beside the lanes, out of the stair's cut, so the eye follows them up and the feet can too.
// Light climbs them: a pulse runs up the line from the mother crystal (each crystal's `along`, metres up the line),
// every 14 s, arrives in the Plummet's point and climbs it to its eye (icefall.js runs the Plummet's along on from
// the line's end); the mote that climbs the thread from the eye is the sky's own (remnants.js). One InstancedMesh; the material is the Lattice's look
// (src/vegetation/lattice.js: deep and pale blue, a fresnel rim, a band of light) without its batching.
import * as THREE from 'three';

// a shard: a prism of `sides` faces with a pointed termination, height 1 (apex), radius 1 at the base, foot at -0.3
export function shardGeo(rng, sides = 6, bodyTop = 0.74, taper = 0.8) {
  const pos = [];
  const rr = []; for (let s = 0; s < sides; s++) rr.push(0.82 + rng() * 0.36);
  const ring = (y, r) => rr.map((k, s) => { const a = (s / sides) * Math.PI * 2; return [Math.cos(a) * r * k, y, Math.sin(a) * r * k]; });
  const A = ring(-0.3, 1), B = ring(bodyTop, taper), apex = [(rng() - 0.5) * 0.12, 1, (rng() - 0.5) * 0.12];
  const push = (a, b, c) => pos.push(...a, ...b, ...c);
  for (let s = 0; s < sides; s++) { const s1 = (s + 1) % sides; push(A[s], B[s], B[s1]); push(A[s], B[s1], A[s1]); push(B[s], apex, B[s1]); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// the crystal material: `instanced` reads aAlong/aTint per instance; else per vertex (the Plummet and the old leads)
export function crystalMaterial(ctx, uTime, instanced) {
  const P = ctx.palette;
  const uni = { uTime, uDeep: { value: new THREE.Color(P.crystalDeep) }, uPale: { value: new THREE.Color(P.crystal) }, uGain: { value: 1 } };
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#3a7898'), roughness: 0.12, metalness: 0.2, flatShading: true });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uni);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        ${instanced ? 'attribute float aAlong; attribute float aTint;' : 'attribute float aAlong; attribute float aTint;'}
        varying float vAlong; varying float vTint; varying float vCh; varying vec3 vCrW;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        vAlong = aAlong; vTint = aTint; vCh = position.y;
        #ifdef USE_INSTANCING
          vCrW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vCrW = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime, uGain; uniform vec3 uDeep, uPale; varying float vAlong; varying float vTint; varying float vCh; varying vec3 vCrW;
        float crH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float crN(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(crH(i), crH(i + vec3(1,0,0)), f.x), mix(crH(i + vec3(0,1,0)), crH(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(crH(i + vec3(0,0,1)), crH(i + vec3(1,0,1)), f.x), mix(crH(i + vec3(0,1,1)), crH(i + vec3(1,1,1)), f.x), f.y), f.z); }
        float crVeil = 0.0;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          float facing = clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0);
          vec3 Vw = normalize(vCrW - cameraPosition);
          crVeil = crN(vCrW * vec3(0.9, 0.3, 0.9) + Vw * 0.9) * 0.6 + crN(vCrW * 2.3 + 3.1) * 0.4;
          vec3 inner = mix(uDeep * 0.16, uDeep * 0.7 + uPale * 0.08, smoothstep(0.35, 0.8, crVeil));
          diffuseColor.rgb = mix(uPale * 0.22, inner, smoothstep(0.05, 0.75, facing)) * (0.12 + 1.1 * vTint); // a low tint is dark glass (the Plummet)
          roughnessFactor = mix(0.05, 0.4, crVeil) + (1.0 - vTint) * 0.4; // dark glass is not a mirror for the sky
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          float fres = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 4.0);
          // the pulse up the line: a crest every 14 s, 280 m apart, running up at 20 m/s; the line glows a little between
          float ph = vAlong / 280.0 - uTime / 14.0; // slower: seen to travel up
          float crest = pow(0.5 + 0.5 * cos(6.2832 * ph), 18.0);
          float slow = 0.5 + 0.5 * sin(uTime * 0.4 - vAlong * 0.02);
          // a way-mark (a high tint) holds a steady glow, so a still shows the line and not only the pulse
          totalEmissiveRadiance += uPale * 0.5 * smoothstep(0.8, 1.0, vTint) * (0.6 + 0.4 * crVeil) * uGain;
          totalEmissiveRadiance += (uDeep * (0.08 + 0.18 * slow) * (0.5 + crVeil) + uPale * fres * 0.35 + uPale * crest * (1.6 + 1.6 * crVeil)) * (0.7 + 0.6 * vTint) * uGain;
          // dark glass (the Plummet, the old leads) is lit from inside: veins of the deep blue, brighter low down
          totalEmissiveRadiance += (uDeep * 1.1 + uPale * 0.25) * (1.0 - vTint) * smoothstep(0.55, 0.9, crVeil) * (0.6 + 0.6 * slow) * uGain;
        }`);
  };
  mat.customProgramCacheKey = () => 'fp-icefall-crystal-' + (instanced ? 'i' : 'v');
  return { mat, uni };
}

// the crystals as one InstancedMesh: list of { x, y, z, h, r, dir: [dx, dy, dz] (the axis), rot, along, tint }
export function crystalMesh(ctx, list, mat, rng) {
  const geo = shardGeo(rng, 6);
  const n = list.length;
  const aAlong = new Float32Array(n), aTint = new Float32Array(n);
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), yq = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  list.forEach((c, i) => {
    d.set(c.dir[0], c.dir[1], c.dir[2]).normalize();
    q.setFromUnitVectors(up, d); yq.setFromAxisAngle(up, c.rot ?? 0); q.multiply(yq);
    p.set(c.x, c.y, c.z); sc.set(c.r, c.h, c.r);
    m4.compose(p, q, sc); mesh.setMatrixAt(i, m4);
    aAlong[i] = c.along; aTint[i] = c.tint ?? 0.5;
  });
  geo.setAttribute('aAlong', new THREE.InstancedBufferAttribute(aAlong, 1));
  geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(aTint, 1));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.name = 'icefall-crystals';
  return { mesh, tris: n * geo.attributes.position.count / 3 };
}
