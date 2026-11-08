# Wilderness v4–v7 placement plan

Maps: `shots/18-placement-v4-map-regions.png` (the eight regions, the road, the Span, the pit) and `shots/18-placement-v4-map-all-sites.png` (every site in this plan, from `tools/sites-v4.json`; `SHOT_ANGLE=metal node tools/map.mjs out.png tools/sites-v4.json` redraws it).

One plan fixes the site of everything in v4 (the land and the Great Span), v5 (the built) and v7 (the living), so v4's paths and rivulets run to sites already reserved and nothing is placed twice. The specs are `wilderness-v4.md` and `wilderness-v5.md`; the sequence is `wilderness-run.md`. Coordinates are `(x, z)` in metres as in `src/world.js`: x east, z south, y up. **Bearings** are compass degrees from the bowl's centre (0, 0), clockwise from north (−z), as in `src/skylife/common.js`; a world.js sun azimuth α is bearing 90° + α. Names are the briefs' names and stay **[Proposed]**. The map render is added by the orchestrator (`shots/plan-v4-placement-map.png`).

The systems agent adds the new keys in this plan (`REGIONS`, the reserved `LANDMARKS`, the new `CAUSEWAY`) to `world.js` in one commit before the region agents start; after that nobody edits `world.js` but the map-structure agent.

## 1. The map today

The walkable floor is a disc of `regionRadius` 300 m; the mountains start to rise at r 290 and reach full height at `mountainRadius` 440, on a 1000 m terrain square. The floor tilts gently down to the south-west (`h += −0.012 z + 0.006 x`), so everything drains toward Lees Tarn and Corpse-Candle Fen. The sun hangs fixed at azimuth 160° (bearing 250°, west-south-west), 13.5° up, in a saddle carved into the west wall where the bearing is within 5.7° of the sun's (fading out by 17°). A glacier notch comes down the north wall along x ≈ 40 ± 75; its ice starts at z −200 and spills onto the floor to about z −215, and the Lattice (40, −265) sits on its tongue, its crystal ground reaching 110 m from that point. The Tumbling Water falls 20 m from a lip at (214, 266), y 23.5, into the Speculum's pool (208, 258), runs north-west down a 95 m canyon and enters the fen at (104, 192). The pool and lip lie just outside r 300, in the foot of the south-east wall.

The causeway (`CAUSEWAY`) runs from the keep's gate (8, 30) west and north-west past the Carillon Flags to the tower hill at (−222, −110), and stops. Water: `WATER.tarn` (−90, 110) r 60 at y −4.6, `WATER.fen` (70, 160) r 80 at y −2.45, `WATER.pool` (208, 258) r 6.8 at y 3.5. Spawn is (6, 36), at the gate, facing west. In the sky (`skylife`), the Vigilant sits on the crest at bearing 72°, the Parhelion City spans bearings 236–276°, and five sky lattices hang at bearings 30°, 92°, 198°, 244° and 318°.

Eight sectors of 45° each are centred on the compass points; a centre disc (r < 100) holds the keep.

| Sector | Bearings | Holds today |
|---|---|---|
| Centre | r < 100 | Carcanet Keep (40, 30) r 42, spawn (6, 36), the Heliotrope Sward (−45, 45), the Carillon Flags (−65, 12), the causeway's east half |
| N | 337.5–22.5° | the Sunken Court (−40, −165), the Lattice (40, −265), the glacier |
| NE | 22.5–67.5° | Medlar Close (130, −90), the Pomegranate House (95, −45), the Leaning Yard (198, −130), the Hypogeum (226, −112), the Gradine (282, −172) |
| E | 67.5–112.5° | the Arcature (160, 60); the Vigilant on the crest; otherwise bare moor under the east wall |
| SE | 112.5–157.5° | the fen's east half, the Tumbling Water and its canyon, the Speculum (208, 258), the Cutting (190, 246), the Wrong Colour (171, 242) |
| S | 157.5–202.5° | the fen's south reach, the Menology (−15, 255) |
| SW | 202.5–247.5° | Lees Tarn (−90, 110), the Deodand Wood (−210, 130) r 90, the Deodand Byre (−148, 64), the Trigon Span (−95, 215) |
| W | 247.5–292.5° | the Cardinal Stones (−170, −50), the sun's saddle |
| NW | 292.5–337.5° | the Armiger's Tower (−250, −135), the Wayside Shrine (−108, −128) |

## 2. The eight bioregions

As briefed, three regions sit east of the keep (the Bletting, the High Ling, the Saltings), the Demesne rings the keep, two sit in the west (the Lynchets, the Adust), and the south and north-west have none. The keep cannot move, so the Demesne holds the centre, and the eight outer sectors are covered by seven regions: the Saltings, which Austin asked to be "snaky", runs along the fen's rim through both SE and S. Two regions move: **the Lynchets** go from W to NW, and **the Strandline** moves round the tarn from its east shore to its south shore, into SW.

Rules for every boundary: a landmark wins inside its own `r`; the Deodand Wood, Corpse-Candle Fen and the Lattice stay places of their own (`regionAt` names them as such) and win inside the limits below; plain moor fills the gaps between regions. The Tinctures (DI) blend over 20–30 m at every boundary; the ground, stone and cover blend over 6–10 m unless the brief gives a hard edge.

### BO The Bletting: `src/v4/regions/bletting.js`, NE

- **Shape:** circle centred (130, −90), r 100 (brief r 110), clipped on the north at z −150 (the Plinth Road's foot), on the west by the Demesne's ha-ha, on the east by the High Ling's scarp.
- **Absorbs:** Medlar Close (its orchard weight widened), the Pomegranate House, the Leaning Yard; the Hypogeum sits on its eastern edge.
- **Ground:** "long rank grass with knapweed and the dull purple of self-heal".
- **Stone:** "broken field walls of honey-coloured stone laid without mortar".
- **Flora:** "old medlars and quinces gone to thicket, windfalls browning in the grass, a hedge-line of blackthorn".
- **Air:** "sweet and slightly rotten, full of drowsy wasps"; Tincture "amber wasp-haze".
- **Sound:** "fruit dropping".
- **Creature:** "the pomace snails, fist-sized, their shells a worn gilt lacquer, grazing the windfalls"; inside Medlar Close's r 52.
- **Boundary:** "the blackthorn hedge itself, gapped where paths come through".

### BP The Saltings: `src/v4/regions/saltings.js`, SE and S

- **Shape:** a sinuous strip on a spine, with a half-width at each point: (168, 130) 20 → (192, 158) 25 → (178, 192) 18 → (140, 200) 12 → across the river's mouth → (118, 222) 12 → (85, 246) 10 → (45, 246) 10 → (12, 228) 12 → (−18, 200) 12 → (−30, 180) 10. The east lobe (x 165–215) is the brief's flat; the rest follows the fen's south rim to the tarn.
- **Moved:** the brief's plate, centred (215, 150) and reaching the wall at x 260, becomes a strip along the fen's edges, per Austin ("snaky and wind a bit along shorelines"). Its eastern end gives way to the causeway's pit and the Span's east stair. The strip passes under the Great Span twice, at the mouth and at (−18, 200).
- **Absorbs:** the fen's east and south rim, the river's mouth reach (s 87–110). It begins where the canyon opens, 45 m downstream of the Wrong Colour, whose grey reeds are its seed.
- **Ground:** "a white crust cracked into plates with pink gypsum roses at the joints".
- **Stone:** "No stone at all, only crust and a few bleached stumps".
- **Flora:** "glasswort gone blood-red along the runnels, a margin of the same grey brittle reeds that ring the eddy".
- **Air:** "Heat shimmer lies on it … the wind lifts a fine salt that stings the light"; Tincture "rose-white glare".
- **Sound:** "the crust creaks underfoot".
- **Creature:** "the halite crabs, pale and sideways … that drop into holes in the plates"; on the east lobe round (190, 160).
- **Boundary:** "a tideline of grey reeds and a step of a metre down from the moor". On its inner side the fen's marsh wins within 75 m of (70, 160).

### BQ The Outwash: `src/v4/regions/outwash.js`, N

- **Shape:** ellipse centred (25, −195), semi-axes 85 m (x) by 24 m (z), so x −60 to 110 and z −219 to −171. The Sunken Court wins within its r 40, and the Lattice within 50 m of (40, −265).
- **Absorbs:** the glacier, rebuilt in the same hand (its snout at z ≈ −220 across x −20 to 100 is the Outwash's north edge), and the outer 50–110 m of the Lattice's crystal ground, which becomes gravel with crystal litter.
- **Ground:** "a grey plain of gravel and till in braided dry channels, the stones sorted and rounded".
- **Stone:** "erratics the size of carts perched on three points … map-lichen in yellow-green continents on every boulder".
- **Flora:** "Cushions of moss-campion with a few pinpricks of pink … nothing taller than an ankle".
- **Air:** "A cold breath comes down off the ice and lays the grass flat"; Tincture "a blue-white breath".
- **Sound:** "under the stones meltwater ticks".
- **Creature:** "a white grouse that sits among the erratics so still it reads as a stone, and flushes at three metres with a sound like a pane breaking"; round (50, −195).
- **Boundary:** "a long low ridge of terminal moraine" along z −171.
- **Constraints from later releases:** meltwater pools at (20, −205) for CQ; a clear line from (40, −265) to (60, −180) for CL's trail; the hearth site (10, −190) for DN; one erratic at (75, −200) for the glyph.

### BR The High Ling: `src/v4/regions/high-ling.js`, E

- **Shape:** polygon (228, 10), (236, −105), (276, −105), (293, −40), (293, 10); centre about (262, −45). The scarp runs along its west edge.
- **Absorbs:** the heath biome under the east wall. The Foundered Nave's block (z 15–65) stays outside its south edge.
- **Ground:** "deep ling and bell-heather, ruddy and knee-high, bilberry in the hollows".
- **Stone:** "a pinkish granite that weathers into tors, stacked pillows of rock 6 to 10 m high, with a skirt of clitter". The tallest tor stands at (268, −80), for CI.
- **Flora:** "gorse in bloom whose yellow turns ember in this light".
- **Air:** "Heather pollen hangs in the air"; Tincture "gold pollen".
- **Sound:** "grasshoppers stridulate and the wind moans in the tors' joints".
- **Creature:** "stonechats … each on the top sprig of a gorse bush"; round (255, −50).
- **Boundary:** "a scarp three metres high along its western edge", from (228, 10) to (236, −105).

### BT The Demesne: `src/v4/regions/demesne.js`, centre (leaning NE and E)

- **Shape:** annulus round the keep (40, 30) from r 42 to r 85, on bearings 300° → 120° from the keep, clockwise (north and east). The brief's outer r 100 shrinks to 85 so the Pomegranate House (93 m from the keep) stays in the Bletting, as that brief wants.
- **Absorbs:** the keep's home moor. The fen holds the south and the Sward the west, as briefed.
- **Ground:** "turf grazed short and gone tussocky, the outlines of parterres showing as ridges under the grass".
- **Stone:** "dressed blocks scattered from the fallen curtain tower". These lie in a fan from the keep on bearings 30–60°, out to r 80, the same fan the v5 keep recast keeps (see section 6).
- **Flora:** "yew shapes clipped long ago into cones and urns and now grown shapeless".
- **Air:** "still and smells of cut stone"; no Tincture in the brief.
- **Sound:** "rooks talk at the keep".
- **Creature:** "the peafowl, white and moulted … crying from the fallen blocks at every gutter"; on the fan, round (75, −15).
- **Boundary:** "a ha-ha, a sunk wall in a ditch … then a two-metre drop", at r 85. The causeway's east leg crosses it at (120, 52) on a raised bed.

### BU The Lynchets: `src/v4/regions/lynchets.js`, NW

- **Shape:** polygon (−228, −115), (−200, −150), (−160, −115), (−182, −78), (−215, −85); centre about (−197, −108). Every side is a wall.
- **Moved:** from the brief's (−115, 15) r 45 (W, beside the Adust) to the tower hill's south-east flank, so NW has a region. Its terraces step down the hill's slope (the tower hill falls away out to 66 m) toward the shrine instead of toward the tarn. The causeway still crosses it, between (−222, −110) and (−185, −72). The Stones win within 30 m of (−170, −50), and the tower within its r 24.
- **Ground:** "long terraces stepped down the slope … ridge-and-furrow under the turf that shows in low light, docks and nettles thick where middens were".
- **Stone:** "drystone walls of grey field-stone running in straight lines to nowhere, gapped and slumped".
- **Flora:** docks, nettles and thistles (from the ground and air lines).
- **Air:** "Thistle-down drifts in the air"; Tincture "silver thistle-down".
- **Sound:** "wind in the dock-heads and a gate creaking somewhere with no gate in sight".
- **Creature:** "stoats in half-moult, ermine-white in patches and brown in others, that hunt the furrows and stand up to look at you"; round (−200, −110).
- **Boundary:** "every edge of the Lynchets is a wall".

### BV The Strandline: `src/v4/regions/strandline.js`, SW (straddling S)

- **Shape:** a band 18 m wide on the tarn's shore, from (−35, 128) on the east, round the south, to (−122, 172) on the south-west, where the wood's fringe takes over (the wood wins within 95 m of (−210, 130)). Centre about (−79, 166), bearing 205°.
- **The new shore** (Austin: "make the lake not perfectly circular"): a south bay centred (−95, 185) that reaches z 200 beside the old Span's hollow, so the Great Span's fallen slabs can lie in its shallows; and a shingle spit from (−42, 152) running 28 m west-north-west to (−68, 142). `WATER.tarn` grows to r 92 to cover the bay, and the terrain holds the old shore everywhere else.
- **Moved:** the brief's arc runs from (−30, 120) round to (−70, 170), the east and south-east shore. This plan slides it 50 m round to the south shore, so it fills SW while the Saltings fill S, and so it meets the Span. The Coheirs' site (−45, 160) stays on it, at the spit's root.
- **Ground and stone:** "a beach of black flint shingle sorted by size into bands, the coarse up top and the fine at the water".
- **Flora:** "horsetails and bogbean in the shallows and quillwort under the surface".
- **Air:** "Midges stand in columns over the margin"; no Tincture in the brief.
- **Sound:** "water laps though there is no wind".
- **Creature:** "small grey sandpipers that run in and out in exact step with a tide the tarn has … a hand's breadth up and down every few minutes"; on the margin round (−80, 180).
- **Boundary:** "the change from grass to shingle, abrupt as a carpet's edge". Where it meets the Saltings, near (−38, 178), the Strandline wins within 20 m of the water.

### BW The Adust: `src/v4/regions/adust.js`, W

- **Shape:** polygon (−255, −70), (−290, −72), (−297, 40), (−252, 40); centre about (−273, −15). This is the brief's site, from (−275, −60) to (−270, 50), stopped at z 40 so the wood keeps its fringe.
- **Absorbs:** the floor under the sun's saddle, north of the wood. The new causeway runs through it from south to north.
- **Ground:** "clay cracked into hexagons, small drifts of red sand".
- **Stone:** "sandstone pavements varnished black on the sun side".
- **Flora:** "plants that are only rosettes and cushions, everything leaning a little east as if from heat".
- **Air:** "dust lit red"; Tincture "red dust".
- **Sound:** "stones tick as they expand".
- **Creature:** "beetles that stand on their heads facing the sun, rows of them on each pavement, and step down all at once when it gutters"; on the pavements round (−275, −10).
- **Boundary:** "colour: the moor's green fails over a few metres into ochre and rust, with a last line of dead heather".

## 3. The Great Span (W)

- **Line:** straight along z = 215, from the west abutment (−257, 215) to the east abutment (257, 215). Both abutments sit 48 m into the wall: at z 215 the floor ends at x ±209. Deck top at y 56, 52–60 m above the floor below, which lies between y −4.6 and +4.
- **Piers** (centres; 12–18 m thick): x −211, −166, −120, −70, −22, 25, 70, 115, 176, 222. None stands within 14 m of the river's thread (the canyon crosses z 215 at x 134–158), on the Bather's rim viewpoint (165, 215) or in the pit. The 61 m bay from 115 to 176 is the one wider than the brief's 45–60 m, because the canyon allows no pier.
- **Collapsed bays** (the deck is gone): −120 to −70, over the old Span's hollow, where the biggest fall came down and its slabs lie across the hollow and the tarn's new south bay; 25 to 70, over the fen's south reach, slabs half-sunk in the fen; 115 to 176, over the canyon mouth, looking 55 m down into the river (its slabs lie on the canyon's north rim, not in the water). **The narrow jumpable gap** is at x −45, a crack in the deck between piers −70 and −22.
- **Stairs:** the west stair rises out of the wood's southern fringe at (−205, 200) and climbs the wall in switchbacks to a landing on the deck at (−245, 212), beside the west gate. The east stair's foot is at (225, 165), just east of the Saltings' lobe; it climbs south-east to a landing at (245, 212), beside the east gate.
- **Gates:** the west gate at (−257, 215) is shut. The east gate at (257, 215) is blocked by rockfall, a few boulders lying out across the deck to x 235.
- **BG The Postern:** one, in the foot of the west gate at deck level, (−254, 212). The Frontispiece and the Ashlar Unparted were not picked, so this is the only giant work in the brief's list that remains. The Span agent builds it in v4.
- **Regions crossed, west to east:** the Deodand Wood's southern fringe (x −257 to −170); moor, the hollow and the Strandline's south bay (−170 to −30); the Saltings' tail (−30 to 15); the fen's south reach (15 to 105); the Saltings at the river's mouth (105 to 134); the canyon (134 to 158); the Bather's rim and moor to the east stair (158 to 230).
- **Marked blocks of `terrain.js`:** west stair and gate x −270 to −195, z 180 to 245; east stair and gate x 220 to 270, z 160 to 245; the hollow keeps its shape.
- **Key:** `bridge` stays, recentred to (0, 215), r 270.

## 4. The map structure

The causeway is the spine; the leads hang off it. Paths are worn tracks in the region's own cover; rivulets run only downhill (south and west, with the tilt), so they lead toward the tarn, the fen and the court.

### The causeway's new route (replaces `CAUSEWAY`)

| # | Point | What |
|---|---|---|
| 0 | (−344, 126) | start, between the feet of the two colossi (AM), r 366 on the saddle floor |
| 1 | (−302, 106) | the saddle's foot, r 320 |
| 2 | (−286, 60) | past the wood's western fringe (105 m from its centre) |
| 3 | (−272, 0) | through the Adust, between the Taker of Altitudes and the sun |
| 4 | (−262, −60) | the Adust's north edge |
| 5 | (−254, −108) | under the Armiger's Tower's south face |
| 6–11 | (−222, −110), (−185, −72), (−140, −30), (−90, 2), (−40, 22), (8, 30) | the existing road: across the Lynchets, past the Stones, the Carillon Flags, the Slipper, to the keep's gate |
| 12 | (0, 5) | north along the keep's west foot |
| 13–15 | (12, −18), (45, −22), (80, −8) | round the back of the keep, through the Demesne (the moles 9 m off) |
| 16–17 | (98, 25), (122, 55) | east and out across the ha-ha at (120, 52) |
| 18 | (148, 95) | 37 m south-west of the Arcature |
| 19–20 | (172, 135), (192, 168) | onto the Saltings' east lobe, paving half-sunk in the crust |
| 21 | (200, 185) | **the pit** (name [Proposed]), r 14, "with a fractal, ragged edge that has swallowed the end of the road" |

The road runs north from the saddle, not east (see section 6). The pit is 30 m north of the Span's axis and 73 m from the pool; its marked block is x 182 to 218, z 167 to 203. Its lip faces south-west to the taller fall, whose widened mist column is tuned to drift across it. The wear mask and the pit's cut are the map-structure agent's marked blocks. Key: `pit`.

### Leads (paths P, rivulets R, kerbs K)

| Edge | From → to | Kind and material |
|---|---|---|
| P1 | spawn (6, 36) → the Sward (−45, 45) | sheep-track, Demesne turf to moor |
| P2 | causeway (−90, 2) → tarn north shallows (−100, 58) → Byre (−148, 64) | worn path, moor; ends at the Scriveners' shallows |
| P3 | Shrine (−108, −128) → Stones (−170, −50) | sheep-track along the Lynchets' east wall (the Thurifer's track), drystone footings |
| P4 | Shrine → Lynchets' east wall (−165, −105) | gap in a wall, Lynchets field-stone (the Link-Boy's post) |
| P5 | Shrine → Sunken Court (−40, −165) | worn path, moor |
| P6 | Court → Kept Fire (10, −190) → Lattice (40, −265) | gravel trod across the Outwash's channels |
| P7 | Outwash east end (100, −195) → Plinth Road foot (130, −150) → Medlar Close | gap in the blackthorn, Bletting grass |
| P8 | Medlar Close → Leaning Yard → Hypogeum → Gradine foot (282, −172) | orchard track, honey-stone wall gaps |
| P9 | causeway (80, −8) → Pomegranate House (95, −45) → Medlar Close | worn path, Demesne turf then Bletting grass |
| K1 | Pomegranate House (110, −25) → Arcature (145, 35) | old kerb (the Leerie's row) |
| P10 | Hypogeum → scarp climb (233, −60) → the brow (238, −30) and the tallest tor (268, −80) | heather track with clitter |
| P11 | High Ling south (250, 5) → Foundered Nave (255, 40) → Arcature (160, 60) | sheep-track, heather to moor |
| P12 | pit (200, 185) → east stair foot (225, 165) | worn crust |
| P13 | pit → Bather's rim (165, 215) → canyon's right-bank rim → the Speculum | rim path, shingle |
| P14 | river mouth (125, 205) → Sexton's graves (55, 272) → Menology (−15, 255) | gap in the grey reeds, then salt crust along the fen's south rim |
| P15 | Menology → old Span hollow (−95, 215) → Coheirs (−45, 160) | worn path, moor to shingle |
| P16 | Strandline (−122, 172) → west stair foot (−205, 200) | track through the wood's southern fringe |
| P17 | Sward → tarn's east shore → the spit (−42, 152) | sheep-track, crossing the Surveyor's Pegs |
| R1 | glacier snout (40, −220) → braided channels → Sunken Court (−40, −165) | meltwater rivulet, Outwash gravel |
| R2 | scarp foot (232, −20) → Arcature → Saltings lobe (180, 140) → fen | runnel, heather to moor to red glasswort |
| R3 | Medlar Close → the ha-ha's ditch at (100, −20) → keep's south foot → fen north rim (70, 85) | runnel, Bletting grass to the Demesne's ditch |
| R4 | Lynchets (−182, −78) → Stones' shelf → Byre → tarn north-west shore (−130, 75) | runnel, field-stone then moor |
| R5 | Carillon Flags (−65, 12) → tarn north-east shore (−50, 70) | runnel, moor |

The Adust gets no rivulet ("dry"); the Link-Boy (v7) walks P1–P17.

### The taller Tumbling Water

The lip rises from y 23.5 (a 20 m drop) to y 53.5 (a 50 m drop, 2.5 times), still above the pool at (214, 266). The pool stays at (208, 258), y 3.5. Today the wall there is only about 15 m high (the pool lies at r 331), so BI's mountain rework must raise the wall face behind the pool to 65 m or more within 15 m of the lip. The gully above is regraded. The mist column and spray widen 2.5 times, and the rumble's radius doubles. Marked block: x 195 to 235, z 248 to 290. Target sightlines: the Span's deck, the High Ling's brow (238, −30), and the causeway at (−40, 22) over the fen. Spawn's view of the fall is blocked by the keep (see section 6).

### The Tinctures (DI) and the gutter

The regions kit carries each region's air hue (listed in section 2), blended over 20–30 m, at the same luminance: "subtle regional variation in light, nothing extreme". The Demesne and the Strandline have no hue in the brief, so they stay neutral for now. The gutter in `sky.js` goes from 6.5–9 s every 70–150 s to 12–16 s, about 8 s of it at the floor, every 60–110 s; no site.

### Terrain set-dressing in v4

| Item | Site | Reserve | Note |
|---|---|---|---|
| DG The Long Figure | (292, 70), on the east wall's lowest slope, facing the sun | 80 m figure, a 45 m radius on the wall face | above the Foundered Nave; "seen best from the Span's deck and from the keep" |
| DC The Discontinued Track | (170, 150) east to (215, 160) | 2 m strip | "from the reed margin toward the middle" of the Saltings' lobe; it crosses the causeway at about (180, 152) |
| DH The Surveyor's Pegs | x = −80, from (−80, −285) to (−80, 285); brass caps at z −200, −100, 0, 100, 200 | 1 m strip | crosses the court's west rim, the causeway at (−80, 6), the tarn (in at z 51, out at about z 195), the Strandline, and passes under the Span beside pier −70, through the hollow |

## 5. Reserved sites

**Ages** (the v4 brief asks each landmark to name its age and idea): keep, "an almost Star Wars Old Republic monumentality (vast plain planes, deep-set openings, a few enormous details)"; the Armiger's Tower, "slender and fluted like a modern spire"; the Span, "cyclopean engineering"; the Pomegranate House, "arabesque"; the Sunken Court, "piers from an older, heavier age again". The other wonders' ages are for their agents to propose, one line each, and for Austin to judge.

### v5, the built

| Item | Key | Site | Reserve | Region | Why there |
|---|---|---|---|---|---|
| AK The Annals | `annals` | a band 110–130 m up round the whole wall; clearest on bearings 60–120° (the east wall, facing the sun) | the band | walls | "clearest on the east wall, which faces the sun"; the Gradine and the colossi break it |
| AL The Galleries of Durance | `galleries` | (−390, −80), 60–260 m up | r 70 | W wall | "north of the sun's saddle … above and behind the Armiger's Tower"; black against the glow from the causeway |
| AM The Acephalous Thrones | `thrones` | (−420, 100) and (−400, 200), crawling, on the saddle's flanks at bearings 257° and 243° | r 80 each | W wall | BI widens the saddle to ±8° (242–258° full) and leaves these two flank masses; the causeway starts between their feet |
| AO The Escarpment Lamps | `lamps` | NW wall face at bearings 300–335°, r 420–470, 60–250 m up, about (−300, −330) | the face | NW wall | "the part the sun never reaches"; read from the east half of the floor |
| AP The Battlemented Ridge | `ridge` | NE crest at bearings 20–45°, r ≈ 470 | the crest | NE wall | "between the Lattice's and the Gradine's lines of sight", a dull stretch; clear of the Vigilant (72°) |
| AQ The Cincture | — | sky arc from bearing 140° at the horizon, highest (about 55°) near bearing 70°, down to bearing 350° | sky | sky | "from the south-east horizon to the north … arching over the Lattice"; the agent checks it against the sky lattices at 30° and 92° and the Vigilant |
| AR The Occultation | — | a band about 400 m long sweeping west to east about 200 m up, from the saddle to the east wall | none on the floor | all | "through the air and across the walls, a weather event"; it passes over the Span's deck |
| AW The Plinth Road | `plinths` | paired plinths from (130, −150) to (165, −290) | corridor 30 m | NE, Bletting's north edge | the Bletting's northern bound; ends at the wall's foot facing rock. The rebuilt glacier keeps its east margin west of x 120 north of z −200 |
| BA The Hawser | `hawser` | from (−120, −380) high on the north wall down to the Sunken Court (−40, −165) | corridor 20 m | N | crosses the Outwash's west edge at about (−53, −200) and the peg line high up at (−80, −272) |
| BD The Foundered Nave | `nave` | (255, 40) | r 25; block x 230–280, z 15–65 | E (moor) | "between the Arcature and the east wall", clear of the High Ling's edge (z 10) |
| Carcanet Keep, recast | `castle` | (40, 30) | r 42, the fallen fan on bearings 30–60° to r 80 | centre | the fan is the Demesne's scattered blocks; a 30 m needle |
| The Armiger's Tower, recast | `tower` | (−250, −135) | r 24 | NW | the causeway passes its south face |
| The Sunken Court, recast | `court` | (−40, −165) | r 40 | N | 2–3 uprights at 35 m; the Hawser enters its paving |
| The Arcature, recast | `arcature` | (160, 60) | r 22 | E | 40 m, "its outermost arches breaking the skyline from the causeway" |
| The Lattice's mother crystal | `moraine` | (40, −265) | r 50 (the Lattice's own core) | N | 60 m, "at the moraine's heart" |
| The Gradine, extended | `gradine` | from (282, −172) up the wall | r 14 at the foot | NE | "climbs out of sight into the haze", through the Annals' band |
| Local light: bioluminescent moss in a hollow | `lightMoss` | (−205, 140) | r 8 | the Deodand Wood | the brief's darkest place |
| Local light: embers | `lightEmbers` | under the Arcature (160, 60) | r 6 | E | the brief's other dark place |
| Local light: a guttering lamp on a post | `lightPost` | (−140, −30), where P3 meets the causeway | r 3 | W, moor | a light on the walk |
| Local light: a lit doorway | `lightDoor` | the Armiger's Tower's foot, (−250, −120) | r 4 | NW | seen from the causeway's west leg |
| The Leerie's twelve lamp-standards | `leerie` | (110, −25) to (145, 35) along K1 | corridor 6 m | NE / E | from the Pomegranate House toward the Arcature; on v4's light kit |
| DN The Kept Fire | `keptFire` | (10, −190) | r 6 | Outwash | "the only warm light in the cold quarter"; on P6 |
| CY The Collation | `collation` | (150, −70) | r 10 | Bletting | "in a clearing inside Medlar Close" |
| DE The Slipper | — | (−20, 26), on the causeway | r 1 | centre | "on the first walk out" |
| DF The Unfinished Prospect (time-boxed) | `prospect` | (238, −30), facing west | r 4 | High Ling | "the brow of the High Ling looking west over the whole bowl" |

Coherence agent viewpoints: spawn (6, 36); the causeway at (−65, 12); the Span's deck at (−200, 215, y 56); the tarn's shore on the spit at (−55, 148).

### v7, the living

| Item | Site | Reserve | Region | Why there |
|---|---|---|---|---|
| BY The Taker of Altitudes | (−255, 10), facing the sun | r 4 | Adust | "on a red pavement of the Adust". The causeway runs between him and the sun, so road walkers make him lower the staff |
| BZ The Coheirs | (−45, 160) | r 6 | Strandline | "sitting on the shingle with a net", at the spit's root |
| CB The Long Sleeper | (180, −40) | r 6 | Bletting | "under a single old medlar outside the close" |
| CD The Little Thurifer | P3, from the shrine (−108, −128) to the stones (−170, −50) | track | NW / W | "walking a sheep-track between the Wayside Shrine and the Cardinal Stones" |
| CE The Bather | pool (158, 228); rim viewpoint (165, 215) | r 10 pool, r 4 rim | canyon | "seen only from the canyon's rim"; the Span's collapsed canyon bay leaves open sky above the rim |
| CF The Sexton of No One | (55, 272), graves over x 40–70, z 264–284 | r 18 | S moor | "south of the Great Span", 8 m clear of the Saltings' strip |
| CG The Leerie | walks the standards (110, −25) ↔ (145, 35) | corridor | NE / E | as briefed, turning back at each gutter's end |
| CI The Stylite | (268, −80), on the High Ling's tallest tor | r 8 | High Ling | "the High Ling's highest tor"; v4 puts that tor here |
| CL The Accrescent | (60, −180), facing south; glassy trail from (40, −265) | r 3, trail corridor 3 m | Outwash | "a line you can follow back to the Lattice"; "his eyes are on the keep" |
| CM The Indistinct | the ha-ha's ditch, NE arc from (40, −55) to (125, 30) | the ditch | Demesne | "along the ha-ha's ditch, north and east of the keep" |
| CO The Repetend | the Lynchets' east wall, about (−170, −97) | the wall-tops | Lynchets | moved with the Lynchets from (−110, −5) |
| CP The Scriveners | (−100, 58) | r 8 | tarn north shallows | as briefed |
| CQ The Simulacrum (time-boxed) | (20, −205) | r 5 | Outwash | "over the Outwash's meltwater pools" |
| CT The Tesserine Moles | (75, 0) | r 12 | Demesne | "on the Demesne's old lawn", 9 m from the causeway |
| CX The Toadstone | (180, 230) | r 2 | canyon | "a wet ledge of the Clough", the canyon's west wall |
| Glyph motif | the Hypogeum's door (226, −112); a tessera at (75, 0); the brass peg caps on x = −80; the erratic at (75, −200) | — | several | Austin: "integrate the glyphs in a few other subtle places" |
| DM The Link-Boy | waits at the Lynchets' east wall (−165, −105); walks P1–P17 | — | NW, then everywhere | moved with the Lynchets from (−80, 0); one real point light |
| DP The Luminous Reach | the river from the Speculum (208, 258) to the mouth (134, 211) and into the fen | the river | SE | "a thread from the fall to the fen", through the Saltings at the mouth |

## 6. Conflicts and open questions (for MORNING.md)

**Questions for Austin:**

1. **Which way do the colossi crawl?** Toward the sun, with their soles to the bowl and the road starting between their feet, or into the bowl? This plan assumes toward the sun.
2. **Is the saddle floor walkable** out to the road's start at r 366? Today the walk ends near r 300.
3. **The Hawser's anchor:** the brief hangs it from the Frontispiece's highest doorway, but the Frontispiece (AI) was not picked. Should it anchor in bare rock at (−120, −380), or somewhere else?
4. **The Span's middle is unreachable:** with impassable collapses at −120/−70 and 25/70 (and 115/176), the deck between x −70 and 115 cannot be reached from either stair. Is that acceptable, seen only from the end sections, or should the fall over the hollow leave a climbable rubble slope?
5. **One Postern or two?** The brief says "one or two", but only the west gate is left among the works it names. Is one enough?
6. **Tinctures for the Demesne and the Strandline:** the brief gives no hue for either. Leave them neutral?
7. **The keep blocks spawn's view to the east:** from spawn, the line to the Arcature passes 11 m from the keep's centre, and the line to the fall passes 29 m from it. "From spawn … the Arcature's top" needs the recast keep to stay low on bearing 80° from the gate, or the sightline moves to the causeway at (−40, 22).

**Decisions taken here (reversible):**

8. The Lynchets move to NW and lose "the Byre's farmland … stepped down toward the tarn"; the Byre stands alone at the wood's edge.
9. The Strandline slides from the tarn's east shore to its south shore; the Saltings become a strip covering SE and S.
10. The Saltings leave the brief's "under the east end of the Great Span": the east end is now the pit and the east stair.
11. The Outwash takes the Lattice's crystal ground beyond 50 m of (40, −265) (today it reaches 110 m).
12. The tarn's south bay reaches z 200, and `WATER.tarn` grows to r 92, so that the Span passes "over the tarn's south shore" (today the shore stops at z 170, 45 m short).
13. The Surveyor's Pegs keep x = −80 and no longer pass "through the Lynchets' walls".
14. The Plinth Road ends at the wall's foot, because the Fosse (BF) it was to meet was not picked.
15. The Demesne's "fallen curtain tower" and the v5 keep recast's "fan of blocks" are one fall, on bearings 30–60°.

**Contradictions in the briefs:**

16. v4 says the causeway "comes down and east" from the colossi to the Armiger's Tower, but the tower (−250, −135) lies 250 m north of the saddle (bearing 250°); the road runs north.
17. The run lists the v5 wonders without BG, although v4's picks include it; BG is placed in v4 with the Span.
18. MORNING.md calls this file `wilderness-v5-placement.md`; the run calls it `wilderness-v4-placement.md`.
19. `?bench=1` walks `CAUSEWAY` from index 0 (`perf.js`). The new polyline starts at the saddle, so the bench path changes unless perf.js pins the old vertices; the systems agent pins them so that bench numbers stay comparable with v3.

**Answers taken overnight by the orchestrator (2026-11-08, logged in MORNING.md; Austin can reverse any of them):**

1. The colossi crawl **toward the sun**, soles to the bowl; the road starts between their feet.
2. **Yes**: the systems agent extends the walkable floor in a wedge through the saddle only, out to the road's start at r 366.
3. The Hawser anchors **in bare rock** high on the north wall at (−120, −380), the brief's height; if the Frontispiece (AI) is ever picked it is built around that anchor.
4. **Acceptable**: the Span's middle is seen from the end sections, not walked. No rubble slope (the brief has none).
5. **One Postern**, at the foot of the Span's sealed west gate, built by the Great Span agent.
6. The Demesne and the Strandline get **no Tincture**; their air stays neutral, as the brief leaves it.
7. The Arcature's-top sightline moves **to the causeway at (−40, 22)**, 30 m from spawn, so the keep recast is not constrained; spawn keeps its view west to the sun.

Of the contradictions: the road follows the geometry (north from the saddle, then east); BG ships in v4 with the Span; MORNING.md's name for this file is corrected; the Plinth Road ends at the wall's foot; `perf.js` pins the old causeway vertices for the bench.

## 7. Sector check

| Sector | v4 (the land) | v5 (the built) | v7 (the living) |
|---|---|---|---|
| Centre | Demesne (ha-ha, parterres, fallen fan); causeway round the keep; peafowl | keep recast; the Slipper | the Indistinct; the moles |
| N | Outwash; glacier rebuilt; R1; P6; grouse | the Lattice's mother crystal; court recast; the Hawser; the Kept Fire | the Accrescent; the Simulacrum; the glyph erratic |
| NE | Bletting; P7–P9; snails | the Plinth Road; the Battlemented Ridge; the Gradine extended; the Collation; the Leerie's standards (west half) | the Long Sleeper; the Leerie |
| E | High Ling (scarp, tors); P10–P11; R2; the Long Figure; stonechats | the Foundered Nave; Arcature recast; embers; the Annals clearest; the Prospect | the Stylite |
| SE | Saltings' lobe and mouth; the pit; causeway's end; the taller fall; Span east stair and blocked gate; the Discontinued Track; crabs | — (the Cincture rises here) | the Bather; the Toadstone; the Luminous Reach |
| S | Saltings along the fen's south rim; Span's middle and collapsed bays; P14 | — | the Sexton of No One |
| SW | Strandline, the tarn's new shore, bay and spit; Span west stair, shut gate and Postern; sandpipers | moss light in the wood | the Coheirs; the Scriveners |
| W | Adust; causeway from the saddle; the wider saddle; the Pegs' line; beetles | the Thrones; the Galleries; the post lamp | the Taker of Altitudes; the Thurifer (south end) |
| NW | Lynchets; causeway across them; P3–P4; R4; stoats | tower recast; lit doorway; the Escarpment Lamps | the Repetend; the Link-Boy's post; the Thurifer (north end) |

SE and S get nothing new on the floor in v5; the v5 work there is the Cincture's rise and the Annals' band on the walls. Every sector has a region in v4 and life in v7.
