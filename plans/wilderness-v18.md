# v18: The wood has someone in it

## What was chosen, and why

The owner's word: issue #18 ("Enliven and enrich the forest biome"), pinned `next` in session on 2026-11-19 and again on 2026-11-20 ("ship v18"). No choosing. What the orchestrator decided is how:

- The owner's two pictures, "tunnels and crypts" and "a multi-hued stained glass greenhouse you can't enter with woman- and man-shaped flowers growing inside", are built as **one story seen from above and from below** (`stories/the-graffer.md`): the flowers are the dead in the crypt under the glasshouse, grown back by their gardener.
- "Little spur trails off the main road, dark and twisty": three, marked only by foxfire.
- "Expand its reach a bit": a lobe of new wood to the north, the only clean ground (the survey).
- "More inhabitants": things that stand as still as trunks and have moved when you look back; eyes between the trees that shut when looked at; moths at the coloured glass.

**Passed over for now:** #75 the ice, #62 the underground hub, #56 the sky, #33 the wall, #30 the way out, #28, #22, and #23 (music: waiting on the owner's ears). W3 (`issue-1527-edges`) stays paused.

## The survey (2026-11-20; an opus agent, `perf-views` on low, headless Metal)

- The Deodand Wood: `LANDMARKS.wood` (-210, 130), r 90; about 23,000 m²; 263 trees on low. One find in it today (the moss light). The wood way (P32) passes nothing else.
- Low tier in the wood today: 186 to 209 draw calls, 1.5 to 1.8 M triangles, **GPU about 33 ms, the tier's whole budget**. More trees cost triangles and shadow casters, not calls.
- Clean ground to spread onto is north only: x -232..-165, z -5..42.
- No clearings: any site is a claim. Banks for a door: the south-west rise (-262, 165) to (-247, 183).
- The critic's standing complaint: "dark wood with teal glow" is generic, and the wood is near black.

## What a visitor should notice

1. From the wood way, coloured light between the trunks; a twisting track toward it.
2. A glasshouse of many colours they cannot enter, with people in it who are flowers, and who turn to watch them.
3. A door in a bank, tombs whose lids are those same people, roots coming down into them, and a way under the wood that ends beneath the glasshouse.
4. In the new north wood, the uneasy sense that a trunk was not there a moment ago.

## Done when

1. **Reach:** the wood covers the north lobe and reads as the same wood; the low tier's frame in the old wood and in the lobe is no slower than v17.1's at the survey's stands (`perf` green; the numbers in Status).
2. **Spurs:** three tracks leave the wood way, each found from it by a visitor who was not told (a blind reader shown the frame at each junction points at the way in), each walked end to end on the keys.
3. **The Florilegium:** a blind reader shown three frames says something close to "a stained-glass greenhouse with people-shaped plants inside"; from the wood way its light is seen; frames in order show the heads turning; nobody can get in; inside its module budget; the phone frame is not blown out.
4. **The Lower Beds:** walked on the keys from the door to the chamber under the glasshouse and back; `edges`, `geometry`, `heights`, `under-geometry` green; a blind reader matches at least four effigies to the flowers when shown both.
5. **Inhabitants:** frames in order show a stilter in a different place after the visitor looked away, and never moving in view; eyes shut when looked at; a blind reader says something is watching.
6. **Sound:** the wood from inside is not silent of its own things: each find has a sound, measured by the audio survey.
7. The whole suite green on `next`; the cold critic's blocking findings fixed; the story file true to what is built; at most three new names, posted for the owner.

## How it is built

`briefs/v18/index.md`. Four builders at once (F1 reach and spurs, F2 the glasshouse, F3 the crypt, F4 the inhabitants), then F5 the sound. Coordinates in `src/v18/plan.js`.

## Status

**2026-11-20, 06:05 PST. F1 merged (de61256): the ground is in. F2, F3, F4 built and reviewed, merging on top in that order.**

- **F1 merged** after round two: `settings` 103 (stands' view lines are cleared of trees for 4.5 m), the reach casts no shadow on low and triangles on low are under v17.1's at every stand (heart 1557k to 1502k), small scatter and fallen trunks keep the claims; the orchestrator's own run: settings 103, geometry 146, threads 25, foxfire 21. The once-red `geometry` did not reproduce in six runs. **Not met: the spur junctions are not found from the road** (two readers). F1 is in round three on the same branch for it: spurs leave square to the road, a made threshold at each, foxfire inside the mouth and off the moss light's teal.
- **F2** (round two in; in its last pass after merging `next`): faces are flowers' markings now, the key hangs lit, the house sits in a halo from the road. Left: the magnate's cup and the falconer's bird through the glass; a test row for the heads' facing.
- **F3** (round two in, `2e9dad4`; waits for F2's merge: its grate hole closes only on F2's level court at y -3.2): the vault reads at once; `beds-walk` now requires the `beds` floor at its level; the chamber's reader: "a half-open sarcophagus, mallet and chisel on the lid ... the work abandoned; roots ... converging at a doorway". Weak: the lid's carved figure is a blob, the room is very dark, the tubs from below read as pods. Cold review: the under kit used soundly; claims.js and plan.js will conflict with F2 (two `BEDS` imports would stop the page).
- **F4** (round two in; round three among the lobe's real trees): the stilters pass for trees in a line-up with real ones. Not met: a moved one reads as a swap, not as having followed. Moths wait for F2's panes.
- Worktrees and ports as opened. Next: F2 merges, then F3, then F4; the suite on `next`; F5 the sound; the map's marks and the names; critic, curator, gate.

**2026-11-20, 05:10 PST. Three of four handed back once; none merged; all in round two.**

- **F1 the reach** (`issue-1801-reach`, 8181, opus; `briefs/v18/reports/issue-1801-reach.md`): the lobe (`src/v18/reach.js`, behind one box test, `heightAt` unchanged), about 40 lobe trees and a ragged rim, spurs P57 to P59, P33 rerouted south of the glasshouse, foxfire. **Sent back** on the cold review and the orchestrator's run: `settings` red (the reshuffle put a tree before a stand; `standNear` clears a footprint, not a view line); 27k new shadow triangles on low; small scatter (toadstools, pods, pebbles, bracken, fallen trunks) ignores the claims; the junctions are not found from the road (its own reader); `geometry` red once and green once (an unstable row, also seen by F4). Not to merge until 1 to 4 are green: the others stand on it.
- **F2 the Florilegium** (`issue-1802-glasshouse`, 8182, fable; its report): the house reads at once ("a stained-glass greenhouse ... flower-headed figures in pots") and is the best thing in the wood. **Sent back:** the likenesses' faces are emoji (dots and a frown on a disc), the cup and the hawk are not read, from the wood way it is one small patch, heads turned away in one walk frame, the key not findable. Its reds were F1's.
- **F4 the inhabitants** (`issue-1804-inhabitants`, 8184, opus; its report; `stories/the-patient-wood.md`): the behaviour and `stilters` test are right (36 rows); eyes and moths one draw each. **Sent back:** the stilter is a man in a tree suit with its arms up (its reader: "an ent"): to be a clump of long boles with a hanging limb, judged on the study sheet beside real trees; moved must read as moved (pressed-earth rings where one stood); eyes larger and nearer. Waits for F1's and F2's merges to stand among real trees and panes.
- **F3 the Lower Beds** (`issue-1803-beds`, 8183, opus): still in its first round.
- Next: merge F1 when green, tell F2, F3, F4 to merge `next`; then F5 the sound (`issue-1805-sound`, 8185, sonnet).

**2026-11-20, 03:46 PST. Opened.** v17.1 is live (5f8f679). #18 is `in-progress`, `v18`. `next` is served on **8171** (8123 belongs to another project of the owner's). In flight: F1 (`issue-1801-reach`, 8181, opus), F2 (`issue-1802-glasshouse`, 8182, fable: a new kind of thing, a look nobody here has made), F3 (`issue-1803-beds`, 8183, opus), F4 (`issue-1804-inhabitants`, 8184, opus). Next: check and merge each; F5 the sound; the suite, the critic, the curator, the note; release.
