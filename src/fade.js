// The fade kit (v6 "nothing pops"): a screen-space dither for cross-fades. Two copies of a thing (a tree's
// LOD and the next, a plant and its absence) share one fade value f in [0, 1]; the incoming copy draws with
// side 0 and the outgoing with side 1, and between them every pixel is drawn exactly once: no hole, no
// overlap, no blending, no sorting. The dither is interleaved-gradient noise of gl_FragCoord.xy with no time
// term, so it holds still while the camera does. The shadow pass dithers the same way (fadeDepthMaterial),
// so a caster's shadow fades with it.
//
//   fpFadeTest(f, side) is true where a fragment stays: side 0 keeps noise < f (a share f of the pixels),
//   side 1 keeps noise >= f (the other 1 - f). fpFadeKeep(f, side) discards the rest.
//
// withFade(material, opts) patches a built-in material (Lambert, Standard, Basic, Depth...) through
// onBeforeCompile, chaining any patch it already has, and folds opts.key into customProgramCacheKey.
// fadeDepthMaterial(opts) is a MeshDepthMaterial with the same patch, for a caster's customDepthMaterial.
// The fade arrives one of two ways:
//
//   1. A per-instance attribute (an InstancedMesh, each instance its own fade). The geometry carries a vec2
//      InstancedBufferAttribute (f, side); the caller writes it when an instance's fade changes.
//        geo.setAttribute('aFade', new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2));
//        withFade(mat, { attribute: 'aFade', key: 'trees' });
//        mesh.customDepthMaterial = fadeDepthMaterial({ attribute: 'aFade', key: 'trees' });
//
//   2. An expression in the shader, from the instance's distance to the player. `vertex` is a GLSL vec2
//      (f, side) evaluated after project_vertex (instanceMatrix, batchingMatrix, transformed and mvPosition
//      are in scope); `head` declares what it reads; `uniforms` are merged into the program's. Never use
//      cameraPosition for f: in the shadow pass it is the light's camera, so the shadow would fade at another
//      distance than its caster. Pass the player's position as a uniform the caller updates (copy into the
//      same Vector3 each frame; no allocation).
//        const u = { uFpEye: { value: ctx.camera.position }, uNear: { value: 60 }, uFar: { value: 70 } };
//        withFade(mat, { key: 'grass-far', uniforms: u, head: 'uniform vec3 uFpEye; uniform float uNear, uFar;',
//          vertex: 'vec2(1.0 - smoothstep(uNear, uFar, distance(uFpEye, (modelMatrix * instanceMatrix[3]).xyz)), 0.0)' });
//
//   A BatchedMesh (trees.js) has no per-instance attributes. Either compute f in `vertex` from
//   batchingMatrix (the instance's matrix, in scope at project_vertex): distance(uFpEye, (modelMatrix *
//   batchingMatrix[3]).xyz); or keep (f, side) per instance in a DataTexture the caller writes, declared in
//   `head` (uniform sampler2D uFpFades;) and read in `vertex` by the instance id three's batching chunk uses
//   (texelFetch(uFpFades, ivec2(int(getIndirectIndex(gl_DrawID)) % W, int(getIndirectIndex(gl_DrawID)) / W), 0).xy).
//
//   Either way, `fadeExpr` and `sideExpr` (fragment GLSL) override what the fragment tests; by default they
//   read the varying the vertex stage wrote (vFpFade.x, vFpFade.y). With neither attribute nor vertex, give
//   fadeExpr (a uniform, say) and the patch touches the fragment shader alone.
//
// Call withFade after the material has its own onBeforeCompile and customProgramCacheKey (it wraps what is
// there then; a later assignment replaces the fade). The patch looks for #include <common>,
// #include <project_vertex> (only with attribute or vertex) and #include <clipping_planes_fragment>, so an
// earlier patch must leave those in place.
//
// FADE_GLSL is the chunk itself, for a ShaderMaterial that includes it by hand. Nothing here runs per frame;
// a material made with the kit at build time compiles behind the title card like any other.
import * as THREE from 'three';

export const FADE_GLSL = /* glsl */ `
float fpFadeNoise(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
bool fpFadeTest(float f, float side) {
  float n = fpFadeNoise(floor(gl_FragCoord.xy));
  return side < 0.5 ? n < f : n >= f;
}
void fpFadeKeep(float f, float side) { if (!fpFadeTest(f, side)) discard; }
`;

function patch(shader, o) {
  if (o.uniforms) Object.assign(shader.uniforms, o.uniforms);
  const head = o.head ? `\n${o.head}\n` : '\n';
  const varying = !!(o.attribute || o.vertex);
  if (varying) {
    const src = o.attribute ? o.attribute : o.vertex;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>${head}${o.attribute ? `attribute vec2 ${o.attribute};\n` : ''}varying vec2 vFpFade;`)
      .replace('#include <project_vertex>', `#include <project_vertex>\nvFpFade = ${src};`);
  }
  const f = o.fadeExpr || 'vFpFade.x', side = o.sideExpr || (varying ? 'vFpFade.y' : '0.0');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>${head}${varying ? 'varying vec2 vFpFade;\n' : ''}${FADE_GLSL}`)
    .replace('#include <clipping_planes_fragment>', `fpFadeKeep(${f}, ${side});\n#include <clipping_planes_fragment>`);
}

export function withFade(material, o) {
  if (!o?.key) throw new Error('withFade needs a key');
  if (!o.attribute && !o.vertex && !o.fadeExpr) throw new Error('withFade needs attribute, vertex or fadeExpr');
  const prev = material.onBeforeCompile, prevKey = material.customProgramCacheKey;
  const own = Object.prototype.hasOwnProperty.call(material, 'onBeforeCompile');
  material.onBeforeCompile = function (shader, renderer) {
    if (own) prev.call(this, shader, renderer);
    patch(shader, o);
  };
  const before = Object.prototype.hasOwnProperty.call(material, 'customProgramCacheKey') ? prevKey.call(material) : '';
  material.customProgramCacheKey = () => `${before}|fp-fade:${o.key}`;
  material.needsUpdate = true;
  return material;
}

// The shadow pass hands a caster's map, alphaTest and side to its customDepthMaterial, so one depth material
// serves every caster with the same fade source (alpha-tested ones included: three r170 draws a caster's
// customDepthMaterial itself and clones only its own default for a caster with a map and alphaTest). A clone
// still has to fade, and Material.copy carries neither onBeforeCompile nor customProgramCacheKey:
// FadeDepthMaterial's copy does, so a clone keeps the fade and any patch the caller chained before it.
class FadeDepthMaterial extends THREE.MeshDepthMaterial {
  copy(source) {
    super.copy(source);
    const own = (k) => Object.prototype.hasOwnProperty.call(source, k);
    if (own('onBeforeCompile')) this.onBeforeCompile = source.onBeforeCompile;
    if (own('customProgramCacheKey')) this.customProgramCacheKey = source.customProgramCacheKey;
    return this;
  }
}

export function fadeDepthMaterial(o, params = {}) {
  return withFade(new FadeDepthMaterial({ depthPacking: THREE.RGBADepthPacking, ...params }), o);
}
