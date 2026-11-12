# Brief v12 H0: the footing

Worktree: written in at dispatch (`tools/worktree.sh new 1200 footing`, port 8161). Work only there. Read `briefs/v12/_common.md` first. Model: strong.

## Goal

Nothing a visitor sees alone. Three agents after you build a climb up a glacier, a stair into the air and a lift up a cliff; each needs the walker to stand somewhere the engine does not allow today, and each top needs the valley to hold up seen from 100 m and more. Build what they stand on, small and tested, with a line in `world-code` for each API so they can use it cold. Read "What the engine allows" in the index: it lists the obstacles with file and line.

1. **Floors that stack.** `ctx.addWalkable` raise-only floors take the max with the terrain and count only within 0.6 m above the feet. Make a walkway that passes over higher ground, a floor under another floor, and a stair that leaves the ground and comes back to it all work: the floor is chosen by where the feet are, not by which is highest. Keep the Span, the Gradine, the Hypogeum, the Halt's seat and every existing walkable behaving to the centimetre (`walk`, `stair`, `edges`, `hop`).
2. **The walk limit as a circle plus corridors.** `walkLimit` stays r 348. A module registers a corridor (a polyline with a half-width, or a wedge, as the saddle's is) inside which the walker may pass the circle; the clamp, `placeAt` and the first frame after a carry all honour it; leaving a corridor sideways past the circle is stopped the way the circle stops a walker today. The saddle's wedge becomes the first corridor. No corridor is added for anything yet except a test one behind a flag.
3. **A floor's own edges.** A way for a walkable to say where it may be stepped off and where not, cheaper than a capsule per edge, for a stair of several hundred treads and a gallery 100 m long.
4. **The view from above.** Stand the camera at 60, 120 and 200 m over six places (the Span's middle, the glacier's notch at r 400, the east moor at (330,-20), the west wall at the Galleries, the centre, the tarn) and look down and out, on low, medium and high: `tools/views-v12-heights.json`, which every later brief renders too. Fix what is the engine's: sun shadows on ground more than about 95 m below the eye (`src/main.js:210`: a box that follows what the eye sees, at a cost you measure), the cool wall air that makes the valley milky from above (`src/atmosphere.js:104`), anything throttled or faded by horizontal distance that should use the true distance. List what is the world's (bare roofs, crowns, patches) for H5 without fixing it.
5. **The high passes by default.** `?cols=high` becomes the default and `?cols=low` the way back. With it on, ground inside the walk limit rises up to 9 m near each pass: run `terrain-probe --diff`, find everything placed on that ground and everything hung on the wall near bearings 112, 180 and 328, re-render it, and fix what floats or sinks. The glacier's notch stays (H2 rebuilds it).
6. **`tools/heights-test.mjs`, in the gate:** given a registered ascent (a list of points to walk through on the keys), it walks it, asserts the feet stay on it, steps off at three points and asserts a sane landing (on a floor, above the terrain, inside the limit or a corridor), and checks the frame time at the top against the floor's. Ascents register themselves, so H1 to H4 each add a line. Go-to entries may carry a `y`.

## Not yours

The four ascents themselves. The glacier's block of `src/terrain.js`. The Span's files (H1 is in them beside you, and needs nothing of yours).

## Done when

- Unit-style checks for 1 to 3 in `heights-test` using test floors behind `?heights=test` (a ramp over a rise, a floor under a floor, a corridor through the limit), each walked on the keys.
- The before and after sets of `views-v12-heights.json` on all three tiers, and what each fix cost in `perf-test`'s numbers on low. If the shadows from above cannot be had inside the budget on low, say so and do it on medium and high only.
- `?cols=high` default: the pairs for every hung thing near the three passes; `mountains`, `settings`, `paths`, `roads` green.
- The whole suite, since this is shared code: `tools/suite.sh <port>`, with the counts.
- `world-code` (`SKILL.md` or `runtime.md`) says how to use stacked floors, corridors, edges and the test, in a few lines each.
