# v14-B3 report: names for the new places (#52), the Pomegranate House (#42)

Branch `issue-1403-names-house`, port 8164.

## #52: the names

Survey: every place a visitor can stand that came with v9 to v12 (the icefall, the Diffident Stair, the lift and its gallery, the Span's ways and camp and west stair, the bell, the high passes, the Lantern Halt) had at most a settings-panel description ("The tender's deck", "The middle of the Span") and no card. Each now has a card (`src/world.js` LANDMARKS, `card: true`) with the name and no line; the card code already hid an empty line. Cards on decks and galleries carry `feet: [lo, hi]` so they show only at that height (not on the valley floor under the Span or the croft).

| Name | x, z, y | What a visitor sees there |
|---|---|---|
| The Lantern Halt | -63, 1, ground | The causeway's waystation: a sleeper in a lantern hung from a ten-metre slab, the travellers' tally, the seat on its rope |
| The Tocsin | -52, 207, ground (under the Span) | The great bronze bell hung into the Span's crack, its ram and the ringing post |
| The Escalade | -226, 200, ground | The foot of the Span's west stair, its first flight climbing west between walls |
| The Footing Course | -113 to -77, 211, 56 | The west fallen bay's way: the footing course on its rib, a stride wide over 56 m of air, rags tied along it |
| The Fallen Coping | -45, 219, 56 | The crack in the deck and the coping stone fallen across it, the bell's crown below |
| The Hung Cornice | 32 to 63, 219.5, 56 | The fen bay's way: cornice stones hung on iron, saffron strips along the edge |
| The Long Wait | 88, 211, 56 | The camp on the middle deck: the saffron lean-to, a deep drift of ash, a lane worn pale to her watching-stone |
| The Dropped Spar | 122 to 169, 215, 56 | The river bay's way: a truss member of a fallen lattice, torn at one end, rags on its stub |
| The Soundings | 70, -290, ground (about 16) | The icefall's foot: the lit cleft in the ice front, steps of ice and their crystals climbing over it |
| The Fallen Lead | 58 to 94, -322.3, 44 to 62 | An old crystal lead lying across the gap from the first terrace to the second; you walk up it |
| The Bitter End | 44, -390, 95 | The shelf at the top: a broken bronze eye with the frayed end of its line, the Plummet across the last crevasse |
| The Diffident Stair | 286, -14, ground | Seven old steps between two posts going up to nothing, slabs lying in the turf beyond |
| The Hanging Croft | 226, -55, 108 | The tender's home on a lattice's foot 100 m over the moor: lean-to, stove, chair to the sun, the ladder up |
| The Warders' Landing | -299, -18, ground (about 8) | The lift's lower station: a plinth, the bell's arch, rails going up the cliff |
| The Remand | -375, -117 to -24, 135 | The walked gallery on the cliff: iron cells, grilles hanging, the one locked cell with its rod of sun |
| The Col of Prime | 311, 125, about 17 | The east pass (bearing 112), its long foot rising to a saddle between massifs |
| The Col of Sext | 0, 335, about 13 | The south pass (bearing 180) |
| The Col of Compline | -178, -284, about 12 | The north-north-west pass (bearing 328), under the Lectern and the Tierce |

The passes take canonical hours after the Tierce already on that wall: Prime in the east where the sun once rose, Sext in the south, Compline in the north.

Settings: the six far places and two act places became these landmarks at the same stand points (`NAMED_POSES`), and the passes, the Span's ways, the coping, the lead and the shelf were added. The count in `settings-test` is now `1 + landmarks - 1 + 1 + 3 + 18 + 8` (spawn; every named landmark but the graves; the Escarpment Lamps; three region cards; eighteen living; eight story ends). D0 adds one landmark, so with D0 merged the total grows by one and the formula stays the same.

The class guard: `settings-test` fails if any registered way up (`ctx.ascents`) has no named card at its top (its last point, or the first point at its greatest height, at that height). Also new: a card on the Span's deck shows there and not on the ground under it, and the same at the croft. `roads-test` skips places marked `reached` (reached by a stair, the lift, the Span or the walk's edge, not a track) and says so in each PASS line.

## #42: the Pomegranate House

Before: a lawn inside walls, empty arcades, a dry fountain, and a tent of about a hundred coloured bulbs (red, saffron, turquoise, green) on strings from the mast to the turrets, round the walls and between the road poles; the court's one real light hung over the mast from nothing.

After (`src/v8/house/kept.js`, into the props mesh, no new draw):
- the hearth in the south gallery, under the cloth-patched roof: a clay bread oven with its mouth lit, a ring of coals with a copper pot on a trivet, a stool, the peel, split wood, a water jar, a basket of pomegranates, loaves cooling on a cloth, onions and peppers hung from the arch. The court's point light moved there and breathes 7% (it was 20%).
- the divan in the west gallery (kilim, bolsters, cushions, a brass tray with pot and cups); the host's curtained alcove in the east (pallet, rose quilt, chest, his own slippers side by side); washing on a line in the SW corner; a ladder and a bucket of limewash at the patched roof; fresh limewash patches on the north wall; water in the fountain and a bucket on its rim; a broom inside the gate.
- the court and galleries swept to beaten earth with a darker worn lane, the old star pavement showing through it; no ground cover in the galleries.
- lights: 54 lamps (it was 101 on low, 199 on high), four warm glasses (honey, saffron, garnet, tallow; no turquoise or green), smaller halos, a far boost cut from 3.5 to 1.6, a third of the sway. Four short strings over the court; one lantern on each pole's crossbar, no strings between poles; one lamp hung inside each gallery.

A stranger looking at `house-after-high-court.png` alone would call it a lived-in courtyard inn at dusk, with a cooking fire at the back; at `house-after-low-inside.png`, someone's outdoor kitchen.

Renders (all at dusk, the gutter held), in `shots/wip/`:
- before: `house-before-{low,high}-{gate,court,inside}.png`
- after: `house-after-{low,high}-{gate,court,inside}.png`
- close: `house-r2-divan.png`, `house-r3-alcove.png` (round 2 and 3 renders, low)

## Tests

`ONLY=settings,house,regions,perf,loading,livery,roads tools/suite.sh 8164` (roads added: it reads every landmark):
settings 76 PASS, regions 56, livery 16, house 20, perf 28 (all ok); roads FAILED 3 (the Escalade, the Soundings and
the Diffident Stair have no track within reach: marked `reached`, with how, in `world.js`); loading FAILED on a 300 s
timeout of its `&worker=0&kept=0` load, the machine at load 8.

Then `ONLY=roads,loading tools/suite.sh 8164` after the fix: roads 62 PASS, loading 28 PASS, 0 failed.

An earlier settings run failed once on "opening it does not raise the pause card or idle the frame" (`idle: true`: the
headless page lost focus while the machine was busy); it passed on the run before and the run after.

## What is still weak

- The divan in the west gallery is in the wall's shade and reads dark; its hung lamp is emissive only and lights nothing. The alcove reads as a striped curtain; the bed behind it is hard to see.
- The washing line is mostly hidden by the SW pomegranate tree from the gate.
- The pass cards stand at the walk's edge, inside r 348: a visitor reaches the pass's foot, not the pass.
- The cut stair and the shelf's walkable member past the croft have no cards of their own; they share their neighbours'.
- Weeds (tall plants, not ground cover) still stand here and there in the court.
- The Escalade, the Soundings and the Diffident Stair are on open ground with no track to them (roads-test now says so).
- None of this was walked through real input in a browser: the cards were checked by the test, and the house only by renders.

## Defaults taken

- The Lantern Halt (v9) is carded too: it was uncarded and named only in the panel.
- The passes are named at their feet, inside the walk's limit.
- Old house-test lamp check (at least 100, four colours incl. turquoise and green) replaced with the owner's word: 30 to 70, warm only, one per pole, four inside, the hearth light steady.
- The far places in the settings panel lost their descriptive names ("The tender's deck") for the card names.
