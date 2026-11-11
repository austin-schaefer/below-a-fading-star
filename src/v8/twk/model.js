// v8-07 the Twk-men's model: a dragonfly 35 cm across the wings and its rider 7-8 cm high, built in metres
// (forward +z, up +y, the thorax at the origin). Three geometries, drawn as three instanced meshes that share one
// instance matrix and one per-instance attribute aFly (x: wings beating 0..1, y: phase, z: carrying a grain, w: speed):
//   body   the insect: great eyes, a thick thorax, a long banded abdomen, the legs folded under (opaque)
//   wings  fore and hind pairs, each drawn twice at two stroke phases so a beat reads as a blur; at rest they lie flat
//          and spread, glassy, and catch the low sun like mica (transparent, the alpha card)
//   rider  green-skinned, puffed out, one hand on his hip; a red cap curling back, a lance upright with a saffron
//          pennon; a grain of salt carried under the insect when aFly.z is 1 (opaque, double-sided for the pennon)
import * as THREE from 'three';
import { Mesher } from '../../fauna/geo.js';

const S = 2.45; // the river pedlars' dragonfly (src/v2/riverlife.js), drawn at this scale: 35 cm across
const fract = (x) => x - Math.floor(x);
const hex = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };

function pack(list) {
  // list: [{ M (Mesher), part, colourAt(x, y, z) }] -> one indexed geometry with position, normal, color, aPart
  const pos = [], nrm = [], col = [], part = [], idx = [];
  for (const { M, part: p0, colourAt } of list) {
    const g = M.geometry(), base = pos.length / 3, P = g.attributes.position, N = g.attributes.normal;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      pos.push(x, y, z); nrm.push(N.getX(i), N.getY(i), N.getZ(i));
      const c = colourAt(x, y, z); col.push(c[0], c[1], c[2]); part.push(typeof p0 === 'function' ? p0(x, y, z) : p0);
    }
    for (const i of g.index.array) idx.push(base + i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

export function bodyGeometry(low) {
  const M = new Mesher(), s = S, r = low ? 6 : 8;
  M.blob(0, 0.0005 * s, 0.0125 * s, 0.0058 * s, 0.0068 * s, 0.0125 * s, r, 6);         // thorax
  M.blob(0, 0.001 * s, 0.0305 * s, 0.0048 * s, 0.0046 * s, 0.0042 * s, r, 5);          // head
  M.blob(0.0042 * s, 0.0022 * s, 0.033 * s, 0.0036 * s, 0.0042 * s, 0.0036 * s, 6, 4); // eyes
  M.blob(-0.0042 * s, 0.0022 * s, 0.033 * s, 0.0036 * s, 0.0042 * s, 0.0036 * s, 6, 4);
  const ab = [], rad = [];
  for (let k = 0; k <= 10; k++) {
    const f = k / 10;
    ab.push([0, (-0.0005 - f * 0.002 + f * f * 0.0035) * s, (-0.001 - f * 0.07) * s]);
    rad.push([(0.0034 - f * 0.0014 + (k === 10 ? -0.0015 : 0) + (k === 1 ? 0.0006 : 0)) * s, (0.0032 - f * 0.0012 + (k === 10 ? -0.0015 : 0)) * s]);
  }
  M.loft(ab, rad, low ? 5 : 6);
  for (const sd of [1, -1]) for (const z of [0.006, 0.013, 0.02]) M.loft([[0.003 * sd * s, -0.004 * s, z * s], [0.006 * sd * s, -0.008 * s, (z + 0.002) * s], [0.004 * sd * s, -0.011 * s, (z + 0.006) * s]], [0.0007 * s, 0.0006 * s, 0.0004 * s], 3, 0, false);
  // a verdigris thorax, the abdomen banded in old gold, the eyes a dark garnet
  const thorax = hex('#2f4a40'), band = hex('#8a7a44'), abd = hex('#2a3a34'), eye = hex('#4a1a16');
  return pack([{ M, part: 0, colourAt: (x, y, z) => {
    if (z > 0.028 * s && Math.abs(x) > 0.002 * s && y > -0.001 * s) return eye;
    if (z < -0.004 * s) return fract(-z / (0.0075 * s)) < 0.24 ? band : abd;
    return thorax;
  } }]);
}

export function wingGeometry() {
  const pos = [], nrm = [], col = [], wing = [], idx = [];
  const ROOT_Y = 0.0045 * S, SEG = 6;
  const W = [{ z: 0.0155, span: 0.068, chord: 0.0135, hind: 0 }, { z: 0.0075, span: 0.065, chord: 0.0175, hind: 1 }];
  for (const layer of [0, 1]) for (const w of W) for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let k = 0; k <= SEG; k++) {
      const f = k / SEG, x = side * (0.003 + w.span * f) * S;
      const ch = w.chord * (0.55 + 0.75 * Math.sin(Math.min(1, f * 1.35) * Math.PI * 0.62)) * (1 - Math.pow(f, 6) * 0.75);
      const lead = w.z + 0.0015 * Math.sin(f * Math.PI) - f * 0.003, trail = lead - ch;
      for (const [zz, c] of [[lead, 0], [trail, 1]]) {
        pos.push(x, ROOT_Y + f * 0.002 * S, zz * S); nrm.push(0, 1, 0); col.push(0.96, 0.9, 0.74); // pale mica, a little gold
        wing.push(side, w.hind, layer, f + c * 2);
      }
    }
    for (let k = 0; k < SEG; k++) { const a = base + k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  // the blur: per side a faint fan over the arc the wings sweep about the body's axis (the stroke's envelope, in the
  // insect's cross-section plane), shown only while beating. Face-on it is what a walker sees of a hovering Twk-man
  // coming at him or hanging over a gnomon watching: a pale fan 35 cm across, where the wings alone are hairlines
  const FAN = 9, Z0 = 0.011 * S;
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let k = 0; k <= FAN; k++) {
      const u = k / FAN, th = -0.5 + 1.36 * u;
      for (const r of [0.012, 0.06 * S]) {
        pos.push(side * (0.00735 + r * Math.cos(th)), 0.011 + r * Math.sin(th), Z0); nrm.push(0, 0, 1); col.push(0.96, 0.92, 0.8);
        wing.push(side, 2, u, r > 0.02 ? 1 : 0);
      }
    }
    for (let k = 0; k < FAN; k++) { const a = base + k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aWing', new THREE.Float32BufferAttribute(wing, 4));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

// the rider's parts: 2 the man, 3 the grain he carries, 4 the cap and the pennon (lit a little from within so the spot
// of colour holds at walking distance in the shade)
export function riderGeometry(low) {
  const sd = low ? 5 : 7;
  const skin = hex('#7f9c3e'), skinD = hex('#5e7a2c'), jerkin = hex('#3e5a7a'), hose = hex('#6a4a2a'), cap = hex('#c4261a'), wood = hex('#3a2c20'), pennon = hex('#e8a224'), salt = hex('#f2eee6');
  const man = new Mesher();
  for (const x of [1, -1]) man.loft([[0.007 * x, 0.019, 0.04], [0.013 * x, 0.009, 0.047], [0.011 * x, -0.001, 0.054]], [0.0036, 0.003, 0.0024], sd - 2); // legs astride
  man.loft([[0, 0.017, 0.039], [0, 0.031, 0.042], [0, 0.045, 0.045]], [[0.0078, 0.0072], [0.0074, 0.0068], [0.005, 0.0045]], sd);                   // a puffed chest
  man.loft([[-0.006, 0.042, 0.044], [-0.0125, 0.034, 0.046], [-0.007, 0.027, 0.043]], [0.0021, 0.0019, 0.0018], 4);                               // a hand on his hip
  man.loft([[0.006, 0.042, 0.044], [0.0125, 0.037, 0.051], [0.0135, 0.034, 0.057]], [0.0021, 0.0019, 0.0018], 4);                                  // the other to the lance
  const head = new Mesher();
  head.blob(0, 0.0535, 0.0465, 0.0058, 0.0066, 0.006, sd, 5);
  head.loft([[0, 0.0535, 0.052], [0, 0.0515, 0.0585]], [0.0016, 0.0004], 4);                                                                      // a long nose, held high
  head.blob(0.0058, 0.054, 0.046, 0.0012, 0.0024, 0.0014, 4, 3); head.blob(-0.0058, 0.054, 0.046, 0.0012, 0.0024, 0.0014, 4, 3);                  // ears
  const capM = new Mesher();
  capM.loft([[0, 0.0575, 0.0465], [0, 0.0655, 0.0445], [0, 0.0735, 0.039], [0, 0.077, 0.032], [0, 0.0755, 0.027]], [0.0066, 0.0052, 0.0034, 0.0018, 0.0006], sd); // the cap, curling back
  const lance = new Mesher();
  lance.loft([[0.0135, 0.019, 0.054], [0.0158, 0.128, 0.07]], [0.0013, 0.0009], 4);
  const pen = new Mesher(); // the pennon: a flat swallowtail streaming back from the lance's head, two faces
  { const L = (k) => [0.0158 + k * 0.7, 0, 0.0685 - k * 0.7]; // along the pennon's length, 45 degrees off the line of flight
    const a = pen.v(0.0158, 0.126, 0.069), b = pen.v(0.0157, 0.098, 0.0665), c1 = pen.v(L(0.055)[0], 0.12, L(0.055)[2]), c2 = pen.v(L(0.052)[0], 0.102, L(0.052)[2]), d = pen.v(L(0.036)[0], 0.112, L(0.036)[2]);
    pen.tri(a, d, c1); pen.tri(a, b, d); pen.tri(d, b, c2); } // a swallowtail
  const grain = new Mesher();
  grain.blob(0, -0.022, 0.03, 0.009, 0.007, 0.0085, 5, 3);
  const g = pack([
    { M: man, part: 2, colourAt: (x, y) => (y < 0.02 ? hose : Math.abs(x) > 0.009 && y > 0.024 ? skinD : jerkin) },
    { M: head, part: 2, colourAt: () => skin },
    { M: capM, part: 4, colourAt: () => cap },
    { M: lance, part: 2, colourAt: () => wood },
    { M: pen, part: 5, colourAt: () => pennon },
    { M: grain, part: 3, colourAt: () => salt },
  ]);
  // drawn a tenth larger (8 cm from boot to cap) and seated on this scale's thorax
  g.scale(1.1, 1.1, 1.1); g.translate(0, 0.0005, 0);
  return g;
}

// materials: MeshStandardMaterial patched, all three reading the shared uTime and the instance attribute aFly
const HEAD_GLSL = /* glsl */`
  attribute vec4 aFly;
  uniform float uTime;
  varying float vPart; varying vec2 vWuv; varying float vFlap;`;

export function bodyMaterial(uTime) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.3 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        ${HEAD_GLSL}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        // the abdomen flexes a little in flight
        if (transformed.z < -0.009) { float k = -transformed.z / 0.15; transformed.y += sin(uTime * 2.6 + aFly.y) * 0.006 * k * k * (0.3 + 0.7 * aFly.x); }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { float fres = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.0); totalEmissiveRadiance += vec3(0.3, 0.42, 0.34) * 0.35 * fres; }`);
  };
  return m;
}

export function wingMaterial(uTime) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.1, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  m.userData = { uSunView: { value: new THREE.Vector3(0, 0, -1) }, uSunCol: { value: new THREE.Color('#ffb084') }, uFlicker: { value: 1 } };
  const motion = /* glsl */`
    if (aWing.y < 1.5) {
      // a stroke about the body's axis at the root: beating (aFly.x 1) or at rest, flat and a little drooped (0)
      float side = aWing.x;
      float beat = 0.18 + 0.66 * sin(fract(uTime * (27.0 + aFly.y)) * 6.2832 + aFly.y + aWing.y * 1.9 + aWing.z * 2.4);
      // at rest held up in a shallow V (not as a dragonfly does: as a Twk-man's mount is made to), so a perched one
      // shows a pale vee from the front and the side, not a hair-thin line
      float rest = 0.4 + aWing.y * 0.14 + aWing.z * 0.05;
      float th = mix(rest, beat, aFly.x) * side;
      float c = cos(th), s = sin(th);
      vec3 r0 = vec3(side * 0.00735, 0.011, 0.0);
      vec3 q = P - r0;
      P = r0 + vec3(q.x * c - q.y * s, q.x * s + q.y * c, q.z);
      Nn = vec3(Nn.x * c - Nn.y * s, Nn.x * s + Nn.y * c, Nn.z);
    }`;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime; Object.assign(sh.uniforms, m.userData);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        ${HEAD_GLSL}
        attribute vec4 aWing; varying float vFan;`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        { vec3 P = position; vec3 Nn = objectNormal; ${motion} objectNormal = Nn; }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        { vec3 P = transformed; vec3 Nn = vec3(0.0, 1.0, 0.0); ${motion} transformed = P; }
        vWuv = vec2(fract(aWing.w * 0.5) * 2.0, step(1.5, aWing.w)); vFlap = aFly.x; vFan = aWing.y > 1.5 ? 1.0 : 0.0;
        if (aWing.y > 1.5) vWuv = vec2(aWing.z, aWing.w);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uSunView, uSunCol; uniform float uFlicker;
        varying vec2 vWuv; varying float vFlap; varying float vFan;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // veined glass with the dark stigma near the tip of the leading edge; fainter while beating (two blurred layers)
        float vein = smoothstep(0.86, 0.97, fract(vWuv.x * 9.0)) * 0.6 + smoothstep(0.8, 0.95, fract(vWuv.y * 4.0)) * 0.3;
        float stigma = smoothstep(0.78, 0.8, vWuv.x) * (1.0 - smoothstep(0.88, 0.9, vWuv.x)) * (1.0 - smoothstep(0.15, 0.3, vWuv.y));
        // and a dark leading edge, so against the bright haze a wing reads as a dark lace and against dark ground
        // as pale glass
        float costa = (1.0 - smoothstep(0.06, 0.16, vWuv.y)) * (1.0 - vFan);
        diffuseColor.rgb *= 1.0 - vein * 0.3 - stigma * 0.85 - costa * 0.75;
        diffuseColor.a = mix(0.7, 0.36, vFlap) + stigma * 0.3 + vein * 0.1 + costa * 0.3;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          // against the low sun the wings light like mica; from any side a pale sheen at grazing angles, so a
          // rider shows as a bright flicker against dark ground and a glassy cross against the sky
          float back = max(dot(normalize(-vViewPosition), uSunView), 0.0);
          float fres = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.0);
          totalEmissiveRadiance += uSunCol * (0.08 + 0.8 * pow(back, 6.0)) * uFlicker;
          totalEmissiveRadiance += vec3(0.9, 0.86, 0.74) * (0.22 + 0.4 * fres) * (1.0 - costa * 0.8);
          diffuseColor.a = min(1.0, diffuseColor.a + 0.15 * pow(back, 6.0) + 0.15 * fres);
          if (vFan > 0.5) {
            // the blur: densest at the ends of the stroke, where a wing dwells, and toward the tips; nothing at rest
            float ends = 1.0 - 4.0 * vWuv.x * (1.0 - vWuv.x);
            diffuseColor.a = vFlap * (0.24 + 0.3 * ends) * smoothstep(0.0, 0.5, vWuv.y) * (1.0 - smoothstep(0.92, 1.0, vWuv.y));
          }
        }`);
  };
  return m;
}

export function riderMaterial(uTime) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.0, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        ${HEAD_GLSL}
        attribute float aPart;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vPart = aPart;
        // the grain only while one is carried
        if (aPart > 2.5 && aPart < 3.5) transformed = mix(vec3(0.0, 0.0, 0.03), transformed, aFly.z);
        // the pennon streams and snaps, more with speed
        if (aPart > 4.5) { float k = clamp((0.076 - transformed.z) / 0.045, 0.0, 1.0); transformed.x += k * (sin(uTime * (9.0 + aFly.w * 4.0) - k * 5.0 + aFly.y) * (0.004 + 0.003 * aFly.w)); transformed.y -= k * 0.008 * (1.0 - clamp(aFly.w, 0.0, 1.0)); }
        // the rider bobs a hair with the beat
        if (aPart > 1.5) transformed.y += sin(uTime * 7.0 + aFly.y * 3.0) * 0.0008 * aFly.x;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vPart;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * (vPart > 3.5 ? 0.55 : vPart > 2.5 ? 0.35 : 0.12);`);
  };
  return m;
}
