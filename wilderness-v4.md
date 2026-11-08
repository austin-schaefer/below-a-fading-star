# Wilderness v4: the Great Span and the scale pass

Austin, after walking v2 stage A. Runs after v3 (performance), so the biggest thing in the world is built on a renderer that can afford it.

"I love the crumbling causeway but wish it was HUGE: the width of the valley, from one side of the mountain bowl to the other, with stairs up either side. In general I'm digging the vibe but I'm not always getting the woah, epic, awe-inspiring ancient wonders thing."

One Opus agent. Owns `src/structures/bridge.js` (rewritten), new files under `src/structures/`, and may scale existing structures in place. It may edit `terrain.js` only to seat the stairs and gates in the mountain wall, in a marked block.

### W. The Great Span (replaces the Trigon Span)

- A single straight span across the south of the bowl at z ≈ 215, from the west wall near (−257, 215) to the east wall near (257, 215): about 515 m, over the tarn's south shore, over the old Span's hollow, over the fen's southern reaches and the river's mouth. The deck rides 50–60 m above the valley floor on piers 12–18 m thick every 45–60 m, with pointed or parabolic arches between them, the whole thing etched with the recursive triangular spirals at a scale readable from spawn, 250 m away.
- **Stairs up either side.** At each abutment a monumental stair climbs the mountainside from the valley floor to the deck: 50+ m of rise, switchbacks or a straight flight with landings, treads worn like the Gradine's, a few landings collapsed so you step across rubble. The first flight begins at ground level so it can be climbed; the deck is walkable end to end through `ctx.addWalkable`, parapets collide, and there are three or four **collapsed bays** where the deck is gone: look down 55 m into the water or the moor. The gaps are wide enough that a running hop (Space) cannot clear most of them; one narrow gap can be jumped, to reward nerve.
- **The gates.** At either end of the Span, where the deck meets the mountain wall, a gate of the same gigantic cyclopean scale as the rest: a portal 30–40 m tall framed in blocks the size of houses, the doors themselves slabs of bronze-bound stone etched with the triangles. The west gate's doors are simply shut, meeting flush, no handle, no gap, a sill worn by nothing. The east gate is blocked: its doors are hidden behind a fall of rock from the wall above, boulders the size of the keep's towers heaped against it, a few of them lying out across the deck. Both are dead ends you walk up to; the stairs reach the deck beside each gate, not through it. Colliders on all of it; from a distance the gates read as the Span's two dark eyes against the walls.
- **Fallen pieces** below: bay-sized slabs lying in the tarn shallows, half-sunk in the fen, one leaning against a pier, the triangles still visible on them. Rubble aprons at the pier feet. Keep the old Span's hollow as the place where the biggest fall came down.
- Visible from everywhere: silhouette against the sky from spawn, under-lit by the sun from the west end, fog-faded toward the far wall. One merged geometry per quality for the static parts, shadows on (it will throw a line of shadow across the valley; check that it looks right rather than like a bug).
- Rename or keep: the `bridge` landmark stays keyed `bridge` with its radius widened to cover the stairs; name stays [Proposed] ('The Trigon Span' or 'The Great Span').
- Budget: +8 draw calls, +250k tris at q=high (it is the biggest thing in the world), half at q=low with coarser arches.
- Remove the old rubble ramps; the river agent's deck registration and parapet colliders are replaced.

### The awe audit, same agent

The brief here is not more things but **scale contrast, long sightlines and silhouettes against the sky**. Austin judges each from renders before it lands.

- **Carcanet Keep:** the donjon one and a half times taller, one curtain tower fallen outward in a fan of blocks; a 30 m banner pole on the keep.
- **The Arcature:** nest of arches grown to cathedral height (40 m), its outermost arches breaking the skyline from the causeway.
- **The Sunken Court:** two or three columns raised to 35 m, the rest stumps, so the court reads as the floor of something vast.
- **The Lattice:** one mother crystal 60 m tall at the moraine's heart, the small ones its litter.
- **The Gradine:** check it climbs out of sight into the haze; if the ruins agent's stair stops short, extend it.
- **Sightlines:** from spawn the Great Span, the Arcature's top and the Lattice's mother crystal should all be visible; from the Span's deck, everything.
- **The sun's saddle:** widen it a few degrees so the sun sits in a gate of rock, not a notch.
- Nothing cute, nothing symmetrical for its own sake; everything looks built by people who were better than us and are gone.

Renders required at each step, before and after, from spawn, from the causeway, from the Span's deck, and from the tarn's shore.

## Austin's picks from IDEAS-v4.md (2026-11-07)

**Tone note for everything in v4:** nothing medieval. This is Vancian far future, not generic fantasy: the works are machines, instruments and civic architecture of a late age, built by people with better science than ours, not castles and chapels. Materials: dressed stone, bronze, black glass, lattice; no timber beams, no Gothic tracery, no heraldry. Letters refer to `IDEAS-v4.md`; anything not listed is dropped.

- **AK. The Annals.** Yes.
- **AL. The Galleries of Durance.** Yes, and make the whole thing active: no figures seen, but machinery turns, chains move up and down, gantries shift, animation with no visible animating force.
- **AM. The Acephalous Thrones.** Yes, but the two colossi are not seated: both are crawling on hands and knees, flanking the sun's saddle.
- **AO. The Escarpment Lamps.** Yes, multi-coloured lights, not all warm.
- **AP. The Battlemented Ridge.** Yes, placed on a stretch of wall that is currently dull; the regularity is the point.
- **AQ. The Cincture.** Yes, emphatically.
- **AR. The Occultation.** Yes, but the shadow band sweeps a couple of hundred metres up, through the air and across the walls, a weather event, not along the floor.
- **AW. The Plinth Road.** Yes, with no human feet: bird feet, pigs' hooves, reptilian feet, all emerging from robes, so it reads as a row of robed half-human figures that are gone.
- **BA. The Hawser.** Yes, emphatically.
- **BD. The Foundered Nave.** Yes, as a smaller feature, with life at the bottom: indistinct shapes swimming and splashing in water below.
- **BG. The Postern.** One or two, no more.
- **BI. The Recession of Ranges.** Yes, and treat it as a larger note: the mountains read as a first fractal mountain range. v4 reworks the walls: layered ranges in depth with fog tiers, distinct silhouettes (crests, buttresses, a few named peaks), strata and scree that follow the structure, and the carved works above sitting in that structure rather than on noise.

Plus, from before: **W. The Great Span** with its two sealed gates, and the awe audit.

### Light (Austin, 2026-11-08)

It is **too dark** in many places: can't-see dark, not atmospheric dark. Keep the variance in luminance, which Austin loves, and nothing goes crazy bright, but the floor comes up. Two parts:

- **(a) More local light on the map.** A few more areas and objects that produce their own light: the Escarpment Lamps (AO) and the galleries' machinery (AL) count, but also small things on the walk: a lit doorway, a guttering lamp on a post, embers, bioluminescent moss in a hollow, the Cincture's glow. Local, coloured, varied. Each one a reason to walk toward it. Budget them against the v3 light count (point lights are expensive; prefer emissive materials and baked glow where a real light is not needed).
- **(b) Brighter overall.** Raise the ambient and hemisphere floor, and the exposure, until the darkest places are legibly dark rather than black. Target: in the Deodand Wood and under the Arcature you can still read the ground and the nearest trunks. Tune on real renders at the five standard viewpoints and in the three darkest spots, before and after, and do not flatten the contrast: shadows stay deep next to lit ground, the sky stays the brightest thing.

This belongs to the systems agent (fog tiers, light rig, exposure) with per-wonder agents adding their own local lights from the kit.

### How v4 is staffed

1. Placement plan for the picks (orchestrator), shown to Austin.
2. One **systems agent** (Opus) first: the shared kit under `src/v4/kit/`: cyclopean masonry materials and weathering in the far-future register, a stair generator (worn treads, diminishing courses), colossal-scale helpers (measure figures, rook wheels, fog tiers), the mountain rework for BI, and the `ctx` hooks the features need. Nothing else starts until it lands.
3. **One agent per wonder**, each owning one file under `src/v4/` and one landmark, briefed with its site, its neighbours, the kit's API, its budget, the tone note and the rules of awe. Sonnet for the simple ones (AO, AP, BG), Opus for the rest; the Great Span is its own Opus agent. Batches of three or four at a time for the render load.
4. A **coherence agent** at the end renders every wonder from the same four viewpoints and flags style drift, then the audio pass.
