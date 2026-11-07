// Atmosphere: patches Three's fog chunks globally so every fogged material gets
// height fog, distance haze and a crimson in-scatter toward the sun. Call installAtmosphere()
// once before any material compiles. The sun does not move, so its direction is baked in.
import * as THREE from 'three';
import { SUN, PALETTE } from './world.js';

export function installAtmosphere() {
  const d = SUN.dir;
  const sunDir = `vec3(${d.x.toFixed(5)}, ${d.y.toFixed(5)}, ${d.z.toFixed(5)})`;
  THREE.ShaderChunk.fog_pars_vertex = `
    #ifdef USE_FOG
      varying float vFogDepth;
      varying vec3 vFogWorldPos;
    #endif`;
  THREE.ShaderChunk.fog_vertex = `
    #ifdef USE_FOG
      vFogDepth = - mvPosition.z;
      #ifdef USE_INSTANCING
        vFogWorldPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
      #else
        vFogWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      #endif
    #endif`;
  THREE.ShaderChunk.fog_pars_fragment = `
    #ifdef USE_FOG
      uniform vec3 fogColor;
      varying float vFogDepth;
      varying vec3 vFogWorldPos;
      #ifdef FOG_EXP2
        uniform float fogDensity;
      #else
        uniform float fogNear;
        uniform float fogFar;
      #endif
      const vec3 FP_SUN_DIR = ${sunDir};
      const vec3 FP_SUN_GLOW = vec3(${hexToVec(PALETTE.sunLight)});
      const vec3 FP_HAZE_AWAY = vec3(${hexToVec('#2a2638')});
      // Height fog: denser near the ground, pooling in the low places.
      float fpHeightFog(vec3 ro, vec3 rd, float dist) {
        float base = 0.0038;  // density at y=0
        float falloff = 0.11;
        float dy = rd.y;
        float f;
        if (abs(dy) < 1e-3) f = base * exp(-ro.y * falloff) * dist;
        else f = base * exp(-ro.y * falloff) * (1.0 - exp(-dy * falloff * dist)) / (dy * falloff);
        return clamp(f, 0.0, 1.0);
      }
    #endif`;
  THREE.ShaderChunk.fog_fragment = `
    #ifdef USE_FOG
      vec3 fpRay = vFogWorldPos - cameraPosition;
      float fpDist = length(fpRay);
      vec3 fpDir = fpRay / max(fpDist, 1e-4);
      #ifdef FOG_EXP2
        float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
      #else
        float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
      #endif
      float hf = fpHeightFog(cameraPosition, fpDir, fpDist);
      float sunAmt = max(dot(fpDir, FP_SUN_DIR), 0.0);
      vec3 haze = mix(FP_HAZE_AWAY, fogColor, 0.55 + 0.45 * sunAmt);
      haze += FP_SUN_GLOW * pow(sunAmt, 10.0) * 0.9 * fogFactor;
      haze += FP_SUN_GLOW * pow(sunAmt, 2.0) * 0.08;
      // ground mist: cold violet-grey, warmed only close to the sun's line, so the low ground does not go to peach dust
      vec3 lowMist = mix(fogColor, vec3(0.28, 0.29, 0.38), 0.5) + FP_SUN_GLOW * pow(sunAmt, 4.0) * 0.16;
      gl_FragColor.rgb = mix( gl_FragColor.rgb, lowMist, hf * 0.78 );
      gl_FragColor.rgb = mix( gl_FragColor.rgb, haze, fogFactor );
    #endif`;
}

function hexToVec(hex) {
  const c = new THREE.Color(hex);
  return `${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)}`;
}
