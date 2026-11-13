// Skylife: the sky is old and still inhabited. Meteors in sullen colours (now and then a shower,
// rarely a blue-white fireball that lights the ground), lattices of the lost age hanging in the
// high air, and the few things still moving among them: a four-winged flier, an inchworm of iron
// walking a spar, a tumbling hull, a thread rising past the glacier with a light climbing it,
// a lamp that tends the lattices.
// Everything hangs in one group that rides with the camera, as the sky dome does, at 1500-2500 m,
// so none of it parallaxes, the mountains still hide it, and it draws in front of the dome.
// All of it is hazed into the dome's own colours (see skylife/common.js) and lies under its cloud.
// Draw calls: meteors, trains, lattice struts, webbing, flier, worm, hull, thread, lamps (9).
// Audio cues: 'rumble' (a few seconds after a fireball), 'farcry' (the flier, sometimes),
// 'skycreak' (the worm's lunge, sometimes); each gets a world position 300 m out in its direction.
// Also here, outside the camera group: the Parhelion City in the sun's saddle (skylife/parhelion.js,
// ctx.parhelion), the Vigilant seated on the east-north-east wall (skylife/vigilant.js,
// ctx.vigilant = { headYaw, watched, ... }; 'rumble' at its head, rarely, when it turns unseen), and
// three omens in the group (skylife/omens.js: the procession, with a 'procession' cue as it
// appears; the shard belt, in some gutters only; the still star). Those add 5 draw calls
// (city 1, Vigilant body and eyes 2, omens 2) and about 14k triangles at q=high, 5k at q=low.
import * as THREE from 'three';
import { makeSkyUniforms, skylineElevation } from './skylife/common.js';
import { buildMeteors, METEOR_COLOURS } from './skylife/meteors.js';
import { buildLattices } from './skylife/lattices.js';
import { buildRemnants } from './skylife/remnants.js';
import { buildParhelion } from './skylife/parhelion.js';
import { buildVigilant } from './skylife/vigilant.js';
import { buildOmens } from './skylife/omens.js';

export async function build(ctx) {
  const { scene, camera } = ctx;
  const U = makeSkyUniforms();
  const group = new THREE.Group();
  group.name = 'skylife';
  scene.add(group);

  // the skyline as seen from the castle gate, so low things sit just over the mountains
  const sp = ctx.spawn;
  const skyCache = new Map();
  const skyline = (b) => {
    const k = Math.round(((b % 360) + 360) % 360 / 4);
    if (!skyCache.has(k)) skyCache.set(k, skylineElevation(ctx.terrain, sp.x, sp.z, k * 4));
    return skyCache.get(k);
  };

  const lat = buildLattices(ctx, group, U, ctx.makeRng(7101), skyline);
  const met = buildMeteors(ctx, group, U, ctx.makeRng(7102));
  const rem = buildRemnants(ctx, group, U, ctx.makeRng(7103), lat, skyline);
  const baseDraws = group.children.length;
  const city = buildParhelion(ctx, U, ctx.makeRng(7104));
  const vig = buildVigilant(ctx, ctx.makeRng(7105));
  const om = buildOmens(ctx, group, U, ctx.makeRng(7106));
  ctx.parhelion = city.state;
  ctx.vigilant = vig.api;

  let T = 0, paused = false, forceFlicker = null;
  function update(dt, t) {
    if (!paused) T += dt;
    U.uT.value = T;
    U.uSkyTime.value = t; // the dome's clock is main's t
    U.uFlicker.value = forceFlicker ?? ctx.sky?.flicker?.value ?? 1;
    group.position.copy(camera.position);
    lat.update(dt, T);
    met.update(paused ? 0 : dt);
    rem.update(paused ? 0 : dt, T);
    city.update(dt);
    vig.update(dt, U.uFlicker.value);
    om.update(paused ? 0 : dt, T);
  }
  ctx.registerUpdate(update);
  update(0, 0);

  // test hooks and a little introspection
  const viewDir = new THREE.Vector3();
  const lookAt = (d, pitchBias = 0) => {
    ctx.player.yaw = Math.atan2(-d.x, -d.z);
    ctx.player.pitch = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)) + pitchBias;
  };
  const dirOf = (name) => {
    const L = lat.info.find((l) => l.name === name);
    if (L) return L.dir.clone();
    return rem.api.dirs[name]?.() ?? om.api.dirs[name]?.();
  };
  ctx.skylife = {
    group, uniforms: U, lattices: lat.info, colours: METEOR_COLOURS.map(([h]) => h),
    drawCalls: group.children.length + 3, triangles: lat.tris + met.tris + rem.api.tris + city.tris + vig.tris, webSegments: lat.webs,
    added: { drawCalls: group.children.length - baseDraws + 3, triangles: city.tris + vig.tris, points: om.api.points },
    anchorThread: (world) => rem.api.anchor(world), // v12-H2: the thread stands on the Plummet
    omens: om.api, startProcession: (dir = null) => { if (!dir) { camera.getWorldDirection(viewDir); dir = viewDir.clone(); dir.y = Math.max(dir.y, 0.6); dir.normalize(); } om.api.startProcession(T, dir); },
    spawnMeteor: (colourIndex, at = 0.6, dir = null) => {
      if (!dir) { camera.getWorldDirection(viewDir); dir = viewDir.clone(); dir.y += 0.12; }
      return met.spawn(colourIndex ?? 0, { at, dir });
    },
    showerNow: (dir = null, still = false) => { if (!dir) { camera.getWorldDirection(viewDir); dir = viewDir.clone(); } met.shower(T, dir, still); },
    state: () => met.state(),
    teleportBirdInView: () => { camera.getWorldDirection(viewDir); rem.api.startFlight(T, viewDir.clone().normalize()); },
    pause: (p = true) => { paused = p; },
    setFlicker: (v) => { forceFlicker = v; },
    setWormPhase: (phase, p = 0.5) => { const W = rem.api.wormState; W.phase = phase; W.pt = p * [3.6, 2.8, 2.4, 0.85][phase]; },
    setClimber: (f) => { rem.api.climb.f = f; },
    dirOf, lookAt: (name, pitchBias = 0) => { const d = dirOf(name); if (d) lookAt(d, pitchBias); return d; },
    advance: (sec) => { for (let k = 0; k < sec * 20; k++) update(0.05, ctx.time.t); },
  };
  ctx.log(`skylife: parhelion ${city.tris} tris, ${city.windows} windows; vigilant ${vig.tris} tris; omens ${om.api.points} points`);
  ctx.log(`skylife: ${group.children.length + 3} draws, ${ctx.skylife.triangles} tris; ${lat.info.length} lattices, ${lat.struts} struts, ${lat.webs} web strands, ${met.count} meteor slots`);
}
