# v17 N1, the crossings, the dressing and the names: report

Branch `issue-1706-dress` (sonnet), 2026-11-17. Port 8166.

## What changed

- **Names** (`src/world.js` `LANDMARKS`, `src/settings.js` `NAMED_POSES`): the Slake (card, 20 m round the mere), the Swallow (card, r 16 round the quay, the cut's end and the head, feet -30..6), the Meridian Garth (card on the hall's floor, feet -30..-18), the Shuttered Noon (card, r 22). Every `line` is empty. Map entries for all four; the Swallow's stand is on the mere's south shore at (-70, 296), because the quay's head is a hole to the settings test (ground 8.8 m over its 30 m ring, limit 6). `briefs/v17/reports/v17-names-for-the-owner.md` is the table.
- **Ways** (`src/v4/paths/routes.js`): P55, a trod from the leat's bridge (east foot (9, 252)) down the leat's east bank and along the slope south of the Slake to the Swallow's quay foot (-90.5, 294). The south shore cannot be reached from the north on dry ground (a search over `heightAt` and the water: every dry cell north of the mere and the leat is cut off), so the trod starts east of the bridge. P56 runs from the Taker's road to the sphere's glass.
- **Crossings:** every lead sampled every 0.5 m in the chain's box: no sample of P14, P15, P34 or P55 is in water; P38 is wet at 8 samples, all on the leat's slab bridge, where the walker's floor is 0.6 to 1.6 m over the ground against 0.55 to 0.83 m of water. No lead crosses the brook. The mere's bar at x -80 is the pegs' strip, not a lead.
- **Reeds and cover:** none added. The reeds, sedge and fleshy leaves the vegetation already puts on wet ground (`plants.js`, `waterDepth`) stand along the mere's north shore and the brook's banks in the four frames; none stands on the trod. A guard row for reeds standing in running water is not written.
- `stories/`: the two State sections, Beats 1 and the Logs; `stories/README.md` rows.

## Tests (port 8166)

- `ONLY=settings,dressing,strata,rocks,roads,paths,regions,outline,threads,touch,loading`: settings 87, dressing 22, strata 8, rocks 38, roads 68, paths 88 (after the count 54 to 56), regions 56, outline 77, threads 25, touch 45, loading 28; all green on the last runs (settings, paths, roads rerun alone after the stand and count fixes).
- `walkers-test`: 19/20 (P12's pit-lamps).
- Not run: height-speed (no height file touched).

## For the others

- `issue-1710-red` put `swallow` in roads-test's `FEET_OPEN` waiting for this trod. P55 now ends 0.4 m behind the quay's foot, so roads reports that exemption's own row red once the two branches meet: drop `swallow` from `FEET_OPEN`.

## Frames (`shots/wip/`)

`v17-N1-card-{slake,swallow,garth,noonsphere}.png`, `v17-N1-map-south.png` (the Slake and the Swallow outlined in the panel), `v17-N1-map-west.png`, and the four views `v17-N1-walk-{brook-traveller,mere-north,leat-crossing,swallow-front}.png` (medium).
