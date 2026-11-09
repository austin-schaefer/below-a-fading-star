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
import { WORLD, SUN, LANDMARKS, CAUSEWAY_V4, WATER, PALETTE, SPAWN } from './world.js';
import { buildHud, buildLoadBar } from './hud.js';
import { createPerf } from './perf.js';
import { makeLightSlots } from './lights.js';
import { makeShadowCadence } from './shadows.js';
import { warmUp } from './warmup.js';
import { chooseTier, makeTier } from './tier.js';
import { installGpuMem } from './gpumem.js';
import { buildMountains } from './v4/mountains.js';
import { installKit } from './v4/kit/index.js';
import { makeRegions, REGION_FILES } from './v4/regions.js';
import { makeTinctures } from './v4/tinctures.js';

// Light rigs (v4 systems): exposure, the sun, the hemisphere (sky and ground colours) and the ambient floor.
const LIGHT_RIGS = {
  v3: { name: 'v3', exposure: 1.0, sun: 2.7, hemi: 1.4, hemiSky: '#564e94', hemiGround: '#1a1c14', ambient: 0.6, ambientColor: '#2c2a48' },
  v4: { name: 'v4', exposure: 1.25, sun: 2.7, hemi: 2.7, hemiSky: '#5a5296', hemiGround: '#2e2c20', ambient: 1.6, ambientColor: '#302d4c' },
};

const MODULES = [
  ['rocks', () => import('./rocks.js')],
  ['vegetation', () => import('./vegetation.js')],
  ['structures', () => import('./structures.js')],
  ['water', () => import('./water.js')],
  ['particles', () => import('./particles.js')],
  ['fauna', () => import('./fauna.js')],
  ['audio', () => import('./audio.js')],
  ['skylife', () => import('./skylife.js')],
  // v2 stage C modules, one per agent, so parallel work never shares a file
  ['flora2', () => import('./v2/flora.js')],
  ['ruins2', () => import('./v2/ruins.js')],
  ['inhabitants2', () => import('./v2/inhabitants.js')],
  ['riverlife2', () => import('./v2/riverlife.js')],
  // v4 systems: one module per bioregion (src/v4/regions/<file>.js), filled by the region agents
  ...Object.entries(REGION_FILES).map(([key, file]) => [`region-${key}`, () => import(`./v4/regions/${file}.js`)]),
  // v4 systems: the kit's test scene, only when named (?only=kit)
  ['kit', () => import('./v4/kit/demo.js'), { optIn: true }],
  ['dressing', () => import('./v4/dressing.js')], // v4: the Long Figure, the Discontinued Track, the Surveyor's Pegs
  ['span', () => import('./v4/span.js')], // v4: the Great Span (W) and the Postern (BG)
  ['paths', () => import('./v4/paths.js')], // v4 map: the leads, the pit's lip, the taller fall's mist
  ['thrones', () => import('./v5/thrones.js')], // v5 wonders: AM the Acephalous Thrones on the saddle's seats
  ['galleries', () => import('./v5/galleries.js')], // v5 wonders: AL the Galleries of Durance on the west wall
  ['lamps', () => import('./v5/lamps.js')], // v5 wonders: AO the Escarpment Lamps (window-lights on the north-west wall that go out one by one; ?lamps=0)
  ['plinths', () => import('./v5/plinths.js')], // v5 wonders: AW the Plinth Road north from Medlar Close
  ['hawser', () => import('./v5/hawser.js')], // v5: BA the Hawser, from the north wall into the court's paving
  ['occultation', () => import('./v5/occultation.js')], // v5 wonders: AR the Occultation (the passes and the hush; the shading is in the fog, terrain and sky shaders)
  ['dressing5', () => import('./v5/dressing.js')], // v5: CY the Collation, DE the Slipper, DF the Unfinished Prospect
  ['annals', () => import('./v5/annals.js')], // v5 wonders: AK the Annals (the breaks and the gutter's swing; the frieze is in terrain.js's shader)
  ['keptfire', () => import('./v5/keptfire.js')], // v5 wonders: DN the Kept Fire (a tended hearth on the Outwash; one point light, ?keptfire=0)
  ['nave', () => import('./v5/nave.js')], // v5 wonders: BD the Foundered Nave, a sinkhole over a buried hall on the east moor
  // v7, the living: one line per module, each named living-<group> (shadows.js treats living-* as dynamic casters)
  ['living-canyon', () => import('./v7/canyon.js')], // v7: CE the Bather, CX the Toadstone (DP the Luminous Reach is v7/reach.js, in the water's shaders; ?canyon=0)
  ['living-glyphs', () => import('./v7/glyphs.js')], // v7: CP the Scriveners, the glyph motif, CT the Tesserine Moles (?glyphs=0)
  ['living-walkers', () => import('./v7/walkers.js')], // v7-01: CD the Little Thurifer, CG the Leerie, DM the Link-Boy (?walkers=0)
  ['living-workers', () => import('./v7/workers.js')], // v7: BY the Taker of Altitudes, BZ the Coheirs, CF the Sexton of No One (?workers=0)
  ['living-small', () => import('./v7/small.js')], // v7: CM the Indistinct, CO the Repetend, CQ the Simulacrum (?small=0)
  ['locallights', () => import('./v5/lights.js')], // v5: the local lights (the moss, the embers, the post lamp, the lit doorway, the Leerie's standards)
];

async function start() {
  const url = new URL(location.href);
  // Quality tier (tier.js, v3 stage 3): 'high' | 'medium' | 'low', from ?q= / ?tier=, the debug panel's pin, or the device
  const tierChoice = await chooseTier(url);
  const quality = tierChoice.name;
  const only = url.searchParams.get('only'); // comma list of modules to load (for testing)
  const skip = (url.searchParams.get('skip') || '').split(',').filter(Boolean);

  installAtmosphere();

  // Loading bar: terrain counts as one unit and each module as one; a module reports sub-steps with
  // ctx.progress(label, fraction 0..1) (await it so the bar can paint). Overall is monotonic.
  const showBar = buildLoadBar();
  const wanted = MODULES.filter(([name, , o]) => (only ? only.split(',').includes(name) : !o?.optIn) && !skip.includes(name));
  let settled = 0, within = 0;
  const progress = (label, fraction = within) => {
    within = Math.max(0, Math.min(1, fraction));
    return showBar(label, (settled + within) / (wanted.length + 1));
  };
  await progress('shaping the moor', 0);

  const canvas = document.getElementById('scene');
  // Target hygiene (v3 stage 3): the canvas only ever receives the composer's last full-screen pass (the scene is
  // drawn into the composer's targets, which have no MSAA), so it needs neither antialiasing nor a depth buffer;
  // high's antialias only bought a multisampled back buffer that changed no pixel. ?lean=0: as before.
  const lean = url.searchParams.get('lean') !== '0';
  const canvasAA = !lean && quality === 'high';
  // ?multidraw=0 hides WEBGL_multi_draw, as Firefox does: a BatchedMesh then draws once per instance
  let context;
  if (url.searchParams.get('multidraw') === '0') {
    context = canvas.getContext('webgl2', { alpha: false, depth: !lean, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, antialias: canvasAA, powerPreference: 'high-performance' });
    const get = context.getExtension.bind(context);
    context.getExtension = (name) => (name === 'WEBGL_multi_draw' ? null : get(name));
  }
  const renderer = new THREE.WebGLRenderer({ canvas, context, antialias: canvasAA, depth: !lean, powerPreference: 'high-performance' });
  // texture and target bytes for the profiler: the GL hooks only when it is on from the start (perf.js installs them late otherwise)
  const gpumem = url.searchParams.get('perf') === '1' || url.searchParams.get('bench') != null ? installGpuMem(renderer.getContext(), canvas) : null;
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  // ?pcf=soft|hard: PCFSoft (default, as before) or PCF with the light's radius. Both take 17 taps; hard bands
  // the dappled light in the wood (shots/wip/perf-02-pcf-wood-*), for a saving of a few multiplies a tap.
  const pcf = url.searchParams.get('pcf') || 'soft';
  renderer.shadowMap.type = pcf === 'hard' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // The light rig (v4 systems, v4 Light (b)): the floor comes up so the darkest places are legibly dark rather
  // than black, the sun and the variance stay. ?light=v3 restores v3's rig for a bisect.
  const rig = url.searchParams.get('light') === 'v3' ? LIGHT_RIGS.v3 : LIGHT_RIGS.v4;
  renderer.toneMappingExposure = rig.exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(new THREE.Color(PALETTE.haze), 0.0022);
  const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.08, 2600);

  const events = new EventTarget();
  const updates = [];
  const ctx = {
    THREE, scene, renderer, camera, quality, events,
    world: WORLD, sun: SUN, landmarks: LANDMARKS, causeway: CAUSEWAY_V4, water: WATER, palette: PALETTE, spawn: SPAWN,
    noise: makeSimplex(WORLD.seed + 1),
    rng: mulberry32(WORLD.seed + 2),
    time: { t: 0, dt: 0 },
    // meta (optional, v3 stage 2): { pos | at(): {x,z}, near: m, hz: rate beyond near (0 holds still), r: m }
    registerUpdate: (fn, meta) => updates.push({ fn, meta: meta || null, acc: 0, held: false }),
    log: (...a) => console.log('[fp]', ...a),
    progress,
    throttle: url.searchParams.get('throttle') !== '0', // distance throttling (v3 stage 2); modules read it for their own gates
  };
  // Global helper for stable per-module RNG streams
  ctx.makeRng = (salt) => mulberry32(WORLD.seed ^ (salt * 2654435761 >>> 0));
  ctx.gpumem = gpumem;
  // Pixel ratio by tier, and its adaptive step (tier.js; was high 1.5, low 1 before v3): the HUD is DOM and stays crisp
  ctx.tier = makeTier(ctx, url, tierChoice);
  // Profiler, bench and toggles (perf.js): wraps registerUpdate so each callback is timed per module
  ctx.perf = createPerf(ctx);

  // Terrain
  ctx.terrain = buildTerrain(ctx);
  // The walls' far ranges and API (v4 systems, BI): crestAt, faceAt, the saddle, AM's seats, walkLimit
  ctx.mountains = buildMountains(ctx);
  ctx.regions = makeRegions(); // regionAt, airAt, soundAt and each region's hooks (v4 systems)
  ctx.tinctures = makeTinctures(ctx, url); // v4 Tinctures (DI): each region's hue in the haze, ?tinct=0 off
  installKit(ctx); // ctx.kit: masonry, stairs, measure figures, rook wheels, fog tiers (v4 systems)
  settled = 1; await progress('lighting the sun', 0);

  // Lights: the dying sun, a cold sky, warm ground bounce
  const sunDir = new THREE.Vector3(SUN.dir.x, SUN.dir.y, SUN.dir.z);
  const sunLight = new THREE.DirectionalLight(new THREE.Color('#ffb084'), rig.sun);
  sunLight.castShadow = true;
  let sm = ctx.tier.shadowMapSize(); // by tier (high 4096, medium and low 2048); ?smap= overrides
  sunLight.shadow.mapSize.set(sm, sm);
  sunLight.shadow.camera.near = 1; sunLight.shadow.camera.far = 420;
  const sb = 95;
  sunLight.shadow.camera.left = -sb; sunLight.shadow.camera.right = sb; sunLight.shadow.camera.top = sb; sunLight.shadow.camera.bottom = -sb;
  sunLight.shadow.bias = -0.0006; sunLight.shadow.normalBias = 0.6; sunLight.shadow.radius = 2;
  sunLight.shadow.camera.updateProjectionMatrix();
  scene.add(sunLight); scene.add(sunLight.target);
  const hemi = new THREE.HemisphereLight(new THREE.Color(rig.hemiSky), new THREE.Color(rig.hemiGround), rig.hemi);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(new THREE.Color(rig.ambientColor), rig.ambient);
  scene.add(ambient);
  ctx.lights = { sun: sunLight, hemi, ambient, sunDir, rig };
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
  import('./settings.js').then((m) => m.buildSettings(ctx)).catch((e) => console.error('[fp] settings failed:', e)); // v7-08: the gear and its panel

  // World modules
  const results = await Promise.allSettled(wanted.map(async ([name, load]) => {
    const t0 = performance.now();
    try {
      const mod = await load();
      await mod.build(ctx.perf.forModule(name)); // ctx as seen by this module: its updates and objects are tagged
      ctx.log(`${name} ready in ${(performance.now() - t0).toFixed(0)}ms`);
    } finally { settled++; within = 0; progress(); }
  }));
  results.forEach((r, i) => { if (r.status === 'rejected') console.error(`[fp] module ${wanted[i][0]} failed:`, r.reason); });

  // Post
  ctx.post = buildPost(ctx);
  // Point lights: a fixed number of slots copy the nearest sources (lights.js). ?lights=off: every light live.
  const lightsParam = url.searchParams.get('lights');
  ctx.tier.attach(); // the debug panel's quality rows, above perf's measure rows
  ctx.lightSlots = lightsParam === 'off' ? null : makeLightSlots(ctx, lightsParam != null && isFinite(+lightsParam) ? Math.max(0, Math.round(+lightsParam)) : 3);
  ctx.perf.attach();
  // Every material's shader program is compiled here, behind the title card. three otherwise compiles a
  // program the first time its object is drawn, and on ANGLE's Metal one compile holds a frame for tens of
  // milliseconds: turning towards a creature, a ruin or a region not yet seen stalled the frame and the
  // view jumped by the mouse travel it had missed. compileAsync walks every mesh, shown or hidden, with the
  // scene's final lights (the slots above), into the composer's buffer the scene pass draws to (a program
  // drawn to a render target is a different program from one drawn to the canvas), so the programs match
  // the ones the frames ask for. ?precompile=0 leaves each to its first draw.
  if (url.searchParams.get('precompile') !== '0') {
    const tc = performance.now();
    renderer.setRenderTarget(ctx.post.composer.readBuffer);
    const compiling = renderer.compileAsync(scene, camera);
    renderer.setRenderTarget(null);
    await compiling;
    ctx.log(`programs compiled in ${(performance.now() - tc).toFixed(0)}ms (${renderer.info.programs.length})`);
  }

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
  const shadowTarget = new THREE.Vector3(), fwdTmp = new THREE.Vector3();
  // A fixed light-space frame for texel snapping: the sun never moves.
  const lightView = new THREE.Matrix4().lookAt(sunDir, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)).invert();
  const lightViewInv = lightView.clone().invert();
  let shadowTexel = (2 * sb) / sm;
  // Shadow cadence (shadows.js): the map is redrawn when the shadow camera has moved, on a slow clock, or
  // while a creature near you moves. ?shadowhz=0 redraws every frame, as before.
  ctx.shadowCadence = makeShadowCadence(ctx, url, shadowTexel);
  // a tier change at runtime resizes the shadow map (three re-creates it at the new size on the next draw)
  ctx.setShadowMapSize = (n) => {
    if (n === sm) return;
    sm = n; shadowTexel = (2 * sb) / sm;
    sunLight.shadow.mapSize.set(sm, sm); sunLight.shadow.map?.dispose(); sunLight.shadow.map = null;
    ctx.shadowCadence.setTexel(shadowTexel); renderer.shadowMap.needsUpdate = true;
  };
  // Every geometry and texture goes to the GPU here, behind the title card (warmup.js); ?warmup=0 leaves
  // each to its first draw. ?perf=1 logs what it uploaded and what it cost.
  if (url.searchParams.get('warmup') !== '0') {
    const w = warmUp(ctx);
    if (url.searchParams.get('perf') === '1') ctx.log(`warm-up uploaded ${w.geometries} geometries, ${w.textures} textures, compiled ${w.programs} programs in ${w.ms}ms`);
  }

  // Update throttling by distance (v3 stage 2): a callback registered with meta runs every frame within
  // `near` metres of the player, and beyond it at `hz` (or not at all when hz is 0), given the time it
  // skipped as its dt so motion covers the same ground. On resuming after holding still it gets one
  // ordinary frame's dt. ?throttle=0 runs everything every frame.
  const throttle = ctx.throttle;
  const P = () => ctx.player.pos;
  function runUpdates(dt, t) {
    const p = P();
    for (const u of updates) {
      const m = u.meta;
      if (!m || !throttle) { u.fn(dt, t); continue; }
      u.acc += dt;
      const q = m.at ? m.at() : m.pos;
      const ex = q.x - p.x, ez = q.z - p.z, d = Math.sqrt(ex * ex + ez * ez) - (m.r || 0); // Math.hypot allocates
      if (d <= m.near) { u.fn(u.held ? dt : u.acc, t); u.acc = 0; u.held = false; }
      else if (m.hz > 0) { if (u.acc >= 1 / m.hz) { u.fn(u.acc, t); u.acc = 0; } }
      else u.held = true;
    }
  }

  // Frame pacing (v3 stage 2). ?cap= frames per second (default 60; 30 at q=low on battery where the browser
  // says so; 0 = uncapped, as before). About 10 fps while the title or paused card shows or the window has
  // been unfocused for 3 s; nothing while the tab is hidden. Time and the updates run once per rendered
  // frame with the real (clamped) dt, so the world and the audio mix keep going at the slower rate.
  // ?idle=0 keeps the full rate under the cards and when unfocused.
  const capParam = url.searchParams.get('cap');
  let cap = capParam != null && isFinite(+capParam) ? Math.max(0, +capParam) : 60;
  if (capParam == null && quality === 'low' && typeof navigator.getBattery === 'function') {
    navigator.getBattery().then((b) => { const f = () => { cap = b.charging ? 60 : 30; }; f(); b.addEventListener('chargingchange', f); }).catch(() => {});
  }
  const idle = url.searchParams.get('idle') !== '0';
  const IDLE_FPS = 10, UNFOCUSED_MS = 3000;
  const cardEl = document.getElementById('card');
  let blurredAt = document.hasFocus() ? null : performance.now();
  addEventListener('blur', () => { blurredAt = performance.now(); });
  addEventListener('focus', () => { blurredAt = null; });
  const pacing = { get cap() { return cap; }, fps: 0, idle: false };
  function targetFps(now) {
    const benching = ctx.perf.bench && !ctx.perf.bench.done;
    pacing.idle = idle && !benching && (!cardEl.classList.contains('hidden') || (blurredAt !== null && now - blurredAt > UNFOCUSED_MS));
    return pacing.idle ? (cap > 0 ? Math.min(cap, IDLE_FPS) : IDLE_FPS) : cap;
  }
  ctx.pacing = pacing;
  const render = url.searchParams.get('render') !== '0';
  let due = 0;
  document.addEventListener('visibilitychange', () => { due = 0; });
  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    const fps = pacing.fps = targetFps(now);
    if (fps > 0) {
      const iv = 1000 / fps;
      if (now < due - 1) return; // 1 ms early is on time: rAF stamps jitter around the vsync
      due = now - due > iv ? now + iv : due + iv; // keep the cadence; after a stall start afresh
    }
    frame();
  }

  function frame() {
    ctx.tier.frame(); // frame-time window for the adaptive pixel ratio
    const dt = Math.min(clock.getDelta(), 0.1);
    t += dt;
    ctx.time.t = t; ctx.time.dt = dt;
    ctx.perf.frameBegin(); // drives the bench camera before controls place it
    ctx.controls.update(dt);
    ctx.sky.update(dt, t);
    // The shadow camera rides along with the player. Its centre is snapped to whole shadow-map
    // texels in the light's own frame, so moving does not re-rasterise every shadow edge (that
    // was the shimmer in the wood); snapping in world units did not align with the light's grid.
    fwdTmp.set(-Math.sin(ctx.player.yaw), 0, -Math.cos(ctx.player.yaw));
    shadowTarget.copy(camera.position).addScaledVector(fwdTmp, 40);
    shadowTarget.applyMatrix4(lightView);
    shadowTarget.x = Math.round(shadowTarget.x / shadowTexel) * shadowTexel;
    shadowTarget.y = Math.round(shadowTarget.y / shadowTexel) * shadowTexel;
    shadowTarget.applyMatrix4(lightViewInv);
    const f = ctx.sky.flicker.value;
    sunLight.intensity = rig.sun * f;
    hemi.intensity = rig.hemi * (0.6 + 0.4 * f);
    scene.fog.color.setStyle(PALETTE.haze).multiplyScalar(0.55 + 0.45 * f);
    ctx.tinctures.apply(scene.fog.color); // the region's hue at the same luminance
    ctx.perf.cpu('frame');
    runUpdates(dt, t);
    ctx.perf.mark();
    ctx.hud.update(dt, t);
    ctx.post.update(dt, t);
    // the shadow camera moves only when the map is redrawn: a map drawn from the old place stays right
    if (ctx.shadowCadence.update(dt, shadowTarget)) {
      sunLight.target.position.copy(shadowTarget);
      sunLight.position.copy(shadowTarget).addScaledVector(sunDir, 260);
    }
    ctx.lightSlots?.update();
    ctx.perf.cpu('frame');
    renderer.info.reset();
    if (render) ctx.post.composer.render();
    else scene.updateMatrixWorld(); // ?render=0: the updates alone, for measuring their CPU headlessly
    ctx.perf.frameEnd();
    frames++; fpsT += dt;
    if (fpsT >= 1) { ctx.hud.setFps(frames / fpsT); frames = 0; fpsT = 0; }
  }
  requestAnimationFrame(loop);
  window.__fp = ctx; // for the screenshot tool and the console
  document.body.classList.add('ready');
}

start().catch((e) => { console.error(e); document.getElementById('error').textContent = String(e?.stack || e); });
