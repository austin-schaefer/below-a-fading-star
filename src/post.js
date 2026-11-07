// Post-processing: bloom, screen-space crepuscular rays from the sun, a colour grade with a
// violet lift in the shadows, vignette, grain and a whisper of chromatic aberration.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSunScreen: { value: new THREE.Vector2(0.5, 0.5) },
    uSunVisible: { value: 0 },
    uTime: { value: 0 },
    uFlicker: { value: 1 },
    uWade: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    precision highp float;
    uniform sampler2D tDiffuse; uniform vec2 uSunScreen, uResolution; uniform float uSunVisible, uTime, uFlicker, uWade;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
    void main(){
      vec2 uv = vUv;
      // chromatic aberration, stronger at the edges
      vec2 toC = uv - 0.5; float r2 = dot(toC, toC);
      vec2 ca = toC * r2 * 0.012;
      vec3 col;
      col.r = texture2D(tDiffuse, uv - ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv + ca).b;

      // crepuscular rays: march toward the sun's screen position, accumulating only the very bright
      if (uSunVisible > 0.001) {
        vec2 delta = (uSunScreen - uv);
        float distToSun = length(delta);
        const int N = 40;
        vec2 step = delta / float(N) * 0.9;
        float illum = 0.0, decay = 1.0, w = 1.0;
        vec2 p = uv + step * hash(uv * uResolution + uTime);
        for (int i = 0; i < N; i++) {
          vec3 s = texture2D(tDiffuse, p).rgb;
          float l = lum(s);
          illum += smoothstep(0.55, 1.6, l) * decay * w;
          decay *= 0.965;
          p += step;
        }
        illum /= float(N);
        float falloff = 1.0 - smoothstep(0.0, 1.1, distToSun);
        col += vec3(1.0, 0.42, 0.18) * illum * uSunVisible * uFlicker * 0.38 * (0.4 + 0.6 * falloff);
      }

      // grade: lift shadows violet, warm the highlights, gently crush
      float l = lum(col);
      vec3 shadowTint = vec3(0.09, 0.05, 0.13);
      col = col + shadowTint * (1.0 - smoothstep(0.0, 0.35, l)) * 0.3;
      col = mix(col, col * vec3(1.06, 0.98, 0.9), smoothstep(0.3, 1.0, l) * 0.6);
      col = pow(max(col, 0.0), vec3(1.04));
      col = mix(col, vec3(lum(col)), 0.1);

      // wading tint
      col = mix(col, col * vec3(0.5, 0.65, 0.6), uWade * 0.5);

      // vignette
      float vig = smoothstep(0.95, 0.25, length(toC) * 1.25);
      col *= mix(0.55, 1.0, vig);

      // grain
      float g = hash(uv * uResolution + fract(uTime * 7.0) * 100.0) - 0.5;
      col += g * 0.02 * (1.0 - smoothstep(0.0, 0.6, l) * 0.6);

      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function buildPost(ctx) {
  const { renderer, scene, camera } = ctx;
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const bloom = new UnrealBloomPass(size.clone(), 0.42, 0.75, 0.82);
  composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  const sunWorld = new THREE.Vector3(), proj = new THREE.Vector3();
  function update(dt, t) {
    grade.uniforms.uTime.value = t;
    grade.uniforms.uFlicker.value = ctx.sky.flicker.value;
    grade.uniforms.uWade.value = ctx.controls.state.wading || 0;
    grade.uniforms.uResolution.value.set(size.x, size.y);
    // sun screen position
    sunWorld.copy(ctx.sky.sunDir).multiplyScalar(1000).add(camera.position);
    proj.copy(sunWorld).project(camera);
    const behind = proj.z > 1;
    grade.uniforms.uSunScreen.value.set(proj.x * 0.5 + 0.5, proj.y * 0.5 + 0.5);
    const inView = !behind && Math.abs(proj.x) < 1.6 && Math.abs(proj.y) < 1.6;
    const vis = inView ? 1 - THREE.MathUtils.smoothstep(Math.max(Math.abs(proj.x), Math.abs(proj.y)), 1.0, 1.6) : 0;
    grade.uniforms.uSunVisible.value += (vis - grade.uniforms.uSunVisible.value) * Math.min(1, dt * 6);
    bloom.strength = 0.42 * (0.8 + 0.2 * ctx.sky.flicker.value);
  }
  function resize(w, h) {
    size.set(w, h);
    composer.setSize(w, h);
    bloom.setSize(w, h);
  }
  return { composer, bloom, grade, update, resize };
}
