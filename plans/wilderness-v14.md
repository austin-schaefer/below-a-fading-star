# Wilderness v14: the Depths

Until now the valley has had a floor, and since v12 a sky. This release gives it an underneath: a visitor goes down into the ground for the first time, walks in the dark by the light of what is down there, and comes up somewhere else. Beside it, the owner's thirteen open faults in what already stands are fixed.

## What was chosen, and why

No issue is labelled `next`, so the choice was the orchestrator's (2026-11-15, after v13 reached `main`).

- **The owner's #36, the Depths**, the other half of #4, whose first half was v12: "hidden depths to plumb", "Tunnels should connect certain areas, with hidden secrets and ancient lore to unearth as you make the journey", "We're science-fantasy, we can go crazier", "have fun with it!". v13 was depth (speed); this is reach, and it is the thing a visitor would tell a friend about: "you can go under it now".
- **Where: the east, not the wood.** The walk already has two places that look down and cannot be entered, 155 m apart: **the Foundered Nave** (255, 40), a buried hall seen through a sinkhole and "left dark on purpose", and **the Pit** (200, 185), the well where the old road ends, whose card asks how a wind can "blow up from below". The story library's loose ends point the same way (`stories/the-reckoner-under-the-door.md`: "The stair goes on far below the door"; "Two floors, or one?"). Joining two things that exist beats a third thing beside them.
- **One before nine** (`orchestrator`): nobody here has judged a dark, enclosed, walked place. Batch 1 builds one (the Nave, entered and walked) and it is judged before the tunnel is briefed.
- **The owner's faults ride along**: #38 to #43 (a week old, named unfixed by v12's critic and passed over by v13) and #46 to #52 (filed 2026-11-14). The owner is walking the piece and writing down what breaks; a release that ignored thirteen of their notes for a third time would be answering the wrong person.

Passed over, still in the pool: #18 (the wood: its "tunnels and crypts" are a natural second descent once this one has taught how), #20 (the village), #30 (the way out), #23 (music, which needs the owner's ears), #28, #33 (agents' ideas), #22 (waits on the owner: an account). The plastisteel tubes of #36 are not in this milestone: they are a second kind of thing, and they stay on #36's successor (see Status at release).

## What a visitor should notice

- **A way down that says so from the surface.** From the road, something at the Nave says "you can go down here"; v12's lesson was ways up nobody could find from the floor.
- **The Foundered Nave from inside:** the hall they have only looked into, walked: dark, the sinkhole's light falling in, their own steps answering off stone.
- **A passage on from it** under the ground to the floor of the Pit, the disc of sky far above, the wind coming up, and a way out.
- **Something down there that belongs to someone already in the valley**, and one thing to do.
- **The faults they would have tripped on, gone:** the offer's glow, the seat, the bell's ring, the lift's shudder, missing faces, broken chains, Escape, names on the new places.

## Done when

- A first-time visitor on the east road can find the way down without the map, go down, walk Nave to Pit and come out, on the keys and on the touch stick, on low, medium and high, and never sees sky through rock, falls through a floor, or stands in black with nothing to steer by.
- It is dark by design and still readable on a phone (`visual-art`: "dark grades go black on a phone"): there is always a next light to walk toward.
- Below ground sounds like below ground (stone room, no wind but the Pit's, hard steps).
- The frame costs no more underground than at the Nave's rim today; load time (v13's `load-probe`) within 5% of v13's.
- Each of #38 to #43 and #46 to #52 is fixed and judged the way the owner met it (moving, in a real browser), or is named in Status and the release note as not fixed, with why.
- A blind reader of the renders says what the place is; the critic's blocking findings are fixed; the gate is green.

## How it is built (from a read-only survey, 2026-11-15)

- **Leave `heightAt` alone.** The Nave (`src/v5/nave.js`) and the Hypogeum (`src/v2/ruins.js`) already open the ground by making terrain triangles degenerate after the bake; the kept bake, `height-check` and every scatter stream are untouched. A lowered `heightAt` moves placements across the whole map.
- **Floors below the ground already work:** `ctx.addWalkable(fn, { stack: true, keep })` holds a walker under higher ground (`?heights=test` has a cut 3 m down). Tree and rock colliders stop 1 m under the ground, so a passage 3 m or more down is clear of them.
- **What is missing, each a line or two in shared code:** a way to make a place dark (the terrain casts no shadow and the sun, hemisphere and ambient are global; today darkness is per material, as the Nave's baked attribute), the audio knowing the walker is below (the stone room in `src/audio/graph.js`, shelter in `bed.js`, the step in `steps.js`, all chosen by x,z today), the sun's glow in post showing through a roof (unchecked), a settings stand below ground (`settings-test` hard-codes the count and refuses holes).
- The terrain is single-sided: seen from below it is not drawn, so a passage is sealed by its own inside-out meshes or the sky shows.

## Status

**2026-11-15, 09:20 PST. Opened; batch 1 is dispatched.** The owner started this session at 07:57 beside the one finishing v13: watch its worktree, and when v13 is on `main` choose a milestone ("it's your repo, don't feel too bound by what's in the backlog") and carry it to `main`. v13 merged at 09:11 (`eda4a31`). Two read-only surveys (the story library and idea banks; how to go underground here) and a look at the Pit and the Nave on 8123 chose the above. #36 and the thirteen faults are `in-progress`, `v14`.

| Brief | Branch / worktree | Port | Model |
|---|---|---|---|
| D0 the first descent: the Nave entered (`brief-v14-D0-first-descent.md`) | `issue-1400-first-descent` | 8161 | opus |
| B1 the acts' faults: #38 #39 #40 #43 #46 (`brief-v14-B1-acts-faults.md`) | `issue-1401-acts-faults` | 8162 | opus |
| B2 the heights' faults: #41 #47 #48 #49 #50 #51 (`brief-v14-B2-heights-faults.md`) | `issue-1402-heights-faults` | 8163 | opus |
| B3 names and the Pomegranate House: #52 #42 (`brief-v14-B3-names-house.md`) | `issue-1403-names-house` | 8164 | opus |

Next: as each reports, look at its frames with the report shut, run its tests on its branch, a cold review of the diff, merge into `next`; the whole suite once for the batch on `next`. D0 is then judged (walked in a real browser by the orchestrator, a blind reader on its renders) and batch 2 is written from what it taught: D1 the passage and the Pit, D2 what is found down there (`briefs/v14/index.md`).

**2026-11-15, 11:05 PST. Two of batch 1's four are merged; B1 is in review fixes; D0 is building.**

- **B2 (the heights' faults) is merged** (`0a10449`): #50 the lift (the rider lagged the cage a frame, the look chased a point passing overhead, the slip at the stop took one frame), #47 (every crystal lead was wound inside out), #41 (a waystone's notch lining coplanar with the stone), #49 (the stair-top lamp's glow a flat square), #51 (links met end to end; the deck cut the chain), #48 (two tors on the Diffident Stair's slabs, two stumps on fords; `rocks-test` now checks every led way). The orchestrator looked at the before and after frames, reran its eight tests (8 of 8), and a cold review found no blocker; four should-fixes went back and came in (the deck's drawn notch and its floor agree, checked at 961 points; a ride on the real page's path in `lift-test`).
- **B3 (names, the Pomegranate House) is merged** (`9aba713`): eighteen places have a name on a card and no quotation; the list is posted on #52 for the owner. The house has one hearth, 54 warm lamps on every tier (it had 101 to 199 in four colours), a divan, an alcove, washing. Rerun by the orchestrator 8 of 8; the cold review's six should-fixes are in (the bench's top leg named a place that no longer existed; colliders on the fire, oven and ladder). Nothing there was walked on the keys by its author: the critic should.
- **B1 (the acts' faults) is back with its author** (`issue-1401-acts-faults`, port 8162): all five reported fixed and 5 of 5 on the orchestrator's rerun, but the cold review found a blocker (a key held when Escape is pressed stays held, so the walker walks on behind the panel) and the orchestrator's look at the frames found the new lure (moths at rest where the hand goes) all but invisible at 10 m. Asked for: the keys cleared, the panel idling the frame as the old card did (one line in `src/main.js`), the moths lit by the scene and found by a now-and-then flutter, the bell's post readable.
- **D0 (the first descent)** is in flight: `issue-1400-first-descent`, port 8161, opus; no report yet.
- No whole suite has run on `next` since v13: it runs once when B1 and D0 are in.

Next: merge B1 when its fixes are in; judge D0 when it reports (walk it in a real browser, a blind reader on its renders, a cold review); the whole suite on `next`; then write batch 2 (D1 the passage and the Pit, D2 what is found) from what D0 taught.

**2026-11-15, 11:36 PST. Batch 1's three fault briefs are merged; D0 is judged and back for round 2; batch 2 is written.**

- **B1 (the acts' faults) is merged** (`9536d2f`): #38 (the lure is five moths at rest where the hand goes, lit by the scene, one usually flying a short loop), #39 (the seat stands off the slab while sat on, and advances in the carrier's step), #40 (the "ring" was the rope coil scaled to four times its height: now rope piling at a taller, paler post), #43 (the hand's shadow pushes the plate out at 15 s), #46 (Escape opens the settings panel, which is the pause; it idles at 10 fps; held keys are cleared). Rerun by the orchestrator 5 of 5 before the review fixes; the author's last run was 4 of 5 then `settings` alone 83 of 83 after a test-only fix. **Weak, and said by its author:** the moths do not make an act findable from 15 m; what makes the bell findable is its post. The critic is to say, act by act, whether the thing itself reads from a distance.
- So all thirteen of the owner's faults are in `next`. The names list is on #52 with a picture and a number for each row (the owner asked for both in session; the pictures are `shots/places/`, committed by the orchestrator, not stage keepers).
- **D0 (the first descent) is judged, not merged.** The Sexton's shears on the Nave's south-east rim, a stair hung on chains 17 m down through the hole, a road of forty coffins lashed in pairs on the water with a candle on each pair, a sun in tesserae on the east wall, a fallen door in the south wall (x 246.7, sill y -16.7). The kit: `src/v14/under.js` (`ctx.below`, `underMaterial`, `UnderBuilder`, `boxBelow`), post and audio switched below. The orchestrator's rerun: 11 of 11. **A blind reader and the orchestrator agree on what does not read:** the coffins look like "a railway or duckboard track", the water like "a matte fog-floor", the sun like "bunting", the columns like "cardboard", and off the road several frames are black with no direction. **The cold review's blocker:** the hall floor costs up to 1 ms more JS than the rim (the moor is still drawn). Round 2 is with the same agent (`issue-1400-first-descent`, port 8161): part A the kit (the moor hidden below, a volume that follows a path, a fade to black, a smaller stone room, `ctx.nave.ceilAt`), pushed first so the passage can start on it; part B the look.
- **Batch 2:**

| Brief | Branch / worktree | Port | Model | State |
|---|---|---|---|---|
| D2 the Pit, from the bottom (`brief-v14-D2-the-pit.md`) | `issue-1411-the-pit` (from D0's branch) | 8163 | opus | out now |
| B4 stands that face a wall (`brief-v14-B4-stands.md`) | `issue-1412-stands` | 8164 | sonnet | out now |
| D1 the passage under the moor (`brief-v14-D1-the-passage.md`) | `issue-1410-the-passage` (from D0's branch) | 8162 | opus | goes out when D0's kit (part A) is pushed |

- No whole suite has run on `next` since v13; B1 touched `src/main.js` (one condition). It runs when D0 is merged.

Next: dispatch D1 on D0's kit push; judge D0's round 2 (the same three sets of frames, a second blind reader) and merge it; the whole suite on `next`; then D2, D1 and B4 as they report.

**2026-11-15, 14:19 PST. The owner walked the Coffin Road and wants the coffins gone; a fourth hand is briefed.**

- **D0 round 2 is merged** (`716aa9a`): the kit's second part (the moor hidden while below, `pathBelow`, a fade to black, a smaller stone room, `ctx.nave.ceilAt`), coffins that read as coffins, tide lines, the sun set in the east wall. The hall floor now costs less than the rim (the author's figures: 2.0 to 2.9 ms against 3.2 to 5.1). A second blind reader: "a drowned pillared crypt under the moor: a processional road of the dead"; still weak: the water reads as stone from the road, the stair's foot faces two columns, the plaster reads as smears, the sun as "a pixel LED board" with bunting.
- **The owner, in session, after walking it on 8123:** "looks pretty sick", then: "i'm not sold on the _coffin) part of coffin road. feels too on-the-nose, and too generic fantasy. let's do something a bit wilder. introduce a fourth cluture, maybe, and that's whne this road dates from. distinct visual style and era and nothing generic fantasy". So the coffins, the candles on stands and the Sexton go; the descent, the hall, the water and the Heliarchs' sun stay. **D3** (`brief-v14-D3-fourth-hand.md`; `issue-1415-fourth-hand`, port 8161, the session's own model): a fourth people between the Heliarchy and the Late folk who tried to keep the sun (stored daylight sent by tube: the owner's plastisteel tubes of #36), a hand of things made in one piece and round in section, the ring its motif; the road is their stalled carriers afloat across the water, a few still lit. The orchestrator's direction, written in the brief as a starting point; the name is a placeholder. One vessel is built and shown to the owner before the road is. D1 (the passage) is told its first stretch is this people's tube and that the coffin-bearers' premise is gone; its Laid Sun (the Reckoner laying a sun of the valley's picked gold into a floor) stands.
- **Also in:** B4 (ten stands re-aimed; `1f6fb2c`), B5 (the owner's quotations, renames and cuts on #52: ten cards; `499aede`). **Out:** D2 round 2 (the Pit: the Nadir must read as stars under the world; the stair's foot was buried a metre in the bowl), B6 (#54, the owner in session: the path to the Lonely Staircase ends at its back; `issue-1414-stair-approach`, port 8164), D1 (the passage, `issue-1410-the-passage`, port 8162).
- The whole suite is running on `next` at `716aa9a` (log `/tmp/suite-v14-batch.log`), the first since v13.

**2026-11-15, 14:38 PST. The owner on the stair's slabs and on who made the science side; three issues filed; D3's first vessel.** In session:
- On #54: "yes, it was slab line that i followed to stair". B6 is back with its author for that (the trod to the foot stays; the lying slabs must stop reading as a paved road to the back; the rising-slab behaviour is not touched). Not merged.
- "great, i dig your new culture. i think we need an answer for what culture produces the more science side of science fantasy: the various floating satellites, the prison place with its steel and chians. or do we have an answer?" There was none. Proposed: the sky (lattices as collectors of daylight, remnants as broken collectors, the tubes that brought the noon down) is the fourth people's; the Galleries of Durance's iron is the Heliarchy's hard late end. The owner: "yes to all that, agree prison is its own thing". D3 writes it into `visual-art/architecture.md` as settled. Nothing in the sky or at the Galleries is rebuilt in v14.
- "... probably need issues or something base don this, right?" Filed: #55 (the coffins go; `in-progress`, `v14`), #56 (milestone idea: the sky re-dressed and a tube going up; pool), #57 (the Galleries' iron as its own hand; pool). #36 points at both.

D3's checkpoint (`9712ace`): the people are **the Noonwrights**; trial carriers afloat in the Nave. My read of the frames: the ring, the band and the pooled light work; the vessels look new (a clean white capsule), the unlit ones glow as much as the lit, and the body is a pill. Sent back with those three and a capped bloom; the owner has the frame paths. D2 round 2 and D1's re-theme are still out.

In flight: D1 `issue-1410-the-passage` 8162 (`ae32ab1e51ac4b23e`); D2 r2 `issue-1411-the-pit` 8163 (`a1eb89fffe51ddb43`); B6 r2 `issue-1414-stair-approach` 8164 (`a4354b892afc4524f`); D3 `issue-1415-fourth-hand` 8161 (`aa2d5f96db299f6b5`). The whole suite on `next` at `716aa9a` is still running (`/tmp/suite-v14-batch.log`); nothing merges until it ends. Next: judge each hand-back, merge, the critic and curator, one gate, release.
