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
