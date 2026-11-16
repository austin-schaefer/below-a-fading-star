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
