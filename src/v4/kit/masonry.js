// Cyclopean masonry (v4 kit): the stone of a late, better age, worn. One MeshStandardMaterial patched in-shader,
// no textures, so any geometry in world space takes it without UVs:
//  - walls (faces steeper than ~45°): courses of house-sized blocks laid without visible mortar, the vertical
//    joints slanted a little block to block (polygonal, not brick), each block its own tone. Courses can
//    diminish as they rise (BL, the Diminishing Treads): every course is `diminish` times the one below, and
//    the joints narrow with it, so the eye reads far more height than is built.
//  - tops and treads (flatter faces): great slabs on a Voronoi plan, edges rounded by feet and weather.
//  - weathering: arrises rounded into the joints, rain-streaks running down from each course, damp and moss at
//    the foot, sun-bleached tops, crust lichen, the stone dulled overall. Nothing new.
//  - inlay, once rich: a narrow bronze channel along some courses gone to verdigris and black (inlay 'bronze'),
//    or black glass set flush in some blocks, still glossy (inlay 'glass'), or none.
// makeCyclopeanMaterial(ctx, opts) -> { mat, uniforms, set(opts) }. Options (all optional):
//   color '#7a6e64' (the stone), course 2.4 (m, the lowest course), base 0 (world y the courses count from),
//   diminish 1 (per course; 0.95 shrinks each course by 5%), slab 3.2 (m, the top slabs' cell), joint 0.035
//   (joint width as a fraction of the course), wear 0.6 (0..1), moss 0.5 (0..1), inlay 'none'|'bronze'|'glass',
//   inlayEvery 0.18 (the fraction of courses or blocks that carry it).
// The GLSL is exported (CYCLOPEAN_GLSL, fpCyclopean()) for ShaderMaterials that want the same stone.
import * as THREE from 'three';

export const CYCLOPEAN_GLSL = /* glsl */`
  float cyH12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float cyVn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(cyH12(i), cyH12(i + vec2(1,0)), f.x), mix(cyH12(i + vec2(0,1)), cyH12(i + vec2(1,1)), f.x), f.y); }
  float cyFbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * cyVn(p); p = p * 2.07 + 5.3; a *= 0.5; } return s / 0.9375; }
  // course index (fractional) at height v above the base, the courses shrinking by d each
  float cyCourse(float v, float c0, float d) {
    if (abs(1.0 - d) < 1e-4) return v / c0;
    return log(max(1e-4, 1.0 - v * (1.0 - d) / c0)) / log(d);
  }
  // out: x joint (0..1, 1 in the joint), y edge nearness (arris), z block id hash, w course height (m)
  vec4 fpCyclopeanWall(vec2 uv, float c0, float d, float jw) {
    float n = cyCourse(max(uv.y, 0.0), c0, d);
    float row = floor(n), f = fract(n);
    float rowH = c0 * pow(d, row);
    float L = rowH * (1.5 + 1.7 * cyH12(vec2(row, 4.1)));             // a course's typical block length
    float slant = (cyH12(vec2(row, 8.7)) - 0.5) * 0.5;                 // joints lean, polygon-fashion
    float cx = uv.x / L + cyH12(vec2(row, 2.3)) * 9.0 + (f - 0.5) * slant;
    float id = floor(cx);
    cx += (cyH12(vec2(id, row)) - 0.5) * 0.35 * (f - 0.5);              // each joint its own lean
    float fx = fract(cx);
    float ex = min(fx, 1.0 - fx) * L, ey = min(f, 1.0 - f) * rowH;
    float e = min(ex, ey), w = jw * rowH;
    return vec4(1.0 - smoothstep(w * 0.4, w, e), 1.0 - smoothstep(w, w * 5.0, e), cyH12(vec2(id, row) + 0.37), rowH);
  }
  // great slabs on a Voronoi plan: x joint, y arris, z slab id hash
  vec3 fpCyclopeanSlab(vec2 p, float cell, float jw) {
    vec2 g = p / cell, i = floor(g), f = fract(g);
    float d1 = 9.0, d2 = 9.0; vec2 best = vec2(0.0);
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y)), c = o + vec2(cyH12(i + o), cyH12(i + o + 7.7)) * 0.8 + 0.1;
      float d = length(f - c);
      if (d < d1) { d2 = d1; d1 = d; best = i + o; } else if (d < d2) d2 = d;
    }
    float e = (d2 - d1) * 0.5 * cell, w = jw * cell;
    return vec3(1.0 - smoothstep(w * 0.4, w, e), 1.0 - smoothstep(w, w * 6.0, e), cyH12(best + 0.71));
  }
`;

export function makeCyclopeanMaterial(ctx, opts = {}) {
  const uniforms = {
    uCyCourse: { value: 2.4 }, uCyBase: { value: 0 }, uCyDim: { value: 1 }, uCySlab: { value: 3.2 }, uCyJoint: { value: 0.035 },
    uCyWear: { value: 0.6 }, uCyMoss: { value: 0.5 }, uCyInlay: { value: 0 }, uCyEvery: { value: 0.18 },
  };
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(opts.color || '#7a6e64'), roughness: 0.93, metalness: 0 });
  const INLAY = { none: 0, bronze: 1, glass: 2 };
  function set(o) {
    if (o.color) mat.color.set(o.color);
    if (o.course != null) uniforms.uCyCourse.value = o.course;
    if (o.base != null) uniforms.uCyBase.value = o.base;
    if (o.diminish != null) uniforms.uCyDim.value = o.diminish;
    if (o.slab != null) uniforms.uCySlab.value = o.slab;
    if (o.joint != null) uniforms.uCyJoint.value = o.joint;
    if (o.wear != null) uniforms.uCyWear.value = o.wear;
    if (o.moss != null) uniforms.uCyMoss.value = o.moss;
    if (o.inlay != null) uniforms.uCyInlay.value = INLAY[o.inlay] ?? 0;
    if (o.inlayEvery != null) uniforms.uCyEvery.value = o.inlayEvery;
  }
  set(opts);
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCyW; varying vec3 vCyN;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        {
          vec4 cw = vec4(transformed, 1.0); vec3 cn = objectNormal;
          #ifdef USE_INSTANCING
            cw = instanceMatrix * cw; cn = mat3(instanceMatrix) * cn;
          #endif
          vCyW = (modelMatrix * cw).xyz; vCyN = normalize(mat3(modelMatrix) * cn);
        }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uCyCourse, uCyBase, uCyDim, uCySlab, uCyJoint, uCyWear, uCyMoss, uCyInlay, uCyEvery;
        varying vec3 vCyW; varying vec3 vCyN;
        ${CYCLOPEAN_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 cyN = normalize(vCyN), cyP = vCyW;
        float cyTop = smoothstep(0.55, 0.8, cyN.y);
        vec2 cyT = normalize(vec2(-cyN.z, cyN.x) + 1e-5);
        vec4 cyWl = fpCyclopeanWall(vec2(dot(cyP.xz, cyT), cyP.y - uCyBase), uCyCourse, uCyDim, uCyJoint);
        vec3 cySl = fpCyclopeanSlab(cyP.xz, uCySlab, uCyJoint * 0.6);
        float cyJ = mix(cyWl.x, cySl.x, cyTop), cyA = mix(cyWl.y, cySl.y, cyTop), cyId = mix(cyWl.z, cySl.z, cyTop);
        float cyG = cyFbm(cyP.xz * 0.9 + cyP.y * 0.7), cyG2 = cyVn(cyP.xz * 7.0 + cyP.y * 5.0);
        vec3 cyC = diffuseColor.rgb * (0.82 + 0.3 * cyId) * (0.85 + 0.3 * cyG) * (0.94 + 0.12 * cyG2);
        // worn arrises and joints, deeper with wear
        cyC *= 1.0 - cyA * 0.18 * uCyWear - cyJ * 0.55;
        // rain-streaks down the faces from every course, grime pooled under the joints
        float cyStreak = cyFbm(vec2(dot(cyP.xz, cyT) * 2.6, cyP.y * 0.12)) * (1.0 - cyTop);
        cyC *= 1.0 - smoothstep(0.45, 0.8, cyStreak) * 0.35 * uCyWear;
        // sun-bleached tops; damp, mossy foot and joints
        cyC *= 1.0 + cyTop * 0.12;
        float cyLow = 1.0 - smoothstep(0.0, 3.5, cyP.y - uCyBase);
        float cyMoss = smoothstep(0.5, 0.75, cyFbm(cyP.xz * 0.6 + 3.0) * 0.6 + (cyLow + cyJ * 0.6 + cyTop * 0.3) * uCyMoss * 0.7);
        cyC = mix(cyC, vec3(0.035, 0.045, 0.018), cyMoss * 0.8);
        float cyLich = smoothstep(0.72, 0.78, cyVn(cyP.xz * 3.1 + cyP.y * 2.0) * 0.7 + cyG * 0.4) * (0.4 + cyTop * 0.6);
        cyC = mix(cyC, vec3(0.32, 0.31, 0.24), cyLich * 0.5 * (1.0 - cyMoss));
        // inlay: a bronze channel along some courses (verdigris and black), or black glass in some blocks
        float cyMetal = 0.0, cyGloss = 0.0;
        if (uCyInlay > 0.5 && cyTop < 0.5) {
          float cyRow = floor(cyCourse(max(cyP.y - uCyBase, 0.0), uCyCourse, uCyDim));
          if (uCyInlay < 1.5) {
            float n = cyCourse(max(cyP.y - uCyBase, 0.0), uCyCourse, uCyDim);
            float band = (1.0 - smoothstep(0.04, 0.07, abs(fract(n) - 0.5))) * step(cyH12(vec2(cyRow, 13.1)), uCyEvery);
            vec3 bronze = mix(vec3(0.05, 0.035, 0.02), vec3(0.11, 0.2, 0.15), smoothstep(0.3, 0.7, cyFbm(cyP.xz * 4.0 + cyP.y * 3.0)));
            cyC = mix(cyC, bronze, band); cyMetal = band * 0.6;
          } else {
            float pane = step(cyH12(vec2(cyId * 91.0, 2.0)), uCyEvery) * (1.0 - cyA);
            cyC = mix(cyC, vec3(0.012, 0.012, 0.016), pane); cyGloss = pane;
          }
        }
        diffuseColor.rgb = cyC;
        float cyHeight = -cyJ * 0.8 - cyA * 0.25 * uCyWear + cyG2 * 0.15;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.12, cyGloss); roughnessFactor = mix(roughnessFactor, 0.55, cyMetal);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = max(metalnessFactor, cyMetal);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          float bh = cyHeight * 0.05 * (1.0 - smoothstep(25.0, 90.0, length(vViewPosition)));
          vec3 vp = -vViewPosition, dpx = dFdx(vp), dpy = dFdy(vp);
          float dhx = dFdx(bh), dhy = dFdy(bh);
          vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
          float det = dot(dpx, r1);
          normal = normalize(abs(det) * normal - sign(det) * (dhx * r1 + dhy * r2));
        }`);
  };
  mat.customProgramCacheKey = () => 'fp-cyclopean-v1';
  return { mat, uniforms, set };
}
