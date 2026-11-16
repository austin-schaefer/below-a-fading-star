# Brief v14-D1: the passage under the moor

Worktree `.claude/worktrees/issue-1410-the-passage`, branch `issue-1410-the-passage`, port 8162. Work only there. Read `briefs/v14/_common.md` first and do what it says, with `visual-art`, `storytelling` and `sound-design`. Your branch carries D0's work and its kit, round 2 (`src/v14/under.js`: a volume that follows a path, a fade to black with distance, a smaller stone room, the moor hidden while below; `runtime.md` "Under the ground" has a ten-line example of a passage). Read those, `stories/the-coffin-road.md` and `briefs/v14/reports/issue-1400-first-descent.md`. D0 is still finishing the Nave's look: do not edit `src/v14/under.js` or the Nave's files; if the kit falls short, say exactly what you need in a message to the orchestrator and work round it meanwhile.

## Goal

The Coffin Road ends at a door in the Foundered Nave's south wall (x 246.7, sill y -16.7, about 16 m under the moor; three steps down, then a fall of roof: D0's `DOOR`). Open it. From there a passage runs under the moor to the floor of the Pit (200, 185; 14 m in radius, 26 m deep; `src/v4/paths/ground.js`), about 135 m as the crow flies, arriving through the Pit's wall at its floor on about compass bearing 20° from the Pit's centre. Another agent (D2) is making the Pit's floor, what is found there and the way up out of it: you own everything from the Nave's door to the mouth in the Pit's wall, the mouth included (a built portal standing proud of the wall is the easy way to cover a ragged hole in 2 to 3 m terrain cells); D2's report will give the exact point; until then aim at the floor at bearing 20° and keep the last 10 m adjustable.

This is the walk's first tunnel: two or three minutes on foot in the dark. It must be worth those minutes:

- **Not a corridor.** Not the first idea (a rough-hewn mine, a brick sewer, a crypt corridor with niches). Who cut it, for what, and what has it been used for since? The Sexton floats his dead on the water in the Nave; the wind comes up the Pit "from below"; the Reckoner is "far down and busy" and asks "Two floors, or one?"; the leadsmen sound depths; the science-fantasy is allowed (the owner, #36: "We're science-fantasy, we can go crazier"). It need not be straight or level or one width: a visitor should pass through at least three different kinds of space, and somewhere on the way there is **a chamber with something in it that belongs to someone already in the valley** (`stories/README.md`), that a visitor would describe to a friend. Write or extend the story file.
- **Always a next light.** From every point there is something lit to walk toward, and when the visitor turns round, something lit behind. Darkness comes from the fade and the materials, never from pulling exposure down (`visual-art`: dark grades go black on a phone). Lights have sources and owners.
- **It is heard.** The Nave behind (water, a drip), the Pit ahead (its wind, before it is seen), the passage's own smaller room, the visitor's steps on whatever the floor is.
- **Sealed and safe.** The terrain is single-sided: from below it is not drawn, so every metre is closed by your own meshes or the sky shows. Check the route against `heightAt` and `WATER`/`waterLevelAt` along its whole length: at least 4 m of cover, at least 6 m under any water, clear of the Span's piers and anything else with foundations; do not change `heightAt`. One stacked floor with held edges; a visitor can never leave the passage except by its two ends; a hop cannot put the eye through the roof.
- **Cost.** The passage costs no more JS a frame than the Nave's floor; the moor is hidden while below (the kit); 25 draw calls and 400k triangles a module (split into modules by stretch if you must); the three point-light slots are shared with the whole map.

## Done when

- From the Nave's door to the Pit's floor and back, on the keys with the pointer captured and on the touch stick, on low, medium and high: frames every 10 m or so in order, looking ahead, and at five points looking back and up. Nobody reading them in order is ever unsure which way is on.
- Looking in every direction from six points along it: no sky, no missing underside, nothing sunlit, no seam where two stretches meet.
- A blind description of the chamber from its render alone matches what you meant (say what you think a stranger would call it).
- It is registered so `heights-test` or `edges-test` walks it end to end; the settings map has a stand in the chamber (with a `y`).
- `audio-survey` rows at the door, the chamber and the mouth; the surface above unchanged (render pairs at three points on the moor over the route, and `tools/build-check.mjs` reporting only the terrain's index and your modules as moved).
- Tests: `ONLY=edges,heights,settings,walk,hop,audio,perf,loading,regions,paths,roads tools/suite.sh 8162` and whatever you add.

Report as `_common.md` says, plus the frames in order and what you would call each of the three kinds of space.
