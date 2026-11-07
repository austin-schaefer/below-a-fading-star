// Materials for the ruins, all made in-shader (no textures):
//  - stone: noise grain, mortar courses with relief, lichen and moss creeping on north and low faces,
//    rust on iron and streaked down the stone beneath it, glyph and window glow via aEmit.
//  - banner: tattered cloth rippling in a vertex shader, ember-and-black heraldry, backlit by the sun.
//  - bone: plain, a little waxy.
//  - pit: an interior-mapped flooded shaft (walls, a broad stair, black water) drawn on one quad.
import * as THREE from 'three';

export const RUST_SLOTS = 12;

const NOISE_GLSL = `
  float fpH13(vec3 p3){ p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
  float fpH12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float fpVn(vec3 p){
    vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    float a = fpH13(i), b = fpH13(i + vec3(1,0,0)), c = fpH13(i + vec3(0,1,0)), d = fpH13(i + vec3(1,1,0));
    float e = fpH13(i + vec3(0,0,1)), g = fpH13(i + vec3(1,0,1)), h = fpH13(i + vec3(0,1,1)), k = fpH13(i + vec3(1,1,1));
    return mix(mix(mix(a,b,f.x), mix(c,d,f.x), f.y), mix(mix(e,g,f.x), mix(h,k,f.x), f.y), f.z);
  }
  float fpFbm(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++){ s += a * fpVn(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s / 0.875; }
`;

export function makeStoneMaterial(ctx) {
  const uniforms = {
    uSTime: { value: 0 },
    uGlyph: { value: 1 },
    uWindow: { value: 1 },
    uRust: { value: Array.from({ length: RUST_SLOTS }, () => new THREE.Vector4(0, 0, 0, 0)) },
  };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0.0 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec2 aMuv; attribute vec4 aAux; attribute vec4 aEmit; attribute float aLow;
        varying vec3 vSW; varying vec3 vSN; varying vec2 vSU; varying vec4 vSA; varying vec4 vSE; varying float vSL;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        {
          vec4 sw = vec4(transformed, 1.0);
          vec3 sn = objectNormal;
          #ifdef USE_INSTANCING
            sw = instanceMatrix * sw;
            sn = mat3(instanceMatrix) * sn;
          #endif
          sw = modelMatrix * sw;
          vSW = sw.xyz; vSN = normalize(mat3(modelMatrix) * sn);
          vSU = aMuv; vSA = aAux; vSE = aEmit; vSL = aLow;
        }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uSTime, uGlyph, uWindow; uniform vec4 uRust[${RUST_SLOTS}];
        varying vec3 vSW; varying vec3 vSN; varying vec2 vSU; varying vec4 vSA; varying vec4 vSE; varying float vSL;
        ${NOISE_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 sP = vSW; vec3 sN = normalize(vSN);
        float sDist = length(vViewPosition);
        float sNear = 1.0 - smoothstep(18.0, 70.0, sDist);
        float g1 = fpFbm(sP * 2.3);
        float g2 = fpVn(sP * 13.0) * 0.6 + fpVn(sP * 37.0) * 0.4;
        float gBig = fpFbm(sP * 0.21 + 4.0);
        float mortar = 0.0, blockTone = 0.0, chipEdge = 0.0;
        if (vSA.x > 0.0) {
          vec2 cu = vSU / vSA.x;
          float row = floor(cu.y);
          float bl = 1.7 + 1.1 * fpH12(vec2(row, 3.7));
          float cx = cu.x / bl + fpH12(vec2(row, 9.1)) * 3.0;
          float id = floor(cx);
          vec2 f = vec2(fract(cx) * bl, fract(cu.y));
          float e = min(min(f.x, bl - f.x), min(f.y, 1.0 - f.y));
          float mw = 0.02 + 0.05 * g2 * g2 + 0.05 * smoothstep(0.55, 0.8, g1);
          mortar = (1.0 - smoothstep(mw, mw + 0.035, e)) * (0.55 + 0.45 * fpVn(sP * 4.0));
          chipEdge = 1.0 - smoothstep(mw + 0.02, mw + 0.16, e);
          blockTone = fpH12(vec2(id, row) + 0.37) - 0.5;
        } else if (vSA.x < 0.0) {
          // paving stone: a carved hexagonal ring on its face, worn shallow
          vec2 q = abs(vSU);
          float hd = max(q.x, q.x * 0.5 + q.y * 0.866);
          float rr = -vSA.x;
          vec2 tileC = floor((sP.xz - vSU) * 1.5 + 0.5);
          float carved = step(0.62, fpH12(tileC));
          mortar = carved * (1.0 - smoothstep(0.012, 0.03, abs(hd - rr))) * smoothstep(0.6, 0.9, sN.y) * (0.5 + 0.5 * fpVn(sP * 3.0));
        }
        float iron = vSA.z;
        vec3 sc = diffuseColor.rgb;
        sc *= 1.0 + blockTone * 0.22 + (g1 - 0.5) * 0.5 + (gBig - 0.5) * 0.3 + (g2 - 0.5) * 0.12;
        sc *= mix(1.0, 0.62, mortar);
        // weather: sun-bleached tops, damp feet
        float sUp = smoothstep(0.55, 0.95, sN.y);
        float sNorth = smoothstep(0.15, -0.85, sN.z);
        float sLow = 1.0 - smoothstep(0.0, 2.2, vSL);
        sc *= mix(0.62, 1.0, smoothstep(-0.2, 1.4, vSL));
        sc *= 1.0 + sUp * 0.1;
        // moss on north and low faces and in the joints; pale crust lichen; the odd orange lichen
        float mossAmt = vSA.y * (sNorth * 0.75 + sUp * 0.5 + sLow * 0.85 + mortar * 0.45);
        float mN = fpFbm(sP * 0.9 + 7.0);
        float moss = smoothstep(0.42, 0.72, mossAmt * 0.62 + (mN - 0.5) * 0.9 + (g2 - 0.5) * 0.25 + 0.1);
        moss *= 1.0 - iron;
        vec3 mossC = mix(vec3(0.030, 0.042, 0.014), vec3(0.085, 0.090, 0.026), g1);
        sc = mix(sc, mossC, moss * 0.92);
        float lich = smoothstep(0.70, 0.76, fpVn(sP * 5.0 + 3.0) * 0.8 + mN * 0.35) * vSA.y * (0.35 + sNorth * 0.4 + sUp * 0.4) * (1.0 - moss);
        sc = mix(sc, vec3(0.30, 0.29, 0.20), clamp(lich, 0.0, 1.0) * 0.7);
        float orl = smoothstep(0.83, 0.86, fpVn(sP * 7.0 + 11.0)) * sUp * vSA.y * (1.0 - moss);
        sc = mix(sc, vec3(0.42, 0.13, 0.03), orl * 0.75);
        // iron: black, crusted with rust
        if (iron > 0.0) {
          float rn = fpFbm(sP * 6.0);
          vec3 ironC = mix(vec3(0.025, 0.02, 0.018), vec3(0.22, 0.075, 0.025), smoothstep(0.35, 0.7, rn));
          sc = mix(sc, ironC, iron);
        }
        // rust streaks running down from iron fittings
        float streak = 0.0;
        for (int i = 0; i < ${RUST_SLOTS}; i++) {
          vec4 s = uRust[i];
          if (s.w <= 0.0) continue;
          vec3 d = sP - s.xyz;
          float below = -d.y;
          if (below < -0.06 || below > s.w) continue;
          float w = 0.05 + below * 0.07;
          float hz = length(d.xz) + (fpVn(vec3(sP.x * 30.0, sP.y * 1.5, sP.z * 30.0)) - 0.5) * 0.06;
          float lines = 0.55 + 0.9 * fpVn(vec3(sP.x * 26.0 + sP.z * 26.0, sP.y * 1.2, 1.0));
          streak += exp(-hz * hz / (w * w)) * pow(1.0 - clamp(below / s.w, 0.0, 1.0), 1.4) * lines;
        }
        sc = mix(sc, vec3(0.20, 0.06, 0.018), clamp(streak, 0.0, 1.0) * 0.8 * (1.0 - iron));
        // wet stone: dark and glossy
        sc *= 1.0 - vSA.w * 0.55;
        diffuseColor.rgb = sc;
        float sHeight = g1 * 0.7 + g2 * 0.22 - mortar * 0.6 - chipEdge * 0.3 + moss * 0.3;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.32, vSA.w);
        roughnessFactor = mix(roughnessFactor, 0.6, iron);
        roughnessFactor = min(1.0, roughnessFactor + moss * 0.05);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = iron * 0.45;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          // relief from grain and mortar so the low sun rakes across the courses
          float bh = sHeight * 0.014 * sNear;
          vec3 vp = -vViewPosition;
          vec3 dpx = dFdx(vp), dpy = dFdy(vp);
          float dhx = dFdx(bh), dhy = dFdy(bh);
          vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
          float det = dot(dpx, r1);
          vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
          normal = normalize(abs(det) * normal - grad);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (vSE.r + vSE.g + vSE.b > 0.0) {
          float ch = vSE.w;
          float pulse = ch < 0.5 ? uGlyph * (0.85 + 0.25 * sin(uSTime * 0.31 + sP.x * 0.21 + sP.z * 0.17)) : uWindow;
          totalEmissiveRadiance += vSE.rgb * pulse * (0.8 + 0.4 * g2);
        }`);
  };
  mat.customProgramCacheKey = () => 'fp-stone-v1';
  return { mat, uniforms };
}

// Banners: geometry carries aBan (u from the hoist 0..1, v bottom..top 0..1, phase, style) and
// aAlong (unit vector from hoist to fly). Style 0: the Keep's ember and black. Style 1: the Armiger's crimson.
const BANNER_COMMON = `
  uniform float uBTime;
  attribute vec4 aBan; attribute vec3 aAlong;
  varying vec2 vBan; varying float vBStyle; varying vec3 vBW;
  void fpBanner(out vec3 disp, out vec3 nrm) {
    vec3 A = normalize(aAlong);
    vec3 S = normalize(cross(A, vec3(0.0, 1.0, 0.0)));
    float u = aBan.x, v = aBan.y, ph = aBan.z, t = uBTime;
    float a1 = u * 5.2 - t * 2.4 + ph + v * 0.9;
    float a2 = u * 11.0 - t * 4.6 + ph * 1.7 - v * 2.3;
    float gust = 0.75 + 0.25 * sin(t * 0.37 + ph) * sin(t * 0.23 + ph * 2.0);
    float amp = u * 0.34 * gust;
    float s = amp * (sin(a1) + 0.32 * sin(a2));
    float dsdu = 0.34 * gust * (sin(a1) + 0.32 * sin(a2)) + amp * (5.2 * cos(a1) + 0.32 * 11.0 * cos(a2));
    disp = S * s - A * (u * u * 0.18 * (1.0 - 0.5 * abs(sin(a1)))) - vec3(0.0, u * u * (0.22 - 0.12 * gust), 0.0);
    nrm = normalize(S - A * dsdu / 2.8);
  }
`;
const BANNER_FRAG_COMMON = `
  varying vec2 vBan; varying float vBStyle; varying vec3 vBW;
  ${NOISE_GLSL}
  float fpBannerAlpha(vec2 b, float st) {
    float ragged = st < 0.5 ? 1.0 : 0.45;
    // the fly end is torn into tongues
    float cut = 1.0 - ragged * (0.12 + 0.2 * fpVn(vec3(b.y * 7.0, 1.3, st * 3.0 + 0.5)) + 0.1 * pow(abs(sin(b.y * 9.0 + st)), 3.0));
    float a = step(b.x, cut);
    // holes, mostly toward the fly
    float hn = fpFbm(vec3(b * vec2(6.0, 4.5), st * 5.0 + 2.0));
    a *= step(hn, 0.72 - ragged * 0.12 * b.x + (1.0 - ragged) * 0.12);
    // frayed hem
    a *= step(0.02 + ragged * 0.07 * fpVn(vec3(b.x * 26.0, 0.5, st)), b.y);
    a *= step(b.y, 0.995 - ragged * 0.03 * fpVn(vec3(b.x * 20.0, 4.0, st)));
    return a;
  }
`;

export function makeBannerMaterials(ctx) {
  const uniforms = { uBTime: { value: 0 } };
  const sunDir = ctx.sun.vec || new THREE.Vector3(ctx.sun.dir.x, ctx.sun.dir.y, ctx.sun.dir.z);
  const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.92, metalness: 0, alphaTest: 0.5, color: 0xffffff });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.uniforms.uBSun = { value: sunDir };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${BANNER_COMMON}`)
      .replace('#include <beginnormal_vertex>', `vec3 bDisp, bNrm; fpBanner(bDisp, bNrm);\nvec3 objectNormal = bNrm;\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3( tangent.xyz );\n#endif`)
      .replace('#include <begin_vertex>', `vec3 transformed = position + bDisp;\nvBan = aBan.xy; vBStyle = aBan.w; vBW = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform vec3 uBSun;\n${BANNER_FRAG_COMMON}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec2 b = vBan; float st = vBStyle;
          vec2 q = vec2(b.x * 1.7, b.y);           // roughly metres-proportional
          vec2 c = q - vec2(0.62, 0.5);
          // hexagon distance
          vec2 ac = abs(c); float hexd = max(ac.x * 0.866 + ac.y * 0.5, ac.y);
          vec3 col;
          if (st < 0.5) {
            vec3 black = vec3(0.018, 0.012, 0.011), ember = vec3(0.52, 0.075, 0.012);
            col = black;
            float bord = step(min(min(b.y, 1.0 - b.y), b.x * 1.7), 0.07);
            float ring = step(abs(hexd - 0.27), 0.035);
            float sun = step(length(c), 0.11);
            float rays = step(0.15, length(c)) * step(length(c), 0.22) * step(0.6, sin(atan(c.y, c.x) * 8.0));
            col = mix(col, ember, max(max(bord, ring), max(sun, rays)));
          } else {
            vec3 crimson = vec3(0.24, 0.018, 0.016), black = vec3(0.016, 0.01, 0.01), bone = vec3(0.6, 0.52, 0.38);
            col = crimson;
            col = mix(col, black, step(hexd, 0.25));
            float r = length(c), a = atan(c.y, c.x);
            float star = step(r, 0.05 + 0.07 * pow(abs(cos(a * 4.0)), 8.0));
            col = mix(col, bone, star);
            col = mix(col, black, step(abs(b.y - 0.5), 0.5) * step(b.x * 1.7, 0.09));
          }
          // age: stains, sun-fade toward the fly, grime at the hem
          float stain = fpFbm(vec3(b * vec2(5.0, 3.0), st + 9.0));
          col *= 0.7 + 0.5 * stain;
          col = mix(col, col * 0.6 + vec3(0.05, 0.03, 0.025), b.x * 0.45);
          col *= 0.75 + 0.25 * smoothstep(0.0, 0.25, b.y);
          diffuseColor.rgb = col;
          diffuseColor.a = fpBannerAlpha(b, st);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          // light through the cloth when it hangs between you and the sun
          vec3 vd = normalize(vBW - cameraPosition);
          float back = pow(max(dot(vd, uBSun), 0.0), 4.0);
          totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.45, 0.25) * back * 1.6;
        }`);
  };
  mat.customProgramCacheKey = () => 'fp-banner-v1';

  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide, alphaTest: 0.5 });
  depth.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${BANNER_COMMON}`)
      .replace('#include <begin_vertex>', `vec3 bDisp, bNrm; fpBanner(bDisp, bNrm);\nvec3 transformed = position + bDisp;\nvBan = aBan.xy; vBStyle = aBan.w; vBW = vec3(0.0);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${BANNER_FRAG_COMMON}`)
      .replace('#include <alphatest_fragment>', `diffuseColor.a = fpBannerAlpha(vBan, vBStyle);\n#include <alphatest_fragment>`);
  };
  depth.customProgramCacheKey = () => 'fp-banner-depth-v1';
  return { mat, depth, uniforms };
}

export function makeBoneMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72, metalness: 0 });
}

// The flooded shaft of the Sunken Court, interior-mapped onto a single quad at its lip.
export function makePitMaterial(ctx, box) {
  const L = ctx.lights;
  const uniforms = {
    uMin: { value: new THREE.Vector3(box.x0, box.water, box.z0) },
    uMax: { value: new THREE.Vector3(box.x1, box.top, box.z1) },
    uTread: { value: box.tread }, uRise: { value: box.rise }, uStairX: { value: new THREE.Vector2(box.sx0, box.sx1) },
    uSunDir: { value: ctx.sun.vec.clone() },
    uSunCol: { value: new THREE.Color() }, uSky: { value: new THREE.Color() }, uGround: { value: new THREE.Color() }, uAmb: { value: new THREE.Color() },
    uPTime: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]),
    fog: true,
    vertexShader: `
      #include <common>
      #include <fog_pars_vertex>
      varying vec3 vW;
      void main() {
        vec3 transformed = position;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vW = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <common>
      #include <fog_pars_fragment>
      uniform vec3 uMin, uMax, uSunDir, uSunCol, uSky, uGround, uAmb;
      uniform vec2 uStairX;
      uniform float uTread, uRise, uPTime;
      varying vec3 vW;
      ${NOISE_GLSL}
      float inside(vec3 q, float m) { return step(uMin.x + m, q.x) * step(q.x, uMax.x - m) * step(uMin.z + m, q.z) * step(q.z, uMax.z - m); }
      void main() {
        vec3 P = vW;
        vec3 rd = normalize(P - cameraPosition);
        float tB = 1e6; vec3 nB = vec3(0.0, 1.0, 0.0); float kind = 0.0;
        if (rd.x > 0.0) { float t = (uMax.x - P.x) / rd.x; if (t < tB) { tB = t; nB = vec3(-1.0, 0.0, 0.0); } }
        else if (rd.x < 0.0) { float t = (uMin.x - P.x) / rd.x; if (t < tB) { tB = t; nB = vec3(1.0, 0.0, 0.0); } }
        if (rd.z > 0.0) { float t = (uMax.z - P.z) / rd.z; if (t < tB) { tB = t; nB = vec3(0.0, 0.0, -1.0); } }
        else if (rd.z < 0.0) { float t = (uMin.z - P.z) / rd.z; if (t < tB) { tB = t; nB = vec3(0.0, 0.0, 1.0); } }
        if (rd.y < 0.0) { float t = (uMin.y - P.y) / rd.y; if (t < tB) { tB = t; nB = vec3(0.0, 1.0, 0.0); kind = 1.0; } }
        // the broad stair down from the south lip, step by step until it drowns
        for (int k = 0; k < 14; k++) {
          float yk = uMax.y - float(k + 1) * uRise;
          if (yk < uMin.y) break;
          float za = uMax.z - float(k + 1) * uTread, zb = uMax.z - float(k) * uTread;
          if (rd.y < 0.0) {
            float t = (yk - P.y) / rd.y; vec3 h = P + rd * t;
            if (t > 0.0 && t < tB && h.z >= za && h.z <= zb && h.x >= uStairX.x && h.x <= uStairX.y) { tB = t; nB = vec3(0.0, 1.0, 0.0); kind = 2.0; }
          }
          if (rd.z > 0.0) {
            float t = (za - P.z) / rd.z; vec3 h = P + rd * t;
            if (t > 0.0 && t < tB && h.y <= yk + uRise && h.y >= yk && h.x >= uStairX.x && h.x <= uStairX.y) { tB = t; nB = vec3(0.0, 0.0, -1.0); kind = 2.0; }
          }
          // the stair's open side, if it does not span the whole shaft
          if (rd.x > 0.0 && uStairX.x > uMin.x + 0.01) {
            float t = (uStairX.x - P.x) / rd.x; vec3 h = P + rd * t;
            if (t > 0.0 && t < tB && h.y <= yk && h.z >= za && h.z <= zb) { tB = t; nB = vec3(-1.0, 0.0, 0.0); kind = 2.0; }
          }
        }
        vec3 H = P + rd * tB;
        float D = uMax.y - uMin.y;
        float depth01 = clamp((uMax.y - H.y) / D, 0.0, 1.0);
        // masonry
        vec2 st = abs(nB.x) > 0.5 ? H.zy : (abs(nB.z) > 0.5 ? H.xy : H.xz);
        float course = 0.55;
        float row = floor(st.y / course);
        float bl = 1.2 + 0.9 * fpH12(vec2(row, 2.0));
        float cx = st.x / bl + fpH12(vec2(row, 5.0)) * 3.0;
        vec2 f = vec2(fract(cx) * bl, fract(st.y / course) * course);
        float e = min(min(f.x, bl - f.x), min(f.y, course - f.y));
        float mortar = 1.0 - smoothstep(0.02, 0.05, e);
        float g = fpFbm(H * 2.0);
        vec3 alb = vec3(0.11, 0.095, 0.085) * (0.75 + 0.5 * fpH12(vec2(floor(cx), row))) * (0.7 + 0.6 * g) * mix(1.0, 0.45, mortar);
        if (kind > 1.5) alb *= 1.15;
        // slime and the tide line
        float aboveW = H.y - uMin.y;
        float slime = 1.0 - smoothstep(0.0, 1.4 + 0.6 * g, aboveW);
        alb = mix(alb, vec3(0.025, 0.035, 0.015), slime * 0.85);
        alb *= 1.0 - 0.5 * smoothstep(0.1, 0.0, abs(aboveW - 0.45 - 0.1 * g));
        // light: the low sun only reaches what the lip does not hide
        float lit = 0.0;
        if (uSunDir.y > 0.0) { float t = (uMax.y - H.y) / uSunDir.y; vec3 Q = H + uSunDir * t; lit = inside(Q, -0.02); }
        float ndl = max(dot(nB, uSunDir), 0.0);
        vec3 hemi = mix(uGround, uSky, nB.y * 0.5 + 0.5);
        float ao = mix(0.22, 1.0, pow(1.0 - depth01, 1.5));
        vec3 col = alb * RECIPROCAL_PI * (uSunCol * ndl * lit + (hemi + uAmb) * ao);
        if (kind > 0.5 && kind < 1.5) {
          // black water: a faint sky in it where the reflected ray clears the lip
          vec2 rip = vec2(fpVn(vec3(H.xz * 1.7, uPTime * 0.25)) - 0.5, fpVn(vec3(H.xz * 1.7 + 7.0, uPTime * 0.25)) - 0.5) * 0.06;
          vec3 wn = normalize(vec3(rip.x, 1.0, rip.y));
          vec3 rr = reflect(rd, wn);
          float fres = 0.02 + 0.98 * pow(1.0 - max(dot(-rd, wn), 0.0), 5.0);
          float t2 = (uMax.y - H.y) / max(rr.y, 1e-3);
          float sees = inside(H + rr * t2, 0.0);
          float sunA = max(dot(rr, uSunDir), 0.0);
          vec3 skyR = mix(vec3(0.03, 0.012, 0.03), vec3(0.22, 0.05, 0.025), sunA * sunA);
          col = vec3(0.0025, 0.003, 0.004) + fres * mix(vec3(0.004, 0.004, 0.006), skyR, sees) * 1.4;
        }
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  Object.assign(mat.uniforms, uniforms);
  function update(dt, t) {
    uniforms.uPTime.value = t;
    uniforms.uSunCol.value.copy(L.sun.color).multiplyScalar(L.sun.intensity);
    uniforms.uSky.value.copy(L.hemi.color).multiplyScalar(L.hemi.intensity);
    uniforms.uGround.value.copy(L.hemi.groundColor).multiplyScalar(L.hemi.intensity);
    uniforms.uAmb.value.copy(L.ambient.color).multiplyScalar(L.ambient.intensity);
  }
  return { mat, update };
}
