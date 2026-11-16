// The Pit's air (v14-D2). The height fog (atmosphere.js) thickens tenfold for every 21 m an eye goes down, so from
// the Pit's floor, 30 m under the moor, it would turn everything 10 m off white. The Pit's own surfaces (the throat's rock, the
// floor, the stair, the reel) keep a share of their haze set by the eye's depth: all of it from the lip and the moor
// (the well still looks deep and misty from above), a sixteenth of it from the floor and the stair's lower half, so the bottom reads as a room
// under a disc of sky. v14/pit.js sets PIT_HAZE.value each frame from the camera; `hazed(mat)` patches a material.
export const PIT_HAZE = { value: 1 };

export function hazed(mat) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    sh.uniforms.uPitHaze = PIT_HAZE;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uPitHaze;')
      .replace('#include <fog_fragment>', 'vec3 fpPitPre = gl_FragColor.rgb;\n#include <fog_fragment>\ngl_FragColor.rgb = mix(fpPitPre, gl_FragColor.rgb, uPitHaze);');
  };
  const pk = mat.customProgramCacheKey?.bind(mat);
  mat.customProgramCacheKey = () => (pk ? pk() : '') + '|pit-haze';
  return mat;
}

// the share at an eye height y over a Pit whose lip is near lipY and floor near floorY
export function hazeAt(y, lipY = -4, floorY = -29) {
  const t = Math.min(1, Math.max(0, (lipY - 1 - y) / (lipY - 1 - (floorY + 14)))); // clearing from just under the lip, so the slabs' way down reads
  return 1 - 0.94 * t * t * (3 - 2 * t);
}
