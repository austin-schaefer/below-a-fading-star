# v14-D1 report: the passage under the moor (the Wellward Way)

Branch `issue-1410-the-passage`, port 8162, 2026-11-15. Carries D0's kit and round 2 (`issue-1400-first-descent`), D2's Pit round 2 (`issue-1411-the-pit`, merged at the orchestrator's word) and `next`. Built first as "the Bearers' Way" (the Nave's dead carried in); turned mid-run on the owner's word (the coffins and the Sexton go; a fourth people who kept the sun): renamed **the Wellward Way**, the first stretch rebuilt as that people's tube.

## What a visitor finds

From the Coffin Road's south door a way runs 121 m along its line under the moor to the floor of the Pit, from y −17.44 to −31.40 (12 to 25 m of cover all the way; no water over it; 50+ m from the Span; nothing with foundations over it, and the uncapped colliders over it given a bottom, below). One loft along one centreline (`src/v14/passage/plan.js`), five stretches, four kinds of space:

| s (m) | stretch | what it is | its light (and whose) |
|---|---|---|---|
| 0–26 | **the Line** | the fourth people's tube going on south from the Nave: round, seamless milk-white resin, ribbed every 1.2 m, a collar every 7.2 m, clouding toward a floor of pale silt; two nodes where it levels, swelling to a bulb, a stalled carrier in each (bottle amber, an ox-blood band, milk collars; the second rolled and cracked); lenses in collars, most dark; broken off where the wind's bore begins, shards of it standing out of the rock; −17.4 → −21.4, a slope of silt between nodes (no stair) | stored daylight in three lenses and one more (the fourth people's: a cool white-gold that ebbs and now and then dips) |
| 26–61 | **the Flute** | not cut: a round bore the wind from under the world scoured, fluted in long spirals, pale grit floor in ripples, its walls rimed with points of cold light, thicker toward the Pit; −21.4 → −28.0 | the sounder's cold lamps on spikes, every 10 m |
| 61–74 | **the Laid Sun** (the chamber) | a round domed room (13 m), the Heliarchs', a bench round its drum; in its floor the Reckoner is laying a new sun in gold: the middle and five rays laid, a sixth half done, the rest drawn in chalk; his eleven lintel glyphs cut round the rim, three in gold; his kneeling pad, trowel, a basket of gold (a few of the Nave's red and ochre pieces among it, one grey), a bronze wire with a bead for each ray, his lamp burning on a tripod | the Reckoner's work-lamp (warm) |
| 74–98 | **the Gulf** | a short cut neck, then a crack across the way, black below and 13 m either side; a stair-bridge on one arch goes down over it; pale motes rising out of the dark below | the sounder's lamps on iron posts |
| 98–121 | **the Gate** | square again (the Heliarchs'), a stair down, level to a gatehouse standing out of the Pit's wall at its floor: coursed piers, a recessed inner order, a lintel with their sun carved over the door (its gold sockets empty), a lamp on a bracket | a sounder's lamp inside, one outside; the Pit's cold light spilling in (baked) |

What a stranger would call the chamber from its render alone (`shots/wip/pass3-chamber-low-02-near.png`): "a dark round room where someone is laying a sun mosaic in gold into the floor; chalk guide lines, a lamp on a tripod, a basket of pieces, tools". That is what I meant. It belongs to **the Reckoner**: the gold missing from the Nave's sun and the Sunken Court's goes into a third floor ("Two floors, or one?"). `stories/the-wellward-way.md` (plain, a deep end); the index and the Reckoner's story updated. `stories/the-coffin-road.md` is left as D0 wrote it (D3 rewrites it).

## Where the mouth meets the Pit

**(204.10, 173.73), y −31.40**: bearing 20 from the Pit's centre, 3.4 m in from the rim, at the bowl's edge: D2's point. The height is read from D2's own floor (`makeFloor(T).y` a hand inside the edge, i.e. its `FLOOR.edge`), so it follows D2. The gatehouse stands 1.9 m out from there on the bowl; from the floor 6 m out the lit way reads going back under its lintel (`shots/wip/final4-mouth-low-03-pit-floor.png`). To make room it cuts the throat's veneer and the Pit's own rock (`pit-floor` triangles rising 0.6 m over the bowl) over the gatehouse's face, and the terrain's wall triangles (all corners 4 m under the lip) across the way. Change `MOUTH` in `plan.js` and the last 12 m, the portal and the cuts follow.

## The kit, used and worked round; asks

- **D0's fall behind the door** is still in D0's mesh; I make its triangles degenerate after its build (272: every triangle in the door's x range wholly past DOOR.fall + 0.3: the rubble, the black end, the prism; its walls, vault, treads and floor stay and meet my first ring exactly). **Ask of D0/D3:** skip the fall and the black end in `coffin-road.js` when the passage is on (`PASSAGE_OFF` from `src/v14/passage/plan.js`), and drop my cut ("the cuts" in `passage.js`).
- **D3's parts**: the Line is built in my own files to the hand the orchestrator described (`DAY`, `MILK`, `AMBER`, `OXBLOOD` in `passage.js`; `tube()` in `plan.js`); D3's branch (`issue-1415-fourth-hand`) did not exist on the remote when I finished. Switch the lenses, collars and carriers to `ctx.strata`'s parts when they land.
- **Uncapped colliders** are columns down through the ground as well as up: the Pit's rim ring stopped the walk 3.5 m short of the mouth. Every uncapped collider within reach of the way (17, the rim's) gets a bottom 1.5 m under its ground (the same above it), again on `ctx.built()`. A class fix; edges-test checks none is left; written in runtime.md.
- **The seal and the Pit**: the kit keeps every caster within 110 m of an opening, so the Pit's opening is registered only while the eye is in the Gate. The Gate's last 13 m are 0.6–0.95 below (stone room, wind sheltered, grade), never 1, so the seal never hides the Pit's floor seen through the door.
- **D2's two new edges rows fail** in this branch (`the Pit's slabs near the foot, 5% / 1% up, toward down`: lowest −0.38 and −26.37 m). They fail identically with `?passage=0` (replayed in-page): the walker stands on D2's bowl at −30.38 where the row reads the terrain's −4 as the floor. D2's to fix.

## Tests (counts printed)

On the final build (after the redirect, with D0, D2 round 2 and `next` merged): `ONLY=edges,heights,settings,walk,hop,audio,perf,loading,regions,paths,roads tools/suite.sh 8162`: **11 tests, 3 failed** (29 min): paths 76, roads 58, regions 56, walk 13, hop 25, heights 124 (the ascent `wellward-way` walked point to point, six step-offs held, frame time top vs floor), loading 28, perf 29 PASS; **edges 199 PASS, 2 FAIL** (D2's foot rows, above; all 42 Wellward Way rows pass: sideways off ten points of every stretch hurrying and hopping, held, the vault 0.44 m or more over a hop's eye; dropped into the Gulf, caught and back on the bridge in 1.8 s; no uncapped collider left through the way); **settings** failed on `ERR_SOCKET_NOT_CONNECTED`, then on a load timeout, then **86 PASS** alone (`ONLY=settings`); **audio** failed one row (`act-bell-letters`, +0.5 dB, the bell under the Span), then **106 PASS** with settings (`ONLY=settings,audio`).

Before the redirect, on the Bearers' build: the same eleven gave 10 ok and edges 199/2 (the same two D2 rows).

## Walked (`tools/passage-walk.mjs`, new; new headless Chromium grants the capture)

From the Coffin Road's door spur through the door, the whole way to the Pit's floor 4 m past the mouth, and back to the door; 47 frames each; feet never under the plan's floor (0.00), no page errors, `walked: yes`:
- the final build (the Line, the mouth at −31.4): keys/low with the pointer captured (`ww-keys-low-*`), touch stick/low (`ww-touch-low-*`);
- the Bearers' build (the dressed stair; mouth at −33.4): keys/low, keys/medium, keys/high with the pointer captured, touch/low (`pw-keys-low-*`, `pw-keys-medium-*`, `pw-keys-high-*`, `pw-touch-low-*`). Medium and high were not walked again after the Line replaced the stair: only the first 26 m and the last 12 m changed, and their floor is checked by edges and heights; the orchestrator may want them.

## Frames, in order (`shots/wip/`)

1. **Walked, in order, there and back**: `ww-keys-low-01-start` … `-47-door-back` (every 10 m looking where the walker goes; back-and-up at s 10, the Flute's start, the room, the bridge's end, the Pit's floor: the `*-backup` frames); the same on the phone `ww-touch-low-*`.
2. **Stills along it**: `ww-route-low-01..24` (ahead every 10 m; back and back-up at five points).
3. **Every direction from six points** (ahead, right, back, left, up, down): `ww-around-low-01..36`, as one sheet `ww-around-sheet.png`. No sky, no missing underside, nothing sunlit; worst share under 8/255 1.1% (the Gulf's void, by design).
4. **The chamber**: `pass3-chamber-low-02-near.png`, `-03-work`, `-05-back` (the gold before its last colour change; `ww-route-low-08-s060` and `ww-around-low-1[3-8]` after).
5. **The mouth with D2's Pit**: `final-mouth-low-01-gate-out`, `final3-mouth-low-02-gate-sill` (out of the Gate onto the sheers and the lead), `final4-mouth-low-03-pit-floor` (the gatehouse and the lit way in from the floor).
6. **The Line**: `line2-route-low-03-s010` (inside the tube: a lens, a carrier, the Flute beyond), `ww-keys-low-08-flute-begins-backup` (its broken end seen from the bore).
7. **The surface**: `passage-moor-over-{flight,sun,gate}-{before,after}.png`.

## Numbers

- **Cost, JS a frame** (`perf=1`, 7 s each, low, the Bearers' build): the Nave's floor 2.89–3.47 ms; in the passage 2.94–3.77 (the Line 3.31, the room 3.66, the Gulf 3.6, the Gate 3.41–3.77). All of the difference is `render` (the draw calls the seal leaves through D0's Nave opening: 114–136 here, 102–144 there); the passage's own updates are under 0.07 ms. The room is 0.2 ms over the Nave's worst. Budgets: 9 draws (five stretch meshes, the room's things are in its, the gold, the portal, one Points), ~30k triangles, 14 lights (three slots).
- **Surface unchanged**: `tools/build-check.mjs` against a recording with `?passage=0` (params made equal): 55 identical; moved `passage` (new), `coffinroad` (the fall's triangles), `paths` (the throat's index), `colliders` (the bottoms) [before the gatehouse's rock cut; `pit` now moves too]. Render pairs on the moor over the Line, the room and the Gate (`shots/wip/passage-moor-*-before|after.png`): 0.012%, 0.062%, 0% of pixels changed (the 0.06% is likely the room's lamp taking one of the three light slots from the surface).
- **Audio** (`tools/audio-survey.mjs`, `shots/wip/audio/survey-d1-second`): way-door −40.8 LUFS, drips 9/min in phrases (gap max 9.6 s); way-sun −38.4, the draught, no repeat; way-mouth −40.3 (rendered at the old floor; the pose now stands at −31.4). Bands from those renders, gated on clicks.

## Defaults taken

- The name **the Wellward Way** (and the Line, the Flute, the Laid Sun, the Gulf, the Gate); the room and the Gate the Heliarchs', the Line the fourth people's, the Flute the wind's; the chamber's owner the Reckoner.
- 121 m along the line: about 35 s at a walk, one to two minutes with the room. I did not wind it longer to fill "two or three minutes".
- Three lights, three owners (stored daylight, failing; the Reckoner's warm lamp; the sounder's cold lamps), one glow colour per stretch's mesh.
- No threshold at the Pit's door: D2's bowl is the floor in the doorway.
- The Laid Sun's card (`feet` −34..−22, reached by the Wellward Way) and its stand at the room's way in.
- The drip at the door and the draught (no cues: scheduled by place, started from `v10/sound.js`).
- D2 merged into this branch (the orchestrator's message); `world.js` taken from D2's (B5's names) plus my line.
- `?pit=0` still reads the mouth's height from D2's floor function (2 m over the terrain there); a debug switch only.

## What is still weak

- **The Line is mine, not D3's yet**: built to the orchestrator's description of the fourth people's hand; it should be rebuilt from `ctx.strata`'s parts when D3 pushes them, and judged against D3's carriers in the hall (mine may not match theirs). Its crazing is a slow clouding; it reads as a tube, not yet as old resin.
- The Nave's end of the Line is still D0's dressed-stone door stub (three steps, a square passage 7 m long) before the tube begins: D3 owns the hall and the door; the tube should start at the door.
- From inside the Gate the view out is D2's bowl rising to the Nadir; from the Pit's floor the gatehouse is half hidden by the Pit's rock at a few angles (`final2-mouth-low-05-pit-west`), and a thin pale sliver shows at the left edge of the cut in one view.
- D0's fall is cut out of D0's mesh by triangle (a stopgap; ask above). The cuts of the throat, the Pit's rock and the terrain depend on D2's and v4's meshes as they are now.
- It is short for "two or three minutes": 121 m, ~35 s at a walk.
- The masonry of the Gate and the neck is flat blocks; the Gulf's far cliff reads as a flat lit plane from the bridge.
- The room's JS a frame is 0.2 ms over the Nave floor's worst (all in render).
- The way-mouth survey pose was rendered at the old floor (−33.4); its bands are wide enough, but it should be rendered again at −31.4 with D2's breath in.
- Medium and high not walked again on the final build (above).

## After judging (2026-11-15, late)

- **Now:** the gatehouse collides on every face (six edges rows walk at its piers from the Pit's floor); the cuts warn at build and edges asserts each; a missing passage is a FAIL row; `MOUTH.out` is D2's `FLOOR.out`; `capOver` touches only the Pit's rim ring (and finds none now: D2 caps them); the door framed in the Heliarchs' hexagon and roundels with the Reckoner's warm lamp; the basket collides; stale words and identifiers gone.
- **Later, on `next` with D3 and D2 round 3:** the Line's lenses, carriers and collars are D3's parts (`ctx.strata.parts.noon`), its walls in their palette; the ascent and passage-walk start on the hall road's own floor (D3's pitched carrier to the sill at −16.78; it meets mine at z 58, −17.44); a lit lens in the crown just past the door. The door had opened onto black since the start: the stub's black end quad was 1 cm above my cut's bound; now cut, and an edges row looks down the stub from the sill (`shots/wip/dr-keys-low-01-start.png`: the lit tube seen through the door from the hall). D2's ground 2.5 m past the bowl's edge meets my floor at the edge (−31.4); roads-test skips my ascent's foot rightly (15 m under the turf).
- **Tests:** `ONLY=edges,heights,settings,walk,hop,audio,perf,loading,regions,paths,roads tools/suite.sh 8162`: 11 tests, 0 failed (settings 86, paths 79, roads 61, regions 56, walk 13, hop 25, edges 209, heights 124, audio 106, loading 28, perf 29). Walked there and back on keys/low (pointer captured) and touch/low: `walked: yes`, 47 frames each (`lt-keys-low-*`, `lt-touch-low-*`), feet never under the floor, no page errors.
