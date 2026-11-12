// Shafts of ember light in the Deodand Wood (v8-02): the wood is now the darkest place on the map, its floor bare
// litter, and the low sun comes through the canopy's gaps in long slanting shafts. One instanced mesh of camera-facing
// ribbons, each laid along the sun's direction from a spot on the wood's floor; additive, faded where the
// camera is close (so a shaft never fills the face) and far (additive light fades rather than fogs) and dimmed with the sun's guttering (ctx.sky.flicker). ?shafts=0.
import * as THREE from 'three';
import { LANDMARKS } from '../world.js';

const N = 34, R = 78;

export async function build(ctx) {
  if (new URLSearchParams(location.search).get('shafts') === '0') return;
  const { terrain, sun } = ctx;
  const W = LANDMARKS.wood, rng = ctx.makeRng(8021);
  const list = [];
  for (let i = 0; i < 400 && list.length < N; i++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * R, x = W.x + Math.cos(a) * r, z = W.z + Math.sin(a) * r;
    if (terrain.isUnderwater(x, z) || terrain.slopeAt(x, z) > 0.5) continue;
    if (list.some((p) => Math.hypot(p[0] - x, p[2] - z) < 7)) continue;
    list.push([x, terrain.heightAt(x, z) - 0.3, z, 1.4 + rng() * 2.4, 16 + rng() * 14, rng()]);
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
        float along = smoothstep(0.0, 0.12, vUv.y) * (1.0 - smoothstep(0.45, 1.0, vUv.y));
        gl_FragColor = vec4(uColor * across * across * along * vNear * vPulse * uAmt * 0.32, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'v8-shafts'; mesh.frustumCulled = false; mesh.renderOrder = 2;
  ctx.scene.add(mesh);
  const near = ctx.quality === 'low' ? 0.7 : 1;
  ctx.registerUpdate((dt, t) => {
    mat.uniforms.uTime.value = t;
    mat.uniforms.uAmt.value = near * ctx.sky.flicker.value;
  }, { pos: new THREE.Vector3(W.x, 0, W.z), near: 140, hz: 0 });
  ctx.log?.(`shafts: ${list.length} in the wood`);
}
