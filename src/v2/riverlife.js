// v2 river life, along the Tumbling Water:
//   G  the Salt-Pedlars: finger-high hooded riders on dragonflies, darting and hovering over the river from
//      below the Cutting down to the mouth and out over the fen's edge, keeping a polite distance, leaving
//      flecks of salt where they pause. One instanced draw (wing blur and rider bob in the vertex shader),
//      one Points draw for the flecks.
//   V  the Wrong Colour: a light of unsettleable hue in a still basin off the river (the basin is carved in
//      terrain.js, in its marked block). A surface patch with its own shader, a halo over it, and the one
//      PointLight this module adds. Brightens while the sun gutters.
//   the fall's rumble zone (ctx.river.rumble, enter/leave cues) and a drift of spray at the fall's foot.
// Five draw calls, one PointLight. Exposes ctx.pedlars, ctx.wrongColour, ctx.river.rumble.
// Names are [Proposed]. Follows the module contract in README.md.
import * as THREE from 'three';
import { Mesher } from '../fauna/geo.js';
import { meshHeightSampler } from '../water/river.js';
import { hyp } from '../noise.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const fract = (x) => x - Math.floor(x);

// the beat of the pedlars, in metres downstream from the Speculum (s): from below the Cutting at (183,243)
// to the mouth at (134,211), s≈95, and on over the fen's slow water
const S_FROM = 33, S_TO = 124;
const MAX_GLINTS = 48;

// ---------------------------------------------------------------- shared GLSL
const HSV = /* glsl */`
  vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
  }`;
// additive sprites dim into the haze rather than adding haze colour (as particles.js does)
const FOG_ATTEN = /* glsl */`
  #ifdef USE_FOG
    vec3 fpR = vFogWorldPos - cameraPosition;
    float fpL = length(fpR);
    float fpF = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    float fogAtten = (1.0 - fpF) * (1.0 - fpHeightFog(cameraPosition, fpR / max(fpL, 1e-4), fpL) * 0.7);
  #else
    float fogAtten = 1.0;
  #endif`;

// ---------------------------------------------------------------- G: the pedlar's mesh
// One mesh: dragonfly (part 0), four wings drawn twice at different stroke phases (part 1), the rider, his
// pack and goad (part 2). Metres; forward +z, up +y. Span 14 cm, the hunched rider 3.5 cm on the thorax; the
// instances draw it 2.2x, so ~30 cm across with a rider a finger high.
function pedlarGeometry() {
  const pos = [], nrm = [], col = [], part = [], wing = [], idx = [];
  const add = (M, part0, colourAt) => {
    const g = M.geometry();
    const base = pos.length / 3, P = g.attributes.position, N = g.attributes.normal;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      pos.push(x, y, z); nrm.push(N.getX(i), N.getY(i), N.getZ(i));
      const c = colourAt(x, y, z); col.push(c[0], c[1], c[2]);
      part.push(part0); wing.push(0, 0, 0, 0);
    }
    const I = g.index.array;
    for (let i = 0; i < I.length; i++) idx.push(base + I[i]);
  };
  const hex = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };

  // the dragonfly: great eyes, a thick thorax, a long banded abdomen
  {
    const M = new Mesher();
    M.blob(0, 0.0005, 0.0125, 0.0058, 0.0068, 0.0125, 8, 6);                   // thorax
    M.blob(0, 0.001, 0.0305, 0.0048, 0.0046, 0.0042, 8, 5);                    // head
    M.blob(0.0042, 0.0022, 0.033, 0.0036, 0.0042, 0.0036, 6, 4);               // eyes
    M.blob(-0.0042, 0.0022, 0.033, 0.0036, 0.0042, 0.0036, 6, 4);
    const ab = [], rad = [];
    for (let k = 0; k <= 10; k++) { const f = k / 10; ab.push([0, -0.0005 - f * 0.002 + f * f * 0.0035, -0.001 - f * 0.07]); rad.push([0.0034 - f * 0.0014 + (k === 10 ? -0.0015 : 0) + (k === 1 ? 0.0006 : 0), 0.0032 - f * 0.0012 + (k === 10 ? -0.0015 : 0)]); }
    M.loft(ab, rad, 6);
    // legs folded under the thorax
    for (const s of [1, -1]) for (const z of [0.006, 0.013, 0.02]) M.loft([[0.003 * s, -0.004, z], [0.006 * s, -0.008, z + 0.002], [0.004 * s, -0.011, z + 0.006]], [0.0006, 0.0005, 0.0003], 3, 0, false);
    const bronze = hex('#33402c'), band = hex('#6d6243'), eye = hex('#2a1814');
    add(M, 0, (x, y, z) => {
      if (z > 0.028 && Math.abs(x) > 0.002 && y > -0.001) return eye;
      if (z < -0.004) return fract(-z / 0.0075) < 0.22 ? band : bronze;
      return bronze;
    });
  }
  // the rider: hunched, hooded, astride the thorax; a pack on his back and a goad held forward
  {
    const M = new Mesher();
    M.loft([[0, 0.0055, 0.004], [0, 0.016, 0.0075], [0, 0.025, 0.0125], [0, 0.0285, 0.0165]], [[0.0068, 0.0058], [0.0062, 0.0055], [0.0052, 0.0048], [0.0035, 0.0033]], 7);       // cloak over the hunched back
    M.blob(0, 0.03, 0.0195, 0.0046, 0.0049, 0.0058, 7, 5);                     // hood
    M.loft([[0, 0.032, 0.0155], [0, 0.0355, 0.0105], [0, 0.0365, 0.007]], [0.0026, 0.0014, 0.0003], 5); // the hood's peak, falling back
    M.loft([[0.0052, 0.007, 0.006], [0.0072, 0.0015, 0.0095], [0.0062, -0.003, 0.013]], [0.0018, 0.0015, 0.0011], 4);    // legs astride
    M.loft([[-0.0052, 0.007, 0.006], [-0.0072, 0.0015, 0.0095], [-0.0062, -0.003, 0.013]], [0.0018, 0.0015, 0.0011], 4);
    M.loft([[0.0045, 0.0225, 0.0125], [0.006, 0.0165, 0.0185], [0.0055, 0.0145, 0.0215]], [0.0017, 0.0014, 0.0012], 4);  // arms to the goad
    M.loft([[-0.0045, 0.0225, 0.0125], [-0.002, 0.0175, 0.0195], [0.003, 0.0148, 0.022]], [0.0017, 0.0014, 0.0012], 4);
    const salt = hex('#cfc8b6'), salt2 = hex('#a9a291'), face = hex('#120e0c');
    add(M, 2, (x, y, z) => {
      if (y > 0.026 && y < 0.032 && z > 0.0225 && Math.abs(x) < 0.003) return face;   // the dark of the hood's mouth
      return y < 0.012 ? salt2 : salt;
    });
    const P = new Mesher();
    P.blob(0, 0.021, 0.0025, 0.0062, 0.0068, 0.0045, 6, 4);                    // pack
    P.loft([[-0.0072, 0.0275, 0.003], [0.0072, 0.0275, 0.003]], [0.0022, 0.0022], 6);                                      // a bedroll across it
    P.blob(0.0058, 0.016, 0.0005, 0.0022, 0.0028, 0.002, 5, 3);                // a pouch
    const dun = hex('#7a6748'), dun2 = hex('#5a4a34');
    add(P, 2, (x, y) => (y > 0.025 ? dun2 : dun));
    const G = new Mesher();
    G.loft([[0.003, 0.0105, 0.012], [0.0055, 0.0145, 0.0215], [0.0095, 0.0225, 0.04], [0.011, 0.026, 0.0485]], [0.0008, 0.0008, 0.0007, 0.0004], 4);
    G.blob(0.0112, 0.0265, 0.0495, 0.0013, 0.0013, 0.0016, 5, 3);             // a pale knob of salt at its tip
    const wood = hex('#3b2f25'), knob = hex('#e8e4d8');
    add(G, 2, (x, y, z) => (z > 0.047 ? knob : wood));
  }
  // wings: fore and hind pairs, each drawn twice (two stroke phases) so the beat reads as a blur
  {
    const ROOT_Y = 0.0045;
    const W = [
      { z: 0.0155, span: 0.068, chord: 0.0135, hind: 0 },
      { z: 0.0075, span: 0.065, chord: 0.0175, hind: 1 },
    ];
    const SEG = 6;
    for (const layer of [0, 1]) for (const w of W) for (const side of [1, -1]) {
      const base = pos.length / 3;
      for (let k = 0; k <= SEG; k++) {
        const f = k / SEG;
        const x = side * (0.003 + w.span * f);
        // chord: narrow at the root, broadest a third out, rounded at the tip; the leading edge nearly straight
        const ch = w.chord * (0.55 + 0.75 * Math.sin(Math.min(1, f * 1.35) * Math.PI * 0.62)) * (1 - Math.pow(f, 6) * 0.75);
        const lead = w.z + 0.0015 * Math.sin(f * Math.PI) - f * 0.003, trail = lead - ch;
        for (const [zz, c] of [[lead, 0], [trail, 1]]) {
          pos.push(x, ROOT_Y + f * 0.002, zz); nrm.push(0, 1, 0); col.push(0.86, 0.87, 0.82); part.push(1);
          wing.push(side, w.hind, layer, f + c * 2); // w: span fraction, +2 on the trailing edge
        }
      }
      for (let k = 0; k < SEG; k++) { const a = base + k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  g.setAttribute('aWing', new THREE.Float32BufferAttribute(wing, 4));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

function pedlarMaterial(uTime) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.08, transparent: true, side: THREE.DoubleSide });
  m.userData = { uSunView: { value: new THREE.Vector3(0, 0, -1) }, uSunCol: { value: new THREE.Color('#ffb084') }, uFlicker: { value: 1 } };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime; sh.uniforms.uSunView = m.userData.uSunView; sh.uniforms.uSunCol = m.userData.uSunCol; sh.uniforms.uFlicker = m.userData.uFlicker;
    const motion = /* glsl */`
      // aPh: x phase, y beat rate (Hz), z hover (0 darting .. 1 holding), w lean
      float ph = aPh.x;
      if (aPart > 0.5 && aPart < 1.5) {
        // a wing: a fast stroke about the body's axis at its root, hind pair a little behind the fore
        float side = aWing.x;
        float th = 0.18 + 0.62 * sin(fract(uTime * aPh.y) * 6.2832 + ph + aWing.y * 1.9 + aWing.z * 2.4);
        th *= side;
        float c = cos(th), s = sin(th);
        vec3 r0 = vec3(side * 0.003, 0.0045, 0.0);
        vec3 q = P - r0;
        P = r0 + vec3(q.x * c - q.y * s, q.x * s + q.y * c, q.z);
        Nn = vec3(Nn.x * c - Nn.y * s, Nn.x * s + Nn.y * c, Nn.z);
      } else if (aPart > 1.5) {
        // the rider sways with the insect's hover and leans into a dart
        float sway = sin(uTime * 2.3 + ph) * 0.07 * aPh.z + aPh.w;
        float c = cos(sway), s = sin(sway);
        vec3 q = P - vec3(0.0, 0.006, 0.008);
        P = vec3(0.0, 0.006, 0.008) + vec3(q.x, q.y * c - q.z * s, q.y * s + q.z * c);
        P.y += sin(uTime * 7.0 + ph * 3.0) * 0.0007;
      } else if (P.z < -0.004) {
        // the abdomen flexes a little
        P.y += sin(uTime * 2.6 + ph) * 0.0025 * (-P.z / 0.07) * (-P.z / 0.07);
      }`;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aPart; attribute vec4 aWing; attribute vec4 aPh;
        uniform float uTime;
        varying float vPart; varying vec2 vWuv;`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        { vec3 P = position; vec3 Nn = objectNormal; ${motion} objectNormal = Nn; }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        { vec3 P = transformed; vec3 Nn = vec3(0.0, 1.0, 0.0); ${motion} transformed = P; }
        vPart = aPart; vWuv = vec2(fract(aWing.w * 0.5) * 2.0, step(1.5, aWing.w));`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uSunView, uSunCol; uniform float uFlicker;
        varying float vPart; varying vec2 vWuv;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (vPart > 0.5 && vPart < 1.5) {
          // a blurred wing: faint, veined, with the dark stigma near the tip of the leading edge
          float vein = smoothstep(0.86, 0.97, fract(vWuv.x * 9.0)) * 0.6 + smoothstep(0.8, 0.95, fract(vWuv.y * 4.0)) * 0.3;
          float stigma = smoothstep(0.78, 0.8, vWuv.x) * (1.0 - smoothstep(0.88, 0.9, vWuv.x)) * (1.0 - smoothstep(0.15, 0.3, vWuv.y));
          diffuseColor.rgb *= 1.0 - vein * 0.35 - stigma * 0.8;
          diffuseColor.a = 0.3 + stigma * 0.4 + vein * 0.08;
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          // against the low sun the wings light up like mica and the rider's salt-white rims: that is what
          // shows them at twenty paces
          float back = max(dot(normalize(-vViewPosition), uSunView), 0.0);
          float wingK = (vPart > 0.5 && vPart < 1.5) ? 1.0 : (vPart > 1.5 ? 0.25 : 0.08);
          totalEmissiveRadiance += uSunCol * wingK * (0.04 + 0.7 * pow(back, 8.0)) * uFlicker;
          // from any side: a sheen on the wing membranes at grazing angles, and the salt-white of the rider
          // holding a little of the light, so they show against dark water and dark bank
          float fres = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.0);
          if (vPart > 0.5 && vPart < 1.5) {
            totalEmissiveRadiance += vec3(0.78, 0.8, 0.82) * (0.04 + 0.28 * fres);
            diffuseColor.a = min(1.0, diffuseColor.a + 0.12 * pow(back, 8.0) + 0.15 * fres);
          } else if (vPart > 1.5) {
            totalEmissiveRadiance += diffuseColor.rgb * (0.5 + 0.4 * fres);
          } else {
            totalEmissiveRadiance += vec3(0.35, 0.42, 0.3) * 0.3 * fres;
          }
        }`);
  };
  return m;
}

// ---------------------------------------------------------------- G: flecks of salt
const GLINT_VERT = /* glsl */`
  attribute vec4 aGl;   // born, life, drift vx, vz
  attribute float aSeed;
  attribute float aKind;  // 0 a fleck of salt, 1 the shimmer of a pedlar's wings (its position moved each frame)
  uniform float uTime, uScale, uFlicker;
  varying float vA; varying float vTw; varying float vKind;
  #include <fog_pars_vertex>
  void main() {
    float age = uTime - aGl.x;
    float life = aGl.y;
    vec3 transformed = position + vec3(aGl.z, 0.0, aGl.w) * clamp(age, 0.0, life);
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float depth = -mvPosition.z;
    float on = step(0.0, age) * step(age, life);
    // a sharp first glitter, then a long fading
    vA = on * (smoothstep(0.0, 0.4, age) * (1.0 - smoothstep(life * 0.35, life, age)) + exp(-age * 1.5) * 1.5);
    // the fleck catches the light as the eye moves: twinkle by view angle as much as by time
    vec3 v = normalize(cameraPosition - transformed);
    vTw = 0.45 + 0.55 * pow(abs(sin(aSeed * 91.0 + v.x * 23.0 + v.z * 17.0 + uTime * (0.7 + aSeed))), 6.0);
    gl_PointSize = clamp(0.055 * uScale / max(depth, 0.1), 2.6, 18.0);
    vKind = aKind;
    if (aKind > 0.5) {
      // what the eye catches of a pedlar at twenty paces: the blur of its wings in the low light
      transformed = position;
      vA = (0.55 + 0.45 * sin(uTime * 23.0 + aSeed * 40.0)) * smoothstep(7.0, 14.0, depth);
      gl_PointSize = clamp(0.4 * uScale / max(depth, 0.1), 3.0, 40.0);
    }
    #include <fog_vertex>
  }`;
const GLINT_FRAG = /* glsl */`
  uniform float uFlicker;
  varying float vA; varying float vTw; varying float vKind;
  #include <fog_pars_fragment>
  void main() {
    if (vA < 0.004) discard;
    vec2 c = (gl_PointCoord - 0.5) * 2.0;
    float r = length(c);
    if (vKind > 0.5) {
      float s = 1.0 - smoothstep(0.0, 1.0, r);
      ${FOG_ATTEN}
      gl_FragColor = vec4(vec3(0.95, 0.84, 0.72) * s * s * vA * 0.3 * fogAtten * (0.4 + 0.6 * uFlicker), 1.0);
      return;
    }
    float core = 1.0 - smoothstep(0.0, 0.45, r);
    float cross = (1.0 - smoothstep(0.0, 0.12, abs(c.x))) * (1.0 - smoothstep(0.3, 1.0, abs(c.y)))
                + (1.0 - smoothstep(0.0, 0.12, abs(c.y))) * (1.0 - smoothstep(0.3, 1.0, abs(c.x)));
    float a = (core + cross * 0.55 * vTw) * vA * (0.6 + 0.4 * vTw);
    ${FOG_ATTEN}
    gl_FragColor = vec4(vec3(0.92, 0.94, 1.0) * a * 1.4 * fogAtten * (0.75 + 0.25 * uFlicker), 1.0);
  }`;

// ---------------------------------------------------------------- V: the surface of the Wrong Colour
const WC_VERT = /* glsl */`
  attribute float depth;
  varying float vDepth; varying vec3 vWorld;
  #include <fog_pars_vertex>
  void main() {
    vec3 transformed = position;
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    vDepth = depth;
    vWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const WC_FRAG = /* glsl */`
  precision highp float;
  uniform float uTime, uHue, uBright, uR;
  uniform vec2 uC, uO;  // basin centre, direction to the channel
  varying float vDepth; varying vec3 vWorld;
  #include <fog_pars_fragment>
  ${HSV}
  void main() {
    vec2 p = vWorld.xz - uC;
    float along = dot(p, uO), across = dot(p, vec2(uO.y, -uO.x));
    float r = length(vec2(along > 0.0 ? along * 0.6 : along, across));
    float edge = smoothstep(0.0, 0.1, vDepth);
    float mask = edge * (1.0 - smoothstep(uR * 0.85, uR * 1.6, r));
    if (mask < 0.003) discard;
    float t = uTime;
    // slow interfering swirls decide, place by place, how far the colour has gone over to its complement
    float sw = sin(p.x * 2.1 + sin(p.y * 1.7 + t * 0.21) * 1.6 + t * 0.13)
             + sin(p.y * 2.6 - sin(p.x * 1.3 - t * 0.17) * 1.4 - t * 0.11)
             + sin((p.x + p.y) * 3.7 + t * 0.29) * 0.5;
    float k = smoothstep(-0.2, 2.4, sw);
    float h = uHue + sw * 0.035;
    vec3 a = hsv2rgb(vec3(h, 0.92, 1.0)), b = hsv2rgb(vec3(h + 0.5, 0.92, 1.0));
    vec3 c = mix(a, b, k * 0.5);
    // equal low luminance whatever the hue: a blue is lifted, a green held down, so it is always as visible
    c *= clamp(0.3 / max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 1e-3), 0.8, 3.0);
    // the glow comes up from under the water: strongest over the deepest part, a slow breathing in it
    float glow = exp(-r * r * 0.55) * (0.8 + 0.2 * sin(t * 0.37 + r * 2.3)) + 0.18 * exp(-r * r * 0.12);
    float lum = 0.72 * uBright;
    // dark still water at the rim, so the colour sits in it rather than on it
    vec3 col = vec3(0.006, 0.005, 0.008) + c * glow * lum;
    // a faint skin on the surface, slowly turning
    float skin = sin(along * 9.0 + sin(across * 5.0 + t * 0.2) * 2.0 - t * 0.15);
    col += c * smoothstep(0.9, 1.0, skin) * 0.012 * uBright;
    gl_FragColor = vec4(col, mask * (0.7 + 0.3 * glow));
    vec3 pre = gl_FragColor.rgb;
    #include <fog_fragment>
    // its own light carries further through the haze than the haze would let reflected light carry
    gl_FragColor.rgb = mix(gl_FragColor.rgb, pre, 0.5);
  }`;
// a soft standing haze of the colour above the basin, a camera-facing quad
const HALO_VERT = /* glsl */`
  uniform vec3 uPos; uniform vec2 uSize;
  varying vec2 vUv;
  #include <fog_pars_vertex>
  void main() {
    vec4 mvPosition = viewMatrix * vec4(uPos, 1.0);
    mvPosition.xy += position.xy * uSize;
    vec3 transformed = uPos + vec3(position.xy * uSize, 0.0);
    vUv = position.xy;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const HALO_FRAG = /* glsl */`
  uniform float uHue, uBright, uTime;
  varying vec2 vUv;
  #include <fog_pars_fragment>
  ${HSV}
  void main() {
    vec2 q0 = vUv * 2.0, q = q0;
    q.y = q.y > 0.0 ? q.y * 0.9 : q.y * 2.2;    // it hangs low over the water, rising a little
    float r2 = dot(q, q);
    float a = exp(-r2 * 4.5) * 0.8 + exp(-r2 * 12.0) * 0.5;
    a *= (1.0 - smoothstep(0.5, 1.0, abs(q0.x))) * (1.0 - smoothstep(0.5, 1.0, abs(q0.y)));
    vec3 c = hsv2rgb(vec3(uHue + vUv.y * 0.06 + sin(uTime * 0.2) * 0.02, 0.85, 1.0));
    c *= clamp(0.35 / max(dot(c, vec3(0.2126, 0.7152, 0.0722)), 1e-3), 0.8, 3.0);
    ${FOG_ATTEN}
    gl_FragColor = vec4(c * a * 0.14 * uBright * fogAtten, 1.0);
  }`;

// ---------------------------------------------------------------- the fall's spray
const SPRAY_VERT = /* glsl */`
  attribute vec4 aSeed;
  uniform float uTime, uScale, uWindD;
  uniform vec3 uFoot;
  varying float vA;
  #include <fog_pars_vertex>
  void main() {
    vec3 wind = normalize(vec3(1.0, 0.0, 0.35));
    float sp = 0.6 + 0.8 * aSeed.w;
    // a box 75 m across around the foot (v4 map: 2.5 times the v2 box, for the taller fall); each drop rides the
    // wind through it, sinking a little, and wraps
    vec3 p = (aSeed.xyz - 0.5) * vec3(75.0, 17.5, 75.0) + wind * uWindD * sp;
    p.y -= uTime * (0.08 + 0.12 * aSeed.w);
    p += vec3(sin(uTime * 0.9 + aSeed.x * 40.0), sin(uTime * 1.3 + aSeed.y * 30.0) * 0.5, cos(uTime * 0.8 + aSeed.z * 50.0)) * 0.35;
    p = mod(p + vec3(37.5, 8.75, 37.5), vec3(75.0, 17.5, 75.0)) - vec3(37.5, 8.75, 37.5);
    vec3 transformed = uFoot + vec3(p.x, p.y + 8.75, p.z);
    vec4 mvPosition = viewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float depth = -mvPosition.z;
    float rr = length(p.xz);
    vA = (1.0 - smoothstep(22.5, 40.0, rr)) * smoothstep(0.25, 0.9, depth) * (1.0 - smoothstep(0.75, 1.0, abs(p.y) / 8.75));
    gl_PointSize = clamp((0.01 + 0.012 * aSeed.w) * uScale / max(depth, 0.1), 1.6, 10.0);
    #include <fog_vertex>
  }`;
const SPRAY_FRAG = /* glsl */`
  uniform float uFlicker, uOn;
  varying float vA;
  #include <fog_pars_fragment>
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float a = (1.0 - smoothstep(0.3, 1.0, r)) * vA * uOn;
    if (a < 0.003) discard;
    gl_FragColor = vec4(vec3(0.78, 0.79, 0.84) * (0.55 + 0.45 * uFlicker), a * 0.8);
    #include <fog_fragment>
  }`;

export async function build(ctx) {
  const { scene, terrain, camera } = ctx;
  const RV = terrain.river;
  const high = ctx.quality !== 'low';
  const cam = camera.position;
  const flick = ctx.sky && ctx.sky.flicker ? ctx.sky.flicker : { value: 1 };
  const cue = (name, pos) => ctx.audio?.cue?.(name, pos);
  const uTime = { value: 0 };
  const uScale = { value: 400 };
  const updates = [];

  // the river line: position and leftward normal at arc length s
  const LN = RV.line;
  const linePt = (s, out) => {
    s = clamp(s, 0, LN.length - 0.01);
    let lo = 0, hi = LN.n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (LN.S[m] <= s) lo = m; else hi = m; }
    const l = LN.S[hi] - LN.S[lo], f = (s - LN.S[lo]) / l;
    const tx = (LN.X[hi] - LN.X[lo]) / l, tz = (LN.Z[hi] - LN.Z[lo]) / l;
    out.x = LN.X[lo] + (LN.X[hi] - LN.X[lo]) * f; out.z = LN.Z[lo] + (LN.Z[hi] - LN.Z[lo]) * f;
    out.lx = tz; out.lz = -tx; // left of downstream
    return out;
  };
  const _lp = { x: 0, z: 0, lx: 0, lz: 0 };

  // ================================================================ G: the Salt-Pedlars
  const N = high ? 14 : 6;
  const prng = ctx.makeRng(9101);
  const pGeo = pedlarGeometry();
  const aPh = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4);
  aPh.setUsage(THREE.DynamicDrawUsage);
  pGeo.setAttribute('aPh', aPh);
  const pMesh = new THREE.InstancedMesh(pGeo, pedlarMaterial(uTime), N);
  pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  pMesh.frustumCulled = false; pMesh.renderOrder = 14; pMesh.name = 'salt-pedlars';
  scene.add(pMesh);

  // stones they may settle over: the river's boulders and the blocks along its walls, read once from the
  // water module's instanced rocks (it may build after this one, so look until they are there)
  const stones = [];
  let stonesLooked = false, stoneLookT = 0;
  function findStones(t) {
    const rocks = scene.getObjectByName('river-rocks');
    if (!rocks) return;
    stonesLooked = true;
    const M4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    const rc = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), hits = [];
    for (let i = 0; i < rocks.count; i++) {
      rocks.getMatrixAt(i, M4); M4.decompose(p, q, sc);
      const r = terrain.riverAt(p.x, p.z);
      if (!r || r.s < S_FROM - 2 || r.s > S_TO) continue;
      if (Math.abs(r.d) > r.hw + 3.5) continue;        // only stones at the water, not up the walls
      rc.set(new THREE.Vector3(p.x, p.y + 6, p.z), down); rc.far = 12;
      hits.length = 0;
      rocks.raycast(rc, hits);
      let top = null;
      for (const h of hits) if (h.instanceId === i && (!top || h.point.y > top.y)) top = h.point;
      if (!top || top.y > r.y + 2.2) continue;
      stones.push({ x: top.x, y: top.y, z: top.z, s: r.s, d: r.d, water: Math.abs(r.d) < r.hw });
    }
    // the banks already carry a few flecks when you first come down to them
    const seedN = high ? 10 : 6;
    for (let k = 0; k < seedN && stones.length; k++) {
      const st = stones[(prng() * stones.length) | 0];
      const life = 30 + prng() * 30;
      addGlint(st.x + (prng() - 0.5) * 0.1, st.y + 0.01, st.z + (prng() - 0.5) * 0.1, t - prng() * life * 0.7, life, 0, 0);
    }
  }

  const pedlars = [];
  for (let i = 0; i < N; i++) {
    // homes spread down the beat, a few more over the slow reach and the fen's edge where they can hover
    const u = (i + 0.3 + prng() * 0.4) / N;
    const s0 = S_FROM + 4 + Math.pow(u, 0.8) * (S_TO - S_FROM - 6);
    const p = {
      home: s0, s: s0, d: 0, pos: new THREE.Vector3(), from: new THREE.Vector3(), to: new THREE.Vector3(), anchor: new THREE.Vector3(),
      mode: 0, u: 0, dur: 1, timer: 0.5 + prng() * 3, kind: 0, stone: null, glinted: false, held: 0,
      yaw: prng() * 6.28, yawGoal: 0, pitch: 0, roll: 0, lean: 0, ph: prng() * 6.28, rate: 26 + prng() * 10, near: false, passCd: 0,
      // the model is built at life size for its parts; drawn 2.2x so a rider is a finger high (~8 cm, ~30 cm span)
      w1: prng() * 6.28, w2: prng() * 6.28, scale: (0.92 + prng() * 0.2) * 2.2,
    };
    p.yawGoal = p.yaw;
    pickTarget(p, false);
    p.pos.copy(p.to); p.anchor.copy(p.to); p.mode = 0;
    pedlars.push(p);
    aPh.setXYZW(i, p.ph, p.rate, 1, 0);
  }
  // hold: freezes their wandering (for renders); list, stones: their state, for tools
  ctx.pedlars = { count: N, positions: pedlars.map((p) => p.pos), hold: false, list: pedlars, stones };

  // a place to go: over the water (kind 0), over a stone (1) or over the bank (2), in river coordinates
  function pickTarget(p, retreat, plS = 0, plD = 0) {
    const near = Math.hypot(p.pos.x - cam.x, p.pos.z - cam.z) < 22;
    for (let tries = 0; tries < 8; tries++) {
      let s, d, y, kind = 0, stone = null;
      const roll = prng();
      if (retreat) {
        // away from the player along the river, upstream if he comes from below; or out across the water
        const dir = p.s >= plS ? 1 : -1;
        s = p.s + dir * (4 + prng() * 4);
        if (s < S_FROM || s > S_TO) s = clamp(p.s - dir * 0.5, S_FROM, S_TO);
        const hw = RV.halfWidthAt(s);
        d = -Math.sign(plD || 1) * hw * (0.4 + prng() * 0.5);
      } else if (roll < 0.3 && stones.length) {
        // a stone near home
        let best = null, bd = 1e9;
        for (let k = 0; k < 5; k++) { const st = stones[(prng() * stones.length) | 0]; const e = Math.abs(st.s - p.home); if (e < bd) { bd = e; best = st; } }
        if (best && bd < 14) { stone = best; s = best.s; d = best.d; kind = 1; }
      }
      if (s === undefined) {
        s = clamp(p.home + (prng() * 2 - 1) * 9, S_FROM, S_TO);
        const hw = RV.halfWidthAt(s);
        // over the fen they range wider, out over the open water beyond the banks
        const reach = s > 92 ? hw + 5 : hw * 0.85;
        d = (prng() * 2 - 1) * reach;
        if (prng() < 0.15) { kind = 2; d = Math.sign(d || 1) * (hw + 0.4 + prng() * 1.2); }
      }
      linePt(s, _lp);
      const x = stone ? stone.x : _lp.x + _lp.lx * d, z = stone ? stone.z : _lp.z + _lp.lz * d;
      const wl = terrain.waterLevelAt(x, z), gh = terrain.heightAt(x, z);
      if (stone) y = stone.y + 0.22 + prng() * 0.2;
      else if (wl !== null && wl > gh) { y = wl + 0.3 + prng() * 0.8; kind = 0; }
      else { y = gh + 0.35 + prng() * 0.7; kind = 2; }
      if (retreat) y += 0.3 + prng() * 0.6;
      // a polite distance: never a place nearer the player than six metres; and when he is about, they keep
      // within sight of him, six to ten metres off, as if curious and mannerly
      const dx = x - cam.x, dz = z - cam.z, e2 = dx * dx + dz * dz;
      if (e2 < 36 && tries < 7) continue;
      if (!retreat && near && e2 > 100 && tries < 5) continue;
      p.to.set(x, y, z); p.s = s; p.d = d; p.kind = kind; p.stone = stone;
      return;
    }
  }
  function startDart(p, retreat, plS, plD) {
    p.from.copy(p.pos);
    pickTarget(p, retreat, plS, plD);
    const dist = p.from.distanceTo(p.to);
    // short quick darts; a retreat is a longer unhurried series of the same
    const speed = retreat ? 3.2 + prng() * 0.8 : 1.8 + prng() * 1.8;
    p.dur = clamp(dist / speed, 0.35, 6);
    p.u = 0; p.mode = 1; p.glinted = false; p.held = 0;
    p.yawGoal = Math.atan2(p.to.x - p.from.x, p.to.z - p.from.z);
  }

  // ---------------------------------------------------------------- flecks of salt
  const NG = MAX_GLINTS + N;
  const gPos = new Float32Array(NG * 3), gGl = new Float32Array(NG * 4), gSeed = new Float32Array(NG), gKind = new Float32Array(NG);
  for (let i = 0; i < NG; i++) { gGl[i * 4] = -1e4; gGl[i * 4 + 1] = 1; gSeed[i] = prng(); gKind[i] = i < MAX_GLINTS ? 0 : 1; }
  const glGeo = new THREE.BufferGeometry();
  const gPosA = new THREE.BufferAttribute(gPos, 3), gGlA = new THREE.BufferAttribute(gGl, 4);
  gPosA.setUsage(THREE.DynamicDrawUsage); gGlA.setUsage(THREE.DynamicDrawUsage);
  glGeo.setAttribute('position', gPosA); glGeo.setAttribute('aGl', gGlA); glGeo.setAttribute('aSeed', new THREE.BufferAttribute(gSeed, 1)); glGeo.setAttribute('aKind', new THREE.BufferAttribute(gKind, 1));
  const glMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uFlicker: { value: 1 } }]),
    vertexShader: GLINT_VERT, fragmentShader: GLINT_FRAG, fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  glMat.uniforms.uTime = uTime; glMat.uniforms.uScale = uScale;
  const glints = new THREE.Points(glGeo, glMat);
  glints.frustumCulled = false; glints.renderOrder = 15; glints.name = 'salt-glints';
  scene.add(glints);
  let gSlot = 0;
  function addGlint(x, y, z, born, life, vx, vz) {
    const i = gSlot; gSlot = (gSlot + 1) % MAX_GLINTS;
    gPos[i * 3] = x; gPos[i * 3 + 1] = y; gPos[i * 3 + 2] = z;
    gGl[i * 4] = born; gGl[i * 4 + 1] = life; gGl[i * 4 + 2] = vx; gGl[i * 4 + 3] = vz;
    gPosA.needsUpdate = true; gGlA.needsUpdate = true;
  }
  const _flow = { vx: 0, vz: 0, speed: 0 };
  function leaveGlint(p, t) {
    if (p.kind === 1 && p.stone) {
      addGlint(p.stone.x + (prng() - 0.5) * 0.12, p.stone.y + 0.008, p.stone.z + (prng() - 0.5) * 0.12, t, 30 + prng() * 30, 0, 0);
    } else if (p.kind === 0) {
      const x = p.anchor.x, z = p.anchor.z, wl = terrain.waterLevelAt(x, z);
      if (wl === null) return;
      // on the water the salt floats a while and is carried; on fast water it is gone in seconds
      const f = ctx.river?.flowAt ? ctx.river.flowAt(x, z, _flow) : _flow;
      const fast = f.speed > 0.8;
      addGlint(x, wl + 0.006, z, t, fast ? 6 + prng() * 4 : 30 + prng() * 30, f.vx * (fast ? 1 : 0.25), f.vz * (fast ? 1 : 0.25));
    }
  }

  // ---------------------------------------------------------------- pedlar motion
  const sunW = new THREE.Vector3(ctx.sun.dir.x, ctx.sun.dir.y, ctx.sun.dir.z).normalize();
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(0, 0, 0, 'YXZ'), SC = new THREE.Vector3();
  let plS = 0, plD = 0, plT = 0;
  const _pr = { s: 0, d: 0, y: 0, hw: 0, speed: 0, tx: 0, tz: 0, inWater: false };
  function updatePedlars(dt, t) {
    if (!stonesLooked) { stoneLookT -= dt; if (stoneLookT <= 0) { stoneLookT = 2; findStones(t); } }
    // where the player stands along the river, a few times a second
    plT -= dt;
    if (plT <= 0) {
      plT = 0.4;
      const r = terrain.riverAt(cam.x, cam.z, _pr);
      if (r) { plS = r.s; plD = r.d; } else { plS = -999; plD = 0; }
    }
    const hold = ctx.pedlars.hold;
    for (let i = 0; i < N; i++) {
      const p = pedlars[i];
      const dx = p.pos.x - cam.x, dz = p.pos.z - cam.z, dh = hyp(dx, dz);
      if (!hold) {
        // retreat when the player comes within four metres: off along the river or over the water, not in panic
        if (dh < 4 && (p.mode === 0 || p.u > 0.85)) startDart(p, true, plS, plD);
        if (p.mode === 1) {
          p.u += dt / p.dur;
          const u = Math.min(1, p.u), e = u * u * (3 - 2 * u);
          p.pos.lerpVectors(p.from, p.to, e);
          p.pos.y += Math.sin(u * Math.PI) * Math.min(0.25, p.dur * 0.1);
          p.lean += (0.22 - p.lean) * Math.min(1, dt * 6);
          if (p.u >= 1) {
            p.mode = 0; p.anchor.copy(p.to);
            // most pauses are short; some are long, and a long pause over water or a stone leaves salt
            p.timer = prng() < 0.38 ? 3.5 + prng() * 4 : 0.6 + prng() * 2.2;
          }
        } else {
          p.timer -= dt; p.held += dt;
          p.pos.set(
            p.anchor.x + Math.sin(t * 1.3 + p.w1) * 0.035 + Math.sin(t * 3.1 + p.w2) * 0.012,
            p.anchor.y + Math.sin(t * 1.9 + p.w2) * 0.03,
            p.anchor.z + Math.cos(t * 1.1 + p.w1) * 0.035);
          p.lean += (0 - p.lean) * Math.min(1, dt * 3);
          if (!p.glinted && p.held > 2.8 && p.kind !== 2) { p.glinted = true; leaveGlint(p, t); }
          if (p.timer <= 0) startDart(p, false);
          // and sometimes turn on the spot to look about
          if (p.held > 1.2 && Math.sin(t * 0.7 + p.w1) > 0.995) p.yawGoal += 0.6;
        }
        // never nearer than three metres, whatever the dart: eased out along the line from the player
        { const ex = p.pos.x - cam.x, ez = p.pos.z - cam.z, e = hyp(ex, ez);
          if (e < 3) { const k = 3 / Math.max(e, 1e-3); p.pos.x = cam.x + ex * k; p.pos.z = cam.z + ez * k; if (p.mode === 0) { p.anchor.x = p.pos.x; p.anchor.z = p.pos.z; } } }
        let dy = p.yawGoal - p.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        const turn = dy * Math.min(1, dt * 9);
        p.yaw += turn;
        p.roll += (clamp(-turn / Math.max(dt, 1e-3) * 0.05, -0.5, 0.5) - p.roll) * Math.min(1, dt * 8);
      }
      // the whirr of one passing within four metres
      const d3 = Math.hypot(dx, p.pos.y - cam.y, dz);
      p.passCd -= dt;
      if (d3 < 4 && !p.near && p.passCd <= 0) { cue('pedlar-pass', p.pos); p.passCd = 3; }
      p.near = d3 < 4;
      E.set(p.lean * 0.6, p.yaw, p.roll);
      Q.setFromEuler(E);
      SC.setScalar(p.scale);
      M4.compose(p.pos, Q, SC);
      pMesh.setMatrixAt(i, M4);
      gPos[(MAX_GLINTS + i) * 3] = p.pos.x; gPos[(MAX_GLINTS + i) * 3 + 1] = p.pos.y + 0.01; gPos[(MAX_GLINTS + i) * 3 + 2] = p.pos.z;
      aPh.setZ(i, p.mode === 0 ? 1 : 0.3); aPh.setW(i, p.lean);
    }
    pMesh.instanceMatrix.needsUpdate = true; aPh.needsUpdate = true; gPosA.needsUpdate = true;
    glMat.uniforms.uFlicker.value = flick.value;
    const ud = pMesh.material.userData;
    ud.uFlicker.value = flick.value;
    ud.uSunView.value.copy(sunW).transformDirection(camera.matrixWorldInverse);
  }
  updates.push(updatePedlars);

  // ================================================================ V: the Wrong Colour
  const EB = RV.eddy || { x: ctx.landmarks.eddy.x, z: ctx.landmarks.eddy.z, y: 0.7, r: 2, ox: 1, oz: 0 };
  const wcPos = new THREE.Vector3(EB.x, EB.y, EB.z);
  const hueNoise = ctx.noise.noise2;
  // two complementary poles, an acid green and a violet, and the hue wandering between them by noise through
  // the cold side of the wheel (never through the sun's reds and ambers), never resting at either; the poles
  // themselves drift a little. The shader swirls the complement into it place by place.
  const hueAt = (t) => {
    t += ctx.wrongColour ? ctx.wrongColour.tOffset : 0;
    const n = hueNoise(t * 0.031, 3.7) * 0.75 + hueNoise(t * 0.097, 11.3) * 0.25;
    const w = 0.5 + 0.5 * Math.sin(n * 3.4 + 0.4);   // folded, so it spends time near both poles
    return fract(0.29 + hueNoise(t * 0.009, 21.1) * 0.04 + 0.5 * w);
  };
  let wcMat;
  {
    const size = 7.5, segs = high ? 36 : 24;
    const g = new THREE.PlaneGeometry(size, size, segs, segs);
    g.rotateX(-Math.PI / 2);
    const P = g.attributes.position, depth = new Float32Array(P.count);
    const meshH = meshHeightSampler(terrain);
    const cx = EB.x + EB.ox * 1.0, cz = EB.z + EB.oz * 1.0;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i) + cx, z = P.getZ(i) + cz;
      P.setXYZ(i, x, EB.y + 0.012, z);
      depth[i] = EB.y - meshH(x, z);
    }
    g.setAttribute('depth', new THREE.BufferAttribute(depth, 1));
    g.computeBoundingSphere();
    wcMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uHue: { value: 0 }, uBright: { value: 1 }, uR: { value: EB.r },
        uC: { value: new THREE.Vector2(EB.x, EB.z) }, uO: { value: new THREE.Vector2(EB.ox, EB.oz) },
      }]),
      vertexShader: WC_VERT, fragmentShader: WC_FRAG, fog: true, transparent: true, depthWrite: false,
    });
    wcMat.uniforms.uTime = uTime;
    const m = new THREE.Mesh(g, wcMat);
    m.renderOrder = 11; m.name = 'wrong-colour';
    scene.add(m);
  }
  const haloMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uHue: { value: 0 }, uBright: { value: 1 }, uPos: { value: new THREE.Vector3(EB.x + EB.ox * 0.4, EB.y + 0.9, EB.z + EB.oz * 0.4) }, uSize: { value: new THREE.Vector2(6.5, 4.0) },
    }]),
    vertexShader: HALO_VERT, fragmentShader: HALO_FRAG, fog: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  haloMat.uniforms.uTime = uTime;
  {
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat);
    halo.frustumCulled = false; halo.renderOrder = 16; halo.name = 'wrong-colour-halo';
    scene.add(halo);
  }
  // the one point light: low over the basin, its colour the hue's, so the bank and the grey reeds take it
  const wcLight = new THREE.PointLight(new THREE.Color(1, 0, 1), 0, 20, 2);
  wcLight.position.set(EB.x, EB.y + 1.6, EB.z);
  wcLight.name = 'wrong-colour-light';
  scene.add(wcLight);
  // tOffset: shifts its clock, for renders of the hue at other moments
  ctx.wrongColour = { hue: 0, position: wcPos, light: wcLight, tOffset: 0 };
  ctx.wrongColour.hue = hueAt(0);
  let wcVisited = false;
  updates.push((dt, t) => {
    const h = hueAt(t);
    ctx.wrongColour.hue = h;
    // the sun gutters and the colour comes up, as if it had been waiting
    const g = clamp((1 - flick.value) / 0.8, 0, 1);
    const bright = 1 + g * 2.0;
    wcMat.uniforms.uHue.value = h; wcMat.uniforms.uBright.value = bright;
    haloMat.uniforms.uHue.value = h; haloMat.uniforms.uBright.value = bright;
    wcLight.color.setHSL(h, 0.95, 0.5);
    const lc = wcLight.color, luma = 0.2126 * lc.r + 0.7152 * lc.g + 0.0722 * lc.b;
    wcLight.intensity = 32 * clamp(0.4 / Math.max(luma, 1e-3), 1, 3) * (1 + g * 0.8) * (0.92 + 0.08 * Math.sin(t * 0.37));
    const d = hyp(cam.x - wcPos.x, cam.z - wcPos.z);
    if (d < 6 && !wcVisited) { wcVisited = true; cue('wrong-colour-near', wcPos); }
    else if (d > 25) wcVisited = false;
  });

  // ================================================================ the fall: rumble zone and spray
  const foot = RV.impact;
  {
    const n = high ? 1500 : 800, rng = ctx.makeRng(9301); // v4 map: the box is 2.5 times wider; denser near the foot by vA
    const g = new THREE.BufferGeometry();
    const seed = new Float32Array(n * 4);
    for (let i = 0; i < n * 4; i++) seed[i] = rng();
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uWindD: { value: 0 }, uFlicker: { value: 1 }, uOn: { value: 0 }, uFoot: { value: new THREE.Vector3(foot.x, foot.y, foot.z) },
      }]),
      vertexShader: SPRAY_VERT, fragmentShader: SPRAY_FRAG, fog: true, transparent: true, depthWrite: false,
    });
    mat.uniforms.uTime = uTime; mat.uniforms.uScale = uScale;
    const spray = new THREE.Points(g, mat);
    spray.frustumCulled = false; spray.renderOrder = 22; spray.name = 'fall-spray';
    scene.add(spray);
    let windD = 0, rumbleOn = false;
    updates.push((dt, t) => {
      // the same slow gusting as the moor's wind-borne seeds, so the spray leans the way they blow
      const gu = Math.max(0, Math.sin(t * 0.11 + 1.3) * 0.6 + Math.sin(t * 0.047 + 0.4) * 0.5 + 0.05);
      windD += dt * (0.5 + smooth(0.25, 0.85, gu) * 2.2);
      const df = hyp(cam.x - foot.x, cam.z - foot.z);
      spray.visible = df < 100;
      mat.uniforms.uWindD.value = windD; mat.uniforms.uFlicker.value = flick.value;
      mat.uniforms.uOn.value = 1 - smooth(45, 85, df);
      // the rumble: player distance to the middle of the fall against its radius
      const R = ctx.river;
      if (R && R.fall) {
        const F = R.fall;
        if (!F.v4) { F.v4 = true; F.rumbleRadius = 2 * (F.rumbleRadius || 70); } // v4 map: the taller fall carries twice as far
        const d = Math.hypot(cam.x - F.x, cam.y - F.y, cam.z - F.z);
        const rumble = clamp(1 - d / (F.rumbleRadius || 70), 0, 1);
        R.rumble = rumble;
        if (rumble > 0 && !rumbleOn) { rumbleOn = true; cue('fall-rumble-enter', F); }
        else if (rumble <= 0 && rumbleOn) { rumbleOn = false; cue('fall-rumble-leave', F); }
      }
    });
  }

  ctx.registerUpdate((dt, t) => {
    uTime.value = t;
    // pixels per metre at unit depth, for point sizes
    uScale.value = ctx.renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    for (const u of updates) u(dt, t);
  });
  ctx.log(`riverlife: ${N} salt-pedlars, the Wrong Colour at (${EB.x.toFixed(1)}, ${EB.z.toFixed(1)}), the fall's rumble and spray`);
}
