# v14-B5 report: the owner's quotations, renames and cuts for the named places (#52)

Branch `issue-1413-quotations`, port 8165.

## The table

| Row | What the owner asked | What a visitor now sees |
|---|---|---|
| 1 the Lantern Halt | Quote | "The Lantern Halt" with “We went out into the moonless and tortuous network of that incredibly ancient town; went out as the lights in the curtained windows disappeared one by one.” |
| 2 the Tocsin | Quote | "The Tocsin" (on the ground under the Span) with “I came to the fog-enfolded river that flows beside its walls, and heard beyond the river the mortuary tolling of many bells.” |
| 3 the Escalade | Rename "The Cyclopean Stairs", quote | "The Cyclopean Stairs" at the west stair's foot and first flight, with “In the dank twilight I climbed the worn and aged stone stairs till I reached the level where they ceased.” |
| 4 to 8 the Span's deck | "Titan's Causeway" at the top of either stair, quote | "Titan’s Causeway" from the top treads of either stair's last flight (feet 53 m and up), on both top landings and along the whole deck, with “Never shall I learn the secret of those ruinous walls and crumbling keeps, nor the fate of my companions.” |
| 4 the Footing Course, 5 the Fallen Coping, 6 the Hung Cornice | (inside 4 to 8) | no card of their own: Titan’s Causeway there |
| 7 the Long Wait | Two lines, each in quote marks | "The Long Wait" with “A bitter night for travelers.” above “A bitter night for musing on the stars.” |
| 8 the Dropped Spar | Rename "Shaky Splice", quote | "Shaky Splice" on the river bay's strut, with “At intervals we came to the broken fragments of a paved road: broad, cyclopean flags of gneiss.” |
| 9 the Soundings, 10 the Fallen Lead | Cut | no card: the Lattice's card as before B3 |
| 11 the Bitter End | Quote | "The Bitter End" with “Our eyes swept that limitless, tempest-scarred plateau and grasped the almost endless labyrinth.” |
| 12 the Diffident Stair | Rename "Lonely Staircase", quote | "Lonely Staircase" at the stub, with “Form is shadow, substance is illusion, materiality is dream.” |
| 13 the Hanging Croft | Quote | "The Hanging Croft" with “We discovered, however, at an early date, that we ourselves and our buildings were invisible to men.” |
| 14 the Warders' Landing, 15 the Remand | Cut; one name at the top of the lift, "Final Refuge", quote | the lower station shows what it did before B3 (no card); at the top, from the gangway along the whole gallery, "Final Refuge" with “In relating the circumstances which have led to my confinement within this refuge, I am aware that my present position will create a natural doubt.” |
| 16 to 18 the Cols | Cut | no card |

## How

- `src/world.js` LANDMARKS: the lines set; the cut entries gone; a new `causeway` landmark (an axis along the whole deck, x -257 to 257, half 24, feet 53 to 70) with `broad: true`.
- `src/hud.js`: a `broad` card wins over the plain landmarks (the Trigon Span's) but gives way to every other card inside it (its key is `d - 500`, the others' `d - 1000`), so the Long Wait and Shaky Splice keep theirs on the deck.
- `src/settings.js`: the go-to list. Cut with no stand before B3 (`eda4a31`): the Footing Course, the Fallen Coping, the Hung Cornice, the Fallen Lead, the three Cols: gone. Cut with a v13 stand: "The foot of the icefall" and "The lift's lower station", back under those names. Renamed: listed under the new names at their stands. New: "Titan’s Causeway", on the deck just past the west stair's top, looking east.
- Stories and the skills say Lonely Staircase where they name the place; each touched story has a dated line.

## Tests

TESTS

## Renders

RENDERS

## Read differently from the brief, and defaults taken

- "Titan's Causeway" is set with the curly apostrophe (’), as every other card's name sets one; the words are the owner's.
- The Causeway's card is up wherever the feet are 53 to 70 m and within 30 m of the deck's line: the west stair's last flight turns 29 m off it, so the card comes up on its top treads and on both top landings, and nowhere on the ground. Feet 53 rather than B3's 44 so that it does not come up halfway up the last flight.
- The Causeway got a stand in the go-to list (it is a new name, not a cut one).
- Code comments in `src/v12/stair*` and the tools still say "the Diffident Stair" (they name the module, which a visitor never meets); `RELEASES.md`, the README and dated history lines are left.
- `tools/settings-test.mjs`: the count formula's far places are 3 (the Lamps and the two kept stands); the names check now also stands at both Span stairs' last tread and top landing and wants Titan’s Causeway, and the lift's gallery wants Final Refuge; the deck check wants the Long Wait's two lines on two lines, the Causeway between places and Shaky Splice on its spar. `tools/roads-test.mjs`: the Soundings left EXEMPT (it is no longer a landmark). No way up had its top card cut, so nothing is exempted for "the owner cut it".
- B4 (`issue-1412-stands`) was not on `next` when I pushed; MERGENOTE
