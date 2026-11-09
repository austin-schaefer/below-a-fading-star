// The regions' sounds (v7.2-01 split out of src/audio.js; v7.2-03 voices it next): starts every v4 region's sound
// hook (src/v4/regions/<key>.js, through ctx.regions.startSounds in src/v4/regions.js) once, with the kit below.
// Each hook may return { tick(w, x, z, step, t, now), step(x, z, at, vol, pitch, out), cues }: its bed is ticked at
// 10 Hz with its soundAt weight, its step is the ground's footstep where it is primary, and its cues fall through
// from cues.js's dispatcher. The kit's rng and makeRng streams are tapped (a.tap, steps.js) so a region's step is
// recorded and replayed like the walker's own. startRegions(a) sets a.regionSnd and audio.regionCues.
export function startRegions(a) {
  const { ac, rng, ctx, audio, master, cueBus, verbIn, dryBus, white, pink, brown, voice, vOsc, vNoise, grain, filt, gainOf, chain, env, swell, send, panner, setPos, loopSrc, camera, terrain, tap } = a;
  const regionSnd = a.regionSnd = ctx.regions?.startSounds({ ac, rng: tap(rng), master, cueBus, verbIn, dryBus, white, pink, brown, voice, vOsc, vNoise, grain, filt, gainOf, chain, env, swell, send, panner, setPos, loopSrc, lead: () => a.lead, camera, terrain, noise: ctx.noise, sky: ctx.sky, makeRng: (salt) => tap(ctx.makeRng(salt)), hush: (p) => ctx.hush?.level(p.x, p.z) ?? 0 });
  audio.regionCues = regionSnd?.cueNames || [];
  return regionSnd;
}
