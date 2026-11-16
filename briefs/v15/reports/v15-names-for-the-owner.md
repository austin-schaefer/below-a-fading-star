# v15: the names a visitor can meet in the village, for the owner

For review: reverse or change any. A place that gets a card or a map entry needs a quotation (the process of #52); `line` is set exactly as given in `src/world.js` LANDMARKS, never written by an agent. Every new place's `line` is left **absent** (the Lappet's card shows a name only), which the tests accept. The four quarter cards are `map: false` (cards only), so the teleport list gains two entries only, the Fountain of Noon and the Smoking Saint (#70).
Links open the local server on the working branch's port (8168); change the host as needed. "Who named it": the v15 agents by brief (V0 plan and bones, V1 the houses and the Strake, Q1 the Quarrels, Q2 the Rungs, Q3 the Lees, Q4 the Pennyworth, N1 renames); no name came from the owner. Way names (`rungs-leads-n`, `heliarch-head` and so on) are ids, never shown, so not listed; no shop sign carries lettering (signs are glyph marks); the one story title is "The saint in the kiln" (`stories/the-saint-in-the-kiln.md`).

| Name | What it is | Stand (link) | Who named it, and the word | Card / map | Needs a quotation |
|---|---|---|---|---|---|
| The Lappet | the village itself, on the giants' stair under the keep | [128, 5](http://localhost:8168/?pos=128.0,5.0&yaw=1.24) | v15 plan (V0). A lappet is a loose hanging fold or flap of cloth or flesh: the village hangs on the hill's stair | card (no line); map entry (existing) | yes: card has no `line` yet |
| The Quarrels | the crown: the masons' ground above the stair, the quarry in the keep's wound | [62, -8](http://localhost:8168/?pos=62.0,-8.0&yaw=-2.12) | Q1 agent. Quarrels: stone pits, and the small square panes and bolts cut from them | card (new); no map entry | yes, `line` empty |
| The Rungs | the three stepped streets, the High, Mid and Low Rung, with the houses stacked on them | [64, -18](http://localhost:8168/?pos=64.0,-17.5&yaw=-1.73) | Q2 agent; the plan's levels. The giants' steps read as a ladder's rungs | card (new); no map entry | yes, `line` empty |
| The Lees | the bench: the square, the fountain, the shops, the Strake | [78, -34](http://localhost:8168/?pos=78.4,-34.1&yaw=3.08) | Q3 agent. Lees: the dregs a wine leaves; what settles at the foot of the stair | card (new); no map entry | yes, `line` empty |
| The Pennyworth | the foot of the hill: the market, the gardens, the way to the Pomegranate House | [114, -15](http://localhost:8168/?pos=114.0,-15.0&yaw=1.00) | Q4 agent. A pennyworth: what a penny buys | card (new); no map entry | yes, `line` empty |
| The Fountain of Noon | a vessel's broken foot, a milk-glass bowl that wells stored daylight | [80, -33](http://localhost:8168/?pos=80.0,-33.0&yaw=0.99) | Q3 agent. What the bowl keeps is noon | map entry (new); no card | yes (map entry), `line` empty |
| The Smoking Saint | the head of a fallen colossus, hollowed by the masons into their lime kiln | [65, -4](http://localhost:8168/?pos=64.5,-3.5&yaw=-1.83) | Q1 agent; story `stories/the-saint-in-the-kiln.md` (title: The saint in the kiln). The kiln smokes | map entry (new); no card | yes (map entry), `line` empty |
| The Strake | the row of five houses of five ages on the bench | [59, -46](http://localhost:8168/?pos=59.0,-45.7&yaw=2.76) | V1 agent. A strake is a run of planking, a line of plates | none | no |
| The Saint's Rest | the upper square at the stair's head, by the kiln | [70, -8](http://localhost:8168/?pos=70.0,-8.0&yaw=-2.73) | Q1 agent; the saint rests in it | none | no |
| The Propped House (was the Leaning Lodging) | the masons' house propped on the keep's fallen slab | [44, -8](http://localhost:8168/?pos=43.7,-7.8&yaw=-2.09) | Q1 agent; renamed N1: the alliteration was twee and "lodging" doubled the quarter's lodgings. To reverse: `title` in `src/v15/plan.js` | none | no |
| The Brow House | the narrow house on the rim, the first lit window from the west | [51, -19](http://localhost:8168/?pos=50.8,-19.1&yaw=2.76) | Q1 agent; it stands on the brow of the crown | none | no |
| The Unroofed House | a house half built of the keep's fallen ashlar | [91, 13](http://localhost:8168/?pos=91.1,13.3&yaw=2.07) | Q1 agent | none | no |
| The Banker | the masons' yard: stock squared up on the brink | [83, -4](http://localhost:8168/?pos=82.7,-3.8&yaw=2.07) | Q1 agent; a banker is a mason's bench | none | no |
| The Last Arch | the aqueduct's last standing arch, over the crown's east end | [67, 18](http://localhost:8168/?pos=66.7,17.8&yaw=-1.57) | Q1 agent | none | no |
| The Almoner | a hand of the fallen saint, its palm a basin of water | [72, 15](http://localhost:8168/?pos=71.8,15.0&yaw=-1.57) | Q1 agent; an almoner gives alms | none | no |
| The Hustings (was the Stage) | a mason's scaffold on the Last Arch to climb and look from | [70, 18](http://localhost:8168/?pos=70.3,17.7&yaw=-1.57) | Q1 agent; renamed N1: "stage" is a theatre word. Hustings: where one is raised to speak. To reverse: `name` in `plan.js` QUARRELS.stage | none | no |
| The Leads | the lead-sheet roofs of the Low Rung, walked along | [66, -29](http://localhost:8168/?pos=66.0,-29.0&yaw=-2.16) | Q2 agent | none | no |
| The Gullet | the narrow passage between two Low Rung houses | [88, -12](http://localhost:8168/?pos=88.0,-12.0&yaw=-0.46) | Q2 agent; a gullet is a throat | none | no |
| The Tenter | a dyers' stretching-frame stair on the Mid Rung | [103, 5](http://localhost:8168/?pos=102.7,5.2&yaw=0.79) | Q2 agent; a tenter is a frame for stretching cloth | none | no |
| The Slype | a covered narrow way between houses | [98, -2](http://localhost:8168/?pos=98.4,-1.6&yaw=0.79) | Q2 agent; a slype is a covered passage | none | no |
| The Squint | a bench on a roof from which three stairs of three ages are seen | [107, 11](http://localhost:8168/?pos=107.2,11.4&yaw=1.03) | Q2 agent; a squint is an oblique opening to look through | none | no |
| The Cantle | a fallen carrier's sherd built into the Mid Rung | [93, -12](http://localhost:8168/?pos=92.7,-12.3&yaw=2.07) | Q2 agent; a cantle is a cut piece, the saddle's back | none | no |
| The Pier Stair | treads let into a pier's faces, the lowest gone | [106, 9](http://localhost:8168/?pos=106.1,8.6&yaw=1.03) | Q2 agent | none | no |
| The Stump (was the Short Stair) | a Heliarch flight whose lowest tread is gone, its foot in a house's wall | [104, 9](http://localhost:8168/?pos=103.8,9.4&yaw=0.79) | Q2 agent; renamed N1: "Short Stair" described rather than named. To reverse: `RUNGS.stub.name` in `plan.js` | none | no |
| The Wanting Arch | the gate at the head of the old way into the Lees' square: two piers and a ring of eleven | [69, -35](http://localhost:8168/?pos=69.2,-35.2&yaw=0.00) | Q3 agent; it wants what hung from it | none | no |
| The Lagan | the dead-letter counter (shop) | [91, -29](http://localhost:8168/?pos=90.5,-29.4&yaw=2.76) | Q3 agent; lagan: goods sunk at sea, marked with a buoy to be fetched | none | no |
| The Ullage | the vintner (shop) | [102, -17](http://localhost:8168/?pos=102.3,-16.8&yaw=2.07) | Q3 agent; ullage: how much a cask lacks of full | none | no |
| The Welt | the slipper-maker (shop) | [108, -6](http://localhost:8168/?pos=108.1,-6.2&yaw=2.07) | Q3 agent; a welt is the strip a shoe's upper is sewn to | none | no |
| The Tare | the salt-weigher's stall on the square | [61, -35](http://localhost:8168/?pos=61.2,-35.0&yaw=-0.38) | Q3 agent; tare: the container's weight deducted | none | no |
| The Rebate | the picture-framer's house | [116, 3](http://localhost:8168/?pos=116.4,3.5&yaw=2.07) | Q3 agent; a rebate is the groove a frame or pane sits in | none | no |
| The Thumbway | the lane under the house's south wall | [104, -25](http://localhost:8168/?pos=104.0,-25.0&yaw=0.72) | Q4 agent | none | no |
| The Afterdoor | the Pomegranate House's south door | [101, -29](http://localhost:8168/?pos=101.0,-29.4&yaw=1.26) | Q4 agent; the back door | none (the map entry was cut, #70) | no |
| The Hitch | the lane round the back of the house's stable to its gate | [113, -48](http://localhost:8168/?pos=113.0,-48.0&yaw=-1.57) | Q4 agent | none | no |
| The Slip | the cut from the ramp's foot to the Thumbway | [104, -21](http://localhost:8168/?pos=103.9,-21.0&yaw=0.00) | Q4 agent; a slip is a narrow passage | none | no |
| The Grudge | the garden: beans on poles, a well under a Heliarch drum, the Moles' heaps | [107, -30](http://localhost:8168/?pos=107.5,-29.5&yaw=-3.14) | Q4 agent | none | no |
| The Spilt Measure | a fallen carrier lying along the lowest riser, half sunk | [117, -14](http://localhost:8168/?pos=117.3,-13.7&yaw=2.09) | Q4 agent | none | no |
| The Skirts | the lowest riser east of the wreck, what later hands made of the giants' face | [110, -3](http://localhost:8168/?pos=110.0,-3.0&yaw=-1.57) | Q4 agent | none | no |
| The Leave | two posts and the last lamp where the village ends | [119, -14](http://localhost:8168/?pos=118.5,-13.8&yaw=-2.62) | Q4 agent; leave: departure, and permission | none | no |
