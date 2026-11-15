# Brief v14-D0: the first descent (the Foundered Nave, entered)

Worktree `.claude/worktrees/issue-1400-first-descent`, branch `issue-1400-first-descent`, port 8161. Work only there. Read `briefs/v14/_common.md` first and do what it says. Also load `sound-design` before the audio lines.

## Goal

A visitor has only ever looked into the Foundered Nave (255, 40; `src/v5/nave.js`, `src/v5/nave/`) through its sinkhole: a buried hall, "left dark on purpose". Make it the first place in the walk where they go **below the ground**: something on the surface, seen from the east road, that says "you can go down here"; a way down that is itself worth doing; the hall walked, in the dark, by the light that falls through the sinkhole and by whatever old light is still down there; and at the hall's far end the mouth of a passage going on (sealed, fallen or simply black for now: the next brief opens it toward the Pit at (200, 185), so decide which wall it leaves by and say so).

This is the one the rest of the milestone is built from, so it is also the kit: how a place here is made dark, sealed, and made to sound like stone.

Not the first idea. A buried nave with a ladder is every game's crypt. Ask what was worshipped or kept in a hall this size by people this old and this rich, why it foundered, and what the way down is made of now (who needed to get down there after it sank, and what did they leave?). The library has hooks, use one if it helps and write the story file: the Reckoner far below his door who asks "Two floors, or one?" (`stories/the-reckoner-under-the-door.md`), the tesserae, the leadsmen who sound depths with crystal leads (`stories/the-soundings.md`), the Sexton's other forty graves. No tallies (the Lantern Halt's is the only one).

## What the survey found (check it, do not trust it)

- Do not change `heightAt`. The Nave already makes the terrain's triangles over its hole degenerate (`src/v5/nave.js:219-231`); the Hypogeum drops below the ground with a rim patch and a `{replace:true}` walkable (`src/v2/ruins.js`). A floor under higher ground: `ctx.addWalkable(fn, { stack: true, keep })` (`world-code`, "Floors, corridors and edges"; `?heights=test` has a cut 3 m down, `src/v12/heights.js:111-124`).
- The terrain is single-sided and casts no shadow: from below it is not drawn (the sky shows unless your own inside-out meshes seal the place), and the sun lights everything under it. The Nave's hall darkens itself with a baked per-vertex attribute (`litAt`, `nave.js:38-48`, shader `:97-119`); the lift gallery uses a dark lining (`src/v12/lift/gallery.js`). There is no regional hook for the sun, hemisphere, ambient or fog (`src/main.js:232-249`, `src/atmosphere.js`). **Build one small, reusable way** (your call: a material helper that scales the sky terms and the fog by a baked or computed "under" factor, or a global dim driven by where the walker is; things carried in, particles and the three point-light slots of `src/lights.js` must still read). Put it in `src/v14/` so the passage and chamber briefs use it unchanged.
- The sun's glow in post is added whenever the sun's direction is on screen (`src/post.js:410-416`): check it does not shine through the roof, and fix it there in a line if it does. Each place has a grade by x,z (`src/v8/places.js` `gradeAt`): a visitor standing on the surface above the hall and one inside it share x,z.
- Audio is chosen by x,z and ignores y: the stone room already exists (`src/audio/graph.js:56-59,116-171`), the wind's shelter has a precedent (`ctx.house.sheltered`, `src/audio/bed.js:117`), steps `src/audio/steps.js:46-50`. Add one `ctx.below?.inside(x, y, z)`-style term to each (stone room up, wind sheltered, the hard step), nothing more; show with the audio harness that the surface above is unchanged.
- The settings map: a stand below ground needs a `y`, `tools/settings-test.mjs:113` hard-codes the place count and `:133` refuses a stand in a hole. `tools/edges-test.mjs` walks the Nave's rim today: it must still pass, and a visitor who walks or hops into the sinkhole must land on the hall's floor, not in geometry (with `?fall=1`, say what a fall does).
- The Nave added clearances in `rocks.js`, `vegetation/ground.js` and `structures/scatter.js`; the mouth of your way down needs the same. Budgets: 25 draw calls and 400k triangles a module. `tools/build-check.mjs` should report only the terrain's index and your modules as moved.

## Done when

- From the east road, on the keys with no map, a visitor sees the way down, takes it, walks the hall end to end and comes back up; the same on the touch stick; on low, medium and high. Register it (`ctx.ascents.add`, or a descent's equivalent in `heights-test` if an ascent does not fit: say which).
- Looking in every direction from every part of the floor: no sky through rock, no terrain underside missing, no sunlit surface that should be in the dark, no fog glowing in a sealed room. Renders on all three tiers, and one at `SHOT_DPR=2`.
- It is dark and readable: from any standing point there is a light or a lit edge to walk toward; the low tier on a dim phone does not go black (check the frame's histogram, not your eye alone).
- Below sounds below: before and after `audio-survey` rows at the rim and on the hall floor.
- The frame on the hall floor costs no more JS than at the rim today (`?perf=1`, the bench's numbers); `load-probe` low within 5% of `next`.
- `world-code/runtime.md` says in a few lines how the next brief makes a room dark, sealed and stone-sounding with what you built. The story file is written or updated.
- Tests: `ONLY=edges,heights,settings,walk,hop,audio,perf,loading,regions,paths tools/suite.sh 8161` and whatever you add.

Report as `_common.md` says, plus: the frames of the descent in order, which wall the passage leaves by and at what depth, and what you would do differently for 155 m of tunnel.
