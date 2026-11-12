# Brief v9-T1: three things the owner asked for

The owner filed these after v8. Each is small; do all three, each in its own commit.

Read first: `AGENTS.md`, the `wilderness` skill; for 2, the `sound-design` skill.

**1. Issue #19, "Forest shafts of light from... nowhere".** The owner: "I love the new forest shafts of light, but in some places they too obviously originate from nowhere. Here, for instance, is the forest viewed from outside near the astronomer guy." v8 gave the Deodand Wood shafts of ember light (find them: `git grep -n -i shaft -- src`; v8's ground brief is `briefs/v8/brief-v8-02-ground.md`). Seen from outside the wood, and from some places inside, a shaft's top ends in open air above or beside the canopy. Fix the cause, keep the shafts: a shaft starts inside or just under a crown (a gap in the canopy it falls through), never above the treetops; its top fades out rather than ending in an edge; from outside the wood the shafts are hidden by the trees or faded by distance and by the camera being outside the wood. Render before and after from outside the wood near the astronomer (find him: `git grep -n -i astronomer -- src`), from two other outside points, and from three inside, at medium. Inside must look as good as before.

**2. Issue #17, "Footsteps are a hair too loud across the board".** `src/audio/steps.js`. A hair: about −3 dB on the walker's own steps on every ground, one constant, not a per-surface retune; figures' steps (the Leerie, the Link-Boy) keep their level relative to the walker's or come down with it, your call, say which. Other agents are changing `src/audio/graph.js`, `src/audio.js` (a music bus) and `tools/audio-*.mjs` right now: touch only `steps.js` if you can. Run `node tools/audio-test.mjs` on your port; if a step gate pins the old level, move the gate by the same amount and say so.

**3. Issue #16, "Remove all rocks/vegetation from the white man on the mountain".** The white figure cut into the mountainside (the Long Figure, `plans/IDEAS-v5.md` "DG"; find it in `src/`). Nothing grows or lies on him: no boulders, stones, pebbles, grass, plants or trees inside his outline plus a metre. Rocks have one table for this, `src/v8/clearings.js`; vegetation has its own masks (find how the roads or the common keep grass off). Render before and after, from the keep's side and from close, at medium; extend `tools/rocks-test.mjs` by a row for him.

**Done when.** The renders show each fix; `rocks-test`, `audio-test`, `walk-test`, `perf-test`, `loading-test`, `grass-flicker-test`, `regions-test`, `build-artifact` pass.

Finish and report as the `wilderness` skill's Hand-back says, under 250 words, with the render paths.
