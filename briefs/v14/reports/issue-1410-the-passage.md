# v14-D1 report: the passage under the moor (the Bearers' Way)

Branch `issue-1410-the-passage` (D0's kit and round 2 merged; D2's `issue-1411-the-pit` merged at the orchestrator's word), port 8162, 2026-11-15.

## What a visitor finds

The Coffin Road's south door is open. From its three steps a way runs 121 m under the moor to the floor of the Pit, from y −17.44 to −33.40 (12 to 25 m of cover all the way; no water over it; 50+ m from the Span). Four kinds of space, one loft along one line (`src/v14/passage/plan.js`):

| s (m) | stretch | what it is | its light (and whose) |
|---|---|---|---|
| 0–26 | **the Bearers' Flight** | cut and dressed, square with a pointed vault, three flights down with landings, a long stone bench either side on each landing, an old bier left on the last; −17.4 → −24.3 | the Sexton's corpse-candles in iron cages on stone brackets (green); the last, where the cut ends, gone out in the draught |
| 26–61 | **the Flute** | not cut: a round bore the wind from under the world scoured, fluted in long spirals, pale grit floor in ripples, its walls rimed with points of cold light, thicker toward the Pit; −24.3 → −28.0 | the sounder's cold lamps on spikes, every 10 m |
| 61–74 | **the Laid Sun** (the chamber) | a round domed room (13 m) with the bearers' bench round its drum; in its floor the Reckoner is laying a new sun in gold: the middle and five rays laid, a sixth half done, the rest drawn in chalk; his eleven lintel glyphs cut round the rim, three in gold; his kneeling pad, trowel, a basket of gold (a few of the Nave's red and ochre pieces among it, one grey), a bronze wire with a bead for each ray, his lamp burning on a tripod | the Reckoner's work-lamp (warm: the only warm light on the way) |
| 74–98 | **the Gulf** | a short cut neck, then a crack across the way, black below and 13 m either side; a stair-bridge on one arch goes down over it, pale motes rising out of the dark below | the sounder's lamps on iron posts at its ends and middle |
| 98–121 | **the Gate** | square again, a stair down, then level to a gatehouse standing out of the Pit's wall at its floor: coursed piers, a recessed inner order, a lintel with the old people's sun carved over the door (its gold sockets empty), a lamp on a bracket | a sounder's lamp inside, one outside; the Pit's cold light spilling in (baked) |

What a stranger would call the chamber, from its render alone (`shots/wip/pass3-chamber-low-02-near.png`): "a dark round room where someone is laying a sun mosaic in gold into the floor; chalk guide lines, a lamp on a tripod, a basket of pieces, tools". That is what I meant.

It belongs to **the Reckoner** (already in the valley, behind the Hypogeum's door): the gold missing from the Nave's sun and the Sunken Court's goes into a third floor; "Two floors, or one?" gets an answer. `stories/the-bearers-way.md` (plain, a deep end); the Coffin Road's, the Reckoner's and the index updated.

## Where the mouth meets the Pit

**(204.10, 173.73), y −33.40**: bearing 20 from the Pit's centre, 3.4 m in from the rim (R(20) = 15.39), exactly D2's point (its report). The passage's floor ends there; D2's bowl takes over. The gatehouse stands 1.9 m out from there on the bowl. The way through it cuts the Pit's throat veneer (18 triangles) and the terrain's wall triangles (6, wholly below the lip − 4 m) inside the gatehouse's silhouette. Change `MOUTH` in `plan.js` and the last 12 m straight, the portal and the cuts follow.

## The kit, used and worked round

- **D0's fall behind the door** is still in D0's mesh; I make its triangles degenerate after its build (272 on low: every triangle in the door's x range ≥ DOOR.fall + 0.3, the rubble, the black end, the prism). **Ask of D0/the orchestrator:** skip the fall, the black end and the floor quad past the treads in `coffin-road.js` when `?passage` is on (e.g. `if (!PASSAGE_OFF)` from `src/v14/passage/plan.js`), and drop my cut (`passage.js`, "the cuts"). D0's floor ends at DOOR.fall; mine covers the stub from DOOR.fall − 0.1 to its end.
- **Uncapped colliders** are columns down through the ground as well as up: the Pit's rim ring stopped the walk 3.5 m short of the mouth. Every uncapped collider within reach of the way (17, the rim's) gets a bottom 1.5 m under its ground (the same above it); again on `ctx.built()`. A class fix: edges-test checks none is left. Written in runtime.md.
- **The seal and the Pit**: the kit keeps every shadow caster within 110 m of an opening, so the Pit's opening is registered only while the eye is in the Gate. The Gate's last 13 m are 0.6–0.95 below (stone room, the moor's wind sheltered, the grade) but never 1, so the seal never hides the Pit's floor seen through the door.
- **D2's floor at bearing 20** rises ~2.8 m from the wall's foot to the Nadir's mouth, so from inside the Gate the view out is a dark slope with the lead and the motes over it (`shots/wip/comb2-mouth-low-02-gate-sill.png`). That is D2's bowl; noted, not changed.

## Tests (counts printed)

TESTS

## Walked (`tools/passage-walk.mjs`, new; new headless Chromium grants the capture)

WALKS

## Frames, in order (`shots/wip/`)

FRAMES

## Numbers

NUMBERS

## Defaults taken

- The passage's name, **the Bearers' Way**, and its stretches' names (the Bearers' Flight, the Flute, the Laid Sun, the Gulf, the Gate); the chamber's owner the Reckoner (not the Sexton or the sounder, whose places are either end).
- 121 m along the line (the crow's 120 m): about 35 s at a walk, 1–2 minutes with the room. I did not wind it longer to fill "two or three minutes".
- Three lights with three owners and colours (green, warm, cold) and one glow colour per stretch's mesh.
- The way onto the Pit's floor is open at the door: no threshold step; D2's bowl is the floor in the doorway.
- The Laid Sun's card (`feet` −34..−22, reached by the Bearers' Way) and its stand on the settings map at the room's way in, looking at the sun.
- The drip at the door and the draught (no cues: scheduled by place, started from `v10/sound.js`).
- D2 merged into this branch (the orchestrator's message), conflicts kept both sides; `world.js` taken from D2's (it carries B5's names) plus my one line.

## What is still weak

WEAK
