# Brief v12 H1: the Span, end to end

Worktree: written in at dispatch (`tools/worktree.sh new 1201 span-whole`, port 8162). Work only there. Read `briefs/v12/_common.md` first, then `stories/the-traveller-on-the-span.md` and `stories/the-bell-under-the-span.md`.

## Goal

The owner, in #4: "The Great Span should have a thin vestige of stone remnants all the way along its length, so you can walk the whole way up high."

The Great Span crosses the south of the valley 56 m up, 514 m from gate to gate, and three of its bays have fallen (x -120 to -70, 25 to 70, 115 to 176), so a visitor can walk only its two ends. Make the whole length walkable on what is left of it. A visitor climbing the west stair should see, past the first broken edge, that the bridge is not quite gone there: something thin still goes across. They step onto it with nothing either side and fifty-six metres of air below, and cross.

- **Each of the three gaps is crossed differently,** and each is a ruin, not a repair: for instance one side wall's footing still standing on its arch rib with the deck gone beside it; a run of kerb and corbel stones hanging on with daylight through them; one bay where the stone is all gone and something else carries across (an old chain with planks, a fallen lattice strut from the sky, a root of the crystal). These are examples: find better. About 1.2 m wide at the thinnest, never less than 0.9 m; it may sag, step and jog sideways, but a touch stick has to manage it without a hop. The longest gap is 61 m: it is the one a visitor will remember, so spend most there.
- **From the floor** the vestige must read as a thin line still joining the piers: look at it from the fen, the pedlars' road and the bell's bay, and from the deck of each end run.
- **The middle runs** ([-63,32] and [77,122]) have never been stood on. Put something there that a visitor finds, belonging to someone (the milestone doc's seed; the traveller, the pedlars and the bell are below you; the crack at x -45 is over the bell). One plain story, with a file in `stories/`.
- **The broken edges' kerbs** (`deck.js:98`) stop a walk at each edge today: open them where the vestige leaves, keep them elsewhere.
- **The fall:** a visitor who steps off lands on the fen or the slope and walks back to a stair. Check the landing under each gap (water, the bell's bay, the traveller's slope) and say what happens.
- **The view:** the Lamps' city is over the west end and the sun's saddle is in line with the deck. Find the two or three places on the crossing where the view is best and make sure nothing of yours stands in it.

## Where things are

`src/v4/span/plan.js` (the plan, `deckAt`), `deck.js` (the walkable, parapets, kerbs), `stairs.js`; `src/v10/bell.js`; `tools/walk-test.mjs:69` (teleports onto the middle runs: replace with a walk from the west stair's foot to the east stair's foot, on the keys, and a second walk that steps off mid-gap and asserts a sane landing). The Go-to list (`src/settings.js`) gets "The middle of the Span" with a `y`.

## Not yours

`src/controls.js` (H0 is in it; the deck's walkable already works at this height, so you should need nothing there: if you do, say so before changing it).

## Done when

- The walk from stair to stair passes in `walk-test` without a teleport, and you have done it by hand in a browser, frame by frame, on the keys and with the touch stick.
- Frames: the vestige from the fen and from the road; the first sight of each gap from the deck; mid-gap looking down, ahead and back; the find; the view west from the middle. On low and medium.
- A fresh reader shown the frame from the fen says the bridge can be crossed; shown the find, says something about whose it is.
- The tests in `_common.md` pass.
