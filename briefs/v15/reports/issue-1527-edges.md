# v15-W3: fewer invisible walls (issue-1527-edges)

The owner (2026-11-16): "the map is too stuffed with invisible walls around pits and falls. if we're gonna have pits,
and a jump button, we should allow you to go up to edge and fall in and jump".

## The rule as built

**What is seen holds; nothing else.** A drawn rail, parapet, cheek wall or cut's side holds at its own height. Every
other drop is open. Written into `world-code` ("Floors, corridors and edges").

- **The edge-guard, no timed hold** (`src/controls.js`): a *plain walk* on the ground steered along a lip (within about
  30 degrees of its line) stops at it and slides along it, the eye leaning out. Pushed square at it (more than 30
  degrees off its line), *hurrying* (Shift, or the touch stick past 0.8 of its throw), or *in a hop*: over at once.
  `edgeDwell` (the 0.5 s press) is gone; `player.atLip` (0..1) replaces it.
- A lip is a drop of more than 1.5 m under the move, 0.6 m ahead of a walking move (a bank too steep to walk down), or
  ground too steep to stand ahead. Its line is the mean of the drops 0.35 and 0.9 m round (a jag does not turn it
  square); on a beam or a parapet's top it is the drops' axis (a walk along a 0.9 m beam slides along it).
- A walk off a ledge drops; only a hurry or a hop carries on through the air. A floor that rises like a wall (0.9 m
  within 0.3 m: the Pit's side, a replacing floor) stops a walker or a hop: nobody rides up a wall. Ground too steep
  to stand, a replacing floor's included, slides them down.
- `keep: 'up'`: a stacked floor that holds only where the floor beside is higher (a cut, a tunnel); its drops are open.
- **A long fall** (`src/v12/fall.js`), **on by default** (the settings row "A long fall costs" and `?fall=0` turn it
  off): over 12 m, the view shuts before the ground and the walker wakes lying 3.5 m back along their own trail from
  the lip they left, facing it. Chosen because with the edges open a drop must cost something to mean anything, and
  the cheap way back (seconds, not a walk from the keep) keeps a careless step from punishing. To reverse: `stored()`
  in `fall.js` and `fallNow()` in `settings.js` read `'1'` as on.
- **Traps** (`ctx.fallTraps`): a landing with no way out wakes the walker at the lip whatever the setting: the Pit's
  Nadir (night under it), the Nave's hole where no hall lies under it.

## The survey: every held edge and unseen wall, and what each does now

| Edge | Drawn there | Below | Before | Now |
|---|---|---|---|---|
| Pit rim (`v4/paths.js`) | crust, nothing standing | the Pit's floor, 26-30 m; the slabs | ring of unseen posts, 0.3 m short | open; the walk-along guard; over: the fall wakes them 3.5 m back |
| Pit's Nadir (`v14/pit.js`) | the hole's lip | night (floor -90) | ring of unseen posts | open; a trap: wakes at the lip, whatever the setting |
| Pit's slabs (`pit-stair`) | slabs, no rail | the floor, up to 28 m; the wall | held both sides | `keep: 'up'`: the wall holds, the open side drops to the floor |
| Nave rim (`v5/nave.js`) | turf, nothing standing | the water, 16 m (no floor was there: the terrain ran on over the hole) | ring of unseen posts | open; the hole's floor drawn (the water); a trap where no hall is under it |
| Noon Road, stair, landing (`coffin-road`) | carriers, planks, no rail | the water, 2.5-15 m | held | `'up'`: off into the water, which gives them back to the road |
| Nave water, the Gulf's catch | water / black | the moor's rock above | held | unchanged (their edges are all walls of rock) |
| Wellward Way (`passage`) | the tunnel's rock; the Gulf's arch | the Gulf's catch, 16 m | held | `'up'`: the rock holds; off the arch into the Gulf, put back on the bridge (or the fall wakes them) |
| Span's crack and bays (`v4/span/deck.js`) | broken deck | the valley, 56 m; fallen pieces | an unseen kerb 0.14 m over the deck | open; guard; over: woken 3.5 m back on the deck |
| Span parapets | parapets (colliders) | 56 m | collider, guard in a hop | the parapet holds; a hop onto it and off goes over |
| Icefall lips R1-R3 (`v12/icefall.js`) | ice faces | terraces, 20+ m | unseen 2.8 m kerbs | open |
| Icefall slot, block, bridge | ice; the lead | T1, 6-21 m | held | `'up'`: the slot's ice holds; the block and the lead open |
| Lonely Staircase deck (`stair-top`) | rope rail on its open sides | the moor, 100 m | held | held (the rail is drawn); the rope is not hoppable (see weak) |
| Lattice tops (`stair-lattice`) | nothing | the moor, 140 m | held | `'up'`: open |
| Lift station, gangway, cage | rails, grilles | 1.25 m; 130 m | held | held (drawn) |
| Lift gallery | front rail, broken in four bays | 135 m | held where the rail stands | unchanged (already open where the rail is gone) |
| Lappet treads, the bench (`v15/bones.js`) | the riser's edge, nothing on it | the next tread, 3.4-4 m | held | `'up'`: open |
| The Leads' roofs (`rungs-leads`) | planks | the lane, about 4 m | held | `'up'`: open |
| Roof walks (`ways/misc.js roofWalk`) | parapet on some sides | 3-4 m | held all round | held on the parapet sides only |
| Bridges without rails (`ways/misc.js`) | planks | a lane | held | `'up'` (railed bridges stay held) |
| Flights, landings, tube, pier, houses (`v15/ways`, `houses`) | rails, cheeks, parapets, walls | treads, lanes | held | unchanged (W4 owns them; the drawn thing holds) |
| Heights test floors (`?heights=test`) | slabs | 6 m | held | `'up'` |
| The sheet's deck (`?v15=kit`) | stone | water | held | `'up'` |

Floors that disagree with the drawn ground (W5's): none listed beyond the Nave's hole, where the terrain ran unbroken
over the drawn hole (fixed here, in `nave.js`, because it was the reason the unseen ring existed).
