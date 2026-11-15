# v12, for every agent

Read `AGENTS.md`, then load `wilderness`, `world-code`, `visual-art` and `storytelling`. Read `plans/wilderness-v12.md` (all of it, it is short) and `briefs/v12/index.md`, "What the engine allows".

The owner, in issue #4: "More verticality will make the world more interesting to explore. More vistas and viewpoints". "We're science-fantasy, we can go crazier." "have fun with it!"

Rules for this milestone:

- **A way up is three things:** something seen from the floor that says "you can go up here", a climb that is itself worth doing, and a top with a view and a find. Build all three or say which is missing.
- **Not the first idea.** Something a visitor would walk 200 m to look at and could find in no other game. Old, worn, once rich (`AGENTS.md`, Tone); nothing new or clean.
- **Judged moving.** A climb is a thing a visitor does. Before handing back, do it yourself in a real browser with the pointer captured (the Playwright tools: load, "Go out", walk it with the keys), with screenshots along the way, and look at them in order: can I tell where to go next, do my feet stay on the thing, what do I see when I look down, out, and back? A test that teleports does not count.
- **Fall off it on purpose,** from the bottom, the middle and the top. Say where you land and how you get back. Nobody may land inside geometry, under the ground, outside the walk limit with no way back, or in a loop.
- **Look down from the top** in renders on low, medium and high, and say what looks wrong with the valley from there, whether or not it is yours to fix (it goes to H5).
- **The find at the top belongs to someone already here** where it can (`stories/README.md`, "People who could be the same person"; the seeds in the milestone doc). Write or update its story file in the commit that builds it.
- **H0 is merged: use it.** `world-code` (`SKILL.md`, the section H0 added, and `runtime.md`) says how: `ctx.addWalkable(fn, {stack:true, keep})` for a floor chosen by the feet's height with edges that hold the walker, `ctx.mountains.addCorridor` to pass the walk limit (and `inWalk(x,z)` for "is this ground walkable"), `placeAt(x,z,y)`, `ctx.ascents.add` to register your climb with `tools/heights-test.mjs`, the edge-guard (a walker or a hop goes over a lip only when aimed at it, or after holding at it 0.5 s; Shift or a full stick goes at once), `?fall=1` (a long fall blacks out and wakes at the spawn), and the view from above (`src/v12/above.js`, `tools/views-v12-heights.json`). They are a day old: if one falls short for your climb, fix it in the smallest way, add a check to `heights-test`, and say so in your report. `src/controls.js` is otherwise not yours.
- **The Span is the model** of a finished ascent (`src/v4/span/vestige.js`, `strut.js`, `camp.js`, `stories/the-wait-on-the-span.md`): it took three rounds, and what failed first was a way that looked like a plastic ramp when walked, ways that could not be seen from the floor, and a walkable wider or narrower than what was drawn.
- **No tallies.** The owner: "let's have only one tally in the whole deely bopper please". The Lantern Halt's chalk wall is the one. Nothing else counts in strokes: show time passed some other way.
- **Phones.** The touch stick has to manage the climb: nothing that needs a running hop to proceed. Render the low tier; keep inside the module budgets (`world-code`).
- **Others are at work beside you:** H2 (the glacier: `src/terrain.js`'s glacier block, `src/v4/glacier.js`, the Lattice), H3 (the stair: a new module in the east), H4 (the lift: `src/v5/galleries.js`). Keep edits there, and in `src/main.js`, `src/world.js`, `src/settings.js` and the skill references, to a line or two; new code goes in new files.
- One headless browser at a time; `nice -n 10` and `SHOT_ANGLE=metal` in front of every `node tools/...`; never delete a render.
- Tests before handing back, at least: `ONLY=walk,edges,hop,stair,paths,roads,settings,perf,loading tools/suite.sh <port>` (say the counts), plus any your change touches and the one you add. The orchestrator runs the full gate.
- Hand back as `world-code` says, in under 250 words: what changed, the commands and counts, the frames of the climb in order, what a fall does, what is still weak, any default you took.
