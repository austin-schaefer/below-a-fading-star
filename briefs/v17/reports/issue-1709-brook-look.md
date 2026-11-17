# v17 W1 follow-up: the brook's quick water: report

Branch `issue-1709-brook-look`. 2026-11-17. Only `src/v17/water.js`'s ribbon shader (and its uWater colour) changed.

## What changed

- Body: slate-green `#0d1311`, alpha 0.72 to 0.96 by depth (was 0.5 in the shallows: the bed showed through), reflection floor 0.5, held under 0.8 at grazing.
- The sky it carries is desaturated toward the cold sky; the sun's ember only in the glitter terms. Read a little low (R.y * 0.55) so the water stands lighter than its banks.
- Slopes drawn out along the flow; the standing-wave sine (cross bands) removed; riffles as a few long soft streaks (d * 0.75, s * 0.022, 0.22 mix).
- White: the lip a soft band where ROUGH > 0.84, edges wavering on slow noise; the fan continuous foam weighted ROUGH squared (gone within 1 to 2 m); the swift-edge line kept, softer.

## Blind reader (sonnet, down sheets 1 to 3 at medium, side=right off=0.9 turn=0.35)

Four rounds. Flakes are gone: round 2 "pale streaky water runs down", round 3 "a pale, streaky, silvery stream surface". Still faulted: the run between the blocks reads "a pale streaky grey-green channel ... a smeared texture, not water"; a thin white strip at the far end of the run (frames 13 to 19). That strip did not change with the lip or the reflection cap: it is not the lip foam; not traced. Not done: the reader never said running water unprompted with nothing wrong.

## Frames

`shots/wip/b11-down-medium-sheet-1..3.png`, `b9-down-low-sheet-1..3.png`, `b6-across-medium-sheet-1..4.png`, `b9b-air-brook.png`, `b9b-span-deck-brook.png` (the deck view as listed in views-v17-water.json looks at the deck, not the brook).
