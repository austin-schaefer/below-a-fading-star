// GLSL snippets shared by the particle shaders.
// fogPars: the atmosphere's fog declarations (uniforms, varyings, fpHeightFog).
export const fogPars = '#include <fog_pars_fragment>';
// fogAtten: for additive sprites, which must dim into the haze rather than add haze colour.
export const fogAtten = `
  #ifdef USE_FOG
    vec3 fpR = vFogWorldPos - cameraPosition;
    float fpL = length(fpR);
    float fpF = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    float fpH = fpHeightFog(cameraPosition, fpR / max(fpL, 1e-4), fpL);
    float fogDistAtten = 1.0 - fpF;
    float fogAtten = fogDistAtten * (1.0 - fpH * 0.7);
  #else
    float fogDistAtten = 1.0;
    float fogAtten = 1.0;
  #endif`;
// a soft round sprite falloff for gl_PointCoord
export const softDot = `
  float softDot(vec2 pc) {
    float r = length(pc - 0.5) * 2.0;
    float s = 1.0 - smoothstep(0.0, 1.0, r);
    return s * s;
  }`;
