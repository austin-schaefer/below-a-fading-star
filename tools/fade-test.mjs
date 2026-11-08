#!/usr/bin/env node
// Fade-kit self-check (src/fade.js). Two coplanar quads over black, one with the dither's side 0 in red, one
// with side 1 in green, drawn additively at f = 0.25, 0.5, 0.75: every pixel must be red or green, none
// black (a hole) and none yellow (an overlap). Run for both ways a fade arrives (a uniform fadeExpr on two
// meshes, a per-instance vec2 attribute on one InstancedMesh of two, and a vertex expression). Then the shadow path: the
// fadeDepthMaterial of a half-faded quad, rendered to a target, must cover exactly the pixels the colour pass
// does, and a caster with it must build its fade depth program in a real shadow pass.
// pop-test's `fade` group calls this. Usage: node tools/fade-test.mjs [base]   (or FP_BASE=http://localhost:8174)
import { createRequire } from 'node:module';
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const base = process.argv[2] || process.env.FP_BASE || 'http://localhost:8123';
const browser = await chromium.launch({ args: ['--use-gl=angle', `--use-angle=${process.env.SHOT_ANGLE || 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
// a tiny page on the server's origin, so it imports the real three and src/fade.js
await page.route(`${base}/__fade-test.html`, (r) => r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset="utf-8">
<script type="importmap">{ "imports": { "three": "./vendor/three/three.module.js" } }</script>
<script type="module">
import * as THREE from 'three';
import { withFade, fadeDepthMaterial } from './src/fade.js';
const W = 317, H = 239; // odd sizes, so the noise's pattern does not tile the target evenly
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(W, H);
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType, depthBuffer: false });
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10); cam.position.z = 5;
const quad = new THREE.PlaneGeometry(2, 2);
const buf = new Uint8Array(W * H * 4);
function draw(scene, clear) {
  renderer.setRenderTarget(rt); renderer.setClearColor(clear, 1); renderer.clear(); renderer.render(scene, cam);
  renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf); renderer.setRenderTarget(null);
  return buf;
}
function count(px) {
  let black = 0, doubled = 0, red = 0;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i] > 127, g = px[i + 1] > 127;
    if (!r && !g) black++; else if (r && g) doubled++; else if (r) red++;
  }
  return { black, doubled, share: red / (W * H) };
}
const additive = (hex) => new THREE.MeshBasicMaterial({ color: hex, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true });
const out = { uniform: [], attribute: [], vertex: [] };
// 1. a uniform fadeExpr, two meshes
const uF = { value: 0 };
const s1 = new THREE.Scene();
s1.add(new THREE.Mesh(quad, withFade(additive(0xff0000), { key: 't-in', uniforms: { uF }, head: 'uniform float uF;', fadeExpr: 'uF', sideExpr: '0.0' })));
s1.add(new THREE.Mesh(quad, withFade(additive(0x00ff00), { key: 't-out', uniforms: { uF }, head: 'uniform float uF;', fadeExpr: 'uF', sideExpr: '1.0' })));
// 2. a per-instance attribute, one InstancedMesh of two at the same matrix, colour per instance
const ig = quad.clone();
const aFade = new THREE.InstancedBufferAttribute(new Float32Array(4), 2);
ig.setAttribute('aFade', aFade);
const im = new THREE.InstancedMesh(ig, withFade(additive(0xffffff), { key: 't-inst', attribute: 'aFade' }), 2);
const I = new THREE.Matrix4();
im.setMatrixAt(0, I); im.setMatrixAt(1, I);
im.setColorAt(0, new THREE.Color(1, 0, 0)); im.setColorAt(1, new THREE.Color(0, 1, 0));
const s2 = new THREE.Scene(); s2.add(im);
// 3. a vertex expression (here the instance's index picks its side; a caller computes f from camera distance)
const vm = new THREE.InstancedMesh(quad, withFade(additive(0xffffff), { key: 't-vert', uniforms: { uF }, head: 'uniform float uF;', vertex: 'vec2(uF, float(gl_InstanceID))' }), 2);
vm.setMatrixAt(0, I); vm.setMatrixAt(1, I);
vm.setColorAt(0, new THREE.Color(1, 0, 0)); vm.setColorAt(1, new THREE.Color(0, 1, 0));
const s3 = new THREE.Scene(); s3.add(vm);
for (const f of [0.25, 0.5, 0.75]) {
  uF.value = f; out.uniform.push({ f, ...count(draw(s1, 0x000000)) });
  aFade.setXY(0, f, 0); aFade.setXY(1, f, 1); aFade.needsUpdate = true;
  out.attribute.push({ f, ...count(draw(s2, 0x000000)) });
  out.vertex.push({ f, ...count(draw(s3, 0x000000)) });
}
// 4. the shadow path: the depth material's coverage against the colour pass's, at f = 0.5, side 0
uF.value = 0.5;
const colour = new THREE.Scene();
colour.add(new THREE.Mesh(quad, withFade(new THREE.MeshBasicMaterial({ color: 0xff0000 }), { key: 't-col', uniforms: { uF }, head: 'uniform float uF;', fadeExpr: 'uF' })));
const cmask = draw(colour, 0x000000).map((v, i) => (i % 4 === 0 ? (v > 127 ? 1 : 0) : 0));
const dmat = fadeDepthMaterial({ key: 't-depth', uniforms: { uF }, head: 'uniform float uF;', fadeExpr: 'uF' });
const depth = new THREE.Scene(); depth.add(new THREE.Mesh(quad, dmat));
const dpx = draw(depth, 0xffffff); // packed depth 1.0 is white; the quad sits at mid depth
let same = 0, differ = 0, covered = 0;
for (let i = 0; i < dpx.length; i += 4) {
  const d = (dpx[i] !== 255 || dpx[i + 1] !== 255 || dpx[i + 2] !== 255 || dpx[i + 3] !== 255) ? 1 : 0;
  covered += d; if (d === cmask[i]) same++; else differ++;
}
// and a real shadow pass with the depth material as a caster's customDepthMaterial
const sh = new THREE.Scene();
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const sun = new THREE.DirectionalLight(0xffffff, 1); sun.position.set(0, 0, 5); sun.castShadow = true; sh.add(sun);
const caster = new THREE.Mesh(quad, new THREE.MeshStandardMaterial()); caster.castShadow = true;
caster.customDepthMaterial = fadeDepthMaterial({ key: 't-shadow', uniforms: { uF }, head: 'uniform float uF;', fadeExpr: 'uF' });
sh.add(caster);
draw(sh, 0x000000);
const progs = renderer.info.programs.map((p) => p.cacheKey);
out.shadow = { covered, same, differ, total: W * H, shadowProgram: progs.some((k) => k.includes('fp-fade:t-shadow')) };
window.__fade = out;
</script>` }));
await page.goto(`${base}/__fade-test.html`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__fade || null, null, { timeout: 120000 }).catch(() => {});
const r = await page.evaluate(() => window.__fade);
await browser.close();
let fails = 0;
const line = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) fails++; };
if (!r) { line(false, `page did not finish: ${errors.join(' | ')}`); process.exit(1); }
for (const way of ['uniform', 'attribute', 'vertex']) for (const c of r[way]) {
  line(c.black === 0 && c.doubled === 0 && Math.abs(c.share - c.f) < 0.02,
    `${way} f=${c.f}: black ${c.black}, doubled ${c.doubled}, side-0 share ${c.share.toFixed(3)}`);
}
const s = r.shadow;
line(s.differ === 0 && Math.abs(s.covered / s.total - 0.5) < 0.02,
  `depth material at f=0.5 covers ${s.covered}/${s.total} px, ${s.differ} differ from the colour pass`);
line(s.shadowProgram, 'a caster\'s fadeDepthMaterial builds its program in the shadow pass');
line(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
