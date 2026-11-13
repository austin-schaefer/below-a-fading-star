# Brief v12 H4: the lift

Worktree: written in at dispatch. Work only there. Read `briefs/v12/_common.md` first; `src/v5/galleries.js` (its header says what the Galleries are); `src/v10/halt-seat.js` (a ride built on `ctx.controls.carry`). Model: strong.

## Goal

The owner, in #4: "The ring mountains should have occasional paths and access points to higher areas, with things to discover when you're there." "Perhaps there's a glass elevator bearing you high indeed".

The Galleries of Durance are tiers of old ironwork on the west cliff (bearings about 266 to 319, from 68 to 247 m up), with an inclined lift whose carriage climbs and descends the face in the shader, as decoration. Make it a thing a visitor rides, and give them a gallery to walk at the top.

- **The foot.** Where the lift meets the ground a visitor finds its lower station: something that says a carriage comes here (rails into the talus, a counterweight pit, a bell-pull or a lever), reachable from the Armiger's Tower (-250,-135) by a path, inside a corridor through the walk limit (H0). The carriage is somewhere up the face when they arrive, and they call it (an act: `ctx.acts.add`). Watching it come down the cliff to you is half the pleasure: let it take its time, and be heard.
- **The carriage** is a real object, not a shader trick, where it is ridden: a cage of iron and old glass ("a glass elevator"), worn, once rich, open enough that the valley is seen dropping away through its floor and sides. The visitor steps in, and it goes (a second act, or by itself after a beat; no trap: they can step out before it leaves and can ride down again).
- **The ride** rises 100 m and more up the face past the lower galleries. It is long enough to be a journey (30 to 50 s), with things passed close on the way: tiers going by, the chains and wheels, cells. The look stays free. It judders, slows, and at one point stops for a moment for no reason.
- **The gallery.** At the top the visitor steps out onto one tier and walks it: 60 to 100 m of iron walkway on a cliff, cells opening off it, the whole valley east and the sun behind the wall. The far end has fallen away (the ragged end is already in the outline). No hop needed; edges as H0 provides.
- **Durance.** Who was kept here, who kept them, and who still rides the lift? (The milestone doc's seed; `stories/README.md` for people who could be the same person.) One cell is not like the others. A plain story with a file in `stories/`, findable by a visitor who walks the gallery to its end.
- **The fall** from the gallery is 100 m and more onto the talus: with `?fall=1` it blacks out; without, check where the visitor lands and that they can walk back (inside the corridor or the limit).
- **From the floor** the carriage must be seen moving on the cliff from the Cardinal Stones (-170,-50) and the Tower, as it is now, and the station must read as a place to go.

## Where things are

`src/v5/galleries.js` (`:455` the lift's rails, `uRail` and `liftTravel`: the shader moves the far carriage; keep the far look and swap to the real one near and while ridden, with no pop). The Galleries follow the ground by code and v11 reshaped the wall: check the tiers' real positions before building on them.

## Not yours

`src/controls.js`, `src/v4/mountains.js`, `src/terrain.js`.

## Done when

- Calling, boarding, the ride, the gallery and the ride down done by hand in a real browser, frames at 0.3 s, 1 s, 2 s, 5 s and every 5 s of the ride, looked at in order: is the cause next to the effect, and what happens next?
- Registered with `heights-test` (the gallery walk and its falls); `acts-test` covers the two acts.
- Frames: the station from the Tower; the carriage arriving; three from the ride; the gallery; the cell; the view east; low and medium; `views-v12-heights.json` after.
- A fresh reader shown the station alone says it is somewhere a carriage comes; shown the cell, says something about who was in it.
- The tests in `_common.md`, `acts`, the Galleries' own test; the cost on low at the top written down.
