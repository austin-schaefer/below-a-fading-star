# Brief v10-A4: the tally, again, and what happens next

Read `briefs/v10/_common.md` first, all of it, and above all the section with the owner's words: this brief exists because of them. Port **8166**, worktree `.claude/worktrees/issue-1005-tally`. Then `stories/the-lantern-halt.md`, `src/v10/tally.js`, `src/v10/acts.js`, `src/v9/waystation.js`.

## What is there, and what is wrong with it

At the foot of the Lantern Halt a visitor facing the tally wall is offered "Chalk your stroke". Pressing `E` draws one thin saffron stroke over 0.55 s at the end of the last row. A stub of chalk hangs on a cord about a metre to the left of it and never moves. Then nothing. The owner: "it didn't seem to work? no animation? the hanging chalk is a meter away from the chalkmark?" Open `http://localhost:8166/?pos=-60.0,2.3&yaw=1.19&pitch=-0.1`, do it yourself in frames, and see what they saw before changing anything.

## Part 1: the stroke is seen to be made

- The chalk hangs where the next stroke goes: its staple and cord sit at the end of the visitor's row and move along as the rows grow (on a first visit, at the end of the wall's last row). Chalk, offer and stroke are one place, in the middle of the view.
- On the act the stub itself does the work: it lifts on its cord to the stone, draws the stroke top to bottom over a second or more (the stub seen moving down the line it is leaving, dust falling from it and catching the light), then is let go and swings on its cord, settling over a few seconds. The scrape lasts as long as the drawing; the cue exists (`act-chalk` in `src/v10/sound.js`), retime it.
- The stroke is the size of a forearm and as bright as fresh chalk is; it is the brightest thing on the wall while it is new. A fifth stroke is the bar across the gate, drawn with the same care.
- Fewer, larger old tallies near where the visitor writes are better than 470 that make theirs one of a crowd: thin the wall round the visitor's place so their marks have dark stone about them. The far, high, faded rows can stay dense.

## Part 2: what happens next

Everyone who sleeps in the lantern chalks a stroke: chalking is how a traveller claims the bed. So when the visitor has chalked theirs, the Halt treats them as its guest. The slung seat on its rope (the way up; the winch is at the foot) comes down for them: the winch turns, its pawl clacks, the seat arrives at standing height beside the wall and sways. A second act opens there (`when()`): take the seat. The visitor is hauled up the face of the slab, ten metres, the tallies passing, the moor opening out behind, to hang level with the lantern's hatch: the sleeper an arm's length away in his red nightcap, his quilt, the lamp's light on the inside of the globe, the whole country from a height nobody has had in this walk. He does something small because someone is there (yours: he pulls the quilt up, he says a word in his sleep, he shifts over to make room). After some seconds, or when the visitor moves, the seat lets them down again where they started.

That ride is the milestone's first answer to "what happens next", and it is the bold version on purpose. Fixed points:
- The visitor can look around freely all the way up and at the top. They cannot walk off the seat. They are set down exactly where they got on, never stuck, never dropped; pausing, the settings panel, a teleport from the settings map and the sun's guttering all leave them somewhere sane (test each).
- Carrying the player is new. `src/controls.js` is shared and three other agents are working beside you (none should be touching it): add the smallest general thing there, a way for a module to hold the player's position for a while and give it back, and put the rest in `src/v10/`. Write that hook into `world-code` beside the Acts contract; a later act will want it.
- The story file says of the sleeper "His face is never seen closer than ten metres." That is yours to change, and to say so in its Log: decide what the visitor sees of him from an arm's length, and keep one thing withheld.
- On a return visit: the visitor's strokes are there; chalking again brings the seat again. Whether something up there has changed since their last visit is yours.
- Phone: both offers are the shared button; the ride needs look-drag only.

If the ride cannot be made safe and good, do Part 1 fully, make the seat come down and the sleeper answer from below in a way that can be seen from the foot, and say plainly what was left and why.

## Done when

As `_common.md` lists, and:
- Frames through the whole thing, looked at in order: `acts-tally2-00-approach.png`, then the stroke at about 0.3 s, 0.8 s, 1.5 s and 4 s (the chalk swinging), the seat arriving, the offer on the seat, the ride at a third, two thirds and the top, the view outward from the top, the sleeper from the seat, set down again. A phone-sized pair.
- `acts-test` rows: the chalk's place moves with the count; the second act is not offered before the first is done; the ride ends where it began; pause, the panel and a teleport during the ride.
- `walk-test`, `hop-test`, `touch-test`, `stair-test`, `edges-test`, `strata-test`, `perf-test`, `loading-test`, `settings-test`, `audio-test` and `build-artifact` pass on your port (controls are shared code: all of the walking tests). Say the counts.

Finish as the `world-code` skill's Hand-back says. Report in under 300 words: what a visitor does and what happens, in order; the commands and counts; the frame paths; the URL to stand at; the controls hook in three lines; anything left undone.
