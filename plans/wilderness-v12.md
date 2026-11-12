# Wilderness v12: the Heights

Until now the walk has been a floor with things on it and a wall round it. v12 lets the visitor go up: four ways, each a different kind of climb, each ending somewhere with a view and something to find.

## What was chosen, and why

The owner's word, in session on 2026-11-12: "you will be the orchestrator for the next milestone, #4, the heights". So no choosing: the milestone is the owner's **#4** (The Heights). From it:

> More verticality will make the world more interesting to explore. More vistas and viewpoints [...]
>
> * The Great Span should have a thin vestige of stone remnants all the way along its length, so you can walk the whole way up high.
> * The ring mountains should have occasional paths and access points to higher areas, with things to discover when you're there.
> * We're science-fantasy, we can go crazier. Perhaps there's a glass elevator bearing you high indeed; [...] a staircase where only the first stpes are visible from the ground, but as you step up it you find that further steps are revealed, leading to an unknown destination
>
> etc. have fun with it!

And what the owner said in session during v11.1, which belongs here (`wilderness-v11.md`, Status):

- The glacier: "the glacier has always looked kinda ass fwiw, and it's felt weird you can't climb it. if we keep the glaicer, it should be more... glacial. chasms and such things." "Perhaps glacier is high up, spills down a bit, but alos the crystals sort of climb up it. a way fo connecting the valley floor to the mountains. maybe even there's some high crystaline structure you can't get to but can see is cnnected to the ground-level crystal formation."
- The cols: "i think high passes can go with 'the heights'" (the trial is `?cols=high`, merged in v11.1, default off).
- "don't start serious code work, though, until 11.1 has shipped just to avoid a bunch of rework."

Passed over, still in the pool: #36 the Depths (tunnels and the tubes: the other half, by the owner's split), #18, #20, #23, #28, #30, #33 (the wall from its foot: the glacier brief takes a little of it), #34. #22 waits on the owner.

## What a visitor should notice

In the first minute: things that go up, seen from the floor, that they can now go up. Then, having climbed one: the whole valley below them, which nobody has seen from above except in a debug render, and at the top something that was worth the climb.

Four ascents, four kinds:

1. **The Span, end to end** (a bridge). A thin vestige of stone carries across the three fallen bays, 56 m up with no parapet, so the whole 514 m can be walked from gate to gate. The two middle runs, which nobody has stood on, hold something.
2. **The glacier** (a climb on foot). The ice is rebuilt as ice: high in its notch, spilling down in steps, split by crevasses. The Lattice's crystals climb it. The visitor climbs too, through the crevasses, to a shelf far above the valley floor; above that, out of reach, a great crystalline thing the Lattice plainly comes down from, and behind it the thread that already rises "from beyond the glacier pass into the dark with a mote of light climbing it" (`src/skylife/remnants.js`).
3. **The stair that appears** (the owner's stair). On open ground a few steps of a stair stand, going nowhere. Step up and the next ones are there. It climbs a long way into the air toward one of the old lattices that hang in the sky.
4. **The lift** (a ride). The Galleries of Durance on the west wall have an inclined lift that is decoration today. It carries the visitor up the cliff to a gallery they can walk.

And the wall itself: the three cols that are not the sun's become high passes (`?cols=high` made the default), so the sun's saddle is the one way out.

## Stories

Seeds, each for its brief to take or replace (the `storytelling` skill; a file in `stories/` when it has a someone and a want). The aim is that what is found up high belongs to people already here.

- **The tender of the lattices.** A lamp already goes "from lattice to lattice, stops at each a while as if tending it" (`remnants.js`). The stair is how the tender comes down, and the landing at its top is where they live: a plain story of someone with an absurdly large job and small comforts. The lamp could be seen to call there.
- **The middle of the Span.** The traveller fell from the deck; the pedlars walk the road below. Whoever is on the cut-off middle runs has been there since the bays fell, or got there some way that says something about them.
- **Where the crystal comes from.** The Reckoner's thread runs from the mother crystal to the Hypogeum; the mother crystal has a mother. What is frozen into the ice on the way up?
- **Durance.** Galleries of cells on a cliff, and a lift. Who was kept, who kept them, and who still rides it?

## Calls made, each reversible

- **v12, not "milestone 4"**: the doc and briefs follow the release numbering; #4 is the issue.
- **Four ascents, not one done four ways.** Each is a different act of the body (walking a ledge, climbing ice, climbing into air, being carried), so the milestone is not four stairs.
- **One before the rest.** Being high is a new kind of thing here: nobody has judged the valley from 100 m, the fog and shadows assume an eye near the ground, and the phone already draws 1.1 to 2.1M triangles. The Span goes first (it needs the least new engine), with the foundations beside it; the owner and a blind reader judge the Span's crossing before the other three are built.
- **The walk limit opens only in corridors.** The circle at r 348 stays; a module registers a corridor that lets the visitor past it (as the saddle's wedge does today). No free climbing on the wall: the ground out there is steeper than the walker's limit and the mesh is 2 to 3 m a cell.
- **Not in v12:** the Gradine climbed to the Vigilant, a footpath to a pass, tunnels and the tubes (#36). The first two are in `plans/IDEAS.md` under v12 if they are not built as a second batch.
- **Falling.** There is no fall damage and nothing changes that: a visitor who steps off the vestige lands on the fen and walks back to the stair. Each ascent says what a fall from it does (the brief checks it).

## Done when

- A stranger can walk the Span from gate to gate without a teleport; climb the glacier to its shelf; climb the stair to its top; ride the lift and walk a gallery. Each is done in a real browser with the pointer captured, frame by frame, before its merge ("judged moving").
- From each top, a render of the valley holds up: no milky wash, shadows where the eye expects them, nothing popping, on low, medium and high.
- A fresh agent shown only frames from the valley floor can point at three of the four ways up and say they look climbable.
- Each top has a find that a blind reader can say something about.
- The cols are high passes by default and everything hung on the wall still sits on it.
- `tools/suite.sh` green, with a new test that walks each ascent and one that falls from each; the walk no slower on low on the floor, and the cost at each top measured and written here.

## Status

**2026-11-12, 15:38 to 16:10 PST. Opened for planning; no code yet.** The owner started this session beside the one finishing v11.1 and said to plan now and hold serious code until v11.1 ships. State at opening: `main` is v10's merge (v11 and v11.1 are on `next`, v11.1's W1 fix in flight on `issue-1113-wall-patches`, port 8161, the other orchestrator's). Done: a read-only survey of how the engine handles height (summarised in `briefs/v12/index.md`, "What the engine allows"); this doc; the dispatch plan. #4 is labelled `in-progress`, `v12`. #34 (loading performance spike), new and unlabelled, is in the pool as `milestone`, `idea`.

Nothing is in flight for v12. Next, in order: wait for v11.1 to reach `main` (`RELEASES.md` on `main` has its entry); write H0's and H1's briefs in full against the code as shipped; `tools/worktree.sh new` for each; dispatch H0 (opus, 8161) and H1 (8162) together; judge H1 moving and put it in front of the owner before H2 to H4 go out.

**Asked of the owner (answers change the plan; none blocks it):** whether the four ascents are the right four; whether a fall should cost anything.
