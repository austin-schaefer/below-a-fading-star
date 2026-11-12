# Brief v11 M3: the two squares (#6)

Worktree: `.claude/worktrees/issue-1103-squares` (branch `issue-1103-squares`, port 8163). Work only there. Read `briefs/v11/_common.md` first; load `storytelling` too and read the stories of the Galleries and the Lamps in `stories/`.

## Goal

The owner, in #6: "These two elements on the mountains are both too square in overall shape, and being right next to each other compounds that. It also means they're fighting for attention; consider relocating the 'city of windows' somewhere else where it has more impact." See `v11-00-before-highling-y1.png`: the Galleries of Durance (`src/v5/galleries.js`, bearings 268 to 296) and the Escarpment Lamps (`src/v5/lamps.js`, 300 to 318, 432 window-lights) are two rectangles of one size, side by side on the west massif.

1. **Move the Lamps** to a face where a visitor meets them alone and they matter: seen from a road or a place where people stop, against dark rock away from the sun's glare, with nothing else hung within about 40 degrees of bearing. Walk the candidates in renders before choosing (the south massif 190 to 235 away from the Span's west end, the north-east between the Ridge and the Vigilant, the Tierce); say why you chose. The Lamps want a face steeper than 50 degrees and reject sunward faces: keep or retune that honestly. Update its story, the settings map's Go to if it lists them, and any saved views.
2. **Neither is a rectangle.** A city of windows on a cliff follows the rock: it gathers in a ravine, thins up a rib, strings along a ledge, leaves dark gaps, has one dense quarter and outliers far up. The Galleries are old ironwork on a prison face: tiers of unequal length, a ragged end where a run has fallen, one arm reaching far out along the rock. From 400 m each should have an outline you could recognise, and not the same one. Not the first idea: something a visitor would walk 200 m to look at.

## Not yours

`src/v4/mountains.js` and `src/terrain.js` (M1 and M2 are reshaping the wall's surface and outline; both things follow the ground by code, and you will be asked to re-render on the new wall after they merge). Keep within each module's budget (`world-code`).

## Done when

- No view on the map has the two side by side; `highling-y1` after shows the Galleries alone and changed.
- Before and after frames of each from 400 m, 150 m and its foot, plus the Lamps' new home from the place a visitor first sees it. A fresh reader could describe each outline without the word "square", "grid" or "rectangle".
- The Lamps' and Galleries' own tests, `settings`, and the tests in `_common.md` pass.
