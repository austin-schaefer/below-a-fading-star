// The village's far lights against the sun (the owner's #1712: "glow of village lights is as bright as the sun").
// A page function for Playwright (`page.evaluate(farGlow, opts)`): stands at (x, z) facing yaw, holds the sun at
// `hold` (1 lit; 0.3 a gutter, the lamps fully answering), renders the scene alone into a half-float target (linear,
// before bloom and the finish: bloom's threshold is 0.88) and returns the brightest luminance at the village's
// specks (the pixel under every speck's centre that projects into the view: a speck is at least 3 px across at 720
// lines, 1.5 at the 360 read here, so this is its own pixel or what stands in front of it) and in the sun's disc (40 px round its centre at 640 x 360),
// and the brightest at the specks with the far mesh hidden (`bare`: the quarters' own lamps there, which the specks
// cover from afar), and `own`: the brightest light the specks themselves add (the frame less the frame with their glow
// at 0), and `world`, the frame's median luminance. Used by tools/village-test.mjs.
export async function farGlow({ x, z, yaw, hold, settle = 1500 }) {
  const fp = window.__fp, THREE = await import('three');
  const p = fp.player;
  p.pos.set(x, fp.terrain.heightAt(x, z) + p.eye, z); p.yaw = yaw; p.pitch = 0; p.vel?.set(0, 0, 0);
  fp.sky.flicker.next = 1e9; fp.sky.flicker.hold = hold;
  await new Promise((r) => setTimeout(r, settle));
  const R = fp.renderer, cam = fp.camera, W = 640, H = 360;
  fp.renderer.shadowMap.needsUpdate = true;
  const draw = () => {
    const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType }), was = R.getRenderTarget();
    R.setRenderTarget(rt); R.clear(); R.render(fp.scene, cam); R.setRenderTarget(was);
    const b = new Uint16Array(W * H * 4); R.readRenderTargetPixels(rt, 0, 0, W, H, b); rt.dispose(); return b;
  };
  const h2f = THREE.DataUtils.fromHalfFloat;
  const lumOf = (b, i) => 0.2126 * h2f(b[i * 4]) + 0.7152 * h2f(b[i * 4 + 1]) + 0.0722 * h2f(b[i * 4 + 2]);
  const v = new THREE.Vector3();
  const toPx = (wx, wy, wz) => { v.set(wx, wy, wz).project(cam); return v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 ? [(v.x + 1) / 2 * W, (v.y + 1) / 2 * H] : null; };
  // the sun's disc (rows bottom-up, as project's y and readRenderTargetPixels)
  const sd = fp.lights.sunDir, sp = toPx(cam.position.x + sd.x * 2000, cam.position.y + sd.y * 2000, cam.position.z + sd.z * 2000);
  const mark = new Uint8Array(W * H);
  let n = 0;
  for (const s of fp.lappetFar?.specks || []) {
    const q = toPx(s.x, s.y, s.z); if (!q) continue;
    const i = Math.floor(q[0]), j = Math.floor(q[1]);
    if (sp && Math.abs(i - sp[0]) < 40 && Math.abs(j - sp[1]) < 40) continue;
    if (!mark[j * W + i]) { mark[j * W + i] = 1; n++; }
  }
  const peak = (b) => { let m = 0; for (let k = 0; k < W * H; k++) if (mark[k]) m = Math.max(m, lumOf(b, k)); return m; };
  let buf = draw();
  let sun = 0;
  if (sp) for (let j = Math.max(0, sp[1] - 40 | 0); j < Math.min(H, sp[1] + 40); j++) for (let i = Math.max(0, sp[0] - 40 | 0); i < Math.min(W, sp[0] + 40); i++) sun = Math.max(sun, lumOf(buf, j * W + i));
  const full = buf;
  // the specks' own light: the frame less the same frame with their glow at 0 (what is behind or before them, the
  // haze, the sky, a glow sprite, is not theirs: in a held gutter the haze over the village's skyline is about 0.45,
  // already over the dimmed sun's disc)
  const U = fp.lappetFar?.uniforms; let village = peak(full), own = null;
  if (U) {
    const g0 = U.uGlow.value; U.uGlow.value = 0; const dark = draw(); U.uGlow.value = g0;
    own = 0; for (let k = 0; k < W * H; k++) if (mark[k]) own = Math.max(own, lumOf(full, k) - lumOf(dark, k));
  }
  // the world's own brightness: the frame's median luminance (every 7th pixel)
  const all = []; for (let k = 0; k < W * H; k += 7) all.push(lumOf(full, k)); all.sort((a, b) => a - b);
  const world = all[all.length >> 1];
  const fm = fp.lappetFar?.mesh; let bare = null;
  if (fm) { fm.visible = false; buf = draw(); fm.visible = true; bare = peak(buf); }
  const F = fp.sky.flicker, C = fp.lappet?.middle;
  return { sun, village, own, world, bare, px: n, sunOnScreen: !!sp, lamps: C && F.lampsAt ? F.lampsAt(C.x, C.z) : F.lamps, value: F.value };
}
