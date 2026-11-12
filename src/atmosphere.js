// Atmosphere: patches Three's fog chunks globally so every fogged material gets
// height fog, distance haze and a crimson in-scatter toward the sun. Call installAtmosphere()
// once before any material compiles. The sun does not move, so its direction is baked in.
import * as THREE from 'three';
import { SUN, PALETTE } from './world.js';
import { FOG_TIER_GLSL, FOG_CAP } from './v4/kit/fog.js';
import { injectOccultFog } from './v5/occultation.js'; // v5 wonders: AR the Occultation's band in the haze

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
      // v4 systems (BI): fog tiers, range behind range (kit/fog.js). The tier colour is the sky low in that
      // direction (sky.js's horizon, warmed toward the sun), dimmed with the haze while the sun gutters.
      ${FOG_TIER_GLSL}
      const vec3 FP_HAZE = vec3(${hexToVec(PALETTE.haze)});
      const vec3 FP_TIER_AWAY = vec3(${hexToVec(PALETTE.skyHorizonAway)}) * 1.25 + vec3(0.0, 0.004, 0.018);
      const vec3 FP_TIER_SUN = vec3(${hexToVec(PALETTE.skyHorizonSun)});
      const vec3 FP_WALL_AIR = vec3(${hexToVec('#4a4a66')}); // v11: the cool pale air on the walls turned from the sun
      vec3 fpTierCol(vec3 rd, float flick) {
        vec2 fpH = rd.xz; float fpHl = length(fpH); // looking straight up or down there is no horizontal direction
        float toSun = fpHl > 1e-4 ? max(dot(fpH / fpHl, normalize(FP_SUN_DIR.xz)), 0.0) : 0.0;
        float s = max(dot(rd, FP_SUN_DIR), 0.0);
        return mix(FP_TIER_AWAY, FP_TIER_SUN, pow(toSun, 1.6)) * (0.6 + 0.4 * flick) + FP_SUN_GLOW * (pow(s, 6.0) * 0.3 + pow(s, 24.0) * 0.4) * flick;
      }
      // the dome's colour behind (sky.js's gradient and glow, no stars or cloud): toward the sun nothing on the
      // walls outshines the sky behind it, so the ranges there stand as soft silhouettes in the glow
      const vec3 FP_ZENITH = vec3(${hexToVec(PALETTE.skyZenith)});
      vec3 fpSkyBehind(vec3 rd, float flick) {
        float up = clamp(rd.y, 0.0, 1.0), s = max(dot(rd, FP_SUN_DIR), 0.0);
        vec3 horizon = mix(vec3(${hexToVec(PALETTE.skyHorizonAway)}), FP_TIER_SUN, pow(s, 1.6));
        vec3 sky = mix(FP_ZENITH, horizon, pow(1.0 - up, 3.5));
        return sky + FP_SUN_GLOW * (pow(s, 6.0) * 0.55 + pow(s, 24.0) * 0.7) * flick * (0.6 + 0.4 * (1.0 - smoothstep(0.0, 0.35, up)));
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
      fogFactor = min(fogFactor, ${FOG_CAP.toFixed(3)}); // v4 systems: the tiers carry the far haze
      float hf = fpHeightFog(cameraPosition, fpDir, fpDist);
      float sunAmt = max(dot(fpDir, FP_SUN_DIR), 0.0);
      vec3 haze = mix(FP_HAZE_AWAY, fogColor, 0.55 + 0.45 * sunAmt);
      haze += FP_SUN_GLOW * pow(sunAmt, 10.0) * 0.9 * fogFactor;
      haze += FP_SUN_GLOW * pow(sunAmt, 2.0) * 0.08;
      // ground mist: cold violet-grey, warmed only close to the sun's line, so the low ground does not go to peach dust
      vec3 lowMist = mix(fogColor, vec3(0.28, 0.29, 0.38), 0.5) + FP_SUN_GLOW * pow(sunAmt, 4.0) * 0.16;
      gl_FragColor.rgb = mix( gl_FragColor.rgb, lowMist, hf * 0.78 );
      gl_FragColor.rgb = mix( gl_FragColor.rgb, haze, fogFactor );
      float fpFl = dot(fogColor, vec3(1.0)) / dot(FP_HAZE, vec3(1.0));
      // v11: the walls recede in the cold light. Beyond the bowl (world radius past 300 m), by distance from the eye,
      // a cool pale air over everything turned from the sun, so the near wall at 400 m sits behind what stands in
      // front of it, lower in contrast and bluer than the ground at 50 m; toward the sun the glow already does this.
      float fpWallR = length(vFogWorldPos.xz);
      if (fpWallR > 300.0) {
        float fpHl = length(fpDir.xz);
        float fpAway = fpHl > 1e-4 ? 1.0 - pow(max(dot(fpDir.xz / fpHl, normalize(FP_SUN_DIR.xz)), 0.0), 1.5) : 1.0;
        float fpWall = 0.3 * smoothstep(300.0, 345.0, fpWallR) * (1.0 - smoothstep(520.0, 600.0, fpWallR)) * smoothstep(90.0, 430.0, fpDist) * fpAway;
        fpWall *= 1.0 - smoothstep(0.3, 0.8, max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b))); // lamps and lit windows on the wall keep their warmth
        gl_FragColor.rgb = mix(gl_FragColor.rgb, FP_WALL_AIR * (0.55 + 0.45 * fpFl), fpWall);
      }
      float fpTier = fpTierAmt(vFogWorldPos);
      if (fpTier > 0.0) {
        gl_FragColor.rgb = mix(gl_FragColor.rgb, fpTierCol(fpDir, fpFl), fpTier);
        gl_FragColor.rgb = min(gl_FragColor.rgb, max(fpSkyBehind(fpDir, fpFl) * 0.88, FP_HAZE * 1.4));
      }
    #endif`;
  injectOccultFog(THREE); // v5 wonders: AR the Occultation, the band of shadow in the haze (src/v5/occultation.js)
}

function hexToVec(hex) {
  const c = new THREE.Color(hex);
  return `${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)}`;
}
