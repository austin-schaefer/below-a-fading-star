// The study page (study.html, #77): every figure and creature side by side on plain ground, close and moving, under
// one of two lights, and every recipe that takes an rng at six seeds. A dev page: nothing in the walk links here or
// loads src/study/. Each figure or creature module says how to build one of itself standing alone with an exported
// `study` (the list of those modules: src/study/registry.js; the contract: there); the recipes are adapted in
// src/study/recipes.js. Each subject is built by its own module's builder against a flat stand-in ctx (src/study/ctx.js),
// at its own place on the map, and drawn in its own cell by its own camera with every other subject hidden.
//
// Params:  ?sheet=figures|creatures|all|recipes (default figures), or ?sheet=recipes&only=<recipe ids>
//          ?light=neutral|sun (default neutral: white key and sky; sun: the walk's low western sun and violet sky)
//          ?only=id,id (subjects or recipes by id)  ?q=low|high (what builders are told; default high)
//          ?seeds=6 (a recipe's seeds)  ?cols=N (force the grid)  ?shot=1 (no clock of its own: tools drive it)
//          ?t=S (run S seconds of the subjects' clocks before the first picture)  ?far=1 (the camera at 3x: the size a
//          visitor meets it at a dozen metres)
// Keys:    L the other light, Space pause, drag to turn every camera round its subject, wheel to come closer, R reset.
// window.__study: { ready, subjects: [{ id, name, kind, module, ok, error, tris, missing }], errors, advance(s),
//          render(), recipes } for tools/study-shots.mjs and tools/study-test.mjs.
import * as THREE from 'three';
import { SUN } from '../world.js';
import { studyCtx } from './ctx.js';
import { STUDY_MODULES } from './registry.js';
import { RECIPES } from './recipes.js';
import { mulberry32 } from '../noise.js';

const Q = new URLSearchParams(location.search);
const SHEET = Q.get('sheet') || 'figures';
let LIGHT = Q.get('light') === 'sun' ? 'sun' : 'neutral';
const ONLY = Q.get('only') ? new Set(Q.get('only').split(',')) : null;
const QUALITY = Q.get('q') === 'low' ? 'low' : 'high';
const SEEDS = Math.max(1, Math.min(12, +(Q.get('seeds') || 6)));
const SHOT = Q.get('shot') === '1';
const FAR = Q.get('far') === '1' ? 3 : 1;

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: SHOT });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setScissorTest(true);
renderer.autoClear = true;

const scene = new THREE.Scene();
const events = new EventTarget();
const time = { t: 0, dt: 0 };
const flicker = { value: 1, dark: 0, lamps: 0 };

// ---- the lights: the neutral key turns with each cell's camera (form reads the same on every subject); the sun is
// the walk's (src/main.js's v4 rig: its colour, strength and direction, its sky and ground, its ambient floor)
const sunDir = new THREE.Vector3(SUN.dir.x, SUN.dir.y, SUN.dir.z).normalize();
const key = new THREE.DirectionalLight('#ffffff', 2.4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
scene.add(key, key.target);
const hemi = new THREE.HemisphereLight('#dfe3ea', '#5b5446', 1.3);
const ambient = new THREE.AmbientLight('#302d4c', 0);
scene.add(hemi, ambient);
const lights = { sun: key, hemi, ambient, sunDir, rig: { name: 'study', exposure: 1.25, sun: 2.7, hemi: 2.7, ambient: 1.6 } };

function skyTexture(stops) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const SKY = {
  neutral: skyTexture([[0, '#8d9096'], [1, '#6c6e72']]),
  sun: skyTexture([[0, '#2a2540'], [0.55, '#3c3456'], [0.85, '#6a2a26'], [1, '#8a2a16']]),
};
function setLight(which) {
  LIGHT = which;
  const sun = which === 'sun';
  key.color.set(sun ? '#ffb084' : '#ffffff'); key.intensity = sun ? 2.7 : 2.4;
  hemi.color.set(sun ? '#5a5296' : '#dfe3ea'); hemi.groundColor.set(sun ? '#2e2c20' : '#5b5446'); hemi.intensity = sun ? 2.7 : 1.3;
  ambient.intensity = sun ? 1.6 : 0;
  renderer.toneMappingExposure = sun ? 1.25 : 1.0;
  scene.background = SKY[which];
  ground.material.color.set(sun ? '#6d6a58' : '#8a8676');
}

// ---- plain ground: a metre grid, every fifth line stronger, so size and travel read
const ground = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 2;
  for (let i = 0; i <= 5; i++) { const p = (i * 512) / 5; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 512); g.moveTo(0, p); g.lineTo(512, p); g.stroke(); }
  g.strokeStyle = 'rgba(0,0,0,0.32)'; g.lineWidth = 4; g.strokeRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1200 / 5, 1200 / 5);
  t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; m.name = 'study-ground';
  return m;
})();
scene.add(ground);
setLight(LIGHT);

// ---- the subjects
let allBuilt; const built = new Promise((r) => { allBuilt = r; });
const shared = { renderer, scene, quality: QUALITY, events, time, flicker, lights, built: built };
const subjects = [], errors = [];
const want = (kind, id) => (ONLY ? ONLY.has(id) : SHEET === 'all' ? kind !== 'recipe' : SHEET === `${kind}s`);
const V = new THREE.Vector3();

function countTris(group) {
  let n = 0;
  group.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry, per = (g.index ? g.index.count : g.attributes.position?.count || 0) / 3;
    n += per * (o.isInstancedMesh ? o.count : 1);
  });
  return Math.round(n);
}

async function buildSubjects() {
  for (const path of STUDY_MODULES) {
    let mod;
    try { mod = await import(`../${path.replace(/^src\//, '')}`); }
    catch (e) { errors.push(`${path}: import: ${e.message}`); subjects.push({ id: path, name: path, kind: '?', module: path, ok: false, error: `import: ${e.message}` }); continue; }
    const list = mod.study;
    if (!Array.isArray(list)) { errors.push(`${path}: no study export`); continue; }
    for (const def of list) {
      if (!want(def.kind, def.id)) continue;
      const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 2000);
      const sub = { id: def.id, name: def.name, kind: def.kind, looker: def.looker, module: path, h: def.h || 1.8, camera: cam, ok: false, error: null, tris: 0, updates: [], missing: [] };
      const S = studyCtx(shared, sub);
      sub.group = S.group; sub.updates = S.updates; sub.player = S.player;
      scene.add(S.group);
      // the camera stands roughly where it will, so a builder that reads where the looker is reads something near
      const guess = def.at || [0, 0];
      cam.position.set(guess[0] + 3, 1.7, guess[1] + 3);
      try {
        const r = (await def.build(S.ctx)) || {};
        sub.at = r.at || ((out) => out.set(guess[0], 0, guess[1]));
        sub.face = r.face || null; sub.floor = r.floor; sub.fly = !!def.fly || !!r.fly;
        sub.ground = r.ground !== false;
        if (r.h) sub.h = r.h;
        sub.ok = true;
      } catch (e) {
        sub.error = `${e.message}`.slice(0, 300);
        errors.push(`${def.id}: build: ${e.message}`);
        console.error(`[study] ${def.id} failed:`, e);
      }
      sub.missing = [...S.missing].filter((k) => !(k in S.ctx));
      subjects.push(sub);
    }
  }
  // the recipes: each at SEEDS seeds in a row, apart from each other and from the map's subjects
  let row = 0;
  for (const R of RECIPES) {
    if (!(ONLY ? ONLY.has(R.id) : SHEET === 'recipes')) continue;
    for (let s = 0; s < SEEDS; s++) {
      const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 4000);
      const x = 2000 + s * 400, z = 2000 + row * 400;
      const sub = { id: `${R.id}#${s + 1}`, recipe: R.id, name: `${R.name}`, seed: s + 1, kind: 'recipe', module: R.module, camera: cam, ok: false, error: null, tris: 0, updates: [], missing: [] };
      const S = studyCtx(shared, sub);
      sub.group = S.group; sub.updates = S.updates;
      scene.add(S.group);
      try {
        const rng = mulberry32((R.salt || 1) * 7919 + (s + 1) * 104729);
        const obj = await R.build(rng, s + 1, S.ctx);
        if (obj) S.group.add(obj);
        S.group.position.set(x, 0, z);
        S.group.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(S.group);
        sub.box = box; sub.at = (out) => out.set(x, 0, z);
        sub.h = Math.max(0.3, box.max.y);
        sub.span = Math.max(box.max.x - box.min.x, box.max.z - box.min.z, sub.h);
        sub.ok = true;
      } catch (e) {
        sub.error = `${e.message}`.slice(0, 300);
        errors.push(`${sub.id}: build: ${e.message}`);
        console.error(`[study] ${sub.id} failed:`, e);
      }
      sub.missing = [...S.missing].filter((k) => !(k in S.ctx));
      subjects.push(sub);
    }
    // a recipe's six share one framing: the largest of them sets it, so their range of size shows
    const mine = subjects.filter((s) => s.recipe === R.id && s.ok);
    const span = Math.max(1, ...mine.map((s) => s.span)), h = Math.max(0.3, ...mine.map((s) => s.h));
    for (const s of mine) { s.fitSpan = span; s.fitH = h; }
    row++;
  }
  allBuilt(true);
}

// ---- the grid
let cells = [];
function layout() {
  const W = innerWidth, H = innerHeight, n = subjects.length || 1;
  const recipes = subjects.length && subjects.every((s) => s.kind === 'recipe');
  const aspect = recipes ? 1.25 : SHEET === 'creatures' ? 1.25 : 0.8;
  let best = { c: 1, size: 0 };
  const forced = +Q.get('cols') || (recipes ? SEEDS : 0);
  for (let c = 1; c <= n; c++) {
    if (forced && c !== forced) continue;
    const r = Math.ceil(n / c), cw = Math.min(W / c, (H / r) * aspect);
    if (cw > best.size) best = { c, size: cw };
  }
  const c = best.c, r = Math.ceil(n / c), cw = W / c, ch = H / r;
  const labels = document.getElementById('labels');
  labels.textContent = '';
  cells = subjects.map((s, i) => {
    const x = (i % c) * cw, y = Math.floor(i / c) * ch;
    s.camera.aspect = cw / ch; s.camera.updateProjectionMatrix();
    const el = document.createElement('div');
    el.className = 'lab' + (s.ok ? '' : ' bad');
    el.style.left = `${x}px`; el.style.top = `${y}px`; el.style.maxWidth = `${cw - 8}px`;
    s.tris = s.ok ? countTris(s.group) : 0;
    const what = s.kind === 'recipe' ? `seed ${s.seed}` : s.kind;
    el.innerHTML = s.ok
      ? `<b>${s.name}</b> <i>${what} · ${fmt(s.tris)} tris · ${s.module.replace(/^src\//, '')}</i>`
      : `<b>${s.name}</b> failed: ${s.error}${s.missing.length ? ` (ctx lacks ${s.missing.join(', ')})` : ''}`;
    labels.appendChild(el);
    return { s, x, y, w: cw, h: ch };
  });
  renderer.setSize(W, H, false);
  document.getElementById('bar').innerHTML = `${SHEET} · ${LIGHT} · ${subjects.length} · ` +
    ['figures', 'creatures', 'recipes'].map((k) => `<a href="?sheet=${k}&light=${LIGHT}">${k}</a>`).join('') +
    `<a href="?${new URLSearchParams({ ...Object.fromEntries(Q), light: LIGHT === 'sun' ? 'neutral' : 'sun' })}">${LIGHT === 'sun' ? 'neutral' : 'sun'}</a>`;
}
const fmt = (n) => (n >= 10000 ? `${Math.round(n / 1000)}k` : `${n}`);

// ---- the cameras: each on its subject's front three-quarter (or a fixed bearing when it has no front), at the
// distance that frames its height in the cell
const view = { turn: 0, zoom: 1 };
const T0 = new THREE.Vector3(), C0 = new THREE.Vector3();
function aim(s) {
  const cam = s.camera;
  s.at(T0);
  let span, mid;
  if (s.kind === 'recipe') { span = Math.max(s.fitH, s.fitSpan * 0.75); mid = s.fitH * 0.45; }
  else { span = s.h; mid = s.fly ? 0 : s.h * 0.52; }
  const fovV = THREE.MathUtils.degToRad(cam.fov), fit = Math.max(span / (2 * Math.tan(fovV / 2)), span / (2 * Math.tan(fovV / 2) * cam.aspect));
  const dist = fit * 1.25 * view.zoom * FAR + (s.kind === 'recipe' ? 0 : 0.25);
  const face = s.face ? s.face() : 0.7;
  const b = face + (s.face ? 0.6 : 0) + view.turn, el = s.kind === 'recipe' ? 0.32 : 0.14;
  C0.set(T0.x, T0.y + mid, T0.z);
  cam.position.set(C0.x + Math.sin(b) * Math.cos(el) * dist, C0.y + Math.sin(el) * dist, C0.z + Math.cos(b) * Math.cos(el) * dist);
  cam.lookAt(C0);
  cam.updateMatrixWorld();
  return dist;
}

function step(dt) {
  time.dt = dt; time.t += dt;
  for (const s of subjects) {
    if (!s.ok) continue;
    for (const fn of s.updates) {
      try { fn(dt, time.t); }
      catch (e) { s.ok = false; s.error = `update: ${e.message}`.slice(0, 300); errors.push(`${s.id}: update: ${e.message}`); console.error(`[study] ${s.id} update failed:`, e); layoutSoon = true; break; }
    }
  }
}
let layoutSoon = false;
function advance(sec, fps = 30) {
  const n = Math.max(1, Math.round(sec * fps));
  for (let i = 0; i < n; i++) step(sec / n);
}

function render() {
  if (layoutSoon) { layoutSoon = false; layout(); }
  const H = innerHeight;
  for (const c of cells) {
    for (const o of subjects) o.group.visible = o === c.s;
    const s = c.s;
    if (!s.ok) { renderer.setViewport(c.x, H - c.y - c.h, c.w, c.h); renderer.setScissor(c.x, H - c.y - c.h, c.w, c.h); renderer.setClearColor('#2a1a1a'); renderer.clear(); continue; }
    let dist;
    try { dist = aim(s); s.at(T0); }
    catch (e) { s.ok = false; s.error = `at: ${e.message}`.slice(0, 300); errors.push(`${s.id}: at: ${e.message}`); layoutSoon = true; continue; }
    ground.position.set(T0.x, s.fly ? 0 : (s.floor ?? 0), T0.z);
    ground.visible = s.ground !== false;
    if (s.kind === 'recipe' && s.box) ground.position.y = 0;
    // the key: the walk's sun, or the neutral key over the camera's left shoulder; its shadow box round the subject
    const r = Math.max(4, dist * 1.2);
    if (LIGHT === 'sun') V.copy(sunDir);
    else { const b = Math.atan2(s.camera.position.x - T0.x, s.camera.position.z - T0.z) + 0.75; V.set(Math.sin(b) * 0.55, 0.78, Math.cos(b) * 0.55).normalize(); }
    key.target.position.set(T0.x, T0.y, T0.z);
    key.position.copy(T0).addScaledVector(V, r * 3);
    const sc = key.shadow.camera; sc.left = sc.bottom = -r; sc.right = sc.top = r; sc.near = 0.1; sc.far = r * 6; sc.updateProjectionMatrix();
    key.target.updateMatrixWorld(); key.updateMatrixWorld();
    renderer.setViewport(c.x, H - c.y - c.h, c.w, c.h);
    renderer.setScissor(c.x, H - c.y - c.h, c.w, c.h);
    renderer.render(scene, s.camera);
  }
}

// ---- input: drag turns every camera, wheel brings them closer, L the other light, Space pause, R reset
let paused = false, drag = null;
addEventListener('keydown', (e) => {
  if (e.key === 'l' || e.key === 'L') { setLight(LIGHT === 'sun' ? 'neutral' : 'sun'); layout(); }
  else if (e.key === ' ') { paused = !paused; e.preventDefault(); }
  else if (e.key === 'r' || e.key === 'R') { view.turn = 0; view.zoom = 1; }
});
canvas.addEventListener('pointerdown', (e) => { drag = e.clientX; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => { if (drag == null) return; view.turn -= (e.clientX - drag) * 0.01; drag = e.clientX; });
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => { view.zoom = Math.min(4, Math.max(0.3, view.zoom * Math.exp(e.deltaY * 0.001))); e.preventDefault(); }, { passive: false });
addEventListener('resize', layout);

window.__study = { ready: false, subjects, errors, advance, render, layout, setLight: (w) => { setLight(w); layout(); }, recipes: RECIPES.map((r) => r.id), sheet: SHEET };
addEventListener('error', (e) => errors.push(`page: ${e.message}`));
addEventListener('unhandledrejection', (e) => errors.push(`page: ${e.reason?.message || e.reason}`));

await buildSubjects();
// a builder's ctx.built().then(...) runs now; give them a turn, then the warm-up the clock asks for
await new Promise((r) => setTimeout(r, 0));
advance(+(Q.get('t') || 1.5));
layout();
render();
window.__study.ready = true;
document.body.classList.add('ready');
if (!SHOT) {
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!paused) step(dt);
    render();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
