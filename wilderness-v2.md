# Wilderness v2 brief

Austin's picks from `IDEAS.md` (2026-11-07), with his notes, queued for after the v1 modules land and have been looked at together. Letters refer to `IDEAS.md`. Anything not listed here is dropped. Names stay **[Proposed]**.

## New terrain feature first

A **waterfall and river**: a fall from the boundary mountains that runs swift through canyoned ground, then slows and spreads into the fen. Several picks live along it. This needs a terrain change (a river channel carved in `terrain.js`, a canyon section, the fall itself) and a water module extension (flowing water, foam, the fall), so it goes first.

- **The pool at the fall's foot (T. The Speculum):** a small, lovely pool whose reflection shows the sky as it was (a small yellow-white sun, a blue horizon) and does not show you. Not the tarn.
- **The Salt-Pedlars (G):** finger-high riders on dragonflies, along the river and over the slow water, hovering at a polite distance, leaving glints of white where they pause.
- **The Wrong Colour (V):** in one of the river's pools, not the fen: a light of unsettleable hue with its own colour and light source so it is clearly visible, the reeds around it grey.

## Flora

- **A. Heliotrope Sward**, as snowdrops: pale nodding flowers on a slope, all facing the sun, closing together with a rustle when it gutters. Plus the B element: when the player is very close they turn toward the player and whimper.

## Inhabitants

- **E. The Vigilant:** a crouched hill-sized shape on the boundary mountains, its head turned a few degrees differently each time you look back. No notes.
- **H. The Wimpled Guest:** the cowled woman by the taverna's well, her wimple stirring; gaze long and a heartbeat rises while the screen edges flush red and drowsy. No notes.
- **I. The Sable Galley:** a sailless black galley crossing the tarn with a muffled drum. Unmanned (no rowers, no oars to animate) to keep it simple.

## Ruins

- **L. The Hypogeum:** a sunken tomb with a bronze door and a lintel of glyphs that shift one place along each time the sun gutters.
- **N. The Gradine:** steps cut up the mountain wall into haze, each riser worn to a rounded hollow in the middle by centuries of footfall (like the Leaning Tower's stairs). The first step starts above the player's head.
- **Q. The Cutting:** a slumped bank showing strata of dressed stone, black glass, corroded lattice, stone again. No carved hand; the strata alone.
- **AB. The Menology:** thirty-six low menhirs in a spiral, one per month of a run, somewhere the region is not already busy. With life: small lizards skittering among the stones. Carved signs, if any, are Austin's to design.
- **Z. The Carillon Flags:** a few bronze-capped flagstones close together on one stretch of the causeway, not the whole road, each ringing a different note underfoot.

## Sky

- **R. The Parhelion City:** a city of spires on the western horizon against the sun, very dim and translucent at all times, solid while the sun gutters.

## Carried over from v1

- **Walkable bridge deck.** The Trigon Span's deck (y 15.5 from (-60,200) to (-130,230), gap between (-90.8,213.2) and (-100.6,217.4)) is visual only: the controls take height from the terrain alone. Add a walkable-surface hook in `controls.js` (`ctx.addWalkable(fn)` returning a floor height or null) and build rubble ramps up both abutments in `structures/bridge.js` so the deck can be reached and the gap looked down into.

## Order of work

1. **Landscape and water first**, one agent, serially: carve the river channel and canyon, the fall, and the pool in `terrain.js`; extend `water.js` with flowing water, foam and the fall; re-run the walk test. Everything else depends on where the river ends up.
2. **Then a placement plan**, before any agent is briefed: with the river in place, the orchestrator assigns every v2 item a site on the map (centre, radius, which existing landmarks and the river it sits near), writes them into `LANDMARKS` in `world.js` with [Proposed] names, renders a top-down or a few overview shots to check nothing crowds anything else, and shows Austin the plan. Each parallel brief then quotes its item's site and radius and says what sits next door, so agents place inside their footprint and avoid each other's.
3. **Then the rest in parallel**, one subagent each, against the updated map and the placement plan: R + E (sky and far silhouette), A (flora), N + Q + L + Z (ruins and causeway), H + I + AB (inhabitants and the menology), G + V (river life and the wrong colour), with the audio hooks each needs listed in their briefs.

Austin's note on process: let the v1 subagents finish, look at the whole, then pick this up, so it doesn't get insanely complex.

## Amendments after Austin walked v1 (2026-11-07)

1. **Creatures tie to visible points of interest.** Every inhabitant, old or new, lives at or patrols between named landmarks, so meeting one tells you where you are. Nothing roams featureless ground. The placement plan assigns each creature its landmark.
2. **More life overall.** A notch more creatures and small life everywhere, not a crowd. The biomesh in particular: more chips, and the spread must be visible while you watch: colonies send out visible runners and new tiles appear at the edge every few seconds, not centimetres per minute.
3. **Walking is a hair too slow, above all on phone.** Raise the walk and hurry speeds. Touch controls become a virtual thumbstick drawn at the bottom of the screen (drag anywhere in its zone, stick follows the thumb) with look from a touch anywhere else on the screen.
4. **Debug teleport.** A debug mode (URL `?debug=1`, and a key on desktop, a small corner button on phone) that lists every landmark and teleports the player to it, facing its centre. Also shows position and frame rate.
5. **A bit more in the sky.** Not a lot more. R (the Parhelion City) and E (the Vigilant) plus two or three further small sky events, in the same restrained register as v1.

### Revised order of work

Stage A, in parallel now, no placement conflicts between them:
- **Landscape and water** (`terrain.js`, `water.js`, `structures/bridge.js`): river, canyon, fall, pool; bridge ramps and walkable deck registration through `ctx.addWalkable?.()`.
- **Controls and debug** (`controls.js`, `hud.js`, `index.html`): speeds, thumbstick, `ctx.addWalkable(fn)` hook, debug teleport.
- **Sky** (`skylife/`, `sky.js`): R, E, and the small extra events.

Stage B: the placement plan (every v2 item and every creature gets a landmark), shown to Austin.

Stage C, in parallel against the plan: A (flora), N + Q + L + Z (ruins and causeway), H + I + AB (inhabitants and the menology), G + V (river life and the wrong colour), plus a "more life" pass that ties v1 creatures to landmarks and makes the biomesh spread visibly.

## Stage D: the scale pass (Austin, after walking v2 stage A)

"I love the crumbling causeway but wish it was HUGE: the width of the valley, from one side of the mountain bowl to the other, with stairs up either side. In general I'm digging the vibe but I'm not always getting the woah, epic, awe-inspiring ancient wonders thing."

One Opus agent, after the ruins agent hands back (it owns `src/structures/**` until then). Owns `src/structures/bridge.js` (rewritten), new files under `src/structures/`, and may scale existing structures in place.

### W. The Great Span (replaces the Trigon Span)

- A single straight span across the south of the bowl at z ≈ 215, from the west wall near (−257, 215) to the east wall near (257, 215): about 515 m, over the tarn's south shore, over the old Span's hollow, over the fen's southern reaches and the river's mouth. The deck rides 50–60 m above the valley floor on piers 12–18 m thick every 45–60 m, with pointed or parabolic arches between them, the whole thing etched with the recursive triangular spirals at a scale readable from spawn, 250 m away.
- **Stairs up either side.** At each abutment a monumental stair climbs the mountainside from the valley floor to the deck: 50+ m of rise, switchbacks or a straight flight with landings, treads worn like the Gradine's, a few landings collapsed so you step across rubble. The first flight begins at ground level so it can be climbed; the deck is walkable end to end through `ctx.addWalkable`, parapets collide, and there are three or four **collapsed bays** where the deck is gone: look down 55 m into the water or the moor. The gaps are wide enough that a running hop (Space) cannot clear most of them; one narrow gap can be jumped, to reward nerve.
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
