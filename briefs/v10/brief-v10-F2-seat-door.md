# Brief v10-F2: the ride's view, and the knock

Read `briefs/v10/_common.md` first (the owner's words on legibility are in it), then `world-code`'s "Acts" and the carry hook beside it, `src/v10/halt-seat.js`, `src/v10/tally.js`, `src/v10/door.js`, `stories/the-lantern-halt.md`, `stories/the-reckoner.md`. Port **8168**, worktree `.claude/worktrees/issue-1007-seat-door`.

A cold critic did every act before v10's release, with no look input, frames at 0, 0.5, 1, 2, 4, 8, 15, 30 and 60 s. Two of them it would not show a friend. Fix those two; change nothing else.

## 1. The seat (`halt-seat`)

The critic: "Not seen being done: the camera snaps away at 0.5 s... From 2 to 30 s the ride stares at bare slope... At about 15 s the camera is at y about 15 inside a giant teal-sleeved fist and a head against an orange disc. It is the lantern sleeper 'at an arm's length', but the shot is unreadable... reads as a clipping bug." Its cut: "Lock the view on the lantern and the sleeper's face, or cut the ride to a short lift with a fixed outward look." Reproduce it first (`tools/tally-frames.mjs`, no look input) and look.

- **Getting on is seen.** The view does not snap: over about a second the visitor is seen to sit (the view lowers to the plank, the cords come up either side), then the seat begins to turn and rise.
- **The climb looks at something.** The outward look is at the horizon, not down the slope: choose the bearing from the Halt with the most in it (the causeway running to the keep, the Span, the sun) and hold the pitch level or a little up, so the ground falls away at the bottom of the frame and the country fills the rest. The slab and its tallies slide past at one edge so the height is felt.
- **The top is a picture.** The seat stops further out and a little lower than now (try 2.2 to 2.8 m from his face), so the frame holds the whole lantern mouth: the sleeper from cap to hand, the quilt, the lamp, with dark country behind. Nothing of his is nearer the camera than a metre; no part of him fills more than a third of the frame; the lamp does not clip to white or orange. His answer (the hand opening, the salt) is made toward the seat but stops well short of the camera. Check the near plane.
- **Shorter.** The whole ride, press to set-down, in about 25 s; the visitor can still end it by moving.
- Keep the review's guarantees: set down where and facing as they pressed, free look still wins over the easing, a teleport ends it.

## 2. The knock (`hypogeum-door`)

The critic: "A pale halo ring flashes at 2 s, which looks like UI more than a knock. A seam of light opens at 8 s and shuts by 30 s, and there is nowhere to go. The weakest of the seven." An earlier blind reader could not count the knocks and did not understand the hand or the plate; from the standing pose the sill, where the hand's shadow and the plate come, is at the bottom edge of the view or below it.

- **The knock is a ring falling on bronze, three times, slowly enough to count**: the ring lifted clear of the door (seen side-on enough that its lift is plain: turn its hinge, or swing it wide), a held beat, the fall, the leaf's jolt, dust from the lintel; a second between knocks. Remove the halo.
- **The answer is framed.** While the Reckoner answers, the visitor's view is eased (the acts module has no easing: do it as the seat does, through a short carry that holds position and eases the look, or by standing the act's place further back and lower on the stair) so the lintel's glyphs, the seam and the sill are all in frame. The plate that is passed out is big enough to read at that distance and is the brightest thing in the frame when it comes.
- **Something to go to.** The plate is for the visitor. When it is out, it offers a second act (`when()`): take it up, or read it (yours). What that does must point somewhere a visitor can then walk to, in the world's terms: `stories/the-reckoner.md` is yours to extend (the Reckoner reckons something: the tally at the Halt, the Sexton's forty-one graves, the lamps that go out one at each gutter; a plate that shows a count the visitor can go and check, and that changes when they come back having done another act, would tie the acts together). Small, exact, no text beyond the offer's words and the door's own glyphs.

## Done when

- Frames with no look input, new names: `acts-seat5-*` every 2 s from the press to 4 s after set-down, and a sheet; `acts-door3-*` at 0, 0.5, 1, 2, 3, 4, 6, 8, 12, 20, 30 s for a first visit and the second act, and a sheet. Look at each sheet as a stranger with the sound off: every frame is a picture, none is a blank wall, a slope, or the inside of a fist.
- `acts-test` rows: at the top nothing of the sleeper is within a metre of the eye and his head is in the middle third; the ride ends within 30 s; three knocks counted by state; the plate's act offered only when the plate is out, and done.
- `acts`, `audio`, `touch`, `walk`, `hop`, `stair`, `edges`, `settings`, `perf`, `loading`, `glyphs`, `build-artifact` pass on your port; say the counts.
- Both story files true to what is built.

Another agent (F1) is editing `src/v10/acts.js` and `src/settings.js` (a lure at every act, easier offers): do not touch those files; if you need something from `acts.js`, say what in your report instead. Finish as the `world-code` skill's Hand-back says; report under 200 words.
