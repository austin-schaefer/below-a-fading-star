# Brief v14-D2: the Pit, from the bottom

Worktree `.claude/worktrees/issue-1411-the-pit`, branch `issue-1411-the-pit`, port 8163. Work only there. Read `briefs/v14/_common.md` first and do what it says, with `visual-art`, `storytelling` and `sound-design`. Your branch already carries D0's work (the Coffin Road and the kit for places under the ground: `src/v14/under.js`, `runtime.md` "Under the ground", `stories/the-coffin-road.md`, `briefs/v14/reports/issue-1400-first-descent.md`): read those. D0 is still changing `src/v14/under.js` and the Nave: do not edit them; merge `origin/issue-1400-first-descent` when told its kit has moved.

## Goal

The Pit (200, 185; `src/v4/paths/ground.js` `PIT`: 14 m in radius, 26 m deep, carved in `heightAt`; the old road from the east gate ends at its lip) has only ever been looked into. Its card asks: "How then could an outer wind find its way into the pits and blow up from below?" Its floor cannot be reached on foot.

A visitor who has come down the Coffin Road and through the passage under the moor (another agent, D1, is building that: it arrives through the Pit's wall at the floor, on about compass bearing 20° from the Pit's centre, the side toward the Nave) steps out onto the floor of the Pit: the disc of sky 26 m overhead, the road's last slabs hanging over the throat, the wind coming up. Make the bottom of the Pit the end of the journey and the answer to the card's question:

- **What is down here.** Where does the wind come from? Not the first idea (a grate, a cave, a monster's breath): something only this valley would have at the bottom of its well, that a visitor would walk the whole way under the ground to stand in front of. It belongs to someone already here if it can (`stories/README.md`: the leadsmen and their crystal leads and the Plummet, the Reckoner far below his door, the tender of the lattices, the Sexton whose coffins ride the water in the Nave, the traveller whose letters hang under the Span, which crosses right above this place). Write its story file.
- **One thing to do**, with something that happens next that can be seen and heard from where the visitor stands (v10's lesson: "i ring a great bell: what happens next"), and that a visitor up at the lip could also notice the result of.
- **A way up and out** to the lip: itself worth doing, built into or hung on the Pit's wall, findable from the floor and visible from the lip as "there is a way down here" (so the journey can be made in either direction). Stacked floors with held edges (`world-code`, "Floors, corridors and edges"); register it (`ctx.ascents.add`); a fall from it lands on the Pit's floor, never in geometry. Leave the wall clear for D1's mouth for 15° either side of bearing 20°, at the floor.
- **Sound:** the wind from below is the Pit's own; the visitor should hear the Pit before they see it from the passage. Use the kit's hooks; the surface at the lip sounds as it does today unless the act changes it.

Do not change `heightAt` (the Pit's shape stays; `height-check` and every scatter stream depend on it). What stands on the floor today (rubble, scatter, whatever `src/v4/paths.js` puts there) is yours to clear or keep. The Pit is open to the sky: it is dim, not dark; the kit's "below" is for the passage, and whether the Pit's floor counts as below (for the grade, the wind's shelter) is your call: say which.

## Done when

- Placed on the Pit's floor (a settings-map stand with a `y`, or the terrain there), a visitor on the keys finds the way up and climbs out to the lip; from the lip, with no map, they see the way down and take it; the same on the touch stick; on low, medium and high. Frames of both, in order.
- The thing at the bottom is told back correctly by someone who has only the render (say what you think a stranger would call it).
- The act is judged moving: frames at 0.3 s, 1 s, 2 s and 5 s, from the floor and from the lip.
- `tools/edges-test.mjs` still passes at the Pit's rim (it walks it today) with the way up added.
- The Pit's floor costs no more JS a frame than its lip does today; module budgets hold.
- Tests: `ONLY=edges,heights,settings,walk,hop,audio,perf,loading,regions,paths,roads,acts tools/suite.sh 8163` and whatever you add.

Report as `_common.md` says, plus: the exact point and height where the passage's mouth should meet the floor (x, z, y) as you built round it, so D1 can end there.
