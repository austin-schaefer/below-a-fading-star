// The traveller's cloth (stories/README.md, "Things that travel"): saffron with a cream lining and a madder border,
// faded and torn. One material for every piece of it on the Span (the camp's lean-to, its streamer, the rags on the
// river's strut): a small canvas drawn from a fixed seed, the madder border along three edges and the fourth (v = 0)
// torn to a ragged hem with holes near it (alpha-tested), the back face cream. Pieces keep their uv (0..1 across the
// cloth, v = 0 the torn hem), so a geometry made here goes through `sheet`, not geo.js's clean(), which strips uv.
import * as THREE from 'three';

let mat = null, tex = null;
export function travellerCloth() {
  if (mat) return mat;
  mat = new THREE.MeshStandardMaterial({ map: clothTexture(), emissiveMap: clothTexture(), emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.16, roughness: 0.95, metalness: 0, side: THREE.DoubleSide, alphaTest: 0.5 });
  mat.onBeforeCompile = (sh) => { sh.fragmentShader = lining(sh.fragmentShader); };
  return mat;
}
const lining = (fs) => fs.replace('#include <map_fragment>', '#include <map_fragment>\n  if (!gl_FrontFacing) diffuseColor.rgb = vec3(0.30, 0.24, 0.14);');
// The same cloth for strips that hang free and move in the air: each sways about its knot (uv v = 1) by a vertex
// shader on one uniform, so a hundred strips cost one draw and one number a frame. Brighter, for being seen from below.
let sway = null;
export function swayingCloth() {
  if (sway) return sway;
  const uT = { value: 0 };
  sway = new THREE.MeshStandardMaterial({ map: clothTexture(), emissiveMap: clothTexture(), emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.42, roughness: 0.95, metalness: 0, side: THREE.DoubleSide, alphaTest: 0.5 });
  sway.userData.uT = uT;
  sway.customProgramCacheKey = () => 'cloth-sway';
  sway.onBeforeCompile = (sh) => {
    sh.uniforms.uT = uT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  { float d = 1.0 - uv.y, ph = position.x * 0.37 + position.z * 0.91;
    float w = sin(uT * 1.1 + ph) * 0.6 + sin(uT * 2.7 + ph * 1.7) * 0.25;
    transformed.x += w * 0.32 * d * d; transformed.z += sin(uT * 0.8 + ph * 1.3) * 0.18 * d * d; transformed.y += abs(w) * 0.06 * d; }`);
    sh.fragmentShader = lining(sh.fragmentShader);
  };
  return sway;
}
function clothTexture() {
  if (tex) return tex;
  const N = 128, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const g = cv.getContext('2d'), img = g.createImageData(N, N), d = img.data;
  let s = 7331; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const hem = []; for (let x = 0, h = 6; x < N; x++) { h += (rnd() - 0.5) * 5; h = Math.max(1, Math.min(16, h)); hem.push(h); }
  const holes = []; for (let k = 0; k < 2; k++) holes.push([rnd() * N, 8 + rnd() * 18, 1.2 + rnd() * 2.2]);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const v = y; // canvas row 0 is the top of the image; flipY puts it at v = 1, so the hem (v = 0) is the last rows
    const fromHem = N - 1 - v;
    const weave = 0.93 + 0.07 * ((x + y) % 2) + (rnd() - 0.5) * 0.06;
    const fade = 0.85 + 0.15 * Math.sin(x * 0.07 + y * 0.05) * Math.sin(y * 0.11);
    let r = 196, gg = 128, b = 34;                                  // saffron, faded
    const edge = Math.min(x, N - 1 - x, v);                         // the border on three sides
    if (edge >= 3 && edge < 11) { r = 122; gg = 40; b = 32; }        // madder
    else if (edge < 3) { r = 200; gg = 182; b = 140; }               // a cream edge where the lining turns over
    const k = weave * fade * (fromHem < 22 ? 0.82 + 0.18 * fromHem / 22 : 1); // dirtier toward the hem
    let a = fromHem < hem[x] ? 0 : 255;
    for (const [hx, hy, hr] of holes) if ((x - hx) ** 2 + (fromHem - hy) ** 2 < hr * hr) a = 0;
    const i = (y * N + x) * 4; d[i] = r * k; d[i + 1] = gg * k; d[i + 2] = b * k; d[i + 3] = a;
  }
  g.putImageData(img, 0, 0);
  tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

// a cloth piece from a grid: f(u, v) -> [x, y, z] for u, v in 0..1 (v = 0 the torn hem); nu by nv quads.
// Non-indexed, with position, normal and uv, so pieces merge with one another.
export function sheet(f, nu, nv) {
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { pos.push(...f(i / nu, j / nv)); uv.push(i / nu, j / nv); }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 2, d = a + nu + 1;
    idx.push(a, b, c, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); // smooth across the folds, then flat arrays to merge
  const n = g.toNonIndexed(); g.dispose();
  return n;
}
