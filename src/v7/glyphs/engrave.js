// The glyph motif's incisions (v7): one of the Hypogeum's forms cut into the top face (object +y) of an instance,
// chosen by a per-instance attribute aForm (-1 for none). The strokes live in the fragment shader (glyphSd from
// forms.js), so an engraved mesh costs no draw call and no triangles: inside a stroke the metal is dark with old
// grime, the groove's walls tilt the normal so its edges catch the light, and a burnished lip runs round it.
//   engrave(material, { scale, half, top, face }): patch a MeshStandardMaterial. `scale` takes object x/z (m) to glyph
//     units, `half` is the stroke's half-width in glyph units, `top` the face's object y (fragments within 1 mm of it),
//     `face` the half-size of the face in object units (nothing is cut past it)
//   engraveCaps(ctx, mesh, material, slots): the Surveyor's brass caps (v4/dressing/pegs.js): cap i carries the
//     lintel's form in slot slots[i] (its index among the five cap stations), so no two neighbours share one
import * as THREE from 'three';
import { glyphSdfGLSL, lintelForms, flags } from './forms.js';

export function engrave(material, { scale, half, top, face }) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (sh, r) => {
    prev?.call(material, sh, r);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aForm; varying float vGlForm; varying vec3 vGlP; varying vec3 vGlTx; varying vec3 vGlTz;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vGlForm = aForm; vGlP = position;
        { mat3 im = mat3(1.0);
          #ifdef USE_INSTANCING
          im = mat3(instanceMatrix);
          #endif
          vGlTx = normalize(normalMatrix * (im * vec3(1.0, 0.0, 0.0))); vGlTz = normalize(normalMatrix * (im * vec3(0.0, 0.0, 1.0))); }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vGlForm; varying vec3 vGlP; varying vec3 vGlTx; varying vec3 vGlTz;
        ${glyphSdfGLSL()}
        float glCut = 0.0, glLip = 0.0; vec2 glGrad = vec2(0.0);`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (vGlForm > -0.5 && abs(vGlP.y - ${top.toFixed(5)}) < 0.001 && max(abs(vGlP.x), abs(vGlP.z)) < ${face.toFixed(5)}) {
          int gf = int(vGlForm + 0.5);
          vec2 gp = vec2(vGlP.x, -vGlP.z) * ${scale.toFixed(5)};
          float e = ${(half * 0.25).toFixed(5)};
          float d0 = glyphSd(gf, gp);
          glGrad = vec2(glyphSd(gf, gp + vec2(e, 0.0)) - d0, glyphSd(gf, gp + vec2(0.0, e)) - d0) / e;
          float aa = fwidth(d0) * 0.75 + 1e-4;
          glCut = 1.0 - smoothstep(${half.toFixed(5)} - aa, ${half.toFixed(5)} + aa, d0);
          glLip = smoothstep(${(half * 0.6).toFixed(5)}, ${half.toFixed(5)}, d0) * (1.0 - smoothstep(${half.toFixed(5)}, ${(half * 1.7).toFixed(5)}, d0));
          diffuseColor.rgb *= mix(1.0 + 0.18 * glLip, 0.32, glCut);
        }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (glCut > 0.0) {
          // the groove's walls face its centreline: tilt toward it, most near the edge
          vec2 gg = glGrad * glCut * 0.9;
          normal = normalize(normal - (vGlTx * gg.x - vGlTz * gg.y));
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.9, glCut); roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.6, glLip);`);
  };
  material.customProgramCacheKey = () => `engrave-${scale}-${half}-${top}-${face}`;
  return material;
}

export function engraveCaps(ctx, mesh, material, slots) {
  const geo = mesh.geometry, n = mesh.count;
  const forms = new Float32Array(Math.max(1, slots.length)).fill(-1);
  const F = flags();
  if (F.motif) { const order = lintelForms(ctx); slots.forEach((s, i) => { forms[i] = order[s]; }); }
  geo.setAttribute('aForm', new THREE.InstancedBufferAttribute(forms, 1));
  if (!F.motif) return null;
  // the cap: a 6 cm cylinder, its top face 4.5 cm up from its base; the glyph 9 cm across on it
  geo.computeBoundingBox(); // the face's y, as pegs.js translated the cylinder
  engrave(material, { scale: 0.24 / 0.09, half: 0.0075, top: geo.boundingBox.max.y, face: 0.06 });
  return Array.from(forms.slice(0, n));
}
