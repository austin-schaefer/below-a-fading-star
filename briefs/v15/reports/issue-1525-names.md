# v15-N1, names, the map and the village's cost on low (issue-1525-names)

## The village near, on low (part 3)
`node tools/heights-cost.mjs <base> low out.json --village [--modules=0]` (new): the village's own modules (lappet, quarrels, rungs, lees, pennyworth, villagerow, lappetfar, house), colour pass, at three stands, worst of eight headings, shadow map redrawn. Stands: the Lees' square (73.7, -36.3), the Mid Rung (64.3, -21.8), the Pennyworth (100, -25).

| stand | calls / triangles (village modules only) | whole scene, same heading |
|---|---|---|
| the square | 21 / 188k | 221 colour calls / 1.58M |
| the Rungs' middle | 21 / 188k | 204 / 1.59M |
| the Pennyworth | 22 / 189k | 238 / 1.63M |

Per module at the worst heading: lappet 27k (4 calls), quarrels 26k (2), rungs 33k (1), lees 21k (2), pennyworth 33k (1), villagerow 13k (2), house 34k (9, the Pomegranate House), far 3k (1). Budget 250k and 30 calls: under it at every stand and heading (141k to 189k).
The 318k of the far report (issue-1522) is not the village's modules: the same stands also draw `structures-pavers` (the causeway's 4,371 paving blocks, 93k), `structures-taverna` (57k) and the Diffident Stair's treads (76k), which belong to other modules and are not the village's to thin. Nothing was thinned: every quarter already gates its props on `low` (segments, beams, cobbles, bottles, washing) and I found no triangles a phone cannot see that were worth a pop risk. Before and after are the same numbers.

## Names (part 1)
Kept, changed, why. Display names only; plot ids, ascent ids, mesh names and code identifiers stand. `[Proposed]` is dropped from src/v15 (the names are settled).

| name | verdict | why |
|---|---|---|
| the Lappet, the Strake, the Quarrels, the Rungs (High, Mid, Low), the Lees, the Pennyworth | kept | the quarters; plain, old, one voice |
| the Leads, the Gullet, the Tenter, the Slype, the Squint, the Cantle, the Pier Stair | kept | real trade or building words |
| the Short Stair | changed: the Stump | a description; the stair's cheek is a stump |
| the Fountain of Noon, the Wanting Arch, the Lagan, the Ullage, the Welt, the Tare, the Rebate | kept | vintners', weighers' and framers' words, one trade voice |
| the Thumbway, the Hitch, the Slip, the Grudge, the Spilt Measure, the Skirts, the Leave, the Afterdoor | kept | short, worn, what a street is called |
| the Smoking Saint, the Saint's Rest, the Almoner, the Last Arch, the Banker, the Brow House, the Unroofed House | kept | each says what it is |
| the Leaning Lodging | changed: the Propped House | alliteration; doubled "lodgings" |
| the Stage | changed: the Hustings | a theatre word on a mason's scaffold |

## Cards and places (part 2)
Four cards in `LANDMARKS` (`lappetCrown`, `lappetRungs`, `lappetLees`, `lappetFoot`: The Quarrels, The Rungs, The Lees, The Pennyworth), each gated on its level by `feet` and winning over The Lappet inside it. Three map places with no card in `src/settings.js` `VILLAGE_PLACES`: The Fountain of Noon, The Smoking Saint, The Afterdoor (the Pomegranate House's south door). Stands checked by the test's own rule (centre in view, no collider within 3 m of the eye) with a script that teleports to candidates.
