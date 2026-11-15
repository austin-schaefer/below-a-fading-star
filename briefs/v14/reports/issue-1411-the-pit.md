# v14-D2 report: the Pit, from the bottom (the sounding down)

Branch `issue-1411-the-pit` (from D0's branch; D0's kit move `39e7401` merged), port 8163, 2026-11-15.

## What a visitor finds

**At the bottom of the Pit the floor of the world has worn through.** The floor is a shallow bowl of rubble; in its lowest place is a ragged hole, **the Nadir**, and through it, under the world, is night: stars, slowly turning, as far off as the ones overhead (a disc drawn by the direction it is seen in). The wind is the outer wind coming up out of it. Pale motes rise slowly out of the hole and up the throat; a hollow note on A3 and D4 is the Pit's breath, heard on the floor and from a passage under the moor within ~60 m, not at the lip.

**It is the sounder's**: whoever cut the stair in the ice to the leadsmen's broken eye (the soundings' open thread, now answered). They cut a piece of an old crystal lead out of the icefall, came down the Pit, rigged **sheers** (three timbers, a sheave) over the Nadir and a **down-reel** (a windlass) beside it, and sounded the world from below. The line never touched. `stories/the-sounding-down.md`.

**The act, "Let go the lead"** (at the crank's end of the drum; `every: 'free'`, 25 s): the pawl is knocked up; the drum runs and the crank whirls; the lead drops into the stars and the Pit draws its breath in after it (the motes turn and pour down into the hole, the stars dim); at 7.2 s the line's bitter end: it snaps taut, the sheers thump and the line thrums on D2; at 8 s the outer wind comes up the line: a plume of cold motes up the throat and out over the lip into the sky, the hole's light flares, the line sings (D4/A4); the wind winds the lead home, which comes up out of the hole white with rime at ~22 s and swings to rest. From the lip the plume and the sound are the result. `show(n)`: two motes per sounding (to 14) stay hung in the Pit's air.

**The way up and out**: the old road's own hex slabs (the ones that fell in when the road's end fell), pinned one over the next on iron knees up the wall, clockwise from the floor at bearing 260 to a **landing** of planks over the lip at bearing 290, beside where the road comes in; a rope on iron stanchions on the open side, four cold lamps (head, two on the way, foot). 128 slabs, 26 m over 70 m (22°). So the road does not end at the Pit: it goes on down. From the lip the landing, its posts and lamp and the slabs going round the wall say "a way down here".

A stranger shown the floor renders would probably call it: "a well with a hole full of stars at the bottom and a crystal hanging over it on a winch".

## Where the passage's mouth meets the floor (for D1)

**(204.10, 173.73), y −33.40**: bearing 20 from the Pit's centre, at the bowl's edge (`FLOOR.out` = 3.4 m in from the rim; R(20) = 15.39). The floor walked is the bowl (`makeFloor(T, noise).y`, a replacing walkable), not `heightAt` (5 m higher in the middle). It rises gently from there to the Nadir's mouth at y −30.6 (floor at r 9: −32.58). Nothing of mine stands within 15° of bearing 20 at the floor; the stair passes over it 18 m up. The throat's rock veneer (`v4/paths.js`) still covers the wall there down to the bowl's edge: the passage cuts through it and through the terrain wall. The Pit's things are `below.keep`'d, so they are drawn from a sealed passage; the passage needs a `below.opening` at its mouth.

## Defaults taken

- **The floor counts as 0.6 below** (never 1, so the kit's seal never shuts it: open to the sky): the stone room's share, the moor's wind sheltered (the Pit's own is its loop), the grade part way to the dark-adapted eye, the hard step. It eases out above lip − 9 m.
- **The floor is a bowl, not the terrain's floor.** The terrain's floor is a 5 m rubble heap in the middle with a trench round it: from the passage's bearing it was a black slope filling the view and 30°+ underfoot. heightAt is untouched; the terrain's and the Saltings' crust's triangles touching the bowl are not drawn (as the Nave does); the rocks' pebbles there are laid on the bowl; `v4/paths.js`'s fallen slabs use it.
- **The Pit's haze** (`pit/haze.js`): the height fog thickens tenfold per ~21 m down, so from the floor everything 10 m off was white. The Pit's own materials (mine, the throat veneer, the road's slabs and the lip's clods) keep a share of their haze by the eye's depth (all of it at the lip, 0.22 on the floor). No change to `atmosphere.js`.
- **Shared and other modules' code touched** (a line or a few each): `main.js` (MODULES), `world.js` (the Nadir's card, `feet: [-40, -12]`; the Pit's card now `feet: [-12, 60]`, the lip's), `settings.js` (the `nadir` stand with a `y`), `v10/sound.js` (start `pit-sound.js`, route `act-pit-*`), `v4/paths.js` (the throat's black fan gone and its rock down to the bowl; the rim's colliders and clods leave the landing's gap; hazed materials), `v8/roads/place.js` (no gnomon inside the Pit: one grand one stood 3 m from the centre at the old floor's height), `vegetation/ground.js` (no ground cover below the Pit's lip).
- The act is `free` (soundable again after 25 s); its lure sits on the pawl.
- The throat veneer is left at bearing 20 for D1 to cut (rather than notching it now and leaving bare terrain).

## Tests (counts printed)

- `ONLY=acts,edges,heights tools/suite.sh 8163`: **3 tests, 0 failed** (edges 137, heights 116, acts 163 PASS lines; 12 min 27 s). New rows: acts-test 8 Pit rows (offered beside the reel looking at the Nadir or the reel; not with the back to it, from the lip or from the stair; E lets the lead go into the Nadir; it comes home; remembered after a reload); edges-test 13 Pit rows (sideways off the slabs toward the hole and the wall at three heights, hurrying and hopping: held; a walker on the landing's line from 30 m walks out onto it); heights-test walks the ascent `pit-stair` (13 points, three step-offs sane, top 16.70 vs floor 16.70 ms). The Pit's rim rows (five bearings, the hop, the three lookouts) all still pass with the landing's gap.
- `ONLY=settings,walk,hop,audio,perf,loading,regions,paths,roads tools/suite.sh 8163`: **9 tests, 3 failed** (paths 76, regions 56, walk 13, hop 25, loading 28, perf 29 PASS lines; settings, roads, audio failed). Settings failed on the new stand (measured from `heightAt`, not the bowl it stands on) and on "(200, 185) shows The Pit" (the floor's card is now the Nadir's); roads on two causeway samples over the Pit's hole once its gnomon left the Pit; audio on `act-pit-breath` at 3.1 rms (gain 8) and on `act-bell-letters`. Fixed (settings-test measures a stand on a floor under `heightAt` from that floor and checks the Pit's card at the lip and the Nadir's on the floor; roads-test leaves the causeway's line within 12 m of the Pit's centre; the gust's cue at gain 0.5).
- Rerun `ONLY=settings,roads,audio tools/suite.sh 8163`: **3 tests, 1 failed**: settings 84, roads 65 PASS lines; audio 105 PASS, 1 FAIL: `act-bell-letters` (bed 0.00724, cue 0.00769, +0.5 dB), identical in both runs. Its bed is the bell's own rows' tails (hum, rest: beds 0.011), before any Pit row; the Pit's five rows pass (pawl 0.014, run 0.013, taut 0.159, breath 0.193, home 0.018 rms; the bell's stroke 0.287). Not from this branch's code as far as I can see (no Pit sound plays away from the Pit); possibly D0's round-2 audio changes (graph.js, steps.js) or a flake: the orchestrator's batch run will say.
- `node tools/build-artifact.mjs`: run by the suite (`artifact`) in each run.
- After merging `origin/next` (the owner's card names, B4's stands; conflicts in `world.js`, the stories' index and the soundings' log, resolved keeping both): `ONLY=settings,roads tools/suite.sh 8163`: **2 tests, 0 failed** (settings 86, roads 57 PASS lines).

## Walked (`tools/pit-walk.mjs`, new; headless refuses the capture, steered by drag-look)

`walked: yes`, no page errors, each: up from the floor on the keys (low, medium), on the touch stick (low); down from the moor at the road's end with no map on the keys (low, high). Lowest feet −32.7 (the floor at the mouth).

## Frames, in order (`shots/wip/`)

1. The act from the floor, no look input after E: `pit-act3-floor-00-before` … `-10-after-26s` (0.3, 1, 2, 5, 8, 9, 11, 15, 22, 26 s).
2. The act watched from the south lookout: `pit-act3-lip-00-before` … `-09-after-22s`.
3. Up from the floor: `pit-walk-up-keys-low-01-start` … `-13-out-back` (also `-keys-medium-*`, `-touch-low-*`).
4. Down from the moor: `pit-walk-down-keys-low-01-start` … `-13-reel-up` (also `-keys-high-*`).
5. The Nadir from its edge: `pit-d2-c-hole.png`; before: `pit-d2-before-*` (the floor a whiteout of height fog).

(The act frames predate the last haze change on the slabs, clods and stair: the floor looks the same; the stair a little clearer.)

## Numbers

- **Cost**: 11 draws (the place one mesh ~19k tris on low, drum, pawl, lead's three, two lines, stars, motes+flames one Points), 6 point lights (the Nadir's, the lead's, four lamps; lights.js keeps three). JS a frame on low (`perf=1`, 6 s each, two passes): the lip looking in 2.65–2.72 ms, the floor 2.16–2.40, the floor looking up 2.09–2.12. The floor costs less than the lip.

## What is still weak

- **The slabs read poorly from the floor and from on them.** Dim, fog-grey, the wall 1.5–3 m behind them featureless; looking down from mid-way the stanchions and knees read as a palisade and the floor is lost in haze. On a phone frame (`pit-walk-up-touch-low-05-nadir-stair`) the way up is barely there. More lamps, a lighter slab colour or their own light down the line would help.
- The plume from the lip is small motes against a grey throat: it reads moving, not in a still.
- The wall's foot near the bowl's edge is my floor mesh following the terrain up 3 m: from close by it is a pale smooth skirt.
- The sound is unheard: the breath's level, the cues' levels and their bands have not been rendered through the audio harness (`audio-test` checks they sound). A listener should hear `act-pit-breath` and the breath loop on the floor.
- The stair at its foot comes within ~1 m of the floor's lowest ring on the west; heights-test's step-offs land on lower slabs (held edges), never on the floor.
- The Saltings' region card can show at the lip's landing (it did before).
