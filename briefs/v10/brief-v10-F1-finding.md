# Brief v10-F1: a visitor can find the acts

Read `briefs/v10/_common.md` first (the owner's words on legibility are in it), then `world-code`'s "Acts", `src/v10/acts.js`. Port **8167**, worktree `.claude/worktrees/issue-1006-finding`.

## What the critic found

A cold critic walked the map before v10's release, hunting for things to do: seventy places, eight yaws at each. It found **one of seven** offers on its own and needed the page's registry for the rest. Its words: "Missing: any sign that something can be done here. A visitor meets offers only by standing within 2-3 m and facing the thing." The milestone's own first rule ("nothing shows from far off: the world, not the interface, leads you there") is the cause, and it is withdrawn: an act nobody finds is not built. The acts: `halt-tally`, `halt-seat`, `span-bell`, `span-letters`, `hypogeum-door`, `mother-hand`, `collation-twelfth` (positions: `window.__fp.acts.list` in the page).

## Goal

A first-time visitor walking past any act's place at 30 to 40 m notices that something there is for them, walks over, and gets the offer without having to find a two-metre spot and an exact facing.

1. **A lure, owned by `src/v10/acts.js`, at every act that can be done now.** One small thing in the world's own terms, the same at every act so a visitor learns it once: yours to design (a slow mote of the saffron the tally's chalk uses, rising and falling over the thing; the sun's sign drawn in light; a moth that keeps to the spot). Seen from 40 m against dusk grass, stone and snow alike, never mistaken for the corpse-candles, fireflies or a UI marker, quiet enough that seven of them do not litter the map. It fades as the offer comes up, is absent while the act is busy or cannot be done (`when()` false, done for this visit, `every: 'once'` spent), and returns on a later visit if the act can be done again. One draw for all of them, no point light, no per-frame work beyond a uniform. A def may opt out or move it (`lure: false | { y }`); do not edit the acts' own files otherwise. `?acts=0` shows none.
2. **Easier offers.** The offer comes from further and wider than now: propose and apply a default (about 1.5 times each act's reach, a wider cone, a shorter dwell) inside `acts.js` so every act gets it without its file changing; check each of the seven by walking up to it from three directions a visitor would come from, with a casual look (not aimed), and say for each how far out the offer rose. Nothing may be offered through a wall or from the wrong side of the tomb door.
3. **The settings menu's Go to list** (`src/settings.js`, `PLACES`) has the places that have acts but no entry: add the Lantern Halt, and under whatever heading fits, the bell under the Span; land the visitor 8 to 10 m back, facing the thing, with the lure in view. Check the Collation's, the Lattice's and the Hypogeum's existing entries land facing their act too (the critic: "The Lattice teleport faces a snow bank"): fix those poses where they are stored. `settings-test` counts the list: update its counts honestly.
4. **A sound**, only if the `sound-design` gates allow it cheaply: the existing `act-offer` cue is enough; do not add a loop.

## Done when

- Frames: each of the seven from 40 m, 20 m and at the offer, by day's light as the walk has it, `acts-lure-<id>-<d>.png`; a phone-sized pair; one frame with two lures in one view if any two can be seen together. Look at them as a stranger: is it plain something is there, and is it of this world?
- A test: a scripted walker approaching each act along a straight line from 30 m, looking where it walks (not at the act's exact spot), is offered it before it arrives; rows in `acts-test`. Lure visible flags follow the act's state (can be done, busy, done, forgotten).
- `acts`, `settings`, `touch`, `perf`, `loading`, `walk`, `build-artifact` pass on your port; say the counts.
- `world-code`'s "Acts" says what the lure is and how a def changes it; `runtime.md` if a switch is added.

Another agent (F2) is editing `src/v10/halt-seat.js`, `src/v10/door.js` and their sounds: do not touch those files. Finish as the `world-code` skill's Hand-back says, and report with SendMessage to main if a first report has already gone, under 200 words.
