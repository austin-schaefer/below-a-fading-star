// The traveller's cloth (stories/README.md, "Things that travel"): saffron with a cream lining and a madder border,
// faded and torn. One material for every piece of it on the Span (the camp's lean-to, its streamer, the rags on the
// river's strut): a small canvas drawn from a fixed seed, the madder border along three edges and the fourth (v = 0)
// torn to a ragged hem with holes near it (alpha-tested), the back face cream. Pieces keep their uv (0..1 across the
// cloth, v = 0 the torn hem), so a geometry made here goes through `sheet`, not geo.js's clean(), which strips uv.
import * as THREE from 'three';

let mat = null;
export function travellerCloth() {
  if (mat) return mat;
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
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.16, roughness: 0.95, metalness: 0, side: THREE.DoubleSide, alphaTest: 0.5 });
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n  if (!gl_FrontFacing) diffuseColor.rgb = vec3(0.30, 0.24, 0.14);');
  };
  return mat;
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
