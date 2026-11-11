// Post-processing: bloom, screen-space crepuscular rays from the sun, a colour grade with a
// violet lift in the shadows, vignette, grain and a whisper of chromatic aberration.
//
// The chain (v6-02): the scene pass draws into the composer's readBuffer; bloom runs its bright pass, mips and
// composite and stops there (no blend back into the scene); the rays pass marches toward the sun into a target
// at RAYS_RES of the render, only while the sun is in view; the finish pass, the one full-size pass after the
// scene, adds the bloom composite to the scene where the grade reads it, adds the rays, grades, and tone maps
// to sRGB on the canvas. It does in one fragment what bloom's full-size blend, the grade pass and OutputPass did
// in three. ?post=v3 restores the three passes (bloom's blend, the grade into the writeBuffer, OutputPass);
// ?rays=full marches the rays at every pixel inside the grade or the finish, as before; ?postclock=0 pins the
// grain's and the rays' clock, so two loads draw the same noise (render pairs). The finish antialiases (FXAA)
// at every tier; ?aa=off draws without it.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { capBloom } from './bloomfix.js';

const params = new URL(location.href).searchParams;
const POST_V3 = params.get('post') === 'v3';
const RAYS_FULL = params.get('rays') === 'full';
const POST_CLOCK = params.get('postclock') !== '0';
// FXAA inside the finish, at every tier (v6-08 Q1's default, pulled forward); ?aa=off draws without it
const FXAA = params.get('aa') !== 'off';
// ?grain=<multiplier> scales the film grain's 0.02 (0.6 is the default, chosen by Austin from the v6-02 compare set; 1 is the old amount; 0 none)
const GRAIN = (() => { const g = parseFloat(params.get('grain')); return g >= 0 ? g : 0.6; })();
// the rays' target per axis, as a fraction of the render (chosen against the sun pair's tolerance)
const RAYS_RES = 0.25;

// The pieces the grade, the finish and the rays pass share. src() is the picture the grade reads: the scene with
// bloom added (ADD_BLOOM: bloom's composite, scaled by its alpha as the additive blend's SRC_ALPHA did), or a
// target that already holds the sum (?post=v3).
const SHARED = `
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
  float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
  vec3 src(vec2 uv){
  #ifdef ADD_BLOOM
    vec4 b = texture2D(tBloom, uv);
    return texture2D(tDiffuse, uv).rgb + b.rgb * (b.a * uBloomOn);
  #else
    return texture2D(tDiffuse, uv).rgb;
  #endif
  }
  // crepuscular rays: march toward the sun's screen position, accumulating only the very bright
  float rays(vec2 uv){
    vec2 delta = (uSunScreen - uv);
    float distToSun = length(delta);
    const int N = 40;
    vec2 step = delta / float(N) * 0.9;
    float illum = 0.0, decay = 1.0, w = 1.0;
    vec2 p = uv + step * hash(uv * uResolution + uTime);
    for (int i = 0; i < N; i++) {
      float l = lum(src(p));
      illum += smoothstep(0.55, 1.6, l) * decay * w;
      decay *= 0.965;
      p += step;
    }
    illum /= float(N);
    float falloff = 1.0 - smoothstep(0.0, 1.1, distToSun);
    return illum * (0.4 + 0.6 * falloff);
  }`;
const UNIFORMS = `uniform sampler2D tDiffuse, tBloom, tRays; uniform vec2 uSunScreen, uResolution; uniform float uSunVisible, uTime, uFlicker, uWade, uBloomOn, uGrain; uniform vec2 uTexel; uniform vec4 uPlace;`;

// FXAA (three's FXAAShader, r170, after Catlike Coding's; written for GLSL ES 1.00, which the finish's raw
// material compiles as): the edge search runs on the scene's luminance (the exposure applied, square-rooted
// toward display values for the thresholds), and the answer is a shifted uv at which the finish then evaluates
// everything it draws, so the graded colour is what is antialiased, without a pass or a target of its own.
const FXAA_GLSL = `
  float fxL(vec2 uv){ return sqrt(clamp(lum(texture2D(tDiffuse, uv).rgb) * toneMappingExposure, 0.0, 1.0)); }
  float fxStep(int i){ return i < 2 ? (i == 0 ? 1.0 : 1.5) : (i < 5 ? 2.0 : 4.0); }
  vec2 fxaa(vec2 uv){
    vec2 ts = uTexel;
    float m = fxL(uv), n = fxL(uv + vec2(0.0, ts.y)), e = fxL(uv + vec2(ts.x, 0.0)), s = fxL(uv - vec2(0.0, ts.y)), w = fxL(uv - vec2(ts.x, 0.0));
    float ne = fxL(uv + ts), nw = fxL(uv + vec2(-ts.x, ts.y)), se = fxL(uv + vec2(ts.x, -ts.y)), sw = fxL(uv - ts);
    float hi = max(max(max(max(n, e), s), w), m), lo = min(min(min(min(n, e), s), w), m), con = hi - lo;
    if (con < max(0.0312, 0.063 * hi)) return uv;
    float f = (2.0 * (n + e + s + w) + ne + nw + se + sw) / 12.0;
    f = clamp(abs(f - m) / con, 0.0, 1.0);
    float pixelBlend = smoothstep(0.0, 1.0, f); pixelBlend *= pixelBlend;
    float horizontal = abs(n + s - 2.0 * m) * 2.0 + abs(ne + se - 2.0 * e) + abs(nw + sw - 2.0 * w);
    float vertical = abs(e + w - 2.0 * m) * 2.0 + abs(ne + nw - 2.0 * n) + abs(se + sw - 2.0 * s);
    bool isH = horizontal >= vertical;
    float pL = isH ? n : e, nL = isH ? s : w, pG = abs(pL - m), nG = abs(nL - m);
    float pixelStep = isH ? ts.y : ts.x, opposite, gradient;
    if (pG < nG) { pixelStep = -pixelStep; opposite = nL; gradient = nG; } else { opposite = pL; gradient = pG; }
    vec2 uvEdge = uv, edgeStep;
    if (isH) { uvEdge.y += pixelStep * 0.5; edgeStep = vec2(ts.x, 0.0); } else { uvEdge.x += pixelStep * 0.5; edgeStep = vec2(0.0, ts.y); }
    float edgeL = (m + opposite) * 0.5, gT = gradient * 0.25;
    vec2 puv = uvEdge + edgeStep; float pD = fxL(puv) - edgeL; bool pEnd = abs(pD) >= gT;
    for (int i = 1; i < 6; i++) { if (pEnd) break; puv += edgeStep * fxStep(i); pD = fxL(puv) - edgeL; pEnd = abs(pD) >= gT; }
    if (!pEnd) puv += edgeStep * 8.0;
    vec2 nuv = uvEdge - edgeStep; float nD = fxL(nuv) - edgeL; bool nEnd = abs(nD) >= gT;
    for (int i = 1; i < 6; i++) { if (nEnd) break; nuv -= edgeStep * fxStep(i); nD = fxL(nuv) - edgeL; nEnd = abs(nD) >= gT; }
    if (!nEnd) nuv -= edgeStep * 8.0;
    float pDist = isH ? puv.x - uv.x : puv.y - uv.y, nDist = isH ? uv.x - nuv.x : uv.y - nuv.y;
    float shortest; bool deltaSign;
    if (pDist <= nDist) { shortest = pDist; deltaSign = pD >= 0.0; } else { shortest = nDist; deltaSign = nD >= 0.0; }
    float edgeBlend = deltaSign == (m - edgeL >= 0.0) ? 0.0 : 0.5 - shortest / (pDist + nDist);
    float blend = max(pixelBlend, edgeBlend);
    if (isH) uv.y += pixelStep * blend; else uv.x += pixelStep * blend;
    return uv;
  }`;

// the grade (and, with FINISH, the tone mapping and sRGB transfer OutputPass did)
const GRADE_MAIN = `
  varying vec2 vUv;
  void main(){
  #ifdef FXAA
    vec2 uv = fxaa(vUv);
  #else
    vec2 uv = vUv;
  #endif
    // chromatic aberration, stronger at the edges
    vec2 toC = uv - 0.5; float r2 = dot(toC, toC);
    vec2 ca = toC * r2 * 0.012;
    vec3 col;
    col.r = src(uv - ca).r;
    col.g = src(uv).g;
    col.b = src(uv + ca).b;

    if (uSunVisible > 0.001) {
    #ifdef RAYS_TEX
      float illum = texture2D(tRays, uv).r;
    #else
      float illum = rays(uv);
    #endif
      col += vec3(1.0, 0.42, 0.18) * illum * uSunVisible * uFlicker * 0.38;
    }

    // grade: lift shadows violet, warm the highlights, gently crush
    float l = lum(col);
    vec3 shadowTint = vec3(0.06, 0.05, 0.15);
    col = col + shadowTint * (1.0 - smoothstep(0.0, 0.3, l)) * 0.36;
    // mid-tones: pull orange toward a sullen crimson-olive split (less red-planet dust)
    float mid = smoothstep(0.05, 0.25, l) * (1.0 - smoothstep(0.45, 0.9, l));
    col = mix(col, col * vec3(0.97, 1.02, 0.98), mid * 0.5);
    col = mix(col, col * vec3(1.06, 0.98, 0.9), smoothstep(0.35, 1.0, l) * 0.5);
    col = pow(max(col, 0.0), vec3(1.05));
    col = mix(col, vec3(lum(col)), 0.2);

    // v8-02: the place's own light at the camera (src/v8/places.js): exposure, saturation, contrast round a mid
    // grey, warmth; (1, 1, 1, 0) leaves the frame as the grade above made it
    col *= uPlace.x;
    col = max(mix(vec3(lum(col)), col, uPlace.y), 0.0);
    col = 0.18 * pow(col / 0.18, vec3(uPlace.z));
    col *= vec3(1.0 + uPlace.w, 1.0 + uPlace.w * 0.15, 1.0 - uPlace.w * 1.2);

    // wading tint
    col = mix(col, col * vec3(0.5, 0.65, 0.6), uWade * 0.5);

    // vignette
    float vig = smoothstep(0.95, 0.25, length(toC) * 1.25);
    col *= mix(0.55, 1.0, vig);

    // grain
    float g = hash(vUv * uResolution + fract(uTime * 7.0) * 100.0) - 0.5; // the pixel's own uv: FXAA does not move the grain
    col += g * 0.02 * uGrain * (1.0 - smoothstep(0.0, 0.6, l) * 0.6);

    gl_FragColor = vec4(col, 1.0);
  #ifdef FINISH
    // tone mapping and the output transfer, as OutputPass (three's own chunks)
    #ifdef LINEAR_TONE_MAPPING
      gl_FragColor.rgb = LinearToneMapping(gl_FragColor.rgb);
    #elif defined(REINHARD_TONE_MAPPING)
      gl_FragColor.rgb = ReinhardToneMapping(gl_FragColor.rgb);
    #elif defined(CINEON_TONE_MAPPING)
      gl_FragColor.rgb = CineonToneMapping(gl_FragColor.rgb);
    #elif defined(ACES_FILMIC_TONE_MAPPING)
      gl_FragColor.rgb = ACESFilmicToneMapping(gl_FragColor.rgb);
    #elif defined(AGX_TONE_MAPPING)
      gl_FragColor.rgb = AgXToneMapping(gl_FragColor.rgb);
    #elif defined(NEUTRAL_TONE_MAPPING)
      gl_FragColor.rgb = NeutralToneMapping(gl_FragColor.rgb);
    #endif
    #ifdef SRGB_TRANSFER
      gl_FragColor = sRGBTransferOETF(gl_FragColor);
    #endif
  #endif
  }`;

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
// the finish is a RawShaderMaterial, as OutputPass's is: a ShaderMaterial drawn to the canvas would get three's
// own tone mapping prefix on top of the chunks included here
const VERT_RAW = `precision highp float; uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix; attribute vec3 position; attribute vec2 uv; ${VERT}`;
const FRAG = (head, main) => `precision highp float;\n${head}\n${UNIFORMS}\n${SHARED}\n#ifdef FXAA\n${FXAA_GLSL}\n#endif\n${main}`;

function makeUniforms() {
  return {
    tDiffuse: { value: null }, tBloom: { value: null }, tRays: { value: null },
    uSunScreen: { value: new THREE.Vector2(0.5, 0.5) }, uSunVisible: { value: 0 },
    uTime: { value: 0 }, uFlicker: { value: 1 }, uWade: { value: 0 }, uPlace: { value: new THREE.Vector4(1, 1, 1, 0) }, uBloomOn: { value: 1 }, uGrain: { value: GRAIN },
    uResolution: { value: new THREE.Vector2(1, 1) }, uTexel: { value: new THREE.Vector2(1, 1) }, toneMappingExposure: { value: 1 },
  };
}

// bloom without its last step: the bright pass, the mips and the composite into renderTargetsHorizontal[0], which
// the finish samples. UnrealBloomPass.render less the full-size additive blend back into the scene target.
// useMips(n) blurs only the first n of the five mips (?bloommips=); the composite reads a black texel with alpha 1
// for each one left out, so the others and the composite's alpha (the blend's scale) are as with five.
const BLACK = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
BLACK.needsUpdate = true;
class BloomComposite extends UnrealBloomPass {
  useMips(n) {
    this.mips = Math.max(1, Math.min(this.nMips, n));
    const cu = this.compositeMaterial.uniforms;
    for (let i = 0; i < this.nMips; i++) cu[`blurTexture${i + 1}`].value = i < this.mips ? this.renderTargetsVertical[i].texture : BLACK;
  }
  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    renderer.getClearColor(this._oldClearColor);
    this.oldClearAlpha = renderer.getClearAlpha();
    const oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setClearColor(this.clearColor, 0);
    if (maskActive) renderer.state.buffers.stencil.setTest(false);
    this.highPassUniforms.tDiffuse.value = readBuffer.texture;
    this.highPassUniforms.luminosityThreshold.value = this.threshold;
    this.fsQuad.material = this.materialHighPassFilter;
    renderer.setRenderTarget(this.renderTargetBright);
    renderer.clear();
    this.fsQuad.render(renderer);
    let input = this.renderTargetBright;
    for (let i = 0; i < (this.mips ?? this.nMips); i++) {
      const m = this.separableBlurMaterials[i];
      this.fsQuad.material = m;
      m.uniforms.colorTexture.value = input.texture;
      m.uniforms.direction.value = UnrealBloomPass.BlurDirectionX;
      renderer.setRenderTarget(this.renderTargetsHorizontal[i]);
      renderer.clear();
      this.fsQuad.render(renderer);
      m.uniforms.colorTexture.value = this.renderTargetsHorizontal[i].texture;
      m.uniforms.direction.value = UnrealBloomPass.BlurDirectionY;
      renderer.setRenderTarget(this.renderTargetsVertical[i]);
      renderer.clear();
      this.fsQuad.render(renderer);
      input = this.renderTargetsVertical[i];
    }
    this.fsQuad.material = this.compositeMaterial;
    this.compositeMaterial.uniforms.bloomStrength.value = this.strength;
    this.compositeMaterial.uniforms.bloomRadius.value = this.radius;
    this.compositeMaterial.uniforms.bloomTintColors.value = this.bloomTintColors;
    renderer.setRenderTarget(this.renderTargetsHorizontal[0]);
    renderer.clear();
    this.fsQuad.render(renderer);
    if (maskActive) renderer.state.buffers.stencil.setTest(true);
    renderer.setClearColor(this._oldClearColor, this.oldClearAlpha);
    renderer.autoClear = oldAutoClear;
  }
}

// the rays at RAYS_RES of the render into their own target. It draws only while the sun is in view (`active`),
// and once on the first frame (behind the title card) so its program is built before the sun is first seen.
class RaysPass extends Pass {
  constructor(material, scale) {
    super();
    this.material = material;
    this.fsQuad = new FullScreenQuad(material);
    this.scale = scale;
    this.target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
    this.target.texture.name = 'post.rays';
    this.needsSwap = false;
    this.active = false;
    this.drawn = false;
  }
  setSize(w, h) { this.target.setSize(Math.max(1, Math.round(w * this.scale)), Math.max(1, Math.round(h * this.scale))); }
  render(renderer, writeBuffer, readBuffer) {
    if (!this.active && this.drawn) return;
    this.drawn = true;
    this.material.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.target);
    this.fsQuad.render(renderer);
  }
  dispose() { this.target.dispose(); this.material.dispose(); this.fsQuad.dispose(); }
}

// the finish: the last pass, to the canvas. needsSwap is false: the composer's pair never swaps, so the scene
// pass always draws into the readBuffer (the one with depth) and the writeBuffer is never bound or allocated.
class FinishPass extends Pass {
  constructor(material) {
    super();
    this.material = material;
    this.uniforms = material.uniforms;
    this.fsQuad = new FullScreenQuad(material);
    this.needsSwap = false;
    this.base = { ...material.defines };
    this._outputColorSpace = null;
    this._toneMapping = null;
  }
  render(renderer, writeBuffer, readBuffer) {
    this.uniforms.tDiffuse.value = readBuffer.texture;
    this.uniforms.toneMappingExposure.value = renderer.toneMappingExposure;
    // the output defines follow the renderer's, as OutputPass's do
    if (this._outputColorSpace !== renderer.outputColorSpace || this._toneMapping !== renderer.toneMapping) {
      this._outputColorSpace = renderer.outputColorSpace;
      this._toneMapping = renderer.toneMapping;
      const d = { ...this.base };
      if (THREE.ColorManagement.getTransfer(this._outputColorSpace) === THREE.SRGBTransfer) d.SRGB_TRANSFER = '';
      const tm = this._toneMapping;
      if (tm === THREE.LinearToneMapping) d.LINEAR_TONE_MAPPING = '';
      else if (tm === THREE.ReinhardToneMapping) d.REINHARD_TONE_MAPPING = '';
      else if (tm === THREE.CineonToneMapping) d.CINEON_TONE_MAPPING = '';
      else if (tm === THREE.ACESFilmicToneMapping) d.ACES_FILMIC_TONE_MAPPING = '';
      else if (tm === THREE.AgXToneMapping) d.AGX_TONE_MAPPING = '';
      else if (tm === THREE.NeutralToneMapping) d.NEUTRAL_TONE_MAPPING = '';
      this.material.defines = d;
      this.material.needsUpdate = true;
    }
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.fsQuad.render(renderer);
  }
  dispose() { this.material.dispose(); this.fsQuad.dispose(); }
}

// bloom settings at full size (as before) and at half size; ?bloomtune=strength,radius,threshold tries others
const BLOOM_FULL = { strength: 0.38, radius: 0.55, threshold: 0.9 };
const BLOOM_HALF = (() => {
  const t = (params.get('bloomtune') || '').split(',').map(Number);
  // at half size the tightest mip is gone (the white rim on the sun, the Wrong Colour's close glow): a little
  // more strength, weighted toward the smaller mips, a hair lower threshold. Chosen against full-size renders.
  return t.length === 3 && t.every(isFinite) ? { strength: t[0], radius: t[1], threshold: t[2] } : { strength: 0.52, radius: 0.15, threshold: 0.88 };
})();

export function buildPost(ctx) {
  const { renderer, scene, camera } = ctx;
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  // Bloom at a fraction of the render size (v3 stage 2; ?bloomres=, default 0.5, 1 = as before). UnrealBloom
  // already starts its chain at half the size it is given, so 0.5 makes the bright pass a quarter of the
  // render. Its blurs are fixed in texels, so at half size each mip spreads twice as far on screen: the
  // radius and strength are retuned so the sun, the lanterns, the Lattice and the Wrong Colour read the same.
  const bloomParam = parseFloat(params.get('bloomres'));
  const bloomRes = bloomParam > 0 ? Math.min(1, bloomParam) : 0.5;
  const tune = bloomRes < 1 ? BLOOM_HALF : BLOOM_FULL;
  const bloom = capBloom(new (POST_V3 ? UnrealBloomPass : BloomComposite)(size.clone(), tune.strength, tune.radius, tune.threshold));
  const bloomSetSize = bloom.setSize.bind(bloom);
  bloom.setSize = (w, h) => bloomSetSize(Math.max(2, Math.round(w * bloomRes)), Math.max(2, Math.round(h * bloomRes)));
  bloom.resScale = bloomRes;
  // ?bloommips=1..5 blurs fewer of bloom's five mips (the finish chain only; ?post=v3 keeps five). The default
  // stays five: v6-02 tried four on integrated and apple GPUs (and ?bloomres=0.375) and neither moved bloom's
  // share of the GPU timer on the uncapped wood pan, so nothing is given up for it.
  const mipsParam = parseInt(params.get('bloommips'), 10);
  const mips = mipsParam >= 1 ? Math.min(5, mipsParam) : 5;
  if (bloom.useMips) bloom.useMips(mips);
  bloom.mipsUsed = POST_V3 ? 5 : mips;
  composer.addPass(bloom);
  // Target hygiene (v3 stage 3; ?lean=0 as before): only the target the scene is drawn into needs a depth buffer.
  // The RenderPass draws into the composer's readBuffer (renderTarget2). With ?post=v3 the grade and output passes
  // swap twice a frame, so the pair is back in place for the next frame, and the writeBuffer takes the grade's
  // output; with the finish nothing swaps and the writeBuffer is never drawn to. Bloom's eleven targets and the
  // rays' only ever take full-screen quads.
  if (params.get('lean') !== '0') {
    composer.writeBuffer.depthBuffer = false;
    for (const t of [bloom.renderTargetBright, ...bloom.renderTargetsHorizontal, ...bloom.renderTargetsVertical]) t.depthBuffer = false;
  }

  const u = makeUniforms();
  u.tBloom.value = bloom.renderTargetsHorizontal[0].texture;
  const lowRays = !RAYS_FULL;
  let rays = null, grade = null, finish = null;
  if (lowRays) {
    // the rays pass shares the grade's uniforms (the sun, the clock, the resolution); its own tDiffuse
    const ru = { ...u, tDiffuse: { value: null } };
    const defines = POST_V3 ? {} : { ADD_BLOOM: '' };
    rays = new RaysPass(new THREE.ShaderMaterial({ name: 'post.rays', uniforms: ru, defines, vertexShader: VERT, fragmentShader: FRAG('', 'varying vec2 vUv; void main(){ gl_FragColor = vec4(rays(vUv), 0.0, 0.0, 1.0); }'), depthTest: false, depthWrite: false }), RAYS_RES);
    composer.addPass(rays);
    u.tRays.value = rays.target.texture;
  }
  if (POST_V3) {
    const defines = lowRays ? { RAYS_TEX: '' } : {};
    grade = new ShaderPass(new THREE.ShaderMaterial({ name: 'post.grade', uniforms: u, defines, vertexShader: VERT, fragmentShader: FRAG('', GRADE_MAIN) }));
    composer.addPass(grade);
    composer.addPass(new OutputPass());
  } else {
    const defines = { ADD_BLOOM: '', FINISH: '', ...(lowRays ? { RAYS_TEX: '' } : {}), ...(FXAA ? { FXAA: '' } : {}) };
    finish = new FinishPass(new THREE.RawShaderMaterial({
      name: 'post.finish', uniforms: u, defines, vertexShader: VERT_RAW,
      fragmentShader: FRAG(`${THREE.ShaderChunk.tonemapping_pars_fragment}\n${THREE.ShaderChunk.colorspace_pars_fragment}`, GRADE_MAIN),
      depthTest: false, depthWrite: false,
    }));
    composer.addPass(finish);
  }

  const sunWorld = new THREE.Vector3(), proj = new THREE.Vector3();
  function update(dt, t) {
    // guard for the lean targets: if a pass list with an odd number of swaps ever hands the RenderPass the
    // depthless target, give both targets depth again rather than draw the scene without a depth test
    if (!composer.readBuffer.depthBuffer) {
      for (const rt of [composer.renderTarget1, composer.renderTarget2]) { rt.depthBuffer = true; rt.dispose(); }
      console.warn('[fp] post: the scene target had no depth buffer; both composer targets have one now');
    }
    u.uTime.value = POST_CLOCK ? t : 0;
    u.uFlicker.value = ctx.sky.flicker.value;
    u.uWade.value = ctx.controls.state.wading || 0;
    if (ctx.places) ctx.places.gradeAt(camera.position.x, camera.position.z, ctx.terrain.causewayDistance(camera.position.x, camera.position.z), u.uPlace.value); // v8-02
    u.uResolution.value.set(size.x, size.y);
    renderer.getDrawingBufferSize(u.uTexel.value); // the finish draws at the buffer's size: FXAA steps whole pixels of it
    u.uTexel.value.set(1 / u.uTexel.value.x, 1 / u.uTexel.value.y);
    u.uBloomOn.value = bloom.enabled ? 1 : 0;
    // sun screen position
    sunWorld.copy(ctx.sky.sunDir).multiplyScalar(1000).add(camera.position);
    proj.copy(sunWorld).project(camera);
    const behind = proj.z > 1;
    u.uSunScreen.value.set(proj.x * 0.5 + 0.5, proj.y * 0.5 + 0.5);
    const inView = !behind && Math.abs(proj.x) < 1.6 && Math.abs(proj.y) < 1.6;
    const vis = inView ? 1 - THREE.MathUtils.smoothstep(Math.max(Math.abs(proj.x), Math.abs(proj.y)), 1.0, 1.6) : 0;
    u.uSunVisible.value += (vis - u.uSunVisible.value) * Math.min(1, dt * 6);
    if (rays) rays.active = u.uSunVisible.value > 0.001;
    bloom.strength = tune.strength * (0.8 + 0.2 * ctx.sky.flicker.value);
  }
  function resize(w, h) {
    size.set(w, h);
    composer.setSize(w, h);
  }
  return { composer, bloom, rays, grade, finish, uniforms: u, update, resize };
}
