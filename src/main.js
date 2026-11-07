// Entry point. Builds the renderer, terrain, sky, lights and controls, then asks each world
// module (vegetation, structures, water, particles, fauna, audio) to build itself against a
// shared context, and runs the frame loop. Modules register per-frame updates via ctx.registerUpdate.
import * as THREE from 'three';
import { installAtmosphere } from './atmosphere.js';
import { buildTerrain } from './terrain.js';
import { buildSky } from './sky.js';
import { buildControls } from './controls.js';
import { buildPost } from './post.js';
import { makeSimplex, mulberry32 } from './noise.js';
import { WORLD, SUN, LANDMARKS, CAUSEWAY, WATER, PALETTE, SPAWN } from './world.js';
import { buildHud } from './hud.js';

const MODULES = [
  ['rocks', () => import('./rocks.js')],
  ['vegetation', () => import('./vegetation.js')],
  ['structures', () => import('./structures.js')],
  ['water', () => import('./water.js')],
  ['particles', () => import('./particles.js')],
  ['fauna', () => import('./fauna.js')],
  ['audio', () => import('./audio.js')],
];

async function start() {
  const url = new URL(location.href);
  const quality = url.searchParams.get('q') || (navigator.hardwareConcurrency <= 4 || /Mobi|Android/i.test(navigator.userAgent) ? 'low' : 'high');
  const only = url.searchParams.get('only'); // comma list of modules to load (for testing)
  const skip = (url.searchParams.get('skip') || '').split(',').filter(Boolean);

  installAtmosphere();

  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 1.5 : 1));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(new THREE.Color(PALETTE.haze), 0.0022);
  const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.08, 2600);

  const events = new EventTarget();
  const updates = [];
  const ctx = {
    THREE, scene, renderer, camera, quality, events,
    world: WORLD, sun: SUN, landmarks: LANDMARKS, causeway: CAUSEWAY, water: WATER, palette: PALETTE, spawn: SPAWN,
    noise: makeSimplex(WORLD.seed + 1),
    rng: mulberry32(WORLD.seed + 2),
    time: { t: 0, dt: 0 },
    registerUpdate: (fn) => updates.push(fn),
    log: (...a) => console.log('[fp]', ...a),
  };
  // Global helper for stable per-module RNG streams
  ctx.makeRng = (salt) => mulberry32(WORLD.seed ^ (salt * 2654435761 >>> 0));

  // Terrain
  ctx.terrain = buildTerrain(ctx);

  // Lights: the dying sun, a cold sky, warm ground bounce
  const sunDir = new THREE.Vector3(SUN.dir.x, SUN.dir.y, SUN.dir.z);
  const sunLight = new THREE.DirectionalLight(new THREE.Color(PALETTE.sunLight), 4.4);
  sunLight.castShadow = true;
  const sm = quality === 'high' ? 4096 : 2048;
  sunLight.shadow.mapSize.set(sm, sm);
  sunLight.shadow.camera.near = 1; sunLight.shadow.camera.far = 420;
  const sb = 95;
  sunLight.shadow.camera.left = -sb; sunLight.shadow.camera.right = sb; sunLight.shadow.camera.top = sb; sunLight.shadow.camera.bottom = -sb;
  sunLight.shadow.bias = -0.0006; sunLight.shadow.normalBias = 0.6; sunLight.shadow.radius = 2;
  scene.add(sunLight); scene.add(sunLight.target);
  const hemi = new THREE.HemisphereLight(new THREE.Color('#4a3a66'), new THREE.Color('#2a1a10'), 1.05);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(new THREE.Color('#2a2238'), 0.7);
  scene.add(ambient);
  ctx.lights = { sun: sunLight, hemi, ambient, sunDir };
  ctx.sun.light = sunLight;
  ctx.sun.vec = sunDir;

  // Sky
  ctx.sky = buildSky(ctx);
  // Controls
  ctx.controls = buildControls(ctx);
  ctx.player = ctx.controls.state;
  ctx.addCollider = ctx.controls.addCollider;
  // HUD
  ctx.hud = buildHud(ctx);

  // World modules
  const wanted = MODULES.filter(([name]) => (!only || only.split(',').includes(name)) && !skip.includes(name));
  const results = await Promise.allSettled(wanted.map(async ([name, load]) => {
    const t0 = performance.now();
    const mod = await load();
    await mod.build(ctx);
    ctx.log(`${name} ready in ${(performance.now() - t0).toFixed(0)}ms`);
  }));
  results.forEach((r, i) => { if (r.status === 'rejected') console.error(`[fp] module ${wanted[i][0]} failed:`, r.reason); });

  // Post
  ctx.post = buildPost(ctx);

  // Resize
  function resize() {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    ctx.post.resize(innerWidth, innerHeight);
  }
  addEventListener('resize', resize);

  // Begin: click the title card
  events.addEventListener('begin', () => { ctx.controls.state.enabled = true; ctx.controls.lock(); });

  // Frame loop
  renderer.info.autoReset = false;
  const clock = new THREE.Clock();
  let t = 0, frames = 0, fpsT = 0;
  const shadowTarget = new THREE.Vector3();
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.1);
    t += dt;
    ctx.time.t = t; ctx.time.dt = dt;
    ctx.controls.update(dt);
    ctx.sky.update(dt, t);
    // shadow camera rides along with the player, snapped to texel-ish steps to reduce swim
    const fwd = new THREE.Vector3(-Math.sin(ctx.player.yaw), 0, -Math.cos(ctx.player.yaw));
    shadowTarget.copy(camera.position).addScaledVector(fwd, 40);
    shadowTarget.x = Math.round(shadowTarget.x / 2) * 2; shadowTarget.z = Math.round(shadowTarget.z / 2) * 2; shadowTarget.y = Math.round(shadowTarget.y / 2) * 2;
    sunLight.target.position.copy(shadowTarget);
    sunLight.position.copy(shadowTarget).addScaledVector(sunDir, 260);
    const f = ctx.sky.flicker.value;
    sunLight.intensity = 4.4 * f;
    hemi.intensity = 1.05 * (0.6 + 0.4 * f);
    scene.fog.color.setStyle(PALETTE.haze).multiplyScalar(0.55 + 0.45 * f);
    for (const u of updates) u(dt, t);
    ctx.hud.update(dt, t);
    ctx.post.update(dt, t);
    renderer.info.reset();
    ctx.post.composer.render();
    frames++; fpsT += dt;
    if (fpsT >= 1) { ctx.hud.setFps(frames / fpsT); frames = 0; fpsT = 0; }
  }
  frame();
  window.__fp = ctx; // for the screenshot tool and the console
  document.body.classList.add('ready');
}

start().catch((e) => { console.error(e); document.getElementById('error').textContent = String(e?.stack || e); });
