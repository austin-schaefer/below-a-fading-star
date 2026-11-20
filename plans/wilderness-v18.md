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

**2026-11-20, 03:46 PST. Opened.** v17.1 is live (5f8f679). #18 is `in-progress`, `v18`. `next` is served on **8171** (8123 belongs to another project of the owner's). In flight: F1 (`issue-1801-reach`, 8181, opus), F2 (`issue-1802-glasshouse`, 8182, fable: a new kind of thing, a look nobody here has made), F3 (`issue-1803-beds`, 8183, opus), F4 (`issue-1804-inhabitants`, 8184, opus). Next: check and merge each; F5 the sound; the suite, the critic, the curator, the note; release.
