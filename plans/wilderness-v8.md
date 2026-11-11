# Wilderness v8: one world

Austin, 2026-11-11 (issue #1, "Milestone 8: Consistency, Coherence, and Conscious Contrast"): "Right now, the world has lots of individually cool things, but they all feel very disconnected. So the goal this time is to create more of a sense of layered, textured, inter-related depth: architectural cues that reoccur; paths and routes thru the landscape that lead you naturally to the cool things we've made; contrast, too: almost all areas of the world have similar dark palette, similarly dense vegetation, similarly somber tone (no cuteness or humor to give the dark things punch); characters who seem connected, or at least that come from the same culture; stories that start one place and end another: a joke-y example would be a cloak and rucksack on the tall bridge, a splayed body below. [...] So the goal after this release is a textured, deep, inter-related world."

v8 adds few new places. It decides who built this country, in what order, and how each people used what the last one left, and makes everything already here say so. Diversity stays; the relationships are what is new.

Austin, 2026-11-11, in session: "feel free (be encouraged!) to add new things and move things around and tweak them." So a brief may move a place to where a road or a story wants it, rebuild one that is off its stratum's hand, and add new places and figures where the map has a gap. The statement "adds few new places" above is a starting point, not a limit. Briefs and the dispatch plan: `briefs/v8/index.md`. The walk that opened it (24 views from the spawn outward and the map) is in `shots/wip/m8-walk-*.png`, `m8-map-00-base.png`.

## Status

**Opened 2026-11-11, 14:10 PST**, on `next` (equal to `main` at `b941334` when opened). The orchestrator read issue #1, walked the map in 24 renders at medium and agreed with every word of it: from any stand point the frame is violet-dark with knee-high grass to the horizon; the leads P1–P17 are short, faint and joined to nothing; the Pomegranate House is plain boxes and a cylinder beside the keep's coursed stone; nine figures in nine costumes; three story props (the Slipper, the Collation, the Prospect) that end where they start. Two read-only audits (architecture and figures; paths, density and palette) are feeding the briefs. The gate was run on `next` before any v8 work as the baseline (its result is in the next entry).

## What a visitor should notice

- **Three hands, one country.** Austin, 2026-11-11, in session: "careful about one culture btw: the goal is still diversity, but with coherence. i like that the architecture today has both cyclopean bridges and arabesque tavernas." So the differences stay and are sharpened into three **strata** [Proposed names], each with its own hand, and the coherence is in how each treats the one before it:
  - **the Elder work** (cyclopean, not built for human feet: the Span, the Plinth Road, the Thrones, the Hawser, the Annals). Huge, plain, triangular, unexplained.
  - **the Heliarchy** (coursed stone, round arches, bronze: the keep, the tower, the Sunken Court, the Arcature, the Hypogeum, the Gradine, the causeway, the lamps). A civil order that tended the failing sun and built on and out of the Elder work.
  - **the Late folk** (arabesque, plaster, tile, coloured glass, timber and cloth: the Pomegranate House, the orchard walls, the byre, the Lynchets). The people still here, living small and cheerfully in the ruins of both.
- **Each stratum uses the last.** Later builders reuse earlier stone (a cyclopean block as a tavern's corner, a Heliarch column drum as a gatepost, a bronze door as a table), build against it and misread it. A visitor who sees a triangle-etched block in a plaster wall has been told a history without a word.
- **One sign, in three hands.** The first view is the sun sinking into the saddle between two peaks: a disc in a notch. The Elder work has it as a bare giant notch; the Heliarchy carved it as a formal roundel over doors and on waystones; the Late folk paint it, tile it, sew it and get it slightly wrong. Same sign, never the same rendering.
- **The living belong to somebody.** The figures already here sort into two liveries rather than one: the Heliarchy's last officers, each still doing one duty of the light (the Leerie, the Thurifer, the Link-Boy, the Taker of Altitudes, the Stylite, the Sexton), in ember stoles and the formal sign; and the Late folk (the Coheirs, the Salt-Pedlars, the Wimpled Guest, the house's people), in patched colour. The two visibly deal with each other.
- **Roads that go somewhere.** From the spawn a visitor can see where to walk. Worn tracks, pale against the turf, run from the causeway to every named place and join each other, and along them stand **gnomons**: leaning waystones with the sign on top, each in sight of the last, throwing long shadows away from the sun.
- **Places that differ.** Cropped pale turf where the grazers keep it; bare red clay; white salt; rank orchard grass over the head; the wood dark. And one place that is warm, lit and silly: the Pomegranate House, hung with coloured lamps, with music and somebody laughing inside.
- **Something small and funny.** Twk-men [Vance's own]: thumb-high riders on dragonflies who come to look at you at the waystones and squabble over spilt salt.
- **Stories with two ends.** Things found in one place that are answered in another, along the roads that join them (the threads are listed in `briefs/v8/index.md`): the traveller who left his cloak and pack on the Span; the twelfth chair missing from the Collation; the slipper's mate; the gold picked out of the Sunken Court's floor.

## Places (v8-02)

Each place's ground, cover and light, as built (`src/v8/places.js` holds the same table; light is exposure, saturation, contrast, warmth, applied at the camera and blended over 25 m):

| place | ground | cover | light |
|---|---|---|---|
| the common (round the keep, along the causeway to the stones) | pale sage turf `#7c8a56`-`#969a68`, bare trodden earth `#7c6a52` | ankle turf, rare tussocks, bare patches | 1.12, 1.0, 1.0, 0 |
| the far moor | dun-olive and peat (as v7) | knee grass in drifts with bare gaps | 1.0, 1.0, 1.0, 0 |
| the Bletting | rank green `#4c6a2a` | grass to the head in patches, the most flowers | 1.1, 1.3, 1.04, +0.05 |
| round the Pomegranate House | (the Bletting's) | (the Bletting's) | 1.18, 1.38, 1.04, +0.08 |
| the High Ling | purple-brown `#54303e`-`#5e3252` | low wind-flat heather | 1.0, 1.15, 1.08, +0.02 |
| the Demesne | shaven lawn `#6f8c3a`-`#7c9444`, a crisp edge | turf a few cm high, nothing else | 1.28, 1.1, 0.94, 0 |
| the Lynchets | 7 m strips: stubble `#b4a25a`, ley `#3e6e22`, plough `#3a2014`, fallow `#82704e` | each strip its own crop | 1.06, 1.05, 1.0, +0.02 |
| the Deodand Wood | leaf litter `#3a2414`-`#1c140e` | almost none; shafts of ember light | 0.8, 0.95, 1.1, +0.1 |
| Corpse-Candle Fen | black mud `#0f110e` | tall reeds in tight stands, open water between | 0.74, 0.8, 1.12, -0.12 |
| the Adust | red clay `#94523a`-`#b05a36` | none | 1.06, 1.12, 1.06, +0.04 |
| the Saltings | white crust `#f0ebe8` | none | 1.32, 0.72, 0.92, 0 |
| the Outwash | grey-blue gravel `#6e7c8a`-`#9eaab6` | sparse ankle grass | 1.08, 0.8, 1.0, -0.05 |
| the Strandline | black flint `#0e0d11` | none | 0.9, 0.85, 1.12, -0.03 |

The survey (`tools/contrast-survey.mjs`, tables in `briefs/v8/contrast/before.md` and `after.md`) gates it in the suite.

## Done when

- A cold critic, asked what connects the places, names the sign, the roads and at least two distinct builders without being told.
- From the spawn, every landmark in `LANDMARKS` with a footprint is reachable along a visible track with a gnomon in sight at every point of it (a test walks the graph).
- At least four regions measure apart from the moor in ground brightness, hue or cover height in a survey committed with the milestone, and the Pomegranate House is the brightest, warmest frame on the map.
- Each story thread has both ends built, each end on or within 15 m of a track.
- `tools/suite.sh` green; the walk no slower on the low tier than v7.2 (`perf-test`, bench numbers in the release note).
