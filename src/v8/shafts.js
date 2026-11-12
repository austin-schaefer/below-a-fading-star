// Shafts of ember light in the Deodand Wood (v8-02): the wood is now the darkest place on the map, its floor bare
// litter, and the low sun comes through the canopy's gaps in long slanting shafts. One instanced mesh of camera-facing
// ribbons, additive, faded where the camera is close (so a shaft never fills the face) and far (additive light fades
// rather than fogs), dimmed with the sun's guttering (ctx.sky.flicker), and gone when the camera is outside the wood.
// v9 (#19): each shaft falls from a gap inside a tree's crown: its top is a point in a wood tree's crown (from
// ctx.woodTrees, vegetation.js), its foot where the line from there away from the sun meets the floor, so with the sun
// at 13.5° a shaft is long and shallow and its top always ends, faded out, among leaves, never in open air. Both ends
// stay inside the wood. ?shafts=0.
import * as THREE from 'three';
import { LANDMARKS } from '../world.js';
import { hyp } from '../noise.js';
import { waitFor, loaded } from '../v7/workers/rig.js';

const N = 34;

export async function build(ctx) {
  if (new URLSearchParams(location.search).get('shafts') === '0') return;
  const { terrain, sun } = ctx;
  const W = LANDMARKS.wood, rng = ctx.makeRng(8021);
  const trees = loaded('vegetation') ? await waitFor(() => ctx.woodTrees, 60000) : null;
  if (!trees || !trees.length) return; // no crowns, nothing for the light to fall through
  const deep = (x, z, w) => terrain.biomeAt(x, z).wood > w;
  const list = [];
  for (let i = 0; i < 600 && list.length < N; i++) {
    const t = trees[Math.floor(rng() * trees.length)];
    // the gap: a point in the crown's upper half, off the trunk toward the crown's rim
    const a = rng() * Math.PI * 2, rr = t.h * (0.08 + 0.16 * rng()), k = 0.6 + 0.18 * rng();
    const tx = t.x + Math.cos(a) * rr, tz = t.z + Math.sin(a) * rr, ty = t.y + t.h * k;
    // the foot: down the sun's line from the gap to the floor (two passes for the floor's slope)
    let L = (ty - terrain.heightAt(tx, tz)) / sun.dir.y;
    for (let j = 0; j < 2; j++) L = Math.max(4, (ty - terrain.heightAt(tx - sun.dir.x * L, tz - sun.dir.z * L)) / sun.dir.y);
    const x = tx - sun.dir.x * L, z = tz - sun.dir.z * L;
    if (!deep(tx, tz, 0.6) || !deep(x, z, 0.5) || !deep((x + tx) / 2, (z + tz) / 2, 0.5)) continue; // the whole shaft under the canopy
    if (terrain.isUnderwater(x, z) || terrain.slopeAt(x, z) > 0.5) continue;
    if (list.some((p) => Math.hypot(p[0] - x, p[2] - z) < 7)) continue;
    const y = terrain.heightAt(x, z) - 0.3;
    list.push([x, y, z, 1.1 + rng() * 1.8, (ty - y) / sun.dir.y, rng()]);
  }
  const base = new THREE.PlaneGeometry(1, 1, 1, 6); // x: side -0.5..0.5, y: along the shaft -0.5..0.5
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index; geo.setAttribute('position', base.attributes.position);
  const a0 = new Float32Array(list.length * 4), a1 = new Float32Array(list.length * 2);
  list.forEach((p, i) => { a0.set([p[0], p[1], p[2], p[3]], i * 4); a1.set([p[4], p[5]], i * 2); });
  geo.setAttribute('aBase', new THREE.InstancedBufferAttribute(a0, 4));
  geo.setAttribute('aLen', new THREE.InstancedBufferAttribute(a1, 2));
  geo.instanceCount = list.length;
  const mat = new THREE.ShaderMaterial({
    name: 'v8.shafts',
    uniforms: THREE.UniformsUtils.merge([{ uSun: { value: new THREE.Vector3(sun.dir.x, sun.dir.y, sun.dir.z) }, uColor: { value: new THREE.Color('#ff7a34') }, uAmt: { value: 1 }, uTime: { value: 0 } }]),
    vertexShader: /* glsl */`
      attribute vec4 aBase; attribute vec2 aLen;
      uniform vec3 uSun; uniform float uTime;
      varying vec2 vUv; varying float vNear; varying float vPulse;
      void main() {
        float t = position.y + 0.5;
        vec3 p = aBase.xyz + uSun * (t * aLen.x);
        vec3 toCam = cameraPosition - p;
        vec3 side = normalize(cross(uSun, toCam));
        p += side * position.x * aBase.w;
        vUv = vec2(position.x * 2.0, t);
        vNear = smoothstep(3.0, 12.0, length(toCam)) * (1.0 - smoothstep(50.0, 140.0, length(toCam))); // additive: fade with distance rather than fog toward the haze colour
        vPulse = 0.75 + 0.25 * sin(uTime * 0.21 + aLen.y * 6.283);
        vec4 mvPosition = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uAmt;
      varying vec2 vUv; varying float vNear; varying float vPulse;
      void main() {
        float across = 1.0 - vUv.x * vUv.x;
        float along = smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.55, 0.97, vUv.y)); // the top fades out inside the crown
        gl_FragColor = vec4(uColor * across * across * along * vNear * vPulse * uAmt * 0.2, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'v8-shafts'; mesh.frustumCulled = false; mesh.renderOrder = 2;
  ctx.scene.add(mesh);
  const near = ctx.quality === 'low' ? 0.7 : 1;
  ctx.registerUpdate((dt, t) => {
    mat.uniforms.uTime.value = t;
    // the camera's own place: in the wood they are there, at its fringe they thin, outside it they are gone
    let inWood = 1 - Math.min(1, Math.max(0, (hyp(ctx.camera.position.x - W.x, ctx.camera.position.z - W.z) - (W.r - 25)) / 30));
    inWood *= inWood * (3 - 2 * inWood);
    mat.uniforms.uAmt.value = near * ctx.sky.flicker.value * inWood;
    mesh.visible = inWood > 0;
  }, { pos: new THREE.Vector3(W.x, 0, W.z), near: W.r + 40, hz: 0 });
  ctx.log?.(`shafts: ${list.length} in the wood`);
}
